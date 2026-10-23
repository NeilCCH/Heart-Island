// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRuntime } from '../../tests/fakeRuntime';
import { EnergyStation } from '../EnergyStation';
import { copy } from '../copy';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), get length() { return values.size; } });
  class TestPointerEvent extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? 'touch'; }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const clock = fakeRuntime();
  render(<StrictMode><EnergyStation runtime={clock.runtime} /></StrictMode>);
  const slider = () => screen.getByRole('slider', { name: copy.paceLabel }) as HTMLInputElement;
  // 滑桿寬 300px（小圓點 28px），4–16 秒
  const layout = () => vi.spyOn(slider(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 44, right: 300, bottom: 44, x: 0, y: 0, toJSON() {} });
  return { clock, slider, layout, advance: (ms: number) => act(() => clock.advance(ms)) };
}
const lift = () => Number((document.querySelector('.cat--moving') as HTMLElement | null)?.style.getPropertyValue('--lift'));

describe('萌寵能量站：手指調整節奏', () => {
  it('手指按在軌道任何位置就跳到該秒數，並跟著手指拖動', () => {
    const { slider, layout } = setup();
    layout();
    act(() => { fireEvent.pointerDown(slider(), { clientX: 286, pointerId: 3, pointerType: 'touch' }); });
    expect(slider().value).toBe('16');
    act(() => { fireEvent.pointerMove(slider(), { clientX: 150, pointerId: 3, pointerType: 'touch' }); });
    expect(slider().value).toBe('10');
    act(() => { fireEvent.pointerUp(slider(), { pointerId: 3, pointerType: 'touch' }); });
    act(() => { fireEvent.pointerMove(slider(), { clientX: 14, pointerId: 3, pointerType: 'touch' }); });
    expect(slider().value).toBe('10'); // 放開後不再跟隨
    expect(screen.getByText(copy.paceValue(10))).toBeTruthy();
  });

  it('−1／+1 秒按鈕一次調一格，到上下限時停用', () => {
    const { slider } = setup();
    const less = () => screen.getByRole('button', { name: copy.paceSteps.lessLabel }) as HTMLButtonElement;
    const more = () => screen.getByRole('button', { name: copy.paceSteps.moreLabel }) as HTMLButtonElement;
    act(() => { fireEvent.click(more()); });
    expect(slider().value).toBe('7');
    for (let i = 0; i < 3; i++) act(() => { fireEvent.click(less()); });
    expect(slider().value).toBe('4');
    expect(less().disabled).toBe(true);
  });

  it('引導時萌寵跟著所選節奏起伏：10 秒節奏時吐氣 5 秒升到最高、吸氣時放下', () => {
    const { advance } = setup();
    for (let i = 0; i < 4; i++) act(() => { fireEvent.click(screen.getByRole('button', { name: copy.paceSteps.moreLabel })); }); // 10 秒
    expect(screen.getByText(copy.paceValue(10))).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.start })); });
    expect(lift()).toBeCloseTo(0, 2);
    advance(2500);
    expect(lift()).toBeCloseTo(0.5, 1);
    advance(2400);
    expect(lift()).toBeGreaterThan(0.95);
    advance(2600);
    expect(lift()).toBeLessThan(0.6); // 吸氣放下中
  });

  it('減少動態時萌寵保持靜止', () => {
    setup();
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.settings })); });
    act(() => { fireEvent.click(screen.getByRole('switch', { name: copy.reducedMotionLabel })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.close })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: copy.start })); });
    expect(document.querySelector('.cat--moving')).toBeNull();
  });
});
