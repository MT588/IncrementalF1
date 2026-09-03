# IncrementalF1 — Project Plan

A browser-based incremental (idle) game themed around running a Formula 1 team.
You start with a garage, a rusty car and one mechanic. Every lap you complete
earns prize money. Money buys car parts, engineers, and facilities that make
laps faster and worth more. At the end of a "season" you can reset for permanent
bonuses (prestige) and climb the constructors' ladder.

This document is the full plan: game design, technology choices, architecture,
save/state storage per user, hosting, and a milestone roadmap.

---

## 1. Game design

### 1.1 Core loop

```
lap completes  →  earns € (prize money)  →  buy upgrades  →  laps get faster / worth more
       ↑                                                                    │
       └────────────── occasionally: end season, prestige, restart stronger ┘
```

### 1.2 Resources

| Resource         | Symbol | Earned by                           | Spent on                             |
| ---------------- | ------ | ----------------------------------- | ------------------------------------ |
| Prize money      | €      | Completing laps / finishing races   | Parts, staff, facilities             |
| Research points  | RP     | Wind tunnel, simulator (facilities) | Tech tree unlocks                    |
| Reputation       | ★      | Race results, podiums               | Sponsors (multipliers), driver hires |
| Championship pts | CP     | Prestige (season reset)             | Permanent upgrades                   |

### 1.3 Generators (things that produce laps / money)

Each generator has a base output, a base cost, and a cost growth factor.
Standard incremental formula:

```
cost(n)   = baseCost × growth^n            growth ≈ 1.07–1.15
output(n) = baseOutput × n × multipliers
```

Tiers (early → late):

1. **Mechanic** – turns wrenches, small € per second.
2. **Test driver** – runs laps continuously.
3. **Engine upgrades** – multiplies lap speed.
4. **Aero package** – multiplies € per lap.
5. **Pit crew** – reduces "pit stop" downtime (idle penalty).
6. **Wind tunnel** – produces RP.
7. **Simulator** – produces RP and small lap bonus.
8. **Second car** – doubles everything, very expensive.
9. **Factory** – global multiplier, late game.

### 1.4 Races and seasons

- A **race** is a timed event (e.g. every 5 minutes of real time, or when a lap
  counter hits a target). Your lap speed vs. AI field determines finishing
  position → payout + reputation.
- A **season** is 20 races. Finishing a season lets you **prestige**: reset
  money, generators, and RP, but keep Championship points which buy permanent
  boosts (starting cash, +% output, unlock automation).
- Prestige is the retention hook. First prestige should be reachable in
  ~30–60 minutes of active play.

### 1.5 Progression pacing (targets)

| Milestone                        | Target time   |
| -------------------------------- | ------------- |
| First upgrade                    | < 30 seconds  |
| All tier-1..3 generators visible | ~5 minutes    |
| First race                       | ~5 minutes    |
| First prestige                   | 30–60 minutes |
| Automation unlocked (auto-buy)   | 2nd prestige  |
| "Endgame" content                | 20+ hours     |

### 1.6 Offline progress

When the player comes back, the game simulates the elapsed time (capped, e.g.
8 hours, extendable via an upgrade). This is essential for an idle game.

### 1.7 Features by phase

- **MVP**: generators, money, upgrades, offline progress, local save,
  export/import save string.
- **v1**: races, seasons, prestige, reputation, sponsors, settings, PWA.
- **v2**: accounts + cloud saves, multiple save slots, achievements,
  statistics screen, leaderboard (fastest to first prestige, etc.).
- **later**: events/limited-time challenges, driver market, cosmetic liveries.

---

## 2. Technology choices

### 2.1 Language: TypeScript (everywhere)

- One language for the game engine, UI, and any server code.
- Types make save-file migrations and balance data far safer.
- Enormous ecosystem, free hosting everywhere.

Rejected: plain JS (no type safety for a state-heavy game), Rust/WASM
(overkill — an incremental game is not compute-bound), Unity WebGL (huge
bundles, poor for a UI-driven game).

### 2.2 Frontend stack

| Concern           | Choice                      | Why                                                 |
| ----------------- | --------------------------- | --------------------------------------------------- |
| Build tool        | **Vite**                    | Fast, zero-config TS, static output                 |
| UI framework      | **React 19**                | Largest ecosystem; incremental games are UI-heavy   |
| Styling           | **Tailwind CSS**            | Fast iteration, tiny CSS, easy dark mode            |
| State (UI)        | **Zustand**                 | Minimal, works outside React (engine can update it) |
| Big numbers       | **break_infinity.js**       | Numbers exceed 1e308 quickly in incrementals        |
| Number formatting | own `formatNumber()`        | 1.23K / 4.5M / 1.2e15 / "aa" notation, user setting |
| Save compression  | **lz-string**               | Compact export strings (base64, URL-safe)           |
| Tests             | **Vitest** + **Playwright** | Unit tests for engine; smoke e2e for UI             |
| Lint/format       | **ESLint** + **Prettier**   |                                                     |
| Package manager   | **pnpm**                    |                                                     |

Alternative: Svelte 5 instead of React — smaller and arguably nicer for this
kind of app. Either is fine; React chosen for ecosystem and hiring familiarity.
No game engine (Phaser, PixiJS) is needed: the game is buttons, bars, and
numbers. Canvas can be added later for a small track animation.

### 2.3 Backend (phase v2 only)

**Supabase** (Postgres + Auth + Row Level Security + Edge Functions).

- Auth out of the box: email magic link, Google, Discord, GitHub.
- Postgres with RLS means the client can talk to the DB directly and users
  can only ever read/write their own save row — no custom API server needed.
- Generous free tier (500 MB DB, 50k monthly active users).
- Edge Functions (Deno/TypeScript) available if server-side validation or
  leaderboards are added.

Rejected: Firebase (fine, but NoSQL makes leaderboards/queries awkward and
pricing is less predictable), custom Node/Express + DB (more to run and
secure for no gain at this scale).

---

## 3. Architecture

### 3.1 Principle: the engine is pure and headless

The game simulation is a pure TypeScript module with **no DOM and no React**.
It exposes:

```ts
tick(state: GameState, dtSeconds: number): GameState   // advance simulation
buy(state, generatorId, amount): GameState              // player actions
prestige(state): GameState
```

Benefits:

- Unit-testable with Vitest (balance tests, "first prestige in N minutes").
- Offline catch-up is just `tick(state, elapsed)` in chunks.
- Could later run the same code in an Edge Function to validate saves for
  leaderboards.

### 3.2 Game loop

```
requestAnimationFrame  →  accumulate real dt
                       →  run fixed-step ticks (e.g. 10 ticks/s)
                       →  push new state to Zustand store
React re-renders only the components whose selectors changed.
```

- Fixed timestep keeps the simulation deterministic and framerate-independent.
- Use `document.visibilitychange` to pause the RAF loop; on resume, compute
  elapsed time and catch up (same path as offline progress).
- Cap catch-up per frame (e.g. simulate max 1 hour per frame in big chunks) so
  returning after a day doesn't freeze the tab.

### 3.3 Data-driven content

All generators, upgrades, and tech-tree nodes live in `src/engine/data/*.ts`
as typed objects, not in code branches. Balancing = editing data, not logic.

```ts
export const GENERATORS: GeneratorDef[] = [
  { id: 'mechanic', name: 'Mechanic', baseCost: 10, growth: 1.1, baseOutput: 0.5, unlockAt: 0 },
  {
    id: 'testDriver',
    name: 'Test driver',
    baseCost: 100,
    growth: 1.12,
    baseOutput: 4,
    unlockAt: 50,
  },
  // ...
];
```

### 3.4 Folder structure

```
IncrementalF1/
├─ src/
│  ├─ engine/            # pure simulation, no React
│  │  ├─ state.ts        # GameState type + createInitialState()
│  │  ├─ tick.ts         # tick(state, dt)
│  │  ├─ actions.ts      # buy, prestige, etc.
│  │  ├─ formulas.ts     # cost/output math
│  │  ├─ data/           # generators.ts, upgrades.ts, races.ts
│  │  └─ save/           # serialize, migrate (v1→v2→...), validate
│  ├─ store/             # Zustand store bridging engine ↔ UI
│  ├─ ui/                # React components, screens
│  ├─ services/          # localSave.ts, cloudSave.ts, auth.ts
│  ├─ util/              # formatNumber, time helpers
│  └─ main.tsx
├─ supabase/             # migrations/*.sql, functions/  (phase v2)
├─ tests/                # vitest + playwright
├─ public/               # icons, manifest.json (PWA)
├─ PLAN.md
└─ package.json
```

---

## 4. Storing state per user

This is the most important design decision for an incremental game: players
invest hours and losing a save is fatal to retention.

### 4.1 Save format

One JSON object, versioned:

```ts
interface SaveFile {
  version: number; // schema version, bump on breaking change
  createdAt: number; // ms epoch
  lastSavedAt: number; // ms epoch — used for offline progress
  playtimeSeconds: number; // used for conflict resolution
  state: GameState; // resources, generator counts, upgrades, prestige
  settings: Settings; // notation, theme, autosave interval
}
```

Rules:

- **Never** store derived values (e.g. €/sec); recompute on load.
- Every schema change ships with a migration `migrateV(n)→(n+1)`. Migrations
  run in sequence on load. Tested with fixture saves from each version.
- Validate after migration (zod or hand-written) and refuse to load
  corrupt saves _without overwriting the stored one_ — keep a backup slot.

### 4.2 Phase 1 — local only (MVP)

- `localStorage` key `incf1:save` holding the JSON (optionally lz-string
  compressed). Autosave every 30 s and on `visibilitychange`/`pagehide`.
- Keep `incf1:save:backup` = previous good save, rotated on each save.
- **Export/Import**: button copies a compressed base64 string to clipboard;
  import pastes it back. This is the poor man's cloud save and players expect it.
- localStorage limit is ~5 MB; a save is a few KB, so this is fine. If it
  ever grows, switch to IndexedDB (idb-keyval) with the same interface.

### 4.3 Phase 2 — accounts and cloud saves (Supabase)

**Auth**: Supabase Auth with magic link + Google. Anonymous sign-in is also
supported, so a player can start without an account and link it later
(their local save is uploaded on first login).

**Schema**:

```sql
create table public.saves (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  slot          smallint not null default 0,
  version       int not null,
  playtime_s    int not null,
  data          jsonb not null,            -- the SaveFile
  client_saved_at timestamptz not null,    -- from the client
  updated_at    timestamptz not null default now()
);
alter table public.saves enable row level security;

create policy "own saves" on public.saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Later: `primary key (user_id, slot)` for multiple slots; a `stats` table for
leaderboards, written only by an Edge Function that re-simulates the save.

**Sync strategy** (simple, robust):

1. Local save remains the source of truth while playing (instant, offline-safe).
2. Upload to Supabase every 5 minutes and on logout/tab hide.
3. On login/load, compare cloud vs local:
   - same `playtimeSeconds` → nothing to do;
   - cloud has more playtime → offer "Load cloud save?" (default yes);
   - local has more → upload local.
     Never silently overwrite the one with more playtime.
4. Handle multi-tab: a `BroadcastChannel` message tells other tabs a save
   happened; the loser reloads state instead of clobbering.

**Cheating**: it's a single-player game; a player editing their own save only
hurts themselves. Do not add anti-cheat until there is a leaderboard. When
there is, leaderboards accept only saves an Edge Function can re-simulate
from the start or that pass sanity bounds (rate limits + plausibility checks).

**Privacy/GDPR**: only store the save and the auth email. Provide "delete my
account" (Supabase `auth.admin.deleteUser` via Edge Function, cascade deletes
the save row).

---

## 5. Hosting

The game is a **static site**: HTML + JS + CSS. No server is needed for
phase 1; phase 2 talks to Supabase directly from the browser.

| Option               | Cost | Notes                                                            |
| -------------------- | ---- | ---------------------------------------------------------------- |
| **Cloudflare Pages** | Free | Unlimited bandwidth, global CDN, previews per PR. **Pick this.** |
| Vercel               | Free | Equally good; 100 GB/month bandwidth on hobby plan               |
| Netlify              | Free | Same class                                                       |
| GitHub Pages         | Free | Fine for MVP, no preview deploys, no headers control             |

Setup (done in M2, after the MVP is playable — until then the game runs
locally with `pnpm dev`):

- Connect the GitHub repo to Cloudflare Pages; build command `pnpm build`,
  output `dist/`. Every push to `main` deploys; every PR gets a preview URL.
- Custom domain optional (~€10/year). Cloudflare gives free TLS.
- **Backend**: Supabase free tier (upgrade to Pro at $25/month only if the
  free project pausing after 7 days inactivity becomes a problem).
- **PWA**: add `manifest.json` + service worker (vite-plugin-pwa) so it
  installs on phones and loads offline.
- **Analytics**: Cloudflare Web Analytics (free, cookieless) or Plausible.

Total running cost for a hobby project: **€0/month** (domain excluded).

### CI/CD (GitHub Actions)

- On PR: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`.
- Cloudflare Pages handles deploys itself; no deploy step in Actions.
- Supabase migrations: `supabase db push` from a manual workflow or CLI.

---

## 6. Balance & tuning workflow

- Keep a `balance.xlsx` / Google Sheet with the cost/output curves and a
  time-to-milestone simulation. Or better: a Vitest "simulation" test that
  plays optimally with a greedy buyer and asserts milestone timings
  (`expect(timeToFirstPrestige).toBeLessThan(60 * 60)`).
- Add a `?debug=1` panel in dev builds: add money, fast-forward time,
  reset save.
- Ship with a settings option for number notation (standard / scientific /
  engineering / letters).

---

## 7. Roadmap

### M0 — Scaffold (1 evening) — done

Status: shipped. Vite + React 19 + TS + Tailwind 4, pure engine with the
Mechanic generator, fixed-step loop, localStorage autosave, dark timing-screen
UI, 26 Vitest unit tests, Playwright smoke test, GitHub Actions CI.

- Vite + React + TS + Tailwind + Vitest + ESLint/Prettier, pnpm.
- GitHub Actions CI on PR (lint, typecheck, test, build). No deploy yet;
  the game runs locally with `pnpm dev` until the MVP is playable.
- `engine/` skeleton with `GameState`, `tick`, one generator, one test.

### M1 — Playable MVP (1–2 weeks)

- 5 generators, ~15 upgrades, money resource, cost/output formulas.
- Game loop with fixed timestep, offline progress.
- Local save with autosave, backup slot, export/import.
- Basic UI: resource header, generator list, upgrade list, settings.
- break_infinity numbers + formatting.

### M2 — First deploy (1 evening)

- Connect the repo to Cloudflare Pages; production deploy from `main`,
  preview URL per PR.
- Cloudflare Web Analytics, favicon, share the link with a few testers.
- From here on every merge to `main` ships automatically.

### M3 — Races, seasons, prestige (2–3 weeks)

- Race simulation vs AI field, reputation, sponsors.
- Season of 20 races → prestige → Championship points shop.
- Automation upgrades; achievements.
- Balance pass using simulation tests. PWA.

### M4 — Accounts and cloud saves (1–2 weeks)

- Supabase project, `saves` table + RLS, auth (magic link, Google, anonymous).
- Sync logic (playtime-based conflict resolution), multi-tab safety.
- Account deletion.

### M5 — Polish & community (ongoing)

- Statistics screen, changelog, sound toggles, track animation (canvas).
- Leaderboards via Edge Function validation.
- Events / limited-time challenges.

---

## 8. Open decisions

| Question                           | Default                                  | Decide by |
| ---------------------------------- | ---------------------------------------- | --------- |
| React vs Svelte                    | React                                    | M0        |
| Real-time races vs lap-count races | Lap-count (deterministic, works offline) | M3        |
| Anonymous accounts on by default   | Yes                                      | M4        |
| Leaderboards at all                | Only after M4, if players ask            | M5        |
| Monetisation                       | None (hobby); maybe donations            | —         |
