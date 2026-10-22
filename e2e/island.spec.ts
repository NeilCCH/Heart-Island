import { test, expect } from '@playwright/test';

// 心靈小島首頁與新功能（瀏覽器虛擬時鐘）。設定 SCREENSHOT_DIR 時另存截圖。
const shotDir = process.env.SCREENSHOT_DIR;
test.beforeEach(async ({ page }) => { await page.clock.install(); await page.goto('/'); });

test('首頁點連結進入各地方，上一頁回到小島', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: '心靈小島' })).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/island-home.png`, fullPage: true });
  await page.getByRole('link', { name: /今天一點點/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '今天一點點' })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: '心靈小島' })).toBeVisible();
  await page.getByRole('link', { name: /小貓能量站/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '小貓能量站' })).toBeVisible();
  await page.getByRole('button', { name: '← 回小島' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '心靈小島' })).toBeVisible();
});

test('今天一點點：做了、再一件、今天先這樣', async ({ page }) => {
  await page.getByRole('link', { name: /今天一點點/ }).click();
  if (shotDir) await page.screenshot({ path: `${shotDir}/tiny.png`, fullPage: true });
  await page.getByRole('button', { name: '做了' }).click();
  await expect(page.getByText('好。', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '今天先這樣' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '心靈小島' })).toBeVisible();
});

test('呼吸小宇宙：光球吸吐、暫停、調整', async ({ page }) => {
  await page.getByRole('link', { name: /呼吸小宇宙/ }).click();
  await expect(page.getByText('吸', { exact: true })).toBeVisible();
  await page.clock.runFor(4200);
  await expect(page.getByText('吐', { exact: true })).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/breath.png`, fullPage: true });
  await page.getByRole('button', { name: '暫停' }).click();
  await expect(page.getByRole('status')).toContainText('已暫停');
  await page.getByRole('button', { name: '調整' }).click();
  await page.getByRole('radio', { name: '吐氣長一點' }).check();
  await expect(page.getByText('吸 3.2 秒・吐 4.8 秒')).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/breath-adjust.png`, fullPage: true });
});

test('手機寬度：首頁與新功能無水平捲動', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const hash of ['', '#breath', '#tiny']) {
    await page.goto(`/${hash}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
