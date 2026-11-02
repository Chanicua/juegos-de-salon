# Merge lanes (D-519)

How much review a PR gets, and whether it may merge on its own, depends on **what it costs if it is
wrong**, not on how sure an agent is. A PR's lane is the highest lane of its files.

```bash
node tools/agents/lanes.mjs check [base]     # this branch: the lane, the files that set it, what it requires, the stage
node tools/agents/lanes.mjs check --pr <n>   # any PR on GitHub
```

| Lane | What | Before merging |
|---|---|---|
| 🟢 Contained, reversible | `public/labs/**`, docs, tests, changelog, marketing | No agents (D-413). Auto-merge. |
| 🟡 Wide but reversible | the published site (games, home page, `public/assets/js/**`, i18n), tooling, e2e; **any file no rule names** | Usability + documentation agents, scaled by the stage `check` prints (D-304: lab only, a game leaving the lab, the site; a splash campaign gets its full pass, D-355). Auto-merge. |
| 🔴 Hard to reverse | Firebase rules, scripts that write or delete stored data (`tools/firebase/**`), `public/privacy/**`, what sends email or notifications (`send-mail.py`, `feedback.mjs`, `tools/push/**`), `.github/**`, release tooling, the gate itself | Agents as 🟡, then **never auto-merge**: the owner approves. |

The globs, each with its reason, are in [`tools/agents/lanes.json`](../tools/agents/lanes.json): the
first rule that matches a file gives its lane. A new kind of risky file is a new red rule there.

## The 🔴 gate

The `lane` job in `tests.yml` runs on every PR push. For 🔴 it adds the `needs-owner` label, sets the
`owner-approval` status red on the PR's head commit and opens a one-tap decision issue (D-273). The
owner's Yes runs `approve-pr` (`approve.mjs`), which turns `owner-approval` green **for that commit
only**: a later push asks again. The same Yes then runs `merge`: it waits for `tests` and `end-to-end`,
merges and publishes the site, and the issue closes itself, so an approved PR is never left waiting.
If a check fails, the issue says so and stays open; ticking again after the fix retries. For 🟢/🟡 the job
sets `owner-approval` green at once.
`owner-approval` is a required status on `main`, so a 🔴 PR cannot merge without the tick.

A session never turns on auto-merge for a 🔴 PR; it says in the PR that it waits for the owner (whose Yes merges it).
Storing something new about players is 🔴 too even when no red file changes: the privacy page
changes in the same PR (CLAUDE.md), which makes it red.

**What the owner reads before deciding.** The owner approves or rejects a 🔴 PR in one tap, so the
session gives them the decision ready to take, in plain Spanish with no jargon, at the top of the PR
description and in its chat reply:

- **Qué cambia**: one sentence, in player or owner terms (not file names).
- **Si sale mal**: the concrete worst case (who notices it, what is lost or sent).
- **¿Se puede deshacer?**: yes / partly / no, and how.
- **Riesgo**: bajo / medio / alto, with one line on why.
- **Recomendación**: aprobar or rechazar, in one line.

Five short lines, nothing more; the technical detail goes below them.
