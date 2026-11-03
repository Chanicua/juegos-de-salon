// Aletazo in the lab end to end, at /labs/flap/: the lab offers it under Active projects; the cover
// has the tagline, three steps and Jugar over a demo that flies itself; Jugar waits for the first tap
// («Toca para volar») and the tap starts the game; real taps on the stage, timed like a player's,
// get it through a level (the «Nivel 2» banner, the HUD's level and score); without taps the bird
// falls, loses its three lives and the result card shows the stamp, the score, a line about how it
// went, Jugar otra vez and the way back to the lab; Jugar otra vez starts again; the best is kept;
// in English the cover is in English; no sideways scroll at 320 px. Prints ✗ if anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/flap-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const TAP = `document.getElementById('escenario').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))`;
// Plays in the page like a careful player: a tap whenever the bird drops below the next opening
const PLAY = (until, ms) => `(async () => {
  const w = t => new Promise(r => setTimeout(r, t)), t0 = performance.now();
  while (performance.now() - t0 < ${ms}) {
    const g = __aletazo.g; if (g.mode !== 'play' || (${until})) break;
    const n = g.gates.find(h => h.x > g.bird.x - 0.02);
    if (n && g.bird.vy > 0 && g.bird.y > n.y + 0.015) ${TAP};
    await w(16);
  }
  return __aletazo.g.passed;
})()`;

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#activos #seccion-aletazo #btn-aletazo')?.getAttribute('href')`) === 'flap/', 'the lab offers Aletazo under Active projects');

await b.go(`${SITE}/labs/flap/?test`, 1200);
ok(await waitFor(`!!document.getElementById('btn-jugar')?.textContent`), 'the cover has Jugar');
ok(/Un toque, un aletazo/.test(await ev(`document.getElementById('lema').textContent`)), 'the tagline');
ok(await ev(`document.querySelectorAll('#pasos li').length`) === 3, 'three steps');
const y0 = await ev(`__aletazo.g.bird.y`), x0 = await ev(`__aletazo.g.gates[0].x`);
await sleep(700);
ok(await ev(`__aletazo.g.mode`) === 'demo' && await ev(`__aletazo.g.gates[0].x`) < x0 && await ev(`__aletazo.g.bird.y`) !== y0, 'behind it, the demo flies itself');
ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'no sideways scroll at 375 px');
await b.shot('01-cover');

await ev(`document.getElementById('btn-jugar').click(); 1`);
ok(await waitFor(`!document.getElementById('hud').hidden && document.getElementById('portada').hidden`, 2000), 'Jugar shows the stage with its HUD');
ok(/Toca para volar/.test(await ev(`document.getElementById('aviso').textContent`)) && await ev(`__aletazo.g.mode`) === 'ready', 'and waits for the first tap: «Toca para volar»');
ok(await ev(`document.querySelectorAll('#vidas span:not(.off)').length`) === 3, 'with 3 lives');
await ev(`${TAP}; 1`);
ok(await ev(`__aletazo.g.mode`) === 'play' && await ev(`__aletazo.g.bird.vy`) < 0, 'the tap starts it and the bird goes up');

const passed = await ev(PLAY(`g.passed >= 6`, 40000));
ok(passed >= 6, `taps get it through the gates (${passed})`);
ok(await waitFor(`/Nivel 2/.test(document.getElementById('aviso').textContent)`, 1500) || await ev(`__aletazo.g.level`) >= 2, 'a new level after 5 gates, announced');
ok(await ev(`document.getElementById('nivel').textContent`) === 'Nv 2' || await ev(`__aletazo.g.level`) > 2, 'the HUD says the level');
ok(+await ev(`document.getElementById('marcador').textContent`) === await ev(`__aletazo.g.score`) && await ev(`__aletazo.g.score`) >= passed, 'and the score: +1 a gate, +2 through the middle');
await b.shot('02-play');

// No more taps: the ground takes the lives, the bird falls and the result shows
ok(await waitFor(`!document.getElementById('resultado').hidden`, 12000), 'without taps it loses its 3 lives and the result shows');
const score = await ev(`__aletazo.g.score`);
ok(+await ev(`document.getElementById('res-puntos').textContent`) === score, `the score (${score})`);
ok(/Nuevo récord/.test(await ev(`document.getElementById('res-sello').textContent`)), 'a first game is a new best');
ok((await ev(`document.getElementById('res-veredicto').textContent`)).length > 5, `a line about how it went («${await ev(`document.getElementById('res-veredicto').textContent`)}»)`);
ok(await ev(`document.getElementById('btn-otra').textContent`) === 'Jugar otra vez', 'Jugar otra vez');
ok(await ev(`document.querySelector('#res-salidas a')?.getAttribute('href')`) === '../../labs/', 'and the way back to the lab');
await b.shot('03-result');

await ev(`document.getElementById('btn-otra').click(); 1`);
ok(await waitFor(`__aletazo.g.mode === 'ready' && document.getElementById('resultado').hidden`, 2000), 'Jugar otra vez starts again');
await ev(`${TAP}; 1`);
ok(await waitFor(`!document.getElementById('resultado').hidden`, 12000) && /Tu mejor: \d+/.test(await ev(`document.getElementById('res-mejor').textContent`)), 'a worse game shows «Tu mejor»');

await b.go(`${SITE}/labs/flap/?lang=en&test`, 1200);
ok(await waitFor(`/One tap, one flap/.test(document.getElementById('lema').textContent)`), 'in English, the cover is in English');
ok(/Best: \d+/.test(await ev(`document.getElementById('mejor-portada').textContent`)), 'and shows the best kept on this phone');

ok(!b.errors.length, `no errors on the page ${JSON.stringify(b.errors)}`);
b.close();

// A short phone: 320 × 568
const s = await launch({ dir: `${OUT}/p320`, out: OUT, width: 320, height: 568 });
await s.go(`${SITE}/labs/flap/?test`, 1200);
ok(await s.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'no sideways scroll at 320 px');
ok(await s.evaluate(`(() => { const r = document.getElementById('btn-jugar').getBoundingClientRect(); return r.bottom <= innerHeight && r.height >= 44; })()`), 'Jugar is in view and 44 px tall on a short phone');
await s.shot('04-cover-320');
ok(!s.errors.length, `no errors at 320 px ${JSON.stringify(s.errors)}`);
s.close();
if (failures) { console.log(`✗ ${failures} failures`); process.exit(1); }
console.log('✓ aletazo (labs)');
