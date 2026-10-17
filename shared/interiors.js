// Multiverse Mayhem: the insides of buildings. Each one is a floor plan, written once and
// used twice: Mojulo builds the furnished rooms from it (rooms, glyphs, doors; exported as
// glTF and converted with scripts/glb2mm.js into assets/interiors/<id>.mmg), and the game
// reads the same plan for the walls you bump into, the bounds, the way in and the way out.
// Plans are in feet like Mojulo's; `scale` turns feet into game metres (x 0.3048).
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  // glyphs: E entry, L lounge, D dining, K kitchen, B bedroom, O office, S storage, H hall.
  // doors: { x, y, room (index), edge 'N'|'S'|'E'|'W', entry? } (x, y on the wall, in feet).
  // spots: things to do inside, { id, name, x, y (feet), alias? (an outside landmark whose
  // tasks also work here), r? }. npc: who is inside.
  MM.INTERIORS = [
    {
      id: 'schoolin', outside: 'school', name: 'Harry Herpson High (inside)', style: 'brick', scale: 1.35,
      plan: { width: 60, height: 34, rooms: [
        { x: 0, y: 0, w: 20, h: 14, glyph: 'O' }, { x: 20, y: 0, w: 20, h: 14, glyph: 'O' }, { x: 40, y: 0, w: 20, h: 14, glyph: 'O' },
        { x: 0, y: 14, w: 60, h: 8, glyph: 'H' },
        { x: 0, y: 22, w: 30, h: 12, glyph: 'D' }, { x: 30, y: 22, w: 30, h: 12, glyph: 'L' },
      ], doors: [
        { x: 0, y: 18, room: 3, edge: 'W', entry: true },
        { x: 10, y: 14, room: 0, edge: 'S' }, { x: 30, y: 14, room: 1, edge: 'S' }, { x: 50, y: 14, room: 2, edge: 'S' },
        { x: 15, y: 22, room: 4, edge: 'N' }, { x: 45, y: 22, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'class', name: "Mr. Goldenfold's classroom", x: 10, y: 7, alias: 'school' },
        { id: 'principal', name: "Principal Vagina's office", x: 50, y: 7 },
        { id: 'cafeteria', name: 'Cafeteria', x: 15, y: 28 },
      ],
      npc: [['schoolkid', 6], ['neighbor', 2]],
    },
    {
      id: 'hospitalin', outside: 'hospital', name: 'Horse Hospital (inside)', style: 'modern', scale: 1.35,
      plan: { width: 46, height: 30, rooms: [
        { x: 0, y: 0, w: 16, h: 12, glyph: 'O' }, { x: 16, y: 0, w: 15, h: 12, glyph: 'B' }, { x: 31, y: 0, w: 15, h: 12, glyph: 'B' },
        { x: 0, y: 12, w: 46, h: 6, glyph: 'H' },
        { x: 0, y: 18, w: 23, h: 12, glyph: 'B' }, { x: 23, y: 18, w: 23, h: 12, glyph: 'K' },
      ], doors: [
        { x: 0, y: 15, room: 3, edge: 'W', entry: true },
        { x: 8, y: 12, room: 0, edge: 'S' }, { x: 23, y: 12, room: 1, edge: 'S' }, { x: 38, y: 12, room: 2, edge: 'S' },
        { x: 11, y: 18, room: 4, edge: 'N' }, { x: 34, y: 18, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'surgery', name: 'Operating theatre', x: 23, y: 6, alias: 'hospital' },
        { id: 'ward', name: 'The horse ward', x: 11, y: 24 },
      ],
      npc: [['labtech', 3], ['neighbor', 3]],
    },
    {
      id: 'mallin', outside: 'mall', name: "Merpal's Mall (inside)", style: 'modern', scale: 1.35,
      plan: { width: 70, height: 40, rooms: [
        { x: 0, y: 0, w: 18, h: 14, glyph: 'S' }, { x: 18, y: 0, w: 18, h: 14, glyph: 'L' }, { x: 36, y: 0, w: 17, h: 14, glyph: 'O' }, { x: 53, y: 0, w: 17, h: 14, glyph: 'S' },
        { x: 0, y: 14, w: 70, h: 12, glyph: 'H' },
        { x: 0, y: 26, w: 30, h: 14, glyph: 'D' }, { x: 30, y: 26, w: 20, h: 14, glyph: 'B' }, { x: 50, y: 26, w: 20, h: 14, glyph: 'K' },
      ], doors: [
        { x: 0, y: 20, room: 4, edge: 'W', entry: true },
        { x: 9, y: 14, room: 0, edge: 'S' }, { x: 27, y: 14, room: 1, edge: 'S' }, { x: 44, y: 14, room: 2, edge: 'S' }, { x: 61, y: 14, room: 3, edge: 'S' },
        { x: 15, y: 26, room: 5, edge: 'N' }, { x: 40, y: 26, room: 6, edge: 'N' }, { x: 60, y: 26, room: 7, edge: 'N' },
      ] },
      spots: [
        { id: 'concourse', name: 'The concourse', x: 35, y: 20, alias: 'mall' },
        { id: 'foodcourt', name: 'Food court', x: 15, y: 33 },
        { id: 'mattress', name: 'Mattress store', x: 40, y: 33 },
      ],
      npc: [['neighbor', 8], ['schoolkid', 3], ['cop', 1]],
    },
    {
      id: 'shoneysin', outside: 'shoneys', name: "Shoney's (inside)", style: 'cottage', scale: 1.35,
      plan: { width: 40, height: 28, rooms: [
        { x: 0, y: 0, w: 26, h: 28, glyph: 'D' }, { x: 26, y: 0, w: 14, h: 10, glyph: 'E' }, { x: 26, y: 10, w: 14, h: 18, glyph: 'K' },
      ], doors: [
        { x: 40, y: 5, room: 1, edge: 'E', entry: true },
        { x: 26, y: 5, room: 0, edge: 'W' }, { x: 33, y: 10, room: 2, edge: 'N' },
      ] },
      spots: [
        { id: 'booth', name: 'A booth by the window', x: 13, y: 14, alias: 'shoneys' },
        { id: 'breakfastbar', name: 'The breakfast bar', x: 33, y: 19 },
      ],
      npc: [['neighbor', 5]],
    },
    {
      id: 'whitehousein', outside: 'whitehouse', name: 'The White House (inside)', style: 'brick', scale: 1.35,
      plan: { width: 56, height: 32, rooms: [
        { x: 0, y: 0, w: 18, h: 12, glyph: 'D' }, { x: 18, y: 0, w: 20, h: 12, glyph: 'O', items: [{ type: 'resolute-desk', at: [0.5, 0.3], size: [6, 3], height: 2.6, facing: 'S' }, { type: 'sofa', at: [0.3, 0.75], facing: 'E' }, { type: 'sofa', at: [0.7, 0.75], facing: 'W' }] },
        { x: 38, y: 0, w: 18, h: 12, glyph: 'L' },
        { x: 0, y: 12, w: 56, h: 8, glyph: 'H' },
        { x: 0, y: 20, w: 28, h: 12, glyph: 'L' }, { x: 28, y: 20, w: 28, h: 12, glyph: 'K' },
      ], doors: [
        { x: 0, y: 16, room: 3, edge: 'W', entry: true },
        { x: 9, y: 12, room: 0, edge: 'S' }, { x: 28, y: 12, room: 1, edge: 'S' }, { x: 47, y: 12, room: 2, edge: 'S' },
        { x: 14, y: 20, room: 4, edge: 'N' }, { x: 42, y: 20, room: 5, edge: 'N' },
      ] },
      spots: [
        { id: 'oval', name: 'The Oval Office', x: 28, y: 7, alias: 'whitehouse' },
        { id: 'cabinet', name: 'The Cabinet Room', x: 9, y: 6 },
        { id: 'press', name: 'The press briefing room', x: 47, y: 6 },
      ],
      npc: [['president', 1, 28, 4], ['secretservice', 4], ['secretservice', 2, 6, 16]],
    },
    {
      id: 'officein', outside: 'office', name: 'Unemployment Office (inside)', style: 'modern', scale: 1.35,
      plan: { width: 34, height: 24, rooms: [
        { x: 0, y: 0, w: 20, h: 24, glyph: 'L' }, { x: 20, y: 0, w: 14, h: 12, glyph: 'O' }, { x: 20, y: 12, w: 14, h: 12, glyph: 'O' },
      ], doors: [
        { x: 10, y: 24, room: 0, edge: 'S', entry: true },
        { x: 20, y: 6, room: 1, edge: 'W' }, { x: 20, y: 18, room: 2, edge: 'W' },
      ] },
      spots: [
        { id: 'counter', name: 'The job counter', x: 27, y: 6, alias: 'office' },
        { id: 'waiting', name: 'The waiting room', x: 10, y: 12 },
      ],
      npc: [['neighbor', 6]],
    },
  ];

  // Feet on the plan -> game coordinates (centred on the plan; plan +y is -z in the game,
  // which is how Mojulo's export comes out).
  MM.interiorXZ = (I, px, py) => {
    const k = 0.3048 * I.scale;
    return { x: (px - I.plan.width / 2) * k, z: (I.plan.height / 2 - py) * k };
  };

  // The inside walls, from the plan: every room edge (shared edges once), with a gap at each
  // door. Outer walls are left to the room bounds.
  MM.planWalls = function (I) {
    const P = I.plan, W = P.width, H = P.height, gap = 2.0;   // half a door gap, feet
    const segs = new Map();
    const add = (x1, y1, x2, y2) => {
      if (x1 === x2 && (x1 <= 0 || x1 >= W)) return;   // outer walls: the bounds do those
      if (y1 === y2 && (y1 <= 0 || y1 >= H)) return;
      const k = x1 === x2 ? 'v' + x1 : 'h' + y1;
      (segs.get(k) || segs.set(k, []).get(k)).push(x1 === x2 ? [Math.min(y1, y2), Math.max(y1, y2)] : [Math.min(x1, x2), Math.max(x1, x2)]);
    };
    for (const r of P.rooms) { add(r.x, r.y, r.x + r.w, r.y); add(r.x, r.y + r.h, r.x + r.w, r.y + r.h); add(r.x, r.y, r.x, r.y + r.h); add(r.x + r.w, r.y, r.x + r.w, r.y + r.h); }
    const out = [];
    for (const [k, list] of segs) {
      const vert = k[0] === 'v', c = Number(k.slice(1));
      // Merge overlapping spans on this line, then cut the doors out.
      list.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const s of list) { const m = merged[merged.length - 1]; if (m && s[0] <= m[1]) m[1] = Math.max(m[1], s[1]); else merged.push(s.slice()); }
      let spans = merged;
      for (const d of P.doors) {
        const onLine = vert ? Math.abs(d.x - c) < 0.01 : Math.abs(d.y - c) < 0.01;
        if (!onLine) continue;
        const at = vert ? d.y : d.x, next = [];
        for (const [a, b] of spans) {
          if (at + gap <= a || at - gap >= b) { next.push([a, b]); continue; }
          if (at - gap > a) next.push([a, at - gap]);
          if (at + gap < b) next.push([at + gap, b]);
        }
        spans = next;
      }
      for (const [a, b] of spans) {
        const p1 = vert ? MM.interiorXZ(I, c, a) : MM.interiorXZ(I, a, c), p2 = vert ? MM.interiorXZ(I, c, b) : MM.interiorXZ(I, b, c);
        out.push([+p1.x.toFixed(2), +p1.z.toFixed(2), +p2.x.toFixed(2), +p2.z.toFixed(2)]);
      }
    }
    return out;
  };

  // The Smith house: two floors of the same 44 x 32 ft footprint, the plans the meshes were
  // made from (assets/interiors/smith.recipe.json downstairs, smith2.recipe.json upstairs). The
  // walls of each floor only stop you on that floor; the stairs get side walls of their own.
  {
    const D = MM.DIM_BY_ID.smithhouse, F = D.floors.y;
    const down = { scale: 1.4, plan: { width: 44, height: 32, rooms: [
      { x: 0, y: 14, w: 16, h: 18 }, { x: 16, y: 14, w: 12, h: 18 }, { x: 28, y: 14, w: 16, h: 18 }, { x: 0, y: 0, w: 16, h: 14 }, { x: 16, y: 0, w: 28, h: 14 },
    ], doors: [{ x: 16, y: 23 }, { x: 20, y: 14 }, { x: 36, y: 14 }, { x: 16, y: 7 }] } };
    const up = { scale: 1.4, plan: { width: 44, height: 32, rooms: [
      { x: 0, y: 0, w: 16, h: 16 }, { x: 0, y: 16, w: 16, h: 16 }, { x: 16, y: 0, w: 12, h: 15.5 }, { x: 16, y: 15.5, w: 8, h: 16.5 },
      { x: 24, y: 15.5, w: 4, h: 16.5 }, { x: 28, y: 0, w: 16, h: 12 }, { x: 28, y: 12, w: 16, h: 20 },
    ], doors: [{ x: 16, y: 8 }, { x: 16, y: 24 }, { x: 20, y: 15.5 }, { x: 26, y: 15.5 }, { x: 28, y: 6 }, { x: 28, y: 13.75 }] } };
    const S = D.floors.stair, lowZ = S.z0 + (S.z1 - S.z0) * 0.6 / F, headZ = S.z0 + (S.z1 - S.z0) * 2.4 / F;
    D.walls = [].concat(
      MM.planWalls(down).map(w => w.concat([-1, F - 0.5])),
      MM.planWalls(up).map(w => w.concat([F - 0.5, 99])),
      [
        [S.x0, lowZ, S.x0, S.z1, 0.3, F - 0.5],        // the banister, while you are on the stairs
        [S.x0, lowZ, S.x0, headZ, -1, 0.3],            // under the stairs: closed in where it is low
        [S.x0, headZ, S.x1, headZ, -1, 0.3],
      ]);
  }

  // Build the dimensions, the way in (a door on the outside landmark), the way out, and the
  // things to do inside.
  for (const I of MM.INTERIORS) {
    if (MM.DIM_BY_ID[I.id]) continue;
    const k = 0.3048 * I.scale, hw = I.plan.width / 2 * k, hh = I.plan.height / 2 * k;
    const entry = I.plan.doors.find(d => d.entry);
    const ein = MM.interiorXZ(I, entry.x, entry.y);
    // One step inside the front door.
    const inward = { N: [0, -1], S: [0, 1], W: [1, 0], E: [-1, 0] }[entry.edge];
    const inside = { x: ein.x + inward[0] * 1.6, z: ein.z + inward[1] * 1.6 };
    const out = MM.LANDMARK_BY_ID[I.outside];
    const R = MM.PROPS[out.model] && MM.PROPS[out.model].box ? MM.PROPS[out.model].box[3] : out.r;
    const rot = out.rot !== undefined ? out.rot : Math.atan2(-out.x, -out.z);
    const front = { x: out.x + Math.sin(rot) * (R + 2.5), z: out.z + Math.cos(rot) * (R + 2.5) };
    const d = {
      id: I.id, name: I.name, code: MM.DIM_BY_ID[out.dim].code, seed: 300 + MM.INTERIORS.indexOf(I), gravity: 24, interior: true, hidden: true,
      bound: hw - 0.35, boundZ: hh - 0.35, blurb: out.name + ', inside.',
      sky: ['#2a2a30', '#2a2a30'], fog: '#2a2a30', fogFar: 400, sun: '#fff4e0', ambient: '#c0b8a8',
      ground: ['#b8a88a', '#a8987a', '#c8b89a'], accent: '#ffd84d', spawn: inside,
      room: { w: hw * 2, d: hh * 2, h: 3.25 * I.scale, mesh: 'assets/interiors/' + I.id.replace(/in$/, '') + '.mmg' },
      walls: MM.planWalls(I), props: [], npc: I.npc || [], pickups: {}, mat: 's', insideOf: out.id,
    };
    // Fixed spots for the people who live there: plan feet to game metres.
    d.npc = d.npc.map(n => n.length > 2 ? [n[0], n[1], MM.interiorXZ(I, n[2], n[3]).x, MM.interiorXZ(I, n[2], n[3]).z] : n);
    MM.DIMS.push(d); MM.DIM_BY_ID[I.id] = d; MM.DIM_IDS.push(I.id);
    out.door = { dim: I.id, x: inside.x, z: inside.z };
    const exit = { id: I.id + '_exit', dim: I.id, name: 'Way out', x: ein.x + inward[0] * 0.6, z: ein.z + inward[1] * 0.6, r: 0.8, h: 2.2, model: 'lm_marker', door: { dim: out.dim, x: front.x, z: front.z } };
    MM.LANDMARKS.push(exit); MM.LANDMARK_BY_ID[exit.id] = exit;
    for (const s of I.spots) {
      const p = MM.interiorXZ(I, s.x, s.y);
      const l = { id: I.id + '_' + s.id, dim: I.id, name: s.name, x: p.x, z: p.z, r: s.r || 0.8, h: 1.2, model: 'lm_marker' };
      if (s.alias) l.alias = s.alias;
      MM.LANDMARKS.push(l); MM.LANDMARK_BY_ID[l.id] = l;
    }
  }

  // Things to do inside that aren't anywhere else.
  Object.assign(MM.TASKS, {
    principal: { at: 'schoolin_principal', any: true, name: "Get sent to the principal's office", cd: 240, give: { k: 2 }, text: 'Principal Vagina sighed, said his name was not a joke, and gave you a hall pass anyway.' },
    cafeteria: { at: 'schoolin_cafeteria', any: true, name: 'Eat cafeteria food', cd: 150, heal: 1, give: { s: 1 }, text: 'It was beige. All of it. You feel full, and a little sad.' },
    ward:      { at: 'hospitalin_ward', any: true, name: 'Visit a recovering horse', cd: 180, heal: 1, give: { f: 1 }, text: 'The horse nuzzled you. It is going to be fine. Probably.' },
    foodcourt: { at: 'mallin_foodcourt', any: true, name: 'Eat at the food court', cd: 150, heal: 1, give: { s: 1 }, text: 'Pretzel bites, an orange chicken sample, and a long look at the fountain.' },
    mattress:  { at: 'mallin_mattress', any: true, name: 'Lie on every mattress', cd: 200, heal: 1, give: {}, text: 'Firm. Too firm. Medium. You could live here. The sales guy disagrees.' },
    breakfastbar: { at: 'shoneysin_breakfastbar', any: true, name: 'Hit the breakfast bar', cd: 180, heal: 1, give: { s: 2 }, text: 'Endless bacon. Rick was right about this place.' },
    cabinet:   { at: 'whitehousein_cabinet', any: true, name: 'Crash a Cabinet meeting', cd: 300, give: { k: 3 }, text: 'Nobody could explain what you were doing there, so they gave you a commemorative coin.' },
    press:     { at: 'whitehousein_press', any: true, name: 'Take questions at the podium', cd: 240, give: { k: 2 }, text: 'You said "no comment" eleven times. The press loved it.' },
    waiting:   { at: 'officein_waiting', any: true, name: 'Take a number', cd: 120, give: { s: 1 }, text: 'Number 4,812. They are serving number 3. You found a scrap of something under the chair.' },
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
