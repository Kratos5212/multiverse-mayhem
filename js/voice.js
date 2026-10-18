// Multiverse Mayhem: voice. Proximity voice chat between players (WebRTC, peer to peer,
// with the game server passing the handshake along), heard from where each player stands;
// and voice commands ("Garage, lock the doors", "Morty, initiate car transformation sequence",
// "Car, keep Summer safe"), turned into the same things the buttons do.
(function () {
  'use strict';
  const C = window.MMC;
  const V = C.voice = {};
  const NEAR = 40, FAR = 55;                       // connect inside 40 m, drop beyond 55 m
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  let api = null, stream = null, mode = 'off', talking = false, volume = 1;
  const peers = new Map();                         // player id -> { pc, el, src, panner, gain, an, buf, level }

  V.supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);
  // api: { send(msg), myId(), others() -> [{ id, x, y, z, voice }], listener() -> { x, y, z, yaw }, toast(text) }
  V.init = function (a) { api = a; };
  V.mode = () => mode;
  V.isTalking = () => mode === 'open' || talking;
  V.setVolume = v => { volume = v; for (const P of peers.values()) if (P.gain) P.gain.gain.value = v; };

  // ---------- Voice chat ----------
  // mode: 'off', 'ptt' (hold to talk) or 'open' (always on).
  V.setMode = async function (m) {
    if (m !== 'off' && !V.supported()) { api.toast('Voice chat needs a browser with a microphone and WebRTC.'); return false; }
    if (m !== 'off' && !stream) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { api.toast('No microphone: voice chat stays off. (Allow the microphone for this site or app.)'); return false; }
    }
    mode = m;
    if (m === 'off') { for (const id of [...peers.keys()]) close(id); if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; } }
    applyMic();
    api.send({ t: 'vc', on: m !== 'off' });
    return true;
  };
  V.pushToTalk = function (on) { talking = !!on; applyMic(); };
  function applyMic() { if (stream) for (const t of stream.getAudioTracks()) t.enabled = mode === 'open' || (mode === 'ptt' && talking); }

  function open(id, initiator) {
    if (peers.has(id)) return peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const P = { pc, level: 0 };
    peers.set(id, P);
    if (stream) for (const t of stream.getTracks()) pc.addTrack(t, stream);
    pc.onicecandidate = e => { if (e.candidate) api.send({ t: 'rtc', to: id, d: { ice: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate } }); };
    pc.ontrack = e => attach(id, P, e.streams[0] || new MediaStream([e.track]));
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') close(id); };
    if (initiator) pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => api.send({ t: 'rtc', to: id, d: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } } })).catch(() => close(id));
    return P;
  }
  // Their voice, from where they stand: a panner in the game's own audio graph. (A muted
  // <audio> element keeps the stream flowing; some browsers need it.)
  function attach(id, P, ms) {
    const ctx = C.audioCtx && C.audioCtx();
    P.el = new Audio(); P.el.srcObject = ms; P.el.muted = true; P.el.play().catch(() => {});
    if (!ctx) { P.el.muted = false; return; }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    P.src = ctx.createMediaStreamSource(ms);
    P.panner = ctx.createPanner(); Object.assign(P.panner, { panningModel: 'HRTF', distanceModel: 'linear', refDistance: 3, maxDistance: NEAR, rolloffFactor: 1 });
    P.gain = ctx.createGain(); P.gain.gain.value = volume;
    P.an = ctx.createAnalyser(); P.an.fftSize = 512; P.buf = new Uint8Array(P.an.fftSize);
    P.src.connect(P.an); P.src.connect(P.panner); P.panner.connect(P.gain); P.gain.connect(ctx.destination);
  }
  function close(id) {
    const P = peers.get(id);
    if (!P) return;
    peers.delete(id);
    try { P.pc.close(); } catch (_) {}
    try { if (P.src) P.src.disconnect(); if (P.gain) P.gain.disconnect(); } catch (_) {}
    if (P.el) { P.el.srcObject = null; }
  }
  // The handshake, passed along by the server.
  V.onSignal = async function (m) {
    if (mode === 'off') return;
    const d = m.d || {};
    let P = peers.get(m.from);
    try {
      if (d.sdp && d.sdp.type === 'offer') {
        P = P || open(m.from, false);
        await P.pc.setRemoteDescription(d.sdp);
        const a = await P.pc.createAnswer(); await P.pc.setLocalDescription(a);
        api.send({ t: 'rtc', to: m.from, d: { sdp: { type: P.pc.localDescription.type, sdp: P.pc.localDescription.sdp } } });
      } else if (d.sdp && d.sdp.type === 'answer' && P) await P.pc.setRemoteDescription(d.sdp);
      else if (d.ice && P) await P.pc.addIceCandidate(d.ice);
    } catch (_) { close(m.from); }
  };
  V.forget = id => close(id);
  V.reset = () => { for (const id of [...peers.keys()]) close(id); };
  // Every frame: connect to whoever is near (the lower id calls), drop whoever is far,
  // move the panners and the listener, and see who is speaking.
  V.tick = function () {
    if (mode === 'off' || !api) return;
    const me = api.myId(), L = api.listener(), ctx = C.audioCtx && C.audioCtx(), seen = new Set();
    for (const o of api.others()) {
      if (!o.voice) continue;
      const d = Math.hypot(o.x - L.x, o.z - L.z);
      if (d < NEAR && !peers.has(o.id) && me < o.id) open(o.id, true);
      if (peers.has(o.id)) {
        seen.add(o.id);
        if (d > FAR) { close(o.id); continue; }
        const P = peers.get(o.id);
        if (P.panner && ctx) { const t = ctx.currentTime; P.panner.positionX.setValueAtTime(o.x, t); P.panner.positionY.setValueAtTime(o.y + 1.6, t); P.panner.positionZ.setValueAtTime(o.z, t); }
        if (P.an) { P.an.getByteTimeDomainData(P.buf); let pk = 0; for (const v of P.buf) pk = Math.max(pk, Math.abs(v - 128)); P.level = Math.max(P.level * 0.92, pk / 128); }   // peak, held a moment
      }
    }
    for (const id of [...peers.keys()]) if (!seen.has(id)) close(id);
    if (ctx && ctx.listener && ctx.listener.positionX) {
      const t = ctx.currentTime, l = ctx.listener;
      l.positionX.setValueAtTime(L.x, t); l.positionY.setValueAtTime(L.y + 1.6, t); l.positionZ.setValueAtTime(L.z, t);
      l.forwardX.setValueAtTime(Math.sin(L.yaw), t); l.forwardY.setValueAtTime(0, t); l.forwardZ.setValueAtTime(Math.cos(L.yaw), t);
      l.upX.setValueAtTime(0, t); l.upY.setValueAtTime(1, t); l.upZ.setValueAtTime(0, t);
    }
  };
  V.speaking = id => { const P = peers.get(id); return !!(P && P.level > 0.05); };
  V.connected = () => peers.size;
  V.stats = async () => { const out = []; for (const [id, P] of peers) { let rx = 0; (await P.pc.getStats()).forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio') rx += r.bytesReceived; }); out.push({ id, state: P.pc.connectionState, rx, level: +P.level.toFixed(3) }); } return out; };   // (for testing)

  // ---------- Voice commands ----------
  // A command starts with who you are talking to (house, garage, ship, car, Morty, portal...),
  // unless you hold the command key, when anything you say counts.
  const WAKE = /^(hey |ok |okay )?(house|garage|computer|ship|car|cruiser|morty|summer|rick|portal|gun|wubba|pickle|tiny|remote)\b/;
  V.parse = function (raw, held) {
    const t = String(raw || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || (!held && !WAKE.test(t))) return null;
    const has = (...w) => w.some(x => t.includes(x));
    const house = id => ({ house: id });
    // The house (and its garage).
    if (has('lock the doors', 'lock doors', 'lock the door', 'blast doors', 'close the doors', 'doors down', 'lock it down') && !has('lab')) return Object.assign(house('doors'), { label: 'Blast doors' });
    if (has('forcefield', 'force field', 'shield')) return Object.assign(house('shield'), { label: 'Forcefield' });
    if (has('laser grid', 'lock down the garage', 'lockdown', 'lock down')) return Object.assign(house('grid'), { label: 'Laser grid' });
    if (has('turret')) return Object.assign(house('turrets'), { label: 'Turrets' });
    if (has('kill bot', 'killbot', 'robots')) return Object.assign(house('bots'), { label: 'Kill bots' });
    if (has('drone')) return Object.assign(house('drones'), { label: 'Boombox drones' });
    if (has('plant', 'feeding time')) return Object.assign(house('plants'), { label: 'Carnivorous plants' });
    if (has('hologram')) return Object.assign(house('holo'), { label: 'Hologram' });
    if (has('cannon', 'big one', 'energy weapon')) return Object.assign(house('cannon'), { label: 'Large energy weapon' });
    if (has('backup body', 'cloning', 'clone vat')) return Object.assign(house('vat'), { label: 'Cloning vat' });
    if (has('gun stash', 'washing machine', 'stash')) return Object.assign(house('stash'), { label: 'Gun stash' });
    if (has('retract the lab', 'retract lab', 'hide the lab')) return Object.assign(house('lab'), { label: 'Retractable lab' });
    if (has('wardrobe')) return Object.assign(house('wardrobe'), { label: 'Wardrobe' });
    if (has('fungus')) return Object.assign(house('fungus'), { label: 'Fungus clone' });
    const tele = [['downtown', 0], ['d c', 1], ['washington', 1], ['dc', 1], ['area 51', 2], ['area fifty one', 2], ['beach', 3]].find(([w]) => t.includes(w));
    if (has('teleport') && tele) return { house: 'tele', d: tele[1], label: 'Teleport' };
    // The ship (or "the car", as Rick calls his).
    if (has('keep summer safe')) return { kss: 'kill', label: 'Keep Summer safe' };
    if (has("don't kill", 'do not kill', 'dont kill')) return { kss: 'stun', label: 'Don\'t kill anyone' };
    if (has("don't hurt", 'do not hurt', 'dont hurt')) return { kss: 'peace', label: 'Don\'t hurt anyone' };
    if (has('stand down', 'stop keeping')) return { kss: 'off', label: 'Stand down' };
    if (/^(hey )?(ship|car|cruiser)\b/.test(t) || held) {
      if (has('come here', 'come to me', 'pick me up', 'take off', 'lets go', "let's go", 'fly')) return { ship: true, label: 'Ship: come here' };
      if (has('park', 'land', 'stop')) return { ship: false, label: 'Ship: park' };
    }
    // The save-point remote.
    if (has('save point', 'save game', 'save here', 'save it', 'remote save') || /^(hey |ok |okay )?remote,? save\b/.test(t)) return { save: 'save', label: 'Save point' };
    if (has('merge timeline', 'merge the timeline', 'merge them')) return { save: 'merge', label: 'Merge timelines' };
    if (has('load', 'go back to my save', 'reload')) return { save: 'load', label: 'Back to the save point' };
    // Car Morty.
    if (has('car transformation', 'transform into a car', 'turn into a car', 'car sequence')) return { carMorty: true, label: 'Car transformation sequence' };
    // Portals: "portal to the Citadel", "take me to Bird World".
    const m = t.match(/(?:portal|take me|go) to (?:the )?(.+)$/);
    if (m) return { portal: m[1], label: 'Portal to ' + m[1] };
    // The rest is just something to say out loud (and some of it is an Easter egg).
    if (has('wubba lubba', 'pickle rick', 'tiny rick', 'show me what you got', 'get schwifty')) return { say: raw, label: 'Said it' };
    return null;
  };

  // Listening: the browser's own speech recognition (Chrome, Edge, the Windows launcher), or
  // the Android app's (a Capacitor plugin). onText(text, held) for each thing you say.
  let rec = null, wantOn = false, heldNow = false, onText = null;
  const native = () => { const P = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins; return P && P.SpeechRecognition; };
  V.commandsSupported = () => !!(native() || window.SpeechRecognition || window.webkitSpeechRecognition);
  V.listenAlways = () => !native() && !!(window.SpeechRecognition || window.webkitSpeechRecognition);   // the app can only listen while you hold the button
  V.startCommands = function (cb) {
    onText = cb; wantOn = true;
    if (native() || rec) return true;
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return false;
    rec = new R(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = false;
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) onText(e.results[i][0].transcript, heldNow); };
    rec.onend = () => { if (wantOn) setTimeout(() => { try { rec.start(); } catch (_) {} }, 250); };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { wantOn = false; api.toast('Voice commands need the microphone (allow it for this site).'); } };
    try { rec.start(); } catch (_) {}
    return true;
  };
  V.stopCommands = function () { wantOn = false; if (rec) { try { rec.stop(); } catch (_) {} rec = null; } };
  // Hold the command key (or button): whatever you say next is a command.
  V.holdCommand = async function (on) {
    heldNow = !!on;
    const N = native();
    if (!N || !on || !onText) return;
    try {
      const perm = await N.requestPermissions(); if (perm && perm.speechRecognition && perm.speechRecognition !== 'granted') { api.toast('Voice commands need the microphone.'); return; }
      const r = await N.start({ language: 'en-US', maxResults: 1, partialResults: false, popup: false });
      if (r && r.matches && r.matches[0]) onText(r.matches[0], true);
    } catch (_) { /* nothing heard */ }
  };
})();
