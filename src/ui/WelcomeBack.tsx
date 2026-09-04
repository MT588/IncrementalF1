import { STRINGS } from '@/engine/data/strings';
import { useGameStore } from '@/store/gameStore';
import { formatXp } from '@/util/formatNumber';

export function WelcomeBack() {
  const earned = useGameStore((s) => s.offlineXp);
  const dismiss = useGameStore((s) => s.dismissOfflineXp);
  if (!earned) return null;

  return (
    <div
      role="status"
      data-testid="welcome-back"
      className="border-sector-green bg-panel mt-4 flex items-center justify-between gap-3 border-l-4 px-4 py-3 text-sm"
    >
      <p>
        {STRINGS.WELCOME_BACK}{' '}
        <span className="text-sector-green tabular-nums">{formatXp(earned)}</span>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-ink-muted hover:text-ink min-h-11 min-w-11 rounded-sm focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
      >
        ×
      </button>
    </div>
  );
}
