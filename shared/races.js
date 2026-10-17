// Multiverse Mayhem: ring races. Go through the rings in order before the clock runs out; the
// first ring starts the race. Some are for ships, some on foot. Rings are [x, y, z] with y
// above the ground there (or, out in space, where it is). The host checks every ring
// (sim/host.js); the client draws them and the clock (js/game.js). A race on Earth runs on
// every Earth, and the space race in the sky of every Earth.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.RACES = [
    { id: 'skyrace', on: 'suburbia', name: 'Sky ring race', ship: true, time: 100, r: 9, color: '#5ff8ff', give: { p: 3, c: 2, k: 3 },
      blurb: 'By ship, over the suburb and Downtown.',
      rings: [[0, 35, -40], [0, 45, -110], [60, 60, -160], [150, 70, -120], [250, 60, -40], [380, 90, 0], [300, 70, 90], [160, 55, 140], [40, 45, 160], [-80, 50, 110], [-120, 40, 20], [-40, 35, -10]] },
    { id: 'streetrun', on: 'suburbia', name: 'Street sprint', foot: true, time: 60, r: 3.2, color: '#ffd84d', give: { s: 4, k: 2 },
      blurb: 'On foot, round the block. Sprint!',
      rings: [[0, 1.6, -30], [0, 1.6, -75], [30, 1.6, -88], [66, 1.6, -88], [88, 1.6, -60], [88, 1.6, -22], [60, 1.6, 0], [25, 1.6, 0]] },
    { id: 'slalom', on: 'space:suburbia', name: 'Moon slalom', ship: true, abs: true, time: 120, r: 16, color: '#b46aff', give: { c: 4, g: 2, k: 2 },
      blurb: 'In space, round the Moon and back.',
      rings: [[0, 160, 60], [90, 150, 120], [200, 120, 60], [270, 60, -40], [230, 90, -160], [150, 140, -170], [40, 170, -100], [-60, 160, -20]] },
    { id: 'moonhop', on: 'moon', name: 'Low-gravity hop course', foot: true, time: 75, r: 3.5, color: '#9aa0ff', give: { c: 3, k: 2 },
      blurb: 'On foot: jump through the rings.',
      rings: [[0, 2.5, -20], [15, 3, -38], [35, 3.5, -50], [55, 3, -40], [68, 3, -10], [50, 3.5, 5], [28, 3, 15], [8, 2.5, 8]] },
    { id: 'froopybounce', on: 'froopy', name: 'Froopy bounce course', foot: true, time: 60, r: 3.5, color: '#ff8fc8', give: { f: 3, k: 2 },
      blurb: 'On foot: everything is bouncy here. Use it.',
      rings: [[-10, 4, -15], [-30, 5, -30], [-45, 5, -8], [-35, 6, 18], [-12, 5, 30], [10, 4, 30]] },
  ];
  MM.RACE_BY_ID = {};
  for (const R of MM.RACES) MM.RACE_BY_ID[R.id] = R;

  // Which course a world runs: Earths share the suburb's, every Earth's sky shares the space one.
  const courseOf = dimId => {
    const D = MM.DIM_BY_ID[dimId];
    if (!D) return dimId;
    if (D.planets) return 'space:' + courseOf(D.planets[0].dim);
    return D.variantOf && !D.timeline ? courseOf(D.variantOf) : dimId;
  };
  MM.racesIn = dimId => { const c = courseOf(dimId); return MM.RACES.filter(R => R.on === c); };
  // Where ring i of race R is in this world.
  MM.ringAt = (R, i, dimId) => {
    const [x, y, z] = R.rings[i];
    return { x, y: R.abs ? y : MM.heightAt(dimId, x, z) + y, z };
  };
  MM.RACE_CD = 120;   // seconds before a race pays out again

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
