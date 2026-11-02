// The home page drawn at once (D-435): the first visit saves a
// copy of the list, the next one draws it before any module arrives and the real cards take its place
// unchanged; a link with a filter never uses it; and once today's Uno al día is played, the card's place
// comes fresh from the month's table (the test store), over the stale one cached, and a copy
// saved before playing is not drawn. Prints ✗ if something fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/home-instant');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 320, height: 640 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const FOTO = 'juegos-de-salon:portada-foto';
const drawn = `!!document.querySelector('#filtros button') && !!document.querySelector('#btn-uno-al-dia:not(.reserva)')`;

// Whether the list had cards before the module drew its filters: only the copy can do that
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__before = null;
  new MutationObserver((_, o) => { if (document.querySelector('#filtros button')) { o.disconnect(); return; }
    if (window.__before === null && document.querySelector('#games .game-card.torneo')) window.__before = document.getElementById('games').classList.contains('foto'); })
  .observe(document, { subtree: true, childList: true });` });

// The first visit: drawn by the module, and the copy saved
// (the copy is removed only once the page that would save it is done, or it saves it again after)
await b.go(`${SITE}/?test`, 300);
await waitFor(`${drawn} && !!localStorage.getItem('${FOTO}')`);
// The page saves its copy from more than one late step (La Copa's card, Uno al día's place): remove it
// until it stays removed, or a save landing after the removal hands the next visit a copy
for (let i = 0; i < 10; i++) { await ev(`localStorage.removeItem('${FOTO}')`); await sleep(500); if (!await ev(`!!localStorage.getItem('${FOTO}')`)) break; }
await b.go(`${SITE}/?test`, 300);
ok(await waitFor(`${drawn} && !!localStorage.getItem('${FOTO}')`), 'the first visit saves a copy of the list');
ok(await ev(`!document.getElementById('games').classList.contains('foto') && window.__before !== true`), 'with no copy, the list is the module\'s');

// The second: the copy first, then the real cards, the same
await b.go(`${SITE}/?test`, 300);
ok(await waitFor(drawn), 'the second visit draws the list');
ok(await ev(`window.__before === true`), 'the copy was on screen before the module drew');
// La Copa's card is decorated after the list is drawn (flags copa-hoy, copa-contexto), and the copy is saved again then
ok(await waitFor(`JSON.parse(localStorage.getItem('${FOTO}')).html === document.getElementById('games').innerHTML`), 'the real cards are the same as the copy');
ok(await ev(`document.querySelectorAll('#games .game-card').length === document.querySelectorAll('#games .game-slot, #games > .game-card, #games .fila-alta > *').length && document.querySelectorAll('#btn-uno-al-dia').length === 1`), 'no card twice: the copy\'s went away');
ok(await ev(`getComputedStyle(document.querySelector('#games .game-card:not(.torneo)')).animationName === 'none'`), 'over the copy the real cards come in still');

// A filtered link never shows the copy (it would show the whole list for a moment)
await b.go(`${SITE}/?test&type=logic`, 300);
ok(await waitFor(drawn), 'a filtered link draws');
ok(await ev(`!document.getElementById('games').classList.contains('foto')`), 'a filtered link does not use the copy');

// The place, fresh: Ana is first, I am second; the cache still says #9 from days ago
const hoy = await ev(`(d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date())`);
const mes = `s${hoy.slice(0, 7)}`;
await ev(`(() => {
  localStorage.setItem('juegos-de-salon:jugador', JSON.stringify({ jid: 'yoyoyo12', n: 'Yo' }));
  localStorage.setItem('juegos-de-salon:uno-al-dia', JSON.stringify({ dias: { '${hoy}': { j: 'reinas', s: 70, ms: 60000, at: Date.now(), n: 1 } } }));
  localStorage.setItem('juegos-de-salon:prueba:records-db', JSON.stringify({ records: { 'uno-al-dia-pts': { '${mes}': {
    anaanaan: { s: 400, ms: 0, k: -400, n: 'Ana' }, yoyoyo12: { s: 300, ms: 0, k: -300, n: 'Yo' } } } } }));
  localStorage.setItem('uad-pts-cache', JSON.stringify({ p: '${mes}', s: 120, r: 9, d: '2000-01-01', h: true, l: '#9 del mes' }));
})()`);
await b.go(`${SITE}/?test`, 300);
// The copy was saved before today was played: its ▶ Jugar hoy is never shown once it is
ok(await ev(`window.__before !== true`), 'a copy drawn before today was played is not used after');
ok(await waitFor(`/#2/.test(document.getElementById('btn-uad-chip')?.textContent || '')`), 'the card\'s chip changes to the fresh place, #2');
const cache = await ev(`JSON.parse(localStorage.getItem('uad-pts-cache'))`);
ok(cache?.r === 2 && cache.s === 300 && cache.d === hoy && /Ana/.test(cache.l || ''), `the cache /today/ reads has the fresh place and who is ahead (${JSON.stringify(cache)})`);
ok(await waitFor(`/#2/.test(JSON.parse(localStorage.getItem('${FOTO}') || '{}').html || '')`), 'the next visit\'s copy carries the fresh place');
ok(await ev(`document.documentElement.scrollWidth <= 320`), 'no sideways scroll at 320 px');

if (b.errors.length) ok(false, `no errors in the page: ${b.errors.join(' | ')}`);
console.log(failures ? `✗ ${failures} failure(s)` : '✓ all good');
process.exit(failures ? 1 : 0);
