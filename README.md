# EcoSplit: Water & Harvest

A two-player shared split-screen sustainability game built with HTML5 Canvas, Tailwind CSS, React, and TypeScript for both **desktop** and **mobile** browsers.

## Gameplay

- **Player 1 — Water Guardian**
  - **Movement:** `W`, `A`, `S`, `D` (Desktop) or Left Virtual Joystick (Mobile).
  - **Button 1 (`E` key / Collect):** Collect spilled water puddles into your portable tank before they evaporate.
  - **Button 2 (`R` key / Fix Tap):** Repair dripping and burst taps to stop ongoing water wastage.
  - **Cistern Bonus:** Step into the Rain Cistern zone to automatically recycle banked water for `+50%` liters.

- **Player 2 — Food Rescuer**
  - **Movement:** `Arrow Keys` (Desktop) or Right Virtual Joystick (Mobile).
  - **Button 1 (`1` key / Collect):** Rescue surplus bread, soup, fruit, and meal trays before freshness expires.
  - **Automatic Orphanage Donation:** Walk into the Orphanage zone to donate carried meals automatically.
  - **Button 2 (`2` key / Reuse → Orphanage):** Pack carried or nearby surplus food into an eco courier box that automatically delivers to the Orphanage.

## Features

- **Shared Split-Screen Mode:** Side-by-side or top-bottom dual-camera viewports sharing the same live neighborhood, cafeteria, market, or eco plaza map.
- **Device Mode Selector:** Switch seamlessly between `Auto`, `Desktop`, and `Mobile` multi-touch controls at any time.
- **Day & Night Timer Cycle:** Shift progresses smoothly through Day → Dusk → Night → Dawn with warm streetlamps, cistern beacons, and Orphanage window glow (or lock to `Day` / `Night`).
- **Health & Environmental Hazards:** Both players track `0–100 HP`—avoid burst tap jets and spoiled food fume clouds, and heal by fixing every 7 pipes/taps (`+25 HP`), recycling water, rescuing food, and donating to the Orphanage.
- **Player Customization:** Customize names, uniforms, headgear, team colors, and skin tones for both players with live Canvas previews.
- **Procedural Lo-Fi Soundtrack & SFX:** Built-in Web Audio API Lo-Fi beat engine (Rhodes jazz chords, sub-bass, swung boom-bap drums, and vinyl crackle) with independent Lo-Fi and Mute toggles.
- **Selectable Levels:** 4 distinct levels (*Neighborhood Courtyard*, *School Cafeteria & Kitchen*, *Grand Farmers Market*, *Metro Eco Plaza*) with local high-score and star persistence.

## Project Structure

- `index.html` — HTML entry point, viewport touch meta, and typography setup.
- `src/index.css` — Tailwind CSS v4 styles, font variables, and touch-surface rules.
- `src/game/types.ts` — Core game state, level, entity, and input types.
- `src/game/levels.ts` — Level configurations, obstacles, taps, and food stations.
- `src/game/audio.ts` — Web Audio API Lo-Fi music synthesizer and procedural sound effects.
- `src/game/renderer.ts` — HTML5 Canvas 2D sprite and architectural world renderer.
- `src/game/engine.ts` — 60fps simulation loop, collisions, and split-screen camera engine.
- `src/components/` — `LobbyScreen.tsx`, `GameView.tsx`, `TouchControls.tsx`, and `CharacterPreview.tsx`.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```
