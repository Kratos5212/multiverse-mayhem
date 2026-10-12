// Run with: node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
require('../shared/rules.js');
require('../shared/world.js');
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
  host.message(c, JSON.stringify(Object.assign({ t: 'hello', v: MM.VERSION, name: 'Tester', look: MM.defaultLook(), arch }, extra)));
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
  for (const d of MM.DIM_IDS) assert.ok(MM.genProps(d).length > 40, d + ' has props');
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
  for (let i = 0; i < 9; i++) join(host, 'joe');
  const sizes = [...host.instances.values()].filter(i => i.dimId === 'suburbia').map(i => i.players.size);
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
  for (const p of host.players.values()) { kills += p.kills; chaos += p.chaos; }
  console.log(`  64 bots, 60 s of game in ${ms} ms; kills ${kills}, chaos ${chaos}, instances ${host.instances.size}, kicked ${kicked}`);
  assert.strictEqual(kicked, 0, 'no bot tripped the cheat checks');
  assert.ok(chaos > 0);
});
