# 📞 Duende (lab prototype, in Juegos en prueba)

A one-player runner moved with a phone's keys. **Inspired by the TV games of the nineties that were
played by calling in and pressing the phone's keys** (the best known, Hugo, by ITE, 1990). The owner
sent a video of Hugo and asked for "the same idea of the original game, in a game-room mode": the
gnome first in his old 2D look, then passing to a game-room version, played with the phone's keys
drawn on screen and a finger to either side, harder and harder, with checkpoints.

**Its name and its character are ours.** Hugo the troll, his name, his look and his levels belong to
their owners and are still in use, so the game does not copy them (the same rule as Babel and
Shinobi, which do not take the originals' names): the runner is a gnome with a red hat, a white beard
and a blue coat, called Duende until the owner picks another name. The folder and id are `phone-run`,
so a rename only changes the texts.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/phone-run/`, in the lab (each person's key, D-281, D-284).
  Id `phone-run` in the usage signal. Best score kept in `juegos-de-salon:phone-run-best`.
- **For whom:** one player. Spanish only (a prototype).
- **Status:** active project, to try with friends. What would prove it: players who play more than
  one round in a visit, and comments that say the keys answer in time.

## Intro: the old TV

The page opens on a wooden TV with two knobs. In its picture, in big pixels (a 104 × 84 canvas drawn
pixelated, with scan lines), the gnome walks in from the left over a checkered floor, stops and waves;
"DUENDE" blinks above him and "¡LLAMA Y JUEGA!" appears. At 3.6 s the picture glitches (lines that
slide, colors that split), the TV comes at you and fades, and the cover pops out of it with the
game-room gnome waving and a little confetti. A tap anywhere, or "Saltar intro ›", goes straight to
the cover. No intro with reduced motion, nor with `?intro=0` (tests).

## Cover

The gnome waving (drawn, not an emoji), the title with a 📞 that rings, the tagline ("Corre, esquiva y
junta oro con las teclas del teléfono."), the credit ("Inspirado en el juego de la tele que se jugaba
llamando por teléfono, en los noventa."), and the track running itself (the engine's careful player).
Then "📞 Jugar" and the three steps (after the button, U-39):

1. 📞 Con las teclas: 4 ◀ y 6 ▶ cambian de carril, 2 salta y 8 se agacha. O desliza el dedo en la pista.
2. 🪨 Salta rocas y troncos, agáchate bajo las ramas y esquiva los carros.
3. 📍 Cada tramo es un control y va más rápido. Si chocas, pierdes una de tus 3 vidas y vuelves al control.

## How it is played

- **The screen:** the heading (name and record), the track in pseudo-3D seen from behind the gnome,
  with the lives (❤️ × 3), the stretch and the coins over it, and under it **a bar phone**: a little
  green screen ("TRAMO 2 · 310 PTS") and twelve keys, with 2, 4, 6 and 8 lit in yellow with their
  arrows. The other keys only click.
- **The moves:** 4 and 6 change lane, 2 jumps, 8 ducks (in the air, 8 drops him at once). A key acts
  on the finger's touch, not its lift. On the track, a swipe does the same in its direction and a tap
  jumps. With a keyboard: the digits (numeric keypad too), the arrows, WASD and the space bar.
- **The obstacles:** 🪨 a rock in one lane (jump it or change lane), 🪵 a log across the track (jump),
  🌿 a leafy branch at head height (duck), 🛒 a cart of gold, too tall to jump (change lane). From
  stretch 4, rocks and carts can come two at a time, always leaving a way past. Coins in rows in the
  gaps.
- **The stretches:** 200 m each, ending at a checkered line under an arch that says the next one's
  number. Stretch 1 only has rocks; each of the next three brings one new kind (shown more often there,
  and named when it starts: "🪵 Troncos: sáltalos con 2"); then they are all mixed. Speed goes from
  10 m/s up by 1.6 a stretch, to 25. The landscape changes each stretch: forest, snow, desert, night
  with lamps, and again.
- **Checkpoints and lives:** a hit stops him with stars over his head, costs a life and starts the
  stretch again from its checkpoint, with the same obstacles (so it can be learned) and its coins back
  (the ones picked in it are lost; earlier stretches' are kept). Three hits end the game.
- **Pause:** losing focus or hiding the page freezes the track; the first touch back only resumes it.
- **Score:** 100 a checkpoint passed, 10 a coin. The record is kept as it happens.

## Result

"Fin del juego" (or "🏆 ¡Récord!"), the score, the record, how far he got and the coins, share (a 📍 a
checkpoint and a 💥 a hit), "🔁 Jugar otra vez", back to the lab, and the comment form after a line.

## Fairness

The engine (`engine.js`) is pure and time-based: where the gnome is depends only on the time since the
stretch started, never on frames, and each obstacle is judged at the moment he reaches it, so 60 Hz
and 120 Hz screens play the same game. The gaps between obstacles are measured in seconds (at least
0.95 s, less each stretch), and `engine.test.mjs` runs the engine's careful player through ten
stretches on several seeds without a hit.

## Files and hooks

`public/labs/phone-run/`: `engine.js` (track, moves, checkpoints, `autopilot`), `scene.js` (the track,
both gnomes, the TV), `game.js` (screens), `style.css`. `?seed=` fixes the track; `?intro=0` skips the
TV. `window.__duende` = `{ S, autopilot }` for the end-to-end script (`tools/e2e/phone-run/lab.mjs`).

## Exceptions to the canons

- Spanish only (a lab prototype, like Dominorama).
- No rooms, rankings, La Copa or Uno al día: one player, in the lab.
