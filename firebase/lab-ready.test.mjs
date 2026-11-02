// Lab readiness (D-528): anyone counts one more use in labsUso/, in its shape; only the owner reads it and flagsListas/.
import assert from 'node:assert/strict';
import { createDb, loadRules } from '../tools/firebase/rules-sim.mjs';

const OWNER = 'TrNylkeOFXNhnTPWAApebKvbI3F2';
const db = createDb(undefined, {});
const w = (changes, uid = null) => db.update(changes, { uid });

assert.equal(w({ 'labsUso/copa-hoy/20394/n': 1 }), true, 'a first exposure, signed out');
assert.equal(w({ 'labsUso/copa-hoy/20394/n': 2, 'labsUso/copa-hoy/20394/k/abcd1234': true }), true, 'one more, with the key hash');
assert.equal(w({ 'labsUso/copa-hoy/20394/n': 9 }), false, 'only one more at a time');
assert.equal(w({ 'labsUso/copa-hoy/20394/c': 1 }), true, 'a completion');
assert.equal(w({ 'labsUso/copa-hoy/20394/e': 1 }), true, 'an error');
assert.equal(w({ 'labsUso/copa-hoy/20394/k/someone': true }), false, 'a hash, never a name');
assert.equal(w({ 'labsUso/copa-hoy/20394/who': 'x' }), false, 'nothing else');
assert.equal(w({ 'labsUso/Bad/20394/n': 1 }), false, 'flag ids as flags/');
assert.equal(w({ 'flagsListas/copa-hoy': { ready: true } }), false, 'only the owner writes the verdict');
assert.equal(w({ 'flagsListas/copa-hoy': { ready: true } }, OWNER), true);
const r = loadRules();
assert.match(r.labsUso['.read'], new RegExp(OWNER), 'only the owner reads the counts');
assert.match(r.flagsListas['.read'], new RegExp(OWNER));
console.log('✓ lab ready rules');
