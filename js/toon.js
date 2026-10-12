// Cartoon rendering: flat cel shading, thick black outlines, and a small builder
// that merges coloured primitives into one geometry so a whole character or prop
// draws in a couple of calls.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC || (window.MMC = {});

  // Three hard tones, like a hand-painted cartoon.
  const grad = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  const gradientMap = new T.DataTexture(grad, 3, 1, T.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = T.NearestFilter;
  gradientMap.needsUpdate = true;
  C.gradientMap = gradientMap;

  C.toonMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap });
  C.glowMat = new T.MeshBasicMaterial({ vertexColors: true, fog: true });

  // Outline: the back faces of the mesh, pushed out along smoothed normals and drawn black.
  const outlineCache = {};
  C.outlineMat = function (thick, color) {
    const key = thick + ':' + (color || '#111');
    if (outlineCache[key]) return outlineCache[key];
    const m = new T.MeshBasicMaterial({ color: color || '#111111', side: T.BackSide, fog: true });
    m.onBeforeCompile = sh => {
      sh.uniforms.uThick = { value: thick };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 onrm;\nuniform float uThick;')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + onrm * uThick;');
    };
    m.customProgramCacheKey = () => 'outline' + thick;
    outlineCache[key] = m;
    return m;
  };

  // ---------- Shape builder ----------
  const tmpM = new T.Matrix4(), tmpN = new T.Matrix3(), tmpV = new T.Vector3(), tmpC = new T.Color();
  class Shape {
    constructor() { this.lit = { p: [], n: [], c: [] }; this.glow = { p: [], n: [], c: [] }; }
    // Add a geometry with a transform and a colour. opts: glow (unlit), pos, rot, scl.
    add(geo, color, pos, rot, scl, glow) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      tmpM.compose(
        tmpV.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0),
        new T.Quaternion().setFromEuler(new T.Euler(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ')),
        new T.Vector3(scl ? scl[0] : 1, scl ? scl[1] : 1, scl ? scl[2] : 1));
      tmpN.getNormalMatrix(tmpM);
      const P = g.attributes.position, N = g.attributes.normal;
      const out = glow ? this.glow : this.lit;
      tmpC.set(color);
      const v = new T.Vector3();
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(tmpM);
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
  const P = C.prim = {
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
  };
  // A dome with a flat bottom, so you never look into its (black) inside.
  function closedHemi() {
    const dome = new T.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
    const cap = new T.CircleGeometry(1, 14).rotateX(Math.PI / 2).toNonIndexed();
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
    const cap = new T.CapsuleGeometry(r, mid, 4, 10);
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
