import { expect, test, type Page } from '@playwright/test';

type SeedState = {
  xp?: string;
  totalLaps?: number;
  lapProgressM?: number;
  upgrades?: Record<string, number>;
};

/**
 * Write a save into localStorage before the page boots.
 *
 * The kart drives itself at a metre a second, so reaching ten laps honestly
 * takes a hundred seconds. Seeding puts a test at the state it wants to check
 * and lets the simulation carry on from there. `lastTickAt` is stamped at load
 * so nothing is caught up as offline progress.
 */
async function seedSave(page: Page, state: SeedState) {
  await page.addInitScript((seed: SeedState) => {
    const now = Date.now();
    localStorage.setItem(
      'incf1:save',
      JSON.stringify({
        version: 6,
        savedAt: now,
        state: {
          xp: seed.xp ?? '0',
          money: '0',
          trackId: 'backyard',
          lapProgressM: seed.lapProgressM ?? 0,
          totalLaps: seed.totalLaps ?? 0,
          upgrades: seed.upgrades ?? {},
          lastTickAt: now,
          createdAt: now,
        },
      }),
    );
  }, state);
}

/** The metres into the current lap, as the footer reports them. */
async function lapMetres(page: Page): Promise<number> {
  const text = await page.getByTestId('lap-progress').textContent();
  return parseInt(text!.split(' ')[0], 10);
}

test('the kart drives itself, and a lap of the backyard pays', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IncrementalF1');
  await expect(page.getByTestId('xp')).toHaveText('0 XP');
  await expect(page.getByTestId('speed')).toHaveText('1.0 m/s');
  // A metre a second round a ten metre lap is a lap, and so an XP, every ten
  // seconds: six a minute, which is what the header counts in.
  await expect(page.getByTestId('rate')).toHaveText('+6/min');

  // Nobody touches anything, and the kart covers ground anyway.
  await expect.poll(() => lapMetres(page), { timeout: 5_000 }).toBeGreaterThan(0);

  // The line pays, and the lap counter moves with it.
  await expect(page.getByTestId('track-map')).toContainText('Laps 1', { timeout: 20_000 });
  await expect(page.getByTestId('xp')).not.toHaveText('0 XP');
});

test('the shed starts with one upgrade and opens up as laps land', async ({ page }) => {
  await page.goto('/');
  // The throttle is the only thing on show in an empty backyard.
  await expect(page.getByTestId('upgrade-throttle')).toBeVisible();
  await expect(page.getByTestId('upgrade-racingTyres')).toHaveCount(0);
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 3 laps driven');

  // Three laps brings out the tyres, and points at the next reveal.
  await seedSave(page, { totalLaps: 3 });
  await page.goto('/');
  await expect(page.getByTestId('upgrade-racingTyres')).toBeVisible();
  await expect(page.getByTestId('upgrade-biggerEngine')).toHaveCount(0);
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 8 laps driven');

  // Eight brings out the engine.
  await seedSave(page, { totalLaps: 8 });
  await page.goto('/');
  await expect(page.getByTestId('upgrade-biggerEngine')).toBeVisible();
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 15 laps driven');
});

test('the throttle is the first upgrade and makes the kart faster', async ({ page }) => {
  await page.goto('/');
  const buy = page.getByRole('button', { name: /^Buy Throttle/ });
  await expect(buy).toBeDisabled();

  // One lap is 1 XP, which is exactly what the throttle costs.
  await seedSave(page, { xp: '1' });
  await page.goto('/');
  await expect(buy).toBeEnabled();

  await buy.click();
  await expect(page.getByTestId('speed')).toHaveText('1.5 m/s');
  // The row keeps up with what the upgrade is now worth.
  await expect(page.getByTestId('upgrade-throttle').getByTestId('effect-now')).toHaveText(
    '0.5 m/s',
  );
  await expect(page.getByTestId('upgrade-throttle').getByTestId('level')).toHaveText('Lvl 1');
  // Faster laps mean a faster rate: 1.5 m/s is nine XP a minute.
  await expect(page.getByTestId('rate')).toHaveText('+9/min');
});

test('racing tyres make every later lap worth more', async ({ page }) => {
  await seedSave(page, { xp: '5', totalLaps: 3 });
  await page.goto('/');
  await expect(page.getByTestId('lap-payout')).toHaveText('1 XP');

  await page.getByRole('button', { name: /^Buy Racing tyres/ }).click();
  // The tyres multiply by 1.5 and the payout is rounded up, so the lap goes
  // from 1 XP to a whole 2 rather than to an unshowable 1.5.
  await expect(page.getByTestId('lap-payout')).toHaveText('2 XP');
  // Twice the XP for the same distance: twelve a minute rather than six.
  await expect(page.getByTestId('rate')).toHaveText('+12/min');
});

test('progress survives a reload', async ({ page }) => {
  await seedSave(page, { xp: '7', totalLaps: 4, upgrades: { throttle: 2 } });
  await page.goto('/');
  await expect(page.getByTestId('speed')).toHaveText('2.0 m/s');

  // Hiding the tab triggers a save.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('saved')).not.toHaveText(/not yet/);

  await page.reload();
  // The levels and the laps come back; the balance and the lap counter have
  // only gone up, because the kart never stopped driving.
  await expect(page.getByTestId('upgrade-throttle').getByTestId('level')).toHaveText('Lvl 2');
  await expect(page.getByTestId('speed')).toHaveText('2.0 m/s');
  await expect(page.getByTestId('track-map')).toContainText(/Laps [4-9]/);
});

test('an upgrade shows its description on hover, and not otherwise', async ({ page }) => {
  await page.goto('/');
  const throttle = page.getByTestId('upgrade-throttle');
  const tooltip = throttle.getByTestId('info');

  // The row shows what it is worth now, the button what one more level adds,
  // and only the description waits behind the icon.
  await expect(throttle.getByTestId('effect-now')).toHaveText('0.0 m/s');
  await expect(throttle.getByTestId('delta')).toHaveText('+0.5 m/s');
  await expect(tooltip).toBeHidden();

  await throttle.getByTestId('info-toggle').hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(
    'A stiffer spring on the pedal. The kart holds more speed round the yard.',
  );

  // Moving away hides it again.
  await page.getByRole('heading', { level: 1 }).hover();
  await expect(tooltip).toBeHidden();
});
