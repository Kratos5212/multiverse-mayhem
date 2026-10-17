'use strict';
// Mr. Meeseeks, sculpted with Mojulo (scripts/mojulo-character.js): tall, pale blue, a long smooth
// head, dot eyes, a big open "Ooh!" mouth, long noodle limbs, no clothes.
// Joints as js/avatar.js builds a Meeseeks (height 1.3, width 0.78, head 1.2).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 2.2255, 0],
  armL: [-0.2324, 1.786, 0], foreL: [-0.2324, 1.344, 0], armR: [0.2324, 1.786, 0], foreR: [0.2324, 1.344, 0],
  legL: [-0.0858, 1.092, 0], shinL: [-0.0858, 0.5242, 0], legR: [0.0858, 1.092, 0], shinR: [0.0858, 0.5242, 0],
};
const SKIN = '#6ec4f0', SKIN_D = '#4aa6d8';
function build(M, S) {
  const cy = 2.29, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.205, 0.3, 0.205], skin: SKIN,
    jaw: { c: [0, cy - 0.17, 0.03], r: [0.17, 0.16, 0.18] },
    ears: { y: cy - 0.02, r: 0.04 },
    nose: { y: cy - 0.03, z: 0.215, r: 0.022, len: 0.04 },
    mouth: { y: cy - 0.16, z: 0.205, w: 0.075, curve: 0.02, open: 0.07, tongue: true, teeth: true, thick: 0.009, wrap: 0.45, color: '#1e3a5a' },
    eyes: { y: cy + 0.06, x: 0.065, z: 0.17, r: [0.052, 0.058, 0.04], pupil: 0.012, rimW: 0.008, rim: '#1e3a5a' },
  });
  const T = 'torso';
  M.add(T, S.cap([0, 1.8, 0], [0, 2.08, 0.005], 0.06), SKIN, { k: 0.02 });                     // neck
  M.add(T, S.ell([0, 1.6, 0], [0.155, 0.24, 0.1]), SKIN, { k: 0.05 });
  M.add(T, S.ell([0, 1.27, 0.005], [0.14, 0.24, 0.1]), SKIN, { k: 0.08 });
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * 0.15, 1.77, 0], [0.07, 0.05, 0.07]), SKIN, { k: 0.05 });
  M.add(T, S.ell([0, 1.38, 0.098], [0.008, 0.008, 0.004]), SKIN_D, { solo: true });            // belly button
  K.limbs(M, S, J, { r: 0.034, skin: SKIN, sleeveLen: 0 }, { r: 0.05, pants: SKIN, skin: SKIN, shoe: SKIN, sole: SKIN_D, ankle: 0.06, shoeLen: 0.1, shoeW: 0.05, flare: 0.8 });
}
module.exports = { joints: J, build, budget: { head: 3800, torso: 1800, armL: 300, armR: 300, foreL: 700, foreR: 700, legL: 350, legR: 350, shinL: 500, shinR: 500 }, cell: 0.012, cells: { head: 0.007, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
