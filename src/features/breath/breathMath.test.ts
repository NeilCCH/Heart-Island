import { describe, expect, it } from 'vitest';
import { advance, breathAt, phaseSeconds } from './breathMath';

describe('呼吸光球位置', () => {
  it('等長：前半吸、後半吐，起點最小、中點最大', () => {
    expect(breathAt(0, 'even')).toMatchObject({ phase: 'inhale', level: 0 });
    expect(breathAt(0.5, 'even')).toMatchObject({ phase: 'exhale', level: 1 });
    expect(breathAt(0.25, 'even').level).toBeCloseTo(0.5);
  });
  it('吐氣長一點：吸 40%、吐 60%', () => {
    expect(breathAt(0.39, 'longExhale').phase).toBe('inhale');
    expect(breathAt(0.41, 'longExhale').phase).toBe('exhale');
    expect(phaseSeconds(10, 'longExhale')).toEqual({ inhale: '4', exhale: '6' });
    expect(phaseSeconds(7, 'even')).toEqual({ inhale: '3.5', exhale: '3.5' });
  });
  it('依速度前進並繞回；長間隔或負值不補算', () => {
    expect(advance(0, 1000, 8)).toBeCloseTo(0.125);
    expect(advance(0.9, 1600, 8)).toBeCloseTo(0.1);
    expect(advance(0.3, 60000, 8)).toBe(0.3);
    expect(advance(0.3, -5, 8)).toBe(0.3);
  });
});
