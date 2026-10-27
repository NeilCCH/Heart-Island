// 心情小天氣：每天最多一個天氣，只存在這支手機。不計分、不算平均、不畫趨勢。
export const WEATHERS = ['sunny', 'partly', 'cloudy', 'fog', 'rain', 'storm'] as const;
export type Weather = (typeof WEATHERS)[number];
export type MoodDays = Record<string, Weather>;

const KEY = 'mood.days.v1';
const KEEP = 60; // 只保留最近 60 筆，舊的自然淡出

export function loadDays(): MoodDays {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return {};
    const days: MoodDays = {};
    for (const [date, weather] of Object.entries(raw)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && (WEATHERS as readonly unknown[]).includes(weather)) days[date] = weather as Weather;
    }
    return days;
  } catch { return {}; }
}

export function saveDays(days: MoodDays) {
  const kept = Object.fromEntries(Object.entries(days).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, KEEP));
  try { window.localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* 只留在記憶體 */ }
  return kept;
}

export function clearDays() {
  try { window.localStorage.removeItem(KEY); } catch { /* 本來就沒有保存 */ }
}

// 從今天往回數 n 天（含今天），舊的在前。
export function lastDays(n: number, today: Date = new Date()): string[] {
  const pad = (v: number) => String(v).padStart(2, '0');
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}
