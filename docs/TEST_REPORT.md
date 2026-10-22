# 核心驗證紀錄
日期：2026-10-22；環境：macOS arm64，Node v26.7.0，npm 11.19.0。

## 已通過
- npm test：4個測試檔，38項全部通過。
- npm run build：TypeScript及Vite production build通過（當時為最小App入口）。
- PNG目視確認：517×450，底部標籤已裁掉，耳朵、尾巴與腳掌完整，無重繪。

單元/整合涵蓋4/6/8秒完整循環、半循環、6/8/10/12目標、不限、前景跨階段餘數、暫停20秒、背景60秒、2000/2001ms中斷、速度延後生效、手動停止、全部休息長度、延長/略過/再休息、舊回呼、StrictMode、卸載重掛、設定與儲存錯誤。

React hook測試以jsdom及明確localStorage替身執行；不是原生瀏覽器儲存驗證。Node26內建webstorage與jsdom衝突，因此測試明確注入替身。

## 尚未通過／未執行
- npm run test:e2e：六項Chromium/WebKit案例全部在瀏覽器啟動階段被沙箱攔截，未執行到測試頁。Chromium錯誤bootstrap_check_in MachPortRendezvousServer Permission denied (1100)，WebKit Abort trap:6。
- 要求沙箱外重跑時，工具自動審核依sandbox_approval=false拒絕；沒有繞過限制。
- UI、真機iOS Safari/Android Chrome/Edge、真實鎖屏、Wake Lock、音訊、螢幕閱讀器、250ms實際顯示延遲、原四功能回歸均未驗證。
- 本機Claude Code啟動回傳401 OAuth access token expired；使用者回覆已登入後的重試仍回傳同錯誤，因此尚無Claude Code UI產物。

## 可重跑命令
npm ci && npm test && npm run build
npx playwright install chromium webkit
npm run test:e2e

e2e/core.html是測試入口，並非完成UI；測試使用瀏覽器虛擬時鐘，不宣稱真實裝置60秒或鎖屏驗證。
