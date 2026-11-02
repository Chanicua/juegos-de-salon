# The owner's Mac mini

What runs on the Mac mini and what it holds that is not in the repo, so the project can move to
another machine (D-383). `tools/jobs/jobs.json` is the list of jobs; this page is everything else the
machine needs. `machine.test.mjs` fails if a `mac` job, or a file under
`~/.config/juegos-de-salon/` that the code reads, is missing here.

## What runs there

| Job | Kind | Schedule | How it is set up |
|---|---|---|---|
| `inbox-watch` | launchd (`cl.juegosdesalon.inbox-watch`) | every 5 min | `node tools/jobs/jobs.mjs install` |
| `lab-publish-watch` | launchd (`cl.juegosdesalon.lab-publish-watch`) | every 5 min | `node tools/jobs/jobs.mjs install` |
| `lab-ready` | launchd (`cl.juegosdesalon.lab-ready`) | hourly | `node tools/jobs/jobs.mjs install` (D-528) |
| `feedback-watch` | launchd (`cl.juegosdesalon.feedback-watch`) | every 5 min | `node tools/jobs/jobs.mjs install` |
| `processes-round` | launchd (`cl.juegosdesalon.processes-round`), a headless `claude -p` | 4:30 Pacific, daily | `node tools/jobs/jobs.mjs install` (D-451) |
| `weekly-report` | launchd (`cl.juegosdesalon.weekly-report`), a headless `claude -p` | Sundays 08:00 Pacific | `node tools/jobs/jobs.mjs install` (D-451) |

The launchd plists are generated from `jobs.json` (`~/Library/LaunchAgents/cl.juegosdesalon.<id>.plist`)
and run the code of the **main folder** (today `~/Documents/Claude/Projects/juegos-de-salon`), which
stays on `main`; `jobs.mjs run` fast-forwards it to origin/main before each run (only when clean and on `main`; the log says when it could not). The two daily and
weekly Claude rounds run through `tools/jobs/claude-task.mjs` (D-451): `claude -p --permission-mode auto`, each with only the tools it needs (#865, see README.md),
with a one-line prompt, "read `tools/jobs/prompts/<id>.md` from origin/main and follow it", so the
real instructions are in the repo and `jobs.test.mjs` fails if they name a file that no longer
exists. They need only the Mac on and `claude` signed in (`~/.local/bin/claude`), not the desktop app:
the desktop app's scheduled tasks stopped on 2026-10-18 when the app was closed, and the cloud ones
cannot reach this machine. A run missed while the Mac sleeps runs when it wakes. Each run's output
is in `~/Library/Logs/juegos-de-salon/<id>.log`. If the round stops anyway,
`round-watch.yml` opens the "Processes round missed" issue within a day.

## What the machine holds (never in the repo)

In `~/.config/juegos-de-salon/` (copy the folder to the new machine, by hand, never through git):

| File | What it is | Used by |
|---|---|---|
| `firebase-admin.json` | Firebase service account key (also the `FIREBASE_ADMIN_JSON` secret on GitHub) | panel, reports, `rules.mjs`, `labs-key.mjs`, `ideas.mjs` |
| `buzon.json` | the inbox user, limited by the rules to `buzon/` (D-318) | `inbox.mjs`, `inbox-watch` |
| `mail.json` | the Gmail account and app password that send the replies and the weekly report; `from` must be `hola@juegosdesalon.cl` (Gmail's "Send mail as" alias), or nothing is sent (D-443) | `send-mail.py` |
| `vapid-privada.txt` | backup of the push notifications' private key (the real one is a GitHub secret) | `vapid.mjs` |
| `inbox-log.jsonl`, `mail-log.jsonl` | what was triaged and what was sent (history, not needed to run) | `inbox.mjs`, `send-mail.py` |
| `inbox-skipped.jsonl` | the text of each email the support agent skipped, for the owner to check (D-452; history, not needed to run) | `inbox.mjs` |
| `jobs/<id>.json` | each `mac` job's last run (recreated on its own) | `jobs.mjs status` |

In that Gmail account, **IMAP must be on** (Settings → Forwarding and POP/IMAP): `send-mail.py` reads
each email's copy in the Sent folder to confirm it left from hola@, and without IMAP no email to a
player goes out (D-443). After moving, `python3 tools/agents/send-mail.py --check` sends the owner a
test email and says whether it left from hola@.

Signed in on the machine: `gh auth login` (the jobs create issues with it) and `claude` (the
support agent runs headless). Logs: `~/Library/Logs/juegos-de-salon/`. Optional: Tailscale
(`tailscale serve`, to try the site on a phone, D-67).

## Moving to another machine

1. Install Node (24), Python 3, `git`, `gh` and Claude Code; sign in to `gh` and `claude`.
2. Clone the repo; that folder is the main folder.
3. Copy `~/.config/juegos-de-salon/` from the old machine.
4. `node tools/jobs/jobs.mjs install`, and on the old machine `node tools/jobs/jobs.mjs uninstall <id>`
   for each `mac` job, so the two do not both run.
5. `claude` installed and signed in on the new machine (the Claude rounds use it headless)
   (their prompts are in `tools/jobs/prompts/`), so they no longer run on the old one.
6. Keep it awake: System Settings → Energy → prevent automatic sleeping.
7. `node tools/jobs/jobs.mjs status`: every `mac` job ✅ within 10 minutes.
8. `python3 tools/agents/send-mail.py --check`: the owner gets a test email from hola@ (D-443).
