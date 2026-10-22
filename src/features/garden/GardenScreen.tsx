import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { OptionGroup } from '../energy/ui/components/OptionGroup';
import { TopBar } from '../energy/ui/components/TopBar';
import { gardenCopy as copy } from './copy';
import {
  FLOWER_KINDS, H, POND, STARTER, W, clampX, clampY, inPond, loadItems, loadKeep, loadSand, saveGarden,
  type Flower, type FlowerKind, type GardenItems, type Stone,
} from './model';
import { drawBase, drawRake, wavePath, type Point } from './sand';
import './garden.css';

type Tool = 'rake' | 'flower' | 'stone';
type Drag = { kind: 'rake'; last: Point } | { kind: 'stone'; id: string; dx: number; dy: number } | null;
interface Ripple { id: number; x: number; y: number }

const toolOptions = (['rake', 'flower', 'stone'] as const).map(value => ({ value, label: copy.tools[value] }));
const tineOptions = [1, 3, 5].map(value => ({ value, label: copy.tines(value) }));
const PETALS: Record<FlowerKind, [string, string]> = { blush: ['#f2b8c0', '#e98fa0'], cream: ['#fbf3df', '#efd9a8'], lavender: ['#cdbfe8', '#a996d6'] };

let nextId = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`;

function snapshot(canvas: HTMLCanvasElement | null): string | null {
  try { const url = canvas?.toDataURL('image/jpeg', 0.85); return url && url.startsWith('data:image/') ? url : null; } catch { return null; }
}

// 療癒小花園：沒有分數、任務或時間限制。沙紋畫在 canvas，花、石頭與池塘是覆蓋其上的 SVG。
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

  const context = () => canvasRef.current?.getContext('2d') ?? null;

  useEffect(() => {
    const ctx = context();
    if (!ctx) return;
    drawBase(ctx);
    const saved = sandRef.current;
    if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, W, H); img.src = saved; }
  }, []);

  useEffect(() => { saveGarden(keep, items, sandRef.current); }, [items, keep]);
  const saveSand = useCallback(() => { sandRef.current = snapshot(canvasRef.current); saveGarden(keep, items, sandRef.current); }, [keep, items]);

  const toLogical = (event: ReactPointerEvent): Point => {
    const rect = trayRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) * W) / (rect.width || W), y: ((event.clientY - rect.top) * H) / (rect.height || H) };
  };
  const stoneAt = (p: Point): Stone | undefined => [...items.stones].reverse().find(s => Math.hypot(p.x - s.x, p.y - s.y) <= s.r + 6);

  const ripple = useCallback((x: number, y: number) => {
    if (reducedMotion) return;
    const id = Date.now() + Math.random();
    setRipples(list => [...list.slice(-4), { id, x, y }]);
    window.setTimeout(() => setRipples(list => list.filter(r => r.id !== id)), 1800);
  }, [reducedMotion]);

  const plant = (x: number, y: number) => {
    if (inPond(x, y, 20)) return;
    const kind = FLOWER_KINDS[Math.floor(random() * FLOWER_KINDS.length) % FLOWER_KINDS.length];
    const flower: Flower = { id: uid('f'), x: clampX(x), y: clampY(y), kind };
    setItems(current => ({ ...current, flowers: [...current.flowers, flower].slice(-300) }));
  };
  const placeStone = (x: number, y: number) => {
    if (inPond(x, y, 30)) return;
    const stone: Stone = { id: uid('s'), x: clampX(x), y: clampY(y), r: 26 + Math.round(random() * 20) };
    setItems(current => ({ ...current, stones: [...current.stones, stone].slice(-60) }));
  };
  const randomSpot = (): Point => {
    for (let i = 0; i < 20; i++) {
      const p = { x: 60 + random() * (W - 120), y: 60 + random() * (H - 120) };
      if (!inPond(p.x, p.y, 40)) return p;
    }
    return { x: 200, y: 200 };
  };

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const p = toLogical(event);
    if (inPond(p.x, p.y)) { ripple(p.x, p.y); return; }
    const stone = stoneAt(p);
    trayRef.current?.setPointerCapture?.(event.pointerId);
    if (stone) { dragRef.current = { kind: 'stone', id: stone.id, dx: stone.x - p.x, dy: stone.y - p.y }; return; }
    if (tool === 'rake') dragRef.current = { kind: 'rake', last: p };
    else if (tool === 'flower') plant(p.x, p.y);
    else placeStone(p.x, p.y);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
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
  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === 'rake') saveSand();
  }

  function quickWave() {
    const ctx = context();
    const points = wavePath(waveSeed.current++);
    if (ctx) for (let i = 1; i < points.length; i++) drawRake(ctx, points[i - 1], points[i], tines);
    saveSand();
  }
  function smooth() {
    const ctx = context();
    if (ctx) drawBase(ctx);
    sandRef.current = null;
    saveGarden(keep, items, null);
  }
  function resetAll() { smooth(); setItems(STARTER); }

  return (
    <div className="screen feature garden">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>
      <p className="feature__intro">{copy.intro}</p>

      <div ref={trayRef} className={`garden-tray garden-tray--${tool}`} role="img" aria-label={`${copy.areaLabel}：${copy.summary(items.flowers.length, items.stones.length)}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <canvas ref={canvasRef} width={W} height={H} className="garden-sand" />
        <svg className="garden-layer" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="g-water" cx="40%" cy="35%"><stop offset="0" stopColor="#c9dbe8" /><stop offset="1" stopColor="#7f9db8" /></radialGradient>
            <radialGradient id="g-stone" cx="35%" cy="30%"><stop offset="0" stopColor="#a8a7a2" /><stop offset="1" stopColor="#5d5f63" /></radialGradient>
          </defs>
          <ellipse cx={POND.cx} cy={POND.cy + 6} rx={POND.rx + 10} ry={POND.ry + 8} fill="rgba(90,80,60,0.18)" />
          <ellipse cx={POND.cx} cy={POND.cy} rx={POND.rx} ry={POND.ry} fill="url(#g-water)" />
          {ripples.map(r => <circle key={r.id} className="garden-ripple" cx={r.x} cy={r.y} r={90} />)}
          {items.stones.map(s => (
            <g key={s.id}>
              <ellipse cx={s.x + 5} cy={s.y + 8} rx={s.r} ry={s.r * 0.8} fill="rgba(70,60,40,0.22)" />
              <ellipse cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.82} fill="url(#g-stone)" />
            </g>
          ))}
          {items.flowers.map(f => (
            <g key={f.id} className="garden-flower" transform={`translate(${f.x} ${f.y})`}>
              <g className="garden-flower__bloom">
                {[0, 72, 144, 216, 288].map(angle => (
                  <ellipse key={angle} cx="0" cy="-11" rx="8" ry="12" fill={PETALS[f.kind][0]} stroke={PETALS[f.kind][1]} strokeWidth="1" transform={`rotate(${angle})`} />
                ))}
                <circle r="6" fill="#f2c46b" />
              </g>
            </g>
          ))}
        </svg>
      </div>
      <p className="muted small">{copy.hint[tool]}{copy.pondHint}</p>

      <OptionGroup<Tool> legend={copy.toolLabel} options={toolOptions} value={tool} onChange={setTool} compact />
      {tool === 'rake' && <OptionGroup<number> legend={copy.tinesLabel} options={tineOptions} value={tines} onChange={setTines} compact />}

      <div className="controls">
        <button type="button" className="btn" onClick={quickWave}>{copy.quick.wave}</button>
        <button type="button" className="btn" onClick={() => { const p = randomSpot(); plant(p.x, p.y); }}>{copy.quick.flower}</button>
        <button type="button" className="btn" onClick={() => { const p = randomSpot(); placeStone(p.x, p.y); }}>{copy.quick.stone}</button>
        <button type="button" className="btn" onClick={() => ripple(POND.cx, POND.cy)}>{copy.quick.ripple}</button>
        <button type="button" className="btn btn--ghost" onClick={smooth}>{copy.smooth}</button>
      </div>

      <div className="field">
        <label className="switch">
          <input type="checkbox" role="switch" checked={keep} onChange={event => setKeep(event.target.checked)} />
          <span>{copy.keep}</span>
        </label>
      </div>
      <div className="controls">
        <button type="button" className="btn btn--ghost" onClick={resetAll}>{copy.reset}</button>
      </div>
    </div>
  );
}
