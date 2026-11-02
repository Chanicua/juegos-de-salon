/**
 * Registro de los juegos de La Copa. Cada uno: `generar(código, día)` (motor puro, igual
 * en todos los celulares), `montar(raíz, ctx)` (su pantalla) y `resultado(estado)` →
 * { s: puntaje, t: tarjeta, resumen }.
 * Opcionales: `ejemplo` (el dibujo de cómo se juega), `portada` (lo de arriba de la antesala),
 * `titulo` (el nombre en la antesala), `entrada` (cuánto dura su animación de entrada, que no es
 * tiempo de juego), `pruebaCompleta` (la prueba es igual de larga y difícil que el juego), `caro`
 * (armarlo tarda: la antesala lo deja listo mientras se lee), `pantallaCompleta` and `clock` (the
 * play head shows the elapsed time: speed scores and there is no countdown, D-384).
 *
 * Agregar un juego: su motor y su pantalla en esta carpeta, su texto en JUEGOS_COPA de
 * rules.js y una entrada acá. Para que se pueda elegir en una copa, sumarlo a POZO (engine.js).
 *
 * Only the game being played loads (D-468): `CODE` says how to fetch each game's engine and screen
 * (literal `import()`s, so tools/e2e/affected.mjs still sees what a page can load), and `loadGame(id)`
 * fetches it and registers it in `JUEGOS`, which starts empty. A screen that needs a game awaits
 * `loadGame(id)` first; a game's screen that has its own stylesheet loads it itself (load-css.js).
 */
import { LETRAS, VARIANTES } from '../engine.js';

/**
 * El código con que se arma la sesión de prueba (D-103): otro, derivado del de la copa, para que
 * el contenido sea distinto del de verdad pero igual para todos los que prueban.
 */
export const codigoEnsayo = codigo => [...codigo].map(l => LETRAS[(LETRAS.indexOf(l) + 7) % LETRAS.length]).join('');

/** Una temática que la copa no usa: probar Línea o ¿En qué año? no puede adelantar cartas. */
const temaLibre = (mazos, codigo, aud = null) => {
  const usados = Object.values(mazos.temasDeLaCopa(codigo, { aud }));
  return mazos.decksDe({ aud }).map(d => d.id).find(id => !usados.includes(id));
};

/**
 * The games that came from the lab (D-331). Their engine brings `generarDia(código, día, { variante, sal, lang })`
 * and their screen, besides the usual, may bring `desglose(estado, { T, fmt, mmss, copa })` (how the score
 * was reached) and `selector({ el, T, SFX, variante, cambiar })` (its own way of choosing the variant in
 * the waiting room; without it, the usual buttons). `portada({ variante })` and `ejemplo({ el, T, variante })`
 * get the variant too. The trial (D-103) is the same game with another code: `ensayo: true` lets the engine
 * make it shorter.
 */
const delLab = (id, motor, ui) => ({
  ...juego(motor, ui),
  generar: (c, d, o = {}) => motor.generarDia(c, d, o),
  ensayo: (c, d, o = {}) => motor.generarDia(codigoEnsayo(c), d, { ...o, sal: 'ensayo', ensayo: true }),
  variantes: VARIANTES[id] || null, selector: ui.selector, desglose: ui.desglose, puntajeDia: motor.puntajeDia,
});

const juego = (motor, ui, ensayo) => ({ generar: motor.generar, montar: ui.montar, resultado: ui.resultado, ejemplo: ui.ejemplo, portada: ui.portada, titulo: ui.titulo, entrada: ui.entrada, pruebaCompleta: !!ui.pruebaCompleta, caro: !!ui.caro, pantallaCompleta: !!ui.pantallaCompleta, clock: !!ui.clock, simulando: ui.simulando, ensayo });

/**
 * `generar(código, día, opciones)` y `ensayo(código, día, opciones)` reciben el idioma (D-170):
 * `lang`, el de quien juega, para los textos (hitos, ciudades), y `palabras`, el de la copa, para
 * las palabras que todos tienen que jugar iguales (Conexiones, Agentes y Palabra). Sin `palabras`, `lang`.
 */
export const JUEGOS = {};

/** Each game's code: [engine, screen], and for the timeline games the decks (mazos.js). */
const CODE = {
  linea: () => Promise.all([import('./timeline/engine.js'), import('./timeline/ui.js'), import('./mazos.js')]),
  numero: () => Promise.all([import('./number/engine.js'), import('./number/ui.js')]),
  conexiones: () => Promise.all([import('./connections/engine.js'), import('./connections/ui.js')]),
  reinas: () => Promise.all([import('./queens/engine.js'), import('./queens/ui.js')]),
  letras: () => Promise.all([import('./word/engine.js'), import('./word/ui.js')]),
  zip: () => Promise.all([null, import('./zip/ui.js')]),
  desenredo: () => Promise.all([null, import('./untangle/ui.js')]),
  tango: () => Promise.all([import('./tango/engine.js'), import('./tango/ui.js')]),
  anio: () => Promise.all([import('./year/engine.js'), import('./year/ui.js'), import('./mazos.js')]),
  donde: () => Promise.all([import('./where/engine.js'), import('./where/ui.js')]),
  caso: () => Promise.all([import('./case/engine.js'), import('./case/ui.js')]),
  rutas: () => Promise.all([import('./routes/engine.js'), import('./routes/ui.js')]),
  loteo: () => Promise.all([import('./plots/engine.js'), import('./plots/ui.js')]),
  pintaminas: () => Promise.all([import('./paint-mines/engine.js'), import('./paint-mines/ui.js')]),
  agentes: () => Promise.all([import('./agents/engine.js'), import('./agents/ui.js')]),
  puentes: () => Promise.all([import('./bridges/engine.js'), import('./bridges/ui.js')]),
  stick: () => Promise.all([import('./stick/engine.js'), import('./stick/ui.js')]),
  stack: () => Promise.all([import('./stack/engine.js'), import('./stack/ui.js')]),
  final: () => Promise.all([import('./final/engine.js'), import('./final/ui.js')]),
};
CODE.trio = CODE.final;

/** The games a game plays inside it: the final and a day of three play the others' rounds. */
const INSIDE = { final: Object.keys(CODE).filter(id => id !== 'final' && id !== 'trio') };
INSIDE.trio = INSIDE.final;

/** How each game is registered once its code is here. */
const BUILD = {
  linea: ([linea, ui, mazos]) => juego(linea, ui, (c, d, o = {}) => linea.generar(codigoEnsayo(c), d, { n: 5, tema: temaLibre(mazos, c, o.aud), sal: 'ensayo', lang: o.lang, aud: o.aud })),
  numero: ([numero, ui]) => juego(numero, ui, (c, d) => numero.generar(codigoEnsayo(c), d, { cifras: 3, sal: 'ensayo' })),
  conexiones: ([conexiones, ui]) => juego(conexiones, ui, (c, d, o) => conexiones.ensayo(c, d, o)),
  reinas: ([reinas, ui]) => juego(reinas, ui, (c, d) => reinas.generar(codigoEnsayo(c), d, { n: 5, sal: 'ensayo' })),
  letras: ([letras, ui]) => juego(letras, ui, (c, d, o = {}) => {
    const real = letras.generar(c, d, o).secreto;
    for (let k = 0; ; k++) { const p = letras.generar(codigoEnsayo(c), d, { ...o, sal: `ensayo-${k}` }); if (p.secreto !== real) return p; }
  }),
  // Zip se arma nivel por nivel dentro de la pantalla: lo generado es solo la semilla del día (D-103)
  zip: ([, ui]) => ({ generar: (codigo, dia) => ({ codigo, dia }), montar: ui.montar, resultado: ui.resultado, ejemplo: ui.ejemplo, ensayo: (c, d) => ({ codigo: codigoEnsayo(c), dia: d, tiempo: 60 * 1000 }) }),
  // Como Zip: los niveles se arman dentro de la pantalla y lo generado es solo la semilla del día (D-179)
  desenredo: ([, ui]) => ({ generar: (codigo, dia) => ({ codigo, dia }), montar: ui.montar, resultado: ui.resultado, ejemplo: ui.ejemplo, ensayo: (c, d) => ({ codigo: codigoEnsayo(c), dia: d, tiempo: 60 * 1000 }) }),
  tango: ([tango, ui]) => juego(tango, ui, (c, d) => tango.generar(codigoEnsayo(c), d, { sal: 'ensayo' })),
  anio: ([anio, ui, mazos]) => juego(anio, ui, (c, d, o = {}) => anio.generar(codigoEnsayo(c), d, { n: 2, tema: temaLibre(mazos, c, o.aud), sal: 'ensayo', lang: o.lang, aud: o.aud })),
  // Dos ciudades que no son las del día: la prueba no puede adelantar ninguna
  donde: ([donde, ui]) => juego(donde, ui, (c, d, o = {}) => donde.generar(codigoEnsayo(c), d, { niveles: [1, 2], sal: 'ensayo', aud: o.aud, sin: donde.generar(c, d, { aud: o.aud }).ciudades })),
  // En el laboratorio (D-257): se juega suelto y en la práctica, pero no está en POZO, así que una copa todavía no lo elige
  caso: ([caso, ui]) => juego(caso, ui, (c, d) => caso.generar(codigoEnsayo(c), d, { sal: 'ensayo' })),
  rutas: ([m, ui]) => delLab('rutas', m, ui),
  loteo: ([m, ui]) => delLab('loteo', m, ui),
  pintaminas: ([m, ui]) => delLab('pintaminas', m, ui),
  // Out of the lab in D-421, in Conexiones' place: its words are the cup's language, like Conexiones'
  agentes: ([m, ui]) => delLab('agentes', m, ui),
  // 🚅 Tren en Vilo, out of the lab in D-456: in POZO since then (before, only the owner's one-day cup of 2026-10-25)
  puentes: ([m, ui]) => delLab('puentes', m, ui),
  stick: ([m, ui]) => delLab('stick', m, ui),
  stack: ([m, ui]) => delLab('stack', m, ui),
  final: ([final, uiFinal]) => ({
    ...juego(final, uiFinal),
    // A round with no short version is the game whole, built with its own generator for the final
    // day (D-418); Conexiones, whose grid is fixed per cup, plays another grid
    generar: (c, d, o = {}) => final.generar(c, d, { ...o, otro: (id, x) => JUEGOS[id].generar(c, d, { ...x, ...(id === 'conexiones' ? { grilla: MODULES.conexiones[0].grillaFinal(c, { lang: x.palabras, aud: x.aud }) } : {}) }) }),
    // The trial: the same rounds, the short ones with the trial code and the others in their trial size
    ensayo: (c, d, o = {}) => final.generar(codigoEnsayo(c), d, { ...o, otro: (id, x) => JUEGOS[id].ensayo(c, d, x) }),
    montar: (raiz, ctx) => uiFinal.montar(raiz, { ...ctx, juegos: JUEGOS }),
  }),
  // A weekend cup's day of three (D-439): the final's screen, with the three games whole, each with
  // its own content for that day; the score is the average of the three, from 0 to 100
  trio: ([final, uiFinal]) => ({
    ...juego(final, uiFinal),
    generar: (c, d, o = {}) => final.generar(c, d, { ...o, enteras: true, otro: (id, x) => JUEGOS[id].generar(c, d, x) }),
    ensayo: (c, d, o = {}) => final.generar(codigoEnsayo(c), d, { ...o, enteras: true, otro: (id, x) => JUEGOS[id].ensayo(c, d, x) }),
    montar: (raiz, ctx) => uiFinal.montar(raiz, { ...ctx, juegos: JUEGOS }),
  }),
};

/** Every game's id, known without loading any. */
export const GAME_IDS = Object.keys(BUILD);

const MODULES = {};
const loading = {};

/** A loaded game's engine module (desglose.js uses it for its sums), or undefined if not loaded. */
export const engineOf = id => MODULES[id]?.[0];

/**
 * Fetches a game's code, with the games it plays inside it, and registers it in `JUEGOS`. Resolves
 * with the game, or undefined for an id that is not a Cup game. Each game is fetched once.
 */
export function loadGame(id) {
  if (JUEGOS[id]) return Promise.resolve(JUEGOS[id]);
  if (!BUILD[id]) return Promise.resolve(undefined);
  loading[id] ||= (async () => {
    const [mods] = await Promise.all([CODE[id](), ...(INSIDE[id] || []).map(loadGame)]);
    MODULES[id] = mods;
    JUEGOS[id] = BUILD[id](mods);
    return JUEGOS[id];
  })().catch(e => { delete loading[id]; throw e; });
  return loading[id];
}

/** Every game at once: the tests, and the end-to-end scripts that generate a game themselves. */
export const loadAll = () => Promise.all(GAME_IDS.map(loadGame)).then(() => JUEGOS);
