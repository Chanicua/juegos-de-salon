/**
 * Pulso's studio band: plays a song's events (public/labs/pulse/engine.js) into an OfflineAudioContext,
 * for render.mjs. Runs in the browser, not in the game: the game plays the files this makes. Rock with
 * punch: two distorted rhythm guitars panned left and right (double-tracked), a driven bass with a sub,
 * a kick with a click, a snare in a room, a lead guitar with a slight bend, delay and reverb, and a
 * compressor on the band. Everything is synthesized: no samples, no recordings.
 */

const HZ = m => 440 * 2 ** ((m - 69) / 12);

/** A tanh curve, `k` how hard it clips. */
function curva(k) {
  const n = 2048, c = new Float32Array(n), d = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.tanh(k * x) / d; }
  return c;
}

/** A room for the reverb: stereo noise that dies out, darker as it goes. */
function sala(ctx, seg = 1.8, caida = 3.2) {
  const n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.45 * x);
      d[i] = lp * Math.pow(1 - x, caida) * (i < ctx.sampleRate * 0.012 ? 0 : 1);
    }
  }
  return b;
}

/**
 * Renders events into a stereo buffer of `duracion` seconds. `stem` is 'banda' (drums, bass, rhythm
 * guitars) or 'guitarra' (the lead). Returns the AudioBuffer.
 */
export async function renderizarTrozo({ eventos, duracion, stem, sr = 44100 }) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duracion * sr), sr);
  // No compressor here: render.mjs renders in pieces and compresses the whole song with ffmpeg
  const master = ctx.createGain(); master.gain.value = 0.9;
  const corte = ctx.createBiquadFilter(); corte.type = 'highpass'; corte.frequency.value = 38;
  master.connect(corte).connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = sala(ctx);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.5;
  verb.connect(verbOut).connect(master);

  const ruido = ctx.createBuffer(1, sr * 2, sr);
  { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const filtro = (tipo, f, q = 0.7, g = 0) => { const x = ctx.createBiquadFilter(); x.type = tipo; x.frequency.value = f; x.Q.value = q; x.gain.value = g; return x; };
  const cadena = (...nodos) => { for (let i = 0; i < nodos.length - 1; i++) nodos[i].connect(nodos[i + 1]); return nodos; };
  const envio = (nodo, cant) => { const g = ctx.createGain(); g.gain.value = cant; nodo.connect(g).connect(verb); };
  const panear = (v) => { const p = ctx.createStereoPanner(); p.pan.value = v; return p; };

  /** A guitar amp: the input takes the oscillators; returns its input. */
  function amp({ drive, pan, vol, brillo = 5200, eco = 0, sala: s = 0.06 }) {
    const input = ctx.createGain();
    const sh = ctx.createWaveShaper(); sh.curve = curva(drive); sh.oversample = '4x';
    const out = ctx.createGain(); out.gain.value = vol;
    const p = panear(pan);
    cadena(input, filtro('highpass', 95), filtro('peaking', 720, 0.9, 9), sh, filtro('peaking', 420, 1, -5), filtro('peaking', 2400, 1.2, 4),
      filtro('lowpass', brillo, 0.6), filtro('highpass', 80), out, p, master);
    envio(out, s);
    if (eco) {
      const d = ctx.createDelay(1); d.delayTime.value = 0.33;
      const fb = ctx.createGain(); fb.gain.value = 0.28;
      const tono = filtro('lowpass', 2600);
      const mezcla = ctx.createGain(); mezcla.gain.value = eco;
      out.connect(d); d.connect(tono).connect(fb).connect(d); tono.connect(mezcla).connect(p);
    }
    return input;
  }

  const fuente = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true; s.start(t, Math.random()); s.stop(t + dur); return s; };
  const osc = (tipo, f, t, fin, det = 0) => { const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(fin); return o; };
  const env = (g, t, pico, ataque, dur, rel) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pico, t + ataque);
    g.gain.setTargetAtTime(0, t + dur, rel);
  };
  const golpe = (g, t, pico, caida) => { g.gain.setValueAtTime(pico, t); g.gain.exponentialRampToValueAtTime(0.0008, t + caida); };

  if (stem === 'banda') {
    const tambores = ctx.createGain(); tambores.gain.value = 1; tambores.connect(master);
    const ampL = amp({ drive: 9, pan: -0.75, vol: 0.62 });
    const ampR = amp({ drive: 9, pan: 0.75, vol: 0.62 });
    const bajo = ctx.createGain(); bajo.gain.value = 0.3;
    const bajoSh = ctx.createWaveShaper(); bajoSh.curve = curva(2.2);
    cadena(bajo, bajoSh, filtro('lowpass', 1800, 0.8), filtro('peaking', 700, 1, 4), filtro('highpass', 45), master);

    const V = {
      kick(t, v) {
        const g = ctx.createGain(); g.connect(tambores);
        const o = osc('sine', 170, t, t + 0.45);
        o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.07);
        o.connect(g); golpe(g, t, 0.75 * v, 0.3);
        const c = ctx.createGain(); c.connect(tambores);
        cadena(fuente(t, 0.02), filtro('bandpass', 3500, 1.2), c); golpe(c, t, 0.9 * v, 0.014);
      },
      snare(t, v) {
        const g = ctx.createGain(); g.connect(tambores); envio(g, 0.35);
        cadena(fuente(t, 0.3), filtro('highpass', 1100), filtro('peaking', 3200, 1, 5), g); golpe(g, t, 1.15 * v, 0.22);
        const b = ctx.createGain(); b.connect(tambores);
        const o = osc('triangle', 210, t, t + 0.15); o.frequency.exponentialRampToValueAtTime(165, t + 0.08);
        o.connect(b); golpe(b, t, 0.8 * v, 0.1);
      },
      hat(t, v) { const g = ctx.createGain(); g.connect(panear(0.3)).connect(tambores); cadena(fuente(t, 0.08), filtro('highpass', 8000), g); golpe(g, t, 0.34 * v, 0.045); },
      open(t, v) { const g = ctx.createGain(); g.connect(panear(0.3)).connect(tambores); cadena(fuente(t, 0.35), filtro('highpass', 7000), g); golpe(g, t, 0.3 * v, 0.28); },
      crash(t, v) {
        const g = ctx.createGain(); g.connect(panear(-0.35)).connect(tambores); envio(g, 0.2);
        cadena(fuente(t, 2), filtro('highpass', 4200), filtro('peaking', 7500, 0.8, 4), g); golpe(g, t, 0.42 * v, 1.7);
      },
      stick(t) {
        const g = ctx.createGain(); g.connect(tambores); envio(g, 0.2);
        cadena(fuente(t, 0.04), filtro('bandpass', 2600, 3), g); golpe(g, t, 0.9, 0.03);
      },
      bass(t, v, m, dur) {
        const g = ctx.createGain(); g.connect(bajo);
        osc('sawtooth', HZ(m), t, t + dur + 0.2).connect(g);
        { const sub = ctx.createGain(); sub.gain.value = 0.35; osc('sine', HZ(m), t, t + dur + 0.2).connect(sub).connect(g); }
        env(g, t, 0.9 * v, 0.004, dur * 0.92, 0.03);
      },
      chord(t, v, m, dur, mute = false) {
        [[ampL, -7, 0], [ampR, 7, 0.009]].forEach(([a, det, tarde]) => {
          const g = ctx.createGain();
          const tono = filtro('lowpass', mute ? 1000 : 9000, mute ? 1.5 : 0.5);
          cadena(g, tono, a);
          const t0 = t + tarde;
          const voces = mute ? [0, 7] : [0, 7, 12];
          for (const i of voces) { osc('sawtooth', HZ(m + i), t0, t0 + dur + 0.3, det).connect(g); osc('sawtooth', HZ(m + i), t0, t0 + dur + 0.3, -det * 0.6).connect(g); }
          if (mute) golpe(g, t0, 0.5 * v, Math.min(dur, 0.16) + 0.04);
          else env(g, t0, 0.42 * v, 0.003, dur, 0.06);
        });
      },
      mute(t, v, m, dur) { V.chord(t, v, m, dur, true); },
    };
    for (const e of eventos) V[e.tipo]?.(e.t, e.v ?? 1, e.midi, e.dur);
  } else {
    const lead = amp({ drive: 16, pan: 0, vol: 0.32, brillo: 4800, eco: 0.35, sala: 0.18 });
    for (const e of eventos) {
      const { t, dur } = e, f = HZ(e.midi);
      const g = ctx.createGain(); g.connect(lead);
      const fin = t + dur + 0.25;
      const os = [osc('sawtooth', f, t, fin), osc('sawtooth', f, t, fin, 9), osc('square', f / 2, t, fin)];
      os[2].connect(filtro('lowpass', 800)).connect(g);
      os[0].connect(g); os[1].connect(g);
      // A slight bend into the note, and vibrato on the long ones
      for (const o of os.slice(0, 2)) { o.detune.setValueAtTime(o.detune.value - 40, t); o.detune.linearRampToValueAtTime(o.detune.value, t + 0.035); }
      if (dur > 0.4) {
        const lfo = osc('sine', 5.6, t, fin), prof = ctx.createGain();
        prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(0, t + 0.2); prof.gain.linearRampToValueAtTime(22, t + 0.5);
        lfo.connect(prof); os.forEach(o => prof.connect(o.detune));
      }
      env(g, t, 0.5, 0.004, Math.max(0.05, dur * 0.92), 0.045);
    }
  }
  return ctx.startRendering();
}

/**
 * The whole song, in pieces of `trozo` seconds plus a tail for what rings on (an offline context
 * slows down as its notes pile up), summed into two channels: { L, R, length, sampleRate }.
 */
export async function renderizar({ eventos, duracion, stem, sr = 44100, trozo = 8, cola = 4 }) {
  const length = Math.ceil(duracion * sr);
  const L = new Float32Array(length), R = new Float32Array(length);
  for (let k = 0; k < duracion; k += trozo) {
    const aqui = eventos.filter(e => e.t >= k && e.t < k + trozo).map(e => ({ ...e, t: e.t - k }));
    if (!aqui.length) continue;
    const b = await renderizarTrozo({ eventos: aqui, duracion: Math.min(trozo + cola, duracion - k + 0.01), stem, sr });
    const desde = Math.round(k * sr), l = b.getChannelData(0), r = b.getChannelData(1);
    for (let i = 0; i < b.length && desde + i < length; i++) { L[desde + i] += l[i]; R[desde + i] += r[i]; }
  }
  return { L, R, length, sampleRate: sr };
}

/** Two channels ({ L, R }) as a 16-bit WAV, scaled. `canales` 1 mixes down to mono. */
export function wav(buffer, escala = 1, canales = 2) {
  const n = buffer.length, sr = buffer.sampleRate;
  const datos = new DataView(new ArrayBuffer(44 + n * canales * 2));
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) datos.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); datos.setUint32(4, 36 + n * canales * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  datos.setUint32(16, 16, true); datos.setUint16(20, 1, true); datos.setUint16(22, canales, true);
  datos.setUint32(24, sr, true); datos.setUint32(28, sr * canales * 2, true); datos.setUint16(32, canales * 2, true); datos.setUint16(34, 16, true);
  txt(36, 'data'); datos.setUint32(40, n * canales * 2, true);
  const { L, R } = buffer;
  let o = 44;
  for (let i = 0; i < n; i++) {
    if (canales === 2) { datos.setInt16(o, Math.max(-1, Math.min(1, L[i] * escala)) * 32767, true); datos.setInt16(o + 2, Math.max(-1, Math.min(1, R[i] * escala)) * 32767, true); o += 4; }
    else { datos.setInt16(o, Math.max(-1, Math.min(1, (L[i] + R[i]) / 2 * escala)) * 32767, true); o += 2; }
  }
  return new Blob([datos.buffer], { type: 'audio/wav' });
}

/** The highest sample of the band and the lead played together. */
export function pico(a, b) {
  let m = 0;
  for (const ch of ['L', 'R']) {
    const x = a[ch], y = b[ch];
    for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i] + y[i]); if (v > m) m = v; }
  }
  return m;
}
