'use strict';
// Load test: connects N bot players to a running server over real WebSockets and
// reports what one player receives per second.
//
//   node scripts/loadtest.js [count=64] [url=ws://localhost:8790/ws] [seconds=30] [dim=suburbia]
//
// The server limits connections per address (MAX_PER_IP), so start it with a
// higher limit for this test, e.g.  MAX_PER_IP=200 CONNECT_RATE=200 node server/server.js

const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'shared/rules.js'));
require(path.join(ROOT, 'shared/world.js'));
require(path.join(ROOT, 'shared/layouts.js'));
require(path.join(ROOT, 'shared/interiors.js'));
require(path.join(ROOT, 'shared/portals.js'));
require(path.join(ROOT, 'shared/curios.js'));
require(path.join(ROOT, 'shared/races.js'));
require(path.join(ROOT, 'shared/protocol.js'));
require(path.join(ROOT, 'sim/host.js'));
const MM = require(path.join(ROOT, 'sim/bot.js'));
const WebSocket = require(path.join(ROOT, 'server/node_modules/ws'));

const N = Number(process.argv[2]) || 64;
const URL = process.argv[3] || 'ws://localhost:8790/ws';
const SECONDS = Number(process.argv[4]) || 30;
const DIM = process.argv[5] || 'suburbia';

let bytes = 0, msgs = 0, kicked = 0, closed = 0;
const bots = [];
for (let i = 0; i < N; i++) {
  const ws = new WebSocket(URL);
  let bot = null;
  ws.on('open', () => { bot = new MM.Bot(s => ws.readyState === 1 && ws.send(s), { dim: DIM, chatty: 0.05 }); bots.push(bot); });
  ws.on('message', data => {
    const s = data.toString();
    if (i === 0) { bytes += s.length; msgs++; }
    if (bot) bot.onMessage(s);
    if (s.startsWith('{"t":"err"')) kicked++;
  });
  ws.on('close', () => { closed++; });
  ws.on('error', e => console.error('socket error', e.message));
}
setInterval(() => { for (const b of bots) b.update(MM.TICK); }, 1000 * MM.TICK);
setTimeout(() => {
  console.log(`${bots.length}/${N} bots connected to ${URL}, ${closed} closed, ${kicked} kicked by checks`);
  console.log(`one player received ${(bytes / SECONDS / 1024).toFixed(1)} KB/s in ${(msgs / SECONDS).toFixed(1)} messages/s (before compression)`);
  process.exit(0);
}, SECONDS * 1000);
