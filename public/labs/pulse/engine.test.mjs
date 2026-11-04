// Pulso's engine (lab): the song is the same for a seed, it gets harder part by part, it keeps the
// one-finger rules (never two notes at once, room for the thumb to move, nothing while a hold is
// held), and the judging, the multiplier, the energy and the end work as the cover says.
import assert from 'node:assert/strict';
import {
  cancion, nuevaPartida, tocar, soltar, avanzar, juzgar, precision, maximo, tarjeta, multiplicador, bpmDe,
  SECCIONES, COMPASES, INTRO, HUECO, SOSTENER_MIN, VENTANAS, VENTANAS_SOLTAR, ENERGIA, PUNTOS, BPM_INICIO, BPM_FIN, CARRILES,
} from './engine.js';

// The same seed, the same song; another seed, another one
const a = cancion('2026-11-04');
assert.deepEqual(cancion('2026-11-04'), a);
assert.notDeepEqual(cancion('otra').notas.map(n => [n.t, n.c]), a.notas.map(n => [n.t, n.c]));

// The shape: the intro, nine parts of eight bars and the closing bar; between 2 and 3 minutes
assert.equal(a.compases.length, INTRO + SECCIONES * COMPASES + 1);
assert.equal(bpmDe(0), BPM_INICIO);
assert.equal(bpmDe(SECCIONES - 1), BPM_FIN);
for (let i = 1; i < a.compases.length; i++) assert.ok(a.compases[i].bpm >= a.compases[i - 1].bpm, 'the tempo never slows down');

for (const semilla of ['2026-11-04', 'a', 'b', 'c', 'rock', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15']) {
  const c = cancion(semilla);
  assert.ok(c.duracion > 120 && c.duracion < 180, `${semilla}: ${c.duracion.toFixed(0)} s`);
  // The first note comes after the count-in
  assert.ok(c.notas[0].t >= c.compases[INTRO].t - 1e-9, `${semilla}: a note during the intro`);
  // One finger: in order, never two at once, room to move, a hold leaves room for what follows
  for (let i = 1; i < c.notas.length; i++) {
    const x = c.notas[i - 1], y = c.notas[i];
    assert.ok(y.t > x.t, `${semilla}: two notes at once`);
    assert.ok(y.c >= 0 && y.c < CARRILES);
    const libre = x.fin ?? x.t;
    assert.ok(y.t - libre >= HUECO[Math.abs(y.c - x.c)] - 1e-9, `${semilla}: note ${i} comes ${((y.t - libre) * 1000).toFixed(0)} ms after the thumb is free`);
  }
  for (const n of c.notas) if (n.fin != null) assert.ok(n.fin - n.t >= SOSTENER_MIN - 1e-9, `${semilla}: a hold too short to read`);
  // Harder part by part: more notes per second in the last three than in the first three
  const densidad = s => {
    const bars = c.compases.filter(b => b.seccion === s && b.tipo !== 'final');
    return c.notas.filter(n => n.seccion === s).length / bars.reduce((x, b) => x + b.dur, 0);
  };
  const ini = (densidad(0) + densidad(1) + densidad(2)) / 3, fin = (densidad(6) + densidad(7) + densidad(8)) / 3;
  assert.ok(fin > ini * 1.8, `${semilla}: the end (${fin.toFixed(2)}/s) is not much harder than the start (${ini.toFixed(2)}/s)`);
  assert.ok(c.notas.some(n => n.fin != null), `${semilla}: no holds`);
  // The song ends on a long hold
  assert.ok(c.notas.at(-1).fin != null);
  // The band plays all along
  assert.ok(c.musica.length > 1000 && c.musica.every(e => e.t >= 0 && e.t < c.duracion));
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

// A perfect game: every note hit, every hold released on time, the song complete
{
  const p = nuevaPartida(a);
  for (const n of a.notas) {
    avanzar(p, n.t);
    const r = tocar(p, n.t, n.c);
    assert.equal(r.calif, 'perfecto');
    if (n.fin != null) { avanzar(p, n.fin); assert.equal(soltar(p, n.fin).calif, 'perfecto'); }
  }
  avanzar(p, a.duracion);
  assert.equal(p.fin, 'completa');
  assert.equal(p.cuenta.fallo, 0);
  assert.equal(precision(p), 100);
  assert.equal(p.puntos, maximo(a));
  assert.equal(tarjeta(p), '🟩'.repeat(SECCIONES));
  assert.equal(p.mejorRacha, a.notas.length + a.notas.filter(n => n.fin != null).length);
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
  assert.match(tarjeta(p), /^🟥⬛+$/);
}

console.log(`✓ Pulso: ${a.notas.length} notes in today's song, one-finger rules on 20 songs, judging, holds and the power cut`);
