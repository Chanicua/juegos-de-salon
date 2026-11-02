# Merging and publishing

<!-- Moved out of CLAUDE.md by D-497: read on demand; CLAUDE.md points here. -->

From a finished branch to the live site: the review agents, the checks, auto-merge, waiting for the merge, the version, the Firebase rules and the README. CLAUDE.md keeps the checklist; this is the detail.

**The owner's defaults** (2026-11-01): every PR gets auto-merge as soon as it is ready, unless an exception
below holds; and a PR whose checks fail is fixed by the session that owns it, on its own: read the failing
job's log, find the cause, fix it on the branch and push, without asking the owner first.

## Before proposing a merge

1. **The lane** (D-519, [LANES.md](LANES.md)): `node tools/agents/lanes.mjs check` says the PR's lane
   (🟢/🟡/🔴), the files that set it, the stage (D-304) and what that lane requires before merging: which
   agents run (the usability and documentation agents together, `.claude/agents/usability.md` and
   `documentation.md`, D-132, D-172, fixing on the same branch, D-213, D-303) and whether it may auto-merge.
2. **Is anyone playing?** `node tools/firebase/in-progress.mjs` (exits with 3 if there are live rooms
   or Cups in progress; needs the owner's key).
3. **No merge without ✅ on GitHub in `tests` and in `end-to-end`** (D-143,
   D-193, D-213, D-216), even if they already passed here. `main` requires both: `end-to-end` is the
   job that summarizes the `End to end` workflow (the scripts in even groups, D-307) and goes red if any fails.
   A PR runs only the scripts whose pages load what it changed (`tools/e2e/affected.mjs`, D-329), and for a site module only the pages that use the
   declarations or text keys its patch changes (`tools/e2e/narrow.mjs`, D-516); its run
   summary shows that scope, and `tools/e2e/scope.test.mjs` stops a page that loads another game's files (D-378);
   `tools/e2e/scope-guard.test.mjs` fails if a site file is loaded by no page or a CI script names no page (D-391).
   In a PR that touches nothing in the browser (documentation, `tools/agents/`, workflows, rules)
   no script runs and it goes green anyway; a failing script is retried once and, if it passes,
   leaves an "Intermitente" (flaky) notice (D-299). Each later push tests only what changed since the PR's
   last commit that passed end-to-end (`tools/e2e/since-passed.mjs`, D-392): fix a red run in one push,
   because until something passes every push retests the whole PR.
4. **Auto-merge by default** (D-216, the owner's request), **except a 🔴 PR** (D-519: it waits for the
   owner's tick, whose Yes runs `approve-pr` then `merge` and closes the issue, see LANES.md): when the PR is ready to merge
   —the agents are done and their fixes are pushed, and the `changelog/<branch>.md` entry is already
   on the branch (D-300)—, GitHub's auto-merge is turned on instead of waiting for the ✅ by hand:
   ```bash
   gh pr merge <n> --auto --merge
   ```
   GitHub merges it on its own when `tests` and `end-to-end` pass; if they fail or there is a conflict,
   it does not merge and it has to be fixed. A PR that is not ready (a draft, one waiting for a
   decision from the owner) does not get auto-merge. **While the owner reviews a change round by
   round** (D-429), the PR stays open without auto-merge: each round is a push to the same PR, and the
   owner looks at its preview (the 🔍 comment, `ellokojavi.github.io/juegos-de-salon-previews/<branch>/`)
   instead of a new PR merging per round; auto-merge goes on when the owner approves. **Every ready PR gets it, unless the owner
   explicitly says not to auto-merge** (D-419, the owner's rule): then the PR stays open, says so in its
   description, and waits for the owner to merge it.
5. **Waiting for the merge** (D-400): right after turning on auto-merge, the session runs
   `node tools/agents/wait-pr.mjs <n>` in the background. It asks GitHub every minute and exits when
   the PR merges or closes, a required check goes red, or a conflict lasts three reads in a row (D-486): the only things that need
   someone. It costs no tokens while it waits and works wherever `gh` does. The app's PR monitor
   (`set_monitor` with `auto_fix` and `address_comments`, D-218) may also be turned on where available,
   for review comments, but a session no longer depends on it to learn of the merge. What happens
   after the merge no longer waits for anyone: `publish.yml` runs the tests and the end-to-end run on
   `main` (smoke plus what main gained since the PR head passed, D-496, D-506; nothing if that same tree already passed, D-308), publishes the Firebase rules and
   the site (D-302), and the worktree is deleted by the session-start hook. When `wait-pr.mjs` says
   `merged`, the session checks it on GitHub, then does what follows (report, clean up, go on).
   Where `gh pr view` is refused (some cloud sessions) it reads the REST API instead, and after five
   failed reads in a row it says `unreadable` and stops rather than retrying in silence (D-441).
   A PR nobody is waiting for any more is still not lost: `pending-watch.yml` keeps a "Pending work"
   issue every day with the stuck PRs and the branches whose commits have no PR (D-441). With
   auto-merge on, the `end-to-end` check still comments "✅ Both checks are green: auto-merge merges
   this PR now" (D-323), but no longer holds the check two minutes for the monitor (D-400), and
   `publish.yml` comments on the merged PR with the version that went live, as a record.

## On merge and publish (C-11, D-205, D-300, D-302, D-323)

- **Every PR body says where its change is seen** (D-504): a line `Ver en: <path of the site>`, and
  `Qué: <the feature in one line, in Spanish>` (without it the notification falls back to the English PR title). When publish.yml puts it live,
  `tools/push/release.mjs` notifies the owner's devices (`✅ v<version> en vivo · PR #<n>`, the line,
  `👉 <where>`) and the tap opens that path; if it did not publish, `❌` and the run. Pick the place
  the change is actually seen: a splash campaign still off is `/panel/#/campaigns/splash/<id>`, on is
  `/?splash=<id>`; a lab game `/labs/<game>/`; a flag `/labs/`; a panel change `/panel/#/<section>`.
  Without the line it is worked out from the files (`destination` in release.mjs). Report to the
  owner only once it is live, with that same link: a merged PR is not live yet.
- The entry goes without a number in `changelog/<branch>.md` (D-300). Today's version is the first
  entry of `CHANGELOG.md` bumped once for each `changelog/` entry not yet collected,
  in the order they reached `main`; the processes agent collects them into `CHANGELOG.md`, with their
  number, in its round (`collect`), and that does not change the version. The `tests` check blocks a PR that
  writes a numbered entry in `CHANGELOG.md` and warns if it changes `public/` without an entry.
  ```bash
  node tools/release/changelog.mjs new [patch|minor]   # creates changelog/<branch>.md
  node tools/release/changelog.mjs show                    # the pending ones, with the number each gets
  node tools/release/changelog.mjs migrate                 # a numbered entry (from before) → changelog/
  node tools/release/changelog.mjs collect                 # processes round: the pending ones into CHANGELOG.md, older months → changelog/archive/ (D-497)
  python3 tools/release/set-version.py --version             # today's version
  python3 tools/release/set-version.py --site /tmp/site    # stamps a copy, as when publishing
  ```
- The pages in `public/` carry no `?h=` and no import map (on publish each file gets `?h=` of its own content, D-467): `.github/workflows/publish.yml` runs
  the tests **and the end-to-end suite** (D-302; a merge whose PR passed runs only `smoke.mjs` plus the scripts reached by what main gained since that PR head, D-496, D-506; if they fail twice, it does not publish and opens the
  "main is red" issue), unless the tree it publishes already passed it in a PR or only changes what does not
  reach the browser on top of one that passed (`tools/e2e/already-tested.mjs`, D-308), stamps the version on the copy it publishes and checks that the live site
  serves it. Its last job, `report`, always runs on a push to `main` (also when an earlier job failed) and
  There is no run-wide queue (D-506): each merge's tests start at once; only `rules` and `publish` wait
  their turn, and a run a newer merge overtook publishes nothing (the newer one carries it, and the
  report says so). The Pages deploy is retried twice only on a 5xx, or after cancelling an older commit's deployment left stuck in progress (`tools/release/pages-5xx.mjs`).
  `docs/facts.json` no longer carries the version (D-506), so two PRs that seal conflict only when
  they change the same fact.
  comments on the merged PR with the version that went live or the first step that stopped it
  (`tools/release/merge-report.mjs`, D-323): a record, not the wake-up (that is the `end-to-end`
  comment before the merge, point 5 above); a manual run comments nothing.
- The Firebase rules are published by `publish.yml` on every merge, before the site (D-218):
  it uploads nothing if they are already there, and if Firebase rejects them the site is not published. It needs the
  `FIREBASE_ADMIN_JSON` secret on GitHub (the service account key, loaded by the owner); without it,
  it warns and they are published by hand, as before (D-122; the key in `~/.config/juegos-de-salon/firebase-admin.json`):
  ```bash
  node tools/firebase/rules.mjs publish     # uploads the rules and checks they took
  node tools/firebase/rules.mjs check      # is what is published what is in the repo?
  node firebase/pin-attempts.test.mjs      # the rules file itself, through tools/firebase/rules-sim.mjs (D-464)
  node tools/firebase/unnoted-rooms.mjs [--fix]   # rooms no cleanup bucket names, so never swept (D-321)
  node tools/firebase/room-sweep.mjs [--apply]   # the nightly room sweep: every closed bucket, however old, and the unnoted rooms (D-499)
  node tools/firebase/uad-points-backfill.mjs [--apply]   # October 2026's Uno al día points from the history, once after D-414 publishes (dry run without --apply)
  node tools/firebase/uad-points-backfill.mjs --rebuild [--apply] [--month yyyy-mm]   # recomputes a month's totals from the history and the 🧊 markers, a day's points only if it reached the server near its date; the uad-rebuild workflow runs it every hour, with the week's sums and best streaks (D-415, D-465, D-500)
  node tools/firebase/uad-index.mjs [--apply]   # copies Uno al día's older history into the index by day (unoAlDiaDias/), checks it, then writes the unoAlDiaIndice mark the readers wait for; once after D-475 publishes (dry run without --apply)
  node tools/firebase/rankings-history.mjs --podiums [--write]   # finished Cups' missing podiums (torneoPodios/); the cup-podiums workflow runs it twice a night (D-450)
  node tools/firebase/stats-retention.mjs [--apply]   # deletes the names in stats/ older than 24 months (dry run without --apply); the uad-rebuild workflow runs it once a day, in its 08 UTC run (D-472)
  ```
- The worktree and the branch are deleted on their own (above, D-218, D-252); to do it now, `node tools/agents/clean-worktrees.mjs`.

## README, screenshots and social cards (C-13, D-51, D-181)

The `tests` check on each PR blocks an out-of-date README or card. **"Actualiza el README" (update the README) is a full pass**,
at the owner's request (D-213). The commands and the rules are in the `readme-and-cards` skill (`.claude/skills/readme-and-cards/SKILL.md`): read it before touching the README, screenshots or cards.
