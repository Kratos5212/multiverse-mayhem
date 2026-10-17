// Dimensions: terrain, sky, props, the kiosk and NPC/pickup models.
// Props are instanced per type, so hundreds of houses, trees and mushrooms cost a
// few draw calls; destroying one just hides its instance.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;
  const P = C.prim;
  const shade = C.shade;

  // ---------- Suburban building kit ----------
  // Facades face +z. Windows: white frame, pale glass, a cross of muntins, optional shutters.
  function win(s, x, y, z, w, h, shutter, side) {
    const rot = side ? [0, side * Math.PI / 2, 0] : null;
    const at = (dx, dy, dz) => side ? [x + dz * side, y + dy, z - dx * side] : [x + dx, y + dy, z + dz];
    s.add(P.box, '#fbfaf6', at(0, 0, 0.02), rot, [w + 0.24, h + 0.24, 0.12]);
    s.add(P.box, '#bfdcec', at(0, 0, 0.07), rot, [w, h, 0.06]);
    s.add(P.box, '#fbfaf6', at(0, 0, 0.11), rot, [0.07, h, 0.04]);
    s.add(P.box, '#fbfaf6', at(0, 0, 0.11), rot, [w, 0.07, 0.04]);
    s.add(P.box, '#e9e4d8', at(0, -h / 2 - 0.14, 0.12), rot, [w + 0.4, 0.1, 0.22]);
    if (shutter) for (const sx of [-1, 1]) s.add(P.box, shutter, at(sx * (w / 2 + 0.32), 0, 0.03), rot, [0.36, h + 0.1, 0.06]);
  }
  // Horizontal siding lines on a wall of width w (along x) at depth z (front, +z).
  function siding(s, w, h, z, color, side) {
    for (let y = 0.45; y < h - 0.1; y += 0.45) {
      if (side) s.add(P.box, color, [z * side, y, 0], null, [0.03, 0.035, w]);
      else s.add(P.box, color, [0, y, z], null, [w, 0.035, 0.03]);
    }
  }
  function gable(s, w, d, y, h, color, trim) {
    s.add(P.prism, color, [0, y, 0], null, [w + 0.8, h, d + 1.0]);
    s.add(P.box, trim, [0, y + 0.02, 0], null, [w + 0.9, 0.14, d + 1.1]);   // fascia under the eaves
  }
  // A two-storey suburban house: siding, gable roof, porch, chimney, shutters.
  function suburbanHouse(s, o) {
    const w = o.w, d = o.d, h = o.h;
    s.add(P.box, '#4a443c', [0, 0.25, 0], null, [w + 0.2, 0.5, d + 0.2]);        // foundation
    s.add(P.box, o.wall, [0, 0.5 + h / 2, 0], null, [w, h, d]);
    const sc = shade(o.wall, 0.9);
    siding(s, w, h, d / 2 + 0.01, sc);
    siding(s, w, h, -d / 2 - 0.01, sc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, o.trim, [sx * w / 2, 0.5 + h / 2, sz * d / 2], null, [0.22, h, 0.22]);   // corner boards
    gable(s, w, d, 0.5 + h, o.roofH || 3.2, o.roof, o.trim);
    if (o.stories > 1) s.add(P.box, o.trim, [0, 0.5 + h / 2, d / 2 + 0.03], null, [w, 0.14, 0.06]);   // floor line
    // Windows: two up, two down (or one big one on the garage side).
    const up = 0.5 + h * 0.72, down = 0.5 + h * 0.28;
    for (const x of o.winX || [-w * 0.3, w * 0.3]) {
      if (o.stories > 1) win(s, x, up, d / 2, 1.3, 1.25, o.shutter);
      win(s, x, o.stories > 1 ? down : 0.5 + h * 0.45, d / 2, 1.4, 1.35, o.shutter);
    }
    for (const sx of [-1, 1]) win(s, sx * (w / 2), o.stories > 1 ? up : 0.5 + h * 0.45, 0, 1.2, 1.2, null, sx);
    // Front door with a little porch roof, step and light.
    const dx = o.doorX || 0;
    s.add(P.box, o.trim, [dx, 1.6, d / 2 + 0.03], null, [1.5, 2.5, 0.08]);
    s.add(P.box, o.door, [dx, 1.55, d / 2 + 0.07], null, [1.1, 2.2, 0.06]);
    s.add(P.sphereLo, '#e8c050', [dx + 0.38, 1.5, d / 2 + 0.13], null, [0.06, 0.06, 0.05]);
    s.add(P.box, '#b8b0a2', [dx, 0.3, d / 2 + 0.7], null, [2.2, 0.3, 1.3]);
    if (o.porch) {
      s.add(P.box, o.roof, [dx, 3.2, d / 2 + 1.0], [-0.25, 0, 0], [3.0, 0.15, 2.2]);
      for (const sx of [-1, 1]) s.add(P.cyl, o.trim, [dx + sx * 1.3, 1.85, d / 2 + 1.9], null, [0.1, 2.7, 0.1]);
    }
    s.add(P.box, '#fff4c0', [dx + 1.0, 2.4, d / 2 + 0.1], null, [0.15, 0.25, 0.08], true);
    if (o.chimney) {
      s.add(P.box, '#a5544a', [w * 0.32, 0.5 + h + 2.2, -d * 0.1], null, [0.9, 3.6, 0.9]);
      s.add(P.box, '#7a3a32', [w * 0.32, 0.5 + h + 4.05, -d * 0.1], null, [1.05, 0.2, 1.05]);
    }
  }
  // Single-storey ranch house with an attached garage on the left.
  function ranchHouse(s, o) {
    suburbanHouse(s, Object.assign({}, o, { w: o.w - 4, stories: 1, winX: [o.w * 0.12], doorX: -0.6 }));
    const gx = -(o.w - 4) / 2 - 2.1, h = 3.1;
    s.add(P.box, '#4a443c', [gx, 0.2, 0], null, [4.4, 0.4, o.d - 1.6]);
    s.add(P.box, o.wall, [gx, 0.4 + h / 2, 0], null, [4.2, h, o.d - 1.8]);
    siding(s, 4.2, h, (o.d - 1.8) / 2 + 0.01, shade(o.wall, 0.9));
    s.add(P.prism, o.roof, [gx, 0.4 + h, 0], null, [4.8, 1.8, o.d - 0.8]);
    garageDoor(s, gx, (o.d - 1.8) / 2, 3.2, 2.5, o.trim);
  }
  // A white sectional garage door.
  function garageDoor(s, x, z, w, h, trim) {
    s.add(P.box, trim, [x, 0.4 + h / 2 + 0.05, z + 0.03], null, [w + 0.3, h + 0.2, 0.08]);
    s.add(P.box, '#f4f2ec', [x, 0.4 + h / 2, z + 0.08], null, [w, h, 0.06]);
    for (let i = 1; i < 4; i++) s.add(P.box, '#d4d0c6', [x, 0.4 + i * h / 4, z + 0.12], null, [w, 0.05, 0.03]);
    for (let i = 0; i < 4; i++) s.add(P.box, '#bfdcec', [x - w * 0.375 + i * w / 4, 0.4 + h * 0.84, z + 0.12], null, [w / 4 - 0.15, 0.32, 0.03]);
  }

  // A rounded family sedan (the near model): an extruded side profile with soft corners,
  // glass all round, tyres, hubcaps, round lights and bumpers.
  function smoothCar(s) {
    const body = C.profileGeo([[-2.12, 0.42], [-2.16, 0.98], [-1.25, 1.1], [-0.92, 1.66], [0.42, 1.68], [0.98, 1.12], [2.08, 0.98], [2.16, 0.42]], 0.28, 1.8, 0.1);
    body.rotateY(-Math.PI / 2);
    s.add(body, '#ffffff', [0, 0, 0]);
    body.dispose();
    const glass = C.profileGeo([[-1.08, 1.12], [-0.86, 1.56], [0.36, 1.58], [0.84, 1.13]], 0.08, 1.82, 0);
    glass.rotateY(-Math.PI / 2);
    s.add(glass, '#3e4d5c', [0, 0, 0]);
    glass.dispose();
    s.add(P.box, '#3e4d5c', [0, 1.45, 0.79], [-0.785, 0, 0], [1.46, 0.68, 0.04]);   // windshield
    s.add(P.box, '#3e4d5c', [0, 1.43, -1.16], [0.532, 0, 0], [1.46, 0.5, 0.04]);   // rear window
    s.add(P.box, '#ffffff', [0, 1.37, -0.25], null, [0.05, 0.45, 0.05]);         // door pillar (tinted with the body)
    for (const sz of [-1, 1]) s.add(P.capsule, '#b0b5ba', [0, 0.52, sz * 2.27], [0, 0, Math.PI / 2], [0.12, 0.55, 0.12]);   // bumpers
    for (const x of [-0.84, 0.84]) for (const z of [-1.32, 1.32]) {
      s.add(P.torus, '#26262a', [x, 0.4, z], [0, Math.PI / 2, 0], [0.32, 0.32, 1.1]);
      s.add(P.cyl, '#26262a', [x, 0.4, z], [0, 0, Math.PI / 2], [0.3, 0.24, 0.3]);
      s.add(P.cyl, '#c9cdd2', [x * 1.17, 0.4, z], [0, 0, Math.PI / 2], [0.2, 0.04, 0.2]);
    }
    for (const sx of [-1, 1]) {
      s.add(P.sphere, '#fff6c0', [sx * 0.6, 0.8, 2.24], null, [0.2, 0.12, 0.06], true);
      s.add(P.sphere, '#e2483d', [sx * 0.64, 0.84, -2.25], null, [0.18, 0.1, 0.05], true);
      s.add(P.sphere, '#ffffff', [sx * 0.95, 1.18, 0.55], null, [0.08, 0.06, 0.1]);   // mirrors
      s.add(P.box, '#d0d0d0', [sx * 0.91, 0.95, 0.1], null, [0.03, 0.04, 0.18]);       // door handles
    }
  }

  // ---------- Prop models (unit scale, base on the ground) ----------
  // ---------- Statues: carved figures built from the same parts as a body ----------
  // fig(s, o): a standing person at (o.x, o.y, o.z), o.k metres per unit (1 unit = 1.8 m tall),
  // turned o.ry around Y, all in one stone or bronze colour. o.hair: 'spiky' (Rick) or 'none';
  // o.coat: a lab coat; o.raise: raise the left arm with a portal gun; o.armsOut: arms held
  // out to the sides (to hold hands).
  function fig(s, o) {
    const k = o.k, c = o.color, cy = Math.cos(o.ry || 0), sy = Math.sin(o.ry || 0), dark = shade(c, 0.82), lite = shade(c, 1.08);
    const put = (geo, col, p, r, sc) => s.add(geo, col, [o.x + (p[0] * cy + p[2] * sy) * k, o.y + p[1] * k, o.z + (-p[0] * sy + p[2] * cy) * k],
      [(r ? r[0] : 0), (r ? r[1] : 0) + (o.ry || 0), (r ? r[2] : 0)], [sc[0] * k, sc[1] * k, sc[2] * k]);
    // A limb from point a to point b (local units), as a rounded cylinder.
    const yAxis = new T.Vector3(0, 1, 0), turn = new T.Quaternion().setFromAxisAngle(yAxis, o.ry || 0);
    const limb = (a, b, rad, col) => {
      const dir = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), l = dir.length();
      const q = turn.clone().multiply(new T.Quaternion().setFromUnitVectors(yAxis, dir.normalize()));
      const e = new T.Euler().setFromQuaternion(q, 'YXZ');
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      s.add(P.cyl, col, [o.x + (m[0] * cy + m[2] * sy) * k, o.y + m[1] * k, o.z + (-m[0] * sy + m[2] * cy) * k], [e.x, e.y, e.z], [rad * k, l * k, rad * k]);
      put(P.sphere, col, b, null, [rad * 1.05, rad * 1.05, rad * 1.05]);
    };
    // Legs and shoes.
    for (const sx of [-1, 1]) {
      limb([sx * 0.11, 0.9, 0], [sx * 0.12, 0.12, 0.01], 0.085, o.coat ? dark : c);
      put(P.box, dark, [sx * 0.12, 0.05, 0.05], null, [0.15, 0.1, 0.28]);
    }
    put(P.sphere, c, [0, 0.92, 0], null, [0.2, 0.13, 0.14]);
    // Body (with a lab coat that hangs open to the knees).
    put(P.box, c, [0, 1.2, 0], null, [0.38, 0.56, 0.24]);
    if (o.coat) {
      for (const sx of [-1, 1]) put(P.box, lite, [sx * 0.13, 0.98, 0.02], [0, 0, sx * 0.05], [0.17, 0.9, 0.27]);
      for (const sx of [-1, 1]) put(P.box, lite, [sx * 0.07, 1.36, 0.13], [0.15, 0, sx * 0.5], [0.07, 0.22, 0.02]);   // lapels
    }
    put(P.cyl, c, [0, 1.52, 0], null, [0.06, 0.12, 0.06]);
    // Head, face and hair.
    put(P.sphere, c, [0, 1.68, 0.01], null, [0.15, 0.18, 0.16]);
    put(P.box, dark, [0, 1.74, 0.15], null, [0.2, 0.03, 0.03]);                          // brow
    for (const sx of [-1, 1]) put(P.sphere, lite, [sx * 0.06, 1.69, 0.14], null, [0.04, 0.04, 0.02]);
    put(P.sphere, c, [0, 1.64, 0.16], null, [0.03, 0.04, 0.03]);                        // nose
    if (o.hair === 'spiky') for (let i = 0; i < 11; i++) {
      const a = -2.0 + i * 0.4;
      put(P.cone, lite, [Math.sin(a) * 0.15, 1.74 + Math.abs(Math.cos(a)) * 0.05, -Math.cos(a) * 0.13 - 0.02], [-1.2 * Math.cos(a), a, 0], [0.06, 0.24, 0.05]);
    }
    // Arms.
    for (const sx of [-1, 1]) {
      const sh = [sx * 0.24, 1.42, 0];
      let hand;
      if (o.reach) hand = [o.reach[0] + sx * 0.05, o.reach[1], o.reach[2]];
      else if (o.armsOut) hand = [sx * 0.86, 1.1, 0.22];
      else if (o.raise && sx < 0) hand = [-0.36, 1.92, 0.18];
      else hand = [sx * 0.3, 0.86, 0.06];
      limb(sh, hand, 0.06, o.coat ? lite : c);
      if (o.raise && sx < 0) { put(P.box, dark, [hand[0], hand[1] + 0.06, hand[2] + 0.1], [-0.6, 0, 0], [0.08, 0.1, 0.24]); put(P.cyl, lite, [hand[0], hand[1] + 0.14, hand[2] + 0.22], [-0.6, 0, 0], [0.035, 0.12, 0.035]); }
    }
  }
  // A horse, facing +x, standing on its own.
  function horse(s, x, y, z, k, c) {
    const d = shade(c, 0.8);
    const at = (p, q) => [x + p * k, y + q * k, z];
    s.add(P.sphere, c, at(0, 1.3), null, [0.85 * k, 0.42 * k, 0.36 * k]);                              // barrel
    s.add(P.sphere, c, at(0.62, 1.42), null, [0.36 * k, 0.4 * k, 0.32 * k]);                           // chest
    s.add(P.sphere, c, at(-0.6, 1.36), null, [0.38 * k, 0.38 * k, 0.34 * k]);                          // rump
    s.add(P.cyl, c, at(0.95, 1.85), [0, 0, -0.75], [0.17 * k, 0.75 * k, 0.17 * k]);                    // neck
    s.add(P.box, c, at(1.3, 2.12), [0, 0, -0.35], [0.5 * k, 0.22 * k, 0.2 * k]);                       // head
    s.add(P.sphere, d, at(1.5, 2.02), null, [0.12 * k, 0.11 * k, 0.11 * k]);                           // muzzle
    for (const sz of [-1, 1]) s.add(P.cone, c, [x + 1.12 * k, y + 2.35 * k, z + sz * 0.07 * k], [0, 0, -0.2], [0.05 * k, 0.16 * k, 0.04 * k]);   // ears
    for (let i = 0; i < 6; i++) s.add(P.box, d, at(0.82 + i * 0.07, 1.72 + i * 0.09), [0, 0, -0.75], [0.07 * k, 0.16 * k, 0.05 * k]);   // mane
    for (const px of [-0.62, 0.6]) for (const sz of [-1, 1]) {
      s.add(P.cyl, c, [x + px * k, y + 0.55 * k, z + sz * 0.18 * k], null, [0.08 * k, 1.1 * k, 0.08 * k]);
      s.add(P.cyl, d, [x + px * k, y + 0.05 * k, z + sz * 0.18 * k], null, [0.1 * k, 0.1 * k, 0.1 * k]);   // hooves
    }
    s.add(P.cyl, d, at(-1.05, 1.0), [0, 0, -0.35], [0.07 * k, 0.75 * k, 0.07 * k]);                  // tail
  }
  const MODELS = {
    house(s) { suburbanHouse(s, { w: 11, d: 8.5, h: 5.6, stories: 2, wall: '#ffffff', trim: '#fbfaf6', roof: '#8a7f78', door: '#7a3a2a', shutter: '#5a6a7a', porch: true, chimney: true }); },
    house2(s) { ranchHouse(s, { w: 13, d: 9, h: 3.3, wall: '#ffffff', trim: '#fbfaf6', roof: '#7d7068', door: '#3a5a7a', shutter: '#6a5a4a' }); },
    tree(s) {
      // Show trees: a short brown trunk with two forks and a puffy, lumpy canopy.
      s.add(P.cylLo, '#7a5232', [0, 1.4, 0], null, [0.32, 2.8, 0.32]);
      s.add(P.cylLo, '#7a5232', [0.45, 3.1, 0], [0, 0, -0.6], [0.16, 1.4, 0.16]);
      s.add(P.cylLo, '#7a5232', [-0.4, 3.2, 0.1], [0.2, 0, 0.55], [0.15, 1.3, 0.15]);
      const lumps = [[0, 4.6, 0, 2.3], [1.4, 4.2, 0.5, 1.5], [-1.4, 4.3, -0.3, 1.5], [0.3, 4.4, 1.4, 1.4], [-0.2, 4.3, -1.4, 1.4], [0.5, 5.9, 0.2, 1.6], [-0.7, 5.6, 0.6, 1.3]];
      for (const [x, y, z, r] of lumps) s.add(P.sphere, y > 5 ? '#5cb84a' : '#4aa03e', [x, y, z], null, [r, r * 0.9, r]);
    },
    car(s) {
      if (s.smooth) return smoothCar(s);
      // A plain family sedan: body, cabin, dark windows, wheels with hubcaps, lights.
      s.add(P.box, '#ffffff', [0, 0.72, 0], null, [1.8, 0.62, 4.2]);
      s.add(P.box, '#ffffff', [0, 1.3, -0.25], null, [1.62, 0.6, 2.1]);
      s.add(P.box, '#3e4d5c', [0, 1.32, 0.82], [0.55, 0, 0], [1.5, 0.55, 0.06]);
      s.add(P.box, '#3e4d5c', [0, 1.32, -1.32], [-0.5, 0, 0], [1.5, 0.5, 0.06]);
      for (const sx of [-1, 1]) s.add(P.box, '#3e4d5c', [sx * 0.82, 1.32, -0.25], null, [0.04, 0.42, 1.8]);
      for (const sz of [-1, 1]) s.add(P.box, '#9aa0a6', [0, 0.5, sz * 2.12], null, [1.84, 0.22, 0.12]);
      for (const x of [-0.85, 0.85]) for (const z of [-1.35, 1.35]) { s.add(P.cyl, '#26262a', [x, 0.4, z], [0, 0, Math.PI / 2], [0.4, 0.28, 0.4]); s.add(P.cyl, '#c9cdd2', [x * 1.17, 0.4, z], [0, 0, Math.PI / 2], [0.2, 0.04, 0.2]); }
      for (const sx of [-1, 1]) { s.add(P.box, '#fff6c0', [sx * 0.6, 0.8, 2.11], null, [0.4, 0.18, 0.05], true); s.add(P.box, '#e2483d', [sx * 0.65, 0.82, -2.11], null, [0.32, 0.16, 0.05], true); }
    },
    streetlamp(s) {
      s.add(P.cylLo, '#4a5058', [0, 2.6, 0], null, [0.09, 5.2, 0.09]);
      s.add(P.box, '#4a5058', [0, 5.2, 0.6], null, [0.12, 0.12, 1.3]);
      s.add(P.box, '#3a3f45', [0, 5.05, 1.2], null, [0.5, 0.18, 0.7]);
      s.add(P.box, '#fff4c0', [0, 4.94, 1.2], null, [0.4, 0.05, 0.55], true);
    },
    fence(s) {
      for (let i = -4; i <= 4; i++) { s.add(P.box, '#fbfaf6', [i * 0.5, 0.55, 0], null, [0.14, 1.1, 0.06]); s.add(P.cone, '#fbfaf6', [i * 0.5, 1.15, 0], [0, Math.PI / 4, 0], [0.1, 0.15, 0.1]); }
      for (const y of [0.35, 0.85]) s.add(P.box, '#fbfaf6', [0, y, -0.05], null, [4.4, 0.1, 0.05]);
    },
    mailbox(s) {
      s.add(P.box, '#6b4a2b', [0, 0.55, 0], null, [0.1, 1.1, 0.1]);
      s.add(P.box, '#4a5560', [0, 1.15, 0], null, [0.26, 0.24, 0.5]);
      s.add(P.cyl, '#4a5560', [0, 1.27, 0], [Math.PI / 2, 0, 0], [0.13, 0.5, 0.13]);
      s.add(P.box, '#e2483d', [0.15, 1.3, 0.08], null, [0.03, 0.22, 0.06]);
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
    // ----- Featherhold -----
    nest(s) {
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; s.add(P.capsule, i % 2 ? '#8a6233' : '#a37840', [Math.cos(a) * 2.4, 1.2, Math.sin(a) * 2.4], [0.3, -a, 1.3], [0.22, 1.6, 0.22]); }
      s.add(P.cyl, '#6e4a26', [0, 0.6, 0], null, [2.6, 1.2, 2.6]);
      for (let i = 0; i < 3; i++) s.add(P.sphere, '#f4efe4', [Math.cos(i * 2.1) * 0.8, 1.5, Math.sin(i * 2.1) * 0.8], null, [0.5, 0.65, 0.5]);
    },
    totem(s) {
      const cols = ['#c9733a', '#3c6fb5', '#e2483d', '#ffd84d'];
      for (let i = 0; i < 4; i++) {
        s.add(P.cyl, cols[i], [0, 0.8 + i * 1.5, 0], null, [0.75, 1.5, 0.75]);
        s.add(P.cone, '#f2a12c', [0, 0.9 + i * 1.5, 0.75], [Math.PI / 2, 0, 0], [0.25, 0.6, 0.2]);
        s.add(P.sphereLo, '#fff', [0.3, 1.2 + i * 1.5, 0.65], null, [0.14, 0.14, 0.1]);
        s.add(P.sphereLo, '#fff', [-0.3, 1.2 + i * 1.5, 0.65], null, [0.14, 0.14, 0.1]);
      }
      s.add(P.sphere, '#ffd84d', [1.0, 6.4, 0], [0, 0, -0.4], [1.0, 0.2, 0.4]);
      s.add(P.sphere, '#ffd84d', [-1.0, 6.4, 0], [0, 0, 0.4], [1.0, 0.2, 0.4]);
    },
    featherplant(s) {
      s.add(P.cylLo, '#7a5a2a', [0, 2.2, 0], [0.15, 0, 0], [0.06, 4.4, 0.06]);
      s.add(P.sphere, '#ffcf4d', [0, 3.2, 0.25], [0.15, 0, 0], [0.55, 2.0, 0.12]);
      s.add(P.sphere, '#ff8a3a', [0, 4.6, 0.45], [0.15, 0, 0], [0.35, 0.7, 0.1]);
    },
    rockspire(s) {
      s.add(P.cone, '#b98c4e', [0, 6, 0], null, [2.6, 12, 2.4]);
      s.add(P.dodeca, '#a27a42', [0.6, 1.2, 0.4], null, [2.4, 1.6, 2.2]);
      s.add(P.cyl, '#8fae4a', [0, 9.5, 0], null, [1.0, 0.25, 1.0]);
    },
    // ----- Citadel of Ricks -----
    spire(s) {
      s.add(P.cyl, '#9aa6b8', [0, 6, 0], null, [2.2, 12, 2.2]);
      s.add(P.cone, '#c8d2e0', [0, 18, 0], null, [1.8, 14, 1.8]);
      for (const y of [5, 10, 15]) s.add(P.torus, '#5ff8ff', [0, y, 0], [Math.PI / 2, 0, 0], [2.6, 2.6, 0.8], true);
      s.add(P.sphere, '#5ff8ff', [0, 25.5, 0], null, [0.5, 0.5, 0.5], true);
    },
    // The Citadel's monument: a stone Rick in his lab coat, portal gun raised.
    rickstatue(s) {
      s.add(P.cyl, '#7d8796', [0, 1, 0], null, [2.2, 2, 2.2]);
      s.add(P.cyl, '#8d97a6', [0, 2.05, 0], null, [1.8, 0.1, 1.8]);
      s.add(P.box, '#ffd84d', [0, 1.2, 2.2], null, [1.6, 0.5, 0.06]);
      fig(s, { x: 0, y: 2.1, z: 0, k: 4.6, color: '#c8ccd2', hair: 'spiky', coat: true, raise: true });
    },
    vending(s) {
      s.add(P.box, '#3a4a6a', [0, 1.2, 0], null, [1.4, 2.4, 1.0]);
      s.add(P.box, '#5ff8ff', [0.1, 1.5, 0.51], null, [0.9, 1.4, 0.04], true);
      s.add(P.box, '#ffd84d', [-0.5, 1.6, 0.52], null, [0.2, 0.6, 0.04], true);
    },
    hovercar(s) {
      s.add(P.sphere, '#e2483d', [0, 1.1, 0], null, [1.6, 0.55, 2.2]);
      s.add(P.hemi, '#a8dcff', [0, 1.4, -0.2], null, [1.0, 0.7, 1.2]);
      s.add(P.cyl, '#5ff8ff', [0, 0.45, 0], null, [1.2, 0.1, 1.6], true);
    },
    citbench(s) {
      s.add(P.box, '#59606e', [0, 0.5, 0], null, [2.0, 0.15, 0.7]);
      s.add(P.box, '#59606e', [0, 0.9, -0.3], null, [2.0, 0.6, 0.12]);
      for (const x of [-0.85, 0.85]) s.add(P.box, '#3a3f4a', [x, 0.25, 0], null, [0.12, 0.5, 0.6]);
    },
    lm_council(s) {
      s.add(P.cyl, '#7d8796', [0, 1, 0], null, [9, 2, 9]);
      s.add(P.hemi, '#c8d2e0', [0, 2, 0], null, [8, 9, 8]);
      s.add(P.torus, '#5ff8ff', [0, 2.2, 0], [Math.PI / 2, 0, 0], [8.2, 8.2, 0.6], true);
      s.add(P.cyl, '#3a3f4a', [0, 12, 0], null, [0.5, 6, 0.5]);
      s.add(P.sphere, '#39ff6a', [0, 15.5, 0], null, [1.2, 1.2, 1.2], true);
      s.add(P.box, '#3a3f4a', [0, 2.8, 8.2], null, [3, 3.6, 1]);
      s.add(P.box, '#a33aff', [0, 5.4, 8.6], null, [4, 0.8, 0.1], true);
    },
    lm_daycare(s) {
      s.add(P.box, '#f6d34b', [0, 3, 0], null, [11, 6, 9]);
      s.add(P.box, '#3a62a8', [0, 6.3, 0], null, [11.6, 0.6, 9.6]);
      s.add(P.box, '#ffffff', [0, 1.5, 4.55], null, [2.4, 3, 0.1]);
      for (const x of [-3.5, 3.5]) s.add(P.box, '#bfe6ff', [x, 3.5, 4.55], null, [2, 1.6, 0.1]);
      // A slide out front.
      s.add(P.box, '#e2483d', [5.5, 1.2, 6], [0, 0, 0.5], [3.4, 0.2, 1.0]);
      s.add(P.cyl, '#3a62a8', [4.2, 1.3, 6], null, [0.1, 2.6, 0.1]);
    },
    // ----- Snowball's Dog World -----
    doghouse(s) {
      s.add(P.box, '#c8504a', [0, 1.7, 0], null, [4.4, 3.4, 4.4]);
      const roof = new T.ConeGeometry(3.6, 2.2, 4, 1); roof.rotateY(Math.PI / 4);
      s.add(roof, '#7a3a2a', [0, 4.5, 0], null, [1, 1, 1]); roof.dispose();
      s.add(P.cyl, '#2a1a12', [0, 1.3, 2.21], [Math.PI / 2, 0, 0], [1.0, 0.05, 1.0]);
      s.add(P.box, '#f4f4f4', [0, 3.2, 2.22], null, [1.6, 0.4, 0.05]);
    },
    hydrant(s) {
      s.add(P.cyl, '#e2483d', [0, 0.6, 0], null, [0.32, 1.2, 0.32]);
      s.add(P.hemi, '#e2483d', [0, 1.2, 0], null, [0.34, 0.3, 0.34]);
      for (const sx of [-1, 1]) s.add(P.cyl, '#c03a30', [sx * 0.38, 0.8, 0], [0, 0, Math.PI / 2], [0.12, 0.2, 0.12]);
    },
    bigbone(s) {
      s.add(P.capsule, '#f4efe0', [0, 0.6, 0], [0, 0, Math.PI / 2], [0.45, 3.2, 0.45]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.sphere, '#f4efe0', [sx * 2.0, 0.6, sz * 0.45], null, [0.6, 0.6, 0.6]);
    },
    tennisball(s) {
      s.add(P.sphere, '#d8f04a', [0, 1.5, 0], null, [1.5, 1.5, 1.5]);
      s.add(P.torus, '#ffffff', [0, 1.5, 0], [0.4, 0, 0.3], [1.48, 1.48, 0.15]);
    },
    dogstatue(s) {
      s.add(P.box, '#7d8796', [0, 1, 0], null, [3.6, 2, 3.6]);
      s.add(P.sphere, '#ffffff', [0, 4, 0], null, [1.4, 1.8, 2.2]);
      s.add(P.sphere, '#ffffff', [0, 6.4, 1.2], null, [1.2, 1.1, 1.3]);
      s.add(P.sphere, '#ffffff', [0, 6.1, 2.4], null, [0.6, 0.5, 0.7]);
      s.add(P.sphereLo, '#111', [0, 6.3, 3.05], null, [0.22, 0.18, 0.15]);
      for (const sx of [-1, 1]) s.add(P.sphere, '#e8e8e8', [sx * 1.1, 6.6, 1.0], [0, 0, sx * 0.4], [0.35, 0.9, 0.5]);
      s.add(P.box, '#3a3f4a', [0, 4.8, 0.2], null, [2.6, 0.5, 2.8]);   // little armour vest
    },
    lm_palace(s) {
      s.add(P.box, '#f4efe0', [0, 4, 0], null, [16, 8, 10]);
      for (const x of [-7, 7]) { s.add(P.cyl, '#f4efe0', [x, 6, 0], null, [2, 12, 2]); s.add(P.cone, '#e2483d', [x, 13.5, 0], null, [2.4, 3, 2.4]); }
      s.add(P.cyl, '#2a1a12', [0, 2.2, 5.05], [Math.PI / 2, 0, 0], [1.8, 0.05, 1.8]);
      // Snowball's head over the door.
      s.add(P.sphere, '#ffffff', [0, 9, 4.5], null, [2, 1.8, 1.6]);
      s.add(P.sphere, '#ffffff', [0, 8.6, 6], null, [0.9, 0.7, 0.9]);
      s.add(P.sphereLo, '#111', [0, 8.8, 6.85], null, [0.3, 0.25, 0.2]);
      for (const sx of [-1, 1]) { s.add(P.sphere, '#e8e8e8', [sx * 1.8, 9.4, 4.2], [0, 0, sx * 0.5], [0.5, 1.2, 0.6]); s.add(P.sphereLo, '#111', [sx * 0.7, 9.5, 5.85], null, [0.2, 0.25, 0.1]); }
    },
    // ----- Mega Seed world -----
    seedtree(s) {
      s.add(P.cyl, '#5a3a6a', [0, 5, 0], [0, 0, 0.05], [0.9, 10, 0.9]);
      s.add(P.sphere, '#2fa07a', [0, 11.5, 0], null, [4.2, 2.6, 4.2]);
      s.add(P.sphere, '#3ac08a', [1.5, 13, 0.8], null, [2.4, 1.8, 2.4]);
      for (let i = 0; i < 5; i++) { const a = i * 1.3; s.add(P.sphere, '#c8ff6a', [Math.cos(a) * 3.2, 10.2, Math.sin(a) * 3.2], null, [0.35, 0.5, 0.35], true); }
    },
    fungus(s) {
      s.add(P.cyl, '#e8d0ff', [0, 1.2, 0], null, [0.3, 2.4, 0.3]);
      s.add(P.hemi, '#ff7ad0', [0, 2.4, 0], null, [1.1, 0.8, 1.1]);
      s.add(P.sphereLo, '#ffe066', [0.4, 2.9, 0.3], null, [0.18, 0.12, 0.18], true);
    },
    thornbush(s) {
      s.add(P.sphereLo, '#4a2a6a', [0, 0.9, 0], null, [1.4, 1.0, 1.4]);
      for (let i = 0; i < 10; i++) { const a = i * 0.63, el = (i % 3) * 0.4; s.add(P.cone, '#c8ff6a', [Math.cos(a) * 1.1, 1.0 + el, Math.sin(a) * 1.1], [0, -a, 1.2], [0.1, 0.6, 0.1]); }
    },
    lm_megatree(s) {
      s.add(P.cyl, '#5a3a6a', [0, 9, 0], null, [3, 18, 3]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.capsule, '#5a3a6a', [Math.cos(a) * 3, 1, Math.sin(a) * 3], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8], [0.8, 3, 0.8]); }
      s.add(P.sphere, '#2fa07a', [0, 21, 0], null, [9, 5, 9]);
      s.add(P.sphere, '#3ac08a', [3, 24, 2], null, [5, 3.5, 5]);
      for (let i = 0; i < 9; i++) { const a = i * 0.7; s.add(P.sphere, '#c8ff6a', [Math.cos(a) * 7, 18.5, Math.sin(a) * 7], null, [0.7, 1.0, 0.7], true); }
    },
    // ----- Rick's garage -----
    // Rick's U-shaped workbench against the back wall: cabinets underneath, a CRT monitor,
    // a vise, a desk lamp, beakers and the portal gun charging. A clock (always 2:00) hangs
    // above a calendar, next to the bulletin board.
    lm_workbench(s) {
      const top = '#8a6a48', cab = '#6e5a44', door = '#7d684f';
      s.add(P.box, top, [0, 0.95, -0.4], null, [6.4, 0.12, 1.2]);
      for (const sx of [-1, 1]) s.add(P.box, top, [sx * 2.6, 0.95, 0.75], null, [1.2, 0.12, 2.2]);   // the U's arms
      s.add(P.box, cab, [0, 0.45, -0.45], null, [6.2, 0.9, 1.05]);
      for (const sx of [-1, 1]) s.add(P.box, cab, [sx * 2.6, 0.45, 0.8], null, [1.05, 0.9, 2.0]);
      for (let i = 0; i < 5; i++) { s.add(P.box, door, [-2.0 + i, 0.47, 0.09], null, [0.9, 0.78, 0.04]); s.add(P.box, '#c9c9c9', [-1.7 + i, 0.75, 0.12], null, [0.18, 0.04, 0.03]); }
      // CRT monitor with a green screen.
      s.add(P.box, '#d8d2c0', [-0.6, 1.35, -0.6], null, [0.8, 0.65, 0.65]);
      s.add(P.box, '#163a24', [-0.6, 1.37, -0.27], null, [0.62, 0.48, 0.03]);
      s.add(P.box, '#39ff6a', [-0.6, 1.4, -0.25], null, [0.5, 0.06, 0.02], true);
      s.add(P.box, '#d8d2c0', [-0.6, 1.03, -0.1], null, [0.7, 0.05, 0.25]);   // keyboard
      // A bench vise.
      s.add(P.box, '#4a6a8a', [2.4, 1.1, -0.1], null, [0.3, 0.22, 0.45]);
      s.add(P.box, '#4a6a8a', [2.4, 1.22, 0.1], null, [0.42, 0.22, 0.12]);
      s.add(P.cylLo, '#c9c9c9', [2.4, 1.22, 0.32], [Math.PI / 2, 0, 0], [0.03, 0.4, 0.03]);
      // Desk lamp.
      s.add(P.cyl, '#2a2a2a', [1.5, 1.03, -0.7], null, [0.16, 0.04, 0.16]);
      s.add(P.cylLo, '#2a2a2a', [1.5, 1.35, -0.75], [0.35, 0, 0], [0.025, 0.65, 0.025]);
      s.add(P.cone, '#2a2a2a', [1.5, 1.62, -0.55], [-0.9, 0, 0], [0.16, 0.22, 0.16]);
      s.add(P.sphereLo, '#fff4c0', [1.5, 1.56, -0.47], null, [0.07, 0.07, 0.07], true);
      // The portal gun on its charger, beakers, a jumble of gadgets and wires.
      s.add(P.box, '#59606e', [0.6, 1.05, -0.3], null, [0.7, 0.1, 0.45]);
      s.add(P.capsule, '#d8dde2', [0.6, 1.17, -0.3], [0, 0, Math.PI / 2], [0.07, 0.18, 0.07]);
      s.add(P.cyl, '#39ff6a', [0.6, 1.26, -0.3], [0, 0, Math.PI / 2], [0.045, 0.24, 0.045], true);
      for (let i = 0; i < 3; i++) s.add(P.cyl, ['#39ff6a', '#ff6fd0', '#5ff8ff'][i], [-2.6 + i * 0.3, 1.15, 1.2], null, [0.09, 0.3 + i * 0.08, 0.09], true);
      s.add(P.box, '#7d858e', [2.6, 1.12, 1.3], null, [0.6, 0.22, 0.5]);
      s.add(P.torus, '#2a2a2a', [-2.0, 1.03, -0.5], [Math.PI / 2, 0, 0], [0.25, 0.25, 0.3]);
      // Wall above: clock over the calendar, the bulletin board, a shelf of boxes.
      s.add(P.cyl, '#f4efe2', [-2.2, 2.6, -0.98], [Math.PI / 2, 0, 0], [0.32, 0.05, 0.32]);
      s.add(P.torus, '#3a2a1a', [-2.2, 2.6, -0.95], null, [0.32, 0.32, 0.25]);
      s.add(P.box, '#2a2a2a', [-2.2, 2.68, -0.93], null, [0.03, 0.18, 0.01]);
      s.add(P.box, '#2a2a2a', [-2.1, 2.6, -0.93], null, [0.2, 0.03, 0.01]);
      s.add(P.box, '#fbfaf6', [-2.2, 1.85, -0.98], null, [0.6, 0.8, 0.02]);
      s.add(P.box, '#e2483d', [-2.2, 2.15, -0.96], null, [0.6, 0.16, 0.01]);
      s.add(P.box, '#a8794a', [0.6, 2.2, -0.98], null, [1.6, 1.0, 0.05]);
      for (let i = 0; i < 6; i++) s.add(P.box, ['#fbfaf6', '#ffe066', '#bfdcec', '#ff9fb0'][i % 4], [0.05 + (i % 3) * 0.5, 2.05 + Math.floor(i / 3) * 0.4, -0.94], [0, 0, (i % 2 - 0.5) * 0.2], [0.32, 0.26, 0.01]);
      s.add(P.box, '#7a5a3a', [2.2, 2.4, -0.8], null, [1.6, 0.06, 0.4]);
      for (let i = 0; i < 3; i++) s.add(P.box, ['#b89060', '#9a7a52', '#c8a070'][i], [1.7 + i * 0.5, 2.6, -0.8], null, [0.42, 0.34, 0.34]);
    },
    // The curio shelf by the door to the house.
    curioshelf(s) {
      const wd = '#6b5a44';
      for (const sx of [-1, 1]) s.add(P.box, wd, [sx * 0.85, 1.2, 0], null, [0.08, 2.4, 0.5]);
      for (let i = 0; i < 4; i++) s.add(P.box, wd, [0, 0.15 + i * 0.7, 0], null, [1.8, 0.06, 0.5]);
      s.add(P.sphere, '#efe6cc', [-0.5, 0.95, 0], null, [0.17, 0.15, 0.17]);                          // skull
      for (const sx of [-1, 1]) s.add(P.sphereLo, '#2a1a12', [-0.5 + sx * 0.06, 0.97, 0.14], null, [0.045, 0.05, 0.03]);
      s.add(P.cyl, '#bfe6ff', [0.2, 0.98, 0], null, [0.14, 0.32, 0.14]);                               // jar of eyeballs
      for (let i = 0; i < 4; i++) s.add(P.sphereLo, '#ffffff', [0.17 + (i % 2) * 0.07, 0.9 + Math.floor(i / 2) * 0.1, 0.05 - (i % 2) * 0.06], null, [0.045, 0.045, 0.045]);
      s.add(P.box, '#2a2a2a', [0.6, 0.95, 0], null, [0.3, 0.18, 0.18]);                                // old camcorder
      s.add(P.cyl, '#2a2a2a', [0.6, 0.95, 0.15], [Math.PI / 2, 0, 0], [0.06, 0.12, 0.06]);
      s.add(P.cyl, '#ffd84d', [-0.4, 1.66, 0], null, [0.16, 0.12, 0.16]);                              // crown
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s.add(P.cone, '#ffd84d', [-0.4 + Math.cos(a) * 0.13, 1.78, Math.sin(a) * 0.13], null, [0.03, 0.1, 0.03]); }
      s.add(P.capsule, '#5a8a3a', [0.3, 1.72, 0], null, [0.1, 0.12, 0.1]);                             // goblin totem
      s.add(P.sphere, '#5a8a3a', [0.3, 1.9, 0], null, [0.11, 0.1, 0.1]);
      s.add(P.cylLo, '#6b4a2b', [0.0, 2.35, 0], [0, 0, 1.2], [0.03, 0.7, 0.03]);                       // mace
      s.add(P.dodeca, '#9aa3ab', [0.3, 2.47, 0], null, [0.1, 0.1, 0.1]);
      s.add(P.box, '#b89060', [0.15, 0.4, 0], null, [1.1, 0.42, 0.42]);                                 // "TIME TRAVEL STUFF"
      s.add(P.box, '#2a2a2a', [0.15, 0.42, 0.215], null, [0.8, 0.08, 0.01]);
    },
    // The plain door into the house (it leads to the green kitchen; no one uses it).
    housedoor(s) {
      s.add(P.box, '#fbf6ea', [0, 1.2, 0], null, [1.2, 2.4, 0.12]);
      s.add(P.box, '#c8a878', [0, 1.15, 0.05], null, [0.95, 2.2, 0.06]);
      for (const y of [0.6, 1.6]) s.add(P.box, '#b89868', [0, y, 0.09], null, [0.7, 0.7, 0.02]);
      s.add(P.sphereLo, '#e8c050', [0.36, 1.1, 0.12], null, [0.05, 0.05, 0.05]);
    },
    // A white washing machine (turn the knob: guns).
    washer(s) {
      s.add(P.box, '#f4f4f0', [0, 0.55, 0], null, [0.8, 1.1, 0.75]);
      s.add(P.box, '#e2e2dc', [0, 1.02, -0.3], null, [0.8, 0.16, 0.12]);
      s.add(P.cyl, '#bfdcec', [0, 0.55, 0.38], [Math.PI / 2, 0, 0], [0.24, 0.03, 0.24]);
      s.add(P.torus, '#9aa3ab', [0, 0.55, 0.39], null, [0.26, 0.26, 0.3]);
      s.add(P.cyl, '#9aa3ab', [0.25, 1.02, -0.22], [Math.PI / 2, 0, 0], [0.05, 0.04, 0.05]);
    },
    // ----- Furniture and centrepieces for the drawn insides (shared/interiors.js) -----
    in_sofa(s) {
      s.add(P.box, '#6a5a8a', [0, 0.25, 0.05], null, [2.2, 0.5, 0.8]);
      s.add(P.box, '#7a6a9a', [0, 0.62, -0.3], null, [2.2, 0.7, 0.25]);
      for (const x of [-1.0, 1.0]) s.add(P.box, '#7a6a9a', [x, 0.45, 0.05], null, [0.25, 0.5, 0.8]);
      for (const x of [-0.5, 0.5]) s.add(P.box, '#8a7aaa', [x, 0.55, 0.1], null, [0.95, 0.12, 0.6]);
    },
    in_table(s) {
      s.add(P.box, '#8a5a32', [0, 0.75, 0], null, [2.8, 0.1, 1.6]);
      for (const x of [-1.2, 1.2]) for (const z of [-0.65, 0.65]) s.add(P.box, '#6a4222', [x, 0.37, z], null, [0.1, 0.74, 0.1]);
      for (const x of [-0.8, 0, 0.8]) for (const z of [-1.1, 1.1]) { s.add(P.box, '#7a4a2a', [x, 0.45, z], null, [0.45, 0.06, 0.45]); s.add(P.box, '#7a4a2a', [x, 0.75, z + Math.sign(z) * 0.2], null, [0.45, 0.6, 0.05]); }
      s.add(P.cyl, '#e8e4dc', [0, 0.82, 0], null, [0.18, 0.04, 0.18]);
    },
    in_bed(s) {
      s.add(P.box, '#6a4a32', [0, 0.25, 0], null, [1.8, 0.4, 2.2]);
      s.add(P.box, '#f0ece2', [0, 0.5, 0.1], null, [1.7, 0.18, 2.0]);
      s.add(P.box, '#5a8ac8', [0, 0.6, 0.35], null, [1.72, 0.08, 1.4]);
      s.add(P.box, '#ffffff', [0, 0.65, -0.75], null, [1.2, 0.15, 0.4]);
      s.add(P.box, '#6a4a32', [0, 0.7, -1.1], null, [1.8, 1.0, 0.1]);
    },
    in_desk(s) {
      s.add(P.box, '#8a6a4a', [0, 0.74, 0], null, [1.6, 0.08, 0.8]);
      for (const x of [-0.72, 0.72]) s.add(P.box, '#6a4a2a', [x, 0.37, 0], null, [0.08, 0.74, 0.74]);
      s.add(P.box, '#2a2e36', [0, 1.05, -0.2], null, [0.6, 0.42, 0.05]);
      s.add(P.box, '#5fb4ff', [0, 1.05, -0.17], null, [0.52, 0.34, 0.02], true);
      s.add(P.box, '#3a3a40', [0, 0.45, 0.6], null, [0.5, 0.08, 0.5]);
    },
    in_shelf(s) {
      s.add(P.box, '#6a4a2a', [0, 1.1, 0], null, [2.0, 2.2, 0.6]);
      for (let y = 0.35; y < 2.1; y += 0.5) for (let i = 0; i < 6; i++) s.add(P.box, ['#c84848', '#4878c8', '#48a868', '#e8c848'][(i + Math.round(y * 2)) % 4], [-0.8 + i * 0.32, y + 0.17, 0.22], null, [0.22, 0.34, 0.2]);
    },
    in_counter(s) {
      s.add(P.box, '#7a5a3a', [0, 0.5, 0], null, [3.6, 1.0, 1.0]);
      s.add(P.box, '#d8d0c0', [0, 1.04, 0], null, [3.7, 0.08, 1.1]);
      s.add(P.box, '#2a2e36', [1.2, 1.3, -0.2], null, [0.5, 0.4, 0.4]);
      s.add(P.box, '#ffd84d', [-1.0, 1.15, 0.1], null, [0.3, 0.14, 0.3]);
    },
    in_plant(s) {
      s.add(P.cyl, '#b86a3a', [0, 0.25, 0], null, [0.3, 0.5, 0.3]);
      for (const [x, y, z, r] of [[0, 1.0, 0, 0.45], [0.2, 1.3, 0.1, 0.32], [-0.18, 1.25, -0.1, 0.3]]) s.add(P.sphere, '#3f9a3a', [x, y, z], null, [r, r, r]);
    },
    in_bench(s) {
      s.add(P.box, '#8a6a4a', [0, 0.45, 0], null, [2.0, 0.08, 0.5]);
      for (const x of [-0.85, 0.85]) s.add(P.box, '#5a4a3a', [x, 0.22, 0], null, [0.1, 0.44, 0.45]);
    },
    f_furnace(s) {
      s.add(P.box, '#5a2a2a', [0, 1.5, 0], null, [3.4, 3.0, 2.6]);
      s.add(P.box, '#3a1818', [0, 3.3, -0.3], null, [1.2, 1.2, 1.2]);
      s.add(P.box, '#ff8a2a', [0, 1.0, 1.31], null, [1.6, 1.1, 0.04], true);
      s.add(P.box, '#ffd84d', [0, 0.85, 1.33], null, [1.1, 0.6, 0.04], true);
      for (const x of [-1.4, 1.4]) s.add(P.cyl, '#c8576b', [x, 1.6, 1.0], null, [0.25, 3.2, 0.25]);
    },
    f_anvil(s) {
      s.add(P.box, '#4a4a4e', [0, 0.25, 0], null, [0.5, 0.5, 0.4]);
      s.add(P.box, '#5a5a60', [0, 0.65, 0], null, [1.1, 0.3, 0.45]);
      s.add(P.cyl, '#5a5a60', [0.6, 0.7, 0], [0, 0, Math.PI / 2], [0.15, 0.3, 0.15]);
    },
    f_stage(s) {
      s.add(P.box, '#4a2a3a', [0, 0.27, 0], null, [7, 0.55, 4]);
      s.add(P.box, '#ff5fd0', [0, 0.56, 1.98], null, [7, 0.04, 0.06], true);
      s.add(P.box, '#2a1a2a', [0, 2.6, -1.9], null, [7, 4.2, 0.2]);
      for (const x of [-2.6, 2.6]) { s.add(P.box, '#1a1a1e', [x, 1.2, -1.2], null, [0.9, 1.3, 0.7]); s.add(P.cyl, '#3a3a40', [x, 1.2, -0.84], [Math.PI / 2, 0, 0], [0.3, 0.03, 0.3]); }
      s.add(P.cylLo, '#c8c8d0', [0, 1.1, 0.8], null, [0.03, 1.1, 0.03]);
      s.add(P.sphere, '#2a2a2a', [0, 1.72, 0.8], null, [0.08, 0.1, 0.08]);
      for (const x of [-2, 0, 2]) s.add(P.sphere, ['#ff5fd0', '#5ff8ff', '#ffd84d'][(x + 2) / 2], [x, 4.5, -1.6], null, [0.25, 0.25, 0.25], true);
    },
    f_conveyor(s) {
      s.add(P.box, '#3a3a40', [0, 0.85, 0], null, [8, 0.15, 1.4]);
      for (let x = -3.5; x <= 3.5; x += 1.75) s.add(P.box, '#5a5a62', [x, 0.4, 0], null, [0.15, 0.8, 1.2]);
      for (let x = -3; x <= 3; x += 1.5) s.add(P.sphere, ['#ff8fc8', '#5ff8ff', '#b46aff'][Math.abs(Math.round(x)) % 3], [x, 1.1, 0], null, [0.3, 0.25, 0.3]);
      s.add(P.box, '#8a8a92', [3.6, 1.6, 0], null, [0.8, 1.6, 1.6]);
    },
    f_vat(s) {
      s.add(P.cyl, '#8a909a', [0, 1.1, 0], null, [1.3, 2.2, 1.3]);
      s.add(P.cyl, '#5ff8ff', [0, 2.22, 0], null, [1.15, 0.06, 1.15], true);
      for (const a of [0, 2.1, 4.2]) s.add(P.box, '#5ff8ff', [Math.cos(a) * 0.5, 2.6, Math.sin(a) * 0.5], [0.2, a, 0.1], [0.25, 0.8, 0.25], true);
    },
    f_ringtable(s) {
      const n = 14;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s.add(P.box, '#c8ccd8', [Math.sin(a) * 2.2, 0.8, Math.cos(a) * 2.2], [0, a, 0], [1.05, 0.1, 0.7]); s.add(P.box, '#4a5470', [Math.sin(a) * 3.0, 0.5, Math.cos(a) * 3.0], [0, a, 0], [0.5, 1.0, 0.1]); }
      s.add(P.cyl, '#4a5470', [0, 0.4, 0], null, [1.2, 0.8, 1.2]);
      s.add(P.sphere, '#5ff8ff', [0, 1.4, 0], null, [0.6, 0.6, 0.6], true);
    },
    f_podium(s) {
      s.add(P.box, '#6a4a2a', [0, 0.6, 0], null, [1.0, 1.2, 0.7]);
      s.add(P.box, '#8a6a4a', [0, 1.25, -0.05], [-0.25, 0, 0], [1.1, 0.08, 0.8]);
      s.add(P.cyl, '#ffd84d', [0, 0.7, 0.36], [Math.PI / 2, 0, 0], [0.25, 0.03, 0.25]);
    },
    f_ballpit(s) {
      for (const [x, z, w, d] of [[0, -2.3, 5, 0.3], [0, 2.3, 5, 0.3], [-2.4, 0, 0.3, 4.6], [2.4, 0, 0.3, 4.6]]) s.add(P.box, '#5fb4ff', [x, 0.3, z], null, [w, 0.6, d]);
      for (let i = 0; i < 46; i++) { const x = ((i * 37) % 44) / 10 - 2.1, z = ((i * 53) % 40) / 10 - 2.0; s.add(P.sphere, ['#ff5f5f', '#ffd84d', '#5fb4ff', '#5fdc5f'][i % 4], [x, 0.35, z], null, [0.22, 0.22, 0.22]); }
    },
    f_throne(s) {
      s.add(P.box, '#c8a040', [0, 0.25, 0], null, [2.4, 0.5, 2.0]);
      s.add(P.box, '#a83838', [0, 0.85, 0.1], null, [1.4, 0.7, 1.2]);
      s.add(P.box, '#c8a040', [0, 2.0, -0.6], null, [1.6, 3.0, 0.3]);
      for (const x of [-0.75, 0.75]) s.add(P.box, '#c8a040', [x, 1.2, 0.1], null, [0.2, 0.6, 1.2]);
      for (const x of [-0.6, 0, 0.6]) s.add(P.cone, '#ffd84d', [x, 3.7, -0.6], null, [0.18, 0.5, 0.18]);
    },
    f_tvwall(s) {
      s.add(P.box, '#2a2a30', [0, 1.75, -0.2], null, [8, 3.5, 0.3]);
      const cols = ['#5fb4ff', '#ff8fc8', '#5fdc5f', '#ffd84d', '#b46aff', '#ff8a4a'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { s.add(P.box, '#111114', [-3.3 + c * 1.32, 0.7 + r * 1.05, -0.02], null, [1.2, 0.9, 0.08]); s.add(P.box, cols[(r * 2 + c) % 6], [-3.3 + c * 1.32, 0.7 + r * 1.05, 0.03], null, [1.05, 0.75, 0.02], true); }
    },
    f_statue(s) {
      s.add(P.box, '#d8d4c8', [0, 0.5, 0], null, [1.4, 1.0, 1.4]);
      s.add(P.capsule, '#e8e4d8', [0, 1.9, 0], null, [0.35, 1.0, 0.35]);
      s.add(P.sphere, '#e8e4d8', [0, 2.75, 0], null, [0.3, 0.32, 0.3]);
    },
    f_ufo(s) {
      s.add(P.cyl, '#b8c0c8', [0, 1.4, 0], null, [4.2, 0.5, 4.2]);
      s.add(P.sphere, '#9ac8e8', [0, 1.9, 0], null, [1.6, 1.0, 1.6]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.sphere, '#5ff86a', [Math.sin(a) * 3.6, 1.35, Math.cos(a) * 3.6], null, [0.2, 0.2, 0.2], true); }
      for (const a of [0.5, 2.6, 4.7]) s.add(P.cylLo, '#6a7078', [Math.sin(a) * 2.6, 0.6, Math.cos(a) * 2.6], [Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3], [0.08, 1.4, 0.08]);
      s.add(P.box, '#6a7a5a', [1.5, 2.2, 0.5], [0.3, 0.4, 0.2], [3.2, 0.06, 2.6]);   // the tarp, half off
    },
    f_doorwall(s) {
      s.add(P.box, '#e8dcc4', [0, 1.5, -0.2], null, [9, 3, 0.3]);
      const cols = ['#8a3a2a', '#3a6a8a', '#e8e4dc', '#2a5a3a', '#c8a040', '#6a3a8a'];
      for (let i = 0; i < 6; i++) { const x = -3.75 + i * 1.5; s.add(P.box, '#fbf6ea', [x, 1.15, -0.02], null, [1.15, 2.3, 0.08]); s.add(P.box, cols[i], [x, 1.1, 0.03], null, [0.95, 2.1, 0.05]); s.add(P.sphere, '#ffd84d', [x + 0.35, 1.1, 0.08], null, [0.06, 0.06, 0.06]); }
    },
    // The Smiths' bathroom upstairs.
    bathtub(s) {
      s.add(P.box, '#f4f4f0', [0, 0.3, 0], null, [0.85, 0.6, 1.8]);
      s.add(P.box, '#bfe4f4', [0, 0.5, 0], null, [0.65, 0.04, 1.6]);
      s.add(P.box, '#e8e8e2', [0, 0.61, 0], null, [0.85, 0.04, 1.8]);
      s.add(P.cylLo, '#b8bec4', [0, 0.9, 0.78], [Math.PI / 2, 0, 0], [0.03, 0.3, 0.03]);
      s.add(P.cylLo, '#b8bec4', [0, 1.9, 0.86], null, [0.02, 2.0, 0.02]);   // shower riser
      s.add(P.cylLo, '#b8bec4', [0, 2.9, 0.7], null, [0.14, 0.03, 0.14]);
      s.add(P.box, '#9ad0e8', [-0.43, 1.6, 0], null, [0.02, 2.0, 1.8]);   // the curtain
    },
    toilet(s) {
      s.add(P.box, '#f4f4f0', [0, 0.2, 0.05], null, [0.38, 0.4, 0.5]);
      s.add(P.cyl, '#f4f4f0', [0, 0.42, 0.12], null, [0.24, 0.06, 0.28]);
      s.add(P.cyl, '#e2e2dc', [0, 0.46, 0.12], null, [0.2, 0.02, 0.24]);
      s.add(P.box, '#f4f4f0', [0, 0.62, -0.2], null, [0.46, 0.42, 0.2]);
    },
    bathsink(s) {
      s.add(P.cyl, '#f4f4f0', [0, 0.4, 0], null, [0.12, 0.8, 0.12]);
      s.add(P.box, '#f4f4f0', [0, 0.86, 0], null, [0.6, 0.12, 0.45]);
      s.add(P.box, '#bfe4f4', [0, 0.92, 0.02], null, [0.42, 0.02, 0.28]);
      s.add(P.cylLo, '#b8bec4', [0, 1.0, -0.16], null, [0.025, 0.2, 0.025]);
    },
    bathmirror(s) {
      s.add(P.box, '#e2e2dc', [0, 1.75, 0], null, [0.7, 0.9, 0.04]);
      s.add(P.box, '#cfe8f4', [0, 1.75, 0.025], null, [0.6, 0.8, 0.02], true);
    },
    lm_plumbus(s) {
      s.add(P.cyl, '#6b6458', [0, 0.45, 0], null, [0.6, 0.9, 0.6]);
      s.add(P.capsule, '#f4a0b8', [0, 1.3, 0], [0, 0, 0.2], [0.22, 0.7, 0.22]);
      s.add(P.sphere, '#e87fa0', [0.15, 1.5, 0], null, [0.38, 0.3, 0.32]);
      s.add(P.sphere, '#d9b0ff', [-0.1, 1.95, 0], null, [0.2, 0.22, 0.2]);
      s.add(P.capsule, '#f4a0b8', [0.3, 1.1, 0.1], [0, 0, -1.2], [0.08, 0.35, 0.08]);
      s.add(P.sphere, '#ffd0e0', [0.42, 1.35, 0], null, [0.12, 0.12, 0.12]);
    },
    lm_mbox(s) {
      s.add(P.cyl, '#6b6458', [0, 0.4, 0], null, [0.6, 0.8, 0.6]);
      s.add(P.box, '#3c8fd8', [0, 1.05, 0], null, [0.8, 0.5, 0.8]);
      s.add(P.cyl, '#7ec8f0', [0, 1.36, 0], null, [0.22, 0.14, 0.22], true);
    },
    lm_battery(s) {
      s.add(P.box, '#2a2a30', [0, 0.5, 0], null, [1.6, 1.0, 1.1]);
      s.add(P.box, '#ffd84d', [0, 1.02, 0], null, [1.2, 0.05, 0.7], true);
      for (const x of [-0.5, 0.5]) s.add(P.cyl, x < 0 ? '#e2483d' : '#2a2a2a', [x, 1.15, 0], null, [0.12, 0.25, 0.12]);
      s.add(P.box, '#5ff8ff', [0, 0.55, 0.56], null, [1.2, 0.5, 0.03], true);
    },
    // The sectional roll-up garage door (inside view) with its overhead tracks.
    lm_gdoor(s) {
      const w = 6.4, h = 3.6;
      s.add(P.box, '#7a5a3a', [0, h + 0.1, 0], null, [w + 0.5, 0.25, 0.25]);
      for (const sx of [-1, 1]) s.add(P.box, '#7a5a3a', [sx * (w / 2 + 0.12), h / 2, 0], null, [0.25, h + 0.2, 0.25]);
      s.add(P.box, '#f4f2ec', [0, h / 2, -0.05], null, [w, h, 0.08]);
      for (let i = 1; i < 4; i++) s.add(P.box, '#d4d0c6', [0, i * h / 4, -0.1], null, [w, 0.05, 0.03]);
      for (let i = 0; i < 4; i++) s.add(P.box, '#bfe6ff', [-w * 0.375 + i * w / 4, h * 0.84, -0.11], null, [w / 4 - 0.25, 0.4, 0.02], true);
      s.add(P.box, '#59606e', [0, 1.0, -0.13], null, [0.5, 0.08, 0.04]);
      for (const sx of [-1, 1]) {
        s.add(P.box, '#7d858e', [sx * (w / 2 - 0.05), h - 0.05, -2.0], null, [0.08, 0.1, 4.0]);   // ceiling tracks
        s.add(P.cylLo, '#59606e', [sx * (w / 2 - 0.05), h + 0.3, -3.8], null, [0.03, 0.7, 0.03]);
      }
      s.add(P.box, '#59606e', [0, h + 0.35, -2.6], null, [0.5, 0.25, 0.8]);   // the opener motor
      s.add(P.box, '#7d858e', [0, h + 0.38, -1.2], null, [0.08, 0.06, 2.6]);
    },
    // The glass hatch down to the secret lab.
    lm_trapdoor(s) {
      s.add(P.box, '#59606e', [0, 0.04, 0], null, [2.0, 0.08, 2.0]);
      s.add(P.box, '#7ae8ff', [0, 0.06, 0], null, [1.7, 0.04, 1.7], true);
      for (const v of [-0.85, 0.85]) { s.add(P.box, '#59606e', [v, 0.09, 0], null, [0.06, 0.06, 1.8]); s.add(P.box, '#59606e', [0, 0.09, v], null, [1.8, 0.06, 0.06]); }
      s.add(P.box, '#ffd84d', [0, 0.1, 0.6], null, [0.5, 0.04, 0.12], true);
    },
    lm_cellardoor(s) {
      s.add(P.box, '#3a2618', [0, 1.7, 0], null, [2.2, 3.4, 0.3]);
      s.add(P.box, '#ff9b4d', [0, 1.6, 0.16], null, [1.6, 2.8, 0.04], true);
      s.add(P.sphereLo, '#ffd84d', [0.55, 1.6, 0.25], null, [0.1, 0.1, 0.1], true);
    },
    // The Space Cruiser: a grey-silver saucer of a car with a rim, a bubble windscreen
    // up front, two open seats, a trunk at the back and an engine pod on each side.
    spacecruiser(s) {
      const hull = '#a8adb0';
      s.add(P.sphere, hull, [0, 0.85, 0], null, [1.6, 0.42, 2.0]);
      s.add(P.torus, '#8f969c', [0, 0.85, 0], [Math.PI / 2, 0, 0], [1.6, 2.0, 0.6]);
      s.add(P.cyl, '#6e757b', [0, 0.45, 0], null, [1.0, 0.3, 1.2]);
      s.add(P.hemi, '#bfe9ff', [0, 1.05, -0.9], [0.5, 0, 0], [0.95, 0.55, 0.55], true);    // windscreen
      for (const sx of [-1, 1]) {
        s.add(P.box, '#7a3a2a', [sx * 0.45, 1.12, 0.15], null, [0.6, 0.2, 0.6]);             // seats
        s.add(P.box, '#7a3a2a', [sx * 0.45, 1.42, 0.5], [-0.2, 0, 0], [0.6, 0.6, 0.15]);
        s.add(P.capsule, '#59606e', [sx * 1.75, 0.85, 0.3], [Math.PI / 2, 0, 0], [0.28, 0.55, 0.28]);   // engine pods
        s.add(P.cyl, '#ffb03a', [sx * 1.75, 0.85, 1.35], [Math.PI / 2, 0, 0], [0.2, 0.06, 0.2], true);
        s.add(P.cyl, '#26262a', [sx * 1.1, 0.3, -1.1], [0, 0, Math.PI / 2], [0.25, 0.18, 0.25]);   // little wheels
        s.add(P.cyl, '#26262a', [sx * 1.1, 0.3, 1.1], [0, 0, Math.PI / 2], [0.25, 0.18, 0.25]);
      }
      s.add(P.box, '#8f969c', [0, 1.05, 1.45], [-0.15, 0, 0], [1.3, 0.25, 0.8]);             // trunk lid
      s.add(P.cylLo, '#59606e', [0.5, 1.35, -0.35], [0.7, 0, 0], [0.03, 0.4, 0.03]);          // steering stick
      s.add(P.box, '#e2483d', [0, 0.9, -2.0], null, [0.9, 0.12, 0.06], true);
    },
    shelf(s) {
      s.add(P.box, '#6b4a2b', [0, 1.6, 0], null, [2.6, 3.2, 0.8]);
      for (let y = 0; y < 3; y++) for (let i = 0; i < 4; i++) s.add(P.cyl, ['#39ff6a', '#ff6fd0', '#ffd84d', '#5ff8ff'][(i + y) % 4], [-0.9 + i * 0.6, 0.5 + y * 1.0, 0.25], null, [0.15, 0.4, 0.15], true);
    },
    weaponrack(s) {
      s.add(P.box, '#59606e', [0, 1.6, 0], null, [3.2, 3.0, 0.2]);
      for (let i = 0; i < 4; i++) { s.add(P.box, '#d8dde2', [-1.1 + i * 0.75, 1.8, 0.2], [0, 0, Math.PI / 2], [1.2, 0.2, 0.15]); s.add(P.sphereLo, ['#ff5a5a', '#39ff6a', '#ffd84d', '#b48aff'][i], [-1.1 + i * 0.75, 1.2, 0.25], null, [0.1, 0.1, 0.1], true); }
    },
    beakers(s) {
      s.add(P.box, '#8a5a32', [0, 0.8, 0], null, [2.6, 0.15, 1.2]);
      for (const x of [-1.1, 1.1]) s.add(P.box, '#5a3a20', [x, 0.4, 0], null, [0.15, 0.8, 1.0]);
      for (let i = 0; i < 5; i++) s.add(P.cyl, ['#39ff6a', '#ff6fd0', '#5ff8ff', '#ffd84d', '#ff5a3a'][i], [-1 + i * 0.5, 1.15, 0], null, [0.12 + (i % 2) * 0.05, 0.5 + (i % 3) * 0.2, 0.12], true);
    },
    drums(s) { for (const [x, z] of [[-0.5, 0], [0.5, 0.3]]) { s.add(P.cyl, '#3a62a8', [x, 0.7, z], null, [0.5, 1.4, 0.5]); s.add(P.cyl, '#2a2a30', [x, 1.41, z], null, [0.52, 0.04, 0.52]); } },
    toolchest(s) {
      s.add(P.box, '#c8504a', [0, 0.8, 0], null, [1.2, 1.6, 0.8]);
      for (let i = 0; i < 4; i++) s.add(P.box, '#c9c9c9', [0, 0.3 + i * 0.38, 0.41], null, [0.8, 0.05, 0.02]);
    },
    // ----- Secret lab -----
    clonetank(s) {
      s.add(P.cyl, '#59606e', [0, 0.2, 0], null, [1.0, 0.4, 1.0]);
      s.add(P.cyl, '#7affea', [0, 1.9, 0], null, [0.9, 3.0, 0.9], true);
      s.add(P.capsule, '#e8f0d8', [0, 1.2, 0], null, [0.28, 1.2, 0.22]);
      s.add(P.sphere, '#e8f0d8', [0, 2.6, 0], null, [0.3, 0.38, 0.3]);
      s.add(P.cyl, '#59606e', [0, 3.5, 0], null, [1.0, 0.3, 1.0]);
    },
    bigcomputer(s) {
      s.add(P.box, '#3a3f4a', [0, 2, 0], null, [4.2, 4, 1.2]);
      for (let i = 0; i < 3; i++) s.add(P.box, ['#39ff6a', '#5ff8ff', '#ffd84d'][i], [-1.3 + i * 1.3, 2.6, 0.62], null, [1.0, 1.2, 0.03], true);
      for (let i = 0; i < 8; i++) s.add(P.sphereLo, i % 2 ? '#ff5a5a' : '#39ff6a', [-1.6 + i * 0.45, 1.2, 0.62], null, [0.08, 0.08, 0.04], true);
    },
    labmachine(s) {
      s.add(P.cyl, '#59606e', [0, 1.2, 0], null, [1.6, 2.4, 1.6]);
      s.add(P.torus, '#5ff8ff', [0, 2.6, 0], [Math.PI / 2, 0, 0], [1.2, 1.2, 0.6], true);
      s.add(P.sphere, '#b48aff', [0, 3, 0], null, [0.5, 0.5, 0.5], true);
    },
    lm_ladder(s) {
      for (const x of [-0.5, 0.5]) s.add(P.cyl, '#9aa3ab', [x, 2.5, 0], null, [0.06, 5, 0.06]);
      for (let i = 0; i < 9; i++) s.add(P.cyl, '#9aa3ab', [0, 0.4 + i * 0.55, 0], [0, 0, Math.PI / 2], [0.05, 1.0, 0.05]);
    },
    lm_mindblowers(s) {
      s.add(P.box, '#3a3f4a', [0, 1.2, 0], null, [2.4, 2.4, 0.9]);
      for (let y = 0; y < 3; y++) for (let i = 0; i < 6; i++) s.add(P.cyl, '#b48aff', [-0.9 + i * 0.36, 0.5 + y * 0.7, 0.3], null, [0.08, 0.4, 0.08], true);
    },
    // ----- Wine cellar -----
    barrel(s) { s.add(P.cyl, '#7a5030', [0, 0.9, 0], [0, 0, Math.PI / 2], [0.9, 1.8, 0.9]); for (const x of [-0.6, 0.6]) s.add(P.cyl, '#3a2618', [x, 0.9, 0], [0, 0, Math.PI / 2], [0.93, 0.08, 0.93]); },
    bottlerack(s) {
      s.add(P.box, '#4a3020', [0, 1.5, 0], null, [3.0, 3.0, 0.8]);
      for (let y = 0; y < 4; y++) for (let i = 0; i < 6; i++) s.add(P.cyl, ['#3a6a2a', '#6a1a2a', '#2a3a6a'][(i + y) % 3], [-1.2 + i * 0.48, 0.45 + y * 0.7, 0.3], [Math.PI / 2, 0, 0], [0.11, 0.6, 0.11]);
    },
    lm_winerack(s) {
      s.add(P.box, '#4a3020', [0, 1.5, 0], null, [4.0, 3.0, 0.9]);
      for (let y = 0; y < 4; y++) for (let i = 0; i < 8; i++) s.add(P.cyl, ['#3a6a2a', '#6a1a2a', '#ffd84d'][(i * 3 + y) % 3], [-1.7 + i * 0.48, 0.45 + y * 0.7, 0.3], [Math.PI / 2, 0, 0], [0.11, 0.6, 0.11], (i * 3 + y) % 3 === 2);
    },
    // ----- Landmarks -----
    // The Smith family home: two storeys of cream siding under a brown roof, a porch with
    // white columns, the front door a little left of the middle. The garage stands on its left
    // (its own landmark); out the back, a door to the kitchen, and one on the garage side into
    // Rick's room. Doors match the floor plan inside (shared/interiors.js).
    lm_home(s) {
      const w = 14, d = 10, h = 6.4, wall = '#ecdcb4', trim = '#fbf6ea', roof = '#5e3f2e', door = '#7a3326';
      suburbanHouse(s, { w, d, h, stories: 2, wall, trim, roof, door, shutter: '#4e6a3a', porch: false, chimney: true, winX: [-4.4, 3.4], doorX: -0.63, roofH: 3.6 });
      // A porch across most of the front: deck, white columns and rail, its own little roof.
      s.add(P.box, '#a89a84', [-0.4, 0.28, d / 2 + 1.25], null, [9.2, 0.18, 2.5]);
      s.add(P.box, '#b8b0a2', [-0.63, 0.12, d / 2 + 2.8], null, [2.0, 0.22, 0.7]);                      // the step
      for (const x of [-4.8, -2.0, 0.8, 3.8]) s.add(P.cyl, trim, [x, 1.85, d / 2 + 2.3], null, [0.12, 2.9, 0.12]);
      for (const [x0, x1] of [[-4.8, -1.6], [0.4, 3.8]]) {
        s.add(P.box, trim, [(x0 + x1) / 2, 0.95, d / 2 + 2.3], null, [x1 - x0, 0.08, 0.08]);
        for (let x = x0 + 0.3; x < x1; x += 0.3) s.add(P.box, trim, [x, 0.66, d / 2 + 2.3], null, [0.04, 0.55, 0.04]);
      }
      s.add(P.box, roof, [-0.4, 3.45, d / 2 + 1.3], [-0.22, 0, 0], [9.6, 0.16, 2.9]);
      s.add(P.box, trim, [-0.4, 3.22, d / 2 + 2.45], null, [9.6, 0.2, 0.12]);
      // The back door to the kitchen, with steps down to the yard.
      s.add(P.box, trim, [4.45, 1.6, -d / 2 - 0.03], null, [1.4, 2.5, 0.08]);
      s.add(P.box, '#f4f0e6', [4.45, 1.55, -d / 2 - 0.07], null, [1.0, 2.2, 0.06]);
      s.add(P.box, '#bfdcec', [4.45, 2.0, -d / 2 - 0.11], null, [0.6, 0.7, 0.02]);
      s.add(P.box, '#b8b0a2', [4.45, 0.3, -d / 2 - 0.7], null, [2.0, 0.3, 1.3]);
      // The side door into Rick's room, on the garage side.
      s.add(P.box, trim, [-w / 2 - 0.03, 1.6, -2.8], null, [0.08, 2.5, 1.4]);
      s.add(P.box, door, [-w / 2 - 0.07, 1.55, -2.8], null, [0.06, 2.2, 1.0]);
      s.add(P.box, '#b8b0a2', [-w / 2 - 0.6, 0.25, -2.8], null, [1.1, 0.2, 1.6]);
      // Back windows (kitchen, Summer's room, the bathroom).
      for (const [x, y] of [[-3.6, 2.2], [1.6, 2.2], [-3.6, 5.2], [3.6, 5.2]]) {
        s.add(P.box, '#fbfaf6', [x, y, -d / 2 - 0.03], null, [1.54, 1.44, 0.1]);
        s.add(P.box, '#bfdcec', [x, y, -d / 2 - 0.08], null, [1.3, 1.2, 0.04]);
        s.add(P.box, '#fbfaf6', [x, y, -d / 2 - 0.11], null, [0.07, 1.2, 0.03]);
      }
      s.add(P.box, '#c9b48c', [-0.63, 0.05, d / 2 + 4.6], null, [1.4, 0.05, 3]);     // front path
      for (const x of [-6.2, 5.6]) s.add(P.sphere, '#3f8a34', [x, 0.6, d / 2 + 0.8], null, [1.1, 0.8, 0.8]);   // bushes by the porch
    },
    // The back yard: lawn, a grey brick wall round three sides, Rick's white shed with a brown
    // roof in the far corner, the big tree, and under it the two graves where Rick and Morty
    // buried this Earth's Rick and Morty ("Rick Potion #9"). Front (+z) = toward the house.
    lm_backyard(s) {
      const brick = '#8e8c88', cap = '#a8a6a0', mortar = '#77756f';
      s.add(P.box, '#62b444', [0, 0.02, 0.2], null, [26.8, 0.04, 17.2]);
      // The wall, 1.8 m, with piers every 3 m and a capping course.
      const wallRun = (x1, z1, x2, z2) => {
        const len = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1);
        s.add(P.box, brick, [(x1 + x2) / 2, 0.9, (z1 + z2) / 2], [0, a, 0], [0.3, 1.8, len]);
        s.add(P.box, cap, [(x1 + x2) / 2, 1.85, (z1 + z2) / 2], [0, a, 0], [0.38, 0.1, len + 0.08]);
        for (let y = 0.3; y < 1.8; y += 0.3) s.add(P.box, mortar, [(x1 + x2) / 2, y, (z1 + z2) / 2], [0, a, 0], [0.31, 0.03, len]);
        const n = Math.max(1, Math.round(len / 3));
        for (let i = 0; i <= n; i++) s.add(P.box, brick, [x1 + (x2 - x1) * i / n, 1.0, z1 + (z2 - z1) * i / n], [0, a, 0], [0.45, 2.0, 0.45]);
      };
      wallRun(-13.5, -8.5, 13.5, -8.5); wallRun(-13.5, -8.5, -13.5, 8.0); wallRun(13.5, -8.5, 13.5, 8.9);
      // Rick's shed: white boards, a brown gable roof, a door facing the house.
      const sx = -8.5, sz = -5.5;
      s.add(P.box, '#f2efe6', [sx, 1.2, sz], null, [3.0, 2.4, 2.6]);
      for (let x = -1.35; x <= 1.4; x += 0.3) s.add(P.box, '#dedad0', [sx + x, 1.2, sz + 1.31], null, [0.04, 2.4, 0.02]);
      s.add(P.prism, '#6a4430', [sx, 2.4, sz], null, [3.6, 1.2, 3.2]);
      s.add(P.box, '#8a6a4a', [sx + 0.4, 1.0, sz + 1.32], null, [1.0, 2.0, 0.04]);
      s.add(P.box, '#bfdcec', [sx - 0.9, 1.6, sz + 1.32], null, [0.6, 0.5, 0.03]);
      // The big tree, and the two graves in its shade: low mounds of turned earth.
      const tx = 9.5, tz = -6;
      s.add(P.cylLo, '#6e4a2c', [tx, 1.8, tz], null, [0.42, 3.6, 0.42]);
      s.add(P.cylLo, '#6e4a2c', [tx + 0.6, 3.8, tz], [0, 0, -0.6], [0.2, 1.8, 0.2]);
      s.add(P.cylLo, '#6e4a2c', [tx - 0.6, 3.9, tz + 0.1], [0.2, 0, 0.55], [0.2, 1.7, 0.2]);
      for (const [x, y, z, r] of [[0, 5.8, 0, 3.0], [1.9, 5.3, 0.6, 2.0], [-1.9, 5.4, -0.3, 2.0], [0.4, 5.5, 1.9, 1.9], [-0.3, 5.4, -1.9, 1.9], [0.6, 7.3, 0.2, 2.0]]) s.add(P.sphere, y > 6.5 ? '#58b048' : '#47963a', [tx + x, y, tz + z], null, [r, r * 0.85, r]);
      for (const gx of [6.3, 7.7]) {
        s.add(P.box, '#6a4a30', [gx, 0.12, -4], null, [0.9, 0.24, 2.0]);
        s.add(P.sphere, '#7a5838', [gx, 0.2, -4], null, [0.5, 0.18, 1.0]);
      }
      s.add(P.sphere, '#ff6a8a', [6.3, 0.34, -3.3], null, [0.12, 0.08, 0.12]);   // somebody left flowers
      s.add(P.sphere, '#ffe066', [7.7, 0.34, -3.2], null, [0.12, 0.08, 0.12]);
      s.add(P.box, '#8a6a4a', [10.8, 0.6, -2.2], [0, 0.4, -0.2], [0.08, 1.2, 0.4]);  // the shovel, still leaning there
      // Bushes along the wall, a patio by the back door, a grill and two lawn chairs.
      for (const [x, z] of [[-12.6, 2], [-12.6, -3], [12.6, 3.5], [-3, -7.6], [2.5, -7.6]]) s.add(P.sphere, '#3f8a34', [x, 0.55, z], null, [0.9, 0.7, 0.9]);
      s.add(P.box, '#bcb4a6', [4.5, 0.05, 6.7], null, [4.5, 0.08, 3.4]);
      s.add(P.cyl, '#2a2a2a', [2.6, 0.9, 6.1], null, [0.35, 0.3, 0.35]);
      s.add(P.cylLo, '#2a2a2a', [2.6, 0.45, 6.1], null, [0.04, 0.9, 0.04]);
      for (const x of [5.2, 6.6]) {
        s.add(P.box, '#ffffff', [x, 0.42, 5.6], null, [0.6, 0.06, 0.6]);
        s.add(P.box, '#ffffff', [x, 0.75, 5.32], [-0.3, 0, 0], [0.6, 0.65, 0.06]);
      }
    },
    // Rick's garage: same siding and roof as the house, white sectional door, side window.
    // Rick's garage, standing open: thin walls you can walk between, the big door rolled up
    // under the eaves, the side door open, a concrete floor, beams and a hanging light.
    // Collision is the walls only (MM.PROPS.lm_garage.walls), so you just walk in.
    lm_garage(s) {
      const w = 9, d = 9, h = 3.6, t = 0.2, wall = '#e6d2a8', inner = '#9c936e', trim = '#fbf6ea';
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [w + 0.2, 0.4, d + 0.2]);
      s.add(P.box, '#77776f', [0, 0.41, 0], null, [w - 0.3, 0.02, d - 0.3]);                        // concrete floor
      const panel = (x, z, sx, sz) => { s.add(P.box, wall, [x, 0.4 + h / 2, z], null, [sx, h, sz]); };
      panel(0, -d / 2 + t / 2, w, t);                                                                  // back
      panel(-w / 2 + t / 2, 0, t, d); panel(w / 2 - t / 2, 0, t, d);                                  // sides
      panel((-w / 2 + -3.4) / 2, d / 2 - t / 2, w / 2 - 3.4, t);                                       // front, left of the door
      panel((2.2 + 3.05) / 2, d / 2 - t / 2, 0.85, t); panel((4.15 + w / 2) / 2, d / 2 - t / 2, 0.35, t);
      s.add(P.box, wall, [-0.6, 0.4 + 3.1 + (h - 3.1) / 2, d / 2 - t / 2], null, [5.6, h - 3.1, t]);   // over the big door
      s.add(P.box, wall, [3.6, 0.4 + 2.3 + (h - 2.3) / 2, d / 2 - t / 2], null, [1.1, h - 2.3, t]);    // over the side door
      // Inside: khaki panelling, wooden studs, beams across.
      for (const sx of [-1, 1]) s.add(P.box, inner, [sx * (w / 2 - t - 0.01), 0.4 + h / 2, 0], null, [0.02, h - 0.1, d - 0.5]);
      s.add(P.box, inner, [0, 0.4 + h / 2, -d / 2 + t + 0.01], null, [w - 0.5, h - 0.1, 0.02]);
      for (let i = -3; i <= 3; i++) s.add(P.box, '#6e5034', [i * 1.25, 0.4 + h / 2, -d / 2 + t + 0.06], null, [0.09, h, 0.09]);
      for (let i = -3; i <= 3; i++) s.add(P.box, '#6e5034', [0, 0.4 + h - 0.12, i * 1.25], null, [w - 0.4, 0.14, 0.14]);
      s.add(P.box, '#d8d2c4', [0, 0.4 + h + 0.02, 0], null, [w - 0.2, 0.06, d - 0.2]);                 // ceiling
      s.add(P.cylLo, '#2a2a2a', [0, 0.4 + h - 0.45, 0], null, [0.02, 0.6, 0.02]);
      s.add(P.sphere, '#fff6c8', [0, 0.4 + h - 0.8, 0], null, [0.16, 0.12, 0.16], true);               // the bulb
      // Outside: siding on the walls beside the doors, corner trim, the gable roof, the
      // rolled-up door under the eaves.
      for (let y = 0.7; y < 0.4 + h; y += 0.32) {
        s.add(P.box, shade(wall, 0.9), [(-w / 2 - 3.4) / 2 - 0.15, y, d / 2 + 0.01], null, [w / 2 - 3.4 + 0.3, 0.03, 0.02]);
        if (y > 3.6) s.add(P.box, shade(wall, 0.9), [0.2, y, d / 2 + 0.01], null, [7.3, 0.03, 0.02]);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, trim, [sx * w / 2, 0.4 + h / 2, sz * d / 2], null, [0.22, h, 0.22]);
      gable(s, w, d, 0.4 + h, 2.4, '#6b4a3a', trim);
      s.add(P.box, trim, [-0.6, 0.4 + 3.15, d / 2 + 0.02], null, [5.9, 0.12, 0.1]);                    // door frame
      for (const sx of [-1, 1]) s.add(P.box, trim, [-0.6 + sx * 2.9, 0.4 + 1.55, d / 2 + 0.02], null, [0.12, 3.1, 0.1]);
      s.add(P.box, '#f4f2ec', [-0.6, 0.4 + 2.95, d / 2 - 0.5], null, [5.4, 0.24, 0.9]);                 // the rolled-up door
      s.add(P.box, trim, [3.6, 0.4 + 2.35, d / 2 + 0.02], null, [1.25, 0.1, 0.1]);
      s.add(P.box, '#8a7a6a', [4.12, 0.4 + 1.1, d / 2 + 0.45], [0, 1.2, 0], [0.85, 2.1, 0.06]);         // side door, swung open
      win(s, w / 2, 2.4, -1.5, 1.2, 1.0, null, 1);
      s.add(P.box, '#b8b0a2', [0, 0.03, d / 2 + 3], null, [6, 0.06, 6]);   // driveway apron
    },
    // Harry Herpson High: red brick, white cornice, two rows of windows, a columned entrance, flagpole.
    lm_school(s) {
      const W = 18, D = 9, H = 7.4, brick = '#b4563f';
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, brick, [0, 0.4 + H / 2, 0], null, [W, H, D]);
      for (let y = 0.7; y < H; y += 0.55) s.add(P.box, shade(brick, 0.88), [0, y, D / 2 + 0.01], null, [W, 0.04, 0.02]);
      s.add(P.box, '#f2ede2', [0, 0.4 + H + 0.2, 0], null, [W + 0.6, 0.45, D + 0.6]);
      s.add(P.box, '#f2ede2', [0, 0.4 + H - 1.75, D / 2 + 0.04], null, [W, 0.18, 0.08]);
      for (let i = -3; i <= 3; i++) { if (i === 0) continue; const x = i * 2.5; win(s, x, 2.0, D / 2, 1.4, 1.5); win(s, x, 4.4, D / 2, 1.4, 1.5); }
      for (const sx of [-1, 1]) for (const z of [-2.2, 2.2]) win(s, sx * W / 2, 3.2, z, 1.3, 1.4, null, sx);
      // Entrance: steps, columns, pediment, double doors.
      s.add(P.box, '#d8d2c4', [0, 0.25, D / 2 + 1.4], null, [5.2, 0.5, 2.8]);
      s.add(P.box, '#d8d2c4', [0, 0.55, D / 2 + 0.9], null, [4.6, 0.3, 1.8]);
      for (const x of [-2, -0.7, 0.7, 2]) s.add(P.cyl, '#f6f2ea', [x, 2.6, D / 2 + 2.1], null, [0.24, 4.2, 0.24]);
      s.add(P.box, '#f2ede2', [0, 4.8, D / 2 + 1.2], null, [5.2, 0.4, 2.4]);
      s.add(P.box, '#3c5a7a', [0, 1.8, D / 2 + 0.05], null, [2.2, 2.6, 0.08]);
      s.add(P.box, '#f2ede2', [0, 1.8, D / 2 + 0.09], null, [0.08, 2.6, 0.04]);
      s.add(P.cylLo, '#cfd2d6', [7.5, 6, D / 2 + 3.5], null, [0.08, 12, 0.08]);
      s.add(P.box, '#3c6fb5', [8.4, 11.2, D / 2 + 3.5], null, [1.8, 1.1, 0.05]);
      s.add(P.box, '#e2483d', [8.4, 10.85, D / 2 + 3.53], null, [1.8, 0.2, 0.02]);
      // What makes it a school: the clock over the door, a bike rack, a basketball hoop.
      s.add(P.cyl, '#f6f2ea', [0, 6.4, D / 2 + 0.06], [Math.PI / 2, 0, 0], [0.6, 0.08, 0.6]);
      s.add(P.cyl, '#2a2a2a', [0, 6.4, D / 2 + 0.11], [Math.PI / 2, 0, 0], [0.5, 0.02, 0.5]);
      s.add(P.box, '#f6f2ea', [0, 6.55, D / 2 + 0.14], null, [0.05, 0.32, 0.02]); s.add(P.box, '#f6f2ea', [0.1, 6.4, D / 2 + 0.14], null, [0.22, 0.05, 0.02]);
      for (let i = 0; i < 6; i++) s.add(P.torus, '#9aa0a6', [-7.2 + i * 0.5, 0.45, D / 2 + 2.2], [0, Math.PI / 2, 0], [0.32, 0.32, 0.3]);
      s.add(P.cylLo, '#e8ecef', [-W / 2 - 3, 1.8, D / 2 - 2], null, [0.08, 3.6, 0.08]);
      s.add(P.box, '#f6f6f6', [-W / 2 - 3, 3.5, D / 2 - 1.6], null, [1.2, 0.8, 0.06]);
      s.add(P.torus, '#e2483d', [-W / 2 - 3, 3.05, D / 2 - 1.2], [Math.PI / 2, 0, 0], [0.24, 0.24, 0.24]);
    },
    // A yellow school bus, parked out front of the school.
    schoolbus(s) {
      s.add(P.box, '#f2b81e', [0, 1.35, 0], null, [2.4, 1.9, 8.6]);
      s.add(P.box, '#f2b81e', [0, 1.0, 4.9], null, [2.3, 1.2, 1.4]);
      s.add(P.box, '#1a1a1a', [0, 0.65, 0], null, [2.45, 0.12, 8.7]);
      for (let z = -3.4; z <= 3.4; z += 1.1) for (const sx of [-1, 1]) s.add(P.box, '#3e4d5c', [sx * 1.21, 1.75, z], null, [0.03, 0.6, 0.85]);
      s.add(P.box, '#3e4d5c', [0, 1.75, 4.32], null, [2.1, 0.7, 0.03]);
      for (const z of [-2.8, 3.6]) for (const sx of [-1, 1]) s.add(P.cyl, '#1a1a1a', [sx * 1.15, 0.45, z], [0, 0, Math.PI / 2], [0.45, 0.3, 0.45]);
      s.add(P.box, '#1a1a1a', [0, 2.0, -4.32], null, [2.0, 0.22, 0.03]);
      s.add(P.box, '#e2483d', [1.25, 1.6, 3.2], null, [0.04, 0.5, 0.5]);   // the stop sign
    },
    // The horse hospital: a white clinic with a green trim band, big windows and a horse statue.
    lm_hospital(s) {
      const W = 14, D = 10, H = 7.6;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#f3f1ea', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#4a9a6a', [0, 0.4 + H - 0.3, 0], null, [W + 0.2, 0.6, D + 0.2]);
      s.add(P.box, '#4a9a6a', [0, 0.9, D / 2 + 0.02], null, [W, 0.25, 0.05]);
      for (const x of [-4.6, -2.3, 2.3, 4.6]) { win(s, x, 2.3, D / 2, 1.6, 1.8); win(s, x, 4.9, D / 2, 1.6, 1.5); }
      s.add(P.box, '#bfdcec', [0, 1.6, D / 2 + 0.05], null, [2.6, 2.6, 0.06]);
      s.add(P.box, '#f3f1ea', [0, 1.6, D / 2 + 0.09], null, [0.08, 2.6, 0.04]);
      s.add(P.box, '#4a9a6a', [0, 3.3, D / 2 + 0.9], [-0.15, 0, 0], [4, 0.15, 2]);
      // What makes it a hospital: the red cross, EMERGENCY over the side door, a helipad.
      s.add(P.box, '#f3f1ea', [0, H + 1.4, D / 2 - 0.3], null, [2.2, 2.2, 0.3]);
      s.add(P.box, '#e2483d', [0, H + 1.4, D / 2 - 0.12], null, [1.8, 0.55, 0.05]);
      s.add(P.box, '#e2483d', [0, H + 1.4, D / 2 - 0.12], null, [0.55, 1.8, 0.05]);
      s.add(P.box, '#e2483d', [-W / 2 + 1.8, 3.2, D / 2 + 0.12], null, [2.8, 0.55, 0.08]);
      s.add(P.box, '#ffffff', [-W / 2 + 1.8, 3.2, D / 2 + 0.17], null, [2.4, 0.12, 0.02], true);
      s.add(P.cyl, '#5a5e64', [2, 0.4 + H + 0.02, -1.5], null, [2.6, 0.06, 2.6]);
      s.add(P.box, '#ffd84d', [2 - 0.7, 0.4 + H + 0.06, -1.5], null, [0.2, 0.02, 1.8]); s.add(P.box, '#ffd84d', [2 + 0.7, 0.4 + H + 0.06, -1.5], null, [0.2, 0.02, 1.8]); s.add(P.box, '#ffd84d', [2, 0.4 + H + 0.06, -1.5], null, [1.4, 0.02, 0.2]);
      // A bronze horse out front, in honour of the patients.
      s.add(P.box, '#9aa0a6', [5, 0.4, D / 2 + 2.5], null, [3.4, 0.8, 1.4]);
      horse(s, 4.7, 0.8, D / 2 + 2.5, 1.25, '#a0703f');
    },
    // A horse ambulance: a white van with a horse trailer, red stripe and light bar.
    ambulance(s) {
      s.add(P.box, '#f6f6f2', [0, 1.3, 1.6], null, [2.2, 1.9, 3.2]);
      s.add(P.box, '#f6f6f2', [0, 1.0, 3.7], null, [2.1, 1.2, 1.1]);
      s.add(P.box, '#3e4d5c', [0, 1.5, 4.2], null, [1.9, 0.6, 0.04]);
      s.add(P.box, '#e2483d', [0, 1.15, 1.6], null, [2.24, 0.25, 3.22]);
      s.add(P.box, '#e2483d', [-0.4, 2.3, 2.6], null, [0.5, 0.15, 0.3], true); s.add(P.box, '#3a8aff', [0.4, 2.3, 2.6], null, [0.5, 0.15, 0.3], true);
      s.add(P.box, '#f6f6f2', [0, 1.5, -2.3], null, [2.2, 2.2, 3.4]);                 // the horse trailer
      s.add(P.box, '#e2483d', [1.11, 1.6, -2.3], null, [0.03, 0.5, 0.5]); s.add(P.box, '#e2483d', [1.11, 1.6, -2.3], null, [0.03, 0.16, 1.4]);
      for (const z of [3.4, 0.4, -2.3]) for (const sx of [-1, 1]) s.add(P.cyl, '#1a1a1a', [sx * 1.05, 0.4, z], [0, 0, Math.PI / 2], [0.4, 0.3, 0.4]);
    },
    // The unemployment office: a grey municipal block with a queue of chairs outside.
    lm_office(s) {
      const W = 11, D = 8, H = 7;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#a7adb2', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      for (let y = 1.2; y < H; y += 1.2) s.add(P.box, '#959ba0', [0, y, D / 2 + 0.01], null, [W, 0.06, 0.02]);
      s.add(P.box, '#7d8388', [0, 0.4 + H + 0.15, 0], null, [W + 0.4, 0.3, D + 0.4]);
      for (const x of [-3.6, -1.2, 1.2, 3.6]) win(s, x, 4.3, D / 2, 1.3, 1.4);
      for (const x of [-3.6, 3.6]) win(s, x, 2.0, D / 2, 1.3, 1.4);
      s.add(P.box, '#59606e', [0, 1.5, D / 2 + 0.05], null, [2.2, 2.6, 0.08]);
      s.add(P.box, '#bfdcec', [0, 1.7, D / 2 + 0.1], null, [1.8, 1.8, 0.04]);
      for (let i = 0; i < 5; i++) { const x = -3.2 + i * 1.3; s.add(P.box, '#6a7078', [x, 0.5, D / 2 + 1.8], null, [0.6, 0.08, 0.6]); s.add(P.box, '#6a7078', [x, 0.85, D / 2 + 2.08], null, [0.6, 0.6, 0.06]); for (const sx of [-1, 1]) s.add(P.cylLo, '#3a3f45', [x + sx * 0.25, 0.25, D / 2 + 1.8], null, [0.03, 0.5, 0.03]); }
    },
    lm_forge(s) {
      s.add(P.sphere, '#b84a5d', [0, 2.6, 0], null, [6, 4, 5.5]);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; s.add(P.sphereLo, '#d9677a', [Math.cos(a) * 4.5, 1.2, Math.sin(a) * 4.2], null, [1.6, 1.3, 1.6]); }
      s.add(P.sphere, '#ffb03a', [0, 2.2, 5.0], null, [2.2, 1.8, 0.8], true);
      s.add(P.cyl, '#7c1e34', [2.5, 6.5, -1], null, [0.8, 3, 0.8]);
      s.add(P.sphere, '#fff2e0', [-2.5, 6.4, 2.5], null, [1.0, 1.0, 1.0]);
      s.add(P.sphereLo, '#111', [-2.5, 6.4, 3.4], null, [0.35, 0.35, 0.2]);
    },
    lm_shipyard(s) {
      s.add(P.cyl, '#2b1b47', [0, 0.4, 0], null, [8, 0.8, 8]);
      s.add(P.cyl, '#5ff8ff', [0, 0.82, 0], null, [8.05, 0.05, 8.05], true);
      for (const x of [-6, 6]) s.add(P.box, '#5e3d8f', [x, 4.5, -4], null, [0.7, 9, 0.7]);
      s.add(P.box, '#5e3d8f', [0, 8.8, -4], null, [13, 0.7, 0.7]);
      s.add(P.cylLo, '#888', [2, 6.5, -4], null, [0.05, 4, 0.05]);
      // A saucer under construction.
      s.add(P.sphere, '#c9cfd6', [0, 2.2, 0], null, [4.5, 0.9, 4.5]);
      s.add(P.hemi, '#7fdcff', [0, 2.6, 0], null, [1.8, 1.4, 1.8], true);
      s.add(P.torus, '#ff6fd0', [0, 1.9, 0], [Math.PI / 2, 0, 0], [4.2, 4.2, 0.6], true);
    },
    lm_market(s) {
      s.add(P.cone, '#2b1b47', [0, 3.2, 0], null, [6, 6.4, 6]);
      s.add(P.cyl, '#1a1030', [0, 1, 0], null, [5, 2, 5]);
      s.add(P.box, '#ff6fd0', [0, 2.4, 5], null, [3, 0.5, 0.1], true);
      for (let i = 0; i < 5; i++) s.add(P.octa, ['#ffe066', '#6dff8a', '#ff7a5a', '#7ab8ff', '#ff6fd0'][i], [-2 + i, 1.2, 4.6], null, [0.25, 0.35, 0.25], true);
    },
    lm_refinery(s) {
      s.add(P.hemi, '#d8dde2', [0, 0, 0], null, [7, 6, 7]);
      s.add(P.cyl, '#7affea', [0, 6.5, 0], null, [0.7, 3, 0.7], true);
      s.add(P.octa, '#7affea', [0, 8.6, 0], null, [1, 1.6, 1], true);
      for (const a of [0, 2.1, 4.2]) s.add(P.cyl, '#9aa3ab', [Math.cos(a) * 6, 2, Math.sin(a) * 6], null, [1, 4, 1]);
      s.add(P.box, '#3a3f4a', [0, 1.4, 6.6], null, [2.6, 2.8, 0.6]);
    },
    lm_aerie(s) {
      s.add(P.cyl, '#c9a25a', [0, 1, 0], null, [7, 2, 7]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.cyl, '#e8d6a8', [Math.cos(a) * 5.5, 6, Math.sin(a) * 5.5], null, [0.6, 10, 0.6]); }
      s.add(P.cyl, '#b98c4e', [0, 11.4, 0], null, [7.2, 0.8, 7.2]);
      s.add(P.cone, '#e2483d', [0, 13.5, 0], null, [5, 3.5, 5]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.sphere, '#ffd84d', [Math.cos(a) * 3, 15.5, Math.sin(a) * 3], [0, -a, 0.6], [1.6, 0.25, 0.5]); }
    },
    // ----- Blips and Chitz -----
    // An upright arcade cabinet: angled marquee, glowing screen, control deck, coin door.
    arcade(s) {
      const body = '#2a1e4a', side = '#ff6fd0';
      s.add(P.box, body, [0, 1.1, 0], null, [1.1, 2.2, 0.9]);
      for (const sx of [-1, 1]) s.add(P.box, side, [sx * 0.56, 1.25, 0], null, [0.04, 2.5, 0.95]);
      s.add(P.box, '#ffe066', [0, 2.3, 0.3], null, [1.1, 0.4, 0.3], true);
      s.add(P.box, '#141020', [0, 1.65, 0.38], [-0.2, 0, 0], [0.9, 0.75, 0.1]);
      s.add(P.box, '#5ff8ff', [0, 1.65, 0.44], [-0.2, 0, 0], [0.76, 0.6, 0.02], true);
      s.add(P.box, body, [0, 1.05, 0.55], [0.35, 0, 0], [1.1, 0.12, 0.45]);
      s.add(P.cylLo, '#1a1a1a', [-0.22, 1.18, 0.6], null, [0.03, 0.18, 0.03]);
      s.add(P.sphereLo, '#e2483d', [-0.22, 1.29, 0.6], null, [0.07, 0.07, 0.07]);
      for (let i = 0; i < 3; i++) s.add(P.cylLo, ['#ffd84d', '#39ff6a', '#5ff8ff'][i], [0.05 + i * 0.16, 1.15, 0.62], null, [0.05, 0.04, 0.05], true);
      s.add(P.box, '#14101e', [0, 0.45, 0.46], null, [0.4, 0.3, 0.02]);
      s.add(P.box, '#ff5a3a', [0, 0.5, 0.48], null, [0.08, 0.1, 0.01], true);
    },
    // A skee-ball lane: a long ramp, a target with rings and a ticket slot.
    skeeball(s) {
      s.add(P.box, '#3a2a6a', [0, 0.4, 0.5], null, [1.2, 0.8, 2.4]);
      s.add(P.box, '#d8a868', [0, 0.85, 0.5], [-0.15, 0, 0], [0.9, 0.06, 2.3]);
      for (const sx of [-1, 1]) s.add(P.box, '#ff6fd0', [sx * 0.55, 0.95, 0.5], [-0.15, 0, 0], [0.08, 0.25, 2.4], true);
      s.add(P.box, '#3a2a6a', [0, 1.3, -0.8], null, [1.2, 2.2, 0.5]);
      s.add(P.cyl, '#5ff8ff', [0, 1.25, -0.52], [Math.PI / 2, 0, 0], [0.45, 0.04, 0.45], true);
      s.add(P.cyl, '#2a1e4a', [0, 1.25, -0.5], [Math.PI / 2, 0, 0], [0.33, 0.04, 0.33]);
      s.add(P.cyl, '#ffd84d', [0, 1.25, -0.48], [Math.PI / 2, 0, 0], [0.2, 0.04, 0.2], true);
      s.add(P.box, '#ffe066', [0, 2.2, -0.7], null, [1.2, 0.3, 0.3], true);
      for (let i = 0; i < 3; i++) s.add(P.sphereLo, '#f4efe0', [-0.25 + i * 0.25, 0.95, 1.55], null, [0.11, 0.11, 0.11]);
    },
    // A claw machine: glass box of plush toys on a lit base.
    claw(s) {
      s.add(P.box, '#e2483d', [0, 0.5, 0], null, [1.4, 1.0, 1.4]);
      s.add(P.box, '#ffe066', [0, 0.95, 0.71], null, [1.4, 0.12, 0.02], true);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, '#ffd84d', [sx * 0.67, 1.65, sz * 0.67], null, [0.08, 1.3, 0.08]);
      s.add(P.box, '#e2483d', [0, 2.4, 0], null, [1.45, 0.3, 1.45]);
      s.add(P.box, '#ffffff', [0, 2.4, 0.73], null, [1.0, 0.18, 0.02], true);
      const toys = ['#ff8fd0', '#5ff8ff', '#ffd84d', '#9ae86a', '#b48aff', '#ff9b4d'];
      for (let i = 0; i < 9; i++) s.add(P.sphereLo, toys[i % 6], [-0.4 + (i % 3) * 0.4, 1.15 + Math.floor(i / 3) * 0.08, -0.4 + Math.floor(i / 3) * 0.4], null, [0.17, 0.17, 0.17]);
      s.add(P.cylLo, '#c9cfd6', [0.2, 2.05, 0.1], null, [0.02, 0.5, 0.02]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; s.add(P.box, '#c9cfd6', [0.2 + Math.cos(a) * 0.08, 1.72, 0.1 + Math.sin(a) * 0.08], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], [0.03, 0.22, 0.03]); }
      s.add(P.box, '#bfdcec', [0, 1.65, -0.68], null, [1.26, 1.26, 0.02]);
      s.add(P.box, '#ffd84d', [0, 1.02, 0.67], null, [1.3, 0.08, 0.08]);
    },
    // Roy: A Life Well Lived. A reclined game chair with the VR helmet hanging over it.
    lm_roy(s) {
      s.add(P.box, '#2a1e4a', [0, 0.25, 0], null, [2.4, 0.5, 3.0]);
      s.add(P.box, '#5ff8ff', [0, 0.52, 0], null, [2.45, 0.05, 3.05], true);
      s.add(P.box, '#c84a3a', [0, 0.85, 0.3], null, [1.2, 0.5, 1.6]);
      s.add(P.box, '#c84a3a', [0, 1.6, -0.6], [-0.35, 0, 0], [1.2, 1.6, 0.4]);
      for (const sx of [-1, 1]) s.add(P.box, '#8a2a20', [sx * 0.7, 1.1, 0.2], null, [0.2, 0.3, 1.4]);
      s.add(P.box, '#2a1e4a', [0, 2.1, -1.3], null, [0.3, 3.4, 0.3]);
      s.add(P.box, '#2a1e4a', [0, 3.7, -0.7], null, [0.3, 0.25, 1.4]);
      s.add(P.sphere, '#e8e4dc', [0, 3.05, -0.05], null, [0.45, 0.42, 0.45]);
      s.add(P.box, '#141020', [0, 3.0, 0.32], null, [0.6, 0.22, 0.1]);
      s.add(P.box, '#39ff6a', [0, 3.0, 0.38], null, [0.5, 0.12, 0.02], true);
      s.add(P.cylLo, '#14101e', [0, 3.45, -0.05], null, [0.04, 0.35, 0.04]);
    },

    // ----- Purge Planet: a calm, old-fashioned farming world -----
    farmhouse(s) {
      const wall = '#c8a878', trim = '#6a4a2a', w = 7, d = 6, h = 3.6;
      s.add(P.box, '#5a4a3a', [0, 0.25, 0], null, [w + 0.2, 0.5, d + 0.2]);
      s.add(P.box, wall, [0, 0.5 + h / 2, 0], null, [w, h, d]);
      for (let x = -w / 2 + 0.4; x < w / 2; x += 0.55) s.add(P.box, shade(wall, 0.88), [x, 0.5 + h / 2, d / 2 + 0.01], null, [0.04, h, 0.03]);   // board and batten
      gable(s, w, d, 0.5 + h, 2.6, '#6a4a3a', trim);
      for (const x of [-2.2, 2.2]) {
        s.add(P.box, trim, [x, 2.4, d / 2 + 0.03], null, [1.2, 1.3, 0.08]);
        s.add(P.box, '#ffd890', [x, 2.4, d / 2 + 0.06], null, [0.95, 1.05, 0.04], true);
        s.add(P.box, trim, [x, 2.4, d / 2 + 0.09], null, [0.06, 1.05, 0.03]);
      }
      s.add(P.box, trim, [0, 1.6, d / 2 + 0.05], null, [1.1, 2.2, 0.08]);
      // Porch on posts, and a rocking chair.
      s.add(P.box, '#7a5a3a', [0, 0.45, d / 2 + 1.1], null, [w, 0.15, 2.2]);
      s.add(P.box, '#6a4a3a', [0, 3.3, d / 2 + 1.1], [-0.18, 0, 0], [w + 0.2, 0.12, 2.4]);
      for (const x of [-3.2, -1, 1, 3.2]) s.add(P.box, trim, [x, 1.9, d / 2 + 2.0], null, [0.16, 2.8, 0.16]);
      s.add(P.box, '#7a4a2a', [2.2, 1.05, d / 2 + 1.0], null, [0.6, 0.08, 0.6]);
      s.add(P.box, '#7a4a2a', [2.2, 1.45, d / 2 + 0.72], [-0.15, 0, 0], [0.6, 0.8, 0.06]);
      s.add(P.box, '#7d3a2a', [w * 0.3, 0.5 + h + 1.8, -1], null, [0.7, 2.2, 0.7]);
    },
    barn(s) {
      const red = '#b23a2e', white = '#f4efe0', w = 9, d = 12, h = 4.6;
      s.add(P.box, red, [0, h / 2, 0], null, [w, h, d]);
      for (let x = -w / 2 + 0.5; x < w / 2; x += 0.6) s.add(P.box, shade(red, 0.85), [x, h / 2, d / 2 + 0.01], null, [0.05, h, 0.03]);
      // Gambrel roof: two pitches each side.
      for (const sx of [-1, 1]) {
        s.add(P.box, '#4a4a52', [sx * 3.3, h + 0.9, 0], [0, 0, sx * -1.0], [2.6, 0.18, d + 0.6]);
        s.add(P.box, '#4a4a52', [sx * 1.25, h + 2.5, 0], [0, 0, sx * -0.35], [2.7, 0.18, d + 0.6]);
      }
      // Gable fronts filled in.
      for (const sz of [-1, 1]) {
        s.add(P.prism, red, [0, h, sz * d / 2], null, [w - 0.2, 2.9, 0.2]);
        s.add(P.box, white, [0, h + 1.6, sz * (d / 2 + 0.1)], null, [1.4, 1.0, 0.06]);
      }
      // Big doors with the white X.
      for (const sx of [-1, 1]) {
        const x = sx * 1.3;
        s.add(P.box, white, [x, 1.6, d / 2 + 0.05], null, [2.5, 3.2, 0.06]);
        s.add(P.box, red, [x, 1.6, d / 2 + 0.08], null, [2.2, 2.9, 0.04]);
        for (const r of [0.9, -0.9]) s.add(P.box, white, [x, 1.6, d / 2 + 0.11], [0, 0, r], [0.18, 3.5, 0.03]);
      }
      s.add(P.box, white, [0, 3.45, d / 2 + 0.09], null, [5.2, 0.16, 0.04]);
      // A silo alongside.
      s.add(P.cyl, '#c9cfd6', [w / 2 + 2.2, 4.5, -3], null, [1.8, 9, 1.8]);
      s.add(P.hemi, '#9aa3ab', [w / 2 + 2.2, 9, -3], null, [1.85, 1.4, 1.85]);
      for (let y = 1.5; y < 9; y += 1.5) s.add(P.cyl, '#aab3bd', [w / 2 + 2.2, y, -3], null, [1.83, 0.08, 1.83]);
    },
    // A row of wheat: golden stalks with heads, swaying fields are made of many.
    wheat(s) {
      for (let i = 0; i < 26; i++) {
        const x = -1.5 + (i % 13) * 0.25 + (i > 12 ? 0.12 : 0), z = i > 12 ? 0.25 : -0.15;
        const hh = 1.0 + ((i * 37) % 7) * 0.05;
        s.add(P.cylLo, '#c8a848', [x, hh / 2, z], [0, 0, ((i * 13) % 5 - 2) * 0.05], [0.025, hh, 0.025]);
        s.add(P.capsule, '#e8c860', [x, hh + 0.12, z], null, [0.06, 0.08, 0.06]);
      }
    },
    // An old oil lantern on a wooden post.
    lantern(s) {
      s.add(P.box, '#5a3a20', [0, 1.4, 0], null, [0.16, 2.8, 0.16]);
      s.add(P.box, '#5a3a20', [0, 2.75, 0.3], null, [0.1, 0.1, 0.7]);
      s.add(P.cylLo, '#2a2a2a', [0, 2.5, 0.6], null, [0.02, 0.4, 0.02]);
      s.add(P.cyl, '#2a2a2a', [0, 2.33, 0.6], null, [0.16, 0.05, 0.16]);
      s.add(P.cyl, '#ffcf6a', [0, 2.15, 0.6], null, [0.13, 0.32, 0.13], true);
      s.add(P.cone, '#2a2a2a', [0, 2.38, 0.6], null, [0.16, 0.12, 0.16]);
      s.add(P.cyl, '#2a2a2a', [0, 1.98, 0.6], null, [0.15, 0.04, 0.15]);
    },

    // ----- Planet Squanch -----
    // A round mud-and-thatch hut with a striped door curtain.
    // A Squanchian house: a giant cat tree. Carpeted posts, round platforms at different
    // heights, a cosy round den, ladders, and toys dangling on strings.
    squanchhut(s) {
      const carpet = '#d8b48a', post = '#b0703a';
      s.add(P.cyl, carpet, [0, 0.2, 0], null, [2.4, 0.4, 2.4]);
      for (const [x, z, h] of [[-1.2, -0.8, 3.6], [1.2, -0.6, 2.4], [0.2, 1.2, 4.6]]) {
        s.add(P.cyl, post, [x, h / 2, z], null, [0.28, h, 0.28]);
        for (let y = 0.6; y < h; y += 0.5) s.add(P.cyl, shade(post, 0.85), [x, y, z], null, [0.3, 0.06, 0.3]);   // sisal rope
        s.add(P.cyl, carpet, [x, h, z], null, [1.0, 0.18, 1.0]);
      }
      s.add(P.sphere, '#c8506a', [-1.2, 1.4, -0.8], null, [0.95, 0.85, 0.95]);   // the den
      s.add(P.cyl, '#3a1a2a', [-1.2, 1.3, -0.05], [Math.PI / 2, 0, 0], [0.45, 0.1, 0.45]);
      s.add(P.hemi, '#c8506a', [0.2, 4.7, 1.2], null, [0.8, 0.6, 0.8]);
      for (let i = 0; i < 5; i++) s.add(P.box, post, [0.9, 0.5 + i * 0.4, 0.4], [0, 0.6, 0], [0.6, 0.06, 0.1]);   // ladder rungs
      for (const [x, z, h, c] of [[1.9, -0.6, 2.4, '#ff6fd0'], [1.0, 1.2, 4.6, '#ffd84d'], [-2.0, -0.8, 3.6, '#5ff8ff']]) {
        s.add(P.cylLo, '#f4efe2', [x, h - 0.5, z], null, [0.015, 1.0, 0.015]);
        s.add(P.sphere, c, [x, h - 1.05, z], null, [0.18, 0.18, 0.18]);
      }
    },
    // A party light pole: a tall stick with a string of glowing bulbs.
    partylight(s) {
      s.add(P.cylLo, '#3a2a4a', [0, 3, 0], null, [0.08, 6, 0.08]);
      const c = ['#ff6fd0', '#ffd84d', '#5ff8ff', '#39ff6a', '#ff9b4d'];
      for (let i = 0; i < 10; i++) { const a = i * 0.9; s.add(P.sphereLo, c[i % 5], [Math.cos(a) * 0.35, 0.8 + i * 0.52, Math.sin(a) * 0.35], null, [0.14, 0.17, 0.14], true); }
      s.add(P.sphere, '#ff6fd0', [0, 6.1, 0], null, [0.3, 0.3, 0.3], true);
    },
    // A big party speaker stack.
    speaker(s) {
      for (const y of [0.65, 1.95]) {
        s.add(P.box, '#1e1e24', [0, y, 0], null, [1.4, 1.25, 1.0]);
        s.add(P.cyl, '#3a3a44', [0, y - 0.1, 0.51], [Math.PI / 2, 0, 0], [0.42, 0.02, 0.42]);
        s.add(P.cyl, '#121216', [0, y - 0.1, 0.53], [Math.PI / 2, 0, 0], [0.24, 0.02, 0.24]);
        s.add(P.cyl, '#3a3a44', [0, y + 0.42, 0.51], [Math.PI / 2, 0, 0], [0.13, 0.02, 0.13]);
      }
      s.add(P.box, '#ff6fd0', [0, 2.62, 0.4], null, [1.2, 0.06, 0.06], true);
    },

    // ----- Gazorpazorp -----
    // A layered red mesa with a flat top.
    redmesa(s) {
      const c = ['#a8442e', '#c0583a', '#b04a32', '#d06a48'];
      for (let i = 0; i < 4; i++) s.add(P.cylLo, c[i], [Math.sin(i * 2.3) * 0.2, 1.2 + i * 2.2, Math.cos(i * 1.7) * 0.2], [0, i * 0.4, 0], [4.6 - i * 0.55, 2.3, 4.2 - i * 0.5]);
      s.add(P.cylLo, '#e08a5a', [0, 9.0, 0], [0, 1.4, 0], [2.6, 0.3, 2.4]);
      for (let i = 0; i < 5; i++) { const a = i * 1.3; s.add(P.dodeca, '#8a3a2a', [Math.cos(a) * 4.7, 0.5, Math.sin(a) * 4.3], [a, a, 0], [0.9, 0.7, 0.9]); }
    },
    // Bleached bones and a big horned skull.
    bonepile(s) {
      const b = '#efe6cc';
      s.add(P.sphere, b, [0, 0.6, 0], null, [0.6, 0.5, 0.7]);
      for (const sx of [-1, 1]) { s.add(P.sphereLo, '#2a1a12', [sx * 0.22, 0.68, 0.55], null, [0.15, 0.17, 0.08]); s.add(P.cone, b, [sx * 0.6, 1.0, 0], [0, 0, sx * -0.9], [0.13, 0.7, 0.13]); }
      s.add(P.box, '#2a1a12', [0, 0.4, 0.62], null, [0.3, 0.06, 0.04]);
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; s.add(P.capsule, b, [Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.0], [Math.PI / 2, a, 0], [0.08, 0.35, 0.08]); }
    },
    // A spiky desert plant with a toothy bulb.
    spikeplant(s) {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; s.add(P.cone, '#6a8a3a', [Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3], [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45], [0.14, 1.5, 0.14]); }
      s.add(P.sphere, '#8a3a6a', [0, 1.7, 0], null, [0.35, 0.4, 0.35]);
      s.add(P.sphereLo, '#2a0a1a', [0, 1.75, 0.27], null, [0.18, 0.1, 0.1]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.cone, '#efe6cc', [Math.cos(a) * 0.34, 1.7 + Math.sin(a) * 0.38, 0], [0, 0, a - Math.PI / 2], [0.05, 0.22, 0.05]); }
    },

    // ----- Froopyland -----
    cottontree(s) {
      s.add(P.cylLo, '#f4d8a8', [0, 1.6, 0], [0, 0, 0.08], [0.18, 3.2, 0.18]);
      for (let y = 0.4; y < 3; y += 0.5) s.add(P.cyl, '#ff8fd0', [0, y, 0], [0.4, 0, 0.08], [0.19, 0.1, 0.19]);
      const lumps = [[0, 4.2, 0, 1.6], [0.9, 3.9, 0.3, 1.1], [-0.9, 4.0, -0.2, 1.1], [0.2, 5.0, 0.2, 1.1]];
      lumps.forEach(([x, y, z, r], i) => s.add(P.sphere, i % 2 ? '#ffc0ec' : '#c8b0ff', [x, y, z], null, [r, r * 0.85, r]));
    },
    lollipop(s) {
      s.add(P.cylLo, '#fbfaf6', [0, 1.6, 0], null, [0.08, 3.2, 0.08]);
      s.add(P.cyl, '#ff5a8a', [0, 3.5, 0], [Math.PI / 2, 0, 0], [0.75, 0.22, 0.75]);
      s.add(P.torus, '#fbfaf6', [0, 3.5, 0.08], null, [0.5, 0.5, 0.4]);
      s.add(P.torus, '#ffd84d', [0, 3.5, 0.08], null, [0.26, 0.26, 0.4]);
      s.add(P.cyl, '#fbfaf6', [0, 3.5, 0.0], [Math.PI / 2, 0, 0], [0.12, 0.24, 0.12]);
    },
    // A solid rainbow you can walk under.
    rainbow(s) {
      const bands = ['#e2483d', '#ff9b4d', '#ffe066', '#6ad86a', '#5aa8ff', '#9a6ae0'];
      bands.forEach((c, i) => {
        const arc = new T.TorusGeometry(8.6 - i * 0.55, 0.3, 6, 28, Math.PI);
        s.add(arc, c, [0, 0, 0], null, [1, 1.1, 1.1]);
        arc.dispose();
      });
      for (const x of [-6.9, 6.9]) for (let i = 0; i < 3; i++) s.add(P.sphere, '#ffffff', [x + (i - 1) * 0.9, 0.4 + (i % 2) * 0.3, (i - 1) * 0.4], null, [1.2, 0.8, 1.0]);
    },
    candyrock(s) {
      s.add(P.dodeca, '#ffb0e0', [0, 0.8, 0], [0.3, 0.5, 0], [1.3, 0.9, 1.1]);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; s.add(P.sphereLo, ['#5ff8ff', '#ffd84d', '#9ae86a', '#ff6f9a'][i % 4], [Math.cos(a) * 0.9, 1.1 + Math.sin(i) * 0.3, Math.sin(a) * 0.8], null, [0.16, 0.16, 0.16]); }
      s.add(P.octa, '#b48aff', [0.4, 1.5, 0.2], [0.2, 0.3, -0.2], [0.35, 0.6, 0.35], true);
    },

    // ----- Anatomy Park -----
    // A red blood cell: a disc with a dimple on each side.
    bloodcell(s) {
      s.add(P.torus, '#d83a3a', [0, 0.7, 0], [0.3, 0, 0.2], [1.2, 1.2, 1.9]);
      s.add(P.cyl, '#b82a2a', [0, 0.7, 0], [Math.PI / 2 + 0.3, 0, 0.2], [1.05, 0.25, 1.05]);
    },
    // A rib-like bone column with knobbly ends.
    bonepillar(s) {
      const b = '#f2e8d0';
      s.add(P.cyl, b, [0, 4.5, 0], null, [0.75, 9, 0.75]);
      for (const y of [0.3, 8.7]) for (const sx of [-1, 1]) s.add(P.sphere, b, [sx * 0.6, y, 0], null, [0.9, 0.8, 0.9]);
      s.add(P.sphere, '#e8d8b8', [0.2, 4.5, 0.6], null, [0.3, 1.8, 0.2]);
      s.add(P.capsule, '#c84a5a', [0.75, 6, 0], [0, 0, 0.3], [0.12, 1.2, 0.12]);
    },
    // A big pulsing artery arching overhead.
    artery(s) {
      const arc = new T.TorusGeometry(4.2, 0.9, 10, 22, Math.PI);
      s.add(arc, '#c83a4a', [0, 0, 0], null, [1, 1.4, 1]);
      arc.dispose();
      const vein = new T.TorusGeometry(4.2, 0.35, 6, 22, Math.PI);
      s.add(vein, '#5a6ad8', [0, 0, 0.7], null, [1, 1.4, 1]);
      vein.dispose();
      for (const x of [-4.2, 4.2]) s.add(P.sphere, '#a82a3a', [x, 0.4, 0], null, [1.4, 0.6, 1.4]);
    },
    // Pirates of the Pancreas: a pirate ship sailing through a pink pancreas, under a ride sign.
    lm_ride(s) {
      s.add(P.sphere, '#f0a0a0', [0, 1.8, -1], null, [7, 3.4, 4.5]);
      for (let i = 0; i < 7; i++) s.add(P.sphereLo, '#e88a8a', [-6 + i * 2, 3.6 + Math.sin(i) * 0.6, -1.5], null, [1.3, 1.1, 1.3]);
      s.add(P.box, '#4a8ac8', [0, 0.2, 2.6], null, [12, 0.4, 3]);
      // The ship.
      s.add(P.box, '#7a4a2a', [0, 1.1, 2.6], null, [5, 1.4, 2]);
      s.add(P.box, '#5a3420', [0, 1.85, 2.6], null, [5.3, 0.15, 2.2]);
      s.add(P.box, '#7a4a2a', [-2.2, 2.2, 2.6], null, [1.2, 0.8, 2]);
      s.add(P.cone, '#7a4a2a', [2.9, 1.2, 2.6], [0, 0, -Math.PI / 2], [0.9, 1.2, 0.9]);
      s.add(P.cylLo, '#4a2a1a', [0.4, 4, 2.6], null, [0.12, 4.2, 0.12]);
      s.add(P.box, '#fbfaf6', [0.4, 4.2, 2.6], [0, Math.PI / 2, 0], [1.8, 2.2, 0.06]);
      s.add(P.box, '#1a1a1a', [0.4, 6.0, 2.6], null, [0.8, 0.5, 0.04]);
      s.add(P.sphereLo, '#fbfaf6', [0.4, 6.05, 2.63], null, [0.12, 0.12, 0.02]);
      for (let i = 0; i < 3; i++) s.add(P.cyl, '#1a1a1a', [-1.4 + i * 1.2, 1.2, 3.62], [Math.PI / 2, 0, 0], [0.15, 0.1, 0.15]);
      // Sign frame.
      for (const x of [-4.8, 4.8]) s.add(P.box, '#ffe066', [x, 3.8, 3.1], null, [0.3, 7.6, 0.3]);
    },

    // ----- Pizza-Phone-Chair dimension: furniture-scale everything -----
    giantchair(s) {
      const wood = '#b07a4a';
      s.add(P.box, wood, [0, 2.6, 0], null, [3.6, 0.4, 3.4]);
      s.add(P.box, '#c84a3a', [0, 2.9, 0], null, [3.3, 0.25, 3.1]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, wood, [sx * 1.6, 1.2, sz * 1.5], null, [0.3, 2.4, 0.3]);
      for (const sx of [-1, 1]) s.add(P.box, wood, [sx * 1.6, 4.4, -1.5], null, [0.3, 3.2, 0.3]);
      for (const y of [4.0, 5.4]) s.add(P.box, wood, [0, y, -1.5], null, [3.3, 0.35, 0.2]);
    },
    // A beige desk phone, big as a car, with a curly cord.
    giantphone(s) {
      s.add(P.box, '#e8dcc0', [0, 1.0, 0], [-0.15, 0, 0], [2.4, 2.0, 2.6]);
      s.add(P.box, '#d8ccb0', [0, 0.15, 0], null, [2.6, 0.3, 2.8]);
      for (let i = 0; i < 12; i++) s.add(P.box, '#fbfaf6', [-0.6 + (i % 3) * 0.6, 1.62 - Math.floor(i / 3) * 0.36, 1.34 - 0.149 * (0.62 - Math.floor(i / 3) * 0.36)], [-0.15, 0, 0], [0.42, 0.26, 0.1]);
      s.add(P.capsule, '#e8dcc0', [0, 2.6, -0.4], [0, 0, Math.PI / 2], [0.35, 1.2, 0.35]);
      for (const sx of [-1, 1]) s.add(P.sphere, '#e8dcc0', [sx * 1.5, 2.45, -0.4], null, [0.55, 0.4, 0.55]);
      for (let i = 0; i < 8; i++) s.add(P.torus, '#d8ccb0', [1.6 + i * 0.22, 0.6, -1.0], [0, Math.PI / 2, 0], [0.25, 0.25, 0.5]);
    },
    // An open pizza box with a pizza in it.
    pizzabox(s) {
      s.add(P.box, '#e8d6a8', [0, 0.15, 0], null, [3.2, 0.3, 3.2]);
      s.add(P.box, '#e8d6a8', [0, 1.75, -1.6], [-0.15, 0, 0], [3.2, 3.2, 0.12]);
      s.add(P.box, '#e2483d', [0, 2.0, -1.5], [-0.15, 0, 0], [1.8, 0.5, 0.02]);
      s.add(P.cyl, '#e8a848', [0, 0.36, 0], null, [1.45, 0.14, 1.45]);
      s.add(P.cyl, '#f4c860', [0, 0.42, 0], null, [1.3, 0.06, 1.3]);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; s.add(P.cyl, '#c83a2a', [Math.cos(a) * 0.8, 0.46, Math.sin(a) * 0.8], null, [0.22, 0.03, 0.22]); }
      s.add(P.cyl, '#c83a2a', [0, 0.46, 0], null, [0.22, 0.03, 0.22]);
    },
    couch(s) {
      const c = '#5a7ab0';
      s.add(P.box, c, [0, 0.7, 0], null, [4.2, 0.7, 1.8]);
      s.add(P.box, c, [0, 1.5, -0.7], null, [4.2, 1.3, 0.4]);
      for (const sx of [-1, 1]) s.add(P.box, shade(c, 0.9), [sx * 2.0, 1.15, 0], null, [0.45, 1.0, 1.8]);
      for (const sx of [-1, 1]) s.add(P.box, shade(c, 1.12), [sx * 0.9, 1.15, 0.1], null, [1.7, 0.25, 1.4]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.cylLo, '#3a2a1a', [sx * 1.9, 0.18, sz * 0.7], null, [0.1, 0.36, 0.1]);
    },

    // ----- Post-apocalyptic Earth -----
    // A burned-out car with spikes welded on.
    wreck(s) {
      s.add(P.box, '#8a5a3a', [0, 0.65, 0], [0, 0, 0.05], [1.9, 0.6, 4.2]);
      s.add(P.box, '#6a4a32', [0, 1.2, -0.3], [0, 0, 0.05], [1.7, 0.55, 2.0]);
      s.add(P.box, '#1a1a1a', [0, 1.22, 0.75], [0.5, 0, 0.05], [1.5, 0.45, 0.05]);
      for (const x of [-0.85, 0.85]) for (const z of [-1.35, 1.35]) s.add(P.cyl, '#26262a', [x, 0.35, z], [0, 0, Math.PI / 2], [0.38, 0.3, 0.38]);
      for (let i = 0; i < 5; i++) s.add(P.cone, '#9aa0a6', [-0.8 + i * 0.4, 1.0, 2.2], [Math.PI / 2, 0, 0], [0.07, 0.5, 0.07]);
      s.add(P.box, '#9aa0a6', [0, 0.65, 2.15], null, [2.0, 0.25, 0.1]);
      s.add(P.box, '#59606e', [0.3, 1.6, -0.6], null, [0.5, 0.3, 0.9]);
    },
    // A lookout tower made of junk and sheet metal.
    scraptower(s) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, '#6a5a4a', [sx * 1.1, 3.5, sz * 1.1], [sz * 0.06, 0, sx * -0.06], [0.25, 7, 0.25]);
      for (const y of [2, 4.5]) { s.add(P.box, '#7a6a5a', [0, y, 1.1], [0, 0, 0.6], [0.12, 3.2, 0.12]); s.add(P.box, '#7a6a5a', [1.1, y, 0], [0.6, 0, 0], [0.12, 3.2, 0.12]); }
      s.add(P.box, '#8a7a6a', [0, 7, 0], null, [3.2, 0.25, 3.2]);
      s.add(P.box, '#9a5a3a', [0, 7.7, 1.55], null, [3.2, 1.2, 0.1]);
      s.add(P.box, '#7a8a9a', [-1.55, 7.7, 0], null, [0.1, 1.2, 3.2]);
      s.add(P.box, '#6a6a6a', [0.3, 8.8, 0], [0, 0, 0.12], [3.6, 0.15, 3.6]);
      s.add(P.cylLo, '#3a3a3a', [1.3, 9.6, 1.3], null, [0.04, 1.6, 0.04]);
      s.add(P.box, '#e2483d', [1.65, 10.1, 1.3], null, [0.7, 0.45, 0.03]);
    },
    cactus(s) {
      const g = '#5a9a4a';
      C.capsuleAt(s, g, 0.4, 3.4, [0, 0, 0]);
      C.capsuleAt(s, g, 0.25, 1.1, [0.45, 1.3, 0], [0, 0, -Math.PI / 2]);
      C.capsuleAt(s, g, 0.25, 1.2, [0.95, 1.3, 0]);
      C.capsuleAt(s, g, 0.22, 0.9, [-0.4, 1.9, 0], [0, 0, Math.PI / 2]);
      C.capsuleAt(s, g, 0.22, 0.9, [-0.85, 1.9, 0]);
      s.add(P.sphereLo, '#ff6f9a', [0, 3.42, 0], null, [0.18, 0.12, 0.18]);
    },

    // ----- The Microverse -----
    // A sleek white tower with glowing bands, like a hopeful little civilisation.
    microtower(s) {
      s.add(P.cyl, '#f4f6fa', [0, 6, 0], null, [1.4, 12, 1.4]);
      s.add(P.cyl, '#d8dee8', [0, 0.5, 0], null, [2.0, 1.0, 2.0]);
      for (let y = 2; y < 12; y += 2) s.add(P.cyl, '#5ff8ff', [0, y, 0], null, [1.43, 0.25, 1.43], true);
      s.add(P.sphere, '#f4f6fa', [0, 12.6, 0], null, [2.4, 0.8, 2.4]);
      s.add(P.cylLo, '#c9cfd6', [0, 13.8, 0], null, [0.06, 2, 0.06]);
      s.add(P.sphereLo, '#ffd84d', [0, 14.8, 0], null, [0.2, 0.2, 0.2], true);
    },
    microdome(s) {
      s.add(P.cyl, '#d8dee8', [0, 0.3, 0], null, [3, 0.6, 3]);
      s.add(P.hemi, '#a8e0ff', [0, 0.6, 0], null, [2.7, 2.6, 2.7], true);
      s.add(P.box, '#f4f6fa', [0, 1.0, 2.8], null, [1.2, 1.6, 0.6]);
      s.add(P.box, '#3a5a8a', [0, 0.9, 3.12], null, [0.7, 1.2, 0.04]);
    },
    // The gooble box power plant: a factory hall, stacks, and a row of stompable gooble boxes.
    lm_gooble(s) {
      s.add(P.box, '#d8dee8', [0, 3.5, 0], null, [14, 7, 10]);
      s.add(P.box, '#3a5a8a', [0, 7.15, 0], null, [14.4, 0.3, 10.4]);
      for (let x = -5; x <= 5; x += 2.5) s.add(P.box, '#a8e0ff', [x, 4.5, 5.02], null, [1.6, 1.4, 0.06], true);
      for (const x of [-4, 4]) { s.add(P.cyl, '#9aa3ab', [x, 10, -2.5], null, [0.9, 6, 0.9]); s.add(P.cyl, '#e2483d', [x, 12.8, -2.5], null, [0.95, 0.4, 0.95]); }
      s.add(P.box, '#3a5a8a', [0, 1.6, 5.05], null, [3, 3.2, 0.1]);
      // Gooble boxes waiting by the door.
      for (let i = 0; i < 4; i++) {
        const x = -4.5 + i * 3;
        s.add(P.box, '#b48aff', [x, 0.45, 7.2], null, [0.9, 0.9, 0.9]);
        s.add(P.box, '#ffd84d', [x, 0.92, 7.2], null, [0.5, 0.06, 0.5], true);
      }
    },

    // ----- Unity's planet -----
    // A tidy apartment tower: Unity keeps everything the same.
    cityblock(s) {
      s.add(P.box, '#e8e4dc', [0, 8, 0], null, [7, 16, 7]);
      for (let y = 1.8; y < 15.5; y += 1.8) for (const x of [-2.2, 0, 2.2]) {
        s.add(P.box, '#7ab8e0', [x, y, 3.52], null, [1.2, 1.1, 0.05]);
        s.add(P.box, '#7ab8e0', [3.52, y, x], null, [0.05, 1.1, 1.2]);
      }
      s.add(P.box, '#5fd6b0', [0, 16.2, 0], null, [7.4, 0.4, 7.4]);
      s.add(P.box, '#5fd6b0', [0, 1.4, 3.6], null, [2.4, 2.8, 0.1]);
    },
    // A statue of Unity's hosts, all holding hands.
    unitystatue(s) {
      s.add(P.cyl, '#c9cfd6', [0, 0.6, 0], null, [3.2, 1.2, 3.2]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        // Three hosts facing out, all reaching up to one point in the middle: one mind.
        fig(s, { x: Math.sin(a) * 1.15, y: 1.2, z: Math.cos(a) * 1.15, ry: a, k: 3.0, color: '#e8e8f0', reach: [0, 2.2, -0.36] });
      }
      s.add(P.sphere, '#5fd6b0', [0, 1.2 + 2.3 * 3.0, 0], null, [0.45, 0.45, 0.45], true);
      s.add(P.torus, '#5fd6b0', [0, 8.6, 0], [Math.PI / 2, 0, 0], [1.6, 1.6, 0.6], true);
    },

    // ----- Galactic Federation -----
    // A white tower with the Federation's red bands and a disc on top.
    fedtower(s) {
      s.add(P.box, '#f4f6fa', [0, 10, 0], null, [5, 20, 5]);
      for (const sx of [-1, 1]) s.add(P.box, '#d8dee8', [sx * 2.7, 9, 0], null, [0.5, 18, 3]);
      for (let y = 3; y < 19; y += 4) s.add(P.box, '#e2483d', [0, y, 2.52], null, [5, 0.4, 0.04]);
      for (let y = 1.5; y < 19; y += 1.4) s.add(P.box, '#3a4a6a', [0, y, 2.53], null, [3.6, 0.6, 0.03]);
      s.add(P.cyl, '#f4f6fa', [0, 20.6, 0], null, [4.5, 0.6, 4.5]);
      s.add(P.cyl, '#5ff8ff', [0, 20.3, 0], null, [4.55, 0.15, 4.55], true);
      s.add(P.cylLo, '#c9cfd6', [0, 22.5, 0], null, [0.1, 3.2, 0.1]);
      s.add(P.sphereLo, '#e2483d', [0, 24.1, 0], null, [0.25, 0.25, 0.25], true);
    },
    // A parked Federation ship: white wedge, dark canopy, red stripes.
    fedship(s) {
      s.add(P.box, '#f4f6fa', [0, 1.1, 0], null, [3.2, 0.8, 5.4]);
      s.add(P.cone, '#f4f6fa', [0, 1.1, 3.3], [Math.PI / 2, 0, 0], [1.6, 1.4, 0.45]);
      s.add(P.box, '#2a3448', [0, 1.65, 1.4], [0.25, 0, 0], [1.6, 0.5, 1.8]);
      for (const sx of [-1, 1]) {
        s.add(P.box, '#f4f6fa', [sx * 2.6, 1.0, -0.8], [0, 0, sx * -0.12], [2.2, 0.18, 2.6]);
        s.add(P.box, '#e2483d', [sx * 2.6, 1.12, -0.8], [0, 0, sx * -0.12], [2.2, 0.04, 0.4]);
        s.add(P.cyl, '#59606e', [sx * 1.0, 1.1, -2.85], [Math.PI / 2, 0, 0], [0.4, 0.4, 0.4]);
        s.add(P.cyl, '#5ff8ff', [sx * 1.0, 1.1, -3.06], [Math.PI / 2, 0, 0], [0.3, 0.05, 0.3], true);
        s.add(P.box, '#59606e', [sx * 1.2, 0.35, 0], null, [0.2, 0.7, 0.2]);
      }
      s.add(P.box, '#e2483d', [0, 1.52, -0.8], null, [0.3, 0.02, 3.2]);
    },
    // A prison block: grey walls, barred windows and searchlights.
    prisonblock(s) {
      s.add(P.box, '#9aa3ab', [0, 3, 0], null, [10, 6, 6]);
      s.add(P.box, '#7d8790', [0, 6.15, 0], null, [10.4, 0.3, 6.4]);
      for (let x = -4; x <= 4; x += 2) for (const y of [2, 4.3]) {
        s.add(P.box, '#2a2f38', [x, y, 3.02], null, [1.0, 1.0, 0.04]);
        for (let i = -1; i <= 1; i++) s.add(P.box, '#c9cfd6', [x + i * 0.25, y, 3.06], null, [0.06, 1.0, 0.04]);
      }
      for (const sx of [-1, 1]) { s.add(P.cylLo, '#59606e', [sx * 4.6, 7, 2.6], null, [0.1, 1.6, 0.1]); s.add(P.cone, '#ffe8a0', [sx * 4.6, 7.8, 2.9], [-1.1, 0, 0], [0.3, 0.6, 0.3], true); }
      s.add(P.box, '#e2483d', [0, 5.4, 3.03], null, [3, 0.5, 0.04]);
    },

    // ----- Planet Gear -----
    // A huge standing gear: rim, teeth, spokes and hub.
    biggear(s) {
      const c = '#b08a3a';
      s.add(P.torus, c, [0, 3.2, 0], null, [2.4, 2.4, 2.0]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s.add(P.box, c, [Math.cos(a) * 2.95, 3.2 + Math.sin(a) * 2.95, 0], [0, 0, a], [0.6, 0.55, 0.4]); }
      for (let i = 0; i < 3; i++) s.add(P.box, shade(c, 0.85), [0, 3.2, 0], [0, 0, i * Math.PI / 3], [4.4, 0.35, 0.3]);
      s.add(P.cyl, '#8a6a2a', [0, 3.2, 0], [Math.PI / 2, 0, 0], [0.6, 0.6, 0.6]);
      s.add(P.box, '#5a4a3a', [0, 0.25, 0], null, [1.4, 0.5, 1.0]);
    },
    // Copper pipes with a valve wheel and a puff of steam.
    pipe(s) {
      s.add(P.cyl, '#b0703a', [0, 2.5, 0], null, [0.45, 5, 0.45]);
      s.add(P.cyl, '#b0703a', [0.9, 4.6, 0], [0, 0, Math.PI / 2], [0.4, 1.8, 0.4]);
      for (const y of [0.4, 2.5, 4.6]) s.add(P.cyl, '#8a5a2a', [0, y, 0], null, [0.55, 0.2, 0.55]);
      s.add(P.torus, '#e2483d', [0, 2.0, 0.55], null, [0.35, 0.35, 0.5]);
      s.add(P.sphereLo, '#f4f6fa', [1.8, 5.0, 0], null, [0.5, 0.4, 0.5]);
    },
    // A riveted brass house with a gear on the roof.
    gearhouse(s) {
      s.add(P.cyl, '#a07a3a', [0, 2, 0], null, [3, 4, 3]);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s.add(P.sphereLo, '#7a5a2a', [Math.cos(a) * 3.02, 3.6, Math.sin(a) * 3.02], null, [0.08, 0.08, 0.08]); }
      s.add(P.cone, '#6a5a4a', [0, 4.7, 0], null, [3.3, 1.4, 3.3]);
      s.add(P.torus, '#d8b04a', [0, 5.6, 0], [0, 0, 0], [0.9, 0.9, 1.4]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.box, '#d8b04a', [Math.cos(a) * 1.15, 5.6 + Math.sin(a) * 1.15, 0], [0, 0, a], [0.3, 0.3, 0.3]); }
      s.add(P.box, '#5a3a20', [0, 1.2, 2.95], null, [1.2, 2.2, 0.1]);
      s.add(P.cyl, '#ffd890', [1.8, 2.4, 2.4], [Math.PI / 2, 0, -0.6], [0.45, 0.1, 0.45], true);
      s.add(P.torus, '#7a5a2a', [1.8, 2.4, 2.42], [0, -0.6, 0], [0.45, 0.45, 0.5]);
    },
    // ----- Beyond the Curve -----
    goldorb(s) {
      s.add(P.cyl, '#2a2440', [0, 0.4, 0], null, [0.9, 0.8, 0.9]);
      s.add(P.cyl, '#3a3258', [0, 1.4, 0], null, [0.35, 1.4, 0.35]);
      s.add(P.torus, '#ffd84d', [0, 2.3, 0], [Math.PI / 2, 0, 0], [0.6, 0.6, 0.4], true);
      s.add(P.sphere, '#ffe9a0', [0, 3.0, 0], null, [0.55, 0.55, 0.55], true);
      s.add(P.torus, '#ffb84d', [0, 3.0, 0], [1.1, 0.4, 0], [0.85, 0.85, 0.25], true);
    },
    voidcrystal(s) {
      s.add(P.octa, '#c9a8ff', [0, 2.0, 0], [0, 0.4, 0.1], [0.45, 1.1, 0.45], true);
      s.add(P.octa, '#ffd84d', [0.5, 1.4, 0.2], [0.3, 0, 0.4], [0.25, 0.6, 0.25], true);
      s.add(P.octa, '#8a6ae0', [-0.45, 1.2, -0.2], [-0.3, 0, -0.3], [0.22, 0.5, 0.22], true);
      s.add(P.dodeca, '#241e3c', [0, 0.2, 0], null, [0.7, 0.3, 0.7]);
    },
    curvepillar(s) {
      s.add(P.cyl, '#2a2440', [0, 0.5, 0], null, [1.3, 1.0, 1.3]);
      s.add(P.cyl, '#c8a040', [0, 6, 0], null, [0.55, 10, 0.55]);
      for (let y = 2; y < 11; y += 2) s.add(P.torus, '#ffd84d', [0, y, 0], [Math.PI / 2, 0, 0], [0.62, 0.62, 0.35], true);
      s.add(P.sphere, '#fff2c0', [0, 11.6, 0], null, [0.9, 0.9, 0.9], true);
    },
    // The edge of the Central Finite Curve: a golden gate, and through it a golden portal.
    lm_curveedge(s) {
      const gate = new T.TorusGeometry(5.5, 0.6, 16, 56);
      s.add(gate, '#c8a040', [0, 6.2, 0], null, null);
      gate.dispose();
      s.add(P.cyl, '#ffd84d', [0, 6.2, 0], [Math.PI / 2, 0, 0], [4.9, 0.1, 4.9], true);
      s.add(P.cyl, '#fff2c0', [0, 6.2, 0.06], [Math.PI / 2, 0, 0], [3.0, 0.1, 3.0], true);
      for (const sx of [-1, 1]) s.add(P.box, '#2a2440', [sx * 4.5, 0.6, 0], null, [2.4, 1.2, 2.4]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s.add(P.sphere, '#ffe9a0', [Math.cos(a) * 5.5, 6.2 + Math.sin(a) * 5.5, 0.7], null, [0.32, 0.32, 0.32], true); }
    },

    // ----- Interdimensional Cable -----
    // A strip-mall store: a coloured front (tinted per instance), big window, awning, door, sign board.
    storefront(s) {
      const W = 9, D = 7, H = 5.5;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.2, 0.4, D + 0.2]);
      s.add(P.box, '#f4efe0', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#d8d2c4', [0, 0.4 + H + 0.2, 0], null, [W + 0.4, 0.4, D + 0.4]);
      s.add(P.box, '#bfdcec', [-1.4, 2.0, D / 2 + 0.03], null, [5.0, 2.6, 0.06]);
      s.add(P.box, '#fbfaf6', [-1.4, 2.0, D / 2 + 0.07], null, [0.1, 2.6, 0.04]);
      s.add(P.box, '#59606e', [3.0, 1.6, D / 2 + 0.04], null, [1.4, 2.4, 0.06]);
      s.add(P.box, '#bfdcec', [3.0, 1.9, D / 2 + 0.08], null, [1.0, 1.4, 0.03]);
      for (let i = 0; i < 7; i++) s.add(P.box, i % 2 ? '#fbfaf6' : '#e2483d', [-W / 2 + 0.64 + i * 1.29, 3.7, D / 2 + 0.6], [0.45, 0, 0], [1.29, 0.08, 1.4]);   // striped awning
      s.add(P.box, '#ffe066', [0, 5.0, D / 2 + 0.06], null, [W - 1.2, 0.9, 0.08], true);
    },
    // A giant TV on a pole, showing an ad.
    tvscreen(s) {
      for (const sx of [-1, 1]) s.add(P.box, '#59606e', [sx * 0.6, 2.4, 0], null, [0.25, 4.8, 0.25]);
      s.add(P.box, '#3a2a1a', [0, 5.6, 0], null, [3.6, 2.6, 1.0]);
      s.add(P.box, '#c8a878', [0, 5.6, 0.35], null, [3.7, 2.7, 0.4]);
      s.add(P.box, '#59d8ff', [-0.3, 5.6, 0.56], null, [2.7, 2.0, 0.05], true);
      s.add(P.box, '#ff6fd0', [-0.3, 5.3, 0.6], null, [1.8, 0.4, 0.02], true);
      for (let i = 0; i < 2; i++) s.add(P.cyl, '#2a2a2a', [1.45, 5.9 - i * 0.5, 0.58], [Math.PI / 2, 0, 0], [0.12, 0.05, 0.12]);
      for (const sx of [-1, 1]) s.add(P.cylLo, '#2a2a2a', [sx * 0.6, 7.3, 0], [0, 0, sx * 0.4], [0.03, 0.9, 0.03]);   // rabbit ears
    },
    // A real fake door: a door in a frame, standing on its own, leading nowhere.
    doorframe(s) {
      s.add(P.box, '#fbf6ea', [0, 1.3, 0], null, [1.3, 2.6, 0.18]);
      s.add(P.box, '#7a3326', [0, 1.25, 0.07], null, [1.0, 2.3, 0.1]);
      s.add(P.sphereLo, '#e8c050', [0.36, 1.2, 0.12], null, [0.05, 0.05, 0.05]);
      s.add(P.box, '#d8d2c4', [0, 0.05, 0], null, [1.6, 0.1, 0.8]);
      s.add(P.box, '#ffe066', [0.9, 0.4, 0.2], null, [0.35, 0.2, 0.02]);   // price tag
    },
    // ----- Downtown -----
    // Merpal's Mall: a long two-storey box with a glass atrium entrance, a sign band and
    // planters out front. Front faces +z.
    lm_mall(s) {
      const W = 22, D = 14, H = 7.2;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#e8dcc4', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#c8b898', [0, 0.4 + H + 0.25, 0], null, [W + 0.5, 0.5, D + 0.5]);
      for (let y = 1.4; y < H; y += 1.6) s.add(P.box, shade('#e8dcc4', 0.9), [0, y, D / 2 + 0.01], null, [W, 0.05, 0.02]);
      // Atrium: a glass box sticking out the front, taller than the building.
      s.add(P.box, '#9fd0e8', [0, 4.6, D / 2 + 1.6], null, [7, 8.4, 3.2]);
      for (const x of [-3.5, -1.75, 0, 1.75, 3.5]) s.add(P.box, '#f4f2ea', [x, 4.6, D / 2 + 3.22], null, [0.14, 8.4, 0.08]);
      for (const y of [1.0, 3.2, 5.6, 8.0]) s.add(P.box, '#f4f2ea', [0, y, D / 2 + 3.22], null, [7, 0.14, 0.08]);
      s.add(P.box, '#f4f2ea', [0, 8.85, D / 2 + 1.6], null, [7.4, 0.3, 3.6]);
      s.add(P.box, '#3a4048', [0, 1.3, D / 2 + 3.24], null, [2.6, 2.2, 0.05]);
      // Store windows either side, each with a coloured awning.
      const cols = ['#e2483d', '#3c6fb5', '#4a9a6a', '#ffb43a'];
      for (let i = 0; i < 4; i++) {
        const x = (i < 2 ? -1 : 1) * (5.6 + (i % 2) * 4.2);
        s.add(P.box, '#bfdcec', [x, 1.8, D / 2 + 0.04], null, [3.2, 2.4, 0.06]);
        s.add(P.box, cols[i], [x, 3.3, D / 2 + 0.5], [0.4, 0, 0], [3.4, 0.08, 1.0]);
      }
      for (const x of [-9.5, -4.5, 4.5, 9.5]) {
        s.add(P.box, '#8a7a62', [x, 0.5, D / 2 + 4.2], null, [1.6, 0.6, 1.6]);
        s.add(P.sphere, '#5fae3e', [x, 1.3, D / 2 + 4.2], null, [0.8, 0.7, 0.8]);
      }
    },
    // Shoney's: a low diner with a red roof band, a big front window and a breakfast-bar glow.
    lm_shoneys(s) {
      const W = 11, D = 8, H = 4.2;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#c79a6a', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      for (let y = 0.7; y < H; y += 0.35) s.add(P.box, shade('#c79a6a', 0.85), [0, y, D / 2 + 0.01], null, [W, 0.04, 0.02]);
      s.add(P.box, '#c8302a', [0, 0.4 + H + 0.35, 0], null, [W + 0.8, 0.7, D + 0.8]);
      s.add(P.prism, '#8a2a20', [0, 0.4 + H + 0.7, 0], null, [W + 0.6, 1.2, D + 0.6]);
      s.add(P.box, '#ffe4a0', [-1.4, 2.0, D / 2 + 0.04], null, [6.0, 2.0, 0.06], true);
      for (const x of [-4.4, -2.4, -0.4, 1.6]) s.add(P.box, '#3a2a1a', [x, 2.0, D / 2 + 0.08], null, [0.1, 2.0, 0.04]);
      s.add(P.box, '#5a3a20', [3.6, 1.5, D / 2 + 0.05], null, [1.4, 2.2, 0.06]);
      s.add(P.box, '#ffffff', [0, 5.0, D / 2 + 0.06], null, [6.4, 1.1, 0.1]);
      // A pole sign by the road.
      s.add(P.cylLo, '#8a8a8a', [W / 2 + 1.2, 3.5, D / 2 + 1.5], null, [0.12, 7, 0.12]);
      s.add(P.sphere, '#c8302a', [W / 2 + 1.2, 7.2, D / 2 + 1.5], null, [1.3, 0.9, 0.3]);
      s.add(P.sphere, '#ffe066', [W / 2 + 1.2, 7.2, D / 2 + 1.58], null, [1.0, 0.6, 0.26], true);
    },
    // Needful Things: a dark, narrow antique shop with a bay window full of odd objects.
    lm_needful(s) {
      const W = 8, D = 8, H = 5.6;
      s.add(P.box, '#3a2a20', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#4a2f2a', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#2a1a14', [0, 0.4 + H + 0.2, 0], null, [W + 0.5, 0.4, D + 0.5]);
      s.add(P.box, '#2a1a14', [0, 4.1, D / 2 + 0.05], null, [W, 1.0, 0.1]);
      // Bay window with a lamp, a clock and a skull on the shelf.
      s.add(P.box, '#3a2a20', [-1.5, 0.9, D / 2 + 0.5], null, [3.6, 1.0, 1.0]);
      s.add(P.box, '#ffcf7a', [-1.5, 2.3, D / 2 + 0.95], null, [3.4, 1.8, 0.05], true);
      s.add(P.box, '#3a2a20', [-1.5, 2.3, D / 2 + 1.0], null, [0.08, 1.8, 0.04]);
      s.add(P.sphere, '#e8e2d0', [-2.3, 1.7, D / 2 + 0.7], null, [0.25, 0.25, 0.25]);
      s.add(P.cyl, '#c8a040', [-0.8, 1.8, D / 2 + 0.7], [Math.PI / 2, 0, 0], [0.3, 0.1, 0.3]);
      s.add(P.box, '#2a1a14', [2.4, 1.4, D / 2 + 0.05], null, [1.3, 2.2, 0.08]);
      s.add(P.sphere, '#c8a040', [2.85, 1.4, D / 2 + 0.12], null, [0.08, 0.08, 0.06]);
      // A small devilish weathervane.
      s.add(P.cylLo, '#2a2a2a', [0, 7.0, 0], null, [0.05, 1.4, 0.05]);
      s.add(P.cone, '#c8302a', [0.3, 7.5, 0], [0, 0, -Math.PI / 2], [0.16, 0.6, 0.06]);
    },
    // Dr. Wong's office: a calm, glassy mid-rise office building.
    lm_wong(s) {
      const W = 11, D = 9, H = 11;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#d6d0c4', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      for (let y = 1.6; y < H; y += 2.4) {
        s.add(P.box, '#8fb8d0', [0, y + 0.9, D / 2 + 0.03], null, [W - 1, 1.5, 0.06]);
        s.add(P.box, '#8fb8d0', [W / 2 + 0.03, y + 0.9, 0], null, [0.06, 1.5, D - 1]);
      }
      s.add(P.box, '#bfb8aa', [0, 0.4 + H + 0.2, 0], null, [W + 0.4, 0.4, D + 0.4]);
      s.add(P.box, '#3a4048', [0, 1.4, D / 2 + 0.05], null, [2.4, 2.4, 0.06]);
      s.add(P.box, '#4a9a8a', [0, 3.0, D / 2 + 0.9], [-0.1, 0, 0], [4, 0.14, 1.8]);
      for (const x of [-3.5, 3.5]) { s.add(P.box, '#8a7a62', [x, 0.45, D / 2 + 1.2], null, [1.2, 0.5, 1.2]); s.add(P.cone, '#4a8a3c', [x, 1.6, D / 2 + 1.2], null, [0.5, 1.8, 0.5]); }
    },
    // An electronics store: window wall full of TVs. They show normal Earth TV, until a Rick
    // gets to them.
    lm_tvstore(s) {
      const W = 10, D = 8, H = 4.8;
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, '#3c4a5a', [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#2a3440', [0, 0.4 + H + 0.2, 0], null, [W + 0.4, 0.4, D + 0.4]);
      s.add(P.box, '#2a3440', [-1, 2.0, D / 2 + 0.03], null, [7.6, 3.0, 0.05]);
      const tv = ['#6f8fa8', '#8aa0b0', '#7a98a0', '#90a8b8'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const x = -4 + i * 2, y = 1.3 + j * 1.3;
        s.add(P.box, '#1a1a1e', [x, y, D / 2 + 0.2], null, [1.6, 1.05, 0.3]);
        s.add(P.box, tv[(i + j) % 4], [x, y, D / 2 + 0.36], null, [1.35, 0.8, 0.03], true);
      }
      s.add(P.box, '#59606e', [3.9, 1.5, D / 2 + 0.04], null, [1.3, 2.4, 0.06]);
    },
    // ----- Washington, D.C. -----
    // The White House, south front: a long white facade with the curved columned portico.
    lm_whitehouse(s) {
      const W = 24, D = 11, H = 7.0, white = '#f6f4ee', trim = '#e4e0d4';
      s.add(P.box, '#c8c2b4', [0, 0.3, 0], null, [W + 0.6, 0.6, D + 0.6]);
      s.add(P.box, white, [0, 0.6 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, trim, [0, 0.6 + H + 0.25, 0], null, [W + 0.5, 0.5, D + 0.5]);
      s.add(P.box, '#c8c8c4', [0, 0.6 + H + 0.9, 0], null, [W - 1, 0.8, D - 1]);   // low roof
      for (let x = -11; x <= 11; x += 1) s.add(P.box, white, [x, 0.6 + H + 0.75, D / 2 + 0.15], null, [0.18, 0.5, 0.18]);  // balustrade
      for (let i = -5; i <= 5; i++) {
        if (Math.abs(i) <= 1) continue;
        const x = i * 2;
        win(s, x, 2.3, D / 2, 1.0, 1.6);
        win(s, x, 5.4, D / 2, 1.0, 1.4);
        s.add(P.prism, trim, [x, 3.45, D / 2 + 0.12], null, [1.4, 0.4, 0.2]);
      }
      // The curved south portico: six columns on a half-round porch with a balcony on top.
      s.add(P.cyl, trim, [0, 0.9, D / 2], null, [4.2, 0.6, 4.2]);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i + 0.5) / 6 * Math.PI;
        s.add(P.cyl, white, [Math.sin(a) * 3.8, 4.0, D / 2 + Math.cos(a) * 3.8 * 0.9], null, [0.32, 6.0, 0.32]);
      }
      s.add(P.cyl, white, [0, 7.25, D / 2], null, [4.4, 0.6, 4.4]);
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i + 0.5) / 12 * Math.PI; s.add(P.box, white, [Math.sin(a) * 4.2, 7.9, D / 2 + Math.cos(a) * 4.2], null, [0.16, 0.6, 0.16]); }
      s.add(P.box, '#4a6a8a', [0, 2.4, D / 2 + 0.06], null, [1.8, 3.2, 0.06]);
      // The flag on the roof.
      s.add(P.cylLo, '#d8d8d8', [0, 0.6 + H + 2.8, 0], null, [0.06, 4, 0.06]);
      s.add(P.box, '#f4f4f4', [0.8, 0.6 + H + 4.3, 0], null, [1.6, 1.0, 0.04]);
      for (let i = 0; i < 4; i++) s.add(P.box, '#c8302a', [0.8, 0.6 + H + 3.88 + i * 0.26, 0.03], null, [1.6, 0.12, 0.02]);
      s.add(P.box, '#2a4a8a', [0.35, 0.6 + H + 4.55, 0.04], null, [0.7, 0.5, 0.02]);
      // The fountain on the south lawn.
      s.add(P.cyl, '#d8d2c4', [0, 0.25, D / 2 + 12], null, [2.6, 0.5, 2.6]);
      s.add(P.cyl, '#7fc4ff', [0, 0.45, D / 2 + 12], null, [2.3, 0.1, 2.3], true);
      s.add(P.cyl, '#d8d2c4', [0, 1.0, D / 2 + 12], null, [0.3, 1.4, 0.3]);
    },
    // The Washington Monument: a tall white obelisk on a little hill, ringed with flags.
    lm_obelisk(s) {
      s.add(P.cyl, '#c8c2b4', [0, 0.25, 0], null, [3.2, 0.5, 3.2]);
      s.add(P.box, '#f2eee4', [0, 13.5, 0], null, [2.2, 26, 2.2]);
      s.add(P.box, '#e4dccc', [0, 12, 0], null, [2.24, 0.06, 2.24]);
      s.add(P.cone, '#f2eee4', [0, 27.6, 0], [0, Math.PI / 4, 0], [1.56, 2.2, 1.56]);
      for (let i = 0; i < 2; i++) s.add(P.box, '#3a3a3a', [0, 24.5, 1.11 - i * 2.22], null, [0.3, 0.5, 0.02]);
    },
    // The Capitol: a wide neoclassical front with a columned centre and the big dome.
    lm_capitol(s) {
      const W = 30, D = 14, H = 7, white = '#f6f4ee', trim = '#e4e0d4';
      s.add(P.box, '#c8c2b4', [0, 0.5, 0], null, [W + 1, 1.0, D + 1]);
      s.add(P.box, white, [0, 1.0 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, trim, [0, 1.0 + H + 0.25, 0], null, [W + 0.5, 0.5, D + 0.5]);
      for (let i = -6; i <= 6; i++) { if (Math.abs(i) <= 2) continue; win(s, i * 2.1, 3.0, D / 2, 0.9, 1.5); win(s, i * 2.1, 6.0, D / 2, 0.9, 1.2); }
      // Portico with eight columns and a pediment, and steps.
      for (let i = 0; i < 8; i++) s.add(P.cyl, white, [-4.9 + i * 1.4, 4.5, D / 2 + 1.6], null, [0.32, 7.0, 0.32]);
      s.add(P.box, trim, [0, 8.2, D / 2 + 1.6], null, [11.6, 0.6, 3.6]);
      s.add(P.prism, white, [0, 9.2, D / 2 + 1.6], null, [11.8, 1.5, 3.4]);
      for (let k = 0; k < 4; k++) s.add(P.box, '#d8d2c4', [0, 0.2 + k * 0.3, D / 2 + 5.6 - k * 0.8], null, [10 - k * 0.6, 0.3, 1.0]);
      // The dome: drum with columns, the dome, the lantern and the statue on top.
      s.add(P.cyl, white, [0, 10.5, 0], null, [5.5, 3.0, 5.5]);
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; s.add(P.cyl, trim, [Math.sin(a) * 5.6, 10.5, Math.cos(a) * 5.6], null, [0.18, 3.0, 0.18]); }
      s.add(P.cyl, trim, [0, 12.2, 0], null, [5.8, 0.4, 5.8]);
      s.add(P.hemi, white, [0, 12.3, 0], null, [5.0, 5.8, 5.0]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s.add(P.box, trim, [Math.sin(a) * 3.6, 15.4, Math.cos(a) * 3.6], [0, a, -0.0], [0.12, 4.4, 0.12]); }
      s.add(P.cyl, white, [0, 18.6, 0], null, [1.0, 1.6, 1.0]);
      s.add(P.cone, white, [0, 19.8, 0], null, [1.1, 1.0, 1.1]);
      s.add(P.capsule, '#6a7a6a', [0, 20.8, 0], null, [0.25, 0.6, 0.25]);
    },
    // The Pentagon: five low wings around a courtyard.
    lm_pentagon(s) {
      const R = 16, Ri = 9, H = 5.0;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + Math.PI / 5, b = (i + 1) / 5 * Math.PI * 2 + Math.PI / 5;
        const mx = (Math.sin(a) + Math.sin(b)) / 2, mz = (Math.cos(a) + Math.cos(b)) / 2;
        const rm = (R + Ri) / 2, len = 2 * R * Math.sin(Math.PI / 5) * 0.8, rot = Math.atan2(mx, mz);
        s.add(P.box, '#c8c0aa', [mx * rm, H / 2, mz * rm], [0, rot, 0], [len, H, R - Ri]);
        s.add(P.box, '#a8a090', [mx * rm, H + 0.2, mz * rm], [0, rot, 0], [len + 0.4, 0.4, R - Ri + 0.4]);
        for (let k = -3; k <= 3; k++) for (const y of [1.4, 3.2]) {
          const ox = Math.cos(rot) * k * len / 8, oz = -Math.sin(rot) * k * len / 8;
          s.add(P.box, '#5a6a7a', [mx * (R - 0.02) + ox, y, mz * (R - 0.02) + oz], [0, rot, 0], [len / 12, 0.7, 0.06]);
        }
      }
      // Corner blocks to close the joins, and the green courtyard.
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 5; s.add(P.box, '#c8c0aa', [Math.sin(a) * (R + Ri) / 2 * 0.95, H / 2, Math.cos(a) * (R + Ri) / 2 * 0.95], [0, a, 0], [R - Ri, H, R - Ri]); }
      s.add(P.cyl, '#5fa83e', [0, 0.05, 0], null, [Ri * 0.85, 0.1, Ri * 0.85]);
    },
    // ----- Area 51 -----
    // The sonic stage from "Get Schwifty": a big stage with speaker stacks under a lighting
    // truss, and a giant Cromulon head watching from the sky.
    lm_sonicstage(s) {
      s.add(P.box, '#2a2a30', [0, 0.8, 0], null, [18, 1.6, 10]);
      s.add(P.box, '#3a3a44', [0, 1.65, 0], null, [17.6, 0.1, 9.6]);
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          s.add(P.box, '#1a1a1e', [sx * 7.6, 2.9 + k * 2.1, -1], null, [2.4, 2.0, 2.0]);
          for (const y of [-0.45, 0.45]) s.add(P.cyl, '#4a4a52', [sx * 7.6, 2.9 + k * 2.1 + y, 0.02], [Math.PI / 2, 0, 0], [0.6, 0.06, 0.6]);
        }
        s.add(P.box, '#8a8a92', [sx * 8.8, 5.5, 3.5], null, [0.3, 8, 0.3]);
        s.add(P.box, '#8a8a92', [sx * 8.8, 5.5, -3.5], null, [0.3, 8, 0.3]);
      }
      s.add(P.box, '#8a8a92', [0, 9.5, 3.5], null, [17.9, 0.4, 0.4]);
      s.add(P.box, '#8a8a92', [0, 9.5, -3.5], null, [17.9, 0.4, 0.4]);
      for (let i = -3; i <= 3; i++) s.add(P.cyl, ['#ff4d6a', '#ffd84d', '#5ff8ff'][(i + 3) % 3], [i * 2.2, 9.0, 3.5], [0.4, 0, 0], [0.3, 0.5, 0.3], true);
      s.add(P.capsule, '#59606e', [0, 2.4, 2.4], null, [0.06, 0.8, 0.06]);   // the microphone
      // The Cromulon: a huge floating head high above the stage.
      const y = 36, k = 6;
      s.add(P.sphere, '#f2c8a0', [0, y, -20], null, [k, k * 1.25, k * 0.95]);
      for (const sx of [-1, 1]) {
        s.add(P.sphere, '#ffffff', [sx * k * 0.35, y + k * 0.25, -20 + k * 0.8], null, [k * 0.28, k * 0.32, k * 0.15]);
        s.add(P.sphere, '#1b1b1b', [sx * k * 0.33, y + k * 0.22, -20 + k * 0.92], null, [k * 0.09, k * 0.09, k * 0.05]);
        s.add(P.sphere, '#f2c8a0', [sx * k * 0.98, y, -20], null, [k * 0.18, k * 0.3, k * 0.15]);
      }
      s.add(P.capsule, '#e8b890', [0, y - k * 0.05, -20 + k * 0.98], [1.2, 0, 0], [k * 0.12, k * 0.2, k * 0.1]);
      s.add(P.sphere, '#5a1a1a', [0, y - k * 0.55, -20 + k * 0.72], null, [k * 0.35, k * 0.18, k * 0.15]);
    },
    // A Quonset hangar: half a barrel on its side, with big doors at the front.
    hangar(s) {
      s.add(P.cyl, '#a8aca8', [0, 0, 0], [Math.PI / 2, 0, 0], [7.5, 18, 7.5]);
      for (let z = -8; z <= 8; z += 2) s.add(P.cyl, '#8a8e8a', [0, 0, z], [Math.PI / 2, 0, 0], [7.6, 0.2, 7.6]);
      s.add(P.box, '#6a6e6a', [0, 3.0, 9.02], null, [9, 6, 0.1]);
      s.add(P.box, '#4a4e4a', [0, 3.0, 9.08], null, [0.1, 6, 0.04]);
      s.add(P.box, '#ffd84d', [0, 6.6, 9.06], null, [4, 0.6, 0.06]);
    },
    lm_hangar(s) {
      MODELS.hangar(s);
      s.add(P.box, '#c8302a', [-3, 0.6, 10.5], null, [0.4, 1.2, 0.4]);
      s.add(P.box, '#c8302a', [3, 0.6, 10.5], null, [0.4, 1.2, 0.4]);
      s.add(P.box, '#f4f4f4', [0, 1.1, 10.5], null, [6.4, 0.2, 0.15]);
    },
    radar(s) {
      s.add(P.box, '#8a8e8a', [0, 1.5, 0], null, [1.6, 3, 1.6]);
      s.add(P.cylLo, '#6a6e6a', [0, 3.8, 0], null, [0.3, 1.6, 0.3]);
      s.add(P.hemi, '#e8e8e4', [0, 6.2, 0.4], [-2.3, 0, 0], [2.8, 1.2, 2.8]);
      s.add(P.cylLo, '#6a6e6a', [0, 6.4, 1.6], [0.8, 0, 0], [0.06, 1.8, 0.06]);
      s.add(P.sphereLo, '#c8302a', [0, 7.0, 2.2], null, [0.18, 0.18, 0.18], true);
    },
    jeep(s) {
      s.add(P.box, '#5a6a3a', [0, 0.95, 0], null, [1.9, 0.9, 3.6]);
      s.add(P.box, '#4a5632', [0, 1.55, -0.6], null, [1.8, 0.4, 1.8]);
      s.add(P.box, '#9fc4d0', [0, 1.8, 0.6], [-0.3, 0, 0], [1.7, 0.7, 0.06]);
      for (const sx of [-1, 1]) for (const z of [-1.2, 1.2]) s.add(P.cyl, '#1e1e1e', [sx * 0.95, 0.45, z], [0, 0, Math.PI / 2], [0.45, 0.35, 0.45]);
      s.add(P.cylLo, '#3a3a3a', [0, 1.3, -1.9], [Math.PI / 2, 0, 0], [0.4, 0.2, 0.4]);
    },
    watchtower(s) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, '#6a5a44', [sx * 1.2, 3.2, sz * 1.2], [sz * 0.06, 0, -sx * 0.06], [0.22, 6.4, 0.22]);
      s.add(P.box, '#7a6a52', [0, 6.5, 0], null, [3.2, 0.25, 3.2]);
      s.add(P.box, '#8a7a62', [0, 7.2, 1.55], null, [3.2, 1.2, 0.1]);
      s.add(P.box, '#8a7a62', [0, 7.2, -1.55], null, [3.2, 1.2, 0.1]);
      s.add(P.box, '#8a7a62', [1.55, 7.2, 0], null, [0.1, 1.2, 3.2]);
      s.add(P.box, '#8a7a62', [-1.55, 7.2, 0], null, [0.1, 1.2, 3.2]);
      s.add(P.prism, '#5a4a38', [0, 8.6, 0], null, [3.6, 1.2, 3.6]);
      s.add(P.cylLo, '#ffe8a0', [1.4, 8.0, 1.4], [0.6, 0, 0], [0.18, 0.4, 0.18], true);
    },
    // Highway on-ramp: a green gantry sign over a stretch of road.
    lm_highway(s) {
      s.add(P.box, '#4a4a50', [0, 0.06, 0], null, [8, 0.12, 9]);
      for (const z of [-3, 0, 3]) s.add(P.box, '#f4f0e0', [0, 0.13, z], null, [0.2, 0.02, 1.4]);
      for (const sx of [-1, 1]) { s.add(P.cylLo, '#9a9ea4', [sx * 4.6, 3.4, 0], null, [0.2, 6.8, 0.2]); s.add(P.box, '#c8302a', [sx * 4.6, 0.3, 0.5], null, [0.4, 0.6, 0.12]); }
      s.add(P.box, '#9a9ea4', [0, 6.7, 0], null, [9.6, 0.3, 0.3]);
      s.add(P.box, '#1f7a46', [0, 6.1, 0.18], null, [7.4, 1.7, 0.12]);
      s.add(P.box, '#f4f4f4', [0, 6.1, 0.24], null, [7.2, 1.5, 0.01]);
      s.add(P.box, '#1f7a46', [0, 6.1, 0.25], null, [7.0, 1.3, 0.01]);
    },
    // ----- Downtown towers and D.C. buildings -----
    skyscraper(s) {
      const W = 11, H = 32, col = '#7a9ab0', frame = '#d8dde2';
      s.add(P.box, '#4a4e54', [0, 0.25, 0], null, [W + 0.4, 0.5, W + 0.4]);
      s.add(P.box, col, [0, 0.5 + H / 2, 0], null, [W, H, W]);
      for (let y = 3.5; y < H; y += 3.2) s.add(P.box, frame, [0, y, 0], null, [W + 0.08, 0.35, W + 0.08]);
      for (const x of [-W / 2, -W / 6, W / 6, W / 2]) for (const z of [-1, 1]) {
        s.add(P.box, frame, [x, 0.5 + H / 2, z * W / 2], null, [0.3, H, 0.1]);
        s.add(P.box, frame, [z * W / 2, 0.5 + H / 2, x], null, [0.1, H, 0.3]);
      }
      s.add(P.box, frame, [0, H + 1.2, 0], null, [W - 3, 1.4, W - 3]);
      s.add(P.cylLo, '#9a9ea4', [2, H + 3.5, 2], null, [0.08, 3.6, 0.08]);
      s.add(P.sphereLo, '#ff4d4d', [2, H + 5.3, 2], null, [0.16, 0.16, 0.16], true);
      s.add(P.box, '#3a4048', [0, 1.8, W / 2 + 0.05], null, [3, 2.6, 0.06]);
    },
    apartment(s) {
      const W = 10, D = 10, H = 15, brick = '#a8644a';
      s.add(P.box, '#4a443c', [0, 0.2, 0], null, [W + 0.3, 0.4, D + 0.3]);
      s.add(P.box, brick, [0, 0.4 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#d8d2c4', [0, 0.4 + H + 0.2, 0], null, [W + 0.4, 0.4, D + 0.4]);
      for (let y = 2.0; y < H - 1; y += 2.6) for (const x of [-3, 0, 3]) {
        s.add(P.box, '#e8e2d4', [x, y, D / 2 + 0.03], null, [1.5, 1.6, 0.06]);
        s.add(P.box, '#9fc4d8', [x, y, D / 2 + 0.07], null, [1.2, 1.3, 0.04]);
      }
      // Fire escape down the front.
      for (let y = 4.5; y < H; y += 2.6) s.add(P.box, '#2a2a2a', [3, y - 1.1, D / 2 + 0.6], null, [2.6, 0.08, 1.1]);
      s.add(P.box, '#3a2a1a', [-3, 1.4, D / 2 + 0.05], null, [1.4, 2.2, 0.06]);
    },
    officeblock(s) {
      const W = 15, D = 11, H = 10, stone = '#e8e2d4';
      s.add(P.box, '#c8c2b4', [0, 0.3, 0], null, [W + 0.6, 0.6, D + 0.6]);
      s.add(P.box, stone, [0, 0.6 + H / 2, 0], null, [W, H, D]);
      s.add(P.box, '#d8d2c4', [0, 0.6 + H + 0.3, 0], null, [W + 0.6, 0.6, D + 0.6]);
      for (let i = 0; i < 8; i++) s.add(P.cyl, '#f6f2ea', [-5.6 + i * 1.6, 4.5, D / 2 + 0.6], null, [0.3, 7.8, 0.3]);
      s.add(P.box, '#d8d2c4', [0, 8.6, D / 2 + 0.6], null, [13, 0.6, 1.4]);
      for (let i = 0; i < 7; i++) for (const y of [2.6, 6.0]) s.add(P.box, '#7a8a9a', [-4.8 + i * 1.6, y, D / 2 + 0.03], null, [0.8, 1.6, 0.05]);
      for (let k = 0; k < 3; k++) s.add(P.box, '#d8d2c4', [0, 0.15 + k * 0.2, D / 2 + 2.2 - k * 0.4], null, [6 - k * 0.4, 0.2, 0.8]);
    },
    flagpole(s) {
      s.add(P.cyl, '#c8c2b4', [0, 0.2, 0], null, [0.5, 0.4, 0.5]);
      s.add(P.cylLo, '#e4e4e4', [0, 4.6, 0], null, [0.07, 8.8, 0.07]);
      s.add(P.box, '#f4f4f4', [0.85, 8.1, 0], null, [1.7, 1.1, 0.04]);
      for (let i = 0; i < 4; i++) s.add(P.box, '#c8302a', [0.85, 7.66 + i * 0.28, 0.03], null, [1.7, 0.13, 0.02]);
      s.add(P.box, '#2a4a8a', [0.38, 8.38, 0.04], null, [0.76, 0.55, 0.02]);
    },
    cherrytree(s) {
      s.add(P.cylLo, '#6a4a3a', [0, 1.4, 0], [0, 0, 0.08], [0.22, 2.8, 0.22]);
      s.add(P.sphere, '#f4b8cc', [0, 3.6, 0], null, [2.2, 1.6, 2.2]);
      s.add(P.sphere, '#f8c8d8', [0.9, 4.2, 0.4], null, [1.3, 1.0, 1.3]);
      s.add(P.sphere, '#eaa4bc', [-0.8, 4.0, -0.6], null, [1.3, 1.0, 1.3]);
    },
    // ----- Alternate Earths -----
    // A regime banner on a pole: charcoal with red edges and a gold spiral (no real-world symbols).
    banner(s) {
      s.add(P.cylLo, '#2a2a2a', [0, 3.2, 0], null, [0.08, 6.4, 0.08]);
      s.add(P.box, '#2a2a2a', [0, 6.3, 0], null, [1.8, 0.1, 0.1]);
      s.add(P.box, '#b5243c', [0, 4.4, 0.06], null, [1.6, 3.6, 0.05]);
      s.add(P.box, '#3a3a40', [0, 4.4, 0.09], null, [1.2, 3.3, 0.02]);
      const ring = new T.TorusGeometry(0.38, 0.07, 6, 20, Math.PI * 1.6);
      s.add(ring, '#d8b040', [0, 5.1, 0.11], null, null);
      ring.dispose();
      s.add(P.sphereLo, '#d8b040', [0, 5.1, 0.11], null, [0.12, 0.12, 0.03]);
      s.add(P.box, '#d8b040', [0, 3.5, 0.11], null, [0.9, 0.12, 0.02]);
    },
    // A heroic shrimp, standing tall on its tail fan, one claw raised.
    shrimpstatue(s) {
      s.add(P.box, '#c8c2b4', [0, 0.6, 0], null, [2.6, 1.2, 2.6]);
      const k = '#ff8a6a', d = '#e86a4a';
      for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.5; s.add(P.sphere, d, [Math.sin(a) * 0.5, 1.35, -0.2 + Math.cos(a) * 0.3], [0.2, a, 0], [0.32, 0.12, 0.55]); }   // tail fan
      for (let i = 0; i < 7; i++) { const t = i / 6, z = Math.sin(t * 2.2) * 0.45 - 0.1; s.add(P.sphere, shade(k, 1 - i * 0.03), [0, 1.6 + i * 0.48, z], [-0.25 + t * 0.5, 0, 0], [0.62 - i * 0.03, 0.34, 0.5]); }
      s.add(P.sphere, k, [0, 5.0, 0.5], [0.4, 0, 0], [0.5, 0.42, 0.6]);                // head
      s.add(P.cone, d, [0, 5.15, 1.1], [1.3, 0, 0], [0.12, 0.6, 0.12]);                 // rostrum
      for (const sx of [-1, 1]) {
        s.add(P.cylLo, d, [sx * 0.25, 5.35, 0.75], null, [0.04, 0.3, 0.04]);
        s.add(P.sphere, '#1b1b1b', [sx * 0.25, 5.52, 0.78], null, [0.12, 0.12, 0.12]);
        s.add(P.cylLo, d, [sx * 0.35, 5.6, -0.3], [-0.9, 0, -sx * 0.35], [0.03, 2.4, 0.03]);   // antennae sweep back
        for (let j = 0; j < 4; j++) s.add(P.cylLo, d, [sx * 0.5, 2.4 + j * 0.45, 0.4], [0.5, 0, sx * 0.9], [0.04, 0.5, 0.04]);   // little legs
      }
      C.capsuleAt(s, k, 0.11, 1.0, [0.55, 3.8, 0.3], [0, 0, -0.7]);   // raised arm
      s.add(P.sphere, d, [1.25, 4.6, 0.3], null, [0.24, 0.32, 0.16]);
      s.add(P.cone, d, [1.35, 4.95, 0.3], [0, 0, -0.3], [0.12, 0.36, 0.1]);
      C.capsuleAt(s, k, 0.11, 0.9, [-0.55, 3.8, 0.3], [0, 0, 2.5]);
    },
    teddystatue(s) {
      s.add(P.box, '#c8c2b4', [0, 0.6, 0], null, [2.4, 1.2, 2.4]);
      const fur = '#b07a4a';
      s.add(P.sphere, fur, [0, 2.2, 0], null, [1.0, 1.1, 0.9]);
      s.add(P.sphere, shade(fur, 1.4), [0, 2.1, 0.55], null, [0.6, 0.7, 0.4]);
      s.add(P.sphere, fur, [0, 3.7, 0], null, [0.8, 0.75, 0.75]);
      for (const sx of [-1, 1]) {
        s.add(P.sphere, fur, [sx * 0.6, 4.35, 0], null, [0.3, 0.3, 0.2]);
        s.add(P.capsule, fur, [sx * 1.0, 2.5, 0.1], [0, 0, sx * 0.6], [0.28, 0.5, 0.28]);
        s.add(P.capsule, fur, [sx * 0.45, 1.35, 0.3], null, [0.3, 0.3, 0.34]);
        s.add(P.sphere, '#1b1b1b', [sx * 0.28, 3.85, 0.68], null, [0.09, 0.09, 0.05]);
      }
      s.add(P.sphere, shade(fur, 1.45), [0, 3.5, 0.62], null, [0.35, 0.25, 0.25]);
      s.add(P.sphere, '#2a1a12', [0, 3.6, 0.85], null, [0.12, 0.08, 0.06]);
      s.add(P.cone, '#2a2a2a', [0, 3.9, 0.9], [0, 0, Math.PI / 2], [0.06, 0.25, 0.06]);   // a tiny cocktail stick
    },
    honeypot(s) {
      s.add(P.sphere, '#c8803a', [0, 0.6, 0], null, [0.65, 0.6, 0.65]);
      s.add(P.cyl, '#b0703a', [0, 1.15, 0], null, [0.45, 0.2, 0.45]);
      s.add(P.cyl, '#ffc84a', [0, 1.26, 0], null, [0.4, 0.05, 0.4], true);
      s.add(P.box, '#f4ead4', [0, 0.65, 0.6], null, [0.5, 0.35, 0.03]);
    },
    // C-500A: a billboard for the latest Jerry Smith movie.
    moviesign(s) {
      for (const sx of [-1, 1]) s.add(P.box, '#59606e', [sx * 2.2, 2.4, 0], null, [0.25, 4.8, 0.25]);
      s.add(P.box, '#1a1a24', [0, 5.2, 0], null, [6.4, 3.2, 0.3]);
      s.add(P.box, '#ffd84d', [0, 6.3, 0.17], null, [5.6, 0.6, 0.02], true);
      s.add(P.box, '#e8c49a', [-1.6, 4.9, 0.17], null, [1.6, 2.0, 0.02]);
      s.add(P.box, '#7a4a26', [-1.6, 5.75, 0.18], null, [1.4, 0.4, 0.02]);
      s.add(P.box, '#c8302a', [1.2, 4.9, 0.17], null, [2.6, 0.5, 0.02], true);
      s.add(P.box, '#f4f4f4', [1.2, 4.2, 0.17], null, [2.2, 0.3, 0.02]);
    },
    // A glowing ring on the floor: something to do here (inside rooms built elsewhere).
    // ----- Snake Planet -----
    // A snake hut: a round mud hut wrapped by a carved snake, coiling up to a head over the door.
    snakehut(s) {
      s.add(P.cyl, '#b88a5a', [0, 1.6, 0], null, [2.6, 3.2, 2.6]);
      s.add(P.cone, '#7a9a3a', [0, 4.3, 0], null, [3.1, 2.4, 3.1]);
      s.add(P.box, '#3a2a1a', [0, 1.1, 2.55], null, [1.2, 2.2, 0.2]);
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2.4, y = 0.4 + i * 0.17; s.add(P.sphere, i % 2 ? '#c8e04a' : '#8ab02a', [Math.sin(a) * 2.75, y, Math.cos(a) * 2.75], null, [0.36, 0.3, 0.36]); }
      s.add(P.sphere, '#c8e04a', [0, 3.6, 2.9], null, [0.55, 0.42, 0.7]);
      for (const sx of [-1, 1]) s.add(P.sphereLo, '#ffe066', [sx * 0.24, 3.75, 3.4], null, [0.1, 0.12, 0.08], true);
      s.add(P.box, '#e2483d', [0, 3.45, 3.6], [0.3, 0, 0], [0.06, 0.04, 0.5]);
    },
    fern(s) {
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; s.add(P.sphere, i % 2 ? '#3a8a3a' : '#4aa04a', [Math.sin(a) * 0.9, 1.5, Math.cos(a) * 0.9], [0.9 * Math.cos(a), a, -0.9 * Math.sin(a)], [0.28, 1.5, 0.08]); }
      s.add(P.sphereLo, '#2a6a2a', [0, 0.5, 0], null, [0.5, 0.5, 0.5]);
    },
    jungletree(s) {
      s.add(P.cylLo, '#6a4a2a', [0, 4.5, 0], [0, 0, 0.05], [0.45, 9, 0.45]);
      for (let i = 0; i < 4; i++) { const a = i * 1.6; C.capsuleAt(s, '#5a3a1a', 0.07, 3, [Math.sin(a) * 0.6, 7, Math.cos(a) * 0.6], [Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2]); }
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; s.add(P.sphere, i % 2 ? '#2f7a3a' : '#3a9a44', [Math.sin(a) * 2.2, 9.2 + (i % 3) * 0.3, Math.cos(a) * 2.2], [0.5 * Math.cos(a), a, -0.5 * Math.sin(a)], [0.8, 0.25, 2.4]); }
      s.add(P.sphere, '#2a6a32', [0, 9.6, 0], null, [1.4, 0.9, 1.4]);
    },
    // The Snake Jazz Club: a stone stage under a giant coiled snake, with lights on its scales.
    lm_snakeclub(s) {
      s.add(P.box, '#7a6a4a', [0, 0.6, 0], null, [15, 1.2, 10]);
      s.add(P.box, '#3a2a3a', [0, 3.6, -4.6], null, [14, 6, 0.6]);
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 3, r = 6.5 - i * 0.12, y = 1.6 + i * 0.26; s.add(P.sphere, i % 2 ? '#8ab02a' : '#6a9020', [Math.cos(a) * r, y, Math.sin(a) * r * 0.55 - 1], null, [0.85, 0.7, 0.85]); }
      s.add(P.sphere, '#8ab02a', [0, 9.2, 0.6], null, [1.5, 1.1, 1.9]);
      for (const sx of [-1, 1]) { s.add(P.sphere, '#ffe066', [sx * 0.7, 9.6, 2.0], null, [0.28, 0.32, 0.2], true); s.add(P.sphereLo, '#111', [sx * 0.7, 9.6, 2.2], null, [0.08, 0.26, 0.05]); }
      s.add(P.box, '#e2483d', [0, 8.9, 2.6], [0.4, 0, 0], [0.12, 0.06, 1.2]);
      for (let i = -3; i <= 3; i++) s.add(P.sphereLo, ['#ff6fd0', '#5ff8ff', '#ffe066'][(i + 3) % 3], [i * 2, 6.8, -4.2], null, [0.3, 0.3, 0.3], true);
      s.add(P.cylLo, '#c8a040', [-3, 2.2, 2], null, [0.5, 2, 0.5]); s.add(P.cone, '#c8a040', [-3, 3.5, 2.2], [0.5, 0, 0], [0.6, 0.9, 0.6]);   // a saxophone, sort of
    },
    // ----- Earth, 65 million years ago -----
    volcano(s) {
      s.add(P.cone, '#5a4a40', [0, 14, 0], null, [17, 28, 17]);
      s.add(P.cone, '#6a5a4a', [4, 6, 3], null, [10, 12, 10]);
      s.add(P.cyl, '#ff5a1a', [0, 27.6, 0], null, [3.2, 0.8, 3.2], true);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.box, '#ff7a2a', [Math.sin(a) * 4, 22, Math.cos(a) * 4], [0, a, 0.32], [0.7, 12, 0.3], true); }
      for (let i = 0; i < 5; i++) s.add(P.sphereLo, i % 2 ? '#7a7a80' : '#9a9aa0', [Math.sin(i) * 1.5, 31 + i * 2.2, Math.cos(i * 2) * 1.5], null, [2.2 + i * 0.4, 1.6, 2.2 + i * 0.4]);
    },
    dinoegg(s) {
      s.add(P.sphere, '#e8e0c8', [0, 1.1, 0], null, [0.75, 1.1, 0.75]);
      for (let i = 0; i < 7; i++) s.add(P.sphereLo, '#8aa06a', [Math.sin(i * 2.3) * 0.62, 0.6 + i * 0.22, Math.cos(i * 2.3) * 0.62], null, [0.14, 0.12, 0.06]);
      s.add(P.torus, '#a87a4a', [0, 0.15, 0], [Math.PI / 2, 0, 0], [1.1, 1.1, 1.4]);
    },
    // The Dinosaur Council: a ring of stone seats around a fire, under giant ferns.
    lm_dinocouncil(s) {
      s.add(P.cyl, '#9a8a6a', [0, 0.2, 0], null, [9.5, 0.4, 9.5]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.box, '#7a6a5a', [Math.sin(a) * 7.4, 1.6, Math.cos(a) * 7.4], [0, a, 0], [3.2, 2.8, 1.4]); s.add(P.box, '#8a7a6a', [Math.sin(a) * 8.1, 4, Math.cos(a) * 8.1], [0, a, 0], [3.2, 5, 0.6]); }
      s.add(P.cylLo, '#5a4a3a', [0, 0.6, 0], null, [1.6, 0.6, 1.6]);
      s.add(P.cone, '#ff8a2a', [0, 1.7, 0], null, [1.1, 2, 1.1], true); s.add(P.cone, '#ffe066', [0, 1.4, 0], null, [0.6, 1.3, 0.6], true);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; for (let k = 0; k < 6; k++) { const b = k / 6 * Math.PI * 2; s.add(P.sphere, '#3a8a3a', [Math.sin(a) * 10 + Math.sin(b) * 1.6, 3.8, Math.cos(a) * 10 + Math.cos(b) * 1.6], [0.9 * Math.cos(b), b, -0.9 * Math.sin(b)], [0.5, 3, 0.12]); } }
    },
    // ----- Giant World -----
    giantmug(s) {
      s.add(P.cyl, '#e8e0d0', [0, 4.2, 0], null, [3.6, 8.4, 3.6]);
      s.add(P.cyl, '#5a3a20', [0, 8.3, 0], null, [3.3, 0.3, 3.3]);
      s.add(P.torus, '#e8e0d0', [3.9, 4.5, 0], [0, 0, 0], [2.0, 2.4, 3.2]);
      s.add(P.box, '#e2483d', [0, 4.4, 3.55], null, [3, 2, 0.2]);
    },
    giantboot(s) {
      s.add(P.box, '#6a4a2a', [0, 1.2, 1.2], null, [4, 2.4, 6.5]);
      s.add(P.cyl, '#6a4a2a', [0, 4.4, -0.8], null, [2.1, 6.2, 2.4]);
      s.add(P.box, '#2a1a10', [0, 0.25, 1.2], null, [4.2, 0.5, 6.7]);
      for (let i = 0; i < 5; i++) s.add(P.box, '#e8d8a8', [0, 2.6 + i * 0.6, 1.4 - i * 0.3], [0.3, 0, 0], [2.4, 0.12, 0.12]);
    },
    giantfork(s) {
      s.add(P.box, '#b8c0c8', [0, 4.5, 0], [0, 0, 0.1], [0.7, 9, 0.35]);
      s.add(P.box, '#b8c0c8', [0.9, 9.4, 0], [0, 0, 0.1], [2.6, 1.0, 0.35]);
      for (let i = -1.5; i <= 1.5; i++) s.add(P.box, '#c8d0d8', [0.9 + i * 0.75 - 0.4, 11.6, 0], [0, 0, 0.1], [0.3, 3.6, 0.3]);
    },
    beanstalk(s) {
      for (let i = 0; i < 12; i++) { const y = i * 2.6; s.add(P.cylLo, i % 2 ? '#4a9a2a' : '#5aaa32', [Math.sin(i * 0.8) * 0.8, y + 1.3, Math.cos(i * 0.8) * 0.8], [Math.sin(i) * 0.2, 0, Math.cos(i) * 0.2], [0.9, 2.9, 0.9]); s.add(P.sphere, '#6ac83a', [Math.sin(i * 0.8 + 1.5) * 2.2, y + 1.8, Math.cos(i * 0.8 + 1.5) * 2.2], [0, i, 0.8], [1.2, 0.2, 0.7]); }
      s.add(P.sphere, '#8ad84a', [0, 31.5, 0], null, [3, 1.6, 3]);
    },
    cloudpuff(s) {
      s.add(P.sphere, '#ffffff', [0, 1, 0], null, [2.2, 1.3, 2.0]);
      s.add(P.sphere, '#f4f8ff', [1.6, 0.8, 0.4], null, [1.4, 1.0, 1.4]);
      s.add(P.sphere, '#f4f8ff', [-1.5, 0.7, -0.3], null, [1.3, 0.9, 1.3]);
    },
    // The giants' castle: stone walls, round towers with cone roofs, and a door you could fly a ship through.
    lm_giantcastle(s) {
      s.add(P.box, '#a8a090', [0, 7, 0], null, [22, 14, 14]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { s.add(P.cyl, '#b8b0a0', [sx * 11, 10, sz * 7], null, [3.2, 20, 3.2]); s.add(P.cone, '#5a6ac8', [sx * 11, 23.5, sz * 7], null, [3.8, 7, 3.8]); }
      for (let i = -5; i <= 5; i++) s.add(P.box, '#a8a090', [i * 2, 14.6, 7], null, [1.1, 1.2, 1]);
      s.add(P.box, '#4a3020', [0, 4.5, 7.05], null, [6, 9, 0.3]);
      s.add(P.cyl, '#4a3020', [0, 9, 7.05], [Math.PI / 2, 0, 0], [3, 0.3, 3]);
      for (const sx of [-1, 1]) s.add(P.box, '#ffe9a0', [sx * 6.5, 9, 7.05], null, [1.8, 3, 0.2], true);
      s.add(P.box, '#e2483d', [0, 27, 0], null, [0.2, 4, 0.2]); s.add(P.box, '#e2483d', [1, 28.4, 0], null, [2, 1.2, 0.1]);
    },
    // ----- Atlantis -----
    coral(s) {
      const c = ['#ff6f8a', '#ff9b4d', '#c86aff'];
      for (let i = 0; i < 6; i++) { const a = i * 1.1; C.capsuleAt(s, c[i % 3], 0.22, 2.2 + (i % 3) * 0.5, [Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5], [Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]); s.add(P.sphereLo, c[(i + 1) % 3], [Math.sin(a) * 1.1, 2.6 + (i % 3) * 0.5, Math.cos(a) * 1.1], null, [0.35, 0.35, 0.35], true); }
    },
    kelp(s) {
      for (let k = 0; k < 3; k++) for (let i = 0; i < 7; i++) s.add(P.sphere, i % 2 ? '#3a8a4a' : '#4a9a3a', [k * 0.4 - 0.4 + Math.sin(i * 0.9 + k) * 0.35, 0.5 + i * 0.95, Math.cos(k * 2) * 0.3], [0, k, Math.sin(i + k) * 0.3], [0.3, 0.6, 0.06]);
    },
    column(s) {
      s.add(P.box, '#d8d0c0', [0, 0.3, 0], null, [2.2, 0.6, 2.2]);
      s.add(P.cyl, '#e8e0d0', [0, 4.5, 0], null, [0.8, 8, 0.8]);
      s.add(P.box, '#d8d0c0', [0, 8.7, 0], null, [2.0, 0.6, 2.0]);
      for (let i = 0; i < 4; i++) s.add(P.sphereLo, '#5aa86a', [Math.sin(i * 1.7) * 0.82, 1.5 + i * 1.5, Math.cos(i * 1.7) * 0.82], null, [0.3, 0.6, 0.12]);
    },
    shell(s) {
      for (let i = 0; i < 7; i++) s.add(P.sphere, i % 2 ? '#f4c8b0' : '#ffd8c8', [(i - 3) * 0.32, 0.8, 0], [0, 0, (i - 3) * 0.22], [0.4, 1.0, 1.3]);
      s.add(P.sphere, '#fff4f0', [0, 0.6, 0.6], null, [0.35, 0.35, 0.35], true);
    },
    // Mr. Nimbus's palace: a domed temple of white columns, sea green roof, trident on top.
    lm_nimbuspalace(s) {
      s.add(P.box, '#d8d0c0', [0, 0.8, 0], null, [22, 1.6, 14]);
      s.add(P.box, '#e8e0d0', [0, 1.9, 0], null, [20, 0.6, 12.4]);
      for (let i = -4; i <= 4; i++) for (const sz of [-5.5, 5.5]) s.add(P.cyl, '#f0e8d8', [i * 2.3, 5.4, sz], null, [0.6, 6.6, 0.6]);
      s.add(P.box, '#d8d0c0', [0, 9.1, 0], null, [21, 1, 13]);
      s.add(P.hemi, '#4ac8a0', [0, 9.6, 0], null, [6.5, 5, 6.5]);
      s.add(P.cylLo, '#ffd84d', [0, 16.5, 0], null, [0.2, 3.5, 0.2], true);
      for (const sx of [-1, 0, 1]) s.add(P.cone, '#ffd84d', [sx * 0.6, 18.6, 0], null, [0.18, 1, 0.18], true);
      s.add(P.box, '#ffd84d', [0, 18, 0], null, [1.4, 0.2, 0.2], true);
    },
    // ----- The Dream World -----
    floatdoor(s) {
      s.add(P.box, '#8a5a3a', [0, 2.4, 0], [0, 0, 0.12], [1.3, 2.6, 0.14]);
      s.add(P.box, '#6a3a22', [0, 2.4, 0], [0, 0, 0.12], [1.6, 2.9, 0.08]);
      s.add(P.sphereLo, '#ffd84d', [0.4, 2.3, 0.1], null, [0.08, 0.08, 0.08], true);
      s.add(P.box, '#ffe066', [0, 2.4, -0.05], [0, 0, 0.12], [1.2, 2.5, 0.02], true);
    },
    // A Dali clock, draped over a dead branch.
    meltclock(s) {
      s.add(P.cylLo, '#6a4a3a', [0, 1.6, 0], [0, 0, 0.3], [0.2, 3.2, 0.2]);
      s.add(P.cyl, '#ffd84d', [0.4, 3.2, 0], [Math.PI / 2, 0, 0.2], [1.1, 0.12, 1.4]);
      s.add(P.cyl, '#fff8e0', [0.4, 3.2, 0.07], [Math.PI / 2, 0, 0.2], [0.95, 0.04, 1.2]);
      s.add(P.sphere, '#fff8e0', [1.1, 2.1, 0.05], null, [0.45, 0.9, 0.08]);
      s.add(P.box, '#1a1a1a', [0.4, 3.35, 0.12], [0, 0, 0.6], [0.06, 0.6, 0.02]); s.add(P.box, '#1a1a1a', [0.6, 3.2, 0.12], [0, 0, 1.6], [0.05, 0.45, 0.02]);
    },
    locker(s) {
      for (let i = -1; i <= 1; i++) { s.add(P.box, ['#3a6ac8', '#c83a3a', '#3a8a5a'][i + 1], [i * 0.8, 1.2, 0], null, [0.76, 2.4, 0.7]); for (let k = 0; k < 3; k++) s.add(P.box, '#1a2a4a', [i * 0.8, 2.1 - k * 0.12, 0.36], null, [0.4, 0.04, 0.02]); }
    },
    // Stairs up to nowhere.
    dreamstair(s) {
      for (let i = 0; i < 12; i++) s.add(P.box, i % 2 ? '#e8d8ff' : '#c8b0f0', [Math.sin(i * 0.5) * 1.6, 0.4 + i * 0.72, Math.cos(i * 0.5) * 1.6 - 1.6], [0, i * 0.5, 0], [2.2, 0.25, 0.9]);
      s.add(P.box, '#ffe066', [Math.sin(6) * 1.6, 9.2, Math.cos(6) * 1.6 - 1.6], null, [1.0, 1.8, 0.1], true);
    },
    // Dream High School: the school, but leaning, with a giant clock and too many doors.
    lm_dreamschool(s) {
      s.add(P.box, '#c86a5a', [0, 4, 0], [0, 0, 0.04], [18, 8, 9]);
      s.add(P.box, '#e8e0d8', [0, 8.3, 0], [0, 0, 0.04], [18.6, 0.6, 9.6]);
      for (let i = -3; i <= 3; i++) s.add(P.box, '#8a5a3a', [i * 2.4, 1.3, 4.55], null, [1.1, 2.4, 0.1]);
      for (let i = -3; i <= 3; i++) s.add(P.box, '#ffe9a0', [i * 2.4 + (i % 2) * 0.3, 5.5, 4.55], [0, 0, i * 0.1], [1.4, 1.6, 0.1], true);
      s.add(P.cyl, '#fff8e0', [0, 10.8, 1], [Math.PI / 2, 0, 0], [2.4, 0.4, 2.8]);
      s.add(P.box, '#1a1a1a', [0, 11.4, 1.25], [0, 0, 0.5], [0.15, 1.6, 0.05]);
      s.add(P.box, '#1a1a1a', [0.4, 10.7, 1.25], [0, 0, 1.9], [0.12, 1.1, 0.05]);
    },
    // ----- The split timeline -----
    timeshard(s) {
      s.add(P.octa, '#8fd8ff', [0, 1.9, 0], [0.3, 0.5, 0.2], [0.55, 1.7, 0.4], true);
      s.add(P.octa, '#ffffff', [0.3, 1.6, 0.2], [0.8, 0.1, 0.4], [0.25, 0.8, 0.2], true);
    },
    lm_timerift(s) {
      s.add(P.torus, '#8fd8ff', [0, 4.5, 0], null, [3.6, 3.6, 2.0], true);
      s.add(P.torus, '#ffffff', [0, 4.5, 0], [0, 0, 0.3], [2.8, 2.8, 1.2], true);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.octa, i % 2 ? '#c8f0ff' : '#5aa8ff', [Math.cos(a) * 3.6, 4.5 + Math.sin(a) * 3.6, 0], [a, a, 0], [0.4, 0.9, 0.3], true); }
      s.add(P.cyl, '#5a5a6a', [0, 0.2, 0], null, [3, 0.4, 3]);
    },
    // ----- Doofus Rick's Earth -----
    flowerbed(s) {
      s.add(P.box, '#6a4a2a', [0, 0.2, 0], null, [2.6, 0.4, 1.2]);
      const c = ['#ff6f8a', '#ffe066', '#ffffff', '#c88aff'];
      for (let i = 0; i < 8; i++) { s.add(P.cylLo, '#3a8a3a', [(i % 4) * 0.6 - 0.9, 0.6, (i < 4 ? -0.3 : 0.3)], null, [0.03, 0.6, 0.03]); s.add(P.sphereLo, c[i % 4], [(i % 4) * 0.6 - 0.9, 0.95, (i < 4 ? -0.3 : 0.3)], null, [0.16, 0.12, 0.16]); }
    },
    // ----- Something to do in every world -----
    lm_purgestage(s) {
      s.add(P.box, '#8a6a3a', [0, 0.6, 0], null, [12, 1.2, 7]);
      for (let i = -5; i <= 5; i++) s.add(P.box, '#6a4a2a', [i * 1.1, 0.62, 3.5], null, [1.0, 1.2, 0.1]);
      for (const sx of [-1, 1]) { s.add(P.cylLo, '#5a3a1a', [sx * 5.6, 3.6, -3], null, [0.18, 6, 0.18]); s.add(P.cone, '#ff8a2a', [sx * 5.6, 7.1, -3], null, [0.5, 1.0, 0.5], true); }
      s.add(P.box, '#c8302a', [0, 5.4, -3.1], null, [11, 2.0, 0.1]);
      s.add(P.box, '#f4e0b0', [0, 5.4, -3.0], null, [8, 0.6, 0.06]);
      for (let i = 0; i < 6; i++) s.add(P.cyl, '#d8b84a', [-4 + i * 1.6, 1.6, -1], null, [0.3, 0.8, 0.3]);   // pumpkins? bales.
      s.add(P.cylLo, '#3a3a3a', [0, 2.0, 1], null, [0.04, 1.6, 0.04]); s.add(P.sphereLo, '#3a3a3a', [0, 2.9, 1], null, [0.12, 0.16, 0.12]);   // the microphone
    },
    lm_squanchclub(s) {
      s.add(P.hemi, '#c84a8a', [0, 0, 0], null, [7, 6, 7]);
      s.add(P.box, '#2a0a2a', [0, 1.6, 6.5], null, [2.6, 3.2, 1.2]);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s.add(P.sphereLo, ['#ff6fd0', '#5ff8ff', '#ffe066'][i % 3], [Math.cos(a) * 6.6, 3.2 + Math.sin(i) * 0.8, Math.sin(a) * 6.6], null, [0.35, 0.35, 0.35], true); }
      s.add(P.cyl, '#ffd84d', [0, 6.5, 0], null, [0.8, 1.6, 0.8], true);
      s.add(P.box, '#ffe066', [0, 4.6, 6.4], null, [4.2, 0.9, 0.1], true);
    },
    lm_gazorpthrone(s) {
      for (let i = 0; i < 4; i++) s.add(P.box, '#8a3a2a', [0, 0.4 + i * 0.6, -i * 0.9], null, [8 - i * 1.4, 0.6, 6 - i * 0.9]);
      s.add(P.box, '#c8a040', [0, 4.6, -3.2], null, [3.2, 3.4, 1.0]);
      s.add(P.box, '#c8a040', [0, 3.0, -2.2], null, [3.2, 0.6, 2.2]);
      for (const sx of [-1, 1]) { s.add(P.box, '#c8a040', [sx * 1.7, 3.6, -2.3], null, [0.4, 1.6, 2.2]); s.add(P.cone, '#f0e8d0', [sx * 1.4, 6.8, -3.2], [0, 0, sx * -0.4], [0.3, 1.6, 0.3]); }
      for (let i = 0; i < 7; i++) s.add(P.cone, '#f0e8d0', [-3 + i, 6.6, -3.4], null, [0.16, 0.9, 0.16]);   // bone crown
      for (const sx of [-1, 1]) s.add(P.cylLo, '#e8d8b0', [sx * 4.2, 3, 1.5], null, [0.3, 6, 0.3]);
    },
    lm_froopyslide(s) {
      s.add(P.cyl, '#ffb0e0', [0, 4.5, 0], null, [1.2, 9, 1.2]);
      s.add(P.cyl, '#b0d8ff', [0, 9.2, 0], null, [2.0, 0.5, 2.0]);
      for (let i = 0; i < 26; i++) { const a = i * 0.42, y = 9 - i * 0.34; s.add(P.box, i % 2 ? '#c8ffb0' : '#ffe0a0', [Math.cos(a) * 2.6, y, Math.sin(a) * 2.6], [0, -a, -0.35], [1.8, 0.25, 1.0]); }
      s.add(P.sphere, '#ffd6f0', [0, 10, 0], null, [1.6, 1.0, 1.6]);
    },
    lm_pizzacounter(s) {
      s.add(P.box, '#e2483d', [0, 1.6, -1.5], null, [10, 3.2, 3]);
      s.add(P.box, '#f4e8c8', [0, 1.1, 1.2], null, [9, 1.0, 1.4]);
      s.add(P.cyl, '#ffcf6a', [-3, 1.75, 1.2], null, [0.7, 0.08, 0.7]); s.add(P.cyl, '#e2483d', [-3, 1.8, 1.2], null, [0.5, 0.05, 0.5]);
      s.add(P.box, '#2a2a2a', [0, 1.9, 1.2], [0.3, 0, 0], [0.5, 0.06, 0.9]);   // a phone
      s.add(P.box, '#8a5a2a', [3, 1.95, 1.2], null, [0.7, 0.08, 0.7]); s.add(P.box, '#8a5a2a', [3, 2.4, 0.9], null, [0.7, 0.9, 0.08]);   // a chair
      s.add(P.box, '#ffe066', [0, 3.8, -0.1], null, [7, 1.0, 0.2], true);
    },
    lm_raidergarage(s) {
      s.add(P.box, '#7a6a5a', [0, 2.6, -2], null, [14, 5.2, 6]);
      s.add(P.box, '#2a2420', [0, 1.8, 1.02], null, [8, 3.6, 0.1]);
      for (let i = -6; i <= 6; i++) s.add(P.cone, '#b8b8b8', [i * 1.1, 5.6, 1.0], null, [0.18, 1.2, 0.18]);
      s.add(P.sphere, '#e8e0d0', [0, 4.6, 1.2], null, [0.6, 0.55, 0.3]);
      for (const sx of [-1, 1]) s.add(P.sphereLo, '#1a1a1a', [sx * 0.22, 4.7, 1.45], null, [0.14, 0.14, 0.06]);
      s.add(P.box, '#a03a1a', [-4, 0.8, 3], null, [3.6, 1.0, 1.8]); s.add(P.box, '#a03a1a', [-4, 1.6, 3.2], null, [2, 0.8, 1.4]);
      for (const x of [-5.3, -2.7]) for (const z of [2.2, 3.8]) s.add(P.cyl, '#1a1a1a', [x, 0.5, z], [0, 0, Math.PI / 2], [0.5, 0.4, 0.5]);
    },
    lm_unitycore(s) {
      s.add(P.cyl, '#d8e0e8', [0, 0.4, 0], null, [5.5, 0.8, 5.5]);
      s.add(P.cone, '#e8eef4', [0, 7, 0], null, [3.4, 12, 3.4]);
      for (let i = 0; i < 3; i++) s.add(P.torus, '#5fd6b0', [0, 3 + i * 3.4, 0], [Math.PI / 2, 0, 0], [3.2 - i * 0.8, 3.2 - i * 0.8, 0.5], true);
      s.add(P.sphere, '#5fd6b0', [0, 13.4, 0], null, [0.8, 0.8, 0.8], true);
    },
    lm_formsoffice(s) {
      s.add(P.box, '#e8ecf0', [0, 4.2, -0.5], null, [15, 8.4, 11]);
      s.add(P.box, '#e2483d', [0, 8.6, -0.5], null, [15.4, 0.4, 11.4]);
      for (let i = -3; i <= 3; i++) s.add(P.box, '#8ab8d8', [i * 2, 4, 5.02], null, [1.2, 5, 0.06]);
      s.add(P.box, '#3a4a6a', [0, 1.4, 5.04], null, [2.4, 2.8, 0.06]);
      s.add(P.box, '#f4f0e0', [0, 7.4, 5.05], null, [6, 0.9, 0.05]);
      for (let i = 0; i < 6; i++) s.add(P.box, '#f8f4e8', [5 + (i % 2) * 0.3, 0.3 + i * 0.25, 6.4], [0, i * 0.4, 0], [0.6, 0.22, 0.8]);   // a pile of forms
    },
    lm_geartemple(s) {
      s.add(P.box, '#8a7a5a', [0, 0.6, 0], null, [14, 1.2, 12]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.cyl, '#a8946a', [sx * 5, 4.5, sz * 4], null, [0.7, 7, 0.7]);
      s.add(P.box, '#9a8a6a', [0, 8.4, 0], null, [12, 0.8, 10]);
      const n = 14;
      s.add(P.cyl, '#ffd84d', [0, 6, -4.8], [Math.PI / 2, 0, 0], [3.4, 0.5, 3.4]);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s.add(P.box, '#ffd84d', [Math.cos(a) * 3.8, 6 + Math.sin(a) * 3.8, -4.8], [0, 0, a], [0.8, 0.9, 0.5]); }
      s.add(P.cyl, '#6a5a3a', [0, 6, -4.5], [Math.PI / 2, 0, 0], [1.0, 0.6, 1.0]);
    },
    lm_hamstertube(s) {
      const tube = (a, b) => C.capsuleAt(s, '#bfe8ff', 0.7, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), a, [Math.atan2(b[2] - a[2], b[1] - a[1]), 0, -Math.atan2(b[0] - a[0], Math.hypot(b[1] - a[1], b[2] - a[2]))], true);
      tube([-5, 0.7, 0], [-1, 3, 0]); tube([-1, 3, 0], [3, 3, 2]); tube([3, 3, 2], [5, 0.7, -2]); tube([-1, 3, 0], [0, 5.5, -2]);
      for (const p of [[-1, 3, 0], [3, 3, 2], [0, 5.5, -2]]) s.add(P.sphere, '#e8f6ff', p, null, [1.1, 1.1, 1.1], true);
      s.add(P.sphere, '#d8a870', [3, 3.1, 2], null, [0.45, 0.4, 0.55]);
    },
    lm_storyengine(s) {
      s.add(P.box, '#3a2a5a', [0, 2.4, 0], null, [3.4, 3.6, 10]);
      s.add(P.cyl, '#2a1e48', [0, 3.0, 2.5], [Math.PI / 2, 0, 0], [1.6, 6, 1.6]);
      s.add(P.cyl, '#ffd84d', [0, 3.0, 5.6], [Math.PI / 2, 0, 0], [1.2, 0.2, 1.2], true);
      s.add(P.cyl, '#1a1430', [0, 5.6, 4], null, [0.5, 2, 0.5]);
      s.add(P.box, '#4a3a6a', [0, 4.6, -3.2], null, [3.2, 2.4, 3.4]);
      for (const z of [-3.5, -0.5, 2.5]) for (const sx of [-1, 1]) s.add(P.cyl, '#1a1a1a', [sx * 1.8, 0.8, z], [0, 0, Math.PI / 2], [0.8, 0.3, 0.8]);
      for (const sx of [-1, 1]) s.add(P.box, '#8a8a92', [sx * 1.4, 0.08, 0], null, [0.2, 0.16, 18]);
      for (let i = 0; i < 4; i++) s.add(P.sphereLo, '#e8e0f0', [0.2, 7 + i * 1.1, 4 - i * 0.5], null, [0.7 + i * 0.3, 0.5 + i * 0.2, 0.7 + i * 0.3]);
    },
    lm_detoxpod(s) {
      s.add(P.cyl, '#7a828a', [0, 0.3, 0], null, [3.2, 0.6, 3.2]);
      for (const sx of [-1, 1]) { s.add(P.cyl, '#a8ff3a', [sx * 1.3, 2.6, 0], null, [0.9, 4, 0.9], true); s.add(P.sphere, '#c8d0d8', [sx * 1.3, 4.7, 0], null, [0.95, 0.4, 0.95]); }
      s.add(P.box, '#59606e', [0, 1.6, -1.6], null, [4, 2.4, 1]);
      for (let i = 0; i < 3; i++) s.add(P.sphereLo, ['#ff4d4d', '#ffd84d', '#39ff6a'][i], [-1 + i, 2.2, -1.08], null, [0.15, 0.15, 0.06], true);
      s.add(P.cylLo, '#3a3f4a', [0, 0.2, 2.6], [Math.PI / 2, 0, 0], [0.3, 3, 0.3]);
    },
    storybook(s) {
      s.add(P.box, '#7a3a2a', [0, 1.6, 0], [0, 0, 0.1], [2.4, 3.2, 0.4]);
      s.add(P.box, '#f4ecd8', [0.05, 1.6, 0], [0, 0, 0.1], [2.2, 3.0, 0.36]);
      s.add(P.box, '#ffd84d', [0, 2.2, 0.21], [0, 0, 0.1], [1.4, 0.3, 0.02], true);
    },
    traincar(s) {
      s.add(P.box, '#4a3a6a', [0, 2.4, 0], null, [3.0, 3.0, 16]);
      s.add(P.box, '#ffd84d', [0, 2.6, 0], null, [3.04, 0.2, 16.02]);
      for (let i = -3; i <= 3; i++) for (const sx of [-1, 1]) s.add(P.box, '#ffe9a0', [sx * 1.52, 3.0, i * 2.2], null, [0.04, 0.9, 1.4], true);
      s.add(P.box, '#2a1e3a', [0, 4.0, 0], null, [3.2, 0.3, 16.2]);
      for (const z of [-6, 6]) for (const sx of [-1, 1]) s.add(P.cyl, '#1a1a1a', [sx * 1.2, 0.7, z], [0, 0, Math.PI / 2], [0.6, 0.25, 0.6]);
      for (const sx of [-1, 1]) s.add(P.box, '#8a8a92', [sx * 1.4, 0.08, 0], null, [0.2, 0.16, 18]);
      for (let z = -8; z <= 8; z += 1.5) s.add(P.box, '#5a3a20', [0, 0.04, z], null, [3.6, 0.08, 0.5]);
    },
    toxicbarrel(s) {
      s.add(P.cyl, '#d8c030', [0, 0.7, 0], null, [0.55, 1.4, 0.55]);
      for (const y of [0.3, 1.1]) s.add(P.cyl, '#a89020', [0, y, 0], null, [0.57, 0.08, 0.57]);
      s.add(P.cyl, '#a8ff3a', [0, 1.41, 0], null, [0.45, 0.03, 0.45], true);
      s.add(P.box, '#1a1a1a', [0, 0.75, 0.56], null, [0.4, 0.35, 0.02]);
    },
    sludgepool(s) {
      s.add(P.cyl, '#7ae02a', [0, 0.05, 0], null, [3, 0.1, 3], true);
      for (let i = 0; i < 5; i++) s.add(P.sphereLo, '#a8ff3a', [Math.sin(i * 2.1) * 1.8, 0.15, Math.cos(i * 1.7) * 1.8], null, [0.3, 0.12, 0.3], true);
    },
    lm_marker(s) {
      const ring = new T.TorusGeometry(0.55, 0.05, 6, 32);
      s.add(ring, '#ffd84d', [0, 0.03, 0], [Math.PI / 2, 0, 0], null, true);
      ring.dispose();
    },
    // Ruben lies in a striped event tent; Anatomy Park's gate is a sign over his tummy.
    lm_anatomytent(s) {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        s.add(P.box, i % 2 ? '#e23b3b' : '#fbf6ea', [Math.sin(a) * 4.1, 1.4, Math.cos(a) * 4.1], [0, a, 0], [2.2, 2.8, 0.12]);
      }
      s.add(P.cone, '#e23b3b', [0, 4.0, 0], null, [5.0, 2.4, 5.0]);
      s.add(P.cyl, '#fbf6ea', [0, 2.82, 0], null, [4.25, 0.1, 4.25]);
      s.add(P.cyl, '#7a5a3a', [0, 5.3, 0], null, [0.08, 0.8, 0.08]);
      s.add(P.cone, '#ffd84d', [0, 5.9, 0], [0, 0, -Math.PI / 2], [0.3, 0.6, 0.06]);
      // The doorway, with a hospital bed and Ruben's big belly peeking out.
      s.add(P.box, '#2a1a14', [0, 1.2, 4.12], null, [1.8, 2.4, 0.14]);
      s.add(P.box, '#c9ccd4', [2.6, 0.55, 5.6], null, [1.3, 0.12, 2.4]);
      s.add(P.sphere, '#f0c8a0', [2.6, 0.95, 5.5], null, [0.75, 0.55, 1.0]);
      s.add(P.box, '#5ff8ff', [0, 2.75, 4.3], null, [2.6, 0.55, 0.08], true);
      s.add(P.box, '#e23b3b', [0, 2.75, 4.36], null, [2.2, 0.16, 0.04], true);
    },
    // A door drawn in chalk on a wall that opens for real (Froopyland's way in).
    lm_chalkdoor(s) {
      s.add(P.box, '#b8a68e', [0, 1.75, -0.2], null, [3.0, 3.5, 0.4]);
      s.add(P.box, '#a0907a', [0, 3.55, -0.2], null, [3.2, 0.14, 0.5]);
      const w = 0.07, c = '#c78bff';
      s.add(P.box, c, [-0.7, 1.2, 0.02], null, [w, 2.3, 0.02], true);
      s.add(P.box, c, [0.7, 1.2, 0.02], null, [w, 2.3, 0.02], true);
      s.add(P.box, c, [0, 2.35, 0.02], null, [1.47, w, 0.02], true);
      s.add(P.sphere, '#ffd84d', [0.48, 1.15, 0.04], null, [0.09, 0.09, 0.03], true);
      s.add(P.box, '#6a3aa8', [0, 1.2, 0.0], null, [1.33, 2.2, 0.01], true);
      for (let i = 0; i < 5; i++) s.add(P.sphere, ['#ff8fc8', '#ffe066', '#8fe0ff', '#b7ff8f', '#d7a8ff'][i], [-1.1 + i * 0.55, 3.1, 0.03], null, [0.1, 0.1, 0.02], true);
    },
    // A small green portal on a stand: the way back out of a pocket world.
    lm_exitportal(s) {
      s.add(P.cyl, '#3a3f4a', [0, 0.12, 0], null, [1.4, 0.24, 1.4]);
      const ring = new T.TorusGeometry(1.15, 0.16, 12, 40);
      s.add(ring, '#59606e', [0, 1.45, 0]);
      ring.dispose();
      s.add(P.sphere, '#39ff6a', [0, 1.45, 0], null, [1.0, 1.0, 0.05], true);
      s.add(P.sphere, '#b8ffcc', [0, 1.45, 0.03], null, [0.45, 0.45, 0.03], true);
    },
    lm_fakedoors(s) {
      MODELS.storefront(s);
      for (let i = 0; i < 4; i++) {
        const x = -3.6 + i * 1.6;
        s.add(P.box, '#fbf6ea', [x, 1.4, 3.75], null, [1.1, 2.2, 0.1]);
        s.add(P.box, ['#7a3326', '#3a5a7a', '#5a7a3a', '#7a5a2a'][i], [x, 1.35, 3.82], null, [0.85, 2.0, 0.06]);
      }
    },
    lm_antsjohnson(s) {
      MODELS.storefront(s);
      for (let x = -3.4; x < 1; x += 1.0) for (let y = 1.0; y < 3.2; y += 0.8) {
        s.add(P.box, '#2a2a30', [x, y, 3.7], null, [0.85, 0.65, 0.3]);
        s.add(P.box, '#5ff8ff', [x - 0.08, y, 3.86], null, [0.55, 0.45, 0.02], true);
      }
      s.add(P.box, '#d8dde2', [3.0, 0.6, 4.3], null, [0.9, 0.6, 0.6]);   // a microwave on the step
      s.add(P.cone, '#ff9b4d', [3.0, 1.2, 4.3], null, [0.3, 0.6, 0.3], true);   // ...on fire
    },

    // ----- Hamster-in-Butt World -----
    // A person sitting cross-legged, who is also a house: a door at the back, a window in the
    // tummy, and a chimney hat. Hamsters live inside. Nobody minds.
    humanhouse(s) {
      const skin = '#f0c8a0', shirt = '#5a8ad8', pants = '#4a5a6a';
      for (const sx of [-1, 1]) {
        s.add(P.capsule, pants, [sx * 0.9, 0.7, 1.0], [Math.PI / 2, 0, -sx * 0.6], [0.6, 1.0, 0.6]);
        s.add(P.sphere, '#3a2a1a', [sx * 0.3, 0.6, 2.3], null, [0.5, 0.45, 0.6]);
        s.add(P.capsule, shirt, [sx * 1.7, 2.6, 0.5], [0.6, 0, sx * 0.3], [0.45, 0.9, 0.45]);
        s.add(P.sphere, skin, [sx * 1.4, 1.6, 1.4], null, [0.45, 0.4, 0.45]);
      }
      s.add(P.sphere, pants, [0, 1.0, 0], null, [1.9, 1.0, 1.7]);
      s.add(P.sphere, shirt, [0, 2.8, 0], null, [1.7, 1.9, 1.5]);
      s.add(P.sphere, skin, [0, 5.2, 0.1], null, [1.1, 1.2, 1.1]);
      for (const sx of [-1, 1]) { s.add(P.sphere, '#fff', [sx * 0.4, 5.4, 1.0], null, [0.25, 0.3, 0.15]); s.add(P.sphereLo, '#2a2a2a', [sx * 0.4, 5.4, 1.12], null, [0.1, 0.13, 0.06]); }
      s.add(P.box, '#7a3a2a', [0, 4.8, 1.1], null, [0.5, 0.08, 0.05]);
      s.add(P.cyl, '#3a2a1a', [0, 6.5, 0.1], null, [0.8, 0.5, 0.8]);    // hat with a chimney
      s.add(P.cyl, '#6a4a3a', [0.4, 7.1, 0.1], null, [0.18, 0.7, 0.18]);
      s.add(P.cyl, '#ffd890', [0, 2.8, 1.48], [Math.PI / 2, 0, 0], [0.45, 0.05, 0.45], true);   // round window
      s.add(P.torus, '#6b4a2b', [0, 2.8, 1.5], null, [0.47, 0.47, 0.4]);
      s.add(P.box, '#6b4a2b', [0, 0.7, -1.62], null, [0.7, 1.2, 0.1]);   // the back door
      s.add(P.box, '#d8c098', [0, 0.06, -2.3], null, [0.8, 0.12, 1.2]);
    },
    hamsterwheel(s) {
      s.add(P.torus, '#e2483d', [0, 1.4, 0], null, [1.1, 1.1, 1.2]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.cylLo, '#fbfaf6', [Math.cos(a) * 1.1, 1.4 + Math.sin(a) * 1.1, 0], [Math.PI / 2, 0, 0], [0.04, 0.6, 0.04]); }
      s.add(P.cyl, '#9aa3ab', [0, 1.4, 0], [Math.PI / 2, 0, 0], [0.12, 0.4, 0.12]);
      for (const sz of [-1, 1]) s.add(P.box, '#59606e', [0, 0.7, sz * 0.3], [sz * 0.3, 0, 0], [0.15, 1.5, 0.1]);
    },
    seedpile(s) {
      s.add(P.hemi, '#d8b070', [0, 0, 0], null, [0.8, 0.5, 0.8]);
      for (let i = 0; i < 8; i++) { const a = i * 0.8; s.add(P.sphereLo, i % 2 ? '#8a6a3a' : '#f4e0b0', [Math.cos(a) * 0.4, 0.35 + (i % 3) * 0.05, Math.sin(a) * 0.4], [0, a, 0.5], [0.08, 0.05, 0.12]); }
    },

    // ----- Plumbubo Prime 51b -----
    factory(s) {
      const W = 12, D = 10, H = 6;
      s.add(P.box, '#b8a8c8', [0, H / 2, 0], null, [W, H, D]);
      for (let i = 0; i < 4; i++) s.add(P.prism, '#8a7a9a', [-W / 2 + 1.5 + i * 3, H, 0], [0, Math.PI / 2, 0], [D, 1.6, 3]);   // sawtooth roof
      for (const x of [-3, 3]) { s.add(P.cyl, '#7d6a8a', [x, H + 2.5, -3], null, [0.6, 5, 0.6]); s.add(P.sphere, '#f4c0d8', [x, H + 5.6, -3], null, [1.0, 0.7, 1.0]); }
      s.add(P.box, '#59606e', [0, 2.0, D / 2 + 0.04], null, [4.2, 4.0, 0.08]);
      for (let i = 1; i < 5; i++) s.add(P.box, '#7d858e', [0, i * 0.8, D / 2 + 0.09], null, [4.2, 0.06, 0.03]);
      for (const x of [-4.4, 4.4]) s.add(P.box, '#ffd0e8', [x, 3.8, D / 2 + 0.05], null, [1.8, 1.2, 0.05], true);
    },
    // A plumbus production line: a belt on rollers with plumbuses riding along.
    conveyor(s) {
      s.add(P.box, '#59606e', [0, 0.9, 0], null, [5.2, 0.15, 1.2]);
      s.add(P.box, '#2a2a30', [0, 1.0, 0], null, [5.0, 0.06, 1.0]);
      for (const x of [-2.4, -0.8, 0.8, 2.4]) for (const sz of [-1, 1]) s.add(P.box, '#7d858e', [x, 0.45, sz * 0.5], null, [0.12, 0.9, 0.12]);
      for (const x of [-1.8, 0, 1.8]) {
        s.add(P.capsule, '#f4a0b8', [x, 1.25, 0], [0, 0, Math.PI / 2], [0.12, 0.25, 0.12]);
        s.add(P.sphere, '#e87fa0', [x + 0.2, 1.3, 0], null, [0.22, 0.17, 0.18]);
      }
    },
    fleebvat(s) {
      s.add(P.cyl, '#8f97a0', [0, 1.3, 0], null, [1.4, 2.6, 1.4]);
      s.add(P.cyl, '#7affea', [0, 2.62, 0], null, [1.25, 0.05, 1.25], true);
      for (let i = 0; i < 4; i++) s.add(P.sphereLo, '#c8fff4', [Math.cos(i * 1.7) * 0.6, 2.7, Math.sin(i * 1.7) * 0.6], null, [0.18, 0.12, 0.18], true);
      for (let y = 0.5; y < 2.6; y += 0.7) s.add(P.torus, '#59606e', [0, y, 0], [Math.PI / 2, 0, 0], [1.42, 1.42, 0.25]);
      s.add(P.cyl, '#59606e', [1.5, 0.6, 0], [0, 0, Math.PI / 2], [0.15, 0.6, 0.15]);
    },
    plumbuspile(s) {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3, x = Math.cos(a) * 0.5, z = Math.sin(a) * 0.5, y = 0.3 + (i === 4 ? 0.5 : 0);
        s.add(P.capsule, '#f4a0b8', [x, y, z], [0, a, Math.PI / 2], [0.12, 0.3, 0.12]);
        s.add(P.sphere, '#e87fa0', [x + 0.25, y + 0.05, z], null, [0.24, 0.19, 0.2]);
        s.add(P.sphere, '#d9b0ff', [x + 0.25, y + 0.25, z], null, [0.11, 0.12, 0.11]);
      }
    },
    lm_plumbusline(s) {
      MODELS.factory(s);
      // A giant plumbus on the roof, so nobody can miss it.
      s.add(P.capsule, '#f4a0b8', [0, 8.6, 2.0], [0, 0, 0.2], [0.6, 1.8, 0.6]);
      s.add(P.sphere, '#e87fa0', [0.4, 9.2, 2.0], null, [1.1, 0.85, 0.9]);
      s.add(P.sphere, '#d9b0ff', [-0.3, 10.5, 2.0], null, [0.55, 0.6, 0.55]);
    },
  };

  // Each prop has a smooth, high-polygon model for up close and a plain one for far away.
  const modelCache = {};
  C.propModel = propModel;
  function propModel(type, far) {
    const key = far ? type + ':far' : type;
    if (modelCache[key]) return modelCache[key];
    // Far: coarse primitives (seen small, through fog). Near: smooth, with high-detail
    // primitives only for landmarks; everyday props (trees, cars, houses) use medium ones.
    const mid = !far && !type.startsWith('lm_');
    C.shapeMid = mid;
    let s;
    try { s = new C.Shape({ smooth: !far, lo: far }); } finally { C.shapeMid = false; }
    MODELS[type](s);
    return (modelCache[key] = s.build());
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

  // ---------- Space ----------
  // Black sky full of stars, the sun, and the planets of this universe as real globes: their
  // own ground colours (Earth gets oceans), a glowing rim of their sky, and their name.
  function makeSpace(dim, group) {
    const all = new T.Group();
    const sky = new T.Group();   // follows the camera
    const st = (n, color, size) => {
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(a) * s * 1300; pos[i * 3 + 1] = u * 1300; pos[i * 3 + 2] = Math.sin(a) * s * 1300;
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      return new T.Points(g, new T.PointsMaterial({ color, size, sizeAttenuation: false, fog: false, map: C.dotTexture, transparent: true, depthWrite: false }));
    };
    sky.add(st(1400, '#ffffff', 2), st(300, '#bcd4ff', 3), st(120, '#ffe0b0', 3.5));
    const sun = new T.Mesh(new T.SphereGeometry(70, 24, 16), new T.MeshBasicMaterial({ color: '#fff4d0', fog: false }));
    sun.position.set(-900, 500, -700); sky.add(sun);
    const glow = new T.Mesh(new T.SphereGeometry(120, 24, 16), new T.MeshBasicMaterial({ color: '#ffd890', transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
    glow.position.copy(sun.position); sky.add(glow);
    all.add(sky);
    for (const P of dim.planets) {
      const D = MM.DIM_BY_ID[P.dim];
      const g = new T.SphereGeometry(P.r, 64, 40), pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
      const c = D.ground.map(x => new T.Color(x)), sea = new T.Color('#2f6fd6'), ice = new T.Color('#f4f8ff'), tmp = new T.Color();
      const earth = P.dim === 'suburbia' || D.variantOf === 'suburbia';
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / P.r, y = pos.getY(i) / P.r, z = pos.getZ(i) / P.r;
        const n = MM.fbm(x * 2.2 + 7, z * 2.2 + y * 1.7, D.seed || 1, 4);
        tmp.copy(c[0]).lerp(c[1], Math.min(1, Math.max(0, (n - 0.4) * 3)));
        if (n < 0.42) tmp.lerp(c[2], Math.min(1, (0.42 - n) * 6));
        if (earth && n < 0.47) tmp.copy(sea).multiplyScalar(0.8 + n * 0.4);
        if (earth && Math.abs(y) > 0.86) tmp.copy(ice);
        if (P.dim === 'moon') tmp.multiplyScalar(0.8 + MM.fbm(x * 9, z * 9 + y * 5, 3, 2) * 0.5);
        cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
      }
      g.setAttribute('color', new T.BufferAttribute(cols, 3));
      const m = new T.Mesh(g, terrainMat);
      m.position.set(P.x, P.y, P.z);
      all.add(m);
      // Its atmosphere: a soft rim in the colour of its sky.
      if (P.dim !== 'moon') {
        const a = new T.Mesh(new T.SphereGeometry(P.r * 1.07, 48, 32), new T.MeshBasicMaterial({ color: D.sky[1], transparent: true, opacity: 0.22, side: T.BackSide, depthWrite: false, fog: false }));
        a.position.copy(m.position); all.add(a);
      }
      const tag = C.makeTag(D.name, '', '', '#ffd84d');
      tag.draw(-1);
      tag.sprite.scale.set(110, 27, 1);
      tag.sprite.position.set(P.x, P.y + P.r + 30, P.z);
      tag.sprite.material.fog = false;
      all.add(tag.sprite);
    }
    group.userData.spaceSky = sky;
    return all;
  }

  // Big things in the sky that make each dimension recognisable.
  function skyDecor(dim, group) {
    const add = (shape, pos) => { const m = C.meshOf(shape.build(), 0); m.position.set(pos[0], pos[1], pos[2]); m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } }); group.add(m); return m; };
    if ((dim.shapeOf || dim.id) === 'suburbia') {
      for (let i = 0; i < 14; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#ffffff', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 14 * Math.PI * 2, d = 300 + (i % 3) * 60;
        add(s, [Math.cos(a) * d, 110 + (i % 4) * 25, Math.sin(a) * d]);
      }
    } else if ((dim.shapeOf || dim.id) === 'meatlands') {
      const s = new C.Shape();
      s.add(P.sphere, '#fff2e0', [0, 0, 0], null, [60, 60, 60], true);
      s.add(P.sphere, '#e0b020', [0, 0, 44], null, [30, 30, 20], true);
      s.add(P.sphere, '#120808', [0, 0, 56], null, [14, 14, 10], true);
      const eye = add(s, [-150, 190, -360]);
      eye.lookAt(0, 0, 0);
      group.userData.eye = eye;
      group.add(stars(300, 560, '#ffb0c0', 2));
    } else if ((dim.shapeOf || dim.id) === 'bazaar') {
      const s1 = new C.Shape(); s1.add(P.sphere, '#ffd36b', [0, 0, 0], null, [55, 55, 55], true);
      add(s1, [-250, 210, -330]);
      const s2 = new C.Shape(); s2.add(P.sphere, '#7affea', [0, 0, 0], null, [30, 30, 30], true);
      add(s2, [180, 260, -380]);
      const ring = new T.Mesh(new T.TorusGeometry(80, 3, 6, 60), new T.MeshBasicMaterial({ color: '#ffb0f0', fog: false }));
      ring.position.set(-250, 210, -330); ring.rotation.set(1.2, 0.3, 0);
      group.add(ring);
      group.add(stars(900, 560, '#ffffff', 2));
    } else if ((dim.shapeOf || dim.id) === 'beyond') {
      // Far off: the wall of the Central Finite Curve, a golden helix of universes; everywhere
      // else, countless loose universes glowing in the dark.
      const h = new C.Shape();
      for (let i = 0; i < 160; i++) {
        const t = i / 160, a = t * Math.PI * 10;
        h.add(P.sphereLo, i % 3 ? '#ffd84d' : '#fff2c0', [Math.cos(a) * 60 + (t - 0.5) * 520, Math.sin(a) * 60, 0], null, [5, 5, 5], true);
      }
      const helix = add(h, [0, 150, 380]);
      helix.rotation.z = 0.25;
      group.add(stars(1600, 560, '#ffe6a0', 2.5));
      group.add(stars(600, 560, '#c9a8ff', 2));
    } else if ((dim.shapeOf || dim.id) === 'citadel') {
      // The rest of the Citadel floating around you, and a planet.
      for (let i = 0; i < 7; i++) {
        const s = new C.Shape();
        s.add(P.cone, '#7d8796', [0, -30, 0], [Math.PI, 0, 0], [26, 50, 26], true);
        s.add(P.cyl, '#9aa6b8', [0, 0, 0], null, [26, 3, 26], true);
        for (let j = 0; j < 6; j++) s.add(P.cone, '#c8d2e0', [Math.cos(j) * 14, 14, Math.sin(j) * 14], null, [2.5, 26 + (j % 3) * 8, 2.5], true);
        s.add(P.torus, '#5ff8ff', [0, 2, 0], [Math.PI / 2, 0, 0], [27, 27, 1], true);
        const a = i / 7 * Math.PI * 2, d = 330 + (i % 2) * 90;
        add(s, [Math.cos(a) * d, 40 + (i % 3) * 60, Math.sin(a) * d]);
      }
      const pl = new C.Shape(); pl.add(P.sphere, '#5a3aa8', [0, 0, 0], null, [90, 90, 90], true); pl.add(P.torus, '#b48aff', [0, 0, 0], [1.2, 0.2, 0], [130, 130, 0.5], true);
      add(pl, [-280, 260, -380]);
      group.add(stars(2000, 560, '#ffffff', 2));
    } else if ((dim.shapeOf || dim.id) === 'dogworld') {
      for (let i = 0; i < 12; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#ffffff', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 12 * Math.PI * 2, d = 300 + (i % 3) * 60;
        add(s, [Math.cos(a) * d, 110 + (i % 4) * 25, Math.sin(a) * d]);
      }
      // A giant bone-shaped moon. Of course.
      const b = new C.Shape(); b.add(P.capsule, '#fff4dc', [0, 0, 0], [0, 0, Math.PI / 2], [12, 60, 12], true);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.add(P.sphere, '#fff4dc', [sx * 38, sy * 10, 0], null, [16, 16, 16], true);
      add(b, [220, 230, -360]).rotation.z = 0.3;
    } else if ((dim.shapeOf || dim.id) === 'megaseed') {
      for (let i = 0; i < 10; i++) {
        const s = new C.Shape();
        s.add(P.cyl, '#5a3a6a', [0, 0, 0], null, [8, 160, 8], true);
        s.add(P.sphere, '#2fa07a', [0, 80, 0], null, [50, 28, 50], true);
        const a = i / 10 * Math.PI * 2, d = 300 + (i % 3) * 50;
        add(s, [Math.cos(a) * d, 30, Math.sin(a) * d]);
      }
      const sun2 = new C.Shape(); sun2.add(P.sphere, '#ffe066', [0, 0, 0], null, [40, 40, 40], true);
      add(sun2, [150, 200, -400]);
    } else if ((dim.shapeOf || dim.id) === 'featherhold') {
      for (let i = 0; i < 9; i++) {
        const s = new C.Shape();
        s.add(P.cone, '#b98c4e', [0, -14, 0], [Math.PI, 0, 0], [14, 26, 14], true);
        s.add(P.cyl, '#8fae4a', [0, 0, 0], null, [14, 2, 14], true);
        s.add(P.sphereLo, '#3f9a3a', [4, 4, 2], null, [5, 4, 5], true);
        const a = i / 9 * Math.PI * 2, d = 280 + (i % 3) * 70;
        add(s, [Math.cos(a) * d, 90 + (i % 4) * 30, Math.sin(a) * d]);
      }
      for (let i = 0; i < 10; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#fff6e0', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 10 * Math.PI * 2 + 0.3;
        add(s, [Math.cos(a) * 340, 150 + (i % 3) * 20, Math.sin(a) * 340]);
      }
    } else if ((dim.shapeOf || dim.id) === 'moon') {
      const s = new C.Shape();
      s.add(P.sphere, '#2f6fd8', [0, 0, 0], null, [80, 80, 80], true);
      for (let i = 0; i < 9; i++) s.add(P.sphereLo, '#3fae4a', [Math.sin(i * 2.3) * 55, Math.cos(i * 1.7) * 50, 45], null, [26, 18, 14], true);
      s.add(P.sphere, '#ffffff', [0, 74, 10], null, [40, 10, 40], true);
      add(s, [260, 180, -380]);
      group.add(stars(2500, 560, '#ffffff', 2));
    }
  }

  // ---------- Terrain ----------
  // A hand-painted grain laid over the ground colours: short brush strokes and specks,
  // almost white so it only shades the colour a little, tiled every few metres.
  const grain = (function () {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), r = MM.rng(4242);
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) {
      const x = r() * N, y = r() * N, l = 3 + r() * 7, a = -1.2 - r() * 0.7, v = 190 + Math.floor(r() * 45);
      g.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.lineWidth = 1 + r() * 1.4; g.lineCap = 'round';
      for (const dx of [0, -N, N]) for (const dy of [0, -N, N]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke(); }
    }
    for (let i = 0; i < 500; i++) { const v = 255 - Math.floor(r() * 25); g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(r() * N, r() * N, 2, 2); }
    const t = new T.CanvasTexture(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  })();
  const terrainMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: C.gradientMap, map: grain });
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // The ground's colour at a point: the world's palette in noisy patches, painted floors and
  // tiles where a world has them, paving around landmarks. In a composite world each town
  // keeps its own ground (Area 51's desert), fading into the countryside at its edge.
  function groundColor(dim, x, z, y, tmp, P) {
    let pal = P.base;
    const n = MM.fbm(x * 0.05, z * 0.05, dim.seed + 99, 3);
    const paint = (c0, c1, c2, out) => { out.copy(c0).lerp(c1, Math.min(1, Math.max(0, (n - 0.35) * 3))); if (n < 0.38) out.lerp(c2, Math.min(1, (0.38 - n) * 6)); return out; };
    paint(pal[0], pal[1], pal[2], tmp);
    if (dim.regions) {
      const at = MM.regionAt(dim.id, x, z);
      if (at.R) {
        const k = 1 - smooth(150, 196, Math.max(Math.abs(at.lx), Math.abs(at.lz)));
        const rp = P.regions[at.R.dim];
        if (k > 0) tmp.lerp(paint(rp[0], rp[1], rp[2], P.t2), k);
      }
    }
    if (dim.regions && z > MM.BEACH_Z - 40) {
      // The beach: sand down to the water, darker sand under it.
      const k = Math.min(1, Math.max(0, (z - (MM.BEACH_Z - 40)) / 40));
      tmp.lerp(P.sand || (P.sand = new T.Color('#e8d9a6')), k);
      if (y < MM.SEA_LEVEL) tmp.lerp(P.seabed || (P.seabed = new T.Color('#9a8e6a')), Math.min(1, (MM.SEA_LEVEL - y) / 4));
    }
    if ((dim.shapeOf || dim.id) === 'meatlands') {
      const v = Math.abs(Math.sin(x * 0.11 + Math.sin(z * 0.07) * 3) * Math.cos(z * 0.09 + Math.sin(x * 0.05) * 2));
      if (v < 0.05) tmp.set('#7c1e34');
    }
    if (dim.tiles) {
      const gx = Math.abs(((x % 12) + 12) % 12 - 6), gz = Math.abs(((z % 12) + 12) % 12 - 6);
      if (gx > 5.8 || gz > 5.8) tmp.set('#5ff8ff');
    }
    if ((dim.shapeOf || dim.id) === 'bazaar') {
      const gx = Math.abs(((x % 8) + 8) % 8 - 4), gz = Math.abs(((z % 8) + 8) % 8 - 4);
      if ((gx > 3.85 || gz > 3.85) && Math.hypot(x, z) < 60) tmp.set('#5ff8ff');
    }
    if ((dim.shapeOf || dim.id) === 'moon') { const d = y / 10; tmp.multiplyScalar(1 + Math.max(-0.35, Math.min(0.15, d * 0.3))); }
    if ((dim.shapeOf || dim.id) === 'featherhold') { const sl = Math.abs(MM.heightAt(dim.id, x + 1.5, z) - y) + Math.abs(MM.heightAt(dim.id, x, z + 1.5) - y); if (sl > 1.4) tmp.set(sl > 2.4 ? '#a27a42' : '#b98c4e'); else if (y > 6) tmp.lerp(new T.Color('#8fae4a'), 0.6); }
    for (const l of P.lms) { if (Math.abs(x - l.x) > l.r + 3.5 || Math.abs(z - l.z) > l.r + 3.5) continue; const d = Math.hypot(x - l.x, z - l.z); if (d < l.r + 3.5) tmp.copy(P.side).lerp(P.base[1], 0.35); }
    return tmp;
  }
  function terrainPalette(dim) {
    const pal = g => g.map(c => new T.Color(c));
    const regions = {};
    for (const R of dim.regions || []) regions[R.dim] = pal(MM.DIM_BY_ID[R.dim].ground);
    return { base: pal(dim.ground), regions, side: new T.Color('#c9c4b6'), t2: new T.Color(), lms: MM.LANDMARKS.filter(l => l.dim === dim.id) };
  }
  // One square of ground, centred on (cx, cz).
  function terrainPiece(dim, P, cx, cz, size, seg, exactNormals) {
    const g = new T.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3), tmp = new T.Color();
    // Heights on the grid plus a one-cell border, so normals can come from neighbours
    // (pieces then shade the same on both sides of a seam).
    const N = seg + 3, step = size / seg, x0 = cx - size / 2 - step, z0 = cz - size / 2 - step, Hs = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) Hs[j * N + i] = MM.heightAt(dim.id, x0 + i * step, z0 + j * step);
    const hAt = (x, z) => Hs[Math.round((z - z0) / step) * N + Math.round((x - x0) / step)];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = hAt(x, z);
      pos.setY(i, y);
      groundColor(dim, x, z, y, tmp, P);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    if (exactNormals) {
      // Normals from the height field itself, so neighbouring pieces shade without seams.
      const nor = g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), hx = hAt(x + step, z) - hAt(x - step, z), hz = hAt(x, z + step) - hAt(x, z - step), l = Math.hypot(hx, 2 * step, hz);
        nor.setXYZ(i, -hx / l, 2 * step / l, -hz / l);
      }
      nor.needsUpdate = true;
    } else g.computeVertexNormals();
    // Tile the grain about every 5 m (in world space, so pieces line up).
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 5, -pos.getZ(i) / 5);
    return new T.Mesh(g, terrainMat);
  }
  function makeTerrain(dim) {
    const B = MM.boundOf(dim.id), P = terrainPalette(dim);
    if (B <= 260) return terrainPiece(dim, P, 0, 0, MM.WORLD_HALF * 2 + 120, 170, false);
    // A big world (one Earth is 1.2 km across): ground in 160 m pieces, built around you as
    // you go and dropped when far behind, so a phone never holds the whole planet.
    const TILE = 160, SEG = 64, group = new T.Group(), tiles = new Map();
    const lim = Math.ceil((B + 60) / TILE);
    let checkT = 0;
    group.userData.update = (dt, cam, force) => {
      if (!force && (checkT -= dt) > 0) return;
      checkT = 0.4;
      const reach = force ? (dim.fogFar || 230) : (dim.fogFar || 230) + TILE, ci = Math.round(cam.x / TILE), cj = Math.round(cam.z / TILE);
      let built = 0;
      const want = [];
      for (let i = -lim; i <= lim; i++) for (let j = -lim; j <= lim; j++) {
        const cx = i * TILE, cz = j * TILE, d = Math.max(Math.abs(cx - cam.x), Math.abs(cz - cam.z)) - TILE / 2;
        const k = i + ',' + j;
        if (d < reach) { if (!tiles.has(k)) want.push([Math.abs(i - ci) + Math.abs(j - cj), k, cx, cz]); }
        else if (d > reach + TILE * 1.5 && tiles.has(k)) { const m = tiles.get(k); group.remove(m); m.geometry.dispose(); tiles.delete(k); }
      }
      want.sort((a, b) => a[0] - b[0]);
      for (const [, k, cx, cz] of want) {
        if (!force && built >= 1) break;
        const m = terrainPiece(dim, P, cx, cz, TILE, SEG, true);
        tiles.set(k, m); group.add(m); built++;
      }
    };
    group.userData.dispose = () => { for (const m of tiles.values()) m.geometry.dispose(); tiles.clear(); };
    return group;
  }

  // ---------- Streets (Earth C-137) ----------
  // Asphalt roads on a 44 m grid, sidewalks with curbs between the intersections, corner
  // squares, and a driveway plus a front path for every house.
  function makeStreets(dim, props) {
    const S = dim.streets, G = S.grid, E = S.extent, s = new C.Shape({ smooth: false });   // flat slabs: no rounded edges needed
    const ROAD = '#5d6168', WALK = '#d8d3c7', CURB = '#bcb6a9', DRIVE = '#c8c2b5';
    for (let k = -3; k <= 3; k++) {
      const c = k * G;
      s.add(P.box, ROAD, [c, 0.03, 0], null, [7, 0.06, 2 * E]);
      s.add(P.box, ROAD, [0, 0.031, c], null, [2 * E, 0.06, 7]);
      for (let m = -4; m <= 3; m++) {
        const a = Math.max(-E, m * G + 5.5), b = Math.min(E, (m + 1) * G - 5.5);
        if (b <= a) continue;
        const mid = (a + b) / 2, len = b - a;
        for (const sd of [-1, 1]) {
          s.add(P.box, WALK, [c + sd * 4.6, 0.07, mid], null, [1.8, 0.1, len]);
          s.add(P.box, CURB, [c + sd * 3.62, 0.09, mid], null, [0.25, 0.14, len]);
          s.add(P.box, WALK, [mid, 0.071, c + sd * 4.6], null, [len, 0.1, 1.8]);
          s.add(P.box, CURB, [mid, 0.091, c + sd * 3.62], null, [len, 0.14, 0.25]);
        }
      }
      for (let m = -3; m <= 3; m++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, WALK, [c + sx * 4.6, 0.072, m * G + sz * 4.6], null, [1.8, 0.1, 1.8]);
    }
    for (const p of props) {
      if (p.type !== 'house' && p.type !== 'house2' && p.type !== 'lm_home' && p.type !== 'lm_garage') continue;
      const f = Math.sin(p.rot) > 0 ? 1 : -1;
      const front = p.x + f * (p.type === 'house2' ? 4.5 : 4.3);
      const curb = Math.round((p.x + f * 14) / G) * G - f * 3.6;
      const dz = p.type === 'house2' ? p.z + f * 6.6 : p.type === 'lm_garage' ? p.z + f * 0.6 : p.z + f * 4.4;
      const x0 = Math.min(front, curb), x1 = Math.max(front, curb);
      if (p.type !== 'lm_home') s.add(P.box, DRIVE, [(x0 + x1) / 2, 0.085, dz], null, [x1 - x0, 0.1, p.type === 'lm_garage' ? 6 : 3.2]);
      if (p.type !== 'lm_garage') s.add(P.box, WALK, [(x0 + x1) / 2, 0.08, p.z], null, [x1 - x0, 0.1, 1.3]);
    }
    return C.meshOf(s.build(), 0);
  }

  // ---------- Roads and plazas of the planned towns (shared/layouts.js) ----------
  const PATH_STYLES = {
    asphalt: { road: '#5d6168', walk: '#d8d3c7', curb: '#bcb6a9' },
    flesh: { road: '#8a2a40', edge: '#5e1528' },
    neon: { road: '#241838', edge: '#5ff8ff', glow: true },
    white: { road: '#e6eaf0', edge: '#5fd6b0', glow: true },
    metal: { road: '#7d858e', edge: '#ffd84d' },
    regolith: { road: '#8a8a98', edge: '#6e6e7c' },
    planks: { road: '#a8794a', edge: '#6b4a2b' },
    dirt: { road: '#9a7a52', edge: '#86683f' },
    sand: { road: '#d8bf88', edge: '#bfa46c' },
    candy: { road: '#ffd0ec', edge: '#ffffff' },
    vein: { road: '#a8304a', edge: '#5a6ad8' },
    stone: { road: '#b8b2a6', edge: '#8e887c' },
    party: { road: '#4a2a7a', edge: '#ffd84d', glow: true },
    carpet: { road: '#3a1a5a', edge: '#ff6fd0', glow: true },
    gold: { road: '#3a2e18', edge: '#ffd84d', glow: true },
    gravel: { road: '#ddd5c0', edge: '#bdb5a0' },
  };
  function makePaths(dim, layout) {
    const s = new C.Shape({ smooth: false });
    const H = (x, z) => MM.heightAt(dim.id, x, z);
    for (const rd of layout.roads) {
      const st = PATH_STYLES[rd.style] || PATH_STYLES.stone;
      const dx = rd.x2 - rd.x1, dz = rd.z2 - rd.z1, len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const n = Math.max(1, Math.ceil(len / 6)), yaw = Math.atan2(dx, dz), ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
        const mx = rd.x1 + dx * tm, mz = rd.z1 + dz * tm, pl = len / n + 0.4;
        // Sit on the highest of the ends and the middle so the ground never pokes through.
        const y = Math.max(H(rd.x1 + dx * t0, rd.z1 + dz * t0), H(mx, mz), H(rd.x1 + dx * t1, rd.z1 + dz * t1)) + 0.04;
        s.add(P.box, st.road, [mx, y, mz], [0, yaw, 0], [rd.w, 0.08, pl]);
        if (st.edge) for (const sd of [-1, 1]) s.add(P.box, st.edge, [mx + nx * sd * (rd.w / 2 - 0.2), y + 0.015, mz + nz * sd * (rd.w / 2 - 0.2)], [0, yaw, 0], [0.3, 0.08, pl], st.glow);
        if (st.walk) for (const sd of [-1, 1]) {
          s.add(P.box, st.curb, [mx + nx * sd * (rd.w / 2 + 0.12), y + 0.04, mz + nz * sd * (rd.w / 2 + 0.12)], [0, yaw, 0], [0.25, 0.14, pl]);
          s.add(P.box, st.walk, [mx + nx * sd * (rd.w / 2 + 1.15), y + 0.03, mz + nz * sd * (rd.w / 2 + 1.15)], [0, yaw, 0], [1.8, 0.1, pl]);
        }
      }
    }
    for (const pz of layout.plazas) {
      const st = PATH_STYLES[pz.style] || PATH_STYLES.stone;
      const y = Math.max(H(pz.x, pz.z), H(pz.x + pz.r * 0.7, pz.z), H(pz.x - pz.r * 0.7, pz.z), H(pz.x, pz.z + pz.r * 0.7), H(pz.x, pz.z - pz.r * 0.7)) + 0.06;
      const disc = new T.CylinderGeometry(1, 1, 1, 48);
      s.add(disc, st.edge || st.curb || st.road, [pz.x, y, pz.z], null, [pz.r + 0.6, 0.12, pz.r + 0.6], st.glow);
      s.add(disc, st.road, [pz.x, y + 0.02, pz.z], null, [pz.r, 0.12, pz.r]);
      // A ring of paving inside the square.
      s.add(disc, st.walk || st.edge || st.road, [pz.x, y + 0.03, pz.z], null, [pz.r * 0.55, 0.12, pz.r * 0.55]);
      s.add(disc, st.road, [pz.x, y + 0.04, pz.z], null, [pz.r * 0.5, 0.12, pz.r * 0.5]);
      disc.dispose();
    }
    return C.meshOf(s.build(), 0);
  }

  // A painted sign: dark letters on a cream board with a dark frame (canvas, never HTML).
  function makeSign(text, w) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160;
    const g = cv.getContext('2d');
    g.fillStyle = '#2a2622'; g.fillRect(0, 0, 1024, 160);
    g.fillStyle = '#f4efe2'; g.fillRect(10, 10, 1004, 140);
    g.fillStyle = '#2a2622'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 96;
    do { g.font = '700 ' + size + 'px "Fredoka", "Trebuchet MS", sans-serif'; size -= 4; } while (g.measureText(text).width > 960 && size > 20);
    g.fillText(text, 512, 84);
    const tex = new T.CanvasTexture(cv);
    const m = new T.Mesh(new T.PlaneGeometry(w, w * 160 / 1024), new T.MeshBasicMaterial({ map: tex, fog: true }));
    return m;
  }

  // ---------- Rooms (the garage and the dimensions under it) ----------
  function makeRoom(dim) {
    const R = dim.room;
    if (R.mesh) {
      // A room built elsewhere (Mojulo): its walls, floor and furniture come in as one mesh with
      // the light baked in. We add a ceiling and a warm lamp for the characters.
      const g = new T.Group();
      C.loadMMG(R.mesh).then(geo => { const m = new T.Mesh(geo, C.mmgMat); m.name = 'roomMesh'; g.add(m); }).catch(e => console.warn('room mesh', e));
      const ceilMat = new T.MeshBasicMaterial({ color: '#efe6d6' });
      // One-sided ceilings: seen from below only.
      const ceiling = (x0, z0, x1, z1, y, parent) => {
        const c = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), ceilMat);
        c.rotation.x = Math.PI / 2; c.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
        (parent || g).add(c);
      };
      const Fl = dim.floors, W = R.w / 2 + 0.3, D = R.d / 2 + 0.3;
      if (!Fl) ceiling(-W, -D, W, D, R.h + 0.02);
      else {
        // Downstairs ceiling, open over the stairwell; the stairs; and the upstairs, which is
        // only shown while you are up there (js/game.js).
        const [hx0, hz0, hx1, hz1] = Fl.hole;
        ceiling(-W, -D, hx0, D, Fl.y - 0.02); ceiling(hx1, -D, W, D, Fl.y - 0.02); ceiling(hx0, hz1, hx1, D, Fl.y - 0.02);
        g.add(makeStairs(Fl));
        const upper = new T.Group();
        upper.name = 'roomUpper'; upper.position.y = Fl.y; upper.visible = false;
        C.loadMMG(R.upper).then(geo => upper.add(new T.Mesh(geo, C.mmgMat))).catch(e => console.warn('upper mesh', e));
        ceiling(-W, -D, W, D, R.h + 0.02, upper);
        const lamp2 = new T.PointLight('#fff1d0', 0.22, 30);
        lamp2.position.set(0, R.h - 1, 0);
        upper.add(lamp2);
        g.add(upper);
      }
      // A soft lamp: any brighter and characters close to it wash out to white.
      const lamp = new T.PointLight('#fff1d0', 0.25, 40);
      lamp.position.set(0, (Fl ? Fl.y : R.h) - 1, 0);
      g.add(lamp);
      return g;
    }
    if (R.plan) return drawnRoom(R);
    const s = new C.Shape(), w = R.w, d = R.d, h = R.h;
    s.add(P.box, dim.ground[0], [0, -0.1, 0], null, [w, 0.2, d]);
    // Floor planks / tiles for a bit of texture.
    if (R.style === 'garage') for (let i = 1; i < 4; i++) s.add(P.box, '#7e7e78', [0, 0.004, -d / 2 + i * d / 4], null, [w, 0.008, 0.06]);   // concrete joints
    else for (let i = 0; i < 8; i++) s.add(P.box, i % 2 ? dim.ground[1] : dim.ground[2], [-w / 2 + w / 16 + i * w / 8, 0.005, 0], null, [w / 8 - 0.05, 0.01, d - 0.2]);
    const walls = [[0, h / 2, -d / 2, w, h, 0.4], [0, h / 2, d / 2, w, h, 0.4], [-w / 2, h / 2, 0, 0.4, h, d], [w / 2, h / 2, 0, 0.4, h, d]];
    for (const [x, y, z, sx, sy, sz] of walls) s.add(P.box, R.wall, [x, y, z], null, [sx, sy, sz]);
    if (R.style === 'garage') {
      // Wooden studs on the walls, exposed beams overhead, oil stains on the concrete.
      for (let v = -w / 2 + 1.2; v < w / 2; v += 1.2) {
        s.add(P.box, R.trim, [v, h / 2, -d / 2 + 0.25], null, [0.12, h, 0.1]);
        s.add(P.box, R.trim, [-w / 2 + 0.25, h / 2, v], null, [0.1, h, 0.12]);
        s.add(P.box, R.trim, [w / 2 - 0.25, h / 2, v], null, [0.1, h, 0.12]);
      }
      for (let z = -d / 2 + 1.4; z < d / 2; z += 1.4) s.add(P.box, '#8a6a48', [0, h - 0.25, z], null, [w, 0.28, 0.18]);
      s.add(P.box, '#8a6a48', [0, h - 0.5, 0], null, [0.2, 0.3, d]);
      for (const [x, z, a, b] of [[1.8, 3.8, 1.1, 0.7], [3.4, 1.4, 0.6, 0.45], [-3, -2.5, 0.8, 0.5], [0.6, -4.2, 0.5, 0.35]]) s.add(P.cyl, '#5e5e5a', [x, 0.012, z], null, [a, 0.01, b]);
      // Shop lights on chains over the bench and a bare bulb over the car.
      for (const x of [-1.6, 1.6]) {
        for (const sx of [-0.5, 0.5]) s.add(P.cylLo, '#2a2a2a', [x + sx, h - 0.75, -5.6], null, [0.015, 0.9, 0.015]);
        s.add(P.box, '#d8dde2', [x, h - 1.25, -5.6], null, [1.3, 0.1, 0.32]);
        s.add(P.box, '#fffbe8', [x, h - 1.31, -5.6], null, [1.15, 0.04, 0.2], true);
      }
      s.add(P.cylLo, '#2a2a2a', [1.5, h - 0.7, 3.0], null, [0.015, 0.9, 0.015]);
      s.add(P.sphereLo, '#fff4c0', [1.5, h - 1.25, 3.0], null, [0.14, 0.18, 0.14], true);
    }
    for (const [x, z, sx, sz] of [[0, -d / 2 + 0.25, w, 0.1], [0, d / 2 - 0.25, w, 0.1], [-w / 2 + 0.25, 0, 0.1, d], [w / 2 - 0.25, 0, 0.1, d]]) s.add(P.box, R.trim, [x, 0.3, z], null, [sx, 0.6, sz]);
    s.add(P.box, R.trim, [0, h, 0], null, [w, 0.3, d]);
    // Hanging lights.
    if (R.style !== 'garage') for (const x of [-w / 4, w / 4]) for (const z of [-d / 4, d / 4]) { s.add(P.cylLo, '#2a2a2a', [x, h - 0.5, z], null, [0.03, 1, 0.03]); s.add(P.sphereLo, '#fff4c0', [x, h - 1.1, z], null, [0.35, 0.25, 0.35], true); }
    const g = C.meshOf(s.build(), 0.05);
    g.traverse(o => { if (o.material && o.material.side === T.BackSide) o.visible = false; });   // outlines would show through walls
    const lamp = new T.PointLight('#fff1d0', R.style === 'garage' ? 0.25 : 0.35, 40);
    lamp.position.set(0, h - 1.5, 0);
    g.add(lamp);
    return g;
  }

  // A building's inside drawn from its floor plan (shared/interiors.js): a floor per room,
  // the walls (inside ones from the plan, the front one with the way in), skirting, a ceiling
  // and hanging lights. The furniture comes in as props.
  function drawnRoom(R) {
    const s = new C.Shape(), L = R.look, h = R.h, W = R.w, D = R.d, I = { plan: R.plan, scale: R.scale };
    R.plan.rooms.forEach((r, i) => {
      const a = MM.interiorXZ(I, r.x, r.y), b = MM.interiorXZ(I, r.x + r.w, r.y + r.h);
      s.add(P.box, L.floor[i % 2], [(a.x + b.x) / 2, -0.05, (a.z + b.z) / 2], null, [Math.abs(b.x - a.x), 0.1, Math.abs(b.z - a.z)]);
    });
    const wall = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      s.add(P.box, L.wall, [mx, h / 2, mz], [0, ang, 0], [0.2, h, len]);
      s.add(P.box, L.trim, [mx, 0.15, mz], [0, ang, 0], [0.26, 0.3, len]);
      s.add(P.box, L.trim, [mx, h - 0.1, mz], [0, ang, 0], [0.24, 0.2, len]);
    };
    for (const [x1, z1, x2, z2] of MM.planWalls(I)) wall(x1, z1, x2, z2);
    const e = R.plan.doors.find(d => d.entry), ex = MM.interiorXZ(I, e.x, e.y).x, hw = W / 2, hd = D / 2, g = 0.9;
    wall(-hw, hd, hw, hd); wall(-hw, -hd, -hw, hd); wall(hw, -hd, hw, hd);
    wall(-hw, -hd, ex - g, -hd); wall(ex + g, -hd, hw, -hd);
    s.add(P.box, L.wall, [ex, 2.6 + (h - 2.6) / 2, -hd], null, [2 * g, h - 2.6, 0.2]);
    s.add(P.box, L.trim, [ex, 2.65, -hd], null, [2 * g + 0.3, 0.14, 0.3]);
    s.add(P.box, shade(L.wall, 0.85), [0, h + 0.1, 0], null, [W + 0.4, 0.2, D + 0.4]);
    for (let x = -W / 2 + W / 6; x < W / 2; x += W / 3) for (let z = -D / 2 + D / 4; z < D / 2; z += D / 2) {
      s.add(P.cylLo, '#2a2a2a', [x, h - 0.25, z], null, [0.03, 0.5, 0.03]);
      s.add(P.sphereLo, '#fff4c0', [x, h - 0.55, z], null, [0.2, 0.14, 0.2], true);
    }
    const grp = C.meshOf(s.build(), 0.05);
    grp.traverse(o => { if (o.material && o.material.side === T.BackSide) o.visible = false; });
    const lamp = new T.PointLight('#fff1d0', 0.3, 50);
    lamp.position.set(0, h - 1.2, 0);
    grp.add(lamp);
    return grp;
  }

  // A carpeted staircase between two floors (dim.floors.stair: x0..x1 wide, climbing from z0
  // to z1), with a closed side underneath where it is low and a banister along the open side.
  function makeStairs(Fl) {
    const S = Fl.stair, s = new C.Shape(), n = 14, run = S.z1 - S.z0, dir = Math.sign(run), w = S.x1 - S.x0, cx = (S.x0 + S.x1) / 2;
    const step = Math.abs(run) / n, rise = Fl.y / n;
    for (let i = 0; i < n; i++) {
      const z = S.z0 + dir * (i + 0.5) * step, y = (i + 1) * rise;
      s.add(P.box, '#cdbb98', [cx, y - 0.04, z], null, [w, 0.08, step + 0.02]);                         // the tread (carpet)
      s.add(P.box, '#f2ece0', [cx, y - rise / 2, z - dir * step / 2], null, [w, rise, 0.03]);            // the riser
      if (y < 2.4) s.add(P.box, '#f2ece0', [S.x0 + 0.04, y / 2, z], null, [0.08, y, step + 0.01]);     // closed in where it is low
      else s.add(P.box, '#f2ece0', [S.x0 + 0.04, y - 0.2, z], null, [0.08, 0.32, step + 0.01]);        // the stringer above your head
      if (i % 2 === 0) s.add(P.box, '#f8f4ea', [S.x0 + 0.06, y + 0.45, z], null, [0.04, 0.9, 0.04]);      // spindles
    }
    // The banister along the open side, and its newel post at the bottom.
    const len = Math.hypot(run, Fl.y), ang = Math.atan2(Fl.y, Math.abs(run));
    s.add(P.box, '#6e4a2a', [S.x0 + 0.06, Fl.y / 2 + 0.92, (S.z0 + S.z1) / 2], [dir > 0 ? -ang : ang, 0, 0], [0.08, 0.07, len]);
    s.add(P.box, '#6e4a2a', [S.x0 + 0.06, 0.55, S.z0 - dir * 0.05], null, [0.14, 1.1, 0.14]);
    const g = C.meshOf(s.build(), 0.03);
    g.traverse(o => { if (o.material && o.material.side === T.BackSide) o.visible = false; });
    return g;
  }

  // An Earth's sea, off its southern beach: the surface and a line of surf.
  function makeSea(dim) {
    const g = new T.Group(), W = dim.bound * 2 + 200, D = dim.bound + 120 - MM.SEA_Z;
    const mat = new T.MeshLambertMaterial({ color: (dim.shapeOf || dim.id) === 'meatlands' ? '#a8304a' : '#2f86c0', transparent: true, opacity: 0.78 });
    const sea = new T.Mesh(new T.PlaneGeometry(W, D, 1, 1), mat);
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, MM.SEA_LEVEL, MM.SEA_Z + D / 2 - 6);
    g.add(sea);
    const surf = new T.Mesh(new T.PlaneGeometry(W, 3), new T.MeshBasicMaterial({ color: '#f2fbff', transparent: true, opacity: 0.6 }));
    surf.rotation.x = -Math.PI / 2; surf.position.set(0, MM.SEA_LEVEL + 0.03, MM.SEA_Z + 4);
    g.add(surf);
    g.name = 'sea';
    return g;
  }

  // ---------- Kiosk ----------
  C.kioskModel = dim => makeKiosk(dim, dim && dim.station);
  // Public portal stations: the Citadel's green portal arch and Federation customs.
  function makeKiosk(dim, St) {
    St = St || { name: 'Portal Station', fee: {} };
    const fed = dim && (dim.shapeOf || dim.id) === 'federation';
    const col = fed ? '#5fb4ff' : '#39ff6a', metal = fed ? '#c9ccd4' : '#59606e', dark = fed ? '#3c4a66' : '#2b303a';
    const s = new C.Shape();
    s.add(P.cyl, dark, [0, 0.25, 0], null, [3.6, 0.5, 3.6]);
    s.add(P.cyl, col, [0, 0.52, 0], null, [3.65, 0.06, 3.65], true);
    s.add(P.cyl, metal, [0, 0.62, 0], null, [3.0, 0.16, 3.0]);
    // The arch: a thick ring with ribbed clamps, held by two curved pylons.
    const gate = new T.TorusGeometry(2.3, 0.34, 18, 64), inner = new T.TorusGeometry(1.95, 0.07, 8, 64);
    s.add(gate, metal, [0, 2.85, 0], null, [1, 1, 0.9]);
    s.add(inner, col, [0, 2.85, 0.14], null, null, true);
    s.add(inner, col, [0, 2.85, -0.14], null, null, true);
    gate.dispose(); inner.dispose();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.box, dark, [Math.cos(a) * 2.3, 2.85 + Math.sin(a) * 2.3, 0], [0, 0, a], [0.3, 0.75, 0.8]); }
    for (const sx of [-1, 1]) {
      C.capsuleAt(s, metal, 0.26, 1.9, [sx * 1.95, 0.6, 0], [0, 0, sx * 0.42]);
      s.add(P.box, dark, [sx * 3.2, 1.0, 0], null, [0.6, 2.0, 0.9]);
      s.add(P.sphere, col, [sx * 3.2, 2.1, 0], null, [0.22, 0.22, 0.22], true);
    }
    if (fed) {
      // Customs: a booth with a window and a barrier arm in front of the gate.
      s.add(P.box, '#e8eaee', [4.6, 1.3, -1.2], null, [1.8, 2.6, 1.8]);
      s.add(P.box, '#7fc4ff', [4.6, 1.7, -0.29], null, [1.3, 0.8, 0.05], true);
      s.add(P.box, '#3c4a66', [4.6, 2.7, -1.2], null, [2.0, 0.2, 2.0]);
      s.add(P.box, '#ffffff', [1.6, 1.05, 2.2], null, [3.2, 0.14, 0.14]);
      s.add(P.box, '#e23b3b', [0.6, 1.05, 2.2], null, [0.5, 0.15, 0.15]);
    } else {
      // Citadel: a control console and a queue rail.
      s.add(P.capsule, '#1d2230', [0, 1.3, -2.0], null, [0.6, 0.48, 0.42]);
      s.add(P.sphere, col, [0, 1.78, -1.62], null, [0.45, 0.3, 0.06], true);
      for (const sx of [-1, 1]) { s.add(P.box, '#c7ccd6', [sx * 1.4, 0.95, 4.2], null, [0.06, 0.9, 3.4]); s.add(P.cyl, '#c7ccd6', [sx * 1.4, 1.42, 4.2], [Math.PI / 2, 0, 0], [0.05, 3.4, 0.05]); }
    }
    const g = C.meshOf(s.build(), 0.06);
    const fee = Object.keys(St.fee || {}).map(k => St.fee[k] + ' ' + MM.MATERIALS[k].name).join(', ');
    const sign = C.makeTag(St.name.toUpperCase(), '', fee ? 'Fee: ' + fee : 'Free', col);
    sign.sprite.position.set(0, 6.6, 0); sign.sprite.scale.set(5.6, 1.4, 1);
    sign.draw(-1);
    g.add(sign.sprite);
    const ring = C.portalMesh(col, 1.9);
    ring.position.set(0, 2.85, 0);
    g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  // ---------- Portals ----------
  const portalGeo = new T.CircleGeometry(1, 48);
  C.PORTAL_STYLES = { swirl: 0, ring: 1, spiral: 2, storm: 3 };
  C.portalMesh = function (color, size, style) {
    const m = new T.ShaderMaterial({
      transparent: true, side: T.DoubleSide, depthWrite: false,
      uniforms: { col: { value: new T.Color(color) }, t: { value: Math.random() * 10 }, open: { value: 1 }, style: { value: C.PORTAL_STYLES[style] || 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 col; uniform float t; uniform float open; uniform float style; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);
          float wob = style > 0.5 && style < 1.5 ? 0.92 : 0.9 + 0.06 * sin(a * 7.0 + t * 4.0) + 0.04 * sin(a * 13.0 - t * 6.0);
          float edge = wob * open;
          if (r > edge) discard;
          float sw;
          if (style < 0.5) sw = sin(a * 3.0 + r * 14.0 - t * 6.0) * 0.5 + 0.5;                                  // swirl (the show)
          else if (style < 1.5) sw = 0.25 + 0.15 * sin(a * 2.0 - t * 2.0 + r * 4.0);                             // ring: calm centre
          else if (style < 2.5) sw = smoothstep(0.35, 0.65, fract(a / 6.2831 * 4.0 + r * 2.5 - t * 0.7));       // spiral arms
          else sw = fract(sin(dot(floor(p * 16.0 + vec2(t * 7.0, -t * 5.0)), vec2(12.9898, 78.233))) * 43758.5453);   // static storm
          vec3 c = mix(col * 0.55, col, sw);
          c = mix(c, vec3(1.0), smoothstep(0.35, 0.0, r) * (style > 0.5 && style < 1.5 ? 0.15 : 0.55));
          float rim = smoothstep(edge - (style > 0.5 && style < 1.5 ? 0.3 : 0.16), edge, r);
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
  // A local's look comes from the seed the server sends, so everyone sees the same person.
  const SKINS = { human: ['#ffe0c8', '#f2d2b6', '#e0b08c', '#c68a62', '#a8724f', '#6b4630'], alien: ['#9ad66b', '#7ec8e3', '#c49bff', '#5fd6b0', '#ff9bd2'],
    blob: ['#e07a85', '#d9677a', '#c4505f'], robot: ['#b4b4c0', '#9aa3ab', '#d8c060'], birdfolk: ['#f0d0a0', '#e8c49a', '#d9b98a'], beanling: ['#ffd447', '#ff9bd2', '#7ec8e3'],
    teddy: ['#b07a4a', '#c88a52', '#8a5a34', '#d8a870'], shrimp: ['#ff8a6a', '#f47a5a', '#ff9d7d', '#ee6e50'] };
  C.npcLook = function (type, seed) {
    const H = MM.NPCS[type].human, r = MM.rng(seed >>> 0);
    if (H.fixed) return MM.canonLook(H.fixed);
    if (H.variant) { const L = MM.variantLook(H.variant, r); if (H.top) L.top = H.top; if (H.acc) L.acc = H.acc; return L; }
    const pk = a => a[Math.floor(r() * a.length)];
    const col = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
    const look = MM.defaultLook();
    look.species = pk(H.species);
    look.top = pk(H.top); look.acc = pk(H.acc);
    look.eyes = H.eyes ? pk(H.eyes) : pk(['normal', 'normal', 'wide', 'sleepy']);
    look.hair = pk(MM.LOOK.hair); look.brow = pk(MM.LOOK.brow); look.mouth = pk(MM.LOOK.mouth);
    look.skin = pk(SKINS[look.species] || SKINS.human);
    for (const k of ['hairColor', 'topColor', 'shirtColor', 'pantsColor', 'shoeColor', 'accColor']) look[k] = col();
    const hr = H.height || [0.9, 1.2];
    look.height = hr[0] + r() * (hr[1] - hr[0]); look.width = 0.85 + r() * 0.4; look.head = 0.9 + r() * 0.35;
    if (H.skin) look.skin = H.skin;                    // species that all look alike (Gromflomites, Unity's hosts)
    if (H.colors) Object.assign(look, H.colors);
    if (H.look) Object.assign(look, H.look);           // one particular person (President Curtis)
    return look;
  };
  C.npcModel = function (type, seed) {
    if (MM.NPCS[type].human) {
      const look = C.npcLook(type, seed || 1);
      const H = MM.NPCS[type].human;
      const av = C.buildAvatar(look, type === 'invader' ? 'trooper' : type === 'birdcitizen' ? 'birdfolk' : type === 'meeseeks' ? 'meeseeks' : H.variant || 'joe');
      if (H.scale) { av.baseScale = H.scale; av.root.scale.setScalar(H.scale); }   // giants
      return { root: av.root, av };
    }
    const key = type === 'froopy' ? type + ((seed || 0) % 4) : type === 'merfolk' ? type + ((seed || 0) % 3) : type;
    if (!npcCache[key]) {
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
      } else if (type === 'dogcitizen' || type === 'dogsoldier') {
        // A dog. Soldiers wear mech armour and carry a cannon.
        const fur = '#c98a4a';
        if (type === 'dogcitizen') {
        s.add(P.sphere, fur, [0, 0.75, -0.1], null, [0.45, 0.4, 0.75]);
        s.add(P.sphere, fur, [0, 1.25, 0.55], null, [0.38, 0.36, 0.38]);
        s.add(P.sphere, fur, [0, 1.15, 0.9], null, [0.2, 0.17, 0.25]);
        s.add(P.sphereLo, '#111', [0, 1.2, 1.13], null, [0.08, 0.07, 0.06]);
        for (const sx of [-1, 1]) {
          s.add(P.sphere, shade(fur, 0.7), [sx * 0.33, 1.25, 0.5], [0, 0, sx * 0.3], [0.12, 0.3, 0.18]);
          s.add(P.sphere, '#fff', [sx * 0.15, 1.35, 0.85], null, [0.1, 0.11, 0.06]);
          s.add(P.sphereLo, '#111', [sx * 0.15, 1.35, 0.9], null, [0.045, 0.05, 0.03]);
          for (const z of [-0.5, 0.35]) s.add(P.cyl, fur, [sx * 0.25, 0.3, z], null, [0.09, 0.6, 0.09]);
        }
        s.add(P.capsule, fur, [0, 0.95, -0.85], [-0.8, 0, 0], [0.06, 0.4, 0.06]);
        }
        if (type === 'dogsoldier') {
          // The dog rides an egg-shaped walker on two backward-bending legs, in a glass cockpit.
          for (const sx of [-1, 1]) {
            C.capsuleAt(s, '#7d858e', 0.12, 0.85, [sx * 0.42, 0.55, -0.35], [0.46, 0, 0]);    // thigh: knee up to the hip
            C.capsuleAt(s, '#59606e', 0.1, 0.75, [sx * 0.42, 0.05, 0.15], [-0.785, 0, 0]);   // shin: foot back to the knee
            s.add(P.sphere, '#59606e', [sx * 0.42, 0.55, -0.35], null, [0.14, 0.14, 0.14]);
            s.add(P.box, '#3a3f4a', [sx * 0.42, 0.05, 0.3], null, [0.28, 0.1, 0.55]);
          }
          s.add(P.sphere, '#c9cfd6', [0, 1.75, 0], null, [0.75, 0.62, 0.85]);
          s.add(P.torus, '#8f969c', [0, 1.65, 0], [Math.PI / 2, 0, 0], [0.75, 0.85, 0.5]);
          s.add(P.cyl, '#3a3f4a', [0.75, 1.75, 0.35], [Math.PI / 2, 0, 0], [0.09, 0.9, 0.09]);
          s.add(P.sphereLo, '#ff5a3a', [0.75, 1.75, 0.82], null, [0.08, 0.08, 0.06], true);
          s.add(P.torus, '#59606e', [0, 2.3, 0.2], [Math.PI / 2, 0, 0], [0.42, 0.42, 0.6]);      // open cockpit rim
          // The dog itself, sitting up in the cockpit.
          s.add(P.sphere, '#f4f4f4', [0, 2.62, 0.25], null, [0.26, 0.24, 0.26]);
          s.add(P.sphere, '#f4f4f4', [0, 2.56, 0.5], null, [0.12, 0.1, 0.15]);
          s.add(P.sphereLo, '#111', [0, 2.58, 0.64], null, [0.045, 0.04, 0.035]);
          for (const sx of [-1, 1]) {
            s.add(P.sphere, '#dcdcdc', [sx * 0.22, 2.68, 0.2], [0, 0, sx * 0.3], [0.07, 0.17, 0.1]);
            s.add(P.sphere, '#fff', [sx * 0.1, 2.7, 0.46], null, [0.06, 0.065, 0.04]);
            s.add(P.sphereLo, '#111', [sx * 0.1, 2.7, 0.5], null, [0.028, 0.03, 0.02]);
          }
        }
      } else if (type === 'seedbeast') {
        s.add(P.sphere, '#7a4ac0', [0, 0.8, 0], null, [0.9, 0.7, 1.1]);
        for (let i = 0; i < 7; i++) s.add(P.cone, '#c8ff6a', [Math.sin(i) * 0.4, 1.35, -0.6 + i * 0.2], [-0.3, 0, Math.sin(i) * 0.3], [0.12, 0.5, 0.12]);
        for (const sx of [-1, 1]) for (const z of [-0.5, 0.5]) s.add(P.capsule, '#5a3a90', [sx * 0.6, 0.3, z], [0, 0, sx * 0.5], [0.12, 0.5, 0.12]);
        s.add(P.sphere, '#ffe066', [0.3, 1.0, 0.95], null, [0.16, 0.16, 0.08], true); s.add(P.sphere, '#ffe066', [-0.3, 1.0, 0.95], null, [0.16, 0.16, 0.08], true);
        s.add(P.sphereLo, '#2a0a2a', [0, 0.6, 1.05], null, [0.4, 0.15, 0.1]);
        for (let i = -2; i <= 2; i++) s.add(P.cone, '#fff', [i * 0.12, 0.66, 1.08], [Math.PI, 0, 0], [0.04, 0.12, 0.04]);
      } else if (type === 'butterbot') {
        s.add(P.cyl, '#9aa3ab', [0, 0.2, 0], null, [0.3, 0.12, 0.3]);
        s.add(P.box, '#c9cfd6', [0, 0.38, 0], null, [0.36, 0.3, 0.3]);
        s.add(P.sphere, '#3a3f4a', [0, 0.42, 0.16], null, [0.09, 0.09, 0.04]);
        s.add(P.sphereLo, '#ff5a3a', [0, 0.42, 0.2], null, [0.035, 0.035, 0.02], true);
        for (const sx of [-1, 1]) { s.add(P.capsule, '#9aa3ab', [sx * 0.22, 0.38, 0.1], [0.8, 0, sx * 0.3], [0.025, 0.2, 0.025]); s.add(P.sphereLo, '#9aa3ab', [sx * 0.25, 0.42, 0.28], null, [0.04, 0.04, 0.04]); }
      } else if (type === 'skyserpent') {
        for (let i = 0; i < 7; i++) s.add(P.sphere, i % 2 ? '#3fb6a8' : '#2a8f86', [0, 0.6 + Math.sin(i * 0.9) * 0.3, -i * 0.55], null, [0.45 - i * 0.04, 0.42 - i * 0.04, 0.5]);
        s.add(P.sphere, '#3fb6a8', [0, 0.75, 0.55], null, [0.55, 0.45, 0.65]);
        s.add(P.cone, '#ffd84d', [0, 1.15, 0.3], [-0.4, 0, 0], [0.12, 0.5, 0.12]);
        s.add(P.sphereLo, '#fff', [0.25, 0.9, 0.95], null, [0.12, 0.12, 0.08]); s.add(P.sphereLo, '#fff', [-0.25, 0.9, 0.95], null, [0.12, 0.12, 0.08]);
        s.add(P.sphereLo, '#111', [0.25, 0.9, 1.02], null, [0.05, 0.05, 0.03]); s.add(P.sphereLo, '#111', [-0.25, 0.9, 1.02], null, [0.05, 0.05, 0.03]);
        s.add(P.sphere, '#ffcf4d', [0.6, 0.8, 0.1], [0, 0, -0.5], [0.6, 0.1, 0.3]); s.add(P.sphere, '#ffcf4d', [-0.6, 0.8, 0.1], [0, 0, 0.5], [0.6, 0.1, 0.3]);
      } else if (type === 'gazorpian') {
        // A Gazorpian male: a big red brute with four arms (the top pair biggest), little arms
        // on the head, four eyes, fangs and blue sacs under the chin.
        const sk = '#c8382e';
        for (const sx of [-1, 1]) {
          C.capsuleAt(s, sk, 0.16, 1.0, [sx * 0.8, 1.0, 0.25], [0.4, 0, sx * 0.5]);                   // the lower pair of arms
          C.capsuleAt(s, sk, 0.06, 0.4, [sx * 0.3, 2.6, 0.3], [0, 0, sx * 0.8]);                       // head arms where ears would be
          s.add(P.sphereLo, '#5a8ad8', [sx * 0.12, 2.18, 0.62], null, [0.11, 0.14, 0.1]);             // chin sacs
          s.add(P.sphereLo, '#efe6cc', [sx * 0.75, 1.9, 0.0], null, [0.22, 0.12, 0.2]);               // shoulder hair
        }
        for (const sx of [-1, 1]) { C.capsuleAt(s, sk, 0.24, 1.1, [sx * 0.35, 0, 0]); C.capsuleAt(s, sk, 0.22, 1.6, [sx * 0.95, 0.5, 0.1], [0, 0, sx * 0.12]); s.add(P.sphere, sk, [sx * 0.98, 0.45, 0.15], null, [0.3, 0.3, 0.3]); }
        s.add(P.sphere, sk, [0, 1.65, 0], null, [0.85, 0.75, 0.6]);
        s.add(P.sphere, sk, [0, 2.15, 0.05], null, [1.05, 0.45, 0.6]);
        s.add(P.box, '#6a4a2a', [0, 1.05, 0.05], null, [0.95, 0.4, 0.62]);
        s.add(P.sphere, sk, [0, 2.45, 0.35], null, [0.38, 0.36, 0.38]);
        s.add(P.box, shade(sk, 0.7), [0, 2.6, 0.62], null, [0.5, 0.1, 0.12]);
        for (const sx of [-1, 1]) { s.add(P.sphereLo, '#ffee88', [sx * 0.2, 2.52, 0.66], null, [0.07, 0.05, 0.04], true); s.add(P.sphereLo, '#ffee88', [sx * 0.07, 2.5, 0.7], null, [0.04, 0.035, 0.03], true); s.add(P.cone, '#fff8e0', [sx * 0.16, 2.33, 0.68], null, [0.05, 0.18, 0.05]); }
        s.add(P.box, '#3a1a12', [0, 2.3, 0.7], null, [0.3, 0.05, 0.03]);
      } else if (type === 'froopy') {
        // A Froopyland creature: a soft pastel blob on stubby legs, with big friendly eyes.
        const c = ['#ffb0e0', '#b0d8ff', '#c8ffb0', '#ffe0a0'][(seed || 0) % 4];
        s.add(P.sphere, c, [0, 0.75, 0], null, [0.65, 0.6, 0.6]);
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s.add(P.sphereLo, shade(c, 1.15), [Math.cos(a) * 0.45, 1.15, Math.sin(a) * 0.4], null, [0.25, 0.22, 0.25]); }
        for (const sx of [-1, 1]) {
          C.capsuleAt(s, shade(c, 0.9), 0.12, 0.4, [sx * 0.28, 0, 0]);
          s.add(P.sphere, '#ffffff', [sx * 0.2, 0.9, 0.5], null, [0.17, 0.2, 0.1]);
          s.add(P.sphereLo, '#1a1a1a', [sx * 0.2, 0.88, 0.58], null, [0.08, 0.1, 0.04]);
          s.add(P.sphereLo, '#ff7aa8', [sx * 0.38, 0.68, 0.48], null, [0.08, 0.05, 0.03]);
          C.capsuleAt(s, shade(c, 0.9), 0.08, 0.45, [sx * 0.6, 0.65, 0.1], [0, 0, sx * -0.9]);
        }
        s.add(P.sphereLo, '#3a1a2a', [0, 0.62, 0.56], null, [0.1, 0.05, 0.03]);
        s.add(P.sphere, shade(c, 0.85), [0, 1.35, 0], null, [0.1, 0.2, 0.1]);
      } else if (type === 'snakefolk' || type === 'snaketerm') {
        // A Snake Planet snake: an S-curve of a body, rearing up, with a big head. The
        // terminators from the future are chrome with a red eye.
        const term = type === 'snaketerm', c1 = term ? '#a8b0b8' : '#8ab02a', c2 = term ? '#7a828a' : '#c8e04a';
        for (let i = 0; i < 9; i++) { const t = i / 8; s.add(P.sphere, i % 2 ? c1 : c2, [Math.sin(t * 5) * 0.35, 0.18 + Math.max(0, t - 0.45) * 1.5, -0.9 + t * 1.1], null, [0.24 - t * 0.04, 0.2, 0.24]); }
        s.add(P.sphere, c1, [0, 0.98, 0.35], null, [0.3, 0.24, 0.38]);
        if (term) { s.add(P.sphereLo, '#ff2a2a', [0.13, 1.06, 0.62], null, [0.08, 0.08, 0.06], true); s.add(P.box, '#4a5058', [-0.1, 1.05, 0.55], null, [0.2, 0.12, 0.2]); }
        else for (const sx of [-1, 1]) { s.add(P.sphereLo, '#ffe066', [sx * 0.14, 1.08, 0.6], null, [0.08, 0.09, 0.06]); s.add(P.sphereLo, '#111', [sx * 0.14, 1.08, 0.65], null, [0.03, 0.07, 0.02]); }
        s.add(P.box, '#e2483d', [0, 0.92, 0.78], [0.2, 0, 0], [0.04, 0.02, 0.2]);
      } else if (type === 'dinosaur') {
        // A long-necked, kindly dinosaur, built to scale with you (it is very big).
        const g = '#6a9a7a', b = '#a8c8a0';
        s.add(P.sphere, g, [0, 3.0, 0], null, [1.7, 1.5, 2.6]);
        s.add(P.sphere, b, [0, 2.4, 0.2], null, [1.4, 0.9, 2.2]);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) C.capsuleAt(s, g, 0.45, 2.2, [sx * 1.0, 0, sz * 1.4]);
        for (let i = 0; i < 6; i++) s.add(P.sphere, g, [0, 3.8 + i * 0.5, 2.2 + i * 0.35], null, [0.55 - i * 0.03, 0.55, 0.55]);
        s.add(P.sphere, g, [0, 6.8, 4.5], null, [0.7, 0.55, 0.9]);
        for (const sx of [-1, 1]) { s.add(P.sphereLo, '#fff', [sx * 0.42, 7.0, 4.9], null, [0.16, 0.18, 0.12]); s.add(P.sphereLo, '#111', [sx * 0.46, 7.0, 5.0], null, [0.07, 0.09, 0.05]); }
        s.add(P.box, '#3a4a3a', [0, 6.55, 5.3], null, [0.5, 0.05, 0.05]);
        for (let i = 0; i < 6; i++) s.add(P.sphere, g, [0, 2.9 - i * 0.25, -2.4 - i * 0.6], null, [0.5 - i * 0.07, 0.45 - i * 0.06, 0.6]);
        for (let i = 0; i < 6; i++) s.add(P.cone, '#d8a84a', [0, 4.4 - Math.abs(i - 2.5) * 0.15, -1.4 + i * 0.6], null, [0.12, 0.5, 0.25]);
      } else if (type === 'raptor') {
        const g = '#a86a3a';
        s.add(P.sphere, g, [0, 1.0, 0], [0.3, 0, 0], [0.4, 0.42, 0.75]);
        for (let i = 0; i < 5; i++) s.add(P.sphere, g, [0, 1.0 + i * 0.03, -0.7 - i * 0.3], null, [0.22 - i * 0.04, 0.2 - i * 0.03, 0.3]);
        s.add(P.sphere, g, [0, 1.45, 0.75], null, [0.24, 0.22, 0.42]);
        s.add(P.box, '#3a1a12', [0, 1.36, 1.05], null, [0.2, 0.05, 0.18]);
        for (const sx of [-1, 1]) { s.add(P.sphereLo, '#ffe066', [sx * 0.15, 1.55, 0.95], null, [0.06, 0.06, 0.05]); C.capsuleAt(s, g, 0.12, 0.85, [sx * 0.2, 0, -0.05]); C.capsuleAt(s, g, 0.05, 0.4, [sx * 0.22, 0.85, 0.45], [0.8, 0, 0]); s.add(P.cone, '#f0e8d0', [sx * 0.2, 0.05, 0.25], [1.4, 0, 0], [0.04, 0.2, 0.04]); }
        for (let i = 0; i < 5; i++) s.add(P.cone, '#5a3a1a', [0, 1.4 - i * 0.02, 0.3 - i * 0.25], [-0.4, 0, 0], [0.05, 0.25, 0.08]);
      } else if (type === 'merfolk') {
        // An Atlantean: a person from the waist up, a fish from the waist down, floating.
        const sk = ['#e8b89a', '#8ac8d8', '#c8a0e0'][(seed || 0) % 3], tail = ['#3aa8a0', '#5a7ae0', '#e06a8a'][(seed || 0) % 3];
        for (let i = 0; i < 5; i++) s.add(P.sphere, tail, [0, 0.9 - i * 0.18, -i * 0.12], null, [0.3 - i * 0.04, 0.22, 0.28 - i * 0.03]);
        s.add(P.sphere, tail, [0, 0.12, -0.7], [0.4, 0, 0], [0.45, 0.06, 0.25]);
        s.add(P.sphere, sk, [0, 1.35, 0], null, [0.32, 0.38, 0.24]);
        s.add(P.sphere, sk, [0, 1.95, 0.02], null, [0.27, 0.29, 0.27]);
        s.add(P.sphere, '#2a5a8a', [0, 2.12, -0.08], null, [0.3, 0.22, 0.3]);
        for (const sx of [-1, 1]) { s.add(P.sphereLo, '#fff', [sx * 0.1, 1.98, 0.24], null, [0.07, 0.08, 0.04]); s.add(P.sphereLo, '#111', [sx * 0.1, 1.98, 0.27], null, [0.03, 0.04, 0.02]); C.capsuleAt(s, sk, 0.07, 0.6, [sx * 0.36, 1.05, 0.05], [0, 0, sx * 0.3]); }
        s.add(P.torus, '#ffd84d', [0, 1.6, 0], [Math.PI / 2, 0, 0], [0.25, 0.25, 0.4]);
      } else if (type === 'seamonster') {
        // A trench beast: a long eel with a lantern on its head and far too many teeth.
        for (let i = 0; i < 9; i++) s.add(P.sphere, i % 2 ? '#2a4a6a' : '#3a5a7a', [Math.sin(i * 0.7) * 0.4, 0.8, -i * 0.42], null, [0.55 - i * 0.04, 0.5 - i * 0.04, 0.4]);
        s.add(P.sphere, '#2a4a6a', [0, 0.9, 0.55], null, [0.65, 0.55, 0.6]);
        s.add(P.sphereLo, '#1a0a12', [0, 0.72, 0.95], null, [0.45, 0.25, 0.2]);
        for (let i = -3; i <= 3; i++) s.add(P.cone, '#f0f0e8', [i * 0.11, 0.9, 1.0], [Math.PI, 0, 0], [0.04, 0.16, 0.04]);
        for (const sx of [-1, 1]) s.add(P.sphereLo, '#ffffff', [sx * 0.3, 1.15, 0.95], null, [0.1, 0.1, 0.06], true);
        C.capsuleAt(s, '#3a5a7a', 0.04, 0.8, [0, 1.35, 0.5], [0.6, 0, 0]);
        s.add(P.sphere, '#7affea', [0, 1.85, 1.0], null, [0.14, 0.14, 0.14], true);
      } else if (type === 'bacteria') {
        // An Anatomy Park disease: a green, spiky, angry germ.
        s.add(P.sphere, '#7ac83a', [0, 0.75, 0], null, [0.65, 0.6, 0.65]);
        for (let i = 0; i < 12; i++) { const a = i * 2.4, y = Math.sin(i * 1.7) * 0.5; const r = Math.sqrt(1 - y * y); s.add(P.cone, '#5a9a2a', [Math.cos(a) * r * 0.65, 0.75 + y * 0.6, Math.sin(a) * r * 0.65], [Math.sin(a) * 1.2 * r, 0, -Math.cos(a) * 1.2 * r + (y > 0 ? 0 : Math.PI)], [0.1, 0.35, 0.1]); }
        for (const sx of [-1, 1]) { s.add(P.sphere, '#ffff9a', [sx * 0.22, 0.95, 0.5], null, [0.16, 0.13, 0.1]); s.add(P.sphereLo, '#1a1a1a', [sx * 0.2, 0.93, 0.59], null, [0.07, 0.07, 0.03]); s.add(P.box, '#2a4a12', [sx * 0.22, 1.1, 0.56], [0, 0, sx * -0.4], [0.28, 0.05, 0.05]); }
        s.add(P.sphereLo, '#2a0a12', [0, 0.6, 0.55], null, [0.25, 0.12, 0.08]);
        for (let i = -2; i <= 2; i++) s.add(P.cone, '#fff8e0', [i * 0.08, 0.66, 0.6], [Math.PI, 0, 0], [0.03, 0.08, 0.03]);
      } else if (type === 'pizzaperson' || type === 'phoneperson' || type === 'chairperson') {
        // Objects that are people: a body made of the object, with a face, arms and legs.
        const skin = '#f0c8a0';
        if (type === 'pizzaperson') {
          s.add(P.cone, '#f4c860', [0, 1.25, 0.0], [Math.PI, 0, 0], [0.55, 1.3, 0.14]);
          s.add(P.box, '#c8883a', [0, 1.9, 0], null, [1.1, 0.2, 0.3]);
          for (const [x, y] of [[0.2, 1.3], [-0.16, 1.16], [0, 0.95]]) s.add(P.cyl, '#c83a2a', [x, y, 0.15], [Math.PI / 2, 0, 0], [0.09, 0.02, 0.09]);
        } else if (type === 'phoneperson') {
          s.add(P.box, '#e2483d', [0, 1.35, 0], null, [0.9, 1.1, 0.7]);
          s.add(P.cyl, '#fbfaf6', [0, 1.12, 0.35], [Math.PI / 2, 0, 0], [0.24, 0.04, 0.24]);
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.cyl, '#1a1a1a', [Math.cos(a) * 0.16, 1.12 + Math.sin(a) * 0.16, 0.38], [Math.PI / 2, 0, 0], [0.03, 0.02, 0.03]); }
          s.add(P.capsule, '#e2483d', [0, 2.02, 0], [0, 0, Math.PI / 2], [0.12, 0.35, 0.12]);
        } else {
          s.add(P.box, '#b07a4a', [0, 1.0, 0], null, [0.8, 0.12, 0.8]);
          s.add(P.box, '#c84a3a', [0, 1.1, 0], null, [0.72, 0.1, 0.72]);
          s.add(P.box, '#b07a4a', [0, 1.65, -0.36], null, [0.8, 1.2, 0.1]);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(P.box, '#b07a4a', [sx * 0.34, 0.5, sz * 0.34], null, [0.08, 1.0, 0.08]);
        }
        // A face on the object.
        const fz = type === 'chairperson' ? -0.3 : type === 'phoneperson' ? 0.38 : 0.15, fy = type === 'pizzaperson' ? 1.62 : type === 'phoneperson' ? 1.68 : 1.85;
        for (const sx of [-1, 1]) { s.add(P.sphere, '#ffffff', [sx * 0.13, fy, fz], null, [0.09, 0.11, 0.05]); s.add(P.sphereLo, '#1a1a1a', [sx * 0.13, fy, fz + 0.04], null, [0.04, 0.05, 0.02]); }
        s.add(P.box, '#3a1a1a', [0, fy - 0.2, fz + 0.01], null, [0.18, 0.04, 0.02]);
        if (type !== 'chairperson') for (const sx of [-1, 1]) {
          C.capsuleAt(s, skin, 0.07, 0.75, [sx * 0.2, 0, 0]);
          s.add(P.sphereLo, '#3a3a3a', [sx * 0.2, 0.05, 0.06], null, [0.09, 0.06, 0.13]);
          C.capsuleAt(s, skin, 0.06, 0.55, [sx * 0.42, 1.25, 0.05], [0, 0, sx * 2.4]);
        }
      } else if (type === 'hamster') {
        // A round, golden-brown hamster with a white belly, pink ears and nose.
        s.add(P.sphere, '#d89a5a', [0, 0.38, 0], null, [0.36, 0.32, 0.42]);
        s.add(P.sphere, '#fbf0e0', [0, 0.32, 0.2], null, [0.26, 0.22, 0.25]);
        s.add(P.sphere, '#d89a5a', [0, 0.6, 0.28], null, [0.24, 0.22, 0.22]);
        s.add(P.sphere, '#fbf0e0', [0, 0.54, 0.44], null, [0.13, 0.1, 0.1]);
        s.add(P.sphereLo, '#ff8fb0', [0, 0.58, 0.52], null, [0.04, 0.035, 0.03]);
        for (const sx of [-1, 1]) {
          s.add(P.sphere, '#ff9fb8', [sx * 0.15, 0.8, 0.22], null, [0.08, 0.08, 0.04]);
          s.add(P.sphereLo, '#1a1a1a', [sx * 0.1, 0.66, 0.46], null, [0.04, 0.045, 0.03]);
          s.add(P.sphereLo, '#ffbfd0', [sx * 0.08, 0.2, 0.36], null, [0.05, 0.03, 0.06]);
          s.add(P.sphereLo, '#ffbfd0', [sx * 0.2, 0.05, -0.15], null, [0.06, 0.03, 0.08]);
        }
      } else if (type === 'timecop') {
        // Shleemypants: a floating red, veiny, faceless lump that is mostly mouth, in a
        // torn tan robe with a satchel, and long three-fingered arms.
        const flesh = '#c8424a';
        s.add(P.sphere, flesh, [0, 1.2, 0], null, [0.85, 1.0, 0.8]);
        for (let i = 0; i < 9; i++) { const a = i * 0.7; C.capsuleAt(s, '#8a2230', 0.025, 0.7, [Math.sin(a) * 0.72, 1.0 + (i % 3) * 0.3, Math.cos(a) * 0.6], [0.3 * (i % 2 ? 1 : -1), a, 0.4]); }
        s.add(P.sphere, '#3a0a10', [0, 1.05, 0.62], null, [0.62, 0.42, 0.25]);
        for (let i = 0; i < 9; i++) {
          const x = -0.5 + i * 0.125;
          s.add(P.box, '#f0d860', [x, 1.32 - Math.abs(x) * 0.25, 0.8 - Math.abs(x) * 0.3], [0, 0, (i % 2 ? 0.2 : -0.15)], [0.1, 0.2 + (i % 3) * 0.05, 0.07]);
          s.add(P.box, '#e6c84a', [x + 0.06, 0.78 + Math.abs(x) * 0.25, 0.78 - Math.abs(x) * 0.3], [0, 0, (i % 2 ? -0.2 : 0.15)], [0.1, 0.18, 0.07]);
        }
        // The robe hangs from the shoulders down past where legs would be, ragged at the hem.
        s.add(P.cone, '#c8a878', [0, 0.35, -0.05], [Math.PI, 0, 0], [0.95, 1.1, 0.85]);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.cone, '#b89868', [Math.sin(a) * 0.75, -0.25, Math.cos(a) * 0.65], [Math.PI, 0, 0], [0.18, 0.35, 0.12]); }
        s.add(P.box, '#7a5030', [0.55, 0.65, 0.2], [0, 0, -0.5], [0.08, 1.4, 0.06]);
        s.add(P.box, '#6a4428', [0.75, 0.15, 0.35], null, [0.5, 0.4, 0.2]);
        for (const sx of [-1, 1]) {
          C.capsuleAt(s, flesh, 0.09, 1.1, [sx * 0.75, 1.3, 0.1], [0.5, 0, sx * 2.3]);
          for (let f = -1; f <= 1; f++) C.capsuleAt(s, flesh, 0.035, 0.28, [sx * 1.55, 0.72, 0.5 + f * 0.06], [0.6 + f * 0.3, 0, sx * 2.6]);
        }
      } else if (type === 'blamph') {
        // A Blamph: a big soft purple lump with two long rubbing arms and a small face.
        s.add(P.sphere, '#8a6ab8', [0, 0.8, 0], null, [0.8, 0.75, 0.7]);
        s.add(P.sphere, '#a888d0', [0, 1.3, 0.1], null, [0.5, 0.45, 0.45]);
        for (const sx of [-1, 1]) {
          C.capsuleAt(s, '#7a5aa8', 0.12, 0.85, [sx * 0.8, 0.45, 0.85], [-0.74, 0, sx * 0.18]);   // hand up to the shoulder
          s.add(P.sphere, '#a888d0', [sx * 0.8, 0.45, 0.85], null, [0.2, 0.16, 0.2]);
          s.add(P.sphere, '#fff', [sx * 0.16, 1.4, 0.5], null, [0.1, 0.12, 0.06]);
          s.add(P.sphereLo, '#1a1a1a', [sx * 0.16, 1.4, 0.55], null, [0.045, 0.055, 0.03]);
        }
        s.add(P.box, '#3a1a3a', [0, 1.2, 0.52], null, [0.22, 0.04, 0.03]);
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
      npcCache[key] = s.build();
    }
    const root = new T.Group();
    const m = C.meshOf(npcCache[key], 0.05);
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
      const g = new C.Shape();
      g.add(P.sphere, '#ff7a8a', [0, 0, 0], null, [0.38, 0.32, 0.38]);
      g.add(P.sphereLo, '#ffb0ba', [0.12, 0.15, 0.2], null, [0.1, 0.08, 0.08], true);
      const pl = new C.Shape();
      pl.add(P.octa, '#ff6fd0', [0, 0, 0], null, [0.42, 0.42, 0.18], true);
      pl.add(P.octa, '#ffd0f4', [0, 0, 0], [0, 0, Math.PI / 4], [0.3, 0.3, 0.2], true);
      const f = new C.Shape();
      f.add(P.sphere, '#ffcf4d', [0, 0, 0], [0, 0, 0.4], [0.16, 0.55, 0.05]);
      f.add(P.cylLo, '#8a6233', [0.12, -0.45, 0], [0, 0, 0.4], [0.02, 0.4, 0.02]);
      const m = new C.Shape();
      m.add(P.sphere, '#c8ff6a', [0, 0, 0], null, [0.28, 0.4, 0.28], true);
      m.add(P.cone, '#4a8a2a', [0, 0.45, 0], null, [0.1, 0.25, 0.1]);
      const k = new C.Shape();
      k.add(P.cyl, '#ffd84d', [0, 0, 0], [Math.PI / 2, 0, 0], [0.4, 0.08, 0.4]);
      k.add(P.cyl, '#fff2a0', [0, 0, 0.045], [Math.PI / 2, 0, 0], [0.26, 0.02, 0.26], true);
      pickupModels = { s: s.build(), c: c.build(), g: g.build(), p: pl.build(), f: f.build(), m: m.build(), k: k.build() };
    }
    if (MM.isCurio(kind)) return curioModel(kind.slice(2));
    const g = new T.Group();
    const m = C.meshOf(pickupModels[kind] || pickupModels.s, 0.03);
    g.add(m);
    g.userData.spin = m;
    return g;
  };
  // A curio: its emoji floating in a glowing ring of its colour, with a soft light column so
  // you can spot it from across the street.
  const curioTex = {};
  function curioModel(id) {
    const Q = MM.CURIOS[id];
    if (!curioTex[id]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const g = cv.getContext('2d');
      const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
      grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.55, Q.color + 'cc'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.font = '72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(Q.icon, 64, 70);
      curioTex[id] = new T.CanvasTexture(cv);
    }
    const grp = new T.Group();
    const sp = new T.Sprite(new T.SpriteMaterial({ map: curioTex[id], transparent: true, depthWrite: false }));
    sp.scale.set(1.1, 1.1, 1);
    grp.add(sp);
    const ring = new T.Mesh(new T.TorusGeometry(0.62, 0.05, 6, 28), new T.MeshBasicMaterial({ color: Q.color }));
    grp.add(ring);
    const beam = new T.Mesh(new T.CylinderGeometry(0.18, 0.4, 6, 10, 1, true), new T.MeshBasicMaterial({ color: Q.color, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide }));
    beam.position.y = 2.2;
    grp.add(beam);
    grp.userData.spin = ring;
    return grp;
  }

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
    if (dim.interior) group.add(makeRoom(dim));
    let terrain = null;
    if (dim.planets) group.add(makeSpace(dim, group));
    else if (!dim.interior) {
      skyDecor(dim, group); terrain = makeTerrain(dim); group.add(terrain);
      if (dim.regions) group.add(makeSea(dim));
    }
    if (dim.streets) group.add(makeStreets(dim, MM.genProps(dimId)));
    const layout = MM.layoutOf(dimId);
    if (layout.roads.length || layout.plazas.length) group.add(makePaths(dim, layout));

    // Instanced props
    const props = MM.genProps(dimId);
    const byType = {};
    for (const p of props) (byType[p.type] || (byType[p.type] = [])).push(p);
    const slots = [];   // prop id -> { set, index, matrix, tint, x, z, r, big, alive, state }
    const all = [], typeSets = [];
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    const tint = new T.Color(), white = new T.Color(1, 1, 1);
    const rand = MM.rng(dim.seed + 5);
    const zero = new T.Matrix4().makeScale(0, 0, 0);
    for (const type in byType) {
      const list = byType[type];
      const thick = type === 'house' ? 0.09 : 0.06;
      const sets = { slots: [], dirty: false };
      for (const lod of ['near', 'far']) {
        const model = propModel(type, lod === 'far');
        const meshes = [];
        for (const [geo, mat] of [[model.lit, C.toonMat], [model.glow, C.glowMat]]) {
          if (!geo) continue;
          const im = new T.InstancedMesh(geo, mat, list.length); im.userData.type = type + ':' + lod + ' ';
          const om = new T.InstancedMesh(geo, C.outlineMat(thick), list.length); om.userData.type = type + ':' + lod + ' ';
          meshes.push(im, om);
        }
        meshes.lit = !!model.lit;
        sets[lod] = meshes;
      }
      const tints = list.map(() => {
        // Every lit and glowing instance gets a colour (white = as modelled): three.js
        // r149 shares one shader between instanced meshes of a material, so they must
        // all have instance colours or none.
        if (type === 'house' || type === 'car' || type === 'storefront') return new T.Color().setHSL(rand(), type === 'car' ? 0.7 : 0.45, type === 'car' ? 0.55 : 0.8);
        if (type === 'humanhouse') return new T.Color().setHSL(rand(), 0.35, 0.88);   // everyone wears something different
        return white;
      });
      list.forEach((p, i) => {
        q.setFromAxisAngle(up, p.rot);
        m4.compose(v.set(p.x, p.y - 0.05, p.z), q, sc.set(p.s, p.s, p.s));
        for (const lod of ['near', 'far']) {
          const meshes = sets[lod];
          for (const im of meshes) im.setMatrixAt(i, zero);
          for (let k = 0; k < meshes.length; k += 2) meshes[k].setColorAt(i, k === 0 && meshes.lit ? tints[i] : white);
        }
        const R = (MM.PROPS[type] ? MM.PROPS[type].r : 8) * p.s, H = (MM.PROPS[type] ? MM.PROPS[type].h : 8) * p.s;
        // state: 'near' (detailed model), 'far' (simple model) or 'off' (in the fog or behind you).
        const slot = { set: sets, index: i, matrix: m4.clone(), tint: tints[i], x: p.x, z: p.z, r: R, big: R > 6 || H > 14, alive: true, state: 'off' };
        slots[p.id] = slot; all.push(slot); sets.slots.push(slot);
      });
      for (const lod of ['near', 'far']) for (const im of sets[lod]) im.count = 0;
      for (const lod of ['near', 'far']) for (const im of sets[lod]) { im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; group.add(im); }
      typeSets.push(sets);
    }
    // Swap props between their near and far models as the camera moves.
    const nearDist = quality === 'low' ? 28 : 40;
    // Far models keep one instance per prop (hidden when near or destroyed). Near models
    // are packed: only the props close to the camera are in the list at all, so the
    // detailed geometry costs nothing for the rest of the world.
    // Both models are packed lists: only the props that are close (detailed), or in sight
    // and inside the fog (simple), are drawn at all. Everything else costs nothing.
    function pack(sets) {
      sets.dirty = false;
      for (const lod of ['near', 'far']) {
        const meshes = sets[lod];
        let n = 0;
        for (const sl of sets.slots) {
          if (!sl.alive || sl.state !== lod) continue;
          for (let k = 0; k < meshes.length; k++) {
            meshes[k].setMatrixAt(n, sl.matrix);
            if (k % 2 === 0) meshes[k].setColorAt(n, k === 0 && meshes.lit ? sl.tint : white);
          }
          n++;
        }
        for (const im of meshes) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
      }
    }
    let lodT = 0;
    const drawDist = dim.interior ? 1e9 : (dim.fogFar || 230) + 25;
    const fwd = new T.Vector3();
    function updateLod(camPos) {
      if (C.camera) { C.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); } else fwd.set(0, 0, 0);
      for (const sl of all) {
        const dx = sl.x - camPos.x, dz = sl.z - camPos.z, dist = Math.hypot(dx, dz), d = dist - sl.r;
        let st = d < (sl.state === 'near' ? nearDist + 6 : nearDist) ? 'near' : d < drawDist || sl.big && d < drawDist * 1.6 ? 'far' : 'off';
        // Behind the camera (with room to turn): skip. Close things always draw (shadows of
        // big buildings at the edge of the screen, quick turns).
        if (st !== 'off' && d > 18 && (dx * fwd.x + dz * fwd.z) / (dist || 1) < -0.35) st = 'off';
        if (st !== sl.state) { sl.state = st; sl.set.dirty = true; }
      }
      for (const sets of typeSets) if (sets.dirty) pack(sets);
    }

    // Name signs over the landmarks, and painted signs on their walls.
    for (const l of MM.LANDMARKS) {
      if (l.dim !== dimId) continue;
      if (l.sign) {
        const sg = makeSign(l.sign.text, l.sign.w);
        const rot = l.rot !== undefined ? l.rot : 0;
        const lx = 0, lz = l.sign.z + 0.06;
        sg.position.set(l.x + lx * Math.cos(rot) + lz * Math.sin(rot), MM.heightAt(dimId, l.x, l.z) + l.sign.y, l.z - lx * Math.sin(rot) + lz * Math.cos(rot));
        sg.rotation.y = rot;
        group.add(sg);
      }
      const tag = C.makeTag(l.name, '', '', '#ffd84d');
      tag.draw(-1);
      if (dim.room) { tag.sprite.scale.set(2.6, 0.65, 1); tag.sprite.position.set(l.x, Math.min(dim.room.h - 0.8, l.h + 0.7), l.z); }
      else if (l.r < 2) { tag.sprite.scale.set(2.6, 0.65, 1); tag.sprite.position.set(l.x, MM.heightAt(dimId, l.x, l.z) + l.h + 0.8, l.z); }   // small things (inside Rick's garage)
      else { tag.sprite.scale.set(6, 1.5, 1); tag.sprite.position.set(l.x, MM.heightAt(dimId, l.x, l.z) + l.h + 2.2, l.z); }
      group.add(tag.sprite);
    }

    const K = MM.kioskOf(dimId);
    const kiosk = makeKiosk(dim, dim.station);
    kiosk.position.set(K.x, MM.heightAt(dimId, K.x, K.z), K.z);
    if (MM.hasKiosk(dimId)) group.add(kiosk);

    // Lights
    // Flat, even light so colours read as painted: a strong neutral fill and a modest sun.
    const sun = new T.DirectionalLight(dim.sun, 0.55);
    sun.position.set(80, 140, 60);
    group.add(sun);
    const sky = new T.Color(dim.ambient).lerp(new T.Color('#ffffff'), 0.65), gnd = new T.Color(dim.ambient).lerp(new T.Color('#ffffff'), 0.4);
    group.add(new T.HemisphereLight(sky, gnd, 0.58));

    return {
      dim, group, kiosk,
      setAlive(id, alive) {
        const s = slots[id];
        if (!s) return;
        s.alive = alive;
        pack(s.set);
      },
      update(dt, t, camPos) {
        if (camPos && terrain && terrain.userData.update) terrain.userData.update(dt, camPos, !terrain.children.length);
        if (camPos && (lodT -= dt) <= 0) { lodT = 0.1; updateLod(camPos); }
        kiosk.userData.ring.userData.tick(dt);
        kiosk.userData.ring.rotation.y = Math.sin(t * 0.5) * 0.3;
        if (group.userData.eye && camPos) group.userData.eye.lookAt(camPos);
        group.children[0].position.copy(camPos || v.set(0, 0, 0));
        if (group.userData.spaceSky && camPos) group.userData.spaceSky.position.copy(camPos);
      },
      dispose() {
        group.traverse(o => {
          if (o.geometry && !Object.values(C.prim).includes(o.geometry) && !o.userData.shared) {
            let shared = false;
            for (const k in modelCache) if (modelCache[k].lit === o.geometry || modelCache[k].glow === o.geometry) shared = true;
            if (!shared) o.geometry.dispose();
          }
          // Name tags and signs: their canvas textures belong to this world only.
          if (o.isSprite && o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        });
      },
    };
  };
})();
