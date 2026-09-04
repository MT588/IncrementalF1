# IncrementalF1 — Project Plan

A browser-based incremental (idle) game about driving your way from a go-kart in
the backyard to a Formula 1 team. You start in a kart pottering at 2.4 km/h
round a ten-metre loop, with nothing to press: **XP only arrives when you
complete a lap**. XP buys upgrades that make the kart faster and each lap worth
more, then longer tracks, bigger engines and eventually a single-seater. Prize
money is a second currency, paid for finishing races rather than for distance.
At the end of a "season" you can reset for permanent bonuses (prestige) and
climb the constructors' ladder.

Karting is where every F1 driver actually starts, which is why the game does
too: a kart is already a racing machine, so racing against an AI field can open
while the player is still in the backyard rather than waiting on a "real car".

This document is the full plan: game design, technology choices, architecture,
save/state storage per user, hosting, and a milestone roadmap.

---

## 1. Game design

### 1.1 Core loop

```
kart rolls at m/s  →  distance covers a lap  →  lap completes → earns XP →  buy upgrades
    ↑                                                                          │
    └──────────────── upgrades: more m/s, more XP per lap ─────────────────────┘
                 occasionally: end season, prestige, restart stronger
```

The important rule: **there is no manual action.** The kart drives itself from
the first second, at `BASE_SPEED_MPS` before a single upgrade; the only thing
the player does is decide what a lap's XP is spent on. Distance past the line
carries into the next lap, so no metre is ever thrown away, and an idle tab and
an attentive one earn exactly the same.

Nothing is clicked because nothing should have to be. An incremental game whose
opening move is thirty clicks asks for attention it has not earned yet, and the
upgrades that then exist to make clicking better — bigger gears, an auto-clicker
— are a ladder built on top of a chore. Starting the kart already rolling cuts
all of that and leaves the real decision: which upgrade next.

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
what lets a race be worth something no amount of driving can buy.

### 1.3 Tracks and upgrades

A **track** is a distance and an XP rate. The backyard loop is 10 m at 1/10 XP a
metre, so a lap pays exactly 1 XP; adding one is a data row, not code. Pricing a
lap at 1 XP is what lets every cost in the shed be read as a count of laps, and
at the kart's starting 2.4 km/h ten metres is fifteen seconds — one lap, one XP,
and the shed's first purchase.

**A lap always pays a whole number of XP.** `xpPerLap` rounds the multiplied
payout up, because the game shows no fractions anywhere: left alone, a ×1.5 on
a 1 XP lap would pay 1.5 and read as the same 1 XP it paid before, so a bought
upgrade would look like it did nothing. Ceiling gives 1, 2, 3, 4, 6, 8, 12 —
the 1.5 curve underneath, with every level landing somewhere visible.

Because a lap is worth the metres it takes to drive it, XP _per second_ works out
to `m/s × xpPerMetre` — the lap distance cancels. A longer track therefore pays
the same per second as a short one, just in larger and rarer chunks, which feels
worse rather than better. **Later tracks have to raise `xpPerMetre` to be a
promotion**; length alone is not a progression lever.

Every **upgrade** is repeatable — cost grows per level, the effect stacks:

```
cost(n) = max(round(baseCost × growth^n), baseCost + n)   growth ≈ 1.07–2.2
effect:   { kind: 'speed',     perLevel }   +km/h on the kart's speed
          { kind: 'xpFlat',    perLevel }   +XP on every completed lap
          { kind: 'xpMult',    perLevel }   ×XP per completed lap
          { kind: 'speedMult', perLevel }   ×the whole speed, base included
```

Four kinds in two pairs — one additive and one multiplicative for each of speed
and payout — and every one of them is legible on the two numbers under the
track: how fast the kart is going, and what a lap pays.

**Speed is expressed in km/h**, in the data and on screen, and turned into metres
per second only where the simulation needs them. A kart is a vehicle: 2.4 km/h is
a recognisable potter and 42 km/h is a recognisable kart, where 0.67 m/s is a
number nobody has an instinct for.

**Growth belongs to the payout, not to the speed.** Speed reads on screen, so it
has to stay believable for a machine in a garden; a lap's worth has no such
ceiling. The speed upgrades are therefore modest and steeply priced, while the
tyres and race craft carry the exponential. Over the ten minutes to the race
unlock the kart goes 2.4 → 42 km/h, which is a real karting progression, while a
lap goes from 1 XP to about a hundred.

**A price is a whole number of XP too**, and no two rungs are ever the same
price. Rounding the curve alone would not manage that: a shallow growth on a
small base steps by less than an XP at first — the throttle's 1.45 on a base of 1
goes 1, 1.45, 2.1, 3.05 — and would quote 1, 1, 2, 3. Hence the `baseCost + n`
floor: every level costs at least one XP more than the one below it. It bites
only while the curve is flatter than an XP a level, and the geometric term
overtakes it once and never falls back, so the two are one rising ladder.

```
  throttle       1, 2, 3, 4, 5, 6, 9, 13, 20, 28, 41, 60
  racing tyres   3, 4, 5, 7, 10, 13, 18, 25, 33, 45, 60, 81
  bigger engine  10, 19, 36, 69, 130, 248, 470, 894
  slipstream     25, 75, 225, 675, 2025, 6075
  race craft     50, 110, 242, 532, 1171, 2577
```

Upgrades are also **revealed by laps driven**, not all at once: each one carries
an `unlockAtLaps` and stays out of the shed until the kart has driven that
far. The gate is a reveal rather than a block — it is set to land shortly before
the upgrade is affordable, so the player meets one new thing at a time instead
of a wall of five. Gating on laps rather than on an XP balance ties the reveal
to something they did.

Ladder (early → late), with the lap each one appears at:

1. **Throttle** – +0.5 km/h. The first upgrade, and the cheapest. _0 laps, M1.7_
2. **Racing tyres** – +1 XP on every finished lap. _3 laps, M1.8_
3. **Bigger engine** – +2 km/h, a proper step rather than a nudge. _8 laps, M1.7_
4. **Slipstream** – multiplies the whole speed, base included. _15 laps, M1.7_
5. **Race craft** – ×1.5 XP a lap, and it puts races on the board. _20 laps, M1.8_
6. **Longer tracks** – the car park, the local kart circuit.
7. **Bigger engine classes, then a junior single-seater** – large jumps in speed
   and payout.
8. **Mechanic / test driver** – staff who drive laps for you.
9. **Wind tunnel, simulator** – produce RP.
10. **Second car** – doubles everything, very expensive.
11. **Factory** – global multiplier, late game.

### 1.4 Races and seasons

Races are specified in a plan of their own; what matters here is that a kart is
already a racing machine, so they are meant to open **during the backyard era**
rather than waiting on a car.

**Races unlock at 250 laps driven** (`RACE_UNLOCK_LAPS`), which greedy play
reaches in about ten minutes. Buying **race craft** — the last upgrade the yard
has to teach — reveals a panel under the shed that counts those laps down, so
the goal is on screen well before it is reachable, and it is a lap count rather
than a price because it should be something the player drove to, not bought.

- A **race** is a timed event (e.g. every 5 minutes of real time, or when a lap
  counter hits a target). Your lap speed vs. an AI field of bots determines
  finishing position → payout + reputation.
- A **season** is 20 races. Finishing a season lets you **prestige**: reset
  XP, upgrades, and RP, but keep Championship points which buy permanent
  boosts (starting cash, +% output, unlock automation).
- Prestige is the retention hook. First prestige should be reachable in
  ~30–60 minutes of active play.

### 1.5 Progression pacing (targets)

| Milestone                       | Target time   |
| ------------------------------- | ------------- |
| First lap (10 m at 2.4 km/h)    | 15 seconds    |
| First upgrade (throttle)        | on that lap   |
| Race craft, and the races panel | ~6 minutes    |
| Races unlocked (250 laps)       | ~10 minutes   |
| Second track unlocked           | ~5 minutes    |
| First race                      | ~5 minutes    |
| First prestige                  | 30–60 minutes |
| Automation unlocked (auto-buy)  | 2nd prestige  |
| "Endgame" content               | 20+ hours     |

### 1.6 Offline progress

The kart never stops, so this is the same code path as being watched.
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
buyUpgrade(state, upgradeId, amount): GameState           // the only player action
prestige(state): GameState
```

Live ticks and offline catch-up both go through `addDistance`, so a watched tab
and a closed one can never drift apart or pay differently.

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
  { id: 'backyard', name: 'Backyard loop', lapDistanceM: 10, xpPerMetre: 1 / 10 },
  // a longer track is one more row
];

export const UPGRADES: UpgradeDef[] = [
  // unlockAtLaps hides an upgrade until that many laps have been completed.
  {
    id: 'throttle',
    baseCost: 1,
    growth: 1.3,
    unlockAtLaps: 0,
    effect: { kind: 'speed', perLevel: 0.5 },
  },
  {
    id: 'racingTyres',
    baseCost: 5,
    growth: 1.6,
    unlockAtLaps: 3,
    effect: { kind: 'xpMult', perLevel: 1.5 },
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
  (Historical: the circle, the arc and the dot were all replaced when the
  backyard was actually drawn — see M1.6.5 below.)
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

### M1.6.5 — The backyard, actually drawn — done

Status: shipped. The track map stopped being a diagram of a lap and became a
picture of the yard it happens in: mown lawn, flowers at the edges, a shed
standing in the infield, and a red bike going round it with nobody on it.

- The lap is a **stadium** — two straights joined by semicircular ends —
  rather than a circle, so `util/pointOnCircle.ts` gave way to
  `util/stadium.ts`. Still pure maths rather than `getPointAtLength`, so the
  map needs no DOM, but the shape now has to be walked by **arc length**: at
  even fractions of a lap the rider covers even ground, bends included, which
  a plain angle sweep would not give.
- `pointOnStadium` returns which way the rider is travelling alongside where
  it is, so the two can never disagree. The bike turns to face the other way
  at the widest point of each bend rather than snapping round when the next
  straight begins.
- The green progress arc is gone. Nothing marks the lap on the track but the
  bike itself and the chalk at the start line; the metres in the footer carry
  the rest. If that turns out to be too little to read at a glance, the
  alternative already drawn is a dust trail — the ground covered this lap
  churned lighter — rather than the arc coming back.
- Scenery lives in `ui/BackyardScene.tsx` with its own palette of greens and
  browns, deliberately **not** theme tokens: the yard is not pit-wall chrome,
  and the next track along brings its own. `ui/backyardLayout.ts` holds the
  view box and the track's measurements, `ui/Bicycle.tsx` the bike.
- Four directions were drawn and narrowed to this one over two rounds; the
  sources are under `.design/backyard-track/`.
- 85 Vitest unit tests, 7 Playwright e2e tests.

### M1.6.6 — XP priced in laps — done

Status: shipped. The economy was thirty times too loud for a garden: a lap
paid 30 XP and the first upgrade cost 25, which made every number a big one
before the player had done anything. **A lap now pays 1 XP and bigger gears
costs 1 XP**, so the opening move is still "finish one lap, buy the thing" —
with prices you can read.

- `xpPerMetre` on the backyard loop is `1 / 30`, chosen so 30 m comes out at
  exactly 1 XP. Every cost in the shed divided by the same 30 — 1, 3, 5, 30,
  80 — so **nothing changed in laps**: the pacing of the whole ladder is
  untouched, only the units are.
- A cost is now readable as a count of laps, which is the unit the player
  actually feels. The follow-on for later tracks is unchanged: a longer lap is
  not a promotion by itself, `xpPerMetre` still has to go up.
- Save v4 with `migrateV3toV4`, dividing an old XP balance by 30 so a returning
  save is worth the same laps it was worth before. A v1 save now walks all
  three steps: money ×6, then ÷30.
- 86 Vitest unit tests, 7 Playwright e2e tests.

### M1.6.7 — The track is the button — done

Status: shipped. The PEDAL button is gone. **The yard itself is what you
click**: one click anywhere on the drawn track covers `metresPerClick` metres,
which puts the action on the thing it acts on instead of on a slab underneath
it.

- `ui/PedalButton.tsx` was deleted. `ui/TrackMap.tsx` wraps the scene in a
  real `<button>` — so keyboard focus, Enter/Space and screen readers all work
  as they did — labelled "Click the track to ride". `select-none` and
  `touch-manipulation` keep fast repeated clicking from selecting the artwork
  or waiting on a double-tap-to-zoom gesture.
- The two readouts the button carried moved into a second row under the map:
  what one click is worth now (`+1 m per click`) and the lifetime metres you
  covered yourself.
- **"Tap" is now "click" everywhere**, in the code as well as on screen:
  `pedal()` → `click()`, `metresPerTap` → `metresPerClick`,
  `BASE_TAP_METRES` → `BASE_CLICK_METRES`, the effect kinds `tapMetres` and
  `autoTaps` → `clickMetres` and `autoClicks`, and `totalTapsM` →
  `totalClicksM`. The bicycle flavour text still talks about pedals, because
  that is what the bike does with the metres.
- Save v5 with `migrateV4toV5`, which renames the one stored field. A v4 save
  missing it is refused rather than silently restarted at zero.
- 87 Vitest unit tests, 7 Playwright e2e tests.

### M1.6.8 — Six o'clock — done

Status: shipped. The yard moved from flat midday to **late afternoon**, from
design direction `2a` of a second round of four. The read now comes from light
and cast shadows rather than from markings on the ground.

- A single flat wedge of shade across the lawn gives the light a direction —
  a low sun off the upper right — and the shed throws a long shadow down-left
  to match. The lawn and the shed run warmer, and the window is lit from
  inside.
- **The light-brown dust pass on the lap is gone**: the dirt loop is one flat
  tone, two strokes instead of three. The 14 flower clumps went with it — pale
  petals against the warmer lawn read as speckle rather than planting.
- The bike was upgraded to match: brighter frame, a cream stripe on the top
  tube, chrome rims with two crossed spokes a wheel, and a longer shadow
  thrown ahead of it.
- Scenery only. No geometry, no view box, no engine, no save change — the
  stadium maths and every `data-testid` are untouched, and the design handoff
  said as much. `pnpm check` and the e2e suite passed without an edit.

### M1.6.9 — One motion, not a hop — done

Status: shipped. The bike used to teleport: a click adds a whole metre, a
twelfth of the yard, and the simulation only moves ten times a second anyway,
so every click read as a skip ahead. **The drawn bike now rides an eased
distance** and covers that metre in one motion.

- `util/smoothing.ts` is the whole of it: one pure `approach()` step of
  exponential smoothing, framerate-independent (`1 - e^(-dt/tau)`), so the
  glide looks the same at 30 fps as at 144. `ui/useGlide.ts` runs it once per
  animation frame; the simulation is untouched and stays the truth, this is
  only how the truth is arrived at on screen.
- What is eased is **lifetime metres**, not metres into the lap: easing a value
  that resets at the line would drag the bike backwards across the yard on
  every rollover, which is the same trap the "no CSS transition" comment in
  `TrackMap.tsx` has always warned about.
- Two escapes from the easing, both in `approach()`: a target behind the drawn
  position (a reset or a reload) and a gap bigger than a lap (offline
  catch-up) are jumped rather than ridden out. It settles exactly on the
  target and then stops setting state, so an idle backyard re-renders nothing.
- **The wheels turn with the ground they cover** — the rolling relation off
  the wheel radius rather than a loop on a timer, so they can never spin at a
  speed the bike is not travelling at. `BackyardScene` is memoised, since the
  bike now redraws at frame rate and the yard behind it never changes.
- 94 Vitest unit tests, 7 Playwright e2e tests.

### M1.6.10 — Whole numbers, and a growth signal you can read — done

Status: shipped. Pricing a lap at 1 XP made the numbers small, but it also put
everything interesting into the decimals: a lap paid 1.5 XP with tyres on, gears
cost 3.61, and the header sat at `+0.02/s` for the whole early game. **Nothing
the game shows is a fraction any more.** The simulation still carries them —
`bulkCost` and the cost curve are untouched — only the screen refuses them.

- `util/formatNumber.ts` renders whole numbers: grouped digits up to a million
  (`1,303`), the letter suffixes above it. It rounds to the **nearest**, which
  is exact for every amount in the game and is also the only safe direction: a
  Decimal holds a mantissa and an exponent and reconstructs 848,430 as
  `848429.9999999999`, so flooring would quote a price an XP under the one the
  buy button charges.
- `costOf` quotes prices on **whole, never-repeating rungs**:
  `max(round(baseCost × growth^level), baseCost + level)`. Rounding alone was
  not enough — auto-pedal's 1.15 growth on a base of 3 steps by less than an XP
  for its first several levels, so consecutive rungs rounded to the same price
  and the ladder read as stuck. The `baseCost + level` floor carries it until
  the curve is steep enough to take over, which it does once and for good. No
  base cost or growth factor changed; auto-pedal now reads 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 16, 18, 21. `bulkCost` sums the rungs rather than the
  closed-form series, since the rungs are what is actually charged.
- `xpPerLap` now rounds **up** to a whole XP. This is the growth signal itself:
  a ×1.5 on a 1 XP lap pays 1.5, which reads as the same 1 XP it paid before,
  so the first level of racing tyres looked like it did nothing. The payout
  ladder is now 1, 2, 3, 4, 6, 8, 12 — the 1.5 curve underneath, rounded once at
  the end rather than compounded, and every level lands somewhere visible.
- The header counts **per minute**, `xpPerMinute`. Per second the first level of
  auto-pedal earns 0.0167 XP, which is `+0/s` on a whole-number readout; per
  minute it is `+1/min` from the moment it is bought.
- `effectNow` drops trailing zeros from a multiplier: `×1`, `×1.5`, `×2.25`. A
  factor is not an amount, so `×1.5` stays — rounding it would misstate what
  the upgrade does — but `×1.00` had no reason to sit next to a whole balance.
- No save change: the balance's units did not move, so v5 still loads as v5.
- 100 Vitest unit tests, 7 Playwright e2e tests.

### M1.7 — A kart, not a bicycle, and nothing to click — done

Status: shipped. Two changes that only make sense together: the bicycle became a
**go-kart**, and the click that drove it was **deleted outright**.

The theme is the reason for the first. Karting is where every F1 driver starts,
so a kart is on the way to the grid in a way a bicycle never was — and because a
kart is already a racing machine, races against an AI field can open while the
player is still in the backyard, instead of waiting on the "moped, then a car"
the old ladder needed first.

The second is the reason the first was worth doing now. The bike existed to be
pedalled, and two of its five upgrades — bigger gears and the training partner —
existed only to make pedalling better. **The kart drives itself at 1 m/s from the
moment the page loads**, so all of that went:

- `click()`, `metresPerClick`, `BASE_CLICK_METRES`, `totalClicksM` and the effect
  kinds `clickMetres` and `autoClicks` are gone. `autoSpeedMps` became `speedMps`
  and starts at `BASE_SPEED_MPS` rather than at zero, so there is no state in
  which the game is not moving. `buyUpgrade` is the only player action left.
- **The backyard loop is 10 m**, at 1/10 XP a metre, so a lap is still worth
  exactly 1 XP and every price still reads as a count of laps — but the first lap
  now lands ten seconds in rather than thirty clicks in, and the throttle is
  affordable the moment it does.
- The shed is **four rows**: throttle (+0.5 m/s, 1 XP, 0 laps), racing tyres
  (×1.5 a lap, 5 XP, 3 laps), bigger engine (+2 m/s, 12 XP, 8 laps) and
  slipstream (×1.2 speed, 30 XP, 15 laps). Additive first, multiplier after, so
  the engine makes every later slipstream level worth more. That is a purchase
  every ten to twenty seconds for the first two minutes.
- The track panel is no longer a button. Its third row was the click hint and the
  metres you covered yourself; it now reads **Speed**, which is the number the
  two speed upgrades move and the only one the player could otherwise not see.
- `ui/Bicycle.tsx` became `ui/Kart.tsx` — a floor pan, a nose cone, a seat and a
  roll hoop, deliberately as plain as the bike was. The wheels still turn against
  the ground they cover rather than on a timer, and the glide still eases the
  drawn distance; it now smooths the ten-a-second tick steps rather than clicks.
- Save v6 with `migrateV5toV6`: auto-pedal becomes the throttle (both +0.5 m/s),
  the tyres are renamed, slipstream carries as it is, and bigger gears and the
  training partner are dropped the way v1's mechanics were. A v4 save missing its
  tap counter is now **accepted** rather than refused — the field it was missing
  no longer exists.
- 91 Vitest unit tests, 6 Playwright e2e tests. The e2e suite seeds a save
  through `localStorage` instead of clicking laps out in real time.

### M1.8 — Growth moves to the payout, and races get a signpost — done

Status: shipped. M1.7's economy grew mostly through **speed**, and speed is the
one number on screen that has to stay believable: a greedy player had the
backyard kart doing 180 km/h inside half an hour. The exponential moved onto
**what a lap is worth**, which has no such ceiling.

- **Speed is km/h**, in the data and on screen. `speedKph` is the readout and the
  unit every speed upgrade is written in; `speedMps` is a thin divide by 3.6 for
  the simulation. 2.4 km/h is a recognisable potter where 0.67 m/s is nothing.
- **The kart starts at 2.4 km/h**, so a lap of the yard takes fifteen seconds
  rather than ten, and the speed upgrades are modest and steeply priced. The arc
  to the race unlock runs 2.4 → 42 km/h, which is a real karting progression.
- **Racing tyres pay flat**, +1 XP a lap per level, through a new `xpFlat` effect
  kind. They are bought when a lap pays 1 XP, and a ×1.5 there is worth half an
  XP that the ceiling rounds away; +1 is the payout over again and lands visibly.
- **Race craft** (×1.5 XP a lap, 50 XP, 20 laps) is slipstream's opposite number
  and carries the late growth. `xpPerLap` became
  `ceil((1 + Σ xpFlat) × Π xpMult)` — the same additive-then-multiply shape
  `speedKph` already had, so tyres make every level of race craft worth more.
- **Races unlock at 250 laps** (`engine/data/races.ts`), about ten minutes in.
  Buying race craft reveals `ui/RacesPanel.tsx` under the shed, counting the laps
  down. It says outright that races are still coming, because they are.
- No save change: `raceCraft` is a new id that `fromSave` already reads as nought
  when absent, and nothing stored needed converting. Still v6.
- 102 Vitest unit tests, 8 Playwright e2e tests.

### M1.9 — The rest of the ladder (next)

- More tracks (the car park, the local kart circuit).
- Export/import save string, settings, number-notation option.
- Offline-progress notice tuned for lap counts rather than an XP total.

### M1.10 — First prestige (completes the MVP)

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

- Race simulation vs an AI field of bots, reputation, sponsors. Specified in a
  plan of its own; the kart is meant to be racing well before it is replaced.
- Season of 20 races, which becomes the prestige trigger in place of the
  simpler M1.10 condition; Championship points shop.
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
