import type { CSSProperties } from 'react';
import type { Pet } from '../energy/core/types';
import { PET_IMAGE } from '../energy/ui/components/PetFigure';
import type { Action, Mood, Reaction } from './useCompanionMood';

// 2.5D 萌寵：同一張已核准的去背圖，以 clipPath 切成頭、身體、尾巴三層，
// 分別繞關節點轉動；眼皮用同一張圖眼睛上方的毛色蓋住眼睛，只用來眨眼、瞇眼與睡覺。不重繪、不換角色。
// 眼睛範圍依實際圖片量測（含深色眼眶）；from 是借用毛色的位移，必須讓借來的區域完全在眼睛上方。
interface Eye { cx: number; cy: number; rx: number; ry: number; from: readonly [number, number] }
interface RigSpec {
  x: number; y: number; // 在房間（600×800）裡的位置
  head: string; body: string; tail: string; // clip 多邊形（圖片座標）
  eyes: readonly Eye[]; lidPad: readonly [number, number]; lidColor: string;
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
    eyes: [{ cx: 138, cy: 171, rx: 29, ry: 24, from: [0, 62] }, { cx: 236, cy: 146, rx: 27, ry: 25, from: [18, 62] }],
    lidPad: [13, 10], lidColor: '#5a3420',
    headArea: { cx: 190, cy: 150, rx: 150, ry: 125, cheekY: 175, cheekLeftX: 125, cheekRightX: 255, bodyY: 250 },
    origins: { breath: '190px 430px', head: '195px 268px', tail: '85px 385px' },
  },
  // 小狗的垂耳和項圈跟著頭動；尾巴在左下，從身體旁邊的根部擺動。
  dog: {
    x: 80, y: 300,
    head: '0,0 373,0 373,200 300,200 278,212 220,224 165,214 140,212 0,212',
    body: '0,190 373,190 373,436 0,436 0,404 78,404 82,372 90,350 90,270 0,270',
    tail: '0,270 90,270 90,350 82,372 78,404 0,404',
    eyes: [{ cx: 170, cy: 108, rx: 15, ry: 13, from: [0, 40] }, { cx: 253, cy: 96, rx: 14, ry: 13, from: [0, 40] }],
    lidPad: [7, 7], lidColor: '#4a2c18',
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

// 閉眼線畫成兩端尖、中間粗的彎月形，比等粗的線自然。
// 開心是「^」笑眼，弧頂略高於眼睛中心；睡覺與眨眼是往下彎的「‿」。
function closedEye(eye: Eye, happy: boolean) {
  const half = eye.rx * 0.88; const t = eye.ry * 0.2;
  const left = eye.cx - half; const right = eye.cx + half;
  const [endY, ctrlY, inner] = happy
    ? [eye.cy + eye.ry * 0.12, eye.cy - eye.ry * 0.78, 2 * t]
    : [eye.cy - eye.ry * 0.05, eye.cy + eye.ry * 0.6, -2 * t];
  return `M ${left} ${endY} Q ${eye.cx} ${ctrlY} ${right} ${endY} Q ${eye.cx} ${ctrlY + inner} ${left} ${endY} Z`;
}

// 眼皮：借用眼睛上方的真實毛色蓋住眼睛，以羽化遮罩融入周圍，再畫上閉眼線。
function Lids({ pet, mood, blink }: { pet: Pet; mood: Mood; blink: boolean }) {
  if (mood === 'idle' && !blink) return null;
  const rig = RIGS[pet]; const image = PET_IMAGE[pet];
  const happy = mood === 'happy' && !blink;
  return (
    <g className="rig-lids">
      {rig.eyes.map((eye, i) => {
        return (
          <g key={eye.cx}>
            <g mask={`url(#rig-${pet}-eye-mask-${i})`}>
              <image href={image.src} width={image.width} height={image.height} transform={`translate(${eye.from[0]} ${eye.from[1]})`} />
            </g>
            <path d={closedEye(eye, happy)} fill={rig.lidColor} stroke={rig.lidColor} strokeWidth={eye.ry * 0.05} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

export function PetRig({ pet, mood, action, blink, lean, reaction = null, delight = false }: {
  pet: Pet; mood: Mood; action: Action; blink: boolean; lean: number; reaction?: { kind: Reaction; n: number } | null; delight?: boolean;
}) {
  // 回饋動畫用 a／b 兩個相同的 class 交替，連續摸也會每次重新播放。
  const react = reaction ? ` rig--react-${reaction.kind}-${reaction.n % 2 ? 'a' : 'b'}` : '';
  const rig = RIGS[pet]; const { src, width, height } = PET_IMAGE[pet];
  const id = (part: string) => `rig-${pet}-${part}`;
  const origins = { '--rig-breath-o': rig.origins.breath, '--rig-head-o': rig.origins.head, '--rig-tail-o': rig.origins.tail } as CSSProperties;
  return (
    <svg x={rig.x} y={rig.y} width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible"
      className={`rig rig--${pet} rig--${mood} rig--act-${action}${react}${delight ? ' rig--delight' : ''}`} style={origins}>
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
        <g className="rig-react">
          <g className="rig-stretch">
            <g className="rig-tail"><image href={src} width={width} height={height} clipPath={`url(#${id('tail')})`} /></g>
            <image href={src} width={width} height={height} clipPath={`url(#${id('body')})`} />
            <g className="rig-head-lean" style={{ transform: `rotate(${lean}deg)` }}>
              <g className="rig-head">
                <g className="rig-nuzzle">
                  <image href={src} width={width} height={height} clipPath={`url(#${id('head')})`} />
                  <Lids pet={pet} mood={mood} blink={blink} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
