// Multiverse Mayhem: the authoritative game host.
//
// It owns everything that matters: health, damage, inventories, crafting, life
// progress, portals, ships, pickups, locals and who is where. Clients only send
// what they want to do and where they are walking; the host checks every message
// (shared/protocol.js), rate-limits it, and validates movement against each
// character's speed, jump, wings and ship before accepting it.
//
// It has no networking of its own. A "conn" is anything with send(string) and
// close(code, reason). server/server.js plugs in WebSockets; the browser plugs in
// an in-memory link for offline play with bots.
(function (root) {
  'use strict';
  const MM = root.MM;

  const r2 = v => Math.round(v * 100) / 100;
  const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  // Squared distance from point (px,py,pz) to segment a->b.
  function segDist2(ax, ay, az, bx, by, bz, px, py, pz) {
    const vx = bx - ax, vy = by - ay, vz = bz - az;
    const wx = px - ax, wy = py - ay, wz = pz - az;
    const L = vx * vx + vy * vy + vz * vz;
    let t = L > 0 ? (wx * vx + wy * vy + wz * vz) / L : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = ax + vx * t - px, dy = ay + vy * t - py, dz = az + vz * t - pz;
    return dx * dx + dy * dy + dz * dz;
  }

  class Bucket {
    constructor(burst, rate) { this.burst = burst; this.rate = rate; this.tokens = burst; this.at = 0; }
    take(now) {
      this.tokens = Math.min(this.burst, this.tokens + (now - this.at) * this.rate);
      this.at = now;
      if (this.tokens < 1) return false;
      this.tokens -= 1;
      return true;
    }
  }

  // Rebuild saved progress from whatever storage returned, keeping only valid values.
  function cleanProgress(arch, raw) {
    const p = MM.newProgress(arch);
    if (!raw || typeof raw !== 'object') return p;
    const num = (v, hi) => (typeof v === 'number' && Number.isFinite(v)) ? Math.max(0, Math.min(hi, Math.floor(v))) : 0;
    if (raw.up && typeof raw.up === 'object') for (const k in raw.up) if (MM.RECIPES[k] && MM.RECIPES[k].cat !== 'gadget' && raw.up[k]) p.up[k] = 1;
    p.step = num(raw.step, MM.ARCHETYPES[arch].steps.length);
    if (Array.isArray(raw.grants)) p.grants = raw.grants.filter(g => MM.RECIPES[g]).slice(0, 40);
    if (typeof raw.title === 'string' && raw.title === MM.ARCHETYPES[arch].life.breakout) p.title = raw.title;
    const c = raw.cnt || {};
    if (c.use && typeof c.use === 'object') for (const k in c.use) if (MM.TASKS[k] || MM.LANDMARK_BY_ID[k]) p.cnt.use[k] = num(c.use[k], 1e6);   // daily tasks, and wins at places (the Ring of Death)
    if (Array.isArray(c.dims)) p.cnt.dims = c.dims.filter(d => MM.DIM_BY_ID[d]).slice(0, 20);
    if (Array.isArray(c.crafted)) p.cnt.crafted = c.crafted.filter(r => MM.RECIPES[r]).slice(0, 40);
    if (Array.isArray(c.at)) p.cnt.at = c.at.filter(l => MM.LANDMARK_BY_ID[l]).slice(0, 20);
    if (c.kill && typeof c.kill === 'object') for (const k in c.kill) if (MM.NPCS[k]) p.cnt.kill[k] = num(c.kill[k], 1e6);
    for (const k of ['kills', 'ko', 'talk', 'smash', 'errand']) p.cnt[k] = num(c[k], 1e7);
    if (Array.isArray(raw.errands)) p.errands = raw.errands.filter(e => e && MM.DIM_BY_ID[e.dim] && MM.NPCS[e.npc] && MM.MATERIALS[e.m] && e.rew && typeof e.rew === 'object')
      .slice(0, 3).map(e => ({ id: num(e.id, 1e9), dim: e.dim, npc: e.npc, m: e.m, n: Math.max(1, num(e.n, 20)), from: String(e.from || '').slice(0, 30), rew: cleanMats(e.rew) }));
    if (raw.tasks && typeof raw.tasks === 'object') for (const k in raw.tasks) if (MM.TASKS[k] || (MM.RACE_BY_ID && MM.RACE_BY_ID[k.replace(/^race_/, '')])) p.tasks[k] = num(raw.tasks[k], 1e15);
    if (raw.best && typeof raw.best === 'object' && MM.RACE_BY_ID) { p.best = {}; for (const k in raw.best) if (MM.RACE_BY_ID[k] && typeof raw.best[k] === 'number' && raw.best[k] > 0 && raw.best[k] < 1e4) p.best[k] = Math.round(raw.best[k] * 10) / 10; }
    if (raw.inv && typeof raw.inv === 'object') {
      for (const k of MM.MAT_IDS) p.inv[k] = num(raw.inv[k], 9999);
      for (const g of MM.GADGET_IDS) p.inv[g] = Math.min(MM.RECIPES[g].max, num(raw.inv[g], 99));
      for (const q of MM.CURIO_IDS) if (raw.inv['q:' + q]) p.inv['q:' + q] = num(raw.inv['q:' + q], 99);
    }
    if (Array.isArray(raw.found)) p.found = MM.CURIO_IDS.filter(q => raw.found.includes(q));
    // Fun (shared/fun.js): best scores, the passport, rides ridden, fish caught, eggs found.
    if (raw.best && typeof raw.best === 'object') for (const k in raw.best) if ((MM.GALLERIES && MM.GALLERIES[k]) || /^(dance|roy):[a-z0-9_]{1,40}$/.test(k)) (p.best || (p.best = {}))[k] = num(raw.best[k], 100);
    if (Array.isArray(raw.stamps)) p.stamps = raw.stamps.filter(d => typeof d === 'string' && d.length < 24 && MM.stampOf && MM.stampOf(d) === d).slice(0, 1000);
    if (raw.rides && typeof raw.rides === 'object') { p.rides = {}; for (const k in raw.rides) if (MM.RIDE_BY_ID && MM.RIDE_BY_ID[k]) p.rides[k] = num(raw.rides[k], 1e6); }
    if (raw.fish && typeof raw.fish === 'object' && MM.FISH) { const names = new Set([].concat(...Object.values(MM.FISH)).map(f => f[0])); p.fish = {}; for (const k in raw.fish) if (names.has(k)) p.fish[k] = num(raw.fish[k], 1e6); }
    if (Array.isArray(raw.eggs) && MM.EGG_BY_ID) p.eggs = raw.eggs.filter(e => MM.EGG_BY_ID[e]).slice(0, 200);
    // Strong-arm Morty (MM.ARM): the arm stays until she has her revenge; how many times she has.
    if (arch === 'sidekick' && raw.arm && typeof raw.arm === 'object') p.arm = { n: num(raw.arm.n, MM.ARM.bounties.length) };
    if (raw.armDone) p.armDone = num(raw.armDone, 1e6);
    if (raw.dpunch) p.dpunch = 1;   // Liu Sin taught you the Five-Step Death Punch
    p.chaos = num(raw.chaos, 1e9);
    return p;
  }
  function cleanMats(m) {
    const out = {};
    for (const k of MM.MAT_IDS) if (typeof m[k] === 'number' && m[k] > 0) out[k] = Math.min(99, Math.floor(m[k]));
    return out;
  }
  const matText = m => Object.keys(m).map(k => m[k] + ' ' + MM.MATERIALS[k].name).join(', ');

  // ---------------------------------------------------------------- Instance
  // One copy of one dimension with up to `cap` players. Busy dimensions get more.
  class Instance {
    constructor(host, dimId, idx) {
      this.host = host;
      this.dimId = dimId;
      this.dim = MM.DIM_BY_ID[dimId];
      this.idx = idx;
      this.key = dimId + '#' + idx;
      this.players = new Map();
      this.props = MM.genProps(dimId).map(p => ({ hp: p.hp, max: p.hp, deadUntil: 0 }));
      this.npcs = new Map();
      this.pickups = new Map();
      this.portals = new Map();
      this.turrets = new Map();
      this.dpSet = new Set();   // locals carrying a Five-Step Death Punch
      this.parked = new Map();  // ships left parked here (Host.parkShip)
      this.projs = [];
      this.out = [];
      this.emptySince = host.time;
      this.event = null;
      this.nextEvent = host.time + 60 + Math.random() * 90;
      // [type, count] or [type, count, x, z] for someone who lives at a particular spot.
      const bx = MM.boundOf(this.dimId) - 0.8, bz = MM.boundZOf(this.dimId) - 0.8, cl = (v, b) => Math.max(-b, Math.min(b, v));
      // spread: somewhere within that distance of x, z (a town inside a bigger world).
      for (const [type, count, x, z, spread] of MM.npcListOf(this.dimId)) for (let i = 0; i < count; i++) {
        const j = spread || 3, at = x !== undefined ? { x: cl(x + (Math.random() - 0.5) * 2 * j, bx), z: cl(z + (Math.random() - 0.5) * 2 * j, bz) } : null;
        if (at && spread) [at.x, at.z] = MM.collideProps(this.dimId, at.x, at.z, 0.8, null);
        this.spawnNpc(type, false, at ? { at } : null);
      }
      if (idx === 0) host.castHere(this);   // this dimension's own people (shared/cast.js)
      this.pickupSet = MM.pickupsOf(this.dimId);
      for (const k in this.pickupSet) for (let i = 0; i < this.pickupSet[k]; i++) this.spawnPickup(k, false);
      for (let i = MM.curioCount(this.dimId); i > 0; i--) this.spawnPickup('q:' + MM.pickCurio(this.dimId), false);
    }

    ev(e) { this.out.push(e); }

    // ----- Spawning -----
    spawnNpc(type, announce, opts) {
      opts = opts || {};
      const T = MM.NPCS[type];
      const s = opts.at ? { x: opts.at.x, z: opts.at.z, y: MM.heightAt(this.dimId, opts.at.x, opts.at.z) } : MM.randomSpot(this.dimId, Math.random, 25, 165);
      const n = { id: this.host.ent(), type, T, x: s.x, y: s.y + (T.fly || 0), z: s.z, r: Math.random() * 6.28, hp: T.hp,
        tx: s.x, tz: s.z, wait: 0, cd: 0, flee: 0, target: 0, home: s, seed: Math.floor(Math.random() * 1e9),
        name: T.names ? pick(T.names) : T.name, temp: opts.until || 0, talkedBy: new Set(),
        owner: 0, ownerUntil: 0, angry: 0, angryUntil: 0, stun: 0, dance: 0 };
      this.npcs.set(n.id, n);
      if (announce) this.ev({ k: 'npc+', n: this.npcRow(n) });
      return n;
    }
    npcRow(n) { const r = [n.id, n.type, r2(n.x), r2(n.y), r2(n.z), r2(n.r), Math.round(n.hp / n.T.hp * 100), n.seed, n.name]; if (n.cast) r.push(n.cast.arch, n.cast.origin, n.ship ? 1 : 0); return r; }
    // One of the cast, here as a local (until a player takes them over).
    spawnCastNpc(rec, at, announce) {
      if (!at) {
        // The Smiths are at home (Rick in his garage); everyone else somewhere around.
        const spot = MM.CAST_SPOT[rec.key], l = MM.LANDMARKS.find(q => q.dim === this.dimId && MM.isAt(q, spot || (rec.arch === 'genius' ? 'garage' : 'home')));
        if (l && (spot || MM.EARTH_ARCHS.includes(rec.arch))) {
          // In front of it (its front faces rot), out of its walls.
          const r = l.rot !== undefined ? l.rot : 0, d = (l.r || 5) + 2 + Math.random() * 3, side = (Math.random() - 0.5) * 6;
          at = { x: l.x + Math.sin(r) * d + Math.cos(r) * side, z: l.z + Math.cos(r) * d - Math.sin(r) * side };
          if (rec.arch === 'genius') at = { x: l.x + Math.sin(r) * 2 + Math.cos(r) * side * 0.4, z: l.z + Math.cos(r) * 2 - Math.sin(r) * side * 0.4 };   // in his garage
          [at.x, at.z] = MM.collideProps(this.dimId, at.x, at.z, 0.8, null);
        }
      }
      const n = this.spawnNpc('cast', false, at ? { at } : null);
      n.cast = rec; n.name = MM.castLabel(rec.arch, rec.origin);
      if (at && at.y !== undefined) n.y = at.y;
      if (at) n.home = { x: n.x, z: n.z, y: n.y };
      rec.npc = { inst: this, id: n.id };
      if (announce) this.ev({ k: 'npc+', n: this.npcRow(n) });
      return n;
    }

    spawnPickup(kind, announce, at, count) {
      const s = at || MM.randomSpot(this.dimId, Math.random, 12, 165);
      const pk = { id: this.host.ent(), c: kind, n: count || 1, x: s.x, y: MM.heightAt(this.dimId, s.x, s.z), z: s.z, drop: !!at, born: this.host.time };
      this.pickups.set(pk.id, pk);
      if (announce) this.ev({ k: 'pk+', p: [pk.id, pk.c, r2(pk.x), r2(pk.y), r2(pk.z), pk.n] });
    }

    // Everything a client needs to draw this instance when it arrives.
    welcomeState() {
      const props = [];
      this.props.forEach((p, i) => { if (p.hp < p.max) props.push([i, p.hp]); });
      return {
        dim: this.dimId, inst: this.idx,
        players: [...this.players.values()].map(p => this.host.info(p)),
        props,
        pickups: [...this.pickups.values()].map(pk => [pk.id, pk.c, r2(pk.x), r2(pk.y), r2(pk.z), pk.n]),
        npcs: [...this.npcs.values()].map(n => this.npcRow(n)),
        portals: [...this.portals.values()].map(po => this.portalRow(po)),
        turrets: [...this.turrets.values()].map(t => [t.id, t.owner, r2(t.x), r2(t.y), r2(t.z), t.big ? 1 : 0]),
        pairs: [...this.players.values()].flatMap(p => (p.pp || []).map((P, c) => P ? Object.assign({ o: p.id, c }, P) : null).filter(Boolean)),
        event: this.event ? { name: this.event.E.name, text: this.event.E.text, left: r2(this.event.until - this.host.time) } : null,
        house: this.host.houseRow(this),
        riders: [...this.players.values()].filter(p => p.ride).map(p => [p.id, p.ride.id, r2(p.ride.t0), p.ride.seat]),
        parked: [...this.parked.values()].map(V => this.host.shipRow(V)),
        crews: [...this.players.values()].filter(p => p.ship && p.vessel && p.vessel.npcs.length).map(p => [p.id, this.host.npcCrew(p.vessel)]),
        gal: Object.keys(this.gal || {}).map(id => [id, Math.ceil(this.gal[id].until - this.host.time)]),
      };
    }
    portalRow(po) { return { id: po.id, x: r2(po.x), y: r2(po.y), z: r2(po.z), r: r2(po.r), d: po.destDim, col: po.col, st: po.st || 'swirl', ttl: r2(po.until - this.host.time) }; }

    // ----- The tick -----
    tick(dt) {
      const now = this.host.time;
      this.tickProjectiles(dt, now);
      this.tickNpcs(dt, now);
      if (this.dpSet.size) this.host.tickPunchedNpcs(this);
      if (this.parked.size && this.host.tickN % 9 === 0) for (const V of this.parked.values()) this.host.tickParked(V, now);
      this.tickTurrets(dt, now);
      if (this.house) this.host.tickHouse(this, now);
      if (this.gal) this.host.tickGalleries(this, now);
      this.tickPortals(now);
      if (this.players.size) this.tickEvents(now);
      // Props grow back a minute after they are destroyed.
      this.props.forEach((p, i) => {
        if (p.hp <= 0 && p.deadUntil && now >= p.deadUntil) {
          const prop = MM.genProps(this.dimId)[i];
          // Never regrow on top of someone.
          for (const pl of this.players.values()) if (dist2(pl.x, pl.z, prop.x, prop.z) < (prop.r + 1) * (prop.r + 1)) { p.deadUntil = now + 5; return; }
          p.hp = p.max; p.deadUntil = 0;
          this.ev({ k: 'prop', id: i, hp: p.hp });
        }
      });
      if (this.host.tickN % 30 === 0) {
        // Keep the world stocked with this dimension's materials.
        const have = {};
        for (const pk of this.pickups.values()) if (!pk.drop) have[pk.c] = (have[pk.c] || 0) + 1;
        for (const k in this.pickupSet) if ((have[k] || 0) < this.pickupSet[k]) this.spawnPickup(k, true);
        // And with its curios, more slowly.
        if (this.host.tickN % 300 === 0) {
          let q = 0;
          for (const pk of this.pickups.values()) if (!pk.drop && MM.isCurio(pk.c)) q++;
          if (q < MM.curioCount(this.dimId)) this.spawnPickup('q:' + MM.pickCurio(this.dimId), true);
        }
        for (const pk of [...this.pickups.values()]) if (pk.drop && now - pk.born > 90) { this.pickups.delete(pk.id); this.ev({ k: 'pk-', id: pk.id }); }
        // Event visitors leave when their time is up.
        for (const n of [...this.npcs.values()]) if (n.temp && now > n.temp) { this.npcs.delete(n.id); this.ev({ k: 'npc-', id: n.id }); }
      }
    }

    // ----- World events -----
    // Variants of an Earth get the Earth's events too (unless they have their own).
    eventsHere() {
      const D = this.dim;
      if (D.planets) return MM.EVENTS.space;   // out in space: the Giant Baby
      return MM.EVENTS[this.dimId] || (D.variantOf === 'suburbia' && !D.cronen && !D.timeline ? MM.EVENTS.suburbia : null);
    }
    endEvent(now, text) {
      const ev = this.event;
      this.ev({ k: 'world', end: 1, name: ev.E.name, text: text || '' });
      // Events that took over the locals (or the house) put everything back at once.
      if (ev.E.house || ev.E.patient || ev.E.boss) for (const id of ev.mine || []) { if (this.npcs.delete(id)) this.ev({ k: 'npc-', id }); }
      this.event = null;
      this.nextEvent = now + 150 + Math.random() * 150;
    }
    // Swap a local for something else where it stands (a lover becomes a mantis person...).
    morphNpc(n, type, opts) {
      if (!this.npcs.has(n.id)) return null;
      this.npcs.delete(n.id); this.ev({ k: 'npc-', id: n.id });
      const m = this.spawnNpc(type, true, Object.assign({ at: { x: n.x, z: n.z } }, opts || {}));
      m.home = n.home;
      return m;
    }
    tickEvents(now) {
      if (this.event) {
        const ev = this.event;
        if (now >= ev.until) { this.endEvent(now); return; }
        if (ev.booms > 0 && now >= ev.nextBoom) {
          ev.booms--; ev.nextBoom = now + ev.E.dur / (ev.E.booms + 1);
          const p = pick([...this.players.values()]);
          if (p) {
            const a = Math.random() * 6.28, d = 6 + Math.random() * 20;
            const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
            this.explode(x, MM.heightAt(this.dimId, x, z), z, 5, 15, null, 'meteor', { propDmg: 60 });
            this.spawnPickup(this.dim.mat, true, { x: x + 1, z }, 2);
          }
        }
        // Smash everything it sent and it is over, with a reward for everyone here.
        if (ev.E.clear && this.host.tickN % 15 === 0 && ev.mine.every(id => !this.npcs.has(id))) {
          for (const p of this.players.values()) { for (const k in ev.E.clear) p.inv[k] = (p.inv[k] || 0) + ev.E.clear[k]; this.host.dirty(p); }
          this.endEvent(now, 'All clear! Everyone here gets ' + matText(ev.E.clear) + '.');
          return;
        }
        if (ev.E.patient) this.tickLove(ev, now);
        return;
      }
      if (now < this.nextEvent) return;
      const list = this.eventsHere();
      if (!list) return;
      const E = pick(list);
      const players = [...this.players.values()];
      if (!players.length) return;
      const ev = this.event = { E, until: now + E.dur, booms: E.booms || 0, nextBoom: now + 2, start: now, mine: [] };
      this.ev({ k: 'world', name: E.name, text: E.text, left: E.dur });
      const lim = MM.boundOf(this.dimId) - 25, clampXZ = v => Math.max(-lim, Math.min(lim, v));
      if (E.spawn) for (const [type, n] of E.spawn) for (let i = 0; i < n; i++) {
        const p = pick(players), a = Math.random() * 6.28, d = 14 + Math.random() * 16;
        this.spawnNpc(type, true, { at: { x: clampXZ(p.x + Math.cos(a) * d), z: clampXZ(p.z + Math.sin(a) * d) }, until: now + E.dur + 20 });
      }
      // Around the Smith house: the lawn turrets pop up, the drones take off.
      if (E.house) for (const [type, n] of E.house) for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + Math.random() * 0.5, d = MM.NPCS[type].fly ? 8 + Math.random() * 8 : MM.HOUSE.r - 2 + Math.random() * 3;
        let x = MM.HOUSE.x + Math.cos(a) * d, z = MM.HOUSE.z + Math.sin(a) * d;
        [x, z] = MM.collideProps(this.dimId, x, z, 1, null);
        ev.mine.push(this.spawnNpc(type, true, { at: { x, z }, until: now + E.dur + 5 }).id);
      }
      if (E.patient) this.startLove(ev, now);
      // A boss turns up a way off and comes for you.
      if (E.boss) for (const [type, n] of E.boss) for (let i = 0; i < n; i++) {
        const p = pick(players), a = Math.random() * 6.28, d = 55 + Math.random() * 20;
        const m = this.spawnNpc(type, false, { at: { x: clampXZ(p.x + Math.cos(a) * d * (this.dim.planets ? 3 : 1)), z: clampXZ(p.z + Math.sin(a) * d * (this.dim.planets ? 3 : 1)) }, until: now + E.dur + 5 });
        if (this.dim.planets) { m.y = p.y + 20; m.home = { x: m.x, z: m.z, y: m.y }; }
        this.ev({ k: 'npc+', n: this.npcRow(m) });
        ev.mine.push(m.id);
      }
      if (E.loot) for (let i = 0; i < E.loot[1]; i++) {
        const p = pick(players), a = Math.random() * 6.28, d = 4 + Math.random() * 26;
        this.spawnPickup(E.loot[0], true, { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d }, ri(1, 2));
      }
    }
    // "Rick Potion #9": the love potion catches. Everyone wants Patient Zero; a minute later
    // they are mantis people (who want everyone); a minute after that, Cronenbergs.
    pickPatient(ev) {
      const all = [...this.players.values()].filter(p => !p.dead);
      const humans = all.filter(p => !p.bot);
      const p = pick(humans.length ? humans : all);
      ev.pz = p ? p.id : 0;
      if (p) {
        this.ev({ k: 'world', name: 'Patient Zero', text: p.name + ' is Patient Zero. Everyone is in love with them. RUN.', left: Math.max(1, Math.round(ev.until - this.host.time)) });
        this.host.priv(p, { k: 'patient' });
      }
      return p;
    }
    startLove(ev, now) {
      ev.stage = 0;
      const pz = this.pickPatient(ev);
      if (!pz) return;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * 6.28, d = 16 + Math.random() * 18;
        const lim = MM.boundOf(this.dimId) - 25;
        const x = Math.max(-lim, Math.min(lim, pz.x + Math.cos(a) * d)), z = Math.max(-lim, Math.min(lim, pz.z + Math.sin(a) * d));
        ev.mine.push(this.spawnNpc('lover', true, { at: { x, z }, until: ev.until + 5 }).id);
      }
    }
    tickLove(ev, now) {
      const t = now - ev.start;
      const stage = t >= 120 ? 2 : t >= 60 ? 1 : 0;
      if (stage !== ev.stage) {
        ev.stage = stage;
        const to = stage === 1 ? 'mantisman' : 'meatblob';
        ev.mine = ev.mine.map(id => { const n = this.npcs.get(id); const m = n && this.morphNpc(n, to, { until: ev.until + 5 }); return m ? m.id : 0; }).filter(Boolean);
        this.ev({ k: 'world', name: stage === 1 ? 'Mantis People!' : 'Cronenbergs!', text: stage === 1 ? 'The cure made it worse. Everyone is a praying mantis now, and they want everybody.' : 'The cure for the cure made it MUCH worse. Cronenbergs, everywhere.', left: Math.round(ev.until - now) });
      }
      if (stage > 0) return;
      let pz = this.host.players.get(ev.pz);
      if (!pz || pz.inst !== this || pz.dead) pz = this.pickPatient(ev);
      if (!pz) return;
      for (const id of ev.mine) { const n = this.npcs.get(id); if (n) { n.angry = pz.id; n.angryUntil = now + 3; } }
    }
    boosted() { return this.event && this.event.E.talkBoost; }

    tickProjectiles(dt, now) {
      const keep = [];
      for (const pr of this.projs) {
        const ox = pr.x, oy = pr.y, oz = pr.z;
        if (pr.g) pr.vy -= this.dim.gravity * 0.7 * dt;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
        pr.life -= dt;
        let hit = null;
        const shooter = pr.owner ? this.host.players.get(pr.owner) : null;
        if (this.house && this.house.shield > now && !MM.inHouse(ox, oz) && MM.inHouse(pr.x, pr.z) && !(shooter && this.host.houseAllows(this, shooter))) {
          this.ev({ k: 'hit', id: pr.id, x: r2(pr.x), y: r2(pr.y), z: r2(pr.z) });
          continue;
        }
        for (const p of this.players.values()) {
          if (p.dead || p.id === pr.owner || (shooter && !this.host.canHurt(shooter, p))) continue;   // shots pass through people not fighting
          const s = this.host.scaleOf(p);
          const rr = (p.ship ? 1.8 : 0.85 * s) + (pr.rad || 0.15);
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, p.x, p.y + (p.ship ? 0.8 : 1.0 * s), p.z) < rr * rr) { hit = { p }; break; }
        }
        if (!hit) for (const n of this.npcs.values()) {
          if (n.owner === pr.owner && n.ownerUntil > now) continue;
          if (pr.byNpc && n.T.hostile) continue;   // monsters don't shoot each other
          const rr = n.T.r + (pr.rad || 0.15);
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, n.x, n.y + n.T.h / 2, n.z) < rr * rr) { hit = { n }; break; }
        }
        if (!hit) for (const t of this.turrets.values()) {
          if (t.owner === pr.owner) continue;
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, t.x, t.y + 0.8, t.z) < 1.1 * 1.1) { hit = { t }; break; }
        }
        if (!hit) {
          const near = MM.propsNear(this.dimId, (ox + pr.x) / 2, (oz + pr.z) / 2, Math.hypot(pr.x - ox, pr.z - oz) / 2 + 2);
          for (const p of near) {
            const i = p.id, st = this.props[i];
            if (st.hp <= 0) continue;
            const r = p.r + (pr.rad || 0.15);
            if (pr.y < p.y - 0.5 || pr.y > p.y + p.h) continue;
            if (dist2(pr.x, pr.z, p.x, p.z) < r * r || dist2((ox + pr.x) / 2, (oz + pr.z) / 2, p.x, p.z) < r * r) { hit = { prop: i }; break; }
          }
        }
        const ground = MM.heightAt(this.dimId, pr.x, pr.z);
        if (!hit && pr.y < ground) hit = { ground: true };
        if (!hit && pr.life <= 0) { if (pr.kind === 'gren') hit = { fuse: true }; else continue; }
        if (!hit) { keep.push(pr); continue; }
        const owner = this.host.players.get(pr.owner) || null;
        this.ev({ k: 'hit', id: pr.id, x: r2(pr.x), y: r2(Math.max(pr.y, ground)), z: r2(pr.z) });
        if (pr.kind === 'gren') { this.explode(pr.x, Math.max(pr.y, ground), pr.z, 6.5, 35, owner, 'grenade'); continue; }
        if (hit.p) {
          if (pr.kind === 'shrink' && this.host.canHurt(owner, hit.p)) { hit.p.fx.shrink = now + 8; this.host.dirty(hit.p); this.ev({ k: 'shrunk', id: hit.p.id }); }
          if (pr.kind === 'freeze' && this.host.canHurt(owner, hit.p)) { hit.p.fx.cuff = now + 3; this.host.dirty(hit.p); this.ev({ k: 'frozen', id: hit.p.id, t: 3 }); }
          this.host.hurtPlayer(this, hit.p, pr.dmg, owner, pr.kind);
        } else if (hit.n) {
          if (pr.kind === 'freeze') { hit.n.stun = now + 4; this.ev({ k: 'frozen', n: hit.n.id, t: 4 }); }
          this.hurtNpc(hit.n, pr.dmg, owner);
        }
        else if (hit.t) this.hurtTurret(hit.t, pr.dmg);
        else if (hit.prop !== undefined) this.hurtProp(hit.prop, pr.dmg, owner);
      }
      this.projs = keep;
    }

    // Spherical blast: damage, knockback, and wrecked props.
    explode(x, y, z, rad, dmg, owner, how, opts) {
      opts = opts || {};
      this.ev({ k: 'boom', x: r2(x), y: r2(y), z: r2(z), r: rad });
      for (const p of this.players.values()) {
        if (p.dead) continue;
        const d = Math.hypot(p.x - x, p.y + 1 - y, p.z - z);
        if (d > rad) continue;
        const f = 1 - d / rad;
        const self = owner && p.id === owner.id;
        if (!self && !this.host.canHurt(owner, p)) continue;   // no blasting people who didn't sign up for it
        if (!self || opts.selfDamage) this.host.hurtPlayer(this, p, Math.round(dmg * (0.4 + 0.6 * f)), owner, how);
        if ((opts.noSelfKnock && self) || p.ship) continue;
        const kx = p.x - x, kz = p.z - z, kl = Math.hypot(kx, kz) || 1;
        const power = (opts.knock || 14) * (0.5 + f);
        this.host.knock(p, kx / kl * power, 6 + power * 0.5, kz / kl * power);
      }
      for (const n of [...this.npcs.values()]) {
        if ((owner && n.owner === owner.id && n.ownerUntil > this.host.time) || n === opts.skip) continue;
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < rad + n.T.r) this.hurtNpc(n, Math.round(dmg * (1 - d / (rad + n.T.r) * 0.6)), owner);
      }
      for (const t of [...this.turrets.values()]) if (Math.hypot(t.x - x, t.z - z) < rad) this.hurtTurret(t, dmg);
      const hitP = new Set();
      for (const p of MM.propsNear(this.dimId, x, z, rad)) {
        const i = p.id;
        if (this.props[i].hp <= 0 || hitP.has(i)) continue;
        hitP.add(i);
        const d = Math.hypot(p.x - x, p.z - z) - p.r;
        if (d < rad && y < p.y + p.h + rad * 0.5) this.hurtProp(i, Math.round((opts.propDmg || dmg * 1.8) * (1 - Math.max(0, d) / rad * 0.6)), owner);
      }
    }

    hurtProp(i, dmg, owner) {
      const st = this.props[i];
      const p = MM.genProps(this.dimId)[i];
      const T = MM.PROPS[p.type];
      if (st.hp <= 0 || T.fixed) return;
      st.hp = Math.max(0, st.hp - dmg);
      if (st.hp === 0) {
        st.deadUntil = this.host.time + 60;
        // Materials spill out around the wreck.
        for (const k in T.drop) {
          const a = Math.random() * 6.28;
          this.spawnPickup(k, true, { x: p.x + Math.cos(a) * (p.r + 1.2), z: p.z + Math.sin(a) * (p.r + 1.2) }, T.drop[k]);
        }
        if (owner) { owner.prog.chaos += p.type === 'house' ? 5 : 1; this.host.progress(owner, 'smash'); }
      }
      this.ev({ k: 'prop', id: i, hp: st.hp });
    }

    hurtNpc(n, dmg, owner) {
      if (!this.npcs.has(n.id)) return;
      n.hp -= dmg;
      n.flee = this.host.time + 4;
      if (owner) {
        n.target = owner.id;
        // Locals you hit hit back (if they are the fighting kind).
        if (!n.T.hostile && n.T.human && Math.random() < 0.5) { n.angry = owner.id; n.angryUntil = this.host.time + 15; }
        if (n.T.hostile && !n.bout) { n.angry = owner.id; n.angryUntil = this.host.time + 12; }   // a Ring fighter keeps to the fighter
        // Police, Secret Service and Marines protect people (and each other).
        if (!n.T.hostile && (n.T.human || n.T.guard)) for (const g of this.npcs.values()) {
          if (g.T.guard && !(g.owner && g.ownerUntil > this.host.time) && dist2(g.x, g.z, n.x, n.z) < 40 * 40) { g.angry = owner.id; g.angryUntil = this.host.time + 25; }
        }
      }
      this.ev({ k: 'dmg', n: n.id, d: dmg });
      if (n.hp > 0) return;
      // Inside an immortality field nothing dies: it just pulls itself back together.
      if (MM.inField(this.dimId, n.x, n.z)) { n.hp = n.T.hp; this.ev({ k: 'reform', n: n.id }); return; }
      if (n.gal && this.gal && this.gal[n.gal]) {
        // A shooting gallery target: a point for whoever hit it.
        const S = this.gal[n.gal];
        if (owner) S.scores.set(owner.id, (S.scores.get(owner.id) || 0) + 1);
        this.npcs.delete(n.id); S.tg.delete(n.id);
        this.ev({ k: 'npc-', id: n.id, die: 1 });
        if (owner) this.ev({ k: 'pop', x: r2(n.x), y: r2(n.y + 1.4), z: r2(n.z), by: owner.id });
        return;
      }
      this.npcs.delete(n.id);
      this.ev({ k: 'npc-', id: n.id, die: 1 });
      if (n.armFor) this.host.armKill(n, owner);
      if (n.type === 'feratu') this.host.feratuDown(this, owner);
      let i = 0;
      for (const k in n.T.drop) this.spawnPickup(k, true, { x: n.x + (i++ - 0.5) * 1.4, z: n.z }, n.T.drop[k]);
      if (owner) { owner.prog.chaos += 2; this.host.progress(owner, 'kill', n.type); }
      if (n.cast) { n.cast.npc = null; n.cast.downUntil = this.host.time + 90; n.cast.at = n.cast.origin; }
      else if (!n.temp) {
        const type = n.type;
        this.host.later(25, () => { if (this.host.instances.get(this.key) === this) this.spawnNpc(type, true); });
      }
    }

    hurtTurret(t, dmg) {
      t.hp -= dmg;
      if (t.hp <= 0) { this.turrets.delete(t.id); this.ev({ k: 'tu-', id: t.id }); this.ev({ k: 'boom', x: r2(t.x), y: r2(t.y + 0.8), z: r2(t.z), r: 2.5 }); }
    }

    // ----- NPCs -----
    // Players a monster can see (Average Joes, sobbing and protected players are beneath notice).
    visible(p, now) {
      if (p.st.cloak && now - (p.lastFight || 0) > 3) return false;   // Citadel Cloak
      return !p.dead && p.arch !== 'joe' && now >= p.fx.sob && now >= p.fx.prot && now >= p.fx.cloak;
    }

    // A traveller of the cast on their way out (walking into their portal, or taking off) or
    // coming in to land. True when that is all they do this tick.
    castStep(n, dt, now) {
      const L = n.leave;
      if (L && L.kind === 'portal') {
        const dx = L.x - n.x, dz = L.z - n.z, l = Math.hypot(dx, dz);
        if (l < 1.2 || now > L.until) { this.castLeave(n); return true; }
        const step = Math.min(l, n.T.speed * 1.3 * dt);
        n.x += dx / l * step; n.z += dz / l * step; n.r = Math.atan2(dx, dz);
        n.y = MM.heightAt(this.dimId, n.x, n.z);
        return true;
      }
      if (L) { n.y += 10 * dt; if (now > L.until) this.castLeave(n); return true; }
      if (n.land) {
        const g = MM.heightAt(this.dimId, n.x, n.z);
        n.y = Math.max(g, n.y - 9 * dt);
        if (n.y <= g + 0.01) { n.land = false; if (n.ship) { n.ship = false; this.ev({ k: 'nship', n: n.id, on: 0 }); } }
        return true;
      }
      return false;
    }
    castLeave(n) {
      if (!this.npcs.has(n.id)) return;
      this.npcs.delete(n.id);
      this.ev({ k: 'npc-', id: n.id });
      const L = n.leave, P = L.pair;
      const at = P ? { x: P.b.x + Math.sin(P.b.r) * 2 + (Math.random() - 0.5), z: P.b.z + Math.cos(P.b.r) * 2 + (Math.random() - 0.5), inst: P.dest } : null;
      this.host.castMove(n.cast, L.dest, L.kind, at);
    }

    tickNpcs(dt, now) {
      for (const n of this.npcs.values()) {
        const T = n.T;
        if ((n.leave || n.land) && this.castStep(n, dt, now)) continue;
        let goal = null, speed = T.speed;
        const owner = n.owner && now < n.ownerUntil ? this.host.players.get(n.owner) : null;
        if (n.owner && !owner) { n.owner = 0; this.ev({ k: 'nfree', n: n.id }); }
        if (now < n.stun || now < n.dance) { n.y = MM.heightAt(this.dimId, n.x, n.z) + (T.fly || 0); continue; }
        if (owner && (owner.inst === this || n.guardAt)) {
          // A follower: fight whatever is near its friend, otherwise tag along. A guard (the
          // house's kill bots, drones and plants) keeps to its post and goes for intruders.
          const post = n.guardAt;
          let best = null, bd = 12 * 12, isNpc = true;
          if (post && T.speed > 0) for (const p of this.players.values()) {
            if (p === owner || p.dead || !this.visible(p, now) || this.host.houseAllows(this, p) || !this.host.canHurt(owner, p)) continue;
            if (!MM.inHouse(p.x, p.z) && dist2(p.x, p.z, post.x, post.z) > 14 * 14) continue;
            const d = dist2(p.x, p.z, n.x, n.z);
            if (d < bd * 4) { bd = d; best = p; isNpc = false; }
          }
          if (T.voice && now > (n.sayT || 0)) { n.sayT = now + 6 + Math.random() * 4; this.ev({ k: 'say', n: n.id, by: owner.id, text: pick(MM.NPCS.boomdrone.talk).replace('$', n.voice || 'Rick') }); }
          for (const m of this.npcs.values()) {
            if (m === n || !m.T.hostile || (m.owner && now < m.ownerUntil)) continue;
            const d = dist2(m.x, m.z, n.x, n.z);
            if (d < bd) { bd = d; best = m; }
          }
          if (!best || isNpc) for (const p of this.players.values()) {
            if (p === owner || !this.visible(p, now) || !this.host.canHurt(owner, p)) continue;
            const d = dist2(p.x, p.z, n.x, n.z);
            if (d < Math.min(bd, 7 * 7)) { bd = d; best = p; isNpc = false; }
          }
          if (T.decoy) best = null;
          if (best) {
            goal = best; speed *= 1.5;
            if (bd < (T.r + 1.3) ** 2 && now >= n.cd) {
              n.cd = now + 1.0;
              this.ev({ k: 'bite', n: n.id });
              if (isNpc) this.hurtNpc(best, T.dmg || 8, owner); else this.host.hurtPlayer(this, best, T.dmg || 6, owner, n.type === 'meeseeks' ? 'follower' : n.type);
            }
          } else if (post) { if (dist2(post.x, post.z, n.x, n.z) > 4) goal = post; }
          else if (dist2(owner.x, owner.z, n.x, n.z) > 9) { goal = { x: owner.x - Math.sin(owner.r) * 2, z: owner.z - Math.cos(owner.r) * 2 }; speed = Math.max(speed, owner.st.speed); }
        } else if (T.hostile || (n.angry && now < n.angryUntil)) {
          // Monsters mind their own business: they go for you only if you come close
          // (or hit them), and give up once you are well away from their patch.
          let best = null, bd = MM.AGGRO_RANGE * MM.AGGRO_RANGE, decoy = null;
          const leash = T.leash || MM.LEASH;
          // A hologram draws them off.
          for (const m of this.npcs.values()) if (m.T.decoy && now < m.ownerUntil && dist2(m.x, m.z, n.x, n.z) < bd) { decoy = m; break; }
          if (decoy) { goal = decoy; if (dist2(decoy.x, decoy.z, n.x, n.z) < (T.r + 1.1) ** 2 && now >= n.cd) { n.cd = now + 1.2; this.ev({ k: 'bite', n: n.id }); } }
          else if (n.angry && now < n.angryUntil) { const p = this.host.players.get(n.angry); if (p && p.inst === this && !p.dead) best = p, bd = dist2(p.x, p.z, n.x, n.z); }
          else if (!T.ring && dist2(n.x, n.z, n.home.x, n.home.z) < leash * leash) for (const p of this.players.values()) {   // Ring fighters only fight the fighter
            if (!this.visible(p, now)) continue;
            // A Death Stalker car spots another car from far off, someone on foot closer.
            const d = dist2(p.x, p.z, n.x, n.z), reach = T.aggro ? (p.car || T.space ? T.aggro : 16) : MM.AGGRO_RANGE;   // (space things see ships from far off)
            if (d < reach * reach && d < (best ? bd : Infinity)) { bd = d; best = p; }
          }
          if (best && (dist2(n.x, n.z, n.home.x, n.home.z) > leash * leash * 1.6 || bd > Math.max(30, T.aggro || 0) ** 2)) { best = null; n.angry = 0; }
          if (best) {
            goal = best; speed *= 1.15;
            // Something huge (the giant baby) flattens what it crawls over.
            if (T.stomp && now >= (n.stompT || 0)) { n.stompT = now + 1.6; this.explode(n.x, n.y + (T.space ? T.h / 2 : 0), n.z, T.r + (T.space ? 8 : 3), 12, null, n.type, { propDmg: 140, knock: 16, skip: n }); }
            if (bd < (T.r + 1.1) * (T.r + 1.1) && now >= n.cd && Math.abs(best.y - (n.y + (T.space ? T.h / 2 : 0))) < (T.space ? T.h / 2 + 3 : 3)) {
              n.cd = now + 1.2;
              this.ev({ k: T.hug ? 'hug' : 'bite', n: n.id, id: best.id });
              // A lovestruck local hugs you (and holds on a moment) instead of biting.
              if (T.hug) { if (now >= best.fx.prot) { best.fx.daze = Math.max(best.fx.daze, now + 1.4); this.host.dirty(best); } }
              else this.host.hurtPlayer(this, best, T.dmg || 6, null, n.type);
            }
            // Some shoot too (a Death Stalker from his car).
            const W = T.gun && MM.WEAPONS[T.gun];
            if (W && bd < W.range * W.range && now >= (n.gcd || 0)) {
              n.gcd = now + W.cd * (0.8 + Math.random() * 0.6);
              const oy = n.y + 1.3, dx = best.x - n.x, dy = best.y + 1 - oy, dz = best.z - n.z, l = Math.hypot(dx, dy, dz) || 1;
              const pr = this.host.fireProjectile(this, { owner: 0, kind: T.gun, x: n.x + dx / l * 1.9, y: oy, z: n.z + dz / l * 1.9, dx: dx / l, dy: dy / l, dz: dz / l, speed: W.speed, range: W.range, dmg: W.dmg });
              pr.byNpc = n.id;
            }
          }
        } else if (now < n.flee) {
          const p = this.host.players.get(n.target);
          if (p && p.inst === this) { const dx = n.x - p.x, dz = n.z - p.z, l = Math.hypot(dx, dz) || 1; goal = { x: n.x + dx / l * 5, z: n.z + dz / l * 5 }; speed *= 2; }
        }
        let wandering = false;
        if (!goal) {
          if (now >= n.wait && (dist2(n.x, n.z, n.tx, n.tz) < 1 || n.stuck > 1)) {
            // Somewhere to walk to that you can actually get to (a few tries at a clear line),
            // then stand a while looking about: at someone close by, or just around.
            n.wait = now + 1.5 + Math.random() * 5; n.stuck = 0;
            const lim = this.dim.interior ? MM.boundOf(this.dimId) - 1 : MM.boundOf(this.dimId) - 25, limZ = this.dim.interior ? MM.boundZOf(this.dimId) - 1 : MM.boundZOf(this.dimId) - 25;
            const reach = this.dim.interior ? 6 : n.cast ? 12 : 16;
            for (let t = 0; t < 6; t++) {
              const a = Math.random() * 6.28, d = 3 + Math.random() * reach;
              const tx = Math.max(-lim, Math.min(lim, n.home.x + Math.cos(a) * d)), tz = Math.max(-limZ, Math.min(limZ, n.home.z + Math.sin(a) * d));
              if (this.clearPath(n.x, n.z, tx, tz, T.r) || t === 5) { n.tx = tx; n.tz = tz; break; }
            }
            let look = null, ld = 8 * 8;
            for (const p of this.players.values()) { const d = dist2(p.x, p.z, n.x, n.z); if (d < ld) { ld = d; look = p; } }
            n.r = look ? Math.atan2(look.x - n.x, look.z - n.z) : n.r + (Math.random() - 0.5) * 2.5;
          }
          if (now >= n.wait) { goal = { x: n.tx, z: n.tz }; wandering = true; }
        }
        if (goal) {
          const dx = goal.x - n.x, dz = goal.z - n.z, l = Math.hypot(dx, dz);
          if (l > 0.3) {
            const step = Math.min(l, speed * dt), ox = n.x, oz = n.z;
            let nx = n.x + dx / l * step, nz = n.z + dz / l * step;
            [nx, nz] = MM.collideProps(this.dimId, nx, nz, T.r, null);
            [nx, nz] = MM.collideWalls(this.dimId, nx, nz, T.r);
            const lim = MM.boundOf(this.dimId) - (this.dim.interior ? 0.8 : 15), limZ = MM.boundZOf(this.dimId) - (this.dim.interior ? 0.8 : 15);
            n.x = Math.max(-lim, Math.min(lim, nx)); n.z = Math.max(-limZ, Math.min(limZ, nz));
            // Walking into a wall: after a moment, give up and go somewhere else.
            const moved = Math.hypot(n.x - ox, n.z - oz);
            if (wandering && moved < step * 0.3) n.stuck = (n.stuck || 0) + dt; else n.stuck = 0;
            if (moved > 1e-3) n.r = Math.atan2(n.x - ox, n.z - oz);
          }
        }
        if (T.space) {
          // Floating in space: drift up or down to whatever it is after.
          const ty = goal && goal.y !== undefined ? goal.y - T.h * 0.4 : (n.home.y || n.y);
          n.y += Math.max(-T.speed * dt, Math.min(T.speed * dt, ty - n.y));
          n.y = Math.max(-600, Math.min(1100, n.y));
        } else n.y = MM.heightAt(this.dimId, n.x, n.z) + (T.fly ? T.fly + Math.sin(now * 1.3 + n.id) * 0.8 : 0);
      }
    }

    // Can something of radius r walk straight from (x1, z1) to (x2, z2)?
    clearPath(x1, z1, x2, z2, r) {
      const l = Math.hypot(x2 - x1, z2 - z1), steps = Math.max(2, Math.ceil(l / 1.5));
      for (let i = 1; i <= steps; i++) {
        const x = x1 + (x2 - x1) * i / steps, z = z1 + (z2 - z1) * i / steps;
        const [px, pz] = MM.collideProps(this.dimId, x, z, r, null);
        if (Math.abs(px - x) + Math.abs(pz - z) > 0.05) return false;
        const [wx, wz] = MM.collideWalls(this.dimId, x, z, r);
        if (Math.abs(wx - x) + Math.abs(wz - z) > 0.05) return false;
      }
      return true;
    }

    // ----- Turrets -----
    tickTurrets(dt, now) {
      for (const t of [...this.turrets.values()]) {
        if (now >= t.until) { this.turrets.delete(t.id); this.ev({ k: 'tu-', id: t.id }); continue; }
        if (now < t.cd) continue;
        let best = null, bd = 26 * 26, isNpc = false;
        for (const p of this.players.values()) {
          const o = this.host.players.get(t.owner);
          if (p.id === t.owner || !this.visible(p, now) || (o && !this.host.canHurt(o, p))) continue;
          const d = dist2(p.x, p.z, t.x, t.z);
          if (d < bd) { bd = d; best = p; isNpc = false; }
        }
        const reach = t.big ? 45 : 26;
        if (bd === 26 * 26) bd = reach * reach;
        for (const n of this.npcs.values()) {
          if (!n.T.hostile || (n.owner && now < n.ownerUntil)) continue;
          const d = dist2(n.x, n.z, t.x, t.z);
          if (d < bd) { bd = d; best = n; isNpc = true; }
        }
        if (!best) continue;
        t.cd = now + (t.big ? 1.2 : 0.45);
        const ty = isNpc ? best.y + best.T.h / 2 : best.y + 1;
        const ox = t.x, oy = t.y + 1.3, oz = t.z;
        const dx = best.x - ox, dy = ty - oy, dz = best.z - oz, l = Math.hypot(dx, dy, dz) || 1;
        t.aim = Math.atan2(dx, dz);
        this.host.fireProjectile(this, { owner: t.owner, kind: 'turret', x: ox + dx / l, y: oy + dy / l, z: oz + dz / l, dx: dx / l, dy: dy / l, dz: dz / l, speed: t.big ? 70 : 55, range: t.big ? 50 : 30, dmg: t.big ? 18 : 6 });
      }
    }

    // ----- Portals -----
    tickPortals(now) {
      for (const po of [...this.portals.values()]) {
        if (now >= po.until) { this.portals.delete(po.id); this.ev({ k: 'po-', id: po.id }); continue; }
        for (const p of [...this.players.values()]) {
          if (p.dead || now < p.portalCool) continue;
          if (p.arch === 'tommy' && !po.chalk) continue;   // only a chalk door lets Tommy through
          if (dist2(p.x, p.z, po.x, po.z) < (MM.PORTAL_RADIUS + (p.ship ? 1.2 : 0)) ** 2 && p.y < po.y + 3.5 && p.y > po.y - 1.5) {
            const dest = this.host.instances.get(po.destKey);
            const exit = dest && dest.portals.get(po.link);
            const at = exit ? { x: exit.x + Math.sin(exit.r) * 2.6, z: exit.z + Math.cos(exit.r) * 2.6 } : null;
            this.host.travel(p, po.destDim, at, dest);
          }
        }
      }
    }

    // Snapshot of moving things, serialized once and sent to everyone here.
    snapshot() {
      const now = this.host.time;
      const ps = [];
      for (const p of this.players.values()) ps.push([p.id, r2(p.x), r2(p.y), r2(p.z), r2(p.r), p.dead ? MM.ANIM.dead : p.a, Math.max(0, Math.round(p.hp / p.maxHp * 100)), this.host.fxBits(p, now)]);
      const ns = [];
      for (const n of this.npcs.values()) ns.push([n.id, r2(n.x), r2(n.y), r2(n.z), r2(n.r), Math.max(0, Math.round(n.hp / n.T.hp * 100)), (now < n.ownerUntil ? 1 : 0) | (now < n.angryUntil ? 2 : 0) | (now < n.dance ? 4 : 0) | (now < n.stun ? 8 : 0)]);
      const ts = [];
      for (const t of this.turrets.values()) ts.push([t.id, r2(t.aim || 0)]);
      return JSON.stringify({ t: 's', tm: r2(now), p: ps, n: ns, u: ts });
    }
  }

  // ---------------------------------------------------------------- Host
  class Host {
    // opts.store: { load(token, arch) -> saved progress or null, save(token, arch, progress) }
    // opts.newToken: () -> 32 hex characters. opts.wall: () -> wall-clock ms (for daily cooldowns).
    constructor(opts) {
      opts = opts || {};
      this.name = opts.name || 'Multiverse Mayhem';
      this.cap = opts.cap || MM.INSTANCE_CAP;
      this.maxPlayers = opts.maxPlayers || 2000;
      this.log = opts.log || function () {};
      this.store = opts.store || null;
      this.newToken = opts.newToken || (() => Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''));
      this.wall = opts.wall || (() => Date.now());
      this.instances = new Map();
      this.players = new Map();
      this.clients = new Map();       // conn -> client record
      this.tokens = new Map();        // save token -> player playing with it
      this.time = 0;
      this.tickN = 0;
      this.nextId = 1;
      this.nextEnt = 1;
      this.timers = [];
      this.cast = new Map();          // castKey -> { arch, origin, at, npc, player, next, downUntil }
      for (const d of MM.DIMS) this.instance(d.id, 0);
    }

    ent() { return this.nextEnt++; }
    later(sec, fn) { this.timers.push({ at: this.time + sec, fn }); }

    instance(dimId, idx) {
      const key = dimId + '#' + idx;
      let inst = this.instances.get(key);
      if (!inst) { inst = new Instance(this, dimId, idx); this.instances.set(key, inst); }
      return inst;
    }

    // The first instance of a dimension with room, opening a new one if all are full.
    instanceWithRoom(dimId, prefer) {
      if (prefer && prefer.dimId === dimId && prefer.players.size < this.cap && this.instances.get(prefer.key) === prefer) return prefer;
      for (let i = 0; ; i++) {
        const inst = this.instance(dimId, i);
        if (inst.players.size < this.cap) return inst;
      }
    }

    // ----- The cast (shared/cast.js) -----
    castRec(arch, origin) {
      const key = MM.castKey(arch, origin);
      let rec = this.cast.get(key);
      if (!rec) { rec = { key, arch, origin, at: origin, npc: null, player: 0, next: this.time + 40 + Math.random() * 140, downUntil: 0 }; this.cast.set(key, rec); }
      return rec;
    }
    castNpc(rec) {
      if (!rec.npc) return null;
      const inst = rec.npc.inst, n = this.instances.get(inst.key) === inst && inst.npcs.get(rec.npc.id);
      if (!n) rec.npc = null;
      return n || null;
    }
    // A dimension's first copy opens: its own people, and anyone visiting.
    castHere(inst) {
      for (const arch of MM.castOf(inst.dimId)) this.castRec(arch, inst.dimId);
      for (const rec of this.cast.values()) if (rec.at === inst.dimId && !rec.player && !rec.riding && !this.castNpc(rec) && this.time >= rec.downUntil) inst.spawnCastNpc(rec, null, false);
    }
    castUnspawn(rec) {
      const n = this.castNpc(rec);
      if (n) { rec.npc.inst.npcs.delete(n.id); rec.npc.inst.ev({ k: 'npc-', id: n.id }); }
      rec.npc = null;
    }
    // Somewhere else now: there as a local if that place is open (arriving the way they left).
    castMove(rec, dest, via, at) {
      rec.at = dest; rec.npc = null;
      rec.next = this.time + (dest === rec.origin ? 90 + Math.random() * 150 : 50 + Math.random() * 100);
      const inst = at && at.inst || this.instances.get(dest + '#0');
      if (!inst || rec.player) return;
      const spot = at || MM.spawnPoint(dest);
      const n = inst.spawnCastNpc(rec, { x: spot.x, z: spot.z }, false);
      if (via === 'ship' || via === 'fly') { n.y += 45; n.land = true; n.ship = via === 'ship'; }
      inst.ev({ k: 'npc+', n: inst.npcRow(n) });
    }
    // Where a traveller goes next: home if away; otherwise somewhere they can get to.
    castDest(rec) {
      if (rec.at !== rec.origin) return rec.origin;
      const kind = MM.CAST_TRAVEL[rec.arch], here = MM.DIM_BY_ID[rec.at];
      const ok = id => { const D = MM.DIM_BY_ID[id]; return id !== rec.at && D && !D.hidden && !D.pocket && !D.interior && !D.planets && (!D.outsideCurve || rec.arch === 'evilmorty'); };
      let list = kind === 'portal' ? MM.WORLD_IDS.filter(ok) : MM.WORLD_IDS.filter(id => ok(id) && here.space && MM.DIM_BY_ID[id].space === here.space);
      return list.length ? pick(list) : null;
    }
    // Every few seconds: the travellers go places. Where someone can see them, they open a
    // portal and walk through it (Morty goes along with his Rick), or take off; where nobody is
    // looking, they just go.
    castTick() {
      const now = this.time;
      for (const rec of this.cast.values()) {
        if (rec.player || rec.riding) continue;   // (or riding in a Rick's ship)
        const n = this.castNpc(rec);
        if (!n) {
          // Back on their feet a while after being knocked out, wherever they were.
          if (!rec.npc && now >= rec.downUntil && rec.downUntil) { rec.downUntil = 0; const inst = this.instances.get(rec.at + '#0'); if (inst) { const m = inst.spawnCastNpc(rec, null, false); inst.ev({ k: 'npc+', n: inst.npcRow(m) }); } }
          continue;
        }
        const kind = MM.CAST_TRAVEL[rec.arch];
        if (!kind || kind === 'tag' || now < rec.next || n.leave) continue;
        const dest = this.castDest(rec);
        if (!dest) { rec.next = now + 120; continue; }
        const inst = rec.npc.inst, seen = inst.players.size > 0;
        if (kind === 'portal') {
          const col = MM.castLook(rec.arch, rec.origin).portalColor;
          const r = n.r, x = n.x + Math.sin(r) * 3, z = n.z + Math.cos(r) * 3;
          const pair = seen ? this.openPortalPair(inst, x, z, r + Math.PI, dest, col, 0) : null;
          const go = m => { m.leave = { kind, x, z, until: now + 6, dest, pair }; };
          go(n);
          // Morty goes with his Rick, if he is nearby.
          if (rec.arch === 'genius') for (const m of inst.npcs.values()) if (m.cast && m.cast.arch === 'sidekick' && m.cast.origin === rec.origin && !m.cast.player && dist2(m.x, m.z, n.x, n.z) < 20 * 20) go(m);
          if (!seen) for (const m of [...inst.npcs.values()]) if (m.leave && m.leave.dest === dest) inst.castLeave(m);
        } else {
          n.leave = { kind, until: now + (seen ? 4.5 : 0), dest };
          n.ship = kind === 'ship';
          if (seen) inst.ev({ k: 'nship', n: n.id, on: n.ship ? 1 : 0 });
          else inst.castLeave(n);
        }
      }
    }

    // ----- Connections -----
    connect(conn, meta) {
      const buckets = {};
      for (const k in MM.RATE) buckets[k] = new Bucket(MM.RATE[k][0], MM.RATE[k][1]);
      for (const k in buckets) buckets[k].at = this.time;
      this.clients.set(conn, { conn, player: null, buckets, bad: 0, flood: 0, bot: !!(meta && meta.bot), ip: meta && meta.ip });
    }

    close(conn) {
      const c = this.clients.get(conn);
      if (!c) return;
      this.clients.delete(conn);
      const p = c.player;
      if (!p) return;
      this.save(p);
      if (p.token && this.tokens.get(p.token) === p) this.tokens.delete(p.token);
      if (p.cast && p.cast.player === p.id) {
        // The character carries on without you, where you left them.
        const rec = p.cast, D = p.inst && p.inst.dim;
        rec.player = 0;
        if (D && !D.interior && !D.hidden && !D.planets && !p.dead) { rec.at = p.inst.dimId; rec.npc = null; const n = p.inst.spawnCastNpc(rec, { x: p.x, z: p.z }, false); p.inst.ev({ k: 'npc+', n: p.inst.npcRow(n) }); }
        else { rec.at = rec.origin; const inst = this.instances.get(rec.origin + '#0'); if (inst) { const n = inst.spawnCastNpc(rec, null, false); inst.ev({ k: 'npc+', n: inst.npcRow(n) }); } }
      }
      if (p.trade) this.tradeEnd(p.trade, p.name + ' left.');
      if (p.aboard) this.disembark(p);
      if (p.vessel) this.emptyShip(p.vessel, p.name + ' left, and took the ship.');
      if (p.inst) { p.inst.players.delete(p.id); p.inst.ev({ k: 'leave', id: p.id }); p.inst.emptySince = this.time; }
      this.leaveTeam(p);
      this.players.delete(p.id);
      this.log(`leave ${p.name} (${p.id})`);
    }

    kick(c, why) {
      this.log(`kicked ${c.player ? c.player.name : '?'}: ${why}`);
      try { c.conn.send(JSON.stringify({ t: 'err', msg: why })); } catch (_) {}
      try { c.conn.close(4000, why); } catch (_) {}
      this.close(c.conn);
    }

    send(p, obj) { if (p.conn) try { p.conn.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch (_) {} }

    message(conn, raw) {
      const c = this.clients.get(conn);
      if (!c) return;
      if (!c.buckets.all.take(this.time)) {
        if (++c.flood > 150) this.kick(c, 'Too many messages');
        return;
      }
      const m = MM.parseClient(raw);
      if (!m) {
        if (++c.bad > 40) this.kick(c, 'Bad messages');
        return;
      }
      const b = c.buckets[m.t];
      if (b && !b.take(this.time)) return;
      if (m.t === 'hello') { if (!c.player) this.hello(c, m); return; }
      const p = c.player;
      if (!p) return;
      switch (m.t) {
        case 'st': this.onState(c, p, m); break;
        case 'f': this.onFire(p, m); break;
        case 'ab': this.onAbility(p); break;
        case 'po': this.onPortal(p, m.d); break;
        case 'ki': this.onKiosk(p, m.d); break;
        case 'cr': this.onCraft(p, m.g); break;
        case 'g': this.onGadget(p, m); break;
        case 'c': this.onChat(p, m.text); break;
        case 'em': if (!p.dead) p.inst.ev({ k: 'em', id: p.id, e: m.e }); break;
        case 'rs': this.onRespawn(p); break;
        case 'pi': this.send(p, { t: 'pong', c: m.c }); break;
        case 'use': this.onUse(p, m.l, m.task); break;
        case 'hd': this.onDefense(p, m.o, m.d); break;
        case 'fun': this.onFun(p, m); break;
        case 'mg': this.onMinigame(p, m); break;
        case 'lk': if (p.wardrobeUntil > this.time) { p.look = MM.sanitizeLook(m.look); p.inst.ev({ k: 'look', id: p.id, look: p.look }); } break;
        case 'talk': this.onTalk(p, m.n); break;
        case 'ans': this.onAnswer(p, m.a); break;
        case 'ship': this.onShip(p, m.on); break;
        case 'sb': this.onBoard(p, m); break;
        case 'kss': this.onKss(p, m); break;
        case 'car': this.onCar(p, m.on); break;
        case 'tr': this.onTrade(p, m); break;
        case 'gv': this.onGive(p, m); break;
        case 'uo': this.onUseOn(p, m); break;
        case 'dp': this.onDeathPunch(p, m); break;
        case 'unp': this.onUnpunch(p, m); break;
        case 'pvp': p.pvp = m.on; this.toast(p, m.on ? 'Fights on: players who also turned fights on can hurt you, and you them.' : 'Fights off: no other player can hurt you.'); break;
        case 'drive': this.onDrive(p, m.d); break;
        case 'orbit': this.onOrbit(p); break;
        case 'land': this.onLand(p, m.d, m.h); break;
        case 'ls': this.onLight(p, m.d); break;
        case 'door': this.onDoor(p, m.l); break;
        case 'tm': this.onTeam(p, m); break;
        case 'uc': this.onCurio(p, m.id); break;
        case 'pp': this.onPair(p, m); break;
        case 'pt': this.onPairTransit(p, m); break;
      }
    }

    hello(c, m) {
      if (m.v !== MM.VERSION) { this.kick(c, 'This server runs a different version. Refresh the page.'); return; }
      if (this.players.size >= this.maxPlayers) { this.kick(c, 'Server is full'); return; }
      const A = MM.ARCHETYPES[m.arch];
      // Saved progress: the token is a random secret the client keeps. One session per token.
      let token = null;
      if (!c.bot) {
        token = typeof m.tok === 'string' && /^[0-9a-f]{32}$/.test(m.tok) ? m.tok : this.newToken();
        const old = this.tokens.get(token);
        if (old) { const oc = this.clients.get(old.conn); if (oc) this.kick(oc, 'You joined from another tab or device.'); }
      }
      let saved = null;
      if (token && this.store) { try { saved = this.store.load(token, m.arch); } catch (_) { saved = null; } }
      const prog = cleanProgress(m.arch, saved);
      if (prog.inv.grenade === undefined || (!saved && !prog.inv.grenade)) prog.inv.grenade = 1;
      for (const g of MM.GADGET_IDS) if (!prog.inv[g]) prog.inv[g] = prog.inv[g] || 0;
      // One of each character: you take over your dimension's Rick C-137 (or Beth SH-1, or
      // Birdperson). Taken already? Play one of his clones (weaker, out of the lab under the
      // garage), or, if you asked for that, the same character from another dimension.
      const asked = MM.sanitizeHome(m.home);
      let home = asked, clone = false;
      const playing = h => { const r = this.cast.get(MM.castKey(m.arch, MM.castHome(m.arch, h))); return !!(r && r.player && this.players.has(r.player)); };
      if (playing(home)) {
        if (m.taken === 'other' || c.bot) { const L = home.replace(/[^A-Z]/g, '') || 'X'; let n = 0; do home = L + '-' + (1 + Math.floor(Math.random() * 999)); while (playing(home) && ++n < 200); }
        else clone = true;
      }
      const p = {
        id: this.nextId++, conn: c.conn, bot: c.bot, token,
        name: MM.sanitizeName(m.name), home, clone, look: MM.sanitizeLook(m.look), arch: m.arch, A, pvp: m.pvp !== false,
        prog, inv: prog.inv, st: null, hacked: {},
        inst: null, ep: 0, x: 0, y: 0, z: 0, r: 0, a: 0, lastSt: this.time, strikes: 0,
        hp: A.hp, maxHp: A.hp, dead: false, respawnAt: 0, ship: false,
        charges: 0, chargeAt: 0,
        cdFire: 0, cdAb: 0, cdKiosk: 0, cdTalk: 0, cdDrive: 0, cdUse: 0, offer: null,
        fx: { shield: 0, sprint: 0, sob: 0, shrink: 0, guilt: 0, prot: 0, daze: 0, cuff: 0, cloak: 0 },
        kbUntil: 0, portalCool: 0, kills: 0, deaths: 0, dirtyFlag: true, progDirty: true, saveDirty: false,
      };
      this.restat(p);
      p.hp = p.maxHp;
      p.charges = p.st.gun ? p.st.gun.charges : 0;
      c.player = p;
      this.players.set(p.id, p);
      if (token) this.tokens.set(token, p);
      this.send(p, { t: 'hi', id: p.id, name: this.name, cap: this.cap, dims: MM.DIM_IDS, tok: token, you: { name: p.name, home: p.home, arch: p.arch } });
      this.log(`join ${p.name} (${p.id}) as ${p.arch}${p.bot ? ' [bot]' : ''}${saved ? ' (saved progress)' : ''}`);
      // You start in your own world: the one your character lives in. As that dimension's
      // character, you take over from them where they are.
      const starts = MM.startWorlds(m.arch, p.home), origin = MM.castHome(m.arch, p.home);
      if (p.home !== asked && !p.bot) this.toast(p, A.name + ' ' + asked + ' is already here, so you are ' + A.name + ' ' + p.home + '.');
      if (clone) {
        this.toast(p, MM.castLabel(m.arch, origin) + ' is already being played, so you are one of the clones (a little weaker).');
        const lab = MM.LANDMARKS.find(l => l.dim === origin && MM.isAt(l, 'trapdoor'));
        this.travel(p, origin, lab ? { x: lab.x + 1.6, z: lab.z + 0.8 } : null, null, true);
        return;
      }
      const rec = MM.castOf(origin).includes(m.arch) ? this.castRec(m.arch, origin) : null;
      if (rec) {
        const n = this.castNpc(rec), D = MM.DIM_BY_ID[rec.at];
        const asked = m.dim && starts.includes(m.dim) ? m.dim : null;
        const where = asked || (D && !D.interior && !D.hidden && !D.planets ? rec.at : origin);
        const at = n && where === rec.at ? { x: n.x, z: n.z } : null, inst = at ? rec.npc.inst : null;
        this.castUnspawn(rec);
        if (rec.riding) this.unrideCast(rec);
        rec.player = p.id; p.cast = rec; rec.at = where;
        this.travel(p, where, at, inst, true);
        return;
      }
      this.travel(p, m.dim && starts.includes(m.dim) ? m.dim : starts[0], null, null, true);
    }

    restat(p) {
      const old = p.maxHp;
      p.st = MM.statsOf(p.arch, p.prog.up);
      p.maxHp = p.clone ? Math.round(p.st.maxHp * MM.CLONE_HP) : p.st.maxHp;
      if (old && p.maxHp > old && !p.dead) p.hp += p.maxHp - old;
      p.hp = Math.min(p.hp, p.maxHp);
      const max = p.st.gun ? p.st.gun.charges : 0;
      if (p.charges > max) p.charges = max;
      if (!p.st.ship) p.ship = false;
    }

    info(p) {
      const up = p.prog.up;
      return { id: p.id, name: p.name, home: p.home, clone: p.clone ? 1 : 0, look: p.look, arch: p.arch, bot: p.bot, title: p.prog.title || '', sk: MM.shipKind(p.arch),
        gear: { ratsuit: !!up.ratsuit, wings: !!up.wings, jet: !!up.jetpack && !up.wings, engine: !!up.engine, lasers: !!up.lasers, cyberarm: !!up.cyberarm, cyberlegs: !!up.cyberlegs, strongarm: !!p.prog.arm } };
    }

    // ----- Life progress -----
    progress(p, kind, val) {
      const c = p.prog.cnt;
      switch (kind) {
        case 'use': c.use[val] = (c.use[val] || 0) + 1; break;
        case 'at': if (!(c.at || (c.at = [])).includes(val)) c.at.push(val); else return; break;
        case 'dim': if (!MM.DIM_BY_ID[val].hidden && !c.dims.includes(val)) c.dims.push(val); else return; break;
        case 'craft': if (!c.crafted.includes(val)) c.crafted.push(val); break;
        case 'kill': c.kills++; c.kill[val] = (c.kill[val] || 0) + 1; break;
        case 'ko': c.ko++; break;
        case 'talk': c.talk++; break;
        case 'smash': c.smash++; break;
        case 'errand': c.errand++; break;
      }
      p.progDirty = true;
      this.dirty(p);
    }

    // Complete as many path steps as are done, in order.
    checkSteps(p) {
      const steps = p.A.steps, prog = p.prog;
      let changed = false;
      while (prog.step < steps.length) {
        const S = steps[prog.step];
        const pr = MM.stepProgress(prog, S.goal, p.inv);
        if (pr.now < pr.need) break;
        prog.step++;
        changed = true;
        for (const g of S.grants || []) if (!prog.grants.includes(g)) prog.grants.push(g);
        if (S.title) {
          prog.title = p.A.life.breakout;
          p.inst.ev({ k: 'title', id: p.id, title: prog.title });
          this.priv(p, { k: 'step', name: S.name, title: prog.title, grants: S.grants || [] });
        } else this.priv(p, { k: 'step', name: S.name, grants: S.grants || [] });
      }
      if (changed) p.progDirty = true;
    }

    save(p) {
      if (!this.store || !p.token || p.bot) return;
      try { this.store.save(p.token, p.arch, p.prog); } catch (e) { this.log('save failed: ' + e.message); }
      p.saveDirty = false;
    }

    // Move a player into a dimension (a portal, the kiosk, a ship, or joining).
    travel(p, dimId, at, preferInst, first) {
      if (p.ship && MM.DIM_BY_ID[dimId] && MM.DIM_BY_ID[dimId].interior) { p.ship = false; if (p.inst) this.parkShip(p, p.inst); }   // you park the ship to go indoors
      p.car = false;   // a car stays in its world: you park it
      // Tiny in a tiny world is life-size there; out again, you're tiny again.
      if (MM.DIM_BY_ID[dimId].tinyWorld) { if (p.tiny) { p.tiny = false; p.tinyIn = true; } }
      else if (p.tinyIn) { p.tinyIn = false; p.tiny = true; }
      if (p.bout) this.endBout(p, false, 'You left the Ring of Death.');
      const from = p.inst;
      p.pp = [null, null];   // your portal pair stays behind (and closes)
      if (p.ride) { p.ride = null; if (from) from.ev({ k: 'rd', id: p.id, r: '' }); }
      if (from) {
        from.players.delete(p.id);
        from.ev({ k: 'leave', id: p.id, via: dimId });
        from.emptySince = this.time;
      }
      const inst = this.instanceWithRoom(dimId, preferInst);
      const spot = at ? { x: at.x, z: at.z, y: MM.heightAt(dimId, at.x, at.z) } : MM.spawnPoint(dimId);
      p.inst = inst;
      p.x = spot.x; p.y = at && at.y !== undefined ? at.y : spot.y + (p.ship ? 3 : 0.1); p.z = spot.z; p.a = 0;
      if (MM.DIM_BY_ID[dimId].planets && !p.ship && !p.aboard && p.st.ship) { p.ship = true; this.takeShip(p); }   // nobody walks in space
      p.ep++;
      p.lastSt = this.time;
      p.portalCool = this.time + 2;
      p.offer = null;
      p.fx.prot = Math.max(p.fx.prot, this.time + (first ? MM.SPAWN_PROTECT : 1.5));
      inst.ev({ k: 'join', p: this.info(p), via: from ? from.dimId : null });
      inst.players.set(p.id, p);
      const w = inst.welcomeState();
      w.t = 'w'; w.ep = p.ep; w.x = r2(p.x); w.y = r2(p.y); w.z = r2(p.z); w.tm = r2(this.time); w.ship = p.ship;
      this.send(p, w);
      this.stampPassport(p, dimId);
      this.progress(p, 'dim', dimId);
      this.dirty(p);
    }

    teleport(p, x, y, z) {
      p.x = x; p.y = y; p.z = z; p.ep++; p.lastSt = this.time;
      this.priv(p, { k: 'tp', x: r2(x), y: r2(y), z: r2(z), ep: p.ep });
    }

    priv(p, e) { (p.pv || (p.pv = [])).push(e); }
    dirty(p) { p.dirtyFlag = true; p.saveDirty = true; }
    toast(p, text) { this.priv(p, { k: 'toast', text }); }
    knock(p, vx, vy, vz) { p.kbUntil = this.time + 1.5; this.priv(p, { k: 'kb', vx: r2(vx), vy: r2(vy), vz: r2(vz) }); }

    scaleOf(p) { return p.tiny ? MM.TINY.scale : (this.time < p.fx.shrink ? 0.5 : 1) * (p.tinyRick ? MM.TINYRICK.scale : 1); }

    fxBits(p, now) {
      let b = 0;
      if (now < p.fx.shield) b |= 1;
      if (now < p.fx.sprint) b |= 2;
      if (now < p.fx.sob) b |= 4;
      if (now < p.fx.shrink) b |= 8;
      if (now < p.fx.guilt) b |= 16;
      if (now < p.fx.prot) b |= 32;
      if (now < p.fx.daze) b |= 256;
      if (p.ship) b |= 512;
      if (now < p.fx.cuff) b |= 1024;
      if (now < p.fx.cloak) b |= 2048;
      if (p.pvp) b |= 4096;
      if (p.tinyRick) b |= 32768;
      if (p.dp) b |= 65536;   // a death punch is counting down your steps
      if (p.car) b |= 8192;
      if (p.tiny) b |= 16384;
      return b;
    }

    // Top speed right now. The client uses the same factors (js/game.js).
    speedOf(p) {
      const now = this.time;
      if (now < p.fx.cuff) return 1;
      const base = p.ship ? p.st.ship.speed * MM.SHIP_BOOST : p.car ? MM.CAR.speed * MM.CAR.boost : p.st.speed * (p.st.fly ? 1.35 : 1) * (p.st.sprint || 1);   // the most you can go: sprinting
      return base * (p.tiny ? MM.TINY.speed : 1) * (p.tinyRick && !p.ship && !p.car ? MM.TINYRICK.speed : 1) * (now < p.fx.sprint ? 1.8 : 1) * (now < p.fx.shrink ? 0.75 : 1) * (now < p.fx.guilt ? 0.6 : 1) * (now < p.fx.daze ? 0.5 : 1);
    }

    // ----- Movement validation -----
    onState(c, p, m) {
      if (m.ep !== p.ep || p.dead || p.ride || p.aboard) return;   // on a ride (or in someone's ship) it moves you
      const now = this.time;
      // A jump pad throws you up (and along): let the flight happen.
      if (MM.padAt(p.inst.dimId, p.x, p.z) || MM.padAt(p.inst.dimId, m.x, m.z)) { p.flingUntil = now + 3; p.kbUntil = now + 1.5; }
      const dt = Math.min(1.0, Math.max(0.05, now - p.lastSt));
      const kb = now < p.kbUntil;
      const allowed = this.speedOf(p) * dt * 1.5 + 1.5 + (kb ? 30 * dt + 3 : 0);
      const lim = MM.boundOf(p.inst.dimId), limZ = MM.boundZOf(p.inst.dimId);
      const x = Math.max(-lim, Math.min(lim, m.x)), z = Math.max(-limZ, Math.min(limZ, m.z));
      const moved = Math.hypot(x - p.x, z - p.z);
      const ground = MM.heightAt(p.inst.dimId, x, z);
      const g = p.inst.dim.gravity;
      const quirk = p.inst.dim.quirk, jv = p.st.jump * (quirk === 'bouncy' ? 1.6 : 1) * (p.tinyRick ? MM.TINYRICK.jump : 1);
      // Vertical: you can only rise as fast as your jump (or wings, jetpack, ship, a blast)
      // allows, and never above your reach. Falling is always fine.
      const reach = (p.ship ? 1020 : p.st.fly === 'wings' ? 70 : jv * jv / (2 * g) + 14 + (p.st.fly === 'jet' ? 20 : 0)) + (now < (p.flingUntil || 0) ? 150 : 0) + (quirk === 'swim' || quirk === 'dreamy' ? 90 : 0);
      let y = m.y;
      if (y < ground - 1.5) y = ground;
      const rise = y - p.y;
      const maxRise = (p.ship ? 26 : p.st.fly || quirk === 'swim' || quirk === 'dreamy' ? 14 : jv) * dt * 1.6 + 1.2 + (kb ? 30 * dt + 3 : 0);
      if (moved > allowed || rise > maxRise || (y > ground + reach && rise > 0.3)) {
        p.strikes += 1;
        if (p.strikes > 25) { this.kick(c, 'Movement check failed'); return; }
        this.teleport(p, p.x, Math.max(p.y, MM.heightAt(p.inst.dimId, p.x, p.z)), p.z);
        return;
      }
      if (p.strikes > 0 && (this.tickN % 60 === 0)) p.strikes -= 1;
      const ox = p.x, oz = p.z;
      p.x = x; p.y = y; p.z = z; p.r = m.r; p.a = m.a === MM.ANIM.dead ? 0 : m.a;
      p.lastSt = now;
      if (p.car) this.carRam(p, ox, oz, dt);
      if (p.race || MM.racesIn(p.inst.dimId).length) this.raceStep(p);
      // Diving deep off an Earth's beach: down to that Earth's Atlantis.
      if (!p.ship && !p.dead && p.inst.dim.regions && p.z > MM.SEA_Z + 20 && p.y < MM.SEA_LEVEL + MM.DIVE_DEPTH) {
        this.travel(p, MM.atlantisOf(p.inst.dimId), { x: (Math.random() - 0.5) * 6, z: 34 });
        this.toast(p, 'You dived deep, and deeper, and found ' + p.inst.dim.name + '. Mr. Nimbus lives here.');
        return;
      }
      // Pick up anything in reach.
      for (const pk of p.inst.pickups.values()) {
        if (dist2(pk.x, pk.z, p.x, p.z) < MM.PICKUP_RADIUS * MM.PICKUP_RADIUS && Math.abs(pk.y - p.y) < 3) {
          p.inst.pickups.delete(pk.id);
          p.inv[pk.c] = Math.min(MM.isCurio(pk.c) ? 99 : 9999, (p.inv[pk.c] || 0) + pk.n);
          if (MM.isCurio(pk.c)) {
            const q = pk.c.slice(2), found = p.prog.found || (p.prog.found = []);
            const first = !found.includes(q);
            if (first) found.push(q);
            this.priv(p, { k: 'found', id: q, first, n: found.length });
            p.progDirty = true;
          }
          p.inst.ev({ k: 'pk-', id: pk.id, by: p.id });
          this.dirty(p);
        }
      }
      // Walking up to an easter egg.
      if (now >= (p.eggT || 0)) { p.eggT = now + 0.5; for (const E of MM.eggsIn(p.inst.dimId)) if (dist2(E.x, E.z, p.x, p.z) < (E.r || 3.5) ** 2) this.findEgg(p, E.id); }
      // Walking into a landmark counts for "go there" steps.
      if (now >= (p.lmT || 0)) for (const l of (p.lmT = now + 0.25, MM.LANDMARKS)) if (l.dim === p.inst.dimId && dist2(l.x, l.z, p.x, p.z) < (l.r + MM.USE_RADIUS) ** 2 && MM.sameFloor(l, p.y)) this.progress(p, 'at', l.id);
    }

    fireProjectile(inst, o) {
      const pr = { id: this.ent(), owner: o.owner, kind: o.kind, x: o.x, y: o.y, z: o.z,
        vx: o.dx * o.speed, vy: o.dy * o.speed + (o.up || 0), vz: o.dz * o.speed, g: !!o.gravity,
        life: o.life || o.range / o.speed, dmg: o.dmg, rad: o.rad || 0.15 };
      inst.projs.push(pr);
      inst.ev({ k: 'shot', id: pr.id, o: pr.owner, w: pr.kind, x: r2(pr.x), y: r2(pr.y), z: r2(pr.z), vx: r2(pr.vx), vy: r2(pr.vy), vz: r2(pr.vz), g: pr.g ? r2(inst.dim.gravity * 0.7) : 0, l: r2(pr.life) });
      return pr;
    }

    dmgMult(p) { return p.st.dmg * (this.time < p.fx.shrink ? 0.5 : 1) * (p.tiny ? MM.TINY.dmg : 1); }

    // The weapon in use: ship lasers in a ship that has them, a pea shooter in one that doesn't.
    weaponOf(p) {
      if (p.ship) return p.st.ship.lasers ? 'lasers' : 'blaster';
      if (p.car) return 'carguns';
      if (p.prog.arm) return 'armpunch';   // the arm does the punching
      return p.A.weapon;
    }

    onFire(p, m) {
      const now = this.time;
      if (p.dead || now < p.cdFire || now < p.fx.sob || MM.helpless(p.arch, p.prog.up)) return;
      const wid = this.weaponOf(p), w = MM.WEAPONS[wid];
      p.cdFire = now + w.cd * 0.9;
      p.fx.prot = 0;
      p.lastFight = now;
      const s = this.scaleOf(p);
      if (w.melee) { this.melee(p, m, w, wid); return; }
      const oy = p.ship ? 1.2 : p.car ? 1.15 : 1.35 * s, fwd = p.ship || p.car ? 2 : 0.7;
      this.fireProjectile(p.inst, { owner: p.id, kind: wid, x: p.x + m.dx * fwd, y: p.y + oy + m.dy * 0.7, z: p.z + m.dz * fwd,
        dx: m.dx, dy: m.dy, dz: m.dz, speed: w.speed, range: w.range, dmg: Math.round(w.dmg * this.dmgMult(p)) });
    }

    melee(p, m, w, wid) {
      const inst = p.inst;
      inst.ev({ k: 'mel', id: p.id });
      const reach = w.melee * this.scaleOf(p);
      const fx = m.dx, fz = m.dz, fl = Math.hypot(fx, fz) || 1;
      const inFront = (x, z, extra) => {
        const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
        if (d > reach + extra) return false;
        return d < 0.8 + extra || (dx * fx + dz * fz) / (d * fl) > 0.35;
      };
      const dmg = Math.round(w.dmg * this.dmgMult(p));
      for (const o of [...inst.players.values()]) {
        if (o === p || o.dead || !this.canHurt(p, o) || Math.abs(o.y - p.y) > 2.5 || !inFront(o.x, o.z, 0.5)) continue;
        this.hurtPlayer(inst, o, dmg, p, wid);
        if (w.knock && !o.ship) { const dx = o.x - p.x, dz = o.z - p.z, l = Math.hypot(dx, dz) || 1; this.knock(o, dx / l * w.knock, 5, dz / l * w.knock); }
      }
      for (const n of [...inst.npcs.values()]) if (!(n.owner === p.id && n.ownerUntil > this.time) && Math.abs(n.y - p.y) < 4 && inFront(n.x, n.z, n.T.r)) inst.hurtNpc(n, dmg, p);
      for (const t of [...inst.turrets.values()]) if (t.owner !== p.id && inFront(t.x, t.z, 0.8)) inst.hurtTurret(t, dmg);
      MM.genProps(inst.dimId).forEach((pr, i) => { if (inst.props[i].hp > 0 && p.y < pr.y + pr.h && inFront(pr.x, pr.z, pr.r)) inst.hurtProp(i, dmg, p); });
    }

    // This is a free-roaming chaos game, not a battle royale: players only hurt each other
    // when both of them have turned fights on. Monsters, the world and yourself still can.
    canHurt(src, p) {
      if (!src || src === p || !src.A) return true;   // monsters, hazards, yourself
      if (src.team && src.team === p.team) return false;   // never your own team
      return !!(src.pvp && p.pvp);
    }

    hurtPlayer(inst, p, amt, src, how) {
      const now = this.time;
      if (p.dead || now < p.fx.prot || now < p.fx.sob || amt <= 0) return;
      if (!this.canHurt(src, p)) return;
      if (p.arch === 'sidekick' && Math.random() < 0.2) { inst.ev({ k: 'dodge', id: p.id }); return; }
      if (now < p.fx.shield) amt *= 0.3;
      if (p.ship || p.aboard) amt *= 0.6;
      if (p.car) amt *= MM.CAR.armour;
      if (inst.dim.quirk === 'bouncy') amt *= 0.5;   // Froopyland: nothing here can hurt you. Much.
      amt = Math.max(1, Math.round(amt));
      p.hp -= amt;
      inst.ev({ k: 'dmg', p: p.id, d: amt, by: src ? src.id : 0 });
      this.dirty(p);
      if (p.hp <= 0) this.kill(inst, p, src, how);
    }

    kill(inst, p, src, how) {
      // Inside an immortality field you pop straight back together.
      if (MM.inField(inst.dimId, p.x, p.z)) {
        p.hp = p.maxHp; p.fx.prot = Math.max(p.fx.prot, this.time + 1);
        inst.ev({ k: 'reform', id: p.id });
        this.toast(p, pick(['The immortality field put you back together. Again.', 'You died! Briefly. The field fixed it.', 'Splat, then un-splat. Gotta love the field.']));
        this.dirty(p);
        return;
      }
      p.hp = 0; p.dead = true; p.deaths++;
      p.dp = null;
      p.respawnAt = this.time + MM.RESPAWN_TIME;
      if (p.ship) { p.ship = false; inst.ev({ k: 'ship', id: p.id, on: false }); if (p.vessel) this.emptyShip(p.vessel, 'The ship went down. You jumped clear.'); }
      if (p.aboard) this.disembark(p);
      if (p.car) { p.car = false; inst.ev({ k: 'car', id: p.id, on: false }); inst.ev({ k: 'boom', x: r2(p.x), y: r2(p.y + 0.5), z: r2(p.z), r: 4 }); }   // the car goes up with you
      const lost = Math.floor(p.inv.s / 2);
      if (lost > 0) { p.inv.s -= lost; inst.spawnPickup('s', true, { x: p.x, z: p.z }, lost); }
      if (src && src !== p) {
        src.kills++; src.prog.chaos += 5;
        this.progress(src, 'ko');
        // Knock out someone with a portal gun and you can grab a charge from it.
        if (src.A && p.st.gun && p.charges > 0 && !src.st.gun) { p.charges--; src.borrow = (src.borrow || 0) + 1; this.toast(src, 'You grabbed their portal gun for one jump (E).'); this.dirty(src); }
        if (p.arch === 'beanling') { src.fx.guilt = this.time + 10; this.toast(src, 'You feel terrible about that.'); }
      }
      inst.ev({ k: 'kill', v: p.id, by: src ? src.id : 0, w: how || '' });
      this.dirty(p);
    }

    onRespawn(p) {
      if (!p.dead || this.time < p.respawnAt) return;
      p.dead = false; p.hp = p.maxHp;
      p.fx = { shield: 0, sprint: 0, sob: 0, shrink: 0, guilt: 0, prot: this.time + MM.SPAWN_PROTECT, daze: 0, cuff: 0, cloak: 0 };
      let s = MM.spawnPoint(p.inst.dimId);
      // A backup body from the cloning vat: you wake up in the garage.
      if (p.backup && p.backup === p.inst.dimId) { s = { x: -15.6, y: MM.heightAt(p.inst.dimId, -15.6, 27.5), z: 27.5 }; p.backup = null; this.toast(p, 'You wake up in a backup body, in the garage.'); }
      this.teleport(p, s.x, s.y + 0.1, s.z);
      p.inst.ev({ k: 'resp', id: p.id });
      this.dirty(p);
    }

    onAbility(p) {
      const now = this.time, A = p.A, ab = A.ability, inst = p.inst;
      if (p.dead || now < p.cdAb) return;
      p.cdAb = now + ab.cd * (p.st.cdMult || 1);
      inst.ev({ k: 'ab', id: p.id, a: ab.id });
      const near = (r, fn) => { for (const o of [...inst.players.values()]) if (o !== p && !o.dead && dist2(o.x, o.z, p.x, p.z) < r * r) fn(o); };
      const nearNpc = (r, fn) => { for (const n of [...inst.npcs.values()]) if (dist2(n.x, n.z, p.x, p.z) < r * r) fn(n); };
      switch (ab.id) {
        case 'shield': p.fx.shield = now + ab.dur; break;
        case 'sprint': p.fx.sprint = now + ab.dur; break;
        case 'sob': p.fx.sob = now + ab.dur; break;
        case 'dive': inst.explode(p.x, p.y, p.z, 5.5, 32, p, 'dive', { knock: 12, noSelfKnock: true, propDmg: 70 }); break;
        case 'slam': inst.explode(p.x, p.y, p.z, 6.5, 18, p, 'slam', { knock: 20, noSelfKnock: true, propDmg: 50 }); break;
        case 'cheer':
          p.hp = Math.min(p.maxHp, p.hp + 30);
          near(10, o => { o.hp = Math.min(o.maxHp, o.hp + 30); this.dirty(o); });
          break;
        case 'patch':
          p.hp = Math.min(p.maxHp, p.hp + 40);
          near(8, o => { o.hp = Math.min(o.maxHp, o.hp + 20); this.dirty(o); });
          break;
        case 'flash':
          near(8, o => { o.fx.daze = now + 3; this.dirty(o); });
          nearNpc(8, n => { n.stun = now + 3; });
          break;
        case 'cuff': {
          const fx = Math.sin(p.r), fz = Math.cos(p.r);
          near(6, o => { const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz) || 1; if ((dx * fx + dz * fz) / d > 0.5) { o.fx.cuff = now + 2.5; this.dirty(o); } });
          nearNpc(6, n => { n.stun = now + 4; });
          break;
        }
        case 'summon': this.summonMeeseeks(p, 2, 20); break;
        case 'rage': p.fx.shield = now + 5; p.fx.sprint = now + 5; break;
        case 'scheme': p.fx.cloak = now + ab.dur; break;
        case 'roll': p.fx.sprint = now + ab.dur; p.fx.shield = now + ab.dur; break;
        case 'assimilate': {
          let k = 0;
          nearNpc(10, n => {
            if (k >= 4 || n.T.hostile || (n.owner && n.ownerUntil > now)) return;
            n.owner = p.id; n.ownerUntil = now + 30; n.angry = 0; k++;
            inst.ev({ k: 'say', n: n.id, by: p.id, text: 'We are one. We are ' + p.name + '.' });
          });
          if (!k) this.toast(p, 'No locals close enough to assimilate.');
          break;
        }
      }
      this.dirty(p);
    }

    // Mr. Meeseeks pops out and fights for you, then (happily) stops existing.
    summonMeeseeks(p, count, secs) {
      const inst = p.inst, now = this.time;
      for (let i = 0; i < count; i++) {
        const a = p.r + (count > 1 ? (i ? 1.2 : -1.2) : 0.9);
        let x = p.x + Math.sin(a) * 2, z = p.z + Math.cos(a) * 2;
        [x, z] = MM.collideProps(inst.dimId, x, z, 0.5, null);
        const n = inst.spawnNpc('meeseeks', true, { at: { x, z }, until: now + secs });
        n.owner = p.id; n.ownerUntil = now + secs;
        inst.ev({ k: 'say', n: n.id, by: p.id, text: pick(['I\'m Mr. Meeseeks! Look at me!', 'Ooh, can do!', 'Caaan do!']) });
      }
    }

    // ----- Teams -----
    // Up to 8 players. Teammates can't hurt each other, see each other on the map, and
    // anyone standing near you comes along when you take a door, a station or your ship.
    onTeam(p, m) {
      const now = this.time;
      if (m.op === 'leave') { this.leaveTeam(p); return; }
      const o = this.players.get(m.id);
      if (!o || o === p) return;
      if (m.op === 'inv') {
        if (o.inst !== p.inst) { this.toast(p, 'They need to be in the same place as you.'); return; }
        if (p.team && p.team === o.team) return;
        if (p.team && p.team.ids.size >= MM.TEAM_MAX) { this.toast(p, 'Your team is full.'); return; }
        (p.invites || (p.invites = new Map())).set(o.id, now + 60);
        this.priv(o, { k: 'tminv', id: p.id, name: p.name + ' ' + p.home });
        this.toast(p, 'Invited ' + o.name + '.');
      } else if (m.op === 'join') {
        const t = o.invites && o.invites.get(p.id);
        if (!t || t < now) { this.toast(p, 'That invite ran out.'); return; }
        o.invites.delete(p.id);
        if (!o.team) { o.team = { ids: new Set([o.id]) }; }
        if (o.team.ids.size >= MM.TEAM_MAX) { this.toast(p, 'That team is full.'); return; }
        this.leaveTeam(p);
        p.team = o.team; p.team.ids.add(p.id);
        this.teamChanged(p.team);
      }
    }
    leaveTeam(p) {
      const T = p.team;
      if (!T) return;
      T.ids.delete(p.id); p.team = null;
      this.priv(p, { k: 'team', ids: [] });
      if (T.ids.size === 1) { const last = this.players.get([...T.ids][0]); if (last) { last.team = null; this.priv(last, { k: 'team', ids: [] }); } T.ids.clear(); }
      else this.teamChanged(T);
    }
    teamChanged(T) {
      const ids = [...T.ids], names = ids.map(id => { const q = this.players.get(id); return q ? q.name + ' ' + q.home : '?'; });
      for (const id of ids) { const q = this.players.get(id); if (q) this.priv(q, { k: 'team', ids, names }); }
    }
    // Teammates within reach come along (doors, stations, ships). Portals don't need
    // this: anyone can walk through an open portal.
    bringTeam(p, from, ox, oz) {
      if (!p.team) return;
      for (const id of p.team.ids) {
        const q = this.players.get(id);
        if (!q || q === p || q.dead || q.inst !== from || q.aboard || dist2(q.x, q.z, ox, oz) > MM.TEAM_REACH * MM.TEAM_REACH) continue;
        if (q.ship) { q.ship = false; from.ev({ k: 'ship', id: q.id, on: false }); }
        from.ev({ k: 'kiosk', id: q.id });
        this.travel(q, p.inst.dimId, { x: p.x + (Math.random() - 0.5) * 4, z: p.z + (Math.random() - 0.5) * 4 }, p.inst);
        this.toast(q, p.name + ' took the team along.');
      }
    }

    // Walking through a door (into the garage, down to the lab, into the cellar, back out).
    onDoor(p, lid) {
      const l = MM.LANDMARK_BY_ID[lid];
      if (p.dead || !l || !l.door || l.dim !== p.inst.dimId || this.time < p.cdUse) return;
      if (dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 2) ** 2 || !MM.sameFloor(l, p.y)) return;
      p.cdUse = this.time + 1;
      if (p.ship && MM.DIM_BY_ID[l.door.dim].interior) { this.toast(p, 'Park your ship first (B).'); return; }
      // Rick's things answer to their own Rick only (any other Rick has to hack them first).
      if (this.labClosed(p, l)) return;
      if (l.tiny && !p.tiny) { this.toast(p, 'A whole tiny city, a few millimetres tall. You would need to be tiny to go in (a Miniaturizer, from Rick\'s workbench).'); return; }
      if (l.rick && !this.rickMay(p, this.earthOfHere(p))) { this.rickRefuse(p, l); return; }
      // Anatomy Park's gates: back out through that hole, into your ship (or, with no ship,
      // the park staff fling you home to Earth).
      if (l.bodyExit !== undefined) {
        p.cdUse = this.time + 1;
        const from = p.inst, space = p.anatomyFrom && MM.DIM_BY_ID[p.anatomyFrom] && MM.DIM_BY_ID[p.anatomyFrom].planets ? p.anatomyFrom : 'sp_c137';
        from.ev({ k: 'kiosk', id: p.id });
        if (p.st.ship) {
          const S = MM.DIM_BY_ID[space], P = S.planets.find(q => q.body), H = MM.BODY.holes[l.bodyExit];
          const w = P ? MM.bodyPoint(MM.BODY, H[2], [P.x, P.y, P.z]) : [0, 200, 0], c = P ? MM.bodyPoint(MM.BODY, [H[2][0], 0, 0], [P.x, P.y, P.z]) : [0, 0, 0];
          const dx = w[0] - c[0], dy = w[1] - c[1], dz = w[2] - c[2], dl = Math.hypot(dx, dy, dz) || 1;
          this.travel(p, space, { x: w[0] + dx / dl * 22, z: w[2] + dz / dl * 22, y: w[1] + dy / dl * 22 });
          p.cdOrbit = this.time + 4;
          this.toast(p, 'Out through ' + H[1].replace(/ \(.*\)/, '') + ', back in your ship.');
        } else {
          this.travel(p, 'suburbia', null);
          this.toast(p, 'No ship to fly out in: the park staff loaded you into a pneumatic tube and fired you back to Earth.');
        }
        return;
      }
      // Blast doors: the house's doors only open for whoever put them down (and their team).
      const Hs = p.inst.house;
      if (Hs && Hs.doors > this.time && ['home', 'backdoor', 'sidedoor', 'trapdoor'].some(a => MM.isAt(l, a)) && !this.houseAllows(p.inst, p)) { this.toast(p, 'Blast doors. Every door and window of the house is sealed.'); return; }
      if (p.arch === 'tommy' && l.dim === 'froopy') { this.toast(p, 'The way out will not open for you. Only a magic chalk door, drawn by a Rick (or Evil Morty), can take Tommy out of Froopyland.'); return; }
      const from = p.inst, ox = p.x, oz = p.z;
      // Every Earth shares the insides (the Smith house, Rick's lab...). Remember which Earth you
      // came in from, and the way out takes you back there instead of to C-137.
      const here = MM.DIM_BY_ID[from.dimId], to = MM.DIM_BY_ID[l.door.dim];
      let dest = l.door.dim;
      if (to.interior || to.pocket) { if (!(here.interior || here.pocket)) p.doorBack = here.variantOf ? from.dimId : null; }
      else if (p.doorBack && MM.DIM_BY_ID[p.doorBack].variantOf === dest) { dest = p.doorBack; p.doorBack = null; }
      if (here.earthOf && dest === 'suburbia') dest = here.earthOf;   // up from an Atlantis: its own Earth's beach
      p.inst.ev({ k: 'kiosk', id: p.id });
      this.travel(p, dest, l.door.y !== undefined ? { x: l.door.x, z: l.door.z, y: l.door.y } : { x: l.door.x, z: l.door.z });
      this.bringTeam(p, from, ox, oz);
    }

    // Portals need a portal gun: your own, or one you borrowed from Rick's workbench
    // (or took off someone you knocked out). Gold portals are the only way past the Curve.
    onPortal(p, d) {
      const now = this.time;
      if (MM.helpless(p.arch, p.prog.up)) { this.toast(p, MM.HELPLESS_TEXT); return; }
      if (p.dead || !MM.DIM_BY_ID[d]) return;
      const own = p.st.gun && p.charges > 0;
      if (!own && !(p.borrow > 0)) { this.toast(p, 'You need a portal gun. Build one, or borrow (steal) Rick\'s.'); return; }
      const why = MM.travelWhy('portal', p.inst.dimId, d, { gold: !!(own && p.st.gun.gold) });
      if (why) { this.toast(p, why); return; }
      if (own) { p.charges--; if (!p.chargeAt) p.chargeAt = now + p.st.gun.recharge; }
      else p.borrow--;
      const fx = Math.sin(p.r), fz = Math.cos(p.r);
      let x = p.x + fx * 3.2, z = p.z + fz * 3.2;
      [x, z] = MM.collideProps(p.inst.dimId, x, z, 1.2, null);
      this.openPortalPair(p.inst, x, z, p.r + Math.PI, d, own ? (p.st.gun.gold && MM.DIM_BY_ID[d].outsideCurve ? '#ffcc33' : p.look.portalColor) : '#39ff6a', p.id);
      this.dirty(p);
    }

    openPortalPair(inst, x, z, r, destDim, col, owner) {
      const now = this.time;
      const dest = this.instanceWithRoom(destDim, this.instances.get(destDim + '#' + inst.idx));
      const spot = MM.randomSpot(destDim, Math.random, 10, 70);
      const op = this.players.get(owner), st = op && op.look.portalStyle || 'swirl';
      const a = { id: this.ent(), x, y: MM.heightAt(inst.dimId, x, z), z, r, destDim, destKey: dest.key, col, st, owner, until: now + MM.PORTAL_TTL };
      const b = { id: this.ent(), x: spot.x, y: spot.y, z: spot.z, r: Math.random() * 6.28, destDim: inst.dimId, destKey: inst.key, col, st, owner, until: now + MM.PORTAL_TTL };
      a.link = b.id; b.link = a.id;
      inst.portals.set(a.id, a); dest.portals.set(b.id, b);
      inst.ev({ k: 'po+', po: inst.portalRow(a) });
      dest.ev({ k: 'po+', po: dest.portalRow(b) });
      return { a, b, dest };
    }

    // Portal stations: the Citadel's public portals and Federation customs. Pay the fee
    // (Ricks, Mortys and the Federation's own ride free) and step through.
    onKiosk(p, d) {
      const now = this.time, S = MM.DIM_BY_ID[p.inst.dimId].station;
      if (p.dead || !S || now < p.cdKiosk || !MM.DIM_BY_ID[d]) return;
      if (dist2(p.x, p.z, S.x, S.z) > MM.KIOSK_RADIUS * MM.KIOSK_RADIUS) return;
      const why = MM.travelWhy('station', p.inst.dimId, d, {});
      if (why) { this.toast(p, why); return; }
      const fee = S.free.includes(p.arch) ? {} : S.fee;
      for (const k in fee) if ((p.inv[k] || 0) < fee[k]) { this.toast(p, 'The ' + S.name + ' costs ' + fee[k] + ' ' + MM.MATERIALS[k].name + '.'); return; }
      for (const k in fee) p.inv[k] -= fee[k];
      p.cdKiosk = now + 3;
      const from = p.inst, ox = p.x, oz = p.z;
      p.inst.ev({ k: 'kiosk', id: p.id });
      this.travel(p, d, null);
      this.bringTeam(p, from, ox, oz);
      this.dirty(p);
    }

    // ----- Ship -----
    onShip(p, on) {
      if (!on && p.aboard) { this.disembark(p); return; }   // a passenger hops out
      if (on && MM.helpless(p.arch, p.prog.up)) { this.toast(p, MM.HELPLESS_TEXT); return; }
      if (p.dead || !p.st.ship || p.ship === on || p.aboard) return;
      if (on && p.car) { this.toast(p, 'Get out of the car first (B).'); return; }
      if (on && p.tiny) { this.toast(p, 'You are far too small to fly the ship. Grow back first.'); return; }
      if (on && p.inst.dim.interior) { this.toast(p, 'No room to fly in here. Take the ship outside.'); return; }
      if (!on && p.inst.dim.planets) { this.toast(p, 'Nowhere to park out here. Land on a planet first.'); return; }
      p.ship = on;
      p.kbUntil = this.time + 1;     // stepping out mid-air: let the fall happen
      if (on) this.takeShip(p, true); else this.parkShip(p, p.inst);
      p.inst.ev({ k: 'ship', id: p.id, on, sk: MM.shipKind(p.arch) });
      this.dirty(p);
    }

    // ----- Ships (MM.SHIPS): yours to fly, park, and fill with passengers -----
    vesselOf(p) {
      return p.vessel || (p.vessel = { id: this.ent(), owner: p.id, kind: MM.shipKind(p.arch), crew: new Map(), npcs: [], parked: false, inst: null, x: 0, y: 0, z: 0, r: 0, kss: null });
    }
    freeSeat(V) {
      const n = (MM.SHIPS[V.kind] || MM.SHIPS.saucer).seats.length, used = new Set([...V.crew.values(), ...V.npcs.map(c => c.seat)]);
      for (let i = 1; i < n; i++) if (!used.has(i)) return i;
      return 0;
    }
    shipRow(V) { const o = this.players.get(V.owner); return [V.id, V.owner, V.kind, r2(V.x), r2(V.y), r2(V.z), r2(V.r), o ? o.name : '', this.npcCrew(V), V.kss ? V.kss.mode : '']; }
    npcCrew(V) { return V.npcs.map(c => [c.arch, c.origin, c.seat, c.name]); }
    // Getting in: your parked ship, wherever it is (from far away it flies over to you).
    takeShip(p, announce) {
      const V = this.vesselOf(p);
      if (V.parked) {
        const far = V.inst !== p.inst || dist2(V.x, V.z, p.x, p.z) > 16 * 16;
        V.inst.parked.delete(V.id); V.inst.ev({ k: 'sp-', id: V.id });
        if (V.kss) this.kssEnd(V, 'Rick is back. Summer is safe.');
        V.parked = false;
        if (far && announce) this.toast(p, 'Your ' + MM.SHIPS[V.kind].name + ' flew over to you' + (V.crew.size || V.npcs.length ? ', with everyone still in it.' : '.'));
        for (const id of V.crew.keys()) { const q = this.players.get(id); if (q && q.inst !== p.inst) this.travel(q, p.inst.dimId, { x: p.x, z: p.z }, p.inst); }
      }
      V.inst = p.inst;
      if (V.npcs.length) p.inst.ev({ k: 'crew', id: p.id, l: this.npcCrew(V) });
      return V;
    }
    // Getting out: it stays where it is, with whoever is still in it.
    parkShip(p, inst) {
      const V = this.vesselOf(p);
      if (!inst || inst.dim.planets) { this.emptyShip(V, 'The ship flew off without you.'); return; }
      Object.assign(V, { parked: true, inst, x: p.x, y: Math.max(p.y, MM.heightAt(inst.dimId, p.x, p.z)), z: p.z, r: p.r, left: this.time });
      inst.parked.set(V.id, V);
      inst.ev({ k: 'sp+', v: this.shipRow(V) });
      // You climb out over the side.
      const side = MM.seatAt(V.kind, 0, V.x, V.y, V.z, V.r);
      p.x = side.x - Math.cos(V.r) * 2.2; p.z = side.z + Math.sin(V.r) * 2.2;
    }
    // Everybody out (the owner left, the ship crashed...). Locals walk off where they are.
    emptyShip(V, why) {
      for (const id of [...V.crew.keys()]) { const q = this.players.get(id); if (q) { this.disembark(q); if (why) this.toast(q, why); } else V.crew.delete(id); }
      const inst = V.inst || (this.players.get(V.owner) || {}).inst;
      for (const c of V.npcs.splice(0)) this.dropNpcCrew(V, c, inst);
      if (V.parked && V.inst) { V.inst.parked.delete(V.id); V.inst.ev({ k: 'sp-', id: V.id }); }
      V.parked = false; V.kss = null;
    }
    dropNpcCrew(V, c, inst) {
      const rec = c.rec;
      rec.riding = 0;
      if (!inst || inst.dim.interior || inst.dim.planets) { rec.at = rec.origin; rec.downUntil = this.time + 1; return; }   // home on her own
      const at = MM.seatAt(V.kind, c.seat, V.x, V.y, V.z, V.r), o = this.players.get(V.owner);
      const x = V.parked ? at.x + 2 : o ? o.x + 2 : at.x, z = V.parked ? at.z : o ? o.z : at.z;
      rec.at = inst.dimId;
      const n = inst.spawnCastNpc(rec, { x, z }, false);
      inst.ev({ k: 'npc+', n: inst.npcRow(n) });
    }
    // A passenger: in a free seat of someone's ship (flying or parked).
    board(q, V) {
      const seat = this.freeSeat(V);
      if (!seat) { this.toast(q, 'The ' + MM.SHIPS[V.kind].name + ' is full.'); return false; }
      if (q.ship) { q.ship = false; q.inst.ev({ k: 'ship', id: q.id, on: false }); }
      if (q.car) this.onCar(q, false);
      if (q.ride) this.endRide(q, false);
      q.aboard = V; V.crew.set(q.id, seat);
      q.inst.ev({ k: 'board', id: q.id, v: V.owner, s: seat, p: V.parked ? V.id : 0 });
      this.toast(q, 'You got in. Press B (or the ship button) to hop out.');
      this.dirty(q);
      return true;
    }
    disembark(q) {
      const V = q.aboard;
      if (!V) return;
      V.crew.delete(q.id); q.aboard = null;
      const o = this.players.get(V.owner), b = V.parked ? V : o || q;
      const at = MM.seatAt(V.kind, 0, b.x, b.y, b.z, b.r || 0);
      if (q.inst) {
        q.inst.ev({ k: 'board', id: q.id, v: 0 });
        this.teleport(q, at.x + Math.cos(b.r || 0) * 2.4, Math.max(MM.heightAt(q.inst.dimId, at.x, at.z), b.y), at.z - Math.sin(b.r || 0) * 2.4);
        q.kbUntil = this.time + 1.5;
      }
      if (V.kss && !this.summerIn(V)) this.kssEnd(V, 'Summer is out of the ship. Keep Summer safe: standing down.');
      this.dirty(q);
    }
    // Every tick: passengers sit in their seats, and go wherever the ship goes.
    tickAboard(q) {
      const V = q.aboard, o = this.players.get(V.owner);
      if (q.dead || !o || (!V.parked && !o.ship)) { this.disembark(q); return; }
      if (!V.parked && o.inst !== q.inst) { this.travel(q, o.inst.dimId, { x: o.x, z: o.z, y: o.y }, o.inst); }
      if (V.parked && V.inst !== q.inst) { this.disembark(q); return; }
      const b = V.parked ? V : o, at = MM.seatAt(V.kind, V.crew.get(q.id) || 1, b.x, b.y, b.z, b.r);
      q.x = at.x; q.y = at.y; q.z = at.z; q.r = b.r; q.a = MM.ANIM.sit; q.lastSt = this.time;
    }
    // Asking for a ride ('sb'): a teammate just gets in; anyone else asks the owner first.
    onBoard(p, m) {
      const o = this.players.get(m.id);
      if (m.op === 'yes') {   // p (the owner) lets in m.id, who asked
        const q = o; if (!q || !p.vessel || q.askedShip !== p.id) return;
        q.askedShip = 0;
        if (this.shipNear(q, p.vessel)) this.board(q, p.vessel); else this.toast(q, 'Too far from the ship now.');
        return;
      }
      if (m.op === 'drop') {   // the owner lets the locals out
        const V = p.vessel;
        if (!V || !V.npcs.length || !this.shipNear(p, V)) return;
        for (const c of V.npcs.splice(0)) this.dropNpcCrew(V, c, V.parked ? V.inst : p.inst);
        p.inst.ev(V.parked ? { k: 'sp+', v: this.shipRow(V) } : { k: 'crew', id: p.id, l: [] });
        if (V.kss && !this.summerIn(V)) this.kssEnd(V, 'Summer is out. Standing down.');
        return;
      }
      if (p.dead || p.aboard || !o || o === p || !o.vessel) return;
      const V = o.vessel;
      if (!(o.ship || V.parked)) { this.toast(p, o.name + ' has no ship out.'); return; }
      if (!this.shipNear(p, V)) { this.toast(p, 'Get closer to the ship.'); return; }
      if (p.team && p.team === o.team) { this.board(p, V); return; }
      if (o.bot && o.arch === 'genius' && p.arch === 'teen') { this.board(p, V); return; }   // bot Ricks always take their Summer along
      p.askedShip = o.id;
      this.priv(o, { k: 'sbask', id: p.id, name: p.name });
      this.toast(p, 'You asked ' + o.name + ' for a ride.');
    }
    shipNear(p, V, inst) {
      const o = this.players.get(V.owner), b = V.parked ? V : o, here = inst || p.inst;
      return !!b && (V.parked ? V.inst === here : o.inst === here) && dist2(b.x, b.z, p.x, p.z) < 9 * 9;
    }
    unrideCast(rec) {
      const o = this.players.get(rec.riding), V = o && o.vessel;
      rec.riding = 0;
      if (!V) return;
      V.npcs = V.npcs.filter(c => c.rec !== rec);
      const inst = V.parked ? V.inst : o.inst;
      if (inst) inst.ev(V.parked ? { k: 'sp+', v: this.shipRow(V) } : { k: 'crew', id: o.id, l: this.npcCrew(V) });
    }
    // A Rick can take the local Summer along on an adventure (if his ship is right there).
    takeNpcAlong(p, n, say) {
      const V = p.vessel;
      if (!p.st.ship) { say('You don\'t even have a ship, Grandpa.'); return; }
      if (!V || !(p.ship || V.parked) || !this.shipNear(n, V, p.inst)) { say('Bring the ship round, then we\'ll talk.'); return; }
      const seat = this.freeSeat(V);
      if (!seat) { say('It\'s full. Typical.'); return; }
      const rec = n.cast;
      p.inst.npcs.delete(n.id); p.inst.ev({ k: 'npc-', id: n.id });
      rec.npc = null; rec.riding = p.id;
      V.npcs.push({ arch: rec.arch, origin: rec.origin, seat, name: n.name, rec });
      say(pick(['Finally! An adventure!', 'Okay, but I\'m not doing anything gross.', 'Shotgun. Wait, it\'s just us. Still shotgun.']));
      p.inst.ev(V.parked ? { k: 'sp+', v: this.shipRow(V) } : { k: 'crew', id: p.id, l: this.npcCrew(V) });
    }

    // ----- Keep Summer Safe ("Mortynight Run") -----
    summerIn(V) { return V.npcs.some(c => c.arch === 'teen') || [...V.crew.keys()].some(id => { const q = this.players.get(id); return q && q.arch === 'teen'; }); }
    tickParked(V, now) {
      const inst = V.inst, o = this.players.get(V.owner);
      if (!o) { this.emptyShip(V, 'The ship\'s owner is gone. It flies itself home.'); return; }
      const ownerNear = o.inst === inst && !o.dead && dist2(o.x, o.z, V.x, V.z) < MM.KSS.leave * MM.KSS.leave;
      if (!V.kss) {
        // Only a Rick's ship, only with a Summer aboard, only once he has gone.
        if (o.arch === 'genius' && !ownerNear && this.summerIn(V)) this.kssStart(V);
        return;
      }
      if (ownerNear) { this.kssEnd(V, 'Rick is back. Summer is safe.'); return; }
      if (!this.summerIn(V)) { this.kssEnd(V); return; }
      if (now < (V.kss.next || 0)) return;
      V.kss.next = now + MM.KSS.every;
      // Anything coming at the ship: monsters from further off, anyone else who gets close.
      let best = null, bd = MM.KSS.reach * MM.KSS.reach, isNpc = true;
      let threat = false;   // monsters first; a local only if they come right up to it
      for (const n of inst.npcs.values()) {
        if ((n.owner === V.owner && n.ownerUntil > now) || (V.kss.spared && V.kss.spared.has(n.id)) || now < n.stun) continue;
        const d = dist2(n.x, n.z, V.x, V.z), hostile = !!(n.T.hostile || n.angry);
        if (hostile ? d < MM.KSS.reach * MM.KSS.reach && (!threat || d < bd) : !threat && d < 6 * 6 && d < bd) { bd = d; best = n; threat = threat || hostile; }
      }
      for (const q of inst.players.values()) {
        if (q === o || q.aboard === V || q.dead || !q.pvp || (o.team && q.team === o.team) || now < q.fx.prot) continue;
        const d = dist2(q.x, q.z, V.x, V.z);
        if (d < 10 * 10 && d < bd) { bd = d; best = q; isNpc = false; }
      }
      if (!best) return;
      const mode = V.kss.mode;
      inst.ev({ k: 'kssb', id: V.id, x: r2(best.x), y: r2(best.y + 1), z: r2(best.z), m: mode });
      if (mode === 'kill') { if (isNpc) inst.hurtNpc(best, 60, null); else this.hurtPlayer(inst, best, 35, null, 'kss'); }
      else if (mode === 'stun') {
        if (isNpc) { best.stun = now + 10; (V.kss.spared || (V.kss.spared = new Set())).add(best.id); }
        else { best.fx.cuff = Math.max(best.fx.cuff, now + 4); this.dirty(best); }
      } else {
        // Nobody gets hurt. They just leave, crying, or happy, or both.
        const dx = best.x - V.x, dz = best.z - V.z, l = Math.hypot(dx, dz) || 1;
        if (isNpc) { best.x = V.x + dx / l * 24; best.z = V.z + dz / l * 24; best.flee = now + 6; best.angry = 0; (V.kss.spared || (V.kss.spared = new Set())).add(best.id); }
        else { this.knock(best, dx / l * 16, 6, dz / l * 16); best.fx.daze = Math.max(best.fx.daze, now + 3); this.dirty(best); }
      }
      if (now > (V.kss.say || 0)) { V.kss.say = now + 7; this.kssSay(V, pick(MM.KSS.lines[mode])); }
    }
    kssSay(V, text) {
      V.inst.ev({ k: 'kss', id: V.id, text });
      for (const id of V.crew.keys()) { const q = this.players.get(id); if (q) this.priv(q, { k: 'kssay', text }); }
    }
    kssStart(V) {
      V.kss = { mode: 'kill', next: this.time + 1 };
      V.inst.ev({ k: 'sp+', v: this.shipRow(V) });
      this.kssSay(V, 'Keep. Summer. Safe.');
      for (const [id] of V.crew) { const q = this.players.get(id); if (q && q.arch === 'teen') this.priv(q, { k: 'kssmenu', mode: 'kill' }); }
      const o = this.players.get(V.owner);
      if (o) this.toast(o, 'You left Summer in the ship. It is keeping her safe. Very safe.');
    }
    kssEnd(V, text) {
      if (!V.kss) return;
      V.kss = null;
      if (text) this.kssSay(V, text);
      if (V.parked) V.inst.ev({ k: 'sp+', v: this.shipRow(V) });
      for (const id of V.crew.keys()) { const q = this.players.get(id); if (q) this.priv(q, { k: 'kssmenu', off: 1 }); }
    }
    // A Summer in the ship tells it how to keep her safe.
    onKss(p, m) {
      const V = p.aboard;
      if (!V || !V.kss || p.arch !== 'teen') return;
      V.kss.mode = m.m;
      this.kssSay(V, { kill: 'Keep Summer safe. By any means.', stun: 'Understood: do not kill anyone. Summer is safe.', peace: 'Understood: do not hurt anyone. Hm. Summer is safe.' }[m.m]);
      V.inst.ev({ k: 'sp+', v: this.shipRow(V) });
    }

    // Flying somewhere: the Moon is a short hop, other planets in this universe need
    // the Turbo Engine, and other dimensions need the Dimension Drive.
    onDrive(p, d) {
      const now = this.time;
      if (p.dead || !p.ship || !MM.DIM_BY_ID[d] || now < p.cdDrive) return;
      const sh = p.st.ship;
      const why = MM.travelWhy('ship', p.inst.dimId, d, { hull: true, engine: sh.engine, drive: sh.drive });
      if (why) { this.toast(p, why); return; }
      p.cdDrive = now + 15;
      const from = p.inst, ox = p.x, oz = p.z;
      p.inst.ev({ k: 'warp', id: p.id });
      this.travel(p, d, null);
      this.bringTeam(p, from, ox, oz);   // teammates near the ship ride along as passengers
    }

    // Out of the atmosphere: into the space around this world, above its planet.
    onOrbit(p) {
      const D = p.inst.dim, now = this.time;
      if (p.dead || !p.ship || D.interior || D.planets || now < (p.cdOrbit || 0)) return;
      if (p.y - MM.heightAt(p.inst.dimId, p.x, p.z) < MM.ORBIT_ALT - 40) return;
      p.cdOrbit = now + 3;
      // Realms (a dream, the Story Train, beyond the Curve...) are not planets: no space above them.
      const W = MM.WORLD_BY_ID[MM.worldOf(p.inst.dimId)];
      if (W && W.realm) { this.toast(p, D.name + ' is not a planet: there is no space above it. Use a portal.'); return; }
      const S = MM.spaceDimOf(p.inst.dimId), P = S.planets.find(q => q.dim === p.inst.dimId) || S.planets[0];
      const from = p.inst, ox = p.x, oz = p.z;
      p.inst.ev({ k: 'warp', id: p.id });
      this.travel(p, S.id, { x: P.x + (Math.random() - 0.5) * 20, z: P.z + (Math.random() - 0.5) * 20, y: P.y + P.r + 30 });
      p.kbUntil = this.time + 1.5;
      this.bringTeam(p, from, ox, oz);
      this.toast(p, 'You left the atmosphere. Fly into a planet to land on it.');
    }
    // Fly into a planet from space: land in its sky. Earth and its moon only need the ship;
    // the other planets of the universe need the Turbo Engine (as for flying there directly).
    onLand(p, d, h) {
      const S = p.inst.dim, now = this.time;
      if (p.dead || !p.ship || !S.planets || now < (p.cdOrbit || 0)) return;
      // Anatomy Park: fly into one of the floating corpse's holes.
      if (d === 'anatomy') {
        const P = S.planets.find(q => q.body), H = P && MM.BODY.holes[h];
        if (!H) return;
        const w = MM.bodyPoint(MM.BODY, H[2], [P.x, P.y, P.z]);
        if (Math.hypot(p.x - w[0], p.y - w[1], p.z - w[2]) > 14 * (MM.BODY.scale || 1)) return;
        p.cdOrbit = now + 3;
        const g = MM.bodyGate(h), from = p.inst;
        p.anatomyFrom = from.dimId;
        p.inst.ev({ k: 'warp', id: p.id });
        p.ship = false; p.inst.ev({ k: 'ship', id: p.id, on: false });
        this.emptyShip(this.vesselOf(p), 'Everybody out: this is Anatomy Park.');
        this.travel(p, 'anatomy', { x: g.x * 0.93, z: g.z * 0.93 });
        this.toast(p, 'In through ' + H[1].replace(/ \(.*\)/, '').replace(/^The /, 'the ') + '. Welcome to Anatomy Park! Your ship is parked at the gate.');
        return;
      }
      const P = S.planets.find(q => q.dim === d);
      if (!P || Math.hypot(p.x - P.x, p.y - P.y, p.z - P.z) > P.r + 70) return;
      // Any planet you can see from here is in your universe: the near ones (the Moon, the
      // solar system) need only the ship, the far ones across the galaxy the Turbo Engine.
      const home = S.planets[0].dim, sh = p.st.ship, H = MM.DIM_BY_ID[home], B = MM.DIM_BY_ID[d];
      const near = (H.near || H.variantOf === 'suburbia' || H.solar) && (B.near || B.shapeOf === 'moon');
      const why = d === home || near || sh.engine ? '' : 'Your ship needs a Turbo Engine to cross the galaxy.';
      if (why) { p.cdOrbit = now + 2; this.toast(p, why); return; }
      p.cdOrbit = now + 3;
      const sp = MM.spawnPoint(d), from = p.inst, ox = p.x, oz = p.z;
      p.inst.ev({ k: 'warp', id: p.id });
      this.travel(p, d, { x: sp.x, z: sp.z, y: MM.heightAt(d, sp.x, sp.z) + 180 });
      p.kbUntil = this.time + 1.5;
      this.bringTeam(p, from, ox, oz);
      this.toast(p, 'Coming in to land on ' + MM.DIM_BY_ID[d].name + '. Shift to go down, B to step out on the ground.');
    }

    // Lightspeed, from space: to the space around another world, dimension or timeline, with
    // the planet ahead of you. Land by flying into it.
    onLight(p, d) {
      const S = p.inst.dim, now = this.time;
      if (p.dead || !p.ship || !S.planets || !MM.DIM_BY_ID[d] || now < (p.cdLight || 0)) return;
      const sh = p.st.ship;
      const why = MM.travelWhy('light', p.inst.dimId, d, { engine: sh.engine, drive: sh.drive, quantum: sh.quantum });
      if (why) { this.toast(p, why); return; }
      p.cdLight = now + (sh.quantum ? 4 : 10);
      const T = MM.spaceDimOf(d), P = T.planets.find(q => q.dim === d) || T.planets[0];
      const from = p.inst, ox = p.x, oz = p.z;
      p.inst.ev({ k: 'warp', id: p.id });
      this.travel(p, T.id, { x: P.x + P.r + 70, z: P.z, y: P.y + 25 });
      p.kbUntil = this.time + 1.5;
      this.bringTeam(p, from, ox, oz);
      this.toast(p, 'Lightspeed! ' + MM.DIM_BY_ID[d].name + ' is dead ahead. Fly into it to land.');
    }

    // Ring races (shared/races.js): started at the start pad (raceLobby), then each ring in
    // order; the last one before time runs out pays (once every MM.RACE_CD seconds).
    raceStep(p) {
      const now = this.time, list = MM.racesIn(p.inst.dimId);
      const near = (R, i) => { const q = MM.ringAt(R, i, p.inst.dimId); return (p.x - q.x) ** 2 + (p.y + 1 - q.y) ** 2 + (p.z - q.z) ** 2 < R.r * R.r; };
      const fits = R => !p.dead && (R.ship ? p.ship : !p.ship);
      if (p.race) {
        const R = MM.RACE_BY_ID[p.race.id];
        if (!list.includes(R) || !fits(R)) { p.race = null; this.priv(p, { k: 'race', id: null }); this.toast(p, R.name + ': you left the race.'); return; }
        if (now > p.race.t0 + R.time) { p.race = null; this.priv(p, { k: 'race', id: null }); this.toast(p, R.name + ': out of time. Meet at the start pad to race again.'); return; }
        if (!near(R, p.race.next)) return;
        p.race.next++;
        if (p.race.next < R.rings.length) { this.priv(p, { k: 'race', id: R.id, next: p.race.next, left: r2(p.race.t0 + R.time - now) }); return; }
        const t = Math.round((now - p.race.t0) * 10) / 10, best = (p.prog.best || (p.prog.best = {}))[R.id], wall = this.wall();
        const session = p.race.session;
        p.race = null;
        if (!best || t < best) p.prog.best[R.id] = t;
        const place = ++session.place, paid = (p.prog.tasks['race_' + R.id] || 0) <= wall;
        const give = {};
        for (const k in R.give) give[k] = R.give[k] * (place === 1 ? 2 : 1);   // the winner takes double
        if (paid) { p.prog.tasks['race_' + R.id] = wall + MM.RACE_CD * 1000; for (const k in give) p.inv[k] = (p.inv[k] || 0) + give[k]; }
        this.priv(p, { k: 'race', id: null, done: R.id, t, place, of: session.n, best: p.prog.best[R.id], record: !best || t < best, give: paid ? give : null });
        this.dirty(p);
        return;
      }
    }
    // Races need rivals: two or more people (not bots) standing at a race's start pad together
    // for three seconds start it for all of them. Nobody racing: no rings.
    raceLobby() {
      const now = this.time;
      for (const inst of this.instances.values()) {
        const humans = [...inst.players.values()].filter(p => !p.bot && !p.dead && !p.race);
        inst.lobby = inst.lobby || {};
        if (humans.length < 2) { inst.lobby = {}; continue; }
        for (const R of MM.racesIn(inst.dimId)) {
          const q = MM.ringAt(R, 0, inst.dimId);
          const here = humans.filter(p => (R.ship ? p.ship : !p.ship) && (p.x - q.x) ** 2 + (p.z - q.z) ** 2 < (R.r + 3) ** 2 && Math.abs(p.y + 1 - q.y) < R.r + 3);
          if (here.length < 2) { delete inst.lobby[R.id]; continue; }
          const L = inst.lobby[R.id];
          if (!L) { inst.lobby[R.id] = { since: now }; for (const p of here) this.toast(p, R.name + ': ' + here.length + ' racers. Starting in 3...'); continue; }
          if (now - L.since < 3) continue;
          delete inst.lobby[R.id];
          const session = { id: R.id, n: here.length, place: 0 };
          for (const p of here) { p.race = { id: R.id, t0: now, next: 1, session }; this.priv(p, { k: 'race', id: R.id, next: 1, left: R.time, rivals: here.length }); }
        }
      }
    }

    // ----- Crafting -----
    // Recipes are checked here, not on the client: lore, path unlocks, cost, and place.
    onCraft(p, id) {
      const R = MM.RECIPES[id];
      if (p.dead || !R) return;
      if (MM.helpless(p.arch, p.prog.up) && id !== 'ratsuit') { this.toast(p, MM.HELPLESS_TEXT); return; }
      const why = MM.canKnow(p.arch, p.prog, id);
      if (why) { this.toast(p, why); return; }
      if (R.at) {
        const l = MM.LANDMARK_BY_ID[R.at];
        const here = MM.LANDMARKS.some(x => MM.isAt(x, R.at) && x.dim === p.inst.dimId && dist2(x.x, x.z, p.x, p.z) <= (x.r + MM.USE_RADIUS + 2) ** 2 && MM.sameFloor(x, p.y));
        if (!here) { this.toast(p, 'Build this at the ' + l.name + ' in ' + MM.DIM_BY_ID[l.dim].name + '.'); return; }
      }
      const cost = MM.recipeCost(p.arch, id);
      for (const k in cost) if ((p.inv[k] || 0) < cost[k]) { this.toast(p, 'Not enough ' + MM.MATERIALS[k].name + '.'); return; }
      if (R.cat === 'item') {
        const key = 'q:' + R.curio;
        if ((p.inv[key] || 0) >= R.max) { this.toast(p, 'You already have ' + (R.max > 1 ? R.max + ' of those.' : 'one.')); return; }
        p.inv[key] = (p.inv[key] || 0) + 1;
        const found = p.prog.found || (p.prog.found = []);
        if (!found.includes(R.curio)) found.push(R.curio);
        p.progDirty = true;
        this.dirty(p);
      } else if (R.cat === 'gadget') {
        if (id === 'fluid') { if (!p.st.gun || p.charges >= p.st.gun.charges) return; p.charges++; if (p.charges >= p.st.gun.charges) p.chargeAt = 0; }
        else { if ((p.inv[id] || 0) >= R.max) return; p.inv[id] = (p.inv[id] || 0) + 1; }
      } else {
        p.prog.up[id] = 1;
        this.restat(p);
        if (id === 'gunbuild') { p.charges = p.st.gun.charges; this.toast(p, 'You built a portal gun! Press E to use it.'); }
        if (id === 'hull') this.toast(p, 'Your ship is ready. Press B to board it.');
        if (['wings', 'jetpack', 'engine', 'lasers', 'hull', 'cyberarm', 'cyberlegs', 'ratsuit'].includes(id)) p.inst.ev({ k: 'gear', id: p.id, gear: this.info(p).gear });
      }
      for (const k in cost) p.inv[k] -= cost[k];
      this.priv(p, { k: 'built', r: id });
      this.progress(p, 'craft', id);
    }

    // ----- The portal pair (Valve style, inside one world) -----
    onPair(p, m) {
      const now = this.time;
      if (p.dead || p.ship || now < (p.cdPair || 0)) return;
      if (!MM.canPair(p.arch, p.prog.up)) { this.toast(p, MM.helpless(p.arch, p.prog.up) ? MM.HELPLESS_TEXT : 'You need a portal gun for that.'); return; }
      if (dist2(m.x, m.z, p.x, p.z) > (MM.PAIR_RANGE + 10) ** 2 || Math.abs(m.y - p.y) > MM.PAIR_RANGE) return;
      const l = Math.hypot(m.nx, m.ny, m.nz) || 1;
      p.cdPair = now + 0.2;
      const P = { x: r2(m.x), y: r2(m.y), z: r2(m.z), nx: r2(m.nx / l), ny: r2(m.ny / l), nz: r2(m.nz / l) };
      (p.pp || (p.pp = [null, null]))[m.c] = P;
      p.inst.ev(Object.assign({ k: 'pp', o: p.id, c: m.c }, P));
    }
    // Someone stepped into a portal of the pair owned by m.o: out of the other one.
    onPairTransit(p, m) {
      const now = this.time, o = this.players.get(m.o);
      if (p.dead || !o || o.inst !== p.inst || !o.pp || now < (p.cdTransit || 0)) return;
      const A = o.pp[m.c], B = o.pp[1 - m.c];
      if (!A || !B || dist2(A.x, A.z, p.x, p.z) > 4.5 * 4.5 || Math.abs(A.y - p.y) > 4) return;
      const ex = MM.pairExit(B, MM.PAIR_MAX_SPEED);
      p.x = ex.x; p.y = ex.y; p.z = ex.z; p.lastSt = now;
      p.kbUntil = now + 2.5;            // flung out at speed: the movement check lets it play out
      p.flingUntil = now + 6;           // and you may be high up (a portal on a tower wall)
      p.cdTransit = now + 0.3;
      p.inst.ev({ k: 'pt', id: p.id, o: o.id, c: m.c });
    }

    // Use a curio from your inventory. Food and potions are used up; keepsakes just talk back.
    onCurio(p, id) {
      const Q = MM.CURIOS[id], key = 'q:' + id, now = this.time, inst = p.inst;
      if (p.dead || !(p.inv[key] > 0) || now < (p.cdCurio || 0)) return;
      p.cdCurio = now + 1;
      const text = this.curioEffect(p, Q, p);
      if (text === null) return;
      if (Q.eat) p.inv[key]--;
      if (!p.inv[key]) delete p.inv[key];
      inst.ev({ k: 'curio', id: p.id, q: id });
      this.toast(p, Q.icon + ' ' + text);
      this.dirty(p);
    }
    // What a curio does to someone (p), used by them or by someone else (by). Returns the text
    // they see, or null if it did nothing (and is not used up).
    curioEffect(p, Q, by) {
      const now = this.time, inst = p.inst, other = by !== p;
      let text = Q.text;
      switch (Q.use) {
        case 'armserum':
          if (p.arch !== 'sidekick') { this.toast(by, 'Nothing happens. It only works on a Morty.'); return null; }
          if (p.prog.arm) { this.toast(by, 'That arm already has somebody in it.'); return null; }
          this.armUp(p);
          text = other ? by.name + ' gave you the Muscle Memory Serum. Your arm is hers now.' : 'You injected the serum. Your arm is hers now.';
          break;
        case 'tiny':
          if (inst.dim.tinyWorld || p.tinyIn) { this.toast(by, 'Everything here is already tiny-sized. Walk out first.'); return null; }
          if (!p.tiny && (p.car || p.ship || p.ride)) { this.toast(by, 'Not while driving, flying or riding.'); return null; }
          p.tiny = !p.tiny;
          inst.ev({ k: 'tiny', id: p.id, on: p.tiny });
          text = p.tiny ? 'ZZZT. You are the size of a bug. Everything is enormous. (Use it again to grow back.)' : 'You grow back to your normal size.';
          break;
        case 'feast': p.hp = p.maxHp; p.fx.sprint = now + 15; break;
        case 'speed': p.fx.sprint = now + 15; break;
        case 'fate': p.fx.prot = now + 8; break;
        case 'heal': p.hp = p.maxHp; break;
        case 'snack': p.hp = Math.min(p.maxHp, p.hp + 30); break;
        case 'trip': p.hp = p.maxHp; p.fx.daze = now + 6; break;
        case 'shield': p.fx.shield = now + 10; break;
        case 'rage': p.fx.sprint = now + 12; p.fx.shield = now + 12; break;
        case 'cash': p.inv.k = (p.inv.k || 0) + 5; break;
        case 'charge':
          if (p.st.gun) { p.charges = Math.min(p.st.gun.charges, p.charges + 1); if (p.charges >= p.st.gun.charges) p.chargeAt = 0; }
          else p.borrow = (p.borrow || 0) + 1;
          break;
        case 'love': {
          let k = 0;
          for (const n of inst.npcs.values()) if (n.T.human && !n.T.hostile && !n.T.guard && dist2(n.x, n.z, p.x, p.z) < 16 * 16 && k < 6) {
            n.owner = p.id; n.ownerUntil = now + 30; n.angry = 0; k++;
            inst.ev({ k: 'say', n: n.id, by: p.id, text: pick(['I would follow you anywhere.', 'You are... perfect.', 'Marry me. Or at least let me walk behind you.']) });
          }
          if (!k) text = 'Nobody is around to fall in love with you. Probably for the best.';
          break;
        }
        case 'vision': case 'truth': case 'channel': text = pick(MM.CURIO_LINES[Q.use]); break;
      }
      this.dirty(p);
      return text;
    }

    // ----- Between players: trading, giving, using things on each other -----
    near(p, q) { return !!q && q !== p && !q.dead && !p.dead && q.inst === p.inst && dist2(p.x, p.z, q.x, q.z) < MM.TRADE_RANGE ** 2; }
    // Only what you really have, in whole numbers.
    haveItems(p, raw) {
      const out = {};
      for (const k in raw || {}) { const n = Math.min(Math.floor(raw[k]) || 0, p.inv[k] || 0); if (n > 0 && MM.tradeable(k)) out[k] = n; }
      return out;
    }
    handOver(from, to, g) {
      for (const k in g) {
        from.inv[k] -= g[k];
        if (!from.inv[k] && k.startsWith('q:')) delete from.inv[k];
        to.inv[k] = (to.inv[k] || 0) + g[k];
        if (k.startsWith('q:')) { const found = to.prog.found || (to.prog.found = []); if (!found.includes(k.slice(2))) found.push(k.slice(2)); to.progDirty = true; }
      }
      this.dirty(from); this.dirty(to);
    }
    // A trade: both put things in, both say OK, and only then does anything change hands.
    // Changing your side un-OKs both; moving apart or leaving cancels it.
    onTrade(p, m) {
      const now = this.time;
      if (m.op === 'ask') {
        const q = this.players.get(m.id);
        if (!this.near(p, q) || q.bot) { this.toast(p, 'Get closer to them first.'); return; }
        if (p.trade || q.trade) { this.toast(p, (p.trade ? 'You are' : q.name + ' is') + ' already trading.'); return; }
        if (now < (p.cdAsk || 0)) return;
        p.cdAsk = now + 3;
        q.tradeAsk = { from: p.id, until: now + 20 };
        this.priv(q, { k: 'trask', id: p.id, name: p.name });
        this.toast(p, 'You asked ' + q.name + ' to trade.');
        return;
      }
      if (m.op === 'join') {
        const q = this.players.get(m.id), A = p.tradeAsk;
        p.tradeAsk = null;
        if (!A || A.from !== m.id || now > A.until || !this.near(p, q) || p.trade || q.trade) return;
        const T = { a: q, b: p, give: new Map([[q.id, {}], [p.id, {}]]), ok: new Set() };
        p.trade = q.trade = T;
        this.tradeState(T);
        return;
      }
      const T = p.trade;
      if (!T) return;
      if (m.op === 'cancel') { this.tradeEnd(T, p.name + ' called off the trade.'); return; }
      if (m.op === 'set') { T.give.set(p.id, this.haveItems(p, m.items)); T.ok.clear(); this.tradeState(T); return; }
      if (m.op === 'ok') {
        T.ok.add(p.id);
        if (T.ok.size < 2) { this.tradeState(T); return; }
        const { a, b } = T;
        if (!this.near(a, b)) { this.tradeEnd(T, 'You moved too far apart.'); return; }
        // Check both sides again (someone may have used something since).
        const ga = this.haveItems(a, T.give.get(a.id)), gb = this.haveItems(b, T.give.get(b.id));
        if (JSON.stringify(ga) !== JSON.stringify(T.give.get(a.id)) || JSON.stringify(gb) !== JSON.stringify(T.give.get(b.id))) { T.give.set(a.id, ga); T.give.set(b.id, gb); T.ok.clear(); this.tradeState(T); return; }
        this.handOver(a, b, ga);
        this.handOver(b, a, gb);
        this.tradeEnd(T, '', true);
      }
    }
    tradeState(T) {
      const row = { k: 'trade', a: T.a.id, b: T.b.id, an: T.a.name, bn: T.b.name, ga: T.give.get(T.a.id), gb: T.give.get(T.b.id), ok: [...T.ok] };
      this.priv(T.a, row); this.priv(T.b, row);
    }
    tradeEnd(T, why, done) {
      T.a.trade = T.b.trade = null;
      for (const x of [T.a, T.b]) this.priv(x, { k: 'trade', end: 1, why: why || '', done: done ? 1 : 0 });
    }
    // A gift: it's theirs straight away.
    onGive(p, m) {
      const q = this.players.get(m.id), now = this.time;
      if (!this.near(p, q) || now < (p.cdGive || 0)) { if (!this.near(p, q)) this.toast(p, 'Get closer to them first.'); return; }
      const g = this.haveItems(p, m.items);
      const what = Object.keys(g).map(k => g[k] + ' ' + MM.itemName(k)).join(', ');
      if (!what) return;
      p.cdGive = now + 0.8;
      this.handOver(p, q, g);
      this.toast(p, 'You gave ' + q.name + ' ' + what + '.');
      this.toast(q, p.name + ' gave you ' + what + '.');
      p.inst.ev({ k: 'gift', id: p.id, to: q.id });
    }
    // Use one of your curios on someone: a snack for a friend straight away; something nasty
    // only if you both fight; a transformation only if they say yes.
    onUseOn(p, m) {
      const q = this.players.get(m.id), Q = MM.CURIOS[m.q], key = 'q:' + m.q, now = this.time;
      if (!Q || !Q.on || !(p.inv[key] > 0) || now < (p.cdCurio || 0)) return;
      if (!this.near(p, q)) { this.toast(p, 'Get closer to them first.'); return; }
      p.cdCurio = now + 1;
      if (Q.on === 'ask') {
        q.offer = { ask: m.q, from: p.id, want: {}, get: {}, until: now + 25 };
        this.priv(q, { k: 'offer', ask: m.q, name: p.name, want: {}, get: {} });
        this.toast(p, 'You offered ' + q.name + ' the ' + Q.name + '. They have to say yes.');
        return;
      }
      if (Q.on === 'hurt' && !this.canHurt(p, q)) { this.toast(p, q.name + ' has fights off.'); return; }
      this.useOnNow(p, q, m.q);
    }
    useOnNow(p, q, id) {
      const Q = MM.CURIOS[id], key = 'q:' + id;
      const text = this.curioEffect(q, Q, p);
      if (text === null) return;
      if (Q.eat) { p.inv[key]--; if (!p.inv[key]) delete p.inv[key]; }
      p.inst.ev({ k: 'curio', id: q.id, q: id });
      this.toast(q, Q.icon + ' ' + (Q.on === 'ask' ? text : p.name + ' used the ' + Q.name + ' on you. ' + text));
      this.toast(p, 'You used the ' + Q.name + ' on ' + q.name + '.');
      this.dirty(p);
    }

    onGadget(p, m) {
      if (MM.helpless(p.arch, p.prog.up)) { this.toast(p, MM.HELPLESS_TEXT); return; }
      const inst = p.inst, g = m.g;
      if (p.dead || p.ship || this.time < p.fx.sob || !(p.inv[g] > 0)) return;
      if (g === 'grenade') {
        this.fireProjectile(inst, { owner: p.id, kind: 'gren', x: p.x + m.dx, y: p.y + 1.5, z: p.z + m.dz, dx: m.dx, dy: m.dy, dz: m.dz, speed: 20, up: 6, gravity: true, life: 1.8, dmg: 0, rad: 0.3 });
      } else if (g === 'shrink') {
        this.fireProjectile(inst, { owner: p.id, kind: 'shrink', x: p.x + m.dx * 0.7, y: p.y + 1.35 + m.dy * 0.7, z: p.z + m.dz * 0.7, dx: m.dx, dy: m.dy, dz: m.dz, speed: 65, range: 70, dmg: 5, rad: 0.35 });
      } else if (g === 'freeze') {
        this.fireProjectile(inst, { owner: p.id, kind: 'freeze', x: p.x + m.dx * 0.7, y: p.y + 1.35 + m.dy * 0.7, z: p.z + m.dz * 0.7, dx: m.dx, dy: m.dy, dz: m.dz, speed: 55, range: 60, dmg: 4, rad: 0.4 });
      } else if (g === 'chalk') {
        // A door drawn in magic chalk: into Froopyland, or (there) back to where you came from.
        if (inst.dim.interior || inst.dim.planets || inst.dim.hidden) { this.toast(p, 'Nowhere to draw a door here. Go outside.'); return; }
        const out = inst.dimId === 'froopy', dest = out ? (p.chalkFrom && MM.DIM_BY_ID[p.chalkFrom] ? p.chalkFrom : 'suburbia') : 'froopy';
        if (!out) p.chalkFrom = inst.dimId;
        let x = p.x + Math.sin(p.r) * 3, z = p.z + Math.cos(p.r) * 3;
        [x, z] = MM.collideProps(inst.dimId, x, z, 1.2, null);
        const pair = this.openPortalPair(inst, x, z, p.r + Math.PI, dest, '#f4f4f0', p.id);
        pair.a.chalk = pair.b.chalk = true; pair.a.st = pair.b.st = 'ring';
        this.toast(p, out ? 'A chalk door out of Froopyland. Anyone can go through it, even Tommy.' : 'A chalk door into Froopyland. Anyone can follow you.');
      } else if (g === 'meeseeks') {
        this.summonMeeseeks(p, 1, 30);
      } else if (g === 'timecrystal') {
        // Everything near you stops. Then a Time Cop shows up, very annoyed, to take you in.
        const now = this.time;
        for (const o of inst.players.values()) if (o !== p && !o.dead && dist2(o.x, o.z, p.x, p.z) < 14 * 14 && this.canHurt(p, o)) { o.fx.cuff = now + 4; this.dirty(o); }
        for (const n of inst.npcs.values()) if (dist2(n.x, n.z, p.x, p.z) < 14 * 14) n.stun = now + 4;
        inst.ev({ k: 'timestop', id: p.id });
        this.later(2.5, () => {
          if (this.players.get(p.id) !== p || p.inst !== inst || p.dead) return;
          let x = p.x + Math.sin(p.r + 2.5) * 5, z = p.z + Math.cos(p.r + 2.5) * 5;
          [x, z] = MM.collideProps(inst.dimId, x, z, 0.8, null);
          const n = inst.spawnNpc('timecop', true, { at: { x, z }, until: now + 70 });
          n.angry = p.id; n.angryUntil = now + 65;
          inst.ev({ k: 'say', n: n.id, by: p.id, text: pick(['Freezing time? You? You third-dimensional ass!', 'Time Cops! You are under arrest for messing with time.', 'Time Prison. Forever. Let us go.']) });
          this.toast(p, 'A Time Cop is after you. Run, or fight a fourth-dimensional being.');
        });
      } else if (g === 'turret') {
        let mine = 0;
        for (const t of inst.turrets.values()) if (t.owner === p.id) mine++;
        if (mine >= 2) return;
        let x = p.x + Math.sin(p.r) * 2.5, z = p.z + Math.cos(p.r) * 2.5;
        [x, z] = MM.collideProps(inst.dimId, x, z, 0.8, null);
        const t = { id: this.ent(), owner: p.id, x, y: MM.heightAt(inst.dimId, x, z), z, hp: 40, until: this.time + 45, cd: this.time + 1, aim: p.r };
        inst.turrets.set(t.id, t);
        inst.ev({ k: 'tu+', t: [t.id, t.owner, r2(t.x), r2(t.y), r2(t.z)] });
      } else return;
      p.inv[g]--;
      p.fx.prot = 0;
      this.dirty(p);
    }

    // ----- Death Stalker cars (Post-Apocalyptic Earth) -----
    // Get in at the car lot, out anywhere (B or F). It is parked when you travel or die.
    onCar(p, on) {
      if (p.dead || !!p.car === on) return;
      if (on) {
        const l = MM.LANDMARKS.find(q => q.dim === p.inst.dimId && q.car);
        if (!l || p.ship || p.ride || MM.helpless(p.arch, p.prog.up) || dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 2) ** 2) return;
        if (p.bout) { this.toast(p, 'No cars in the Ring of Death.'); return; }
        if (p.tiny) { this.toast(p, 'You can\'t reach the pedals. Grow back first.'); return; }
      }
      p.car = on;
      p.inst.ev({ k: 'car', id: p.id, on });
      this.toast(p, on ? 'Keys in. W/S to drive, A/D to steer, Shift for nitro. The hood guns fire where you aim, and ramming hurts. B or F to get out.' : 'You parked the car.');
      this.dirty(p);
    }
    // A car going fast hurts and throws whatever it runs into: people (who fight), monsters, junk.
    carRam(p, ox, oz, dt) {
      const vx = (p.x - ox) / dt, vz = (p.z - oz) / dt, sp = Math.hypot(vx, vz);
      if (sp < MM.CAR.ramMin) return;
      const inst = p.inst, now = this.time, dmg = Math.round(sp * MM.CAR.ram * this.dmgMult(p)), fx = vx / sp, fz = vz / sp;
      const hits = p.rams && Object.keys(p.rams).length < 60 ? p.rams : (p.rams = {});
      const ahead = (x, z, r) => { const dx = x - p.x, dz = z - p.z; return Math.hypot(dx, dz) < 2.2 + r && dx * fx + dz * fz > -0.5; };
      for (const o of [...inst.players.values()]) {
        if (o === p || o.dead || !this.canHurt(p, o) || Math.abs(o.y - p.y) > 2 || (hits['p' + o.id] || 0) > now || !ahead(o.x, o.z, 0.5)) continue;
        hits['p' + o.id] = now + 0.8;
        this.hurtPlayer(inst, o, dmg, p, 'car');
        if (!o.dead && !o.ship) this.knock(o, fx * sp * 0.7, 6, fz * sp * 0.7);
      }
      for (const n of [...inst.npcs.values()]) {
        if ((n.owner === p.id && n.ownerUntil > now) || Math.abs(n.y - p.y) > 3 || (hits['n' + n.id] || 0) > now || !ahead(n.x, n.z, n.T.r)) continue;
        hits['n' + n.id] = now + 0.8;
        inst.hurtNpc(n, dmg, p);
      }
      for (const pr of MM.propsNear(inst.dimId, p.x, p.z, 5)) {
        if (inst.props[pr.id].hp <= 0 || MM.PROPS[pr.type].fixed || (hits['r' + pr.id] || 0) > now || !ahead(pr.x, pr.z, pr.r)) continue;
        hits['r' + pr.id] = now + 0.8;
        inst.hurtProp(pr.id, dmg, p);
      }
    }

    // ----- Strong-arm Morty: the Muscle Memory Serum (MM.ARM) -----
    armUp(p) {
      p.prog.arm = { n: 0 };
      p.progDirty = true;
      p.inst.ev({ k: 'gear', id: p.id, gear: this.info(p).gear });
      this.priv(p, { k: 'arm', on: 1 });
      this.dirty(p);
    }
    // Her bounties are in Post-Apocalyptic Earth, one at a time, far out in the sand.
    tickArm(p, now) {
      if (now < (p.armT || 0)) return;
      p.armT = now + 1;
      const A = p.prog.arm, inst = p.inst;
      if (inst.dimId !== MM.ARM.dim) {
        if (now > (p.armNag || 0)) { p.armNag = now + 120; this.priv(p, { k: 'armsay', text: 'The arm keeps pointing somewhere. She wants to go back to Post-Apocalyptic Earth.' }); }
        return;
      }
      if (p.armTarget && p.armTarget.inst === inst && inst.npcs.has(p.armTarget.id)) {
        if (now > (p.armNag || 0)) { p.armNag = now + 50 + Math.random() * 40; this.priv(p, { k: 'armsay', text: pick(MM.ARM.say) }); }
        return;
      }
      const i = A.n, last = i >= MM.ARM.bounties.length, def = last ? MM.ARM.killer : MM.ARM.bounties[i];
      const at = MM.randomSpot(inst.dimId, Math.random, 70, 150);
      const n = inst.spawnNpc(last ? 'armkiller' : 'bounty', false, { at, until: now + 1500 });
      n.name = def.name; n.armFor = p.id; n.armI = i; n.home = { x: n.x, z: n.z, y: n.y };
      inst.ev({ k: 'npc+', n: inst.npcRow(n) });
      p.armTarget = { inst, id: n.id };
      this.priv(p, { k: 'bounty', id: n.id, name: def.name, why: def.why, x: r2(n.x), z: r2(n.z), i, of: MM.ARM.bounties.length + 1, last: last ? 1 : 0 });
    }
    armKill(n, owner) {
      const p = this.players.get(n.armFor);
      if (!p || !p.prog.arm || n.armI !== p.prog.arm.n) return;
      p.armTarget = null;
      if (owner !== p) { this.priv(p, { k: 'armsay', text: 'Someone else got ' + n.name + '. The arm is furious. She will find another.' }); return; }
      if (n.armI >= MM.ARM.bounties.length) { this.armCure(p, n.name); return; }
      p.prog.arm.n++;
      const G = MM.ARM.give;
      for (const k in G) p.inv[k] = (p.inv[k] || 0) + G[k];
      p.progDirty = true;
      this.priv(p, { k: 'bounty', done: n.name, give: G, left: MM.ARM.bounties.length + 1 - p.prog.arm.n });
      this.dirty(p);
    }
    // Revenge: she lets go. The arm is Morty's own again.
    armCure(p, name) {
      p.prog.arm = null;
      p.prog.armDone = (p.prog.armDone || 0) + 1;
      const G = MM.ARM.done;
      for (const k in G) p.inv[k] = (p.inv[k] || 0) + G[k];
      p.progDirty = true;
      p.inst.ev({ k: 'gear', id: p.id, gear: this.info(p).gear });
      this.priv(p, { k: 'arm', off: 1, name, give: G });
      this.dirty(p);
    }

    // ----- The Ring of Death (Post-Apocalyptic Earth) -----
    // Step in and fight three rounds, the champion last. One fighter at a time in each copy of
    // the world; everyone else watches from the stands. Leave the Ring, or go down, and you lose.
    startBout(p) {
      const inst = p.inst, l = MM.LANDMARKS.find(q => q.dim === inst.dimId && q.bout);
      if (!l || p.dead) return;
      if (p.bout) { this.toast(p, 'You are in the middle of a fight. Win it!'); return; }
      if (p.car || p.ship) { this.toast(p, 'No cars in the Ring. Get out and fight on foot.'); return; }
      const busy = [...inst.players.values()].find(q => q.bout);
      if (busy) { this.toast(p, busy.name + ' is fighting in the Ring. Watch from the stands, then go next.'); return; }
      if (dist2(p.x, p.z, l.x, l.z) > (MM.BOUT.r - 1) ** 2) this.teleport(p, l.x, MM.heightAt(inst.dimId, l.x, l.z + 7), l.z + 7);
      p.bout = { l, inst, round: -1, npcs: [], out: 0 };
      for (const q of inst.players.values()) if (q !== p) this.toast(q, p.name + ' steps into the Ring of Death!');
      this.nextRound(p);
    }
    nextRound(p) {
      const B = p.bout, inst = B.inst, R = MM.BOUT.rounds[++B.round];
      if (!R) { this.endBout(p, true); return; }
      const [type, count] = R, now = this.time;
      B.npcs = [];
      for (let i = 0; i < count; i++) {
        // They come in through the far (north) gate.
        const a = Math.PI + (i - (count - 1) / 2) * 0.6;
        const n = inst.spawnNpc(type, true, { at: { x: B.l.x + Math.sin(a) * 8, z: B.l.z + Math.cos(a) * 8 }, until: now + 600 });
        n.angry = p.id; n.angryUntil = now + 600; n.bout = p.id; n.home = { x: B.l.x, z: B.l.z, y: n.y };
        B.npcs.push(n.id);
      }
      const champ = type === 'ringchamp' ? inst.npcs.get(B.npcs[0]) : null;
      this.priv(p, { k: 'bout', round: B.round + 1, of: MM.BOUT.rounds.length, n: count, champ: champ ? champ.name : '' });
    }
    tickBout(p, dt) {
      const B = p.bout;
      if (p.dead) { this.endBout(p, false, 'You went down in the Ring of Death. The crowd loved it.'); return; }
      if (p.inst !== B.inst) { this.endBout(p, false, 'You left the Ring of Death.'); return; }
      if (dist2(p.x, p.z, B.l.x, B.l.z) > (MM.BOUT.r + 0.5) ** 2) {
        if ((B.out += dt) > MM.BOUT.leave) { this.endBout(p, false, 'You ran out of the Ring. The crowd booed you all the way out.'); return; }
      } else B.out = 0;
      if (B.npcs.every(id => !B.inst.npcs.has(id))) this.nextRound(p);
    }
    endBout(p, won, why) {
      const B = p.bout;
      if (!B) return;
      p.bout = null;
      for (const id of B.npcs) if (B.inst.npcs.has(id)) { B.inst.npcs.delete(id); B.inst.ev({ k: 'npc-', id }); }
      if (!won) { this.priv(p, { k: 'bout', lost: 1, why: why || '' }); return; }
      const G = MM.BOUT.give;
      for (const k in G) p.inv[k] = (p.inv[k] || 0) + G[k];
      p.prog.chaos += 10;
      this.progress(p, 'use', 'deathring');
      this.priv(p, { k: 'bout', won: p.prog.cnt.use.deathring, give: G });
      for (const q of B.inst.players.values()) if (q !== p) this.toast(q, p.name + ' won in the Ring of Death! The crowd goes wild.');
      this.dirty(p);
    }

    // ----- Rick's house: whose it is, hacking it, and its defences (shared/house.js) -----
    // Which Earth's house you are at: this Earth, or (inside the house, the garage, the lab,
    // the sublevels) the Earth you came in from.
    earthOfHere(p) {
      const D = p.inst.dim;
      if (D.interior || D.pocket) return p.doorBack || 'suburbia';
      return MM.worldOf(p.inst.dimId) === 'earth' && !D.timeline ? p.inst.dimId : null;
    }
    // Each Earth's house is its own Rick's (C-137's is Rick C-137's). His clones are not him:
    // like any other Rick, they have to hack it.
    rickOwns(p, earth) { return p.arch === 'genius' && !p.clone && !!earth && MM.castHome('genius', p.home) === earth; }
    rickMay(p, earth) { return this.rickOwns(p, earth) || (p.arch === 'genius' && !!earth && (p.hacked && p.hacked[earth] || 0) > this.time); }
    // Not yours: anyone but a Rick is told no; another Rick starts hacking (stay close).
    rickRefuse(p, l) {
      const earth = this.earthOfHere(p);
      if (p.arch !== 'genius') { this.toast(p, 'That is Rick\'s. Only a Rick can use it.'); return; }
      if (p.hack && p.hack.earth === earth) { this.toast(p, 'Still hacking... stay close.'); return; }
      p.hack = { earth, inst: p.inst, x: p.x, z: p.z, until: this.time + MM.HACK_TIME };
      this.priv(p, { k: 'hack', t: MM.HACK_TIME });
      this.toast(p, 'This is another Rick\'s ' + (l ? l.name : 'stuff') + '. Hacking it... stay close for ' + MM.HACK_TIME + ' seconds.');
      const R = this.cast.get(MM.castKey('genius', earth)), o = R && R.player && this.players.get(R.player);
      if (o && o !== p) this.toast(o, p.name + ' is hacking your garage!');
    }
    tickHack(p) {
      const H = p.hack;
      if (!H || this.time < H.until) return;
      p.hack = null;
      if (p.dead || p.inst !== H.inst || dist2(p.x, p.z, H.x, H.z) > 4 * 4) { this.toast(p, 'Hack interrupted: you moved away.'); return; }
      (p.hacked || (p.hacked = {}))[H.earth] = this.time + MM.HACK_FOR;
      this.toast(p, 'Hacked! Another Rick\'s house is yours to use for ' + Math.round(MM.HACK_FOR / 60) + ' minutes.');
      this.priv(p, { k: 'hacked' });
    }
    // Who the house lets in while its defences are up: whoever put them up, their team, and
    // anyone (a Rick) with the right to use the house.
    houseAllows(inst, p) {
      const H = inst.house;
      if (!H) return true;
      if (p.id === H.by) return true;
      const by = this.players.get(H.by);
      if (by && by.team && by.team === p.team) return true;
      return this.rickMay(p, inst.dimId);
    }
    // The retracted lab: the garage's things fold into the walls for everyone but the house's people.
    labClosed(p, l) {
      const H = p.inst.house;
      if (!H || !(H.lab > this.time) || !['garage', 'workbench', 'plumbus', 'mbox', 'battery', 'trapdoor', 'housecon'].some(a => MM.isAt(l, a)) || this.houseAllows(p.inst, p)) return false;
      this.toast(p, 'The lab has folded itself into the walls. Nothing here but a normal garage.');
      return true;
    }
    houseRow(inst) {
      const H = inst.house, now = this.time, t = v => Math.max(0, r2((v || 0) - now));
      return H ? { s: t(H.shield), d: t(H.doors), g: t(H.grid), l: t(H.lab), by: H.by } : null;
    }
    // "House, forcefield!" At the console, or anywhere near the house if it is your own.
    onDefense(p, id, d) {
      const D = MM.DEFENSES[id], now = this.time;
      if (!D || p.dead || now < (p.cdDef || 0)) return;
      p.cdDef = now + 0.5;
      const earth = this.earthOfHere(p);
      if (!earth) { this.toast(p, 'There is no house of yours here.'); return; }
      const con = MM.LANDMARKS.find(l => l.dim === p.inst.dimId && MM.isAt(l, 'housecon'));
      const atCon = con && dist2(con.x, con.z, p.x, p.z) < (con.r + MM.USE_RADIUS + 2) ** 2;
      const own = this.rickOwns(p, earth);
      if (!this.rickMay(p, earth)) { if (atCon) this.rickRefuse(p, con); else this.toast(p, 'That is another Rick\'s house.'); return; }
      const outside = !p.inst.dim.interior && !p.inst.dim.pocket;
      if (!atCon && !(own && (!outside || MM.inHouse(p.x, p.z) || dist2(p.x, p.z, MM.HOUSE.x, MM.HOUSE.z) < MM.VOICE_RANGE ** 2))) { this.toast(p, 'Go to the console in the garage' + (own ? ', or get closer to the house.' : '.')); return; }
      // Things that happen to the house need you out at the house; the rest work anywhere.
      if (D.dur && !outside) { this.toast(p, 'Say it outside, by the house: you are indoors.'); return; }
      const inst = p.inst;
      const H = outside ? (inst.house || (inst.house = { by: p.id, cd: {} })) : { cd: p.houseCd || (p.houseCd = {}) };
      if ((H.cd[id] || 0) > now) { this.toast(p, D.name + ': ready again in ' + Math.ceil(H.cd[id] - now) + ' s.'); return; }
      H.cd[id] = now + D.cd;
      if (outside) H.by = p.id;
      const until = now + D.dur, at = (x, z) => { const [cx, cz] = MM.collideProps(inst.dimId, x, z, 0.8, null); return { x: cx, z: cz }; };
      const guard = (type, x, z, opts) => {
        const n = inst.spawnNpc(type, true, { at: at(x, z), until: until + 1 });
        n.owner = p.id; n.ownerUntil = until; n.guardAt = { x: n.x, z: n.z };
        Object.assign(n, opts || {});
        return n;
      };
      switch (id) {
        case 'shield': H.shield = until; break;
        case 'doors': H.doors = until; break;
        case 'grid': H.grid = until; break;
        case 'lab': H.lab = until; break;
        case 'turrets':
        case 'cannon': {
          const g = MM.heightAt(inst.dimId, -13.5, 16.5);
          const spots = id === 'cannon' ? [[-14.5, 28.55, 6.8]] : [[-18.5, 13, 7.6], [-8.5, 13, 7.6], [-18.5, 20, 7.6], [-8.5, 20, 7.6], [-6.9, 17.1, 3.2]];
          for (const [x, z, y] of spots) {
            const t = { id: this.ent(), owner: p.id, x, y: g + y, z, hp: id === 'cannon' ? 200 : 80, until, cd: now + 1, aim: 0, big: id === 'cannon' };
            inst.turrets.set(t.id, t);
            inst.ev({ k: 'tu+', t: [t.id, t.owner, r2(t.x), r2(t.y), r2(t.z), t.big ? 1 : 0] });
          }
          break;
        }
        case 'bots': for (const [x, z] of [[-6, 14], [-6, 22], [-24, 30]]) guard('killbot', x, z); break;
        case 'drones': for (const [x, z] of [[-10, 10], [-26, 18], [-8, 30]]) guard('boomdrone', x, z, { voice: p.name }); break;
        case 'plants': for (const [x, z] of [[-26, 16], [-30, 24], [-24, 26], [-34, 18]]) guard('yardplant', x, z); break;
        case 'holo': guard('hologram', p.x + Math.sin(p.r) * 3, p.z + Math.cos(p.r) * 3, { name: 'Hologram ' + p.name }); break;
        case 'fungus': {
          // A fungus clone that copies your voice. Destroy it in time, or it starts eating.
          const n = inst.spawnNpc('fungusclone', true, { at: at(p.x + Math.sin(p.r) * 3, p.z + Math.cos(p.r) * 3), until: now + 600 });
          n.name = 'Fungus ' + p.name;
          inst.ev({ k: 'say', n: n.id, by: p.id, text: 'Hey, it\'s me, ' + p.name + '. The real one. Totally not a fungus.' });
          this.later(D.dur, () => {
            if (!inst.npcs.has(n.id)) return;
            inst.npcs.delete(n.id); inst.ev({ k: 'npc-', id: n.id });
            const e = inst.spawnNpc('funguseater', true, { at: { x: n.x, z: n.z }, until: this.time + 240 });
            inst.ev({ k: 'say', n: e.id, by: p.id, text: 'I WILL EAT YOUR WORLD!' });
            for (const o of inst.players.values()) this.toast(o, 'A fungus clone was not destroyed in time. It is eating the world. Kill it!');
          });
          break;
        }
        case 'vat': p.hp = p.maxHp; p.backup = earth; this.dirty(p); break;
        case 'stash': p.inv.grenade = (p.inv.grenade || 0) + 1; p.inv.turret = (p.inv.turret || 0) + 1; this.dirty(p); break;
        case 'shipbay': {
          if (!p.st.ship) { this.toast(p, 'There is no ship of yours down there yet (build a ship hull first).'); H.cd[id] = 0; return; }
          if (!outside) { this.toast(p, 'The ship bay is under the garage floor: go out to the garage.'); H.cd[id] = 0; return; }
          this.teleport(p, -14.5, MM.heightAt(inst.dimId, -14.5, 28.55) + 14, 28.55);
          this.onShip(p, true);
          p.kbUntil = now + 1;
          break;
        }
        case 'tele': {
          const S = MM.TELE_SPOTS[d !== undefined && MM.TELE_SPOTS[d] ? d : Math.floor(Math.random() * MM.TELE_SPOTS.length)];
          if (!outside) { this.toast(p, 'The teleporter is in the garage: go out to it.'); H.cd[id] = 0; return; }
          const ox = p.x, oz = p.z;
          inst.ev({ k: 'kiosk', id: p.id });
          this.teleport(p, S.x, MM.heightAt(inst.dimId, S.x, S.z) + 0.2, S.z);
          for (const o of inst.players.values()) if (o !== p && o.team && o.team === p.team && dist2(o.x, o.z, ox, oz) < 8 * 8) this.teleport(o, S.x + 2, MM.heightAt(inst.dimId, S.x + 2, S.z) + 0.2, S.z);
          this.toast(p, 'Teleported to ' + S.name + '.');
          break;
        }
        case 'wardrobe': p.wardrobeUntil = now + 120; this.priv(p, { k: 'wardrobe' }); break;
      }
      inst.ev({ k: 'house', h: outside ? this.houseRow(inst) : null, say: D.say, by: p.id, id });
      this.progress(p, 'use', 'house_' + id);
    }
    // What the house's defences do, every tick: the dome keeps people out, the grid cuts.
    tickHouse(inst, now) {
      const H = inst.house;
      if (!H) return;
      for (const p of inst.players.values()) {
        if (p.dead || this.houseAllows(inst, p)) continue;
        if (H.shield > now && MM.inHouse(p.x, p.z)) {
          const dx = p.x - MM.HOUSE.x, dz = p.z - MM.HOUSE.z, l = Math.hypot(dx, dz) || 1, R = MM.HOUSE.r + 1.5;
          this.teleport(p, MM.HOUSE.x + dx / l * R, Math.max(p.y, MM.heightAt(inst.dimId, MM.HOUSE.x + dx / l * R, MM.HOUSE.z + dz / l * R) + 0.2), MM.HOUSE.z + dz / l * R);
          if (now > (p.cdShieldMsg || 0)) { p.cdShieldMsg = now + 4; this.toast(p, 'A forcefield. Somebody does not want you in that house.'); }
        }
        if (H.grid > now && MM.inGarage(p.x, p.z) && p.y < MM.heightAt(inst.dimId, p.x, p.z) + 5 && this.tickN % 10 === 0) this.hurtPlayer(inst, p, 5, this.players.get(H.by) || null, 'lasergrid');
      }
    }

    // ----- Fun (shared/fun.js): rides, shooting galleries, mini-games, the passport -----
    onFun(p, m) {
      if (m.a === 'off') { if (p.ride) this.endRide(p, false); return; }
      const l = MM.LANDMARK_BY_ID[m.l];
      if (p.dead || !l || l.dim !== p.inst.dimId || dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 3) ** 2) return;
      if (m.a === 'ride' && l.ride) this.onRide(p, MM.RIDE_BY_ID[l.ride]);
      if (m.a === 'gallery' && l.gallery) this.onGallery(p, l);
    }
    // Take the next train (or gondola) that has a seat. Trains leave on the clock, so everyone
    // sees the same ones.
    onRide(p, R) {
      const now = this.time, inst = p.inst;
      if (!R || p.ride || p.ship || p.car || !MM.ridesIn(inst.dimId).includes(R)) return;
      let t0 = MM.nextDeparture(R, now), seat;
      for (let k = 0; k < 6 && seat === undefined; k++, t0 += seat === undefined ? MM.rideEvery(R) : 0) {
        const used = new Set([...inst.players.values()].filter(o => o.ride && o.ride.id === R.id && Math.abs(o.ride.t0 - t0) < 0.01).map(o => o.ride.seat));
        for (let s = 0; s < R.seats; s++) if (!used.has(s)) { seat = s; break; }
      }
      if (seat === undefined) { this.toast(p, R.name + ' is full. Try again in a moment.'); return; }
      p.ride = { id: R.id, t0, seat, inst };
      inst.ev({ k: 'rd', id: p.id, r: R.id, t0: r2(t0), s: seat });
      this.toast(p, 'Boarding ' + R.name + (t0 - now > 1 ? ': it leaves in ' + Math.ceil(t0 - now) + ' s.' : '.') + ' (F to get off)');
    }
    tickRide(p) {
      const R = MM.RIDE_BY_ID[p.ride.id], u = this.time - p.ride.t0;
      if (p.dead || p.inst !== p.ride.inst) { p.ride = null; return; }
      if (u >= MM.rideDur(R)) { this.endRide(p, true); return; }
      const q = MM.rideAt(R, Math.max(0, u), p.ride.seat);
      p.x = q.x; p.y = q.y; p.z = q.z; p.r = q.yaw; p.a = MM.ANIM.ride; p.lastSt = this.time;
      // The Whirly Dirly leaves the immortality field for a few seconds. Out there, it counts.
      if (R.mortal) {
        const out = !MM.inField(p.inst.dimId, p.x, p.z);
        if (out !== !!p.ride.out) {
          p.ride.out = out;
          this.toast(p, out ? 'You just left the immortality field. You can die out here!' : 'Back inside the field. Immortal again. Phew.');
          // ...and sometimes a bolt comes loose right then.
          if (out && Math.random() < 0.2) { const inst = p.inst; this.later(0.8, () => { if (p.ride && p.ride.out && p.inst === inst) { inst.ev({ k: 'boom', x: r2(p.x), y: r2(p.y + 0.5), z: r2(p.z), r: 1.5 }); this.hurtPlayer(inst, p, 30, null, 'whirlydirly'); } }); }
        }
      }
    }
    endRide(p, done) {
      const R = MM.RIDE_BY_ID[p.ride.id], inst = p.ride.inst;
      p.ride = null;
      if (p.inst !== inst) return;
      const [ex, ez] = R.exit;
      this.teleport(p, ex, MM.heightAt(inst.dimId, ex, ez) + 0.1, ez);
      p.kbUntil = this.time + 1;
      inst.ev({ k: 'rd', id: p.id, r: '' });
      if (!done) return;
      const rides = p.prog.rides || (p.prog.rides = {});
      rides[R.id] = (rides[R.id] || 0) + 1;
      if (rides[R.id] === 1) { p.inv.k = (p.inv.k || 0) + 3; this.priv(p, { k: 'toast', text: 'First time on ' + R.name + '! +3 Schmeckles. (' + Object.keys(rides).length + '/' + MM.RIDES.length + ' rides ridden)' }); }
      this.progress(p, 'ride', R.id);
      this.dirty(p);
    }
    // A shooting gallery: targets pop up in front of the booth; everyone here can shoot them.
    onGallery(p, l) {
      const G = MM.GALLERIES[l.gallery], inst = p.inst, now = this.time;
      const all = inst.gal || (inst.gal = {});
      if (all[l.id] && all[l.id].until > now) { this.toast(p, G.name + ' is on: shoot the targets!'); return; }
      all[l.id] = { G, l, until: now + G.secs, scores: new Map(), tg: new Set(), sent: 0 };
      inst.ev({ k: 'gal', id: l.id, on: 1, left: G.secs, by: p.name });
    }
    tickGalleries(inst, now) {
      for (const id in inst.gal) {
        const S = inst.gal[id];
        for (const tid of [...S.tg]) if (!inst.npcs.has(tid)) S.tg.delete(tid);
        if (now >= S.until) {
          for (const tid of S.tg) { inst.npcs.delete(tid); inst.ev({ k: 'npc-', id: tid }); }
          const sc = [...S.scores].sort((a, b) => b[1] - a[1]);
          sc.forEach(([pid, n], i) => {
            const q = this.players.get(pid);
            if (!q) return;
            const best = q.prog.best || (q.prog.best = {}), was = best[id] || 0;
            if (n > was) best[id] = n;
            const k = Math.round(n / 2) + (i === 0 && sc.length > 1 ? 5 : 0);
            q.inv.k = (q.inv.k || 0) + k;
            this.priv(q, { k: 'toast', text: S.G.name + ': ' + n + ' hits' + (i === 0 ? ' (top score!)' : ', #' + (i + 1)) + (n > was ? ' New personal best!' : '') + ' +' + k + ' Schmeckles' });
            this.progress(q, 'play', 'gallery');
            this.dirty(q);
          });
          inst.ev({ k: 'gal', id, on: 0, sc: sc.slice(0, 5).map(([pid, n]) => [(this.players.get(pid) || { name: '?' }).name, n]) });
          delete inst.gal[id];
          continue;
        }
        // Keep the targets coming, each swaying side to side until it drops back down.
        while (S.tg.size < S.G.n) {
          const at = MM.galleryTargetSpot(S.l, Math.random(), Math.random());
          const n = inst.spawnNpc(S.G.target, true, { at, until: now + 2.2 + Math.random() * 2.5 });
          n.gal = id; n.sway = { x: n.x, z: n.z, ph: Math.random() * 6, a: 1 + Math.random() * 2.5, r: S.l.rot || 0 };
          n.r = (S.l.rot || 0) + Math.PI;
          S.tg.add(n.id);
        }
        for (const tid of S.tg) {
          const n = inst.npcs.get(tid), w = n.sway, o = Math.sin(now * 1.6 + w.ph) * w.a;
          n.x = w.x + Math.cos(w.r) * o; n.z = w.z - Math.sin(w.r) * o; n.r = w.r + Math.PI;
        }
        if (now - S.sent > 1) { S.sent = now; inst.ev({ k: 'gal', id, on: 1, left: Math.ceil(S.until - now), sc: [...S.scores].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pid, n]) => [(this.players.get(pid) || { name: '?' }).name, n]) }); }
      }
    }
    // A mini-game's result (the game itself runs in the player's own window).
    onMinigame(p, m) {
      const l = MM.LANDMARK_BY_ID[m.l], now = this.time, inst = p.inst;
      if (p.dead || !l || l.game !== m.g || l.dim !== inst.dimId || dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 4) ** 2) return;
      const cd = p.cdMg || (p.cdMg = {});
      if (now < (cd[m.g] || 0)) return;
      cd[m.g] = now + MM.MINIGAMES[m.g].cd;
      const best = p.prog.best || (p.prog.best = {}), key = m.g + ':' + (l.alias || l.id);
      if (m.g === 'fish') {
        // What bites depends on where you are and how well you reeled it in.
        const size = Math.min(3, m.s), pool = MM.FISH[l.fish] || MM.FISH.sea;
        const can = pool.filter(f => f[1] <= size), tot = can.reduce((a, f) => a + f[2] * (1 + f[1] * size * 0.5), 0);
        let r = Math.random() * tot, F = can[0];
        for (const f of can) { r -= f[2] * (1 + f[1] * size * 0.5); if (r <= 0) { F = f; break; } }
        const fish = p.prog.fish || (p.prog.fish = {});
        fish[F[0]] = (fish[F[0]] || 0) + 1;
        p.inv.f = (p.inv.f || 0) + 1 + F[1];
        this.priv(p, { k: 'catch', name: F[0], size: F[1], n: fish[F[0]] });
        if (F[1] >= 2) for (const o of inst.players.values()) if (o !== p) this.toast(o, p.name + ' caught ' + F[0] + '!');
      } else if (m.g === 'dance') {
        const J = MM.DANCE_JUDGE[l.alias || l.id] || MM.DANCE_JUDGE.ddr, line = J[m.s >= 80 ? 0 : m.s >= 50 ? 1 : 2];
        p.inv.k = (p.inv.k || 0) + Math.round(m.s / 20);
        if (m.s > (best[key] || 0)) best[key] = m.s;
        inst.ev({ k: 'judge', id: p.id, name: p.name, s: m.s, line });
      } else if (m.g === 'roy') {
        p.inv.k = (p.inv.k || 0) + Math.round(m.s / 15);
        if (m.s > (best[key] || 0)) best[key] = m.s;
        inst.ev({ k: 'judge', id: p.id, name: p.name, s: m.s, line: p.name + ' lived ' + m.s + ' years as Roy.' + (m.s >= 70 ? ' "Roy! Roy! Roy!"' : '') });
      }
      this.progress(p, 'play', m.g);
      this.dirty(p);
    }
    // An easter egg (shared/fun.js): the first time counts, and pays a little.
    findEgg(p, id) {
      const E = MM.EGG_BY_ID[id], eggs = p.prog.eggs || (p.prog.eggs = []);
      if (!E || eggs.includes(id)) return;
      eggs.push(id);
      p.inv.k = (p.inv.k || 0) + 3;
      this.priv(p, { k: 'egg', id, n: eggs.length, total: MM.EGGS.length });
      p.progDirty = true; this.dirty(p);
    }
    // Things you can say: the chat's easter eggs.
    sayEgg(p, text) {
      const E = MM.EGGS.find(q => q.kind === 'say' && q.re.test(text));
      if (!E) return;
      const inst = p.inst, now = this.time;
      if (now < (p.cdSay || 0)) return;
      p.cdSay = now + 8;
      if (E.id === 'wubba') inst.ev({ k: 'burp', id: p.id });
      else if (E.id === 'schwifty') { for (const o of inst.players.values()) if (dist2(o.x, o.z, p.x, p.z) < 30 * 30 && !o.dead) inst.ev({ k: 'em', id: o.id, e: 1 }); }
      else if (E.id === 'showme') inst.ev({ k: 'cromulon', id: p.id, x: r2(p.x), z: r2(p.z) });
      else if (E.id === 'picklerick') inst.ev({ k: 'pickle', id: p.id, t: 20 });
      else if (E.id === 'meeseeks' && !p.dead && !p.inst.dim.planets) { if (now >= (p.cdSeeks || 0)) { p.cdSeeks = now + 60; this.summonMeeseeks(p, 1, 20); } }
      else if (E.id === 'plumbus') this.priv(p, { k: 'toast', text: 'First they take the dinglebop, smooth it out with schleem, then the schleem is repurposed. The grumbo is shaved away. That leaves the fleeb.' });
      else if (E.id === 'riggity') inst.ev({ k: 'burp', id: p.id });
      this.findEgg(p, E.id);
    }

    // Every dimension you set foot in, stamped in your passport; milestones pay.
    stampPassport(p, dimId) {
      const id = MM.stampOf(dimId);
      if (!id) return;
      const st = p.prog.stamps || (p.prog.stamps = []);
      if (st.includes(id)) return;
      st.push(id);
      const M = MM.PASSPORT.find(q => q[0] === st.length);
      if (M) for (const k in M[2]) p.inv[k] = (p.inv[k] || 0) + M[2][k];
      this.priv(p, { k: 'stamp', d: id, n: st.length, title: M ? M[1] : '', give: M ? M[2] : null });
    }

    // ----- Daily life at landmarks -----
    onUse(p, lid, taskId) {
      if (MM.helpless(p.arch, p.prog.up)) { const l = MM.LANDMARK_BY_ID[lid]; if (l && l.door) this.onDoor(p, lid); else this.toast(p, MM.HELPLESS_TEXT); return; }
      const l = MM.LANDMARK_BY_ID[lid];
      if (p.dead || !l || l.dim !== p.inst.dimId || this.time < p.cdUse) return;
      if (dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 2) ** 2 || !MM.sameFloor(l, p.y)) return;
      p.cdUse = this.time + 1;
      if (this.labClosed(p, l)) return;
      if (l.rick && !this.rickMay(p, this.earthOfHere(p))) { this.rickRefuse(p, l); return; }
      if (MM.isAt(l, 'housecon')) {
        // A hacked house: a Rick who may use this console reboots it.
        const ev = p.inst.event;
        if (ev && ev.E.house && this.rickMay(p, this.earthOfHere(p))) {
          for (const o of p.inst.players.values()) { for (const k in ev.E.clear) o.inv[k] = (o.inv[k] || 0) + ev.E.clear[k]; this.dirty(o); }
          p.inst.endEvent(this.time, p.name + ' rebooted the house. Everyone here gets ' + matText(ev.E.clear) + '.');
          return;
        }
        this.priv(p, { k: 'hmenu', own: this.rickOwns(p, this.earthOfHere(p)) });
        return;
      }
      if (l.tinyrick) { this.onTinyRick(p); return; }
      if (l.car) { this.onCar(p, true); return; }
      if (l.bout) { this.startBout(p); return; }
      const mine = Object.keys(MM.TASKS).filter(t => MM.isAt(l, MM.TASKS[t].at) && MM.taskFor(t, p.arch));
      const id = taskId && mine.includes(taskId) ? taskId : mine[0];
      if (!id) { if (l.door) this.onDoor(p, lid); else this.toast(p, 'Nothing for you to do at the ' + l.name + '. You could still build things here (C).'); return; }
      const T = MM.TASKS[id], wall = this.wall();
      if ((p.prog.tasks[id] || 0) > wall) { this.toast(p, T.name + ': come back in ' + Math.ceil((p.prog.tasks[id] - wall) / 1000) + ' s.'); return; }
      p.prog.tasks[id] = wall + T.cd * 1000;
      const mult = p.arch === 'teen' ? 2 : 1;
      for (const k in T.give) p.inv[k] = (p.inv[k] || 0) + T.give[k] * mult;
      if (T.heal) p.hp = p.maxHp;
      if (T.summon) this.summonMeeseeks(p, 1, 45);
      if (T.effect === 'borrowgun') { p.borrow = 2; this.dirty(p); }
      if (T.effect === 'sugar') { p.fx.sprint = this.time + 15; this.dirty(p); }
      if (T.effect === 'curio' && T.curios) {
        const q = pick(T.curios.filter(c => MM.CURIOS[c])), found = p.prog.found || (p.prog.found = []), first = !found.includes(q);
        p.inv['q:' + q] = (p.inv['q:' + q] || 0) + 1;
        if (first) found.push(q);
        this.priv(p, { k: 'found', id: q, first, n: found.length });
      }
      if (T.effect === 'acid') { p.fx.cloak = this.time + 25; this.dirty(p); p.inst.ev({ k: 'boom', x: r2(p.x), y: r2(p.y + 0.5), z: r2(p.z), r: 1.2 }); }   // they think you're dead   // Rick's gun: two charges, no recharging
      let text = T.texts ? pick(T.texts) : T.text;
      // Earth TVs are normal until a Rick "fixes" them with Xanthenite (for this copy of the world).
      if (T.effect === 'fixtv') p.inst.cable = this.time + 600;
      if (id === 'watchtv' && p.inst.cable > this.time) text = pick(['Interdimensional cable! Ball Fondlers, then Real Fake Doors, then a man who is also a pizza.', 'Two Brothers. The plot is a lot. You cannot look away.', 'Ants in my Eyes Johnson! He cannot see a thing. Prices so low.']);
      if (T.effect === 'tunnels') {
        const inst = p.inst;
        this.later(1.5, () => { if (p.inst === inst && !p.dead) { const n = inst.spawnNpc('meatblob', true, { at: { x: p.x + 4, z: p.z + 4 }, until: this.time + 60 }); n.angry = p.id; n.angryUntil = this.time + 50; } });
      }
      this.priv(p, { k: 'task', id, text, give: T.give, mult });
      p.inst.ev({ k: 'em', id: p.id, e: 0 });
      this.progress(p, 'use', id);
    }

    // ----- Tiny Rick ("Big Trouble in Little Sanchez") -----
    onTinyRick(p) {
      if (p.arch !== 'genius') { this.toast(p, 'A teenage Rick clone body. Only a Rick can go in there.'); return; }
      if (p.tiny || p.ship || p.car) { this.toast(p, 'Not like this.'); return; }
      p.tinyRick = !p.tinyRick; p.tinyWhisper = 0;
      p.inst.ev({ k: 'tinyrick', id: p.id, on: p.tinyRick ? 1 : 0 });
      this.toast(p, p.tinyRick ? 'TINY RICK! A teenage body: smaller, faster, bouncier. Go to Harry Herpson High and talk to the gym coach. Use the vat again to go back.' : 'Back in your old body. Your back hurts again.');
      this.dirty(p);
    }
    // Only Tiny Rick notices: the gym coach is a vampire.
    feratuReveal(inst, n, p) {
      inst.ev({ k: 'say', n: n.id, by: p.id, text: 'You figured it out, Tiny Rick. Pity. Nobody will believe a teenager.' });
      const m = inst.morphNpc(n, 'feratu', { until: this.time + 240 });
      if (!m) return;
      m.angry = p.id; m.angryUntil = this.time + 200;
      inst.ev({ k: 'say', n: m.id, by: p.id, text: 'HSSSSS!' });
      this.toast(p, 'Coach Feratu is a vampire! Take him down.');
      // He is back in his gym, looking normal, a few minutes later.
      this.later(240, () => { if (this.instances.get(inst.key) === inst && ![...inst.npcs.values()].some(x => x.type === 'coachferatu' || x.type === 'feratu')) inst.spawnNpc('coachferatu', true, { at: n.home }); });
    }
    feratuDown(inst, by) {
      for (const o of inst.players.values()) this.toast(o, (by ? by.name : 'Someone') + ' took down Coach Feratu! Gym is cancelled.');
      this.later(120, () => { if (this.instances.get(inst.key) === inst && ![...inst.npcs.values()].some(x => x.type === 'coachferatu')) inst.spawnNpc('coachferatu', true); });
    }

    // ----- The Five-Step Death Punch ("Rick Fu Hustle") -----
    liuSin(p, n, say) {
      if (p.prog.dpunch) { say(pick(['You know the punch. Use it wisely. Or at least sparingly.', 'Five steps. Never six.', 'Punchy says hello.'])); return; }
      const want = MM.DEATHPUNCH.cost;
      p.offer = { n: n.id, dpunch: true, want, get: {}, until: this.time + 25 };
      say('I can teach you the Five-Step Death Punch. Strike, and your enemy drops dead after five steps. ' + matText(want) + '.');
      this.priv(p, { k: 'offer', n: n.id, name: n.name, dpunch: 1, want, get: {} });
    }
    onDeathPunch(p, m) {
      const D = MM.DEATHPUNCH, now = this.time, inst = p.inst;
      if (!p.prog.dpunch || p.dead || p.ship || p.car || p.ride || MM.helpless(p.arch, p.prog.up) || now < (p.cdDp || 0)) return;
      p.r = m.r;
      const fx = Math.sin(p.r), fz = Math.cos(p.r), reach = D.reach * this.scaleOf(p) + 0.6;
      const inFront = (x, z, r) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); return d < reach + r && (d < 0.8 || (dx * fx + dz * fz) / d > 0.35) ? d : Infinity; };
      let best = null, bd = Infinity;
      for (const o of inst.players.values()) {
        if (o === p || o.dead || o.dp || !this.canHurt(p, o) || now < o.fx.prot) continue;
        const d = inFront(o.x, o.z, 0.5); if (d < bd) { bd = d; best = o; }
      }
      for (const n of inst.npcs.values()) {
        if (n.dp || n.cast || (n.owner === p.id && n.ownerUntil > now) || n.T.speed <= 0) continue;
        const d = inFront(n.x, n.z, n.T.r); if (d < bd) { bd = d; best = n; }
      }
      p.cdDp = now + (best ? D.cd : 1.5);
      inst.ev({ k: 'dpunch', id: p.id, v: best ? (best.T ? 0 : best.id) : 0, n: best && best.T ? best.id : 0 });
      if (!best) { this.priv(p, { k: 'dpcd', t: 1.5 }); return; }
      this.priv(p, { k: 'dpcd', t: D.cd });
      best.dp = { steps: D.steps, by: p.id, until: best.T ? now + D.last : Infinity, lx: best.x, lz: best.z, acc: 0 };
      if (best.T) { inst.dpSet.add(best.id); inst.hurtNpc(best, D.dmg, p); }
      else {
        this.hurtPlayer(inst, best, D.dmg, p, 'deathpunch');
        this.priv(best, { k: 'dp', s: D.steps, by: p.name });
        this.dirty(best);
      }
      this.toast(p, 'Five-Step Death Punch! ' + best.name + ' has five steps left.');
    }
    // Count their steps: only steps forward (the way they face) count, one less each stride.
    // At none, they drop. Walking backwards is safe, all the way to a Rick who can reverse it.
    stepCount(t, now) {
      const dx = t.x - t.dp.lx, dz = t.z - t.dp.lz, d = Math.hypot(dx, dz);
      t.dp.lx = t.x; t.dp.lz = t.z;
      const fwd = dx * Math.sin(t.r) + dz * Math.cos(t.r);
      if (d < 3 && fwd > 0) t.dp.acc += fwd;   // (a portal or a door is not walking)
      if (t.dp.acc < MM.DEATHPUNCH.stride) return 0;
      t.dp.acc -= MM.DEATHPUNCH.stride;
      return --t.dp.steps > 0 ? 1 : 2;
    }
    tickPunched(p, now) {
      const inst = p.inst;
      if (p.dead || !inst) { p.dp = null; return; }
      // A Rick heals it himself, back in his own garage (or the lab under it).
      if (p.arch === 'genius' && (MM.inGarage(p.x, p.z) && this.rickOwns(p, this.earthOfHere(p)) || inst.dimId === 'ricklab')) { this.unpunch(p, 'You patched yourself up in your garage. The death punch is gone.'); return; }
      const r = this.stepCount(p, now);
      if (!r) return;
      inst.ev({ k: 'dpstep', id: p.id, s: p.dp.steps });
      if (r === 2) {
        const by = this.players.get(p.dp.by);
        p.dp = null;
        inst.ev({ k: 'boom', x: r2(p.x), y: r2(p.y + 1), z: r2(p.z), r: 1.2 });
        p.hp = 0; this.kill(inst, p, by && by !== p ? by : null, 'deathpunch');
        this.dirty(p);
      }
    }
    // A Rick reverses it (a few taps on the right pressure points, a lot of complaining).
    unpunch(p, why) {
      if (!p.dp) return;
      p.dp = null;
      p.inst.ev({ k: 'dpstep', id: p.id, s: -1 });
      this.priv(p, { k: 'dp', s: 0 });
      this.toast(p, why);
      this.dirty(p);
    }
    onUnpunch(p, m) {
      const q = this.players.get(m.id);
      if (p.arch !== 'genius' || p.dead || !q || !q.dp || !this.near(p, q)) return;
      this.unpunch(q, p.name + ' reversed the death punch. You can walk normally again.');
      this.toast(p, 'You reversed ' + q.name + '\'s death punch.');
    }
    tickPunchedNpcs(inst) {
      const now = this.time;
      for (const id of inst.dpSet) {
        const n = inst.npcs.get(id);
        if (!n || !n.dp || now > n.dp.until) { inst.dpSet.delete(id); if (n) n.dp = null; continue; }
        const r = this.stepCount(n, now);
        if (!r) continue;
        inst.ev({ k: 'dpstep', n: n.id, s: n.dp.steps });
        if (r === 2) {
          const by = this.players.get(n.dp.by);
          inst.dpSet.delete(id); n.dp = null;
          inst.hurtNpc(n, n.hp + 1, by && by.inst === inst ? by : null);
        }
      }
    }

    // ----- Talking to locals -----
    onTalk(p, nid) {
      const inst = p.inst, now = this.time;
      const n = inst.npcs.get(nid);
      if (p.dead || !n || now < p.cdTalk || dist2(n.x, n.z, p.x, p.z) > 5 * 5) return;
      p.cdTalk = now + 1.2;
      const T = n.T;
      const say = (text) => inst.ev({ k: 'say', n: n.id, by: p.id, text });
      if (T.hostile) { say(pick(['GRAAAH!', '*hisses*', '*snaps at you*', '...food?'])); return; }
      if (n.owner === p.id && n.ownerUntil > now) { say(pick(['We are with you.', 'Yes, friend?', 'Point us at someone.'])); return; }
      if (n.angry === p.id && n.angryUntil > now) { say(pick(['Oh, NOW you want to talk?', 'Get away from me!', 'I am still mad at you.'])); return; }
      if (!n.talkedBy.has(p.id)) { n.talkedBy.add(p.id); this.progress(p, 'talk'); }
      const egg = MM.EGGS.find(E => E.kind === 'npc' && E.npc === n.type);
      if (egg) this.findEgg(p, egg.id);
      // Errands: hand over the goods if this local is the one waiting for them.
      for (const e of p.prog.errands) {
        if (e.dim === inst.dimId && e.npc === n.type && (p.inv[e.m] || 0) >= e.n) {
          p.inv[e.m] -= e.n;
          for (const k in e.rew) p.inv[k] = (p.inv[k] || 0) + e.rew[k];
          p.prog.errands = p.prog.errands.filter(x => x !== e);
          say('Is that from ' + e.from + '? Finally! Here, for your trouble.');
          this.priv(p, { k: 'toast', text: 'Errand done: got ' + matText(e.rew) });
          this.progress(p, 'errand');
          return;
        }
      }
      if (n.type === 'coachferatu' && p.tinyRick) { this.feratuReveal(inst, n, p); return; }
      if (n.type === 'liusin') { this.liuSin(p, n, say); return; }
      if (n.cast && n.cast.arch === 'teen' && p.arch === 'genius' && p.st.ship && p.vessel && (p.ship || p.vessel.parked)) { this.takeNpcAlong(p, n, say); return; }
      if (p.dp && n.cast && n.cast.arch === 'genius') { say(pick(['Five-step death punch? Hold still. *burp* There. Walk it off. Forwards, even.', 'Ugh, Liu Sin again? Hold still.'])); this.unpunch(p, n.name + ' reversed the death punch.'); return; }
      // A Rick offers a Morty the Muscle Memory Serum (MM.ARM).
      if (n.cast && n.cast.arch === 'genius' && p.arch === 'sidekick' && !p.prog.arm && !p.offer) {
        p.offer = { n: n.id, serum: true, want: {}, get: {}, until: now + 25 };
        say(pick(['Morty, roll up your sleeve. Muscle memory serum: a dead warrior\'s arm, in a syringe. You\'ll be un-*burp*-stoppable.', 'Here, Morty. It makes your arm a fighter\'s arm. Side effects: the arm has opinions.']));
        this.priv(p, { k: 'offer', n: n.id, name: n.name, serum: 1, want: {}, get: {} });
        return;
      }
      // Otherwise something random happens. Locals are like that.
      const w = Object.assign({}, T.moods);
      if (inst.boosted()) { w.gift = (w.gift || 0) * 2.5; w.trade = (w.trade || 0) * 1.5; }
      if (p.prog.errands.length >= 3) w.errand = 0;
      if (p.ship) w.prank = 0;
      let total = 0;
      for (const k in w) total += w[k];
      let r = Math.random() * total, mood = 'line';
      for (const k in w) { r -= w[k]; if (r <= 0) { mood = k; break; } }
      const line = n.cast ? pick(MM.CAST_TALK_AT[n.cast.key] || MM.CAST_TALK[n.cast.arch] || ['...']) : T.talk ? pick(T.talk) : '...';
      const mat = inst.dim.mat;
      switch (mood) {
        case 'gift': {
          const k = Math.random() < 0.7 ? mat : 's', amt = ri(1, 3);
          p.inv[k] = (p.inv[k] || 0) + amt;
          say(pick(['You look like you need this.', 'Take it, I have too many.', 'A gift! Do not ask where it came from.']));
          this.toast(p, n.name + ' gave you ' + amt + ' ' + MM.MATERIALS[k].name);
          this.dirty(p);
          break;
        }
        case 'trade': {
          const others = MM.MAT_IDS.filter(k => k !== mat);
          const owned = others.filter(k => (p.inv[k] || 0) >= 2);
          const want = owned.length ? pick(owned) : pick(others);
          const wn = ri(2, 4), gn = wn + ri(1, 3);
          p.offer = { n: n.id, want: { [want]: wn }, get: { [mat]: gn }, until: now + 25 };
          say('I will give you ' + gn + ' ' + MM.MATERIALS[mat].name + ' for ' + wn + ' ' + MM.MATERIALS[want].name + '. Deal?');
          this.priv(p, { k: 'offer', n: n.id, name: n.name, want: p.offer.want, get: p.offer.get });
          break;
        }
        case 'errand': {
          const dims = MM.DIMS.filter(d => d.id !== inst.dimId && !d.hidden);
          const D = pick(dims);
          const locals = D.npc.map(x => x[0]).filter(t => !MM.NPCS[t].hostile && MM.NPCS[t].talk);
          if (!locals.length) { say(line); break; }
          const who = pick(locals), amt = ri(2, 4);
          const e = { id: this.ent(), dim: D.id, npc: who, m: mat, n: amt, from: n.name, rew: { [D.mat]: amt + 2, s: 3 } };
          p.prog.errands.push(e);
          say('Could you take ' + amt + ' ' + MM.MATERIALS[mat].name + ' to any ' + MM.NPCS[who].name + ' in ' + D.name + '? They will pay you.');
          this.toast(p, 'New errand (J): ' + amt + ' ' + MM.MATERIALS[mat].name + ' to a ' + MM.NPCS[who].name + ' in ' + D.name);
          p.progDirty = true;
          break;
        }
        case 'buff': {
          const b = pick(['sprint', 'shield', 'heal', 'shrink']);
          if (b === 'sprint') p.fx.sprint = now + 8;
          if (b === 'shield') p.fx.shield = now + 6;
          if (b === 'heal') p.hp = p.maxHp;
          if (b === 'shrink') p.fx.shrink = now + 6;
          say({ sprint: 'Drink this. It is mostly coffee.', shield: 'Here, a lucky charm. It hums.', heal: 'You look terrible. Let me fix that.', shrink: 'Oops. I sneezed on you. You will be fine in a bit.' }[b]);
          this.dirty(p);
          break;
        }
        case 'angry':
          n.angry = p.id; n.angryUntil = now + 20;
          say(pick(['Did you just look at me funny?', 'You! You are the one who blew up my mailbox!', 'That is it, I am calling the multiverse police. After I punch you.', 'How DARE you.']));
          break;
        case 'follow':
          n.owner = p.id; n.ownerUntil = now + 60;
          say(pick(['Adventure? I am in!', 'I will follow you anywhere. For a minute.', 'Finally, something interesting!']));
          break;
        case 'prank': {
          const d = pick(MM.WORLD_IDS.filter(x => x !== inst.dimId));
          say(pick(['Want to see a magic trick?', 'Hold still. This will tickle.', 'Surprise!']));
          inst.ev({ k: 'kiosk', id: p.id });
          this.later(0.6, () => { if (this.players.get(p.id) === p && p.inst === inst && !p.dead) { this.toast(p, n.name + ' pranked you into ' + MM.DIM_BY_ID[d].name + '!'); this.travel(p, d, null); } });
          break;
        }
        case 'dance':
          n.dance = now + 6;
          say(pick(['This calls for a dance!', '*starts dancing for no reason*', 'Music only I can hear!']));
          break;
        default: say(line);
      }
    }

    onAnswer(p, a) {
      const o = p.offer;
      p.offer = null;
      if (!o || this.time > o.until || !a) return;
      if (o.serum) { if (p.arch === 'sidekick' && !p.prog.arm) this.armUp(p); return; }
      if (o.dpunch) {
        if (p.prog.dpunch) return;
        for (const k in o.want) if ((p.inv[k] || 0) < o.want[k]) { this.toast(p, 'Liu Sin does not teach for free. You need ' + matText(o.want) + '.'); return; }
        for (const k in o.want) p.inv[k] -= o.want[k];
        p.prog.dpunch = 1; p.progDirty = true; p.saveDirty = true;
        this.toast(p, 'You learned the Five-Step Death Punch! Press 8 (or the fist button) right next to someone. Five steps later, they drop.');
        this.dirty(p);
        return;
      }
      if (o.ask) { const by = this.players.get(o.from); if (!this.near(by, p) || !(by.inv['q:' + o.ask] > 0)) { this.toast(p, 'Too late: they are gone, or it is gone.'); return; } this.useOnNow(by, p, o.ask); return; }
      for (const k in o.want) if ((p.inv[k] || 0) < o.want[k]) { this.toast(p, 'You do not have enough ' + MM.MATERIALS[k].name + '.'); return; }
      for (const k in o.want) p.inv[k] -= o.want[k];
      for (const k in o.get) p.inv[k] = (p.inv[k] || 0) + o.get[k];
      this.toast(p, 'Traded for ' + matText(o.get));
      this.dirty(p);
    }

    onChat(p, text) {
      const clean = MM.sanitizeChat(text);
      if (!clean) return;
      const msg = JSON.stringify({ t: 'c', id: p.id, name: p.name, home: p.home, dim: p.inst.dimId, text: clean });
      for (const o of this.players.values()) this.send(o, msg);
      this.sayEgg(p, clean);
    }

    youState(p) {
      const now = this.time;
      return { t: 'y', hp: Math.max(0, Math.round(p.hp)), max: p.maxHp, inv: p.inv,
        ch: p.charges, chMax: p.st.gun ? p.st.gun.charges : 0, bor: p.borrow || 0, chIn: p.chargeAt ? r2(p.chargeAt - now) : 0,
        ab: r2(Math.max(0, p.cdAb - now)), chaos: p.prog.chaos, kills: p.kills, deaths: p.deaths, dead: p.dead,
        rsIn: p.dead ? r2(Math.max(0, p.respawnAt - now)) : 0, fx: this.fxBits(p, now), ship: p.ship, car: !!p.car,
        ab: p.aboard ? [p.aboard.owner, p.aboard.crew.get(p.id) || 1, p.aboard.parked ? p.aboard.id : 0, p.aboard.kind] : 0, pk: p.vessel && p.vessel.parked ? [p.vessel.id, p.vessel.inst.dimId] : 0 };
    }

    // Your life path, upgrades and errands (sent when they change).
    progState(p) {
      const pr = p.prog, wall = this.wall(), tasks = {};
      for (const t of p.A.life.daily) tasks[t] = Math.max(0, Math.ceil(((pr.tasks[t] || 0) - wall) / 1000));
      return { t: 'pg', up: pr.up, step: pr.step, grants: pr.grants, cnt: pr.cnt, errands: pr.errands, tasks, title: pr.title || '', st: p.st, found: pr.found || [],
        stamps: pr.stamps || [], rides: pr.rides || {}, fish: pr.fish || {}, best: pr.best || {}, eggs: pr.eggs || [], arm: pr.arm || null, armDone: pr.armDone || 0, dpunch: pr.dpunch ? 1 : 0 };
    }

    // ----- The main loop -----
    update(dt) {
      this.time += dt;
      this.tickN++;
      const now = this.time;
      if (this.timers.length) {
        const due = this.timers.filter(t => t.at <= now);
        if (due.length) { this.timers = this.timers.filter(t => t.at > now); for (const t of due) t.fn(); }
      }
      for (const p of this.players.values()) {
        if (p.st.gun && p.chargeAt && now >= p.chargeAt) {
          p.charges = Math.min(p.st.gun.charges, p.charges + 1);
          p.chargeAt = p.charges < p.st.gun.charges ? now + p.st.gun.recharge : 0;
          this.dirty(p);
        }
        if (p.hack) this.tickHack(p);
        if (p.ride) this.tickRide(p);
        if (p.aboard) this.tickAboard(p);
        if (p.bout) this.tickBout(p, dt);
        if (p.trade && p.trade.a === p && this.tickN % 30 === 0 && !this.near(p.trade.a, p.trade.b)) this.tradeEnd(p.trade, 'You moved too far apart.');
        if (p.prog.arm && !p.dead) this.tickArm(p, now);
        if (p.dp) this.tickPunched(p, now);
        if (p.tinyRick && !p.dead && now >= (p.tinyWhisper || 0)) { if (p.tinyWhisper) this.toast(p, pick(MM.TINYRICK_WHISPERS)); p.tinyWhisper = now + 35 + Math.random() * 25; }
        if (p.arch === 'mutant' && !p.dead && p.hp < p.maxHp && this.tickN % 10 === 0) { p.hp = Math.min(p.maxHp, p.hp + 1); this.dirty(p); }
        // World rules: the living flesh heals you; the toxic air hurts (never below a tenth).
        const q = p.inst && p.inst.dim.quirk;
        if (q === 'regen' && !p.dead && p.hp < p.maxHp && this.tickN % 60 === 0) { p.hp = Math.min(p.maxHp, p.hp + 2); this.dirty(p); }
        if ((q === 'toxic' || q === 'hot') && !p.dead && now >= p.fx.shield && now >= p.fx.prot && !p.ship && p.hp > p.maxHp * 0.1 && this.tickN % 75 === 0) { p.hp -= 1; p.inst.ev({ k: 'dmg', p: p.id, d: 1, by: 0 }); this.dirty(p); }
      }
      for (const inst of this.instances.values()) {
        if (inst.players.size === 0 && inst.idx > 0 && inst.portals.size === 0 && now - inst.emptySince > 60) { this.instances.delete(inst.key); continue; }
        if (inst.players.size > 0 || inst.portals.size > 0 || inst.projs.length) inst.tick(dt);
      }
      const snap = this.tickN % MM.SNAP_EVERY === 0;
      for (const inst of this.instances.values()) {
        if (inst.players.size === 0) { inst.out.length = 0; continue; }
        if (inst.out.length) {
          const msg = JSON.stringify({ t: 'ev', l: inst.out });
          inst.out = [];
          for (const p of inst.players.values()) this.send(p, msg);
        }
        if (snap) {
          const msg = inst.snapshot();
          for (const p of inst.players.values()) this.send(p, msg);
        }
      }
      for (const p of this.players.values()) {
        if (p.dirtyFlag && p.inst) this.checkSteps(p);
        if (p.pv && p.pv.length) { this.send(p, { t: 'pv', l: p.pv }); p.pv = []; }
        if (p.dirtyFlag || (snap && this.tickN % 15 === 0)) { p.dirtyFlag = false; this.send(p, this.youState(p)); }
        if (p.progDirty || this.tickN % 150 === 0) { p.progDirty = false; this.send(p, this.progState(p)); }
      }
      if (this.tickN % 150 === 0) this.broadcastPop();
      if (this.tickN % 60 === 0) this.castTick();
      if (this.tickN % 15 === 0) this.raceLobby();
      if (this.tickN % 300 === 0) for (const p of this.players.values()) if (p.saveDirty) this.save(p);
    }

    saveAll() { for (const p of this.players.values()) this.save(p); }

    // Who is where, plus the multiverse-wide chaos leaderboard.
    broadcastPop() {
      const msg = JSON.stringify(Object.assign({ t: 'pop' }, this.stats(), { top: this.top() }));
      for (const p of this.players.values()) this.send(p, msg);
    }
    top() {
      return [...this.players.values()].sort((a, b) => b.prog.chaos - a.prog.chaos).slice(0, 10)
        .map(p => [p.name, p.home, p.prog.chaos, p.kills, p.inst ? p.inst.dimId : '', p.bot ? 1 : 0, p.prog.title || MM.ARCHETYPES[p.arch].name]);
    }
    stats() {
      const d = {};
      for (const id of MM.DIM_IDS) if (!MM.HOME_RE.test(id)) d[id] = 0;   // home dimensions only when someone is there
      for (const p of this.players.values()) if (p.inst && !(p.inst.dimId in d)) d[p.inst.dimId] = 0;
      let bots = 0;
      for (const p of this.players.values()) { if (p.inst) d[p.inst.dimId]++; if (p.bot) bots++; }
      return { total: this.players.size, bots, d, instances: this.instances.size };
    }
  }

  MM.Host = Host;
  MM.cleanProgress = cleanProgress;   // (tests)
  MM.cleanProgress = cleanProgress;
  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
