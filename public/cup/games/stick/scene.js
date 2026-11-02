/**
 * 🥷 Shinobi's drawing, moved over from the lab (D-446): the night, the pillars, the stick and the ninja on
 * a canvas. The screen (ui.js) draws the game and the cover's demo with it.
 */
import { pillar, pillarAt, current, next, stickAt, runX, restX, VIEW, HOLD_X, TURN_MS, NINJA, PERFECT, MAX_BONUS } from './engine.js';

const QUIETO = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
// A lost life: the fall, then the ninja peeks up from below, throws the grapple in an arc, it bites the edge,
// the ninja climbs hand over hand and pulls itself over the top; about 2.6 s in all
export const CAIDA_MS = 450, ASOMA_MS = 260, GANCHO_MS = 480, TENSA_MS = 200, SUBIDA_MS = 1250, SALTO_MS = 420;
const TIRONES = 5;   // the pulls of the climb, one hand over the other
export const RESCATE_MS = ASOMA_MS + GANCHO_MS + TENSA_MS + SUBIDA_MS + SALTO_MS;

/** The house's neon (base.css): each pillar's top edge takes the next one. */
const NEON = [[255, 46, 136], [255, 122, 26], [255, 210, 63], [157, 255, 58], [46, 230, 214], [138, 77, 255]];
const rgb = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
const GOLD = [255, 210, 63];
/**
 * The time of day: every DAY_EVERY points the sky moves on a stage, from the night to dawn, the morning
 * and the full day, which stays. Each stage is the sky's top and bottom, the two ranges' colours and their
 * ridges' light.
 */
export const DAY_EVERY = 15;
const CIELOS = [
  { top: [21, 7, 38], low: [42, 10, 74], far: [34, 10, 62], near: [21, 7, 38], borde: [190, 160, 255] },     // night
  { top: [38, 22, 92], low: [255, 122, 90], far: [74, 36, 104], near: [40, 16, 62], borde: [255, 170, 120] }, // dawn
  { top: [90, 150, 230], low: [255, 200, 150], far: [110, 110, 170], near: [62, 52, 110], borde: [255, 225, 170] }, // morning
  { top: [70, 160, 245], low: [180, 225, 255], far: [120, 160, 200], near: [70, 105, 150], borde: [255, 255, 255] }, // day
];
const mezcla = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const easeIn = k => k * k;
const easeOut = k => 1 - (1 - k) ** 3;
const clamp01 = k => Math.max(0, Math.min(1, k));

/** A smooth skyline of peaks at world x (no randomness: the same mountains on every phone and every frame). */
const cumbre = (x, f) => 1 - Math.abs(Math.sin(x * 0.009 * f)) * 0.6 - Math.abs(Math.sin(x * 0.021 * f + 1.7)) * 0.3 - Math.abs(Math.sin(x * 0.047 * f + 0.4)) * 0.1;

/**
 * The scene on a canvas: the sky (the night with stars and a moon, turning to dawn and day every
 * DAY_EVERY points, with a rising sun), two ranges of mountains moving slower than the
 * pillars), the pillars with their flags, the stick, the ninja, and what celebrates (pulses, sparks,
 * floating points). The canvas is transparent: it stands on the app's own night.
 */
export function escena(canvas, { compacto = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, s = 1, G = 0, ultimo = 0;
  const cam = { x: 0, from: 0, to: 0, t0: 0 };
  let hora = 0;        // the time of day, 0 (night) to 3 (day), easing toward the score's stage
  const pulsos = [];   // the emerging pulse of a perfect: { x, y, born, color, max }
  const chispas = [];  // sparks: { x, y, vx, vy, born, life, color, size }
  const flotan = [];   // floating points: { x, y, text, born, color }
  const doradas = new Set();   // the pillars whose flag was hit: they keep a gold flag
  let golpe = null;    // the flag just hit, popping: { k, born }
  let previo = null;   // the last bridge, still lying across its gap: { x0, len }
  let muerte = null;   // the fall at the end: { kind, born, x, y, vy, vx, rot }
  let rescate = null;  // a life lost: the grapple from below and the climb back: { born, x }
  let hundido = 0;     // when the stick started dropping into the gap
  let destello = 0;    // a soft flash of the whole night, for a perfect

  const medir = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = W / VIEW;
    G = H * (compacto ? 0.66 : 0.63);
  };
  const ro = new ResizeObserver(medir); ro.observe(canvas); medir();

  const sx = wx => (wx - cam.x) * s;
  const camara = now => {
    const k = clamp01((now - cam.t0) / 420);
    cam.x = cam.from + (cam.to - cam.from) * easeOut(k);
  };

  /* --- the night --- */
  const ESTRELLAS = Array.from({ length: 70 }, (_, i) => {
    const a = Math.sin(i * 127.1) * 43758.5453, b = Math.sin(i * 311.7) * 12345.678;
    return { x: (a - Math.floor(a)) * 1400, y: (b - Math.floor(b)), r: 0.5 + ((i * 7) % 5) / 5, f: i * 0.7 };
  });
  function fondo(now, dt, score = 0) {
    // The time of day eases toward the score's stage over about two seconds (at once without motion)
    const meta = Math.min(CIELOS.length - 1, Math.floor(score / DAY_EVERY));
    hora = QUIETO || !dt ? meta : hora + Math.sign(meta - hora) * Math.min(Math.abs(meta - hora), dt / 2);
    const i = Math.min(CIELOS.length - 2, Math.floor(hora)), k = hora - i;
    const cielo = Object.fromEntries(Object.keys(CIELOS[0]).map(c => [c, mezcla(CIELOS[i][c], CIELOS[i + 1][c], k)]));
    // The sky: none at night (the app's own night shows through), painted over it as the day comes
    if (hora > 0) {
      const gr = ctx.createLinearGradient(0, 0, 0, G);
      gr.addColorStop(0, rgb(cielo.top, Math.min(1, hora))); gr.addColorStop(1, rgb(cielo.low, Math.min(1, hora)));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    // Stars that barely move, and twinkle; they fade with the dawn
    const estrellas = clamp01(1 - hora / 1.6);
    for (const e of estrellas ? ESTRELLAS : []) {
      const x = ((e.x - cam.x * 0.06 * s) % (W + 40) + W + 40) % (W + 40) - 20;
      const y = e.y * G * 0.75;
      // Not through the mountains: a star below the far ridge would shine through its faint rock
      if (y > cresta(x, 0.12, G * 0.66, G * 0.4, 0.8) - 2) continue;
      ctx.fillStyle = `rgba(255,255,255,${estrellas * (0.25 + 0.35 * (QUIETO ? 0.5 : (Math.sin(now / 700 + e.f) + 1) / 2))})`;
      ctx.fillRect(x, y, e.r * 1.4, e.r * 1.4);
    }
    const mx = W * 0.78, mr = Math.max(14, 24 * s * (compacto ? 0.8 : 1));
    // The moon, with its halo, setting with the dawn
    const lunaK = clamp01(hora);
    if (lunaK < 1) {
      const my = G * (0.2 + 0.5 * lunaK);
      ctx.save(); ctx.globalAlpha = 1 - lunaK;
      const halo = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
      halo.addColorStop(0, 'rgba(255,210,63,0.25)'); halo.addColorStop(1, 'rgba(255,210,63,0)');
      ctx.fillStyle = halo; ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
      luna(mx, my, mr);
      ctx.restore();
    }
    // The sun, rising from behind the mountains at dawn to high in the day
    if (hora > 0.5) {
      const sk = clamp01((hora - 0.5) / 2.5), sxx = W * 0.22, sy = G * (0.75 - 0.6 * sk), sr = mr * 1.15;
      const halo = ctx.createRadialGradient(sxx, sy, sr * 0.8, sxx, sy, sr * 4);
      halo.addColorStop(0, `rgba(255,220,120,${0.45 * clamp01(hora - 0.5)})`); halo.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = halo; ctx.fillRect(sxx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      ctx.fillStyle = rgb(mezcla([255, 140, 60], [255, 240, 170], sk), clamp01((hora - 0.5) * 2));
      ctx.beginPath(); ctx.arc(sxx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    // Two ranges of mountains: the far one slow and faint, the near one darker
    sierra(0.12, G * 0.66, G * 0.4, cielo.far, 0.55 + 0.25 * clamp01(hora), rgb(cielo.borde, 0.22), 0.8);
    sierra(0.3, G * 0.9, G * 0.32, cielo.near, 0.8 + 0.15 * clamp01(hora), rgb(cielo.borde, 0.16), 1.3);
  }
  /**
   * The moon: a crescent whose dark side follows the moon's own outline (as in Tren en Vilo), not a
   * second disc in the night's colour, which showed as a dark circle over the halo and the stars.
   * The unlit part keeps a faint earthshine, and the lit one a few soft craters.
   */
  function luna(x, y, r) {
    const ox = x + r * 0.45, oy = y - r * 0.2, ro = r * 0.88;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,233,168,0.08)'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath();
    ctx.rect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2); ctx.arc(ox, oy, ro, 0, Math.PI * 2);
    ctx.fill('evenodd');
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,210,63,0.45)';
    for (const [cx, cy, cr] of [[-0.62, -0.1, 0.13], [-0.45, 0.45, 0.09], [-0.25, 0.72, 0.07]]) { ctx.beginPath(); ctx.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  /** The height of a range's ridge at screen x. */
  const cresta = (x, par, base, alto, f) => base - alto * cumbre(x / s + cam.x * par, f);
  /** A range of mountains: a dark silhouette, its ridge faintly lit by the moon. */
  function sierra(par, base, alto, color, opacidad, borde, f) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, cresta(x, par, base, alto, f));
    ctx.lineTo(W, H); ctx.closePath();
    const gr = ctx.createLinearGradient(0, base - alto, 0, H);
    gr.addColorStop(0, rgb(color, opacidad)); gr.addColorStop(1, rgb(color, opacidad * 0.4));
    ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath();
    for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, cresta(x, par, base, alto, f));
    ctx.strokeStyle = borde; ctx.lineWidth = 1.2; ctx.stroke();
  }

  /* --- pillars and flags --- */
  function columna(p, k, now, objetivo) {
    const x = sx(p.x), w = p.w * s;
    if (p.move && objetivo) riel(pillar(lastG, k), now);
    if (x > W + 4 || x + w < -4) return;
    const gr = ctx.createLinearGradient(0, G, 0, H);
    const c = NEON[k % NEON.length];
    gr.addColorStop(0, '#2b1150'); gr.addColorStop(0.7, 'rgba(30,10,56,0.9)'); gr.addColorStop(1, 'rgba(21,7,38,0)');
    ctx.fillStyle = gr; ctx.fillRect(x, G, w, H - G);
    // Its sides, faintly lit in its color, so it stands out of the mountains
    const lado = ctx.createLinearGradient(0, G, 0, G + (H - G) * 0.7);
    lado.addColorStop(0, rgb(c, 0.45)); lado.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = lado; ctx.fillRect(x, G, 1.5, (H - G) * 0.7); ctx.fillRect(x + w - 1.5, G, 1.5, (H - G) * 0.7);
    // The neon top edge
    ctx.save(); ctx.shadowColor = rgb(c); ctx.shadowBlur = 10;
    ctx.fillStyle = rgb(c); ctx.fillRect(x, G - 1, w, 3);
    ctx.restore();
    if (k === 0) return;
    // The flag at its center: the target. The one to reach waves; a hit one stays gold
    const oro = doradas.has(k), cx = sx(p.x + p.w / 2);
    // The perfect zone, a small lit strip at the pole's foot
    ctx.fillStyle = oro ? rgb(GOLD) : objetivo ? 'rgba(255,46,136,0.95)' : 'rgba(255,46,136,0.5)';
    ctx.fillRect(cx - PERFECT * s, G - 1, PERFECT * 2 * s, 3);
    bandera(cx, k, now, oro, objetivo);
  }
  /** A moving pillar's rail: a faint dashed line along its whole swing, with an arrow at each end. */
  function riel(base, now) {
    const a = sx(base.x - base.move.amp), b = sx(base.x + base.w + base.move.amp), y = G + 9 * s;
    ctx.save();
    ctx.strokeStyle = 'rgba(46,230,214,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = QUIETO ? 0 : -now / 60;
    ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(46,230,214,0.7)';
    for (const [px, d] of [[a, -1], [b, 1]]) { ctx.beginPath(); ctx.moveTo(px + d * 5, y); ctx.lineTo(px, y - 4); ctx.lineTo(px, y + 4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function bandera(cx, k, now, oro, objetivo) {
    let esc = 1;
    if (golpe && golpe.k === k) { const t = (now - golpe.born) / 500; if (t < 1) esc = 1 + Math.sin(t * Math.PI) * 0.7; }
    const alto = (oro ? 20 : 16) * s * esc, ancho = (oro ? 13 : 10) * s * esc;
    const top = G - alto;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, 1.3 * s);
    ctx.beginPath(); ctx.moveTo(cx, G - 1); ctx.lineTo(cx, top); ctx.stroke();
    const ola = QUIETO ? 0 : Math.sin(now / (oro || objetivo ? 140 : 260) + k);
    const color = oro ? rgb(GOLD) : '#ff2e88';
    ctx.save();
    if (oro || objetivo) { ctx.shadowColor = color; ctx.shadowBlur = oro ? 14 : 8; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.quadraticCurveTo(cx + ancho * 0.5, top + ola * 2 * s, cx + ancho, top + alto * 0.22 + ola * 1.5 * s);
    ctx.quadraticCurveTo(cx + ancho * 0.5, top + alto * 0.3 - ola * 2 * s, cx, top + alto * 0.44);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* --- the stick --- */
  function palo(x0, len, ang, brillo = 0) {
    const L = len * s, a = -Math.PI / 2 + ang;
    const x1 = x0 + Math.cos(a) * L, y1 = G - 1 + Math.sin(a) * L;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = brillo ? rgb(GOLD) : 'rgba(255,210,63,0.6)'; ctx.shadowBlur = brillo ? 16 : 6;
    ctx.strokeStyle = brillo ? '#fff2b0' : '#ffd23f'; ctx.lineWidth = Math.max(2.5, 3.2 * s);
    ctx.beginPath(); ctx.moveTo(x0, G - 1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  /* --- the ninja --- */
  /**
   * The ninja, its feet at (x, y): a dark hood with a rim of light (so it reads on the night), the eye slit,
   * a pink headband whose tails fly behind it as it runs, and legs that move.
   */
  function ninja(x, y, now, { corre = false, rot = 0, salto = 0, manos = null, paso: pasoFijo = null } = {}) {
    const u = s * (compacto ? 0.95 : 1), w = NINJA * u, h = NINJA * 1.2 * u;
    ctx.save();
    ctx.translate(x, y - salto * u);
    if (rot) ctx.rotate(rot);
    // A soft halo behind
    const halo = ctx.createRadialGradient(0, -h * 0.55, 2, 0, -h * 0.55, h * 1.3);
    halo.addColorStop(0, 'rgba(46,230,214,0.22)'); halo.addColorStop(1, 'rgba(46,230,214,0)');
    ctx.fillStyle = halo; ctx.fillRect(-h * 1.4, -h * 2, h * 2.8, h * 2.6);
    // Legs
    const paso = pasoFijo ?? (corre && !QUIETO ? Math.sin(now / 45) : 0);
    ctx.fillStyle = '#0d0619';
    ctx.fillRect(-w * 0.32 + paso * w * 0.12, -h * 0.28, w * 0.24, h * 0.28);
    ctx.fillRect(w * 0.08 - paso * w * 0.12, -h * 0.28, w * 0.24, h * 0.28);
    // The headband's tails, behind the head, flying
    const viento = corre ? 1 : 0.35, ondea = QUIETO ? 0 : Math.sin(now / (corre ? 60 : 300));
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = Math.max(1.5, 2 * u); ctx.lineCap = 'round';
    for (const [dy, k] of [[0, 1], [2.2 * u, 0.75]]) {
      ctx.beginPath(); ctx.moveTo(-w * 0.45, -h * 0.72 + dy);
      ctx.quadraticCurveTo(-w * (0.45 + 0.5 * viento), -h * 0.72 + dy + ondea * 3 * u * k, -w * (0.45 + 1.05 * viento * k), -h * (0.72 - 0.12 * (1 - viento)) + dy - ondea * 2 * u);
      ctx.stroke();
    }
    // Body and hood: one rounded shape, with a rim of light
    const r = w * 0.42;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.26); ctx.lineTo(-w / 2, -h + r);
    ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + r, -h); ctx.lineTo(w / 2 - r, -h);
    ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + r); ctx.lineTo(w / 2, -h * 0.26); ctx.closePath();
    ctx.fillStyle = '#140a26'; ctx.fill();
    ctx.strokeStyle = 'rgba(190,160,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    // The headband
    ctx.fillStyle = '#ff2e88'; ctx.fillRect(-w / 2, -h * 0.8, w, 2.2 * u);
    // The eye slit and the eyes, looking ahead
    ctx.fillStyle = '#ffd9b8'; ctx.fillRect(-w * 0.1, -h * 0.66, w * 0.58, 3 * u);
    ctx.fillStyle = '#140a26';
    ctx.fillRect(w * 0.08, -h * 0.64, 1.6 * u, 1.8 * u); ctx.fillRect(w * 0.3, -h * 0.64, 1.6 * u, 1.8 * u);
    // A belt
    ctx.fillStyle = 'rgba(46,230,214,0.7)'; ctx.fillRect(-w / 2, -h * 0.4, w, 1.4 * u);
    // Arms, only while it climbs or throws: shoulder to hand, hands given relative to (x, y)
    if (manos) {
      ctx.lineCap = 'round';
      for (const [hx, hy] of manos) {
        const lx = hx, ly = hy + salto * u, sx0 = Math.sign(lx || 1) * w * 0.32;
        ctx.strokeStyle = 'rgba(190,160,255,0.55)'; ctx.lineWidth = Math.max(2.5, 3.6 * u);
        ctx.beginPath(); ctx.moveTo(sx0, -h * 0.68); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.strokeStyle = '#140a26'; ctx.lineWidth = Math.max(1.5, 2.4 * u);
        ctx.beginPath(); ctx.moveTo(sx0, -h * 0.68); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(lx, ly, Math.max(1.2, 1.7 * u), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* --- what celebrates --- */
  function efectos(now, dt) {
    if (destello) {
      const k = (now - destello) / 450;
      if (k >= 1) destello = 0;
      else { ctx.fillStyle = `rgba(255,210,63,${0.12 * (1 - k)})`; ctx.fillRect(0, 0, W, H); }
    }
    for (let i = pulsos.length - 1; i >= 0; i--) {
      const p = pulsos[i], k = (now - p.born) / 750;
      if (k < 0) continue;
      if (k >= 1) { pulsos.splice(i, 1); continue; }
      const r = (4 + easeOut(k) * p.max) * s;
      ctx.save();
      ctx.shadowColor = rgb(p.color); ctx.shadowBlur = 14;
      ctx.strokeStyle = rgb(p.color, 1 - k); ctx.lineWidth = Math.max(1, 4 * (1 - k) * s);
      ctx.beginPath(); ctx.arc(sx(p.x), p.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (let i = chispas.length - 1; i >= 0; i--) {
      const c = chispas[i], k = (now - c.born) / c.life;
      if (k >= 1) { chispas.splice(i, 1); continue; }
      c.vy += 380 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const r = c.size * (1 - k) + 0.6;
      ctx.fillStyle = rgb(c.color, 1 - k); ctx.fillRect(sx(c.x) - r, c.y - r, r * 2, r * 2);
    }
    for (let i = flotan.length - 1; i >= 0; i--) {
      const f = flotan[i], k = (now - f.born) / 1000;
      if (k >= 1) { flotan.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.font = `${Math.round(22 * s * (1 + 0.25 * Math.sin(Math.min(1, k * 3) * Math.PI)))}px Bangers, Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(21,7,38,0.9)'; ctx.fillStyle = f.color;
      const y = f.y - easeOut(k) * 46 * s;
      ctx.strokeText(f.text, sx(f.x), y); ctx.fillText(f.text, sx(f.x), y);
      ctx.restore();
    }
  }
  const lluvia = (x, y, n, colores, fuerza = 1) => {
    if (QUIETO) return;
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4, v = (120 + Math.random() * 180) * fuerza;
      chispas.push({ x, y, vx: Math.cos(a) * v / s, vy: Math.sin(a) * v, born: now, life: 600 + Math.random() * 400, color: colores[i % colores.length], size: 2 + Math.random() * 2.5 });
    }
  };

  /** One frame. `reloj` is the game's clock (frozen while paused); `now` moves the rest. */
  let lastG = null;
  function draw(g, now, reloj = now) {
    lastG = g;
    const dt = ultimo ? Math.min(0.05, (now - ultimo) / 1000) : 0;
    ultimo = now;
    camara(now);
    ctx.clearRect(0, 0, W, H);
    fondo(now, dt, g.score);

    const w = g.walk, i = g.i;
    // The pillars in sight
    for (let k = Math.max(0, i - 2); k <= i + 3; k++) columna(pillarAt(g, k, reloj), k, now, k === i + 1 && g.phase !== 'over');

    // The last bridge, still across its gap
    if (previo) palo(sx(previo.x0), previo.len, Math.PI / 2);
    // The stick: growing, falling across, lying, or dropping into the gap at the end
    const x0 = sx(current(g).x + current(g).w);
    let ninjaX = restX(current(g)), corre = false;
    if (g.phase === 'growing' || g.phase === 'held') palo(x0, stickAt(g, reloj), 0);
    else if (w && (g.phase === 'walking' || g.phase === 'lost' || g.phase === 'over')) {
      const k = clamp01((reloj - (w.t0 - TURN_MS)) / TURN_MS);
      let ang = easeIn(k) * Math.PI / 2;
      // A short stick has nothing under its tip: it keeps swinging down into the gap as soon as it is across
      if (w.kind === 'short') ang += easeIn(clamp01((reloj - w.t0) / 380)) * Math.PI / 2;
      else if ((muerte || rescate) && !w.ok) ang = Math.PI / 2 + easeIn(clamp01((now - hundido) / 380)) * Math.PI / 2;
      palo(x0, g.stick, ang, w.kind === 'perfect' && k >= 1 ? 1 : 0);
      if (g.phase === 'walking') { ninjaX = runX(w, reloj); corre = reloj >= w.t0; }
    }

    // The ninja: standing, running (on top or hanging under), or falling at the end
    if (rescate) agarre(g, now);
    else if (muerte) {
      const m = muerte;
      m.vy += 1500 * dt; m.y += m.vy * dt; m.x += m.vx * dt; m.rot += m.vr * dt;
      if (m.y < H + 60) ninja(sx(m.x), m.y, now, { rot: m.rot });
    } else {
      const salto = g.phase === 'ready' && efectoSalto(now);
      ninja(sx(ninjaX), G - 1, now, { corre, salto: salto || 0 });
    }
    efectos(now, dt);
  }
  let saltoDesde = 0;

  /**
   * The way back after a lost life: the ninja peeks up from below, swings the grapple up in an arc with
   * the rope trailing slack, the hook bites the pillar's edge and the rope snaps taut, then the ninja climbs
   * hand over hand, in pulls (TIRONES), swaying a little, and pulls itself over the edge (RESCATE_MS).
   */
  function agarre(g, now) {
    const t = now - rescate.born, ax = sx(rescate.x), top = G - 1;
    const u = s * (compacto ? 0.95 : 1), h = NINJA * 1.2 * u;
    const fase = (desde, ms) => clamp01((t - desde) / ms);
    const t1 = ASOMA_MS, t2 = t1 + GANCHO_MS, t3 = t2 + TENSA_MS, t4 = t3 + SUBIDA_MS;
    const asoma = fase(0, ASOMA_MS), tiro = fase(t1, GANCHO_MS), tensa = fase(t2, TENSA_MS);
    const sube = fase(t3, SUBIDA_MS), salta = fase(t4, SALTO_MS);
    const suave = k => k * k * (3 - 2 * k);
    // The rope hangs out in the gap, clear of the pillar's wall, so it reads as a rope: the hook bites the
    // edge and the rope bends over the lip out to `aire` before it drops
    const aire = 14 * s, lipX = ax + aire, lipY = top + 7 * s;
    const hang = lipX + NINJA * 0.5 * u;
    const y0 = H + h * 0.45, yArriba = top + h * 0.95;   // feet: just the head showing / the head over the edge
    /**
     * A rope along a curve (a quadratic from puntos[0] through puntos[1] to puntos[2]), with soft bends: a
     * sideways wave of `amp` that is still at both ends and drifts along it at `fase`, so it looks like rope.
     */
    const cuerda = (puntos, alfa = 0.85, amp = 0, fase = 0) => {
      const [[x0, y0], [x1, y1], [x2, y2]] = puntos, N = 28;
      ctx.save();
      ctx.strokeStyle = `rgba(230,220,255,${alfa})`; ctx.lineWidth = Math.max(1, 1.6 * s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const k = i / N, a = (1 - k) ** 2, b = 2 * (1 - k) * k, c = k * k;
        const x = a * x0 + b * x1 + c * x2, y = a * y0 + b * y1 + c * y2;
        const dx = 2 * (1 - k) * (x1 - x0) + 2 * k * (x2 - x1), dy = 2 * (1 - k) * (y1 - y0) + 2 * k * (y2 - y1);
        const l = Math.hypot(dx, dy) || 1, w = QUIETO ? 0 : amp * Math.sin(Math.PI * k) * (Math.sin(k * 9 + fase) * 0.7 + Math.sin(k * 17 - fase * 1.3) * 0.3);
        const px = x - dy / l * w, py = y + dx / l * w;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke(); ctx.restore();
    };
    const gancho = (x, y, ang, alfa = 1) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alfa;
      ctx.strokeStyle = '#2ee6d6'; ctx.lineWidth = Math.max(1.5, 2.4 * s); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 6 * s); ctx.lineTo(0, -2 * s);
      ctx.moveTo(0, -2 * s); ctx.quadraticCurveTo(-5 * s, -2 * s, -5 * s, 3 * s);
      ctx.moveTo(0, -2 * s); ctx.quadraticCurveTo(5 * s, -2 * s, 5 * s, 3 * s);
      ctx.stroke(); ctx.restore();
    };

    // 1–2. Peeking up, then the throw: the hook flies in an arc, over the edge and down onto it
    if (t < t2) {
      const y = y0 + (h * 0.6) * (1 - easeOut(asoma));
      const manoX = hang + NINJA * 0.1 * u, manoY = y - h * (asoma < 1 ? 0.9 : 0.9 + 0.35 * Math.sin(Math.min(1, tiro * 2.5) * Math.PI / 2));
      if (asoma >= 1) {
        const k = tiro, gx = manoX + (ax - manoX) * k;
        const gy = manoY + (top - manoY) * easeOut(k) - Math.sin(k * Math.PI) * 46 * s;
        const slack = (1 - k) * 30 * s + 8 * s;
        cuerda([[manoX, manoY], [(manoX + gx) / 2 + 10 * s, (manoY + gy) / 2 + slack], [gx, gy]], 0.85, (1 - k) * 7 * s + 2.5 * s, now / 90);
        gancho(gx, gy, (1 - k) * 4 * Math.PI);
      }
      ninja(hang, y, now, { manos: [[manoX - hang, manoY - y], [-NINJA * 0.2 * u, -h * 0.5]], paso: 0.4 });
      return;
    }

    // 3–5. The rope taut from the edge, the climb in pulls, then over the top
    const vibra = tensa < 1 ? Math.sin(tensa * 26) * (1 - tensa) * 5 * s : 0;
    const balanceo = QUIETO ? 0 : Math.sin(now / 420) * (salta > 0 ? 0 : 1);
    const pie = H + 10, ropeAlfa = 0.85 * (1 - salta);
    const ropeBase = lipX + balanceo * 6 * s + vibra;
    if (ropeAlfa > 0) {
      cuerda([[ax, top], [lipX - aire * 0.1, top - 1 * s], [lipX, lipY]], ropeAlfa);
      cuerda([[lipX, lipY], [lipX + vibra * 2, (lipY + pie) / 2], [ropeBase, pie]], ropeAlfa, (1 - tensa) * 5 * s + 1.6 * s, now / 380);
      gancho(ax, top - 4 * s, Math.PI, 1 - salta);
    }
    if (salta <= 0) {
      // Each pull: a reach (the free hand goes up the rope) then a heave (the body rises, the grip holds)
      const p = sube * TIRONES, n = Math.min(TIRONES - 1, Math.floor(p)), f = p - n;
      const alto = n => y0 - (y0 - yArriba) * (n / TIRONES);
      const heave = suave(clamp01((f - 0.4) / 0.6));
      const jolt = tensa < 1 ? -Math.sin(tensa * Math.PI) * 6 * s : 0;
      const y = sube >= 1 ? yArriba : alto(n) + (alto(n + 1) - alto(n)) * heave + jolt;
      const ropeX = y2 => lipX + (ropeBase - lipX) * clamp01((y2 - lipY) / (pie - lipY));
      const agarra = n => alto(n + 1) - h * 1.15;               // where the top hand grips for pull n
      const alcanza = suave(clamp01(f / 0.4));
      const arriba = sube >= 1 ? agarra(TIRONES - 1) : agarra(n - 1) + (agarra(n) - agarra(n - 1)) * alcanza;
      const abajo = agarra(n - 1);
      const manoA = [ropeX(arriba) - hang, arriba - y], manoB = [ropeX(abajo) - hang, Math.min(abajo - y, -h * 0.55)];
      const cuerpoX = hang + (ropeX(y - h * 0.6) - lipX);
      ninja(cuerpoX, y, now, {
        manos: n % 2 ? [manoB, manoA] : [manoA, manoB],
        paso: Math.sin((n + heave) * Math.PI) * 0.8,
        rot: balanceo * 0.06,
      });
    } else {
      // Over the edge: hands on the top, a heave up, a knee over, then standing at the rest spot
      const sube2 = suave(clamp01(salta / 0.55)), avanza = suave(clamp01((salta - 0.35) / 0.65));
      const x = hang + (sx(restX(current(g))) - hang) * avanza;
      const y = yArriba + (top - yArriba) * sube2;
      const manos = salta < 0.7 ? [[ax - x, top - y], [ax + 8 * u - x, top - y]] : null;
      ninja(x, y, now, { manos, rot: -0.35 * Math.sin(salta * Math.PI) * (1 - avanza * 0.5), paso: salta < 0.6 ? 0.9 : 0 });
    }
  }
  const efectoSalto = now => { const k = (now - saltoDesde) / 380; return k >= 0 && k < 1 && !QUIETO ? Math.sin(k * Math.PI) * 9 : 0; };

  return {
    draw,
    /** A new game: the camera on its start, nothing celebrating. */
    empezar(g) {
      cam.x = cam.from = cam.to = current(g).x + current(g).w - HOLD_X; cam.t0 = 0;
      pulsos.length = chispas.length = flotan.length = 0; doradas.clear();
      previo = null; muerte = null; golpe = null; destello = 0;
    },
    /** The stick just landed with its tip on the flag: the emerging pulse, sparks, the flag pops and turns gold. */
    perfecto(g, tip, racha) {
      const now = performance.now(), k = g.i + 1, y = G - 1;
      doradas.add(k); golpe = { k, born: now };
      if (QUIETO) return;
      const max = 46 + Math.min(racha, MAX_BONUS) * 10;
      [[46, 230, 214], [255, 46, 136], GOLD].forEach((c, j) => pulsos.push({ x: tip, y, born: now + j * 120, color: c, max: max + j * 8 }));
      destello = now;
      lluvia(tip, y, 18 + racha * 3, [GOLD, [255, 46, 136], [46, 230, 214], [157, 255, 58]], 1 + racha * 0.08);
    },
    /** A plain landing: a little dust where the tip hit. */
    toque(tip) { lluvia(tip, G - 1, 6, [[255, 255, 255], [190, 160, 255]], 0.5); },
    /** Points rising from where they were won. */
    puntos(x, text, color = '#ffd23f') { flotan.push({ x, y: G - 30 * s, text, born: performance.now(), color }); },
    /** The ninja is on the next pillar: the camera slides, the bridge stays lying behind. */
    llegar(g, prevX0, len, perfecto) {
      previo = { x0: prevX0, len };
      cam.from = cam.x; cam.to = current(g).x + current(g).w - HOLD_X; cam.t0 = performance.now();
      if (perfecto) saltoDesde = performance.now();
    },
    /** The end: the ninja drops into the gap from where it ran to (the stick's tip, or the edge under a short one). */
    caer(g, kind) {
      hundido = performance.now();
      muerte = { kind, born: hundido, x: g.walk.to, y: G - 1, vy: -60, vx: 10, rot: 0, vr: 3 };
    },
    /** A life lost, not the last: the rope from below and the climb back up (RESCATE_MS). */
    rescatar(g) { muerte = null; rescate = QUIETO ? null : { born: performance.now(), x: current(g).x + current(g).w - 2 }; },
    /** The ninja is back on its pillar, the fallen stick gone. */
    revivir() { muerte = null; rescate = null; saltoDesde = performance.now(); },
    cerrar() { ro.disconnect(); },
  };
}

/** The moment of a touch, on performance.now()'s clock (an old browser's epoch timestamp is not trusted). */
export const momento = ev => {
  const ahora = performance.now(), t = ev?.timeStamp;
  return typeof t === 'number' && t > 0 && t <= ahora + 50 && t >= ahora - 1000 ? t : ahora;
};
