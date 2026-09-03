import { canAfford } from '@/engine/actions';
import { STRINGS } from '@/engine/data/strings';
import { costOf, generatorOutput } from '@/engine/formulas';
import type { GeneratorDef } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { formatMoney, formatNumber } from '@/util/formatNumber';

interface Props {
  def: GeneratorDef;
}

export function GeneratorRow({ def }: Props) {
  const owned = useGameStore((s) => s.state.generators[def.id]);
  const affordable = useGameStore((s) => canAfford(s.state, def.id));
  const buy = useGameStore((s) => s.buy);

  const cost = costOf(def, owned);
  const output = generatorOutput(def, owned);

  return (
    <li className="bg-panel flex items-center gap-4 px-4 py-3" data-testid={`generator-${def.id}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
            {def.name}
          </h3>
          <span className="text-ink-muted text-xs tabular-nums" data-testid="owned">
            {STRINGS.OWNED} {owned}
          </span>
        </div>
        <p className="text-ink-muted mt-1 text-xs">{def.description}</p>
        <p className="mt-1 text-xs tabular-nums">
          <span className="text-ink-muted">{STRINGS.OUTPUT} </span>
          <span className="text-sector-green">
            +{formatNumber(output)}
            {STRINGS.PER_SECOND}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => buy(def.id)}
        disabled={!affordable}
        aria-label={`${STRINGS.BUY} ${def.name} for ${formatMoney(cost)}`}
        className="font-display border-line text-ink min-h-11 min-w-28 rounded-sm border px-3 text-left transition-colors enabled:border-sector-yellow enabled:hover:bg-sector-yellow enabled:hover:text-asphalt disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
      >
        <span className="block text-xs tracking-[0.1em] uppercase">{STRINGS.BUY}</span>
        <span className="block text-base font-bold tabular-nums" data-testid="cost">
          {formatMoney(cost)}
        </span>
      </button>
    </li>
  );
}
