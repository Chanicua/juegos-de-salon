# Juegos de Salón — context for Claude

Static web app (HTML, CSS and JavaScript with ES modules, no build and no npm) with party games,
published on GitHub Pages: https://juegosdesalon.cl/

This file is the index and the rules every session needs; the detail lives in one place each
(D-213) and is read on demand (D-497). **A rule added later goes to the doc it belongs to**, not here,
unless every session needs it.

## Language (D-316, D-497)

Everything in the repo is English (docs, decisions, comments, commits, PRs, issues), even when the
owner writes in Spanish. Exceptions: what the player reads (three languages, Spanish by default, C-3),
text by outsiders (player feedback) and persisted keys (game ids like `'ahorcado'`, Firebase paths,
`localStorage` keys). Old Spanish text is history and is not translated; a pending Spanish name in
`docs/english-renames.json` is renamed only when a PR touches its file anyway
(`node tools/agents/english.mjs touched`). A new Spanish file name fails `english.test.mjs` (D-354).

## Where everything is (D-192)

- **`public/` is the site** as served: folder = URL, in English. Serve it with `python3 -m http.server 87xx -d public`.
- **A game's id is not its folder**: `'ahorcado'` lives in `/hangman/`, and ids never change. The old
  Spanish paths (`public/ahorcado/`, `public/copa/`, `public/minijuegos/…`, `public/minigames/…`) are
  generated bridge pages: do not edit them.
- **The workshop**: `docs/`, `firebase/`, `marketing/`, `tools/` by function (`release/`, `firebase/`, `generators/`, `agents/`, `e2e/<game>/`).
- Everything visible in a URL is English, parameters and values too, read with
  `public/assets/js/parametros.js` (old names kept as aliases, C-18, D-266).

## Where each rule is (D-213)

| What | Where | When to read it |
|---|---|---|
| How a game is built (C-n) | [docs/CANONES.md](docs/CANONES.md), with its checklist at the end | Before building or changing a game or the home page (C-17), and when done |
| Texts, buttons, sharing (U-n) | [docs/USABILIDAD.md](docs/USABILIDAD.md): U-1, U-8 and **U-18** before writing instructions; **U-41** visual proposals as images | Before writing anything the player reads, or proposing a design |
| Why it is this way (D-n) | [docs/DECISIONS.md](docs/DECISIONS.md), the index (by topic, then one row each), and `docs/decisions/D-<n>.md` for each one (D-394): read the index, open only the ones you need | Before changing something that looks odd |
| A new game, step by step | [docs/ADD-GAME.md](docs/ADD-GAME.md) | When starting one |
| Each game | `docs/games/<folder>.md`, with its exceptions to the canons | Before touching it |
| What was requested (RP-n…) | [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md) | When closing one |
| Owner panel | [docs/PANEL.md](docs/PANEL.md) | When touching signals or the panel |
| README, screenshots, link cards | the `readme-and-cards` skill (`.claude/skills/readme-and-cards/`) | Before touching them, and on "Actualiza el README" |
| Panel, Cup reports, rankings code | the `owner-tools` skill (`.claude/skills/owner-tools/`) | Before touching them |
| End-to-end tests | [tools/e2e/README.md](tools/e2e/README.md) | When running or writing a script |
| Which tests a change runs | [docs/TEST-SCOPE.md](docs/TEST-SCOPE.md), the design (D-391, D-392): a push tests only what changed since the PR last passed | Before touching `tools/e2e/affected.mjs` or when a PR runs more than it should |
| Firebase | [firebase/README.md](firebase/README.md) | When touching the rules |
| Seasonal templates (Halloween…) | [docs/SEASONS.md](docs/SEASONS.md): the home page and Rankings dress up for a date (D-457) | Before adding a date or touching `season.js` |
| What players are told we keep | `public/privacy/texts.js`, the `/privacy/` page in three languages (D-463, C-17) | When a change stores something new about players, or keeps it for a different time: edit the page in the same PR |
| Big files (videos, recordings) | [docs/REPO-WEIGHT.md](docs/REPO-WEIGHT.md): nothing over 5 MB enters git, `repo-weight.test.mjs` (D-494) | Before committing media |
| PR previews | [docs/PREVIEWS.md](docs/PREVIEWS.md): each PR on GitHub Pages (D-429) | When the owner reviews a change, or a preview fails |

**A rule that changes is changed in its place, in the same PR:** if a new decision changes a
| Parallel sessions, worktrees, forks, tests side by side | [docs/SESSIONS.md](docs/SESSIONS.md) (D-135, D-189, D-252, D-301, D-303, D-428) | At the start of any work that will commit |
| Before merging, auto-merge, waiting, version, publishing, Firebase rules | [docs/MERGING.md](docs/MERGING.md) (D-143, D-216, D-300, D-302, D-400, D-419) | Before proposing a merge |
| Every agent and owner tool, with its commands | [docs/AGENTS.md](docs/AGENTS.md) (processes, documentation, usability, support, marketing, ideas, lab keys, splash, jobs) | Before using or changing one |

**A rule that changes is changed in its place, in the same PR:** the PR edits the canon or doc and
marks the old decision (`amended by` / `replaced by`). A canon that contradicts a decision in force is a bug.

## Rules every session follows

- **Own worktree, topic branch** (D-135): never work in the main folder. Delete a worktree you know
  will not produce a PR (D-252). Details and cleanup: [docs/SESSIONS.md](docs/SESSIONS.md).
- **Ask before touching another session's PR branch** (ListAgents / SendMessage).
- **Changelog entry without a number** in `changelog/<branch>.md` (`node tools/release/changelog.mjs new [patch|minor]`, D-300);
  never edit `CHANGELOG.md`, which keeps only the current month (older ones in `changelog/archive/`, D-497).
- **A D-n only for a real policy change** (D-497): a new rule, a changed or dropped rule, or a choice
  someone would otherwise undo. Small adjustments go only in the changelog entry. Reserve the number
  first: `node tools/agents/decision.mjs reserve` (D-301); one file each in `docs/decisions/`, the index
  `docs/DECISIONS.md` is generated (`decision.mjs index`), never hand-edited (D-394).
- **Always open the PR and drive it to merge** without asking the owner first (D-522): right after opening it,
  run the "Before proposing a merge" steps below (lane, its agents, auto-merge), and in a cloud session
  subscribe to the PR's activity (`subscribe_pr_activity`) so a red check is fixed without the owner asking.
- **A single push at the end** (D-303), with the agents' fixes included.
- **Everything in development sits behind the lab** (D-395, D-409, D-498): lab games under `/labs/`, anything
  new on a player page behind its runtime flag `flag('<id>')` (`public/assets/js/flags.js`) and listed in
  `/labs/`; the owner publishes it by flipping `flags/<id>` to *all* on its `/labs/` card (the one place, D-498),
  no PR; its card moves to La Bodega keeping its switch (D-510), and a later PR removes the gate. Details: [docs/AGENTS.md](docs/AGENTS.md).
- **Tests**: run every `*.test.mjs` / `*.test.py` before the PR (commands in [docs/SESSIONS.md](docs/SESSIONS.md));
  for end-to-end, run only the script of the screen you changed, never the whole `ci.mjs` (D-428):
  the `end-to-end` check on GitHub is the gate.
- **Big files**: nothing over 5 MB enters git (D-494).

## Before proposing a merge (detail in [docs/MERGING.md](docs/MERGING.md))

1. The lane (D-519): `node tools/agents/lanes.mjs check` says 🟢/🟡/🔴 and what it requires
   (agents, auto-merge or not): [docs/LANES.md](docs/LANES.md).
2. `node tools/firebase/in-progress.mjs` (is anyone playing?).
3. No merge without ✅ `tests` and `end-to-end` on GitHub (D-143, D-216).
4. Ready → `gh pr merge <n> --auto --merge` (D-216), unless the PR is 🔴 (the owner's Yes approves and merges it, D-519), the owner said not to (D-419) or is
   reviewing round by round on the preview (D-429).
5. Then `node tools/agents/wait-pr.mjs <n>` in the background (D-400); on `merged`, check GitHub and go on.

## Languages (C-3, D-514)

Spanish by default; English and Portuguese are chosen by hand. German left in D-514. A new text for the player
goes in all three: the parity test requires it. A new language comes in through the lab
(`EN_LABS` in `i18n.js`, empty today; D-191).
