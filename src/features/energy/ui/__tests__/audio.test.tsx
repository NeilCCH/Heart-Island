// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeRuntime } from '../../tests/fakeRuntime';
import { EnergyStation } from '../EnergyStation';
import { copy } from '../copy';

let oscillators: { stop: ReturnType<typeof vi.fn>; frequency: { value: number } }[] = [];
let contexts = 0;

class FakeAudioContext {
  state = 'running'; currentTime = 0; destination = {};
  constructor() { contexts++; }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createOscillator() {
    const osc = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    oscillators.push(osc); return osc;
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  }
}

beforeEach(() => {
  oscillators = []; contexts = 0;
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), get length() { return values.size; } });
  vi.stubGlobal('AudioContext', FakeAudioContext);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('使用者開啟聲音後才授權；只在前景播放當下提示，暫停與背景立即停止', () => {
  const clock = fakeRuntime();
  render(<EnergyStation runtime={clock.runtime} />);
  act(() => { fireEvent.click(screen.getByRole('button', { name: copy.settings })); });
  act(() => { fireEvent.click(screen.getByRole('switch', { name: copy.soundLabel })); });
  expect(contexts).toBe(1);
  act(() => { fireEvent.click(screen.getByRole('button', { name: copy.close })); });

  act(() => { fireEvent.click(screen.getByRole('button', { name: copy.start })); });
  expect(oscillators).toHaveLength(1); // 吐氣舉起
  act(() => clock.advance(3000));
  expect(oscillators).toHaveLength(2); // 吸氣放下，不補播
  expect(oscillators[0].stop).toHaveBeenCalled();

  act(() => { fireEvent.click(screen.getByRole('button', { name: copy.pause })); });
  // osc.stop 第一次在 start 時預約結束；第二次是暫停時的立即取消
  expect(oscillators[1].stop.mock.calls.length).toBeGreaterThanOrEqual(2);

  act(() => { fireEvent.click(screen.getByRole('button', { name: copy.resume })); });
  const beforeHidden = oscillators.length;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  act(() => clock.visibility(true)); act(() => clock.advance(10000));
  expect(oscillators.length).toBe(beforeHidden);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  act(() => clock.visibility(false));
  expect(oscillators.length).toBe(beforeHidden); // 回前景不自動發聲
  expect(screen.getByText(copy.pausedHidden)).toBeTruthy();
});
