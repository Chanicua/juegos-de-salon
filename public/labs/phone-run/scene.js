/**
 * Duende — the drawing (lab). The track in pseudo-3D, seen from behind the runner, on a canvas; the
 * gnome in his two looks: the old one, in big pixels on a TV (the intro), and the game room's one,
 * round and shiny (the cover and the game). Nothing here decides anything: the engine does.
 */
import { SECTOR, height, laneAt, ducking, inAir, still } from './engine.js';

const LANE_W = 2.2;          // meters between lane centers
const ROAD = 3.5;            // the road's half width, in meters
const D0 = 5;                // the camera's distance behind the runner
const VIEW = 85;             // how far ahead is drawn
const BAND = 2.5;            // the ground's stripes, in meters

/** The four landscapes, one a stretch, in turn. */
export const THEMES = [
  { name: 'bosque', sky: ['#120630', '#3b1d6e', '#7a3f8f'], hills: '#2a1452', grass: ['#2f9a52', '#288a49'], road: ['#9a7350', '#8c6847'], edge: ['#ffd23f', '#ff5fa2'], decor: 'pino' },
  { name: 'nieve', sky: ['#0d1b3d', '#2c4a85', '#7fa6d9'], hills: '#e8f0fb', grass: ['#e3ebf7', '#d3ddee'], road: ['#6f7d91', '#667387'], edge: ['#5ee7ff', '#ffffff'], decor: 'nevado' },
  { name: 'desierto', sky: ['#2b0f3a', '#a3416b', '#ffb36b'], hills: '#7a3552', grass: ['#e8be6c', '#dcb160'], road: ['#b5814b', '#a87642'], edge: ['#ff7a3d', '#ffe08a'], decor: 'cactus' },
  { name: 'noche', sky: ['#05030f', '#140b33', '#2a1a5e'], hills: '#0e0826', grass: ['#1f3d57', '#1b364d'], road: ['#3b3654', '#34304b'], edge: ['#a8fff6', '#c08bff'], decor: 'farol' },
];
export const themeOf = s => THEMES[s % THEMES.length];

/* ------------------------------------------------------------------ */
/* The canvas                                                          */
/* ------------------------------------------------------------------ */

/** A canvas that keeps its pixels in step with its size on screen. */
function lienzo(canvas) {
  const ctx = canvas.getContext('2d');
  const size = { w: 0, h: 0, dpr: 1 };
  const fit = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (r.width === size.w && r.height === size.h && dpr === size.dpr) return;
    Object.assign(size, { w: r.width, h: r.height, dpr });
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  ro?.observe(canvas);
  fit();
  return { ctx, size, fit, cerrar: () => ro?.disconnect() };
}

/* ------------------------------------------------------------------ */
/* The track                                                           */
/* ------------------------------------------------------------------ */

/** The scene of a game on `canvas`: draw(g, now) paints the track at that moment. */
export function escena(canvas) {
  const L = lienzo(canvas);
  const draw = (g, now, frozen = now) => {
    L.fit();
    const { ctx, size: { w: W, h: H, dpr } } = L;
    if (!W || !H) return;
    const t = frozen;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const th = themeOf(g.s);
    const hz = H * 0.34, base = H * 0.9;
    const k = d => D0 / (d + D0);
    const Y = d => hz + (base - hz) * k(d);
    const px0 = (W * 0.47) / ROAD;
    const S = d => px0 * k(d);                          // pixels a meter, at depth d
    const lv = laneAt(g, t);
    const sway = (lv - 1) * LANE_W * 0.18;              // the camera leans a little toward the runner's lane
    const X = (xm, d) => W / 2 + (xm - sway) * S(d);

    // The sky, its stars and the hills
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.6, th.sky[1]); sky.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 26; i++) {
      const sx = (i * 97.3 + 13) % W, sy = (i * 41.7) % (hz * 0.7), tw = 0.5 + 0.5 * Math.sin(now / 500 + i);
      ctx.globalAlpha = th.name === 'desierto' ? 0.3 * tw : 0.35 + 0.5 * tw;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // The moon (or the sun, in the desert)
    const mx = W * 0.78 - sway * 4, my = hz * 0.38;
    const moon = ctx.createRadialGradient(mx, my, 2, mx, my, 34);
    moon.addColorStop(0, th.name === 'desierto' ? '#fff3c4' : '#fffbe8'); moon.addColorStop(0.45, th.name === 'desierto' ? '#ffcf6b' : '#f2e6ff'); moon.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = th.hills;
    ctx.beginPath(); ctx.moveTo(0, hz + 1);
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * W - sway * 6, hgt = 18 + 22 * Math.abs(Math.sin(i * 1.7 + 0.6)) + 10 * Math.sin(i * 3.1);
      ctx.lineTo(x, hz - hgt);
    }
    ctx.lineTo(W, hz + 1); ctx.closePath(); ctx.fill();

    // The ground, in stripes that run toward the runner
    const zp = g.z;
    const first = Math.floor((zp + VIEW) / BAND);
    for (let i = first; i * BAND > zp - 4; i--) {
      const far = i * BAND + BAND - zp, near = Math.max(-4, i * BAND - zp);
      if (far <= -4) continue;
      const yf = Y(Math.min(far, VIEW)), yn = Y(near);
      if (yn <= yf) continue;
      const odd = ((i % 2) + 2) % 2;
      ctx.fillStyle = th.grass[odd]; ctx.fillRect(0, yf, W, yn - yf + 1);
      quad(ctx, X(-ROAD, far), X(ROAD, far), yf, X(-ROAD, near), X(ROAD, near), yn, th.road[odd]);
      quad(ctx, X(-ROAD - 0.35, far), X(-ROAD, far), yf, X(-ROAD - 0.35, near), X(-ROAD, near), yn, th.edge[odd]);
      quad(ctx, X(ROAD, far), X(ROAD + 0.35, far), yf, X(ROAD, near), X(ROAD + 0.35, near), yn, th.edge[odd]);
      if (odd) for (const x of [-LANE_W / 2, LANE_W / 2]) quad(ctx, X(x - 0.07, far), X(x + 0.07, far), yf, X(x - 0.07, near), X(x + 0.07, near), yn, 'rgba(255,255,255,0.55)');
    }
    // The checkpoint's line and arch, when it is in sight
    const gate = (g.s + 1) * SECTOR - zp;

    // What stands on the track, far to near: scenery, obstacles, coins, the checkpoint and the runner
    const things = [];
    for (let z = Math.floor((zp - 2) / 9) * 9; z < zp + VIEW; z += 9) {
      const d = z - zp;
      if (d < -3) continue;
      const n = Math.abs(Math.round(z / 9));
      things.push({ d, f: () => decor(ctx, th.decor, X(-ROAD - 1.4 - (n % 3) * 0.9, d), Y(d), S(d), n, now) });
      things.push({ d: d + 4.5, f: () => decor(ctx, th.decor, X(ROAD + 1.4 + ((n + 1) % 3) * 0.9, d + 4.5), Y(d + 4.5), S(d + 4.5), n + 7, now) });
    }
    for (const o of g.track.obstacles) {
      const d = o.z - zp;
      if (d < -3 || d > VIEW) continue;
      things.push({ d, f: () => obstaculo(ctx, o, d, X, Y, S, now) });
    }
    for (const c of g.track.coins) {
      const d = c.z - zp;
      if (d < -3 || d > VIEW || g.got.has(c.id)) continue;
      things.push({ d, f: () => moneda(ctx, X((c.lane - 1) * LANE_W, d), Y(d), S(d), now + c.z * 40) });
    }
    if (gate > -3 && gate < VIEW) things.push({ d: gate, f: () => arco(ctx, X, Y, S, gate, g.s + 2, now) });
    things.push({
      d: 0.01, f: () => {
        const h = height(g, t), duck = ducking(g, t), x = X((lv - 1) * LANE_W, 0);
        // The shadow stays on the ground and shrinks as he goes up
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(x, Y(0), S(0) * 0.45 * (1 - h / 4), S(0) * 0.12 * (1 - h / 4), 0, 0, Math.PI * 2); ctx.fill();
        const running = !still(g, t) && !inAir(g, t);
        gnomo(ctx, x, Y(0) - h * S(0), S(0), { back: true, phase: running ? zp * 1.6 : 0, duck, hit: g.hitAt !== null ? t - g.hitAt : null, air: inAir(g, t) });
      },
    });
    things.sort((a, b) => b.d - a.d).forEach(x => x.f());

    // A fog at the horizon, so things come out of it instead of popping in
    const fog = ctx.createLinearGradient(0, hz - 4, 0, hz + (base - hz) * 0.12);
    fog.addColorStop(0, th.sky[2]); fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.75; ctx.fillStyle = fog; ctx.fillRect(0, hz - 4, W, (base - hz) * 0.12 + 4); ctx.globalAlpha = 1;
  };
  return { draw, cerrar: L.cerrar };
}

function quad(ctx, x1, x2, y1, x3, x4, y2, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.lineTo(x4, y2 + 0.5); ctx.lineTo(x3, y2 + 0.5); ctx.closePath(); ctx.fill();
}

function decor(ctx, kind, x, y, s, n, now) {
  const big = 0.85 + (n % 4) * 0.12;
  s *= big;
  if (kind === 'pino' || kind === 'nevado') {
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 0.15 * s, y - 0.9 * s, 0.3 * s, 0.9 * s);
    const greens = kind === 'nevado' ? ['#1f5f4a', '#256d55', '#2c7b60'] : ['#1d6b3f', '#22804a', '#2a9656'];
    for (let i = 0; i < 3; i++) {
      const by = y - (0.7 + i * 0.9) * s, w = (1.25 - i * 0.3) * s;
      ctx.fillStyle = greens[i];
      ctx.beginPath(); ctx.moveTo(x - w, by); ctx.lineTo(x + w, by); ctx.lineTo(x, by - 1.5 * s); ctx.closePath(); ctx.fill();
      if (kind === 'nevado') { ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(x - w * 0.35, by - 0.95 * s); ctx.lineTo(x + w * 0.35, by - 0.95 * s); ctx.lineTo(x, by - 1.5 * s); ctx.closePath(); ctx.fill(); }
    }
  } else if (kind === 'cactus') {
    ctx.fillStyle = '#2f9a5a';
    pill(ctx, x - 0.28 * s, y - 2.6 * s, 0.56 * s, 2.6 * s, 0.28 * s);
    pill(ctx, x - 0.95 * s, y - 1.9 * s, 0.4 * s, 1.0 * s, 0.2 * s); ctx.fillRect(x - 0.75 * s, y - 1.1 * s, 0.6 * s, 0.32 * s);
    pill(ctx, x + 0.55 * s, y - 2.3 * s, 0.4 * s, 1.1 * s, 0.2 * s); ctx.fillRect(x + 0.2 * s, y - 1.5 * s, 0.55 * s, 0.32 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 0.12 * s, y - 2.4 * s, 0.08 * s, 2.2 * s);
  } else {
    // A lamp post, with its glow
    ctx.fillStyle = '#2a2440'; ctx.fillRect(x - 0.08 * s, y - 3.6 * s, 0.16 * s, 3.6 * s);
    const ly = y - 3.75 * s, glow = ctx.createRadialGradient(x, ly, 0, x, ly, 1.6 * s);
    const hue = ['255,210,63', '168,255,246', '255,95,162'][n % 3];
    glow.addColorStop(0, `rgba(${hue},0.95)`); glow.addColorStop(0.25, `rgba(${hue},0.45)`); glow.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, ly, 1.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, ly, 0.22 * s, 0, Math.PI * 2); ctx.fill();
  }
}

function pill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
}

function obstaculo(ctx, o, d, X, Y, S, now) {
  const s = S(d), y = Y(d);
  if (o.kind === 'tronco') {
    const x1 = X(-ROAD + 0.1, d), x2 = X(ROAD - 0.1, d), h = 0.75 * s;
    const grad = ctx.createLinearGradient(0, y - h, 0, y);
    grad.addColorStop(0, '#b07a4a'); grad.addColorStop(0.5, '#8a5a33'); grad.addColorStop(1, '#5e3b20');
    ctx.fillStyle = grad; pill(ctx, x1, y - h, x2 - x1, h, h / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, s * 0.05);
    for (let i = 1; i < 6; i++) { const xx = x1 + (x2 - x1) * i / 6; ctx.beginPath(); ctx.moveTo(xx, y - h * 0.8); ctx.lineTo(xx + h * 0.4, y - h * 0.3); ctx.stroke(); }
    ctx.fillStyle = '#e3b884'; ctx.beginPath(); ctx.ellipse(x2 - h * 0.25, y - h / 2, h * 0.25, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9b6a3e'; ctx.beginPath(); ctx.ellipse(x2 - h * 0.25, y - h / 2, h * 0.12, h * 0.24, 0, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  if (o.kind === 'rama') {
    // Two posts and a leafy branch across, at head height: only ducking gets under
    const xl = X(-ROAD - 0.2, d), xr = X(ROAD + 0.2, d);
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(xl - 0.15 * s, y - 2.3 * s, 0.3 * s, 2.3 * s); ctx.fillRect(xr - 0.15 * s, y - 2.3 * s, 0.3 * s, 2.3 * s);
    ctx.fillStyle = '#7a4f2e'; pill(ctx, xl, y - 2.05 * s, xr - xl, 0.42 * s, 0.2 * s);
    for (let i = 0; i <= 8; i++) {
      const xx = xl + (xr - xl) * i / 8, yy = y - (1.25 + 0.25 * Math.sin(i * 1.9)) * s;
      ctx.fillStyle = i % 2 ? '#2a9656' : '#22804a';
      ctx.beginPath(); ctx.ellipse(xx, yy - 0.25 * s, 0.45 * s, 0.32 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff5fa2';
    for (let i = 1; i < 8; i += 2) { const xx = xl + (xr - xl) * i / 8; ctx.beginPath(); ctx.arc(xx, y - 1.45 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  for (const lane of o.lanes) {
    const x = X((lane - 1) * LANE_W, d);
    if (o.kind === 'roca') {
      const grad = ctx.createRadialGradient(x - 0.3 * s, y - 0.75 * s, 0.1 * s, x, y - 0.4 * s, 0.95 * s);
      grad.addColorStop(0, '#c9c3d6'); grad.addColorStop(1, '#5c5670');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - 0.8 * s, y); ctx.quadraticCurveTo(x - 0.9 * s, y - 0.7 * s, x - 0.3 * s, y - 0.95 * s);
      ctx.quadraticCurveTo(x + 0.35 * s, y - 1.15 * s, x + 0.75 * s, y - 0.55 * s); ctx.quadraticCurveTo(x + 0.95 * s, y - 0.15 * s, x + 0.8 * s, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - 0.3 * s, y - 0.75 * s, 0.18 * s, 0.09 * s, -0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      // The cart: too tall to jump, with its load of gold
      const w = 1.75 * s, h = 1.5 * s, top = y - 0.45 * s - h;
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - w * 0.3 + i * w * 0.2, top + 0.05 * s, 0.25 * s, Math.PI, 0); ctx.fill(); }
      const grad = ctx.createLinearGradient(0, top, 0, top + h);
      grad.addColorStop(0, '#e2445c'); grad.addColorStop(1, '#8e1f3a');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w * 0.42, top + h); ctx.lineTo(x - w * 0.42, top + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - w / 2, top, w, 0.14 * s); ctx.fillRect(x - w * 0.45, top + h * 0.5, w * 0.9, 0.1 * s);
      ctx.fillStyle = '#2a2440';
      for (const dx of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(x + dx * w * 0.7, y - 0.3 * s, 0.3 * s, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#c9c3d6';
      for (const dx of [-0.5, 0.5]) { ctx.beginPath(); ctx.arc(x + dx * w * 0.7, y - 0.3 * s, 0.11 * s, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

function moneda(ctx, x, y, s, t) {
  const r = 0.36 * s, cy = y - (0.75 + 0.08 * Math.sin(t / 180)) * s, sq = Math.max(0.15, Math.abs(Math.cos(t / 260)));
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createLinearGradient(x - r, cy - r, x + r, cy + r);
  grad.addColorStop(0, '#fff3a6'); grad.addColorStop(0.5, '#ffd23f'); grad.addColorStop(1, '#d99a1e');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(x, cy, r * sq, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,100,10,0.7)'; ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath(); ctx.ellipse(x, cy, r * sq * 0.62, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
}

function arco(ctx, X, Y, S, d, n, now) {
  const y = Y(d), s = S(d), xl = X(-ROAD - 0.4, d), xr = X(ROAD + 0.4, d);
  // The checkered line on the ground
  const cells = 12, cw = (xr - xl) / cells, ch = Math.max(1.5, 0.35 * s);
  for (let i = 0; i < cells; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#1b1030'; ctx.fillRect(xl + i * cw, y - ch, cw + 0.5, ch); }
  // Two posts and a banner with the next stretch's number
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(xl - 0.12 * s, y - 3.6 * s, 0.24 * s, 3.6 * s); ctx.fillRect(xr - 0.12 * s, y - 3.6 * s, 0.24 * s, 3.6 * s);
  const by = y - 3.9 * s, bh = 0.8 * s;
  const grad = ctx.createLinearGradient(xl, 0, xr, 0);
  grad.addColorStop(0, '#ff5fa2'); grad.addColorStop(0.5, '#c08bff'); grad.addColorStop(1, '#5ee7ff');
  ctx.fillStyle = grad; pill(ctx, xl - 0.2 * s, by, xr - xl + 0.4 * s, bh, bh / 3);
  if (bh > 8) {
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(bh * 0.62)}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`📍 TRAMO ${n}`, (xl + xr) / 2, by + bh / 2 + 1);
  }
}

/* ------------------------------------------------------------------ */
/* The gnome, round and shiny                                          */
/* ------------------------------------------------------------------ */

/**
 * The gnome standing at (x, y) (his feet), `s` pixels a meter, about 1.6 m tall. `back` draws him
 * from behind (running), else from the front (waving). `phase` moves his feet; `duck` squashes him;
 * `hit` (ms since a hit) tilts him with stars over his head; `wave` (ms) moves his arm.
 */
export function gnomo(ctx, x, y, s, { back = false, phase = 0, duck = false, hit = null, air = false, wave = null } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (hit !== null) ctx.rotate(Math.sin(hit / 60) * 0.25 * Math.max(0, 1 - hit / 900));
  ctx.scale(s, duck ? s * 0.58 : s);
  ctx.lineJoin = 'round';
  const step = Math.sin(phase), bob = air ? 0 : Math.abs(Math.cos(phase)) * 0.05;
  ctx.translate(0, -bob);
  // Feet
  ctx.fillStyle = '#6b3d1f';
  ctx.beginPath(); ctx.ellipse(-0.18, -0.06 + (air ? -0.08 : Math.max(0, step) * -0.12), 0.15, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.18, -0.06 + (air ? -0.08 : Math.max(0, -step) * -0.12), 0.15, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  // Body: a blue coat
  const coat = ctx.createLinearGradient(-0.4, -1, 0.4, 0);
  coat.addColorStop(0, '#6aa8ff'); coat.addColorStop(1, '#2f5fc4');
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, -0.52, 0.4, 0.46, 0, 0, Math.PI * 2); ctx.fill();
  // Arms
  const arm = (side, up) => {
    ctx.save(); ctx.translate(side * 0.36, -0.7); ctx.rotate(side * (up ? -2.4 : 0.35 + (back ? step * 0.4 * side : 0)));
    ctx.fillStyle = '#3f74de'; pill(ctx, -0.08, 0, 0.16, 0.38, 0.08);
    ctx.fillStyle = '#ffc9a3'; ctx.beginPath(); ctx.arc(0, 0.4, 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const waving = wave !== null && Math.sin(wave / 160) > -0.2;
  arm(-1, false); arm(1, waving);
  if (back) {
    // A little sack of gold on his back
    ctx.fillStyle = '#c9a26b'; ctx.beginPath(); ctx.ellipse(0, -0.55, 0.24, 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.12, -0.76); ctx.lineTo(0.12, -0.76); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 0.22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, -0.52);
    // The back of his head and the beard peeking out
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-0.27, -0.92, 0.1, 0.13, 0.4, 0, Math.PI * 2); ctx.ellipse(0.27, -0.92, 0.1, 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2b58c'; ctx.beginPath(); ctx.arc(0, -1.02, 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc9a3'; ctx.beginPath(); ctx.ellipse(-0.29, -1.02, 0.07, 0.1, 0, 0, Math.PI * 2); ctx.ellipse(0.29, -1.02, 0.07, 0.1, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#ffc9a3'; ctx.beginPath(); ctx.arc(0, -1.02, 0.28, 0, Math.PI * 2); ctx.fill();
    // The beard, a white cloud over the coat
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.98); ctx.quadraticCurveTo(-0.38, -0.55, -0.12, -0.42); ctx.quadraticCurveTo(0, -0.32, 0.12, -0.42); ctx.quadraticCurveTo(0.38, -0.55, 0.3, -0.98);
    ctx.quadraticCurveTo(0, -0.84, -0.3, -0.98); ctx.fill();
    // Eyes, cheeks, nose
    for (const sx of [-0.1, 0.1]) {
      ctx.fillStyle = '#1b1030'; ctx.beginPath(); ctx.ellipse(sx, -1.08, 0.045, 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + 0.015, -1.1, 0.015, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,95,162,0.35)'; ctx.beginPath(); ctx.arc(sx * 1.9, -0.98, 0.05, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff7f8f'; ctx.beginPath(); ctx.arc(0, -0.98, 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-0.025, -1.0, 0.025, 0, Math.PI * 2); ctx.fill();
  }
  // The hat: tall, red, a little bent, with its yellow pompom
  const hat = ctx.createLinearGradient(-0.3, -1.2, 0.3, -1.9);
  hat.addColorStop(0, '#ff4d6d'); hat.addColorStop(1, '#c21f4a');
  ctx.fillStyle = hat;
  ctx.beginPath(); ctx.moveTo(-0.33, -1.12); ctx.quadraticCurveTo(-0.1, -1.55, 0.16, -1.9); ctx.quadraticCurveTo(0.18, -1.5, 0.33, -1.12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; pill(ctx, -0.35, -1.2, 0.7, 0.12, 0.06);
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0.17, -1.92, 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Dizzy stars after a hit
  if (hit !== null && hit < 1300) {
    ctx.save(); ctx.font = `${Math.round(s * 0.32)}px sans-serif`; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = hit / 200 + i * 2.1; ctx.fillText('⭐', x + Math.cos(a) * s * 0.45, y - 2.05 * s + Math.sin(a) * s * 0.12); }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* The gnome, in the old TV's big pixels                               */
/* ------------------------------------------------------------------ */

// 16 × 20 pixels. y pompom, r hat, w beard and hat band, s skin, k eyes, p nose, b coat, n shoes
const SPRITE = [
  '.........yy.....',
  '........yyy.....',
  '........rr......',
  '.......rrr......',
  '......rrrr......',
  '.....rrrrrr.....',
  '....rrrrrrrr....',
  '...wwwwwwwwww...',
  '....ssssssss....',
  '....skssssks....',
  '....sssppsss....',
  '...wwsppppsww...',
  '...wwwwwwwwww...',
  '..bwwwwwwwwwwb..',
  '.bbbwwwwwwwwbbb.',
  'sbbbbwwwwwwbbbbs',
  '..bbbbbwwbbbbb..',
  '..bbbbbbbbbbbb..',
  '...nnnn..nnnn...',
  '..nnnnn..nnnnn..',
];
const PIXEL = { y: '#ffff55', r: '#ff5555', w: '#ffffff', s: '#ffaa77', k: '#000000', p: '#ff55ff', b: '#5555ff', n: '#aa5500' };

/** The sprite at (x, y) (its top left) in pixels of `px`; frame 1 waves, frame 2 takes a step. */
export function gnomoRetro(ctx, x, y, px, frame = 0) {
  const rows = SPRITE.map(r => r.split(''));
  if (frame === 1) { rows[15][15] = 'b'; rows[14][15] = 'b'; rows[13][15] = 'b'; rows[12][15] = 's'; rows[11][15] = 's'; }
  if (frame === 2) { rows[18] = '..nnnn....nnnn..'.split(''); rows[19] = '.nnnnn....nnnnn.'.split(''); }
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < 16; i++) {
    const c = PIXEL[rows[j][i]];
    if (!c) continue;
    ctx.fillStyle = c; ctx.fillRect(x + i * px, y + j * px, px, px);
  }
}

// A 3 × 5 font, only for the TV's words
const FONT = {
  A: '010101111101101', D: '110101101101110', E: '111100110100111', G: '011100101101011', J: '001001001101010',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', U: '101101101101111', Y: '101101010010010',
  O: '010101101101010', R: '110101110101101', T: '111010010010010', '!': '010010010000010', '¡': '010000010010010',
  1: '010110010010111', 9: '111101111001111', 0: '111101101101111', ' ': '000000000000000', '·': '000000010000000',
};
/** `text` in the TV font at (x, y), centered on x, `px` big. */
export function letrasRetro(ctx, text, x, y, px, color) {
  const chars = [...text.toUpperCase()];
  const w = chars.length * 4 * px - px;
  ctx.fillStyle = color;
  chars.forEach((ch, n) => {
    const f = FONT[ch] || FONT[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (f[j * 3 + i] === '1') ctx.fillRect(Math.round(x - w / 2 + (n * 4 + i) * px), y + j * px, px, px);
  });
}

/** The old TV's scene at `ms` since it came on, on a low-resolution canvas (`w` × `h` pixels). */
export function teleRetro(ctx, w, h, ms) {
  ctx.fillStyle = '#000080'; ctx.fillRect(0, 0, w, h);
  // A checkered floor and a row of blocky hills, as games looked then
  ctx.fillStyle = '#00aa00'; ctx.fillRect(0, h - 14, w, 14);
  for (let i = 0; i < w; i += 8) { ctx.fillStyle = (i / 8) % 2 ? '#00aa00' : '#55ff55'; ctx.fillRect(i, h - 14, 8, 3); }
  ctx.fillStyle = '#0000aa';
  for (let i = 0; i < w; i += 12) { const hh = 6 + ((i * 7) % 9); ctx.fillRect(i, h - 14 - hh, 12, hh); }
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) if (Math.floor(ms / 300 + i) % 3) ctx.fillRect((i * 23) % w, (i * 11) % (h - 34), 1, 1);
  // He walks in from the left, stops in the middle and waves
  const px = 2, sw = 16 * px, stop = w / 2 - sw / 2;
  const x = Math.min(stop, -sw + (ms / 1100) * (stop + sw));
  const walking = x < stop;
  const frame = walking ? (Math.floor(ms / 140) % 2 ? 2 : 0) : (Math.floor(ms / 220) % 2 ? 1 : 0);
  gnomoRetro(ctx, Math.round(x), h - 14 - 20 * px + (walking && frame === 2 ? -1 : 0), px, frame);
  if (ms > 500 && Math.floor(ms / 400) % 4 !== 3) letrasRetro(ctx, 'DUENDE', w / 2, 5, 2, '#ffff55');
  if (!walking) letrasRetro(ctx, '¡LLAMA Y JUEGA!', w / 2, 19, 1, '#55ffff');
}
