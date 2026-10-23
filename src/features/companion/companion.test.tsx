// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNED_WORDS } from '../energy/ui/copy';
import { CompanionScreen } from './CompanionScreen';
import { regionAt, CAT_X, CAT_Y } from './CatRig';
import { companionCopy as copy } from './copy';
import { SLEEP_AFTER_MS } from './useCompanionMood';

beforeEach(() => {
  vi.useFakeTimers();
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const room = () => screen.getByRole('img');
function renderRoom(soundEnabled = false) {
  render(<CompanionScreen soundEnabled={soundEnabled} volume={0.5} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
  vi.spyOn(room(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 800, right: 600, bottom: 800, x: 0, y: 0, toJSON() {} });
}

describe('萌寵陪伴屋', () => {
  it('觸摸區域：頭、左右臉頰、身體', () => {
    expect(regionAt(CAT_X + 190, CAT_Y + 60)).toBe('head');
    expect(regionAt(CAT_X + 80, CAT_Y + 210)).toBe('cheekLeft');
    expect(regionAt(CAT_X + 290, CAT_Y + 200)).toBe('cheekRight');
    expect(regionAt(CAT_X + 200, CAT_Y + 380)).toBe('body');
    expect(regionAt(20, 20)).toBeNull();
  });

  it('一開始安靜坐著；在頭上摸摸會瞇眼呼嚕，一會兒後回到平常', () => {
    renderRoom();
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
    act(() => { fireEvent.pointerDown(room(), { clientX: CAT_X + 190, clientY: CAT_Y + 60, pointerId: 1 }); fireEvent.pointerUp(room(), { pointerId: 1 }); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.happy);
    expect(document.querySelector('.rig--happy .rig-lids')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
  });

  it('點牆或地板不會觸發', () => {
    renderRoom();
    act(() => { fireEvent.pointerDown(room(), { clientX: 30, clientY: 40, pointerId: 1 }); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
  });

  it('沒有互動一段時間就自己睡著；不會因為沒來而有任何懲罰', () => {
    renderRoom();
    act(() => { vi.advanceTimersByTime(SLEEP_AFTER_MS + 100); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.sleep);
    expect(screen.getByRole('button', { name: copy.wake })).toBeTruthy();
  });

  it('陪牠休息與輕輕叫醒（按鈕替代觸摸）', () => {
    renderRoom();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.rest })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.sleep);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.wake })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petCheek })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.happy);
  });

  it('全島聲音關閉時摸摸不會建立 AudioContext', () => {
    const ctor = vi.fn(); vi.stubGlobal('AudioContext', ctor);
    renderRoom(false);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    expect(ctor).not.toHaveBeenCalled();
  });

  it('畫面在背景時暫停，不會偷偷睡著', () => {
    renderRoom();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(SLEEP_AFTER_MS * 2); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  });

  it('會眨眼：閉眼約 160ms 後再睜開', () => {
    renderRoom();
    act(() => { vi.advanceTimersByTime(4250); });
    expect(document.querySelector('.rig-lids')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(200); });
    expect(document.querySelector('.rig-lids')).toBeNull();
  });

  it('摸摸後切到背景，瞇眼狀態暫停，回來後才繼續', () => {
    renderRoom();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.happy);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(1700); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.idle);
  });

  it('呼嚕聲：手指離開就停止；播放中調整音量立即生效', () => {
    const sources: { stop: ReturnType<typeof vi.fn> }[] = [];
    const gains: { setTargetAtTime: ReturnType<typeof vi.fn> }[] = [];
    class FakeContext {
      state = 'running'; currentTime = 0; sampleRate = 8000; destination = {};
      resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createBuffer() { return { getChannelData: () => new Float32Array(16000) }; }
      createBufferSource() { const s = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: false, buffer: null }; sources.push(s); return s; }
      createOscillator() { const s = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }; sources.push(s); return s; }
      createBiquadFilter() { return { connect: vi.fn(), type: '', frequency: { value: 0 } }; }
      createGain() { const g = { setTargetAtTime: vi.fn() }; gains.push(g); return { connect: vi.fn(), gain: Object.assign(g, { value: 0 }) }; }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    const { rerender } = render(<CompanionScreen soundEnabled volume={0.5} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
    vi.spyOn(room(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 800, right: 600, bottom: 800, x: 0, y: 0, toJSON() {} });
    act(() => { fireEvent.pointerDown(room(), { clientX: CAT_X + 190, clientY: CAT_Y + 60, pointerId: 1 }); });
    expect(sources.length).toBeGreaterThan(0);
    const output = gains[gains.length - 1];
    rerender(<CompanionScreen soundEnabled volume={0.2} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
    expect(output.setTargetAtTime).toHaveBeenLastCalledWith(0.1, 0, 0.1);
    act(() => { fireEvent.pointerUp(room(), { pointerId: 1 }); });
    expect(sources.every(s => s.stop.mock.calls.length > 0)).toBe(true);
  });

  it('文案沒有需求、懲罰或壓力字詞', () => {
    const all = JSON.stringify(copy);
    for (const word of [...BANNED_WORDS, '飢餓', '餓了', '想你', '好久不見', '每日', '任務']) expect(all).not.toContain(word);
  });
});
