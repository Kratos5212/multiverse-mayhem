'use strict';
// Summer Smith, sculpted with Mojulo (scripts/mojulo-character.js): a teenager, slim, an oval face,
// long orange hair in a ponytail, a pink tank top, white jeans and white sneakers, her toy gun.
// Joints as js/avatar.js builds a Summer (height 1.12, width 0.8, head 0.98).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.9047, 0],
  armL: [-0.2384, 1.5304, 0], foreL: [-0.2384, 1.1496, 0], armR: [0.2384, 1.5304, 0], foreR: [0.2384, 1.1496, 0],
  legL: [-0.088, 0.9408, 0], shinL: [-0.088, 0.4516, 0], legR: [0.088, 0.9408, 0], shinR: [0.088, 0.4516, 0],
};
const SKIN = '#fcd9bd', HAIR = '#e8692e', HAIR_D = '#c9531f', TOP = '#f68fb8', PANTS = '#f6f6f2', SHOE = '#f4f6f8';
function build(M, S) {
  const cy = 1.93, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.2, 0.235, 0.2], skin: SKIN,
    jaw: { c: [0, cy - 0.12, 0.035], r: [0.15, 0.13, 0.16] },
    ears: { y: cy - 0.03, r: 0.038 },
    nose: { y: cy - 0.05, z: 0.205, r: 0.017, len: 0.028 },
    mouth: { y: cy - 0.155, z: 0.18, w: 0.045, curve: 0.002, thick: 0.0075, wrap: 0.4 },
    eyes: { y: cy + 0.02, x: 0.06, z: 0.155, r: [0.06, 0.066, 0.045], pupil: 0.018, rimW: 0.009 },
    brows: { color: HAIR_D, y: cy + 0.11, z: 0.18, len: 0.06, thick: 0.007, tilt: -0.006 },
  });
  // Hair: a cap parted to one side, a long swept fringe, and a ponytail tied at the back.
  M.add(H, S.ell([0, cy + 0.04, -0.015], [0.214, 0.235, 0.215]), HAIR);
  M.add(H, S.ell([-0.06, cy + 0.15, 0.1], [0.15, 0.07, 0.12]), HAIR, { k: 0.04 });             // the swept fringe
  for (const sx of [-1, 1]) M.add(H, S.ell([sx * 0.17, cy - 0.06, -0.02], [0.06, 0.16, 0.13]), HAIR, { k: 0.04 });   // down the sides
  M.carve(H, S.ell([0.02, cy - 0.06, 0.16], [0.17, 0.17, 0.14]), { k: 0.03, only: HAIR });        // the face
  M.carve(H, S.ell([0, cy - 0.3, 0.05], [0.3, 0.12, 0.3]), { k: 0.03, only: HAIR });
  M.add(H, S.sphere([0, cy + 0.06, -0.21], 0.05), HAIR_D, { k: 0.02 });                          // the hair tie
  M.add(H, S.cap([0, cy + 0.04, -0.23], [0, cy - 0.32, -0.27], 0.07, 0.035), HAIR, { k: 0.03 });  // the ponytail
  K.torso(M, S, { hip: 0.9408, shoulder: 1.5304, sx: 0.165, depth: 0.105, skin: SKIN, shirt: TOP, pants: PANTS, neck: [0.042, 1.74], top: 'tank', bust: true, waist: 0.78, hipW: 0.95 });
  K.limbs(M, S, J, { r: 0.036, skin: SKIN, sleeveLen: 0, gun: '#ff8fd0' }, { r: 0.058, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#d8dadf', ankle: 0.1, shoeLen: 0.115, shoeW: 0.058 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2200, armL: 300, armR: 300, foreL: 800, foreR: 1400, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.011, cells: { head: 0.006, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
