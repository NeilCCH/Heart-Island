# 可直接交給 Codex
你負責小貓能量站核心。先讀README、PRD、WORKFLOW、CORE_API_CONTRACT v0.3、DECISIONS（2026-10-22已裁決）與ACCEPTANCE，以及GATE0_UI_PROPOSAL_ClaudeCode.md。先交叉審查v0.3契約（特別是guidancePaused、setCompleted.guidedCycles、GuideView.cyclePace/pendingPace、remember/resetToDefaults），回覆同意/修改/反對；審查本身不是Gate 1授權，不實作、不安裝、不建立分支、不提交。

使用者明確核准Gate 1後，依凍結契約建立純狀態機、單調時鐘controller、React adapter、設定儲存與測試。骨架所有權需包含在核准範圍。UI只有一個時間/計數來源；完整吐氣+吸氣循環才加一；背景/暫停/中斷不補計；目標停止不啟動下一循環；休息到期不自動下一組。

提供正常觀測步幅的假時鐘測試及獨立長間隔保護測試、UI測試adapter、接線範例、執行證據與限制。不要用mock或靜態檢查宣稱真機、整合、部署完成。不得把已引導循環數說成真實動作數。不得修改Claude Code UI檔案；App入口移交依IMPLEMENTATION_PLAN執行。
