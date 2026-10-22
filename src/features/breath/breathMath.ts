// 光球的呼吸位置：position 是目前循環中的位置（0 ≤ position < 1），與速度無關，
// 所以調整速度時光球會從當下位置接續，不會跳動。
export type Ratio = 'even' | 'longExhale';
export const BREATH_MIN = 4;
export const BREATH_MAX = 16;
export const BREATH_DEFAULT = 8;
export const INTERRUPTION_MS = 2000;

export const inhaleShare = (ratio: Ratio) => (ratio === 'even' ? 0.5 : 0.4);
const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;

export function advance(position: number, deltaMs: number, paceSeconds: number): number {
  if (!(deltaMs > 0) || deltaMs > INTERRUPTION_MS) return position; // 背景、凍結或時鐘異常：不補算
  return (position + deltaMs / (paceSeconds * 1000)) % 1;
}

export function breathAt(position: number, ratio: Ratio): { phase: 'inhale' | 'exhale'; progress: number; level: number } {
  const share = inhaleShare(ratio);
  if (position < share) {
    const progress = position / share;
    return { phase: 'inhale', progress, level: ease(progress) };
  }
  const progress = (position - share) / (1 - share);
  return { phase: 'exhale', progress, level: 1 - ease(progress) };
}

export function phaseSeconds(paceSeconds: number, ratio: Ratio) {
  const inhale = paceSeconds * inhaleShare(ratio);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return { inhale: fmt(inhale), exhale: fmt(paceSeconds - inhale) };
}
