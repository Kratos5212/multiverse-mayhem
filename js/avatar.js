// Characters: builds a cartoon body from a "look" (see MM.LOOK) and animates it.
// Every body part is one merged mesh plus its outline, so a full character is
// about a dozen draw calls.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;
  const P = C.prim;
  const shade = C.shade;

  const WEAPON_COLORS = { plasma: '#5dff8a', blaster: '#ffd84d', toy: '#ff8fd0' };

  // ---------- Heads ----------
  // opts.noBall: only the face and hat (beanlings wear their face on the body).
  function buildHead(s, L, R, species, opts) {
    opts = opts || {};
    const skin = L.skin, hair = L.hairColor, dark = '#1b1b1b';
    const tall = species === 'alien' ? 1.35 : 1.12;
    if (opts.noBall) {
      // nothing: the body is the head
    } else if (species === 'robot') {
      s.add(P.box, skin, [0, 0, 0], null, [R * 1.8, R * 1.9, R * 1.7]);
      s.add(P.cylLo, shade(skin, 0.7), [R * 0.95, 0, 0], [0, 0, Math.PI / 2], [R * 0.18, R * 0.25, R * 0.18]);
      s.add(P.cylLo, shade(skin, 0.7), [-R * 0.95, 0, 0], [0, 0, Math.PI / 2], [R * 0.18, R * 0.25, R * 0.18]);
      for (let i = -1; i <= 1; i++) s.add(P.box, dark, [i * R * 0.25, -R * 0.5, R * 0.86], null, [R * 0.12, R * 0.2, R * 0.04]);
    } else {
      s.add(P.sphere, skin, [0, 0, 0], null, [R, R * tall, R * 0.95]);
      if (species === 'human' || species === 'blob') {
        s.add(P.sphereLo, skin, [R * 0.97, 0, 0], null, [R * 0.13, R * 0.22, R * 0.12]);
        s.add(P.sphereLo, skin, [-R * 0.97, 0, 0], null, [R * 0.13, R * 0.22, R * 0.12]);
      }
      if (species === 'alien') {
        s.add(P.cone, skin, [R * 0.95, R * 0.25, 0], [0, 0, -1.2], [R * 0.12, R * 0.5, R * 0.1]);
        s.add(P.cone, skin, [-R * 0.95, R * 0.25, 0], [0, 0, 1.2], [R * 0.12, R * 0.5, R * 0.1]);
      }
    }
    const fz = opts.faceZ || (species === 'robot' ? R * 0.86 : R * 0.8);
    // Eyes: big white circles with dot pupils.
    const eye = (x, y, r, pupil) => {
      s.add(P.sphere, '#ffffff', [x, y, fz], null, [r, r, r * 0.55]);
      s.add(P.sphereLo, dark, [x + (Math.random() - 0.5) * r * 0.2, y, fz + r * 0.52], null, [pupil, pupil, pupil * 0.5]);
    };
    const ey = R * 0.18 * (species === 'alien' ? 1.4 : 1);
    if (L.eyes === 'cyclops') eye(0, ey, R * 0.42, R * 0.08);
    else if (L.eyes === 'visor') s.add(P.cyl, '#22e6ff', [0, ey, 0], null, [R * 0.99, R * 0.28, R * 0.99], true);
    else {
      const er = L.eyes === 'wide' ? R * 0.36 : R * 0.29;
      const pr = L.eyes === 'wide' ? R * 0.05 : R * 0.065;
      eye(R * 0.33, ey, er, pr); eye(-R * 0.33, ey, er, pr);
      if (L.eyes === 'three') eye(0, ey + R * 0.5, R * 0.2, R * 0.05);
      if (L.eyes === 'sleepy') {
        s.add(P.hemi, skin, [R * 0.33, ey + er * 0.05, fz + 0.005], [0.35, 0, 0], [er * 1.05, er * 1.05, er * 0.62]);
        s.add(P.hemi, skin, [-R * 0.33, ey + er * 0.05, fz + 0.005], [0.35, 0, 0], [er * 1.05, er * 1.05, er * 0.62]);
      }
    }
    // Brows
    const browC = shade(hair, 0.75);
    const by = ey + R * 0.36, bz = fz + R * 0.08;
    if (L.eyes !== 'visor' && species !== 'robot') {
      if (L.brow === 'uni') {
        for (let i = -2; i <= 2; i++) s.add(P.capsule, browC, [i * R * 0.15, by + Math.abs(i) * R * 0.03 - (i === 0 ? R * 0.04 : 0), bz], [0, 0, Math.PI / 2 + i * 0.15], [R * 0.06, R * 0.08, R * 0.06]);
      } else if (L.brow === 'normal' || L.brow === 'angry') {
        const a = L.brow === 'angry' ? 0.45 : -0.1;
        s.add(P.capsule, browC, [R * 0.33, by, bz], [0, 0, Math.PI / 2 + a], [R * 0.055, R * 0.17, R * 0.05]);
        s.add(P.capsule, browC, [-R * 0.33, by, bz], [0, 0, Math.PI / 2 - a], [R * 0.055, R * 0.17, R * 0.05]);
      }
    }
    // Nose and mouth (birdfolk get a beak instead)
    const my = -R * 0.45;
    if (species === 'birdfolk') {
      s.add(P.cone, '#f2a12c', [0, -R * 0.1, R * 1.05], [Math.PI / 2, 0, 0], [R * 0.24, R * 0.7, R * 0.2]);
      s.add(P.cone, '#d27f12', [0, -R * 0.3, R * 0.95], [Math.PI / 2 + 0.25, 0, 0], [R * 0.16, R * 0.4, R * 0.12]);
    } else {
      if (species !== 'robot') s.add(P.capsule, shade(skin, 0.92), [0, -R * 0.08, fz + R * 0.12], [1.2, 0, 0], [R * 0.08, R * 0.12, R * 0.08]);
      if (L.mouth === 'grin') {
        s.add(P.hemi, '#ffffff', [0, my, fz - R * 0.05], [Math.PI, 0, 0], [R * 0.35, R * 0.2, R * 0.2]);
      } else if (L.mouth === 'open') {
        s.add(P.sphereLo, '#3a0d0d', [0, my, fz - R * 0.02], null, [R * 0.2, R * 0.16, R * 0.12]);
      } else if (L.mouth === 'frown') {
        s.add(P.capsule, dark, [R * 0.12, my - R * 0.03, fz], [0, 0, Math.PI / 2 + 0.4], [R * 0.035, R * 0.14, R * 0.03]);
        s.add(P.capsule, dark, [-R * 0.12, my - R * 0.03, fz], [0, 0, Math.PI / 2 - 0.4], [R * 0.035, R * 0.14, R * 0.03]);
      } else {
        s.add(P.capsule, dark, [0, my, fz], [0, 0, Math.PI / 2 + 0.08], [R * 0.035, R * 0.3, R * 0.03]);
        if (L.mouth === 'drool') s.add(P.sphereLo, '#cfe8a0', [R * 0.22, my - R * 0.16, fz + R * 0.02], null, [R * 0.06, R * 0.14, R * 0.05]);
      }
    }
    // Hair
    const top = R * tall;
    const hs = L.hair;
    if (species === 'birdfolk') {
      for (let i = 0; i < 6; i++) s.add(P.cone, hair, [0, top * 0.8, -R * 0.2 - i * R * 0.12], [-0.9 - i * 0.12, 0, 0], [R * 0.16, R * 0.75, R * 0.1]);
    } else if (species === 'robot') {
      s.add(P.cylLo, '#777', [0, R * 1.1, 0], null, [R * 0.04, R * 0.5, R * 0.04]);
      s.add(P.sphereLo, '#ff4040', [0, R * 1.4, 0], null, [R * 0.1, R * 0.1, R * 0.1], true);
    } else if (hs === 'spiky') {
      // Wild spikes fanning out from the back and top.
      const dirs = [[0, 1, -0.3], [0.5, 0.85, -0.4], [-0.5, 0.85, -0.4], [0.8, 0.4, -0.5], [-0.8, 0.4, -0.5], [0.3, 0.5, -0.9], [-0.3, 0.5, -0.9], [0, 0.1, -1], [0.7, 0, -0.75], [-0.7, 0, -0.75], [0.25, 1, 0.25], [-0.25, 1, 0.25]];
      for (const d of dirs) {
        const v = new T.Vector3(d[0], d[1], d[2]).normalize();
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v);
        const e = new T.Euler().setFromQuaternion(q, 'YXZ');
        s.add(P.cone, hair, [v.x * R * 0.95, v.y * top * 0.85, v.z * R * 0.9], [e.x, e.y, e.z], [R * 0.24, R * 0.75, R * 0.24]);
      }
      s.add(P.sphere, hair, [0, R * 0.3, -R * 0.12], null, [R * 0.98, top * 0.85, R * 0.92]);
    } else if (hs === 'tuft') {
      s.add(P.hemi, hair, [0, R * 0.25, -R * 0.05], null, [R * 1.02, top * 0.8, R * 0.98]);
      for (let i = -1; i <= 1; i++) s.add(P.cone, hair, [i * R * 0.18, top * 1.0, R * 0.25], [0.5, 0, i * 0.4], [R * 0.16, R * 0.4, R * 0.16]);
    } else if (hs === 'bowl') {
      s.add(P.hemi, hair, [0, R * 0.1, 0], null, [R * 1.07, top * 0.95, R * 1.04]);
      s.add(P.cyl, hair, [0, R * 0.32, R * 0.25], null, [R * 0.95, R * 0.2, R * 0.8]);
    } else if (hs === 'mohawk') {
      for (let i = 0; i < 6; i++) s.add(P.cone, hair, [0, top * (0.95 - i * 0.03), R * 0.45 - i * R * 0.25], [-0.2 - i * 0.12, 0, 0], [R * 0.13, R * 0.55, R * 0.25]);
    } else if (hs === 'afro') {
      s.add(P.sphere, hair, [0, R * 0.55, -R * 0.15], null, [R * 1.4, R * 1.25, R * 1.3]);
    } else if (hs === 'ponytail') {
      s.add(P.hemi, hair, [0, R * 0.15, -R * 0.03], null, [R * 1.04, top * 0.9, R * 1.0]);
      C.capsuleAt(s, hair, R * 0.18, R * 1.2, [0, R * 0.4, -R * 0.95], [Math.PI - 0.35, 0, 0]);
    } else if (hs === 'slick') {
      s.add(P.hemi, hair, [0, R * 0.2, -R * 0.1], [-0.25, 0, 0], [R * 1.03, top * 0.75, R * 1.0]);
    }
    // Accessories
    const ac = L.accColor;
    if (L.acc === 'goggles') {
      s.add(P.torus, shade(ac, 0.7), [0, R * 0.55, 0], [Math.PI / 2, 0, 0], [R * 1.0, R * 1.0, R * 0.6]);
      s.add(P.cyl, ac, [R * 0.3, R * 0.6, R * 0.82], [Math.PI / 2 - 0.4, 0, 0], [R * 0.22, R * 0.15, R * 0.22]);
      s.add(P.cyl, ac, [-R * 0.3, R * 0.6, R * 0.82], [Math.PI / 2 - 0.4, 0, 0], [R * 0.22, R * 0.15, R * 0.22]);
      s.add(P.cyl, '#8ff4ff', [R * 0.3, R * 0.62, R * 0.9], [Math.PI / 2 - 0.4, 0, 0], [R * 0.17, R * 0.05, R * 0.17], true);
      s.add(P.cyl, '#8ff4ff', [-R * 0.3, R * 0.62, R * 0.9], [Math.PI / 2 - 0.4, 0, 0], [R * 0.17, R * 0.05, R * 0.17], true);
    } else if (L.acc === 'antennae') {
      for (const sx of [-1, 1]) {
        s.add(P.cylLo, ac, [sx * R * 0.35, top + R * 0.3, 0], [0, 0, -sx * 0.3], [R * 0.04, R * 0.8, R * 0.04]);
        s.add(P.sphereLo, ac, [sx * R * 0.48, top + R * 0.7, 0], null, [R * 0.13, R * 0.13, R * 0.13], true);
      }
    } else if (L.acc === 'tophat') {
      s.add(P.cyl, ac, [0, top * 0.95, 0], null, [R * 1.0, R * 0.08, R * 1.0]);
      s.add(P.cyl, ac, [0, top * 0.95 + R * 0.5, 0], null, [R * 0.65, R * 1.0, R * 0.65]);
      s.add(P.cyl, shade(ac, 1.4), [0, top * 0.95 + R * 0.12, 0], null, [R * 0.67, R * 0.16, R * 0.67]);
    } else if (L.acc === 'headband') {
      s.add(P.torus, ac, [0, R * 0.48, 0], [Math.PI / 2, 0, 0], [R * 1.0, R * 1.0, R * 0.5]);
    } else if (L.acc === 'eyepatch') {
      s.add(P.cyl, '#111', [R * 0.33, ey, fz + R * 0.12], [Math.PI / 2, 0, 0], [R * 0.3, R * 0.05, R * 0.3]);
      s.add(P.torus, '#111', [0, ey + R * 0.1, 0], [Math.PI / 2, 0, 0.3], [R * 1.0, R * 1.0, R * 0.25]);
    } else if (L.acc === 'halo') {
      s.add(P.torus, ac, [0, top + R * 0.55, 0], [Math.PI / 2, 0, 0], [R * 0.7, R * 0.7, R * 0.5], true);
    } else if (L.acc === 'crown') {
      s.add(P.cyl, ac, [0, top * 0.95, 0], null, [R * 0.7, R * 0.35, R * 0.7]);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s.add(P.cone, ac, [Math.sin(a) * R * 0.55, top * 0.95 + R * 0.35, Math.cos(a) * R * 0.55], null, [R * 0.15, R * 0.35, R * 0.15]); }
      s.add(P.sphereLo, '#ff3355', [0, top * 0.95, R * 0.7], null, [R * 0.1, R * 0.1, R * 0.06], true);
    } else if (L.acc === 'cap') {
      s.add(P.hemi, ac, [0, R * 0.35, 0], null, [R * 1.05, top * 0.75, R * 1.05]);
      s.add(P.cyl, ac, [0, R * 0.38, R * 0.9], null, [R * 0.55, R * 0.05, R * 0.6]);
    }
    return top;
  }

  // A ray gun held in the right hand, pointing forward.
  function addGun(s, weapon, L, y) {
    const col = weapon === 'plasma' ? L.portalColor : WEAPON_COLORS[weapon] || '#ffd84d';
    s.add(P.box, '#d8dde2', [0, y, 0.18], null, [0.1, 0.12, 0.28]);
    s.add(P.box, '#9aa3ab', [0, y - 0.1, 0.08], [0.3, 0, 0], [0.07, 0.16, 0.08]);
    s.add(P.cyl, col, [0, y + 0.02, 0.22], [Math.PI / 2, 0, 0], [0.05, 0.22, 0.05], true);
    s.add(P.sphereLo, col, [0, y + 0.02, 0.36], null, [0.055, 0.055, 0.055], true);
  }

  // ---------- Full character ----------
  C.buildAvatar = function (look, arch, opts) {
    opts = opts || {};
    const L = MM.sanitizeLook(look);
    const A = MM.ARCHETYPES[arch] || MM.ARCHETYPES.genius;
    let species = L.species;
    const h = L.height, w = L.width, hs = L.head;
    const thick = opts.thick || 0.035;

    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const parts = { root, body };
    const mk = (shape, parent, pos) => {
      const g = C.meshOf(shape.build(), thick);
      const pivot = new T.Group();
      if (pos) pivot.position.set(pos[0], pos[1], pos[2]);
      pivot.add(g);
      parent.add(pivot);
      return pivot;
    };

    const bean = species === 'beanling', blob = species === 'blob';
    const legLen = (bean ? 0.55 : 0.72) * h;
    const legR = (bean ? 0.045 : blob ? 0.15 : 0.1) * w;
    const torsoLen = (blob ? 0.6 : 0.55) * h;
    const torsoR = (blob ? 0.42 : 0.22) * w;
    const armR = (bean ? 0.04 : blob ? 0.12 : 0.065) * w;
    const armLen = 0.58 * h * (blob ? 1.1 : 1);
    const pants = L.pantsColor, shoe = L.shoeColor, skin = L.skin;
    const top = L.top;
    const topC = top === 'none' ? skin : top === 'vest' ? L.shirtColor : (top === 'labcoat' ? L.shirtColor : L.topColor);

    // Legs
    for (const side of [-1, 1]) {
      const s = new C.Shape();
      const legC = bean ? skin : pants;
      C.capsuleAt(s, legC, legR, legLen, [0, -legLen, 0]);
      if (bean) s.add(P.sphereLo, shoe, [0, -legLen + 0.05, 0.05], null, [0.07, 0.05, 0.11]);
      else s.add(P.sphere, shoe, [0, -legLen + 0.06, 0.07], null, [legR * 1.25, 0.08, 0.17]);
      parts[side < 0 ? 'legL' : 'legR'] = mk(s, body, [side * (bean ? 0.12 : 0.11) * w * (blob ? 1.6 : 1), legLen, 0]);
    }

    // Torso
    const ts = new C.Shape();
    let shoulderY, neckY, headR;
    if (bean) {
      // A tall bean: body and head are one shape, the face sits near the top.
      const bh = 1.15 * h;
      C.capsuleAt(ts, skin, 0.33 * w, bh, [0, legLen - 0.15, 0]);
      shoulderY = legLen + bh * 0.48; neckY = legLen + bh * 0.62; headR = 0.33 * w;
      if (top !== 'none') ts.add(P.cyl, topC, [0, legLen + 0.08, 0], null, [0.335 * w, 0.18, 0.335 * w]);
    } else if (blob) {
      ts.add(P.sphere, skin, [0, legLen + torsoLen * 0.5, 0], null, [torsoR, torsoLen * 0.65, torsoR * 0.85]);
      for (let i = 0; i < 6; i++) { const a = i * 1.7; ts.add(P.sphereLo, shade(skin, 0.9 + (i % 3) * 0.08), [Math.sin(a) * torsoR * 0.75, legLen + torsoLen * (0.3 + (i % 3) * 0.25), Math.cos(a) * torsoR * 0.55], null, [torsoR * 0.45, torsoR * 0.4, torsoR * 0.4]); }
      ts.add(P.sphere, pants, [0, legLen + 0.05, 0], null, [torsoR * 0.85, 0.25, torsoR * 0.7]);
      if (top !== 'none') ts.add(P.cyl, L.topColor, [0, legLen + torsoLen * 0.25, 0], null, [torsoR * 0.95, torsoLen * 0.25, torsoR * 0.8]);
      shoulderY = legLen + torsoLen * 0.8; neckY = legLen + torsoLen * 0.95; headR = 0.24 * hs;
    } else {
      ts.add(P.sphere, pants, [0, legLen + 0.02, 0], null, [torsoR * 1.02, 0.16, torsoR * 0.8]);
      C.capsuleAt(ts, topC, torsoR, torsoLen + 0.1, [0, legLen - 0.05, 0], null);
      ts.add(P.cyl, pants, [0, legLen + 0.05, 0], null, [torsoR * 1.03, 0.1, torsoR * 1.03]);
      if (top === 'labcoat') {
        // Coat: over the shoulders, open at the front, tails down to the knees.
        const coat = L.topColor;
        C.capsuleAt(ts, coat, torsoR * 1.08, torsoLen + 0.12, [0, legLen - 0.05, -0.03]);
        ts.add(P.box, L.shirtColor, [0, legLen + torsoLen * 0.5, torsoR * 0.98], null, [torsoR * 0.75, torsoLen * 0.95, 0.04]);
        const tail = new T.CylinderGeometry(torsoR * 1.08, torsoR * 1.35, legLen * 0.65, 14, 1, true, 0.5, Math.PI * 2 - 1.0);
        ts.add(tail, coat, [0, legLen - legLen * 0.3, -0.02]);
        tail.dispose();
        ts.add(P.box, shade(coat, 0.9), [torsoR * 0.42, legLen + torsoLen * 0.72, torsoR * 0.98], [0, 0, -0.3], [0.12, 0.3, 0.05]);
        ts.add(P.box, shade(coat, 0.9), [-torsoR * 0.42, legLen + torsoLen * 0.72, torsoR * 0.98], [0, 0, 0.3], [0.12, 0.3, 0.05]);
      } else if (top === 'polo' || top === 'sweater') {
        ts.add(P.torus, L.shirtColor, [0, legLen + torsoLen + 0.02, 0], [Math.PI / 2, 0, 0], [torsoR * 0.55, torsoR * 0.55, 0.5]);
      } else if (top === 'armor') {
        ts.add(P.sphere, shade(L.topColor, 0.8), [torsoR * 0.95, legLen + torsoLen * 0.92, 0], null, [0.14, 0.11, 0.14]);
        ts.add(P.sphere, shade(L.topColor, 0.8), [-torsoR * 0.95, legLen + torsoLen * 0.92, 0], null, [0.14, 0.11, 0.14]);
        ts.add(P.cyl, '#5a3a20', [0, legLen + 0.12, 0], null, [torsoR * 1.05, 0.07, torsoR * 1.05]);
        ts.add(P.box, '#ffd24a', [0, legLen + 0.12, torsoR], null, [0.1, 0.08, 0.03]);
      } else if (top === 'vest') {
        ts.add(P.box, L.topColor, [torsoR * 0.5, legLen + torsoLen * 0.5, torsoR * 0.8], null, [torsoR * 0.6, torsoLen * 0.85, 0.06]);
        ts.add(P.box, L.topColor, [-torsoR * 0.5, legLen + torsoLen * 0.5, torsoR * 0.8], null, [torsoR * 0.6, torsoLen * 0.85, 0.06]);
        ts.add(P.capsule, L.topColor, [0, legLen + torsoLen * 0.5, -torsoR * 0.35], null, [torsoR * 0.85, torsoLen * 0.42, torsoR * 0.7]);
      }
      shoulderY = legLen + torsoLen - 0.06; neckY = legLen + torsoLen + 0.05; headR = 0.27 * hs;
    }
    if (species === 'robot' && !bean) ts.add(P.cyl, '#22e6ff', [0, legLen + torsoLen * 0.6, torsoR * 0.95], [Math.PI / 2, 0, 0], [0.07, 0.03, 0.07], true);
    parts.torso = mk(ts, body);

    // Arms: sleeves follow the top.
    const sleeveC = top === 'none' ? skin : top === 'labcoat' ? L.topColor : top === 'vest' ? L.shirtColor : L.topColor;
    const sleeveLen = (top === 'tshirt' || top === 'polo' || top === 'vest') ? 0.35 : (top === 'none' || bean) ? 0 : 1;
    for (const side of [-1, 1]) {
      const s = new C.Shape();
      C.capsuleAt(s, skin, armR, armLen, [0, -armLen, 0]);
      if (sleeveLen > 0) C.capsuleAt(s, sleeveC, armR * 1.35, armLen * sleeveLen * 0.92, [0, -armLen * sleeveLen * 0.92, 0]);
      s.add(P.sphere, species === 'robot' ? shade(skin, 0.8) : skin, [0, -armLen - 0.02, 0], null, [armR * 1.5, armR * 1.6, armR * 1.4]);
      if (side > 0 && !MM.WEAPONS[A.weapon].melee) addGun(s, A.weapon, L, -armLen - 0.04);
      if (side > 0 && species === 'birdfolk' && MM.WEAPONS[A.weapon].melee) for (let i = -1; i <= 1; i++) s.add(P.cone, '#e8e2d0', [i * 0.04, -armLen - 0.1, 0.05], [Math.PI - 0.3, 0, 0], [0.025, 0.14, 0.025]);
      const px = side * (torsoR + armR * 1.2) * (bean ? 1.0 : 1);
      parts[side < 0 ? 'armL' : 'armR'] = mk(s, body, [px, shoulderY, 0]);
    }

    // Head
    const hsP = new C.Shape();
    let headTop;
    if (bean) {
      // The face sits on the bean's surface, near the top.
      const R = headR;
      buildHead(hsP, Object.assign({}, L, { hair: 'bald' }), R, 'human', { noBall: true, faceZ: R * 0.93 });
      parts.head = mk(hsP, body, [0, neckY, 0]);
      headTop = R * 1.2;
    } else {
      headTop = buildHead(hsP, L, headR, species);
      parts.head = mk(hsP, body, [0, neckY + headR * 1.0, 0]);
      headTop += headR;
    }

    // Wings for the winged
    if (species === 'birdfolk' || A.fly) {
      for (const side of [-1, 1]) {
        const s = new C.Shape();
        const wc = species === 'birdfolk' ? L.hairColor : '#e9e4d8';
        s.add(P.sphere, wc, [side * 0.45, 0, 0], [0, 0, side * 0.2], [0.5, 0.12, 0.3]);
        for (let i = 0; i < 4; i++) s.add(P.sphereLo, shade(wc, 0.85), [side * (0.55 + i * 0.13), -0.12 - i * 0.04, -0.05], null, [0.12, 0.22, 0.06]);
        parts[side < 0 ? 'wingL' : 'wingR'] = mk(s, body, [side * torsoR * 0.5, shoulderY, -torsoR * 0.7]);
      }
    }

    const shadow = C.blobShadow(0.9 * Math.max(w, 0.8) * (blob ? 1.6 : 1));
    shadow.position.y = 0.03;
    root.add(shadow);

    const av = {
      root, body, parts, look: L, arch, height: (neckY + headTop * 1.0 + headR) , phase: Math.random() * 6, attackT: 0, deadT: 0, t: Math.random() * 10,
      shield: null,
      animate(dt, st) { animate(av, dt, st); },
      dispose() {
        root.traverse(o => { if (o.isMesh && o.geometry && o.geometry !== C.prim.sphere && o.material !== undefined && !o.userData.shared) o.geometry.dispose(); });
        if (av.tag) { av.tag.material.map.dispose(); av.tag.material.dispose(); }
      },
    };
    av.headY = neckY + headR * 2.2 + (L.acc === 'tophat' || L.hair === 'afro' ? headR * 0.9 : 0);
    if (bean) av.headY = neckY + headR * 2;
    return av;
  };

  // ---------- Animation ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  function animate(av, dt, st) {
    const p = av.parts;
    av.t += dt;
    const k = Math.min(1, (st.speed || 0) / 5);
    av.phase += (st.speed || 0) * dt * 1.7;
    const sw = Math.sin(av.phase);
    const anim = st.anim || 0;
    const dead = anim === MM.ANIM.dead;
    const air = anim === MM.ANIM.air, fly = anim === MM.ANIM.fly, emote = anim === MM.ANIM.emote;
    const f = Math.min(1, dt * 12);
    let lL = sw * 0.9 * k, lR = -sw * 0.9 * k, aL = -sw * 0.7 * k, aR = sw * 0.7 * k, aLz = 0.08, aRz = -0.08, tilt = k * 0.12, bob = Math.abs(sw) * 0.06 * k;
    if (air) { lL = -0.7; lR = 0.35; aL = -0.4; aR = -0.4; aLz = 0.9; aRz = -0.9; bob = 0; }
    if (fly) { lL = 0.3; lR = 0.4; aL = 0.2; aR = 0.2; tilt = 0.5; bob = 0; }
    if (emote) { aRz = -2.7 + Math.sin(av.t * 12) * 0.35; aR = 0; }
    if (!air && !fly && k < 0.05) { aLz = 0.08 + Math.sin(av.t * 2) * 0.03; aRz = -aLz; bob = Math.sin(av.t * 2) * 0.012; }
    if (av.attackT > 0) {
      av.attackT -= dt;
      const melee = MM.WEAPONS[MM.ARCHETYPES[av.arch].weapon].melee;
      aR = melee ? lerp(-2.4, 0.6, 1 - av.attackT / 0.3) : -1.5;
    }
    p.legL.rotation.x = lerp(p.legL.rotation.x, lL, f);
    p.legR.rotation.x = lerp(p.legR.rotation.x, lR, f);
    p.armL.rotation.x = lerp(p.armL.rotation.x, aL, f);
    p.armR.rotation.x = av.attackT > 0 ? aR : lerp(p.armR.rotation.x, aR, f);
    p.armL.rotation.z = lerp(p.armL.rotation.z, aLz, f);
    p.armR.rotation.z = lerp(p.armR.rotation.z, aRz, f);
    if (p.wingL) {
      const flap = fly ? Math.sin(av.t * 14) * 0.8 : air ? Math.sin(av.t * 8) * 0.4 : Math.sin(av.t * 1.5) * 0.08;
      p.wingL.rotation.z = -0.2 + flap; p.wingR.rotation.z = 0.2 - flap;
      p.wingL.rotation.y = fly ? 0 : 0.6; p.wingR.rotation.y = fly ? 0 : -0.6;
    }
    p.head.rotation.y = emote ? Math.sin(av.t * 6) * 0.3 : 0;
    if (dead) av.deadT = Math.min(1, av.deadT + dt * 3); else av.deadT = Math.max(0, av.deadT - dt * 4);
    av.body.rotation.x = lerp(av.body.rotation.x, tilt, f) * (1 - av.deadT) - av.deadT * 1.45;
    av.body.position.y = lerp(av.body.position.y, bob, f) * (1 - av.deadT) + av.deadT * 0.25;
    av.body.position.z = -av.deadT * 0.6;
    // Effects
    const fx = st.fx || 0;
    const sc = (fx & 8) ? 0.5 : 1;
    av.root.scale.setScalar(lerp(av.root.scale.x, sc, Math.min(1, dt * 6)));
    av.root.visible = !(fx & 32) || Math.floor(av.t * 8) % 2 === 0 || dead;
    if (fx & 1) {
      if (!av.shield) {
        av.shield = new T.Mesh(new T.SphereGeometry(1.25, 16, 12), new T.MeshBasicMaterial({ color: '#7ff6ff', transparent: true, opacity: 0.25, depthWrite: false }));
        av.shield.position.y = 1;
        av.root.add(av.shield);
      }
      av.shield.visible = true;
      av.shield.material.opacity = 0.2 + Math.sin(av.t * 10) * 0.05;
    } else if (av.shield) av.shield.visible = false;
    if (fx & 4) { p.head.rotation.x = 0.4 + Math.sin(av.t * 20) * 0.05; } else p.head.rotation.x = 0;
  }

  // ---------- Name tags ----------
  C.makeTag = function (name, home, sub, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const tex = new T.CanvasTexture(cv);
    const mat = new T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false });
    const sp = new T.Sprite(mat);
    sp.scale.set(2.6, 0.65, 1);
    sp.renderOrder = 10;
    const tag = { sprite: sp, hp: -1, draw(hp) {
      if (hp === tag.hp) return;
      tag.hp = hp;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 512, 128);
      g.font = '700 44px "Fredoka", "Trebuchet MS", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,0.85)';
      const label = name + (home ? '  ' + home : '');
      g.strokeText(label, 256, 42); g.fillStyle = color || '#ffffff'; g.fillText(label, 256, 42);
      if (sub) { g.font = '600 26px "Fredoka", sans-serif'; g.lineWidth = 6; g.strokeText(sub, 256, 78); g.fillStyle = '#d6e4ff'; g.fillText(sub, 256, 78); }
      if (hp >= 0) {
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(156, 96, 200, 18);
        g.fillStyle = hp > 50 ? '#5dff8a' : hp > 25 ? '#ffd84d' : '#ff5a5a';
        g.fillRect(159, 99, 194 * hp / 100, 12);
      }
      tex.needsUpdate = true;
    } };
    tag.draw(100);
    return tag;
  };
})();
