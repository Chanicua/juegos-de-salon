/**
 * Ojo de lince — lab prototype (the owner's idea): an endless, quick memory game. Each round some
 * pixel-art pictures show on a covered board, some repeated, and hide again; the player taps every
 * copy of the one picture asked for (one, a pair or a trio) before the time runs out. Rounds keep
 * getting harder until the three lives run out. Without `?seed=` it is today's game, the same for
 * everyone. The rules are in engine.js, the texts in rules.js, the pictures in sprites.js.
 * See docs/games/eagle-eye.md.
 */
import { el, vibrate, sparkles, confetti } from '../../assets/js/ui.js';
import { getLang, langToggle, COMMON, SITIO } from '../../assets/js/i18n.js';
import { SFX, soundToggle, initSound } from '../../assets/js/sound.js';
import { botonResultadoSolo } from '../../assets/js/compartir.js';
import { trackVisit, trackStart, trackFinish } from '../../assets/js/transport/stats.js';
import { formularioComentario, abrirComentario } from '../../assets/js/labs-idioma.js';
import { fechaLocal } from '../../assets/js/uno-al-dia.js';
import { salidasFin } from '../../assets/js/fin.js';
import { mmss } from '../../assets/js/time-format.js';
import { LIVES, newGame, currentRound, newPlay, tap, endRound, makeRound } from './engine.js';
import { spriteSvg } from './sprites.js';
import { GAME_ID, LOCALES } from './rules.js';

trackVisit();   // the site's traffic (D-208)

const lang = getLang();
const T = LOCALES[lang] || LOCALES.es;
const C = COMMON[lang] || COMMON.es;
const QUIET = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const SEED_URL = (params.get('seed') || '').trim();
// `?test` runs every wait four times faster, for the end-to-end script
const SPEED = params.has('test') ? 0.25 : 1;
const BEST_KEY = 'juegos-de-salon:eagle-eye-best';

const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const plural = (pair, n) => fmt(pair[n === 1 ? 0 : 1], { n });
const wait = ms => new Promise(r => setTimeout(r, ms * SPEED));
const anim = ms => (QUIET ? 1 : ms * SPEED);
const bestBefore = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const keepBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } };

const view = document.getElementById('vista');
const foot = document.getElementById('pie');
const S = { g: null, round: null, play: null, from: 0, best: 0, answer: null, run: 0 };

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const title = (small = false) => el('h1', { class: `title-ee${small ? ' small' : ''}` },
  el('span', { class: 'logo', 'aria-hidden': 'true' }, '👀'), el('span', { class: `display ${small ? '' : 'display--lg '}rainbow` }, T.name));
const picture = (name, cls = 'pic-icon') => el('span', { class: cls, html: spriteSvg(name), 'aria-hidden': 'true' });

function commentFoot(screen) {
  foot.replaceChildren(el('button', {
    type: 'button', class: 'link-btn', id: 'btn-comentario',
    onClick: () => { SFX.tap(); abrirComentario({ T: T.comment, contexto: context(screen) }); },
  }, T.commentOpen));
}
const context = screen => ({
  juego: GAME_ID, pantalla: screen, semilla: S.g?.seed, nivel: S.g?.level, vidas: S.g?.lives,
  url: location.pathname + location.search, pantallaTam: `${innerWidth}×${innerHeight}`, navegador: navigator.userAgent.slice(0, 160),
});

/** A covered board of `size`×`size` tiles; each tile has a cover and, on its back, a picture. */
function board(size, { mini = false } = {}) {
  const b = el('div', { class: `board${mini ? ' mini' : ''}`, style: `--n:${size}`, ...(mini ? {} : { id: 'tablero', 'data-tablero': 'eagle-eye' }) });
  for (let i = 0; i < size * size; i++) {
    b.append(el(mini ? 'span' : 'button', {
      class: 'tile', 'data-i': i, ...(mini ? {} : { type: 'button', 'aria-label': T.covered, disabled: true }),
    }, el('span', { class: 'inner' }, el('span', { class: 'face cover' }), el('span', { class: 'face pic' }))));
  }
  return b;
}
const tileAt = (b, i) => b.children[i];
function setPic(tile, name) {
  tile.querySelector('.pic').innerHTML = name ? spriteSvg(name) : '';
  tile.classList.toggle('empty', !name);
}
function openTile(tile, name, label = true) {
  setPic(tile, name);
  tile.classList.add('open');
  if (label && tile.tagName === 'BUTTON') tile.setAttribute('aria-label', name || T.empty);
}
function closeAll(b) {
  for (const t of b.children) { t.classList.remove('open', 'ok', 'bad', 'answer'); if (t.tagName === 'BUTTON') t.setAttribute('aria-label', T.covered); }
}
const clearPics = b => { for (const t of b.children) setPic(t, null); };

/* ------------------------------------------------------------------ */
/* The cover                                                           */
/* ------------------------------------------------------------------ */

let demoRun = 0;
function cover() {
  S.best = bestBefore();
  const mini = board(3, { mini: true });
  view.replaceChildren(
    el('div', { class: 'cover-ee' },
      title(),
      el('p', { class: 'lead', style: 'margin:0' }, T.tagline),
      el('div', { id: 'lang-slot' }, langToggle()),
      el('div', { class: 'demo', 'aria-hidden': 'true' }, mini)),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-jugar', onClick: () => { SFX.tap(); start(); } }, T.play),
    // The steps go after Play, so it is seen without scrolling on a small phone (U-39)
    el('div', { class: 'panel' },
      el('ol', { class: 'steps' }, ...T.steps.map(([ico, x]) => el('li', {}, el('span', { class: 'step-ico', 'aria-hidden': 'true' }, ico), el('span', {}, x)))),
      SEED_URL ? null : el('p', { class: 'muted today-note' }, `📅 ${T.today}`),
      S.best ? el('p', { class: 'best-cover' }, fmt(T.best, { n: S.best })) : null),
  );
  commentFoot('portada');
  demo(mini);
}

/** The cover's board plays by itself: the pictures show, cover, and the one asked opens with a green ring. */
function demo(b) {
  const run = ++demoRun;
  const alive = () => run === demoRun && b.isConnected;
  const r0 = makeRound('cover', 2);
  b.querySelectorAll('.tile').forEach((t, i) => (r0.board[i] ? openTile(t, r0.board[i], false) : null));
  if (QUIET) return;
  (async () => {
    for (let k = 0; alive(); k++) {
      const r = makeRound(`cover-${k % 6}`, 1 + (k % 2));
      closeAll(b); await wait(450); clearPics(b);
      r.board.forEach((s, i) => s && openTile(tileAt(b, i), s, false));
      await wait(1500); if (!alive()) return;
      closeAll(b); await wait(900); if (!alive()) return;
      clearPics(b);
      for (const c of r.ask.cells) { openTile(tileAt(b, c), r.ask.sprite, false); tileAt(b, c).classList.add('ok'); await wait(350); }
      await wait(1300);
    }
  })();
}

/* ------------------------------------------------------------------ */
/* The game                                                            */
/* ------------------------------------------------------------------ */

let hud = null;
/** A game: the first one is today's (or the link's seed); playing again draws a new one. */
function start(seed = SEED_URL || `day:${fechaLocal()}`) {
  demoRun++;
  S.g = newGame(seed);
  S.best = bestBefore();
  S.from = Date.now();
  S.run++;
  trackStart({ game: GAME_ID, mode: 'solo', players: 1 });
  hud = {
    best: el('span', { class: 'best-ee', id: 'mejor' }, S.best ? fmt(T.best, { n: S.best }) : ''),
    lives: el('span', { class: 'lives-ee', id: 'vidas', role: 'img' }),
    round: el('span', { class: 'round-ee', id: 'ronda' }),
    prompt: el('div', { class: 'prompt-ee', id: 'aviso', 'aria-live': 'polite' }),
    bar: el('div', { class: 'bar-ee', 'aria-hidden': 'true' }, el('span')),
    slot: el('div', { class: 'board-slot' }),
  };
  // The board in the middle of the screen; what to do now goes under it, with the time to look
  view.replaceChildren(el('div', { class: 'play-ee' },
    el('div', { class: 'head-ee' }, title(true), hud.best),
    el('div', { class: 'hud-ee' }, hud.lives, hud.round),
    hud.slot, hud.bar, hud.prompt,
  ));
  commentFoot('juego');
  drawLives();
  loop(S.run);
}

function drawLives(lost = false) {
  const { lives } = S.g;
  hud.lives.setAttribute('aria-label', fmt(T.livesLabel, { n: lives }));
  hud.lives.replaceChildren(...Array.from({ length: LIVES }, (_, k) => el('span', { class: k < lives ? '' : `lost${lost && k === lives ? ' now' : ''}` }, '❤️')));
}
function say(content, cls = '') {
  hud.prompt.className = `prompt-ee ${cls}`;
  hud.prompt.replaceChildren(...[].concat(content));
}

async function loop(run) {
  const alive = () => run === S.run && hud?.slot.isConnected;
  while (alive()) {
    const round = currentRound(S.g);
    S.round = round; S.play = newPlay(round);
    hud.round.textContent = fmt(T.round, { n: S.g.level });
    hud.round.classList.remove('bump'); void hud.round.offsetWidth; hud.round.classList.add('bump');
    const b = board(round.size);
    hud.slot.replaceChildren(b);
    b.addEventListener('click', ev => {
      const t = ev.target.closest('.tile');
      if (t && !t.disabled && S.answer) S.answer(+t.dataset.i);
    });
    // 1. The first pairs round says so first
    if (round.intro && round.ask.cells.length === 2 && S.g.level === 2) { say(T.pairs, 'big'); SFX.turn(); await wait(900); if (!alive()) return; }
    // 2. The pictures show
    say(T.look);
    SFX.flip();
    round.board.forEach((s, i) => s && setTimeout(() => openTile(tileAt(b, i), s, false), anim(i * 12)));
    timeBar(round.showMs, 'look');
    await wait(round.showMs); if (!alive()) return;
    // 3. They hide
    say(T.hide);
    closeAll(b);
    await wait(380); if (!alive()) return;
    clearPics(b);
    // 4. The player finds them
    const cleared = await ask(b, round, alive);
    if (!alive()) return;
    if (cleared) {
      S.g.found++;
      say(T.well[Math.floor(Math.random() * T.well.length)], 'well');
      SFX.reveal(); vibrate(20);
      b.classList.add('cleared');
    }
    const { life, over } = endRound(S.g, cleared);
    if (cleared) {
      if (S.g.score > S.best) { keepBest(S.g.score); hud.best.textContent = fmt(T.best, { n: S.g.score }); hud.best.classList.add('record'); }
    }
    drawLives(!cleared);
    if (life) { await wait(500); say(T.lifeBack, 'well'); SFX.turn(); drawLives(); }
    if (over) { await wait(900); return result(); }
    if (!cleared) { await wait(400); say(plural(T.lives, S.g.lives), 'bad'); }
    // A clear stays on screen a while, the pictures found still open, before the next board (the owner's request)
    await wait(cleared ? (life ? 1800 : 1500) : 1300);
  }
}

/** The bar under the board: the time left to look, or to answer. */
function timeBar(ms, kind) {
  const fill = hud.bar.firstElementChild;
  hud.bar.className = `bar-ee on ${kind}`;
  fill.getAnimations().forEach(x => x.cancel());
  fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms * SPEED, easing: 'linear', fill: 'forwards' });
}
const stopBar = () => { hud.bar.className = 'bar-ee'; hud.bar.firstElementChild.getAnimations().forEach(x => x.cancel()); };

/**
 * Asks for the picture: every copy of it must be found before the time runs out. Resolves true once
 * all are found, false on a wrong tile or when the time is up (then where they were opens).
 */
function ask(b, round, alive) {
  for (const t of b.children) t.disabled = false;
  const { sprite, cells } = round.ask;
  const words = [T.ask, T.askPair, T.askTrio][cells.length - 1];
  say([el('span', {}, words), picture(sprite)], 'ask');
  timeBar(round.answerMs, 'answer');
  return new Promise(resolve => {
    const fail = (tile, text) => {
      S.answer = null; clearTimeout(clock); stopBar();
      for (const x of b.children) x.disabled = true;
      tile?.classList.add('bad');
      SFX.error(); vibrate([40, 30, 40]);
      say(text, 'bad');
      // Where they were: the copies not found open with a yellow ring
      setTimeout(() => cells.forEach(c => { if (!S.play.found.includes(c)) { openTile(tileAt(b, c), sprite); tileAt(b, c).classList.add('answer'); } }), anim(350));
      setTimeout(() => resolve(false), anim(1500));
    };
    const clock = setTimeout(() => { if (alive() && S.answer) fail(null, T.timeUp); }, round.answerMs * SPEED);
    S.answer = i => {
      if (!alive()) { S.answer = null; clearTimeout(clock); return; }
      const t = tileAt(b, i);
      const res = tap(S.play, i);
      if (res === 'again') return;
      openTile(t, round.board[i]);
      if (res === 'miss') return fail(t, T.miss);
      t.classList.add('ok'); t.disabled = true;
      SFX.tap(); vibrate(10);
      if (res === 'clear') { S.answer = null; clearTimeout(clock); stopBar(); for (const x of b.children) x.disabled = true; setTimeout(() => resolve(true), anim(250)); }
    };
  });
}

/* ------------------------------------------------------------------ */
/* The result                                                          */
/* ------------------------------------------------------------------ */

const link = seed => (seed ? `?seed=${encodeURIComponent(seed)}` : '');

function result() {
  const { g } = S;
  S.answer = null;
  const ms = Date.now() - S.from;
  const record = g.score > S.best;
  const scoreText = plural(T.score, g.score);
  trackFinish({ detalle: `${g.score} rounds · level ${g.level} · ${g.found} found · ${mmss(ms)}` });
  foot.replaceChildren();
  view.replaceChildren(el('div', { class: 'result-ee' },
    title(true),
    el('p', { class: 'stamp-ee' }, T.over),
    el('div', { class: 'score-big', id: 'puntaje' }, scoreText),
    record && g.score ? el('p', { class: 'record-ee' }, T.record) : (S.best ? el('p', { class: 'muted', style: 'margin:0' }, fmt(T.bestWas, { n: S.best })) : null),
    el('ul', { class: 'breakdown muted' },
      el('li', {}, fmt(T.found, { n: g.found })),
      el('li', {}, fmt(T.reached, { n: g.level })),
      el('li', {}, fmt(T.time, { t: mmss(ms) }))),
    botonResultadoSolo({ C, emoji: '👀', juego: T.name, puntaje: scoreText, tiempo: mmss(ms), url: `${SITIO}labs/eagle-eye/${link(g.seed.startsWith('day:') ? '' : g.seed)}`, alTocar: () => SFX.tap() }),
    el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-otra', onClick: () => { SFX.tap(); start(Math.random().toString(36).slice(2, 8)); } }, T.again),
    salidasFin('lab', { lang, raiz: '../../' }),
    // A line sets the game apart from the comment for those trying it, as in the other lab games
    el('hr', { class: 'divisor' }),
    formularioComentario({ T: T.comment, contexto: context('resultado') })));
  scrollTo(0, 0);
  if (record && g.score) { SFX.win(); if (!QUIET) confetti({ count: 140, duration: 2000 }); } else SFX.sink();
}

document.documentElement.lang = lang;
document.getElementById('btn-volver').textContent = T.back;
document.title = `${T.name} 👀 · Lab`;
document.getElementById('sound-slot').append(soundToggle());
initSound();
sparkles();
cover();
window.__eagleEye = S;
