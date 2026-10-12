// Multiverse Mayhem: the dimensions. Terrain height and prop layout come from a
// seeded generator, so the server, every client and the bots build the same world
// without sending it over the network.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // ---------- Deterministic random numbers and noise ----------
  MM.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash2(x, z, seed) {
    let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, z, seed) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed), c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  }
  MM.fbm = function (x, z, seed, oct) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { s += amp * vnoise(x * f, z * f, seed + i * 31); f *= 2; amp *= 0.5; }
    return s;
  };
  const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

  // ---------- Dimensions ----------
  // props: [type, count]. npc: [type, count]. Colors are for the client renderer.
  MM.DIMS = [
    {
      id: 'suburbia', name: 'Suburbia Prime', code: 'S-001', seed: 1137, gravity: 24, amp: 2.5, scale: 0.012,
      blurb: 'A painfully normal suburb. Lawns, garages, and nobody suspects a thing.',
      sky: ['#5fb4ff', '#d9f3ff'], fog: '#cdeaff', fogFar: 230, sun: '#fff4dc', ambient: '#9fc6ff',
      ground: ['#5fae3e', '#78c24b', '#4c9636'], accent: '#ffffff',
      props: [['house', 0], ['tree', 70], ['car', 22], ['mailbox', 18], ['hedge', 30]],
      npc: [['neighbor', 10]], pickups: { s: 18, c: 4 },
    },
    {
      id: 'meatlands', name: 'The Meatlands', code: 'M-666', seed: 4242, gravity: 24, amp: 9, scale: 0.02,
      blurb: 'Everything here is made of meat. Everything. It is warm. It is watching.',
      sky: ['#3d0a1c', '#c4485f'], fog: '#7a2236', fogFar: 170, sun: '#ffc2b0', ambient: '#b05068',
      ground: ['#c9576b', '#e07a85', '#9c3a4e'], accent: '#fff2c8',
      props: [['fleshpillar', 40], ['eyestalk', 45], ['bonearch', 12], ['pustule', 40]],
      npc: [['meatblob', 12]], pickups: { s: 14, c: 8 },
    },
    {
      id: 'bazaar', name: 'Neon Bazaar', code: 'B-9000', seed: 9001, gravity: 20, amp: 4, scale: 0.015,
      blurb: 'An alien night market. Everything is for sale, especially things that should not be.',
      sky: ['#140733', '#ff6fd0'], fog: '#3a1a63', fogFar: 210, sun: '#ffd9fb', ambient: '#8a6cff',
      ground: ['#3b2b7a', '#4d3a9c', '#2e8c8a'], accent: '#5ff8ff',
      props: [['mushroom', 40], ['stall', 26], ['crate', 40], ['lamp', 30]],
      npc: [['jelly', 10]], pickups: { s: 14, c: 10 },
    },
    {
      id: 'moon', name: 'Lowgrav Moon', code: 'L-0', seed: 777, gravity: 7, amp: 12, scale: 0.014,
      blurb: 'A cratered moon with almost no gravity. Jump and you might not come down for a while.',
      sky: ['#000006', '#151536'], fog: '#0d0d24', fogFar: 260, sun: '#ffffff', ambient: '#7a86b8',
      ground: ['#9a9aa6', '#b4b4c0', '#7c7c88'], accent: '#7affea',
      props: [['crystal', 50], ['rock', 50], ['rover', 6], ['antenna', 8]],
      npc: [['mooncrab', 12]], pickups: { s: 10, c: 16 },
    },
  ];
  MM.DIM_BY_ID = {};
  for (const d of MM.DIMS) MM.DIM_BY_ID[d.id] = d;
  MM.DIM_IDS = MM.DIMS.map(d => d.id);

  // Prop types: r = collision radius, h = height, hp, scrap dropped when destroyed.
  MM.PROPS = {
    house:       { r: 6.5, h: 9,  hp: 260, scrap: 6 },
    tree:        { r: 0.9, h: 8,  hp: 60,  scrap: 1 },
    car:         { r: 2.3, h: 1.9, hp: 90, scrap: 4 },
    mailbox:     { r: 0.4, h: 1.4, hp: 15, scrap: 1 },
    hedge:       { r: 1.6, h: 1.4, hp: 30, scrap: 1 },
    fleshpillar: { r: 1.6, h: 9,  hp: 120, scrap: 3 },
    eyestalk:    { r: 0.6, h: 5,  hp: 30,  scrap: 1 },
    bonearch:    { r: 1.0, h: 8,  hp: 150, scrap: 4, arch: true },
    pustule:     { r: 1.3, h: 1.6, hp: 20, scrap: 1 },
    mushroom:    { r: 1.4, h: 11, hp: 110, scrap: 3 },
    stall:       { r: 2.2, h: 3.4, hp: 70, scrap: 3 },
    crate:       { r: 0.8, h: 1.6, hp: 25, scrap: 2 },
    lamp:        { r: 0.3, h: 5,  hp: 20,  scrap: 1 },
    crystal:     { r: 1.1, h: 3.5, hp: 50, scrap: 1, crystal: 2 },
    rock:        { r: 2.0, h: 2.6, hp: 120, scrap: 1 },
    rover:       { r: 2.4, h: 2.4, hp: 110, scrap: 6 },
    antenna:     { r: 0.8, h: 9,  hp: 70,  scrap: 3 },
  };

  // NPCs: hostile ones chase and bite. fly = hover height.
  MM.NPCS = {
    neighbor: { name: 'Nosy Neighbor', hp: 30, speed: 2.5, hostile: false, dmg: 0, drop: { s: 2, c: 0 }, r: 0.6, h: 1.8 },
    meatblob: { name: 'Meat Blob', hp: 50, speed: 4.2, hostile: true, dmg: 8, drop: { s: 2, c: 1 }, r: 0.9, h: 1.6 },
    jelly:    { name: 'Sky Jelly', hp: 35, speed: 2, hostile: false, dmg: 0, drop: { s: 0, c: 2 }, r: 0.9, h: 1.6, fly: 4 },
    mooncrab: { name: 'Moon Crab', hp: 40, speed: 5, hostile: true, dmg: 6, drop: { s: 1, c: 2 }, r: 0.8, h: 1.0 },
  };

  // Craters for the moon, made once from its seed.
  const craterCache = {};
  function craters(dim) {
    if (craterCache[dim.id]) return craterCache[dim.id];
    const r = MM.rng(dim.seed * 7 + 1), out = [];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 35 + r() * 120;
      out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, rad: 6 + r() * 14 });
    }
    return (craterCache[dim.id] = out);
  }

  // Ground height. The middle is flat (spawn and kiosk), the edges rise into hills
  // that wall the area in.
  MM.heightAt = function (dimId, x, z) {
    const dim = MM.DIM_BY_ID[dimId];
    const r = Math.sqrt(x * x + z * z);
    let h = (MM.fbm(x * dim.scale, z * dim.scale, dim.seed, 4) - 0.5) * 2 * dim.amp;
    h *= smooth(14, 40, r);
    if (dimId === 'moon') {
      for (const c of craters(dim)) {
        const d = Math.hypot(x - c.x, z - c.z) / c.rad;
        if (d < 1.4) h += d < 1 ? -(1 - d * d) * c.rad * 0.35 : Math.sin((d - 1) / 0.4 * Math.PI) * c.rad * 0.12;
      }
    }
    if (dimId === 'meatlands') h += Math.sin(x * 0.08) * Math.cos(z * 0.07) * 1.5 * smooth(14, 40, r);
    h += smooth(MM.WORLD_HALF - 30, MM.WORLD_HALF + 10, Math.max(Math.abs(x), Math.abs(z))) * 28;
    return h;
  };

  // Ground normal from the height field (for slopes and placing things).
  MM.normalAt = function (dimId, x, z) {
    const e = 0.5;
    const hx = MM.heightAt(dimId, x + e, z) - MM.heightAt(dimId, x - e, z);
    const hz = MM.heightAt(dimId, x, z + e) - MM.heightAt(dimId, x, z - e);
    const l = Math.hypot(hx, 2 * e, hz);
    return [-hx / l, 2 * e / l, -hz / l];
  };

  // Where the public portal kiosk stands in every dimension.
  MM.KIOSK = { x: 0, z: -14 };

  // ---------- Props ----------
  const propCache = {};
  MM.genProps = function (dimId) {
    if (propCache[dimId]) return propCache[dimId];
    const dim = MM.DIM_BY_ID[dimId];
    const r = MM.rng(dim.seed);
    const out = [];
    const free = (x, z, rad) => {
      if (Math.hypot(x, z) < 22 + rad) return false;
      if (Math.hypot(x - MM.KIOSK.x, z - MM.KIOSK.z) < 8 + rad) return false;
      for (const p of out) if (Math.hypot(p.x - x, p.z - z) < p.r + rad + 1.5) return false;
      return true;
    };
    const add = (type, x, z, rot, scale) => {
      const t = MM.PROPS[type];
      out.push({ id: out.length, type, x, z, rot, s: scale, r: t.r * scale, h: t.h * scale, hp: Math.round(t.hp * scale) });
    };
    if (dimId === 'suburbia') {
      // Houses on lots along a grid of streets (streets run along x and z multiples of 44).
      for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
        if (Math.abs(gx) <= 0 && Math.abs(gz) <= 0) continue;
        for (const side of [-1, 1]) {
          const x = gx * 44 + side * 12, z = gz * 44 + 12;
          if (Math.abs(x) > 140 || Math.abs(z) > 140) continue;
          if (r() < 0.2 || !free(x, z, 6.5)) continue;
          add('house', x, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, 1);
        }
      }
    }
    for (const [type, count] of dim.props) {
      const t = MM.PROPS[type];
      for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
        const x = (r() * 2 - 1) * 145, z = (r() * 2 - 1) * 145;
        const s = 0.8 + r() * 0.5;
        if (dimId === 'suburbia' && type !== 'tree' && (Math.abs(x % 44) < 4 || Math.abs(z % 44) < 4) && type !== 'car') continue;
        if (!free(x, z, t.r * s)) continue;
        add(type, x, z, r() * Math.PI * 2, s);
        i++;
      }
    }
    for (const p of out) p.y = MM.heightAt(dimId, p.x, p.z);
    return (propCache[dimId] = out);
  };

  // A random open spot near the middle (spawns and arrivals).
  MM.spawnPoint = function (dimId, rand) {
    const rr = rand || Math.random;
    const a = rr() * Math.PI * 2, d = 4 + rr() * 9;
    const x = Math.cos(a) * d, z = Math.sin(a) * d + 4;
    return { x, y: MM.heightAt(dimId, x, z), z };
  };

  // Any open spot in the world (pickups, NPCs).
  MM.randomSpot = function (dimId, rand, minR, maxR) {
    const rr = rand || Math.random;
    const props = MM.genProps(dimId);
    for (let k = 0; k < 30; k++) {
      const a = rr() * Math.PI * 2, d = (minR || 15) + rr() * ((maxR || 140) - (minR || 15));
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      let ok = true;
      for (const p of props) if (Math.hypot(p.x - x, p.z - z) < p.r + 1.5) { ok = false; break; }
      if (ok) return { x, y: MM.heightAt(dimId, x, z), z };
    }
    return MM.spawnPoint(dimId, rr);
  };

  // Push a circle (x, z, radius) out of solid props. Used by clients for walking
  // and by the server for NPCs. Arches can be walked through.
  MM.collideProps = function (dimId, x, z, rad, alive) {
    const props = MM.genProps(dimId);
    for (const p of props) {
      if (alive && !alive[p.id]) continue;
      if (MM.PROPS[p.type].arch) continue;
      const dx = x - p.x, dz = z - p.z, min = p.r + rad;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        x = p.x + dx / d * min; z = p.z + dz / d * min;
      }
    }
    return [x, z];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
