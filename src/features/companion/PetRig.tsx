import type { CSSProperties } from 'react';
import type { Pet } from '../energy/core/types';
import { PET_IMAGE } from '../energy/ui/components/PetFigure';
import type { Action, Mood } from './useCompanionMood';

// 2.5D 萌寵：同一張已核准的去背圖，以 clipPath 切成頭、身體、尾巴三層，
// 分別繞關節點轉動；眼皮用同一張圖往下移的毛色蓋住眼睛，只用來眨眼、瞇眼與睡覺。不重繪、不換角色。
interface Eye { cx: number; cy: number; rx: number; ry: number }
interface RigSpec {
  x: number; y: number; // 在房間（600×800）裡的位置
  head: string; body: string; tail: string; // clip 多邊形（圖片座標）
  eyes: readonly Eye[]; lidShift: number; lidPad: [number, number]; lidStroke: string; lidWidth: number;
  // 觸摸區域：頭部橢圓與左右臉頰的分界
  headArea: { cx: number; cy: number; rx: number; ry: number; cheekY: number; cheekLeftX: number; cheekRightX: number; bodyY: number };
  origins: { breath: string; head: string; tail: string }; // CSS transform-origin
}

export const RIGS: Record<Pet, RigSpec> = {
  cat: {
    x: 120, y: 300,
    head: '0,0 361,0 361,252 262,262 200,286 128,282 0,262',
    body: '0,236 361,236 361,436 92,436 92,300 0,300',
    tail: '0,292 98,292 98,425 0,425',
    eyes: [{ cx: 138, cy: 170, rx: 30, ry: 26 }, { cx: 229, cy: 146, rx: 28, ry: 26 }],
    lidShift: 52, lidPad: [11, 9], lidStroke: '#5a3420', lidWidth: 3.5,
    headArea: { cx: 190, cy: 150, rx: 150, ry: 125, cheekY: 175, cheekLeftX: 125, cheekRightX: 255, bodyY: 250 },
    origins: { breath: '190px 430px', head: '195px 268px', tail: '85px 385px' },
  },
  // 小狗的垂耳和項圈跟著頭動；尾巴在左下，從身體旁邊的根部擺動。
  dog: {
    x: 80, y: 300,
    head: '0,0 373,0 373,200 300,200 278,212 220,224 165,214 140,212 0,212',
    body: '0,190 373,190 373,436 0,436 0,404 78,404 82,372 90,350 90,270 0,270',
    tail: '0,270 90,270 90,350 82,372 78,404 0,404',
    eyes: [{ cx: 170, cy: 111, rx: 14, ry: 16 }, { cx: 252, cy: 99, rx: 14, ry: 16 }],
    lidShift: 34, lidPad: [7, 9], lidStroke: '#4a2c18', lidWidth: 2.6,
    headArea: { cx: 215, cy: 115, rx: 160, ry: 115, cheekY: 125, cheekLeftX: 150, cheekRightX: 280, bodyY: 205 },
    origins: { breath: '186px 430px', head: '220px 222px', tail: '88px 380px' },
  },
};

export type Region = 'head' | 'cheekLeft' | 'cheekRight' | 'body' | null;

// 房間座標 → 萌寵身上的哪個部位
export function regionAt(x: number, y: number, pet: Pet = 'cat'): Region {
  const rig = RIGS[pet]; const { width, height } = PET_IMAGE[pet]; const a = rig.headArea;
  const cx = x - rig.x; const cy = y - rig.y;
  if (cx < 0 || cy < 0 || cx > width || cy > height) return null;
  const inHead = ((cx - a.cx) / a.rx) ** 2 + ((cy - a.cy) / a.ry) ** 2 <= 1;
  if (inHead) {
    if (cy > a.cheekY && cx < a.cheekLeftX) return 'cheekLeft';
    if (cy > a.cheekY && cx > a.cheekRightX) return 'cheekRight';
    return 'head';
  }
  return cy > a.bodyY ? 'body' : null;
}

// 眼皮：把同一張圖往下移，讓眼睛上方的真實毛色蓋住眼睛，再以羽化遮罩融入周圍，最後畫上閉眼的線。
function Lids({ pet, mood, blink }: { pet: Pet; mood: Mood; blink: boolean }) {
  if (mood === 'idle' && !blink) return null;
  const rig = RIGS[pet]; const image = PET_IMAGE[pet];
  const happy = mood === 'happy' && !blink;
  return (
    <g className="rig-lids">
      {rig.eyes.map((eye, i) => {
        const inset = eye.rx * 0.13;
        const left = eye.cx - eye.rx + inset; const right = eye.cx + eye.rx - inset;
        const line = happy
          ? `M ${left} ${eye.cy + eye.ry * 0.23} Q ${eye.cx} ${eye.cy - eye.ry * 0.55} ${right} ${eye.cy + eye.ry * 0.23}`
          : `M ${left} ${eye.cy} Q ${eye.cx} ${eye.cy + eye.ry * 0.45} ${right} ${eye.cy}`;
        return (
          <g key={eye.cx}>
            <g mask={`url(#rig-${pet}-eye-mask-${i})`}>
              <image href={image.src} width={image.width} height={image.height} transform={`translate(0 ${rig.lidShift})`} />
            </g>
            <path d={line} fill="none" stroke={rig.lidStroke} strokeWidth={rig.lidWidth} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

export function PetRig({ pet, mood, action, blink, lean }: { pet: Pet; mood: Mood; action: Action; blink: boolean; lean: number }) {
  const rig = RIGS[pet]; const { src, width, height } = PET_IMAGE[pet];
  const id = (part: string) => `rig-${pet}-${part}`;
  const origins = { '--rig-breath-o': rig.origins.breath, '--rig-head-o': rig.origins.head, '--rig-tail-o': rig.origins.tail } as CSSProperties;
  return (
    <svg x={rig.x} y={rig.y} width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible"
      className={`rig rig--${pet} rig--${mood} rig--act-${action}`} style={origins}>
      <defs>
        <clipPath id={id('head')}><polygon points={rig.head} /></clipPath>
        <clipPath id={id('body')}><polygon points={rig.body} /></clipPath>
        <clipPath id={id('tail')}><polygon points={rig.tail} /></clipPath>
        <radialGradient id={id('fade')}><stop offset="0.8" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        {rig.eyes.map((eye, i) => (
          <mask key={i} id={id(`eye-mask-${i}`)} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <ellipse cx={eye.cx} cy={eye.cy} rx={eye.rx + rig.lidPad[0]} ry={eye.ry + rig.lidPad[1]} fill={`url(#${id('fade')})`} />
          </mask>
        ))}
      </defs>
      <g className="rig-breath">
        <g className="rig-stretch">
          <g className="rig-tail"><image href={src} width={width} height={height} clipPath={`url(#${id('tail')})`} /></g>
          <image href={src} width={width} height={height} clipPath={`url(#${id('body')})`} />
          <g className="rig-head-lean" style={{ transform: `rotate(${lean}deg)` }}>
            <g className="rig-head">
              <image href={src} width={width} height={height} clipPath={`url(#${id('head')})`} />
              <Lids pet={pet} mood={mood} blink={blink} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
