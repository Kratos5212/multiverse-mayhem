// Multiverse Mayhem: the rides you can see. Tracks, supports, water channels and Ferris
// wheels, and the trains, boats, logs and gondolas going round on the shared clock
// (shared/fun.js), so a friend on the ride is sitting in the car you see.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC || (window.MMC = {});
  const P = C.prim;

  const STYLE = {
    coaster: { rail: '#c8282a', tie: '#3a3a42', post: '#e8e4dc', car: '#ffd84d' },
    flume: { rail: '#8a6a3a', tie: '#6a4a2a', post: '#8a6a3a', car: '#a8703a', water: '#5ab0f0' },
    boat: { rail: '#4a3a2a', water: '#3a8ad0', car: '#8a5a2a' },
    tram: { rail: '#d8dde2', post: '#9aa3ab', car: '#f2f5f7' },
    slide: { rail: '#ff8ac8', tie: '#ffd84d', post: '#b0d8ff', car: '#ff5a5a' },
  };
  const cars = {};
  // One car (or boat, or log, or tube) of a train: two seats side by side.
  function carModel(kind, col) {
    const key = kind + col;
    if (!cars[key]) {
      const s = new C.Shape({ smooth: false });
      if (kind === 'coaster') {
        s.add(P.box, col, [0, 0.35, 0], null, [1.5, 0.5, 2.2]);
        s.add(P.box, '#2a2a30', [0, 0.62, -0.1], null, [1.3, 0.08, 1.6]);
        s.add(P.box, col, [0, 0.75, -0.95], null, [1.5, 0.6, 0.3]);
        s.add(P.box, '#c8c8d0', [0, 0.95, 0.35], null, [1.3, 0.06, 0.06]);   // the lap bar
        for (const x of [-0.6, 0.6]) for (const z of [-0.8, 0.8]) s.add(P.cyl, '#2a2a30', [x, 0.1, z], [0, 0, Math.PI / 2], [0.14, 0.12, 0.14]);
      } else if (kind === 'flume') {
        s.add(P.capsule, col, [0, 0.35, 0], [Math.PI / 2, 0, 0], [0.7, 2.0, 0.55]);
        s.add(P.box, '#5a3a1a', [0, 0.62, 0], null, [1.1, 0.1, 1.9]);
        s.add(P.sphereLo, '#8a5a2a', [0, 0.4, 1.3], null, [0.5, 0.5, 0.2]);
      } else if (kind === 'boat') {
        s.add(P.box, col, [0, 0.35, 0], null, [1.7, 0.6, 2.4]);
        s.add(P.cone, col, [0, 0.35, 1.5], [Math.PI / 2, 0, 0], [0.85, 0.7, 0.3]);
        s.add(P.box, '#3a2a1a', [0, 0.66, 0], null, [1.4, 0.06, 2.0]);
        s.add(P.cylLo, '#5a3a1a', [0, 1.6, 0.6], null, [0.05, 2.2, 0.05]);
        s.add(P.box, '#f2f2f2', [0, 1.8, 0.6], null, [0.04, 0.9, 0.9]);
        s.add(P.box, '#1a1a1a', [0, 2.6, 0.6], null, [0.02, 0.3, 0.45]);   // a little pirate flag
      } else if (kind === 'tram') {
        s.add(P.box, col, [0, 1.3, 0], null, [1.9, 2.0, 2.5]);
        s.add(P.box, '#5ab0e8', [0, 1.6, 0], null, [1.92, 0.7, 2.2], true);
        s.add(P.box, '#3a3f45', [0, 0.25, 0], null, [0.9, 0.3, 2.3]);
      } else {
        s.add(P.torus, col, [0, 0.25, 0], [Math.PI / 2, 0, 0], [0.8, 0.8, 0.9]);   // an inner tube
      }
      cars[key] = s.build();
    }
    return C.meshOf(cars[key], 0.03);
  }
  function gondolaModel(col) {
    const key = 'gondola' + col;
    if (!cars[key]) {
      const s = new C.Shape({ smooth: false });
      s.add(P.box, col, [0, 0.1, 0], null, [2.0, 0.2, 1.6]);
      s.add(P.box, col, [0, 0.55, 0.78], null, [2.0, 0.7, 0.06]);
      s.add(P.box, col, [0, 0.55, -0.78], null, [2.0, 0.7, 0.06]);
      for (const x of [-0.95, 0.95]) s.add(P.cylLo, '#3a3a42', [x, 1.3, 0], null, [0.04, 2.4, 0.04]);
      s.add(P.box, col, [0, 2.5, 0], null, [2.1, 0.12, 1.7]);
      cars[key] = s.build();
    }
    return C.meshOf(cars[key], 0.03);
  }

  // The track, built once: rails and ties, a water trough, a slide or a monorail beam, and
  // posts down to the ground.
  function buildTrack(R, dimId) {
    const TR = MM.rideTrack(R), S = STYLE[R.kind] || STYLE.coaster, s = new C.Shape({ smooth: false });
    const pts = TR.pts;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hl = Math.hypot(dx, dz), len = Math.hypot(dx, dy, dz);
      if (len < 0.01) continue;
      const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, hl), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
      const sx = Math.cos(yaw), sz = -Math.sin(yaw), rot = [pitch, yaw, 0], L = len + 0.08;
      if (R.kind === 'coaster') {
        for (const o of [-0.55, 0.55]) s.add(P.box, S.rail, [mx + sx * o, my, mz + sz * o], rot, [0.14, 0.14, L]);
        if (i % 2 === 0) s.add(P.box, S.tie, [mx, my - 0.1, mz], rot, [1.4, 0.08, 0.2]);
      } else if (R.kind === 'flume' || R.kind === 'slide') {
        const w = R.kind === 'slide' ? 1.8 : 1.6;
        s.add(P.box, S.rail, [mx, my - 0.15, mz], rot, [w, 0.1, L]);
        for (const o of [-1, 1]) s.add(P.box, S.rail, [mx + sx * o * w / 2, my + 0.2, mz + sz * o * w / 2], rot, [0.1, 0.7, L]);
        if (S.water) s.add(P.box, S.water, [mx, my - 0.08, mz], rot, [w - 0.2, 0.04, L], true);
      } else if (R.kind === 'boat') {
        s.add(P.box, S.water, [mx, my - 0.15, mz], rot, [3.2, 0.1, L], true);
        for (const o of [-1.75, 1.75]) s.add(P.box, S.rail, [mx + sx * o, my - 0.05, mz + sz * o], rot, [0.4, 0.5, L]);
      } else if (R.kind === 'tram') {
        s.add(P.box, S.rail, [mx, my - 0.1, mz], rot, [0.8, 0.5, L]);
      }
    }
    // Posts down to the ground every few metres (not for the boats, they float).
    if (R.kind !== 'boat') for (let d = 2; d < TR.len; d += R.kind === 'tram' ? 12 : 5) {
      const q = MM.trackAt(TR, d, 0), g = MM.heightAt(dimId, q.x, q.z), h = q.y - g - 0.2;
      if (h < 0.8) continue;
      s.add(P.cylLo, S.post, [q.x, g + h / 2, q.z], null, [R.kind === 'tram' ? 0.4 : 0.16, h, R.kind === 'tram' ? 0.4 : 0.16]);
      if (h > 6 && R.kind !== 'tram') s.add(P.box, S.post, [q.x, g + h * 0.55, q.z], [0, q.yaw, 0], [1.4, 0.12, 0.12]);
    }
    return C.meshOf(s.build(), 0.02);
  }

  // A Ferris wheel: two A-frame legs, the rim and spokes that turn, and gondolas that hang.
  function buildWheel(R, dimId) {
    const W = R.wheel, g = MM.heightAt(dimId, W.x, W.z), root = new T.Group();
    root.position.set(W.x, g + W.h, W.z); root.rotation.y = W.yaw;
    const legs = new C.Shape({ smooth: false });
    for (const z of [-1.4, 1.4]) for (const sx of [-1, 1]) legs.add(P.box, '#d8dde2', [sx * W.h * 0.28, -W.h / 2, z], [0, 0, sx * 0.3], [0.4, W.h * 1.06, 0.4]);
    legs.add(P.cyl, '#8a8e94', [0, 0, 0], [Math.PI / 2, 0, 0], [0.6, 3.2, 0.6]);
    root.add(C.meshOf(legs.build(), 0.03));
    const rim = new C.Shape({ smooth: false });
    // The rim: two rings of short straight pieces.
    const rc = R.id === 'heartwheel' ? '#e8405a' : '#ffd84d', segs = 40, piece = 2 * Math.PI * W.r / segs + 0.05;
    for (let i = 0; i < segs; i++) { const a = (i + 0.5) / segs * Math.PI * 2; for (const z of [-1.1, 1.1]) rim.add(P.box, rc, [Math.sin(a) * W.r, -Math.cos(a) * W.r, z], [0, 0, a], [piece, 0.28, 0.28]); }
    for (let i = 0; i < W.n * 2; i++) { const a = i / (W.n * 2) * Math.PI * 2; for (const z of [-1.1, 1.1]) rim.add(P.box, '#f2f2f2', [Math.sin(a) * W.r / 2, -Math.cos(a) * W.r / 2, z], [0, 0, a], [0.12, W.r, 0.12]); }
    for (let i = 0; i < W.n; i++) { const a = i / W.n * Math.PI * 2; rim.add(P.sphereLo, '#fff4b0', [Math.sin(a) * W.r, -Math.cos(a) * W.r, 1.3], null, [0.25, 0.25, 0.25], true); }
    const spin = C.meshOf(rim.build(), 0.02);
    root.add(spin);
    const gondolas = [];
    for (let i = 0; i < W.n; i++) { const m = gondolaModel(['#5ab0e8', '#e8405a', '#7ad85a', '#ffd84d'][i % 4]); m.rotation.y = W.yaw; gondolas.push(m); }
    return { root, spin, gondolas, base: g + W.h };
  }

  C.makeRides = function (dimId, scene) {
    const group = new T.Group(); group.name = 'rides';
    const rides = MM.ridesIn(dimId).map(R => {
      const o = { R };
      if (R.kind === 'wheel') { o.wheel = buildWheel(R, dimId); group.add(o.wheel.root); for (const m of o.wheel.gondolas) group.add(m); }
      else {
        group.add(buildTrack(R, dimId));
        o.every = MM.rideEvery(R); o.dur = MM.rideDur(R); o.ncar = Math.ceil(R.seats / 2);
        o.trains = [];
        for (let k = 0; k < Math.ceil(o.dur / o.every) + 2; k++) {
          const cs = [];
          for (let c = 0; c < o.ncar; c++) { const m = carModel(R.kind, (STYLE[R.kind] || STYLE.coaster).car); m.rotation.order = 'YXZ'; group.add(m); cs.push(m); }
          o.trains.push(cs);
        }
      }
      return o;
    });
    scene.add(group);
    return {
      // Ts: the server's clock.
      update(Ts) {
        for (const o of rides) {
          const R = o.R;
          if (o.wheel) {
            const W = R.wheel, a = Math.PI * 2 * Ts / W.rev;
            o.wheel.spin.rotation.z = a;
            o.wheel.gondolas.forEach((m, i) => {
              const b = a + i / W.n * Math.PI * 2;
              m.position.set(W.x + Math.cos(W.yaw) * Math.sin(b) * W.r, o.wheel.base - Math.cos(b) * W.r - 1.85, W.z - Math.sin(W.yaw) * Math.sin(b) * W.r);
            });
            continue;
          }
          // Trains on the track: the ones that have left, and the next one waiting.
          const TR = MM.rideTrack(R), k1 = Math.floor(Ts / o.every) + 1;
          o.trains.forEach((cs, j) => {
            const k = k1 - j, t = Ts - k * o.every, on = t >= -o.every && t <= o.dur;
            for (let c = 0; c < cs.length; c++) {
              cs[c].visible = on;
              if (!on) continue;
              let s = MM.rideS(R, t) - c * MM.CAR_GAP;
              if (s < 0) s = TR.closed ? s + TR.len : 0;
              const q = MM.trackAt(TR, s, 0);
              cs[c].position.set(q.x, q.y - (R.kind === 'tram' ? 0.4 : 0.05), q.z);
              cs[c].rotation.set(q.pitch, q.yaw, 0);
            }
          });
        }
      },
      dispose() { scene.remove(group); },
    };
  };
})();
