import { RACE_UNLOCK_LAPS } from '@/engine/data/races';
import { STRINGS, racesHint } from '@/engine/data/strings';
import { lapsToRaces } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';

/**
 * The one thing on screen that looks past the backyard. It stays hidden until
 * race craft is bought — that upgrade is the last thing the yard has to teach,
 * so owning it is what earns the player a look at what comes next — and then
 * counts laps down to the gate.
 */
export function RacesPanel() {
  const owned = useGameStore((s) => s.state.upgrades.raceCraft);
  const totalLaps = useGameStore((s) => s.state.totalLaps);
  if (owned === 0) return null;

  const remaining = lapsToRaces(totalLaps);

  return (
    <section
      aria-labelledby="races-heading"
      data-testid="races-panel"
      className="border-sector-yellow bg-panel mt-6 border-l-4 px-4 py-3"
    >
      <h2
        id="races-heading"
        className="font-display text-sm leading-none font-semibold tracking-[0.12em] uppercase"
      >
        {STRINGS.RACES}
      </h2>
      <p className="text-ink-muted mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span data-testid="races-hint">{racesHint(remaining)}</span>
        <span className="text-ink-muted tabular-nums whitespace-nowrap">
          <span className="text-ink" data-testid="races-laps">
            {totalLaps}
          </span>{' '}
          / {RACE_UNLOCK_LAPS} laps
        </span>
      </p>
    </section>
  );
}
