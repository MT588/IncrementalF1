import { GENERATORS } from '@/engine/data/generators';
import { STRINGS } from '@/engine/data/strings';
import { DriveLapButton } from './DriveLapButton';
import { Footer } from './Footer';
import { GeneratorRow } from './GeneratorRow';
import { Header } from './Header';
import { WelcomeBack } from './WelcomeBack';

export function App() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <Header />
      <WelcomeBack />
      <main className="mt-6 flex flex-col gap-6">
        <DriveLapButton />
        <section aria-labelledby="garage-heading">
          <h2
            id="garage-heading"
            className="font-display text-ink-muted mb-2 text-sm font-semibold tracking-[0.12em] uppercase"
          >
            Garage
          </h2>
          <ul className="border-line divide-line divide-y rounded-sm border">
            {GENERATORS.map((def) => (
              <GeneratorRow key={def.id} def={def} />
            ))}
          </ul>
        </section>
      </main>
      <Footer />
      <p className="text-ink-muted mt-4 text-center text-xs">{STRINGS.TAGLINE}</p>
    </div>
  );
}
