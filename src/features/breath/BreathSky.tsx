import { memo } from 'react';
import type { Ratio } from './breathMath';
import { inhaleShare } from './breathMath';

// 呼吸小宇宙的直式星空（600×900）。只有光球、光暈與軌道上的小月亮會隨呼吸變化；
// 星雲慢慢飄、少數星星慢慢閃，其餘都是靜止的，維持低刺激。
export const SKY_W = 600;
export const SKY_H = 900;
const CX = 300;
const CY = 400;
const RING_R = 182;

// 固定種子的星星：每次進來位置都一樣，不會閃來閃去。
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const STARS = (() => {
  const rand = seeded(20261023);
  return Array.from({ length: 90 }, (_, i) => {
    const x = rand() * SKY_W; const y = rand() * (SKY_H - 120);
    const near = Math.hypot(x - CX, y - CY) < RING_R + 30; // 不要擠在光球後面
    return { x, y, r: 0.5 + rand() * 1.3, o: near ? 0.2 : 0.3 + rand() * 0.55, twinkle: i % 7 === 0, delay: rand() * 8, dur: 5 + rand() * 5 };
  });
})();
const BRIGHT = [{ x: 96, y: 150 }, { x: 512, y: 118 }, { x: 470, y: 640 }, { x: 128, y: 560 }];

const Backdrop = memo(function Backdrop() {
  return (
    <>
      <defs>
        <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1225" /><stop offset="0.55" stopColor="#16244a" /><stop offset="1" stopColor="#2a2d5c" />
        </linearGradient>
        <filter id="sky-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46" /></filter>
        <radialGradient id="sky-star"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id="planet" cx="50%" cy="0%" r="100%">
          <stop offset="0" stopColor="#2b3566" /><stop offset="0.35" stopColor="#151c3c" /><stop offset="1" stopColor="#0b1027" />
        </radialGradient>
      </defs>
      <rect width={SKY_W} height={SKY_H} fill="url(#sky-bg)" />
      {/* 星雲：三團柔和的色霧，慢慢飄移 */}
      <g className="sky-nebula" filter="url(#sky-soft)" opacity="0.55">
        <ellipse cx="150" cy="250" rx="190" ry="120" fill="#3b6f96" />
        <ellipse cx="470" cy="520" rx="200" ry="130" fill="#5d4f97" />
        <ellipse cx="330" cy="760" rx="240" ry="90" fill="#8a5d86" opacity="0.7" />
      </g>
      <g className="sky-stars">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e9eefb" opacity={s.o}
            className={s.twinkle ? 'sky-twinkle' : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` } : undefined} />
        ))}
        {BRIGHT.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y})`} className="sky-twinkle" style={{ animationDelay: `${i * 1.7}s`, animationDuration: '9s' }}>
            <circle r="9" fill="url(#sky-star)" opacity="0.35" />
            <path d="M0 -7 L0.8 0 L0 7 L-0.8 0 Z M-7 0 L0 -0.8 L7 0 L0 0.8 Z" fill="#fff" opacity="0.8" />
          </g>
        ))}
      </g>
      {/* 遠方行星的弧形地平線，邊緣有一圈淡淡的光 */}
      <circle cx={CX} cy="1390" r="640" fill="url(#planet)" />
      <circle cx={CX} cy="1390" r="640" fill="none" stroke="#a9b4ee" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx={CX} cy="1390" r="646" fill="none" stroke="#a9b4ee" strokeOpacity="0.12" strokeWidth="10" filter="url(#sky-soft)" />
    </>
  );
});

// 在圓上取點（0 在正上方，順時針）
const at = (turn: number, r = RING_R) => {
  const a = turn * 2 * Math.PI - Math.PI / 2;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number) => {
  const [x0, y0] = at(from); const [x1, y1] = at(to);
  return `M ${x0} ${y0} A ${RING_R} ${RING_R} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
};

export function BreathSky({ level, position, ratio, still }: { level: number; position: number; ratio: Ratio; still: boolean }) {
  const share = inhaleShare(ratio);
  const lv = still ? 0.6 : level;
  const orbR = 62 + 58 * lv;
  const [mx, my] = at(position);
  return (
    <svg className="breath-sky" viewBox={`0 0 ${SKY_W} ${SKY_H}`} aria-hidden="true" focusable="false">
      <Backdrop />
      <defs>
        <radialGradient id="orb-body" cx="42%" cy="36%" r="68%">
          <stop offset="0" stopColor="#fff9f0" /><stop offset="0.45" stopColor="#f8dcb4" /><stop offset="0.85" stopColor="#e9b78a" /><stop offset="1" stopColor="#d9a27a" />
        </radialGradient>
        <radialGradient id="orb-aura"><stop offset="0" stopColor="#ffe3bf" stopOpacity="0.55" /><stop offset="0.5" stopColor="#f3c99d" stopOpacity="0.18" /><stop offset="1" stopColor="#f3c99d" stopOpacity="0" /></radialGradient>
        <radialGradient id="orb-sheen" cx="35%" cy="28%" r="40%"><stop offset="0" stopColor="#fff" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id="moon"><stop offset="0" stopColor="#fff" /><stop offset="0.5" stopColor="#ffeeda" stopOpacity="0.9" /><stop offset="1" stopColor="#ffeeda" stopOpacity="0" /></radialGradient>
      </defs>

      {/* 光暈：吸氣時擴大、變亮 */}
      <circle cx={CX} cy={CY} r={orbR * 2.4} fill="url(#orb-aura)" opacity={0.55 + 0.45 * lv} />
      <circle cx={CX} cy={CY} r={orbR + 22 + 26 * lv} fill="none" stroke="#ffe7c9" strokeOpacity={0.08 + 0.1 * lv} strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={orbR + 48 + 34 * lv} fill="none" stroke="#ffe7c9" strokeOpacity={0.05 + 0.06 * lv} strokeWidth="1" />

      {/* 軌道：暖色是吸氣的部分、冷色是吐氣的部分；小月亮沿著軌道走一圈就是一次呼吸 */}
      <path d={arc(0, share)} fill="none" stroke="#f6d2a6" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d={arc(share, 0.9999)} fill="none" stroke="#9fb4e8" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
      {!still && (
        <g className="breath-moon">
          <circle cx={mx} cy={my} r="16" fill="url(#moon)" opacity="0.7" />
          <circle cx={mx} cy={my} r="5" fill="#fffaf3" />
        </g>
      )}

      {/* 光球本體 */}
      <circle cx={CX} cy={CY} r={orbR} fill="url(#orb-body)" />
      <circle cx={CX} cy={CY} r={orbR} fill="url(#orb-sheen)" />
    </svg>
  );
}
