// Compuertas in the lab, end to end, at /labs/gates/: the lab offers it under Juegos en prueba; the
// cover plays by itself and says today's game is the same for everyone; Empezar goes through the 3, 2, 1
// countdown to the board with the score at 0, the minute and the hint; a real tap on a paddle flips it
// and takes the hint off; losing focus pauses the clock and a tap takes the pause off; a player that
// never misses (the engine's autoplay) scores the best possible, and the result has the score out of the
// best, the tally, share, another game, today's and the comment after a line. At 375 px. Prints ✗ if
// anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/gates-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const SEED = 'e2e1';
const { newGame, best, ROWS } = await import('../../../public/labs/gates/engine.js');
const P = 'window.__compuertas';

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#activos #seccion-compuertas #btn-compuertas')?.getAttribute('href')`) === 'gates/', 'the lab offers Compuertas under Juegos en prueba');

await b.go(`${SITE}/labs/gates/?test`, 1200);
ok(await waitFor(`!!document.getElementById('btn-empezar')`), 'the cover has Empezar');
ok(/misma para todos/.test(await ev(`document.body.textContent`)), 'without a seed it is today\'s game');
ok(await ev(`document.querySelectorAll('.pasos li').length`) === 3, 'three steps');
await ev(`window.__shot = document.querySelector('.demo-co').toDataURL(); 1`);
await sleep(1500);
ok(await ev(`document.querySelector('.demo-co').toDataURL() !== window.__shot`), 'the cover\'s board plays by itself');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll on the cover');
await b.shot('01-cover');

await b.go(`${SITE}/labs/gates/?seed=${SEED}&test`, 1200);
await waitFor(`!!document.getElementById('btn-empezar')`);
ok(!/misma para todos/.test(await ev(`document.body.textContent`)), 'with a seed it does not say it is today\'s');
await ev(`document.getElementById('btn-empezar').click(); 1`);
ok(await waitFor(`/3|2|1/.test(document.querySelector('#cuenta .cuenta-num')?.textContent || '')`, 2000), 'Empezar opens the 3, 2, 1 countdown');
ok(await waitFor(`!!document.getElementById('tablero') && !document.getElementById('cuenta')`, 8000), 'and then the board');
ok(await ev(`document.getElementById('puntos').textContent`) === '0' && /^(60|59)s$/.test(await ev(`document.getElementById('reloj').textContent`)), 'the score at 0 and a minute on the clock');
ok(/Toca una manilla/.test(await ev(`document.getElementById('aviso').textContent`)), 'and the hint: tap a paddle');
ok(JSON.stringify(await ev(`${P}.S.g.periods`)) === JSON.stringify(newGame(SEED).periods), 'the bins are the engine\'s for that seed');

// A real tap on the top paddle flips it: it sits under the funnel, a row and a bit below the canvas's top
const gate = `${P}.S.g.gates[0][0]`;
const before = await ev(gate);
const r = await ev(`document.getElementById('tablero').getBoundingClientRect().toJSON()`);
let tapped = false;
for (let y = r.y + 20; y < r.y + r.height * 0.45 && !tapped; y += 8) {
  await b.tap(r.x + r.width / 2, y);
  await sleep(30);
  tapped = await ev(`${P}.S.g.flips`) > 0;
}
ok(tapped && await ev(gate) === -before, 'a real tap on the top paddle flips it');
ok(await ev(`document.getElementById('aviso').classList.contains('fuera')`), 'and the hint goes away');
await b.shot('02-game');

// Losing focus pauses the clock; a tap takes the pause off without flipping
await ev(`${P}.S.pausar(); 1`);
ok(await ev(`!document.getElementById('pausa').hidden`), 'losing focus pauses the game');
const t0 = await ev(`${P}.S.g.t`);
await sleep(700);
ok(await ev(`${P}.S.g.t`) - t0 < 50, 'and the clock stops');
const flips = await ev(`${P}.S.g.flips`);
await b.tap(r.x + r.width / 2, r.y + r.height / 2);
ok(await waitFor(`document.getElementById('pausa').hidden`, 1000) && await ev(`${P}.S.g.flips`) === flips, 'a tap takes the pause off, flipping nothing');

// A player that never misses, with the clock moved ahead, scores the best possible
await b.go(`${SITE}/labs/gates/?seed=${SEED}&test`, 1200);
await waitFor(`!!document.getElementById('btn-empezar')`);
await ev(`document.getElementById('btn-empezar').click(); 1`);
await waitFor(`!!document.getElementById('tablero') && !document.getElementById('cuenta')`, 8000);
await ev(`(async () => { for (let k = 0; k < 1300 && document.getElementById('tablero'); k++) { ${P}.adelanta(50); ${P}.juega(); await new Promise(r => setTimeout(r, 4)); } })(); 1`);
const max = best(newGame(SEED));
ok(await waitFor(`document.getElementById('puntaje')?.textContent === '${max}'`, 20000), `a player that never misses scores the best possible: ${max}`);
ok(await ev(`document.getElementById('maximo').textContent`) === `de ${max} posibles`, `out of ${max}`);
ok(await ev(`document.querySelectorAll('.desglose li').length`) >= 2 && /en el 10/.test(await ev(`document.querySelector('.desglose').textContent`)), 'with the tally: the balls in the 10 and the bombs');
ok(await ev(`!!document.getElementById('btn-compartir-resultado')`), 'the result can be shared');
const another = await ev(`document.getElementById('btn-otra')?.getAttribute('href') || ''`);
ok(/seed=/.test(another) && !another.includes(SEED), `"Otra partida" opens a new one (${another})`);
ok(await ev(`!!document.getElementById('btn-de-hoy')`), 'and since it was not today\'s, it offers today\'s');
ok(await ev(`(()=>{const k=[...document.querySelector('.resultado').children].filter(x=>x.offsetParent!==null);return k.at(-1)?.classList.contains('comentario') && k.at(-2)?.classList.contains('divisor')})()`), 'the comment comes last, separated by a line');
ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'no sideways scroll at 375 px');
ok(ROWS === 5, 'five rows of paddles');
await b.shot('03-final');
ok(!b.errors.length, `no errors on the page ${JSON.stringify(b.errors)}`);
b.close();
if (failures) { console.log(`✗ ${failures} failures`); process.exit(1); }
console.log('✓ compuertas (labs)');
