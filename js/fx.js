// Effects: a pooled particle system, projectiles and cartoon explosions.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;

  // ---------- Particles ----------
  class Particles {
    constructor(max, additive) {
      this.max = max;
      this.n = 0;
      this.pos = new Float32Array(max * 3);
      this.col = new Float32Array(max * 3);
      this.size = new Float32Array(max);
      this.alpha = new Float32Array(max);
      this.vel = new Float32Array(max * 3);
      this.life = new Float32Array(max);
      this.age = new Float32Array(max);
      this.grav = new Float32Array(max);
      this.grow = new Float32Array(max);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('color', new T.BufferAttribute(this.col, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('size', new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage));
      g.setAttribute('alpha', new T.BufferAttribute(this.alpha, 1).setUsage(T.DynamicDrawUsage));
      this.geo = g;
      const m = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
        uniforms: { map: { value: C.dotTexture }, scale: { value: 400 }, opacity: { value: additive ? 0.9 : 0.75 } },
        vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
          void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * scale / max(-mv.z, 0.5), 220.0); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec3 vC; varying float vA;
          void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a * vA < 0.02) discard; gl_FragColor = vec4(vC, t.a * vA * opacity); }`,
      });
      this.mat = m;
      this.points = new T.Points(g, m);
      this.points.frustumCulled = false;
    }
    emit(x, y, z, vx, vy, vz, color, size, life, grav, grow) {
      if (this.n >= this.max) return;
      const i = this.n++;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      const c = typeof color === 'string' ? new T.Color(color) : color;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.size[i] = size; this.alpha[i] = 1; this.life[i] = life; this.age[i] = 0; this.grav[i] = grav || 0; this.grow[i] = grow || 0;
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        this.age[i] += dt;
        if (this.age[i] >= this.life[i]) {
          // Swap the last particle into this slot.
          const j = --this.n;
          if (i !== j) {
            for (const a of [this.pos, this.vel, this.col]) { a[i * 3] = a[j * 3]; a[i * 3 + 1] = a[j * 3 + 1]; a[i * 3 + 2] = a[j * 3 + 2]; }
            for (const a of [this.size, this.alpha, this.life, this.age, this.grav, this.grow]) a[i] = a[j];
          }
          i--;
          continue;
        }
        this.vel[i * 3 + 1] -= this.grav[i] * dt;
        const drag = Math.max(0, 1 - dt * 1.5);
        this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        this.size[i] += this.grow[i] * dt;
        this.alpha[i] = 1 - this.age[i] / this.life[i];
      }
      this.geo.setDrawRange(0, this.n);
      for (const k of ['position', 'color', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
    }
    clear() { this.n = 0; }
  }

  C.FX = class {
    constructor(scene) {
      this.scene = scene;
      this.glow = new Particles(2500, true);
      this.smoke = new Particles(1500, false);
      scene.add(this.glow.points, this.smoke.points);
      this.shots = new Map();
      this.rings = [];
      this.shotGeo = new T.SphereGeometry(1, 8, 6);
      this.mats = {};
    }
    setScale(h) { this.glow.mat.uniforms.scale.value = h / 2; this.smoke.mat.uniforms.scale.value = h / 2; }
    mat(color) { return this.mats[color] || (this.mats[color] = new T.MeshBasicMaterial({ color })); }

    burst(x, y, z, color, n, speed, size, life, grav) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u) * speed * (0.4 + Math.random() * 0.6);
        this.glow.emit(x, y, z, Math.cos(a) * s, u * speed * 0.8 + speed * 0.3, Math.sin(a) * s, color, size * (0.6 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), grav === undefined ? 12 : grav);
      }
    }
    puff(x, y, z, color, n, spread, size, life) {
      for (let i = 0; i < n; i++) {
        this.smoke.emit(x + (Math.random() - 0.5) * spread, y + Math.random() * spread * 0.5, z + (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, color, size * (0.7 + Math.random() * 0.6), life * (0.7 + Math.random() * 0.6), -1, size * 0.8);
      }
    }

    // Big cartoon kaboom: flash, fire, smoke and a shock ring.
    explosion(x, y, z, r) {
      this.burst(x, y + 0.5, z, '#fff3a0', 14 + r * 4, 6 + r * 2, 1.6, 0.35, 0);
      this.burst(x, y + 0.5, z, '#ff8a2a', 20 + r * 5, 5 + r * 2, 1.3, 0.6, 6);
      this.puff(x, y + 0.6, z, '#8a8484', 10 + r * 2, r * 0.8, 2.0, 1.3);
      this.burst(x, y + 0.3, z, '#5a4a3a', 8 + r * 2, 9, 0.45, 1.0, 20);
      const ring = new T.Mesh(new T.RingGeometry(0.8, 1, 32), new T.MeshBasicMaterial({ color: '#fff6c0', transparent: true, side: T.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.2, z);
      this.scene.add(ring);
      this.rings.push({ m: ring, t: 0, life: 0.45, r });
    }

    shot(e, colors) {
      const color = colors[e.w] || '#ffffff';
      const g = new T.Group();
      const big = e.w === 'gren' ? 0.3 : e.w === 'shrink' ? 0.28 : 0.16;
      const core = new T.Mesh(this.shotGeo, this.mat(e.w === 'gren' ? '#333a44' : '#ffffff'));
      core.scale.setScalar(big * (e.w === 'gren' ? 1 : 0.6));
      const halo = new T.Mesh(this.shotGeo, this.mat(color));
      halo.scale.set(big, big, e.w === 'gren' ? big : big * 3.5);
      g.add(halo, core);
      g.position.set(e.x, e.y, e.z);
      this.scene.add(g);
      this.shots.set(e.id, { g, halo, vx: e.vx, vy: e.vy, vz: e.vz, grav: e.g || 0, life: e.l || 2, color, gren: e.w === 'gren' });
    }
    hit(id, x, y, z) {
      const s = this.shots.get(id);
      const color = s ? s.color : '#ffffff';
      if (s) { this.scene.remove(s.g); this.shots.delete(id); }
      if (!s || !s.gren) this.burst(x, y, z, color, 8, 5, 0.6, 0.3);
    }

    update(dt) {
      this.glow.update(dt); this.smoke.update(dt);
      for (const [id, s] of this.shots) {
        s.vy -= s.grav * dt;
        s.g.position.x += s.vx * dt; s.g.position.y += s.vy * dt; s.g.position.z += s.vz * dt;
        s.halo.lookAt(s.g.position.x + s.vx, s.g.position.y + s.vy, s.g.position.z + s.vz);
        s.halo.position.set(0, 0, 0);
        s.life -= dt;
        if (Math.random() < 0.6) this.glow.emit(s.g.position.x, s.g.position.y, s.g.position.z, 0, 0, 0, s.color, s.gren ? 0.5 : 0.35, 0.25, 0);
        if (s.life < -0.2) { this.scene.remove(s.g); this.shots.delete(id); }
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.t += dt;
        const k = r.t / r.life;
        r.m.scale.setScalar(0.5 + k * r.r * 1.3);
        r.m.material.opacity = 1 - k;
        if (k >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.rings.splice(i, 1); }
      }
    }

    clear() {
      for (const s of this.shots.values()) this.scene.remove(s.g);
      this.shots.clear();
      for (const r of this.rings) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }
      this.rings = [];
      this.glow.clear(); this.smoke.clear();
    }
  };
})();
