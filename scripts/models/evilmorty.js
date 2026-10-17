'use strict';
// Evil Morty: Morty's build (morty.js) with the eyepatch over his right eye, a level, cold stare
// and a hard flat mouth.
const morty = require('./morty');
module.exports = Object.assign({}, morty, {
  build: morty.make({
    eyes: { patch: -1, pupil: 0.022, look: [0, -0.004] },
    brows: { tilt: 0.03, thick: 0.011, y: 1.8 },
    mouth: { y: 1.497, z: 0.262, w: 0.055, curve: 0, thick: 0.0085, wrap: 0.35 },
  }),
});
