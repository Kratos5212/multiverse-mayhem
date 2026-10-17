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
    if (c.use && typeof c.use === 'object') for (const k in c.use) if (MM.TASKS[k]) p.cnt.use[k] = num(c.use[k], 1e6);
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
    npcRow(n) { return [n.id, n.type, r2(n.x), r2(n.y), r2(n.z), r2(n.r), Math.round(n.hp / n.T.hp * 100), n.seed, n.name]; }

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
        turrets: [...this.turrets.values()].map(t => [t.id, t.owner, r2(t.x), r2(t.y), r2(t.z)]),
        pairs: [...this.players.values()].flatMap(p => (p.pp || []).map((P, c) => P ? Object.assign({ o: p.id, c }, P) : null).filter(Boolean)),
        event: this.event ? { name: this.event.E.name, text: this.event.E.text, left: r2(this.event.until - this.host.time) } : null,
      };
    }
    portalRow(po) { return { id: po.id, x: r2(po.x), y: r2(po.y), z: r2(po.z), r: r2(po.r), d: po.destDim, col: po.col, st: po.st || 'swirl', ttl: r2(po.until - this.host.time) }; }

    // ----- The tick -----
    tick(dt) {
      const now = this.host.time;
      this.tickProjectiles(dt, now);
      this.tickNpcs(dt, now);
      this.tickTurrets(dt, now);
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
    tickEvents(now) {
      const ev = this.event;
      if (ev) {
        if (now >= ev.until) {
          this.ev({ k: 'world', end: 1, name: ev.E.name });
          this.event = null;
          this.nextEvent = now + 150 + Math.random() * 150;
        } else if (ev.booms > 0 && now >= ev.nextBoom) {
          ev.booms--; ev.nextBoom = now + ev.E.dur / (ev.E.booms + 1);
          const p = pick([...this.players.values()]);
          if (p) {
            const a = Math.random() * 6.28, d = 6 + Math.random() * 20;
            const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
            this.explode(x, MM.heightAt(this.dimId, x, z), z, 5, 15, null, 'meteor', { propDmg: 60 });
            this.spawnPickup(this.dim.mat, true, { x: x + 1, z }, 2);
          }
        }
        return;
      }
      if (now < this.nextEvent) return;
      const list = MM.EVENTS[this.dimId];
      if (!list) return;
      const E = pick(list);
      this.event = { E, until: now + E.dur, booms: E.booms || 0, nextBoom: now + 2 };
      this.ev({ k: 'world', name: E.name, text: E.text, left: E.dur });
      const players = [...this.players.values()];
      if (E.spawn) for (const [type, n] of E.spawn) for (let i = 0; i < n; i++) {
        const p = pick(players), a = Math.random() * 6.28, d = 14 + Math.random() * 16;
        const x = Math.max(-MM.boundOf(this.dimId) + 25, Math.min(MM.boundOf(this.dimId) - 25, p.x + Math.cos(a) * d)), z = Math.max(-MM.boundOf(this.dimId) + 25, Math.min(MM.boundOf(this.dimId) - 25, p.z + Math.sin(a) * d));
        this.spawnNpc(type, true, { at: { x, z }, until: now + E.dur + 20 });
      }
      if (E.loot) for (let i = 0; i < E.loot[1]; i++) {
        const p = pick(players), a = Math.random() * 6.28, d = 4 + Math.random() * 26;
        this.spawnPickup(E.loot[0], true, { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d }, ri(1, 2));
      }
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
        for (const p of this.players.values()) {
          if (p.dead || p.id === pr.owner || (shooter && !this.host.canHurt(shooter, p))) continue;   // shots pass through people not fighting
          const s = this.host.scaleOf(p);
          const rr = (p.ship ? 1.8 : 0.85 * s) + (pr.rad || 0.15);
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, p.x, p.y + (p.ship ? 0.8 : 1.0 * s), p.z) < rr * rr) { hit = { p }; break; }
        }
        if (!hit) for (const n of this.npcs.values()) {
          if (n.owner === pr.owner && n.ownerUntil > now) continue;
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
        if (owner && n.owner === owner.id && n.ownerUntil > this.host.time) continue;
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
        if (n.T.hostile) { n.angry = owner.id; n.angryUntil = this.host.time + 12; }
        // Police, Secret Service and Marines protect people (and each other).
        if (!n.T.hostile && (n.T.human || n.T.guard)) for (const g of this.npcs.values()) {
          if (g.T.guard && !(g.owner && g.ownerUntil > this.host.time) && dist2(g.x, g.z, n.x, n.z) < 40 * 40) { g.angry = owner.id; g.angryUntil = this.host.time + 25; }
        }
      }
      this.ev({ k: 'dmg', n: n.id, d: dmg });
      if (n.hp > 0) return;
      this.npcs.delete(n.id);
      this.ev({ k: 'npc-', id: n.id, die: 1 });
      let i = 0;
      for (const k in n.T.drop) this.spawnPickup(k, true, { x: n.x + (i++ - 0.5) * 1.4, z: n.z }, n.T.drop[k]);
      if (owner) { owner.prog.chaos += 2; this.host.progress(owner, 'kill', n.type); }
      if (!n.temp) {
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

    tickNpcs(dt, now) {
      for (const n of this.npcs.values()) {
        const T = n.T;
        let goal = null, speed = T.speed;
        const owner = n.owner && now < n.ownerUntil ? this.host.players.get(n.owner) : null;
        if (n.owner && !owner) { n.owner = 0; this.ev({ k: 'nfree', n: n.id }); }
        if (now < n.stun || now < n.dance) { n.y = MM.heightAt(this.dimId, n.x, n.z) + (T.fly || 0); continue; }
        if (owner && owner.inst === this) {
          // A follower: fight whatever is near its friend, otherwise tag along.
          let best = null, bd = 12 * 12, isNpc = true;
          for (const m of this.npcs.values()) {
            if (m === n || !m.T.hostile || (m.owner && now < m.ownerUntil)) continue;
            const d = dist2(m.x, m.z, n.x, n.z);
            if (d < bd) { bd = d; best = m; }
          }
          for (const p of this.players.values()) {
            if (p === owner || !this.visible(p, now) || !this.host.canHurt(owner, p)) continue;
            const d = dist2(p.x, p.z, n.x, n.z);
            if (d < Math.min(bd, 7 * 7)) { bd = d; best = p; isNpc = false; }
          }
          if (best) {
            goal = best; speed *= 1.5;
            if (bd < (T.r + 1.3) ** 2 && now >= n.cd) {
              n.cd = now + 1.0;
              this.ev({ k: 'bite', n: n.id });
              if (isNpc) this.hurtNpc(best, 8, owner); else this.host.hurtPlayer(this, best, 6, owner, 'follower');
            }
          } else if (dist2(owner.x, owner.z, n.x, n.z) > 9) { goal = { x: owner.x - Math.sin(owner.r) * 2, z: owner.z - Math.cos(owner.r) * 2 }; speed = Math.max(speed, owner.st.speed); }
        } else if (T.hostile || (n.angry && now < n.angryUntil)) {
          // Monsters mind their own business: they go for you only if you come close
          // (or hit them), and give up once you are well away from their patch.
          let best = null, bd = MM.AGGRO_RANGE * MM.AGGRO_RANGE;
          if (n.angry && now < n.angryUntil) { const p = this.host.players.get(n.angry); if (p && p.inst === this && !p.dead) best = p, bd = dist2(p.x, p.z, n.x, n.z); }
          else if (dist2(n.x, n.z, n.home.x, n.home.z) < MM.LEASH * MM.LEASH) for (const p of this.players.values()) {
            if (!this.visible(p, now)) continue;
            const d = dist2(p.x, p.z, n.x, n.z);
            if (d < bd) { bd = d; best = p; }
          }
          if (best && (dist2(n.x, n.z, n.home.x, n.home.z) > MM.LEASH * MM.LEASH * 1.6 || bd > 30 * 30)) { best = null; n.angry = 0; }
          if (best) {
            goal = best; speed *= 1.15;
            if (bd < (T.r + 1.1) * (T.r + 1.1) && now >= n.cd && Math.abs(best.y - n.y) < 3) {
              n.cd = now + 1.2;
              this.ev({ k: 'bite', n: n.id });
              this.host.hurtPlayer(this, best, T.dmg || 6, null, n.type);
            }
          }
        } else if (now < n.flee) {
          const p = this.host.players.get(n.target);
          if (p && p.inst === this) { const dx = n.x - p.x, dz = n.z - p.z, l = Math.hypot(dx, dz) || 1; goal = { x: n.x + dx / l * 5, z: n.z + dz / l * 5 }; speed *= 2; }
        }
        if (!goal) {
          if (now >= n.wait && dist2(n.x, n.z, n.tx, n.tz) < 1) {
            n.wait = now + 1 + Math.random() * 4;
            const a = Math.random() * 6.28, d = 4 + Math.random() * 14;
            n.tx = Math.max(-MM.boundOf(this.dimId) + 25, Math.min(MM.boundOf(this.dimId) - 25, n.home.x + Math.cos(a) * d));
            n.tz = Math.max(-MM.boundOf(this.dimId) + 25, Math.min(MM.boundOf(this.dimId) - 25, n.home.z + Math.sin(a) * d));
          }
          if (now >= n.wait) goal = { x: n.tx, z: n.tz };
        }
        if (goal) {
          const dx = goal.x - n.x, dz = goal.z - n.z, l = Math.hypot(dx, dz);
          if (l > 0.3) {
            const step = Math.min(l, speed * dt);
            let nx = n.x + dx / l * step, nz = n.z + dz / l * step;
            [nx, nz] = MM.collideProps(this.dimId, nx, nz, T.r, null);
            [nx, nz] = MM.collideWalls(this.dimId, nx, nz, T.r);
            const lim = MM.boundOf(this.dimId) - (this.dim.interior ? 0.8 : 15), limZ = MM.boundZOf(this.dimId) - (this.dim.interior ? 0.8 : 15);
            n.x = Math.max(-lim, Math.min(lim, nx)); n.z = Math.max(-limZ, Math.min(limZ, nz));
            n.r = Math.atan2(dx, dz);
          }
        }
        n.y = MM.heightAt(this.dimId, n.x, n.z) + (T.fly ? T.fly + Math.sin(now * 1.3 + n.id) * 0.8 : 0);
      }
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
        for (const n of this.npcs.values()) {
          if (!n.T.hostile) continue;
          const d = dist2(n.x, n.z, t.x, t.z);
          if (d < bd) { bd = d; best = n; isNpc = true; }
        }
        if (!best) continue;
        t.cd = now + 0.45;
        const ty = isNpc ? best.y + best.T.h / 2 : best.y + 1;
        const ox = t.x, oy = t.y + 1.3, oz = t.z;
        const dx = best.x - ox, dy = ty - oy, dz = best.z - oz, l = Math.hypot(dx, dy, dz) || 1;
        t.aim = Math.atan2(dx, dz);
        this.host.fireProjectile(this, { owner: t.owner, kind: 'turret', x: ox + dx / l, y: oy + dy / l, z: oz + dz / l, dx: dx / l, dy: dy / l, dz: dz / l, speed: 55, range: 30, dmg: 6 });
      }
    }

    // ----- Portals -----
    tickPortals(now) {
      for (const po of [...this.portals.values()]) {
        if (now >= po.until) { this.portals.delete(po.id); this.ev({ k: 'po-', id: po.id }); continue; }
        for (const p of [...this.players.values()]) {
          if (p.dead || now < p.portalCool) continue;
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
        case 'talk': this.onTalk(p, m.n); break;
        case 'ans': this.onAnswer(p, m.a); break;
        case 'ship': this.onShip(p, m.on); break;
        case 'pvp': p.pvp = m.on; this.toast(p, m.on ? 'Fights on: players who also turned fights on can hurt you, and you them.' : 'Fights off: no other player can hurt you.'); break;
        case 'drive': this.onDrive(p, m.d); break;
        case 'orbit': this.onOrbit(p); break;
        case 'land': this.onLand(p, m.d); break;
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
      // One of each variant: only one Rick C-137 (or Morty Y-231...) at a time. A taken code
      // gets you a fresh one from the same letter.
      const asked = MM.sanitizeHome(m.home);
      let home = asked;
      const taken = h => [...this.players.values()].some(o => o.arch === m.arch && o.home === h);
      if (taken(home)) { const L = home.replace(/[^A-Z]/g, '') || 'X'; do home = L + '-' + (1 + Math.floor(Math.random() * 999)); while (taken(home)); }
      const p = {
        id: this.nextId++, conn: c.conn, bot: c.bot, token,
        name: MM.sanitizeName(m.name), home, look: MM.sanitizeLook(m.look), arch: m.arch, A, pvp: m.pvp !== false,
        prog, inv: prog.inv, st: null,
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
      // You start in your own world: the one your character lives in.
      const starts = MM.startWorlds(m.arch, p.home);
      if (p.home !== asked && !p.bot) this.toast(p, A.name + ' ' + asked + ' is already here, so you are ' + A.name + ' ' + p.home + '.');
      this.travel(p, m.dim && starts.includes(m.dim) ? m.dim : starts[0], null, null, true);
    }

    restat(p) {
      const old = p.maxHp;
      p.st = MM.statsOf(p.arch, p.prog.up);
      p.maxHp = p.st.maxHp;
      if (old && p.maxHp > old && !p.dead) p.hp += p.maxHp - old;
      p.hp = Math.min(p.hp, p.maxHp);
      const max = p.st.gun ? p.st.gun.charges : 0;
      if (p.charges > max) p.charges = max;
      if (!p.st.ship) p.ship = false;
    }

    info(p) {
      const up = p.prog.up;
      return { id: p.id, name: p.name, home: p.home, look: p.look, arch: p.arch, bot: p.bot, title: p.prog.title || '',
        gear: { ratsuit: !!up.ratsuit, wings: !!up.wings, jet: !!up.jetpack && !up.wings, engine: !!up.engine, lasers: !!up.lasers, cyberarm: !!up.cyberarm, cyberlegs: !!up.cyberlegs } };
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
      if (p.ship && MM.DIM_BY_ID[dimId] && MM.DIM_BY_ID[dimId].interior) p.ship = false;   // you park the ship to go indoors
      const from = p.inst;
      p.pp = [null, null];   // your portal pair stays behind (and closes)
      if (from) {
        from.players.delete(p.id);
        from.ev({ k: 'leave', id: p.id, via: dimId });
        from.emptySince = this.time;
      }
      const inst = this.instanceWithRoom(dimId, preferInst);
      const spot = at ? { x: at.x, z: at.z, y: MM.heightAt(dimId, at.x, at.z) } : MM.spawnPoint(dimId);
      p.inst = inst;
      p.x = spot.x; p.y = at && at.y !== undefined ? at.y : spot.y + (p.ship ? 3 : 0.1); p.z = spot.z; p.a = 0;
      if (MM.DIM_BY_ID[dimId].planets && !p.ship) p.ship = !!p.st.ship;   // nobody walks in space
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

    scaleOf(p) { return this.time < p.fx.shrink ? 0.5 : 1; }

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
      return b;
    }

    // Top speed right now. The client uses the same factors (js/game.js).
    speedOf(p) {
      const now = this.time;
      if (now < p.fx.cuff) return 1;
      const base = p.ship ? p.st.ship.speed * MM.SHIP_BOOST : p.st.speed * (p.st.fly ? 1.35 : 1) * (p.st.sprint || 1);   // the most you can go: sprinting
      return base * (now < p.fx.sprint ? 1.8 : 1) * (now < p.fx.shrink ? 0.75 : 1) * (now < p.fx.guilt ? 0.6 : 1) * (now < p.fx.daze ? 0.5 : 1);
    }

    // ----- Movement validation -----
    onState(c, p, m) {
      if (m.ep !== p.ep || p.dead) return;
      const now = this.time;
      const dt = Math.min(1.0, Math.max(0.05, now - p.lastSt));
      const kb = now < p.kbUntil;
      const allowed = this.speedOf(p) * dt * 1.5 + 1.5 + (kb ? 30 * dt + 3 : 0);
      const lim = MM.boundOf(p.inst.dimId), limZ = MM.boundZOf(p.inst.dimId);
      const x = Math.max(-lim, Math.min(lim, m.x)), z = Math.max(-limZ, Math.min(limZ, m.z));
      const moved = Math.hypot(x - p.x, z - p.z);
      const ground = MM.heightAt(p.inst.dimId, x, z);
      const g = p.inst.dim.gravity;
      const quirk = p.inst.dim.quirk, jv = p.st.jump * (quirk === 'bouncy' ? 1.6 : 1);
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
      p.x = x; p.y = y; p.z = z; p.r = m.r; p.a = m.a === MM.ANIM.dead ? 0 : m.a;
      p.lastSt = now;
      if (p.race || MM.racesIn(p.inst.dimId).length) this.raceStep(p);
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

    dmgMult(p) { return p.st.dmg * (this.time < p.fx.shrink ? 0.5 : 1); }

    // The weapon in use: ship lasers in a ship that has them, a pea shooter in one that doesn't.
    weaponOf(p) {
      if (p.ship) return p.st.ship.lasers ? 'lasers' : 'blaster';
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
      const oy = p.ship ? 1.2 : 1.35 * s;
      this.fireProjectile(p.inst, { owner: p.id, kind: wid, x: p.x + m.dx * (p.ship ? 2 : 0.7), y: p.y + oy + m.dy * 0.7, z: p.z + m.dz * (p.ship ? 2 : 0.7),
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
      if (p.ship) amt *= 0.6;
      if (inst.dim.quirk === 'bouncy') amt *= 0.5;   // Froopyland: nothing here can hurt you. Much.
      amt = Math.max(1, Math.round(amt));
      p.hp -= amt;
      inst.ev({ k: 'dmg', p: p.id, d: amt, by: src ? src.id : 0 });
      this.dirty(p);
      if (p.hp <= 0) this.kill(inst, p, src, how);
    }

    kill(inst, p, src, how) {
      p.hp = 0; p.dead = true; p.deaths++;
      p.respawnAt = this.time + MM.RESPAWN_TIME;
      if (p.ship) { p.ship = false; inst.ev({ k: 'ship', id: p.id, on: false }); }
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
      const s = MM.spawnPoint(p.inst.dimId);
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
        if (!q || q === p || q.dead || q.inst !== from || dist2(q.x, q.z, ox, oz) > MM.TEAM_REACH * MM.TEAM_REACH) continue;
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
      const from = p.inst, ox = p.x, oz = p.z;
      // Every Earth shares the insides (the Smith house, Rick's lab...). Remember which Earth you
      // came in from, and the way out takes you back there instead of to C-137.
      const here = MM.DIM_BY_ID[from.dimId], to = MM.DIM_BY_ID[l.door.dim];
      let dest = l.door.dim;
      if (to.interior || to.pocket) { if (!(here.interior || here.pocket)) p.doorBack = here.variantOf ? from.dimId : null; }
      else if (p.doorBack && MM.DIM_BY_ID[p.doorBack].variantOf === dest) { dest = p.doorBack; p.doorBack = null; }
      p.inst.ev({ k: 'kiosk', id: p.id });
      this.travel(p, dest, { x: l.door.x, z: l.door.z });
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
      if (on && MM.helpless(p.arch, p.prog.up)) { this.toast(p, MM.HELPLESS_TEXT); return; }
      if (p.dead || !p.st.ship || p.ship === on) return;
      if (on && p.inst.dim.interior) { this.toast(p, 'No room to fly in here. Take the ship outside.'); return; }
      p.ship = on;
      p.kbUntil = this.time + 1;     // stepping out mid-air: let the fall happen
      p.inst.ev({ k: 'ship', id: p.id, on });
      this.dirty(p);
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
    onLand(p, d) {
      const S = p.inst.dim, now = this.time;
      if (p.dead || !p.ship || !S.planets || now < (p.cdOrbit || 0)) return;
      const P = S.planets.find(q => q.dim === d);
      if (!P || Math.hypot(p.x - P.x, p.y - P.y, p.z - P.z) > P.r + 70) return;
      const home = S.planets[0].dim, sh = p.st.ship, H = MM.DIM_BY_ID[home];
      const why = d === home ? '' : MM.travelWhy('ship', H.variantOf === 'suburbia' ? 'suburbia' : home, d, { hull: true, engine: sh.engine, drive: sh.drive });
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

    // Ring races (shared/races.js): through the first ring starts the clock, each ring in
    // order, the last one before time runs out pays (once every MM.RACE_CD seconds).
    raceStep(p) {
      const now = this.time, list = MM.racesIn(p.inst.dimId);
      const near = (R, i) => { const q = MM.ringAt(R, i, p.inst.dimId); return (p.x - q.x) ** 2 + (p.y + 1 - q.y) ** 2 + (p.z - q.z) ** 2 < R.r * R.r; };
      const fits = R => !p.dead && (R.ship ? p.ship : !p.ship);
      if (p.race) {
        const R = MM.RACE_BY_ID[p.race.id];
        if (!list.includes(R) || !fits(R)) { p.race = null; this.priv(p, { k: 'race', id: null }); this.toast(p, R.name + ': you left the race.'); return; }
        if (now > p.race.t0 + R.time) { p.race = null; this.priv(p, { k: 'race', id: null }); this.toast(p, R.name + ': out of time. The first ring starts it again.'); return; }
        if (!near(R, p.race.next)) return;
        p.race.next++;
        if (p.race.next < R.rings.length) { this.priv(p, { k: 'race', id: R.id, next: p.race.next, left: r2(p.race.t0 + R.time - now) }); return; }
        const t = Math.round((now - p.race.t0) * 10) / 10, best = (p.prog.best || (p.prog.best = {}))[R.id], wall = this.wall();
        p.race = null;
        if (!best || t < best) p.prog.best[R.id] = t;
        const paid = (p.prog.tasks['race_' + R.id] || 0) <= wall;
        if (paid) { p.prog.tasks['race_' + R.id] = wall + MM.RACE_CD * 1000; for (const k in R.give) p.inv[k] = (p.inv[k] || 0) + R.give[k]; }
        this.priv(p, { k: 'race', id: null, done: R.id, t, best: p.prog.best[R.id], record: !best || t < best, give: paid ? R.give : null });
        this.dirty(p);
        return;
      }
      for (const R of list) if (fits(R) && near(R, 0)) {
        p.race = { id: R.id, t0: now, next: 1 };
        this.priv(p, { k: 'race', id: R.id, next: 1, left: R.time });
        return;
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
      if (R.cat === 'gadget') {
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
      let text = Q.text;
      switch (Q.use) {
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
      if (Q.eat) p.inv[key]--;
      if (!p.inv[key]) delete p.inv[key];
      inst.ev({ k: 'curio', id: p.id, q: id });
      this.toast(p, Q.icon + ' ' + text);
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

    // ----- Daily life at landmarks -----
    onUse(p, lid, taskId) {
      if (MM.helpless(p.arch, p.prog.up)) { const l = MM.LANDMARK_BY_ID[lid]; if (l && l.door) this.onDoor(p, lid); else this.toast(p, MM.HELPLESS_TEXT); return; }
      const l = MM.LANDMARK_BY_ID[lid];
      if (p.dead || !l || l.dim !== p.inst.dimId || this.time < p.cdUse) return;
      if (dist2(l.x, l.z, p.x, p.z) > (l.r + MM.USE_RADIUS + 2) ** 2 || !MM.sameFloor(l, p.y)) return;
      p.cdUse = this.time + 1;
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
      if (T.effect === 'borrowgun') { p.borrow = 2; this.dirty(p); }   // Rick's gun: two charges, no recharging
      let text = T.text;
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
      // Otherwise something random happens. Locals are like that.
      const w = Object.assign({}, T.moods);
      if (inst.boosted()) { w.gift = (w.gift || 0) * 2.5; w.trade = (w.trade || 0) * 1.5; }
      if (p.prog.errands.length >= 3) w.errand = 0;
      if (p.ship) w.prank = 0;
      let total = 0;
      for (const k in w) total += w[k];
      let r = Math.random() * total, mood = 'line';
      for (const k in w) { r -= w[k]; if (r <= 0) { mood = k; break; } }
      const line = T.talk ? pick(T.talk) : '...';
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
    }

    youState(p) {
      const now = this.time;
      return { t: 'y', hp: Math.max(0, Math.round(p.hp)), max: p.maxHp, inv: p.inv,
        ch: p.charges, chMax: p.st.gun ? p.st.gun.charges : 0, bor: p.borrow || 0, chIn: p.chargeAt ? r2(p.chargeAt - now) : 0,
        ab: r2(Math.max(0, p.cdAb - now)), chaos: p.prog.chaos, kills: p.kills, deaths: p.deaths, dead: p.dead,
        rsIn: p.dead ? r2(Math.max(0, p.respawnAt - now)) : 0, fx: this.fxBits(p, now), ship: p.ship };
    }

    // Your life path, upgrades and errands (sent when they change).
    progState(p) {
      const pr = p.prog, wall = this.wall(), tasks = {};
      for (const t of p.A.life.daily) tasks[t] = Math.max(0, Math.ceil(((pr.tasks[t] || 0) - wall) / 1000));
      return { t: 'pg', up: pr.up, step: pr.step, grants: pr.grants, cnt: pr.cnt, errands: pr.errands, tasks, title: pr.title || '', st: p.st, found: pr.found || [] };
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
        if (p.arch === 'mutant' && !p.dead && p.hp < p.maxHp && this.tickN % 10 === 0) { p.hp = Math.min(p.maxHp, p.hp + 1); this.dirty(p); }
        // World rules: the living flesh heals you; the toxic air hurts (never below a tenth).
        const q = p.inst && p.inst.dim.quirk;
        if (q === 'regen' && !p.dead && p.hp < p.maxHp && this.tickN % 60 === 0) { p.hp = Math.min(p.maxHp, p.hp + 2); this.dirty(p); }
        if (q === 'toxic' && !p.dead && now >= p.fx.shield && now >= p.fx.prot && !p.ship && p.hp > p.maxHp * 0.1 && this.tickN % 75 === 0) { p.hp -= 1; p.inst.ev({ k: 'dmg', p: p.id, d: 1, by: 0 }); this.dirty(p); }
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
  MM.cleanProgress = cleanProgress;
  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
