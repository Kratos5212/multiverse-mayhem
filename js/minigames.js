// Multiverse Mayhem: the mini-games you play at a spot. Fishing (cast, wait for the bite,
// reel it in), dancing (hit the notes to the beat, judged by whoever runs the stage) and
// Roy: A Life Well Lived (Blips and Chitz). Each runs here in the player's own window and
// reports a score to the server (sim/host.js onMinigame), which hands out what it is worth.
(function () {
  'use strict';
  const C = window.MMC || (window.MMC = {});
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    }
    for (const k of kids) if (k !== null && k !== undefined) e.append(k);
    return e;
  };
  let open = null;
  C.minigameOpen = () => !!open;
  function frame(title, sub) {
    close();
    const box = el('div', { class: 'mg' }, el('div', { class: 'mgHead' }, el('b', { text: title }), el('button', { class: 'btn', 'aria-label': 'Quit', onclick: () => close(true) }, '✕')));
    if (sub) box.append(el('p', { class: 'note', text: sub }));
    document.body.append(box);
    open = { box, keys: null, raf: 0, quit: null };
    return open;
  }
  function close(quit) {
    if (!open) return;
    const o = open; open = null;
    cancelAnimationFrame(o.raf);
    if (o.keys) window.removeEventListener('keydown', o.keys, true);
    if (o.up) window.removeEventListener('keyup', o.up, true);
    o.box.remove();
    if (quit && o.quit) o.quit();
  }
  C.minigameClose = () => close(true);

  // ---------- Audio: a little synth for the dance game ----------
  let ac = null;
  const audio = () => { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { ac = null; } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  function blip(f, t, d, type, vol) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function kick(t) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.22);
  }

  // ---------- Fishing ----------
  // 1) Cast: stop the swinging power bar. 2) Wait for a bite and strike in time. 3) Reel: keep
  // the fish inside your green zone (hold to push it right) until the line is full.
  C.playFishing = function (where, done) {
    const o = frame('Fishing', 'Space or tap: cast, strike, and hold to reel.');
    const cv = el('canvas', { width: 420, height: 120, class: 'mgCanvas' }), msg = el('p', { class: 'mgMsg', text: 'Cast! Stop the bar near the top.' });
    o.box.append(cv, msg);
    const g = cv.getContext('2d');
    let phase = 'cast', t0 = performance.now(), power = 0, biteAt = 0, strikeBy = 0, hold = false, zone = 0.3, zv = 0, fish = 0.5, fv = 0, prog = 0.25, endAt = 0;
    const press = down => {
      if (!down) { hold = false; return; }
      hold = true;
      const now = performance.now();
      if (phase === 'cast') { phase = 'wait'; biteAt = now + 1500 + Math.random() * 3500; msg.textContent = 'Waiting for a bite...'; blip(660, audio() ? ac.currentTime : 0, 0.15, 'sine'); }
      else if (phase === 'wait') { phase = 'miss'; msg.textContent = 'Too early, you scared it off.'; endAt = now + 1200; }
      else if (phase === 'bite') { phase = 'reel'; endAt = now + 9000; msg.textContent = 'Reel it in! Keep the fish in the green.'; }
    };
    o.keys = e => { if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(true); } else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } };
    o.up = e => { if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') press(false); };
    window.addEventListener('keydown', o.keys, true); window.addEventListener('keyup', o.up, true);
    cv.addEventListener('pointerdown', () => press(true)); cv.addEventListener('pointerup', () => press(false)); cv.addEventListener('pointerleave', () => press(false));
    let last = performance.now();
    const step = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      g.clearRect(0, 0, 420, 120);
      if (phase === 'cast') {
        power = 0.5 - Math.cos((now - t0) / 380) * 0.5;
        g.fillStyle = '#20283a'; g.fillRect(20, 50, 380, 24);
        g.fillStyle = power > 0.85 ? '#7aff6a' : power > 0.5 ? '#ffd84d' : '#ff6a5a'; g.fillRect(20, 50, 380 * power, 24);
      } else if (phase === 'wait' || phase === 'bite') {
        const bob = Math.sin(now / 300) * 4 + (phase === 'bite' ? Math.sin(now / 40) * 8 : 0);
        g.fillStyle = '#2a6ab0'; g.fillRect(0, 70, 420, 50);
        g.strokeStyle = '#ddd'; g.beginPath(); g.moveTo(40, 0); g.lineTo(210, 66 + bob); g.stroke();
        g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(210, 68 + bob, 8, 0, 7); g.fill();
        if (phase === 'wait' && now > biteAt) { phase = 'bite'; strikeBy = now + 900; msg.textContent = 'BITE! Strike now!'; blip(880, ac ? ac.currentTime : 0, 0.1); blip(1100, ac ? ac.currentTime + 0.1 : 0, 0.1); }
        if (phase === 'bite' && now > strikeBy) { phase = 'miss'; msg.textContent = 'It got away.'; endAt = now + 1200; }
      } else if (phase === 'reel') {
        // The fish darts about; your zone falls back unless you hold.
        fv += (Math.random() - 0.5) * 6 * dt * (1 + power); fv *= 0.97; fish += fv * dt * 4;
        if (fish < 0.05 || fish > 0.95) { fv = -fv; fish = Math.max(0.05, Math.min(0.95, fish)); }
        zv += (hold ? 2.4 : -2.0) * dt; zv *= 0.9; zone += zv * dt * 3; if (zone < 0) { zone = 0; zv = 0; } if (zone > 0.75) { zone = 0.75; zv = 0; }
        const inZone = fish > zone && fish < zone + 0.25;
        prog += (inZone ? 0.22 : -0.14) * dt;
        g.fillStyle = '#20283a'; g.fillRect(20, 40, 380, 30);
        g.fillStyle = 'rgba(122,255,106,0.55)'; g.fillRect(20 + zone * 380, 40, 0.25 * 380, 30);
        g.fillStyle = '#ffd84d'; g.beginPath(); g.ellipse(20 + fish * 380, 55, 10, 6, 0, 0, 7); g.fill();
        g.fillStyle = '#5ab0f0'; g.fillRect(20, 84, 380 * Math.max(0, Math.min(1, prog)), 10);
        if (prog >= 1) {
          const left = Math.max(0, (endAt - now) / 9000);
          const size = Math.max(0, Math.min(3, Math.round(power * 1.6 + left * 1.8 + Math.random() * 0.8)));
          close(); done(size); return;
        }
        if (prog <= 0 || now > endAt) { phase = 'miss'; msg.textContent = 'The line went slack. It got away.'; endAt = now + 1200; }
      } else if (phase === 'miss' && now > endAt) { close(true); return; }
      o.raf = requestAnimationFrame(step);
    };
    o.raf = requestAnimationFrame(step);
  };

  // ---------- Dancing ----------
  // Four lanes, notes falling to the beat for half a minute. Arrow keys or D F J K, or tap.
  C.playDance = function (title, done, onBeat) {
    const o = frame(title, 'Arrow keys or D F J K (or tap the lanes) as the notes reach the line.');
    const W = 360, H = 300, cv = el('canvas', { width: W, height: H, class: 'mgCanvas tall' }), msg = el('p', { class: 'mgMsg', text: 'Get ready...' });
    o.box.append(cv, msg);
    const g = cv.getContext('2d'), bpm = 104 + Math.floor(Math.random() * 24), beat = 60 / bpm, a = audio();
    const start = (a ? a.currentTime : performance.now() / 1000) + 2, len = 30;
    const clock = () => (a ? a.currentTime : performance.now() / 1000) - start;
    // A pattern: one note a beat, now and then two, a run of eighths in the busy parts.
    const notes = [];
    for (let b = 0; b * beat < len; b++) {
      const busy = Math.floor(b / 16) % 2 === 1;
      notes.push({ t: b * beat, lane: (b * 7 + Math.floor(b / 3)) % 4, hit: 0 });
      if (busy && b % 2 === 0) notes.push({ t: b * beat + beat / 2, lane: (b * 3 + 1) % 4, hit: 0 });
      if (b % 8 === 7) notes.push({ t: b * beat, lane: (b * 7 + Math.floor(b / 3) + 2) % 4, hit: 0 });
    }
    // The song: kick on the beat, a bass line, a lead every other bar.
    if (a) for (let b = 0; b * beat < len; b++) {
      const t = start + b * beat;
      kick(t);
      blip([55, 55, 65.4, 49][Math.floor(b / 4) % 4], t + beat / 2, beat * 0.4, 'sawtooth', 0.05);
      if (Math.floor(b / 4) % 2) blip([440, 523, 587, 659, 587, 523, 494, 523][b % 8], t, beat * 0.3, 'square', 0.03);
    }
    const LANES = ['←', '↓', '↑', '→'], keyLane = { ArrowLeft: 0, KeyD: 0, ArrowDown: 1, KeyF: 1, ArrowUp: 2, KeyJ: 2, ArrowRight: 3, KeyK: 3 };
    let perfect = 0, good = 0, miss = 0, flash = [0, 0, 0, 0], lastBeat = -1;
    const hit = lane => {
      const t = clock(); let best = null, bd = 0.2;
      for (const n of notes) if (!n.hit && n.lane === lane && Math.abs(n.t - t) < bd) { best = n; bd = Math.abs(n.t - t); }
      if (!best) return;
      best.hit = bd < 0.08 ? 2 : 1;
      if (best.hit === 2) perfect++; else good++;
      flash[lane] = 1;
    };
    o.keys = e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (keyLane[e.code] !== undefined) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) hit(keyLane[e.code]); }
    };
    window.addEventListener('keydown', o.keys, true);
    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); hit(Math.max(0, Math.min(3, Math.floor((e.clientX - r.left) / r.width * 4)))); });
    const step = () => {
      const t = clock(), lw = W / 4, lineY = H - 40, speed = 220;
      g.fillStyle = '#10142a'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        flash[i] *= 0.85;
        g.fillStyle = `rgba(95,248,255,${0.06 + flash[i] * 0.35})`; g.fillRect(i * lw + 2, 0, lw - 4, H);
        g.fillStyle = '#5ff8ff'; g.font = '22px sans-serif'; g.textAlign = 'center'; g.fillText(LANES[i], i * lw + lw / 2, lineY + 30);
      }
      g.fillStyle = '#ffd84d'; g.fillRect(0, lineY, W, 3);
      for (const n of notes) {
        if (n.hit) continue;
        const y = lineY - (n.t - t) * speed;
        if (y < -20) continue;
        if (n.t - t < -0.2) { n.hit = -1; miss++; continue; }
        if (y > H) continue;
        g.fillStyle = ['#ff6a8a', '#7aff6a', '#5ab0ff', '#ffd84d'][n.lane];
        g.fillRect(n.lane * lw + 10, y - 8, lw - 20, 16);
      }
      const b = Math.floor(t / beat);
      if (b !== lastBeat && t > 0) { lastBeat = b; if (onBeat) onBeat(b); }
      const total = notes.length, score = Math.round((perfect + good * 0.6) / total * 100);
      msg.textContent = t < 0 ? 'Get ready... ' + Math.ceil(-t) : 'Perfect ' + perfect + ' · Good ' + good + ' · Miss ' + miss + ' · ' + score + '%';
      if (t > len + 0.6) { close(); done(Math.max(0, Math.min(100, score))); return; }
      o.raf = requestAnimationFrame(step);
    };
    o.raf = requestAnimationFrame(step);
  };

  // ---------- Roy: A Life Well Lived ----------
  // The Blips and Chitz game from "Mortynight Run": a whole life in a few choices.
  const ROY = [
    ['You are born. Your name is Roy.', [['Cry a lot', 0, 'Strong lungs. Good start.'], ['Sleep through the night', 2, 'Your parents love you a little extra.']]],
    ['High school. Football tryouts.', [['Make the team', 4, 'Quarterback! Then a knee injury. Classic Roy.'], ['Join the chess club', 2, 'You learn patience. You will need it.']]],
    ['You need a job.', [['Sell carpet', 6, 'Carpet. You are good at carpet. Roy lives for carpet.'], ['Go to college', 3, 'A degree in something. You end up selling carpet anyway.'], ['Become a cop', -4, 'It is a tough beat.']]],
    ['A woman at the carpet store smiles at you.', [['Ask her out', 5, 'You marry her. It is nice. Mostly.'], ['Stay focused on carpet', 1, 'The carpet does not love you back.']]],
    ['Your doctor has news.', [['Get the treatment', 6, 'You beat it. You are a fighter, Roy.'], ['Ignore it', -12, 'That was a mistake, Roy.']]],
    ['Retirement.', [['Move to the lake', 7, 'Fishing. Quiet. Good years.'], ['Keep selling carpet', 3, 'They give you a plaque.'], ['Write a memoir', 4, 'Nobody reads it. You loved writing it.']]],
  ];
  C.playRoy = function (done) {
    const o = frame('Roy: A Life Well Lived', 'Live a whole life. Then take off the headset.');
    const story = el('div', { class: 'mgStory' }), opts = el('div', { class: 'chips' });
    o.box.append(story, opts);
    let i = 0, years = 50 + Math.floor(Math.random() * 10);
    const line = text => story.append(el('p', { text }));
    const next = () => {
      opts.textContent = '';
      if (i >= ROY.length) {
        years = Math.max(1, Math.min(100, years));
        line('Roy dies at ' + years + '. You take off the helmet. "Roy! Roy! Did you have fun?"');
        opts.append(el('button', { class: 'btn go', onclick: () => { close(); done(years); } }, 'Take off the helmet'));
        return;
      }
      const [q, choices] = ROY[i++];
      line(q);
      for (const [label, y, out] of choices) opts.append(el('button', { class: 'btn', onclick: () => { years += y + Math.floor(Math.random() * 4); line('› ' + label + '. ' + out); next(); } }, label));
      story.scrollTop = story.scrollHeight;
    };
    o.keys = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } };
    window.addEventListener('keydown', o.keys, true);
    next();
  };
})();
