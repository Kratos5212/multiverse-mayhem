// Loads meshes made outside the game (Mojulo exports, converted by scripts/glb2mm.js) into a
// three.js geometry: quantised positions, normals and baked per-vertex colours.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC || (window.MMC = {});
  const cache = new Map();
  C.parseMMG = function (ab) {
    const dv = new DataView(ab);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'MMG1') throw new Error('not an MMG mesh');
    const hl = dv.getUint32(4, true);
    const H = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl)));
    let off = 8 + hl;
    const n = H.verts * 3, al = k => (k + 3) & ~3;
    const qp = new Uint16Array(ab, off, n); off = al(off + n * 2);
    const qn = new Int8Array(ab, off, n); off = al(off + n);
    const qc = new Uint8Array(ab, off, n); off = al(off + n);
    const idx = H.big ? new Uint32Array(ab, off, H.indices) : new Uint16Array(ab, off, H.indices);
    const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = i % 3;
      pos[i] = H.min[k] + qp[i] / 65535 * (H.max[k] - H.min[k]);
      nor[i] = qn[i] / 127;
      col[i] = qc[i] / 255;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setIndex(new T.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
  };
  // Exports come unshaded (base colours only), so they take the game's own cel shading and
  // sit with everything else. Double-sided: the plan's walls are single sheets.
  C.mmgMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: C.gradientMap, side: T.DoubleSide });
  C.loadMMG = function (url) {
    if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + ': ' + r.status); return r.arrayBuffer(); }).then(C.parseMMG));
    return cache.get(url);
  };
})();
