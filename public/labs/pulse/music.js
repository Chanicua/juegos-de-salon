/**
 * Pulso — the player's audio: plays a song's two files (songs/<id>-banda.mp3 and -guitarra.mp3, made
 * by tools/generators/pulse/render.mjs) together on the Web Audio clock, which is also the game's
 * clock, so what is heard and what is judged are the same time. The lead guitar goes quiet when the
 * player misses and comes back on the next hit, as the player is the one playing it. Also the dead
 * string of a tap on nothing, the power cut (a tape stop) and the clicks of the tuning screen. The
 * site's mute switch (sound.js) silences it without stopping the clock.
 */
import { isMuted } from '../../assets/js/sound.js';
import { PREROLL } from './engine.js';

/**
 * Where a decoded file really starts: its first sound is the song's first beat, at PREROLL, and some
 * decoders pad the start of an mp3. The first sample over the threshold comes a few ms into that
 * sound's attack (measured on the files: 5 ms for the band's kick, 9.5 for the lead), so that is taken off.
 */
const SESGO = { banda: 0.005, guitarra: 0.0095 };
function desfase(buffer, esperado) {
  const d = buffer.getChannelData(0);
  const umbral = 0.02;
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > umbral) return i / buffer.sampleRate - esperado;
  return 0;
}

export function crearBanda() {
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (_) { return null; }
  // The band and the lead together go a little over 0 dB at their loudest: a limiter catches it
  const maestro = ctx.createGain();
  const limite = ctx.createDynamicsCompressor();
  limite.threshold.value = -2; limite.knee.value = 0; limite.ratio.value = 20; limite.attack.value = 0.002; limite.release.value = 0.08;
  maestro.connect(limite).connect(ctx.destination);
  const volumen = () => { maestro.gain.value = isMuted() ? 0 : 1; };
  volumen();
  const ruido = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const cache = new Map();
  let fuentes = [], leadGain = null, t0 = 0, vigia = null;

  const cargar = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    const datos = await r.arrayBuffer();
    return new Promise((ok, mal) => ctx.decodeAudioData(datos, ok, mal));
  };

  const clic = (t, f = 2600, vol = 0.5, dur = 0.03) => {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(bp).connect(g).connect(maestro); s.start(t); s.stop(t + dur + 0.02);
  };

  return {
    ctx,
    /** Wakes the audio (call it from a tap: iOS asks for a gesture). */
    despertar() { if (ctx.state !== 'running') ctx.resume().catch(() => {}); },
    /** Whether the audio is running within `ms` (a browser may keep it suspended: then the game plays silent). */
    listo(ms = 500) {
      if (ctx.state === 'running') return Promise.resolve(true);
      return Promise.race([ctx.resume().then(() => ctx.state === 'running', () => false), new Promise(r => setTimeout(() => r(ctx.state === 'running'), ms))]);
    },
    /** Loads a song's two files (once): resolves when both are decoded. `c` is engine.js's cancion(). */
    async cargar(base, c) {
      if (cache.has(c.id)) return cache.get(c.id);
      const promesa = Promise.all([cargar(`${base}${c.id}-banda.mp3`), cargar(`${base}${c.id}-guitarra.mp3`)]).then(([banda, guitarra]) => ({
        banda, guitarra, offB: desfase(banda, PREROLL + SESGO.banda), offG: desfase(guitarra, c.musica.guitarra[0].t + SESGO.guitarra),
      }));
      cache.set(c.id, promesa);
      promesa.catch(() => cache.delete(c.id));
      return promesa;
    },
    /** Plays a loaded song from `desde` seconds from now. Returns t0, the audio time of the song's 0. */
    tocar(pistas, desde = 0.3) {
      this.parar();
      t0 = ctx.currentTime + desde;
      leadGain = ctx.createGain(); leadGain.connect(maestro);
      fuentes = [[pistas.banda, pistas.offB, maestro], [pistas.guitarra, pistas.offG, leadGain]].map(([buf, off, destino]) => {
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(destino);
        // A file that starts late is started that much into it; one that starts early, that much later
        s.start(t0 + Math.max(0, -off), Math.max(0, off));
        return s;
      });
      vigia = setInterval(volumen, 200);
      return t0;
    },
    /** The lead guitar: back on a hit, quiet on a miss. */
    guitarra(on) {
      if (!leadGain) return;
      const t = ctx.currentTime;
      leadGain.gain.cancelScheduledValues(t);
      leadGain.gain.setTargetAtTime(on ? 1 : 0.06, t, on ? 0.005 : 0.03);
    },
    parar() {
      clearInterval(vigia);
      fuentes.forEach(s => { try { s.stop(); } catch (_) { /* already stopped */ } });
      fuentes = [];
    },
    /** The audio time now, smoothed with the output timestamp when the browser has it. */
    ahora() {
      const ts = ctx.getOutputTimestamp?.();
      if (ts && ts.contextTime > 0 && ctx.state === 'running') return ts.contextTime + Math.max(0, performance.now() - ts.performanceTime) / 1000;
      return ctx.currentTime;
    },
    /** How late the sound reaches the ears (the speakers, Bluetooth). */
    latencia: () => (ctx.outputLatency || 0) + (ctx.baseLatency || 0),
    get t0() { return t0; },
    /** A dead string: a tap on nothing, or a miss. */
    muteo() { clic(ctx.currentTime, 900, 0.35, 0.05); },
    /** The clicks of the tuning screen, at audio times from now. Returns t0. */
    clics(tiempos, desde = 0.3) {
      t0 = ctx.currentTime + desde;
      tiempos.forEach((x, k) => clic(t0 + x, k % 4 ? 2600 : 1500, k % 4 ? 0.5 : 0.8));
      return t0;
    },
    /** The power going out: the tape slows down and stops. */
    apagon() {
      const t = ctx.currentTime;
      fuentes.forEach(s => { s.playbackRate.setValueAtTime(1, t); s.playbackRate.exponentialRampToValueAtTime(0.08, t + 1.1); });
      maestro.gain.setValueAtTime(maestro.gain.value, t); maestro.gain.linearRampToValueAtTime(0, t + 1.2);
      clearInterval(vigia);
      setTimeout(() => { this.parar(); volumen(); }, 1300);
    },
    /** The song's end: the last chord rings out a moment, then silence. */
    terminar(seg = 1.5) { setTimeout(() => this.parar(), seg * 1000); },
    pausar() { return ctx.suspend().catch(() => {}); },
    seguir() { return ctx.resume().catch(() => {}); },
  };
}
