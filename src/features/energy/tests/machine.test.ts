import { describe, it, expect } from 'vitest';
import { createInitialState, transition, getGuideView, getRestView, cycleMs, PACE_MIN, PACE_MAX } from '../core/machine';
import { DEFAULT_SETTINGS as defaults } from '../settings/preferences';
import type { EnergyCommand, EnergySettings, EnergyEffect } from '../core/types';
function engine(settings: Partial<EnergySettings> = {}) {
  let state = createInitialState(); let now = 0; const events: EnergyEffect[] = [];
  const send = (command: EnergyCommand) => { const result = transition(state, command, now); state = result.state; events.push(...result.effects); return result; };
  send({ type: 'start', settings: { ...defaults, ...settings } });
  return { send, state: () => state, s: () => state.session, events,
    jump(ms: number) { now += ms; },
    advance(ms: number, stride = 50) { while (ms > 0) { const used = Math.min(stride, ms); now += used; ms -= used; send({ type: 'tick' }); } },
  };
}
describe('完整引導循環', () => {
  it.each([4, 5, 6, 8, 11, 16])('每次 %i 秒：完整才加一，phase及selector一致', pace => {
    const e = engine({ pace }); const ms = cycleMs(pace);
    e.advance(ms / 2 - 1); expect(e.s().guidedCycles).toBe(0); expect(e.s().phase).toBe('exhaleLift');
    e.advance(1); expect(e.s().phase).toBe('inhaleLower'); expect(getGuideView(e.s())?.phaseRatio).toBe(0);
    e.advance(ms / 2 - 1); expect(e.s().guidedCycles).toBe(0);
    e.advance(1); expect(e.s().guidedCycles).toBe(1); expect(e.s().phase).toBe('exhaleLift');
  });
  it.each([6, 8, 10, 12] as const)('目標 %i 到期不開始下一循環', target => {
    const e = engine({ target }); e.advance(target * 6000); expect(e.s().mode).toBe('setComplete');
    expect(e.s().guidedCycles).toBe(target); const count = e.events.length; e.advance(60000); expect(e.events.length).toBe(count);
    expect(e.events.at(-1)).toMatchObject({ type: 'setCompleted', reason: 'target', guidedCycles: target });
  });
  it('不限不會自動結束', () => { const e = engine({ target: null }); e.advance(120000); expect(e.s().guidedCycles).toBe(20); expect(e.s().mode).toBe('guiding'); });
  it.each([1000, 4000])('在 %ims 暫停20秒，恢復剩餘部分', point => {
    const e = engine(); e.advance(point); e.send({ type: 'pause' }); e.advance(20000);
    expect(e.s().activeElapsedMs).toBe(point); expect(e.s().guidedCycles).toBe(0);
    e.send({ type: 'resume' }); e.advance(6000 - point); expect(e.s().guidedCycles).toBe(1);
  });
  it('半循環手動結束丟棄，已完成循環保持', () => {
    const e = engine(); e.advance(9000); e.send({ type: 'finishSet' }); expect(e.s().guidedCycles).toBe(1);
    expect(e.events.at(-1)).toMatchObject({ type: 'setCompleted', reason: 'manual', guidedCycles: 1 });
  });
  it('範圍外或非整數秒數不接受', () => {
    const e = engine(); e.send({ type: 'setPace', pace: PACE_MIN - 1 }); e.send({ type: 'setPace', pace: PACE_MAX + 1 }); e.send({ type: 'setPace', pace: 6.5 });
    expect(e.s().pendingPace).toBe(6);
    const bad = transition(createInitialState(), { type: 'start', settings: { ...defaults, pace: 99 } }, 0); expect(bad.state.session.mode).toBe('idle');
  });
  it('前景跨邊界延遲保留餘數', () => { const e = engine(); e.advance(5900); e.jump(200); e.send({ type: 'tick' }); expect(e.s().guidedCycles).toBe(1); expect(e.s().cycleElapsedMs).toBe(100); });
  it('速度本循環鎖定，下一循環用最後值', () => {
    const e = engine(); e.advance(3500); e.send({ type: 'setPace', pace: 8 }); e.send({ type: 'setPace', pace: 4 });
    expect(getGuideView(e.s())).toMatchObject({ cyclePace: 6, pendingPace: 4 });
    e.advance(2500); expect(e.s().cyclePace).toBe(4); e.advance(4000); expect(e.s().guidedCycles).toBe(2);
  });
  it('背景不結算不確定區間，回前景不自動恢復或發聲', () => {
    const e = engine(); e.advance(5900); e.jump(100); e.send({ type: 'visibilityHidden' });
    expect(e.s().guidedCycles).toBe(0); expect(e.s().cycleElapsedMs).toBe(5900);
    e.advance(60000); e.send({ type: 'resume' }); expect(e.s().mode).toBe('pausedGuiding');
    expect(e.send({ type: 'visibilityVisible' }).effects).toEqual([]); e.send({ type: 'resume' }); e.advance(100); expect(e.s().guidedCycles).toBe(1);
  });
  it('長間隔2001ms暫停，2000ms仍正常', () => {
    const e = engine(); e.jump(2000); e.send({ type: 'tick' }); expect(e.s().activeElapsedMs).toBe(2000);
    e.jump(2001); expect(e.send({ type: 'tick' }).effects).toEqual([expect.objectContaining({ type: 'guidancePaused', reason: 'interrupted' })]);
    expect(e.s().activeElapsedMs).toBe(2000); expect(e.s().mode).toBe('pausedGuiding');
  });
  it('非法事件、連點不結算不重複', () => {
    const e = engine(); e.jump(100); const before = e.state();
    expect(e.send({ type: 'start', settings: defaults }).state).toBe(before);
    e.send({ type: 'pause' }); expect(e.send({ type: 'pause' }).effects).toEqual([]);
  });
  it('完成後手動下一組才加組數', () => { const e = engine(); e.send({ type: 'finishSet' }); e.send({ type: 'nextSet', settings: defaults }); expect(e.s()).toMatchObject({ mode: 'guiding', setIndex: 2, guidedCycles: 0 }); });
});
describe('組間休息', () => {
  it.each([30,60,90,120,180] as const)('%i秒精確結束且不自動下一組', seconds => {
    const e = engine(); e.send({ type: 'finishSet' }); e.send({ type: 'startRest', seconds }); e.advance(seconds * 1000 - 1);
    expect(e.s().restRemainingMs).toBe(1); e.advance(1); expect(e.s().mode).toBe('readyNext'); expect(getRestView(e.s())?.finished).toBe(true);
    expect(e.events.at(-1)?.type).toBe('restFinished'); e.advance(10000); expect(e.s().mode).toBe('readyNext');
  });
  it('暫停/延長/背景/恢復/略過/再休息', () => {
    const e = engine(); e.send({ type: 'finishSet' }); e.send({ type: 'startRest', seconds: 90 }); e.advance(10000);
    e.send({ type: 'pauseRest' }); e.advance(20000); e.send({ type: 'extendRest' }); expect(e.s()).toMatchObject({ mode: 'pausedRest', restRemainingMs: 110000, restTotalMs: 120000 });
    e.send({ type: 'resumeRest' }); e.send({ type: 'visibilityHidden' }); e.advance(60000); expect(e.s().restRemainingMs).toBe(110000);
    e.send({ type: 'visibilityVisible' }); expect(e.s().mode).toBe('pausedRest'); e.send({ type: 'resumeRest' }); e.advance(1000);
    e.send({ type: 'skipRest' }); expect(e.s().mode).toBe('readyNext'); e.send({ type: 'startRest', seconds: 30 }); expect(e.s().restRemainingMs).toBe(30000);
  });
  it('休息中斷凍結、不發到期事件', () => { const e = engine(); e.send({ type: 'finishSet' }); e.send({ type: 'startRest', seconds: 30 }); e.jump(60000); expect(e.send({ type: 'tick' }).effects).toEqual([]); expect(e.s()).toMatchObject({ mode: 'pausedRest', restRemainingMs: 30000, pauseReason: 'interrupted' }); });
  it('退出及新建狀態不恢復session', () => { const e = engine(); e.advance(7000); e.send({ type: 'exit' }); expect(e.s()).toEqual(createInitialState().session); expect(getGuideView(e.s())).toBeNull(); expect(getRestView(e.s())).toBeNull(); });
});
it('長時間中斷當下仍能結束本組，不要求再點一次', () => {
  const e = engine(); e.advance(1000); e.jump(60000); e.send({ type: 'finishSet' }); expect(e.s()).toMatchObject({ mode: 'setComplete', guidedCycles: 0 });
});
