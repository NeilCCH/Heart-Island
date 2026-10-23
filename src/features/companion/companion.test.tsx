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

describe('小貓陪伴屋', () => {
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

  it('文案沒有需求、懲罰或壓力字詞', () => {
    const all = JSON.stringify(copy);
    for (const word of [...BANNED_WORDS, '飢餓', '餓了', '想你', '好久不見', '每日', '任務']) expect(all).not.toContain(word);
  });
});
