// Memorice in the lab, end to end, at /labs/memory/: the lab offers it under Active projects;
// the cover has Play, three steps and today's note, and its board plays by itself; Play shows two
// pictures on a 3×3 board and covers them; tapping every copy of the picture asked (one, then a pair)
// clears the round and goes up a level; a wrong tile shakes, shows where it was and costs a life;
// letting the time run out costs one too; three misses end the game with the rounds cleared, share,
// play again and the comment after a line. At 375 px.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/memory-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const tapTile = i => ev(`document.querySelector('#tablero .tile[data-i="${i}"]').click(); 1`);

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#activos #seccion-memorice #btn-memorice')?.getAttribute('href')`) === 'memory/', 'the lab offers Memorice under Active projects');

await b.go(`${SITE}/labs/memory/?test`, 1200);
ok(await waitFor(`!!document.getElementById('btn-jugar')`), 'the cover has Jugar');
ok(await ev(`document.querySelectorAll('.steps li').length`) === 3, 'three steps');
ok(/igual para todos/.test(await ev(`document.body.textContent`)), 'without a seed it is today\'s game');
ok(await waitFor(`document.querySelectorAll('.demo .tile.open').length >= 1`, 6000), 'the cover board shows pictures by itself');
ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'no sideways scroll at 375 px');
await b.shot('01-cover');

await b.go(`${SITE}/labs/memory/?seed=e2e&test`, 1200);
await waitFor(`!!document.getElementById('btn-jugar')`);
await ev(`document.getElementById('btn-jugar').click(); 1`);
ok(await waitFor(`document.querySelectorAll('#tablero .tile.open svg').length === 2`, 3000), 'Jugar shows two pictures on a 3×3 board');
ok(await ev(`document.querySelectorAll('#tablero .tile').length`) === 9, 'nine tiles');
await b.shot('02-look');
ok(await waitFor(`!!window.__memory.answer`, 8000) && await ev(`document.querySelectorAll('#tablero .tile.open').length`) === 0, 'they get covered and it asks');
ok(await ev(`document.querySelector('.bar-ee').classList.contains('answer')`), 'with a bar for the time to answer');
ok(await ev(`!!document.querySelector('#aviso .pic-icon svg')`), 'the prompt shows the picture to find');

// Clear three rounds with the engine's answers (one picture, a pair, one picture): each one goes up a level
for (let k = 1; k <= 3; k++) {
  await waitFor(`!!window.__memory.answer`, 10000);
  for (const c of await ev(`window.__memory.round.ask.cells`)) { await tapTile(c); await sleep(40); }
  ok(await waitFor(`window.__memory.g.level === ${k + 1}`, 3000), `round ${k} cleared: level ${k + 1}`);
}
ok(await waitFor(`/Ronda 4/i.test(document.getElementById('ronda').textContent)`, 3000), 'the heading says Ronda 4');

// Misses: the wrong tile shakes, the right one opens, a life goes
for (let k = 0; k < 3; k++) {
  await waitFor(`!!window.__memory.answer`, 15000);
  if (k === 2) {
    // The third one: the time runs out, and that costs a life too
    ok(await waitFor(`/Se acabó el tiempo/.test(document.getElementById('aviso').textContent)`, 15000), 'letting the time run out costs a life');
    continue;
  }
  const bad = await ev(`(()=>{const r=window.__memory.round;return r.board.findIndex(v=>v!==r.ask.sprite)})()`);
  await tapTile(bad);
  if (k === 0) {
    ok(await ev(`document.querySelector('#tablero .tile[data-i="${bad}"]').classList.contains('bad')`) && /No era ahí/.test(await ev(`document.getElementById('aviso').textContent`)), 'a wrong tile shakes and says so');
    ok(await waitFor(`!!document.querySelector('#tablero .tile.answer.open')`, 2000), 'and the right one opens');
    ok(await waitFor(`document.querySelectorAll('#vidas .lost').length === 1`, 3000), 'one life lost');
    await b.shot('03-miss');
  }
}
ok(await waitFor(`/3 rondas/.test(document.getElementById('puntaje')?.textContent || '')`, 6000), 'three misses end the game: 3 rondas');
ok(await ev(`!!document.getElementById('btn-compartir-resultado') && !!document.getElementById('btn-otra')`), 'share and play again');
ok(await ev(`(()=>{const k=[...document.querySelector('.result-ee').children].filter(x=>x.offsetParent!==null);return k.at(-1)?.classList.contains('comentario') && k.at(-2)?.classList.contains('divisor')})()`), 'the comment comes last, after a line');
ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'no sideways scroll at 375 px');
await b.shot('04-result');
ok(!b.errors.length, `no errors on the page ${JSON.stringify(b.errors)}`);
b.close();
if (failures) { console.log(`✗ ${failures} failures`); process.exit(1); }
console.log('✓ memorice (labs)');
