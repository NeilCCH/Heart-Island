// 感謝小罐子：一張紙條一句話，只存在這支手機。
export interface Note { id: string; text: string; date: string }

const KEY = 'jar.notes.v1';
export const NOTE_MAX = 60;
export const NOTES_KEEP = 300;

export function loadNotes(): Note[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (!Array.isArray(raw)) return [];
    return raw.filter((n): n is Note => !!n && typeof n.id === 'string' && typeof n.text === 'string' && typeof n.date === 'string')
      .map(n => ({ id: n.id, text: n.text.slice(0, NOTE_MAX), date: n.date }));
  } catch { return []; }
}

export function saveNotes(notes: Note[]): Note[] {
  const kept = notes.slice(-NOTES_KEEP);
  try { window.localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* 只留在記憶體 */ }
  return kept;
}

export function clearNotes() {
  try { window.localStorage.removeItem(KEY); } catch { /* 本來就沒有保存 */ }
}
