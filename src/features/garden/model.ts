// 療癒小花園的資料：座標用固定的直式邏輯尺寸（配合手機），畫面再等比例縮放。
export const W = 900;
export const H = 1400;
export const FRAME = 30; // 木框寬度

export interface Point { x: number; y: number }

// 葫蘆形的自然池塘輪廓（順時針控制點），畫的時候再用平滑曲線連起來。
export const POND_POINTS: readonly Point[] = [
  { x: 470, y: 980 }, { x: 560, y: 940 }, { x: 680, y: 950 }, { x: 770, y: 1010 },
  { x: 800, y: 1100 }, { x: 760, y: 1190 }, { x: 660, y: 1240 }, { x: 560, y: 1225 },
  { x: 500, y: 1170 }, { x: 430, y: 1150 }, { x: 380, y: 1090 }, { x: 400, y: 1020 },
];
export const POND_CENTER: Point = { x: 610, y: 1090 };

export type FlowerKind = 'blush' | 'cream' | 'lavender';
export const FLOWER_KINDS: readonly FlowerKind[] = ['blush', 'cream', 'lavender'];
export interface Flower { id: string; x: number; y: number; kind: FlowerKind }
export interface Stone { id: string; x: number; y: number; r: number }
export interface GardenItems { flowers: Flower[]; stones: Stone[] }

// 兩組石組：右上三尊石、左中二石；底下有苔蘚，沙紋以同心圓環繞。
export const ROCK_GROUPS: readonly { x: number; y: number; ring: number }[] = [
  { x: 610, y: 360, ring: 150 },
  { x: 250, y: 720, ring: 115 },
];
export const STARTER: GardenItems = {
  flowers: [
    { id: 'f1', x: 170, y: 1060, kind: 'blush' },
    { id: 'f2', x: 820, y: 640, kind: 'cream' },
  ],
  stones: [
    { id: 's1', x: 620, y: 340, r: 62 }, { id: 's2', x: 545, y: 400, r: 38 }, { id: 's3', x: 690, y: 410, r: 32 },
    { id: 's4', x: 235, y: 705, r: 48 }, { id: 's5', x: 300, y: 755, r: 28 },
  ],
};

export const clampX = (x: number) => Math.min(W - FRAME - 20, Math.max(FRAME + 20, x));
export const clampY = (y: number) => Math.min(H - FRAME - 20, Math.max(FRAME + 20, y));

// 點是否在池塘內（射線法）；margin 讓池塘邊緣的石頭圈也算進去。
export function inPond(x: number, y: number, margin = 0): boolean {
  const pts = margin === 0 ? POND_POINTS : POND_POINTS.map(p => {
    const dx = p.x - POND_CENTER.x; const dy = p.y - POND_CENTER.y; const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * margin, y: p.y + (dy / d) * margin };
  });
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]; const b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// 平滑封閉曲線（Catmull-Rom 轉三次貝茲），回傳 SVG path。
export function smoothPath(points: readonly Point[], scale = 1, center: Point = POND_CENTER): string {
  const p = points.map(pt => ({ x: center.x + (pt.x - center.x) * scale, y: center.y + (pt.y - center.y) * scale }));
  const n = p.length;
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n]; const p1 = p[i]; const p2 = p[(i + 1) % n]; const p3 = p[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return `${d} Z`;
}

// 由 id 產生固定的不規則石頭外形，讓每顆石頭都不一樣、重新整理也不變。
export function stonePath(stone: Stone): string {
  let seed = 0;
  for (const ch of stone.id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const rand = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  const count = 9;
  const pts = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = stone.r * (0.82 + rand() * 0.28);
    return { x: stone.x + Math.cos(angle) * radius, y: stone.y + Math.sin(angle) * radius * 0.82 };
  });
  return smoothPath(pts, 1, { x: stone.x, y: stone.y });
}

const ITEMS_KEY = 'garden.items.v2';
const SAND_KEY = 'garden.sand.v2';
const KEEP_KEY = 'garden.keep.v1';
const LEGACY_KEYS = ['garden.items.v1', 'garden.sand.v1']; // 舊的橫式花園，座標不相容

function isFlower(v: unknown): v is Flower {
  const f = v as Flower;
  return !!f && typeof f.id === 'string' && Number.isFinite(f.x) && Number.isFinite(f.y) && FLOWER_KINDS.includes(f.kind);
}
function isStone(v: unknown): v is Stone {
  const s = v as Stone;
  return !!s && typeof s.id === 'string' && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.r);
}

// 只存在這支手機；讀不到或格式不對就從預設花園開始。
export function loadItems(): GardenItems {
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
    const raw = JSON.parse(window.localStorage.getItem(ITEMS_KEY) ?? 'null');
    if (!raw || !Array.isArray(raw.flowers) || !Array.isArray(raw.stones)) return STARTER;
    return { flowers: raw.flowers.filter(isFlower).slice(0, 300), stones: raw.stones.filter(isStone).slice(0, 60) };
  } catch { return STARTER; }
}
export function loadSand(): string | null {
  try { const v = window.localStorage.getItem(SAND_KEY); return v && v.startsWith('data:image/') ? v : null; } catch { return null; }
}
export function loadKeep(): boolean {
  try { return window.localStorage.getItem(KEEP_KEY) !== 'false'; } catch { return true; }
}
export function saveGarden(keep: boolean, items: GardenItems, sand: string | null) {
  if (!keep) {
    // 先刪除花園，再記錄「不保存」；即使空間已滿、後面的寫入失敗，資料也已經刪掉。
    try { window.localStorage.removeItem(ITEMS_KEY); window.localStorage.removeItem(SAND_KEY); } catch { /* 無法存取 */ }
    try { window.localStorage.setItem(KEEP_KEY, 'false'); } catch { /* 空間不足：沒有花園資料時預設也不會載入任何東西 */ }
    return;
  }
  try {
    window.localStorage.setItem(KEEP_KEY, 'true');
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    if (sand) window.localStorage.setItem(SAND_KEY, sand); else window.localStorage.removeItem(SAND_KEY);
  } catch { /* 空間不足或被封鎖：花園照常可用，只是不保存 */ }
}
