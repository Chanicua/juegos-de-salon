/**
 * Aletazo's drawing: the night city, the gates, the spikes, the bird and what celebrates, on one
 * canvas. The canvas is transparent: it stands on the app's own night (base.css).
 *
 * Nothing here uses `shadowBlur`: on a 3× phone screen it cost ~50 ms a frame. The neon glow is a wide
 * see-through stroke under each line, and the bird and the spike are drawn once into small canvases
 * (sprites) and stamped every frame.
 */
import { BR, RIM, GROUND, WALL } from './engine.js';

const QUIET = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const SPARK = ['#ffd23f', '#fff3a6', '#ff2e88', '#2ee6d6'];

/** The stars and two strips of city 4 heights long, repeated as the course scrolls. */
function skyline() {
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * 4, y: Math.random() * 0.8, s: rnd(0.002, 0.005), p: Math.random() * 6 }));
  const city = (hmin, hmax) => {
    const out = []; let x = 0;
    while (x < 4) {
      const w = rnd(0.08, 0.22), h = rnd(hmin, hmax), wins = [];
      if (Math.random() < 0.6) for (let wy = 0.025; wy < h - 0.02; wy += 0.04) for (let wx = 0.02; wx < w - 0.02; wx += 0.035) if (Math.random() < 0.6) wins.push(wx, wy);
      out.push({ x, w, h, wins }); x += w + rnd(0, 0.05);
    }
    return out;
  };
  return { stars, far: city(0.12, 0.32), near: city(0.06, 0.18) };
}

/**
 * A scene on a canvas. `draw(g)` paints one frame of the game `g`; `fx(event, g)` plays what an engine
 * event looks like (sparks, rings, points); `tick(dt, g)` moves the effects. `measure()` returns the
 * stage's width over its height, the engine's `W`.
 */
export function escena(canvas) {
  const ctx = canvas.getContext('2d');
  let CW = 0, CH = 0, dpr = 1, W = 1;
  let birdSprite, glowSprite, spikeSprite;
  const sky = skyline();
  let parts = [], pulses = [], floats = [], flashT = 0, glow = 0, shake = 0, trailT = 0;

  function sprite(size, paint) {
    const px = Math.max(8, Math.ceil(size * CH * dpr)), c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d');
    g.setTransform(px / size, 0, 0, px / size, px / 2, px / 2); paint(g);
    return { c, size };
  }
  function bake() {
    const R = BR;
    birdSprite = sprite(R * 4.4, g => {
      const halo = g.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 2.1);
      halo.addColorStop(0, 'rgba(255,210,63,0.45)'); halo.addColorStop(1, 'rgba(255,210,63,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(0, 0, R * 2.1, 0, 7); g.fill();
      g.fillStyle = '#ff2e88';   // tail
      g.beginPath(); g.moveTo(-R * 0.9, 0); g.lineTo(-R * 1.6, -R * 0.5); g.lineTo(-R * 1.45, R * 0.1); g.lineTo(-R * 1.6, R * 0.55); g.closePath(); g.fill();
      const body = g.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R * 1.2);
      body.addColorStop(0, '#fff3a6'); body.addColorStop(0.6, '#ffd23f'); body.addColorStop(1, '#ff9a1a');
      g.fillStyle = body; g.beginPath(); g.ellipse(0, 0, R * 1.15, R, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(R * 0.15, R * 0.45, R * 0.6, R * 0.35, 0, 0, 7); g.fill();
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(R * 0.95, -R * 0.2); g.lineTo(R * 1.6, R * 0.05); g.lineTo(R * 0.95, R * 0.3); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(R * 0.45, -R * 0.32, R * 0.32, 0, 7); g.fill();
    });
    glowSprite = sprite(R * 7, g => {
      const halo = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 3.5);
      halo.addColorStop(0, 'rgba(255,248,200,0.95)'); halo.addColorStop(0.35, 'rgba(255,210,63,0.55)'); halo.addColorStop(1, 'rgba(255,210,63,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(0, 0, R * 3.5, 0, 7); g.fill();
    });
    const zr = 0.032;
    spikeSprite = sprite(zr * 3.4, g => {
      const halo = g.createRadialGradient(0, 0, zr * 0.5, 0, 0, zr * 1.7);
      halo.addColorStop(0, 'rgba(224,36,60,0.5)'); halo.addColorStop(1, 'rgba(224,36,60,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(0, 0, zr * 1.7, 0, 7); g.fill();
      g.fillStyle = '#ff2e88'; g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? zr * 0.5 : zr; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill();
      g.fillStyle = '#150726'; g.beginPath(); g.arc(0, 0, zr * 0.25, 0, 7); g.fill();
    });
  }
  function measure() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);   // 2× is plenty for a canvas game
    CW = r.width; CH = r.height || 1; W = CW / CH;
    canvas.width = Math.round(CW * dpr); canvas.height = Math.round(CH * dpr);
    bake();
    return W;
  }

  /* --- effects --- */
  function burst(x, y, c, n, sp = 0.6, star = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(0.2, sp);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6, c, s: star ? rnd(0.008, 0.016) : rnd(0.004, 0.009), star, rot: Math.random() * 3 });
    }
  }
  /** What an engine event looks like. */
  function fx(e, g) {
    const b = g.bird;
    if (e.type === 'flap') {
      for (let i = 0; i < 3; i++) parts.push({ x: b.x - BR, y: b.y + BR * 0.3, vx: rnd(-0.5, -0.2), vy: rnd(0.05, 0.3), life: 0.35, max: 0.35, c: '#2ee6d6', s: rnd(0.004, 0.008) });
    } else if (e.type === 'pass') {
      burst(e.x, e.y, e.color, 10, 0.5); burst(e.x, e.y, e.color, 4, 0.4, true);
      floats.push({ text: '+1', x: e.x, y: e.y - 0.05, life: 0.8, max: 0.8, c: '#fff' });
    } else if (e.type === 'perfect') {
      // Like Shinobi's flag, softer: two rings open from the hoop, a faint gold flash, a short spray
      // of sparks, the bird lit up for a moment and the +2 popping up
      if (!QUIET) {
        ['#ffd23f', '#2ee6d6'].forEach((c, j) => pulses.push({ x: e.x, y: e.y, born: g.clock + j * 0.1, c, max: 0.11 + j * 0.025 }));
        flashT = 0.25; glow = 0.6;
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + rnd(-0.5, 0.5) * Math.PI, v = rnd(0.25, 0.55);
          parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, 0.75), max: 0.75, c: i % 2 ? '#ffd23f' : '#fff3a6', s: rnd(0.005, 0.01), star: i % 2 === 0, rot: Math.random() * 3, heavy: true });
        }
      }
      floats.push({ text: '+2', x: e.x, y: e.y - 0.11, life: 0.9, max: 0.9, c: '#ffd23f', big: true });
    } else if (e.type === 'hit') {
      shake = 0.3; burst(e.x, e.y, '#ff2e88', 12, 0.7);
    }
  }
  function tick(dt, g) {
    shake = Math.max(0, shake - dt);
    flashT = Math.max(0, flashT - dt); glow = Math.max(0, glow - dt / 0.6);
    pulses = pulses.filter(p => g.clock - p.born < 0.75);
    // A trail of little sparkles behind the bird while it flies
    if (!QUIET && (g.mode === 'play' || g.mode === 'demo') && (trailT -= dt) <= 0) {
      trailT = 0.045;
      const b = g.bird;
      parts.push({ x: b.x - BR * 1.3, y: b.y + rnd(-0.4, 0.4) * BR, vx: rnd(-0.25, -0.1), vy: rnd(-0.08, 0.08), life: 0.45, max: 0.45, c: SPARK[(Math.random() * 4) | 0], s: rnd(0.006, 0.011), star: true, rot: Math.random() * 3, float: true });
    }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.float) p.vy += (p.heavy ? 1.6 : 0.6) * dt; p.rot = (p.rot || 0) + dt * 4; p.life -= dt; }
    parts = parts.filter(p => p.life > 0);
    for (const f of floats) f.life -= dt;
    floats = floats.filter(f => f.life > 0);
  }
  function clear() { parts = []; pulses = []; floats = []; flashT = 0; glow = 0; shake = 0; }

  /* --- drawing --- */
  const stamp = (sp, x, y, a) => { ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.drawImage(sp.c, -sp.size / 2, -sp.size / 2, sp.size, sp.size); ctx.restore(); };
  /** A 4-point twinkle: the curves pull in to the center between the points. */
  function sparkle(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill(); ctx.restore();
  }
  function background(g) {
    for (const s of sky.stars) {
      const x = ((s.x - g.scroll * 0.03) % 4 + 4) % 4; if (x > W + 0.1) continue;
      ctx.globalAlpha = QUIET ? 0.5 : 0.35 + 0.35 * Math.sin(g.clock * 2 + s.p);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, s.y, s.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const strip = (list, k, fill, winC) => {
      const off = (g.scroll * k) % 4;
      for (const rep of [0, 4]) for (const b of list) {
        const x = b.x - off + rep; if (x > W || x + b.w < 0) continue;
        ctx.fillStyle = fill; ctx.fillRect(x, GROUND - b.h, b.w, b.h + 0.01);
        if (winC && b.wins.length) { ctx.fillStyle = winC; const top = GROUND - b.h; for (let i = 0; i < b.wins.length; i += 2) ctx.fillRect(x + b.wins[i], top + b.wins[i + 1], 0.012, 0.014); }
      }
    };
    strip(sky.far, 0.12, 'rgba(138,77,255,0.20)', 'rgba(255,210,63,0.18)');
    strip(sky.near, 0.3, 'rgba(21,7,38,0.75)', null);
    // The ground: a neon line and dashes that run with the speed
    ctx.fillStyle = 'rgba(14,5,28,0.92)'; ctx.fillRect(0, GROUND, W, 1 - GROUND);
    ctx.strokeStyle = 'rgba(255,46,136,0.25)'; ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 0.006; ctx.stroke();
    ctx.fillStyle = 'rgba(46,230,214,0.45)';
    const off = g.scroll % 0.16; for (let x = -off; x < W; x += 0.16) ctx.fillRect(x, GROUND + 0.035, 0.07, 0.008);
  }
  function wall(h) {
    if (!h.wall) return;
    const x0 = h.x - WALL / 2, faded = h.ok < 0 ? 0.45 : 1;
    ctx.globalAlpha = faded;
    for (const [y0, y1] of [[-0.05, h.y - h.r], [h.y + h.r, GROUND]]) {
      if (y1 <= y0) continue;
      ctx.fillStyle = 'rgba(30,8,52,0.94)'; ctx.fillRect(x0, y0, WALL, y1 - y0);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, WALL, y1 - y0); ctx.clip();   // warning stripes
      ctx.strokeStyle = 'rgba(255,46,136,0.22)'; ctx.lineWidth = 0.014; ctx.beginPath();
      for (let yy = y0 - WALL; yy < y1 + WALL; yy += 0.045) { ctx.moveTo(x0, yy + WALL); ctx.lineTo(x0 + WALL, yy); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,46,136,0.25)'; ctx.lineWidth = 0.02; ctx.strokeRect(x0, y0, WALL, y1 - y0);
      ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 0.005; ctx.strokeRect(x0, y0, WALL, y1 - y0);
    }
    if (h.bare && h.ok >= 0) {   // the opening's lips, lit so the way through reads at a glance
      ctx.fillStyle = h.flash > 0 ? '#9dff3a' : '#2ee6d6';
      ctx.fillRect(x0 - 0.008, h.y - h.r - 0.008, WALL + 0.016, 0.012);
      ctx.fillRect(x0 - 0.008, h.y + h.r - 0.004, WALL + 0.016, 0.012);
      ctx.globalAlpha = 0.12 * faded; ctx.fillRect(x0, h.y - h.r, WALL, h.r * 2);
    }
    ctx.globalAlpha = 1;
  }
  /** Half a hoop: the back half before the bird, the front half after, so it flies through. */
  function hoopHalf(h, front) {
    if (h.bare) return;
    const c = h.ok > 0 && h.flash > 0 ? (h.ok === 2 ? '#ffd23f' : '#9dff3a') : h.color;
    const base = h.ok < 0 ? 0.3 : front ? 1 : 0.55;
    ctx.strokeStyle = c; ctx.lineCap = 'round';
    ctx.beginPath();
    if (front) ctx.ellipse(h.x, h.y, h.r * 0.34, h.r, 0, Math.PI / 2, Math.PI * 1.5);
    else ctx.ellipse(h.x, h.y, h.r * 0.34, h.r, 0, -Math.PI / 2, Math.PI / 2);
    ctx.globalAlpha = base * 0.22; ctx.lineWidth = 0.05 + h.flash * 0.02; ctx.stroke();   // the glow
    ctx.globalAlpha = base; ctx.lineWidth = 0.02 + h.flash * 0.01; ctx.stroke();
    if (front) {
      ctx.fillStyle = '#fff';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(h.x, h.y + s * h.r, RIM * 0.75, 0, 7); ctx.fill(); }
      if (h.amp && h.ok >= 0) {   // a faint track shows the hoop moves
        ctx.globalAlpha = 0.18; ctx.setLineDash([0.01, 0.015]); ctx.lineWidth = 0.004;
        ctx.beginPath(); ctx.moveTo(h.x, h.baseY - h.amp - h.r); ctx.lineTo(h.x, h.baseY + h.amp + h.r); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
  }
  function bird(g) {
    const b = g.bird, R = BR;
    if (g.shield > 0 && g.mode === 'play' && Math.floor(g.shield * 12) % 2) ctx.globalAlpha = 0.35;   // blinks while shielded
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(g.mode === 'dying' || g.mode === 'over' ? b.spin : b.rot);
    if (glow > 0) {   // lit up after a dead center, and a touch bigger for a moment
      const s = glowSprite.size * (1 + 0.15 * glow);
      ctx.globalAlpha = glow; ctx.drawImage(glowSprite.c, -s / 2, -s / 2, s, s); ctx.globalAlpha = 1;
      const pop = 1 + 0.08 * Math.sin(Math.min(1, (1 - glow) * 4) * Math.PI); ctx.scale(pop, pop);
    }
    ctx.drawImage(birdSprite.c, -birdSprite.size / 2, -birdSprite.size / 2, birdSprite.size, birdSprite.size);
    if (g.mode === 'dying' || g.mode === 'over') {   // ✕ eyes
      ctx.strokeStyle = '#150726'; ctx.lineWidth = R * 0.1; ctx.beginPath();
      ctx.moveTo(R * 0.3, -R * 0.5); ctx.lineTo(R * 0.65, -R * 0.15); ctx.moveTo(R * 0.65, -R * 0.5); ctx.lineTo(R * 0.3, -R * 0.15); ctx.stroke();
    } else { ctx.fillStyle = '#150726'; ctx.beginPath(); ctx.arc(R * 0.55, -R * 0.3, R * 0.15, 0, 7); ctx.fill(); }
    // The wing: up on a flap, then it settles; flutters while hovering
    const wa = 0.5 - b.flapT * 1.6 + (g.mode === 'ready' && !QUIET ? Math.sin(g.clock * 14) * 0.4 : 0);
    ctx.save(); ctx.translate(-R * 0.15, R * 0.05); ctx.rotate(wa);
    ctx.fillStyle = '#2ee6d6'; ctx.beginPath(); ctx.ellipse(-R * 0.45, 0, R * 0.62, R * 0.32, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function draw(g) {
    if (!CH) return;
    ctx.setTransform(dpr * CH, 0, 0, dpr * CH, 0, 0);
    ctx.clearRect(0, 0, W, 1);
    if (shake > 0 && !QUIET) ctx.translate(rnd(-1, 1) * shake * 0.03, rnd(-1, 1) * shake * 0.03);
    background(g);
    for (const h of g.gates) wall(h);
    for (const h of g.gates) hoopHalf(h, false);
    for (const z of g.spikes) stamp(spikeSprite, z.x, z.y, z.a);
    bird(g);
    for (const h of g.gates) hoopHalf(h, true);
    for (const p of parts) {
      const k = p.life / p.max; ctx.globalAlpha = k; ctx.fillStyle = p.c;
      if (p.star) sparkle(p.x, p.y, p.s * (0.5 + 0.5 * k), p.rot); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
    }
    for (const p of pulses) {
      const k = (g.clock - p.born) / 0.75; if (k < 0) continue;
      const r = 0.01 + (1 - (1 - k) * (1 - k)) * p.max;
      ctx.strokeStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
      ctx.globalAlpha = 0.3 * (1 - k); ctx.lineWidth = 0.022 * (1 - k) + 0.004; ctx.stroke();
      ctx.globalAlpha = 1 - k; ctx.lineWidth = 0.008 * (1 - k) + 0.002; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // The points, in pixels so the font renders crisp: they pop, rise and fade
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flashT > 0) { ctx.fillStyle = `rgba(255,210,63,${0.07 * flashT / 0.25})`; ctx.fillRect(0, 0, CW, CH); }
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const f of floats) {
      const k = 1 - f.life / f.max;
      const size = CH * (f.big ? 0.065 : 0.045) * (1 + (f.big ? 0.2 : 0.12) * Math.sin(Math.min(1, k * 3) * Math.PI));
      const y = (f.y - (1 - (1 - k) * (1 - k)) * 0.07) * CH;
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.font = `${Math.round(size)}px Bangers, Impact, sans-serif`;
      ctx.lineWidth = Math.max(3, size * 0.14); ctx.strokeStyle = 'rgba(21,7,38,0.9)'; ctx.fillStyle = f.c;
      ctx.strokeText(f.text, f.x * CH, y); ctx.fillText(f.text, f.x * CH, y);
    }
    ctx.globalAlpha = 1;
  }

  return { measure, draw, fx, tick, clear };
}
