import { test, expect, type Page } from '@playwright/test';

// 正式 UI 流程（瀏覽器虛擬時鐘）；不等於真機鎖屏或實際運動測量。
// 設定 SCREENSHOT_DIR 時另存各畫面截圖。
const shotDir = process.env.SCREENSHOT_DIR;
async function shot(page: Page, name: string) {
  if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true });
}

test.beforeEach(async ({ page }) => { await page.clock.install(); await page.goto('/#energy'); });

test('首頁→引導→暫停→組完成→休息→到期不自動下一組', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: '萌寵能量站' })).toBeVisible();
  await expect(page.getByRole('img', { name: /小貓/ })).toHaveAttribute('src', '/assets/cat/cutout.png');
  await shot(page, 'home');
  await page.getByRole('button', { name: '開始引導' }).click();
  await expect(page.getByText('自然吐氣・慢慢舉起')).toBeVisible();
  await page.clock.runFor(6100);
  await expect(page.getByText('已引導 1 次', { exact: true })).toBeVisible();
  await shot(page, 'guide');
  await page.keyboard.press('Escape');
  await page.locator('body').press(' ');
  await expect(page.getByText('已暫停。準備好再按「繼續」。')).toBeVisible();
  await page.clock.runFor(20000);
  await expect(page.getByText('已引導 1 次', { exact: true })).toBeVisible();
  await shot(page, 'paused');
  await page.getByRole('button', { name: '結束本組' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '本組引導結束' })).toBeFocused();
  await shot(page, 'complete');
  await page.getByRole('radio', { name: '30 秒' }).check();
  await page.getByRole('button', { name: '休息 30 秒' }).click();
  await expect(page.getByRole('timer')).toHaveText('0:30');
  await page.clock.runFor(10000);
  await shot(page, 'rest');
  await page.clock.runFor(21000);
  await expect(page.getByRole('heading', { level: 1, name: '休息時間到了' })).toBeVisible();
  await page.clock.runFor(60000);
  await expect(page.getByRole('heading', { level: 1, name: '休息時間到了' })).toBeVisible();
  await shot(page, 'ready');
});

test('設定：深色主題、焦點鎖與回復', async ({ page }) => {
  const opener = page.getByRole('button', { name: '設定' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '設定' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: '深色' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings-dark');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await shot(page, 'home-dark');
});

test('背景回來需手動繼續', async ({ page }) => {
  await page.getByRole('button', { name: '開始引導' }).click();
  await page.clock.runFor(1000);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.clock.runFor(60000);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await expect(page.getByText('剛剛離開了畫面，已幫你暫停。準備好再按「繼續」。')).toBeVisible();
  await expect(page.getByText('已引導 0 次', { exact: true })).toBeVisible();
});

test('手機寬度無水平捲動，按鈕至少 44px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole('button', { name: '開始引導' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await shot(page, 'guide-mobile');
});

test('PWA：manifest 與圖示可取得', async ({ page, request }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: '心靈小島', display: 'standalone', start_url: './' });
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).status()).toBe(200);
  expect((await request.get('/sw.js')).status()).toBe(200);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
});
