// Multiverse Mayhem: the Smith house's defences, and whose they are. Every Earth's house is
// its own Rick's: he can use all of it, from the console in the garage or (voice activation)
// by just saying so anywhere near the house. Nobody else can, except another Rick who hacks
// his way in (stand at the console for a few seconds: ten minutes of access), his own clones
// included. Crafting at the
// workbench stays open to any Rick at any garage.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // The house, the garage and the yard: what the forcefield covers (same place on every Earth).
  MM.HOUSE = { x: -20, z: 21, r: 19 };
  // Where you can be for "House, ..." to hear you.
  MM.VOICE_RANGE = 80;
  MM.HACK_TIME = 8;        // seconds at the console
  MM.HACK_FOR = 600;       // seconds of access once you are in

  // id: { name, icon, dur (s, 0 = instant), cd (s), say (what the house answers), desc }.
  MM.DEFENSES = {
    shield:  { name: 'Forcefield', icon: '🛡️', dur: 90, cd: 150, say: 'Forcefield up.', desc: 'A dome over the house, the garage and the yard. Nobody gets in, no shots get through.' },
    doors:   { name: 'Blast doors', icon: '🚪', dur: 120, cd: 150, say: 'Blast doors down. Nobody in, nobody out.', desc: 'Metal shutters over every door and window. Only you (and your team) can get in.' },
    turrets: { name: 'Turrets', icon: '🔫', dur: 60, cd: 120, say: 'Turrets deployed.', desc: 'Turrets on the roof and a laser turret over the front door.' },
    cannon:  { name: 'Large energy weapon', icon: '💥', dur: 45, cd: 180, say: 'Charging the big one.', desc: 'A huge energy cannon rises out of the garage roof.' },
    grid:    { name: 'Laser grid', icon: '🟥', dur: 90, cd: 120, say: 'Garage locked down.', desc: 'Lasers across the garage. Anyone else inside gets cut.' },
    bots:    { name: 'Kill bots', icon: '🤖', dur: 60, cd: 150, say: 'Kill bots activated.', desc: 'Three kill bots guard the house.' },
    drones:  { name: 'Boombox drones', icon: '📢', dur: 60, cd: 120, say: 'Drones up. Volume: Rick.', desc: 'Floating drones that blast your voice at intruders and zap them.' },
    plants:  { name: 'Carnivorous plants', icon: '🌱', dur: 60, cd: 150, say: 'Feeding time.', desc: 'Man-eating plants from Sublevel B2 pop up in the yard.' },
    holo:    { name: 'Hologram Rick', icon: '👤', dur: 60, cd: 120, say: 'Hologram projector on.', desc: 'A hologram of you. Monsters go for it instead of you.' },
    fungus:  { name: 'Fungus clone', icon: '🍄', dur: 45, cd: 240, say: 'Growing a fungus clone. Destroy it before it eats the planet.', desc: 'A fungus clone that copies your voice. Destroy it within 45 seconds, or it starts eating the world.' },
    vat:     { name: 'Cloning vat', icon: '🧪', dur: 0, cd: 300, say: 'Backup body ready.', desc: 'Grow a backup body: you are healed, and the next time you die you wake up in the garage.' },
    stash:   { name: 'Hidden gun stash', icon: '🧺', dur: 0, cd: 300, say: 'The washing machine opens.', desc: 'The washing machine knob opens a hidden compartment: a grenade and a turret.' },
    shipbay: { name: 'Vehicle trapdoor', icon: '🛸', dur: 0, cd: 30, say: 'Opening the floor.', desc: 'The garage floor opens and your ship rises out of it, with you in it.' },
    lab:     { name: 'Retractable lab', icon: '🧰', dur: 120, cd: 150, say: 'Lab retracted.', desc: 'The lab folds into the walls: nobody else can use the garage or go down to the lab.' },
    tele:    { name: 'Large teleporter', icon: '🌀', dur: 0, cd: 60, say: 'Teleporting.', desc: 'Teleports you (and your team) to another part of this Earth.' },
    wardrobe: { name: 'Retractable wardrobe', icon: '👔', dur: 0, cd: 5, say: 'Wardrobe out.', desc: 'Change your look.' },
  };
  MM.DEFENSE_IDS = Object.keys(MM.DEFENSES);
  // Where the large teleporter can take you, on any Earth.
  MM.TELE_SPOTS = [
    { name: 'Downtown', x: 400, z: 20 }, { name: 'Washington, D.C.', x: -400, z: 20 }, { name: 'Area 51', x: 0, z: -380 }, { name: 'the beach', x: 0, z: 310 },
  ];
  // Inside the house's forcefield?
  MM.inHouse = (x, z) => (x - MM.HOUSE.x) ** 2 + (z - MM.HOUSE.z) ** 2 < MM.HOUSE.r * MM.HOUSE.r;
  // The garage (the laser grid's box).
  MM.inGarage = (x, z) => x > -20 && x < -10 && z > 23.5 && z < 33.6;

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
