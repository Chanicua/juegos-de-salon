/**
 * Pulso — the engine (lab prototype). A one-finger rhythm game: notes fall down three lanes toward
 * three pads in an arc, where the thumb reaches. A tap note is tapped when it reaches its pad; a hold
 * note is pressed when its head arrives, held, and released exactly when its tail ends. Taps only:
 * never a swipe, never two notes at once, never a note while another is held.
 *
 * The songs are well-known melodies in the public domain, arranged as rock (songs.js). From a song's
 * score this makes its bars, the notes the player plays (the melody: low notes left, high right) and
 * the music's events, which tools/generators/pulse/render.mjs turns into the two audio files the
 * game plays: the band, and the lead guitar that the player's notes are. Parts get faster, and their
 * level lets more of the melody be played: the notes on the beat, then the eighths, then all.
 * Pure: no DOM and no audio here.
 */
import { compas, midi } from './songs.js';

export const CARRILES = 3;
/** Two bars before the song: a groove, then four sticks that count it in. */
export const INTRO = 2;
/** Silence at the start of the audio files: the first sound tells the game where 0 is (decoders pad mp3). */
export const PREROLL = 0.5;
/** Ticks per beat: 12 fits sixteenths (3) and triplets (4). A bar has 48. */
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
/** Which melody notes a part's level plays: on the beat, on the eighths, all (long notes always). */
const GRILLA = [12, 6, 1];
/** A note this long (a dotted quarter or more) is a hold. */
const LARGO_SOSTENER = 18;

const raiz = nombre => midi(`${nombre}2`);

/** A part's bars, with the melody of each (quarters split in two eighths when the part plays `doble`). */
function barrasDe(def, parte) {
  return parte.frases.flatMap(f => def.frases[f]).map(([texto, acorde]) => {
    let notas = compas(texto);
    if (parte.doble) notas = notas.flatMap(n => (n.largo === 12 ? [{ ...n, largo: 6 }, { ...n, tick: n.tick + 6, largo: 6 }] : [n]));
    return { notas, acorde };
  });
}

/**
 * The song from its score (songs.js): its bars (time, tempo, part, chord), the notes the player
 * plays and the music's events ({ banda, guitarra }), all in seconds from the start of the audio.
 */
export function cancion(def) {
  const compases = [];
  let t = PREROLL;
  const agregar = (b) => {
    const dur = 4 * 60 / b.bpm;
    compases.push({ i: compases.length, t, dur, ...b });
    t += dur;
  };
  const p0 = def.partes[0];
  const r0 = raiz(def.frases[p0.frases[0]][0][1]);
  for (let k = 0; k < INTRO; k++) agregar({ bpm: p0.bpm, seccion: -1, acorde: r0, tipo: 'intro', estilo: p0.estilo, notas: [] });
  const partes = def.partes.map((parte, s) => {
    const desde = compases.length;
    const barras = barrasDe(def, parte);
    barras.forEach((b, k) => agregar({ bpm: parte.bpm, seccion: s, acorde: raiz(b.acorde), estilo: parte.estilo, nivel: parte.nivel,
      tipo: k === barras.length - 1 ? 'relleno' : 'tema', frase: Math.floor(k / 4), notas: b.notas }));
    return { s, bpm: parte.bpm, nivel: parte.nivel, estilo: parte.estilo, desde, hasta: compases.length };
  });
  const ult = def.partes.at(-1);
  agregar({ bpm: ult.bpm, seccion: def.partes.length - 1, acorde: raiz(def.final.acorde), tipo: 'final', estilo: ult.estilo, notas: [{ tick: 0, largo: 36, midi: midi(def.final.nota) }] });
  const duracion = t + 1.5;

  // The lead guitar plays every note of the melody
  const guitarra = [];
  for (const bar of compases) {
    const tick = bar.dur / BAR;
    for (const n of bar.notas) guitarra.push({ t: bar.t + n.tick * tick, dur: n.largo * tick, midi: n.midi, tipo: 'lead' });
  }

  // The notes to play: the melody notes of the part's level; lanes by pitch within each phrase
  const candidatas = [];
  for (const bar of compases) {
    if (bar.tipo === 'intro') continue;
    const tick = bar.dur / BAR;
    const grilla = bar.tipo === 'final' ? 1 : GRILLA[bar.nivel];
    for (const n of bar.notas) {
      if (n.tick % grilla && n.largo < LARGO_SOSTENER) continue;
      candidatas.push({ t: bar.t + n.tick * tick, dur: n.largo * tick, largo: n.largo, midi: n.midi, seccion: bar.seccion, frase: `${bar.seccion}:${bar.frase ?? 'f'}` });
    }
  }
  const rangos = new Map();
  for (const n of candidatas) {
    const r = rangos.get(n.frase) || { lo: Infinity, hi: -Infinity };
    r.lo = Math.min(r.lo, n.midi); r.hi = Math.max(r.hi, n.midi);
    rangos.set(n.frase, r);
  }
  const notas = [];
  let antes = null; // the last note kept: its lane and when the thumb is free again
  for (const x of candidatas) {
    const { lo, hi } = rangos.get(x.frase);
    const c = hi === lo ? 1 : Math.min(CARRILES - 1, Math.floor(((x.midi - lo) / (hi - lo + 1)) * CARRILES));
    const n = { t: x.t, c, midi: x.midi, seccion: x.seccion };
    if (x.largo >= LARGO_SOSTENER && x.dur * 0.85 >= SOSTENER_MIN) n.fin = x.t + x.dur * 0.85;
    if (antes) {
      const libre = antes.fin ?? antes.t;
      if (n.t - libre < HUECO[Math.abs(n.c - antes.c)]) {
        // Too quick for the thumb: the same pad as before, if there is time for that, else not played
        if (n.t - libre >= HUECO[0] && antes.fin == null) n.c = antes.c;
        else continue;
      }
    }
    notas.push(n);
    antes = n;
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

  return { id: def.id, def, compases, partes, notas, musica: { banda: banda(compases, partes), guitarra }, duracion };
}

/**
 * The band, as events: { t, tipo, midi?, dur?, v? }. tipo is kick, snare, hat, open (an open hat),
 * crash, stick, bass, chord (a power chord) or mute (a palm-muted one). Four drum styles: suave (a
 * half-time beat), rock, duro (driving eighths) and galope (the metal gallop).
 */
function banda(compases, partes) {
  const ev = [];
  for (const bar of compases) {
    const tick = bar.dur / BAR;
    const at = (k, tipo, extra = {}) => ev.push({ t: bar.t + k * tick, tipo, ...extra });
    const r = bar.acorde;
    if (bar.tipo === 'intro') {
      if (bar.i === 0) { at(0, 'kick'); at(0, 'crash', { v: 0.7 }); at(0, 'chord', { midi: r, dur: bar.dur * 0.9 }); at(0, 'bass', { midi: r - 12, dur: bar.dur * 0.9 }); }
      else for (let k = 0; k < 4; k++) at(k * 12, 'stick', { cuenta: k + 1 });
      continue;
    }
    if (bar.tipo === 'final') {
      at(0, 'kick'); at(0, 'crash'); at(0, 'chord', { midi: r, dur: bar.dur * 1.4 }); at(0, 'bass', { midi: r - 12, dur: bar.dur * 1.4 });
      for (const k of [36, 39, 42, 45]) at(k, 'snare', { v: 0.5 });
      continue;
    }
    const parte = partes[bar.seccion];
    if (bar.i === parte.desde) at(0, 'crash');
    const e = bar.estilo;
    // Drums
    if (e === 'suave') {
      at(0, 'kick'); at(30, 'kick', { v: 0.7 }); at(24, 'snare');
      for (let k = 0; k < BAR; k += 6) at(k, 'hat', { v: k % 12 ? 0.35 : 0.6 });
    } else if (e === 'rock') {
      for (const k of [0, 18, 24, 30]) at(k, 'kick', { v: k % 24 ? 0.8 : 1 });
      at(12, 'snare'); at(36, 'snare');
      for (let k = 0; k < BAR; k += 6) at(k, k === 42 ? 'open' : 'hat', { v: k % 12 ? 0.4 : 0.75 });
    } else if (e === 'duro') {
      for (let k = 0; k < BAR; k += 6) at(k, 'kick', { v: k % 12 ? 0.75 : 1 });
      at(12, 'snare'); at(36, 'snare');
      for (let k = 0; k < BAR; k += 3) at(k, 'hat', { v: k % 6 ? 0.3 : 0.6 });
    } else {
      for (let b = 0; b < 4; b++) for (const k of [0, 6, 9]) at(b * 12 + k, 'kick', { v: k ? 0.8 : 1 });
      at(12, 'snare'); at(36, 'snare');
      for (let k = 0; k < BAR; k += 6) at(k, 'hat', { v: 0.5 });
      if (bar.i % 2 === 0) at(0, 'crash', { v: 0.45 });
    }
    if (bar.tipo === 'relleno') for (let k = 36; k < BAR; k += 3) at(k, 'snare', { v: 0.45 + (k - 36) / 22 });
    // Bass and rhythm guitar: a power chord on the bar's root
    const b = r - 12;
    if (e === 'suave') {
      at(0, 'bass', { midi: b, dur: tick * 22 }); at(24, 'bass', { midi: b, dur: tick * 22 });
      at(0, 'chord', { midi: r, dur: tick * 44, v: 0.8 });
    } else if (e === 'galope') {
      for (let k = 0; k < 4; k++) for (const x of [0, 6, 9]) { at(k * 12 + x, 'bass', { midi: b, dur: tick * 2.6 }); at(k * 12 + x, 'mute', { midi: r, dur: tick * 2.4 }); }
    } else {
      const paso = e === 'duro' ? 3 : 6;
      for (let k = 0; k < BAR; k += 6) at(k, 'bass', { midi: b + (k === 42 ? 7 : 0), dur: tick * 5 });
      at(0, 'chord', { midi: r, dur: tick * 11 });
      at(24, 'chord', { midi: r, dur: tick * 5 });
      for (let k = 12; k < BAR; k += paso) if (k !== 24) at(k, 'mute', { midi: r, dur: tick * (paso - 0.5) });
    }
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
    partes: c.partes.map(() => ({ peso: 0, n: 0 })),
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
