// Connections. Online play talks to server/server.js over a WebSocket. Offline play
// runs the very same host (sim/host.js) inside the page with bots, linked in memory.
(function () {
  'use strict';
  const C = window.MMC;

  // Turn whatever the player typed ("myserver.com", "1.2.3.4:8790", "wss://...") into a socket URL.
  C.socketUrl = function (addr) {
    addr = (addr || '').trim();
    if (!addr) return null;
    if (/^wss?:\/\//i.test(addr)) return addr;
    if (/^https?:\/\//i.test(addr)) return addr.replace(/^http/i, 'ws').replace(/\/?$/, '') + '/ws';
    const secure = location.protocol === 'https:' || !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(addr);
    return (secure ? 'wss://' : 'ws://') + addr.replace(/\/+$/, '') + '/ws';
  };

  C.connectOnline = function (url, h) {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { setTimeout(() => h.close('Could not connect: ' + e.message), 0); return { send() {}, close() {}, pump() {} }; }
    let open = false, closed = false;
    ws.onopen = () => { open = true; h.open(); };
    ws.onmessage = ev => { if (typeof ev.data !== 'string' || ev.data.length > 1 << 20) return; let m; try { m = JSON.parse(ev.data); } catch (_) { return; } h.message(m); };
    ws.onclose = ev => { if (closed) return; closed = true; h.close(open ? (ev.reason || 'Disconnected from the server') : 'Could not reach the server'); };
    ws.onerror = () => {};
    return {
      kind: 'online',
      send(o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); },
      close() { closed = true; try { ws.close(); } catch (_) {} },
      pump() {},
    };
  };

  C.connectOffline = function (h, opts) {
    opts = opts || {};
    const host = new MM.Host({ name: 'Offline multiverse', cap: MM.INSTANCE_CAP, store: opts.store,
      newToken: () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('') });
    const bots = [];
    const botCount = opts.bots === undefined ? 18 : opts.bots;
    for (let i = 0; i < botCount; i++) {
      let bot;
      const conn = { send: s => bot && bot.onMessage(s), close() { if (bot) bot.closed = true; } };
      host.connect(conn, { bot: true });
      bot = new MM.Bot(s => host.message(conn, s), { dim: i < 8 ? 'suburbia' : MM.WORLD_IDS[i % MM.WORLD_IDS.length], chatty: 0.5 });
      bot.conn = conn;
      bots.push(bot);
    }
    // Let the bots spread out before you arrive.
    for (let i = 0; i < 90; i++) { host.update(MM.TICK); for (const b of bots) b.update(MM.TICK); }
    let closed = false;
    const me = {
      send: s => {
        if (closed) return;
        let m;
        try { m = JSON.parse(s); } catch (_) { return; }
        // The host ignores send errors (a dead socket must not stop the world), so report ours here.
        try { h.message(m); } catch (e) { console.error(e); }
      },
      close() { closed = true; },
    };
    host.connect(me, {});
    let acc = 0;
    setTimeout(() => h.open(), 0);
    return {
      kind: 'offline', host,
      send(o) { if (!closed) host.message(me, JSON.stringify(o)); },
      close() { closed = true; host.saveAll(); host.close(me); },
      // Run the host at its fixed rate from the game loop.
      pump(dt) {
        if (closed) return;
        acc = Math.min(acc + dt, 0.25);
        while (acc >= MM.TICK) {
          acc -= MM.TICK;
          host.update(MM.TICK);
          for (const b of bots) b.update(MM.TICK);
        }
      },
    };
  };
})();
