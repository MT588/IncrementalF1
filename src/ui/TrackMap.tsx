import { getTrack } from '@/engine/data/tracks';
import { STRINGS } from '@/engine/data/strings';
import { moneyPerLap } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { formatMoney } from '@/util/formatNumber';
import { pointOnCircle } from '@/util/pointOnCircle';

// viewBox units. A circle keeps both the progress ring (2πr) and the dot
// position exact; a later, non-circular track swaps this for an SVG <path>.
const VIEW_W = 200;
const VIEW_H = 120;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function TrackMap() {
  const state = useGameStore((s) => s.state);
  const track = getTrack(state.trackId);
  const fraction = state.lapProgressM / track.lapDistanceM;
  const bike = pointOnCircle(CX, CY, R, fraction);

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

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block w-full"
        role="img"
        aria-label={`${track.name}: ${Math.floor(state.lapProgressM)} of ${track.lapDistanceM} metres into the lap`}
      >
        {/* The fence around the yard. */}
        <rect
          x="6"
          y="6"
          width={VIEW_W - 12}
          height={VIEW_H - 12}
          rx="6"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* The lap itself. */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        {/* Distance covered so far, drawn from the start line clockwise. */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--color-sector-green)"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        {/* Start / finish line at 12 o'clock. */}
        <line
          x1={CX}
          y1={CY - R - 6}
          x2={CX}
          y2={CY - R + 6}
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
        {/* The bike. No CSS transition: it would sweep backwards across the
            circle on every lap rollover, and 10 updates a second already reads
            as smooth movement. */}
        <circle
          cx={bike.x}
          cy={bike.y}
          r="6"
          fill="var(--color-sector-yellow)"
          stroke="var(--color-asphalt)"
          strokeWidth="2"
        />
      </svg>

      <div className="border-line flex items-baseline justify-between border-t px-4 py-2 text-xs tabular-nums">
        <p data-testid="lap-progress">
          <span className="text-sector-green">{Math.floor(state.lapProgressM)}</span>
          <span className="text-ink-muted"> / {track.lapDistanceM} m</span>
        </p>
        <p className="text-ink-muted">
          {STRINGS.LAP_PAYS}{' '}
          <span className="text-ink" data-testid="lap-payout">
            {formatMoney(moneyPerLap(state))}
          </span>
        </p>
      </div>
    </section>
  );
}
