// @vitest-environment jsdom
import { StrictMode, type PropsWithChildren } from 'react';
import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { useEnergySession } from '../core/useEnergySession';
import { useEnergySettings } from '../settings/useEnergySettings';
import { DEFAULT_SETTINGS } from '../settings/preferences';
import { fakeRuntime } from './fakeRuntime';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), get length() { return values.size; } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const Wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
it('StrictMode無重複效果與排程，重整式重掛回idle', () => {
  const clock = fakeRuntime(); const effect = vi.fn();
  const { result, unmount } = renderHook(() => useEnergySession(DEFAULT_SETTINGS, { dependencies: clock.runtime, onEffects: effect }), { wrapper: Wrapper });
  act(() => result.current.actions.start()); expect(effect).toHaveBeenCalledTimes(1);
  act(() => clock.advance(6000)); expect(result.current.session.guidedCycles).toBe(1); expect(clock.frameCount()).toBe(1); expect(clock.listenerCount()).toBe(1);
  unmount(); expect(clock.frameCount()).toBe(0); expect(clock.listenerCount()).toBe(0);
  const fresh = renderHook(() => useEnergySession(DEFAULT_SETTINGS, { dependencies: clock.runtime })); expect(fresh.result.current.session.mode).toBe('idle');
});
it('設定更新速度、重設與清除都不改當組目標或重啟', () => {
  const clock = fakeRuntime();
  const { result } = renderHook(() => { const preferences = useEnergySettings(); return { preferences, energy: useEnergySession(preferences.settings, { dependencies: clock.runtime }) }; });
  act(() => result.current.energy.actions.start()); act(() => clock.advance(1000));
  act(() => result.current.preferences.update({ pace: 8, target: 6 }));
  expect(result.current.energy.guide).toMatchObject({ cyclePace: 6, pendingPace: 8, target: 10 });
  act(() => result.current.preferences.setRemember(true)); act(() => result.current.preferences.resetToDefaults());
  expect(result.current.energy.session.mode).toBe('guiding'); expect(result.current.energy.session.target).toBe(10); expect(result.current.energy.guide?.pendingPace).toBe(6);
  act(() => result.current.preferences.clearSaved()); expect(result.current.preferences.remember).toBe(false); expect(localStorage.length).toBe(0);
});
it('背景後重掛控制器連線仍可手動恢復', () => {
  const clock = fakeRuntime(); const { result } = renderHook(() => useEnergySession(DEFAULT_SETTINGS, { dependencies: clock.runtime }));
  act(() => result.current.actions.start()); act(() => clock.advance(3000)); act(() => clock.visibility(true)); act(() => clock.advance(60000)); act(() => clock.visibility(false));
  expect(result.current.session.mode).toBe('pausedGuiding'); act(() => result.current.actions.resume()); act(() => clock.advance(3000)); expect(result.current.session.guidedCycles).toBe(1);
});
