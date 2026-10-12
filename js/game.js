// Multiverse Mayhem client: menu, connection, local movement, other players,
// camera, input (keyboard, mouse, touch) and the HUD.
(function () {
  'use strict';
  const T = THREE, C = window.MMC, UI = C.UI, $ = UI.$, el = UI.el;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const now = () => performance.now() / 1000;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const r2 = v => Math.round(v * 100) / 100;

  // ---------- Profile and settings ----------
  const settings = UI.load('settings', { sens: 1, invert: false, volume: 0.6, quality: isTouch ? 'low' : 'high', botChat: true, view: 'third' });
  const profile = UI.load('profile', { name: '', home: '', arch: 'genius', look: null, server: '', startDim: 'suburbia' });
  if (!MM.ARCHETYPES[profile.arch]) profile.arch = 'genius';
  profile.look = profile.look ? MM.sanitizeLook(profile.look) : MM.canonLook(profile.arch);
  if (!profile.home) profile.home = 'ABDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)] + '-' + Math.floor(Math.random() * 999 + 1);
  if (profile.startDim && !MM.DIM_BY_ID[profile.startDim]) profile.startDim = '';
  C.setVolume(settings.volume);
  C.bevelSegs = settings.quality === 'low' ? 2 : 3;   // rounded-edge smoothness

  // ---------- Renderer ----------
  const canvas = $('view');
  const renderer = new T.WebGLRenderer({ canvas, antialias: settings.quality === 'high', powerPreference: 'high-performance' });
  C.renderer = renderer;
  const applyQuality = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.25));
  applyQuality();
  renderer.setClearColor('#0b0f1e');
  const camera = new T.PerspectiveCamera(62, 1, 0.1, 1500);
  // First person: your own arm and gun live in a tiny scene drawn on top of the world,
  // so they never poke through walls.
  const vmScene = new T.Scene();
  vmScene.add(new T.HemisphereLight('#ffffff', '#8890a0', 0.65));
  const vmSun = new T.DirectionalLight('#ffffff', 0.5); vmSun.position.set(1, 3, 2); vmScene.add(vmSun);
  const vmCam = new T.PerspectiveCamera(62, 1, 0.02, 10);
  const vm = { root: null, arm: null, src: null, bob: 0, swayX: 0, swayY: 0, pose: { x: 0.3, y: -0.3, z: 0.1, pitch: -0.22, yaw: 0.28, roll: 0, size: 0.92 },
    fistPose: { x: 0.3, y: -0.32, z: 0.1, pitch: -0.5, yaw: 0.4, roll: 0, size: 0.8 } };
  const scene = new T.Scene();
  const fx = new C.FX(scene);
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    vmCam.aspect = w / h; vmCam.updateProjectionMatrix();
    fx.setScale(h * Math.min(window.devicePixelRatio || 1, 2));
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Menu preview ----------
  const menuScene = new T.Scene();
  menuScene.add(new T.HemisphereLight('#f2f6ff', '#d8d0e0', 0.6));
  const mSun = new T.DirectionalLight('#ffffff', 0.55); mSun.position.set(3, 6, 5); menuScene.add(mSun);
  const pedestal = (() => {
    const s = new C.Shape();
    s.add(C.prim.cyl, '#2b3a7a', [0, -0.15, 0], null, [1.2, 0.3, 1.2]);
    s.add(C.prim.cyl, '#39ff6a', [0, 0.01, 0], null, [1.22, 0.04, 1.22], true);
    return C.meshOf(s.build(), 0.04);
  })();
  menuScene.add(pedestal);
  const menuPortal = C.portalMesh(profile.look.portalColor, 1.5);
  menuPortal.position.set(0, 1.3, -1.8);
  menuScene.add(menuPortal);
  const menuCam = new T.PerspectiveCamera(32, 1, 0.1, 100);
  let preview = null, previewYaw = 0.5, previewDirty = true, previewT = 0;
  function rebuildPreview() {
    if (preview) { menuScene.remove(preview.root); preview.dispose(); }
    preview = C.buildAvatar(profile.look, profile.arch, { thick: 0.025 });
    menuScene.add(preview.root);
    menuPortal.material.uniforms.col.value.set(profile.look.portalColor);
  }
  function renderMenu(dt) {
    if (previewDirty && (previewT -= dt) <= 0) { previewDirty = false; rebuildPreview(); }
    renderer.setScissorTest(false);
    renderer.clear();
    if (!preview) return;
    const r = $('stage').getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    previewYaw += dt * (dragging ? 0 : 0.35);
    preview.root.rotation.y = previewYaw;
    preview.animate(dt, { speed: 0, anim: 0 });
    menuPortal.userData.tick(dt);
    const h = Math.max(1.6, preview.headY + 0.3);
    menuCam.aspect = r.width / r.height;
    menuCam.fov = 32;
    const dist = (h * 0.62) / Math.tan(T.MathUtils.degToRad(menuCam.fov / 2)) * Math.max(1, 0.75 / menuCam.aspect);
    menuCam.position.set(0, h * 0.55, dist);
    menuCam.lookAt(0, h * 0.5, 0);
    menuCam.updateProjectionMatrix();
    const y = window.innerHeight - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    renderer.setScissorTest(true);
    renderer.render(menuScene, menuCam);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  }
  let dragging = false, dragX = 0;
  $('stage').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; dragging = true; dragX = e.clientX; $('stage').setPointerCapture(e.pointerId); });
  $('stage').addEventListener('pointermove', e => { if (dragging) { previewYaw += (e.clientX - dragX) * 0.012; dragX = e.clientX; } });
  $('stage').addEventListener('pointerup', () => { dragging = false; });
  $('stage').addEventListener('pointercancel', () => { dragging = false; });

  function menuChanged() { previewDirty = true; previewT = 0.05; UI.save('profile', profile); }

  function initMenu() {
    $('name').value = profile.name;
    $('home').value = profile.home;
    $('startDim').append(el('option', { value: '', text: 'My home world' }));
    for (const d of MM.DIMS) $('startDim').append(el('option', { value: d.id, text: d.name }));
    $('startDim').value = profile.startDim;
    const httpHosted = /^https?:$/.test(location.protocol) && !/claude|artifact/.test(location.hostname);
    $('server').value = profile.server || (httpHosted ? location.host : '');
    UI.initMenu(profile, menuChanged);
    $('name').oninput = () => { profile.name = $('name').value; UI.save('profile', profile); };
    $('home').oninput = () => { profile.home = $('home').value.toUpperCase(); UI.save('profile', profile); };
    $('startDim').onchange = () => { profile.startDim = $('startDim').value; UI.save('profile', profile); };
    $('server').oninput = () => { profile.server = $('server').value.trim(); UI.save('profile', profile); };
    // Pages that can't reach a game server (like a hosted preview) offer offline play only.
    if (window.MM_NO_ONLINE) {
      $('playOnline').hidden = true; $('server').closest('.grp').hidden = true;
      $('menuNote').textContent = 'Offline preview with bots. For online play with friends, run the server from the repository. Unofficial free fan game, not affiliated with Adult Swim.';
    }
    $('playOffline').onclick = () => start('offline');
    $('playOnline').onclick = () => start('online');
    $('helpBtn').onclick = () => UI.help();
  }

  // ---------- Game state ----------
  const G = {
    mode: 'menu', net: null, myId: 0, ep: 0, dimId: null, inst: 0, world: null, you: null,
    me: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true, fly: 6, kbT: 0, aimT: 0, emoteT: 0, flying: false },
    meAv: null, players: new Map(), npcs: new Map(), pickups: new Map(), portals: new Map(), turrets: new Map(), alive: [],
    vm, camYaw: 0, camPitch: 0.25, camDist: 6, shake: 0,
    offset: null, lastSnap: 0, stT: 0, fireT: 0, pingT: 0, ping: 0, pop: null, top: [],
    muted: new Set(), deadBy: '', modal: null, entered: false,
    promptT: 0, promptKey: '', camPropT: 0, camProps: [],
  };
  C.G = G; // for debugging from the console

  // ---------- Saved progress ----------
  // The server gives this browser a random token; showing it again brings your progress back.
  // Online the server keeps the progress; offline it lives in this browser.
  function tokenFor(net) { try { const t = localStorage.getItem('mm.' + net.key); return /^[0-9a-f]{32}$/.test(t || '') ? t : undefined; } catch (_) { return undefined; } }
  function keepToken(tok) { try { if (G.net && /^[0-9a-f]{32}$/.test(tok || '')) localStorage.setItem('mm.' + G.net.key, tok); } catch (_) {} }
  const offlineStore = {
    load(tok, arch) { try { return JSON.parse(localStorage.getItem('mm.save.' + tok + '.' + arch)); } catch (_) { return null; } },
    save(tok, arch, prog) { try { localStorage.setItem('mm.save.' + tok + '.' + arch, JSON.stringify(prog)); } catch (_) {} },
  };

  // ---------- Starting and leaving ----------
  function start(kind) {
    C.audioUnlock();
    profile.name = MM.sanitizeName($('name').value || profile.name);
    $('name').value = profile.name;
    profile.home = MM.sanitizeHome($('home').value || profile.home);
    $('home').value = profile.home;
    UI.save('profile', profile);
    let url = null;
    if (kind === 'online') {
      url = C.socketUrl(profile.server || location.host);
      if (!url) { UI.toast('Type a server address first'); return; }
    }
    $('menu').hidden = true;
    $('loading').hidden = false;
    $('loading').textContent = kind === 'online' ? 'Connecting to ' + (profile.server || location.host) + '…' : 'Opening a portal…';
    const h = {
      open: () => G.net.send({ t: 'hello', v: MM.VERSION, name: profile.name, home: profile.home, look: profile.look, arch: profile.arch, dim: profile.startDim || undefined, tok: tokenFor(G.net) }),
      message: onMessage,
      close: reason => leave(reason),
    };
    // Let the loading text paint before the offline host builds its world.
    // ?bots=N sets how many bots share the offline multiverse (0-40).
    const qb = Number(new URLSearchParams(location.search).get('bots'));
    const bots = Number.isFinite(qb) && new URLSearchParams(location.search).has('bots') ? Math.max(0, Math.min(40, Math.floor(qb))) : undefined;
    setTimeout(() => { G.net = kind === 'online' ? C.connectOnline(url, h) : C.connectOffline(h, { bots, store: offlineStore }); G.net.key = kind === 'online' ? 'tok.' + url : 'tok.offline'; }, 30);
    G.mode = 'connecting';
  }

  function leave(reason) {
    if (G.net) { const n = G.net; G.net = null; n.close(); }
    clearWorld(true);
    G.mode = 'menu'; G.entered = false; G.you = null; G.myId = 0;
    $('hud').hidden = true; $('touch').hidden = true; $('loading').hidden = true; $('menu').hidden = false;
    UI.closeModal();
    if (document.pointerLockElement) document.exitPointerLock();
    if (reason) UI.toast(reason, 5000);
    previewDirty = true;
  }

  // ---------- Entities ----------
  function archLabel(info) { return (info.bot ? 'bot · ' : '') + (info.title || MM.ARCHETYPES[info.arch].name); }
  function addPlayer(info) {
    if (info.id === G.myId || G.players.has(info.id)) return;
    const av = C.buildAvatar(info.look, info.arch);
    C.setGear(av, info.gear);
    const tag = C.makeTag(info.name, info.home, archLabel(info), UI.ARCH_COLORS[info.arch]);
    tag.sprite.position.y = av.headY + 0.55;
    av.root.add(tag.sprite);
    collectOutlines(av);
    scene.add(av.root);
    G.players.set(info.id, { info, av, tag, snaps: [], x: 0, y: -999, z: 0, r: 0, a: 0, hp: 100, fx: 0, speed: 0, emoteT: 0, px: 0, pz: 0, placed: false });
  }
  function collectOutlines(av) { av.outlines = []; av.root.traverse(o => { if (o.isMesh && o.material && o.material.side === T.BackSide) av.outlines.push(o); }); }
  function removePlayer(id) {
    const p = G.players.get(id);
    if (!p) return;
    scene.remove(p.av.root); p.av.dispose();
    G.players.delete(id);
  }
  function addNpc(row) {
    const [id, type, x, y, z, r, hp, seed, name] = row;
    if (G.npcs.has(id)) return;
    const m = C.npcModel(type, seed);
    m.root.position.set(x, y, z); m.root.rotation.y = r;
    const NT = MM.NPCS[type];
    // Locals you can talk to wear a small name tag; monsters don't.
    let tag = null;
    if (!NT.hostile && NT.talk) {
      tag = C.makeTag(name || NT.name, '', NT.name, '#d6e4ff');
      tag.draw(-1);
      tag.sprite.scale.set(2.2, 0.55, 1);
      tag.sprite.position.y = (m.av ? m.av.headY : NT.h) + 0.5;
      m.root.add(tag.sprite);
    }
    scene.add(m.root);
    G.npcs.set(id, { id, type, name: name || NT.name, m, tag, snaps: [{ t: -1, x, y, z, r }], x, y, z, r, hp, px: x, pz: z, speed: 0, t: Math.random() * 6, flags: 0, bubble: null });
  }
  function removeNpc(id, die) {
    const n = G.npcs.get(id);
    if (!n) return;
    if (die) { fx.puff(n.x, n.y + 0.5, n.z, n.type === 'jelly' ? '#7ffcff' : n.type === 'mooncrab' ? '#c9c9d6' : '#d9677a', 10, 1.5, 1.6, 0.9); fx.burst(n.x, n.y + 0.8, n.z, '#ffffff', 10, 6, 0.6, 0.5); }
    scene.remove(n.m.root);
    if (n.m.av) n.m.av.dispose();
    if (n.tag) n.tag.sprite.material.map.dispose();
    if (n.bubble) n.bubble.sprite.material.map.dispose();
    G.npcs.delete(id);
  }
  function addPickup(row) {
    const [id, c, x, y, z] = row;
    if (G.pickups.has(id)) return;
    const m = C.pickupModel(c);
    m.position.set(x, y + 0.8, z);
    m.userData.base = y + 0.8; m.userData.ph = Math.random() * 6;
    scene.add(m);
    G.pickups.set(id, m);
  }
  function removePickup(id) { const m = G.pickups.get(id); if (m) { scene.remove(m); G.pickups.delete(id); } }
  function addPortal(po) {
    if (G.portals.has(po.id)) return;
    const g = new T.Group();
    const mesh = C.portalMesh(po.col, 1.25);
    mesh.position.y = 1.7;
    g.add(mesh);
    const d = MM.DIM_BY_ID[po.d];
    const tag = C.makeTag('→ ' + (d ? d.name : po.d), '', '', po.col);
    tag.draw(-1);
    tag.sprite.position.y = 4.1;
    g.add(tag.sprite);
    g.position.set(po.x, po.y, po.z);
    g.rotation.y = po.r;
    scene.add(g);
    G.portals.set(po.id, { g, mesh, tag, ttl: po.ttl, born: now(), x: po.x, y: po.y, z: po.z });
    fx.burst(po.x, po.y + 1.7, po.z, po.col, 30, 7, 0.7, 0.6, 2);
    sfxAt('portal', po.x, po.z);
  }
  function removePortal(id) {
    const p = G.portals.get(id);
    if (!p) return;
    scene.remove(p.g); p.tag.sprite.material.map.dispose();
    G.portals.delete(id);
  }
  function addTurret(row) {
    const [id, owner, x, y, z] = row;
    if (G.turrets.has(id)) return;
    const m = C.turretModel();
    m.position.set(x, y, z);
    scene.add(m);
    G.turrets.set(id, { m, owner, aim: 0 });
  }
  function removeTurret(id) { const t = G.turrets.get(id); if (t) { scene.remove(t.m); G.turrets.delete(id); } }

  function clearWorld(all) {
    for (const id of [...G.players.keys()]) removePlayer(id);
    for (const id of [...G.npcs.keys()]) removeNpc(id);
    for (const id of [...G.pickups.keys()]) removePickup(id);
    for (const id of [...G.portals.keys()]) removePortal(id);
    for (const id of [...G.turrets.keys()]) removeTurret(id);
    fx.clear();
    UI.clearNums();
    if (all) {
      if (G.world) { scene.remove(G.world.group); G.world.dispose(); G.world = null; }
      if (G.meAv) { scene.remove(G.meAv.root); G.meAv.dispose(); G.meAv = null; }
      G.dimId = null;
    }
  }

  // ---------- Arriving in a dimension ----------
  function enterDimension(w) {
    const changed = w.dim !== G.dimId;
    clearWorld(false);
    if (changed) {
      if (G.world) { scene.remove(G.world.group); G.world.dispose(); }
      G.world = C.buildDimension(w.dim, settings.quality);
      scene.add(G.world.group);
      const dim = MM.DIM_BY_ID[w.dim];
      scene.fog = new T.Fog(dim.fog, 40, dim.fogFar);
      renderer.setClearColor(dim.fog);
    }
    G.dimId = w.dim; G.inst = w.inst; G.ep = w.ep;
    G.alive = MM.genProps(w.dim).map(() => true);
    for (const [i, hp] of w.props) { G.alive[i] = hp > 0; if (hp <= 0) G.world.setAlive(i, false); }
    if (!changed) for (let i = 0; i < G.alive.length; i++) G.world.setAlive(i, G.alive[i]);
    for (const info of w.players) addPlayer(info);
    for (const n of w.npcs) addNpc(n);
    for (const pk of w.pickups) addPickup(pk);
    for (const po of w.portals) addPortal(po);
    for (const t of w.turrets) addTurret(t);
    const me = G.me;
    me.x = w.x; me.y = w.y; me.z = w.z; me.vx = me.vy = me.vz = 0;
    if (!G.meAv) {
      G.meAv = C.buildAvatar(profile.look, profile.arch);
      scene.add(G.meAv.root);
    }
    if (G.prog) C.setGear(G.meAv, myGear());
    C.setShip(G.meAv, !!w.ship, myGear());
    if (w.event) { UI.banner(w.event.name, w.event.text); }
    G.offset = null;
    const dim = MM.DIM_BY_ID[w.dim];
    $('dimName').textContent = dim.name;
    updateDimInfo();
    if (G.entered) { UI.toast('Welcome to ' + dim.name); C.sfx('warp'); fx.burst(me.x, me.y + 1, me.z, profile.look.portalColor, 40, 8, 0.8, 0.7, 2); }
    else {
      G.entered = true;
      G.mode = 'play';
      $('loading').hidden = true;
      $('hud').hidden = false;
      $('touch').hidden = !isTouch;
      buildHotbar();
      UI.chatLine('', '', 'You arrived in ' + dim.name + '. ' + (isTouch ? 'Tap ? in the menu for controls.' : 'Click to look around. WASD to move, Enter to chat, ? for help.'), true);
      G.camYaw = 0; G.camPitch = 0.25;
    }
  }

  function updateDimInfo() {
    const here = G.players.size + 1;
    let s = 'copy #' + (G.inst + 1) + ' · ' + here + '/' + MM.INSTANCE_CAP + ' here';
    if (G.pop) s += ' · ' + G.pop.total + ' online';
    if (G.net && G.net.kind === 'online' && G.ping) s += ' · ' + G.ping + ' ms';
    if (G.net && G.net.kind === 'offline') s += ' · offline';
    $('dimInfo').textContent = s;
  }

  // ---------- Messages from the host ----------
  function nameOf(id) { if (id === G.myId) return profile.name; const p = G.players.get(id); return p ? p.info.name : 'someone'; }
  function posOf(id) {
    if (id === G.myId) return G.me;
    const p = G.players.get(id); if (p) return p;
    return null;
  }
  function sfxAt(name, x, z, base) {
    const d = Math.hypot(x - G.me.x, z - G.me.z);
    C.sfx(name, (base || 1) * Math.max(0, 1 - d / 70));
  }

  function onMessage(m) {
    switch (m.t) {
      case 'hi': G.myId = m.id; profile.name = m.you.name; profile.home = m.you.home; keepToken(m.tok); break;
      case 'pg': onProgress(m); break;
      case 'w': enterDimension(m); break;
      case 's': onSnap(m); break;
      case 'ev': for (const e of m.l) onEvent(e); break;
      case 'pv': for (const e of m.l) onPrivate(e); break;
      case 'y': onYou(m); break;
      case 'c': onChat(m); break;
      case 'pop': G.pop = m; G.top = m.top || []; updateDimInfo(); if (G.modal === 'board') openBoard(); break;
      case 'pong': G.ping = Math.round((now() * 1000 - m.c)); updateDimInfo(); break;
      case 'err': leave(m.msg); break;
    }
  }

  function onSnap(m) {
    const t = now();
    const est = t - m.tm;
    if (G.offset === null || est < G.offset) G.offset = est; else G.offset += (est - G.offset) * 0.02;
    G.lastSnap = t;
    for (const p of m.p) {
      if (p[0] === G.myId) continue;
      const e = G.players.get(p[0]);
      if (!e) continue;
      e.snaps.push({ t: m.tm, x: p[1], y: p[2], z: p[3], r: p[4], a: p[5], hp: p[6], fx: p[7] });
      if (e.snaps.length > 12) e.snaps.shift();
      if (!e.placed) { e.placed = true; e.x = p[1]; e.y = p[2]; e.z = p[3]; e.r = p[4]; e.px = e.x; e.pz = e.z; }
    }
    for (const n of m.n) {
      const e = G.npcs.get(n[0]);
      if (!e) continue;
      e.snaps.push({ t: m.tm, x: n[1], y: n[2], z: n[3], r: n[4] });
      if (e.snaps.length > 12) e.snaps.shift();
      e.hp = n[5]; e.flags = n[6] || 0;
    }
    for (const u of m.u) { const tu = G.turrets.get(u[0]); if (tu) tu.aim = u[1]; }
  }

  const SHOT_COLORS = { plasma: '#5dff8a', blaster: '#ffd84d', toy: '#ff8fd0', turret: '#ff4d4d', shrink: '#b48aff', gren: '#ffd84d' };
  const NPC_NAMES = {};
  for (const k in MM.NPCS) NPC_NAMES[k] = MM.NPCS[k].name;

  function onEvent(e) {
    const me = G.me;
    switch (e.k) {
      case 'join': if (e.p.id !== G.myId) addPlayer(e.p); updateDimInfo(); break;
      case 'leave': {
        const p = G.players.get(e.id);
        if (p && e.via) { fx.burst(p.x, p.y + 1, p.z, '#39ff6a', 20, 6, 0.7, 0.5, 2); sfxAt('warp', p.x, p.z, 0.6); }
        removePlayer(e.id); updateDimInfo();
        break;
      }
      case 'shot': {
        if (e.o === G.myId && e.w !== 'turret') {
          if (e.w === 'gren' || e.w === 'shrink') C.sfx(e.w === 'gren' ? 'jump' : 'shrink');
        } else {
          sfxAt(e.w === 'gren' ? 'jump' : e.w, e.x, e.z, 0.8);
          const p = G.players.get(e.o); if (p) { p.av.attackT = 0.25; p.aimT = 0.8; }
        }
        fx.shot(e, Object.assign({}, SHOT_COLORS, playerPortalColor(e.o)));
        break;
      }
      case 'hit': fx.hit(e.id, e.x, e.y, e.z); break;
      case 'boom': {
        fx.explosion(e.x, e.y, e.z, e.r);
        sfxAt('boom', e.x, e.z, Math.min(1, e.r / 6));
        const d = Math.hypot(e.x - me.x, e.z - me.z);
        if (d < 25) G.shake = Math.max(G.shake, (1 - d / 25) * 0.6 * Math.min(1, e.r / 5));
        break;
      }
      case 'mel': { const p = G.players.get(e.id); if (p) { p.av.attackT = 0.3; sfxAt('melee', p.x, p.z); } break; }
      case 'dmg': {
        if (e.p === G.myId) {
          $('flash').style.opacity = '1'; setTimeout(() => { $('flash').style.opacity = '0'; }, 120);
          C.sfx('hurt', 0.8);
          numAt(me.x, me.y + 2.2, me.z, '-' + e.d, '#ff5a5a', false);
        } else {
          const at = e.p ? G.players.get(e.p) : G.npcs.get(e.n);
          if (at && (e.by === G.myId || Math.hypot(at.x - me.x, at.z - me.z) < 25)) numAt(at.x, at.y + 2.2, at.z, String(e.d), e.by === G.myId ? '#ffd84d' : '#ffffff', e.by === G.myId);
          if (e.by === G.myId) { $('cross').classList.add('hit'); clearTimeout(G.hitT); G.hitT = setTimeout(() => $('cross').classList.remove('hit'), 140); C.sfx('hit', 0.6); }
        }
        break;
      }
      case 'kill': {
        const killer = e.by ? nameOf(e.by) : (NPC_NAMES[e.w] || 'the dimension');
        const victim = nameOf(e.v);
        const mine = e.by === G.myId || e.v === G.myId;
        UI.feed([{ t: killer, c: e.by === G.myId ? '#39ff6a' : '#ffd84d' }, ' wrecked ', { t: victim, c: e.v === G.myId ? '#ff5a5a' : '#ffffff' }], mine);
        const vp = posOf(e.v);
        if (vp) { fx.burst(vp.x, vp.y + 1, vp.z, '#ff5a5a', 24, 7, 0.7, 0.7); fx.puff(vp.x, vp.y + 0.5, vp.z, '#555', 6, 1, 1.5, 0.8); }
        if (e.v === G.myId) { G.deadBy = e.by ? killer : (NPC_NAMES[e.w] ? 'a ' + NPC_NAMES[e.w] : 'the dimension'); C.sfx('die'); }
        else if (e.by === G.myId) C.sfx('kill');
        break;
      }
      case 'prop': {
        const was = G.alive[e.id];
        G.alive[e.id] = e.hp > 0;
        G.world.setAlive(e.id, e.hp > 0);
        const p = MM.genProps(G.dimId)[e.id];
        if (was && e.hp <= 0) {
          const big = p.r > 3;
          fx.explosion(p.x, p.y + p.h * 0.3, p.z, big ? 6 : 2.5);
          fx.puff(p.x, p.y + p.h * 0.4, p.z, '#9a9494', big ? 26 : 8, p.r * 1.5, big ? 2.6 : 1.4, 1.4);
          sfxAt('boom', p.x, p.z, big ? 1 : 0.4);
        } else if (!was && e.hp > 0) fx.puff(p.x, p.y + 1, p.z, '#ffffff', 8, p.r, 1.5, 0.8);
        else if (e.hp > 0) fx.burst(p.x, p.y + Math.min(2, p.h / 2), p.z, '#d8c8a8', 3, 4, 0.4, 0.4);
        break;
      }
      case 'pk+': addPickup(e.p); break;
      case 'pk-': if (e.by === G.myId) { const m = G.pickups.get(e.id); if (m) fx.burst(m.position.x, m.position.y, m.position.z, '#ffd84d', 10, 4, 0.5, 0.4, 0); C.sfx('pickup'); } removePickup(e.id); break;
      case 'npc+': addNpc(e.n); break;
      case 'npc-': removeNpc(e.id, e.die); break;
      case 'po+': addPortal(e.po); break;
      case 'po-': removePortal(e.id); break;
      case 'tu+': addTurret(e.t); sfxAt('craft', e.t[2], e.t[4], 0.5); break;
      case 'tu-': removeTurret(e.id); break;
      case 'ab': {
        const p = posOf(e.id);
        if (!p) break;
        if (e.id !== G.myId) sfxAt('ability', p.x, p.z, 0.7);
        if (e.a === 'cheer') { fx.burst(p.x, p.y + 1.5, p.z, '#7dff9a', 40, 7, 0.7, 0.9, -2); sfxAt('cheer', p.x, p.z); }
        if (e.a === 'sob') fx.burst(p.x, p.y + 2, p.z, '#7fc8ff', 25, 4, 0.4, 1.0, 10);
        if (e.a === 'sprint') fx.puff(p.x, p.y + 0.3, p.z, '#ffffff', 8, 0.8, 1, 0.6);
        break;
      }
      case 'em': { const p = G.players.get(e.id); if (p) p.emoteT = 2; break; }
      case 'dodge': { const p = posOf(e.id); if (p) { numAt(p.x, p.y + 2.4, p.z, 'DODGE!', '#5ff8ff', false); sfxAt('dodge', p.x, p.z); } break; }
      case 'kiosk': { const p = posOf(e.id); if (p) fx.burst(p.x, p.y + 1, p.z, '#ffd84d', 25, 6, 0.6, 0.5, 2); break; }
      case 'bite': { const n = G.npcs.get(e.n); if (n) sfxAt('bite', n.x, n.z); break; }
      case 'shrunk': { const p = posOf(e.id); if (p) { fx.burst(p.x, p.y + 1, p.z, '#b48aff', 20, 4, 0.5, 0.6, 0); sfxAt('shrink', p.x, p.z); } break; }
      case 'say': {
        const n = G.npcs.get(e.n);
        if (!n) break;
        speech(n, e.text);
        if (e.by === G.myId) UI.chatLine('', '', n.name + ': "' + e.text + '"', true);
        break;
      }
      case 'world':
        if (e.end) { UI.toast(e.name + ' is over'); break; }
        UI.banner(e.name, e.text);
        UI.chatLine('', '', e.name + ' ' + e.text, true);
        C.sfx('portal', 0.6);
        break;
      case 'title': {
        const p = G.players.get(e.id);
        if (p) { p.info.title = e.title; removePlayer(e.id); addPlayer(p.info); }
        else if (e.id !== G.myId) break;
        if (e.id !== G.myId) UI.feed([{ t: nameOf(e.id), c: '#ffd84d' }, ' became a ', { t: e.title, c: '#39ff6a' }]);
        break;
      }
      case 'gear': {
        const p = G.players.get(e.id);
        if (p) { p.info.gear = e.gear; C.setGear(p.av, e.gear); collectOutlines(p.av); }
        break;
      }
      case 'ship': {
        const p = G.players.get(e.id);
        if (p) { C.setShip(p.av, e.on, p.info.gear); collectOutlines(p.av); sfxAt('jump', p.x, p.z); }
        break;
      }
      case 'warp': { const p = posOf(e.id); if (p) { fx.burst(p.x, p.y + 1, p.z, '#5ff8ff', 40, 10, 0.8, 0.6, 0); sfxAt('warp', p.x, p.z); } break; }
    }
  }
  function playerPortalColor(id) {
    const look = id === G.myId ? profile.look : G.players.get(id) && G.players.get(id).info.look;
    return look ? { plasma: look.portalColor } : {};
  }
  function numAt(x, y, z, text, color, big) {
    const n = UI.dmgNumber(text, color, big);
    n.w = new T.Vector3(x + (Math.random() - 0.5) * 0.6, y, z);
  }

  function onPrivate(e) {
    const me = G.me;
    if (e.k === 'tp') { me.x = e.x; me.y = e.y; me.z = e.z; me.vx = me.vy = me.vz = 0; G.ep = e.ep; }
    else if (e.k === 'kb') { me.vx += e.vx; me.vz += e.vz; me.vy = Math.max(me.vy, e.vy); me.grounded = false; me.kbT = 0.7; }
    else if (e.k === 'toast') UI.toast(e.text, 3500);
    else if (e.k === 'built') { C.sfx('craft'); UI.toast('Built: ' + MM.RECIPES[e.r].name); if (G.modal === 'craft') setTimeout(openCraft, 50); }
    else if (e.k === 'task') {
      const got = Object.keys(e.give).map(k => '+' + e.give[k] * e.mult + ' ' + MM.MATERIALS[k].icon).join(' ');
      UI.banner(MM.TASKS[e.id].name, e.text + (got ? '  ' + got : ''));
      C.sfx('craft');
    }
    else if (e.k === 'step') {
      const un = (e.grants || []).map(r => MM.RECIPES[r].name);
      UI.banner(e.title ? 'You are now a ' + e.title + '!' : 'Path step done: ' + e.name, un.length ? 'Unlocked: ' + un.join(', ') : 'Open your journal (J) for the next step.');
      C.sfx('cheer');
      if (e.title) fx.burst(me.x, me.y + 1.5, me.z, '#ffd84d', 80, 10, 0.9, 1.2, 2);
    }
    else if (e.k === 'offer') openOffer(e);
  }

  function onYou(y) {
    const prev = G.you;
    G.you = y;
    const A = MM.ARCHETYPES[profile.arch];
    $('hpFill').style.transform = 'scaleX(' + Math.max(0, y.hp / y.max) + ')';
    $('hpFill').style.background = y.hp / y.max > 0.5 ? 'var(--portal)' : y.hp / y.max > 0.25 ? 'var(--gold)' : 'var(--red)';
    $('hpText').textContent = Math.max(0, y.hp) + ' / ' + y.max;
    for (const k of MM.MAT_IDS) $('mat-' + k).textContent = y.inv[k] || 0;
    $('charges').textContent = y.chMax ? 'Portal ' + '●'.repeat(y.ch) + '○'.repeat(Math.max(0, y.chMax - y.ch)) : 'No portal gun';
    if (G.meAv && !!y.ship !== !!G.meAv.inShip) { C.setShip(G.meAv, y.ship, myGear()); if (y.ship) { G.me.vy = 0; G.me.grounded = false; } }
    $('chaos').textContent = y.chaos;
    $('kos').textContent = y.kills;
    G.abReadyAt = now() + y.ab;
    G.rsAt = now() + y.rsIn;
    if (y.dead && (!prev || !prev.dead)) { $('dead').hidden = false; $('deadBy').textContent = 'by ' + (G.deadBy || 'something'); if (document.pointerLockElement) document.exitPointerLock(); }
    if (!y.dead && prev && prev.dead) $('dead').hidden = true;
    if (!y.dead) $('dead').hidden = true;
    updateHotbar();
    const invKey = JSON.stringify(y.inv) + y.ch;
    if (invKey !== G.invKey) updateTracker();
    if (G.modal === 'craft' && invKey !== G.invKey) openCraft();
    G.invKey = invKey;
  }

  // ---------- Life progress ----------
  function onProgress(m) {
    const first = !G.prog;
    G.prog = m; G.st = m.st;
    if (G.meAv) C.setGear(G.meAv, myGear());
    $('flyBar').hidden = !G.st.fly;
    updateTracker();
    updateHotbar();
    if (G.modal === 'journal') openJournal();
    if (first && G.entered) buildHotbar();
  }
  function myGear() { const up = G.prog ? G.prog.up : {}; return { wings: !!up.wings, jet: !!up.jetpack && !up.wings, engine: !!up.engine, lasers: !!up.lasers }; }
  // The next step of your path, always on screen.
  function updateTracker() {
    const A = MM.ARCHETYPES[profile.arch], pg = G.prog;
    if (!pg) return;
    const box = $('tracker');
    box.textContent = '';
    const title = pg.title || A.life.normal;
    box.append(el('b', { text: title }));
    const S = A.steps[pg.step];
    if (S) {
      const pr = MM.stepProgress(pg, S.goal, G.you ? G.you.inv : {});
      box.append(el('span', { text: S.name + ': ' + S.desc + (pr.need > 1 ? ' (' + pr.now + '/' + pr.need + ')' : '') }));
    } else box.append(el('span', { text: 'Path complete. The multiverse is yours.' }));
    const ready = A.life.daily.filter(t => !pg.tasks[t]);
    if (ready.length) box.append(el('small', { text: 'Ready: ' + ready.map(t => MM.TASKS[t].name + ' (' + MM.LANDMARK_BY_ID[MM.TASKS[t].at].name + ')').join(' · ') }));
    if (pg.errands.length) box.append(el('small', { text: pg.errands.length + ' errand' + (pg.errands.length > 1 ? 's' : '') + ' (J)' }));
  }

  // Speech bubble over a local for a few seconds.
  function speech(n, text) {
    if (n.bubble) { n.m.root.remove(n.bubble.sprite); n.bubble.sprite.material.map.dispose(); }
    const b = C.makeBubble(text);
    b.sprite.position.y = (n.m.av ? n.m.av.headY : MM.NPCS[n.type].h) + 1.4;
    n.m.root.add(b.sprite);
    n.bubble = b; n.bubbleT = 5;
  }

  function openOffer(e) {
    const fmt = m => Object.keys(m).map(k => m[k] + ' ' + MM.MATERIALS[k].icon + ' ' + MM.MATERIALS[k].name).join(', ');
    openModal('offer', e.name + ' wants to trade', box => {
      box.append(el('p', { text: 'You give: ' + fmt(e.want) }), el('p', { text: 'You get: ' + fmt(e.get) }),
        el('div', { class: 'chips' },
          el('button', { class: 'btn go', onclick: () => { send({ t: 'ans', a: 1 }); UI.closeModal(); } }, 'Deal'),
          el('button', { class: 'btn', onclick: () => { send({ t: 'ans', a: 0 }); UI.closeModal(); } }, 'No thanks')));
    });
  }

  function onChat(m) {
    if (G.muted.has(m.id)) return;
    const p = G.players.get(m.id);
    if (!settings.botChat && p && p.info.bot) return;
    const d = MM.DIM_BY_ID[m.dim];
    UI.chatLine(m.name + ' ' + m.home, d ? d.name : '?', m.text);
    C.sfx('chat', 0.5);
  }

  // ---------- Hotbar ----------
  const slots = {};
  function buildHotbar() {
    const bar = $('hotbar');
    bar.textContent = '';
    const A = MM.ARCHETYPES[profile.arch];
    const mk = (id, key, label, onclick) => {
      const s = el('button', { class: 'slot pe', onclick }, el('span', { class: 'k', text: isTouch ? '' : key }), el('span', { text: label }), el('span', { class: 'n' }), el('i', { class: 'cd', style: 'transform:scaleY(0)' }));
      bar.append(s); slots[id] = s;
    };
    mk('grenade', '1', 'Grenade', () => useGadget('grenade'));
    mk('turret', '2', 'Turret', () => useGadget('turret'));
    mk('shrink', '3', 'Shrink', () => useGadget('shrink'));
    mk('meeseeks', '4', 'Meeseeks', () => useGadget('meeseeks'));
    mk('craft', 'C', 'Build', () => openCraft());
    mk('journal', 'J', 'Journal', () => openJournal());
    mk('portal', 'E', 'Portal', () => portalAction());
    mk('ship', 'B', 'Ship', () => toggleShip());
    mk('ab', 'Q', A.ability.name, () => ability());
    $('flyBar').hidden = !(G.st && G.st.fly);
    updateHotbar();
  }
  function updateHotbar() {
    const y = G.you;
    if (!y || !slots.grenade) return;
    for (const g of MM.GADGET_IDS) {
      slots[g].querySelector('.n').textContent = y.inv[g] || '';
      slots[g].classList.toggle('off', !(y.inv[g] > 0));
    }
    const st = G.st;
    slots.portal.querySelector('.n').textContent = y.chMax ? String(y.ch) : '';
    slots.portal.classList.toggle('off', !(y.chMax && y.ch > 0) && !nearKiosk() && !(y.ship && st && st.ship && st.ship.drive));
    slots.ship.hidden = !(st && st.ship);
    slots.ship.querySelector('span:nth-child(2)').textContent = y.ship ? 'Land' : 'Ship';
    $('tShip').hidden = !(st && st.ship);
    $('tShip').textContent = y.ship ? 'LAND' : 'SHIP';
  }

  // ---------- Actions ----------
  const send = o => { if (G.net) G.net.send(o); };
  function canAct() { return G.mode === 'play' && G.you && !G.you.dead; }

  // The weapon in use (mirrors Host.weaponOf): ship guns while flying.
  function weaponId() {
    if (G.you && G.you.ship) return G.st && G.st.ship && G.st.ship.lasers ? 'lasers' : 'blaster';
    return MM.ARCHETYPES[profile.arch].weapon;
  }
  function aimDir() {
    if (MM.WEAPONS[weaponId()].melee) return { dx: Math.sin(G.camYaw), dy: 0, dz: Math.cos(G.camYaw) };
    const o = camera.position, d = new T.Vector3();
    camera.getWorldDirection(d);
    let best = 90;
    // Snap to the nearest thing under the crosshair, else to the ground, else far away.
    const test = (x, y, z, r) => {
      const cx = x - o.x, cy = y - o.y, cz = z - o.z;
      const t = cx * d.x + cy * d.y + cz * d.z;
      if (t < 2 || t > best) return;
      const qx = cx - d.x * t, qy = cy - d.y * t, qz = cz - d.z * t;
      if (qx * qx + qy * qy + qz * qz < r * r) best = t;
    };
    for (const p of G.players.values()) test(p.x, p.y + 1, p.z, 1.0);
    for (const n of G.npcs.values()) test(n.x, n.y + 0.8, n.z, 1.1);
    for (let t = 3; t < best; t += 1.5) { if (o.y + d.y * t < MM.heightAt(G.dimId, o.x + d.x * t, o.z + d.z * t)) { best = t; break; } }
    const sc = (G.you && (G.you.fx & 8)) ? 0.5 : 1;
    const tx = o.x + d.x * best - G.me.x, ty = o.y + d.y * best - (G.me.y + 1.35 * sc), tz = o.z + d.z * best - G.me.z;
    const l = Math.hypot(tx, ty, tz) || 1;
    return { dx: tx / l, dy: ty / l, dz: tz / l };
  }

  function fire() {
    if (!canAct() || (G.you.fx & 4)) return;
    const t = now();
    const wid = weaponId(), W = MM.WEAPONS[wid];
    if (t < G.fireT) return;
    G.fireT = t + W.cd;
    const a = aimDir();
    send(Object.assign({ t: 'f' }, a));
    G.me.aimT = 1.0;
    G.me.yaw = G.camYaw;
    if (G.meAv) G.meAv.attackT = W.melee ? 0.3 : 0.2;
    C.sfx(W.melee ? 'melee' : wid === 'lasers' || wid === 'rifle' ? 'plasma' : wid, 0.7);
  }
  function useGadget(g) {
    if (!canAct()) return;
    if (G.you.ship) { UI.toast('Land first (B) to use gadgets.'); return; }
    if (!(G.you.inv[g] > 0)) { UI.toast('No ' + MM.RECIPES[g].name + '. Build one with C.'); return; }
    const a = g === 'turret' || g === 'meeseeks' ? { dx: Math.sin(G.camYaw), dy: 0, dz: Math.cos(G.camYaw) } : aimDir();
    if (g === 'grenade') { const l = Math.hypot(a.dx, a.dz) || 1; a.dx /= l; a.dz /= l; a.dy = 0; }
    G.me.yaw = G.camYaw; G.me.aimT = 1;
    send(Object.assign({ t: 'g', g }, a));
  }
  function ability() {
    if (!canAct()) return;
    if (now() < (G.abReadyAt || 0)) return;
    const A = MM.ARCHETYPES[profile.arch];
    if (A.ability.id === 'dive' && !G.me.grounded) G.me.vy = -30;
    send({ t: 'ab' });
    C.sfx('ability');
  }
  function nearKiosk() { return G.dimId && MM.hasKiosk(G.dimId) && Math.hypot(G.me.x - MM.kioskOf(G.dimId).x, G.me.z - MM.kioskOf(G.dimId).z) < MM.KIOSK_RADIUS; }
  function portalAction() {
    if (!canAct()) return;
    if (G.you.ship && G.st.ship && G.st.ship.drive) return openDims('drive');
    if (nearKiosk()) return openDims('kiosk');
    if (!G.you.chMax) { UI.toast('No portal gun in your life (yet). Use the kiosk in the middle, jump into someone\'s portal, or follow your path (J).', 4500); return; }
    if (G.you.ch <= 0) { UI.toast('Portal gun is recharging'); return; }
    openDims('gun');
  }
  function toggleShip() {
    if (!canAct()) return;
    if (!G.st || !G.st.ship) { UI.toast('You don\'t have a ship. Build a Ship Hull at the Bazaar Shipyard, if your path allows it (J).', 4000); return; }
    send({ t: 'ship', on: !G.you.ship });
  }
  // What F does here: talk to a local, then a landmark, then the kiosk.
  function nearestLocal() {
    let best = null, bd = 4.2 * 4.2;
    for (const n of G.npcs.values()) {
      const T = MM.NPCS[n.type];
      if (T.hostile || !T.talk) continue;
      const d = (n.x - G.me.x) ** 2 + (n.z - G.me.z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  function nearLandmark() {
    for (const l of MM.LANDMARKS) if (l.dim === G.dimId && Math.hypot(l.x - G.me.x, l.z - G.me.z) < l.r + MM.USE_RADIUS) return l;
    return null;
  }
  function interact() {
    if (!canAct()) return;
    const n = nearestLocal();
    if (n) { send({ t: 'talk', n: n.id }); return; }
    const l = nearLandmark();
    if (l) { if (l.door && !tasksAt(l).length) send({ t: 'door', l: l.id }); else openLandmark(l); return; }
    if (nearKiosk()) openDims('kiosk');
  }
  // Daily tasks you can do at a landmark: your own life's, plus the ones anyone can do.
  function tasksAt(l) {
    const A = MM.ARCHETYPES[profile.arch];
    return Object.keys(MM.TASKS).filter(t => MM.TASKS[t].at === l.id && (MM.TASKS[t].any || A.life.daily.includes(t)));
  }
  function openLandmark(l) {
    const A = MM.ARCHETYPES[profile.arch];
    const tasks = tasksAt(l);
    const builds = MM.RECIPE_IDS.filter(r => MM.RECIPES[r].at && MM.isAt(l, MM.RECIPES[r].at));
    openModal('landmark', l.name, box => {
      const list = el('div', { class: 'list' });
      for (const t of tasks) {
        const T = MM.TASKS[t], wait = G.prog ? G.prog.tasks[t] : 0;
        const gives = Object.keys(T.give).map(k => T.give[k] * (profile.arch === 'teen' ? 2 : 1) + ' ' + MM.MATERIALS[k].icon).join(' ');
        list.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: T.name }), el('small', { text: (gives || '') + (T.heal ? ' · heals you' : '') + (wait ? ' · ready in ' + wait + ' s' : '') })),
          el('button', { class: 'btn go', disabled: wait ? '' : null, onclick: () => { send({ t: 'use', l: l.id, task: t }); UI.closeModal(); } }, 'Do it')));
      }
      if (!tasks.length && !l.door) list.append(el('p', { class: 'note', text: 'This place is not part of your daily life.' }));
      box.append(list);
      if (l.door) box.append(el('button', { class: 'btn go', onclick: () => { send({ t: 'door', l: l.id }); UI.closeModal(); } }, 'Go to ' + MM.DIM_BY_ID[l.door.dim].name));
      if (builds.length) box.append(el('p', { class: 'note', text: 'Built here: ' + builds.map(r => MM.RECIPES[r].name).join(', ') + '.' }), el('button', { class: 'btn gold', onclick: () => openCraft() }, 'Open workbench'));
    });
  }
  function emote() { if (!canAct()) return; send({ t: 'em', e: 0 }); G.me.emoteT = 2; }

  // ---------- Dialogs ----------
  function openModal(kind, title, build) {
    if (document.pointerLockElement) document.exitPointerLock();
    G.modal = kind;
    UI.modal(title, build, () => { G.modal = null; });
  }
  // The Central Finite Curve: every reality where Rick is the smartest being, walled off
  // from the rest. Worlds sit inside the dome; the few outside it float beyond the wall.
  function curveMap(onPick) {
    const W = 520, H = 230, cx = W / 2, cy = H * 1.6, rx = W * 0.62, ry = H * 1.35;
    const wrap = el('div', { class: 'curve' });
    const cv = el('canvas', { width: W * 2, height: H * 2, 'aria-label': 'Map of the Central Finite Curve' });
    const cap = el('div', { class: 'curvecap' });
    wrap.append(cv, cap);
    const g = cv.getContext('2d');
    g.scale(2, 2);
    const ids = MM.WORLD_IDS.filter(id => !MM.DIM_BY_ID[id].outsideCurve);
    const out = MM.WORLD_IDS.filter(id => MM.DIM_BY_ID[id].outsideCurve);
    const spots = [];
    const rings = [[0.88, 0.85, 7], [0.74, 0.7, 6], [0.6, 0.5, 6]];
    let k = 0;
    for (const [f, span, n] of rings) for (let i = 0; i < n && k < ids.length; i++, k++) {
      const t = n === 1 ? 0 : -span + (2 * span * i) / (n - 1);
      spots.push({ id: ids[k], x: cx + rx * f * Math.sin(t), y: cy - ry * f * Math.cos(t) });
    }
    out.forEach((id, i) => spots.push({ id, x: 40 + i * 70, y: 26, out: true }));
    let sel = null;
    function draw() {
      g.fillStyle = '#0b0f1e'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + (i * 37 % 10) / 20) + ')'; g.fillRect((i * 173) % W, (i * 97) % H, 1.2, 1.2); }
      // Inside the curve is a little warmer.
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(95,248,255,0.07)'; g.fill(); g.restore();
      for (const [w, a] of [[14, 0.12], [7, 0.3], [2.5, 0.95]]) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2); g.strokeStyle = 'rgba(95,248,255,' + a + ')'; g.lineWidth = w; g.stroke(); }
      g.fillStyle = '#5ff8ff'; g.font = '700 10px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('THE CENTRAL FINITE CURVE', cx, cy - ry - 10);
      if (out.length) { g.fillStyle = '#9aa6c8'; g.font = '9px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('outside the curve', 12, 52); }
      for (const s of spots) {
        const d = MM.DIM_BY_ID[s.id], n = G.pop ? G.pop.d[s.id] || 0 : 0, here = s.id === G.dimId;
        const r = 6 + Math.min(5, n);
        g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.fillStyle = d.accent || '#fff'; g.fill();
        g.lineWidth = 2; g.strokeStyle = '#1d1813'; g.stroke();
        if (here || sel === s) { g.beginPath(); g.arc(s.x, s.y, r + 4, 0, Math.PI * 2); g.strokeStyle = here ? '#39ff6a' : '#ffffff'; g.lineWidth = 2; g.stroke(); }
        g.fillStyle = here ? '#39ff6a' : '#dfe6ff'; g.font = (here ? '700 ' : '') + '9px system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText(here ? 'YOU' : d.code, s.x, s.y + r + 11);
      }
    }
    function caption() {
      cap.textContent = '';
      if (!sel) { cap.append(el('small', { text: 'Tap a world on the map, or pick one below.' })); return; }
      const d = MM.DIM_BY_ID[sel.id];
      cap.append(el('div', { class: 't' }, el('b', { text: d.name + '  ' + d.code + (d.outsideCurve ? '  (outside the curve)' : '') }), el('small', { text: d.blurb })));
      if (sel.id !== G.dimId) cap.append(el('button', { class: 'btn go', onclick: () => onPick(d.id) }, 'Go'));
    }
    cv.addEventListener('click', e => {
      const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height;
      let best = null, bd = 22;
      for (const s of spots) { const dd = Math.hypot(s.x - x, s.y - y); if (dd < bd) { bd = dd; best = s; } }
      sel = best; draw(); caption();
    });
    draw(); caption();
    return wrap;
  }
  function openDims(mode) {
    G.modalMode = mode;
    const go = id => {
      if (mode === 'kiosk') send({ t: 'ki', d: id });
      else if (mode === 'drive') send({ t: 'drive', d: id });
      else { send({ t: 'po', d: id }); UI.toast('Portal open. Walk through it!'); }
      UI.closeModal();
    };
    openModal('dims', mode === 'kiosk' ? 'Portal Kiosk' : mode === 'drive' ? 'Dimension Drive' : 'Portal gun', box => {
      box.append(curveMap(go));
      for (const outside of [false, true]) {
        const ids = MM.WORLD_IDS.filter(id => !!MM.DIM_BY_ID[id].outsideCurve === outside && id !== G.dimId);
        if (!ids.length) continue;
        const list = el('div', { class: 'list' });
        for (const id of ids) {
          const d = MM.DIM_BY_ID[id], n = G.pop ? G.pop.d[id] || 0 : 0;
          list.append(el('div', { class: 'row dim' },
            el('div', { class: 't' }, el('b', { text: d.name + '  ' + d.code }), el('small', { text: d.blurb + ' · ' + n + ' here' })),
            el('button', { class: 'btn go', onclick: () => go(id) }, mode === 'gun' ? 'Open' : 'Go')));
        }
        box.append(el('h3', { text: outside ? 'Outside the Central Finite Curve' : 'Inside the Central Finite Curve' }), list);
      }
      box.append(el('p', { class: 'note', text: mode === 'kiosk' ? 'The kiosk sends you straight there.' : mode === 'drive' ? 'Your ship jumps straight there (15 s cooldown).' : 'Opens a portal in front of you for ' + MM.PORTAL_TTL + ' s. Anyone can walk through it, including your enemies.' }));
    });
  }
  // The workbench: everything you could ever build, and exactly why you can or can't yet.
  function openCraft() {
    const y = G.you, pg = G.prog;
    if (!y || !pg) return;
    const A = MM.ARCHETYPES[profile.arch];
    const here = nearLandmark();
    openModal('craft', 'Workbench', box => {
      const mats = el('div', { class: 'chips' });
      for (const k of MM.MAT_IDS) mats.append(el('span', { class: 'chip', style: 'color:' + MM.MATERIALS[k].color, title: MM.MATERIALS[k].name + ': ' + MM.MATERIALS[k].from }, MM.MATERIALS[k].icon + ' ' + (y.inv[k] || 0) + ' ' + MM.MATERIALS[k].name));
      box.append(mats, el('p', { class: 'note', text: here ? 'You are at the ' + here.name + '.' : 'Big upgrades have to be built at a particular place in a particular dimension.' }));
      for (const cat in MM.CATS) {
        box.append(el('h3', { text: MM.CATS[cat] }));
        const list = el('div', { class: 'list' });
        for (const id of MM.RECIPE_IDS) {
          const R = MM.RECIPES[id];
          if (R.cat !== cat) continue;
          const why = MM.canKnow(profile.arch, pg, id);
          const cost = MM.recipeCost(profile.arch, id);
          const afford = Object.keys(cost).every(k => (y.inv[k] || 0) >= cost[k]);
          const L = R.at ? MM.LANDMARK_BY_ID[R.at] : null;
          const atPlace = !L || (here && here.id === L.id);
          const owned = cat === 'gadget' ? (id === 'fluid' ? 0 : y.inv[id] || 0) : pg.up[id] ? 1 : 0;
          const full = cat === 'gadget' && (id === 'fluid' ? y.ch >= y.chMax : owned >= R.max);
          const costText = Object.keys(cost).map(k => cost[k] + MM.MATERIALS[k].icon).join(' ');
          const where = L ? L.name + ', ' + MM.DIM_BY_ID[L.dim].name : 'anywhere';
          let label = 'Build', ok = !why && afford && atPlace && !full;
          if (pg.up[id] && cat !== 'gadget') label = 'Owned';
          else if (full) label = 'Full';
          else if (why) label = 'Locked';
          else if (!atPlace) label = 'Go there';
          const sub = (why && !pg.up[id] ? why + ' · ' : '') + R.desc + ' · ' + costText + ' · ' + where;
          list.append(el('div', { class: 'row' + (why && !pg.up[id] ? ' locked' : '') },
            el('div', { class: 't' }, el('b', { text: R.name + (cat === 'gadget' && owned ? ' (' + owned + ')' : '') }), el('small', { text: sub })),
            el('button', { class: 'btn ' + (ok ? 'go' : ''), disabled: ok ? null : '', onclick: () => send({ t: 'cr', g: id }) }, label)));
        }
        box.append(list);
      }
      if (A.discount) box.append(el('p', { class: 'note', text: 'Genius discount applied: everything costs a third less.' }));
    });
  }

  // Your life: who you are now, your daily routine, your path out, and errands.
  function openJournal() {
    const pg = G.prog;
    if (!pg) return;
    const A = MM.ARCHETYPES[profile.arch];
    openModal('journal', 'Journal', box => {
      box.append(el('p', null, el('b', { text: profile.name + ', ' + (pg.title || A.life.normal) }), ' · ' + A.name + ' from ' + MM.DIM_BY_ID[A.home].name));
      box.append(el('p', { class: 'note', text: 'Live your normal life, or break out of it by following your path. Nothing forces you either way.' }));
      box.append(el('h3', { text: 'Daily life' }));
      const daily = el('div', { class: 'list' });
      for (const t of A.life.daily) {
        const T = MM.TASKS[t], L = MM.LANDMARK_BY_ID[T.at], wait = pg.tasks[t];
        daily.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: T.name }), el('small', { text: L.name + ' in ' + MM.DIM_BY_ID[L.dim].name + ' · press F there' })),
          el('span', { class: 'chip', text: wait ? 'in ' + wait + ' s' : 'ready' })));
      }
      box.append(daily, el('h3', { text: 'Your path: ' + A.life.normal + ' → ' + A.life.breakout }));
      const steps = el('div', { class: 'list' });
      A.steps.forEach((S, i) => {
        const done = i < pg.step, cur = i === pg.step;
        const pr = MM.stepProgress(pg, S.goal, G.you ? G.you.inv : {});
        const un = (S.grants || []).map(r => MM.RECIPES[r].name).join(', ');
        steps.append(el('div', { class: 'row' + (done ? ' done' : cur ? ' cur' : ' later') },
          el('div', { class: 't' }, el('b', { text: (done ? '✓ ' : '') + S.name }), el('small', { text: S.desc + (un ? ' · Unlocks: ' + un : '') + (S.title ? ' · Become ' + A.life.breakout : '') })),
          el('span', { class: 'chip', text: done ? 'done' : cur ? pr.now + '/' + pr.need : '…' })));
      });
      box.append(steps);
      box.append(el('h3', { text: 'Errands' }));
      if (!pg.errands.length) box.append(el('p', { class: 'note', text: 'None. Talk to locals (F) and some will ask for favours.' }));
      for (const e of pg.errands) box.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: e.n + ' ' + MM.MATERIALS[e.m].name + ' → any ' + MM.NPCS[e.npc].name + ' in ' + MM.DIM_BY_ID[e.dim].name }),
        el('small', { text: 'From ' + e.from + '. Reward: ' + Object.keys(e.rew).map(k => e.rew[k] + ' ' + MM.MATERIALS[k].name).join(', ') }))));
      const st = G.st;
      box.append(el('h3', { text: 'You' }), el('p', { class: 'note', text: 'Health ' + st.maxHp + ' · speed ' + st.speed.toFixed(1) + ' · damage ×' + st.dmg.toFixed(2) +
        (st.fly ? ' · ' + (st.fly === 'jet' ? 'jetpack' : 'wings') : '') + (st.gun ? ' · portal gun ×' + st.gun.charges : '') + (st.ship ? ' · ship' + (st.ship.drive ? ' with dimension drive' : '') : '') }));
    });
  }
  function openBoard() {
    openModal('board', 'Multiverse', box => {
      box.append(el('h3', { text: 'Chaos leaderboard (everyone online)' }));
      const tb = el('table', { class: 'lb' }, el('tr', null, el('th', { text: '#' }), el('th', { text: 'Variant' }), el('th', { text: 'Chaos' }), el('th', { text: 'KOs' }), el('th', { text: 'Where' })));
      G.top.forEach((r, i) => tb.append(el('tr', null, el('td', { text: String(i + 1) }), el('td', { text: r[0] + ' ' + r[1] + (r[5] ? ' (bot)' : '') }), el('td', { text: String(r[2]) }), el('td', { text: String(r[3]) }), el('td', { text: MM.DIM_BY_ID[r[4]] ? MM.DIM_BY_ID[r[4]].name : '' }))));
      box.append(tb, el('h3', { text: 'In this dimension' }));
      const list = el('div', { class: 'list' });
      for (const [id, p] of G.players) {
        const muted = G.muted.has(id);
        list.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: p.info.name + ' ' + p.info.home }), el('small', { text: archLabel(p.info) })),
          el('button', { class: 'btn', onclick: () => { if (muted) G.muted.delete(id); else G.muted.add(id); openBoard(); } }, muted ? 'Unmute' : 'Mute')));
      }
      if (!G.players.size) list.append(el('p', { class: 'note', text: 'Nobody else here right now.' }));
      box.append(list);
    });
  }
  function openMenu() {
    openModal('menu', 'Paused (the multiverse keeps going)', box => {
      const row = (label, input) => el('div', { class: 'opt' }, el('span', { class: 'lbl', text: label }), input);
      box.append(
        row('Look sensitivity', el('input', { type: 'range', min: 0.3, max: 2.5, step: 0.05, value: settings.sens, oninput: e => { settings.sens = Number(e.target.value); UI.save('settings', settings); } })),
        row('Volume', el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings.volume, oninput: e => { settings.volume = Number(e.target.value); C.setVolume(settings.volume); UI.save('settings', settings); } })),
        row('View', el('div', { class: 'chips' }, ...[['third', 'Third person'], ['first', 'First person']].map(([v, t]) => el('button', { class: 'chip', 'aria-pressed': String(settings.view === v), onclick: () => { setView(v); openMenu(); } }, t)))),
        row('Graphics', el('div', { class: 'chips' }, ...['high', 'low'].map(q => el('button', { class: 'chip', 'aria-pressed': String(settings.quality === q), onclick: () => { settings.quality = q; applyQuality(); resize(); UI.save('settings', settings); openMenu(); } }, q)))),
        row('Options', el('div', { class: 'chips' },
          el('button', { class: 'chip', 'aria-pressed': String(settings.invert), onclick: () => { settings.invert = !settings.invert; UI.save('settings', settings); openMenu(); } }, 'Invert look'),
          el('button', { class: 'chip', 'aria-pressed': String(settings.botChat), onclick: () => { settings.botChat = !settings.botChat; UI.save('settings', settings); openMenu(); } }, 'Show bot chat'))),
        el('div', { class: 'chips' },
          el('button', { class: 'btn go', onclick: () => UI.closeModal() }, 'Resume'),
          el('button', { class: 'btn', onclick: () => UI.help() }, 'How to play'),
          el('button', { class: 'btn pink', onclick: () => leave('') }, 'Leave to menu')));
    });
  }

  // ---------- Input ----------
  const keys = new Set();
  const touch = { mx: 0, mz: 0, fire: false, jump: false, stickId: null, lookId: null, lx: 0, ly: 0 };
  let mouseDown = false;
  const chatOpen = () => !$('chatInput').hidden;
  function openChat() {
    if (document.pointerLockElement) document.exitPointerLock();
    $('chatInput').hidden = false; $('chatInput').value = ''; $('chatInput').focus();
    UI.chatShowAll(true);
  }
  function closeChat(sendIt) {
    const v = $('chatInput').value.trim();
    if (sendIt && v) send({ t: 'c', text: v.slice(0, 140) });
    $('chatInput').hidden = true; $('chatInput').blur();
    UI.chatShowAll(false);
  }
  $('chatInput').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') closeChat(true);
    else if (e.key === 'Escape') closeChat(false);
  });

  window.addEventListener('keydown', e => {
    if (G.mode !== 'play') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (UI.modalOpen()) { if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); UI.closeModal(); } return; }
    if (e.key === 'Tab') { e.preventDefault(); openBoard(); return; }
    keys.add(e.code);
    if (e.repeat) return;
    switch (e.code) {
      case 'Enter': case 'KeyT': e.preventDefault(); openChat(); break;
      case 'Escape': openMenu(); break;
      case 'KeyE': portalAction(); break;
      case 'KeyF': interact(); break;
      case 'KeyC': openCraft(); break;
      case 'KeyJ': openJournal(); break;
      case 'KeyB': toggleShip(); break;
      case 'KeyQ': ability(); break;
      case 'Digit1': useGadget('grenade'); break;
      case 'Digit2': useGadget('turret'); break;
      case 'Digit3': useGadget('shrink'); break;
      case 'Digit4': useGadget('meeseeks'); break;
      case 'KeyV': toggleView(); break;
      case 'KeyG': emote(); break;
      case 'Space': e.preventDefault(); if (G.you && G.you.dead && now() >= G.rsAt) send({ t: 'rs' }); break;
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; touch.fire = false; touch.jump = false; });

  // Mouse: pointer lock when the page allows it; otherwise drag to look.
  canvas.addEventListener('mousedown', e => {
    if (G.mode !== 'play' || UI.modalOpen() || isTouch) return;
    C.audioUnlock();
    if (!document.pointerLockElement && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
    if (e.button === 0) mouseDown = true;
  });
  window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
  window.addEventListener('mousemove', e => {
    if (G.mode !== 'play' || isTouch) return;
    const locked = document.pointerLockElement === canvas;
    if (!locked && !(e.buttons & 1)) return;
    if (!locked && e.target !== canvas) return;
    look(e.movementX, e.movementY);
  });
  canvas.addEventListener('wheel', e => {
    // Scroll all the way in for first person, and back out for third.
    if (firstPerson()) { if (e.deltaY > 0) { setView('third'); G.camDist = 3; } return; }
    if (e.deltaY < 0 && G.camDist <= 3) { setView('first'); return; }
    G.camDist = Math.max(3, Math.min(14, G.camDist + Math.sign(e.deltaY) * 0.8));
  }, { passive: true });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function look(dx, dy) {
    const s = 0.0026 * settings.sens;
    G.camYaw -= dx * s;
    const lo = firstPerson() ? -1.45 : -0.6, hi = firstPerson() ? 1.45 : 1.25;
    G.camPitch = Math.max(lo, Math.min(hi, G.camPitch + dy * s * (settings.invert ? -1 : 1)));
    vm.swayX = Math.max(-0.04, Math.min(0.04, vm.swayX - dx * 0.00025));
    vm.swayY = Math.max(-0.04, Math.min(0.04, vm.swayY + dy * 0.00025 * (settings.invert ? -1 : 1)));
  }

  // Touch: left stick, drag anywhere else to look, round buttons.
  const stick = $('stick');
  stick.addEventListener('pointerdown', e => { touch.stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); C.audioUnlock(); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === touch.stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId !== touch.stickId) return; touch.stickId = null; touch.mx = touch.mz = 0; stick.firstElementChild.style.transform = ''; };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    touch.mx = dx; touch.mz = -dy;
    stick.firstElementChild.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || G.mode !== 'play' || touch.lookId !== null) return;
    touch.lookId = e.pointerId; touch.lx = e.clientX; touch.ly = e.clientY;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== touch.lookId) return;
    look((e.clientX - touch.lx) * 1.6, (e.clientY - touch.ly) * 1.6);
    touch.lx = e.clientX; touch.ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === touch.lookId) touch.lookId = null; };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
  // Firing also lets you look: drag on the fire button.
  const hold = (id, key) => {
    const b = $(id);
    let lx = 0, ly = 0;
    b.addEventListener('pointerdown', e => { touch[key] = true; lx = e.clientX; ly = e.clientY; b.setPointerCapture(e.pointerId); C.audioUnlock(); });
    b.addEventListener('pointermove', e => { if (key === 'fire' && touch.fire) { look((e.clientX - lx) * 1.6, (e.clientY - ly) * 1.6); lx = e.clientX; ly = e.clientY; } });
    const up = () => { touch[key] = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  hold('tFire', 'fire'); hold('tJump', 'jump');
  $('tAb').addEventListener('pointerdown', () => ability());
  $('tPortal').addEventListener('pointerdown', () => portalAction());
  $('tTalk').addEventListener('pointerdown', () => interact());
  $('tShip').addEventListener('pointerdown', () => toggleShip());
  $('bJournal').onclick = () => openJournal();
  // Offline progress lives in this browser: save it when the page goes away.
  window.addEventListener('pagehide', () => { if (G.net && G.net.host) G.net.host.saveAll(); });
  $('tGadget').addEventListener('pointerdown', () => { const y = G.you; if (!y) return; const g = MM.GADGET_IDS.find(k => y.inv[k] > 0); if (g) useGadget(g); else openCraft(); });

  $('respawn').onclick = () => { if (G.you && G.you.dead && now() >= G.rsAt) send({ t: 'rs' }); };
  $('bBoard').onclick = () => openBoard();
  $('bChat').onclick = () => (chatOpen() ? closeChat(false) : openChat());
  $('bView').onclick = () => toggleView();
  $('bMenu').onclick = () => openMenu();

  // ---------- Local movement ----------
  // Props: solid sideways, but you can stand on top of them.
  function groundAt(x, z, y) {
    let g = MM.heightAt(G.dimId, x, z);
    const props = MM.genProps(G.dimId);
    for (const p of props) {
      if (!G.alive[p.id] || MM.PROPS[p.type].arch) continue;
      const top = p.y + p.h * 0.92;
      if (y >= top - 0.6 && (x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) g = Math.max(g, top);
    }
    return g;
  }
  function pushOut(x, z, y, rad) {
    const props = MM.genProps(G.dimId);
    for (const p of props) {
      if (!G.alive[p.id] || MM.PROPS[p.type].arch) continue;
      if (y >= p.y + p.h * 0.92 - 0.6) continue;
      const dx = x - p.x, dz = z - p.z, min = p.r + rad, d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) { const d = Math.sqrt(d2); x = p.x + dx / d * min; z = p.z + dz / d * min; }
    }
    return [x, z];
  }

  function updateMe(dt) {
    const me = G.me, y = G.you;
    const A = MM.ARCHETYPES[profile.arch];
    const dim = MM.DIM_BY_ID[G.dimId];
    const dead = !y || y.dead;
    // Wanted direction relative to the camera.
    let ix = 0, iz = 0;
    if (!chatOpen() && !UI.modalOpen()) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    }
    ix += touch.mx; iz += touch.mz;
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    if (dead) { ix = iz = 0; }
    const fxb = y ? y.fx : 0;
    const st = G.st || MM.statsOf(profile.arch, {});
    const inShip = !!(y && y.ship && st.ship);
    // Same speed rules as the server (Host.speedOf), so you never get snapped back.
    const mult = (fxb & 2 ? 1.8 : 1) * (fxb & 8 ? 0.75 : 1) * (fxb & 16 ? 0.6 : 1) * (fxb & 256 ? 0.5 : 1) * (fxb & 1024 ? 0.12 : 1);
    const speed = inShip ? st.ship.speed * mult : st.speed * mult * (st.fly && !me.grounded ? 1.3 : 1);
    const sy = Math.sin(G.camYaw), cy = Math.cos(G.camYaw);
    const wx = (sy * iz - cy * ix) * speed, wz = (cy * iz + sy * ix) * speed;
    const accel = me.kbT > 0 ? 2 : inShip ? 5 : me.grounded ? 40 : 10;
    const k = Math.min(1, accel * dt);
    me.vx += (wx - me.vx) * k; me.vz += (wz - me.vz) * k;
    me.kbT = Math.max(0, me.kbT - dt);
    const jumpHeld = !chatOpen() && !UI.modalOpen() && (keys.has('Space') || touch.jump) && !dead;
    const downHeld = !chatOpen() && !UI.modalOpen() && (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('ControlLeft'));
    me.flying = false;
    if (inShip) {
      // Ship: fly where you look. Space climbs, Shift dives.
      const climb = (jumpHeld ? 1 : 0) - (downHeld ? 1 : 0) + (iz > 0 ? -Math.sin(G.camPitch) * iz * 0.8 : 0);
      me.vy += (climb * 12 - me.vy) * Math.min(1, dt * 4);
      me.grounded = false;
    } else if (jumpHeld && me.grounded) {
      me.vy = st.jump;
      me.grounded = false;
      me.jumpLock = 0.25;
      C.sfx('jump', 0.4);
    } else if (st.fly && jumpHeld && !me.grounded && (me.jumpLock -= dt) <= 0 && me.fly > 0) {
      me.vy += (7 - me.vy) * Math.min(1, dt * 5);
      me.fly = Math.max(0, me.fly - dt);
      me.flying = true;
      if (st.fly === 'jet' && Math.random() < 0.5) fx.glow.emit(me.x, me.y + 0.5, me.z, 0, -4, 0, '#ffb03a', 0.4, 0.3, 0);
    }
    if (me.grounded) me.fly = Math.min(st.flyTime || 6, me.fly + dt * 1.5);
    if (!inShip) me.vy -= dim.gravity * dt * (me.flying ? 0.2 : 1);
    let nx = me.x + me.vx * dt, nz = me.z + me.vz * dt, ny = me.y + me.vy * dt;
    [nx, nz] = pushOut(nx, nz, ny, inShip ? 1.6 : 0.45);
    const lim = MM.boundOf(G.dimId) - (MM.DIM_BY_ID[G.dimId].interior ? 0 : 1);
    nx = Math.max(-lim, Math.min(lim, nx)); nz = Math.max(-lim, Math.min(lim, nz));
    const g = groundAt(nx, nz, Math.max(ny, me.y)) + (inShip ? 0.4 : 0);
    if (inShip) { if (ny < g) { ny = g; me.vy = Math.max(0, me.vy); } ny = Math.min(ny, g + 90); }
    else if (ny <= g) {
      if (!me.grounded && me.vy < -14) fx.puff(nx, g, nz, '#ddd', 6, 1, 1, 0.5);
      ny = g; me.vy = 0; me.grounded = true;
    } else if (ny > g + 0.15) me.grounded = false;
    else if (me.grounded && me.vy <= 0) ny = g;
    me.x = nx; me.y = ny; me.z = nz;
    // Face where you move, or where you aim right after shooting.
    me.aimT = Math.max(0, me.aimT - dt);
    me.emoteT = Math.max(0, me.emoteT - dt);
    const hs = Math.hypot(me.vx, me.vz);
    if (firstPerson() || me.aimT > 0 || mouseDown || touch.fire) me.yaw = G.camYaw;
    else if (hs > 0.5) me.yaw += wrap(Math.atan2(me.vx, me.vz) - me.yaw) * Math.min(1, dt * 12);
    me.anim = dead ? MM.ANIM.dead : inShip ? MM.ANIM.idle : me.flying ? MM.ANIM.fly : !me.grounded ? MM.ANIM.air : me.emoteT > 0 ? MM.ANIM.emote : hs > 0.6 ? MM.ANIM.run : MM.ANIM.idle;
    if (G.meAv) {
      G.meAv.root.position.set(me.x, me.y, me.z);
      G.meAv.root.rotation.y = me.yaw;
      G.meAv.animate(dt, { speed: me.grounded ? hs : 0, anim: me.anim, fx: fxb });
      G.meAv.body.visible = !firstPerson() || dead;
      vm.bob += (me.grounded && !inShip ? hs : 0) * dt * 1.6; vm.speed = me.grounded && !inShip ? Math.min(1, hs / 5) : 0;
    }
    if (st.fly) $('flyFill').style.transform = 'scaleX(' + me.fly / (st.flyTime || 6) + ')';
    // Hold to fire.
    if ((mouseDown && document.pointerLockElement === canvas) || (mouseDown && !document.pointerLockElement) || touch.fire) fire();
    // Tell the host where we are.
    if ((G.stT -= dt) <= 0 && !dead) {
      G.stT = 1 / 15;
      send({ t: 'st', x: r2(me.x), y: r2(me.y), z: r2(me.z), r: r2(wrap(me.yaw)), a: me.anim, ep: G.ep });
    }
    // What F would do right here.
    if ((G.promptT -= dt) <= 0) {
      G.promptT = 0.2;
      const n = nearestLocal(), l = n ? null : nearLandmark(), nk = !n && !l && nearKiosk();
      const key = n ? 'n' + n.id : l ? 'l' + l.id : nk ? 'k' : '';
      if (key !== G.promptKey) {
        G.promptKey = key;
        $('prompt').hidden = !key;
        $('tTalk').hidden = !key;
        $('prompt').textContent = '';
        const b = el('b', { text: isTouch ? 'TALK' : 'F' });
        if (n) { $('prompt').append(b, ' Talk to ' + n.name); $('tTalk').textContent = 'TALK'; }
        else if (l) {
          const dest = l.door ? MM.DIM_BY_ID[l.door.dim].name : '';
          $('prompt').append(b, ' ' + (l.door ? (dest === l.name ? 'Enter ' + dest : l.name + ' → ' + dest) : l.name));
          $('tTalk').textContent = l.door && !tasksAt(l).length ? 'GO' : 'USE';
        }
        else if (nk) { $('prompt').append(b, ' Portal Kiosk: travel to any dimension'); $('tTalk').textContent = 'KIOSK'; }
        updateHotbar();
      }
    }
    // Cooldown shading on the ability slot.
    if (slots.ab && G.abReadyAt !== undefined) {
      const left = Math.max(0, G.abReadyAt - now());
      slots.ab.querySelector('.cd').style.transform = 'scaleY(' + Math.min(1, left / A.ability.cd) + ')';
      slots.ab.querySelector('.n').textContent = left > 0 ? Math.ceil(left) : '';
    }
    if (y && y.dead) {
      const left = Math.max(0, G.rsAt - now());
      $('respawn').disabled = left > 0;
      $('respawn').textContent = left > 0 ? 'Respawn in ' + Math.ceil(left) : 'Respawn';
    }
  }

  // ---------- Everyone else ----------
  const INTERP = 0.12;
  function sample(snaps, rt, out) {
    if (!snaps.length) return false;
    let a = snaps[0], b = null;
    for (let i = snaps.length - 1; i >= 0; i--) if (snaps[i].t <= rt) { a = snaps[i]; b = snaps[i + 1] || null; break; }
    if (!b) { out.x = a.x; out.y = a.y; out.z = a.z; out.r = a.r; return a; }
    const k = (rt - a.t) / Math.max(1e-3, b.t - a.t);
    out.x = a.x + (b.x - a.x) * k; out.y = a.y + (b.y - a.y) * k; out.z = a.z + (b.z - a.z) * k;
    out.r = a.r + wrap(b.r - a.r) * k;
    return k < 0.5 ? a : b;
  }
  const tmp = {};
  function updateOthers(dt) {
    const rt = now() - (G.offset || 0) - INTERP;
    const fogFar = MM.DIM_BY_ID[G.dimId].fogFar;
    for (const p of G.players.values()) {
      const s = sample(p.snaps, rt, tmp);
      if (!s) { p.av.root.visible = false; continue; }
      p.x = tmp.x; p.y = tmp.y; p.z = tmp.z; p.r = tmp.r;
      const sp = Math.hypot(p.x - p.px, p.z - p.pz) / Math.max(dt, 1e-3);
      p.speed += (sp - p.speed) * Math.min(1, dt * 10);
      p.px = p.x; p.pz = p.z;
      if (s.hp !== p.hp) { p.hp = s.hp; p.tag.draw(p.hp); }
      p.emoteT = Math.max(0, p.emoteT - dt);
      const d = Math.hypot(p.x - G.me.x, p.z - G.me.z);
      p.av.root.visible = d < fogFar + 10;
      if (!p.av.root.visible) continue;
      p.av.root.position.set(p.x, p.y, p.z);
      p.av.root.rotation.y = p.r;
      const inShip = !!(s.fx & 512);
      if (inShip !== !!p.av.inShip) { C.setShip(p.av, inShip, p.info.gear); collectOutlines(p.av); }
      const anim = s.a === MM.ANIM.dead ? s.a : p.emoteT > 0 ? MM.ANIM.emote : s.a;
      p.av.animate(dt, { speed: s.a === MM.ANIM.run ? Math.max(p.speed, 3) : p.speed * 0.3, anim, fx: s.fx });
      p.av.setDetail(nearCam(p.x, p.z));
      const near = d < 40;
      for (const o of p.av.outlines) o.visible = near || settings.quality === 'high';
      p.tag.sprite.visible = d < 45 && s.a !== MM.ANIM.dead;
    }
    for (const n of G.npcs.values()) {
      if (sample(n.snaps, rt, tmp)) { n.x = tmp.x; n.y = tmp.y; n.z = tmp.z; n.r = tmp.r; }
      const sp = Math.hypot(n.x - n.px, n.z - n.pz) / Math.max(dt, 1e-3);
      n.speed += (sp - n.speed) * Math.min(1, dt * 10);
      n.px = n.x; n.pz = n.z;
      n.t += dt;
      const root = n.m.root;
      root.position.set(n.x, n.y, n.z);
      root.rotation.y = n.r;
      if (n.m.av) { n.m.av.animate(dt, { speed: n.speed, anim: (n.flags & 4) ? MM.ANIM.emote : n.speed > 0.4 ? 1 : 0 }); n.m.av.setDetail(nearCam(n.x, n.z)); }
      else {
        const md = root.userData.model;
        if (n.type === 'meatblob') { const s = 1 + Math.sin(n.t * (3 + n.speed)) * 0.08; md.scale.set(1 / s, s, 1 / s); }
        else if (n.type === 'jelly') { const s = 1 + Math.sin(n.t * 2) * 0.1; md.scale.set(s, 1 / s, s); }
        else if (n.type === 'mooncrab') md.position.y = Math.abs(Math.sin(n.t * 12)) * 0.08 * Math.min(1, n.speed);
        else if (n.type === 'skyserpent') { md.rotation.z = Math.sin(n.t * 4) * 0.25; md.rotation.x = Math.sin(n.t * 2) * 0.15; }
      }
      // Following you: green sparkles. Angry: red. Stunned: yellow. Dancing: pink.
      if (n.flags && Math.random() < 0.15) {
        const c = (n.flags & 8) ? '#ffd84d' : (n.flags & 2) ? '#ff5a5a' : (n.flags & 1) ? '#7dff9a' : '#ff6fd0';
        fx.glow.emit(n.x + (Math.random() - 0.5), n.y + 2.2, n.z + (Math.random() - 0.5), 0, 1, 0, c, 0.35, 0.6, 0);
      }
      if (n.bubble && (n.bubbleT -= dt) <= 0) { n.m.root.remove(n.bubble.sprite); n.bubble.sprite.material.map.dispose(); n.bubble = null; }
      if (n.tag) n.tag.sprite.visible = Math.hypot(n.x - G.me.x, n.z - G.me.z) < 25;
    }
    const t = now();
    for (const po of G.portals.values()) {
      po.mesh.userData.tick(dt);
      const left = po.ttl - (t - po.born);
      const open = Math.min(1, (t - po.born) * 3) * Math.min(1, Math.max(0, left) * 1.5);
      po.mesh.material.uniforms.open.value = Math.max(0.01, open);
      if (Math.random() < 0.3) fx.glow.emit(po.x + (Math.random() - 0.5) * 2, po.y + 0.5 + Math.random() * 2.5, po.z + (Math.random() - 0.5) * 2, 0, 1, 0, po.mesh.material.uniforms.col.value, 0.3, 0.6, 0);
    }
    for (const tu of G.turrets.values()) tu.m.userData.head.rotation.y += wrap(tu.aim - tu.m.userData.head.rotation.y) * Math.min(1, dt * 10);
    for (const m of G.pickups.values()) { m.userData.ph += dt; m.position.y = m.userData.base + Math.sin(m.userData.ph * 2) * 0.2; m.userData.spin.rotation.y += dt * 2; }
  }

  // Characters within this distance of the camera get their smooth, detailed model.
  function nearCam(x, z) { return (x - camera.position.x) ** 2 + (z - camera.position.z) ** 2 < (settings.quality === 'low' ? 16 * 16 : 26 * 26); }

  // ---------- Camera ----------
  function firstPerson() { return settings.view === 'first'; }
  function setView(v) {
    settings.view = v; UI.save('settings', settings);
    if (v === 'third') G.camPitch = Math.max(-0.6, Math.min(1.25, G.camPitch));
    UI.toast((v === 'first' ? 'First person' : 'Third person') + (isTouch ? '' : ' (V to switch)'), 1500);
  }
  function toggleView() { setView(firstPerson() ? 'third' : 'first'); }
  // Your right arm, with the same sleeve, skin and gun as your character.
  function buildViewModel() {
    if (vm.root) vmScene.remove(vm.root);
    vm.root = vm.arm = null; vm.src = G.meAv;
    if (!G.meAv) return;
    const holder = new T.Group();
    vm.holder = holder;
    const arm = new T.Group();
    arm.add(C.buildViewArm(profile.look, profile.arch));
    holder.add(arm);
    vm.root = new T.Group(); vm.root.add(holder);
    vm.arm = arm;
    vmScene.add(vm.root);
  }
  function updateViewModel(dt) {
    if (vm.src !== G.meAv) buildViewModel();
    if (!vm.root) return false;
    const y = G.you, show = firstPerson() && y && !y.dead && !y.ship && G.me.emoteT <= 0;
    vm.root.visible = !!show;
    if (!show) return false;
    const k = vm.speed || 0, melee = MM.WEAPONS[weaponId()].melee;
    const at = Math.max(0, G.meAv.attackT || 0);
    const punch = melee ? Math.sin(Math.min(1, 1 - at / 0.3) * Math.PI) * (at > 0 ? 1 : 0) : 0, kick = melee ? 0 : at / 0.2;
    vm.swayX *= Math.max(0, 1 - dt * 8); vm.swayY *= Math.max(0, 1 - dt * 8);
    const P0 = melee ? vm.fistPose : vm.pose;
    vm.holder.rotation.set(0, Math.PI + P0.yaw, P0.roll);   // the character faces +z; the camera looks down -z
    vm.holder.scale.setScalar(P0.size / Math.max(0.5, G.meAv.look.height));
    vm.root.position.set(P0.x + Math.sin(vm.bob) * 0.01 * k + vm.swayX, P0.y - Math.abs(Math.cos(vm.bob)) * 0.012 * k + vm.swayY, P0.z + kick * 0.04 - punch * 0.15);
    vm.arm.rotation.x = P0.pitch - kick * 0.15 - punch * 0.15;
    return true;
  }

  function updateCamera(dt) {
    const me = G.me;
    const sc = G.meAv ? G.meAv.root.scale.x : 1;
    if (firstPerson() && !(G.you && G.you.dead)) {
      const cp = Math.cos(G.camPitch);
      let cx = me.x, cy = me.y + (G.meAv ? G.meAv.eyeY : 1.6) * sc, cz = me.z;
      if (G.you && G.you.ship) cy = me.y + 1.9;
      if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake; cy += (Math.random() - 0.5) * G.shake; cz += (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.5); }
      camera.position.set(cx, cy, cz);
      camera.lookAt(cx + Math.sin(G.camYaw) * cp, cy - Math.sin(G.camPitch), cz + Math.cos(G.camYaw) * cp);
      return;
    }
    const tx = me.x, ty = me.y + 1.7 * sc + 0.2, tz = me.z;
    const cp = Math.cos(G.camPitch), sp = Math.sin(G.camPitch);
    const fx_ = Math.sin(G.camYaw) * cp, fy = -sp, fz = Math.cos(G.camYaw) * cp;
    const dist = G.camDist * (0.7 + 0.3 * sc) * (MM.DIM_BY_ID[G.dimId].room ? 0.7 : 1);
    const rx = -Math.cos(G.camYaw), rz = Math.sin(G.camYaw);
    const sh = 0.55;
    // Pull the camera in when a prop is between it and the player.
    let d = dist;
    if ((G.camPropT -= dt) <= 0) {
      G.camPropT = 0.3;
      G.camProps = MM.genProps(G.dimId).filter(p => (p.x - tx) ** 2 + (p.z - tz) ** 2 < (p.r + dist + 2) ** 2);
    }
    for (let s = 0.8; s <= dist; s += 0.4) {
      const px = tx - fx_ * s + rx * sh * s / dist, py = ty - fy * s, pz = tz - fz * s + rz * sh * s / dist;
      let hit = false;
      for (const p of G.camProps || []) {
        if (!G.alive[p.id] || py > p.y + p.h || py < p.y - 1) continue;
        if ((px - p.x) ** 2 + (pz - p.z) ** 2 < (p.r + 0.3) ** 2) { hit = true; break; }
      }
      if (hit) { d = Math.max(0.8, s - 0.4); break; }
    }
    G.camD = G.camD === undefined ? d : (d < G.camD ? d : G.camD + (d - G.camD) * Math.min(1, dt * 4));
    const k = G.camD / dist;
    let cx = tx - fx_ * G.camD + rx * sh * k, cy = ty - fy * G.camD, cz = tz - fz * G.camD + rz * sh * k;
    const g = MM.heightAt(G.dimId, cx, cz) + 0.4;
    if (cy < g) cy = g;
    const room = MM.DIM_BY_ID[G.dimId].room;
    if (room) {
      // Keep the camera inside the walls and under the ceiling.
      const hx = room.w / 2 - 0.5, hz = room.d / 2 - 0.5;
      cx = Math.max(-hx, Math.min(hx, cx)); cz = Math.max(-hz, Math.min(hz, cz)); cy = Math.min(room.h - 0.5, cy);
    }
    if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake; cy += (Math.random() - 0.5) * G.shake; cz += (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.5); }
    camera.position.set(cx, cy, cz);
    camera.lookAt(cx + fx_, cy + fy, cz + fz);
  }

  // ---------- Main loop ----------
  const clock = new T.Clock();
  const proj = new T.Vector3();
  let menuInited = false;
  function frame() {
    requestAnimationFrame(frame);
    // Real time passed (capped), so a slow device still plays at normal speed.
    const raw = Math.min(0.25, clock.getDelta());
    const dt = Math.min(0.05, raw);
    if (G.net) G.net.pump(raw);
    if (G.mode === 'menu') {
      if (!menuInited) { menuInited = true; initMenu(); $('loading').hidden = true; $('menu').hidden = false; }
      renderMenu(dt);
      return;
    }
    if (G.mode !== 'play' || !G.world) { renderer.clear(); return; }
    for (let left = raw; left > 1e-4; left -= 0.05) updateMe(Math.min(0.05, left));
    updateOthers(dt);
    updateCamera(dt);
    G.world.update(dt, clock.elapsedTime, camera.position);
    fx.update(dt);
    const w = window.innerWidth, h = window.innerHeight;
    UI.updateNums(dt, n => {
      proj.copy(n.w).project(camera);
      if (proj.z > 1) return null;
      return { x: (proj.x * 0.5 + 0.5) * w, y: (-proj.y * 0.5 + 0.5) * h };
    });
    // Ping and connection watch for online play.
    if (G.net && G.net.kind === 'online') {
      if ((G.pingT -= dt) <= 0) { G.pingT = 3; send({ t: 'pi', c: Math.round(now() * 1000) }); }
      const stale = G.lastSnap && now() - G.lastSnap > 2;
      $('netWarn').hidden = !stale;
      if (stale) $('netWarn').textContent = 'Connection unstable…';
    }
    renderer.render(scene, camera);
    if (updateViewModel(dt)) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(vmScene, vmCam); renderer.autoClear = true; }
  }
  frame();
})();
