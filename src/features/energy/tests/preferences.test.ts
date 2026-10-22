import { it, expect } from 'vitest';
import { createPreferenceStore, DEFAULT_SETTINGS, SETTINGS_KEY } from '../settings/preferences';
function memory() { const values = new Map<string,string>(); return { values, getItem: (k:string) => values.get(k) ?? null, setItem: (k:string,v:string) => { values.set(k,v); }, removeItem: (k:string) => { values.delete(k); } }; }
it('預設不保存；開啟立即寫入，關閉刪除且記憶體不變', () => {
  const storage = memory(); const s = createPreferenceStore(() => storage); s.update({ pace: 8 }); expect(storage.values.size).toBe(0); s.setRemember(true); expect(storage.values.has(SETTINGS_KEY)).toBe(true); s.setRemember(false); expect(storage.values.size).toBe(0); expect(s.getSnapshot().settings.pace).toBe(8);
});
it('清除不被之後update自動寫回；reset依remember政策', () => {
  const storage = memory(); const s = createPreferenceStore(() => storage); s.setRemember(true); s.clearSaved(); s.update({ target: 6 }); expect(storage.values.size).toBe(0); s.resetToDefaults(); expect(s.getSnapshot().settings).toEqual(DEFAULT_SETTINGS); s.setRemember(true); s.update({ pace: 8 }); s.resetToDefaults(); expect(JSON.parse(storage.getItem(SETTINGS_KEY)!).settings).toEqual(DEFAULT_SETTINGS);
});
it('逐欄回退、未知版本回預設', () => {
  const storage = memory(); storage.setItem(SETTINGS_KEY, JSON.stringify({ version:1, settings:{ pace:'slow', target:99, volume:4 } })); expect(createPreferenceStore(() => storage).getSnapshot()).toMatchObject({ remember:true, settings:{ pace:8,target:10,volume:0.5 } }); storage.setItem(SETTINGS_KEY, JSON.stringify({ version:9,settings:{ pace:'slow' } })); expect(createPreferenceStore(() => storage).getSnapshot().remember).toBe(false);
});
it('寫入／刪除失敗必須可見且保留本次設定', () => {
  const storage = memory(); const s = createPreferenceStore(() => ({ ...storage, setItem(){ throw Error(); }, removeItem(){ throw Error(); } })); s.update({ pace:8 }); s.setRemember(true); expect(s.getSnapshot().settings.pace).toBe(8); expect(s.getSnapshot().storageError).toContain('無法保存'); s.clearSaved(); expect(s.getSnapshot().storageError).toContain('無法清除');
});
it('損壞JSON與storage存取失敗不阻擋功能', () => { const storage = memory(); storage.setItem(SETTINGS_KEY,'{'); expect(createPreferenceStore(() => storage).getSnapshot().settings).toEqual(DEFAULT_SETTINGS); expect(createPreferenceStore(() => { throw Error(); }).getSnapshot().storageError).not.toBeNull(); });
it('舊版固定節奏名稱轉為秒數，範圍外回預設', () => {
  for (const [legacy, seconds] of [['slow', 8], ['gentle', 6], ['brisk', 4]] as const) {
    const storage = memory(); storage.setItem(SETTINGS_KEY, JSON.stringify({ version:1, settings:{ pace: legacy } }));
    expect(createPreferenceStore(() => storage).getSnapshot().settings.pace).toBe(seconds);
  }
  const storage = memory(); storage.setItem(SETTINGS_KEY, JSON.stringify({ version:1, settings:{ pace: 30 } }));
  expect(createPreferenceStore(() => storage).getSnapshot().settings.pace).toBe(6);
});
