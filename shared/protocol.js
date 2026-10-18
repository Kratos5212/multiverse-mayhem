// Multiverse Mayhem: the wire protocol. Every message a client sends is checked
// here before the server looks at it; anything that does not match is dropped.
// See PROTOCOL.md for the full list of messages in both directions.
(function (root) {
  'use strict';
  const MM = root.MM || (root.MM = {});

  MM.MAX_MSG_BYTES = 2048;       // the server closes sockets that send more in one message

  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi);
  const int = (v, lo, hi) => num(v, lo, hi) && Math.floor(v) === v;
  const str = (v, max) => typeof v === 'string' && v.length <= max;
  const B = 1300; // generous coordinate bound (Earth reaches 600 m, space 1250 m); the server clamps to the real world edge
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // A bag of things to hand over: at most 30 kinds, whole numbers (Host checks you have them).
  const items = o => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length <= 30 && Object.keys(o).every(k => MM.tradeable(k) && int(o[k], 0, 1e6));
  // Client -> server. Each entry returns a clean copy of the message or null.
  MM.CLIENT_MSGS = {
    // First message: who I am.
    // tok = the random save token this browser keeps, so progress survives a reload.
    hello: m => (int(m.v, 0, 1e6) && str(m.name, 64) && str(m.home || '', 16) && typeof m.look === 'object' && m.look !== null &&
      typeof m.arch === 'string' && own(MM.ARCHETYPES, m.arch) && (m.dim === undefined || own(MM.DIM_BY_ID, m.dim)) && (m.tok === undefined || str(m.tok, 40)) && (m.pvp === undefined || typeof m.pvp === 'boolean'))
      ? { v: m.v, name: m.name, home: m.home || '', look: m.look, arch: m.arch, dim: m.dim, tok: m.tok, pvp: m.pvp !== false, taken: m.taken === 'other' ? 'other' : 'clone' } : null,   // fights are on unless you turned them off
    // Where I am (15 times a second). ep = travel epoch, so stale positions from the
    // previous dimension are ignored.
    st: m => (num(m.x, -B, B) && num(m.y, -200, 1500) && num(m.z, -B, B) && num(m.r, -10, 10) && int(m.a, 0, 9) && int(m.ep, 0, 1e9))
      ? { x: m.x, y: m.y, z: m.z, r: m.r, a: m.a, ep: m.ep } : null,
    // Fire the main weapon along an aim direction (unit vector).
    f: m => aim(m) ? { dx: m.dx, dy: m.dy, dz: m.dz } : null,
    ab: () => ({}),                                     // archetype ability
    unp: m => int(m.id, 0, 1e12) ? { id: m.id } : null,
    sb: m => int(m.id, 0, 1e12) && (m.op === undefined || ['ask', 'yes', 'drop'].includes(m.op)) ? { id: m.id, op: m.op || 'ask' } : null,   // ride in someone's ship / let them in / let the locals out
    kss: m => ['kill', 'stun', 'peace'].includes(m.m) ? { m: m.m } : null,
    fz: m => m.op === 'split' ? { op: 'split' } : null,                     // pull apart from a fusion   // Keep Summer Safe: how           // a Rick reverses a player's death punch
    dp: m => num(m.r, -10, 10) ? { r: m.r } : null,               // the Five-Step Death Punch, facing r
    po: m => (str(m.d, 16) && own(MM.DIM_BY_ID, m.d)) ? { d: m.d } : null,   // open a portal
    ki: m => (str(m.d, 16) && own(MM.DIM_BY_ID, m.d)) ? { d: m.d } : null,   // use the public kiosk
    cr: m => (str(m.g, 16) && own(MM.RECIPES, m.g)) ? { g: m.g } : null,     // build a recipe
    g: m => (str(m.g, 16) && MM.GADGET_IDS.includes(m.g) && aim(m)) ? { g: m.g, dx: m.dx, dy: m.dy, dz: m.dz } : null, // use a gadget
    use: m => (str(m.l, 32) && own(MM.LANDMARK_BY_ID, m.l) && (m.task === undefined || (str(m.task, 24) && own(MM.TASKS, m.task)))) ? { l: m.l, task: m.task } : null, // daily task at a landmark
    talk: m => int(m.n, 0, 1e12) ? { n: m.n } : null,  // talk to a local
    ans: m => int(m.a, 0, 1) ? { a: m.a } : null,      // accept (1) or refuse (0) a local's offer
    ship: m => typeof m.on === 'boolean' ? { on: m.on } : null,                // board or leave your ship
    car: m => typeof m.on === 'boolean' ? { on: m.on } : null,                 // get in (at the car lot) or out of a Death Stalker car
    // Between players: trade (ask, join, set what you give, ok, cancel), give, use an item on them.
    tr: m => (['ask', 'join', 'set', 'ok', 'cancel'].includes(m.op) && (m.id === undefined || int(m.id, 0, 1e12)) && (m.op !== 'set' || items(m.items))) ? { op: m.op, id: m.id, items: m.op === 'set' ? m.items : undefined } : null,
    gv: m => (int(m.id, 0, 1e12) && items(m.items)) ? { id: m.id, items: m.items } : null,
    uo: m => (int(m.id, 0, 1e12) && str(m.q, 20) && own(MM.CURIOS, m.q)) ? { id: m.id, q: m.q } : null,
    pvp: m => typeof m.on === 'boolean' ? { on: m.on } : null,                 // allow fights with other players who allow them too
    orbit: () => ({}),                                                          // fly out of the atmosphere
    land: m => (str(m.d, 24) && own(MM.DIM_BY_ID, m.d) && (m.h === undefined || int(m.h, 0, 20))) ? { d: m.d, h: m.h } : null,   // fly into a planet from space (h: which hole of Anatomy Park's body)
    drive: m => (str(m.d, 16) && own(MM.DIM_BY_ID, m.d)) ? { d: m.d } : null, // dimension drive
    ls: m => (str(m.d, 24) && own(MM.DIM_BY_ID, m.d)) ? { d: m.d } : null,    // lightspeed, from space
    door: m => (str(m.l, 32) && own(MM.LANDMARK_BY_ID, m.l)) ? { l: m.l } : null,  // walk through a door
    // Teams: invite a player, join the team of someone who invited you, or leave.
    tm: m => (['inv', 'join', 'leave'].includes(m.op) && (m.op === 'leave' || int(m.id, 0, 1e12))) ? { op: m.op, id: m.id | 0 } : null,
    pp: m => ((m.c === 0 || m.c === 1) && num(m.x, -B, B) && num(m.y, -200, 1500) && num(m.z, -B, B) && num(m.nx, -1.01, 1.01) && num(m.ny, -1.01, 1.01) && num(m.nz, -1.01, 1.01))
      ? { c: m.c, x: m.x, y: m.y, z: m.z, nx: m.nx, ny: m.ny, nz: m.nz } : null,   // shoot one of your portal pair
    pt: m => ((m.c === 0 || m.c === 1) && int(m.o, 0, 1e12)) ? { o: m.o, c: m.c } : null,   // step through someone's portal pair
    uc: m => (str(m.id, 20) && own(MM.CURIOS, m.id)) ? { id: m.id } : null,   // use a curio from your inventory
    lk: m => (typeof m.look === 'object' && m.look !== null && !Array.isArray(m.look)) ? { look: m.look } : null,   // the wardrobe: a new look
    // Fun (shared/fun.js): board a ride, start or join a shooting gallery, get off a ride.
    fun: m => (['ride', 'gallery', 'off'].includes(m.a) && (m.a === 'off' || (str(m.l, 32) && own(MM.LANDMARK_BY_ID, m.l)))) ? { a: m.a, l: m.l } : null,
    // A mini-game's result: fishing (size 0-3), dancing (0-100 %), Roy (years lived).
    mg: m => (str(m.g, 8) && own(MM.MINIGAMES, m.g) && str(m.l, 32) && own(MM.LANDMARK_BY_ID, m.l) && int(m.s, 0, 100)) ? { g: m.g, l: m.l, s: m.s } : null,
    hd: m => (str(m.o, 12) && MM.DEFENSES && own(MM.DEFENSES, m.o) && (m.d === undefined || int(m.d, 0, 9))) ? { o: m.o, d: m.d } : null,   // "House, ..." (shared/house.js)
    c: m => str(m.text, 300) ? { text: m.text } : null,  // chat
    em: m => int(m.e, 0, 5) ? { e: m.e } : null,       // emote
    rs: () => ({}),                                     // respawn
    pi: m => num(m.c, 0, 1e15) ? { c: m.c } : null,     // ping
  };

  function aim(m) {
    if (!num(m.dx, -1.01, 1.01) || !num(m.dy, -1.01, 1.01) || !num(m.dz, -1.01, 1.01)) return false;
    const l = Math.hypot(m.dx, m.dy, m.dz);
    if (l < 0.9 || l > 1.1) return false;
    m.dx /= l; m.dy /= l; m.dz /= l;
    return true;
  }

  // Parse and check one raw message. Returns { t, ...fields } or null.
  MM.parseClient = function (raw) {
    if (typeof raw !== 'string' || raw.length > MM.MAX_MSG_BYTES) return null;
    let m;
    try { m = JSON.parse(raw); } catch (_) { return null; }
    if (!m || typeof m !== 'object' || Array.isArray(m) || typeof m.t !== 'string') return null;
    const check = Object.prototype.hasOwnProperty.call(MM.CLIENT_MSGS, m.t) ? MM.CLIENT_MSGS[m.t] : null;
    if (!check) return null;
    const clean = check(m);
    if (!clean) return null;
    clean.t = m.t;
    return clean;
  };

  // Rate limits per connection: [burst, refill per second]. "all" covers every message.
  MM.RATE = {
    all: [90, 45], st: [40, 20], f: [12, 6], c: [3, 0.5], cr: [6, 2], g: [6, 2],
    po: [3, 1], ki: [3, 1], ab: [4, 2], em: [4, 1], rs: [3, 1], pi: [5, 1], hello: [1, 0],
    use: [4, 1], talk: [4, 1], ans: [4, 1], ship: [4, 1], drive: [3, 0.5], ls: [3, 0.5], orbit: [2, 0.5], land: [3, 1], door: [3, 1], pvp: [3, 0.5], tm: [4, 0.5], uc: [3, 1], pp: [8, 3], pt: [8, 4], hd: [4, 1], dp: [2, 0.5], unp: [2, 0.5], sb: [4, 1], kss: [3, 1], fz: [2, 0.5], lk: [2, 0.2], fun: [4, 1], mg: [3, 0.5],
  };

  // Animation states the client reports.
  MM.ANIM = { idle: 0, run: 1, air: 2, fly: 3, emote: 4, dead: 5, sit: 6, ride: 7 };

  if (typeof module !== 'undefined' && module.exports) module.exports = MM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
