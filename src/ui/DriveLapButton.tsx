import { STRINGS } from '@/engine/data/strings';
import { useGameStore } from '@/store/gameStore';

export function DriveLapButton() {
  const driveLap = useGameStore((s) => s.driveLap);
  const laps = useGameStore((s) => s.state.totalLaps);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={driveLap}
        className="font-display bg-sector-purple text-asphalt hover:bg-ink focus-visible:ring-ink min-h-14 flex-1 rounded-sm px-5 text-2xl font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none active:translate-y-px"
      >
        {STRINGS.DRIVE_LAP}
      </button>
      <div className="text-right text-xs tabular-nums">
        <p className="text-ink-muted">{STRINGS.DRIVE_LAP_HINT}</p>
        <p className="text-ink-muted mt-1">
          {STRINGS.LAPS_DRIVEN} <span className="text-ink">{laps}</span>
        </p>
      </div>
    </div>
  );
}
