'use strict';
// Mr. Poopybutthole, sculpted with Mojulo (scripts/mojulo-character.js): a yellow bean, his face
// halfway up, big eyes, a huge grin, a black top hat; thin little arms and legs, round feet.
// Joints as js/avatar.js builds a Beanling (height 1.15, head 1).
const K = require('./kit');
const J = {
  torso: [0, 0, 0], head: [0, 1.4524, 0],
  armL: [-0.268, 1.2673, 0], foreL: [-0.268, 0.9338, 0], armR: [0.268, 1.2673, 0], foreR: [0.268, 0.9338, 0],
  legL: [-0.12, 0.6325, 0], shinL: [-0.12, 0.3036, 0], legR: [0.12, 0.6325, 0], shinR: [0.12, 0.3036, 0],
};
const BEAN = '#ffd447', BEAN_D = '#e8b830', HAT = '#1e1e22', BAND = '#3a3a44';
function build(M, S) {
  // The body is the bean (it stays still); the face and the hat ride the head joint.
  M.add('torso', S.cap([0, 0.62, 0], [0, 1.66, -0.01], 0.29), BEAN);
  M.add('torso', S.ell([0, 0.66, 0.01], [0.29, 0.14, 0.27]), BEAN, { k: 0.08 });
  // His face rides the head joint, drawn right on the bean: huge eyes, a wide happy grin.
  const H = 'head', cy = 1.47;
  M.add(H, S.ell([0, cy + 0.06, 0.2], [0.05, 0.05, 0.05]), BEAN);   // (the head's anchor, hidden in the bean)
  K.head(M, S, {
    c: [0, cy, 0.0], r: [0.01, 0.01, 0.01], skin: BEAN,
    eyes: { y: cy + 0.1, x: 0.102, z: 0.24, r: [0.1, 0.115, 0.06], pupil: 0.028, rimW: 0.012 },
  });
  M.add(H, S.ell([0, cy - 0.085, 0.27], [0.105, 0.05, 0.035]), '#3a0d16', { solo: true });          // the grin
  M.carve(H, S.ell([0, cy - 0.045, 0.3], [0.13, 0.05, 0.06]), { k: 0.01, only: '#3a0d16' });
  M.add(H, S.ell([0, cy - 0.075, 0.278], [0.085, 0.017, 0.03]), '#fbfbf6', { solo: true });          // teeth
  M.add(H, S.cap([-0.11, cy - 0.06, 0.27], [0.11, cy - 0.06, 0.27], 0.006), '#5a2a2a', { solo: true });
  // The top hat, tipped back a touch: a brim, a tall crown and a band.
  M.add(H, S.cyl([0, 1.82, -0.02], [0, 1.845, -0.02], 0.25), HAT);
  M.add(H, S.cyl([0, 1.84, -0.025], [0, 2.12, -0.04], 0.155), HAT, { k: 0.008 });
  M.add(H, S.cyl([0, 1.86, -0.026], [0, 1.91, -0.028], 0.162), BAND, { k: 0.002 });
  K.limbs(M, S, J, { r: 0.028, skin: BEAN, sleeveLen: 0, handSize: 1.2 }, null);
  for (const side of [-1, 1]) {
    const th = side < 0 ? 'legL' : 'legR', sh = side < 0 ? 'shinL' : 'shinR', x = side * 0.12;
    M.add(th, S.cap([x, 0.6325, 0], [x, 0.3036, 0], 0.035, 0.032), BEAN);
    M.add(sh, S.cap([x, 0.3036, 0], [x, 0.05, 0.01], 0.032, 0.03), BEAN);
    M.add(sh, S.ell([x, 0.04, 0.05], [0.06, 0.04, 0.09]), BEAN_D, { k: 0.02 });
  }
}
module.exports = { joints: J, build, budget: { head: 3600, torso: 4800, armL: 250, armR: 250, foreL: 500, foreR: 500, legL: 250, legR: 250, shinL: 400, shinR: 400 }, cell: 0.012, cells: { head: 0.007, foreL: 0.004, foreR: 0.004, legL: 0.008, legR: 0.008, shinL: 0.008, shinR: 0.008 }, soloCell: 0.003 };
