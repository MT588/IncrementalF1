import { canAfford } from '@/engine/actions';
import { STRINGS, effectDelta, effectNow, infoLabel } from '@/engine/data/strings';
import { costOf } from '@/engine/formulas';
import type { UpgradeDef } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { formatXp } from '@/util/formatNumber';

interface Props {
  def: UpgradeDef;
}

export function UpgradeRow({ def }: Props) {
  const level = useGameStore((s) => s.state.upgrades[def.id]);
  const affordable = useGameStore((s) => canAfford(s.state, def.id));
  const buy = useGameStore((s) => s.buy);

  const cost = costOf(def, level);
  const delta = effectDelta(def);
  const infoId = `${def.id}-info`;

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
          {/* Only the description hides in here. It floats above the layout, so
              showing it shifts nothing in the row. */}
          <span className="relative inline-flex self-center">
            <button
              type="button"
              aria-label={infoLabel(def.name)}
              aria-describedby={infoId}
              data-testid="info-toggle"
              // `before:` inset gives the 44 px touch target the visible 24 px
              // circle would otherwise lack, without taking up the room. Keeping
              // it a real button means keyboard focus and a tap both reveal the
              // tooltip, which plain hover cannot do.
              className="font-display peer text-ink-muted hover:text-ink focus-visible:ring-ink border-line relative flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border text-[11px] leading-none font-bold transition-colors before:absolute before:-inset-2.5 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
            >
              i
            </button>
            <span
              id={infoId}
              role="tooltip"
              data-testid="info"
              className="border-line bg-asphalt text-ink-muted pointer-events-none absolute top-full left-1/2 z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-sm border px-2 py-1.5 text-xs leading-snug shadow-lg peer-hover:block peer-focus-visible:block peer-focus:block"
            >
              {def.description}
            </span>
          </span>
        </div>
        {/* What it is worth as it stands. The gain from one more level is on the button. */}
        <p className="text-sector-green mt-1 text-xs tabular-nums" data-testid="effect-now">
          {effectNow(def, level)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => buy(def.id)}
        disabled={!affordable}
        aria-label={`${STRINGS.BUY} ${def.name} for ${formatXp(cost)}, ${delta}`}
        className="font-display border-line text-ink enabled:border-sector-yellow enabled:hover:bg-sector-yellow enabled:hover:text-asphalt focus-visible:ring-ink min-h-11 min-w-28 rounded-sm border px-3 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        <span className="block text-xs tracking-[0.1em] uppercase">{STRINGS.BUY}</span>
        <span className="block text-base font-bold tabular-nums" data-testid="cost">
          {formatXp(cost)}
        </span>
        {/* Inherits the button's colour rather than setting its own, so it stays
            readable against the yellow hover fill. */}
        <span className="block text-xs tabular-nums opacity-70" data-testid="delta">
          {delta}
        </span>
      </button>
    </li>
  );
}
