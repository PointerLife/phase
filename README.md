# PHASE SPACE

An interactive Newtonian gravity playground — a real N-body integrator wrapped in a
mission-control style instrument. React Native + Expo, TypeScript, Skia rendering, Bun tooling.

## Quick start

```bash
bun install
bunx expo start          # scan the QR code with Expo Go
```

Useful checks:

```bash
bun test                 # physics engine test suite (bun:test)
bun run typecheck        # tsc --noEmit
bun run bundle:check     # expo export, proves the JS bundle builds
```

Requires the **Expo Go** app (SDK 57). Skia and AsyncStorage are both bundled in Expo Go,
so no development build is needed.

## What it does

- **Gravity Playground** — spawn bodies, drag them, edit mass/radius/velocity, delete them.
  Pan with one finger on empty space, pinch to zoom, tap to select.
- **Physics engine** (`src/physics/engine.ts`) — every pair interacts; velocity Verlet with a
  fixed timestep and an accumulator; Plummer softening for close encounters; zero allocation
  in the step loop. The physics has no knowledge of React.
- **Presets** — Binary Orbit, Three-Body Problem (Burrâu), Solar System Approximation and
  Gravity Assist, each deterministic and explained in the LABS tab.
- **Telemetry** — position, velocity components and magnitude, acceleration, kinetic /
  potential / total energy, momentum, sim time, body count, fps and steps-per-second, plus
  live energy and speed graphs. All values come from the engine.
- **Saved Labs** — save, load, rename, overwrite and delete simulations in local storage
  (AsyncStorage). Stored data is validated and clamped before it reaches the engine.

## Units

The simulator works in **scaled** units, not SI:

| quantity | unit              |
| -------- | ----------------- |
| length   | `wu` (world unit) |
| time     | `s` (sim seconds) |
| mass     | `mu`              |
| G        | `wu³ / (mu·s²)`   |
| energy   | `EU`              |

`G` is exposed as a control, so "one world unit" only means something relative to the current
experiment. Energy readouts are exact for the model and are most useful for watching
conservation and drift.

## Layout

```
src/
  physics/    engine, presets, constants, units (pure, no React)
  sim/        SimulationStore: animation loop, subscriptions, trails
  render/     Skia canvas, theme, colour helpers
  storage/    AsyncStorage persistence + validation, saved-labs context
  ui/         screens (Simulation, Experiments, Inspector, Telemetry, Stored),
              components, navigation
```

The store owns simulation state and runs the animation loop outside React. The canvas
subscribes to a per-frame tick; every other screen subscribes to a throttled (~10 Hz)
telemetry snapshot. That keeps physics off the React reconciliation path for the whole UI.

## Known limitations

- The Solar System preset is a stylised approximation, not an ephemeris.
- Collisions are not modelled — bodies pass through one another, with softening preventing
  the numerical singularity. Very close, fast encounters can still lose energy accuracy.
- Single-step advances exactly one fixed timestep (1/240 s) and pauses playback.
- Saving captures current body state as the lab's state; `RESET` restores the last loaded
  preset/lab or the last "Set as initial" capture.
