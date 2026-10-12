'use strict';
// Multiverse Mayhem online server. Serves the web game and runs the shared world:
// every dimension, every player, every portal. Clients only send what they want to
// do; the host in sim/host.js decides what actually happens.
//
//   node server/server.js          (port 8790, or set PORT)
//
// Settings (environment variables):
//   PORT            port to listen on (default 8790)
//   SERVER_NAME     name shown to players
//   INSTANCE_CAP    players per dimension copy (default 64, max 128)
//   MAX_PLAYERS     players on the whole server (default 500)
//   MAX_PER_IP      simultaneous connections from one address (default 4)
//   CONNECT_RATE    new connections per minute from one address (default 20)
//   BOTS            bot players that keep the world lively (default 6, 0 to turn off)
//   ALLOWED_ORIGINS comma-separated web origins allowed to connect (default: any)
//   TRUST_PROXY     set to 1 behind a proxy (Render, Fly, nginx) to read X-Forwarded-For
//   SAVE_FILE       where character progress is kept (default server/data/saves.json)
//   MAX_SAVES       most save tokens kept; the least recently played are dropped (default 100000)

const fs = require('fs');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'shared/rules.js'));
require(path.join(ROOT, 'shared/world.js'));
require(path.join(ROOT, 'shared/protocol.js'));
require(path.join(ROOT, 'sim/host.js'));
const MM = require(path.join(ROOT, 'sim/bot.js'));

const env = process.env;
const PORT = Number(env.PORT) || 8790;
const NAME = String(env.SERVER_NAME || 'Multiverse Mayhem').slice(0, 40);
const CAP = Math.max(2, Math.min(128, Number(env.INSTANCE_CAP) || MM.INSTANCE_CAP));
const MAX_PLAYERS = Math.max(1, Number(env.MAX_PLAYERS) || 500);
const MAX_PER_IP = Math.max(1, Number(env.MAX_PER_IP) || 4);
const CONNECT_RATE = Math.max(1, Number(env.CONNECT_RATE) || 20);
const BOTS = Math.max(0, Math.min(64, env.BOTS === undefined ? 6 : Number(env.BOTS) || 0));
const ORIGINS = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const TRUST_PROXY = env.TRUST_PROXY === '1';
const SAVE_FILE = env.SAVE_FILE || path.join(__dirname, 'data', 'saves.json');
const MAX_SAVES = Math.max(100, Number(env.MAX_SAVES) || 100000);

MM.INSTANCE_CAP = CAP;

// ---------- Static files ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const PUBLIC_DIRS = ['vendor', 'shared', 'sim', 'js', 'fonts'];
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'SAMEORIGIN',
};
const cache = new Map();
const CACHE = env.NODE_ENV === 'production';   // keep files in memory in production only
function serveFile(req, res) {
  let url;
  try { url = decodeURIComponent((req.url || '/').split('?')[0]); } catch (_) { res.writeHead(400); res.end(); return; }
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  // Only known folders, no dot-files, nothing that climbs out of the game folder.
  const parts = rel.split('/');
  const ok = (rel === 'index.html' || rel === 'version.json' || PUBLIC_DIRS.includes(parts[0])) && parts.every(p => p && !p.startsWith('.')) && !rel.includes('\\');
  const file = path.join(ROOT, path.normalize(rel));
  if (!ok || !file.startsWith(ROOT + path.sep) || !TYPES[path.extname(file)]) { res.writeHead(404, SECURITY_HEADERS); res.end('Not found'); return; }
  const send = data => {
    res.writeHead(200, Object.assign({ 'content-type': TYPES[path.extname(file)], 'cache-control': rel === 'index.html' ? 'no-cache' : 'public, max-age=300' }, SECURITY_HEADERS, hsts(req)));
    res.end(req.method === 'HEAD' ? undefined : data);
  };
  if (CACHE && cache.has(file)) { send(cache.get(file)); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, SECURITY_HEADERS); res.end('Not found'); return; }
    if (CACHE && data.length < 2e6) cache.set(file, data);
    send(data);
  });
}
const hsts = req => (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https') ? { 'strict-transport-security': 'max-age=15552000' } : {};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SECURITY_HEADERS); res.end(); return; }
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/info') {
    const s = host.stats();
    res.writeHead(200, Object.assign({ 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }, SECURITY_HEADERS));
    res.end(JSON.stringify({ game: 'multiverse-mayhem', version: MM.VERSION, name: NAME, cap: CAP, players: s.total, bots: s.bots, dimensions: s.d }));
    return;
  }
  serveFile(req, res);
});
server.headersTimeout = 15000;
server.requestTimeout = 15000;

// ---------- Saved progress ----------
// One JSON file: { token: { at: last played (ms), chars: { archetype: progress } } }.
// Tokens are 128-bit random secrets that only the player's browser knows.
let saves = {};
try { saves = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8')) || {}; } catch (_) { saves = {}; }
let savesDirty = false;
const store = {
  load(tok, arch) { const r = saves[tok]; return r && r.chars ? r.chars[arch] || null : null; },
  save(tok, arch, prog) {
    const r = saves[tok] || (saves[tok] = { at: 0, chars: {} });
    r.at = Date.now();
    r.chars[arch] = JSON.parse(JSON.stringify(prog));
    savesDirty = true;
  },
};
function flushSaves() {
  if (!savesDirty) return;
  savesDirty = false;
  const keys = Object.keys(saves);
  if (keys.length > MAX_SAVES) {
    keys.sort((a, b) => saves[a].at - saves[b].at);
    for (const k of keys.slice(0, keys.length - MAX_SAVES)) delete saves[k];
  }
  try {
    fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
    const tmp = SAVE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(saves));
    fs.renameSync(tmp, SAVE_FILE);    // atomic: a crash never leaves half a file
  } catch (e) { console.error('Could not write saves:', e.message); }
}
setInterval(flushSaves, 20000);

// ---------- The world ----------
const host = new MM.Host({ name: NAME, cap: CAP, maxPlayers: MAX_PLAYERS + BOTS, store, newToken: () => require('crypto').randomBytes(16).toString('hex'),
  log: s => console.log(new Date().toISOString().slice(11, 19), s) });

// Bots join through the same front door as everyone else.
const bots = [];
for (let i = 0; i < BOTS; i++) {
  let bot;
  const conn = { send: s => bot && bot.onMessage(s), close() { if (bot) bot.closed = true; } };
  host.connect(conn, { bot: true });
  bot = new MM.Bot(s => host.message(conn, s), { dim: MM.WORLD_IDS[i % MM.WORLD_IDS.length], chatty: 0.25 });
  bots.push(bot);
}

// Fixed-rate loop that catches up if the process stalls (capped so it never spirals).
let last = process.hrtime.bigint(), acc = 0;
setInterval(() => {
  const t = process.hrtime.bigint();
  acc = Math.min(acc + Number(t - last) / 1e9, 0.25);
  last = t;
  while (acc >= MM.TICK) {
    acc -= MM.TICK;
    host.update(MM.TICK);
    for (const b of bots) b.update(MM.TICK);
  }
}, 1000 * MM.TICK / 2);

// ---------- Sockets ----------
const perIp = new Map();      // ip -> open connections
const recent = new Map();     // ip -> [timestamps of recent connection attempts]
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || '?';
}
function allowed(req) {
  const ip = clientIp(req);
  if (ORIGINS.length && !ORIGINS.includes(req.headers.origin)) return [false, 403, 'Origin not allowed'];
  if (host.clients.size >= MAX_PLAYERS + BOTS) return [false, 503, 'Server full'];
  if ((perIp.get(ip) || 0) >= MAX_PER_IP) return [false, 429, 'Too many connections from your address'];
  const t = Date.now();
  const list = (recent.get(ip) || []).filter(x => t - x < 60000);
  list.push(t);
  recent.set(ip, list);
  if (list.length > CONNECT_RATE) return [false, 429, 'Slow down'];
  return [true];
}
setInterval(() => { const t = Date.now(); for (const [ip, l] of recent) if (!l.some(x => t - x < 60000)) recent.delete(ip); }, 60000);

const wss = new WebSocketServer({
  server, path: '/ws', maxPayload: MM.MAX_MSG_BYTES, perMessageDeflate: { threshold: 512, concurrencyLimit: 8 },
  verifyClient: (info, cb) => { const [ok, code, why] = allowed(info.req); ok ? cb(true) : cb(false, code, why); },
});

wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  perIp.set(ip, (perIp.get(ip) || 0) + 1);
  const conn = {
    send: s => { if (ws.readyState === 1 && ws.bufferedAmount < 1 << 20) ws.send(s); },
    close: (code, why) => { try { ws.close(code || 1000, String(why || '').slice(0, 100)); } catch (_) {} },
  };
  ws.alive = true;
  host.connect(conn, { ip });
  // Say hello within 10 seconds or get dropped.
  const helloTimer = setTimeout(() => { const c = host.clients.get(conn); if (c && !c.player) conn.close(4001, 'No hello'); }, 10000);
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (data, isBinary) => {
    if (isBinary) { conn.close(4002, 'Text only'); return; }
    host.message(conn, data.toString('utf8'));
  });
  ws.on('close', () => {
    clearTimeout(helloTimer);
    host.close(conn);
    const n = (perIp.get(ip) || 1) - 1;
    if (n <= 0) perIp.delete(ip); else perIp.set(ip, n);
  });
  ws.on('error', () => {});
});

// Drop connections that stopped answering.
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; try { ws.ping(); } catch (_) {} }
}, 15000);

server.listen(PORT, () => {
  console.log(`Multiverse Mayhem server "${NAME}" on http://localhost:${PORT}`);
  console.log(`  ${CAP} players per dimension copy, ${MAX_PLAYERS} max, ${BOTS} bots, ${MAX_PER_IP} connections per address`);
});

function shutdown() { host.saveAll(); flushSaves(); server.close(); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
