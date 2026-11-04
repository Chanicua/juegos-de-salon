/**
 * Pulso — lab prototype: a one-finger rhythm game to generated 90s rock (the owner's request). Three
 * pads in an arc at the bottom, where the thumb reaches; notes fall to them. Taps only: a tap note is
 * tapped on time, a hold is pressed, held and released when its tail ends. The song gets harder part
 * by part, and missing too much cuts the power. One player, one level, as many points as possible.
 * Spanish only, like the other lab prototypes. Without `?seed=` it is today's song, the same for all.
 * The engine is engine.js, the band music.js.
 */
import { salidasFin } from '../../assets/js/fin.js';
import { el, vibrate, sparkles, confetti, keepAwake } from '../../assets/js/ui.js';
import { SFX, soundToggle, initSound, isMuted } from '../../assets/js/sound.js';
import { COMMON, SITIO } from '../../assets/js/i18n.js';
import { botonResultadoSolo } from '../../assets/js/compartir.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { formularioComentario, abrirComentario } from '../../assets/js/labs-idioma.js';
import { fechaLocal } from '../../assets/js/uno-al-dia.js';
import {
  cancion, nuevaPartida, tocar, soltar, avanzar, precision, tarjeta, multiplicador, seccionEn,
  CARRILES, SECCIONES, ANTICIPO, ENERGIA, VENTANAS_SOLTAR,
} from './engine.js';
import { crearBanda } from './music.js';

trackVisit();   // the site's traffic (D-208)

const GAME_ID = 'pulso';
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = {
  nombre: 'Pulso',
  lema: 'Toca al ritmo del rock, con un solo dedo.',
  hoy: 'La canción de hoy es la misma para todos.',
  como: [
    ['👆', 'Toca cada nota justo cuando llega a su botón.'],
    ['✋', 'Las notas con cola se mantienen apretadas y se sueltan justo cuando termina la cola.'],
    ['🔥', 'Cada parte va más rápido. Si fallas mucho, se corta la luz.'],
  ],
  empezar: '🎸 Empezar', record: '🏆 Tu récord: {n}',
  ajustar: '🎧 Ajustar el ritmo', ajusteActual: 'Ajuste: {ms} ms',
  audifonos: 'Mejor con sonido: el ritmo se escucha.',
  parte: 'Parte {s} de {n}', racha: '{n} seguidas',
  califs: { perfecto: '¡Perfecto!', bien: '¡Bien!', casi: 'Casi', fallo: 'Fallo', antes: 'Muy pronto', tarde: 'Muy tarde' },
  cuenta: ['1', '2', '3', '4'],
  pausa: '⏸ En pausa', seguir: '▶️ Seguir', terminar: '🏳️ Terminar', terminarSeguro: '🏳️ ¿Seguro?',
  fin: { completa: '¡Ovación!', apagon: 'Se cortó la luz', rendido: 'Terminaste' },
  finGrande: { completa: '🤘 ¡Ovación!', apagon: '🔌 ¡Se cortó la luz!' },
  desglose: {
    precision: '🎯 Precisión: {p} %.',
    racha: '🔥 Mejor racha: {n}.',
    notas: '✨ {perfecto} perfectos, {bien} bien, {casi} casi y {fallo} fallos.',
    entera: '🎸 Tocaste la canción entera.',
    hasta: '🎸 Llegaste a la parte {s} de {n}.',
  },
  nuevoRecord: '🏆 ¡Nuevo récord!', recordEra: '🏆 Tu récord: {n}.',
  otraVez: '🔁 Otra canción', deHoy: '📅 La de hoy',
  ajuste: {
    titulo: '🎧 Ajustar el ritmo',
    lead: 'Si los toques se sienten corridos (pasa con audífonos Bluetooth), esto lo arregla. Usa el mismo sonido con que vas a jugar.',
    paso: 'Toca el botón cada vez que suene un golpe.',
    empezar: '▶️ Empezar', escucha: 'Escucha y toca…',
    listo: 'Listo: tus toques llegan {ms} ms {cuando}. Quedó ajustado.',
    tarde: 'tarde', pronto: 'antes', justo: 'Listo: tus toques llegan a tiempo. Quedó ajustado.',
    pocos: 'Faltaron toques para medirlo. Prueba otra vez.',
    silencio: 'Para ajustar el ritmo hace falta el sonido: actívalo arriba con 🔊.',
    sinSonido: 'No se pudo encender el sonido. Prueba de nuevo.',
    cero: '↺ Volver a 0', volver: '‹ Volver',
  },
  comentarAbrir: '💬 Dejar un comentario',
  comentario: { titulo: '¿Qué te pareció?', lead: 'Cuéntanos si el ritmo calzaba con los toques, si las notas con cola se entendían y qué le cambiarías.', ph: 'Por ejemplo: las notas largas se soltaban solas.', nombre: 'Nombre o apodo (opcional)', enviar: 'Enviar comentario', enviando: 'Enviando…', vacio: 'Escribe algo primero.', gracias: '¡Gracias! 🙌 Tu comentario llegó.', guardado: 'Ahora no hay internet: tu comentario quedó en el celular y se envía solo después.', error: 'No se pudo enviar. Prueba de nuevo en un rato.', cancelar: 'Cancelar', cerrar: 'Cerrar' },
};
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const miles = n => Math.round(n).toLocaleString('es-CL');

/** The lanes' colors: pink, yellow, cyan (base.css). */
const COLORES = ['#ff2e88', '#ffd23f', '#2ee6d6'];
const KEY_RECORD = 'juegos-de-salon:pulso-record';
const KEY_AJUSTE = 'juegos-de-salon:pulso-ajuste';
const leer = (k, d) => { try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) && localStorage.getItem(k) !== null ? v : d; } catch (_) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (_) { /* private mode */ } };

const vista = document.getElementById('vista');
const pie = document.getElementById('pie');
const params = new URLSearchParams(location.search);
const SEMILLA_URL = (params.get('seed') || '').trim();
const P = { semilla: SEMILLA_URL || fechaLocal(), c: null, p: null, fin: null, record: 0, auto: false };
let banda = null;
/** The one AudioContext of the page, made on the first tap that needs it (iOS asks for a gesture). */
const bandaLista = () => { banda ||= crearBanda(); banda?.despertar(); return banda; };

function pieComentario(pantalla) {
  pie.replaceChildren(el('button', {
    type: 'button', class: 'link-btn', id: 'btn-comentario',
    onClick: () => { SFX.tap(); abrirComentario({ T: T.comentario, contexto: contexto(pantalla) }); },
  }, T.comentarAbrir));
}
const contexto = pantalla => ({
  juego: GAME_ID, pantalla, semilla: P.semilla, puntos: P.p?.puntos ?? null, parte: P.p ? P.p.alcanzada + 1 : null,
  ajusteMs: leer(KEY_AJUSTE, 0), latenciaMs: banda ? Math.round(banda.latencia() * 1000) : null,
  url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

const tituloJuego = (chico = false) => el('h1', { class: `titulo-pulso${chico ? ' chico' : ''}` },
  el('span', { class: 'guitarra', 'aria-hidden': 'true' }, '🎸'), el('span', { class: `display ${chico ? '' : 'display--lg '}rainbow` }, T.nombre));

/* ------------------------------------------------------------------ */
/* The stage: lanes, notes and pads on a canvas                        */
/* ------------------------------------------------------------------ */

/**
 * Draws a song at a time on a canvas. `vista(i)` says how each note is: 'espera' (falling),
 * 'sostiene' (being held), 'fallo' (missed: it keeps falling, grey) or null (gone).
 */
function escenario(canvas, { mini = false } = {}) {
  const g = canvas.getContext('2d');
  const G = { W: 0, H: 0, r: 0, pads: [], top: 0 };
  function medir() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    G.W = rect.width; G.H = rect.height;
    canvas.width = Math.round(G.W * dpr); canvas.height = Math.round(G.H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ancho = Math.min(G.W, 460), x0 = (G.W - ancho) / 2;
    G.r = Math.max(18, Math.min(ancho / 7.2, mini ? 24 : 46));
    // The arc: the middle pad a bit higher, where the thumb bends
    const base = G.H - (mini ? G.r * 1.3 : Math.max(G.r * 2.1, 92));
    G.pads = Array.from({ length: CARRILES }, (_, c) => ({ x: x0 + ancho * (c * 2 + 1) / 6, y: base - (c === 1 ? G.r * 0.8 : 0) }));
    G.top = -G.r;
  }
  medir();
  const y = (c, t, ahora) => { const pad = G.pads[c]; return pad.y - ((t - ahora) / ANTICIPO) * (pad.y - G.top); };

  function circulo(x, yy, r, relleno, borde, ancho = 3) {
    g.beginPath(); g.arc(x, yy, r, 0, Math.PI * 2);
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) { g.lineWidth = ancho; g.strokeStyle = borde; g.stroke(); }
  }
  const alfa = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

  function dibujar(c, ahora, { vista, presionado = null, fx = [], cuenta = null }) {
    const { W, H, r, pads } = G;
    g.clearRect(0, 0, W, H);
    // The lanes: a soft column of light down to each pad
    pads.forEach((p, k) => {
      const grad = g.createLinearGradient(0, 0, 0, p.y);
      grad.addColorStop(0, alfa(COLORES[k], 0));
      grad.addColorStop(1, alfa(COLORES[k], presionado === k ? 0.32 : 0.12));
      g.fillStyle = grad; g.fillRect(p.x - r * 0.95, 0, r * 1.9, p.y);
    });
    // The beats, as dashes falling down each lane (brighter on the bar)
    for (const bar of c.compases) {
      if (bar.t > ahora + ANTICIPO + 0.1) break;
      if (bar.t + bar.dur < ahora - 0.1) continue;
      for (let b = 0; b < 4; b++) {
        const tb = bar.t + b * bar.dur / 4;
        if (tb < ahora - 0.05 || tb > ahora + ANTICIPO) continue;
        g.strokeStyle = `rgba(255,255,255,${b ? 0.1 : 0.24})`; g.lineWidth = b ? 1.5 : 2.5;
        pads.forEach((p, k) => { const yy = y(k, tb, ahora); g.beginPath(); g.moveTo(p.x - r * 0.8, yy); g.lineTo(p.x + r * 0.8, yy); g.stroke(); });
      }
    }
    // The pads, under the notes
    pads.forEach((p, k) => {
      const on = presionado === k;
      circulo(p.x, p.y, r * (on ? 0.94 : 1), alfa(COLORES[k], on ? 0.45 : 0.14), COLORES[k], on ? 5 : 4);
      circulo(p.x, p.y, r * 0.42, alfa('#ffffff', on ? 0.5 : 0.12));
    });
    // The notes, the far ones first
    const notas = c.notas;
    for (let i = notas.length - 1; i >= 0; i--) {
      const n = notas[i];
      const fin = n.fin ?? n.t;
      if (n.t > ahora + ANTICIPO + 0.05 || fin < ahora - 0.6) continue;
      const v = vista(i);
      if (!v) continue;
      const p = pads[n.c], col = v === 'fallo' ? '#7d7591' : COLORES[n.c];
      const yHead = v === 'sostiene' ? p.y : y(n.c, n.t, ahora);
      if (yHead > H + r) continue;
      if (n.fin != null) {
        const yFin = Math.max(G.top, y(n.c, n.fin, ahora));
        // The tail; held, it glows and shortens into the pad
        g.lineCap = 'round';
        g.strokeStyle = alfa(col, v === 'sostiene' ? 0.95 : 0.6); g.lineWidth = r * (v === 'sostiene' ? 0.58 : 0.46);
        g.beginPath(); g.moveTo(p.x, yHead); g.lineTo(p.x, yFin); g.stroke();
        // Where to let go: a white ring at the end of the tail, that lights up when it is time
        const cerca = v === 'sostiene' && Math.abs(n.fin - ahora) <= VENTANAS_SOLTAR.bien;
        circulo(p.x, yFin, r * 0.5, cerca ? '#ffffff' : alfa('#1a0f33', 0.9), '#ffffff', cerca ? 5 : 3);
      }
      if (v === 'sostiene') { circulo(p.x, p.y, r * 0.86, alfa(col, 0.9), '#ffffff', 4); continue; }
      circulo(p.x, yHead, r * 0.78, col, v === 'fallo' ? null : '#ffffff', 3);
      circulo(p.x - r * 0.22, yHead - r * 0.24, r * 0.2, 'rgba(255,255,255,0.55)');
      if (n.fin != null && v !== 'fallo') circulo(p.x, yHead, r * 0.36, alfa('#1a0f33', 0.55));
    }
    // What happened: a ring that opens on the pad and a word that floats up
    for (const f of fx) {
      const edad = ahora - f.t0;
      if (edad < 0 || edad > 0.7) continue;
      const p = pads[f.c];
      if (f.onda && edad < 0.35) { g.globalAlpha = 1 - edad / 0.35; circulo(p.x, p.y, r * (1 + edad * 2.6), null, f.color, 4); g.globalAlpha = 1; }
      if (f.texto && !mini) {
        g.globalAlpha = Math.max(0, 1 - edad / 0.7);
        g.font = `${Math.round(r * 0.5)}px Bangers, Impact, sans-serif`; g.textAlign = 'center';
        g.fillStyle = f.color; g.fillText(f.texto, p.x, p.y - r * 1.45 - edad * 40);
        g.globalAlpha = 1;
      }
    }
    if (cuenta) {
      g.font = `${Math.round(Math.min(W, 460) * 0.28)}px Bangers, Impact, sans-serif`; g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(cuenta, W / 2, H * 0.4);
    }
  }
  /** The lane under an x (the nearest pad), in the canvas. */
  const carrilEn = x => {
    let mejor = 0;
    G.pads.forEach((p, k) => { if (Math.abs(p.x - x) < Math.abs(G.pads[mejor].x - x)) mejor = k; });
    return mejor;
  };
  return { G, medir, dibujar, carrilEn };
}

/* ------------------------------------------------------------------ */
/* The cover: a part of a song that plays itself                       */
/* ------------------------------------------------------------------ */

let demoRaf = 0;
function portada() {
  cancelAnimationFrame(demoRaf);
  P.record = leer(KEY_RECORD, 0);
  const lienzo = el('canvas', { class: 'demo-pulso', 'aria-hidden': 'true' });
  const ajuste = leer(KEY_AJUSTE, 0);
  vista.replaceChildren(...[
    el('div', { class: 'portada' }, tituloJuego(), el('p', { class: 'lead', style: 'margin:0' }, T.lema), lienzo),
    SEMILLA_URL ? null : el('p', { class: 'muted center', style: 'margin:0' }, `📅 ${T.hoy}`),
    P.record ? el('p', { class: 'center record', id: 'record', style: 'margin:0' }, fmt(T.record, { n: miles(P.record) })) : null,
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-empezar', onClick: () => { SFX.tap(); empezar(); } }, T.empezar),
    // The steps go after Empezar, so it is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' }, el('ol', { class: 'pasos' }, ...T.como.map(([ico, x]) => el('li', {}, el('span', { class: 'paso-ico', 'aria-hidden': 'true' }, ico), el('span', {}, x))))),
    el('p', { class: 'muted center', style: 'margin:0;font-size:0.9rem' }, `🔊 ${T.audifonos}`),
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'btn-ajustar', style: 'justify-self:center;align-self:center', onClick: () => { SFX.tap(); ajustar(); } },
      T.ajustar, ajuste ? el('span', { class: 'ajuste-chip' }, fmt(T.ajusteActual, { ms: ajuste > 0 ? `+${ajuste}` : ajuste })) : null),
  ].filter(Boolean));
  pieComentario('portada');
  demo(lienzo);
}

function demo(lienzo) {
  const c = cancion('portada');
  // Part 5 (holds with quick taps after), looped: the copy after it covers the seam
  const s = 4, bars = c.compases.filter(b => b.seccion === s && b.tipo !== 'final');
  const desde = bars[0].t, L = bars.at(-1).t + bars.at(-1).dur - desde;
  const base = c.notas.filter(n => n.seccion === s);
  const notas = [...base, ...base.map(n => ({ ...n, t: n.t + L, fin: n.fin == null ? undefined : n.fin + L }))];
  const compases = [...bars, ...bars.map(b => ({ ...b, t: b.t + L }))];
  const mini = { notas, compases };
  const esc = escenario(lienzo, { mini: true });
  const t00 = performance.now();
  const cuadro = () => {
    if (!lienzo.isConnected) return;
    if (lienzo.clientWidth && Math.abs(lienzo.clientWidth - esc.G.W) > 1) esc.medir();
    const ahora = desde + (((performance.now() - t00) / 1000) % L);
    let presionado = null;
    const fx = [];
    for (const n of notas) {
      if (n.fin != null && ahora >= n.t && ahora < n.fin) presionado = n.c;
      else if (ahora >= n.t && ahora - n.t < 0.12) presionado = n.c;
      const fin = n.fin ?? n.t;
      if (ahora >= fin && ahora - fin < 0.4) fx.push({ c: n.c, t0: fin, onda: true, color: COLORES[n.c] });
    }
    esc.dibujar(mini, ahora, {
      vista: i => { const n = notas[i]; return ahora < n.t ? 'espera' : n.fin != null && ahora < n.fin ? 'sostiene' : null; },
      presionado, fx,
    });
    if (!QUIETO) demoRaf = requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

async function empezar() {
  cancelAnimationFrame(demoRaf);
  const b = bandaLista();
  // Without running audio the game still plays, silent, on the page's clock
  const suena = b ? await b.listo(500) : false;
  P.c = cancion(P.semilla);
  P.p = nuevaPartida(P.c);
  P.fin = null;
  P.record = leer(KEY_RECORD, 0);
  trackStart({ game: GAME_ID, mode: 'solo', players: 1 });
  keepAwake();
  jugar(suena ? b : null);
}

function jugar(b) {
  const { c, p } = P;
  const ajuste = leer(KEY_AJUSTE, 0) / 1000;
  pie.replaceChildren();

  // The clock: the audio's, so what is judged is what is heard; without audio, the page's
  let t0Perf = performance.now() + 250, pausadoEn = null;
  const t0 = b ? b.tocar(c.musica) : 0;
  const ahora = () => (b ? b.ahora() - t0 - b.latencia() : ((pausadoEn ?? performance.now()) - t0Perf) / 1000) - ajuste;
  const enEvento = e => ahora() - Math.min(0.1, Math.max(0, performance.now() - e.timeStamp) / 1000);

  // The screen: the score and meters on top, the stage below, all over the page
  const pts = el('div', { class: 'hud-pts', id: 'pts' }, '0');
  const multi = el('div', { class: 'hud-multi', id: 'multi' }, '×1');
  const racha = el('div', { class: 'hud-racha', id: 'racha' }, '');
  const energia = el('div', { class: 'hud-energia-barra' });
  const parte = el('div', { class: 'hud-parte', id: 'parte' }, fmt(T.parte, { s: 1, n: SECCIONES }));
  const avance = el('div', { class: 'hud-avance-barra' });
  const btnPausa = el('button', { type: 'button', class: 'hud-pausa', id: 'btn-pausa', 'aria-label': 'Pausa', onClick: () => pausar() }, '⏸');
  const lienzo = el('canvas', { class: 'escenario', id: 'escenario' });
  const capa = el('div', { class: 'pulso-juego', id: 'juego' },
    el('div', { class: 'hud' },
      el('div', { class: 'hud-fila' }, el('div', { class: 'hud-izq' }, pts, el('div', { class: 'hud-sub' }, multi, racha)), parte, btnPausa),
      el('div', { class: 'hud-energia', title: 'Energía' }, energia),
      el('div', { class: 'hud-avance' }, avance)),
    lienzo);
  document.body.append(capa);
  document.body.classList.add('jugando');
  const esc = escenario(lienzo);
  const alMedir = () => esc.medir();
  addEventListener('resize', alMedir);

  const fx = [];
  let presionado = null, activo = null, sonido = null, terminado = false, raf = 0;
  const marca = (k, color, texto, onda = true) => { fx.push({ c: k, t0: ahora(), color, texto, onda }); if (fx.length > 24) fx.shift(); };
  const vistaNota = i => {
    const e = p.estado[i];
    if (p.sosteniendo?.i === i) return 'sostiene';
    if (e.golpe === 'fallo') return 'fallo';
    return e.golpe ? null : 'espera';
  };

  function resultadoDe(r) {
    if (r.tipo === 'golpe') {
      marca(r.nota.c, COLORES[r.nota.c], T.califs[r.calif]);
      sonido?.stop();
      sonido = b?.nota(r.nota.midi, r.nota.fin != null) || null;
      if (r.calif === 'perfecto' && !QUIETO) vibrate(6);
    } else if (r.tipo === 'soltar') {
      sonido?.stop(); sonido = null;
      if (r.calif) marca(r.nota.c, '#ffffff', T.califs[r.calif]);
      else { marca(r.nota.c, '#ff8a8a', T.califs[r.motivo], false); b?.muteo(); vibrate(30); }
    } else if (r.tipo === 'fallo') {
      marca(r.nota.c, '#ff8a8a', T.califs.fallo, false);
      if (!p.sosteniendo) { b?.muteo(); vibrate(25); }
      if (!QUIETO) { capa.classList.remove('temblor'); void capa.offsetWidth; capa.classList.add('temblor'); }
    }
  }

  // One finger: the first pointer plays, any other is ignored until it lifts
  const abajo = e => {
    e.preventDefault();
    if (activo !== null || terminado || pausadoEn !== null || capa.querySelector('.pausa')) return;
    activo = e.pointerId;
    try { lienzo.setPointerCapture(activo); } catch (_) { /* not every browser */ }
    const rect = lienzo.getBoundingClientRect();
    presionado = esc.carrilEn(e.clientX - rect.left);
    const r = tocar(p, enEvento(e), presionado);
    if (r.tipo === 'nada') b?.muteo();
    resultadoDe(r);
  };
  const arriba = e => {
    if (e.pointerId !== activo) return;
    activo = null; presionado = null;
    resultadoDe(soltar(p, enEvento(e)));
  };
  lienzo.addEventListener('pointerdown', abajo);
  lienzo.addEventListener('pointerup', arriba);
  lienzo.addEventListener('pointercancel', arriba);
  capa.addEventListener('contextmenu', e => e.preventDefault());

  // Auto-play (the e2e scripts and window.__pulso.auto): every note perfect
  function auto(t) {
    if (p.sosteniendo) { const n = c.notas[p.sosteniendo.i]; if (t >= n.fin) { presionado = null; resultadoDe(soltar(p, n.fin)); } return; }
    const n = c.notas[p.siguiente];
    if (n && t >= n.t) { presionado = n.c; resultadoDe(tocar(p, n.t, n.c)); if (n.fin == null) setTimeout(() => { if (!p.sosteniendo) presionado = null; }, 90); }
  }

  let ultimaParte = -1, pts0 = -1;
  function cuadro() {
    if (terminado) return;
    const t = ahora();
    if (P.auto) auto(t);
    for (const r of avanzar(p, t)) resultadoDe(r);
    // The meters
    if (p.puntos !== pts0) { pts0 = p.puntos; pts.textContent = miles(p.puntos); }
    const m = multiplicador(p.racha);
    multi.textContent = `×${m}`; multi.dataset.m = m;
    racha.textContent = p.racha >= 5 ? fmt(T.racha, { n: p.racha }) : '';
    energia.style.width = `${p.energia}%`;
    energia.classList.toggle('baja', p.energia < 25);
    const s = Math.max(0, seccionEn(c, t));
    if (s !== ultimaParte) { ultimaParte = s; parte.textContent = fmt(T.parte, { s: s + 1, n: SECCIONES }); if (s > 0) { parte.classList.remove('sube'); void parte.offsetWidth; parte.classList.add('sube'); } }
    avance.style.width = `${Math.max(0, Math.min(100, (100 * t) / c.duracion))}%`;
    // The count-in, on the sticks of the intro's second bar
    let cuenta = null;
    const intro = c.compases[1];
    if (t >= intro.t && t < intro.t + intro.dur) cuenta = T.cuenta[Math.floor((t - intro.t) / (intro.dur / 4))];
    if (lienzo.clientWidth && Math.abs(lienzo.clientWidth - esc.G.W) > 1) esc.medir();
    esc.dibujar(c, t, { vista: vistaNota, presionado, fx, cuenta });
    if (p.fin === 'apagon') return cerrar('apagon');
    if (p.fin === 'completa' && t > c.duracion) return cerrar('completa');
    raf = requestAnimationFrame(cuadro);
  }

  function pausar() {
    if (terminado || capa.querySelector('.pausa')) return;
    SFX.tap();
    if (p.sosteniendo) resultadoDe(soltar(p, ahora()));
    activo = null; presionado = null;
    if (b) b.pausar(); else pausadoEn = performance.now();
    let seguro = false;
    const terminarBtn = el('button', { type: 'button', class: 'btn btn--ghost', id: 'btn-terminar', onClick: () => {
      if (!seguro) { seguro = true; terminarBtn.textContent = T.terminarSeguro; terminarBtn.classList.add('armado'); return; }
      caja.remove(); cerrar('rendido');
    } }, T.terminar);
    const caja = el('div', { class: 'pausa', id: 'pausa' },
      el('div', { class: 'panel pausa-caja' },
        el('h2', { class: 'display' }, T.pausa),
        el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-seguir', onClick: () => {
          caja.remove();
          if (b) b.seguir(); else if (pausadoEn !== null) { t0Perf += performance.now() - pausadoEn; pausadoEn = null; }
        } }, T.seguir),
        terminarBtn));
    capa.append(caja);
  }
  const alOcultar = () => { if (document.visibilityState === 'hidden') pausar(); };
  document.addEventListener('visibilitychange', alOcultar);

  function cerrar(motivo) {
    if (terminado) return;
    terminado = true;
    cancelAnimationFrame(raf);
    sonido?.stop();
    removeEventListener('resize', alMedir);
    document.removeEventListener('visibilitychange', alOcultar);
    P.fin = motivo;
    const grande = T.finGrande[motivo];
    if (motivo === 'apagon') { b?.apagon(); capa.classList.add('apagado'); vibrate([60, 40, 120]); }
    else if (motivo === 'rendido') b?.parar();
    else setTimeout(() => b?.parar(), 1500);
    if (grande) capa.append(el('div', { class: `fin-grande ${motivo}` }, grande));
    setTimeout(() => { capa.remove(); document.body.classList.remove('jugando'); resultado(); }, grande ? 1700 : 0);
  }

  window.__pulso.juego = { ahora, pausar, cerrar, esc };
  raf = requestAnimationFrame(cuadro);
}

/* ------------------------------------------------------------------ */
/* Tuning the rhythm: how late this phone's taps arrive                */
/* ------------------------------------------------------------------ */

function ajustar() {
  cancelAnimationFrame(demoRaf);
  const A = T.ajuste;
  const estado = el('p', { class: 'lead center', id: 'ajuste-estado', style: 'margin:0' }, A.paso);
  const boton = el('button', { type: 'button', class: 'pad-ajuste', id: 'pad-ajuste', 'aria-label': A.paso, disabled: true }, '👆');
  const empezarBtn = el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-ajuste-empezar' }, A.empezar);
  const actual = () => leer(KEY_AJUSTE, 0);
  const valor = el('p', { class: 'muted center', id: 'ajuste-valor', style: 'margin:0' }, fmt(T.ajusteActual, { ms: actual() }));
  vista.replaceChildren(el('div', { class: 'stack ajuste' },
    tituloJuego(true),
    el('h2', { class: 'display center', style: 'margin:0' }, A.titulo),
    el('p', { class: 'muted', style: 'margin:0' }, A.lead),
    estado, boton, empezarBtn, valor,
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'btn-ajuste-cero', style: 'align-self:center', onClick: () => { guardar(KEY_AJUSTE, 0); valor.textContent = fmt(T.ajusteActual, { ms: 0 }); SFX.tap(); } }, A.cero),
    el('button', { type: 'button', class: 'link-btn', id: 'btn-ajuste-volver', onClick: () => { SFX.tap(); portada(); } }, A.volver)));
  pieComentario('ajuste');

  empezarBtn.addEventListener('click', async () => {
    if (isMuted()) { estado.textContent = A.silencio; return; }
    const b = bandaLista();
    if (!b || !(await b.listo(500))) { estado.textContent = A.sinSonido; return; }
    const BEAT = 0.6, N = 16;
    const golpes = Array.from({ length: N }, (_, k) => ({ t: 0.6 + k * BEAT, tipo: k % 4 ? 'stick' : 'kick' }));
    const t0 = b.tocar(golpes);
    const ahora = () => b.ahora() - t0 - b.latencia();
    const difs = [];
    empezarBtn.disabled = true; boton.disabled = false;
    estado.textContent = A.escucha;
    const toque = e => {
      e.preventDefault();
      const t = ahora() - Math.min(0.1, Math.max(0, performance.now() - e.timeStamp) / 1000);
      const k = Math.round((t - 0.6) / BEAT);
      boton.classList.remove('late'); void boton.offsetWidth; boton.classList.add('late');
      if (k >= 2 && k < N) { const d = t - (0.6 + k * BEAT); if (Math.abs(d) < 0.3) difs.push(d); }
    };
    boton.addEventListener('pointerdown', toque);
    // The pad beats with the clicks, so the eye helps too
    const latir = () => {
      if (!boton.isConnected) return;
      const t = ahora();
      const fase = ((t - 0.6) % BEAT + BEAT) % BEAT;
      boton.style.setProperty('--latido', t > 0.5 && t < 0.6 + N * BEAT ? String(Math.max(0, 1 - fase / 0.18)) : '0');
      if (t < 0.6 + N * BEAT + 0.4) return requestAnimationFrame(latir);
      boton.removeEventListener('pointerdown', toque);
      b.parar(); boton.disabled = true; empezarBtn.disabled = false;
      if (difs.length < 6) { estado.textContent = A.pocos; return; }
      difs.sort((x, y) => x - y);
      const med = difs[Math.floor(difs.length / 2)];
      const ms = Math.max(-150, Math.min(350, Math.round(med * 1000 / 5) * 5));
      guardar(KEY_AJUSTE, ms);
      valor.textContent = fmt(T.ajusteActual, { ms });
      const dms = Math.round(med * 1000);
      estado.textContent = Math.abs(dms) < 15 ? A.justo : fmt(A.listo, { ms: Math.abs(dms), cuando: dms > 0 ? A.tarde : A.pronto });
      SFX.win?.();
    };
    requestAnimationFrame(latir);
  });
}

/* ------------------------------------------------------------------ */
/* The result                                                          */
/* ------------------------------------------------------------------ */

const enlace = semilla => (semilla ? `?seed=${encodeURIComponent(semilla)}` : '');

function resultado() {
  const { p } = P;
  const pts = p.puntos, acc = precision(p), completa = P.fin === 'completa';
  const nuevo = pts > P.record;
  if (nuevo) guardar(KEY_RECORD, pts);
  const card = tarjeta(p);
  trackFinish({ detalle: `${pts} pts · ${P.fin} · parte ${p.alcanzada + 1}/${SECCIONES} · ${acc} % · racha ${p.mejorRacha} · ${card}` });
  const lineas = [
    fmt(T.desglose.precision, { p: acc }),
    fmt(T.desglose.racha, { n: p.mejorRacha }),
    fmt(T.desglose.notas, p.cuenta),
    completa ? T.desglose.entera : fmt(T.desglose.hasta, { s: p.alcanzada + 1, n: SECCIONES }),
  ];
  vista.replaceChildren(el('div', { class: 'resultado' },
    tituloJuego(true),
    el('p', { class: `sello-pulso${completa ? '' : ' mal'}` }, T.fin[P.fin]),
    el('div', { class: 'score-big', id: 'puntaje' }, miles(pts)),
    el('p', { class: 'tarjeta-pulso', id: 'tarjeta', 'aria-hidden': 'true' }, card),
    nuevo && pts > 0 ? el('p', { class: 'record nuevo', id: 'record', style: 'margin:0' }, T.nuevoRecord)
      : P.record ? el('p', { class: 'muted', id: 'record', style: 'margin:0' }, fmt(T.recordEra, { n: miles(P.record) })) : null,
    el('ul', { class: 'desglose muted' }, ...lineas.map(x => el('li', {}, x))),
    botonResultadoSolo({ C: COMMON.es, emoji: '🎸', juego: T.nombre, puntaje: `${miles(pts)} pts`, tiempo: '', tarjeta: card, url: `${SITIO}labs/pulse/${enlace(SEMILLA_URL)}`, alTocar: () => SFX.tap() }),
    el('a', { class: 'btn btn--yellow', id: 'btn-otro', href: enlace(Math.random().toString(36).slice(2, 8)) }, T.otraVez),
    SEMILLA_URL ? el('a', { class: 'btn btn--ghost btn--sm', id: 'btn-de-hoy', href: location.pathname }, T.deHoy) : null,
    salidasFin('lab', { raiz: '../../' }),
    // A line sets the game apart from the comment for testers, as in the other lab games
    el('hr', { class: 'divisor' }),
    formularioComentario({ T: T.comentario, contexto: contexto('resultado') })));
  pie.replaceChildren();
  scrollTo(0, 0);
  if (completa || nuevo) { SFX.win(); if (!QUIETO) confetti({ count: 160, duration: 2200 }); }
  else SFX.tap();
}

document.getElementById('sound-slot').append(soundToggle());
initSound();
sparkles();
window.__pulso = {
  P,
  get auto() { return P.auto; }, set auto(v) { P.auto = !!v; },
  ENERGIA,
};
portada();
