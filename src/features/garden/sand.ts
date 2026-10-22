import { FRAME, H, POND_POINTS, ROCK_GROUPS, W, smoothPath, type Point } from './model';

export type { Point };

// 沙盤繪製：底色加細顆粒，耙子畫出溝槽（暗線＋亮線）。jsdom 等沒有 canvas 的環境會拿到 null，直接略過。
const SAND = '#e9e0cf';
const GROOVE = '#cdbfa2';
const RIDGE = '#f8f2e4';

function grain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number) {
  let seed = 7 + Math.round(x + y);
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(120,100,70,0.10)' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + rand() * w, y + rand() * h, 1.8, 1.8);
  }
}

function strokeGroove(ctx: CanvasRenderingContext2D, path: () => void, nx = 0, ny = 1) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = GROOVE; ctx.lineWidth = 5; ctx.beginPath(); path(); ctx.stroke();
  ctx.save(); ctx.translate(nx * 3, ny * 3);
  ctx.strokeStyle = RIDGE; ctx.lineWidth = 2; ctx.beginPath(); path(); ctx.stroke();
  ctx.restore();
}

// plain：剛抹平的沙；classic：枯山水的直紋，加上石組與池塘周圍的同心圓紋。
export function drawBase(ctx: CanvasRenderingContext2D, pattern: 'plain' | 'classic' = 'classic') {
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, 0, 0, W, H, 16000);
  if (pattern === 'plain') return;

  for (let y = FRAME + 26; y < H - FRAME - 10; y += 22) {
    strokeGroove(ctx, () => { ctx.moveTo(FRAME + 6, y); ctx.lineTo(W - FRAME - 6, y); });
  }
  const hasPath2D = typeof Path2D !== 'undefined';
  if (hasPath2D) {
    // 池塘周圍：先抹平，再畫兩圈沿著池岸的紋路
    ctx.fillStyle = SAND; ctx.fill(new Path2D(smoothPath(POND_POINTS, 1.3)));
    for (const scale of [1.13, 1.22]) {
      const ring = new Path2D(smoothPath(POND_POINTS, scale));
      ctx.lineCap = 'round'; ctx.strokeStyle = GROOVE; ctx.lineWidth = 5; ctx.stroke(ring);
      ctx.save(); ctx.translate(0, 3); ctx.strokeStyle = RIDGE; ctx.lineWidth = 2; ctx.stroke(ring); ctx.restore();
    }
  }
  for (const group of ROCK_GROUPS) {
    ctx.fillStyle = SAND;
    ctx.beginPath(); ctx.arc(group.x, group.y, group.ring + 12, 0, Math.PI * 2); ctx.fill();
    grain(ctx, group.x - group.ring, group.y - group.ring, group.ring * 2, group.ring * 2, 2500);
    for (let r = 64; r <= group.ring; r += 22) {
      strokeGroove(ctx, () => { ctx.arc(group.x, group.y, r, 0, Math.PI * 2); });
    }
  }
}

export function drawRake(ctx: CanvasRenderingContext2D, from: Point, to: Point, tines: number) {
  const dx = to.x - from.x; const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return;
  const nx = -dy / length; const ny = dx / length;
  const spacing = 18;
  ctx.lineCap = 'round';
  for (let i = 0; i < tines; i++) {
    const offset = (i - (tines - 1) / 2) * spacing;
    const ox = nx * offset; const oy = ny * offset;
    // 不透明色：線段重疊處不會變深成點狀
    ctx.strokeStyle = GROOVE; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(from.x + ox, from.y + oy); ctx.lineTo(to.x + ox, to.y + oy); ctx.stroke();
    ctx.strokeStyle = RIDGE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(from.x + ox + nx * 3, from.y + oy + ny * 3); ctx.lineTo(to.x + ox + nx * 3, to.y + oy + ny * 3); ctx.stroke();
  }
}

// 鍵盤或按鈕替代：畫一道平緩的波浪沙紋（避開池塘所在的下方）。
export function wavePath(seed: number): Point[] {
  const y0 = 160 + (seed * 137) % 680;
  const amplitude = 16 + (seed * 53) % 22;
  return Array.from({ length: 37 }, (_, i) => ({ x: FRAME + 30 + i * 22, y: y0 + Math.sin(i / 4 + seed) * amplitude }));
}
