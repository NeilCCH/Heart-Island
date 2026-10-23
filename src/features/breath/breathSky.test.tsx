// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BreathSky } from './BreathSky';

afterEach(cleanup);
const orbR = () => Number(document.querySelectorAll('circle[fill="url(#orb-body)"]')[0].getAttribute('r'));
const moon = () => document.querySelector('.breath-moon circle:last-child');

describe('呼吸小宇宙星空', () => {
  it('光球隨吸吐變大變小；小月亮沿軌道走，一圈就是一次呼吸', () => {
    const { rerender } = render(<BreathSky level={0} position={0} ratio="even" still={false} />);
    const small = orbR();
    expect(Number(moon()!.getAttribute('cx'))).toBeCloseTo(300, 0); // 起點在正上方
    rerender(<BreathSky level={1} position={0.25} ratio="even" still={false} />);
    expect(orbR()).toBeGreaterThan(small * 1.8);
    expect(Number(moon()!.getAttribute('cx'))).toBeGreaterThan(470); // 四分之一圈在右側
  });

  it('減少動態：光球大小固定、沒有移動的小月亮', () => {
    const { rerender } = render(<BreathSky level={0} position={0.1} ratio="longExhale" still />);
    const r = orbR();
    rerender(<BreathSky level={1} position={0.3} ratio="longExhale" still />);
    expect(orbR()).toBe(r);
    expect(moon()).toBeNull();
  });
});
