import type { Action, Mood } from './useCompanionMood';

// 2.5D 小貓：同一張已核准的去背小貓圖，以 clipPath 切成頭、身體、尾巴三層，
// 分別繞關節點轉動；眼皮是疊在眼睛上的簡單向量，只用來眨眼、瞇眼與睡覺。不重繪、不換貓。
export const CAT_SRC = `${import.meta.env.BASE_URL}assets/cat/cutout.png`;
export const CAT_W = 361;
export const CAT_H = 436;
// 小貓在房間（600×800）裡的位置
export const CAT_X = 120;
export const CAT_Y = 300;

const HEAD_CLIP = '0,0 361,0 361,252 262,262 200,286 128,282 0,262';
const BODY_CLIP = '0,236 361,236 361,436 92,436 92,300 0,300';
const TAIL_CLIP = '0,292 98,292 98,425 0,425';
const EYES = [{ cx: 138, cy: 170, rx: 30, ry: 26 }, { cx: 229, cy: 146, rx: 28, ry: 26 }];

export type Region = 'head' | 'cheekLeft' | 'cheekRight' | 'body' | null;

// 房間座標 → 小貓身上的哪個部位
export function regionAt(x: number, y: number): Region {
  const cx = x - CAT_X; const cy = y - CAT_Y;
  if (cx < 0 || cy < 0 || cx > CAT_W || cy > CAT_H) return null;
  const inHead = ((cx - 190) / 150) ** 2 + ((cy - 150) / 125) ** 2 <= 1;
  if (inHead) {
    if (cy > 175 && cx < 125) return 'cheekLeft';
    if (cy > 175 && cx > 255) return 'cheekRight';
    return 'head';
  }
  return cy > 250 ? 'body' : null;
}

// 眼皮：把同一張圖往下移，讓眼睛上方的真實毛色蓋住眼睛，再以羽化遮罩融入周圍，最後畫上閉眼的線。
const LID_SHIFT = 52;
function Lids({ mood, blink }: { mood: Mood; blink: boolean }) {
  if (mood === 'idle' && !blink) return null;
  const happy = mood === 'happy' && !blink;
  return (
    <g className="rig-lids">
      {EYES.map((eye, i) => {
        const left = eye.cx - eye.rx + 4; const right = eye.cx + eye.rx - 4;
        const line = happy
          ? `M ${left} ${eye.cy + 6} Q ${eye.cx} ${eye.cy - eye.ry * 0.55} ${right} ${eye.cy + 6}`
          : `M ${left} ${eye.cy} Q ${eye.cx} ${eye.cy + eye.ry * 0.45} ${right} ${eye.cy}`;
        return (
          <g key={eye.cx}>
            <g mask={`url(#rig-eye-mask-${i})`}>
              <image href={CAT_SRC} width={CAT_W} height={CAT_H} transform={`translate(0 ${LID_SHIFT})`} />
            </g>
            <path d={line} fill="none" stroke="#5a3420" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

export function CatRig({ mood, action, blink, lean }: { mood: Mood; action: Action; blink: boolean; lean: number }) {
  return (
    <svg x={CAT_X} y={CAT_Y} width={CAT_W} height={CAT_H} viewBox={`0 0 ${CAT_W} ${CAT_H}`} overflow="visible"
      className={`rig rig--${mood} rig--act-${action}`}>
      <defs>
        <clipPath id="rig-head"><polygon points={HEAD_CLIP} /></clipPath>
        <clipPath id="rig-body"><polygon points={BODY_CLIP} /></clipPath>
        <clipPath id="rig-tail"><polygon points={TAIL_CLIP} /></clipPath>
        <radialGradient id="rig-fade"><stop offset="0.8" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        {EYES.map((eye, i) => (
          <mask key={i} id={`rig-eye-mask-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={CAT_W} height={CAT_H}>
            <ellipse cx={eye.cx} cy={eye.cy} rx={eye.rx + 11} ry={eye.ry + 9} fill="url(#rig-fade)" />
          </mask>
        ))}
      </defs>
      <g className="rig-breath">
        <g className="rig-stretch">
          <g className="rig-tail"><image href={CAT_SRC} width={CAT_W} height={CAT_H} clipPath="url(#rig-tail)" /></g>
          <image href={CAT_SRC} width={CAT_W} height={CAT_H} clipPath="url(#rig-body)" />
          <g className="rig-head-lean" style={{ transform: `rotate(${lean}deg)` }}>
            <g className="rig-head">
              <image href={CAT_SRC} width={CAT_W} height={CAT_H} clipPath="url(#rig-head)" />
              <Lids mood={mood} blink={blink} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
