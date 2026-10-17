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
  // Line icons for the hotbar and touch buttons (24x24, drawn with the current colour).
  const ICONS = {
    grenade: '<circle cx="11" cy="14" r="6"/><path d="M11 8V5h4M15 5l3-2M8.5 12.5l1 1"/>',
    turret: '<path d="M4 20h16M7 20l2-6h6l2 6M9 14v-4h6v4M15 11h6"/>',
    shrink: '<path d="M4 4l6 6M10 5v5H5M20 20l-6-6M14 19v-5h5"/>',
    meeseeks: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/><circle cx="12" cy="15" r="1.6"/>',
    timecrystal: '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>',
    freeze: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
    items: '<path d="M4 8h16v12H4zM4 8l2-4h12l2 4M10 12h4"/>',
    craft: '<path d="M15 4a4 4 0 0 0-4 5L4 16a2 2 0 0 0 3 3l7-7a4 4 0 0 0 5-4l-3 1-2-2 1-3z"/>',
    journal: '<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2zM6 17a2 2 0 0 1 2-2h11M10 7h5"/>',
    portal: '<path d="M12 12a1 1 0 1 1 1-1 3 3 0 1 1-4 3 5 5 0 1 1 8 -4 7 7 0 1 1-12 5"/>',
    ship: '<ellipse cx="12" cy="14" rx="9" ry="3"/><path d="M7 13a5 5 0 0 1 10 0M8 18l-1 3M16 18l1 3"/>',
    ab: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    scan: '<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/><circle cx="12" cy="12" r="2.5"/>',
    fire: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    jump: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
    pair: '<ellipse cx="7" cy="12" rx="3.5" ry="7"/><ellipse cx="17" cy="12" rx="3.5" ry="7"/><path d="M10.5 12h3"/>',
    down: '<path d="M6 5l6 6 6-6M6 11l6 6 6-6"/>',
    talk: '<path d="M4 5h16v11H9l-5 4z"/>',
    gadget: '<circle cx="11" cy="14" r="6"/><path d="M11 8V5h4M15 5l3-2"/>',
  };
  const icon = name => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || ICONS.ab;   // fixed strings above, never user text
    return s;
  };
  const UI = C.UI = { $, el, icon };

  // ---------- Saved settings and profile ----------
  UI.load = function (key, def) {
    try { const v = JSON.parse(localStorage.getItem('mm.' + key)); return v && typeof v === 'object' ? Object.assign(def, v) : def; } catch (_) { return def; }
  };
  UI.save = function (key, v) { try { localStorage.setItem('mm.' + key, JSON.stringify(v)); } catch (_) {} };

  const ARCH_COLORS = { genius: '#a9cbd6', sidekick: '#f6d34b', teen: '#ff7fb0', surgeon: '#e06a7a', joe: '#7fc76a', birdfolk: '#d98a4a', beanling: '#ffd447', mutant: '#ff7a8a', trooper: '#e4e8ee', hive: '#c49bff', meeseeks: '#7ec8f0', squanchy: '#c98a4a', evilmorty: '#ff5a3a', picklerick: '#7cbf3a' };
  UI.ARCH_COLORS = ARCH_COLORS;
  const ARCH_ICONS = { genius: 'R', sidekick: 'M', teen: 'S', surgeon: 'B', joe: 'J', birdfolk: 'BP', beanling: 'P', mutant: 'C', trooper: 'F', hive: 'U', meeseeks: 'Me', squanchy: 'Sq', evilmorty: 'EM', picklerick: 'PR' };

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
    { label: 'Space-Bound Teen', arch: 'teen', look: { species: 'human', hair: 'ponytail', brow: 'normal', eyes: 'normal', mouth: 'flat', top: 'tshirt', acc: 'none', height: 1.02, width: 0.88, head: 1.15, skin: '#ffe0c8', hairColor: '#e2483d', topColor: '#ff6fd0', shirtColor: '#ffffff', pantsColor: '#ffffff', shoeColor: '#2a2a2a', portalColor: '#ff6fd0' } },
    { label: 'Horse Surgeon', arch: 'surgeon', look: { species: 'human', hair: 'bowl', brow: 'normal', eyes: 'sleepy', mouth: 'flat', top: 'sweater', acc: 'none', height: 1.1, width: 0.9, head: 1.05, skin: '#f2d2b6', hairColor: '#f5d06a', topColor: '#c8504a', shirtColor: '#ffffff', pantsColor: '#2a3f8f', shoeColor: '#2a2a2a' } },
    { label: 'Federation Trooper', arch: 'trooper', look: { species: 'alien', hair: 'bald', brow: 'angry', eyes: 'visor', mouth: 'frown', top: 'armor', acc: 'headband', height: 1.2, width: 1.1, head: 0.95, skin: '#7ec8e3', topColor: '#d8dde2', pantsColor: '#3c6fb5', shoeColor: '#2a2a2a', accColor: '#e2483d' } },
    { label: 'Hive Mind', arch: 'hive', look: { species: 'alien', hair: 'afro', brow: 'none', eyes: 'wide', mouth: 'grin', top: 'vest', acc: 'antennae', height: 1.05, width: 0.9, head: 1.2, skin: '#c49bff', hairColor: '#7a2cbf', topColor: '#5fd6b0', shirtColor: '#2a2a2a', pantsColor: '#2a2a2a', accColor: '#ff6fd0' } },
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
        const b = el('button', { class: 'arch', 'aria-pressed': String(profile.arch === id), onclick: () => { profile.arch = id; profile.look = MM.canonLook(id); renderArch(); renderLook(); onChange(); } },
          el('span', { class: 'ico', style: 'background:' + ARCH_COLORS[id], text: ARCH_ICONS[id] }),
          el('span', null, el('b', { text: A.name }), el('span', { text: A.ability.name + ' · ' + A.hp + ' HP' })));
        archList.append(b);
      }
      const A = MM.ARCHETYPES[profile.arch];
      const info = $('archInfo');
      info.textContent = '';
      const st = MM.statsOf(profile.arch, MM.newProgress(profile.arch).up);
      info.append(el('p', { text: A.blurb }), el('p', null, el('b', { text: 'Lore limits: ' }), A.perk),
        el('p', null, el('b', { text: 'Your life: ' }), A.life.normal + ' in ' + MM.DIM_BY_ID[A.home].name + ' (' + A.life.daily.map(t => MM.TASKS[t].name.toLowerCase()).join(', ') + '). ',
          el('b', { text: 'Break out: ' }), A.steps.length + ' steps to become ' + A.life.breakout + '.'),
        el('div', { class: 'stats' },
          el('span', { class: 'stat', text: 'Health ' + A.hp }),
          el('span', { class: 'stat', text: 'Speed ' + A.speed }),
          el('span', { class: 'stat', text: A.portal ? 'Portal gun ×' + A.portal.charges : 'No portal gun' }),
          el('span', { class: 'stat', text: A.fly ? 'Flies' : 'Walks' }),
          el('span', { class: 'stat', text: st.ship ? 'Has a ship' : 'No ship' }),
          el('span', { class: 'stat', text: A.knows === '*' ? 'Builds anything' : 'Knows ' + A.knows.length + ' recipes' })));
    };

    const TABS = {
      Body: [['species', 'Species'], ['height', 'Height'], ['width', 'Build'], ['head', 'Head size'], ['skin', 'Skin', SKINS]],
      Face: [['eyes', 'Eyes'], ['brow', 'Brows'], ['mouth', 'Mouth']],
      Hair: [['hair', 'Style'], ['hairColor', 'Colour (or feathers)', COLORS]],
      Outfit: [['top', 'Top'], ['topColor', 'Top / coat colour', COLORS], ['shirtColor', 'Shirt underneath', COLORS], ['pantsColor', 'Pants', COLORS], ['shoeColor', 'Shoes', COLORS]],
      Extras: [['acc', 'Accessory'], ['accColor', 'Accessory colour', COLORS]],
      Portals: [['portalColor', 'Portal and gun glow', PORTALS], ['portalColor2', 'Second end of your portal pair (blank: a deeper shade)', PORTALS], ['portalStyle', 'Portal style']],
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
          if (key === 'portalColor2') sws.append(el('button', { class: 'chip', 'aria-pressed': String(!profile.look.portalColor2), onclick: () => { profile.look.portalColor2 = ''; renderLook(); onChange(); } }, 'Auto'));
          for (const c of palette) sws.append(el('button', { class: 'sw', style: 'background:' + c, 'aria-label': label + ' ' + c, 'aria-pressed': String(profile.look[key] === c), onclick: () => { profile.look[key] = c; renderLook(); onChange(); } }));
          sws.append(el('input', { type: 'color', value: profile.look[key] || MM.pairColors(profile.look)[1], 'aria-label': 'Custom ' + label, onchange: e => { profile.look[key] = e.target.value; renderLook(); onChange(); } }));
          box.append(sws);
        }
        panel.append(box);
      }
    };
    $('randomize').onclick = () => { profile.look = MM.randomLook(profile.arch); renderLook(); onChange(); };
    $('canonBtn').onclick = () => { profile.look = MM.canonLook(profile.arch); renderLook(); onChange(); };
    $('variantBtn').onclick = () => { profile.look = MM.variantLook(profile.arch); renderLook(); onChange(); };
    if ($('presetBtn')) $('presetBtn').onclick = () => UI.modal('Presets', box => {
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
    box.textContent = ''; box.classList.remove('travel');
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
      add('F', 'Talk to locals, do daily tasks, go through doors (Rick\'s garage!), use the kiosk'); add('J', 'Journal: your life, your path, errands');
      add('B', 'Board or leave your ship (Space up, Shift down)');
      add('1 2 3 4', 'Grenade / turret / shrink ray / Meeseeks Box'); add('C', 'Workbench: build gadgets and upgrades'); add('Enter', 'Chat with the whole multiverse');
      add('Tab', 'Players, leaderboard and mute'); add('V', 'First or third person (or scroll the mouse wheel)'); add('G', 'Emote (wave)'); add('Esc', 'Menu and settings');
      box.append(el('p', { text: 'Live your character\'s life, or break out of it. Do daily tasks at buildings, talk to locals (they do strange things), and follow your path in the journal (J). Every world has its own material, and the big upgrades (your body, a portal gun, a ship) are built at stations in different worlds. Every dimension holds up to 64 players.' }), keys,
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

  // A big centred announcement (world events, path steps, daily tasks).
  UI.banner = function (title, text) {
    const b = $('banner');
    b.textContent = '';
    b.append(el('b', { text: title }), el('span', { text: text || '' }));
    b.hidden = false;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(UI.bannerT);
    UI.bannerT = setTimeout(() => { b.hidden = true; }, 5200);
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
