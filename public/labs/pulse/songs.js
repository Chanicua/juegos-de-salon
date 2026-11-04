/**
 * Pulso — the songs: well-known melodies in the public domain (their composers died more than 70
 * years ago, the term in Chile, Ley 17.336), in our own rock arrangement. Nothing here comes from a
 * recording: tools/generators/pulse/render.mjs plays these scores with its own band and writes the
 * two audio files of each song (the band, and the lead guitar the player plays), and engine.js makes
 * the notes to play from the same score, so the music and the notes are the same.
 *
 * A bar is a string of notes: `B3:8` (B in octave 3, an eighth), `r:4` (a quarter rest). Lengths:
 * 1, 2., 2, 4., 4, 8., 8, 16. Each bar has a chord (its root, for the power chords and the bass).
 * A part plays some phrases at a tempo, with a level (which notes are played: on the beat, on the
 * eighths, all) and a drum style; parts get faster and denser to the end.
 */

/** Ticks per beat (engine.js): a bar of 4/4 has 48. */
const LARGOS = { '1': 48, '2.': 36, '2': 24, '4.': 18, '4': 12, '8.': 9, '8': 6, '16': 3 };
const NOTAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" → 61. */
export function midi(nombre) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(nombre);
  if (!m) throw new Error(`a note that is not one: ${nombre}`);
  return 12 * (Number(m[3]) + 1) + NOTAS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** A bar as notes: [{ tick, largo, midi }] (rests leave no note). Throws if it is not 48 ticks. */
export function compas(texto) {
  let tick = 0;
  const out = [];
  for (const tok of texto.trim().split(/\s+/)) {
    const [n, l] = tok.split(':');
    const largo = LARGOS[l];
    if (!largo) throw new Error(`a length that is not one: ${tok}`);
    if (n !== 'r') out.push({ tick, largo, midi: midi(n) });
    tick += largo;
  }
  if (tick !== 48) throw new Error(`a bar of ${tick} ticks: ${texto}`);
  return out;
}

export const CANCIONES = [
  {
    id: 'alegria',
    titulo: 'Himno de la alegría',
    autor: 'Beethoven',
    dificultad: 1,
    final: { acorde: 'E', nota: 'E4' },
    frases: {
      A: [['G#4:4 G#4:4 A4:4 B4:4', 'E'], ['B4:4 A4:4 G#4:4 F#4:4', 'B'], ['E4:4 E4:4 F#4:4 G#4:4', 'E'], ['G#4:4. F#4:8 F#4:2', 'B']],
      A2: [['G#4:4 G#4:4 A4:4 B4:4', 'E'], ['B4:4 A4:4 G#4:4 F#4:4', 'B'], ['E4:4 E4:4 F#4:4 G#4:4', 'E'], ['F#4:4. E4:8 E4:2', 'E']],
      B: [['F#4:4 F#4:4 G#4:4 E4:4', 'B'], ['F#4:4 G#4:8 A4:8 G#4:4 E4:4', 'E'], ['F#4:4 G#4:8 A4:8 G#4:4 F#4:4', 'B'], ['E4:4 F#4:4 B3:2', 'B']],
    },
    partes: [
      { bpm: 96, nivel: 0, estilo: 'suave', frases: ['A', 'A2'] },
      { bpm: 104, nivel: 1, estilo: 'rock', frases: ['B', 'A2'] },
      { bpm: 114, nivel: 1, estilo: 'rock', frases: ['A', 'A2'] },
      { bpm: 124, nivel: 2, estilo: 'duro', frases: ['B', 'A2'], doble: true },
      { bpm: 136, nivel: 2, estilo: 'duro', frases: ['A', 'A2'], doble: true },
      { bpm: 148, nivel: 2, estilo: 'galope', frases: ['B', 'A2'], doble: true },
    ],
  },
  {
    id: 'quinta',
    titulo: 'La Quinta',
    autor: 'Beethoven',
    dificultad: 2,
    final: { acorde: 'C', nota: 'C5' },
    frases: {
      M: [['r:8 G4:8 G4:8 G4:8 D#4:2', 'C'], ['r:8 F4:8 F4:8 F4:8 D4:2', 'G'], ['r:8 G4:8 G4:8 G4:8 D#4:8 G#4:8 G#4:8 G#4:8', 'C'], ['G4:8 D#5:8 D#5:8 D#5:8 C5:2', 'G#']],
      N: [['r:8 G4:8 G4:8 G4:8 D4:8 G#4:8 G#4:8 G#4:8', 'G'], ['G4:8 F5:8 F5:8 F5:8 D5:2', 'G'], ['r:8 G5:8 G5:8 F5:8 D#5:2', 'C'], ['r:8 F5:8 F5:8 D#5:8 D5:2', 'G']],
      H: [['r:8 A#4:8 A#4:8 A#4:8 D#5:2', 'D#'], ['F5:2 A#4:2', 'A#'], ['r:8 A#4:8 A#4:8 A#4:8 D#5:2', 'D#'], ['G5:4 F5:4 D#5:4 D5:4', 'A#']],
    },
    partes: [
      { bpm: 100, nivel: 1, estilo: 'suave', frases: ['M', 'N'] },
      { bpm: 110, nivel: 1, estilo: 'rock', frases: ['H', 'M'] },
      { bpm: 120, nivel: 2, estilo: 'rock', frases: ['M', 'N'] },
      { bpm: 132, nivel: 2, estilo: 'duro', frases: ['H', 'M'] },
      { bpm: 144, nivel: 2, estilo: 'duro', frases: ['M', 'N'] },
      { bpm: 158, nivel: 2, estilo: 'galope', frases: ['H', 'N'] },
    ],
  },
  {
    id: 'montana',
    titulo: 'En la gruta del rey de la montaña',
    autor: 'Grieg',
    dificultad: 3,
    final: { acorde: 'B', nota: 'B4' },
    frases: {
      A: [['B3:8 C#4:8 D4:8 E4:8 F#4:8 D4:8 F#4:4', 'B'], ['F4:8 C#4:8 F4:4 E4:8 C4:8 E4:4', 'F#'], ['B3:8 C#4:8 D4:8 E4:8 F#4:8 D4:8 F#4:8 B4:8', 'B'], ['A4:8 F#4:8 D4:8 F#4:8 A4:2', 'D']],
      P: [['F#4:8 G#4:8 A#4:8 B4:8 C#5:8 A#4:8 C#5:4', 'F#'], ['D5:8 A#4:8 D5:4 C#5:8 A#4:8 C#5:4', 'F#'], ['F#4:8 G#4:8 A#4:8 B4:8 C#5:8 A#4:8 C#5:8 F#5:8', 'F#'], ['E5:8 C#5:8 A#4:8 C#5:8 E5:2', 'F#']],
    },
    // It speeds up by itself, like the original: from a creep to a gallop
    partes: [
      { bpm: 84, nivel: 0, estilo: 'suave', frases: ['A', 'P'] },
      { bpm: 96, nivel: 0, estilo: 'suave', frases: ['A', 'P'] },
      { bpm: 108, nivel: 1, estilo: 'rock', frases: ['A', 'P'] },
      { bpm: 120, nivel: 1, estilo: 'rock', frases: ['A', 'P'] },
      { bpm: 134, nivel: 2, estilo: 'duro', frases: ['A', 'P'] },
      { bpm: 148, nivel: 2, estilo: 'duro', frases: ['A', 'P'] },
      { bpm: 162, nivel: 2, estilo: 'galope', frases: ['A', 'P'] },
      { bpm: 176, nivel: 2, estilo: 'galope', frases: ['A', 'P'] },
    ],
  },
  {
    id: 'turca',
    titulo: 'Marcha turca',
    autor: 'Mozart',
    dificultad: 4,
    final: { acorde: 'A', nota: 'A4' },
    frases: {
      T: [
        ['B3:16 A3:16 G#3:16 A3:16 C4:4 D4:16 C4:16 B3:16 C4:16 E4:4', 'A'],
        ['F4:16 E4:16 D#4:16 E4:16 B4:16 A4:16 G#4:16 A4:16 B4:16 A4:16 G#4:16 A4:16 C5:4', 'A'],
        ['A4:8 C5:8 B4:8 A4:8 G4:8 A4:8 B4:8 A4:8', 'C'],
        ['G4:8 A4:8 B4:8 A4:8 G4:8 F#4:8 E4:4', 'E'],
      ],
      U: [
        ['B3:16 A3:16 G#3:16 A3:16 C4:4 D4:16 C4:16 B3:16 C4:16 E4:4', 'A'],
        ['F4:16 E4:16 D#4:16 E4:16 B4:16 A4:16 G#4:16 A4:16 B4:16 A4:16 G#4:16 A4:16 C5:4', 'A'],
        ['A4:8 C5:8 B4:8 A4:8 G#4:8 A4:8 E4:8 F4:8', 'E'],
        ['D4:8 C4:8 B3:8 G#3:8 A3:2', 'A'],
      ],
    },
    partes: [
      { bpm: 80, nivel: 1, estilo: 'suave', frases: ['T', 'U'] },
      { bpm: 88, nivel: 1, estilo: 'rock', frases: ['T', 'U'] },
      { bpm: 96, nivel: 2, estilo: 'rock', frases: ['T', 'U'] },
      { bpm: 104, nivel: 2, estilo: 'duro', frases: ['T', 'U'] },
      { bpm: 112, nivel: 2, estilo: 'duro', frases: ['T', 'U'] },
      { bpm: 120, nivel: 2, estilo: 'galope', frases: ['T', 'U'] },
    ],
  },
];

export const cancionPorId = id => CANCIONES.find(c => c.id === id) || null;
