import type { Activity } from './activities';

// 只存在這支手機；任何讀寫失敗都當作沒有資料，功能照常使用。
const TODAY_KEY = 'tiny.today.v1';
const MINE_KEY = 'tiny.mine.v1';

export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function read<T>(key: string): T | null {
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 保存失敗時只留在記憶體 */ }
}

// 「今天做過的」只保留當天，日期不同就視為空；不累計、不計算連續天數。
export function loadToday(date = localDate()): string[] {
  const saved = read<{ date: string; texts: string[] }>(TODAY_KEY);
  return saved && saved.date === date && Array.isArray(saved.texts) ? saved.texts.filter(t => typeof t === 'string') : [];
}
export function saveToday(texts: string[], date = localDate()) { write(TODAY_KEY, { date, texts }); }

export function loadMine(): Activity[] {
  const saved = read<{ id: string; text: string }[]>(MINE_KEY);
  return Array.isArray(saved)
    ? saved.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string').map(item => ({ ...item, category: 'mine' as const }))
    : [];
}
export function saveMine(items: Activity[]) { write(MINE_KEY, items.map(({ id, text }) => ({ id, text }))); }
