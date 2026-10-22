// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNED_WORDS } from '../energy/ui/copy';
import { gardenCopy as copy } from './copy';
import { GardenScreen } from './GardenScreen';
import { inPond, POND, STARTER } from './model';

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k), clear: () => values.clear(), get length() { return values.size; } });
  // jsdom 沒有 PointerEvent，補一個帶座標的版本。
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  // jsdom 沒有 canvas；畫沙紋的部分由 Chromium E2E 驗證。
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const tray = () => screen.getByRole('img', { name: new RegExp(copy.areaLabel) });
const saved = () => JSON.parse(values.get('garden.items.v1')!);
function renderGarden(reducedMotion = false) {
  render(<GardenScreen onOpenSettings={() => {}} reducedMotion={reducedMotion} random={() => 0.3} />);
  // jsdom 的元素尺寸是 0；沙盤以 1000×750 計算座標。
  vi.spyOn(tray(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 750, right: 1000, bottom: 750, x: 0, y: 0, toJSON() {} });
}

describe('療癒小花園', () => {
  it('池塘範圍判定', () => {
    expect(inPond(POND.cx, POND.cy)).toBe(true);
    expect(inPond(100, 100)).toBe(false);
  });

  it('預設花園有三顆石頭；種花工具點沙地會種花並保存在本機', () => {
    renderGarden();
    expect(tray().getAttribute('aria-label')).toContain('0 朵花、3 顆石頭');
    act(() => { fireEvent.click(screen.getByRole('radio', { name: copy.tools.flower })); });
    act(() => { fireEvent.pointerDown(tray(), { clientX: 150, clientY: 600, pointerId: 1 }); fireEvent.pointerUp(tray(), { pointerId: 1 }); });
    expect(saved().flowers).toHaveLength(1);
    expect(saved().flowers[0]).toMatchObject({ x: 150, y: 600 });
  });

  it('點池塘不會種花', () => {
    renderGarden();
    act(() => { fireEvent.click(screen.getByRole('radio', { name: copy.tools.flower })); });
    act(() => { fireEvent.pointerDown(tray(), { clientX: POND.cx, clientY: POND.cy, pointerId: 1 }); });
    expect(saved().flowers).toHaveLength(0);
  });

  it('可以拖動石頭', () => {
    renderGarden();
    const [first] = STARTER.stones;
    act(() => {
      fireEvent.pointerDown(tray(), { clientX: first.x, clientY: first.y, pointerId: 1 });
      fireEvent.pointerMove(tray(), { clientX: first.x + 100, clientY: first.y + 50, pointerId: 1 });
      fireEvent.pointerUp(tray(), { pointerId: 1 });
    });
    expect(saved().stones.find((s: { id: string }) => s.id === first.id)).toMatchObject({ x: first.x + 100, y: first.y + 50 });
  });

  it('第二根手指不會干擾正在拖動的石頭', () => {
    renderGarden();
    const [first] = STARTER.stones;
    act(() => {
      fireEvent.pointerDown(tray(), { clientX: first.x, clientY: first.y, pointerId: 1 });
      fireEvent.pointerDown(tray(), { clientX: 900, clientY: 100, pointerId: 2 });
      fireEvent.pointerMove(tray(), { clientX: 950, clientY: 150, pointerId: 2 });
      fireEvent.pointerUp(tray(), { pointerId: 2 });
      fireEvent.pointerMove(tray(), { clientX: first.x + 40, clientY: first.y + 20, pointerId: 1 });
      fireEvent.pointerUp(tray(), { pointerId: 1 });
    });
    expect(saved().stones.find((s: { id: string }) => s.id === first.id)).toMatchObject({ x: first.x + 40, y: first.y + 20 });
  });

  it('拖進池塘的石頭還能再拿起來', () => {
    renderGarden();
    const [first] = STARTER.stones;
    const drag = (fromX: number, fromY: number, toX: number, toY: number) => act(() => {
      fireEvent.pointerDown(tray(), { clientX: fromX, clientY: fromY, pointerId: 1 });
      fireEvent.pointerMove(tray(), { clientX: toX, clientY: toY, pointerId: 1 });
      fireEvent.pointerUp(tray(), { pointerId: 1 });
    });
    drag(first.x, first.y, POND.cx, POND.cy);
    drag(POND.cx, POND.cy, 200, 200);
    expect(saved().stones.find((s: { id: string }) => s.id === first.id)).toMatchObject({ x: 200, y: 200 });
  });

  it('按鈕替代觸控：種一朵花、放一顆石頭；重新開始回到預設', () => {
    renderGarden();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.quick.flower })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.quick.stone })); });
    expect(saved().flowers).toHaveLength(1);
    expect(saved().stones).toHaveLength(4);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.reset })); });
    expect(saved()).toEqual(STARTER);
  });

  it('關閉「記得這座花園」就刪除本機資料', () => {
    renderGarden();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.quick.flower })); });
    act(() => { fireEvent.click(screen.getByRole('switch', { name: copy.keep })); });
    expect(values.has('garden.items.v1')).toBe(false);
    expect(values.get('garden.keep.v1')).toBe('false');
  });

  it('空間已滿無法寫入時，關閉保存仍會刪除花園', () => {
    values.set('garden.items.v1', JSON.stringify(STARTER));
    values.set('garden.sand.v1', 'data:image/jpeg;base64,AAAA');
    renderGarden();
    const setItem = vi.fn(() => { throw new Error('QuotaExceeded'); });
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem, removeItem: (k: string) => values.delete(k), clear: () => values.clear(), get length() { return values.size; } });
    act(() => { fireEvent.click(screen.getByRole('switch', { name: copy.keep })); });
    expect(values.has('garden.items.v1')).toBe(false);
    expect(values.has('garden.sand.v1')).toBe(false);
  });

  it('減少動態時點水面不產生漣漪動畫', () => {
    renderGarden(true);
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.quick.ripple })); });
    expect(document.querySelector('.garden-ripple')).toBeNull();
  });

  it('文案沒有分數、任務或壓力字詞', () => {
    const all = JSON.stringify(copy);
    for (const word of [...BANNED_WORDS, '任務', '關卡', '過關']) expect(all).not.toContain(word);
  });
});
