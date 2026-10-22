# 心靈小島｜Codex × Claude Code 協作工作流 v1.2

- 日期：2026-10-22
- 狀態：**需求更新完成，尚未授權實作**
- 唯一產品規格來源：`docs/PRD_心靈小島_小貓能量站.md` v1.2。若與 v1.1 衝突，以 v1.2 為準。

## 1. 工作原則與分工
- 使用者：產品決策、視覺核准、階段驗收及最終合併授權。
- ChatGPT：PRD、任務切分、驗收標準及變更紀錄。
- **Codex**：計時／引導狀態機、計數演算法、偏好設定與自動測試；審查 Claude Code 的狀態整合。
- **Claude Code**：繁體中文 UI、手機優先響應式、原圖靜態小貓、無障礙、低動態與操作流程；審查 Codex 的互動 API。
- 禁止兩個 agent 同時改同一個檔案；各用獨立 branch/worktree。所有 PR 必須經人工核准合併。

## 2. 建議目錄
```
docs/PRD_心靈小島_小貓能量站.md
docs/WORKFLOW_Codex_ClaudeCode.md
docs/DECISIONS.md
docs/ACCEPTANCE.md
src/features/energy/core/       # Codex: types, state machine, timing
src/features/energy/ui/         # Claude Code: pages, components
src/features/energy/settings/   # Codex: preference adapter
public/assets/cat/original.*   # 原始角色素材；須使用者提供
src/features/energy/tests/      # Codex: unit/integration
```
若已有專案結構，沿用現況並在 Gate 0 提出調整方案，不強制套用以上路徑。

## 3. 分階段 Gate（每一關都先交付、再審核）
### Gate 0｜盤點與契約（**只讀，不寫程式**）
輸入：本 PRD、既有 repo、原始小貓圖片（若已提供）。
Codex：檢視框架、現有測試、路由；提出狀態機 API、計時與背景暫停策略、測試清單。
Claude Code：提出頁面流程、組件結構、手機／平板／桌面配置、文字與無障礙方案。
雙方共同輸出：檔案修改清單、介面契約、風險與依賴；由使用者核准後才能開始 Gate 1。

### Gate 1｜核心引導引擎（Codex）
實作純函式／可測狀態機：`start`, `pause`, `resume`, `tick`, `finishSet`, `startRest`, `pauseRest`, `extendRest`, `skipRest`, `nextSet`, `exit`, `visibilityHidden`。
以單調時鐘累積有效時間；完整「吐氣舉起＋吸氣放下」才加一；背景時暫停，不追補循環；目標達成時停止，不自動下一組。速度變更下循環生效。輸出 typed API 與單元測試。

### Gate 2｜前端與素材（Claude Code）
只在 UI 分支實作入口、引導、完成、休息、設定頁；採既有專案 UI 框架。原始小貓圖作靜態佔位，若原圖未提供用中性框，**不得另生新貓或把六視角參考圖當原圖**。低動態、靜音、鍵盤、觸控操作、夜間模式都要能用。UI 不自行寫第二套計數器。

### Gate 3｜整合與測試
先合併核心 API 再整合 UI；Codex 負責邊界測試與計時可靠性；Claude Code 負責 UI 修正與跨裝置驗證。必須測試暫停、背景、重整、半循環、目標結束、無限模式、休息延長／略過、音訊授權。

### Gate 4｜使用者驗收與交付
提交：可執行 demo、README、測試報告、已知限制、回退方式、截圖與驗收清單。**先由使用者確認，才能合併 main 或部署**。

### Gate 5｜3D 與重量紀錄（後續獨立規格）
正式 3D 小貓必須先確認六視角、再確認 GLB/glTF 模型，最後整合。kg／lb 切換為既定產品決策，但**不在本次 MVP**；若啟動重量紀錄，另行更新 PRD 與測試。

## 4. Branch 與檔案所有權
- Codex：`feature/energy-core`，只能修改 `src/features/energy/core/`, `settings/`, `tests/` 及經批准的型別契約。
- Claude Code：`feature/energy-ui`，只能修改 `src/features/energy/ui/` 及經批准的樣式／靜態素材引用。
- 共享契約先由 Codex 提 PR，Claude Code review 後凍結；變更契約須開新決策紀錄。
- 每次 PR 附：需求 ID、變更摘要、修改檔案、測試結果、風險、畫面截圖（UI PR）、回退方法。

## 5. 必測案例
1. 一個完整 6 秒循環恰加一；半循環加零。
2. 暫停 20 秒與背景 60 秒不增加循環；回前景須手動恢復。
3. 10 次達標只到完成畫面；不限模式不自動完成。
4. 速度變更下一循環生效，不重計；休息 +30 秒與略過準確。
5. 休息倒數結束不自動開始；重整回 idle、不自動發聲。
6. 靜音、低動態、深色模式、鍵盤、螢幕閱讀器及手機瀏覽器可用。
7. 原四大功能不變；無外部追蹤、帳號或健康資料蒐集。

## 6. 可直接貼給 Codex 的啟動指令（Gate 0）
> 你是心靈小島小貓能量站的核心工程負責人。先閱讀 docs/PRD_心靈小島_小貓能量站.md v1.2 和 docs/WORKFLOW_Codex_ClaudeCode.md v1.2，盤點 repo。只做分析，不寫程式、不安裝依賴、不建立分支、不提交。提出狀態機 API、完整循環自動計數規則、背景暫停策略、單元測試矩陣、預計修改檔案與風險。注意「已引導次數」不是實際動作次數；暫停與背景不得補計。等待我核准 Gate 1。

## 7. 可直接貼給 Claude Code 的啟動指令（Gate 0）
> 你是心靈小島小貓能量站的 UI/UX 工程負責人。先閱讀 docs/PRD_心靈小島_小貓能量站.md v1.2 和 docs/WORKFLOW_Codex_ClaudeCode.md v1.2，盤點 repo。只做分析，不寫程式、不安裝依賴、不建立分支、不提交。提出手機優先的五個畫面、元件樹、文案、鍵盤與低動態方案、與 Codex 核心 API 的介面需求、修改檔案清單。只能用使用者原始小貓圖片靜態佔位；缺圖用中性佔位，不得自行換貓。等待我核准 Gate 2。

## 8. 變更控制
需求變更 → 更新 PRD 版本 → 更新工作流／契約 → 使用者批准 → agent 實作 → 交叉審查 → 人工合併。不得因 agent 建議而自行擴大 MVP 範圍。
