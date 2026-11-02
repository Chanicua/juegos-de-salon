# Firebase

Project: `juegos-de-salon`, on the pay-as-you-go **Blaze** plan since 2026-10-29 (D-512; created on Spark on 2026-09-08).

**Billing (D-512):** the project belongs to `la cuenta de la máquina`, and is billed to the Cloud Billing
account **Juegos de Salón** (`01B627-966553-2CB035`, United States), owned by the owner's personal account,
with the machine's account as *Billing Account User*. Budget **Juegos de Salón - monthly**: US$10/month,
alerts only at 50 %, 90 % and 100 %, by email to the billing admins. There is no enforced spend cap on
purpose: it would pause the database mid-game. To go back to Spark, unlink billing in the Firebase console.

> **Watch the account.** The project belongs to **`la cuenta de la máquina`**, the machine's
> account, which is **not** the identity used to commit (`la cuenta de administrador`, GitHub
> `ellokojavi`). Signing in to the console with the wrong account makes the project not show up
> in the list, which looks exactly like an account with no projects. For any change
> in the console —rules, Authentication, deleting data— you have to sign in with `la cuenta de la máquina`.

- **Realtime Database:** `https://juegos-de-salon-default-rtdb.firebaseio.com` (us-central1).
- **Security rules:** [database.rules.json](database.rules.json). They are the copy of what is published in the console; if they change, they have to be published again in *Realtime Database → Rules*.
- **Web app:** `juegos-de-salon-web`. Its public config is in `public/assets/js/firebase-config.js`.
- Google Analytics and Gemini were left off (not needed).

## Publishing the rules

The rules in [`database.rules.json`](database.rules.json) **are not published on their own**: there is no
deploy that uploads them. They are pasted by hand and *Publish* is pressed, with the account that owns the project
(`la cuenta de la máquina`):

<https://console.firebase.google.com/u/0/project/juegos-de-salon/database/juegos-de-salon-default-rtdb/rules>

While a change in the file isn't published, new writes are rejected and nobody
notices: the transport and the usage signals are best-effort and fail silently.

## What the rules allow

- There are three nodes: `rooms/<CODIGO>` (the rooms), `cleanup` (the trash bin that deletes them) and
  `stats` (the usage signals the owner's panel reads, D-44).
- The room code is 4 uppercase letters.
- Anyone with the code can read the room.
- `createdAt`, `game` and `config` are written only once (when creating the room), and `createdAt`
  only in the same write that notes the room in the trash bin (`cleanup/days/<day>/rooms/<CODE>`, for
  today, yesterday or tomorrow UTC, D-469).
- `config`, `players/<seat>` and `messages/<id>` take only the fields the games send, each with a
  type and a size cap (D-469). A game that sends a new field or setting adds it to the rules in the
  same PR; `firebase/room-limits.test.mjs` checks the shapes each game sends.
- **A room is alive while it beats** (D-89): `lastAt` is the server time of the last
  move, anyone inside refreshes it and it lasts half an hour. After that half hour —or the
  six hours since `createdAt`, which is the hard cap— the room accepts nothing more. A room without
  `lastAt` predates the heartbeat: the six-hour cap applies.
- `players/A` to `players/F` can be updated while the room is alive (up to six players).
  Two phones never share a seat because the client takes it with a transaction that leaves a
  seat held by another phone's `uid` alone (`transport/seat.js`). The rule does not require the
  stored `uid` to match: a phone that reloads mid-game is a new transport with a new `uid`, and
  resumes its seat by rewriting it.
  `left` (boolean) also goes there: the goodbye of whoever left on purpose (D-50).
- `messages/<id>` are append-only (not edited or deleted) and must carry `t`, `from` (A to F) and `at`.
- An expired room (half an hour without a heartbeat, or more than 6 hours) can be deleted by anyone (cleanup).
- A **live** room can only be deleted when all the players inside have
  `left: true`: it is the cancelled room, closed on the spot instead of waiting for it to expire.
  A room with no player signed up can't be deleted.
- Any other field is rejected.
- **Only the owner** (their UID in the rules) can list all of `rooms/` and read `stats/`.
  Nobody else: not even with a room's code can you reach `stats/`.

## La Copa (the Cup) (`torneos`, `torneoKeys`, `torneoSeats`, `torneoIntentos`)

Multi-day tournaments (D-94, [docs/games/cup.md](../docs/games/cup.md)) live in their
own tree because they last a week and rooms die after half an hour (D-89).

- **They need Firebase Auth anonymous sign-in** (D-96): *Authentication → Sign-in method →
  Anonymous → Enable*. Each browser signs in anonymously, and the rules use its `auth.uid`.
- `torneos/<código>` (5 letters without I or O) is readable by whoever has the code; all of `torneos/`, only by the owner.
- `meta` is written once and carries each day's windows already computed (`win/<d>/{a,b,h}`),
  `joinUntil` and `final` (the final's day as text, or `'0'` in a cup without a final, D-438): the rules compare `now` against numbers, they know nothing about time zones.
- `players/<pid>` is created by the player themselves before the final; afterwards only the admin changes it.
- `started`, `results` and `wild` are written only once, by the seated player and within the
  window of their day. The wildcard, also, only before `started` and never on the final's day (any day in a cup without a final). An unused one that lands on its own before the final (D-444) is computed when read and writes nothing, so the rules do not change for it.
- `started` is also refused to a player out of the cup (D-347): two days in a row closed without a
  result, counting only days that closed after their `at` and after their `back` (the admin's
  «Devolver a la copa», server time). The rule repeats the condition for each pair of days up to
  day 6, because rules cannot loop.
- `torneoKeys/<código>/<pid>` stores the PIN hash and `torneoSeats/<código>/<pid>/<uid>` the
  phones seated as that player. **Neither can be read**: sitting down requires sending
  the same hash, or (D-359) the cup player's linked jid (`players/<pid>/j`) from a phone seated as
  that player (`jugadorSeats/<jid>/<uid>`), so a signed-in player needs no cup PIN. The admin can change the hash and delete the seats (new PIN),
  confirming with their own PIN (D-464).
- `torneoIntentos/<código>/<pid>` = `{ h, u, at }` (D-464): the last PIN attempt on that cup player, written
  with the writer's own uid and the server time, only on a cup player with a key and only if the
  previous attempt is more than 5 s old. A seat with the cup PIN needs the same uid's attempt from the
  last minute holding the current key (not when the key is created in the same write). The admin's new
  PIN for a player needs a fresh attempt by the admin's uid holding the admin's key, or their linked
  player's (`jugadorIntentos`). Nobody reads it; only the admin deletes it, with the cup.
- Cups aren't deleted yet (LIG-31).

## Publishing the rules (D-122, D-218)

They are published on their own on every merge to `main`: the `reglas` job in `.github/workflows/publish.yml`
runs `rules.mjs publish` with the GitHub secret `FIREBASE_ADMIN_JSON`, before publishing the
site. By hand, to check or if the secret is missing:

```bash
node tools/firebase/rules.mjs publish    # uploads database.rules.json and verifies it took
node tools/firebase/rules.mjs check      # is what's published what's in the repo?
```

It uses a service account key stored outside the repo at
`~/.config/juegos-de-salon/firebase-admin.json` (or `FIREBASE_KEY=/path`). It is created once in
[Service accounts](https://console.firebase.google.com/u/0/project/juegos-de-salon/settings/serviceaccounts/adminsdk)
→ Generate new private key. It gives admin access to the whole project: it isn't shared, and if
it leaks it is revoked right there. Without the key, you can still paste by hand in the console.

**Testing the rules without Firebase (D-464).** `tools/firebase/rules-sim.mjs` is a small simulator of
`database.rules.json` (no emulator, no npm): `createDb(rules, tree)` gives a database whose
`update(changes, { uid, now })` applies a multi-path update only if the rules accept every path, and
says whether they did. It covers what the tests
need, not the whole rules language. `firebase/pin-attempts.test.mjs` uses it to check the PIN attempts,
seats and key changes on the real rules file.

## La Copa: closed sign-up and movable start (D-110)

- `torneos/<code>/closed` (`true` or nothing): only the phone seated as admin writes it. With the
  cup closed, the rules don't allow creating new players.
- `torneos/<code>/meta` is written on creation and, afterwards, **only the admin can rewrite it** to
  move the start: with no `started`, with the same name, days, schedule, admin and
  `createdAt`, and with day 1's window still open and starting within 32 days.
- A lab cup (`meta/lab = true`, D-115) can be rewritten even if it has already been
  played: that's how its admin moves it to the next day. The `lab` mark can't be removed or added afterwards.
- `torneos/<code>/meta/name` can be changed only by the admin, at any time before the
  cup ends (`now < meta/end`), with the same length of 1 to 40 (D-148).

- `torneos/<code>/fin` (D-161): the server time when the admin ended the cup early. Only the
  phone seated as admin writes it, **once**, with the cup already started and not finished. From then on
  the rules don't allow writing `started`, `results` or `wild`, signing up, renaming the cup or
  rewriting `meta`.

- **Deleting the cup** (D-117): the phone seated as admin can delete at once
  `torneos/<code>`, `torneoKeys/<code>`, `torneoSeats/<code>` and `torneoIntentos/<code>` (only the whole node, never partially).

## La Copa: its own link (`torneoAlias`, D-121)

`torneoAlias/<alias>` = `{ code, hasta }`. It is read without an account (it only says which code it points to). It is
written if it doesn't exist, if it expired (`hasta < now`) or if it points to the same cup, and always by the
admin of that cup and with `meta/alias` equal to the alias; it is deleted only by that admin. `hasta` is the end
of the cup plus 7 days.

## Players and rankings (`jugadores`, `jugadorKeys`, `jugadorSeats`, `jugadorIntentos`, `jugadorNombres`, `jugadorCopas`, `records`, `torneoPodios`, D-212)

The same mechanism as La Copa, for the whole app:

- `jugadores/<jid>` = `{ n, at, juegos: { <juego>: { n, at } } }`. Read without an account by jid (not
  listed). Created once, with the seat in the same write; `juegos/<juego>/n` only goes up by one.
- `jugadorKeys/<jid>`: sha256 of the PIN. Nobody reads it. Created with the player; changed by a seated
  phone whose fresh attempt holds the current key (D-464).
- `jugadorSeats/<jid>/<uid>`: the `uid` phone writes as `jid` if it brings the hash from `jugadorKeys`
  and its own attempt from the last minute holds it (not when the key is created in the same write, D-464).
  Whoever is seated can replace all the seats (changing the PIN kicks out the others).
- `jugadorIntentos/<jid>` = `{ h, u, at }` (D-464): the last PIN attempt on that player, with the
  writer's uid and the server time, on a player with a key, one every 5 s. Nobody reads or deletes it.
- `jugadorNombres/<clave>/<jid>` = `true`: who uses that name. Read by key, to sign in.
- `records/<tabla>/<período>/<jid>` = `{ s, ms, k, at, n }`, with `.indexOn: k`. Read without an account.
  Only the seated player writes, with `k` recomputed, `n` equal to their name and `k` lower than the
  stored one. The table and period are validated by shape, without naming games (C-16). A table that
  ends in `_victorias` (D-215), and the `partidas` one (D-219), also requires `ms` = 0 and that `s` go up
  by exactly one. Each row can carry `co`, the player's country (two letters, D-219).
- `jugadores/<jid>/co`: the player's country, once, by whoever is seated (D-219).
- `torneoPodios/<código>`: the podium of a finished cup, with `.indexOn: end`. Read without an account.
- `uadTemporada/s<yyyy-mm>`: Uno al día's season places by week (D-424), `{ c, t, j: { <jid>: { n, co?, s, l } } }`. Read without an account; written only by the administrator, by the nightly points rebuild (`uad-points-backfill.mjs --rebuild`). It also holds `top` (D-473): `{ c, t, p: players, j: the rows down to the 10th place }`; the home page's season recap reads only `top` and the player's own `j/<jid>`, never the whole table.
- **Indexes for the panel (D-473):** `torneos` is indexed on `meta/end` and `meta/alias`, and `feedback` on `at`, so the panel downloads only the period it shows.
  Written only by the administrator, by the nightly `cup-podiums` job (D-450, D-499); the app no
  longer writes it. The shape (`por`, the names and `j` the cup has) is still validated as before.
  `torneoPodios/<código>/p/<pid>/j` can be written later, once and only while empty, by a phone seated
  as that cup player, with the jid that cup player is linked to: signing a podium saved without the player (D-358).
- `torneos/<código>/players/<pid>/j`: the rankings player behind the cup's one. Written by
  whoever is seated as both.
- `jugadorCopas/<jid>/<código>` = `{ p, at }`: the player's cups, for "Tus copas" on any
  phone (D-220). Only their phones read it. Written by whoever is seated as the player and as
  `p` in the cup, with `players/<p>/j` equal to the player; deleted by whoever is seated as the player.

A **legacy player** (`jugadores/<jid>.legado = true`, from La Copa's history) has no
PIN: `jugadorKeys/<jid>` can be created for them, once, and whoever claims it deletes `legado` in the
same write, seated with that PIN. They are loaded by `node tools/firebase/rankings-history.mjs --write`. A finished Cup's podium (`torneoPodios/<código>`) is written the night after its close by `rankings-history.mjs --podiums --write` (`cup-podiums` workflow, D-450), its only writer since D-499.

The owner (their UID) can write and delete in all these branches, to moderate: an offensive name is changed with `node tools/firebase/rename-player.mjs` (dry run by default), which rewrites `jugadores/<jid>/n`, its `jugadorNombres` key and every `records` row in one write (D-513).

## Uno al día (`unoAlDia`, `unoAlDiaInicio`, `unoAlDiaDias`, `invitados`, D-230)

- `unoAlDia/<jid>/<n>` = `{ j, s, ms, at, w?, p? }`: the first Uno al día attempt of day `n` (days
  since 1970). Written once by whoever is seated as that player; `w` (the mark that it was already
  added to the week) and `p` (already added to the month's points, D-412) are each added once. Anyone can read it.
  `w` and `p` go in only near the day's own date and after its start (D-465): the day's UTC start
  must lie between two days before `now` and one day after it (every time zone fits), and
  `unoAlDiaInicio/<jid>/<n>` must already exist. The rules have no number-from-text, so they sum the
  key's digits (`$d.matches(/^[0-9]{k}[d-9]/) ? …`); `uno-al-dia-jugador.test.mjs` runs that
  expression as JavaScript against `numDia`. A day uploaded later (played offline) still goes into the
  history, without `w` or `p`.
  A day a 🧊 saved is only a marker, `{ c: true, at }` (D-415): written once by the phone that saved
  it, never over a day played, and it never gets `w` or `p`. The rules check its shape, not whether
  the phone held a 🧊 (they can't count wildcards); the nightly rebuild bounds what an unbacked marker
  buys (see D-415).
- `unoAlDiaInicio/<jid>/<n>` = a number, the server time when day `n`'s first attempt started (D-433,
  for everyone since 2026-10-23). Written once by whoever is seated as that player
  (`jugadorSeats`), and only as `now` (within the last minute); never rewritten. Anyone can read a
  player's; the whole branch only the owner. Another phone of the same player that finds a start here
  and no `unoAlDia/<jid>/<n>` counts that attempt 0. Nothing sweeps it yet: a number per player and day.
- `unoAlDiaDias/<n>/<jid>` = a number, the score `s` of that played day again: the history's index by
  day (D-475), so the readers that need everyone (the panel, the nightly rebuild, the weekly report, the
  ideas agent) query a range of days (`orderBy="$key"&startAt="<n>"`) instead of downloading the whole
  history. Written once by whoever is seated as that player, only in the same write as
  `unoAlDia/<jid>/<n>` (the rules ask that the history day did not exist before and that the score is
  the same); a 🧊 marker gets no entry. Only the owner reads it. `unoAlDiaIndice` = `{ desde, at }`
  (owner only) says the index is complete: `tools/firebase/uad-index.mjs --apply` writes it after it
  copies the older history and checks the copy, and until it exists every reader reads the whole
  history as before. A day an old cached page wrote without its entry is filled in by running the
  script again (its dry run says how many are missing).
- `invitados/<jid>/<uid>` = `{ d, at, j?, p? }`: the `uid` phone finished its first Uno al día with an
  invitation from `jid`. Written by that phone, once, and not if it is seated as `jid`. Only the
  player `jid` reads it. `p` (D-414) is added once, by whoever is seated as `jid`, in the same write
  that adds the friend's +10 to `uno-al-dia-pts`: that write carries `i` = the friend's `uid`, keeps
  `u` and `r`, and adds exactly 10.
- In `records`, the period can also be a day (`d20731`). For the `uno-al-dia` table, the
  day's score has to be the one in its history, and the week adds a day from the history (`u`) that
  didn't have `w` yet. The `uno-al-dia-pts` table (D-412, D-414) takes only a
  month (`s<yyyy>-<mm>`): each write adds a day `u` that didn't have `p` yet, its score plus the
  streak bonus (5 × `r`, up to 50), and the streak `r` (1–10) grows at most one per write. October 2026 was filled in from the history by `tools/firebase/uad-points-backfill.mjs` as administrator (D-414), and its `--rebuild` rewrites every month's totals every hour from the history and the markers, with the week's sums and best streaks (the `uad-rebuild` workflow, D-415, D-500; for phones in the lab flag `uad-night-totals` it is their only writer, and the rules tighten when it launches). Details and limits in [docs/UNO-AL-DIA.md](../docs/UNO-AL-DIA.md).
- The owner reads all of `unoAlDia/`, `unoAlDiaInicio/`, `unoAlDiaDias/` and `invitados/`, for the panel's Uno al día block, and
  can write and delete in both, to moderate.

## Phone notifications (`push`, `pushCopa`, `pushEnviados`, `pushDia`, `pushEnviadosDia`, D-223, D-224, D-230)

- `ownerPush/<subId>` = `{ endpoint, keys: { p256dh, auth }, at, device? }`: the owner's own devices
  for the release notifications (D-504), subscribed from the panel. **Only the owner** reads and writes it,
  in that shape; `tools/push/release.mjs` reads it as administrator and deletes a dead one.
  `firebase/owner-push.test.mjs` checks it.
- `push/<subId>` = `{ endpoint, keys: { p256dh, auth }, lang, tz, uid, at }`: a phone's Web
  Push subscription. `subId` is 32 hex characters (the first ones of the endpoint's
  sha256). **Nobody reads it**: only the service account that sends the notifications (`tools/push/notify.mjs`, D-224), which doesn't go through
  the rules. Only the phone of that `uid` writes and deletes it, with the shape validated (`endpoint`
  https, `lang` among the four languages, `at` not later than the server time).
- `pushCopa/<código>/<pid>/<subId>` = `{ dia, plazo, at }`: which notifications that player wants in that
  cup. Nobody reads it. Written by whoever is seated as the player, and only with a subscription
  of their own (`push/<subId>/uid`, which can go in the same write); deleted by whoever is seated as
  the player ("Silenciar esta copa"). Whoever is seated as the admin deletes `pushCopa/<código>`
  whole, and only whole, when deleting the cup.
- `pushEnviados/<código>/<subId>/<clave>` = the time that notification was delivered (`dia:3`,
  `plazo:3`, `final`, `fin`, `insc:<pid>`), so it isn't repeated. Nobody reads or writes it: only
  `tools/push/notify.mjs`, with the service account (D-224), which also cleans it up.
- `pushDia/<subId>` = `{ h, d, r, w, u, c, k, m, sp, sn, at }`: what that phone asked for from the Uno al día
  notifications (the hour `h`, 0 to 23, and whether it wants the daily one, the streak one and the week one) and,
  for the text, its last day played `u`, its streak, wildcards (0 to 2) and best streak, and the week of
  that day with how many days it played (D-230). Nobody reads it; it is written by the phone whose identity
  (`auth.uid`) is the one in `push/<subId>/uid`, which can go in the same write. Any other field
  is rejected.
- `pushEnviadosDia/<subId>/<clave>` = delivery time (`dia:<n>`, `racha:<n>`, `semana:<s>`, `adios`):
  written and cleaned only by `tools/push/notify.mjs`, with the service account.
- Here the owner has no exception: their UID neither reads nor writes these branches.

## Reports (`feedback`)

La Copa's 🐞 button (D-101, D-104), the one in a language's lab (D-191), the "¿Qué te
pareció?" at the end of the lab's El caso (D-265) and the "💬 Sugerencias y comentarios" inbox at the
end of every game and in the home footer (D-341, `buzon.js`) write to `feedback/<id>` **over REST and without an account**:
`texto` (up to 1000 characters), optional `nombre`, `tester` (the label of the lab key
used to enter, up to 24; never the key, D-306), `contexto` (JSON, up to 500), optional `tipo` (the kind picked in the inbox: `sugerencia`,
`problema`, `idea` or `otro`, D-341), `v` and server `at`.
It is written only once and **read only by the owner** (D-459, which amends D-104): `node tools/firebase/reports.mjs`
shows them with the admin key (`--days 3` for recent ones), and the panel reads them signed in as the owner.
They carry no PIN or account data.
Every 5 minutes, the Mac mini's `feedback-watch` job (`tools/agents/feedback.mjs sync`, D-382) uploads the new ones as
GitHub issues with the `feedback` label (plus `feedback:suggestion`, `feedback:problem`,
`feedback:game-idea` or `feedback:other` when it carries a `tipo`, D-341), with the name masked (`C******* A*******`, D-279, D-366) and the key (D-306) and without the
browser, and the processes agent handles them (D-275).

**Where each report stands:** `feedbackEstado/<id>` (`issue`, `state`, `replied`, `prs`), readable only by the owner and written only with the admin key by `tools/agents/feedback.mjs sync`, for the panel's 💬 Feedback section.

**The optional email (D-317):** `feedback/<id>` may carry `correoMascara` (`j********n@g********m`, D-366; the older `j********@********m` still validates),
never the address. The address goes to `feedbackContacto/<id>` (`correo`, up to 120, and server
`at`): written once, only when `feedback/<id>` exists, and **never readable without the owner's
key**. `tools/agents/feedback.mjs reply` reads it with the key, emails the reply and deletes it;
`forget` deletes it without emailing; and one left unanswered is deleted after 90 days by
`feedback.mjs expire`, which every `sync` pass runs (D-463). What each node keeps, and for how long,
is told to players on `/privacy/` (D-463): a change here that keeps something new edits that page too.

**The hola@ inbox (D-318):** `buzon/<id>` keeps each email sent to hola@juegosdesalon.cl (`de`,
`nombre`, `asunto`, `texto` up to 10000, `idMensaje`, `automatico`, server `at`), written by the
Cloudflare Worker (`tools/cloudflare/inbox-worker.js`). **Only the inbox user** (Firebase Auth
`buzon@juegosdesalon.cl`, its UID in the rules) reads it or writes in it; not even anonymous
players. The support agent turns each email into a `feedback/` report with
`tools/agents/inbox.mjs` and deletes it.

## Splash campaigns (`splash`, D-454)

`splash/<id>` = `{ on, order, from?, until?, at }`: which campaigns of `CAMPAIGNS`
(`public/assets/js/splash.js`) the home page shows, in what order and between which days
(`yyyy-mm-dd`, `from` inclusive). Public read (the home page reads `splash.json` once per visit);
only the owner's UID writes it, from the panel's 📣 Campaigns section. Ids match `[a-z0-9-]{1,40}`
and any other field is rejected. While the node is empty, the home page uses `ACTIVE`.

## Skins and site features (`controls`, D-477)

`controls/skins/<id>` = `{ mode: 'yearly'|'dates'|'off', from?, until?, at }` and
`controls/features/<id>` = `{ <part>: bool, at }` (☕: `support: { footer, endings }`): the panel's
📣 Campaigns → 🎨 Skins and 🧩 Site features. Public read (the home page reads `controls.json` once per
visit and keeps a copy on the device, `public/assets/js/controls.js`); only the owner's UID writes it.
Empty, the site is as the code says. Checked by `firebase/controls.test.mjs`.

## Lab flags (`flags`, D-498)

`flags/<id>` = `{ state: 'lab'|'all'|'off', at }`: a runtime gate for something still in the lab,
switched on its /labs/ card (🧪 lab, 🚀 everyone, ⚪ off). Public read (the page asks
`flag(<id>)`, `public/assets/js/flags.js`: `lab` means only lab key holders, `all` everyone, `off`
no one); only the owner's UID writes it; ids match `[a-z0-9-]{1,40}` and any other field is rejected.
Empty, a flag is `lab`. Checked by `firebase/flags.test.mjs`.

## Lab use and readiness (`labsUso`, `flagsListas`, D-528)

`labsUso/<flag>/<day>` = `{ n, c, e, k: { <8 hex>: true } }`: loads with the flag on through a lab key,
finished loads, loads with a failure, and the first 8 hex of each key's SHA-256. Anyone adds one at a
time (`public/assets/js/lab-usage.js`); only the owner reads. `flagsListas/<flag>` is the verdict
`tools/agents/lab-ready.mjs check` writes for the /labs/ card; owner only. Checked by `firebase/lab-ready.test.mjs`.

## Publishing a lab feature (`labsPublish`, D-480)

`labsPublish/<card id>` = `{ state: 'requested'|'working'|'pr'|'merged'|'failed', at, title?, note?,
started?, pr?, branch?, msg?, done?, conflictAt?, fixAt? }`: the owner's 🚀 Publicar para todos request from a /labs/ card.
Only the owner's UID reads and writes it (the button shows only when the read works); card ids match
`seccion-[a-z0-9-]{1,40}` and any other field is rejected. The Mac mini's `lab-publish-watch` job and
`tools/agents/lab-publish.mjs` move it through its states; `conflictAt` and `fixAt` mark a PR left in conflict with main and the session sent to bring it up to date (D-486). Checked by `firebase/labs-publish.test.mjs`.

## The trash bin (`cleanup`)

Nobody deletes their room when they finish playing. Phones note each room in a bucket, and the
nightly `room-sweep` job deletes them (D-39, D-499, canon C-7): the free plan has no Cloud Functions,
so the cron is a GitHub workflow with the admin key.

```
cleanup/
  sweptDay: 20341            day already swept (public watermark)
  days/20342/
    lastAt: 1757500000000    mark of the last entry, with the server clock
    rooms/ABCD: true         codes created that day
```

- On creating a room its code is written into its day's bucket **in the same multi-path update that
  creates the room** (D-321), with `lastAt` the same server stamp as the room's `createdAt`; entering
  a room overwrites `lastAt` with the server time. `lastAt` only moves forward, and only on today's bucket, yesterday's or tomorrow's (D-469). Codes are only added: a note can be written
  again (a code reused the same day) but never removed or changed.
- A room that no bucket names is not in any bucket. `node tools/firebase/unnoted-rooms.mjs` lists them
  (admin key) and `--fix` deletes the expired ones and notes the live ones (D-321); the nightly sweep does the same.
- **Only the owner reads and deletes a bucket** (D-499); phones only write to it. A bucket is swept
  6 hours after its last entry: when it opens, all the rooms it names have already expired, because
  none lasts over six hours (D-89).
- Sweeping is `node tools/firebase/room-sweep.mjs [--apply]`, run every night by the `room-sweep`
  workflow: every closed bucket of a day before today, however old, has its rooms and itself
  deleted, and the unnoted rooms are handled as `unnoted-rooms.mjs --fix` does. The admin key goes over
  the rules, so the tool itself deletes only rooms expired by the two clocks, and keeps (and notes
  again) a live room that reuses a code an old bucket names. Phones no longer sweep.
- `sweptDay` is the last day swept, written by the job; public to read.

Logic and tests: [`public/assets/js/transport/cleanup.js`](../public/assets/js/transport/cleanup.js) ·
`node public/assets/js/transport/cleanup.test.mjs`.

## The archive (`archive`, D-476)

What nobody reads any more leaves the live tree for `archive/`, in the same database, with the
same path under it (`torneos/ABCD` → `archive/torneos/ABCD`): putting one back is moving it back.
The rules close it to everyone (`.read` and `.write` false); only the admin key reads or writes it.

| Moves | When | Why nobody misses it |
|---|---|---|
| `torneos/<code>` with `torneoIntentos`, `torneoSeats`, `torneoKeys` of that code | ended more than 733 days ago and its podium is in `torneoPodios/` (or it never gets one) | the panel reads back two years at most (a year and the year before, D-348), the medal table reads `torneoPodios/`; `rankings-history.mjs` reads `archive/torneos` too |
| `stats/<env>/days/<day>`, without `rooms/`, `live/` and `seen/` | older than 733 days | same panel reason; `weekly.mjs` reads 7 weeks |
| `records/<t>/d<day>` | older than 35 days | the app reads only today's table |
| `unoAlDiaInicio/<jid>/<day>` | older than 35 days | read only for today |

`node tools/firebase/archive.mjs` is a dry run; `--apply` copies each node, reads the copy back,
compares it and only then deletes the live one. The `firebase-archive` workflow runs it nightly at
09:41 UTC, as a dry run until the repository variable `FIREBASE_ARCHIVE_APPLY` is `true`.
An old Cup link stops opening once its Cup is archived (two years after it ended).
`unoAlDia/` and `rooms/` are not archived here.

## The goodbye (`left`)

The trash bin is the back door: it can only touch a room once it expired. The front one
is the goodbye (D-50, canon C-7): whoever leaves **on purpose** —cancels the room in the lobby,
exits, changes mode, moves to the rematch room— writes `left: true` in their role and,
if on rereading nobody is left without saying goodbye, deletes the room on the spot.

- `online: false` isn't enough: that's losing signal or closing the tab, and that game can
  be resumed while the room lives (C-6). On reconnecting, `left` goes back to `false`.
- They are two writes and in that order, because the rules look at the room **before** the deletion.
- The rule lists the six roles: Firebase rules can't iterate over children.

Logic and tests: [`public/assets/js/transport/dispose.js`](../public/assets/js/transport/dispose.js) ·
`node public/assets/js/transport/dispose.test.mjs`.

> **Only once, when publishing this:** rooms created before the trash bin aren't recorded
> in any bucket and nobody will sweep them. They are deleted by hand from *Realtime Database → Data*,
> removing the whole `rooms` node (there are no games in progress worth more than 6 hours).

## Usage signals (`stats`)

What the games record for the owner's panel ([docs/PANEL.md](../docs/PANEL.md)),
by environment (`prod`, `lab`, `dev`) and by day:

```
stats/prod/days/20342/
  rooms/ABCD: { game, at, v, players: { A: "Javi", B: "Cata" } }   two phones
  local/toque-y-fama/cpu/1: 7          offline games: game / mode / players → how many
  origin/America__Santiago: 12         phones that started or joined a game
  lang/es-CL: 12                      browser language
  applang/en: 4                       language chosen in the game (D-46)
  hour/21: 5                           phone's local hour
  aviso/dia: 3                         La Copa notifications tapped, by type (D-233)
  uad/dado: 9                          what is done in Uno al día, by event (D-230)
  pwa/android: 2                       opens from the installed app (?pwa), by system
  mandados/plazo: 4                    notifications delivered, by type: only notify.mjs writes them
  falla/js/cup: 3                      loads with failures, by type and page: recorded by vigia.js (D-251)
  err/a1b2c3/n: 2                      how many loads saw that error; err/<firma>/d, its detail
  listo/cup/s3: 6                      how long the page took to start, by bucket
  fin/toque-y-fama/cpu: 5              offline games finished, by game and mode (D-348)
  otra/toque-y-fama: 2                 replays ("otra vez"), by game
  comparte/app: 3                      things shared, by what
  vuelta/d2-7: 4                       days since the browser's last visit, by band
  frec/f3-7: 6                         how many of the last 28 days the browser came, by band
  activos/k3j9x0q2ab: 2                a browser's random id: 1 visited, 2 started something (D-349)
  support/open: 1                      ☕ Buy me a coffee, by step: shown, open, pay, thanks (D-448, in the lab)
  splash/brindis-apoyo/reach: 4        splash windows, by campaign and event (D-461)
stats/prod/push: { vuelta, vivas, torneos }   notify.mjs's last run and how many subscriptions are still alive
```

- `rooms/<CÓDIGO>` is created only once; each `players/<rol>` too. Nothing is edited or deleted.
- Counters only accept **going up by exactly one**: phones send
  `{".sv": {"increment": 1}}` over REST and the rules reject any other value.
- The time zone goes with `__` instead of `/` (`America__Sao_Paulo`), because the slash can't
  go in a key and names already use the underscore.
- `stats/` doesn't go in the trash bin: it's a few hundred bytes per game. Its names (`rooms/`, `live/` and `seen/` of each day, D-503) are deleted after 24 months by `tools/firebase/stats-retention.mjs`, run once a day by the `uad-rebuild` workflow, in its 08 UTC run (D-472); the nameless counts stay.
- **Keys are validated by shape, not by list** (canon C-16, D-73): the game
  (`^[a-z-]{1,40}$`), the mode (`^[a-z][a-z-]{0,15}$`, the same shape as `MODE_KEY` in
  `public/assets/js/games.js`), the number of players (`^[1-9][0-9]?$`) and the environment
  (`^[a-z]{2,10}$`). That way a new game or mode starts being counted the day it is
  published, without having to remember to come back and republish the rules. A list here rejects
  the signal on the server, the game doesn't even notice and the data never exists.
- What **does** force touching the rules: a new signal category (anything that isn't
  `rooms`, `local`, `origin`, `lang`, `applang`, `hour` or the ones below), because `$other` rejects them.
- Notifications (D-233): `aviso/<tipo>` and `pwa/<sistema>` are uploaded by phones, by one; the key
  is validated by shape (`^[a-z]{1,12}$`), and the list of types lives in `stats.js` (`TIPOS_AVISO`).
  `mandados/<tipo>` and `stats/<env>/push` aren't written by any phone: only `notify.mjs`, with the
  service account, which doesn't go through the rules.
- Uno al día (D-230): `uad/<evento>` is uploaded by phones (`trackUnoAlDia` in `stats.js`): the
  event is validated by shape (`^[a-z]{1,16}$`) and the value can only start at 1 or go up by exactly
  one. The list of events lives in `stats.js` (`EVENTOS_UAD`); it doesn't say who.
- Domains (D-348, D-349): `fin`, `otra`, `comparte`, `vuelta` and `frec` are counters like the
  others (start at 1, go up by one; keys by shape). `activos/<id>` is the only key that names a
  browser: a random 10-character id (`^[a-z0-9]{10}$`) kept in `localStorage`, whose value can only
  be 1 or 2 and never go down. Nothing else goes with it.
- Support (D-448): `support/<event>` is a counter like the others, uploaded by `support.js`; unlike
  the categories above, the event is validated **by list** (`shown`, `open`, `pay`, `thanks`), so a
  new step does force touching the rules. Only counts: nothing says who supported or how much.
- Splash campaigns (D-461): `splash/<id>/<event>` is a counter like the others, uploaded by
  `public/assets/js/splash.js` (`SPLASH_EVENTS`), never from a preview. The campaign id goes by shape
  (`^[a-z0-9-]{1,40}$`), the event by list (`shown`, `reach`, `play`, `close`, `t0`, `t1`, `t2`, and since D-466 `start`, `finish`), so a
  new event forces touching the rules. `reach` is the first window on a phone, remembered on the phone,
  so no id leaves it.

- Health (D-251): `falla/<tipo>/<página>`, `listo/<página>/<tramo>` and `err/<firma>/n` are uploaded by
  `public/assets/js/vigia.js`, by one; type, page, bucket and signature are validated by shape. The detail,
  `err/<firma>/d` (`{ k, p, m, f, b, v, at }`), is written **only once** (`!data.exists()`), with the
  message capped at 160 characters and the time within a minute of the server's; that's why the count
  and the detail go in two requests: in an atomic PATCH, rejecting the detail would take the count with it.

Module and tests: [`public/assets/js/transport/stats.js`](../public/assets/js/transport/stats.js) ·
`node public/assets/js/transport/stats.test.mjs` · `node public/panel/adapta.test.mjs` (compares the shape of
the rules with the code's).

## The panel: Authentication and the owner's UID (only once)

**Two accounts cross here and the order matters.** Console work is done with the account that owns
the project (`la cuenta de la máquina`); the UID that goes in the rules is the one of the account
you want to *view* the panel with (`la cuenta de administrador`). They are different on purpose: the rule
compares the Firebase Authentication UID, not the Google Cloud permission, so passing the
rule doesn't require being the project's owner.

This account's Firebase console is **in English**, so the names below are written
as they appear on screen. Translating them to Spanish sends you looking for menus that don't exist.

1. With `la cuenta de la máquina`: **Authentication → Sign-in method → Google → Enable.**
   It asks for a *Support email for project*: the same owner account works.
2. With `la cuenta de la máquina`: **Authentication → Settings → Authorized domains → Add
   domain:** add `juegosdesalon.cl`, which is where the site lives. Authorizing
   `ellokojavi.github.io` doesn't work: it redirects with a 301 and Google sign-in happens on the
   final domain.
3. Go to `/panel/` **with `la cuenta de administrador`**: since the rules don't know that
   UID yet, the page shows it on screen instead of letting you in.
4. Put that UID in the two `.read` lines of [database.rules.json](database.rules.json)
   (`rooms` and `stats`) and publish the rules with `la cuenta de la máquina` in
   *Realtime Database → Rules → Publish*.

**Steps 1 to 4 are already done**, with the UID of `la cuenta de administrador`. They stay written in case
the account ever has to change. The UID isn't a secret: it doesn't get you into
anything, it only says which already-authenticated user can read.

While the UID isn't there, the rules fail closed: nobody reads `stats/` or lists `rooms/`.
Players never authenticate; turning on Google changes nothing for them.

If two accounts are ever needed, the rule stops being a comparison and becomes a
list: `auth != null && (auth.uid === 'UNO' || auth.uid === 'OTRO')`, in both places.

> **Two owners, on purpose.** The project was created by `la cuenta de la máquina`, a machine
> account, and for a while it was the only owner: losing its access would have meant
> losing the published app's database. Since 2026-09-11 `la cuenta de administrador`
> is also *Owner* in
> [IAM](https://console.cloud.google.com/iam-admin/iam?project=juegos-de-salon). If there is ever
> only one again, it's worth adding the second one back.
>
> Being owner in IAM and being able to enter the panel are different things: the panel compares the
> Authentication UID, not the IAM permission. Adding an owner does **not** give them access to the panel,
> and removing one doesn't take it away.

## Testing the rules over REST

```bash
DB=https://juegos-de-salon-default-rtdb.firebaseio.com
NOW=$(($(date +%s)*1000))
# the room and the player go in two steps: the `players/` rules look at the `createdAt` already
# in the database, so in a single write it doesn't exist yet and is rejected
# the app writes the room with its note in the trash bin, in one root update (D-321)
DAY=$((NOW/86400000))
curl -X PATCH "$DB/.json" -d "{\"rooms/ABCD/createdAt\":$NOW,\"rooms/ABCD/game\":\"toque-y-fama\",\"rooms/ABCD/config\":{\"digits\":4},\"cleanup/days/$DAY/lastAt\":$NOW,\"cleanup/days/$DAY/rooms/ABCD\":true}"
curl -X PUT "$DB/rooms/ABCD/players/A.json" -d '{"name":"Javi","online":true}'

# the bucket can't be opened yet (just recorded)
curl -X PUT "$DB/cleanup/days/$DAY/rooms/ABCD.json" -d 'true'    # noting it again: should pass (D-321)
curl -X PUT "$DB/cleanup/days/$DAY/rooms/ABCD.json" -d 'false'   # -> Permission denied
curl "$DB/cleanup/days/$DAY.json"   # -> Permission denied

# delete the live room without saying goodbye (should fail), say goodbye and delete again (should pass)
curl -X DELETE "$DB/rooms/ABCD.json"                                           # -> Permission denied
curl -X PATCH "$DB/rooms/ABCD/players/A.json" -d '{"online":false,"left":true}'
curl -X DELETE "$DB/rooms/ABCD.json"                                           # -> null

# usage signals: bump a counter by one (should pass), overwrite it with another value (should fail), read (should fail)
curl -X PATCH "$DB/stats/dev/days/$DAY.json" -d '{"local/toque-y-fama/cpu/1":{".sv":{"increment":1}},"origin/America__Santiago":{".sv":{"increment":1}}}'
curl -X PUT "$DB/stats/dev/days/$DAY/local/toque-y-fama/cpu/1.json" -d '50'   # -> Permission denied
curl "$DB/stats/dev/days/$DAY.json"                                            # -> Permission denied
```

## Quotas and limits (Blaze, D-512)

The app is static: there is no server of its own, so all of multiplayer depends on this
database. Blaze keeps the free quotas below and charges only beyond them, so the expected bill is $0:

| Resource | Free each month | What it means when playing |
|---|---|---|
| Simultaneous connections | ~200,000 per database (not billed) | Was ~100 on Spark (≈50 two-phone games); no longer the ceiling |
| Download | ~10 GB/month, then billed per GB | The one that costs money: keep reads small (D-470, D-473, D-499) |
| Storage | 1 GB, then billed per GB | Barely relevant since D-39: the trash bin deletes what expired |

**Past the free quota the database does not go down: it bills.** The budget email (above) and the
alerts below warn before it matters. On Spark, past ~100 connections Firebase rejected new ones and
the player could not enter the room (since v0.18 at least the player is told, D-40); that message stays.
Only what plays online holds a connection: the rankings are read over REST, and the SDK's
websocket opens only when a player saves a score or signs in (D-470).

Confirm the numbers in the console before setting thresholds: Google has changed them.

### Watching it (RP-22)

1. **Firebase Console → Realtime Database → Usage**: baseline of connections, storage
   and download with real traffic.
2. **Connections alert, in Google Cloud Monitoring** (created on 2026-10-12): the policy
   [Firebase: 80 de 100 conexiones](https://console.cloud.google.com/monitoring/alerting/policies/2345084699692281801?project=juegos-de-salon)
   watches `firebasedatabase.googleapis.com/network/active_connections` and alerts by email
   (channel "JBot Mac Mini GCloud Notification") when it goes over 80. Since Blaze (D-512) 80 is no
   longer near a cap: it now means "traffic is growing", not "about to go down"; the name stays. It was created by hand in the console: the
   service account key is for the database, not for configuring Google Cloud.
3. **Daily download alert, in Google Cloud Monitoring** (created on 2026-10-27, by hand like the
   one above): the policy **Firebase: descarga diaria > 250 MB**, listed in
   [Cloud Monitoring → Alerting](https://console.cloud.google.com/monitoring/alerting?project=juegos-de-salon),
   watches `firebasedatabase.googleapis.com/network/billed_bytes_count` ("Total billed bytes", the
   console's only download metric under Network), summed over a rolling day, and alerts by email
   (channel "Juegos-de-salon Firebase Notification Channel") above **250 MB/day**: about 7.5 GB in
   a 30-day month, three quarters of the ~10 GB cap. It closes itself after a day without data.

### If usage really grows

The cap on rooms per phone (D-41) stops accidental abuse, not the determined kind: whoever wants to
abuse hits the REST API with `curl`. The only thing that closes that door is **anonymous
authentication** (`signInAnonymously`) with rules that require `auth != null`, which would also allow
per-user rules instead of "anyone with the code". It's another security model and
deserves its own decision. Blaze (D-512) solved the ceiling and opened the door to a bill from
abuse: the US$10 alert-only budget is the warning, and Firebase App Check is the next step if abuse appears.
