/**
 * Compuertas — lab prototype, the owner's idea: balls keep falling from the top through a triangle of
 * paddles («manillas») that the player flips with a tap, and the bins below change their points every
 * 10 seconds, so the routes have to keep changing. Spanish only, for friends to try. Without `?seed=`
 * it is today's game, the same for everyone. The engine is engine.js; the drawing, scene.js.
 *
 * The game runs on its own clock (ms since the start, paused while the page is hidden), and a tap
 * counts at its own timestamp, so a slow phone plays the same game (engine.js).
 */
import { salidasFin } from '../../assets/js/fin.js';
import { el, vibrate, sparkles, confetti } from '../../assets/js/ui.js';
import { SFX, soundToggle, initSound } from '../../assets/js/sound.js';
import { onScreen } from '../../assets/js/on-screen.js';
import { COMMON, SITIO } from '../../assets/js/i18n.js';
import { botonResultadoSolo } from '../../assets/js/compartir.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { formularioComentario, abrirComentario } from '../../assets/js/labs-idioma.js';
import { fechaLocal } from '../../assets/js/uno-al-dia.js';
import { cuentaRegresiva } from '../../assets/js/cuenta-regresiva.js';
import {
  newGame, advance, takeEvents, flip, autoplay, isOver, best, card, tally, nextBins,
  DURATION, PERIOD, TOP, BLAST,
} from './engine.js';
import { escena } from './scene.js';

trackVisit();   // the site's traffic (D-208)

const GAME_ID = 'compuertas';
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BEST_KEY = 'juegos-de-salon:compuertas-mejor';
const T = {
  nombre: 'Compuertas',
  lema: 'Gira las manillas para que cada pelota caiga donde más puntos vale.',
  hoy: 'La partida de hoy es la misma para todos.',
  como: [
    ['👆', 'Toca una manilla para girarla: la pelota rueda hacia donde apunta.'],
    ['🔟', `Abajo, los puntos cambian cada ${PERIOD / 1000} segundos. Lleva cada pelota al ${TOP}. Las doradas valen el triple.`],
    ['💣', `Las bombas van a la basura. En otra parte explotan y restan ${-BLAST}.`],
  ],
  empezar: '🔀 Empezar', aJugar: '¡A girar!',
  toca: 'Toca una manilla para girarla',
  cambian: '¡Cambian!',
  pausa: 'En pausa', seguir: 'Toca para seguir',
  fin: '¡Tiempo!',
  record: '🏆 ¡Tu mejor partida!',
  mejor: 'Tu mejor partida: {n}',
  deMaximo: 'de {n} posibles',
  desglose: {
    top: ['🟩 Ninguna pelota en el {top}.', '🟩 1 pelota de {n} en el {top}.', '🟩 {k} pelotas de {n} en el {top}.'],
    oro: ['⭐ La dorada cayó en el {top}.', '⭐ {k} de {n} doradas en el {top}.'],
    bombas: ['🧯 Ninguna bomba.', '🧯 Desactivaste {k} de 1 bomba.', '🧯 Desactivaste {k} de {n} bombas.'],
  },
  otraVez: '🔁 Otra partida', deHoy: '📅 La de hoy',
  comentarAbrir: '💬 Dejar un comentario',
  comentario: { titulo: '¿Qué te pareció?', lead: 'Cuéntanos si se entendía cómo giran las manillas, si alcanzabas a llevar las pelotas y qué le cambiarías.', ph: 'Por ejemplo: las pelotas caían muy rápido al final.', nombre: 'Nombre o apodo (opcional)', enviar: 'Enviar comentario', enviando: 'Enviando…', vacio: 'Escribe algo primero.', gracias: '¡Gracias! 🙌 Tu comentario llegó.', guardado: 'Ahora no hay internet: tu comentario quedó en el celular y se envía solo después.', error: 'No se pudo enviar. Prueba de nuevo en un rato.', cancelar: 'Cancelar', cerrar: 'Cerrar' },
};
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));

const vista = document.getElementById('vista');
const pie = document.getElementById('pie');
const params = new URLSearchParams(location.search);
const SEMILLA_URL = (params.get('seed') || '').trim();
const S = { g: null, semilla: '', fin: false, inicio: 0, pausado: 0, pausa: 0, antes: 0 };

function pieComentario(pantalla) {
  pie.replaceChildren(el('button', {
    type: 'button', class: 'link-btn', id: 'btn-comentario',
    onClick: () => { SFX.tap(); abrirComentario({ T: T.comentario, contexto: contexto(pantalla) }); },
  }, T.comentarAbrir));
}
const contexto = pantalla => ({
  juego: GAME_ID, pantalla, semilla: S.semilla, puntaje: S.g ? S.g.score : 0,
  url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

let animando = 0;   // the frame loop on screen; a new screen stops the old one

const tituloJuego = (chico = false) => el('h1', { class: `titulo-co${chico ? ' chico' : ''}` },
  el('span', { class: 'logo', 'aria-hidden': 'true' }, '🔀'), el('span', { class: `display ${chico ? '' : 'display--lg '}rainbow` }, T.nombre));
const pasos = () => el('ol', { class: 'pasos' }, ...T.como.map(([ico, x]) => el('li', {}, el('span', { class: 'paso-ico', 'aria-hidden': 'true' }, ico), el('span', {}, x))));

/* ------------------------------------------------------------------ */
/* The cover                                                           */
/* ------------------------------------------------------------------ */

function portada() {
  const lienzo = el('canvas', { class: 'demo-co', 'aria-hidden': 'true' });
  vista.replaceChildren(...[
    el('div', { class: 'portada' }, tituloJuego(), el('p', { class: 'lead', style: 'margin:0' }, T.lema), lienzo),
    SEMILLA_URL ? null : el('p', { class: 'muted center', style: 'margin:0' }, `📅 ${T.hoy}`),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-empezar', onClick: () => { SFX.tap(); empezar(); } }, T.empezar),
    // The steps go after Empezar, so it is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' }, pasos()),
  ].filter(Boolean));
  pieComentario('portada');
  demo(lienzo);
}

/** The cover's board plays by itself, never missing, and starts over every 20 seconds. */
function demo(lienzo) {
  const vez = ++animando;
  const sc = escena(lienzo);
  let g = newGame('portada'), desde = performance.now();
  if (QUIETO) { advance(g, 4000); requestAnimationFrame(now => sc.draw(g, 4000, now)); return; }
  const paso = now => {
    if (vez !== animando || !lienzo.isConnected) return sc.cerrar();
    let t = now - desde;
    if (t > 20000) { g = newGame(`portada-${Math.floor(now)}`); desde = now; t = 0; }
    autoplay(g, t);
    for (const e of takeEvents(g)) if (e.type === 'land') sc.land(e, now);
    sc.draw(g, t, now);
    otro();
  };
  const otro = onScreen(lienzo, paso);
  otro();
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

function empezar() {
  ++animando;
  S.semilla = SEMILLA_URL || `dia:${fechaLocal()}`;
  vista.replaceChildren(); pie.replaceChildren();
  // La Copa's 3, 2, 1 (D-105): the board is built with «¡A girar!», and the clock starts there
  cuentaRegresiva({ titulo: '🔀 Compuertas', ya: T.aJugar }).then(() => jugar());
}

/** The game's clock at the page's moment `now`: ms since the start, without the pauses. */
const reloj = now => now - S.inicio - S.pausado;

function jugar() {
  const vez = ++animando;
  S.g = newGame(S.semilla); S.fin = false; S.pausa = 0; S.pausado = 0; S.inicio = performance.now();
  S.antes = mejorAntes();
  trackStart({ game: GAME_ID, mode: 'solo', players: 1 });
  const g = S.g;
  const puntos = el('span', { class: 'puntos-co', id: 'puntos', 'aria-live': 'polite' }, '0');
  const tiempo = el('span', { class: 'reloj-co', id: 'reloj' }, `${DURATION / 1000}s`);
  const barra = el('span', {});
  const lienzo = el('canvas', { class: 'lienzo-co', id: 'tablero', 'data-tablero': 'compuertas', 'aria-label': T.toca });
  const aviso = el('div', { class: 'aviso-co', id: 'aviso' }, T.toca);
  const cartel = el('div', { class: 'pausa-co', id: 'pausa', 'aria-live': 'polite', hidden: true },
    // The emoji outside the rainbow: a gradient clipped to text paints an emoji as a colored square
    el('span', { class: 'titulo-pausa' }, el('span', { 'aria-hidden': 'true' }, '⏸️'), el('span', { class: 'display rainbow' }, T.pausa)), el('span', {}, T.seguir));
  const escenario = el('div', { class: 'escenario-co', id: 'escenario' }, lienzo, aviso, cartel);
  vista.replaceChildren(
    el('div', { class: 'cabeza-co' }, tituloJuego(true)),
    el('div', { class: 'hud-co' }, puntos, tiempo),
    el('div', { class: 'barra-co' }, barra),
    escenario,
  );
  pieComentario('juego');
  const sc = escena(lienzo);
  let avisoQuitado = false, periodoAviso = -1;

  const decir = (texto, clase) => { aviso.textContent = texto; aviso.className = 'aviso-co'; void aviso.offsetWidth; aviso.classList.add(clase); };

  /** What the engine says happened: the points rise from the bin, the score moves, a bomb shakes the board. */
  const mostrar = now => {
    for (const e of takeEvents(g)) {
      if (e.type === 'bounce') continue;
      if (e.type === 'drop') continue;
      sc.land(e, now);
      puntos.textContent = String(g.score);
      puntos.classList.remove('sube', 'baja'); void puntos.offsetWidth;
      if (e.points < 0) {
        puntos.classList.add('baja'); SFX.hit(); vibrate([40, 30, 60]);
        if (!QUIETO) { escenario.classList.remove('tiembla'); void escenario.offsetWidth; escenario.classList.add('tiembla'); }
      } else if (e.kind === 'bomb') { puntos.classList.add('sube'); SFX.splash(); vibrate(20); }
      else if (e.value === TOP) { puntos.classList.add('sube'); SFX.reveal(); vibrate(12); }
      else if (e.points > 0) { puntos.classList.add('sube'); SFX.tap(); }
      else SFX.error();
    }
  };

  const tocar = ev => {
    ev.preventDefault();
    if (S.fin) return;
    if (S.pausa) return reanudar();
    const r = lienzo.getBoundingClientRect();
    const p = sc.paddleAt(ev.clientX - r.left, ev.clientY - r.top);
    if (!p) return;
    // The tap counts at its own moment (never before the last frame: engine.js)
    const ahora = performance.now(), t0 = typeof ev.timeStamp === 'number' && ev.timeStamp > 0 && ev.timeStamp <= ahora + 50 && ev.timeStamp >= ahora - 1000 ? ev.timeStamp : ahora;
    flip(g, p[0], p[1], Math.min(DURATION, reloj(t0)));
    SFX.flip(); vibrate(8);
    if (!avisoQuitado) { avisoQuitado = true; aviso.classList.add('fuera'); }
    mostrar(ahora);
  };
  lienzo.addEventListener('pointerdown', ev => { if (ev.button > 0) return; tocar(ev); });

  // Paused when the page is hidden or loses focus (a call, another app, the screen locked): the
  // game's clock stops, and the first tap back only takes the pause off
  const pausar = () => {
    if (S.fin || S.pausa || vez !== animando) return;
    S.pausa = performance.now();
    cartel.hidden = false;
  };
  const reanudar = () => {
    if (!S.pausa) return;
    S.pausado += performance.now() - S.pausa;
    S.pausa = 0;
    cartel.hidden = true;
    SFX.tap();
    if (S.dormido) { S.dormido = false; requestAnimationFrame(paso); }
  };
  S.pausar = pausar;
  const fuera = new AbortController();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); }, { signal: fuera.signal });
  addEventListener('blur', pausar, { signal: fuera.signal });
  addEventListener('pagehide', pausar, { signal: fuera.signal });
  escenario.addEventListener('pointerdown', ev => { if (S.pausa && ev.target !== lienzo) { ev.preventDefault(); reanudar(); } });

  function terminar() {
    S.fin = true;
    fuera.abort();
    SFX.timeUp(); vibrate([40, 30, 60]);
    decir(T.fin, 'final');
    setTimeout(() => { if (vez === animando) resultado(); }, QUIETO ? 400 : 1300);
  }

  const paso = now => {
    if (vez !== animando || !lienzo.isConnected) { fuera.abort(); return sc.cerrar(); }
    const t = Math.min(DURATION, S.pausa ? reloj(S.pausa) : reloj(now));
    advance(g, t);
    mostrar(now);
    // The next values are coming: say so once per change
    const k = Math.floor(t / PERIOD) + 1;
    if (nextBins(g, t) && k !== periodoAviso && avisoQuitado) { periodoAviso = k; decir(T.cambian, 'cambio'); }
    const quedan = Math.max(0, Math.ceil((DURATION - t) / 1000));
    tiempo.textContent = `${quedan}s`;
    tiempo.classList.toggle('apura', quedan <= 10);
    barra.style.transform = `scaleX(${(1 - t / DURATION).toFixed(4)})`;
    sc.draw(g, t, now);
    if (!S.fin && isOver(g)) terminar();
    // Paused for a second (effects done): the loop sleeps until the tap back, so a game left on the
    // table does not burn battery (#892)
    if (S.pausa && now - S.pausa > 1000) { S.dormido = true; return; }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/* ------------------------------------------------------------------ */
/* The result                                                          */
/* ------------------------------------------------------------------ */

function mejorAntes() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
function guardarMejor(n) { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } }
const enlace = semilla => (semilla ? `?seed=${encodeURIComponent(semilla)}` : '');

function resultado() {
  ++animando;
  const g = S.g, n = g.score, maximo = best(g), antes = S.antes, record = n > antes && n > 0;
  if (record) guardarMejor(n);
  const c = tally(g);
  trackFinish({ detalle: `${n}/${maximo} · ${c.top}/${c.balls - c.bombs} en el ${TOP} · ${c.defused}/${c.bombs} bombas · ${g.flips} giros` });
  pie.replaceChildren();
  const normales = c.balls - c.bombs;
  const lineas = [
    fmt(T.desglose.top[c.top === 0 ? 0 : normales === 1 ? 1 : 2], { k: c.top, n: normales, top: TOP }),
    ...(c.gold ? [fmt(T.desglose.oro[c.gold === 1 ? 0 : 1], { k: c.goldTop, n: c.gold, top: TOP })] : []),
    fmt(T.desglose.bombas[c.bombs === 0 ? 0 : c.bombs === 1 ? 1 : 2], { k: c.defused, n: c.bombs }),
  ];
  vista.replaceChildren(el('div', { class: 'resultado' },
    tituloJuego(true),
    el('p', { class: 'sello-co' }, record ? T.record : T.fin),
    el('div', { class: 'score-big', id: 'puntaje' }, String(n)),
    el('p', { class: 'muted', style: 'margin:0', id: 'maximo' }, fmt(T.deMaximo, { n: maximo })),
    record ? null : el('p', { class: 'muted', style: 'margin:0', id: 'mejor' }, fmt(T.mejor, { n: Math.max(antes, n) })),
    el('ul', { class: 'desglose muted' }, ...lineas.map(x => el('li', {}, x))),
    botonResultadoSolo({ C: COMMON.es, emoji: '🔀', juego: T.nombre, puntaje: `${n}/${maximo}`, tiempo: '', tarjeta: card(g), url: `${SITIO}labs/gates/${enlace(SEMILLA_URL)}`, alTocar: () => SFX.tap() }),
    el('a', { class: 'btn btn--yellow', id: 'btn-otra', href: enlace(Math.random().toString(36).slice(2, 8)) }, T.otraVez),
    SEMILLA_URL ? el('a', { class: 'btn btn--ghost btn--sm', id: 'btn-de-hoy', href: location.pathname }, T.deHoy) : null,
    salidasFin('lab', { raiz: '../../' }),
    // A line separates the game from the comment for whoever tries it, like the other lab games
    el('hr', { class: 'divisor' }),
    formularioComentario({ T: T.comentario, contexto: contexto('resultado') })));
  scrollTo(0, 0);
  if (record) { SFX.win(); if (!QUIETO) confetti({ count: 140, duration: 2000 }); }
}

document.getElementById('sound-slot').append(soundToggle());
initSound();
sparkles();
portada();
// For the end-to-end script: the game state, a player that never misses (autoplay at the game's
// clock), moving the clock ahead (so a minute plays in seconds) and pausing as a hidden page does
window.__compuertas = {
  S, juega: () => autoplay(S.g, Math.min(DURATION, reloj(performance.now()))),
  adelanta: ms => { S.inicio -= ms; },
};
