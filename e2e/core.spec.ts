import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.clock.install(); await page.goto('/e2e/core.html'); });
const state = async (page: import('@playwright/test').Page) => JSON.parse(await page.getByTestId('state').innerText());
test('真實React/瀏覽器排程：6秒加1，暫停20秒不加，重整idle', async ({ page }) => {
  await page.getByRole('button', { name:'start', exact:true }).click(); await page.clock.runFor(6100); expect((await state(page)).guidedCycles).toBe(1);
  await page.getByRole('button', { name:'pause', exact:true }).click(); const before = await state(page); await page.clock.runFor(20000); expect(await state(page)).toEqual(before);
  await page.getByRole('button', { name:'resume', exact:true }).click(); await page.clock.runFor(6000); expect((await state(page)).guidedCycles).toBe(2);
  await page.reload(); expect((await state(page)).mode).toBe('idle');
});
test('pagehide/pageshow凍結休息並要求手動恢復', async ({ page }) => {
  await page.getByRole('button', { name:'start', exact:true }).click(); await page.getByRole('button', { name:'finishSet', exact:true }).click(); await page.getByRole('button', { name:'startRest', exact:true }).click();
  await page.clock.runFor(1000); await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide'))); const before = await state(page);
  await page.clock.runFor(60000); await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow'))); expect((await state(page)).restRemainingMs).toBe(before.restRemainingMs); expect((await state(page)).mode).toBe('pausedRest');
});
test('保存偏好原生localStorage正常、重整不恢復引導', async ({ page }) => {
  await page.getByRole('button', { name:'remember', exact:true }).click(); await page.getByRole('button', { name:'brisk', exact:true }).click();
  await page.getByRole('button', { name:'start', exact:true }).click(); await page.reload(); await expect(page.getByTestId('remember')).toHaveText('true'); expect((await state(page)).mode).toBe('idle');
  await page.getByRole('button', { name:'start', exact:true }).click(); expect((await state(page)).cyclePace).toBe('brisk');
});
