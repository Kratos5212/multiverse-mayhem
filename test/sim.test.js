// Run with: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
require('../shared/rules.js');
require('../shared/world.js');
require('../shared/layouts.js');
require('../shared/interiors.js');
require('../shared/portals.js');
require('../shared/curios.js');
require('../shared/races.js');
require('../shared/protocol.js');
require('../sim/host.js');
const MM = require('../sim/bot.js');

// A fake connection that records what the host sends.
function fakeConn() {
  const c = { sent: [], closed: null, send(s) { c.sent.push(JSON.parse(s)); }, close(code, why) { c.closed = why; } };
  return c;
}
function join(host, arch, extra) {
  const c = fakeConn();
  host.connect(c, {});
  host.message(c, JSON.stringify(Object.assign({ t: 'hello', v: MM.VERSION, name: 'Tester', home: 'C-137', look: MM.defaultLook(), arch }, extra)));
  host.update(MM.TICK);
  const hi = c.sent.find(m => m.t === 'hi');
  const p = host.players.get(hi.id);
  return { c, p };
}
const run = (host, sec) => { for (let i = 0; i < sec / MM.TICK; i++) host.update(MM.TICK); };

test('world generation is deterministic', () => {
  const a = MM.genProps('suburbia').map(p => [p.type, p.x, p.z]);
  assert.ok(a.length > 50);
  assert.strictEqual(MM.heightAt('moon', 12.5, -40.25), MM.heightAt('moon', 12.5, -40.25));
  for (const d of MM.WORLD_IDS) assert.ok(MM.genProps(d).length > 40, d + ' has props');
});

test('protocol rejects junk', () => {
  assert.strictEqual(MM.parseClient('not json'), null);
  assert.strictEqual(MM.parseClient('{"t":"__proto__"}'), null);
  assert.strictEqual(MM.parseClient('{"t":"constructor"}'), null);
  assert.strictEqual(MM.parseClient('{"t":"st","x":1e9,"y":0,"z":0,"r":0,"a":0,"ep":1}'), null);
  assert.strictEqual(MM.parseClient('{"t":"st","x":"1","y":0,"z":0,"r":0,"a":0,"ep":1}'), null);
  assert.strictEqual(MM.parseClient('{"t":"f","dx":0,"dy":0,"dz":0}'), null);
  assert.strictEqual(MM.parseClient('{"t":"po","d":"nowhere"}'), null);
  assert.strictEqual(MM.parseClient(JSON.stringify({ t: 'c', text: 'x'.repeat(5000) })), null);
  assert.deepStrictEqual(MM.parseClient('{"t":"po","d":"moon"}'), { t: 'po', d: 'moon' });
});

test('names, chat and looks are sanitized', () => {
  assert.ok(!/[<>=()]/.test(MM.sanitizeName('<img src=x onerror=alert(1)>')));
  assert.strictEqual(MM.sanitizeChat('a‮b\u0000c'), 'abc');
  assert.strictEqual(MM.sanitizeChat('what the fuck'), 'what the ****');
  const l = MM.sanitizeLook({ species: 'dragon', skin: 'red; background:url(x)', height: 99, __proto__: { evil: 1 }, hair: 'afro' });
  assert.strictEqual(l.species, 'human');
  assert.strictEqual(l.skin, MM.defaultLook().skin);
  assert.strictEqual(l.height, 1.3);
  assert.strictEqual(l.hair, 'afro');
  assert.strictEqual(l.evil, undefined);
});

test('join, move within limits, and get corrected when teleporting', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius');
  assert.ok(c.sent.find(m => m.t === 'w'));
  const x0 = p.x, z0 = p.z;
  run(host, 0.2);
  host.message(c, JSON.stringify({ t: 'st', x: x0 + 1, y: p.y, z: z0, r: 0, a: 1, ep: p.ep }));
  assert.ok(Math.abs(p.x - (x0 + 1)) < 1e-6, 'small move accepted');
  run(host, 0.1);
  const ep = p.ep;
  host.message(c, JSON.stringify({ t: 'st', x: x0 + 80, y: p.y, z: z0, r: 0, a: 1, ep: p.ep }));
  assert.ok(p.x < x0 + 5, 'speed hack rejected');
  assert.strictEqual(p.ep, ep + 1, 'client told to snap back');
  run(host, 0.1);
  const pv = c.sent.filter(m => m.t === 'pv').flatMap(m => m.l).find(e => e.k === 'tp');
  assert.ok(pv, 'tp sent');
});

test('rate limits and flood kick', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick');
  for (let i = 0; i < 50; i++) host.message(c, JSON.stringify({ t: 'c', text: 'spam ' + i }));
  const chats = c.sent.filter(m => m.t === 'c').length;
  assert.ok(chats <= 3, 'chat limited, got ' + chats);
  for (let i = 0; i < 400; i++) host.message(c, '{"t":"pi","c":1}');
  assert.ok(c.closed, 'flooder kicked');
  assert.ok(!host.players.has(p.id));
});

test('lore limits: only portal-gun owners open portals; Average Joe cannot craft turrets', () => {
  const host = new MM.Host();
  const joe = join(host, 'joe');
  host.message(joe.c, '{"t":"po","d":"moon"}');
  run(host, 0.1);
  assert.strictEqual(host.instance('suburbia', 0).portals.size, 0);
  joe.p.inv.s = 50; joe.p.inv.c = 50;
  host.message(joe.c, '{"t":"cr","g":"turret"}');
  assert.strictEqual(joe.p.inv.turret, 0);
  const gen = join(host, 'genius');
  host.message(gen.c, '{"t":"po","d":"moon"}');
  run(host, 0.1);
  assert.strictEqual(host.instance('suburbia', 0).portals.size, 1);
  assert.strictEqual(host.instance('moon', 0).portals.size, 1);
  assert.strictEqual(gen.p.charges, 2);
});

test('walking into a portal takes you to its dimension', () => {
  const host = new MM.Host();
  const gen = join(host, 'genius');
  host.message(gen.c, '{"t":"po","d":"bazaar"}');
  run(host, 2.1);
  const po = [...host.instance('suburbia', 0).portals.values()][0];
  host.message(gen.c, JSON.stringify({ t: 'st', x: po.x, y: po.y, z: po.z, r: 0, a: 1, ep: gen.p.ep }));
  run(host, 0.1);
  assert.strictEqual(gen.p.inst.dimId, 'bazaar');
});

test('instances hold at most the cap and overflow opens a new one', () => {
  const host = new MM.Host({ cap: 4 });
  for (let i = 0; i < 9; i++) join(host, 'trooper');
  const sizes = [...host.instances.values()].filter(i => i.dimId === 'federation').map(i => i.players.size);
  assert.deepStrictEqual(sizes, [4, 4, 1]);
});

test('64 bots play for a minute without errors', () => {
  const host = new MM.Host({ cap: 64 });
  const bots = [];
  for (let i = 0; i < 64; i++) {
    let bot;
    const conn = { send: s => bot && bot.onMessage(s), close() { bot.closed = true; } };
    host.connect(conn, { bot: true });
    bot = new MM.Bot(s => host.message(conn, s), { chatty: 0.2, dim: MM.DIM_IDS[i % 4] });
    bots.push(bot);
  }
  let kicked = 0;
  const t0 = Date.now();
  for (let i = 0; i < 60 / MM.TICK; i++) {
    host.update(MM.TICK);
    for (const b of bots) b.update(MM.TICK);
  }
  for (const b of bots) if (b.closed) kicked++;
  const ms = Date.now() - t0;
  let kills = 0, chaos = 0;
  for (const p of host.players.values()) { kills += p.kills; chaos += p.prog.chaos; }
  console.log(`  64 bots, 60 s of game in ${ms} ms; kills ${kills}, chaos ${chaos}, instances ${host.instances.size}, kicked ${kicked}`);
  assert.strictEqual(kicked, 0, 'no bot tripped the cheat checks');
  assert.ok(chaos > 0);
});

// ---------- Life paths, cross-dimension crafting, locals, saves ----------
const near = (host, c, p, lid) => {
  const l = MM.LANDMARK_BY_ID[lid];
  if (p.inst.dimId !== l.dim) { host.travel(p, l.dim, { x: l.x, z: l.z + l.r + 2 }); }
  else host.teleport(p, l.x, MM.heightAt(l.dim, l.x, l.z + l.r + 2), l.z + l.r + 2);
  p.z = l.z + l.r + 2; p.x = l.x;
};

test('big upgrades must be built at the right station in the right dimension', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius');
  Object.assign(p.inv, { s: 50, c: 50, g: 50, p: 50, f: 50 });
  host.message(c, '{"t":"cr","g":"armor1"}');
  assert.ok(!p.prog.up.armor1, 'not in Suburbia');
  near(host, c, p, 'forge');
  run(host, 2.2);
  host.message(c, '{"t":"cr","g":"armor1"}');
  assert.ok(p.prog.up.armor1, 'built at the Flesh Forge');
  assert.strictEqual(p.maxHp, 105);
});

test('a teen breaks out of daily life step by step and builds her own portal gun', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'teen');
  assert.strictEqual(p.st.gun, null);
  near(host, c, p, 'school');
  run(host, 1.2);
  host.message(c, '{"t":"use","l":"school"}');
  run(host, 0.1);
  assert.strictEqual(p.inv.s, 4, 'class pays double for teens');
  assert.ok(p.prog.step >= 1);
  host.message(c, '{"t":"use","l":"school"}');
  run(host, 1.2);
  assert.strictEqual(p.inv.s, 4, 'daily task has a cooldown');
  near(host, c, p, 'garage');
  host.message(c, JSON.stringify({ t: 'st', x: p.x, y: p.y, z: p.z, r: 0, a: 0, ep: p.ep }));
  run(host, 0.3);
  assert.ok(p.prog.grants.includes('blaster1'), 'sneaking into the lab unlocks weapon mods');
  // Fast-forward the remaining goals.
  p.prog.cnt.dims = ['suburbia', 'moon']; p.prog.cnt.kills = 5;
  Object.assign(p.inv, { s: 40, c: 20, g: 20, p: 20, f: 20 });
  host.dirty(p); run(host, 0.1);
  assert.ok(p.prog.grants.includes('gunbuild'));
  near(host, c, p, 'garage');
  host.message(c, '{"t":"cr","g":"gunbuild"}');
  run(host, 0.1);
  assert.ok(p.st.gun, 'has a portal gun');
  assert.strictEqual(p.prog.title, 'Space Summer');
  assert.strictEqual(p.charges, 2);
});

test('an Average Joe cannot build a ship until his path allows it', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'joe');
  Object.assign(p.inv, { s: 50, c: 50, g: 50, p: 50, f: 50 });
  near(host, c, p, 'shipyard');
  run(host, 2.2);
  host.message(c, '{"t":"cr","g":"hull"}');
  assert.ok(!p.prog.up.hull);
});

test('ship: boarding lifts the speed limit, and the dimension drive travels', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'trooper');
  assert.ok(p.st.ship, 'troopers start with a ship');
  run(host, 0.5);
  const x0 = p.x;
  host.message(c, JSON.stringify({ t: 'st', x: x0 + 12, y: p.y, z: p.z, r: 0, a: 1, ep: p.ep }));
  assert.ok(p.x < x0 + 1, 'too fast on foot');
  host.message(c, '{"t":"ship","on":true}');
  run(host, 0.2);
  run(host, 0.3);
  host.message(c, JSON.stringify({ t: 'st', x: p.x + 12, y: p.y + 3, z: p.z, r: 0, a: 3, ep: p.ep }));
  assert.ok(p.ship);
  assert.ok(Math.abs(p.x - (x0 + 12)) < 1.5, 'fast in the ship');
  host.message(c, '{"t":"drive","d":"moon"}');
  assert.strictEqual(p.inst.dimId, MM.ARCHETYPES.trooper.home, 'no drive yet');
  p.prog.up.engine = 1; p.prog.up.drive = 1; host.restat(p);
  host.message(c, '{"t":"drive","d":"moon"}');
  assert.strictEqual(p.inst.dimId, 'moon');
});

test('locals react, and errands pay when delivered in another dimension', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'beanling');
  const inst = p.inst;
  const n = [...inst.npcs.values()].find(x => x.type === 'neighbor');
  n.x = p.x + 1; n.z = p.z; n.stun = host.time + 100;
  let said = 0;
  for (let i = 0; i < 6; i++) { host.message(c, JSON.stringify({ t: 'talk', n: n.id })); run(host, 1.3); }
  said = c.sent.filter(m => m.t === 'ev').flatMap(m => m.l).filter(e => e.k === 'say').length;
  assert.ok(said >= 1, 'the local answered');
  assert.strictEqual(p.prog.cnt.talk, 1, 'one local counts once');
  // A hand-made errand: 2 scrap to a Miner on the moon.
  p.prog.errands = [{ id: 1, dim: 'moon', npc: 'moonminer', m: 's', n: 2, from: 'Gary', rew: { c: 6, s: 3 } }];
  p.inv.s = 2; p.inv.c = 0;
  host.travel(p, 'moon', null);
  const miner = [...p.inst.npcs.values()].find(x => x.type === 'moonminer');
  miner.x = p.x + 1; miner.z = p.z; miner.stun = host.time + 100;
  run(host, 1.3);
  host.message(c, JSON.stringify({ t: 'talk', n: miner.id }));
  assert.strictEqual(p.prog.errands.length, 0);
  assert.strictEqual(p.inv.c, 6);
  assert.strictEqual(p.prog.cnt.errand, 1);
});

test('progress is saved by token and comes back on the next visit', () => {
  const db = {};
  const store = { load: (t, a) => db[t + a] ? JSON.parse(db[t + a]) : null, save: (t, a, p) => { db[t + a] = JSON.stringify(p); } };
  const host = new MM.Host({ store });
  const { c, p } = join(host, 'surgeon');
  const tok = c.sent.find(m => m.t === 'hi').tok;
  assert.match(tok, /^[0-9a-f]{32}$/);
  p.prog.up.armor1 = 1; p.inv.g = 7;
  host.close(c);
  const host2 = new MM.Host({ store });
  const again = join(host2, 'surgeon', { tok });
  assert.ok(again.p.prog.up.armor1);
  assert.strictEqual(again.p.inv.g, 7);
  assert.strictEqual(again.p.maxHp, 125);
  // A tampered save is cleaned up instead of trusted blindly.
  db[tok + 'surgeon'] = JSON.stringify({ up: { armor1: 1, '__proto__': 1, hacks: 1 }, inv: { s: 1e12, g: 'lots' }, step: 999 });
  const third = join(new MM.Host({ store }), 'surgeon', { tok });
  assert.strictEqual(third.p.inv.s, 9999);
  assert.strictEqual(third.p.inv.g, 0);
  assert.strictEqual(third.p.prog.step, MM.ARCHETYPES.surgeon.steps.length);
  assert.ok(!third.p.prog.up.hacks);
});

test('world events start and bring visitors', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius');
  p.inst.nextEvent = host.time;
  const before = p.inst.npcs.size;
  run(host, 0.2);
  const ev = c.sent.filter(m => m.t === 'ev').flatMap(m => m.l).find(e => e.k === 'world');
  assert.ok(ev && ev.name, 'event announced');
  assert.ok(p.inst.npcs.size >= before);
});

test("Rick's garage: open on the street, use the Plumbus, go down to the lab and back, build at the workbench", () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  // No door: the garage is part of the street, and you walk straight in.
  assert.ok(!MM.LANDMARK_BY_ID.garage.door && MM.LANDMARK_BY_ID.workbench.dim === 'suburbia');
  const g = MM.genProps('suburbia').find(q => q.type === 'lm_garage');
  assert.deepStrictEqual(MM.pushOutOfProp(g, g.x + 1, g.z, 0.45), [g.x + 1, g.z], 'standing inside is fine');
  assert.notDeepStrictEqual(MM.pushOutOfProp(g, g.x, g.z + 4.5, 0.45), [g.x, g.z + 4.5], 'the walls block');
  near(host, c, p, 'plumbus');
  run(host, 1.2);
  host.message(c, '{"t":"use","l":"plumbus"}');
  assert.strictEqual(p.inv.s, 3, 'anyone can make a plumbus');
  near(host, c, p, 'mbox');
  run(host, 1.2);
  host.message(c, '{"t":"use","l":"mbox"}');
  assert.ok([...p.inst.npcs.values()].some(n => n.type === 'meeseeks' && n.owner === p.id), 'a Meeseeks pops out');
  Object.assign(p.inv, { m: 5, c: 5 });
  near(host, c, p, 'workbench');
  run(host, 1.2);
  host.message(c, '{"t":"cr","g":"megabrain"}');
  assert.ok(p.prog.up.megabrain, 'the indoor workbench counts as the garage station');
  assert.strictEqual(p.st.cdMult, 0.7);
  near(host, c, p, 'trapdoor');
  run(host, 1.2);
  host.message(c, '{"t":"door","l":"trapdoor"}');
  assert.strictEqual(p.inst.dimId, 'ricklab');
  // Walls: you cannot walk out of the room.
  run(host, 0.2);
  host.message(c, JSON.stringify({ t: 'st', x: p.x, y: 0, z: p.z + 3, r: 0, a: 1, ep: p.ep }));
  run(host, 0.4);
  host.message(c, JSON.stringify({ t: 'st', x: p.x, y: 0, z: 40, r: 0, a: 1, ep: p.ep }));
  assert.ok(p.z <= MM.boundOf('ricklab'));
  // Up the ladder: back in the same garage.
  near(host, c, p, 'ladder'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"ladder"}');
  assert.strictEqual(p.inst.dimId, 'suburbia');
  assert.ok(Math.hypot(p.x - g.x, p.z - g.z) < 6, 'in the garage');
  // From another Earth's garage, the lab's ladder takes you back to that Earth.
  near(host, c, p, 'shrimpearth_trapdoor'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"shrimpearth_trapdoor"}');
  assert.strictEqual(p.inst.dimId, 'ricklab');
  near(host, c, p, 'ladder'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"ladder"}');
  assert.strictEqual(p.inst.dimId, 'shrimpearth');
});

test('Meeseeks Box gadget and the Citadel', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'citadel' });
  assert.strictEqual(p.inst.dimId, 'citadel');
  p.inv.k = 10; p.inv.s = 5;
  host.message(c, '{"t":"cr","g":"meeseeks"}');
  assert.strictEqual(p.inv.meeseeks, 1);
  host.message(c, '{"t":"g","g":"meeseeks","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.meeseeks, 0);
  assert.ok([...p.inst.npcs.values()].some(n => n.type === 'meeseeks'));
  assert.ok([...p.inst.npcs.values()].some(n => n.type === 'citrick'), 'Ricks live at the Citadel');
});

test('fights: players only hurt each other when both have fights on (the default)', () => {
  const host = new MM.Host();
  const a = join(host, 'genius', { pvp: false }), b = join(host, 'teen', { pvp: false });   // not Morty: he dodges at random
  for (const { p } of [a, b]) { host.travel(p, 'moon'); p.fx.prot = 0; }
  b.p.x = a.p.x; b.p.z = a.p.z + 5; b.p.y = a.p.y;
  const hp0 = b.p.hp;
  const shoot = () => { a.p.cdFire = 0; host.message(a.c, JSON.stringify({ t: 'f', dx: 0, dy: 0, dz: 1 })); run(host, 0.6); };
  for (let i = 0; i < 5; i++) shoot();
  assert.strictEqual(b.p.hp, hp0, 'shots pass through someone with fights off');
  host.hurtPlayer(a.p.inst, b.p, 30, a.p, 'test');
  assert.strictEqual(b.p.hp, hp0, 'no damage without consent');
  host.message(a.c, '{"t":"pvp","on":true}');
  host.hurtPlayer(a.p.inst, b.p, 30, a.p, 'test');
  assert.strictEqual(b.p.hp, hp0, 'one side is not enough');
  host.message(b.c, '{"t":"pvp","on":true}');
  host.hurtPlayer(a.p.inst, b.p, 10, a.p, 'test');
  assert.ok(b.p.hp < hp0, 'both on: fights happen');
  assert.ok(host.fxBits(b.p, host.time) & 4096, 'fighters are marked for everyone to see');
});

test('monsters leave you alone unless you come close or hit them', () => {
  const host = new MM.Host();
  const { p } = join(host, 'genius');
  host.travel(p, 'meatlands');
  p.fx.prot = 0;
  const inst = p.inst;
  const n = [...inst.npcs.values()].find(x => x.T.hostile);
  assert.ok(n, 'a monster to test with');
  for (const o of inst.npcs.values()) if (o !== n) inst.npcs.delete(o.id);
  n.home = { x: n.x, z: n.z };
  p.x = n.x + 20; p.z = n.z; p.y = MM.heightAt('meatlands', p.x, p.z);
  const hp0 = p.hp;
  run(host, 4);
  assert.ok(Math.hypot(n.x - p.x, n.z - p.z) > 12, 'it does not come after you from 20 m away');
  assert.strictEqual(p.hp, hp0);
  inst.hurtNpc(n, 1, p);
  assert.strictEqual(n.angry, p.id, 'hit it and it comes for you');
});

test('fights are on by default, and you start in your own world', () => {
  const host = new MM.Host();
  const { p } = join(host, 'birdfolk', { dim: 'moon' });
  assert.strictEqual(p.pvp, true);
  assert.strictEqual(p.inst.dimId, 'featherhold', 'Birdperson starts on Bird World, not wherever he asked');
  const t = join(host, 'trooper');
  assert.strictEqual(t.p.inst.dimId, 'federation');
});

test('lore travel: no gun, no portal; borrow Rick\'s; stations charge; ships need range; gold leaves the Curve', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'teen', { dim: 'suburbia' });
  assert.ok(!p.st.gun);
  host.message(c, '{"t":"po","d":"moon"}');
  assert.strictEqual(p.inst.portals.size, 0, 'no portal gun, no portal');
  // Pocket worlds only through their entrance; no kiosk on Earth any more.
  assert.ok(MM.travelWhy('portal', 'suburbia', 'microverse', {}));
  assert.ok(!MM.DIM_BY_ID.suburbia.station);
  // Borrow Rick's gun from the garage workbench: two jumps, no recharge.
  near(host, c, p, 'garage'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"garage"}');
  near(host, c, p, 'workbench'); run(host, 1.2);
  host.message(c, '{"t":"use","l":"workbench","task":"borrowgun"}');
  assert.strictEqual(p.borrow, 2);
  run(host, 1.2);
  host.message(c, '{"t":"po","d":"cableworld"}');
  assert.strictEqual(p.inst.portals.size, 0, 'a plain portal cannot leave the Curve');
  host.message(c, '{"t":"po","d":"citadel"}');
  assert.strictEqual(p.borrow, 1);
  const po = [...p.inst.portals.values()][0];
  run(host, 2.1);
  host.message(c, JSON.stringify({ t: 'st', x: po.x, y: po.y, z: po.z, r: 0, a: 1, ep: p.ep }));
  run(host, 0.1);
  assert.strictEqual(p.inst.dimId, 'citadel');
  // The Citadel portal station charges anyone who isn't a Rick or a Morty.
  const S = MM.DIM_BY_ID.citadel.station;
  p.inv.k = 5;
  run(host, 3.1);
  host.teleport(p, S.x, MM.heightAt('citadel', S.x, S.z + 2), S.z + 2);
  host.message(c, '{"t":"ki","d":"gazorp"}');
  assert.strictEqual(p.inst.dimId, 'gazorp');
  assert.strictEqual(p.inv.k, 2);
  // Ships: Earth to the Moon is a hop, other planets need the engine.
  assert.strictEqual(MM.travelWhy('ship', 'suburbia', 'moon', { hull: true }), '');
  assert.ok(MM.travelWhy('ship', 'suburbia', 'squanch', { hull: true }));
  assert.strictEqual(MM.travelWhy('ship', 'suburbia', 'squanch', { hull: true, engine: true }), '');
  assert.ok(MM.travelWhy('ship', 'suburbia', 'dogworld', { hull: true, engine: true }));
  // Evil Morty's gun is gold.
  const em = join(host, 'evilmorty');
  assert.ok(em.p.st.gun.gold);
  host.message(em.c, '{"t":"po","d":"cableworld"}');
  assert.ok([...em.p.inst.portals.values()].some(po => po.owner === em.p.id && po.destDim === 'cableworld'));
});

test('teams: invite, no friendly fire, and teammates come along through doors and ships', () => {
  const host = new MM.Host();
  const a = join(host, 'trooper', { dim: 'federation' });
  const b = join(host, 'trooper', { dim: 'federation' });
  assert.strictEqual(a.p.inst, b.p.inst);
  host.message(a.c, JSON.stringify({ t: 'tm', op: 'inv', id: b.p.id }));
  run(host, 0.1);
  host.message(b.c, JSON.stringify({ t: 'tm', op: 'join', id: a.p.id }));
  assert.ok(a.p.team && a.p.team === b.p.team);
  // Teammates can't hurt each other.
  const hp = b.p.hp;
  host.hurtPlayer(b.p.inst, b.p, 20, a.p);
  assert.strictEqual(b.p.hp, hp);
  // Fly to the Moon: the teammate standing next to the ship rides along.
  a.p.prog.up.engine = 1; host.restat(a.p);
  host.teleport(b.p, a.p.x + 3, a.p.y, a.p.z);
  host.message(a.c, '{"t":"ship","on":true}');
  run(host, 0.2);
  host.message(a.c, '{"t":"drive","d":"moon"}');
  assert.strictEqual(a.p.inst.dimId, 'moon');
  assert.strictEqual(b.p.inst, a.p.inst, 'passenger came along');
  host.message(b.c, JSON.stringify({ t: 'tm', op: 'leave' }));
  assert.ok(!a.p.team && !b.p.team);
});

test('Earth is one world: the suburb, Downtown, D.C. and Area 51; the President is guarded; freezing time brings a Time Cop', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'suburbia' });
  for (const id of ['whitehouse', 'mall', 'sonicstage', 'home', 'garage']) assert.strictEqual(MM.LANDMARK_BY_ID[id].dim, 'suburbia', id + ' is on Earth');
  assert.ok(!MM.WORLD_IDS.includes('downtown') && MM.boundOf('suburbia') >= 600);
  const wh = MM.LANDMARK_BY_ID.whitehouse;
  const pres = [...p.inst.npcs.values()].find(n => n.type === 'president');
  assert.ok(pres && Math.hypot(pres.x - wh.x, pres.z - (wh.z + 14)) < 8, 'the President is at the White House');
  host.teleport(p, pres.x + 3, pres.y, pres.z);
  p.inst.hurtNpc(pres, 5, p);
  assert.ok([...p.inst.npcs.values()].some(n => n.T.guard && n !== pres && n.angry === p.id), 'his guards come for you');
  // Alternate Earths share the street plan and the landmarks.
  assert.ok(MM.LANDMARK_BY_ID.shrimpearth_home && MM.isAt(MM.LANDMARK_BY_ID.shrimpearth_home, 'home'));
  assert.ok(MM.LANDMARK_BY_ID.shrimpearth_whitehouse && MM.LANDMARK_BY_ID.shrimpearth_mall, 'every Earth has the whole planet');
  // A Time Crystal stops time... and a Time Cop turns up.
  p.inv.timecrystal = 1;
  host.message(c, '{"t":"g","g":"timecrystal","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.timecrystal, 0);
  run(host, 3);
  assert.ok([...p.inst.npcs.values()].some(n => n.type === 'timecop' && n.angry === p.id));
});

test('Smith house: two floors, stairs, upstairs rooms, the back door to the yard; the garage on its left', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  near(host, c, p, 'home'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"home"}');
  assert.strictEqual(p.inst.dimId, 'smithhouse');
  near(host, c, p, 'smithtv'); p.y = 0; run(host, 1.2);
  host.message(c, '{"t":"use","l":"smithtv","task":"tv"}');
  assert.ok(p.prog.tasks.tv > 0, 'watched TV');
  // Walls belong to their floor: the kitchen wall downstairs is open air upstairs.
  const [, z0] = MM.collideWalls('smithhouse', 8, 0.85, 0.4, 0);
  assert.ok(Math.abs(z0 - 0.85) >= 0.5, 'the kitchen wall stops you downstairs');
  assert.deepStrictEqual(MM.collideWalls('smithhouse', 8, 0.85, 0.4, 4.3), [8, 0.85], 'upstairs it is the middle of a bedroom');
  // The stairs climb from the front hall to the upstairs hall; the stairwell has no floor.
  const S = MM.DIM_BY_ID.smithhouse.floors.stair, F = MM.DIM_BY_ID.smithhouse.floors.y;
  assert.ok(MM.floorAt('smithhouse', 1.6, S.z0 + 0.01, 0) < 0.02, 'the bottom step');
  assert.ok(Math.abs(MM.floorAt('smithhouse', 1.6, (S.z0 + S.z1) / 2, F / 2) - F / 2) < 0.05, 'halfway up');
  assert.strictEqual(MM.floorAt('smithhouse', -5, 3, F), F, 'standing upstairs');
  assert.strictEqual(MM.floorAt('smithhouse', -5, 3, 0), 0, 'downstairs, under the same spot');
  // Upstairs rooms only work up there: Morty's room is right over the living room.
  near(host, c, p, 'mortyroom'); p.y = 0; run(host, 1.2);
  host.message(c, '{"t":"use","l":"mortyroom","task":"homework"}');
  assert.ok(!p.prog.tasks.homework, "Morty's room is upstairs");
  p.y = F; run(host, 1.2);
  host.message(c, '{"t":"use","l":"mortyroom","task":"homework"}');
  assert.ok(p.prog.tasks.homework > 0, "did Morty's homework");
  // Out the back door into the yard, where the graves are.
  near(host, c, p, 'smithback'); p.y = 0; run(host, 1.2);
  host.message(c, '{"t":"door","l":"smithback"}');
  assert.strictEqual(p.inst.dimId, 'suburbia');
  assert.ok(p.x < MM.LANDMARK_BY_ID.home.x - 5, 'behind the house');
  const home = MM.LANDMARK_BY_ID.home, garage = MM.LANDMARK_BY_ID.garage;
  assert.ok(garage.z > home.z + 10 && Math.abs(garage.x - home.x) < 2, 'the garage is on the left of the house, from the street');
  assert.ok(MM.LANDMARK_BY_ID.shrimpearth_home && MM.LANDMARK_BY_ID.shrimpearth_backyard, 'alternate Earths keep their Smith house and yard');
});

test('home dimensions: your code is a real Earth you start in, and there is only one of each variant', () => {
  const host = new MM.Host();
  const a = join(host, 'genius', { home: 'Y-231' });
  assert.strictEqual(a.p.inst.dimId, 'h_Y231');
  assert.strictEqual(MM.DIM_BY_ID.h_Y231.name, 'Earth Y-231');
  assert.ok(MM.genProps('h_Y231').length > 100 && MM.LANDMARK_BY_ID.h_Y231_home, 'a whole Earth with its own Smith house');
  const twin = MM.DIM_BY_ID.h_Y231;
  assert.strictEqual(MM.ensureHomeDim('h_Y231'), twin, 'the same code is always the same place');
  const b = join(host, 'genius', { home: 'Y-231' });
  assert.notStrictEqual(b.p.home, 'Y-231', 'only one Rick Y-231');
  assert.ok(/^Y-\d+$/.test(b.p.home));
  const m = join(host, 'sidekick', { home: 'Y-231' });
  assert.strictEqual(m.p.home, 'Y-231', 'Morty Y-231 is a different variant');
  const c137 = join(host, 'genius', { home: 'C-137' });
  assert.strictEqual(c137.p.inst.dimId, 'suburbia', 'Rick C-137 lives on the show\'s Earth');
  const bird = join(host, 'birdfolk', { home: 'Y-231' });
  assert.strictEqual(bird.p.inst.dimId, 'featherhold', 'bird people still start at home in Featherhold');
  // Anyone can open a portal there.
  a.p.inst.dimId; host.message(c137.c, '{"t":"po","d":"h_Y231"}');
  assert.ok([...c137.p.inst.portals.values()].some(po => po.destDim === 'h_Y231'));
  assert.strictEqual(MM.DIM_BY_ID.h_bad, undefined);
});

test("Rick's body upgrades: only Ricks can build them, and they change his stats", () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius');
  Object.assign(p.inv, { c: 30, s: 30, p: 10, g: 10 });
  near(host, c, p, 'garage'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"garage"}');
  near(host, c, p, 'workbench'); run(host, 1.2);
  const dmg = p.st.dmg, speed = p.st.speed;
  for (const r of ['cyberarm', 'cyberlegs', 'scanner']) host.message(c, JSON.stringify({ t: 'cr', g: r }));
  assert.ok(p.prog.up.cyberarm && p.prog.up.cyberlegs && p.prog.up.scanner);
  assert.ok(p.st.dmg > dmg * 1.3 && p.st.speed > speed * 1.2 && p.st.scanner);
  assert.ok(MM.canKnow('sidekick', p.prog, 'cyberarm'), 'Morty cannot');
});

test('Pickle Rick can only roll until he builds the rat suit', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'picklerick');
  p.inv.grenade = 2;
  host.message(c, '{"t":"g","g":"grenade","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.grenade, 2, 'no gadgets as a pickle');
  run(host, 0.5);
  host.message(c, '{"t":"f","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.cdFire, 0, 'no attacking as a pickle');
  Object.assign(p.inv, { g: 5, s: 5 });
  host.message(c, '{"t":"cr","g":"ratsuit"}');
  assert.ok(p.prog.up.ratsuit, 'built the rat suit anywhere');
  host.message(c, '{"t":"g","g":"grenade","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.grenade, 1, 'now he can use gadgets');
});

test('buildings have insides: in through the door, do things, out again; walls and boxes block', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  for (const I of MM.INTERIORS) {
    const out = MM.LANDMARK_BY_ID[I.outside];
    near(host, c, p, out.id); run(host, 1.2);
    host.message(c, JSON.stringify({ t: 'door', l: out.id }));
    assert.strictEqual(p.inst.dimId, I.id, 'into ' + I.name);
    assert.ok(I.plan.rooms.length === 1 || MM.DIM_BY_ID[I.id].walls.length > 0, I.name + ' has inside walls');
    assert.ok(MM.LANDMARKS.some(l => l.dim === I.id && l.alias === I.outside), 'what you do outside ' + I.name + ' works inside too');
    assert.ok([...p.inst.npcs.values()].every(n => Math.abs(n.x) <= MM.boundOf(I.id) && Math.abs(n.z) <= MM.boundZOf(I.id)), 'locals are inside');
    near(host, c, p, I.id + '_exit'); run(host, 1.2);
    host.message(c, JSON.stringify({ t: 'door', l: I.id + '_exit' }));
    assert.strictEqual(p.inst.dimId, out.dim, 'back out of ' + I.name);
  }
  // Inside the school, the class task works at the classroom spot (it is the school's task).
  near(host, c, p, 'schoolin_class'); run(host, 1.2);
  host.message(c, '{"t":"use","l":"schoolin_class","task":"school"}');
  assert.ok(p.prog.tasks.school > 0);
  // A house collides as its box: its corner, which the old circle missed, now blocks.
  const h = MM.genProps('suburbia').find(q => q.type === 'house'), cs = Math.cos(h.rot), sn = Math.sin(h.rot);
  const wx = h.x + 5.5 * cs - 4.5 * sn, wz = h.z - 5.5 * sn - 4.5 * cs;
  assert.notDeepStrictEqual(MM.pushOutOfProp(h, wx, wz, 0.4), [wx, wz]);
});

test('curios: every world has some, you pick them up, use them, and they are remembered', () => {
  for (const d of MM.WORLD_IDS) assert.ok(MM.curiosOf(d).length > 0, d + ' has curios');
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  const inst = p.inst;
  assert.ok([...inst.pickups.values()].filter(pk => MM.isCurio(pk.c)).length > 0, 'curios lie around');
  // Walk onto some Eyeholes.
  inst.spawnPickup('q:eyeholes', false, { x: p.x, z: p.z });
  host.message(c, JSON.stringify({ t: 'st', x: p.x, y: p.y, z: p.z, r: 0, a: 0, ep: p.ep }));
  assert.strictEqual(p.inv['q:eyeholes'], 1);
  assert.ok(p.prog.found.includes('eyeholes'));
  assert.ok(host.progState(p).found.includes('eyeholes'));
  // Eat them: faster for a while, and they are gone.
  host.message(c, '{"t":"uc","id":"eyeholes"}');
  assert.ok(p.fx.sprint > host.time);
  assert.ok(!p.inv['q:eyeholes']);
  // You can't use what you don't have.
  host.message(c, '{"t":"uc","id":"szechuan"}');
  assert.ok(!p.inv['q:szechuan']);
  // Saved and reloaded: still found, junk dropped.
  const back = MM.cleanProgress('sidekick', JSON.parse(JSON.stringify(Object.assign({}, p.prog, { found: ['eyeholes', 'nope'], inv: Object.assign({}, p.inv, { 'q:plumbus': 2, 'q:bogus': 3 }) }))));
  assert.deepStrictEqual(back.found, ['eyeholes']);
  assert.strictEqual(back.inv['q:plumbus'], 2);
  assert.ok(!('q:bogus' in back.inv));
});

test('the freeze ray freezes whoever it hits', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  const inst = p.inst;
  const n = inst.spawnNpc('neighbor', false, { at: { x: p.x, z: p.z + 6 } });
  n.y = p.y; n.tx = n.x; n.tz = n.z; n.wait = host.time + 100;
  p.inv.freeze = 1;
  host.message(c, '{"t":"g","g":"freeze","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.freeze, 0);
  run(host, 0.5);
  assert.ok(n.stun > host.time, 'frozen');
});

test('more of the multiverse: new worlds, other times, and things to do there', () => {
  for (const d of ['snakeplanet', 'giantland', 'atlantis', 'dreamworld', 'dinoearth', 'splitearth', 'doofusearth']) {
    assert.ok(MM.DIM_BY_ID[d] && MM.WORLD_IDS.includes(d), d);
    assert.ok(MM.genProps(d).length > 40, d + ' has things in it');
    assert.ok(MM.curiosOf(d).length > 0, d + ' has curios');
  }
  assert.ok(MM.DIM_BY_ID.dinoearth.timeline && MM.DIM_BY_ID.splitearth.timeline);
  assert.strictEqual(MM.boundOf('snakeplanet'), 200, 'open worlds are bigger');
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  for (const [lid, task] of [['snakeclub', 'snakejazz'], ['dinocouncil', 'dinotalk'], ['giantcastle', 'giantcourt'], ['nimbuspalace', 'nimbus'], ['dreamschool', 'dreamtest'], ['timerift', 'timerift']]) {
    near(host, c, p, lid); run(host, 1.2);
    host.message(c, JSON.stringify({ t: 'use', l: lid, task }));
    assert.ok(p.prog.tasks[task] > 0, task);
  }
});

test('portal pair: Rick shoots blue and orange, anyone steps through one and out the other', () => {
  // The ray finds the ground, and a house wall from the street.
  const down = MM.raycastWorld('moon', { x: 0, y: 40, z: 0 }, { x: 0, y: -1, z: 0 }, 200);
  assert.ok(down && down.ny > 0.5 && Math.abs(down.y - MM.heightAt('moon', 0, 0)) < 0.3);
  const h = MM.genProps('suburbia').find(q => q.type === 'house');
  const ox = h.x + Math.sin(h.rot) * 20, oz = h.z + Math.cos(h.rot) * 20;
  const l = Math.hypot(h.x - ox, h.z - oz);
  const wall = MM.raycastWorld('suburbia', { x: ox, y: h.y + 2, z: oz }, { x: (h.x - ox) / l, y: 0, z: (h.z - oz) / l }, 100);
  assert.ok(wall && Math.abs(wall.ny) < 0.1 && wall.t < 20, 'hit the house wall');
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'moon' });
  const m2 = join(host, 'joe', { dim: 'moon' });
  run(host, 0.5);
  const y0 = MM.heightAt('moon', p.x, p.z), far = { x: p.x + 60, z: p.z + 40 };
  host.message(c, JSON.stringify({ t: 'pp', c: 0, x: p.x + 2, y: y0, z: p.z, nx: 0, ny: 1, nz: 0 }));
  host.time += 1;
  host.message(c, JSON.stringify({ t: 'pp', c: 1, x: far.x, y: MM.heightAt('moon', far.x, far.z), z: far.z, nx: 0, ny: 1, nz: 0 }));
  assert.ok(p.pp[0] && p.pp[1], 'both portals placed');
  // Jerry walks onto Rick's blue portal and comes out of the orange one.
  const q = m2.p;
  host.teleport(q, p.x + 2, y0, p.z);
  host.message(m2.c, JSON.stringify({ t: 'pt', o: p.id, c: 0 }));
  assert.ok(Math.hypot(q.x - far.x, q.z - far.z) < 1, 'came out the orange portal');
  // Jerry has no portal gun: he can't shoot his own.
  host.message(m2.c, JSON.stringify({ t: 'pp', c: 0, x: q.x, y: q.y, z: q.z, nx: 0, ny: 1, nz: 0 }));
  assert.ok(!(q.pp && q.pp[0]));
});

test('space: fly up out of the atmosphere, see the planets, land on the Moon', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'suburbia' });
  Object.assign(p.prog.up, { hull: 1 }); host.restat(p);
  host.message(c, '{"t":"ship","on":true}');
  assert.ok(p.ship);
  // Not high enough yet.
  host.message(c, '{"t":"orbit"}');
  assert.strictEqual(p.inst.dimId, 'suburbia');
  p.y = MM.heightAt('suburbia', p.x, p.z) + MM.ORBIT_ALT + 5;
  host.message(c, '{"t":"orbit"}');
  const S = MM.DIM_BY_ID[p.inst.dimId];
  assert.ok(S.planets && S.planets[0].dim === 'suburbia', 'in space above Earth');
  assert.ok(S.planets.some(q => q.dim === 'moon') && S.planets.some(q => q.dim === 'gazorp'), 'the moon and the other planets are there');
  // Gazorpazorp needs the Turbo Engine; the Moon does not.
  const G = S.planets.find(q => q.dim === 'gazorp'), M = S.planets.find(q => q.dim === 'moon');
  p.x = G.x; p.y = G.y + G.r; p.z = G.z; host.time += 5;
  host.message(c, '{"t":"land","d":"gazorp"}');
  assert.ok(MM.DIM_BY_ID[p.inst.dimId].planets, 'still in space');
  p.x = M.x; p.y = M.y + M.r; p.z = M.z; host.time += 5;
  host.message(c, '{"t":"land","d":"moon"}');
  assert.strictEqual(p.inst.dimId, 'moon');
  assert.ok(p.ship && p.y > MM.heightAt('moon', p.x, p.z) + 100, 'coming in from high up, still in the ship');
});

test('worlds, their dimensions and timelines; lightspeed from space', () => {
  // Every place you can portal to belongs to a world (pockets aside); every world has a
  // parallel dimension; timelines hang off one dimension of one world.
  for (const id of MM.WORLD_IDS) if (!MM.DIM_BY_ID[id].pocket) assert.ok(MM.worldOf(id), id + ' belongs to a world');
  for (const W of MM.WORLDS) if (!MM.DIM_BY_ID[W.prime].interior) assert.ok(W.dims.length >= 2, W.name + ' has a parallel dimension');
  assert.strictEqual(MM.worldOf('shrimpearth'), 'earth');
  assert.strictEqual(MM.worldOf('h_X123'), 'earth', 'home Earths are Earth');
  assert.deepStrictEqual(MM.timelinesOf('suburbia').sort(), ['dinoearth', 'fedearth', 'splitearth']);
  assert.strictEqual(MM.worldOf('evilcitadel'), 'citadel');
  assert.strictEqual(MM.dimensionOf('splitearth'), 'suburbia');
  // Lightspeed only from space, in a ship; another dimension needs the Dimension Drive, another
  // timeline the Quantum Drive.
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'suburbia' });
  Object.assign(p.prog.up, { hull: 1, engine: 1 }); host.restat(p);
  host.message(c, '{"t":"ship","on":true}');
  host.message(c, '{"t":"ls","d":"featherhold_ic"}');
  assert.strictEqual(p.inst.dimId, 'suburbia', 'not from the ground');
  p.y = MM.heightAt('suburbia', p.x, p.z) + MM.ORBIT_ALT + 5;
  host.message(c, '{"t":"orbit"}');
  assert.ok(MM.DIM_BY_ID[p.inst.dimId].planets);
  host.message(c, '{"t":"ls","d":"featherhold_ic"}');
  assert.ok(MM.DIM_BY_ID[p.inst.dimId].planets[0].dim === 'suburbia', 'no Dimension Drive yet');
  Object.assign(p.prog.up, { drive: 1 }); host.restat(p); host.time += 20;
  host.message(c, '{"t":"ls","d":"fedearth"}');
  assert.ok(MM.DIM_BY_ID[p.inst.dimId].planets[0].dim === 'suburbia', 'another timeline needs the Quantum Drive');
  host.message(c, '{"t":"ls","d":"featherhold_ic"}');
  const S = MM.DIM_BY_ID[p.inst.dimId];
  assert.strictEqual(S.planets[0].dim, 'featherhold_ic', 'in space by the parallel Bird World');
  const P = S.planets[0];
  p.x = P.x; p.y = P.y + P.r; p.z = P.z; host.time += 5;
  host.message(c, '{"t":"land","d":"featherhold_ic"}');
  assert.strictEqual(p.inst.dimId, 'featherhold_ic', 'landed');
});

test('ring races: through the first ring to start, every ring in order, a prize and a record', () => {
  assert.ok(MM.racesIn('shrimpearth').some(R => R.id === 'streetrun'), 'every Earth has the street sprint');
  assert.ok(MM.racesIn('sp_c137').some(R => R.id === 'slalom'), 'the space race is in the sky over Earth');
  const host = new MM.Host();
  const { p } = join(host, 'sidekick', { dim: 'suburbia' });
  const R = MM.RACE_BY_ID.streetrun, at = i => { const q = MM.ringAt(R, i, 'suburbia'); p.x = q.x; p.y = q.y - 1; p.z = q.z; host.raceStep(p); };
  const s0 = p.inv.s || 0;
  at(0);
  assert.strictEqual(p.race && p.race.id, 'streetrun', 'started');
  at(3);
  assert.strictEqual(p.race.next, 1, 'rings count only in order');
  for (let i = 1; i < R.rings.length; i++) { host.time += 2; at(i); }
  assert.strictEqual(p.race, null, 'finished');
  assert.strictEqual(p.inv.s, s0 + R.give.s, 'paid');
  assert.ok(p.prog.best.streetrun > 0, 'a best time');
  // Too slow: the clock runs out.
  at(0); host.time += R.time + 1; at(1);
  assert.strictEqual(p.race, null, 'out of time');
});

test('every world has something to do, and some worlds have their own rules', () => {
  for (const id of MM.WORLD_IDS) {
    const D = MM.DIM_BY_ID[id];
    if (D.variantOf || D.pocket) continue;
    const L = MM.LANDMARKS.filter(l => l.dim === id);
    assert.ok(Object.keys(MM.TASKS).some(t => L.some(l => MM.isAt(l, MM.TASKS[t].at))), id + ' has a task');
  }
  for (const d of ['storytrain', 'toxicworld', 'zigerion']) assert.ok(MM.WORLD_IDS.includes(d), d);
  const host = new MM.Host();
  // Froopyland: nothing hurts much.
  const a = join(host, 'genius', { dim: 'suburbia' }), b = join(host, 'trooper', { dim: 'suburbia' });
  host.travel(a.p, 'froopy', { x: 0, z: 0 }); host.travel(b.p, 'froopy', { x: 2, z: 0 });
  assert.strictEqual(MM.quirkOf(a.p.inst.dimId), 'bouncy');
  a.p.fx.prot = 0; const hp = a.p.hp;
  host.hurtPlayer(a.p.inst, a.p, 20, b.p, 'test');
  assert.strictEqual(hp - a.p.hp, 10);
  // The toxic air hurts, slowly, but never kills.
  const t = join(host, 'genius', { dim: 'suburbia' });
  host.travel(t.p, 'toxicworld', { x: 0, z: 30 });
  t.p.fx.prot = 0; const h0 = t.p.hp;
  run(host, 6);
  assert.ok(t.p.hp < h0 && t.p.hp >= t.p.maxHp * 0.1);
});
