// Turns a binary glTF (.glb) exported from mojulo (unlit, per-vertex colours) into the game's
// compact mesh format: one merged, indexed mesh with quantised positions, normals and colours.
//   node scripts/glb2mm.js in.glb out.mmg [--scale 1.4] [--center | --origin x,z] [--floor0] [--info]
//     [--hole x0,z0,x1,z1] (repeatable: drop the floor inside that box, e.g. a stairwell; final
//     game coordinates) [--no-footing] (drop what hangs below the floor: an upper storey's footing)
// Format (little endian): "MMG1", u32 header bytes, JSON header { verts, indices, min, max,
// scale, bits }, then positions (u16 x3, quantised to min..max), normals (i8 x3), colours
// (u8 x3), indices (u16 or u32). Everything is 4-byte aligned.
'use strict';
const fs = require('fs');
const [inPath, outPath] = process.argv.slice(2);
const flag = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SCALE = flag('--scale', 1), CENTER = process.argv.includes('--center');
if (!inPath || !outPath) { console.error('usage: node scripts/glb2mm.js in.glb out.mmg [--scale k] [--center]'); process.exit(1); }

const buf = fs.readFileSync(inPath);
if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a glb');
let off = 12, json = null, bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.toString('ascii', off + 4, off + 8);
  const chunk = buf.subarray(off + 8, off + 8 + len);
  if (type === 'JSON') json = JSON.parse(chunk.toString('utf8')); else if (type.startsWith('BIN')) bin = chunk;
  off += 8 + len;
}
const G = json;
const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function read(ai) {
  const a = G.accessors[ai], bv = G.bufferViews[a.bufferView], [Arr, sz] = COMP[a.componentType], n = NUM[a.type];
  const stride = bv.byteStride || sz * n, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float64Array(a.count * n);
  const dv = new DataView(bin.buffer, bin.byteOffset);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
    const o = base + i * stride + k * sz;
    let v = a.componentType === 5126 ? dv.getFloat32(o, true) : a.componentType === 5125 ? dv.getUint32(o, true) : a.componentType === 5123 ? dv.getUint16(o, true)
      : a.componentType === 5121 ? dv.getUint8(o) : a.componentType === 5122 ? dv.getInt16(o, true) : dv.getInt8(o);
    if (a.normalized) v /= a.componentType === 5121 ? 255 : a.componentType === 5123 ? 65535 : a.componentType === 5120 ? 127 : 32767;
    out[i * n + k] = v;
  }
  return { data: out, n, count: a.count };
}
// 4x4 matrices, column-major like glTF.
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function local(nd) {
  if (nd.matrix) return nd.matrix.slice();
  const [x, y, z, w] = nd.rotation || [0, 0, 0, 1], [sx, sy, sz] = nd.scale || [1, 1, 1], [tx, ty, tz] = nd.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
const P = [], N = [], Cc = [], I = [];
function addMesh(mi, M) {
  for (const pr of G.meshes[mi].primitives) {
    if ((pr.mode ?? 4) !== 4) continue;
    if (G.materials && pr.material !== undefined && G.materials[pr.material].alphaMode === 'BLEND') continue;   // see-through decals (water, contact shadows)
    const pos = read(pr.attributes.POSITION), nor = pr.attributes.NORMAL !== undefined ? read(pr.attributes.NORMAL) : null;
    const col = pr.attributes.COLOR_0 !== undefined ? read(pr.attributes.COLOR_0) : null;
    const mat = G.materials && pr.material !== undefined ? G.materials[pr.material] : null;
    const bc = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1];
    const v0 = P.length / 3;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.data[i * 3], y = pos.data[i * 3 + 1], z = pos.data[i * 3 + 2];
      P.push(M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]);
      if (nor) {
        const a = nor.data[i * 3], b = nor.data[i * 3 + 1], c = nor.data[i * 3 + 2];
        let nx = M[0] * a + M[4] * b + M[8] * c, ny = M[1] * a + M[5] * b + M[9] * c, nz = M[2] * a + M[6] * b + M[10] * c;
        const l = Math.hypot(nx, ny, nz) || 1; N.push(nx / l, ny / l, nz / l);
      } else N.push(0, 1, 0);
      if (col) Cc.push(col.data[i * col.n] * bc[0], col.data[i * col.n + 1] * bc[1], col.data[i * col.n + 2] * bc[2]); else Cc.push(bc[0], bc[1], bc[2]);
    }
    if (pr.indices !== undefined) { const ix = read(pr.indices); for (let i = 0; i < ix.count; i++) I.push(v0 + ix.data[i]); }
    else for (let i = 0; i < pos.count; i++) I.push(v0 + i);
  }
}
function walk(ni, parent) {
  const nd = G.nodes[ni], M = mul(parent, local(nd));
  if (nd.mesh !== undefined) addMesh(nd.mesh, M);
  for (const c of nd.children || []) walk(c, M);
}
const ID = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
for (const r of G.scenes[G.scene || 0].nodes) walk(r, ID);

// Scale, then put the floor at y = 0 and (optionally) the middle of the plan at x = z = 0.
const vc = P.length / 3, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vc; i++) for (let k = 0; k < 3; k++) { P[i * 3 + k] *= SCALE; min[k] = Math.min(min[k], P[i * 3 + k]); max[k] = Math.max(max[k], P[i * 3 + k]); }
if (process.argv.includes('--info')) console.log('raw bounds (after scale):', min.map(v => v.toFixed(2)), max.map(v => v.toFixed(2)));
// --origin x,z puts that (scaled) point at the middle; --floor0 keeps the authored floor at y = 0.
const oi = process.argv.indexOf('--origin'), org = oi > 0 ? process.argv[oi + 1].split(',').map(Number) : null;
const shift = [org ? -org[0] : CENTER ? -(min[0] + max[0]) / 2 : 0, process.argv.includes('--floor0') ? 0 : -min[1], org ? -org[1] : CENTER ? -(min[2] + max[2]) / 2 : 0];
for (let i = 0; i < vc; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] += shift[k];
for (let k = 0; k < 3; k++) { min[k] += shift[k]; max[k] += shift[k]; }

// Stairwells and footings: drop whole triangles (vertices stay, unreferenced).
const holes = []; process.argv.forEach((a, i) => { if (a === '--hole') holes.push(process.argv[i + 1].split(',').map(Number)); });
if (holes.length || process.argv.includes('--no-footing')) {
  const keep = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ys = [P[a + 1], P[b + 1], P[c + 1]], cx = (P[a] + P[b] + P[c]) / 3, cz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    if (process.argv.includes('--no-footing')) {
      if (Math.min(...ys) < -0.02) continue;
      // ...and the footing's top, one slab under the whole storey.
      const xs = [P[a], P[b], P[c]], zs = [P[a + 2], P[b + 2], P[c + 2]];
      if (Math.max(...ys.map(Math.abs)) < 0.03 && (Math.max(...xs) - Math.min(...xs) > 12 || Math.max(...zs) - Math.min(...zs) > 12)) continue;
    }
    if (Math.max(...ys) < 0.12 && holes.some(([x0, z0, x1, z1]) => cx > x0 && cx < x1 && cz > z0 && cz < z1)) continue;
    keep.push(I[t], I[t + 1], I[t + 2]);
  }
  console.log('dropped', (I.length - keep.length) / 3, 'triangles');
  I.length = 0; for (const v of keep) I.push(v);
}
const big = vc > 65535;
const head = Buffer.from(JSON.stringify({ verts: vc, indices: I.length, min, max, big }));
const hpad = (4 - (head.length % 4)) % 4;
const pos = new Uint16Array(vc * 3), nrm = new Int8Array(vc * 3 + ((4 - (vc * 3) % 4) % 4)), col = new Uint8Array(vc * 3 + ((4 - (vc * 3) % 4) % 4));
for (let i = 0; i < vc * 3; i++) {
  const k = i % 3, span = max[k] - min[k] || 1;
  pos[i] = Math.round((P[i] - min[k]) / span * 65535);
  nrm[i] = Math.round(N[i] * 127);
  col[i] = Math.round(Math.max(0, Math.min(1, Cc[i])) * 255);
}
const posB = Buffer.from(pos.buffer), padP = (4 - posB.length % 4) % 4;
const idx = big ? new Uint32Array(I) : new Uint16Array(I);
const out = Buffer.concat([Buffer.from('MMG1'), Buffer.from(new Uint32Array([head.length + hpad]).buffer), head, Buffer.alloc(hpad, 32),
  posB, Buffer.alloc(padP), Buffer.from(nrm.buffer), Buffer.from(col.buffer), Buffer.from(idx.buffer)]);
fs.writeFileSync(outPath, out);
console.log(`${outPath}: ${vc} vertices, ${I.length / 3} triangles, ${(out.length / 1024).toFixed(0)} KB, size ${max.map((v, k) => (v - min[k]).toFixed(1)).join(' x ')}`);
