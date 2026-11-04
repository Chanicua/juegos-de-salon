/**
 * Pulso — the band, synthesized with Web Audio (no audio files): drums, bass, a distorted rhythm
 * guitar and the lead guitar the player plays. The song's events (engine.js) are scheduled a little
 * ahead on the audio clock, which is also the game's clock, so what is heard and what is judged are
 * the same time. The mute switch of the site (sound.js) silences it without stopping the clock.
 */
import { isMuted } from '../../assets/js/sound.js';

const MIDI = m => 440 * 2 ** ((m - 69) / 12);
const ADELANTE = 0.15; // seconds scheduled ahead

/** A distortion curve, the classic soft clip: the 90s crunch. */
function curva(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x)); }
  return c;
}

export function crearBanda() {
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (_) { return null; }
  const maestro = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  maestro.connect(comp).connect(ctx.destination);
  maestro.gain.value = isMuted() ? 0 : 0.9;

  // The noise every cymbal and snare is made of
  const ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Two guitar amps: the rhythm one (darker, quieter) and the lead one (brighter, louder)
  const amp = (k, corte, vol) => {
    const entrada = ctx.createGain();
    const pre = ctx.createBiquadFilter(); pre.type = 'highpass'; pre.frequency.value = 110;
    const sh = ctx.createWaveShaper(); sh.curve = curva(k); sh.oversample = '2x';
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = corte; cab.Q.value = 0.8;
    const out = ctx.createGain(); out.gain.value = vol;
    entrada.connect(pre).connect(sh).connect(cab).connect(out).connect(maestro);
    return entrada;
  };
  const ritmo = amp(60, 2600, 0.16);
  const lead = amp(140, 3800, 0.26);

  const envolver = (g, t, ataque, vol, caida) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  };
  const ruidoEn = (t, dur, tipo, frec, vol) => {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = frec;
    const g = ctx.createGain();
    s.connect(f).connect(g).connect(maestro);
    envolver(g, t, 0.002, vol, dur);
    s.start(t); s.stop(t + dur + 0.05);
  };
  const osc = (t, tipo, frec, destino) => {
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(frec, t);
    o.connect(destino); o.start(t);
    return o;
  };

  const SONIDOS = {
    kick(t, v = 1) {
      const g = ctx.createGain(); g.connect(maestro);
      const o = osc(t, 'sine', 150, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      envolver(g, t, 0.003, 0.95 * v, 0.32); o.stop(t + 0.4);
    },
    snare(t, v = 1) {
      ruidoEn(t, 0.17, 'bandpass', 1900, 0.55 * v);
      const g = ctx.createGain(); g.connect(maestro);
      const o = osc(t, 'triangle', 190, g); envolver(g, t, 0.002, 0.35 * v, 0.09); o.stop(t + 0.15);
    },
    hat(t, v = 1) { ruidoEn(t, 0.035, 'highpass', 8000, 0.2 * v); },
    open(t, v = 1) { ruidoEn(t, 0.22, 'highpass', 7000, 0.18 * v); },
    crash(t, v = 1) { ruidoEn(t, 1.3, 'highpass', 4500, 0.32 * v); },
    stick(t) {
      const g = ctx.createGain(); g.connect(maestro);
      const o = osc(t, 'square', 1700, g); envolver(g, t, 0.001, 0.2, 0.03); o.stop(t + 0.06);
    },
    bass(t, v = 1, midi, dur) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain(); f.connect(g).connect(maestro);
      const a = osc(t, 'sawtooth', MIDI(midi), f), b = osc(t, 'square', MIDI(midi) / 2, f);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.008);
      g.gain.setTargetAtTime(0.0001, t + dur * 0.8, 0.04);
      a.stop(t + dur + 0.2); b.stop(t + dur + 0.2);
    },
    chord(t, v = 1, midi, dur) {
      // A power chord: root, fifth and octave, a bit detuned, into the rhythm amp
      const g = ctx.createGain(); g.connect(ritmo);
      const os = [0, 7, 12].map((i, k) => { const o = osc(t, 'sawtooth', MIDI(midi + i), g); o.detune.value = (k - 1) * 6; return o; });
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.006);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
      os.forEach(o => o.stop(t + dur + 0.3));
    },
  };

  let eventos = [], cursor = 0, t0 = 0, timer = null;
  function programar() {
    maestro.gain.value = isMuted() ? 0 : 0.9;
    const hasta = ctx.currentTime - t0 + ADELANTE;
    while (cursor < eventos.length && eventos[cursor].t < hasta) {
      const e = eventos[cursor++];
      const t = Math.max(ctx.currentTime, t0 + e.t);
      try { SONIDOS[e.tipo]?.(t, e.v ?? 1, e.midi, e.dur); } catch (_) { /* a voice that failed is a note less */ }
    }
  }

  return {
    ctx,
    /** Wakes the audio (call it from a tap: iOS asks for a gesture). */
    despertar() { if (ctx.state !== 'running') ctx.resume().catch(() => {}); },
    /** Whether the audio is running within `ms` (a browser may keep it suspended: then the game plays silent). */
    listo(ms = 500) {
      if (ctx.state === 'running') return Promise.resolve(true);
      return Promise.race([ctx.resume().then(() => ctx.state === 'running', () => false), new Promise(r => setTimeout(() => r(ctx.state === 'running'), ms))]);
    },
    /** Plays the events from `desde` seconds from now. Returns t0, the audio time of the song's 0. */
    tocar(ev, desde = 0.25) {
      eventos = ev; cursor = 0; t0 = ctx.currentTime + desde;
      clearInterval(timer); timer = setInterval(programar, 25); programar();
      return t0;
    },
    parar() { clearInterval(timer); timer = null; eventos = []; },
    /** The audio time now, smoothed with the output timestamp when the browser has it. */
    ahora() {
      const ts = ctx.getOutputTimestamp?.();
      if (ts && ts.contextTime > 0 && ctx.state === 'running') return ts.contextTime + Math.max(0, performance.now() - ts.performanceTime) / 1000;
      return ctx.currentTime;
    },
    /** How late the sound reaches the ears (the speakers, Bluetooth). */
    latencia: () => (ctx.outputLatency || 0) + (ctx.baseLatency || 0),
    get t0() { return t0; },
    /**
     * The lead guitar: a note the player hit. A hold sustains (with vibrato) until stop() is called;
     * a tap rings a moment. Returns { stop }.
     */
    nota(midi, sostener = false) {
      const t = ctx.currentTime;
      const g = ctx.createGain(); g.connect(lead);
      const a = osc(t, 'sawtooth', MIDI(midi), g), b = osc(t, 'square', MIDI(midi + 7), g);
      b.detune.value = 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.005);
      let lfo = null;
      if (sostener) {
        lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
        const prof = ctx.createGain(); prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(18, t + 0.35);
        lfo.connect(prof); prof.connect(a.detune); prof.connect(b.detune); lfo.start(t);
        g.gain.setTargetAtTime(0.35, t + 0.05, 0.2);
      } else g.gain.setTargetAtTime(0.0001, t + 0.12, 0.08);
      const fin = sostener ? null : t + 0.6;
      if (fin) { a.stop(fin); b.stop(fin); }
      return {
        stop() {
          if (fin) return;
          const ya = ctx.currentTime;
          g.gain.cancelScheduledValues(ya); g.gain.setValueAtTime(g.gain.value || 0.3, ya); g.gain.setTargetAtTime(0.0001, ya, 0.03);
          [a, b, lfo].forEach(o => { try { o.stop(ya + 0.2); } catch (_) { /* already stopped */ } });
        },
      };
    },
    /** A dead string: a tap on nothing, or a miss. */
    muteo() {
      const t = ctx.currentTime;
      ruidoEn(t, 0.05, 'bandpass', 900, 0.35);
    },
    /** The power going out: everything falls in pitch and goes quiet. */
    apagon() {
      this.parar();
      const t = ctx.currentTime;
      const g = ctx.createGain(); g.connect(lead);
      const o = osc(t, 'sawtooth', MIDI(52), g);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.1);
      envolver(g, t, 0.01, 0.6, 1.1); o.stop(t + 1.3);
    },
    pausar() { return ctx.suspend().catch(() => {}); },
    seguir() { return ctx.resume().catch(() => {}); },
    cerrar() { this.parar(); ctx.close().catch(() => {}); },
  };
}
