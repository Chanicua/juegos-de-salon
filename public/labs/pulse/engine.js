/**
 * Pulso — the engine (lab prototype). A one-finger rhythm game: notes fall down three lanes toward
 * three pads in an arc, where the thumb reaches. A tap note is tapped when it reaches its pad; a hold
 * note is pressed when its head arrives, held, and released exactly when its tail ends. Taps only:
 * never a swipe, never two notes at once, never a note while another is held.
 *
 * The song is generated from a seed (the day's, or one of its own): 90s rock in nine parts that get
 * harder (faster tempo, denser and more syncopated riffs, triplets, sixteenths, holds with quick taps
 * after them). The same score drives the music (drums, bass, rhythm guitar in music.js) and the notes,
 * so the rhythm the player hears is the one they play. Pure: no DOM and no audio here.
 */
import { rng } from '../../assets/js/rng.js';

export const CARRILES = 3;
/** The song: an intro of drums, nine parts of eight bars, and a closing bar with one long hold. */
export const SECCIONES = 9;
export const COMPASES = 8;
export const INTRO = 2;
export const BPM_INICIO = 96;
export const BPM_FIN = 138;
/** Ticks per beat: 12 fits sixteenths (3) and eighth-note triplets (4). A bar has 48. */
export const TICKS = 12;
const BAR = 4 * TICKS;
/** How long a note is in view before it reaches its pad, in seconds. */
export const ANTICIPO = 1.45;

/** The timing windows, in seconds either side of the beat; releasing a hold is a bit more forgiving. */
export const VENTANAS = { perfecto: 0.05, bien: 0.095, casi: 0.14 };
export const VENTANAS_SOLTAR = { perfecto: 0.07, bien: 0.12, casi: 0.17 };
export const PUNTOS = { perfecto: 100, bien: 70, casi: 40 };
/** Each beat a hold is held, before the release is judged. */
export const PUNTOS_SOSTENER = 20;
/** The multiplier grows every ten in a row, up to ×4. */
export const RACHA_MULTI = 10;
export const MULTI_MAX = 4;
/** The energy meter: at 0 the power goes out and the song ends. */
export const ENERGIA = { inicio: 60, max: 100, perfecto: 2, bien: 1, casi: 0, fallo: -9, soltarMal: -6 };
/**
 * The shortest time between letting go (or tapping) and the next press, by how far the thumb moves:
 * the same pad, the next one, the far one. A hold's release counts as the thumb letting go.
 */
export const HUECO = [0.13, 0.16, 0.21];
/** A hold shorter than this is played as a tap: a tail that short cannot be read. */
export const SOSTENER_MIN = 0.32;

/** The keys a 90s riff lives in (MIDI of the low root): E, A, D, G and C. */
const TONICAS = [40, 45, 38, 43, 36];
/** Chord progressions, as semitones from the root, one chord per bar (they repeat after four). */
const PROGRESIONES = [
  [0, 10, 5, 0], // I bVII IV I
  [0, 0, 10, 5], // I I bVII IV
  [0, 3, 5, 0], // i bIII IV i
  [0, 10, 8, 10], // i bVII bVI bVII
  [0, 5, 3, 10], // i IV bIII bVII
  [0, 7, 5, 3], // i V IV bIII
];
/** The style of each part: rock (straight eighths) or funk (sixteenths, syncopated kick). */
const ESTILOS = ['rock', 'rock', 'funk', 'rock', 'funk', 'rock', 'funk', 'rock', 'rock'];

/**
 * The rhythm vocabulary, one bar each, by level (0 is the easiest): [tick] is a tap, [tick, length]
 * a hold of that many ticks. A part picks two riffs of its level and a fill of the next one.
 */
const RIFFS = [
  // 0: quarters
  [[[0], [12], [24], [36]], [[0], [12], [24]], [[0], [24], [36]], [[0], [12], [36]]],
  // 1: the first holds
  [[[0, 18], [24], [36]], [[0], [12], [24, 18]], [[0, 30], [36]], [[0], [12, 18], [36]]],
  // 2: eighths
  [[[0], [6], [12], [24], [36]], [[0], [12], [18], [24], [36]], [[0, 12], [18], [24], [30], [36]], [[0], [6], [12], [24, 18]]],
  // 3: syncopation (the 3-3-2 of rock)
  [[[0], [18], [36]], [[0], [18], [30], [36]], [[0, 12], [18], [36], [42]], [[6], [12], [24], [30], [42]]],
  // 4: holds with taps right after
  [[[0, 18], [24], [30], [36]], [[0], [6], [12, 12], [30], [36]], [[0, 24], [30], [36], [42]], [[0], [9], [18], [24, 18]]],
  // 5: eighth-note triplets
  [[[0], [4], [8], [12], [24], [36]], [[0], [12], [16], [20], [24], [36]], [[0, 12], [16], [20], [24], [36]], [[0], [8], [12], [24], [32], [36]]],
  // 6: sixteenths
  [[[0], [3], [6], [12], [24], [27], [30], [36]], [[0], [6], [9], [12], [18], [24], [36], [42]], [[0], [9], [12], [21], [24], [36]], [[0, 9], [12], [15], [18], [24], [36]]],
  // 7: funk (offbeat sixteenths)
  [[[0], [3], [9], [12], [18], [21], [30], [36], [42]], [[0], [6], [9], [15], [21], [24], [33], [36], [42]], [[0, 9], [12], [15], [21], [24, 9], [36], [39], [45]], [[3], [6], [12], [18], [27], [30], [36], [42]]],
  // 8: everything
  [[[0], [3], [6], [9], [12], [24], [28], [32], [36], [42]], [[0], [4], [8], [12, 9], [24], [27], [30], [36], [39], [42]], [[0, 6], [9], [12], [15], [18], [24, 6], [33], [36], [39], [45]], [[0], [6], [9], [12], [16], [20], [24], [30], [33], [36], [42], [45]]],
  // 9: the fills of the last part
  [[[0], [3], [6], [9], [12], [15], [18], [21], [24], [28], [32], [36], [40], [44]], [[0], [4], [8], [12], [16], [20], [24], [27], [30], [33], [36], [39], [42], [45]]],
];

/** The minor pentatonic (and the blue note), as semitones: low degrees go left, high ones right. */
const GRADOS = [[0, 3], [5, 7], [10, 12, 15]];

/** A number from a text: the same seed gives the same song on every phone. */
export function hash(texto) {
  let h = 2166136261;
  for (const c of String(texto)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}

/** The tempo of each part: from BPM_INICIO to BPM_FIN, a step faster each part. */
export const bpmDe = s => Math.round(BPM_INICIO + (BPM_FIN - BPM_INICIO) * Math.min(s, SECCIONES - 1) / (SECCIONES - 1));

/**
 * The song for a seed: its bars (time, tempo, part, chord), the notes the player plays and the music
 * events (drums, bass, chords), all in seconds from the start.
 */
export function cancion(semilla) {
  const r = rng(hash(semilla));
  const pick = a => a[Math.floor(r() * a.length)];
  const tonica = pick(TONICAS);
  const compases = [];
  let t = 0;
  const agregar = (seccion, bpm, acorde, tipo) => {
    const dur = 4 * 60 / bpm;
    compases.push({ i: compases.length, t, dur, bpm, seccion, acorde, tipo });
    t += dur;
  };
  for (let k = 0; k < INTRO; k++) agregar(-1, bpmDe(0), 0, 'intro');
  const partes = [];
  for (let s = 0; s < SECCIONES; s++) {
    const prog = pick(PROGRESIONES);
    const a = pick(RIFFS[s]);
    let b = pick(RIFFS[s]);
    if (b === a && RIFFS[s].length > 1) b = RIFFS[s][(RIFFS[s].indexOf(a) + 1) % RIFFS[s].length];
    const relleno = pick(RIFFS[Math.min(s + 1, RIFFS.length - 1)]);
    partes.push({ s, bpm: bpmDe(s), estilo: ESTILOS[s], prog, riffs: [a, b, relleno], desde: compases.length });
    for (let k = 0; k < COMPASES; k++) agregar(s, bpmDe(s), prog[k % 4], k === COMPASES - 1 ? 'relleno' : k % 2 ? 'b' : 'a');
  }
  agregar(SECCIONES - 1, bpmDe(SECCIONES - 1), 0, 'final');
  const duracion = t + compases.at(-1).dur * 0.5;

  // The lanes of each riff are chosen once per part, so a riff repeated is the same riff to play
  const lanes = new Map();
  const carrilesDe = (riff, s) => {
    const key = `${s}:${RIFFS.flat().indexOf(riff)}`;
    if (lanes.has(key)) return lanes.get(key);
    const salto = s >= 5 ? 2 : 1;
    let c = Math.floor(r() * CARRILES);
    const out = riff.map((_, k) => {
      if (k) {
        const quieto = r() < (s < 3 ? 0.45 : 0.25);
        if (!quieto) c = Math.max(0, Math.min(CARRILES - 1, c + (r() < 0.5 ? -1 : 1) * (1 + (r() < 0.25 ? salto - 1 : 0))));
      }
      return { c, grado: pick(GRADOS[c]) };
    });
    lanes.set(key, out);
    return out;
  };

  // The notes, bar by bar, keeping the one-finger rules (HUECO, SOSTENER_MIN)
  const notas = [];
  let antes = null; // the last note kept: its lane and when the thumb is free again
  const poner = (n) => {
    if (antes) {
      const libre = antes.fin ?? antes.t;
      if (n.t - libre < HUECO[Math.abs(n.c - antes.c)]) {
        // Too quick for the thumb: try the same pad as before, else drop it
        if (n.t - libre >= HUECO[0] && antes.fin == null) n.c = antes.c;
        else return;
      }
    }
    notas.push(n);
    antes = n;
  };
  for (const bar of compases) {
    if (bar.tipo === 'intro') continue;
    const tick = bar.dur / BAR;
    const tonicaBar = tonica + bar.acorde;
    if (bar.tipo === 'final') {
      poner({ t: bar.t, fin: bar.t + 36 * tick, c: 1, midi: tonica + 12, seccion: bar.seccion });
      continue;
    }
    const parte = partes[bar.seccion];
    const riff = parte.riffs[bar.tipo === 'a' ? 0 : bar.tipo === 'b' ? 1 : 2];
    const carr = carrilesDe(riff, bar.seccion);
    riff.forEach(([k, largo], j) => {
      const n = { t: bar.t + k * tick, c: carr[j].c, midi: tonicaBar + 12 + carr[j].grado, seccion: bar.seccion };
      if (largo && largo * tick >= SOSTENER_MIN) n.fin = n.t + largo * tick;
      poner(n);
    });
  }
  // A hold must leave room for the note after it: shorten it, or make it a tap
  for (let k = 0; k < notas.length - 1; k++) {
    const n = notas[k], sig = notas[k + 1];
    if (n.fin == null) continue;
    const tope = sig.t - HUECO[Math.abs(sig.c - n.c)];
    if (n.fin > tope) n.fin = tope;
    if (n.fin - n.t < SOSTENER_MIN) delete n.fin;
  }
  notas.forEach((n, i) => { n.id = i; });

  return { semilla: String(semilla), tonica, compases, partes, notas, musica: musica(compases, partes, tonica), duracion };
}

/**
 * The band, as events: { t, tipo, midi?, dur?, v? }. tipo is kick, snare, hat, open (an open hat),
 * crash, bass or chord (a power chord of the rhythm guitar). The intro counts in with sticks.
 */
function musica(compases, partes, tonica) {
  const ev = [];
  for (const bar of compases) {
    const tick = bar.dur / BAR;
    const at = (k, tipo, extra = {}) => ev.push({ t: bar.t + k * tick, tipo, ...extra });
    const estilo = bar.seccion >= 0 ? partes[bar.seccion].estilo : 'rock';
    const nivel = Math.max(0, bar.seccion);
    const raiz = tonica + bar.acorde;
    if (bar.tipo === 'intro') {
      if (bar.i === 0) { at(0, 'kick'); at(0, 'crash', { v: 0.6 }); for (let k = 12; k < BAR; k += 12) at(k, 'hat'); at(24, 'snare', { v: 0.5 }); }
      else for (let k = 0; k < 4; k++) at(k * 12, 'stick', { cuenta: k + 1 });
      continue;
    }
    if (bar.tipo === 'final') { at(0, 'kick'); at(0, 'crash'); at(0, 'chord', { midi: tonica, dur: bar.dur * 0.9 }); at(0, 'bass', { midi: tonica - 12, dur: bar.dur * 0.9 }); continue; }
    const primero = bar.i === partes[bar.seccion].desde;
    if (primero) at(0, 'crash');
    // Drums
    if (estilo === 'funk') {
      for (const k of [0, 9, 30]) at(k, 'kick');
      at(12, 'snare'); at(36, 'snare');
      for (const k of [21, 45]) at(k, 'snare', { v: 0.25 });
      for (let k = 0; k < BAR; k += 3) at(k, 'hat', { v: k % 6 ? 0.35 : 0.7 });
    } else {
      at(0, 'kick'); at(24, 'kick');
      if (nivel >= 3) at(30, 'kick');
      if (nivel >= 6) at(18, 'kick', { v: 0.7 });
      at(12, 'snare'); at(36, 'snare');
      const paso = nivel >= 6 ? 3 : 6;
      for (let k = 0; k < BAR; k += paso) at(k, k === 42 && nivel >= 2 ? 'open' : 'hat', { v: k % 12 ? 0.4 : 0.75 });
    }
    if (bar.tipo === 'relleno') for (let k = 36; k < BAR; k += 3) at(k, 'snare', { v: 0.4 + (k - 36) / 24 });
    // Bass: eighths on the root (rock) or a syncopated line (funk)
    const bajo = raiz - 12;
    if (estilo === 'funk') {
      [[0, 0], [9, 12], [12, 0], [21, 10], [24, 0], [30, 7], [36, 0], [42, 12]].forEach(([k, i]) => at(k, 'bass', { midi: bajo + i, dur: tick * 4 }));
    } else {
      for (let k = 0; k < BAR; k += 6) at(k, 'bass', { midi: bajo + (k === 42 && nivel >= 4 ? 7 : 0), dur: tick * 5 });
    }
    // Rhythm guitar: a power chord on the bar, muted eighths from the third part on
    at(0, 'chord', { midi: raiz, dur: tick * 20 });
    at(24, 'chord', { midi: raiz, dur: tick * (nivel >= 2 ? 4 : 20), v: nivel >= 2 ? 0.6 : 1 });
    if (nivel >= 2) for (let k = 30; k < BAR; k += 6) at(k, 'chord', { midi: raiz, dur: tick * 2.5, v: 0.45 });
  }
  return ev.sort((a, b) => a.t - b.t);
}

/** The judgment of a time difference, in seconds: perfecto, bien, casi, or null (missed). */
export function juzgar(dt, v = VENTANAS) {
  const d = Math.abs(dt);
  return d <= v.perfecto ? 'perfecto' : d <= v.bien ? 'bien' : d <= v.casi ? 'casi' : null;
}

export const multiplicador = racha => Math.min(MULTI_MAX, 1 + Math.floor(racha / RACHA_MULTI));

/** A new game for a song: every note waiting, energy at its start. */
export function nuevaPartida(c) {
  return {
    c, puntos: 0, racha: 0, mejorRacha: 0, energia: ENERGIA.inicio, fin: null, sosteniendo: null,
    estado: c.notas.map(() => ({ golpe: null, soltar: null })),
    cuenta: { perfecto: 0, bien: 0, casi: 0, fallo: 0 },
    // Per part: the judgments' weight and how many, for the result card
    partes: Array.from({ length: SECCIONES }, () => ({ peso: 0, n: 0 })),
    siguiente: 0, // the first note not judged yet
    alcanzada: 0, // the furthest part reached
  };
}

const PESO = { perfecto: 1, bien: 0.7, casi: 0.4 };

function anotar(p, n, calif, base) {
  const parte = p.partes[n.seccion];
  parte.n++;
  if (calif) {
    p.racha++;
    p.mejorRacha = Math.max(p.mejorRacha, p.racha);
    p.puntos += base * multiplicador(p.racha);
    p.energia = Math.min(ENERGIA.max, p.energia + ENERGIA[calif]);
    p.cuenta[calif]++;
    parte.peso += PESO[calif];
  } else {
    p.racha = 0;
    p.cuenta.fallo++;
    p.energia += base;
    if (p.energia <= 0) { p.energia = 0; p.fin = 'apagon'; }
  }
}

/**
 * A press on a lane at time t: the first waiting note of that lane in the window. Returns what
 * happened: { tipo: 'golpe', nota, calif, dt } or { tipo: 'nada' } (a tap on nothing breaks the run).
 */
export function tocar(p, t, carril) {
  if (p.fin || p.sosteniendo) return { tipo: 'nada' };
  const { notas } = p.c;
  for (let i = p.siguiente; i < notas.length; i++) {
    const n = notas[i];
    if (n.t - t > VENTANAS.casi) break;
    if (n.c !== carril || p.estado[i].golpe) continue;
    const calif = juzgar(t - n.t);
    if (!calif) continue;
    p.estado[i].golpe = calif;
    p.alcanzada = Math.max(p.alcanzada, n.seccion);
    anotar(p, n, calif, PUNTOS[calif]);
    if (n.fin != null) p.sosteniendo = { i, desde: t };
    else avanzarSiguiente(p);
    return { tipo: 'golpe', nota: n, calif, dt: t - n.t };
  }
  p.racha = 0;
  return { tipo: 'nada' };
}

/** The thumb lets go at time t: judges the hold being held, if any. */
export function soltar(p, t) {
  const h = p.sosteniendo;
  if (!h) return { tipo: 'nada' };
  const n = p.c.notas[h.i];
  p.sosteniendo = null;
  const fin = Math.min(t, n.fin);
  const beat = 60 / bpmEn(p.c, n.t);
  const sostenido = Math.max(0, fin - n.t) / beat;
  p.puntos += Math.round(sostenido * PUNTOS_SOSTENER) * multiplicador(p.racha);
  const calif = juzgar(t - n.fin, VENTANAS_SOLTAR);
  const motivo = calif ? null : t < n.fin ? 'antes' : 'tarde';
  p.estado[h.i].soltar = calif || motivo;
  anotar(p, n, calif, calif ? PUNTOS[calif] : ENERGIA.soltarMal);
  avanzarSiguiente(p);
  return { tipo: 'soltar', nota: n, calif, motivo, dt: t - n.fin };
}

function avanzarSiguiente(p) {
  const { notas } = p.c;
  while (p.siguiente < notas.length && p.estado[p.siguiente].golpe && (notas[p.siguiente].fin == null || p.estado[p.siguiente].soltar)) p.siguiente++;
}

/**
 * Time moves to t: the notes whose window passed are missed, a hold held too long is a late release,
 * and the song ends when its last note is judged. Returns the misses, to show them.
 */
export function avanzar(p, t) {
  const sucesos = [];
  if (p.fin) return sucesos;
  const { notas } = p.c;
  const h = p.sosteniendo;
  if (h && t > notas[h.i].fin + VENTANAS_SOLTAR.casi) sucesos.push(soltar(p, t));
  for (let i = p.siguiente; i < notas.length && !p.fin; i++) {
    const n = notas[i], e = p.estado[i];
    if (t - n.t <= VENTANAS.casi) break;
    if (e.golpe) continue;
    e.golpe = 'fallo';
    if (n.fin != null) e.soltar = 'fallo';
    p.alcanzada = Math.max(p.alcanzada, n.seccion);
    anotar(p, n, null, ENERGIA.fallo);
    sucesos.push({ tipo: 'fallo', nota: n });
  }
  avanzarSiguiente(p);
  if (!p.fin && p.siguiente >= notas.length && !p.sosteniendo) p.fin = 'completa';
  return sucesos;
}

/** The tempo at time t. */
export function bpmEn(c, t) {
  let b = c.compases[0];
  for (const x of c.compases) { if (x.t > t) break; b = x; }
  return b.bpm;
}

/** The part a time is in (-1 in the intro). */
export function seccionEn(c, t) {
  let s = -1;
  for (const x of c.compases) { if (x.t > t) break; s = x.seccion; }
  return s;
}

/** How well it went, from 0 to 100: the weight of every judgment over the judgments (taps and releases). */
export function precision(p) {
  const total = p.cuenta.perfecto + p.cuenta.bien + p.cuenta.casi + p.cuenta.fallo;
  if (!total) return 0;
  return Math.round(100 * (p.cuenta.perfecto + 0.7 * p.cuenta.bien + 0.4 * p.cuenta.casi) / total);
}

/** The best a song can give (every note perfect, every hold held to its end). */
export function maximo(c) {
  const p = nuevaPartida(c);
  for (const n of c.notas) {
    tocar(p, n.t, n.c);
    if (n.fin != null) soltar(p, n.fin);
  }
  return p.puntos;
}

/** The result card: a square per part, by how well it was played (⬛ not reached). */
export function tarjeta(p) {
  return p.partes.map((x, s) => {
    if (!x.n || s > p.alcanzada) return '⬛';
    const r = x.peso / x.n;
    return r >= 0.85 ? '🟩' : r >= 0.6 ? '🟨' : r >= 0.35 ? '🟧' : '🟥';
  }).join('');
}
