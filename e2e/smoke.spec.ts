import { expect, test } from '@playwright/test';

test('drive laps, buy a mechanic, watch money tick up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IncrementalF1');
  await expect(page.getByTestId('money')).toHaveText('€0.00');

  const buy = page.getByRole('button', { name: /^Buy Mechanic/ });
  await expect(buy).toBeDisabled();

  const drive = page.getByRole('button', { name: 'Drive a lap' });
  for (let i = 0; i < 10; i++) await drive.click();
  await expect(page.getByTestId('money')).toHaveText('€10.00');
  await expect(buy).toBeEnabled();

  await buy.click();
  await expect(page.getByTestId('generator-mechanic').getByTestId('owned')).toHaveText('Owned 1');
  await expect(page.getByTestId('rate')).toHaveText('+0.50/s');

  // 0.5 €/s: within three seconds the balance must have moved off zero.
  await expect
    .poll(
      async () => parseFloat((await page.getByTestId('money').textContent())!.replace('€', '')),
      {
        timeout: 3_000,
      },
    )
    .toBeGreaterThan(0.2);
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/');
  const drive = page.getByRole('button', { name: 'Drive a lap' });
  for (let i = 0; i < 3; i++) await drive.click();
  await expect(page.getByTestId('money')).toHaveText('€3.00');

  // Hiding the tab triggers a save.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('saved')).not.toHaveText(/not yet/);

  await page.reload();
  await expect(page.getByTestId('money')).toHaveText('€3.00');
});
