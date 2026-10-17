'use strict';
// Beth Smith, sculpted with Mojulo (scripts/mojulo-character.js): a blonde bob to the jaw, a red
// long-sleeved top, dark jeans, brown flats. Joints as js/avatar.js builds a Beth (height 1.14, width 0.82, head 0.96).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.9299, 0],
  armL: [-0.2444, 1.5588, 0], foreL: [-0.2444, 1.1712, 0], armR: [0.2444, 1.5588, 0], foreR: [0.2444, 1.1712, 0],
  legL: [-0.0902, 0.9576, 0], shinL: [-0.0902, 0.4596, 0], legR: [0.0902, 0.9576, 0], shinR: [0.0902, 0.4596, 0],
};
const SKIN = '#fcd9bd', HAIR = '#f3d47a', HAIR_D = '#d8b458', TOP = '#c8273a', PANTS = '#34416e', SHOE = '#4a2e1c';
function build(M, S) {
  const cy = 1.955, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.198, 0.235, 0.2], skin: SKIN,
    jaw: { c: [0, cy - 0.12, 0.035], r: [0.15, 0.13, 0.16] },
    ears: { y: cy - 0.03, r: 0.036 },
    nose: { y: cy - 0.05, z: 0.205, r: 0.017, len: 0.03 },
    mouth: { y: cy - 0.155, z: 0.18, w: 0.045, curve: 0, thick: 0.0075, wrap: 0.4 },
    eyes: { y: cy + 0.02, x: 0.06, z: 0.155, r: [0.058, 0.064, 0.044], pupil: 0.017, rimW: 0.009, lids: SKIN, lidCut: 0.22, lidLine: '#3a2a20' },
    brows: { color: HAIR_D, y: cy + 0.105, z: 0.18, len: 0.06, thick: 0.0065, tilt: 0.004 },
  });
  // The bob: full on top, falling straight to the jaw at the sides and back, a side-swept fringe.
  M.add(H, S.ell([0, cy + 0.04, -0.02], [0.218, 0.24, 0.222]), HAIR);
  for (const sx of [-1, 1]) M.add(H, S.ell([sx * 0.17, cy - 0.07, -0.02], [0.075, 0.18, 0.17]), HAIR, { k: 0.05 });
  M.add(H, S.ell([0, cy - 0.08, -0.12], [0.2, 0.17, 0.12]), HAIR, { k: 0.05 });
  M.add(H, S.ell([0.05, cy + 0.15, 0.11], [0.16, 0.07, 0.12]), HAIR, { k: 0.04 });
  M.carve(H, S.ell([-0.01, cy - 0.06, 0.17], [0.165, 0.175, 0.14]), { k: 0.03, only: HAIR });
  M.carve(H, S.box([0, cy - 0.33, 0], [0.4, 0.07, 0.4], 0.02), { k: 0.03, only: HAIR });            // cut straight at the jaw
  K.torso(M, S, { hip: 0.9576, shoulder: 1.5588, sx: 0.165, depth: 0.105, skin: SKIN, shirt: TOP, pants: PANTS, neck: [0.042, 1.77], top: 'sweater', bust: true, waist: 0.8, hipW: 0.97 });
  K.limbs(M, S, J, { r: 0.036, skin: SKIN, sleeve: TOP, sleeveLen: 1, sleeveR: 1.4 }, { r: 0.06, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#2a1a10', ankle: 0.08, shoeLen: 0.11, shoeW: 0.052 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2200, armL: 350, armR: 350, foreL: 800, foreR: 800, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.011, cells: { head: 0.006, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
