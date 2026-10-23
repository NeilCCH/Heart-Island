import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { OptionGroup } from '../energy/ui/components/OptionGroup';
import { TopBar } from '../energy/ui/components/TopBar';
import { gardenCopy as copy } from './copy';
import {
  FLOWER_KINDS, FRAME, H, POND_CENTER, POND_POINTS, ROCK_GROUPS, STARTER, W, clampX, clampY, inPond,
  loadItems, loadKeep, loadSand, saveGarden, smoothPath, stonePath,
  type Flower, type FlowerKind, type GardenItems, type Stone,
} from './model';
import { drawBase, drawRake, wavePath, type Point } from './sand';
import './garden.css';

type Tool = 'rake' | 'flower' | 'stone';
type Drag = ({ kind: 'rake'; last: Point } | { kind: 'stone'; id: string; dx: number; dy: number }) & { pointerId: number } | null;
interface Ripple { id: number; x: number; y: number }

const toolOptions = (['rake', 'flower', 'stone'] as const).map(value => ({ value, label: copy.tools[value] }));
const tineOptions = [1, 3, 5].map(value => ({ value, label: copy.tines(value) }));
// 杜鵑花叢的花色：[花瓣, 花心]
const BLOSSOM: Record<FlowerKind, [string, string]> = { blush: ['#f0a6b4', '#fbe3e7'], cream: ['#fbf4e2', '#f3d98f'], lavender: ['#c4b2e6', '#ece4fa'] };
// 楓樹樹冠：深色底層、中間色、亮色高光三層小葉團，帶出立體感。
const MAPLE_LEAVES = (() => {
  const layers = [
    { colors: ['#8e3324', '#9c3b2b', '#7a3a24'], count: 26, spread: 120, r: [18, 30], o: 0.95, cx: 95, cy: 105 },
    { colors: ['#c4512f', '#d2663a', '#c8553d', '#b8452f'], count: 46, spread: 112, r: [12, 22], o: 0.92, cx: 88, cy: 98 },
    { colors: ['#e58a4e', '#e9a64b', '#f0bd5c', '#a7ae58'], count: 30, spread: 100, r: [7, 13], o: 0.9, cx: 80, cy: 88 },
  ];
  const leaves: { x: number; y: number; r: number; fill: string; o: number }[] = [];
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const angle = rand() * Math.PI * 2; const dist = Math.sqrt(rand()) * layer.spread;
      leaves.push({ x: layer.cx + Math.cos(angle) * dist, y: layer.cy + Math.sin(angle) * dist * 0.85,
        r: layer.r[0] + rand() * (layer.r[1] - layer.r[0]), fill: layer.colors[i % layer.colors.length], o: layer.o });
    }
  }
  return leaves;
})();

let nextId = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`;

function snapshot(canvas: HTMLCanvasElement | null): string | null {
  try { const url = canvas?.toDataURL('image/jpeg', 0.85); return url && url.startsWith('data:image/') ? url : null; } catch { return null; }
}

function seeded(id: string) {
  let seed = 1;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  return () => { seed = (seed * 16807 + 7) % 2147483647; return seed / 2147483647; };
}

// 沿池岸排一圈卵石
function pebbleRing() {
  const pts = POND_POINTS.map(p => ({ x: POND_CENTER.x + (p.x - POND_CENTER.x) * 1.05, y: POND_CENTER.y + (p.y - POND_CENTER.y) * 1.05 }));
  const out: { x: number; y: number; r: number; shade: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    for (let k = 0; k < 3; k++) {
      const t = k / 3;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: 10 + ((i * 3 + k) % 4) * 1.8, shade: (i + k) % 3 });
    }
  }
  return out;
}
const PEBBLES = pebbleRing();
const PEBBLE_FILL = ['#b9b4aa', '#a39e95', '#cbc6bc'];
const STEPS = [{ x: 150, y: 1300, rx: 46, ry: 32 }, { x: 225, y: 1225, rx: 40, ry: 30 }, { x: 300, y: 1170, rx: 44, ry: 31 }];

function Shrub({ flower, fresh }: { flower: Flower; fresh: boolean }) {
  const rand = useMemo(() => seeded(flower.id), [flower.id]);
  const blossoms = useMemo(() => Array.from({ length: 11 }, () => {
    const angle = rand() * Math.PI * 2; const dist = 6 + rand() * 24;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, r: 6 + rand() * 3 };
  }), [rand]);
  const [petal, heart] = BLOSSOM[flower.kind];
  return (
    <g className="garden-flower" transform={`translate(${flower.x} ${flower.y})`}>
      <g className={fresh ? 'garden-flower__bloom' : undefined}>
        <ellipse cx="5" cy="9" rx="38" ry="30" fill="rgba(60,50,30,0.18)" />
        <circle r="36" fill="url(#g-leaf)" />
        {blossoms.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={b.r} fill={petal} />
            <circle cx={b.x} cy={b.y} r={b.r * 0.35} fill={heart} />
          </g>
        ))}
      </g>
    </g>
  );
}

// 療癒小花園：枯山水沙盤＋自然池塘。沒有分數、任務或時間限制。
// 沙紋畫在 canvas；石頭、苔蘚、池塘、花叢、楓樹與木框是覆蓋其上的 SVG。
export function GardenScreen({ onOpenSettings, reducedMotion, random = Math.random }: {
  onOpenSettings: () => void; reducedMotion: boolean; random?: () => number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<GardenItems>(loadItems);
  const [keep, setKeep] = useState(loadKeep);
  const [tool, setTool] = useState<Tool>('rake');
  const [tines, setTines] = useState(3);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const sandRef = useRef<string | null>(loadSand());
  const dragRef = useRef<Drag>(null);
  const waveSeed = useRef(1);
  // 只有這次新種的花叢才有長出來的動畫，打開花園時原本就在的花直接顯示。
  const freshIds = useRef(new Set<string>());

  const context = () => canvasRef.current?.getContext('2d') ?? null;

  useEffect(() => {
    const ctx = context();
    if (!ctx) return;
    const saved = sandRef.current;
    drawBase(ctx, 'classic');
    if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, W, H); img.src = saved; }
  }, []);

  useEffect(() => { saveGarden(keep, items, sandRef.current); }, [items, keep]);
  const saveSand = useCallback(() => { sandRef.current = snapshot(canvasRef.current); saveGarden(keep, items, sandRef.current); }, [keep, items]);

  const toLogical = (event: ReactPointerEvent): Point => {
    const rect = trayRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) * W) / (rect.width || W), y: ((event.clientY - rect.top) * H) / (rect.height || H) };
  };
  const stoneAt = (p: Point): Stone | undefined => [...items.stones].reverse().find(s => Math.hypot(p.x - s.x, p.y - s.y) <= s.r + 8);

  const ripple = useCallback((x: number, y: number) => {
    if (reducedMotion) return;
    const id = Date.now() + Math.random();
    setRipples(list => [...list.slice(-4), { id, x, y }]);
    window.setTimeout(() => setRipples(list => list.filter(r => r.id !== id)), 2200);
  }, [reducedMotion]);

  const plant = (x: number, y: number) => {
    if (inPond(x, y, 30)) return;
    const kind = FLOWER_KINDS[Math.floor(random() * FLOWER_KINDS.length) % FLOWER_KINDS.length];
    const flower: Flower = { id: uid('f'), x: clampX(x), y: clampY(y), kind };
    freshIds.current.add(flower.id);
    setItems(current => ({ ...current, flowers: [...current.flowers, flower].slice(-300) }));
  };
  const placeStone = (x: number, y: number) => {
    if (inPond(x, y, 30)) return;
    const stone: Stone = { id: uid('s'), x: clampX(x), y: clampY(y), r: 26 + Math.round(random() * 22) };
    setItems(current => ({ ...current, stones: [...current.stones, stone].slice(-60) }));
  };
  const randomSpot = (): Point => {
    for (let i = 0; i < 30; i++) {
      const p = { x: FRAME + 60 + random() * (W - 2 * FRAME - 120), y: FRAME + 160 + random() * (H - 2 * FRAME - 260) };
      if (!inPond(p.x, p.y, 50)) return p;
    }
    return { x: 300, y: 400 };
  };

  // 一次只跟隨一根手指：拖曳期間其他指標的按下、移動、放開都忽略。
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    const p = toLogical(event);
    const { pointerId } = event;
    // 先判斷石頭：石頭若被拖進池塘，仍然可以再拿起來。
    const stone = stoneAt(p);
    if (!stone && inPond(p.x, p.y)) { ripple(p.x, p.y); return; }
    trayRef.current?.setPointerCapture?.(pointerId);
    if (stone) { dragRef.current = { kind: 'stone', id: stone.id, dx: stone.x - p.x, dy: stone.y - p.y, pointerId }; return; }
    if (tool === 'rake') dragRef.current = { kind: 'rake', last: p, pointerId };
    else if (tool === 'flower') plant(p.x, p.y);
    else placeStone(p.x, p.y);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const p = toLogical(event);
    if (drag.kind === 'rake') {
      const ctx = context();
      if (ctx) drawRake(ctx, drag.last, p, tines);
      drag.last = p;
    } else {
      const x = clampX(p.x + drag.dx); const y = clampY(p.y + drag.dy);
      setItems(current => ({ ...current, stones: current.stones.map(s => (s.id === drag.id ? { ...s, x, y } : s)) }));
    }
  }
  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (drag.kind === 'rake') saveSand();
  }

  function quickWave() {
    const ctx = context();
    const points = wavePath(waveSeed.current++);
    if (ctx) for (let i = 1; i < points.length; i++) drawRake(ctx, points[i - 1], points[i], tines);
    saveSand();
  }
  function smooth() {
    const ctx = context();
    if (ctx) drawBase(ctx, 'plain');
    sandRef.current = snapshot(canvasRef.current);
    saveGarden(keep, items, sandRef.current);
  }
  function resetAll() {
    const ctx = context();
    if (ctx) drawBase(ctx, 'classic');
    sandRef.current = null;
    setItems(STARTER);
    saveGarden(keep, STARTER, null);
  }

  const pondPath = smoothPath(POND_POINTS);

  return (
    <div className="screen feature garden">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="sr-only">{copy.title}</h1>

      <div ref={trayRef} className={`garden-stage garden-stage--${tool}`} role="img"
        aria-label={`${copy.areaLabel}：${copy.summary(items.flowers.length, items.stones.length)}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <canvas ref={canvasRef} width={W} height={H} className="garden-sand" />
        <svg className="garden-layer" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="g-water" cx="45%" cy="40%" r="65%"><stop offset="0" stopColor="#7fa9b5" /><stop offset="0.6" stopColor="#4f7f8f" /><stop offset="1" stopColor="#2f5a68" /></radialGradient>
            <radialGradient id="g-stone" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#b3aea4" /><stop offset="0.7" stopColor="#7c7a76" /><stop offset="1" stopColor="#5b5a58" /></radialGradient>
            <radialGradient id="g-moss" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#7f9a52" /><stop offset="0.75" stopColor="#6a8545" /><stop offset="1" stopColor="#6a8545" stopOpacity="0" /></radialGradient>
            <radialGradient id="g-leaf" cx="40%" cy="35%"><stop offset="0" stopColor="#6f8f4a" /><stop offset="1" stopColor="#3f5f32" /></radialGradient>
            <linearGradient id="g-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a6446" /><stop offset="0.5" stopColor="#7a5539" /><stop offset="1" stopColor="#6b4a31" /></linearGradient>
            <clipPath id="g-pond-clip"><path d={pondPath} /></clipPath>
            <filter id="g-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>

          {/* 苔蘚島 */}
          {ROCK_GROUPS.map((g, i) => (
            <ellipse key={i} cx={g.x} cy={g.y + 20} rx={g.ring * 0.62} ry={g.ring * 0.45} fill="url(#g-moss)" filter="url(#g-soft)" />
          ))}

          {/* 踏腳石 */}
          {STEPS.map((s, i) => (
            <g key={i}>
              <ellipse cx={s.x + 4} cy={s.y + 6} rx={s.rx} ry={s.ry} fill="rgba(60,50,35,0.18)" />
              <ellipse cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill="#cfc8bb" stroke="#b6ae9f" strokeWidth="2" />
            </g>
          ))}

          {/* 池塘：陰影、水面、倒影光、睡蓮、錦鯉、漣漪、池岸卵石 */}
          <path d={smoothPath(POND_POINTS, 1.04)} fill="rgba(70,60,40,0.22)" transform="translate(4 8)" />
          <path d={pondPath} fill="url(#g-water)" />
          <g clipPath="url(#g-pond-clip)">
            <ellipse cx={POND_CENTER.x - 60} cy={POND_CENTER.y - 60} rx="110" ry="40" fill="rgba(255,255,255,0.12)" transform={`rotate(-18 ${POND_CENTER.x} ${POND_CENTER.y})`} />
            <g className="koi koi--a" style={{ transformOrigin: `${POND_CENTER.x}px ${POND_CENTER.y}px` }}>
              <g transform={`translate(${POND_CENTER.x + 70} ${POND_CENTER.y})`}>
                <path d="M0 -26 C 10 -14 10 12 0 22 C -10 12 -10 -14 0 -26 Z" fill="#f2f0ea" />
                <path d="M-6 -12 C 2 -16 8 -8 6 0 C 0 -2 -6 -4 -6 -12 Z" fill="#e2683c" />
                <path d="M0 20 L -9 36 L 0 31 L 9 36 Z" fill="#e2683c" opacity="0.85" />
              </g>
            </g>
            <g className="koi koi--b" style={{ transformOrigin: `${POND_CENTER.x}px ${POND_CENTER.y}px` }}>
              <g transform={`translate(${POND_CENTER.x - 110} ${POND_CENTER.y + 10}) rotate(180)`}>
                <path d="M0 -22 C 9 -12 9 10 0 19 C -9 10 -9 -12 0 -22 Z" fill="#e88a3c" />
                <path d="M-4 -6 C 3 -9 6 -2 4 4 C 0 2 -4 0 -4 -6 Z" fill="#f6f2ea" />
                <path d="M0 17 L -8 31 L 0 27 L 8 31 Z" fill="#e88a3c" opacity="0.85" />
              </g>
            </g>
            {[{ x: 700, y: 1010, r: 26, rot: 20 }, { x: 500, y: 1160, r: 22, rot: 140 }, { x: 735, y: 1160, r: 18, rot: 260 }].map((pad, i) => (
              <g key={i} transform={`translate(${pad.x} ${pad.y}) rotate(${pad.rot})`}>
                <path d={`M0 0 L ${pad.r} -6 A ${pad.r} ${pad.r} 0 1 1 ${pad.r} 6 Z`} fill="#6f9a52" stroke="#5a8043" strokeWidth="1.5" />
                {i === 0 && <circle cx="-6" cy="-4" r="7" fill="#f6c6d0" stroke="#e79aab" />}
              </g>
            ))}
            {ripples.map(r => <circle key={r.id} className="garden-ripple" cx={r.x} cy={r.y} r={110} />)}
          </g>
          {PEBBLES.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.8} fill={PEBBLE_FILL[p.shade]} stroke="rgba(80,70,60,0.25)" strokeWidth="1" />
          ))}

          {/* 花叢 */}
          {items.flowers.map(f => <Shrub key={f.id} flower={f} fresh={freshIds.current.has(f.id)} />)}

          {/* 石頭 */}
          {items.stones.map(s => {
            const d = stonePath(s);
            return (
              <g key={s.id}>
                <path d={d} fill="rgba(60,50,35,0.25)" transform="translate(7 10)" />
                <path d={d} fill="url(#g-stone)" stroke="rgba(60,58,55,0.35)" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* 角落楓樹的樹冠 */}
          <g className="garden-maple">
            <ellipse cx="130" cy="160" rx="160" ry="125" fill="rgba(40,30,20,0.18)" filter="url(#g-soft)" />
            {MAPLE_LEAVES.map((leaf, i) => <circle key={i} cx={leaf.x} cy={leaf.y} r={leaf.r} fill={leaf.fill} opacity={leaf.o} />)}
          </g>

          {/* 木框 */}
          <path fillRule="evenodd" fill="url(#g-wood)"
            d={`M0 0 H${W} V${H} H0 Z M${FRAME} ${FRAME} V${H - FRAME} H${W - FRAME} V${FRAME} Z`} />
          <rect x={FRAME} y={FRAME} width={W - 2 * FRAME} height={H - 2 * FRAME} fill="none" stroke="rgba(40,25,15,0.35)" strokeWidth="4" />
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t} stroke="rgba(50,32,20,0.25)" strokeWidth="2">
              <line x1={W * t} y1="0" x2={W * t} y2={FRAME} /><line x1={W * t} y1={H - FRAME} x2={W * t} y2={H} />
              <line x1="0" y1={H * t} x2={FRAME} y2={H * t} /><line x1={W - FRAME} y1={H * t} x2={W} y2={H * t} />
            </g>
          ))}
        </svg>
      </div>
      <p className="muted small garden-hint">{copy.hint[tool]}{copy.pondHint}</p>

      <div className="garden-tools">
        <OptionGroup<Tool> legend={copy.toolLabel} options={toolOptions} value={tool} onChange={setTool} compact />
        {tool === 'rake' && <OptionGroup<number> legend={copy.tinesLabel} options={tineOptions} value={tines} onChange={setTines} compact />}
      </div>

      <details className="garden-more">
        <summary>{copy.more}</summary>
        <div className="stack">
          <div className="controls">
            <button type="button" className="btn" onClick={quickWave}>{copy.quick.wave}</button>
            <button type="button" className="btn" onClick={() => { const p = randomSpot(); plant(p.x, p.y); }}>{copy.quick.flower}</button>
            <button type="button" className="btn" onClick={() => { const p = randomSpot(); placeStone(p.x, p.y); }}>{copy.quick.stone}</button>
            <button type="button" className="btn" onClick={() => ripple(POND_CENTER.x, POND_CENTER.y)}>{copy.quick.ripple}</button>
          </div>
          <div className="controls">
            <button type="button" className="btn btn--ghost" onClick={smooth}>{copy.smooth}</button>
            <button type="button" className="btn btn--ghost" onClick={resetAll}>{copy.reset}</button>
          </div>
          <label className="switch">
            <input type="checkbox" role="switch" checked={keep} onChange={event => setKeep(event.target.checked)} />
            <span>{copy.keep}</span>
          </label>
        </div>
      </details>
    </div>
  );
}
