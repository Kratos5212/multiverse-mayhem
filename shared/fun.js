// Multiverse Mayhem: things to do for fun. Rides on tracks (roller coasters, boat rides, log
// flumes, slides, monorails and Ferris wheels), shooting galleries, fishing spots, dance
// stages, jump pads, and the multiverse passport you stamp by going places. The tracks and
// timings are shared, so the server and every player see the same trains at the same time.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // ---------- Rides ----------
  // dim: where it is (and its parallel dimensions; 'suburbia' = every Earth). station: where
  // you board (x, z, rot: the gate faces rot). kind: coaster | boat | flume | slide | tram |
  // wheel. pts: [x, height above the ground, z]. closed: the track comes back to the start.
  // seats: riders per departure. every: seconds between departures.
  MM.RIDES = [
    // ----- Anatomy Park -----
    { id: 'pancreas', dim: 'anatomy', name: 'Pirates of the Pancreas', kind: 'boat', closed: true, seats: 6, every: 8, speed: 3.2,
      station: [0, 50, Math.PI], exit: [6, 46],
      pts: [[0, 0.3, 54], [16, 0.3, 58], [22, 0.3, 70], [14, 0.3, 84], [0, 0.3, 90], [-14, 0.3, 84], [-22, 0.3, 70], [-16, 0.3, 58]] },
    { id: 'spleen', dim: 'anatomy', name: 'Spleen Mountain', kind: 'coaster', closed: true, seats: 8, every: 12,
      station: [48, -4, -Math.PI / 2], exit: [44, -10],
      pts: [[50, 1.5, -2], [50, 2, -16], [55, 9, -30], [65, 20, -38], [78, 22, -36], [88, 6, -26], [94, 3, -12], [96, 12, 2], [90, 17, 14], [80, 6, 24], [68, 10, 30], [56, 3, 24], [50, 1.5, 12]] },
    { id: 'bladder', dim: 'anatomy', name: 'Bladder Falls', kind: 'flume', closed: true, seats: 4, every: 9,
      station: [-4, -48, 0], exit: [-10, -46],
      pts: [[0, 0.5, -50], [10, 0.5, -54], [15, 5, -64], [10, 11, -76], [0, 15, -82], [-11, 16, -78], [-15, 15, -68], [-13, 3, -59], [-8, 0.5, -52]] },
    { id: 'colon', dim: 'anatomy', name: 'The Colon Express', kind: 'tram', closed: true, seats: 8, every: 16, speed: 8, height: 6,
      station: [-78, 30, Math.PI / 2], exit: [-74, 26], circle: [0, 0, 86, 24] },
    { id: 'heartwheel', dim: 'anatomy', name: 'The Heart Wheel', kind: 'wheel', seats: 16, station: [36, 32, Math.PI * 1.25], exit: [33, 30],
      wheel: { x: 40, z: 40, h: 16, r: 13, yaw: Math.PI / 4, n: 8, rev: 48 } },
    { id: 'bronchi', dim: 'anatomy', name: 'The Bronchial Tubes', kind: 'slide', seats: 2, every: 3,
      station: [36, -36, Math.PI * 0.75], exit: [52, -52],
      pts: [[38, 14, -38], [44, 13, -34], [48, 11, -40], [44, 9, -46], [40, 8, -42], [44, 6, -36], [50, 5, -40], [52, 3, -46], [54, 1.5, -50], [54, 0.4, -53]] },
    // ----- Froopyland: down the big slide -----
    { id: 'froopyslide', dim: 'froopy', name: 'The Big Froopy Slide', kind: 'slide', seats: 2, every: 3, station: [26, -20, Math.PI], exit: [30, -21],
      pts: Array.from({ length: 27 }, (_, i) => { const a = i * 0.42; return [26 + Math.cos(a) * 2.7, 9.35 - i * 0.34, -26 + Math.sin(a) * 2.7]; }).concat([[33, 0.3, -22], [36, 0.3, -18]]) },
    // ----- The Citadel's monorail -----
    { id: 'citadeltram', dim: 'citadel', name: 'Citadel Monorail', kind: 'tram', closed: true, seats: 8, every: 15, speed: 9, height: 9,
      station: [52, -52, Math.PI * 0.75], exit: [50, -48], circle: [0, 0, 74, 24] },
    // ----- Planet Gear: the Great Gear Wheel -----
    { id: 'gearwheel', dim: 'gearworld', name: 'The Great Gear Wheel', kind: 'wheel', seats: 16, station: [-44, 26, Math.PI / 2], exit: [-41, 24],
      wheel: { x: -50, z: 30, h: 15, r: 12, yaw: Math.PI / 2, n: 8, rev: 44 } },
    // ----- Every Earth: the Ferris wheel on the beach -----
    { id: 'pierwheel', dim: 'suburbia', name: 'The Beach Wheel', kind: 'wheel', seats: 16, station: [60, 311, 0], exit: [64, 309],
      wheel: { x: 60, z: 318, h: 15, r: 12, yaw: 0, n: 8, rev: 46 } },
  ];
  MM.RIDE_BY_ID = {};
  for (const R of MM.RIDES) MM.RIDE_BY_ID[R.id] = R;
  // Which rides are in a dimension: its own, its parallels' (same land), every Earth's (the
  // timelines of an Earth too: the cured Cronenberged Earth and the split timeline have the
  // same beach, so the same wheel; only a timeline that is not a copy of Earth, like 65
  // million years ago, has none).
  MM.ridesIn = function (dimId) {
    const D = MM.DIM_BY_ID[dimId];
    if (!D) return [];
    const base = D.shapeOf || dimId;
    return MM.RIDES.filter(R => R.dim === dimId || R.dim === base || (R.dim === 'suburbia' && D.regions && (!D.timeline || D.variantOf === 'suburbia')));
  };
  // Seats: a train's cars hold two each, side by side, one car behind another.
  MM.CAR_GAP = 2.7;

  // The track: Catch-Rom through the control points, sampled every metre, with the time to
  // each sample (coasters, flumes and slides go as fast as their height lets them).
  const trackCache = {};
  const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
  MM.rideTrack = function (R) {
    if (trackCache[R.id]) return trackCache[R.id];
    const dimId = R.dim, H = (x, z) => MM.heightAt(dimId, x, z);
    let ctrl = R.pts;
    if (R.circle) { const [cx, cz, rad, n] = R.circle; ctrl = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI * 1.25; ctrl.push([cx + Math.cos(a) * rad, R.height, cz + Math.sin(a) * rad]); } }
    const P = ctrl.map(([x, h, z]) => [x, H(x, z) + h, z]);
    const n = P.length, closed = !!R.closed, get = i => closed ? P[((i % n) + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    const pts = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = get(i - 1), b = get(i), c = get(i + 1), d = get(i + 2), m = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2])));
      for (let k = 0; k < m; k++) { const t = k / m; pts.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t)]); }
    }
    pts.push(closed ? pts[0].slice() : P[n - 1].slice());
    // Water and monorails stay level; everything stays clear of the ground.
    if (R.kind === 'boat' || R.kind === 'tram') { const top = Math.max(...pts.map(p => H(p[0], p[2]))); for (const p of pts) p[1] = top + (R.kind === 'tram' ? R.height : 0.3); }
    else for (const p of pts) p[1] = Math.max(p[1], H(p[0], p[2]) + (R.kind === 'slide' ? 0.3 : 0.8));
    const top = Math.max(...pts.map(p => p[1]));
    const dist = [0], time = [0];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], ds = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const fall = Math.max(0, top - (a[1] + b[1]) / 2);
      const v = R.speed || (R.kind === 'coaster' ? Math.min(24, Math.max(4.5, Math.sqrt(2 * 9.8 * fall) * 0.9)) : R.kind === 'flume' ? Math.min(15, Math.max(3, Math.sqrt(2 * 9.8 * fall) * 0.85)) : Math.min(13, Math.max(3.5, Math.sqrt(2 * 9.8 * fall) * 0.8)));
      dist.push(dist[i - 1] + ds); time.push(time[i - 1] + ds / v);
    }
    return (trackCache[R.id] = { pts, dist, time, len: dist[dist.length - 1], dur: time[time.length - 1], closed });
  };
  MM.rideDur = R => R.kind === 'wheel' ? R.wheel.rev : MM.rideTrack(R).dur;
  // How often a train leaves (no more than six trains on a track at once).
  MM.rideEvery = R => R.kind === 'wheel' ? R.wheel.rev / R.wheel.n : Math.max(R.every, MM.rideDur(R) / 6);
  const search = (arr, v) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= v) lo = m; else hi = m; } return lo; };
  // Where a rider sits t seconds after leaving the station: { x, y, z, yaw, pitch }.
  MM.rideAt = function (R, t, seat) {
    seat = seat || 0;
    if (R.kind === 'wheel') {
      const W = R.wheel, a = Math.PI * 2 * Math.max(0, t) / W.rev, ux = Math.cos(W.yaw), uz = -Math.sin(W.yaw), side = (seat % 2 ? 0.45 : -0.45);
      const gx = W.x + ux * Math.sin(a) * W.r, gz = W.z + uz * Math.sin(a) * W.r, gy = MM.heightAt(R.dim, W.x, W.z) + W.h - Math.cos(a) * W.r;
      return { x: gx + Math.sin(W.yaw) * side, y: gy - 1.75, z: gz + Math.cos(W.yaw) * side, yaw: W.yaw + Math.PI / 2, pitch: 0 };
    }
    const T = MM.rideTrack(R), tt = Math.max(0, Math.min(T.dur, t));
    const i = search(T.time, tt), f = T.time[i + 1] > T.time[i] ? (tt - T.time[i]) / (T.time[i + 1] - T.time[i]) : 0;
    let s = T.dist[i] + f * (T.dist[i + 1] - T.dist[i]) - Math.floor(seat / 2) * MM.CAR_GAP;
    if (s < 0) s = T.closed ? s + T.len : 0;
    return MM.trackAt(T, s, seat % 2 ? 0.42 : -0.42);
  };
  // How far along its track a train is, t seconds after it left the station.
  MM.rideS = function (R, t) {
    const T = MM.rideTrack(R), tt = Math.max(0, Math.min(T.dur, t));
    const i = search(T.time, tt), f = T.time[i + 1] > T.time[i] ? (tt - T.time[i]) / (T.time[i + 1] - T.time[i]) : 0;
    return T.dist[i] + f * ((T.dist[i + 1] === undefined ? T.dist[i] : T.dist[i + 1]) - T.dist[i]);
  };
  MM.trackAt = function (T, s, side) {
    const j = search(T.dist, s), a = T.pts[j], b = T.pts[Math.min(j + 1, T.pts.length - 1)];
    const seg = (T.dist[j + 1] || T.dist[j]) - T.dist[j], g = seg > 0 ? (s - T.dist[j]) / seg : 0;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hl = Math.hypot(dx, dz) || 1;
    return { x: a[0] + dx * g + dz / hl * (side || 0), y: a[1] + dy * g, z: a[2] + dz * g - dx / hl * (side || 0), yaw: Math.atan2(dx, dz), pitch: -Math.atan2(dy, hl) };
  };
  // The next departure at or after time `now` (server time), and which seat is free in it.
  MM.nextDeparture = (R, now) => { const e = MM.rideEvery(R); return Math.ceil((now + 1.5) / e) * e; };

  // ---------- Shooting galleries ----------
  // A booth (landmark) with targets popping up in front of it for `secs` seconds. Anyone in
  // the dimension can join in; the best scores are kept.
  MM.GALLERIES = {
    hepablaster: { name: 'Hepatitis A Blaster', target: 'tgt_hepa', n: 5, secs: 40 },
    beachbooth: { name: 'Beach Shooting Booth', target: 'tgt_jerry', n: 5, secs: 40 },
    fedrange: { name: 'Federation Target Range', target: 'tgt_grom', n: 6, secs: 40 },
    blipsblaster: { name: 'Blips and Chitz Blaster', target: 'tgt_jerry', n: 6, secs: 35 },
    purgebooth: { name: 'Purge Night Shooting Booth', target: 'tgt_purge', n: 5, secs: 40 },
  };
  // Where a gallery's targets stand: a row across, 9 to 15 m in front of the booth.
  MM.galleryTargetSpot = (l, u, depth) => {
    const r = l.rot || 0, fx = Math.sin(r), fz = Math.cos(r), d = 9 + depth * 6, w = (u - 0.5) * 12;
    return { x: l.x + fx * d + fz * w, z: l.z + fz * d - fx * w };
  };

  // ---------- Mini-games at landmarks ----------
  // game: fish (cast and reel), dance (hit the notes to the beat), roy (live a life).
  MM.MINIGAMES = {
    fish: { name: 'Fishing', cd: 5 },
    dance: { name: 'Dance', cd: 20 },
    roy: { name: 'Roy: A Life Well Lived', cd: 15 },
  };
  // What you can catch: [name, size, weight], by where you are.
  MM.FISH = {
    sea: [['Sunfish', 0, 6], ['Mackerel', 1, 5], ['Plumbus fish', 1, 3], ['Nimbus\'s goldfish', 2, 2], ['Sea Beast pup', 3, 1], ['An old boot', 0, 3]],
    ice: [['Frozen trout', 1, 6], ['Ice eel', 2, 3], ['A fish frozen mid-sentence', 2, 2], ['Mammoth tooth', 3, 1]],
    jungle: [['Teeny minnow', 0, 6], ['Teeny catfish', 1, 4], ['Kyle\'s lost wrench', 2, 1], ['Tribal river god (small)', 3, 1]],
  };
  MM.DANCE_JUDGE = {
    sonicstage: ['SHOW ME WHAT YOU GOT!', 'I LIKE WHAT YOU GOT. GOOD JOB.', 'DISQUALIFIED.'],
    squanchclub: ['SQUANCH! That\'s some squanchin\'!', 'You squanch alright.', 'That was not squanchy.'],
    purgestage: ['The crowd goes WILD (and then purges).', 'Polite festival applause.', 'Someone threw a tomato. And an axe.'],
    bandstand: ['The whole park dances along. Even the bacteria.', 'Dr. Bloom nods along politely.', 'Hepatitis A boos you.'],
    ddr: ['NEW HIGH SCORE! Blips and Chitz!', 'Not bad, for a tourist.', 'The machine laughs at you.'],
  };

  // ---------- Jump pads ----------
  // [x, z, power]: step on one and it throws you up into the air.
  MM.PADS = {
    anatomy: [[64, -62, 22], [70, -56, 24], [76, -66, 22], [68, -72, 26], [80, -58, 20], [60, -70, 20]],
    froopy: [[-20, 24, 26], [-26, 30, 22], [-14, 32, 24], [-30, 20, 20]],
    moon: [[30, 20, 18], [36, 26, 22], [24, 30, 20]],
    gearworld: [[30, -20, 22], [36, -24, 24]],
  };
  MM.padsIn = dimId => { const D = MM.DIM_BY_ID[dimId]; return D ? MM.PADS[dimId] || MM.PADS[D.shapeOf] || [] : []; };
  MM.padAt = (dimId, x, z) => MM.padsIn(dimId).find(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 1.7 * 1.7);

  // ---------- The multiverse passport ----------
  // Every dimension you set foot in gets a stamp; milestones pay out.
  MM.PASSPORT = [[5, 'Tourist', { k: 5 }], [10, 'Day-Tripper', { k: 10, c: 5 }], [20, 'Traveller', { k: 20, m: 1 }], [40, 'Multiverse Explorer', { k: 40, m: 2 }], [80, 'Interdimensional Legend', { k: 80, m: 4 }]];
  MM.stampOf = dimId => {
    const D = MM.DIM_BY_ID[dimId];
    if (!D || D.hidden || D.interior || D.planets) return null;
    return D.timeline ? dimId : MM.dimensionOf(dimId);
  };

  // ---------- Easter eggs ----------
  // Things from the show to find: spots (walk up to them), cameos (talk to them) and things
  // to say in chat. dim '@earth' = on every Earth.
  MM.EGGS = [
    { id: 'pencilvester', name: 'Pencilvester', kind: 'spot', dim: 'smithhouse', x: 6.6, z: -2.2, y: 0.85, model: 'pencil', text: '"Hey! It\'s me, Pencilvester!" A parasite from "Total Rickall". It has no bad memories with you. Suspicious.' },
    { id: 'szechuan', name: 'Szechuan Sauce', kind: 'spot', dim: '@earth', x: 432, z: 14, model: 'sauce', text: 'A dipping cup of 1998 McDonald\'s Szechuan Sauce. Rick would go nine seasons for this.' },
    { id: 'hungryapples', name: '"Hungry for Apples?"', kind: 'spot', dim: '@earth', x: 205, z: -36, r: 8, model: 'billboard', text: 'Jerry\'s ad campaign. It worked. Nobody knows why it worked. Jerry has never been prouder.' },
    { id: 'ballfondlers', name: 'Ball Fondlers', kind: 'spot', dim: 'cableworld', x: 8, z: 26, model: 'tv', text: '"Ball Fondlers!" The best show on interdimensional cable. The Fondlers are back, and this time they are fondling... balls.' },
    { id: 'mindjar', name: 'Morty\'s Mind Blowers', kind: 'spot', dim: 'ricklab', x: -6.4, z: -8.4, model: 'jar', text: 'A jar of memories Morty asked Rick to erase. One is just labelled "the closet". Do not open it.' },
    { id: 'krombopulos', name: 'Krombopulos Michael', kind: 'npc', npc: 'krombopulos', dim: 'blips', x: 14, z: 8, text: '"Oh boy, here I go killing again!" The galaxy\'s friendliest assassin.' },
    { id: 'noobnoob', name: 'Noob-Noob', kind: 'npc', npc: 'noobnoob', dim: 'citadel', x: -20, z: -20, text: 'Noob-Noob, the Vindicators\' janitor, mopping. He had a big night once.' },
    { id: 'lizardmorty', name: 'Lizard Morty', kind: 'npc', npc: 'lizardmorty', dim: 'citadel', x: 24, z: 14, text: 'A Morty who is also a lizard. He is very calm about it.' },
    { id: 'gearhead', name: 'Revolio "Gearhead" Clockberg Jr.', kind: 'npc', npc: 'gearhead', dim: 'gearworld', x: 12, z: -14, text: 'Gearhead. He sold out Rick to the Federation. Twice. He insists it was once.' },
    { id: 'tammy', name: 'Tammy', kind: 'npc', npc: 'tammy', dim: 'featherhold', x: 10, z: 10, text: 'Tammy Guetermann, at Bird World. Totally just a normal guest. Not a Federation agent. Probably.' },
    { id: 'jessica', name: 'Jessica', kind: 'npc', npc: 'jessica', dim: 'suburbia', x: 34, z: 8, text: 'Jessica, from Morty\'s school. Morty would like you to stop looking at her.' },
    { id: 'glootie', name: 'Glootie', kind: 'npc', npc: 'glootie', dim: 'mancave', x: 3, z: -1, text: '"Do not develop my app." Glootie, Jerry\'s intern from "The Old Man and the Seat".' },
    { id: 'pibbles', name: 'Shrimply Pibbles', kind: 'npc', npc: 'pibbles', dim: 'downtown', x: -30, z: 10, text: 'Shrimply Pibbles, the civil rights leader from "Interdimensional Cable 2", needs a new heart. Jerry\'s, ideally.' },
    { id: 'eyeholes', name: 'The Eyeholes Man', kind: 'npc', npc: 'eyeholesman', dim: 'cableworld', x: -10, z: 22, text: '"Get the hell out of here! Eyeholes are MINE!"' },
    { id: 'gazorpfield', name: 'Gazorpazorpfield', kind: 'npc', npc: 'gazorpfield', dim: 'gazorp', x: 14, z: 12, text: '"I hate Mondays." Gazorpazorpfield, wanting his enchiladas.' },
    { id: 'wubba', name: 'Wubba lubba dub dub', kind: 'say', re: /wubba\s*lubba\s*dub\s*dub/i, text: 'It means "I am in great pain, please help me." Birdperson told everyone.' },
    { id: 'schwifty', name: 'Get Schwifty', kind: 'say', re: /get\s*schwifty/i, text: 'Take off your pants and your panties, shit on the floor. Everyone near you dances.' },
    { id: 'showme', name: 'Show me what you got', kind: 'say', re: /show\s*me\s*what\s*you\s*got/i, text: 'A Cromulon heard you. It wants to see what you got.' },
    { id: 'picklerick', name: 'Pickle Rick!', kind: 'say', re: /pickle\s*rick/i, text: 'You turned yourself into a pickle. Funniest thing anyone has ever seen.' },
    { id: 'meeseeks', name: 'I\'m Mr. Meeseeks!', kind: 'say', re: /i'?m\s*mr\.?\s*meeseeks/i, text: 'Look at me! A Meeseeks popped out to help with whatever you need.' },
    { id: 'plumbus', name: 'Everyone has a plumbus', kind: 'say', re: /what\s*is\s*a\s*plumbus|how\s*.*plumbus\s*made/i, text: 'First they take the dinglebop, and they smooth it out with a bunch of schleem.' },
    { id: 'riggity', name: 'Riggity riggity wrecked, son', kind: 'say', re: /riggity/i, text: 'Rikki-tikki-tavi, biatch! And that\'s the wa-a-ay the news goes!' },
  ];
  MM.EGG_BY_ID = {};
  for (const E of MM.EGGS) MM.EGG_BY_ID[E.id] = E;
  // The spot eggs in a dimension (every Earth has the '@earth' ones).
  MM.eggsIn = dimId => { const D = MM.DIM_BY_ID[dimId]; return D ? MM.EGGS.filter(E => E.kind === 'spot' && (E.dim === dimId || (E.dim === '@earth' && D.regions && !D.timeline))) : []; };

  // ---------- Emotes ----------
  MM.EMOTES = ['Wave', 'Dance', 'Laugh', 'Point', 'Cheer', 'Facepalm'];

  // ---------- Anatomy Park's way in: a giant corpse floating in space ----------
  // Lying on its back above every Earth. Local frame: x along the body (the head at +x), y up
  // (out of the chest), z across. parts: spheres you bump into. holes: the ways in (any of
  // them), each with its own gate inside the park.
  MM.BODY = {
    at: [-210, 170, 250], yaw: Math.PI / 6,
    parts: [[70, 0, 0, 14], [80, 11, 0, 3.5], [57, -1, 0, 8], [42, 0, 0, 22], [24, 0, 0, 22], [6, 0, 0, 21], [-10, 0, 0, 19], [42, 0, -30, 7], [26, 0, -34, 6], [10, 0, -36, 6], [42, 0, 30, 7], [26, 0, 34, 6], [10, 0, 36, 6],
      [-28, 0, -11, 10], [-46, 0, -11, 9], [-64, 0, -11, 8], [-80, 6, -11, 6], [-28, 0, 11, 10], [-46, 0, 11, 9], [-64, 0, 11, 8], [-80, 6, 11, 6]],
    holes: [
      ['mouth', 'The Mouth (Main Gate)', [77, 11, 0]], ['lnostril', 'Left Nostril', [83, 14, -1.6]], ['rnostril', 'Right Nostril', [83, 14, 1.6]],
      ['lear', 'Left Ear', [68, 2, -14.5]], ['rear', 'Right Ear', [68, 2, 14.5]], ['lnipple', 'Left Nipple', [42, 21.5, -10]], ['rnipple', 'Right Nipple', [42, 21.5, 10]],
      ['navel', 'The Belly Button', [14, 21.5, 0]], ['front', 'The Front Door (through the boxers)', [-12, 19.5, 0]], ['back', 'The Back Door', [-14, -19, 0]],
    ],
  };
  // A body point (local) in the space it floats in.
  MM.bodyPoint = (B, p, at) => {
    const c = Math.cos(B.yaw), s = Math.sin(B.yaw);
    return [at[0] + p[0] * c + p[2] * s, at[1] + p[1], at[2] - p[0] * s + p[2] * c];
  };
  // Where each hole's gate stands in the park: an arc on the south-west edge, facing in.
  MM.bodyGate = i => { const a = (200 + i * 6) * Math.PI / 180, R = 80; return { x: Math.cos(a) * R, z: Math.sin(a) * R, rot: Math.atan2(-Math.cos(a), -Math.sin(a)) }; };

  // ---------- Where all this is (landmarks; loaded before shared/world.js plans the worlds) ----------
  const L = o => { MM.LANDMARKS.push(o); MM.LANDMARK_BY_ID[o.id] = o; };
  for (const R of MM.RIDES) { const [x, z, rot] = R.station; L({ id: 'ride_' + R.id, dim: R.dim, name: R.name, x, z, r: 1.4, h: 3.6, model: 'lm_ridegate', rot, ride: R.id }); }
  for (const [id, dim, x, z, rot] of [['hepablaster', 'anatomy', -62, 8, -Math.PI / 2], ['beachbooth', 'suburbia', -40, 306, 0], ['fedrange', 'federation', 34, -24, Math.PI / 2],
    ['blipsblaster', 'blips', 24, -20, 0], ['purgebooth', 'purge', 26, -26, Math.PI / 2]]) L({ id, dim, name: MM.GALLERIES[id].name, x, z, r: 2.2, h: 3.4, model: 'lm_gallery', rot, gallery: id });
  // The pier on every Earth's beach, with a fishing spot at the end; a pond in the Teenyverse.
  L({ id: 'pier', dim: 'suburbia', name: 'The pier', x: 30, z: 330, r: 1.5, h: 1.2, model: 'lm_pier', rot: 0, arch: true });
  L({ id: 'pierfish', dim: 'suburbia', name: 'Fishing by the pier', x: 24, z: 341, r: 1.0, h: 1.2, model: 'lm_marker', game: 'fish', fish: 'sea' });
  L({ id: 'teenypond', dim: 'teenyverse', name: 'The river pool', x: -26, z: 24, r: 4, h: 0.4, model: 'lm_pond', game: 'fish', fish: 'jungle' });
  L({ id: 'ddr', dim: 'blips', name: 'Squanch Squanch Revolution (dance machine)', x: -22, z: -22, r: 2, h: 3.2, model: 'lm_ddr', rot: 0, game: 'dance' });
  for (const id of ['sonicstage', 'squanchclub', 'purgestage']) MM.LANDMARK_BY_ID[id].game = 'dance';
  // Anatomy Park: the gates (one for each hole; the way back out to your ship), the giant
  // Heart, the big organ rides' landmarks, the food, the gift shop and the bandstand.
  MM.BODY.holes.forEach(([id, name], i) => {
    const g = MM.bodyGate(i);
    L({ id: 'apgate_' + id, dim: 'anatomy', name: 'Gate: ' + name + ' (back out to your ship)', x: g.x, z: g.z, r: 1.6, h: 5, model: 'lm_bodygate', rot: g.rot, bodyExit: i,
      door: { dim: 'anatomy', x: 0, z: 0 }, sign: { text: name.replace(/ \(.*\)/, '').toUpperCase(), y: 4.6, z: 0.5, w: 4 } });
  });
  L({ id: 'bigheart', dim: 'anatomy', name: 'The Heart', x: 0, z: 0, r: 5, h: 9, model: 'lm_heart', rot: 0 });
  L({ id: 'spleenmtn', dim: 'anatomy', name: 'Spleen Mountain', x: 73, z: -6, r: 10, h: 16, model: 'lm_spleenmtn', rot: 0 });
  L({ id: 'bladdertank', dim: 'anatomy', name: 'The Bladder', x: 0, z: -68, r: 6, h: 14, model: 'lm_bladder', rot: 0 });
  L({ id: 'bronchitower', dim: 'anatomy', name: 'The Bronchial Tubes (tower)', x: 40, z: -42, r: 2.6, h: 15, model: 'lm_slidetower', rot: 0 });
  L({ id: 'giftshop', dim: 'anatomy', name: 'Anatomy Park Gift Shop', x: -46, z: 30, r: 5, h: 6, model: 'lm_giftshop', sign: { text: 'GIFT SHOP', y: 5, z: 3.6, w: 5 } });
  L({ id: 'marrowburger', dim: 'anatomy', name: 'Bone Marrow Burgers', x: -34, z: 48, r: 3, h: 4, model: 'lm_foodstand', sign: { text: 'BONE MARROW BURGERS', y: 3.8, z: 1.6, w: 4.5 } });
  L({ id: 'plaquecandy', dim: 'anatomy', name: 'Plaque Candy Floss', x: -54, z: 46, r: 3, h: 4, model: 'lm_foodstand', sign: { text: 'PLAQUE CANDY', y: 3.8, z: 1.6, w: 4 } });
  L({ id: 'bandstand', dim: 'anatomy', name: 'The Uvula Bandstand (dance!)', x: -22, z: 62, r: 6, h: 7, model: 'lm_bandstand', game: 'dance' });
  MM.DANCE_JUDGE.bandstand = MM.DANCE_JUDGE.bandstand || ['The whole park dances along.', 'Polite applause.', 'Boo.'];
  MM.LANDMARK_BY_ID.roy.game = 'roy';

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
