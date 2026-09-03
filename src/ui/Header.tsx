import { STRINGS } from '@/engine/data/strings';
import { outputPerSecond } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { formatMoney, formatNumber } from '@/util/formatNumber';

export function Header() {
  // Select the state object itself: selectors must return stable references, and
  // outputPerSecond() would hand back a fresh Decimal on every call.
  const state = useGameStore((s) => s.state);
  const perSecond = outputPerSecond(state);

  return (
    <header className="border-line flex items-end justify-between border-b-2 pb-3">
      <div>
        <h1 className="font-display text-3xl leading-none font-bold tracking-wide uppercase">
          {STRINGS.GAME_NAME}
        </h1>
        <p className="text-ink-muted mt-1 text-xs tracking-[0.08em] uppercase">
          {STRINGS.MONEY_LABEL}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p data-testid="money" className="text-2xl leading-none font-medium">
          {formatMoney(state.money)}
        </p>
        <p data-testid="rate" className="text-sector-green mt-1 text-sm">
          +{formatNumber(perSecond)}
          {STRINGS.PER_SECOND}
        </p>
      </div>
    </header>
  );
}
