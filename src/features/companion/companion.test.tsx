// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNED_WORDS } from '../energy/ui/copy';
import { CompanionScreen } from './CompanionScreen';
import type { Pet } from '../energy/core/types';
import { regionAt, RIGS } from './PetRig';

const { x: CAT_X, y: CAT_Y } = RIGS.cat;
import { companionCopy as copy } from './copy';
import { DELIGHT_AFTER, SLEEP_AFTER_MS } from './useCompanionMood';

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
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
    act(() => { fireEvent.pointerDown(room(), { clientX: CAT_X + 190, clientY: CAT_Y + 60, pointerId: 1 }); fireEvent.pointerUp(room(), { pointerId: 1 }); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.happy);
    expect(document.querySelector('.rig--happy .rig-lids')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1700); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
  });

  it('點牆或地板不會觸發', () => {
    renderRoom();
    act(() => { fireEvent.pointerDown(room(), { clientX: 30, clientY: 40, pointerId: 1 }); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
  });

  it('沒有互動一段時間就自己睡著；不會因為沒來而有任何懲罰', () => {
    renderRoom();
    act(() => { vi.advanceTimersByTime(SLEEP_AFTER_MS + 100); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.sleep);
    expect(screen.getByRole('button', { name: copy.wake })).toBeTruthy();
  });

  it('陪牠休息與輕輕叫醒（按鈕替代觸摸）', () => {
    renderRoom();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.rest })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.sleep);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.wake })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petCheek })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.happy);
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
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
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
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.happy);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(1700); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
  });

  it('呼嚕聲：手指離開就停止；播放中調整音量立即生效；小狗改用喘氣聲', () => {
    const sources: { stop: ReturnType<typeof vi.fn> }[] = [];
    const gains: { setTargetAtTime: ReturnType<typeof vi.fn> }[] = [];
    const filters: { type: string }[] = [];
    class FakeContext {
      state = 'running'; currentTime = 0; sampleRate = 8000; destination = {};
      resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createBuffer() { return { getChannelData: () => new Float32Array(16000) }; }
      createBufferSource() { const s = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), loop: false, buffer: null }; sources.push(s); return s; }
      createOscillator() { const s = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }; sources.push(s); return s; }
      createBiquadFilter() { const f = { connect: vi.fn(), type: '', frequency: { value: 0 } }; filters.push(f); return f; }
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

    // 小狗用輕輕的喘氣聲（帶通噪音、較低音量），不是呼嚕
    rerender(<CompanionScreen pet="dog" soundEnabled volume={0.5} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    expect(filters[filters.length - 1].type).toBe('bandpass');
    expect(gains[gains.length - 1].setTargetAtTime).toHaveBeenLastCalledWith(0.15, 0, 0.2);
  });

  it('小狗：觸摸區域對應小狗的位置', () => {
    const { x, y } = RIGS.dog;
    expect(regionAt(x + 215, y + 40, 'dog')).toBe('head');
    expect(regionAt(x + 100, y + 160, 'dog')).toBe('cheekLeft');
    expect(regionAt(x + 320, y + 150, 'dog')).toBe('cheekRight');
    expect(regionAt(x + 220, y + 330, 'dog')).toBe('body');
    expect(regionAt(20, 20, 'dog')).toBeNull();
  });

  it('設定選了小狗：畫面與文案跟著換，摸摸會搖尾巴；陪伴屋本身不再顯示萌寵選擇', () => {
    const { rerender } = render(<CompanionScreen pet="cat" soundEnabled={false} volume={0.5} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
    expect(document.querySelector('.rig--cat')).not.toBeNull();
    expect(screen.queryByRole('radio', { name: '小狗' })).toBeNull();
    rerender(<CompanionScreen pet="dog" soundEnabled={false} volume={0.5} reducedMotion={false} onOpenSettings={() => {}} random={() => 0.5} />);
    expect(document.querySelector('.rig--dog')).not.toBeNull();
    expect(room().getAttribute('aria-label')).toBe(copy.state.dog.idle);
    expect(screen.getByText(copy.hint.dog)).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.dog.happy);
  });

  it('摸摸回饋：摸到的位置冒出愛心，頭會蹭一下，拍身體會扭一下', () => {
    renderRoom();
    const down = (x: number, y: number) => act(() => {
      fireEvent.pointerDown(room(), { clientX: x, clientY: y, pointerId: 1 }); fireEvent.pointerUp(room(), { pointerId: 1 });
    });
    down(CAT_X + 190, CAT_Y + 60);
    expect(document.querySelectorAll('.spark-heart')).toHaveLength(1);
    expect(document.querySelector('.companion-sparks g')!.getAttribute('transform')).toBe(`translate(${CAT_X + 190} ${CAT_Y + 60})`);
    expect(document.querySelector('.rig--react-nuzzle-a')).not.toBeNull();
    down(CAT_X + 190, CAT_Y + 60);
    expect(document.querySelector('.rig--react-nuzzle-b')).not.toBeNull(); // 連續摸也會重新播放
    down(CAT_X + 200, CAT_Y + 380);
    expect(document.querySelector('.rig--react-wiggle-a')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1600); });
    expect(document.querySelectorAll('.spark-heart')).toHaveLength(0);
  });

  it('連續摸好幾下會很放鬆；愛心數量有上限', () => {
    renderRoom();
    for (let i = 0; i < DELIGHT_AFTER + 6; i++) act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    expect(room().getAttribute('aria-label')).toBe(copy.delight.cat);
    expect(document.querySelector('.rig--delight')).not.toBeNull();
    expect(document.querySelectorAll('.spark-heart').length).toBeLessThanOrEqual(8);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.petHead })); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.happy); // 放鬆程度重新累積
  });

  it('睡著時被摸到，只會輕輕醒來伸懶腰，不會冒愛心', () => {
    renderRoom();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.rest })); });
    act(() => { fireEvent.pointerDown(room(), { clientX: CAT_X + 190, clientY: CAT_Y + 60, pointerId: 1 }); fireEvent.pointerUp(room(), { pointerId: 1 }); });
    expect(room().getAttribute('aria-label')).toBe(copy.state.cat.idle);
    expect(document.querySelector('.rig--act-stretch')).not.toBeNull();
    expect(document.querySelectorAll('.spark-heart')).toHaveLength(0);
  });

  it('文案沒有需求、懲罰或壓力字詞', () => {
    const all = JSON.stringify(copy);
    for (const word of [...BANNED_WORDS, '飢餓', '餓了', '想你', '好久不見', '每日', '任務']) expect(all).not.toContain(word);
  });
});
