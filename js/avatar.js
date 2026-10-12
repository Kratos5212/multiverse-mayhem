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

  // A thin ring for inked eye rims (a torus whose tube is a few percent of its radius).
  const RIM = new T.TorusGeometry(1, 0.075, 6, 36);

  // ---------- Heads ----------
  // opts.noBall: only the face and hat (beanlings wear their face on the body).
  function buildHead(s, L, R, species, opts) {
    opts = opts || {};
    // Bird people have a feathered head: lighter plumage than the crest.
    const skin = species === 'birdfolk' ? shade(L.hairColor, 1.35) : L.skin, hair = L.hairColor, dark = '#1b1b1b';
    // Head shape: round (most people), long (tall oval, like a grumpy scientist), wide.
    const wideF = L.face === 'wide' ? 1.22 : 1;
    let tall = L.face === 'long' ? 1.34 : L.face === 'wide' ? 1.0 : 1.12;
    if (species === 'alien') tall *= 1.2;
    if (opts.noBall) {
      // nothing: the body is the head
    } else if (species === 'insect') {
      // Bug head: long, with big compound eyes, mandibles and antennae.
      s.add(P.sphere, skin, [0, 0, 0.05 * R], null, [R * 0.85, R * 1.25, R * 1.0]);
      for (const sx of [-1, 1]) {
        s.add(P.sphere, '#b8302a', [sx * R * 0.55, R * 0.22, R * 0.55], null, [R * 0.42, R * 0.5, R * 0.36]);   // red compound eyes
        s.add(P.sphereLo, '#ff9a8a', [sx * R * 0.48, R * 0.38, R * 0.82], null, [R * 0.1, R * 0.1, R * 0.05], true);
        s.add(P.cone, shade(skin, 0.7), [sx * R * 0.22, -R * 0.9, R * 0.6], [Math.PI - 0.4, 0, sx * 0.5], [R * 0.12, R * 0.45, R * 0.12]);
        s.add(P.cylLo, shade(skin, 0.8), [sx * R * 0.3, R * 1.3, R * 0.2], [0.5, 0, -sx * 0.4], [R * 0.04, R * 0.8, R * 0.04]);
        s.add(P.sphereLo, shade(skin, 0.8), [sx * R * 0.5, R * 1.65, R * 0.45], null, [R * 0.1, R * 0.1, R * 0.1]);
      }
      return R * 1.3;
    } else if (species === 'robot') {
      s.add(P.box, skin, [0, 0, 0], null, [R * 1.8, R * 1.9, R * 1.7]);
      s.add(P.cylLo, shade(skin, 0.7), [R * 0.95, 0, 0], [0, 0, Math.PI / 2], [R * 0.18, R * 0.25, R * 0.18]);
      s.add(P.cylLo, shade(skin, 0.7), [-R * 0.95, 0, 0], [0, 0, Math.PI / 2], [R * 0.18, R * 0.25, R * 0.18]);
      for (let i = -1; i <= 1; i++) s.add(P.box, dark, [i * R * 0.25, -R * 0.5, R * 0.86], null, [R * 0.12, R * 0.2, R * 0.04]);
    } else {
      s.add(P.sphere, skin, [0, 0, 0], null, [R * wideF, R * tall, R * 0.95]);
      if (L.face === 'long') s.add(P.sphere, skin, [0, -R * 0.62, R * 0.12], null, [R * 0.72, R * 0.55, R * 0.8]);
      if (species === 'cat') {
        for (const sx of [-1, 1]) {
          s.add(P.cone, skin, [sx * R * 0.55, R * tall * 0.85, 0], [0, 0, -sx * 0.35], [R * 0.32, R * 0.6, R * 0.18]);
          s.add(P.cone, '#ffb6c8', [sx * R * 0.55, R * tall * 0.83, R * 0.06], [0, 0, -sx * 0.35], [R * 0.18, R * 0.42, R * 0.08]);
          for (let i = -1; i <= 1; i++) s.add(P.cylLo, '#2a2a2a', [sx * R * 0.55, -R * 0.28 + i * R * 0.06, R * 0.86], [0, 0, Math.PI / 2 + i * 0.15], [R * 0.012, R * 0.6, R * 0.012]);
        }
        s.add(P.sphere, shade(skin, 1.35), [0, -R * 0.3, R * 0.72], null, [R * 0.42, R * 0.28, R * 0.3]);
        s.add(P.sphereLo, '#ff7fa0', [0, -R * 0.14, R * 0.98], null, [R * 0.09, R * 0.07, R * 0.06]);
      }
      if (species === 'human' || species === 'blob') {
        s.add(P.sphereLo, skin, [R * 0.97, 0, 0], null, [R * 0.13, R * 0.22, R * 0.12]);
        s.add(P.sphereLo, skin, [-R * 0.97, 0, 0], null, [R * 0.13, R * 0.22, R * 0.12]);
      }
      if (species === 'teddy') {
        // Teddy Universe: round fuzzy ears and a pale muzzle with a button nose.
        for (const sx of [-1, 1]) {
          s.add(P.sphere, skin, [sx * R * 0.72, R * tall * 0.78, -R * 0.05], null, [R * 0.34, R * 0.34, R * 0.2]);
          s.add(P.sphereLo, shade(skin, 1.4), [sx * R * 0.72, R * tall * 0.78, R * 0.1], null, [R * 0.2, R * 0.2, R * 0.08]);
        }
        s.add(P.sphere, shade(skin, 1.45), [0, -R * 0.3, R * 0.7], null, [R * 0.46, R * 0.34, R * 0.36]);
        s.add(P.sphereLo, '#2a1a12', [0, -R * 0.14, R * 1.02], null, [R * 0.13, R * 0.09, R * 0.08]);
      }
      if (species === 'shrimp') {
        // Shrimp Universe: a pointed rostrum, long whiskery antennae and shell ridges.
        s.add(P.cone, shade(skin, 0.85), [0, R * 0.55, R * 0.7], [1.1, 0, 0], [R * 0.12, R * 0.7, R * 0.1]);
        for (const sx of [-1, 1]) {
          s.add(P.cylLo, shade(skin, 0.8), [sx * R * 0.35, R * 1.15, R * 0.1], [-0.6, 0, -sx * 0.5], [R * 0.025, R * 1.4, R * 0.025]);
          s.add(P.cylLo, shade(skin, 0.8), [sx * R * 0.55, R * 1.75, -R * 0.55], [-1.4, 0, -sx * 0.6], [R * 0.02, R * 1.2, R * 0.02]);
        }
        for (let i = 0; i < 4; i++) s.add(P.capsule, shade(skin, 0.88), [0, R * (0.75 - i * 0.12), -R * (0.35 + i * 0.18)], [0, 0, Math.PI / 2], [R * 0.08, R * (0.85 - i * 0.1), R * 0.08]);
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
      s.add(RIM, dark, [x, y, fz], null, [r * 1.0, r * 1.0, r]);   // inked rim around the eye
      s.add(P.sphereLo, dark, [x + (Math.random() - 0.5) * r * 0.2, y, fz + r * 0.52], null, [pupil, pupil, pupil * 0.5]);
    };
    const ey = R * 0.18 * (species === 'alien' ? 1.4 : 1);
    if (L.eyes === 'cyclops') eye(0, ey, R * 0.42, R * 0.08);
    else if (L.eyes === 'dots') {
      for (const sx of [-1, 1]) s.add(P.sphereLo, dark, [sx * R * 0.3, ey, fz + R * 0.12], null, [R * 0.075, R * 0.075, R * 0.05]);
    }
    else if (L.eyes === 'visor') s.add(P.cyl, '#22e6ff', [0, ey, 0], null, [R * 0.99, R * 0.28, R * 0.99], true);
    else {
      const er = L.eyes === 'wide' ? R * 0.36 : R * 0.29;
      const pr = L.eyes === 'wide' ? R * 0.05 : R * 0.065;
      eye(R * 0.33, ey, er, pr); eye(-R * 0.33, ey, er, pr);
      if (L.eyes === 'three') eye(0, ey + R * 0.5, R * 0.2, R * 0.05);
      if (L.eyes === 'tired') {
        // Droopy upper lids and bags under the eyes.
        for (const sx of [-1, 1]) {
          s.add(P.hemi, skin, [sx * R * 0.33, ey + er * 0.18, fz + 0.005], [0.15, 0, 0], [er * 1.06, er * 0.85, er * 0.62]);
          s.add(P.capsule, shade(skin, 0.82), [sx * R * 0.33, ey - er * 1.05, fz + R * 0.02], [0, 0, Math.PI / 2], [R * 0.025, er * 0.9, R * 0.02]);
        }
      }
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
      // A big hooked beak that juts out and curls down, like Birdperson's.
      s.add(P.cone, '#f2a12c', [0, -R * 0.05, R * 1.25], [Math.PI / 2 + 0.15, 0, 0], [R * 0.34, R * 1.0, R * 0.28]);
      s.add(P.sphere, '#f2a12c', [0, -R * 0.02, R * 0.85], null, [R * 0.34, R * 0.28, R * 0.32]);
      s.add(P.cone, '#d27f12', [0, -R * 0.42, R * 1.62], [Math.PI, 0, 0], [R * 0.1, R * 0.32, R * 0.1]);
      s.add(P.capsule, '#b86a10', [0, -R * 0.3, R * 1.05], [Math.PI / 2 + 0.35, 0, 0], [R * 0.16, R * 0.3, R * 0.12]);
      // Feather tufts on the cheeks.
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) s.add(P.cone, shade(hair, 1.15), [sx * R * (0.82 + i * 0.05), -R * (0.15 + i * 0.18), R * 0.25], [0.2, 0, sx * (2.0 + i * 0.25)], [R * 0.12, R * 0.45, R * 0.08]);
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
      // A crest of long feathers sweeping back from the brow.
      for (let i = 0; i < 9; i++) {
        const t = i / 8, sx = (i % 3 - 1) * R * 0.18;
        s.add(P.cone, i % 2 ? hair : shade(hair, 1.2), [sx, top * (0.9 - t * 0.35), R * (0.25 - t * 1.1)], [-0.45 - t * 0.9, 0, sx * 1.5], [R * 0.19, R * (1.0 + (1 - t) * 0.5), R * 0.1]);
      }
    } else if (species === 'robot') {
      s.add(P.cylLo, '#777', [0, R * 1.1, 0], null, [R * 0.04, R * 0.5, R * 0.04]);
      s.add(P.sphereLo, '#ff4040', [0, R * 1.4, 0], null, [R * 0.1, R * 0.1, R * 0.1], true);
    } else if (hs === 'rick') {
      // A high hairline and a crown of long spikes sweeping back and out.
      s.add(P.sphere, hair, [0, R * 0.32 * tall, -R * 0.28], null, [R * 1.02 * wideF, top * 0.78, R * 0.82]);
      const rows = [[0.35, 9, 1.15], [0.85, 7, 1.05], [1.25, 5, 0.9]];
      for (const [el, n, len] of rows) {
        for (let i = 0; i < n; i++) {
          const th = -2.1 + 4.2 * (i + 0.5) / n;           // around the back, from temple to temple
          const v = new T.Vector3(Math.sin(th) * Math.cos(el), Math.sin(el), -Math.cos(th) * Math.cos(el)).normalize();
          const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v);
          const e = new T.Euler().setFromQuaternion(q, 'YXZ');
          s.add(P.cone, hair, [v.x * R * 0.95 * wideF, R * 0.25 * tall + v.y * top * 0.75, v.z * R * 0.85 - R * 0.1], [e.x, e.y, e.z], [R * 0.36, R * 1.5 * len, R * 0.26]);
        }
      }
      for (const sx of [-1, 1]) s.add(P.cone, hair, [sx * R * 0.92 * wideF, R * 0.05, -R * 0.1], [0, 0, -sx * 2.0], [R * 0.18, R * 0.55, R * 0.16]);
    } else if (hs === 'morty') {
      // Smooth helmet of hair sitting back from the forehead, with a little peak at the front.
      s.add(P.hemi, hair, [0, R * 0.12, -R * 0.06], [-0.22, 0, 0], [R * 1.06 * wideF, top * 0.98, R * 1.04]);
      s.add(P.sphere, hair, [0, -R * 0.05, -R * 0.42], null, [R * 0.98 * wideF, R * 0.75, R * 0.62]);
      s.add(P.cone, hair, [0, top * 0.92, R * 0.38], [0.7, 0, 0], [R * 0.2, R * 0.38, R * 0.14]);
      for (const sx of [-1, 1]) s.add(P.sphereLo, hair, [sx * R * 0.92 * wideF, R * 0.18, -R * 0.05], null, [R * 0.16, R * 0.4, R * 0.35]);
    } else if (hs === 'bob') {
      // Chin-length bob: a cap plus volume around the sides and back, open at the face.
      s.add(P.hemi, hair, [0, R * 0.16, -R * 0.02], [-0.12, 0, 0], [R * 1.08 * wideF, top * 0.95, R * 1.06]);
      s.add(P.sphere, hair, [0, -R * 0.25, -R * 0.38], null, [R * 1.08 * wideF, R * 0.85, R * 0.8]);
      for (const sx of [-1, 1]) s.add(P.sphere, hair, [sx * R * 0.86 * wideF, -R * 0.3, R * 0.12], null, [R * 0.3, R * 0.75, R * 0.5]);
      s.add(P.capsule, hair, [R * 0.15, top * 0.82, R * 0.62], [0.9, 0, Math.PI / 2 - 0.3], [R * 0.16, R * 0.5, R * 0.14]);
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
      // Hair down over the back of the head, a tie, and a long tail swinging out behind.
      s.add(P.hemi, hair, [0, R * 0.15, -R * 0.03], null, [R * 1.04, top * 0.9, R * 1.0]);
      s.add(P.sphere, hair, [0, -R * 0.05, -R * 0.35], null, [R * 1.0, R * 0.95, R * 0.75]);
      C.capsuleAt(s, hair, R * 0.26, R * 1.5, [0, R * 0.75, -R * 0.92], [Math.PI - 0.6, 0, 0]);
      s.add(P.sphere, hair, [0, -R * 0.55, -R * 1.45], null, [R * 0.22, R * 0.3, R * 0.2]);
    } else if (hs === 'slick') {
      // Neat, combed, side-parted.
      s.add(P.hemi, hair, [0, R * 0.12, -R * 0.04], [-0.18, 0, 0], [R * 1.06 * wideF, top * 0.92, R * 1.04]);
      s.add(P.sphere, hair, [0, -R * 0.02, -R * 0.4], null, [R * 0.98 * wideF, R * 0.7, R * 0.6]);
      s.add(P.capsule, hair, [-R * 0.2, top * 0.86, R * 0.55], [1.2, 0, Math.PI / 2 + 0.25], [R * 0.14, R * 0.5, R * 0.12]);
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
      // Patch over the right eye; the strap runs up across the forehead, clear of the other eye.
      s.add(P.cyl, '#111', [-R * 0.33, ey, fz + R * 0.16], [Math.PI / 2, 0, 0], [R * 0.32, R * 0.06, R * 0.32]);
      s.add(P.capsule, '#111', [-R * 0.05, ey + R * 0.36, fz + R * 0.04], [0, 0, -0.95], [R * 0.035, R * 0.42, R * 0.035]);
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

  // The gun: a rounded body along +z, a glowing vial on top and an emitter at the front,
  // with its grip going down from (x, y, z). Rick's portal gun glows in his portal colour.
  function gunAt(s, x, y, z, weapon, L) {
    const col = weapon === 'plasma' ? L.portalColor : WEAPON_COLORS[weapon] || '#ffd84d';
    const fwd = [Math.PI / 2, 0, 0];
    C.capsuleAt(s, '#7d858e', 0.042, 0.2, [x, y - 0.17, z - 0.05], [0.3, 0, 0]);                 // grip
    C.capsuleAt(s, '#d8dde2', 0.072, 0.36, [x, y + 0.04, z - 0.1], fwd);                      // body
    s.add(P.cyl, col, [x, y + 0.13, z + 0.06], fwd, [0.042, 0.2, 0.042], true);                 // vial
    for (const dz of [-0.05, 0.17]) s.add(P.cyl, '#9aa3ab', [x, y + 0.13, z + dz], fwd, [0.05, 0.035, 0.05]);
    s.add(P.cyl, '#9aa3ab', [x, y + 0.04, z + 0.27], fwd, [0.062, 0.05, 0.062]);                // emitter
    s.add(P.sphereLo, col, [x, y + 0.04, z + 0.3], null, [0.046, 0.046, 0.028], true);
    s.add(P.cyl, '#59606e', [x + 0.075, y + 0.05, z + 0.02], [0, 0, Math.PI / 2], [0.028, 0.03, 0.028]);   // dial
  }
  function addGun(s, weapon, L, y) { gunAt(s, 0, y, 0.12, weapon, L); }

  function s_bump(shape, c, x, y, z) { shape.add(C.prim.sphereLo, c, [x, y, z], null, [0.035, 0.055, 0.03]); }

  // ---------- Full character ----------
  // Every character is built twice: smooth for up close and plain for far away. Both sit
  // on the same joints, so one animation drives them; setDetail() shows one or the other.
  C.buildAvatar = function (look, arch, opts) {
    const av = buildAvatarOnce(look, arch, opts);
    C.shapeSmooth = false;
    let lo;
    try { lo = buildAvatarOnce(look, arch, opts); } finally { C.shapeSmooth = true; }
    av.lodNear = []; av.lodFar = [];
    // Joints (knees, elbows) are pivots inside pivots: only meshes swap, never joints. The
    // far model has no knees or elbows (whole limbs), which keeps distant crowds cheap.
    const joints = new Set(Object.values(av.parts)), loJoints = new Set(Object.values(lo.parts));
    for (const k in av.parts) {
      if (k === 'root' || k === 'body') continue;
      for (const m of av.parts[k].children.slice()) if (!joints.has(m)) av.lodNear.push(m);
      if (!lo.parts[k]) continue;
      for (const m of lo.parts[k].children.slice()) if (!loJoints.has(m)) { av.parts[k].add(m); av.lodFar.push(m); }
    }
    av.near = null;
    av.setDetail = near => {
      if (av.near === near) return;
      av.near = near;
      for (const m of av.lodNear) m.visible = near;
      for (const m of av.lodFar) m.visible = !near;
    };
    av.setDetail(true);
    return av;
  };
  function buildAvatarOnce(look, arch, opts) {
    opts = opts || {};
    const L = MM.sanitizeLook(look);
    const A = MM.ARCHETYPES[arch] || MM.ARCHETYPES.genius;
    let species = L.species;
    const h = L.height, w = L.width, hs = L.head;
    const thick = opts.thick || 0.028;   // fine ink, like the show

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

    const pickle = species === 'pickle';
    const bean = species === 'beanling' || pickle, blob = species === 'blob';
    // Show proportions: long legs and noodle arms, so heads are about a fifth of a grown-up's
    // height (Morty, with his big head, is closer to a third).
    const legLen = (pickle ? 0.24 : bean ? 0.55 : 0.84) * h;
    const legR = (bean ? 0.045 : blob ? 0.15 : 0.1) * w;
    const torsoLen = (blob ? 0.6 : 0.58) * h;
    const torsoR = (blob ? 0.42 : 0.22) * w;
    const armR = (bean ? 0.04 : blob ? 0.12 : 0.065) * w;
    const armLen = (bean ? 0.58 : 0.68) * h * (blob ? 1.1 : pickle ? 0.45 : 1);
    const pants = L.pantsColor, shoe = L.shoeColor, skin = L.skin;
    const top = L.top;
    const topC = top === 'none' ? skin : top === 'vest' ? L.shirtColor : (top === 'labcoat' ? L.shirtColor : L.topColor);

    // Legs. Up close they have knees (a thigh and a shin on their own joint); far away a
    // leg is one piece.
    const jointed = C.shapeSmooth !== false;
    const thighLen = legLen * 0.52;
    const shoeAt = (s, y) => {
      if (bean) s.add(P.sphereLo, shoe, [0, y + 0.05, 0.05], null, [0.07, 0.05, 0.11]);
      else { s.add(P.sphere, shoe, [0, y + 0.06, 0.07], null, [legR * 1.25, 0.08, 0.17]); s.add(P.box, shade(shoe, 0.6), [0, y + 0.012, 0.06], null, [legR * 2.2, 0.025, 0.3]); }
    };
    for (const side of [-1, 1]) {
      const s = new C.Shape();
      const legC = bean ? skin : pants;
      const hip = [side * (bean ? 0.12 : 0.11) * w * (blob ? 1.6 : 1), legLen, 0];
      if (jointed) {
        // Both halves end in a ball centred on the knee, so the leg bends without a seam.
        C.capsuleAt(s, legC, legR, thighLen + 2 * legR, [0, -thighLen - legR, 0]);
        const k = new C.Shape();
        C.capsuleAt(k, legC, legR, legLen - thighLen + legR, [0, -(legLen - thighLen), 0]);
        shoeAt(k, -(legLen - thighLen));
        const hp = mk(s, body, hip);
        parts[side < 0 ? 'legL' : 'legR'] = hp;
        parts[side < 0 ? 'shinL' : 'shinR'] = mk(k, hp, [0, -thighLen, 0]);
      } else {
        C.capsuleAt(s, legC, legR, legLen, [0, -legLen, 0]);
        shoeAt(s, -legLen);
        parts[side < 0 ? 'legL' : 'legR'] = mk(s, body, hip);
      }
    }

    // Torso
    const ts = new C.Shape();
    let shoulderY, neckY, headR;
    if (bean) {
      // A tall bean: body and head are one shape, the face sits near the top.
      // Pickle Rick is a long cucumber: slimmer and taller than a bean person.
      const bh = (pickle ? 1.4 : 1.15) * h, br = (pickle ? 0.27 : 0.33) * w;
      C.capsuleAt(ts, skin, br, bh, [0, legLen - 0.15, 0]);
      if (pickle) {
        // Warty bumps down the sides and back (never near the face), and a lighter belly.
        for (let i = 0; i < 26; i++) {
          const a = Math.PI * 0.35 + (i * 2.39996) % (Math.PI * 1.3), yy = legLen + 0.05 + (i / 26) * bh * 0.62;
          s_bump(ts, shade(skin, 0.82), Math.sin(a) * br * 0.97, yy, Math.cos(a) * br * 0.95);
        }
        ts.add(P.sphere, shade(skin, 1.2), [0, legLen + bh * 0.3, br * 0.42], null, [br * 0.7, bh * 0.3, br * 0.62]);
        ts.add(P.sphere, shade(skin, 0.75), [0, legLen - 0.15 + bh - br * 0.15, 0], null, [br * 0.35, br * 0.15, br * 0.35]);   // the stem end
      }
      shoulderY = legLen + bh * 0.48; neckY = legLen + bh * 0.62; headR = br;
      if (top !== 'none') ts.add(P.cyl, topC, [0, legLen + 0.08, 0], null, [0.335 * w, 0.18, 0.335 * w]);
    } else if (blob) {
      ts.add(P.sphere, skin, [0, legLen + torsoLen * 0.5, 0], null, [torsoR, torsoLen * 0.65, torsoR * 0.85]);
      for (let i = 0; i < 6; i++) { const a = i * 1.7; ts.add(P.sphereLo, shade(skin, 0.9 + (i % 3) * 0.08), [Math.sin(a) * torsoR * 0.75, legLen + torsoLen * (0.3 + (i % 3) * 0.25), Math.cos(a) * torsoR * 0.55], null, [torsoR * 0.45, torsoR * 0.4, torsoR * 0.4]); }
      ts.add(P.sphere, pants, [0, legLen + 0.05, 0], null, [torsoR * 0.85, 0.25, torsoR * 0.7]);
      if (top !== 'none') ts.add(P.cyl, L.topColor, [0, legLen + torsoLen * 0.25, 0], null, [torsoR * 0.95, torsoLen * 0.25, torsoR * 0.8]);
      shoulderY = legLen + torsoLen * 0.8; neckY = legLen + torsoLen * 0.95; headR = 0.24 * hs;
    } else {
      const bare = top === 'none' && pants === skin;   // fur all over (Squanchy): no waistband
      if (!bare) ts.add(P.sphere, pants, [0, legLen + 0.02, 0], null, [torsoR * 1.02, 0.16, torsoR * 0.8]);
      C.capsuleAt(ts, topC, torsoR, torsoLen + 0.1, [0, legLen - 0.05, 0], null);
      if (!bare) ts.add(P.cyl, pants, [0, legLen + 0.05, 0], null, [torsoR * 1.03, 0.1, torsoR * 1.03]);
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
      if (top === 'tank') {
        // Bare shoulders and a scoop neck.
        for (const sx of [-1, 1]) ts.add(P.sphere, skin, [sx * torsoR * 0.78, legLen + torsoLen * 0.94, 0], null, [0.13, 0.11, 0.14]);
        ts.add(P.sphere, skin, [0, legLen + torsoLen * 0.98, torsoR * 0.55], null, [torsoR * 0.55, 0.1, torsoR * 0.4]);
      }
      if (species === 'cat') for (let i = 0; i < 7; i++) ts.add(P.sphereLo, i > 4 ? shade(skin, 0.7) : skin, [0, legLen + 0.05 + i * i * 0.012, -torsoR - 0.08 - i * 0.09], null, [0.07, 0.07, 0.07]);
      // A visible neck, thin for grown-ups.
      const neckLen = 0.075 * h;
      headR = 0.235 * hs;
      if (species !== 'insect' && species !== 'robot') C.capsuleAt(ts, skin, Math.max(0.045, 0.06 * w), neckLen + headR * 0.5 + 0.08, [0, legLen + torsoLen - 0.08, 0]);
      shoulderY = legLen + torsoLen - 0.06; neckY = legLen + torsoLen + neckLen;
    }
    if (species === 'robot' && !bean) ts.add(P.cyl, '#22e6ff', [0, legLen + torsoLen * 0.6, torsoR * 0.95], [Math.PI / 2, 0, 0], [0.07, 0.03, 0.07], true);
    if (species === 'insect') for (const sx of [-1, 1]) {
      // Gromflomite wings: long, pale and veined, folded down the back.
      ts.add(P.sphere, '#cfe4ee', [sx * torsoR * 0.45, legLen + torsoLen * 0.55, -torsoR * 1.05], [0.15, sx * 0.25, sx * 0.18], [torsoR * 0.42, torsoLen * 0.62, 0.025]);
      ts.add(P.box, '#8fa8b8', [sx * torsoR * 0.45, legLen + torsoLen * 0.55, -torsoR * 1.08], [0.15, sx * 0.25, sx * 0.18], [0.02, torsoLen * 1.0, 0.02]);
    }
    parts.torso = mk(ts, body);

    // Arms: sleeves follow the top.
    const sleeveC = top === 'none' ? skin : top === 'labcoat' ? L.topColor : top === 'vest' ? L.shirtColor : L.topColor;
    const sleeveLen = (top === 'tshirt' || top === 'polo' || top === 'vest') ? 0.35 : (top === 'none' || top === 'tank' || bean) ? 0 : 1;
    // Arms: an upper arm and, up close, a forearm on an elbow joint. The hand (and the gun)
    // ride on the forearm.
    const upLen = armLen * 0.5;
    const hand = (s, y, side) => {
      const hc = species === 'robot' ? shade(skin, 0.8) : skin;
      if (jointed && !bean && species !== 'robot') {
        // A cartoon hand: palm, three fingers and a thumb (the show draws four fingers).
        const gun = side > 0 && !MM.WEAPONS[A.weapon].melee;
        s.add(P.sphere, hc, [0, y - armR * 0.7, 0], null, [armR * 1.45, armR * 1.7, armR * 1.05]);
        for (let i = -1; i <= 1; i++) C.capsuleAt(s, hc, armR * 0.4, armR * (gun ? 1.2 : 1.7), [i * armR * 0.62, y - armR * 1.5, armR * 0.15], gun ? [Math.PI - 1.2, 0, 0] : [Math.PI - 0.25, 0, i * 0.12]);
        C.capsuleAt(s, hc, armR * 0.42, armR * 1.3, [-side * armR * 0.95, y - armR * 0.6, armR * 0.35], [Math.PI - 0.7, 0, side * 0.7]);
      } else s.add(P.sphere, hc, [0, y - 0.02, 0], null, [armR * 1.5, armR * 1.6, armR * 1.4]);
      if (side > 0 && !MM.WEAPONS[A.weapon].melee) addGun(s, A.weapon, L, y - 0.04);
      if (side > 0 && species === 'birdfolk' && MM.WEAPONS[A.weapon].melee) for (let i = -1; i <= 1; i++) s.add(P.cone, '#e8e2d0', [i * 0.04, y - 0.1, 0.05], [Math.PI - 0.3, 0, 0], [0.025, 0.14, 0.025]);
    };
    for (const side of [-1, 1]) {
      const s = new C.Shape();
      const px = side * (torsoR + armR * 1.2) * (bean ? 1.0 : 1);
      if (jointed) {
        const sl = armLen * sleeveLen * 0.92;
        // Same trick at the elbow: both halves (and long sleeves) end in a ball on the joint.
        const sr = armR * 1.35, su = Math.min(sl, upLen);
        C.capsuleAt(s, skin, armR, upLen + 2 * armR, [0, -upLen - armR, 0]);
        if (sleeveLen > 0) C.capsuleAt(s, sleeveC, sr, su + 2 * sr, [0, -su - sr, 0]);
        const f = new C.Shape(), fl = armLen - upLen;
        C.capsuleAt(f, skin, armR, fl + armR, [0, -fl, 0]);
        if (sl > upLen) C.capsuleAt(f, sleeveC, sr, sl - upLen + sr, [0, -(sl - upLen), 0]);
        hand(f, -fl, side);
        const sp = mk(s, body, [px, shoulderY, 0]);
        parts[side < 0 ? 'armL' : 'armR'] = sp;
        parts[side < 0 ? 'foreL' : 'foreR'] = mk(f, sp, [0, -upLen, 0]);
      } else {
        C.capsuleAt(s, skin, armR, armLen, [0, -armLen, 0]);
        if (sleeveLen > 0) C.capsuleAt(s, sleeveC, armR * 1.35, armLen * sleeveLen * 0.92, [0, -armLen * sleeveLen * 0.92, 0]);
        hand(s, -armLen, side);
        parts[side < 0 ? 'armL' : 'armR'] = mk(s, body, [px, shoulderY, 0]);
      }
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
    av.shoulderY = shoulderY;
    av.headY = neckY + headR * 2.2 + (L.acc === 'tophat' || L.hair === 'afro' ? headR * 0.9 : 0);
    if (bean) av.headY = neckY + headR * 2;
    // Where the eyes are, for the first-person camera.
    av.eyeY = bean ? neckY + headR * 0.4 : neckY + headR * 1.1;
    return av;
  }

  // ---------- First-person arm ----------
  // Your right arm as you see it in first person: the forearm points forward (+z) from the
  // shoulder at the origin, with the gun's barrel lined up along it.
  C.buildViewArm = function (look, arch, outline) {
    const L = MM.sanitizeLook(look);
    const A = MM.ARCHETYPES[arch] || MM.ARCHETYPES.genius;
    const species = L.species, h = L.height, w = L.width, top = L.top;
    const bean = species === 'beanling' || species === 'pickle', blob = species === 'blob';
    const skin = L.skin;
    const armR = (bean ? 0.05 : blob ? 0.12 : 0.065) * w;
    const len = 0.58 * h * (blob ? 1.1 : 1);
    const sleeveC = top === 'none' ? skin : top === 'vest' ? L.shirtColor : L.topColor;
    const sleeveLen = (top === 'tshirt' || top === 'polo' || top === 'vest') ? 0.35 : (top === 'none' || top === 'tank' || bean) ? 0 : 1;
    const s = new C.Shape();
    const fwd = [Math.PI / 2, 0, 0];   // capsules grow along +y; this lays them along +z
    C.capsuleAt(s, skin, armR, len, [0, 0, 0], fwd);
    if (sleeveLen > 0) {
      C.capsuleAt(s, sleeveC, armR * 1.35, len * sleeveLen * 0.92, [0, 0, 0], fwd);
      if (top === 'labcoat') s.add(P.cyl, '#ffffff', [0, 0, len * 0.9], fwd, [armR * 1.45, 0.05, armR * 1.45]);   // cuff
    }
    s.add(P.sphere, species === 'robot' ? shade(skin, 0.8) : skin, [0, 0, len], null, [armR * 1.6, armR * 1.5, armR * 1.7]);
    const melee = MM.WEAPONS[A.weapon].melee;
    if (!melee) {
      gunAt(s, 0, 0.0, len + 0.04, A.weapon, L);
    } else if (species === 'birdfolk') {
      for (let i = -1; i <= 1; i++) s.add(P.cone, '#e8e2d0', [i * 0.04, 0.02, len + 0.1], [Math.PI / 2, 0, 0], [0.025, 0.14, 0.025]);
    }
    return C.meshOf(s.build(), outline || 0.03);
  };

  // ---------- Animation ----------
  // How each kind of character carries themselves. slouch: forward hunch. bounce: how
  // springy the step is. swing: arm swing. stride: leg swing. jitter: nervous fidgeting.
  // carry: elbow bend while holding a gun. march: stiff straight-armed walk.
  const GAITS = {
    genius:     { slouch: 0.12, bounce: 0.7, swing: 0.55, stride: 0.85, jitter: 0, carry: 0.5, headDown: 0.12 },
    sidekick:   { slouch: 0.07, bounce: 1.25, swing: 0.6, stride: 0.95, jitter: 1, carry: 0.7 },
    teen:       { slouch: 0, bounce: 1.1, swing: 0.75, stride: 1.0, jitter: 0, carry: 0.6 },
    surgeon:    { slouch: -0.02, bounce: 0.9, swing: 0.6, stride: 0.95, jitter: 0, carry: 0.6 },
    joe:        { slouch: 0.05, bounce: 0.85, swing: 0.8, stride: 0.85, jitter: 0.4, carry: 0.5 },
    birdfolk:   { slouch: -0.05, bounce: 0.8, swing: 0.4, stride: 1.1, jitter: 0, carry: 0.3 },
    trooper:    { slouch: -0.04, bounce: 0.6, swing: 0.3, stride: 1.0, jitter: 0, carry: 0.9, march: 1 },
    meeseeks:   { slouch: -0.06, bounce: 1.6, swing: 1.0, stride: 1.0, jitter: 0, carry: 0.4 },
    evilmorty:  { slouch: 0.02, bounce: 0.7, swing: 0.35, stride: 0.9, jitter: 0, carry: 0.8 },
    picklerick: { slouch: 0, bounce: 1.4, swing: 1.0, stride: 1.2, jitter: 0, carry: 0.5 },
    squanchy:   { slouch: 0.08, bounce: 1.1, swing: 0.7, stride: 1.0, jitter: 0.2, carry: 0.5 },
  };
  const BASE_GAIT = { slouch: 0.03, bounce: 1, swing: 0.7, stride: 1, jitter: 0, carry: 0.55 };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function animate(av, dt, st) {
    const p = av.parts, G = av.gait || (av.gait = Object.assign({}, BASE_GAIT, GAITS[av.arch]));
    av.t += dt;
    const speed = st.speed || 0;
    const k = Math.min(1, speed / 4.5);                  // walking
    const run = clamp((speed - 4.5) / 4, 0, 1);         // running on top of that
    av.phase += speed * dt * (1.55 - run * 0.25) / Math.max(0.7, G.stride);
    const ph = av.phase, sw = Math.sin(ph), cw = Math.cos(ph);
    const anim = st.anim || 0;
    const dead = anim === MM.ANIM.dead;
    const air = anim === MM.ANIM.air, fly = anim === MM.ANIM.fly, emote = anim === MM.ANIM.emote;
    const f = Math.min(1, dt * 14);
    const ground = !air && !fly && !dead;

    // Turning: lean into it a little.
    const yaw = av.root.rotation.y;
    let dy = yaw - (av.lastYaw === undefined ? yaw : av.lastYaw);
    if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
    av.lastYaw = yaw;
    av.turn = lerp(av.turn || 0, clamp(dy / Math.max(dt, 1e-3), -6, 6), Math.min(1, dt * 6));

    // Legs: hip swing plus a knee that lifts the foot while it swings forward.
    const stride = 0.75 * G.stride * (k + run * 0.35);
    let lL = sw * stride, lR = -sw * stride;
    let kL = Math.max(0, -cw) * (0.9 + run * 0.7) * k + 0.08 * k, kR = Math.max(0, cw) * (0.9 + run * 0.7) * k + 0.08 * k;
    // Arms swing against the legs; when running, elbows bend and pump.
    const swing = 0.6 * G.swing * (k + run * 0.5) * (G.march ? 0.5 : 1);
    let aL = -sw * swing, aR = sw * swing * 0.6, aLz = 0.1, aRz = -0.1;
    let eL = -(0.15 + run * 1.0) * (G.march ? 0.2 : 1), eR = -G.carry - run * 0.4;
    let tilt = G.slouch + k * 0.08 + run * 0.16, roll = 0;
    let bob = (Math.abs(cw) * 0.07 * k + run * Math.abs(cw) * 0.05) * G.bounce - 0.02 * k;
    let twist = sw * 0.1 * k * (G.march ? 0.3 : 1), headY = 0, headX = G.headDown || 0;
    roll = clamp(-av.turn * 0.025, -0.18, 0.18) * (0.3 + k) + sw * 0.03 * k;
    // Standing still: breathing, a slow weight shift, now and then a look around.
    if (ground && k < 0.05) {
      const br = Math.sin(av.t * 2.1);
      aLz = 0.1 + br * 0.025; aRz = -aLz; bob = br * 0.01;
      lL = 0.02; lR = -0.04; kL = 0.04; kR = 0.08;
      roll = Math.sin(av.t * 0.7) * 0.025;
      if (av.t > (av.lookAt || 0)) { av.lookAt = av.t + 3 + Math.random() * 5; av.lookTo = (Math.random() - 0.5) * 1.2; }
      headY = lerp(p.head.rotation.y, av.lookTo || 0, Math.min(1, dt * 2));
      if (G.jitter) { headY += Math.sin(av.t * 9) * 0.03 * G.jitter; aL += Math.sin(av.t * 5.3) * 0.05 * G.jitter; }
    }
    if (air) { lL = -0.8; lR = 0.25; kL = 1.1; kR = 0.5; aL = -0.5; aR = -0.6; aLz = 0.8; aRz = -0.8; eL = -0.6; bob = 0; tilt = G.slouch - 0.05; }
    if (fly) { lL = 0.25; lR = 0.4; kL = 0.5; kR = 0.7; aL = 0.3; aR = 0.2; eL = -0.2; tilt = 0.55; bob = Math.sin(av.t * 3) * 0.05; }
    if (emote) { aRz = -2.6 + Math.sin(av.t * 12) * 0.3; aR = 0; eR = -0.5 + Math.sin(av.t * 12) * 0.4; headY = Math.sin(av.t * 6) * 0.25; }
    // Shooting: the gun arm snaps up to aim and kicks back. Melee: a big swing.
    if (av.attackT > 0) {
      av.attackT -= dt;
      const melee = MM.WEAPONS[MM.ARCHETYPES[av.arch] ? MM.ARCHETYPES[av.arch].weapon : 'blaster'].melee;
      const u = 1 - Math.max(0, av.attackT) / 0.3;
      if (melee) { aR = lerp(-2.6, 0.7, u); eR = lerp(-1.2, -0.1, u); twist = lerp(0.5, -0.4, u); }
      else { aR = -1.45 - Math.sin(u * Math.PI) * 0.25; eR = -0.05 - Math.sin(u * Math.PI) * 0.35; twist = -0.15; }
    }
    // Landing squash and take-off stretch.
    if (av.wasAir && ground) av.squash = 1;
    if (!av.wasAir && air) av.stretch = 1;
    av.wasAir = air;
    av.squash = Math.max(0, (av.squash || 0) - dt * 5);
    av.stretch = Math.max(0, (av.stretch || 0) - dt * 4);
    if (av.squash > 0) { kL += av.squash * 0.7; kR += av.squash * 0.7; lL -= av.squash * 0.35; lR -= av.squash * 0.35; bob -= av.squash * 0.12; }

    const set = (o, ax, v, sharp) => { if (o) o.rotation[ax] = sharp ? v : lerp(o.rotation[ax], v, f); };
    set(p.legL, 'x', lL); set(p.legR, 'x', lR);
    set(p.shinL, 'x', kL); set(p.shinR, 'x', kR);
    set(p.armL, 'x', aL); set(p.armR, 'x', aR, av.attackT > 0);
    set(p.foreL, 'x', eL); set(p.foreR, 'x', eR, av.attackT > 0);
    set(p.armL, 'z', aLz); set(p.armR, 'z', aRz);
    set(p.torso, 'y', twist);
    if (p.wingL) {
      // Folded down behind the back at rest (like Birdperson), half open in a jump, spread to fly.
      const open = fly ? 1 : air ? 0.55 : 0;
      av.wingOpen = lerp(av.wingOpen || 0, open, Math.min(1, dt * 6));
      const o = av.wingOpen, flap = fly ? Math.sin(av.t * 14) * 0.8 : air ? Math.sin(av.t * 8) * 0.4 : Math.sin(av.t * 1.5) * 0.05;
      p.wingL.rotation.z = lerp(1.2, -0.2, o) + flap; p.wingR.rotation.z = lerp(-1.2, 0.2, o) - flap;
      p.wingL.rotation.y = lerp(-1.0, 0, o); p.wingR.rotation.y = lerp(1.0, 0, o);
    }
    p.head.rotation.y = lerp(p.head.rotation.y, headY - twist * 0.6, f);
    if (av.jet) { av.jet.flame.visible = fly; av.jet.flame.scale.y = 0.8 + Math.random() * 0.4; }
    if (av.inShip) { set(p.legL, 'x', 0); set(p.legR, 'x', 0); set(p.shinL, 'x', 0.1); set(p.shinR, 'x', 0.1); tilt = 0; roll = clamp(-av.turn * 0.05, -0.3, 0.3); bob = Math.sin(av.t * 3) * 0.05; if (av.ship) av.ship.rotation.y += 0.02; }
    if (dead) av.deadT = Math.min(1, av.deadT + dt * 3); else av.deadT = Math.max(0, av.deadT - dt * 4);
    const D = av.deadT;
    av.body.rotation.x = lerp(av.body.rotation.x, tilt, f) * (1 - D) - D * 1.45;
    av.body.rotation.z = lerp(av.body.rotation.z, roll, f) * (1 - D);
    av.body.position.y = lerp(av.body.position.y, bob, f) * (1 - D) + D * 0.25;
    av.body.position.z = -D * 0.6;
    const sq = av.squash * 0.14 - av.stretch * 0.1;
    av.body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    // Effects
    const fx = st.fx || 0;
    const sc = (fx & 8) ? 0.5 : 1;
    av.root.scale.setScalar(lerp(av.root.scale.x, sc, Math.min(1, dt * 6)));
    av.root.visible = !(fx & 32) || Math.floor(av.t * 8) % 2 === 0 || dead;
    if (fx & 1) {
      if (!av.shield) {
        av.shield = new T.Mesh(new T.SphereGeometry(1.25, 24, 16), new T.MeshBasicMaterial({ color: '#7ff6ff', transparent: true, opacity: 0.25, depthWrite: false }));
        av.shield.position.y = 1;
        av.root.add(av.shield);
      }
      av.shield.visible = true;
      av.shield.material.opacity = 0.18 + Math.sin(av.t * 10) * 0.05;
      av.shield.scale.setScalar(1 + Math.sin(av.t * 6) * 0.03);
    } else if (av.shield) av.shield.visible = false;
    p.head.rotation.x = (fx & 4) ? 0.4 + Math.sin(av.t * 20) * 0.05 : lerp(p.head.rotation.x, headX - tilt * 0.5, f);
  }

  // ---------- Gear: built wings, jetpack, ship ----------
  function wingPart(av, side, color) {
    const s = new C.Shape();
    s.add(P.sphere, color, [side * 0.45, 0, 0], [0, 0, side * 0.2], [0.5, 0.12, 0.3]);
    for (let i = 0; i < 4; i++) s.add(P.sphereLo, shade(color, 0.85), [side * (0.55 + i * 0.13), -0.12 - i * 0.04, -0.05], null, [0.12, 0.22, 0.06]);
    const g = C.meshOf(s.build(), 0.035);
    const pivot = new T.Group();
    pivot.add(g);
    pivot.position.set(side * 0.12, av.shoulderY, -0.2);
    av.body.add(pivot);
    return pivot;
  }
  C.setGear = function (av, gear) {
    gear = gear || {};
    if (gear.wings && !av.parts.wingL) { av.parts.wingL = wingPart(av, -1, '#fff3d6'); av.parts.wingR = wingPart(av, 1, '#fff3d6'); }
    if (gear.jet && !av.jet) {
      const s = new C.Shape();
      for (const x of [-0.14, 0.14]) {
        s.add(P.cyl, '#9aa3ab', [x, 0, 0], null, [0.11, 0.5, 0.11]);
        s.add(P.cone, '#59606e', [x, -0.32, 0], [Math.PI, 0, 0], [0.1, 0.15, 0.1]);
      }
      const jet = C.meshOf(s.build(), 0.03);
      jet.position.set(0, av.shoulderY - 0.25, -0.3);
      const f = new C.Shape();
      for (const x of [-0.14, 0.14]) f.add(P.cone, '#ffb03a', [x, -0.62, 0], [Math.PI, 0, 0], [0.09, 0.45, 0.09], true);
      const flame = C.meshOf(f.build(), 0);
      jet.add(flame);
      av.body.add(jet);
      av.jet = { jet, flame };
    }
    av.gear = gear;
  };
  // A cartoon flying saucer around the character's legs.
  C.setShip = function (av, on, gear) {
    if (on && !av.ship) {
      const s = new C.Shape();
      s.add(P.sphere, '#c9cfd6', [0, 0.45, 0], null, [2.2, 0.45, 2.2]);
      s.add(P.cyl, '#8f97a0', [0, 0.25, 0], null, [1.2, 0.3, 1.2]);
      s.add(P.torus, '#59606e', [0, 0.85, 0], [Math.PI / 2, 0, 0], [1.0, 1.0, 0.5]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.sphereLo, i % 2 ? '#ff6fd0' : '#5ff8ff', [Math.cos(a) * 1.85, 0.5, Math.sin(a) * 1.85], null, [0.14, 0.1, 0.14], true); }
      if (gear && gear.lasers) for (const x of [-1.2, 1.2]) s.add(P.cyl, '#3a3f4a', [x, 0.55, 1.3], [Math.PI / 2, 0, 0], [0.09, 0.9, 0.09]);
      if (gear && gear.engine) s.add(P.cyl, '#ffb03a', [0, 0.05, 0], null, [0.9, 0.12, 0.9], true);
      av.ship = C.meshOf(s.build(), 0.05);
      av.ship.position.y = -0.1;
      av.root.add(av.ship);
    }
    if (av.ship) av.ship.visible = !!on;
    av.inShip = !!on;
  };

  // ---------- Speech bubbles ----------
  // Cartoon bubble with the text wrapped to a few lines (drawn on a canvas, never as HTML).
  C.makeBubble = function (text) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    g.font = '600 30px "Fredoka", "Trebuchet MS", sans-serif';
    const words = String(text).split(' '), lines = [];
    let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 440 && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    lines.length = Math.min(lines.length, 5);
    const h = 30 + lines.length * 36, top = 200 - h;
    g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 6;
    g.beginPath(); g.roundRect ? g.roundRect(12, top, 488, h, 28) : g.rect(12, top, 488, h); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(230, top + h - 3); g.lineTo(256, 246); g.lineTo(282, top + h - 3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(232, top + h - 8, 48, 8);
    g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, 256, top + 33 + i * 36));
    const tex = new T.CanvasTexture(cv);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false }));
    sp.scale.set(4, 2, 1);
    sp.renderOrder = 11;
    return { sprite: sp };
  };

  // ---------- Name tags ----------
  C.makeTag = function (name, home, sub, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const tex = new T.CanvasTexture(cv);
    const mat = new T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false });
    const sp = new T.Sprite(mat);
    sp.scale.set(2.6, 0.65, 1);
    sp.renderOrder = 10;
    // fight: draw crossed swords, for players who have fights (PvP) turned on.
    // mate: a teammate, drawn green with a star.
    const tag = { sprite: sp, hp: -1, fight: false, mate: false, draw(hp, fight, mate) {
      if (fight === undefined) fight = tag.fight;
      if (mate === undefined) mate = tag.mate;
      if (hp === tag.hp && fight === tag.fight && mate === tag.mate) return;
      tag.hp = hp; tag.fight = fight; tag.mate = mate;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 512, 128);
      g.font = '700 44px "Fredoka", "Trebuchet MS", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,0.85)';
      const label = (mate ? '★ ' : fight ? '⚔ ' : '') + name + (home ? '  ' + home : '');
      g.strokeText(label, 256, 42); g.fillStyle = mate ? '#7dffa0' : color || '#ffffff'; g.fillText(label, 256, 42);
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
