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
      id: 'suburbia', flat: 172, name: 'Earth C-137', code: 'C-137', seed: 1137, gravity: 24, amp: 2.5, scale: 0.012,
      blurb: 'The Smith family suburb. Lawns, a garage full of science, and a high school nobody wants to go to.',
      sky: ['#5fb4ff', '#d9f3ff'], fog: '#cdeaff', fogFar: 230, sun: '#fff4dc', ambient: '#9fc6ff',
      ground: ['#5fae3e', '#78c24b', '#4c9636'], accent: '#ffffff',
      props: [['tree', 40], ['hedge', 20]], streets: { grid: 44, extent: 150 }, spawn: { x: 2, z: -3, spread: 5 },
      // Rick's things in his open garage (the interactive ones are landmarks).
      fixed: [['spacecruiser', -13.0, 14.5, Math.PI / 2, 0.8], ['shelf', -17.2, 8.6, 0], ['washer', -13.4, 8.6, 0], ['curioshelf', -11.6, 16.5, Math.PI]],
      npc: [['neighbor', 9], ['schoolkid', 4], ['butterbot', 1, -16.5, 11]], pickups: { s: 18, c: 2 }, mat: 's',
    },
    {
      id: 'meatlands', flat: 140, name: 'Cronenberged Earth', code: 'PRIME', seed: 4242, gravity: 24, amp: 9, scale: 0.02,
      blurb: 'The Prime Dimension: Rick\'s love potion turned everyone into Cronenbergs, so he and Morty moved to a replacement Earth. Everything is meat now. It is warm. It is watching.',
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
      id: 'blips', name: 'Blips and Chitz', code: 'B&C', seed: 5150, gravity: 24, interior: true, bound: 32,
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
    // ----- Even more of the multiverse -----
    {
      id: 'snakeplanet', flat: 120, name: 'Snake Planet', code: 'SN-4', seed: 4554, gravity: 22, amp: 5, scale: 0.013,
      blurb: 'A jungle world of snakes, from "Rattlestar Ricklactica". Snake jazz in the clubs, snake huts in the trees, and snakes from the future who want to change the past.',
      sky: ['#3aa86a', '#e8f0b0'], fog: '#b8d890', fogFar: 220, sun: '#fff6d0', ambient: '#a8c890',
      ground: ['#5a8a3a', '#6a9a42', '#a8964a'], accent: '#c8e04a',
      props: [['snakehut', 18], ['fern', 46], ['jungletree', 34], ['rock', 18]],
      npc: [['snakefolk', 14]], pickups: { s: 8, g: 6, c: 2 }, mat: 'g',
    },
    {
      id: 'giantland', flat: 140, name: 'Giant World', code: 'GT-2', seed: 2662, gravity: 24, amp: 4, scale: 0.01,
      blurb: 'Up the beanstalk, from "Meeseeks and Destroy". Everything is enormous: mugs, boots, forks and the giants who own them. Do not let one fall down the stairs.',
      sky: ['#9ad0ff', '#ffffff'], fog: '#e8f4ff', fogFar: 260, sun: '#ffffff', ambient: '#d0e4ff',
      ground: ['#f4f6fa', '#e4eaf2', '#d8e0ec'], accent: '#8ad84a',   // a floor of cloud
      props: [['giantmug', 10], ['giantboot', 10], ['giantfork', 12], ['beanstalk', 8], ['cloudpuff', 30]],
      npc: [['giant', 7]], pickups: { s: 14, f: 4 }, mat: 's',
    },
    {
      id: 'atlantis', flat: 130, name: 'Atlantis', code: 'AT-1', seed: 1919, gravity: 9, amp: 6, scale: 0.012,
      blurb: "Mr. Nimbus's sunken city. Columns, coral, kelp, and a sea king who very much controls the police.",
      sky: ['#0a3a6a', '#2a8ac8'], fog: '#1a5a8a', fogFar: 150, sun: '#c8f0ff', ambient: '#5aa0d0',
      ground: ['#c8b88a', '#b8a878', '#8aa890'], accent: '#5ff8e0',
      props: [['coral', 40], ['kelp', 50], ['column', 22], ['shell', 16]],
      npc: [['merfolk', 12], ['seamonster', 4]], pickups: { c: 10, s: 4 }, mat: 'c',
    },
    {
      id: 'dreamworld', name: 'The Dream World', code: 'ZZZ', seed: 6116, gravity: 16, amp: 9, scale: 0.012,
      blurb: 'Inside someone\'s dream, from "Lawnmower Dog". Doors float, clocks melt, the school hallway goes on forever, and Scary Terry is somewhere behind you.',
      sky: ['#2a0a4a', '#ff8ad0'], fog: '#5a2a7a', fogFar: 200, sun: '#ffd8f8', ambient: '#b88ae0',
      ground: ['#5a3a8a', '#7a4aa0', '#3a2a6a'], accent: '#ffe066',
      props: [['floatdoor', 24], ['meltclock', 16], ['locker', 30], ['dreamstair', 10]],
      npc: [['dreamer', 8], ['scaryterry', 2]], pickups: { p: 10, f: 4 }, mat: 'p',
    },
    // ----- Other times: the same Earth, earlier, or split in two -----
    {
      id: 'dinoearth', timeline: true, name: 'Earth, 65 million years ago', code: 'C-137 −65M', seed: 6565, gravity: 24, amp: 10, scale: 0.012,
      blurb: 'Before the asteroid. Giant ferns, smoking volcanoes, raptors, and the dinosaurs, who are smarter and kinder than anyone gives them credit for ("JuRicksic Mort").',
      sky: ['#ff9a5a', '#ffe8b0'], fog: '#d8a878', fogFar: 230, sun: '#fff0c8', ambient: '#d8a080',
      ground: ['#4a8a3a', '#5a9a42', '#7a6a3a'], accent: '#ff5a2a',
      props: [['fern', 60], ['volcano', 4], ['dinoegg', 14], ['jungletree', 30], ['rock', 24]],
      npc: [['dinosaur', 6], ['raptor', 7]], pickups: { m: 2, g: 6, s: 6 }, mat: 'g',
    },

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
    // ----- The rest of Earth (same planet as the Smiths: drive there on the highway) -----
    {
      id: 'downtown', region: 'earth', flat: 172, name: 'Earth: Downtown', code: 'C-137', seed: 1139, gravity: 24, amp: 1.2, scale: 0.01,
      blurb: "The city just outside Seattle where the Smiths live. Merpal's Mall, Shoney's, Needful Things and Dr. Wong's office.",
      sky: ['#6fb8f0', '#e2f2ff'], fog: '#d4e6f4', fogFar: 240, sun: '#fff4dc', ambient: '#a8c4e0',
      ground: ['#8a9a7a', '#96a684', '#7e8e70'], accent: '#ffffff',
      props: [], spawn: { x: 0, z: 8, spread: 6 },
      npc: [['neighbor', 12], ['schoolkid', 3], ['cop', 4]], pickups: { s: 20, k: 3 }, mat: 's',
    },
    {
      id: 'dc', region: 'earth', flat: 172, name: 'Earth: Washington, D.C.', code: 'C-137', seed: 1776, gravity: 24, amp: 1, scale: 0.01,
      blurb: 'The National Mall, the White House and President Curtis, the Pentagon, and a lot of men in dark suits.',
      sky: ['#6fb0ec', '#e4f2ff'], fog: '#d8e8f6', fogFar: 250, sun: '#fff6e4', ambient: '#a8c4e0',
      ground: ['#5fa83e', '#6cb848', '#549a36'], accent: '#ffffff',
      props: [], spawn: { x: 0, z: 30, spread: 6 },
      npc: [['president', 1, 0, -38], ['secretservice', 6], ['secretservice', 2, 6, -30], ['marine', 4], ['neighbor', 8]], pickups: { s: 14, k: 4 }, mat: 'k',
    },
    {
      id: 'area51', region: 'earth', flat: 172, name: 'Earth: Area 51', code: 'C-137', seed: 5151, gravity: 24, amp: 2, scale: 0.012,
      blurb: 'A secret base in the Nevada desert, with hangars full of things that are not weather balloons and the sonic stage where Earth got Schwifty.',
      sky: ['#7ec0f0', '#fff0d8'], fog: '#f4e2c4', fogFar: 260, sun: '#fff0d0', ambient: '#e0c8a0',
      ground: ['#d8b27a', '#e2c08a', '#c9a06a'], accent: '#ffd84d',
      props: [], spawn: { x: 0, z: 30, spread: 6 },
      npc: [['marine', 8], ['labtech', 4]], pickups: { s: 12, c: 4 }, mat: 'c',
    },
    // ----- The same Earth in other dimensions: the Smith street, but not quite -----
    {
      id: 'fascistearth', variantOf: 'suburbia', name: 'Fascist Earth', code: 'F-17',
      blurb: 'Same street, same houses, but everything is an order. Red banners, grey skies, and a Rick in a robe running the show.',
      sky: ['#6a6e78', '#b8b0a8'], fog: '#a8a49e', fogFar: 200, sun: '#ffe4c8', ambient: '#a09890',
      ground: ['#5a6a4a', '#647454', '#506040'], accent: '#e23b3b',
      extra: [['banner', 30], ['watchtower', 6]], npc: [['fascistsoldier', 9], ['neighbor', 5]], pickups: { s: 16, p: 3 }, mat: 'p',
    },
    {
      id: 'shrimpearth', variantOf: 'suburbia', name: 'Shrimp Earth', code: 'SH-1',
      blurb: 'Everyone here evolved from shrimp, dogs included. Friendly-looking. Do not mention cocktail sauce.',
      sky: ['#ff9f86', '#ffe2d4'], fog: '#ffd2c0', fogFar: 220, sun: '#fff0e0', ambient: '#ffb8a0',
      ground: ['#6aae5e', '#78bc6a', '#5c9c52'], accent: '#ff7a5a',
      extra: [['shrimpstatue', 6], ['banner', 10]], npc: [['shrimpfolk', 12]], pickups: { s: 16, g: 3 }, mat: 'g',
    },
    {
      id: 'teddyearth', variantOf: 'suburbia', name: 'Teddy Earth', code: 'TB-7',
      blurb: 'A world of teddy bear people. The Rick here is a short bear with spiky hair who drinks martinis.',
      sky: ['#9fd0ff', '#fff4e4'], fog: '#f4e4d0', fogFar: 220, sun: '#fff4dc', ambient: '#d8c4a8',
      ground: ['#7aae4e', '#86bc5a', '#6c9c44'], accent: '#c88a4a',
      extra: [['teddystatue', 6], ['honeypot', 14]], npc: [['teddyfolk', 12]], pickups: { s: 16, f: 3 }, mat: 'f',
    },
    {
      id: 'c500a', variantOf: 'suburbia', name: 'Earth C-500A', code: 'C-500A',
      blurb: 'Beth and Jerry never married. Jerry is a movie star, Beth is a lonely heart surgeon with a lot of birds, and the Smith kids were never born.',
      sky: ['#5fb4ff', '#f4f0ff'], fog: '#e4e0f4', fogFar: 230, sun: '#fff4dc', ambient: '#b0b8e0',
      ground: ['#5fae3e', '#78c24b', '#4c9636'], accent: '#ffd84d',
      extra: [['moviesign', 4]], npc: [['neighbor', 10], ['paparazzi', 4]], pickups: { s: 18, k: 2 }, mat: 'k',
    },
    {
      id: 'splitearth', variantOf: 'suburbia', timeline: true, name: 'Earth C-137, split timeline', code: 'C-137 ½',
      blurb: 'From "A Rickle in Time": Summer and Morty froze time and the timeline came apart. Two versions of every moment, grey static at the edges, and Time Cops everywhere.',
      sky: ['#5a5a6a', '#c8c8d8'], fog: '#9a9aaa', fogFar: 170, sun: '#e8e8ff', ambient: '#9a9ab0',
      ground: ['#6a7a6a', '#7a8a7a', '#5a6a5a'], accent: '#8fd8ff', glitch: true,
      extra: [['timeshard', 26]], npc: [['neighbor', 7], ['timecop', 1]], pickups: { s: 14, c: 4 }, mat: 'c',
    },
    {
      id: 'doofusearth', variantOf: 'suburbia', name: 'Earth J19ζ7', code: 'J19ζ7',
      blurb: "Doofus Rick's dimension. Everyone is nice, the lawns are perfect, and the Rick here makes his own pants and is very proud of them.",
      sky: ['#8ad0ff', '#fffaf0'], fog: '#f0f4ff', fogFar: 230, sun: '#fffbe8', ambient: '#c8dcff',
      ground: ['#6ac84a', '#7ad85a', '#5ab83e'], accent: '#ffb0d0',
      extra: [['flowerbed', 30]], npc: [['neighbor', 12]], pickups: { s: 18, k: 3 }, mat: 'k',
    },
    // ----- Inside the Smith house (built with Mojulo, see assets/interiors) -----
    {
      id: 'smithhouse', name: 'Smith House', code: 'C-137', seed: 139, gravity: 24, interior: true, hidden: true, bound: 7.0, boundZ: 5.3,
      blurb: 'The living room, the dining room where nobody talks, and the kitchen. The TV gets every channel in the multiverse.',
      sky: ['#2a2a30', '#2a2a30'], fog: '#2a2a30', fogFar: 400, sun: '#fff4e0', ambient: '#c0b8a8',
      ground: ['#b88a5a', '#a87a4a', '#c89a6a'], accent: '#ffd84d', spawn: { x: -4.5, z: -3.6 },
      // The rooms come from a Mojulo floor plan (34 x 26 ft, 1 ft = 0.427 m here). walls: the
      // inside walls for collision, as [x1, z1, x2, z2] segments with gaps where the doors are.
      room: { w: 14.5, d: 11.1, h: 4.27, mesh: 'assets/interiors/smith.mmg' },
      walls: [
        [0.43, 5.55, 0.43, 3.69], [0.43, 2.29, 0.43, -2.71], [0.43, -4.11, 0.43, -5.55],   // living | dining, hall | kitchen
        [-7.25, -1.28, -2.83, -1.28], [-1.43, -1.28, 0.43, -1.28],                           // hall | living room
        [0.43, 0.43, 3.14, 0.43], [4.54, 0.43, 7.25, 0.43],                                 // kitchen | dining
      ],
      props: [], npc: [], pickups: {}, mat: 's',
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
  // Alternate Earths share the home street plan (same seed, same streets) with their own twist.
  function fillVariant(d) {
    const B = MM.DIM_BY_ID[d.variantOf];
    for (const k of ['seed', 'gravity', 'amp', 'scale', 'streets', 'spawn', 'flat', 'regions', 'bound', 'fixed']) if (d[k] === undefined) d[k] = B[k];
    d.props = (B.props || []).concat(d.extra || []);
    // The same buildings stand here too (minus the doors into this Earth's garage and the
    // highways): the Smith house, the school, the hospital. Tasks there work the same.
    for (const l of MM.LANDMARKS.slice()) if (l.dim === d.variantOf && !/^hw_/.test(l.id) && l.id !== 'anatomyentry' && l.id !== 'chalkdoor') {
      const c = Object.assign({}, l, { id: d.id + '_' + l.id, alias: l.id, dim: d.id });
      // The same doors as the original (the Smith house, the school, Rick's lab hatch...),
      // looked up live because building insides get their doors later (shared/interiors.js).
      // Coming back out takes you home to this Earth (see Host.onDoor).
      delete c.door;
      Object.defineProperty(c, 'door', { get: () => l.door, enumerable: false });
      MM.LANDMARKS.push(c); MM.LANDMARK_BY_ID[c.id] = c;
    }
  }
  // ----- One Earth -----
  // The Smith neighbourhood, Downtown, Washington, D.C. and Area 51 are one world: the suburb
  // in the middle, the others around it with countryside and roads in between. Each part is
  // still planned on its own (its own seed and town plan) and placed at its offset; its
  // landmarks move into the big world. Every Earth (the alternate ones, everyone's home
  // dimension) is built the same way.
  MM.EARTH_REGIONS = [
    { dim: 'downtown', ox: 400, oz: 0, name: 'Downtown' },
    { dim: 'dc', ox: -400, oz: 0, name: 'Washington, D.C.' },
    { dim: 'area51', ox: 0, oz: -400, name: 'Area 51' },
  ];
  MM.REGION_HALF = 200;
  MM.DIM_BY_ID.suburbia.regions = MM.EARTH_REGIONS;
  MM.DIM_BY_ID.suburbia.bound = 600;
  for (const R of MM.EARTH_REGIONS) { const D = MM.DIM_BY_ID[R.dim]; D.hidden = true; D.regionOf = 'suburbia'; }
  for (const l of MM.LANDMARKS) {
    const R = MM.EARTH_REGIONS.find(q => q.dim === l.dim);
    if (!R) continue;
    l.origin = R.dim; l.lx = l.x; l.lz = l.z;
    if (l.rot === undefined) l.rot = Math.atan2(-l.x, -l.z);   // keep facing its own town's middle
    l.x += R.ox; l.z += R.oz; l.dim = 'suburbia';
  }
  // Which part of a composite world a point is in: { R (null for the middle), lx, lz }.
  MM.regionAt = function (dimId, x, z) {
    const D = MM.DIM_BY_ID[dimId];
    if (!D || !D.regions) return null;
    for (const R of D.regions) { const lx = x - R.ox, lz = z - R.oz; if (Math.abs(lx) < MM.REGION_HALF && Math.abs(lz) < MM.REGION_HALF) return { R, lx, lz }; }
    return { R: null, lx: x, lz: z };
  };
  // Who lives in a world, and what lies around: a composite world adds each part's own.
  MM.npcListOf = function (dimId) {
    const D = MM.DIM_BY_ID[dimId], out = D.npc.slice();
    for (const R of D.regions || []) for (const [t, n, x, z] of MM.DIM_BY_ID[R.dim].npc) out.push(x !== undefined ? [t, n, x + R.ox, z + R.oz] : [t, n, R.ox, R.oz, 150]);
    return out;
  };
  MM.pickupsOf = function (dimId) {
    const D = MM.DIM_BY_ID[dimId], out = Object.assign({}, D.pickups);
    for (const R of D.regions || []) { const P = MM.DIM_BY_ID[R.dim].pickups; for (const k in P) out[k] = (out[k] || 0) + P[k]; }
    return out;
  };
  for (const d of MM.DIMS) if (d.variantOf) fillVariant(d);
  MM.fillVariant = fillVariant;
  MM.DIM_IDS = MM.DIMS.map(d => d.id);
  // Dimensions you can portal or kiosk to (the garage and its rooms are reached through doors).
  MM.WORLD_IDS = MM.DIMS.filter(d => !d.hidden).map(d => d.id);
  MM.boundOf = dimId => MM.DIM_BY_ID[dimId].bound || MM.WORLD_HALF;
  // Rooms that aren't square have their own north-south limit.
  MM.boundZOf = dimId => MM.DIM_BY_ID[dimId].boundZ || MM.boundOf(dimId);
  // Outdoor worlds have a public kiosk; indoor ones only if they declare one (Blips and Chitz does).
  // ---------- Getting around, the way the show does it ----------
  // space: worlds in the same universe (ships fly between them). near: a short hop (Earth
  // and its moon). pocket: only reachable through its entrance (a door, a battery, a man).
  // Everything else is another dimension: portal guns, the Dimension Drive, the Citadel's
  // portal station or Federation customs. Outside the Central Finite Curve: gold portals only.
  const SPACE = { suburbia: 'c137', downtown: 'c137', dc: 'c137', area51: 'c137', moon: 'c137', featherhold: 'c137', gazorp: 'c137', squanch: 'c137', purge: 'c137', gearworld: 'c137', unityworld: 'c137', federation: 'c137', blips: 'c137', bazaar: 'c137' };
  const NEAR = { suburbia: 1, downtown: 1, dc: 1, area51: 1, moon: 1 };
  const POCKET = { microverse: 1, anatomy: 1, froopy: 1 };
  for (const d of MM.DIMS) { if (SPACE[d.id]) d.space = SPACE[d.id]; if (NEAR[d.id]) d.near = true; if (POCKET[d.id]) d.pocket = true; }
  // Public interdimensional stations, only where they exist in the lore.
  MM.DIM_BY_ID.citadel.station = { x: 0, z: -14, name: 'Citadel Portal Station', fee: { k: 3 }, free: ['genius', 'sidekick', 'evilmorty'] };
  MM.DIM_BY_ID.federation.station = { x: 0, z: -14, name: 'Interdimensional Customs', fee: { k: 6 }, free: ['trooper'] };
  MM.hasKiosk = dimId => !!MM.DIM_BY_ID[dimId].station;
  // Can you get from one world to another this way? o: { gold, hull, engine, drive }.
  // Returns '' if yes, or the reason why not.
  MM.travelWhy = function (method, from, to, o) {
    const A = MM.DIM_BY_ID[from], B = MM.DIM_BY_ID[to];
    o = o || {};
    if (!B || from === to) return 'You are already here.';
    if (B.hidden) return 'You can only get there through its door.';
    if (B.pocket) return 'Only through its entrance: ' + (to === 'microverse' ? "the car battery in Rick's garage." : to === 'anatomy' ? 'Anatomy Park, inside Ruben, on Earth.' : 'the chalk door on Earth.');
    if (B.outsideCurve && !(method === 'portal' && o.gold)) return 'Outside the Central Finite Curve. Only a gold portal goes there.';
    if (method === 'portal' || method === 'station') return '';
    if (method === 'ship') {
      if (A.space && A.space === B.space) {
        if (A.near && B.near) return o.hull ? '' : 'You need a ship.';
        return o.engine ? '' : 'Your ship needs a Turbo Engine to cross the galaxy.';
      }
      return o.drive ? '' : 'Another dimension: your ship needs the Dimension Drive.';
    }
    return 'You can\'t get there that way.';
  };

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
    lm_marker:   { r: 0.3, h: 0.1, hp: 9999, drop: {} },
    // Snake Planet, the Dream World, Giant World, Atlantis, the dinosaurs' Earth
    snakehut:    { r: 3.0, h: 6, hp: 120, drop: { s: 3 } },
    fern:        { r: 1.0, h: 3.2, hp: 15, drop: { g: 1 }, arch: true },
    jungletree:  { r: 1.0, h: 11, hp: 90, drop: { s: 2 } },
    volcano:     { r: 16, h: 30, hp: 99999, drop: {} },
    dinoegg:     { r: 0.9, h: 2.2, hp: 40, drop: { g: 2 } },
    giantmug:    { r: 4.0, h: 9, hp: 300, drop: { s: 5 } },
    giantboot:   { r: 3.5, h: 8, hp: 300, drop: { s: 5 } },
    giantfork:   { r: 0.8, h: 14, hp: 200, drop: { s: 4 } },
    beanstalk:   { r: 1.4, h: 30, hp: 99999, drop: {} },
    cloudpuff:   { r: 2.6, h: 2.5, hp: 20, drop: { f: 1 }, arch: true },
    coral:       { r: 1.4, h: 3.4, hp: 40, drop: { c: 1 } },
    kelp:        { r: 0.6, h: 7, hp: 15, drop: { g: 1 }, arch: true },
    column:      { r: 1.0, h: 9, hp: 220, drop: { s: 3 } },
    shell:       { r: 1.6, h: 2.0, hp: 60, drop: { c: 2 } },
    floatdoor:   { r: 0.6, h: 4, hp: 40, drop: { p: 1 }, arch: true },
    meltclock:   { r: 1.8, h: 4.5, hp: 60, drop: { c: 1 } },
    locker:      { r: 1.2, h: 2.4, hp: 50, drop: { s: 2 } },
    dreamstair:  { r: 2.4, h: 9, hp: 150, drop: { p: 2 }, arch: true },
    timeshard:   { r: 0.7, h: 3.5, hp: 40, drop: { c: 1 }, arch: true },
    flowerbed:   { r: 1.4, h: 0.8, hp: 10, drop: { f: 1 }, arch: true },
    lm_snakeclub:   { r: 8, h: 8, hp: 9999, drop: {} },
    lm_dinocouncil: { r: 10, h: 10, hp: 9999, drop: {} },
    lm_giantcastle: { r: 14, h: 26, hp: 9999, drop: {} },
    lm_nimbuspalace:{ r: 12, h: 16, hp: 9999, drop: {} },
    lm_dreamschool: { r: 10, h: 9, hp: 9999, drop: {} },
    lm_timerift:    { r: 4, h: 9, hp: 9999, drop: {} },
    // The rest of Earth and the alternate Earths
    skyscraper:  { r: 6.5, h: 34, hp: 700, drop: { s: 6, c: 1 } },
    apartment:   { r: 6.0, h: 16, hp: 420, drop: { s: 5 } },
    officeblock: { r: 8.0, h: 12, hp: 450, drop: { s: 5, k: 1 } },
    flagpole:    { r: 0.3, h: 9, hp: 40, drop: { s: 1 } },
    cherrytree:  { r: 2.4, h: 6, hp: 70, drop: { f: 1 } },
    hangar:      { r: 9.5, h: 9, hp: 520, drop: { s: 6, c: 1 } },
    radar:       { r: 2.2, h: 8, hp: 140, drop: { c: 1, s: 1 } },
    jeep:        { r: 2.2, h: 2, hp: 90, drop: { s: 3 } },
    banner:      { r: 0.4, h: 6.5, hp: 30, drop: { s: 1 } },
    watchtower:  { r: 2.0, h: 9, hp: 160, drop: { s: 3, p: 1 } },
    shrimpstatue:{ r: 1.6, h: 5.5, hp: 220, drop: { g: 2 } },
    teddystatue: { r: 1.6, h: 5, hp: 220, drop: { f: 2 } },
    honeypot:    { r: 0.8, h: 1.4, hp: 30, drop: { f: 1 } },
    moviesign:   { r: 3.2, h: 7, hp: 140, drop: { k: 1, s: 2 } },
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
    // ----- The rest of Earth -----
    // guard: when someone hurts a person near them, every guard in the area goes after them.
    cop: { name: 'Police Officer', hp: 55, speed: 3.6, hostile: false, guard: true, dmg: 8, drop: { s: 2, k: 1 }, r: 0.6, h: 1.85,
      human: { species: ['human'], top: ['polo'], acc: ['cap'], colors: { topColor: '#2a3a6a', shirtColor: '#2a3a6a', pantsColor: '#1e2a4a', accColor: '#1e2a4a' } },
      names: ['Officer Reyes', 'Officer Kowalski', 'Sergeant Park', 'Officer Daniels'],
      talk: ['Move along. Nothing to see. Was that a portal?', 'We got a call about a man burping lasers.', 'Do not make me write you up, kid.', 'If you see a pickle with tiny arms, call it in.'],
      moods: { line: 55, gift: 6, trade: 6, errand: 14, buff: 6, angry: 8, follow: 5 } },
    president: { name: 'President Curtis', hp: 220, speed: 3.2, hostile: false, guard: true, dmg: 16, drop: { k: 12, s: 4 }, r: 0.7, h: 2.1,
      human: { species: ['human'], top: ['polo'], acc: ['none'], look: { hair: 'slick', brow: 'angry', mouth: 'flat', face: 'long', height: 1.3, width: 1.05, head: 1.0,
        skin: '#6b4630', hairColor: '#1a1210', topColor: '#22252e', shirtColor: '#c8303a', pantsColor: '#22252e', shoeColor: '#111111' } },
      names: ['President Andre Curtis'],
      talk: ['I am the President of the United States. Act like it.', 'Smith. Tell Sanchez I need him. And no, you cannot have a selfie.', 'My approval rating is not a number, it is a feeling.',
        'There is a monster in the Kennedy tunnels and only one man is crazy enough to go down there.', 'You are standing on the White House lawn. That is a federal crime, son.', 'Get Schwifty? I did it once. For the planet. Never again.'],
      moods: { line: 55, gift: 14, trade: 4, errand: 18, buff: 6, angry: 3 } },
    secretservice: { name: 'Secret Service Agent', hp: 70, speed: 4.2, hostile: false, guard: true, dmg: 11, drop: { k: 2, s: 2 }, r: 0.6, h: 1.95,
      human: { species: ['human'], top: ['polo'], acc: ['goggles'], colors: { topColor: '#1e2028', shirtColor: '#f0f0f0', pantsColor: '#1e2028', accColor: '#0a0a0a', hairColor: '#2a2018' } },
      names: ['Agent Steve', 'Agent Ramirez', 'Agent Holt', 'Agent Kim', 'Agent Brooks'],
      talk: ['Sir, step away from the President.', 'Copy that. Visual on a Morty.', 'The tunnels are off limits.', 'I have been told not to ask about the portals.'],
      moods: { line: 60, gift: 4, trade: 4, errand: 10, buff: 4, angry: 10 } },
    marine: { name: 'Marine', hp: 80, speed: 4.4, hostile: false, guard: true, dmg: 12, drop: { s: 3, p: 1 }, r: 0.6, h: 1.9,
      human: { species: ['human'], top: ['armor'], acc: ['cap'], colors: { topColor: '#5a6a3a', shirtColor: '#5a6a3a', pantsColor: '#4a5632', accColor: '#4a5632' } },
      names: ['Private Diaz', 'Corporal Webb', 'Sergeant Hayes', 'Private Okafor'],
      talk: ['Hoo-rah.', 'We trained for aliens. We did not train for whatever you are.', 'The big heads in the sky made us sing once. We do not talk about it.', 'Restricted area. Turn around.'],
      moods: { line: 55, gift: 6, trade: 6, errand: 12, buff: 6, angry: 8 } },
    labtech: { name: 'Base Scientist', hp: 30, speed: 2.6, hostile: false, dmg: 0, drop: { c: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['labcoat'], acc: ['goggles', 'none'] }, names: ['Dr. Fenn', 'Dr. Ostrowski', 'Dr. Lau', 'Dr. Mbeki'],
      talk: ['Hangar 4? Weather balloon. All of them are weather balloons.', 'We reverse-engineered a toaster from Gazorpazorp. It judges you.', 'Do you know a Rick? Asking for the government.'],
      moods: { line: 50, gift: 14, trade: 12, errand: 12, buff: 6 } },
    // ----- Alternate Earths -----
    catfolk: { name: 'Cat Person', hp: 35, speed: 3, hostile: false, dmg: 0, drop: { f: 1, s: 1 }, r: 0.6, h: 1.8,
      human: { species: ['cat'], top: ['polo', 'sweater', 'tshirt', 'vest'], acc: ['none', 'none', 'cap'], look: { hair: 'bald' } }, names: ['Mittens', 'Gary Whiskers', 'Purrla', 'Doug Felix'],
      talk: ['Everyone here is a cat. Yes, even the mailman.', 'Your face is so smooth. It is upsetting.', 'Nap first, apocalypse later.'],
      moods: { line: 50, gift: 12, trade: 10, errand: 12, buff: 8, angry: 4, dance: 3 } },
    robotfolk: { name: 'Robot Neighbor', hp: 60, speed: 2.6, hostile: false, dmg: 0, drop: { c: 2, s: 1 }, r: 0.6, h: 1.9,
      human: { species: ['robot'], top: ['none', 'vest'], acc: ['none', 'antennae'] }, names: ['Unit 7', 'Gary-Bot', 'BRENDA-9', 'Toaster Todd'],
      talk: ['GREETINGS, ORGANIC. YOUR LAWN IS NON-COMPLIANT.', 'I was programmed to love my family. I do. Mostly.', 'BEEP. That was a joke. Laugh now.'],
      moods: { line: 55, gift: 10, trade: 12, errand: 12, buff: 6, angry: 5 } },
    alienfolk: { name: 'Alien Neighbor', hp: 40, speed: 2.8, hostile: false, dmg: 0, drop: { p: 1, s: 1 }, r: 0.6, h: 1.9,
      human: { species: ['alien'], top: ['polo', 'sweater', 'tshirt'], acc: ['antennae', 'none', 'goggles'] }, names: ['Zorb', 'Glip Glop', 'Krevin', 'Shleebie'],
      talk: ['On this Earth the aliens won. We are very nice about it.', 'Do you also have two hearts? No? Huh.', 'The humans here live in a zoo. A nice zoo.'],
      moods: { line: 50, gift: 12, trade: 12, errand: 12, buff: 8 } },
    blobfolk: { name: 'Blob Neighbor', hp: 45, speed: 2.2, hostile: false, dmg: 0, drop: { g: 2 }, r: 0.7, h: 1.6,
      human: { species: ['blob'], top: ['none', 'tshirt'], acc: ['none', 'tophat'] }, names: ['Gloop', 'Blorp Smith', 'Sloosh', 'Goo Gary'],
      talk: ['We all melted a while ago. It is fine. It is warm.', 'Please do not step on my feet. Any of them.', 'Glorp.'],
      moods: { line: 55, gift: 12, trade: 8, errand: 12, buff: 8 } },
    fascistsoldier: { name: 'Fascist Trooper', hp: 60, speed: 4.2, hostile: true, dmg: 10, drop: { p: 2, s: 2 }, r: 0.6, h: 1.9,
      human: { species: ['human'], top: ['armor'], acc: ['cap'], colors: { topColor: '#3a3a40', shirtColor: '#3a3a40', pantsColor: '#2a2a30', accColor: '#b5243c' } } },
    shrimpfolk: { name: 'Shrimp Person', hp: 35, speed: 2.8, hostile: false, dmg: 0, drop: { g: 2, s: 1 }, r: 0.6, h: 1.8,
      human: { species: ['shrimp'], top: ['polo', 'sweater', 'tshirt', 'vest'], acc: ['none', 'none', 'cap'], look: { hair: 'bald' } },
      names: ['Shrimply Gary', 'Krill Brenda', 'Prawnald', 'Scampi', 'Doug Langostino'],
      talk: ['Lovely day. Lovely, lovely day. Do not look at the flags.', 'You have a very... land-based look.', 'Our dogs are shrimp too. Who is a good shrimp?', 'Cocktail sauce is a hate symbol here.'],
      moods: { line: 50, gift: 12, trade: 10, errand: 12, buff: 6, angry: 6, follow: 4 } },
    teddyfolk: { name: 'Teddy Person', hp: 35, speed: 2.8, hostile: false, dmg: 0, drop: { f: 2, s: 1 }, r: 0.6, h: 1.6,
      human: { species: ['teddy'], top: ['sweater', 'vest', 'polo'], acc: ['none', 'none', 'tophat'], height: [0.75, 0.95], look: { hair: 'bald' } },
      names: ['Barnaby', 'Mrs. Fluff', 'Teddy Gary', 'Cuddles', 'Professor Plush'],
      talk: ['Have you met our Rick? Short, spiky, very fond of martinis.', 'Stuffing comes out when you shout. Please do not shout.', 'Honey is legal tender here.', 'Guten Tag. Sorry, habit.'],
      moods: { line: 50, gift: 14, trade: 10, errand: 12, buff: 8, follow: 4 } },
    paparazzi: { name: 'Paparazzo', hp: 25, speed: 3.6, hostile: false, dmg: 0, drop: { k: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['vest', 'tshirt'], acc: ['cap', 'goggles'] }, names: ['Flash', 'Snapz', 'Vinnie Lens'],
      talk: ['Have you seen Jerry Smith? THE Jerry Smith? From the movies?', 'He did not marry some horse doctor, thank God. Look at that career!', 'Smile! Nobody cares who you are, but smile!'],
      moods: { line: 55, gift: 8, trade: 8, errand: 14, buff: 4, follow: 8, dance: 3 } },
    // Shleemypants, a fourth-dimensional Time Cop. Third-dimensional beings may not mess
    // with time. He turns up when somebody does, and he does not leave quietly.
    timecop: { name: 'Shleemypants', hp: 260, speed: 4.8, hostile: false, guard: false, dmg: 18, fly: 1.2, drop: { c: 6, m: 3 }, r: 0.8, h: 2.2,
      names: ['Shleemypants', 'Time Cop Shleemypants'],
      talk: ['You broke time, you third-dimensional ass. Time Prison. Forever.', 'Do you know how many timelines I had to stitch up today?', 'Get your timeline straight before I put a collar on it.',
        'Time Court is in session. You lose.', 'Ass. Ass ass ass. Time-ass.'],
      moods: { line: 70, angry: 20, buff: 5, gift: 5 } },
    snakefolk: { name: 'Snake', hp: 30, speed: 3.2, hostile: false, dmg: 0, drop: { g: 2 }, r: 0.6, h: 1.0,
      names: ['Sss-Steve', 'Hissandra', 'Slitherin\' Sam', 'Coily', 'Mister Fangs'],
      talk: ['Sss. Sss sss.', 'Ssssss? SSS! Sss.', '*rattles approvingly*', 'Sss sss sss-sss. (It sounds like jazz.)', 'Ssss... (It is looking at your neck. Probably nothing.)'],
      moods: { line: 55, gift: 12, trade: 8, errand: 12, buff: 6, dance: 7 } },
    snaketerm: { name: 'Snake Terminator', hp: 90, speed: 4.6, hostile: true, dmg: 13, drop: { c: 3, s: 3 }, r: 0.7, h: 1.2 },
    dinosaur: { name: 'Dinosaur', hp: 400, speed: 2.4, hostile: false, dmg: 0, drop: { m: 1, g: 4 }, r: 2.2, h: 6,
      names: ['Elder Longneck', 'Gentle Bronto', 'Professor Ankylo', 'Grand Stego'],
      talk: ['We once had a utopia, little mammal. Then a rock fell. It happens.', 'We have solved hunger, war and taxes. Would you like a pamphlet?', 'Rick? Ah yes. The rude one.',
        'Please do not step on the eggs. They are going to be philosophers.', 'In the future we return to save your planet. You are welcome, in advance.'],
      moods: { line: 55, gift: 18, trade: 6, errand: 10, buff: 11 } },
    raptor: { name: 'Raptor', hp: 50, speed: 6.2, hostile: true, dmg: 10, drop: { g: 2 }, r: 0.7, h: 1.4 },
    giant: { name: 'Giant', hp: 320, speed: 2.6, hostile: false, dmg: 30, drop: { s: 8, f: 2 }, r: 1.6, h: 5.4,
      human: { species: ['human'], top: ['vest', 'sweater', 'tshirt'], acc: ['none', 'none', 'cap'], height: [1.0, 1.2], scale: 2.8 },
      names: ['Big Doug', 'Mrs. Giant', 'Gerald the Giant', 'Fee-Fi-Phil'],
      talk: ['FEE FI FO... no, that is a stereotype. Hello.', 'Watch the stairs. My husband fell down them once and the court case took ages.', 'You are SO tiny. Like a little salt shaker with legs.',
        'Have you seen my fork? It is the size of a house.', 'Morty? Is that you? You owe us for the funeral.'],
      moods: { line: 55, gift: 12, trade: 8, errand: 12, buff: 6, angry: 7 } },
    merfolk: { name: 'Atlantean', hp: 40, speed: 3.4, hostile: false, dmg: 0, drop: { c: 2 }, r: 0.6, h: 1.8, fly: 0.6,
      names: ['Coraline', 'Finnley', 'Barnacle Bob', 'Pearl', 'Ripple'],
      talk: ['Mr. Nimbus controls the sea. And the police. Mostly the police.', 'Bubbles mean "hello" here. Or "help". Context.', 'Do not trust the surface. Do not trust Rick. Especially do not trust Rick.', 'Ever seen a sunken city? You are standing in one.'],
      moods: { line: 55, gift: 14, trade: 8, errand: 12, buff: 8, follow: 3 } },
    seamonster: { name: 'Sea Beast', hp: 110, speed: 4.4, hostile: true, dmg: 14, drop: { c: 3, g: 2 }, r: 1.3, h: 1.6, fly: 1.4 },
    dreamer: { name: 'Dream Figure', hp: 30, speed: 2.8, hostile: false, dmg: 0, drop: { p: 2 }, r: 0.6, h: 1.8,
      human: { species: ['human'], top: ['sweater', 'polo', 'tshirt'], acc: ['none', 'goggles', 'cap'], eyes: ['sleepy'] },
      names: ['Your Teacher (in his underwear)', 'A Faceless Cheerleader', 'Someone You Knew', 'Mr. Goldenfold'],
      talk: ['Did you study for the test? There was a test.', 'Why are your teeth falling out? Do not look.', 'Wake up. Wake up. WAKE UP.', 'This is not your dream. Whose dream is this?'],
      moods: { line: 60, gift: 10, trade: 6, errand: 8, buff: 8, prank: 8 } },
    scaryterry: { name: 'Scary Terry', hp: 160, speed: 5.0, hostile: true, dmg: 16, drop: { p: 4, m: 1 }, r: 0.7, h: 2.0,
      human: { species: ['human'], top: ['sweater'], acc: ['cap'], look: { hair: 'bald', brow: 'angry', mouth: 'grin', face: 'long', height: 1.15, width: 0.9, head: 1.0,
        skin: '#b0583e', topColor: '#2a6a3a', shirtColor: '#c83a3a', pantsColor: '#5a3a2a', shoeColor: '#2a1a12', accColor: '#3a2a1a' } },
      names: ['Scary Terry'] },
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
    snakeplanet: [
      { id: 'snakewar', name: 'Snakes from the Future', text: 'Snake Terminators have come back in time. The snakes need help.', spawn: [['snaketerm', 7]], dur: 90 },
      { id: 'snakejazz', name: 'Snake Jazz Night', text: 'Ssss-ss-sss. Everyone is in a good mood, and generous.', loot: ['g', 12], talkBoost: 1, dur: 60 },
    ],
    dinoearth: [{ id: 'raptors', name: 'Raptor Pack', text: 'A pack of raptors is hunting. The dinosaurs are disappointed in them.', spawn: [['raptor', 8]], dur: 80 },
      { id: 'meteor', name: 'Meteor Shower', text: 'Little rocks before the big one. Mega Seeds are falling with them.', loot: ['m', 4], dur: 45 }],
    giantland: [{ id: 'giantmarket', name: 'Giant Market Day', text: 'Giants are selling giant things for tiny prices.', loot: ['s', 14], talkBoost: 1, dur: 60 }],
    atlantis: [{ id: 'tide', name: 'The Tide Turns', text: 'Mr. Nimbus is in a good mood. The current is full of crystals.', loot: ['c', 12], dur: 50 },
      { id: 'kraken', name: 'Sea Beasts', text: 'Something big swam in from the trench.', spawn: [['seamonster', 6]], dur: 80 }],
    dreamworld: [{ id: 'nightmare', name: 'Nightmare', text: 'You can run, but you cannot hide. Scary Terry brought friends.', spawn: [['scaryterry', 3]], dur: 70 },
      { id: 'lucid', name: 'Lucid Dream', text: 'You know you are dreaming. Everything is easier.', loot: ['p', 12], talkBoost: 1, dur: 50 }],
    splitearth: [{ id: 'fracture', name: 'Time Fracture', text: 'The timeline split again. Time Cops are cracking down.', spawn: [['timecop', 2]], dur: 70 }],
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
      if (Math.abs(x - l.x) > l.r + 12 || Math.abs(z - l.z) > l.r + 12) continue;
      const d = Math.hypot(x - l.x, z - l.z);
      if (d < l.r + 12) h += (y - h) * (1 - smooth(l.r + 2, l.r + 12, d));
    }
    return h;
  };
  function baseHeight(dimId, x, z) {
    const dim = MM.DIM_BY_ID[dimId];
    if (dim.interior) return 0;
    if (dim.regions) return compositeHeight(dim, x, z);
    return cellHeight(dim, x, z) + smooth(MM.WORLD_HALF - 30, MM.WORLD_HALF + 10, Math.max(Math.abs(x), Math.abs(z))) * 28;
  }
  // Countryside between the towns: gentle rolling hills, the same in every part of the world,
  // so each town fades into it at its edge without a step.
  function compositeHeight(dim, x, z) {
    let h = (MM.fbm(x * 0.005, z * 0.005, dim.seed + 3, 4) - 0.5) * 2 * 7;
    const cells = [{ D: dim, ox: 0, oz: 0 }].concat(dim.regions.map(R => ({ D: MM.DIM_BY_ID[R.dim], ox: R.ox, oz: R.oz })));
    for (const c of cells) {
      const lx = x - c.ox, lz = z - c.oz, m = Math.max(Math.abs(lx), Math.abs(lz));
      if (m >= MM.REGION_HALF) continue;
      const k = 1 - smooth(162, 196, m);
      h += (cellHeight(c.D, lx, lz) - h) * k;
    }
    // Roads between the towns stay level.
    for (const s of MM.EARTH_LINKS) {
      const d = segD(x, z, s);
      if (d < 16) h *= smooth(6, 16, d);
    }
    return h + smooth(dim.bound - 30, dim.bound + 10, Math.max(Math.abs(x), Math.abs(z))) * 28;
  }
  function segD(x, z, s) {
    const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2));
    return Math.hypot(x - (s[0] + dx * t), z - (s[1] + dz * t));
  }
  // The roads joining the suburb to the other towns.
  MM.EARTH_LINKS = [[140, 0, 262, 0], [-140, 0, -262, 0], [0, -140, 0, -262]];
  function cellHeight(dim, x, z) {
    const dimId = dim.id;
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
  MM.kioskOf = dimId => MM.DIM_BY_ID[dimId].station || MM.DIM_BY_ID[dimId].kiosk || MM.KIOSK;

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
    for (const l of MM.LANDMARKS) {
      // A town that is part of a bigger world plans around its own landmarks, in its own
      // coordinates; the bigger world gets them through that town's props.
      if (l.origin === dimId) { add(l.model, l.lx, l.lz, l.rot, 1); continue; }
      if (l.dim !== dimId || (dim.regions && l.origin)) continue;
      add(l.model, l.x, l.z, l.rot !== undefined ? l.rot : dim.interior ? (l.z < -3 ? 0 : l.z > 3 ? Math.PI : l.x < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(-l.x, -l.z), 1);
    }
    for (const [type, x, z, rot, sc] of dim.fixed || []) add(type, x, z, rot, sc || 1);
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
    } else for (const [type, n] of dim.props) {
      // Open worlds got bigger: a few more things to fill the extra ground. A composite world
      // spreads its own things over the countryside too, but not into the other towns.
      const comp = !!dim.regions, area = comp ? 5 : 1;
      const t = MM.PROPS[type], count = Math.round((MM.boundOf(dimId) >= MM.WORLD_HALF ? n * 1.3 : n) * area);
      for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
        const span = comp ? MM.boundOf(dimId) - 28 : Math.min(MM.WORLD_HALF - 28, MM.boundOf(dimId) - 3);
        const x = (r() * 2 - 1) * span, z = (r() * 2 - 1) * span;
        const s = 0.8 + r() * 0.5;
        if (comp) {
          const at = MM.regionAt(dimId, x, z);
          if (at.R) continue;
          if (MM.EARTH_LINKS.some(q => segD(x, z, q) < 8 + t.r * s)) continue;
          if (Math.max(Math.abs(x), Math.abs(z)) < 150 && dim.streets && (onRoad(x) || onRoad(z))) continue;
        } else if (dim.streets && (onRoad(x) || onRoad(z))) continue;
        if (!free(x, z, t.r * s)) continue;
        add(type, x, z, r() * Math.PI * 2, s);
        i++;
      }
    }
    // The other towns of a composite world, each planned in its own space and moved into place.
    if (dim.regions) {
      const roads = [], plazas = [];
      for (const R of dim.regions) {
        for (const p of MM.genProps(R.dim)) out.push(Object.assign({}, p, { id: out.length, x: p.x + R.ox, z: p.z + R.oz }));
        const L = MM.layoutOf(R.dim);
        for (const q of L.roads) roads.push(Object.assign({}, q, { x1: q.x1 + R.ox, z1: q.z1 + R.oz, x2: q.x2 + R.ox, z2: q.z2 + R.oz }));
        for (const q of L.plazas) plazas.push(Object.assign({}, q, { x: q.x + R.ox, z: q.z + R.oz }));
      }
      for (const [x1, z1, x2, z2] of MM.EARTH_LINKS) roads.push({ x1, z1, x2, z2, w: 9, style: 'asphalt' });
      layoutCache[dimId] = { roads, plazas };
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
    const bound = MM.boundOf(dimId), D = MM.DIM_BY_ID[dimId];
    if (D.walls) {
      // Inside a building: anywhere in the rooms, clear of the walls.
      const bz = MM.boundZOf(dimId);
      for (let k = 0; k < 30; k++) {
        const x = (rr() * 2 - 1) * bound * 0.85, z = (rr() * 2 - 1) * bz * 0.85;
        const [wx, wz] = MM.collideWalls(dimId, x, z, 0.8);
        if (wx === x && wz === z) return { x, y: 0, z };
      }
      return { x: D.spawn.x, y: 0, z: D.spawn.z };
    }
    if (bound < 60) { minR = Math.min(minR || 15, bound * 0.2); maxR = Math.min(maxR || 140, bound * 0.85); }
    else maxR = Math.min(maxR || 140, bound - 25);
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
  // Buildings collide as their real footprint (a box in the model's own frame: [x0, x1, z0, z1],
  // front = +z), turned and scaled like the prop. Everything else is a circle.
  const BOX = {
    house: [-5.95, 5.95, -4.8, 5.4], house2: [-9, 4.95, -5.05, 5.4], doghouse: [-2.55, 2.55, -2.55, 2.55], farmhouse: [-3.95, 3.95, -3.55, 4.6],
    barn: [-4.5, 8.55, -6.3, 6.3], cityblock: [-3.7, 3.7, -3.7, 3.7], fedtower: [-4.5, 4.5, -4.5, 4.5], prisonblock: [-5.2, 5.2, -3.2, 3.2],
    gearhouse: [-3.22, 3.22, -3.09, 3.3], storefront: [-4.7, 4.7, -3.7, 3.9], skyscraper: [-5.7, 5.7, -5.7, 5.7], apartment: [-5.2, 5.2, -5.2, 5.6],
    officeblock: [-7.8, 7.8, -5.8, 6.4], hangar: [-7.6, 7.6, -9, 9.1], humanhouse: [-2.32, 2.32, -2.9, 2.9], factory: [-6, 6, -5, 5.11],
    lm_home: [-6.7, 6.7, -5.3, 6.4], lm_garage: [-4.95, 4.95, -5.05, 5.2], lm_school: [-9.3, 9.3, -4.8, 5.2], lm_hospital: [-7.15, 7.15, -5.15, 5.4],
    lm_office: [-5.7, 5.7, -4.2, 4.6], lm_forge: [-6.1, 6.1, -5.5, 5.5], lm_shipyard: [-8, 8, -8, 8], lm_market: [-5.85, 5.85, -5.41, 6],
    lm_refinery: [-7, 7, -7, 7], lm_council: [-9, 9, -9, 9], lm_daycare: [-5.8, 7.04, -4.8, 6.5], lm_palace: [-9.34, 9.34, -5, 7.02],
    lm_gooble: [-7.2, 7.2, -5.2, 7.65], lm_fakedoors: [-4.7, 4.7, -3.7, 3.9], lm_antsjohnson: [-4.7, 4.7, -3.7, 3.9], lm_plumbusline: [-6, 6, -5, 5.11],
    lm_mall: [-11.5, 11.5, -7.25, 10.6], lm_shoneys: [-5.9, 5.9, -4.4, 4.6], lm_needful: [-4.25, 4.25, -4.25, 4.7], lm_wong: [-5.7, 5.7, -4.7, 5.2],
    lm_tvstore: [-5.2, 5.2, -4.2, 4.35], lm_whitehouse: [-12.3, 12.3, -5.8, 9.6], lm_capitol: [-15.5, 15.5, -7.5, 9.5], lm_sonicstage: [-9, 9, -5, 5],
    lm_hangar: [-7.6, 7.6, -9, 9.2], snakehut: [-2.8, 2.8, -2.8, 2.8], lm_snakeclub: [-7.5, 7.5, -5, 5], lm_dinocouncil: [-9, 9, -9, 9],
    lm_nimbuspalace: [-11, 11, -7, 7], lm_dreamschool: [-9.3, 9.3, -4.8, 5.2], locker: [-1.2, 1.2, -0.4, 0.4], spacecruiser: [-2.02, 2.02, -2.5, 2.5],
  };
  for (const k in BOX) if (MM.PROPS[k]) MM.PROPS[k].box = BOX[k];
  // Rick's garage is open: three walls and the front either side of the big door (and the
  // side door), as segments [x1, z1, x2, z2] in the model's own frame. You walk in.
  MM.PROPS.lm_garage.walls = [[-4.5, -4.5, 4.5, -4.5], [-4.5, -4.5, -4.5, 4.5], [4.5, -4.5, 4.5, 4.5], [-4.5, 4.5, -3.4, 4.5], [2.2, 4.5, 3.05, 4.5], [4.15, 4.5, 4.5, 4.5]];
  delete MM.PROPS.lm_garage.box;
  MM.PROPS.lm_garage.boxR = 6.4;

  // How far from its centre a prop can block (its circle, or its box's far corner).
  MM.propReach = p => { const T = MM.PROPS[p.type]; if (T.walls) return T.boxR * (p.s || 1); if (!T.box) return p.r; if (!T.boxR) { const [x0, x1, z0, z1] = T.box; T.boxR = Math.hypot(Math.max(-x0, x1), Math.max(-z0, z1)); } return T.boxR * (p.s || 1); };
  // Push a circle (x, z, rad) out of prop p. Returns [x, z], moved or not.
  MM.pushOutOfProp = function (p, x, z, rad) {
    const T = MM.PROPS[p.type];
    if (T.walls) {
      const c = Math.cos(p.rot), s = Math.sin(p.rot), k = p.s || 1, dx = x - p.x, dz = z - p.z, r = rad / k + 0.1;
      let lx = (dx * c - dz * s) / k, lz = (dx * s + dz * c) / k, moved = false;
      for (const [x1, z1, x2, z2] of T.walls) {
        const ex = x2 - x1, ez = z2 - z1, l2 = ex * ex + ez * ez || 1;
        const t = Math.max(0, Math.min(1, ((lx - x1) * ex + (lz - z1) * ez) / l2));
        const px = x1 + ex * t, pz = z1 + ez * t, ox = lx - px, oz = lz - pz, d2 = ox * ox + oz * oz;
        if (d2 < r * r) { let d = Math.sqrt(d2), ux = ox, uz = oz; if (d < 1e-6) { const l = Math.sqrt(l2); ux = -ez / l; uz = ex / l; d = 1; } lx = px + ux / d * r; lz = pz + uz / d * r; moved = true; }
      }
      return moved ? [p.x + (lx * c + lz * s) * k, p.z + (-lx * s + lz * c) * k] : [x, z];
    }
    if (T.box) {
      const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dz = z - p.z, k = p.s || 1;
      let lx = (dx * c - dz * s) / k, lz = (dx * s + dz * c) / k;
      const r = rad / k, [x0, x1, z0, z1] = T.box;
      if (lx > x0 - r && lx < x1 + r && lz > z0 - r && lz < z1 + r) {
        const pen = [lx - (x0 - r), (x1 + r) - lx, lz - (z0 - r), (z1 + r) - lz], m = Math.min(...pen);
        if (m === pen[0]) lx = x0 - r; else if (m === pen[1]) lx = x1 + r; else if (m === pen[2]) lz = z0 - r; else lz = z1 + r;
        return [p.x + (lx * c + lz * s) * k, p.z + (-lx * s + lz * c) * k];
      }
      return [x, z];
    }
    const dx = x - p.x, dz = z - p.z, min = p.r + rad, d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) { const d = Math.sqrt(d2); return [p.x + dx / d * min, p.z + dz / d * min]; }
    return [x, z];
  };
  // Inside walls of a room (segments [x1, z1, x2, z2]): push a circle of radius rad out of them.
  MM.collideWalls = function (dimId, x, z, rad) {
    const W = MM.DIM_BY_ID[dimId].walls;
    if (!W) return [x, z];
    for (const [x1, z1, x2, z2] of W) {
      const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2));
      const px = x1 + dx * t, pz = z1 + dz * t, ex = x - px, ez = z - pz, d2 = ex * ex + ez * ez, m = rad + 0.12;
      if (d2 < m * m) {
        let ux = ex, uz = ez, d = Math.sqrt(d2);
        if (d < 1e-6) { const l = Math.sqrt(l2); ux = -dz / l; uz = dx / l; d = 1; }   // exactly on the wall: step off sideways
        x = px + ux / d * m; z = pz + uz / d * m;
      }
    }
    return [x, z];
  };
  // Props by 24 m grid cell, so collisions only look at what is near (Earth has well over a
  // thousand props). A prop sits in every cell its reach touches.
  const gridCache = {}, GRID = 24;
  function propGrid(dimId) {
    if (gridCache[dimId]) return gridCache[dimId];
    const g = new Map();
    for (const p of MM.genProps(dimId)) {
      const R = MM.propReach(p);
      for (let i = Math.floor((p.x - R) / GRID); i <= Math.floor((p.x + R) / GRID); i++) for (let j = Math.floor((p.z - R) / GRID); j <= Math.floor((p.z + R) / GRID); j++) {
        const k = i * 4096 + j;
        let b = g.get(k); if (!b) g.set(k, b = []);
        b.push(p);
      }
    }
    return (gridCache[dimId] = g);
  }
  // Props whose reach may come within rad of (x, z). May list a prop twice.
  MM.propsNear = function (dimId, x, z, rad) {
    const g = propGrid(dimId), out = [];
    for (let i = Math.floor((x - rad) / GRID); i <= Math.floor((x + rad) / GRID); i++) for (let j = Math.floor((z - rad) / GRID); j <= Math.floor((z + rad) / GRID); j++) {
      const b = g.get(i * 4096 + j);
      if (b) for (const p of b) out.push(p);
    }
    return out;
  };
  MM.collideProps = function (dimId, x, z, rad, alive) {
    const props = MM.propsNear(dimId, x, z, rad);
    for (const p of props) {
      if (alive && !alive[p.id]) continue;
      if (MM.PROPS[p.type].arch) continue;
      const reach = MM.propReach(p) + rad;
      if (Math.abs(x - p.x) > reach || Math.abs(z - p.z) > reach) continue;
      [x, z] = MM.pushOutOfProp(p, x, z, rad);
    }
    return [x, z];
  };

  // ---------- Personal home dimensions ----------
  // Every character comes from a dimension, like Rick C-137. Your home code (Y-231, J-19...)
  // is a real place: an alternate Earth made from the code, the same for everyone, with its
  // own twist. C-137 is the show's Earth (suburbia). Earth folk start in theirs.
  MM.EARTH_ARCHS = ['genius', 'sidekick', 'teen', 'surgeon', 'joe', 'evilmorty'];
  MM.homeDimId = code => {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return c === 'C137' || !c ? 'suburbia' : 'h_' + c;
  };
  MM.HOME_RE = /^h_[A-Z]{1,2}[0-9]{1,4}$/;
  const pretty = c => c.replace(/^([A-Z]+)([0-9]+)$/, '$1-$2');
  const shift = (hex, h, sat, light) => { const c = parseInt(hex.slice(1), 16); const r = (c >> 16) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let hh = 0, ss = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = ((hh * 60 + h) % 360 + 360) % 360; ss = Math.max(0, Math.min(1, ss * sat)); const L = Math.max(0, Math.min(1, l * light));
    const C2 = (1 - Math.abs(2 * L - 1)) * ss, X = C2 * (1 - Math.abs((hh / 60) % 2 - 1)), m = L - C2 / 2;
    const [a, b2, c2] = hh < 60 ? [C2, X, 0] : hh < 120 ? [X, C2, 0] : hh < 180 ? [0, C2, X] : hh < 240 ? [0, X, C2] : hh < 300 ? [X, 0, C2] : [C2, 0, X];
    return '#' + [a, b2, c2].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(''); };
  // The ways an Earth can have gone, all from the show.
  const TWISTS = [
    { k: 'plain', blurb: 'Another Earth where the Smiths live. It is almost exactly like the others. Almost.', npc: [['neighbor', 10], ['schoolkid', 4]] },
    { k: 'plain', blurb: 'An Earth one tiny decision away from C-137. Nobody here can tell which decision.', npc: [['neighbor', 10], ['cop', 2]] },
    { k: 'cronen', blurb: 'The love potion happened here too. The neighbours are Cronenbergs now.', sky: ['#3d0a1c', '#c4485f'], ground: ['#c9576b', '#e07a85', '#9c3a4e'], npc: [['meatblob', 6], ['fleshmonk', 3]], extra: [['fleshpillar', 18], ['eyestalk', 14], ['pustule', 14]] },
    { k: 'fascist', blurb: 'A fascist Earth: grey skies, banners, and a Rick in a robe somewhere in charge.', sky: ['#6a6e78', '#b8b0a8'], ground: ['#5a6a4a', '#647454', '#506040'], npc: [['fascistsoldier', 7], ['neighbor', 4]], extra: [['banner', 24], ['watchtower', 5]] },
    { k: 'shrimp', blurb: 'An Earth where everyone evolved from shrimp.', sky: ['#ff9f86', '#ffe2d4'], npc: [['shrimpfolk', 12]], extra: [['shrimpstatue', 5]] },
    { k: 'teddy', blurb: 'An Earth of teddy bear people.', npc: [['teddyfolk', 12]], extra: [['teddystatue', 5], ['honeypot', 12]] },
    { k: 'cats', blurb: 'An Earth where everybody is a cat. The Smiths too.', npc: [['catfolk', 12]], extra: [['tennisball', 10]] },
    { k: 'robots', blurb: 'An Earth run by robots who very much want you to have a nice day.', sky: ['#7a9ab8', '#d8e8f4'], ground: ['#8a9a9a', '#96a6a6', '#7a8a8a'], npc: [['robotfolk', 12], ['butterbot', 2]], extra: [['antenna', 12], ['biggear', 4]] },
    { k: 'aliens', blurb: 'An Earth where the aliens won, and the humans are kept as pets.', sky: ['#5ff8c8', '#e8fff0'], npc: [['alienfolk', 10], ['doghuman', 4]], extra: [['mushroom', 16], ['crystal', 10]] },
    { k: 'blobs', blurb: 'An Earth where everyone is a friendly puddle.', npc: [['blobfolk', 12]], extra: [['pustule', 10]] },
    { k: 'candy', blurb: 'A sugar-coated Earth. The lawns are candyfloss. Do not lick the mailbox.', sky: ['#ffb0e0', '#fff0fa'], ground: ['#ffb6dc', '#ffd0ec', '#f4a0d0'], npc: [['neighbor', 8], ['froopy', 4]], extra: [['lollipop', 16], ['cottontree', 14], ['candyrock', 8]] },
    { k: 'jungle', blurb: 'An Earth the jungle took back. The houses are still there, somewhere under the leaves.', ground: ['#3e8a2e', '#4a9a36', '#367a28'], npc: [['neighbor', 6], ['seedbeast', 3]], extra: [['seedtree', 22], ['fungus', 16], ['thornbush', 10]] },
    { k: 'night', blurb: 'An Earth where the sun went out. Everyone just got used to it.', sky: ['#0b0f1e', '#1e2440'], fog: '#1a2034', ground: ['#2e4a2e', '#365436', '#283e28'], npc: [['neighbor', 8], ['cop', 3]], extra: [['lamp', 20]] },
    { k: 'pizza', blurb: 'An Earth where the furniture and the pizza are people, and the people are the furniture.', npc: [['pizzaperson', 5], ['chairperson', 4], ['phoneperson', 3]], extra: [['giantchair', 6], ['pizzabox', 8]] },
    { k: 'wasteland', blurb: 'An Earth after the bombs. Raiders, scrap towers and a lot of sand.', sky: ['#e8a860', '#f8e0b0'], ground: ['#c8a46a', '#d8b47a', '#b8945a'], npc: [['raider', 6], ['neighbor', 3]], extra: [['wreck', 12], ['cactus', 12], ['scraptower', 6]] },
    { k: 'dogs', blurb: 'An Earth where the dogs took over, like Snowball wanted.', npc: [['dogcitizen', 8], ['doghuman', 4]], extra: [['doghouse', 10], ['bigbone', 6]] },
  ];
  const hashStr = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  let homes = 0;
  MM.ensureHomeDim = function (id) {
    if (byId[id]) return byId[id];
    if (!MM.HOME_RE.test(id) || homes >= 5000) return undefined;
    homes++;
    const code = id.slice(2), r = MM.rng(hashStr(code)), B = byId.suburbia;
    const tw = TWISTS[Math.floor(r() * TWISTS.length)], hue = Math.round((r() - 0.5) * 70);
    const d = {
      id, variantOf: 'suburbia', home: true, name: 'Earth ' + pretty(code), code: pretty(code), seed: 1000 + (hashStr(code) % 90000),
      blurb: tw.blurb, twist: tw.k,
      sky: tw.sky || B.sky.map(c => shift(c, hue, 1, 1)), fog: tw.fog || shift(B.fog, hue, 1, 1), fogFar: B.fogFar, sun: B.sun, ambient: shift(B.ambient, hue, 1, 1),
      ground: tw.ground || B.ground.map(c => shift(c, hue * 0.6, 0.8 + r() * 0.4, 0.9 + r() * 0.2)), accent: B.accent,
      extra: tw.extra || [], npc: tw.npc, pickups: { s: 16, c: 2, k: 2 }, mat: 's', space: id,
    };
    MM.DIMS.push(d); byId[id] = d; MM.DIM_IDS.push(id);
    fillVariant(d);
    return d;
  };
  // Looking up a home dimension by id makes it (deterministically) the first time.
  const byId = MM.DIM_BY_ID;
  const make = k => { if (typeof k === 'string' && !(k in byId) && MM.HOME_RE.test(k)) MM.ensureHomeDim(k); };
  MM.DIM_BY_ID = new Proxy(byId, {
    get(t, k) { make(k); return t[k]; },
    has(t, k) { make(k); return k in t; },
    getOwnPropertyDescriptor(t, k) { make(k); return Object.getOwnPropertyDescriptor(t, k); },
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
