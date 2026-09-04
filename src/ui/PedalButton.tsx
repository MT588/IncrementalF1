import { STRINGS, pedalHint } from '@/engine/data/strings';
import { metresPerTap } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';

export function PedalButton() {
  const pedal = useGameStore((s) => s.pedal);
  const metres = useGameStore((s) => s.state.totalTapsM);
  const perTap = useGameStore((s) => metresPerTap(s.state));

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={pedal}
        className="font-display bg-sector-purple text-asphalt hover:bg-ink focus-visible:ring-ink min-h-14 flex-1 rounded-sm px-5 text-2xl font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none active:translate-y-px"
      >
        {STRINGS.PEDAL}
      </button>
      <div className="text-right text-xs tabular-nums">
        <p className="text-ink-muted" data-testid="pedal-hint">
          {pedalHint(perTap)}
        </p>
        <p className="text-ink-muted mt-1" data-testid="tapped-metres">
          <span className="text-ink">{metres}</span> m by leg
        </p>
      </div>
    </div>
  );
}
