# IncrementalF1

A browser incremental game about running a Formula 1 team. Drive laps by hand,
hire mechanics, and watch the prize money tick up while you are away.

Status: **M0 scaffold**. One generator, a ticking counter, local autosave.
See [PLAN.md](./PLAN.md) for the full design and roadmap.

## Run it

Requires Node 22 and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev        # http://localhost:5173
```

## Scripts

| Script           | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Dev server with hot reload                   |
| `pnpm build`     | Typecheck and build to `dist/`               |
| `pnpm preview`   | Serve the production build locally           |
| `pnpm test`      | Engine and utility unit tests (Vitest)       |
| `pnpm test:e2e`  | Browser smoke test (Playwright)              |
| `pnpm lint`      | ESLint, including the engine isolation rule  |
| `pnpm format`    | Prettier write (`format:check` in CI)        |
| `pnpm typecheck` | `tsc` across app and config projects         |
| `pnpm check`     | Lint, format check, typecheck and unit tests |

## Layout

```
src/
  engine/     pure simulation: state, formulas, actions, tick, save format.
              No React, no DOM, no store (enforced by ESLint).
  store/      Zustand store bridging engine and UI
  services/   game loop (requestAnimationFrame, fixed step) and localStorage autosave
  ui/         React components
  util/       number formatting
e2e/          Playwright tests
```

## Save data

Progress is stored in `localStorage` under `incf1:save` as versioned JSON.
Money is serialised as a string so values beyond `Number.MAX_VALUE` survive.
