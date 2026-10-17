'use strict';
// Characters sculpted with Mojulo. A model (scripts/models/*.js) is the same list of soft shapes
// scripts/sculpt.js reads: ellipsoids, capsules, cones and rounded boxes, each belonging to a body
// part and painted a colour, blended, carved and painted. This tool turns it into a Mojulo
// workbench recipe (one field solid per part and colour, so each comes back as its own mesh),
// and turns the mesh Mojulo exports back into the game's sculpt format, one mesh per body part
// around its joint, so the game's skeleton still walks, aims and ragdolls it.
//
//   node scripts/mojulo-character.js spec scripts/models/morty.js morty.spec.json
//     -> mint it: mint_solid({ kind: 'workbench', spec }) and export_model({ ref, format: 'glb', lit: true })
//   node scripts/mojulo-character.js mms scripts/models/morty.js model.glb assets/characters/morty.mms
//
// Mojulo is z-up with the front at -y; the game is y-up with the front at +z.
const fs = require('fs');
const path = require('path');

const toM = p => [+p[0].toFixed(4), +(-p[2]).toFixed(4), +p[1].toFixed(4)];
const fromM = (x, y, z) => [x, z, -y];

// The shapes, as Mojulo field shapes (game coordinates in, Mojulo's out).
const S = {
  sphere: (c, r) => ({ kind: 'sphere', center: toM(c), radius: r }),
  ell: (c, r) => ({ kind: 'ellipsoid', center: toM(c), radii: [r[0], r[2], r[1]] }),
  cap: (a, b, ra, rb) => rb === undefined || Math.abs(rb - ra) < 1e-6 ? { kind: 'capsule', a: toM(a), b: toM(b), radius: ra } : { kind: 'roundCone', a: toM(a), b: toM(b), ra, rb },
  box: (c, h, r) => ({ kind: 'box', center: toM(c), size: [h[0] * 2, h[2] * 2, h[1] * 2], round: r || 0 }),
  // A flat-ended cylinder from a to b (Mojulo's lathe with a straight profile): hats, crowns, bands.
  cyl: (a, b, r) => ({ kind: 'lathe', axisFrom: toM(a), axisTo: toM(b), profile: [{ t: 0, radius: r }, { t: 1, radius: r }] }),
  // A hollow version of a shape (cloth): the shape grown by t, less the shape shrunk by t.
  shell: (s, t) => ({ shell: s, t }),
};
// A shape grown (or shrunk) by e.
function grow(s, e) {
  switch (s.kind) {
    case 'sphere': return Object.assign({}, s, { radius: Math.max(0.001, s.radius + e) });
    case 'ellipsoid': return Object.assign({}, s, { radii: s.radii.map(r => Math.max(0.001, r + e)) });
    case 'capsule': return Object.assign({}, s, { radius: Math.max(0.001, s.radius + e) });
    case 'roundCone': return Object.assign({}, s, { ra: Math.max(0.001, s.ra + e), rb: Math.max(0.001, s.rb + e) });
    case 'box': return Object.assign({}, s, { size: s.size.map(v => Math.max(0.002, v + 2 * e)), round: Math.max(0, (s.round || 0) + Math.min(e, 0)) });
    case 'lathe': return Object.assign({}, s, { profile: s.profile.map(p => ({ t: p.t, radius: Math.max(0.001, p.radius + e) })) });
  }
  throw new Error('cannot grow ' + s.kind);
}
// The terms that add a shape (a shell is a little group of its own: outside, less the inside).
function addTerms(id, s, blend) {
  if (s.shell) return [{ id, op: 'transform', translate: [0, 0, 0], combine: 'add', blend: blend || undefined, terms: [{ id, op: 'add', shape: grow(s.shell, s.t) }, { id, op: 'subtract', shape: grow(s.shell, -s.t) }] }];
  return [{ id, op: 'add', shape: s, blend: blend || undefined }];
}
// How big a solid is (its longest side), from its terms.
function extent(terms) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const visit = s => {
    if (s.shell) return visit(grow(s.shell, s.t));
    const pts = [];
    if (s.center) { const r = s.radius !== undefined ? [s.radius, s.radius, s.radius] : s.radii || s.size.map(v => v / 2); pts.push(s.center.map((c, k) => c - r[k]), s.center.map((c, k) => c + r[k])); }
    if (s.a) { const r = s.radius !== undefined ? s.radius : Math.max(s.ra, s.rb); for (const p of [s.a, s.b]) pts.push(p.map(v => v - r), p.map(v => v + r)); }
    if (s.axisFrom) { const r = Math.max(...s.profile.map(p => p.radius)); for (const p of [s.axisFrom, s.axisTo]) pts.push(p.map(v => v - r), p.map(v => v + r)); }
    for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  };
  for (const t of terms) if (t.op === 'add') visit(t.shape); else if (t.op === 'transform') for (const u of t.terms) if (u.op === 'add') visit(u.shape);
  return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
}

// A model: the same calls as scripts/sculpt.js, recorded.
function Model() {
  const ops = [];
  return {
    ops,
    add(part, s, color, o) { ops.push({ op: 'add', part, s, c: color, k: (o && o.k) || 0.004, glow: !!(o && o.glow), solo: !!(o && o.solo) }); },
    carve(part, s, o) { ops.push({ op: 'carve', part, s, k: (o && o.k) || 0.004, only: o && o.only }); },
    paint(part, s, color, o) { ops.push({ op: 'paint', part, s, c: color, glow: !!(o && o.glow) }); },
  };
}

// The recipe: one field solid per part, colour and glow. Group ids are "<part>~<n>" (+ "~g" glowing).
function toSpec(def) {
  const M = Model();
  def.build(M, S);
  const groups = new Map(), fields = [], tints = {};
  const key = (part, c, glow, solo) => part + '|' + c + '|' + (glow ? 1 : 0) + '|' + (solo ? 's' : '');
  for (const o of M.ops) {
    if (o.op !== 'add') continue;
    const k = key(o.part, o.c, o.glow, o.solo);
    if (!groups.has(k)) groups.set(k, { part: o.part, c: o.c, glow: o.glow, solo: o.solo, ops: [] });
    groups.get(k).ops.push(o);
  }
  let n = 0;
  for (const g of groups.values()) {
    const id = g.part + '~' + (n++) + (g.glow ? '~g' : '');
    const terms = [];
    g.ops.forEach((o, i) => terms.push(...addTerms(id, o.s, i ? o.k : 0)));
    // A carve cuts every colour of its part (not the small separate details, as in sculpt.js).
    if (!g.solo) for (const o of M.ops) if (o.op === 'carve' && o.part === g.part && (!o.only || o.only === g.c)) terms.push(o.s.shell ? { id, op: 'subtract', shape: grow(o.s.shell, o.s.t) } : { id, op: 'subtract', shape: o.s, blend: o.k });
    tints[id] = g.c;
    fields.push({ cells: cellsFor(def, g, terms), tint: g.c, terms });
  }
  // Paint: the painted shape, cut down to the part's surface and lifted a hair off it.
  for (const o of M.ops) {
    if (o.op !== 'paint') continue;
    const id = o.part + '~' + (n++) + (o.glow ? '~g' : '');
    const body = M.ops.filter(a => a.op === 'add' && a.part === o.part && !a.solo && !a.s.shell);   // the body, not the cloth over it
    const terms = [{ id, op: 'add', shape: o.s.shell ? grow(o.s.shell, o.s.t) : o.s },
      { id, op: 'transform', translate: [0, 0, 0], combine: 'intersect', terms: body.map((a, i) => ({ id, op: 'add', shape: a.s.shell ? grow(a.s.shell, a.s.t + 0.002) : grow(a.s, 0.002), blend: i ? a.k : undefined })) }];
    for (const c of M.ops) if (c.op === 'carve' && c.part === o.part && !c.only) terms.push({ id, op: 'subtract', shape: c.s, blend: c.k });
    tints[id] = o.c;
    fields.push({ cells: cellsFor(def, { part: o.part, solo: false }, terms), tint: o.c, terms });
  }
  return { spec: { units: 'm', grid: false, facing: '-y', fields }, tints };
}
// Grid cells along a solid's longest side: about one cell per `cell` metres (finer for the head),
// so small details stay crisp and big pieces don't explode into triangles.
function cellsFor(def, g, terms) {
  const cell = g.solo ? (def.soloCell || 0.004) : (def.cells && def.cells[g.part]) || def.cell || 0.012;
  return Math.max(16, Math.min(128, Math.ceil(extent(terms) / cell)));
}

// ---------- glb in ----------
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a glb');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.toString('ascii', off + 4, off + 8), chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 'JSON') json = JSON.parse(chunk.toString('utf8')); else if (type.startsWith('BIN')) bin = chunk;
    off += 8 + len;
  }
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const read = ai => {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const sz = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType], stride = bv.byteStride || sz * n, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Float64Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      const o = base + i * stride + k * sz;
      out[i * n + k] = a.componentType === 5126 ? dv.getFloat32(o, true) : a.componentType === 5125 ? dv.getUint32(o, true) : a.componentType === 5123 ? dv.getUint16(o, true) : dv.getUint8(o);
    }
    return out;
  };
  const meshes = {};
  for (const nd of json.nodes) {
    if (nd.mesh === undefined || !nd.name || !nd.name.includes('~')) continue;
    if (nd.translation || nd.rotation || nd.scale || nd.matrix) throw new Error('node ' + nd.name + ' is moved; expected world coordinates');
    for (const pr of json.meshes[nd.mesh].primitives) {
      const Pm = read(pr.attributes.POSITION), I = pr.indices !== undefined ? Array.from(read(pr.indices)) : Array.from({ length: Pm.length / 3 }, (_, i) => i);
      const P = [];
      for (let i = 0; i < Pm.length; i += 3) app(P, fromM(Pm[i], Pm[i + 1], Pm[i + 2]));
      (meshes[nd.name] || (meshes[nd.name] = [])).push({ P, I });
    }
  }
  return meshes;
}

// Weld vertices that sit on the same spot (surface nets can emit them twice), drop slivers.
function weld(m) {
  const map = new Map(), P = [], remap = [];
  for (let i = 0; i < m.P.length / 3; i++) {
    const k = Math.round(m.P[i * 3] * 1e5) + ',' + Math.round(m.P[i * 3 + 1] * 1e5) + ',' + Math.round(m.P[i * 3 + 2] * 1e5);
    if (!map.has(k)) { map.set(k, P.length / 3); P.push(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]); }
    remap.push(map.get(k));
  }
  const I = [];
  for (let t = 0; t < m.I.length; t += 3) { const a = remap[m.I[t]], b = remap[m.I[t + 1]], c = remap[m.I[t + 2]]; if (a !== b && b !== c && a !== c) I.push(a, b, c); }
  return { P, I };
}

// Quadric edge collapse down to about `target` triangles (as in scripts/sculpt.js, on a plain mesh).
function simplify(m, target) {
  const nv = m.P.length / 3, P = Float64Array.from(m.P);
  const F = [];
  for (let t = 0; t < m.I.length; t += 3) F.push([m.I[t], m.I[t + 1], m.I[t + 2]]);
  if (F.length <= target) return m;
  const Q = Array.from({ length: nv }, () => new Float64Array(10));
  const plane = f => {
    const [a, b, c] = f, ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-14) return null;
    nx /= l; ny /= l; nz /= l;
    return [nx, ny, nz, -(nx * ax + ny * ay + nz * az), l / 2];
  };
  const addQ = (q, n, w) => { const [a, b, c, d] = n; q[0] += w * a * a; q[1] += w * a * b; q[2] += w * a * c; q[3] += w * a * d; q[4] += w * b * b; q[5] += w * b * c; q[6] += w * b * d; q[7] += w * c * c; q[8] += w * c * d; q[9] += w * d * d; };
  for (const f of F) { const n = plane(f); if (n) for (const v of f) addQ(Q[v], n, n[4]); }
  const err = (q, x, y, z) => q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const vf = Array.from({ length: nv }, () => []);
  F.forEach((f, i) => { for (const v of f) vf[v].push(i); });
  const ek = (a, b) => a < b ? a * nv + b : b * nv + a, ecount = new Map();
  for (const f of F) for (let k = 0; k < 3; k++) { const e = ek(f[k], f[(k + 1) % 3]); ecount.set(e, (ecount.get(e) || 0) + 1); }
  const rim = new Uint8Array(nv);
  for (const [e, c] of ecount) if (c !== 2) { rim[Math.floor(e / nv)] = 1; rim[e % nv] = 1; }
  const alive = new Uint8Array(F.length).fill(1), ver = new Uint32Array(nv), dead = new Uint8Array(nv);
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
  while (faces > target && H.length) {
    const [, a, b, x, y, z, va, vb] = pop();
    if (dead[a] || dead[b] || ver[a] !== va || ver[b] !== vb) continue;
    let ok = true;
    for (const v of [a, b]) for (const fi of vf[v]) {
      if (!alive[fi]) continue;
      const f = F[fi]; if (f.includes(a) && f.includes(b)) continue;
      const n0 = plane(f); if (!n0) continue;
      const save = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]];
      P[a * 3] = x; P[a * 3 + 1] = y; P[a * 3 + 2] = z;
      const n1 = plane(f.map(w => (w === a || w === b) ? a : w));
      P[a * 3] = save[0]; P[a * 3 + 1] = save[1]; P[a * 3 + 2] = save[2];
      if (!n1 || n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] < 0.3) { ok = false; break; }
    }
    if (!ok) continue;
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
    for (const w of nb) ver[w]++;
    for (const w of nb) for (const fi of vf[w]) if (alive[fi]) for (const u of F[fi]) if (u !== w && !dead[u]) cand(w, u);
  }
  const map = new Int32Array(nv).fill(-1), out = { P: [], I: [] };
  for (let fi = 0; fi < F.length; fi++) {
    if (!alive[fi]) continue;
    for (const v of F[fi]) { if (map[v] < 0) { map[v] = out.P.length / 3; out.P.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } out.I.push(map[v]); }
  }
  return out;
}
// Smooth normals (area weighted).
function normals(m) {
  const N = new Float64Array(m.P.length);
  for (let t = 0; t < m.I.length; t += 3) {
    const [a, b, c] = [m.I[t], m.I[t + 1], m.I[t + 2]];
    const ux = m.P[b * 3] - m.P[a * 3], uy = m.P[b * 3 + 1] - m.P[a * 3 + 1], uz = m.P[b * 3 + 2] - m.P[a * 3 + 2];
    const vx = m.P[c * 3] - m.P[a * 3], vy = m.P[c * 3 + 1] - m.P[a * 3 + 1], vz = m.P[c * 3 + 2] - m.P[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { N[v * 3] += nx; N[v * 3 + 1] += ny; N[v * 3 + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return Array.from(N);
}
const app = (a, b) => { for (let i = 0; i < b.length; i++) a.push(b[i]); };
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// One MMG1 mesh (js/mmg.js), in its joint's space.
function mmg(P, N, C, I, origin) {
  const n = P.length / 3, Q = P.map((v, i) => v - origin[i % 3]), min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], Q[i * 3 + k]); max[k] = Math.max(max[k], Q[i * 3 + k]); }
  for (let k = 0; k < 3; k++) if (max[k] - min[k] < 1e-6) max[k] = min[k] + 1e-3;
  const big = n > 65535;
  const head = Buffer.from(JSON.stringify({ verts: n, indices: I.length, min, max, big }));
  const hpad = (4 - (head.length + 8) % 4) % 4;
  const al = b => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4)]);
  const qp = new Uint16Array(n * 3), qn = new Int8Array(n * 3), qc = new Uint8Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const k = i % 3;
    qp[i] = Math.round((Q[i] - min[k]) / (max[k] - min[k]) * 65535);
    qn[i] = Math.round(clamp(N[i], -1, 1) * 127);
    qc[i] = Math.round(clamp(C[i], 0, 1) * 255);
  }
  const ib = big ? new Uint32Array(I) : new Uint16Array(I);
  return Buffer.concat([Buffer.from('MMG1'), Buffer.from(new Uint32Array([head.length + hpad]).buffer), head, Buffer.alloc(hpad, 32),
    al(Buffer.from(qp.buffer)), al(Buffer.from(qn.buffer)), al(Buffer.from(qc.buffer)), al(Buffer.from(ib.buffer))]);
}

function toMms(def, glbFile, outFile) {
  const { tints } = toSpec(def);
  const meshes = glbFile ? readGlb(glbFile) : preview(def);
  // Each part's pieces, simplified to the part's budget in proportion to their size.
  const byPart = {};
  for (const id in meshes) {
    const part = id.split('~')[0];
    if (!def.joints[part]) { console.warn('no joint for', id); continue; }
    let m = { P: [], I: [] };
    for (const q of meshes[id]) { const o = m.P.length / 3; app(m.P, q.P); app(m.I, q.I.map(i => i + o)); }
    m = weld(m);
    (byPart[part] || (byPart[part] = [])).push({ id, m, glow: id.endsWith('~g'), color: hex(tints[id] || '#ff00ff') });
  }
  const parts = {}, blobs = [];
  let off = 0, total = 0;
  for (const part of Object.keys(def.joints)) {
    const list = byPart[part];
    if (!list) continue;
    const raw = list.reduce((s, q) => s + q.m.I.length / 3, 0), budget = (def.budget && def.budget[part]) || raw;
    const acc = { lit: { P: [], N: [], C: [], I: [] }, glow: { P: [], N: [], C: [], I: [] } };
    for (const q of list) {
      const tris = q.m.I.length / 3, target = Math.max(40, Math.round(budget * tris / raw));
      const s = simplify(q.m, target), N = normals(s), A = acc[q.glow ? 'glow' : 'lit'], o = A.P.length / 3;
      app(A.P, s.P); app(A.N, N); for (let i = 0; i < s.P.length / 3; i++) A.C.push(q.color[0], q.color[1], q.color[2]);
      app(A.I, s.I.map(i => i + o));
    }
    parts[part] = {};
    for (const kind of ['lit', 'glow']) {
      const A = acc[kind];
      if (!A.I.length) continue;
      const b = mmg(A.P, A.N, A.C, A.I, def.joints[part]);
      parts[part][kind] = [off, b.length]; blobs.push(b); off += b.length;
      total += A.I.length / 3;
    }
    console.log(part.padEnd(7), String(Math.round((acc.lit.I.length + acc.glow.I.length) / 3)).padStart(6), 'triangles (from', raw + ')');
  }
  const head = Buffer.from(JSON.stringify({ parts, joints: def.joints, via: 'mojulo' }));
  const hpad = (4 - (head.length + 8) % 4) % 4;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.concat([Buffer.from('MMS1'), Buffer.from(new Uint32Array([head.length + hpad]).buffer), head, Buffer.alloc(hpad, 32), ...blobs]));
  console.log(outFile + ':', total, 'triangles,', Math.round(fs.statSync(outFile).size / 1024) + ' KB');
}

// ---------- A local preview ----------
// The same recipe, evaluated here (signed distances, smooth blends, surface nets), so a model can be
// checked in the game before it goes to Mojulo. Mojulo's own mesh is the one that ships.
const L3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
function sdf(s) {
  switch (s.kind) {
    case 'sphere': { const [a, b, c] = s.center, r = s.radius; return (x, y, z) => L3(x - a, y - b, z - c) - r; }
    case 'ellipsoid': { const [a, b, c] = s.center, [rx, ry, rz] = s.radii; return (x, y, z) => { const px = (x - a) / rx, py = (y - b) / ry, pz = (z - c) / rz, k0 = L3(px, py, pz), k1 = L3(px / rx, py / ry, pz / rz); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1; }; }
    case 'capsule': { const A = s.a, B = s.b, r = s.radius, bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2], l2 = bx * bx + by * by + bz * bz || 1e-12;
      return (x, y, z) => { const px = x - A[0], py = y - A[1], pz = z - A[2], t = clamp((px * bx + py * by + pz * bz) / l2, 0, 1); return L3(px - bx * t, py - by * t, pz - bz * t) - r; }; }
    case 'roundCone': { const A = s.a, B = s.b, ra = s.ra, rb = s.rb, bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2], l2 = bx * bx + by * by + bz * bz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
      return (x, y, z) => { const px = x - A[0], py = y - A[1], pz = z - A[2], yy = px * bx + py * by + pz * bz, zz = yy - l2;
        const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy, x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
        if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
        if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
        return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra; }; }
    case 'box': { const [a, b, c] = s.center, [hx, hy, hz] = s.size.map(v => v / 2), r = s.round || 0;
      return (x, y, z) => { const qx = Math.abs(x - a) - hx + r, qy = Math.abs(y - b) - hy + r, qz = Math.abs(z - c) - hz + r; return L3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; }; }
    case 'lathe': { const A = s.axisFrom, B = s.axisTo, r = s.profile[0].radius, bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2], l = L3(bx, by, bz), ux = bx / l, uy = by / l, uz = bz / l;
      return (x, y, z) => { const px = x - A[0], py = y - A[1], pz = z - A[2], h = px * ux + py * uy + pz * uz, rad = L3(px - ux * h, py - uy * h, pz - uz * h);
        const dx = rad - r, dy = Math.abs(h - l / 2) - l / 2; return Math.min(Math.max(dx, dy), 0) + L3(Math.max(dx, 0), Math.max(dy, 0), 0); }; }
  }
  throw new Error('preview: no ' + s.kind);
}
function compile(terms, combine) {
  const fs = terms.map(t => ({ t, f: t.op === 'transform' ? compile(t.terms) : sdf(t.shape) }));
  return (x, y, z) => {
    let d = 1e9;
    for (const { t, f } of fs) {
      const di = f(x, y, z), k = t.blend || 0, op = t.op === 'transform' ? t.combine : t.op;
      if (d > 1e8 && op === 'add') { d = di; continue; }
      if (op === 'add') { if (k > 0) { const h = clamp(0.5 + 0.5 * (di - d) / k, 0, 1); d = di + (d - di) * h - k * h * (1 - h); } else d = Math.min(d, di); }
      else if (op === 'subtract') { if (k > 0) { const h = clamp(0.5 - 0.5 * (d + di) / k, 0, 1); d = d + (-di - d) * h + k * h * (1 - h); } else d = Math.max(d, -di); }
      else if (op === 'intersect') { if (k > 0) { const h = clamp(0.5 - 0.5 * (di - d) / k, 0, 1); d = di + (d - di) * h + k * h * (1 - h); } else d = Math.max(d, di); }
    }
    return d;
  };
}
// Surface nets over a field, `cells` along its longest side (Mojulo's z-up coordinates).
function polygonize(f, lo, hi, cells) {
  const span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), cell = span / cells;
  const b0 = lo.map(v => v - cell * 2), n = [0, 1, 2].map(k => Math.ceil((hi[k] - lo[k]) / cell) + 5);
  const F = new Float32Array(n[0] * n[1] * n[2]), at = (i, j, k) => i + n[0] * (j + n[1] * k);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) F[at(i, j, k)] = f(b0[0] + i * cell, b0[1] + j * cell, b0[2] + k * cell);
  const vid = new Int32Array(F.length).fill(-1), P = [], I = [], cv = new Float32Array(8);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < n[2] - 1; k++) for (let j = 0; j < n[1] - 1; j++) for (let i = 0; i < n[0] - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = F[at(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of E) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; m++; }
    vid[at(i, j, k)] = P.length / 3;
    P.push(...fromM(b0[0] + (i + sx / m) * cell, b0[1] + (j + sy / m) * cell, b0[2] + (k + sz / m) * cell));
  }
  for (let k = 1; k < n[2] - 1; k++) for (let j = 1; j < n[1] - 1; j++) for (let i = 1; i < n[0] - 1; i++) {
    const v0 = F[at(i, j, k)];
    for (const [di, dj, dk, ax] of [[1, 0, 0, 0], [0, 1, 0, 1], [0, 0, 1, 2]]) {
      const v1 = F[at(i + di, j + dj, k + dk)];
      if ((v0 < 0) === (v1 < 0)) continue;
      const q = ax === 0 ? [at(i, j, k), at(i, j - 1, k), at(i, j - 1, k - 1), at(i, j, k - 1)] : ax === 1 ? [at(i, j, k), at(i, j, k - 1), at(i - 1, j, k - 1), at(i - 1, j, k)] : [at(i, j, k), at(i - 1, j, k), at(i - 1, j - 1, k), at(i, j - 1, k)];
      const ids = q.map(c => vid[c]);
      if (ids.some(v => v < 0)) continue;
      // Mojulo is right-handed z-up and the game y-up: fromM keeps handedness, so wind by the sign.
      if (v0 < 0) I.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]); else I.push(ids[0], ids[2], ids[1], ids[0], ids[3], ids[2]);
    }
  }
  return { P, I };
}
function bounds(terms) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const visit = s => {
    const pts = [];
    if (s.center) { const r = s.radius !== undefined ? [s.radius, s.radius, s.radius] : s.radii || s.size.map(v => v / 2); pts.push(s.center.map((c, k) => c - r[k]), s.center.map((c, k) => c + r[k])); }
    if (s.a) { const r = s.radius !== undefined ? s.radius : Math.max(s.ra, s.rb); for (const p of [s.a, s.b]) pts.push(p.map(v => v - r), p.map(v => v + r)); }
    if (s.axisFrom) { const r = Math.max(...s.profile.map(p => p.radius)); for (const p of [s.axisFrom, s.axisTo]) pts.push(p.map(v => v - r), p.map(v => v + r)); }
    for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  };
  for (const t of terms) { if (t.op === 'add') visit(t.shape); if (t.op === 'transform' && t.combine !== 'subtract') for (const u of t.terms) if (u.op === 'add') visit(u.shape); }
  for (let k = 0; k < 3; k++) { lo[k] -= 0.02; hi[k] += 0.02; }
  return [lo, hi];
}
// The preview as the meshes Mojulo would send back: { "<group id>": [{ P, I }] } in game coordinates.
function preview(def) {
  const { spec } = toSpec(def), out = {};
  for (const f of spec.fields) {
    const id = f.terms[0].id, [lo, hi] = bounds(f.terms);
    out[id] = [polygonize(compile(f.terms), lo, hi, Math.min(f.cells, 96))];
  }
  return out;
}

module.exports = { S, Model, toSpec, preview };

if (require.main === module) {
  const [cmd, modelPath, a, b] = process.argv.slice(2);
  const def = modelPath && require(path.resolve(modelPath));
  if (cmd === 'spec' && def) {
    const { spec } = toSpec(def);
    const json = JSON.stringify(spec, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v);
    if (a) fs.writeFileSync(a, json); else process.stdout.write(json);
    console.error(spec.fields.length, 'field solids,', json.length, 'bytes');
  } else if (cmd === 'mms' && def && a && b) toMms(def, a, b);
  else if (cmd === 'preview' && def && a) toMms(def, null, a);
  else { console.error('usage: node scripts/mojulo-character.js spec model.js [out.json] | mms model.js in.glb out.mms | preview model.js out.mms'); process.exit(1); }
}
