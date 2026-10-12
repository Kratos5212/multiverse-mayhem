// HTML layers: the character creator, HUD pieces, dialogs, chat and toasts.
// Everything players type or other players send is shown with textContent only.
(function () {
  'use strict';
  const C = window.MMC;
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    }
    for (const k of kids) if (k !== null && k !== undefined) e.append(k);
    return e;
  };
  const UI = C.UI = { $, el };

  // ---------- Saved settings and profile ----------
  UI.load = function (key, def) {
    try { const v = JSON.parse(localStorage.getItem('mm.' + key)); return v && typeof v === 'object' ? Object.assign(def, v) : def; } catch (_) { return def; }
  };
  UI.save = function (key, v) { try { localStorage.setItem('mm.' + key, JSON.stringify(v)); } catch (_) {} };

  const ARCH_COLORS = { genius: '#7fdcff', sidekick: '#ffd84d', joe: '#9be36b', birdfolk: '#ff9b4d', beanling: '#ffe066', mutant: '#ff7a8a' };
  UI.ARCH_COLORS = ARCH_COLORS;
  const ARCH_ICONS = { genius: 'G', sidekick: 'S', joe: 'J', birdfolk: 'B', beanling: 'b', mutant: 'M' };

  const SKINS = ['#ffe0c8', '#f2d2b6', '#e0b08c', '#c68a62', '#a8724f', '#6b4630', '#9ad66b', '#7ec8e3', '#c49bff', '#ffd447', '#e07a85', '#b4b4c0'];
  const COLORS = ['#ffffff', '#f4f6f8', '#b9d4e0', '#9a9a9a', '#2a2a2a', '#7fb2d6', '#3c6fb5', '#2a3f8f', '#ffd447', '#f5a623', '#e2483d', '#a0303b', '#5fb848', '#2e7d32', '#b48aff', '#ff6fd0', '#6b4f2c', '#c9a77a'];
  const PORTALS = ['#39ff6a', '#5ff8ff', '#ff6fd0', '#ffd84d', '#ff5a3a', '#b48aff'];

  const NICE = { uni: 'unibrow', tshirt: 'T-shirt', labcoat: 'lab coat', tophat: 'top hat', cap: 'cap', none: 'none', eyepatch: 'eye patch', cyclops: 'one eye', three: 'three eyes', birdfolk: 'birdfolk', beanling: 'beanling' };
  const nice = v => NICE[v] || v;

  UI.PRESETS = [
    { label: 'Mad Scientist', arch: 'genius', look: { species: 'human', hair: 'spiky', brow: 'uni', eyes: 'normal', mouth: 'drool', top: 'labcoat', acc: 'none', height: 1.2, width: 0.95, head: 1.1, skin: '#f2d2b6', hairColor: '#b9d4e0', topColor: '#f4f6f8', shirtColor: '#7fb2d6', pantsColor: '#6b4f2c', shoeColor: '#3a2a1a', portalColor: '#39ff6a' } },
    { label: 'Nervous Kid', arch: 'sidekick', look: { species: 'human', hair: 'tuft', brow: 'normal', eyes: 'wide', mouth: 'frown', top: 'tshirt', acc: 'none', height: 0.88, width: 0.9, head: 1.25, skin: '#ffe0c8', hairColor: '#6b3f1f', topColor: '#e2483d', shirtColor: '#ffffff', pantsColor: '#2a3f8f', shoeColor: '#f4f6f8', portalColor: '#5ff8ff' } },
    { label: 'Average Dad', arch: 'joe', look: { species: 'human', hair: 'slick', brow: 'normal', eyes: 'sleepy', mouth: 'flat', top: 'polo', acc: 'none', height: 1.1, width: 1.0, head: 1.0, skin: '#f2d2b6', hairColor: '#5a3a20', topColor: '#5fb848', shirtColor: '#ffffff', pantsColor: '#c9a77a', shoeColor: '#2a2a2a' } },
    { label: 'Bird Warrior', arch: 'birdfolk', look: { species: 'birdfolk', hair: 'mohawk', brow: 'angry', eyes: 'normal', mouth: 'flat', top: 'armor', acc: 'none', height: 1.25, width: 1.0, head: 1.0, skin: '#f0d0a0', hairColor: '#c9733a', topColor: '#6b4f2c', shirtColor: '#c9a77a', pantsColor: '#5a3a20', shoeColor: '#2a2a2a' } },
    { label: 'Bean Pal', arch: 'beanling', look: { species: 'beanling', hair: 'bald', brow: 'none', eyes: 'wide', mouth: 'grin', top: 'none', acc: 'tophat', height: 1.15, width: 1.0, head: 1.0, skin: '#ffd447', pantsColor: '#ffd447', shoeColor: '#2a2a2a', accColor: '#2a2a2a' } },
    { label: 'Meat Thing', arch: 'mutant', look: { species: 'blob', hair: 'bald', brow: 'none', eyes: 'three', mouth: 'open', top: 'none', acc: 'none', height: 1.15, width: 1.2, head: 0.9, skin: '#e07a85', pantsColor: '#a0303b', shoeColor: '#6b4630' } },
    { label: 'Robo Me', arch: 'genius', look: { species: 'robot', hair: 'bald', brow: 'none', eyes: 'visor', mouth: 'flat', top: 'armor', acc: 'none', height: 1.1, width: 1.0, head: 1.0, skin: '#b4b4c0', topColor: '#3c6fb5', pantsColor: '#2a2a2a', shoeColor: '#2a2a2a', portalColor: '#5ff8ff' } },
    { label: 'Alien Tourist', arch: 'sidekick', look: { species: 'alien', hair: 'bald', brow: 'none', eyes: 'wide', mouth: 'grin', top: 'tshirt', acc: 'cap', height: 1.0, width: 0.9, head: 1.2, skin: '#9ad66b', topColor: '#ff6fd0', pantsColor: '#2a3f8f', shoeColor: '#ffffff', accColor: '#f5a623' } },
  ];

  // ---------- Character creator ----------
  UI.initMenu = function (profile, onChange) {
    const archList = $('archList');
    const renderArch = () => {
      archList.textContent = '';
      for (const id of MM.ARCH_IDS) {
        const A = MM.ARCHETYPES[id];
        const b = el('button', { class: 'arch', 'aria-pressed': String(profile.arch === id), onclick: () => { profile.arch = id; if (id === 'birdfolk') profile.look.species = 'birdfolk'; if (id === 'beanling') profile.look.species = 'beanling'; if (id === 'mutant') profile.look.species = 'blob'; renderArch(); renderLook(); onChange(); } },
          el('span', { class: 'ico', style: 'background:' + ARCH_COLORS[id], text: ARCH_ICONS[id] }),
          el('span', null, el('b', { text: A.name }), el('span', { text: A.ability.name + ' · ' + A.hp + ' HP' })));
        archList.append(b);
      }
      const A = MM.ARCHETYPES[profile.arch];
      const info = $('archInfo');
      info.textContent = '';
      info.append(el('p', { text: A.blurb }), el('p', null, el('b', { text: 'Lore limits: ' }), A.perk),
        el('div', { class: 'stats' },
          el('span', { class: 'stat', text: 'Health ' + A.hp }),
          el('span', { class: 'stat', text: 'Speed ' + A.speed }),
          el('span', { class: 'stat', text: A.portal ? 'Portal gun ×' + A.portal.charges : 'No portal gun' }),
          el('span', { class: 'stat', text: A.fly ? 'Flies' : 'Walks' }),
          el('span', { class: 'stat', text: 'Weapon: ' + A.weapon }),
          el('span', { class: 'stat', text: A.craft.length ? 'Builds: ' + A.craft.map(g => MM.GADGETS[g].name).join(', ') : 'Builds nothing' })));
    };

    const TABS = {
      Body: [['species', 'Species'], ['height', 'Height'], ['width', 'Build'], ['head', 'Head size'], ['skin', 'Skin', SKINS]],
      Face: [['eyes', 'Eyes'], ['brow', 'Brows'], ['mouth', 'Mouth']],
      Hair: [['hair', 'Style'], ['hairColor', 'Colour (or feathers)', COLORS]],
      Outfit: [['top', 'Top'], ['topColor', 'Top / coat colour', COLORS], ['shirtColor', 'Shirt underneath', COLORS], ['pantsColor', 'Pants', COLORS], ['shoeColor', 'Shoes', COLORS]],
      Extras: [['acc', 'Accessory'], ['accColor', 'Accessory colour', COLORS], ['portalColor', 'Portal and gun glow', PORTALS]],
    };
    let tab = 'Body';
    const tabs = $('lookTabs');
    for (const t in TABS) tabs.append(el('button', { role: 'tab', 'aria-selected': String(t === tab), onclick: () => { tab = t; for (const b of tabs.children) b.setAttribute('aria-selected', String(b.textContent === t)); renderLook(); } }, t));
    const renderLook = () => {
      const panel = $('lookPanel');
      panel.textContent = '';
      for (const [key, label, palette] of TABS[tab]) {
        const box = el('div', { class: 'opt' }, el('span', { class: 'lbl', text: label }));
        if (MM.LOOK[key]) {
          const chips = el('div', { class: 'chips' });
          for (const v of MM.LOOK[key]) chips.append(el('button', { class: 'chip', 'aria-pressed': String(profile.look[key] === v), onclick: () => { profile.look[key] = v; renderLook(); onChange(); } }, nice(v)));
          box.append(chips);
        } else if (MM.LOOK.nums[key]) {
          const [lo, hi] = MM.LOOK.nums[key];
          box.append(el('input', { type: 'range', min: lo, max: hi, step: 0.01, value: profile.look[key], 'aria-label': label, oninput: e => { profile.look[key] = Number(e.target.value); onChange(); } }));
        } else {
          const sws = el('div', { class: 'swatches' });
          for (const c of palette) sws.append(el('button', { class: 'sw', style: 'background:' + c, 'aria-label': label + ' ' + c, 'aria-pressed': String(profile.look[key] === c), onclick: () => { profile.look[key] = c; renderLook(); onChange(); } }));
          sws.append(el('input', { type: 'color', value: profile.look[key], 'aria-label': 'Custom ' + label, onchange: e => { profile.look[key] = e.target.value; renderLook(); onChange(); } }));
          box.append(sws);
        }
        panel.append(box);
      }
    };
    $('randomize').onclick = () => { profile.look = MM.randomLook(profile.arch); renderLook(); onChange(); };
    $('presetBtn').onclick = () => UI.modal('Presets', box => {
      const list = el('div', { class: 'list' });
      for (const p of UI.PRESETS) list.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: p.label }), el('small', { text: MM.ARCHETYPES[p.arch].name })),
        el('button', { class: 'btn go', onclick: () => { profile.arch = p.arch; profile.look = Object.assign(MM.defaultLook(), p.look); renderArch(); renderLook(); onChange(); UI.closeModal(); } }, 'Use')));
      box.append(list, el('p', { class: 'note', text: 'Presets are just starting points. Change anything afterwards.' }));
    });
    renderArch(); renderLook();
    UI.refreshMenu = () => { renderArch(); renderLook(); };
  };

  // ---------- Dialogs ----------
  let onModalClose = null;
  UI.modal = function (title, build, onClose) {
    const box = $('modalBox');
    box.textContent = '';
    box.append(el('h2', null, el('span', { text: title }), el('button', { class: 'btn', 'aria-label': 'Close', onclick: () => UI.closeModal() }, '✕')));
    build(box);
    $('modal').hidden = false;
    onModalClose = onClose || null;
  };
  UI.closeModal = function () {
    if ($('modal').hidden) return;
    $('modal').hidden = true;
    const f = onModalClose; onModalClose = null;
    if (f) f();
  };
  UI.modalOpen = () => !$('modal').hidden;
  $('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') UI.closeModal(); });

  UI.help = function () {
    UI.modal('How to play', box => {
      const keys = el('div', { class: 'keys' });
      const add = (k, d) => keys.append(el('span', null, ...k.split(' ').map(x => el('kbd', { text: x }))), el('span', { text: d }));
      add('W A S D', 'Move'); add('Mouse', 'Look (click the game to capture the mouse)'); add('Click', 'Fire / attack'); add('Space', 'Jump (hold to fly as a Birdfolk)');
      add('Q', 'Archetype ability'); add('E', 'Portal gun: open a portal to another dimension'); add('F', 'Use the Portal Kiosk (when standing at it)');
      add('1 2 3', 'Throw a grenade / deploy a turret / fire the shrink ray'); add('C', 'Craft gadgets from scrap ⚙ and crystals ◆'); add('Enter', 'Chat with the whole multiverse');
      add('Tab', 'Players, leaderboard and mute'); add('V', 'Emote (wave)'); add('Esc', 'Menu and settings');
      box.append(el('p', { text: 'Smash props, beat up monsters and other players, collect scrap and crystals, build gadgets, and hop between dimensions. Every dimension holds up to 64 players at once; when it fills up, a fresh copy opens.' }), keys,
        el('p', { class: 'note', text: 'On a phone: left stick to move, drag the right side to look, and use the round buttons.' }));
    });
  };

  // ---------- HUD helpers ----------
  UI.toast = function (text, ms) {
    const d = el('div', { text });
    $('toasts').append(d);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => d.remove(), ms || 2600);
  };

  UI.feed = function (parts, mine) {
    const d = el('div', { class: mine ? 'me' : '' });
    for (const p of parts) d.append(typeof p === 'string' ? p : el('b', { text: p.t, style: 'color:' + (p.c || '#fff') }));
    $('feed').prepend(d);
    while ($('feed').children.length > 5) $('feed').lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  };

  UI.chatLine = function (who, dimName, text, sys) {
    const log = $('chatLog');
    const d = el('div');
    if (sys) d.append(el('span', { class: 'sys', text }));
    else d.append(el('span', { class: 'd', text: '[' + dimName + '] ' }), el('b', { text: who }), ': ', text);
    log.append(d);
    while (log.children.length > 8) log.firstChild.remove();
    setTimeout(() => d.classList.add('old'), 14000);
  };
  UI.chatShowAll = function (on) { for (const d of $('chatLog').children) d.classList.toggle('old', !on); };

  const nums = [];
  UI.dmgNumber = function (text, color, big) {
    const d = el('div', { text, style: 'color:' + (color || '#fff') + ';font-size:' + (big ? 26 : 19) + 'px' });
    $('dmgNums').append(d);
    const n = { d, t: 0 };
    nums.push(n);
    while (nums.length > 30) nums.shift().d.remove();
    return n;
  };
  // pos(n) -> {x, y} on screen or null; called every frame by the game.
  UI.updateNums = function (dt, project) {
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.t += dt;
      const s = project(n);
      if (n.t > 1.1 || !s) { n.d.remove(); nums.splice(i, 1); continue; }
      n.d.style.left = s.x + 'px'; n.d.style.top = (s.y - n.t * 40) + 'px';
      n.d.style.opacity = String(1 - Math.max(0, n.t - 0.6) / 0.5);
    }
  };
  UI.clearNums = function () { for (const n of nums) n.d.remove(); nums.length = 0; };
})();
