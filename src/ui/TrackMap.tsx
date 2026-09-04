import { getTrack } from '@/engine/data/tracks';
import { STRINGS, clickHint } from '@/engine/data/strings';
import { metresPerClick, xpPerLap } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { formatXp } from '@/util/formatNumber';
import { perimeter, pointOnStadium } from '@/util/stadium';
import type { Glide } from '@/util/smoothing';
import { BACKYARD_TRACK, VIEW_H, VIEW_W } from './backyardLayout';
import { BackyardScene } from './BackyardScene';
import { Bicycle } from './Bicycle';
import { useGlide } from './useGlide';

/**
 * Seconds for the drawn bike to close ~63% of the gap to where the simulation
 * says it is. Long enough that one click reads as a movement rather than a
 * hop, short enough that holding down clicks still feels immediate.
 */
const GLIDE_TAU = 0.14;

/** Within a centimetre of the truth is the truth, so the motion settles. */
const SETTLED_M = 0.01;

export function TrackMap() {
  const state = useGameStore((s) => s.state);
  const click = useGameStore((s) => s.click);
  const track = getTrack(state.trackId);
  const perClick = metresPerClick(state);

  // Lifetime metres rather than metres into the lap: a value that resets at the
  // line would drag the bike backwards across the yard on every rollover.
  const ridden = state.totalLaps * track.lapDistanceM + state.lapProgressM;
  const glide: Glide = { tau: GLIDE_TAU, snapAt: track.lapDistanceM, epsilon: SETTLED_M };
  const shownM = useGlide(ridden, glide);
  const rider = pointOnStadium(BACKYARD_TRACK, shownM / track.lapDistanceM);
  const rolled = shownM * (perimeter(BACKYARD_TRACK) / track.lapDistanceM);

  return (
    <section
      aria-labelledby="track-heading"
      data-testid="track-map"
      className="border-line bg-panel rounded-sm border"
    >
      <div className="border-line flex items-baseline justify-between border-b px-4 py-2">
        <h2
          id="track-heading"
          className="font-display text-lg leading-none font-semibold tracking-wide uppercase"
        >
          {track.name}
        </h2>
        <p className="text-ink-muted text-xs tabular-nums">
          {STRINGS.LAPS_DRIVEN} <span className="text-ink">{state.totalLaps}</span>
        </p>
      </div>

      {/* The yard itself is the button: clicking anywhere on it pedals once.
          `select-none` and `touch-manipulation` keep fast repeated clicking from
          selecting the scene or waiting on a double-tap-to-zoom gesture. */}
      <button
        type="button"
        onClick={click}
        aria-label={STRINGS.CLICK_TRACK}
        className="focus-visible:ring-ink block w-full cursor-pointer touch-manipulation select-none focus-visible:ring-2 focus-visible:outline-none active:translate-y-px"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block w-full"
          role="img"
          aria-label={`${track.name}: ${Math.floor(state.lapProgressM)} of ${track.lapDistanceM} metres into the lap`}
        >
          <BackyardScene />
          {/* The bike rides an eased distance rather than the simulated one, so a
              click glides the metre it earns instead of hopping it. Still no CSS
              transition: that animates the drawn position, which jumps the long
              way round the yard every time the lap counter rolls over. */}
          <Bicycle x={rider.x} y={rider.y} facing={rider.facing} rolled={rolled} />
        </svg>
      </button>

      <div className="border-line flex items-baseline justify-between border-t px-4 py-2 text-xs tabular-nums">
        <p data-testid="lap-progress">
          <span className="text-sector-green">{Math.floor(state.lapProgressM)}</span>
          <span className="text-ink-muted"> / {track.lapDistanceM} m</span>
        </p>
        <p className="text-ink-muted">
          {STRINGS.LAP_PAYS}{' '}
          <span className="text-ink" data-testid="lap-payout">
            {formatXp(xpPerLap(state))}
          </span>
        </p>
      </div>

      <div className="border-line flex items-baseline justify-between border-t px-4 py-2 text-xs tabular-nums">
        <p className="text-ink-muted" data-testid="click-hint">
          {clickHint(perClick)}
        </p>
        <p className="text-ink-muted" data-testid="clicked-metres">
          <span className="text-ink">{state.totalClicksM}</span> m by leg
        </p>
      </div>
    </section>
  );
}
