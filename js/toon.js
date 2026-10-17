// Cartoon rendering: flat cel shading, thick black outlines, and a small builder
// that merges coloured primitives into one geometry so a whole character or prop
// draws in a couple of calls.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC || (window.MMC = {});

  // Two flat tones, like the show: full colour in the light, one soft shadow tone.
  const grad = new Uint8Array([140, 140, 140, 255, 255, 255, 255, 255]);
  const gradientMap = new T.DataTexture(grad, 2, 1, T.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = T.NearestFilter;
  gradientMap.needsUpdate = true;
  C.gradientMap = gradientMap;

  C.toonMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap });
  C.glowMat = new T.MeshBasicMaterial({ vertexColors: true, fog: true });
  // The look: 'real' (the default: soft, physically lit surfaces, real shadows and thin ink
  // lines) or 'cartoon' (flat cel shading and thick outlines). Chosen once, before anything
  // is built (Settings; it takes effect on the next load).
  C.style = 'cartoon';
  C.outlineScale = 1;
  C.setStyle = function (style, quality) {
    C.style = style === 'cartoon' ? 'cartoon' : 'real';
    if (C.style === 'real') {
      C.toonMat = quality === 'low' ? new T.MeshLambertMaterial({ vertexColors: true }) : new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04 });
      C.outlineScale = 0.45;
    }
  };

  // Outline: the back faces of the mesh, pushed out along smoothed normals and drawn black.
  // The shell is also nudged away from the camera (C.outlineDepth x its thickness), so only
  // real silhouettes and real steps get a line: the shells of pieces sitting just under a
  // surface (a hair cap under the forehead, eyelids on an eye) stay hidden behind it.
  C.outlineDepth = 1.6;
  const outlineCache = {};
  C.outlineMat = function (thick, color) {
    // Characters (thin lines) keep more of their ink than the scenery in the realistic look.
    thick *= thick < 0.045 ? Math.min(1, C.outlineScale * 1.6) : C.outlineScale;
    const key = thick + ':' + (color || '#1d1813');
    if (outlineCache[key]) return outlineCache[key];
    const m = new T.MeshBasicMaterial({ color: color || '#1d1813', side: T.BackSide, fog: true });
    // Characters (thin lines) hide every inner shell; props keep the steps that stand out
    // further (window frames, trim) for a hand-inked look.
    const depth = thick * (thick < 0.045 ? C.outlineDepth : C.outlineDepth * 0.35);
    m.onBeforeCompile = sh => {
      sh.uniforms.uThick = { value: thick };
      sh.uniforms.uDepth = { value: depth };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 onrm;\nuniform float uThick;\nuniform float uDepth;')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + onrm * uThick;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nmvPosition.z -= uDepth;\ngl_Position = projectionMatrix * mvPosition;');
    };
    m.customProgramCacheKey = () => 'outline' + thick + ':' + depth;
    outlineCache[key] = m;
    return m;
  };

  // ---------- Shape builder ----------
  const tmpM = new T.Matrix4(), tmpN = new T.Matrix3(), tmpV = new T.Vector3(), tmpC = new T.Color();
  // Shapes are smooth by default: boxes get rounded edges and the shared primitives are
  // swapped for high-polygon versions. Far-away props use a plain Shape({ smooth: false }).
  class Shape {
    constructor(opts) {
      this.lit = { p: [], n: [], c: [] }; this.glow = { p: [], n: [], c: [] };
      this.smooth = opts && opts.smooth !== undefined ? !!opts.smooth : C.shapeSmooth !== false;
      this.lo = !!(opts && opts.lo) || C.shapeLo === true;
      this.mid = C.shapeMid === true;   // smooth boxes, but the plain primitives (characters)
    }
    // Add a geometry with a transform and a colour. opts: glow (unlit), pos, rot, scl.
    add(geo, color, pos, rot, scl, glow) {
      if (this.smooth) {
        if (geo === P.box && scl) { const rb = roundedBox(Math.abs(scl[0]), Math.abs(scl[1]), Math.abs(scl[2])); if (rb) { geo = rb; scl = null; } }
        else geo = (this.mid ? MID.get(geo) : HI.get(geo)) || geo;
      } else if (this.lo) geo = LO.get(geo) || geo;
      const g = geo.index ? geo.toNonIndexed() : geo;
      tmpM.compose(
        tmpV.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0),
        new T.Quaternion().setFromEuler(new T.Euler(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ')),
        new T.Vector3(scl ? scl[0] : 1, scl ? scl[1] : 1, scl ? scl[2] : 1));
      tmpN.getNormalMatrix(tmpM);
      const PA = g.attributes.position, N = g.attributes.normal;
      const out = glow ? this.glow : this.lit;
      tmpC.set(color);
      const v = new T.Vector3();
      for (let i = 0; i < PA.count; i++) {
        v.fromBufferAttribute(PA, i).applyMatrix4(tmpM);
        out.p.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(tmpN).normalize();
        out.n.push(v.x, v.y, v.z);
        out.c.push(tmpC.r, tmpC.g, tmpC.b);
      }
      if (g !== geo) g.dispose();
      return this;
    }
    // One BufferGeometry (with outline normals) from a lit or glow bucket.
    static geo(b) {
      if (!b.p.length) return null;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(b.c, 3));
      g.setAttribute('onrm', new T.Float32BufferAttribute(smoothNormals(b.p, b.n), 3));
      g.computeBoundingSphere();
      return g;
    }
    build() { return { lit: Shape.geo(this.lit), glow: Shape.geo(this.glow) }; }
  }
  C.Shape = Shape;

  // Average normals of vertices sharing a position, so outlines stay closed on hard edges.
  function smoothNormals(p, n) {
    const map = new Map(), out = new Float32Array(n.length);
    const key = i => Math.round(p[i] * 1000) + ',' + Math.round(p[i + 1] * 1000) + ',' + Math.round(p[i + 2] * 1000);
    for (let i = 0; i < p.length; i += 3) {
      const k = key(i);
      let a = map.get(k);
      if (!a) map.set(k, a = [0, 0, 0]);
      a[0] += n[i]; a[1] += n[i + 1]; a[2] += n[i + 2];
    }
    for (let i = 0; i < p.length; i += 3) {
      const a = map.get(key(i));
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      out[i] = a[0] / l; out[i + 1] = a[1] / l; out[i + 2] = a[2] / l;
    }
    return out;
  }

  // A mesh (and its outline) from a built shape. Returns a Group.
  C.meshOf = function (built, thick) {
    const g = new T.Group();
    if (built.lit) {
      const m = new T.Mesh(built.lit, C.toonMat);
      g.add(m);
      if (thick) { const o = new T.Mesh(built.lit, C.outlineMat(thick)); g.add(o); }
    }
    if (built.glow) {
      g.add(new T.Mesh(built.glow, C.glowMat));
      if (thick) g.add(new T.Mesh(built.glow, C.outlineMat(thick)));
    }
    return g;
  };

  // Shared primitive geometries (unit sized; scale them when adding).
  let P = null;
  const HI = new Map();
  P = C.prim = {
    sphere: new T.SphereGeometry(1, 14, 10),
    sphereLo: new T.SphereGeometry(1, 9, 7),
    cyl: new T.CylinderGeometry(1, 1, 1, 12),
    cylLo: new T.CylinderGeometry(1, 1, 1, 7),
    cone: new T.ConeGeometry(1, 1, 10),
    coneLo: new T.ConeGeometry(1, 1, 6),
    box: new T.BoxGeometry(1, 1, 1),
    capsule: new T.CapsuleGeometry(1, 1, 5, 10),
    torus: new T.TorusGeometry(1, 0.25, 8, 20),
    octa: new T.OctahedronGeometry(1, 0),
    dodeca: new T.DodecahedronGeometry(1, 0),
    hemi: closedHemi(),
    prism: gablePrism(),
  };
  // High-polygon stand-ins used by smooth shapes.
  HI.set(P.sphere, new T.SphereGeometry(1, 24, 16));
  HI.set(P.sphereLo, new T.SphereGeometry(1, 14, 10));
  HI.set(P.cyl, new T.CylinderGeometry(1, 1, 1, 24));
  HI.set(P.cylLo, new T.CylinderGeometry(1, 1, 1, 12));
  HI.set(P.cone, new T.ConeGeometry(1, 1, 18));
  HI.set(P.coneLo, new T.ConeGeometry(1, 1, 12));
  HI.set(P.capsule, new T.CapsuleGeometry(1, 1, 6, 18));
  HI.set(P.torus, new T.TorusGeometry(1, 0.25, 10, 36));
  HI.set(P.dodeca, new T.IcosahedronGeometry(1, 2));
  HI.set(P.hemi, closedHemi(30, 12));
  C.primHi = HI;
  // Medium stand-ins for characters up close (there can be a crowd of them).
  const MID = new Map();
  MID.set(P.sphere, new T.SphereGeometry(1, 12, 8));
  MID.set(P.sphereLo, new T.SphereGeometry(1, 8, 6));
  MID.set(P.capsule, new T.CapsuleGeometry(1, 1, 3, 8));
  MID.set(P.torus, new T.TorusGeometry(1, 0.25, 6, 18));
  MID.set(P.cyl, new T.CylinderGeometry(1, 1, 1, 12));
  // Coarse stand-ins for far-away props.
  const LO = new Map();
  LO.set(P.sphere, new T.SphereGeometry(1, 8, 6));
  LO.set(P.sphereLo, new T.SphereGeometry(1, 6, 4));
  LO.set(P.cyl, new T.CylinderGeometry(1, 1, 1, 8));
  LO.set(P.cylLo, new T.CylinderGeometry(1, 1, 1, 5));
  LO.set(P.cone, new T.ConeGeometry(1, 1, 7));
  LO.set(P.capsule, new T.CapsuleGeometry(1, 1, 2, 7));
  LO.set(P.torus, new T.TorusGeometry(1, 0.25, 4, 12));
  LO.set(P.hemi, closedHemi(8, 4));

  // A box of the given size with rounded edges and corners (k segments per bevel).
  // Each face is a grid whose outer rows are pushed onto quarter circles, so the
  // edges blend smoothly and the flat middle stays flat.
  const rbCache = new Map();
  function roundedBox(w, h, d) {
    const m = Math.min(w, h, d);
    if (m < 0.1) return null;                      // trim and thin boards: the outline already softens them
    const r = Math.min(0.12, m * 0.3), k = r < 0.06 ? 1 : C.bevelSegs || 3;
    const key = k + ':' + w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3);
    if (rbCache.has(key)) return rbCache.get(key);
    const n = 2 * k + 1;
    const g = new T.BoxGeometry(1, 1, 1, n, n, n);
    const half = [w / 2, h / 2, d / 2], inner = half.map(x => x - r);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const coord = (u, a) => {
      const i = Math.round((u + 0.5) * n);
      if (i <= k) return -(inner[a] + r * Math.tan(((k - i) / k) * Math.PI / 4));
      const j = n - i;
      return inner[a] + r * Math.tan(((k - j) / k) * Math.PI / 4);
    };
    const v = [0, 0, 0], c = [0, 0, 0];
    for (let i = 0; i < pos.count; i++) {
      const raw = [pos.getX(i), pos.getY(i), pos.getZ(i)], nn = [nor.getX(i), nor.getY(i), nor.getZ(i)];
      for (let a = 0; a < 3; a++) v[a] = Math.abs(nn[a]) > 0.5 ? Math.sign(nn[a]) * half[a] : coord(raw[a], a);
      for (let a = 0; a < 3; a++) c[a] = Math.max(-inner[a], Math.min(inner[a], v[a]));
      let dx = v[0] - c[0], dy = v[1] - c[1], dz = v[2] - c[2];
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      pos.setXYZ(i, c[0] + dx * r, c[1] + dy * r, c[2] + dz * r);
      nor.setXYZ(i, dx, dy, dz);
    }
    if (rbCache.size > 4000) rbCache.clear();
    rbCache.set(key, g);
    return g;
  }
  C.roundedBox = roundedBox;

  // A flat outline with rounded corners, extruded and bevelled: for car bodies and other
  // curvy silhouettes. pts are [x, y] corners; r rounds each corner. The result lies in
  // the x-y plane, centred on z.
  C.profileGeo = function (pts, r, depth, bevel) {
    const sh = new T.Shape();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const ra = Math.min(r, da * 0.45), rb = Math.min(r, db * 0.45);
      const p1 = [p[0] + (a[0] - p[0]) / da * ra, p[1] + (a[1] - p[1]) / da * ra];
      const p2 = [p[0] + (b[0] - p[0]) / db * rb, p[1] + (b[1] - p[1]) / db * rb];
      if (i === 0) sh.moveTo(p1[0], p1[1]); else sh.lineTo(p1[0], p1[1]);
      sh.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
    }
    sh.closePath();
    const bv = bevel || 0;
    const g = new T.ExtrudeGeometry(sh, { depth: depth - 2 * bv, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(depth - 2 * bv) / 2);
    return g;
  };
  // A gable roof: 1 wide (x), 1 deep (z), 1 tall, ridge along x, base at y = 0.
  function gablePrism() {
    const v = [
      [-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0.5, 1, 0],
    ];
    const tris = [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [0, 3, 4], [2, 1, 5], [0, 1, 2], [0, 2, 3]];
    const pos = [];
    for (const t of tris) for (const i of t) pos.push(...v[i]);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  // A dome with a flat bottom, so you never look into its (black) inside.
  function closedHemi(seg, rings) {
    const dome = new T.SphereGeometry(1, seg || 14, rings || 7, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
    const cap = new T.CircleGeometry(1, seg || 14).rotateX(Math.PI / 2).toNonIndexed();
    const g = new T.BufferGeometry();
    for (const k of ['position', 'normal']) {
      const a = dome.attributes[k].array, b = cap.attributes[k].array;
      const out = new Float32Array(a.length + b.length);
      out.set(a); out.set(b, a.length);
      g.setAttribute(k, new T.BufferAttribute(out, 3));
    }
    return g;
  }
  // A capsule of radius r and total length len, with its base at the origin, pointing up.
  C.capsuleAt = function (shape, color, r, len, pos, rot, glow) {
    const mid = Math.max(0.001, len - 2 * r);
    const cap = shape.lo ? new T.CapsuleGeometry(r, mid, 2, 6) : shape.smooth && !shape.mid ? new T.CapsuleGeometry(r, mid, 6, 16) : new T.CapsuleGeometry(r, mid, 3, 9);
    cap.translate(0, len / 2, 0);
    shape.add(cap, color, pos, rot, null, glow);
    cap.dispose();
  };

  C.shade = function (hex, f) {
    const c = new T.Color(hex);
    if (f < 1) c.multiplyScalar(f); else c.lerp(new T.Color('#ffffff'), f - 1);
    return '#' + c.getHexString();
  };

  // Soft round dot texture for particles and blob shadows.
  C.dotTexture = (function () {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(cv);
    return t;
  })();

  const shadowMat = new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false, alphaMap: C.dotTexture });
  const shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  C.blobShadow = function (size) {
    const m = new T.Mesh(shadowGeo, shadowMat);
    m.scale.set(size, 1, size);
    m.renderOrder = -1;
    return m;
  };
})();
