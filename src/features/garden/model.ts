// 療癒小花園的資料：座標都用固定的邏輯尺寸，畫面再等比例縮放。
export const W = 1000;
export const H = 750;
export const POND = { cx: 820, cy: 610, rx: 150, ry: 100 };

export type FlowerKind = 'blush' | 'cream' | 'lavender';
export const FLOWER_KINDS: readonly FlowerKind[] = ['blush', 'cream', 'lavender'];
export interface Flower { id: string; x: number; y: number; kind: FlowerKind }
export interface Stone { id: string; x: number; y: number; r: number }
export interface GardenItems { flowers: Flower[]; stones: Stone[] }

export const STARTER: GardenItems = {
  flowers: [],
  stones: [{ id: 's1', x: 300, y: 300, r: 46 }, { id: 's2', x: 390, y: 350, r: 30 }, { id: 's3', x: 640, y: 210, r: 38 }],
};

export const clampX = (x: number) => Math.min(W - 20, Math.max(20, x));
export const clampY = (y: number) => Math.min(H - 20, Math.max(20, y));

export function inPond(x: number, y: number, margin = 0): boolean {
  const dx = (x - POND.cx) / (POND.rx + margin);
  const dy = (y - POND.cy) / (POND.ry + margin);
  return dx * dx + dy * dy <= 1;
}

const ITEMS_KEY = 'garden.items.v1';
const SAND_KEY = 'garden.sand.v1';
const KEEP_KEY = 'garden.keep.v1';

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
  try {
    window.localStorage.setItem(KEEP_KEY, String(keep));
    if (!keep) { window.localStorage.removeItem(ITEMS_KEY); window.localStorage.removeItem(SAND_KEY); return; }
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    if (sand) window.localStorage.setItem(SAND_KEY, sand); else window.localStorage.removeItem(SAND_KEY);
  } catch { /* 空間不足或被封鎖：花園照常可用，只是不保存 */ }
}
