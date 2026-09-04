import { STRINGS, nextUnlockHint } from '@/engine/data/strings';
import { nextUnlockAtLaps, unlockedUpgrades } from '@/engine/formulas';
import { useGameStore } from '@/store/gameStore';
import { Footer } from './Footer';
import { Header } from './Header';
import { PedalButton } from './PedalButton';
import { TrackMap } from './TrackMap';
import { UpgradeRow } from './UpgradeRow';
import { WelcomeBack } from './WelcomeBack';

export function App() {
  // Subscribe to the lap count alone: the shed only changes shape when a lap
  // lands, not on every tick of the loop.
  const totalLaps = useGameStore((s) => s.state.totalLaps);
  const shown = unlockedUpgrades(totalLaps);
  const nextAt = nextUnlockAtLaps(totalLaps);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <Header />
      <WelcomeBack />
      <main className="mt-6 flex flex-col gap-6">
        <TrackMap />
        <PedalButton />
        <section aria-labelledby="shed-heading">
          <h2
            id="shed-heading"
            className="font-display text-ink-muted mb-2 text-sm font-semibold tracking-[0.12em] uppercase"
          >
            {STRINGS.SHED}
          </h2>
          <ul className="border-line divide-line divide-y rounded-sm border">
            {shown.map((def) => (
              <UpgradeRow key={def.id} def={def} />
            ))}
          </ul>
          {nextAt !== null && (
            <p className="text-ink-muted mt-2 text-xs" data-testid="next-unlock">
              {nextUnlockHint(nextAt)}
            </p>
          )}
        </section>
      </main>
      <Footer />
      <p className="text-ink-muted mt-4 text-center text-xs">{STRINGS.TAGLINE}</p>
    </div>
  );
}
