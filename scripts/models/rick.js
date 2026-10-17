'use strict';
// Rick Sanchez, sculpted (see scripts/sculpt.js). Built standing in his rest pose, feet on the
// ground at y = 0, facing +z, around the joints of the game's skeleton for a Rick (js/avatar.js,
// canon look: height 1.3, width 0.8, head 0.95). Each shape names the body part it moves with.
//
//   node scripts/sculpt.js scripts/models/rick.js assets/characters/rick.mms

const SKIN = '#f0dccb', SKIN_D = '#d9bfa9', HAIR = '#b4d8e8', HAIR_D = '#8fb8cc', COAT = '#f4f7f8', COAT_D = '#d8dfe4',
  SWEATER = '#a8d8ea', PANTS = '#6e4a2a', SHOE = '#2e2420', EYE = '#ffffff', PUPIL = '#1a1a1a', MOUTH = '#4a2a2a', DROOL = '#d8f2c8',
  GUN = '#d8dde2', GUN_D = '#9aa3ab', GUN_K = '#7d858e', FLUID = '#39ff6a';

// Where the skeleton's joints are, in the rest pose.
const J = {
  torso: [0, 0, 0],
  head: [0, 2.1667, 0],
  armL: [-0.2384, 1.786, 0], foreL: [-0.2384, 1.344, 0],
  armR: [0.2384, 1.786, 0], foreR: [0.2384, 1.344, 0],
  legL: [-0.088, 1.092, 0], shinL: [-0.088, 0.5242, 0],
  legR: [0.088, 1.092, 0], shinR: [0.088, 0.5242, 0],
};

function build(M, S) {
  // ----- Head: long and egg-shaped, the unibrow, big tired eyes, the long nose, the drool,
  // and that spiky blue-grey hair sweeping up and back. -----
  const H = 'head';
  M.add(H, S.ell([0, 2.205, -0.01], [0.175, 0.235, 0.195]), SKIN);                  // cranium
  M.add(H, S.ell([0, 2.03, 0.035], [0.135, 0.115, 0.14]), SKIN, { k: 0.07 });        // jaw and chin
  M.add(H, S.ell([0, 1.965, 0.07], [0.07, 0.05, 0.07]), SKIN, { k: 0.05 });          // the chin's point
  for (const sx of [-1, 1]) {
    M.add(H, S.ell([sx * 0.105, 2.08, 0.1], [0.06, 0.06, 0.06]), SKIN, { k: 0.05 });  // cheeks
    M.add(H, S.ell([sx * 0.172, 2.15, -0.01], [0.028, 0.055, 0.042]), SKIN, { k: 0.02 });   // ears
    M.carve(H, S.ell([sx * 0.19, 2.15, 0.0], [0.012, 0.03, 0.022]), { k: 0.008, paint: SKIN_D });
  }
  // The long, slightly hooked nose.
  M.add(H, S.cap([0, 2.2, 0.17], [0, 2.115, 0.245], 0.022, 0.03), SKIN, { k: 0.025 });
  M.add(H, S.ell([0, 2.105, 0.24], [0.032, 0.026, 0.026]), SKIN, { k: 0.02 });
  // Eyes: big white balls, small pupils looking slightly off, heavy bags under them.
  for (const sx of [-1, 1]) {
    M.add(H, S.ell([sx * 0.072, 2.225, 0.142], [0.058, 0.06, 0.052]), EYE, { solo: true });
    M.add(H, S.ell([sx * 0.07 + 0.008, 2.218, 0.193], [0.017, 0.019, 0.007]), PUPIL, { solo: true });
    M.add(H, S.cap([sx * 0.04, 2.156, 0.172], [sx * 0.112, 2.163, 0.154], 0.006), SKIN_D, { solo: true });   // bags
    M.add(H, S.cap([sx * 0.045, 2.137, 0.17], [sx * 0.1, 2.142, 0.154], 0.004), SKIN_D, { solo: true });
  }
  // The unibrow: one wiggly line right across.
  M.add(H, S.cap([-0.135, 2.29, 0.13], [-0.05, 2.302, 0.175], 0.019), HAIR_D, { solo: true });
  M.add(H, S.cap([-0.05, 2.302, 0.175], [0.04, 2.297, 0.178], 0.019), HAIR_D, { solo: true });
  M.add(H, S.cap([0.04, 2.297, 0.178], [0.135, 2.292, 0.13], 0.019), HAIR_D, { solo: true });
  // The mouth (a long, flat frown) and the drool at its corner.
  M.carve(H, S.cap([-0.07, 2.045, 0.15], [0.065, 2.05, 0.15], 0.012), { k: 0.012 });
  M.add(H, S.cap([-0.066, 2.046, 0.158], [0.061, 2.051, 0.158], 0.008), MOUTH, { solo: true });
  M.add(H, S.cap([0.062, 2.045, 0.162], [0.068, 1.985, 0.15], 0.006, 0.008), DROOL, { solo: true });
  // Hair: a cap over the top and back, and spikes fanning up and backwards.
  M.add(H, S.ell([0, 2.33, -0.04], [0.185, 0.16, 0.2]), HAIR, { k: 0.03 });
  M.carve(H, S.ell([0, 2.3, 0.2], [0.17, 0.11, 0.1]), { k: 0.04 });   // keep the forehead bare
  const spikes = [
    [0, 0.95, -0.15, 0.18], [0.35, 0.85, -0.3, 0.17], [-0.35, 0.85, -0.3, 0.17], [0.7, 0.6, -0.35, 0.16], [-0.7, 0.6, -0.35, 0.16],
    [0.92, 0.25, -0.25, 0.15], [-0.92, 0.25, -0.25, 0.15], [0.5, 0.35, -0.8, 0.16], [-0.5, 0.35, -0.8, 0.16], [0, 0.45, -0.9, 0.17],
    [0.25, 0.9, 0.2, 0.14], [-0.25, 0.9, 0.2, 0.14], [0.6, 0.75, 0.1, 0.14], [-0.6, 0.75, 0.1, 0.14], [0.95, -0.05, -0.1, 0.12], [-0.95, -0.05, -0.1, 0.12],
  ];
  for (const [dx, dy, dz, l] of spikes) {
    const n = Math.hypot(dx, dy, dz), ux = dx / n, uy = dy / n, uz = dz / n;
    const a = [ux * 0.13, 2.31 + uy * 0.1, -0.04 + uz * 0.14];
    M.add(H, S.cap(a, [a[0] + ux * l, a[1] + uy * l, a[2] + uz * l], 0.045, 0.004), HAIR, { k: 0.025 });
  }
  // ----- Torso: a thin old man in a light blue sweater under the lab coat, brown trousers,
  // the neck. -----
  const T = 'torso';
  M.add(T, S.cap([0, 1.78, -0.01], [0, 2.08, 0.0], 0.048), SKIN, { k: 0.02 });                       // neck
  M.add(T, S.ell([0, 1.57, 0], [0.165, 0.25, 0.115]), SWEATER);                                       // chest
  M.add(T, S.ell([0, 1.33, 0.01], [0.15, 0.2, 0.115]), SWEATER, { k: 0.06 });                         // belly
  M.add(T, S.ell([0, 1.13, 0], [0.15, 0.1, 0.11]), PANTS, { k: 0.03 });                               // hips
  M.paint(T, S.box([0, 1.2, 0], [0.3, 0.035, 0.3], 0.01), PANTS, { soft: 0.01 });                    // waistband
  M.add(T, S.ell([0, 1.78, 0.02], [0.06, 0.03, 0.05]), SWEATER, { k: 0.03 });                          // collar
  // The coat: a shell over the body, open down the front, shoulders and collar.
  const coat = S.shell(S.ell([0, 1.5, -0.005], [0.2, 0.36, 0.142]), 0.011);
  M.add(T, coat, COAT, { k: 0.01 });
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * 0.17, 1.76, 0], [0.085, 0.05, 0.1]), COAT, { k: 0.04 });   // shoulders
  M.carve(T, S.box([0, 1.42, 0.15], [0.07, 0.4, 0.07], 0.03), { k: 0.02 });
  M.carve(T, S.box([0, 1.95, 0], [0.3, 0.1, 0.3], 0.01), { k: 0.02 });                                // open at the neck
  for (const sx of [-1, 1]) {
    M.add(T, S.cap([sx * 0.06, 1.77, 0.11], [sx * 0.085, 1.5, 0.14], 0.016, 0.01), COAT_D, { k: 0.012 });   // lapels
    M.add(T, S.cap([sx * 0.07, 1.82, 0.03], [sx * 0.05, 1.77, 0.11], 0.022), COAT, { k: 0.015 });            // collar
    M.add(T, S.ell([sx * 0.13, 1.25, 0.13], [0.05, 0.004, 0.02]), COAT_D, { k: 0.008 });                   // pocket flaps
  }
  M.add(T, S.ell([-0.13, 1.53, 0.135], [0.035, 0.004, 0.015]), COAT_D, { k: 0.006 });                     // breast pocket
  // Coat tails, flaring to just above the knee, open at the front and the hem.
  M.add(T, S.shell(S.cap([0, 1.15, -0.01], [0, 0.6, -0.04], 0.19, 0.25), 0.011), COAT, { k: 0.02 });
  M.carve(T, S.box([0, 0.9, 0.2], [0.06, 0.32, 0.12], 0.02), { k: 0.02 });
  M.carve(T, S.box([0, 0.45, 0], [0.4, 0.17, 0.4], 0.0), { k: 0.01 });
  M.carve(T, S.cap([0, 0.95, 0.26], [0, 0.66, 0.3], 0.07, 0.12), { k: 0.03 });                       // the front edges part

  // ----- Arms: lab coat sleeves, cuffs, four-fingered hands. The right one holds the portal gun. -----
  for (const sx of [-1, 1]) {
    const up = sx < 0 ? 'armL' : 'armR', fo = sx < 0 ? 'foreL' : 'foreR', x = sx * 0.2384;
    M.add(up, S.sphere([x, 1.786, 0], 0.07), COAT);
    M.add(up, S.cap([x, 1.78, 0], [x, 1.344, 0], 0.062, 0.056), COAT, { k: 0.03 });
    M.add(up, S.sphere([x, 1.344, 0], 0.056), COAT, { k: 0.02 });
    M.add(fo, S.sphere([x, 1.344, 0], 0.057), COAT);
    M.add(fo, S.cap([x, 1.344, 0], [x, 0.97, 0.005], 0.056, 0.058), COAT, { k: 0.02 });
    M.add(fo, S.cap([x, 0.985, 0.005], [x, 0.955, 0.005], 0.063), COAT_D, { k: 0.008 });               // cuff
    M.add(fo, S.cap([x, 0.97, 0.005], [x, 0.93, 0.005], 0.03), SKIN, { k: 0.01 });                     // wrist
    // The hand.
    M.add(fo, S.ell([x, 0.885, 0.01], [0.03, 0.05, 0.042]), SKIN, { k: 0.02 });
    const gun = sx > 0;
    for (let i = -1; i <= 1; i++) {
      const fz = 0.01 + i * 0.026;
      if (gun) M.add(fo, S.cap([x + sx * 0.012, 0.86, fz], [x + sx * 0.005, 0.83, fz + 0.04], 0.012), SKIN, { k: 0.01 });
      else M.add(fo, S.cap([x + sx * 0.005, 0.855, fz], [x + sx * 0.015, 0.79, fz + 0.005], 0.012, 0.011), SKIN, { k: 0.01 });
    }
    M.add(fo, S.cap([x - sx * 0.02, 0.89, 0.04], [x - sx * 0.035, 0.85, 0.06], 0.012), SKIN, { k: 0.01 });  // thumb
  }
  // The portal gun, as in js/avatar.js gunAt(): grip, white body, green vial, emitter.
  {
    const x = 0.2384, y = 0.862, z = 0.12, F = 'foreR';
    M.add(F, S.cap([x, y - 0.17, z - 0.05], [x, y + 0.02, z + 0.01], 0.04), GUN_K);
    M.add(F, S.cap([x, y + 0.04, z - 0.1], [x, y + 0.04, z + 0.22], 0.07), GUN, { k: 0.01 });
    M.add(F, S.cap([x, y + 0.13, z - 0.04], [x, y + 0.13, z + 0.16], 0.042), FLUID, { k: 0.004, glow: true });
    for (const dz of [-0.05, 0.17]) M.add(F, S.cap([x, y + 0.13, z + dz - 0.017], [x, y + 0.13, z + dz + 0.017], 0.05), GUN_D, { k: 0.004 });
    M.add(F, S.cap([x, y + 0.04, z + 0.25], [x, y + 0.04, z + 0.29], 0.06), GUN_D, { k: 0.008 });
    M.add(F, S.ell([x, y + 0.04, z + 0.3], [0.046, 0.046, 0.028]), FLUID, { k: 0.003, glow: true });
    M.add(F, S.cap([x + 0.06, y + 0.05, z + 0.02], [x + 0.09, y + 0.05, z + 0.02], 0.028), '#59606e', { k: 0.006 });
  }

  // ----- Legs: brown trousers, a knee joint, black shoes. -----
  for (const sx of [-1, 1]) {
    const th = sx < 0 ? 'legL' : 'legR', sh = sx < 0 ? 'shinL' : 'shinR', x = sx * 0.088;
    M.add(th, S.sphere([x, 1.092, 0], 0.085), PANTS);
    M.add(th, S.cap([x, 1.092, 0], [x, 0.5242, 0], 0.08, 0.068), PANTS, { k: 0.03 });
    M.add(th, S.sphere([x, 0.5242, 0], 0.068), PANTS, { k: 0.02 });
    M.add(sh, S.sphere([x, 0.5242, 0], 0.069), PANTS);
    M.add(sh, S.cap([x, 0.5242, 0], [x, 0.11, 0.0], 0.066, 0.07), PANTS, { k: 0.02 });
    M.add(sh, S.cap([x, 0.13, 0.0], [x, 0.1, 0.0], 0.074), PANTS, { k: 0.01 });                          // cuff
    M.add(sh, S.ell([x, 0.055, 0.06], [0.07, 0.055, 0.15]), SHOE, { k: 0.02 });
    M.add(sh, S.box([x, 0.012, 0.06], [0.072, 0.012, 0.155], 0.008), '#1a1410', { k: 0.006 });           // sole
  }
}

// Triangles per part after simplifying: about 14,000 for the whole of Rick.
const budget = { head: 4800, torso: 4200, armL: 500, armR: 500, foreL: 1100, foreR: 1700, legL: 450, legR: 450, shinL: 650, shinR: 650 };
module.exports = { joints: J, build, cell: 0.014, cells: { head: 0.0085, foreL: 0.008, foreR: 0.008, torso: 0.013 }, budget };
