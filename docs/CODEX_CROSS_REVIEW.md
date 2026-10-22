# Codex 契約交叉審查與實作補充 v0.3.1
日期：2026-10-22；基準：3b84ca0，claude/laughing-goldberg-b8b35k。

## 審查
- guidancePaused：同意。只於引導進入暫停時發一次，是取消效果，不是可播音提示。休息暫停、exit、完成也須由UI觀察mode釋放Wake Lock與停止音訊，不能只依此效果。
- setCompleted.guidedCycles：同意。附帶最終完整引導數，半循環不計，目標邊界只發一次完成效果。完成播報優先於同批cycleCompleted，避免重複。
- GuideView.cyclePace/pendingPace：同意。guide非null時cyclePace一定有效；兩者不同才顯示待生效提示。
- remember/resetToDefaults：同意並釐清。clearSaved同時remember=false，防止下一次update把剛刪資料寫回；不改記憶體設定、不影響session。reset保留remember，僅重設偏好，記住時寫回。寫入/清除失敗明示storageError，不假稱已成功刪除。

## 必要補充
- EnergyState內部補isHidden，讓純核心也能拒絕背景start/resume/nextSet；UI只讀session。
- hook回傳storageError:string|null，由UI呈現儲存失敗。clearSaved失敗時舊資料可能於重開被讀到。
- 接近到期時，先結算有效前景時間；若已readyNext，extendRest不再延長，改按再休息。
- 長間隔觸發暫停時，finishSet/skipRest等明確停止操作仍立即執行，不要求點第二次。
- system reduced motion由UI觀察，傳入effective設定；核心快照節流與邏輯觀測分離。
- 核心不依賴React/DOM，controller處理瀏覽器生命週期，React adapter只接線。
- 本機Claude Code使用獨立UI worktree，不與核心同檔並行；App最小入口現交給UI。

## 最新授權
使用者於2026-10-22指示「我只要你們兩個快點用好」，本輪解讀為授權Gate1/Gate2實作與正面參考裁切素材，且已於對話明示執行範圍。main合併/部署仍需驗收。此紀錄不代表真機或production驗證。
