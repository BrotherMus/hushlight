// Every sound is synthesised with WebAudio: no audio files. Warden footsteps are panned
// and faded by where the warden is, so you can hear a patrol before you see it.

let audio = null;
let master = null;

export function unlockAudio() {
  if (audio) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audio = new Ctor();
    master = audio.createGain();
    master.gain.value = 0.5;
    master.connect(audio.destination);
  } catch {
    audio = null;
  }
}

function tone({ frequency, endFrequency, duration, volume, type = 'sine', pan = 0, delay = 0 }) {
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let tail = gain;
  if (audio.createStereoPanner) {
    const panner = audio.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.connect(panner);
    tail = panner;
  }
  oscillator.connect(gain);
  tail.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

// A warden's boot: louder when near, panned left or right of Moth.
export function playGuardFootstep(offsetX, distanceToPlayer) {
  const volume = Math.max(0, 1 - distanceToPlayer / 520) * 0.35;
  if (volume < 0.01) return;
  tone({ frequency: 95, endFrequency: 48, duration: 0.09, volume, type: 'triangle', pan: offsetX / 400 });
}

export function playPlayerFootstep() {
  tone({ frequency: 210, endFrequency: 120, duration: 0.05, volume: 0.12, type: 'triangle' });
}

export function playPebbleClack() {
  tone({ frequency: 1250, endFrequency: 600, duration: 0.07, volume: 0.3, type: 'square' });
  tone({ frequency: 900, endFrequency: 500, duration: 0.06, volume: 0.18, type: 'square', delay: 0.11 });
}

export function playSuspicionSting() {
  tone({ frequency: 392, endFrequency: 466, duration: 0.22, volume: 0.22, type: 'sawtooth' });
}

export function playAlarm() {
  for (let i = 0; i < 3; i++) {
    tone({ frequency: 880, endFrequency: 660, duration: 0.16, volume: 0.28, type: 'square', delay: i * 0.2 });
  }
}

export function playRelicChime() {
  [660, 880, 1320].forEach((frequency, i) => tone({ frequency, duration: 0.25, volume: 0.22, delay: i * 0.08 }));
}

export function playEscapeFanfare() {
  [523, 659, 784, 1047].forEach((frequency, i) => tone({ frequency, duration: 0.3, volume: 0.25, delay: i * 0.12 }));
}

export function playCaughtThud() {
  tone({ frequency: 180, endFrequency: 40, duration: 0.5, volume: 0.4, type: 'sawtooth' });
}
