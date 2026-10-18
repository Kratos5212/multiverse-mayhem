// Multiverse Mayhem client: menu, connection, local movement, other players,
// camera, input (keyboard, mouse, touch) and the HUD.
(function () {
  'use strict';
  const T = THREE, C = window.MMC, UI = C.UI, $ = UI.$, el = UI.el;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const now = () => performance.now() / 1000;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const r2 = v => Math.round(v * 100) / 100;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Profile and settings ----------
  const settings = UI.load('settings', { sens: 1, invert: false, volume: 0.6, quality: isTouch ? 'low' : 'high', botChat: true, view: 'third' });
  const profile = UI.load('profile', { name: '', home: '', arch: 'genius', look: null, server: '', startDim: 'suburbia' });
  if (!MM.ARCHETYPES[profile.arch]) profile.arch = 'genius';
  profile.look = profile.look ? MM.sanitizeLook(profile.look) : MM.canonLook(profile.arch);
  // Rick's colours changed to match the show: a saved look still in the old canon colours
  // becomes the new canon look (so the sculpted Rick is used).
  if (profile.arch === 'genius' && profile.look.skin === '#f0dccb' && profile.look.hairColor === '#b4d8e8' && profile.look.pantsColor === '#6e4a2a')
    Object.assign(profile.look, { skin: '#ddd7c9', hairColor: '#6fd2df', topColor: '#f2f5f7', shirtColor: '#74d0dd', pantsColor: '#686530', shoeColor: '#2b393f' });
  if (!profile.home) profile.home = 'ABDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)] + '-' + Math.floor(Math.random() * 999 + 1);
  if (profile.startDim && !MM.DIM_BY_ID[profile.startDim]) profile.startDim = '';
  C.setVolume(settings.volume);
  C.bevelSegs = settings.quality === 'low' ? 2 : 3;   // rounded-edge smoothness
  if (!settings.style) settings.style = 'real';
  C.setStyle(settings.style, settings.quality);

  // ---------- Renderer ----------
  const canvas = $('view');
  const renderer = new T.WebGLRenderer({ canvas, antialias: settings.quality === 'high', powerPreference: 'high-performance' });
  C.renderer = renderer;
  const applyQuality = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.25));
  applyQuality();
  // The realistic look: filmic tone mapping, and soft sun shadows on high quality.
  if (C.style === 'real') {
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    if (settings.quality === 'high') { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
  }
  renderer.setClearColor('#0b0f1e');
  const camera = new T.PerspectiveCamera(62, 1, 0.1, 1500);
  C.camera = camera;
  // First person: your own arm and gun live in a tiny scene drawn on top of the world,
  // so they never poke through walls.
  const vmScene = new T.Scene();
  vmScene.add(new T.HemisphereLight('#ffffff', '#8890a0', 0.65));
  const vmSun = new T.DirectionalLight('#ffffff', 0.5); vmSun.position.set(1, 3, 2); vmScene.add(vmSun);
  const vmCam = new T.PerspectiveCamera(62, 1, 0.02, 10);
  let vr = null;                       // virtual reality, set up below (js/vr.js)
  const camWorld = new T.Vector3();    // the camera's world position (in VR the camera sits inside a rig)
  const vm = { root: null, arm: null, src: null, bob: 0, swayX: 0, swayY: 0, pose: { x: 0.3, y: -0.3, z: 0.1, pitch: -0.22, yaw: 0.28, roll: 0, size: 0.92 },
    fistPose: { x: 0.3, y: -0.32, z: 0.1, pitch: -0.5, yaw: 0.4, roll: 0, size: 0.8 } };
  const scene = new T.Scene();
  C.scene = scene;   // debug hooks (profiling scripts)
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
  const menuPortal = C.portalMesh(profile.look.portalColor, 1.5, profile.look.portalStyle);
  menuPortal.position.set(0, 1.3, -1.8);
  menuScene.add(menuPortal);
  const menuCam = new T.PerspectiveCamera(32, 1, 0.1, 100);
  let preview = null, previewYaw = 0.5, previewDirty = true, previewT = 0;
  function rebuildPreview() {
    if (preview) { menuScene.remove(preview.root); preview.dispose(); }
    preview = C.buildAvatar(profile.look, profile.arch, { thick: 0.025 });
    menuScene.add(preview.root);
    menuPortal.material.uniforms.col.value.set(profile.look.portalColor);
    menuPortal.material.uniforms.style.value = C.PORTAL_STYLES[profile.look.portalStyle] || 0;
  }
  // Sculpted characters (scripts/models/: Rick by scripts/sculpt.js, the rest with Mojulo through
  // scripts/mojulo-character.js) load in the background; every canon-looking character built after
  // that uses its sculpt up close.
  for (const [arch, file] of Object.entries(C.SCULPTED)) C.loadSculpt(arch, 'assets/characters/' + file + '.mms').then(() => { previewDirty = true; }).catch(e => console.warn('No sculpt for ' + arch + ':', e.message));
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

  function menuChanged() { previewDirty = true; previewT = 0.05; UI.save('profile', profile); fillStarts(); }
  // You can only start where your character lives.
  function fillStarts() {
    const sel = $('startDim'), starts = MM.startWorlds(profile.arch, profile.home);
    sel.textContent = '';
    for (const id of starts) sel.append(el('option', { value: id, text: MM.DIM_BY_ID[id].name }));
    if (!starts.includes(profile.startDim)) profile.startDim = starts[0];
    sel.value = profile.startDim;
  }

  function initMenu() {
    $('name').value = profile.name;
    $('home').value = profile.home;
    fillStarts();
    $('ifTaken').value = profile.taken === 'other' ? 'other' : 'clone';
    $('ifTaken').onchange = () => { profile.taken = $('ifTaken').value; UI.save('profile', profile); };
    // The Android app (Capacitor) serves the game from inside the app, so there is no server to prefill.
    const inApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const httpHosted = !inApp && /^https?:$/.test(location.protocol) && !/claude|artifact/.test(location.hostname);
    $('server').value = profile.server || (httpHosted ? location.host : '');
    UI.initMenu(profile, menuChanged);
    $('name').oninput = () => { profile.name = $('name').value; UI.save('profile', profile); };
    $('home').oninput = () => { profile.home = $('home').value.toUpperCase(); UI.save('profile', profile); fillStarts(); };
    $('startDim').onchange = () => { profile.startDim = $('startDim').value; UI.save('profile', profile); };
    $('server').oninput = () => { profile.server = $('server').value.trim(); UI.save('profile', profile); };
    // Pages that can't reach a game server (like a hosted preview) offer offline play only.
    if (window.MM_NO_ONLINE) {
      $('playOnline').hidden = true; $('server').closest('.grp').hidden = true;
      $('menuNote').textContent = 'Offline preview with bots. For online play with friends, run the server from the repository. Unofficial free fan game, not affiliated with Adult Swim.';
    }
    // Show which game build this is (written by scripts/build-www.js), so you can see updates arrive.
    fetch('version.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
      if (v && v.build) $('menuNote').append(el('span', { class: 'ver', text: ' · Version ' + v.build }));
    }).catch(() => {});
    $('playOffline').onclick = () => start('offline');
    $('playOnline').onclick = () => start('online');
    $('helpBtn').onclick = () => UI.help();
  }

  // ---------- Game state ----------
  const SPACE_BLACK = new T.Color('#02030a');
  const G = { baseFov: 62, pairs: new Map(),
    mode: 'menu', net: null, myId: 0, ep: 0, dimId: null, inst: 0, world: null, you: null,
    me: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true, fly: 6, kbT: 0, aimT: 0, emoteT: 0, flying: false },
    meAv: null, players: new Map(), npcs: new Map(), pickups: new Map(), portals: new Map(), turrets: new Map(), alive: [],
    vm, camYaw: 0, camPitch: 0.25, camDist: 6, shake: 0,
    offset: null, lastSnap: 0, stT: 0, fireT: 0, pingT: 0, ping: 0, pop: null, top: [],
    muted: new Set(), team: new Set(), teamNames: [], deadBy: '', modal: null, entered: false,
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
      open: () => G.net.send({ t: 'hello', v: MM.VERSION, name: profile.name, home: profile.home, look: profile.look, arch: profile.arch, dim: profile.startDim || undefined, tok: tokenFor(G.net), pvp: settings.pvp !== false, taken: profile.taken === 'other' ? 'other' : 'clone' }),
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
  function archLabel(info) { return (info.bot ? 'bot · ' : '') + (info.clone ? 'clone · ' : '') + (info.title || MM.ARCHETYPES[info.arch].name); }
  function addPlayer(info) {
    if (info.id === G.myId || G.players.has(info.id)) return;
    const av = C.buildAvatar(info.look, info.arch, { ratsuit: !!(info.gear && info.gear.ratsuit) });
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
    const [id, type, x, y, z, r, hp, seed, name, arch, origin, ship] = row;
    if (G.npcs.has(id)) return;
    let m;
    if (arch && MM.ARCHETYPES[arch]) {
      // One of the cast: their own character, in their dimension's look, and their name tag.
      const av = C.buildAvatar(MM.castLook(arch, origin), arch);
      C.setGear(av, MM.castGear(arch, origin));   // Strong-arm Morty's arm
      m = { root: av.root, av };
      if (ship) C.setShip(av, true);
      const tag = C.makeTag(name, '', MM.ARCHETYPES[arch].name, UI.ARCH_COLORS[arch] || '#d6e4ff');
      tag.draw(-1);
      tag.sprite.scale.set(2.4, 0.6, 1);
      tag.sprite.position.y = av.headY + 0.6;
      m.root.add(tag.sprite);
      m.root.position.set(x, y, z); m.root.rotation.y = r;
      scene.add(m.root);
      G.npcs.set(id, { id, type, name, cast: arch, m, tag, snaps: [{ t: -1, x, y, z, r }], x, y, z, r, hp, px: x, pz: z, speed: 0, t: Math.random() * 6, flags: 0, bubble: null });
      return;
    }
    m = C.npcModel(type, seed);
    m.root.position.set(x, y, z); m.root.rotation.y = r;
    if (C.style === 'real') m.root.traverse(o => { if (o.isMesh && o.material && o.material.side !== T.BackSide) o.castShadow = true; });
    if (type === 'hologram') m.root.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; if (o.material.color) o.material.color.lerp(new T.Color('#7ad8ff'), 0.5); o.material.depthWrite = false; } });
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
    m.userData.base = y + 0.8; m.userData.ph = Math.random() * 6; m.userData.kind = c;
    scene.add(m);
    G.pickups.set(id, m);
  }
  function removePickup(id) { const m = G.pickups.get(id); if (m) { scene.remove(m); G.pickups.delete(id); } }
  function addPortal(po) {
    if (G.portals.has(po.id)) return;
    const g = new T.Group();
    const mesh = C.portalMesh(po.col, 1.25, po.st);
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
  // ----- The portal pair: blue and orange, Valve style -----
  function addPair(e) {
    const key = e.o + ':' + e.c;
    removePair(key);
    const P = { x: e.x, y: e.y, z: e.z, nx: e.nx, ny: e.ny, nz: e.nz };
    const g = new T.Group();
    const look = lookOf(e.o), col = MM.pairColors(look)[e.c];
    // The same portal as one to another world: same size, same swirl, same colours.
    const mesh = C.portalMesh(col, MM.PAIR_SIZE, look && look.portalStyle);
    mesh.renderOrder = 3;
    g.add(mesh);
    g.position.set(P.x, P.y, P.z);
    g.lookAt(P.x + P.nx, P.y + P.ny, P.z + P.nz);
    scene.add(g);
    fx.burst(P.x, P.y, P.z, col, 26, 6, 0.6, 0.5, 2);
    sfxAt('portal', P.x, P.z, 0.7);
    G.pairs.set(key, { o: e.o, c: e.c, P, g, mesh, col, born: now() });
  }
  const lookOf = id => id === G.myId ? profile.look : G.players.get(id) && G.players.get(id).info.look;
  function removePair(key) { const q = G.pairs.get(key); if (q) { scene.remove(q.g); q.mesh.material.dispose(); G.pairs.delete(key); } }
  function removePairsOf(o) { removePair(o + ':0'); removePair(o + ':1'); }
  // Aim with the crosshair and shoot the next portal of your pair (R, right click, or the
  // touch button): the first end, then its partner, then the first again (which moves it). Both
  // ends take your portal colours: green for a Rick unless you change them.
  function shootPair() {
    if (!canAct() || pickled()) return;
    if (G.you.ship) { UI.toast('Land first (B) to shoot portals.'); return; }
    if (!(G.prog && MM.canPair(profile.arch, G.prog.up))) return;   // no gun: R does nothing
    if (now() < (G.pairCd || 0)) return;
    const ray = vr && vr.on ? vr.aimRay() : null;
    const o = ray ? ray.o : camWorld.clone(), d = ray ? ray.d : new T.Vector3();
    if (!ray) camera.getWorldDirection(d);
    // Start the ray at your gun, not behind you at the camera.
    const skip = Math.max(0, (G.me.x - o.x) * d.x + (G.me.y + 1.4 - o.y) * d.y + (G.me.z - o.z) * d.z);
    const from = { x: o.x + d.x * skip, y: o.y + d.y * skip, z: o.z + d.z * skip };
    const hit = MM.raycastWorld(G.dimId, from, { x: d.x, y: d.y, z: d.z }, MM.PAIR_RANGE, G.alive);
    const c = G.pairNext || 0, S = MM.pairSpot(G.dimId, hit);
    G.pairNext = 1 - c; G.pairCd = now() + 0.35;
    send({ t: 'pp', c, x: r2(S.x), y: r2(S.y), z: r2(S.z), nx: r2(S.nx), ny: r2(S.ny), nz: r2(S.nz) });
    // The shot: a streak of the portal's colour from the gun to the portal position.
    const pc = MM.pairColors(profile.look)[c];
    const gx = G.me.x, gy = G.me.y + 1.4, gz = G.me.z;
    // Create a more visible, longer beam effect
    const n = Math.min(60, Math.ceil(hit.t * 0.8)); // Longer beam
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      // Make the beam pulse slightly and be more visible
      const alpha = 0.5 + Math.sin(i * 0.2) * 0.2;
      fx.glow.emit(gx + (S.x - gx) * k, gy + (S.y - gy) * k, gz + (S.z - gz) * k, 0, 0, 0, pc, alpha, 0.4, 0);
    }
    // Add a burst effect at the portal placement point for better visibility
    fx.burst(S.x, S.y, S.z, pc, 20, 8, 0.8, 0.7, 2);
    G.me.aimT = 1; G.me.yaw = G.camYaw;
    if (G.meAv) G.meAv.attackT = 0.2;
    C.sfx('plasma', 0.8); // Slightly louder sound for feedback
    updateHotbar();
  }
  // Walking into a portal of any complete pair: out of the other one, at the same speed.
  function pairTransit(me) {
    if (now() < (G.transitCool || 0) || (G.you && G.you.ship)) return;
    for (const q of G.pairs.values()) {
      const other = G.pairs.get(q.o + ':' + (1 - q.c));
      if (!other || !MM.inPair(q.P, me.x, me.y, me.z)) continue;
      const A = q.P, B = other.P, speed = Math.hypot(me.vx, me.vy, me.vz), ex = MM.pairExit(B, speed);
      // Through a wall portal into a wall portal: turn the way the exit faces, like in Portal.
      if (MM.pairKind(A) === 'wall' && MM.pairKind(B) === 'wall') G.camYaw += Math.atan2(B.nx, B.nz) - Math.atan2(-A.nx, -A.nz);
      else if (MM.pairKind(B) === 'wall') G.camYaw = Math.atan2(B.nx, B.nz);
      // More impressive entry effect
      fx.burst(me.x, me.y + 1, me.z, q.col, 25, 8, 0.8, 0.7, 3);
      me.x = ex.x; me.y = ex.y; me.z = ex.z; me.vx = ex.vx; me.vy = ex.vy; me.vz = ex.vz;
      me.grounded = false; me.kbT = 1.1;
      G.transitCool = now() + 0.35;
      send({ t: 'pt', o: q.o, c: q.c });
      // More impressive exit effect
      fx.burst(ex.x, ex.y + 1, ex.z, other.col, 25, 8, 0.8, 0.7, 3);
      // Warp sound with more intensity
      C.sfx('warp', 0.8);
      return;
    }
  }
  function addTurret(row) {
    const [id, owner, x, y, z, big] = row;
    if (G.turrets.has(id)) return;
    const m = C.turretModel();
    m.position.set(x, y, z);
    if (big) m.scale.setScalar(2.4);   // the house's large energy weapon
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
    for (const k of [...G.pairs.keys()]) removePair(k);
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
      buildRaceRings(w.dim);
      if (G.life) G.life.dispose();
      G.life = C.makeLife(w.dim, scene, settings.quality);
      if (G.rides) G.rides.dispose();
      G.rides = C.makeRides(w.dim, scene);
      if (G.eggs) G.eggs.dispose();
      G.eggs = C.makeEggs(w.dim, scene);
      const dim = MM.DIM_BY_ID[w.dim];
      scene.fog = new T.Fog(dim.fog, 40, dim.fogFar);
      camera.far = dim.planets ? 3200 : 1500; camera.updateProjectionMatrix();
      const skyU = G.world.group.children[0].material.uniforms;
      G.atmo = { fog: new T.Color(dim.fog), far: dim.fogFar, top: skyU.top.value.clone(), bot: skyU.bot.value.clone(), k: -1 };
      renderer.setClearColor(dim.fog);
    }
    G.dimId = w.dim; G.inst = w.inst; G.ep = w.ep;
    noteVisit(w.dim);
    G.alive = MM.genProps(w.dim).map(() => true);
    for (const [i, hp] of w.props) { G.alive[i] = hp > 0; if (hp <= 0) G.world.setAlive(i, false); }
    if (!changed) for (let i = 0; i < G.alive.length; i++) G.world.setAlive(i, G.alive[i]);
    for (const info of w.players) addPlayer(info);
    for (const n of w.npcs) addNpc(n);
    for (const pk of w.pickups) addPickup(pk);
    for (const po of w.portals) addPortal(po);
    for (const t of w.turrets) addTurret(t);
    setHouse(w.house);
    if (G.offset === null || G.offset === undefined) G.offset = now() - w.tm;
    G.riders = new Map();
    for (const [id, r, t0, s] of w.riders || []) G.riders.set(id, { R: MM.RIDE_BY_ID[r], t0, seat: s });
    G.me.sit = null;
    galHud(null);
    for (const P of w.pairs || []) addPair(P);
    const me = G.me;
    me.x = w.x; me.y = w.y; me.z = w.z; me.vx = me.vy = me.vz = 0;
    if (!G.meAv) {
      G.meAv = C.buildAvatar(profile.look, profile.arch, { ratsuit: !!(G.prog && G.prog.up.ratsuit) });
      scene.add(G.meAv.root);
    }
    if (G.prog) C.setGear(G.meAv, myGear());
    C.setShip(G.meAv, !!w.ship, myGear());
    C.setCar(G.meAv, false);   // a car stays in its world
    if (w.event) { UI.banner(w.event.name, w.event.text); }
    else if (changed && MM.QUIRKS[MM.DIM_BY_ID[w.dim].quirk]) UI.banner(MM.DIM_BY_ID[w.dim].name, MM.QUIRKS[MM.DIM_BY_ID[w.dim].quirk]);
    G.offset = null;
    const dim = MM.DIM_BY_ID[w.dim];
    $('dimName').textContent = dim.name;
    updateDimInfo();
    // Out in space, face the nearest planet (after lightspeed it is dead ahead).
    if (changed && dim.planets) {
      let P = dim.planets[0], bd = Infinity;
      for (const q of dim.planets) { const d = Math.hypot(q.x - me.x, q.z - me.z); if (d < bd) { bd = d; P = q; } }
      if (bd > 1) { G.camYaw = Math.atan2(P.x - me.x, P.z - me.z); G.camPitch = 0.05; }
    }
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
  // What each character's ability looks like. Every one is different, and each matches
  // its lore: Rick's force field, Summer's phone flash, Beth's surgery, a bird person's dive.
  function abilityFx(a, p, id) {
    const x = p.x, y = p.y, z = p.z, yaw = p.r !== undefined ? p.r : p.yaw || 0;
    const fx2 = Math.sin(yaw), fz2 = Math.cos(yaw), mine = id === G.myId;
    const near = Math.hypot(x - G.me.x, z - G.me.z);
    switch (a) {
      case 'shield':
        fx.dome(x, y + 1, z, '#7ff6ff', 2.2, 0.45, 0.5);
        fx.burst(x, y + 1, z, '#bffcff', 30, 6, 0.5, 0.5, 0);
        break;
      case 'sprint':
        fx.puff(x - fx2, y + 0.2, z - fz2, '#e8e2d4', 12, 1.2, 1.1, 0.7);
        fx.burst(x, y + 2.1, z, '#7fc8ff', 6, 2.5, 0.35, 0.6, 14);   // sweat drops
        break;
      case 'flash':
        fx.dome(x + fx2, y + 1.5, z + fz2, '#ffffff', 8, 0.35, 0.8);
        fx.burst(x + fx2 * 0.6, y + 1.6, z + fz2 * 0.6, '#ffffff', 40, 12, 0.9, 0.3, 0);
        if (near < 8 && !mine) screenFlash('#ffffff', 0.9, 450);
        break;
      case 'patch':
        fx.shockwave(x, y, z, '#7dff9a', 8, 0.7);
        fx.pillar(x, y, z, '#7dff9a', 3, 0.8, 0.9);
        for (let i = 0; i < 6; i++) setTimeout(() => fx.burst(x + (Math.random() - 0.5) * 1.5, y + 0.6, z + (Math.random() - 0.5) * 1.5, '#b8ffcc', 4, 1.5, 0.5, 0.9, -3), i * 90);
        break;
      case 'sob':
        fx.puff(x, y + 3.0, z, '#6a7a8a', 8, 1.2, 1.4, 2.4);    // a little rain cloud
        for (let i = 0; i < 10; i++) setTimeout(() => fx.burst(x + (Math.random() - 0.5) * 1.2, y + 2.8, z + (Math.random() - 0.5) * 1.2, '#7fc8ff', 3, 0.5, 0.3, 0.8, 14), i * 220);
        break;
      case 'dive':
        fx.shockwave(x, y, z, '#ffd84d', 5.5, 0.45, 0.3);
        fx.burst(x, y + 0.5, z, '#f0d0a0', 30, 8, 0.5, 0.8, 10);     // feathers
        fx.puff(x, y + 0.2, z, '#c8b898', 14, 3, 1.4, 0.9);
        if (near < 12) G.shake = Math.max(G.shake || 0, 0.35 * (1 - near / 12));
        break;
      case 'slam':
        fx.shockwave(x, y, z, '#ff9b4d', 6.5, 0.5, 0.35);
        fx.shockwave(x, y, z, '#ffffff', 4, 0.3, 0.15);
        fx.puff(x, y + 0.2, z, '#9a8a72', 20, 4, 1.6, 1.1);
        fx.burst(x, y + 0.3, z, '#6a5a44', 20, 9, 0.4, 0.9, 22);
        if (near < 14) G.shake = Math.max(G.shake || 0, 0.5 * (1 - near / 14));
        break;
      case 'cheer':
        fx.shockwave(x, y, z, '#ffe066', 10, 0.8);
        fx.burst(x, y + 1.5, z, '#7dff9a', 40, 7, 0.7, 0.9, -2);
        fx.burst(x, y + 1.8, z, '#ffd84d', 20, 5, 0.5, 1.0, -1);
        sfxAt('cheer', x, z);
        break;
      case 'cuff':
        fx.cone(x + fx2 * 0.8, y + 1.2, z + fz2 * 0.8, fx2, fz2, '#5fb4ff', 40, 3, 1.2);
        fx.burst(x + fx2 * 3, y + 1.2, z + fz2 * 3, '#bfe0ff', 12, 3, 0.5, 0.4, 0);
        break;
      case 'summon':
        for (const s of [-1, 1]) { const ax = x + Math.cos(yaw) * 1.2 * s + fx2 * 0.9, az = z - Math.sin(yaw) * 1.2 * s + fz2 * 0.9; fx.puff(ax, y + 0.6, az, '#bfe8ff', 10, 1, 1.2, 0.8); fx.burst(ax, y + 1.2, az, '#7ec8f0', 20, 5, 0.5, 0.5, 4); }
        break;
      case 'rage':
        fx.dome(x, y + 1, z, '#ff4d4d', 3, 0.5, 0.45);
        fx.burst(x, y + 1.2, z, '#ff6a3a', 50, 9, 0.7, 0.7, 2);
        fx.puff(x, y + 0.5, z, '#5a2a2a', 10, 1.5, 1.2, 0.8);
        break;
      case 'scheme':
        fx.puff(x, y + 0.8, z, '#1a1a22', 24, 1.6, 1.6, 1.0);
        fx.burst(x, y + 1, z, '#ff5a3a', 10, 3, 0.35, 0.5, 0);
        break;
      case 'assimilate':
        fx.shockwave(x, y, z, '#5fd6b0', 10, 0.9, 0.12);
        fx.pillar(x, y, z, '#5fd6b0', 4, 1.0, 1.0);
        break;
      case 'roll':
        fx.burst(x, y + 0.5, z, '#7cbf3a', 30, 6, 0.5, 0.6, 8);
        fx.puff(x, y + 0.2, z, '#c8d8a0', 10, 1.2, 1.0, 0.6);
        break;
    }
  }
  // Effects that last while an ability does: dust behind a panicking Morty, smoke around a
  // vanished Evil Morty, sparks off a raging Squanchy, frost on the cuffed.
  function ongoingFx(p, b, speed, dt) {
    if (!b) return;
    const r = Math.random(), y = p.y;
    if ((b & 2) && speed > 2 && r < dt * 25) fx.puff(p.x, y + 0.15, p.z, '#e8e2d4', 1, 0.5, 0.7, 0.5);
    if ((b & 2048) && r < dt * 12) fx.puff(p.x, y + 1, p.z, '#22222a', 1, 1, 0.8, 0.6);
    if ((b & 1024) && r < dt * 10) fx.burst(p.x, y + 1.2, p.z, '#bfe0ff', 2, 1.5, 0.3, 0.5, 0);
    if ((b & 256) && r < dt * 8) fx.burst(p.x, y + 2.1, p.z, '#ffe066', 2, 1.2, 0.3, 0.6, -1);   // seeing stars
  }
  // ---------- Rick's scanner ----------
  // Point at something and press X: a readout of what it is, how dangerous it is and what it
  // is made of, with a line of Rick's commentary. Pure information; nothing is sent.
  const SNARK = ['Ugh. Boring.', 'Fascinating. No, it is not.', 'I have seen this in a thousand dimensions. It is always disappointing.',
    'Do not lick it.', 'Huh. Okay, that one is actually kind of neat.', 'Classic. Real classic.', 'This is Morty-level tech.', 'Wubba lubba dub dub.'];
  function scan() {
    if (!canAct()) return;
    if (!(G.st && G.st.scanner)) { UI.toast(MM.ARCHETYPES[profile.arch].name === 'Rick' ? 'Build the Scanner Implant at the garage first (C).' : 'Only a Rick has a scanner built in.', 3000); return; }
    const fwd = new T.Vector3(); camera.getWorldDirection(fwd);
    const from = camWorld, best = { s: Infinity, it: null };
    const look = (x, y, z, it, r) => {
      const dx = x - from.x, dy = y - from.y, dz = z - from.z, d = Math.hypot(dx, dy, dz);
      if (d > 45 || d < 0.3) return;
      const cos = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d, ang = Math.acos(Math.min(1, cos)) - Math.atan((r || 0.6) / d);
      if (ang > 0.28) return;
      const sc = ang * 40 + d * 0.15;
      if (sc < best.s) { best.s = sc; best.it = it; }
    };
    for (const [id, p] of G.players) look(p.x, p.y + 1, p.z, { k: 'p', id, p }, 0.7);
    for (const [id, n] of G.npcs) look(n.x, n.y + 1, n.z, { k: 'n', id, n }, MM.NPCS[n.type].r);
    for (const [id, m] of G.pickups) look(m.position.x, m.position.y, m.position.z, { k: 'pk', id, m }, 0.5);
    for (const l of MM.LANDMARKS) if (l.dim === G.dimId) look(l.x, MM.heightAt(G.dimId, l.x, l.z) + l.h / 2, l.z, { k: 'l', l }, l.r);
    const props = MM.genProps(G.dimId);
    for (const p of props) if (G.alive[p.id] && !p.type.startsWith('lm_')) look(p.x, p.y + p.h / 2, p.z, { k: 'prop', p }, p.r);
    const it = best.it;
    C.sfx('ability', 0.5);
    if (!it) { showScan('Nothing', [['Signal', 'none']], 'Point me at something, genius.'); return; }
    const pos = it.k === 'p' ? it.p : it.k === 'n' ? it.n : it.k === 'pk' ? it.m.position : it.k === 'l' ? { x: it.l.x, y: MM.heightAt(G.dimId, it.l.x, it.l.z), z: it.l.z } : it.p;
    const dx = pos.x - G.me.x, dz = pos.z - G.me.z, dl = Math.hypot(dx, dz) || 1;
    fx.cone(G.me.x, G.me.y + 1.5, G.me.z, dx / dl, dz / dl, '#39ff6a', 30, Math.min(dl, 20) / 4, 0.25);
    fx.shockwave(pos.x, pos.y || 0, pos.z, '#39ff6a', 2.2, 0.6, 0.12);
    const mat = d => Object.keys(d || {}).map(k => d[k] + ' ' + MM.MATERIALS[k].name).join(', ') || 'nothing useful';
    const pretty = t => t.replace(/^lm_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
    if (it.k === 'p') {
      const A = MM.ARCHETYPES[it.p.info.arch], tm = A.temper || {};
      showScan(it.p.info.name + ' ' + it.p.info.home, [['Variant', A.name + (it.p.info.title ? ' · ' + it.p.info.title : '')], ['Health', it.p.hp + '%'],
        ['Threat', tm.fights === 'often' ? 'picks fights' : tm.fights === 'never' ? 'harmless' : 'hits back'], ['Origin', 'Dimension ' + it.p.info.home]], it.p.info.arch === 'genius' ? 'Another me. Ugh. Probably a Doofus.' : pick(SNARK));
    } else if (it.k === 'n') {
      const T = MM.NPCS[it.n.type];
      showScan(it.n.name || T.name, [['Species', T.name], ['Health', (it.n.hp !== undefined ? it.n.hp : 100) + '%'], ['Threat', T.hostile ? 'HOSTILE' : T.guard ? 'guard: will defend others' : 'peaceful'],
        ['Drops', mat(T.drop)]], T.talk ? '"' + pick(T.talk) + '"' : pick(SNARK));
    } else if (it.k === 'pk' && MM.isCurio(it.m.userData.kind)) {
      const Q = MM.CURIOS[it.m.userData.kind.slice(2)];
      showScan(Q.name, [['Type', 'curio'], ['Use', Q.use ? (Q.eat ? 'one use' : 'reusable') : 'keepsake'], ['Seen in', Q.dims.map(d => MM.DIM_BY_ID[d].name).slice(0, 2).join(', ')]], Q.desc);
    } else if (it.k === 'pk') showScan('Loose matter', [['Composition', 'collectable material'], ['Value', 'worth picking up']], 'Grab it before a Jerry does.');
    else if (it.k === 'l') {
      const tasks = tasksAt(it.l).map(t => MM.TASKS[t].name);
      const builds = MM.RECIPE_IDS.filter(r => MM.RECIPES[r].at && MM.LANDMARKS.some(x => MM.isAt(x, MM.RECIPES[r].at) && x === it.l)).map(r => MM.RECIPES[r].name);
      showScan(it.l.name, [['Type', 'landmark'], ['Things to do', tasks.join(', ') || 'nothing for you'], ['Can build', builds.slice(0, 3).join(', ') || '—'], ['Door', it.l.door ? MM.DIM_BY_ID[it.l.door.dim].name : 'no']], pick(SNARK));
    } else {
      const P = MM.PROPS[it.p.type];
      showScan(pretty(it.p.type), [['Integrity', P.hp + ' hp'], ['Salvage', mat(P.drop)], ['Size', it.p.r.toFixed(1) + ' m']], pick(SNARK));
    }
  }
  function showScan(title, rows, quote) {
    const box = $('scan');
    box.textContent = '';
    box.append(el('b', { text: '▸ ' + title }));
    for (const [k, v] of rows) box.append(el('div', { class: 'r' }, el('span', { text: k }), el('span', { text: String(v) })));
    if (quote) box.append(el('div', { class: 'q', text: quote }));
    box.hidden = false; box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    clearTimeout(G.scanT); G.scanT = setTimeout(() => { box.hidden = true; }, 7000);
  }
  function screenFlash(color, op, ms) {
    const f = $('whiteflash');
    if (!f) return;
    f.style.transition = 'none'; f.style.background = color; f.style.opacity = String(op);
    requestAnimationFrame(() => { f.style.transition = 'opacity ' + ms + 'ms ease-out'; f.style.opacity = '0'; });
  }
  function sfxAt(name, x, z, base) {
    const d = Math.hypot(x - G.me.x, z - G.me.z);
    C.sfx(name, (base || 1) * Math.max(0, 1 - d / 70));
  }

  function onMessage(m) {
    switch (m.t) {
      case 'hi': G.myId = m.id; profile.name = m.you.name; profile.home = m.you.home; $('home').value = profile.home; UI.save('profile', profile); keepToken(m.tok); break;
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

  const SHOT_COLORS = { plasma: '#5dff8a', blaster: '#ffd84d', toy: '#ff8fd0', turret: '#ff4d4d', shrink: '#b48aff', freeze: '#bfeaff', gren: '#ffd84d', carguns: '#ffb03a', stalkergun: '#ff7a3a' };
  const NPC_NAMES = {};
  for (const k in MM.NPCS) NPC_NAMES[k] = MM.NPCS[k].name;

  function onEvent(e) {
    const me = G.me;
    switch (e.k) {
      case 'join': if (e.p.id !== G.myId) addPlayer(e.p); updateDimInfo(); break;
      case 'pp': {
        addPair(e);
        if (e.o !== G.myId) sfxAt('plasma', e.x, e.z, 0.5);
        fx.burst(e.x, e.y, e.z, MM.pairColors(lookOf(e.o))[e.c], 16, 4, 0.5, 0.5, 0);
        break;
      }
      case 'pt': {
        if (e.id === G.myId) break;
        const p = G.players.get(e.id);
        if (p) sfxAt('warp', p.x, p.z, 0.5);
        break;
      }
      case 'leave': {
        removePairsOf(e.id);
        const p = G.players.get(e.id);
        if (p && e.via) { fx.burst(p.x, p.y + 1, p.z, '#39ff6a', 20, 6, 0.7, 0.5, 2); sfxAt('warp', p.x, p.z, 0.6); }
        removePlayer(e.id); updateDimInfo();
        break;
      }
      case 'shot': {
        if (e.o === G.myId && e.w !== 'turret') {
          if (e.w === 'gren' || e.w === 'shrink' || e.w === 'freeze') C.sfx(e.w === 'gren' ? 'jump' : 'shrink');
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
        { const dd = Math.hypot(e.x - G.me.x, e.z - G.me.z); if (dd < e.r * 4) G.shake = Math.max(G.shake || 0, 0.45 * (1 - dd / (e.r * 4))); }
        sfxAt('boom', e.x, e.z, Math.min(1, e.r / 6));
        const d = Math.hypot(e.x - me.x, e.z - me.z);
        if (d < 25) G.shake = Math.max(G.shake, (1 - d / 25) * 0.6 * Math.min(1, e.r / 5));
        // Everyone caught in the blast goes flying, limbs and all.
        const blast = (av, x, z) => { const dd = Math.hypot(x - e.x, z - e.z), R = e.r * 1.6; if (av && dd < R) C.ragdoll(av, x - e.x, z - e.z, (1 - dd / R) * Math.min(1, e.r / 5) + 0.3); };
        blast(G.meAv, me.x, me.z);
        for (const p of G.players.values()) blast(p.av, p.x, p.z);
        for (const n of G.npcs.values()) if (n.m.av) blast(n.m.av, n.x, n.z);
        break;
      }
      case 'mel': { const p = G.players.get(e.id); if (p) { p.av.attackT = 0.3; sfxAt('melee', p.x, p.z); } break; }
      case 'dmg': {
        { const tav = e.p === G.myId ? G.meAv : e.p ? (G.players.get(e.p) || {}).av : (G.npcs.get(e.n) || { m: {} }).m.av; C.hitReact(tav); }
        if (e.p === G.myId) {
          $('flash').style.opacity = '1'; setTimeout(() => { $('flash').style.opacity = '0'; }, 120);
          C.sfx('hurt', 0.8);
          if (e.d >= 15) G.shake = Math.max(G.shake || 0, Math.min(0.4, e.d / 60));
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
      case 'rd': {
        if (e.r) G.riders.set(e.id, { R: MM.RIDE_BY_ID[e.r], t0: e.t0, seat: e.s });
        else { G.riders.delete(e.id); const q = G.players.get(e.id); if (q) q.av.root.rotation.x = 0; else if (e.id === G.myId && G.meAv) G.meAv.root.rotation.x = 0; }
        break;
      }
      case 'gal': galHud(e); break;
      case 'pop': fx.burst(e.x, e.y, e.z, '#ffd84d', 18, 6, 0.5, 0.5, 2); numAt(e.x, e.y + 0.6, e.z, '+1', '#ffd84d', false); if (e.by === G.myId) C.sfx('pickup', 0.6); break;
      case 'judge': {
        const p = posOf(e.id);
        if (p) fx.burst(p.x, p.y + 2, p.z, e.s >= 80 ? '#ffd84d' : '#5ff8ff', 30, 6, 0.8, 0.8, 2);
        if (e.id === G.myId) UI.banner(e.s + (e.s <= 100 && !/years/.test(e.line) ? '%' : ''), e.line); else UI.toast(e.name + ': ' + e.s + (/years/.test(e.line) ? ' years' : '%') + ' · ' + e.line, 3500);
        break;
      }
      case 'house': {
        if (e.h) setHouse(e.h);
        if (e.by === G.myId) UI.toast('House: ' + e.say, 3000);
        else if (e.h) UI.toast('The Smith house: ' + MM.DEFENSES[e.id].name.toLowerCase() + '!', 2500);
        break;
      }
      case 'look': {
        const q = G.players.get(e.id);
        if (q) { const info = Object.assign({}, q.info, { look: e.look }); removePlayer(e.id); addPlayer(info); }
        break;
      }
      case 'nship': { const n = G.npcs.get(e.n); if (n && n.m.av) C.setShip(n.m.av, !!e.on); break; }
      case 'npc-': removeNpc(e.id, e.die); break;
      case 'po+': addPortal(e.po); break;
      case 'po-': removePortal(e.id); break;
      case 'tu+': addTurret(e.t); sfxAt('craft', e.t[2], e.t[4], 0.5); break;
      case 'tu-': removeTurret(e.id); break;
      case 'ab': {
        const p = posOf(e.id);
        if (!p) break;
        if (e.id !== G.myId) sfxAt('ability', p.x, p.z, 0.7);
        abilityFx(e.a, p, e.id);
        break;
      }
      case 'em': {
        if (e.id === G.myId) { G.me.emoteT = e.e === 1 ? 6 : 2.5; G.me.emoteKind = e.e; break; }
        const p = G.players.get(e.id); if (p) { p.emoteT = e.e === 1 ? 6 : 2.5; p.emoteKind = e.e; }
        break;
      }
      // The chat's easter eggs.
      case 'burp': { const p = posOf(e.id); if (p) { fx.puff(p.x, p.y + 1.7, p.z, '#9aff6a', 14, 2, 1.2, 0.8); numAt(p.x, p.y + 2.6, p.z, '*BUUURP*', '#9aff6a', true); sfxAt('bite', p.x, p.z); } break; }
      case 'cromulon': cromulon(e.x, e.z); break;
      case 'pickle': pickleFor(e.id, e.t); break;
      case 'dodge': { const p = posOf(e.id); if (p) { numAt(p.x, p.y + 2.4, p.z, 'DODGE!', '#5ff8ff', false); sfxAt('dodge', p.x, p.z); } break; }
      case 'kiosk': { const p = posOf(e.id); if (p) fx.burst(p.x, p.y + 1, p.z, '#ffd84d', 25, 6, 0.6, 0.5, 2); break; }
      case 'timestop': { const p = posOf(e.id); if (p) { fx.burst(p.x, p.y + 1.2, p.z, '#8fd8ff', 90, 14, 1.2, 1.4, 0); fx.burst(p.x, p.y + 1.2, p.z, '#ffffff', 30, 8, 0.8, 1.0, 0); } C.sfx('ability'); if (e.id === G.myId) UI.toast('Time stopped. Someone will have noticed.', 3000); break; }
      case 'bite': { const n = G.npcs.get(e.n); if (n) sfxAt('bite', n.x, n.z); break; }
      case 'frozen': {
        const p = e.n ? G.npcs.get(e.n) : posOf(e.id);
        if (p) { fx.burst(p.x, p.y + 1, p.z, '#bfeaff', 34, 5, 0.6, 0.9, 0); fx.shockwave(p.x, p.y + 0.1, p.z, '#bfeaff', 1.6, 0.5, 0.1); numAt(p.x, p.y + 2.4, p.z, 'FROZEN', '#bfeaff', false); sfxAt('shrink', p.x, p.z); }
        break;
      }
      case 'curio': { const p = posOf(e.id); const Q = MM.CURIOS[e.q]; if (p && Q) fx.burst(p.x, p.y + 1.4, p.z, Q.color, 24, 4, 0.5, 0.8, 1); break; }
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
        if (p) {
          const rebuild = p.info.arch === 'picklerick' && !!e.gear.ratsuit !== !!(p.info.gear && p.info.gear.ratsuit);
          p.info.gear = e.gear;
          if (rebuild) { const info = p.info; removePlayer(e.id); addPlayer(info); }
          else { C.setGear(p.av, e.gear); collectOutlines(p.av); }
        }
        break;
      }
      case 'ship': {
        const p = G.players.get(e.id);
        if (p) { C.setShip(p.av, e.on, p.info.gear); collectOutlines(p.av); sfxAt('jump', p.x, p.z); }
        break;
      }
      case 'car': { const p = posOf(e.id); if (p) sfxAt(e.on ? 'craft' : 'jump', p.x, p.z); break; }
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

  // ----- Ring races (shared/races.js) -----
  // Every race in this world has a start pad with a sign: two or more players standing on it
  // start a race. Its rings only show while you race it: the next one bright, the rest faint;
  // the clock runs at the top. Playing alone with bots, there are no races at all.
  function buildRaceRings(dimId) {
    G.raceRings = [];
    if (G.net && G.net.host) return;   // offline, with bots: no races
    for (const R of MM.racesIn(dimId)) {
      const q0 = MM.ringAt(R, 0, dimId), pad = new T.Mesh(new T.RingGeometry(R.r + 1.6, R.r + 2.4, 48), new T.MeshBasicMaterial({ color: R.color, transparent: true, opacity: 0.55, side: T.DoubleSide, fog: false }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(q0.x, R.abs ? q0.y - R.r : MM.heightAt(dimId, q0.x, q0.z) + 0.06, q0.z);
      G.world.group.add(pad);
      const geo = new T.TorusGeometry(R.r, Math.max(0.18, R.r * 0.07), 8, 32);
      R.rings.forEach((_, i) => {
        const q = MM.ringAt(R, i, dimId), n = MM.ringAt(R, (i + 1) % R.rings.length, dimId);
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: R.color, transparent: true, opacity: i ? 0.35 : 0.9, fog: false }));
        m.position.set(q.x, q.y, q.z);
        m.lookAt(n.x, n.y, n.z);
        if (!i) {
          const tag = C.makeTag(R.name, '', (R.ship ? 'By ship' : 'On foot') + ' · 2+ players here to start', R.color);
          tag.draw(-1);
          tag.sprite.position.set(q.x, q.y + R.r + 1.2, q.z); tag.sprite.scale.multiplyScalar(R.ship ? 4 : 1.6);
          G.world.group.add(tag.sprite);
        }
        G.world.group.add(m);
        G.raceRings.push({ R, i, m });
      });
    }
  }
  function updateRace() {
    const r = G.race, hud = $('raceHud');
    for (const g of G.raceRings || []) {
      const on = r && r.id === g.R.id, next = on && g.i === r.next;
      g.m.visible = !!on && g.i >= r.next;
      g.m.material.opacity = next ? 1 : 0.3;
      const s = next ? 1 + Math.sin(now() * 5) * 0.06 : 1;
      g.m.scale.set(s, s, s);
    }
    if (!r) { hud.hidden = true; return; }
    const R = MM.RACE_BY_ID[r.id], left = Math.max(0, r.end - now());
    hud.hidden = false;
    hud.textContent = R.name + ' · ring ' + (r.next + 1) + '/' + R.rings.length + ' · ' + left.toFixed(1) + ' s';
    hud.classList.toggle('hurry', left < 10);
  }
  function onRace(e) {
    if (e.id) {
      const first = !G.race || G.race.id !== e.id;
      G.race = { id: e.id, next: e.next, end: now() + e.left };
      C.sfx(first ? 'warp' : 'pickup', 0.6);
      if (first) UI.toast(MM.RACE_BY_ID[e.id].name + ': go! ' + MM.RACE_BY_ID[e.id].blurb, 2500);
      return;
    }
    G.race = null;
    if (e.done) {
      const R = MM.RACE_BY_ID[e.done], got = e.give ? Object.keys(e.give).map(k => '+' + e.give[k] + ' ' + MM.MATERIALS[k].icon).join(' ') : '';
      const place = e.of > 1 ? ['1st', '2nd', '3rd'][e.place - 1] || e.place + 'th' : '';
      UI.banner(R.name + (place ? ': ' + place + ' of ' + e.of : '') + (e.record ? ' · new record!' : ''), e.t + ' s (best ' + e.best + ' s). ' + (got || 'No prize again so soon, but the time counts.'));
      C.sfx('craft');
    }
  }

  function onPrivate(e) {
    const me = G.me;
    if (e.k === 'race') { onRace(e); return; }
    if (e.k === 'hmenu') { openDefenses(e.own); return; }
    if (e.k === 'bout') {
      if (e.won) { UI.banner('You won in the Ring of Death!', 'The crowd chants your name. ' + Object.keys(e.give).map(k => e.give[k] + ' ' + MM.MATERIALS[k].icon).join(' ') + (e.won > 1 ? ' · ' + e.won + ' wins' : '')); C.sfx('cheer'); }
      else if (e.lost) { UI.banner('Out of the Ring', e.why || 'You lost.'); }
      else { UI.banner('Ring of Death: round ' + e.round + ' of ' + e.of, e.champ ? 'The champion, ' + e.champ + '!' : e.n + ' fighters. BLOOD! BLOOD! BLOOD!'); C.sfx('cheer', 0.6); }
      return;
    }
    if (e.k === 'egg') {
      const E = MM.EGG_BY_ID[e.id];
      if (G.prog) (G.prog.eggs || (G.prog.eggs = [])).push(e.id);
      UI.banner('🥚 Easter egg: ' + E.name + ' (' + e.n + '/' + e.total + ')', E.text + ' +3 Schmeckles');
      C.sfx('cheer');
      return;
    }
    if (e.k === 'catch') { UI.banner('You caught ' + e.name + '!', ['A tiddler.', 'A decent one.', 'A big one!', 'A MONSTER!'][e.size] + (e.n > 1 ? ' (' + e.n + ' caught so far)' : ' First one!')); C.sfx('cheer'); return; }
    if (e.k === 'stamp') {
      const D = MM.DIM_BY_ID[e.d];
      if (e.title) UI.banner('Passport: ' + e.title + '!', e.n + ' dimensions stamped. Reward: ' + Object.keys(e.give).map(k => e.give[k] + ' ' + MM.MATERIALS[k].icon).join(' '));
      else UI.toast('🛂 Passport stamped: ' + (D ? D.name : e.d) + ' (' + e.n + ')', 2600);
      if (G.prog) (G.prog.stamps || (G.prog.stamps = [])).push(e.d);
      return;
    }
    if (e.k === 'hack') { UI.banner('Hacking another Rick\'s house', 'Stay close for ' + e.t + ' seconds...'); C.sfx('craft', 0.6); return; }
    if (e.k === 'hacked') { UI.banner('Hacked', 'You can use this Rick\'s house for ten minutes. Press H or use the console.'); C.sfx('cheer'); return; }
    if (e.k === 'wardrobe') { openWardrobe(); return; }
    if (e.k === 'tp') { me.x = e.x; me.y = e.y; me.z = e.z; me.vx = me.vy = me.vz = 0; G.ep = e.ep; }
    else if (e.k === 'kb') { me.vx += e.vx; me.vz += e.vz; me.vy = Math.max(me.vy, e.vy); me.grounded = false; me.kbT = 0.7; C.ragdoll(G.meAv, e.vx, e.vz, Math.min(1, Math.hypot(e.vx, e.vz) / 14 + 0.2)); }
    else if (e.k === 'toast') UI.toast(e.text, 3500);
    else if (e.k === 'found') {
      const Q = MM.CURIOS[e.id];
      C.sfx('pickup');
      if (e.first) UI.banner(Q.icon + ' ' + Q.name, Q.desc + '  (' + e.n + '/' + MM.CURIO_IDS.length + ' found · I to open your inventory)');
      else UI.toast('Found: ' + Q.icon + ' ' + Q.name, 2500);
      if (G.prog && !(G.prog.found || (G.prog.found = [])).includes(e.id)) G.prog.found.push(e.id);
    }
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
    else if (e.k === 'team') {
      const was = G.team.size;
      G.team = new Set(e.ids); G.teamNames = e.names || [];
      UI.toast(e.ids.length ? 'Team: ' + G.teamNames.join(', ') : was ? 'You left the team.' : '', 3500);
      if (G.modal === 'board') openBoard();
    }
    else if (e.k === 'tminv') {
      C.sfx('chat', 0.6);
      openModal('offer', e.name + ' invites you to their team', box => {
        box.append(el('p', { text: 'Teammates can\'t hurt each other, and when one of you takes a door, a portal station or a ship, the others standing nearby come along. Anyone can follow through an open portal.' }),
          el('div', { class: 'chips' },
            el('button', { class: 'btn go', onclick: () => { send({ t: 'tm', op: 'join', id: e.id }); UI.closeModal(); } }, 'Join'),
            el('button', { class: 'btn', onclick: () => UI.closeModal() }, 'No thanks')));
      });
    }
  }

  function onYou(y) {
    const prev = G.you;
    G.you = y;
    const A = MM.ARCHETYPES[profile.arch];
    $('hpFill').style.transform = 'scaleX(' + Math.max(0, y.hp / y.max) + ')';
    $('hpFill').dataset.lvl = y.hp / y.max > 0.5 ? 'ok' : y.hp / y.max > 0.25 ? 'mid' : 'low';
    $('hpText').textContent = Math.max(0, y.hp) + ' / ' + y.max;
    for (const k of MM.MAT_IDS) $('mat-' + k).textContent = y.inv[k] || 0;
    // Portal charges only for someone with a gun (their own or Rick's, borrowed).
    $('charges').hidden = !y.chMax && !y.bor;
    $('charges').textContent = y.chMax ? 'Portal ' + '●'.repeat(y.ch) + '○'.repeat(Math.max(0, y.chMax - y.ch)) : y.bor ? 'Borrowed gun ' + '●'.repeat(y.bor) : '';
    if (G.meAv && !!y.ship !== !!G.meAv.inShip) { C.setShip(G.meAv, y.ship, myGear()); if (y.ship) { G.me.vy = 0; G.me.grounded = false; } }
    if (G.meAv && !!y.car !== !!G.meAv.inCar) { C.setCar(G.meAv, y.car); collectOutlines(G.meAv); G.me.carYaw = G.me.yaw; G.me.carSpeed = 0; C.sfx(y.car ? 'craft' : 'jump', 0.6); }
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
    if (G.modal === 'items' && invKey !== G.invKey) openInventory();
    G.invKey = invKey;
  }

  // ---------- Life progress ----------
  function onProgress(m) {
    const first = !G.prog;
    G.prog = m; G.st = m.st;
    // Pickle Rick just built his rat suit: a new body.
    if (G.meAv && profile.arch === 'picklerick' && !!m.up.ratsuit !== !!G.meRat) {
      scene.remove(G.meAv.root); G.meAv.dispose();
      G.meAv = C.buildAvatar(profile.look, profile.arch, { ratsuit: !!m.up.ratsuit });
      scene.add(G.meAv.root);
      if (m.up.ratsuit) { UI.banner('Pickle Riiiick!', 'Rat legs, rat arms, and a lot of spite. Now you can fight.'); fx.puff(G.me.x, G.me.y + 0.5, G.me.z, '#8a7a6a', 14, 1.2, 1.2, 0.8); }
    }
    G.meRat = !!m.up.ratsuit;
    if (G.meAv) C.setGear(G.meAv, myGear());
    $('flyBar').hidden = !G.st.fly;
    updateTracker();
    updateHotbar();
    if (G.modal === 'journal') openJournal();
    if (first && G.entered) buildHotbar();
  }
  function myGear() { const up = G.prog ? G.prog.up : {}; return { wings: !!up.wings, jet: !!up.jetpack && !up.wings, engine: !!up.engine, lasers: !!up.lasers, cyberarm: !!up.cyberarm, cyberlegs: !!up.cyberlegs, ratsuit: !!up.ratsuit }; }
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
      const s = el('button', { class: 'slot pe s-' + id, onclick, title: label + (isTouch ? '' : ' (' + key + ')'), 'aria-label': label },
        el('i', { class: 'cd' }), UI.icon(id), el('span', { class: 'l', text: label }), el('span', { class: 'k', text: isTouch ? '' : key }), el('span', { class: 'n' }));
      bar.append(s); slots[id] = s;
    };
    mk('grenade', '1', 'Grenade', () => useGadget('grenade'));
    mk('turret', '2', 'Turret', () => useGadget('turret'));
    mk('shrink', '3', 'Shrink', () => useGadget('shrink'));
    mk('meeseeks', '4', 'Meeseeks', () => useGadget('meeseeks'));
    mk('timecrystal', '5', 'Time', () => useGadget('timecrystal'));
    mk('freeze', '6', 'Freeze', () => useGadget('freeze'));
    mk('chalk', '7', 'Chalk', () => useGadget('chalk'));
    mk('items', 'I', 'Items', () => openInventory());
    mk('pair', 'R', 'Portals', () => shootPair());
    mk('scan', 'X', 'Scan', () => scan());
    mk('craft', 'C', 'Build', () => openCraft());
    mk('journal', 'J', 'Journal', () => openJournal());
    mk('portal', 'E', 'Portal', () => portalAction());
    mk('ship', 'B', 'Ship', () => toggleShip());
    mk('ab', 'Q', A.ability.name, () => ability());
    $('flyBar').hidden = !(G.st && G.st.fly);
    updateHotbar();
  }
  // Touch buttons: an icon, a short label and (for some) a count or a cooldown sweep.
  function tLabel(id, text) { const b = $(id), l = b && b.querySelector('.l'); if (l) l.textContent = text; }
  function updateHotbar() {
    const y = G.you;
    if (!y || !slots.grenade) return;
    for (const g of MM.GADGET_IDS) {
      slots[g].querySelector('.n').textContent = y.inv[g] || '';
      slots[g].classList.toggle('off', !(y.inv[g] > 0));
      slots[g].classList.toggle('empty', !(y.inv[g] > 0));
    }
    slots.scan.hidden = !(G.st && G.st.scanner);
    const canPair = !!(G.prog && MM.canPair(profile.arch, G.prog.up));
    slots.pair.hidden = !canPair; $('tPair').hidden = !canPair;
    const pcs = MM.pairColors(profile.look);
    slots.pair.style.setProperty('--pc', pcs[G.pairNext || 0]);
    $('tPair').style.setProperty('--pc', pcs[G.pairNext || 0]);
    // Only Ricks and Evil Morty know how to make a Time Crystal: no slot for everyone else.
    slots.timecrystal.hidden = !(y.inv.timecrystal > 0) && !!(G.prog && MM.canKnow(profile.arch, G.prog, 'timecrystal'));
    slots.chalk.hidden = !(y.inv.chalk > 0) && !!(G.prog && MM.canKnow(profile.arch, G.prog, 'chalk'));
    const st = G.st;
    slots.portal.querySelector('.n').textContent = y.chMax ? String(y.ch) : y.bor ? String(y.bor) : '';
    $('tPortal').querySelector('.n').textContent = slots.portal.querySelector('.n').textContent;
    slots.portal.classList.toggle('off', !(y.chMax && y.ch > 0) && !(y.bor > 0) && !nearKiosk() && !y.ship);
    // No gun, no ship, no station: no travel button at all. Otherwise say what it does.
    const gun = !!(y.chMax || y.bor), travel = gun || nearKiosk() || (y.ship && st && st.ship);
    slots.portal.hidden = !travel; $('tPortal').hidden = !travel;
    slots.portal.querySelector('.l').textContent = gun ? 'Portal' : nearKiosk() ? 'Station' : 'Travel';
    tLabel('tPortal', gun ? 'PORTAL' : nearKiosk() ? 'STATION' : 'TRAVEL');
    slots.ship.hidden = !(st && st.ship) && !y.car;
    slots.ship.querySelector('.l').textContent = y.car ? 'Get out' : y.ship ? 'Land' : 'Ship';
    $('tShip').hidden = !(st && st.ship) && !y.car;
    $('tDown').hidden = !y.ship;
    $('tLight').hidden = !(y.ship && MM.DIM_BY_ID[G.dimId].planets);   // out in space: lightspeed
    tLabel('tShip', y.car ? 'GET OUT' : y.ship ? 'LAND' : 'SHIP');
  }

  // ---------- Actions ----------
  const send = o => { if (G.net) G.net.send(o); };
  function canAct() { return G.mode === 'play' && G.you && !G.you.dead; }

  // The weapon in use (mirrors Host.weaponOf): ship guns while flying.
  function weaponId() {
    if (G.you && G.you.ship) return G.st && G.st.ship && G.st.ship.lasers ? 'lasers' : 'blaster';
    if (G.you && G.you.car) return 'carguns';
    return MM.ARCHETYPES[profile.arch].weapon;
  }
  function aimDir() {
    if (MM.WEAPONS[weaponId()].melee) return { dx: Math.sin(G.camYaw), dy: 0, dz: Math.cos(G.camYaw) };
    const ray = vr && vr.on ? vr.aimRay() : null;
    const o = ray ? ray.o : camWorld, d = ray ? ray.d : new T.Vector3();
    if (!ray) camera.getWorldDirection(d);
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

  const pickled = () => { if (MM.helpless(profile.arch, G.prog && G.prog.up)) { if (now() > (G.pickleT || 0)) { UI.toast(MM.HELPLESS_TEXT, 3500); G.pickleT = now() + 4; } return true; } return false; };
  function fire() {
    if (!canAct() || (G.you.fx & 4) || pickled()) return;
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
    if (!canAct() || pickled()) return;
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
  // How you can travel from here, best first: the station you are standing at, the ship
  // you are flying, then a portal gun (your own or a borrowed one).
  function travelModes() {
    const y = G.you, st = G.st, m = [];
    if (nearKiosk()) m.push('station');
    if (y.ship && st && st.ship) m.push(MM.DIM_BY_ID[G.dimId].planets ? 'light' : 'ship');   // in space: lightspeed
    if ((y.chMax && y.ch > 0) || y.bor > 0) m.push('gun');
    return m;
  }
  function travelOpts(mode) {
    const st = G.st || {};
    return mode === 'ship' || mode === 'light' ? { hull: true, engine: !!(st.ship && st.ship.engine), drive: !!(st.ship && st.ship.drive), quantum: !!(st.ship && st.ship.quantum) }
      : mode === 'gun' ? { gold: !!(G.you.chMax && G.you.ch > 0 && st.gun && st.gun.gold) } : {};
  }
  function portalAction() {
    if (!canAct() || pickled()) return;
    const m = travelModes();
    if (m.length) return openDims(m[0]);
    if (G.you.chMax && G.you.ch <= 0) { UI.toast('Portal gun is recharging'); return; }
    if (MM.DIM_BY_ID[G.dimId].station) UI.toast('Walk up to the ' + MM.kioskOf(G.dimId).name + ' to travel.');
  }
  function lightspeedKey() {
    if (!canAct() || pickled()) return;
    if (!G.you.ship || !MM.DIM_BY_ID[G.dimId].planets) { UI.toast('Lightspeed works from space: get in your ship (B) and fly straight up.', 3500); return; }
    openDims('light');
  }
  function toggleShip() {
    if (!canAct() || pickled()) return;
    if (G.you.car) { send({ t: 'car', on: false }); return; }   // B: out of the car
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
  // The landmark you mean: close by, on your floor of the house, and the one you are looking
  // at. A big place you are standing in (the garage, the back yard) gives way to the things
  // in it (the workbench, the Meeseeks box...), so you can use what is in front of you.
  function nearLandmark() {
    let best = null, bs = Infinity;
    const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
    for (const l of MM.LANDMARKS) {
      if (l.dim !== G.dimId || !MM.sameFloor(l, G.me.y)) continue;
      const dx = l.x - G.me.x, dz = l.z - G.me.z, d = Math.hypot(dx, dz), edge = d - l.r;
      if (edge >= MM.USE_RADIUS) continue;
      let score = l.r > 3 && d < l.r ? 3.5 : Math.max(0, d - Math.min(l.r, 1.2));
      if (d > 0.6) score += (1 - (dx * fx + dz * fz) / d) * 1.2;   // behind you counts for less
      if (score < bs) { bs = score; best = l; }
    }
    return best;
  }
  function interact() {
    if (!canAct()) return;
    if (G.riders && G.riders.has(G.myId)) { send({ t: 'fun', a: 'off' }); return; }
    if (G.me.sit) { G.me.sit = null; return; }
    if (G.you.car) { send({ t: 'car', on: false }); return; }   // out of the car
    const lf = nearLandmark();
    if (lf && (lf.ride || lf.gallery || lf.game) && !tasksAt(lf).length) { funAt(lf); return; }
    const n = nearestLocal();
    if (n) { send({ t: 'talk', n: n.id }); return; }
    const l = nearLandmark();
    if (l && MM.isAt(l, 'housecon')) { send({ t: 'use', l: l.id }); return; }   // the house answers (or another Rick starts hacking)
    if (l && l.car) { send({ t: 'use', l: l.id }); return; }                    // take a car
    if (l) { if (l.door && !tasksAt(l).length) send({ t: 'door', l: l.id }); else openLandmark(l); return; }
    if (nearKiosk()) openDims('station');
  }
  // Daily tasks you can do at a landmark: your own life's, plus the ones anyone can do.
  function tasksAt(l) {
    return Object.keys(MM.TASKS).filter(t => MM.isAt(l, MM.TASKS[t].at) && MM.taskFor(t, profile.arch));
  }
  function openLandmark(l) {
    const A = MM.ARCHETYPES[profile.arch];
    const tasks = tasksAt(l);
    const builds = MM.RECIPE_IDS.filter(r => MM.RECIPES[r].at && MM.isAt(l, MM.RECIPES[r].at));
    openModal('landmark', l.name, box => {
      if (l.ride || l.gallery || l.game) box.append(el('button', { class: 'btn go', onclick: () => { UI.closeModal(); funAt(l); } }, l.ride ? 'Ride ' + l.name : l.gallery ? 'Play the shooting gallery' : l.game === 'fish' ? 'Go fishing' : l.game === 'dance' ? 'Dance!' : 'Play'));
      if (l.bout) box.append(el('p', { class: 'note', text: 'Three rounds on foot: two fighters, then three, then the champion. Leave the Ring or go down and you lose. Win: ' + Object.keys(MM.BOUT.give).map(k => MM.BOUT.give[k] + ' ' + MM.MATERIALS[k].icon).join(' ') + '.' }),
        el('button', { class: 'btn go', onclick: () => { UI.closeModal(); send({ t: 'use', l: l.id }); } }, 'Fight in the Ring of Death'));
      const list = el('div', { class: 'list' });
      for (const t of tasks) {
        const T = MM.TASKS[t], wait = G.prog ? G.prog.tasks[t] : 0;
        const gives = Object.keys(T.give).map(k => T.give[k] * (profile.arch === 'teen' ? 2 : 1) + ' ' + MM.MATERIALS[k].icon).join(' ');
        list.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: T.name }), el('small', { text: (gives || '') + (T.heal ? ' · heals you' : '') + (wait ? ' · ready in ' + wait + ' s' : '') })),
          el('button', { class: 'btn go', disabled: wait ? '' : null, onclick: () => { send({ t: 'use', l: l.id, task: t }); UI.closeModal(); } }, 'Do it')));
      }
      if (!tasks.length && !l.door && !l.bout) list.append(el('p', { class: 'note', text: 'This place is not part of your daily life.' }));
      box.append(list);
      if (l.door) box.append(el('button', { class: 'btn go', onclick: () => { send({ t: 'door', l: l.id }); UI.closeModal(); } }, 'Go to ' + MM.DIM_BY_ID[l.door.dim].name));
      if (builds.length) box.append(el('p', { class: 'note', text: 'Built here: ' + builds.map(r => MM.RECIPES[r].name).join(', ') + '.' }), el('button', { class: 'btn gold', onclick: () => openCraft() }, 'Open workbench'));
    });
  }
  function emote(e) {
    if (!canAct()) return;
    e = e || 0;
    send({ t: 'em', e }); G.me.emoteT = e === 1 ? 8 : 2.5; G.me.emoteKind = e; G.me.sit = null;
  }
  // G: the emote bar (wave, dance, laugh, point, cheer, facepalm, sit).
  function emoteBar() {
    const bar = $('emoteBar');
    if (!bar.hidden) { bar.hidden = true; return; }
    bar.textContent = '';
    MM.EMOTES.forEach((name, i) => bar.append(el('button', { class: 'btn', onclick: () => { bar.hidden = true; emote(i); } }, (i + 1) + ' ' + name)));
    bar.append(el('button', { class: 'btn', onclick: () => { bar.hidden = true; sitDown(); } }, '7 Sit'));
    bar.hidden = false;
  }
  // Sit: on the bench, couch or chair you are next to, or right where you are.
  const SEATS = new Set(['citbench', 'in_bench', 'in_sofa', 'couch', 'giantchair', 'in_bed', 'bench']);
  function sitDown() {
    if (!canAct() || (G.riders && G.riders.has(G.myId))) return;
    const me = G.me;
    let best = null, bd = 2.6;
    for (const p of MM.propsNear(G.dimId, me.x, me.z, 3)) { if (!SEATS.has(p.type)) continue; const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; best = p; } }
    me.sit = best ? { x: best.x, z: best.z, y: best.y + 0.45 * best.s, yaw: best.rot } : { x: me.x, z: me.z, y: me.y - 0.25, yaw: me.yaw };
    me.vx = me.vz = me.vy = 0;
  }
  // "Show me what you got": a Cromulon's giant head rises over the horizon for a while.
  function cromulon(x, z) {
    const s = new C.Shape({ smooth: false });
    s.add(C.prim.sphere, '#f2c8b0', [0, 0, 0], null, [22, 30, 20]);
    for (const sx of [-1, 1]) { s.add(C.prim.sphere, '#ffffff', [sx * 8, 6, 17], null, [6, 6, 3]); s.add(C.prim.sphere, '#1a1a1a', [sx * 8, 5, 19.5], null, [2.4, 2.4, 1]); s.add(C.prim.box, '#5a3a2a', [sx * 8, 13, 17], [0, 0, sx * 0.2], [9, 1.5, 2]); }
    s.add(C.prim.sphere, '#3a0d16', [0, -12, 17], null, [9, 4, 3]);
    s.add(C.prim.sphere, '#e0b098', [0, -1, 20], null, [3, 5, 3]);
    const head = C.meshOf(s.build(), 0.4);
    const a = Math.random() * Math.PI * 2;
    head.position.set(x + Math.sin(a) * 140, MM.heightAt(G.dimId, x, z) + 10, z + Math.cos(a) * 140);
    head.lookAt(x, head.position.y, z);
    scene.add(head);
    UI.banner('SHOW ME WHAT YOU GOT!', 'A Cromulon heard you. It wants to see what you got. (Dance! G)');
    const t0 = now();
    const rise = () => {
      const t = now() - t0;
      head.position.y = MM.heightAt(G.dimId, x, z) - 20 + Math.min(1, t / 3) * 60 - Math.max(0, t - 12) * 20;
      if (t < 15 && G.dimId) requestAnimationFrame(rise); else scene.remove(head);
    };
    rise();
  }
  // "Pickle Rick!": turned into a pickle for a while.
  function pickleFor(id, secs) {
    const swap = (getAv, setAv, look, arch) => {
      const old = getAv();
      if (!old) return;
      const pk = C.buildAvatar(Object.assign({}, look, { species: 'pickle', skin: '#7cbf3a', hairColor: '#4a7a22' }), arch);
      pk.root.position.copy(old.root.position);
      scene.remove(old.root); scene.add(pk.root); setAv(pk);
      fx.burst(old.root.position.x, old.root.position.y + 1, old.root.position.z, '#7ad85a', 30, 6, 0.6, 0.6, 2);
      setTimeout(() => { const cur = getAv(); if (cur !== pk) return; const back = C.buildAvatar(look, arch); back.root.position.copy(pk.root.position); scene.remove(pk.root); pk.dispose(); scene.add(back.root); setAv(back); if (id === G.myId && G.prog) C.setGear(back, myGear()); }, secs * 1000);
    };
    if (id === G.myId) swap(() => G.meAv, a => { G.meAv = a; }, profile.look, profile.arch);
    else { const p = G.players.get(id); if (p) swap(() => p.av, a => { const tag = p.tag.sprite; a.root.add(tag); p.av = a; collectOutlines(a); }, p.info.look, p.info.arch); }
  }
  // The server's clock (for the rides' trains).
  function serverNow() { return now() - (G.offset || 0); }
  // A ride, a shooting gallery or a mini-game at this spot.
  function funAt(l) {
    if (l.ride) { send({ t: 'fun', a: 'ride', l: l.id }); return; }
    if (l.gallery) { send({ t: 'fun', a: 'gallery', l: l.id }); return; }
    if (document.pointerLockElement) document.exitPointerLock();
    const report = s => { send({ t: 'mg', g: l.game, l: l.id, s }); UI.afterClose && UI.afterClose(); };
    if (l.game === 'fish') C.playFishing(l.fish, report);
    else if (l.game === 'dance') C.playDance(l.name, report, b => { if (b % 6 === 0) send({ t: 'em', e: 1 }); G.me.emoteT = 1.2; G.me.emoteKind = 1; });
    else if (l.game === 'roy') C.playRoy(report);
  }
  // The shooting gallery's scoreboard (top right), while one runs here.
  function galHud(e) {
    const h = $('galHud');
    if (!e || !e.on) { h.hidden = true; if (e && e.sc) UI.banner(MM.GALLERIES[e.id] ? MM.GALLERIES[e.id].name + ': over!' : 'Over!', e.sc.length ? e.sc.map((q, i) => (i + 1) + '. ' + q[0] + ' ' + q[1]).join('  ') : 'Nobody hit anything.'); return; }
    if (e.by) UI.toast(e.by + ' started the ' + MM.GALLERIES[e.id].name + '. Shoot the targets!', 3000);
    h.hidden = false; h.textContent = '';
    h.append(el('b', { text: '🎯 ' + MM.GALLERIES[e.id].name + ' · ' + e.left + ' s' }));
    for (const [name, n] of e.sc || []) h.append(el('div', { text: name + ' — ' + n }));
  }

  // ---------- Dialogs ----------
  // ---------- Rick's house (shared/house.js) ----------
  // "House, ...": the console in the garage, or (your own house) H anywhere near it.
  function houseKey() {
    if (profile.arch !== 'genius') { UI.toast('Only a Rick can talk to a Rick\'s house.'); return; }
    openDefenses(true);
  }
  function openDefenses(own) {
    openModal('house', 'House defences', box => {
      box.append(el('p', { class: 'note', text: own ? 'Your house answers to your voice: say it (H) anywhere near it, or use the console in the garage.' : 'Hacked: another Rick\'s house, for now.' }));
      const list = el('div', { class: 'deflist' });
      for (const id of MM.DEFENSE_IDS) {
        const D = MM.DEFENSES[id];
        if (id === 'tele') {
          for (let i = 0; i < MM.TELE_SPOTS.length; i++) list.append(el('button', { class: 'btn defbtn', onclick: () => { send({ t: 'hd', o: 'tele', d: i }); UI.closeModal(); } },
            el('b', { text: D.icon + ' Teleport: ' + MM.TELE_SPOTS[i].name }), el('span', { text: D.desc })));
          continue;
        }
        list.append(el('button', { class: 'btn defbtn', onclick: () => { send({ t: 'hd', o: id }); if (id !== 'wardrobe') UI.closeModal(); } },
          el('b', { text: D.icon + ' ' + D.name + (D.dur ? ' (' + D.dur + ' s)' : '') }), el('span', { text: D.desc })));
      }
      box.append(list);
    });
  }
  // The retractable wardrobe: change what you wear (everyone sees it).
  function openWardrobe() {
    const L = Object.assign({}, profile.look);
    openModal('wardrobe', 'Wardrobe', box => {
      const row = (label, input) => el('label', { class: 'grp' }, el('span', { text: label }), input);
      const sel = (k, opts) => { const s = el('select', { class: 'field' }); for (const o of opts) s.append(el('option', { value: o, text: o })); s.value = L[k]; s.onchange = () => { L[k] = s.value; }; return s; };
      const col = k => { const i = el('input', { type: 'color', class: 'field', value: L[k] }); i.oninput = () => { L[k] = i.value; }; return i; };
      box.append(row('Top', sel('top', MM.LOOK.top)), row('Top colour', col('topColor')), row('Shirt', col('shirtColor')), row('Trousers', col('pantsColor')),
        row('Hat or glasses', sel('acc', MM.LOOK.acc)), row('Its colour', col('accColor')), row('Hair', sel('hair', MM.LOOK.hair)), row('Hair colour', col('hairColor')),
        el('div', { class: 'chips' }, el('button', { class: 'btn go', onclick: () => {
          profile.look = MM.sanitizeLook(L); UI.save('profile', profile);
          send({ t: 'lk', look: profile.look });
          if (G.meAv) { scene.remove(G.meAv.root); G.meAv.dispose(); G.meAv = null; }
          G.meAv = C.buildAvatar(profile.look, profile.arch, { ratsuit: !!(G.prog && G.prog.up.ratsuit) });
          scene.add(G.meAv.root);
          if (G.prog) C.setGear(G.meAv, myGear());
          C.setShip(G.meAv, !!(G.you && G.you.ship), myGear());
          C.setCar(G.meAv, !!(G.you && G.you.car));
          UI.closeModal();
        } }, 'Wear it')));
    });
  }
  // What the house's defences look like: the forcefield dome, the blast shutters, the laser grid.
  const houseFx = { root: null, dome: null, shutters: null, grid: null };
  function setHouse(h) {
    const t = now();
    G.house = h ? { s: t + h.s, d: t + h.d, g: t + h.g, l: t + h.l } : null;
    const D = MM.DIM_BY_ID[G.dimId];
    if (houseFx.root) { scene.remove(houseFx.root); houseFx.root = null; }
    if (!G.house || !D || D.interior || MM.worldOf(G.dimId) !== 'earth') return;
    const root = houseFx.root = new T.Group();
    const gy = MM.heightAt(G.dimId, MM.HOUSE.x, MM.HOUSE.z);
    const dome = houseFx.dome = new T.Mesh(new T.SphereGeometry(MM.HOUSE.r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshBasicMaterial({ color: '#7ae8ff', transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }));
    dome.position.set(MM.HOUSE.x, gy, MM.HOUSE.z); root.add(dome);
    const wire = new T.Mesh(dome.geometry, new T.MeshBasicMaterial({ color: '#bff4ff', wireframe: true, transparent: true, opacity: 0.25, depthWrite: false }));
    dome.add(wire);
    const home = MM.LANDMARKS.find(l => l.dim === G.dimId && MM.isAt(l, 'home'));
    const sh = houseFx.shutters = new T.Group();
    if (home) {
      const steel = new T.MeshLambertMaterial({ color: '#7a828c' }), seam = new T.MeshLambertMaterial({ color: '#4a525c' });
      const shell = new T.Mesh(new T.BoxGeometry(14.5, 7.2, 10.5), steel);
      shell.position.set(0, 3.6, 0); sh.add(shell);
      for (let i = -3; i <= 3; i++) { const b = new T.Mesh(new T.BoxGeometry(14.6, 0.08, 10.6), seam); b.position.y = 3.6 + i; sh.add(b); }
      sh.position.set(home.x, MM.heightAt(G.dimId, home.x, home.z), home.z); sh.rotation.y = home.rot || 0;
      root.add(sh);
    }
    const grid = houseFx.grid = new T.Group(), red = new T.MeshBasicMaterial({ color: '#ff2a2a' });
    for (let y = 0.4; y < 4; y += 0.45) { const b = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 9.8), red); b.position.set(-9.3, gy + y, 28.55); grid.add(b); }
    for (let i = 0; i < 6; i++) { const b = new T.Mesh(new T.BoxGeometry(10, 0.04, 0.04), red); b.position.set(-14.6, gy + 0.6 + i * 0.55, 23.7 + (i % 2) * 9.7); grid.add(b); }
    root.add(grid);
    scene.add(root);
    tickHouseFx();
  }
  function tickHouseFx() {
    if (!houseFx.root || !G.house) return;
    const t = now();
    houseFx.dome.visible = G.house.s > t;
    if (houseFx.dome.visible) houseFx.dome.material.opacity = 0.12 + Math.sin(t * 3) * 0.04;
    houseFx.shutters.visible = G.house.d > t;
    houseFx.grid.visible = G.house.g > t;
  }

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
    const rings = [[0.9, 0.88, 11], [0.78, 0.8, 10], [0.66, 0.68, 9], [0.54, 0.52, 7], [0.42, 0.3, 4]];
    let k = 0;
    for (const [f, span, n] of rings) for (let i = 0; i < n && k < ids.length; i++, k++) {
      const t = n === 1 ? 0 : -span + (2 * span * i) / (n - 1);
      spots.push({ id: ids[k], x: cx + rx * f * Math.sin(t), y: cy - ry * f * Math.cos(t) });
    }
    // Worlds outside the Curve sit in the dark corners above the dome.
    const OUT = [[40, 30], [100, 20], [40, 92], [480, 30], [420, 20], [480, 92]];
    out.forEach((id, i) => { const [x, y] = OUT[i % OUT.length]; spots.push({ id, x, y, out: true }); });
    let sel = null;
    function draw() {
      g.fillStyle = '#0b0f1e'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + (i * 37 % 10) / 20) + ')'; g.fillRect((i * 173) % W, (i * 97) % H, 1.2, 1.2); }
      // Inside the curve is a little warmer.
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(95,248,255,0.07)'; g.fill(); g.restore();
      for (const [w, a] of [[14, 0.12], [7, 0.3], [2.5, 0.95]]) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2); g.strokeStyle = 'rgba(95,248,255,' + a + ')'; g.lineWidth = w; g.stroke(); }
      g.fillStyle = '#5ff8ff'; g.font = '700 10px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('THE CENTRAL FINITE CURVE', cx, cy - ry - 10);
      if (out.length) { g.fillStyle = '#9aa6c8'; g.font = '9px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('outside the curve', 8, 128); g.textAlign = 'right'; g.fillText('outside the curve', W - 8, 128); }
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
  // Where to go: search, tabs (recent, Earths, worlds, other times, outside the Curve, the
  // map) and a card per world in its own sky colours, with who is there and, if you can't go
  // this way, why not.
  const recentDims = UI.load('recentDims', []);
  function noteVisit(id) {
    const D = MM.DIM_BY_ID[id];
    if (!D || D.hidden || D.interior || D.planets) return;
    const i = recentDims.indexOf(id); if (i >= 0) recentDims.splice(i, 1);
    recentDims.unshift(id); recentDims.length = Math.min(recentDims.length, 8);
    UI.save('recentDims', recentDims);
  }
  // Where to go, the way the multiverse is laid out: pick a world (Earth, Bird World, the
  // Citadel...), then which dimension of it (Earth C-137, Shrimp Earth, your home Earth...),
  // then which timeline (the present, the split timeline, 65 million years ago...). Search
  // finds any of them by name or code; Recent and the Map are a tab away.
  function openDims(mode, worldWas, queryWas, tabWas) {
    G.modalMode = mode;
    const opts = travelOpts(mode);
    const here = MM.DIM_BY_ID[G.dimId], hereWorld = MM.worldOf(here.planets ? here.planets[0].dim : G.dimId);
    // In a ship on the ground the way is up: space, then fly over or go to lightspeed.
    const why = id => {
      if (mode !== 'ship') return MM.travelWhy(mode === 'gun' ? 'portal' : mode, G.dimId, id, opts);
      const B = MM.DIM_BY_ID[id];
      if (B.pocket || B.hidden) return MM.travelWhy('portal', G.dimId, id, {});
      return here.space && here.space === B.space ? 'Fly straight up into space and over to it.' : 'Fly straight up into space, then go to lightspeed (L).';
    };
    const opened = performance.now();
    const go = id => {
      if (performance.now() - opened < 450) return;   // the tap that opened the menu is not a choice
      const w = why(id);
      if (w) { UI.toast(w, 3500); return; }
      if (mode === 'station') send({ t: 'ki', d: id });
      else if (mode === 'light') { send({ t: 'ls', d: id }); lightspeedFx(); }
      else { send({ t: 'po', d: id }); UI.toast('Portal open. Walk through it! Anyone nearby can follow you.'); }
      UI.closeModal();
    };
    const S = here.station;
    const title = mode === 'station' ? S.name : mode === 'ship' ? 'Where to? (by ship)' : mode === 'light' ? 'Lightspeed' : G.you.chMax && G.you.ch > 0 ? 'Portal gun' : 'Borrowed portal gun';
    const pop = id => G.pop ? G.pop.d[id] || 0 : 0;
    // The dimensions of a world (Earth also has everyone's home Earths), each with its timelines.
    const dimsOf = W => {
      let ids = W.dims.slice();
      if (W.id === 'earth') ids = ids.concat([MM.homeDimId(profile.home)], G.pop ? Object.keys(G.pop.d).filter(id => MM.HOME_RE.test(id) && G.pop.d[id] > 0) : []);
      return ids.filter((id, i, a) => a.indexOf(id) === i && MM.DIM_BY_ID[id]);
    };
    const worldPop = W => dimsOf(W).reduce((n, id) => n + pop(id) + MM.timelinesOf(id).reduce((m, t) => m + pop(t), 0), 0);
    let world = worldWas || hereWorld || 'earth', query = queryWas || '', tab = tabWas || 'Worlds';
    openModal('dims', title, box => {
      box.classList.add('travel');
      const others = travelModes().filter(x => x !== mode);
      if (others.length) {
        const sw = el('div', { class: 'chips' });
        for (const o of others) sw.append(el('button', { class: 'btn', onclick: () => { UI.closeModal(); openDims(o); } }, o === 'station' ? 'Use the station' : o === 'ship' || o === 'light' ? 'Fly the ship' : 'Use the portal gun'));
        box.append(sw);
      }
      // Where you are now, as world › dimension › timeline.
      const dimNow = MM.dimensionOf(here.planets ? here.planets[0].dim : G.dimId), Dn = MM.DIM_BY_ID[dimNow], Wn = MM.WORLD_BY_ID[hereWorld];
      box.append(el('p', { class: 'tcrumb' }, el('span', { text: 'You are here: ' }),
        el('b', { text: (Wn ? Wn.icon + ' ' + Wn.name : here.name) }), el('span', { text: ' › ' + (Dn ? Dn.name : here.name) + ' › ' + (MM.DIM_BY_ID[G.dimId].timeline ? MM.DIM_BY_ID[G.dimId].name : here.planets ? 'in space' : 'the present') })));
      const search = el('input', { type: 'search', class: 'tsearch', placeholder: 'Search worlds, dimensions and timelines (name or code)…', value: query, 'aria-label': 'Search' });
      const tabs = el('div', { class: 'ttabs', role: 'tablist' }), body = el('div', { class: 'tbody' });
      box.append(search, tabs, body);
      const bg = d => 'background: linear-gradient(160deg, ' + d.sky[0] + ', ' + d.sky[1] + ' 70%, ' + d.ground[1] + ')';
      const card = id => {
        const d = MM.DIM_BY_ID[id];
        if (!d) return null;
        const n = pop(id), w = id === G.dimId ? 'You are here.' : why(id), mine = id === MM.homeDimId(profile.home);
        return el('button', { class: 'tcard' + (w ? ' locked' : ''), style: bg(d), onclick: () => go(id), title: w || d.blurb, 'aria-label': d.name + (w ? ': ' + w : '') },
          el('span', { class: 'tname', text: (mine ? '★ ' : '') + d.name }),
          el('span', { class: 'tcode', text: d.code + (n ? ' · ' + n + ' here' : '') }),
          el('span', { class: 'tblurb', text: w || d.blurb }));
      };
      // A dimension: the card for its present, and a chip for each other timeline.
      const dimRow = (id, i) => {
        const c = card(id);
        const tl = MM.timelinesOf(id);
        if (!tl.length) return c;
        const wrap = el('div', { class: 'tdim' }, c);
        const chips = el('div', { class: 'ttl', role: 'group', 'aria-label': 'Timelines of ' + MM.DIM_BY_ID[id].name });
        chips.append(el('span', { class: 'tlab', text: '⧗ Timelines:' }));
        for (const t of tl) {
          const T = MM.DIM_BY_ID[t], w = t === G.dimId ? 'You are here.' : why(t), n = pop(t);
          chips.append(el('button', { class: 'tchip' + (w ? ' locked' : ''), title: w || T.blurb, onclick: () => go(t), style: bg(T) }, T.name.replace(MM.DIM_BY_ID[id].name + ', ', '') + (n ? ' · ' + n : '')));
        }
        wrap.append(chips);
        return wrap;
      };
      const render = () => {
        tabs.textContent = ''; body.textContent = '';
        for (const t of ['Worlds', 'Recent', 'Map']) tabs.append(el('button', { role: 'tab', 'aria-selected': String(!query && t === tab), onclick: () => { tab = t; query = ''; search.value = ''; render(); } }, t));
        if (!query && tab === 'Map') { body.append(curveMap(go)); return; }
        if (query || tab === 'Recent') {
          let ids;
          if (query) {
            const q = query.toLowerCase();
            ids = MM.WORLD_IDS.concat(dimsOf(MM.WORLD_BY_ID.earth)).filter((id, i, a) => a.indexOf(id) === i && MM.DIM_BY_ID[id] && !MM.DIM_BY_ID[id].pocket)
              .filter(id => { const D = MM.DIM_BY_ID[id], W = MM.WORLD_BY_ID[MM.worldOf(id)]; return (D.name + ' ' + D.code + ' ' + (W ? W.name : '')).toLowerCase().includes(q); });
            ids.sort((a, b) => (!!why(a) - !!why(b)) || (pop(b) - pop(a)));
          } else ids = recentDims.filter(id => MM.DIM_BY_ID[id]);
          const grid = el('div', { class: 'tgrid' });
          for (const id of ids) { const c = card(id); if (c) grid.append(c); }
          body.append(ids.length ? grid : el('p', { class: 'note', text: query ? 'Nowhere called that.' : 'Nowhere yet. Go somewhere and it shows up here.' }));
          return;
        }
        // Worlds: one chip each, then the chosen world's dimensions and their timelines.
        const strip = el('div', { class: 'tworlds', role: 'tablist', 'aria-label': 'Worlds' });
        for (const W of MM.WORLDS) {
          const n = worldPop(W);
          strip.append(el('button', { class: 'tworld', role: 'tab', 'aria-selected': String(W.id === world), title: W.blurb, onclick: () => { world = W.id; render(); } },
            el('span', { class: 'ticon', text: W.icon }), el('span', { text: W.name + (n ? ' · ' + n : '') })));
        }
        body.append(strip);
        const W = MM.WORLD_BY_ID[world], P = MM.DIM_BY_ID[W.prime];
        const how = W.realm ? 'Not a planet you can fly to: get there by portal, or lightspeed from space.'
          : P.space && here.space === P.space ? 'In this universe: fly your ship up into space and over to it, or open a portal.'
          : 'Another universe: open a portal, or fly up into space and go to lightspeed.';
        body.append(el('div', { class: 'twhead' }, el('b', { text: W.icon + ' ' + W.name }), el('span', { text: W.blurb + ' ' + how })));
        body.append(el('p', { class: 'tsub', text: 'Dimensions of ' + W.name + ' (' + dimsOf(W).length + ')' }));
        const grid = el('div', { class: 'tgrid' });
        dimsOf(W).forEach((id, i) => { const c = dimRow(id, i); if (c) grid.append(c); });
        body.append(grid);
      };
      search.oninput = () => { query = search.value.trim(); render(); };
      render();
      const fee = S && !S.free.includes(profile.arch) ? Object.keys(S.fee).map(k => S.fee[k] + ' ' + MM.MATERIALS[k].name).join(', ') : '';
      box.append(el('p', { class: 'note', text: mode === 'station' ? 'Step through the station portal' + (fee ? ' for ' + fee : ' (free for you)') + '.'
        : mode === 'ship' ? 'Worlds in this universe: fly straight up into space and over to the planet. Other dimensions and timelines: from space, go to lightspeed (L).'
        : mode === 'light' ? 'Jump to the space around any world: another dimension needs the Dimension Drive, another timeline the Quantum Drive.'
        : 'Opens a portal in front of you for ' + MM.PORTAL_TTL + ' s. Anyone can walk through it, so your friends (and enemies) can follow.' }));
      if (!isTouch) setTimeout(() => search.focus(), 50);
    });
  }
  // Going to lightspeed: the stars stretch into lines and the screen flashes.
  function lightspeedFx() {
    const o = $('lightspeed');
    if (!o) return;
    o.classList.remove('on'); void o.offsetWidth; o.classList.add('on');
    C.sfx('warp', 1);
    G.shake = Math.max(G.shake, 0.25);
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
      const stamps = pg.stamps || [];
      box.append(el('h3', { text: '🛂 Multiverse passport: ' + stamps.length + ' dimensions stamped' }));
      const nextM = MM.PASSPORT.find(q => q[0] > stamps.length);
      box.append(el('p', { class: 'note', text: (nextM ? 'Next reward at ' + nextM[0] + ' stamps: ' + nextM[1] + '. ' : 'Every reward collected. ') + 'Every dimension and timeline you set foot in gets a stamp.' }));
      const pass = el('div', { class: 'coll' });
      for (const W of MM.WORLDS) {
        const ds = W.dims.concat(...W.dims.map(d => MM.timelinesOf(d)));
        const got = ds.filter(d => stamps.includes(d)).length;
        pass.append(el('span', { class: 'chip' + (got ? ' have' : ''), title: W.name, text: W.icon + ' ' + got + '/' + ds.length }));
      }
      box.append(pass);
      const rides = pg.rides || {}, fish = pg.fish || {}, best = pg.best || {};
      box.append(el('h3', { text: '🎢 Fun' }));
      box.append(el('p', { class: 'note', text: 'Rides ridden: ' + Object.keys(rides).length + ' of ' + MM.RIDES.length + (Object.keys(rides).length ? ' (' + Object.keys(rides).map(k => MM.RIDE_BY_ID[k].name).join(', ') + ')' : '') + '.' }));
      box.append(el('p', { class: 'note', text: 'Rides to find: ' + MM.RIDES.filter(R => !rides[R.id]).map(R => R.name + ' (' + (MM.DIM_BY_ID[R.dim] ? MM.DIM_BY_ID[R.dim].name : '') + ')').join(', ') || 'none, you rode them all!' }));
      box.append(el('p', { class: 'note', text: 'Fish caught: ' + (Object.keys(fish).length ? Object.keys(fish).map(k => k + ' ×' + fish[k]).join(', ') : 'none yet (fish at the beach by the pier, on frozen lakes, in the Teenyverse)') + '.' }));
      const scores = Object.keys(best).filter(k => MM.GALLERIES[k] || /^(dance|roy):/.test(k));
      if (scores.length) box.append(el('p', { class: 'note', text: 'Best scores: ' + scores.map(k => (MM.GALLERIES[k] ? MM.GALLERIES[k].name + ' ' + best[k] + ' hits' : /^roy/.test(k) ? 'Roy ' + best[k] + ' years' : 'Dancing ' + best[k] + '%')).join(' · ') }));
      const eggs = pg.eggs || [];
      box.append(el('h3', { text: '🥚 Easter eggs: ' + eggs.length + ' of ' + MM.EGGS.length }));
      box.append(el('p', { class: 'note', text: (eggs.length ? 'Found: ' + eggs.map(id => MM.EGG_BY_ID[id].name).join(', ') + '. ' : '') + 'Hidden things from the show, cameos to meet, and things to say in chat. ' +
        MM.EGGS.filter(E => !eggs.includes(E.id)).length + ' left.' }));
      const st = G.st;
      box.append(el('h3', { text: 'You' }), el('p', { class: 'note', text: 'Health ' + st.maxHp + ' · speed ' + st.speed.toFixed(1) + ' · damage ×' + st.dmg.toFixed(2) +
        (st.fly ? ' · ' + (st.fly === 'jet' ? 'jetpack' : 'wings') : '') + (st.gun ? ' · portal gun ×' + st.gun.charges : '') + (st.ship ? ' · ship' + (st.ship.drive ? ' with dimension drive' : '') + (st.ship.quantum ? ' with quantum drive' : '') : '') }));
    });
  }
  // Inventory (I): gadgets, curios you are carrying, materials, and the collection log.
  const GADGET_KEYS = { grenade: '1', turret: '2', shrink: '3', meeseeks: '4', timecrystal: '5', freeze: '6' };
  function openInventory() {
    const y = G.you, pg = G.prog;
    if (!y || !pg) return;
    openModal('items', 'Inventory', box => {
      box.append(el('h3', { text: 'Curios' }));
      const cl = el('div', { class: 'list' });
      for (const q of MM.CURIO_IDS) {
        const n = y.inv['q:' + q] || 0, Q = MM.CURIOS[q];
        if (!n) continue;
        cl.append(el('div', { class: 'row' }, el('span', { class: 'emo', text: Q.icon }), el('div', { class: 't' }, el('b', { text: Q.name + (n > 1 ? ' ×' + n : '') }), el('small', { text: Q.desc })),
          el('button', { class: 'btn' + (Q.use ? ' go' : ''), onclick: () => { send({ t: 'uc', id: q }); } }, Q.use ? (Q.eat ? 'Use' : 'Try') : 'Look')));
      }
      if (!cl.childNodes.length) cl.append(el('p', { class: 'note', text: 'Nothing yet. Curios glow in a column of light: walk into one to pick it up.' }));
      box.append(cl, el('h3', { text: 'Gadgets' }));
      const gl = el('div', { class: 'list' });
      for (const g of MM.GADGET_IDS) {
        const n = y.inv[g] || 0, R = MM.RECIPES[g];
        if (!n) continue;
        gl.append(el('div', { class: 'row' + (n ? '' : ' later') }, el('div', { class: 't' }, el('b', { text: R.name + (n ? ' ×' + n : '') }), el('small', { text: R.desc + (isTouch ? '' : ' · key ' + GADGET_KEYS[g]) })),
          el('button', { class: 'btn go', onclick: () => { UI.closeModal(); useGadget(g); } }, 'Use')));
      }
      if (!gl.childNodes.length) gl.append(el('p', { class: 'note', text: 'No gadgets. Build them at the workbench (C).' }));
      box.append(gl, el('p', { class: 'note' }, 'Build more gadgets at the workbench: ', el('button', { class: 'btn', onclick: () => openCraft() }, 'Build (C)')), el('h3', { text: 'Materials' }));
      box.append(el('p', { class: 'note', text: MM.MAT_IDS.map(k => MM.MATERIALS[k].icon + ' ' + (y.inv[k] || 0) + ' ' + MM.MATERIALS[k].name).join(' · ') }));
      const found = pg.found || [];
      box.append(el('h3', { text: 'Collection: ' + found.length + ' of ' + MM.CURIO_IDS.length }));
      const grid = el('div', { class: 'coll' });
      for (const q of MM.CURIO_IDS) {
        const Q = MM.CURIOS[q], have = found.includes(q);
        const where = Q.dims.map(d => MM.DIM_BY_ID[d].name).slice(0, 3).join(', ');
        grid.append(el('div', { class: 'cc' + (have ? '' : ' no'), title: have ? Q.name + ': ' + Q.desc : 'Somewhere in ' + where },
          el('span', { class: 'emo', text: have ? Q.icon : '?' }), el('small', { text: have ? Q.name : '???' }), el('i', { text: have ? '' : where })));
      }
      box.append(grid);
    });
  }
  function openBoard() {
    openModal('board', 'Multiverse', box => {
      box.append(el('h3', { text: 'Chaos leaderboard (everyone online)' }));
      const tb = el('table', { class: 'lb' }, el('tr', null, el('th', { text: '#' }), el('th', { text: 'Variant' }), el('th', { text: 'Chaos' }), el('th', { text: 'KOs' }), el('th', { text: 'Where' })));
      G.top.forEach((r, i) => tb.append(el('tr', null, el('td', { text: String(i + 1) }), el('td', { text: r[0] + ' ' + r[1] + (r[5] ? ' (bot)' : '') }), el('td', { text: String(r[2]) }), el('td', { text: String(r[3]) }), el('td', { text: MM.DIM_BY_ID[r[4]] ? MM.DIM_BY_ID[r[4]].name : '' }))));
      box.append(tb);
      if (G.team.size) {
        box.append(el('h3', { text: 'Your team' }), el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: G.teamNames.join(', ') }),
          el('small', { text: 'Stand close when someone takes a door, station or ship, and you go too.' })),
          el('button', { class: 'btn', onclick: () => send({ t: 'tm', op: 'leave' }) }, 'Leave')));
      }
      box.append(el('h3', { text: 'In this dimension' }));
      const list = el('div', { class: 'list' });
      for (const [id, p] of G.players) {
        const muted = G.muted.has(id), mate = G.team.has(id);
        list.append(el('div', { class: 'row' }, el('div', { class: 't' }, el('b', { text: (mate ? '★ ' : '') + p.info.name + ' ' + p.info.home }), el('small', { text: archLabel(p.info) })),
          mate ? '' : el('button', { class: 'btn go', onclick: () => { send({ t: 'tm', op: 'inv', id }); } }, 'Invite'),
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
        row('Fights', el('div', { class: 'chips' }, ...[[true, 'On: anyone with fights on can hurt you'], [false, 'Off: nobody can hurt you']].map(([v, t]) => el('button', { class: 'chip', 'aria-pressed': String((settings.pvp !== false) === v), onclick: () => { settings.pvp = v; UI.save('settings', settings); if (G.net) send({ t: 'pvp', on: v }); openMenu(); } }, t)))),
        row('View', el('div', { class: 'chips' }, ...[['third', 'Third person'], ['first', 'First person']].map(([v, t]) => el('button', { class: 'chip', 'aria-pressed': String(settings.view === v), onclick: () => { setView(v); openMenu(); } }, t)))),
        row('Look', el('div', { class: 'chips' }, ...[['real', 'Realistic'], ['cartoon', 'Cartoon']].map(([q, label]) => el('button', { class: 'chip', 'aria-pressed': String(settings.style === q), onclick: () => { if (settings.style === q) return; settings.style = q; UI.save('settings', settings); UI.toast('The new look applies when you reload the game.', 3500); openMenu(); } }, label)))),
        row('Graphics', el('div', { class: 'chips' }, ...['high', 'low'].map(q => el('button', { class: 'chip', 'aria-pressed': String(settings.quality === q), onclick: () => { settings.quality = q; applyQuality(); resize(); UI.save('settings', settings); openMenu(); } }, q)))),
        row('Options', el('div', { class: 'chips' },
          el('button', { class: 'chip', 'aria-pressed': String(settings.invert), onclick: () => { settings.invert = !settings.invert; UI.save('settings', settings); openMenu(); } }, 'Invert look'),
          el('button', { class: 'chip', 'aria-pressed': String(settings.botChat), onclick: () => { settings.botChat = !settings.botChat; UI.save('settings', settings); openMenu(); } }, 'Show bot chat'),
          isTouch ? null : el('button', { class: 'chip', 'aria-pressed': String(!!document.fullscreenElement), onclick: () => { toggleFullscreen(); UI.closeModal(); } }, 'Full screen'))),
        el('div', { class: 'chips' },
          el('button', { class: 'btn go', onclick: () => UI.closeModal() }, 'Resume'),
          el('button', { class: 'btn', onclick: () => UI.help() }, 'How to play'),
          el('button', { class: 'btn pink', onclick: () => leave('') }, 'Leave to menu')));
    });
  }

  // ---------- Input ----------
  const keys = new Set();
  const touch = { mx: 0, mz: 0, fire: false, jump: false, down: false, sprint: false, stickId: null, lookId: null, lx: 0, ly: 0 };
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
    // Ctrl is "down" in the ship: keep Ctrl+W, Ctrl+R, Ctrl+S... from closing, reloading or
    // saving the page while you play (Ctrl+W can only be caught in full screen, see lockKeys).
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    if (UI.modalOpen()) { if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); UI.closeModal(); } return; }
    if (e.key === 'Tab') { e.preventDefault(); openBoard(); return; }
    keys.add(e.code);
    if (e.repeat) return;
    // The emote bar is open: 1-7 pick from it.
    if (!$('emoteBar').hidden && /^Digit[1-7]$/.test(e.code)) { const i = +e.code.slice(5) - 1; $('emoteBar').hidden = true; if (i < 6) emote(i); else sitDown(); return; }
    switch (e.code) {
      case 'Enter': case 'KeyT': e.preventDefault(); openChat(); break;
      case 'Escape': openMenu(); break;
      case 'KeyE': portalAction(); break;
      case 'KeyF': interact(); break;
      case 'KeyC': openCraft(); break;
      case 'KeyX': scan(); break;
      case 'KeyR': shootPair(); break;
      case 'KeyJ': openJournal(); break;
      case 'KeyH': houseKey(); break;
      case 'KeyB': toggleShip(); break;
      case 'KeyL': lightspeedKey(); break;
      case 'KeyQ': ability(); break;
      case 'Digit1': useGadget('grenade'); break;
      case 'Digit2': useGadget('turret'); break;
      case 'Digit3': useGadget('shrink'); break;
      case 'Digit4': useGadget('meeseeks'); break;
      case 'Digit5': useGadget('timecrystal'); break;
      case 'Digit6': useGadget('freeze'); break;
      case 'Digit7': useGadget('chalk'); break;
      case 'KeyI': openInventory(); break;
      case 'KeyV': toggleView(); break;
      case 'KeyG': emoteBar(); break;
      case 'Space': e.preventDefault(); if (G.you && G.you.dead && now() >= G.rsAt) send({ t: 'rs' }); break;
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; touch.fire = false; touch.jump = false; });

  // Take the mouse back for looking around (after a menu closes, so you don't have to click
  // the game again). Only works inside a click or key press, which is when menus close.
  function relock() {
    if (G.mode !== 'play' || isTouch || UI.modalOpen() || chatOpen() || document.pointerLockElement || !canvas.requestPointerLock) return;
    if (G.you && G.you.dead) return;
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
  }
  UI.afterClose = () => setTimeout(relock, 0);
  // Full screen also lets the game keep Ctrl+W and friends (Ctrl is "down" in the ship).
  function toggleFullscreen() {
    const d = document;
    if (d.fullscreenElement) { d.exitFullscreen().catch(() => {}); return; }
    const p = d.documentElement.requestFullscreen && d.documentElement.requestFullscreen();
    if (p && p.then) p.then(() => { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['KeyW', 'KeyR', 'KeyT', 'KeyN', 'KeyQ', 'KeyS', 'KeyD', 'KeyF']).catch(() => {}); }).catch(() => {});
  }
  // Closing the window by accident (Ctrl+W outside full screen) asks first.
  window.addEventListener('beforeunload', e => { if (G.mode === 'play' && !G.leaving) { e.preventDefault(); e.returnValue = ''; } });

  // Mouse: pointer lock when the page allows it; otherwise drag to look.
  canvas.addEventListener('mousedown', e => {
    if (G.mode !== 'play' || UI.modalOpen() || isTouch) return;
    C.audioUnlock();
    if (!document.pointerLockElement && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) shootPair();   // right click: the next portal of your pair
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
  const endStick = e => { if (e.pointerId !== touch.stickId) return; touch.stickId = null; touch.mx = touch.mz = 0; touch.sprint = false; stick.classList.remove('sprint'); stick.firstElementChild.style.transform = ''; };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    touch.mx = dx; touch.mz = -dy;
    touch.sprint = l > 1.25;   // drag past the edge of the stick to sprint
    stick.classList.toggle('sprint', touch.sprint);
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
  for (const b of document.querySelectorAll('#tbtns button[data-i]')) b.prepend(UI.icon(b.dataset.i));
  hold('tFire', 'fire'); hold('tJump', 'jump'); hold('tDown', 'down');
  $('tAb').addEventListener('pointerdown', () => ability());
  $('tPortal').addEventListener('pointerdown', () => portalAction());
  $('tLight').addEventListener('pointerdown', () => lightspeedKey());
  $('tTalk').addEventListener('pointerdown', () => interact());
  $('tShip').addEventListener('pointerdown', () => toggleShip());
  $('tPair').addEventListener('pointerdown', () => shootPair());
  $('tEmote').addEventListener('pointerdown', () => emoteBar());
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
    let g = MM.floorAt(G.dimId, x, z, y);   // the ground, or a house's floors and stairs
    const props = MM.propsNear(G.dimId, x, z, 0.5);
    for (const p of props) {
      if (!G.alive[p.id] || MM.PROPS[p.type].arch || MM.PROPS[p.type].noTop) continue;
      const top = p.y + p.h * 0.92;
      if (y >= top - 0.6 && (x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) g = Math.max(g, top);
    }
    return g;
  }
  function pushOut(x, z, y, rad) {
    const props = MM.propsNear(G.dimId, x, z, rad);
    for (const p of props) {
      if (!G.alive[p.id] || MM.PROPS[p.type].arch) continue;
      if (y >= p.y + p.h * 0.92 - 0.6) continue;
      const reach = MM.propReach(p) + rad;
      if (Math.abs(x - p.x) > reach || Math.abs(z - p.z) > reach) continue;
      [x, z] = MM.pushOutOfProp(p, x, z, rad);
    }
    return [x, z];
  }

  function updateMe(dt) {
    const me = G.me, y = G.you;
    // On a ride: the ride carries you (the server does the same), you just look around.
    const rideMe = G.riders && G.riders.get(G.myId);
    if (rideMe && rideMe.R && y && !y.dead) {
      const q = MM.rideAt(rideMe.R, serverNow() - rideMe.t0, rideMe.seat);
      me.x = q.x; me.y = q.y; me.z = q.z; me.vx = me.vy = me.vz = 0; me.yaw = q.yaw; me.anim = MM.ANIM.ride; me.grounded = true;
      if (G.meAv) {
        G.meAv.root.position.set(me.x, me.y, me.z); G.meAv.root.rotation.order = 'YXZ'; G.meAv.root.rotation.set(q.pitch * 0.8, me.yaw, 0);
        G.meAv.animate(dt, { speed: 0, anim: me.anim, fx: y.fx, armsUp: q.pitch > 0.25 });
        G.meAv.body.visible = !firstPerson();
      }
      tickHouseFx();
      return;
    }
    if (me.sit) {
      const moving = keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') || keys.has('Space') || Math.hypot(touch.mx, touch.mz) > 0.2;
      if (moving || !y || y.dead) me.sit = null;
      else {
        me.x = me.sit.x; me.z = me.sit.z; me.y = me.sit.y; me.yaw = me.sit.yaw; me.vx = me.vy = me.vz = 0; me.anim = MM.ANIM.sit;
        if (G.meAv) { G.meAv.root.position.set(me.x, me.y, me.z); G.meAv.root.rotation.y = me.yaw; G.meAv.animate(dt, { speed: 0, anim: me.anim, fx: y.fx }); }
        return;
      }
    }
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
    const steer = Math.max(-1, Math.min(1, ix)), throttle = Math.max(-1, Math.min(1, iz));   // a car: throttle and steering on their own, not one direction
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    if (dead) { ix = iz = 0; }
    const fxb = y ? y.fx : 0;
    const st = G.st || MM.statsOf(profile.arch, {});
    const inShip = !!(y && y.ship && st.ship), inCar = !!(y && y.car);
    // Same speed rules as the server (Host.speedOf), so you never get snapped back.
    const mult = (fxb & 2 ? 1.8 : 1) * (fxb & 8 ? 0.75 : 1) * (fxb & 16 ? 0.6 : 1) * (fxb & 256 ? 0.5 : 1) * (fxb & 1024 ? 0.12 : 1);
    const shift = !chatOpen() && !UI.modalOpen() && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    me.sprinting = !inShip && !inCar && !dead && il > 0.3 && (shift || touch.sprint) && iz > -0.2;
    me.boosting = (inShip || inCar) && !dead && (shift || touch.sprint);   // Shift in the ship: afterburner; in a car: nitro
    const speed = inShip ? st.ship.speed * mult * (me.boosting ? MM.SHIP_BOOST : 1) : st.speed * mult * (st.fly && !me.grounded ? 1.3 : 1) * (me.sprinting ? st.sprint || 1.3 : 1);
    const sy = Math.sin(G.camYaw), cy = Math.cos(G.camYaw);
    const wx = (sy * iz - cy * ix) * speed, wz = (cy * iz + sy * ix) * speed;
    const accel = me.kbT > 0 ? 2 : inShip ? 5 : me.grounded ? 40 : 10;
    const k = Math.min(1, accel * dt);
    if (inCar) {
      // A car: W/S is the throttle along the car's nose, A/D steer (harder the faster you go).
      const top = MM.CAR.speed * mult * (me.boosting ? MM.CAR.boost : 1);
      const want = dead ? 0 : throttle > 0.1 ? top * throttle : throttle < -0.1 ? MM.CAR.rev * throttle : 0, cur = me.carSpeed || 0;
      const acc = !me.grounded ? 1 : want === 0 ? 7 : want * cur < 0 ? 28 : 13;
      me.carSpeed = cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), acc * dt);
      if (me.carYaw === undefined) me.carYaw = me.yaw;
      me.carYaw -= (dead ? 0 : steer) * 2.1 * Math.max(-1, Math.min(1, me.carSpeed / 7)) * (me.grounded ? 1 : 0.3) * dt;
      if (me.kbT > 0) { me.vx += (Math.sin(me.carYaw) * me.carSpeed - me.vx) * k; me.vz += (Math.cos(me.carYaw) * me.carSpeed - me.vz) * k; }
      else { me.vx = Math.sin(me.carYaw) * me.carSpeed; me.vz = Math.cos(me.carYaw) * me.carSpeed; }
      if (me.boosting && Math.abs(me.carSpeed) > 4 && Math.random() < 0.5) fx.glow.emit(me.x - Math.sin(me.carYaw) * 2.2, me.y + 1.0, me.z - Math.cos(me.carYaw) * 2.2, 0, 1, 0, '#ff8a2a', 0.5, 0.35, 0);
    } else { me.vx += (wx - me.vx) * k; me.vz += (wz - me.vz) * k; }
    me.kbT = Math.max(0, me.kbT - dt);
    const jumpHeld = !chatOpen() && !UI.modalOpen() && (keys.has('Space') || touch.jump) && !dead;
    const ctrl = !chatOpen() && !UI.modalOpen() && (keys.has('ControlLeft') || keys.has('ControlRight'));
    const downHeld = !chatOpen() && !UI.modalOpen() && (ctrl || touch.down);
    me.flying = false;
    if (inShip) {
      // Ship: fly where you look. Space climbs, Ctrl dives, Shift boosts.
      const climb = (jumpHeld ? 1 : 0) - (downHeld ? 1 : 0) + (iz > 0 ? -Math.sin(G.camPitch) * iz * 0.8 : 0);
      me.vy += (climb * 12 - me.vy) * Math.min(1, dt * 4);
      me.grounded = false;
    } else if (jumpHeld && me.grounded && !inCar) {
      me.vy = st.jump * (dim.quirk === 'bouncy' ? 1.6 : 1);
      me.grounded = false;
      me.jumpLock = 0.25;
      C.sfx('jump', 0.4);
    } else if (st.fly && !inCar && jumpHeld && !me.grounded && (me.jumpLock -= dt) <= 0 && me.fly > 0) {
      me.vy += (7 - me.vy) * Math.min(1, dt * 5);
      me.fly = Math.max(0, me.fly - dt);
      me.flying = true;
      if (st.fly === 'jet' && Math.random() < 0.5) fx.glow.emit(me.x, me.y + 0.5, me.z, 0, -4, 0, '#ffb03a', 0.4, 0.3, 0);
    }
    if (me.grounded) me.fly = Math.min(st.flyTime || 6, me.fly + dt * 1.5);
    // World rules: swim up underwater; in the dream, now and then you remember you can fly.
    let quirkGrav = 1;
    const seaSwim = !inShip && MM.inSea(G.dimId, me.x, me.z) && me.y < MM.SEA_LEVEL + 0.3;   // swimming off the beach
    if (!inShip && (dim.quirk === 'swim' || seaSwim)) { quirkGrav = 0.35; if (jumpHeld && !me.grounded && (me.jumpLock -= dt) <= 0) { me.vy += (5 - me.vy) * Math.min(1, dt * 4); me.flying = true; } }
    if (!inShip && dim.quirk === 'dreamy') {
      if (now() > (G.lucidNext || 0)) { G.lucidNext = now() + 18 + Math.random() * 20; G.lucidUntil = now() + 6; UI.toast('A lucid moment: you remember you can fly! (hold Jump)', 2500); }
      if (now() < (G.lucidUntil || 0) && jumpHeld && !me.grounded) { me.vy += (6 - me.vy) * Math.min(1, dt * 5); me.flying = true; }
    }
    // Reduced gravity when flying or in ship at high altitude
    let gravityMult = quirkGrav;
    if (me.flying) {
      gravityMult = 0.2 * quirkGrav; // Personal jetpack/wings
    } else if (inShip && me.y > 50) {
      // Reduce gravity for ships at high altitude (simulating space)
      gravityMult = Math.max(0.1, 1.0 - (me.y - 50) * 0.015); // Gradually reduce gravity above 50 units
    }
    if (!inShip) me.vy -= dim.gravity * dt * gravityMult;
    let nx = me.x + me.vx * dt, nz = me.z + me.vz * dt, ny = me.y + me.vy * dt;
    const wantX = nx, wantZ = nz;
    [nx, nz] = pushOut(nx, nz, ny, inShip ? 1.6 : inCar ? 1.3 : 0.45);
    const lim = MM.boundOf(G.dimId) - (MM.DIM_BY_ID[G.dimId].interior ? 0 : 1), limZ = MM.boundZOf(G.dimId) - (MM.DIM_BY_ID[G.dimId].interior ? 0 : 1);
    nx = Math.max(-lim, Math.min(lim, nx)); nz = Math.max(-limZ, Math.min(limZ, nz));
    [nx, nz] = MM.collideWalls(G.dimId, nx, nz, 0.4, me.y);
    const g = groundAt(nx, nz, Math.max(ny, me.y)) + (inShip ? 0.4 : 0);
    if (inShip) { if (ny < g) { ny = g; me.vy = Math.max(0, me.vy); }
      // Increased height limit for space travel - much higher for interplanetary travel
      const maxShipHeight = 1000; // Increased from 100 to 1000 for space travel
      ny = Math.min(ny, MM.heightAt(G.dimId, nx, nz) + maxShipHeight);
      if (dim.planets) {
        // Space: fly between the planets; touch one to land on it (you can't fly through it).
        ny = Math.min(ny, 1150);
        for (const P of dim.planets) {
          if (P.body) {
            // Anatomy Park's corpse: fly into a hole to go in; everywhere else it is solid.
            const B = MM.BODY, c = Math.cos(B.yaw), sn = Math.sin(B.yaw), wx = nx - P.x, wy = ny + 1 - P.y, wz = nz - P.z;
            const lx = wx * c - wz * sn, lz = wx * sn + wz * c;
            let near = false;
            B.holes.forEach((H, i) => {
              const d = Math.hypot(lx - H[2][0], wy - H[2][1], lz - H[2][2]);
              if (d < 12) near = true;
              if (d < 6 && now() > (G.orbitT || 0)) { G.orbitT = now() + 2.5; send({ t: 'land', d: 'anatomy', h: i }); }
            });
            if (!near) for (const [px, py, pz, pr] of B.parts) {
              const ddx = lx - px, ddy = wy - py, ddz = lz - pz, d = Math.hypot(ddx, ddy, ddz), R = pr + 3;
              if (d < R && d > 0.01) {
                const k = (R - d) / d, ox = ddx * k, oz = ddz * k;
                nx += ox * c + oz * sn; nz += -ox * sn + oz * c; ny += ddy * k;
              }
            }
            continue;
          }
          const dx = nx - P.x, dy = ny + 1 - P.y, dz = nz - P.z, d = Math.hypot(dx, dy, dz), R = P.r + 4;
          if (d < R + 6 && now() > (G.orbitT || 0)) { G.orbitT = now() + 2.5; send({ t: 'land', d: P.dim }); }
          if (d < R) { nx = P.x + dx / d * R; ny = P.y - 1 + dy / d * R; nz = P.z + dz / d * R; }
        }
      } else if (!dim.interior) {
        // Up out of the atmosphere: into space.
        const alt = ny - MM.heightAt(G.dimId, nx, nz);
        if (alt > MM.ORBIT_ALT - 70 && !G.orbitWarned) { G.orbitWarned = true; UI.toast('Leaving the atmosphere… keep climbing for space.', 2500); }
        if (alt > MM.ORBIT_ALT && now() > (G.orbitT || 0)) { G.orbitT = now() + 3; send({ t: 'orbit' }); }
        if (alt < MM.ORBIT_ALT - 120) G.orbitWarned = false;
      }
    }
    else if (ny <= g) {
      if (!me.grounded && me.vy < -14) fx.puff(nx, g, nz, '#ddd', 6, 1, 1, 0.5);
      if (!me.grounded && me.vy < -24 && !inShip) C.ragdoll(G.meAv, me.vx || Math.sin(me.yaw), me.vz || Math.cos(me.yaw), Math.min(0.8, -me.vy / 50));   // a hard landing: stumble over
      ny = g; me.vy = 0; me.grounded = true;
      // A jump pad: up you go.
      const pad = !inShip && MM.padAt(G.dimId, nx, nz);
      if (pad) { me.vy = pad[2]; me.grounded = false; me.kbT = 0.4; fx.burst(nx, ny + 0.3, nz, '#7affea', 20, 7, 0.5, 0.5, 2); C.sfx('jump', 0.8); }
    } else if (ny > g + 0.15) me.grounded = false;
    else if (me.grounded && me.vy <= 0) ny = g;
    // A car that hits something solid loses most of its speed (and you feel it).
    if (inCar && Math.abs(me.carSpeed) > 6 && Math.hypot(nx - wantX, nz - wantZ) > Math.abs(me.carSpeed) * dt * 0.5) { G.shake = Math.max(G.shake || 0, Math.min(0.6, Math.abs(me.carSpeed) / 40)); me.carSpeed *= 0.35; C.sfx('hit', 0.6); }
    me.x = nx; me.y = ny; me.z = nz;
    if (G.pairs.size > 1) pairTransit(me);
    // Face where you move, or where you aim right after shooting.
    me.aimT = Math.max(0, me.aimT - dt);
    me.emoteT = Math.max(0, me.emoteT - dt);
    const hs = Math.hypot(me.vx, me.vz);
    if (inCar) me.yaw = me.carYaw;   // the car faces its nose; the hood guns aim on their own
    else if (firstPerson() || me.aimT > 0 || mouseDown || touch.fire) me.yaw = G.camYaw;
    else if (hs > 0.5) me.yaw += wrap(Math.atan2(me.vx, me.vz) - me.yaw) * Math.min(1, dt * 12);
    me.anim = dead ? MM.ANIM.dead : inCar ? MM.ANIM.sit : inShip ? MM.ANIM.idle : me.flying ? MM.ANIM.fly : !me.grounded ? MM.ANIM.air : me.emoteT > 0 ? MM.ANIM.emote : hs > 0.6 ? MM.ANIM.run : MM.ANIM.idle;
    if (G.meAv) {
      G.meAv.root.position.set(me.x, me.y, me.z);
      G.meAv.root.rotation.y = me.yaw;
      G.meAv.root.rotation.x = 0;
      G.meAv.animate(dt, { speed: me.grounded ? hs : 0, anim: me.anim, fx: fxb, ek: me.emoteKind || 0 });
      if (!firstPerson()) ongoingFx(me, fxb, me.grounded ? hs : 0, dt);
      G.meAv.body.visible = !firstPerson() || dead;
      vm.bob += (me.grounded && !inShip ? hs : 0) * dt * 1.6; vm.speed = me.grounded && !inShip ? Math.min(1, hs / 5) : 0;
    }
    // Sprinting: dust at your heels and a slightly wider view.
    if (me.sprinting && me.grounded && hs > 3 && Math.random() < dt * 14) fx.puff(me.x - me.vx * 0.05, me.y + 0.1, me.z - me.vz * 0.05, '#e8e2d4', 1, 0.5, 0.6, 0.4);
    const fovT = G.baseFov + (me.sprinting && hs > 3 ? 6 : 0);
    if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
    tickHouseFx();
    // Climbing towards space, the sky darkens and you see further.
    if (G.atmo && !dim.interior && !dim.planets) {
      const k = Math.max(0, Math.min(1, (me.y - MM.heightAt(G.dimId, me.x, me.z) - 70) / (MM.ORBIT_ALT - 70)));
      if (Math.abs(k - G.atmo.k) > 0.01) {
        G.atmo.k = k;
        const black = SPACE_BLACK, skyU = G.world.group.children[0].material.uniforms;
        scene.fog.color.copy(G.atmo.fog).lerp(black, k); renderer.setClearColor(scene.fog.color);
        scene.fog.far = G.atmo.far + (1400 - G.atmo.far) * k;
        skyU.top.value.copy(G.atmo.top).lerp(black, k); skyU.bot.value.copy(G.atmo.bot).lerp(black, k * 0.85);
      }
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
        if (n) { $('prompt').append(b, ' Talk to ' + n.name); tLabel('tTalk', 'TALK'); }
        else if (l) {
          const dest = l.door ? MM.DIM_BY_ID[l.door.dim].name : '';
          $('prompt').append(b, ' ' + (l.door ? (dest === l.name ? 'Enter ' + dest : l.name + ' → ' + dest) : l.name));
          tLabel('tTalk', l.door && !tasksAt(l).length ? 'GO' : 'USE');
        }
        else if (nk) { $('prompt').append(b, ' ' + MM.kioskOf(G.dimId).name + ': travel to another dimension'); tLabel('tTalk', 'TRAVEL'); }
        updateHotbar();
      }
    }
    // Cooldown shading on the ability slot.
    if (slots.ab && G.abReadyAt !== undefined) {
      const left = Math.max(0, G.abReadyAt - now());
      const pc = (Math.min(1, left / A.ability.cd) * 100).toFixed(1);
      slots.ab.querySelector('.cd').style.setProperty('--p', pc);
      slots.ab.querySelector('.n').textContent = left > 0 ? Math.ceil(left) : '';
      const tc = $('tAb').querySelector('.cd'); if (tc) tc.style.setProperty('--p', pc);
      $('tAb').querySelector('.n').textContent = left > 0 ? Math.ceil(left) : '';
      $('tAb').classList.toggle('ready', left <= 0);
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
  // The split timeline stutters: now and then the world skips, with a flash of static.
  function timeGlitch(dt) {
    if (!MM.DIM_BY_ID[G.dimId].glitch || G.mode !== 'play') return;
    G.glitchT = (G.glitchT || 4) - dt;
    if (G.glitchT > 0) return;
    G.glitchT = 3 + Math.random() * 6;
    screenFlash(Math.random() < 0.5 ? '#8fd8ff' : '#c8c8d8', 0.35, 260);
    G.shake = Math.max(G.shake || 0, 0.25);
    if (Math.random() < 0.3) UI.toast(pick(['The timeline skips.', 'You remember this moment. Twice.', 'Static, then nothing.', 'Somewhere, a Time Cop sighs.']), 1800);
  }
  function updateOthers(dt) {
    timeGlitch(dt);
    const rt = now() - (G.offset || 0) - INTERP;
    const fogFar = MM.DIM_BY_ID[G.dimId].fogFar;
    for (const p of G.players.values()) {
      const s = sample(p.snaps, rt, tmp);
      if (!s) { p.av.root.visible = false; continue; }
      p.x = tmp.x; p.y = tmp.y; p.z = tmp.z; p.r = tmp.r;
      const sp = Math.hypot(p.x - p.px, p.z - p.pz) / Math.max(dt, 1e-3);
      p.speed += (sp - p.speed) * Math.min(1, dt * 10);
      p.px = p.x; p.pz = p.z;
      const mate = G.team.has(p.id);
      if (s.hp !== p.hp || !!(s.fx & 4096) !== p.tag.fight || mate !== p.tag.mate) { p.hp = s.hp; p.tag.draw(p.hp, !!(s.fx & 4096), mate); }
      p.emoteT = Math.max(0, p.emoteT - dt);
      const d = Math.hypot(p.x - G.me.x, p.z - G.me.z);
      p.av.root.visible = d < fogFar + 10;
      if (!p.av.root.visible) continue;
      p.av.root.position.set(p.x, p.y, p.z);
      p.av.root.rotation.y = p.r;
      const inShip = !!(s.fx & 512);
      if (inShip !== !!p.av.inShip) { C.setShip(p.av, inShip, p.info.gear); collectOutlines(p.av); }
      const inCar = !!(s.fx & 8192);
      if (inCar !== !!p.av.inCar) { C.setCar(p.av, inCar); collectOutlines(p.av); }
      const rider = G.riders && G.riders.get(p.id);
      let anim = s.a === MM.ANIM.dead ? s.a : p.emoteT > 0 ? MM.ANIM.emote : s.a, up = false;
      if (rider && rider.R) {
        const q = MM.rideAt(rider.R, serverNow() - rider.t0, rider.seat);
        p.x = q.x; p.y = q.y; p.z = q.z; p.av.root.position.set(q.x, q.y, q.z); p.av.root.rotation.order = 'YXZ'; p.av.root.rotation.set(q.pitch * 0.8, q.yaw, 0);
        anim = MM.ANIM.ride; up = q.pitch > 0.25;
      }
      p.av.animate(dt, { speed: s.a === MM.ANIM.run ? Math.max(p.speed, 3) : p.speed * 0.3, anim, fx: s.fx, ek: p.emoteKind || 0, armsUp: up });
      if (d < 40) ongoingFx(p, s.fx, p.speed, dt);
      wantDetail(p.av, p.x, p.z);
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
      // Locals far away (Earth has dozens) are lost in the haze: not drawn, not animated.
      const nd = Math.hypot(n.x - G.me.x, n.z - G.me.z), big = MM.NPCS[n.type].h > 4;
      root.visible = nd < (big ? fogFar : settings.quality === 'low' ? 70 : 110);
      if (!root.visible) continue;
      if (n.m.av) { n.m.av.animate(dt, { speed: n.speed, anim: n.m.av.inCar ? MM.ANIM.sit : (n.flags & 4) ? MM.ANIM.emote : n.speed > 0.4 ? 1 : 0 }); wantDetail(n.m.av, n.x, n.z); }
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
    for (const q of G.pairs.values()) {
      q.mesh.userData.tick(dt);
      const op = Math.min(1, (t - q.born) * 4);
      q.mesh.material.uniforms.open.value = op;
      if (Math.random() < 0.15) fx.glow.emit(q.P.x + (Math.random() - 0.5) * 1.4, q.P.y + (Math.random() - 0.5) * 1.8, q.P.z + (Math.random() - 0.5) * 1.4, q.P.nx, q.P.ny, q.P.nz, q.col, 0.25, 0.4, 0);
    }
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
  function nearCam(x, z) { return (x - camWorld.x) ** 2 + (z - camWorld.z) ** 2 < (settings.quality === 'low' ? 14 * 14 : 20 * 20); }
  // Only the closest few characters get the detailed model; a crowd costs no more than a few.
  const detailQ = [];
  function wantDetail(av, x, z) { detailQ.push([(x - camWorld.x) ** 2 + (z - camWorld.z) ** 2, av]); }
  function flushDetail() {
    detailQ.sort((a, b) => a[0] - b[0]);
    const cap = settings.quality === 'low' ? 4 : 8, r2 = settings.quality === 'low' ? 14 * 14 : 20 * 20;
    detailQ.forEach(([d2, av], i) => av.setDetail(i < cap && d2 < r2));
    detailQ.length = 0;
  }

  // ---------- Camera ----------
  function firstPerson() { return settings.view === 'first' || !!(vr && vr.on); }
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
    if (vr && vr.on) { vm.root.visible = false; return false; }   // in VR the gun is in your hand
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
    if (C.debugCam) { const d = C.debugCam; camera.position.set(d.x, d.y, d.z); camera.lookAt(d.tx, d.ty, d.tz); return; }   // screenshots and tests
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
    const dist = G.camDist * (0.7 + 0.3 * sc) * (MM.DIM_BY_ID[G.dimId].room ? 0.7 : 1) * (G.you && G.you.car ? 1.45 : 1);
    const rx = -Math.cos(G.camYaw), rz = Math.sin(G.camYaw);
    const sh = 0.55;
    // Pull the camera in when a prop is between it and the player.
    let d = dist;
    if ((G.camPropT -= dt) <= 0) {
      G.camPropT = 0.3;
      G.camProps = MM.propsNear(G.dimId, tx, tz, dist + 2).filter(p => (p.x - tx) ** 2 + (p.z - tz) ** 2 < (MM.propReach(p) + dist + 2) ** 2);
    }
    for (let s = 0.8; s <= dist; s += 0.4) {
      const px = tx - fx_ * s + rx * sh * s / dist, py = ty - fy * s, pz = tz - fz * s + rz * sh * s / dist;
      let hit = false;
      if (MM.DIM_BY_ID[G.dimId].walls) { const [wx, wz] = MM.collideWalls(G.dimId, px, pz, 0.15, me.y); if (wx !== px || wz !== pz) hit = true; }
      if (!hit) for (const p of G.camProps || []) {
        if (!G.alive[p.id] || py > p.y + p.h || py < p.y - 1) continue;
        const [qx, qz] = MM.pushOutOfProp(p, px, pz, 0.3);
        if (qx !== px || qz !== pz) { hit = true; break; }
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
      cx = Math.max(-hx, Math.min(hx, cx)); cz = Math.max(-hz, Math.min(hz, cz));
      // A house with an upstairs: the camera stays on your floor (on the stairs it may rise
      // with you). The upstairs is always there: from below the ceiling hides it, and up the
      // stairwell you see it.
      const Fl = MM.DIM_BY_ID[G.dimId].floors, up = Fl && MM.levelAt(G.dimId, me.y) === 1;
      const S = Fl && Fl.stair, onStair = S && me.x > S.x0 - 0.3 && me.x < S.x1 + 0.3 && me.z > S.z0 - 0.3 && me.z < S.z1 + 0.3;
      if (up) cy = Math.max(Fl.y + 0.4, Math.min(Fl.y + room.h - 0.5, cy));
      else if (!onStair) cy = Math.min(Fl ? Fl.y - 0.3 : room.h - 0.5, cy);
      if (G.upperFor !== G.world) { G.upperFor = G.world; G.upperRoom = G.world && G.world.group.getObjectByName('roomUpper'); if (G.upperRoom) G.upperRoom.visible = true; }
    }
    if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake; cy += (Math.random() - 0.5) * G.shake; cz += (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.5); }
    camera.position.set(cx, cy, cz);
    camera.lookAt(cx + fx_, cy + fy, cz + fz);
  }

  // ---------- Main loop ----------
  const clock = new T.Clock();
  const proj = new T.Vector3();
  let menuInited = false;
  // One bad frame must never freeze the game: report the error once and keep going.
  const seenErr = new Set();
  function frame() {
    try { frameBody(); }
    catch (err) {
      const key = String(err && err.message);
      if (!seenErr.has(key)) { seenErr.add(key); console.error('Frame error (the game keeps running):', err); }
      try { renderer.render(scene, camera); } catch (e2) { /* nothing more to do this frame */ }
    }
  }
  function frameBody() {
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
    if (vr.on) vr.update(dt);
    for (let left = raw; left > 1e-4; left -= 0.05) updateMe(Math.min(0.05, left));
    updateOthers(dt);
    flushDetail();
    if (!vr.on) updateCamera(dt);
    updateRace();
    camera.getWorldPosition(camWorld);
    G.world.update(dt, clock.elapsedTime, camWorld);
    if (G.life) G.life.update(dt, camWorld);
    if (G.rides) G.rides.update(serverNow());
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

  // ---------- Virtual reality ----------
  vr = C.createVR({
    renderer, scene, camera, G, touch,
    look: () => profile.look, arch: () => profile.arch,
    onSupported: ok => { $('bVR').hidden = !ok; },
    onEnter: () => { G.camPitch = 0; },
    onExit: () => { G.camPitch = 0.15; },
    interact: vrInteract,
    ability, ship: toggleShip,
    gadget: useGadget,
    respawn: () => { if (G.you && G.you.dead && now() >= G.rsAt) send({ t: 'rs' }); },
    portal: vrPortal,
  });
  C.vr = vr;
  // Screen messages go to the wrist panel while you are in VR.
  const flatToast = UI.toast;
  UI.toast = (text, ms) => { flatToast(text, ms); if (vr.on) vr.say(text); };
  $('bVR').onclick = () => vr.enter().catch(e => UI.toast('Could not start VR: ' + (e && e.message || e), 4000));
  // In VR there are no menus to click, so the controllers do things directly.
  function vrInteract() {
    if (!canAct()) return;
    const n = nearestLocal();
    if (n) { send({ t: 'talk', n: n.id }); return; }
    const l = nearLandmark();
    if (l) {
      const ready = tasksAt(l).filter(t => !(G.prog && G.prog.tasks[t]));
      if (ready.length) send({ t: 'use', l: l.id, task: ready[0] });
      else if (l.door) send({ t: 'door', l: l.id });
      else vr.say(tasksAt(l).length ? 'Nothing ready here yet. Come back later.' : 'This place is not part of your daily life.');
      return;
    }
    if (nearKiosk()) vrPortal(MM.WORLD_IDS[vr.pick % MM.WORLD_IDS.length]);
  }
  function vrPortal(id) {
    if (!canAct() || id === G.dimId) return;
    const m = travelModes()[0];
    if (!m) { vr.say(G.you.chMax ? 'Portal gun is recharging.' : 'No portal gun. Find a station, a ship, or someone else\'s portal.'); return; }
    const w = MM.travelWhy(m === 'gun' ? 'portal' : m, G.dimId, id, travelOpts(m));
    if (w) { vr.say(w); return; }
    if (m === 'ship') { vr.say('Fly straight up into space first, then lightspeed.'); return; }
    send(m === 'station' ? { t: 'ki', d: id } : m === 'light' ? { t: 'ls', d: id } : { t: 'po', d: id });
    if (m === 'gun') vr.say('Portal open to ' + MM.DIM_BY_ID[id].name + '. Walk through it!');
  }
  renderer.setAnimationLoop(frame);
  // Phones sometimes drop the graphics context under memory pressure. Ask for it back and
  // rebuild the world when it returns, instead of leaving a dead black screen.
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); UI.toast('Graphics hiccup: rebuilding the world…', 3000); }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    if (!G.world || !G.dimId) return;
    scene.remove(G.world.group); G.world = C.buildDimension(G.dimId, settings.quality); scene.add(G.world.group);
    for (let i = 0; i < G.alive.length; i++) G.world.setAlive(i, G.alive[i]);
  }, false);
})();
