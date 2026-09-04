# IncrementalF1

A browser incremental game about riding from a bicycle in the backyard to a
Formula 1 team. Tap the pedals to cover distance; every completed lap pays.
Buy upgrades that pedal for you and make each lap worth more.

Status: **M1**. Backyard loop (30 m, one metre per tap), a visual track map,
two repeatable upgrades, offline progress, local autosave.
See [PLAN.md](./PLAN.md) for the full design and roadmap.

## Run it

Requires **Node 22** (see `.nvmrc`) and **pnpm**. If you do not have pnpm, the
version this repo expects comes from Node itself:

```sh
corepack enable          # one-off; installs the pnpm pinned in package.json
```

Then:

```sh
pnpm install
pnpm dev                 # http://localhost:5173
```

The dev server has hot reload: save a file and the browser updates. Game state
lives in `localStorage`, so it survives reloads — use **Reset save** in the
footer, or clear site data, to start fresh.

### In Cursor / VS Code

The repo ships with a `.vscode/` folder, so everything is already wired up:

- **Run the game** — press `F5`. This starts the dev server and opens a browser
  with debugging attached, so breakpoints in `src/` work.
  (`Run and Debug` panel → _Run the game_.)
- **Dev server only** — `Cmd/Ctrl+Shift+B` runs the `dev server` task, then
  `Cmd/Ctrl+click` the `http://localhost:5173` link in the terminal.
- **Tests** — `Cmd/Ctrl+Shift+P` → _Tasks: Run Task_ → `test (watch)` for
  Vitest in watch mode, or `check (...)` for the full gate.

On first open, Cursor offers the recommended extensions (ESLint, Prettier,
Tailwind IntelliSense, Vitest, Playwright) — accepting them gives you
format-on-save and lint fixes on save, matching what CI enforces.

Port 5173 is pinned (`strictPort`), so if something else is using it the server
fails loudly instead of quietly moving to another port.

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
    data/     tracks, upgrades and player-facing strings — balance lives here
    save/     save format, validation and version migrations
  store/      Zustand store bridging engine and UI
  services/   game loop (requestAnimationFrame, fixed step) and localStorage autosave
  ui/         React components, including the SVG track map
  util/       number formatting, track geometry
e2e/          Playwright tests
.vscode/      editor tasks, launch config and recommended extensions
```

## Branches

| Branch      | Role                                                        |
| ----------- | ----------------------------------------------------------- |
| `main`      | Release branch. Always deployable; production deploys here. |
| `develop`   | Integration branch. Day-to-day work lands here first.       |
| `feature/*` | One branch per change, opened as a PR against `develop`.    |

Workflow: branch off `develop` → PR into `develop` → CI must be green →
merge. When `develop` is stable, open a PR from `develop` into `main` to cut a
release. CI runs on every PR and on pushes to `main` and `develop`.

While the game is still early, day-to-day work commits straight to `develop`
instead of opening a PR per change. CI still runs on every push to it.

## Save data

Progress is stored in `localStorage` under `incf1:save` as versioned JSON
(currently version 2). Money is serialised as a string so values beyond
`Number.MAX_VALUE` survive. Older saves are upgraded on load by
`src/engine/save/migrate.ts`; anything unrecognised is refused rather than
partially loaded, so a bad save is never written over a good one.
