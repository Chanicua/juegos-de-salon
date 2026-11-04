# 🎸 Pulso (lab prototype, in Active projects)

A one-finger rhythm game to generated 90s rock, in the spirit of the guitar rhythm games but played
with the thumb. The owner's request (2026-11-04): taps only, never swipes ("it doesn't work well any
other way"), notes that are held for a while and released at the exact moment, rhythms that change
like music does, one player collecting as many points as possible, one level, a song that gets harder
as it goes, and rock "like Aerosmith or Red Hot Chili Peppers", with other flavors later.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/pulse/`, in the lab (behind each person's key, D-281,
  D-284). Id `pulso` in the usage signal.
- **For whom:** one player. Spanish only, like the other lab prototypes (D-191).
- **Song:** without `?seed=` it is today's song (the local date as the seed), the same for everyone;
  🔁 Otra canción opens one with a random seed.
- **Status:** prototype in the lab. Next to try with the owner: whether the windows feel right on a
  real phone, the music's flavors, whether to keep "today's song".

## Cover

The title with a 🎸 that rocks, the tagline, a small stage where a part of a song plays by itself
(the notes fall, the pads light up, a hold is held to its end), "today's song", 🏆 the record if
there is one, Empezar, the three steps, "better with sound" and 🎧 Ajustar el ritmo (with the current
tuning, if any).

## How it is played

- **Three pads in an arc** at the bottom, where the thumb reaches: the middle one a bit higher. The
  whole column of a lane counts as its pad, so a tap a bit off still lands.
- **Notes fall** down the three lanes and reach their pad on the beat (they are in view 1.45 s,
  `ANTICIPO`). Faint dashes falling with them mark the beats, brighter on the bar.
- **Tap notes:** a tap when one reaches its pad: ¡Perfecto! (±50 ms), ¡Bien! (±95 ms), Casi
  (±140 ms); later than that it is a Fallo and keeps falling, grey.
- **Hold notes** have a tail ending in a white ring: pressed when the head arrives, held (the tail
  glows and shortens into the pad, the guitar sustains with vibrato), and released when the ring
  reaches the pad, which lights up when it is time (±70/120/170 ms). Letting go before is "Muy
  pronto"; holding past it, "Muy tarde": both break the run. Each beat held pays 20.
- **One finger:** the first finger plays and any other is ignored until it lifts. A tap on nothing
  (the wrong pad, no note near) breaks the run and sounds a dead string.
- **Points:** 100/70/40 per judgment (taps and releases), times the multiplier: ×2 at 10 in a row,
  ×3 at 20, ×4 at 30.
- **Energy:** starts at 60 of 100; a perfect adds 2, a good 1, a miss takes 9, a bad release 6. At
  0 the power goes out ("🔌 ¡Se cortó la luz!"): the stage flickers dark, the guitar falls in pitch
  and the game ends. Playing the whole song is "🤘 ¡Ovación!".
- **⏸** pauses (also when the phone leaves the page); 🏳️ Terminar asks for a second tap.
- **The result:** the score, the card (a square per part by how well it was played, ⬛ not reached),
  the record, precision, best run, the counts, how far it got, share, Otra canción / La de hoy, back
  to the lab and the comment form.

## The song

`cancion(seed)` builds it: two bars of intro (a groove, then four sticks with the 1-2-3-4 on
screen), **nine parts of eight bars** from 96 to 138 BPM, and a closing bar with one long hold:
about 2:40. Each part takes two riffs of its level (they alternate A B A B A B A) and closes with a
fill of the next level. The levels: quarters, the first holds, eighths, the 3-3-2 syncopation, holds
with taps right after, eighth-note triplets, sixteenths, funk off-beats, everything. Notes per
second go from about 1.4 in the first part to about 4.4 in the last.

The riff's lanes follow its melody (low notes left, high right, from the minor pentatonic of the
key: E, A, D, G or C), chosen once per riff so a repeated riff is played the same. The one-finger
rules: never two notes at once, room for the thumb (130 ms on the same pad, 160 to the next one,
210 to the far one, `HUECO`), a hold leaves room for what follows, and a hold shorter than 0.32 s is
a tap.

**The music** (`music.js`), all Web Audio and no files: drums (kick, snare with ghost notes, hats,
crash on each part), bass on the root (straight eighths in rock, a syncopated line in funk), a
distorted rhythm guitar with power chords (palm-muted eighths from the third part), and the lead
guitar, which sounds only when the player hits a note, at that note's pitch. Styles alternate rock
and funk by part. The chord progressions are 90s rock ones (I–bVII–IV, i–bVII–bVI–bVII…).

## Timing

The game's clock is the audio clock (`getOutputTimestamp` when the browser has it), minus the output
latency the browser reports and the player's tuning, so what is judged is what is heard. A tap's
time is its event's timestamp. **🎧 Ajustar el ritmo** plays 16 clicks; the median of the taps' lag
(from the third on) is kept as the tuning (`juegos-de-salon:pulso-ajuste`, from −150 to +350 ms), for
Bluetooth headphones. Without running audio (a browser that keeps it suspended, the e2e scripts) the
game plays silent on the page's clock. The site's 🔊 mutes the band without stopping the clock.

## How it works

- `engine.js`: the song (`cancion`), the game (`nuevaPartida`, `tocar`, `soltar`, `avanzar`),
  `juzgar`, `precision`, `maximo`, `tarjeta`, and the constants (windows, points, energy, gaps).
  Pure: no DOM, no audio.
- `music.js`: the band (`crearBanda`): schedules the song's events 150 ms ahead, plays the lead
  notes, the dead string and the power cut.
- `game.js`: the cover, the stage (a canvas over the whole page, nothing scrolls and a long press
  selects nothing), the tuning and the result. The record is `juegos-de-salon:pulso-record`.
  `window.__pulso.auto = true` makes it play itself, every note perfect (the e2e scripts).
- `engine.test.mjs` checks the song (same seed same song, shape, length, the one-finger rules on 20
  songs, harder at the end), the judging, the multiplier, holds (early, on time, late), a perfect game
  and the power cut. `tools/e2e/pulse/lab.mjs` plays it in the browser.

## Exceptions to the canons

- Spanish only (C-3): a lab prototype, as D-191 allows.
- No 3, 2, 1 countdown (D-105): the song counts itself in, with the sticks and the 1-2-3-4 on screen,
  because a countdown out of time with the music would throw the rhythm off.
- The stage covers the whole page while playing, without the top bar: the pause button is in its
  score bar.
