'use strict';
// Squanchy, sculpted with Mojulo (scripts/mojulo-character.js): a stout orange cat person, a big
// round head with pointed ears, a pale muzzle with whiskers, a fluffy tail, padded paws.
// Joints as js/avatar.js builds a Squanchy (height 1, width 1.05, head 1.2).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.777, 0],
  armL: [-0.3129, 1.36, 0], foreL: [-0.3129, 1.02, 0], armR: [0.3129, 1.36, 0], foreR: [0.3129, 1.02, 0],
  legL: [-0.1155, 0.84, 0], shinL: [-0.1155, 0.4032, 0], legR: [0.1155, 0.84, 0], shinR: [0.1155, 0.4032, 0],
};
const FUR = '#d08a3c', FUR_D = '#a8662a', PALE = '#f2d8b0', NOSE = '#7a3a2a', EAR_IN = '#e8a0a0';
function build(M, S) {
  const cy = 1.78, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.26, 0.24, 0.24], skin: FUR,
    jaw: { c: [0, cy - 0.1, 0.06], r: [0.22, 0.15, 0.2] },
    mouth: { y: cy - 0.115, z: 0.31, w: 0.06, curve: 0.02, thick: 0.007, wrap: 0.5 },
    eyes: { y: cy + 0.05, x: 0.085, z: 0.17, r: [0.08, 0.085, 0.06], pupil: 0.02, rimW: 0.009 },
    brows: { color: FUR_D, y: cy + 0.15, z: 0.21, len: 0.06, thick: 0.008, tilt: -0.01 },
  });
  M.add(H, S.ell([0, cy - 0.07, 0.2], [0.14, 0.09, 0.11]), PALE, { k: 0.03 });                     // the muzzle
  M.add(H, S.ell([0, cy - 0.025, 0.305], [0.03, 0.02, 0.018]), NOSE, { solo: true });
  for (const sx of [-1, 1]) {
    M.add(H, S.cap([sx * 0.17, cy + 0.14, -0.01], [sx * 0.24, cy + 0.36, -0.03], 0.075, 0.01), FUR, { k: 0.04 });   // ears
    M.add(H, S.cap([sx * 0.175, cy + 0.17, 0.035], [sx * 0.225, cy + 0.32, 0.015], 0.035, 0.006), EAR_IN, { solo: true });
    for (const dy of [-0.01, -0.04]) M.add(H, S.cap([sx * 0.1, cy - 0.06 + dy, 0.28], [sx * 0.3, cy - 0.04 + dy * 2, 0.2], 0.0035), '#3a2a20', { solo: true });   // whiskers
  }
  const T = 'torso';
  M.add(T, S.cap([0, 1.38, 0], [0, 1.6, 0], 0.09), FUR, { k: 0.02 });
  M.add(T, S.ell([0, 1.22, 0], [0.23, 0.22, 0.16]), FUR, { k: 0.05 });
  M.add(T, S.ell([0, 0.98, 0.01], [0.22, 0.2, 0.17]), FUR, { k: 0.08 });
  M.add(T, S.ell([0, 1.12, 0.1], [0.13, 0.22, 0.08]), PALE, { k: 0.05 });                           // the pale chest and belly
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * 0.22, 1.36, 0], [0.09, 0.07, 0.09]), FUR, { k: 0.06 });
  // The tail: thick, curling up behind.
  M.add(T, S.cap([0, 0.92, -0.14], [0, 0.85, -0.45], 0.075, 0.08), FUR, { k: 0.05 });
  M.add(T, S.cap([0, 0.85, -0.45], [0, 1.15, -0.7], 0.08, 0.085), FUR, { k: 0.04 });
  M.add(T, S.ell([0, 1.22, -0.72], [0.09, 0.11, 0.09]), FUR_D, { k: 0.04 });
  K.limbs(M, S, J, { r: 0.052, skin: FUR, sleeveLen: 0, handSize: 1.1 }, { r: 0.08, pants: FUR, skin: FUR, shoe: FUR_D, sole: FUR_D, ankle: 0.08, shoeLen: 0.12, shoeW: 0.08, flare: 0.8 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2400, armL: 300, armR: 300, foreL: 700, foreR: 700, legL: 350, legR: 350, shinL: 500, shinR: 500 }, cell: 0.012, cells: { head: 0.007, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
