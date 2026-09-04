import { getTrack } from '@/engine/data/tracks';
import { STRINGS } from '@/engine/data/strings';
import { xpPerLap } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { formatXp } from '@/util/formatNumber';
import { pointOnStadium } from '@/util/stadium';
import { BACKYARD_TRACK, VIEW_H, VIEW_W } from './backyardLayout';
import { BackyardScene } from './BackyardScene';
import { Bicycle } from './Bicycle';

export function TrackMap() {
  const state = useGameStore((s) => s.state);
  const track = getTrack(state.trackId);
  const fraction = state.lapProgressM / track.lapDistanceM;
  const rider = pointOnStadium(BACKYARD_TRACK, fraction);

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
        <BackyardScene />
        {/* No CSS transition on the bike: it would sweep backwards across the
            yard on every lap rollover, and 10 updates a second already reads
            as smooth movement. */}
        <Bicycle x={rider.x} y={rider.y} facing={rider.facing} />
      </svg>

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
    </section>
  );
}
