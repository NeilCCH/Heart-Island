# 小貓能量站｜Gate 0 UI/UX 提案（Claude Code）
- 日期：2026-10-22
- 狀態：Gate 0 分析成果。使用者 2026-10-22 指示「全部照建議」，裁決記錄於 DECISIONS.md（U1–U6、D01–D08）。**仍不是 Gate 2 授權**。
- 依據：PRD v1.2（唯一規格）、WORKFLOW v1.2、Gate 0 交接包 v0.2（CORE_API_CONTRACT v0.2、DECISIONS、IMPLEMENTATION_PLAN、ACCEPTANCE）。MANIFEST.sha256 九個檔案全數校驗通過；交接包內 PRD/WORKFLOW 與單獨上傳版本逐字相同。

---

## 1. Repo 盤點結果
| 項目 | 現況 | 影響 |
|---|---|---|
| `NeilCCH/Heart-Island` | 只有 `README.md` 一個檔案、一個 Initial commit | 無既有框架可沿用 → D01（Vite+React+TS）需使用者核准 |
| 原四大功能 | **不在此 repo** | T18 回歸無法驗證；需告知宿主專案位置，或確認本 repo 為獨立 demo |
| 原始小貓圖 | 未進 repo | Gate 2 用中性佔位框 |
| 對話附上的六視角圖 | 是「六視角參考圖」 | **依 PRD §3-8 / 驗收第 8 條，不得當作原圖使用**；本提案不引用 |
| Git | 已有 repo（交接包說「不是 Git repo」已過時） | IMPLEMENTATION_PLAN 的分支前提已滿足，`feature/energy-core`、`feature/energy-ui` 待授權建立 |

---

## 2. 對 CORE_API_CONTRACT v0.2 的逐項回應
| # | 項目 | 立場 | 說明 |
|---|---|---|---|
| C1 | 純核心 → controller → hook → UI 分層 | 同意 | UI 只讀 `session/guide/rest`，不呼叫 `performance.now()`、不自建計數 |
| C2 | `useEnergySession` 必須掛在畫面之上 | 同意＋補充 | 我會放在 `EnergyStation` 根元件；切換畫面或開啟設定**不卸載** session |
| C3 | `GuideView` 欄位 | 修改（小） | 請補 `cyclePace` 與 `pendingPace`，讓 UI 顯示「下一個循環起改為 較慢」而不用自己比對 session |
| C4 | 效果 `EnergyEffect` | 修改（小） | 建議新增 `{ type: 'guidancePaused'; reason: PauseReason }`，UI 以事件取消音訊與 Wake Lock，不需 diff 狀態 |
| C5 | `setCompleted` 效果 | 修改（小） | 建議附 `guidedCycles`，供完成畫面的 aria-live 一次播報 |
| C6 | `clearSaved()` 語意 | 同意建議 | UI 分兩個操作：「清除已保存的偏好」（只清 localStorage）與「恢復預設值」（重設記憶體設定） |
| C7 | 10Hz 快照／低動態 1Hz | 同意 | 進度條用 `transform: scaleX()`；低動態改為靜態數字「剩 2 秒」 |
| C8 | `resume` 只限前景 | 同意 | `pauseReason==='hidden'/'interrupted'` 時顯示中性說明＋「繼續」按鈕 |
| C9 | 有效低動態＝設定 OR 系統 | 同意，**UI 負責計算** | `ui/hooks/useEffectiveReducedMotion.ts`（matchMedia），核心不碰 DOM |
| C10 | `readyNext` 下 `extendRest` 非法 | 同意 | readyNext 畫面只給「再休息／下一組／離開」 |
| C11 | D02 骨架所有權（App.tsx 先 Codex 後移交） | 同意 | 移交後 Codex 不再改 `App.tsx` |

> C3–C5 若不採納，UI 仍可做，只是改用 session 比對，程式較繞；請在凍結前一起裁決。

---

## 3. 頁面流程
```
EnergyHome ──開始──▶ GuidedSet ◀──繼續── (暫停/背景/中斷)
   ▲  │設定                │達目標 / 結束本組
   │  ▼                    ▼
 Settings(覆蓋層)      SetComplete ──休息──▶ RestScreen ──時間到/略過──▶ readyNext(同畫面)
   │                      │下一組                                   │下一組 / 再休息
   └──────── 任意畫面「離開」→ idle(EnergyHome) ◀──────────────────────┘
```
- 畫面由 `session.mode` 決定，不引入路由庫；Settings 為 UI 本地狀態的覆蓋層（mode 不變）。
- 重整回 idle、不發聲；休息到期只顯示靜態「休息時間到了」，**不自動下一組**。

---

## 4. 元件樹與檔案清單（全部位於 `src/features/energy/ui/`）
```
EnergyStation.tsx            根：useEnergySettings + useEnergySession + 音訊 + WakeLock + 主題
├─ screens/
│  ├─ EnergyHome.tsx         SafetyNote, TargetPicker, PacePicker, 開始, 設定
│  ├─ GuidedSet.tsx          CatFigure, PhaseCue, PhaseProgress, CycleCounter, SetBadge,
│  │                         PaceInlinePicker, PausedNotice, ControlBar(暫停/繼續・結束本組・離開)
│  ├─ SetComplete.tsx        中性文案, 已引導 X 次, 休息/下一組/離開
│  ├─ RestScreen.tsx         RestCountdown, 暫停/繼續, +30 秒, 略過；readyNext：再休息/下一組/離開
│  └─ SettingsSheet.tsx      聲音開關, 音量+試聽, 低動態, 主題, 清除偏好, 恢復預設
├─ components/
│  Button.tsx, SegmentedControl.tsx (role=radiogroup), ScreenHeading.tsx (聚焦),
│  LiveRegion.tsx, CatFigure.tsx (原圖或中性框), ProgressBar.tsx
├─ audio/useCuePlayer.ts      Web Audio 柔和音；依 onEffects＋授權＋可見狀態播放
├─ hooks/useEffectiveReducedMotion.ts, useThemeAttribute.ts, useWakeLock.ts
├─ copy.ts                    所有繁中文案集中（便於審稿與測試 T16）
├─ styles/tokens.css, *.module.css
└─ __tests__/                 UI 元件測試（Testing Library）
```
不新增任何 UI 套件、狀態管理、路由、字型 CDN（字型用系統字：PingFang TC / Noto Sans TC / Microsoft JhengHei），符合「無外部資料傳輸」。

---

## 5. 響應式配置（手機優先）
| 寬度 | 配置 |
|---|---|
| < 600px（手機直式） | 單欄；上方小貓 ≤ 32vh；中間大字口令；**操作列固定在底部拇指區**，按鈕 ≥ 48px |
| 600–1023px（平板／手機橫式） | 雙欄：左小貓、右口令＋計數＋操作；橫式高度不足時小貓縮成 96px 縮圖 |
| ≥ 1024px（桌面） | 置中 max-width 960px 雙欄，字級上限避免過大 |
- 使用 `100dvh` 與 `env(safe-area-inset-*)` 處理 iOS 瀏覽器列與瀏海。
- 重訓時不鼓勵盯螢幕：口令字級手機 ≥ 32px、對比 ≥ 7:1，遠距可讀。

---

## 6. 文案（草案，集中於 `copy.ts`）
| 位置 | 文案 |
|---|---|
| 標題 | 小貓能量站 |
| 示範標示 | 示範：啞鈴彎舉／一般輕量動作 |
| 安全說明 | 不需要勉強跟上；感到頭暈、胸痛、呼吸困難或明顯不適時，請停止並尋求適當協助。 |
| 次數說明 | 這裡記的是「引導播放了幾次」，不是你實際做了幾下。沒跟上也沒關係。 |
| 目標選項 | 不限・6・8・10・12 次引導 |
| 節奏選項 | 較慢（8 秒）・舒緩（6 秒）・稍快（4 秒） |
| 階段口令 | 自然吐氣・慢慢舉起 ／ 自然吸氣・慢慢放下 |
| 計數 | 已引導 X 次（有目標時：已引導 X 次／目標 10） |
| 組別 | 第 N 組 |
| 速度待生效 | 下一個循環起改為「較慢」 |
| 暫停（使用者） | 已暫停。準備好再按「繼續」。 |
| 暫停（背景／中斷） | 剛剛離開了畫面，已幫你暫停。準備好再按「繼續」。 |
| 完成 | 這一組的引導到這裡。可以休息，也可以結束。 |
| 休息到期 | 休息時間到了。準備好再開始下一組。 |
| 按鈕 | 開始・暫停・繼續・結束本組・離開・休息・下一組・+30 秒・略過・再休息・設定 |
禁用字詞檢查（T16）：失敗、落後、必須完成、沒跟上（否定句除外的「沒跟上也沒關係」須人工核可）、獎章、分數、排名、連續打卡、偵測、實際完成。

---

## 7. 無障礙、鍵盤與低動態
- **焦點**：每次畫面切換，焦點移到該畫面 `<h1 tabindex="-1">`；覆蓋層開啟時焦點鎖在內部，關閉後回到「設定」按鈕。
- **aria-live**：
  - `polite`：階段切換只播「吐氣舉起」／「吸氣放下」短句＋循環完成時播「已引導 X 次」；**不播倒數秒數或進度**。
  - `assertive`：僅用於「已自動暫停（離開畫面）」。
  - 進度條 `role="progressbar"` 不放進 live region，避免每 100ms 播報。
- **鍵盤**：全部按鈕可 Tab；`空白鍵`＝暫停／繼續（焦點不在按鈕上時）。**不設 Esc 離開**（DECISIONS 8e 規定離開不確認，Esc 太容易誤觸）。
- **觸控**：點擊區 ≥ 44×44 CSS px，主按鈕 48px；按鈕間距 ≥ 8px。
- **色彩**：狀態一律有文字，不只靠顏色；焦點環 3px 高對比；淺／深色兩組 token。
- **低動態**：無呼吸縮放動畫、進度條無過渡，改為「剩 N 秒」數字 1Hz 更新；從不閃爍。
- **音訊**：預設靜音；首次開聲須使用者點擊（同時解鎖 AudioContext）；暫停／背景／離開立即停止；只播當下有效提示，不補播。

---

## 8. 測試計畫（UI 部分，對應 ACCEPTANCE）
| ACCEPTANCE | UI 測試 |
|---|---|
| T11 | StrictMode 下 onEffects 不重播音效；連點按鈕不重複動作 |
| T12 | 重整後畫面為 EnergyHome、AudioContext 未建立 |
| T14 | 聲音關閉／AudioContext 失敗時所有按鈕仍可完成完整流程 |
| T15 | axe 自動檢查＋鍵盤走完全流程；焦點落點斷言；live region 文字快照 |
| T16 | 掃描 `copy.ts` 與渲染結果的禁用字詞 |
| T17 | Playwright Chromium/WebKit 截圖（360×740、768×1024、1280×800，淺/深色）；**iOS Safari、Android Chrome 須真機**，WebKit 不得宣稱 iOS 通過 |
| 驗收 8 | 斷言 CatFigure 只引用 `public/assets/cat/original.*` 或佔位框 |
UI 測試使用 Codex 提供的可注入時鐘 adapter，不自寫第二套假計時規則。

---

## 9. 風險與需要你裁決的事項
| ID | 事項 | 我的建議 |
|---|---|---|
| **U1** | **手機自動鎖屏**：手機 30 秒～1 分鐘沒碰就鎖屏 → 依 PRD 會自動暫停，訓練中會一直被打斷 | 引導與休息期間使用 **Screen Wake Lock API** 保持螢幕亮（不需權限、不傳資料；離開/暫停即釋放；不支援的瀏覽器顯示一行提示）。純 UI 實作，不改契約 |
| U2 | 螢幕閱讀器每 3 秒播報階段 | 預設播報短句；若體驗太吵，Gate 2 加一個「播報階段」設定（需新增設定欄位＝契約變更） |
| U3 | PRD 提到「語音／柔和提示音」 | MVP 先做柔和提示音；語音（speechSynthesis）各裝置繁中語音品質不一，建議延後 |
| U4 | 原始小貓圖 | 請提供**核准的原始單張照片**放進 `public/assets/cat/original.*`；未提供就用中性框。附上的六視角圖不使用 |
| U5 | 原四大功能宿主 | 請確認：本 repo 是獨立 demo，還是要整合進另一個專案？ |
| U6 | 契約小修 C3–C5 | 建議採納後凍結 v0.3 |
| D01–D08 | 交接包既有待決項 | UI 端同意 D01、D02、D07；D03/D04 待實測；D05/D06 由你決定，UI 兩種都支援 |

---

## 10. 下一步（等待核准）
1. 你裁決 D01–D08、U1–U6 → 更新 DECISIONS（實際核准日期）。
2. Codex 依凍結契約進 Gate 1（骨架＋核心＋adapter）。
3. 你核准 Gate 2 後，我才在 `feature/energy-ui` 只改 `src/features/energy/ui/` 及核准的樣式／素材引用。
