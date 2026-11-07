/**
 * Compuertas' drawing: the funnel, the triangle of paddles, the balls and the bins on a canvas. The
 * game and the cover's demo both draw with it. `draw(g, t, now)` paints one frame of game `g` at game
 * moment t (now is the page's clock, for effects that go on during a pause); `paddleAt(x, y)` says
 * which paddle a tap on the canvas touched; `land(event)` shows a ball arriving in its bin.
 */
import {
  ROWS, BINS, TRASH, TOP, PERIOD, binsAt, nextBins, ballAt, nodeAt, routePath, headedTo,
} from './engine.js';

const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The house's neon (base.css). */
const C = {
  pink: '#ff2e88', orange: '#ff7a1a', yellow: '#ffd23f', lime: '#9dff3a', cyan: '#2ee6d6', purple: '#8a4dff',
  ink: '#150726', white: '#ffffff',
};
/** Each bin's color by its value: the 10 shines gold, the trash is grey. */
export const binColor = v => ({ 10: C.yellow, 5: C.lime, 3: C.cyan, 2: C.purple, 1: C.pink }[v] || '#7a7290');
const ballColor = kind => (kind === 'gold' ? C.yellow : kind === 'bomb' ? '#2a2238' : C.white);
const label = v => (v === TRASH ? '🗑️' : String(v));
/** How far a paddle leans, in radians. */
const LEAN = 0.62;
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function escena(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dx = 0, dy = 0, ox = 0, oy = 0;
  const angles = new Map();   // each paddle's drawn angle, easing toward its side
  const floats = [];          // "+10" over a bin: { x, y, text, color, born }
  const sparks = [];          // { x, y, vx, vy, color, born, life }
  const glows = [];           // a bin lighting up: { bin, color, born }
  let last = 0, changedAt = -1, period = -1;

  const measure = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The funnel is row −1 and the bins take about 1.3 rows: ROWS + 2.6 rows in all, with a margin
    // and the rows a little taller than wide where the screen allows, the whole board centered
    dx = Math.min(W / (BINS + 0.25), 92);
    dy = Math.min(dx * 1.25, (H - 12) / (ROWS + 2.3));
    ox = W / 2;
    oy = Math.max(6, (H - (ROWS + 2.2) * dy) / 2) + dy * 1.05;
  };
  const ro = new ResizeObserver(measure); ro.observe(canvas); measure();

  const px = x => ox + x * dx;
  const py = y => oy + y * dy;
  const binTop = () => py(ROWS) - dy * 0.1;
  const binH = () => Math.min(dy * 1.25, H - binTop() - 4);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function funnel(g, t) {
    const x = px(0), y = py(-1), w = dx * 0.55;
    ctx.save();
    ctx.lineWidth = Math.max(3, dx * 0.06); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.moveTo(x - w, y - dy * 0.55); ctx.lineTo(x - dx * 0.2, y + dy * 0.05);
    ctx.moveTo(x + w, y - dy * 0.55); ctx.lineTo(x + dx * 0.2, y + dy * 0.05); ctx.stroke();
    // The next ball waits in the funnel, shaking a little just before it drops
    const d = g.drops[g.next];
    if (d && d.t0 - t < 900) {
      const k = Math.max(0, Math.min(1, 1 - (d.t0 - t) / 900));
      const wob = QUIETO ? 0 : Math.sin(t / 40) * k * dx * 0.03;
      ball(x + wob, y - dy * 0.35 * (1 - k * 0.3), d.kind, 0.55 + 0.45 * k);
    }
    ctx.restore();
  }

  function ball(x, y, kind, alpha = 1) {
    const r = dx * 0.16;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (kind === 'bomb') {
      ctx.font = `${Math.round(r * 2.3)}px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💣', x, y);
    } else {
      const c = ballColor(kind);
      ctx.shadowColor = kind === 'gold' ? C.yellow : C.cyan; ctx.shadowBlur = kind === 'gold' ? 16 : 8;
      const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, kind === 'gold' ? '#e0a400' : '#a9c4ff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (kind === 'gold') {
        ctx.shadowBlur = 0; ctx.fillStyle = c;
        ctx.font = `${Math.round(r * 1.25)}px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⭐', x, y + r * 0.05);
      }
    }
    ctx.restore();
  }

  function paddles(g, dt) {
    const len = dx * 0.34, th = Math.max(5, dx * 0.11);
    for (let r = 0; r < ROWS; r++) for (let i = 0; i <= r; i++) {
      const key = `${r},${i}`, aim = g.gates[r][i] * LEAN;
      let a = angles.get(key);
      a = a === undefined || QUIETO ? aim : a + (aim - a) * Math.min(1, dt / 70);
      angles.set(key, a);
      const { x, y } = nodeAt(r, i), cx = px(x), cy = py(y);
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.shadowColor = C.pink; ctx.shadowBlur = 10;
      const grad = ctx.createLinearGradient(-len, 0, len, 0);
      grad.addColorStop(0, C.pink); grad.addColorStop(1, C.orange);
      ctx.fillStyle = grad;
      roundRect(-len, -th / 2, len * 2, th, th / 2); ctx.fill();
      ctx.restore();
      // The pivot
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(cx, cy, th * 0.32, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** The way the next ball would go now: a dotted line from the funnel to its bin. */
  function route(g, t) {
    const { paddles: ps, bin } = routePath(g);
    const pts = [[px(0), py(-1)], ...ps.map(([r, i]) => { const n = nodeAt(r, i); return [px(n.x), py(n.y)]; }), [px(nodeAt(ROWS, bin).x), py(ROWS)]];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = QUIETO ? 0 : -t / 40;
    ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.restore();
    return bin;
  }

  function bins(g, t, now, nextBin, headed) {
    const vals = binsAt(g, t), soon = nextBins(g, t);
    const top = binTop(), h = binH(), w = dx * 0.9;
    const k = Math.floor(t / PERIOD);
    if (k !== period) { if (period >= 0) changedAt = now; period = k; }
    const flash = changedAt >= 0 && now - changedAt < 500 ? 1 - (now - changedAt) / 500 : 0;
    for (let b = 0; b < BINS; b++) {
      const v = vals[b], c = binColor(v), x = px(nodeAt(ROWS, b).x) - w / 2;
      ctx.save();
      const glow = glows.find(q => q.bin === b && now - q.born < 450);
      ctx.shadowColor = glow ? glow.color : c; ctx.shadowBlur = v === TOP ? 18 : glow ? 20 : 6;
      ctx.fillStyle = v === TRASH ? 'rgba(122,114,144,0.22)' : `${c}33`;
      roundRect(x, top, w, h, 10); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = nextBin === b ? 3.5 : 2;
      ctx.strokeStyle = nextBin === b ? '#fff' : c;
      if (soon && !QUIETO && Math.floor(now / 160) % 2) ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      roundRect(x, top, w, h, 10); ctx.stroke();
      if (flash) { ctx.fillStyle = `rgba(255,255,255,${(0.5 * flash).toFixed(3)})`; roundRect(x, top, w, h, 10); ctx.fill(); }
      // The value, big; while the next ones are coming, the next value under it
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const big = Math.round(Math.min(w * 0.5, h * 0.42));
      ctx.font = v === TRASH ? `${Math.round(big * 0.85)}px ${EMOJI}` : `900 ${big}px Nunito, system-ui, sans-serif`;
      ctx.fillStyle = c;
      ctx.fillText(label(v), x + w / 2, top + h * (soon ? 0.36 : 0.5));
      if (soon) {
        const s = Math.round(big * 0.5);
        ctx.font = soon[b] === TRASH ? `${s}px ${EMOJI}` : `800 ${s}px Nunito, system-ui, sans-serif`;
        ctx.fillStyle = binColor(soon[b]);
        ctx.fillText(`→${label(soon[b])}`, x + w / 2, top + h * 0.76);
      }
      // A dot for each ball in the air headed here, in its color
      const n = headed[b] || [];
      n.forEach((kind, j) => {
        ctx.fillStyle = kind === 'bomb' ? C.pink : ballColor(kind);
        ctx.beginPath(); ctx.arc(x + w / 2 + (j - (n.length - 1) / 2) * 9, top - 7, 3.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
  }

  function effects(now) {
    for (let k = floats.length - 1; k >= 0; k--) {
      const f = floats[k], a = (now - f.born) / 900;
      if (a >= 1) { floats.splice(k, 1); continue; }
      ctx.save();
      ctx.globalAlpha = 1 - a * a;
      ctx.font = `900 ${Math.round(dx * 0.36)}px Nunito, system-ui, ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(21,7,38,0.8)';
      const y = f.y - a * dy * 0.9;
      ctx.strokeText(f.text, f.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
      ctx.restore();
    }
    for (let k = sparks.length - 1; k >= 0; k--) {
      const s = sparks[k], a = (now - s.born) / s.life;
      if (a >= 1) { sparks.splice(k, 1); continue; }
      const tt = (now - s.born) / 1000;
      ctx.fillStyle = s.color; ctx.globalAlpha = 1 - a;
      ctx.beginPath(); ctx.arc(s.x + s.vx * tt, s.y + s.vy * tt + 300 * tt * tt, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  return {
    /** Paints game g at game moment t; `now` is the page's clock for the effects. */
    draw(g, t, now = performance.now()) {
      const dt = last ? Math.min(100, now - last) : 16; last = now;
      ctx.clearRect(0, 0, W, H);
      const nextBin = route(g, t);
      const headed = {};
      for (const b of g.balls) (headed[headedTo(g, b)] ||= []).push(b.kind);
      bins(g, t, now, nextBin, headed);
      paddles(g, dt);
      funnel(g, t);
      for (const b of g.balls) {
        const p = ballAt(b, t), r = dx * 0.16, th = Math.max(5, dx * 0.11);
        // Sitting on the paddle's top, then rolling off: a small hop between rows
        const hop = QUIETO ? 0 : Math.sin(Math.PI * p.u) * dy * 0.12;
        const lift = p.k >= ROWS && p.u > 0.6 ? (1 - p.u) / 0.4 : 1;
        ball(px(p.x), py(p.y) - (r + th / 2) * lift - hop, b.kind);
      }
      effects(now);
    },
    /** The paddle a tap at (x, y) on the canvas touched, or null: the nearest, within most of a row. */
    paddleAt(x, y) {
      let best = null, bd = Infinity;
      for (let r = 0; r < ROWS; r++) for (let i = 0; i <= r; i++) {
        const n = nodeAt(r, i), d = Math.hypot(px(n.x) - x, (py(n.y) - y) * 1.15);
        if (d < bd) { bd = d; best = [r, i]; }
      }
      return bd <= Math.max(dx * 0.62, 30) ? best : null;
    },
    /** A ball arrived in its bin: its points rise from there, and a bomb blows up or is put out. */
    land(e, now = performance.now()) {
      const x = px(nodeAt(ROWS, e.bin).x), y = binTop();
      const blown = e.kind === 'bomb' && e.value !== TRASH;
      const color = blown ? C.pink : e.kind === 'bomb' ? C.cyan : binColor(e.value);
      const text = blown ? `💥 ${e.points}` : e.kind === 'bomb' ? `🧯 +${e.points}` : e.points ? `+${e.points}` : '0';
      floats.push({ x, y, text, color, born: now });
      glows.push({ bin: e.bin, color, born: now });
      while (glows.length > 12) glows.shift();
      if (QUIETO) return;
      const n = blown ? 28 : e.value === TOP || e.kind === 'bomb' ? 16 : 6;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * (blown ? Math.PI * 2 : 1.6), v = (blown ? 260 : 160) * (0.4 + Math.random());
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: blown ? [C.pink, C.orange, C.yellow][k % 3] : color, born: now, life: 500 + Math.random() * 400 });
      }
    },
    cerrar() { ro.disconnect(); },
  };
}
