// Trilhas locais por tela; efeitos sonoros continuam sintetizados com WebAudio.
// O áudio começa após um gesto do jogador, conforme a política do navegador.

const TRACKS = {
  menu: new URL('../MUSIC/PEGASUS TYU SEI KEN.mp3', import.meta.url).href
};

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : Number(value);
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private mode or blocked storage: volume just won't persist.
  }
};

export const volume = { music: read("ss-music", 0.45), sfx: read("ss-sfx", 0.7) };

let ctx = null;
let musicBus;
let sfxBus;
let reverb;
let wantedTheme = null;
let music = null;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function impulse(seconds) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
  }
  return buffer;
}

export function unlock() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    const master = ctx.createDynamicsCompressor();
    master.connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet).connect(master);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = volume.music;
    sfxBus.gain.value = volume.sfx;
    musicBus.connect(master);
    sfxBus.connect(master);
    musicBus.connect(reverb);
    sfxBus.connect(reverb);
    if (wantedTheme) playMusic(wantedTheme);
  }
  if (ctx.state === "suspended") ctx.resume();
  if (music?.audio?.paused) music.audio.play().catch(() => {});
}

export function setVolume(kind, value) {
  volume[kind] = value;
  save(`ss-${kind}`, value);
  const bus = kind === "music" ? musicBus : sfxBus;
  bus?.gain.setTargetAtTime(value, ctx.currentTime, 0.05);
  if (kind === "music" && music?.audio) music.audio.volume = value;
}

// One enveloped oscillator note.
function tone(bus, { freq, type = "sine", at = ctx.currentTime, attack = 0.005, hold = 0, release = 0.2, gain = 0.2, glide, filter }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, at + attack + hold + release);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  amp.gain.setValueAtTime(gain, at + attack + hold);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  let node = osc;
  if (filter) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filter;
    node = node.connect(lp);
  }
  node.connect(amp).connect(bus);
  osc.start(at);
  osc.stop(at + attack + hold + release + 0.05);
}

function noise(bus, { at = ctx.currentTime, duration = 0.2, gain = 0.2, type = "bandpass", from = 800, to = 800, q = 1 }) {
  const source = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(amp).connect(bus);
  source.start(at);
}

const SFX = {
  hover: () => tone(sfxBus, { freq: 1900, release: 0.05, gain: 0.05 }),
  click: () => {
    tone(sfxBus, { freq: 900, glide: 520, type: "triangle", release: 0.09, gain: 0.16 });
    noise(sfxBus, { duration: 0.04, gain: 0.08, from: 4000, to: 3000 });
  },
  confirm: () => {
    const t = ctx.currentTime;
    tone(sfxBus, { freq: midi(81), release: 0.5, gain: 0.14, at: t });
    tone(sfxBus, { freq: midi(88), release: 0.7, gain: 0.12, at: t + 0.07 });
  },
  back: () => tone(sfxBus, { freq: 700, glide: 380, type: "triangle", release: 0.12, gain: 0.12 }),
  play: () => {
    noise(sfxBus, { duration: 0.32, gain: 0.22, from: 300, to: 2600, q: 0.8 });
    tone(sfxBus, { freq: 120, glide: 55, release: 0.25, gain: 0.3, at: ctx.currentTime + 0.28 });
  },
  impact: () => {
    noise(sfxBus, { duration: 0.35, gain: 0.45, type: "lowpass", from: 2400, to: 200 });
    tone(sfxBus, { freq: 95, glide: 38, release: 0.35, gain: 0.5 });
    tone(sfxBus, { freq: 1320, type: "square", release: 0.25, gain: 0.05, filter: 3000 });
  },
  cosmo: () => {
    const t = ctx.currentTime;
    [0, 4, 7, 12].forEach((step, i) => tone(sfxBus, { freq: midi(74 + step), glide: midi(86 + step), at: t + i * 0.05, attack: 0.08, release: 0.6, gain: 0.05 }));
  },
  turn: () => [220, 331, 467, 659].forEach((f, i) => tone(sfxBus, { freq: f, release: 2.2, gain: 0.16 / (i + 1) })),
  victory: () => {
    const t = ctx.currentTime;
    [62, 66, 69, 74, 78, 81].forEach((n, i) => tone(sfxBus, { freq: midi(n), type: "sawtooth", filter: 2400, at: t + i * 0.12, hold: i === 5 ? 0.6 : 0, release: 0.8, gain: 0.09 }));
  },
  defeat: () => {
    const t = ctx.currentTime;
    [69, 65, 62, 57].forEach((n, i) => tone(sfxBus, { freq: midi(n), type: "triangle", at: t + i * 0.28, release: 1.1, gain: 0.12 }));
  }
};

export function sfx(name) {
  if (!ctx || ctx.state !== "running" || !SFX[name]) return;
  SFX[name]();
}

// Generative score. Each theme is a chord loop (MIDI notes), one chord per bar.
const THEMES = {
  // Slow, solemn D minor (i - VI - III - VII), choir-like pad and a bell.
  menu: { bpm: 66, chords: [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]], drums: false, arp: [0, 2, 3, 2] },
  // Driving battle loop: pulse bass, taiko on the beat, eighth-note arpeggio.
  battle: { bpm: 118, chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]], drums: true, arp: [0, 1, 2, 3, 2, 1, 2, 3] }
};

function scheduleBar(theme, bus, bar, at) {
  const beat = 60 / theme.bpm;
  const chord = theme.chords[bar % theme.chords.length];
  // Pad: detuned saws, slow swell.
  chord.slice(1).forEach((n) => {
    [-6, 6].forEach((cents) => {
      tone(bus, { freq: midi(n) * Math.pow(2, cents / 1200), type: "sawtooth", at, attack: beat * 1.2, hold: beat * 2, release: beat * 1.6, gain: 0.018, filter: 1100 });
    });
  });
  // Bass.
  const bassHits = theme.drums ? 8 : 1;
  for (let i = 0; i < bassHits; i += 1) {
    tone(bus, { freq: midi(chord[0] - 12), type: theme.drums ? "square" : "sine", at: at + (i * beat * 4) / bassHits, release: theme.drums ? beat * 0.4 : beat * 3.5, gain: theme.drums ? 0.06 : 0.12, filter: 500 });
  }
  // Arpeggio / bell.
  const steps = theme.arp.length;
  theme.arp.forEach((index, i) => {
    tone(bus, { freq: midi(chord[index] + 12), at: at + (i * beat * 4) / steps, release: theme.drums ? beat * 0.6 : beat * 1.8, gain: theme.drums ? 0.035 : 0.05 });
  });
  if (theme.drums) {
    for (let i = 0; i < 4; i += 1) {
      const t = at + i * beat;
      tone(bus, { freq: 80, glide: 40, at: t, release: 0.3, gain: i % 2 === 0 ? 0.45 : 0.25 });
      noise(bus, { at: t, duration: 0.18, gain: 0.08, type: "lowpass", from: 900, to: 120 });
    }
    if (bar % 4 === 3) {
      for (let i = 0; i < 4; i += 1) noise(bus, { at: at + beat * 3 + i * beat * 0.25, duration: 0.1, gain: 0.07, from: 1800, to: 900 });
    }
  }
}

export function playMusic(name) {
  wantedTheme = name;
  if (!ctx || music?.name === name) return;
  if (music) {
    const old = music;
    if (old.audio) {
      old.audio.pause();
      old.audio.removeAttribute('src');
      old.audio.load();
    } else {
      // Suaviza as notas já agendadas antes de desconectar o tema anterior.
      window.clearInterval(old.timer);
      old.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      window.setTimeout(() => old.bus.disconnect(), 4000);
    }
    music = null;
  }
  if (TRACKS[name]) {
    const audio = new Audio(TRACKS[name]);
    audio.loop = true;
    audio.volume = volume.music;
    music = { name, audio };
    audio.play().catch(() => {});
    return;
  }
  const theme = THEMES[name];
  if (!theme) return;
  const barLength = (60 / theme.bpm) * 4;
  const bus = ctx.createGain();
  bus.connect(musicBus);
  const state = { name, bus, bar: 0, next: ctx.currentTime + 0.6 };
  // Look-ahead scheduler: queue bars a little before they are due.
  state.timer = window.setInterval(() => {
    while (state.next < ctx.currentTime + barLength) {
      scheduleBar(theme, state.bus, state.bar, state.next);
      state.bar += 1;
      state.next += barLength;
    }
  }, 250);
  music = state;
}
