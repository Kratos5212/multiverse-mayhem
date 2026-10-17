'use strict';
// Unity, sculpted with Mojulo (scripts/mojulo-character.js): a pale blonde bob, heavy sleepy lids, a
// small smile, a teal sweater, black trousers and shoes. Joints as js/avatar.js builds Unity's host
// (height 1.12, width 0.82, head 0.96).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.9, 0],
  armL: [-0.2444, 1.5304, 0], foreL: [-0.2444, 1.1496, 0], armR: [0.2444, 1.5304, 0], foreR: [0.2444, 1.1496, 0],
  legL: [-0.0902, 0.9408, 0], shinL: [-0.0902, 0.4516, 0], legR: [0.0902, 0.9408, 0], shinR: [0.0902, 0.4516, 0],
};
const SKIN = '#f6dcc4', HAIR = '#f2e2a0', HAIR_D = '#d8c47a', TOP = '#5fd6b0', PANTS = '#2a2a2a', SHOE = '#1e1e1e';
function build(M, S) {
  const cy = 1.925, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.198, 0.232, 0.2], skin: SKIN,
    jaw: { c: [0, cy - 0.12, 0.035], r: [0.15, 0.13, 0.16] },
    ears: { y: cy - 0.03, r: 0.036 },
    nose: { y: cy - 0.05, z: 0.205, r: 0.016, len: 0.028 },
    mouth: { y: cy - 0.15, z: 0.182, w: 0.045, curve: 0.012, thick: 0.0075, wrap: 0.4 },
    eyes: { y: cy + 0.015, x: 0.06, z: 0.155, r: [0.058, 0.062, 0.044], pupil: 0.017, rimW: 0.009, lids: SKIN, lidCut: 0.5, lidLine: '#3a2a20', look: [0, -0.012] },
    brows: { color: HAIR_D, y: cy + 0.1, z: 0.18, len: 0.06, thick: 0.006, tilt: -0.008 },
  });
  M.add(H, S.ell([0, cy + 0.04, -0.02], [0.218, 0.24, 0.222]), HAIR);
  for (const sx of [-1, 1]) M.add(H, S.ell([sx * 0.17, cy - 0.05, -0.02], [0.075, 0.17, 0.17]), HAIR, { k: 0.05 });
  M.add(H, S.ell([0, cy - 0.06, -0.12], [0.2, 0.16, 0.12]), HAIR, { k: 0.05 });
  M.add(H, S.ell([0, cy + 0.15, 0.12], [0.18, 0.06, 0.1]), HAIR, { k: 0.04 });          // a straight fringe
  M.carve(H, S.ell([0, cy - 0.07, 0.17], [0.165, 0.17, 0.14]), { k: 0.03, only: HAIR });
  M.carve(H, S.box([0, cy - 0.3, 0], [0.4, 0.07, 0.4], 0.02), { k: 0.03, only: HAIR });
  K.torso(M, S, { hip: 0.9408, shoulder: 1.5304, sx: 0.165, depth: 0.105, skin: SKIN, shirt: TOP, pants: PANTS, neck: [0.042, 1.74], top: 'sweater', bust: true, waist: 0.8, hipW: 0.97 });
  K.limbs(M, S, J, { r: 0.036, skin: SKIN, sleeve: TOP, sleeveLen: 1, sleeveR: 1.4 }, { r: 0.06, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#111111', ankle: 0.08, shoeLen: 0.11, shoeW: 0.052 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2200, armL: 350, armR: 350, foreL: 800, foreR: 800, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.011, cells: { head: 0.006, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
