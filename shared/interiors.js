// Multiverse Mayhem: the insides of buildings. Each one is a floor plan, written once and
// used twice: Mojulo builds the furnished rooms from it (rooms, glyphs, doors; exported as
// glTF and converted with scripts/glb2mm.js into assets/interiors/<id>.mmg), and the game
// reads the same plan for the walls you bump into, the bounds, the way in and the way out.
// Plans are in feet like Mojulo's; `scale` turns feet into game metres (x 0.3048).
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // glyphs: E entry, L lounge, D dining, K kitchen, B bedroom, O office, S storage, H hall.
  // doors: { x, y, room (index), edge 'N'|'S'|'E'|'W', entry? } (x, y on the wall, in feet).
  // spots: things to do inside, { id, name, x, y (feet), alias? (an outside landmark whose
  // tasks also work here), r? }. npc: who is inside.
  MM.INTERIORS = [
    {
      id: 'schoolin', outside: 'school', name: 'Harry Herpson High (inside)', style: 'brick', scale: 1.35,
      plan: { width: 60, height: 34, rooms: [
        { x: 0, y: 0, w: 20, h: 14, glyph: 'O' }, { x: 20, y: 0, w: 20, h: 14, glyph: 'O' }, { x: 40, y: 0, w: 20, h: 14, glyph: 'O' },
        { x: 0, y: 14, w: 60, h: 8, glyph: 'H' },
        { x: 0, y: 22, w: 30, h: 12, glyph: 'D' }, { x: 30, y: 22, w: 30, h: 12, glyph: 'L' },
      ], doors: [
        { x: 0, y: 18, room: 3, edge: 'W', entry: true },
        { x: 10, y: 14, room: 0, edge: 'S' }, { x: 30, y: 14, room: 1, edge: 'S' }, { x: 50, y: 14, room: 2, edge: 'S' },
        { x: 15, y: 22, room: 4, edge: 'N' }, { x: 45, y: 22, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'class', name: "Mr. Goldenfold's classroom", x: 10, y: 7, alias: 'school' },
        { id: 'principal', name: "Principal Vagina's office", x: 50, y: 7 },
        { id: 'cafeteria', name: 'Cafeteria', x: 15, y: 28 },
      ],
      npc: [['schoolkid', 6], ['neighbor', 2]],
    },
    {
      id: 'hospitalin', outside: 'hospital', name: 'Horse Hospital (inside)', style: 'modern', scale: 1.35,
      plan: { width: 46, height: 30, rooms: [
        { x: 0, y: 0, w: 16, h: 12, glyph: 'O' }, { x: 16, y: 0, w: 15, h: 12, glyph: 'B' }, { x: 31, y: 0, w: 15, h: 12, glyph: 'B' },
        { x: 0, y: 12, w: 46, h: 6, glyph: 'H' },
        { x: 0, y: 18, w: 23, h: 12, glyph: 'B' }, { x: 23, y: 18, w: 23, h: 12, glyph: 'K' },
      ], doors: [
        { x: 0, y: 15, room: 3, edge: 'W', entry: true },
        { x: 8, y: 12, room: 0, edge: 'S' }, { x: 23, y: 12, room: 1, edge: 'S' }, { x: 38, y: 12, room: 2, edge: 'S' },
        { x: 11, y: 18, room: 4, edge: 'N' }, { x: 34, y: 18, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'surgery', name: 'Operating theatre', x: 23, y: 6, alias: 'hospital' },
        { id: 'ward', name: 'The horse ward', x: 11, y: 24 },
      ],
      npc: [['labtech', 3], ['neighbor', 3]],
    },
    {
      id: 'mallin', outside: 'mall', name: "Merpal's Mall (inside)", style: 'modern', scale: 1.35,
      plan: { width: 70, height: 40, rooms: [
        { x: 0, y: 0, w: 18, h: 14, glyph: 'S' }, { x: 18, y: 0, w: 18, h: 14, glyph: 'L' }, { x: 36, y: 0, w: 17, h: 14, glyph: 'O' }, { x: 53, y: 0, w: 17, h: 14, glyph: 'S' },
        { x: 0, y: 14, w: 70, h: 12, glyph: 'H' },
        { x: 0, y: 26, w: 30, h: 14, glyph: 'D' }, { x: 30, y: 26, w: 20, h: 14, glyph: 'B' }, { x: 50, y: 26, w: 20, h: 14, glyph: 'K' },
      ], doors: [
        { x: 0, y: 20, room: 4, edge: 'W', entry: true },
        { x: 9, y: 14, room: 0, edge: 'S' }, { x: 27, y: 14, room: 1, edge: 'S' }, { x: 44, y: 14, room: 2, edge: 'S' }, { x: 61, y: 14, room: 3, edge: 'S' },
        { x: 15, y: 26, room: 5, edge: 'N' }, { x: 40, y: 26, room: 6, edge: 'N' }, { x: 60, y: 26, room: 7, edge: 'N' },
      ] },
      spots: [
        { id: 'concourse', name: 'The concourse', x: 35, y: 20, alias: 'mall' },
        { id: 'foodcourt', name: 'Food court', x: 15, y: 33 },
        { id: 'mattress', name: 'Mattress store', x: 40, y: 33 },
      ],
      npc: [['neighbor', 8], ['schoolkid', 3], ['cop', 1]],
    },
    {
      id: 'shoneysin', outside: 'shoneys', name: "Shoney's (inside)", style: 'cottage', scale: 1.35,
      plan: { width: 40, height: 28, rooms: [
        { x: 0, y: 0, w: 26, h: 28, glyph: 'D' }, { x: 26, y: 0, w: 14, h: 10, glyph: 'E' }, { x: 26, y: 10, w: 14, h: 18, glyph: 'K' },
      ], doors: [
        { x: 40, y: 5, room: 1, edge: 'E', entry: true },
        { x: 26, y: 5, room: 0, edge: 'W' }, { x: 33, y: 10, room: 2, edge: 'N' },
      ] },
      spots: [
        { id: 'booth', name: 'A booth by the window', x: 13, y: 14, alias: 'shoneys' },
        { id: 'breakfastbar', name: 'The breakfast bar', x: 33, y: 19 },
      ],
      npc: [['neighbor', 5]],
    },
    {
      id: 'whitehousein', outside: 'whitehouse', name: 'The White House (inside)', style: 'brick', scale: 1.35,
      plan: { width: 56, height: 32, rooms: [
        { x: 0, y: 0, w: 18, h: 12, glyph: 'D' }, { x: 18, y: 0, w: 20, h: 12, glyph: 'O', items: [{ type: 'resolute-desk', at: [0.5, 0.3], size: [6, 3], height: 2.6, facing: 'S' }, { type: 'sofa', at: [0.3, 0.75], facing: 'E' }, { type: 'sofa', at: [0.7, 0.75], facing: 'W' }] },
        { x: 38, y: 0, w: 18, h: 12, glyph: 'L' },
        { x: 0, y: 12, w: 56, h: 8, glyph: 'H' },
        { x: 0, y: 20, w: 28, h: 12, glyph: 'L' }, { x: 28, y: 20, w: 28, h: 12, glyph: 'K' },
      ], doors: [
        { x: 0, y: 16, room: 3, edge: 'W', entry: true },
        { x: 9, y: 12, room: 0, edge: 'S' }, { x: 28, y: 12, room: 1, edge: 'S' }, { x: 47, y: 12, room: 2, edge: 'S' },
        { x: 14, y: 20, room: 4, edge: 'N' }, { x: 42, y: 20, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'oval', name: 'The Oval Office', x: 28, y: 7, alias: 'whitehouse' },
        { id: 'cabinet', name: 'The Cabinet Room', x: 9, y: 6 },
        { id: 'press', name: 'The press briefing room', x: 47, y: 6 },
      ],
      npc: [['president', 1, 28, 4], ['secretservice', 4], ['secretservice', 2, 6, 16]],
    },
    {
      id: 'officein', outside: 'office', name: 'Unemployment Office (inside)', style: 'modern', scale: 1.35,
      plan: { width: 34, height: 24, rooms: [
        { x: 0, y: 0, w: 20, h: 24, glyph: 'L' }, { x: 20, y: 0, w: 14, h: 12, glyph: 'O' }, { x: 20, y: 12, w: 14, h: 12, glyph: 'O' },
      ], doors: [
        { x: 10, y: 24, room: 0, edge: 'S', entry: true },
        { x: 20, y: 6, room: 1, edge: 'W' }, { x: 20, y: 18, room: 2, edge: 'W' },
      ] },
      spots: [
        { id: 'counter', name: 'The job counter', x: 27, y: 6, alias: 'office' },
        { id: 'waiting', name: 'The waiting room', x: 10, y: 12 },
      ],
      npc: [['neighbor', 6]],
    },
  ];

  // ----- Insides drawn in the game (no mesh): every other building you can do things at -----
  // A plan from a template ('one' big room, 'two' rooms front and back, 'three': a front hall
  // and two rooms behind), a look (wall and floor colours), and spots: { id, name, at: [fx, fy]
  // (fractions of the plan), alias?, f: [prop, dx, dy (feet from the spot), rot?] (the thing
  // the spot is about: a furnace, a throne...) }. Furniture fills the rest, by room glyph.
  MM.INSIDE_LOOKS = {
    meat: { wall: '#b0485c', floor: ['#8a3040', '#7a2838'], trim: '#5a1a28' },
    bazaar: { wall: '#6a4a8a', floor: ['#4a3a5a', '#3e304e'], trim: '#2a1e3a' },
    moon: { wall: '#c8ccd4', floor: ['#9aa0aa', '#8a909a'], trim: '#5a606a' },
    citadel: { wall: '#d8dce8', floor: ['#a8b0c4', '#98a0b4'], trim: '#4a5470' },
    palace: { wall: '#f0e0b0', floor: ['#c84848', '#b83838'], trim: '#c8a040' },
    shop: { wall: '#e8dcc4', floor: ['#b89870', '#a88860'], trim: '#6a4a30' },
    office: { wall: '#e4e4dc', floor: ['#9a9a92', '#8a8a82'], trim: '#5a5a52' },
    marble: { wall: '#f2efe6', floor: ['#d8d4c8', '#c8c4b8'], trim: '#a89a70' },
    military: { wall: '#7a8466', floor: ['#5a5e52', '#4e5246'], trim: '#3a3e32' },
    club: { wall: '#3a2a4a', floor: ['#2a1e34', '#24182c'], trim: '#ff5fd0' },
    sea: { wall: '#3a8aa8', floor: ['#2a6a88', '#245e7a'], trim: '#ffd84d' },
    giant: { wall: '#a89878', floor: ['#7a6a52', '#6e5e48'], trim: '#4a3e2e' },
    gear: { wall: '#8a7a5a', floor: ['#6a5a3a', '#5e4e30'], trim: '#c8a040' },
    garage: { wall: '#7a6a5a', floor: ['#5a5a56', '#4e4e4a'], trim: '#3a2a1a' },
    hangar: { wall: '#8a9098', floor: ['#6a7078', '#5e646c'], trim: '#3a4048' },
    dream: { wall: '#b8a8e8', floor: ['#8a7ac8', '#7a6ab8'], trim: '#ffd84d' },
    bird: { wall: '#c8a878', floor: ['#a8885a', '#98784e'], trim: '#6a4a2a' },
    factory: { wall: '#d4c8d8', floor: ['#a89aac', '#988a9c'], trim: '#ff8fc8' },
  };
  // The furniture and the centrepieces (models in js/dims.js). box: footprint, front = +z.
  const FURN = {
    in_sofa: [1.1, 0.9, [-1.1, 1.1, -0.45, 0.45]], in_table: [1.2, 0.8, [-1.4, 1.4, -0.8, 0.8]], in_bed: [1.2, 0.7, [-0.9, 0.9, -1.1, 1.1]],
    in_desk: [0.9, 0.8, [-0.8, 0.8, -0.4, 0.4]], in_shelf: [0.9, 2.2, [-1, 1, -0.35, 0.35]], in_counter: [1.4, 1.1, [-1.8, 1.8, -0.5, 0.5]],
    in_plant: [0.4, 1.4], in_bench: [1.0, 0.5, [-1, 1, -0.3, 0.3]], f_furnace: [2.0, 3.5, [-1.8, 1.8, -1.4, 1.4]], f_anvil: [0.6, 0.9],
    f_stage: [3.0, 0.55, [-3.5, 3.5, -2, 2]], f_conveyor: [2.5, 1.0, [-4, 4, -0.8, 0.8]], f_vat: [1.4, 2.5], f_ringtable: [2.6, 0.9],
    f_podium: [0.7, 1.3], f_ballpit: [2.4, 0.45], f_throne: [1.3, 3.0, [-1.2, 1.2, -1, 0.9]], f_tvwall: [3, 3.5, [-4, 4, -0.4, 0.4]],
    f_statue: [0.8, 3.0], f_ufo: [4, 3.0], f_doorwall: [3, 3, [-4.5, 4.5, -0.3, 0.3]],
  };
  for (const k in FURN) { const [r, h, box] = FURN[k]; MM.PROPS[k] = { r, h, hp: 1e9, drop: {}, fixed: true }; if (box) MM.PROPS[k].box = box; }
  const INSIDES = [
    ['forgein', 'forge', 'The Forge (inside)', 'meat', 'one', 44, 32, [['furnace', 'The furnace', [0.5, 0.35], 'forge', ['f_furnace', 0, -6, 0]], ['anvil', 'The anvil', [0.25, 0.65], null, ['f_anvil', 0, -3, 0]]], [['fleshmonk', 3]]],
    ['shipyardin', 'shipyard', 'Bazaar Shipyard (inside)', 'bazaar', 'one', 56, 40, [['dock', 'Dry dock', [0.5, 0.4], 'shipyard', ['spacecruiser', 0, -9, 0]], ['parts', 'The parts counter', [0.82, 0.7], null, ['in_counter', 0, -4, 0]]], [['merchant', 2], ['tourist', 2]]],
    ['marketin', 'market', 'The Black Market (inside)', 'bazaar', 'three', 50, 36, [['stalls', 'The back-room stalls', [0.5, 0.75], 'market', ['stall', 0, -6, 0]], ['fence', 'The fence (no questions asked)', [0.25, 0.25], null, ['in_counter', 0, -5, 0]], ['den', 'The party den', [0.75, 0.25], null, ['f_stage', 0, -6, 0]]], [['merchant', 3], ['tourist', 3]]],
    ['refineryin', 'refinery', 'Crystal Refinery (inside)', 'moon', 'two', 48, 36, [['line', 'The sorting line', [0.5, 0.75], 'refinery', ['f_conveyor', 0, -5, 0]], ['vats', 'The crystal vats', [0.5, 0.25], null, ['f_vat', 0, -5, 0]]], [['moonminer', 4]]],
    ['aeriein', 'aerie', 'The Aerie (inside)', 'bird', 'one', 44, 34, [['roost', 'The high roost', [0.5, 0.4], 'aerie', ['nest', 0, -6, 0]]], [['birdcitizen', 4]]],
    ['councilin', 'council', 'Council of Ricks Chamber', 'citadel', 'three', 60, 42, [['chamber', 'The council table', [0.5, 0.72], 'council', ['f_ringtable', 0, -1, 0]], ['records', 'Hall of Records', [0.25, 0.22], null, ['in_shelf', 0, -6, 0]], ['vote', 'The voting booth', [0.75, 0.22], null, ['f_podium', 0, -5, 0]]], [['citrick', 6], ['citguard', 2]]],
    ['daycarein', 'daycare', 'Morty Daycare (inside)', 'citadel', 'two', 46, 34, [['play', 'The ball pit', [0.5, 0.72], 'daycare', ['f_ballpit', 0, -2, 0]], ['naps', 'Nap time corner', [0.5, 0.25], null, ['in_bed', 0, -5, 0]]], [['citmorty', 8]]],
    ['palacein', 'palace', "Snowball's Palace (inside)", 'palace', 'two', 54, 40, [['throne', "Snowball's throne", [0.5, 0.3], 'palace', ['f_throne', 0, -6, 0]], ['hall', 'The great hall', [0.5, 0.75], null, ['in_table', 0, 0, 0]]], [['dogcitizen', 5]]],
    ['needfulin', 'needful', 'Needful Things (inside)', 'shop', 'one', 34, 26, [['shelves', 'The cursed shelves', [0.5, 0.35], 'needful', ['curioshelf', 0, -5, 0]]], [['neighbor', 1]]],
    ['wongin', 'wong', "Dr. Wong's office (inside)", 'office', 'two', 34, 28, [['couch', 'The therapy couch', [0.5, 0.25], 'wong', ['in_sofa', 0, -4, 0]], ['waiting', 'Waiting room', [0.5, 0.72], null, ['in_bench', 0, -4, 0]]], [['neighbor', 2]]],
    ['tvstorein', 'tvstore', 'TV store (inside)', 'shop', 'one', 40, 30, [['tvwall', 'The wall of TVs', [0.5, 0.3], 'tvstore', ['f_tvwall', 0, -6, 0]]], [['neighbor', 3]]],
    ['capitolin', 'capitol', 'The Capitol (inside)', 'marble', 'three', 64, 44, [['floor', 'The Senate floor', [0.5, 0.75], 'capitol', ['f_podium', 0, -6, 0]], ['rotunda', 'The rotunda', [0.25, 0.22], null, ['f_statue', 0, -3, 0]], ['lobby', "The lobbyists' room", [0.75, 0.22], null, ['in_table', 0, -2, 0]]], [['secretservice', 3], ['neighbor', 4]]],
    ['pentagonin', 'pentagon', 'The Pentagon (inside)', 'military', 'two', 60, 42, [['warroom', 'The war room', [0.5, 0.3], 'pentagon', ['f_ringtable', 0, -1, 0]], ['screens', 'The big screens', [0.5, 0.75], null, ['f_tvwall', 0, -7, 0]]], [['marine', 5]]],
    ['snakeclubin', 'snakeclub', 'The Snake Jazz Club (inside)', 'club', 'one', 44, 32, [['stage', 'The jazz stage', [0.5, 0.3], 'snakeclub', ['f_stage', 0, -5, 0]], ['bar', 'The bar', [0.2, 0.7], null, ['in_counter', 0, -3, 0]]], [['snakefolk', 6]]],
    ['giantcastlein', 'giantcastle', "The Giants' Castle (inside)", 'giant', 'one', 70, 50, [['court', "The giants' court", [0.5, 0.3], 'giantcastle', ['f_throne', 0, -7, 0, 2.2]], ['table', 'The giant dinner table', [0.5, 0.72], null, ['in_table', 0, 0, 0, 2.4]]], [['giant', 2]]],
    ['nimbuspalacein', 'nimbuspalace', "Mr. Nimbus's Palace (inside)", 'sea', 'one', 56, 40, [['throne', 'The sea throne', [0.5, 0.3], 'nimbuspalace', ['f_throne', 0, -6, 0]]], [['merfolk', 5]]],
    ['squanchclubin', 'squanchclub', 'The Squanch Club (inside)', 'club', 'one', 44, 32, [['dancefloor', 'The dance floor', [0.5, 0.45], 'squanchclub', ['f_stage', 0, -7, 0]], ['bar', 'The squanch bar', [0.82, 0.75], null, ['in_counter', 0, -3, 0]]], [['squanchcat', 7]]],
    ['raidergaragein', 'raidergarage', "The Raiders' Garage (inside)", 'garage', 'one', 48, 34, [['bay', 'The car bay', [0.5, 0.45], 'raidergarage', ['car', 0, -6, Math.PI / 2]], ['tools', 'Tool wall', [0.15, 0.3], null, ['toolchest', 0, -4, 0]]], [['neighbor', 2], ['robotfolk', 1]]],
    ['formsofficein', 'formsoffice', 'Federation Forms Office (inside)', 'office', 'two', 50, 36, [['window', 'Window 27-B', [0.5, 0.25], 'formsoffice', ['in_counter', 0, -4, 0]], ['queue', 'The queue', [0.5, 0.72], null, ['in_bench', 0, -3, 0]]], [['fedclerk', 5]]],
    ['geartemplein', 'geartemple', 'The Gear Temple (inside)', 'gear', 'one', 46, 34, [['altar', 'The great gear', [0.5, 0.3], 'geartemple', ['biggear', 0, -6, 0]]], [['gearperson', 5]]],
    ['hangar51in', 'hangar51', 'Hangar 18 (inside)', 'hangar', 'one', 64, 46, [['saucer', 'The saucer under the tarp', [0.5, 0.42], 'hangar51', ['f_ufo', 0, -7, 0]], ['crates', 'The crate stacks', [0.15, 0.25], null, ['crate', 0, -3, 0]]], [['marine', 4], ['labtech', 2]]],
    ['fakedoorsin', 'fakedoors', 'Real Fake Doors (inside)', 'shop', 'one', 40, 30, [['doors', 'The wall of fake doors', [0.5, 0.3], 'fakedoors', ['f_doorwall', 0, -6, 0]]], [['adperson', 3]]],
    ['antsjohnsonin', 'antsjohnson', "Ants in my Eyes Johnson's (inside)", 'shop', 'one', 40, 30, [['deals', 'Every TV on sale', [0.5, 0.3], 'antsjohnson', ['f_tvwall', 0, -6, 0]]], [['adperson', 3]]],
    ['plumbuslinein', 'plumbusline', 'Plumbus Factory Floor', 'factory', 'one', 56, 40, [['line', 'The plumbus line', [0.5, 0.42], 'plumbusline', ['f_conveyor', 0, -5, 0]]], [['plumbusworker', 5]]],
    ['dreamschoolin', 'dreamschool', 'Dream School (inside)', 'dream', 'three', 54, 40, [['exam', 'The exam room', [0.25, 0.22], 'dreamschool', ['in_desk', 0, -4, 0]], ['hallway', 'The endless hallway', [0.5, 0.75], null, ['in_bench', 0, -4, 0]], ['gym', 'The gym, in your underwear', [0.75, 0.22], null, ['f_stage', 0, -5, 0]]], [['dreamer', 4]]],
    ['gazorpthronein', 'gazorpthrone', 'The Gazorpian Throne Room', 'palace', 'one', 50, 36, [['throne', 'The throne of the queen', [0.5, 0.3], 'gazorpthrone', ['f_throne', 0, -6, 0]]], [['alienfolk', 4]]],
    ['dinocouncilin', 'dinocouncil', 'The Dinosaur Council (inside)', 'giant', 'one', 60, 44, [['ring', 'The council ring', [0.5, 0.45], 'dinocouncil', ['f_ringtable', 0, -1, 0, 1.6]]], [['dinosaur', 3]]],
  ];
  const TPL = {
    one: (W, H) => ({ rooms: [{ x: 0, y: 0, w: W, h: H, glyph: 'D' }], doors: [{ x: W / 2, y: H, room: 0, edge: 'S', entry: true }] }),
    two: (W, H) => { const m = Math.round(H * 0.45); return { rooms: [{ x: 0, y: m, w: W, h: H - m, glyph: 'L' }, { x: 0, y: 0, w: W, h: m, glyph: 'O' }], doors: [{ x: W / 2, y: H, room: 0, edge: 'S', entry: true }, { x: W / 2, y: m, room: 1, edge: 'S' }] }; },
    three: (W, H) => { const m = Math.round(H * 0.45); return { rooms: [{ x: 0, y: m, w: W, h: H - m, glyph: 'H' }, { x: 0, y: 0, w: W / 2, h: m, glyph: 'O' }, { x: W / 2, y: 0, w: W / 2, h: m, glyph: 'L' }], doors: [{ x: W / 2, y: H, room: 0, edge: 'S', entry: true }, { x: W / 4, y: m, room: 1, edge: 'S' }, { x: W * 3 / 4, y: m, room: 2, edge: 'S' }] }; },
  };
  for (const [id, outside, name, look, tpl, W, H, spots, npc] of INSIDES) {
    if (!MM.LANDMARK_BY_ID[outside]) continue;
    const I = { id, outside, name, look, scale: 1.35, proc: true, plan: Object.assign({ width: W, height: H }, TPL[tpl](W, H)), npc };
    I.spots = spots.map(([sid, sname, [fx, fy], alias, f]) => ({ id: sid, name: sname, x: Math.round(fx * W), y: Math.round(fy * H), alias: alias || undefined, f }));
    MM.INTERIORS.push(I);
  }
  // Furniture for a drawn inside, by room glyph, kept clear of the spots and the doors:
  // [prop, x, z, rot, scale] in game coordinates (dim.fixed).
  MM.furnishInside = function (I) {
    const out = [], k = 0.3048 * I.scale, P = I.plan;
    const at = (px, py) => MM.interiorXZ(I, px, py);
    const busy = (px, py, rad) => I.spots.some(s => Math.hypot(s.x - px, s.y - py) < rad + 7) || P.doors.some(d => Math.hypot(d.x - px, d.y - py) < rad + 5);
    const put = (type, px, py, rot, sc) => { if (busy(px, py, 3)) return; const q = at(px, py); out.push([type, +q.x.toFixed(2), +q.z.toFixed(2), rot || 0, sc || 1]); };
    // The thing a spot is about stands just behind it (plan north = +z), facing you.
    for (const s of I.spots) if (s.f) { const [type, dx, dy, rot, sc] = s.f, q = at(s.x + dx, s.y + dy); out.push([type, +q.x.toFixed(2), +q.z.toFixed(2), (rot || 0) + (dy < 0 ? Math.PI : 0), sc || 1]); }
    for (const r of P.rooms) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      // Plants in the corners, and something along the back wall.
      for (const [px, py] of [[r.x + 2.5, r.y + 2.5], [r.x + r.w - 2.5, r.y + 2.5]]) put('in_plant', px, py, 0);
      if (r.glyph === 'L') { put('in_sofa', cx - r.w * 0.25, cy + 2, Math.PI); put('in_sofa', cx + r.w * 0.25, cy + 2, Math.PI); }
      if (r.glyph === 'D') { put('in_bench', r.x + 4, cy, Math.PI / 2); put('in_bench', r.x + r.w - 4, cy, -Math.PI / 2); }
      if (r.glyph === 'O') { put('in_shelf', r.x + 4, r.y + 1.5, Math.PI); put('in_desk', cx - r.w * 0.28, cy, Math.PI); }
      if (r.glyph === 'H') { put('in_bench', r.x + 6, r.y + r.h - 4, 0); put('in_bench', r.x + r.w - 6, r.y + r.h - 4, 0); }
    }
    return out;
  };

  // Feet on the plan -> game coordinates (centred on the plan; plan +y is -z in the game,
  // which is how Mojulo's export comes out).
  MM.interiorXZ = (I, px, py) => {
    const k = 0.3048 * I.scale;
    return { x: (px - I.plan.width / 2) * k, z: (I.plan.height / 2 - py) * k };
  };

  // The inside walls, from the plan: every room edge (shared edges once), with a gap at each
  // door. Outer walls are left to the room bounds.
  MM.planWalls = function (I) {
    const P = I.plan, W = P.width, H = P.height, gap = 2.0;   // half a door gap, feet
    const segs = new Map();
    const add = (x1, y1, x2, y2) => {
      if (x1 === x2 && (x1 <= 0 || x1 >= W)) return;   // outer walls: the bounds do those
      if (y1 === y2 && (y1 <= 0 || y1 >= H)) return;
      const k = x1 === x2 ? 'v' + x1 : 'h' + y1;
      (segs.get(k) || segs.set(k, []).get(k)).push(x1 === x2 ? [Math.min(y1, y2), Math.max(y1, y2)] : [Math.min(x1, x2), Math.max(x1, x2)]);
    };
    for (const r of P.rooms) { add(r.x, r.y, r.x + r.w, r.y); add(r.x, r.y + r.h, r.x + r.w, r.y + r.h); add(r.x, r.y, r.x, r.y + r.h); add(r.x + r.w, r.y, r.x + r.w, r.y + r.h); }
    const out = [];
    for (const [k, list] of segs) {
      const vert = k[0] === 'v', c = Number(k.slice(1));
      // Merge overlapping spans on this line, then cut the doors out.
      list.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const s of list) { const m = merged[merged.length - 1]; if (m && s[0] <= m[1]) m[1] = Math.max(m[1], s[1]); else merged.push(s.slice()); }
      let spans = merged;
      for (const d of P.doors) {
        const onLine = vert ? Math.abs(d.x - c) < 0.01 : Math.abs(d.y - c) < 0.01;
        if (!onLine) continue;
        const at = vert ? d.y : d.x, next = [];
        for (const [a, b] of spans) {
          if (at + gap <= a || at - gap >= b) { next.push([a, b]); continue; }
          if (at - gap > a) next.push([a, at - gap]);
          if (at + gap < b) next.push([at + gap, b]);
        }
        spans = next;
      }
      for (const [a, b] of spans) {
        const p1 = vert ? MM.interiorXZ(I, c, a) : MM.interiorXZ(I, a, c), p2 = vert ? MM.interiorXZ(I, c, b) : MM.interiorXZ(I, b, c);
        out.push([+p1.x.toFixed(2), +p1.z.toFixed(2), +p2.x.toFixed(2), +p2.z.toFixed(2)]);
      }
    }
    return out;
  };

  // The Smith house: two floors of the same 44 x 32 ft footprint, the plans the meshes were
  // made from (assets/interiors/smith.recipe.json downstairs, smith2.recipe.json upstairs). The
  // walls of each floor only stop you on that floor; the stairs get side walls of their own.
  {
    const D = MM.DIM_BY_ID.smithhouse, F = D.floors.y;
    const down = { scale: 1.4, plan: { width: 44, height: 32, rooms: [
      { x: 0, y: 14, w: 16, h: 18 }, { x: 16, y: 14, w: 12, h: 18 }, { x: 28, y: 14, w: 16, h: 18 }, { x: 0, y: 0, w: 16, h: 14 }, { x: 16, y: 0, w: 28, h: 14 },
    ], doors: [{ x: 16, y: 23 }, { x: 20, y: 14 }, { x: 36, y: 14 }, { x: 16, y: 7 }] } };
    const up = { scale: 1.4, plan: { width: 44, height: 32, rooms: [
      { x: 0, y: 0, w: 16, h: 16 }, { x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 0, w: 12, h: 15.5 }, { x: 16, y: 15.5, w: 8, h: 16.5 },
      { x: 24, y: 15.5, w: 4, h: 16.5 }, { x: 28, y: 0, w: 16, h: 12 }, { x: 28, y: 12, w: 16, h: 20 },
    ], doors: [{ x: 16, y: 8 }, { x: 16, y: 24 }, { x: 20, y: 15.5 }, { x: 26, y: 15.5 }, { x: 28, y: 6 }, { x: 28, y: 13.75 }] } };
    const S = D.floors.stair, lowZ = S.z0 + (S.z1 - S.z0) * 0.6 / F, headZ = S.z0 + (S.z1 - S.z0) * 2.4 / F;
    D.walls = [].concat(
      MM.planWalls(down).map(w => w.concat([-1, F - 0.5])),
      MM.planWalls(up).map(w => w.concat([F - 0.5, 99])),
      [
        [S.x0, lowZ, S.x0, S.z1, 0.3, F - 0.5],        // the banister, while you are on the stairs
        [S.x0, lowZ, S.x0, headZ, -1, 0.3],            // under the stairs: closed in where it is low
        [S.x0, headZ, S.x1, headZ, -1, 0.3],
      ]);
  }

  // Build the dimensions, the way in (a door on the outside landmark), the way out, and the
  // things to do inside.
  for (const I of MM.INTERIORS) {
    if (MM.DIM_BY_ID[I.id]) continue;
    const k = 0.3048 * I.scale, hw = I.plan.width / 2 * k, hh = I.plan.height / 2 * k;
    const entry = I.plan.doors.find(d => d.entry);
    const ein = MM.interiorXZ(I, entry.x, entry.y);
    // One step inside the front door.
    const inward = { N: [0, -1], S: [0, 1], W: [1, 0], E: [-1, 0] }[entry.edge];
    const inside = { x: ein.x + inward[0] * 1.6, z: ein.z + inward[1] * 1.6 };
    const out = MM.LANDMARK_BY_ID[I.outside];
    const R = MM.PROPS[out.model] && MM.PROPS[out.model].box ? MM.PROPS[out.model].box[3] : out.r;
    const rot = out.rot !== undefined ? out.rot : Math.atan2(-out.x, -out.z);
    const front = { x: out.x + Math.sin(rot) * (R + 2.5), z: out.z + Math.cos(rot) * (R + 2.5) };
    const d = {
      id: I.id, name: I.name, code: MM.DIM_BY_ID[out.dim].code, seed: 300 + MM.INTERIORS.indexOf(I), gravity: 24, interior: true, hidden: true,
      bound: hw - 0.35, boundZ: hh - 0.35, blurb: out.name + ', inside.',
      sky: ['#2a2a30', '#2a2a30'], fog: '#2a2a30', fogFar: 400, sun: '#fff4e0', ambient: '#c0b8a8',
      ground: ['#b8a88a', '#a8987a', '#c8b89a'], accent: '#ffd84d', spawn: inside,
      room: I.proc ? { w: hw * 2, d: hh * 2, h: 3.25 * I.scale, plan: I.plan, scale: I.scale, look: MM.INSIDE_LOOKS[I.look] }
        : { w: hw * 2, d: hh * 2, h: 3.25 * I.scale, mesh: 'assets/interiors/' + I.id.replace(/in$/, '') + '.mmg' },
      walls: MM.planWalls(I), props: [], npc: I.npc || [], pickups: {}, mat: 's', insideOf: out.id,
    };
    if (I.proc) { d.fixed = MM.furnishInside(I); d.ground = MM.INSIDE_LOOKS[I.look].floor.concat(MM.INSIDE_LOOKS[I.look].floor[0]); }
    // Fixed spots for the people who live there: plan feet to game metres.
    d.npc = d.npc.map(n => n.length > 2 ? [n[0], n[1], MM.interiorXZ(I, n[2], n[3]).x, MM.interiorXZ(I, n[2], n[3]).z] : n);
    MM.DIMS.push(d); MM.DIM_BY_ID[I.id] = d; MM.DIM_IDS.push(I.id);
    out.door = { dim: I.id, x: inside.x, z: inside.z };
    const exit = { id: I.id + '_exit', dim: I.id, name: 'Way out', x: ein.x + inward[0] * 0.6, z: ein.z + inward[1] * 0.6, r: 0.8, h: 2.2, model: 'lm_marker', door: { dim: out.dim, x: front.x, z: front.z } };
    MM.LANDMARKS.push(exit); MM.LANDMARK_BY_ID[exit.id] = exit;
    for (const s of I.spots) {
      const p = MM.interiorXZ(I, s.x, s.y);
      const l = { id: I.id + '_' + s.id, dim: I.id, name: s.name, x: p.x, z: p.z, r: s.r || 0.8, h: 1.2, model: 'lm_marker' };
      if (s.alias) l.alias = s.alias;
      MM.LANDMARKS.push(l); MM.LANDMARK_BY_ID[l.id] = l;
    }
  }

  // Things to do inside that aren't anywhere else.
  Object.assign(MM.TASKS, {
    principal: { at: 'schoolin_principal', any: true, name: "Get sent to the principal's office", cd: 240, give: { k: 2 }, text: 'Principal Vagina sighed, said his name was not a joke, and gave you a hall pass anyway.' },
    cafeteria: { at: 'schoolin_cafeteria', any: true, name: 'Eat cafeteria food', cd: 150, heal: 1, give: { s: 1 }, text: 'It was beige. All of it. You feel full, and a little sad.' },
    ward:      { at: 'hospitalin_ward', any: true, name: 'Visit a recovering horse', cd: 180, heal: 1, give: { f: 1 }, text: 'The horse nuzzled you. It is going to be fine. Probably.' },
    foodcourt: { at: 'mallin_foodcourt', any: true, name: 'Eat at the food court', cd: 150, heal: 1, give: { s: 1 }, text: 'Pretzel bites, an orange chicken sample, and a long look at the fountain.' },
    mattress:  { at: 'mallin_mattress', any: true, name: 'Lie on every mattress', cd: 200, heal: 1, give: {}, text: 'Firm. Too firm. Medium. You could live here. The sales guy disagrees.' },
    breakfastbar: { at: 'shoneysin_breakfastbar', any: true, name: 'Hit the breakfast bar', cd: 180, heal: 1, give: { s: 2 }, text: 'Endless bacon. Rick was right about this place.' },
    cabinet:   { at: 'whitehousein_cabinet', any: true, name: 'Crash a Cabinet meeting', cd: 300, give: { k: 3 }, text: 'Nobody could explain what you were doing there, so they gave you a commemorative coin.' },
    press:     { at: 'whitehousein_press', any: true, name: 'Take questions at the podium', cd: 240, give: { k: 2 }, text: 'You said "no comment" eleven times. The press loved it.' },
    waiting:   { at: 'officein_waiting', any: true, name: 'Take a number', cd: 120, give: { s: 1 }, text: 'Number 4,812. They are serving number 3. You found a scrap of something under the chair.' },
    anvil:     { at: 'forgein_anvil', any: true, name: 'Hammer something at the anvil', cd: 150, give: { g: 2 }, text: 'Clang. Clang. Squelch. The anvil is also meat. You made something anyway.' },
    parts:     { at: 'shipyardin_parts', any: true, name: 'Haggle at the parts counter', cd: 150, give: { p: 2 }, text: 'A used flux capacitor, barely flaming. The Gromflomite behind the counter threw in a bolt.' },
    fence:     { at: 'marketin_fence', any: true, name: 'Sell something to the fence', cd: 180, give: { k: 3 }, text: 'He did not ask where it came from. You did not ask where the Schmeckles came from.' },
    den:       { at: 'marketin_den', any: true, name: 'Party in the den', cd: 200, heal: 1, give: { p: 1 }, text: 'Someone handed you a drink that was also alive. You had a great time, probably.' },
    vats:      { at: 'refineryin_vats', any: true, name: 'Skim the crystal vats', cd: 180, give: { c: 2 }, text: 'You skimmed the good crystals off the top before the foreman looked.' },
    records:   { at: 'councilin_records', any: true, name: 'Look yourself up in the Hall of Records', cd: 200, give: { k: 2 }, text: 'There are 4,000 files on versions of you. Most of them are disappointing. One is a cowboy.' },
    vote:      { at: 'councilin_vote', any: true, name: 'Vote in the Citadel election', cd: 300, give: { k: 2 }, text: 'Every candidate was a Rick, except one Morty. You have a bad feeling about him.' },
    naps:      { at: 'daycarein_naps', any: true, name: 'Read the Mortys a story', cd: 150, heal: 1, give: { k: 1 }, text: 'Forty Mortys fell asleep. One stayed awake and stared at you the whole time.' },
    greathall: { at: 'palacein_hall', any: true, name: 'Dine in the great hall', cd: 180, heal: 1, give: { s: 2 }, text: 'Kibble, served on silver. Snowball says it is very good kibble. It is fine kibble.' },
    wongwait:  { at: 'wongin_waiting', any: true, name: 'Read the old magazines', cd: 120, give: { k: 1 }, text: '"Is Your Grandpa A Narcissist? Take The Quiz." You took the quiz.' },
    rotunda:   { at: 'capitolin_rotunda', any: true, name: 'Tour the rotunda', cd: 200, give: { k: 2 }, text: 'The guide pointed out a statue of a president who also turned into a pickle once. Long story.' },
    lobby:     { at: 'capitolin_lobby', any: true, name: 'Lobby a senator', cd: 240, give: { k: 3 }, text: 'You asked for one small law. You got three, and a tote bag.' },
    screens:   { at: 'pentagonin_screens', any: true, name: 'Watch the big screens', cd: 200, give: { c: 1, k: 1 }, text: 'A dot moves across a map. Everyone gasps. The dot was a bird.' },
    snakebar:  { at: 'snakeclubin_bar', any: true, name: 'Order a snake martini', cd: 150, heal: 1, give: { p: 1 }, text: 'Hssss. It was shaken, then it shook itself.' },
    gianttable:{ at: 'giantcastlein_table', any: true, name: 'Climb the giant dinner table', cd: 200, give: { s: 3 }, text: 'You found a crumb the size of a car and a fork you could live in.' },
    squanchbar:{ at: 'squanchclubin_bar', any: true, name: 'Squanch at the bar', cd: 150, heal: 1, give: { p: 1 }, text: 'You squanched. They squanched. Nobody will say what squanching is.' },
    tooltime:  { at: 'raidergaragein_tools', any: true, name: 'Borrow some raider tools', cd: 180, give: { s: 3 }, text: 'Every wrench has spikes on. You took the least spiky one.' },
    queue:     { at: 'formsofficein_queue', any: true, name: 'Wait in the queue', cd: 150, give: { k: 1 }, text: 'You waited. And waited. Someone gave you form 27-B by mistake. It is worth something.' },
    crates:    { at: 'hangar51in_crates', any: true, name: 'Open a crate marked TOP SECRET', cd: 240, give: { c: 2, p: 1 }, text: 'Inside: another crate. Inside that: a jar of something glowing, and a note saying PUT IT BACK.' },
    hallway:   { at: 'dreamschoolin_hallway', any: true, name: 'Run down the endless hallway', cd: 150, give: { m: 1 }, text: 'You ran for an hour. The bell rang. You were still in the same spot. Classic dream.' },
    gym:       { at: 'dreamschoolin_gym', any: true, name: 'Give a speech in your underwear', cd: 200, give: { k: 2 }, text: 'Everyone stared. Then they clapped. Then they were all your teeth. You woke up a little.' },
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
