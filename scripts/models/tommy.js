'use strict';
// Tommy (Froopyland), sculpted with Mojulo (scripts/mojulo-character.js): a big wide man, a round
// face with a big grin, a brown afro under a gold crown, a pink shirt under a brown vest, purple
// trousers, brown shoes. Joints as js/avatar.js builds Tommy (height 1.25, width 1.3, head 1.05).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 2.1155, 0],
  armL: [-0.3874, 1.715, 0], foreL: [-0.3874, 1.29, 0], armR: [0.3874, 1.715, 0], foreR: [0.3874, 1.29, 0],
  legL: [-0.143, 1.05, 0], shinL: [-0.143, 0.504, 0], legR: [0.143, 1.05, 0], shinR: [0.143, 0.504, 0],
};
const SKIN = '#f2c8a8', HAIR = '#6a4424', VEST = '#7a5a3a', SHIRT = '#ff8fc8', PANTS = '#5a4a6a', SHOE = '#3a2a1a', GOLD = '#ffd84d', GEM = '#e8405a';
function build(M, S) {
  const cy = 2.15, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.23, 0.24, 0.22], skin: SKIN,
    jaw: { c: [0, cy - 0.12, 0.04], r: [0.21, 0.15, 0.18] },
    ears: { y: cy - 0.02, r: 0.045 },
    nose: { y: cy - 0.05, z: 0.235, r: 0.026, len: 0.035 },
    mouth: { y: cy - 0.15, z: 0.2, w: 0.09, curve: 0.035, open: 0.03, teeth: true, thick: 0.008, wrap: 0.45 },
    eyes: { y: cy + 0.04, x: 0.07, z: 0.17, r: [0.065, 0.072, 0.05], pupil: 0.019, rimW: 0.009 },
    brows: { color: HAIR, y: cy + 0.13, z: 0.2, len: 0.065, thick: 0.01, tilt: -0.012 },
  });
  // The afro, and the crown sitting on it.
  // A big round afro of bumpy curls.
  M.add(H, S.ell([0, cy + 0.14, -0.04], [0.33, 0.29, 0.31]), HAIR);
  for (let i = 0; i < 14; i++) { const a = i * 2.39996, y = 0.06 + (i % 4) * 0.08, rr = 0.3 - (i % 4) * 0.04; M.add(H, S.sphere([Math.sin(a) * rr, cy + y + 0.08, -0.04 + Math.cos(a) * rr * 0.95], 0.09), HAIR, { k: 0.05 }); }
  M.carve(H, S.ell([0, cy - 0.06, 0.22], [0.25, 0.22, 0.17]), { k: 0.03, only: HAIR });
  M.carve(H, S.ell([0, cy - 0.32, 0], [0.45, 0.18, 0.45]), { k: 0.03, only: HAIR });
  // The gold crown on top, points all round and a red jewel in front.
  M.add(H, S.cyl([0, cy + 0.38, -0.04], [0, cy + 0.47, -0.04], 0.15), GOLD, { k: 0.004 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; M.add(H, S.cap([Math.sin(a) * 0.13, cy + 0.46, -0.04 + Math.cos(a) * 0.13], [Math.sin(a) * 0.14, cy + 0.58, -0.04 + Math.cos(a) * 0.14], 0.03, 0.006), GOLD, { k: 0.01 }); }
  M.add(H, S.sphere([0, cy + 0.425, 0.115], 0.026), GEM, { solo: true });
  // A big round body: pink shirt, brown vest open down the front.
  K.torso(M, S, { hip: 1.05, shoulder: 1.715, sx: 0.29, depth: 0.22, skin: SKIN, shirt: SHIRT, pants: PANTS, neck: [0.08, 1.95], top: 'tshirt', belly: 1.25, waist: 1.0, hipW: 0.95 });
  const T = 'torso';
  // The vest: a thin shell hugging the body (the torso's two masses, grown), open down the front,
  // at the arms and above the trousers.
  M.add(T, S.shell(S.ell([0, 1.5155, 0], [0.2955, 0.2993, 0.24]), 0.01), VEST);
  M.add(T, S.shell(S.ell([0, 1.3027, 0.005], [0.31, 0.2727, 0.295]), 0.01), VEST, { k: 0.06 });
  M.carve(T, S.box([0, 1.0, 0], [0.5, 0.13, 0.5], 0.01), { k: 0.02, only: VEST });
  M.carve(T, S.box([0, 1.4, 0.3], [0.1, 0.45, 0.14], 0.03), { k: 0.02, only: VEST });
  for (const sx of [-1, 1]) M.carve(T, S.ell([sx * 0.33, 1.62, 0], [0.09, 0.14, 0.14]), { k: 0.02, only: VEST });
  M.carve(T, S.box([0, 1.85, 0], [0.4, 0.12, 0.4], 0.01), { k: 0.02, only: VEST });
  K.limbs(M, S, J, { r: 0.06, skin: SKIN, sleeve: SHIRT, sleeveLen: 0.42, sleeveR: 1.4 }, { r: 0.095, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#1a1410', ankle: 0.09, shoeLen: 0.15, shoeW: 0.085 });
}
module.exports = { joints: J, build, budget: { head: 4400, torso: 2600, armL: 350, armR: 350, foreL: 700, foreR: 700, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.012, cells: { head: 0.007, torso: 0.006, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
