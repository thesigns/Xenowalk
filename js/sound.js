// Sound effects synthesized with the Web Audio API, so the game needs no
// audio files: soft sine chimes and filtered noise, a ship's computer.

import { isSettingOn, saveSetting } from './settings.js';

const SETTING_KEY = 'xenowalk.sound';
const MASTER_VOLUME = 0.55;

// A pentatonic scale on A, for arpeggios that always sound right.
const NOTES = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

const SOUNDS = {
  tap(s, t) {
    s.tone(t, { frequency: 1800, duration: 0.04, volume: 0.08, type: 'triangle' });
  },
  tab(s, t) {
    s.tone(t, { frequency: 1200, endFrequency: 1500, duration: 0.07, volume: 0.07 });
  },
  dock(s, t) {
    s.hiss(t, { duration: 0.5, volume: 0.05, frequency: 900, fade: 0.2 });
    s.tone(t + 0.05, { frequency: NOTES[3], duration: 0.5, volume: 0.22 });
    s.tone(t + 0.18, { frequency: NOTES[6], duration: 0.8, volume: 0.2 });
  },
  undock(s, t) {
    s.tone(t, { frequency: NOTES[5], endFrequency: NOTES[2], duration: 0.4, volume: 0.12 });
  },
  buy(s, t) {
    s.tone(t, { frequency: 900, endFrequency: 600, duration: 0.12, volume: 0.15, type: 'triangle' });
  },
  sell(s, t) {
    s.tone(t, { frequency: NOTES[6], duration: 0.18, volume: 0.18 });
    s.tone(t + 0.07, { frequency: NOTES[8], duration: 0.4, volume: 0.18 });
    s.noise(t + 0.07, { duration: 0.25, volume: 0.05, frequency: 7000, filter: 'highpass' });
  },
  discover(s, t) {
    s.hiss(t, { duration: 1.2, volume: 0.06, frequency: 600, fade: 0.5 });
    [0, 2, 4, 6, 9].forEach((n, i) => s.tone(t + i * 0.09, { frequency: NOTES[n], duration: 0.9, volume: 0.15 }));
  },
  event(s, t) {
    s.tone(t, { frequency: 1400, duration: 0.05, volume: 0.1, type: 'square' });
    s.tone(t + 0.09, { frequency: 1900, duration: 0.07, volume: 0.08, type: 'square' });
    s.noise(t, { duration: 0.18, volume: 0.05, frequency: 2500 });
  },
  dice(s, t) {
    for (let i = 0; i < 9; i++) {
      s.noise(t + i * 0.07 + Math.random() * 0.03, { duration: 0.03, volume: 0.25 - i * 0.02, frequency: 1800 + Math.random() * 1500, q: 4 });
    }
  },
  win(s, t) {
    [2, 4, 6, 9].forEach((n, i) => s.tone(t + i * 0.08, { frequency: NOTES[n], duration: 0.5, volume: 0.17 }));
  },
  lose(s, t) {
    s.tone(t, { frequency: 330, endFrequency: 220, duration: 0.5, volume: 0.15, type: 'triangle' });
    s.tone(t + 0.15, { frequency: 262, endFrequency: 174, duration: 0.6, volume: 0.12, type: 'triangle' });
  },
  // A short cutting beam and a chunk of rock breaking off.
  mine(s, t) {
    s.tone(t, { frequency: 2400, endFrequency: 1100, duration: 0.14, volume: 0.06, type: 'sawtooth' });
    s.noise(t + 0.1, { duration: 0.16, volume: 0.22, frequency: 260, filter: 'lowpass' });
    s.tone(t + 0.14, { frequency: NOTES[5], duration: 0.3, volume: 0.1 });
  },
  container(s, t) {
    s.hiss(t, { duration: 0.9, volume: 0.12, frequency: 2600, fade: 0.1 });
    s.noise(t + 0.85, { duration: 0.2, volume: 0.3, frequency: 180, filter: 'lowpass' });
    s.tone(t + 0.9, { frequency: NOTES[4], duration: 0.4, volume: 0.1 });
  },
  artifact(s, t) {
    // A slow shimmering chord, then a bell.
    [0, 4, 7, 9].forEach((n, i) => {
      s.tone(t + i * 0.15, { frequency: NOTES[n] / 2, duration: 3.2, volume: 0.08, attack: 0.6 });
      s.tone(t + i * 0.15, { frequency: (NOTES[n] / 2) * 1.004, duration: 3.2, volume: 0.06, attack: 0.6 });
    });
    s.hiss(t, { duration: 2.6, volume: 0.04, frequency: 5000, fade: 1 });
    s.tone(t + 1.1, { frequency: NOTES[10], duration: 2.2, volume: 0.14 });
    s.tone(t + 1.1, { frequency: NOTES[10] * 2.01, duration: 1.6, volume: 0.04 });
  },
  mission(s, t) {
    s.tone(t, { frequency: NOTES[4], duration: 0.15, volume: 0.15 });
    s.tone(t + 0.1, { frequency: NOTES[5], duration: 0.3, volume: 0.15 });
  },
  delivered(s, t) {
    [4, 6, 8].forEach((n, i) => s.tone(t + i * 0.1, { frequency: NOTES[n], duration: 0.5, volume: 0.17 }));
    s.noise(t + 0.2, { duration: 0.3, volume: 0.05, frequency: 7000, filter: 'highpass' });
  },
  ship(s, t) {
    s.tone(t, { frequency: 60, endFrequency: 140, duration: 1.4, volume: 0.25, type: 'sawtooth', attack: 0.3 });
    s.hiss(t, { duration: 1.4, volume: 0.08, frequency: 400, fade: 0.4 });
    s.tone(t + 1.1, { frequency: NOTES[7], duration: 0.8, volume: 0.15 });
  },
  expired(s, t) {
    s.tone(t, { frequency: 520, endFrequency: 300, duration: 0.6, volume: 0.12, type: 'triangle' });
  },
  error(s, t) {
    s.tone(t, { frequency: 160, duration: 0.18, volume: 0.15, type: 'square' });
  },
  news(s, t) {
    s.tone(t, { frequency: NOTES[7], duration: 0.3, volume: 0.1 });
    s.tone(t + 0.12, { frequency: NOTES[9], duration: 0.5, volume: 0.1 });
  },
};

export class SoundEffects {
  constructor() {
    this.enabled = isSettingOn(SETTING_KEY);
    this.context = null;
  }

  // Browsers only allow audio to start from a user gesture, so call this from one.
  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.context.destination);
      this.noiseBuffer = createNoiseBuffer(this.context);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    saveSetting(SETTING_KEY, enabled);
  }

  play(name) {
    if (!this.enabled || !this.context) return;
    SOUNDS[name]?.(this, this.context.currentTime + 0.01);
  }

  tone(time, { frequency, endFrequency = frequency, type = 'sine', duration, volume, attack = 0.005 }) {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    this.envelope(oscillator, time, duration, volume, attack);
  }

  noise(time, { duration, volume, frequency, filter = 'bandpass', q = 1 }) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const biquad = this.context.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = frequency;
    biquad.Q.value = q;
    source.connect(biquad);
    this.envelope(biquad, time, duration, volume, 0.003, source);
  }

  hiss(time, { duration, volume, frequency, q = 0.7, fade = 0.3 }) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const biquad = this.context.createBiquadFilter();
    biquad.type = 'bandpass';
    biquad.frequency.value = frequency;
    biquad.Q.value = q;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + fade);
    gain.gain.setValueAtTime(volume, time + Math.max(fade, duration - fade));
    gain.gain.linearRampToValueAtTime(0, time + duration);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.master);
    source.start(time);
    source.stop(time + duration + 0.05);
  }

  envelope(node, time, duration, volume, attack, source = node) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    node.connect(gain);
    gain.connect(this.master);
    source.start(time);
    source.stop(time + duration + 0.05);
  }
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
