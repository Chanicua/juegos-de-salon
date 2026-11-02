/**
 * The lab's runtime flags (D-498): what is tried on a page players visit asks `flag('<id>')`
 * instead of `labAccess()`, and the owner decides who gets it without a PR, on its card in /labs/
 * (🧪 / 🚀 / ⚪), the one place to switch it. Firebase `flags/`,
 * public to read, only the owner writes:
 *
 *   flags/<id>   { state: 'lab' | 'all' | 'off', at }
 *                lab: only lab key holders (D-395); all: every player; off: nobody, not even the lab.
 *
 * With nothing saved, or if Firebase does not answer, a flag is 'lab', as before flags existed.
 * Each id is a card of /labs/ (`seccion-<id>`), and is listed in FLAGS in flag-list.js (the panel's 🧪 Labs link counts them);
 * `public/labs/listed.test.mjs` checks both. Read once per page and kept on the device, so an
 * answer that does not come in time is the last one this phone saw.
 */
import { labAccess } from './lab-access.js';

export const STATES = ['lab', 'all', 'off'];

const KEY = 'juegos-de-salon:flags';
export const REMOTE = 'https://juegos-de-salon-default-rtdb.firebaseio.com/flags.json';

/** A flag's state in what Firebase answered: 'lab' unless it says otherwise. */
export const stateOf = (flags, id) => (STATES.includes(flags?.[id]?.state) ? flags[id].state : 'lab');

/** Whether a flag is on, given its state and whether this visitor holds a lab key. Pure, for node. */
export const flagOn = (state, lab) => state === 'all' || (state !== 'off' && !!lab);

/** The last `flags/` this device saw, or {}. */
export function cachedFlags(store = globalThis.localStorage) {
  try { const v = JSON.parse(store?.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; }
}

let pending = null;
/** `flags/` from Firebase, kept on the device; the cached one if it does not answer in time. */
export function loadFlags({ fetchFn = globalThis.fetch, store = globalThis.localStorage, timeout = 1500 } = {}) {
  pending ??= (async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeout);
      const r = await fetchFn(REMOTE, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!r.ok) return cachedFlags(store);
      const v = (await r.json()) || {};
      try { store?.setItem(KEY, JSON.stringify(v)); } catch (_) { /* nothing is remembered */ }
      return v;
    } catch (_) { return cachedFlags(store); }
  })();
  return pending;
}

/** For the page: true when this visitor gets the feature behind flag `id`. The lab key is asked only for 'lab'. */
export async function flag(id, { load = loadFlags, lab = labAccess } = {}) {
  const state = stateOf(await load(), id);
  if (state !== 'lab') return flagOn(state, false);
  const on = flagOn(state, await lab());
  // what the lab uses is counted, to tell the owner when it is ready (D-528); not for the tests' own loaders
  if (on && id !== 'lab-ready' && load === loadFlags) import('./lab-usage.js').then(m => m.exposed(id)).catch(() => {});
  return on;
}
