import type { CSSProperties } from 'react';
import type { Pet } from '../energy/core/types';
import { PET_IMAGE } from '../energy/ui/components/PetFigure';
import type { Action, Mood, Reaction } from './useCompanionMood';

// 2.5D 萌寵：同一張已核准的去背圖，以 clipPath 切成頭、身體、尾巴三層，
// 分別繞關節點轉動。閉眼時疊上「閉眼毛色層」（scripts/make-lids.py 由原圖修補眼睛區域產生，
// 保留周圍毛流），再畫閉眼線；只用來眨眼、瞇眼與睡覺。不重繪、不換角色。
// 眼睛範圍依實際圖片量測（含深色眼眶），需與 make-lids.py 一致。
interface Eye { cx: number; cy: number; rx: number; ry: number }
interface RigSpec {
  x: number; y: number; // 在房間（600×800）裡的位置
  head: string; body: string; tail: string; // clip 多邊形（圖片座標）
  eyes: readonly Eye[]; lidColor: string;
  // 閉眼線：寬度（相對眼睛寬）與中間粗細（相對眼睛高）；小貓眼睛很大，線短一點、低一點才不像眉毛
  // drop：線相對眼睛中心往下移（相對眼睛高）
  lidLine: { width: number; thick: number; drop: number };
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
    eyes: [{ cx: 138, cy: 171, rx: 29, ry: 24 }, { cx: 236, cy: 146, rx: 27, ry: 25 }],
    lidColor: '#5a3420', lidLine: { width: 0.62, thick: 0.17, drop: 0.18 },
    headArea: { cx: 190, cy: 150, rx: 150, ry: 125, cheekY: 175, cheekLeftX: 125, cheekRightX: 255, bodyY: 250 },
    origins: { breath: '190px 430px', head: '195px 268px', tail: '85px 385px' },
  },
  // 小狗的垂耳和項圈跟著頭動；尾巴在左下，從身體旁邊的根部擺動。
  dog: {
    x: 80, y: 300,
    head: '0,0 373,0 373,200 300,200 278,212 220,224 165,214 140,212 0,212',
    body: '0,190 373,190 373,436 0,436 0,404 78,404 82,372 90,350 90,270 0,270',
    tail: '0,270 90,270 90,350 82,372 78,404 0,404',
    eyes: [{ cx: 170, cy: 108, rx: 15, ry: 13 }, { cx: 253, cy: 96, rx: 14, ry: 13 }],
    lidColor: '#4a2c18', lidLine: { width: 0.88, thick: 0.2, drop: 0 },
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
// 開心是「^」笑眼；睡覺與眨眼是往下彎的「‿」。
function closedEye(eye: Eye, line: RigSpec['lidLine'], happy: boolean) {
  const half = eye.rx * line.width; const t = eye.ry * line.thick; const cy = eye.cy + eye.ry * line.drop;
  const left = eye.cx - half; const right = eye.cx + half;
  const [endY, ctrlY, inner] = happy
    ? [cy + eye.ry * 0.12, cy - eye.ry * 0.85, 2 * t]
    : [cy - eye.ry * 0.05, cy + eye.ry * 0.6, -2 * t];
  return `M ${left} ${endY} Q ${eye.cx} ${ctrlY} ${right} ${endY} Q ${eye.cx} ${ctrlY + inner} ${left} ${endY} Z`;
}

// 眼皮：疊上閉眼毛色層蓋住眼睛，再畫閉眼線；線下方有一道柔和的陰影，像毛皮的摺痕。
// 毛色層一直掛著（睜眼時隱藏），第一次眨眼前就已載入，不會閃一下。
function Lids({ pet, mood, blink }: { pet: Pet; mood: Mood; blink: boolean }) {
  const rig = RIGS[pet]; const image = PET_IMAGE[pet];
  const lids = <image href={image.lids} width={image.width} height={image.height} visibility="hidden" />;
  if (mood === 'idle' && !blink) return lids;
  const happy = mood === 'happy' && !blink;
  return (
    <g className="rig-lids">
      <image href={image.lids} width={image.width} height={image.height} />
      {rig.eyes.map(eye => {
        const d = closedEye(eye, rig.lidLine, happy);
        return (
          <g key={eye.cx}>
            <path d={d} fill={rig.lidColor} opacity="0.35" filter={`url(#rig-${pet}-crease)`} transform={`translate(0 ${eye.ry * 0.08})`} />
            <path d={d} fill={rig.lidColor} stroke={rig.lidColor} strokeWidth={eye.ry * 0.04} strokeLinejoin="round" />
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
        <filter id={id('crease')} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
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
