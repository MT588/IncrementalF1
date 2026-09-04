import { STRINGS } from '@/engine/data/strings';
import { xpPerMinute } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { formatNumber, formatXp } from '@/util/formatNumber';

export function Header() {
  // Select the state object itself: selectors must return stable references, and
  // xpPerMinute() would hand back a fresh Decimal on every call.
  const state = useGameStore((s) => s.state);
  const perMinute = xpPerMinute(state);

  return (
    <header className="border-line flex items-end justify-between border-b-2 pb-3">
      <div>
        <h1 className="font-display text-3xl leading-none font-bold tracking-wide uppercase">
          {STRINGS.GAME_NAME}
        </h1>
        <p className="text-ink-muted mt-1 text-xs tracking-[0.08em] uppercase">
          {STRINGS.XP_LABEL}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p data-testid="xp" className="text-2xl leading-none font-medium">
          {formatXp(state.xp)}
        </p>
        <p data-testid="rate" className="text-sector-green mt-1 text-sm">
          +{formatNumber(perMinute)}
          {STRINGS.PER_MINUTE}
        </p>
      </div>
    </header>
  );
}
