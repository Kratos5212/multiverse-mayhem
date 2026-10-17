'use strict';
// A Gromflomite trooper of the Galactic Federation, sculpted with Mojulo (scripts/mojulo-character.js):
// a green fly's head with huge red compound eyes, antennae and mandibles, a white armoured
// jumpsuit with a black collar, grey-blue legs, dark boots, a rifle. The wings stay the game's own.
// Joints as js/avatar.js builds a trooper (height 1.18, head 1).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.9991, 0],
  armL: [-0.298, 1.6156, 0], foreL: [-0.298, 1.2144, 0], armR: [0.298, 1.6156, 0], foreR: [0.298, 1.2144, 0],
  legL: [-0.11, 0.9912, 0], shinL: [-0.11, 0.4758, 0], legR: [0.11, 0.9912, 0], shinR: [0.11, 0.4758, 0],
};
const HEAD = '#6f8a5a', HEAD_D = '#4e6640', EYE = '#d8342a', EYE_L = '#ff7a5a', SUIT = '#d8e4ea', SUIT_D = '#aebcc6', PANTS = '#8aa2b4', BOOT = '#2a3440';
function build(M, S) {
  const cy = 2.08, H = 'head';
  M.add(H, S.ell([0, cy, 0], [0.17, 0.2, 0.17]), HEAD);
  M.add(H, S.ell([0, cy - 0.12, 0.08], [0.11, 0.1, 0.11]), HEAD, { k: 0.05 });                      // the snout
  for (const sx of [-1, 1]) {
    // Big glossy compound eyes, a light spot on each; antennae; mandibles.
    M.add(H, S.ell([sx * 0.12, cy + 0.05, 0.08], [0.1, 0.12, 0.1]), EYE, { k: 0.01 });
    M.add(H, S.ell([sx * 0.13, cy + 0.1, 0.16], [0.025, 0.025, 0.015]), EYE_L, { solo: true });
    M.add(H, S.cap([sx * 0.05, cy + 0.17, 0.05], [sx * 0.14, cy + 0.36, 0.12], 0.012, 0.007), HEAD_D, { k: 0.01 });
    M.add(H, S.sphere([sx * 0.14, cy + 0.37, 0.12], 0.02), HEAD_D, { k: 0.01 });
    M.add(H, S.cap([sx * 0.05, cy - 0.17, 0.15], [sx * 0.02, cy - 0.24, 0.17], 0.018, 0.006), HEAD_D, { k: 0.01 });
  }
  M.add(H, S.cap([-0.04, cy - 0.17, 0.18], [0.04, cy - 0.17, 0.18], 0.006), '#2a2a2a', { solo: true });   // the mouth slit
  K.torso(M, S, { hip: 0.9912, shoulder: 1.6156, sx: 0.2, depth: 0.13, skin: HEAD, shirt: SUIT, pants: PANTS, neck: [0.055, 1.85], top: 'turtle', belt: '#3a4450' });
  const T = 'torso';
  M.add(T, S.cap([0, 1.6, 0], [0, 1.68, 0], 0.085), '#222830', { k: 0.01 });                         // the black collar
  M.add(T, S.box([0, 1.38, 0.13], [0.11, 0.13, 0.012], 0.01), SUIT_D, { k: 0.01 });                  // the chest plate
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * 0.19, 1.6, 0], [0.11, 0.065, 0.12]), SUIT_D, { k: 0.03 });
  K.limbs(M, S, J, { r: 0.045, skin: HEAD, sleeve: SUIT, sleeveLen: 1, sleeveR: 1.4, cuff: SUIT_D, gun: '#5ff8ff' }, { r: 0.07, pants: PANTS, skin: HEAD, shoe: BOOT, sole: '#111111', sock: BOOT, ankle: 0.15, shoeLen: 0.13, shoeW: 0.072 });
}
module.exports = { joints: J, build, budget: { head: 3400, torso: 2400, armL: 350, armR: 350, foreL: 800, foreR: 1400, legL: 400, legR: 400, shinL: 650, shinR: 650 }, cell: 0.012, cells: { head: 0.007, foreL: 0.005, foreR: 0.005 }, soloCell: 0.003 };
