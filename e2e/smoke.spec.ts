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
 * The kart drives itself at 2.4 km/h, so reaching ten laps honestly takes two
 * and a half minutes and the race gate takes ten. Seeding puts a test at the state it wants to check
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
  await expect(page.getByTestId('speed')).toHaveText('2.4 km/h');
  // 2.4 km/h round a ten metre lap is a lap, and so an XP, every fifteen
  // seconds: four a minute, which is what the header counts in.
  await expect(page.getByTestId('rate')).toHaveText('+4/min');

  // Nobody touches anything, and the kart covers ground anyway.
  await expect.poll(() => lapMetres(page), { timeout: 8_000 }).toBeGreaterThan(0);

  // The line pays, and the lap counter moves with it.
  await expect(page.getByTestId('track-map')).toContainText('Laps 1', { timeout: 25_000 });
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

  // Twenty brings out race craft, the last of them, and the hint goes.
  await seedSave(page, { totalLaps: 20 });
  await page.goto('/');
  await expect(page.getByTestId('upgrade-raceCraft')).toBeVisible();
  await expect(page.getByTestId('next-unlock')).toHaveCount(0);
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
  await expect(page.getByTestId('speed')).toHaveText('2.9 km/h');
  // The row keeps up with what the upgrade is now worth.
  await expect(page.getByTestId('upgrade-throttle').getByTestId('effect-now')).toHaveText(
    '0.5 km/h',
  );
  await expect(page.getByTestId('upgrade-throttle').getByTestId('level')).toHaveText('Lvl 1');
  // Faster laps mean a faster rate: 2.9 km/h is five XP a minute rather than four.
  await expect(page.getByTestId('rate')).toHaveText('+5/min');
});

test('racing tyres add a flat XP to every later lap', async ({ page }) => {
  await seedSave(page, { xp: '8', totalLaps: 3 });
  await page.goto('/');
  await expect(page.getByTestId('lap-payout')).toHaveText('1 XP');
  await expect(page.getByTestId('rate')).toHaveText('+4/min');

  const buy = page.getByRole('button', { name: /^Buy Racing tyres/ });
  await buy.click();
  // Flat, not multiplied: a level is worth a whole XP a lap, which at this end
  // of the game is the payout over again.
  await expect(page.getByTestId('lap-payout')).toHaveText('2 XP');
  await expect(page.getByTestId('rate')).toHaveText('+8/min');
  await expect(page.getByTestId('upgrade-racingTyres').getByTestId('effect-now')).toHaveText(
    '+1 XP per lap',
  );

  // And the next level adds the same again rather than a proportion of it.
  await buy.click();
  await expect(page.getByTestId('lap-payout')).toHaveText('3 XP');
});

test('race craft multiplies the lap and puts races on the board', async ({ page }) => {
  // Nothing about races until race craft is owned, however far you have driven.
  await seedSave(page, { xp: '50', totalLaps: 20 });
  await page.goto('/');
  await expect(page.getByTestId('upgrade-raceCraft')).toBeVisible();
  await expect(page.getByTestId('races-panel')).toHaveCount(0);

  await page.getByRole('button', { name: /^Buy Race craft/ }).click();
  // A multiplier, so on a 1 XP lap the ceiling takes it to a whole 2.
  await expect(page.getByTestId('lap-payout')).toHaveText('2 XP');
  // And the panel arrives, counting laps down to the gate.
  await expect(page.getByTestId('races-panel')).toBeVisible();
  await expect(page.getByTestId('races-hint')).toHaveText('Drive 230 more laps to unlock races.');
});

test('the races panel counts down, then says the gate is passed', async ({ page }) => {
  await seedSave(page, { totalLaps: 100, upgrades: { raceCraft: 1 } });
  await page.goto('/');
  await expect(page.getByTestId('races-hint')).toHaveText('Drive 150 more laps to unlock races.');
  await expect(page.getByTestId('races-laps')).toHaveText('100');

  // Past 250 laps it stops counting and says so.
  await seedSave(page, { totalLaps: 250, upgrades: { raceCraft: 1 } });
  await page.goto('/');
  await expect(page.getByTestId('races-hint')).toHaveText('You have the pace. Races are coming.');
});

test('progress survives a reload', async ({ page }) => {
  await seedSave(page, { xp: '7', totalLaps: 4, upgrades: { throttle: 2 } });
  await page.goto('/');
  await expect(page.getByTestId('speed')).toHaveText('3.4 km/h');

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
  await expect(page.getByTestId('speed')).toHaveText('3.4 km/h');
  await expect(page.getByTestId('track-map')).toContainText(/Laps [4-9]/);
});

test('an upgrade shows its description on hover, and not otherwise', async ({ page }) => {
  await page.goto('/');
  const throttle = page.getByTestId('upgrade-throttle');
  const tooltip = throttle.getByTestId('info');

  // The row shows what it is worth now, the button what one more level adds,
  // and only the description waits behind the icon.
  await expect(throttle.getByTestId('effect-now')).toHaveText('0.0 km/h');
  await expect(throttle.getByTestId('delta')).toHaveText('+0.5 km/h');
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
