// El guardián de los cánones (D-213): ningún juego de GAMES se salta en silencio la estructura de
// C-2 (motor y sus tests, C-12), el gancho de pruebas de C-14 ni su especificación con la plantilla
// común de C-13. Mira los archivos de verdad, no lo que dice el registro.
// Los juegos de La Copa (SUELTOS) no pasan por aquí: los cubren cup.md y cup/games/juegos.test.mjs.
// La paridad de LOCALES (es, en, pt) tampoco: la revisa i18n.test.mjs.
// Uso: node public/assets/js/games.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { GAMES } from './games.js';

const RAIZ = new URL('../../../', import.meta.url);
const ruta = rel => new URL(rel, RAIZ);
const existe = rel => existsSync(ruta(rel));
const leer = rel => readFileSync(ruta(rel), 'utf8');

// Lo que un juego todavía no cumple, por id y por comprobación. Cada motivo cita la decisión que lo
// deja pendiente. Cuando el juego se pone al día, la excepción sobra y el test lo dice: se borra.
// Hoy no hay ninguna: Cuarto Rey, el último, se llevó al canon (D-213).
const EXCEPCIONES = {};

// La plantilla común de las especificaciones (C-13, D-213), en este orden; puede haber otras entre medio
const SECCIONES = ['Resumen', 'Reglas', 'Modos', 'Flujo', 'Protocolo de mensajes', 'Archivos', 'Excepciones a los cánones'];

// El gancho de C-14: `window.__algo = …` en el game.js del juego
function gancho(carpeta) {
  const archivo = `public/${carpeta}/game.js`;
  if (!existe(archivo)) return null;
  const m = leer(archivo).match(/^\s*window\.(__[A-Za-z_$][\w$]*)\s*=/m);
  return m ? m[1] : null;
}

// Cada comprobación devuelve null si pasa, o el motivo por el que falla
const COMPROBACIONES = {
  motor: c => existe(`public/${c}/engine.js`) ? null : `falta public/${c}/engine.js (C-2)`,
  'pruebas-del-motor': c => existe(`public/${c}/engine.test.mjs`) ? null : `falta public/${c}/engine.test.mjs (C-2, C-12)`,
  gancho: c => gancho(c) ? null : `public/${c}/game.js no expone un gancho window.__… para las pruebas (C-14)`,
  // A game in La Bodega lives in public/labs/<slug>/, but its spec is docs/games/<slug>.md (D-420)
  especificacion: (c, juego) => {
    const doc = `docs/games/${juego.slug || c}.md`;
    if (!existe(doc)) return `falta la especificación ${doc} (C-13)`;
    const texto = leer(doc);
    let desde = -1;
    for (const s of SECCIONES) {
      const re = new RegExp(`^## ${s}\\s*$`, 'gm');
      let m, en = -1;
      while ((m = re.exec(texto))) if (m.index > desde) { en = m.index; break; }
      if (en < 0) return `${doc}: falta "## ${s}" o no va en el orden de la plantilla (${SECCIONES.join(', ')}) (C-13, D-213)`;
      desde = en;
    }
    const g = gancho(c);
    if (g && !texto.includes(g)) return `${doc} no nombra el gancho ${g} (C-14, D-213)`;
    return null;
  },
};

// Las excepciones también se revisan: id que existe, comprobación que existe y una decisión citada
const ids = new Set(GAMES.map(g => g.id));
for (const [id, exc] of Object.entries(EXCEPCIONES)) {
  assert.ok(ids.has(id), `EXCEPCIONES: '${id}' no es un juego de GAMES; se borra la excepción`);
  for (const [nombre, motivo] of Object.entries(exc)) {
    assert.ok(COMPROBACIONES[nombre], `EXCEPCIONES['${id}']: '${nombre}' no es una comprobación (${Object.keys(COMPROBACIONES).join(', ')})`);
    assert.match(motivo, /D-\d+/, `EXCEPCIONES['${id}'].${nombre}: el motivo tiene que citar una decisión (D-n)`);
  }
}

const fallas = [], malos = [];
for (const g of GAMES) {
  const carpeta = g.path.replace(/\/$/, '');
  const exc = EXCEPCIONES[g.id] || {};
  const suyas = [], pendientes = [];
  for (const [nombre, comprobar] of Object.entries(COMPROBACIONES)) {
    const falla = comprobar(carpeta, g);
    if (exc[nombre]) {
      if (falla) pendientes.push(nombre);
      else suyas.push(`la excepción '${nombre}' ya no hace falta (la comprobación pasa): bórrala de EXCEPCIONES en games.test.mjs`);
    } else if (falla) suyas.push(falla);
  }
  const extra = pendientes.length ? ` (con excepción: ${pendientes.join(', ')})` : '';
  const g_ = gancho(carpeta);
  if (suyas.length) {
    console.log(`✗ ${g.id} (${carpeta}/)`);
    for (const f of suyas) console.log(`    ${f}`);
    fallas.push(...suyas.map(f => `${g.id}: ${f}`));
    malos.push(g.id);
  } else console.log(`✓ ${g.id} (${carpeta}/)${g_ ? ` · ${g_}` : ''}${extra}`);
}

assert.deepEqual(fallas, [], `${malos.length} juego(s) se saltan el canon: ${malos.join(', ')}`);
console.log(`games: los ${GAMES.length} juegos tienen motor, tests, gancho y especificación (o una excepción con su decisión)`);

// The "New" label (D-333): every game on the home page that was not there before D-333 brings the day it arrived
{
  const { PORTADA, esNuevo, DIAS_NUEVO, ordenPortada } = await import('./games.js');
  const YA_ESTABAN = ['copa', 'ahorcado', 'batalla-naval', 'toque-y-fama', 'linea-de-tiempo', 'dudo', 'julepe', 'cuarto-rey', 'generala',
    'conexiones', 'letras', 'anio', 'reinas', 'tango', 'zip', 'desenredo', 'donde', 'caso'];
  const sinFecha = PORTADA.filter(g => g.available && !YA_ESTABAN.includes(g.id) && !/^\d{4}-\d{2}-\d{2}$/.test(g.nuevoDesde || ''));
  assert.deepEqual(sinFecha.map(g => g.id), [], 'a new game on the home page brings `nuevoDesde: \'YYYY-MM-DD\'` (D-333)');
  const g = { nuevoDesde: '2026-10-15' };
  assert.ok(esNuevo(g, new Date('2026-10-15T09:00:00')), 'new from its day');
  assert.ok(esNuevo(g, new Date('2026-10-21T23:00:00')), `and for ${DIAS_NUEVO} days`);
  assert.ok(!esNuevo(g, new Date('2026-10-22T01:00:00')), 'and not after');
  assert.ok(!esNuevo(g, new Date('2026-10-14T23:00:00')), 'nor before');
  assert.ok(!esNuevo({}, new Date()), 'without a date it is not new');
  // D-335: while new, a game goes right after La Copa; afterwards, back to its place by popularity
  const juego = { id: 'zzz-nuevo', available: true, nuevoDesde: '2030-01-01' };
  const { GAMES: G } = await import('./games.js');
  G.push(juego);
  try {
    const dentro = ordenPortada(new Date('2030-01-02T12:00:00')).map(x => x.id);
    assert.deepEqual(dentro.slice(0, 2), ['copa', 'zzz-nuevo'], 'a new game goes right after La Copa');
    const despues = ordenPortada(new Date('2030-02-01T12:00:00')).map(x => x.id);
    assert.ok(despues.indexOf('zzz-nuevo') > 1, 'when the label goes, it goes back to its place by popularity');
  } finally { G.pop(); }
  console.log('games: the new ones carry their date for the "New" label (D-333)');
}

// Shinobi and Babel keep their "New" label 10 days from 2026-11-02 (the owner's request)
{
  const { esNuevo, PORTADA } = await import('./games.js');
  const assert = (await import('node:assert/strict')).default;
  for (const id of ['stick', 'stack']) {
    const g = PORTADA.find(x => x.id === id) || (await import('./games.js')).gameById?.(id);
    assert.ok(esNuevo(g, new Date('2026-11-11T23:00:00')), `${id}: New on its 10th day`);
    assert.ok(!esNuevo(g, new Date('2026-11-12T00:00:00')), `${id}: not on the 11th`);
  }
}
