#!/usr/bin/env node
/**
 * Lab readiness is measured (D-528). Each flag in *lab* (D-498) counts its real use by lab key
 * holders in `labsUso/<id>/<day>` (`public/assets/js/lab-usage.js`): loads, finished loads, loads
 * with a failure and which keys. This tool weighs them against the threshold (`READY` in
 * `flag-list.js`, `READY_BY` per flag) and writes `flagsListas/<id>` with the evidence; the flag's
 * /labs/ card reads it and says ✅ Listo para 🚀 with the numbers. The owner still presses 🚀 (D-480).
 *
 *   node tools/agents/lab-ready.mjs check     weighs every flag in lab, writes flagsListas/ (the hourly mac job)
 *   node tools/agents/lab-ready.mjs list      what flagsListas/ says, without writing
 *   node tools/agents/lab-ready.mjs news      the flags ready and not yet told to the processes round,
 *                                             then marks them told (exit 0 if some, 3 if none)
 *
 * Only days since the flag was last switched count (`flags/<id>.at`): turned off and back on, it starts over.
 * Needs the administrator key (tools/firebase/firebase-admin.mjs).
 */
import { fileURLToPath } from 'node:url';
import { FLAGS, READY, READY_BY } from '../../public/assets/js/flag-list.js';
import { stateOf } from '../../public/assets/js/flags.js';

export const DAY_MS = 24 * 3600 * 1000;

/** The threshold for one flag: the default with its row of READY_BY over it. */
export const thresholdOf = (id, by = READY_BY, base = READY) => ({ ...base, ...(by[id] || {}) });

/**
 * The evidence for one flag from its `labsUso/<id>` days ({ <day>: { n, c, e, k: { hash: true } } }),
 * counting only days from `since` (ms) on. Pure.
 */
export function evidenceOf(days, since = 0) {
  const from = Math.floor((since || 0) / DAY_MS);
  const keys = new Set();
  const ev = { exposures: 0, completions: 0, errors: 0, keys: 0, days: 0 };
  for (const [day, d] of Object.entries(days || {})) {
    if (!/^\d+$/.test(day) || Number(day) < from || !d) continue;
    const n = Number(d.n) || 0, c = Number(d.c) || 0, e = Number(d.e) || 0;
    ev.exposures += n; ev.completions += c; ev.errors += e;
    if (n || c) ev.days++;
    for (const k of Object.keys(d.k || {})) keys.add(k);
  }
  ev.keys = keys.size;
  return ev;
}

/** Whether the evidence meets the threshold, and what is still missing (Spanish, for the card). Pure. */
export function verdict(ev, t) {
  const missing = [];
  if (ev.completions < t.completions) missing.push(`${t.completions - ev.completions} uso(s) completo(s) más`);
  if (ev.keys < t.keys) missing.push(`${t.keys - ev.keys} llave(s) más`);
  if (ev.days < t.days) missing.push(`${t.days - ev.days} día(s) más`);
  if (ev.errors > t.errors) missing.push(`${ev.errors} carga(s) con error`);
  return { ready: missing.length === 0, missing };
}

/** What `check` writes for every flag in lab, keeping when it became ready and whether the round was told. Pure. */
export function report({ flags = {}, uso = {}, prev = {}, now = Date.now(), ids = Object.keys(FLAGS) } = {}) {
  const out = {};
  for (const id of ids) {
    if (stateOf(flags, id) !== 'lab') continue;
    const t = thresholdOf(id);
    const ev = evidenceOf(uso[id], flags?.[id]?.at);
    const v = verdict(ev, t);
    const was = prev[id] || {};
    out[id] = { ...ev, ready: v.ready, missing: v.missing, at: now, need: t,
      ...(v.ready ? { since: was.ready ? was.since || now : now, ...(was.ready && was.told ? { told: was.told } : {}) } : {}) };
  }
  return out;
}

/** The flags ready and not yet told to the processes round. Pure. */
export const untold = listas => Object.entries(listas || {}).filter(([, e]) => e?.ready && !e.told).map(([id]) => id);

async function main(cmd) {
  const { token, read, write } = await import('../firebase/firebase-admin.mjs');
  const t = await token();
  if (cmd === 'check') {
    const [flags, uso, prev] = await Promise.all([read('flags', t), read('labsUso', t), read('flagsListas', t)]);
    const out = report({ flags: flags || {}, uso: uso || {}, prev: prev || {} });
    await write('flagsListas', 'PUT', out, t);
    for (const [id, e] of Object.entries(out)) console.log(`${e.ready ? '✅' : '🧪'} ${id}: ${e.completions} completos, ${e.keys} llaves, ${e.days} días, ${e.errors} errores${e.ready ? '' : ` (falta: ${e.missing.join(', ')})`}`);
    return 0;
  }
  if (cmd === 'list') {
    const l = (await read('flagsListas', t)) || {};
    for (const [id, e] of Object.entries(l)) console.log(`${e.ready ? '✅' : '🧪'} ${id}: ${JSON.stringify({ c: e.completions, k: e.keys, d: e.days, e: e.errors })}`);
    return 0;
  }
  if (cmd === 'news') {
    const l = (await read('flagsListas', t)) || {};
    const ids = untold(l);
    for (const id of ids) {
      console.log(`✅ ${id} está listo para 🚀: ${l[id].completions} usos completos, ${l[id].keys} llaves, ${l[id].days} días, sin errores. Se publica desde su tarjeta en /labs/.`);
      await write(`flagsListas/${id}/told`, 'PUT', Date.now(), t);
    }
    return ids.length ? 0 : 3;
  }
  console.error('usage: lab-ready.mjs check | list | news');
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main(process.argv[2]));
