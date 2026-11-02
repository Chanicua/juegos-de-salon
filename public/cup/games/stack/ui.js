/**
 * 🗼 Babel — its screen in La Copa, Uno al día and on its standalone page, moved from the lab
 * (labs/stack/game.js, D-445) as Tren en Vilo was (D-456): a block slides over the tower, a tap drops
 * it, and whatever hangs over the edge is cut off. The engine is engine.js; the drawing, scene.js.
 *
 * What the lab had in play comes along: a drop is judged at the tap's own timestamp, not at the next
 * frame (`momento`); the cut piece falls; a perfect drop glows, counts its streak and, from the 4th in a
 * row, grows the block back (with a little confetti); each block slides a little faster. The page
 * hidden or losing focus pauses the game: the slab freezes, the first tap back only resumes, and the
 * drawing loop sleeps while paused. Reduced motion: no sparks, no confetti, no swaying.
 *
 * What the cup page now provides stays out: the lab's cover, its comment form, the local best, the
 * usage signal and the share button. The credit to the original is `ejemplo`, in the waiting room. The cup's game.js does the result, rankings, sharing and
 * telemetry.
 *
 * A real-time game cannot be resumed: after each block the state is saved with `ctx.guardar`, and a
 * page reloaded mid-game ends that game with the blocks it had (no retry by reloading). A finished
 * game in `ctx.jugadas` shows finished. The state is engine.js's
 * `{ fin, n, perfects, best, kinds, ms, tope, slabs }` (`slabs` only to draw the tower again).
 *
 * The trial (`p.tope`, engine.js BLOQUES_ENSAYO) ends on its own after that many blocks.
 */
import { newGame, perfectTime, pause, score, puntaje, puntos, tarjeta, drop, speed } from './engine.js';
import { escena, soltar, momento } from './scene.js';
import { confetti } from '../../../assets/js/ui.js';
import { onScreen } from '../../../assets/js/on-screen.js';
import { loadCss } from '../../../assets/js/load-css.js';
import { getLang } from '../../../assets/js/i18n.js';
import TEXTOS from './texts.js';
import { labAccess } from '../../../assets/js/lab-access.js';
import { flag } from '../../../assets/js/flags.js';
import { musicOn, setMusicOn, start as musicStart, fadeOutLater, playing, lastTrack } from '../../../assets/js/music.js';

/** Background music, behind Babel's own flag `stack` (it launches with the game): one of four tracks at random each game. */
const TRACKS = [1, 2, 3, 4].map(n => new URL(`../../../assets/music/babel/track-${n}.mp3`, import.meta.url).href);
/** Each track's credit on the end screen, with its Pixabay page (track-n.mp3 is CREDITS[n - 1]). */
const CREDITS = [
  { name: 'Retro Game', by: 'The Mountain', url: 'https://pixabay.com/music/video-games-retro-game-593063/' },
  { name: 'Retro Game', by: 'Bransboynd', url: 'https://pixabay.com/music/video-games-retro-game-402454/' },
  { name: 'Game Gaming Music', by: 'Hitslab', url: 'https://pixabay.com/music/video-games-game-gaming-music-295075/' },
  { name: 'Game Music', by: 'DeepMusicEveryDay', url: 'https://pixabay.com/music/video-games-game-music-7408/' },
];
/** «Música: Retro Game, de The Mountain» linked to Pixabay, for the track this game played; null with no music. */
function creditoMusica(el, T) {
  const i = TRACKS.indexOf(lastTrack()), c = CREDITS[i];
  if (!c) return null;
  const [antes, despues] = String(T.skMusicCredit).split('{tema}');
  return el('p', { class: 'sk-musica-credito muted', id: 'sk-musica-credito' }, antes,
    el('a', { href: c.url, target: '_blank', rel: 'noopener' }, String(T.skMusicBy).replace('{name}', c.name).replace('{by}', c.by)), despues || '');
}
const musica = () => flag('stack').then(si => { if (si && !playing()) musicStart(TRACKS); }).catch(() => {});
// It starts with the countdown: «Empezar» (or «Simular final») on Babel's cover
globalThis.document?.addEventListener('click', ev => {
  if (ev.target?.closest?.('#btn-empezar') && document.querySelector('.sk-cabeza')) musica();
}, true);

// Its own stylesheet, loaded with its code and before its first screen (D-468)
await loadCss(new URL('./style.css', import.meta.url));

const QUIETO = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const fmtLocal = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
/** [none, one, many] */
const forma = n => (n === 0 ? 0 : n === 1 ? 1 : 2);
/** How long the end lingers on the tower (the last piece falling) before «See results» shows. */
const FIN_MS = 1400;
/** The original this game is inspired by, credited on the waiting room (the owner's request, for transparency). */
const ORIGINAL = 'https://www.ketchappgames.com/';
/** A slab, rounded to save it small. */
const redondo = s => ({ x: +s.x.toFixed(4), z: +s.z.toFixed(4), w: +s.w.toFixed(4), d: +s.d.toFixed(4) });

/** `portada` gets no `el`: a small one of its own. */
function h(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (k === 'class') n.className = v; else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  for (const x of hijos.flat()) if (x !== null && x !== undefined && x !== false) n.append(x instanceof Node ? x : String(x));
  return n;
}

/* ------------------------------------------------------------------ */
/* Waiting room                                                       */
/* ------------------------------------------------------------------ */

/**
 * The cover (the lab's `demo`): the tower builds itself, mostly perfect drops, a cut now and then, and
 * starts over. Still, and already built, with reduced motion. The loop sleeps off screen (onScreen).
 */
let demoVez = 0;
export function portada() {
  const lienzo = h('canvas', { class: 'sk-demo', 'aria-hidden': 'true' });
  const raiz = h('div', { class: 'sk-portada', 'aria-hidden': 'true' }, lienzo);
  const vez = ++demoVez;
  const sc = escena(lienzo, { zoom: 0.8 });
  let g = newGame(performance.now()), proxima = 0, k = 0, visto = false;
  const desde = performance.now();
  if (QUIETO()) {
    let t = 0;
    for (let i = 0; i < 10; i++) { t = perfectTime(g, t); soltar(g, { brillar() {}, caer() {} }, t + (i % 3 === 2 ? 40 : 0)); }
    g.moving = null;
    // Drawn once it is on the page and measured
    const una = () => { if (!lienzo.isConnected) return requestAnimationFrame(una); requestAnimationFrame(now => { sc.draw(g, now); sc.cerrar(); }); };
    requestAnimationFrame(una);
    return raiz;
  }
  const paso = now => {
    // It stops when another cover replaces it, when it leaves the page, or if it never arrived
    if (lienzo.isConnected) visto = true;
    if (vez !== demoVez || (!lienzo.isConnected && (visto || now - desde > 5000))) return sc.cerrar();
    if (!proxima) proxima = perfectTime(g, now) + (k % 4 === 3 ? 60 : 0);
    if (now >= proxima) {
      soltar(g, sc, proxima); k++; proxima = 0;
      if (score(g) >= 14 || Math.min(g.slabs.at(-1).w, g.slabs.at(-1).d) < 0.45) { g = newGame(now + 600); k = 0; }
    }
    sc.draw(g, now);
    otro();
  };
  const otro = onScreen(lienzo, paso);
  otro();
  return raiz;
}

/** The name in the waiting room, as in the lab: the 🗼 that sways and the moving colors. */
const UI = () => { let l = 'es'; try { l = getLang(); } catch (_) { /* outside the browser */ } return (TEXTOS[l] || TEXTOS.es).ui; };
/** The name in the waiting room, with the credit to the original right under it, as Loteo does (the owner's call). */
export function titulo({ el, J }) {
  const [antes, despues] = String(UI().skCredit).split('{juego}');
  const cabeza = el('div', { class: 'sk-cabeza' },
    el('h2', { class: 'sk-titulo' },
      el('span', { class: 'sk-logo', 'aria-hidden': 'true' }, '🗼'),
      el('span', { class: 'display display--lg rainbow' }, J.nombre)),
    el('p', { class: 'sk-credito', id: 'sk-credito' }, antes, el('a', { href: ORIGINAL, target: '_blank', rel: 'noopener', id: 'link-stack' }, 'Stack'), despues || ''));
  // The background music's switch (with Babel, flag stack), remembered on this phone
  flag('stack').then(si => {
    if (!si || !cabeza.isConnected) return;
    const boton = el('button', { type: 'button', class: 'btn btn--ghost btn--sm sk-musica', id: 'btn-musica', 'aria-pressed': String(musicOn()) });
    // In words, «Música: sí / no»: an icon alone looked like the sound effects' 🔊 (the owner's call)
    const pintar = () => { const on = musicOn(); boton.textContent = on ? UI().skMusicOn : UI().skMusicOff; boton.classList.toggle('apagada', !on); boton.setAttribute('aria-pressed', String(on)); };
    boton.addEventListener('click', () => { setMusicOn(!musicOn()); pintar(); });
    pintar();
    // Above the title, as a header: the language toggle on the left, the music switch on its right
    const hero = cabeza.closest('.intro-hero'), idioma = hero && [...hero.children].find(n => n !== cabeza && n.querySelector?.('.lang-toggle'));
    const fila = el('div', { class: 'sk-cabecera', id: 'sk-cabecera' });
    if (idioma) fila.append(...idioma.childNodes);
    fila.append(boton);
    if (hero) { idioma?.remove(); hero.prepend(fila); } else cabeza.append(fila);
  }).catch(() => {});
  // Only for a lab key, on Babel's own page: the owner's way to see a game's last blocks and its end
  // without playing (it never reaches a ranking: «See results» comes back here). lab: #seccion-stack
  if (document.body?.dataset.suelto === 'stack') labAccess().then(ok => {
    if (!ok || !cabeza.isConnected) return;
    const pisos = el('input', { type: 'number', min: 4, max: 200, value: 51, class: 'sk-sim-n', id: 'sk-sim-n', 'aria-label': 'Pisos' });
    // A folded tab on the screen's left edge, over no control, so the cover looks as players see it (the owner's call)
    document.getElementById('sk-lab')?.remove();
    // The same control goes in the tester ribbon (launched, no longer behind a flag), not in a tab
    Promise.resolve().then(() => {
      if (!cabeza.isConnected) return;
      return import('../../../assets/js/tester-ribbon.js').then(({ testerRibbon, setTesterContext, foldTesterRibbon }) => {
        document.getElementById('sk-lab')?.remove();
        testerRibbon({ lang: document.documentElement.lang || 'es', labsUrl: new URL('../../../labs/', import.meta.url).href });
        const n = el('input', { type: 'number', min: 4, max: 200, value: 51, id: 'tr-sim-n', 'aria-label': 'Pisos' });
        setTesterContext(el('div', { class: 'tr-sim' }, el('small', {}, '🗼 Simular final'),
          el('div', { class: 'tr-fila' }, n, el('button', { type: 'button', class: 'btn btn--cyan btn--sm', id: 'tr-simular', onClick: () => {
            simulacion = Math.max(4, Math.min(200, Math.round(Number(n.value) || 51)));
            foldTesterRibbon(); setTesterContext(null);
            document.getElementById('btn-empezar')?.click();
          } }, 'Simular'))));
        const fuera = new MutationObserver(() => { if (!cabeza.isConnected) { setTesterContext(null); fuera.disconnect(); } });
        fuera.observe(document.body, { childList: true, subtree: true });
      });
    }).catch(() => {});
    const tab = el('details', { class: 'sk-lab', id: 'sk-lab' },
      el('summary', { 'aria-label': 'Laboratorio' }, '🧪'),
      el('div', { class: 'sk-sim', id: 'sk-sim' }, pisos,
        el('button', { type: 'button', class: 'btn btn--cyan btn--sm', id: 'btn-simular', onClick: () => {
          simulacion = Math.max(4, Math.min(200, Math.round(Number(pisos.value) || 51)));
          tab.remove();
          document.getElementById('btn-empezar')?.click();
        } }, '🧪 Simular final')));
    document.body.append(tab);
    // Gone as soon as the cover is: a game, the result or another screen
    const fuera = new MutationObserver(() => { if (!cabeza.isConnected) { tab.remove(); fuera.disconnect(); } });
    fuera.observe(document.body, { childList: true, subtree: true });
  }).catch(() => {});
  return cabeza;
}
/** The simulated end's tower height, set by «Simular final» and taken by the next game (0: a real game). */
let simulacion = 0;
/** Whether the next game is a simulated one: the cup sends no usage signal for it. */
export const simulando = () => simulacion > 0;

/* ------------------------------------------------------------------ */
/* The game                                                           */
/* ------------------------------------------------------------------ */

let partidas = 0;   // the game on screen; a new one stops the old one's loop

export function montar(raiz, ctx) {
  musica();   // a La Copa day has no cover: the music starts with the tower
  const { p = {}, T, el, SFX, vibrate } = ctx;
  const fmt = ctx.fmt || fmtLocal;
  const tope = p.tope || null;
  const previa = ctx.jugadas && typeof ctx.jugadas === 'object' && !Array.isArray(ctx.jugadas) && Number.isFinite(ctx.jugadas.n) ? ctx.jugadas : null;
  const vez = ++partidas;
  const sim = simulacion; simulacion = 0;
  const S = { g: newGame(performance.now() + 400), kinds: [], fin: false, pausa: 0, pausado: 0, inicio: performance.now(), finEn: 0, dormido: false, ms: 0 };

  const lienzo = el('canvas', { class: 'sk-lienzo', 'aria-hidden': 'true' });
  const marcador = el('div', { class: 'sk-marcador', id: 'sk-marcador', 'aria-live': 'polite' }, '0');
  const aviso = el('div', { class: 'sk-aviso', id: 'sk-aviso' }, T.skTap);
  const cartel = el('div', { class: 'sk-pausa', id: 'sk-pausa', 'aria-live': 'polite', hidden: true },
    // The emoji outside the rainbow: a gradient clipped to text paints an emoji as a colored square
    el('span', { class: 'sk-titulo-pausa' }, el('span', { 'aria-hidden': 'true' }, '⏸️'), el('span', { class: 'display rainbow' }, T.skPaused)), el('span', {}, T.skResume));
  const escenario = el('div', { class: 'sk-escenario', id: 'sk-escenario', role: 'button', tabindex: 0, 'aria-label': T.skTap }, lienzo, marcador, aviso, cartel);
  const fin = el('div', { class: 'sk-fin', id: 'sk-fin' });
  const juego = el('div', { class: 'sk-juego' }, escenario, fin);
  raiz.append(juego);
  const sc = escena(lienzo);

  /** The game as it is saved and handed to the cup. */
  const estado = () => ({
    fin: S.fin, n: score(S.g), perfects: S.g.perfects, best: S.g.best, kinds: S.kinds.slice(), tope,
    ms: S.fin ? S.ms : Math.round(performance.now() - S.inicio - S.pausado), slabs: S.g.slabs.map(redondo),
  });

  // Drops the block at moment `t`; a tap passes its own timestamp
  const caer = t => {
    if (S.fin || S.pausa || vez !== partidas) return;
    const r = soltar(S.g, sc, t);
    if (!r) return;
    aviso.classList.add('fuera');
    if (r.kind === 'miss') return acabar('miss');
    S.kinds.push(r.kind);
    const n = score(S.g);
    marcador.textContent = String(n);
    if (r.kind === 'perfect') {
      SFX.reveal(); vibrate(12);
      aviso.replaceChildren(el('span', { class: 'rainbow' }, S.g.combo > 1 ? fmt(T.skStreak, { n: S.g.combo }) : T.skPerfect));
      aviso.classList.remove('fuera', 'brilla'); void aviso.offsetWidth; aviso.classList.add('brilla');
      // A streak that grows the block back: a little confetti
      if (r.grew && !QUIETO()) confetti({ count: 40, duration: 900 });
    } else { SFX.tap(); vibrate(8); }
    if (tope && n >= tope) return acabar('tope');
    // Saved after each block: a reload ends the game here, it does not start it over (a simulation is never saved)
    if (!sim) ctx.guardar?.(estado());
  };

  // Paused when the page is hidden or loses focus (a call, another app, the screen locked): the slab
  // freezes where it was, and the first tap back only takes the pause off, it never drops (D-445)
  const fuera = new AbortController();
  const pausar = () => {
    if (!lienzo.isConnected) { fuera.abort(); return; }
    if (S.fin || S.pausa || vez !== partidas) return;
    S.pausa = performance.now();
    cartel.hidden = false;
  };
  const reanudar = () => {
    if (!S.pausa) return;
    despertar();
    const ms = performance.now() - S.pausa;
    pause(S.g, ms);
    S.pausado += ms;
    S.pausa = 0;
    cartel.hidden = true;
    SFX.tap();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); }, { signal: fuera.signal });
  addEventListener('blur', pausar, { signal: fuera.signal });
  addEventListener('pagehide', pausar, { signal: fuera.signal });

  const tocar = ev => { ev.preventDefault(); if (S.fin || sim) return; if (S.pausa) return reanudar(); caer(momento(ev)); };
  escenario.addEventListener('pointerdown', ev => { if (ev.button > 0) return; tocar(ev); }, { signal: fuera.signal });
  escenario.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { if (!ev.repeat) tocar(ev); else ev.preventDefault(); } }, { signal: fuera.signal });

  /**
   * The end: missed the tower, the trial's cap reached, or a game left halfway (`recien` false: a
   * reload, or one already finished). The cup's clock stops right here (D-130) and, with the final
   * state, the result goes out now (D-150).
   */
  function acabar(motivo, { recien = true } = {}) {
    if (S.fin) return;
    S.ms = Math.round(performance.now() - S.inicio - S.pausado - (S.pausa ? performance.now() - S.pausa : 0));
    S.fin = true; S.finEn = performance.now(); S.pausa = 0; cartel.hidden = true;
    S.g.over = true; S.g.moving = null;
    fuera.abort();
    despertar();
    const e = estado();
    if (!sim) ctx.guardar?.(e);
    ctx.pararReloj?.(e);
    fadeOutLater();   // the music fades out 7 s after the end
    const listo = motivo === 'tope';
    if (recien) {
      if (listo) { SFX.win?.(); vibrate([30, 50, 30]); if (!QUIETO()) confetti({ count: 120, duration: 1600 }); }
      else { SFX.error(); vibrate([40, 30, 60]); }
    }
    aviso.replaceChildren(el('span', { class: 'rainbow' }, listo ? T.skTrialDone : T.skOver));
    aviso.classList.remove('fuera', 'brilla'); aviso.classList.add('final');
    const mostrar = () => {
      if (vez !== partidas || !raiz.isConnected) return;
      // Where the top of the tower is on screen as the game ends: the tour starts right there
      // (held in pixels before the screen grows, so the resize cannot move or rescale it)
      const antes = sc.altura();
      sc.deslizar(antes, antes, 0);
      juego.classList.add('terminado');
      const n = e.n;
      const boton = el('button', { type: 'button', class: 'btn btn--yellow', id: 'btn-fin', onClick: () => { SFX.tap(); if (sim) location.reload(); else ctx.terminar(estado()); } }, ctx.textoFin || T.skContinue);
      // The end's tour: the tower takes the whole screen and the camera goes down it turning a full
      // circle, a cut every ten floors, and back up; «51 floors» up top, the tower under a blurred strip
      // with «Continue». Its top glides from where the game left it to just under «Game over», so the
      // tower fills the screen
      juego.classList.add('gira');
      marcador.replaceChildren(String(n), ' ', el('span', { class: 'sk-pisos' }, T.skFloors[forma(n)]));
      fin.replaceChildren(boton);
      // The music's credit goes under the blurred strip, not in it: inside, it stretched the strip down to a hard edge
      document.getElementById('sk-musica-credito')?.remove();
      const credito = creditoMusica(el, T);
      if (credito) fin.after(credito);
      requestAnimationFrame(() => {
        const r = lienzo.getBoundingClientRect(), a = aviso.getBoundingClientRect().bottom, b = boton.getBoundingClientRect().top;
        // First the top glides up while the cuts fade in, then the camera starts down
        if (r.height) sc.deslizar(antes, Math.min(r.height * 0.6, a - r.top + Math.max(70, (b - a) * 0.2)), QUIETO() ? 0 : 1000);
        if (!QUIETO()) sc.recorrer(n, performance.now(), 1000);
        despertar();
      });
    };
    if (recien) setTimeout(mostrar, QUIETO() ? 400 : FIN_MS); else mostrar();
  }

  const paso = now => {
    if (vez !== partidas || !lienzo.isConnected) { fuera.abort(); return sc.cerrar(); }
    sc.draw(S.g, now, S.pausa || now);
    // Paused for a second (effects done), or finished and the last piece fallen: the loop sleeps until
    // the tap back, so a game left on the table does not burn battery (#892)
    if ((S.pausa && now - S.pausa > 1000) || (S.fin && now - S.finEn > 3000 && !sc.recorriendo(now))) { S.dormido = true; return; }
    requestAnimationFrame(paso);
  };
  function despertar() { if (S.dormido) { S.dormido = false; requestAnimationFrame(paso); } }

  // A game already played on this phone: finished, it shows finished; halfway, it ends where it was
  if (previa) {
    S.kinds = Array.isArray(previa.kinds) ? previa.kinds.slice() : [];
    S.g.perfects = previa.perfects | 0; S.g.best = previa.best | 0;
    if (Array.isArray(previa.slabs) && previa.slabs.length) S.g.slabs = previa.slabs.map(s => ({ ...s }));
    else for (let i = 0; i < previa.n; i++) S.g.slabs.push({ ...S.g.slabs[0] });
    S.inicio = performance.now() - (previa.ms || 0);
    marcador.textContent = String(score(S.g));
    acabar(previa.fin ? (tope && previa.n >= tope ? 'tope' : 'miss') : 'miss', { recien: false });
    S.ms = previa.ms || 0;
  } else if (sim) simular(sim);
  else escenario.focus({ preventScroll: true });
  requestAnimationFrame(paso);

  /**
   * «Simular final» (lab key only): the tower is built at once to `n` − 3 floors (mostly perfect, a
   * small cut now and then), then three blocks drop on their own, perfect, and the fourth misses, as
   * a player who reaches `n` and loses would see it. Taps do nothing meanwhile.
   */
  function simular(n) {
    let t = 0;
    for (let i = 0; i < n - 3; i++) { t = perfectTime(S.g, t) + (i % 6 === 5 ? 12 : 0); const r = drop(S.g, t); if (r) S.kinds.push(r.kind); }
    S.g.moving.t0 = performance.now() + 500;
    marcador.textContent = String(score(S.g));
    aviso.classList.add('fuera');
    let k = 0;
    const otro = () => {
      if (vez !== partidas || S.fin) return;
      const m = S.g.moving;
      // Three perfect drops, then one that leaves the tower: dropped at its start, far off to the side
      const at = k < 3 ? perfectTime(S.g, performance.now() + 250) : m.t0 + (0.4 / speed(m.level)) * 1000;
      setTimeout(() => { caer(at); k++; otro(); }, Math.max(0, at - performance.now()));
    };
    otro();
  }

  // For the end-to-end script: `soltarEn(t)` drops at moment t, as a tap then would; `pausar()` pauses,
  // as a hidden page does; `perfecto()` is the next moment the block is exactly over the tower
  globalThis.__stack = { S, soltarEn: caer, pausar, perfecto: () => perfectTime(S.g, performance.now()), estado };
}

/** What goes to the cup and to the result: the points (floors and streak bonuses, no cap), its card, and the playing time without pauses. */
export function resultado(e) {
  const s = puntaje(e);
  return { s, t: tarjeta(e), resumen: String(s), ms: Number.isFinite(e?.ms) ? Math.round(e.ms) : undefined };
}

/** How the score was reached (D-106): the floors, the streak bonuses, and the longest streak. */
export function desglose(e, { T, fmt = fmtLocal }) {
  if (!e) return [];
  const p = Array.isArray(e.kinds) && e.kinds.length ? puntos(e.kinds) : { floors: Math.max(0, e.n | 0), streaks: 0, streakBonus: 0, lengthBonus: 0 };
  const best = Math.max(0, e.best | 0);
  return [
    fmt(T.skBdBlocks[forma(p.floors)], { n: p.floors }),
    p.streaks ? fmt(T.skBdStreaks[forma(p.streaks)], { n: p.streaks, p: p.streakBonus }) : null,
    p.lengthBonus ? fmt(T.skBdLength, { p: p.lengthBonus }) : null,
    best > 1 ? fmt(T.skBdStreak, { n: best }) : null,
  ].filter(Boolean);
}
