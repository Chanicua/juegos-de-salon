// The cover page up to date (U-36): covers.mjs reads the tagline and the steps of a lab game.js and
// recognizes which games a PR touches. It is tested against the lab's real games.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coverOf, touchedGames, resolvedSteps, labsExits, stage, splashChanges } from './covers.mjs';

// Pintaminas, Rutas rotas and Loteo (D-332) and Agentes (D-421) left the lab: their steps are in La Copa's texts now
for (const slug of ['exploding-numbers', 'pulse']) {
  const { tagline, steps } = coverOf(readFileSync(new URL(`../../public/labs/${slug}/game.js`, import.meta.url), 'utf8'));
  assert.ok(tagline && tagline.length > 10, `${slug}: no tagline`);
  assert.ok(steps.length >= 2 && steps.length <= 3, `${slug}: ${steps.length} steps (U-18: up to 3)`);
  // The U-18 cap that the games test watches in La Copa, with the game's constants filled in
  const { resolved, length } = resolvedSteps(steps, { ...(await import(`../../public/labs/${slug}/engine.js`)) });
  assert.ok(resolved.every(p => !p.includes('${')), `${slug}: an unresolved \${…} was left`);
  assert.ok(length <= 280, `${slug}: "How to play" has ${length} characters (U-18: at most 280)`);
}
assert.deepEqual(touchedGames(['public/labs/routes/game.js', 'public/labs/routes/style.css', 'docs/x.md', 'public/cup/games/queens/ui.js']),
  { labs: ['routes'], others: ['queens'] });
assert.deepEqual(touchedGames(['README.md']), { labs: [], others: [] });
// The PR's stage (D-304): who leaves the lab
const untangle = `@@ -1,5 +1,4 @@ export const SUELTOS = [
   {
     id: 'desenredo',
     slug: 'untangle',
-    labs: true,
     duration: '2–5',`;
assert.deepEqual(labsExits(untangle, ''), ['untangle']);
assert.deepEqual(labsExits("@@ -20,3 +20,3 @@\n-  zip: { emoji: '〰️', labs: true },\n+  zip: { emoji: '〰️' },", ''), ['zip']);
assert.deepEqual(labsExits('', 'R100\tpublic/labs/routes/game.js\tpublic/routes/game.js\nM\tpublic/index.html'), ['routes']);
assert.deepEqual(labsExits('', 'R090\tpublic/labs/routes/a.js\tpublic/labs/routes/b.js'), [], 'moving within the lab is not leaving');
assert.deepEqual(labsExits("@@ -1,3 +1,3 @@\n-    labs: true,\n+    labs: true,", ''), [], 'a line rewritten the same takes nobody out');
assert.equal(stage(['public/labs/routes/game.js', 'public/labs/index.html', 'docs/games/routes.md'], []), 'labs');
assert.equal(stage(['public/labs/routes/game.js', 'public/assets/js/i18n.js'], []), 'site');
assert.equal(stage(['public/assets/js/games.js'], ['untangle']), 'leaves');
assert.equal(stage(['docs/x.md'], []), 'no-app');
console.log('✓ covers (U-36, D-304)');

// The splash campaigns a PR changes get a full usability pass (D-355)
assert.deepEqual(splashChanges(`@@ -17,1 +17,1 @@\n-export const ACTIVE = null;\n+export const ACTIVE = { id: 'tres-juegos-demo', until: '2026-10-23' };`), ['tres-juegos-demo']);
assert.deepEqual(splashChanges(`@@ -17,1 +17,1 @@\n-export const ACTIVE = { id: 'tres-juegos-demo' };\n+export const ACTIVE = null;`), [], 'turning it off shows nothing new');
assert.deepEqual(splashChanges(`@@ -30,6 +30,6 @@ export const CAMPAIGNS = {
   'tres-juegos-demo': {
     emoji: '🎉',
-    title: { es: 'Tres' },
+    title: { es: 'Tres juegos' },
   },
 };`), ['tres-juegos-demo']);
assert.deepEqual(splashChanges(`@@ -40,3 +40,8 @@
   },
+  'navidad': {
+    emoji: '🎄',
+  },
 };`), ['navidad']);
assert.deepEqual(splashChanges(''), []);
// ACTIVE is a queue: only the campaign it adds is new
assert.deepEqual(splashChanges(`@@ -17,1 +17,1 @@\n-export const ACTIVE = [{ id: 'a', until: '2026-10-23' }];\n+export const ACTIVE = [{ id: 'a', until: '2026-10-23' }, { id: 'b' }];`), ['b']);
assert.deepEqual(splashChanges(`@@ -17,1 +17,1 @@\n-export const ACTIVE = [{ id: 'a' }, { id: 'b' }];\n+export const ACTIVE = [{ id: 'b' }];`), [], 'turning one off shows nothing new');
