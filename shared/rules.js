// Multiverse Mayhem: game rules shared by the client, the server and the bots.
// Plain script: in a browser it fills the global MM, in Node `require` it.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.VERSION = 2;               // protocol version; client and server must match
  MM.TICK = 1 / 30;             // server simulation step (seconds)
  MM.SNAP_EVERY = 2;            // a snapshot every 2 ticks = 15 per second
  MM.INSTANCE_CAP = 64;         // players per dimension instance (servers can raise it)
  MM.WORLD_HALF = 170;          // playable area is -170..170 on x and z
  MM.RESPAWN_TIME = 4;
  MM.SPAWN_PROTECT = 3;

  // ---------- Materials ----------
  // Every dimension has its own material, so big upgrades mean travelling.
  MM.MATERIALS = {
    s: { name: 'Scrap', icon: '⚙', color: '#c9d1d9', from: 'everywhere (smash things)' },
    c: { name: 'Moon Crystal', icon: '◆', color: '#7affea', from: 'Lowgrav Moon' },
    g: { name: 'Meat Goo', icon: '●', color: '#ff7a8a', from: 'The Meatlands' },
    p: { name: 'Neon Plasma', icon: '✦', color: '#ff6fd0', from: 'Neon Bazaar' },
    f: { name: 'Sky Feather', icon: '➶', color: '#ffd84d', from: 'Featherhold' },
  };
  MM.MAT_IDS = Object.keys(MM.MATERIALS);

  // ---------- Places you go to live your life and build things ----------
  // Each is a building in a dimension. Daily tasks happen there, and some recipes
  // can only be built at a particular one.
  MM.LANDMARKS = [
    { id: 'home', dim: 'suburbia', name: 'Family House', x: -36, z: 24, r: 7, h: 9, model: 'lm_home' },
    { id: 'garage', dim: 'suburbia', name: 'Garage Lab', x: -36, z: 0, r: 5.5, h: 6, model: 'lm_garage' },
    { id: 'school', dim: 'suburbia', name: 'Harmony High', x: 40, z: 30, r: 8, h: 8, model: 'lm_school' },
    { id: 'hospital', dim: 'suburbia', name: 'Horse Hospital', x: 40, z: -24, r: 7, h: 8, model: 'lm_hospital' },
    { id: 'office', dim: 'suburbia', name: 'Unemployment Office', x: -36, z: -30, r: 6, h: 7, model: 'lm_office' },
    { id: 'forge', dim: 'meatlands', name: 'Flesh Forge', x: 32, z: 22, r: 6, h: 7, model: 'lm_forge' },
    { id: 'shipyard', dim: 'bazaar', name: 'Bazaar Shipyard', x: 34, z: -6, r: 8, h: 9, model: 'lm_shipyard' },
    { id: 'market', dim: 'bazaar', name: 'Black Market', x: -32, z: 16, r: 6, h: 6, model: 'lm_market' },
    { id: 'refinery', dim: 'moon', name: 'Crystal Refinery', x: -30, z: 18, r: 7, h: 8, model: 'lm_refinery' },
    { id: 'aerie', dim: 'featherhold', name: 'Aerie Temple', x: 0, z: 36, r: 7, h: 14, model: 'lm_aerie' },
  ];
  MM.LANDMARK_BY_ID = {};
  for (const l of MM.LANDMARKS) MM.LANDMARK_BY_ID[l.id] = l;
  MM.USE_RADIUS = 4;   // how close to a landmark's wall you must be to use it

  // ---------- Daily life ----------
  // Things you do at a landmark. Each can be repeated after its cooldown (seconds).
  MM.TASKS = {
    tinker:  { at: 'garage', name: 'Tinker in the garage', cd: 120, give: { s: 3, c: 1 }, text: 'You built something, took it apart, and kept the good bits.' },
    school:  { at: 'school', name: 'Sit through class', cd: 150, give: { s: 2 }, text: 'Algebra. Again. You pocketed some scrap from shop class.' },
    surgery: { at: 'hospital', name: 'Operate on a horse', cd: 150, give: { s: 3, c: 1 }, heal: 1, text: 'The horse will live. Probably. It looked grateful.' },
    jobhunt: { at: 'office', name: 'Look for a job', cd: 120, give: { s: 1 }, text: 'They said they would call you. They will not call you.' },
    tv:      { at: 'home', name: 'Watch interdimensional TV', cd: 90, heal: 1, give: {}, text: 'A show about a man who is also a ball. You feel restored.' },
    dinner:  { at: 'home', name: 'Family dinner', cd: 180, heal: 1, give: { s: 2 }, text: 'Everyone argued. The mashed potatoes were good, though.' },
    hug:     { at: 'home', name: 'Visit an old friend', cd: 120, heal: 1, give: { s: 2 }, text: 'They swear they have known you for years. It was lovely.' },
    forge:   { at: 'forge', name: 'Feed the forge', cd: 120, give: { g: 3 }, text: 'You fed it. It fed you back. Do not think about it.' },
    haggle:  { at: 'market', name: 'Haggle at the black market', cd: 120, give: { p: 2 }, text: 'You sold a "genuine" moon rock. It was a regular rock.' },
    dock:    { at: 'shipyard', name: 'Fix ships at the docks', cd: 120, give: { s: 2, p: 1 }, text: 'You hit an engine with a wrench until it worked.' },
    report:  { at: 'shipyard', name: 'File a patrol report', cd: 150, give: { p: 2, c: 1 }, text: 'Form 27-B, in triplicate. Your commander nodded once.' },
    shift:   { at: 'refinery', name: 'Work a refinery shift', cd: 120, give: { c: 3 }, text: 'Eight hours of crystal sorting in low gravity. Bouncy.' },
    patrol:  { at: 'aerie', name: 'Stand guard at the Aerie', cd: 120, give: { f: 3 }, text: 'Nothing attacked. You stood there magnificently anyway.' },
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
    gunfast:  { cat: 'gun', name: 'Quick Mixer', cost: { g: 3, p: 3 }, at: 'market', gun: true, desc: 'Portal charges come back 35% faster.' },
    hull:     { cat: 'ship', name: 'Ship Hull', cost: { s: 15, c: 4 }, at: 'shipyard', desc: 'Your own flying saucer. Press B to board.' },
    engine:   { cat: 'ship', name: 'Turbo Engine', cost: { p: 6, g: 4 }, at: 'shipyard', needs: 'hull', desc: 'The ship flies 60% faster.' },
    lasers:   { cat: 'ship', name: 'Ship Lasers', cost: { s: 6, c: 4, p: 3 }, at: 'market', needs: 'hull', desc: 'Heavy lasers while you fly.' },
    drive:    { cat: 'ship', name: 'Dimension Drive', cost: { c: 6, g: 4, p: 6, f: 4 }, at: 'shipyard', needs: 'engine', desc: 'Fly your ship straight into any dimension.' },
  };
  MM.RECIPE_IDS = Object.keys(MM.RECIPES);
  MM.GADGET_IDS = ['grenade', 'turret', 'shrink'];
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
      name: 'Genius Scientist', hp: 80, speed: 7, jump: 8.5, weapon: 'plasma', home: 'suburbia',
      portal: { charges: 3, recharge: 14 }, knows: '*', discount: 2 / 3,
      ability: { id: 'shield', name: 'Science Shield', cd: 16, dur: 4 },
      blurb: 'Smartest being in any dimension. Owns a portal gun, builds anything, but is fragile and has a terrible attitude.',
      perk: 'Knows every recipe and pays a third less. Portal gun with 3 charges.',
      life: { normal: 'Garage Genius', breakout: 'Multiverse Menace', daily: ['tinker', 'dinner'] },
      steps: [
        { name: 'Tinker time', desc: 'Tinker in the Garage Lab once.', goal: { type: 'use', task: 'tinker', n: 1 } },
        { name: 'Field research', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 } },
        { name: 'Wheels', desc: 'Build a Ship Hull at the Bazaar Shipyard.', goal: { type: 'craft', r: 'hull' } },
        { name: 'Unstoppable', desc: 'Build the Dimension Drive.', goal: { type: 'craft', r: 'drive' }, title: true },
      ],
    },
    sidekick: {
      name: 'Reluctant Sidekick', hp: 100, speed: 7.5, jump: 8.5, weapon: 'blaster', home: 'suburbia',
      portal: { charges: 1, recharge: 35 }, knows: ['grenade', 'fluid', 'legs1', 'armor1'],
      ability: { id: 'sprint', name: 'Panic Sprint', cd: 11, dur: 3 },
      blurb: 'Dragged along on every adventure. Panics a lot, survives anyway.',
      perk: 'Dodges 20% of hits out of pure luck. Borrowed portal gun with 1 charge.',
      life: { normal: 'Reluctant Sidekick', breakout: 'Seasoned Adventurer', daily: ['school', 'dinner'] },
      steps: [
        { name: 'Ugh, school', desc: 'Sit through class at Harmony High.', goal: { type: 'use', task: 'school', n: 1 } },
        { name: 'Dragged along', desc: 'Visit 2 different dimensions.', goal: { type: 'dims', n: 2 }, grants: ['turret', 'blaster1'] },
        { name: 'Getting the hang of it', desc: 'Defeat 5 monsters.', goal: { type: 'kill', n: 5 }, grants: ['guncap1', 'gunfast', 'jetpack'] },
        { name: 'Own two feet', desc: 'Build Spring Legs at the Garage Lab.', goal: { type: 'craft', r: 'legs1' }, grants: ['hull', 'shrink', 'armor2'] },
        { name: 'Seasoned', desc: 'Build your own Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'lasers', 'drive', 'guncap2', 'legs2', 'blaster2'], title: true },
      ],
    },
    teen: {
      name: 'Rebellious Teen', hp: 90, speed: 7.8, jump: 9, weapon: 'toy', home: 'suburbia',
      portal: null, knows: ['grenade', 'legs1'],
      ability: { id: 'flash', name: 'Selfie Flash', cd: 12 },
      blurb: 'Stuck in high school while the family goes on adventures. Bored, sharp, and secretly the most capable one.',
      perk: 'Daily tasks pay double. Can become a Space Teen with her own portal gun and ship.',
      life: { normal: 'Regular Teen', breakout: 'Space Teen', daily: ['school', 'dinner'] },
      steps: [
        { name: 'School is a prison', desc: 'Sit through class at Harmony High.', goal: { type: 'use', task: 'school', n: 1 } },
        { name: 'Sneak into the lab', desc: 'Go into the Garage Lab.', goal: { type: 'at', at: 'garage' }, grants: ['blaster1', 'armor1'] },
        { name: 'Take the kiosk', desc: 'Visit 2 different dimensions.', goal: { type: 'dims', n: 2 }, grants: ['turret', 'shrink'] },
        { name: 'Hold your own', desc: 'Defeat 5 monsters.', goal: { type: 'kill', n: 5 }, grants: ['jetpack', 'hull'] },
        { name: 'Collect the parts', desc: 'Carry 3 Meat Goo, 3 Neon Plasma and 3 Moon Crystals.', goal: { type: 'have', mats: { g: 3, p: 3, c: 3 } }, grants: ['gunbuild'] },
        { name: 'Space Teen', desc: 'Build your own portal gun at the Garage Lab.', goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'gunfast', 'fluid', 'engine', 'lasers', 'drive', 'legs2', 'armor2', 'blaster2'], title: true },
      ],
    },
    surgeon: {
      name: 'Horse Surgeon', hp: 100, speed: 7, jump: 8.5, weapon: 'scalpel', home: 'suburbia',
      portal: null, knows: ['grenade', 'armor1', 'armor2', 'legs1'], selfDiscount: 0.5,
      ability: { id: 'patch', name: 'Field Surgery', cd: 14 },
      blurb: 'A brilliant surgeon (of horses) who wonders what life could have been. She could still go find out.',
      perk: 'Upgrades to yourself cost half. Field Surgery heals you and everyone nearby.',
      life: { normal: 'Horse Surgeon', breakout: 'Space Surgeon', daily: ['surgery', 'dinner'] },
      steps: [
        { name: 'Another day, another horse', desc: 'Operate on a horse twice.', goal: { type: 'use', task: 'surgery', n: 2 }, grants: ['blaster1'] },
        { name: 'Alien anatomy', desc: 'Visit The Meatlands.', goal: { type: 'dim', dim: 'meatlands' }, grants: ['armor3'] },
        { name: 'Scalpel work', desc: 'Defeat 3 Meat Blobs.', goal: { type: 'kill', npc: 'meatblob', n: 3 }, grants: ['hull', 'jetpack'] },
        { name: 'Space Surgeon', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'lasers', 'drive', 'gunbuild', 'guncap1', 'fluid', 'blaster2', 'legs2'], title: true },
      ],
    },
    joe: {
      name: 'Average Joe', hp: 100, speed: 6.5, jump: 7.5, weapon: 'toy', home: 'suburbia',
      portal: null, knows: ['grenade'],
      ability: { id: 'sob', name: 'Sob Story', cd: 18, dur: 3 },
      blurb: 'Completely normal. No portal gun, no powers, no job. Breaking out of this life is possible, but it is a long road.',
      perk: 'So unremarkable that monsters and turrets ignore him.',
      life: { normal: 'Average Joe', breakout: 'Adventure Dad', daily: ['jobhunt', 'tv'] },
      steps: [
        { name: 'Keep looking', desc: 'Look for a job 3 times.', goal: { type: 'use', task: 'jobhunt', n: 3 }, grants: ['legs1'] },
        { name: 'Out of the house', desc: 'Visit 3 different dimensions (try the kiosk).', goal: { type: 'dims', n: 3 }, grants: ['armor1'] },
        { name: 'Not so useless', desc: 'Defeat 10 monsters.', goal: { type: 'kill', n: 10 }, grants: ['blaster1', 'turret'] },
        { name: 'Saving up', desc: 'Carry 30 scrap.', goal: { type: 'have', mats: { s: 30 } }, grants: ['hull'] },
        { name: 'Mid-life crisis', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'jetpack'] },
        { name: 'Wreck something', desc: 'Smash 40 props.', goal: { type: 'smash', n: 40 }, grants: ['gunbuild'] },
        { name: 'Adventure Dad', desc: 'Build your own portal gun.', goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'fluid', 'lasers', 'drive', 'armor2'], title: true },
      ],
    },
    birdfolk: {
      name: 'Birdfolk Warrior', hp: 140, speed: 8, jump: 9, weapon: 'talon', fly: true, home: 'featherhold',
      portal: null, knows: ['armor1', 'armor2', 'armor3', 'blaster1', 'blaster2'],
      ability: { id: 'dive', name: 'Dive Strike', cd: 8 },
      blurb: 'Proud warrior of the bird people, with a life, a people and duties of his own in Featherhold.',
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
      name: 'Cheerful Beanling', hp: 70, speed: 8.5, jump: 9, weapon: 'slap', home: 'suburbia',
      portal: null, knows: ['grenade', 'legs1'],
      ability: { id: 'cheer', name: 'Cheer Up', cd: 13 },
      blurb: 'Tall, polite and always happy to see you. Nobody remembers meeting one, but everyone loves them.',
      perk: 'Heals everyone nearby. Whoever takes one down feels awful (slowed 10 s).',
      life: { normal: 'Friendly Beanling', breakout: 'Beanling of Many Worlds', daily: ['hug', 'tv'] },
      steps: [
        { name: 'Ooh, friends', desc: 'Chat with 8 locals.', goal: { type: 'talk', n: 8 }, grants: ['armor1'] },
        { name: 'Helping out', desc: 'Finish 2 errands for locals.', goal: { type: 'errand', n: 2 }, grants: ['jetpack', 'shrink'] },
        { name: 'New neighbours', desc: 'Visit 4 different dimensions.', goal: { type: 'dims', n: 4 }, grants: ['gunbuild'] },
        { name: 'Beanling of Many Worlds', desc: 'Build your own portal gun.', goal: { type: 'craft', r: 'gunbuild' }, grants: ['guncap1', 'fluid', 'hull', 'engine'], title: true },
      ],
    },
    mutant: {
      name: 'Meat Mutant', hp: 200, speed: 5.5, jump: 7, weapon: 'punch', home: 'meatlands',
      portal: null, knows: ['armor1', 'armor2', 'armor3'],
      ability: { id: 'slam', name: 'Body Slam', cd: 9 },
      blurb: 'A lab accident made flesh. Huge, slow, and very hard to kill.',
      perk: 'Regenerates 3 health per second. Body Slam knocks everyone back.',
      life: { normal: 'Lurking Mutant', breakout: 'Apex Abomination', daily: ['forge'] },
      steps: [
        { name: 'Hungry', desc: 'Smash 30 props.', goal: { type: 'smash', n: 30 }, grants: ['legs1'] },
        { name: 'Out of the pit', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 }, grants: ['blaster1', 'jetpack'] },
        { name: 'Apex Abomination', desc: 'Defeat 5 players.', goal: { type: 'ko', n: 5 }, grants: ['blaster2', 'legs2'], title: true },
      ],
    },
    trooper: {
      name: 'Federation Trooper', hp: 120, speed: 7, jump: 8.5, weapon: 'rifle', home: 'bazaar',
      portal: null, knows: ['grenade', 'turret', 'blaster1', 'engine', 'lasers'], start: ['hull'],
      ability: { id: 'cuff', name: 'Stun Cuffs', cd: 12 },
      blurb: 'Enforcer of an interplanetary bureaucracy. Comes with a patrol ship and a lot of paperwork.',
      perk: 'Starts with a ship (B to board). Stun Cuffs freeze whoever is in front of you.',
      life: { normal: 'Loyal Trooper', breakout: 'Rogue Trooper', daily: ['report', 'dock'] },
      steps: [
        { name: 'Paperwork', desc: 'File a patrol report at the Bazaar Shipyard.', goal: { type: 'use', task: 'report', n: 1 } },
        { name: 'Questioning', desc: 'Question 5 locals (talk to them).', goal: { type: 'talk', n: 5 }, grants: ['armor1', 'legs1'] },
        { name: 'Law and order', desc: 'Defeat 3 players.', goal: { type: 'ko', n: 3 }, grants: ['blaster2', 'armor2'] },
        { name: 'Rogue Trooper', desc: 'Visit all 5 dimensions.', goal: { type: 'dims', n: 5 }, grants: ['drive', 'gunbuild', 'guncap1'], title: true },
      ],
    },
    hive: {
      name: 'Hive Mind', hp: 90, speed: 7, jump: 8.5, weapon: 'slap', home: 'moon',
      portal: null, knows: ['grenade', 'shrink'],
      ability: { id: 'assimilate', name: 'Assimilate', cd: 20 },
      blurb: 'One mind in many bodies. Charming, lonely, and very good at making friends do things.',
      perk: 'Assimilate turns nearby locals into followers that fight for you.',
      life: { normal: 'Small Collective', breakout: 'Planetary Hive', daily: ['shift', 'haggle'] },
      steps: [
        { name: 'Join us', desc: 'Talk to 8 locals.', goal: { type: 'talk', n: 8 }, grants: ['armor1', 'legs1'] },
        { name: 'Expansion', desc: 'Visit 3 different dimensions.', goal: { type: 'dims', n: 3 }, grants: ['hull', 'jetpack'] },
        { name: 'Planetary Hive', desc: 'Build a Ship Hull.', goal: { type: 'craft', r: 'hull' }, grants: ['engine', 'drive', 'lasers', 'gunbuild'], title: true },
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
  };

  // ---------- Progress helpers (shared so the client shows exactly what the server allows) ----------
  // A character's saved progress: { up: {recipeId: 1}, step: index of the next step, grants: [...] }
  MM.newProgress = function (arch) {
    const A = MM.ARCHETYPES[arch];
    const up = {};
    for (const r of A.start || []) up[r] = 1;
    return { up, step: 0, grants: [], cnt: { use: {}, dims: [], crafted: [], kill: {}, kills: 0, ko: 0, talk: 0, smash: 0, errand: 0 }, errands: [], tasks: {}, inv: { s: 0, c: 0, g: 0, p: 0, f: 0 }, chaos: 0 };
  };

  MM.hasGun = (arch, up) => !!(MM.ARCHETYPES[arch].portal || up.gunbuild);

  // Can this character build this recipe at all (lore + path), ignoring cost and place?
  // Returns null if yes, or the reason why not.
  MM.canKnow = function (arch, prog, id) {
    const A = MM.ARCHETYPES[arch], R = MM.RECIPES[id];
    if (!R) return 'Unknown recipe';
    if (A.knows !== '*' && !A.knows.includes(id) && !prog.grants.includes(id)) return 'Not part of your life yet. Follow your path (J) to unlock it.';
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
      speed: A.speed * (up.legs1 ? 1.15 : 1) * (up.legs2 ? 1.15 : 1),
      jump: A.jump * (up.legs1 ? 1.1 : 1) * (up.legs2 ? 1.1 : 1),
      fly: A.fly || up.wings ? 'wings' : up.jetpack ? 'jet' : null,
      dmg: (up.blaster1 ? 1.3 : 1) * (up.blaster2 ? 1.4 : 1),
      gun: null, ship: null,
    };
    s.flyTime = s.fly === 'wings' ? 6 : s.fly === 'jet' ? 2.5 : 0;
    if (MM.hasGun(arch, up)) {
      const base = A.portal || { charges: 2, recharge: 25 };
      s.gun = { charges: base.charges + (up.guncap1 ? 1 : 0) + (up.guncap2 ? 1 : 0), recharge: base.recharge * (up.gunfast ? 0.65 : 1) };
    }
    if (up.hull) s.ship = { speed: up.engine ? 30 : 19, lasers: !!up.lasers, drive: !!up.drive };
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
    species: ['human', 'alien', 'birdfolk', 'robot', 'beanling', 'blob'],
    hair: ['spiky', 'tuft', 'bowl', 'mohawk', 'afro', 'ponytail', 'slick', 'bald'],
    brow: ['uni', 'normal', 'angry', 'none'],
    eyes: ['normal', 'wide', 'sleepy', 'cyclops', 'three', 'visor'],
    mouth: ['flat', 'grin', 'frown', 'open', 'drool'],
    top: ['labcoat', 'tshirt', 'polo', 'sweater', 'armor', 'vest', 'none'],
    acc: ['none', 'goggles', 'antennae', 'tophat', 'headband', 'eyepatch', 'halo', 'crown', 'cap'],
    nums: { height: [0.8, 1.3], width: [0.75, 1.35], head: [0.8, 1.45] },
    colors: ['skin', 'hairColor', 'topColor', 'shirtColor', 'pantsColor', 'shoeColor', 'accColor', 'portalColor'],
  };

  MM.defaultLook = function () {
    return {
      species: 'human', hair: 'spiky', brow: 'uni', eyes: 'normal', mouth: 'flat', top: 'labcoat', acc: 'none',
      height: 1.15, width: 0.95, head: 1.1,
      skin: '#f2d2b6', hairColor: '#b9d4e0', topColor: '#f4f6f8', shirtColor: '#7fb2d6', pantsColor: '#6b4f2c',
      shoeColor: '#3a2a1a', accColor: '#444444', portalColor: '#39ff6a',
    };
  };

  // Turn whatever a client sent into a safe look: unknown fields dropped, enums and
  // colors checked, numbers clamped.
  MM.sanitizeLook = function (raw) {
    const out = MM.defaultLook();
    if (!raw || typeof raw !== 'object') return out;
    for (const k of ['species', 'hair', 'brow', 'eyes', 'mouth', 'top', 'acc']) {
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

  // Names: letters, digits, spaces and a little punctuation, 2-16 characters.
  MM.sanitizeName = function (raw) {
    let s = typeof raw === 'string' ? raw : '';
    s = s.normalize('NFKC').replace(/[^\p{L}\p{N} _.\-']/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
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
