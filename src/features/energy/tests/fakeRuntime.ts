import type { EnergyRuntimeDependencies } from '../core/types';
export function fakeRuntime() {
  let time = 0; let hidden = false; let next = 1;
  const frames = new Map<number, () => void>();
  const listeners = new Set<(event: 'hidden' | 'visible') => void>();
  const runtime: EnergyRuntimeDependencies = {
    now: () => time, isHidden: () => hidden,
    requestFrame(callback) { const id = next++; frames.set(id, callback); return id; },
    cancelFrame(id) { frames.delete(id); },
    subscribeLifecycle(callback) { listeners.add(callback); return () => { listeners.delete(callback); }; },
  };
  return { runtime,
    step(ms: number) { time += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    advance(ms: number, stride = 50) { while (ms > 0) { const used = Math.min(stride, ms); this.step(used); ms -= used; } },
    visibility(value: boolean) { hidden = value; listeners.forEach(callback => callback(value ? 'hidden' : 'visible')); },
    frameCount: () => frames.size, listenerCount: () => listeners.size,
    captureFrame: () => [...frames.values()][0],
  };
}
