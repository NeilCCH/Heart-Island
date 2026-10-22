import { it, expect, vi } from 'vitest';
import { fakeRuntime } from './fakeRuntime';
import { createEnergyController } from '../core/controller';
import { DEFAULT_SETTINGS } from '../settings/preferences';
it('同一邏輯來源；低動態不降低計數精度，語意變化立即發布', () => {
  const clock = fakeRuntime(); const effects = vi.fn(); const c = createEnergyController({ ...DEFAULT_SETTINGS, reducedMotion: true }, clock.runtime, effects);
  c.connect(); c.actions.start(); clock.advance(6000); expect(c.getSnapshot().guidedCycles).toBe(1); expect(clock.frameCount()).toBe(1); c.disconnect(); expect(clock.frameCount()).toBe(0); expect(clock.listenerCount()).toBe(0);
});
it('舊回呼在exit後無效；重新開始正常且只有一個監聽', () => {
  const clock = fakeRuntime(); const c = createEnergyController(DEFAULT_SETTINGS, clock.runtime); c.connect(); c.connect(); c.actions.start(); const old = clock.captureFrame(); c.actions.exit(); old?.(); expect(c.getSnapshot().mode).toBe('idle'); expect(clock.frameCount()).toBe(0); c.actions.start(); expect(clock.frameCount()).toBe(1); expect(clock.listenerCount()).toBe(1);
});
it('背景60秒不增加，前景須手動恢復', () => {
  const clock = fakeRuntime(); const c = createEnergyController(DEFAULT_SETTINGS, clock.runtime); c.connect(); c.actions.start(); clock.advance(3000); clock.visibility(true); clock.advance(60000); clock.visibility(false); expect(c.getSnapshot().mode).toBe('pausedGuiding'); c.actions.resume(); clock.advance(3000); expect(c.getSnapshot().guidedCycles).toBe(1);
});
it('新目標與休息設定不改變當組／當次休息', () => {
  const clock = fakeRuntime(); const c = createEnergyController(DEFAULT_SETTINGS, clock.runtime); c.connect(); c.actions.start(); c.setSettings({ ...DEFAULT_SETTINGS, target: 6 }); expect(c.getSnapshot().target).toBe(10); c.actions.finishSet(); c.actions.startRest(); c.setSettings({ ...DEFAULT_SETTINGS, restSeconds: 30 }); clock.advance(1000); expect(c.getSnapshot().restRemainingMs).toBe(89000); c.actions.skipRest(); c.actions.nextSet(); expect(c.getSnapshot().setIndex).toBe(2);
});
