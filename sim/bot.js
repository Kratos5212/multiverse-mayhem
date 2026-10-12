// Multiverse Mayhem: bot players. A bot talks to the host through exactly the same
// messages as a real player (no shortcuts), so bots keep the world lively and also
// double as a load test (scripts/loadtest.js runs them over real WebSockets).
(function (root) {
  'use strict';
  const MM = root.MM;

  const NAMES = ['Glorbo', 'Zeep', 'Dr. Wobble', 'Fizzwick', 'Krunk', 'Squibbs', 'Plonk', 'Mezzo', 'Blip', 'Tarvo',
    'Gunthra', 'Snorbi', 'Vexil', 'Pib', 'Dorbo', 'Quanta', 'Flemm', 'Yorp', 'Nebb', 'Ozzle', 'Chuffy', 'Grimble',
    'Wuzz', 'Klaxa', 'Tinsel', 'Borp', 'Moxie', 'Jibb', 'Floob', 'Raxx'];
  const LINES = ['anyone seen my portal gun', 'this dimension smells weird', 'who blew up my house', 'I am the smartest one here',
    'gg', 'lol', 'run!!', 'there are SO many of me', 'stop shooting the mailboxes', 'meet at the kiosk', 'the moon is bouncy',
    'I just want to go home', 'scrap for sale', 'where am I', 'that was not me', 'the meat is warm'];

  const pick = (a, r) => a[Math.floor((r || Math.random)() * a.length)];
  const randColor = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');

  MM.randomLook = function (arch) {
    const L = MM.LOOK, look = MM.defaultLook();
    for (const k of ['hair', 'brow', 'eyes', 'mouth', 'top', 'acc']) look[k] = pick(L[k]);
    look.species = pick(['human', 'human', 'human', 'alien', 'robot', 'blob']);
    if (arch === 'birdfolk') look.species = 'birdfolk';
    if (arch === 'beanling') look.species = 'beanling';
    if (arch === 'mutant') look.species = 'blob';
    for (const k in L.nums) look[k] = Math.round((L.nums[k][0] + Math.random() * (L.nums[k][1] - L.nums[k][0])) * 100) / 100;
    look.skin = pick(['#f2d2b6', '#e0b08c', '#a8724f', '#6b4630', '#ffe0c8', '#9ad66b', '#7ec8e3', '#c49bff', '#ffd25a']);
    for (const k of ['hairColor', 'topColor', 'shirtColor', 'pantsColor', 'shoeColor', 'accColor', 'portalColor']) look[k] = randColor();
    return look;
  };

  class Bot {
    constructor(send, opts) {
      opts = opts || {};
      this.sendRaw = send;
      this.arch = opts.arch || pick(MM.ARCH_IDS);
      this.name = opts.name || pick(NAMES) + (Math.random() < 0.5 ? '' : Math.floor(Math.random() * 99));
      this.home = pick('ABCDEFGHJKLMNPQRSTUVWXYZ') + '-' + Math.floor(Math.random() * 999);
      this.look = opts.look || MM.randomLook(this.arch);
      this.chatty = opts.chatty !== undefined ? opts.chatty : 0.5;
      this.startDim = opts.dim;
      this.A = MM.ARCHETYPES[this.arch];
      this.id = 0; this.ep = 0; this.dim = null;
      this.x = 0; this.y = 0; this.z = 0; this.vy = 0; this.yaw = 0;
      this.others = new Map(); this.npcs = new Map(); this.pickups = new Map(); this.portals = new Map();
      this.deadProps = new Set();
      this.you = null;
      this.goal = null; this.target = null;
      this.t = 0; this.stT = 0; this.fireT = 0; this.thinkT = 0; this.chatT = 10 + Math.random() * 60; this.travelT = 40 + Math.random() * 80;
      this.closed = false;
      this.started = false;
    }

    // Say hello on the first update, so the owner has wired up onMessage by then.
    start() {
      this.started = true;
      this.send({ t: 'hello', v: MM.VERSION, name: this.name, home: this.home, look: this.look, arch: this.arch, dim: this.startDim });
    }

    send(o) { if (!this.closed) this.sendRaw(JSON.stringify(o)); }

    onMessage(raw) {
      let m;
      try { m = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return; }
      switch (m.t) {
        case 'hi': this.id = m.id; break;
        case 'w':
          this.ep = m.ep; this.dim = m.dim; this.x = m.x; this.y = m.y; this.z = m.z; this.vy = 0;
          this.others.clear(); this.npcs.clear(); this.pickups.clear(); this.portals.clear(); this.deadProps.clear();
          for (const pk of m.pickups) this.pickups.set(pk[0], { x: pk[2], z: pk[4] });
          for (const n of m.npcs) this.npcs.set(n[0], { x: n[2], y: n[3], z: n[4], type: n[1] });
          for (const po of m.portals) this.portals.set(po.id, po);
          for (const [i, hp] of m.props) if (hp <= 0) this.deadProps.add(i);
          this.goal = null; this.target = null;
          break;
        case 's':
          for (const p of m.p) if (p[0] !== this.id) { const o = this.others.get(p[0]) || {}; o.x = p[1]; o.y = p[2]; o.z = p[3]; o.dead = p[5] === MM.ANIM.dead; o.fx = p[7]; this.others.set(p[0], o); }
          for (const n of m.n) { const o = this.npcs.get(n[0]); if (o) { o.x = n[1]; o.y = n[2]; o.z = n[3]; } }
          break;
        case 'ev':
          for (const e of m.l) {
            if (e.k === 'leave') this.others.delete(e.id);
            else if (e.k === 'pk+') this.pickups.set(e.p[0], { x: e.p[2], z: e.p[4] });
            else if (e.k === 'pk-') this.pickups.delete(e.id);
            else if (e.k === 'npc+') this.npcs.set(e.n[0], { x: e.n[2], y: e.n[3], z: e.n[4], type: e.n[1] });
            else if (e.k === 'npc-') this.npcs.delete(e.id);
            else if (e.k === 'po+') this.portals.set(e.po.id, e.po);
            else if (e.k === 'po-') this.portals.delete(e.id);
            else if (e.k === 'prop') { if (e.hp <= 0) this.deadProps.add(e.id); else this.deadProps.delete(e.id); }
            else if (e.k === 'dmg' && e.p === this.id && e.by && Math.random() < 0.7) this.target = { kind: 'p', id: e.by };
          }
          break;
        case 'pv':
          for (const e of m.l) {
            if (e.k === 'tp') { this.x = e.x; this.y = e.y; this.z = e.z; this.ep = e.ep; this.vy = 0; }
            else if (e.k === 'kb') { this.vy = e.vy; this.kbx = e.vx; this.kbz = e.vz; }
          }
          break;
        case 'y': this.you = m; break;
        case 'err': this.closed = true; break;
      }
    }

    // Choose what to do next.
    think() {
      const you = this.you;
      if (!you || !this.dim) return;
      if (you.dead) { if (you.rsIn <= 0) this.send({ t: 'rs' }); return; }
      // Craft whenever it can afford something it knows.
      for (const g of this.A.craft) {
        const c = MM.gadgetCost(this.arch, g);
        if (you.inv.s >= c.s && you.inv.c >= c.c && Math.random() < 0.3) { this.send({ t: 'cr', g }); break; }
      }
      // Pick a fight now and then.
      if (!this.target || Math.random() < 0.1) {
        const r = Math.random();
        let best = null, bd = 30 * 30;
        if (r < 0.45) {
          for (const [id, o] of this.others) { if (o.dead || (o.fx & 32)) continue; const d = (o.x - this.x) ** 2 + (o.z - this.z) ** 2; if (d < bd) { bd = d; best = { kind: 'p', id }; } }
        } else if (r < 0.75) {
          for (const [id, n] of this.npcs) { const d = (n.x - this.x) ** 2 + (n.z - this.z) ** 2; if (d < bd) { bd = d; best = { kind: 'n', id }; } }
        } else if (r < 0.95) {
          const props = MM.genProps(this.dim);
          for (const p of props) { if (this.deadProps.has(p.id)) continue; const d = (p.x - this.x) ** 2 + (p.z - this.z) ** 2; if (d < bd) { bd = d; best = { kind: 'prop', id: p.id }; } }
        }
        this.target = best;
      }
      // Wander toward loot or somewhere random.
      if (!this.goal || Math.random() < 0.05) {
        let best = null, bd = 45 * 45;
        for (const pk of this.pickups.values()) { const d = (pk.x - this.x) ** 2 + (pk.z - this.z) ** 2; if (d < bd) { bd = d; best = pk; } }
        this.goal = best ? { x: best.x, z: best.z } : MM.randomSpot(this.dim, Math.random, 5, 120);
      }
      // Hop dimensions now and then: own portal gun, someone's portal, or the kiosk.
      if (this.t > this.travelT) {
        this.travelT = this.t + 50 + Math.random() * 100;
        const others = MM.DIM_IDS.filter(d => d !== this.dim);
        if (this.A.portal && you.ch > 0) { this.send({ t: 'po', d: pick(others) }); this.goal = { x: this.x + Math.sin(this.yaw) * 4, z: this.z + Math.cos(this.yaw) * 4, portal: true }; }
        else this.goal = { x: MM.KIOSK.x, z: MM.KIOSK.z, kiosk: pick(others) };
      }
      for (const po of this.portals.values()) {
        if (Math.random() < 0.02 && (po.x - this.x) ** 2 + (po.z - this.z) ** 2 < 400) this.goal = { x: po.x, z: po.z, portal: true };
      }
      if (you.hp < you.max * 0.5 && you.ab <= 0 && Math.random() < 0.4) this.send({ t: 'ab' });
      if (this.target && you.ab <= 0 && Math.random() < 0.08) this.send({ t: 'ab' });
      if (this.chatty && this.t > this.chatT) { this.chatT = this.t + 40 + Math.random() * 120 / this.chatty; if (Math.random() < this.chatty) this.send({ t: 'c', text: pick(LINES) }); }
    }

    targetPos() {
      const t = this.target;
      if (!t) return null;
      if (t.kind === 'p') { const o = this.others.get(t.id); if (!o || o.dead) { this.target = null; return null; } return { x: o.x, y: o.y + 1, z: o.z }; }
      if (t.kind === 'n') { const n = this.npcs.get(t.id); if (!n) { this.target = null; return null; } return { x: n.x, y: n.y + 0.8, z: n.z }; }
      if (t.kind === 'prop') { if (this.deadProps.has(t.id)) { this.target = null; return null; } const p = MM.genProps(this.dim)[t.id]; return { x: p.x, y: p.y + Math.min(2, p.h / 2), z: p.z, r: p.r }; }
      return null;
    }

    update(dt) {
      if (!this.started) this.start();
      if (this.closed || !this.dim || !this.you) return;
      this.t += dt;
      if ((this.thinkT -= dt) <= 0) { this.thinkT = 0.5 + Math.random() * 0.5; this.think(); }
      const you = this.you;
      const dim = MM.DIM_BY_ID[this.dim];
      if (you.dead) return;
      const W = MM.WEAPONS[this.A.weapon];
      const tp = this.targetPos();
      let mx = 0, mz = 0;
      let dest = this.goal;
      if (tp) {
        const d = Math.hypot(tp.x - this.x, tp.z - this.z);
        const want = W.melee ? W.melee * 0.7 + (tp.r || 0) : 14 + (tp.r || 0);
        if (d > want) dest = { x: tp.x, z: tp.z };
        else dest = null;
        if (d < (W.melee ? W.melee + (tp.r || 0) + 0.5 : W.range * 0.8) && this.t > this.fireT) {
          this.fireT = this.t + W.cd + 0.05 + Math.random() * 0.25;
          const dx = tp.x - this.x, dy = tp.y - (this.y + 1.35), dz = tp.z - this.z, l = Math.hypot(dx, dy, dz) || 1;
          const sp = 0.06;
          let ax = dx / l + (Math.random() - 0.5) * sp, ay = dy / l + (Math.random() - 0.5) * sp, az = dz / l + (Math.random() - 0.5) * sp;
          const al = Math.hypot(ax, ay, az);
          this.yaw = Math.atan2(dx, dz);
          if (you.inv.grenade > 0 && Math.random() < 0.05) this.send({ t: 'g', g: 'grenade', dx: ax / al, dy: ay / al, dz: az / al });
          else if (you.inv.turret > 0 && Math.random() < 0.05) this.send({ t: 'g', g: 'turret', dx: ax / al, dy: ay / al, dz: az / al });
          else if (you.inv.shrink > 0 && this.target.kind === 'p' && Math.random() < 0.1) this.send({ t: 'g', g: 'shrink', dx: ax / al, dy: ay / al, dz: az / al });
          else this.send({ t: 'f', dx: ax / al, dy: ay / al, dz: az / al });
        }
      }
      if (dest) {
        const dx = dest.x - this.x, dz = dest.z - this.z, l = Math.hypot(dx, dz);
        if (l < 1.5) {
          if (dest.kiosk) this.send({ t: 'ki', d: dest.kiosk });
          this.goal = null;
        } else { mx = dx / l; mz = dz / l; this.yaw = Math.atan2(dx, dz); }
      }
      const fx = (you.fx & 2 ? 1.8 : 1) * (you.fx & 8 ? 0.75 : 1) * (you.fx & 16 ? 0.6 : 1);
      const speed = this.A.speed * 0.95 * fx;
      let nx = this.x + mx * speed * dt + (this.kbx || 0) * dt, nz = this.z + mz * speed * dt + (this.kbz || 0) * dt;
      this.kbx = (this.kbx || 0) * 0.9; this.kbz = (this.kbz || 0) * 0.9;
      const alive = null;
      [nx, nz] = MM.collideProps(this.dim, nx, nz, 0.5, alive);
      if (Math.hypot(nx - this.x, nz - this.z) < speed * dt * 0.3 && (mx || mz) && Math.random() < 0.05) this.goal = null;
      const lim = MM.WORLD_HALF - 2;
      this.x = Math.max(-lim, Math.min(lim, nx)); this.z = Math.max(-lim, Math.min(lim, nz));
      const ground = MM.heightAt(this.dim, this.x, this.z);
      this.vy -= dim.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= ground) {
        this.y = ground; this.vy = 0;
        if ((mx || mz) && Math.random() < 0.01) this.vy = this.A.jump;
      }
      if ((this.stT -= dt) <= 0) {
        this.stT = 0.1;
        const air = this.y > ground + 0.2;
        this.send({ t: 'st', x: Math.round(this.x * 100) / 100, y: Math.round(this.y * 100) / 100, z: Math.round(this.z * 100) / 100, r: Math.round(this.yaw * 100) / 100,
          a: air ? MM.ANIM.air : (mx || mz) ? MM.ANIM.run : MM.ANIM.idle, ep: this.ep });
      }
    }
  }

  MM.Bot = Bot;
  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
