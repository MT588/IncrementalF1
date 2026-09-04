# IncrementalF1 — Project Plan

A browser-based incremental (idle) game about riding your way from a bicycle in
the backyard to a Formula 1 team. You start on a bike, tapping out one metre at
a time round a thirty-metre loop; **XP only arrives when you complete a lap**.
XP buys upgrades that pedal for you and make each lap pay more, then longer
tracks, faster machines and eventually a real car. Prize money is a second
currency, paid for finishing races rather than for distance. At the end of a
"season" you can reset for permanent bonuses (prestige) and climb the
constructors' ladder.

This document is the full plan: game design, technology choices, architecture,
save/state storage per user, hosting, and a milestone roadmap.

---

## 1. Game design

### 1.1 Core loop

```
tap (+1 m)  →  distance covers a lap  →  lap completes → earns XP →  buy upgrades
    ↑                    ↑                                                   │
    │        auto-pedal adds m/s on its own                                  │
    └──────────────── upgrades: more m/s, more XP per lap ───────────────────┘
                 occasionally: end season, prestige, restart stronger
```

The important rule: **a tap is distance, not XP.** Taps move the bike; only
crossing the finish line pays. Distance past the line carries into the next lap,
so nothing a player does is ever wasted.

### 1.2 Resources

| Resource         | Symbol | Earned by                           | Spent on                             |
| ---------------- | ------ | ----------------------------------- | ------------------------------------ |
| Experience       | XP     | Metres driven (paid out per lap)    | Every upgrade in the shed            |
| Prize money      | €      | Finishing races                     | Parts, staff, facilities             |
| Research points  | RP     | Wind tunnel, simulator (facilities) | Tech tree unlocks                    |
| Reputation       | ★      | Race results, podiums               | Sponsors (multipliers), driver hires |
| Championship pts | CP     | Prestige (season reset)             | Permanent upgrades                   |

XP is the distance currency and the only one that exists today; money is the
event currency and stays at zero until races arrive in M3. Keeping them apart is
what lets a race be worth something no amount of riding can buy.

### 1.3 Tracks and upgrades

A **track** is a distance and an XP rate. The backyard loop is 30 m at 1 XP a
metre, so a lap pays 30 XP; adding one is a data row, not code.

Because a lap is worth the metres it takes to ride it, XP _per second_ works out
to `m/s × xpPerMetre` — the lap distance cancels. A longer track therefore pays
the same per second as a short one, just in larger and rarer chunks, which feels
worse rather than better. **Later tracks have to raise `xpPerMetre` to be a
promotion**; length alone is not a progression lever.

Every **upgrade** is repeatable — cost grows per level, the effect stacks:

```
cost(n) = baseCost × growth^n                 growth ≈ 1.07–2.2
effect:   { kind: 'speed',     perLevel }     +m/s of automatic pedalling
          { kind: 'xpMult',    perLevel }     ×XP per completed lap
          { kind: 'tapMetres', perLevel }     +m per push of the pedals
          { kind: 'speedMult', perLevel }     ×the whole automatic speed
          { kind: 'autoTaps',  perLevel }     +taps/s, each worth metresPerTap
```

Upgrades are also **revealed by laps driven**, not all at once: each one carries
an `unlockAtLaps` and stays out of the shed until the player has ridden that
far. The gate is a reveal rather than a block — it is set to land shortly before
the upgrade is affordable, so the player meets one new thing at a time instead
of a wall of five. Gating on laps rather than on an XP balance ties the reveal
to something they did.

Ladder (early → late), with the lap each one appears at:

1. **Bigger gears** – more metres per push of the pedals. _0 laps, M1.5_
2. **Auto-pedal** – the bike keeps rolling on its own, slowly. _1 lap, M1_
3. **Racing tyres** – every finished lap pays more. _3 laps, M1_
4. **Slipstream** – multiplies the whole automatic speed. _10 laps, M1.5_
5. **Training partner** – pedals for you, with your gears on. _20 laps, M1.5_
6. **Longer tracks** – the park, the local circuit, a real track.
7. **A moped, then a car** – large jumps in m/s and payout.
8. **Mechanic / test driver** – staff who ride laps for you.
9. **Wind tunnel, simulator** – produce RP.
10. **Second car** – doubles everything, very expensive.
11. **Factory** – global multiplier, late game.

### 1.4 Races and seasons

- A **race** is a timed event (e.g. every 5 minutes of real time, or when a lap
  counter hits a target). Your lap speed vs. AI field determines finishing
  position → payout + reputation.
- A **season** is 20 races. Finishing a season lets you **prestige**: reset
  XP, upgrades, and RP, but keep Championship points which buy permanent
  boosts (starting cash, +% output, unlock automation).
- Prestige is the retention hook. First prestige should be reachable in
  ~30–60 minutes of active play.

### 1.5 Progression pacing (targets)

| Milestone                      | Target time   |
| ------------------------------ | ------------- |
| First lap (30 taps)            | < 10 seconds  |
| First upgrade (bigger gears)   | on that lap   |
| Second track unlocked          | ~5 minutes    |
| First race                     | ~5 minutes    |
| First prestige                 | 30–60 minutes |
| Automation unlocked (auto-buy) | 2nd prestige  |
| "Endgame" content              | 20+ hours     |

### 1.6 Offline progress

When the player comes back, the game simulates the elapsed time (capped, e.g.
8 hours, extendable via an upgrade). This is essential for an idle game.

### 1.7 Features by phase

- **MVP**: everything up to and including the first prestige — tracks, laps,
  XP, repeatable upgrades, offline progress, local save, export/import save
  string, and one prestige that resets progress and opens the next track.
- **v1**: races, seasons, reputation, sponsors, settings, PWA.
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
addDistance(state: GameState, metres: number): GameState  // the one core mutation
tick(state: GameState, dtSeconds: number): GameState      // = addDistance(state, m/s × dt)
pedal(state): GameState                                   // = addDistance(state, 1)
buyUpgrade(state, upgradeId, amount): GameState           // player actions
prestige(state): GameState
```

A tap and a second of auto-pedalling both go through `addDistance`, so manual
and idle play can never drift apart or pay differently.

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
export const TRACKS: TrackDef[] = [
  { id: 'backyard', name: 'Backyard loop', lapDistanceM: 30, xpPerMetre: 1 },
  // a longer track is one more row
];

export const UPGRADES: UpgradeDef[] = [
  // unlockAtLaps hides an upgrade until that many laps have been completed.
  {
    id: 'biggerGears',
    baseCost: 25,
    growth: 1.9,
    unlockAtLaps: 0,
    effect: { kind: 'tapMetres', perLevel: 1 },
  },
  {
    id: 'autoPedal',
    baseCost: 90,
    growth: 1.15,
    unlockAtLaps: 1,
    effect: { kind: 'speed', perLevel: 0.5 },
  },
];
```

`UpgradeEffect` is a discriminated union, so a new kind of effect is a new case
in `formulas.ts` and nothing else changes.

### 3.4 Folder structure

```
IncrementalF1/
├─ src/
│  ├─ engine/            # pure simulation, no React
│  │  ├─ state.ts        # GameState type + createInitialState()
│  │  ├─ tick.ts         # tick(state, dt)
│  │  ├─ actions.ts      # buy, prestige, etc.
│  │  ├─ formulas.ts     # cost/output math
│  │  ├─ data/           # tracks.ts, upgrades.ts, strings.ts, races.ts
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

- **Never** store derived values (e.g. XP/sec); recompute on load.
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
- Add a `?debug=1` panel in dev builds: add XP, fast-forward time,
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

### M1 — The backyard bicycle — done

Status: shipped. The M0 click-for-money loop was replaced by the real one.
(Historical: the single currency here was money at €5 a lap. M1.6 replaced it
with XP — see below.)

- Tap = 1 m; the backyard loop is 30 m and paid €5 — **money only on lap
  completion**, remainder carried into the next lap.
- Tracks are data (`data/tracks.ts`), so a longer track is a row, not code.
- Two repeatable upgrades (`data/upgrades.ts`): **Auto-pedal** (+0.5 m/s per
  level) and **Racing tyres** (×1.5 per lap per level).
- Visual track map: inline SVG circle with a progress arc and a dot for the
  bike, driven by pure `pointOnCircle` maths rather than DOM measurement.
- Save v2 with the first real `migrate.ts` (v1 money and laps carry over, the
  mechanics are dropped); `fromSave` is now genuinely throw-free.
- 50 Vitest unit tests, 4 Playwright e2e tests.

### M1.5 — More of the ladder — done

Status: shipped. Three upgrades on top of the M1 pair, each a new effect kind
in `UpgradeEffect` plus one branch in `formulas.ts`:

- **Bigger gears** (`tapMetres`, +1 m per level) — keeps the pedal button worth
  pressing once auto-pedal exists.
- **Slipstream** (`speedMult`, ×1.2 per level) — the multiplicative partner to
  auto-pedal's additive m/s, so going back for more levels stays worthwhile.
- **Training partner** (`autoTaps`, +0.5 taps/s per level) — taps for you at
  your current `metresPerTap`, which is what makes gears an idle upgrade too.

Order of operations: additive speed sources first (auto-pedal + the partner's
taps), then the multipliers on that total. `metresPerTap` feeds both a hand tap
and the partner, so the two can never drift apart.

### M1.6 — Two currencies, and one upgrade at a time — done

Status: shipped. The single `money` currency became **XP earned from distance**,
with money reserved for race payouts.

- `GameState.xp` is what every upgrade costs; `GameState.money` ships alongside
  it at zero, with no earner and no UI, so the two-currency shape is settled and
  there is one migration rather than two.
- `TrackDef.payoutPerLap` became `xpPerMetre` (backyard = 1), so a lap is worth
  the metres it takes to ride it: 30 XP. The `'payout'` effect kind became
  `'xpMult'`.
- Costs rescaled ×6 to match the 5 → 30 income change, **except auto-pedal**,
  cut to 25 so the first upgrade lands on the first completed lap (~8 s) instead
  of the second (~15 s). The others keep their old pacing in laps: 3, 5, 20, 80.
- Save v3 with `migrateV2toV3`, converting an old money balance at the same ×6.
  The multiply forced a shared `save/amount.ts` parser: `migrate()` runs before
  any field validation, and `new Decimal('abc')` throws, so the conversion has
  to fail as a null return to keep `fromSave` throw-free.

Then the early game was reshaped so the player meets one thing at a time:

- **Bigger gears is now the first upgrade** (25 XP, affordable on the first
  completed lap) and **auto-pedal is second** (90 XP, three laps). Gears first
  is the better opening move: it is immediate and tactile, and it makes the
  next lap arrive twice as fast.
- Every upgrade carries an `unlockAtLaps` and is hidden until then — 0, 1, 3,
  10, 20 — so an empty backyard shows exactly one row. `buyUpgrade` enforces the
  gate too, not just the UI, so a locked upgrade cannot be bought at any price.
- A muted line under the shed names the lap the next upgrade opens at.
- The shed reads as a price list, with each number in one place only: the row
  shows the name, the level and **what the upgrade is worth as it stands**
  ("3 m per tap"); the buy button shows the cost and **what one more level
  adds** ("+1 m", "×1.5 XP"), which is constant per level for additive and
  multiplicative effects alike; and only the flavour description waits behind a
  hover **ⓘ**. No "current → next" arrows anywhere. The icon is a real button,
  so keyboard focus and a tap reveal the tooltip too — hover alone would hide
  the text from every phone.
- 79 Vitest unit tests, 7 Playwright e2e tests.

### M1.7 — The rest of the ladder (next)

- More tracks (the park, the local circuit).
- Export/import save string, settings, number-notation option.
- Offline-progress notice tuned for lap counts rather than an XP total.

### M1.8 — First prestige (completes the MVP)

- A prestige unlock condition that does not need races yet (total laps or a
  XP threshold — **open decision**).
- `prestige(state)`: reset XP and upgrade levels (and decide what it does to
  the race money balance), keep lifetime stats, award
  the permanent currency, unlock the next track.
- Save version bump plus migration for the new fields.

### M2 — First deploy (1 evening)

- Connect the repo to Cloudflare Pages; production deploy from `main`,
  preview URL per PR.
- Cloudflare Web Analytics, favicon, share the link with a few testers.
- From here on every merge to `main` ships automatically.

### M3 — Races and seasons (2–3 weeks)

- Race simulation vs AI field, reputation, sponsors.
- Season of 20 races, which becomes the prestige trigger in place of the
  simpler M1.7 condition; Championship points shop.
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
