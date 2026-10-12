// Virtual reality (WebXR): play through a headset such as a Meta Quest, in its browser.
//
// You stand where your character stands, at your real height. Your head is the camera,
// the left stick walks where you look, the right stick turns in steps, and the right
// controller holds your gun: aim it and pull the trigger. A panel on your left wrist shows
// your health, materials, where your portal gun is set to and any messages.
//
//   Left stick        walk              Right stick left/right  turn 30°
//   Right trigger     fire              Right grip              talk / use / go through doors
//   A                 jump (hold to fly) B                      ability
//   Left trigger      portal gun (or the kiosk) to the world shown on your wrist
//   X / Y             choose that world  Left grip               board or leave your ship
//   Right stick click grenade
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;
  const P = C.prim;

  C.createVR = function (ctx) {
    const { renderer, scene, camera, G } = ctx;
    const vr = { supported: false, on: false, turn: 0, pick: 0, msg: '', msgT: 0 };
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');

    // The rig stands at your character's feet; the headset moves the camera inside it.
    const rig = new T.Group();
    rig.name = 'vr-rig';
    const hands = [0, 1].map(i => {
      const ray = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const h = { i, ray, grip, side: null, gun: null, panel: null };
      ray.addEventListener('connected', e => { h.side = e.data.handedness; h.source = e.data; dress(h); });
      ray.addEventListener('disconnected', () => { h.side = null; h.source = null; undress(h); });
      rig.add(ray, grip);
      return h;
    });
    const hand = side => hands.find(h => h.side === side);

    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-vr').then(ok => { vr.supported = ok; if (ctx.onSupported) ctx.onSupported(ok); }).catch(() => {});
    }

    vr.enter = async function () {
      if (!vr.supported || vr.on) return;
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      await renderer.xr.setSession(session);
      session.addEventListener('end', exit);
      start();
      try { renderer.xr.setFoveation(1); } catch (_) { }
    };
    // Tests can run the same start-up without a headset.
    vr.simulate = () => start();
    function start() {
      vr.on = true;
      vr.head0 = null;
      scene.add(rig);
      rig.add(camera);
      camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
      vr.turn = G.camYaw + Math.PI;   // face the way you were facing
      if (ctx.onEnter) ctx.onEnter();
    }
    vr.exit = () => { const s = renderer.xr.getSession(); if (s) s.end(); };
    function exit() {
      vr.on = false;
      scene.add(camera);
      scene.remove(rig);
      ctx.touch.mx = ctx.touch.mz = 0; ctx.touch.fire = ctx.touch.jump = false;
      if (ctx.onExit) ctx.onExit();
    }

    // ---------- Hands: your gun on the right, the wrist panel on the left ----------
    function dress(h) {
      undress(h);
      if (h.side === 'right') {
        const look = ctx.look(), arch = ctx.arch();
        const holder = new T.Group();
        const len = 0.58 * look.height, s = 0.8;
        // The view arm points along +z with the hand at z = len; the controller points along -z.
        const arm = C.buildViewArm(look, arch, 0.01);   // thin outlines this close to your eyes
        arm.scale.setScalar(s);
        arm.position.z = -len * s;
        holder.add(arm);
        holder.rotation.y = Math.PI;
        holder.rotation.x = 0.35;   // a natural grip angle
        h.gun = holder;
        h.grip.add(holder);
        // An aiming beam, faint so it helps without spoiling the look.
        const beam = new T.Mesh(new T.CylinderGeometry(0.003, 0.003, 1, 6).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
          new T.MeshBasicMaterial({ color: '#39ff6a', transparent: true, opacity: 0.35, depthWrite: false }));
        beam.scale.z = 6;
        h.beam = beam;
        h.ray.add(beam);
      } else {
        const s = new C.Shape();
        const L = ctx.look();
        s.add(P.sphere, L.skin, [0, 0, 0.02], null, [0.045, 0.035, 0.06]);
        const glove = C.meshOf(s.build(), 0.006);
        h.gun = glove;
        h.grip.add(glove);
        h.panel = makePanel();
        h.panel.mesh.position.set(0.02, 0.06, 0.1);
        h.panel.mesh.rotation.set(-0.9, 0.35, 0);
        h.grip.add(h.panel.mesh);
      }
    }
    function undress(h) {
      for (const k of ['gun', 'beam']) if (h[k]) { h[k].parent && h[k].parent.remove(h[k]); h[k] = null; }
      if (h.panel) { h.panel.mesh.parent && h.panel.mesh.parent.remove(h.panel.mesh); h.panel.tex.dispose(); h.panel = null; }
    }
    vr.redress = () => { for (const h of hands) if (h.side) dress(h); };

    function makePanel() {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300;
      const tex = new T.CanvasTexture(cv);
      const mesh = new T.Mesh(new T.PlaneGeometry(0.17, 0.1), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      return { cv, tex, mesh, t: 0 };
    }
    function drawPanel(p) {
      const g = p.cv.getContext('2d'), y = G.you, W = p.cv.width, H = p.cv.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(11,15,30,0.86)'; roundRect(g, 4, 4, W - 8, H - 8, 28); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#1d1813'; g.stroke();
      g.font = '700 30px Fredoka, system-ui, sans-serif'; g.fillStyle = '#39ff6a'; g.textBaseline = 'top';
      const dim = MM.DIM_BY_ID[G.dimId];
      g.fillText(dim ? dim.name : '', 24, 18);
      if (y) {
        const hp = Math.max(0, y.hp / (y.max || 100));
        g.fillStyle = '#2a3150'; roundRect(g, 24, 62, W - 48, 22, 11); g.fill();
        g.fillStyle = hp > 0.35 ? '#39ff6a' : '#ff5a5a'; roundRect(g, 24, 62, (W - 48) * hp, 22, 11); g.fill();
        g.font = '600 26px Fredoka, system-ui, sans-serif';
        let x = 24;
        for (const k of MM.MAT_IDS) {
          const n = (y.inv && y.inv[k]) || 0;
          g.fillStyle = MM.MATERIALS[k].color; g.fillText(MM.MATERIALS[k].icon + n, x, 100);
          x += 66;
        }
        g.fillStyle = '#dfe6ff';
        const dest = MM.DIM_BY_ID[MM.WORLD_IDS[vr.pick % MM.WORLD_IDS.length]];
        g.fillText('Portal → ' + dest.name, 24, 146);
        g.fillStyle = '#9aa6c8'; g.font = '500 22px Fredoka, system-ui, sans-serif';
        g.fillText(y.dead ? 'You died. Press A to respawn.' : (y.chMax ? 'Charges ' + y.ch + '/' + y.chMax : 'No portal gun: use a kiosk'), 24, 186);
      }
      if (vr.msgT > 0 && vr.msg) {
        g.fillStyle = '#ffd84d'; g.font = '600 22px Fredoka, system-ui, sans-serif';
        wrap(g, vr.msg, 24, 222, W - 48, 26, 2);
      }
      p.tex.needsUpdate = true;
    }
    function roundRect(g, x, y, w, h, r) {
      w = Math.max(w, 2 * r); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function wrap(g, text, x, y, w, lh, max) {
      const words = String(text).split(' '); let line = '', n = 0;
      for (const wd of words) {
        if (g.measureText(line + wd).width > w && line) { g.fillText(line, x, y + n * lh); line = ''; if (++n >= max) return; }
        line += wd + ' ';
      }
      g.fillText(line, x, y + n * lh);
    }
    // Messages that would pop up on screen go to the wrist panel instead.
    vr.say = text => { vr.msg = text; vr.msgT = 5; };

    // ---------- Each frame ----------
    const prevBtn = {}, tmp = new T.Vector3(), tmp2 = new T.Vector3(), q = new T.Quaternion();
    const pressed = (key, now) => { const was = prevBtn[key]; prevBtn[key] = now; return now && !was; };
    vr.update = function (dt) {
      if (!vr.on) return;
      const me = G.me, t = ctx.touch;
      vr.msgT -= dt;
      // Controllers.
      let mx = 0, mz = 0, fire = false, jump = false;
      for (const h of hands) {
        const gp = h.source && h.source.gamepad;
        if (!gp) continue;
        const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
        const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
        if (h.side === 'left') {
          if (Math.hypot(ax[0], ax[1]) > 0.15) { mx = ax[0]; mz = -ax[1]; }
          if (pressed('lt', b(0))) ctx.portal(MM.WORLD_IDS[vr.pick % MM.WORLD_IDS.length]);
          if (pressed('lg', b(1))) ctx.ship();
          if (pressed('lx', b(4))) { vr.pick = (vr.pick + MM.WORLD_IDS.length - 1) % MM.WORLD_IDS.length; skipHere(-1); }
          if (pressed('ly', b(5))) { vr.pick = (vr.pick + 1) % MM.WORLD_IDS.length; skipHere(1); }
        } else if (h.side === 'right') {
          fire = b(0);
          if (pressed('rg', b(1))) ctx.interact();
          jump = b(4);
          if (pressed('ra', b(4)) && G.you && G.you.dead) ctx.respawn();
          if (pressed('rb', b(5))) ctx.ability();
          if (pressed('rs', b(3))) ctx.gadget('grenade');
          // Snap turn.
          const sx = ax[0];
          if (Math.abs(sx) > 0.7 && !vr.turnHeld) { vr.turn -= Math.sign(sx) * Math.PI / 6; vr.turnHeld = true; }
          else if (Math.abs(sx) < 0.3) vr.turnHeld = false;
        }
      }
      t.mx = mx; t.mz = mz; t.fire = fire; t.jump = jump;

      // Where you look decides where "forward" is.
      camera.getWorldDirection(tmp);
      G.camYaw = Math.atan2(tmp.x, tmp.z);
      G.camPitch = -Math.asin(Math.max(-1, Math.min(1, tmp.y)));
      // Real steps move your character too, then the rig re-centres your head over it.
      const hx = camera.position.x, hz = camera.position.z;
      const c = Math.cos(vr.turn), s = Math.sin(vr.turn);
      const wx = hx * c + hz * s, wz = -hx * s + hz * c;   // head offset rotated into the world
      if (vr.head0 && !(G.you && G.you.dead)) { me.x += wx - vr.head0.x; me.z += wz - vr.head0.z; }
      vr.head0 = { x: wx, z: wz };
      rig.rotation.y = vr.turn;
      rig.position.set(me.x - wx, me.y, me.z - wz);

      // Wrist panel.
      const L = hand('left');
      if (L && L.panel && (L.panel.t -= dt) <= 0) { L.panel.t = 0.25; drawPanel(L.panel); }
    };
    // X/Y skip over the world you are already in.
    function skipHere(dir) { if (MM.WORLD_IDS[vr.pick] === G.dimId) vr.pick = (vr.pick + MM.WORLD_IDS.length + dir) % MM.WORLD_IDS.length; }

    // The aiming ray: from the right controller when there is one, else the head.
    vr.aimRay = function () {
      const h = hand('right');
      if (!vr.on || !h) return null;
      h.ray.getWorldPosition(tmp);
      h.ray.getWorldQuaternion(q);
      tmp2.set(0, 0, -1).applyQuaternion(q);
      return { o: tmp.clone(), d: tmp2.clone() };
    };
    return vr;
  };
})();
