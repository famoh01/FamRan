/* Simple WebAudio SFX — no external assets, tiny, mobile-safe. */
let ctx = null;
let master = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.3, slide = 0, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur = 0.12, gain = 0.25, hp = 800) {
  const c = ac(); if (!c || muted) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = gain; g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
}

export const sfx = {
  unlock() { ac(); },
  setMuted(v) { muted = !!v; },
  isMuted() { return muted; },
  hit(cls) {
    if (cls === 'warrior') { noise(0.09, 0.22, 500); tone(160, 0.08, 'square', 0.12, -60); }
    else if (cls === 'mage') tone(520, 0.1, 'sine', 0.14, -180);
    else { noise(0.06, 0.14, 1600); tone(880, 0.05, 'triangle', 0.08, -200); }
  },
  kill() { tone(300, 0.1, 'triangle', 0.12, -120); noise(0.1, 0.1, 900); },
  boss() { tone(90, 0.5, 'sawtooth', 0.22, -40); noise(0.4, 0.18, 200); },
  hurt() { tone(200, 0.15, 'square', 0.16, -90); noise(0.12, 0.14, 300); },
  skill() { tone(720, 0.16, 'sine', 0.16, 320); tone(1080, 0.12, 'triangle', 0.1, 240, 0.03); },
  buff() { tone(520, 0.22, 'sine', 0.13, 260); },
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, 0, i * 0.075)); },
  quest() { [659, 880, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.13, 0, i * 0.09)); },
  pick() { tone(980, 0.07, 'sine', 0.1, 220); },
  dead() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.12, -30, i * 0.12)); },
  ui() { tone(660, 0.05, 'sine', 0.07, 120); },
};
