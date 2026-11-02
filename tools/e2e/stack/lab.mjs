// The lab's Stack (D-445) end to end, at /labs/stack/: the lab offers it under Juegos en prueba with the
// credit to Ketchapp's Stack, which the cover gives too, in English; the cover's tower builds itself;
// Play opens the tower with "Tap anywhere"; a real tap on the screen drops the block; perfect drops keep
// its size and say "Perfect ×n"; a late one cuts it; missing the tower ends the game with the score, the
// best kept on the phone, share, Play again and the comment form; Play again starts at 0. At 375 px.
// The game screen has the heading (the name and the best) and the comment link. A new best is kept as it
// happens; losing focus pauses the game, and the tap back resumes it without dropping. Prints ✗ if anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/stack-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#bodega #seccion-stack #btn-stack-lab')?.getAttribute('href')`) === 'stack/', 'the lab keeps the English prototype in its La Bodega card, beside Babel (D-517)');
ok(await ev(`/Stack/.test(document.querySelector('#seccion-stack a[href*="ketchapp"]')?.textContent || '')`), 'and says it is inspired by Ketchapp\'s Stack, with its link');

await b.go(`${SITE}/labs/stack/?test`, 1200);
ok(await waitFor(`!!document.getElementById('btn-jugar')`), 'the cover has Play');
ok(await ev(`document.documentElement.lang`) === 'en', 'the page is in English');
ok(/Inspired by Stack, by Ketchapp/.test(await ev(`document.querySelector('.credito')?.textContent || ''`)), 'the cover credits Ketchapp\'s Stack');
ok(await ev(`document.querySelectorAll('.pasos li').length`) === 3, 'three steps under Play');
await ev(`window.__shot = document.querySelector('.demo-torre').toDataURL(); 1`);
await sleep(1500);
ok(await ev(`document.querySelector('.demo-torre').toDataURL() !== window.__shot`), 'the cover\'s tower moves');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll on the cover');

// Play: the tower, the score at 0, and the hint
await ev(`document.getElementById('btn-jugar').click(); 1`);
ok(await waitFor(`!!document.getElementById('escenario')`), 'Play opens the tower');
ok(await ev(`document.getElementById('marcador').textContent`) === '0', 'the score starts at 0');
ok(/Tap anywhere/.test(await ev(`document.getElementById('aviso').textContent`)), 'and says to tap anywhere');
ok(await ev(`!!document.querySelector('.cabeza-torre .titulo-torre') && document.getElementById('mejor-juego').textContent === ''`), 'a heading with the name, and no best yet');
ok(await ev(`!!document.getElementById('btn-comentario')`), 'and the comment link under the tower, as in the other games');

// A real tap on the screen, while the block is over the tower, drops it
const P = `window.__stack`;
const espera = await ev(`Math.max(0, ${P}.perfecto() - performance.now())`);
await sleep(espera);
const r = await ev(`document.getElementById('escenario').getBoundingClientRect().toJSON()`);
await b.tap(r.x + r.width / 2, r.y + r.height / 2);
ok(await waitFor(`${P}.S.g.slabs.length === 2`, 2000), 'a tap on the screen drops the block');
ok(await ev(`document.getElementById('marcador').textContent`) === '1', 'the score says 1');

// Three perfect drops in a row: nothing cut, and it says so
await ev(`for (let k = 0; k < 3; k++) ${P}.S.soltarEn(${P}.perfecto()); 1`);
const g = await ev(`(g => ({ n: g.slabs.length - 1, combo: g.combo, w: g.slabs.at(-1).w, d: g.slabs.at(-1).d }))(${P}.S.g)`);
ok(g.n === 4 && g.combo >= 3, `perfect drops add up (${g.n} blocks, ${g.combo} in a row)`);
ok(/Perfect ×\d/.test(await ev(`document.getElementById('aviso').textContent`)), 'and it says Perfect ×n');

// A late drop cuts the block
const area = `(s => s.w * s.d)(${P}.S.g.slabs.at(-1))`;
const antes = await ev(area);
await ev(`${P}.S.soltarEn(${P}.perfecto() + 120); 1`);
const despues = await ev(area);
ok(despues < antes, `a late drop cuts the block (${antes.toFixed(2)} → ${despues.toFixed(2)})`);
ok(await ev(`document.getElementById('marcador').textContent`) === '5', 'the score says 5');
ok(await ev(`localStorage.getItem('juegos-de-salon:stack-best')`) === '5', 'a new best is kept the moment it happens, before the game ends');

// Interrupted (a call, another app): the page loses focus, the game pauses, and the tap back only resumes
await ev(`window.dispatchEvent(new Event('blur')); 1`);
ok(await ev(`!document.getElementById('pausa').hidden && ${P}.S.pausa > 0`), 'losing focus pauses the game and says so');
await sleep(1200);
const pausado = await ev(`${P}.S.pausa`);
ok(await ev(`${P}.S.pausa`) === pausado, 'and it stays paused');
await b.tap(r.x + r.width / 2, r.y + r.height / 2);
ok(await ev(`document.getElementById('pausa').hidden && ${P}.S.pausa === 0`), 'a tap takes the pause off');
ok(await ev(`${P}.S.g.slabs.length - 1`) === 5 && await ev(`!${P}.S.fin`), 'and does not drop the block');
await ev(`${P}.S.soltarEn(${P}.perfecto()); 1`);
ok(await ev(`${P}.S.g.slabs.length - 1`) === 6, 'after the pause, the game goes on (a perfect drop: 6)');

// Missing the tower ends the game: the block is still far out when it is dropped
await ev(`${P}.S.soltarEn(${P}.S.g.moving.t0); 1`);
ok(await waitFor(`/Game over/.test(document.getElementById('aviso')?.textContent || '')`, 1000), 'missing the tower says Game over');
ok(await waitFor(`!!document.getElementById('puntaje')`, 4000), 'and the result follows');
ok(await ev(`document.getElementById('puntaje').textContent`) === '6', 'the result is the tower: 6');
ok(/New best/.test(await ev(`document.querySelector('.sello-torre').textContent`)), 'a first game is a new best');
ok(await ev(`localStorage.getItem('juegos-de-salon:stack-best')`) === '6', 'kept on the phone');
ok(await ev(`!!document.getElementById('btn-compartir-resultado') && !!document.getElementById('btn-otra') && !!document.querySelector('.resultado .divisor')`), 'share, Play again, and the comment form after a line');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll on the result');

// Play again: from 0; a worse game shows the best
await ev(`document.getElementById('btn-otra').click(); 1`);
ok(await waitFor(`document.getElementById('marcador')?.textContent === '0'`), 'Play again starts at 0');
ok(/Best: 6/.test(await ev(`document.getElementById('mejor-juego').textContent`)), 'the heading shows the best: 6');
await ev(`${P}.S.soltarEn(${P}.S.g.moving.t0); 1`);
ok(await waitFor(`!!document.getElementById('puntaje')`, 4000), 'a miss on the first block ends it');
ok(/Your best: 6/.test(await ev(`document.getElementById('mejor')?.textContent || ''`)), 'and it shows the best: 6');

b.close();
console.log(failures ? `✗ ${failures} failure(s)` : '✓ stack/lab.mjs');
