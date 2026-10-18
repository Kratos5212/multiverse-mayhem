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
  const RIM = new T.TorusGeometry(1, 0.075, 4, 22);

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
  // The sculpt is made for the canon colours and proportions; a customised character keeps the
  // built model so its colours and shape still show.
  function sculptFits(look, arch) {
    const L = MM.sanitizeLook(look), K = MM.canonLook(arch);
    for (const k of ['species', 'top', 'skin', 'topColor', 'shirtColor', 'pantsColor', 'hairColor', 'hair']) if (L[k] !== K[k]) return false;
    return Math.abs(L.height - K.height) < 0.02 && Math.abs(L.width - K.width) < 0.02 && Math.abs(L.head - K.head) < 0.02;
  }
  C.buildAvatar = function (look, arch, opts) {
    // Up close: smooth boxes on plain primitives (a few thousand triangles). Far: coarse.
    let av, lo;
    C.shapeMid = true;
    try { av = buildAvatarOnce(look, arch, opts); } finally { C.shapeMid = false; }
    C.shapeSmooth = false; C.shapeLo = true;
    try { lo = buildAvatarOnce(look, arch, opts); } finally { C.shapeSmooth = true; C.shapeLo = false; }
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
    // A sculpted body (scripts/models/) replaces the close-up model, part by part, for the
    // canon look. Far away it is still the simple one.
    const sc = C.sculpts[arch];
    if (sc && !(opts && opts.classic) && sculptFits(look, arch)) {
      for (const name in sc.parts) {
        const pivot = av.parts[name];
        if (!pivot) continue;
        for (const m of pivot.children.slice()) if (!joints.has(m) && av.lodNear.includes(m)) { pivot.remove(m); av.lodNear.splice(av.lodNear.indexOf(m), 1); }
        const g = C.meshOf(sc.parts[name], (opts && opts.thick) || 0.022);
        g.traverse(o => { o.userData.shared = true; });
        pivot.add(g); av.lodNear.push(g);
      }
      av.sculpted = true;
    }
    av.near = null;
    av.setDetail = near => {
      if (av.near === near) return;
      av.near = near;
      for (const m of av.lodNear) m.visible = near;
      for (const m of av.lodFar) m.visible = !near;
    };
    av.setDetail(true);
    // The realistic look: characters cast shadows (the ground, and everything else, takes them).
    if (C.style === 'real') av.root.traverse(o => { if (o.isMesh && o.material && o.material.side !== T.BackSide) o.castShadow = true; });
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
    // Pickle Rick: a bare pickle has no limbs at all (he rolls); the rat suit gives him rat legs
    // and rat arms, wired on.
    const rat = pickle && !!opts.ratsuit, limbless = pickle && !rat, RAT = '#8a7a6a';
    // Show proportions: long legs and noodle arms, so heads are about a fifth of a grown-up's
    // height (Morty, with his big head, is closer to a third).
    const legLen = (pickle ? (rat ? 0.46 : 0.1) : bean ? 0.55 : 0.84) * h;
    const legR = (rat ? 0.07 : bean ? 0.045 : blob ? 0.15 : 0.1) * w;
    const torsoLen = (blob ? 0.6 : 0.58) * h;
    const torsoR = (blob ? 0.42 : 0.22) * w;
    const armR = (rat ? 0.055 : bean ? 0.04 : blob ? 0.12 : 0.065) * w;
    const armLen = (bean ? 0.58 : 0.68) * h * (blob ? 1.1 : rat ? 0.85 : pickle ? 0.45 : 1);
    const pants = L.pantsColor, shoe = L.shoeColor, skin = L.skin;
    const top = L.top;
    const topC = top === 'none' ? skin : top === 'vest' ? L.shirtColor : (top === 'labcoat' ? L.shirtColor : L.topColor);

    // Legs. Up close they have knees (a thigh and a shin on their own joint); far away a
    // leg is one piece.
    const jointed = C.shapeSmooth !== false;
    const thighLen = legLen * 0.52;
    const shoeAt = (s, y) => {
      if (rat) { for (let i = -1; i <= 1; i++) s.add(P.cone, '#f0a8b0', [i * 0.035, y + 0.03, 0.09], [Math.PI / 2, 0, 0], [0.022, 0.12, 0.022]); s.add(P.sphereLo, RAT, [0, y + 0.04, 0.02], null, [0.07, 0.05, 0.1]); }
      else if (bean) s.add(P.sphereLo, shoe, [0, y + 0.05, 0.05], null, [0.07, 0.05, 0.11]);
      else { s.add(P.sphere, shoe, [0, y + 0.06, 0.07], null, [legR * 1.25, 0.08, 0.17]); s.add(P.box, shade(shoe, 0.6), [0, y + 0.012, 0.06], null, [legR * 2.2, 0.025, 0.3]); }
    };
    for (const side of [-1, 1]) {
      const s = new C.Shape();
      const legC = rat ? RAT : bean ? skin : pants;
      const hip = [side * (bean ? 0.12 : 0.11) * w * (blob ? 1.6 : 1), legLen, 0];
      if (limbless) { parts[side < 0 ? 'legL' : 'legR'] = mk(s, body, hip); continue; }
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
    let shoulderY, neckY, headR, rollR = 0.3, rollLen = 1;
    if (bean) {
      // A tall bean: body and head are one shape, the face sits near the top.
      // Pickle Rick is a long cucumber: slimmer and taller than a bean person.
      const bh = (pickle ? 1.4 : 1.15) * h, br = (pickle ? 0.27 : 0.33) * w;
      C.capsuleAt(ts, skin, br, bh, [0, legLen - 0.15, 0]);
      rollR = br; rollLen = bh;
      if (pickle) {
        // Warty bumps down the sides and back (never near the face), and a lighter belly.
        for (let i = 0; i < 26; i++) {
          const a = Math.PI * 0.35 + (i * 2.39996) % (Math.PI * 1.3), yy = legLen + 0.05 + (i / 26) * bh * 0.62;
          s_bump(ts, shade(skin, 0.82), Math.sin(a) * br * 0.97, yy, Math.cos(a) * br * 0.95);
        }
        ts.add(P.sphere, shade(skin, 1.2), [0, legLen + bh * 0.3, br * 0.42], null, [br * 0.7, bh * 0.3, br * 0.62]);
        ts.add(P.sphere, shade(skin, 0.75), [0, legLen - 0.15 + bh - br * 0.15, 0], null, [br * 0.35, br * 0.15, br * 0.35]);   // the stem end
        if (rat) {
          // The rat suit: a pink tail, rat-pelt straps, wires to the limbs and a couple of bolts.
          for (let i = 0; i < 6; i++) C.capsuleAt(ts, '#f0a8b0', 0.025, 0.2, [0, legLen - 0.05 + i * 0.03, -br - i * 0.15], [-1.2 + i * 0.15, 0, 0]);
          for (const y of [0.16, 0.4]) ts.add(P.cyl, RAT, [0, legLen + bh * y, 0], null, [br * 1.04, 0.07, br * 1.04]);
          for (const sx of [-1, 1]) {
            C.capsuleAt(ts, '#2a2a2a', 0.012, bh * 0.5, [sx * br * 0.95, legLen + bh * 0.05, -br * 0.3], [0, 0, -sx * 0.1]);
            ts.add(P.cyl, '#9aa3ab', [sx * br * 0.98, legLen + bh * 0.48, 0], [0, 0, Math.PI / 2], [0.04, 0.04, 0.04]);
          }
        }
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
        // The tails flare out and sit deep at the back, so a striding leg stays inside the coat
        // instead of poking through it; a darker lining shows where the coat is open.
        const tail = new T.CylinderGeometry(torsoR * 1.1, torsoR * 1.55, legLen * 0.62, 16, 1, true, 0.5, Math.PI * 2 - 1.0);
        ts.add(tail, coat, [0, legLen - legLen * 0.29, -0.05], null, [1, 1, 1.25]);
        const lining = tail.clone(); lining.scale(-0.96, 1, 0.96);
        ts.add(lining, shade(coat, 0.72), [0, legLen - legLen * 0.29, -0.05], null, [1, 1, 1.25]);
        tail.dispose(); lining.dispose();
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

    parts.torso = mk(ts, body);

    // Arms: sleeves follow the top.
    const sleeveC = top === 'none' ? skin : top === 'labcoat' ? L.topColor : top === 'vest' ? L.shirtColor : L.topColor;
    const sleeveLen = (top === 'tshirt' || top === 'polo' || top === 'vest') ? 0.35 : (top === 'none' || top === 'tank' || bean) ? 0 : 1;
    // Arms: an upper arm and, up close, a forearm on an elbow joint. The hand (and the gun)
    // ride on the forearm.
    const upLen = armLen * 0.5;
    const limbC = rat ? RAT : skin;
    const hand = (s, y, side) => {
      if (rat) {   // rat paws: little pink claws
        s.add(P.sphereLo, RAT, [0, y - 0.02, 0], null, [armR * 1.4, armR * 1.4, armR * 1.2]);
        for (let i = -1; i <= 1; i++) s.add(P.cone, '#f0a8b0', [i * armR * 0.6, y - armR * 1.6, armR * 0.3], [Math.PI - 0.3, 0, 0], [armR * 0.3, armR * 1.4, armR * 0.3]);
        return;
      }
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
      if (limbless) { parts[side < 0 ? 'armL' : 'armR'] = mk(s, body, [px, shoulderY, 0]); continue; }
      if (jointed) {
        const sl = armLen * sleeveLen * 0.92;
        // Same trick at the elbow: both halves (and long sleeves) end in a ball on the joint.
        const sr = armR * 1.35, su = Math.min(sl, upLen);
        C.capsuleAt(s, limbC, armR, upLen + 2 * armR, [0, -upLen - armR, 0]);
        if (sleeveLen > 0) C.capsuleAt(s, sleeveC, sr, su + 2 * sr, [0, -su - sr, 0]);
        const f = new C.Shape(), fl = armLen - upLen;
        C.capsuleAt(f, limbC, armR, fl + armR, [0, -fl, 0]);
        if (sl > upLen) C.capsuleAt(f, sleeveC, sr, sl - upLen + sr, [0, -(sl - upLen), 0]);
        hand(f, -fl, side);
        const sp = mk(s, body, [px, shoulderY, 0]);
        parts[side < 0 ? 'armL' : 'armR'] = sp;
        parts[side < 0 ? 'foreL' : 'foreR'] = mk(f, sp, [0, -upLen, 0]);
      } else {
        C.capsuleAt(s, limbC, armR, armLen, [0, -armLen, 0]);
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

    // Gromflomite wings: long, pale and veined, hinged at the shoulders; folded down the back
    // at rest, a buzzing blur in flight.
    if (species === 'insect') for (const sx of [-1, 1]) {
      const s = new C.Shape();
      s.add(P.sphere, '#cfe4ee', [0, -torsoLen * 0.42, 0], null, [torsoR * 0.42, torsoLen * 0.5, 0.025]);
      s.add(P.box, '#8fa8b8', [0, -torsoLen * 0.42, -0.02], null, [0.02, torsoLen * 0.9, 0.02]);
      parts[sx < 0 ? 'bugWingL' : 'bugWingR'] = mk(s, body, [sx * torsoR * 0.35, shoulderY, -torsoR * 1.0]);
    }
    // Wings for the winged
    if (species === 'birdfolk' || (A.fly && species !== 'insect')) {
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
      root, body, parts, look: L, arch, coat: top === 'labcoat', height: (neckY + headTop * 1.0 + headR) , phase: Math.random() * 6, attackT: 0, legLen, deadT: 0, t: Math.random() * 10,
      shield: null,
      animate(dt, st) { animate(av, dt, st); },
      dispose() {
        root.traverse(o => { if (o.isMesh && o.geometry && o.geometry !== C.prim.sphere && o.material !== undefined && !o.userData.shared) o.geometry.dispose(); });
        if (av.tag) { av.tag.material.map.dispose(); av.tag.material.dispose(); }
      },
    };
    av.shoulderY = shoulderY;
    // A bare Pickle Rick rolls like a log when he moves.
    if (limbless) { av.roller = true; av.rollR = rollR; av.rollLen = rollLen; av.rollBase = legLen - 0.15; }
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
    genius:     { slouch: 0.02, bounce: 0.7, swing: 0.55, stride: 0.85, jitter: 0, carry: 0.5, headDown: 0.04 },
    sidekick:   { slouch: 0.07, bounce: 1.25, swing: 0.6, stride: 0.95, jitter: 1, carry: 0.7 },
    teen:       { slouch: 0, bounce: 1.1, swing: 0.75, stride: 1.0, jitter: 0, carry: 0.6 },
    surgeon:    { slouch: -0.02, bounce: 0.9, swing: 0.6, stride: 0.95, jitter: 0, carry: 0.6 },
    joe:        { slouch: 0.05, bounce: 0.85, swing: 0.8, stride: 0.85, jitter: 0.4, carry: 0.5 },
    birdfolk:   { slouch: -0.05, bounce: 0.8, swing: 0.4, stride: 1.1, jitter: 0, carry: 0.3 },
    trooper:    { slouch: -0.04, bounce: 0.6, swing: 0.3, stride: 1.0, jitter: 0, carry: 0.9, march: 1 },
    meeseeks:   { slouch: -0.06, bounce: 1.6, swing: 1.0, stride: 1.0, jitter: 0, carry: 0.4 },
    evilmorty:  { slouch: 0.02, bounce: 0.7, swing: 0.35, stride: 0.9, jitter: 0, carry: 0.8 },
    picklerick: { slouch: 0, bounce: 1.4, swing: 1.0, stride: 1.2, jitter: 0, carry: 0.5 },
    spacebeth:  { slouch: -0.04, bounce: 0.8, swing: 0.5, stride: 1.05, jitter: 0, carry: 0.9 },
    squanchy:   { slouch: 0.08, bounce: 1.1, swing: 0.7, stride: 1.0, jitter: 0.2, carry: 0.5 },
  };
  function mkRag(dx, dz, power, av) {
    const l = Math.hypot(dx, dz) || 1;
    return { dx: dx / l, dz: dz / l, power, t: 0, dur: 0.8 + power * 0.9, seeds: Array.from({ length: 8 }, () => Math.random()) };
  }
  // Knock a character over: push direction (world x, z) and strength 0..1.
  C.ragdoll = function (av, dx, dz, power) {
    if (!av || av.inShip || av.roller) return;
    power = Math.max(0.2, Math.min(1, power));
    if (av.rag && av.rag.t < av.rag.dur * 0.5) { av.rag.power = Math.max(av.rag.power, power); return; }
    av.rag = mkRag(dx || Math.random() - 0.5, dz || Math.random() - 0.5, power, av);
  };
  C.hitReact = function (av, front) { if (av) { av.hitT = 0.3; av.hitDir = front === false ? -1 : 1; } };
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
    const seated = anim === MM.ANIM.sit || anim === MM.ANIM.ride;
    const f = Math.min(1, dt * 14);
    const ground = !air && !fly && !dead && !(anim === MM.ANIM.sit || anim === MM.ANIM.ride);

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
    if (emote) {
      const ek = st.ek || 0, t = av.t;
      if (ek === 0) { aRz = -2.6 + Math.sin(t * 12) * 0.3; aR = 0; eR = -0.5 + Math.sin(t * 12) * 0.4; headY = Math.sin(t * 6) * 0.25; }   // wave
      else if (ek === 1) {   // dance: hips, bounce, arms up in turn
        const b = Math.sin(t * 9);
        bob = Math.abs(b) * 0.12; roll = b * 0.12; twist = Math.sin(t * 4.5) * 0.35;
        aL = -2.4 + Math.max(0, b) * 0.8; aR = -2.4 + Math.max(0, -b) * 0.8; aLz = 0.5; aRz = -0.5; eL = eR = -0.6;
        lL = Math.max(0, b) * 0.4; lR = Math.max(0, -b) * 0.4; kL = lL * 1.2; kR = lR * 1.2; headY = b * 0.3;
      } else if (ek === 2) { tilt = -0.25 + Math.sin(t * 20) * 0.05; aL = -0.4; aR = -0.4; eL = eR = -1.6; aLz = 0.35; aRz = -0.35; headX = -0.4; bob = Math.abs(Math.sin(t * 20)) * 0.05; }   // laugh
      else if (ek === 3) { aR = -1.55; eR = -0.05; aRz = -0.1; twist = -0.2; }   // point
      else if (ek === 4) { aL = aR = -2.9 + Math.sin(t * 10) * 0.3; aLz = 0.3; aRz = -0.3; eL = eR = -0.2; bob = Math.abs(Math.sin(t * 10)) * 0.15; }   // cheer
      else if (ek === 5) { aR = -1.1; eR = -2.2; aRz = 0.15; headX = 0.35; tilt = 0.12; }   // facepalm
    }
    // Sitting (a bench, a couch, the ground) or riding: thighs forward, knees down.
    if (seated) {
      lL = lR = -1.45; kL = kR = 1.45; tilt = 0.02; roll = 0; twist = 0;
      bob = -(av.legLen || 0.9) * 0.5;
      if (anim === MM.ANIM.ride) { const up = st.armsUp ? 1 : 0; aL = aR = up ? -2.8 : -0.9; eL = eR = up ? -0.2 : -0.8; aLz = 0.25; aRz = -0.25; }
      else if (av.inCar) { aL = aR = -1.15; eL = eR = -0.45; aLz = 0.12; aRz = -0.12; }   // hands on the wheel
      else { aL = aR = -0.5; eL = eR = -0.7; aLz = 0.15; aRz = -0.15; }
    }
    // Strong-arm Morty: the arm leads and Morty is dragged along behind her, leaning after her;
    // standing still, she hangs heavy and pulls him over to that side.
    if (av.strongArm && !seated && !dead && !emote) {
      if (k > 0.1) { aR = -1.5 + Math.sin(av.t * 9) * 0.07; aRz = -0.05; eR = -0.05; tilt += 0.3; twist = -0.32; headX -= 0.15; lL *= 0.7; lR *= 0.7; }
      else { aR = 0.12; aRz = -0.22; eR = -0.12; roll += 0.1; tilt += 0.08; }
    }
    // Shooting: the gun arm snaps up to aim and kicks back. Melee: a big swing.
    if (av.attackT > 0) {
      av.attackT -= dt;
      const melee = MM.WEAPONS[MM.ARCHETYPES[av.arch] ? MM.ARCHETYPES[av.arch].weapon : 'blaster'].melee;
      const u = 1 - Math.max(0, av.attackT) / 0.3;
      if (av.strongArm) { aR = -1.5; aRz = 0; eR = lerp(-1.9, 0, Math.min(1, u * 1.7)); twist = lerp(0.35, -0.5, u); }   // her punch: a straight jab
      else if (melee) { aR = lerp(-2.6, 0.7, u); eR = lerp(-1.2, -0.1, u); twist = lerp(0.5, -0.4, u); }
      else { aR = -1.45 - Math.sin(u * Math.PI) * 0.25; eR = -0.05 - Math.sin(u * Math.PI) * 0.35; twist = -0.15; }
    }
    // Landing squash and take-off stretch.
    if (av.wasAir && ground) av.squash = 1;
    if (!av.wasAir && air) av.stretch = 1;
    av.wasAir = air;
    av.squash = Math.max(0, (av.squash || 0) - dt * 5);
    av.stretch = Math.max(0, (av.stretch || 0) - dt * 4);
    if (av.squash > 0) { kL += av.squash * 0.7; kR += av.squash * 0.7; lL -= av.squash * 0.35; lR -= av.squash * 0.35; bob -= av.squash * 0.12; }

    // Floppy follow-through: arms, head and torso lag behind when the body speeds up, stops
    // or turns, then spring back (a damped spring driven by the body's acceleration).
    const rp = av.root.position;
    if (av.prevPos && dt > 0 && dt < 0.1) {
      const vx = (rp.x - av.prevPos.x) / dt, vz = (rp.z - av.prevPos.z) / dt;
      if (Math.hypot(vx, vz) < 40) {
        const ry = av.root.rotation.y, fwdV = vx * Math.sin(ry) + vz * Math.cos(ry), sideV = vx * Math.cos(ry) - vz * Math.sin(ry);
        const af = (fwdV - (av.pfV || 0)) / dt, as = (sideV - (av.psV || 0)) / dt;
        av.pfV = fwdV; av.psV = sideV;
        const tf = clamp(-af * 0.012, -0.6, 0.6), ts2 = clamp(as * 0.008, -0.4, 0.4);
        av.lagV = (av.lagV || 0) + ((tf - (av.lag || 0)) * 90 - (av.lagV || 0) * 9) * dt; av.lag = (av.lag || 0) + av.lagV * dt;
        av.sLagV = (av.sLagV || 0) + ((ts2 - (av.sLag || 0)) * 90 - (av.sLagV || 0) * 9) * dt; av.sLag = (av.sLag || 0) + av.sLagV * dt;
      }
    }
    av.prevPos = av.prevPos || new T.Vector3(); av.prevPos.copy(rp);
    const lag = av.lag || 0, sLag = av.sLag || 0;
    aL += lag * 1.4; aR += av.attackT > 0 ? 0 : lag * 1.4; aLz += sLag; aRz += sLag; headX += lag * 0.5; twist += sLag * 0.4;
    // Getting hit: a jolt through the body.
    if (av.hitT > 0) { av.hitT -= dt; const k2 = Math.max(0, av.hitT) / 0.3; tilt -= k2 * 0.5 * (av.hitDir || 1); headX -= k2 * 0.8; aL -= k2 * 0.9; aR -= k2 * 0.9; aLz += k2 * 0.4; aRz -= k2 * 0.4; }
    const set = (o, ax, v, sharp) => { if (o) o.rotation[ax] = sharp ? v : lerp(o.rotation[ax], v, f); };
    // In a long coat the legs swing back less (Rick shuffles; the coat would split otherwise).
    if (av.coat && ground) { lL = Math.min(lL, 0.24); lR = Math.min(lR, 0.24); }
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
    if (p.bugWingL) {
      const buzz = fly ? Math.sin(av.t * 60) * 0.5 : air ? Math.sin(av.t * 30) * 0.3 : 0;
      const open = fly ? 1.3 : air ? 0.7 : 0.18;
      p.bugWingL.rotation.z = -open + buzz; p.bugWingR.rotation.z = open - buzz;
      p.bugWingL.rotation.x = p.bugWingR.rotation.x = fly ? -0.6 : 0.12;
    }
    p.head.rotation.y = lerp(p.head.rotation.y, headY - twist * 0.6, f);
    if (av.jet) { av.jet.flame.visible = fly; av.jet.flame.scale.y = 0.8 + Math.random() * 0.4; }
    if (av.car && av.inCar) for (const w of av.car.userData.wheels) w.rotation.x += speed * dt / 0.45;
    if (av.inShip) { tilt = 0; roll = clamp(-av.turn * 0.05, -0.3, 0.3); bob = Math.sin(av.t * 3) * 0.04; }   // seated at the controls (MM.ANIM.sit)
    if (dead) av.deadT = Math.min(1, av.deadT + dt * 3); else { av.deadT = Math.max(0, av.deadT - dt * 4); if (!av.deadT) av.deadRag = null; }
    const D = av.deadT;
    av.body.rotation.x = lerp(av.body.rotation.x, tilt, f);
    av.body.rotation.z = lerp(av.body.rotation.z, roll, f);
    av.body.position.y = lerp(av.body.position.y, bob, f);
    av.body.position.z = 0;
    // Ragdoll: knocked over (explosions, slams, big falls) or dead. The body topples in the
    // push direction while the limbs flail, then (if alive) gets back up.
    let RW = 0;
    if (av.rag) { av.rag.t += dt; const u = av.rag.t / av.rag.dur; if (u >= 1) av.rag = null; else RW = u < 0.55 ? Math.min(1, u / 0.1) : 1 - (u - 0.55) / 0.45; }
    if (D > 0 && !av.deadRag) { const a = Math.random() * Math.PI * 2; av.deadRag = mkRag(Math.sin(a), Math.cos(a), 1, av); }
    const rg = D > RW ? av.deadRag : av.rag, w = Math.max(RW, D);
    if (rg && w > 0.001 && !av.inShip && !av.roller) {
      rg.t2 = (rg.t2 || 0) + dt;
      const t2 = D > RW ? Math.min(rg.t2, 0.9) : rg.t2, S = rg.seeds, fl = (i, fq) => Math.sin(t2 * fq + S[i] * 6.28);
      const mix = (o, ax, v) => { if (o) o.rotation[ax] = o.rotation[ax] * (1 - w) + v * w; };
      mix(p.armL, 'x', -1.4 + fl(0, 9) * 0.9); mix(p.armR, 'x', -1.4 + fl(1, 8) * 0.9);
      mix(p.armL, 'z', 1.2 + fl(2, 6) * 0.5); mix(p.armR, 'z', -1.2 - fl(3, 7) * 0.5);
      mix(p.foreL, 'x', -0.4 + fl(4, 10) * 0.5); mix(p.foreR, 'x', -0.4 + fl(5, 11) * 0.5);
      mix(p.legL, 'x', fl(6, 8) * 0.8); mix(p.legR, 'x', fl(7, 7) * 0.8);
      mix(p.legL, 'z', -0.35); mix(p.legR, 'z', 0.35);
      mix(p.shinL, 'x', 0.6 + fl(0, 9) * 0.4); mix(p.shinR, 'x', 0.6 + fl(1, 9) * 0.4);
      mix(p.head, 'x', fl(2, 5) * 0.5); mix(p.head, 'y', fl(3, 4) * 0.6);
      // Topple in the push direction (local frame), with a little bounce on the way down.
      const ry = av.root.rotation.y, lx = rg.dx * Math.cos(ry) - rg.dz * Math.sin(ry), lz = rg.dx * Math.sin(ry) + rg.dz * Math.cos(ry);
      const fall = 1.45 * Math.min(1, w * 1.15) + Math.sin(Math.min(1, rg.t2 * 2.2) * Math.PI) * 0.12 * rg.power;
      av.body.rotation.x = av.body.rotation.x * (1 - w) + fall * lz;
      av.body.rotation.z = av.body.rotation.z * (1 - w) - fall * lx;
      av.body.position.y = av.body.position.y * (1 - w) + w * 0.32;
    }
    if (av.roller) {
      // Lie down along the left-right axis and roll forward; stand up again when stopped.
      av.lie = lerp(av.lie || 0, ground && speed > 0.5 ? 1 : 0, Math.min(1, dt * 7));
      av.rollA = (av.rollA || 0) + speed * dt / Math.max(0.1, av.rollR);
      const L = av.lie;
      av.body.rotation.set(av.rollA * (L > 0.5 ? 1 : 0), 0, L * Math.PI / 2);
      av.body.position.set(L * (av.rollBase + av.rollLen / 2), L * av.rollR + (1 - L) * bob, 0);
    }
    const sq = av.squash * 0.14 - av.stretch * 0.1;
    av.body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    // Effects
    const fx = st.fx || 0;
    const sc = ((fx & 16384) ? MM.TINY.scale : ((fx & 8) ? 0.5 : 1) * ((fx & 32768) ? MM.TINYRICK.scale : 1)) * (av.baseScale || 1);   // tiny (the Miniaturizer), shrunk, or Tiny Rick   // tiny (the Miniaturizer), or shrunk
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
    // Rick's robot limbs: steel shells over the arm and legs, with glowing joints.
    const shell = (part, len, r, at) => {
      if (!part) return;
      const s = new C.Shape();
      C.capsuleAt(s, '#9aa3ab', r, len, [0, -len, 0]);
      for (let i = 1; i < 3; i++) s.add(P.cyl, '#59606e', [0, -len * i / 3, 0], null, [r * 1.08, 0.025, r * 1.08]);
      s.add(P.sphere, '#5ff8ff', [0, -0.02, r * 0.8], null, [r * 0.35, r * 0.35, r * 0.2], true);
      const m = C.meshOf(s.build(), 0.03);
      if (at) m.position.y = at;
      part.add(m);
      (av.cyber || (av.cyber = [])).push(m);
    };
    const L = av.look || {}, w = L.width || 1, h = L.height || 1;
    if (gear.cyberarm && !av.cyberArm) { av.cyberArm = true; shell(av.parts.armR, 0.68 * h * 0.5, 0.07 * w * 1.25); shell(av.parts.foreR, 0.68 * h * 0.5 * 0.9, 0.07 * w * 1.2); }
    // Strong-arm Morty: a huge arm sewn on at the shoulder, from a dead fighter of the Ring of Death.
    if (gear.strongarm && !av.strongArm && av.parts.armR && av.parts.foreR) {
      av.strongArm = true;
      const up = Math.abs(av.parts.foreR.position.y) || 0.3, skin = '#d39a6e', vein = '#b8785a';
      const a = new C.Shape();
      C.capsuleAt(a, skin, 0.105, up + 0.04, [0, -up - 0.02, 0]);
      a.add(P.sphere, skin, [0.01, -up * 0.52, 0.06], null, [0.15, 0.2, 0.15]);             // the biceps
      a.add(P.sphere, skin, [-0.02, -up * 0.4, -0.05], null, [0.13, 0.17, 0.12]);           // the triceps
      a.add(P.sphere, skin, [0.04, -0.03, 0], null, [0.15, 0.13, 0.15]);                    // the shoulder
      const fa = new C.Shape(), lo = up * 1.05;
      C.capsuleAt(fa, skin, 0.11, lo, [0, -lo, 0]);
      fa.add(P.sphere, skin, [0, -lo * 0.32, 0.02], null, [0.17, 0.22, 0.165]);             // forearm, Popeye-size
      fa.add(P.capsule, vein, [0.06, -lo * 0.45, 0.1], [0.2, 0, 0.3], [0.02, 0.18, 0.02]);  // a vein
      fa.add(P.sphere, skin, [0, -lo - 0.02, 0.02], null, [0.15, 0.14, 0.16]);              // the fist
      for (let i = 0; i < 4; i++) fa.add(P.sphereLo, vein, [-0.075 + i * 0.05, -lo - 0.06, 0.12], null, [0.03, 0.03, 0.025]);   // knuckles
      const joints = new Set(Object.values(av.parts));
      // Her fist replaces Morty's hand, and his gun: his own forearm goes (until she lets go).
      av.armHidden = av.parts.foreR.children.filter(m => !joints.has(m)).map(m => {
        const near = av.lodNear.indexOf(m), far = av.lodFar.indexOf(m);
        if (near >= 0) av.lodNear.splice(near, 1);
        if (far >= 0) av.lodFar.splice(far, 1);
        m.visible = false;
        return [m, near >= 0 ? 1 : far >= 0 ? 2 : 0];
      });
      const ma = C.meshOf(a.build(), 0.03), mf = C.meshOf(fa.build(), 0.03);
      av.parts.armR.add(ma); av.parts.foreR.add(mf);
      av.strongArmMeshes = [ma, mf];
    }
    if (!gear.strongarm && av.strongArm && av.strongArmMeshes) {
      av.strongArm = false;
      for (const m of av.strongArmMeshes) m.parent.remove(m);
      for (const [m, list] of av.armHidden) {
        if (list === 1) av.lodNear.push(m); else if (list === 2) av.lodFar.push(m);
        m.visible = list === 1 ? av.near !== false : list === 2 ? av.near === false : true;
      }
      av.strongArmMeshes = av.armHidden = null;
    }
    if (gear.cyberlegs && !av.cyberLegs) { av.cyberLegs = true; for (const k of ['legL', 'legR']) shell(av.parts[k], 0.84 * h * 0.52, 0.1 * w * 1.15); for (const k of ['shinL', 'shinR']) shell(av.parts[k], 0.84 * h * 0.44, 0.1 * w * 1.1); }
    av.gear = gear;
  };
  // A Death Stalker car round the character, who sits in it (the seated pose): rusty, open-topped,
  // spikes on the ram bar and the hubcaps, a skull on the grille, twin guns on the hood, a roll
  // bar behind the driver and flaming exhaust pipes. Front = +z.
  C.carModel = function () {
    const s = new C.Shape(), rust = '#8a3a1e', dark = '#5a2a16', steel = '#9aa0a6', black = '#1e1e22';
    s.add(P.box, rust, [0, 0.62, 0.45], null, [1.9, 0.5, 4.1]);                     // the body
    s.add(P.box, dark, [0, 0.98, 1.65], null, [1.75, 0.26, 1.6]);                   // the hood
    s.add(P.box, steel, [0, 1.22, 1.55], null, [0.62, 0.3, 0.6]);                   // the blower
    for (const x of [-0.18, 0.18]) s.add(P.cyl, steel, [x, 1.5, 1.55], null, [0.09, 0.3, 0.09]);
    s.add(P.box, dark, [0, 0.98, -1.05], null, [1.85, 0.28, 1.0]);                  // the rear deck
    for (const x of [-0.92, 0.92]) s.add(P.box, rust, [x, 1.02, 0.25], null, [0.12, 0.36, 1.5]);   // the cockpit sides
    for (const [x, z] of [[-1.0, 1.75], [1.0, 1.75], [-1.0, -0.95], [1.0, -0.95]]) {
      s.add(P.cone, '#c8c8c8', [x * 1.18, 0.45, z], [0, 0, -Math.sign(x) * Math.PI / 2], [0.07, 0.35, 0.07]);   // hubcap spikes
    }
    s.add(P.box, steel, [0, 0.55, 2.55], null, [2.1, 0.24, 0.14]);                  // the ram bar
    for (let i = 0; i < 6; i++) s.add(P.cone, '#c8c8c8', [-0.9 + i * 0.36, 0.55, 2.8], [Math.PI / 2, 0, 0], [0.07, 0.42, 0.07]);
    s.add(P.sphere, '#e8e0d0', [0, 0.86, 2.55], null, [0.22, 0.2, 0.12]);           // the skull
    for (const x of [-0.08, 0.08]) s.add(P.sphereLo, '#111111', [x, 0.9, 2.65], null, [0.05, 0.05, 0.03]);
    for (const x of [-0.36, 0.36]) s.add(P.cyl, '#2a2a2e', [x, 1.28, 2.35], [Math.PI / 2, 0, 0], [0.07, 0.9, 0.07]);   // the guns
    for (const x of [-0.8, 0.8]) s.add(P.box, '#4a4a50', [x, 1.55, -0.5], null, [0.09, 1.0, 0.09]);   // the roll bar
    s.add(P.box, '#4a4a50', [0, 2.05, -0.5], null, [1.7, 0.09, 0.09]);
    for (const x of [-0.65, 0.65]) s.add(P.cyl, '#59606e', [x, 1.05, -1.75], [Math.PI / 2, 0, 0], [0.1, 0.5, 0.1]);   // exhausts
    for (const x of [-0.65, 0.65]) s.add(P.cone, '#ffb03a', [x, 1.05, -2.15], [-Math.PI / 2, 0, 0], [0.09, 0.4, 0.09], true);
    const body = C.meshOf(s.build(), 0.04);
    const root = new T.Group(); root.add(body);
    const wheels = [];
    for (const [x, z] of [[-1.0, 1.75], [1.0, 1.75], [-1.0, -0.95], [1.0, -0.95]]) {
      const w = new C.Shape();
      w.add(P.cyl, black, [0, 0, 0], [0, 0, Math.PI / 2], [0.45, 0.38, 0.45]);
      w.add(P.box, '#7a7a7a', [0, 0, 0], null, [0.4, 0.5, 0.1]);   // a hub you can see turn
      const m = C.meshOf(w.build(), 0.03);
      m.position.set(x, 0.45, z);
      root.add(m); wheels.push(m);
    }
    root.userData.wheels = wheels;
    return root;
  };
  C.setCar = function (av, on) {
    if (on && !av.car) { av.car = C.carModel(); av.root.add(av.car); }
    if (av.car) av.car.visible = !!on;
    av.inCar = !!on;
  };
  // ---------- Ships (MM.SHIPS): one for each kind of character ----------
  // Built around the pilot's seat at the origin (seated, facing +z); passengers' seats are
  // where MM.SHIPS says. Everybody sits at about y 0.5.
  function seatBox(s, x, y, z, col) { s.add(P.box, col, [x, y + 0.32, z - 0.05], null, [0.62, 0.14, 0.6]); s.add(P.box, col, [x, y + 0.75, z - 0.38], [-0.15, 0, 0], [0.62, 0.8, 0.14]); }
  C.shipModel = function (kind, gear, look) {
    const s = new C.Shape(), K = MM.SHIPS[kind] || MM.SHIPS.saucer, glass = '#7ad8ff';
    const lasers = (x, y, z) => { if (gear && gear.lasers) for (const sx of [-1, 1]) s.add(P.cyl, '#3a3f4a', [x + sx * 0.25, y, z], [Math.PI / 2, 0, 0], [0.08, 0.9, 0.08]); };
    if (kind === 'cruiser') {
      // Rick's space cruiser: a battered grey-teal flying car with an open top, a big
      // windscreen, tail fins, twin thrusters and junk in the back.
      const hull = '#8fa7ac', dark = '#5a6a70', trim = '#c8d0d2';
      s.add(P.sphere, hull, [0.45, 0.22, -0.35], null, [1.55, 0.5, 2.5]);
      s.add(P.box, dark, [0.45, 0.42, -0.45], null, [1.9, 0.12, 2.6]);                  // the open cockpit floor
      for (const sx of [-1, 1]) s.add(P.box, hull, [0.45 + sx * 1.05, 0.6, -0.4], null, [0.16, 0.42, 2.5]);   // its sides
      s.add(P.box, trim, [0.45, 0.76, -0.4], null, [2.3, 0.06, 2.7]);
      s.add(P.box, glass, [0.45, 1.05, 0.95], [-0.5, 0, 0], [1.9, 0.75, 0.05], true);  // windscreen
      s.add(P.box, '#3a3f4a', [0.45, 0.75, 0.75], null, [1.7, 0.25, 0.35]);             // dashboard
      s.add(P.cyl, '#2a2a2e', [0, 0.85, 0.55], [1.1, 0, 0], [0.22, 0.04, 0.22]);        // steering wheel
      for (const sx of [-1, 1]) {
        s.add(P.box, '#c83a2a', [0.45 + sx * 0.75, 0.75, -2.35], [0.3, 0, 0], [0.12, 0.7, 0.6]);   // tail fins
        s.add(P.cyl, '#59606e', [0.45 + sx * 0.5, 0.25, -2.75], [Math.PI / 2, 0, 0], [0.26, 0.5, 0.26]);
        s.add(P.cone, '#5dff8a', [0.45 + sx * 0.5, 0.25, -3.15], [-Math.PI / 2, 0, 0], [0.22, 0.6, 0.22], true);   // green exhaust
        s.add(P.sphereLo, '#fff4b0', [0.45 + sx * 0.7, 0.3, 2.05], null, [0.16, 0.12, 0.08], true);                // headlights
      }
      for (const [x, z, c] of [[0.1, -2.0, '#5dff8a'], [0.45, -2.1, '#ff6fd0'], [0.8, -1.95, '#ffd84d']]) s.add(P.cyl, c, [x, 0.75, z], null, [0.1, 0.3, 0.1], true);   // beakers in the back
      seatBox(s, 0, 0.1, 0, '#6a4a2a'); seatBox(s, 0.9, 0.1, 0, '#6a4a2a');
      lasers(0.45, 0.2, 1.9);
    } else if (kind === 'gunship') {
      // Space Beth's gunship: a sleek dark-green fighter, swept wings, a tandem canopy.
      const g = '#3e5a46', d = '#24342a';
      s.add(P.sphere, g, [0, 0.25, -0.4], null, [0.9, 0.45, 3.0]);
      s.add(P.cone, g, [0, 0.25, 2.9], [Math.PI / 2, 0, 0], [0.55, 1.2, 0.4]);
      for (const sx of [-1, 1]) {
        s.add(P.box, d, [sx * 1.7, 0.2, -1.0], [0, sx * 0.5, 0], [2.6, 0.1, 1.2]);
        s.add(P.cyl, '#3a3f4a', [sx * 2.6, 0.2, -0.6], [Math.PI / 2, 0, 0], [0.12, 1.4, 0.12]);   // wing guns
        s.add(P.cone, '#ff9a3a', [sx * 0.45, 0.25, -3.5], [-Math.PI / 2, 0, 0], [0.25, 0.7, 0.25], true);
      }
      s.add(P.sphere, glass, [0, 0.75, -0.6], null, [0.55, 0.45, 1.6], true);
      s.add(P.box, '#ffd84d', [0, 0.5, 1.6], null, [0.05, 0.25, 0.9]);   // a resistance stripe
      seatBox(s, 0, 0.05, 0, '#2a2a2e'); seatBox(s, 0, 0.35, -1.4, '#2a2a2e');
    } else if (kind === 'fedship') {
      // A Federation cruiser: white and blue, an insect-eye canopy, four seats.
      s.add(P.sphere, '#e8eef4', [0, 0.2, -0.5], null, [2.2, 0.45, 2.4]);
      s.add(P.torus, '#3c6fb5', [0, 0.35, -0.5], [Math.PI / 2, 0, 0], [2.0, 2.2, 0.6]);
      s.add(P.hemi, glass, [0, 0.55, -0.5], null, [1.6, 1.2, 1.7], true);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.sphereLo, '#ffd84d', [Math.cos(a) * 2.05, 0.3, -0.5 + Math.sin(a) * 2.2], null, [0.12, 0.08, 0.12], true); }
      for (const [x, z] of [[0, 0], [-1.0, -0.7], [1.0, -0.7], [0, -1.4]]) seatBox(s, x, 0.05, z, '#3c6fb5');
      lasers(0, 0.2, 1.8);
    } else if (kind === 'blackship') {
      // Evil Morty's ship: black, angular, gold trim.
      s.add(P.box, '#18181c', [0.45, 0.25, -0.3], null, [2.0, 0.5, 3.6]);
      s.add(P.cone, '#18181c', [0.45, 0.25, 2.1], [Math.PI / 2, Math.PI / 4, 0], [1.2, 1.2, 0.35]);
      for (const sx of [-1, 1]) { s.add(P.box, '#18181c', [0.45 + sx * 1.6, 0.35, -1.1], [0, 0, sx * 0.4], [1.4, 0.1, 1.6]); s.add(P.box, '#ffd84d', [0.45 + sx * 1.02, 0.52, -0.3], null, [0.05, 0.06, 3.5], true); }
      s.add(P.box, glass, [0.45, 0.9, 0.9], [-0.6, 0, 0], [1.7, 0.6, 0.05], true);
      s.add(P.cone, '#ffd84d', [0.45, 0.25, -2.4], [-Math.PI / 2, 0, 0], [0.4, 0.8, 0.4], true);
      seatBox(s, 0, 0.1, 0, '#2a2a2e'); seatBox(s, 0.9, 0.1, 0, '#2a2a2e');
      lasers(0.45, 0.25, 1.9);
    } else if (kind === 'minivan') {
      // Jerry's rocket minivan: a beige family minivan with two big rockets bolted on.
      const beige = '#d8c8a0';
      s.add(P.box, beige, [0.47, 0.3, -1.0], null, [2.0, 0.55, 4.6]);
      s.add(P.box, beige, [0.47, 1.25, -1.25], null, [1.95, 0.9, 3.6]);
      s.add(P.box, glass, [0.47, 1.25, 0.58], [-0.35, 0, 0], [1.8, 0.75, 0.05], true);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) s.add(P.box, glass, [0.47 + sx * 0.99, 1.3, 0.1 - i * 1.15], null, [0.04, 0.55, 0.9], true);
      for (const sx of [-1, 1]) {
        s.add(P.cyl, '#c8c8c8', [0.47 + sx * 1.35, 0.6, -1.4], [Math.PI / 2, 0, 0], [0.35, 2.8, 0.35]);
        s.add(P.cone, '#c83a2a', [0.47 + sx * 1.35, 0.6, 0.25], [Math.PI / 2, 0, 0], [0.35, 0.6, 0.35]);
        s.add(P.cone, '#ffb03a', [0.47 + sx * 1.35, 0.6, -3.1], [-Math.PI / 2, 0, 0], [0.3, 0.9, 0.3], true);
      }
      s.add(P.box, '#ffffff', [0.47, 0.75, -3.31], null, [1.0, 0.25, 0.03]);   // a "MY SON IS ON THE HONOR ROLL" sticker
      for (const [x, z] of MM.SHIPS.minivan.seats.map(q => [q[0], q[2]])) seatBox(s, x, 0.1, z, '#7a6a5a');
    } else if (kind === 'pinkship') {
      // Summer's hover-coupe: pink, low, a bubble top, very much not her grandpa's.
      s.add(P.sphere, '#f68fb8', [0.45, 0.25, -0.2], null, [1.4, 0.45, 2.3]);
      s.add(P.hemi, glass, [0.45, 0.55, -0.1], null, [1.15, 0.9, 1.3], true);
      for (const sx of [-1, 1]) { s.add(P.torus, '#ffffff', [0.45 + sx * 1.15, 0.1, -0.2], [0, Math.PI / 2, 0], [0.45, 0.45, 0.4], true); }
      s.add(P.cone, '#ff6fd0', [0.45, 0.25, -2.4], [-Math.PI / 2, 0, 0], [0.35, 0.7, 0.35], true);
      seatBox(s, 0, 0.05, 0, '#f4f4f0'); seatBox(s, 0.9, 0.05, 0, '#f4f4f0');
    } else if (kind === 'mortyship') {
      // Morty's starter pod: small, yellow, patched up with tape.
      s.add(P.sphere, '#f8e04a', [0, 0.25, -0.5], null, [0.95, 0.5, 1.8]);
      s.add(P.hemi, glass, [0, 0.6, -0.4], null, [0.8, 0.75, 1.3], true);
      for (const [x, z] of [[0.6, 0.6], [-0.5, -1.4]]) s.add(P.box, '#c8c8c8', [x, 0.5, z], [0, 0.5, 0], [0.5, 0.05, 0.15]);   // tape
      s.add(P.cone, '#ffb03a', [0, 0.25, -2.35], [-Math.PI / 2, 0, 0], [0.3, 0.6, 0.3], true);
      seatBox(s, 0, 0.05, 0, '#2e5fa8'); seatBox(s, 0, 0.25, -1.15, '#2e5fa8');
    } else if (kind === 'bethship') {
      // Beth's flying horse ambulance: white, a red stripe and a red cross, room for a horse.
      s.add(P.box, '#f4f4f0', [0.47, 0.35, -0.6], null, [2.0, 0.6, 3.8]);
      s.add(P.box, '#f4f4f0', [0.47, 1.2, -1.5], null, [2.0, 1.1, 2.0]);
      for (const sx of [-1, 1]) { s.add(P.box, '#c8273a', [0.47 + sx * 1.01, 0.75, -0.6], null, [0.03, 0.2, 3.8]); s.add(P.box, '#c8273a', [0.47 + sx * 1.01, 1.3, -1.5], null, [0.03, 0.6, 0.18]); s.add(P.box, '#c8273a', [0.47 + sx * 1.01, 1.3, -1.5], null, [0.03, 0.18, 0.6]); }
      s.add(P.box, glass, [0.47, 0.95, 0.9], [-0.5, 0, 0], [1.8, 0.6, 0.05], true);
      s.add(P.sphereLo, '#ff3a3a', [0.47, 1.85, -0.6], null, [0.2, 0.15, 0.2], true);   // the light
      s.add(P.cone, '#ffb03a', [0.47, 0.35, -2.8], [-Math.PI / 2, 0, 0], [0.35, 0.7, 0.35], true);
      for (const q of MM.SHIPS.bethship.seats) seatBox(s, q[0], 0.1 + q[1], q[2], '#c8273a');
    } else {
      // The classic flying saucer, in your portal colour.
      const c = (look && look.portalColor) || '#5ff8ff';
      s.add(P.sphere, '#c9cfd6', [0, 0.25, -0.2], null, [2.3, 0.42, 2.3]);
      s.add(P.cyl, '#8f97a0', [0, 0.05, -0.2], null, [1.2, 0.3, 1.2]);
      s.add(P.hemi, glass, [0, 0.55, -0.2], null, [1.7, 1.2, 1.7], true);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.sphereLo, i % 2 ? '#ff6fd0' : c, [Math.cos(a) * 1.95, 0.3, -0.2 + Math.sin(a) * 1.95], null, [0.14, 0.1, 0.14], true); }
      for (const q of MM.SHIPS.saucer.seats) seatBox(s, q[0], 0.05, q[2], '#59606e');
      lasers(0, 0.2, 1.8);
    }
    if (gear && gear.engine) s.add(P.cyl, '#ffb03a', [0, -0.12, -0.3], null, [0.9, 0.08, 0.9], true);   // the Turbo Engine glow
    const m = C.meshOf(s.build(), 0.04);
    m.userData.kind = kind;
    return m;
  };
  // In your ship: seated at its controls.
  C.setShip = function (av, on, gear, kind) {
    kind = kind || MM.shipKind(av.arch);
    if (on && (!av.ship || av.ship.userData.kind !== kind)) {
      if (av.ship) av.root.remove(av.ship);
      av.ship = C.shipModel(kind, gear, av.look);
      av.root.add(av.ship);
    }
    if (av.ship) av.ship.visible = !!on;
    if (av.crewGroup) av.crewGroup.visible = !!on;
    av.inShip = !!on;
  };
  // Locals riding along (the Summer a Rick took on an adventure): seated in their seats.
  C.setShipCrew = function (av, rows, kind) {
    if (av.crewGroup) { av.root.remove(av.crewGroup); av.crewGroup = null; }
    av.crew = [];
    if (!rows || !rows.length) return;
    av.crewGroup = C.crewGroup(rows, kind || MM.shipKind(av.arch), av.crew);
    av.crewGroup.visible = !!av.inShip;
    av.root.add(av.crewGroup);
  };
  C.crewGroup = function (rows, kind, list) {
    const g = new T.Group();
    for (const [arch, origin, seat] of rows) {
      if (!MM.ARCHETYPES[arch]) continue;
      const a = C.buildAvatar(MM.castLook(arch, origin), arch), q = MM.seatAt(kind, seat, 0, 0, 0, 0);
      a.root.position.set(q.x, q.y, q.z);
      g.add(a.root); list.push(a);
    }
    return g;
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
