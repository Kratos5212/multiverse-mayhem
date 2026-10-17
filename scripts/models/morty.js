'use strict';
// Morty Smith, sculpted with Mojulo (scripts/mojulo-character.js). Built standing in the rest pose,
// feet at y = 0, facing +z, around the joints of the game's skeleton for a Morty (js/avatar.js,
// canon look: height 0.92, width 0.95, head 1.3). Evil Morty (evilmorty.js) is the same build with
// an eyepatch, a scowl and a gold-vialed gun.
//
//   node scripts/mojulo-character.js spec scripts/models/morty.js morty.spec.json
const K = require('./kit');

const J = {
  torso: [0, 0, 0],
  head: [0, 1.6809, 0],
  armL: [-0.2831, 1.2464, 0], foreL: [-0.2831, 0.9336, 0],
  armR: [0.2831, 1.2464, 0], foreR: [0.2831, 0.9336, 0],
  legL: [-0.1045, 0.7728, 0], shinL: [-0.1045, 0.3709, 0],
  legR: [0.1045, 0.7728, 0], shinR: [0.1045, 0.3709, 0],
};
const SKIN = '#fcd9bd', HAIR = '#6b3f1f', SHIRT = '#f8e04a', PANTS = '#2e5fa8', SHOE = '#f4f6f8', BROW = '#5a3418';

function make(o) {
  o = o || {};
  return function build(M, S) {
    // The head: big and round, a little wider at the top, brown hair like a helmet with a ragged edge.
    const cy = 1.665;
    K.head(M, S, {
      c: [0, cy, 0], r: [0.295, 0.3, 0.275], skin: SKIN,
      jaw: { c: [0, cy - 0.13, 0.04], r: [0.235, 0.17, 0.215] },
      ears: { y: cy - 0.03, r: 0.05 },
      nose: { y: cy - 0.07, z: 0.285, r: 0.024, len: 0.035 },
      mouth: o.mouth || { y: cy - 0.17, z: 0.262, w: 0.062, curve: -0.014, thick: 0.0085, wrap: 0.35 },
      eyes: Object.assign({ y: cy + 0.025, x: 0.088, z: 0.215, r: [0.088, 0.095, 0.062], pupil: 0.024, look: [0, 0.004] }, o.eyes || {}),
      brows: Object.assign({ color: BROW, y: cy + 0.15, z: 0.25, len: 0.08, thick: 0.0095, tilt: -0.012 }, o.brows || {}),
    });
    // Hair: a cap over the top and the back of the skull, cut off over the face and above the ears,
    // with tufts along the fringe and at the nape.
    const H = 'head';
    M.add(H, S.ell([0, cy + 0.045, -0.02], [0.31, 0.29, 0.295]), HAIR);
    for (const sx of [-1, 1]) M.add(H, S.ell([sx * 0.2, cy + 0.06, -0.06], [0.12, 0.2, 0.2]), HAIR, { k: 0.05 });
    M.add(H, S.ell([0, cy - 0.12, -0.12], [0.24, 0.16, 0.16]), HAIR, { k: 0.06 });                 // the back, down to the nape
    for (let i = -3; i <= 3; i++) M.add(H, S.ell([i * 0.065, cy + 0.155 - Math.abs(i) * 0.012, 0.215 - Math.abs(i) * 0.03], [0.05, 0.045, 0.05]), HAIR, { k: 0.03 });   // the fringe
    M.carve(H, S.ell([0, cy - 0.06, 0.2], [0.27, 0.2, 0.19]), { k: 0.03, only: HAIR });            // the face
    for (const sx of [-1, 1]) M.carve(H, S.ell([sx * 0.31, cy - 0.06, 0.03], [0.07, 0.11, 0.09]), { k: 0.03, only: HAIR });   // round the ears
    M.carve(H, S.ell([0, cy - 0.33, 0.02], [0.4, 0.17, 0.4]), { k: 0.04, only: HAIR });          // under the skull
    // Body: a yellow T-shirt, blue jeans, white sneakers.
    K.torso(M, S, { hip: 0.7728, shoulder: 1.2464, sx: 0.205, depth: 0.145, skin: SKIN, shirt: SHIRT, pants: PANTS, neck: [0.068, 1.42], top: 'tshirt', belly: 1.08, waist: 0.9 });
    for (const side of [-1, 1]) {
      K.arm(M, S, side, { x: side * 0.2831, shoulder: 1.2464, elbow: 0.9336, wrist: 0.64, r: 0.046, skin: SKIN, sleeve: SHIRT, sleeveLen: 0.42, sleeveR: 1.55, hand: side > 0 ? 'gun' : 'open', gun: o.gun || '#ffd84d' });
      K.leg(M, S, side, { x: side * 0.1045, hip: 0.7728, knee: 0.3709, r: 0.068, pants: PANTS, skin: SKIN, shoe: SHOE, sole: '#d8dadf', ankle: 0.1, shoeLen: 0.12, shoeW: 0.07, flare: 0.9 });
    }
    if (o.extra) o.extra(M, S);
  };
}

const budget = { head: 5200, torso: 2600, armL: 400, armR: 400, foreL: 900, foreR: 1500, legL: 400, legR: 400, shinL: 700, shinR: 700 };
module.exports = { joints: J, build: make(), make, budget, cell: 0.012, cells: { head: 0.007, foreL: 0.006, foreR: 0.006 }, soloCell: 0.003 };
