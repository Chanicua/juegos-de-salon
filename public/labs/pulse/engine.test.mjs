// Pulso's engine and songs (lab): every bar of every score adds up; each song is the same every
// time, gets faster and denser part by part, keeps the one-finger rules (never two notes at once,
// room for the thumb to move, nothing while a hold is held), and its notes are its melody; the
// audio files exist, light enough for git; and the judging, the multiplier, the energy and the end
// work as the cover says.
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import {
  cancion, nuevaPartida, tocar, soltar, avanzar, juzgar, precision, maximo, tarjeta, multiplicador,
  INTRO, PREROLL, HUECO, SOSTENER_MIN, VENTANAS, VENTANAS_SOLTAR, ENERGIA, PUNTOS, CARRILES,
} from './engine.js';
import { CANCIONES, cancionPorId, compas, midi } from './songs.js';

// The score's notation
assert.equal(midi('A4'), 69);
assert.equal(midi('C#4'), 61);
assert.equal(midi('Bb3'), 58);
assert.deepEqual(compas('B3:8 C#4:8 r:4 F#4:2').map(n => [n.tick, n.largo]), [[0, 6], [6, 6], [24, 24]]);
assert.throws(() => compas('A4:4 A4:4'), /24 ticks/);
assert.throws(() => compas('H4:4 A4:2.'), /not one/);

assert.equal(new Set(CANCIONES.map(c => c.id)).size, CANCIONES.length, 'two songs with the same id');
assert.ok(CANCIONES.every((c, i) => !i || c.dificultad >= CANCIONES[i - 1].dificultad), 'the songs go from easy to hard');
assert.equal(cancionPorId('quinta').autor, 'Beethoven');
assert.equal(cancionPorId('nada'), null);

for (const def of CANCIONES) {
  const c = cancion(def);
  // Every bar of the score adds up (compas() throws otherwise), and the song is the same every time
  assert.deepEqual(cancion(def).notas, c.notas, `${def.id}: not the same twice`);
  assert.ok(c.duracion > 90 && c.duracion < 150, `${def.id}: ${c.duracion.toFixed(0)} s`);
  assert.equal(c.compases[0].t, PREROLL, `${def.id}: the audio's first sound is at PREROLL`);
  assert.ok(c.notas[0].t >= c.compases[INTRO].t - 1e-9, `${def.id}: a note during the count-in`);
  // Faster part by part
  for (let s = 1; s < c.partes.length; s++) assert.ok(c.partes[s].bpm > c.partes[s - 1].bpm, `${def.id}: part ${s + 1} is not faster`);
  // One finger: in order, never two at once, room to move, a hold leaves room for what follows
  for (let i = 1; i < c.notas.length; i++) {
    const x = c.notas[i - 1], y = c.notas[i];
    assert.ok(y.t > x.t, `${def.id}: two notes at once`);
    assert.ok(y.c >= 0 && y.c < CARRILES);
    const libre = x.fin ?? x.t;
    assert.ok(y.t - libre >= HUECO[Math.abs(y.c - x.c)] - 1e-9, `${def.id}: note ${i} comes ${((y.t - libre) * 1000).toFixed(0)} ms after the thumb is free`);
  }
  for (const n of c.notas) if (n.fin != null) assert.ok(n.fin - n.t >= SOSTENER_MIN - 1e-9, `${def.id}: a hold too short to read`);
  assert.ok(c.notas.some(n => n.fin != null), `${def.id}: no holds`);
  assert.ok(c.notas.at(-1).fin != null, `${def.id}: it does not end on a long note`);
  // Harder to the end: more notes per second in the last part than in the first
  const densidad = s => {
    const bars = c.compases.filter(b => b.seccion === s && b.tipo !== 'final');
    return c.notas.filter(n => n.seccion === s).length / bars.reduce((x, b) => x + b.dur, 0);
  };
  assert.ok(densidad(c.partes.length - 1) > densidad(0) * 1.2, `${def.id}: the last part (${densidad(c.partes.length - 1).toFixed(2)}/s) is not harder than the first (${densidad(0).toFixed(2)}/s)`);
  // The notes are the melody: each one is a note the lead guitar plays, at that time and pitch
  const lead = new Map(c.musica.guitarra.map(e => [e.t.toFixed(4), e.midi]));
  for (const n of c.notas) assert.equal(lead.get(n.t.toFixed(4)), n.midi, `${def.id}: a note at ${n.t.toFixed(2)} s that the guitar does not play`);
  // All three pads are used
  for (let k = 0; k < CARRILES; k++) assert.ok(c.notas.filter(n => n.c === k).length > c.notas.length / 10, `${def.id}: pad ${k} is almost never used`);
  // The band plays all along, inside the audio
  assert.ok(c.musica.banda.length > 800 && c.musica.banda.every(e => e.t >= PREROLL && e.t < c.duracion));
  // Its two audio files, made by tools/generators/pulse/render.mjs, under git's 5 MB (D-494)
  for (const parte of ['banda', 'guitarra']) {
    const { size } = statSync(new URL(`songs/${def.id}-${parte}.mp3`, import.meta.url));
    assert.ok(size > 200_000 && size < 5_000_000, `${def.id}-${parte}.mp3: ${size} bytes`);
  }
}

// Judging
assert.equal(juzgar(0), 'perfecto');
assert.equal(juzgar(-VENTANAS.perfecto), 'perfecto');
assert.equal(juzgar(VENTANAS.bien), 'bien');
assert.equal(juzgar(-VENTANAS.casi), 'casi');
assert.equal(juzgar(VENTANAS.casi + 0.01), null);
assert.equal(multiplicador(0), 1);
assert.equal(multiplicador(9), 1);
assert.equal(multiplicador(10), 2);
assert.equal(multiplicador(500), 4);

const a = cancion(CANCIONES[0]);

// A perfect game: every note hit, every hold released on time, the song complete
for (const def of CANCIONES) {
  const c = cancion(def);
  const p = nuevaPartida(c);
  for (const n of c.notas) {
    avanzar(p, n.t);
    assert.equal(tocar(p, n.t, n.c).calif, 'perfecto');
    if (n.fin != null) { avanzar(p, n.fin); assert.equal(soltar(p, n.fin).calif, 'perfecto'); }
  }
  avanzar(p, c.duracion);
  assert.equal(p.fin, 'completa');
  assert.equal(p.cuenta.fallo, 0);
  assert.equal(precision(p), 100);
  assert.equal(p.puntos, maximo(c));
  assert.equal(tarjeta(p), '🟩'.repeat(c.partes.length));
}

// Tapping the wrong pad, or on nothing, breaks the run and hits nothing
{
  const p = nuevaPartida(a);
  const n = a.notas[0];
  assert.equal(tocar(p, n.t, (n.c + 1) % CARRILES).tipo, 'nada');
  assert.equal(p.racha, 0);
  // A bit late is still "bien"
  assert.equal(tocar(p, n.t + (VENTANAS.perfecto + VENTANAS.bien) / 2, n.c).calif, 'bien');
}

// A hold: let go too early or too late is a bad release; holding it pays per beat
{
  const i = a.notas.findIndex(n => n.fin != null && n.fin - n.t > 0.5);
  const n = a.notas[i];
  const juego = () => {
    const p = nuevaPartida(a);
    for (let k = 0; k < i; k++) { const m = a.notas[k]; tocar(p, m.t, m.c); if (m.fin != null) soltar(p, m.fin); }
    tocar(p, n.t, n.c);
    return p;
  };
  let p = juego();
  assert.equal(p.sosteniendo?.i, i);
  // While held, a tap is impossible (one finger)
  assert.equal(tocar(p, n.t + 0.1, n.c).tipo, 'nada');
  const r = soltar(p, n.t + 0.2);
  assert.equal(r.calif, null);
  assert.equal(r.motivo, 'antes');
  assert.equal(p.racha, 0);

  p = juego();
  const antes = p.puntos;
  assert.equal(soltar(p, n.fin + VENTANAS_SOLTAR.bien - 0.01).calif, 'bien');
  assert.ok(p.puntos > antes + PUNTOS.bien, 'the beats held pay too');

  // Holding past the end: time lets go for you, late
  p = juego();
  const sucesos = avanzar(p, n.fin + VENTANAS_SOLTAR.casi + 0.01);
  assert.equal(sucesos[0].tipo, 'soltar');
  assert.equal(sucesos[0].motivo, 'tarde');
  assert.equal(p.sosteniendo, null);
}

// Missing everything cuts the power before the end
{
  const p = nuevaPartida(a);
  let t = 0;
  while (!p.fin && t < a.duracion + 1) { avanzar(p, t); t += 0.05; }
  assert.equal(p.fin, 'apagon');
  assert.equal(p.energia, 0);
  assert.equal(p.cuenta.fallo, Math.ceil(ENERGIA.inicio / -ENERGIA.fallo));
  assert.ok(t < a.duracion / 2, 'the power goes out early when nothing is played');
  assert.equal(precision(p), 0);
  assert.match(tarjeta(p), /^🟥⬛+$/u);
}

console.log(`✓ Pulso: ${CANCIONES.length} songs (${CANCIONES.map(c => cancion(c).notas.length).join(', ')} notes), their scores, files and one-finger rules, judging, holds and the power cut`);
