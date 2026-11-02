# 🥷 Shinobi (La Copa game, launched by flag; Stick Ninja in the lab)

> **Launched 2026-11-02 (D-517, D-529).** The game is now **🥷 Shinobi**, a La Copa game in `public/cup/games/stick/`
> (engine, scene, screen, texts in es, en and pt) that serves its page `/shinobi/`, Uno al día (from the
> deck shuffled on 2026-11-08) and La Copa. **Score (D-525):** its own points, no cap (the Grand Final caps at 100; Uno al día uses a soft curve, D-526). It went live when the launch workflow switched
> the flag `stick` to everyone at 00:00 Pacific on 2026-11-02 (D-529); the gate stays until the cleanup PR, with «Nuevo» for 10 days. The cover credits the original with a link, as every inspired game
> does. What follows describes the English lab prototype, still at `/labs/stick/` until the cleanup PR;
> the play is the same in the new module. End to end: `tools/e2e/stick/game.mjs`.

A hold-and-release bridge game for one player, or for a group passing the phone (D-446): hold to stretch a
stick, let go and it falls across the gap. **Inspired by [Stick Hero](https://www.ketchappgames.com/), by
Ketchapp (2014)**, and it says so on the cover and in the lab. The owner sent a video of the original, asked
for an evaluation, and then: "Build it as a labs prototype but make it much more stylish and complete with
feedback to users upon achievements (…) making the dot a flag, and create a nice emerging pulse signal for
the bonus. Find nice improvements".

## Summary

- **Where:** `https://juegosdesalon.cl/labs/stick/`, in the lab (each person's key, D-281, D-284). Id
  `stick` in the usage signal.
- **For whom:** one player, or several taking turns on the same phone. **English only**, like Stack (D-445):
  the page is `lang="en"`. The lab card is in Spanish, like the rest of `/labs/`, and says "Por ahora, solo
  en inglés."
- **Status:** active project, to try with friends. What would prove it: players who play more than one run
  in a visit, and runs on the same day from different phones.

## Cover

The title with a 🥷 that hops now and then, the tagline ("Stretch the stick, cross the gap, plant the
flag."), the credit, and a run that plays itself on a small canvas (mostly flags, a plain landing now and
then, and every so often a stick too short; then another course;
still with reduced motion). Then "🥷 Play"; under it, like every game played alone (D-212, D-249), **the Stick Ninja
leaderboard** (Week · All time · Friends, the `stick` table) and the card to sign in with a name and PIN;
then the three steps (after the button, U-39), and with them this phone's best ("🏆 Best: n", once there
is one):

1. 👆 Hold to stretch the stick, let go to drop it across the gap. You have 3 lives.
2. 🚩 Land its tip on the flag for a perfect: +1, then +2, +3… for each one in a row.
3. ↔️ Later on, some pillars slide: aim where they will be when the stick lands.

Under them: "📅 Today's course is the same for everyone. Pass the phone and compare."

## How it is played

- **The heading**, like the other games': "🥷 Stick Ninja" on the left and "🏆 Best: n" on the right (once
  there is a best); it turns yellow, grows for a moment and glows when this run beats it.
- **The night** fills the screen between the heading and "💬 Leave a comment", on a transparent canvas over
  the app's own background: twinkling stars, a crescent moon with its halo, and two ranges of mountains as
  dark silhouettes with a moonlit ridge, each moving slower than the pillars (parallax). The pillars are
  dark columns with a neon top edge (the house's colors, one after another) and faintly lit sides, fading
  into the night at the bottom. The score is big and yellow at the top.
- **From night to day** (`DAY_EVERY` in `scene.js`): every 15 points the sky eases on a stage over about
  two seconds: dawn (the moon sets, the stars fade, a sun rises behind the mountains and the ranges warm),
  the morning, and from 45 points the full day, which stays. A painted sky covers the app's night from
  dawn on; with reduced motion the change is instant.
- **Hold anywhere** (or Space or Enter) and the stick grows up from the edge of the pillar, with a soft
  rising note every so often, so the length is heard too. **Let go** and it falls across the gap. The
  first time it says "Hold to stretch the stick".
- **Its tip on the next pillar:** the ninja runs over, headband tails flying, and scores **1**. Too short,
  the stick has nothing under its tip and swings on down into the gap; the ninja runs to its pillar's edge
  and falls after it: "Too short!". Past the pillar (too long), the ninja runs to the tip, the stick drops
  and the ninja falls: "Too long!".
- **Three lives** (the owner's request, 2026-10-26: one fall could end a run in ten seconds, so a run had
  no length): three ❤️ at the top left of the night. A fall costs one, which goes dark: "Too short!" or
  "Too long!" with "❤️ 2 lives left" or "Last life!" under it, and after a moment the ninja is back on the
  same pillar with a new stick, the score kept and the flag streak gone (a moving pillar never stopped,
  so it is still sliding where it was, with no jump). Before that it climbs back: it peeks up from the gap and throws a grapple in an arc; the rope
  flies with soft bends that ease as the hook bites the edge, then bends over the lip and hangs out in the
  gap, clear of the pillar's wall, while the ninja climbs it pull by pull. The third fall ends the run. The share card shows each fall as 🕳️ where it happened.
- **The flag** stands at each pillar's center, a lit pink strip at its foot: the original's red dot, made a
  flag. The one to reach waves faster and glows. **A tip within 4.5 units of the center** (the strip) is a
  **perfect**: three rings of light (cyan, pink, gold) emerge from the tip one after the other, bigger with
  each perfect in a row, with sparks, a soft golden flash of the night and a glow around the stage's edge;
  the flag pops and turns gold, and stays gold on that pillar; "Perfect!", then "Perfect ×n", in the
  display font with the titles' rainbow; a note that climbs with the streak and a short vibration. A
  perfect is worth **+1 for the first, +2 for the second in a row, and so on up to +5**; the points rise from
  the pillar, and once two are in a row a chip under the score says "🔥 ×n · next flag +m". From 5 in a row,
  a little confetti. A landing off the flag breaks the streak.
- **No stars** (the owner's request, 2026-10-25): the first version hung a ⭐ under the bridge in some gaps,
  grabbed by tapping while running to flip the ninja under the bridge, with a crash if it was still upside
  down at the pillar. The stars, the flip and the crash are gone: a tap while running does nothing.
- **Achievements** drop in as a banner near the bottom of the night, with an icon, a name and a line,
  glowing once, one after another: 🚩 Bullseye! (the first flag), 🔥 On fire (3 in a row), ⚡ Unstoppable
  (5 in a row, the top bonus), 👑 Flag master (8 in a row), 🎯 Moving target (a flag on a moving pillar), 🏆 New best! (beyond the record), and 🏯 10, 25, 50, 100, 150 and 200 points. Each one once a run.
- **Moving pillars** (the owner's feedback, 2026-10-25: "a player who is comfortable on still pillars has to
  think to aim at a moving one"): from the 10th pillar on, some pillars slide back and forth while they are
  the one to reach, along a faint dashed cyan rail with an arrow at each end that shows their whole swing.
  A few move at first, slowly (18 units each way, a swing every 4.4 s); by the 60th, about two in three
  move, up to 60 units each way, a swing every 1.9 s. The stick is judged **where the pillar is when the
  stick lands** (0.32 s after letting go), and if the stick is on it the pillar stops right there, so the ninja can cross. A miss does
  not stop it: it slides on through the fall and the climb back, so it never jumps to another place (the
  owner's request, 2026-11-02). A
  moving pillar never comes closer than 26 units, and its whole swing fits on the screen. The first time one comes, until the phone has crossed one, it says "This pillar moves: aim where it
  will be when the stick lands".
- **The course** is the day's, on the phone's calendar: the same pillars, gaps and slides for
  everyone today, and another tomorrow. The pillars get narrower and the gaps wider over the first 40
  pillars, from about 46–78 units wide to 10–24 at the hardest (the flag's strip is 9); every next pillar
  always fits on the screen. `?seed=n` plays another course (the end-to-end script uses it).
- **Interrupted** (a call, another app, the screen locked, the page losing focus): the game pauses, "⏸️
  Paused · Tap to continue". In the middle of a hold the stick stops where it was, and after the tap back
  it says "Hold to keep stretching": the next press goes on from that length. A running ninja freezes and
  goes on from the same spot. The tap back only takes the pause off.

## The result

The stamp (🏆 New best! or Game over), the score, then **with a player signed in** how the run did
against their record on the leaderboard (it replaces this phone's best), and **without one** "Your best: n" (when it is not a new best; kept on the
phone, `juegos-de-salon:stick-best`, the moment each point beats it), the breakdown (bridges crossed, flags
and their bonus, the longest flag streak), **today's runs on this phone** from the second one on (a
row of scores, the best lit yellow, the last one outlined, with "Same course: pass the phone and compare.";
`juegos-de-salon:stick-today`, the last 12, cleared by a new day or another course), sharing (each bridge a
🎯 flag or a 🟩, then 🕳️ the fall, ten to a line), 🔁 Play again, back to the lab, then without a player "Want this game to count on the leaderboard?" with Sign in (D-274), the leaderboard and, after a
line, the comment form. **Rankings:** each run counts in the `stick` table (points first, then the shorter run), as a lab game, like Julepe (D-215), and outside the Todoterreno, which sums only the games out of the lab; a course chosen with `?seed=` does not count (D-212). The page is English, so it fixes the rankings' language with `fijarIdioma('en')` (`ranking.js`).

## How it works

- `engine.js`, pure: the course comes from a seed (`daySeed(date)`, mulberry32 from `assets/js/rng.js`),
  each pillar made in order the first time it is asked for, so a seed is a course. `press(g, t)` and
  `release(g, t)` measure the stick between the two timestamps; the page passes the events' own
  `timeStamp`, so a 60 Hz and a 120 Hz phone stretch the same stick. The running ninja's position depends
  only on the time since the stick fell (`runX`), so `advance(g, t)` gives the same arrival or fall
  however often it is called. A moving pillar's place
  depends only on the time since the ninja stepped on the pillar before (`g.moveT0`, `pillarAt(g, k, t)`).
  `revive(g, t)` brings the ninja back after a fall that left lives (`LIVES`, phase `lost`). `suspend` and `pause` handle the pauses (a pause also stops a moving pillar). `holdFor(g, offset)` and `starTime(g)` serve the cover's demo and the end-to-end script.
- `scene.js`: the canvas scene, shared with the splash teaser (the night, the pillars and flags, the stick, the ninja drawn as shapes, the
  pulses, sparks and floating points, a camera that slides to the next pillar).
- `game.js`: the cover, the game with its banners, and the result. The end-to-end hook is `window.__stick` (`S`, with `S.presionar(t)` and
  `S.soltar(t)` as a finger would, `S.pausar()` as a hidden page does, `sostener(offset)` and `estrella()`).

## To tune

The numbers at the top of `engine.js`: how fast the stick grows (`GROW`), the flag's margin (`PERFECT`), the
top bonus (`MAX_BONUS`), the fall and run speeds (`TURN_MS`, `RUN`), the lives (`LIVES`), when pillars start moving and how fast
(`MOVE_FROM`, `MOVE_FULL`, `PERIOD_SLOW`, `PERIOD_FAST`, `MIN_GAP`), and in `pillar()` the widths, gaps, how
hard it gets (`hardness`), and how far and how many pillars move.

## The teaser

The splash `ninja-pronto` ("El ninja enfrenta una misión nunca antes vista", off until the owner turns it on from the panel's
📣 Campaigns) announces the game without naming it or showing its play: the ninja dashes to the edge of its
pillar and stays there, looking at the next one, with no stick (`public/assets/splash/ninja-teaser.mp4`, recorded by
`node marketing/splash/teaser.mjs ninja` from `marketing/splash/teaser/ninja.html`). The scene draws with the
game's own `scene.js` on the teaser engine (`marketing/splash/TEASERS.md`, D-505), so a change to the game's drawing reaches it the next time it is recorded; its memory is
`marketing/splash/campaigns/ninja-pronto/README.md`.
