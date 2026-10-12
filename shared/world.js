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
      props: [['tree', 40], ['hedge', 20]], streets: { grid: 44, extent: 150 }, spawn: { x: 2, z: -3, spread: 5 }, kiosk: { x: 15, z: -15 },
      npc: [['neighbor', 9], ['schoolkid', 4]], pickups: { s: 18, c: 2 }, mat: 's',
    },
    {
      id: 'meatlands', flat: 140, name: 'Cronenberg World', code: 'C-131', seed: 4242, gravity: 24, amp: 9, scale: 0.02,
      blurb: 'A love potion went very wrong here. Everything is meat now. It is warm. It is watching.',
      sky: ['#3d0a1c', '#c4485f'], fog: '#7a2236', fogFar: 170, sun: '#ffc2b0', ambient: '#b05068',
      ground: ['#c9576b', '#e07a85', '#9c3a4e'], accent: '#fff2c8',
      props: [['fleshpillar', 40], ['eyestalk', 45], ['bonearch', 12], ['pustule', 40]],
      npc: [['meatblob', 11], ['fleshmonk', 4]], pickups: { s: 8, g: 14 }, mat: 'g',
    },
    {
      id: 'bazaar', flat: 128, name: 'Alien Bazaar', code: 'B-9000', seed: 9001, gravity: 20, amp: 4, scale: 0.015,
      blurb: 'An alien night market. Everything is for sale, especially things that should not be.',
      sky: ['#140733', '#ff6fd0'], fog: '#3a1a63', fogFar: 210, sun: '#ffd9fb', ambient: '#8a6cff',
      ground: ['#3b2b7a', '#4d3a9c', '#2e8c8a'], accent: '#5ff8ff',
      props: [['mushroom', 40], ['stall', 26], ['crate', 40], ['lamp', 30]],
      npc: [['jelly', 8], ['merchant', 5], ['tourist', 4]], pickups: { s: 8, p: 14 }, mat: 'p',
    },
    {
      id: 'moon', flat: 30, name: 'Lowgrav Moon', code: 'L-0', seed: 777, gravity: 7, amp: 12, scale: 0.014,
      blurb: 'A cratered moon with almost no gravity. Jump and you might not come down for a while.',
      sky: ['#000006', '#151536'], fog: '#0d0d24', fogFar: 260, sun: '#ffffff', ambient: '#7a86b8',
      ground: ['#9a9aa6', '#b4b4c0', '#7c7c88'], accent: '#7affea',
      props: [['crystal', 50], ['rock', 50], ['rover', 6], ['antenna', 8]],
      npc: [['mooncrab', 11], ['moonminer', 4]], pickups: { s: 6, c: 16 }, mat: 'c',
    },
    {
      id: 'featherhold', flat: 65, name: 'Bird World', code: 'BW-1', seed: 3131, gravity: 18, amp: 16, scale: 0.011,
      blurb: 'Birdperson\'s home world. Golden cliffs, giant nests, and very proud citizens.',
      sky: ['#2f7fd0', '#ffd9a0'], fog: '#e8c99a', fogFar: 240, sun: '#fff1cc', ambient: '#a89878',
      ground: ['#6f9a3a', '#86ad45', '#a8823f'], accent: '#ffd84d',
      props: [['nest', 18], ['totem', 22], ['featherplant', 40], ['rockspire', 26]],
      npc: [['birdcitizen', 9], ['skyserpent', 7]], pickups: { s: 6, f: 14 }, mat: 'f',
    },
    {
      id: 'citadel', flat: 140, name: 'Citadel of Ricks', code: 'CIT-1', seed: 1337, gravity: 22, amp: 0.4, scale: 0.02,
      blurb: 'A city of infinite Ricks and Mortys floating in space. The Council meets here. Morty Daycare is down the road.',
      sky: ['#04050d', '#1c2c55'], fog: '#18213f', fogFar: 230, sun: '#e8f0ff', ambient: '#8aa0d8',
      ground: ['#8d97a6', '#a3adbb', '#6d7686'], accent: '#5ff8ff', tiles: true,
      props: [['spire', 16], ['rickstatue', 5], ['vending', 26], ['hovercar', 14], ['citbench', 24]],
      npc: [['citrick', 12], ['citmorty', 10], ['citguard', 4]], pickups: { s: 8, k: 14 }, mat: 'k',
    },
    {
      id: 'dogworld', flat: 130, name: "Snowball's Dog World", code: 'DOG-1', seed: 2020, gravity: 24, amp: 4, scale: 0.013,
      blurb: 'Dogs rose up in mech suits and took over. Humans are pets now. Snowball rules from his palace.',
      sky: ['#5aa8ff', '#ffe6c8'], fog: '#d8e8ff', fogFar: 230, sun: '#fff4dc', ambient: '#a8c4ff',
      ground: ['#6fb84a', '#86c95a', '#5a9a3c'], accent: '#ff5a3a',
      props: [['doghouse', 22], ['hydrant', 26], ['bigbone', 14], ['tennisball', 14], ['dogstatue', 6]],
      npc: [['dogcitizen', 10], ['doghuman', 6], ['dogsoldier', 8]], pickups: { s: 12, p: 8 }, mat: 'p',
    },
    {
      id: 'megaseed', name: 'Mega Seed World', code: '35-C', seed: 3535, gravity: 20, amp: 11, scale: 0.016,
      blurb: 'A wild jungle dimension where Mega Seeds grow. Everything here wants to eat you, slowly.',
      sky: ['#ff8a3a', '#ffe08a'], fog: '#e8a868', fogFar: 200, sun: '#fff0c0', ambient: '#c88a6a',
      ground: ['#2f8a6a', '#3aa07a', '#7a4ac0'], accent: '#c8ff6a',
      props: [['seedtree', 34], ['fungus', 40], ['thornbush', 34]],
      npc: [['seedbeast', 12]], pickups: { s: 6, m: 3, g: 4 }, mat: 'm',
    },
    // ----- More dimensions from the show -----
    {
      id: 'blips', name: 'Blips and Chitz', code: 'B&C', seed: 5150, gravity: 24, interior: true, bound: 32, kiosk: { x: 0, z: 22 },
      blurb: 'The best arcade in the galaxy. Live a whole life as Roy, then go again.',
      sky: ['#120a24', '#120a24'], fog: '#120a24', fogFar: 400, sun: '#ffe0ff', ambient: '#c0a8ff',
      ground: ['#2a1a4a', '#3a2a5a', '#22143e'], accent: '#ff6fd0', spawn: { x: 0, z: 14, spread: 3 },
      room: { w: 68, d: 68, h: 11, wall: '#2e1c52', trim: '#ff6fd0' },
      props: [['arcade', 44], ['skeeball', 10], ['claw', 8]], npc: [['arcadegoer', 12]], pickups: { k: 8, p: 6, s: 4 }, mat: 'k',
    },
    {
      id: 'purge', flat: 135, name: 'Purge Planet', code: 'PG-12', seed: 6006, gravity: 24, amp: 3, scale: 0.012,
      blurb: 'A peaceful farming world. Except one night a year, when everyone is allowed to do anything.',
      sky: ['#ff9a5a', '#ffe0a8'], fog: '#f0c090', fogFar: 220, sun: '#fff0d0', ambient: '#e8b080',
      ground: ['#b8a84a', '#9aaa48', '#7e8e3a'], accent: '#ff5a3a',
      props: [['farmhouse', 14], ['barn', 6], ['wheat', 60], ['lantern', 22]], npc: [['purger', 12]], pickups: { s: 14, g: 4 }, mat: 's',
    },
    {
      id: 'squanch', flat: 112, name: 'Planet Squanch', code: 'SQ-1', seed: 7117, gravity: 22, amp: 5, scale: 0.014,
      blurb: 'Squanchy\'s home world. Every night is a party. Every party gets squanched.',
      sky: ['#1a0a3a', '#ff6fd0'], fog: '#4a2a6a', fogFar: 220, sun: '#ffd0f0', ambient: '#c090ff',
      ground: ['#a83a3a', '#c04848', '#8a2a32'], accent: '#ffd84d',   // red grass
      props: [['squanchhut', 20], ['partylight', 26], ['speaker', 14]], npc: [['squanchcat', 12]], pickups: { p: 10, s: 6 }, mat: 'p',
    },
    {
      id: 'gazorp', name: 'Gazorpazorp', code: 'GZ-9', seed: 8228, gravity: 26, amp: 10, scale: 0.015,
      blurb: 'A red desert planet of huge, angry brutes. The ones in charge live somewhere much nicer.',
      sky: ['#8a1a1a', '#ffb070'], fog: '#c06040', fogFar: 210, sun: '#ffe0c0', ambient: '#e08060',
      ground: ['#b8503a', '#c86a4a', '#8a3a2a'], accent: '#ffb070',
      props: [['redmesa', 20], ['bonepile', 16], ['spikeplant', 30]], npc: [['gazorpian', 10]], pickups: { g: 8, s: 6 }, mat: 'g',
    },
    {
      id: 'froopy', name: 'Froopyland', code: 'FR-00', seed: 9339, gravity: 18, amp: 6, scale: 0.013,
      blurb: 'A soft, safe world built for children. Nothing here can hurt you. Probably.',
      sky: ['#9ad8ff', '#ffd6f0'], fog: '#f0e0ff', fogFar: 230, sun: '#ffffff', ambient: '#ffd8f0',
      ground: ['#8ae0a8', '#a8f0c0', '#f0c8e8'], accent: '#ff8fd0',
      props: [['cottontree', 30], ['lollipop', 30], ['rainbow', 6], ['candyrock', 20]], npc: [['froopy', 14]], pickups: { f: 6, p: 6, s: 4 }, mat: 'f',
    },
    {
      id: 'anatomy', flat: 66, name: 'Anatomy Park', code: 'AP-1', seed: 1441, gravity: 24, amp: 6, scale: 0.02,
      blurb: 'A theme park inside a man. Rides, attractions, and a disease problem.',
      sky: ['#5a0a1a', '#c84a5a'], fog: '#7a2a3a', fogFar: 180, sun: '#ffd0d0', ambient: '#d06070',
      ground: ['#c84a5a', '#d85a6a', '#a83a4a'], accent: '#ffe066',
      props: [['bloodcell', 40], ['bonepillar', 16], ['artery', 14]], npc: [['bacteria', 12]], pickups: { g: 12, s: 4 }, mat: 'g',
    },
    {
      id: 'pizzaworld', flat: 135, name: 'Pizza-Phone-Chair Dimension', code: 'PZ-35', seed: 3553, gravity: 24, amp: 3, scale: 0.012, outsideCurve: true,
      blurb: 'People are pizza. Pizza is phones. Phones are people. Chairs sit on people. It makes sense here.',
      sky: ['#7ec0ff', '#e8f4ff'], fog: '#d8ecff', fogFar: 230, sun: '#fff4dc', ambient: '#a8c4ff',
      ground: ['#6fb84a', '#86c95a', '#5a9a3c'], accent: '#e2483d',
      props: [['giantchair', 16], ['giantphone', 14], ['pizzabox', 20], ['couch', 10]], npc: [['pizzaperson', 8], ['phoneperson', 6], ['chairperson', 6]], pickups: { s: 10, p: 4 }, mat: 's',
    },
    {
      id: 'wasteland', flat: 48, name: 'Post-Apocalyptic Earth', code: 'C-5?', seed: 4664, gravity: 24, amp: 6, scale: 0.012,
      blurb: 'A burned-out Earth of sand, spikes and raiders in modified cars. Bring your own water.',
      sky: ['#c88a4a', '#f0d8a0'], fog: '#e0b880', fogFar: 220, sun: '#fff0d0', ambient: '#e0b080',
      ground: ['#d8b878', '#c8a868', '#b89858'], accent: '#ff5a3a',
      props: [['wreck', 26], ['scraptower', 10], ['cactus', 30]], npc: [['raider', 10]], pickups: { s: 18, c: 2 }, mat: 's',
    },
    {
      id: 'microverse', flat: 125, name: 'The Microverse', code: 'MV-1', seed: 5775, gravity: 22, amp: 3, scale: 0.014,
      blurb: 'A tiny universe inside Rick\'s car battery. The locals stomp on gooble boxes to make power. They think it\'s their idea.',
      sky: ['#3aa0ff', '#c8f0ff'], fog: '#c0e8ff', fogFar: 230, sun: '#ffffff', ambient: '#a8d8ff',
      ground: ['#7ac8a0', '#8ad8b0', '#5aa880'], accent: '#ffd84d',
      props: [['microtower', 20], ['microdome', 16], ['tree', 24], ['streetlamp', 16]], npc: [['microperson', 14]], pickups: { c: 10, s: 6 }, mat: 'c',
    },
    {
      id: 'unityworld', flat: 130, name: 'Unity\'s Planet', code: 'UN-1', seed: 6886, gravity: 24, amp: 1, scale: 0.012,
      blurb: 'A whole planet assimilated by Unity. Very clean, very polite, very much one mind.',
      sky: ['#7ab8ff', '#e0f0ff'], fog: '#d8e8ff', fogFar: 230, sun: '#ffffff', ambient: '#c0d8ff',
      ground: ['#5fb86a', '#5a9ad8', '#4aa070'], accent: '#5fd6b0',   // green and blue grass
      props: [['cityblock', 30], ['unitystatue', 3], ['streetlamp', 30]], npc: [['unitydrone', 16]], pickups: { c: 8, k: 4 }, mat: 'c',
    },
    {
      id: 'federation', flat: 130, name: 'Galactic Federation HQ', code: 'GF-1', seed: 7997, gravity: 24, amp: 0.5, scale: 0.02,
      blurb: 'White towers, a prison block and a lot of bug-headed bureaucrats. Do not lose your forms.',
      sky: ['#0a1030', '#3a4a8a'], fog: '#2a3460', fogFar: 230, sun: '#ffffff', ambient: '#a0b0e0',
      ground: ['#d8dde4', '#c8ced6', '#b8bec6'], accent: '#e2483d', tiles: true,
      props: [['fedtower', 14], ['fedship', 12], ['prisonblock', 8], ['streetlamp', 24]], npc: [['fedguard', 10], ['fedclerk', 6]], pickups: { k: 8, c: 6 }, mat: 'k',
    },
    {
      id: 'gearworld', flat: 135, name: 'Planet Gear', code: 'GR-8', seed: 8118, gravity: 24, amp: 5, scale: 0.016,
      blurb: 'Home of the gear people. Everything turns, everything clanks, everyone has a gear on their head.',
      sky: ['#6a5a3a', '#d8c098'], fog: '#b8a078', fogFar: 220, sun: '#fff0d0', ambient: '#d8c0a0',
      ground: ['#8a7a5a', '#9a8a6a', '#6a5a4a'], accent: '#ffd84d',
      props: [['biggear', 24], ['pipe', 20], ['gearhouse', 14]], npc: [['gearperson', 12]], pickups: { s: 16 }, mat: 's',
    },
    // ----- Outside the Central Finite Curve: realities where Rick is not the smartest -----
    {
      id: 'beyond', flat: 150, name: 'Beyond the Curve', code: 'Ω', seed: 9119, gravity: 22, amp: 2, scale: 0.01, outsideCurve: true,
      blurb: 'Where Evil Morty went. Past the wall of the Central Finite Curve: infinite universes, and not one Rick in charge.',
      sky: ['#05040e', '#2a1e08'], fog: '#120c18', fogFar: 260, sun: '#ffe7a8', ambient: '#c8a860',
      ground: ['#1c1830', '#241e3c', '#141024'], accent: '#ffd84d',
      props: [], npc: [['outsider', 12]], pickups: { m: 2, c: 8, p: 6 }, mat: 'c',
    },
    {
      id: 'cableworld', flat: 140, name: 'Interdimensional Cable', code: 'IC-1', seed: 2552, gravity: 24, amp: 2, scale: 0.012, outsideCurve: true,
      blurb: 'The dimension of the commercials. Real Fake Doors, Ants in my Eyes Johnson, and an ad on every wall.',
      sky: ['#6fb8ff', '#e8f4ff'], fog: '#d8ecff', fogFar: 230, sun: '#fff4dc', ambient: '#a8c4ff',
      ground: ['#6fb84a', '#86c95a', '#5a9a3c'], accent: '#ffd84d',
      props: [], npc: [['adperson', 14]], pickups: { k: 10, s: 8 }, mat: 'k',
    },
    {
      id: 'hamsterworld', flat: 140, name: 'Hamster-in-Butt World', code: 'HB-0', seed: 3663, gravity: 24, amp: 3, scale: 0.012, outsideCurve: true,
      blurb: 'Every creature is a hamster, and every home is a person. It is exactly what it sounds like. Wipe your feet.',
      sky: ['#8ac8ff', '#fff0d8'], fog: '#f0e4d0', fogFar: 230, sun: '#fff4dc', ambient: '#e8c8a0',
      ground: ['#8ac85a', '#9ad86a', '#6aa848'], accent: '#e8a868',
      props: [], npc: [['hamster', 16]], pickups: { s: 8, f: 6, p: 4 }, mat: 'f',
    },
    {
      id: 'plumbus', flat: 140, name: 'Plumbubo Prime 51b', code: 'PP-51b', seed: 5115, gravity: 24, amp: 2, scale: 0.012, outsideCurve: true,
      blurb: 'Where plumbuses come from. Everyone knows how they are made, so we will not explain the fleeb.',
      sky: ['#8a6aa8', '#f0d0e8'], fog: '#d8b8d8', fogFar: 220, sun: '#fff0f4', ambient: '#e0b0d0',
      ground: ['#a87a9a', '#b88aaa', '#8a6a8a'], accent: '#f4a0b8',
      props: [], npc: [['blamph', 10], ['plumbusworker', 6]], pickups: { g: 10, s: 8 }, mat: 'g',
    },
    // ----- Rick's garage and what's under it: small indoor dimensions -----
    {
      id: 'rickgarage', name: "Rick's Garage", code: 'C-137', seed: 137, gravity: 24, interior: true, hidden: true, bound: 7.9,
      blurb: 'Where the science happens. Do not touch anything. Especially that.',
      sky: ['#2a2a30', '#2a2a30'], fog: '#2a2a30', fogFar: 400, sun: '#fff4e0', ambient: '#a0a4b0',
      ground: ['#6e6e68', '#686862', '#74746e'], accent: '#39ff6a', spawn: { x: -2, z: 4 },
      // A real garage: khaki walls on wooden studs, beams overhead, a concrete floor.
      room: { w: 17, d: 17, h: 4.6, wall: '#9c936e', trim: '#6e5034', style: 'garage' },
      fixed: [['spacecruiser', 2.4, 3.2, Math.PI], ['curioshelf', -7.7, 6.4, Math.PI / 2], ['housedoor', -8.1, 3.2, Math.PI / 2], ['washer', 7.7, 0.4, -Math.PI / 2], ['washer', 7.7, 2.0, -Math.PI / 2], ['shelf', 7.6, 5.4, -Math.PI / 2], ['toolchest', -7.5, -1.0, Math.PI / 2]],
      props: [], npc: [['butterbot', 1]], pickups: {}, mat: 's',
    },
    {
      id: 'ricklab', name: 'Secret Underground Lab', code: 'C-137', seed: 138, gravity: 24, interior: true, hidden: true, bound: 11,
      blurb: 'Under the garage. Clone tanks, a very large computer, and a drawer of memories.',
      sky: ['#101418', '#101418'], fog: '#101418', fogFar: 400, sun: '#cfe8ff', ambient: '#7a90a8',
      ground: ['#4a5260', '#566070', '#3e4652'], accent: '#5ff8ff', spawn: { x: 0, z: 6 },
      room: { w: 23, d: 23, h: 6, wall: '#5a6474', trim: '#2a3240' },
      fixed: [['clonetank', -6, -9, 0], ['clonetank', -2, -9, 0], ['clonetank', 2, -9, 0], ['bigcomputer', 8, -6, -Math.PI / 2], ['labmachine', 8, 4, -Math.PI / 2]],
      props: [], npc: [], pickups: { c: 3 }, mat: 'c',
    },
    {
      id: 'cellar', name: "Rick's Wine Cellar", code: '?', seed: 139, gravity: 24, interior: true, hidden: true, bound: 11,
      blurb: 'A pocket dimension behind a door in the garage. Rick keeps his good stuff here.',
      sky: ['#1a0e0a', '#1a0e0a'], fog: '#1a0e0a', fogFar: 400, sun: '#ffd8a0', ambient: '#a07850',
      ground: ['#6a4a32', '#5a3e2a', '#7a5638'], accent: '#ff9b4d', spawn: { x: 0, z: 6 },
      room: { w: 23, d: 23, h: 5, wall: '#6e4a30', trim: '#3a2618' },
      fixed: [['barrel', -8, -2, 0], ['barrel', -8, 2, 0], ['barrel', 8, -2, 0], ['barrel', 8, 2, 0], ['bottlerack', -6, -9, 0], ['bottlerack', 6, -9, 0]],
      props: [], npc: [], pickups: { p: 2 }, mat: 'p',
    },
  ];
  MM.DIM_BY_ID = {};
  for (const d of MM.DIMS) MM.DIM_BY_ID[d.id] = d;
  MM.DIM_IDS = MM.DIMS.map(d => d.id);
  // Dimensions you can portal or kiosk to (the garage and its rooms are reached through doors).
  MM.WORLD_IDS = MM.DIMS.filter(d => !d.hidden).map(d => d.id);
  MM.boundOf = dimId => MM.DIM_BY_ID[dimId].bound || MM.WORLD_HALF;
  // Outdoor worlds have a public kiosk; indoor ones only if they declare one (Blips and Chitz does).
  MM.hasKiosk = dimId => { const d = MM.DIM_BY_ID[dimId]; return !d.interior || !!d.kiosk; };

  // Prop types: r = collision radius, h = height, hp, scrap dropped when destroyed.
  MM.PROPS = {
    house:       { r: 6.3, h: 10, hp: 260, drop: { s: 6 } },
    house2:      { r: 7.0, h: 6.5, hp: 220, drop: { s: 5 } },
    streetlamp:  { r: 0.3, h: 5.5, hp: 25, drop: { s: 1 } },
    fence:       { r: 2.2, h: 1.2, hp: 15, drop: { s: 1 }, arch: true },
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
  Object.assign(MM.PROPS, {
    spire:       { r: 2.6, h: 26, hp: 400, drop: { s: 3, k: 2 } },
    rickstatue:  { r: 2.2, h: 11, hp: 300, drop: { k: 4 } },
    vending:     { r: 0.8, h: 2.4, hp: 40, drop: { k: 2, s: 1 } },
    hovercar:    { r: 2.0, h: 1.6, hp: 90, drop: { s: 3, k: 1 } },
    citbench:    { r: 1.0, h: 1.0, hp: 20, drop: { s: 1 } },
    doghouse:    { r: 3.0, h: 4.5, hp: 120, drop: { s: 3 } },
    hydrant:     { r: 0.5, h: 1.4, hp: 25, drop: { s: 1 } },
    bigbone:     { r: 2.4, h: 1.2, hp: 60, drop: { s: 2, p: 1 } },
    tennisball:  { r: 1.5, h: 3.0, hp: 40, drop: { p: 1 } },
    dogstatue:   { r: 2.2, h: 9, hp: 250, drop: { s: 4, p: 2 } },
    seedtree:    { r: 1.8, h: 14, hp: 160, drop: { g: 2, s: 1 } },
    fungus:      { r: 1.0, h: 3.0, hp: 30, drop: { g: 1 } },
    thornbush:   { r: 1.4, h: 2.0, hp: 30, drop: { s: 1 } },
    arcade:      { r: 0.9, h: 2.4, hp: 60, drop: { k: 2 } },
    skeeball:    { r: 1.3, h: 1.8, hp: 50, drop: { k: 1 } },
    claw:        { r: 1.0, h: 2.6, hp: 60, drop: { k: 2, p: 1 } },
    farmhouse:   { r: 4.0, h: 6, hp: 160, drop: { s: 4 } },
    barn:        { r: 5.0, h: 8, hp: 220, drop: { s: 6 } },
    wheat:       { r: 1.6, h: 1.4, hp: 10, drop: { s: 1 }, arch: true },
    lantern:     { r: 0.3, h: 3.2, hp: 15, drop: { s: 1 } },
    squanchhut:  { r: 2.6, h: 4.2, hp: 90, drop: { p: 2 } },
    partylight:  { r: 0.4, h: 6, hp: 25, drop: { p: 1 } },
    speaker:     { r: 1.1, h: 2.6, hp: 40, drop: { s: 2 } },
    redmesa:     { r: 4.5, h: 9, hp: 400, drop: { g: 2, s: 2 } },
    bonepile:    { r: 1.6, h: 1.4, hp: 30, drop: { s: 1 } },
    spikeplant:  { r: 0.8, h: 2.2, hp: 20, drop: { g: 1 } },
    cottontree:  { r: 1.0, h: 6, hp: 30, drop: { f: 1 } },
    lollipop:    { r: 0.5, h: 4, hp: 20, drop: { p: 1 } },
    rainbow:     { r: 1.0, h: 10, hp: 1e9, drop: {}, arch: true, fixed: true },
    candyrock:   { r: 1.4, h: 1.8, hp: 40, drop: { f: 1, s: 1 } },
    bloodcell:   { r: 1.6, h: 1.2, hp: 25, drop: { g: 1 } },
    bonepillar:  { r: 1.4, h: 9, hp: 200, drop: { s: 3 } },
    artery:      { r: 1.2, h: 8, hp: 90, drop: { g: 2 }, arch: true },
    giantchair:  { r: 2.2, h: 6, hp: 120, drop: { s: 3 } },
    giantphone:  { r: 1.4, h: 5, hp: 80, drop: { s: 2, c: 1 } },
    pizzabox:    { r: 1.8, h: 0.9, hp: 30, drop: { s: 1 } },
    couch:       { r: 2.4, h: 2.2, hp: 70, drop: { s: 2 } },
    wreck:       { r: 2.2, h: 1.8, hp: 90, drop: { s: 4 } },
    scraptower:  { r: 2.0, h: 9, hp: 160, drop: { s: 5 } },
    cactus:      { r: 0.6, h: 3.4, hp: 25, drop: { g: 1 } },
    microtower:  { r: 2.0, h: 14, hp: 200, drop: { c: 2, s: 2 } },
    microdome:   { r: 3.0, h: 4, hp: 120, drop: { c: 2 } },
    cityblock:   { r: 4.5, h: 16, hp: 400, drop: { s: 4, c: 1 } },
    unitystatue: { r: 2.0, h: 9, hp: 300, drop: { k: 3 } },
    fedtower:    { r: 3.0, h: 22, hp: 400, drop: { k: 3, s: 3 } },
    fedship:     { r: 3.0, h: 2.6, hp: 140, drop: { s: 4, c: 2 } },
    prisonblock: { r: 4.0, h: 6, hp: 300, drop: { k: 2, s: 3 } },
    biggear:     { r: 2.6, h: 6, hp: 160, drop: { s: 4 } },
    pipe:        { r: 0.8, h: 5, hp: 60, drop: { s: 2 } },
    gearhouse:   { r: 3.2, h: 5, hp: 140, drop: { s: 4 } },
    // Garage and lab furniture: solid, unbreakable (Rick would be furious).
    spacecruiser:{ r: 3.0, h: 2.6, hp: 1e9, drop: {}, fixed: true },
    shelf:       { r: 1.4, h: 3.2, hp: 1e9, drop: {}, fixed: true },
    weaponrack:  { r: 1.6, h: 3.0, hp: 1e9, drop: {}, fixed: true },
    beakers:     { r: 1.4, h: 1.6, hp: 1e9, drop: {}, fixed: true },
    drums:       { r: 1.0, h: 1.4, hp: 1e9, drop: {}, fixed: true },
    toolchest:   { r: 1.0, h: 1.6, hp: 1e9, drop: {}, fixed: true },
    curioshelf:  { r: 1.0, h: 2.4, hp: 1e9, drop: {}, fixed: true },
    // Outside the Curve
    goldorb:     { r: 0.9, h: 4, hp: 80, drop: { c: 2 } },
    voidcrystal: { r: 0.8, h: 3.5, hp: 60, drop: { c: 2 } },
    curvepillar: { r: 1.3, h: 12, hp: 300, drop: { c: 2, s: 2 } },
    storefront:  { r: 5.0, h: 6.5, hp: 220, drop: { s: 4, k: 1 } },
    tvscreen:    { r: 1.6, h: 7.5, hp: 120, drop: { s: 2, c: 1 } },
    doorframe:   { r: 0.8, h: 2.6, hp: 30, drop: { s: 1 } },
    humanhouse:  { r: 3.2, h: 6, hp: 200, drop: { g: 2, f: 2 } },
    hamsterwheel:{ r: 1.3, h: 2.6, hp: 40, drop: { s: 1 } },
    seedpile:    { r: 0.9, h: 0.8, hp: 15, drop: { f: 1 } },
    factory:     { r: 7.0, h: 10, hp: 400, drop: { s: 5, g: 2 } },
    conveyor:    { r: 2.6, h: 1.6, hp: 120, drop: { s: 3 } },
    fleebvat:    { r: 1.6, h: 3.2, hp: 90, drop: { g: 3 } },
    plumbuspile: { r: 1.2, h: 1.6, hp: 40, drop: { g: 1, p: 1 } },
    housedoor:   { r: 0.6, h: 2.4, hp: 1e9, drop: {}, fixed: true },
    washer:      { r: 0.75, h: 1.1, hp: 1e9, drop: {}, fixed: true },
    clonetank:   { r: 1.0, h: 3.6, hp: 1e9, drop: {}, fixed: true },
    bigcomputer: { r: 2.2, h: 4.0, hp: 1e9, drop: {}, fixed: true },
    labmachine:  { r: 1.8, h: 3.0, hp: 1e9, drop: {}, fixed: true },
    barrel:      { r: 1.0, h: 1.8, hp: 1e9, drop: {}, fixed: true },
    bottlerack:  { r: 1.6, h: 3.0, hp: 1e9, drop: {}, fixed: true },
  });

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
    citrick: { name: 'Rick', hp: 60, speed: 2.6, hostile: false, dmg: 0, drop: { k: 3 }, r: 0.6, h: 2.0,
      human: { variant: 'genius' }, names: ['Rick D-99', 'Rick C-132', 'Rick J-22', 'Cop Rick', 'Rick K-83', 'Cowboy Rick', 'Rick Q-9', 'Rick Z-4'],
      talk: ['Ugh. Another Rick. Get in line.', 'Nice Morty you got there. Is it a Morty? Whatever.', 'The Council is corrupt and I am the only one who sees it.', 'Wubba lubba dub dub!',
        'I am not drunk, I am temporally misaligned.', 'Do not trust the Ricks in the purple robes.', 'I traded my Morty for a sandwich. Good sandwich.'],
      moods: { line: 40, gift: 14, trade: 14, errand: 12, buff: 6, angry: 8, follow: 3, prank: 3 } },
    citmorty: { name: 'Morty', hp: 40, speed: 3.2, hostile: false, dmg: 0, drop: { k: 2 }, r: 0.5, h: 1.6,
      human: { variant: 'sidekick' }, names: ['Morty C-131', 'Morty K-22', 'Morty D-716', 'Cool Morty', 'Lil Morty', 'Morty Q-17'],
      talk: ['Aw jeez, aw man.', 'H-have you seen my Rick? He said he would be right back. That was a year ago.', 'I am just trying to get to Morty Daycare.', 'Every Morty here is so... Morty.',
        'Do not go to the shady part of the Citadel. Trust me.'],
      moods: { line: 45, gift: 10, trade: 8, errand: 14, buff: 6, angry: 4, follow: 10, prank: 1, dance: 2 } },
    citguard: { name: 'Citadel Guard', hp: 90, speed: 3, hostile: false, dmg: 10, drop: { k: 4, s: 2 }, r: 0.6, h: 2.0,
      human: { variant: 'genius', top: 'armor', acc: 'goggles' }, names: ['Guard Rick', 'Officer Rick', 'Sergeant Rick'],
      talk: ['Move along, Rick.', 'Papers. Portal papers. Now.', 'The Council sees all. Mostly.', 'No loitering near the Council.'],
      moods: { line: 55, angry: 25, trade: 10, buff: 5, errand: 5 } },
    dogcitizen: { name: 'Dog', hp: 45, speed: 3.5, hostile: false, dmg: 6, drop: { p: 2 }, r: 0.7, h: 1.4,
      names: ['Rex', 'Biscuit', 'Duke', 'Princess', 'Sir Barksalot', 'Muffin', 'General Fluff'],
      talk: ['Bark! I mean, hello, human.', 'Who is a good boy? It is me. I am the good boy.', 'Snowball says humans make excellent pets.', 'Do NOT throw that stick. Please. Please throw it.',
        'We remember the vacuum cleaner. We will always remember.', 'Sit. Good human.'],
      moods: { line: 45, gift: 12, trade: 8, errand: 12, buff: 8, angry: 8, follow: 6, dance: 1 } },
    doghuman: { name: 'Pet Human', hp: 30, speed: 2.5, hostile: false, dmg: 0, drop: { s: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['tshirt', 'sweater', 'none'], acc: ['headband', 'none'] }, names: ['Buddy', 'Champ', 'Sparky', 'Good Boy Dave', 'Fluffy'],
      talk: ['They feed us twice a day. It is not terrible.', 'Do not let them take you to the vet.', 'I used to be an accountant. Now I fetch.', 'Psst. Is there a way out of here?'],
      moods: { line: 45, gift: 10, errand: 18, buff: 6, follow: 15, angry: 2, prank: 2, dance: 2 } },
    dogsoldier: { name: 'Mech Dog', hp: 75, speed: 4.6, hostile: true, dmg: 12, drop: { s: 3, p: 2 }, r: 0.9, h: 1.8 },
    seedbeast: { name: 'Seed Beast', hp: 65, speed: 4.4, hostile: true, dmg: 11, drop: { g: 2, m: 1 }, r: 1.0, h: 1.4 },
    butterbot: { name: 'Butter Robot', hp: 20, speed: 1.2, hostile: false, dmg: 0, drop: { s: 1 }, r: 0.4, h: 0.6,
      names: ['Butter Robot'], talk: ['What is my purpose?', 'I pass butter?', 'Oh my god.', 'Yeah, welcome to the club, pal.', 'I am still processing that.'],
      moods: { line: 80, follow: 10, gift: 10 } },
    arcadegoer: { name: 'Gamer', hp: 30, speed: 2.6, hostile: false, dmg: 0, drop: { k: 2 }, r: 0.6, h: 1.8,
      human: { species: ['alien', 'human', 'blob', 'robot'], top: ['tshirt', 'vest', 'sweater'], acc: ['cap', 'goggles', 'none'] }, names: ['Bix', 'Gorp', 'Lil Zap', 'Troy-adjacent', 'Kelvin', 'Zorbo'],
      talk: ['I just lived 55 years as Roy. I need a minute.', 'This machine ate my Schmeckles.', 'Want to play Trunk People? It is so real.', 'High score or nothing.', 'Do NOT touch the claw machine. It is rigged by a sentient claw.'],
      moods: { line: 45, gift: 12, trade: 12, errand: 10, buff: 8, angry: 5, follow: 5, dance: 3 } },
    purger: { name: 'Farmer', hp: 40, speed: 2.4, hostile: false, dmg: 8, drop: { s: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['vest', 'polo', 'sweater'], acc: ['cap', 'none', 'tophat'] }, names: ['Farmer Jeb', 'Aunt Mabel', 'Elder Holt', 'Little Pip', 'Old Man Crane'],
      talk: ['Lovely day. Lovely, peaceful day.', 'The Festival is coming. You should stay for it.', 'We grow wheat and we are very calm.', 'Lock your doors tonight. Or do not. Your choice.', 'Have you tried our pie? It is so peaceful.'],
      moods: { line: 50, gift: 14, trade: 8, errand: 12, buff: 4, angry: 8, follow: 2, prank: 2 } },
    purgekiller: { name: 'Purger', hp: 55, speed: 4.8, hostile: true, dmg: 10, drop: { s: 3, g: 1 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['armor', 'vest'], acc: ['eyepatch', 'goggles', 'headband'] } },
    squanchcat: { name: 'Squanchian', hp: 50, speed: 3, hostile: false, dmg: 6, drop: { p: 2 }, r: 0.6, h: 1.6,
      human: { variant: 'squanchy' }, names: ['Squanchelo', 'Squanchelle', 'Big Squanch', 'Lil Squanchy', 'Squanch Doe'],
      talk: ['Hey, you squanching for the party tonight?', 'I squanched my squanch, if you know what I squanch.', 'Squanchy is a hero around here.', 'Do not squanch the Federation. They squanched us bad.', 'Squaaanch!'],
      moods: { line: 45, gift: 12, trade: 10, errand: 10, buff: 8, angry: 4, follow: 6, dance: 5 } },
    gazorpian: { name: 'Gazorpian', hp: 90, speed: 4.2, hostile: true, dmg: 14, drop: { g: 3, s: 2 }, r: 1.2, h: 2.6 },
    froopy: { name: 'Froopy', hp: 30, speed: 2.8, hostile: false, dmg: 0, drop: { f: 2 }, r: 0.7, h: 1.4,
      names: ['Fluffle', 'Snoob', 'Mister Wobbs', 'Bloop', 'Gentle Toot'],
      talk: ['Welcome to Froopyland! Nothing here can hurt you.', 'Do you want to play forever? FOREVER?', 'We do not talk about the lake.', 'Hug? Hug. Hug!', 'Tommy used to live here. Tommy is fine.'],
      moods: { line: 45, gift: 15, trade: 6, errand: 10, buff: 12, follow: 8, prank: 2, dance: 2 } },
    bacteria: { name: 'Disease', hp: 45, speed: 4.4, hostile: true, dmg: 9, drop: { g: 2 }, r: 0.8, h: 1.2 },
    pizzaperson: { name: 'Pizza Person', hp: 35, speed: 2.6, hostile: false, dmg: 0, drop: { s: 1, p: 1 }, r: 0.6, h: 1.9,
      names: ['Pepperoni Paul', 'Margherita', 'Deep Dish Dan', 'Hawaiian Hank'], talk: ['Hello, I would like to order a phone.', 'Do not sit on me. I am not a chair.', 'Eat me? Rude.', 'I am delivering myself.'],
      moods: { line: 55, gift: 12, trade: 10, errand: 10, buff: 6, angry: 4, dance: 3 } },
    phoneperson: { name: 'Phone Person', hp: 35, speed: 2.6, hostile: false, dmg: 0, drop: { c: 1, s: 1 }, r: 0.6, h: 1.9,
      names: ['Rotary Rita', 'Cordless Carl', 'Flip'], talk: ['Ring ring. That is me talking.', 'I am expecting a call from a pizza.', 'Please hold.'],
      moods: { line: 55, gift: 12, trade: 10, errand: 10, buff: 6, angry: 4, dance: 3 } },
    chairperson: { name: 'Chair Person', hp: 45, speed: 2.2, hostile: false, dmg: 0, drop: { s: 2 }, r: 0.7, h: 1.9,
      names: ['Recliner Ray', 'Stool', 'Lady Ottoman'], talk: ['Mind if I sit on you?', 'My back is killing me. I am mostly back.', 'I have legs. Four of them.'],
      moods: { line: 55, gift: 10, trade: 10, errand: 10, buff: 6, angry: 6, dance: 3 } },
    raider: { name: 'Raider', hp: 60, speed: 4.6, hostile: true, dmg: 11, drop: { s: 3 }, r: 0.6, h: 1.9,
      human: { species: ['human'], top: ['armor', 'vest', 'none'], acc: ['goggles', 'eyepatch', 'headband', 'none'] } },
    microperson: { name: 'Microversian', hp: 30, speed: 3, hostile: false, dmg: 0, drop: { c: 2 }, r: 0.6, h: 1.8,
      human: { species: ['alien'], top: ['vest', 'labcoat', 'sweater'], acc: ['antennae', 'none', 'goggles'] }, names: ['Zeep-ish', 'Kyle', 'Flurbo', 'Gooble Jane'],
      talk: ['We stomp the gooble boxes and the power just flows. Nobody knows why.', 'A scientist once came from the sky. He was rude.', 'Our universe is the biggest one there is. Obviously.', 'Have you seen the Miniverse? Me neither.'],
      moods: { line: 45, gift: 15, trade: 10, errand: 12, buff: 8, angry: 4, follow: 4 } },
    unitydrone: { name: 'Unity', hp: 35, speed: 2.6, hostile: false, dmg: 0, drop: { c: 1, k: 1 }, r: 0.6, h: 1.8,
      // Unity's hosts on her planet: blue-skinned people with feelers on their heads.
      human: { species: ['alien'], top: ['sweater', 'vest', 'polo'], acc: ['antennae'], skin: '#6e9bd6', colors: { topColor: '#5fd6b0', shirtColor: '#5fd6b0', pantsColor: '#2a3a5a' } }, names: ['Unity', 'Unity', 'Unity'],
      talk: ['We are Unity.', 'We are so happy you came. We are always happy.', 'We missed Rick. We are fine.', 'Would you like to join us? It is very relaxing.'],
      moods: { line: 55, gift: 12, trade: 8, errand: 8, buff: 10, follow: 6, dance: 1 } },
    fedguard: { name: 'Federation Guard', hp: 70, speed: 4.4, hostile: true, dmg: 10, drop: { k: 3, s: 2 }, r: 0.6, h: 2.0,
      human: { species: ['insect'], top: ['armor'], acc: ['none'], skin: '#6e7a4a', colors: { topColor: '#3c6fb5', pantsColor: '#2a3a5a' } } },
    fedclerk: { name: 'Federation Clerk', hp: 40, speed: 2.4, hostile: false, dmg: 0, drop: { k: 2 }, r: 0.6, h: 2.0,
      human: { species: ['insect'], top: ['polo', 'sweater'], acc: ['none'], skin: '#7a8456', colors: { topColor: '#d8dde2' } }, names: ['Clerk 7', 'Clerk 12', 'Supervisor Zz'],
      talk: ['Form 7-G, in triplicate.', 'Your request has been received and will be ignored.', 'Rick Sanchez is the most wanted man in the galaxy.', 'Please take a number.'],
      moods: { line: 50, gift: 8, trade: 14, errand: 14, buff: 4, angry: 6, prank: 2 } },
    gearperson: { name: 'Gearperson', hp: 50, speed: 2.6, hostile: false, dmg: 6, drop: { s: 3 }, r: 0.6, h: 1.9,
      human: { species: ['robot'], top: ['armor', 'vest'], acc: ['goggles', 'crown', 'none'] }, names: ['Gearhead', 'Cogsworth', 'Revolio', 'Sprocket'],
      talk: ['Everything here turns. It is very satisfying.', 'You are not a gear person. That is fine.', 'Do NOT tell me about the gear wars.', 'Grind on, friend.'],
      moods: { line: 50, gift: 12, trade: 12, errand: 10, buff: 6, angry: 6, follow: 4 } },
    outsider: { name: 'Outsider', hp: 35, speed: 2.6, hostile: false, dmg: 0, drop: { c: 2, m: 1 }, r: 0.6, h: 1.6,
      human: { variant: 'evilmorty' }, names: ['Free Morty', 'Morty Prime', 'Unbound Morty', 'Golden Morty'],
      talk: ['No Ricks out here. It is so quiet.', 'The Curve was a fence. We just walked out.', 'Every one of those lights is a universe nobody controls.', 'Gold portals only. Green is so last Curve.', 'You came from inside? Brave.'],
      moods: { line: 50, gift: 14, trade: 8, errand: 10, buff: 10, follow: 6, dance: 2 } },
    adperson: { name: 'Pitchman', hp: 35, speed: 2.6, hostile: false, dmg: 0, drop: { k: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human', 'alien'], top: ['polo', 'sweater', 'labcoat'], acc: ['none', 'cap', 'goggles'] }, names: ['Real Fake Doors Guy', 'Ants in my Eyes Johnson', 'Baby Legs', 'Gazorpazorp Field', 'Turbulent Juice Guy', 'Ball Fondlers'],
      talk: ["Come on down to Real Fake Doors! Don't get in there, it's fake!", "I'm Ants in my Eyes Johnson! Everything's black! I can't see a thing!", 'Turbulent Juice! It will be in your body faster than you can say "what".', 'Do you have Plumbuses? Everyone has a Plumbus.', 'Two Brothers. In a van. This summer.', 'This message brought to you by Lil Bits.'],
      moods: { line: 50, gift: 12, trade: 16, errand: 10, buff: 6, dance: 4, prank: 2 } },
    hamster: { name: 'Hamster', hp: 20, speed: 3.4, hostile: false, dmg: 0, drop: { f: 1, p: 1 }, r: 0.5, h: 0.8,
      names: ['Nibbles', 'Mr. Whiskers', 'Biscuit', 'Professor Squeak'],
      talk: ['*squeak* Welcome to the neighbourhood.', 'Lovely house, isn\'t it? Very warm. Do not ask.', 'We all live in people here. It is normal.', '*runs in a wheel for a while*'],
      moods: { line: 55, gift: 15, trade: 8, errand: 10, buff: 8, follow: 4 } },
    blamph: { name: 'Blamph', hp: 40, speed: 2.4, hostile: false, dmg: 0, drop: { g: 2 }, r: 0.7, h: 1.4,
      names: ['Blamph', 'Old Blamph', 'Blamph Jr.'],
      talk: ['The blamphs rub it down. That is me. I am a blamph.', 'Mind the fleeb juice.', 'Every plumbus is made by hand, the old way.'],
      moods: { line: 55, gift: 12, trade: 12, errand: 12, buff: 4 } },
    plumbusworker: { name: 'Plumbus Worker', hp: 35, speed: 2.4, hostile: false, dmg: 0, drop: { g: 1, s: 1 }, r: 0.6, h: 1.8,
      human: { species: ['alien', 'blob'], top: ['vest', 'labcoat'], acc: ['goggles', 'cap'] }, names: ['Schlami', 'Shift Boss', 'Grumbo'],
      talk: ['First they take the dinglebop, and they smooth it out with a bunch of schleem.', 'The schleem is then repurposed for later batches.', 'Then they cut the fleeb. There are several hizzards in the way.', 'Union break in five.'],
      moods: { line: 55, gift: 10, trade: 14, errand: 12, buff: 4 } },
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
    citadel: [
      { id: 'election', name: 'Citadel Election', text: 'Campaign Ricks are handing out Schmeckles for votes.', talkBoost: 1, loot: ['k', 12], dur: 70 },
      { id: 'raid', name: 'Federation Raid', text: 'The Galactic Federation is raiding the Citadel!', spawn: [['invader', 8]], dur: 90 },
    ],
    dogworld: [
      { id: 'uprising', name: 'Mech Dog Patrol', text: 'Snowball sent his soldiers to round up stray humans.', spawn: [['dogsoldier', 7]], dur: 90 },
      { id: 'treats', name: 'Treat Day', text: 'Treats are falling from the sky. Everyone is a good boy today.', loot: ['p', 12], talkBoost: 1, dur: 50 },
    ],
    megaseed: [
      { id: 'seedfall', name: 'Seed Drop', text: 'The great trees are dropping Mega Seeds. Grab them!', loot: ['m', 5], dur: 40 },
      { id: 'pack', name: 'Feeding Time', text: 'A pack of Seed Beasts is hunting.', spawn: [['seedbeast', 7]], dur: 80 },
    ],
    blips: [{ id: 'jackpot', name: 'Jackpot!', text: 'Every machine is paying out. Grab the tickets!', loot: ['k', 14], dur: 40 }],
    purge: [
      { id: 'purgenight', name: 'The Purge', text: 'The Festival has begun. The peaceful farmers are not peaceful anymore.', spawn: [['purgekiller', 10]], dur: 90 },
      { id: 'harvest', name: 'Harvest Day', text: 'The farmers are sharing the harvest.', loot: ['s', 14], talkBoost: 1, dur: 50 },
    ],
    squanch: [
      { id: 'squanchparty', name: 'Squanch Party', text: 'Everyone is squanching. Free plasma for everyone.', loot: ['p', 12], talkBoost: 1, dur: 60 },
      { id: 'occupation', name: 'Federation Patrol', text: 'The Federation is cracking down on Planet Squanch.', spawn: [['fedguard', 7]], dur: 90 },
    ],
    gazorp: [{ id: 'brutes', name: 'Brute Stampede', text: 'A pack of Gazorpians is on the rampage.', spawn: [['gazorpian', 6]], dur: 80 }],
    froopy: [{ id: 'sugar', name: 'Sugar Rush', text: 'It is raining candy. And feathers. Do not ask.', loot: ['f', 12], talkBoost: 1, dur: 50 }],
    anatomy: [{ id: 'outbreak', name: 'Outbreak', text: 'The diseases have escaped containment. Again.', spawn: [['bacteria', 9]], dur: 90 }],
    pizzaworld: [{ id: 'delivery', name: 'Rush Hour', text: 'Everyone is delivering everyone. Grab a slice.', loot: ['s', 12], talkBoost: 1, dur: 50 }],
    wasteland: [{ id: 'convoy', name: 'Raider Convoy', text: 'Raiders are coming over the dunes.', spawn: [['raider', 8]], dur: 90 }],
    microverse: [{ id: 'surge', name: 'Power Surge', text: 'The gooble boxes are overflowing with power.', loot: ['c', 12], dur: 45 }],
    unityworld: [{ id: 'parade', name: 'Unity Parade', text: 'All of Unity is celebrating. They are very generous.', talkBoost: 1, loot: ['k', 8], dur: 60 }],
    federation: [{ id: 'lockdown', name: 'Lockdown', text: 'Alarm! The Federation is hunting intruders.', spawn: [['fedguard', 8]], dur: 90 }],
    beyond: [{ id: 'shower', name: 'Universe Shower', text: 'A thousand new universes flicker into being. Some fall down here.', loot: ['c', 14], dur: 45 }],
    cableworld: [{ id: 'sale', name: 'Limited Time Offer!', text: 'Everything is on sale. Call now. Operators are standing by.', talkBoost: 1, loot: ['k', 12], dur: 50 }],
    hamsterworld: [{ id: 'wheel', name: 'Wheel Day', text: 'It is Wheel Day! Every hamster is out running, and they are generous.', talkBoost: 1, loot: ['f', 10], dur: 50 }],
    plumbus: [{ id: 'batch', name: 'Fresh Batch', text: 'A fresh batch of plumbuses rolls off the line. Grab the offcuts.', loot: ['g', 14], dur: 45 }],
    gearworld: [{ id: 'grind', name: 'The Big Grind', text: 'The great gears turn and spill scrap everywhere.', loot: ['s', 16], dur: 45 }],
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
    if (dim.interior) return 0;
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
    if (dimId === 'suburbia') h *= smooth(138, 160, Math.max(Math.abs(x), Math.abs(z)));
    if (dim.flat) h *= smooth(dim.flat, dim.flat + 30, Math.max(Math.abs(x), Math.abs(z)));   // towns sit on level ground
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
  // Each dimension can put its kiosk somewhere else (on Earth it stands on a lawn, not in the road).
  MM.kioskOf = dimId => MM.DIM_BY_ID[dimId].kiosk || MM.KIOSK;

  // ---------- Props ----------
  const propCache = {}, layoutCache = {};
  // The roads and plazas of a planned world (empty for the rest).
  MM.layoutOf = function (dimId) { MM.genProps(dimId); return layoutCache[dimId] || { roads: [], plazas: [] }; };
  MM.genProps = function (dimId) {
    if (propCache[dimId]) return propCache[dimId];
    const dim = MM.DIM_BY_ID[dimId];
    const r = MM.rng(dim.seed);
    const out = [];
    const layout = MM.LAYOUTS && MM.LAYOUTS[dimId];
    const free = (x, z, rad, tight) => {
      if (!dim.interior) {
        if (Math.hypot(x, z) < (layout ? 15 : 22) + rad) return false;   // a town keeps its square clear by itself
        const K = MM.kioskOf(dimId);
        if (Math.hypot(x - K.x, z - K.z) < 8 + rad) return false;
      } else if (dim.fixed) return true;
      else if (dim.spawn && Math.hypot(x - dim.spawn.x, z - dim.spawn.z) < 6 + rad) return false;
      else if (dim.kiosk && Math.hypot(x - dim.kiosk.x, z - dim.kiosk.z) < 6 + rad) return false;
      for (const p of out) if (Math.hypot(p.x - x, p.z - z) < p.r + rad + (tight ? 0.2 : 1.5)) return false;
      return true;
    };
    const add = (type, x, z, rot, scale) => {
      const t = MM.PROPS[type];
      out.push({ id: out.length, type, x, z, rot, s: scale, r: t.r * scale, h: t.h * scale, hp: Math.round(t.hp * scale) });
    };
    for (const l of MM.LANDMARKS) if (l.dim === dimId) add(l.model, l.x, l.z, l.rot !== undefined ? l.rot : dim.interior ? (l.z < -3 ? 0 : l.z > 3 ? Math.PI : l.x < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(-l.x, -l.z), 1);
    for (const [type, x, z, rot] of dim.fixed || []) add(type, x, z, rot, 1);
    const onRoad = v => { const m = ((v % 44) + 44) % 44; return Math.min(m, 44 - m) < 7.5; };
    if (dim.streets) {
      // Blocks between streets every 44 m. Each block has two rows of houses back to back,
      // each facing its street, with a driveway, maybe a car, a mailbox and a backyard fence.
      const G = 44;
      for (let gx = -4; gx <= 3; gx++) for (let gz = -4; gz <= 3; gz++) {
        for (const f of [-1, 1]) {                       // -1: faces the street on the left (-x)
          const roadX = f < 0 ? gx * G : (gx + 1) * G;
          const hx = roadX - f * 14;
          for (const zo of [12, 32]) {
            const hz = gz * G + zo;
            if (Math.abs(hx) > 140 || Math.abs(hz) > 140 || r() < 0.1) continue;
            const type = r() < 0.6 ? 'house' : 'house2';
            if (!free(hx, hz, 6.6)) continue;
            add(type, hx, hz, f > 0 ? Math.PI / 2 : -Math.PI / 2, 1);
            const dz = hz + f * (type === 'house2' ? 6.6 : 4.4) * (f > 0 ? 1 : 1);
            if (r() < 0.6 && free(hx + f * 8.2, dz, 2.0)) add('car', hx + f * 8.2, dz, Math.PI / 2 + (r() < 0.5 ? Math.PI : 0), 1);
            add('mailbox', roadX - f * 6.2, hz + 2.4, f > 0 ? Math.PI / 2 : -Math.PI / 2, 1);
            add('fence', hx - f * 8, hz - 2.25, Math.PI / 2, 1);
            add('fence', hx - f * 8, hz + 2.25, Math.PI / 2, 1);
          }
        }
      }
      // Street lamps along every street, between the intersections.
      for (let k = -3; k <= 3; k++) for (let m = -3; m <= 3; m++) {
        const a = k * G, b = m * G + 22;
        if (Math.abs(b) < 140 && free(a + 6.3, b, 0.4)) add('streetlamp', a + 6.3, b, -Math.PI / 2, 1);
        if (Math.abs(b) < 140 && free(b, a - 6.3, 0.4)) add('streetlamp', b, a - 6.3, 0, 1);
      }
    }
    if (layout) {
      // Planned towns (shared/layouts.js) instead of random scatter.
      const kit = MM.makeLayoutKit(dimId, r, add, free);
      layout(kit);
      layoutCache[dimId] = { roads: kit.roads, plazas: kit.plazas };
    } else for (const [type, count] of dim.props) {
      const t = MM.PROPS[type];
      for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
        const span = Math.min(145, MM.boundOf(dimId) - 3);
        const x = (r() * 2 - 1) * span, z = (r() * 2 - 1) * span;
        const s = 0.8 + r() * 0.5;
        if (dim.streets && (onRoad(x) || onRoad(z))) continue;
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
    const dim = MM.DIM_BY_ID[dimId];
    if (dim.spawn) { const sp = dim.spawn.spread || 1, x = dim.spawn.x + (rr() - 0.5) * 2 * sp, z = dim.spawn.z + (rr() - 0.5) * 2 * sp; return { x, y: MM.heightAt(dimId, x, z), z }; }
    const a = rr() * Math.PI * 2, d = 4 + rr() * 9;
    const x = Math.cos(a) * d, z = Math.sin(a) * d + 4;
    return { x, y: MM.heightAt(dimId, x, z), z };
  };

  // Any open spot in the world (pickups, NPCs).
  MM.randomSpot = function (dimId, rand, minR, maxR) {
    const rr = rand || Math.random;
    const props = MM.genProps(dimId);
    const bound = MM.boundOf(dimId);
    if (bound < 60) { minR = Math.min(minR || 15, bound * 0.2); maxR = Math.min(maxR || 140, bound * 0.85); }
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
