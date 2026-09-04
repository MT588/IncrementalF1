import { expect, test, type Page } from '@playwright/test';

async function ride(page: Page, times: number) {
  const track = page.getByRole('button', { name: 'Click the track to ride' });
  for (let i = 0; i < times; i++) await track.click();
}

test('a lap of the backyard pays, and nothing before it does', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IncrementalF1');
  await expect(page.getByTestId('xp')).toHaveText('0 XP');
  await expect(page.getByTestId('lap-progress')).toHaveText('0 / 30 m');

  // 29 metres round a 30 metre lap: still nothing earned.
  await ride(page, 29);
  await expect(page.getByTestId('lap-progress')).toHaveText('29 / 30 m');
  await expect(page.getByTestId('xp')).toHaveText('0 XP');

  // The thirtieth click crosses the line, and the lap pays its 1 XP.
  await ride(page, 1);
  await expect(page.getByTestId('xp')).toHaveText('1 XP');
  await expect(page.getByTestId('lap-progress')).toHaveText('0 / 30 m');
  await expect(page.getByTestId('track-map')).toContainText('Laps 1');
});

test('the shed starts with one upgrade and opens up as laps land', async ({ page }) => {
  await page.goto('/');
  // Bigger gears is the only thing on show in an empty backyard.
  await expect(page.getByTestId('upgrade-biggerGears')).toBeVisible();
  await expect(page.getByTestId('upgrade-autoPedal')).toHaveCount(0);
  await expect(page.getByTestId('upgrade-betterBike')).toHaveCount(0);
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 1 lap driven');

  // One lap brings out auto-pedal, and points at the next reveal.
  await ride(page, 30);
  await expect(page.getByTestId('upgrade-autoPedal')).toBeVisible();
  await expect(page.getByTestId('upgrade-betterBike')).toHaveCount(0);
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 3 laps driven');

  // Three laps brings out the tyres.
  await ride(page, 60);
  await expect(page.getByTestId('upgrade-betterBike')).toBeVisible();
  await expect(page.getByTestId('next-unlock')).toHaveText('Unlocked at 10 laps driven');
});

test('bigger gears is the first upgrade and makes every click carry further', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('click-hint')).toHaveText('+1 m per click');
  const buy = page.getByRole('button', { name: /^Buy Bigger gears/ });
  await expect(buy).toBeDisabled();

  // One lap = 1 XP, which is exactly what gears cost.
  await ride(page, 30);
  await expect(page.getByTestId('xp')).toHaveText('1 XP');
  await expect(buy).toBeEnabled();

  await buy.click();
  await expect(page.getByTestId('xp')).toHaveText('0 XP');
  await expect(page.getByTestId('click-hint')).toHaveText('+2 m per click');
  // The row keeps up with what the upgrade is now worth.
  await expect(page.getByTestId('upgrade-biggerGears').getByTestId('effect-now')).toHaveText(
    '2 m per click',
  );

  // Fifteen clicks of 2 m now finish the 30 m lap.
  await ride(page, 14);
  await expect(page.getByTestId('lap-progress')).toHaveText('28 / 30 m');
  await ride(page, 1);
  await expect(page.getByTestId('xp')).toHaveText('1 XP');
});

test('auto-pedal keeps the bike moving without clicking', async ({ page }) => {
  await page.goto('/');

  // Three laps: one to reveal auto-pedal, three to afford its 3 XP.
  await ride(page, 90);
  await expect(page.getByTestId('xp')).toHaveText('3 XP');
  const buy = page.getByRole('button', { name: /^Buy Auto-pedal/ });
  await expect(buy).toBeEnabled();

  await buy.click();
  await expect(page.getByTestId('upgrade-autoPedal').getByTestId('level')).toHaveText('Lvl 1');
  await expect(page.getByTestId('xp')).toHaveText('0 XP');
  // 0.5 m/s round a 30 m lap: one lap, and so 1 XP, a minute. Counted by the
  // minute because per second this is 0.0167, and the readout shows no
  // fractions: it would sit at "+0/s" through the whole of the early game.
  await expect(page.getByTestId('rate')).toHaveText('+1/min');

  // Without a single click, the bike covers ground on its own.
  await expect
    .poll(
      async () =>
        parseInt((await page.getByTestId('lap-progress').textContent())!.split(' ')[0], 10),
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0);
});

test('racing tyres make every later lap worth more', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lap-payout')).toHaveText('1 XP');

  // Five laps = 5 XP = the first level of tyres, revealed at three laps.
  await ride(page, 150);
  await expect(page.getByTestId('xp')).toHaveText('5 XP');
  await page.getByRole('button', { name: /^Buy Racing tyres/ }).click();
  await expect(page.getByTestId('xp')).toHaveText('0 XP');
  // The tyres multiply by 1.5 and the payout is rounded up, so the lap goes
  // from 1 XP to a whole 2 rather than to an unshowable 1.5.
  await expect(page.getByTestId('lap-payout')).toHaveText('2 XP');

  await ride(page, 30);
  await expect(page.getByTestId('xp')).toHaveText('2 XP');
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await ride(page, 33);
  await expect(page.getByTestId('xp')).toHaveText('1 XP');
  await expect(page.getByTestId('lap-progress')).toHaveText('3 / 30 m');

  // Hiding the tab triggers a save.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('saved')).not.toHaveText(/not yet/);

  await page.reload();
  await expect(page.getByTestId('xp')).toHaveText('1 XP');
  await expect(page.getByTestId('lap-progress')).toHaveText('3 / 30 m');
});

test('an upgrade shows its description on hover, and not otherwise', async ({ page }) => {
  await page.goto('/');
  const gears = page.getByTestId('upgrade-biggerGears');
  const tooltip = gears.getByTestId('info');

  // The row shows what it is worth now, the button what one more level adds,
  // and only the description waits behind the icon.
  await expect(gears.getByTestId('effect-now')).toHaveText('1 m per click');
  await expect(gears.getByTestId('delta')).toHaveText('+1 m');
  await expect(tooltip).toBeHidden();

  await gears.getByTestId('info-toggle').hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText('A longer chainring. Every push of the pedals travels further.');

  // Moving away hides it again.
  await page.getByRole('heading', { level: 1 }).hover();
  await expect(tooltip).toBeHidden();
});
