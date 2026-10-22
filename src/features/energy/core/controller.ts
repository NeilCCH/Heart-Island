import { createInitialState, transition } from './machine';
import type { EnergyState, EnergyCommand, EnergyEffect, EnergySettings, EnergyRuntimeDependencies } from './types';
const running = (s: EnergyState) => s.session.mode === 'guiding' || s.session.mode === 'resting';
export function createEnergyController(initialSettings: EnergySettings, runtime: EnergyRuntimeDependencies, onEffects?: (effects: readonly EnergyEffect[]) => void) {
  let settings = initialSettings;
  let state = createInitialState();
  let snapshot = Object.freeze({ ...state.session });
  const listeners = new Set<() => void>();
  let frame: number | null = null;
  let connected = false;
  let generation = 0;
  let unsubscribe: (() => void) | null = null;
  let lastPublish = -Infinity;
  function publish(now: number, force: boolean) {
    if (!force && now - lastPublish < (settings.reducedMotion ? 1000 : 100)) return;
    lastPublish = now; snapshot = Object.freeze({ ...state.session });
    listeners.forEach(listener => listener());
  }
  function stopFrame() { generation++; if (frame !== null) runtime.cancelFrame(frame); frame = null; }
  function schedule() {
    if (!connected || !running(state) || frame !== null) return;
    const current = generation;
    frame = runtime.requestFrame(() => {
      if (!connected || current !== generation) return;
      frame = null;
      dispatch(runtime.isHidden() ? { type: 'visibilityHidden' } : { type: 'tick' });
    });
  }
  function dispatch(command: EnergyCommand) {
    const now = runtime.now();
    // A missing/delayed browser lifecycle event must not allow a hidden start.
    if (runtime.isHidden() && command.type !== 'visibilityHidden' && command.type !== 'exit') {
      const hidden = transition(state, { type: 'visibilityHidden' }, now); state = hidden.state;
      stopFrame(); publish(now, true); if (hidden.effects.length) onEffects?.(hidden.effects);
      return;
    }
    const before = state;
    const result = transition(state, command, now); state = result.state;
    if (!running(state)) stopFrame();
    if (state !== before) publish(now, command.type !== 'tick' || result.effects.length > 0 || state.session.mode !== before.session.mode);
    // Schedule before notifying consumers so their callback cannot leave us half-initialized.
    schedule();
    if (result.effects.length) onEffects?.(result.effects);
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setSettings(next: EnergySettings) { const changed = next.pace !== settings.pace; settings = next; if (changed) dispatch({ type: 'setPace', pace: next.pace }); },
    connect() {
      if (connected) return; connected = true;
      unsubscribe = runtime.subscribeLifecycle(event => dispatch({ type: event === 'hidden' ? 'visibilityHidden' : 'visibilityVisible' }));
      dispatch({ type: runtime.isHidden() ? 'visibilityHidden' : 'visibilityVisible' });
      schedule();
    },
    disconnect() {
      connected = false; stopFrame(); unsubscribe?.(); unsubscribe = null;
      if (running(state)) { state = transition(state, { type: 'visibilityHidden' }, runtime.now()).state; snapshot = Object.freeze({ ...state.session }); }
    },
    actions: {
      start: () => dispatch({ type: 'start', settings }), pause: () => dispatch({ type: 'pause' }), resume: () => dispatch({ type: 'resume' }),
      finishSet: () => dispatch({ type: 'finishSet' }), startRest: () => dispatch({ type: 'startRest', seconds: settings.restSeconds }),
      pauseRest: () => dispatch({ type: 'pauseRest' }), resumeRest: () => dispatch({ type: 'resumeRest' }),
      extendRest: () => dispatch({ type: 'extendRest' }), skipRest: () => dispatch({ type: 'skipRest' }),
      nextSet: () => dispatch({ type: 'nextSet', settings }), setPace: (pace: EnergySettings['pace']) => dispatch({ type: 'setPace', pace }),
      exit: () => dispatch({ type: 'exit' }),
    },
  };
}
export function browserRuntime(): EnergyRuntimeDependencies {
  return {
    now: () => performance.now(), requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id),
    isHidden: () => document.hidden,
    subscribeLifecycle(callback) {
      const visibility = () => callback(document.hidden ? 'hidden' : 'visible');
      const hide = () => callback('hidden'); const show = () => callback(document.hidden ? 'hidden' : 'visible');
      document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show);
      return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); };
    },
  };
}
