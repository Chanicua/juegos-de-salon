# End-to-end tests (headless Chrome over CDP)

Scripts that play full games in headless Chrome, with no npm dependencies: they use Chrome's
debugging protocol over WebSocket (`cdp.mjs`). Each script takes an output folder where it
leaves PNG screenshots, and prints to the console what it checked.
That folder, and the Chrome profiles the scripts create, never go into a commit: `tools/agents/repo-weight.test.mjs`
fails on any Chrome profile file or any file over 5 MB (D-494).

## Requirements

- Google Chrome installed at `/Applications/Google Chrome.app` (path in `cdp.mjs`), or another browser with `CHROME=/path/to/chrome`.
- Node 20 or later (uses native `fetch` and `WebSocket`).
- The site served at `http://localhost:8765`:

```bash
python3 -m http.server 8765 -d public
```

## Usage

```bash
mkdir -p /tmp/e2e && node tools/e2e/battleship/local.mjs /tmp/e2e
```

With another session testing at the same time (D-135), each one serves its worktree on its own port and
passes it to the scripts in `SITE` (**all** of them read it; without it, 8765; `SITIO`, its old name, still works). Chrome ports are not
chosen: `cdp.mjs` opens each Chrome with `--remote-debugging-port=0`, the system gives it a free one and
`launch` reads it from the profile's `DevToolsActivePort` file (D-213). Two sessions, or two scripts
of the same one, run at once without stepping on each other. The port each Chrome actually used is in `b.port`.

```bash
SITE=http://localhost:8791 node tools/e2e/hangman/online.mjs /tmp/e2e
```

`CDP_PORT` (formerly `PUERTO_CDP`) still exists for anyone who wants fixed ports (to connect by hand to one of the
script's Chromes, for example): the script's first Chrome uses `CDP_PORT`, the second the next one, and
so on. It is optional; without it there is nothing to coordinate.

## Test levels (D-346)

Each PR gets the least testing that still keeps the site safe, decided from what its changes reach
(`levelOf()` in `affected.mjs`, on top of D-329's page graph). The processes agent owns the criterion.

| Level | What the change reaches | What runs | Example |
|---|---|---|---|
| **N0 · no browser** | Nothing a page loads: docs, decisions, changelog, the agents, tools the scripts don't import, data in Firebase | Unit tests only (the `tests` check, ~2 min) | A decision, a lab key (D-345), the processes guide |
| **N1 · lab** | Only pages under `public/labs/` | That game's scripts + `smoke.mjs` | Tren en Vilo's gauge |
| **N2 · game** | Some public pages: not the home page, under a third of them | Their scripts + `smoke.mjs` | Hangman's rules |
| **N2 · home** | Only the home page (`public/index.html`, or a file only it loads) | Its own scripts: `home/*`, `smoke.mjs` and those that never leave it (`favorites.mjs`, `landing-fold.mjs`…), not the games that start there (D-388) | the home page's filters |
| **N3 · core** | The home page with something else, a third of the pages or more, or what the page graph can't narrow (shared modules and styles, the e2e tools, the workflows, a file no page links) | Every script | `base.css`, `ui.js`, `cdp.mjs` |

`smoke.mjs` is the floor of N1-N3: it opens every page and fails on an uncaught error or a blank screen,
so even a game with no script of its own is covered (#482 left one blank and nothing failed).
`structured-data.mjs` runs beside it on every level for the same reason: it opens every indexed page.
`ci.mjs --list|--groups --changes <file>` prints the level on stderr (`test level N2 · game: …`).

## On GitHub (D-193, D-307, D-308)

`ci.mjs` runs the scripts that don't touch the production Firebase, and GitHub uses it on every PR
(`.github/workflows/e2e.yml`). A script fails if it exits with an error, if it prints a line with ✗ or ❌, or
if it goes over 15 minutes (then `ci.mjs` sends it SIGTERM, so it closes its Chrome, and SIGKILL if it is
still alive after 5 s). The ones that only print what they see still fail if something breaks completely. The
`online.mjs`, the `chat.mjs` and the ones in the `ALSO_FIREBASE` list in `ci.mjs` open real rooms
and are still run by hand. The ones in `OBSOLETE` test something that no longer exists and wait for someone to rewrite them.

**In groups** (D-307): [`groups.mjs`](groups.mjs) splits the scripts into even groups based on
how long each one actually took ([`durations.json`](durations.json), in seconds), so that none
goes over ~4.5 min and all fit at once in the 20 runners GitHub gives at a time. Each group is a
job that runs its scripts one after another (that they stay even and each script appears once is tested by
`node tools/e2e/groups.test.mjs`); the run summary has the table with each script, its
time and its result, and the `screenshots-g<n>` artifact has, in one folder per script, the screenshots of
what failed or passed on the second attempt. A new script gets in on its own, with an assumed 90 s until it is
measured: each job leaves a "Durations" notice with how long each script took, and
`node tools/e2e/groups.mjs measure` moves it into `durations.json` (the processes round, every round;
that file alone runs no script, D-428). A script that goes over about 4 minutes is split into parts (`PARTS` in
`ci.mjs`, D-204): `cup/tournament.mjs` into `cup`, `labs`, `demos` and `weekend` (D-439), `cup/languages.mjs` into `cup`,
`standalone`, `screens-a` and `screens-b` (D-428), and `cup-games/languages.mjs` into one per game. Each part reaches the script as `--part <name>`; without a part, the script runs whole
(that is how `readme.py screenshots` runs it, and anyone testing it by hand).

A PR that touches nothing in the browser (`docs/`, `marketing/`, `.claude/`, the `.md` files outside `public/`
and this folder, `tools/agents/`, `tools/firebase/`, `firebase/` and the workflows other than
`e2e.yml`) runs no script: `ci.mjs --groups --changes <file>` comes out empty, and
[`changes.mjs`](changes.mjs) decides what counts (D-205, D-299; tested by
`node tools/e2e/changes.test.mjs`).

Each push to a PR tests only what changed since the PR's last commit that passed (D-392,
[`since-passed.mjs`](since-passed.mjs), tested by `node tools/e2e/since-passed.test.mjs`): the first push, or one after a red run, tests the whole PR.
Any other PR runs **only the scripts whose pages load what it changed** (D-329,
[`affected.mjs`](affected.mjs), tested by `node tools/e2e/affected.test.mjs`). There is no build, so
the graph is read straight from the files: each `index.html`, what it links, and what that imports.
A file whose diff only touches comments or blank lines is dropped first (D-515,
[`inert.mjs`](inert.mjs), tested by `node tools/e2e/inert.test.mjs`): no browser can notice it.
A module whose diff changes only some functions, or some texts of `i18n.js`, runs only the pages
that use those names (D-516, [`narrow.mjs`](narrow.mjs), tested by `node tools/e2e/narrow.test.mjs`).
So a page is only as narrow as its imports: what other pages need from a game (La Copa's code, clock
and notification sheets' texts, D-377; the seeded `rng`, D-378) lives in small modules of its own, and
The design behind all this is [docs/TEST-SCOPE.md](../../docs/TEST-SCOPE.md). [`scope-guard.test.mjs`](scope-guard.test.mjs) fails if a file of the site is loaded by no page, or a script
names no page, since either makes the graph run every script (D-391): a page loads what its tags, imports,
`import('…')` and `new URL('<file>', …)` name. [`scope.test.mjs`](scope.test.mjs) fails if a page loads another game's files, unless `affected.mjs`
lists it in `SHARED` (a small module every page may load) or `REUSES` (a game that plays another's
engine on purpose: built from each game's `reuses` in `public/assets/js/games.js`, #855, plus the pages outside
the manifest such as `labs/code`), each with its reason (D-378). A game's file that La Copa plays (`cup/games/<game>/…`,
and the engines it takes from `bulls-and-cows/` and `timeline/`) is imported by every screen of La Copa
but counts only for the pages that play it: that game's page, the cup and `cup/suelto` and its declared
reuses (`playedOn()`); a load error on the other screens is what `smoke.mjs` catches on any change.
**Each PR's run summary shows its scope** (`ci.mjs --scope`, in `e2e.yml`'s `list` job): how many jobs
run, and for each changed file of the site the pages and jobs it reaches and, if it reaches other games'
pages, the import that takes it there.
A script's pages come from its `${SITE}/…` addresses, its folder (`hangman/` → `/hangman/`,
`case/` → `/labs/case/`) and the page names it lists when it builds its routes; a part named after a
game (`cup-games/languages.mjs:year`) runs only with that game. **When in doubt, everything runs:**
a file in `public/` that no page loads (`sw.js`, an image fetched at run time), `tools/e2e/`'s shared
code, `e2e.yml`, a tool a script imports, a file at the root, or a script that builds routes without
naming them. A changed script always runs itself. `node tools/e2e/ci.mjs --list --changes <file>`
shows what a list of files would run. A push to `main` (`publish.yml`) skips it if that tree already
passed (D-308), runs `smoke.mjs` plus what the merge reaches if the merged PR's head passed (D-496), and
everything otherwise.

A script that fails is repeated **once**, right away, inside its group (`CI_RETRIES=1`, D-299).
If it passes on the second attempt, it stays green with a ⚠️ **Flaky** notice that names it, and the
screenshots of the first attempt stay in the artifact: you have to look at why it sometimes fails, not take it
as good. If it fails twice, the group goes red, with a notice that names the script.

**On publishing** (D-302, D-308, D-496): each run that passes with scripts leaves a mark, the artifact
`e2e-tree-<tree>`, with the tree it tested (on a PR, the test merge with main). `publish.yml`
runs [`already-tested.mjs`](already-tested.mjs): if the tree it is about to publish already has a mark, or only
changes what doesn't reach the browser over a parent that has one, it doesn't repeat the end-to-end run. If it is a
merge whose PR head passed its own run (`e2e-head-<sha>`), it runs `smoke.mjs` plus the scripts the merge's diff
(`git diff HEAD^1 HEAD`) reaches, leaves no tree mark and closes no issue. Otherwise,
it runs it whole (when it doesn't repeat it is tested by `node tools/e2e/already-tested.test.mjs`), and if it comes out
red it doesn't publish and the `notify` job opens a "main is red:
end-to-end" issue; when `main` is green again, `close-notice` closes it with the link to the run (D-273).

**Wait for a condition, not a fixed pause** (D-307): `cdp.mjs` has `abrir(url, cap)` (opens: navigates
and waits for `load` and for the page to settle), `asentar(cap)` (settles: no DOM changes for 150 ms and
finite animations finished) and `hasta(expr, cap)` (until the expression is true); their English names come
with the game scripts' rename (D-316).
The cap is the old fixed pause: it never waits longer, and almost always much less. A new script
uses these instead of `sleep` and `go(url, ms)`; `sleep` remains for what really depends on the
clock (letting a timer run, a double tap).

```bash
node tools/e2e/ci.mjs              # all the CI ones, one after another (not before pushing: the check runs them, D-428)
node tools/e2e/ci.mjs --groups     # the groups GitHub would run (JSON)
node tools/e2e/groups.mjs show     # the same, with their estimated time
node tools/e2e/ci.mjs cup/tournament.mjs   # just that one
node tools/e2e/ci.mjs cup/tournament.mjs:demos   # just that part
CI_RETRIES=1 node tools/e2e/ci.mjs a.mjs b.mjs     # as on GitHub: with a second attempt
```

`look.mjs` is not a test: it opens a single screen to review it one at a time, without playing the
game. `node tools/e2e/look.mjs ahorcado game --width 320` takes the screenshot and warns if there is
horizontal scroll, buttons under 44 px (C-8) and how much space there is between the board and its buttons (D-309).
Also, **every `b.shot()` of any script measures that space** (`spacing-common.mjs`) and prints ✗ if a
button is less than 24 px from a `data-tablero`: the script goes red (with `SPACING_REPORT=1`
it prints the space of every screenshot, even when it passes). It also prints ✗ if two buttons of the screen sit on top of each other (U-12, `spacing-common.mjs`; a deliberate stack is marked `data-overlap-ok`, D-520). `--lang de` (or `en`, `pt`) opens it in that language;
`--height`, `--notches` (a phone with a notch), `--chat` (mounts the room chat's 💬 bubble and names any button it covers, C-15) and `--out <folder>` are the other options. The
panel is viewed with seeded data: `look.mjs panel <shot>`, with `data`, `now`, `tournament`, `games`,
`audience`, `traffic`, `health` (D-251), `cup-card`, `cup-days`, `cup-history`, `game-card` or `room-card` (D-207); `tournament` also brings a week of seeded notifications (D-233). The
paths to each screen are in [`paths.mjs`](paths.mjs), which it shares with the language tests.

`contact-sheet.mjs` isn't one either: it builds a sheet with **all** the README screenshots of a section,
at the size the README shows them, to look at them together before publishing (D-76).

```bash
node tools/e2e/contact-sheet.mjs cuarto-rey --out /tmp/contact-sheet
```

| Script | What it tests |
|---|---|
| `panel/views.mjs` | Every panel view in `PATHS.panel` at 900 and 390 px with seeded data: no uncaught error, no `undefined`/`NaN`/`Infinity`/`[object …]` on screen, no sideways overflow, and no offline-log row from the other domain (D-484) |
| `landing-fold.mjs` | Every game's landing (the `intro` path of each game in `paths.mjs`) at 320×568 and 375×667 in every language: the start button, or the first mode, is above the fold (U-39, D-344) |
| `fourth-king/lab.mjs` | Cuarto Rey in La Bodega (D-420): not on the home page, in the lab's La Bodega folded to its title, a tap shows Play; `/fourth-king/` and `/cuarto-rey/` lead to `/labs/fourth-king/`, which loads behind the lab's door and is not indexed |
| `fourth-king/game.mjs` | At `/labs/fourth-king/` (D-420): sound button, full deck up to the fourth king and the menu in English; that the table is exactly the script's names, even if the remembered table brings more rows |
| `bulls-and-cows/local.mjs` | One phone and playing solo (twice, to see the record), up to the result |
| `bulls-and-cows/choose-box.mjs` | Playing solo with a lab key: tapping a box chooses where the next digit goes (#604) |
| `bulls-and-cows/online.mjs` | Two phones against real Firebase: joining by URL, reload midway, rematch |
| `battleship/local.mjs` | Placement, battle on one phone and against the phone |
| `battleship/placement.mjs` | Selecting, rotating, moving and deselecting ships on the grid |
| `battleship/salvo.mjs` | Salvo mode (lab, D-489): the switch, a volley entered with taps and one ¡Fuego!, its answers shown together, the volley shrinking with ships lost, and the phone's volley |
| `battleship/alignment.mjs` | That row numbers line up with the cells at three widths |
| `battleship/online.mjs` | Two phones against real Firebase, with reload and rematch; first a rematch without network, which must show the room text under the button and give the button back (D-322) |
| `battleship/chat.mjs` | Room chat: saved when placing your own fleet, bubble and label, doesn't move the game, comes back on reload and stays in the result. |
| `hangman/local.mjs` | Chain of three on one phone, buying a letter, resuming and solitaire |
| `hangman/online.mjs` | Three phones against real Firebase: chain, reconnection midway and rematch |
| `liars-dice/local.mjs` | Duel against the phone and a three-player game on one phone, with resuming midway |
| `liars-dice/online.mjs` | Three phones against real Firebase: room, verified reveal, reload midway and rematch |
| `liars-dice/rooms-classic.mjs` | The 📜 classic rules (D-490, D-495) in a room, 2 to 5 phones (`PHONES`, `PASAR`, `SICILIANA`, `REMATCH`), against real Firebase: every phone agrees, the obligada notice reaches all of them and none shows its own die, a reload mid-obligada; with `SICILIANA=1` it doubts the game's first bid and checks every phone shows the siciliana line and the same two-dice loss; `NOLAB_SITE` makes the last guest a player without a lab key (since D-495 the rules need none). Every phone leaves for good at the end, so the room is deleted |
| `liars-dice/shake-clock.mjs` | Dudo's lab switches (`#seccion-dudo-cacho`), against the phone: the dice come face down and synthetic `devicemotion` shakes roll them on screen until they land; out of time on the 30 s clock costs a die with no reveal; a page with no sensor rolls with the 🎲 button |
| `liars-dice/classic.mjs` | Dudo's 📜 classic rules (D-487, D-490, for everyone since D-495): the folded Variantes row, the announced and open obligada round (the rivals' die face up, your own as ❓) and the one-time calzar hint, against the phone and with three players on one phone |
| `generala/local.mjs` | Playing solo all the way, three on one phone with reload midway and the served generala: nothing chosen beforehand (C-8), the held dice don't change and what the scoresheet promised is scored |
| `generala/online.mjs` | Two phones against real Firebase: the dice of whoever plays in view of the other, reload midway, full game and rematch |
| `case/lab.mjs` | The case in `/labs/case/` (D-267): the lab offers it in La Bodega (D-280), folded to its title while active projects are open, and a tap opens it and shows Play; `/case/` leads there; without a seed it is the case of the day and the link stays clean; with La Copa's screen, marking too early counts as an error (D-261), on reload it continues where it was without the countdown, and the case is solved without guessing; the end offers sharing, another case, today's and the feedback form, with the submission intercepted (D-265), whose optional email says what it is for and refuses a malformed address (D-317) |
| `labs/publish.mjs` | 🚀 Publicar para todos on `/labs/` (D-480): without the owner signed in the page is as before, only the 🔑 link at its foot; for the owner each card being tried gets the button, the sheet says it is not immediate, and each state of a request (waiting, PR open with its checks and preview, merged, failed with Volver a pedir) shows on its card |
| `agents/game.mjs` | 🕵️ Agentes at /agents/ (D-421): waiting room with the Clasificado stamp, the self-playing drawing and the Codenames credit; the 3, 2, 1 countdown to the engine's board for the seed; marks 📌/🚫 by long press; a game played against the engine (agent of the clue, of another clue without cutting, the assassin's Cortada stamp, Completa, the last clue's Terminar asking first), the end stamp and the trap, La Copa's clock stopped, and «Ver resultado» with the engine's score, breakdown and card; resuming from the moves; La Copa's practice and its 2-clue trial; the three languages at 320 × 568 without sideways scroll; reduced motion |
| `bridges/game.mjs` | 🚂 Tren en Vilo at /bridges/ (D-456): the waiting room in the house style with its demo bridge and the Poly Bridge credit; stage 1 of 5 with the deck laid (it cannot be removed or cleared), the wood counter; a real drag lays a beam and spends wood, ↩ Undo takes it back; the catalog's bridge crosses each of the five stages, the summary shows wood, strain, time and points while the clock stands still; the end stamp, the engine's score and «Ver resultado» with the share card; a given-up game shows how its stage could be crossed; 320 × 568 in three languages without sideways scroll |
| `cup/out.mjs` | Whoever is out of the cup (D-347, D-376), with the `out` demo: the faded row with 🚪 and one "Eliminado" pill over the days they will not play, in three languages at 320 px and inside the row; their faded line and chip in the chart, with 🚪 and no "-2J"; and what the shared image writes for them (🚪, ELIMINADO, the name faded) |
| `cup/resumed-clock.mjs` | La Copa's day resumed without its save on this phone (D-433), with the `resumed` demo (`?test&demo=resumed`): «Seguir jugando» goes on with the clock from the server's start (about 4:00) and the screen says it was started on another phone |
| `cup/back-board.mjs` | La Copa's header ‹ in the lab (flag `cup-back-board`, #1040): on a day's cover, while playing it and on its result it says «Volver a la copa» and links to the board; mid-day the back guard asks first; a trial run goes back to the day's cover |
| `cup/archived.mjs` | An archived cup's link (D-478), with the test store: with `&lab` a code missing from `torneos/` but kept in `torneoPodios/` shows the cup's name, when it ended, its podium 🥇🥈🥉 and the two buttons (a new cup with the same name, the medal table), in three languages at 320 px; without `&lab`, or with no podium, the "not found" error of before |
| `cup/variants.mjs` | La Copa with variants (D-331): a 3-day cup whose game days are Pintaminas and Loteo; one variant row per game below the week, starting on the default; the admin picks ⚡ hard and ⚡💧 Utilities, moving a day keeps them, and the cup saves `pintaminas:hard,loteo:utilities,final`; a second player signs up; each day's card, its waiting room and its folded rules say the variant, and the board is the variant's (two colors and three brushes; ⚡ and 💧) |
| `cup/create-week.mjs` | La Copa's new create screen in the lab (D-425), with `?test&lab`: without `&lab` the test store keeps the screen of before; the week in view from the start; 🎲 Crear al azar draws again, with no locks, the cards spinning and landing one after the other, and at 320×640 the week scrolled into view (a second roll, with it already in view, does not move the page); each week style draws by its rule; tapping a game opens the sheet with every game of the pool (`POZO_ABIERTO`), which swaps, replaces, moves the day and picks its version, closed by a yellow Listo; dragging by the grip still works; Ahora and Mañana with their weekday; the PIN once with 👁; "More options" folds the language, the audience and the link and says in one line what is chosen; the length up front, next to when it starts (D-437): seven days by default, three draws three games under "Los 3 días" and no final (D-438); the line under the button with when the cup starts and ends; the cup created saves the week as shown; the week and the sheet in English, Portuguese and German at 320 px without sideways scroll |
| `routes/game.mjs` | 🚇 Rutas rotas at /routes/ (D-331, D-332): waiting room with the self-solving cover, the drawing of a turn and the Junction Nine credit; a real drag and a tap against the engine; undo and restart; the countdown pauses with the screen hidden; the five stages; La Copa's clock stops at the end and the result, breakdown and share card match the engine; giving up after a second tap; time running out (page clock pushed ahead); resuming from saved moves; the cup practice and its 2-stage trial; 320×568 in three languages; reduced motion |
| `dominorama/lab.mjs` | The lab's Dominorama (formerly Pips) (D-381): the lab offers it in Juegos en prueba with the credit to NYT Pips, also on the cover; the cover board solves itself; Empezar goes through the 3, 2, 1 to board 1 of 3; a domino is chosen, turned with a second tap and laid with a tap on a cell; one that does not fit says so; a placed one comes off with a tap; the engine's solution laid with taps solves the three boards; the 💡 help asks for a second tap and lays one; the result brings sharing, other boards and the comment after a line; giving up asks for a second tap. At 375 px |
| `chameleon/lab.mjs` | The lab's El Camaleón (#898) at 320 px: the lab offers it with the credit to Big Potato Games' The Chameleon, also on the cover; four players, a topic, the phone goes around with each card covered until its player taps and only the chameleon without the word; the clues; a wrong vote (+2 for the chameleon); a caught chameleon who misses (+1 for the rest); a reload resumes the round; rounds until 5 and the end screen; Play again from 0; the cover in en, pt and de; no sideways scroll and a clean console |
| `stack/game.mjs` | 🗼 Babel at /babel/ (D-517): the waiting room with the self-building tower and the credit to Ketchapp's Stack with its link; Empezar through the countdown to the tower at 0 with "Toca donde sea"; a real tap drops the block; perfect drops say "Perfecto ×n", a late one cuts; losing focus pauses and the tap back only resumes; a miss ends it, and «Ver resultado» gives 2 points a block with the breakdown and the share card. 320 px without sideways scroll |
| `stack/lab.mjs` | The lab's Stack (D-445): the lab offers it in Juegos en prueba with the credit to Ketchapp's Stack, also on the English cover; the cover's tower builds itself; Play opens the tower with "Tap anywhere"; a real tap on the screen drops the block; perfect drops cut nothing and say Perfect ×n; a late one cuts; a miss ends it with the score, the best kept on the phone, sharing, Play again and the comment after a line; Play again starts at 0 and shows the best. At 375 px |
| `stick/game.mjs` | 🥷 Shinobi (id `stick`) at /shinobi/ (D-517): the waiting room with the self-playing demo and the credit to Stick Hero (Ketchapp) with its link; Empezar goes to the night with the score, the three lives and the hint; a real tap (a stick far too short) costs a life and the ninja climbs back; three flags in a row score 2 + 3 + 4 and show the streak chip; a hidden page pauses and a tap resumes; the last life ends the run, and «Ver resultado» has the share card with its 🎯. 320 × 568 in three languages without sideways scroll |
| `stick/lab.mjs` | The lab's Stick Ninja (D-446): the lab offers it in Juegos en prueba with the credit to Ketchapp's Stick Hero, also on the English cover; the cover plays itself; Play opens the night with "Hold to stretch"; a real press stretches the stick; a tip on the flag is a perfect (+2, then +3 and +4 in a row, the pulse, Perfect ×n, the streak chip, the Bullseye and On fire achievements); a plain landing is +1 and breaks the streak; no stars on the course; a pause in the middle of a hold keeps the stick and the tap back does not drop it; a stick too long falls, with the result (score, best kept on the phone, breakdown, share, Play again, the comment after a line); a moving pillar from the 10th on, with its hint, slides, and aiming where it will be is a perfect (Moving target); a real quick tap falls short, and the second run lists today's runs. At 375 px |
| `exploding-numbers/lab.mjs` | The lab's Exploding numbers (D-297): the lab offers it in Active projects with the credit to Number Match, which is also on the cover; the cover plays itself (the pairs explode); Start goes through the 3, 2, 1 countdown and builds the 4-row board; a pair that doesn't join shakes and says why; one that joins explodes (sparks and 💥); the 💡 Help asks for a second tap and marks a pair; ➕ with pairs in view asks for a second tap and copies the remaining ones below; with the engine's order it clears entirely, the rows go away and it pays 100/100; the result brings sharing, another board, today's and the feedback after a line; giving up asks for a second tap and is worth the exploded part. At 375 px |
| `flap/lab.mjs` | The lab's 🐤 Aletazo: the lab offers it in Juegos en prueba with the credit to Flappy Bird, also on the cover; the cover (tagline, three steps, Jugar) floats over a demo that flies itself; Jugar waits for the first tap («Toca para volar»); taps timed like a player's get it through a level (the «Nivel 2» banner, the HUD's level and score); without taps it loses its 3 lives and the result shows the stamp, the score, a line about how it went, Jugar otra vez and the way back to the lab; a worse game shows «Tu mejor»; in English the cover is in English. At 375 px, and the cover at 320 × 568 |
| `plots/numbers.mjs` | 📐 Loteo, 🔢 Numbers, at /plots/ (D-310, D-331, D-332): the waiting room's self-solving board, the Shikaku credit and the variant picker; `?mode=numbers` wins over the remembered variant; the 3, 2, 1 and board 1 of 5 with the engine's numbers; the live size, a real drag, the three rejections, tap to erase; the 💡 hint with its second tap, which ↩️ Undo removes; Clear with its second tap and Undo bringing it back; the 5 boards with the engine's solution, the clock stopping, «¡Todo loteado!», the engine's score, card and breakdown; giving up shows the solution and counts the boards done; the cup practice. At 375 px (`WIDTH=320` at 320) |
| `plots/utilities.mjs` | 📐 Loteo, ⚡💧 Utilities, at /plots/ (D-311, D-312, D-331): picking it in the waiting room changes the steps, the drawing and the board on top, and the ranking's name, and the title does not move while switching either way; the phone remembers it and `?mode=utilities` goes straight in; «Lotes de n casillas» and the engine's icons; the three rejections; the 5 boards with the engine's solution, board 3's notice and not board 4's; the engine's score and the variant's card. At 375 px (`WIDTH=320` at 320) |
| `paint-mines/game.mjs` | 🖌️ Pintaminas on its page /paint-mines/ (D-289, D-331): the waiting room credits ColorSweeper and its cover paints itself; the lever turns hard on (flash, night-blue background, two-color cover, the phone remembers it) and back (no flash); an easy game against the engine: a hit shows its number, a miss −15 with the true color, the 💡 hint asks a second tap, marks a cell and its numbers and is seen again free; revealed, 75/100 with one mistake and one hint, the breakdown and the 🟥 card; 320 px; ?mode=hard (and ?colors=2): three brushes, striped second color, no mistakes 100/100, night blue up to the result; giving up scores the painted part. At 375 px |
| `code/lab.mjs` | The lab's Code (D-270): the lab offers it in La Bodega (D-280); the cover (title, illustration and three steps, Word only in Spanish, without the 8 mode); tapping a card places and selects it, ✕ removes it, and without orienting the code can't be read; a stroke on top of another looks striped, without text; with the 4 upright the code is read without clashes; a wrong one counts and the right one opens with sharing and the form; in Word, flipping shows the other side and the word is read and opens. At 320 px and in the three languages |
| `julep/local.mjs` | Table of three against the phone and a game on one phone, with resuming midway |
| `julep/online.mjs` | Three phones against real Firebase: sealed deal, verified-cards seal, reload midway and chat |
| `julep/lab.mjs` | Julepe in La Bodega (D-434): not on the home page, not even dimmed; in La Bodega's kept games folded, tagged 👋, a tap shows Play; `/julep/?room=` and `/julepe/?room=` lead to `/labs/julep/?room=`, which loads behind the lab's door and is not indexed |
| `timeline/local.mjs` | One phone with three players, with resuming midway |
| `timeline/solo.mjs` | Playing solo (⏳ Línea Relámpago): theme only, error in red, resuming, score, record per theme, cards not repeated, and in each language |
| `timeline/error.mjs` | Error screen that stays until tapped; the opponent waits |
| `timeline/online.mjs` | Three phones against real Firebase, reload and rematch |
| `bulls-and-cows/chat.mjs` | Room chat in Toque y Fama: unread, label, and that it dies with the game |
| `timeline/choice.mjs` | That the chosen card is placed and that without choosing nothing can be placed |
| `timeline/fact.mjs` | Each card's fact in Línea Relámpago (D-277, D-314): the error tells it with the clock paused and a 6 s cap, the hit too, and it closes by itself when the bar empties (D-314), the end is the review, and in English |
| `timeline/verdict.mjs` | That the verdict speaks in the third person when someone else was wrong |
| `timeline/decks.mjs` | All the themes and that ten games in a row don't repeat cards |
| `timeline/pool.mjs` | Common pool: draw of 6, refill from the end, goal and setting that travels in the room |
| `timeline/table.mjs` | All in view: table of twice the goal and no refill |
| `timeline/drag.mjs` | The drag gesture with touch events: choosing without placing, resuming, dropping outside, side swipe, and a finger lifted outside the strip still dropping the card |
| `timeline/tie.mjs` | That the round ends and that the tie is won by the fastest |
| `timeline/chat.mjs` | Room chat: unread, spam brake, verdict covering it, reconnection and death at the end |
| `game-memory.mjs` | Saving and resuming in the three games (canon C-6) |
| `versioning.mjs` | That all modules load with the import map's `?h=` content hash (D-467). Since D-205 `public/` doesn't carry it: run it against a stamped copy (`set-version.py --site /tmp/site`, served and passed in `SITE`) |
| `structured-data.mjs` | On every indexed page, opened in Spanish as a crawler opens it, the JSON-LD's name is on the page and a game's FAQPage answer is, word for word, the "Cómo se juega" text the cover renders (#883). Like `smoke.mjs` it opens every page, so it is in `EVERY_PAGE` and runs on N1-N3 |
| `installable.mjs` | The installable app (D-221): on the home page, a game, La Copa, a standalone game and `/records/`, Chrome registers `/sw.js` with scope `/`, reads the manifest without errors and allows installing. In the three languages, on the home page and in a game, checks that the app is named with the language's `appTitle`, in the manifest and in `apple-mobile-web-app-title` (D-222). Against a stamped copy (`SITE`) it also checks that the import map doesn't break |
| `install-prompt.mjs` | The home page bubble that invites adding the app to the home screen (D-232): with each person's phone (Safari and Chrome on iPhone, Chrome and Samsung on Android, WhatsApp), checks the sheet's steps, Chrome's own dialog, that the ✕ and "Ya la agregué" turn it off for good, that it doesn't show on a computer or in the installed app, and that it fits at 320 px in the three languages |
| `feedback-prod.mjs` | The "💬 Sugerencias y comentarios" inbox in production (D-345, U-38): at the end of a game, after its buttons, a quiet link that unfolds the form in place; sending saves the message (in `?test`'s local store) with its kind; the link rests the rest of the day and 14 days after sending; it reads well in the three languages at 320 px; the home footer link opens the form in its overlay |
| `daily.mjs` | Uno al día (D-230): with the clock fixed on day no. 1, the home page card next to La Copa (D-239: the pills of both on one line, the die that says "Juego al azar" again and the button next to the die from `/labs/`), the card that opens /today/ with the season box and its Jugar (D-414), the die that lands on today's game, the intro line, a link to another game that goes to today's, the result card (streak, sharing without naming the game, with image), without the game's ranking, the second attempt as practice, the "Listo" button and `/today/` with its streak ("Hoy jugaste" with the game's emoji and "Próximo juego en…"), its calendar (the emoji and the score in a pill) and each game's trend, at 320 px and in the three languages |
| `daily-player.mjs` | Uno al día with a player (D-230), with the test store: Sara plays today's, signs in and her day goes up to the history and the rankings (daily and streaks); `/today/` shows the ranking with its four tabs and the wildcards say what they are for; inviting sends her link in the first person; Pedro, on another "phone", sees "🔥 Sara te desafía", plays, sees the duel and gives Sara a wildcard, which she sees once when she comes back; the month's points (D-412, D-414) open Uno al día's ranking and show her in /records/ and on /today/, whose calendar opens a day's details under the grid |
| `daily-notifications.mjs` | Uno al día's notifications (D-230), with a fake notification service: the offer with the three times the second time you finish, choosing one subscribes and saves `pushDia`, the `/today/` bell (time, switches, Silenciar), that there's no reminder in the calendar (the reminder is the daily notification, decision 15 of D-230), blocked notifications, and the iPhone paths in Safari and inside WhatsApp |
| `daily-languages.mjs` | /today/ with its points (D-414) in every offered language: the page with a week played, the rules, a day's details and the footer, against Spanish (`paths.mjs`, `today`) |
| `daily-group.mjs` | Uno al día with El Ahorcado, Batalla Naval and Dudo (D-230): with the clock fixed on a day when each one is due, that `?today` opens the one-player mode directly, the intro line, that the word, the phone's fleet and the dice come from the day's seed, the score from its formula, the card above the game's buttons, without rematch (#226), the second attempt as practice, a link to another game that goes to today's, `/today/` and the die that names the group ones |
| `daily-attempt.mjs` | Leaving a game midway (D-432, D-433): a back swipe (`history.back()`, as the phone's gesture) or «‹ Menú» asks «¿Salir de la partida?» and Seguir jugando stays, a second swipe asks again; Uno al día's first attempt counts from its start: a group game left halfway counts 0, a solo game left halfway goes on where it was (the home page's Uno al día goes straight to it, without the die), and a day that ended unfinished counts 0 |
| `daily-variants.mjs` | Uno al día with a game that has variants (D-334): with the page clock on the first day each one is due, looked up in the deck (D-405), `?today` opens without the variant picker and plays the default variant even when the phone remembers the other one, which stays remembered for standalone play |
| `share-room.mjs` | Share button: native dialog if it exists, copy if not |
| `favorites.mjs` | The home page favorites (D-238, D-241): the ⭐ is tapped with a finger and marks without opening the game, the ⭐ Favoritos chip appears with the first one and shows only those (and goes in the URL), unmarking there doesn't take the card out of the view, they are remembered on reload, `?type=favorites` without favorites shows all, and where ⭐ Favoritos goes (D-241): first in the type row at 390 px and on a computer, and at 320 px where it fits (on its own line if not), always with the types in one row and without overflowing, in the three languages |
| `share-home.mjs` | The home page share button (D-226, D-242), in the three languages: in Spanish it opens the sheet with the video, without loading it until it's tapped, and "Compartir el video" sends the YouTube link (D-253); in the others it shares directly, with no sheet (D-254). In all, the language's social card as an image, the text with its header and the link to that language's home page; on a computer, only the copied text and nothing downloaded |
| `invite-link.mjs` | Whoever arrives by a link can only join that room, in the four games with rooms |
| `rooms/online.mjs` | Seats against real Firebase (#850): four phones join a room for six at the same instant and each gets its own seat; two phones for the last seat, one sits and the other hears the room is full; everyone leaves and the room is deleted |
| `room-error.mjs` | Without reaching Firebase (D-40, D-319): each room game's message, Toque y Fama in each language and the other six spread among them; while it waits the button says "Abriendo sala…" (`aria-busy`), then gets its own label back as the retry, the "📱 Jugar en un celular" way out sits under the message, and tapping it opens a clean one-phone setup |
| `lang-from-url.mjs` | The language that comes in the link, in each language: `?lang=`, the gates (`/en/`, `/pt/`; the old `/de/` opens English, D-514) and the invitations to a room and to a cup |
| `room-cap.mjs` | Past the cap of rooms per phone, warns instantly and without touching the network |
| `hangman/languages.mjs` | El Ahorcado in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `battleship/languages.mjs` | Batalla Naval in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `bulls-and-cows/languages.mjs` | Toque y Fama in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `timeline/languages.mjs` | Línea de Tiempo in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `liars-dice/languages.mjs` | Dudo in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `generala/languages.mjs` | Generala in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `julep/languages.mjs` | Julepe in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `fourth-king/languages.mjs` | Cuarto Rey in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `cup-games/languages.mjs` | La Copa's standalone games in all languages: each screen in `paths.mjs` against the Spanish one (D-199) |
| `tango/give-up.mjs` | ☀️ Tango at `/tango/`: 🏳️ Give up next to 🧹 Clear all asks to confirm, shows the solution and scores 0 points, as in Queens (D-110) |
| `home/cup-today.mjs` | La Copa's card on the home page (lab flag `copa-hoy`): with a day of this phone's cup left to play, ▶ Jugar hoy and a link to that day, read from `juegos-de-salon:copa:hoy:<code>` without loading the cup's files (D-378); once played, the card as always |
| `home/dice.mjs` | 🎲 Juego al azar with the 🎲 Dados filter on: it still lands on games of every kind, and never on Cuarto Rey (in La Bodega since D-420) nor La Copa (D-188, D-374); back on the home page before the game loaded, no dice is left over it and 🎲 rolls at once (D-375) |
| `home/instant.mjs` | The home page drawn at once (D-435): the first visit saves a copy of the list, the next draws it before any module and the real cards replace it with the same HTML; a `?type=` link never uses it; and Uno al día's place on the card refreshed from the month's table once today is played |
| `home/lab.mjs` | The lab's three groups, with the home page experiments card folded in La Bodega, and the home page's experiments bar (D-361, D-363, D-369, D-372): `/labs/home/` landing on the real home page with the bar, the filters sticking on scroll, the language, no bar for players |
| `home/search.mjs` | The home page's search (D-387, D-390, D-393, D-396), for every player since D-403: shown without `?search` and without a lab key; the 🔎 pill first in the filter row, left of ⭐ Favoritos (D-396), which fits at 320 px; tapped, the field takes that row; the dropdown names up to five games with the word that found them while the list stays put; "Ver los n juegos" filters the list; nothing found; ✕ brings the pills back; a suggestion opens its game; ↓ ↓ Enter opens the second suggestion, ↑ wraps to "see them all" and Enter filters, the mouse over an option selects it, and the first Escape folds the dropdown while the second closes the search |
| `home/recap.mjs` | The recap of an ended cup over the home page (D-423), with La Copa's podium demo (`?recap=demo`): the window in the three languages at 320 px, its final table as the image the cup shares (a 1080 px image in place of the rows, D-427), the link to the cup, the ✕, the hidden `/cup/recap/` frame gone once it answered, nothing recorded by the demo, and its card in the lab. Then Uno al día's season (D-424, `?recap=season-demo`): the same window in the three languages, eight players week by week, the player 3rd and marked, the new season's line, the link to /today/, Cerrar recording nothing, and its own lab card |
| `home/popular.mjs` | What players see since D-369: the 🔥 Popular label on three cards (not La Copa nor "New"), the ✨ Nuevos / 🔥 Populares chips above the types in three languages at 320 px and their filtering, ⭐ Favoritos in that row and centered, the app's name on the floating menu and its tap, the space under the floating filters, and the menu still floating after a tap on a short result until the player scrolls up (D-371) |
| `splash/languages.mjs` | Every splash campaign in all languages: each one as `?splash=<id>` against the Spanish one (D-199, D-355; a campaign that is not on needs a lab key, which localhost always counts as, D-395) |

## All languages (D-199)

Each game has its `<folder>/languages.mjs` (`hangman/`, `battleship/`, `bulls-and-cows/`,
`timeline/`, `liars-dice/`, `generala/`, `julep/`, `fourth-king/`, and `cup-games/` for the La Copa games
played standalone; `splash/` does the same for each campaign of the home page's splash, D-355). They go through each screen in [`paths.mjs`](paths.mjs) in each language of
`LANGS` —a new language gets in on its own— and compare it with the same screen in Spanish:

- the page is in that language (`<html lang>`) and reaches the same screen;
- no `undefined`, `NaN`, `[object …]` or unreplaced `{placeholder}` shows up;
- nothing was left in Spanish: neither a text from the dictionaries (the game's `LOCALES` and `COMMON`) that
  says something else in that language, nor a long line identical to the one on the Spanish screen, which
  is how a text written by hand outside the dictionaries gives itself away;
- the longest text doesn't break the screen (C-8): no horizontal scroll, buttons under 44 px or
  buttons overflowing at the bottom that the Spanish one doesn't have.

The logic lives in [`languages-common.mjs`](languages-common.mjs), and each shot is saved as a screenshot
`<screen>-<lang>.png`. A new screen to check in all languages is added to
`paths.mjs`, the same catalog `look.mjs` uses; a new game, with a three-line
`languages.mjs`. `cup/languages.mjs` does the same with La Copa's home page and its form.

## The README screenshots come from here

Several of these shots are the images the README shows. The catalog
[`docs/capturas.json`](../../docs/capturas.json) says which comes from which script and with what
name, and `python3 tools/release/readme.py screenshots <section>` runs the scripts needed and
copies the PNGs to `docs/screenshots/` (see D-51). So, when renaming or removing a shot from
a script, it is worth running `python3 tools/release/readme.py check`: it warns if it left an orphan image.

Redoing them is not reviewing them: after `screenshots`, the contact sheet (`contact-sheet.mjs`) puts them
together, and there you see what a single image doesn't give away —a row wider than the one above,
a screen that doesn't match the caption, something covered by the confetti— (D-76).

## How they simulate several phones

Each "phone" is a Chrome instance with its own profile (`dir`) and its own debugging
port, chosen by the system. So they don't share `localStorage`, each one uses a different origin of the same
server: `localhost`, `127.0.0.1` and `[::1]`. The "online" scripts talk to the real
Firebase project, so they need internet and leave test rooms that expire after half an hour idle (D-89).

## Caveats

- **The output folder** (D-315): `const OUT = output()` (or `output('/tmp/<script>')` with a
  default one; `output()` once the game scripts are renamed, D-316), from `tools/e2e/output.mjs`. It takes the first argument only if it is a real folder:
  run without a folder or with a flag first (`tournament.mjs --part cup`), the script no longer leaves
  `undefined/` or `--part/` with a Chrome profile inside the worktree. `output.test.mjs` fails if
  a script reads `process.argv[2]` by hand, and `launch` doesn't open Chrome with a profile like that.
- **Zombie Chromes:** each Chrome dies with its script, however it ends: fine, with an
  exception, with Ctrl-C or with a `kill` (SIGINT, SIGTERM, SIGHUP; `cdp.mjs`). No need for
  `pkill`. The only exit that skips it is a `kill -9` to the node process. If one is ever left
  alive, look for it by **its profile**, which is the script's output folder, not by the port:
  `pgrep -af "user-data-dir=/tmp/e2e/"` to see it and `pkill -f "user-data-dir=/tmp/e2[e]/"` to
  kill it (with the bracket: without it, the pattern matches the shell itself). Never
  `pkill -f remote-debugging-port` alone, which kills every session's tests. A live Chrome
  with the same profile makes the next one fail to open: `launch` says so in the error.
- The `port` each script passes to `launch` is no longer a port: only `CDP_PORT` uses it to
  know which Chrome is which. A script that needs the port reads it from `b.port`.
- In a hidden tab the browser throttles timers differently; the waits
  (`sleep`) are calibrated for headless.

## La Copa

`node tools/e2e/cup/tournament.mjs <output> [--siete]` plays a 3-day Cup (or the 7-day one with `--siete`) with
three players in a single Chrome, with the test store and the clock moved forward day by day. Each
player is the same tab with `sessionStorage` cleared. On each screen it checks that there is no
horizontal scroll or buttons under 44 px (C-8), and captures the reminder, the partial standings and the
summary the admin would share.

`node tools/e2e/cup/languages.mjs <output>` creates a cup in each language other than Spanish
(D-170, D-199): it checks that the cup saves the language of its words, that the screen follows the language
of whoever is looking (another one, the next in the list) and that what is shared to the group comes out in the
cup's language, with its `?lang=`. Then it opens five standalone games in each language (the Palabra keyboard without
Ñ, the Conexiones grid of the language) and goes through the home page and the create form against the
Spanish one. The expected texts come from the dictionaries, they aren't written in the script.

`node tools/e2e/cup/player-cups.mjs <output>` tests that "Tus copas" follows the player (D-220):
one phone signs in with its player and opens a cup where it is seated; another phone, which never saw it,
signs in with the same player, finds it on the home page and enters it with no cup PIN (D-359).
Last (D-358), a phone with no player sits in a cup with the usual name and PIN, enters as the player,
and the podium seeded without them (the nightly job writes podiums, D-499) gets their jid. Then, signed in, joining a new cup asks no cup PIN
and links the player (D-359). Last (D-416), that phone loses its anonymous session: Empezar leads to
"Ya estoy inscrito", which says the player's session was lost too and asks for the player's PIN; a
wrong one is refused, switching names keeps the field, and the right one seats the phone as the
player again and returns to the board. It uses the cup's test store and the players' one.

`node tools/e2e/cup/zip-ten.mjs <output>` plays the ten Zip levels in practice, with the
fixed seed, and checks that the game ends there, before the clock (D-250): the notice "¡Resolviste
los 10 niveles!" with no extra text, no countdown or solution in view, the top clock
still and 100 points in the result.

`node tools/e2e/cup/notifications.mjs [output]` goes through La Copa's notifications (D-223) with the test
store, the VAPID key from `vapid.js` (D-225) and a fake notification service (nothing leaves Chrome): the card and
"Ahora no", the bell that turns on notifications and the confirmation notification, the settings and "Silenciar
esta copa", blocked notifications, and the iPhone path (add to home screen, inside Instagram, and
the steps that give the cup's code, because iOS opens the app on the home page, D-227, and the installed
app that opens with the name already chosen if the address carries `&app=`). Also what a
notification opens (D-229): `&day=<d>` starts on that day ready to begin (or on the board, if it can't be
played) and `&mute` mutes the cup. The notification's buttons on Android are tested by hand: headless
Chrome doesn't show them. It leaves screenshots of each sheet.

`node tools/e2e/cup/seat.mjs [output]` takes the seat away from the phone of the `player` demo (as
when it loses its Firebase session or the admin gives a new PIN), enters through the day's notification and taps
Start: it checks that it doesn't say the day closed, that it asks for the PIN with the name already chosen and that,
with the PIN, the day starts (D-285).

`node tools/e2e/cup/rejoin.mjs [output]` is the fresh browser (#893): the `player` demo's Javi, with
three days scored, loses everything the browser kept except the test store (which stands in for
Firebase) and his seat, opens the cup's link, picks his name and types his PIN: he sits as the same
player, no second Javi is created and his scores and his row on the board are unchanged.
