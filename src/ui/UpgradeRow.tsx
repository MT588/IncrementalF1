import { canAfford } from '@/engine/actions';
import { STRINGS, effectSummary } from '@/engine/data/strings';
import { costOf } from '@/engine/formulas';
import type { UpgradeDef } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { formatMoney } from '@/util/formatNumber';

interface Props {
  def: UpgradeDef;
}

export function UpgradeRow({ def }: Props) {
  const level = useGameStore((s) => s.state.upgrades[def.id]);
  const affordable = useGameStore((s) => canAfford(s.state, def.id));
  const buy = useGameStore((s) => s.buy);

  const cost = costOf(def, level);

  return (
    <li className="bg-panel flex items-center gap-4 px-4 py-3" data-testid={`upgrade-${def.id}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
            {def.name}
          </h3>
          <span className="text-ink-muted text-xs tabular-nums" data-testid="level">
            {STRINGS.LEVEL} {level}
          </span>
        </div>
        <p className="text-ink-muted mt-1 text-xs">{def.description}</p>
        <p className="mt-1 text-xs tabular-nums">
          <span className="text-ink-muted">{STRINGS.EFFECT} </span>
          <span className="text-sector-green">{effectSummary(def, level)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => buy(def.id)}
        disabled={!affordable}
        aria-label={`${STRINGS.BUY} ${def.name} for ${formatMoney(cost)}`}
        className="font-display border-line text-ink enabled:border-sector-yellow enabled:hover:bg-sector-yellow enabled:hover:text-asphalt focus-visible:ring-ink min-h-11 min-w-28 rounded-sm border px-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        <span className="block text-xs tracking-[0.1em] uppercase">{STRINGS.BUY}</span>
        <span className="block text-base font-bold tabular-nums" data-testid="cost">
          {formatMoney(cost)}
        </span>
      </button>
    </li>
  );
}
