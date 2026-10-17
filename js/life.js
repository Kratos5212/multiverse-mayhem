// Multiverse Mayhem: life around you. Birds over every open world, fish in the water,
// animals in the woods, and traffic on Earth's roads. All of it is scenery, drawn by each
// client on its own: it never touches the game state.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC || (window.MMC = {});
  const P = C.prim;

  const TREES = new Set(['tree', 'cherrytree', 'jungletree', 'seedtree', 'cottontree', 'fern', 'featherplant', 'fungus', 'mushroom', 'kelp']);
  const cache = {};
  const model = (key, build, thick) => {
    if (!cache[key]) { const s = new C.Shape({ smooth: false }); build(s); cache[key] = s.build(); }
    return C.meshOf(cache[key], thick === undefined ? 0.025 : thick);
  };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Models ----------
  const birdBody = (s, col) => {
    s.add(P.sphereLo, col, [0, 0, 0], null, [0.14, 0.12, 0.32]);
    s.add(P.sphereLo, col, [0, 0.06, 0.28], null, [0.1, 0.1, 0.1]);
    s.add(P.cone, '#e8a83a', [0, 0.05, 0.4], [Math.PI / 2, 0, 0], [0.03, 0.08, 0.03]);
    s.add(P.cone, col, [0, 0, -0.36], [-Math.PI / 2, 0, 0], [0.1, 0.2, 0.04]);
  };
  const wing = (s, col) => s.add(P.box, col, [0.32, 0, 0], null, [0.62, 0.03, 0.24]);
  const fishBody = (s, col, stripe) => {
    s.add(P.sphereLo, col, [0, 0, 0], null, [0.1, 0.16, 0.36]);
    s.add(P.cone, col, [0, 0, -0.42], [-Math.PI / 2, 0, 0], [0.03, 0.16, 0.14]);
    s.add(P.box, stripe, [0, 0, 0.05], null, [0.205, 0.2, 0.06]);
    for (const sx of [-1, 1]) s.add(P.sphereLo, '#111', [sx * 0.085, 0.04, 0.24], null, [0.025, 0.025, 0.025]);
  };
  const ANIMALS = {
    deer(s) {
      const c = '#a8703a', d = '#7a4a22';
      s.add(P.capsule, c, [0, 1.05, 0], [Math.PI / 2, 0, 0], [0.32, 1.0, 0.36]);
      for (const [x, z] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]]) s.add(P.cylLo, d, [x, 0.45, z], null, [0.06, 0.9, 0.06]);
      s.add(P.capsule, c, [0, 1.45, 0.6], [0.5, 0, 0], [0.13, 0.5, 0.15]);
      s.add(P.box, c, [0, 1.75, 0.82], [0.4, 0, 0], [0.22, 0.24, 0.42]);
      for (const sx of [-1, 1]) { s.add(P.cone, c, [sx * 0.14, 1.95, 0.72], [0, 0, -sx * 0.6], [0.06, 0.18, 0.04]); s.add(P.cylLo, '#e8dcc0', [sx * 0.1, 2.15, 0.7], [0.3, 0, -sx * 0.5], [0.02, 0.4, 0.02]); }
      s.add(P.sphereLo, '#f4f0e8', [0, 1.1, -0.55], null, [0.1, 0.1, 0.06]);
    },
    rabbit(s) {
      const c = '#a89888';
      s.add(P.sphereLo, c, [0, 0.22, 0], null, [0.16, 0.16, 0.22]);
      s.add(P.sphereLo, c, [0, 0.36, 0.18], null, [0.1, 0.1, 0.1]);
      for (const sx of [-1, 1]) s.add(P.capsule, c, [sx * 0.04, 0.52, 0.16], [-0.2, 0, sx * 0.15], [0.03, 0.22, 0.02]);
      s.add(P.sphereLo, '#f4f0e8', [0, 0.26, -0.22], null, [0.06, 0.06, 0.06]);
    },
    squirrel(s) {
      const c = '#9a5a2a';
      s.add(P.sphereLo, c, [0, 0.14, 0], null, [0.08, 0.1, 0.14]);
      s.add(P.sphereLo, c, [0, 0.24, 0.12], null, [0.07, 0.07, 0.07]);
      s.add(P.capsule, c, [0, 0.3, -0.16], [-0.6, 0, 0], [0.07, 0.28, 0.07]);
    },
    fox(s) {
      const c = '#d8702a';
      s.add(P.capsule, c, [0, 0.42, 0], [Math.PI / 2, 0, 0], [0.16, 0.55, 0.16]);
      for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]]) s.add(P.cylLo, '#2a1a12', [x, 0.18, z], null, [0.035, 0.36, 0.035]);
      s.add(P.cone, c, [0, 0.52, 0.42], [Math.PI / 2, 0, 0], [0.13, 0.3, 0.12]);
      for (const sx of [-1, 1]) s.add(P.cone, c, [sx * 0.07, 0.65, 0.36], null, [0.04, 0.12, 0.03]);
      s.add(P.capsule, c, [0, 0.42, -0.45], [-1.1, 0, 0], [0.09, 0.4, 0.09]);
      s.add(P.sphereLo, '#f4f0e8', [0, 0.42, -0.7], null, [0.06, 0.06, 0.06]);
    },
    critter(s) {
      // Out in the multiverse: a little six-legged something.
      s.add(P.sphereLo, '#8ac85a', [0, 0.25, 0], null, [0.2, 0.15, 0.3]);
      for (let i = -1; i <= 1; i++) for (const sx of [-1, 1]) s.add(P.cylLo, '#4a6a2a', [sx * 0.2, 0.12, i * 0.14], [0, 0, sx * 0.8], [0.02, 0.25, 0.02]);
      for (const sx of [-1, 1]) s.add(P.sphereLo, '#fff', [sx * 0.08, 0.32, 0.26], null, [0.05, 0.05, 0.03]);
    },
  };
  const CAR_COLORS = ['#c8382a', '#2a5ab8', '#e8e4dc', '#2a2a30', '#8a9098', '#3a7a4a', '#d8a83a', '#6a2a5a'];
  function carMesh(col) {
    const g = model('car', s => {
      s.add(P.box, '#ffffff', [0, 0.72, 0], null, [1.8, 0.62, 4.2]);
      s.add(P.box, '#ffffff', [0, 1.3, -0.25], null, [1.62, 0.6, 2.1]);
      s.add(P.box, '#3e4d5c', [0, 1.32, 0.82], [0.55, 0, 0], [1.5, 0.55, 0.06]);
      s.add(P.box, '#3e4d5c', [0, 1.32, -1.32], [-0.5, 0, 0], [1.5, 0.5, 0.06]);
      for (const sx of [-1, 1]) s.add(P.box, '#3e4d5c', [sx * 0.82, 1.32, -0.25], null, [0.04, 0.42, 1.8]);
      for (const x of [-0.85, 0.85]) for (const z of [-1.35, 1.35]) s.add(P.cyl, '#26262a', [x, 0.4, z], [0, 0, Math.PI / 2], [0.4, 0.28, 0.4]);
      for (const sx of [-1, 1]) { s.add(P.box, '#fff6c0', [sx * 0.6, 0.8, 2.11], null, [0.4, 0.18, 0.05], true); s.add(P.box, '#e2483d', [sx * 0.65, 0.82, -2.11], null, [0.32, 0.16, 0.05], true); }
    }, 0.04);
    g.traverse(o => { if (o.isMesh && o.material && o.material.vertexColors && o.material.side !== T.BackSide && !o.material.isMeshBasicMaterial) { o.material = o.material.clone(); o.material.color.set(col); } });
    return g;
  }

  // The life of one world. Returns { update(dt, cam), dispose() }.
  C.makeLife = function (dimId, scene, quality) {
    const D = MM.DIM_BY_ID[dimId];
    const root = new T.Group(); root.name = 'life';
    scene.add(root);
    const lo = quality === 'low', k = lo ? 0.45 : 1;
    const H = (x, z) => MM.heightAt(dimId, x, z);
    const outdoor = D && !D.interior && !D.planets && !D.hidden;
    const under = D && D.quirk === 'swim';
    const earth = MM.worldOf(dimId) === 'earth';
    const life = { birds: [], fish: [], animals: [], cars: [] };
    if (!outdoor) return { update() {}, dispose() { scene.remove(root); } };

    // Birds: a few flocks wheeling over the world, wings flapping.
    // Anatomy Park: the giant Heart beats in the middle of the park, and blood cells drift by.
    if (dimId === 'anatomy') {
      const l = MM.LANDMARK_BY_ID.bigheart, hs = new C.Shape();
      hs.add(P.sphere, '#c8203a', [-1.4, 0.6, 0], null, [2.4, 2.4, 2]); hs.add(P.sphere, '#c8203a', [1.4, 0.6, 0], null, [2.4, 2.4, 2]);
      hs.add(P.cone, '#c8203a', [0, -1.6, 0], [Math.PI, 0, 0], [3.4, 3.4, 1.9]);
      hs.add(P.sphereLo, '#ff6a7a', [-1.6, 1.6, 1.2], null, [0.8, 0.6, 0.5]);
      const heart = C.meshOf(hs.build(), 0.06);
      heart.position.set(l.x, H(l.x, l.z) + 5.4, l.z);
      root.add(heart);
      life.heart = heart;
      life.cells = [];
      for (let i = 0; i < Math.round(26 * k); i++) {
        const m = model('rbc', s => { s.add(P.cyl, '#c8283a', [0, 0, 0], null, [1, 0.35, 1]); s.add(P.cyl, '#a81a2a', [0, 0.05, 0], null, [0.55, 0.36, 0.55]); }, 0.03);
        m.scale.setScalar(rnd(0.8, 2));
        root.add(m);
        life.cells.push({ m, x: rnd(-120, 120), z: rnd(-120, 120), y: rnd(12, 40), vx: rnd(-2, 2), vz: rnd(-2, 2), sp: rnd(0.3, 1) });
      }
    }
    if (!under && D.gravity > 0 && !/^(beyond|cableworld|storytrain|anatomy)/.test(D.shapeOf || dimId)) {
      const col = earth ? '#3a3a42' : new T.Color(D.accent).lerp(new T.Color('#202028'), 0.6).getStyle();
      for (let f = 0; f < 3; f++) {
        const flock = { x: rnd(-80, 80), z: rnd(-80, 80), y: rnd(26, 44), vx: rnd(-3, 3), vz: rnd(-3, 3), birds: [] };
        const n = Math.round(rnd(4, 7) * k);
        for (let i = 0; i < n; i++) {
          const b = new T.Group();
          b.add(model('birdbody' + col, s => birdBody(s, col), 0.02));
          const wl = model('wing' + col, s => wing(s, col), 0.015), wr = model('wing' + col, s => wing(s, col), 0.015);
          wr.scale.x = -1; b.add(wl, wr);
          root.add(b);
          flock.birds.push({ m: b, wl, wr, a: rnd(0, 6.28), r: rnd(6, 14), dy: rnd(-3, 3), sp: rnd(0.6, 1.0), ph: rnd(0, 6.28) });
        }
        life.birds.push(flock);
      }
    }
    // Fish: in a sea world all around you, and on Earth out past the waves.
    const fishCols = [['#ff9a3a', '#ffffff'], ['#5ab0e8', '#ffd84d'], ['#c8c8d8', '#5a6a8a'], ['#ff6a8a', '#ffe8f0'], ['#ffd84d', '#2a2a30']];
    if (under || D.regions) {
      const n = Math.round((under ? 26 : 18) * k);
      for (let i = 0; i < n; i++) {
        const [c1, c2] = fishCols[i % fishCols.length];
        const m = model('fish' + c1, s => fishBody(s, c1, c2), 0.015);
        m.scale.setScalar(rnd(0.8, 1.6));
        root.add(m);
        life.fish.push({ m, a: rnd(0, 6.28), r: rnd(3, 9), cx: 0, cz: 0, y: 0, sp: rnd(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1), school: i % 4, dy: rnd(-1, 1) });
      }
      life.schools = [0, 1, 2, 3].map(() => ({ x: 0, z: 0, set: false }));
    }
    // Animals in the woods, near the trees: deer, rabbits, squirrels and foxes on Earth,
    // little six-legged critters anywhere else green.
    const trees = MM.genProps(dimId).filter(p => TREES.has(p.type));
    if (trees.length && !under && !D.cronen && !/dino/.test(dimId)) {
      const kinds = earth ? ['deer', 'rabbit', 'rabbit', 'squirrel', 'squirrel', 'fox'] : ['critter'];
      const n = Math.round(14 * k);
      for (let i = 0; i < n; i++) {
        const kind = kinds[i % kinds.length], m = model('an_' + kind, ANIMALS[kind], 0.02);
        root.add(m); m.visible = false;
        life.animals.push({ m, kind, home: null, x: 0, z: 0, tx: 0, tz: 0, wait: 0, flee: 0, speed: { deer: 3, rabbit: 2.2, squirrel: 2.4, fox: 2.6, critter: 1.6 }[kind], hop: kind === 'rabbit' });
      }
      life.trees = trees;
    }
    // Traffic on Earth: cars along the roads, both ways, keeping to the right.
    if (earth && D.regions) {
      const paths = [];
      const G = D.streets ? D.streets.grid : 44, E = D.streets ? D.streets.extent : 150;
      for (let i = -3; i <= 3; i++) { paths.push([[i * G, -E], [i * G, E]]); paths.push([[-E, i * G], [E, i * G]]); }
      for (const R of MM.EARTH_ROUTES) paths.push(R.pts);
      for (const rd of MM.layoutOf(dimId).roads) if ((rd.style === 'asphalt') && Math.hypot(rd.x2 - rd.x1, rd.z2 - rd.z1) > 30) paths.push([[rd.x1, rd.z1], [rd.x2, rd.z2]]);
      const both = [];
      for (const p of paths) { both.push(p); both.push(p.slice().reverse()); }
      life.paths = both;
      const n = Math.round(16 * k);
      for (let i = 0; i < n; i++) {
        const m = carMesh(CAR_COLORS[i % CAR_COLORS.length]);
        root.add(m);
        const c = { m, path: null, seg: 0, t: 0, speed: rnd(9, 15), cur: 0 };
        life.cars.push(c);
      }
    }
    const pickPath = (c, cam, far) => {
      for (let tries = 0; tries < 12; tries++) {
        const p = life.paths[Math.floor(Math.random() * life.paths.length)];
        const [x, z] = p[0];
        if (!far || Math.hypot(x - cam.x, z - cam.z) > 90) { c.path = p; c.seg = 0; c.t = 0; return; }
      }
      c.path = life.paths[Math.floor(Math.random() * life.paths.length)]; c.seg = 0; c.t = 0;
    };
    // Where along its path a car is, and the way it faces (keeping right: 2 m off the middle).
    const carAt = c => {
      const a = c.path[c.seg], b = c.path[c.seg + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      return { x: a[0] + dx * c.t - dz / l * 2, z: a[1] + dz * c.t + dx / l * 2, yaw: Math.atan2(dx, dz), len: l };
    };
    let t = 0;
    return {
      update(dt, cam) {
        if (!cam) return;
        t += dt;
        // The Heart beats (lub-dub, about seventy a minute) and the blood cells drift.
        if (life.heart) { const b = (t * 1.17) % 1, p = Math.exp(-((b - 0.05) ** 2) / 0.002) * 0.12 + Math.exp(-((b - 0.22) ** 2) / 0.002) * 0.08; life.heart.scale.setScalar(1 + p); }
        if (life.cells) for (const c of life.cells) {
          c.x += c.vx * dt; c.z += c.vz * dt;
          if (Math.abs(c.x - cam.x) > 130 || Math.abs(c.z - cam.z) > 130) { c.x = cam.x + rnd(-100, 100); c.z = cam.z + rnd(-100, 100); }
          c.m.position.set(c.x, H(c.x, c.z) + c.y + Math.sin(t * c.sp + c.x) * 2, c.z);
          c.m.rotation.set(t * c.sp * 0.5, 0, t * c.sp * 0.3);
        }
        // Birds
        for (const F of life.birds) {
          F.x += F.vx * dt; F.z += F.vz * dt;
          if (Math.hypot(F.x - cam.x, F.z - cam.z) > 140) { F.x = cam.x + rnd(-60, 60); F.z = cam.z + rnd(-60, 60); }
          if (Math.random() < dt * 0.1) { F.vx = rnd(-4, 4); F.vz = rnd(-4, 4); }
          const gy = H(F.x, F.z);
          for (const b of F.birds) {
            b.a += dt * b.sp * 0.9;
            const x = F.x + Math.cos(b.a) * b.r, z = F.z + Math.sin(b.a) * b.r, y = gy + F.y + b.dy + Math.sin(t * 0.7 + b.ph) * 1.5;
            b.m.position.set(x, y, z);
            b.m.rotation.y = -b.a + Math.PI * (b.sp > 0 ? 1 : 0);
            b.m.rotation.z = 0.25;
            const flap = Math.sin(t * 9 + b.ph) * 0.6;
            b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
          }
        }
        // Fish: schools that follow you around (under the sea), or stay out past the waves.
        if (life.fish.length) {
          const inSea = under || cam.z > MM.SEA_Z - 30;
          for (let s = 0; s < life.schools.length; s++) {
            const S = life.schools[s];
            if (!S.set || Math.hypot(S.x - cam.x, S.z - cam.z) > 45) {
              S.x = cam.x + rnd(-25, 25); S.z = under ? cam.z + rnd(-25, 25) : Math.max(MM.SEA_Z + 14, cam.z + rnd(5, 30)); S.set = true;
            }
          }
          for (const f of life.fish) {
            f.m.visible = inSea;
            if (!inSea) continue;
            const S = life.schools[f.school];
            f.a += dt * f.sp;
            const x = S.x + Math.cos(f.a) * f.r, z = S.z + Math.sin(f.a) * f.r;
            const floor = H(x, z), top = under ? floor + 7 : MM.SEA_LEVEL - 0.8;
            const y = Math.min(top, Math.max(floor + 0.6, (under ? floor + 2.5 : MM.SEA_LEVEL - 2.2) + f.dy + Math.sin(t + f.a) * 0.4));
            f.m.position.set(x, y, z);
            f.m.rotation.y = -f.a + (f.sp > 0 ? Math.PI : 0);
          }
        }
        // Animals: wander near a tree, bolt when you come close, settle down again.
        for (const A of life.animals) {
          if (!A.home || Math.hypot(A.x - cam.x, A.z - cam.z) > 120) {
            // Settle near a tree some way off.
            const near = life.trees.filter(p => { const d = Math.hypot(p.x - cam.x, p.z - cam.z); return d > 25 && d < 100; });
            if (!near.length) { A.m.visible = false; continue; }
            const tr = near[Math.floor(Math.random() * near.length)];
            A.home = { x: tr.x + rnd(-5, 5), z: tr.z + rnd(-5, 5) }; A.x = A.tx = A.home.x; A.z = A.tz = A.home.z; A.m.visible = true;
          }
          const dc = Math.hypot(A.x - cam.x, A.z - cam.z);
          let sp = A.speed;
          if (dc < (A.kind === 'deer' ? 14 : 8)) { const l = dc || 1; A.tx = A.x + (A.x - cam.x) / l * 12; A.tz = A.z + (A.z - cam.z) / l * 12; sp *= 3.2; A.flee = t + 2; }
          else if (t > A.wait && Math.hypot(A.tx - A.x, A.tz - A.z) < 0.4) { A.wait = t + rnd(1, 5); A.tx = A.home.x + rnd(-8, 8); A.tz = A.home.z + rnd(-8, 8); }
          const dx = A.tx - A.x, dz = A.tz - A.z, l = Math.hypot(dx, dz);
          let moving = false;
          if (l > 0.3 && t > A.wait - (t < A.flee ? 99 : 0)) { const st = Math.min(l, sp * dt); A.x += dx / l * st; A.z += dz / l * st; A.m.rotation.y = Math.atan2(dx, dz); moving = true; }
          const gy = H(A.x, A.z);
          A.m.position.set(A.x, gy + (moving && (A.hop || t < A.flee) ? Math.abs(Math.sin(t * 12)) * (A.kind === 'deer' ? 0.25 : 0.15) : 0), A.z);
        }
        // Cars
        for (const c of life.cars) {
          if (!c.path) pickPath(c, cam, false), c.t = Math.random();
          let q = carAt(c);
          // Brake for whoever is standing in the road ahead.
          const ax = q.x + Math.sin(q.yaw) * 5, az = q.z + Math.cos(q.yaw) * 5;
          const stop = Math.hypot(ax - cam.x, az - cam.z) < 4.5;
          c.cur += ((stop ? 0 : c.speed) - c.cur) * Math.min(1, dt * (stop ? 4 : 1));
          c.t += c.cur * dt / q.len;
          while (c.t >= 1) { c.t -= 1; c.seg++; if (c.seg >= c.path.length - 1) { pickPath(c, cam, true); break; } }
          q = carAt(c);
          const far = Math.hypot(q.x - cam.x, q.z - cam.z) > 230;
          c.m.visible = !far;
          if (far) continue;
          c.m.position.set(q.x, H(q.x, q.z) + 0.1, q.z);
          let dyaw = q.yaw - c.m.rotation.y; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
          c.m.rotation.y += dyaw * Math.min(1, dt * 6);
        }
      },
      dispose() { scene.remove(root); },
    };
  };
})();
