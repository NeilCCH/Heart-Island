import { test, expect } from '@playwright/test';

// 萌寵心靈島首頁與新功能（瀏覽器虛擬時鐘）。設定 SCREENSHOT_DIR 時另存截圖。
const shotDir = process.env.SCREENSHOT_DIR;
test.beforeEach(async ({ page }) => { await page.clock.install(); await page.goto('/'); });

test('首頁點連結進入各地方，上一頁回到小島', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: '萌寵心靈島' })).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/island-home.png`, fullPage: true });
  await page.getByRole('link', { name: /今天一點點/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '今天一點點' })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: '萌寵心靈島' })).toBeVisible();
  await page.getByRole('link', { name: /萌寵能量站/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '萌寵能量站' })).toBeVisible();
  await page.getByRole('button', { name: '← 回小島' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '萌寵心靈島' })).toBeVisible();
});

test('今天一點點：做了、再一件、今天先這樣', async ({ page }) => {
  await page.getByRole('link', { name: /今天一點點/ }).click();
  if (shotDir) await page.screenshot({ path: `${shotDir}/tiny.png`, fullPage: true });
  await page.getByRole('button', { name: '做了' }).click();
  await expect(page.getByText('好。', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '今天先這樣' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '萌寵心靈島' })).toBeVisible();
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
  for (const hash of ['', '#breath', '#tiny', '#sounds', '#mood', '#jar', '#ground', '#night']) {
    await page.goto(`/${hash}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (shotDir) await page.screenshot({ path: `${shotDir}/mobile-${hash.slice(1) || 'home'}.png`, fullPage: true });
  }
});

test('療癒小花園：手指畫沙紋會改變沙盤，種花與拖動石頭', async ({ page }) => {
  await page.getByRole('link', { name: /療癒小花園/ }).click();
  const tray = page.getByRole('img', { name: /沙盤/ });
  const box = (await tray.boundingBox())!;
  const pixel = () => page.evaluate(() => {
    const c = document.querySelector('canvas')!; const d = c.getContext('2d')!.getImageData(200, 420, 1, 1).data; return [d[0], d[1], d[2]].join(',');
  });
  const before = await pixel();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 12 });
  await page.mouse.up();
  expect(await pixel()).not.toBe(before);
  await page.getByRole('radio', { name: '種花' }).check();
  await tray.click({ position: { x: box.width * 0.15, y: box.height * 0.8 } });
  await expect(tray).toHaveAttribute('aria-label', /3 叢花/);
  if (shotDir) await page.screenshot({ path: `${shotDir}/garden.png`, fullPage: true });
});

test('療癒小花園：手機直式畫面，沙盤佔滿主要空間', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#garden');
  const box = (await page.getByRole('img', { name: /沙盤/ }).boundingBox())!;
  expect(box.height).toBeGreaterThan(box.width);
  expect(box.width).toBeGreaterThan(330);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (shotDir) await page.screenshot({ path: `${shotDir}/garden-mobile.png` });
});

test('萌寵陪伴屋：在頭上滑動摸摸、陪牠休息、手機不水平捲動', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#companion');
  const room = page.getByRole('img', { name: /小貓/ });
  await expect(room).toHaveAttribute('aria-label', '小貓坐著，安靜地陪著你。');
  const box = (await room.boundingBox())!;
  const at = (x: number, y: number) => [box.x + (x / 600) * box.width, box.y + (y / 800) * box.height] as const;
  await page.mouse.move(...at(290, 360));
  await page.mouse.down();
  await page.mouse.move(...at(340, 370), { steps: 8 });
  await page.mouse.up();
  await expect(room).toHaveAttribute('aria-label', '小貓瞇起眼睛，發出呼嚕聲。');
  if (shotDir) await page.screenshot({ path: `${shotDir}/companion-happy.png` });
  await page.getByRole('button', { name: '陪牠休息' }).click();
  await expect(room).toHaveAttribute('aria-label', '小貓睡著了，呼吸慢慢的。');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (shotDir) await page.screenshot({ path: `${shotDir}/companion-sleep.png` });
});

test('在設定選小狗：陪伴屋摸摸會搖尾巴，選擇也帶到萌寵能量站', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#companion');
  await page.getByRole('button', { name: '設定' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: '小狗' }).check();
  await page.getByRole('button', { name: '關閉' }).click();
  const room = page.getByRole('img', { name: /小狗/ });
  await expect(room).toHaveAttribute('aria-label', '小狗坐著，安靜地陪著你。');
  if (shotDir) await page.screenshot({ path: `${shotDir}/companion-dog.png` });
  const box = (await room.boundingBox())!;
  const at = (x: number, y: number) => [box.x + (x / 600) * box.width, box.y + (y / 800) * box.height] as const;
  await page.mouse.move(...at(270, 345));
  await page.mouse.down();
  await page.mouse.move(...at(320, 352), { steps: 8 });
  await page.mouse.up();
  await expect(room).toHaveAttribute('aria-label', '小狗瞇起眼睛，開心地搖著尾巴。');
  if (shotDir) await page.screenshot({ path: `${shotDir}/companion-dog-happy.png` });
  await page.getByRole('button', { name: '陪牠休息' }).click();
  await expect(room).toHaveAttribute('aria-label', '小狗睡著了，呼吸慢慢的。');
  if (shotDir) await page.screenshot({ path: `${shotDir}/companion-dog-sleep.png` });
  await page.goto('/#energy');
  await expect(page.getByRole('img', { name: /小狗/ })).toBeVisible();
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByRole('dialog').getByRole('radio', { name: '小狗' })).toBeChecked();
});

test('新的地方：療癒聲音、心情小天氣、感謝小罐子、五感著地、睡前模式', async ({ page }) => {
  if (shotDir) await page.screenshot({ path: `${shotDir}/island-home-10.png`, fullPage: true });
  await page.getByRole('link', { name: /療癒聲音/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '療癒聲音' })).toBeFocused();
  await page.getByRole('button', { name: /海浪/ }).click();
  await expect(page.getByRole('button', { name: /海浪/ })).toHaveAttribute('aria-pressed', 'true');
  if (shotDir) await page.screenshot({ path: `${shotDir}/sounds.png`, fullPage: true });
  await page.getByRole('button', { name: '停止' }).click();

  await page.goto('/#mood');
  await expect(page.getByRole('heading', { level: 1, name: '心情小天氣' })).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/mood-pick.png`, fullPage: true });
  await page.getByRole('button', { name: /晴時多雲/ }).click();
  await expect(page.getByText('有陽光，也有雲。兩種都可以同時存在。')).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/mood-reply.png`, fullPage: true });

  await page.goto('/#jar');
  await page.getByLabel('今天的小小好事').fill('今天的咖啡很好喝');
  await page.getByRole('button', { name: '放進罐子' }).click();
  await page.getByRole('button', { name: '抽一張' }).click();
  await expect(page.locator('.jar-note__text')).toHaveText('今天的咖啡很好喝');
  if (shotDir) await page.screenshot({ path: `${shotDir}/jar.png`, fullPage: true });
  await page.reload();
  await expect(page.getByText('罐子裡有 1 張紙條')).toBeVisible();

  await page.goto('/#ground');
  await page.getByRole('button', { name: '開始' }).click();
  await page.getByRole('button', { name: '找到一個' }).click();
  await page.getByRole('button', { name: '找到一個' }).click();
  if (shotDir) await page.screenshot({ path: `${shotDir}/ground.png`, fullPage: true });

  await page.goto('/#night');
  await expect(page.getByRole('heading', { level: 1, name: '睡前模式' })).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/night-setup.png`, fullPage: true });
  await page.getByRole('radio', { name: '安靜' }).check({ force: true });
  await page.getByRole('button', { name: '開始' }).click();
  await expect(page.getByText('吸氣')).toBeVisible();
  if (shotDir) await page.screenshot({ path: `${shotDir}/night-running.png`, fullPage: true });
});
