# 萌寵心靈島｜萌寵能量站

目前交付：核心狀態機、單調時計時器、React adapter、偏好設定、測試、已裁去標籤的正面小貓素材，以及正式UI（`src/features/energy/ui/`：開始、引導、暫停、組完成、休息、設定）。UI驗證結果見 docs/UI_TEST_REPORT.md。

## 啟動
```sh
npm ci
npm test
npm run build
npm run dev
```
開啟 http://127.0.0.1:5173 。測試用核心操作頁為 http://127.0.0.1:5173/e2e/core.html ，僅供工程驗證。

## 瀏覽器測試
```sh
npx playwright install chromium webkit
npm run test:e2e
```
本次macOS沙箱禁止Playwright瀏覽器啟動，六項案例尚未執行到應用程式，不宣稱通過；請在一般終端執行。自動化使用可控瀏覽器時鐘，不等於真機鎖屏或實際運動測量。

## 核心接線
```tsx
const preferences = useEnergySettings();
const energy = useEnergySession(preferences.settings, { onEffects });
// energy.session / guide / rest 為唯一計時與計數來源
// UI以 preferences.update({ pace: 'slow' }) 改速度，下一循環生效
// energy.actions.start(), pause(), resume(), finishSet(), startRest(),
// pauseRest(), resumeRest(), extendRest(), skipRest(), nextSet(), exit()
```

useEnergySession掛在功能根元件，切畫面及開設定不卸載。onEffects只能由使用者已開啟音訊且前景時觸發柔和音，暫停/背景/完成/離開須依mode取消音訊。guidancePaused是取消通知。休息暫停從mode判斷。

只記錄完整引導循環，不能代表偵測到真實重訓次數。背景引導與休息皆暫停，回前景手動繼續；超過2000ms觀測間隔以interrupted暫停，丟棄不確定區間。目標與休息到期不自動下一組。

## 文件
- docs/CORE_API_CONTRACT.md、CODEX_CROSS_REVIEW.md：介面與審查釐清。
- docs/TEST_REPORT.md：實際驗證與限制。
- docs/CLAUDE_UI_HANDOFF.md：直接給Claude Code接續。
- docs/DECISIONS.md：最新授權與素材決策。

## 回退與交付邊界
功能位於獨立分支，未合併main、未部署。原四大功能不在此repo，回歸測試T18未驗證。移除功能入口或還原本功能提交即可回退；不要清除其他功能的localStorage。
