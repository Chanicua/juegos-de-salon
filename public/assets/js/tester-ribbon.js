/**
 * The tester ribbon (lab flag `tester-ribbon`): for lab key holders, a folded tab with a «T» on the
 * screen's right edge, just under the top bar, over the page and never pushing it. Opened, it gives
 * what the key gives: (i) the tester sheet, a link to Labs, and the control the current screen
 * registers with `setTesterContext` (Babel's «Simular final»). It replaces the home page's «tester»
 * chip and Babel's 🧪 tab on the left edge. On every screen (tester-boot.js), hidden while playing. Texts in the three languages (C-3). lab: #seccion-tester-ribbon
 */
import { el } from './ui.js';
import { openTesterSheet } from './tester-badge.js';

const T = {
  es: { tab: 'Tester', info: 'Qué es ser tester', labs: 'Ir a Labs' },
  en: { tab: 'Tester', info: 'What being a tester means', labs: 'Go to Labs' },
  pt: { tab: 'Tester', info: 'O que é ser tester', labs: 'Ir para o Labs' },
};
export const RIBBON_TEXTS = T;

const CSS = `
.tr { position: fixed; right: 0; z-index: 40; display: flex; align-items: flex-start; top: max(calc(14px + var(--safe-top)), var(--tr-top, calc(70px + var(--safe-top)))); transition: top 0.35s cubic-bezier(0.22, 1, 0.36, 1); font-family: var(--font-body); color: var(--ink); }
.tr-tab { position: relative; overflow: hidden; flex: none; width: 38px; height: 46px; border: 0; padding: 0; cursor: pointer;
  border-radius: 14px 0 0 14px; color: var(--bg1); font: 400 1.75rem/1 var(--font-display);
  text-shadow: 0 0 1px #fff, 0 0 6px rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.8);
  background: linear-gradient(135deg, var(--pink), var(--purple), var(--cyan), var(--lime), var(--yellow), var(--pink));
  background-size: 400% 400%; animation: tr-iri 6s ease-in-out infinite;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.35) inset, 0 6px 18px rgba(138,77,255,0.45); }
.tr-tab::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.75) 48%, transparent 62%);
  background-size: 260% 100%; animation: tr-brillo 3.2s ease-in-out infinite; }
.tr-tab-wrap { position: relative; flex: none; }
.tr-punto { position: absolute; top: -4px; left: -4px; z-index: 1; width: 13px; height: 13px; border-radius: 999px; background: var(--red); border: 2px solid var(--bg1); box-shadow: 0 0 8px rgba(224,36,60,0.8); pointer-events: none; }
/* Hidden while a game is played (back-guard.js marks it), unless the screen has a test control */
html[data-en-juego] .tr:not(.con-ctx), body.jugando .tr:not(.con-ctx) { display: none; }
.tr:not(.con-ctx) .tr-punto, .tr:not(.con-ctx) .tr-ctx { display: none; }
.tr-tab:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }
@keyframes tr-iri { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes tr-brillo { 0%, 55% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
@media (prefers-reduced-motion: reduce) { .tr-tab, .tr-tab::after { animation: none; } .tr-tab { background-position: 30% 50%; } }
.tr-panel { display: flex; flex-direction: column; gap: 10px; width: min(236px, calc(100vw - 60px)); padding: 12px 14px;
  background: rgba(21,7,38,0.94); border: 1px solid var(--glass-border); border-right: 0; border-radius: 0 0 0 14px;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.45); }
.tr:not(.abierto) .tr-panel { display: none; }
.tr-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tr-cab b { font: 400 1.25rem/1 var(--font-display); letter-spacing: 0.05em; color: var(--yellow); }
.tr-info { flex: none; width: 32px; height: 32px; border-radius: 999px; border: 1px solid var(--glass-border); background: var(--glass); color: var(--ink); font: 900 0.95rem/1 var(--font-body); cursor: pointer; }
.tr-labs { color: var(--cyan); font-weight: 900; text-decoration: none; display: flex; justify-content: space-between; min-height: 32px; align-items: center; }
.tr-ctx { border-top: 1px solid var(--glass-border); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.tr-sim { display: flex; flex-direction: column; gap: 8px; }
.tr-ctx small { color: var(--muted); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.68rem; }
.tr-fila { display: flex; gap: 8px; align-items: center; }
.tr-fila input { width: 4.2em; padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); color: inherit; font: 800 1rem var(--font-num); text-align: center; }
.tr-fila .btn { flex: 1; }
@media (prefers-reduced-motion: reduce) { .tr { transition: none; } }
`;

let ribbon = null, ctx = null, t = T.es;

function place() {
  if (!ribbon) return;
  const bar = document.querySelector('.topbar');
  // 22 px under the bar's buttons on every screen: closer, the tab reads as glued to them
  const top = bar && bar.getBoundingClientRect().height ? bar.getBoundingClientRect().bottom + 22 : null;
  // As the page scrolls the bar leaves and the tab climbs to the screen's top edge (the CSS max()),
  // gliding there with the transition instead of jumping
  ribbon.style.setProperty('--tr-top', top == null ? 'calc(14px + var(--safe-top))' : `${Math.max(8, top)}px`);
}

let queued = false;
const placeSoon = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; place(); }); };

function drawContext() {
  if (!ribbon) return;
  const box = ribbon.querySelector('.tr-ctx');
  box.replaceChildren(...(ctx ? [ctx] : []));
  // The red dot on the folded tab: this screen has something to try. Without it, only (i) and Labs
  ribbon.classList.toggle('con-ctx', !!ctx);
}

/** Shows the ribbon (once). The caller has already checked the key and the flag. */
export function testerRibbon({ lang = 'es', labsUrl = new URL('../../labs/', import.meta.url).href } = {}) {
  if (ribbon?.isConnected) return ribbon;
  t = T[lang] || T.es;
  if (!document.getElementById('tr-css')) document.head.append(el('style', { id: 'tr-css' }, CSS));
  const tab = el('button', { type: 'button', class: 'tr-tab', id: 'tr-tab', 'aria-expanded': 'false', 'aria-controls': 'tr-panel', 'aria-label': t.tab }, 'T');
  const panel = el('div', { class: 'tr-panel', id: 'tr-panel' },
    el('div', { class: 'tr-cab' }, el('b', {}, '🧪 Tester'),
      el('button', { type: 'button', class: 'tr-info', id: 'tr-info', 'aria-label': t.info, onClick: () => openTesterSheet(lang, labsUrl) }, 'i')),
    el('a', { class: 'tr-labs', id: 'tr-labs', href: labsUrl }, t.labs, el('span', { 'aria-hidden': 'true' }, '›')),
    el('div', { class: 'tr-ctx', id: 'tr-ctx' }));
  ribbon = el('div', { class: 'tr', id: 'tester-ribbon' }, el('div', { class: 'tr-tab-wrap' }, tab, el('span', { class: 'tr-punto', 'aria-hidden': 'true' })), panel);
  const toggle = open => { ribbon.classList.toggle('abierto', open); tab.setAttribute('aria-expanded', String(open)); };
  tab.addEventListener('click', () => toggle(!ribbon.classList.contains('abierto')));
  // Folds again on a tap outside it or Escape: it acts over the page, it never stays in the way
  document.addEventListener('pointerdown', e => { if (!ribbon.contains(e.target)) toggle(false); }, true);
  ribbon.addEventListener('keydown', e => { if (e.key === 'Escape') { toggle(false); tab.focus(); } });
  document.body.append(ribbon);
  drawContext(); place();
  addEventListener('resize', placeSoon);
  addEventListener('scroll', placeSoon, { passive: true });
  document.fonts?.ready.then(place);
  return ribbon;
}

/** The current screen's control (a node), or null when it has none. Folds the ribbon when it changes. */
export function setTesterContext(node) {
  ctx = node || null;
  ribbon?.classList.remove('abierto');
  drawContext();
}

/** Folds the ribbon (after a context action that leaves the screen). */
export const foldTesterRibbon = () => { ribbon?.classList.remove('abierto'); ribbon?.querySelector('.tr-tab')?.setAttribute('aria-expanded', 'false'); };
