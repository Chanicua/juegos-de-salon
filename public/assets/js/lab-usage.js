/**
 * How much the lab really used each flag (D-528): when `flag('<id>')` turns on for a lab key holder
 * (state *lab*), this page load counts in `labsUso/<id>/<day>`:
 *
 *   n          loads with the flag on (exposures)
 *   c          loads that finished: the page asked `flagDone(id)` (a game over, a screen reached),
 *              or it stayed open 30 s and closed without the vigía seeing a failure
 *   e          loads where the vigía (vigia.js, D-251) saw a failure
 *   k/<hash>   true for each lab key that used it that day: the first 8 hex of the key's SHA-256,
 *              so it says "another tester", never who
 *
 * Aggregate counts only, no player data. `tools/agents/lab-ready.mjs check` reads them and marks a
 * flag ✅ Listo para 🚀 on its /labs/ card. Counting is itself in the lab (D-395): its own flag,
 * lab: #seccion-lab-ready. Not counted on localhost or Tailscale (the scripts, the owner's Mac).
 * Best effort: never throws, at most one write of each kind per load and flag.
 */
import { flag } from './flags.js';
import { SAVED_KEY, LOCAL } from './lab-access.js';

const BASE = 'https://juegos-de-salon-default-rtdb.firebaseio.com';
const DAY_MS = 24 * 3600 * 1000;
export const STAY_MS = 30000;
const INC = { '.sv': { increment: 1 } };

/** The first 8 hex of the key's SHA-256, or null. */
async function keyHash() {
  try {
    const key = globalThis.localStorage?.getItem(SAVED_KEY);
    if (!key || !globalThis.crypto?.subtle) return null;
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    return [...new Uint8Array(d)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (_) { return null; }
}

/** The PATCH for one event: pure, for node. */
export function patchOf(kind, hash) {
  const p = { [kind]: INC };
  if (kind === 'n' && hash) p[`k/${hash}`] = true;
  return p;
}

const seen = new Map();
function send(id, body) {
  try {
    const r = globalThis.fetch(`${BASE}/labsUso/${id}/${Math.floor(Date.now() / DAY_MS)}.json`, { method: 'PATCH', body: JSON.stringify(body), keepalive: true });
    r?.catch?.(() => {});
  } catch (_) { /* no network */ }
}
const on = async () => !LOCAL.test(globalThis.location?.hostname ?? '') && (await flag('lab-ready').catch(() => false));

/** Called by flags.js when `id` turned on through the lab key. */
export async function exposed(id) {
  if (seen.has(id)) return;
  seen.set(id, null);
  if (!(await on())) return;
  const s = { done: false, at: Date.now() };
  seen.set(id, s);
  send(id, patchOf('n', await keyHash()));
  globalThis.addEventListener?.('pagehide', () => {
    if (globalThis.__vigia?.fallas?.length) send(id, patchOf('e'));
    else if (!s.done && Date.now() - s.at >= STAY_MS) { s.done = true; send(id, patchOf('c')); }
  }, { once: true });
}

/** A page's own "this was used to the end" for flag `id` (a game finished on the flagged path). */
export function flagDone(id) {
  const s = seen.get(id);
  if (!s || s.done || globalThis.__vigia?.fallas?.length) return;
  s.done = true;
  send(id, patchOf('c'));
}
