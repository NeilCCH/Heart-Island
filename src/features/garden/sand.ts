import { H, W } from './model';

// 沙盤繪製：底色加細顆粒，耙子畫出溝槽（暗線＋亮線）。jsdom 等沒有 canvas 的環境會拿到 null，直接略過。
const SAND = '#e8dfcf';

export function drawBase(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9000; i++) {
    const shade = rand() < 0.5 ? 'rgba(120,100,70,0.10)' : 'rgba(255,255,255,0.22)';
    ctx.fillStyle = shade;
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
}

export interface Point { x: number; y: number }

export function drawRake(ctx: CanvasRenderingContext2D, from: Point, to: Point, tines: number) {
  const dx = to.x - from.x; const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return;
  const nx = -dy / length; const ny = dx / length;
  const spacing = 16;
  ctx.lineCap = 'round';
  for (let i = 0; i < tines; i++) {
    const offset = (i - (tines - 1) / 2) * spacing;
    const ox = nx * offset; const oy = ny * offset;
    ctx.strokeStyle = '#cbbd9f'; ctx.lineWidth = 5; // 不透明色：線段重疊處不會變深成點狀
    ctx.beginPath(); ctx.moveTo(from.x + ox, from.y + oy); ctx.lineTo(to.x + ox, to.y + oy); ctx.stroke();
    ctx.strokeStyle = '#f7f1e3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(from.x + ox + nx * 3, from.y + oy + ny * 3); ctx.lineTo(to.x + ox + nx * 3, to.y + oy + ny * 3); ctx.stroke();
  }
}

// 鍵盤或按鈕替代：畫一道平緩的波浪沙紋。
export function wavePath(seed: number): Point[] {
  const y0 = 120 + (seed * 137) % 420;
  const amplitude = 18 + (seed * 53) % 24;
  return Array.from({ length: 41 }, (_, i) => ({ x: 40 + i * 23, y: y0 + Math.sin(i / 4 + seed) * amplitude }));
}
