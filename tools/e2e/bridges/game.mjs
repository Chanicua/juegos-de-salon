// 🚂 Tren en Vilo, out of the lab (D-456), end to end at its standalone page /bridges/: the waiting room
// in the house style (neon) with its demo bridge and the credit to Poly Bridge; Empezar goes to stage 1 of
// 5 with the deck already laid (it cannot be removed or cleared), the wood counter and its planks. A real
// drag lays a beam and spends wood; ↩ Undo takes it back. The catalog's bridge for each stage crosses: the
// summary opens with its wood, strain, time and points while the clock stands still, and goes on; after
// the five, the end stamp and the engine's score, then «Ver resultado» with the share card. A second game
// given up shows how its stage could be crossed. At 320 × 568, in the four languages, nothing scrolls
// sideways. Prints ✗ if anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';

const OUT = output('/tmp/bridges-game');
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };

let b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const text = sel => ev(`document.querySelector(${JSON.stringify(sel)})?.textContent || ''`);
const BOARD = `!!document.getElementById('btn-probar') && !document.getElementById('cuenta')`;
/** A grid point of the board, in page pixels (MARGEN is scene.js's 1.3 squares of cliff). */
const at = (x, y) => ev(`(()=>{const c=document.querySelector('.tv-juego .tv-lienzo'),r=c.getBoundingClientRect();return [Math.round(r.left+(${x}+1.3)*c._m.escala),Math.round(r.top+(c._v.arriba-(${y}))*c._m.escala)]})()`);

async function start(url) {
  await b.open(url, 2500);
  ok(await b.until(`document.getElementById('btn-empezar')`, 6000), `${url.replace(SITE, '')}: the waiting room has Empezar`);
  await ev(`document.getElementById('btn-empezar').click(); 1`);
  return b.until(BOARD, 9000);
}

try {
  // ——— The waiting room ———
  await b.open(`${SITE}/bridges/?test`, 2500);
  ok(await b.until(`document.getElementById('btn-empezar')`, 6000), 'the standalone page /bridges/ opens its waiting room');
  ok(await ev(`document.documentElement.classList.contains('tv-neon')`), 'in the house style (neon), not the pixel art');
  ok(await ev(`!!document.querySelector('.tv-demo canvas')`), 'with the demo bridge on the cover');
  ok(/Poly Bridge/.test(await text('#tv-credito')) && await ev(`!!document.querySelector('#tv-credito a[href*="Poly_Bridge"]')`), 'the credit to Poly Bridge, with its link');
  await b.shot('01-waiting-room');

  // ——— A whole game with a seed ———
  const SEED = 'TRENES';
  ok(await start(`${SITE}/bridges/?test&seed=${SEED}`), 'Empezar goes to the board');
  ok(await ev(`window.__trenCopa.etapas.length`) === 5, 'five crossings');
  ok(/1/.test(await text('#tv-etapa')) && /5/.test(await text('#tv-etapa')), `the title is the stage: «${await text('#tv-etapa')}»`);
  const deck = await ev(`window.__trenCopa.J.vigas.length`), width = await ev(`window.__trenCopa.etapas[0].ancho`);
  ok(deck === width, `the deck is laid: ${deck} beams over a gap of ${width}`);
  ok(await ev(`document.getElementById('btn-borrar').disabled && !document.getElementById('btn-probar').disabled`), 'Clear is off (only the deck) and Test is on');
  ok(await ev(`document.querySelectorAll('.tv-tablones span').length`) > 0, 'the wood left is shown as planks');
  const wood0 = await text('#tv-cuenta');

  // A tap on the deck says it stays
  const [mx, my] = await at(0.5, 0);
  await b.tap(mx, my); await sleep(200);
  ok(/vía no se quita/.test(await text('.tv-aviso')), 'a tap on the deck says the track stays');
  ok(await ev(`window.__trenCopa.J.vigas.length`) === deck, 'and does not remove it');

  // A real drag from the bank lays a beam
  const [x0, y0] = await at(0, 0), [x1, y1] = await at(1, -1);
  await b.drag(x0, y0, x1, y1); await sleep(300);
  ok(await ev(`window.__trenCopa.J.vigas.length`) === deck + 1, 'a drag from the bank lays a beam');
  ok(await text('#tv-cuenta') !== wood0, `and spends wood (${wood0} → ${await text('#tv-cuenta')})`);
  await b.shot('02-board');
  await ev(`document.getElementById('btn-deshacer').click(); 1`); await sleep(200);
  ok(await ev(`window.__trenCopa.J.vigas.length`) === deck, '↩ Undo takes it back');

  // Each stage with the catalog's bridge
  for (let k = 0; k < 5; k++) {
    await b.until(BOARD, 6000);
    await ev(`(()=>{const t=window.__trenCopa,e=t.etapas[t.J.etapa];t.J.vigas=e.solucion.map(([a,b])=>({a,b}));document.getElementById('btn-probar').click();return 1})()`);
    const summary = await b.until(`!!document.querySelector('.tv-felicitacion')`, 25000);
    ok(summary, `stage ${k + 1}: the train crosses and its summary opens`);
    if (!summary) break;
    if (k === 0) {
      const s = await text('.tv-felicitacion');
      ok(/Madera|Acero/.test(s) && /Esfuerzo/.test(s) && /Tiempo/.test(s) && /Puntos/.test(s), 'the summary has the wood, the strain, the time and the points');
      // past one 250 ms tick first: the last tick before the pause may still show the second before
      await sleep(400); const c0 = await text('#tv-reloj'); await sleep(2200);
      ok(await text('#tv-reloj') === c0, `the clock stands still while it is open (${c0})`);
      await b.shot('03-summary');
    }
    await ev(`document.getElementById('btn-seguir').click(); 1`);
  }
  ok(await b.until(`!!document.getElementById('tv-sello')`, 6000) && /Todos los puentes/.test(await text('#tv-sello')), 'after the five: «¡Todos los puentes en pie!»');
  const score = await text('#tv-puntaje');
  ok(/^\d+\/100$/.test(score) && parseInt(score) >= 50, `with the score: ${score}`);
  await ev(`document.getElementById('btn-fin').click(); 1`);
  ok(await b.until(`/✅ 1 ✅ 2 ✅ 3 ✅ 4 ✅ 5/.test(document.body.innerText)`, 6000), 'the result has the share card ✅ 1 … ✅ 5');
  await b.shot('04-result');

  // ——— Given up: how the stage could be crossed ———
  ok(await start(`${SITE}/bridges/?test&seed=RENDIDO`), 'another game starts');
  await ev(`document.getElementById('btn-rendirse').click(); 1`); await sleep(200);
  await ev(`document.getElementById('btn-rendirse').click(); 1`);
  ok(await b.until(`/Te rendiste/.test(document.getElementById('tv-sello')?.textContent || '')`, 4000), 'Give up (two taps) ends it');
  ok(await b.until(`!!document.querySelector('#tv-solucion canvas')`, 4000) && /etapa 1/.test(await text('#tv-solucion')), 'and shows how stage 1 could be crossed');
  await b.shot('05-solution');

  // ——— 320 px, four languages ———
  await b.close();
  b = await launch({ dir: `${OUT}/p320`, out: OUT, width: 320, height: 568 });
  for (const lang of ['es', 'en', 'pt']) {
    await b.open(`${SITE}/bridges/?test&lang=${lang}&seed=L${lang}`, 2500);
    await b.until(`document.getElementById('btn-empezar')`, 6000);
    ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), `${lang}: no sideways scroll in the waiting room`);
    await ev(`document.getElementById('btn-empezar').click(); 1`);
    ok(await b.until(BOARD, 9000), `${lang}: the board opens`);
    ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), `${lang}: no sideways scroll on the board`);
    await b.shot(`06-320-${lang}`);
  }
} catch (e) {
  ok(false, `the script failed: ${e.message}`);
} finally {
  await b.close();
  console.log(failures ? `✗ ${failures} failed` : '✓ Tren en Vilo end to end');
  process.exit(failures ? 1 : 0);
}
