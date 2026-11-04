// Pulso in the lab end to end, at /labs/pulse/: the lab offers it under Active projects; the cover
// has its demo stage (a part that plays itself), the four songs (easy to hard, each with its two audio
// files on the server) and three steps; a song opens the stage over the page with the score, the
// energy, the song's name and "Parte 1 de <n>"; played by itself (the
// window.__pulso.auto hook) every note is perfect, the multiplier grows and a hold is held; a tap on
// nothing breaks the run; left alone, the notes are missed and the energy drops; ⏸ pauses, and
// Terminar asks for a second tap and shows the result with its card, share, another song and the
// comment form; the record stays on the phone, per song; Otra vez plays it again; the tuning screen
// opens and goes back; `?song=` marks that song on the cover.
// Without a real tap the browser keeps the audio suspended, so this plays silent, on the page's clock.
// Prints ✗ if anything fails.
import { output } from '../output.mjs';
import { launch, sleep } from '../cdp.mjs';
const OUT = output('/tmp/pulse-lab');
const b = await launch({ dir: `${OUT}/p`, out: OUT, width: 375, height: 812 });
const ev = e => b.evaluate(e);
const SITE = process.env.SITE || 'http://localhost:8765';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
const { CANCIONES } = await import('../../../public/labs/pulse/songs.js');
const SONG = CANCIONES[0], PARTES = SONG.partes.length;

await b.go(`${SITE}/labs/`);
ok(await ev(`document.querySelector('#activos #seccion-pulso #btn-pulso')?.getAttribute('href')`) === 'pulse/', 'the lab offers Pulso under Active projects');

await b.go(`${SITE}/labs/pulse/?test`, 1200);
ok(await waitFor(`document.querySelectorAll('#canciones .cancion').length === ${CANCIONES.length}`), `the cover offers the ${CANCIONES.length} songs`);
ok(await ev(`[...document.querySelectorAll('#canciones .cancion')].map(b => b.dataset.id).join()`) === CANCIONES.map(c => c.id).join(), 'easy to hard');
ok(await ev(`!!document.querySelector('.portada canvas.demo-pulso')?.width`), 'and the demo stage, drawn');
ok(await ev(`document.querySelectorAll('.pasos li').length`) === 3, 'three steps');
const files = await ev(`Promise.all(${JSON.stringify(CANCIONES.flatMap(c => [`${c.id}-banda`, `${c.id}-guitarra`]))}.map(f => fetch('songs/' + f + '.mp3', { method: 'HEAD' }).then(r => r.ok && /audio|mpeg/.test(r.headers.get('content-type') || ''))))`);
ok(files.every(Boolean), 'every song has its two audio files');
await b.shot('01-cover');

await ev(`localStorage.removeItem('juegos-de-salon:pulso-record-${SONG.id}'); window.__pulso.auto = true; document.getElementById('cancion-${SONG.id}').click(); 1`);
ok(await waitFor(`!!document.querySelector('#juego canvas#escenario') && document.body.classList.contains('jugando')`, 5000), 'a song opens the stage over the page');
ok(await ev(`document.querySelector('.hud-cancion').textContent`) === SONG.titulo, 'with the song\'s name');
ok(await ev(`document.getElementById('parte').textContent`) === `Parte 1 de ${PARTES}`, `it starts on part 1 of ${PARTES}`);
ok(await waitFor(`window.__pulso.P.p.cuenta.perfecto >= 12`, 20000), 'played by itself, the notes are hit');
ok(await ev(`window.__pulso.P.p.cuenta.fallo === 0 && /×2|×3|×4/.test(document.getElementById('multi').textContent)`), 'all perfect, and the multiplier grows');
ok(await ev(`Number(document.getElementById('pts').textContent.replace(/\\D/g, '')) === window.__pulso.P.p.puntos && window.__pulso.P.p.puntos > 0`), 'the score on screen is the game\'s');
await b.shot('02-playing');
ok(await waitFor(`!!window.__pulso.P.p.sosteniendo`, 30000), 'a hold is held');
await b.shot('03-hold');

// Left alone: the notes go by, missed, and the energy drops
await waitFor(`!window.__pulso.P.p.sosteniendo`, 5000);
const energia = await ev(`window.__pulso.P.p.energia`);
await ev(`window.__pulso.auto = false; 1`);
ok(await waitFor(`window.__pulso.P.p.cuenta.fallo >= 2`, 8000), 'left alone, notes are missed');
ok(await ev(`window.__pulso.P.p.energia`) < energia && await ev(`window.__pulso.P.p.racha`) === 0, 'the energy drops and the run is lost');

// A tap on nothing (far from any note) breaks the run: played by itself again, then a stray tap
await ev(`window.__pulso.auto = true; 1`);
await waitFor(`window.__pulso.P.p.racha >= 3 && !window.__pulso.P.p.sosteniendo`, 15000);
const hit = await ev(`(() => { const { P } = window.__pulso, t = window.__pulso.juego.ahora(); const n = P.c.notas.slice(P.p.siguiente).find(n => n.t > t); return n ? n.c : 0; })()`);
await ev(`(() => { const c = document.getElementById('escenario'), r = c.getBoundingClientRect(), { G } = window.__pulso.juego.esc, lane = ${hit};
  const x = r.left + G.pads[(lane + 1) % 3].x, y = r.top + G.pads[0].y;
  window.__pulso.auto = false;
  c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: x, clientY: y }));
  c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: x, clientY: y })); })(); 1`);
ok(await ev(`window.__pulso.P.p.racha`) === 0, 'a tap on the wrong pad breaks the run');

await ev(`document.getElementById('btn-pausa').click(); 1`);
ok(await waitFor(`!!document.getElementById('pausa')`, 1000), '⏸ pauses');
const enPausa = await ev(`window.__pulso.juego.ahora()`);
await sleep(600);
ok(Math.abs(await ev(`window.__pulso.juego.ahora()`) - enPausa) < 0.05, 'and the song stops while paused');
await b.shot('04-pause');
await ev(`document.getElementById('btn-terminar').click(); 1`);
ok(/Seguro/.test(await ev(`document.getElementById('btn-terminar').textContent`)), 'Terminar asks for a second tap');
await ev(`document.getElementById('btn-terminar').click(); 1`);
ok(await waitFor(`!!document.getElementById('puntaje') && !document.getElementById('juego')`, 4000), 'and shows the result');
const pts = await ev(`window.__pulso.P.p.puntos`);
ok(Number((await ev(`document.getElementById('puntaje').textContent`)).replace(/\D/g, '')) === pts, 'with the score');
ok(new RegExp(`^[🟩🟨🟧🟥⬛]{${PARTES}}$`, 'u').test(await ev(`document.getElementById('tarjeta').textContent`)), `and its card, a square per part`);
ok(/Terminaste/.test(await ev(`document.querySelector('.sello-pulso').textContent`)), '«Terminaste»');
ok(await ev(`!!document.getElementById('btn-compartir-resultado') && !!document.getElementById('btn-otra-vez') && !!document.getElementById('btn-otra-cancion') && !!document.querySelector('.resultado .comentario, .resultado form, .resultado textarea')`), 'share, again, another song and the comment');
ok(/Nuevo récord/.test(await ev(`document.getElementById('record')?.textContent || ''`)) && Number(await ev(`localStorage.getItem('juegos-de-salon:pulso-record-${SONG.id}')`)) === pts, 'the first score is a record, kept on the phone for that song');
await b.shot('05-result');

await ev(`document.getElementById('btn-otra-vez').click(); 1`);
ok(await waitFor(`!!document.getElementById('juego') && window.__pulso.P.p.puntos === 0`, 5000), 'Otra vez plays the same song again');
await ev(`window.__pulso.juego.cerrar('rendido'); 1`);
await waitFor(`!!document.getElementById('puntaje')`, 3000);

await b.go(`${SITE}/labs/pulse/?test&song=${CANCIONES[2].id}`, 800);
ok(/🏆/.test(await ev(`document.querySelector('#cancion-${SONG.id} .cancion-record')?.textContent || ''`)), 'the cover shows the song\'s record');
ok(await ev(`document.getElementById('cancion-${CANCIONES[2].id}').classList.contains('pedida')`), '?song= marks that song');
await ev(`document.getElementById('btn-ajustar').click(); 1`);
ok(await waitFor(`!!document.getElementById('pad-ajuste') && !!document.getElementById('btn-ajuste-empezar')`, 1000), 'the tuning screen opens');
await b.shot('06-tuning');
await ev(`document.getElementById('btn-ajuste-volver').click(); 1`);
ok(await waitFor(`!!document.getElementById('canciones')`, 1000), 'and goes back to the cover');

ok(!b.errors.length, `no errors on the page ${JSON.stringify(b.errors)}`);
b.close();
if (failures) { console.log(`✗ ${failures} failures`); process.exit(1); }
console.log('✓ pulso (labs)');
