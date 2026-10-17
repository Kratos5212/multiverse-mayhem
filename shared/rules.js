// Multiverse Mayhem: game rules shared by the client, the server and the bots.
// Plain script: in a browser it fills the global MM, in Node `require` it.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.VERSION = 4;
  // Monsters notice you within AGGRO_RANGE metres and stop chasing beyond LEASH of their home.
  // Where a character can start: their home world (and, for some, another place they live).
  // Where a character can start: their home dimension's Earth first (for Earth folk with a
  // home code), then the other places they live. Only C-137 folk start on the show's Earth.
  MM.startWorlds = (arch, home) => {
    const A = MM.ARCHETYPES[arch];
    let list = (A.homes || [A.home]).filter(d => MM.DIM_BY_ID ? MM.DIM_BY_ID[d] : true);
    if (home && MM.homeDimId && MM.EARTH_ARCHS.includes(arch)) {
      const h = MM.homeDimId(home);
      list = [h].concat(list.filter(d => d !== h && d !== 'suburbia'));
    }
    return list;
  };
  MM.TEAM_MAX = 8; MM.TEAM_REACH = 14;
  MM.AGGRO_RANGE = 9;
  MM.LEASH = 26;               // protocol version; client and server must match
  MM.TICK = 1 / 30;             // server simulation step (seconds)
  MM.SNAP_EVERY = 2;            // a snapshot every 2 ticks = 15 per second
  MM.INSTANCE_CAP = 64;         // players per dimension instance (servers can raise it)
  MM.WORLD_HALF = 200;          // playable area is -200..200 on x and z
  MM.RESPAWN_TIME = 4;
  MM.SPAWN_PROTECT = 3;

  // ---------- Materials ----------
  // Every dimension has its own material, so big upgrades mean travelling.
  MM.MATERIALS = {
    s: { name: 'Scrap', icon: '⚙', color: '#c9d1d9', from: 'everywhere (smash things)' },
    c: { name: 'Moon Crystal', icon: '◆', color: '#7affea', from: 'Lowgrav Moon' },
    g: { name: 'Meat Goo', icon: '●', color: '#ff7a8a', from: 'Cronenberg World' },
    p: { name: 'Neon Plasma', icon: '✦', color: '#ff6fd0', from: 'Alien Bazaar' },
    f: { name: 'Sky Feather', icon: '➶', color: '#ffd84d', from: 'Bird World' },
    m: { name: 'Mega Seed', icon: '❂', color: '#c8ff6a', from: 'the Mega Seed world (rare)' },
    k: { name: 'Schmeckles', icon: '$', color: '#ffe9a0', from: 'the Citadel of Ricks' },
  };
  MM.MAT_IDS = Object.keys(MM.MATERIALS);

  // ---------- Places you go to live your life and build things ----------
  // Each is a building in a dimension. Daily tasks happen there, and some recipes
  // can only be built at a particular one.
  MM.LANDMARKS = [
    // rot: which way the front faces (PI/2 = toward +x). The Smith house and Rick's garage
    // stand side by side on one lot, facing the street: the garage on the left of the house
    // (+z), the back yard behind both (where Rick and Morty buried their other selves).
    { id: 'home', dim: 'suburbia', name: 'Smith House', x: -13.5, z: 16.5, r: 7, h: 11, model: 'lm_home', rot: Math.PI / 2, door: { dim: 'smithhouse', x: -0.6, z: -5.6 } },
    { id: 'backdoor', dim: 'suburbia', name: 'Back door (into the kitchen)', x: -19.7, z: 12.05, r: 0.8, h: 2.2, model: 'lm_marker', door: { dim: 'smithhouse', x: 5.97, z: 5.6 } },
    { id: 'sidedoor', dim: 'suburbia', name: "Side door (into Rick's room)", x: -16.3, z: 24.6, r: 0.8, h: 2.2, model: 'lm_marker', door: { dim: 'smithhouse', x: -8.2, z: 3.84 } },
    { id: 'backyard', dim: 'suburbia', name: 'The back yard', x: -28.5, z: 21.5, r: 8.5, h: 3, model: 'lm_backyard', rot: Math.PI / 2 },
    { id: 'graves', dim: 'suburbia', name: 'Two graves under the tree', x: -31.5, z: 15.5, r: 1.4, h: 1, model: 'lm_marker' },
    // Inside the Smith house: two floors, each a Mojulo floor plan (shared/interiors.js has the
    // plans). fy: the floor a spot is on (4.3 = upstairs). Spots are marked with a ring.
    { id: 'smithexit', dim: 'smithhouse', name: 'Front door', x: 0, z: -6.3, r: 0.8, h: 2.2, fy: 0, model: 'lm_marker', door: { dim: 'suburbia', x: -6.3, z: 17.1 } },
    { id: 'smithback', dim: 'smithhouse', name: 'Back door (to the yard)', x: 5.97, z: 6.3, r: 0.8, h: 2.2, fy: 0, model: 'lm_marker', door: { dim: 'suburbia', x: -20.6, z: 12.05 } },
    { id: 'smithside', dim: 'smithhouse', name: 'Side door (to the garage)', x: -8.9, z: 3.84, r: 0.8, h: 2.2, fy: 0, model: 'lm_marker', door: { dim: 'suburbia', x: -16.3, z: 25.3 } },
    { id: 'smithtv', dim: 'smithhouse', name: 'The couch (interdimensional cable)', x: -5.97, z: -3.0, r: 0.8, h: 1.2, fy: 0, model: 'lm_marker' },
    { id: 'smithtable', dim: 'smithhouse', name: 'Dining table', x: 5.97, z: -1.6, r: 0.8, h: 1.2, fy: 0, model: 'lm_marker' },
    { id: 'smithkitchen', dim: 'smithhouse', name: 'The fridge', x: 7.4, z: 1.9, r: 0.8, h: 1.2, fy: 0, model: 'lm_marker' },
    { id: 'rickroom', dim: 'smithhouse', name: "Rick's room", x: -5.2, z: 2.3, r: 0.8, h: 1.2, fy: 0, model: 'lm_marker' },
    { id: 'mortyroom', dim: 'smithhouse', name: "Morty's room", x: -4.4, z: -3.4, r: 0.8, h: 1.2, fy: 4.3, model: 'lm_marker' },
    { id: 'summerroom', dim: 'smithhouse', name: "Summer's room", x: -4.4, z: 3.4, r: 0.8, h: 1.2, fy: 4.3, model: 'lm_marker' },
    { id: 'masterroom', dim: 'smithhouse', name: "Beth and Jerry's room", x: 4.6, z: -3.4, r: 0.8, h: 1.2, fy: 4.3, model: 'lm_marker' },
    { id: 'bathroom', dim: 'smithhouse', name: 'The bathroom', x: 5.0, z: 3.6, r: 0.8, h: 1.2, fy: 4.3, model: 'lm_marker' },
    // Rick's garage stands open on the street: walk in through the big door. Inside, along
    // the back wall, the workbench; the ship, the battery, the hatch to the lab and the door
    // to the cellar. (Local garage coordinates turned to the street: front = +x.)
    { id: 'garage', dim: 'suburbia', name: "Rick's Garage", x: -14.5, z: 31, r: 5.5, h: 6.5, model: 'lm_garage', rot: Math.PI / 2 },
    { id: 'workbench', dim: 'suburbia', name: "Rick's Workbench", x: -18.0, z: 31, r: 1.6, h: 1.3, model: 'lm_workbench', alias: 'garage', rot: Math.PI / 2 },
    { id: 'plumbus', dim: 'suburbia', name: 'Plumbus', x: -18.2, z: 33.7, r: 0.6, h: 1.6, model: 'lm_plumbus', rot: Math.PI / 2 },
    { id: 'mbox', dim: 'suburbia', name: 'Meeseeks Box', x: -18.1, z: 27.6, r: 0.6, h: 1.4, model: 'lm_mbox', rot: Math.PI / 2 },
    { id: 'battery', dim: 'suburbia', name: 'Microverse Battery', x: -11.6, z: 27.5, r: 0.8, h: 1.2, model: 'lm_battery', rot: 0, door: { dim: 'microverse', x: 0, z: 16 } },
    { id: 'trapdoor', dim: 'suburbia', name: 'Hatch to the secret lab', x: -15.6, z: 28.1, r: 0.9, h: 0.3, model: 'lm_trapdoor', rot: Math.PI / 2, door: { dim: 'ricklab', x: 0, z: 6 } },
    { id: 'cellardoor', dim: 'suburbia', name: 'Door to the wine cellar', x: -16.4, z: 35.25, r: 0.9, h: 3.4, model: 'lm_cellardoor', rot: Math.PI, door: { dim: 'cellar', x: 0, z: 6 } },
    { id: 'school', dim: 'suburbia', name: 'Harry Herpson High', x: 30, z: 22, r: 8.5, h: 8, model: 'lm_school', rot: Math.PI / 2, sign: { text: 'HARRY HERPSON HIGH SCHOOL', y: 6.95, z: 4.62, w: 9.5 } },
    { id: 'hospital', dim: 'suburbia', name: 'Horse Hospital', x: 30, z: -22, r: 7, h: 8, model: 'lm_hospital', rot: Math.PI / 2, sign: { text: 'HORSE HOSPITAL', y: 7.0, z: 5.1, w: 8 } },
    { id: 'office', dim: 'suburbia', name: 'Unemployment Office', x: -30, z: -22, r: 6.5, h: 7, model: 'lm_office', rot: -Math.PI / 2, sign: { text: 'UNEMPLOYMENT OFFICE', y: 6.4, z: 4.1, w: 8 } },
    { id: 'forge', dim: 'meatlands', name: 'Flesh Forge', x: 66, z: 66, r: 6, h: 7, model: 'lm_forge', rot: -Math.PI / 2 },
    { id: 'shipyard', dim: 'bazaar', name: 'Bazaar Shipyard', x: 34, z: -6, r: 8, h: 9, model: 'lm_shipyard' },
    { id: 'market', dim: 'bazaar', name: 'Black Market', x: -32, z: 16, r: 6, h: 6, model: 'lm_market' },
    { id: 'refinery', dim: 'moon', name: 'Crystal Refinery', x: -30, z: 18, r: 7, h: 8, model: 'lm_refinery' },
    { id: 'aerie', dim: 'featherhold', name: 'Aerie Temple', x: 0, z: 36, r: 7, h: 14, model: 'lm_aerie' },
    { id: 'council', dim: 'citadel', name: 'Council of Ricks', x: 0, z: 40, r: 9, h: 14, model: 'lm_council', sign: { text: 'COUNCIL OF RICKS', y: 5.4, z: 8.7, w: 7 } },
    { id: 'daycare', dim: 'citadel', name: 'Morty Daycare', x: -38, z: 8, r: 6.5, h: 7, model: 'lm_daycare', sign: { text: 'MORTY DAYCARE', y: 5.2, z: 4.62, w: 6 } },
    { id: 'palace', dim: 'dogworld', name: "Snowball's Palace", x: 0, z: 40, r: 9, h: 12, model: 'lm_palace' },
    { id: 'roy', dim: 'blips', name: 'Roy: A Life Well Lived', x: 0, z: -24, r: 2.2, h: 3.6, model: 'lm_roy', rot: 0 },
    { id: 'pancreas', dim: 'anatomy', name: 'Pirates of the Pancreas', x: 0, z: 38, r: 7, h: 9, model: 'lm_ride', sign: { text: 'PIRATES OF THE PANCREAS', y: 7.4, z: 3.1, w: 9 } },
    { id: 'gooble', dim: 'microverse', name: 'Gooble Box Power Plant', x: 0, z: 38, r: 8, h: 10, model: 'lm_gooble', sign: { text: 'POWER PLANT', y: 8, z: 6.1, w: 7 } },
    // Ways into the pocket worlds, and back out.
    { id: 'anatomyentry', dim: 'suburbia', name: 'Anatomy Park (inside Ruben)', x: 66, z: -66, r: 5, h: 4, model: 'lm_anatomytent', door: { dim: 'anatomy', x: 0, z: 18 }, sign: { text: 'ANATOMY PARK', y: 4.4, z: 4.1, w: 6 } },
    { id: 'chalkdoor', dim: 'suburbia', name: "Rick's chalk door", x: -66, z: 66, r: 2.5, h: 3.5, model: 'lm_chalkdoor', door: { dim: 'froopy', x: 0, z: 16 } },
    { id: 'microexit', dim: 'microverse', name: 'Out of the battery', x: 0, z: 10, r: 2.5, h: 4, model: 'lm_exitportal', door: { dim: 'suburbia', x: -12.6, z: 28.9 } },
    { id: 'anatomyexit', dim: 'anatomy', name: "Out of Ruben", x: 0, z: 12, r: 2.5, h: 4, model: 'lm_exitportal', door: { dim: 'suburbia', x: 66, z: -58 } },
    { id: 'froopyexit', dim: 'froopy', name: 'Back through the chalk door', x: 0, z: 10, r: 2.5, h: 3.5, model: 'lm_chalkdoor', door: { dim: 'suburbia', x: -66, z: 58 } },
    { id: 'curveedge', dim: 'beyond', name: 'Edge of the Curve', x: 0, z: 62, r: 8, h: 12, model: 'lm_curveedge' },
    { id: 'fakedoors', dim: 'cableworld', name: 'Real Fake Doors', x: 26, z: 34, r: 7, h: 8, model: 'lm_fakedoors', rot: -Math.PI / 2, sign: { text: 'REAL FAKE DOORS', y: 6.6, z: 5.1, w: 9 } },
    { id: 'antsjohnson', dim: 'cableworld', name: "Ants in my Eyes Johnson's", x: -26, z: 34, r: 7, h: 8, model: 'lm_antsjohnson', rot: Math.PI / 2, sign: { text: "ANTS IN MY EYES JOHNSON'S", y: 6.6, z: 5.1, w: 9.5 } },
    { id: 'plumbusline', dim: 'plumbus', name: 'Plumbus Production Line', x: 0, z: 40, r: 8, h: 9, model: 'lm_plumbusline', sign: { text: 'PLUMBUS CO.', y: 8.2, z: 5.6, w: 7 } },
    { id: 'megatree', dim: 'megaseed', name: 'Mega Seed Tree', x: 0, z: 36, r: 6, h: 24, model: 'lm_megatree' },
    // Inside Rick's garage (its own little dimension). door: walking through takes you there.
    { id: 'ladder', dim: 'ricklab', name: 'Ladder up to the garage', x: 0, z: 9.5, r: 1.2, h: 5, model: 'lm_ladder', door: { dim: 'suburbia', x: -14.6, z: 28.3 } },
    { id: 'mindblowers', dim: 'ricklab', name: 'Mind Blowers', x: -8.5, z: -6, r: 1.4, h: 2.4, model: 'lm_mindblowers' },
    { id: 'cellarexit', dim: 'cellar', name: 'Back to the garage', x: 0, z: 9.5, r: 1.4, h: 3.4, model: 'lm_cellardoor', door: { dim: 'suburbia', x: -16.4, z: 33.9 } },
    { id: 'winerack', dim: 'cellar', name: "Rick's private stash", x: 0, z: -8.5, r: 2.0, h: 3, model: 'lm_winerack' },
    // ----- Downtown (just outside Seattle) -----
    { id: 'mall', dim: 'downtown', name: "Merpal's Mall", x: -66, z: -22, r: 12, h: 9, model: 'lm_mall', rot: Math.PI / 2, sign: { text: "MERPAL'S MALL", y: 7.4, z: 8.1, w: 10 } },
    { id: 'shoneys', dim: 'downtown', name: "Shoney's", x: 22, z: 22, r: 6.5, h: 6, model: 'lm_shoneys', rot: Math.PI, sign: { text: "SHONEY'S", y: 5.0, z: 4.6, w: 6 } },
    { id: 'needful', dim: 'downtown', name: 'Needful Things', x: -22, z: 22, r: 5.5, h: 6, model: 'lm_needful', rot: Math.PI, sign: { text: 'NEEDFUL THINGS', y: 4.6, z: 3.9, w: 6 } },
    { id: 'wong', dim: 'downtown', name: "Dr. Wong's Office", x: 22, z: -22, r: 6, h: 12, model: 'lm_wong', rot: 0, sign: { text: 'DR. WONG · FAMILY THERAPY', y: 3.6, z: 4.4, w: 7 } },
    { id: 'tvstore', dim: 'downtown', name: 'Electronics Store', x: -22, z: -22, r: 6, h: 6, model: 'lm_tvstore', rot: 0, sign: { text: 'TV & ELECTRONICS', y: 4.9, z: 4.6, w: 7 } },
    // ----- Washington, D.C. -----
    { id: 'whitehouse', dim: 'dc', name: 'The White House', x: 0, z: -52, r: 14, h: 10, model: 'lm_whitehouse', rot: 0 },
    { id: 'monument', dim: 'dc', name: 'Washington Monument', x: 0, z: 0, r: 3, h: 30, model: 'lm_obelisk' },
    { id: 'capitol', dim: 'dc', name: 'The Capitol', x: 0, z: 110, r: 16, h: 18, model: 'lm_capitol', rot: Math.PI },
    { id: 'pentagon', dim: 'dc', name: 'The Pentagon', x: 100, z: -40, r: 20, h: 7, model: 'lm_pentagon', rot: -Math.PI / 2 },
    // ----- Area 51 -----
    { id: 'sonicstage', dim: 'area51', name: 'The Sonic Stage', x: 0, z: -40, r: 12, h: 9, model: 'lm_sonicstage', rot: 0 },
    // ----- Snake Planet, Giant World, Atlantis, the Dream World, other times -----
    { id: 'snakeclub', dim: 'snakeplanet', name: 'The Snake Jazz Club', x: 0, z: -34, r: 8, h: 8, model: 'lm_snakeclub', rot: 0 },
    { id: 'dinocouncil', dim: 'dinoearth', name: 'The Dinosaur Council', x: 30, z: -30, r: 10, h: 10, model: 'lm_dinocouncil' },
    { id: 'giantcastle', dim: 'giantland', name: "The Giants' Castle", x: 0, z: -60, r: 14, h: 26, model: 'lm_giantcastle', rot: 0 },
    { id: 'surface', dim: 'atlantis', name: 'Swim up to the surface (back to the beach)', x: 0, z: 40, r: 2.5, h: 4, model: 'lm_marker', door: { dim: 'suburbia', x: 0, z: 335 } },
    { id: 'nimbuspalace', dim: 'atlantis', name: "Mr. Nimbus's Palace", x: 0, z: -45, r: 12, h: 16, model: 'lm_nimbuspalace', rot: 0 },
    { id: 'dreamschool', dim: 'dreamworld', name: 'Dream High School (it never ends)', x: 0, z: -40, r: 10, h: 9, model: 'lm_dreamschool', rot: 0 },
    { id: 'timerift', dim: 'splitearth', name: 'The Time Rift', x: 22, z: 0, r: 4, h: 9, model: 'lm_timerift' },
    // ----- Something to do in every world -----
    { id: 'purgestage', dim: 'purge', name: 'The Festival Stage', x: 0, z: -34, r: 7, h: 7, model: 'lm_purgestage', rot: 0 },
    { id: 'squanchclub', dim: 'squanch', name: "Squanchy's Party Hut", x: 0, z: -30, r: 7, h: 7, model: 'lm_squanchclub', rot: 0 },
    { id: 'gazorpthrone', dim: 'gazorp', name: 'The Gazorpian Throne', x: 0, z: -32, r: 7, h: 9, model: 'lm_gazorpthrone', rot: 0 },
    { id: 'froopyslide', dim: 'froopy', name: 'The Big Froopy Slide', x: 26, z: -26, r: 6, h: 10, model: 'lm_froopyslide' },
    { id: 'pizzacounter', dim: 'pizzaworld', name: 'Pizza-Phone-Chair Exchange', x: 0, z: -30, r: 6, h: 6, model: 'lm_pizzacounter', rot: 0 },
    { id: 'raidergarage', dim: 'wasteland', name: "The Raiders' Garage", x: 0, z: -34, r: 8, h: 7, model: 'lm_raidergarage', rot: 0 },
    { id: 'unitycore', dim: 'unityworld', name: 'The Hive Core', x: 0, z: -34, r: 6, h: 14, model: 'lm_unitycore' },
    { id: 'formsoffice', dim: 'federation', name: 'Bureau of Forms', x: 0, z: -40, r: 8, h: 9, model: 'lm_formsoffice', rot: 0 },
    { id: 'geartemple', dim: 'gearworld', name: 'Temple of the Great Gear', x: 0, z: -36, r: 8, h: 12, model: 'lm_geartemple', rot: 0 },
    { id: 'hamstertube', dim: 'hamsterworld', name: 'The Hamster Tubes', x: 24, z: -24, r: 6, h: 6, model: 'lm_hamstertube' },
    { id: 'storyengine', dim: 'storytrain', name: 'The Story Engine', x: 0, z: -24, r: 7, h: 8, model: 'lm_storyengine', rot: 0 },
    { id: 'detoxpod', dim: 'toxicworld', name: "Rick's Detox Machine", x: 0, z: -30, r: 5, h: 6, model: 'lm_detoxpod', rot: 0 },
    { id: 'hangar51', dim: 'area51', name: 'Hangar 18', x: 60, z: 10, r: 13, h: 10, model: 'lm_hangar', rot: -Math.PI / 2, sign: { text: 'HANGAR 18', y: 8.2, z: 9.6, w: 6 } },
  ];
  MM.LANDMARK_BY_ID = {};
  for (const l of MM.LANDMARKS) MM.LANDMARK_BY_ID[l.id] = l;
  MM.SHIP_BOOST = 1.6;   // Shift in a ship: the afterburner
  MM.USE_RADIUS = 4;   // how close to a landmark's wall you must be to use it
  // A landmark counts as a recipe's station if it is that station or stands in for it.
  MM.isAt = (l, at) => l.id === at || l.alias === at;
  // Can this character do this task at all? Your own daily life, anything marked any,
  // minus what your lore rules out (notFor) or only some people can do (onlyFor).
  MM.taskFor = (t, arch) => {
    const T = MM.TASKS[t];
    return (T.any || MM.ARCHETYPES[arch].life.daily.includes(t)) && !(T.notFor || []).includes(arch) && (!T.onlyFor || T.onlyFor.includes(arch));
  };

  // ---------- Daily life ----------
  // Things you do at a landmark. Each can be repeated after its cooldown (seconds).
  MM.TASKS = {
    // Downtown, D.C. and Area 51: anyone can do these.
    mall:    { at: 'mall', any: true, name: "Hang out at Merpal's Mall", cd: 150, give: { s: 2, k: 1 }, text: 'You walked a lap of the food court and found a coupon on the floor.' },
    shoneys: { at: 'shoneys', any: true, name: "Eat at Shoney's", cd: 150, heal: 1, give: { s: 1 }, text: "The breakfast bar at Shoney's. Rick says it's the best restaurant on Earth, and for once he's not being sarcastic." },
    needful: { at: 'needful', any: true, name: 'Buy a cursed antique', cd: 240, give: { m: 2 }, text: 'Mr. Needful sold you exactly what you wanted. There is a catch. You will find out what it is.' },
    therapy: { at: 'wong', any: true, name: 'Family therapy with Dr. Wong', cd: 200, heal: 1, give: { m: 1 }, text: 'Dr. Wong listened. You talked about the pickle thing. It helped, annoyingly.' },
    watchtv: { at: 'tvstore', any: true, name: 'Watch the TVs in the window', cd: 90, give: { s: 1 }, text: 'Regular Earth TV: the news, a cooking show and an ad for a mattress. Nothing weird at all.' },
    fixtv:   { at: 'tvstore', any: true, onlyFor: ['genius'], name: "\"Fix\" the TVs", cd: 300, give: { c: 2 }, effect: 'fixtv', text: 'A little crystallised Xanthenite in every box. Now they get every channel in the multiverse. Two Brothers is on.' },
    oval:    { at: 'whitehouse', any: true, name: 'See the President in the Oval Office', cd: 300, give: { k: 4 }, text: 'President Curtis needs a favour and would like you to know he does not need anyone. Also, no selfies.' },
    tunnels: { at: 'whitehouse', any: true, name: 'Go down into the Kennedy tunnels', cd: 400, give: { g: 3, k: 2 }, effect: 'tunnels', text: 'Something lives down here. It has noticed you.' },
    tour:    { at: 'monument', any: true, name: 'Ride up the Washington Monument', cd: 120, give: { s: 1 }, text: 'A very tall view of a very flat city. You spot three portals and a Secret Service agent pretending not to.' },
    congress:{ at: 'capitol', any: true, name: 'Sit in on Congress', cd: 200, give: { k: 2 }, text: 'Four hours of shouting. One bill passed. It was about portals, and it was confusing.' },
    warroom: { at: 'pentagon', any: true, name: 'Sit in the war room', cd: 240, give: { p: 2, k: 1 }, text: 'Generals pointing at a big screen. The big screen is pointing at your house.' },
    festival:   { at: 'purgestage', any: true, name: 'Watch the Festival poetry', cd: 150, give: { s: 3 }, text: 'A farmer read a poem about murdering his neighbours. Everyone clapped. It was a really good poem.' },
    squanchit:  { at: 'squanchclub', any: true, name: 'Squanch at the party', cd: 150, heal: 1, give: { p: 3 }, text: 'You squanched. They squanched. Somebody squanched on the ceiling. Best party in the galaxy.' },
    tribute:    { at: 'gazorpthrone', any: true, name: 'Bring a tribute to the throne', cd: 200, give: { g: 3, s: 2 }, text: 'The Gazorpian matriarchs accepted your gift and did not eat you. A good day.' },
    slide:      { at: 'froopyslide', any: true, name: 'Go down the Big Froopy Slide', cd: 100, heal: 1, give: { f: 2 }, text: 'Wheeee! It is so soft at the bottom. You do not ask what it is made of.' },
    exchange:   { at: 'pizzacounter', any: true, name: 'Trade a pizza for a phone for a chair', cd: 150, give: { s: 2, p: 1 }, text: 'You traded a pizza for a phone, the phone for a chair, and sat on the chair. It complained.' },
    raidercar:  { at: 'raidergarage', any: true, name: 'Soup up a raider car', cd: 200, give: { s: 5 }, text: 'Spikes on the hood, a skull on the grille, flames on the exhaust. The raiders nodded. Respect.' },
    joinhive:   { at: 'unitycore', any: true, name: 'Join Unity for a minute', cd: 200, heal: 1, give: { c: 3 }, text: 'For one minute you were a whole planet. It was very peaceful, and a little bit creepy.' },
    paperwork:  { at: 'formsoffice', any: true, name: 'File interdimensional paperwork', cd: 180, give: { k: 4 }, text: 'Form 27-B/6, stamped in triplicate by a bug-headed clerk. You got a refund. Nobody gets a refund.' },
    gearprayer: { at: 'geartemple', any: true, name: 'Pray to the Great Gear', cd: 150, give: { s: 4 }, text: 'Clank clank. Clank. (You did not understand the sermon, but you liked the rhythm.)' },
    tubes:      { at: 'hamstertube', any: true, name: 'Run through the hamster tubes', cd: 100, give: { f: 2, g: 1 }, text: 'You came out of the other end a little sweaty and the hamsters cheered.' },
    storyride:  { at: 'storyengine', any: true, name: 'Ride the Story Train to the next act', cd: 200, give: { m: 1, p: 2 }, text: 'Act two: a twist you saw coming a mile away. The Story Lord was furious. Good.' },
    detox:      { at: 'detoxpod', any: true, name: 'Run the detox', cd: 200, heal: 1, give: { g: 3, c: 1 }, text: 'Everything toxic in you went somewhere. Somewhere is here. Do not look at the puddle.' },
    snakejazz:  { at: 'snakeclub', any: true, name: 'Listen to snake jazz', cd: 150, heal: 1, give: { g: 2, s: 1 }, text: 'Ssss-ss-ss-sssss. Ss-ss. You do not understand it, and that is the point.' },
    dinotalk:   { at: 'dinocouncil', any: true, name: 'Ask the Dinosaur Council for wisdom', cd: 240, give: { m: 1, c: 2 }, text: 'They explained universal healthcare, then gave you a seed "for later". They are very patient with mammals.' },
    giantcourt: { at: 'giantcastle', any: true, name: "Sit in on the giants' court", cd: 200, give: { k: 3, s: 3 }, text: 'The case: a tiny man pushed a giant down the stairs. The jury has questions. You kept your head down.' },
    nimbus:     { at: 'nimbuspalace', any: true, name: 'Get an audience with Mr. Nimbus', cd: 200, heal: 1, give: { c: 3 }, text: '"I control the sea. And the police." He let you leave with some crystals and your dignity, mostly.' },
    dreamtest:  { at: 'dreamschool', any: true, name: 'Take the test you never studied for', cd: 150, give: { p: 3 }, text: 'Every question is about a class you never took. You passed anyway. Dreams are like that.' },
    timerift:   { at: 'timerift', any: true, name: 'Stitch the time rift', cd: 240, give: { c: 3, m: 1 }, text: 'You held the two timelines together until they clicked. A Time Cop nodded at you. Once.' },
    schwifty:{ at: 'sonicstage', any: true, name: 'Get Schwifty for the Cromulons', cd: 300, give: { m: 2, k: 2 }, text: 'SHOW ME WHAT YOU GOT! You took off your pants and your panties and the giant heads in the sky approved.' },
    hangar:  { at: 'hangar51', any: true, name: 'Look inside Hangar 18', cd: 200, give: { c: 3 }, text: 'Weather balloons. Lots of weather balloons. One of them waved.' },
    tinker:  { at: 'garage', name: 'Tinker in the garage', cd: 120, give: { s: 3, c: 1 }, text: 'You built something, took it apart, and kept the good bits.' },
    school:  { at: 'school', name: 'Sit through class', cd: 150, give: { s: 2 }, text: 'Algebra. Again. You pocketed some scrap from shop class.' },
    surgery: { at: 'hospital', name: 'Operate on a horse', cd: 150, give: { s: 3, c: 1 }, heal: 1, text: 'The horse will live. Probably. It looked grateful.' },
    jobhunt: { at: 'office', name: 'Look for a job', cd: 120, give: { s: 1 }, text: 'They said they would call you. They will not call you.' },
    tv:      { at: 'smithtv', any: true, name: 'Watch interdimensional TV', cd: 90, heal: 1, give: {}, text: 'A show about a man who is also a ball. You feel restored.' },
    dinner:  { at: 'smithtable', name: 'Family dinner', cd: 180, heal: 1, give: { s: 2 }, text: 'Everyone argued. The mashed potatoes were good, though.' },
    fridge:  { at: 'smithkitchen', any: true, name: 'Raid the fridge', cd: 120, heal: 1, give: {}, text: 'Leftover lasagna, a jar of something Rick labelled DO NOT, and juice. You had the lasagna.' },
    rickbed: { at: 'rickroom', any: true, name: "Look under Rick's bed", cd: 240, give: { c: 2, s: 2 }, text: 'Crystals, a broken portal gun, and a shoebox marked "MEMORIES - DO NOT". You took the crystals.' },
    homework:{ at: 'mortyroom', any: true, name: "Do Morty's homework", cd: 180, give: { k: 2 }, text: 'Math. Morty had drawn a sad face in every margin. You got a B. Rick says B is for Barely.' },
    phone:   { at: 'summerroom', any: true, name: "Scroll on Summer's phone", cd: 150, give: { k: 1, p: 1 }, text: 'Forty-one notifications. Ethan is still a jerk. You liked a picture and made it worse.' },
    wine:    { at: 'masterroom', any: true, name: "Find Beth's wine (and Jerry's sudoku)", cd: 200, heal: 1, give: { s: 1 }, text: 'A bottle under the bed and a sudoku with every square filled in with the number 7.' },
    shower:  { at: 'bathroom', any: true, name: 'Take a shower', cd: 120, heal: 2, give: {}, text: 'Hot water, finally. Someone downstairs flushed. Cold water, finally.' },
    graves:  { at: 'graves', any: true, name: 'Visit the graves in the back yard', cd: 300, give: { c: 1, m: 1 }, text: 'Here lie the Rick and Morty of this world. The ones you replaced. You brought flowers, and stood there a while.' },
    garden:  { at: 'backyard', any: true, name: 'Do some gardening', cd: 150, heal: 1, give: { s: 1, f: 1 }, text: 'You weeded, you watered, and you did not dig too deep. Some things in this yard should stay buried.' },
    hug:     { at: 'home', name: 'Visit an old friend', cd: 120, heal: 1, give: { s: 2 }, text: 'They swear they have known you for years. It was lovely.' },
    forge:   { at: 'forge', name: 'Feed the forge', cd: 120, give: { g: 3 }, text: 'You fed it. It fed you back. Do not think about it.' },
    haggle:  { at: 'market', name: 'Haggle at the black market', cd: 120, give: { p: 2 }, text: 'You sold a "genuine" moon rock. It was a regular rock.' },
    dock:    { at: 'shipyard', name: 'Fix ships at the docks', cd: 120, give: { s: 2, p: 1 }, text: 'You hit an engine with a wrench until it worked.' },
    report:  { at: 'shipyard', name: 'File a patrol report', cd: 150, give: { p: 2, c: 1 }, text: 'Form 27-B, in triplicate. Your commander nodded once.' },
    shift:   { at: 'refinery', name: 'Work a refinery shift', cd: 120, give: { c: 3 }, text: 'Eight hours of crystal sorting in low gravity. Bouncy.' },
    patrol:  { at: 'aerie', name: 'Stand guard at the Aerie', cd: 120, give: { f: 3 }, text: 'Nothing attacked. You stood there magnificently anyway.' },
    chore:   { at: 'home', name: 'Help someone with a chore', cd: 90, give: { s: 2 }, heal: 1, text: 'Ooh, can do! The chore is done. You feel a deep urge to stop existing. It passes.' },
    party:   { at: 'market', name: 'Throw a party', cd: 150, give: { p: 2, s: 2 }, text: 'Everyone got squanched. Nobody remembers anything. Great party.' },
    council: { at: 'council', name: 'Attend a Council of Ricks meeting', cd: 180, give: { k: 4, s: 2 }, text: 'Twelve Ricks argued for an hour. Nothing was decided. You were paid in Schmeckles.' },
    daycare: { at: 'daycare', name: 'Drop by Morty Daycare', cd: 150, give: { k: 3 }, text: 'Hundreds of Mortys, one tiny slide. You helped. Kind of.' },
    // Things anyone can do, whoever they are.
    plumbus: { at: 'plumbus', any: true, name: 'Make a plumbus', cd: 150, give: { s: 3 }, text: 'Dinglebop, schleem, grumbo, fleeb. You made a plumbus. Everyone has one.' },
    mbox:    { at: 'mbox', any: true, name: 'Press the Meeseeks Box', cd: 120, give: {}, summon: true, text: 'I\'m Mr. Meeseeks! Look at me! He will help you for a while.' },
    battery: { at: 'battery', any: true, name: 'Check the microverse battery', cd: 150, give: { c: 2, s: 1 }, text: 'The tiny civilisation inside still thinks it invented the power. Car is charged.' },
    mindblower: { at: 'mindblowers', any: true, name: 'Watch a Mind Blower', cd: 120, heal: 1, give: { s: 1 }, text: 'A memory you asked to forget. Huh. That explains a lot.' },
    wine:    { at: 'winerack', any: true, name: 'Take a bottle', cd: 150, heal: 1, give: { p: 1 }, text: 'From the private stash. Do not tell Rick. Seriously.' },
    fetch:   { at: 'palace', any: true, name: 'Play fetch with the dogs', cd: 120, give: { s: 2, p: 1 }, text: 'You threw. They fetched. Then they made you fetch. Then they patted your head.' },
    roy:     { at: 'roy', any: true, name: 'Play Roy: A Life Well Lived', cd: 150, heal: 1, give: { k: 3 }, text: 'You lived 55 years as Roy. Carpet store, football, everything. Then you took off the helmet. Rough.' },
    ride:    { at: 'pancreas', any: true, name: 'Ride Pirates of the Pancreas', cd: 150, heal: 1, give: { g: 3 }, text: 'Yo-ho, yo-ho, through the digestive tract. Arrr.' },
    borrowgun: { at: 'workbench', any: true, notFor: ['genius'], name: "Borrow Rick's portal gun", cd: 600, give: {}, effect: 'borrowgun', text: "You took Rick's portal gun off the bench. Two charges. Do not tell him. Seriously." },
    gaze:    { at: 'curveedge', any: true, name: 'Look back at the Curve', cd: 300, give: { m: 1, c: 2 }, text: 'From out here the Curve is just a golden spiral of little lights. Every one of them thinks it is the centre of everything.' },
    fakedoor:{ at: 'fakedoors', any: true, name: 'Buy a real fake door', cd: 150, give: { k: 4 }, text: "You bought a real fake door. Don't get in there, it's fake. They gave you change." },
    tvdeal:  { at: 'antsjohnson', any: true, name: 'Haggle with Ants in my Eyes Johnson', cd: 150, give: { c: 2, s: 2 }, text: "He can't see the price tags. Or feel anything. You got a great deal on a microwave. Is it on fire? It is on fire." },
    makeplumbus: { at: 'plumbusline', any: true, name: 'Make a plumbus by hand', cd: 180, give: { g: 3, p: 1 }, text: 'Dinglebop, schleem, grumbo, fleeb, the blamphs rub it down... You made a plumbus. Everyone has one.' },
    stomp:   { at: 'gooble', any: true, name: 'Stomp on a gooble box', cd: 120, give: { c: 3, s: 1 }, text: 'You stomped. Power flowed. Somewhere, a car battery got a little stronger.' },
    harvest: { at: 'megatree', any: true, name: 'Harvest a Mega Seed', cd: 300, give: { m: 1 }, text: 'You got a Mega Seed. Do not ask where Rick usually keeps these.' },
    train:   { at: 'aerie', name: 'Train with the elders', cd: 180, give: { f: 2, s: 2 }, text: 'The elders said "again" forty times. You are stronger now.' },
  };

  // ---------- Recipes ----------
  // cat: gadget (used up), self, gun, ship (permanent upgrades, saved with your character).
  // at: the landmark where it must be built (null = anywhere). needs: an upgrade you must own first.
  MM.RECIPES = {
    grenade:  { cat: 'gadget', name: 'Gravity Grenade', cost: { s: 3 }, max: 5, desc: 'Throw it. Blows up props and launches people.' },
    turret:   { cat: 'gadget', name: 'Auto-Turret', cost: { s: 6, c: 1 }, max: 2, desc: 'A turret that shoots anyone near it for 45 s.' },
    shrink:   { cat: 'gadget', name: 'Shrink Ray Shot', cost: { s: 4, c: 2 }, max: 3, desc: 'One shot that shrinks the target to half size for 8 s.' },
    fluid:    { cat: 'gadget', name: 'Portal Fluid', cost: { c: 2 }, gun: true, desc: 'Refills one portal gun charge right away.' },
    timecrystal: { cat: 'gadget', name: 'Time Crystal', cost: { c: 5, m: 2 }, max: 1, desc: 'Press 5: freeze time around you for 4 s. Illegal for third-dimensional beings, so the Time Cops will come for you.' },
    freeze:   { cat: 'gadget', name: 'Freeze Ray Shot', cost: { s: 3, c: 2 }, max: 3, desc: 'Press 6: one shot that freezes whoever it hits solid for a few seconds.' },
    chalk:    { cat: 'gadget', name: 'Magic Chalk', cost: { s: 2, m: 1 }, max: 2, onlyFor: ['genius', 'evilmorty'], desc: 'Press 7: draw a door on the spot. Anywhere: it opens into Froopyland. In Froopyland: back out. Anyone can go through it, even Tommy.' },
    meeseeks: { cat: 'gadget', name: 'Meeseeks Box', cost: { k: 3, s: 1 }, max: 2, desc: 'Press it (4): a Mr. Meeseeks pops out and fights for you for 30 s.' },
    // Rick's own body upgrades (only Ricks know how): robot limbs and a built-in scanner.
    // Pickle Rick's rat suit, built from rat parts and scrap (in a sewer, anywhere really).
    ratsuit:   { cat: 'self', name: 'Rat Suit', cost: { g: 3, s: 4 }, onlyFor: ['picklerick'], desc: 'Rat legs, rat arms, wires and spite. Now you can do more than roll.' },
    cyberarm:  { cat: 'self', name: 'Cybernetic Arm', cost: { c: 6, s: 8, p: 3 }, at: 'garage', onlyFor: ['genius'], desc: 'A robot arm: +35% damage, and your punches and shots hit harder.' },
    cyberlegs: { cat: 'self', name: 'Cybernetic Legs', cost: { c: 6, s: 8, g: 2 }, at: 'garage', onlyFor: ['genius'], needs: 'cyberarm', desc: 'Robot legs: run 25% faster and jump 35% higher.' },
    scanner:   { cat: 'self', name: 'Scanner Implant', cost: { c: 4, p: 2 }, at: 'garage', onlyFor: ['genius'], desc: 'Press X to scan whatever you look at: what it is, how dangerous, what it is made of.' },
    megabrain: { cat: 'self', name: 'Mega Seed Smarts', cost: { m: 4, c: 2 }, at: 'garage', desc: 'Abilities recharge 30% faster and you hit 10% harder.' },
    cloak:    { cat: 'self', name: 'Citadel Cloak', cost: { k: 8, p: 3 }, at: 'council', desc: 'Monsters and turrets lose track of you 3 s after you stop fighting.' },
    armor1:   { cat: 'self', name: 'Bio-Armor I', cost: { g: 4, s: 4 }, at: 'forge', desc: '+25 max health. Grown, not built.' },
    armor2:   { cat: 'self', name: 'Bio-Armor II', cost: { g: 6, c: 3 }, at: 'forge', needs: 'armor1', desc: '+25 more max health.' },
    armor3:   { cat: 'self', name: 'Bio-Armor III', cost: { g: 8, c: 5, p: 4 }, at: 'forge', needs: 'armor2', desc: '+30 more max health.' },
    legs1:    { cat: 'self', name: 'Spring Legs', cost: { s: 5, c: 2 }, at: 'garage', desc: '15% faster and jump higher.' },
    legs2:    { cat: 'self', name: 'Crystal Tendons', cost: { c: 4, p: 3 }, at: 'refinery', needs: 'legs1', desc: 'Another 15% faster and jump higher.' },
    jetpack:  { cat: 'self', name: 'Jetpack', cost: { s: 6, p: 4, c: 2 }, at: 'shipyard', needs: 'legs1', desc: 'Hold Jump in the air to hover for a few seconds.' },
    wings:    { cat: 'self', name: 'Feather Wings', cost: { f: 10, g: 3 }, at: 'aerie', needs: 'jetpack', desc: 'Real wings. Fly like the bird people do.' },
    blaster1: { cat: 'self', name: 'Weapon Mod', cost: { s: 4, p: 3 }, at: 'market', desc: '+30% damage with your weapon.' },
    blaster2: { cat: 'self', name: 'Overcharged Core', cost: { p: 6, c: 4, g: 3 }, at: 'market', needs: 'blaster1', desc: '+40% more damage.' },
    gunbuild: { cat: 'gun', name: 'Build a Portal Gun', cost: { s: 10, c: 6, g: 4, p: 4, f: 2 }, at: 'garage', nogun: true, desc: 'Your very own portal gun (2 charges). Needs parts from every world.' },
    guncap1:  { cat: 'gun', name: 'Fluid Tank', cost: { c: 4, p: 2 }, at: 'refinery', gun: true, desc: '+1 portal charge.' },
    guncap2:  { cat: 'gun', name: 'Twin Tank', cost: { c: 8, p: 4, f: 2 }, at: 'refinery', gun: true, needs: 'guncap1', desc: '+1 more portal charge.' },
    curvebreaker: { cat: 'gun', name: 'Golden Portal Fluid', cost: { c: 10, f: 4, g: 4 }, at: 'garage', gun: true, needs: 'guncap1', desc: 'Gold portals punch through the Central Finite Curve to the worlds outside it.' },
    gunfast:  { cat: 'gun', name: 'Quick Mixer', cost: { g: 3, p: 3 }, at: 'market', gun: true, desc: 'Portal charges come back 35% faster.' },
    hull:     { cat: 'ship', name: 'Ship Hull', cost: { s: 15, c: 4 }, at: 'shipyard', desc: 'Your own flying saucer. Press B to board.' },
    engine:   { cat: 'ship', name: 'Turbo Engine', cost: { p: 6, g: 4 }, at: 'shipyard', needs: 'hull', desc: 'The ship flies 60% faster.' },
    lasers:   { cat: 'ship', name: 'Ship Lasers', cost: { s: 6, c: 4, p: 3 }, at: 'market', needs: 'hull', desc: 'Heavy lasers while you fly.' },
    drive:    { cat: 'ship', name: 'Dimension Drive', cost: { c: 6, g: 4, p: 6, f: 4 }, at: 'shipyard', needs: 'engine', desc: 'Fly your ship straight into any dimension.' },
    quantum:  { cat: 'ship', name: 'Quantum Drive', cost: { c: 12, g: 8, p: 12, f: 8 }, at: 'shipyard', needs: 'drive', desc: 'Enable light speed travel for instant interstellar jumps.' },
  };
  MM.RECIPE_IDS = Object.keys(MM.RECIPES);
  MM.GADGET_IDS = ['grenade', 'turret', 'shrink', 'meeseeks', 'timecrystal', 'freeze', 'chalk'];
  // Recipes everyone knows, whoever they are.
  MM.COMMON = ['meeseeks', 'megabrain'];
  MM.CATS = { gadget: 'Gadgets', self: 'You', gun: 'Portal gun', ship: 'Ship' };

  // ---------- Who you are ----------
  // Your archetype is your lore. It decides your stats, your daily life, what you
  // know how to build from the start, and the steps that let you break out of it.
  //   knows:  recipes you can build from the start ('*' = everything)
  //   start:  upgrades you already own
  //   steps:  your breakout path. Each goal is checked by the server; grants unlock recipes.
  //           goal types: use (a daily task n times), at (stand at a landmark), dims (visit n
  //           different dimensions), dim (visit one), craft, have (materials), kill (monsters,
  //           optionally of a type), ko (players), talk (to locals), smash (props), errand.
  MM.ARCHETYPES = {
    genius: {
      name: 'Rick', hp: 80, speed: 7, jump: 8.5, weapon: 'plasma', home: 'suburbia',
      temper: { fights: 'defend', chaos: 0.15 }, homes: ['suburbia', 'citadel'],
      portal: { charges: 3, recharge: 14 }, knows: '*', discount: 2 / 3,
      ability: { id: 'shield', name: 'Science Shield', cd: 16, dur: 4 },
      blurb: 'Smartest being in any dimension. Owns a portal gun, builds anything, but is fragile and has a terrible attitude.',
      perk: 'Knows every recipe and pays a third less. Portal gun with 3 charges that can leave the Central Finite Curve.',
      life: { normal: 'Grandpa Rick', breakout: 'Rickest Rick', daily: ['tinker', 'dinner', 'council'] },
      steps: [
        { name: 'Tinker time', desc: "Tinker in Rick's Garage once.", goal: { type: 'use', task: 'tinker', n: 1 } },
        { name: 'Field research', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 } },
        { name: 'Wheels', desc: 'Build a Ship Hull at the Bazaar Shipyard.', goal: { type: 'craft', r: 'hull' } },
        { name: 'Unstoppable', desc: 'Build the Dimension Drive.', goal: { type: 'craft', r: 'drive' }, title: true },
      ],
    },
    sidekick: {
      name: 'Morty', hp: 100, speed: 7.5, jump: 8.5, weapon: 'blaster', home: 'suburbia',
      temper: { fights: 'defend' }, homes: ['suburbia', 'citadel'],
      portal: { charges: 1, recharge: 35 }, knows: ['grenade', 'fluid', 'legs1', 'armor1'],
      ability: { id: 'sprint', name: 'Panic Sprint', cd: 11, dur: 3 },
      blurb: 'Dragged along on every adventure. Panics a lot, survives anyway.',
      perk: 'Dodges 20% of hits out of pure luck. Borrowed portal gun with 1 charge.',
      life: { normal: 'Regular Morty', breakout: 'Adventure Morty', daily: ['school', 'dinner', 'daycare'] },
      steps: [
        { name: 'Ugh, school', desc: 'Sit through class at Harry Herpson High.', goal: { type: 'use', task: 'school', n: 1 } },
        { name: 'Dragged along', desc: 'Visit 2 different dimensions.', goal: { type: 'dims', n: 2 }, grants: ['turret', 'blaster1'] },
        { name: 'Getting the hang of it', desc: 'Defeat 5 monsters.', goal: { type: 'kill', n: 5 }, grants: ['guncap1', 'gunfast', 'jetpack'] },
        { name: 'Own two feet', desc: "Build Spring Legs at Rick's Garage.", goal: { type: 'craft', r: 'legs1' }, grants: ['hull', 'shrink', 'armor2'] },
        { name: 'Adventure Morty', desc: 'Build your own Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'lasers', 'drive', 'guncap2', 'legs2', 'blaster2'], title: true },
      ],
    },
    teen: {
      name: 'Summer', hp: 90, speed: 7.8, jump: 9, weapon: 'toy', home: 'suburbia',
      temper: { fights: 'defend' }, homes: ['suburbia'],
      portal: null, knows: ['grenade', 'legs1'],
      ability: { id: 'flash', name: 'Selfie Flash', cd: 12 },
      blurb: 'Stuck in high school while the family goes on adventures. Bored, sharp, and secretly the most capable one.',
      perk: 'Daily tasks pay double. Can become a Space Teen with her own portal gun and ship.',
      life: { normal: 'Regular Summer', breakout: 'Space Summer', daily: ['school', 'dinner'] },
      steps: [
        { name: 'School is a prison', desc: 'Sit through class at Harry Herpson High.', goal: { type: 'use', task: 'school', n: 1 } },
        { name: 'Sneak into the lab', desc: "Go into Rick's Garage.", goal: { type: 'at', at: 'garage' }, grants: ['blaster1', 'armor1'] },
        { name: 'Take the kiosk', desc: 'Visit 2 different dimensions.', goal: { type: 'dims', n: 2 }, grants: ['turret', 'shrink'] },
        { name: 'Hold your own', desc: 'Defeat 5 monsters.', goal: { type: 'kill', n: 5 }, grants: ['jetpack', 'hull'] },
        { name: 'Collect the parts', desc: 'Carry 3 Meat Goo, 3 Neon Plasma and 3 Moon Crystals.', goal: { type: 'have', mats: { g: 3, p: 3, c: 3 } }, grants: ['gunbuild'] },
        { name: 'Space Summer', desc: "Build your own portal gun at Rick's Garage.", goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'gunfast', 'fluid', 'engine', 'lasers', 'drive', 'legs2', 'armor2', 'blaster2'], title: true },
      ],
    },
    surgeon: {
      name: 'Beth', hp: 100, speed: 7, jump: 8.5, weapon: 'scalpel', home: 'suburbia',
      temper: { fights: 'defend' }, homes: ['suburbia'],
      portal: null, knows: ['grenade', 'armor1', 'armor2', 'legs1'], selfDiscount: 0.5,
      ability: { id: 'patch', name: 'Field Surgery', cd: 14 },
      blurb: 'A brilliant surgeon (of horses) who wonders what life could have been. She could still go find out.',
      perk: 'Upgrades to yourself cost half. Field Surgery heals you and everyone nearby.',
      life: { normal: 'Horse Surgeon Beth', breakout: 'Space Beth', daily: ['surgery', 'dinner'] },
      steps: [
        { name: 'Another day, another horse', desc: 'Operate on a horse twice.', goal: { type: 'use', task: 'surgery', n: 2 }, grants: ['blaster1'] },
        { name: 'Alien anatomy', desc: 'Visit Cronenberg World.', goal: { type: 'dim', dim: 'meatlands' }, grants: ['armor3'] },
        { name: 'Scalpel work', desc: 'Defeat 3 Meat Blobs.', goal: { type: 'kill', npc: 'meatblob', n: 3 }, grants: ['hull', 'jetpack'] },
        { name: 'Space Beth', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'lasers', 'drive', 'gunbuild', 'guncap1', 'fluid', 'blaster2', 'legs2'], title: true },
      ],
    },
    joe: {
      name: 'Jerry', hp: 100, speed: 6.5, jump: 7.5, weapon: 'toy', home: 'suburbia',
      temper: { fights: 'never' }, homes: ['suburbia'],
      portal: null, knows: ['grenade'],
      ability: { id: 'sob', name: 'Sob Story', cd: 18, dur: 3 },
      blurb: 'Completely normal. No portal gun, no powers, no job. Breaking out of this life is possible, but it is a long road.',
      perk: 'So unremarkable that monsters and turrets ignore him.',
      life: { normal: 'Unemployed Jerry', breakout: 'Adventure Jerry', daily: ['jobhunt', 'tv'] },
      steps: [
        { name: 'Keep looking', desc: 'Look for a job 3 times.', goal: { type: 'use', task: 'jobhunt', n: 3 }, grants: ['legs1'] },
        { name: 'Out of the house', desc: 'Visit 3 different dimensions (try the kiosk).', goal: { type: 'dims', n: 3 }, grants: ['armor1'] },
        { name: 'Not so useless', desc: 'Defeat 10 monsters.', goal: { type: 'kill', n: 10 }, grants: ['blaster1', 'turret'] },
        { name: 'Saving up', desc: 'Carry 30 scrap.', goal: { type: 'have', mats: { s: 30 } }, grants: ['hull'] },
        { name: 'Mid-life crisis', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'jetpack'] },
        { name: 'Wreck something', desc: 'Smash 40 props.', goal: { type: 'smash', n: 40 }, grants: ['gunbuild'] },
        { name: 'Adventure Jerry', desc: 'Build your own portal gun.', goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'fluid', 'lasers', 'drive', 'armor2'], title: true },
      ],
    },
    birdfolk: {
      name: 'Birdperson', hp: 140, speed: 8, jump: 9, weapon: 'talon', fly: true, home: 'featherhold',
      temper: { fights: 'defend', hunts: ['trooper'] }, homes: ['featherhold'],
      portal: null, knows: ['armor1', 'armor2', 'armor3', 'blaster1', 'blaster2'],
      ability: { id: 'dive', name: 'Dive Strike', cd: 8 },
      blurb: 'Proud warrior of the bird people, with a life, a people and duties of his own on Bird World.',
      perk: 'Flies (hold Jump). Strong talons. Does not do gadgets.',
      life: { normal: 'Aerie Warrior', breakout: 'Hero of Many Skies', daily: ['patrol', 'train'] },
      steps: [
        { name: 'Duty', desc: 'Stand guard at the Aerie twice.', goal: { type: 'use', task: 'patrol', n: 2 } },
        { name: 'The elders speak', desc: 'Train with the elders.', goal: { type: 'use', task: 'train', n: 1 } },
        { name: 'Serpent slayer', desc: 'Defeat 5 Sky Serpents.', goal: { type: 'kill', npc: 'skyserpent', n: 5 }, grants: ['grenade'] },
        { name: 'Beyond the sky', desc: 'Visit all 5 dimensions.', goal: { type: 'dims', n: 5 }, grants: ['gunbuild', 'guncap1', 'fluid'] },
        { name: 'Hero of Many Skies', desc: 'Defeat 3 players in honourable combat.', goal: { type: 'ko', n: 3 }, title: true },
      ],
    },
    beanling: {
      name: 'Mr. Poopybutthole', hp: 70, speed: 8.5, jump: 9, weapon: 'slap', home: 'suburbia',
      temper: { fights: 'never' }, homes: ['suburbia'],
      portal: null, knows: ['grenade', 'legs1'],
      ability: { id: 'cheer', name: 'Cheer Up', cd: 13 },
      blurb: 'Tall, polite and always happy to see you. Nobody remembers meeting one, but everyone loves them.',
      perk: 'Heals everyone nearby. Whoever takes one down feels awful (slowed 10 s).',
      life: { normal: 'Family Friend', breakout: 'Mr. Poopybutthole of Many Worlds', daily: ['hug', 'tv'] },
      steps: [
        { name: 'Ooh, friends', desc: 'Chat with 8 locals.', goal: { type: 'talk', n: 8 }, grants: ['armor1'] },
        { name: 'Helping out', desc: 'Finish 2 errands for locals.', goal: { type: 'errand', n: 2 }, grants: ['jetpack', 'shrink'] },
        { name: 'New neighbours', desc: 'Visit 4 different dimensions.', goal: { type: 'dims', n: 4 }, grants: ['gunbuild'] },
        { name: 'Ooh-wee, the multiverse!', desc: 'Build your own portal gun.', goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'fluid', 'hull', 'engine'], title: true },
      ],
    },
    mutant: {
      name: 'Cronenberg', hp: 200, speed: 5.5, jump: 7, weapon: 'punch', home: 'meatlands',
      temper: { fights: 'often' }, homes: ['meatlands'],
      portal: null, knows: ['armor1', 'armor2', 'armor3'],
      ability: { id: 'slam', name: 'Body Slam', cd: 9 },
      blurb: 'A lab accident made flesh. Huge, slow, and very hard to kill.',
      perk: 'Regenerates 3 health per second. Body Slam knocks everyone back.',
      life: { normal: 'Lurking Cronenberg', breakout: 'Apex Cronenberg', daily: ['forge'] },
      steps: [
        { name: 'Hungry', desc: 'Smash 30 props.', goal: { type: 'smash', n: 30 }, grants: ['legs1'] },
        { name: 'Out of the pit', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 }, grants: ['blaster1', 'jetpack'] },
        { name: 'Apex Cronenberg', desc: 'Defeat 5 players.', goal: { type: 'ko', n: 5 }, grants: ['blaster2', 'legs2'], title: true },
      ],
    },
    trooper: {
      name: 'Federation Officer', hp: 120, speed: 7, jump: 8.5, weapon: 'rifle', fly: true, home: 'federation',   // Gromflomites fly on their insect wings
      temper: { fights: 'defend', hunts: ['genius', 'birdfolk', 'squanchy'] }, homes: ['federation'],
      portal: null, knows: ['grenade', 'turret', 'blaster1', 'engine', 'lasers'], start: ['hull'],
      ability: { id: 'cuff', name: 'Stun Cuffs', cd: 12 },
      blurb: 'Enforcer of an interplanetary bureaucracy. Comes with a patrol ship and a lot of paperwork.',
      perk: 'Flies on insect wings (hold Space) and starts with a ship (B to board). Stun Cuffs freeze whoever is in front of you.',
      life: { normal: 'Loyal Officer', breakout: 'Rogue Officer', daily: ['report', 'dock'] },
      steps: [
        { name: 'Paperwork', desc: 'File a patrol report at the Bazaar Shipyard.', goal: { type: 'use', task: 'report', n: 1 } },
        { name: 'Questioning', desc: 'Question 5 locals (talk to them).', goal: { type: 'talk', n: 5 }, grants: ['armor1', 'legs1'] },
        { name: 'Law and order', desc: 'Defeat 3 players.', goal: { type: 'ko', n: 3 }, grants: ['blaster2', 'armor2'] },
        { name: 'Rogue Officer', desc: 'Visit all 5 dimensions.', goal: { type: 'dims', n: 5 }, grants: ['drive', 'gunbuild', 'guncap1'], title: true },
      ],
    },
    hive: {
      name: 'Unity', hp: 90, speed: 7, jump: 8.5, weapon: 'slap', home: 'unityworld',
      temper: { fights: 'never' }, homes: ['unityworld'],
      portal: null, knows: ['grenade', 'shrink'],
      ability: { id: 'assimilate', name: 'Assimilate', cd: 20 },
      blurb: 'One mind in many bodies. Charming, lonely, and very good at making friends do things.',
      perk: 'Assimilate turns nearby locals into followers that fight for you.',
      life: { normal: 'Small Unity', breakout: 'Planetary Unity', daily: ['shift', 'haggle'] },
      steps: [
        { name: 'Join us', desc: 'Talk to 8 locals.', goal: { type: 'talk', n: 8 }, grants: ['armor1', 'legs1'] },
        { name: 'Expansion', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 }, grants: ['hull', 'jetpack'] },
        { name: 'Planetary Unity', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'drive', 'lasers', 'gunbuild'], title: true },
      ],
    },
    meeseeks: {
      name: 'Mr. Meeseeks', hp: 60, speed: 8, jump: 10, weapon: 'slap', home: 'suburbia',
      temper: { fights: 'defend' }, homes: ['suburbia'],
      portal: null, knows: ['grenade', 'legs1'],
      ability: { id: 'summon', name: 'Look at me!', cd: 22 },
      blurb: 'Pops into existence to help with one task, then really, really wants to stop existing. Very cheerful about it.',
      perk: 'Summons two more Meeseeks who fight for you for 20 s.',
      life: { normal: 'Task Meeseeks', breakout: 'Meeseeks Who Stayed', daily: ['chore', 'tv'] },
      steps: [
        { name: 'Ooh, can do!', desc: 'Help someone with a chore at the Smith House.', goal: { type: 'use', task: 'chore', n: 1 } },
        { name: 'Find a task', desc: 'Talk to 6 locals.', goal: { type: 'talk', n: 6 }, grants: ['armor1', 'jetpack'] },
        { name: 'Task complete', desc: 'Finish 2 errands for locals.', goal: { type: 'errand', n: 2 }, grants: ['blaster1', 'gunbuild'] },
        { name: 'Meeseeks Who Stayed', desc: 'Visit 4 different dimensions.', goal: { type: 'dims', n: 4 }, grants: ['guncap1', 'fluid', 'hull'], title: true },
      ],
    },
    squanchy: {
      name: 'Squanchy', hp: 110, speed: 8, jump: 10, weapon: 'claws', home: 'squanch',
      temper: { fights: 'defend', hunts: ['trooper'], chaos: 0.1 }, homes: ['squanch'],
      portal: null, knows: ['grenade', 'turret', 'blaster1'],
      ability: { id: 'rage', name: 'Squanch Out', cd: 15 },
      blurb: 'Cat-like party animal and freedom fighter. Squanches when he is happy, squanches when he is angry.',
      perk: 'Squanch Out: becomes huge and tough for 5 s (shield and speed).',
      life: { normal: 'Party Squanchy', breakout: 'Freedom Fighter', daily: ['party', 'haggle'] },
      steps: [
        { name: 'Party time', desc: 'Throw a party at the Black Market.', goal: { type: 'use', task: 'party', n: 1 } },
        { name: 'Old friends', desc: 'Visit Earth C-137.', goal: { type: 'dim', dim: 'suburbia' }, grants: ['armor1', 'legs1'] },
        { name: 'The resistance', desc: 'Defeat 5 monsters.', goal: { type: 'kill', n: 5 }, grants: ['hull', 'jetpack', 'armor2'] },
        { name: 'Freedom Fighter', desc: 'Defeat 3 players.', goal: { type: 'ko', n: 3 }, grants: ['engine', 'lasers', 'gunbuild'], title: true },
      ],
    },
    // Tommy Lipnip, Beth's childhood friend, left in Froopyland as a kid. He survived, and became
    // its king. He can only leave through a magic chalk door, which only a Rick (or Evil Morty)
    // can draw.
    tommy: {
      name: 'King Tommy', hp: 150, speed: 6.5, jump: 9, weapon: 'punch', home: 'froopy', homes: ['froopy'],
      temper: { fights: 'defend', hunts: [], chaos: 0.1 },
      portal: null, knows: ['grenade', 'legs1', 'armor1'],
      ability: { id: 'rage', name: 'Froopy Fury', cd: 16 },
      blurb: 'Beth\'s childhood friend, lost in Froopyland since he was a kid. He survived. He is the king now. Do not ask what he ate.',
      perk: 'Froopy Fury: tough and fast for a few seconds. Stuck in Froopyland until someone draws a magic chalk door.',
      life: { normal: 'King of Froopyland', breakout: 'Free at last', daily: ['slide'] },
      steps: [
        { name: 'The king', desc: 'Go down the Big Froopy Slide.', goal: { type: 'use', task: 'slide', n: 1 }, grants: ['armor2'] },
        { name: 'The way out', desc: 'Leave Froopyland through a magic chalk door.', goal: { type: 'dim', dim: 'suburbia' }, grants: ['legs2', 'hull'], title: true },
      ],
    },
    evilmorty: {
      name: 'Evil Morty', hp: 100, speed: 7.5, jump: 8.5, weapon: 'blaster', home: 'suburbia',
      temper: { fights: 'defend', hunts: ['genius'] }, homes: ['citadel'],
      // As inventive as any Rick: he can build whatever a Rick can (but not a Rick's own body).
      portal: { charges: 1, recharge: 30 }, knows: '*',
      ability: { id: 'scheme', name: 'Vanish', cd: 18, dur: 5 },
      blurb: 'A Morty with an eye patch and a plan. Quiet, patient, and always three steps ahead.',
      perk: 'Vanish: monsters and turrets lose track of you for 5 s. Starts with a golden portal gun that can leave the Central Finite Curve.',
      life: { normal: 'Quiet Morty', breakout: 'President Morty', daily: ['school', 'daycare', 'council'] },
      steps: [
        { name: 'Blend in', desc: 'Sit through class at Harry Herpson High.', goal: { type: 'use', task: 'school', n: 1 } },
        { name: 'Gather support', desc: 'Talk to 10 locals.', goal: { type: 'talk', n: 10 }, grants: ['armor1', 'blaster1', 'turret'] },
        { name: 'Remove rivals', desc: 'Defeat 5 players.', goal: { type: 'ko', n: 5 }, grants: ['hull', 'engine', 'guncap2', 'blaster2'] },
        { name: 'President Morty', desc: 'Build the Dimension Drive.', goal: { type: 'craft', r: 'drive' }, title: true },
      ],
    },
    picklerick: {
      name: 'Pickle Rick', hp: 60, speed: 6, jump: 11, weapon: 'slap', home: 'suburbia',
      temper: { fights: 'often', chaos: 0.3 }, homes: ['suburbia'],
      portal: null, knows: ['ratsuit', 'grenade', 'legs1', 'armor1', 'armor2', 'blaster1'], discount: 2 / 3,
      ability: { id: 'roll', name: 'Pickle Roll', cd: 8, dur: 2.5 },
      blurb: 'A genius who turned himself into a pickle to get out of family therapy. Tiny, green, and furious.',
      perk: 'A pickle can only roll. Build the Rat Suit (C, anywhere, from goo and scrap) for rat legs and arms, and then fight dirty. Builds a third cheaper.',
      life: { normal: 'Pickle on the Floor', breakout: 'Pickle Rick!', daily: ['tinker'] },
      steps: [
        { name: 'Rat parts', desc: 'Roll around, collect goo and scrap, and build the Rat Suit (C).', goal: { type: 'craft', r: 'ratsuit' }, grants: ['turret'] },
        { name: 'Roll for it', desc: 'Smash 15 props.', goal: { type: 'smash', n: 15 }, grants: ['jetpack', 'blaster2'] },
        { name: 'Pickle Rick!', desc: 'Defeat 10 monsters.', goal: { type: 'kill', n: 10 }, grants: ['gunbuild', 'guncap1', 'fluid', 'hull', 'engine', 'lasers', 'drive'], title: true },
      ],
    },
  };
  MM.ARCH_IDS = Object.keys(MM.ARCHETYPES);

  // Weapons. Ranged ones fire a projectile the server simulates; melee hits instantly in front.
  MM.WEAPONS = {
    plasma:  { dmg: 12, cd: 0.25, speed: 70, range: 75, color: '#5dff8a' },
    blaster: { dmg: 9,  cd: 0.3,  speed: 60, range: 65, color: '#ffd84d' },
    rifle:   { dmg: 11, cd: 0.24, speed: 85, range: 85, color: '#ff5a5a' },
    toy:     { dmg: 5,  cd: 0.45, speed: 45, range: 45, color: '#ff8fd0' },
    lasers:  { dmg: 18, cd: 0.2,  speed: 95, range: 90, color: '#5ff8ff' },
    talon:   { dmg: 24, cd: 0.55, melee: 3.6 },
    scalpel: { dmg: 15, cd: 0.45, melee: 2.9 },
    slap:    { dmg: 7,  cd: 0.4,  melee: 2.8 },
    punch:   { dmg: 20, cd: 0.75, melee: 3.4, knock: 9 },
    claws:   { dmg: 16, cd: 0.4,  melee: 3.0 },
  };

  // ---------- Progress helpers (shared so the client shows exactly what the server allows) ----------
  // A character's saved progress: { up: {recipeId: 1}, step: index of the next step, grants: [...] }
  MM.newProgress = function (arch) {
    const A = MM.ARCHETYPES[arch];
    const up = {};
    for (const r of A.start || []) up[r] = 1;
    return { up, step: 0, grants: [], cnt: { use: {}, dims: [], crafted: [], kill: {}, kills: 0, ko: 0, talk: 0, smash: 0, errand: 0 }, errands: [], tasks: {}, inv: { s: 0, c: 0, g: 0, p: 0, f: 0, m: 0, k: 0 }, found: [], chaos: 0 };
  };

  MM.hasGun = (arch, up) => !!(MM.ARCHETYPES[arch].portal || up.gunbuild);

  // A Pickle Rick without his rat suit is a pickle: he can roll, talk, and build the suit.
  MM.helpless = (arch, up) => arch === 'picklerick' && !(up && up.ratsuit);
  MM.HELPLESS_TEXT = "You're a pickle. You can only roll around. Build the Rat Suit (C) from goo and scrap.";
  // Can this character build this recipe at all (lore + path), ignoring cost and place?
  // Returns null if yes, or the reason why not.
  MM.canKnow = function (arch, prog, id) {
    const A = MM.ARCHETYPES[arch], R = MM.RECIPES[id];
    if (!R) return 'Unknown recipe';
    if (R.onlyFor && !R.onlyFor.includes(arch)) return 'Only ' + R.onlyFor.map(a => MM.ARCHETYPES[a].name).join(' or ') + ' knows how to build this.';
    if (A.knows !== '*' && !A.knows.includes(id) && !prog.grants.includes(id) && !MM.COMMON.includes(id)) return 'Not part of your life yet. Follow your path (J) to unlock it.';
    if (R.gun && !MM.hasGun(arch, prog.up)) return 'Needs a portal gun.';
    if (R.nogun && MM.hasGun(arch, prog.up)) return 'You already have a portal gun.';
    if (R.needs && !prog.up[R.needs]) return 'Build ' + MM.RECIPES[R.needs].name + ' first.';
    if (R.cat !== 'gadget' && prog.up[id]) return 'Already built.';
    return null;
  };

  MM.recipeCost = function (arch, id) {
    const A = MM.ARCHETYPES[arch], R = MM.RECIPES[id];
    let f = 1;
    if (A.discount) f *= A.discount;
    if (A.selfDiscount && R.cat === 'self') f *= A.selfDiscount;
    const out = {};
    for (const k in R.cost) out[k] = Math.ceil(R.cost[k] * f);
    return out;
  };

  // Everything your upgrades add up to.
  MM.statsOf = function (arch, up) {
    const A = MM.ARCHETYPES[arch];
    const s = {
      maxHp: A.hp + (up.armor1 ? 25 : 0) + (up.armor2 ? 25 : 0) + (up.armor3 ? 30 : 0),
      speed: A.speed * (up.legs1 ? 1.15 : 1) * (up.legs2 ? 1.15 : 1) * (up.cyberlegs ? 1.25 : 1),
      jump: A.jump * (up.legs1 ? 1.1 : 1) * (up.legs2 ? 1.1 : 1) * (up.cyberlegs ? 1.35 : 1),
      fly: A.fly || up.wings ? 'wings' : up.jetpack ? 'jet' : null,
      dmg: (up.blaster1 ? 1.3 : 1) * (up.blaster2 ? 1.4 : 1) * (up.megabrain ? 1.1 : 1) * (up.cyberarm ? 1.35 : 1),
      // Sprinting (Shift, or push the stick past its edge): a bit faster than walking, more
      // with better legs.
      sprint: 1.45 * (up.legs1 ? 1.06 : 1) * (up.legs2 ? 1.06 : 1) * (up.cyberlegs ? 1.15 : 1),
      scanner: !!up.scanner,
      cdMult: up.megabrain ? 0.7 : 1,
      cloak: !!up.cloak,
      gun: null, ship: null,
    };
    s.flyTime = s.fly === 'wings' ? 6 : s.fly === 'jet' ? 2.5 : 0;
    if (MM.hasGun(arch, up)) {
      const base = A.portal || { charges: 2, recharge: 25 };
      s.gun = { charges: base.charges + (up.guncap1 ? 1 : 0) + (up.guncap2 ? 1 : 0), recharge: base.recharge * (up.gunfast ? 0.65 : 1) };
    }
    if (up.hull) {
      let baseSpeed = up.engine ? 30 : 19;
      // Quantum drive provides massive speed boost for light speed travel
      if (up.quantum) {
        baseSpeed = 1000; // Light speed travel speed
      }
      s.ship = { speed: baseSpeed, lasers: !!up.lasers, engine: !!up.engine, drive: !!up.drive, quantum: !!up.quantum };
    }
    // Rick helped build the Curve and can step outside it; Evil Morty broke out of it. Anyone
    // else needs the golden fluid.
    if (s.gun) s.gun.gold = arch === 'genius' || arch === 'evilmorty' || !!up.curvebreaker;
    return s;
  };

  // How far along a step's goal is: { now, need }.
  MM.stepProgress = function (prog, goal, inv) {
    const c = prog.cnt;
    switch (goal.type) {
      case 'use': return { now: Math.min(goal.n, c.use[goal.task] || 0), need: goal.n };
      case 'at': return { now: (c.at || []).includes(goal.at) ? 1 : 0, need: 1 };
      case 'dims': return { now: Math.min(goal.n, c.dims.length), need: goal.n };
      case 'dim': return { now: c.dims.includes(goal.dim) ? 1 : 0, need: 1 };
      case 'craft': return { now: c.crafted.includes(goal.r) || prog.up[goal.r] ? 1 : 0, need: 1 };
      case 'have': {
        let now = 0, need = 0;
        for (const k in goal.mats) { need += goal.mats[k]; now += Math.min(goal.mats[k], (inv || prog.inv)[k] || 0); }
        return { now, need };
      }
      case 'kill': return { now: Math.min(goal.n, goal.npc ? (c.kill[goal.npc] || 0) : c.kills), need: goal.n };
      case 'ko': return { now: Math.min(goal.n, c.ko), need: goal.n };
      case 'talk': return { now: Math.min(goal.n, c.talk), need: goal.n };
      case 'smash': return { now: Math.min(goal.n, c.smash), need: goal.n };
      case 'errand': return { now: Math.min(goal.n, c.errand), need: goal.n };
    }
    return { now: 0, need: 1 };
  };

  MM.PORTAL_TTL = 12;
  MM.PORTAL_RADIUS = 1.6;
  MM.KIOSK_RADIUS = 5;
  MM.PICKUP_RADIUS = 2;

  // How each body type looks to the character creator. Every option is an enum the
  // server checks, so nobody can send anything odd to other players.
  MM.LOOK = {
    species: ['human', 'alien', 'birdfolk', 'robot', 'beanling', 'blob', 'cat', 'insect', 'pickle', 'teddy', 'shrimp'],
    hair: ['rick', 'morty', 'bob', 'spiky', 'tuft', 'bowl', 'mohawk', 'afro', 'ponytail', 'slick', 'bald'],
    brow: ['uni', 'normal', 'angry', 'none'],
    eyes: ['normal', 'tired', 'wide', 'sleepy', 'dots', 'cyclops', 'three', 'visor'],
    mouth: ['flat', 'grin', 'frown', 'open', 'drool'],
    face: ['round', 'long', 'wide'],
    top: ['labcoat', 'tshirt', 'tank', 'polo', 'sweater', 'armor', 'vest', 'none'],
    acc: ['none', 'goggles', 'antennae', 'tophat', 'headband', 'eyepatch', 'halo', 'crown', 'cap'],
    // How your portals look: Rick's classic green swirl, a hard ring, spiral arms, or static.
    portalStyle: ['swirl', 'ring', 'spiral', 'storm'],
    nums: { height: [0.8, 1.3], width: [0.75, 1.35], head: [0.8, 1.45] },
    colors: ['skin', 'hairColor', 'topColor', 'shirtColor', 'pantsColor', 'shoeColor', 'accColor', 'portalColor', 'portalColor2'],
  };

  MM.defaultLook = function () {
    return {
      species: 'human', hair: 'rick', brow: 'uni', eyes: 'tired', mouth: 'flat', face: 'long', top: 'labcoat', acc: 'none',
      height: 1.15, width: 0.95, head: 1.1,
      skin: '#f2d2b6', hairColor: '#b9d4e0', topColor: '#f4f6f8', shirtColor: '#7fb2d6', pantsColor: '#6b4f2c',
      shoeColor: '#3a2a1a', accColor: '#444444', portalColor: '#39ff6a', portalColor2: '', portalStyle: 'swirl',
    };
  };

  // How each character looks in the show's main universe. Picking a character starts
  // from this; everything can still be changed ("any version from any universe").
  MM.CANON = {
    genius: { species: 'human', hair: 'rick', brow: 'uni', eyes: 'tired', mouth: 'drool', face: 'long', top: 'labcoat', acc: 'none', height: 1.3, width: 0.8, head: 0.95, skin: '#ddd7c9', hairColor: '#6fd2df', topColor: '#f2f5f7', shirtColor: '#74d0dd', pantsColor: '#686530', shoeColor: '#2b393f', accColor: '#444444', portalColor: '#39ff6a' },
    sidekick: { species: 'human', hair: 'morty', brow: 'normal', eyes: 'wide', mouth: 'frown', face: 'round', top: 'tshirt', acc: 'none', height: 0.92, width: 0.95, head: 1.3, skin: '#fcd9bd', hairColor: '#6b3f1f', topColor: '#f8e04a', shirtColor: '#f8e04a', pantsColor: '#2e5fa8', shoeColor: '#f4f6f8', accColor: '#444444', portalColor: '#39ff6a' },
    teen: { species: 'human', hair: 'ponytail', brow: 'normal', eyes: 'normal', mouth: 'flat', face: 'round', top: 'tank', acc: 'none', height: 1.12, width: 0.8, head: 0.98, skin: '#fcd9bd', hairColor: '#f07a3c', topColor: '#f68fb8', shirtColor: '#f68fb8', pantsColor: '#f6f6f2', shoeColor: '#f4f6f8', accColor: '#444444', portalColor: '#ff6fd0' },
    surgeon: { species: 'human', hair: 'bob', brow: 'normal', eyes: 'normal', mouth: 'flat', face: 'round', top: 'sweater', acc: 'none', height: 1.14, width: 0.82, head: 0.96, skin: '#fcd9bd', hairColor: '#f8dd8a', topColor: '#c8273a', shirtColor: '#c8273a', pantsColor: '#34416e', shoeColor: '#4a2e1c', accColor: '#444444', portalColor: '#5ff8ff' },
    joe: { species: 'human', hair: 'slick', brow: 'normal', eyes: 'normal', mouth: 'flat', face: 'long', top: 'polo', acc: 'none', height: 1.2, width: 0.9, head: 0.96, skin: '#f6d6bc', hairColor: '#5a3a22', topColor: '#5c9a4a', shirtColor: '#4a8a3c', pantsColor: '#b8a888', shoeColor: '#4a2e1c', accColor: '#444444', portalColor: '#39ff6a' },
    birdfolk: { species: 'birdfolk', hair: 'mohawk', brow: 'angry', eyes: 'normal', mouth: 'flat', face: 'long', top: 'armor', acc: 'none', height: 1.25, width: 1.0, head: 1.0, skin: '#e8c49a', hairColor: '#b8642e', topColor: '#6b4a2b', shirtColor: '#c9a77a', pantsColor: '#5a3a20', shoeColor: '#2a2a2a', accColor: '#444444', portalColor: '#ffd84d' },
    beanling: { species: 'beanling', hair: 'bald', brow: 'none', eyes: 'wide', mouth: 'grin', face: 'round', top: 'none', acc: 'tophat', height: 1.15, width: 1.0, head: 1.0, skin: '#ffd447', hairColor: '#2a2a2a', topColor: '#ffd447', shirtColor: '#ffd447', pantsColor: '#ffd447', shoeColor: '#ffd447', accColor: '#2a2a2a', portalColor: '#39ff6a' },
    mutant: { species: 'blob', hair: 'bald', brow: 'none', eyes: 'three', mouth: 'open', face: 'wide', top: 'none', acc: 'none', height: 1.15, width: 1.2, head: 0.9, skin: '#e07a85', hairColor: '#7a2a3a', topColor: '#e07a85', shirtColor: '#e07a85', pantsColor: '#a0303b', shoeColor: '#6b4630', accColor: '#444444', portalColor: '#ff5a3a' },
    trooper: { species: 'insect', hair: 'bald', brow: 'none', eyes: 'normal', mouth: 'flat', face: 'long', top: 'armor', acc: 'none', height: 1.18, width: 1.0, head: 1.0, skin: '#6f8a5a', hairColor: '#2a2a2a', topColor: '#d8e4ea', shirtColor: '#d8e4ea', pantsColor: '#8aa2b4', shoeColor: '#2a3440', accColor: '#e2483d', portalColor: '#5ff8ff' },
    hive: { species: 'human', hair: 'bob', brow: 'normal', eyes: 'sleepy', mouth: 'grin', face: 'round', top: 'sweater', acc: 'none', height: 1.12, width: 0.82, head: 0.96, skin: '#f6dcc4', hairColor: '#f2e2a0', topColor: '#5fd6b0', shirtColor: '#5fd6b0', pantsColor: '#2a2a2a', shoeColor: '#2a2a2a', accColor: '#444444', portalColor: '#c49bff' },
    meeseeks: { species: 'human', hair: 'bald', brow: 'none', eyes: 'dots', mouth: 'open', face: 'long', top: 'none', acc: 'none', height: 1.3, width: 0.78, head: 1.2, skin: '#6ec4f0', hairColor: '#6ec4f0', topColor: '#6ec4f0', shirtColor: '#6ec4f0', pantsColor: '#6ec4f0', shoeColor: '#6ec4f0', accColor: '#444444', portalColor: '#5ff8ff' },
    squanchy: { species: 'cat', hair: 'bald', brow: 'none', eyes: 'wide', mouth: 'grin', face: 'round', top: 'none', acc: 'none', height: 1.0, width: 1.05, head: 1.2, skin: '#c98a4a', hairColor: '#8a5a2a', topColor: '#c98a4a', shirtColor: '#c98a4a', pantsColor: '#c98a4a', shoeColor: '#8a5a2a', accColor: '#444444', portalColor: '#ffd84d' },
    evilmorty: { species: 'human', hair: 'morty', brow: 'angry', eyes: 'normal', mouth: 'flat', face: 'round', top: 'tshirt', acc: 'eyepatch', height: 0.92, width: 0.95, head: 1.3, skin: '#fcd9bd', hairColor: '#6b3f1f', topColor: '#f8e04a', shirtColor: '#f8e04a', pantsColor: '#2e5fa8', shoeColor: '#f4f6f8', accColor: '#111111', portalColor: '#ffd84d' },
    tommy: { species: 'human', hair: 'afro', brow: 'normal', eyes: 'wide', mouth: 'grin', face: 'wide', top: 'vest', acc: 'crown', height: 1.25, width: 1.3, head: 1.05, skin: '#f2c8a8', hairColor: '#6a4424', topColor: '#7a5a3a', shirtColor: '#ff8fc8', pantsColor: '#5a4a6a', shoeColor: '#3a2a1a', accColor: '#ffd84d', portalColor: '#f4f4f0' },
    picklerick: { species: 'pickle', hair: 'bald', brow: 'uni', eyes: 'tired', mouth: 'grin', face: 'long', top: 'none', acc: 'none', height: 0.9, width: 0.9, head: 1.0, skin: '#7cbf3a', hairColor: '#4a7a22', topColor: '#7cbf3a', shirtColor: '#7cbf3a', pantsColor: '#7cbf3a', shoeColor: '#4a7a22', accColor: '#444444', portalColor: '#39ff6a' },
  };
  MM.canonLook = arch => Object.assign(MM.defaultLook(), MM.CANON[arch] || {});

  // An alternate-universe version: same person, different choices. rand() in [0, 1).
  MM.variantLook = function (arch, rand) {
    const r = rand || Math.random, L = MM.canonLook(arch);
    const col = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
    const pick = a => a[Math.floor(r() * a.length)];
    if (r() < 0.5) L.hairColor = col();
    if (r() < 0.5) L.topColor = col();
    if (r() < 0.35) L.pantsColor = col();
    if (r() < 0.3) L.acc = pick(['goggles', 'eyepatch', 'cap', 'headband', 'crown', 'halo', 'antennae', 'tophat']);
    if (r() < 0.2 && L.species === 'human') L.skin = pick(['#9ad66b', '#7ec8e3', '#c49bff', '#e0b08c', '#a8724f']);
    if (r() < 0.15) L.top = pick(['armor', 'vest', 'sweater', 'labcoat', 'tshirt']);
    if (r() < 0.15) L.mouth = pick(MM.LOOK.mouth);
    L.portalColor = col();
    return L;
  };

  // Turn whatever a client sent into a safe look: unknown fields dropped, enums and
  // colors checked, numbers clamped.
  MM.sanitizeLook = function (raw) {
    const out = MM.defaultLook();
    if (!raw || typeof raw !== 'object') return out;
    for (const k of ['species', 'hair', 'brow', 'eyes', 'mouth', 'face', 'top', 'acc', 'portalStyle']) {
      if (typeof raw[k] === 'string' && MM.LOOK[k].includes(raw[k])) out[k] = raw[k];
    }
    for (const k in MM.LOOK.nums) {
      const v = Number(raw[k]); const [lo, hi] = MM.LOOK.nums[k];
      if (Number.isFinite(v)) out[k] = Math.round(Math.min(hi, Math.max(lo, v)) * 100) / 100;
    }
    for (const k of MM.LOOK.colors) {
      if (typeof raw[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw[k])) out[k] = raw[k].toLowerCase();
    }
    return out;
  };

  // The two ends of your portal pair: your portal colour, and the second colour if you picked
  // one (otherwise a deeper shade of the same, so both ends stay yours: green for a Rick).
  MM.pairColors = function (look) {
    const a = (look && look.portalColor) || '#39ff6a';
    let b = look && look.portalColor2;
    if (!b) { const n = parseInt(a.slice(1), 16), f = v => Math.round(v * 0.62).toString(16).padStart(2, '0'); b = '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); }
    return [a, b];
  };

  // Names: letters, digits, spaces and a little punctuation, 2-20 characters.
  MM.sanitizeName = function (raw) {
    let s = typeof raw === 'string' ? raw : '';
    s = s.normalize('NFKC').replace(/[^\p{L}\p{N} _.\-']/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (s.length < 2) s = 'Variant' + Math.floor(Math.random() * 900 + 100);
    return s;
  };

  // Home dimension code shown next to the name, like "K-42".
  MM.sanitizeHome = function (raw) {
    const s = typeof raw === 'string' ? raw.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 7) : '';
    return /^[A-Z]{1,2}-?[0-9]{1,4}$/.test(s) ? s : 'X-' + Math.floor(Math.random() * 999 + 1);
  };

  // A light chat filter. It masks the worst words; players can also mute anyone.
  const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'retard', 'whore', 'slut', 'bitch', 'kys', 'rape'];
  MM.sanitizeChat = function (raw) {
    let s = typeof raw === 'string' ? raw : '';
    s = s.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
    const low = s.toLowerCase();
    let masked = s;
    for (const w of BAD) {
      let i = low.indexOf(w);
      while (i >= 0) { masked = masked.slice(0, i) + '*'.repeat(w.length) + masked.slice(i + w.length); i = low.indexOf(w, i + 1); }
    }
    return masked;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
