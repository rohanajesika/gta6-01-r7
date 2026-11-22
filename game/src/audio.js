// Procedural sound only — no audio files. A WebAudio graph built on the first
// user gesture: a low engine hum that follows the car's speed, a two-tone
// police siren while wanted, a noise burst for gunshots, a soft thud for
// punches, a chime when a mission pays out, and a slow synth pad for music.
// Every call is guarded: if the browser has no audio, the game stays silent.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let padOscA = null;
  let padOscB = null;
  let padGain = null;
  let musicOn = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      padOscA = ctx.createOscillator();
      padOscA.type = 'triangle';
      padOscA.frequency.value = 110;
      padOscB = ctx.createOscillator();
      padOscB.type = 'triangle';
      padOscB.frequency.value = 164.8;
      padGain = ctx.createGain();
      padGain.gain.value = 0;
      padOscA.connect(padGain);
      padOscB.connect(padGain);
      padGain.connect(ctx.destination);
      padOscA.start();
      padOscB.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function blip(freq, seconds, type, volume) {
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + seconds);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + seconds);
    } catch { /* silent */ }
  }

  function noiseBurst(seconds, volume) {
    const c = ensure();
    if (!c) return;
    try {
      const length = Math.floor(c.sampleRate * seconds);
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = c.createBufferSource();
      source.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(c.destination);
      source.start();
    } catch { /* silent */ }
  }

  return {
    unlock,
    shot() {
      noiseBurst(0.16, 0.5);
      blip(160, 0.1, 'square', 0.2);
    },
    punch() {
      noiseBurst(0.09, 0.35);
    },
    chime() {
      blip(660, 0.35, 'sine', 0.25);
      window.setTimeout(() => blip(990, 0.5, 'sine', 0.25), 140);
    },
    denied() {
      blip(140, 0.25, 'square', 0.2);
    },
    startMusic() {
      const c = ensure();
      if (!c || musicOn) return;
      musicOn = true;
      if (padGain) padGain.gain.setTargetAtTime(0.045, c.currentTime, 1.5);
    },
    update(speed, wanted, time) {
      const c = ctx;
      if (!c) return;
      try {
        if (engineOsc && engineGain) {
          engineOsc.frequency.value = 50 + Math.abs(speed) * 4;
          engineGain.gain.setTargetAtTime(speed > 0.5 ? 0.05 : 0.0, c.currentTime, 0.2);
        }
        if (sirenOsc && sirenGain) {
          sirenOsc.frequency.value = Math.sin(time * 5) > 0 ? 720 : 540;
          sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.03 : 0.0, c.currentTime, 0.3);
        }
        if (padOscA && musicOn) {
          const chord = [110, 130.8, 164.8, 196][Math.floor(time / 8) % 4];
          padOscA.frequency.setTargetAtTime(chord, c.currentTime, 1);
          padOscB.frequency.setTargetAtTime(chord * 1.5, c.currentTime, 1);
        }
      } catch { /* silent */ }
    },
  };
}
