// Multiverse Mayhem: game rules shared by the client, the server and the bots.
// Plain script: in a browser it fills the global MM, in Node `require` it.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.VERSION = 1;               // protocol version; client and server must match
  MM.TICK = 1 / 30;             // server simulation step (seconds)
  MM.SNAP_EVERY = 2;            // a snapshot every 2 ticks = 15 per second
  MM.INSTANCE_CAP = 64;         // players per dimension instance (servers can raise it)
  MM.WORLD_HALF = 170;          // playable area is -170..170 on x and z
  MM.RESPAWN_TIME = 4;
  MM.SPAWN_PROTECT = 3;

  // Archetypes: who you are decides what you can do, like in the lore.
  // weapon: what the main attack fires. portal: own portal gun (charges, recharge seconds).
  // craft: which gadgets you know how to build.
  MM.ARCHETYPES = {
    genius: {
      name: 'Genius Scientist', hp: 80, speed: 7, jump: 8.5, weapon: 'plasma',
      portal: { charges: 3, recharge: 14 }, craft: ['grenade', 'turret', 'boots', 'shrink', 'mega', 'fluid'],
      ability: { id: 'shield', name: 'Science Shield', cd: 16, dur: 4 },
      blurb: 'Smartest being in any dimension. Owns a portal gun, builds anything, but is fragile and has a terrible attitude.',
      perk: 'Crafting costs a third less. Portal gun with 3 charges.',
    },
    sidekick: {
      name: 'Reluctant Sidekick', hp: 100, speed: 7.5, jump: 8.5, weapon: 'blaster',
      portal: { charges: 1, recharge: 35 }, craft: ['grenade', 'boots', 'fluid'],
      ability: { id: 'sprint', name: 'Panic Sprint', cd: 11, dur: 3 },
      blurb: 'Dragged along on every adventure. Panics a lot, survives anyway.',
      perk: 'Dodges 20% of hits out of pure luck. Borrowed portal gun with 1 charge.',
    },
    joe: {
      name: 'Average Joe', hp: 100, speed: 6.5, jump: 7.5, weapon: 'toy',
      portal: null, craft: ['grenade'],
      ability: { id: 'sob', name: 'Sob Story', cd: 18, dur: 3 },
      blurb: 'Completely normal. No portal gun, no powers, no idea. Has to bum rides through other people\'s portals or take the public kiosk.',
      perk: 'So unremarkable that monsters and turrets ignore him.',
    },
    birdfolk: {
      name: 'Birdfolk Warrior', hp: 140, speed: 8, jump: 9, weapon: 'talon', fly: true,
      portal: null, craft: [],
      ability: { id: 'dive', name: 'Dive Strike', cd: 8 },
      blurb: 'Proud warrior of a winged people. Flies, fights, and has a life of his own beyond your adventures.',
      perk: 'Can fly (hold Jump). Strong melee. Does not do gadgets.',
    },
    beanling: {
      name: 'Cheerful Beanling', hp: 70, speed: 8.5, jump: 9, weapon: 'slap',
      portal: null, craft: ['grenade', 'boots'],
      ability: { id: 'cheer', name: 'Cheer Up', cd: 13 },
      blurb: 'Tall, polite and always happy to see you. Nobody remembers meeting one, but everyone loves them.',
      perk: 'Heals everyone nearby. Whoever takes one down feels awful (slowed for 10 s).',
    },
    mutant: {
      name: 'Meat Mutant', hp: 200, speed: 5.5, jump: 7, weapon: 'punch',
      portal: null, craft: [],
      ability: { id: 'slam', name: 'Body Slam', cd: 9 },
      blurb: 'A lab accident made flesh. Huge, slow, and very hard to kill.',
      perk: 'Regenerates 3 health per second. Body Slam knocks everyone back.',
    },
  };
  MM.ARCH_IDS = Object.keys(MM.ARCHETYPES);

  // Weapons. Ranged ones fire a projectile the server simulates; melee hits instantly in front.
  MM.WEAPONS = {
    plasma:  { dmg: 12, cd: 0.25, speed: 70, range: 75, color: '#5dff8a' },
    blaster: { dmg: 9,  cd: 0.3,  speed: 60, range: 65, color: '#ffd84d' },
    toy:     { dmg: 5,  cd: 0.45, speed: 45, range: 45, color: '#ff8fd0' },
    talon:   { dmg: 24, cd: 0.55, melee: 3.6 },
    slap:    { dmg: 7,  cd: 0.4,  melee: 2.8 },
    punch:   { dmg: 20, cd: 0.75, melee: 3.4, knock: 9 },
  };

  // Gadgets. cost: scrap (s) and crystals (c). Genius pays a third less (rounded up).
  MM.GADGETS = {
    grenade: { name: 'Gravity Grenade', cost: { s: 3, c: 0 }, max: 5, desc: 'Throw it. Blows up props and launches people.' },
    turret:  { name: 'Auto-Turret',     cost: { s: 6, c: 1 }, max: 2, desc: 'Deploys a turret that shoots anyone near it for 45 s.' },
    shrink:  { name: 'Shrink Ray Shot', cost: { s: 4, c: 2 }, max: 3, desc: 'One shot that shrinks the target to half size for 8 s.' },
    boots:   { name: 'Jump Boots',      cost: { s: 4, c: 1 }, max: 1, passive: true, desc: 'Jump much higher until you die.' },
    mega:    { name: 'Mega Blaster',    cost: { s: 8, c: 2 }, max: 1, passive: true, desc: 'Double weapon damage until you die.' },
    fluid:   { name: 'Portal Fluid',    cost: { s: 0, c: 2 }, max: 1, instant: true, desc: 'Refills one portal gun charge right away.' },
  };
  MM.GADGET_IDS = Object.keys(MM.GADGETS);

  MM.gadgetCost = function (arch, id) {
    const g = MM.GADGETS[id];
    if (arch !== 'genius') return g.cost;
    return { s: Math.ceil(g.cost.s * 2 / 3), c: Math.ceil(g.cost.c * 2 / 3) };
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
