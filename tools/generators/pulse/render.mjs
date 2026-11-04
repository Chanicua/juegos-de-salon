// Records Pulso's songs (public/labs/pulse/songs.js) as audio files the game plays:
// public/labs/pulse/songs/<id>-banda.mp3 (the band, stereo) and <id>-guitarra.mp3 (the lead guitar,
// mono, which goes quiet when the player misses). The band in band.js plays each song's events in a
// headless Chromium (OfflineAudioContext), the two parts are scaled together so their sum never
// clips, and ffmpeg encodes them. Run it again only when a song or the band changes: every run adds
// a few MB to git's history (docs/REPO-WEIGHT.md).
//
//   node tools/generators/pulse/render.mjs            # every song
//   node tools/generators/pulse/render.mjs quinta     # only those
//
// Needs ffmpeg with libmp3lame, and Chromium (Playwright's, or CHROME=/path).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const SALIDA = join(RAIZ, 'public/labs/pulse/songs');
const TMP = join(tmpdir(), 'pulse-render');
const { CANCIONES } = await import(join(RAIZ, 'public/labs/pulse/songs.js'));
const HASTA = Number(process.env.HASTA) || 0; // seconds: a short take, to try the band
const pedidas = process.argv.slice(2);
const cuales = CANCIONES.filter(c => !pedidas.length || pedidas.includes(c.id));
if (!cuales.length) { console.error(`✗ no such song: ${pedidas.join(', ')} (there are ${CANCIONES.map(c => c.id).join(', ')})`); process.exit(1); }
await mkdir(SALIDA, { recursive: true });
await mkdir(TMP, { recursive: true });

const TIPOS = { '.js': 'text/javascript', '.html': 'text/html', '.mjs': 'text/javascript' };
const PAGINA = `<!doctype html><meta charset="utf-8"><script type="module">
import { cancion } from '/public/labs/pulse/engine.js';
import { cancionPorId } from '/public/labs/pulse/songs.js';
import { renderizar, wav, pico } from '/tools/generators/pulse/band.js';
window.grabar = async (id, hasta) => {
  const c = cancion(cancionPorId(id));
  const duracion = hasta || c.duracion;
  const corta = e => e.t < duracion;
  let t = performance.now();
  const banda = await renderizar({ eventos: c.musica.banda.filter(corta), duracion, stem: 'banda' });
  console.log('banda ' + Math.round(performance.now() - t) + ' ms'); t = performance.now();
  const guitarra = await renderizar({ eventos: c.musica.guitarra.filter(corta), duracion, stem: 'guitarra' });
  console.log('guitarra ' + Math.round(performance.now() - t) + ' ms');
  // Headroom for the compressor: ffmpeg brings the level up after it
  const escala = 0.5 / pico(banda, guitarra);
  for (const [nombre, buf, canales] of [['banda', banda, 2], ['guitarra', guitarra, 1]]) {
    await fetch('/__wav/' + id + '-' + nombre, { method: 'POST', body: wav(buf, escala, canales) });
  }
  return { duracion, escala };
};
window.listo = true;
</script>`;

const servidor = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url.startsWith('/__wav/')) {
      const trozos = [];
      for await (const t of req) trozos.push(t);
      await writeFile(join(TMP, `${req.url.slice(7)}.wav`), Buffer.concat(trozos));
      res.end('ok'); return;
    }
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end(PAGINA); return; }
    const ruta = join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
    if (!ruta.startsWith(RAIZ)) { res.statusCode = 403; res.end(); return; }
    res.setHeader('content-type', TIPOS[extname(ruta)] || 'application/octet-stream');
    res.end(await readFile(ruta));
  } catch (e) { res.statusCode = 404; res.end(String(e)); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${servidor.address().port}/`;

const { chromium } = createRequire(import.meta.url)('playwright');
const navegador = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const pagina = await navegador.newPage();
pagina.on('pageerror', e => console.error('✗', e.message));
pagina.on('console', m => process.env.VERBOSE && console.log('  ', m.text()));
await pagina.goto(url);
await pagina.waitForFunction(() => window.listo);

for (const c of cuales) {
  const t = Date.now();
  const { duracion, escala } = await pagina.evaluate(a => window.grabar(...a), [c.id, HASTA]);
  // The band is compressed (the punch) and brought up; the lead gets the same lift, a little less
  // squeezed. Both stay under 0 dB, and the game's limiter catches the sum
  for (const [nombre, filtro, opciones] of [
    ['banda', 'acompressor=threshold=-22dB:ratio=4:attack=6:release=110:knee=4,volume=13dB,alimiter=limit=-1dB:level=false', ['-ac', '2', '-b:a', '128k']],
    ['guitarra', 'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150,volume=18dB,alimiter=limit=-2dB:level=false', ['-ac', '1', '-b:a', '80k']],
  ]) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(TMP, `${c.id}-${nombre}.wav`), '-af', filtro, '-codec:a', 'libmp3lame', ...opciones, '-ar', '44100', join(SALIDA, `${c.id}-${nombre}.mp3`)]);
  }
  console.log(`✓ ${c.id}: ${duracion.toFixed(1)} s, scaled ×${escala.toFixed(2)}, in ${((Date.now() - t) / 1000).toFixed(0)} s`);
}
await navegador.close();
servidor.close();
await rm(TMP, { recursive: true, force: true });
