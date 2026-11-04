// The lab's Duende end to end, at /labs/phone-run/: the lab offers it under Juegos en prueba; the page
// opens on the old TV with the pixel gnome, which a tap skips and which goes on its own to the cover;
// the cover credits the phone-in TV games, its track runs itself, and Play is above the three steps;
// the game has the track, three lives, the stretch and the phone's keypad with 2, 4, 6 and 8 lit; real
// taps on 4 and 6 change lanes and 2 jumps, as do the arrows and a swipe on the track; a checkpoint
// says so and moves to stretch 2; a hit costs a life and starts the stretch again at its checkpoint;
// losing focus pauses and the tap back resumes; three hits end the game with the score, the best kept
// on the phone, share, Play again and the comment form. At 375 px. Prints ✗ if anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/phone-run-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const G = `window.__duende.S.g`;
const rect = sel => ev(`document.querySelector('${sel}').getBoundingClientRect().toJSON()`);
const tapOn = async sel => { const r = await rect(sel); await b.tap(r.x + r.width / 2, r.y + r.height / 2); };

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#activos #seccion-duende #btn-duende')?.getAttribute('href')`) === 'phone-run/', 'the lab offers Duende under Juegos en prueba');

// The old TV, skipped with a tap
await b.go(`${SITE}/labs/phone-run/?test`, 900);
ok(await ev(`document.documentElement.lang`) === 'es', 'the page is in Spanish');
ok(await waitFor(`!!document.getElementById('tele')`), 'it opens on the old TV');
ok(await ev(`getComputedStyle(document.querySelector('.tele-pixeles')).imageRendering`) !== 'auto', 'with the picture in big pixels');
await tapOn('#intro');
ok(await waitFor(`!!document.getElementById('btn-jugar')`, 2000), 'a tap skips it to the cover');

// Untouched, the TV glitches and goes into the cover on its own
await b.go(`${SITE}/labs/phone-run/?test`, 600);
ok(await waitFor(`document.querySelector('.tele')?.classList.contains('falla')`, 6000), 'untouched, the picture glitches');
ok(await waitFor(`!!document.getElementById('btn-jugar')`, 3000), 'and the cover follows on its own');

// The cover
ok(/llamando por teléfono/.test(await ev(`document.querySelector('.credito')?.textContent || ''`)), 'the cover credits the phone-in TV games');
ok(await ev(`document.querySelectorAll('.pasos li').length`) === 3, 'three steps');
ok(await ev(`document.getElementById('btn-jugar').compareDocumentPosition(document.querySelector('.pasos')) & Node.DOCUMENT_POSITION_FOLLOWING`), 'Play comes before the steps');
ok(await ev(`document.getElementById('btn-jugar').getBoundingClientRect().bottom <= innerHeight`), 'and is above the fold');
await ev(`window.__shot = document.querySelector('.demo-pista').toDataURL(); 1`);
await sleep(800);
ok(await ev(`document.querySelector('.demo-pista').toDataURL() !== window.__shot`), 'the cover\'s track runs');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll on the cover');

// The game, on a fixed track
await b.go(`${SITE}/labs/phone-run/?test&intro=0&seed=e2e`, 900);
await ev(`localStorage.removeItem('juegos-de-salon:phone-run-best'); 1`);
await tapOn('#btn-jugar');
ok(await waitFor(`!!document.getElementById('escenario')`), 'Play opens the track');
ok(await ev(`document.querySelectorAll('#vidas .vida:not(.perdida)').length`) === 3, 'three lives');
ok(await ev(`document.getElementById('tramo').textContent`) === 'Tramo 1', 'on stretch 1');
ok(await ev(`document.querySelectorAll('.fono .tecla').length === 12 && [...document.querySelectorAll('.fono .tecla.activa')].map(x => x.dataset.k).join('') === '2468'`), 'a phone keypad with 2, 4, 6 and 8 lit');
ok(await ev(`document.getElementById('btn-comentario') !== null`), 'and the comment link');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll in the game');
ok(await waitFor(`!${G}.readyUntil || performance.now() > ${G}.readyUntil`, 3000), 'after the beat, he runs');
// Keep him clear of obstacles while the keys are tried: none in sight
await ev(`${G}.track.obstacles = []; 1`);

await tapOn('.tecla[data-k="4"]');
ok(await ev(`${G}.lane`) === 0, 'a real tap on 4 moves him left');
await tapOn('.tecla[data-k="6"]'); await tapOn('.tecla[data-k="6"]');
ok(await ev(`${G}.lane`) === 2, 'two taps on 6, to the right lane');
await sleep(700);
await tapOn('.tecla[data-k="2"]');
ok(await ev(`performance.now() - ${G}.jumpAt < 640`), '2 jumps');
await ev(`dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); 1`);
ok(await ev(`${G}.lane`) === 1, 'the left arrow too');
const e = await rect('#escenario');
await b.drag(e.x + e.width / 2, e.y + e.height / 2, e.x + e.width / 2 + 90, e.y + e.height / 2);
ok(await ev(`${G}.lane`) === 2, 'and a swipe to the right on the track');

// A checkpoint
await ev(`${G}.z = 200 - 3; 1`);
ok(await waitFor(`${G}.s === 1`, 2000), 'reaching the line passes the checkpoint');
ok(await waitFor(`/Control/.test(document.getElementById('aviso').textContent)`, 1000), 'it says ¡Control!');
ok(await ev(`document.getElementById('tramo').textContent`) === 'Tramo 2', 'and the stretch is 2');
ok(/TRAMO 2/.test(await ev(`document.getElementById('lcd').textContent`)), 'the phone\'s little screen too');

// A hit: the next obstacle in his lane, right ahead, with nothing done
const zHit = await ev(`(g => { const o = g.track.obstacles.find(o => o.lanes.includes(g.lane) && o.kind !== 'rama'); g.z = o.z - 4; return g.s * 200; })(${G})`);
ok(await waitFor(`${G}.lives === 2`, 3000), 'running into it costs a life');
ok(await ev(`document.querySelectorAll('#vidas .vida:not(.perdida)').length`) === 2, 'two hearts left');
ok(/💥/.test(await ev(`document.getElementById('aviso').textContent`)), 'and it says what he hit');
ok(await waitFor(`${G}.hitAt === null`, 3000) && await ev(`${G}.z`) === zHit, 'then the stretch starts again at its checkpoint');

// Interrupted: the page loses focus, the game pauses, the tap back resumes
await ev(`dispatchEvent(new Event('blur')); 1`);
ok(await ev(`!document.getElementById('pausa').hidden`), 'losing focus pauses the game');
const z = await ev(`${G}.z`);
await sleep(600);
ok(await ev(`${G}.z`) === z, 'and he stops');
await tapOn('#escenario');
ok(await ev(`document.getElementById('pausa').hidden`), 'a tap takes the pause off');

// Two more hits end the game
for (let i = 0; i < 2; i++) {
  await waitFor(`${G}.hitAt === null && performance.now() > ${G}.readyUntil`, 4000);
  await ev(`(g => { const o = g.track.obstacles.find(o => o.z > g.z && o.lanes.includes(g.lane) && o.kind !== 'rama'); g.z = o.z - 3; })(${G}); 1`);
  await waitFor(`${G}.lives === ${1 - i}`, 3000);
}
ok(await waitFor(`/Fin del juego/.test(document.getElementById('aviso')?.textContent || '')`, 4000), 'the third hit says Fin del juego');
ok(await waitFor(`!!document.getElementById('puntaje')`, 4000), 'and the result follows');
const pts = await ev(`+document.getElementById('puntaje').textContent`);
ok(pts >= 100, `the result counts the checkpoint passed (${pts})`);
ok(/Récord/.test(await ev(`document.querySelector('.sello-duende').textContent`)), 'a first game is a record');
ok(await ev(`+localStorage.getItem('juegos-de-salon:phone-run-best')`) === pts, 'kept on the phone');
ok(/tramo 2/.test(await ev(`document.querySelector('.desglose').textContent`)), 'it says how far he got');
ok(await ev(`!!document.getElementById('btn-compartir-resultado') && !!document.getElementById('btn-otra') && !!document.querySelector('.resultado .divisor')`), 'share, Play again, and the comment form after a line');
ok(await ev(`document.documentElement.scrollWidth <= 375`), 'no sideways scroll on the result');

await ev(`document.getElementById('btn-otra').click(); 1`);
ok(await waitFor(`document.getElementById('lcd')?.textContent === 'TRAMO 1 · 0 PTS'`), 'Play again starts from stretch 1 at 0');
ok(new RegExp(`Récord: ${pts}`).test(await ev(`document.getElementById('mejor-juego').textContent`)), 'with the record in the heading');

b.close();
console.log(failures ? `✗ ${failures} failure(s)` : '✓ phone-run/lab.mjs');
