'use strict';
// A tiny sculpting tool for characters: a model is a list of soft shapes (ellipsoids, capsules,
// cones, rounded boxes) blended together, carved, and painted, then turned into a smooth mesh
// (surface nets over a signed distance field). Every shape belongs to a body part, and each
// part becomes its own mesh around its joint, so the game's skeleton still animates it.
//
//   node scripts/sculpt.js scripts/models/rick.js assets/characters/rick.mms
//
// Output ("MMS1"): a JSON header { parts: { name: { lit: [offset, length], glow: [...] } } }
// followed by MMG1 meshes (see js/mmg.js), each in its part's own space (joint at 0, 0, 0).
const fs = require('fs');
const path = require('path');

// ---------- Shapes (signed distance, metres) ----------
const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

const S = {
  sphere: (c, r) => ({ bb: [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r], f: (x, y, z) => len(x - c[0], y - c[1], z - c[2]) - r }),
  // Ellipsoid (a good approximation of the true distance near the surface).
  ell: (c, r) => ({ bb: [c[0] - r[0], c[1] - r[1], c[2] - r[2], c[0] + r[0], c[1] + r[1], c[2] + r[2]], f: (x, y, z) => {
    const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
    const k0 = len(px, py, pz), k1 = len(px / r[0], py / r[1], pz / r[2]);
    return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : k0 * (k0 - 1) / k1;
  } }),
  // Capsule from a to b, radius r (or a cone from ra to rb).
  cap: (a, b, ra, rb) => {
    if (rb === undefined) rb = ra;
    const R = Math.max(ra, rb);
    const bb = [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R];
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz;
    if (ra === rb) return { bb, f: (x, y, z) => {
      const px = x - a[0], py = y - a[1], pz = z - a[2], t = clamp((px * bx + py * by + pz * bz) / l2, 0, 1);
      return len(px - bx * t, py - by * t, pz - bz * t) - ra;
    } };
    // Round cone (Inigo Quilez).
    const l = Math.sqrt(l2), rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
    return { bb, f: (x, y, z) => {
      const px = x - a[0], py = y - a[1], pz = z - a[2];
      const yy = px * bx + py * by + pz * bz, zz = yy - l2;
      const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy;
      const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
    } };
    void l;
  },
  // Rounded box, centre c, half sizes h, corner radius r.
  box: (c, h, r) => ({ bb: [c[0] - h[0], c[1] - h[1], c[2] - h[2], c[0] + h[0], c[1] + h[1], c[2] + h[2]], f: (x, y, z) => {
    const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r;
    return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  } }),
  // A hollow version of a shape (cloth): |d| - t.
  shell: (s, t) => ({ bb: s.bb, f: (x, y, z) => Math.abs(s.f(x, y, z)) - t }),
};

// ---------- A model ----------
// add(part, shape, colour, { k: blend radius, glow }) · carve(part, shape, { k, paint })
// paint(part, shape, colour, { soft }) recolours the surface inside a shape.
function Model() {
  const ops = [];
  return {
    ops,
    // solo: a small detail (pupils, brows, mouth) made as its own sharp little piece, not
    // blended into the body, so it survives simplifying.
    add(part, s, color, o) { ops.push({ op: 'add', part, s, c: hex(color), k: (o && o.k) || 0.004, glow: !!(o && o.glow), solo: !!(o && o.solo) }); },
    carve(part, s, o) { ops.push({ op: 'carve', part, s, k: (o && o.k) || 0.004, c: o && o.paint ? hex(o.paint) : null }); },
    paint(part, s, color, o) { ops.push({ op: 'paint', part, s, c: hex(color), soft: (o && o.soft) || 0.004, glow: !!(o && o.glow) }); },
  };
}

// The field of one part at a point: distance, colour, glow.
function evalPart(list, x, y, z, out) {
  let d = 1e9, r = 1, g = 1, b = 1, glow = false;
  for (const o of list) {
    const bb = o.s.bb, m = o.k || o.soft || 0;
    if (o.op !== 'carve' && (x < bb[0] - m - 0.02 || y < bb[1] - m - 0.02 || z < bb[2] - m - 0.02 || x > bb[3] + m + 0.02 || y > bb[4] + m + 0.02 || z > bb[5] + m + 0.02)) {
      if (o.op === 'add' && d > 1e8) continue;
      if (o.op !== 'carve') continue;
    }
    const di = o.s.f(x, y, z);
    if (o.op === 'add') {
      if (d > 1e8) { d = di; r = o.c[0]; g = o.c[1]; b = o.c[2]; glow = o.glow; continue; }
      const k = o.k, h = clamp(0.5 + 0.5 * (di - d) / k, 0, 1);   // h = 1: keep what we had
      d = di + (d - di) * h - k * h * (1 - h);
      r = o.c[0] + (r - o.c[0]) * h; g = o.c[1] + (g - o.c[1]) * h; b = o.c[2] + (b - o.c[2]) * h;
      if (h < 0.5) glow = o.glow;
    } else if (o.op === 'carve') {
      const k = o.k, h = clamp(0.5 - 0.5 * (d + di) / k, 0, 1);   // h = 1: the cut wins
      d = d + (-di - d) * h + k * h * (1 - h);
      if (o.c) { r += (o.c[0] - r) * h; g += (o.c[1] - g) * h; b += (o.c[2] - b) * h; }
    } else {
      const h = clamp(0.5 - 0.5 * di / o.soft, 0, 1);
      r += (o.c[0] - r) * h; g += (o.c[1] - g) * h; b += (o.c[2] - b) * h;
      if (h > 0.5) glow = o.glow;
    }
  }
  out.d = d; out.r = r; out.g = g; out.b = b; out.glow = glow;
  return d;
}

// ---------- Surface nets ----------
function mesh(list, cell) {
  const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const o of list) if (o.op === 'add') for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], o.s.bb[i] - o.k); bb[i + 3] = Math.max(bb[i + 3], o.s.bb[i + 3] + o.k); }
  for (let i = 0; i < 3; i++) { bb[i] -= cell * 2; bb[i + 3] += cell * 2; }
  const nx = Math.ceil((bb[3] - bb[0]) / cell) + 1, ny = Math.ceil((bb[4] - bb[1]) / cell) + 1, nz = Math.ceil((bb[5] - bb[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz), tmp = {};
  const at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[at(i, j, k)] = evalPart(list, bb[0] + i * cell, bb[1] + j * cell, bb[2] + k * cell, tmp);
  const vid = new Int32Array(nx * ny * nz).fill(-1);
  const P = [], N = [], Cl = [], Gl = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = F[at(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; n++;
    }
    const x = bb[0] + (i + sx / n) * cell, y = bb[1] + (j + sy / n) * cell, z = bb[2] + (k + sz / n) * cell;
    vid[at(i, j, k)] = P.length / 3;
    P.push(x, y, z);
    const e = cell * 0.5;
    const gx = evalPart(list, x + e, y, z, tmp) - evalPart(list, x - e, y, z, tmp);
    const gy = evalPart(list, x, y + e, z, tmp) - evalPart(list, x, y - e, z, tmp);
    const gz = evalPart(list, x, y, z + e, tmp) - evalPart(list, x, y, z - e, tmp);
    const gl = len(gx, gy, gz) || 1;
    N.push(gx / gl, gy / gl, gz / gl);
    evalPart(list, x, y, z, tmp);
    Cl.push(tmp.r, tmp.g, tmp.b); Gl.push(tmp.glow ? 1 : 0);
  }
  // One quad per grid edge that crosses the surface, joining the four cells around it.
  const I = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) I.push(a, c, b, a, d, c); else I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = F[at(i, j, k)] < 0;
    if (v0 !== (F[at(i + 1, j, k)] < 0)) quad(vid[at(i, j - 1, k - 1)], vid[at(i, j, k - 1)], vid[at(i, j, k)], vid[at(i, j - 1, k)], !v0);
    if (v0 !== (F[at(i, j + 1, k)] < 0)) quad(vid[at(i - 1, j, k - 1)], vid[at(i - 1, j, k)], vid[at(i, j, k)], vid[at(i, j, k - 1)], !v0);
    if (v0 !== (F[at(i, j, k + 1)] < 0)) quad(vid[at(i - 1, j - 1, k)], vid[at(i, j - 1, k)], vid[at(i, j, k)], vid[at(i - 1, j, k)], !v0);
  }
  return { P, N, C: Cl, G: Gl, I };
}

// ---------- Simplify (quadric edge collapse) ----------
// Collapses the edges that change the shape least until about `target` triangles are left.
// Edges on the open rim of a surface (the coat's hem and front) stay put. Afterwards every
// corner gets its colour and its normal again from the sculpt itself, so detail survives.
function simplify(m, target, list) {
  const nv = m.P.length / 3, P = Float64Array.from(m.P);
  let F = [];
  for (let t = 0; t < m.I.length; t += 3) F.push([m.I[t], m.I[t + 1], m.I[t + 2]]);
  if (F.length <= target) return m;
  const Q = Array.from({ length: nv }, () => new Float64Array(10));
  const plane = f => {
    const [a, b, c] = f, ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-12) return null;
    nx /= l; ny /= l; nz /= l;
    return [nx, ny, nz, -(nx * ax + ny * ay + nz * az), l / 2];
  };
  const addQ = (q, n, w) => { const [a, b, c, d] = n; q[0] += w * a * a; q[1] += w * a * b; q[2] += w * a * c; q[3] += w * a * d; q[4] += w * b * b; q[5] += w * b * c; q[6] += w * b * d; q[7] += w * c * c; q[8] += w * c * d; q[9] += w * d * d; };
  for (const f of F) { const n = plane(f); if (n) for (const v of f) addQ(Q[v], n, n[4]); }
  const err = (q, x, y, z) => q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  // Vertex -> faces, and which vertices sit on an open rim (an edge used by one face).
  const vf = Array.from({ length: nv }, () => []);
  F.forEach((f, i) => { for (const v of f) vf[v].push(i); });
  const ek = (a, b) => a < b ? a * nv + b : b * nv + a, ecount = new Map();
  for (const f of F) for (let k = 0; k < 3; k++) { const e = ek(f[k], f[(k + 1) % 3]); ecount.set(e, (ecount.get(e) || 0) + 1); }
  const rim = new Uint8Array(nv);
  for (const [e, c] of ecount) if (c === 1) { rim[Math.floor(e / nv)] = 1; rim[e % nv] = 1; }
  const alive = new Uint8Array(F.length).fill(1), ver = new Uint32Array(nv), dead = new Uint8Array(nv);
  // A min-heap of candidate collapses [cost, a, b, x, y, z, verA, verB].
  const H = [];
  const push = it => { H.push(it); let i = H.length - 1; while (i > 0) { const pa = (i - 1) >> 1; if (H[pa][0] <= H[i][0]) break; [H[pa], H[i]] = [H[i], H[pa]]; i = pa; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < H.length && H[l][0] < H[s][0]) s = l; if (r < H.length && H[r][0] < H[s][0]) s = r; if (s === i) break; [H[s], H[i]] = [H[i], H[s]]; i = s; } } return top; };
  const cand = (a, b) => {
    if (rim[a] && rim[b]) return;
    const q = new Float64Array(10); for (let k = 0; k < 10; k++) q[k] = Q[a][k] + Q[b][k];
    const opts = rim[a] ? [[P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]] : rim[b] ? [[P[b * 3], P[b * 3 + 1], P[b * 3 + 2]]]
      : [[P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], [(P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2]];
    let best = null, bc = Infinity;
    for (const o of opts) { const c = err(q, o[0], o[1], o[2]); if (c < bc) { bc = c; best = o; } }
    push([bc, a, b, best[0], best[1], best[2], ver[a], ver[b]]);
  };
  for (const e of ecount.keys()) cand(Math.floor(e / nv), e % nv);
  let faces = F.length;
  const normal = f => { const n = plane(f); return n; };
  while (faces > target && H.length) {
    const [, a, b, x, y, z, va, vb] = pop();
    if (dead[a] || dead[b] || ver[a] !== va || ver[b] !== vb) continue;
    // Don't fold any face over: check the normals of every face that moves.
    const ox = P[a * 3], oy = P[a * 3 + 1], oz = P[a * 3 + 2];
    let ok = true;
    for (const v of [a, b]) for (const fi of vf[v]) {
      if (!alive[fi]) continue;
      const f = F[fi]; if (f.includes(a) && f.includes(b)) continue;
      const n0 = normal(f); if (!n0) continue;
      const g = f.map(w => (w === a || w === b) ? -1 : w);
      const save = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]];
      P[a * 3] = x; P[a * 3 + 1] = y; P[a * 3 + 2] = z;
      const n1 = normal(g.map(w => w < 0 ? a : w));
      P[a * 3] = save[0]; P[a * 3 + 1] = save[1]; P[a * 3 + 2] = save[2];
      if (!n1 || n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] < 0.3) { ok = false; break; }
    }
    if (!ok) continue;
    void ox; void oy; void oz;
    P[a * 3] = x; P[a * 3 + 1] = y; P[a * 3 + 2] = z;
    for (let k = 0; k < 10; k++) Q[a][k] += Q[b][k];
    rim[a] = rim[a] | rim[b];
    dead[b] = 1;
    for (const fi of vf[b]) {
      if (!alive[fi]) continue;
      const f = F[fi];
      if (f.includes(a)) { alive[fi] = 0; faces--; continue; }
      for (let k = 0; k < 3; k++) if (f[k] === b) f[k] = a;
      vf[a].push(fi);
    }
    ver[a]++;
    const nb = new Set();
    for (const fi of vf[a]) if (alive[fi]) for (const w of F[fi]) if (w !== a) nb.add(w);
    for (const w of nb) { ver[w]++; }
    for (const w of nb) for (const fi of vf[w]) if (alive[fi]) for (const u of F[fi]) if (u !== w && !dead[u]) cand(w, u);
  }
  // Rebuild, with colours and normals read back from the sculpt.
  const map = new Int32Array(nv).fill(-1), out = { P: [], N: [], C: [], G: [], I: [] }, tmp = {};
  for (let fi = 0; fi < F.length; fi++) {
    if (!alive[fi]) continue;
    for (const v of F[fi]) {
      if (map[v] < 0) {
        map[v] = out.P.length / 3;
        const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], e = 0.002;
        out.P.push(x, y, z);
        const gx = evalPart(list, x + e, y, z, tmp) - evalPart(list, x - e, y, z, tmp), gy = evalPart(list, x, y + e, z, tmp) - evalPart(list, x, y - e, z, tmp), gz = evalPart(list, x, y, z + e, tmp) - evalPart(list, x, y, z - e, tmp);
        const gl = len(gx, gy, gz) || 1;
        out.N.push(gx / gl, gy / gl, gz / gl);
        evalPart(list, x, y, z, tmp);
        out.C.push(tmp.r, tmp.g, tmp.b); out.G.push(tmp.glow ? 1 : 0);
      }
      out.I.push(map[v]);
    }
  }
  return out;
}

function merge(a, b) {
  const n = a.P.length / 3;
  return { P: a.P.concat(b.P), N: a.N.concat(b.N), C: a.C.concat(b.C), G: a.G.concat(b.G), I: a.I.concat(b.I.map(i => i + n)) };
}

// Split triangles into lit and glowing ones (glow = all three corners glow).
function split(m) {
  const out = { lit: [], glow: [] };
  for (let t = 0; t < m.I.length; t += 3) {
    const a = m.I[t], b = m.I[t + 1], c = m.I[t + 2];
    (m.G[a] && m.G[b] && m.G[c] ? out.glow : out.lit).push(a, b, c);
  }
  return out;
}

// One MMG1 mesh (the format js/mmg.js reads), keeping only the vertices the triangles use.
function mmg(m, idx, origin) {
  const map = new Map(), P = [], N = [], C = [], I = [];
  for (const v of idx) {
    if (!map.has(v)) { map.set(v, P.length / 3); P.push(m.P[v * 3] - origin[0], m.P[v * 3 + 1] - origin[1], m.P[v * 3 + 2] - origin[2]); N.push(m.N[v * 3], m.N[v * 3 + 1], m.N[v * 3 + 2]); C.push(m.C[v * 3], m.C[v * 3 + 1], m.C[v * 3 + 2]); }
    I.push(map.get(v));
  }
  const n = P.length / 3, min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i * 3 + k]); max[k] = Math.max(max[k], P[i * 3 + k]); }
  for (let k = 0; k < 3; k++) if (max[k] - min[k] < 1e-6) max[k] = min[k] + 1e-3;
  const big = n > 65535;
  const head = Buffer.from(JSON.stringify({ verts: n, indices: I.length, min, max, big }));
  const hpad = (4 - (head.length + 8) % 4) % 4;
  const al = b => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4)]);
  const qp = new Uint16Array(n * 3), qn = new Int8Array(n * 3), qc = new Uint8Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const k = i % 3;
    qp[i] = Math.round((P[i] - min[k]) / (max[k] - min[k]) * 65535);
    qn[i] = Math.round(clamp(N[i], -1, 1) * 127);
    qc[i] = Math.round(clamp(C[i], 0, 1) * 255);
  }
  const ib = big ? new Uint32Array(I) : new Uint16Array(I);
  return Buffer.concat([Buffer.from('MMG1'), Buffer.from(new Uint32Array([head.length + hpad]).buffer), head, Buffer.alloc(hpad, 32),
    al(Buffer.from(qp.buffer)), al(Buffer.from(qn.buffer)), al(Buffer.from(qc.buffer)), al(Buffer.from(ib.buffer))]);
}

module.exports = { S, Model };

if (require.main === module) {
  const [modelPath, outPath] = process.argv.slice(2);
  if (!modelPath || !outPath) { console.error('usage: node scripts/sculpt.js model.js out.mms'); process.exit(1); }
  const def = require(path.resolve(modelPath));
  const model = Model();
  def.build(model, S);
  const parts = {}, blobs = [];
  let off = 0, tris = 0;
  for (const name of Object.keys(def.joints)) {
    const list = model.ops.filter(o => o.part === name && !o.solo), solos = model.ops.filter(o => o.part === name && o.solo);
    if (!list.some(o => o.op === 'add')) continue;
    const t0 = Date.now();
    const raw = mesh(list, (def.cells && def.cells[name]) || def.cell || 0.012);
    let m = def.budget && def.budget[name] ? simplify(raw, def.budget[name], list) : raw;
    for (const o of solos) { const one = [o]; m = merge(m, simplify(mesh(one, 0.004), 90, one)); }
    const sp = split(m);
    parts[name] = {};
    for (const kind of ['lit', 'glow']) {
      if (!sp[kind].length) continue;
      const b = mmg(m, sp[kind], def.joints[name]);
      parts[name][kind] = [off, b.length];
      blobs.push(b); off += b.length;
      tris += sp[kind].length / 3;
    }
    console.log(name.padEnd(7), String(sp.lit.length / 3 + sp.glow.length / 3).padStart(6), 'triangles', (Date.now() - t0) + ' ms');
  }
  const head = Buffer.from(JSON.stringify({ parts, joints: def.joints }));
  const hpad = (4 - (head.length + 8) % 4) % 4;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.concat([Buffer.from('MMS1'), Buffer.from(new Uint32Array([head.length + hpad]).buffer), head, Buffer.alloc(hpad, 32), ...blobs]));
  console.log(outPath + ':', tris, 'triangles,', Math.round(fs.statSync(outPath).size / 1024) + ' KB');
}
