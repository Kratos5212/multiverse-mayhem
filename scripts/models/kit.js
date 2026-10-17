'use strict';
// Shared pieces for the sculpted cast (scripts/mojulo-character.js, scripts/sculpt.js): the show's
// way of drawing people. Big heads, big round eye whites that bulge out of the face with small dot
// pupils, a little nose, a line for a mouth; noodle arms with four-fingered hands; simple clothes.
// Everything is built standing in the rest pose, feet at y = 0, facing +z, around the joints of
// the game's skeleton for that character (js/avatar.js, canon look).

const PUPIL = '#141414', WHITE = '#ffffff', MOUTH = '#5a2a2a';

// A cartoon head. o: { c: centre of the skull, r: skull radii [x, y, z], skin, jaw: { c, r } extra
// jaw mass, eyes: { y, x: half spacing, z, r: [x, y, z], pupil, look: [dx, dy], lids: colour (droopy
// lids), lidCut: 0..1 of the eye covered }, brows: { color, y, len, thick, tilt (+ angry), uni },
// nose: { y, z, r, len, droop }, mouth: { y, z, w, curve (+ smile, - frown), open, color }, ears: { y, r } }
function head(M, S, o) {
  const H = 'head', [cx, cy, cz] = o.c, [rx, ry, rz] = o.r;
  M.add(H, S.ell([cx, cy, cz], [rx, ry, rz]), o.skin);
  if (o.jaw) M.add(H, S.ell(o.jaw.c, o.jaw.r), o.skin, { k: o.jaw.k || 0.06 });
  if (o.ears) for (const sx of [-1, 1]) {
    const e = o.ears, x = cx + sx * (rx * 0.97), r = e.r || 0.045;
    M.add(H, S.ell([x, e.y, cz + (e.z || 0)], [r * 0.55, r, r * 0.75]), o.skin, { k: 0.02 });
    M.carve(H, S.ell([x + sx * r * 0.35, e.y, cz + (e.z || 0) + r * 0.1], [r * 0.25, r * 0.6, r * 0.4]), { k: 0.01, only: o.skin });
  }
  if (o.nose) {
    const n = o.nose, len = n.len || n.r * 1.4;
    M.add(H, S.cap([cx, n.y + len * 0.5, n.z - len * 0.6], [cx, n.y - (n.droop || 0), n.z], n.r * 0.7, n.r), o.skin, { k: 0.03 });
  }
  if (o.mouth) {
    const m = o.mouth, w = m.w, c = m.curve || 0, z = m.z;
    // A line of three short strokes, bent up for a smile, down for a frown.
    const pts = [[-w, m.y + c], [-w * 0.35, m.y], [w * 0.35, m.y], [w, m.y + c]];
    for (let i = 1; i < pts.length; i++) {
      const a = [cx + pts[i - 1][0], pts[i - 1][1], z - Math.abs(pts[i - 1][0]) * (m.wrap || 0.6)], b = [cx + pts[i][0], pts[i][1], z - Math.abs(pts[i][0]) * (m.wrap || 0.6)];
      if (m.open) M.carve(H, S.cap(a, b, m.open), { k: 0.01, only: o.skin });
      M.add(H, S.cap(a, b, m.thick || 0.009), m.color || MOUTH, { solo: true });
    }
    if (m.open) {
      // The inside of an open mouth, and teeth along the top.
      M.add(H, S.ell([cx, m.y - m.open * 0.4, z - m.open * 1.2], [w * 0.9, m.open * 1.1, m.open * 0.8]), m.inside || '#3a0d16', { solo: true });
      if (m.teeth) M.add(H, S.box([cx, m.y + m.open * 0.25, z - m.open * 0.55], [w * 0.75, m.open * 0.28, m.open * 0.3], 0.004), '#fbfbf6', { solo: true });
      if (m.tongue) M.add(H, S.ell([cx, m.y - m.open * 0.9, z - m.open * 0.7], [w * 0.5, m.open * 0.35, m.open * 0.5]), '#e86a7a', { solo: true });
    }
  }
  if (o.eyes) {
    const e = o.eyes, [ex, ey, ez] = e.r, [lx, ly] = e.look || [0, 0];
    for (const sx of [-1, 1]) {
      const x = cx + sx * e.x, c = [x, e.y, e.z];
      M.add(H, S.ell(c, [ex, ey, ez]), WHITE, { solo: true });
      // The show inks every eye: a dark rim just behind the white.
      if (e.rim !== false) M.add(H, S.ell([x, e.y, e.z - ez * 0.18], [ex + (e.rimW || 0.011), ey + (e.rimW || 0.011), ez * 0.92]), e.rim || '#1e1a1a', { solo: true });
      const pr = e.pupil || 0.016;
      if (!e.patch || sx !== e.patch) M.add(H, S.ell([x + lx + sx * (e.cross || 0), e.y + ly, e.z + ez * 0.93], [pr, pr * (e.tall || 1.1), pr * 0.45]), e.pupilColor || PUPIL, { solo: true });
      if (e.lids) {
        // Heavy lids: a squashed skin-coloured cap over the top of the eye, its edge drawn.
        const cut = e.lidCut || 0.45, lh = ey * cut * 1.1, y0 = e.y + ey - 2 * ey * cut;
        M.add(H, S.ell([x, y0 + lh, e.z + ez * 0.06], [ex * 1.07, lh, ez * 1.08]), e.lids, { solo: true });
        M.add(H, S.cap([x - ex * 0.9, y0 + 0.003, e.z + ez * 0.62], [x + ex * 0.9, y0 + 0.003, e.z + ez * 0.62], 0.0045), e.lidLine || '#4a3a30', { solo: true });
      }
    }
    if (e.patch) {
      // An eyepatch over one eye, its strap round the head.
      const x = cx + e.patch * e.x;
      M.add(H, S.ell([x, e.y, e.z + ez * 0.35], [ex * 1.08, ey * 1.05, ez * 0.75]), '#111111', { solo: true });
      M.add(H, S.cap([x - e.patch * ex, e.y + ey * 0.6, e.z + ez * 0.5], [cx - e.patch * rx * 1.02, e.y + ey * 1.4, cz], 0.008), '#111111', { solo: true });
      M.add(H, S.cap([x + e.patch * ex, e.y + ey * 0.5, e.z + ez * 0.5], [cx + e.patch * rx * 1.02, e.y + ey * 1.2, cz], 0.008), '#111111', { solo: true });
    }
  }
  if (o.brows) {
    const b = o.brows, len = b.len || 0.05;
    if (b.uni) M.add(H, S.cap([cx - len * 1.6, b.y + 0.01, b.z - 0.02], [cx + len * 1.6, b.y + 0.01, b.z - 0.02], b.thick || 0.012), b.color, { solo: true });
    else for (const sx of [-1, 1]) {
      const x = cx + sx * (o.eyes ? o.eyes.x : 0.07), t = b.tilt || 0;
      M.add(H, S.cap([x - sx * len * 0.5, b.y - t * 0.5, b.z], [x + sx * len * 0.5, b.y + t * 0.5, b.z - 0.01], b.thick || 0.008), b.color, { solo: true });
    }
  }
}

// The torso. o: { hip: y of the hip joints, shoulder: y of the shoulders, sx: half width at the
// shoulders, depth, skin, shirt, pants, neck: [r, top y], top: 'tshirt' | 'polo' | 'tank' |
// 'sweater' | 'turtle' | 'none', collar, belt, belly, bust, waist }
function torso(M, S, o) {
  const T = 'torso', h = o.hip, s = o.shoulder, w = o.sx, d = o.depth || w * 0.62, span = s - h;
  const shirt = o.shirt;
  if (o.neck) M.add(T, S.cap([0, s - 0.02, -0.005], [0, o.neck[1], 0], o.neck[0]), o.skin, { k: 0.02 });
  // Chest, waist and belly, then the hips in the trouser colour.
  M.add(T, S.ell([0, s - span * 0.3, 0], [w * 0.95, span * 0.42, d]), shirt);
  M.add(T, S.ell([0, h + span * 0.38, 0.005], [w * (o.waist || 0.86), span * 0.38, d * (o.belly || 1.0)]), shirt, { k: 0.06 });
  for (const sx of [-1, 1]) M.add(T, S.ell([sx * w * 0.78, s - 0.03, 0], [w * 0.3, 0.06, d * 0.75]), shirt, { k: 0.05 });   // shoulders
  if (o.bust) for (const sx of [-1, 1]) M.add(T, S.ell([sx * w * 0.38, s - span * 0.36, d * 0.55], [w * 0.3, span * 0.15, d * 0.45]), shirt, { k: 0.05 });
  // The hem of the shirt sits over the hips.
  M.add(T, S.ell([0, h + 0.03, 0], [w * (o.hipW || 0.9), span * 0.2, d * 0.95]), o.pants, { k: 0.03 });
  if (o.top === 'tank') {
    // Bare shoulders: skin across the top, the tank top's straps.
    M.add(T, S.ell([0, s - 0.01, -0.005], [w * 0.92, 0.07, d * 0.8]), o.skin, { k: 0.04 });
    for (const sx of [-1, 1]) M.add(T, S.cap([sx * w * 0.42, s - 0.12, d * 0.75], [sx * w * 0.45, s + 0.02, 0], 0.016), shirt, { k: 0.01 });
  }
  if (o.top === 'tshirt' || o.top === 'tank') M.carve(T, S.ell([0, s + 0.035, d * 0.55], [w * 0.32, 0.07, d * 0.5]), { k: 0.02 });   // the neckline
  if (o.top === 'tshirt') M.add(T, S.cap([-w * 0.28, s - 0.005, d * 0.45], [w * 0.28, s - 0.005, d * 0.45], 0.014), o.collar || shirt, { k: 0.02 });
  if (o.top === 'polo') {
    for (const sx of [-1, 1]) M.add(T, S.box([sx * 0.04, s + 0.01, d * 0.62], [0.045, 0.02, 0.012], 0.006), o.collar || shirt, { k: 0.01 });
    M.add(T, S.box([0, s - 0.07, d * 0.93], [0.018, 0.07, 0.006], 0.004), o.collar || shirt, { k: 0.008 });   // the placket
    for (const y of [s - 0.04, s - 0.1]) M.add(T, S.sphere([0, y, d * 0.98], 0.007), '#f4f0e0', { solo: true });
  }
  if (o.top === 'turtle') M.add(T, S.cap([0, s - 0.03, 0], [0, s + 0.06, 0], (o.neck ? o.neck[0] : 0.05) * 1.35), shirt, { k: 0.02 });
  if (o.top === 'sweater') M.add(T, S.cap([-w * 0.3, s - 0.01, d * 0.3], [w * 0.3, s - 0.01, d * 0.3], 0.018), shirt, { k: 0.03 });
  if (o.belt) M.add(T, S.ell([0, h + 0.08, 0.002], [w * 0.92, 0.022, d * 0.99]), o.belt, { k: 0.01 });
}

// One arm. side: -1 left, +1 right. o: { x, shoulder: y, elbow: y, wrist: y (end of the forearm),
// r: arm radius, skin, sleeve, sleeveLen: 0 none, 0.4 short, 1 long, hand: 'open' | 'gun', gun }
function arm(M, S, side, o) {
  const up = side < 0 ? 'armL' : 'armR', fo = side < 0 ? 'foreL' : 'foreR', x = o.x, r = o.r;
  const sh = o.shoulder, el = o.elbow, wr = o.wrist;
  M.add(up, S.sphere([x, sh, 0], r * 1.1), o.sleeveLen > 0 ? o.sleeve : o.skin);
  M.add(up, S.cap([x, sh, 0], [x, el, 0], r, r * 0.92), o.skin, { k: 0.02 });
  M.add(fo, S.cap([x, el, 0], [x, wr, 0.004], r * 0.92, r * 0.82), o.skin);
  if (o.sleeveLen > 0) {
    const sr = r * (o.sleeveR || 1.45);
    if (o.sleeveLen < 1) M.add(up, S.cap([x, sh + 0.01, 0], [x, sh - (sh - el) * o.sleeveLen * 2, 0], sr, sr * 0.92), o.sleeve, { k: 0.02 });
    else {
      M.add(up, S.cap([x, sh + 0.01, 0], [x, el, 0], sr, sr * 0.92), o.sleeve, { k: 0.02 });
      M.add(fo, S.cap([x, el, 0], [x, wr + 0.03, 0.004], sr * 0.92, sr * 0.85), o.sleeve);
      if (o.cuff) M.add(fo, S.cap([x, wr + 0.045, 0.004], [x, wr + 0.02, 0.004], sr * 0.95), o.cuff, { k: 0.006 });
    }
  }
  hand(M, S, fo, side, x, wr, r, o);
}
// A four-fingered cartoon hand at the end of a forearm (and the gun, in the right one).
function hand(M, S, fo, side, x, wr, r, o) {
  const hs = o.handSize || 1, pr = r * 1.15 * hs, y = wr - pr * 0.9;
  M.add(fo, S.ell([x, y, 0.008], [pr * 0.7, pr * 1.05, pr * 0.9]), o.skin, { k: 0.02 });
  const gun = o.hand === 'gun';
  for (let i = -1; i <= 1; i++) {
    const fz = 0.008 + i * pr * 0.55, fl = pr * 1.1;
    if (gun) M.add(fo, S.cap([x + side * pr * 0.25, y - pr * 0.45, fz], [x + side * pr * 0.1, y - pr * 1.0, fz + fl * 0.75], pr * 0.26), o.skin, { k: 0.01 });
    else M.add(fo, S.cap([x + side * pr * 0.1, y - pr * 0.6, fz], [x + side * pr * 0.3, y - pr * 0.6 - fl, fz + pr * 0.1], pr * 0.27, pr * 0.24), o.skin, { k: 0.01 });
  }
  M.add(fo, S.cap([x - side * pr * 0.45, y - pr * 0.1, pr * 0.55], [x - side * pr * 0.75, y - pr * 0.75, pr * 0.95], pr * 0.27), o.skin, { k: 0.01 });   // thumb
  if (gun && o.gun) gunAt(M, S, fo, x, y - pr * 0.4, pr * 1.3, o.gun);
}
// The game's guns (js/avatar.js gunAt): a grip, a white body, a glowing vial, an emitter.
function gunAt(M, S, F, x, y, z, col) {
  M.add(F, S.cap([x, y - 0.17, z - 0.05], [x, y + 0.02, z + 0.01], 0.04), '#7d858e');
  M.add(F, S.cap([x, y + 0.04, z - 0.1], [x, y + 0.04, z + 0.22], 0.07), '#d8dde2', { k: 0.01 });
  M.add(F, S.cap([x, y + 0.13, z - 0.04], [x, y + 0.13, z + 0.16], 0.042), col, { k: 0.004, glow: true });
  for (const dz of [-0.05, 0.17]) M.add(F, S.cap([x, y + 0.13, z + dz - 0.017], [x, y + 0.13, z + dz + 0.017], 0.05), '#9aa3ab', { k: 0.004 });
  M.add(F, S.cap([x, y + 0.04, z + 0.25], [x, y + 0.04, z + 0.29], 0.06), '#9aa3ab', { k: 0.008 });
  M.add(F, S.ell([x, y + 0.04, z + 0.3], [0.046, 0.046, 0.028]), col, { k: 0.003, glow: true });
  M.add(F, S.cap([x + 0.06, y + 0.05, z + 0.02], [x + 0.09, y + 0.05, z + 0.02], 0.028), '#59606e', { k: 0.006 });
}

// One leg. o: { x, hip: y, knee: y, r: leg radius, pants, skin, shorts (pants stop above the knee),
// shoe, sole, sock, shoeLen, sneaker (white stripe) }
function leg(M, S, side, o) {
  const th = side < 0 ? 'legL' : 'legR', sh = side < 0 ? 'shinL' : 'shinR', x = o.x, r = o.r, hip = o.hip, knee = o.knee;
  const ankle = o.ankle || 0.1;
  M.add(th, S.sphere([x, hip, 0], r * 1.08), o.pants);
  M.add(th, S.cap([x, hip, 0], [x, knee, 0], r * 1.02, r * 0.88), o.pants, { k: 0.03 });
  M.add(sh, S.sphere([x, knee, 0], r * 0.9), o.skirtShin ? o.skin : o.pants);
  M.add(sh, S.cap([x, knee, 0], [x, ankle + 0.03, 0.005], r * 0.86, r * (o.flare || 0.84)), o.skirtShin ? o.skin : o.pants, { k: 0.02 });
  if (o.sock) M.add(sh, S.cap([x, ankle + 0.04, 0.005], [x, ankle - 0.02, 0.005], r * 0.62), o.sock, { k: 0.01 });
  const L = o.shoeLen || 0.13, sw = o.shoeW || r * 1.05;
  M.add(sh, S.ell([x, ankle * 0.55, L * 0.38], [sw, ankle * 0.55, L]), o.shoe, { k: 0.015 });
  M.add(sh, S.box([x, 0.012, L * 0.38], [sw * 1.08, 0.012, L * 1.04], 0.008), o.sole || '#e8e8e4', { k: 0.006 });
  if (o.sneaker) M.add(sh, S.cap([x + side * sw * 0.98, ankle * 0.45, L * 0.1], [x + side * sw * 0.98, ankle * 0.45, L * 0.75], 0.006), o.sneaker, { solo: true });
}

// Both arms and both legs on a skeleton's joints. a: arm options (as arm(), less the joints),
// l: leg options (as leg()). The right hand holds the gun when a.gun is set.
function limbs(M, S, J, a, l) {
  const sh = J.armR[1], el = J.foreR[1], wr = el - (sh - el) * (a.foreLen || 0.95);
  for (const side of [-1, 1]) {
    if (a) arm(M, S, side, Object.assign({ x: side * Math.abs(J.armR[0]), shoulder: sh, elbow: el, wrist: wr, hand: side > 0 && a.gun ? 'gun' : 'open' }, a));
    if (l) leg(M, S, side, Object.assign({ x: side * Math.abs(J.legR[0]), hip: J.legR[1], knee: J.shinR[1] }, l));
  }
}

module.exports = { head, torso, arm, leg, hand, gunAt, limbs, PUPIL, WHITE };
