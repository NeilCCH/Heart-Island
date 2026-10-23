// 每次完整引導循環（吐氣舉起＋吸氣放下）的秒數，整數 PACE_MIN..PACE_MAX；兩段各佔一半。
export type Pace = number;
// 陪伴的萌寵（小貓或小狗），能量站與陪伴屋共用。
export type Pet = 'cat' | 'dog';
export type RepTarget = 6 | 8 | 10 | 12 | null;
export type Phase = 'exhaleLift' | 'inhaleLower';
export type Mode = 'idle' | 'guiding' | 'pausedGuiding' | 'setComplete' | 'resting' | 'pausedRest' | 'readyNext';
export type PauseReason = 'user' | 'hidden' | 'interrupted';
export type SetEndReason = 'target' | 'manual';
export interface EnergySettings {
  pace: Pace; target: RepTarget; restSeconds: 30 | 60 | 90 | 120 | 180;
  soundEnabled: boolean; volume: number; reducedMotion: boolean;
  theme: 'system' | 'light' | 'dark'; pet: Pet;
}
export interface EnergySession {
  mode: Mode; setIndex: number; guidedCycles: number; phase: Phase | null;
  activeElapsedMs: number; cycleElapsedMs: number; target: RepTarget;
  cyclePace: Pace | null; pendingPace: Pace; pauseReason: PauseReason | null;
  restRemainingMs: number; restTotalMs: number; setEndReason: SetEndReason | null;
}
export interface EnergyState {
  session: EnergySession; lastObservedAtMs: number | null; nextEffectId: number; isHidden: boolean;
}
export type EnergyCommand =
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
export type EnergyEffect = { id: number } & (
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'cycleCompleted'; guidedCycles: number }
  | { type: 'setCompleted'; reason: SetEndReason; guidedCycles: number }
  | { type: 'guidancePaused'; reason: PauseReason }
  | { type: 'restFinished' }
);
export interface GuideView {
  phase: Phase; phaseRemainingMs: number; phaseDurationMs: number;
  phaseRatio: number; guidedCycles: number; target: RepTarget;
  setIndex: number; pauseReason: PauseReason | null;
  cyclePace: Pace; pendingPace: Pace; // 兩者不同時，UI 顯示「下一個循環起改為…」
}
export interface RestView { remainingMs: number; totalMs: number; finished: boolean }
export interface EnergyActions {
  start(): void; pause(): void; resume(): void; finishSet(): void;
  startRest(): void; pauseRest(): void; resumeRest(): void;
  extendRest(): void; skipRest(): void; nextSet(): void;
  setPace(pace: Pace): void; exit(): void;
}
export interface EnergyRuntimeDependencies {
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(id: number): void;
  isHidden(): boolean;
  subscribeLifecycle(callback: (event: 'hidden' | 'visible') => void): () => void;
}
