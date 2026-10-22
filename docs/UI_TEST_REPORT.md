# UI 驗證紀錄（Gate 2）
日期：2026-10-22；環境：Linux 雲端容器，Node v22.22.0，Chromium 141.0.7390.37（Playwright 1.64.1，以 executablePath 指定預裝瀏覽器）。

## 已通過
- `npm test`：6 個測試檔、54 項全部通過（核心 38 項＋UI 16 項）。
- `npm run build`：TypeScript 與 Vite production build 通過。
- Playwright Chromium：7 項全部通過（核心 3 項＋UI 4 項 `e2e/ui.spec.ts`）。

UI 元件測試（jsdom＋Testing Library，注入 `tests/fakeRuntime.ts`，未另寫計時規則）涵蓋：首頁安全說明與素材、6 秒完整循環加 1／5999ms 不加、暫停 20 秒、背景 60 秒回來維持暫停、目標 6 次停止且不自動下一組、結束本組不計半循環、不限模式、引導中改速度下一循環生效、休息暫停／+30／到期只提示／再休息／略過、休息中背景、離開清空、空白鍵暫停、設定焦點移入與 Esc 回復、深色主題、記住偏好開關、聲音未開時不建立 AudioContext、柔和音只在前景且暫停／背景立即停止、禁用字詞掃描。

Chromium E2E 涵蓋：完整流程（含空白鍵、焦點移到新畫面標題、休息到期後 60 秒仍停在「休息時間到了」）、深色主題與設定焦點鎖、pagehide/pageshow 後需手動繼續、360px 寬無水平捲動且所有按鈕高度 ≥ 44px。截圖見 `docs/screenshots/ui/`。

## 重跑方式
```sh
npm ci && npm test && npm run build
npx playwright install chromium webkit
npm run test:e2e            # 設 SCREENSHOT_DIR=路徑 可另存截圖
```
本容器的 Playwright 版本與預裝瀏覽器不符，實際以暫存設定指定 `/opt/pw-browsers/chromium` 執行；`playwright.config.ts` 未修改。

## 尚未驗證
- WebKit：容器內沒有 WebKit 瀏覽器，未執行。
- 真機 iOS Safari、Android Chrome、桌面 Edge；真實鎖屏與 Wake Lock（測試環境不支援，畫面顯示「無法保持螢幕常亮」提示的路徑已測）。
- 真實喇叭聲音品質與音量（只以假 AudioContext 驗證播放／取消時機）。
- 真實螢幕閱讀器（VoiceOver/TalkBack/NVDA）朗讀；只驗證 aria 屬性、live region 文字與焦點。
- 自動化色彩對比工具（axe 等）未安裝，未執行；配色以人工挑選高對比值。
- 250ms 前景顯示延遲實測、原四大功能回歸（T18，宿主不在此 repo）。
