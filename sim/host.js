// Multiverse Mayhem: the authoritative game host.
//
// It owns everything that matters: health, damage, inventories, crafting, portals,
// pickups and who is where. Clients only send what they want to do and where they
// are walking; the host checks every message (shared/protocol.js), rate-limits it,
// and validates movement against each archetype's speed before accepting it.
//
// It has no networking of its own. A "conn" is anything with send(string) and
// close(code, reason). server/server.js plugs in WebSockets; the browser plugs in
// an in-memory link for offline play with bots.
(function (root) {
  'use strict';
  const MM = root.MM;

  const r2 = v => Math.round(v * 100) / 100;
  const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

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
      for (const [type, count] of this.dim.npc) for (let i = 0; i < count; i++) this.spawnNpc(type, false);
      for (let i = 0; i < this.dim.pickups.s; i++) this.spawnPickup('s', false);
      for (let i = 0; i < this.dim.pickups.c; i++) this.spawnPickup('c', false);
    }

    ev(e) { this.out.push(e); }


    // ----- Spawning -----
    spawnNpc(type, announce) {
      const t = MM.NPCS[type];
      const s = MM.randomSpot(this.dimId, Math.random, 25, 140);
      const n = { id: this.host.ent(), type, T: t, x: s.x, y: s.y + (t.fly || 0), z: s.z, r: Math.random() * 6.28, hp: t.hp,
        tx: s.x, tz: s.z, wait: 0, cd: 0, flee: 0, target: 0, home: s };
      this.npcs.set(n.id, n);
      if (announce) this.ev({ k: 'npc+', n: this.npcRow(n) });
    }
    npcRow(n) { return [n.id, n.type, r2(n.x), r2(n.y), r2(n.z), r2(n.r), Math.round(n.hp / n.T.hp * 100)]; }

    spawnPickup(kind, announce, at, count) {
      const s = at || MM.randomSpot(this.dimId, Math.random, 12, 140);
      const pk = { id: this.host.ent(), c: kind, n: count || 1, x: s.x, y: MM.heightAt(this.dimId, s.x, s.z), z: s.z, drop: !!at };
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
      };
    }
    portalRow(po) { return { id: po.id, x: r2(po.x), y: r2(po.y), z: r2(po.z), r: r2(po.r), d: po.destDim, col: po.col, ttl: r2(po.until - this.host.time) }; }

    // ----- The tick -----
    tick(dt) {
      const now = this.host.time;
      this.tickProjectiles(dt, now);
      this.tickNpcs(dt, now);
      this.tickTurrets(dt, now);
      this.tickPortals(now);
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
      // Keep the world stocked with scrap and crystals.
      if (this.host.tickN % 30 === 0) {
        let s = 0, c = 0;
        for (const pk of this.pickups.values()) if (!pk.drop) { if (pk.c === 's') s++; else c++; }
        if (s < this.dim.pickups.s) this.spawnPickup('s', true);
        if (c < this.dim.pickups.c) this.spawnPickup('c', true);
        for (const pk of this.pickups.values()) if (pk.drop && now - (pk.born || (pk.born = now)) > 90) { this.pickups.delete(pk.id); this.ev({ k: 'pk-', id: pk.id }); }
      }
    }

    tickProjectiles(dt, now) {
      const keep = [];
      for (const pr of this.projs) {
        const ox = pr.x, oy = pr.y, oz = pr.z;
        if (pr.g) pr.vy -= this.dim.gravity * 0.7 * dt;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
        pr.life -= dt;
        let hit = null;
        // Players
        for (const p of this.players.values()) {
          if (p.dead || p.id === pr.owner) continue;
          const s = this.host.scaleOf(p);
          const rr = 0.85 * s + (pr.rad || 0.15);
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, p.x, p.y + 1.0 * s, p.z) < rr * rr) { hit = { p }; break; }
        }
        if (!hit) for (const n of this.npcs.values()) {
          const rr = n.T.r + (pr.rad || 0.15);
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, n.x, n.y + n.T.h / 2, n.z) < rr * rr) { hit = { n }; break; }
        }
        if (!hit) for (const t of this.turrets.values()) {
          if (t.owner === pr.owner) continue;
          if (segDist2(ox, oy, oz, pr.x, pr.y, pr.z, t.x, t.y + 0.8, t.z) < 1.1 * 1.1) { hit = { t }; break; }
        }
        if (!hit) {
          const props = MM.genProps(this.dimId);
          for (let i = 0; i < props.length; i++) {
            const st = this.props[i];
            if (st.hp <= 0) continue;
            const p = props[i];
            const r = p.r + (pr.rad || 0.15);
            if (pr.y < p.y - 0.5 || pr.y > p.y + p.h) continue;
            if (dist2(pr.x, pr.z, p.x, p.z) < r * r || dist2((ox + pr.x) / 2, (oz + pr.z) / 2, p.x, p.z) < r * r) { hit = { prop: i }; break; }
          }
        }
        const ground = MM.heightAt(this.dimId, pr.x, pr.z);
        if (!hit && pr.y < ground) hit = { ground: true };
        if (!hit && pr.life <= 0) { if (pr.kind === 'gren') hit = { fuse: true }; else continue; }
        if (!hit) { keep.push(pr); continue; }
        // Impact
        const owner = this.host.players.get(pr.owner) || null;
        this.ev({ k: 'hit', id: pr.id, x: r2(pr.x), y: r2(Math.max(pr.y, ground)), z: r2(pr.z) });
        if (pr.kind === 'gren') { this.explode(pr.x, Math.max(pr.y, ground), pr.z, 6.5, 35, owner, 'grenade'); continue; }
        if (hit.p) {
          if (pr.kind === 'shrink') { hit.p.fx.shrink = now + 8; this.host.dirty(hit.p); this.ev({ k: 'shrunk', id: hit.p.id }); }
          this.host.hurtPlayer(this, hit.p, pr.dmg, owner, pr.kind);
        } else if (hit.n) this.hurtNpc(hit.n, pr.dmg, owner);
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
        if (!self || opts.selfDamage) this.host.hurtPlayer(this, p, Math.round(dmg * (0.4 + 0.6 * f)), owner, how);
        if (opts.noSelfKnock && self) continue;
        const kx = p.x - x, kz = p.z - z, kl = Math.hypot(kx, kz) || 1;
        const power = (opts.knock || 14) * (0.5 + f);
        this.host.knock(p, kx / kl * power, 6 + power * 0.5, kz / kl * power);
      }
      for (const n of [...this.npcs.values()]) {
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < rad + n.T.r) this.hurtNpc(n, Math.round(dmg * (1 - d / (rad + n.T.r) * 0.6)), owner);
      }
      for (const t of [...this.turrets.values()]) if (Math.hypot(t.x - x, t.z - z) < rad) this.hurtTurret(t, dmg);
      const props = MM.genProps(this.dimId);
      for (let i = 0; i < props.length; i++) {
        if (this.props[i].hp <= 0) continue;
        const p = props[i];
        const d = Math.hypot(p.x - x, p.z - z) - p.r;
        if (d < rad && y < p.y + p.h + rad * 0.5) this.hurtProp(i, Math.round((opts.propDmg || dmg * 1.8) * (1 - Math.max(0, d) / rad * 0.6)), owner);
      }
    }

    hurtProp(i, dmg, owner) {
      const st = this.props[i];
      if (st.hp <= 0) return;
      st.hp = Math.max(0, st.hp - dmg);
      if (st.hp === 0) {
        st.deadUntil = this.host.time + 60;
        const p = MM.genProps(this.dimId)[i];
        const T = MM.PROPS[p.type];
        // Scrap (and crystals) spill out around the wreck.
        const drops = [['s', T.scrap], ['c', T.crystal || 0]];
        for (const [c, n] of drops) {
          if (!n) continue;
          const a = Math.random() * 6.28;
          this.spawnPickup(c, true, { x: p.x + Math.cos(a) * (p.r + 1.2), z: p.z + Math.sin(a) * (p.r + 1.2) }, n);
        }
        if (owner) { owner.chaos += p.type === 'house' ? 5 : 1; this.host.dirty(owner); }
      }
      this.ev({ k: 'prop', id: i, hp: st.hp });
    }

    hurtNpc(n, dmg, owner) {
      if (!this.npcs.has(n.id)) return;
      n.hp -= dmg;
      n.flee = this.host.time + 4;
      if (owner) n.target = owner.id;
      this.ev({ k: 'dmg', n: n.id, d: dmg });
      if (n.hp > 0) return;
      this.npcs.delete(n.id);
      this.ev({ k: 'npc-', id: n.id, die: 1 });
      if (n.T.drop.s) this.spawnPickup('s', true, { x: n.x + 0.8, z: n.z }, n.T.drop.s);
      if (n.T.drop.c) this.spawnPickup('c', true, { x: n.x - 0.8, z: n.z }, n.T.drop.c);
      if (owner) { owner.chaos += 2; this.host.dirty(owner); }
      const type = n.type;
      this.host.later(25, () => { if (this.host.instances.get(this.key) === this) this.spawnNpc(type, true); });
    }

    hurtTurret(t, dmg) {
      t.hp -= dmg;
      if (t.hp <= 0) { this.turrets.delete(t.id); this.ev({ k: 'tu-', id: t.id }); this.ev({ k: 'boom', x: r2(t.x), y: r2(t.y + 0.8), z: r2(t.z), r: 2.5 }); }
    }

    // ----- NPCs -----
    tickNpcs(dt, now) {
      for (const n of this.npcs.values()) {
        const T = n.T;
        let goal = null, speed = T.speed;
        if (T.hostile) {
          // Chase the nearest player in range. Average Joes are beneath notice.
          let best = null, bd = 22 * 22;
          for (const p of this.players.values()) {
            if (p.dead || p.arch === 'joe' || now < p.fx.sob || now < p.fx.prot) continue;
            const d = dist2(p.x, p.z, n.x, n.z);
            if (d < bd) { bd = d; best = p; }
          }
          if (best) {
            goal = best; speed *= 1.15;
            if (bd < (T.r + 1.1) * (T.r + 1.1) && now >= n.cd) {
              n.cd = now + 1.2;
              this.ev({ k: 'bite', n: n.id });
              this.host.hurtPlayer(this, best, T.dmg, null, n.type);
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
            n.tx = Math.max(-150, Math.min(150, n.home.x + Math.cos(a) * d));
            n.tz = Math.max(-150, Math.min(150, n.home.z + Math.sin(a) * d));
          }
          if (now >= n.wait) goal = { x: n.tx, z: n.tz };
        }
        if (goal) {
          const dx = goal.x - n.x, dz = goal.z - n.z, l = Math.hypot(dx, dz);
          if (l > 0.3) {
            const step = Math.min(l, speed * dt);
            let nx = n.x + dx / l * step, nz = n.z + dz / l * step;
            [nx, nz] = MM.collideProps(this.dimId, nx, nz, T.r, null);
            const lim = MM.WORLD_HALF - 15;
            n.x = Math.max(-lim, Math.min(lim, nx)); n.z = Math.max(-lim, Math.min(lim, nz));
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
          if (p.dead || p.id === t.owner || p.arch === 'joe' || now < p.fx.sob || now < p.fx.prot) continue;
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
          if (dist2(p.x, p.z, po.x, po.z) < MM.PORTAL_RADIUS * MM.PORTAL_RADIUS && p.y < po.y + 3.5 && p.y > po.y - 1.5) {
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
      for (const n of this.npcs.values()) ns.push([n.id, r2(n.x), r2(n.y), r2(n.z), r2(n.r), Math.max(0, Math.round(n.hp / n.T.hp * 100))]);
      const ts = [];
      for (const t of this.turrets.values()) ts.push([t.id, r2(t.aim || 0)]);
      return JSON.stringify({ t: 's', tm: r2(now), p: ps, n: ns, u: ts });
    }
  }

  // ---------------------------------------------------------------- Host
  class Host {
    constructor(opts) {
      opts = opts || {};
      this.name = opts.name || 'Multiverse Mayhem';
      this.cap = opts.cap || MM.INSTANCE_CAP;
      this.maxPlayers = opts.maxPlayers || 2000;
      this.log = opts.log || function () {};
      this.instances = new Map();
      this.players = new Map();
      this.clients = new Map();       // conn -> client record
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
      if (p.inst) { p.inst.players.delete(p.id); p.inst.ev({ k: 'leave', id: p.id }); p.inst.emptySince = this.time; }
      this.players.delete(p.id);
      this.log(`leave ${p.name} (${p.id})`);
    }

    kick(c, why) {
      this.log(`kick ${c.player ? c.player.name : '?'}: ${why}`);
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
      }
    }

    hello(c, m) {
      if (m.v !== MM.VERSION) { this.kick(c, 'This server runs a different version. Refresh the page.'); return; }
      if (this.players.size >= this.maxPlayers) { this.kick(c, 'Server is full'); return; }
      const A = MM.ARCHETYPES[m.arch];
      const p = {
        id: this.nextId++, conn: c.conn, bot: c.bot,
        name: MM.sanitizeName(m.name), home: MM.sanitizeHome(m.home), look: MM.sanitizeLook(m.look), arch: m.arch, A,
        inst: null, ep: 0, x: 0, y: 0, z: 0, r: 0, a: 0, lastSt: this.time, strikes: 0,
        hp: A.hp, maxHp: A.hp, dead: false, respawnAt: 0,
        inv: { s: 0, c: 0, grenade: 1, turret: 0, shrink: 0 }, boots: false, mega: false,
        charges: A.portal ? A.portal.charges : 0, chargeAt: 0,
        cdFire: 0, cdAb: 0, cdKiosk: 0, chatAt: 0,
        fx: { shield: 0, sprint: 0, sob: 0, shrink: 0, guilt: 0, prot: 0 },
        kbUntil: 0, portalCool: 0, chaos: 0, kills: 0, deaths: 0, dirtyFlag: true,
      };
      c.player = p;
      this.players.set(p.id, p);
      this.send(p, { t: 'hi', id: p.id, name: this.name, cap: this.cap, dims: MM.DIM_IDS, you: { name: p.name, home: p.home, arch: p.arch } });
      this.log(`join ${p.name} (${p.id}) as ${p.arch}${p.bot ? ' [bot]' : ''}`);
      this.travel(p, m.dim && MM.DIM_BY_ID[m.dim] ? m.dim : 'suburbia', null, null, true);
    }

    info(p) { return { id: p.id, name: p.name, home: p.home, look: p.look, arch: p.arch, bot: p.bot, chaos: p.chaos }; }

    // Move a player into a dimension (a portal, the kiosk, or joining).
    travel(p, dimId, at, preferInst, first) {
      const from = p.inst;
      if (from) {
        from.players.delete(p.id);
        from.ev({ k: 'leave', id: p.id, via: dimId });
        from.emptySince = this.time;
      }
      const inst = this.instanceWithRoom(dimId, preferInst);
      const spot = at ? { x: at.x, z: at.z, y: MM.heightAt(dimId, at.x, at.z) } : MM.spawnPoint(dimId);
      p.inst = inst;
      p.x = spot.x; p.y = spot.y + 0.1; p.z = spot.z; p.a = 0;
      p.ep++;
      p.lastSt = this.time;
      p.portalCool = this.time + 2;
      p.fx.prot = Math.max(p.fx.prot, this.time + (first ? MM.SPAWN_PROTECT : 1.5));
      inst.ev({ k: 'join', p: this.info(p), via: from ? from.dimId : null });
      inst.players.set(p.id, p);
      const w = inst.welcomeState();
      w.t = 'w'; w.ep = p.ep; w.x = r2(p.x); w.y = r2(p.y); w.z = r2(p.z); w.tm = r2(this.time);
      this.send(p, w);
      this.dirty(p);
    }

    teleport(p, x, y, z) {
      p.x = x; p.y = y; p.z = z; p.ep++; p.lastSt = this.time;
      this.priv(p, { k: 'tp', x: r2(x), y: r2(y), z: r2(z), ep: p.ep });
    }

    priv(p, e) { (p.pv || (p.pv = [])).push(e); }
    dirty(p) { p.dirtyFlag = true; }
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
      if (p.mega) b |= 64;
      if (p.boots) b |= 128;
      return b;
    }

    speedOf(p) {
      const now = this.time;
      return p.A.speed * (now < p.fx.sprint ? 1.8 : 1) * (now < p.fx.shrink ? 0.75 : 1) * (now < p.fx.guilt ? 0.6 : 1) * (p.A.fly ? 1.35 : 1);
    }

    // ----- Movement validation -----
    onState(c, p, m) {
      if (m.ep !== p.ep || p.dead) return;
      const now = this.time;
      const dt = Math.min(1.0, Math.max(0.05, now - p.lastSt));
      const kb = now < p.kbUntil;
      const allowed = this.speedOf(p) * dt * 1.5 + 1.5 + (kb ? 30 * dt + 3 : 0);
      const lim = MM.WORLD_HALF;
      const x = Math.max(-lim, Math.min(lim, m.x)), z = Math.max(-lim, Math.min(lim, m.z));
      const moved = Math.hypot(x - p.x, z - p.z);
      const ground = MM.heightAt(p.inst.dimId, x, z);
      const g = p.inst.dim.gravity;
      const jv = p.A.jump * (p.boots ? 1.5 : 1);
      // Vertical: you can only rise as fast as your jump (or wings, or a blast) allows,
      // and never above jump height plus the tallest prop. Falling is always fine.
      const reach = p.A.fly ? 70 : jv * jv / (2 * g) + 14;
      let y = m.y;
      if (y < ground - 1.5) y = ground;
      const rise = y - p.y;
      const maxRise = (p.A.fly ? 14 : jv) * dt * 1.6 + 1.2 + (kb ? 30 * dt + 3 : 0);
      if (moved > allowed || rise > maxRise || (y > ground + reach && rise > 0.3)) {
        p.strikes += 1;
        if (p.strikes > 25) { this.kick(c, 'Movement check failed'); return; }
        this.teleport(p, p.x, Math.max(p.y, MM.heightAt(p.inst.dimId, p.x, p.z)), p.z);
        return;
      }
      if (p.strikes > 0 && (this.tickN % 60 === 0)) p.strikes -= 1;
      p.x = x; p.y = y; p.z = z; p.r = m.r; p.a = m.a === MM.ANIM.dead ? 0 : m.a;
      p.lastSt = now;
      // Pick up anything in reach.
      for (const pk of p.inst.pickups.values()) {
        if (dist2(pk.x, pk.z, p.x, p.z) < MM.PICKUP_RADIUS * MM.PICKUP_RADIUS && Math.abs(pk.y - p.y) < 3) {
          p.inst.pickups.delete(pk.id);
          p.inv[pk.c] = Math.min(999, p.inv[pk.c] + pk.n);
          p.inst.ev({ k: 'pk-', id: pk.id, by: p.id });
          this.dirty(p);
        }
      }
    }

    fireProjectile(inst, o) {
      const pr = { id: this.ent(), owner: o.owner, kind: o.kind, x: o.x, y: o.y, z: o.z,
        vx: o.dx * o.speed, vy: o.dy * o.speed + (o.up || 0), vz: o.dz * o.speed, g: !!o.gravity,
        life: o.life || o.range / o.speed, dmg: o.dmg, rad: o.rad || 0.15 };
      inst.projs.push(pr);
      inst.ev({ k: 'shot', id: pr.id, o: pr.owner, w: pr.kind, x: r2(pr.x), y: r2(pr.y), z: r2(pr.z), vx: r2(pr.vx), vy: r2(pr.vy), vz: r2(pr.vz), g: pr.g ? r2(inst.dim.gravity * 0.7) : 0, l: r2(pr.life) });
      return pr;
    }

    dmgMult(p) { return (p.mega ? 2 : 1) * (this.time < p.fx.shrink ? 0.5 : 1); }

    onFire(p, m) {
      const now = this.time;
      if (p.dead || now < p.cdFire || now < p.fx.sob) return;
      const w = MM.WEAPONS[p.A.weapon];
      p.cdFire = now + w.cd * 0.9;
      p.fx.prot = 0;
      const s = this.scaleOf(p);
      if (w.melee) { this.melee(p, m, w); return; }
      this.fireProjectile(p.inst, { owner: p.id, kind: p.A.weapon, x: p.x + m.dx * 0.7, y: p.y + 1.35 * s + m.dy * 0.7, z: p.z + m.dz * 0.7,
        dx: m.dx, dy: m.dy, dz: m.dz, speed: w.speed, range: w.range, dmg: Math.round(w.dmg * this.dmgMult(p)) });
    }

    melee(p, m, w) {
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
        if (o === p || o.dead || Math.abs(o.y - p.y) > 2.5 || !inFront(o.x, o.z, 0.5)) continue;
        this.hurtPlayer(inst, o, dmg, p, p.A.weapon);
        if (w.knock) { const dx = o.x - p.x, dz = o.z - p.z, l = Math.hypot(dx, dz) || 1; this.knock(o, dx / l * w.knock, 5, dz / l * w.knock); }
      }
      for (const n of [...inst.npcs.values()]) if (inFront(n.x, n.z, n.T.r)) inst.hurtNpc(n, dmg, p);
      for (const t of [...inst.turrets.values()]) if (t.owner !== p.id && inFront(t.x, t.z, 0.8)) inst.hurtTurret(t, dmg);
      MM.genProps(inst.dimId).forEach((pr, i) => { if (inst.props[i].hp > 0 && p.y < pr.y + pr.h && inFront(pr.x, pr.z, pr.r)) inst.hurtProp(i, dmg, p); });
    }

    hurtPlayer(inst, p, amt, src, how) {
      const now = this.time;
      if (p.dead || now < p.fx.prot || now < p.fx.sob || amt <= 0) return;
      if (p.arch === 'sidekick' && Math.random() < 0.2) { inst.ev({ k: 'dodge', id: p.id }); return; }
      if (now < p.fx.shield) amt *= 0.3;
      amt = Math.max(1, Math.round(amt));
      p.hp -= amt;
      inst.ev({ k: 'dmg', p: p.id, d: amt, by: src ? src.id : 0 });
      this.dirty(p);
      if (p.hp <= 0) this.kill(inst, p, src, how);
    }

    kill(inst, p, src, how) {
      p.hp = 0; p.dead = true; p.deaths++;
      p.respawnAt = this.time + MM.RESPAWN_TIME;
      p.boots = false; p.mega = false;
      const lost = Math.floor(p.inv.s / 2);
      if (lost > 0) { p.inv.s -= lost; inst.spawnPickup('s', true, { x: p.x, z: p.z }, lost); }
      if (src && src !== p) {
        src.kills++; src.chaos += 5; this.dirty(src);
        if (p.arch === 'beanling') { src.fx.guilt = this.time + 10; this.priv(src, { k: 'toast', text: 'You feel terrible about that.' }); }
      }
      inst.ev({ k: 'kill', v: p.id, by: src ? src.id : 0, w: how || '' });
      this.dirty(p);
    }

    onRespawn(p) {
      if (!p.dead || this.time < p.respawnAt) return;
      p.dead = false; p.hp = p.maxHp;
      p.fx = { shield: 0, sprint: 0, sob: 0, shrink: 0, guilt: 0, prot: this.time + MM.SPAWN_PROTECT };
      const s = MM.spawnPoint(p.inst.dimId);
      this.teleport(p, s.x, s.y + 0.1, s.z);
      p.inst.ev({ k: 'resp', id: p.id });
      this.dirty(p);
    }

    onAbility(p) {
      const now = this.time, A = p.A, ab = A.ability, inst = p.inst;
      if (p.dead || now < p.cdAb) return;
      p.cdAb = now + ab.cd;
      inst.ev({ k: 'ab', id: p.id, a: ab.id });
      switch (ab.id) {
        case 'shield': p.fx.shield = now + ab.dur; break;
        case 'sprint': p.fx.sprint = now + ab.dur; break;
        case 'sob': p.fx.sob = now + ab.dur; break;
        case 'dive': inst.explode(p.x, p.y, p.z, 5.5, 32, p, 'dive', { knock: 12, noSelfKnock: true, propDmg: 70 }); break;
        case 'slam': inst.explode(p.x, p.y, p.z, 6.5, 18, p, 'slam', { knock: 20, noSelfKnock: true, propDmg: 50 }); break;
        case 'cheer':
          for (const o of inst.players.values()) {
            if (o.dead || dist2(o.x, o.z, p.x, p.z) > 100) continue;
            o.hp = Math.min(o.maxHp, o.hp + 30); this.dirty(o);
          }
          break;
      }
      this.dirty(p);
    }

    onPortal(p, d) {
      const A = p.A, now = this.time;
      if (!A.portal || p.dead || p.charges <= 0 || d === p.inst.dimId) return;
      p.charges--;
      if (!p.chargeAt) p.chargeAt = now + A.portal.recharge;
      const fx = Math.sin(p.r), fz = Math.cos(p.r);
      let x = p.x + fx * 3.2, z = p.z + fz * 3.2;
      [x, z] = MM.collideProps(p.inst.dimId, x, z, 1.2, null);
      this.openPortalPair(p.inst, x, z, p.r + Math.PI, d, p.look.portalColor, p.id);
      this.dirty(p);
    }

    openPortalPair(inst, x, z, r, destDim, col, owner) {
      const now = this.time;
      const dest = this.instanceWithRoom(destDim, this.instances.get(destDim + '#' + inst.idx));
      const spot = MM.randomSpot(destDim, Math.random, 10, 70);
      const a = { id: this.ent(), x, y: MM.heightAt(inst.dimId, x, z), z, r, destDim, destKey: dest.key, col, owner, until: now + MM.PORTAL_TTL };
      const b = { id: this.ent(), x: spot.x, y: spot.y, z: spot.z, r: Math.random() * 6.28, destDim: inst.dimId, destKey: inst.key, col, owner, until: now + MM.PORTAL_TTL };
      a.link = b.id; b.link = a.id;
      inst.portals.set(a.id, a); dest.portals.set(b.id, b);
      inst.ev({ k: 'po+', po: inst.portalRow(a) });
      dest.ev({ k: 'po+', po: dest.portalRow(b) });
    }

    onKiosk(p, d) {
      const now = this.time;
      if (p.dead || d === p.inst.dimId || now < p.cdKiosk) return;
      if (dist2(p.x, p.z, MM.KIOSK.x, MM.KIOSK.z) > MM.KIOSK_RADIUS * MM.KIOSK_RADIUS) return;
      p.cdKiosk = now + 3;
      p.inst.ev({ k: 'kiosk', id: p.id });
      this.travel(p, d, { x: MM.KIOSK.x + (Math.random() - 0.5) * 6, z: MM.KIOSK.z + 5 + Math.random() * 3 });
    }

    onCraft(p, g) {
      const A = p.A, G = MM.GADGETS[g];
      if (p.dead || !A.craft.includes(g)) return;
      const cost = MM.gadgetCost(p.arch, g);
      if (p.inv.s < cost.s || p.inv.c < cost.c) return;
      if (g === 'boots') { if (p.boots) return; p.boots = true; }
      else if (g === 'mega') { if (p.mega) return; p.mega = true; }
      else if (g === 'fluid') { if (!A.portal || p.charges >= A.portal.charges) return; p.charges++; if (p.charges >= A.portal.charges) p.chargeAt = 0; }
      else { if (p.inv[g] >= G.max) return; p.inv[g]++; }
      p.inv.s -= cost.s; p.inv.c -= cost.c;
      this.priv(p, { k: 'toast', text: 'Built: ' + G.name });
      this.dirty(p);
    }

    onGadget(p, m) {
      const inst = p.inst, g = m.g;
      if (p.dead || this.time < p.fx.sob || !(p.inv[g] > 0)) return;
      if (g === 'grenade') {
        this.fireProjectile(inst, { owner: p.id, kind: 'gren', x: p.x + m.dx, y: p.y + 1.5, z: p.z + m.dz, dx: m.dx, dy: m.dy, dz: m.dz, speed: 20, up: 6, gravity: true, life: 1.8, dmg: 0, rad: 0.3 });
      } else if (g === 'shrink') {
        this.fireProjectile(inst, { owner: p.id, kind: 'shrink', x: p.x + m.dx * 0.7, y: p.y + 1.35 + m.dy * 0.7, z: p.z + m.dz * 0.7, dx: m.dx, dy: m.dy, dz: m.dz, speed: 65, range: 70, dmg: 5, rad: 0.35 });
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

    onChat(p, text) {
      const clean = MM.sanitizeChat(text);
      if (!clean) return;
      const msg = JSON.stringify({ t: 'c', id: p.id, name: p.name, home: p.home, dim: p.inst.dimId, text: clean });
      for (const o of this.players.values()) this.send(o, msg);
    }

    youState(p) {
      const now = this.time, A = p.A;
      return { t: 'y', hp: Math.max(0, Math.round(p.hp)), max: p.maxHp, inv: p.inv, boots: p.boots, mega: p.mega,
        ch: p.charges, chMax: A.portal ? A.portal.charges : 0, chIn: p.chargeAt ? r2(p.chargeAt - now) : 0,
        ab: r2(Math.max(0, p.cdAb - now)), chaos: p.chaos, kills: p.kills, deaths: p.deaths, dead: p.dead,
        rsIn: p.dead ? r2(Math.max(0, p.respawnAt - now)) : 0, fx: this.fxBits(p, now) };
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
        const A = p.A;
        if (A.portal && p.chargeAt && now >= p.chargeAt) {
          p.charges = Math.min(A.portal.charges, p.charges + 1);
          p.chargeAt = p.charges < A.portal.charges ? now + A.portal.recharge : 0;
          this.dirty(p);
        }
        if (p.arch === 'mutant' && !p.dead && p.hp < p.maxHp && this.tickN % 10 === 0) { p.hp = Math.min(p.maxHp, p.hp + 1); this.dirty(p); }
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
        if (p.pv && p.pv.length) { this.send(p, { t: 'pv', l: p.pv }); p.pv = []; }
        if (p.dirtyFlag || (snap && this.tickN % 15 === 0)) { p.dirtyFlag = false; this.send(p, this.youState(p)); }
      }
      if (this.tickN % 150 === 0) this.broadcastPop();
    }

    // Who is where, plus the multiverse-wide chaos leaderboard.
    broadcastPop() {
      const msg = JSON.stringify(Object.assign({ t: 'pop' }, this.stats(), { top: this.top() }));
      for (const p of this.players.values()) this.send(p, msg);
    }
    top() {
      return [...this.players.values()].sort((a, b) => b.chaos - a.chaos).slice(0, 10)
        .map(p => [p.name, p.home, p.chaos, p.kills, p.inst ? p.inst.dimId : '', p.bot ? 1 : 0]);
    }
    stats() {
      const d = {};
      for (const id of MM.DIM_IDS) d[id] = 0;
      let bots = 0;
      for (const p of this.players.values()) { if (p.inst) d[p.inst.dimId]++; if (p.bot) bots++; }
      return { total: this.players.size, bots, d, instances: this.instances.size };
    }
  }

  MM.Host = Host;
  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
