// Repro of #1103 (D-527, the example of a bug report that starts with a failing test): Shinobi's
// result showed the ninja twice, the 🥷 of the title and another one glued to the score. It fails on
// the code before the fix (`resumen: \`🥷 ${…}\``) and passes once the summary is just the number.
// ui.js needs a browser to load, so the test reads the function `resultado` from its source.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./ui.js', import.meta.url), 'utf8');
const fn = /export function resultado\([^)]*\)\s*\{[\s\S]*?\n\}/.exec(src)?.[0];
assert.ok(fn, 'resultado() is in ui.js');
const summary = /resumen:\s*([^,]+(?:\([^)]*\))?[^,]*),/.exec(fn)?.[1] || '';
assert.ok(summary, 'resultado() returns a summary');
assert.doesNotMatch(summary, /🥷/, '#1103: the result summary is the score alone, the ninja is already in the title');
