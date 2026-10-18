// Multiverse Mayhem: the cast. Every dimension has its own people: each Earth its Rick, Morty,
// Summer, Beth and Jerry (Cronenberged Earth its barbarian Summer, Beth and Jerry; the Ricks
// and Mortys of that one left), Bird World its Birdperson, Planet Squanch its Squanchy...
// Each of them exists once. A player who picks one takes them over; until then they live their
// lives as locals, and the ones who can travel do: Ricks and Evil Morty by portal (in their own
// colours), Morty tags along with his Rick, Federation officers by ship, Birdperson on his wings.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  const SMITHS = ['genius', 'sidekick', 'teen', 'surgeon', 'joe'];
  // Who lives in a dimension.
  MM.castOf = function (dimId) {
    const D = MM.DIM_BY_ID[dimId];
    if (!D || D.interior || D.hidden || D.planets || D.pocket && dimId !== 'froopy') return [];
    if (dimId === 'froopy') return MM.ARCHETYPES.tommy ? ['tommy'] : [];
    if (dimId === 'dinoearth') return [];                                   // 65 million years ago
    if (dimId === 'meatlands') return ['teen', 'surgeon', 'joe', 'mutant'];   // Rick and Morty left
    if (dimId === 'c500a') return ['genius', 'surgeon', 'joe'];   // Beth and Jerry never married: no Morty, no Summer
    if (dimId === 'wasteland') return ['sidekick', 'teen'];   // Strong-arm Morty of the Ring of Death, and Summer of the Death Stalkers
    const W = MM.worldOf(dimId);
    if (W === 'earth') return dimId === 'suburbia' ? SMITHS.concat(['beanling']) : SMITHS.slice();
    return { birdworld: ['birdfolk'], squanch: ['squanchy'], federation: ['trooper'], unity: ['hive'], citadel: ['evilmorty'], bazaar: ['spacebeth'] }[W] || [];
  };
  // Which dimension's character a player is, from what they picked: Earth folk by their home
  // code (C-137 is the show's Earth), everyone else from their home world.
  MM.castHome = function (arch, home) {
    if (MM.EARTH_ARCHS.includes(arch) && arch !== 'evilmorty') return MM.homeDimId(home);
    const A = MM.ARCHETYPES[arch];
    return (A.homes || [A.home])[0];
  };
  MM.castKey = (arch, dimId) => arch + '@' + dimId;
  // Their name: "Rick C-137", "Beth SH-1", "Birdperson BW-1/IC".
  MM.castLabel = function (arch, dimId) {
    const A = MM.ARCHETYPES[arch], D = MM.DIM_BY_ID[dimId];
    const W = MM.WORLD_BY_ID[MM.worldOf(dimId)];
    return MM.CAST_NAMES[MM.castKey(arch, dimId)] || A.name + (D && (W && W.id === 'earth' || D.variantOf || D.timeline) ? ' ' + D.code : '');
  };
  // Some go by what they became there ("Rickmancing the Stone").
  MM.CAST_NAMES = { 'sidekick@wasteland': 'Strong-arm Morty', 'teen@wasteland': 'Post-Apocalyptic Summer' };
  // Where they spend their days (a landmark there), if not at home.
  MM.CAST_SPOT = { 'sidekick@wasteland': 'deathring', 'teen@wasteland': 'raidergarage' };
  // What they carry on them: Morty's giant arm, sewn on from a dead fighter.
  MM.castGear = (arch, dimId) => arch === 'sidekick' && dimId === 'wasteland' ? { strongarm: true } : {};
  // How they look there: the show's look, with the dimension's twist (shrimp people on Shrimp
  // Earth, barbarians on Cronenberged Earth, cats in a cat dimension...).
  const SPECIES = { shrimpearth: 'shrimp', teddyearth: 'teddy' };
  const TWIST_SPECIES = { cats: 'cat', robots: 'robot', aliens: 'alien', blobs: 'blob', CT: 'cat', PI: 'pickle' };
  MM.castLook = function (arch, dimId) {
    const L = MM.canonLook(arch), D = MM.DIM_BY_ID[dimId] || {};
    const human = L.species === 'human';
    if (human && SPECIES[dimId]) L.species = SPECIES[dimId];
    if (human && TWIST_SPECIES[D.twist]) L.species = TWIST_SPECIES[D.twist];
    // ...in that species' own colours.
    const SKIN = { shrimp: '#f2895c', teddy: '#b8865a', cat: '#c98a4a', robot: '#aab2ba', alien: '#8fd86a', blob: '#e07a85', pickle: '#7cbf3a' };
    if (human && SKIN[L.species]) L.skin = SKIN[L.species];
    if (dimId === 'c500a' && arch === 'joe') { L.top = 'vest'; L.topColor = '#1a1a1e'; L.shirtColor = '#f6f6f2'; L.acc = 'goggles'; L.accColor = '#1a1a1e'; }   // a movie star, in shades
    if (dimId === 'fascistearth') { L.shirtColor = '#3a3a3a'; if (L.top !== 'labcoat') L.topColor = '#3a3a3a'; L.accColor = '#c8273a'; }
    if (dimId === 'meatlands' && human) { L.top = 'vest'; L.topColor = '#6a4a2e'; L.shirtColor = '#8a6a44'; L.pantsColor = '#5a3e26'; L.skin = '#e0a898'; L.acc = arch === 'joe' ? 'headband' : 'none'; L.accColor = '#7a2a2a'; }
    // Summer of the Death Stalkers: leather and shoulder armour, a scowl, her hair a shade wilder.
    if (dimId === 'wasteland' && arch === 'teen') { L.top = 'armor'; L.topColor = '#4a3424'; L.shirtColor = '#2a201a'; L.pantsColor = '#2a2420'; L.shoeColor = '#1a1410'; L.brow = 'angry'; L.mouth = 'flat'; L.hairColor = '#e0602a'; }
    if (D.twist === 'CR') { L.skin = '#e0a0a0'; L.mouth = 'open'; }
    if (D.twist === 'MR') { const s = L.shirtColor; L.shirtColor = L.pantsColor; L.pantsColor = s; if (L.top !== 'labcoat') L.topColor = L.shirtColor; }
    if (D.twist === 'IC') { L.skin = '#d4e6f2'; L.hairColor = '#f2f8fc'; }
    if (D.twist === 'DK') { L.shirtColor = '#2a2a3a'; L.pantsColor = '#1e1e28'; }
    if (D.twist === 'JG') { L.topColor = '#4a8a3a'; L.shirtColor = '#5a9a46'; }
    if (D.twist === 'NE') { L.shirtColor = '#ff3ad8'; L.pantsColor = '#1a1a2a'; L.accColor = '#3af8ff'; if (L.acc === 'none') L.acc = 'goggles'; }
    if (D.twist === 'DE') { L.acc = 'tophat'; L.accColor = '#6a4a2a'; if (L.top !== 'labcoat') { L.top = 'vest'; L.topColor = '#8a5a2a'; } }
    if (D.twist === 'GO') { L.shirtColor = '#ffd84d'; L.pantsColor = '#c8a83a'; if (L.top !== 'labcoat') L.topColor = '#ffd84d'; else L.topColor = '#fff4c8'; }
    if (D.twist === 'FU') { L.skin = '#e0d4c0'; L.hairColor = '#a87a5a'; }
    return MM.sanitizeLook(L);
  };
  // How each can travel on their own: by portal (in their portal colour), by ship, on wings, or
  // tagging along with their Rick.
  MM.CAST_TRAVEL = { genius: 'portal', evilmorty: 'portal', sidekick: 'tag', trooper: 'ship', spacebeth: 'ship', birdfolk: 'fly' };
  // What they say when you talk to them.
  MM.CAST_TALK = {
    genius: ['Wubba lubba dub dub!', 'I\'m busy. Science busy.', 'Don\'t touch my garage.', 'Nobody exists on purpose. Want to watch TV?', 'I turned myself into a... no. Not today.'],
    sidekick: ['Aw geez, hi.', 'Have you seen my grandpa?', 'I-I-I\'m not supposed to talk to strangers from other dimensions.', 'Oh man, oh man.'],
    teen: ['Ugh. What.', 'I\'m literally busy.', 'Grandpa said I can come on the next adventure.', 'Whatever.'],
    surgeon: ['I\'m a horse surgeon. It\'s basically a real surgeon.', 'Have you seen my wine?', 'Dad is in the garage, probably.'],
    joe: ['Hey there, buddy!', 'Ever play golf? It\'s all about the follow-through.', 'Some people think I\'m dumb. They\'re wrong.', 'Do you know where I can apply for jobs?'],
    beanling: ['Ooo-wee!', 'Oh, hey! It\'s me, Mr. Poopybutthole!', 'Ooo-wee, what a day!'],
    mutant: ['GRRBLBLB.', '*squelches politely*'],
    birdfolk: ['It has been a challenging mating season for Birdperson.', 'Greetings.', 'In bird culture, this is considered a dick move.'],
    squanchy: ['Squanch!', 'I\'m gonna squanch!', 'You squanchin\' tonight?'],
    trooper: ['Papers, please.', 'The Federation thanks you for your compliance.', 'Move along.'],
    hive: ['We are glad you came.', 'Join us. It is nice in here.', 'One of us is watching. All of us are.'],
    evilmorty: ['...', 'You\'d be surprised what you can do when you stop listening to Ricks.', 'Out of the Curve. That\'s the plan.'],
    spacebeth: ['Don\'t ask me if I\'m the clone. I don\'t know, and I stopped caring.', 'The Federation is back. So am I.', 'Need a ride? My ship, my rules.', 'Tell Dad I said hi. Actually, don\'t.'],
    tommy: ['I survived. It took... choices.', 'Beth? Is that you?', 'You can\'t leave without the chalk. Nobody can.'],
  };
  // ...and what they say there, if it is not what they say at home.
  MM.CAST_TALK_AT = {
    'sidekick@wasteland': ['The arm wants to fight. I-I mostly let it.', 'I\'m the champion of the Ring of Death! Me! Morty!', 'Grandpa says the arm is a bad influence. The arm says Grandpa is.', 'Step into the Ring. I-I dare you. The arm dares you more.'],
    'teen@wasteland': ['Out here, nobody tells me what to do.', 'Hemorrhage and I are really happy. Don\'t make it weird.', 'Want a car? They\'re by the garage. Try not to cry when you crash it.', 'I make the best spiked hubcaps in the wasteland.'],
  };
  // Clones, for when someone else is already playing your character: weaker.
  MM.CLONE_HP = 0.75;

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
