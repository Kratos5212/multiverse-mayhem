// Multiverse Mayhem: town plans. Each world is laid out like a real place: roads and
// plazas first, buildings lining the streets with their fronts to the road, decor along
// the sidewalks, and wild things only out in the countryside. Everything comes from the
// world's seed, so the server, every client and the bots get the same towns.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});
  const TAU = Math.PI * 2;

  function segDist(x, z, s) {
    const dx = s.x2 - s.x1, dz = s.z2 - s.z1, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / l2));
    return Math.hypot(x - (s.x1 + dx * t), z - (s.z1 + dz * t));
  }
  // The rotation that makes a model (front = +z) face the direction (fx, fz).
  const facing = (fx, fz) => Math.atan2(fx, fz);

  // The toolkit a layout gets. add/free come from MM.genProps.
  MM.makeLayoutKit = function (dimId, r, add, free) {
    const roads = [], plazas = [];
    const pickW = list => {   // [[type, weight], ...] or 'type'
      if (typeof list === 'string') return list;
      let t = 0; for (const [, w] of list) t += w;
      let x = r() * t;
      for (const [type, w] of list) { if ((x -= w) <= 0) return type; }
      return list[0][0];
    };
    const L = {
      r, roads, plazas, pickW,
      onRoad(x, z, pad) {
        pad = pad || 0;
        for (const s of roads) if (segDist(x, z, s) < s.w / 2 + pad) return true;
        for (const p of plazas) if (Math.hypot(x - p.x, z - p.z) < p.r + pad) return true;
        return false;
      },
      // Place a prop unless it would overlap another prop, a landmark, a road or a plaza.
      // roadside: allowed right next to (but not on) the road, for lamps, benches and signs.
      place(type, x, z, rot, s, o) {
        o = o || {};
        s = s || 1;
        const t = MM.PROPS[type];
        const rad = t.r * s;
        if (Math.max(Math.abs(x), Math.abs(z)) > MM.boundOf(dimId) - 4 - rad) return false;
        if (!o.onRoad && L.onRoad(x, z, o.roadside ? Math.min(rad, 0.4) : rad * 0.9)) return false;
        if (!free(x, z, rad, o.tight)) return false;
        add(type, x, z, rot === undefined ? r() * TAU : rot, s);
        return true;
      },
      road(x1, z1, x2, z2, w, style) { roads.push({ x1, z1, x2, z2, w: w || 7, style: style || 'asphalt' }); },
      // A road through a list of points.
      path(points, w, style) { for (let i = 1; i < points.length; i++) L.road(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], w, style); },
      plaza(x, z, rad, style) { plazas.push({ x, z, r: rad, style: style || 'stone' }); },
      ringRoad(cx, cz, rad, w, style, n) {
        n = n || 24;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU, b = (i + 1) / n * TAU;
          L.road(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, cx + Math.cos(b) * rad, cz + Math.sin(b) * rad, w, style);
        }
      },
      // Buildings along a road, fronts facing it. o: { setback, spacing, types, sides,
      // gap (chance of an empty lot), scale [min, max], lamps: { type, every, offset },
      // extra(x, z, front angle, side) for driveways, mailboxes and the like }
      street(x1, z1, x2, z2, o) {
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 1) return;
        const ux = (x2 - x1) / len, uz = (z2 - z1) / len, nx = -uz, nz = ux;
        const sp = o.spacing || 14, sides = o.sides || [1, -1];
        for (let t = (o.start || sp / 2); t < len - (o.end || sp / 3); t += sp) {
          for (const side of sides) {
            if (r() < (o.gap || 0)) continue;
            const j = (r() - 0.5) * (o.jitter || 0);
            const x = x1 + ux * (t + j) + nx * side * o.setback, z = z1 + uz * (t + j) + nz * side * o.setback;
            const type = pickW(o.types);
            const s = o.scale ? o.scale[0] + r() * (o.scale[1] - o.scale[0]) : 1;
            const rot = facing(-nx * side, -nz * side) + (o.turn || 0);
            if (L.place(type, x, z, rot, s) && o.extra) o.extra(x, z, rot, side, ux, uz, nx * side, nz * side);
          }
        }
        if (o.lamps) {
          const lp = o.lamps;
          for (let t = lp.every / 2; t < len; t += lp.every) for (const side of lp.sides || [1, -1]) {
            const x = x1 + ux * t + nx * side * lp.offset, z = z1 + uz * t + nz * side * lp.offset;
            L.place(lp.type, x, z, facing(-nx * side, -nz * side), 1, { roadside: true });
          }
        }
      },
      // Things around a circle, facing in (or out, or along).
      ring(cx, cz, rad, n, types, o) {
        o = o || {};
        const a0 = o.a0 || 0;
        for (let i = 0; i < n; i++) {
          const a = a0 + i / n * TAU;
          const x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad;
          const rot = o.face === 'out' ? facing(Math.cos(a), Math.sin(a)) : o.face === 'along' ? facing(-Math.sin(a), Math.cos(a)) : facing(-Math.cos(a), -Math.sin(a));
          L.place(pickW(types), x, z, rot, o.scale || 1, o);
        }
      },
      // A neat rectangle of rows (crops, parked ships, arcade aisles).
      rows(cx, cz, w, d, dx, dz, types, rot, o) {
        for (let x = -w / 2; x <= w / 2 + 1e-6; x += dx) for (let z = -d / 2; z <= d / 2 + 1e-6; z += dz) L.place(pickW(types), cx + x, cz + z, rot, 1, o);
      },
      // A loose group around a point.
      cluster(cx, cz, rad, types, n, o) {
        o = o || {};
        for (let i = 0, k = 0; i < n && k < n * 20; k++) {
          const a = r() * TAU, d = Math.sqrt(r()) * rad;
          const s = o.scale ? o.scale[0] + r() * (o.scale[1] - o.scale[0]) : 0.85 + r() * 0.35;
          if (L.place(pickW(types), cx + Math.cos(a) * d, cz + Math.sin(a) * d, undefined, s, o)) i++;
        }
      },
      // Wild things in the countryside, between minR and maxR from the middle.
      scatter(types, n, o) {
        o = o || {};
        const minR = o.minR || 0, maxR = Math.min(o.maxR || 150, MM.boundOf(dimId) - 4);
        for (let i = 0, k = 0; i < n && k < n * 30; k++) {
          const x = (r() * 2 - 1) * maxR, z = (r() * 2 - 1) * maxR, d = Math.max(Math.abs(x), Math.abs(z));
          if (d < minR) continue;
          const s = o.scale ? o.scale[0] + r() * (o.scale[1] - o.scale[0]) : 0.8 + r() * 0.5;
          if (L.place(pickW(types), x, z, undefined, s, o)) i++;
        }
      },
      // A square grid of streets: roads every `spacing` metres across [-extent, extent],
      // buildings along the north-south roads, decor along the east-west ones.
      grid(o) {
        const S = o.spacing, E = o.extent;
        for (let k = -Math.floor(E / S); k <= Math.floor(E / S); k++) {
          L.road(k * S, -E, k * S, E, o.w, o.style);
          L.road(-E, k * S, E, k * S, o.w, o.style);
        }
        for (let k = -Math.floor(E / S); k <= Math.floor(E / S); k++) for (let m = -Math.floor(E / S); m < Math.floor(E / S); m++) {
          const a = m * S + o.w / 2 + 2, b = (m + 1) * S - o.w / 2 - 2;
          L.street(k * S, a, k * S, b, Object.assign({}, o.lots, { lamps: o.lamps }));
          if (o.crossLots) L.street(a, k * S, b, k * S, Object.assign({}, o.crossLots, { lamps: o.lamps }));
          else if (o.lamps) L.street(a, k * S, b, k * S, { setback: 1e3, spacing: 1e3, types: 'tree', lamps: o.lamps });
        }
      },
      // A town square with spokes out to a ring road: the shape of the Citadel, a market
      // or a theme park. o: { plaza, plazaStyle, spokes: [angles], spokeTo, ring, w, style }
      radial(o) {
        L.plaza(0, 0, o.plaza, o.plazaStyle || o.style);
        for (const a of o.spokes) L.road(Math.cos(a) * (o.plaza - 1), Math.sin(a) * (o.plaza - 1), Math.cos(a) * o.spokeTo, Math.sin(a) * o.spokeTo, o.w, o.style);
        if (o.ring) L.ringRoad(0, 0, o.ring, o.w, o.style, o.ringSegs || 28);
      },
      // Line both sides of every spoke between `from` and `to` metres out.
      spokeStreets(spokes, from, to, lots) { for (const a of spokes) L.street(Math.cos(a) * from, Math.sin(a) * from, Math.cos(a) * to, Math.sin(a) * to, lots); },
      ringStreet(rad, lots, n) {
        n = n || 28;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU, b = (i + 1) / n * TAU;
          L.street(Math.cos(a) * rad, Math.sin(a) * rad, Math.cos(b) * rad, Math.sin(b) * rad, Object.assign({ start: 1, end: 1 }, lots));
        }
      },
    };
    return L;
  };

  const DEG = Math.PI / 180;
  const X = [0, 90 * DEG, 180 * DEG, 270 * DEG];             // + shaped spokes
  const DIAG = [45 * DEG, 135 * DEG, 225 * DEG, 315 * DEG];  // x shaped spokes

  MM.LAYOUTS = {
    // Downtown: a proper city grid. Towers in the middle blocks, shops and apartments
    // further out, street lamps everywhere, and the landmarks in the blocks around the square.
    downtown(L) {
      const r = L.r;
      L.plaza(0, 0, 14, 'stone');
      L.grid({
        spacing: 44, extent: 154, w: 8, style: 'asphalt',
        lots: { setback: 11, spacing: 15, gap: 0.08, types: [['skyscraper', 3], ['apartment', 3], ['storefront', 3], ['officeblock', 1]] },
        crossLots: { setback: 11, spacing: 16, gap: 0.2, types: [['storefront', 3], ['apartment', 2], ['car', 1]] },
        lamps: { type: 'streetlamp', every: 22, offset: 5.2 },
      });
      for (const [x, z] of [[66, 66], [-110, 110]]) L.cluster(x, z, 14, [['tree', 3], ['citbench', 1]], 8);
      L.scatter([['car', 2], ['hydrant', 1]], 30, { minR: 30, roadside: true });
    },

    // Washington, D.C.: the National Mall runs north-south from the White House past the
    // Monument to the Capitol, lined with cherry trees and federal buildings; avenues out
    // to the Pentagon and the rest of the city.
    dc(L) {
      L.plaza(0, 0, 13, 'stone');
      L.road(0, -36, 0, 92, 10, 'gravel');
      L.road(-150, 30, 150, 30, 9, 'asphalt');
      L.road(-150, -80, 150, -80, 9, 'asphalt');
      L.path([[14, -10], [70, -40], [78, -40]], 8, 'asphalt');
      L.road(-60, -150, -60, 150, 9, 'asphalt');
      L.road(60, 30, 60, 150, 9, 'asphalt');
      L.street(0, 16, 0, 90, { setback: 9, spacing: 9, types: 'cherrytree', jitter: 1 });
      L.street(0, 16, 0, 90, { setback: 26, spacing: 24, gap: 0.1, types: [['officeblock', 3], ['flagpole', 1]] });
      L.street(-150, 30, 150, 30, { setback: 12, spacing: 20, gap: 0.3, start: 40, types: [['officeblock', 2], ['apartment', 1]], lamps: { type: 'streetlamp', every: 22, offset: 6 } });
      L.street(-60, -150, -60, 150, { setback: 12, spacing: 18, gap: 0.25, types: [['apartment', 2], ['storefront', 2], ['officeblock', 1]], lamps: { type: 'streetlamp', every: 22, offset: 6 } });
      L.ring(0, 0, 16, 12, 'flagpole', { roadside: true });
      L.ring(0, -52, 22, 10, 'cherrytree', { a0: 0.2 });
      L.scatter([['cherrytree', 3], ['tree', 3], ['citbench', 1]], 50, { minR: 40 });
    },

    // Area 51: a runway, hangars in a row, radar dishes, watchtowers on the fence line,
    // and empty desert all the way to the mountains.
    area51(L) {
      L.plaza(0, 0, 14, 'metal');
      L.road(-140, 60, 140, 60, 14, 'asphalt');
      L.road(0, 14, 0, 60, 8, 'asphalt');
      L.road(0, -14, 0, -26, 8, 'asphalt');
      L.road(0, 60, 0, 142, 8, 'asphalt');   // the main gate, out to the road from the suburb
      L.street(-130, 60, -10, 60, { setback: 20, spacing: 24, sides: [1], types: 'hangar' });
      L.street(-130, 60, 130, 60, { setback: 11, spacing: 30, sides: [-1], gap: 0.3, types: [['jeep', 2], ['crate', 1]] });
      L.rows(60, -50, 40, 0, 20, 1, 'radar', 0);
      L.ring(0, 0, 120, 14, 'watchtower', { face: 'out' });
      L.cluster(-60, -40, 16, [['crate', 3], ['jeep', 1]], 10);
      L.scatter([['cactus', 3], ['rock', 2]], 60, { minR: 90 });
    },
    // Cronenberg World: the Smith neighbourhood after the love potion. Same streets,
    // same houses, all of it overgrown with flesh.
    meatlands(L) {
      const r = L.r;
      L.plaza(0, 0, 18, 'flesh');
      L.grid({
        spacing: 44, extent: 132, w: 7, style: 'flesh',
        lots: { setback: 14, spacing: 20, gap: 0.15, types: [['house', 6], ['house2', 4]],
          extra: (x, z, rot, side, ux, uz, nx, nz) => {
            if (r() < 0.6) L.place('fleshpillar', x - nx * 6 + ux * (r() * 6 - 3), z - nz * 6 + uz * (r() * 6 - 3), undefined, 0.6 + r() * 0.3);
            if (r() < 0.7) L.place('pustule', x - nx * 3 + ux * 6.5, z - nz * 3 + uz * 6.5, undefined, 0.7 + r() * 0.3);
            if (r() < 0.35) L.place('eyestalk', x + nx * 8 - ux * 5, z + nz * 8 - uz * 5);
          } },
      });
      L.scatter([['fleshpillar', 3], ['eyestalk', 2], ['pustule', 2], ['bonearch', 1]], 50, { minR: 120 });
    },

    // The Alien Bazaar: a night market. Four market streets out of the square to a ring
    // street, all lined with stalls and lanterns; a glowing mushroom forest beyond.
    bazaar(L) {
      L.radial({ plaza: 18, plazaStyle: 'neon', spokes: DIAG, spokeTo: 120, ring: 62, w: 8, style: 'neon' });
      const stalls = { setback: 6.5, spacing: 7, gap: 0.12, types: [['stall', 6], ['crate', 1]], lamps: { type: 'lamp', every: 14, offset: 4.6 } };
      L.spokeStreets(DIAG, 22, 118, stalls);
      L.ringStreet(62, stalls, 30);
      L.ring(0, 0, 21, 10, 'crate', { roadside: true });
      L.scatter([['mushroom', 5], ['crystal', 1], ['lamp', 1]], 90, { minR: 80 });
    },

    // The Lowgrav Moon: a mining base. A landing pad, a road out to the refinery, a rover
    // park, a line of antennas, and wild craters full of crystals.
    moon(L) {
      L.plaza(0, 0, 17, 'metal');
      L.path([[-14, 8], [-30, 18]], 7, 'regolith');
      L.path([[12, -6], [40, -24], [90, -40]], 7, 'regolith');
      L.path([[0, 17], [0, 70], [-60, 110]], 7, 'regolith');
      L.rows(52, -10, 24, 10, 8, 10, 'rover', Math.PI / 2, { tight: true });
      L.street(0, 22, 0, 68, { setback: 7, spacing: 11, types: 'antenna', sides: [1] });
      L.street(12, -6, 90, -40, { setback: 7, spacing: 16, types: [['rover', 1], ['crate', 2]], sides: [-1] });
      L.cluster(-70, -60, 22, [['crystal', 3], ['rock', 1]], 12);
      L.cluster(80, 70, 22, [['crystal', 3], ['rock', 1]], 12);
      L.cluster(-90, 60, 18, [['crystal', 2], ['rock', 2]], 9);
      L.scatter([['rock', 3], ['crystal', 2]], 45, { minR: 40 });
    },

    // Bird World: a tree city. Nests sit in groves on wooden walkways around the Aerie
    // Temple, totems mark the paths, and the wild cliffs are full of feather plants.
    featherhold(L) {
      L.radial({ plaza: 17, plazaStyle: 'planks', spokes: [90 * DEG, 210 * DEG, 330 * DEG], spokeTo: 95, ring: 55, w: 5, style: 'planks' });
      L.ringStreet(55, { setback: 9, spacing: 13, gap: 0.15, types: [['nest', 4], ['tree', 2]], lamps: { type: 'totem', every: 26, offset: 4 } }, 24);
      L.spokeStreets([210 * DEG, 330 * DEG], 20, 92, { setback: 8, spacing: 12, gap: 0.2, types: [['nest', 3], ['tree', 2], ['featherplant', 1]] });
      for (const [x, z] of [[-80, -70], [85, -60], [-90, 80], [95, 85]]) L.cluster(x, z, 18, [['nest', 2], ['tree', 3], ['featherplant', 2]], 8);
      L.scatter([['rockspire', 2], ['featherplant', 3], ['tree', 2]], 45, { minR: 100 });
    },

    // The Citadel of Ricks: a clean, white space city. A central square, six avenues of
    // towers out to a ring boulevard of shops, benches and parked hover cars.
    citadel(L) {
      const sp = [30, 90, 150, 210, 270, 330].map(d => d * DEG);
      L.radial({ plaza: 20, plazaStyle: 'white', spokes: sp, spokeTo: 130, ring: 72, w: 8, style: 'white' });
      L.spokeStreets(sp, 26, 128, { setback: 11, spacing: 17, gap: 0.1, types: [['spire', 3], ['vending', 1]], lamps: { type: 'citbench', every: 17, offset: 5.5 } });
      L.ringStreet(72, { setback: 8, spacing: 15, gap: 0.25, types: [['hovercar', 2], ['vending', 1], ['citbench', 1]] }, 30);
      L.ring(0, 0, 23, 8, [['citbench', 2], ['vending', 1]], { roadside: true });
      L.scatter([['spire', 2], ['rickstatue', 1]], 12, { minR: 100 });
    },

    // Snowball's world: a dog city. The grand avenue runs up to the palace between dog
    // statues; the other streets are rows of doghouses with hydrants; parks have bones.
    dogworld(L) {
      L.radial({ plaza: 18, plazaStyle: 'stone', spokes: [90 * DEG, 0, 180 * DEG, 270 * DEG], spokeTo: 125, ring: 75, w: 8, style: 'asphalt' });
      L.street(0, 20, 0, 31, { setback: 7, spacing: 5, types: 'dogstatue', scale: [0.7, 0.7] });
      for (const a of [0, 180 * DEG, 270 * DEG]) L.street(Math.cos(a) * 22, Math.sin(a) * 22, Math.cos(a) * 122, Math.sin(a) * 122, { setback: 9, spacing: 12, gap: 0.12, types: 'doghouse', lamps: { type: 'hydrant', every: 24, offset: 5 } });
      L.ringStreet(75, { setback: 9, spacing: 13, gap: 0.2, types: [['doghouse', 3], ['dogstatue', 1]], lamps: { type: 'hydrant', every: 20, offset: 5, sides: [1] } }, 26);
      for (const [x, z] of [[-45, -45], [45, -45], [-100, 100], [100, 100]]) L.cluster(x, z, 14, [['bigbone', 2], ['tennisball', 2], ['tree', 1]], 6);
      L.scatter([['tree', 3], ['bigbone', 1], ['tennisball', 1]], 30, { minR: 105 });
    },

    // Mega Seed World: a dangerous jungle with a trail to the Mega Seed Tree.
    megaseed(L) {
      L.plaza(0, 0, 15, 'dirt');
      L.path([[0, 15], [6, 24], [0, 29]], 5, 'dirt');
      L.path([[-12, 8], [-50, 30], [-90, 20], [-120, 60]], 4, 'dirt');
      L.path([[10, -10], [60, -40], [110, -30]], 4, 'dirt');
      L.street(-12, 8, -50, 30, { setback: 5, spacing: 6, types: [['fungus', 2], ['thornbush', 1]], gap: 0.3 });
      L.scatter([['seedtree', 4], ['fungus', 2], ['thornbush', 2]], 110, { minR: 24 });
    },

    // Blips and Chitz: aisles of cabinets, skee-ball along the side wall, claw machines by
    // the entrance and Roy in the back.
    blips(L) {
      L.plaza(0, 14, 7, 'carpet');
      for (const z of [-14, -4, 6]) {
        L.rows(-14, z, 12, 0, 2.4, 1, 'arcade', 0, { tight: true });
        L.rows(14, z, 12, 0, 2.4, 1, 'arcade', 0, { tight: true });
        L.rows(-14, z - 2.2, 12, 0, 2.4, 1, 'arcade', Math.PI, { tight: true });
        L.rows(14, z - 2.2, 12, 0, 2.4, 1, 'arcade', Math.PI, { tight: true });
      }
      L.rows(-25.5, -4, 0, 30, 1, 3.4, 'skeeball', Math.PI / 2, { tight: true });
      L.rows(25.5, -4, 0, 30, 1, 3.4, 'skeeball', -Math.PI / 2, { tight: true });
      L.rows(-20, 26, 8, 0, 4, 1, 'claw', Math.PI, { tight: true });
      L.rows(20, 26, 8, 0, 4, 1, 'claw', Math.PI, { tight: true });
    },

    // Purge Planet: a calm farming village. One dirt road with farmhouses on both sides and
    // lanterns, barns behind, and wheat fields in tidy rows. Don't stay the night.
    purge(L) {
      L.plaza(0, 0, 16, 'dirt');
      L.road(0, -130, 0, 130, 6, 'dirt');
      L.road(-130, 0, 130, 0, 6, 'dirt');
      for (const [a, b] of [[[0, 20], [0, 128]], [[0, -20], [0, -128]]]) L.street(a[0], a[1], b[0], b[1], { setback: 11, spacing: 22, gap: 0.1, types: 'farmhouse', lamps: { type: 'lantern', every: 16, offset: 4.2 } });
      L.street(20, 0, 128, 0, { setback: 13, spacing: 34, types: 'barn', lamps: { type: 'lantern', every: 16, offset: 4.2 } });
      L.street(-20, 0, -128, 0, { setback: 13, spacing: 34, types: 'barn', lamps: { type: 'lantern', every: 16, offset: 4.2 } });
      for (const [x, z] of [[55, 55], [-55, 55], [55, -55], [-55, -55], [100, 100], [-100, -100]]) L.rows(x, z, 30, 26, 4, 3.2, 'wheat', 0);
      L.scatter('tree', 25, { minR: 90 });
    },

    // Planet Squanch: a party village. Cat-tower houses ring the party square, speakers and
    // party lights line it, and more houses climb out along the paths.
    squanch(L) {
      L.radial({ plaza: 20, plazaStyle: 'party', spokes: [30 * DEG, 150 * DEG, 270 * DEG], spokeTo: 110, ring: 50, w: 5, style: 'dirt' });
      L.ring(0, 0, 23, 12, 'partylight', { roadside: true });
      L.ring(0, 0, 27, 6, 'speaker', { a0: 0.26, roadside: true });
      L.ringStreet(50, { setback: 8, spacing: 11, gap: 0.12, types: 'squanchhut', lamps: { type: 'partylight', every: 15, offset: 3.6, sides: [1] } }, 24);
      L.spokeStreets([30 * DEG, 150 * DEG, 270 * DEG], 58, 108, { setback: 7.5, spacing: 12, gap: 0.2, types: 'squanchhut' });
      L.scatter([['spikeplant', 2], ['partylight', 1]], 30, { minR: 70 });
    },

    // Gazorpazorp's surface: an angry red desert of mesas and bones, with a trail between them.
    gazorp(L) {
      L.plaza(0, 0, 14, 'sand');
      L.path([[0, 14], [20, 60], [70, 90], [110, 130]], 5, 'sand');
      L.path([[-10, -10], [-60, -50], [-120, -60]], 5, 'sand');
      L.street(0, 14, 20, 60, { setback: 6, spacing: 9, types: [['bonepile', 2], ['spikeplant', 1]], gap: 0.4 });
      for (const [x, z] of [[-70, 60], [70, -50], [-40, -110], [100, 20], [-110, 10]]) L.cluster(x, z, 20, [['redmesa', 1], ['bonepile', 1]], 4, { scale: [0.8, 1.3] });
      L.scatter([['spikeplant', 3], ['bonepile', 2], ['redmesa', 1]], 50, { minR: 30 });
    },

    // Froopyland: a candy path winding through cotton-candy groves, lollipops along the way
    // and rainbows arching over it.
    froopy(L) {
      L.plaza(0, 0, 16, 'candy');
      const path = [[0, 16], [20, 45], [-10, 80], [30, 115]];
      L.path(path, 6, 'candy');
      L.path([[-16, 0], [-60, -20], [-100, 10], [-130, -40]], 6, 'candy');
      for (let i = 1; i < path.length; i++) L.street(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], { setback: 6, spacing: 9, types: 'lollipop', gap: 0.2 });
      L.place('rainbow', 10, 30, Math.atan2(20, 29), 1, { onRoad: true });
      L.place('rainbow', 5, 62, Math.atan2(-30, 35), 1, { onRoad: true });
      L.place('rainbow', -80, -5, Math.atan2(-40, -10), 1, { onRoad: true });
      for (const [x, z] of [[-50, 50], [60, -40], [-80, -80], [90, 60], [60, 120], [-110, 100]]) L.cluster(x, z, 18, [['cottontree', 4], ['candyrock', 1]], 9);
      L.scatter([['cottontree', 2], ['candyrock', 1], ['lollipop', 1]], 35, { minR: 40 });
    },

    // Anatomy Park: the promenade to Pirates of the Pancreas runs under arching arteries;
    // bone pillars ring the entrance and blood cells drift about the park.
    anatomy(L) {
      // The Heart in the middle of a fleshy plaza; paths out to each part of the park (the
      // pancreas north, Spleen Mountain east, Bladder Falls south, the Bone Zone west, the
      // food and the bandstand north-west, the gates south-west) and a vein ring around.
      L.radial({ plaza: 18, plazaStyle: 'flesh', spokes: [0, 45, 90, 135, 180, 225, 270, 315].map(d => d * DEG), spokeTo: 82, ring: 60, w: 7, style: 'vein' });
      for (const a of [135 * DEG, 225 * DEG, 315 * DEG]) for (let d = 28; d < 80; d += 22) L.place('artery', Math.cos(a) * d, Math.sin(a) * d, Math.atan2(Math.cos(a), Math.sin(a)), 1, { onRoad: true });
      L.ring(0, 0, 22, 12, 'bonepillar', { roadside: true, a0: 0.2 });
      L.scatter([['bloodcell', 3], ['bonepillar', 1]], 40, { minR: 30 });
    },

    // The Pizza-Phone-Chair dimension looks like ordinary Earth streets, except the things
    // lining them are giant chairs, couches, phones and pizza boxes.
    pizzaworld(L) {
      L.plaza(0, 0, 18, 'stone');
      L.grid({
        spacing: 44, extent: 132, w: 7, style: 'asphalt',
        lots: { setback: 13, spacing: 16, gap: 0.15, types: [['giantchair', 3], ['couch', 2], ['giantphone', 2], ['pizzabox', 2]] },
        lamps: { type: 'streetlamp', every: 22, offset: 5.2, sides: [1] },
      });
      L.scatter('tree', 20, { minR: 120 });
    },

    // Post-apocalyptic Earth: the Death Stalker camp. Spiked wrecks and scrap towers in a
    // ring around the arena, dirt tracks out into the desert, cacti everywhere else.
    wasteland(L) {
      L.plaza(0, 0, 16, 'sand');
      L.ringRoad(0, 0, 42, 7, 'sand', 22);
      for (const a of [20, 140, 260].map(d => d * DEG)) L.road(Math.cos(a) * 15, Math.sin(a) * 15, Math.cos(a) * 130, Math.sin(a) * 130, 6, 'sand');
      L.ringStreet(42, { setback: 7, spacing: 9, gap: 0.2, types: [['wreck', 3], ['scraptower', 1]] }, 22);
      L.ring(0, 0, 24, 6, 'scraptower', { a0: 0.5 });
      L.scatter([['cactus', 4], ['wreck', 1]], 60, { minR: 55 });
    },

    // The Microverse: a hopeful little retro town. Dome houses on a street grid, towers
    // along the main avenue to the gooble box power plant.
    // Mega Gargantua: a proud little city in a clearing between giant leaves and pebbles, the
    // Great Hall at the top of the square and the road out at the bottom.
    gargantua(L) {
      L.plaza(0, 0, 16, 'white');
      L.road(0, 16, 0, 44, 7, 'white');
      L.ringRoad(0, 0, 32, 6, 'white', 18);
      L.ringStreet(32, { setback: 6, spacing: 9, gap: 0.15, types: [['microdome', 3], ['microtower', 1]] }, 18);
      L.scatter([['bigleaf', 3], ['bigpebble', 2], ['bigmushroom', 2]], 30, { minR: 50 });
    },

    // The Immortality Field Resort: a hotel plaza under the dome, palms along a ring road,
    // loungers everywhere, and the Whirly Dirly off to the east.
    resort(L) {
      L.plaza(0, 0, 18, 'white');
      L.ringRoad(0, 0, 34, 6, 'white', 18);
      L.road(0, 18, 0, 70, 6, 'white');
      L.ringStreet(34, { setback: 6, spacing: 8, gap: 0.12, types: [['palm', 2], ['sunlounger', 2], ['flowerbed', 1]] }, 18);
      L.scatter([['palm', 3], ['sunlounger', 2]], 20, { minR: 50 });
    },

    microverse(L) {
      L.plaza(0, 0, 18, 'white');
      L.road(0, 18, 0, 30, 9, 'white');
      L.grid({
        spacing: 48, extent: 120, w: 7, style: 'white',
        lots: { setback: 12, spacing: 16, gap: 0.1, types: [['microdome', 4], ['tree', 1]] },
        crossLots: { setback: 12, spacing: 22, gap: 0.2, types: [['microtower', 2], ['tree', 1]] },
        lamps: { type: 'streetlamp', every: 24, offset: 5, sides: [1] },
      });
      L.scatter('tree', 25, { minR: 120 });
    },

    // Unity's planet: an immaculate city. Identical towers on a perfect grid, lamps at
    // even spacing, the statue of Unity's hosts in the square.
    unityworld(L) {
      L.plaza(0, 0, 20, 'white');
      L.place('unitystatue', 0, 28, Math.PI, 1, { roadside: true });
      L.grid({
        spacing: 40, extent: 120, w: 7, style: 'white',
        lots: { setback: 11, spacing: 15, gap: 0.05, types: 'cityblock' },
        lamps: { type: 'streetlamp', every: 30, offset: 5, sides: [1] },
      });
      L.scatter('tree', 15, { minR: 125 });
    },

    // Galactic Federation HQ: white towers along wide avenues, a landing field of parked
    // ships, and the prison compound.
    federation(L) {
      L.radial({ plaza: 20, plazaStyle: 'white', spokes: [0, 90 * DEG, 180 * DEG, 270 * DEG], spokeTo: 125, w: 10, style: 'white' });
      for (const a of [0, 180 * DEG]) L.street(Math.cos(a) * 24, Math.sin(a) * 24, Math.cos(a) * 122, Math.sin(a) * 122, { setback: 13, spacing: 18, gap: 0.05, types: 'fedtower', lamps: { type: 'streetlamp', every: 18, offset: 6.5 } });
      L.plaza(0, 75, 32, 'metal');
      L.rows(0, 75, 40, 30, 10, 10, 'fedship', 0, { onRoad: true, tight: true });
      L.street(0, -24, 0, -122, { setback: 14, spacing: 16, types: 'prisonblock', lamps: { type: 'streetlamp', every: 16, offset: 6.5 } });
      L.scatter([['fedtower', 1], ['rock', 2]], 18, { minR: 110 });
    },

    // Planet Gear: Geartown. Gear houses on a grid of metal streets, pipes along the
    // sidewalks and giant gears standing at the crossings.
    gearworld(L) {
      L.plaza(0, 0, 18, 'metal');
      L.ring(0, 0, 21, 6, 'biggear', { face: 'along' });
      L.grid({
        spacing: 44, extent: 132, w: 7, style: 'metal',
        lots: { setback: 12, spacing: 15, gap: 0.12, types: 'gearhouse' },
        lamps: { type: 'pipe', every: 22, offset: 5.2, sides: [1] },
      });
      for (let a = -88; a <= 88; a += 44) for (let b = -88; b <= 88; b += 44) if (a || b) L.place('biggear', a + 8, b + 8, Math.PI / 4, 0.8);
      L.scatter([['biggear', 1], ['pipe', 2]], 20, { minR: 125 });
    },

    // Beyond the Curve: golden paths across the void between floating universe orbs, a ring
    // of golden pillars, and the edge of the Curve itself.
    beyond(L) {
      const sp = [0, 60, 120, 180, 240, 300].map(d => d * DEG);
      L.radial({ plaza: 18, plazaStyle: 'gold', spokes: sp.filter(a => Math.abs(a - 90 * DEG) > 0.1), spokeTo: 135, w: 5, style: 'gold' });
      L.road(0, 18, 0, 52, 5, 'gold');
      L.spokeStreets(sp, 22, 132, { setback: 6, spacing: 18, gap: 0.15, types: [['goldorb', 3], ['voidcrystal', 1]] });
      L.ring(0, 0, 42, 12, 'curvepillar', { face: 'out', a0: 0.26 });
      L.scatter([['voidcrystal', 3], ['goldorb', 1]], 45, { minR: 55 });
    },

    // Interdimensional Cable: a commercial strip. Stores and giant TV screens line the main
    // street; Real Fake Doors and Ants in my Eyes Johnson's face each other across it.
    cableworld(L) {
      L.plaza(0, 0, 18, 'stone');
      L.road(0, -135, 0, 135, 9, 'asphalt');
      L.road(-135, 0, 135, 0, 9, 'asphalt');
      L.road(-135, 70, 135, 70, 7, 'asphalt');
      L.road(-135, -70, 135, -70, 7, 'asphalt');
      const shops = { setback: 13, spacing: 17, gap: 0.1, types: [['storefront', 5], ['tvscreen', 2]], lamps: { type: 'streetlamp', every: 20, offset: 6 } };
      L.street(0, 46, 0, 132, shops); L.street(0, -22, 0, -132, shops);
      L.street(22, 0, 132, 0, shops); L.street(-22, 0, -132, 0, shops);
      for (const z of [70, -70]) { L.street(8, z, 132, z, Object.assign({}, shops, { setback: 11 })); L.street(-8, z, -132, z, Object.assign({}, shops, { setback: 11 })); }
      L.rows(44, 34, 0, 10, 1, 2.5, 'doorframe', -Math.PI / 2, { tight: true });     // the real fake doors out front
      L.scatter([['tvscreen', 1], ['tree', 3]], 25, { minR: 100 });
    },

    // Hamster-in-Butt World: a village of people-houses on dirt lanes, hamster wheels and
    // seed piles in the yards.
    hamsterworld(L) {
      const r = L.r;
      L.plaza(0, 0, 18, 'dirt');
      L.ring(0, 0, 22, 6, 'hamsterwheel', { roadside: true, face: 'along' });
      L.grid({
        spacing: 40, extent: 120, w: 5, style: 'dirt',
        lots: { setback: 11, spacing: 15, gap: 0.12, types: 'humanhouse',
          extra: (x, z, rot, side, ux, uz, nx, nz) => {
            if (r() < 0.5) L.place('hamsterwheel', x - nx * 2 + ux * 5.5, z - nz * 2 + uz * 5.5);
            if (r() < 0.6) L.place('seedpile', x + nx * 4 - ux * 4, z + nz * 4 - uz * 4);
          } },
      });
      L.scatter([['tree', 3], ['seedpile', 1]], 30, { minR: 110 });
    },

    // Plumbubo Prime 51b: the plumbus works. Factory halls along the main avenue, production
    // lines in the yards, vats of fleeb juice and piles of finished plumbuses.
    plumbus(L) {
      L.plaza(0, 0, 18, 'metal');
      L.road(0, 18, 0, 31, 8, 'metal');
      L.road(-135, 0, 135, 0, 9, 'metal');
      L.road(0, -135, 0, -18, 9, 'metal');
      L.street(24, 0, 132, 0, { setback: 17, spacing: 28, types: 'factory', lamps: { type: 'streetlamp', every: 24, offset: 6 } });
      L.street(-24, 0, -132, 0, { setback: 17, spacing: 28, types: 'factory', lamps: { type: 'streetlamp', every: 24, offset: 6 } });
      L.street(0, -24, 0, -132, { setback: 10, spacing: 12, types: [['fleebvat', 2], ['plumbuspile', 2]], lamps: { type: 'streetlamp', every: 24, offset: 6 } });
      for (const [x, z] of [[-60, 50], [60, 50], [-60, -55], [60, -55]]) L.rows(x, z, 24, 18, 12, 6, 'conveyor', Math.PI / 2, { tight: true });
      for (const [x, z] of [[-95, 60], [95, 60], [-95, -60], [95, -60]]) L.cluster(x, z, 10, [['fleebvat', 1], ['plumbuspile', 2]], 5);
      L.scatter([['plumbuspile', 1], ['fleebvat', 1]], 20, { minR: 110 });
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
