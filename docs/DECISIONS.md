# 決策候選紀錄
日期：2026-10-22；狀態：已裁決（見下表），共享契約待交叉審查後凍結。裁決不等於 Gate 1/Gate 2 實作授權。

## 已有規格依據
- PRD v1.2：完整引導循環才計數；不是實際動作偵測。
- 背景引導及休息自動暫停；前景手動恢復；重整回idle。
- 不強制下一組，預設靜音，僅保存偏好，不保存個別訓練歷史。
- 原四大功能、3D、重量紀錄、登入、感測均不在本次實作範圍。

## 使用者裁決（2026-10-22）
使用者指示「全部都照建議」。以下為實際核准內容；標「暫定」者仍須依實測調整，調整時另開紀錄。

| ID | 核准內容 | 狀態 |
|---|---|---|
| D01 | Vite+React+TypeScript；Vitest/Testing Library/Playwright | 已核准 |
| D02 | Codex建骨架及測試設定（新增所有權），App.tsx 最小入口後移交Claude Code | 已核准 |
| D03 | >2000ms觀測間隔觸發 interrupted 暫停 | 已核准（暫定，待體驗驗證） |
| D04 | 一般前景顯示延遲250ms為驗收目標 | 已核准（暫定，待實測） |
| D05 | 「記住我的偏好」開關，預設關閉；政策介面見 CORE_API_CONTRACT v0.3 | 已核准 |
| D06 | 音量預設0.5 | 已核准 |
| D07 | CORE_API_CONTRACT 以 v0.3（含 U6 修改）為基準 | 已核准；待 Codex 交叉審查後凍結 |
| D08 | 小貓圖未核准；UI 用中性佔位。六視角參考圖不得當原圖 | 已核准 |
| U1 | 引導與休息期間使用 Screen Wake Lock 保持螢幕亮；暫停/離開/背景釋放；不支援時一行提示。純UI，不改核心 | 已核准 |
| U2 | 螢幕閱讀器預設以 polite 播報階段短句與完成次數，不播倒數；過吵時再加開關（屆時為契約變更） | 已核准 |
| U3 | MVP 只做柔和提示音；語音（speechSynthesis）延後 | 已核准 |
| U4 | 原始小貓單張照片待使用者提供至 public/assets/cat/original.*；未提供前用中性框 | 待使用者提供素材 |
| U5 | 原四大功能宿主位置 | **待使用者回覆**；未回覆前本 repo 視為獨立 demo，T18 不得標通過 |
| U6 | 契約小修：GuideView 增 cyclePace/pendingPace；新增 guidancePaused 效果；setCompleted 附 guidedCycles | 已核准（併入 v0.3） |

## 下一步授權狀態
- Gate 0：完成。
- Gate 1（Codex）：決策已裁決；待 Codex 交叉審查 v0.3 契約並由使用者明確授權後開始。
- Gate 2（Claude Code）：**尚未授權**；須使用者另行明確核准。

## UI草案逐條回應摘要
0 同意技術棧，骨架所有權需新增授權。
1 同意時間唯一來源；修改為純核心/controller/React adapter分層。
2 同意補欄位；新增cycleElapsedMs/pendingPace/interrupted；輸出事件改名EnergyEffect。
3 統一transition；actions保留具名操作，補resumeRest。
4 修改selectors為只讀snapshot，不接now。
5 採onEffects；進度節流不延遲語意變化；exit不移除尚需使用的生命週期訂閱。
6 同意版本與驗證；寫入失敗不回退目前記憶體設定；保存開關未決。
7 同意完整循環計數、達標停止、休息只提示。
8a-e 均同意：完成可直接下一組、可再休息、組內鎖目標、當次休息長度不隨設定改變、exit不確認。
9 同意測試；提供注入時鐘adapter而非第二套mock規則。

## 凍結方式
使用者裁決 → 在本表記錄實際核准內容與日期 → 同步來源docs及契約 → 交叉審查 → 授權對應Gate。不能把提案日期當成核准日期。

## 2026-10-22 最新授權與執行紀錄
- 使用者「我只要你們兩個快點用好」後，Codex已明示並開始Gate1/Gate2協作；main合併/部署保留人工驗收。
- 正面六視角裁切圖獲本輪實作採用：僅裁掉標籤，無生成或重繪，517×450 PNG。此為核准角色裁切素材，不稱原始照片。覆蓋舊D08/U4素材待定狀態。
- v0.3四項新增API交叉審查同意；釐清clearSaved會關閉remember、儲存失敗回傳storageError及內部isHidden，見CODEX_CROSS_REVIEW.md。

## 2026-10-22 小貓去背呈現
- 使用者要求「把小貓去背，呈現像立體站在畫面上」。以 rembg（isnet-general-use）對 public/assets/cat/original.png 去背並裁到主體，存為 public/assets/cat/cutout.png（361×436，透明背景）。只移除背景，未重繪、未生成、未換貓；original.png 保留未動。
- 立體感只用 CSS 靜態地面光暈、腳下接觸陰影與 drop-shadow；無動畫、無互動、非 3D 模型，符合 PRD §3-8。
