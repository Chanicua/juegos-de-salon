level: patch

- Tests: La Copa's create-week check reads the pool's size from the engine instead of a fixed 14 (Shinobi and Babel made it 16, and it failed on every PR); 🚂 Tren en Vilo's paused-clock check waits past one clock tick before reading it, so it no longer fails now and then.
