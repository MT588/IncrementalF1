import { STRINGS } from '@/engine/data/strings';
import { clearSave } from '@/services/localSave';
import { useGameStore } from '@/store/gameStore';

export function Footer() {
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const reset = useGameStore((s) => s.reset);

  const onReset = () => {
    if (!window.confirm(STRINGS.RESET_CONFIRM)) return;
    clearSave();
    reset();
  };

  const saved = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString(undefined, { hour12: false })
    : STRINGS.NEVER_SAVED;

  return (
    <footer className="border-line text-ink-muted mt-8 flex items-center justify-between border-t pt-3 text-xs">
      <span className="tabular-nums" data-testid="saved">
        {STRINGS.LAST_SAVED} {saved}
      </span>
      <button
        type="button"
        onClick={onReset}
        className="hover:text-ink focus-visible:ring-ink min-h-11 rounded-sm px-2 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {STRINGS.RESET}
      </button>
    </footer>
  );
}
