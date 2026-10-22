# 核心 API 契約草案 v0.3
狀態：使用者已於 2026-10-22 核准 v0.3 修改內容（DECISIONS D05/D07/U6）；**Codex已交叉審查，實作釐清見 CODEX_CROSS_REVIEW.md**。以 PRD v1.2 為準。

v0.3 變更（相對 v0.2）：GuideView 增 `cyclePace`/`pendingPace`；新增 `guidancePaused` 效果；`setCompleted` 附 `guidedCycles`；`useEnergySettings` 補「記住偏好」政策介面與 `resetToDefaults`。

## 架構
純狀態機 → 注入單調時鐘的 controller → React hook → UI。UI 不自行計時或計數，selector 不接 now、不推進時間。React/DOM/rAF 不進入純核心。

```ts
type Pace = 'slow' | 'gentle' | 'brisk';
type RepTarget = 6 | 8 | 10 | 12 | null;
type Phase = 'exhaleLift' | 'inhaleLower';
type Mode = 'idle' | 'guiding' | 'pausedGuiding' | 'setComplete' | 'resting' | 'pausedRest' | 'readyNext';
type PauseReason = 'user' | 'hidden' | 'interrupted';
type SetEndReason = 'target' | 'manual';
interface EnergySettings {
  pace: Pace; target: RepTarget; restSeconds: 30 | 60 | 90 | 120 | 180;
  soundEnabled: boolean; volume: number; reducedMotion: boolean;
  theme: 'system' | 'light' | 'dark';
}
interface EnergySession {
  mode: Mode; setIndex: number; guidedCycles: number; phase: Phase | null;
  activeElapsedMs: number; cycleElapsedMs: number; target: RepTarget;
  cyclePace: Pace | null; pendingPace: Pace; pauseReason: PauseReason | null;
  restRemainingMs: number; restTotalMs: number; setEndReason: SetEndReason | null;
}
interface EnergyState {
  session: Readonly<EnergySession>; lastObservedAtMs: number | null; nextEffectId: number;
}
type EnergyCommand =
  | { type: 'start'; settings: EnergySettings }
  | { type: 'pause' } | { type: 'resume' } | { type: 'tick' }
  | { type: 'finishSet' }
  | { type: 'startRest'; seconds: EnergySettings['restSeconds'] }
  | { type: 'pauseRest' } | { type: 'resumeRest' }
  | { type: 'extendRest' } | { type: 'skipRest' }
  | { type: 'nextSet'; settings: EnergySettings }
  | { type: 'setPace'; pace: Pace }
  | { type: 'visibilityHidden' } | { type: 'visibilityVisible' }
  | { type: 'exit' };
type EnergyEffect = { id: number } & (
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'cycleCompleted'; guidedCycles: number }
  | { type: 'setCompleted'; reason: SetEndReason; guidedCycles: number }
  | { type: 'guidancePaused'; reason: PauseReason }
  | { type: 'restFinished' }
);
interface GuideView {
  phase: Phase; phaseRemainingMs: number; phaseDurationMs: number;
  phaseRatio: number; guidedCycles: number; target: RepTarget;
  setIndex: number; pauseReason: PauseReason | null;
  cyclePace: Pace; pendingPace: Pace; // 兩者不同時，UI 顯示「下一個循環起改為…」
}
interface RestView { remainingMs: number; totalMs: number; finished: boolean }
interface EnergyActions {
  start(): void; pause(): void; resume(): void; finishSet(): void;
  startRest(): void; pauseRest(): void; resumeRest(): void;
  extendRest(): void; skipRest(): void; nextSet(): void;
  setPace(pace: Pace): void; exit(): void;
}
interface EnergyRuntimeDependencies {
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(id: number): void;
  isHidden(): boolean;
  subscribeLifecycle(callback: (event: 'hidden' | 'visible') => void): () => void;
}
declare function transition(state: Readonly<EnergyState>, command: EnergyCommand,
  nowMs: number): { state: EnergyState; effects: readonly EnergyEffect[] };
declare function getGuideView(s: Readonly<EnergySession>): GuideView | null;
declare function getRestView(s: Readonly<EnergySession>): RestView | null;
declare function useEnergySession(settings: EnergySettings, options?: {
  onEffects?: (effects: readonly EnergyEffect[]) => void;
  dependencies?: EnergyRuntimeDependencies;
}): { session: Readonly<EnergySession>; guide: GuideView | null;
  rest: RestView | null; actions: EnergyActions };
declare function useEnergySettings(): {
  settings: EnergySettings; update(partial: Partial<EnergySettings>): void;
  remember: boolean;                 // 預設 false
  setRemember(on: boolean): void;    // on：立即寫入；off：清除本功能儲存，記憶體設定不變
  clearSaved(): void;                // 只清 localStorage，不中斷 session、不改記憶體設定
  resetToDefaults(): void;           // 記憶體設定回預設；remember 為 true 時同步寫入
};
```

以上是簽名規格，並非已可編譯的套件。持久化政策：只有 remember=true 才寫入 localStorage；存在合法紀錄即視為 remember=true，否則為 false。

## 狀態規則
| 起點／事件 | 結果 |
|---|---|
| idle / start | 第1組、0次、exhaleLift |
| guiding / pause | pausedGuiding，保留進度 |
| pausedGuiding / resume | 前景下手動恢復 |
| exhaleLift 完成 | inhaleLower，不加次數 |
| inhaleLower 完成 | 次數+1；達目標 setComplete，否則下一循環 |
| guiding 或 pausedGuiding / finishSet | setComplete，未完成循環不計 |
| setComplete / startRest | resting，鎖定此次休息長度 |
| resting / pauseRest | pausedRest |
| pausedRest / resumeRest | 前景下手動恢復 resting |
| resting 或 pausedRest / extendRest | remaining 與 total 同加30000ms，保持模式 |
| resting 到期，或 resting/pausedRest / skipRest | readyNext |
| readyNext / startRest | 以最新休息設定重新開始 |
| setComplete 或 readyNext / nextSet | 組別+1，次數歸零，開始引導 |
| 任意模式 / exit | 清空當次資料、回 idle |

非法事件不改變狀態、不結算時間、不發效果。idle 的 setIndex=0；活動組從1開始。guide 在 guiding/pausedGuiding 有值；rest 在 resting/pausedRest/readyNext 有值，其他為 null。readyNext 的 finished=true。phaseRatio 是已經過比例，限制0..1。

## 時間與背景
8/6/4秒循環各分為相等兩階段。activeElapsedMs 是本組有效時間；cycleElapsedMs 是目前循環有效時間。使用 performance.now() 的單調差值，不數 interval 次數。一般有效前景操作先結算再轉移；完整循環可計入，半循環不能計入。

visibilityHidden、exit、長時間中斷不追補不確定區間。背景引導與休息皆暫停，回前景不自動恢復。pagehide/pageshow 對應同一政策。重整回 idle，不恢復聲音。裝置凍結可能不送事件，需真機驗證。

觀測間隔 >2000ms 時以 interrupted 暫停、丟棄該段時間；D03已核准暫定值，待體驗驗證。假時鐘測長循環需按正常觀測步幅推進；大跨度測試專門驗證中斷保護，不能混為一般時間累積。

一般進度快照10Hz，低動態1Hz；模式、階段、計數與操作結果立即發布。邏輯觀測獨立於快照節流。假時鐘6000ms恰加1、5999ms不加；前景顯示延遲250ms僅為待實測目標。

## 效果與音訊
onEffects 批次交付，不使用 lastEvent；每個效果只消費一次，React StrictMode 不得重播。背景及回前景不發可播音效果；靜默結算不回補歷史口令。正常前景只播放目前有效提示，不連播已過階段。UI 依主動授權、設定及當前可見狀態播音；暫停、離開、背景時取消音訊。任何原因（user/hidden/interrupted）進入 pausedGuiding 時發出 `guidancePaused`，UI 以此取消音訊並釋放 Wake Lock。核心不呼叫音訊API。

## 設定
預設 gentle/10/90秒/靜音/音量0.5/低動態false/theme system；音量0.5已由D06核准。有效低動態=設定開啟或系統偏好開啟。
每組目標鎖定，guiding/pausedGuiding 不修改本組目標。最新速度在下一循環生效。休息設定變更只影響下次休息。儲存只含設定，以版本key及逐欄驗證；讀取失敗回預設，寫入失敗保留記憶體設定。clearSaved 僅清除此功能儲存，不中斷session、不重設記憶體設定；重設由 resetToDefaults 負責。

## 生命週期
exit 停止排程及清空session；生命週期監聽器保留到卸載，以便重新start。卸載全部清理。排程以世代識別碼阻擋舊回呼；測試訂閱與清理的冪等性。

## v0.3.1 實作釐清
內部EnergyState增加isHidden；偏好hook增加storageError；clearSaved將remember設false，保留記憶體設定。完整規則見CODEX_CROSS_REVIEW.md。
