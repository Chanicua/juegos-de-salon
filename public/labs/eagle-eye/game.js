/**
 * Ojo de lince — lab prototype (the owner's idea): an endless, quick memory game. Each round some
 * pixel-art pictures show on a covered board and hide again, the board turns, flips or swaps tiles in
 * front of the player, and they tap where each picture ended up. Rounds keep getting harder until the
 * three lives run out. Without `?seed=` it is today's game, the same for everyone. The rules are in
 * engine.js, the texts in rules.js, the pictures in sprites.js. See docs/games/eagle-eye.md.
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
/* The moves, animated                                                 */
/* ------------------------------------------------------------------ */

/** What each move is called on screen. */
function moveLabel(m) {
  if (m.type === 'rotate') return m.turns === 2 ? T.moves.half : m.turns > 0 ? T.moves.right : T.moves.left;
  if (m.type === 'flip') return m.axis === 'h' ? T.moves.mirror : T.moves.upside;
  return T.moves[m.type];
}

/**
 * Plays a move on a covered board. Every cover looks the same, so once the animation ends the board
 * snaps back to rest and nothing seems to change: the pictures moved only in the engine's map.
 */
async function animateMove(b, size, m) {
  if (QUIET) return wait(500);
  const ease = 'cubic-bezier(.55,0,.3,1)';
  if (m.type === 'rotate') {
    const deg = 90 * m.turns;
    await b.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${deg / 2}deg) scale(0.92)` }, { transform: `rotate(${deg}deg)` }],
      { duration: anim(Math.abs(m.turns) === 2 ? 900 : 700), easing: ease }).finished;
    return;
  }
  if (m.type === 'flip') {
    const axis = m.axis === 'h' ? 'X' : 'Y';
    await b.animate([{ transform: 'none' }, { transform: `scale${axis}(0.02)` }, { transform: `scale${axis}(-1)` }],
      { duration: anim(700), easing: ease }).finished;
    return;
  }
  // Two rows, two columns or two tiles trade places: they lift, glow and cross on opposite arcs
  const pairs = [];
  if (m.type === 'swap') pairs.push([m.a, m.b]);
  else for (let k = 0; k < size; k++) pairs.push(m.type === 'rows' ? [m.a * size + k, m.b * size + k] : [k * size + m.a, k * size + m.b]);
  const runs = [];
  for (const [a, c] of pairs) {
    const ta = tileAt(b, a), tc = tileAt(b, c);
    const ra = ta.getBoundingClientRect(), rc = tc.getBoundingClientRect();
    const dx = rc.left - ra.left, dy = rc.top - ra.top;
    // The arc bends sideways to the path, one tile each way, so the two can be told apart
    const len = Math.hypot(dx, dy) || 1, bend = ra.width * 0.45;
    const ox = (-dy / len) * bend, oy = (dx / len) * bend;
    for (const [t, sx, sy, sign] of [[ta, dx, dy, 1], [tc, -dx, -dy, -1]]) {
      t.classList.add('moving');
      runs.push(t.animate([
        { transform: 'none' },
        { transform: `translate(${sx / 2 + ox * sign}px, ${sy / 2 + oy * sign}px) scale(1.12)`, offset: 0.5 },
        { transform: `translate(${sx}px, ${sy}px)` },
      ], { duration: anim(750), easing: 'ease-in-out' }).finished.then(() => t.classList.remove('moving')));
    }
  }
  await Promise.all(runs);
}

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

/** The cover's board plays by itself: two pictures, covered, a move, and they open where they went. */
function demo(b) {
  const run = ++demoRun;
  const alive = () => run === demoRun && b.isConnected;
  const r0 = makeRound('cover', 3);
  b.querySelectorAll('.tile').forEach((t, i) => (r0.start[i] ? openTile(t, r0.start[i], false) : null));
  if (QUIET) return;
  (async () => {
    for (let k = 0; alive(); k++) {
      const r = makeRound(`cover-${k % 6}`, 3);
      closeAll(b); await wait(450); clearPics(b);
      r.start.forEach((s, i) => s && openTile(tileAt(b, i), s, false));
      await wait(1500); if (!alive()) return;
      closeAll(b); await wait(450); if (!alive()) return;
      clearPics(b);
      for (const m of r.moves) { await animateMove(b, 3, m); if (!alive()) return; }
      await wait(300);
      r.end.forEach((s, i) => { if (s) { openTile(tileAt(b, i), s, false); tileAt(b, i).classList.add('ok'); } });
      await wait(1600);
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
  view.replaceChildren(
    el('div', { class: 'head-ee' }, title(true), hud.best),
    el('div', { class: 'hud-ee' }, hud.lives, hud.round),
    hud.prompt, hud.bar, hud.slot,
  );
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
    // 1. A pairs round says so first
    if (round.pairs) { say(T.pairs, 'big'); SFX.turn(); await wait(900); if (!alive()) return; }
    // 2. The pictures show
    say(T.look);
    SFX.flip();
    round.start.forEach((s, i) => s && setTimeout(() => openTile(tileAt(b, i), s, false), anim(i * 18)));
    const fill = hud.bar.firstElementChild;
    hud.bar.classList.add('on');
    fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: round.showMs * SPEED, easing: 'linear', fill: 'forwards' });
    await wait(round.showMs); if (!alive()) return;
    hud.bar.classList.remove('on');
    // 3. They hide, and the board moves
    say(T.hide);
    closeAll(b);
    await wait(380); if (!alive()) return;
    clearPics(b);
    for (const m of round.moves) {
      say(moveLabel(m), 'move'); SFX.pass();
      await wait(250); if (!alive()) return;
      await animateMove(b, round.size, m); if (!alive()) return;
      await wait(180);
    }
    // 4. The player finds them
    const cleared = await ask(b, round, alive);
    if (!alive()) return;
    if (cleared) {
      S.g.found += round.ask.length;
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
    await wait(cleared ? (life ? 1100 : 650) : 1300);
  }
}

/** Asks for each picture in turn; resolves true once all are found, false on the first miss. */
function ask(b, round, alive) {
  for (const t of b.children) t.disabled = false;
  const prompt = () => {
    const item = round.ask[S.play.current];
    say([el('span', {}, round.pairs ? T.askPair : T.ask), picture(item.sprite)], 'ask');
  };
  prompt();
  return new Promise(resolve => {
    S.answer = i => {
      if (!alive()) { S.answer = null; return; }
      const t = tileAt(b, i);
      const res = tap(S.play, i);
      if (res === 'again') return;
      openTile(t, round.end[i]);
      if (res === 'miss') {
        S.answer = null;
        for (const x of b.children) x.disabled = true;
        t.classList.add('bad');
        SFX.error(); vibrate([40, 30, 40]);
        say(T.miss, 'bad');
        // Where it was: the picture asked opens with a yellow ring
        const item = round.ask[S.play.current];
        setTimeout(() => item.cells.forEach(c => { if (!S.play.found.includes(c)) { openTile(tileAt(b, c), item.sprite); tileAt(b, c).classList.add('answer'); } }), anim(350));
        setTimeout(() => resolve(false), anim(1500));
        return;
      }
      t.classList.add('ok'); t.disabled = true;
      SFX.tap(); vibrate(10);
      if (res === 'next') prompt();
      if (res === 'clear') { S.answer = null; for (const x of b.children) x.disabled = true; setTimeout(() => resolve(true), anim(250)); }
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
