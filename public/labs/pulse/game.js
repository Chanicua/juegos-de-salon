/**
 * Pulso — lab prototype: a one-finger rhythm game (the owner's request). Well-known melodies in the
 * public domain, played as rock (songs.js; the audio files are made by
 * tools/generators/pulse/render.mjs). Three pads in an arc at the bottom, where the thumb reaches;
 * notes fall to them and they are the melody: hit, the lead guitar plays; missed, it goes quiet.
 * Taps only: a tap note is tapped on time, a hold is pressed, held and released when its tail ends.
 * Each song gets faster part by part, and missing too much cuts the power. One player, as many points
 * as possible. Spanish only, like the other lab prototypes. `?song=<id>` opens with that song first.
 * The engine is engine.js, the audio music.js.
 */
import { salidasFin } from '../../assets/js/fin.js';
import { el, vibrate, sparkles, confetti, keepAwake } from '../../assets/js/ui.js';
import { SFX, soundToggle, initSound, isMuted } from '../../assets/js/sound.js';
import { COMMON, SITIO } from '../../assets/js/i18n.js';
import { botonResultadoSolo } from '../../assets/js/compartir.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { formularioComentario, abrirComentario } from '../../assets/js/labs-idioma.js';
import { param } from '../../assets/js/parametros.js';
import {
  cancion, nuevaPartida, tocar, soltar, avanzar, precision, tarjeta, multiplicador, seccionEn,
  CARRILES, ANTICIPO, ENERGIA, VENTANAS_SOLTAR,
} from './engine.js';
import { CANCIONES, cancionPorId } from './songs.js';
import { crearBanda } from './music.js';

trackVisit();   // the site's traffic (D-208)

const GAME_ID = 'pulso';
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = {
  nombre: 'Pulso',
  lema: 'Clásicos que todos conocen, tocados como rock. Tú pones la guitarra, con un solo dedo.',
  como: [
    ['👆', 'Toca cada nota justo cuando llega a su botón: así suena la guitarra.'],
    ['✋', 'Las notas con cola se mantienen apretadas y se sueltan justo cuando termina la cola.'],
    ['🔥', 'Cada parte va más rápido. Si fallas mucho, se corta la luz.'],
  ],
  elige: 'Elige una canción',
  record: '🏆 {n}', sinRecord: 'Sin tocar aún',
  dificultad: ['', 'Fácil', 'Media', 'Difícil', 'Muy difícil'],
  cargando: '🎸 Afinando las guitarras…', noCarga: 'No se pudo cargar la canción. Revisa tu conexión y prueba de nuevo.',
  ajustar: '🎧 Ajustar el ritmo', ajusteActual: 'Ajuste: {ms} ms',
  audifonos: 'Mejor con sonido: el ritmo se escucha.',
  parte: 'Parte {s} de {n}', racha: '{n} seguidas', cartel: 'Parte {s}', bpm: '{n} pulsos por minuto',
  califs: { perfecto: '¡Perfecto!', bien: '¡Bien!', casi: 'Casi', fallo: 'Fallo', antes: 'Muy pronto', tarde: 'Muy tarde' },
  fuego: '🔥 ¡En llamas!',
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
  otraVez: '🔁 Otra vez', otraCancion: '🎸 Otra canción',
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
  comentario: { titulo: '¿Qué te pareció?', lead: 'Cuéntanos si el ritmo calzaba con los toques, qué tal sonaba la música y qué canción te gustaría tocar.', ph: 'Por ejemplo: la Marcha turca es muy rápida al final.', nombre: 'Nombre o apodo (opcional)', enviar: 'Enviar comentario', enviando: 'Enviando…', vacio: 'Escribe algo primero.', gracias: '¡Gracias! 🙌 Tu comentario llegó.', guardado: 'Ahora no hay internet: tu comentario quedó en el celular y se envía solo después.', error: 'No se pudo enviar. Prueba de nuevo en un rato.', cancelar: 'Cancelar', cerrar: 'Cerrar' },
};
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const miles = n => Math.round(n).toLocaleString('es-CL');

/** The lanes' colors: pink, yellow, cyan (base.css). */
const COLORES = ['#ff2e88', '#ffd23f', '#2ee6d6'];
const keyRecord = id => `juegos-de-salon:pulso-record-${id}`;
const KEY_AJUSTE = 'juegos-de-salon:pulso-ajuste';
const leer = (k, d) => { try { const s = localStorage.getItem(k); const v = Number(s); return s !== null && Number.isFinite(v) ? v : d; } catch (_) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (_) { /* private mode */ } };
const SONGS = new URL('songs/', import.meta.url).href;

const vista = document.getElementById('vista');
const pie = document.getElementById('pie');
const PEDIDA = cancionPorId(param('song') || '');
const P = { def: PEDIDA || CANCIONES[0], c: null, p: null, fin: null, record: 0, auto: false, sonando: false };
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
  juego: GAME_ID, pantalla, cancion: P.def?.id, puntos: P.p?.puntos ?? null, parte: P.p ? P.p.alcanzada + 1 : null, sonando: P.sonando,
  ajusteMs: leer(KEY_AJUSTE, 0), latenciaMs: banda ? Math.round(banda.latencia() * 1000) : null,
  url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

const tituloJuego = (chico = false) => el('h1', { class: `titulo-pulso${chico ? ' chico' : ''}` },
  el('span', { class: 'guitarra', 'aria-hidden': 'true' }, '🎸'), el('span', { class: `display ${chico ? '' : 'display--lg '}rainbow` }, T.nombre));

/* ------------------------------------------------------------------ */
/* The stage: lanes, notes, pads and their effects, on a canvas        */
/* ------------------------------------------------------------------ */

/**
 * Draws a song at a time on a canvas. `vista(i)` says how each note is: 'espera' (falling),
 * 'sostiene' (being held), 'fallo' (missed: it keeps falling, grey) or null (gone). The effects
 * (sparks, the pad's bounce, the lane's flash, a miss's shake, the fire of a long run, the beat's
 * pulse, the part's sign) live here too, timed on the song's clock, so they stop on pause.
 */
function escenario(canvas, { mini = false } = {}) {
  const g = canvas.getContext('2d');
  const G = { W: 0, H: 0, r: 0, pads: [], top: 0 };
  const chispas = [];
  const pads = Array.from({ length: CARRILES }, () => ({ golpe: -9, fallo: -9, calif: null }));
  let cartel = null, ultimo = null;
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
  const circulo = (x, yy, r, relleno, borde, ancho = 3) => {
    g.beginPath(); g.arc(x, yy, Math.max(0, r), 0, Math.PI * 2);
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) { g.lineWidth = ancho; g.strokeStyle = borde; g.stroke(); }
  };
  const alfa = (hex, a) => `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;
  const soltarChispas = (c, n, { vel = 1, color = COLORES[c], arriba = 1 } = {}) => {
    if (QUIETO) return;
    const p = G.pads[c];
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * (arriba ? 1.3 : 2);
      const v = (140 + Math.random() * 260) * vel;
      chispas.push({ x: p.x + (Math.random() - 0.5) * G.r, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0, max: 0.35 + Math.random() * 0.35, color, r: 1.5 + Math.random() * 2.5 });
    }
    if (chispas.length > 400) chispas.splice(0, chispas.length - 400);
  };

  /** A hit on lane c: sparks (more for a perfect), the pad bounces and its lane flashes. */
  function golpe(c, calif, ahora) {
    pads[c].golpe = ahora; pads[c].calif = calif;
    soltarChispas(c, calif === 'perfecto' ? 26 : calif === 'bien' ? 16 : 8, { vel: calif === 'perfecto' ? 1.2 : 0.9 });
    if (calif === 'perfecto') soltarChispas(c, 6, { color: '#ffffff', vel: 1.4 });
  }
  /** A miss on lane c: the pad shakes and goes dark a moment. */
  const falla = (c, ahora) => { pads[c].fallo = ahora; };
  /** A hold being held: sparks keep flying off its pad. */
  const sostiene = (c) => soltarChispas(c, 2, { vel: 0.6 });
  /** A big sign in the middle (a new part). */
  const anunciar = (texto, sub, ahora) => { cartel = { texto, sub, t0: ahora }; };

  function dibujar(c, ahora, { vista, presionado = null, fx = [], cuenta = null, multi = 1 }) {
    const { W, H, r } = G;
    const dt = ultimo == null ? 0 : Math.max(0, Math.min(0.05, ahora - ultimo));
    ultimo = ahora;
    g.clearRect(0, 0, W, H);
    // The beat: a glow from the floor that pulses on every beat (stronger on the bar)
    let bar = null;
    for (const b of c.compases) { if (b.t > ahora) break; bar = b; }
    if (bar && !mini && !QUIETO) {
      const beat = bar.dur / 4, k = Math.floor((ahora - bar.t) / beat), fase = (ahora - bar.t) - k * beat;
      const fuerza = (k === 0 ? 0.32 : 0.18) * Math.exp(-fase * 7) * (bar.tipo === 'intro' ? 0.5 : 1);
      const grad = g.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.9);
      grad.addColorStop(0, `rgba(255, 60, 140, ${fuerza})`); grad.addColorStop(1, 'rgba(255, 60, 140, 0)');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    }
    // On fire (×4): the screen's edges burn
    if (multi >= 4 && !mini && !QUIETO) {
      const parpadeo = 0.55 + 0.25 * Math.sin(ahora * 23) + 0.2 * Math.sin(ahora * 37);
      for (const [x0, x1] of [[0, 28], [W, W - 28]]) {
        const grad = g.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, `rgba(255, 120, 30, ${0.45 * parpadeo})`); grad.addColorStop(1, 'rgba(255, 60, 20, 0)');
        g.fillStyle = grad; g.fillRect(Math.min(x0, x1), 0, 28, H);
      }
    }
    // The lanes: a soft column of light down to each pad, that flashes on a hit
    G.pads.forEach((p, k) => {
      const flash = Math.max(0, 1 - (ahora - pads[k].golpe) / 0.25);
      const grad = g.createLinearGradient(0, 0, 0, p.y);
      grad.addColorStop(0, alfa(COLORES[k], 0));
      grad.addColorStop(1, alfa(COLORES[k], (presionado === k ? 0.3 : 0.12) + 0.35 * flash));
      g.fillStyle = grad; g.fillRect(p.x - r * 0.95, 0, r * 1.9, p.y);
    });
    // The beats, as dashes falling down each lane (brighter on the bar)
    for (const b of c.compases) {
      if (b.t > ahora + ANTICIPO + 0.1) break;
      if (b.t + b.dur < ahora - 0.1) continue;
      for (let k = 0; k < 4; k++) {
        const tb = b.t + k * b.dur / 4;
        if (tb < ahora - 0.05 || tb > ahora + ANTICIPO) continue;
        g.strokeStyle = `rgba(255,255,255,${k ? 0.1 : 0.24})`; g.lineWidth = k ? 1.5 : 2.5;
        G.pads.forEach((p, l) => { const yy = y(l, tb, ahora); g.beginPath(); g.moveTo(p.x - r * 0.8, yy); g.lineTo(p.x + r * 0.8, yy); g.stroke(); });
      }
    }
    // The pads, under the notes: they bounce on a hit, shake and dim on a miss, burn on a long run
    G.pads.forEach((p, k) => {
      const on = presionado === k;
      const eg = ahora - pads[k].golpe, ef = ahora - pads[k].fallo;
      const rebote = eg < 0.22 ? 0.16 * Math.sin((eg / 0.22) * Math.PI) : 0;
      const temblor = ef < 0.3 && !QUIETO ? Math.sin(ef * 70) * 6 * (1 - ef / 0.3) : 0;
      const apagado = ef < 0.3 ? 1 - ef / 0.3 : 0;
      const x = p.x + temblor;
      if (multi >= 3 && !mini && !QUIETO) {
        const fuego = multi >= 4 ? 1 : 0.5;
        const rr = r * (1.55 + 0.12 * Math.sin(ahora * 19 + k * 2));
        const grad = g.createRadialGradient(x, p.y, r * 0.6, x, p.y, rr);
        grad.addColorStop(0, alfa(multi >= 4 ? '#ff7a1a' : COLORES[k], 0.55 * fuego)); grad.addColorStop(1, alfa('#ff2e00', 0));
        g.fillStyle = grad; g.beginPath(); g.arc(x, p.y, rr, 0, Math.PI * 2); g.fill();
      }
      const escala = (on ? 0.94 : 1) + rebote;
      const col = apagado > 0.5 ? '#6b6380' : COLORES[k];
      circulo(x, p.y, r * escala, alfa(COLORES[k], (on ? 0.45 : 0.14) * (1 - apagado * 0.7) + rebote * 2), col, on ? 5 : 4);
      circulo(x, p.y, r * 0.42 * escala, alfa('#ffffff', (on ? 0.5 : 0.12) + rebote * 3));
    });
    // The notes, the far ones first
    const notas = c.notas;
    for (let i = notas.length - 1; i >= 0; i--) {
      const n = notas[i];
      const fin = n.fin ?? n.t;
      if (n.t > ahora + ANTICIPO + 0.05 || fin < ahora - 0.6) continue;
      const v = vista(i);
      if (!v) continue;
      const p = G.pads[n.c], col = v === 'fallo' ? '#7d7591' : COLORES[n.c];
      const yHead = v === 'sostiene' ? p.y : y(n.c, n.t, ahora);
      if (yHead > H + r) continue;
      if (n.fin != null) {
        const yFin = Math.max(G.top, y(n.c, n.fin, ahora));
        // The tail; held, it glows and shortens into the pad
        g.lineCap = 'round';
        if (v === 'sostiene' && !QUIETO) { g.strokeStyle = alfa(col, 0.35); g.lineWidth = r * (0.95 + 0.1 * Math.sin(ahora * 30)); g.beginPath(); g.moveTo(p.x, yHead); g.lineTo(p.x, yFin); g.stroke(); }
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
    // The sparks, added light on light
    g.globalCompositeOperation = 'lighter';
    for (let k = chispas.length - 1; k >= 0; k--) {
      const s = chispas[k];
      s.vida += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; s.vx *= 0.985;
      if (s.vida >= s.max) { chispas.splice(k, 1); continue; }
      circulo(s.x, s.y, s.r * (1 - s.vida / s.max * 0.5), alfa(s.color, 1 - s.vida / s.max));
    }
    g.globalCompositeOperation = 'source-over';
    // What happened: a ring that opens on the pad and a word that floats up
    for (const f of fx) {
      const edad = ahora - f.t0;
      if (edad < 0 || edad > 0.7) continue;
      const p = G.pads[f.c];
      if (f.onda && edad < 0.35) { g.globalAlpha = 1 - edad / 0.35; circulo(p.x, p.y, r * (1 + edad * 2.6), null, f.color, 4); g.globalAlpha = 1; }
      if (f.texto && !mini) {
        g.globalAlpha = Math.max(0, 1 - edad / 0.7);
        const crece = f.grande ? 1 + 0.4 * Math.max(0, 1 - edad / 0.15) : 1;
        g.font = `${Math.round(r * 0.5 * crece * (f.grande ? 1.15 : 1))}px Bangers, Impact, sans-serif`; g.textAlign = 'center';
        g.fillStyle = f.color; g.fillText(f.texto, p.x, p.y - r * 1.45 - edad * 40);
        g.globalAlpha = 1;
      }
    }
    // A new part: its number, big, and its tempo
    if (cartel && !mini) {
      const edad = ahora - cartel.t0;
      if (edad > 1.6) cartel = null;
      else if (edad >= 0) {
        const a = edad < 0.2 ? edad / 0.2 : Math.max(0, 1 - (edad - 1) / 0.6);
        const s = 1 + 0.3 * Math.max(0, 1 - edad / 0.25);
        g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#ffd23f';
        g.font = `${Math.round(Math.min(W, 460) * 0.15 * s)}px Bangers, Impact, sans-serif`;
        g.fillText(cartel.texto, W / 2, H * 0.3);
        g.font = `700 ${Math.round(Math.min(W, 460) * 0.04)}px Nunito, system-ui, sans-serif`; g.fillStyle = '#ffffff';
        g.fillText(cartel.sub, W / 2, H * 0.3 + Math.min(W, 460) * 0.07);
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
  return { G, medir, dibujar, carrilEn, golpe, falla, sostiene, anunciar };
}

/* ------------------------------------------------------------------ */
/* The cover: the songs, and a part of one that plays itself           */
/* ------------------------------------------------------------------ */

let demoRaf = 0;
const estrellas = n => '★'.repeat(n) + '☆'.repeat(4 - n);

function portada() {
  cancelAnimationFrame(demoRaf);
  const lienzo = el('canvas', { class: 'demo-pulso', 'aria-hidden': 'true' });
  const ajuste = leer(KEY_AJUSTE, 0);
  const lista = el('div', { class: 'canciones', id: 'canciones' }, ...CANCIONES.map(def => {
    const rec = leer(keyRecord(def.id), 0);
    return el('button', {
      type: 'button', class: `cancion${def === PEDIDA ? ' pedida' : ''}`, id: `cancion-${def.id}`, 'data-id': def.id,
      onClick: () => { SFX.tap(); P.def = def; empezar(); },
    },
    el('span', { class: 'cancion-titulo' }, def.titulo),
    el('span', { class: 'cancion-autor' }, def.autor),
    el('span', { class: 'cancion-pie' },
      el('span', { class: 'cancion-dificultad', 'aria-label': T.dificultad[def.dificultad] }, estrellas(def.dificultad)),
      el('span', { class: 'cancion-record' }, rec ? fmt(T.record, { n: miles(rec) }) : T.sinRecord)));
  }));
  vista.replaceChildren(
    el('div', { class: 'portada' }, tituloJuego(), el('p', { class: 'lead', style: 'margin:0' }, T.lema), lienzo),
    el('h2', { class: 'display elige' }, T.elige),
    lista,
    el('p', { class: 'aviso-carga', id: 'aviso-carga', role: 'status' }, ''),
    // The steps go after the songs, so a song is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' }, el('ol', { class: 'pasos' }, ...T.como.map(([ico, x]) => el('li', {}, el('span', { class: 'paso-ico', 'aria-hidden': 'true' }, ico), el('span', {}, x))))),
    el('p', { class: 'muted center', style: 'margin:0;font-size:0.9rem' }, `🔊 ${T.audifonos}`),
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'btn-ajustar', style: 'justify-self:center;align-self:center', onClick: () => { SFX.tap(); ajustar(); } },
      T.ajustar, ajuste ? el('span', { class: 'ajuste-chip' }, fmt(T.ajusteActual, { ms: ajuste > 0 ? `+${ajuste}` : ajuste })) : null));
  pieComentario('portada');
  demo(lienzo);
}

function demo(lienzo) {
  const c = cancion(CANCIONES[2]);
  // A part with holds and quick notes, looped: the copy after it covers the seam
  const s = 3, bars = c.compases.filter(b => b.seccion === s);
  const desde = bars[0].t, L = bars.at(-1).t + bars.at(-1).dur - desde;
  const base = c.notas.filter(n => n.seccion === s);
  const notas = [...base, ...base.map(n => ({ ...n, t: n.t + L, fin: n.fin == null ? undefined : n.fin + L }))];
  const compases = [...bars, ...bars.map(b => ({ ...b, t: b.t + L }))];
  const mini = { notas, compases };
  const esc = escenario(lienzo, { mini: true });
  const t00 = performance.now();
  const hechas = new Set();
  const cuadro = () => {
    if (!lienzo.isConnected) return;
    if (lienzo.clientWidth && Math.abs(lienzo.clientWidth - esc.G.W) > 1) esc.medir();
    const vuelta = Math.floor((performance.now() - t00) / 1000 / L);
    const ahora = desde + (((performance.now() - t00) / 1000) % L);
    let presionado = null;
    notas.forEach((n, i) => {
      if (n.fin != null && ahora >= n.t && ahora < n.fin) { presionado = n.c; esc.sostiene(n.c); }
      else if (ahora >= n.t && ahora - n.t < 0.12) presionado = n.c;
      const clave = `${vuelta}:${i}`;
      if (ahora >= n.t && ahora - n.t < 0.1 && !hechas.has(clave)) { hechas.add(clave); esc.golpe(n.c, 'perfecto', ahora); }
    });
    if (hechas.size > 200) hechas.clear();
    esc.dibujar(mini, ahora, {
      vista: i => { const n = notas[i]; return ahora < n.t ? 'espera' : n.fin != null && ahora < n.fin ? 'sostiene' : null; },
      presionado,
    });
    if (!QUIETO) demoRaf = requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

let cargandoYa = false;
async function empezar() {
  if (cargandoYa) return;
  cargandoYa = true;
  const aviso = document.getElementById('aviso-carga');
  const boton = document.getElementById(`cancion-${P.def.id}`);
  boton?.classList.add('cargando');
  if (aviso) { aviso.textContent = T.cargando; aviso.classList.remove('mal'); }
  P.c = cancion(P.def);
  const b = bandaLista();
  // Without running audio the game still plays, silent, on the page's clock
  const suena = b ? await b.listo(500) : false;
  let pistas = null;
  if (suena) {
    try { pistas = await b.cargar(SONGS, P.c); } catch (_) {
      cargandoYa = false; boton?.classList.remove('cargando');
      if (aviso) { aviso.textContent = T.noCarga; aviso.classList.add('mal'); }
      return;
    }
  }
  cargandoYa = false;
  cancelAnimationFrame(demoRaf);
  P.p = nuevaPartida(P.c);
  P.fin = null;
  P.sonando = !!pistas;
  P.record = leer(keyRecord(P.def.id), 0);
  trackStart({ game: GAME_ID, mode: 'solo', players: 1 });
  keepAwake();
  jugar(pistas ? b : null, pistas);
}

function jugar(b, pistas) {
  const { c, p } = P;
  const ajuste = leer(KEY_AJUSTE, 0) / 1000;
  const partes = c.partes.length;
  pie.replaceChildren();

  // The clock: the audio's, so what is judged is what is heard; without audio, the page's
  let t0Perf = performance.now() + 300, pausadoEn = null;
  const t0 = b ? b.tocar(pistas) : 0;
  const ahora = () => (b ? b.ahora() - t0 - b.latencia() : ((pausadoEn ?? performance.now()) - t0Perf) / 1000) - ajuste;
  const enEvento = e => ahora() - Math.min(0.1, Math.max(0, performance.now() - e.timeStamp) / 1000);

  // The screen: the score and meters on top, the stage below, all over the page
  const pts = el('div', { class: 'hud-pts', id: 'pts' }, '0');
  const multi = el('div', { class: 'hud-multi', id: 'multi' }, '×1');
  const racha = el('div', { class: 'hud-racha', id: 'racha' }, '');
  const energia = el('div', { class: 'hud-energia-barra' });
  const parte = el('div', { class: 'hud-parte', id: 'parte' }, fmt(T.parte, { s: 1, n: partes }));
  const avance = el('div', { class: 'hud-avance-barra' });
  const btnPausa = el('button', { type: 'button', class: 'hud-pausa', id: 'btn-pausa', 'aria-label': 'Pausa', onClick: () => pausar() }, '⏸');
  const lienzo = el('canvas', { class: 'escenario', id: 'escenario' });
  const capa = el('div', { class: 'pulso-juego', id: 'juego' },
    el('div', { class: 'hud' },
      el('div', { class: 'hud-fila' }, el('div', { class: 'hud-izq' }, pts, el('div', { class: 'hud-sub' }, multi, racha)),
        el('div', { class: 'hud-centro' }, el('div', { class: 'hud-cancion' }, P.def.titulo), parte), btnPausa),
      el('div', { class: 'hud-energia', title: 'Energía' }, energia),
      el('div', { class: 'hud-avance' }, avance)),
    lienzo);
  document.body.append(capa);
  document.body.classList.add('jugando');
  const esc = escenario(lienzo);
  const alMedir = () => esc.medir();
  addEventListener('resize', alMedir);

  const fx = [];
  let presionado = null, activo = null, terminado = false, raf = 0, multiAntes = 1;
  const marca = (k, color, texto, onda = true, grande = false) => { fx.push({ c: k, t0: ahora(), color, texto, onda, grande }); if (fx.length > 24) fx.shift(); };
  const vistaNota = i => {
    const e = p.estado[i];
    if (p.sosteniendo?.i === i) return 'sostiene';
    if (e.golpe === 'fallo') return 'fallo';
    return e.golpe ? null : 'espera';
  };

  function resultadoDe(r) {
    const t = ahora();
    if (r.tipo === 'golpe') {
      marca(r.nota.c, COLORES[r.nota.c], T.califs[r.calif], true, r.calif === 'perfecto');
      esc.golpe(r.nota.c, r.calif, t);
      b?.guitarra(true);
      if (r.calif === 'perfecto' && !QUIETO) vibrate(6);
    } else if (r.tipo === 'soltar') {
      if (r.calif) { marca(r.nota.c, '#ffffff', T.califs[r.calif], true, r.calif === 'perfecto'); esc.golpe(r.nota.c, r.calif, t); }
      else { marca(r.nota.c, '#ff8a8a', T.califs[r.motivo], false); esc.falla(r.nota.c, t); b?.guitarra(false); b?.muteo(); vibrate(30); }
    } else if (r.tipo === 'fallo') {
      marca(r.nota.c, '#ff8a8a', T.califs.fallo, false);
      esc.falla(r.nota.c, t);
      b?.guitarra(false);
      if (!p.sosteniendo) { b?.muteo(); vibrate(25); }
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
    if (r.tipo === 'nada') { b?.muteo(); b?.guitarra(false); esc.falla(presionado, ahora()); }
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
    if (p.sosteniendo) esc.sostiene(c.notas[p.sosteniendo.i].c);
    // The meters
    if (p.puntos !== pts0) { pts0 = p.puntos; pts.textContent = miles(p.puntos); }
    const m = multiplicador(p.racha);
    if (m !== multiAntes) {
      if (m === 4) { marca(1, '#ff9a3d', T.fuego, false, true); capa.classList.add('fuego'); }
      if (m < 4) capa.classList.remove('fuego');
      multiAntes = m;
    }
    multi.textContent = `×${m}`; multi.dataset.m = m;
    racha.textContent = p.racha >= 5 ? fmt(T.racha, { n: p.racha }) : '';
    energia.style.width = `${p.energia}%`;
    energia.classList.toggle('baja', p.energia < 25);
    const s = seccionEn(c, t);
    if (s !== ultimaParte && s >= 0) {
      ultimaParte = s;
      parte.textContent = fmt(T.parte, { s: s + 1, n: partes });
      parte.classList.remove('sube'); void parte.offsetWidth; parte.classList.add('sube');
      // The closing bar belongs to the last part: no sign for it
      if (t < c.compases.at(-1).t) esc.anunciar(fmt(T.cartel, { s: s + 1 }), fmt(T.bpm, { n: c.partes[s].bpm }), t);
    }
    avance.style.width = `${Math.max(0, Math.min(100, (100 * t) / c.duracion))}%`;
    // The count-in, on the sticks of the intro's second bar
    let cuenta = null;
    const intro = c.compases[1];
    if (t >= intro.t && t < intro.t + intro.dur) cuenta = T.cuenta[Math.floor((t - intro.t) / (intro.dur / 4))];
    if (lienzo.clientWidth && Math.abs(lienzo.clientWidth - esc.G.W) > 1) esc.medir();
    esc.dibujar(c, t, { vista: vistaNota, presionado, fx, cuenta, multi: m });
    if (p.fin === 'apagon') return cerrar('apagon');
    if (p.fin === 'completa' && t > c.duracion - 0.8) return cerrar('completa');
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
    removeEventListener('resize', alMedir);
    document.removeEventListener('visibilitychange', alOcultar);
    P.fin = motivo;
    const grande = T.finGrande[motivo];
    if (motivo === 'apagon') { b?.apagon(); capa.classList.add('apagado'); vibrate([60, 40, 120]); }
    else if (motivo === 'rendido') { b?.seguir(); b?.parar(); }
    else b?.terminar(1.5);
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
    const BEAT = 0.6, N = 16, DESDE = 0.6;
    const t0 = b.clics(Array.from({ length: N }, (_, k) => DESDE + k * BEAT));
    const ahora = () => b.ahora() - t0 - b.latencia();
    const difs = [];
    empezarBtn.disabled = true; boton.disabled = false;
    estado.textContent = A.escucha;
    const toque = e => {
      e.preventDefault();
      const t = ahora() - Math.min(0.1, Math.max(0, performance.now() - e.timeStamp) / 1000);
      const k = Math.round((t - DESDE) / BEAT);
      boton.classList.remove('late'); void boton.offsetWidth; boton.classList.add('late');
      if (k >= 2 && k < N) { const d = t - (DESDE + k * BEAT); if (Math.abs(d) < 0.3) difs.push(d); }
    };
    boton.addEventListener('pointerdown', toque);
    // The pad beats with the clicks, so the eye helps too
    const latir = () => {
      if (!boton.isConnected) return;
      const t = ahora();
      const fase = ((t - DESDE) % BEAT + BEAT) % BEAT;
      boton.style.setProperty('--latido', t > DESDE - 0.1 && t < DESDE + N * BEAT ? String(Math.max(0, 1 - fase / 0.18)) : '0');
      if (t < DESDE + N * BEAT + 0.4) return requestAnimationFrame(latir);
      boton.removeEventListener('pointerdown', toque);
      boton.disabled = true; empezarBtn.disabled = false;
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

function resultado() {
  const { p, def } = P;
  const pts = p.puntos, acc = precision(p), completa = P.fin === 'completa';
  const nuevo = pts > P.record;
  if (nuevo) guardar(keyRecord(def.id), pts);
  const card = tarjeta(p);
  const partes = P.c.partes.length;
  trackFinish({ detalle: `${def.id} · ${pts} pts · ${P.fin} · parte ${p.alcanzada + 1}/${partes} · ${acc} % · racha ${p.mejorRacha} · ${card}${P.sonando ? '' : ' · sin sonido'}` });
  const lineas = [
    fmt(T.desglose.precision, { p: acc }),
    fmt(T.desglose.racha, { n: p.mejorRacha }),
    fmt(T.desglose.notas, p.cuenta),
    completa ? T.desglose.entera : fmt(T.desglose.hasta, { s: p.alcanzada + 1, n: partes }),
  ];
  vista.replaceChildren(el('div', { class: 'resultado' },
    tituloJuego(true),
    el('p', { class: 'resultado-cancion', id: 'resultado-cancion' }, `${def.titulo} · ${def.autor}`),
    el('p', { class: `sello-pulso${completa ? '' : ' mal'}` }, T.fin[P.fin]),
    el('div', { class: 'score-big', id: 'puntaje' }, miles(pts)),
    el('p', { class: 'tarjeta-pulso', id: 'tarjeta', 'aria-hidden': 'true' }, card),
    nuevo && pts > 0 ? el('p', { class: 'record nuevo', id: 'record', style: 'margin:0' }, T.nuevoRecord)
      : P.record ? el('p', { class: 'muted', id: 'record', style: 'margin:0' }, fmt(T.recordEra, { n: miles(P.record) })) : null,
    el('ul', { class: 'desglose muted' }, ...lineas.map(x => el('li', {}, x))),
    botonResultadoSolo({ C: COMMON.es, emoji: '🎸', juego: `${T.nombre} · ${def.titulo}`, puntaje: `${miles(pts)} pts`, tiempo: '', tarjeta: card, url: `${SITIO}labs/pulse/?song=${def.id}`, alTocar: () => SFX.tap() }),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-otra-vez', onClick: () => { SFX.tap(); empezarDesdeResultado(); } }, T.otraVez),
    el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'btn-otra-cancion', onClick: () => { SFX.tap(); portada(); scrollTo(0, 0); } }, T.otraCancion),
    salidasFin('lab', { raiz: '../../' }),
    // A line sets the game apart from the comment for testers, as in the other lab games
    el('hr', { class: 'divisor' }),
    formularioComentario({ T: T.comentario, contexto: contexto('resultado') })));
  pie.replaceChildren();
  scrollTo(0, 0);
  if (completa || nuevo) { SFX.win(); if (!QUIETO) confetti({ count: 160, duration: 2200 }); }
  else SFX.tap();
}

/** Otra vez: the same song, from the result (its audio is already loaded). */
function empezarDesdeResultado() {
  vista.replaceChildren(el('p', { class: 'aviso-carga', id: 'aviso-carga', role: 'status' }, T.cargando));
  empezar();
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
