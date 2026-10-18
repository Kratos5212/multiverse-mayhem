// Sound: every effect is synthesized with Web Audio, so there are no sound files.
(function () {
  'use strict';
  const C = window.MMC;
  let ctx = null, master = null, noiseBuf = null;
  let volume = 0.6;

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  C.audioUnlock = function () { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
  C.setVolume = function (v) { volume = v; if (master) master.gain.value = v; };
  C.audioCtx = function () { init(); return ctx; };   // (voice chat plays through it, positioned in 3D)

  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, dur, vol, at) {
    const t = ctx.currentTime + (at || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, f0, f1, q, type) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g, t, 0.01, vol, dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  // vol: 0..1, already scaled for distance by the caller.
  C.sfx = function (name, vol) {
    if (!ctx || volume <= 0) return;
    const v = vol === undefined ? 1 : vol;
    if (v < 0.02) return;
    switch (name) {
      case 'plasma': tone('sawtooth', 1400, 180, 0.16, 0.12 * v); tone('sine', 900, 300, 0.12, 0.1 * v); break;
      case 'blaster': tone('square', 900, 220, 0.12, 0.08 * v); break;
      case 'toy': tone('triangle', 1600, 1200, 0.08, 0.1 * v); tone('triangle', 1900, 1500, 0.06, 0.08 * v, 0.07); break;
      case 'shrink': tone('sine', 300, 1800, 0.3, 0.12 * v); break;
      case 'turret': tone('square', 600, 200, 0.07, 0.05 * v); break;
      case 'melee': noise(0.12, 0.25 * v, 2000, 400, 1.2); break;
      case 'hit': noise(0.06, 0.25 * v, 3000, 1500, 2); tone('square', 220, 110, 0.06, 0.06 * v); break;
      case 'hurt': tone('sawtooth', 300, 120, 0.2, 0.12 * v); break;
      case 'boom': noise(0.9, 0.7 * v, 900, 60, 0.7, 'lowpass'); tone('sine', 110, 35, 0.6, 0.5 * v); break;
      case 'portal': noise(0.9, 0.25 * v, 300, 2400, 4); tone('sine', 200, 900, 0.8, 0.12 * v); break;
      case 'warp': noise(0.6, 0.3 * v, 2400, 200, 3); tone('sine', 1200, 150, 0.6, 0.15 * v); break;
      case 'pickup': tone('sine', 880, 880, 0.06, 0.1 * v); tone('sine', 1320, 1320, 0.1, 0.1 * v, 0.06); break;
      case 'craft': tone('triangle', 520, 520, 0.08, 0.12 * v); tone('triangle', 660, 660, 0.08, 0.12 * v, 0.08); tone('triangle', 880, 880, 0.15, 0.12 * v, 0.16); break;
      case 'jump': tone('sine', 300, 600, 0.12, 0.06 * v); break;
      case 'die': tone('sawtooth', 500, 60, 0.8, 0.15 * v); break;
      case 'kill': tone('square', 660, 660, 0.08, 0.08 * v); tone('square', 990, 990, 0.12, 0.08 * v, 0.08); break;
      case 'ability': tone('sine', 400, 1200, 0.25, 0.14 * v); noise(0.3, 0.1 * v, 800, 3000, 2); break;
      case 'cheer': for (let i = 0; i < 4; i++) tone('sine', 660 * Math.pow(1.26, i), 660 * Math.pow(1.26, i), 0.1, 0.1 * v, i * 0.07); break;
      case 'chat': tone('sine', 1200, 1200, 0.04, 0.05 * v); break;
      case 'dodge': tone('triangle', 900, 1800, 0.1, 0.08 * v); break;
      case 'bite': noise(0.1, 0.3 * v, 600, 200, 2); break;
      case 'click': tone('sine', 700, 700, 0.03, 0.06 * v); break;
    }
  };
})();
