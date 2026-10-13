// Multiverse Mayhem: the portal gun's short-range mode, played like Valve's Portal.
// Shoot a blue portal and an orange one onto any floor, wall, roof or cliff in the same
// world; step into one and you come out of the other, keeping your speed ("speedy thing
// goes in, speedy thing comes out"). Anyone can use anyone's pair. Shared by the client
// (aiming, prediction) and the server (checks).
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.PAIR_RANGE = 260;        // how far the gun reaches in this mode
  MM.PAIR_COLORS = ['#3a9aff', '#ff8a2a'];
  MM.PAIR_NAMES = ['Blue', 'Orange'];
  MM.PAIR_MAX_SPEED = 32;     // fling speed cap

  // Who can shoot them: anyone carrying a real portal gun.
  MM.canPair = (arch, up) => MM.hasGun(arch, up) && !MM.helpless(arch, up);

  // First thing a ray hits: terrain, a solid prop (its box or circle, sides and top), the
  // inside walls of a building, or a room's outer walls. o, d: {x, y, z}, d unit length.
  // Returns { t, x, y, z, nx, ny, nz } or null.
  MM.raycastWorld = function (dimId, o, d, maxT, alive) {
    const D = MM.DIM_BY_ID[dimId];
    let bt = maxT, bn = null;
    const take = (t, nx, ny, nz) => { if (t > 0.05 && t < bt) { bt = t; bn = [nx, ny, nz]; } };
    // Props.
    for (const p of MM.genProps(dimId)) {
      if (alive && !alive[p.id]) continue;
      const T = MM.PROPS[p.type];
      if (T.arch || p.h < 0.6) continue;
      const fx = o.x - p.x, fz = o.z - p.z, reach = MM.propReach(p) + 0.5;
      // Quick reject: the ray's closest approach (on the ground plane) misses the prop.
      const dd = d.x * d.x + d.z * d.z;
      if (dd > 1e-9) {
        const tc = Math.max(0, -(fx * d.x + fz * d.z) / dd);
        if (tc > bt + reach) continue;
        const cx = fx + d.x * tc, cz = fz + d.z * tc;
        if (cx * cx + cz * cz > reach * reach) continue;
      } else if (fx * fx + fz * fz > reach * reach) continue;
      const bot = p.y - 0.5, top = p.y + p.h * 0.92;
      if (T.box) {
        const c = Math.cos(p.rot), s = Math.sin(p.rot), k = p.s || 1;
        const lox = (fx * c - fz * s) / k, loz = (fx * s + fz * c) / k, ldx = (d.x * c - d.z * s) / k, ldz = (d.x * s + d.z * c) / k;
        const [x0, x1, z0, z1] = T.box;
        let tmin = -Infinity, tmax = Infinity, axis = -1, sgn = 0;
        const slab = (oo, dd2, lo, hi, ax) => {
          if (Math.abs(dd2) < 1e-9) return oo >= lo && oo <= hi;
          let t1 = (lo - oo) / dd2, t2 = (hi - oo) / dd2, sg = -1;
          if (t1 > t2) { const q = t1; t1 = t2; t2 = q; sg = 1; }
          if (t1 > tmin) { tmin = t1; axis = ax; sgn = sg; }
          tmax = Math.min(tmax, t2);
          return true;
        };
        if (!slab(lox, ldx, x0, x1, 0) || !slab(loz, ldz, z0, z1, 2) || !slab(o.y, d.y, bot, top, 1)) continue;
        if (tmin > tmax || tmin <= 0.05) continue;
        if (axis === 1) take(tmin, 0, sgn, 0);
        else {
          const lx = axis === 0 ? sgn : 0, lz = axis === 2 ? sgn : 0;
          take(tmin, lx * c + lz * s, 0, -lx * s + lz * c);
        }
      } else {
        const r = p.r;
        if (dd > 1e-9) {
          const b = 2 * (fx * d.x + fz * d.z), cc = fx * fx + fz * fz - r * r, disc = b * b - 4 * dd * cc;
          if (disc >= 0) {
            const t = (-b - Math.sqrt(disc)) / (2 * dd), y = o.y + d.y * t;
            if (y >= bot && y <= top) { const hx = fx + d.x * t, hz = fz + d.z * t, l = Math.hypot(hx, hz) || 1; take(t, hx / l, 0, hz / l); }
          }
        }
        if (d.y < -1e-6) {
          const t = (top - o.y) / d.y, hx = fx + d.x * t, hz = fz + d.z * t;
          if (hx * hx + hz * hz < r * r) take(t, 0, 1, 0);
        }
      }
    }
    // Inside walls (floor to ceiling).
    if (D.walls) for (const [x1, z1, x2, z2] of D.walls) {
      const ex = x2 - x1, ez = z2 - z1, den = d.x * ez - d.z * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - o.x) * ez - (z1 - o.z) * ex) / den, u = ((x1 - o.x) * d.z - (z1 - o.z) * d.x) / den;
      if (u < 0 || u > 1) continue;
      const l = Math.hypot(ex, ez), nx = -ez / l, nz = ex / l, sg = nx * d.x + nz * d.z > 0 ? -1 : 1;
      take(t, nx * sg, 0, nz * sg);
    }
    // A room's outer walls and ceiling.
    if (D.room) {
      const hx = D.room.w / 2, hz = D.room.d / 2;
      if (d.x > 1e-9) take((hx - o.x) / d.x, -1, 0, 0); else if (d.x < -1e-9) take((-hx - o.x) / d.x, 1, 0, 0);
      if (d.z > 1e-9) take((hz - o.z) / d.z, 0, 0, -1); else if (d.z < -1e-9) take((-hz - o.z) / d.z, 0, 0, 1);
      if (d.y > 1e-9) take((D.room.h - o.y) / d.y, 0, -1, 0);
    }
    // Terrain: march, then narrow it down.
    for (let t = 0.5, prev = 0; t < bt; prev = t, t += t < 30 ? 0.6 : 1.4) {
      const x = o.x + d.x * t, z = o.z + d.z * t;
      if (o.y + d.y * t < MM.heightAt(dimId, x, z)) {
        let a = prev, b = t;
        for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (o.y + d.y * m < MM.heightAt(dimId, o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
        const n = MM.normalAt(dimId, o.x + d.x * b, o.z + d.z * b);
        take(b, n[0], n[1], n[2]);
        break;
      }
    }
    if (!bn) return null;
    return { t: bt, x: o.x + d.x * bt, y: o.y + d.y * bt, z: o.z + d.z * bt, nx: bn[0], ny: bn[1], nz: bn[2] };
  };

  // Where a portal sits for a hit: on the floor where you hit it, or on a wall high enough to
  // walk through.
  MM.pairSpot = function (dimId, hit) {
    const n = [hit.nx, hit.ny, hit.nz];
    // Lifted a little off the surface, so roads and paint never cover it.
    let x = hit.x + n[0] * 0.08, y = hit.y + n[1] * 0.14, z = hit.z + n[2] * 0.08;
    if (n[1] < 0.7 && n[1] > -0.5) {
      const g = MM.heightAt(dimId, x + n[0] * 0.6, z + n[2] * 0.6);
      y = Math.max(y, g + 1.25);
    }
    return { x, y, z, nx: n[0], ny: n[1], nz: n[2] };
  };
  MM.pairKind = P => P.ny > 0.7 ? 'floor' : P.ny < -0.5 ? 'ceiling' : 'wall';

  // Are you stepping into portal P? (x, y, z: your feet.)
  MM.inPair = function (P, x, y, z) {
    const kind = MM.pairKind(P);
    if (kind === 'floor') return (x - P.x) ** 2 + (z - P.z) ** 2 < 0.95 * 0.95 && y - P.y > -0.4 && y - P.y < 0.5;
    if (kind === 'ceiling') return (x - P.x) ** 2 + (z - P.z) ** 2 < 0.95 * 0.95 && P.y - (y + 1.9) < 0.5 && P.y - (y + 1.9) > -0.6;
    const bx = x - P.x, by = y + 1 - P.y, bz = z - P.z;
    const front = bx * P.nx + by * P.ny + bz * P.nz;
    return front < 0.8 && front > -0.4 && bx * bx + by * by + bz * bz < 1.15 * 1.15;
  };

  // Where you come out of portal P, and how fast, given the speed you went in with.
  MM.pairExit = function (P, speed) {
    const v = Math.min(MM.PAIR_MAX_SPEED, speed);
    const kind = MM.pairKind(P);
    if (kind === 'floor') { const s = Math.max(v, 9); return { x: P.x, y: P.y + 0.15, z: P.z, vx: P.nx * s, vy: P.ny * s, vz: P.nz * s }; }
    if (kind === 'ceiling') return { x: P.x, y: P.y - 2.3, z: P.z, vx: 0, vy: -Math.max(v, 2), vz: 0 };
    const l = Math.hypot(P.nx, P.nz) || 1, hx = P.nx / l, hz = P.nz / l, s = Math.max(v, 4);
    return { x: P.x + hx * 0.95, y: P.y - 1.15, z: P.z + hz * 0.95, vx: hx * s, vy: 2 + Math.max(0, P.ny) * s, vz: hz * s };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
