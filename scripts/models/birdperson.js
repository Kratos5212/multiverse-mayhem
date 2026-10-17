'use strict';
// Birdperson, sculpted with Mojulo (scripts/mojulo-character.js): a tall bird man, a feathered brown
// head with a pale face mask, a heavy yellow beak, a crest of long feathers sweeping back, stern
// brows; a brown leather harness over a tan tunic, dark trousers, boots. His wings stay the game's
// own (they flap). Joints as js/avatar.js builds a Birdperson (height 1.25, head 1).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 2.1037, 0],
  armL: [-0.298, 1.715, 0], foreL: [-0.298, 1.29, 0], armR: [0.298, 1.715, 0], foreR: [0.298, 1.29, 0],
  legL: [-0.11, 1.05, 0], shinL: [-0.11, 0.504, 0], legR: [0.11, 1.05, 0], shinR: [0.11, 0.504, 0],
};
const FEATHER = '#8a5a34', FEATHER_D = '#6a4024', CREST = '#b8642e', FACE = '#e8c49a', BEAK = '#f0c040', BEAK_D = '#c89a2a',
  ARMOR = '#6b4a2b', TUNIC = '#c9a77a', PANTS = '#5a3a20', BOOT = '#2a2a2a', SKIN = '#c89a6a';
function build(M, S) {
  const cy = 2.17, H = 'head';
  K.head(M, S, {
    c: [0, cy, 0], r: [0.17, 0.21, 0.19], skin: FEATHER,
    eyes: { y: cy + 0.04, x: 0.07, z: 0.135, r: [0.048, 0.05, 0.038], pupil: 0.014, rimW: 0.007, lids: FACE, lidCut: 0.3, lidLine: '#3a2a20' },
    brows: { color: FEATHER_D, y: cy + 0.1, z: 0.165, len: 0.07, thick: 0.012, tilt: 0.03 },
  });
  M.add(H, S.ell([0, cy + 0.01, 0.1], [0.15, 0.13, 0.1]), FACE, { k: 0.03 });                       // the pale mask round the eyes
  M.carve(H, S.box([0, cy - 0.17, 0.2], [0.3, 0.08, 0.2], 0.02), { k: 0.02, only: FACE });
  // The beak: a hooked upper half and a smaller lower one.
  M.add(H, S.cap([0, cy - 0.02, 0.15], [0, cy - 0.09, 0.33], 0.065, 0.02), BEAK, { k: 0.02 });
  M.add(H, S.cap([0, cy - 0.09, 0.33], [0, cy - 0.13, 0.32], 0.02, 0.008), BEAK_D, { k: 0.01 });
  M.add(H, S.cap([0, cy - 0.08, 0.13], [0, cy - 0.12, 0.26], 0.04, 0.012), BEAK_D, { k: 0.02 });
  // The crest: long feathers sweeping up and back from the crown.
  for (let i = 0; i < 7; i++) {
    const a = -0.75 + i * 0.25, x = Math.sin(a) * 0.06;
    M.add(H, S.cap([x, cy + 0.17, 0.02 - i * 0.02], [x * 2.2, cy + 0.36 - i * 0.02, -0.18 - i * 0.03], 0.035, 0.008), i % 2 ? CREST : FEATHER_D, { k: 0.02 });
  }
  M.add(H, S.cap([0, cy - 0.05, -0.12], [0, cy - 0.2, -0.16], 0.1, 0.06), FEATHER, { k: 0.04 });     // the back of the neck
  // Body: a tan tunic with a leather chest piece, belt and harness straps.
  K.torso(M, S, { hip: 1.05, shoulder: 1.715, sx: 0.245, depth: 0.16, skin: FEATHER, shirt: ARMOR, pants: PANTS, neck: [0.07, 1.98], top: 'none', belt: '#3a2614', belly: 0.95, waist: 0.9 });
  const T = 'torso';
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * 0.22, 1.7, 0], [0.13, 0.07, 0.14]), '#5a3a20', { k: 0.03 });   // pauldrons
  M.add(T, S.cap([-0.2, 1.7, 0.15], [0.17, 1.15, 0.165], 0.02), '#3a2614', { k: 0.01 });             // a strap across
  M.add(T, S.ell([0, 1.85, -0.03], [0.1, 0.1, 0.09]), FEATHER, { k: 0.05 });                          // a ruff of feathers at the neck
  K.limbs(M, S, J, { r: 0.052, skin: FEATHER, sleeve: ARMOR, sleeveLen: 0.42, sleeveR: 1.4 }, { r: 0.07, pants: PANTS, skin: SKIN, shoe: BOOT, sole: '#111111', sock: BOOT, ankle: 0.14, shoeLen: 0.13, shoeW: 0.07 });
}
module.exports = { joints: J, build, budget: { head: 4200, torso: 2600, armL: 350, armR: 350, foreL: 700, foreR: 700, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.012, cells: { head: 0.007, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
