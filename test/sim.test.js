// Run with: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
require('../shared/rules.js');
require('../shared/world.js');
require('../shared/layouts.js');
require('../shared/interiors.js');
require('../shared/curios.js');
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

test("Rick's garage: walk in, use the Plumbus, go down to the lab, build at the workbench", () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick');
  near(host, c, p, 'garage');
  run(host, 1.2);
  host.message(c, '{"t":"door","l":"garage"}');
  assert.strictEqual(p.inst.dimId, 'rickgarage');
  // Kiosks and portals can't target the garage from outside.
  assert.ok(MM.DIM_BY_ID.rickgarage.hidden && !MM.WORLD_IDS.includes('rickgarage'));
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

test('Earth: highways between regions, the President is guarded, and freezing time brings a Time Cop', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'genius', { dim: 'suburbia' });
  near(host, c, p, 'hw_suburbia_dc'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"hw_suburbia_dc"}');
  assert.strictEqual(p.inst.dimId, 'dc');
  const pres = [...p.inst.npcs.values()].find(n => n.type === 'president');
  assert.ok(pres && Math.hypot(pres.x, pres.z + 38) < 8, 'the President is at the White House');
  p.inst.hurtNpc(pres, 5, p);
  assert.ok([...p.inst.npcs.values()].some(n => n.T.guard && n !== pres && n.angry === p.id), 'his guards come for you');
  // Alternate Earths share the street plan and the landmarks.
  assert.ok(MM.LANDMARK_BY_ID.shrimpearth_home && MM.isAt(MM.LANDMARK_BY_ID.shrimpearth_home, 'home'));
  // A Time Crystal stops time... and a Time Cop turns up.
  p.inv.timecrystal = 1;
  host.message(c, '{"t":"g","g":"timecrystal","dx":0,"dy":0,"dz":1}');
  assert.strictEqual(p.inv.timecrystal, 0);
  run(host, 3);
  assert.ok([...p.inst.npcs.values()].some(n => n.type === 'timecop' && n.angry === p.id));
});

test('Smith house: in through the front door, watch TV on the couch, out again; inside walls block', () => {
  const host = new MM.Host();
  const { c, p } = join(host, 'sidekick', { dim: 'suburbia' });
  near(host, c, p, 'home'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"home"}');
  assert.strictEqual(p.inst.dimId, 'smithhouse');
  near(host, c, p, 'smithtv'); run(host, 1.2);
  host.message(c, '{"t":"use","l":"smithtv","task":"tv"}');
  assert.ok(p.prog.tasks.tv > 0, 'watched TV');
  const [x] = MM.collideWalls('smithhouse', 0.43, 1, 0.4);
  assert.ok(Math.abs(x - 0.43) >= 0.5, 'the wall between the living and dining rooms pushes you out');
  assert.deepStrictEqual(MM.collideWalls('smithhouse', 0.43, 3.0, 0.4), [0.43, 3.0], 'the doorway is open');
  near(host, c, p, 'smithexit'); run(host, 1.2);
  host.message(c, '{"t":"door","l":"smithexit"}');
  assert.strictEqual(p.inst.dimId, 'suburbia');
  assert.ok(MM.LANDMARK_BY_ID.shrimpearth_home, 'alternate Earths keep their Smith house');
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
    assert.ok(MM.DIM_BY_ID[I.id].walls.length > 0);
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
