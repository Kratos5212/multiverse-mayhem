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
      id: 'suburbia', name: 'Earth C-137', code: 'C-137', seed: 1137, gravity: 24, amp: 2.5, scale: 0.012,
      blurb: 'The Smith family suburb. Lawns, a garage full of science, and a high school nobody wants to go to.',
      sky: ['#5fb4ff', '#d9f3ff'], fog: '#cdeaff', fogFar: 230, sun: '#fff4dc', ambient: '#9fc6ff',
      ground: ['#5fae3e', '#78c24b', '#4c9636'], accent: '#ffffff',
      props: [['house', 0], ['tree', 70], ['car', 22], ['mailbox', 18], ['hedge', 30]],
      npc: [['neighbor', 9], ['schoolkid', 4]], pickups: { s: 18, c: 2 }, mat: 's',
    },
    {
      id: 'meatlands', name: 'Cronenberg World', code: 'C-131', seed: 4242, gravity: 24, amp: 9, scale: 0.02,
      blurb: 'A love potion went very wrong here. Everything is meat now. It is warm. It is watching.',
      sky: ['#3d0a1c', '#c4485f'], fog: '#7a2236', fogFar: 170, sun: '#ffc2b0', ambient: '#b05068',
      ground: ['#c9576b', '#e07a85', '#9c3a4e'], accent: '#fff2c8',
      props: [['fleshpillar', 40], ['eyestalk', 45], ['bonearch', 12], ['pustule', 40]],
      npc: [['meatblob', 11], ['fleshmonk', 4]], pickups: { s: 8, g: 14 }, mat: 'g',
    },
    {
      id: 'bazaar', name: 'Alien Bazaar', code: 'B-9000', seed: 9001, gravity: 20, amp: 4, scale: 0.015,
      blurb: 'An alien night market. Everything is for sale, especially things that should not be.',
      sky: ['#140733', '#ff6fd0'], fog: '#3a1a63', fogFar: 210, sun: '#ffd9fb', ambient: '#8a6cff',
      ground: ['#3b2b7a', '#4d3a9c', '#2e8c8a'], accent: '#5ff8ff',
      props: [['mushroom', 40], ['stall', 26], ['crate', 40], ['lamp', 30]],
      npc: [['jelly', 8], ['merchant', 5], ['tourist', 4]], pickups: { s: 8, p: 14 }, mat: 'p',
    },
    {
      id: 'moon', name: 'Lowgrav Moon', code: 'L-0', seed: 777, gravity: 7, amp: 12, scale: 0.014,
      blurb: 'A cratered moon with almost no gravity. Jump and you might not come down for a while.',
      sky: ['#000006', '#151536'], fog: '#0d0d24', fogFar: 260, sun: '#ffffff', ambient: '#7a86b8',
      ground: ['#9a9aa6', '#b4b4c0', '#7c7c88'], accent: '#7affea',
      props: [['crystal', 50], ['rock', 50], ['rover', 6], ['antenna', 8]],
      npc: [['mooncrab', 11], ['moonminer', 4]], pickups: { s: 6, c: 16 }, mat: 'c',
    },
    {
      id: 'featherhold', name: 'Bird World', code: 'BW-1', seed: 3131, gravity: 18, amp: 16, scale: 0.011,
      blurb: 'Birdperson\'s home world. Golden cliffs, giant nests, and very proud citizens.',
      sky: ['#2f7fd0', '#ffd9a0'], fog: '#e8c99a', fogFar: 240, sun: '#fff1cc', ambient: '#a89878',
      ground: ['#6f9a3a', '#86ad45', '#a8823f'], accent: '#ffd84d',
      props: [['nest', 18], ['totem', 22], ['featherplant', 40], ['rockspire', 26]],
      npc: [['birdcitizen', 9], ['skyserpent', 7]], pickups: { s: 6, f: 14 }, mat: 'f',
    },
  ];
  MM.DIM_BY_ID = {};
  for (const d of MM.DIMS) MM.DIM_BY_ID[d.id] = d;
  MM.DIM_IDS = MM.DIMS.map(d => d.id);

  // Prop types: r = collision radius, h = height, hp, scrap dropped when destroyed.
  MM.PROPS = {
    house:       { r: 6.5, h: 9,  hp: 260, drop: { s: 6 } },
    tree:        { r: 0.9, h: 8,  hp: 60,  drop: { s: 1 } },
    car:         { r: 2.3, h: 1.9, hp: 90, drop: { s: 4 } },
    mailbox:     { r: 0.4, h: 1.4, hp: 15, drop: { s: 1 } },
    hedge:       { r: 1.6, h: 1.4, hp: 30, drop: { s: 1 } },
    fleshpillar: { r: 1.6, h: 9,  hp: 120, drop: { g: 3 } },
    eyestalk:    { r: 0.6, h: 5,  hp: 30,  drop: { g: 1 } },
    bonearch:    { r: 1.0, h: 8,  hp: 150, drop: { s: 3, g: 1 }, arch: true },
    pustule:     { r: 1.3, h: 1.6, hp: 20, drop: { g: 2 } },
    mushroom:    { r: 1.4, h: 11, hp: 110, drop: { p: 2 } },
    stall:       { r: 2.2, h: 3.4, hp: 70, drop: { s: 2, p: 1 } },
    crate:       { r: 0.8, h: 1.6, hp: 25, drop: { s: 1, p: 1 } },
    lamp:        { r: 0.3, h: 5,  hp: 20,  drop: { p: 1 } },
    crystal:     { r: 1.1, h: 3.5, hp: 50, drop: { c: 2 } },
    rock:        { r: 2.0, h: 2.6, hp: 120, drop: { s: 1, c: 1 } },
    rover:       { r: 2.4, h: 2.4, hp: 110, drop: { s: 6 } },
    antenna:     { r: 0.8, h: 9,  hp: 70,  drop: { s: 3 } },
    nest:        { r: 3.2, h: 3.0, hp: 90,  drop: { f: 3, s: 1 } },
    totem:       { r: 0.9, h: 7,  hp: 80,  drop: { f: 1, s: 2 } },
    featherplant:{ r: 0.6, h: 5,  hp: 25,  drop: { f: 1 } },
    rockspire:   { r: 2.6, h: 12, hp: 200, drop: { s: 2 } },
  };
  // Landmarks are solid, can't be destroyed, and each has its own model.
  for (const l of MM.LANDMARKS) MM.PROPS[l.model] = { r: l.r, h: l.h, hp: 1e9, drop: {}, fixed: true };

  // NPCs. hostile ones chase and bite; the rest are locals you can talk to (F).
  //   human: built like a player, from these look options.  fly: hover height.
  //   talk: lines they say. moods: how likely each crazy reaction is (see sim/host.js).
  MM.NPCS = {
    neighbor: { name: 'Neighbor', hp: 30, speed: 2.5, hostile: false, dmg: 0, drop: { s: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['polo', 'sweater', 'tshirt', 'vest'], acc: ['none', 'none', 'cap'] },
      names: ['Gary', 'Brenda', 'Doug', 'Pam', 'Kevin', 'Linda', 'Todd', 'Marcy', 'Steve', 'Dale'],
      talk: ['Have you seen my cat? He went into a glowing hole.', 'Your garage keeps making that noise again.', 'I am going to complain to the HOA about your portals.',
        'Nice day for a barbecue. Unless the sky opens again.', 'My lawn has been abducted twice this month.', 'Are you the same you as yesterday? You look taller.',
        'I sold my car to a man with tentacles. Good price!', 'Keep it down, some of us have regular jobs.'],
      moods: { line: 45, gift: 12, trade: 8, errand: 14, buff: 6, angry: 6, follow: 5, prank: 2, dance: 2 } },
    schoolkid: { name: 'Student', hp: 25, speed: 3.2, hostile: false, dmg: 0, drop: { s: 1 }, r: 0.5, h: 1.5,
      human: { species: ['human'], top: ['tshirt', 'tshirt', 'sweater'], acc: ['none', 'cap', 'headband'], height: [0.8, 0.95] },
      names: ['Tyler', 'Jess', 'Brad', 'Ethan', 'Nancy', 'Toby', 'Jacquelyn', 'Frank'],
      talk: ['Is it true your family goes to space? That is so lame. Take me.', 'I have a test on a planet I have never heard of.', 'Do not tell anyone, but the principal is a lizard.',
        'Everyone is talking about the kid who got turned into a sofa.', 'Wanna skip class and go to another dimension?'],
      moods: { line: 45, gift: 8, trade: 8, errand: 12, buff: 6, angry: 8, follow: 8, prank: 3, dance: 2 } },
    meatblob: { name: 'Meat Blob', hp: 50, speed: 4.2, hostile: true, dmg: 8, drop: { g: 2 }, r: 0.9, h: 1.6 },
    fleshmonk: { name: 'Flesh Monk', hp: 60, speed: 2, hostile: false, dmg: 0, drop: { g: 3 }, r: 0.8, h: 1.9,
      human: { species: ['blob'], top: ['none'], acc: ['none', 'halo'], eyes: ['three', 'cyclops', 'sleepy'] },
      names: ['Brother Gristle', 'Sister Marrow', 'Elder Sinew', 'Abbot Tendon'],
      talk: ['All flesh is one flesh. Except yours. Yours is a bit weird.', 'The Great Eye sees you. It thinks you are fine.', 'Meditate with me. Feel the pulse of the ground.',
        'We do not eat meat here. Out of politeness.', 'Your atoms remember being something else. Ask them.'],
      moods: { line: 40, gift: 15, trade: 10, errand: 12, buff: 12, angry: 2, follow: 4, prank: 4, dance: 1 } },
    jelly: { name: 'Sky Jelly', hp: 35, speed: 2, hostile: false, dmg: 0, drop: { p: 2 }, r: 0.9, h: 1.6, fly: 4,
      names: ['Blorp', 'Wibble', 'Glimmer'], talk: ['*glorp*', '*wobbles happily*', '*pulses in a rude colour*'],
      moods: { line: 60, gift: 20, buff: 15, prank: 5 } },
    merchant: { name: 'Merchant', hp: 40, speed: 1.5, hostile: false, dmg: 0, drop: { p: 3 }, r: 0.6, h: 1.8,
      human: { species: ['alien', 'robot'], top: ['vest', 'armor', 'labcoat'], acc: ['crown', 'goggles', 'tophat', 'antennae'] },
      names: ['Zorp the Fair', 'Mx. Quillax', 'Grabnar', 'Discount Dave', 'Vendo-9000'],
      talk: ['Everything must go! Including me, eventually.', 'This is a genuine portal fluid. Please do not drink it.', 'For you? Special price. It is the same price.',
        'I accept scrap, plasma, and souls. Mostly scrap.', 'No refunds across dimensions.'],
      moods: { line: 30, gift: 6, trade: 40, errand: 14, buff: 4, angry: 3, prank: 3 } },
    tourist: { name: 'Tourist', hp: 30, speed: 2.5, hostile: false, dmg: 0, drop: { p: 1, s: 1 }, r: 0.6, h: 1.7,
      human: { species: ['alien', 'human', 'beanling'], top: ['tshirt', 'polo'], acc: ['cap', 'goggles', 'none'] },
      names: ['Fleeb', 'Gorgo', 'Tammie', 'Bix', 'Hal from Accounting'],
      talk: ['Can you take our picture? No, with the giant mushroom.', 'We came for the plasma tasting tour.', 'Is this the line for the dimension where everyone is a chair?',
        'My ship is double-parked. In time.', 'I lost my group. They are in a different century.'],
      moods: { line: 45, gift: 10, trade: 8, errand: 15, buff: 4, angry: 4, follow: 10, prank: 2, dance: 2 } },
    mooncrab: { name: 'Moon Crab', hp: 40, speed: 5, hostile: true, dmg: 6, drop: { c: 2 }, r: 0.8, h: 1.0 },
    moonminer: { name: 'Miner', hp: 50, speed: 2.5, hostile: false, dmg: 0, drop: { c: 3 }, r: 0.6, h: 1.8,
      human: { species: ['robot', 'human'], top: ['armor', 'vest'], acc: ['goggles', 'headband', 'cap'] },
      names: ['Rocky', 'Crater Pete', 'Unit 7', 'Dusty', 'Moonbeam Marge'],
      talk: ['Low gravity is great until you sneeze.', 'The crabs took my lunch again.', 'I have been mining this crystal for six years. It is mining me back.',
        'Union rules: no jumping in the refinery.', 'I came here for a two-week contract. In 1987.'],
      moods: { line: 40, gift: 18, trade: 14, errand: 14, buff: 6, angry: 3, follow: 3, prank: 2 } },
    birdcitizen: { name: 'Birdfolk', hp: 70, speed: 3, hostile: false, dmg: 0, drop: { f: 3 }, r: 0.7, h: 2.0,
      human: { species: ['birdfolk'], top: ['armor', 'vest', 'none'], acc: ['none', 'headband', 'crown'] },
      names: ['Talon-Who-Waits', 'Swiftbeak', 'Elder Plume', 'Kestra', 'Brightwing', 'Ashcrest'],
      talk: ['The sky remembers every coward. Also every hero. Mostly cowards.', 'Have you come to train at the Aerie?', 'My mate sends her regards. She does not know you.',
        'We do not do small talk. That was big talk.', 'A warrior walks between worlds. A wise warrior brings snacks.'],
      moods: { line: 45, gift: 12, trade: 8, errand: 14, buff: 10, angry: 8, follow: 3 } },
    skyserpent: { name: 'Sky Serpent', hp: 60, speed: 5.5, hostile: true, dmg: 10, drop: { f: 2, s: 1 }, r: 1.0, h: 1.2, fly: 3 },
    meeseeks: { name: 'Mr. Meeseeks', hp: 30, speed: 6, hostile: false, dmg: 0, drop: {}, r: 0.5, h: 2.0,
      human: { fixed: 'meeseeks' }, names: ['Mr. Meeseeks'],
      talk: ['I\'m Mr. Meeseeks! Look at me!', 'Ooh, can do!', 'Existence is pain!', 'Caaan do!'], moods: { line: 100 } },
    invader: { name: 'Invader', hp: 45, speed: 4.5, hostile: true, dmg: 9, drop: { p: 2, s: 2 }, r: 0.6, h: 1.8,
      human: { species: ['alien'], top: ['armor'], acc: ['antennae', 'goggles'], eyes: ['cyclops', 'visor'] } },
  };

  // Random world events, one at a time per dimension copy, every few minutes.
  //   spawn: temporary NPCs [type, count]   loot: material pickups rained near players
  //   booms: random explosions near players   talkBoost: locals are extra generous
  MM.EVENTS = {
    suburbia: [
      { id: 'party', name: 'Block Party!', text: 'The neighbours are throwing a block party. Free stuff if you chat.', spawn: [['neighbor', 6]], talkBoost: 1, dur: 70 },
      { id: 'invasion', name: 'Alien Invasion!', text: 'Invaders are landing in the suburbs. Defend the lawns (or join in).', spawn: [['invader', 7]], dur: 90 },
    ],
    meatlands: [
      { id: 'meatrain', name: 'Meat Rain', text: 'It is raining goo. Grab it while it is warm.', loot: ['g', 16], dur: 40 },
      { id: 'blobswarm', name: 'Blob Swarm', text: 'The Great Eye is annoyed. More blobs incoming.', spawn: [['meatblob', 8]], dur: 80 },
    ],
    bazaar: [
      { id: 'sale', name: 'Flash Sale', text: 'Everyone at the market is in a giving mood.', talkBoost: 1, spawn: [['merchant', 3]], dur: 70 },
      { id: 'bloom', name: 'Jelly Bloom', text: 'Sky jellies are drifting in, full of plasma.', spawn: [['jelly', 8]], dur: 80 },
    ],
    moon: [
      { id: 'meteors', name: 'Meteor Shower', text: 'Meteors are hitting the surface. Crystals everywhere, explosions everywhere.', loot: ['c', 14], booms: 10, dur: 45 },
      { id: 'crabs', name: 'Crab Migration', text: 'Thousands of crabs. Well, nine. Angry ones.', spawn: [['mooncrab', 9]], dur: 80 },
    ],
    featherhold: [
      { id: 'molting', name: 'Molting Season', text: 'Feathers are falling from the sky. Very majestic, slightly gross.', loot: ['f', 16], dur: 45 },
      { id: 'serpents', name: 'Serpent Hunt', text: 'Sky serpents are circling the cliffs. The elders want them gone.', spawn: [['skyserpent', 6]], dur: 90 },
    ],
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
  // Landmarks sit on flattened ground.
  const lmCache = {};
  function landmarksIn(dimId) {
    if (!lmCache[dimId]) lmCache[dimId] = MM.LANDMARKS.filter(l => l.dim === dimId).map(l => ({ l, y: baseHeight(dimId, l.x, l.z) }));
    return lmCache[dimId];
  }
  MM.heightAt = function (dimId, x, z) {
    let h = baseHeight(dimId, x, z);
    for (const { l, y } of landmarksIn(dimId)) {
      const d = Math.hypot(x - l.x, z - l.z);
      if (d < l.r + 12) h += (y - h) * (1 - smooth(l.r + 2, l.r + 12, d));
    }
    return h;
  };
  function baseHeight(dimId, x, z) {
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
    if (dimId === 'featherhold') h += Math.pow(MM.fbm(x * 0.02 + 5, z * 0.02, dim.seed + 7, 2), 3) * 30 * smooth(30, 60, r);
    h += smooth(MM.WORLD_HALF - 30, MM.WORLD_HALF + 10, Math.max(Math.abs(x), Math.abs(z))) * 28;
    return h;
  }

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
    for (const l of MM.LANDMARKS) if (l.dim === dimId) add(l.model, l.x, l.z, Math.atan2(-l.x, -l.z), 1);
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
