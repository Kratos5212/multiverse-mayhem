// Dimensions: terrain, sky, props, the kiosk and NPC/pickup models.
// Props are instanced per type, so hundreds of houses, trees and mushrooms cost a
// few draw calls; destroying one just hides its instance.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;
  const P = C.prim;
  const shade = C.shade;

  // ---------- Prop models (unit scale, base on the ground) ----------
  const MODELS = {
    house(s) {
      s.add(P.box, '#f7f1e3', [0, 3, 0], null, [11, 6, 9]);
      const roof = new T.ConeGeometry(8.6, 3.8, 4, 1);
      roof.rotateY(Math.PI / 4);
      s.add(roof, '#b8473b', [0, 7.9, 0], null, [1.0, 1, 0.82]);
      roof.dispose();
      s.add(P.box, '#7a4a2a', [-2.5, 1.4, 4.52], null, [1.6, 2.8, 0.1]);
      s.add(P.box, '#d9d4c6', [2.6, 1.5, 4.52], null, [3.6, 3.0, 0.1]);
      for (const x of [-4.2, -0.6]) s.add(P.box, '#9fd6ff', [x, 3.9, 4.52], null, [1.5, 1.3, 0.1]);
      for (const x of [-3, 3]) s.add(P.box, '#9fd6ff', [x, 3.6, -4.52], null, [1.8, 1.4, 0.1]);
      s.add(P.box, '#a33a30', [3.2, 9.2, -1], null, [0.9, 2.2, 0.9]);
    },
    tree(s) {
      s.add(P.cylLo, '#7a5230', [0, 1.6, 0], null, [0.35, 3.2, 0.35]);
      s.add(P.sphereLo, '#3f9a3a', [0, 4.6, 0], null, [2.2, 2.0, 2.2]);
      s.add(P.sphereLo, '#4db044', [0.9, 5.8, 0.3], null, [1.5, 1.4, 1.5]);
      s.add(P.sphereLo, '#56bf4b', [-0.7, 6.3, -0.4], null, [1.2, 1.2, 1.2]);
    },
    car(s) {
      s.add(P.capsule, '#ffffff', [0, 0.75, 0], [Math.PI / 2, 0, 0], [0.95, 2.0, 0.55]);
      s.add(P.sphere, '#ffffff', [0, 1.35, -0.2], null, [0.85, 0.55, 1.2]);
      s.add(P.sphere, '#a8dcff', [0, 1.45, -0.15], null, [0.8, 0.42, 1.0]);
      for (const x of [-0.85, 0.85]) for (const z of [-1.2, 1.2]) s.add(P.cyl, '#222', [x, 0.4, z], [0, 0, Math.PI / 2], [0.42, 0.3, 0.42]);
      s.add(P.sphereLo, '#fff6b0', [0.5, 0.8, 1.9], null, [0.18, 0.12, 0.08], true);
      s.add(P.sphereLo, '#fff6b0', [-0.5, 0.8, 1.9], null, [0.18, 0.12, 0.08], true);
    },
    mailbox(s) {
      s.add(P.cylLo, '#6b4a2b', [0, 0.55, 0], null, [0.07, 1.1, 0.07]);
      s.add(P.capsule, '#3c6fb5', [0, 1.2, 0], [Math.PI / 2, 0, 0], [0.2, 0.35, 0.2]);
      s.add(P.box, '#e33', [0.22, 1.35, 0.1], null, [0.03, 0.25, 0.1]);
    },
    hedge(s) {
      s.add(P.sphereLo, '#3c8f34', [0, 0.65, 0], null, [1.6, 0.85, 1.0]);
      s.add(P.sphereLo, '#47a33d', [0.8, 0.9, 0], null, [0.8, 0.6, 0.7]);
    },
    fleshpillar(s) {
      for (let i = 0; i < 5; i++) s.add(P.sphere, i % 2 ? '#d9677a' : '#c4505f', [Math.sin(i * 2.1) * 0.25, 1 + i * 1.75, Math.cos(i * 1.7) * 0.2], null, [1.5 - i * 0.12, 1.2, 1.5 - i * 0.12]);
      s.add(P.capsule, '#8a2337', [0.9, 4, 0.9], [0.3, 0, 0.2], [0.12, 4, 0.12]);
      s.add(P.capsule, '#8a2337', [-0.9, 5, 0.6], [-0.2, 0, -0.3], [0.1, 3.5, 0.1]);
      s.add(P.sphere, '#fffaf0', [0, 8.8, 0.9], null, [0.5, 0.5, 0.4]);
      s.add(P.sphereLo, '#1b1b1b', [0, 8.8, 1.25], null, [0.15, 0.15, 0.1]);
    },
    eyestalk(s) {
      s.add(P.cylLo, '#c9576b', [0, 2, 0], [0.1, 0, 0.08], [0.18, 4, 0.18]);
      s.add(P.sphere, '#fffaf0', [0.15, 4.4, 0.2], null, [0.6, 0.6, 0.6]);
      s.add(P.sphere, '#5bc0ff', [0.15, 4.45, 0.72], null, [0.27, 0.27, 0.12]);
      s.add(P.sphereLo, '#111', [0.15, 4.45, 0.8], null, [0.12, 0.12, 0.06]);
    },
    bonearch(s) {
      const arc = new T.TorusGeometry(3.4, 0.45, 8, 18, Math.PI);
      s.add(arc, '#efe6cc', [0, 4.2, 0], null, [1, 1.15, 1]);
      arc.dispose();
      for (const x of [-3.4, 3.4]) { s.add(P.cyl, '#efe6cc', [x, 2.1, 0], null, [0.45, 4.2, 0.45]); s.add(P.sphereLo, '#e2d6b4', [x, 0.3, 0], null, [0.8, 0.5, 0.8]); }
    },
    pustule(s) {
      s.add(P.sphereLo, '#b84a5d', [0, 0.35, 0], null, [1.3, 0.5, 1.3]);
      s.add(P.sphere, '#f4e27a', [0, 0.95, 0], null, [0.8, 0.75, 0.8]);
      s.add(P.sphereLo, '#fff6c0', [0.25, 1.4, 0.3], null, [0.2, 0.15, 0.2]);
    },
    mushroom(s) {
      s.add(P.cyl, '#efe2ff', [0, 4, 0], null, [0.75, 8, 0.75]);
      s.add(P.hemi, '#c04dff', [0, 7.8, 0], null, [4, 2.8, 4]);
      s.add(P.cyl, '#7a2cbf', [0, 7.8, 0], null, [3.9, 0.15, 3.9]);
      for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 1.5 + (i % 3) * 0.7; s.add(P.sphereLo, '#7ffcff', [Math.cos(a) * r, 7.8 + Math.sqrt(Math.max(0, 1 - (r / 4) ** 2)) * 2.75, Math.sin(a) * r], null, [0.38, 0.2, 0.38], true); }
    },
    stall(s) {
      s.add(P.box, '#5e3d8f', [0, 0.55, 0], null, [3.6, 1.1, 1.8]);
      for (const x of [-1.7, 1.7]) for (const z of [-0.8, 0.8]) s.add(P.cylLo, '#2b1b47', [x, 1.6, z], null, [0.08, 3.2, 0.08]);
      for (let i = 0; i < 6; i++) s.add(P.box, i % 2 ? '#ff6fd0' : '#5ff8ff', [-1.5 + i * 0.6, 3.25, 0], [0.25, 0, 0], [0.6, 0.12, 2.3], i % 2 === 0);
      for (let i = 0; i < 4; i++) s.add(P.octa, ['#ffe066', '#6dff8a', '#ff7a5a', '#7ab8ff'][i], [-1.2 + i * 0.8, 1.35, 0.2], null, [0.22, 0.28, 0.22], true);
    },
    crate(s) {
      s.add(P.box, '#a07040', [0, 0.8, 0], null, [1.6, 1.6, 1.6]);
      s.add(P.box, '#6e4a2a', [0, 0.8, 0.81], null, [1.65, 0.2, 0.05]);
      s.add(P.box, '#6e4a2a', [0, 0.8, -0.81], null, [1.65, 0.2, 0.05]);
      s.add(P.box, '#5ff8ff', [0, 1.61, 0], null, [0.5, 0.04, 0.5], true);
    },
    lamp(s) {
      s.add(P.cylLo, '#2b1b47', [0, 2.3, 0], null, [0.1, 4.6, 0.1]);
      s.add(P.sphere, '#ff8af0', [0, 4.8, 0], null, [0.45, 0.45, 0.45], true);
      s.add(P.cone, '#2b1b47', [0, 5.25, 0], null, [0.5, 0.3, 0.5]);
    },
    crystal(s) {
      s.add(P.dodeca, '#6b6b78', [0, 0.3, 0], null, [1.1, 0.6, 1.1]);
      s.add(P.octa, '#7affea', [0, 1.9, 0], null, [0.55, 1.7, 0.55], true);
      s.add(P.octa, '#5ad8ff', [0.6, 1.2, 0.3], [0, 0, -0.5], [0.35, 1.0, 0.35], true);
      s.add(P.octa, '#b48aff', [-0.5, 1.0, -0.3], [0, 0, 0.6], [0.3, 0.9, 0.3], true);
    },
    rock(s) {
      s.add(P.dodeca, '#8c8c98', [0, 1.0, 0], null, [2.0, 1.4, 1.7]);
      s.add(P.dodeca, '#a0a0ac', [0.9, 1.9, 0.2], null, [0.9, 0.7, 0.8]);
    },
    rover(s) {
      s.add(P.box, '#e9e5d8', [0, 1.2, 0], null, [2.4, 0.9, 3.4]);
      s.add(P.box, '#c9a23a', [0, 1.9, -0.6], null, [1.6, 0.6, 1.4]);
      for (const x of [-1.3, 1.3]) for (const z of [-1.2, 0, 1.2]) s.add(P.cyl, '#333', [x, 0.5, z], [0, 0, Math.PI / 2], [0.5, 0.35, 0.5]);
      s.add(P.cylLo, '#888', [0.6, 2.6, 0.8], null, [0.06, 1.4, 0.06]);
      s.add(P.hemi, '#ddd', [0.6, 3.3, 0.8], [2.4, 0, 0], [0.6, 0.25, 0.6]);
      s.add(P.box, '#3a6ac9', [-0.7, 1.66, 1.2], null, [0.8, 0.05, 0.8], true);
    },
    antenna(s) {
      s.add(P.cylLo, '#9a9aa6', [0, 0.2, 0], null, [1, 0.4, 1]);
      s.add(P.cylLo, '#c8c8d0', [0, 4.5, 0], null, [0.18, 9, 0.18]);
      s.add(P.hemi, '#e8e8f0', [0, 7, 0.6], [1.9, 0, 0], [1.6, 0.6, 1.6]);
      s.add(P.sphereLo, '#ff3355', [0, 9.1, 0], null, [0.25, 0.25, 0.25], true);
    },
  };

  const modelCache = {};
  function propModel(type) {
    if (modelCache[type]) return modelCache[type];
    const s = new C.Shape();
    MODELS[type](s);
    return (modelCache[type] = s.build());
  }

  // ---------- Sky ----------
  function makeSky(dim) {
    const g = new T.SphereGeometry(600, 24, 12);
    const m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(dim.sky[0]) }, bot: { value: new T.Color(dim.sky[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }',
    });
    const sky = new T.Mesh(g, m);
    sky.renderOrder = -10;
    return sky;
  }

  function stars(n, r, color, size) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.95 + 0.05, s = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = y * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    return new T.Points(g, new T.PointsMaterial({ color, size, sizeAttenuation: false, fog: false, map: C.dotTexture, transparent: true, depthWrite: false }));
  }

  // Big things in the sky that make each dimension recognisable.
  function skyDecor(dim, group) {
    const add = (shape, pos) => { const m = C.meshOf(shape.build(), 0); m.position.set(pos[0], pos[1], pos[2]); m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } }); group.add(m); return m; };
    if (dim.id === 'suburbia') {
      for (let i = 0; i < 14; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#ffffff', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 14 * Math.PI * 2, d = 300 + (i % 3) * 60;
        add(s, [Math.cos(a) * d, 110 + (i % 4) * 25, Math.sin(a) * d]);
      }
    } else if (dim.id === 'meatlands') {
      const s = new C.Shape();
      s.add(P.sphere, '#fff2e0', [0, 0, 0], null, [60, 60, 60], true);
      s.add(P.sphere, '#e0b020', [0, 0, 44], null, [30, 30, 20], true);
      s.add(P.sphere, '#120808', [0, 0, 56], null, [14, 14, 10], true);
      const eye = add(s, [-150, 190, -360]);
      eye.lookAt(0, 0, 0);
      group.userData.eye = eye;
      group.add(stars(300, 560, '#ffb0c0', 2));
    } else if (dim.id === 'bazaar') {
      const s1 = new C.Shape(); s1.add(P.sphere, '#ffd36b', [0, 0, 0], null, [55, 55, 55], true);
      add(s1, [-250, 210, -330]);
      const s2 = new C.Shape(); s2.add(P.sphere, '#7affea', [0, 0, 0], null, [30, 30, 30], true);
      add(s2, [180, 260, -380]);
      const ring = new T.Mesh(new T.TorusGeometry(80, 3, 6, 60), new T.MeshBasicMaterial({ color: '#ffb0f0', fog: false }));
      ring.position.set(-250, 210, -330); ring.rotation.set(1.2, 0.3, 0);
      group.add(ring);
      group.add(stars(900, 560, '#ffffff', 2));
    } else if (dim.id === 'moon') {
      const s = new C.Shape();
      s.add(P.sphere, '#2f6fd8', [0, 0, 0], null, [80, 80, 80], true);
      for (let i = 0; i < 9; i++) s.add(P.sphereLo, '#3fae4a', [Math.sin(i * 2.3) * 55, Math.cos(i * 1.7) * 50, 45], null, [26, 18, 14], true);
      s.add(P.sphere, '#ffffff', [0, 74, 10], null, [40, 10, 40], true);
      add(s, [260, 180, -380]);
      group.add(stars(2500, 560, '#ffffff', 2));
    }
  }

  // ---------- Terrain ----------
  function makeTerrain(dim) {
    const size = MM.WORLD_HALF * 2 + 120, seg = 150;
    const g = new T.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c0 = new T.Color(dim.ground[0]), c1 = new T.Color(dim.ground[1]), c2 = new T.Color(dim.ground[2]);
    const road = new T.Color('#55595e'), side = new T.Color('#c9c4b6'), tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = MM.heightAt(dim.id, x, z);
      pos.setY(i, y);
      const n = MM.fbm(x * 0.05, z * 0.05, dim.seed + 99, 3);
      tmp.copy(c0).lerp(c1, Math.min(1, Math.max(0, (n - 0.35) * 3)));
      if (n < 0.38) tmp.lerp(c2, Math.min(1, (0.38 - n) * 6));
      if (dim.id === 'suburbia') {
        const rx = Math.abs(((x % 44) + 44) % 44 - 22), rz = Math.abs(((z % 44) + 44) % 44 - 22);
        const dRoad = Math.min(22 - rx, 22 - rz);
        if (dRoad < 3.2 && Math.max(Math.abs(x), Math.abs(z)) < 150) tmp.copy(road);
        else if (dRoad < 4.2 && Math.max(Math.abs(x), Math.abs(z)) < 150) tmp.copy(side);
        if (Math.hypot(x, z) < 12) tmp.copy(side).lerp(c1, 0.3);
      }
      if (dim.id === 'meatlands') {
        const v = Math.abs(Math.sin(x * 0.11 + Math.sin(z * 0.07) * 3) * Math.cos(z * 0.09 + Math.sin(x * 0.05) * 2));
        if (v < 0.05) tmp.set('#7c1e34');
      }
      if (dim.id === 'bazaar') {
        const gx = Math.abs(((x % 8) + 8) % 8 - 4), gz = Math.abs(((z % 8) + 8) % 8 - 4);
        if ((gx > 3.85 || gz > 3.85) && Math.hypot(x, z) < 60) tmp.set('#5ff8ff');
      }
      if (dim.id === 'moon') { const d = y / 10; tmp.multiplyScalar(1 + Math.max(-0.35, Math.min(0.15, d * 0.3))); }
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new T.Mesh(g, C.toonMat);
    return m;
  }

  // ---------- Kiosk ----------
  function makeKiosk(dim) {
    const s = new C.Shape();
    s.add(P.cyl, '#3a3f4a', [0, 0.25, 0], null, [3.2, 0.5, 3.2]);
    s.add(P.cyl, '#ffd84d', [0, 0.52, 0], null, [3.25, 0.08, 3.25]);
    for (const x of [-2.2, 2.2]) s.add(P.box, '#59606e', [x, 2.6, 0], null, [0.6, 4.4, 0.6]);
    s.add(P.box, '#59606e', [0, 4.9, 0], null, [5.0, 0.6, 0.7]);
    s.add(P.box, '#1d2230', [0, 1.6, -1.6], null, [1.4, 2.2, 0.6]);
    s.add(P.box, '#5ff8ff', [0, 2.0, -1.28], null, [1.1, 0.9, 0.04], true);
    const g = C.meshOf(s.build(), 0.06);
    const sign = C.makeTag('PORTAL KIOSK', '', 'Any dimension, free', '#ffd84d');
    sign.sprite.position.set(0, 6.2, 0); sign.sprite.scale.set(5, 1.25, 1);
    sign.draw(-1);
    g.add(sign.sprite);
    const ring = C.portalMesh('#ffd84d', 1.7);
    ring.position.set(0, 2.5, 0);
    g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  // ---------- Portals ----------
  const portalGeo = new T.CircleGeometry(1, 48);
  C.portalMesh = function (color, size) {
    const m = new T.ShaderMaterial({
      transparent: true, side: T.DoubleSide, depthWrite: false,
      uniforms: { col: { value: new T.Color(color) }, t: { value: Math.random() * 10 }, open: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 col; uniform float t; uniform float open; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);
          float wob = 0.9 + 0.06 * sin(a * 7.0 + t * 4.0) + 0.04 * sin(a * 13.0 - t * 6.0);
          float edge = wob * open;
          if (r > edge) discard;
          float sw = sin(a * 3.0 + r * 14.0 - t * 6.0) * 0.5 + 0.5;
          vec3 c = mix(col * 0.55, col, sw);
          c = mix(c, vec3(1.0), smoothstep(0.35, 0.0, r) * 0.55);
          float rim = smoothstep(edge - 0.16, edge, r);
          c = mix(c, col * 1.4 + 0.2, rim);
          if (r > edge - 0.035) c = vec3(0.07);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const mesh = new T.Mesh(portalGeo, m);
    mesh.scale.set(size, size * 1.35, 1);
    mesh.userData.tick = dt => { m.uniforms.t.value += dt; };
    return mesh;
  };

  // ---------- NPC models ----------
  const npcCache = {};
  C.npcModel = function (type) {
    if (type === 'neighbor') {
      const look = MM.randomLook('joe');
      look.species = 'human'; look.top = ['polo', 'sweater', 'tshirt'][Math.floor(Math.random() * 3)];
      const av = C.buildAvatar(look, 'joe');
      return { root: av.root, av };
    }
    if (!npcCache[type]) {
      const s = new C.Shape();
      if (type === 'meatblob') {
        s.add(P.sphere, '#d9677a', [0, 0.8, 0], null, [0.95, 0.8, 0.9]);
        for (let i = 0; i < 5; i++) s.add(P.sphereLo, '#c4505f', [Math.sin(i * 1.3) * 0.7, 0.5 + (i % 2) * 0.6, Math.cos(i * 1.3) * 0.6], null, [0.4, 0.35, 0.4]);
        s.add(P.sphere, '#fff', [0.3, 1.25, 0.7], null, [0.25, 0.25, 0.15]); s.add(P.sphere, '#fff', [-0.25, 1.1, 0.75], null, [0.18, 0.18, 0.12]);
        s.add(P.sphereLo, '#111', [0.3, 1.25, 0.82], null, [0.08, 0.08, 0.05]); s.add(P.sphereLo, '#111', [-0.25, 1.1, 0.86], null, [0.06, 0.06, 0.04]);
        s.add(P.sphereLo, '#3a0d0d', [0, 0.65, 0.82], null, [0.35, 0.18, 0.1]);
        for (let i = -1; i <= 1; i++) s.add(P.cone, '#fff8e0', [i * 0.14, 0.75, 0.86], [Math.PI, 0, 0], [0.05, 0.12, 0.05]);
      } else if (type === 'jelly') {
        s.add(P.hemi, '#7ffcff', [0, 0.7, 0], null, [0.95, 0.85, 0.95], true);
        s.add(P.sphereLo, '#ff8af0', [0, 0.95, 0], null, [0.35, 0.3, 0.35], true);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; C.capsuleAt(s, '#5ad8ff', 0.06, 1.3, [Math.cos(a) * 0.55, -0.55, Math.sin(a) * 0.55], null, true); }
        s.add(P.sphereLo, '#111', [0.25, 1.0, 0.75], null, [0.08, 0.08, 0.05]); s.add(P.sphereLo, '#111', [-0.25, 1.0, 0.75], null, [0.08, 0.08, 0.05]);
      } else if (type === 'mooncrab') {
        s.add(P.sphere, '#c9c9d6', [0, 0.55, 0], null, [0.85, 0.35, 0.7]);
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 3; i++) s.add(P.capsule, '#9a9aa6', [sx * 0.9, 0.3, -0.35 + i * 0.35], [0, 0, sx * 1.0], [0.06, 0.4, 0.06]);
          s.add(P.sphereLo, '#e86b6b', [sx * 0.75, 0.6, 0.85], null, [0.28, 0.2, 0.32]);
          s.add(P.cylLo, '#9a9aa6', [sx * 0.2, 0.95, 0.45], null, [0.04, 0.4, 0.04]);
          s.add(P.sphereLo, '#fff', [sx * 0.2, 1.18, 0.45], null, [0.12, 0.12, 0.12]);
          s.add(P.sphereLo, '#111', [sx * 0.2, 1.18, 0.55], null, [0.05, 0.05, 0.03]);
        }
      }
      npcCache[type] = s.build();
    }
    const root = new T.Group();
    const m = C.meshOf(npcCache[type], 0.05);
    root.add(m);
    const sh = C.blobShadow(1.8); sh.position.y = 0.03; root.add(sh);
    root.userData.model = m;
    return { root };
  };

  // ---------- Pickups ----------
  let pickupModels = null;
  C.pickupModel = function (kind) {
    if (!pickupModels) {
      const s = new C.Shape();
      s.add(P.torus, '#aab3bd', [0, 0, 0], null, [0.32, 0.32, 0.6]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.box, '#aab3bd', [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0], [0, 0, a], [0.14, 0.16, 0.12]); }
      s.add(P.cylLo, '#ffd84d', [0, 0, 0], [Math.PI / 2, 0, 0], [0.12, 0.14, 0.12], true);
      const c = new C.Shape();
      c.add(P.octa, '#7affea', [0, 0, 0], null, [0.3, 0.5, 0.3], true);
      pickupModels = { s: s.build(), c: c.build() };
    }
    const g = new T.Group();
    const m = C.meshOf(pickupModels[kind], 0.03);
    g.add(m);
    g.userData.spin = m;
    return g;
  };

  // ---------- Turret ----------
  let turretModel = null;
  C.turretModel = function () {
    if (!turretModel) {
      const b = new C.Shape();
      b.add(P.cyl, '#59606e', [0, 0.3, 0], null, [0.7, 0.6, 0.7]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.add(P.cylLo, '#3a3f4a', [Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], [0.08, 0.6, 0.08]); }
      const h = new C.Shape();
      h.add(P.sphere, '#d8dde2', [0, 0, 0], null, [0.5, 0.42, 0.5]);
      h.add(P.cyl, '#3a3f4a', [0, 0.05, 0.55], [Math.PI / 2, 0, 0], [0.1, 0.7, 0.1]);
      h.add(P.sphereLo, '#ff4d4d', [0, 0.18, 0.35], null, [0.12, 0.08, 0.08], true);
      turretModel = { base: b.build(), head: h.build() };
    }
    const g = new T.Group();
    g.add(C.meshOf(turretModel.base, 0.04));
    const head = C.meshOf(turretModel.head, 0.04);
    head.position.y = 1.0;
    g.add(head);
    g.userData.head = head;
    return g;
  };

  // ---------- A whole dimension ----------
  C.buildDimension = function (dimId, quality) {
    const dim = MM.DIM_BY_ID[dimId];
    const group = new T.Group();
    group.add(makeSky(dim));
    skyDecor(dim, group);
    group.add(makeTerrain(dim));

    // Instanced props
    const props = MM.genProps(dimId);
    const byType = {};
    for (const p of props) (byType[p.type] || (byType[p.type] = [])).push(p);
    const slots = [];   // prop id -> { meshes, index, matrix }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    const tint = new T.Color(), white = new T.Color(1, 1, 1);
    const rand = MM.rng(dim.seed + 5);
    for (const type in byType) {
      const list = byType[type];
      const model = propModel(type);
      const meshes = [];
      const thick = type === 'house' ? 0.09 : 0.06;
      for (const [geo, mat] of [[model.lit, C.toonMat], [model.glow, C.glowMat]]) {
        if (!geo) continue;
        const im = new T.InstancedMesh(geo, mat, list.length);
        const om = new T.InstancedMesh(geo, C.outlineMat(thick), list.length);
        meshes.push(im, om);
      }
      list.forEach((p, i) => {
        q.setFromAxisAngle(up, p.rot);
        m4.compose(v.set(p.x, p.y - 0.05, p.z), q, sc.set(p.s, p.s, p.s));
        for (const im of meshes) im.setMatrixAt(i, m4);
        // Every lit and glowing instance gets a colour (white = as modelled): three.js
        // r149 shares one shader between instanced meshes of a material, so they must
        // all have instance colours or none.
        if (type === 'house' || type === 'car') tint.setHSL(rand(), type === 'car' ? 0.7 : 0.45, type === 'car' ? 0.55 : 0.82);
        else tint.setRGB(1, 1, 1);
        for (let k = 0; k < meshes.length; k += 2) meshes[k].setColorAt(i, k === 0 && model.lit ? tint : white);
        slots[p.id] = { meshes, index: i, matrix: m4.clone() };
      });
      for (const im of meshes) { im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; group.add(im); }
    }
    const zero = new T.Matrix4().makeScale(0, 0, 0);

    const kiosk = makeKiosk(dim);
    kiosk.position.set(MM.KIOSK.x, MM.heightAt(dimId, MM.KIOSK.x, MM.KIOSK.z), MM.KIOSK.z);
    group.add(kiosk);

    // Lights
    const sun = new T.DirectionalLight(dim.sun, 0.9);
    sun.position.set(80, 140, 60);
    group.add(sun);
    group.add(new T.HemisphereLight(dim.ambient, shade(dim.ground[0], 0.6), 0.75));

    return {
      dim, group, kiosk,
      setAlive(id, alive) {
        const s = slots[id];
        if (!s) return;
        for (const im of s.meshes) { im.setMatrixAt(s.index, alive ? s.matrix : zero); im.instanceMatrix.needsUpdate = true; }
      },
      update(dt, t, camPos) {
        kiosk.userData.ring.userData.tick(dt);
        kiosk.userData.ring.rotation.y = Math.sin(t * 0.5) * 0.3;
        if (group.userData.eye && camPos) group.userData.eye.lookAt(camPos);
        group.children[0].position.copy(camPos || v.set(0, 0, 0));
      },
      dispose() {
        group.traverse(o => {
          if (o.geometry && !Object.values(C.prim).includes(o.geometry) && !o.userData.shared) {
            let shared = false;
            for (const k in modelCache) if (modelCache[k].lit === o.geometry || modelCache[k].glow === o.geometry) shared = true;
            if (!shared) o.geometry.dispose();
          }
        });
      },
    };
  };
})();
