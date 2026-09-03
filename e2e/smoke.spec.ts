import { expect, test, type Page } from '@playwright/test';

async function pedal(page: Page, times: number) {
  const button = page.getByRole('button', { name: 'Pedal', exact: true });
  for (let i = 0; i < times; i++) await button.click();
}

test('a lap of the backyard pays, and nothing before it does', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IncrementalF1');
  await expect(page.getByTestId('money')).toHaveText('€0.00');
  await expect(page.getByTestId('lap-progress')).toHaveText('0 / 30 m');

  // 29 metres round a 30 metre lap: still nothing earned.
  await pedal(page, 29);
  await expect(page.getByTestId('lap-progress')).toHaveText('29 / 30 m');
  await expect(page.getByTestId('money')).toHaveText('€0.00');

  // The thirtieth tap crosses the line.
  await pedal(page, 1);
  await expect(page.getByTestId('money')).toHaveText('€5.00');
  await expect(page.getByTestId('lap-progress')).toHaveText('0 / 30 m');
  await expect(page.getByTestId('track-map')).toContainText('Laps 1');
});

test('auto-pedal keeps the bike moving without tapping', async ({ page }) => {
  await page.goto('/');
  const buy = page.getByRole('button', { name: /^Buy Auto-pedal/ });
  await expect(buy).toBeDisabled();

  // Two laps buys the first level.
  await pedal(page, 60);
  await expect(page.getByTestId('money')).toHaveText('€10.00');
  await expect(buy).toBeEnabled();

  await buy.click();
  await expect(page.getByTestId('upgrade-autoPedal').getByTestId('level')).toHaveText('Lvl 1');
  await expect(page.getByTestId('money')).toHaveText('€0.00');
  // 0.5 m/s round a 30 m lap at EUR 5 a lap.
  await expect(page.getByTestId('rate')).toHaveText('+0.08/s');

  // Without touching the pedals, the bike covers ground on its own.
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
  await expect(page.getByTestId('lap-payout')).toHaveText('€5.00');

  // Five laps = EUR 25 = the first level of tyres.
  await pedal(page, 150);
  await expect(page.getByTestId('money')).toHaveText('€25.00');
  await page.getByRole('button', { name: /^Buy Racing tyres/ }).click();
  await expect(page.getByTestId('lap-payout')).toHaveText('€7.50');

  await pedal(page, 30);
  await expect(page.getByTestId('money')).toHaveText('€7.50');
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await pedal(page, 33);
  await expect(page.getByTestId('money')).toHaveText('€5.00');
  await expect(page.getByTestId('lap-progress')).toHaveText('3 / 30 m');

  // Hiding the tab triggers a save.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('saved')).not.toHaveText(/not yet/);

  await page.reload();
  await expect(page.getByTestId('money')).toHaveText('€5.00');
  await expect(page.getByTestId('lap-progress')).toHaveText('3 / 30 m');
});
