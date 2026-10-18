// Multiverse Mayhem: curios, the odd things from the show lying around the multiverse.
// Each one turns up in the worlds it belongs to; you keep them in your inventory (I), some
// you can use, and the collection log shows what you have found and hints at the rest.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // use: what happens when you use it (sim/host.js), or nothing (a keepsake you can look at).
  // eat: it's used up. w: how common (higher = more common). text: what you see when you use
  // or inspect it.
  MM.CURIOS = {
    // Made, not found (MM.RECIPES): how: where they come from. on: can be used on someone else
    // ('ask': they must say yes).
    miniaturizer: { name: 'Miniaturizer', icon: '🔬', color: '#7ad8ff', dims: [], w: 0, use: 'tiny', on: 'ask', how: 'Built at Rick\'s workbench', desc: 'Shrinks you to the size of a bug. Use it again to grow back. Tiny, you can go into the Mega Gargantuans\' land.', text: '' },
    fieldvial: { name: 'Bottled immortality field', icon: '🫙', color: '#bfe4ff', dims: ['resort'], w: 2, use: 'heal', eat: true, desc: 'A little of the resort\'s immortality field, in a jar. It does not make you immortal. It does fix you right up.' },
    gargflag: { name: 'Mega Gargantuan flag', icon: '🚩', color: '#3a8a5a', dims: ['gargantua'], w: 2, desc: 'The national flag of Mega Gargantua. Full size: about as big as a grain of rice.', text: 'You wave it. Somewhere, a very small anthem plays.' },
    armserum: { name: 'Muscle Memory Serum', icon: '💉', color: '#ff7a5a', dims: [], w: 0, use: 'armserum', on: 'ask', eat: true, how: 'A Rick makes it at his workbench', desc: 'A dead warrior\'s arm, in a syringe. Only works on a Morty.', text: '' },
    szechuan:   { name: 'Szechuan Sauce', icon: '🥡', color: '#c8302a', dims: ['suburbia', 'downtown', 'dc', 'smithhouse', 'shoneysin'], w: 2, use: 'feast', eat: true, desc: 'The McNugget sauce from 1998. Rick would go to war for it.', text: "It's real. It's really real. You feel unstoppable." },
    eyeholes:   { name: 'Eyeholes cereal', icon: '🥣', color: '#ffb43a', dims: ['suburbia', 'downtown', 'mallin', 'smithhouse'], w: 3, use: 'speed', eat: true, desc: 'The cereal with the holes for eyes.', text: 'Crunchy. Somewhere, a blue man is furious about this.' },
    plumbus:    { name: 'A plumbus', icon: '🔧', color: '#ff8fc8', dims: ['plumbus', 'cableworld', 'smithhouse', 'bazaar'], w: 3, desc: 'Everyone has one. Nobody can explain it.', text: 'You turn it over in your hands. It is a plumbus. That is all it needs to be.' },
    deathcrystal: { name: 'Death Crystal', icon: '💎', color: '#5ff8c8', dims: ['megaseed', 'beyond', 'wasteland'], w: 1, use: 'fate', eat: true, desc: 'Shows you every way you might die.', text: 'You saw yourself dying old and in bed, surrounded by love. For a few seconds nothing can touch you.' },
    lovepotion: { name: 'Love potion', icon: '🧪', color: '#ff6fd0', dims: ['meatlands', 'suburbia', 'citadel'], w: 1, use: 'love', eat: true, desc: 'Made from vole DNA. What could go wrong.', text: 'Everyone nearby is suddenly very, very into you.' },
    kalaxian:   { name: 'Kalaxian Crystals', icon: '🔮', color: '#b48aff', dims: ['gearworld', 'bazaar', 'blips', 'moon'], w: 2, use: 'trip', eat: true, desc: 'They make you see the music.', text: 'Oh wow. The colours have sounds. You feel better and also very confused.' },
    darkmatter: { name: 'Concentrated Dark Matter', icon: '⚫', color: '#4a3a6a', dims: ['federation', 'gearworld', 'moon', 'citadel'], w: 1, use: 'charge', eat: true, desc: 'Rick\'s secret ship fuel. The Federation would kill for the formula.', text: 'One more jump in the portal gun.' },
    fleebjuice: { name: 'Fleeb juice', icon: '🧃', color: '#8fe06a', dims: ['plumbus', 'cableworld'], w: 3, use: 'heal', eat: true, desc: 'Squeezed from a fleeb. Pairs well with a schlami.', text: 'Fleeby. You feel patched up.' },
    goggles:    { name: 'Interdimensional Goggles', icon: '🥽', color: '#5fb4ff', dims: ['suburbia', 'smithhouse', 'citadel', 'downtown'], w: 1, use: 'vision', desc: 'See yourself in another reality, as long as you like.', text: '' },
    butter:     { name: 'Pat of butter', icon: '🧈', color: '#ffe066', dims: ['smithhouse', 'suburbia', 'shoneysin'], w: 3, use: 'snack', eat: true, desc: 'Passed to you by a small robot who now questions its purpose.', text: 'You eat the butter. The robot that brought it says "oh my god".' },
    realfakedoor: { name: 'A Real Fake Door', icon: '🚪', color: '#c8a46a', dims: ['cableworld'], w: 2, desc: "Don't get in there, it's fake!", text: 'You open it. It is a door to nowhere. Exactly as advertised.' },
    mrpbfigure: { name: 'Mr. Poopybutthole figurine', icon: '🎩', color: '#ffd447', dims: ['suburbia', 'citadel', 'bazaar', 'smithhouse'], w: 1, desc: 'Ooo-wee! A real family friend. Probably.', text: 'Ooo-wee!' },
    tinyrick:   { name: "Tiny Rick's guitar", icon: '🎸', color: '#e8643a', dims: ['schoolin', 'suburbia'], w: 1, desc: 'Let me out! Let me out! This is not a dance!', text: 'You strum it. Somewhere, a tiny voice screams for help in a very catchy way.' },
    truthtortoise: { name: 'Truth Tortoise pebble', icon: '🐢', color: '#7a9a5a', dims: ['wasteland', 'beyond'], w: 1, use: 'truth', desc: 'A pebble from the Truth Tortoise. It knows things.', text: '' },
    snowballhelmet: { name: "Snowball's smart helmet", icon: '⛑️', color: '#d8dde2', dims: ['dogworld'], w: 1, use: 'shield', eat: true, desc: 'Made Snuffles very smart. Then very angry.', text: 'For a moment you understand everything, and a force field with it.' },
    gazorpfield: { name: 'Gazorpazorpfield comic', icon: '📰', color: '#ff9b4d', dims: ['gazorp', 'cableworld'], w: 2, desc: 'He hates Mondays. He hates you too.', text: '"Give me my enchiladas, Jon." Classic.' },
    squanchtooth: { name: "Squanchy's tooth", icon: '🦷', color: '#f4f0e8', dims: ['squanch'], w: 1, use: 'rage', eat: true, desc: 'Something in it makes you squanch out.', text: 'SQUAAANCH! You are faster and much harder to hurt for a while.' },
    cromulon:   { name: 'Cromulon ticket', icon: '🎟️', color: '#f2c8a0', dims: ['area51', 'dc'], w: 1, desc: 'Admit one to Planet Music.', text: 'SHOW ME WHAT YOU GOT!' },
    microbattery: { name: 'Microverse battery', icon: '🔋', color: '#5ff8ff', dims: ['microverse', 'rickgarage'], w: 1, use: 'shield', eat: true, desc: 'A whole civilisation powers it, and they do not know.', text: 'A tiny planet\'s worth of power wraps around you as a shield.' },
    schmeckles: { name: 'Bag of Schmeckles', icon: '💰', color: '#ffd84d', dims: ['citadel', 'blips', 'bazaar', 'federation'], w: 3, use: 'cash', eat: true, desc: 'Squanchy-approved currency.', text: 'Five Schmeckles. How much is that? Nobody knows.' },
    cableremote: { name: 'Interdimensional cable remote', icon: '📺', color: '#59d8ff', dims: ['cableworld', 'smithhouse'], w: 2, use: 'channel', desc: 'Every channel in the multiverse.', text: '' },
    hamster:    { name: 'Hamster friend', icon: '🐹', color: '#d8a870', dims: ['hamsterworld'], w: 2, desc: 'Lives in a butt. Is happy about it.', text: '*squeak*' },
    pizzaphone: { name: 'A phone that is also a pizza', icon: '🍕', color: '#e8643a', dims: ['pizzaworld'], w: 2, use: 'heal', eat: true, desc: 'Or a pizza that is also a phone. Hello?', text: 'You ate it. It was on a call.' },
    lollipop:   { name: 'Froopyland lollipop', icon: '🍭', color: '#ff8fc8', dims: ['froopy'], w: 3, use: 'heal', eat: true, desc: 'Grown on a lollipop tree by a little girl who wanted a world of her own.', text: 'Sweet. Suspiciously sweet.' },
    parkticket: { name: 'Anatomy Park ticket', icon: '🎫', color: '#ff5a5a', dims: ['anatomy'], w: 2, desc: 'Ride Pirates of the Pancreas! (Not responsible for hepatitis.)', text: 'Admit one. Into a man.' },
    unityring:  { name: "Unity's bracelet", icon: '💍', color: '#5fd6b0', dims: ['unityworld'], w: 1, desc: 'From a hive mind who was always just a little too into Rick.', text: 'For a second, a whole planet says hi.' },
    birdfeather: { name: 'Phoenix feather', icon: '🪶', color: '#ff7a3a', dims: ['featherhold'], w: 2, use: 'heal', eat: true, desc: 'From the bird people of Bird World. Warm to the touch.', text: 'Caw. You feel the heat of a rebirth, a small one.' },
    purgemask: { name: 'Purge mask', icon: '🎭', color: '#e8e0d0', dims: ['purge'], w: 2, use: 'rage', eat: true, desc: 'One night a year, anything goes. Tonight is that night.', text: 'You put it on. Something in you wants to purge.' },
    // ----- The solar system -----
    plutomedal: { name: '"Pluto is a planet" medal', icon: '🏅', color: '#ffd84d', dims: ['pluto'], w: 2, desc: 'King Flippy Nips gives one to everyone who agrees with him. Everyone has one.', text: 'It says PLUTO IS A PLANET on both sides, in case you forget halfway.' },
    plutonium:  { name: 'Chunk of plutonium', icon: '☢️', color: '#7aff6a', dims: ['pluto', 'mars'], w: 2, use: 'charge', eat: true, desc: 'Mined out of Pluto, which is shrinking. Do not lick it.', text: 'You put it in the portal gun. It hums. One more jump.' },
    roverpart:  { name: 'Mars rover wheel', icon: '🛞', color: '#c8c8c8', dims: ['mars'], w: 2, desc: 'From a rover that was still sending pictures home of a Martian knight waving.', text: 'Property of NASA. Finders keepers.' },
    sulphur:    { name: 'Venusian smelling salts', icon: '🧂', color: '#ffe27a', dims: ['venus'], w: 2, use: 'heal', eat: true, desc: 'The Viscounts sniff them at banquets. One sniff and you are wide awake.', text: 'Your eyes water, your nose burns and your wounds feel better. Venus is like that.' },
    horseshoe:  { name: 'Mercurian horseshoe', icon: '🧲', color: '#ff9a2a', dims: ['mercury'], w: 2, use: 'speed', eat: true, desc: 'Still warm. Mercurian horses are very fast and run very hot.', text: 'You nail it to your shoe. You are very fast, for a while.' },
    redspot:    { name: 'Bottled Red Spot', icon: '🌀', color: '#c8402a', dims: ['jupiter'], w: 1, use: 'rage', eat: true, desc: 'A little of a storm that has been raging for centuries.', text: 'You open it. The storm gets into you. You are very hard to stop.' },
    ringshard:  { name: 'Piece of a ring of Saturn', icon: '💍', color: '#e8d8b0', dims: ['saturn', 'titan', 'uranus'], w: 2, desc: 'They have all the rings. They will not miss one bit. They WILL notice.', text: 'Ice and dust, catching the light. Very pretty, very cold.' },
    titantrophy: { name: "The Warlord's trophy", icon: '💀', color: '#e8e0c8', dims: ['titan'], w: 1, use: 'fate', eat: true, desc: 'From the Warlord of Titan\'s trophy room. He makes people choose.', text: 'You choose. For once nothing chooses you: nothing can touch you for a while.' },
    neptunepearl: { name: "Neptune's pearl", icon: '⚪', color: '#e8f0ff', dims: ['neptune'], w: 2, use: 'heal', eat: true, desc: 'From the bottom of the only sea that is a planet.', text: 'Cool and calm. You feel the tide go through you and take the hurt with it.' },
    sunbadge:   { name: 'Knight of the Sun badge', icon: '☀️', color: '#ffb02a', dims: ['sun'], w: 2, use: 'shield', eat: true, desc: 'Knights pay a terrible price for theirs. You found this one on the walkway.', text: 'It flares up and wraps you in sunlight. Nothing gets through for a while.' },
    iceshard:   { name: 'Uranian ice', icon: '🧊', color: '#a8ecf0', dims: ['uranus', 'neptune'], w: 3, use: 'snack', eat: true, desc: 'Nobody lives on Uranus, so nobody minds if you take some ice.', text: 'Crunchy. Tastes faintly of methane. No jokes, please.' },
    goobleshoe: { name: 'Gooble box stomping boot', icon: '👢', color: '#d8a0e8', dims: ['miniverse', 'microverse'], w: 2, use: 'speed', eat: true, desc: 'Worn smooth from stomping the power out of a gooble box.', text: 'You stomp. Somewhere a universe gets brighter and you get faster.' },
    teenyspear: { name: 'Teenyverse spear', icon: '🔱', color: '#8a5a2a', dims: ['teenyverse'], w: 2, use: 'rage', eat: true, desc: 'From the tree people of the Teenyverse. Rick and Zeep each had one for a while.', text: 'You feel like fighting another scientist in a tree for months.' },
    fakebones: { name: 'Fake bones', icon: '🦴', color: '#f4f0e0', dims: ['downtown'], w: 1, desc: 'Rick threw them into the vat of acid. Very convincing, if you do not look closely.', text: 'They squeak a little when you squeeze them.' },
    snakejazz: { name: 'Snake Jazz record', icon: '🎷', color: '#4aa86a', dims: ['whitehousein', 'downtown', 'snakeplanet'], w: 1, use: 'channel', desc: 'Ssss-ss-sss. The President listens to it alone.', text: '' },
    wongpad: { name: "Dr. Wong's notepad", icon: '🗒️', color: '#f0e8d0', dims: ['officein'], w: 2, use: 'truth', desc: 'Her notes on the family. They are brutal and correct.', text: '' },
    rubenkidney: { name: 'Spare kidney (labelled "Ruben")', icon: '🫘', color: '#c84a5a', dims: ['hospitalin', 'anatomy'], w: 2, use: 'snack', eat: true, desc: 'From the hospital fridge. Probably fine.', text: 'You... ate it. Anatomy Park lost a ride.' },
    flask: { name: "Rick's flask", icon: '🫗', color: '#9aa8b4', dims: ['ricklab', 'rickgarage', 'cellar'], w: 2, use: 'trip', eat: true, desc: 'Whatever is in it is older than you.', text: 'Burrrp. Wubba lubba dub dub.' },
    mindblowers: { name: "Morty's Mind Blowers vial", icon: '🧠', color: '#c8a0ff', dims: ['ricklab', 'cellar'], w: 1, use: 'vision', desc: 'A memory Rick took away. You probably should not look.', text: '' },
    snakecollar: { name: 'Snake time collar', icon: '🐍', color: '#c8e04a', dims: ['snakeplanet'], w: 1, use: 'fate', eat: true, desc: 'A snake used it to go back in time and stop a war. It still has one jump left.', text: 'You slip a few seconds out of time. Nothing can touch you while you are gone.' },
    dinotooth: { name: 'Raptor tooth', icon: '🦖', color: '#f0e8d0', dims: ['dinoearth'], w: 2, use: 'rage', eat: true, desc: 'From before the asteroid. Still sharp.', text: 'You feel 65 million years of fury. Briefly.' },
    dinoseed:  { name: 'Prehistoric Mega Seed', icon: '🌰', color: '#c8ff6a', dims: ['dinoearth'], w: 1, use: 'trip', eat: true, desc: 'The dinosaurs said "for later". It is later.', text: 'Ancient seed, ancient high. You see the asteroid coming. You feel fine about it.' },
    magicbean: { name: 'Magic bean', icon: '🫘', color: '#8ad84a', dims: ['giantland'], w: 2, use: 'speed', eat: true, desc: 'Grows a beanstalk. Or, if you eat it, very fast legs.', text: 'You ate the bean. Your legs feel like beanstalks: long and in a hurry.' },
    giantcoin: { name: "A giant's coin", icon: '🪙', color: '#ffd84d', dims: ['giantland'], w: 2, use: 'cash', eat: true, desc: 'The size of a manhole cover. Worth a lot of Schmeckles to the right fence.', text: 'You sold it to a very small fence for five Schmeckles.' },
    nimbuspearl: { name: "Mr. Nimbus's pearl", icon: '🦪', color: '#e8f0ff', dims: ['atlantis'], w: 1, use: 'shield', eat: true, desc: 'He controls the sea. This pearl controls a bit of it.', text: 'A bubble of the sea wraps around you and turns away blows.' },
    seaglass:  { name: 'Atlantean sea glass', icon: '🫧', color: '#5ff8e0', dims: ['atlantis'], w: 3, use: 'heal', eat: true, desc: 'Glows in the dark water. Atlanteans use it as medicine.', text: 'Cool and salty. Your scrapes close up.' },
    terryhat:  { name: "Scary Terry's hat", icon: '🎩', color: '#5a3a2a', dims: ['dreamworld'], w: 1, desc: 'You can run, but you cannot hide.', text: 'You put it on. Somewhere, someone wakes up screaming.' },
    dreamkey:  { name: 'Key to a floating door', icon: '🗝️', color: '#ffe066', dims: ['dreamworld'], w: 2, use: 'vision', desc: 'Opens one of the doors in the dream. They all lead to other lives.', text: '' },
    timeshard: { name: 'Shard of a split timeline', icon: '⌛', color: '#8fd8ff', dims: ['splitearth'], w: 2, use: 'truth', desc: 'A sliver of the moment Summer and Morty froze time.', text: '' },
    storyticket: { name: 'Story Train ticket', icon: '🎫', color: '#d8a8ff', dims: ['storytrain'], w: 2, use: 'vision', desc: 'Good for one story. Any story. Mostly predictable ones.', text: '' },
    toxicvial: { name: "Rick's toxins, bottled", icon: '☣️', color: '#a8ff3a', dims: ['toxicworld'], w: 2, use: 'rage', eat: true, desc: 'All of Rick\'s worst parts in a vial. You probably should not drink it.', text: 'You drank it. You feel like a real jerk, and a fast one.' },
    darkmatterfake: { name: 'Fake Dark Matter recipe', icon: '📜', color: '#5aff8a', dims: ['zigerion'], w: 2, desc: 'The recipe Rick gave the Zigerions. Step one: fold the paper into a swan.', text: 'Step two: give up.' },
    doofuspants: { name: "Doofus Rick's homemade pants", icon: '👖', color: '#6a8ad8', dims: ['doofusearth'], w: 2, desc: 'He made them himself. He is very proud. They are... pants.', text: 'They are a little crooked. You love them anyway.' },
  };
  MM.CURIO_IDS = Object.keys(MM.CURIOS);
  MM.isCurio = c => typeof c === 'string' && c.startsWith('q:') && !!MM.CURIOS[c.slice(2)];

  // The curios that turn up in a world (home dimensions share the show's Earth's).
  MM.curiosOf = dimId => {
    const D = MM.DIM_BY_ID[dimId], key = D && (D.home || D.variantOf) ? 'suburbia' : dimId;
    const keys = [key, dimId].concat((D && D.regions || []).map(R => R.dim));   // Earth's towns are part of Earth
    return MM.CURIO_IDS.filter(id => keys.some(k => MM.CURIOS[id].dims.includes(k)));
  };
  // How many lie around at once: a handful outside, one or two indoors.
  MM.curioCount = dimId => { const D = MM.DIM_BY_ID[dimId]; return MM.curiosOf(dimId).length ? (D.interior ? 2 : 6 * (1 + (D.regions ? D.regions.length : 0))) : 0; };
  MM.pickCurio = (dimId, rand) => {
    const ids = MM.curiosOf(dimId);
    let t = 0; for (const id of ids) t += MM.CURIOS[id].w;
    let x = (rand || Math.random)() * t;
    for (const id of ids) if ((x -= MM.CURIOS[id].w) <= 0) return id;
    return ids[0];
  };
  // Things the goggles, the tortoise and the remote show you.
  MM.CURIO_LINES = {
    vision: ['In this one you are a car salesman. You are very, very good at it.', 'In this one you have hot dogs for fingers. You are a great pianist with your feet.', 'In this one you never left your room. It looks peaceful.', 'In this one you are the President, and everyone hates it.', 'In this one you are a chair. A comfortable one.'],
    truth: ['The tortoise says: nobody exists on purpose. Nobody belongs anywhere. Come watch TV.', 'The tortoise says: the Council of Ricks is not what it seems.', 'The tortoise says: you are standing on a planet that is also a man.', 'The tortoise says: the Smiths are the only family in the Curve that keeps getting the same Rick.'],
    channel: ['Ball Fondlers is on. It is the episode with the balls.', 'Two Brothers. They are in a van. Things are about to get crazy.', 'Ants in my Eyes Johnson! Everything is black!', 'A commercial for Real Fake Doors. You are tempted.', 'Baby Legs, the detective with baby legs, is on the case.'],
  };

  // Using one on someone else (Host.onUseOn): 'help' just happens (a snack for a friend),
  // 'hurt' needs both of you to have fights on, 'ask' needs them to say yes.
  const ON = { feast: 'help', speed: 'help', fate: 'help', heal: 'help', snack: 'help', shield: 'help', rage: 'help', cash: 'help', charge: 'help', love: 'help', trip: 'hurt' };
  for (const k in MM.CURIOS) if (!MM.CURIOS[k].on && ON[MM.CURIOS[k].use]) MM.CURIOS[k].on = ON[MM.CURIOS[k].use];
  // What can change hands between players: materials, gadgets, curios.
  MM.tradeable = k => typeof k === 'string' && (MM.MAT_IDS.includes(k) || (MM.GADGET_IDS || []).includes(k) || (k.startsWith('q:') && !!MM.CURIOS[k.slice(2)]));
  MM.itemName = k => MM.MATERIALS[k] ? MM.MATERIALS[k].icon + ' ' + MM.MATERIALS[k].name : MM.RECIPES[k] ? MM.RECIPES[k].name : k.startsWith('q:') && MM.CURIOS[k.slice(2)] ? MM.CURIOS[k.slice(2)].icon + ' ' + MM.CURIOS[k.slice(2)].name : k;

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
