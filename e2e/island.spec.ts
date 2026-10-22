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

test('療癒小花園：手指畫沙紋會改變沙盤，種花與拖動石頭', async ({ page }) => {
  await page.getByRole('link', { name: /療癒小花園/ }).click();
  const tray = page.getByRole('img', { name: /沙盤/ });
  const box = (await tray.boundingBox())!;
  const pixel = () => page.evaluate(() => {
    const c = document.querySelector('canvas')!; const d = c.getContext('2d')!.getImageData(200, 375, 1, 1).data; return [d[0], d[1], d[2]].join(',');
  });
  const before = await pixel();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  expect(await pixel()).not.toBe(before);
  await page.getByRole('radio', { name: '種花' }).check();
  await tray.click({ position: { x: box.width * 0.15, y: box.height * 0.8 } });
  await expect(tray).toHaveAttribute('aria-label', /1 朵花/);
  if (shotDir) await page.screenshot({ path: `${shotDir}/garden.png`, fullPage: true });
});
