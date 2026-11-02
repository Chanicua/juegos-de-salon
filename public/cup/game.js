/**
 * La Copa — pantallas. Lo único que toca el DOM (C-2).
 *
 * Una copa es un torneo de 3 o 7 días: cada día un juego igual para todos que se juega
 * una vez (ver docs/games/cup.md). Las reglas del torneo viven en engine.js; los datos en
 * el almacén (Firebase, o el de prueba con `?test`); cada juego se dibuja con su
 * módulo de juegos/ui-*.js.
 *
 * URL: /cup/ (portada) · /cup/?K7Q2X (una copa) · /cup/?K7Q2X&test (sin Firebase).
 * La misma pantalla sirve los juegos sueltos de la portada en /queens/ (D-149, D-162, D-198).
 */
import { crearArrastre } from '../assets/js/arrastre.js';
import { $, $$, el, con, conEmoji, vibrate, sparkles, keepAwake, confetti } from '../assets/js/ui.js';
import { applyStatic, COMMON, SITIO, LANGS, getLang, langToggle, withLang } from '../assets/js/i18n.js';
import { compartir as compartirAlChat, cabecera, lamina, laminaResultado, aArchivo, nombreArchivo, puntajeYTiempo, botonResultadoSolo, MARCO } from '../assets/js/compartir.js';
import { SFX, soundToggle, initSound } from '../assets/js/sound.js';
import { trackStart, versionOf, releaseOf, countryOf, trackVisit, trackFinish } from '../assets/js/transport/stats.js';
import { gameById, MODO_UNO_AL_DIA, slugDe, idDeSlug, esNuevo } from '../assets/js/games.js';
import { flag } from '../assets/js/flags.js';
import { factsLine } from '../assets/js/how-to-play-facts.js';
import { shareGrid } from '../assets/js/share-grid.js';
import { backGuard } from '../assets/js/back-guard.js';
import { param, tiene, nombres, BANDERAS, ALIAS as PARAMS_ANTES } from '../assets/js/parametros.js';
import {
  POZO, VARIANTES, entradaCal, varianteDelDia, calendarioAlAzar, calendario, MAX_JUGADORES, COPA_MAX, aliasLimpio, esAlias, CODIGO, esCodigo, codigoAlAzar, pidAlAzar, limpiarNombre, claveNombre, esPin, hashPin,
  fechaEn, sumarDias, nuevaMeta, diaActual, abierto, cerrado, terminada, inscripcionAbierta, estadoDia, comodinDe, comodinEfectivo, ultimoDiaComodin, moverInicio, sinEmpezar, pasarDia, MAX_DIAS_INICIO, faltaGente,
  medianoche, menosJuegos, provisoria, ultimoDiaVisto, marcaDelDia, puedeComodin, multiplicador, posicionesDelDia, tabla, desempate, faltan, fuera, enRiesgo, medallas, evolucion, visibleDia, reloj, pausaDeLectura, mmss, juegoDelDia, esFinal, finalRounds, diaDeCal, activos, ZONA, zonaDeIdioma,
  conCierre, cerradaAntes, anulado, puedeCerrar, semanaAlAzar, ESTILOS_SEMANA, tieneFinal, SIN_FINAL,
  findeAbierto, findeAlAzar, rondasDelDia, TRIO_SEP, estadoEnLista, recorteLista, porJugar,
} from './engine.js';
import { GAME_ID, LOCALES, juegosCopa, rondasFinal, conVariante, JUEGOS_COPA as JUEGOS_COPA_ES } from './rules.js';
import { createCuenta, juntarCopas } from './cuenta.js';
import { JUEGOS, loadGame } from './games/index.js';
import { audienciaDe } from './games/audiencia.js';
import { desglose } from './desglose.js';
import { imagenDeTabla, cabeceraTabla, colorDe, llegada } from './table-image.js';
import { planilla } from './planilla.js';
import { bloqueJugador, bloqueRanking, avisoPartida, bloqueCampeones, URL_RECORDS } from '../assets/js/ranking.js';
import { jugador, leerYo, rankingsVisibles } from '../assets/js/jugador.js';
import { crearAvisos } from './avisos.js';
import { fechaLocal, juegoDel, semillaDel, anotar as anotarUnoAlDia, leer as leerUnoAlDia, settleStarted, dailySave } from '../assets/js/uno-al-dia.js';
import { tarjetaResultado, rutaHoy, lockState, lockLine, empezarHoy } from '../assets/js/uno-al-dia-ui.js';
import { salidasFin } from '../assets/js/fin.js';
import { formularioComentario, abrirComentario, campoCorreo } from '../assets/js/labs-idioma.js';
import { enlaceBuzon, ponerBuzon, sinDoble } from '../assets/js/buzon.js';
import { cuentaRegresiva as cuentaComun } from '../assets/js/cuenta-regresiva.js';

// The four new One a Day share grids wait in the lab (D-508). lab: #seccion-uad-share-grids
let gridsNuevos = false;
flag('uad-share-grids').then(v => { gridsNuevos = v; });
// Inside a cup, the header's ‹ goes back to the cup's board while playing a day or reading its result,
// not to the menu (#1040). lab: #seccion-cup-back-board
let pillCopa = false;
flag('cup-back-board').then(v => { pillCopa = v; rotuloMenu(); });

// Cuenta la visita al abrir la página, aunque nadie llegue a jugar (D-208)
trackVisit();

/** `append` que descarta los hijos nulos, como `el()` (sin esto, un null se escribe como texto). */
const poner = (nodo, ...hijos) => nodo.append(...hijos.flat().filter(x => x !== null && x !== undefined && x !== false));

// La pantalla va en el idioma de quien mira (D-170). Las palabras de Conexiones y de Palabra van
// en el de la copa (`palabrasDe`), que es el mismo para todos.
const LANG = getLang();
const T = LOCALES[LANG] || LOCALES.es;
const JUEGOS_COPA = juegosCopa(LANG);
const RONDAS_FINAL = rondasFinal(LANG);
/** El idioma de las palabras de una copa; las de antes de D-170 no lo dicen y son en español. */
const palabrasDe = meta => meta?.lang || 'es';
/** "3º", o "#3" en inglés. */
const ord = n => fmt(T.ord, { n });
/** Los textos de los rankings, compartidos con /records/ (D-212). */
const RK = (COMMON[LANG] || COMMON.es).rk;
const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

// Los parámetros van en inglés (C-18, D-266); los de antes (`?prueba`, `?semilla=`) se leen igual
const busqueda = location.search.slice(1).split('&').filter(Boolean);
const PRUEBA = tiene('test');
// ?labs: se llegó desde el laboratorio, con la semilla a la vista y el botón para volver (D-101).
// La Copa de 3 días (D-100) se ofrece solo con ?three o en el modo de prueba (D-262).
// La página de un juego del laboratorio (/labs/case/, D-267) es del laboratorio sin que el link lo diga
const LABS = busqueda.includes('labs') || location.pathname.includes('/labs/');
const TRES = PRUEBA || tiene('three');
/** Las banderas de la URL, en inglés y como eran antes: ninguna es un juego ni el link de una copa. */
const BANDERAS_URL = ['labs', 'lab', ...Object.entries(BANDERAS).flat()];
// Los juegos sueltos de la portada viven en /<slug>/ (D-149, D-162, D-192, D-198): la misma
// pantalla, pero fuera de una copa el link no dice "copa". Cada uno tiene su página, que dice cuál
// es en `<body data-suelto="reinas">`, para que el link compartido traiga su propia tarjeta
// social. /cup/?practice=<juego>&labs queda para el laboratorio. En la URL, el juego va con su
// nombre en inglés (`queens`, D-266); el id de antes (`reinas`) se entiende igual.
const SUELTO = document.body.hasAttribute('data-suelto');
const PRACTICA = SUELTO
  ? document.body.dataset.suelto || idDeSlug(busqueda.find(x => !x.includes('=') && !BANDERAS_URL.includes(x)) || '')
  : (p => p && idDeSlug(p))(param('practice'));
/** La raíz del sitio, desde donde esté la página (las de cada juego van un nivel más abajo). */
const RAIZ = new URL('../', import.meta.url).href;
const SEMILLA = (param('seed') || '').toUpperCase();
/**
 * Uno al día (D-230): `?today` juega el desafío de hoy, el mismo para todos. La fecha y el juego los
 * calcula la página (no vienen en el link), así un link viejo abre el de hoy.
 */
const HOY = SUELTO && tiene('today');
/**
 * Dónde vive un juego suelto: su página, o la genérica si no tiene. Desde el laboratorio
 * también se juega ahí (D-164), con `?labs` y su semilla: así el link que se copia de la barra
 * trae la tarjeta del juego y no la de La Copa.
 */
const paginaSuelta = (id, { semilla, zipSeg, modo } = {}) => {
  const q = [LABS && !gameById(id)?.labs && 'labs', PRUEBA && 'test', semilla && `seed=${semilla}`, modo && `mode=${modo}`, zipSeg && `timer=${zipSeg}`].filter(Boolean).join('&');
  return gameById(id)?.suelto ? `${RAIZ}${gameById(id).path}${q ? `?${q}` : ''}` : `${RAIZ}cup/suelto/?${[slugDe(id), q].filter(Boolean).join('&')}`;
};
const semillaUrl = { semilla: SEMILLA, zipSeg: param('timer'), modo: param('mode') };
// Un link viejo (/cup/?practica=reinas, o /cup/suelto/?reinas) se va a su lugar nuevo. Los del
// laboratorio que no tienen página (Línea Relámpago, el número, la final) siguen en /cup/.
if (!SUELTO && PRACTICA && (!LABS || gameById(PRACTICA)?.suelto)) location.replace(paginaSuelta(PRACTICA, semillaUrl));
if (SUELTO && !document.body.dataset.suelto && gameById(PRACTICA)?.suelto) location.replace(paginaSuelta(PRACTICA, semillaUrl));
/**
 * A game launched by a flag (D-517) opens on its own page only once launched for this visitor (🚀
 * everyone, or 🧪 with a lab key): the answer this phone kept may be old, so a hidden one asks Firebase
 * before sending the visitor to the home page. Inside a cup and in Uno al día (`?today`, which deals it by
 * date) it always opens: they chose it for everyone alike, and a cup chose it when it
 * was out. lab: #seccion-stick, lab: #seccion-stack
 */
const LANZA = { stick: () => flag('stick'), stack: () => flag('stack') };
// Not awaited: the module must not pause halfway, its listeners need everything below defined
if (SUELTO && !HOY && gameById(PRACTICA)?.oculto) (LANZA[PRACTICA]?.() ?? Promise.resolve(false)).then(si => { if (!si) location.replace(RAIZ); }).catch(() => location.replace(RAIZ));
// En la genérica, el juego queda con su nombre en inglés: `?linea&hoy` → `?timeline-flash&today` (D-266)
if (SUELTO && !document.body.dataset.suelto && PRACTICA) {
  const q = location.search.slice(1).split('&').map(x => (!x.includes('=') && idDeSlug(x) === PRACTICA ? slugDe(PRACTICA) : x)).join('&');
  if (`?${q}` !== location.search) history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
}
// Las demos (D-110): solo en el modo de prueba, con el almacén local. La escena va en inglés (`&demo=podium`)
const DEMO = PRUEBA ? param('demo') : null;
const codigoUrl = (busqueda.find(x => CODIGO.test(x.toUpperCase()) && x.length === 5) || new URLSearchParams(location.search).get('c') || '').toUpperCase();
/** Palabras de la URL que no pueden ser el link de una copa: las banderas y los parámetros, en inglés y como eran antes. */
const RESERVADAS = [...BANDERAS_URL, ...Object.entries(PARAMS_ANTES).flat(), 'demo', 'copa', 'cup'];
// Un link propio: la palabra de la URL que no es un código ni un parámetro (D-121)
const aliasUrl = busqueda.filter(y => !y.includes('=') && !(CODIGO.test(y.toUpperCase()) && y.length === 5))
  .map(y => aliasLimpio(decodeURIComponent(y))).find(a => esAlias(a) && !RESERVADAS.includes(a)) || '';

const cuenta = createCuenta({ prueba: PRUEBA });
let store = null;
// La app instalada en iPhone abre con la copa y el jugador en la dirección, nunca el PIN (D-223)
const appPid = new URLSearchParams(location.search).get('app') || '';
// Un aviso abre la copa en su día (`&day=3`), o la silencia (`&mute`, el botón del aviso en
// Android, D-229). Se leen al cargar: el link propio de la copa reemplaza la dirección.
const diaAviso = Number(param('day')) || 0;
const silenciarAviso = tiene('mute');

async function abrirStore() {
  if (store) return store;
  store = PRUEBA
    ? (await import('./store-local.js')).createLocalStore()
    : (await import('./store-firebase.js')).createFirebaseStore();
  return store;
}

/** Estado de la pantalla: la copa abierta, quién soy en ella y qué se está mirando. */
const S = { code: null, L: null, yo: null, reentrar: null, pantalla: null, off: null, juego: null, tic: null, reloj: null };

// El link de una copa: su nombre propio si lo tiene (?pirata), si no su código. Sin &labs: la
// copa ya sabe por dentro si es del laboratorio (D-121)
const enlace = code => (S.code === code && S.L?.meta?.alias) || code;
const urlCopa = code => `${location.origin}${location.pathname}?${enlace(code)}${PRUEBA ? '&test' : ''}`;
const urlPublica = code => (PRUEBA ? urlCopa(code) : `https://juegosdesalon.cl/cup/?${enlace(code)}`);

// On a day's cover the top-left button goes back to the cup, and says so ("‹ La Copa")
const enCopa = () => !SUELTO && !!S.code && !S.juego?.practica;
const pillAlTablero = () => pillCopa && enCopa() && (S.pantalla === 'jugar' || S.pantalla === 'resultado');
// On a cup's board (or its other screens), ‹ goes up one level: La Copa's home with «Tus copas», not the menu
const pillAInicioCopa = () => pillCopa && enCopa() && !LABS && !pillAlTablero() && !S.antesala;
function rotuloMenu() {
  const aCopa = S.antesala || pillAlTablero();
  const aInicio = pillAInicioCopa();
  $('#btn-menu').textContent = aCopa ? `‹\u00a0${T.toBoard}` : aInicio ? `‹\u00a0${T.title}` : LABS ? T.backToLabsShort : T.menu;
  // A real address, so a long press or a new tab lands on the board too
  if (pillCopa) $('#btn-menu').setAttribute('href', aCopa && S.code ? urlCopa(S.code) : aInicio ? `${location.pathname}${PRUEBA ? '?test' : ''}` : LABS ? `${RAIZ}labs/` : RAIZ);
  // That button already names the cup: the "🏆 La Copa" chip steps aside, or at 320 px it is cut to "🏆 …" (U-12)
  document.body.classList.toggle('antesala', !!S.antesala || aInicio);
}

function mostrar(id) {
  S.pantalla = id;
  S.antesala = false;
  rotuloMenu();
  // Cada juego a pantalla completa (¿Dónde queda?) la pide de nuevo al montarse
  pantallaCompleta(false);
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
  window.scrollTo(0, 0);
}

/**
 * Un juego a pantalla completa (D-203) ocupa la ventana entera: la barra, el reloj y las reglas
 * plegadas flotan encima de él en vez de ir arriba y abajo de su caja.
 */
function pantallaCompleta(si) {
  document.body.classList.toggle('pantalla-completa', !!si);
  // The play head goes inside the bar, between back and sound: centered in the window it sat
  // over "‹ Laboratorio" (C-8). Outside full screen it goes back on top of the play screen.
  const head = $('#jugar-head'), barra = $('.topbar');
  if (si) barra.insertBefore(head, $('.tools', barra));
  else if (head.parentNode === barra) $('#screen-jugar').prepend(head);
  ajustarCabeza();
}

/**
 * The elapsed-time clock in the play head, only for a game whose speed scores and that has no
 * countdown of its own (`export const clock = true` in its ui.js, D-384); null for the rest (D-379).
 */
function mostrarReloj(head, mod, leer) {
  clearInterval(S.reloj);
  if (!mod.clock) return null;
  const cron = el('span', { class: 'cron' }, fmt(T.timer, { t: mmss(leer()) }));
  head.append(cron);
  S.reloj = setInterval(() => { if (S.pantalla === 'jugar') cron.textContent = fmt(T.timer, { t: mmss(leer()) }); }, 1000);
  return cron;
}

/** The board ended: the clock stops on the time it keeps. */
function pararMuestra(cron, leer) {
  clearInterval(S.reloj);
  if (cron) cron.textContent = fmt(T.timer, { t: mmss(leer()) });
}

/** If the head does not fit in the bar, the test pill shrinks to 🧪 and, if still not, goes. */
function ajustarCabeza() {
  const head = $('#jugar-head');
  head.classList.remove('justo', 'sin-chip');
  if (!document.body.classList.contains('pantalla-completa')) return;
  for (const c of ['justo', 'sin-chip']) {
    if (head.scrollWidth <= head.clientWidth) return;
    head.classList.add(c);
  }
}
addEventListener('resize', ajustarCabeza);

function errorDe(e) {
  const code = e?.code || e?.message;
  const mapa = {
    pin: 'errPinWrong', 'nombre-repetido': 'errRepetido', llena: 'errLlena', 'no-existe': 'errNoExiste',
    ventana: 'errVentana', 'ya-jugado': 'errYaJugado', comodin: 'errComodin', permiso: 'errPermiso',
    config: 'errConfig', offline: 'errOffline', busy: 'errOffline', cerrada: 'errCerrada',
    reporte: 'errReport', empezada: 'errEmpezada', terminada: 'errTerminada', faltan: 'needSecond', alias: 'errAlias', fin: 'errFin',
    espera: 'errEspera', 'pin-admin': 'errAdminPin',
  };
  if (!mapa[code]) console.error(e);
  return T[mapa[code] || 'errNet'];
}

/** Un aviso de error que se queda hasta que se toca (C-8b). */
function avisoError(caja, texto) {
  caja.textContent = texto;
  caja.classList.remove('shake'); void caja.offsetWidth; caja.classList.add('shake');
  SFX.error(); vibrate([40, 40, 40]);
}

// Las fechas en el idioma de quien mira o, en lo que va al grupo, en el de la copa (D-170).
// En inglés la coma va ("Thursday, October 1"); en español y portugués se saca
const LOCALE = { es: 'es-CL', en: 'en-US', pt: 'pt-BR' };
const fechaLarga = (ms, tz = ZONA, lang = LANG) => { const f = new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.es, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms)); return lang === 'en' ? f : f.replace(',', ''); };
/** El nombre de la zona horaria de una copa, para decirlo en palabras (D-113). */
const zonaTexto = tz => T.zones[tz] || T.zonesMore?.[tz] || fmt(T.zoneOther, { tz });
/**
 * The viewer's own time (D-521): when the phone's zone is not the cup's (hours apart now), the closing
 * times are said in the phone's hours too. Behind the create screen's flag, like the zones it brings.
 */
let horaPropia = false;
// A board already drawn when the flag arrives is drawn again, with the viewer's hours
flag('copa-crear').then(v => { horaPropia = v; if (v && L()?.meta && document.getElementById('tablero-body')?.childElementCount && !document.getElementById('tablero-body').closest('[hidden]')) tablero(); });
const zonaPropia = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) { return null; } })();
const horaEn = (ms, tz) => new Intl.DateTimeFormat(LOCALE[LANG] || LOCALE.es, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
const otraHora = meta => horaPropia && !!zonaPropia && !!meta?.tz && horaEn(Date.now(), meta.tz) !== horaEn(Date.now(), zonaPropia);
/** The last minute of a day (its window ends at midnight), in the viewer's hours. */
const cierreMio = b => horaEn(b - 60000, zonaPropia);
/** The cup's zone in one line; in another zone, with the viewer's hours (D-521). */
const lineaZona = meta => { const w = diaDeHoy(meta); return otraHora(meta)
  ? fmt(T.zoneYours, { zona: zonaTexto(meta.tz).replace(/\s*\(.*\)$/, ''), a: horaEn(w.a, zonaPropia), b: cierreMio(w.h) })
  : fmt(T.startZone, { zona: zonaTexto(meta.tz) }); };
/** Today's window of the cup, or the first day's before it starts: its hours, as the clocks are now. */
const diaDeHoy = meta => { const now = Date.now(); let w = meta.win[1]; for (let k = 1; k <= meta.days; k++) if (meta.win[k]?.a <= now) w = meta.win[k]; return w; };
const fechaCorta = (ms, tz = ZONA) => new Intl.DateTimeFormat(LOCALE[LANG] || LOCALE.es, { timeZone: tz, weekday: 'short', day: 'numeric' }).format(new Date(ms));

function faltaPara(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return fmt(T.inMin, { m });
  const h = Math.floor(m / 60);
  return h < 48 ? fmt(T.inHours, { h, m: m % 60 }) : fmt(T.inDays, { d: Math.floor(h / 24) });
}

/* ------------------------------------------------------------------ */
/* Portada                                                             */
/* ------------------------------------------------------------------ */

function portada() {
  mostrar('intro');
  const body = $('#intro-body');
  body.innerHTML = '';
  const err = el('div', { class: 'form-error', role: 'alert' });
  const input = el('input', { class: 'code', maxlength: '5', placeholder: T.codePlaceholder, autocomplete: 'off', autocapitalize: 'characters', 'aria-label': T.codeLabel });
  const ir = () => {
    const c = input.value.trim().toUpperCase();
    if (!esCodigo(c)) { avisoError(err, T.errCodigo); return; }
    location.search = `?${c}${PRUEBA ? '&test' : ''}${LABS ? '&labs' : ''}`;
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') ir(); });

  // "Tus copas": las de este celular de una; las del jugador que entró llegan después (D-220).
  // Las terminadas llevan su etiqueta y se esconden tras un interruptor que parte apagado (D-234)
  const mias = el('div', { class: 'panel', id: 'tus-copas' });
  let verTerminadas = false;
  // Where each cup in course stands for the player (code → { texto, clase, dia }), once read
  const estados = new Map();
  const pintarMias = lista => {
    mias.hidden = !lista.length;
    mias.innerHTML = '';
    const ahora = Date.now();
    const terminada = c => !!c.fin && ahora >= c.fin;
    const nTerminadas = lista.filter(terminada).length;
    // Prendido, las terminadas van al pie, junto al interruptor: las en curso no se mueven
    const visibles = [...lista.filter(c => !terminada(c)), ...(verTerminadas ? lista.filter(terminada).sort((a, b) => b.fin - a.fin) : [])];
    const interruptor = el('input', { type: 'checkbox', role: 'switch', id: 'ver-terminadas' });
    interruptor.checked = verTerminadas;
    interruptor.addEventListener('change', () => { SFX.tap(); verTerminadas = interruptor.checked; pintarMias(lista); document.getElementById('ver-terminadas')?.focus(); });
    poner(mias,
      el('p', { class: 'lead', style: 'margin-bottom:8px' }, T.mine),
      visibles.length ? null : el('p', { class: 'muted mias-vacia' }, T.mineNone),
      el('div', { class: 'mias' }, visibles.map(c => {
        const est = terminada(c) ? null : estados.get(c.code);
        const href = est?.dia ? `${urlCopa(c.code)}&day=${est.dia}` : urlCopa(c.code);
        // With its status, the line takes the place of "name · code", and the code goes by the cup's name
        if (est) return el('a', { class: `mia est-${est.clase}`, href },
          el('b', {}, c.copa || c.code, ' ', el('span', { class: 'mia-cod' }, c.code)),
          el('span', { class: 'mia-linea' }, est.texto), el('span', { class: 'go' }, '›'));
        return el('a', { class: 'mia' + (terminada(c) ? ' terminada' : ''), href },
          el('b', {}, c.copa || c.code, terminada(c) ? el('span', { class: 'etiqueta-fin' }, T.mineOver) : null),
          el('small', {}, `${c.nombre} · ${c.code}`), el('span', { class: 'go' }, '›'));
      })),
      nTerminadas ? el('label', { class: 'hoja-switch mias-switch', for: 'ver-terminadas' },
        el('span', {}, fmt(T.mineShowOver, { n: nTerminadas })), interruptor) : null);
  };
  let lista = cuenta.mias();
  const repintar = () => { if (mias.isConnected) pintarMias(lista); };
  // Each cup says whether the player has a day to play or is done for today (#seccion-copa-estado).
  // First from what this phone kept of each cup, so the line is there with the list; then each cup
  // is read again and the line corrected if it changed (a day played on another phone, the admin)
  const enCurso = c => !c.fin || Date.now() < c.fin;
  const ponerEstado = (code, Lc, pid, now) => {
    const est = textoEstado(estadoEnLista(Lc, pid, now));
    if (est) estados.set(code, est); else estados.delete(code);
  };
  for (const c of lista.filter(enCurso)) {
    const pid = cuenta.quien(c.code), Lc = cuenta.lista.leer(c.code);
    if (pid && Lc) ponerEstado(c.code, Lc, pid, Date.now());
  }
  pintarMias(lista);
  const leerCopa = async (st, c, pid, Lc = null) => {
    try {
      Lc ||= await st.leer(c.code);
      if (!Lc) return;
      cuenta.lista.guardar(c.code, copiaLista(Lc, pid, st.now()));
      cuenta.porJugar.guardar(c.code, porJugar(Lc, pid, st.now()));
      ponerEstado(c.code, Lc, pid, st.now());
      repintar();
    } catch (_) { /* without network the line stays as this phone last saw it */ }
  };
  // This phone's cups are read at once, without waiting for the player's cups from other phones
  abrirStore().then(st => Promise.all(lista.filter(enCurso).map(c => { const pid = cuenta.quien(c.code); return pid ? leerCopa(st, c, pid) : null; }))).catch(() => {});
  if (leerYo()) copasDelJugador().then(async suyas => {
    if (!suyas.length) return;
    lista = juntarCopas(cuenta.mias(), suyas);
    repintar();
    const st = await abrirStore();
    for (const c of suyas.filter(Boolean)) if (enCurso(c)) leerCopa(st, c, c.pid, c.L);
  }).catch(() => {});
  poner(body, 
    // El idioma se elige a mano, como en todos los juegos (C-3)
    el('div', { class: 'center' }, langToggle()),
    el('button', { class: 'btn btn--yellow', id: 'btn-crear', onClick: () => { SFX.tap(); crearCopa(); } }, T.create),
    mias,
    el('div', { class: 'panel' },
      el('div', { class: 'field' }, el('label', {}, T.haveCode), input),
      el('button', { class: 'btn btn--cyan btn--sm', style: 'width:100%', onClick: ir }, T.go),
      err),
    el('details', { class: 'panel' },
      el('summary', {}, T.howTitle),
      el('ol', { class: 'como' }, T.howItems.map(x => el('li', {}, x)))),
    // Los campeones de las copas terminadas (D-212): al final, para no empujar lo de crear o entrar
    rankingsVisibles() ? bloqueCampeones() : null,
  );
}

/** `estadoEnLista` in words: `{ texto, clase, dia }`, with `dia` the one day to open straight away. */
function textoEstado(e) {
  if (!e) return null;
  if (e.tipo === 'empieza') return { texto: fmt(T.mineStarts, { t: faltaPara(e.en) }), clase: 'espera' };
  if (e.tipo === 'fuera') return { texto: T.mineOut, clase: 'fuera' };
  if (e.tipo === 'al-dia') return { texto: e.dia ? fmt(T.mineDone, { d: e.dia, t: faltaPara(e.en) }) : T.mineDoneAll, clase: 'ok' };
  if (e.dias.length > 1) return { texto: fmt(T.mineReadyMany, { n: e.dias.length }), clase: 'jugar' };
  const d = e.dias[0];
  return { texto: fmt(e.enCurso ? T.mineResume : e.hoy ? T.mineReadyToday : T.mineReady, { d }), clase: 'jugar', dia: d };
}

/**
 * Las copas del jugador que entró, de cualquier celular (D-220), como las de "Tus copas". Las que
 * este celular ya conoce no se leen de nuevo; una copa que su admin borró sale de la lista.
 */
async function copasDelJugador() {
  const [J, st] = await Promise.all([jugador(), abrirStore()]);
  await st.listo();
  const conocidas = new Set(cuenta.mias().map(c => c.code));
  const suyas = (await J.copas()).filter(c => !conocidas.has(c.code));
  return Promise.all(suyas.map(async ({ code, p }) => {
    try {
      const Lc = await st.leer(code);
      if (!Lc?.meta) { J.olvidarCopa(code).catch(() => {}); return null; }
      return { code, pid: p, L: Lc, nombre: Lc.players?.[p]?.name || '?', copa: Lc.meta.name, fin: Lc.fin || Lc.meta.end };
    } catch (_) { return null; }
  }));
}

/* ------------------------------------------------------------------ */
/* Formularios de cuenta                                               */
/* ------------------------------------------------------------------ */

/**
 * Un campo con su etiqueta. Si tiene largo máximo y `contador`, muestra cuántos caracteres van
 * ("24 / 40") para que el límite se vea antes de chocar con él (D-119).
 */
function campo(label, attrs = {}, { contador = false } = {}) {
  const input = el('input', { autocomplete: 'off', ...attrs });
  const max = Number(attrs.maxlength) || 0;
  const cuenta = contador && max ? el('small', { class: 'contador muted', 'aria-live': 'polite' }) : null;
  const pintar = () => { if (!cuenta) return; const n = input.value.length; cuenta.textContent = `${n} / ${max}`; cuenta.classList.toggle('lleno', n >= max); };
  input.addEventListener('input', pintar);
  pintar();
  return { input, nodo: el('div', { class: 'field' }, el('label', {}, label), input, cuenta) };
}
const campoPin = label => campo(label, { inputmode: 'numeric', pattern: '[0-9]*', maxlength: '4', type: 'password', class: 'pin' });

/**
 * Un grupo de opciones sin nada elegido de entrada (C-8, D-38). `inicial` solo para lo que tiene
 * una respuesta obvia y se ve antes de confirmar nada: el idioma de las palabras (D-170).
 */
function opciones(items, onChange, { inicial = null } = {}) {
  let valor = inicial;
  const botones = items.map(it => el('button', {
    type: 'button', class: 'opcion' + (it.valor === inicial ? ' on' : ''), 'aria-pressed': String(it.valor === inicial),
    onClick: () => {
      SFX.tap();
      valor = it.valor;
      botones.forEach((b, i) => { const on = items[i].valor === valor; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      onChange?.(valor);
    },
  }, el('b', {}, it.emoji ? el('span', { class: 'opcion-emoji' }, it.emoji) : null, it.titulo), it.sub ? el('small', {}, it.sub) : null));
  return { nodo: el('div', { class: 'opciones' }, botones), get valor() { return valor; } };
}

/**
 * A game's variants as options (D-331). The name's emoji goes on a line of its own in both cards,
 * so «⚡💧 Servicios» and «🔢 Números» look alike at 320 px instead of one wrapping its emoji (U-12).
 */
const opcionesVariante = (J, vs) => vs.map(v => {
  const nombre = J.variantes?.[v]?.nombre || v;
  const [, emoji, titulo] = nombre.match(/^([\p{Extended_Pictographic}\uFE0F\u200D]+)\s+(.+)$/u) || [null, null, nombre];
  return { valor: v, emoji, titulo, sub: J.variantes?.[v]?.sub };
});

/** Un selector de fecha, de hoy a 30 días más (D-115). Parte oculto. */
function campoFecha(hoy) {
  const max = sumarDias(hoy, MAX_DIAS_INICIO);
  const input = el('input', { type: 'date', class: 'fecha', min: hoy, max, value: sumarDias(hoy, 2), 'aria-label': T.startOther });
  const nodo = el('div', { class: 'field fecha-campo', hidden: true }, input);
  return { nodo, input, valida: () => /^\d{4}-\d{2}-\d{2}$/.test(input.value) && input.value >= hoy && input.value <= max };
}

/** The create-a-Cup screen lives in create.js, loaded the first time it opens (#860). */
// Built when it opens: where this sits in the file, some of what it holds is not defined yet
const crearCopaCtx = () => ({
  G, JUEGOS_COPA, LABS, LANG, LOCALE, PRUEBA, RESERVADAS, T, TRES, abrirCopa, abrirStore, admin, avisoError, campo, campoFecha, campoPin, camposPin, cuenta, entrarComoJugador, errorDe, fechaLarga, fmt, memorial, miPais, mostrar, opciones, opcionesVariante, pinAlAzar, poner, portada, sinPinDeCopa, zonaTexto,
});
let crearCopaModulo = null;
function crearCopa(...args) {
  // Once loaded it draws at once: a late draw would cover the screen the player moved to
  if (crearCopaModulo) return crearCopaModulo.crearCopa(crearCopaCtx(), ...args);
  // Offline, the first open can fail to load it: say so instead of a button that does nothing
  return import('./create.js').then(m => { crearCopaModulo = m; return m.crearCopa(crearCopaCtx(), ...args); }, e => espera(errorDe(e), { error: true, reintentar: () => location.reload() }));
}

/* ------------------------------------------------------------------ */
/* Abrir una copa                                                      */
/* ------------------------------------------------------------------ */

function espera(texto, { error = false, reintentar = null } = {}) {
  mostrar('espera');
  const body = $('#espera-body');
  body.innerHTML = '';
  poner(body, el('div', { class: error ? 'form-error' : 'waiting' }, texto));
  if (reintentar) poner(body, el('button', { class: 'btn btn--cyan', onClick: reintentar }, T.retry));
  if (error) poner(body, el('a', { class: 'btn btn--ghost btn--sm', href: location.pathname + (PRUEBA ? '?test' : '') }, T.cupHome));
}

/**
 * An archived cup's memorial (D-476, D-478), for everyone since D-492.
 * The nightly archive moves a Cup finished more than 733 days ago out of `torneos/`, so its link
 * finds nothing: before saying so, its podium in `torneoPodios/` (public, kept for the medal table)
 * is read, and if it is there the link shows the cup's name, when it ended and its podium.
 */
const fechaConAnio = ms => new Intl.DateTimeFormat(LOCALE[LANG] || LOCALE.es, { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));

async function noExiste(code) {
  let podio = null;
  try {
    // A plain read, no account: the published site over REST, the test store from localStorage
    const almacen = PRUEBA
      ? (await import('../assets/js/jugador-local.js')).crearAlmacenLocal()
      : (await import('../assets/js/jugador-firebase.js')).crearAlmacenFirebase();
    podio = await almacen.get(`torneoPodios/${code}`);
  } catch (_) { /* no network: the error of before */ }
  // Another cup was opened meanwhile, or the podium arrived late: only the cup still asked for is drawn
  if (S.code !== code || S.L?.meta) return;
  if (!podio?.name || !podio?.p) { espera(T.errNoExiste, { error: true }); return; }
  memorial(podio);
}

function memorial(podio) {
  mostrar('espera');
  const body = $('#espera-body');
  body.innerHTML = '';
  const MEDALLA = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const filas = Object.values(podio.p).filter(x => x?.n && Number.isInteger(x.l)).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n));
  poner(body, el('div', { class: 'panel center', id: 'copa-archivada' },
    el('h2', {}, `🏆 ${podio.name}`),
    Number(podio.end) ? el('p', { class: 'muted' }, fmt(T.archivedEnded, { fecha: fechaConAnio(Number(podio.end)) })) : null,
    el('ol', { class: 'podio-archivado' }, filas.map(x => el('li', {}, el('span', { class: 'lugar' }, MEDALLA[x.l] || ord(x.l)), ' ', el('span', {}, x.n)))),
    el('p', { class: 'muted' }, T.archivedNote)),
  el('button', { class: 'btn btn--yellow', id: 'btn-archivada-crear', onClick: () => { SFX.tap(); crearCopa({ nombreInicial: podio.name }); } }, T.archivedNew),
  el('a', { class: 'btn btn--cyan', id: 'btn-archivada-medallero', href: `${URL_RECORDS}#copas` }, T.archivedMedals),
  el('a', { class: 'btn btn--ghost btn--sm', href: location.pathname + (PRUEBA ? '?test' : '') }, T.cupHome));
}

async function abrirCopa(code,{ recienCreada = false, pantalla = null } = {}) {
  S.code = code;
  espera('…');
  let st;
  try { st = await abrirStore(); await st.listo(); } catch (e) { espera(errorDe(e), { error: true, reintentar: () => location.reload() }); return; }
  if (S.off) S.off();
  let primera = true;
  S.off = st.escuchar(code, L => {
    const habia = !!S.L?.meta;
    // Si el admin la terminó antes (D-161), la copa se ve cerrada desde esa hora
    L = conCierre(L);
    S.L = L;
    // Kept for the "Tus copas" line, so the list shows it straight away on the way back
    if (cuenta.quien(code) && L?.meta) { cuenta.lista.guardar(code, copiaLista(L, cuenta.quien(code), st.now())); cuenta.porJugar.guardar(code, porJugar(L, cuenta.quien(code), st.now())); }
    if (!L || !L.meta) {
      // La borró su admin (D-117): quien la tenía abierta se entera, y este celular la olvida
      if (S.eliminando) return;
      if (habia) { cuenta.olvidar(code); espera(T.copaDeleted, { error: true }); return; }
      noExiste(code); return;
    }
    if (primera) {
      primera = false;
      // Si la copa tiene link propio, la dirección lo muestra aunque se haya entrado por el código
      // (la lista de tus copas, un link viejo): así lo que se copie de la barra es el link bonito (D-121)
      const q = new URLSearchParams(location.search);
      if (L.meta.alias && !q.has('demo')) {
        history.replaceState(null, '', `${location.pathname}?${L.meta.alias}${PRUEBA ? '&test' : ''}`);
      } else if (tiene('day', q) || tiene('mute', q)) {
        // Lo que pidió el aviso se hace una vez: recargar no vuelve a silenciar ni a abrir el día (D-229)
        for (const k of [...nombres('day'), ...nombres('mute')]) q.delete(k);
        history.replaceState(null, '', `${location.pathname}?${q.toString().replace(/=(?=&|$)/g, '')}`);
      }
      const pid = cuenta.quien(code);
      if (pid && L.players?.[pid]) {
        S.yo = pid;
        vincularJugador(L);
        cuenta.recordar(code, pid, { nombre: L.players[pid].name, copa: L.meta.name, fin: L.meta.end });
        // Recién creada, el admin parte en Administrar, con la guía de la primera vez (D-110)
        if (recienCreada) { S.bienvenida = true; admin(); } else if (pantalla === 'admin') admin(); else desdeAviso();
      } else sentarseSolo(L).then(listo => { if (!listo) entrar(); });
      return;
    }
    vincularJugador(L);
    // Lo que llega mientras se mira algo que depende de la copa, se redibuja
    if (S.pantalla === 'tablero') tablero();
    else if (S.pantalla === 'admin') admin();
    else if (S.pantalla === 'resultado' && S.verDia) resultado(S.verDia);
    else if (S.pantalla === 'entrar') entrar({ mantener: true });
  }, e => espera(errorDe(e), { error: true, reintentar: () => location.reload() }));
}

/**
 * La copa y los rankings (D-212). Si en este celular hay un jugador, el de la copa queda
 * enlazado a él y la copa, en su lista (D-220); los de la copa que también lo están pasan a ser sus amigos; y cuando la copa
 * termina, su podio lo guarda el trabajo de la noche (D-450, D-499). Todo es de adorno: nunca frena la copa.
 */

/** A phone whose player is linked to one of this cup's players sits as them, with no PIN (D-359). */
async function sentarseSolo(Lc) {
  const yo = leerYo();
  if (!yo || !rankingsVisibles()) return false;
  const pid = Object.keys(Lc.players || {}).find(p => !Lc.players[p].out && Lc.players[p].j === yo.jid);
  if (!pid) return false;
  try {
    await store.sentarseComoJugador(S.code, pid, yo.jid);
    S.yo = pid;
    cuenta.recordar(S.code, pid, { nombre: Lc.players[pid].name, copa: Lc.meta.name, fin: Lc.meta.end });
    vincularJugador(Lc);
    desdeAviso();
    return true;
  } catch (_) { return false; }
}

/**
 * Someone who joins a cup with no player on this phone, but with their usual name and PIN, is that
 * player (D-358): the cup PIN they typed is tried as the player's PIN, and if it opens a player with
 * that name, this phone enters as them and the cup adds to their history. Nothing is created, and a
 * PIN that opens no player changes nothing.
 */
/** Under the cup PIN, with no player on this phone: the usual name and PIN carry the history (D-358). */
/**
 * With a player on this phone, La Copa asks no cup PIN (D-359): the player's PIN already says who
 * it is. The cup still keeps a key for that cup player, a random one nobody needs to know, so the
 * seat works as before and the admin can still give a new PIN.
 */
const sinPinDeCopa = () => !!leerYo() && rankingsVisibles();
function pinAlAzar() {
  const x = new Uint32Array(1); crypto.getRandomValues(x);
  return String(x[0] % 10000).padStart(4, '0');
}

/** The cup PIN fields, or nothing when this phone's player stands in for them (D-359). */
const camposPin = (a, b) => (sinPinDeCopa()
  ? [el('small', { class: 'muted', id: 'sin-pin-copa' }, fmt(T.noCupPin, { name: leerYo().n }))]
  : [a.nodo, b?.nodo, el('small', { class: 'muted' }, T.pinHint), consejoJugador()]);

const consejoJugador = () => (leerYo() || !rankingsVisibles() ? null : el('small', { class: 'muted', id: 'consejo-jugador' }, T.pinPlayerTip));

/**
 * The linked player's seat was lost with the anonymous session (D-416): their player's PIN seats
 * the phone as the player again, and then as the cup player with no cup PIN, as D-359. A PIN that
 * is not the player's may be a new cup PIN from the admin, so it is tried as that. 'pin' if neither.
 */
async function sentarseConPinJugador(pid, pin) {
  try {
    await (await jugador()).reseat(pin);
  } catch (e) {
    if (e?.code !== 'pin') throw e;
    await store.sentarse(S.code, pid, await hashPin(S.code, pid, pin));
    return;
  }
  await store.sentarseComoJugador(S.code, pid, leerYo().jid);
}

async function entrarComoJugador(nombre, pin) {
  try {
    if (leerYo() || !rankingsVisibles()) return;
    const J = await jugador();
    const r = await J.entrar(nombre, pin);
    if (r.estado !== 'dentro') return;
    toast(fmt(T.playerJoined, { name: J.yo().n }));
    if (S.L) vincularJugador(S.L);
  } catch (_) { /* sin red: la copa sigue igual */ }
}

async function vincularJugador(Lc) {
  try {
    if (!Lc?.meta || !S.yo || !Lc.players?.[S.yo]) return;
    const J = await jugador();
    J.conocer(Object.fromEntries(Object.values(Lc.players).filter(p => p?.j).map(p => [p.j, p.name])));
    const yo = leerYo();
    if (yo && S.enlazado !== yo.jid) {
      S.enlazado = yo.jid;
      if (Lc.players[S.yo].j !== yo.jid) await store.enlazar(S.code, S.yo, yo.jid);
      // Y la copa queda en la lista del jugador, para verla desde cualquier celular (D-220)
      await J.anotarCopa(S.code, S.yo);
      // A podium saved while this cup player had no player of their own now carries theirs (D-358)
      await J.firmarPodio(S.code, S.yo).catch(() => {});
    }
    // The podium of a finished cup is the nightly job's (D-450, D-499): the app no longer writes it
  } catch (_) { /* sin red o sin permiso: la copa sigue igual */ }
}

const L = () => S.L;
const ahora = () => store.now();
const nombreDe = pid => L().players?.[pid]?.name || '?';

/* ------------------------------------------------------------------ */
/* Entrar: inscribirse o sentarse                                      */
/* ------------------------------------------------------------------ */

/** The join screen (sign up or sit back down) lives in join.js, loaded the first time it opens (#860). */
// Built when it opens: where this sits in the file, some of what it holds is not defined yet
const entrarCtx = () => ({
  get store() { return store; },
  JUEGOS_COPA, L, S, T, admin, ahora, appPid, avisoAudiencia, avisoError, avisoPalabras, campo, campoPin, camposPin, consejoJugador, cuenta, entrarComoJugador, errorDe, fechaLarga, fmt, miPais, mostrar, pinAlAzar, poner, sentarseConPinJugador, sinPinDeCopa, tablero, toast, vincularJugador,
});
let entrarModulo = null;
function entrar(...args) {
  // Once loaded it draws at once: a late draw would cover the screen the player moved to
  if (entrarModulo) return entrarModulo.entrar(entrarCtx(), ...args);
  // Offline, the first open can fail to load it: say so instead of a button that does nothing
  return import('./join.js').then(m => { entrarModulo = m; return m.entrar(entrarCtx(), ...args); }, e => espera(errorDe(e), { error: true, reintentar: () => location.reload() }));
}

/**
 * Las reglas dejaron de reconocer a este celular como su jugador (perdió su sesión anónima, o el
 * admin le dio un PIN nuevo): se vuelve a entrar con el PIN, con el nombre ya elegido. El intento
 * del día no se pierde: se guarda por jugador y se retoma al volver.
 */
function sentarseDeNuevo() {
  S.reentrar = S.yo;
  S.yo = null;
  entrar({ modo: 'inscrito' });
}

/* ------------------------------------------------------------------ */
/* Tablero                                                             */
/* ------------------------------------------------------------------ */

function esAdmin() { return L()?.meta?.admin === S.yo; }

/** Hasta cuándo se puede jugar un día, dicho como lo entiende una persona. */
function hastaCuando(d, est, now) {
  const { meta } = L();
  const falta = faltaPara(meta.win[d].b - now);
  if (est === 'jugado') return fmt(T.closesIn, { t: falta });
  // The last day has no grace day, final or not (D-438): the cup closes with it
  const mia = otraHora(meta);
  if (est === 'gracia' || d === meta.days) return mia ? fmt(T.untilLocal, { h: cierreMio(meta.win[d].b), t: falta }) : fmt(T.untilTonight, { t: falta });
  return mia ? fmt(T.untilLocal48, { h: cierreMio(meta.win[d].b), dia: fechaCorta(meta.win[d].b - 60000, zonaPropia) }) : T.untilTomorrowNight;
}

/**
 * La píldora ×2: dorada para el comodín, cian para la final, que vale doble para todos. Así no se
 * confunden: un ×2 de la final no es un comodín, y los dos nunca se suman (D-151).
 */
const claseX2 = final => `chip ${final ? 'chip--final' : 'chip--gold'}`;

/**
 * The last day before the final, not played yet and the wildcard still unused: the card and the
 * cover say that today's points will count double on their own if nothing else is chosen (D-444).
 */
const comodinHoy = (Lc, d, now) => d === ultimoDiaComodin(Lc.meta) && !comodinDe(Lc, S.yo)
  && !Lc.results?.[d]?.[S.yo] && !fuera(Lc, S.yo, now);

function tarjetaDia(d, rotulo) {
  const Lc = L(), { meta } = Lc;
  const id = juegoDelDia(meta, d), J = juegoDia(meta, d);
  const now = ahora();
  const est = estadoDia(Lc, d, S.yo, now);
  const x2 = multiplicador(Lc, d, S.yo, now) === 2;
  const auto = !esFinal(meta, d) && x2 && comodinEfectivo(Lc, S.yo, now).auto;
  const jugaron = activos(Lc).filter(j => Lc.results?.[d]?.[j.pid]);
  const falta = faltan(Lc, d, now);
  let accion;
  if (est === 'jugado') accion = el('button', { class: 'btn btn--cyan btn--sm', onClick: () => { SFX.tap(); resultado(d); } }, T.seeResult);
  // Out of the cup (D-347): nothing left to play; the notice on top says why
  else if (fuera(Lc, S.yo, now)) accion = null;
  // Con el admin solo no se juega (D-118): falta con quién competir
  else if ((est === 'hoy' || est === 'gracia') && faltaGente(Lc)) accion = el('div', { class: 'aviso', id: 'falta-gente' }, T.needSecond);
  else if (est === 'hoy' || est === 'gracia') accion = el('button', { class: 'btn btn--yellow', 'data-dia': d, onClick: () => { SFX.tap(); antesDeJugar(d); } }, `${J.emoji} ${T.play}`);
  else if (est === 'en-curso') accion = el('button', { class: 'btn btn--yellow', 'data-dia': d, onClick: () => { SFX.tap(); jugar(d); } }, `${J.emoji} ${T.resume}`);
  return el('div', { class: `panel dia-card ${est}` },
    el('div', { class: 'dia-top' },
      el('span', { class: 'chip' + (rotulo === T.today ? ' chip--hot' : '') }, rotulo),
      el('span', { class: 'muted' }, `${fmt(T.dayOf, { d, n: meta.days })} · ${fechaCorta(meta.win[d].a, meta.tz)}`),
      x2 ? el('span', { class: claseX2(esFinal(meta, d)) }, esFinal(meta, d) ? T.x2 : auto ? `${T.x2Auto}` : `${T.x2} ${T.wildUsed}`) : null),
    el('div', { class: 'dia-juego' }, el('span', { class: con('dia-emoji', J.emoji) }, J.emoji), el('div', {}, el('b', {}, J.nombre, J.varianteNombre ? el('span', { class: 'dia-variante' }, ` · ${J.varianteNombre}`) : null), el('small', { class: 'muted' }, est !== 'jugado' && fuera(Lc, S.yo, now) ? T.outTitle : hastaCuando(d, est, now)))),
    est === 'jugado' ? el('p', { class: 'ok' }, `✅ ${T.played}`) : null,
    accion && comodinHoy(Lc, d, now) ? el('p', { class: 'aviso-comodin', id: 'comodin-hoy' }, T.wildToday) : null,
    accion,
    el('p', { class: 'muted quienes' }, jugaron.length ? fmt(T.whoPlayed, { names: jugaron.map(j => j.name).join(', ') }) : T.nobodyPlayed),
    falta.length && jugaron.length ? el('p', { class: 'muted quienes' }, fmt(T.missing, { names: falta.map(j => j.name).join(', ') })) : null,
  );
}

/**
 * La tabla con un bloque por día de la copa, los siete (D-131): con puntos si ya se ven, ✓ si
 * jugó pero todavía no los puedes ver, "por jugar" si el día está abierto y no ha jugado, "–" si
 * se cerró sin jugarlo, y vacío si el día todavía no abre. Out of the cup (D-347, D-376): the days
 * after the last one they played become a single "Eliminado" pill, in the same columns.
 */
function vistaTabla(filas, { dias, meta, now }) {
  const bloque = (f, d) => {
    const x = f.dias[d];
    if (!x) return el('span', { class: 'pd pendiente', title: T.blockPending }, '');
    if (x.oculto) return x.jugo ? el('span', { class: 'pd oculto', title: T.blockHidden }, '✓') : el('span', { class: 'pd abierto', title: T.blockOpen }, '•');
    if (!x.jugo) return abierto(meta, d, now) ? el('span', { class: 'pd abierto', title: T.blockOpen }, '•') : el('span', { class: 'pd perdido', title: T.blockMissed }, '–');
    return el('span', { class: 'pd' + (x.x === 2 ? ' doble' : '') + (x.pos === 1 ? ' oro' : '') }, String(x.pts));
  };
  const bloques = f => {
    if (!f.fuera) return dias.map(d => bloque(f, d));
    const ultimo = dias.reduce((u, d, i) => (f.dias[d]?.jugo ? i : u), -1);
    const resto = dias.length - ultimo - 1;
    // At least as wide as the blocks it replaces (each one 1.9em of its 0.72rem letter, with the 4px
    // gap between them), and wider if the word needs it: a single day left, or German
    return [...dias.slice(0, ultimo + 1).map(d => bloque(f, d)),
      resto ? el('span', { class: 'pd eliminado', style: `min-width:calc(${resto} * 1.368rem + ${resto - 1} * 4px)` }, T.outBadge) : null];
  };
  return el('div', { class: 'tabla' }, filas.map(f => el('div', { class: 'fila' + (f.pid === S.yo ? ' yo' : '') + (f.fuera ? ' fuera' : '') },
    // Out of the cup (D-347): a door instead of a place, and faded (D-376)
    el('span', { class: 'lugar', title: f.fuera ? fmt(T.outAdmin, { a: f.fuera.desde, b: f.fuera.hasta }) : null }, f.fuera ? '🚪' : String(f.lugar)),
    el('span', { class: 'flecha ' + (f.flecha > 0 ? 'sube' : f.flecha < 0 ? 'baja' : '') }, f.flecha > 0 ? '▲' : f.flecha < 0 ? '▼' : ''),
    el('div', { class: 'quien' },
      el('b', {}, f.name, f.pid === S.yo ? el('small', { class: 'muted' }, ` (${T.you})`) : null),
      el('div', { class: 'puntitos' }, bloques(f))),
    el('span', { class: 'total' }, String(f.total), el('small', {}, ` ${T.pts}`)))));
}

/**
 * Tus días, de arriba abajo (LIG-38): los pasados con su resultado y deshabilitados para
 * jugar (tocarlos muestra el resultado), el de hoy abierto como tarjeta grande, el de ayer
 * habilitado mientras dure su día de gracia, y los que vienen deshabilitados.
 */
function misDias(d, now) {
  const Lc = L(), { meta } = Lc;
  const pids = activos(Lc).map(j => j.pid);
  const { dia: w, auto } = comodinEfectivo(Lc, S.yo, now);
  const afuera = !!fuera(Lc, S.yo, now);
  const filas = [];
  for (let k = 1; k <= meta.days; k++) {
    if (k === d) { filas.push(tarjetaDia(k, T.today)); continue; }
    const J = juegoDia(meta, k);
    const est = estadoDia(Lc, k, S.yo, now);
    const x2 = esFinal(meta, k) || w === k;
    let detalle, accion = null, clase = est;
    if (est === 'jugado') {
      const r = Lc.results[k][S.yo];
      const pos = posicionesDelDia(Lc.results[k], pids)[S.yo];
      detalle = visibleDia(Lc, k, S.yo, now) && pos ? `${r.r || r.s} · ${ord(pos.pos)} · +${pos.pts * multiplicador(Lc, k, S.yo, now)} ${T.pts}` : `${r.r || r.s}`;
    } else if (est === 'gracia') {
      detalle = otraHora(meta) ? fmt(T.lastDayLocal, { h: cierreMio(meta.win[k].b) }) : T.lastDay;
      accion = faltaGente(Lc) || afuera ? null : el('button', { class: 'btn btn--yellow btn--sm', 'data-dia': k, onClick: () => { SFX.tap(); antesDeJugar(k); } }, `${J.emoji} ${T.play}`);
    } else if (est === 'en-curso') {
      detalle = otraHora(meta) ? fmt(T.lastDayLocal, { h: cierreMio(meta.win[k].b) }) : T.lastDay;
      accion = el('button', { class: 'btn btn--yellow btn--sm', 'data-dia': k, onClick: () => { SFX.tap(); jugar(k); } }, `${J.emoji} ${T.resume}`);
    } else if (est === 'perdido') detalle = T.notPlayed;
    else if (est === 'anulado') detalle = T.dayCancelled;
    else detalle = fmt(T.opensOn, { fecha: fechaCorta(meta.win[k].a, meta.tz) });
    const contenido = [
      el('span', { class: 'md-dia' }, el('b', {}, fmt(T.dayShort, { d: k })), el('small', {}, fechaCorta(meta.win[k].a, meta.tz))),
      el('span', { class: con('md-emoji', J.emoji) }, J.emoji),
      el('span', { class: 'md-info' }, el('b', {}, J.nombre, x2 ? el('span', { class: `${claseX2(esFinal(meta, k))} md-x2` }, auto && w === k ? T.x2Auto : T.x2) : null), el('small', {}, detalle)),
      est === 'jugado' ? el('span', { class: 'md-go' }, '›') : accion,
    ];
    filas.push(est === 'jugado'
      ? el('button', { type: 'button', class: `md-fila ${clase}`, onClick: () => { SFX.tap(); resultado(k); } }, ...contenido)
      : el('div', { class: `md-fila ${clase}`, 'aria-disabled': accion ? null : 'true' }, ...contenido));
  }
  return el('div', { class: 'panel mis-dias' }, el('p', { class: 'lead', style: 'margin-bottom:8px' }, T.myDays), filas);
}

/**
 * Tu posición día a día: una línea por jugador, la tuya de color y el resto en gris, con el
 * 1º arriba. Solo los días que ya puedes ver (los que jugaste o los cerrados), así el gráfico
 * tampoco delata el día de hoy. Tocar un punto muestra quién era y en qué lugar iba.
 */

function grafico(now) {
  const Lc = L(), { meta } = Lc;
  const ev = evolucion(Lc, S.yo, now);
  if (!ev.dias.length) return null;
  // "(-1J)" junto a quien lleva menos juegos, como en la imagen que se comparte (D-126)
  const filasTabla = tabla(Lc, S.yo, now);
  const menos = menosJuegos(filasTabla);
  // Out of the cup (D-347): their line, faded, and 🚪 after their name (D-376)
  const afuera = new Set(filasTabla.filter(f => f.fuera).map(f => f.pid));
  const n = ev.filas.length;
  const W = 320, fila = 24, arriba = 14, abajo = 26, izq = 26, der = 92; // espacio a la derecha para "Nombre 3º (-1J)"
  const H = arriba + (n - 1) * fila + abajo;
  const x = k => izq + (meta.days === 1 ? 0 : ((k - 1) * (W - izq - der)) / (meta.days - 1));
  const y = lugar => arriba + (lugar - 1) * fila;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, ...hijos) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    hijos.forEach(h => e.append(h));
    return e;
  };
  const leyenda = el('p', { class: 'muted grafico-nota', 'aria-live': 'polite' }, T.progressHint);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafico', role: 'img', 'aria-label': T.progressTitle });
  for (let l = 1; l <= n; l++) {
    svg.append(svgEl('line', { x1: izq, x2: W - der, y1: y(l), y2: y(l), class: 'g-grid' }));
    svg.append(svgEl('text', { x: izq - 8, y: y(l) + 4, class: 'g-eje', 'text-anchor': 'end' }, ord(l)));
  }
  for (let k = 1; k <= meta.days; k++) svg.append(svgEl('text', { x: x(k), y: H - 6, class: 'g-eje', 'text-anchor': 'middle' }, fmt(T.dayShort, { d: k })));
  // Cada jugador con su color (D-125), fijo por orden de inscripción; tu línea, más gruesa y encima
  const porLlegada = llegada(Lc);
  const color = pid => colorDe(Lc, pid);
  const orden = [...ev.filas.filter(f => f.pid !== S.yo), ...ev.filas.filter(f => f.pid === S.yo)];
  const grupos = {};
  // Empatados en el mismo lugar: sus nombres se apilan en vez de encimarse (el lugar siguiente
  // queda vacío en un empate, así que hay espacio)
  const enLugar = {};
  for (const f of orden) {
    const mia = f.pid === S.yo;
    const g = svgEl('g', { class: 'g-jugador' + (mia ? ' mia' : '') + (afuera.has(f.pid) ? ' fuera' : ''), 'data-pid': f.pid, style: `--c:${color(f.pid)}` });
    grupos[f.pid] = g;
    const pts = f.lugares.map((l, i) => [x(ev.dias[i]), y(l)]);
    if (pts.length > 1) g.append(svgEl('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'g-linea' }));
    pts.forEach(([px, py], i) => {
      const texto = fmt(T.progressPoint, { d: ev.dias[i], name: f.name, pos: ord(f.lugares[i]) });
      g.append(svgEl('circle', { cx: px, cy: py, r: mia ? 5 : 4, class: 'g-punto' }));
      const blanco = svgEl('circle', { cx: px, cy: py, r: 11, class: 'g-toque' }, svgEl('title', {}, texto));
      blanco.addEventListener('click', () => { leyenda.textContent = texto; destacar(f.pid); });
      g.append(blanco);
    });
    if (pts.length) {
      const [px, py] = pts[pts.length - 1];
      const corto = f.name.length > 10 ? `${f.name.slice(0, 9)}…` : f.name;
      const marca = afuera.has(f.pid) ? ' 🚪' : menos[f.pid] > 0 ? ` (-${menos[f.pid]}J)` : '';
      const ultimo = f.lugares[f.lugares.length - 1];
      const k = (enLugar[ultimo] = (enLugar[ultimo] ?? -1) + 1);
      g.append(svgEl('text', { x: px + 9, y: py + 4 + k * 11, class: 'g-rotulo' }, `${corto} ${ord(ultimo)}${marca}`));
    }
    svg.append(g);
  }
  // Tocar un nombre (o un punto) destaca su línea y apaga las demás; tocarlo otra vez, todas
  let destacado = null;
  const destacar = pid => {
    destacado = destacado === pid ? null : pid;
    svg.classList.toggle('con-destacado', !!destacado);
    Object.entries(grupos).forEach(([p, g]) => g.classList.toggle('destacado', p === destacado));
    chips.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.pid === destacado));
  };
  const chips = el('div', { class: 'grafico-chips' }, ev.filas.slice().sort((a, b) => porLlegada.indexOf(a.pid) - porLlegada.indexOf(b.pid)).map(f =>
    el('button', { type: 'button', class: 'g-chip' + (f.pid === S.yo ? ' mia' : '') + (afuera.has(f.pid) ? ' fuera' : ''), 'data-pid': f.pid, style: `--c:${color(f.pid)}`, onClick: () => { SFX.tap(); destacar(f.pid); } },
      el('span', { class: 'g-color', 'aria-hidden': 'true' }), nombreConJuegos(f.pid === S.yo ? fmt(T.progressYou, { name: f.name }) : f.name, menos[f.pid]), afuera.has(f.pid) ? ' 🚪' : null)));
  const notaJuegos = Object.values(menos).some(x => x > 0) ? el('p', { class: 'muted grafico-nota', id: 'nota-juegos' }, T.fewerGamesNote) : null;
  return el('div', { class: 'panel' }, el('p', { class: 'lead', style: 'margin-bottom:8px' }, T.progressTitle), svg, chips, notaJuegos, leyenda,
    // Once over, the podium's Share the summary does the same: one share button per screen (C-19)
    terminada(L().meta, now) ? null : el('button', { class: 'btn btn--cyan btn--sm', id: 'btn-imagen', onClick: async ev2 => {
      SFX.tap(); const b = ev2.currentTarget; b.disabled = true;
      try { await compartirTabla(); } catch (e) { toast(errorDe(e)); } finally { b.disabled = false; }
    } }, `📤 ${T.shareImage}`));
}

/**
 * El tablero, o lo que pidió el aviso que abrió la copa (D-229): silenciarla, o el día que avisaba,
 * listo para empezar, si todavía se puede jugar. Si no, el tablero de siempre.
 */
function desdeAviso() {
  const Lc = L();
  if (silenciarAviso) { tablero(); avisos().silenciar(); return; }
  const est = diaAviso >= 1 && diaAviso <= Lc.meta.days && !anulado(Lc.meta, diaAviso) ? estadoDia(Lc, diaAviso, S.yo, ahora()) : null;
  if ((est === 'hoy' || est === 'gracia') && !faltaGente(Lc)) antesDeJugar(diaAviso);
  else tablero();
}

let buzonPodio;   // the inbox link under the podium, decided once per page (D-345)
function tablero() {
  const Lc = L();
  if (!Lc || !S.yo) return;
  if (!Lc.players?.[S.yo]) { cuenta.olvidar(S.code); S.yo = null; entrar(); return; }
  anotarPais(Lc);
  mostrar('tablero');
  const { meta } = Lc;
  const now = ahora();
  const d = diaActual(meta, now);
  const body = $('#tablero-body');
  body.innerHTML = '';
  // Los días que no alcanzaron a abrirse porque el admin terminó la copa antes no van en la tabla
  const dias = Array.from({ length: meta.days }, (_, i) => i + 1).filter(k => !anulado(meta, k));

  let estadoTxt;
  if (d === 0) estadoTxt = fmt(T.before, { fecha: fechaLarga(meta.win[1].a, meta.tz) });
  else if (d > meta.days) estadoTxt = cerradaAntes(meta) ? fmt(T.overEarly, { fecha: fechaLarga(meta.end, meta.tz) }) : T.over;
  // El día de la copa y la fecha, para que se lea igual que el calendario (D-120)
  else estadoTxt = `${fmt(T.dayOf, { d, n: meta.days })} · ${fechaLarga(meta.win[d].a, meta.tz)}`;

  poner(body, el('div', { class: 'copa-head' },
    el('h1', { class: 'display display--md rainbow' }, `🏆 ${meta.name}`),
    el('p', { class: 'lead', style: 'margin:0' }, estadoTxt),
    avisoAudiencia(meta),
    // In another zone, the cup's days in the viewer's hours (D-521)
    otraHora(meta) && !terminada(meta, now) ? el('p', { class: 'muted', id: 'zona-propia', style: 'margin:0' }, lineaZona(meta)) : null,
    el('div', { class: 'btn-row' },
      // Invitar tiene sentido antes de que parta; después, el admin lo tiene en Administrar
      d === 0 && !L().closed ? el('button', { class: 'btn btn--ghost btn--sm', id: 'btn-invitar', onClick: () => { SFX.tap(); invitar(); } }, T.shareInvite) : null,
      esAdmin() ? el('button', { class: 'btn btn--ghost btn--sm', id: 'btn-admin', onClick: () => { SFX.tap(); admin(); } }, T.adminTab) : null,
      terminada(meta, now) ? null : avisos().boton())));
  // Los avisos al celular (D-223): al abrir desde la app instalada, o antes de que parta
  if (!terminada(meta, now)) {
    avisos().revisar();
    const oferta = avisos().abiertaDesdeApp() ? avisos().tarjeta({ app: true })
      : d === 0 ? avisos().tarjeta({ fecha: fechaLarga(meta.win[1].a, meta.tz) }) : null;
    if (oferta) poner(body, oferta);
  }

  if (terminada(meta, now)) poner(body, podio());
  if (d === 0 && faltaGente(L())) poner(body, el('div', { class: 'panel center' }, el('p', { class: 'lead' }, T.needSecond)));

  // Out of the cup, or one missed day away from it (D-347): said before the days
  const yoFuera = terminada(meta, now) ? null : fuera(Lc, S.yo, now);
  const riesgo = yoFuera || terminada(meta, now) ? 0 : enRiesgo(Lc, S.yo, now);
  if (yoFuera) poner(body, el('div', { class: 'panel aviso-fuera', id: 'aviso-fuera' },
    el('p', { class: 'lead', style: 'margin:0 0 6px' }, T.outTitle), el('p', { class: 'muted', style: 'margin:0' }, fmt(T.outText, { a: yoFuera.desde, b: yoFuera.hasta }))));
  else if (riesgo) poner(body, el('p', { class: 'aviso', id: 'aviso-riesgo' }, fmt(T.outRisk, { p: riesgo - 1, d: riesgo })));

  // Tus días: el historial, el de hoy habilitado y los que vienen deshabilitados
  poner(body, misDias(d, now));

  if (d >= 1) {
    const filas = tabla(Lc, S.yo, now);
    const bloques = filas.flatMap(f => Object.values(f.dias));
    const hayOcultos = bloques.some(x => x.oculto);
    const hayOro = bloques.some(x => x.jugo && !x.oculto && x.pos === 1);
    const hayDoble = bloques.some(x => x.jugo && !x.oculto && x.x === 2);
    // La leyenda de los bloques (D-131): oro y doble solo si ya hay alguno en la tabla (D-152)
    const leyenda = el('div', { class: 'tabla-leyenda' },
      el('span', {}, el('span', { class: 'pd' }, '6'), T.legendPoints),
      hayOro ? el('span', {}, el('span', { class: 'pd oro' }, '10'), T.legendWon) : null,
      hayDoble ? el('span', {}, el('span', { class: 'pd doble' }, '12'), T.legendDouble) : null,
      hayOcultos ? el('span', {}, el('span', { class: 'pd oculto' }, '✓'), T.legendHidden) : null,
      el('span', {}, el('span', { class: 'pd abierto' }, '•'), T.legendOpen),
      el('span', {}, el('span', { class: 'pd perdido' }, '–'), T.legendMissed),
      el('span', {}, el('span', { class: 'pd pendiente' }, ''), T.legendPending));
    poner(body, el('div', { class: 'panel' },
      el('p', { class: 'lead', style: 'margin-bottom:8px' }, provisoria(Lc, filas, now) ? T.tableTitleProvisional : T.tableTitle),
      vistaTabla(filas, { dias, meta, now }),
      leyenda,
      hayOcultos ? el('small', { class: 'muted' }, T.tableHidden) : null));
    poner(body, grafico(now));
  } else {
    const jug = activos(Lc);
    poner(body, el('div', { class: 'panel' },
      el('p', { class: 'lead', style: 'margin-bottom:8px' }, fmt(T.players, { n: jug.length, max: MAX_JUGADORES })),
      el('div', { class: 'nombres' }, jug.map(j => el('span', { class: 'chip' + (j.pid === S.yo ? ' chip--hot' : '') }, j.name)))));
  }

  // The finished Cup's inbox link, at the very end (D-345); kept for the page: the board redraws every minute
  if (terminada(meta, now) && buzonPodio === undefined) buzonPodio = enlaceBuzon({ juego: 'copa', contexto: { copa: S.code, pantalla: 'podio' } });
  poner(body, botonReporte(), el('button', {
    class: 'link-btn', onClick: () => {
      if (!confirm(T.leaveConfirm)) return;
      cuenta.olvidar(S.code); S.yo = null; entrar();
    },
  }, T.leave));

  if (terminada(meta, now) && buzonPodio) { poner(body, buzonPodio); sinDoble(body); }

  clearInterval(S.tic);
  S.tic = setInterval(() => { if (S.pantalla === 'tablero' && !document.hidden) tablero(); }, 60000);
}

/* ------------------------------------------------------------------ */
/* Podio                                                               */
/* ------------------------------------------------------------------ */

let celebrado = false;

/** "⚖️ Empate en 68 puntos: desempató quien ganó más días.", si el 1.° y el 2.° empatan en puntos (#79). */
function lineaDesempate(TT, filas) {
  const e = desempate(filas, L()?.meta);
  return e ? fmt({ dias: TT.tieDays, ultimo: TT.tieLast }[e.criterio] || TT.tieFinal, { pts: e.pts }) : '';
}

function podio() {
  const Lc = L();
  const m = medallas(Lc);
  const filas = tabla(Lc, S.yo, Lc.meta.end);
  const top = filas.slice(0, 3);
  const titulo = m.campeon?.length === 1 ? fmt(T.podiumTitle, { name: m.campeon[0].name }) : T.podiumTie;
  if (!celebrado) { celebrado = true; setTimeout(() => { confetti(); SFX.win(); }, 300); }
  const medalla = (rotulo, lista, extra = '') => (lista?.length ? el('div', { class: 'medalla' }, el('b', {}, rotulo), el('span', {}, lista.map(f => f.name).join(', ') + extra)) : null);
  return el('div', { class: 'panel podio' },
    el('h2', { class: 'display display--md center' }, titulo),
    el('div', { class: 'escalones' }, [1, 0, 2].map(i => top[i] ? el('div', { class: `escalon e${i + 1}` },
      el('span', { class: 'medal' }, ['🥇', '🥈', '🥉'][i]), el('b', {}, top[i].name), el('small', {}, `${top[i].total} ${T.pts}`)) : null)),
    desempate(filas) ? el('p', { class: 'center', id: 'podio-desempate', style: 'margin:0' }, lineaDesempate(T, filas)) : null,
    // A single champion is already the title and the 🥇: the line only names a shared one (C-19)
    m.campeon?.length > 1 ? medalla(T.medalChamp, m.campeon) : null,
    medalla(T.medalWins, m.ganador?.filas, m.ganador ? ` (${m.ganador.n})` : ''),
    medalla(T.medalComeback, m.remontada?.filas, m.remontada ? ` (+${m.remontada.n})` : ''),
    medalla(T.medalLast, m.farolito),
    el('button', { class: 'btn btn--cyan btn--sm', style: 'width:100%', id: 'btn-resumen', onClick: ev => conBoton(ev, compartirTabla) }, T.shareSummary),
    // The Cup is over: its way out, right under the podium (C-19)
    salidasFin('podio', { lang: LANG, raiz: RAIZ }));
}

/* ------------------------------------------------------------------ */
/* Mensajes para el grupo (D-99)                                       */
/* ------------------------------------------------------------------ */

/**
 * Todo lo que comparte la copa sale por aquí (D-165): el texto con la cabecera de la copa y el
 * link en su línea al final (D-124), y la imagen si la hay. Sin menú del sistema, el texto queda
 * copiado (y la imagen, descargada).
 */
async function compartir(texto, imagen = null) {
  const r = await compartirAlChat({ titulo: L().meta.name, texto, url: withLang(urlPublica(S.code), G().lang), imagen });
  if (r === 'copied') toast(T.copied);
  if (r === 'downloaded') toast(T.imageDownloaded);
}

/**
 * Lo que va al grupo va en el idioma de la copa (D-170): los mensajes, la imagen, la planilla y el
 * link. Cada uno ve la pantalla en su idioma, pero el chat del grupo es uno solo.
 */
const G = () => {
  const lang = palabrasDe(L()?.meta);
  return { lang, T: LOCALES[lang] || LOCALES.es, J: juegosCopa(lang) };
};

/** La cabecera de todo lo que la copa comparte, la misma en el texto y en la imagen (D-165). */
const cabCopa = (emoji, contexto) => ({ emoji, titulo: fmt(G().T.shareHead, { copa: L().meta.name }), contexto });

/** El mensaje entero: la cabecera y, separado por una línea, lo que dice. */
const mensajeCopa = (cab, ...partes) => [cabecera(cab), ...partes].filter(Boolean).join('\n\n');

/** Un botón que arma algo antes de compartir (una imagen tarda): se apaga mientras tanto. */
async function conBoton(ev, fn) {
  SFX.tap();
  const b = ev.currentTarget; b.disabled = true;
  try { await fn(); } catch (e) { toast(errorDe(e)); } finally { b.disabled = false; }
}

/** Los avisos al celular de la copa abierta (D-223): la campana, la tarjeta y sus hojas. */
let avisosCopa = null;
const avisos = () => (avisosCopa ||= crearAvisos({
  T, lang: LANG, cuenta, fmt, toast,
  store: () => store,
  copa: () => ({ code: S.code, pid: S.yo, nombre: L()?.meta?.name || '', url: urlPublica(S.code), final: L()?.meta ? tieneFinal(L().meta) : true }),
  redibujar: () => { if (S.pantalla === 'resultado' && S.verDia) resultado(S.verDia); else if (S.pantalla === 'tablero') tablero(); },
  tap: () => SFX.tap(),
}));

function toast(texto) {
  const t = el('div', { class: 'toast', role: 'status' }, texto);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

/**
 * The copy of a cup kept on this phone (`recorteLista`), with each day's game named in this page's
 * language, for the home page card (flag copa-contexto): the home page does not load La Copa (D-378).
 */
function copiaLista(L, pid, now) {
  const r = recorteLista(L, pid, now);
  if (r?.games) try { r.names = r.games.map(id => G().J[id]?.nombre || ''); } catch (_) { /* without names */ }
  return r;
}

/**
 * La invitación promocional (D-127): el reto, cuándo parte, cuánto toma y quiénes ya están.
 * Los juegos no se nombran: son sorpresa.
 */
function mensajeInvitacion() {
  const Lc = L(), { meta } = Lc;
  const nombres = activos(Lc).map(j => j.name);
  const lista = nombres.length > 1 ? fmt(G().T.listAnd, { a: nombres.slice(0, -1).join(', '), b: nombres.at(-1) }) : nombres[0] || '';
  // Ya partida (D-176): dice en qué día va y, si ya cerró alguno, que esos quedan en 0. El día 1
  // cierra recién al empezar el 3: en el 2 todavía está en su día de gracia
  const d = diaActual(meta, ahora());
  const cuando = d === 0
    ? fmt(G().T.shareInviteStart, { fecha: fechaLarga(meta.win[1].a, meta.tz, G().lang) })
    : [fmt(G().T.shareInviteGoing, { d, n: meta.days }), d > 2 ? G().T.lateJoin : ''].filter(Boolean).join(' ');
  return mensajeCopa(cabCopa('🏆', G().T.ctxInvite), fmt(G().T.shareInviteText, {
    dias: meta.days, cuando,
    inscritos: nombres.length ? fmt(nombres.length === 1 ? G().T.shareInviteJoinedOne : G().T.shareInviteJoined, { names: lista }) : '',
  }).replace(/\n{3,}/g, '\n\n'));
}

function invitar() {
  return compartir(mensajeInvitacion());
}

/**
 * El recordatorio del admin (LIG-25): sirve cualquier día. Antes de empezar recuerda cuándo
 * parte; durante la copa dice qué toca hoy, hasta cuándo, si queda el de ayer en su día de
 * gracia y quién falta.
 */
function mensajeHoy() {
  const Lc = L(), { meta } = Lc;
  const now = ahora();
  const d = diaActual(meta, now);
  if (d === 0) {
    const J1 = G().J[juegoDelDia(meta, 1)];
    return mensajeCopa(cabCopa('🏆', fmt(G().T.ctxBefore, { fecha: fechaLarga(meta.win[1].a, meta.tz, G().lang) })),
      fmt(Lc.closed ? G().T.shareBeforeClosed : G().T.shareBeforeText, { emoji: J1.emoji, juego: J1.nombre }));
  }
  const hoy = Math.min(d, meta.days);
  const J = G().J[juegoDelDia(meta, hoy)];
  const hasta = hoy === meta.days ? G().T.untilToday : G().T.untilTomorrow;
  const partes = [fmt(G().T.shareTodayText, { emoji: J.emoji, juego: J.nombre, hasta })];
  if (hoy > 1 && abierto(meta, hoy - 1, now) && faltan(Lc, hoy - 1, now).length) {
    const Ja = G().J[juegoDelDia(meta, hoy - 1)];
    partes.push(fmt(G().T.shareTodayGrace, { juego: Ja.nombre }));
  }
  const falta = faltan(Lc, hoy, now);
  if (falta.length && falta.length < activos(Lc).length) partes.push(fmt(falta.length === 1 ? G().T.shareTodayMissingOne : G().T.shareTodayMissing, { names: falta.map(j => j.name).join(', ') }));
  return mensajeCopa(cabCopa('🏆', fmt(G().T.ctxDay, { d: hoy, n: meta.days })), partes.join('\n'));
}

/**
 * La cabecera de la tabla, la misma en el texto y en la imagen (D-165): "📊 … · Tabla de
 * posiciones · día 3 de 7", con "(provisoria)" si alguien todavía puede cambiarla (D-147), y
 * "🏁 … · Tabla final" al terminar. El día es el último que muestra la tabla, no el de hoy si
 * quien comparte todavía no lo juega (#67).
 */
function cabTabla(Lc, filas, now) {
  return cabeceraTabla(Lc, filas, now, G().T);
}

/**
 * Compartir la tabla, desde donde sea (el gráfico del tablero, el podio, Administrar): siempre
 * la imagen y el texto juntos, con la misma cabecera (D-165). Mientras se juega, la tabla
 * parcial; terminada, el resumen final.
 */
async function compartirTabla() {
  const Lc = L(), now = ahora();
  const texto = terminada(Lc.meta, now) ? mensajeFinal() : mensajeTabla();
  await compartir(texto, await imagenTabla());
}

/**
 * El texto que acompaña a la imagen de la tabla parcial: la cabecera y quién falta hoy. La tabla
 * misma no se escribe: ya la dice la imagen (D-171).
 */
function mensajeTabla() {
  const Lc = L(), { meta } = Lc;
  const now = ahora();
  const d = Math.min(diaActual(meta, now), meta.days);
  // La tabla que se comparte es la que ve el admin: no delata días que él no ha jugado
  const filas = tabla(Lc, S.yo, now);
  const falta = faltan(Lc, d, now);
  // La cabecera lleva el último día que muestra la tabla; el aviso de abajo, el día que corre (#67)
  return mensajeCopa(cabTabla(Lc, filas, now), falta.length ? fmt(falta.length === 1 ? G().T.shareTableMissingOne : G().T.shareTableMissing, { d, names: falta.map(j => j.name).join(', ') }) : '');
}

/** "Tomario (-1J)": el nombre con cuántos juegos menos lleva (D-126). */
const nombreConJuegos = (name, n) => (n > 0 ? fmt(T.fewerGames, { name, n }) : name);

/** La tabla como imagen para compartir (D-126, D-141, D-153): la dibuja table-image.js, también para el resumen de la portada (D-427). */
async function imagenTabla() {
  return imagenDeTabla({ Lc: L(), yo: S.yo, now: ahora(), T: G().T, code: S.code, url: urlPublica(S.code) });
}

/** La tabla final como planilla CSV (D-161): se descarga, para abrirla en Excel o en Google Sheets. */
function descargarPlanilla() {
  const Lc = L(), { meta } = Lc;
  const csv = planilla(Lc, { T: G().T, juegos: G().J, fmt, fecha: ms => fechaLarga(ms, meta.tz, G().lang) });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `copa-${meta.alias || S.code.toLowerCase()}-tabla-final.csv` });
  document.body.append(a); a.click(); a.remove();
  toast(T.exportDone);
}

/**
 * El texto que acompaña a la imagen de la tabla final: la cabecera y las medallas, que la imagen no
 * trae. El campeón y el podio no se escriben: los dice la imagen con sus galvanos (D-171).
 */
function mensajeFinal() {
  const Lc = L();
  const m = medallas(Lc);
  const extras = [
    lineaDesempate(G().T, tabla(Lc, null, Lc.meta.end)),
    m.ganador && `${G().T.medalWins}: ${m.ganador.filas.map(f => f.name).join(', ')} (${m.ganador.n})`,
    m.remontada && `${G().T.medalComeback}: ${m.remontada.filas.map(f => f.name).join(', ')}`,
    m.farolito && `${G().T.medalLast}: ${m.farolito.map(f => f.name).join(', ')}`,
  ].filter(Boolean).join('\n');
  return mensajeCopa(cabCopa('🏁', G().T.ctxFinal), extras);
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/** The admin screen lives in admin.js, loaded the first time it opens (#860). */
const adminCtx = {
  get store() { return store; },
  L, LABS, PRUEBA, S, T, ahora, avisoError, campo, campoFecha, compartir, compartirTabla, conBoton, cuenta, descargarPlanilla, entrar, errorDe, esAdmin, espera, fechaLarga, fmt, invitar, jugar, mensajeFinal, mensajeHoy, mensajeInvitacion, mensajeTabla, mostrar, podio, poner, portada, tablero, toast, zonaTexto, lineaZona,
};
let adminModulo = null;
function admin(opciones) {
  // Once loaded it draws at once, as before: a late redraw would cover the screen the admin moved to
  if (adminModulo) { adminModulo.admin(adminCtx, opciones); return; }
  // Offline, the first open can fail to load it: say so instead of a button that does nothing
  import('./admin.js').then(m => { adminModulo = m; m.admin(adminCtx, opciones); }, e => espera(errorDe(e), { error: true, reintentar: () => location.reload() }));
}
/* ------------------------------------------------------------------ */
/* Antes de jugar: cómo se juega y el comodín                          */
/* ------------------------------------------------------------------ */

function antesDeJugar(d) {
  const Lc = L(), { meta } = Lc;
  const id = juegoDelDia(meta, d), J = juegoDia(meta, d), variante = varianteDelDia(meta, d);
  if (!conJuego(id, () => antesDeJugar(d))) return;
  mostrar('jugar');
  S.antesala = true;
  rotuloMenu();
  $('#jugar-head').innerHTML = '';
  const body = $('#jugar-body');
  body.innerHTML = '';
  const err = el('div', { class: 'form-error', role: 'alert' });
  const now = ahora();
  const w = comodinDe(Lc, S.yo);
  let comodin;
  if (esFinal(meta, d)) comodin = el('p', { class: 'muted' }, T.wildFinal);
  else if (w === d) comodin = el('p', { class: 'ok' }, `🃏 ${T.wildOn}`);
  else if (w) comodin = el('p', { class: 'muted' }, fmt(T.wildGone, { d: w }));
  else if (puedeComodin(Lc, d, S.yo, now)) {
    comodin = el('div', {},
      comodinHoy(Lc, d, now) ? el('p', { class: 'aviso-comodin' }, T.wildToday) : el('p', { class: 'muted' }, tieneFinal(meta) ? T.wildOffAuto : T.wildOffAutoLast),
      el('button', { class: 'btn btn--ghost btn--sm', id: 'btn-comodin', onClick: async ev => {
        if (!confirm(fmt(T.wildConfirm, { d }))) return;
        ev.currentTarget.disabled = true;
        try { await store.comodin(S.code, d, S.yo); SFX.king(); antesDeJugar(d); } catch (e) { avisoError(err, errorDe(e)); ev.currentTarget.disabled = false; }
      } }, `🃏 ${T.wildUse}`));
  }
  const sinGente = faltaGente(Lc);
  const empezar = el('button', { class: 'btn btn--yellow', id: 'btn-empezar', disabled: sinGente }, `${J.emoji} ${T.start}`);
  if (sinGente) avisoError(err, T.needSecond);
  precalentar(id,
    () => JUEGOS[id].generar(S.code, d, { lang: LANG, palabras: palabrasDe(meta), aud: audienciaDe(meta), variante, rondas: rondasPara(meta, d) }),
    () => JUEGOS[id].ensayo(S.code, d, { lang: LANG, palabras: palabrasDe(meta), aud: audienciaDe(meta), variante, rondas: rondasPara(meta, d) }));
  empezar.addEventListener('click', async () => {
    SFX.tap();
    empezar.disabled = true;
    try {
      await store.empezar(S.code, d, S.yo);
      // Una copa de ?test es de mentira (vive en este navegador): no suma en las estadísticas.
      // Las del laboratorio sí: hoy son las copas reales con amigos (D-101).
      if (!PRUEBA) trackStart({ game: GAME_ID, mode: GAME_ID, players: 1 });
      jugar(d, { nuevo: true });
    } catch (e) {
      if (e?.code === 'permiso') { sentarseDeNuevo(); return; }
      avisoError(err, errorDe(e)); empezar.disabled = false;
    }
  });
  poner(body, el('div', { class: 'stack' },
    el('div', { class: 'intro-hero' }, heroe(id, J),
      el('p', { class: 'muted', style: 'margin:0' }, fmt(T.dayOf, { d, n: meta.days })),
      tituloAntesala(id, J), rotuloVariante(J)),
    CON_PALABRAS.includes(id) ? avisoPalabras(meta) : null,
    el('div', { class: 'panel' }, el('p', { class: 'lead' }, T.howToPlay), dibujo(id, variante), el('ol', { class: 'como' }, J.como.map(x => el('li', {}, x))),
      // The final names its rounds, the games of this week (D-418)
      CON_RONDAS.includes(id) ? [el('p', { class: 'lead', style: 'margin:10px 0 4px' }, id === 'trio' ? T.trioGames : T.finalRounds), listaRondas({ d })] : null,
      el('p', { class: 'lead', style: 'margin:10px 0 4px' }, T.scoring), el('p', { class: 'muted' }, puntajeTexto(J))),
    el('div', { class: 'panel' }, el('p', { class: 'lead' }, T.wildTitle), comodin),
    JUEGOS[id].ensayo ? [el('button', { class: 'btn btn--cyan btn--sm', id: 'btn-ensayo', onClick: () => { SFX.tap(); ensayo(d); } }, `🧪 ${T.tryFirst}`),
      el('p', { class: 'muted center', id: 'nota-ensayo', style: 'margin:0' }, notaPrueba(id))] : null,
    el('p', { class: 'muted center' }, T.startWarn), err, empezar));
}

/* ------------------------------------------------------------------ */
/* Jugar                                                               */
/* ------------------------------------------------------------------ */

/**
 * Cuenta de 3 a 1 y "¡A jugar!" antes de un juego con reloj (D-105): todos los de La Copa lo
 * tienen, porque el tiempo desempata. El reloj parte cuando aparece "¡A jugar!", y ese cartel se
 * desvanece solo sobre el tablero. Resuelve la promesa en ese momento.
 */
/** Los juegos que se juegan con palabras del idioma de la copa (D-170). */
const CON_PALABRAS = ['conexiones', 'agentes', 'letras', 'final', 'trio'];
/** "Las palabras de esta copa van en inglés", solo si no es el idioma en que se está mirando. */
/** El público de la copa se dice en la invitación y en el tablero (D-186, D-187). */
const avisoAudiencia = meta => {
  const aud = audienciaDe(meta);
  return aud ? el('p', { class: 'muted center', id: 'aviso-aud', 'data-aud': aud, style: 'margin:0' }, T[{ global: 'audNoteGlobal', cl: 'audNoteCl', br: 'audNoteBr' }[aud]]) : null;
};
const avisoPalabras = meta => (palabrasDe(meta) === LANG ? null
  : el('p', { class: 'muted center aviso-palabras', style: 'margin:0' }, fmt(T.wordsIn, { idioma: T.langNames[palabrasDe(meta)] })));

/**
 * Only the game being played loads (D-468): true if its code is already here; if not, it is fetched
 * and `luego` runs once it is, and false says to stop now. An id that is not a Cup game is "here":
 * the screen that asked handles it as before.
 */
function conJuego(id, luego) {
  if (JUEGOS[id] || !id) return true;
  loadGame(id).then(j => { if (j) luego(); else if (SUELTO) location.replace(RAIZ); else portada(); })
    .catch(e => { console.error(e); espera(errorDe(e), { error: true, reintentar: () => location.reload() }); });
  return false;
}

/** Lo de arriba de la antesala: la portada animada del juego si la tiene (el globo de ¿Dónde queda?), si no su emoji. */
const heroe = (id, J) => JUEGOS[id]?.portada?.({ variante: J.variante || null }) ?? el('span', { class: con('icon', J.emoji) }, J.emoji);

/**
 * Un juego que tarda en armarse (`caro`, El caso, D-260) se arma mientras se lee la antesala, sin
 * apuro: así tocar Empezar o Probar primero no deja el botón trabado. Lo armado queda guardado en el
 * motor y el juego lo reusa. Si no alcanza, se arma igual al empezar.
 */
function precalentar(id, ...armar) {
  if (!JUEGOS[id]?.caro) return;
  const luego = globalThis.requestIdleCallback || (f => setTimeout(f, 300));
  for (const f of armar) luego(() => { try { f(); } catch (_) { /* se arma al empezar */ } });
}

/** How the score was reached (D-106): the game's own breakdown if it brings one (D-331), if not desglose.js. */
const detalle = (id, estado, o) => (JUEGOS[id]?.desglose && estado ? JUEGOS[id].desglose(estado, o) : desglose(id, estado, o));

/**
 * The game of day d as it is played that day (D-331): with its variant's steps and scoring.
 */
const juegoDia = (meta, d) => {
  const tres = rondasDelDia(meta, d);
  // A weekend cup's day of three (D-439) names its games by their emoji: "Tres juegos: 🧶 🔢 ⏳",
  // the three kept together on one line (U-11)
  if (tres) return { ...JUEGOS_COPA.trio, nombre: `${JUEGOS_COPA.trio.nombre}: ${tres.map(x => JUEGOS_COPA[diaDeCal(x).id]?.emoji || '').join('\u00a0')}` };
  return conVariante(JUEGOS_COPA[juegoDelDia(meta, d)], varianteDelDia(meta, d));
};
/** The variant's name under the game's name in the waiting room, if it has one. */
const rotuloVariante = J => (J?.varianteNombre ? el('p', { class: 'variante-dia', id: 'variante-dia' }, J.varianteNombre) : null);

/** Lo que dice la antesala de la prueba: en El caso no es más corta, es un caso completo. */
const notaPrueba = id => (JUEGOS[id]?.pruebaCompleta ? T.trialNoteFull : T.trialNote);

/** El nombre del juego en la antesala: el suyo si lo trae (El caso: la lupa y los colores, D-257), si no el de siempre. */
const tituloAntesala = (id, J) => JUEGOS[id]?.titulo?.({ el, J }) ?? el('h2', { class: 'display display--lg' }, J.nombre);

/** El dibujo que explica el juego antes del texto, si lo tiene (Reinas, Tango y Zip). */
const dibujo = (id, variante = null) => JUEGOS[id]?.ejemplo?.({ el, T, variante }) ?? null;

/**
 * Las reglas del juego, plegadas debajo del tablero (D-133): no molestan mientras se juega y
 * están a mano ante la duda. Son las mismas de la pantalla de antes de jugar, con las palabras
 * de los botones que se ven al jugar. En la final, además, sus rondas (D-418).
 */
/** Cómo se puntúa; el desempate solo dentro de una copa, donde hay con quién empatar (dilema #72). */
const puntajeTexto = (J, copa = true) => (copa && J.desempate ? `${J.puntaje} ${J.desempate}` : J.puntaje);

/** The rounds of day `d`: a weekend cup's three games (D-439), or the final's (D-418). */
const rondasPara = (meta, d) => (meta && rondasDelDia(meta, d)) || finalRounds(meta);
/** The games played as rounds: the final's and a weekend cup's day of three (D-439). */
const CON_RONDAS = ['final', 'trio'];
/** The rounds of the final being played (D-418): this cup's, or the five fixed ones in the lab's practice. */
const rondasDeLaFinal = (d = S.juego?.d) => (S.juego?.practica || !S.code ? finalRounds(null) : rondasPara(L()?.meta, d));
/** The final's rounds as a list: each game's name, and with `detalle` how its round is played (a day of three plays them whole). */
const listaRondas = ({ detalle = false, d } = {}) => el('ul', { class: 'como', id: 'rondas-final' }, rondasDeLaFinal(d).map(x => {
  const { id: r, variante: v } = diaDeCal(x), R = conVariante(JUEGOS_COPA[r], v);
  const corta = detalle && !rondasDelDia(L()?.meta || {}, d ?? S.juego?.d) && RONDAS_FINAL[r];
  return el('li', {}, corta ? `${R.emoji} ${R.nombre}: ${RONDAS_FINAL[r]}` : `${R.emoji} ${R.nombre}`);
}));
/** One line, above the detailed list, for the rounds played whole (instead of repeating it per round). */
const notaRondasEnteras = () => (rondasDeLaFinal().some(x => !RONDAS_FINAL[diaDeCal(x).id]) ? el('p', { class: 'muted', id: 'nota-enteras' }, T.finalWholeNote) : null);
/** The final outside a cup (the lab's practice and its trial) has no week: its five fixed rounds' texts (D-418). */
const reglasDe = (id, J) => (id === 'final' && S.juego?.practica && J?.comoSuelta ? { ...J, como: J.comoSuelta, puntaje: J.puntajeSuelto } : J);

function panelReglas(id, { copa = true, prueba = false, variante = null } = {}) {
  const J = reglasDe(id, conVariante(JUEGOS_COPA[id], variante));
  const caja = $('#jugar-reglas');
  caja.innerHTML = '';
  if (!J) return;
  poner(caja, el('details', { class: 'panel reglas', id: 'reglas' },
    el('summary', {}, `📖 ${fmt(T.rulesOf, { juego: J.nombre })}`),
    // En la sesión de prueba de un día, que es más corta y no cuenta
    prueba ? el('p', { class: 'muted', id: 'nota-ensayo' }, notaPrueba(id)) : null,
    rotuloVariante(J),
    dibujo(id, variante),
    el('ol', { class: 'como' }, J.como.map(x => el('li', {}, x))),
    id === 'final' ? [el('p', { class: 'lead' }, T.finalRounds), notaRondasEnteras(),
      listaRondas({ detalle: true })] : null,
    id === 'trio' ? [el('p', { class: 'lead' }, T.trioGames), listaRondas()] : null,
    el('p', { class: 'lead' }, T.scoring),
    el('p', { class: 'muted' }, puntajeTexto(J, copa))));
}

/**
 * El 3, 2, 1, ¡A jugar! antes de cada juego (D-105), el de assets/js/cuenta-regresiva.js. Devuelve
 * cuánto falta para que se vaya la capa: el reloj parte recién ahí.
 */
function cuentaRegresiva(J) {
  // La Gran Final no la lleva: cada ronda ya parte con su propia presentación
  if (J === JUEGOS_COPA.final) return Promise.resolve(0);
  $('#jugar-head').replaceChildren(el('span', { class: 'jugar-titulo' }, conEmoji(J.emoji, J.nombre)));
  $('#jugar-body').innerHTML = '';
  return cuentaComun({ titulo: conEmoji(J.emoji, J.nombre), ya: T.letsPlay });
}

async function jugar(d, { nuevo = false } = {}) {
  if (!conJuego(juegoDelDia(L().meta, d), () => jugar(d, { nuevo }))) return;
  const Lc = L(), { meta } = Lc;
  const id = juegoDelDia(meta, d), J = juegoDia(meta, d), mod = JUEGOS[id], variante = varianteDelDia(meta, d);
  const guardado = cuenta.intento.leer(S.code, d, S.yo) || {};
  // Si ya había terminado pero no se alcanzó a guardar el resultado, se reintenta de una
  if (guardado.fin) { enviar(d, guardado.fin); return; }
  // A day resumed with «Seguir jugando» is a game on too: a back swipe asks first (D-432)
  backGuard().arm();
  mostrar('jugar');
  keepAwake();
  // La cuenta va solo al empezar: si se retoma una partida, el tablero vuelve de una
  const espera = guardado.reloj ? 0 : await cuentaRegresiva(J);
  // Conexiones necesita saber cuándo empezó su día, para no cambiar de grilla a mitad (D-128)
  // Los textos en el idioma de quien juega y las palabras en el de la copa (D-170)
  // El público de la copa decide qué contenido local entra (D-187)
  const p = mod.generar(S.code, d, { lang: LANG, palabras: palabrasDe(meta), aud: audienciaDe(meta), variante, rondas: rondasPara(meta, d), ...(id === 'conexiones' ? { desde: meta.win[d].a } : {}) });
  // Only in the test store: `&timer=8` shortens the clock of the games played against it, also inside a day of three (D-439)
  const seg = Number(param('timer'));
  if (PRUEBA && seg > 0) for (const x of [p, ...Object.values(p || {})]) if (x && typeof x === 'object' && 'dia' in x && 'codigo' in x) x.tiempo = seg * 1000;
  const now = ahora();
  // El reloj se detiene cuando el tablero termina, no cuando se toca "Ver resultado" (D-130).
  // Detenido, queda así aunque se recargue la página.
  let detenido = !!guardado.detenido;
  // Uno nuevo parte cuando se fue la cuenta y terminó la entrada del juego (las cartas de El caso
  // que se dan vuelta): ni la cuenta ni la entrada son tiempo de juego
  // Started before (Seguir jugando) but its save is not on this phone: the clock goes
  // on from when the day started on the server, so starting over elsewhere does not reset it (D-433)
  const empezo = !nuevo && !guardado.reloj ? Lc.started?.[d]?.[S.yo] : null;
  const yaCorria = typeof empezo === 'number' ? Math.max(0, now - empezo) : 0;
  document.getElementById('aviso-otro-celular')?.remove();
  let rel = guardado.reloj ? (detenido ? guardado.reloj : reloj.seguir(guardado.reloj, now)) : { ...reloj.nuevo(now + espera + (mod.entrada?.() || 0)), ms: yaCorria };
  let jugadas = guardado.jugadas;
  // El resultado se envía apenas termina el tablero, no al tocar "Ver resultado" (D-150): si el
  // jugador cierra sin tocarlo y el día cierra, igual cuenta
  let fin = null, envio = null;
  const persistir = () => cuenta.intento.guardar(S.code, d, S.yo, { jugadas, reloj: reloj.pausar(rel, ahora()), detenido, ...(fin ? { fin } : {}) });
  const cerrar = estado => {
    const r = mod.resultado(estado);
    fin = { s: r.s, ms: r.ms ?? Math.round(reloj.leer(rel, ahora())), t: r.t, resumen: r.resumen, det: detalle(id, estado, { T, fmt, mmss, lang: LANG }) };
    persistir();
    envio = mandar(d, fin);
    // Si falla, "Ver resultado" lo reintenta y lo dice en pantalla; aquí no hay nada que mostrar
    envio.catch(() => {});
  };
  persistir();

  const head = $('#jugar-head');
  head.innerHTML = '';
  head.append(el('span', { class: 'jugar-titulo' }, conEmoji(J.emoji, J.nombre)));
  if (yaCorria) head.after(el('p', { class: 'aviso', id: 'aviso-otro-celular' }, T.resumedElsewhere));
  // No clock in the header while playing (D-379), except in a game whose speed scores and that has
  // no countdown of its own (`clock` in its ui.js, D-384). The end-to-end scripts read the time
  // here to check that it stops with the board (D-130)
  head.reloj = () => mmss(reloj.leer(rel, ahora()));
  const cron = mostrarReloj(head, mod, () => reloj.leer(rel, ahora()));
  S.visibilidad && document.removeEventListener('visibilitychange', S.visibilidad);
  // Mientras se lee el dato de un error el reloj está en pausa, y volver a la pestaña no lo anda (D-277)
  let leyendo = null;
  S.visibilidad = () => {
    if (detenido) return;
    rel = document.hidden || leyendo ? reloj.pausar(rel, ahora()) : reloj.seguir(rel, ahora());
    persistir();
  };
  document.addEventListener('visibilitychange', S.visibilidad);

  const body = $('#jugar-body');
  body.innerHTML = '';
  panelReglas(id, { variante });
  S.juego = { d, id };
  pantallaCompleta(mod.pantallaCompleta);
  mod.montar(body, {
    p, jugadas, T, fmt, el, SFX, vibrate, lang: LANG, pantallaCompleta,
    guardar(j) { jugadas = j; persistir(); },
    tiempo: () => Math.round(reloj.leer(rel, ahora())),
    pausa(ms) {
      if (detenido) return () => {};
      leyendo?.();
      leyendo = pausaDeLectura({ ms,
        pausar: () => { rel = reloj.pausar(rel, ahora()); persistir(); },
        seguir: () => { leyendo = null; if (!detenido && !document.hidden) rel = reloj.seguir(rel, ahora()); },
        alCambiar: p => cron?.classList.toggle('en-pausa', p) });
      return leyendo;
    },
    // Cada juego lo llama cuando su tablero termina (resuelto, perdido o sin tiempo): el tiempo
    // queda ahí, y lo que se tarde en tocar "Ver resultado" no cuenta (D-130). Con el estado
    // final, además, el resultado sale en ese momento (D-150)
    pararReloj(estado) {
      if (!detenido) { rel = reloj.pausar(rel, ahora()); detenido = true; persistir(); }
      pararMuestra(cron, () => reloj.leer(rel, ahora()));
      if (estado && !fin) cerrar(estado);
    },
    terminar(estado) {
      clearInterval(S.reloj);
      document.removeEventListener('visibilitychange', S.visibilidad);
      if (!fin) cerrar(estado);
      enviar(d, fin, envio);
    },
  });
}

/** Escribe el resultado en la copa. Que ya estuviera guardado cuenta como enviado. */
async function mandar(d, fin) {
  const t = String(fin.t || '').slice(0, 300);
  try {
    await store.resultado(S.code, d, S.yo, { s: fin.s, ms: fin.ms, t, r: String(fin.resumen || '').slice(0, 30) });
  } catch (e) {
    if (e?.code !== 'ya-jugado') throw e;
  }
}

/** La pantalla de resultado: espera el envío (el que ya salió al terminar el tablero, o uno nuevo). */
async function enviar(d, fin, envio = null) {
  backGuard().disarm();
  mostrar('resultado');
  const body = $('#resultado-body');
  body.innerHTML = '';
  poner(body, el('div', { class: 'waiting center' }, T.sending));
  try {
    await (envio || mandar(d, fin));
  } catch (e) {
    if (e?.code === 'permiso') { sentarseDeNuevo(); return; }
    body.innerHTML = '';
    const err = el('div', { class: 'form-error', role: 'alert' });
    poner(body, err, el('button', { class: 'btn btn--yellow', onClick: () => enviar(d, fin) }, T.retry),
      el('button', { class: 'btn btn--ghost btn--sm', onClick: () => tablero() }, T.toBoard));
    avisoError(err, e?.code === 'ventana' ? T.errVentana : `${errorDe(e)} ${T.sendFail}`);
    return;
  }
  cuenta.intento.borrar(S.code, d, S.yo);
  // El puntaje del día cuenta para el ranking de ese juego, pestaña "Copa" (D-212). No se espera.
  // A day of three (D-439) is not one game: it does not go to any game's ranking
  if (leerYo() && !L().meta.lab && !rondasDelDia(L().meta, d)) jugador().then(J => J.anotar({ juego: juegoDelDia(L().meta, d), variante: 'copa', s: fin.s, ms: fin.ms })).catch(() => {});
  SFX.win(); vibrate([30, 50, 30]);
  // La copa llega por el oyente; si todavía no trae el resultado, se dibuja con el propio
  const Lc = L();
  if (!Lc.results?.[d]?.[S.yo]) {
    Lc.results ||= {}; Lc.results[d] ||= {};
    Lc.results[d][S.yo] = { s: fin.s, ms: fin.ms, t: fin.t, r: fin.resumen };
  }
  // The home page's card knows at once that this day is played, even if the player leaves before
  // the listener brings the cup back (it said ▶ Jugar hoy for a day already played)
  if (Lc?.meta) { cuenta.lista.guardar(S.code, copiaLista(Lc, S.yo, Date.now())); cuenta.porJugar.guardar(S.code, porJugar(Lc, S.yo, Date.now())); }
  resultado(d, { recien: true, det: fin.det });
}

/* ------------------------------------------------------------------ */
/* Resultado del día                                                   */
/* ------------------------------------------------------------------ */

/** The day's result screen lives in result.js, loaded the first time it opens (#860). */
// Built when it opens: where this sits in the file, some of what it holds is not defined yet
const resultadoCtx = () => ({
  CON_RONDAS, G, L, S, T, ahora, avisos, bajoElPuntaje, botonReporte, cabCopa, claseX2, compartir, conBoton, detalle, explicacion, fmt, juegoDia, mensajeCopa, mostrar, nombreDe, ord, poner, tablero, urlPublica,
});
let resultadoModulo = null;
function resultado(...args) {
  // Once loaded it draws at once: a late draw would cover the screen the player moved to
  if (resultadoModulo) return resultadoModulo.resultado(resultadoCtx(), ...args);
  // Offline, the first open can fail to load it: say so instead of a button that does nothing
  return import('./result.js').then(m => { resultadoModulo = m; return m.resultado(resultadoCtx(), ...args); }, e => espera(errorDe(e), { error: true, reintentar: () => location.reload() }));
}

/**
 * Lo que va bajo el puntaje (D-114): la tarjeta para compartir y el tiempo, pero el tiempo solo
 * si la tarjeta no lo trae ya (la de Reinas es "👑 ⏱ 1:23 ✅"): se veía dos veces.
 */
/** Games whose share card only repeats the score (Desenredo's 🧶 🟩🟩): it goes in the shared text, not on the result screen. */
const SIN_TARJETA_EN_RESULTADO = new Set(['desenredo']);
function bajoElPuntaje(t, ms, id = null) {
  return [
    t && !SIN_TARJETA_EN_RESULTADO.has(id) ? el('pre', { class: 'tarjeta' }, t) : null,
    String(t || '').includes('⏱') ? null : el('p', { class: 'muted' }, `⏱ ${mmss(ms)}`),
  ];
}

/**
 * Cómo se calculó el puntaje (D-106). Recién terminado trae el desglose línea por línea; si se
 * mira después (el desglose no se guarda en la copa), la regla del juego. En la copa suma cómo el
 * lugar del día se vuelve puntos, y si ese día valía el doble.
 */
function explicacion(J, { s, ms, det, x = 1, final = false, auto = false, copa = true }) {
  const lineas = det?.length ? det : [puntajeTexto(J, copa)];
  // Folded and after the exits, everywhere (C-19); on its own the score and the time are already above it,
  // so neither is said again here
  return el('details', { class: 'panel explicacion', id: 'explicacion' },
    el('summary', { class: 'lead' }, `🧮 ${T.bdTitle}`),
    el('ul', {}, lineas.map(t => el('li', {}, t))),
    copa && det?.length ? el('p', { class: 'explicacion-total' }, fmt(s === 1 ? T.bdTotalOne : T.bdTotal, { s })) : null,
    !copa || J === JUEGOS_COPA.zip || J === JUEGOS_COPA.desenredo ? null : el('p', { class: 'muted' }, fmt(T.bdTime, { t: mmss(ms) })),
    copa ? el('p', { class: 'muted' }, T.bdPlaces) : null,
    copa && x > 1 ? el('p', { class: 'ok' }, final ? T.bdFinal : auto === 'last' ? T.bdWildAutoLast : auto ? T.bdWildAuto : T.bdWild) : null);
}

/* ------------------------------------------------------------------ */
/* Práctica: un juego suelto, sin copa ni Firebase (LIG-41)        */
/* ------------------------------------------------------------------ */

/**
 * `/cup/?practice=<juego>` juega un juego suelto con contenido al azar, para probar su
 * mecánica antes de armar una copa. La semilla se muestra al final y va en la URL
 * (`&seed=K7Q2X`): con ella se repite exactamente la misma partida para reportar un error.
 */
/**
 * Desde la portada (D-142) la práctica es el juego suelto: vuelve al menú, no ofrece la sesión
 * de prueba (jugar otra vez ya es probar) ni muestra la semilla, y manda su señal de uso. Desde el
 * laboratorio llega con `&labs` y queda como estaba.
 */
const volverDePractica = () => salidasFin(LABS ? 'lab' : 'suelto', { lang: LANG, raiz: RAIZ });

/**
 * The variant of a standalone game (D-331): the link's (`?mode=hard`; Pintaminas' `?colors=2`
 * from the lab too), or the one this phone remembers, or the default one.
 */
const claveVariante = id => `juegos-de-salon:${id}:variant`;
function varianteSuelta(id) {
  const vs = JUEGOS[id]?.variantes;
  if (!vs) return null;
  const url = param('mode') || (id === 'pintaminas' && param('colors') === '2' ? 'hard' : null);
  if (vs.includes(url)) { guardarVariante(id, url); return url; }
  let guardada = null;
  try { guardada = localStorage.getItem(claveVariante(id)); } catch (_) { /* sin almacenamiento: la de siempre */ }
  return vs.includes(guardada) ? guardada : vs[0];
}
function guardarVariante(id, v) { try { localStorage.setItem(claveVariante(id), v); } catch (_) { /* solo esta vez */ } }
/** The ranking table of a variant (D-331): the default one is the game's own, the others go apart. */
const varianteRk = (id, v) => (v && v !== JUEGOS[id]?.variantes?.[0] ? v : '');

/**
 * The variant picker of the waiting room (D-331): the game's own if it brings one (Pintaminas' lever),
 * if not two buttons like the cup's options. Picking one redraws the waiting room with its steps.
 */
function selectorVariante(id, variante, cambiar) {
  const J = JUEGOS_COPA[id], mod = JUEGOS[id];
  const propio = mod.selector?.({ el, T, SFX, vibrate, variante, cambiar });
  if (propio) return propio;
  const o = opciones(opcionesVariante(J, mod.variantes), cambiar, { inicial: variante });
  o.nodo.classList.add('dos', 'variantes');
  o.nodo.id = 'selector-variante';
  return o.nodo;
}

/** 🔢 Número or 🔤 Palabra on /word/, like a variant: the number is Toque y Fama's own page (#767). */
function selectorTyf() {
  const o = opciones([{ valor: 'numero', titulo: T.tyfNumber }, { valor: 'palabra', titulo: T.tyfWord }],
    v => { if (v === 'numero') location.href = '../bulls-and-cows/'; }, { inicial: 'palabra' });
  o.nodo.classList.add('dos', 'variantes');
  o.nodo.id = 'selector-variante';
  return o.nodo;
}

function practica(id, varianteElegida = null) {
  if (!conJuego(id, () => practica(id, varianteElegida))) return;
  const mod = JUEGOS[id];
  if (!JUEGOS_COPA[id] || !mod) { if (SUELTO) location.replace(RAIZ); else portada(); return; }
  // Uno al día is the same challenge for everyone (D-334): always the default variant, without the picker
  const variante = HOY ? (mod.variantes?.[0] ?? null) : varianteElegida || varianteSuelta(id);
  const J = conVariante(JUEGOS_COPA[id], variante);
  // La página propia de un juego (también la del laboratorio, /labs/case/) lleva su nombre en la pestaña
  if (!LABS || SUELTO) document.title = `${J.nombre} ${J.emoji} · ${(COMMON[LANG] || COMMON.es).appTitle}`;
  // En el laboratorio, "‹ Laboratorio" es largo: bajo 400 px el chip queda solo con el emoji (U-12)
  if (SUELTO) $('#chip-juego').replaceChildren(el('span', { class: con('', J.emoji) }, J.emoji), el('span', { class: LABS ? 'chip-txt chip-txt--lab' : 'chip-txt' }, ` ${J.nombre}`));
  if (HOY) {
    // Si hoy toca otro juego (un link de ayer, o pasó la medianoche), se va al de hoy
    const fecha = fechaLocal(), deHoy = juegoDel(fecha);
    if (deHoy !== id) { location.replace(RAIZ + rutaHoy(deHoy)); return; }
    settleStarted();
    S.hoy = { id, fecha, ya: !!leerUnoAlDia().dias[fecha] };
  }
  // Un juego `diario` (El caso, D-267), sin semilla en el link, es el del día: el mismo para todos
  const delDia = !HOY && !esCodigo(SEMILLA) && !!gameById(id)?.diario;
  const semilla = HOY ? semillaDel(S.hoy.fecha) : esCodigo(SEMILLA) ? SEMILLA : delDia ? semillaDel(fechaLocal()) : codigoAlAzar();
  precalentar(id, () => JUEGOS[id].generar(semilla, 1, { lang: LANG, variante }), () => JUEGOS[id].ensayo?.(semilla, 1, { lang: LANG, variante }));
  const zipSeg = param('timer');
  // Suelto, la semilla no va a la vista (D-142): el link queda en /queens/. Desde el
  // laboratorio sí, para poder repetir la partida.
  // El del día no: el link queda limpio y mañana abre el de mañana
  if (SUELTO && LABS && !HOY && !delDia) history.replaceState(null, '', paginaSuelta(id, { semilla, zipSeg, modo: varianteRk(id, variante) }));
  else if (!SUELTO) history.replaceState(null, '', `${location.pathname}?practice=${slugDe(id)}&seed=${semilla}${PRUEBA ? '&test' : ''}${LABS ? '&labs' : ''}${zipSeg ? `&timer=${zipSeg}` : ''}`);
  S.juego = { d: 1, id, practica: true, semilla, variante };
  const Jr = reglasDe(id, J);
  mostrar('jugar');
  $('#jugar-head').innerHTML = '';
  $('#jugar-reglas').innerHTML = ''; // en la antesala las reglas ya están a la vista
  // On a game's own page, its one "Cómo se juega" opens with who plays, how long and what it
  // costs, as the party games' covers do (D-488). lab: #seccion-cover-facts
  if (SUELTO) flag('cover-facts').then(on => {
    const titulo = on && $('#como-titulo');
    if (titulo && !titulo.nextElementSibling?.classList.contains('how-facts')) titulo.after(el('p', { class: 'muted how-facts' }, factsLine(id, {}, LANG)));
  });
  const body = $('#jugar-body');
  body.innerHTML = '';
  poner(body, el('div', { class: 'stack' },
    el('div', { class: 'intro-hero' }, heroe(id, J),
      // En el laboratorio no se rotula "Práctica en el laboratorio": el chip y el botón de volver ya lo dicen
      tituloAntesala(id, J),
      el('div', { style: 'margin-top:6px' }, langToggle())),
    // The variant is picked here, before the steps, which are the variant's (D-331)
    variante && !HOY ? selectorVariante(id, variante, v => { guardarVariante(id, v); SFX.tap(); practica(id, v); }) : null,
    // Toque y Fama: Palabra shares Toque y Fama's home card (#767): 🔢 Número goes back to it
    id === 'letras' && SUELTO && !HOY ? selectorTyf() : null,
    // Uno al día: una línea arriba, y nada más; cómo se juega es lo del juego (U-18)
    HOY ? el('p', { class: 'aviso uad-intro', id: 'uad-intro' }, S.hoy.ya ? UAD().introRepite : UAD().intro) : null,
    delDia ? el('p', { class: 'aviso uad-intro', id: 'diario-intro' }, `📅 ${T.casoDelDia}`) : null,
    // La misma antesala que un día de la copa (D-109): la sesión de prueba se elige antes de jugar
    mod.ensayo && LABS ? el('button', { class: 'btn btn--cyan btn--sm', id: 'btn-ensayo', onClick: () => { SFX.tap(); ensayoPractica(id, semilla, variante); } }, `🧪 ${T.tryFirst}`) : null,
    // Suelto no hace falta decir que no cuenta para una copa: no hay copa a la vista
    // Un juego `diario` (El caso, D-267) no: lo abre un amigo que no sabe de copas, y arriba ya dice qué caso es (U-8)
    LABS && !gameById(id)?.diario ? el('p', { class: 'muted center' }, T.practiceHint) : null,
    el('button', { class: 'btn btn--yellow', id: 'btn-empezar', onClick: () => { SFX.tap(); jugarPractica(id, semilla, variante); } }, `${J.emoji} ${T.start}`),
    volverDePractica(),
    // Entrar, pegado a Empezar y a Volver (D-249): sin jugador, la partida no queda en ningún
    // ranking. Arriba de las reglas, o entre los dos, bajaba los botones en alemán (C-8)
    rankea(id) ? bloqueJugador({ destacado: true, alTocar: () => SFX.tap() }) : null,
    // How to play goes after Empezar, so the button is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' }, el('p', { class: 'lead', id: 'como-titulo' }, T.howToPlay), dibujo(id, variante), el('ol', { class: 'como' }, Jr.como.map(x => el('li', {}, x))),
      el('p', { class: 'lead', style: 'margin:10px 0 4px' }, T.scoring), el('p', { class: 'muted' }, puntajeTexto(Jr, false))),
    rankea(id) ? bloqueRanking({ juego: tablaRk(id, variante), titulo: tituloRk(J), pestanas: varianteRk(id, variante) ? ['semana', 'siempre', 'amigos'] : ['semana', 'siempre', 'amigos', 'copa'], alTocar: () => SFX.tap() }) : null));
  pieComentario({ juego: id, semilla, pantalla: 'antesala' });
  // The first attempt counts from its start (D-433): the line says so, an attempt left halfway goes
  // on where it was, and one started on another phone counts 0
  // Empezar waits for that answer (at once without a player; with one, at most Firebase's 2.5 s)
  if (HOY) {
    const hoy = S.hoy, boton = $('#btn-empezar'), linea = $('#uad-intro');
    boton.disabled = true;
    hoy.lock = lockState(hoy, { canResume: true }).catch(() => 'off').then(st => {
      hoy.estadoLlave = st;
      const line = lockLine(st, { lang: LANG });
      if (line) linea.textContent = line;
      if (st === 'resume') boton.textContent = `${J.emoji} ${T.resume}`;
      boton.disabled = false;
      return st;
    });
  }
  // `?play` (the splash's ▶ Jugar) opens the game already started, past this cover. Only once: it
  // leaves the address, so going back or reloading lands on the cover
  if (SUELTO && !HOY && tiene('play')) {
    const q = new URLSearchParams(location.search); q.delete('play');
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
    jugarPractica(id, semilla, variante);
  }
}

/**
 * ¿Esta partida cuenta para los rankings (D-212)? Los juegos sueltos de la portada, jugados como
 * cualquiera los juega: sin el laboratorio y sin una semilla elegida, que dejaría repetir el mismo
 * tablero hasta sacarle el máximo.
 */
/** The table a standalone game ranks in (D-331): `pintaminas`, or `pintaminas_hard` for its other variant. */
const tablaRk = (id, v) => (varianteRk(id, v) ? `${id}_${varianteRk(id, v)}` : id);
const tituloRk = J => fmt(RK.titleOf, { game: J.varianteNombre ? `${J.nombre} · ${J.varianteNombre}` : J.nombre });
const rankea = id => !LABS && !SEMILLA && !(HOY && S.hoy?.ya) && !!gameById(id)?.suelto && rankingsVisibles();
/** Los textos de Uno al día, en el idioma de quien juega. */
const UAD = () => (COMMON[LANG] || COMMON.es).uad;

function jugarPractica(id, semilla, variante = null) {
  // Suelto, todo va en el idioma de quien juega: no hay con quién jugar lo mismo (D-170)
  const p = JUEGOS[id].generar(semilla, 1, { lang: LANG, variante });
  // Solo en el modo de prueba: `&timer=8` acorta el reloj de Zip, Desenredo y Rutas rotas para los guiones de punta a punta
  const seg = Number(param('timer'));
  if (PRUEBA && (id === 'zip' || id === 'desenredo' || id === 'rutas') && seg > 0) p.tiempo = seg * 1000;
  // Señal de uso para el panel (D-44): el suelto se cuenta como su propio juego; el laboratorio no
  // El caso cuenta también desde el laboratorio: es lo que se quiere medir (D-267)
  // A lab key's simulated game (Babel's «Simular final») is not a game: no signal, no daily attempt
  const simulado = !!JUEGOS[id].simulando?.();
  if ((!LABS || gameById(id)?.diario) && !PRUEBA && !simulado) trackStart({ game: id, mode: HOY ? MODO_UNO_AL_DIA : 'solo', players: 1 });
  // Un juego `diario` sigue donde iba al recargar (D-267): las jugadas y el tiempo, por caso
  let guardado = gameById(id)?.diario && !HOY ? partidaGuardada(id, semilla) : null;
  // Today's first attempt (D-433): it counts from here, and it goes on where it was if left
  if (HOY && !simulado && !S.hoy.ya && (S.hoy.estadoLlave === 'new' || S.hoy.estadoLlave === 'resume')) {
    empezarHoy(S.hoy);
    if (S.hoy.estadoLlave === 'new') dailySave(S.hoy.fecha, id).borrar();
    guardado = dailySave(S.hoy.fecha, id);
    // Going back to it goes on at once, also before its first move: the board was already seen
    guardado.sigue = S.hoy.estadoLlave === 'resume';
  }
  jugarSinPuntaje(id, p, r => resultadoPractica(id, semilla, r, variante), { variante, ...(guardado ? { guardado } : {}) });
}

/**
 * El link al formulario de comentarios, al final de cada vista de un juego del laboratorio (D-268):
 * la antesala, la prueba y el juego; en el resultado el formulario ya va abierto al final. Durante la
 * cuenta del 3, 2, 1 no está (`pieComentario(null)`). Vive al final de la pantalla, debajo de las reglas.
 */
function pieComentario(extra) {
  const pantalla = $('#screen-jugar');
  let pie = document.getElementById('comentario-pie');
  if (!pie) { pie = el('div', { id: 'comentario-pie', class: 'center', style: 'padding:14px 0 6px' }); pantalla.append(pie); }
  pie.replaceChildren();
  // A standalone game's own page closes its cover with the site footer (U-38); never while playing
  if (SUELTO && !LABS && !HOY && extra?.pantalla === 'antesala') {
    import('../assets/js/site-footer.js').then(m => { if (document.getElementById('btn-empezar')?.isConnected && !pie.childElementCount) m.mountFooter(pie, { screen: `${slugDe(extra.juego)}-cover` }); });
    return;
  }
  // Solo en la página de un juego del laboratorio (/labs/case/); la práctica de /cup/?labs tiene su 🐞
  if (!LABS || !extra || !gameById(extra.juego)?.labs) return;
  pie.append(el('button', {
    class: 'link-btn reporte-btn', id: 'btn-comentario', type: 'button',
    onClick: () => {
      SFX.tap();
      abrirComentario({ T: TB(), enviar: enviarComentario(), contexto: { ...extra, url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160) } });
    },
  }, TB().abrir));
}

/** En el modo de prueba, el comentario queda en el almacén local, como los reportes; si no, va a Firebase. */
/** The form's texts: the inbox's, one wording for everything (D-345). */
const TB = () => (COMMON[LANG] || COMMON.es).buzon;
const enviarComentario = () => (PRUEBA ? async r => (await abrirStore()).reportar(r) : undefined);

/**
 * La partida de un juego `diario` en este celular (D-267): `{ jugadas, ms }` por juego y semilla, para
 * seguir donde iba al recargar. Si el almacenamiento está bloqueado, se juega igual sin guardar.
 */
function partidaGuardada(id, semilla) {
  const clave = `juegos-de-salon:diario:${id}:${semilla}`;
  let previa = null;
  try { previa = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (_) { /* de cero */ }
  return {
    jugadas: Array.isArray(previa?.jugadas) && previa.jugadas.length ? previa.jugadas : undefined,
    ms: Number(previa?.ms) || 0,
    guardar(jugadas, ms) { try { localStorage.setItem(clave, JSON.stringify({ jugadas, ms })); } catch (_) { /* sin memoria */ } },
  };
}

/** "🧪 Prueba", con la palabra aparte: en la barra de la pantalla completa puede quedar solo el 🧪. */
const chipPrueba = () => {
  const [ico, ...txt] = T.trialChip.split(' ');
  return el('span', { class: 'chip chip--gold', title: T.trialChip }, ico, el('span', { class: 'chip-txt' }, ` ${txt.join(' ')}`));
};

/**
 * Juega un juego sin que cuente: la práctica del laboratorio y la sesión de prueba antes de
 * un día de la copa (D-103). Nada se guarda ni se envía; el reloj corre igual, para que se vea.
 */
async function jugarSinPuntaje(id, p, alTerminar, { ensayo = false, guardado = null, variante = null } = {}) {
  const J = conVariante(JUEGOS_COPA[id], variante), mod = JUEGOS[id];
  // Una partida a medias sigue sin la cuenta ni la entrada: el tablero ya se conoce (D-267)
  const sigue = !!guardado?.jugadas || !!guardado?.sigue;
  pieComentario(null);   // durante la cuenta, nada más que la cuenta
  const espera = sigue ? 0 : await cuentaRegresiva(J);
  // Como en la copa: el reloj parte con la pantalla de juego a la vista, no con la cuenta
  let rel = { ...reloj.nuevo(Date.now() + espera + (sigue ? 0 : mod.entrada?.() || 0)), ms: guardado?.ms || 0 };
  const head = $('#jugar-head');
  head.innerHTML = '';
  poner(head, el('span', { class: 'jugar-titulo' }, conEmoji(J.emoji, J.nombre)), ensayo ? chipPrueba() : null);
  head.reloj = () => mmss(reloj.leer(rel, Date.now()));   // as in the cup (D-379, D-384)
  const cron = mostrarReloj(head, mod, () => reloj.leer(rel, Date.now()));
  S.visibilidad && document.removeEventListener('visibilitychange', S.visibilidad);
  let detenido = false;
  let leyendo = null;
  // A saved game also keeps the time up to leaving the page, not only up to its last move (D-433)
  let ultimas = guardado?.jugadas || [];
  S.visibilidad = () => {
    if (detenido) return;
    rel = document.hidden || leyendo ? reloj.pausar(rel, Date.now()) : reloj.seguir(rel, Date.now());
    if (document.hidden) guardado?.guardar(ultimas, Math.round(reloj.leer(rel, Date.now())));
  };
  document.addEventListener('visibilitychange', S.visibilidad);
  const body = $('#jugar-body');
  body.innerHTML = '';
  panelReglas(id, { copa: false, prueba: ensayo && !S.juego?.practica, variante });
  pantallaCompleta(mod.pantallaCompleta);
  mod.montar(body, {
    p, jugadas: guardado?.jugadas, T, fmt, el, SFX, vibrate, lang: LANG, pantallaCompleta,
    textoFin: ensayo ? T.trialEnd : undefined,
    // No cuenta para nada; solo un juego `diario` lo guarda en el celular, para seguir al recargar
    guardar(jugadas) { ultimas = jugadas; guardado?.guardar(jugadas, Math.round(reloj.leer(rel, Date.now()))); },
    tiempo: () => Math.round(reloj.leer(rel, Date.now())),
    pausa(ms) {
      if (detenido) return () => {};
      leyendo?.();
      leyendo = pausaDeLectura({ ms,
        pausar: () => { rel = reloj.pausar(rel, Date.now()); },
        seguir: () => { leyendo = null; if (!detenido && !document.hidden) rel = reloj.seguir(rel, Date.now()); },
        alCambiar: p => cron?.classList.toggle('en-pausa', p) });
      return leyendo;
    },
    pararReloj() {
      if (!detenido) { rel = reloj.pausar(rel, Date.now()); detenido = true; }
      pararMuestra(cron, () => reloj.leer(rel, Date.now()));
    },
    terminar(estado) {
      clearInterval(S.reloj);
      document.removeEventListener('visibilitychange', S.visibilidad);
      const r = mod.resultado(estado);
      alTerminar({ ...r, ms: r.ms ?? Math.round(reloj.leer(rel, Date.now())), det: detalle(id, estado, { T, fmt, mmss, copa: false, lang: LANG }) });
    },
  });
  pieComentario(S.juego?.practica ? { juego: id, semilla: S.juego.semilla, pantalla: ensayo ? 'prueba' : 'juego' } : null);
}

/** La sesión de prueba de un día: otro contenido, la misma mecánica, y de vuelta a Empezar. */
function ensayo(d) {
  const id = juegoDelDia(L().meta, d), variante = varianteDelDia(L().meta, d);
  if (!conJuego(id, () => ensayo(d))) return;
  mostrar('jugar');
  S.juego = { d, id, ensayo: true };
  jugarSinPuntaje(id, JUEGOS[id].ensayo(S.code, d, { lang: LANG, palabras: palabrasDe(L().meta), aud: audienciaDe(L().meta), variante, rondas: rondasPara(L().meta, d) }), r => resultadoEnsayo(id, r, () => antesDeJugar(d), variante), { ensayo: true, variante });
}

/** La sesión de prueba desde la práctica del laboratorio: la misma que antes de un día (D-109). */
function ensayoPractica(id, semilla, variante = null) {
  mostrar('jugar');
  S.juego = { d: 1, id, practica: true, ensayo: true, semilla, variante };
  jugarSinPuntaje(id, JUEGOS[id].ensayo(semilla, 1, { lang: LANG, variante }), r => resultadoEnsayo(id, r, () => practica(id, variante), variante), { ensayo: true, variante });
}

/** Fin de la sesión de prueba: cómo le fue, cómo se calcula, y de vuelta a la antesala. */
function resultadoEnsayo(id, r, volver, variante = null) {
  mostrar('resultado');
  SFX.reveal();
  const body = $('#resultado-body');
  body.innerHTML = '';
  poner(body,
    el('div', { class: 'result-hero' }, el('span', { class: 'trophy pop' }, '🧪'),
      el('h2', { class: 'display display--md' }, T.trialDoneTitle)),
    el('div', { class: 'aviso' }, fmt(T.trialDone, { resumen: r.resumen || r.s })),
    explicacion(conVariante(JUEGOS_COPA[id], variante), { s: r.s, ms: r.ms, det: r.det, copa: false }),
    el('button', { class: 'btn btn--yellow', id: 'btn-volver-ensayo', onClick: () => { SFX.tap(); volver(); } }, T.trialBack));
}

function resultadoPractica(id, semilla, r, variante = null) {
  const J = conVariante(JUEGOS_COPA[id], variante), rk = varianteRk(id, variante);
  // Uno al día: el primer intento queda como el resultado de hoy; los demás son práctica
  // A game with no cap brings its own 0–100 curve (D-526); the rest are already 0–100
  const sDia = JUEGOS[id]?.puntajeDia ? JUEGOS[id].puntajeDia(r.s) : Math.min(100, r.s);
  const hoy = HOY ? anotarUnoAlDia(S.hoy.fecha, { j: id, s: sDia, ms: r.ms }) : null;
  if (HOY) dailySave(S.hoy.fecha, id).borrar();   // finished: nothing to go on with (D-433)
  // Los rankings (D-212): se anota si hay jugador; si entra recién aquí, esta partida igual cuenta.
  // De Uno al día, solo el primer intento: después el tablero ya se conoce (D-230)
  const cuentaRk = rankea(id) && (!hoy || hoy.primera);
  // En Uno al día, el ranking que se ve es el de Uno al día (su tarjeta): el del juego no se muestra
  const ranking = cuentaRk && !hoy ? bloqueRanking({ juego: tablaRk(id, variante), titulo: tituloRk(J), pestanas: ['semana', 'siempre', 'amigos'], alTocar: () => SFX.tap() }) : null;
  const aviso = el('div', {});
  let anotada = false;
  const anotar = () => {
    if (!cuentaRk || anotada || !leerYo()) return;
    anotada = true;
    aviso.replaceChildren(avisoPartida({ juego: id, variante: rk, s: r.s, ms: r.ms, alAnotar: () => ranking?.recargar() }));
  };
  if (cuentaRk) {
    // Plegado: los botones del final tienen que verse sin desplazar (C-8)
    // En Uno al día, entrar ya lo ofrece su tarjeta (con la racha): no se ofrece dos veces
    if (leerYo()) anotar(); else if (!hoy) aviso.append(bloqueJugador({ destacado: true, alTocar: () => SFX.tap() }));
    jugador().then(Jg => { const off = Jg.escuchar(() => { if (S.pantalla !== 'resultado') { off(); return; } anotar(); }); }).catch(() => {});
  }
  // How it went, for the panel (D-210); with the variant first when the game has one (D-331): "hard · 80/100 · 2:30"
  trackFinish({ detalle: `${variante ? `${variante} · ` : ''}${r.s}/100${r.ms ? ` · ${mmss(r.ms)}` : ''}` });
  mostrar('resultado');
  SFX.win();
  // Un juego `diario` (D-267): "otra" es otro caso al azar, y si no era el de hoy, se ofrece el de hoy
  const diario = !!gameById(id)?.diario && !hoy;
  const otra = diario ? paginaSuelta(id, { semilla: codigoAlAzar() })
    : SUELTO ? paginaSuelta(id) : `${location.pathname}?practice=${slugDe(id)}${PRUEBA ? '&test' : ''}${LABS ? '&labs' : ''}`;
  const deHoy = diario && semilla !== semillaDel(fechaLocal());
  const enLab = LABS && !!gameById(id)?.labs;
  const body = $('#resultado-body');
  body.innerHTML = '';
  poner(body,
    el('div', { class: 'result-hero' },
      el('span', { class: con('trophy pop', J.emoji) }, J.emoji),
      el('h2', { class: 'display display--md' }, J.nombre),
      el('p', { class: 'muted', style: 'margin:0' }, T.yourScore),
      el('div', { class: 'score-big' }, r.resumen || String(r.s)),
      hoy?.primera && JUEGOS[id]?.puntajeDia ? el('p', { class: 'muted', id: 'puntaje-dia' }, fmt(T.dailyScaled, { n: sDia })) : null,
      ...bajoElPuntaje(r.t, r.ms, id)),
    // Uno al día: la racha, compartir sin decir el juego, jugar otro o ver todo (D-230)
    hoy ? tarjetaResultado({ lang: LANG, fecha: S.hoy.fecha, primera: hoy.primera, dia: hoy.dia, raiz: RAIZ, alTocar: () => SFX.tap(), mmss, grid: id === 'agentes' && !gridsNuevos ? null : shareGrid(id, r.t) }) : null,
    aviso,
    // Suelto se comparte como cualquier juego jugado solo, con su página (D-162, D-165)
    // El de un juego `diario` lleva su semilla: quien lo recibe juega el mismo caso, también mañana
    (!LABS || diario) && !hoy && gameById(id)?.suelto ? botonResultadoSolo({ C: COMMON[LANG] || COMMON.es, emoji: J.emoji, juego: J.varianteNombre ? `${J.nombre} · ${J.varianteNombre}` : J.nombre, puntaje: r.resumen || String(r.s), tiempo: mmss(r.ms), tarjeta: r.t, url: withLang(`${SITIO}${gameById(id).path}${[diario && `seed=${semilla}`, rk && `mode=${rk}`].filter(Boolean).join('&').replace(/^./, c => `?${c}`)}`, LANG), alTocar: () => SFX.tap() }) : null,
    hoy ? null : el('a', { class: 'btn btn--yellow', id: 'btn-otra', href: otra }, diario ? T.casoOtro : T.practiceAgain),
    deHoy ? el('a', { class: 'btn btn--ghost btn--sm', id: 'btn-de-hoy', href: paginaSuelta(id) }, `📅 ${T.casoDeHoy}`) : null,
    LABS && !hoy && !diario ? el('a', { class: 'btn btn--cyan btn--sm', id: 'btn-repetir', href: `${otra}${otra.includes('?') ? '&' : '?'}seed=${semilla}` }, T.practiceSame) : null,
    // One a Day's exits are in its card (C-19); the rest go back to the menu (or the lab), before 🐞
    hoy ? null : volverDePractica(),
    // The long detail, folded, after the actions and the exits (C-19)
    explicacion(J, { s: r.s, ms: r.ms, det: r.det, copa: false }),
    // El de un juego `diario` no: su semilla ya va en el link de compartir y en el comentario
    LABS && !hoy && !diario ? el('p', { class: 'muted center' }, fmt(T.practiceSeed, { semilla })) : null,
    ranking,
    enLab ? null : botonReporte({ juego: id, semilla, puntaje: r.s, resumen: r.resumen }),
    // En la página de un juego del laboratorio, el comentario va abierto y al final de todo (D-265, D-268)
    enLab ? formularioComentario({ T: TB(), enviar: enviarComentario(), contexto: {
      juego: id, semilla, puntaje: r.s, resumen: r.resumen, tiempo: mmss(r.ms), url: location.pathname + location.search,
      pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
    } }) : null);
  // Outside the lab, the quiet inbox link after everything (D-345): one-player games and One a Day
  if (!enLab) ponerBuzon(body, { juego: id, contexto: { semilla, resumen: r.resumen ?? r.s, ...(hoy ? { dia: hoy.dia } : {}) } });
}

/* ------------------------------------------------------------------ */
/* Reportar un problema o dejar un comentario (LIG-42)                 */
/* ------------------------------------------------------------------ */

/**
 * El nombre de quien reporta queda en este dispositivo (no en la cuenta: en el laboratorio no la
 * hay), para no escribirlo en cada reporte. Si el almacenamiento está bloqueado, no pasa nada.
 */
const NOMBRE_REPORTE = 'juegos-de-salon:copa:reporte-nombre';
const nombreReporte = {
  leer() { try { return localStorage.getItem(NOMBRE_REPORTE) || ''; } catch (_) { return ''; } },
  guardar(n) { try { if (n) localStorage.setItem(NOMBRE_REPORTE, n); else localStorage.removeItem(NOMBRE_REPORTE); } catch (_) { /* nada */ } },
};

/** El botón que lleva al formulario, con lo que se sabe de dónde se apretó. */
function botonReporte(extra = {}) {
  return el('button', { class: 'link-btn reporte-btn', id: 'btn-reporte', onClick: () => { SFX.tap(); reportar(extra); } }, T.reportButton);
}

/**
 * El país de este celular en dos letras (`CL`), del huso horario y si no del idioma, igual que
 * el de las salas (D-79). Va al inscribirse y en los reportes, para que el panel del dueño sepa
 * dónde se juega (D-207). Si no se sabe, vacío: mejor sin bandera que con una inventada.
 */
function miPais() {
  try { return countryOf({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang: navigator.language }); } catch (_) { return ''; }
}

/**
 * Quien se inscribió antes de que la copa guardara el país (D-207) lo anota la próxima vez que
 * abre su copa, una sola vez y sin esperar: el panel del dueño pone la bandera junto a cada
 * nombre (D-209). Si no se sabe o falla, nada: quien juega no se entera.
 */
let paisAnotado = false;
function anotarPais(Lc) {
  if (paisAnotado || !S.yo || Lc.players?.[S.yo]?.co) return;
  paisAnotado = true;
  const co = miPais();
  if (co) store.ponerPais?.(S.code, S.yo, co).catch(() => { /* mejor esfuerzo */ });
}

/**
 * El formulario va en su propia pantalla y vuelve a la que se estaba mirando. Además del
 * texto se manda el contexto (copa, día, pantalla, versión y navegador), sin mostrarlo: es para
 * el dueño (D-306). Nunca el PIN ni lo que se está jugando.
 */
function reportar(extra = {}) {
  const volverA = S.pantalla;
  const contexto = {
    // El país va arriba: el contexto se corta a 500 letras y lo de abajo es lo que se pierde
    copa: S.code || null, jugador: S.yo ? nombreDe(S.yo) : null, pais: miPais() || null, pantalla: volverA,
    dia: S.verDia || S.juego?.d || null, ...extra,
    url: location.pathname + location.search, navegador: navigator.userAgent.slice(0, 160),
  };
  const volver = () => {
    if (volverA === 'tablero') tablero();
    else if (volverA === 'resultado' && S.verDia) resultado(S.verDia);
    else mostrar(volverA || 'intro');
  };
  mostrar('reporte');
  const body = $('#reporte-body');
  body.innerHTML = '';
  const err = el('div', { class: 'form-error', role: 'alert' });
  const texto = el('textarea', { class: 'reporte-texto', maxlength: '1000', rows: '3', placeholder: T.reportPlaceholder, 'aria-label': T.reportTitle });
  const nombre = el('input', { class: 'mini', id: 'reporte-nombre', maxlength: '40', autocomplete: 'given-name', placeholder: T.reportNamePh, value: nombreReporte.leer() || contexto.jugador || cuenta.nombre.get() || '', 'aria-label': T.reportNamePh });
  const correo = campoCorreo({}, 'reporte-correo');
  const enviarBtn = el('button', { class: 'btn btn--yellow', id: 'btn-enviar-reporte' }, T.reportSend);
  enviarBtn.addEventListener('click', async () => {
    const t = texto.value.trim();
    if (!t) { avisoError(err, T.reportEmpty); return; }
    const c = correo.valor();
    if (c === null) { avisoError(err, correo.malo); correo.input.focus(); return; }
    nombreReporte.guardar(nombre.value.trim().slice(0, 40));
    enviarBtn.disabled = true; enviarBtn.textContent = T.sending2;
    try {
      // Sin cuenta (D-104): en la práctica no se abre el almacén ni su sesión anónima
      const reportar = PRUEBA ? (await abrirStore()).reportar : (await import('./reportes.js')).enviarReporte;
      await reportar({
        texto: t.slice(0, 1000), nombre: nombre.value.trim().slice(0, 40), ...(c ? { correo: c } : {}),
        contexto: JSON.stringify(contexto).slice(0, 500),
        v: versionOf(releaseOf(document)) || 'dev',
      });
      body.innerHTML = '';
      SFX.reveal();
      poner(body, el('div', { class: 'aviso bien' }, T.reportThanks),
        el('button', { class: 'btn btn--yellow', id: 'btn-reporte-volver', onClick: () => { SFX.tap(); volver(); } }, T.reportBack));
    } catch (e) {
      // No se pudo enviar, pero quedó en el dispositivo y se reenvía solo (D-109)
      if (e?.guardado) {
        body.innerHTML = '';
        poner(body, el('div', { class: 'aviso' }, T.reportQueued),
          el('button', { class: 'btn btn--yellow', id: 'btn-reporte-volver', onClick: () => { SFX.tap(); volver(); } }, T.reportBack));
        return;
      }
      avisoError(err, errorDe(e));
      enviarBtn.disabled = false; enviarBtn.textContent = T.reportSend;
    }
  });
  poner(body,
    el('h2', { class: 'display display--md center' }, T.reportTitle),
    el('p', { class: 'muted' }, T.reportLead),
    el('div', { class: 'panel stack' }, texto,
      el('label', { class: 'lead', for: 'reporte-nombre', style: 'margin:0' }, T.reportNameLabel), nombre,
      el('p', { class: 'muted', style: 'margin:0' }, T.reportNameKeep), correo.input, correo.nota),
    err, enviarBtn,
    el('button', { class: 'btn btn--ghost btn--sm', onClick: () => { SFX.tap(); volver(); } }, T.reportCancel));
  texto.focus();
}

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

sparkles();
initSound();
applyStatic(T);
document.documentElement.lang = LANG;
document.title = `${T.title} 🏆 · ${(COMMON[LANG] || COMMON.es).appTitle}`;
$('#sound-slot').append(soundToggle());
// Desde el laboratorio (?labs), "volver" es volver ahí; si no, al menú (D-175)
if (LABS) {
  $('#btn-menu').setAttribute('href', `${RAIZ}labs/`);
  $('#btn-menu').textContent = T.backToLabsShort;
}
// In a day's cover (before playing), the top-left button goes back to the cup's board, not to
// the app's menu: it replaces the "Back to the cup" button that closed the screen
$('#btn-menu').addEventListener('click', ev => {
  if (ev.button > 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
  // A trial run goes back to its day's cover; a result, to the board. A real day in play keeps the
  // link, so the back guard asks «¿Salir de la partida?» first (D-432)
  const portadaDia = S.pantalla === 'jugar' && S.antesala;
  const ensayoDia = pillAlTablero() && S.pantalla === 'jugar' && S.juego?.ensayo;
  const resultadoDia = pillAlTablero() && S.pantalla === 'resultado';
  if (!portadaDia && !ensayoDia && !resultadoDia) return;
  ev.preventDefault();
  SFX.tap();
  if (ensayoDia) antesDeJugar(S.juego.d);
  else tablero();
});
// Los reportes que no alcanzaron a enviarse se reintentan al abrir (D-109). En el modo de prueba
// no hay barra para adelantar el reloj (D-112): las demos y los guiones lo hacen por su cuenta.
if (!PRUEBA) import('./reportes.js').then(m => m.reenviarPendientes()).catch(() => { /* la próxima vez */ });

// Gancho de solo lectura para las pruebas (C-14)
window.__copa = {
  get estado() { return { pantalla: S.pantalla, code: S.code, yo: S.yo, copa: S.L ? JSON.parse(JSON.stringify(S.L)) : null, juego: S.juego }; },
  get store() { return store; },
  prueba: PRUEBA,
};

/** Abrir una copa por su link propio (?pirata, D-121). La URL se queda como está. */
async function abrirPorAlias(a) {
  espera('…');
  try {
    const st = await abrirStore(); await st.listo();
    const x = await st.alias(a);
    if (!x?.code) { espera(fmt(T.errNoAlias, { a }), { error: true }); return; }
    await abrirCopa(x.code);
  } catch (e) { espera(errorDe(e), { error: true, reintentar: () => location.reload() }); }
}

/** Una demo: siembra la escena, deja la sesión de quien mira y la abre. */
async function demo(nombre) {
  const st = await abrirStore();
  await st.listo();
  st.reiniciarReloj();
  const { sembrar, MIS_COPAS } = await import('./demo.js');
  // One cup per status of "Tus copas" (#seccion-copa-estado), then the home page with them
  if (nombre === 'mine') {
    for (const [escena, copa] of [...MIS_COPAS].reverse()) {
      const x = sembrar(escena, { now: st.now(), uid: st.uid, copa });
      if (x?.pid) cuenta.recordar(x.code, x.pid, { nombre: x.nombre, copa: x.meta.name, fin: x.meta.end });
    }
    history.replaceState(null, '', `${location.pathname}?test${tiene('lab') ? '&lab' : ''}`);
    portada();
    return;
  }
  const e = sembrar(nombre, { now: st.now(), uid: st.uid });
  if (!e) { portada(); return; }
  if (e.pid) cuenta.recordar(e.code, e.pid, { nombre: e.nombre, copa: e.meta.name, fin: e.meta.end });
  // `&lab` stays: the demo of a lab change (`&demo=resumed`) needs it after the code goes in the URL
  history.replaceState(null, '', `${location.pathname}?test&${e.code}${tiene('lab') ? '&lab' : ''}`);
  await abrirCopa(e.code, { recienCreada: e.recien, pantalla: e.pantalla });
}

if (SUELTO) practica(PRACTICA);
else if (PRACTICA) { if (LABS) practica(PRACTICA); }
else if (DEMO) demo(DEMO);
else if (codigoUrl && esCodigo(codigoUrl)) abrirCopa(codigoUrl);
else if (aliasUrl) abrirPorAlias(aliasUrl);
else portada();
