/**
 * Duende — lab prototype, inspired by the TV game played over the phone in the nineties (Hugo, ITE,
 * 1990): the owner asked for "the same idea, in a game-room mode". Our own gnome, our own name and
 * our own drawings. Spanish only, for friends to try.
 *
 * It opens on an old TV: the gnome in big pixels walks in and waves, the picture glitches, and he
 * comes out as the game room's gnome on the cover. In the game he runs down a three-lane track and is
 * moved with a phone's keys (4 ◀, 6 ▶, 2 jump, 8 duck), drawn under the track; a swipe on the track
 * does the same, and so does a keyboard. Each stretch is a checkpoint, faster, with a new obstacle.
 * The engine is engine.js; the drawing, scene.js.
 */
import { salidasFin } from '../../assets/js/fin.js';
import { el, vibrate, sparkles, confetti } from '../../assets/js/ui.js';
import { SFX, soundToggle, initSound } from '../../assets/js/sound.js';
import { onScreen } from '../../assets/js/on-screen.js';
import { COMMON, SITIO } from '../../assets/js/i18n.js';
import { botonResultadoSolo } from '../../assets/js/compartir.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { formularioComentario, abrirComentario } from '../../assets/js/labs-idioma.js';
import { newGame, step, act, autopilot, shift, score, coins, card, still, LIVES, READY_MS } from './engine.js';
import { escena, gnomo, teleRetro, themeOf } from './scene.js';

trackVisit();   // the site's traffic (D-208)

const GAME_ID = 'phone-run';
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BEST_KEY = 'juegos-de-salon:phone-run-best';
const PARAMS = new URLSearchParams(location.search);
const T = {
  nombre: 'Duende',
  lema: 'Corre, esquiva y junta oro con las teclas del teléfono.',
  credito: 'Inspirado en el juego de la tele que se jugaba llamando por teléfono, en los noventa.',
  saltar: 'Saltar intro ›',
  como: [
    ['📞', 'Con las teclas: 4 ◀ y 6 ▶ cambian de carril, 2 salta y 8 se agacha. O desliza el dedo en la pista.'],
    ['🪨', 'Salta rocas y troncos, agáchate bajo las ramas y esquiva los carros.'],
    ['📍', 'Cada tramo es un control y va más rápido. Si chocas, pierdes una de tus 3 vidas y vuelves al control.'],
  ],
  jugar: '📞 Jugar',
  listo: '¡Prepárate!', ya: '¡Corre!',
  tramo: 'Tramo {n}',
  control: '📍 ¡Control! Tramo {n}',
  nuevo: {
    roca: '🪨 Rocas: cámbiate de carril con 4 y 6, o sáltalas con 2',
    tronco: '🪵 Troncos: sáltalos con 2',
    rama: '🌿 Ramas: agáchate con 8',
    carro: '🛒 Carros: muy altos, cámbiate de carril',
  },
  mas: '⚡ ¡Más rápido!',
  auch: { roca: '💥 ¡Una roca!', tronco: '💥 ¡El tronco!', rama: '💥 ¡La rama!', carro: '💥 ¡El carro!' },
  vuelve: 'Vuelves al control',
  ultima: '❤️ ¡Última vida!',
  pausa: 'Pausa', seguir: 'Toca para seguir',
  fin: 'Fin del juego',
  record: '🏆 ¡Récord!',
  mejor: 'Tu récord: {n}',
  mejorCorto: '🏆 Récord: {n}',
  desglose: { tramo: '📍 Llegaste al tramo {n}.', monedas: ['🪙 Ninguna moneda.', '🪙 1 moneda.', '🪙 {n} monedas.'], puntos: 'Cada control vale 100 y cada moneda 10.' },
  teclas: { 2: 'Salta', 4: 'Izquierda', 6: 'Derecha', 8: 'Agáchate' },
  otraVez: '🔁 Jugar otra vez',
  comentarAbrir: '💬 Dejar un comentario',
  comentario: { titulo: '¿Qué te pareció?', lead: 'Cuéntanos si las teclas respondían, si se puso difícil muy pronto o muy tarde, y qué le cambiarías.', ph: 'Por ejemplo: el tramo 3 es demasiado rápido.', nombre: 'Nombre o apodo (opcional)', enviar: 'Enviar comentario', enviando: 'Enviando…', vacio: 'Escribe algo primero.', gracias: '¡Gracias! 🙌 Llegó tu comentario.', guardado: 'Ahora no hay internet: tu comentario quedó guardado en este teléfono y se enviará después.', error: 'No se pudo enviar. Prueba de nuevo en un rato.', cancelar: 'Cancelar', cerrar: 'Cerrar' },
};
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const KEYS = { 2: 'jump', 4: 'left', 6: 'right', 8: 'duck' };
const ARROW = { 2: '▲', 4: '◀', 6: '▶', 8: '▼' };

const vista = document.getElementById('vista');
const pie = document.getElementById('pie');
const S = { g: null, fin: false, desde: 0, antes: 0, pausa: 0, accion: null, pausar: null };

function pieComentario(pantalla) {
  pie.replaceChildren(el('button', {
    type: 'button', class: 'link-btn', id: 'btn-comentario',
    onClick: () => { SFX.tap(); abrirComentario({ T: T.comentario, contexto: contexto(pantalla) }); },
  }, T.comentarAbrir));
}
const contexto = pantalla => ({
  juego: GAME_ID, pantalla, puntaje: S.g ? score(S.g) : 0, tramo: S.g ? S.g.s + 1 : 0,
  url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

let animando = 0;   // the frame loop on screen; a new screen stops the old one

/* ------------------------------------------------------------------ */
/* The intro: the old TV                                               */
/* ------------------------------------------------------------------ */

const TV_MS = 3600, GLITCH_MS = 700;

function intro() {
  const vez = ++animando;
  const tv = el('canvas', { class: 'tele-pixeles', width: 104, height: 84, 'aria-hidden': 'true' });
  const caja = el('div', { class: 'tele', id: 'tele' }, el('div', { class: 'tele-vidrio' }, tv, el('div', { class: 'tele-lineas' })), el('div', { class: 'tele-perillas', 'aria-hidden': 'true' }, el('span'), el('span')));
  const saltar = el('button', { type: 'button', class: 'link-btn', id: 'btn-saltar' }, T.saltar);
  const capa = el('div', { class: 'intro', id: 'intro', role: 'button', tabindex: 0, 'aria-label': T.saltar }, caja, saltar);
  vista.replaceChildren(capa);
  pie.replaceChildren();
  const ctx = tv.getContext('2d');
  let t0 = 0, listo = false;
  const terminar = () => {
    if (listo || vez !== animando) return;
    listo = true;
    portada(true);
  };
  capa.addEventListener('pointerdown', ev => { ev.preventDefault(); terminar(); });
  capa.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); terminar(); } });
  const paso = now => {
    if (vez !== animando || listo) return;
    t0 ||= now;
    const ms = now - t0;
    teleRetro(ctx, tv.width, tv.height, Math.min(ms, TV_MS));
    if (ms > TV_MS) {
      // The picture breaks up: lines that slide, colors that split, and then it goes into the game room
      const p = (ms - TV_MS) / GLITCH_MS;
      for (let i = 0; i < 6; i++) {
        const y = Math.floor(Math.random() * tv.height), hh = 2 + Math.floor(Math.random() * 6);
        ctx.drawImage(tv, 0, y, tv.width, hh, (Math.random() - 0.5) * 18 * p, y, tv.width, hh);
      }
      caja.classList.add('falla');
      if (p >= 1) { caja.classList.add('entra'); setTimeout(terminar, 420); return; }
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  capa.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ */
/* The cover                                                           */
/* ------------------------------------------------------------------ */

const tituloJuego = (chico = false) => el('h1', { class: `titulo-duende${chico ? ' chico' : ''}` },
  el('span', { class: 'logo', 'aria-hidden': 'true' }, '📞'), el('span', { class: `display ${chico ? '' : 'display--lg '}rainbow` }, T.nombre));
const pasos = () => el('ol', { class: 'pasos' }, ...T.como.map(([ico, x]) => el('li', {}, el('span', { class: 'paso-ico', 'aria-hidden': 'true' }, ico), el('span', {}, x))));

function portada(desdeIntro = false) {
  const vez = ++animando;
  const retrato = el('canvas', { class: 'retrato', 'aria-hidden': 'true' });
  const demo = el('canvas', { class: 'demo-pista', 'aria-hidden': 'true' });
  vista.replaceChildren(
    el('div', { class: `portada${desdeIntro && !QUIETO ? ' aparece' : ''}`, id: 'portada' },
      retrato, tituloJuego(), el('p', { class: 'lead', style: 'margin:0' }, T.lema), el('p', { class: 'credito' }, T.credito), demo),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-jugar', onClick: () => { SFX.tap(); jugar(); } }, T.jugar),
    // The steps go after Play, so it is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' }, pasos()),
  );
  pieComentario('portada');
  if (desdeIntro && !QUIETO) { SFX.reveal(); confetti({ count: 50, duration: 900 }); }
  // The gnome waving on the cover, and the track running itself under the title
  const rc = retrato.getContext('2d');
  const sc = escena(demo);
  let g = newGame(`demo${Date.now() % 1000}`, performance.now());
  const pinta = now => {
    const dpr = Math.min(2, devicePixelRatio || 1), r = retrato.getBoundingClientRect();
    if (retrato.width !== Math.round(r.width * dpr)) { retrato.width = Math.round(r.width * dpr); retrato.height = Math.round(r.height * dpr); }
    rc.setTransform(dpr, 0, 0, dpr, 0, 0); rc.clearRect(0, 0, r.width, r.height);
    const pop = desdeIntro && !QUIETO ? Math.min(1, (now - nace) / 450) : 1;
    const s = r.height / 2.15 * (pop < 1 ? 0.4 + 0.75 * Math.sin(pop * Math.PI * 0.62) : 1);
    gnomo(rc, r.width / 2, r.height - 4, s, { wave: QUIETO ? null : now });
  };
  const nace = performance.now();
  if (QUIETO) {
    requestAnimationFrame(now => { pinta(now); step(g, now + 6000); sc.draw(g, now + 6000); });
    return;
  }
  const paso = now => {
    if (vez !== animando || !demo.isConnected) return sc.cerrar();
    for (const e of step(g, now)) if (e.type === 'over' || e.type === 'hit') g = newGame(`demo${Math.round(now)}`, now);
    const a = autopilot(g, now);
    if (a) act(g, a, now);
    if (g.s >= 4) g = newGame(`demo${Math.round(now)}`, now);
    pinta(now);
    sc.draw(g, now);
    otro();
  };
  const otro = onScreen(demo, paso);
  otro();
}

/* ------------------------------------------------------------------ */
/* The phone's keypad                                                  */
/* ------------------------------------------------------------------ */

function teclado(alApretar) {
  const lcd = el('div', { class: 'fono-lcd', id: 'lcd', 'aria-live': 'polite' });
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => {
    const activa = KEYS[k];
    const b = el('button', {
      type: 'button', class: `tecla${activa ? ' activa' : ''}`, 'data-k': k, tabindex: -1,
      'aria-label': activa ? `${k}: ${T.teclas[k]}` : k, 'aria-hidden': activa ? null : 'true',
    }, el('span', { class: 'num' }, k), activa ? el('span', { class: 'flecha' }, ARROW[k]) : null);
    // On the finger's touch, not on its lift: a key answers at once
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); apretada(k); if (activa) alApretar(KEYS[k], k); else SFX.tick(); });
    return b;
  });
  const fono = el('div', { class: 'fono', id: 'fono' },
    el('div', { class: 'fono-parlante', 'aria-hidden': 'true' }), lcd, el('div', { class: 'teclas' }, ...teclas));
  return { fono, lcd };
}
function apretada(k) {
  const b = document.querySelector(`.tecla[data-k="${k}"]`);
  if (!b) return;
  b.classList.remove('apretada'); void b.offsetWidth; b.classList.add('apretada');
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('apretada'), 140);
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

function jugar() {
  const vez = ++animando;
  const seed = PARAMS.get('seed') || String(Date.now());
  S.g = newGame(seed, performance.now()); S.fin = false; S.desde = Date.now(); S.pausa = 0;
  trackStart({ game: GAME_ID, mode: 'solo', players: 1 });
  const lienzo = el('canvas', { class: 'lienzo-pista', 'aria-hidden': 'true' });
  const vidas = el('div', { class: 'hud-vidas', id: 'vidas', 'aria-label': `${LIVES} vidas` });
  const oro = el('div', { class: 'hud-oro', id: 'oro' }, '🪙 0');
  const tramo = el('div', { class: 'hud-tramo', id: 'tramo' }, fmt(T.tramo, { n: 1 }));
  const aviso = el('div', { class: 'aviso-pista', id: 'aviso', 'aria-live': 'polite' });
  const cartel = el('div', { class: 'pausa-pista', id: 'pausa', 'aria-live': 'polite', hidden: true },
    el('span', { class: 'titulo-pausa' }, el('span', { 'aria-hidden': 'true' }, '⏸️'), el('span', { class: 'display rainbow' }, T.pausa)), el('span', {}, T.seguir));
  const escenario = el('div', { class: 'escenario', id: 'escenario', tabindex: 0, 'aria-label': T.como[0][1] }, lienzo, vidas, tramo, oro, aviso, cartel);
  const antes = S.antes = mejorAntes();
  const mejor = el('span', { class: 'mejor-duende', id: 'mejor-juego' }, antes ? fmt(T.mejorCorto, { n: antes }) : '');
  const { fono, lcd } = teclado((accion, k) => mover(accion, k));
  vista.replaceChildren(el('div', { class: 'cabeza-duende' }, tituloJuego(true), mejor), escenario, fono);
  pieComentario('juego');
  document.body.classList.add('jugando');
  const sc = escena(lienzo);

  let avisoHasta = 0;
  const decir = (texto, ms = 1600, clase = '') => {
    aviso.className = `aviso-pista ${clase}`;
    aviso.replaceChildren(el('span', {}, texto));
    void aviso.offsetWidth; aviso.classList.add('ve');
    avisoHasta = performance.now() + ms;
  };
  const pintarHud = () => {
    const g = S.g;
    vidas.replaceChildren(...Array.from({ length: LIVES }, (_, i) => el('span', { class: i < g.lives ? 'vida' : 'vida perdida' }, '❤️')));
    vidas.setAttribute('aria-label', `${g.lives} vidas`);
    oro.textContent = `🪙 ${coins(g)}`;
    tramo.textContent = fmt(T.tramo, { n: g.s + 1 });
    lcd.textContent = `TRAMO ${g.s + 1} · ${score(g)} PTS`;
  };
  pintarHud();
  decir(T.listo, READY_MS, 'grande');
  let dijoYa = false;

  const mover = (accion, k) => {
    if (S.fin) return;
    if (S.pausa) return reanudar();
    const now = performance.now();
    procesar(step(S.g, now));
    if (k) apretada(k);
    if (act(S.g, accion, now)) { vibrate(6); }
  };
  S.accion = mover;

  const procesar = evs => {
    for (const e of evs) {
      if (e.type === 'coin') { SFX.tick(); oro.classList.remove('brilla'); void oro.offsetWidth; oro.classList.add('brilla'); }
      if (e.type === 'checkpoint') {
        SFX.reveal(); vibrate(15);
        if (!QUIETO) confetti({ count: 40, duration: 900 });
        decir(fmt(T.control, { n: e.s + 1 }), 1500, 'grande');
        const kind = ['roca', 'tronco', 'rama', 'carro'][e.s];
        setTimeout(() => { if (vez === animando && !S.fin) decir(kind ? T.nuevo[kind] : T.mas, 2200); }, 1500);
      }
      if (e.type === 'hit') {
        SFX.hit(); vibrate([40, 30, 60]);
        escenario.classList.remove('sacude'); void escenario.offsetWidth; escenario.classList.add('sacude');
        decir(`${T.auch[e.kind]} ${e.lives ? T.vuelve : ''}`.trim(), 1400, 'golpe');
      }
      if (e.type === 'restart') { dijoYa = false; decir(S.g.lives === 1 ? T.ultima : T.listo, READY_MS, 'grande'); }
      if (e.type === 'over') return perder();
    }
    if (evs.length) pintarHud();
  };

  // Paused when the page is hidden or loses focus (a call, another app): the track freezes, and the
  // first touch back only takes the pause off
  const pausar = () => {
    if (S.fin || S.pausa || vez !== animando) return;
    S.pausa = performance.now();
    cartel.hidden = false;
  };
  const reanudar = () => {
    if (!S.pausa) return;
    S.despertar?.();
    shift(S.g, performance.now() - S.pausa);
    S.pausa = 0;
    cartel.hidden = true;
    SFX.tap();
  };
  S.pausar = pausar;
  const fuera = new AbortController();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); }, { signal: fuera.signal });
  addEventListener('blur', pausar, { signal: fuera.signal });
  addEventListener('pagehide', pausar, { signal: fuera.signal });

  // The keyboard: the phone's digits (also the numeric keypad), the arrows, WASD and the space bar
  const TECLADO = { 2: 'jump', 8: 'duck', 4: 'left', 6: 'right', ArrowUp: 'jump', ArrowDown: 'duck', ArrowLeft: 'left', ArrowRight: 'right', w: 'jump', s: 'duck', a: 'left', d: 'right', ' ': 'jump' };
  const DIGITO = { jump: '2', duck: '8', left: '4', right: '6' };
  addEventListener('keydown', ev => {
    const accion = TECLADO[ev.key] || TECLADO[ev.key?.toLowerCase?.()];
    if (!accion || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    ev.preventDefault();
    if (!ev.repeat) mover(accion, DIGITO[accion]);
  }, { signal: fuera.signal });

  // A swipe on the track: its direction is the move; a tap without moving jumps
  let toque = null;
  escenario.addEventListener('pointerdown', ev => {
    if (ev.button > 0) return;
    ev.preventDefault();
    if (S.pausa) return reanudar();
    toque = { x: ev.clientX, y: ev.clientY, hecho: false };
    escenario.setPointerCapture?.(ev.pointerId);
  });
  const deslizar = ev => {
    if (!toque || toque.hecho) return;
    const dx = ev.clientX - toque.x, dy = ev.clientY - toque.y;
    if (Math.hypot(dx, dy) < 22) return;
    toque.hecho = true;
    const accion = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'jump' : 'duck');
    mover(accion, DIGITO[accion]);
  };
  escenario.addEventListener('pointermove', deslizar);
  escenario.addEventListener('pointerup', ev => { deslizar(ev); if (toque && !toque.hecho) mover('jump', '2'); toque = null; });
  escenario.addEventListener('pointercancel', () => { toque = null; });
  escenario.focus({ preventScroll: true });

  function perder() {
    if (S.fin) return;
    S.fin = true;
    fuera.abort();
    SFX.error();
    decir(T.fin, 2000, 'grande final');
    setTimeout(() => { if (vez === animando) resultado(); }, QUIETO ? 400 : 1500);
  }

  const paso = now => {
    if (vez !== animando || !lienzo.isConnected) { fuera.abort(); return sc.cerrar(); }
    if (!S.pausa && !S.fin) {
      procesar(step(S.g, now));
      if (!dijoYa && !still(S.g, now)) {
        dijoYa = true;
        decir(S.g.s === 0 && S.g.lives === LIVES ? T.nuevo.roca : T.ya, S.g.s === 0 && S.g.lives === LIVES ? 2600 : 700, S.g.s === 0 && S.g.lives === LIVES ? '' : 'grande');
      }
      if (score(S.g) > antes && antes) { mejor.textContent = fmt(T.mejorCorto, { n: score(S.g) }); mejor.classList.add('record'); }
      if (score(S.g) > antes) guardarMejor(score(S.g));
    }
    if (avisoHasta && now > avisoHasta && !S.fin) { aviso.classList.remove('ve'); avisoHasta = 0; }
    sc.draw(S.g, now, S.pausa || now);
    if (S.pausa && now - S.pausa > 1000) { S.dormido = true; return; }
    requestAnimationFrame(paso);
  };
  S.despertar = () => { if (S.dormido) { S.dormido = false; requestAnimationFrame(paso); } };
  requestAnimationFrame(paso);
}

/* ------------------------------------------------------------------ */
/* The result                                                          */
/* ------------------------------------------------------------------ */

function mejorAntes() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
function guardarMejor(n) { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } }

function resultado() {
  ++animando;
  document.body.classList.remove('jugando');
  const g = S.g, n = score(g), antes = S.antes, record = n > antes && n > 0;
  const segundos = Math.round((Date.now() - S.desde) / 1000);
  trackFinish({ detalle: `${n} pts · stretch ${g.s + 1} · ${coins(g)} coins · ${segundos}s` });
  pie.replaceChildren();
  const m = coins(g);
  vista.replaceChildren(el('div', { class: 'resultado' },
    tituloJuego(true),
    el('p', { class: 'sello-duende' }, record ? T.record : T.fin),
    el('div', { class: 'score-big', id: 'puntaje' }, String(n)),
    record ? null : el('p', { class: 'muted', style: 'margin:0', id: 'mejor' }, fmt(T.mejor, { n: Math.max(antes, n) })),
    el('ul', { class: 'desglose muted' },
      el('li', {}, fmt(T.desglose.tramo, { n: g.s + 1 })),
      el('li', {}, fmt(T.desglose.monedas[Math.min(m, 2)], { n: m })),
      el('li', {}, T.desglose.puntos)),
    botonResultadoSolo({ C: COMMON.es, emoji: '📞', juego: T.nombre, puntaje: `📞 ${n}`, tiempo: '', tarjeta: card(g), url: `${SITIO}labs/phone-run/`, alTocar: () => SFX.tap() }),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-otra', onClick: () => { SFX.tap(); jugar(); } }, T.otraVez),
    salidasFin('lab', { raiz: '../../' }),
    el('hr', { class: 'divisor' }),
    formularioComentario({ T: T.comentario, contexto: contexto('resultado') })));
  scrollTo(0, 0);
  if (record) { SFX.win(); if (!QUIETO) confetti({ count: 140, duration: 2000 }); }
}

document.getElementById('sound-slot').append(soundToggle());
initSound();
sparkles();
// The old TV first, unless motion is reduced or the link skips it (`?intro=0`, for tests)
if (QUIETO || PARAMS.get('intro') === '0') portada(); else intro();
// For the end-to-end script: the game (S.accion('jump') is a key press; S.pausar() pauses, as a
// hidden page does) and the engine's careful player
window.__duende = { S, autopilot: () => S.g && autopilot(S.g, performance.now()) };
