import type { EnergyState, EnergySession, EnergyCommand, EnergyEffect, EnergySettings, Pace, PauseReason, GuideView, RestView } from './types';
export const PACE_MIN = 4;
export const PACE_MAX = 16;
export const DEFAULT_PACE: Pace = 6;
// v0.3 以前保存的固定節奏名稱，讀取時轉成秒數。
export const LEGACY_PACE: Record<string, Pace> = { slow: 8, gentle: 6, brisk: 4 };
export function normalizePace(value: unknown): Pace | null {
  if (typeof value === 'string' && value in LEGACY_PACE) return LEGACY_PACE[value];
  if (typeof value === 'number' && Number.isInteger(value) && value >= PACE_MIN && value <= PACE_MAX) return value;
  return null;
}
export const cycleMs = (pace: Pace) => pace * 1000;
export const INTERRUPTION_MS = 2000;
export function createInitialState(): EnergyState {
  return { session: { mode: 'idle', setIndex: 0, guidedCycles: 0, phase: null,
    activeElapsedMs: 0, cycleElapsedMs: 0, target: 10, cyclePace: null,
    pendingPace: DEFAULT_PACE, pauseReason: null, restRemainingMs: 0, restTotalMs: 0,
    setEndReason: null }, lastObservedAtMs: null, nextEffectId: 1, isHidden: false };
}
const active = (s: EnergySession) => s.mode === 'guiding' || s.mode === 'resting';
const guiding = (s: EnergySession) => s.mode === 'guiding' || s.mode === 'pausedGuiding';
const resting = (s: EnergySession) => s.mode === 'resting' || s.mode === 'pausedRest';
type EffectPayload = EnergyEffect extends infer E ? E extends EnergyEffect ? Omit<E, 'id'> : never : never;
export function transition(previous: Readonly<EnergyState>, command: EnergyCommand, nowMs: number): { state: EnergyState; effects: readonly EnergyEffect[] } {
  const mode = previous.session.mode;
  const allowed = command.type === 'exit' || command.type === 'visibilityHidden' || command.type === 'visibilityVisible' || command.type === 'setPace'
    || (command.type === 'start' && mode === 'idle')
    || (command.type === 'tick' && active(previous.session))
    || (command.type === 'pause' && mode === 'guiding')
    || (command.type === 'resume' && mode === 'pausedGuiding' && !previous.isHidden)
    || (command.type === 'finishSet' && guiding(previous.session))
    || (command.type === 'startRest' && (mode === 'setComplete' || mode === 'readyNext') && !previous.isHidden)
    || (command.type === 'pauseRest' && mode === 'resting')
    || (command.type === 'resumeRest' && mode === 'pausedRest' && !previous.isHidden)
    || ((command.type === 'extendRest' || command.type === 'skipRest') && resting(previous.session))
    || (command.type === 'nextSet' && (mode === 'setComplete' || mode === 'readyNext') && !previous.isHidden);
  const invalidPace = (command.type === 'setPace' && normalizePace(command.pace) === null)
    || ((command.type === 'start' || command.type === 'nextSet') && normalizePace(command.settings.pace) === null);
  if (!allowed || invalidPace || (command.type === 'start' && previous.isHidden)) return { state: previous, effects: [] };
  const state: EnergyState = { ...previous, session: { ...previous.session } };
  let s = state.session;
  let effects: EnergyEffect[] = [];
  const emit = (payload: EffectPayload) => effects.push({ ...payload, id: state.nextEffectId++ } as EnergyEffect);
  function pause(reason: PauseReason) {
    if (s.mode === 'guiding') { s.mode = 'pausedGuiding'; s.pauseReason = reason; emit({ type: 'guidancePaused', reason }); }
    else if (s.mode === 'resting') { s.mode = 'pausedRest'; s.pauseReason = reason; }
    state.lastObservedAtMs = null;
  }
  function complete(reason: 'target' | 'manual') {
    s.mode = 'setComplete'; s.phase = null; s.cyclePace = null; s.cycleElapsedMs = 0;
    s.pauseReason = null; s.setEndReason = reason; state.lastObservedAtMs = null;
    emit({ type: 'setCompleted', reason, guidedCycles: s.guidedCycles });
  }
  function begin(settings: EnergySettings, index: number) {
    s = { ...createInitialState().session, mode: 'guiding', setIndex: index,
      target: settings.target, cyclePace: settings.pace, pendingPace: settings.pace, phase: 'exhaleLift' };
    state.session = s; state.lastObservedAtMs = nowMs;
    emit({ type: 'phaseChanged', phase: 'exhaleLift' });
  }
  if (command.type === 'visibilityHidden') {
    state.isHidden = true; pause('hidden'); return { state, effects };
  }
  if (command.type === 'visibilityVisible') {
    state.isHidden = false;
    // A pageshow can arrive without an earlier pagehide. Never resume or catch up.
    pause('hidden'); return { state, effects };
  }
  if (command.type === 'exit') {
    state.session = createInitialState().session; state.lastObservedAtMs = null; return { state, effects };
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) { if (active(s)) pause('interrupted'); return { state, effects }; }
  if (active(s) && state.lastObservedAtMs !== null) {
    const delta = nowMs - state.lastObservedAtMs;
    if (delta < 0 || delta > INTERRUPTION_MS) {
      pause('interrupted');
      // Preserve explicit stop/setting actions, but never resume in the same event.
      if (command.type === 'finishSet') complete('manual');
      else if (command.type === 'skipRest' && resting(s)) { s.mode = 'readyNext'; s.pauseReason = null; s.restRemainingMs = 0; }
      else if (command.type === 'extendRest' && resting(s)) { s.restTotalMs += 30000; s.restRemainingMs += 30000; }
      else if (command.type === 'setPace') s.pendingPace = command.pace;
      return { state, effects };
    }
    state.lastObservedAtMs = nowMs;
    if (s.mode === 'resting') {
      s.restRemainingMs = Math.max(0, s.restRemainingMs - delta);
      if (s.restRemainingMs === 0) { s.mode = 'readyNext'; state.lastObservedAtMs = null; emit({ type: 'restFinished' }); }
    } else {
      let remaining = delta;
      while (remaining > 0 && s.mode === 'guiding') {
        const duration = cycleMs(s.cyclePace!);
        const boundary = s.phase === 'exhaleLift' ? duration / 2 : duration;
        const used = Math.min(remaining, boundary - s.cycleElapsedMs);
        s.cycleElapsedMs += used; s.activeElapsedMs += used; remaining -= used;
        if (s.cycleElapsedMs < boundary) break;
        if (s.phase === 'exhaleLift') { s.phase = 'inhaleLower'; emit({ type: 'phaseChanged', phase: s.phase }); }
        else {
          s.guidedCycles += 1; emit({ type: 'cycleCompleted', guidedCycles: s.guidedCycles });
          if (s.target !== null && s.guidedCycles >= s.target) complete('target');
          else { s.cycleElapsedMs = 0; s.cyclePace = s.pendingPace; s.phase = 'exhaleLift'; emit({ type: 'phaseChanged', phase: s.phase }); }
        }
      }
    }
  }
  switch (command.type) {
    case 'start': begin(command.settings, 1); break;
    case 'nextSet': begin(command.settings, s.setIndex + 1); break;
    case 'pause': if (s.mode === 'guiding') pause('user'); break;
    case 'pauseRest': if (s.mode === 'resting') pause('user'); break;
    case 'resume': s.mode = 'guiding'; s.pauseReason = null; state.lastObservedAtMs = nowMs; emit({ type: 'phaseChanged', phase: s.phase! }); break;
    case 'resumeRest': s.mode = 'resting'; s.pauseReason = null; state.lastObservedAtMs = nowMs; break;
    case 'finishSet': if (guiding(s)) complete('manual'); break;
    case 'startRest': s.mode = 'resting'; s.pauseReason = null; s.restTotalMs = command.seconds * 1000; s.restRemainingMs = s.restTotalMs; state.lastObservedAtMs = nowMs; break;
    case 'extendRest': if (resting(s)) { s.restTotalMs += 30000; s.restRemainingMs += 30000; } break;
    case 'skipRest': if (resting(s)) { s.mode = 'readyNext'; s.pauseReason = null; s.restRemainingMs = 0; state.lastObservedAtMs = null; } break;
    case 'setPace': s.pendingPace = command.pace; break;
    case 'tick': break;
  }
  // Commands that pause/end must not start a cue for a phase just crossed.
  if (command.type === 'pause' || command.type === 'finishSet') effects = effects.filter(e => e.type !== 'phaseChanged');
  return { state, effects };
}
export function getGuideView(s: Readonly<EnergySession>): GuideView | null {
  if (!guiding(s) || !s.cyclePace || !s.phase) return null;
  const phaseDurationMs = cycleMs(s.cyclePace) / 2;
  const elapsed = s.cycleElapsedMs - (s.phase === 'inhaleLower' ? phaseDurationMs : 0);
  return { phase: s.phase, phaseDurationMs, phaseRemainingMs: Math.max(0, phaseDurationMs - elapsed), phaseRatio: Math.min(1, Math.max(0, elapsed / phaseDurationMs)), guidedCycles: s.guidedCycles, target: s.target, setIndex: s.setIndex, pauseReason: s.pauseReason, cyclePace: s.cyclePace, pendingPace: s.pendingPace };
}
export function getRestView(s: Readonly<EnergySession>): RestView | null {
  return resting(s) || s.mode === 'readyNext' ? { remainingMs: s.restRemainingMs, totalMs: s.restTotalMs, finished: s.mode === 'readyNext' } : null;
}
