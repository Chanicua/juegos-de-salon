/**
 * Aletazo — lab prototype: a one-tap flyer, inspired by Flappy Bird (Dong Nguyen, 2013), credited on the cover. Every tap gives the bird a wing flap upwards, gravity
 * pulls it down, and the course comes at it: hoops (dead center counts double), walls with a single
 * opening, spinning spikes. A new level every 5 gates, each one faster and tighter; 3 lives.
 *
 * The engine (physics, course, rules) is engine.js; the drawing is scene.js. This file is the screens,
 * the input, the sound and the texts, in Spanish, English and Portuguese (C-3).
 */
import { el, vibrate } from '../../assets/js/ui.js';
import { initSound, soundToggle, isMuted } from '../../assets/js/sound.js';
import { getLang, langToggle } from '../../assets/js/i18n.js';
import { salidasFin } from '../../assets/js/fin.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { abrirComentario } from '../../assets/js/labs-idioma.js';
import { newGame, step, flap, verdictOf, LIVES } from './engine.js';
import { escena } from './scene.js';

trackVisit();   // the site's traffic (D-208)

const GAME_ID = 'aletazo';
const BEST_KEY = 'juegos-de-salon:aletazo-best';
const LOCALES = {
  es: {
    nombre: 'Aletazo',
    lema: 'Un toque, un aletazo.',
    credito: ['Inspirado en ', ', de Dong Nguyen.'], wiki: 'https://es.wikipedia.org/wiki/Flappy_Bird',
    como: [
      ['👆', 'Toca para subir un poco.'],
      ['⭕', 'Pasa por aros y huecos. Al medio vale doble.'],
      ['❤️', '3 vidas. Si chocas o te saltas un aro, pierdes una.'],
    ],
    jugar: '🐤 Jugar', listo: 'Toca para volar', muros: '¡Muros! Pasa por el hueco',
    nivel: 'Nivel {n}', nivelCorto: 'Nv {n}', vidas: '{n} vidas',
    record: '🏆 ¡Nuevo récord!', fin: '¡Se acabó!', tuMejor: 'Tu mejor: {n}', mejor: 'Récord: {n}',
    veredictos: ['Recién saliendo del nido 🐣', 'Ya le estás agarrando el vuelo', '¡Vuelas bonito! ✨', '¡Pájaro de altura! 🦅', '¡Dueño del cielo! 👑'],
    otraVez: 'Jugar otra vez', pausa: 'En pausa', seguir: 'Toca para seguir', laboratorio: '‹ Laboratorio',
    comentarAbrir: '💬 Dejar un comentario',
    comentario: { titulo: '¿Qué te pareció?', lead: 'Cuéntanos si el salto se sentía bien, si se ponía difícil muy rápido y qué le cambiarías.', ph: 'Por ejemplo: los muros llegan muy pronto.', nombre: 'Nombre o apodo (opcional)', enviar: 'Enviar comentario', enviando: 'Enviando…', vacio: 'Escribe algo primero.', gracias: '¡Gracias! 🙌 Tu comentario llegó.', guardado: 'Ahora no hay internet: tu comentario quedó en el celular y se envía solo después.', error: 'No se pudo enviar. Prueba de nuevo en un rato.', cancelar: 'Cancelar', cerrar: 'Cerrar' },
  },
  en: {
    nombre: 'Aletazo',
    lema: 'One tap, one flap.',
    credito: ['Inspired by ', ', by Dong Nguyen.'], wiki: 'https://en.wikipedia.org/wiki/Flappy_Bird',
    como: [
      ['👆', 'Tap to rise a little.'],
      ['⭕', 'Fly through hoops and gaps. Dead center counts double.'],
      ['❤️', '3 lives. Crash or skip a hoop and you lose one.'],
    ],
    jugar: '🐤 Play', listo: 'Tap to fly', muros: 'Walls! Go through the gap',
    nivel: 'Level {n}', nivelCorto: 'Lv {n}', vidas: '{n} lives',
    record: '🏆 New best!', fin: 'Game over!', tuMejor: 'Your best: {n}', mejor: 'Best: {n}',
    veredictos: ['Fresh out of the nest 🐣', 'Getting the hang of it', 'Flying pretty! ✨', 'High flyer! 🦅', 'King of the sky! 👑'],
    otraVez: 'Play again', pausa: 'Paused', seguir: 'Tap to go on', laboratorio: '‹ Lab',
    comentarAbrir: '💬 Leave a comment',
    comentario: { titulo: 'What did you think?', lead: 'Tell us if the flap felt right, if it got hard too fast and what you would change.', ph: 'For example: the walls come too soon.', nombre: 'Name or nickname (optional)', enviar: 'Send comment', enviando: 'Sending…', vacio: 'Write something first.', gracias: 'Thanks! 🙌 Your comment arrived.', guardado: 'There is no internet right now: your comment is saved on this phone and will be sent later.', error: 'It could not be sent. Try again in a while.', cancelar: 'Cancel', cerrar: 'Close' },
  },
  pt: {
    nombre: 'Aletazo',
    lema: 'Um toque, uma batida de asa.',
    credito: ['Inspirado em ', ', de Dong Nguyen.'], wiki: 'https://pt.wikipedia.org/wiki/Flappy_Bird',
    como: [
      ['👆', 'Toque para subir um pouco.'],
      ['⭕', 'Passe por aros e brechas. No centro vale dobrado.'],
      ['❤️', '3 vidas. Se bater ou pular um aro, perde uma.'],
    ],
    jugar: '🐤 Jogar', listo: 'Toque para voar', muros: 'Muros! Passe pela brecha',
    nivel: 'Nível {n}', nivelCorto: 'Nv {n}', vidas: '{n} vidas',
    record: '🏆 Novo recorde!', fin: 'Acabou!', tuMejor: 'Seu melhor: {n}', mejor: 'Recorde: {n}',
    veredictos: ['Acabou de sair do ninho 🐣', 'Pegando o jeito', 'Voando bonito! ✨', 'Voo de altura! 🦅', 'Dono do céu! 👑'],
    otraVez: 'Jogar de novo', pausa: 'Pausado', seguir: 'Toque para continuar', laboratorio: '‹ Laboratório',
    comentarAbrir: '💬 Deixar um comentário',
    comentario: { titulo: 'O que achou?', lead: 'Conte se o salto parecia certo, se ficava difícil rápido demais e o que você mudaria.', ph: 'Por exemplo: os muros chegam cedo demais.', nombre: 'Nome ou apelido (opcional)', enviar: 'Enviar comentário', enviando: 'Enviando…', vacio: 'Escreva algo primeiro.', gracias: 'Obrigado! 🙌 Seu comentário chegou.', guardado: 'Agora não há internet: seu comentário ficou no celular e será enviado depois.', error: 'Não foi possível enviar. Tente de novo daqui a pouco.', cancelar: 'Cancelar', cerrar: 'Fechar' },
  },
};
const lang = getLang();
const L = LOCALES[lang] || LOCALES.es;
const fmt = (s, n) => String(s).replace('{n}', n);
const $ = id => document.getElementById(id);

/* ------------------------------------------------------------------ */
/* Sound: a few short synth tones, silenced by the app's 🔊 toggle     */
/* ------------------------------------------------------------------ */
// The context is opened by the tap on Play: opening it on the first flap froze that frame
let ac = null, master = null;
function unlockAudio() {
  try {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
    if (ac.state !== 'running') ac.resume();
  } catch (_) { /* no audio: it plays silent */ }
}
function tone(f0, f1, dur, type = 'sine', vol = 0.12, delay = 0) {
  if (isMuted() || !ac || ac.state !== 'running') return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f1, s + dur);
    g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    o.connect(g).connect(master); o.start(s); o.stop(s + dur + 0.02);
  } catch (_) { /* a missed beep is fine */ }
}
const SOUND = {
  flap: () => tone(420, 760, 0.09, 'triangle', 0.08),
  pass: () => tone(760, 1040, 0.12, 'sine', 0.1),
  perfect: () => { tone(880, 880, 0.08, 'square', 0.05); tone(1175, 1175, 0.08, 'square', 0.05, 0.07); tone(1568, 1568, 0.14, 'square', 0.05, 0.14); },
  hit: () => tone(220, 70, 0.28, 'sawtooth', 0.12),
  over: () => { tone(440, 330, 0.18, 'triangle', 0.1); tone(330, 220, 0.25, 'triangle', 0.1, 0.18); tone(220, 110, 0.4, 'triangle', 0.1, 0.42); },
};

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */
const stage = $('escenario'), hud = $('hud'), cover = $('portada'), result = $('resultado'), pauseEl = $('pausa'), aviso = $('aviso');
const scene = escena($('lienzo'));
let W = scene.measure();
new ResizeObserver(() => { W = scene.measure(); if (g) g.W = W; }).observe(stage);

let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (_) { /* no storage: no best kept */ }
let g = null, paused = false, startedAt = 0;

function say(text, shine = false) {
  aviso.textContent = text;
  aviso.className = 'aviso';
  if (shine) { void aviso.offsetWidth; aviso.className = 'aviso brilla'; }
}
function paintHud() {
  $('marcador').textContent = g.score;
  $('vidas').replaceChildren(...Array.from({ length: LIVES }, (_, i) => el('span', { class: i < g.hearts ? '' : 'off' }, '❤️')));
  $('vidas').setAttribute('aria-label', fmt(L.vidas, g.hearts));
  $('nivel').textContent = fmt(L.nivelCorto, g.level);
}

function texts() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  $('btn-volver').textContent = L.laboratorio;
  $('lema').textContent = L.lema;
  // The credit to the game it comes from, like Shinobi's and Babel's to Ketchapp
  $('credito').replaceChildren(L.credito[0], el('a', { href: L.wiki, target: '_blank', rel: 'noopener', id: 'link-flappy-bird' }, 'Flappy Bird'), L.credito[1]);
  $('pasos').replaceChildren(...L.como.map(([e, t]) => el('li', {}, el('span', { class: 'paso-ico', 'aria-hidden': 'true' }, e), el('span', {}, t))));
  $('btn-jugar').textContent = L.jugar;
  $('mejor-portada').replaceChildren(...(best ? [fmt(L.mejor, ''), el('b', {}, String(best))] : []));
  $('pausa-titulo').textContent = L.pausa; $('pausa-seguir').textContent = L.seguir;
  $('btn-otra').textContent = L.otraVez;
  $('pie').replaceChildren(el('button', {
    type: 'button', class: 'link-btn', id: 'btn-comentario',
    onClick: () => abrirComentario({ T: L.comentario, contexto: contexto() }),
  }, L.comentarAbrir));
}
const contexto = () => ({
  juego: GAME_ID, pantalla: g?.mode === 'play' ? 'juego' : result.hidden ? 'portada' : 'resultado',
  puntaje: g?.score, nivel: g?.level, url: location.pathname + location.search,
  pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

/** The cover: the card over a demo that flies itself. */
function toCover() {
  g = newGame({ W }); g.mode = 'demo';
  scene.clear();
  result.hidden = true; hud.hidden = true; cover.hidden = false;
  texts();
}
function startGame() {
  unlockAudio();
  g = newGame({ W });
  scene.clear();
  cover.hidden = true; result.hidden = true; hud.hidden = false;
  paintHud(); say(L.listo);
  stage.focus({ preventScroll: true });
}
function showResult() {
  const n = g.score, isBest = n > best;
  if (isBest) { best = n; try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) { /* not kept */ } }
  trackFinish({ detalle: `${n} pts · ${g.passed} gates · ${g.perfects} center · ${g.walls} walls · level ${g.level} · ${Math.round((Date.now() - startedAt) / 1000)}s` });
  hud.hidden = true;
  const stamp = $('res-sello');
  stamp.textContent = isBest ? L.record : L.fin; stamp.className = `sello ${isBest ? 'record' : 'fin'}`;
  $('res-puntos').textContent = n;
  $('res-veredicto').textContent = L.veredictos[verdictOf(n)];
  $('res-mejor').replaceChildren(...(isBest ? [] : [fmt(L.tuMejor, ''), el('b', {}, String(best))]));
  $('res-salidas').replaceChildren(salidasFin('lab', { lang, raiz: '../../' }));
  result.hidden = false;
  $('btn-otra').focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
function press(e) {
  e?.preventDefault();
  if (!g) return;
  if (paused) { paused = false; pauseEl.hidden = true; last = performance.now(); return; }
  if (g.mode === 'ready') { say(''); aviso.className = 'aviso fuera'; startedAt = Date.now(); trackStart({ game: GAME_ID, mode: 'solo', players: 1 }); }
  if (g.mode === 'ready' || g.mode === 'play') flap(g);
}
stage.addEventListener('pointerdown', e => { if (e.target.closest('.capa')) return; press(e); });
addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && g && (g.mode === 'ready' || g.mode === 'play' || paused) && !e.target.closest?.('button, a, input, textarea')) press(e);
});
// A call or another app pauses it; a tap brings it back
document.addEventListener('visibilitychange', () => { if (document.hidden && g?.mode === 'play') { paused = true; pauseEl.hidden = false; } });
$('btn-jugar').addEventListener('click', startGame);
$('btn-otra').addEventListener('click', startGame);

/* ------------------------------------------------------------------ */
/* The loop: a fixed step, so the feel is the same on every phone      */
/* ------------------------------------------------------------------ */
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
function play(e) {
  if (e.type === 'flap') SOUND.flap();
  else if (e.type === 'pass') SOUND.pass();
  else if (e.type === 'perfect') SOUND.perfect();
  else if (e.type === 'hit') { SOUND.hit(); vibrate(60); }
  else if (e.type === 'over') SOUND.over();
  else if (e.type === 'level') say(fmt(L.nivel, e.level), true);
  else if (e.type === 'walls') say(L.muros, true);
  else if (e.type === 'end') showResult();
  scene.fx(e, g);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (g && !paused) {
    acc += dt;
    while (acc >= STEP) {
      step(g, STEP); scene.tick(STEP, g); acc -= STEP;
      if (g.events.length) {
        const evs = g.events.splice(0);
        if (g.mode !== 'demo') { evs.forEach(play); if (evs.some(e => e.type !== 'flap')) paintHud(); }
      }
    }
  }
  if (g) scene.draw(g);
  requestAnimationFrame(frame);
}

$('sound-slot').append(soundToggle());
$('lang-slot').append(langToggle());
initSound();
toCover();
requestAnimationFrame(frame);
// For the end-to-end script: the game in play
window.__aletazo = { get g() { return g; }, start: startGame };
