'use strict';
// Jerry Smith, sculpted with Mojulo (scripts/mojulo-character.js): a long face with a weak chin, short
// brown hair parted on the side, a green polo shirt, khakis, brown shoes, the toy gun.
// Joints as js/avatar.js builds a Jerry (height 1.2, width 0.9, head 0.96).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 2.0196, 0],
  armL: [-0.2682, 1.644, 0], foreL: [-0.2682, 1.236, 0], armR: [0.2682, 1.644, 0], foreR: [0.2682, 1.236, 0],
  legL: [-0.099, 1.008, 0], shinL: [-0.099, 0.4838, 0], legR: [0.099, 1.008, 0], shinR: [0.099, 0.4838, 0],
};
const SKIN = '#f6d6bc', HAIR = '#5a3a22', POLO = '#5c9a4a', POLO_D = '#4a8a3c', PANTS = '#b8a888', SHOE = '#4a2e1c';
function build(M, S) {
  const cy = 2.05, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.19, 0.25, 0.2], skin: SKIN,
    jaw: { c: [0, cy - 0.15, 0.04], r: [0.14, 0.14, 0.155] },
    ears: { y: cy - 0.03, r: 0.04 },
    nose: { y: cy - 0.06, z: 0.205, r: 0.02, len: 0.04, droop: 0.01 },
    mouth: { y: cy - 0.17, z: 0.185, w: 0.05, curve: -0.006, thick: 0.0075, wrap: 0.4 },
    eyes: { y: cy + 0.02, x: 0.062, z: 0.155, r: [0.06, 0.066, 0.045], pupil: 0.017, rimW: 0.009 },
    brows: { color: HAIR, y: cy + 0.11, z: 0.185, len: 0.06, thick: 0.008, tilt: -0.012 },
  });
  // Short hair with a side part, a little swept back over the forehead.
  M.add(H, S.ell([0, cy + 0.07, -0.02], [0.205, 0.215, 0.215]), HAIR);
  M.add(H, S.ell([0.04, cy + 0.19, 0.08], [0.15, 0.06, 0.12]), HAIR, { k: 0.04 });
  M.carve(H, S.ell([0, cy - 0.05, 0.17], [0.18, 0.2, 0.15]), { k: 0.03, only: HAIR });
  M.carve(H, S.ell([0, cy - 0.22, 0.0], [0.3, 0.18, 0.3]), { k: 0.03, only: HAIR });
  for (const sx of [-1, 1]) M.carve(H, S.ell([sx * 0.2, cy - 0.04, 0.02], [0.05, 0.08, 0.07]), { k: 0.02, only: HAIR });
  M.carve(H, S.cap([-0.07, cy + 0.27, 0.0], [-0.07, cy + 0.2, 0.2], 0.008), { k: 0.004, only: HAIR });   // the part
  K.torso(M, S, { hip: 1.008, shoulder: 1.644, sx: 0.18, depth: 0.12, skin: SKIN, shirt: POLO, pants: PANTS, neck: [0.048, 1.88], top: 'polo', collar: POLO_D, belly: 1.05, belt: '#4a3524' });
  K.limbs(M, S, J, { r: 0.04, skin: SKIN, sleeve: POLO, sleeveLen: 0.42, sleeveR: 1.5, gun: '#ff8fd0' }, { r: 0.064, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#2a1a10', ankle: 0.08, shoeLen: 0.13, shoeW: 0.06 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2400, armL: 350, armR: 350, foreL: 800, foreR: 1400, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.011, cells: { head: 0.006, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
