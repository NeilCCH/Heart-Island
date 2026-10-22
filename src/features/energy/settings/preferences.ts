import type { EnergySettings } from '../core/types';
export const SETTINGS_KEY = 'energy.settings.v1';
export const DEFAULT_SETTINGS: EnergySettings = { pace: 'gentle', target: 10, restSeconds: 90, soundEnabled: false, volume: 0.5, reducedMotion: false, theme: 'system' };
export function validateSettings(raw: unknown): EnergySettings {
  const s = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const result = { ...DEFAULT_SETTINGS };
  if (s.pace === 'slow' || s.pace === 'gentle' || s.pace === 'brisk') result.pace = s.pace;
  if (s.target === null || s.target === 6 || s.target === 8 || s.target === 10 || s.target === 12) result.target = s.target;
  if (s.restSeconds === 30 || s.restSeconds === 60 || s.restSeconds === 90 || s.restSeconds === 120 || s.restSeconds === 180) result.restSeconds = s.restSeconds;
  if (typeof s.volume === 'number' && Number.isFinite(s.volume) && s.volume >= 0 && s.volume <= 1) result.volume = s.volume;
  if (typeof s.soundEnabled === 'boolean') result.soundEnabled = s.soundEnabled;
  if (typeof s.reducedMotion === 'boolean') result.reducedMotion = s.reducedMotion;
  if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system') result.theme = s.theme;
  return result;
}
export interface PreferenceSnapshot { settings: EnergySettings; remember: boolean; storageError: string | null }
export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function createPreferenceStore(getStorage: () => StorageAdapter = () => window.localStorage) {
  let value: PreferenceSnapshot = { settings: { ...DEFAULT_SETTINGS }, remember: false, storageError: null };
  try {
    const raw = getStorage().getItem(SETTINGS_KEY);
    if (raw) {
      const record = JSON.parse(raw);
      if (record?.version === 1 && record.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)) value = { settings: validateSettings(record.settings), remember: true, storageError: null };
    }
  } catch { value.storageError = '無法讀取已保存的偏好，本次仍可正常使用。'; }
  const listeners = new Set<() => void>();
  function commit(next: PreferenceSnapshot, operation: 'write' | 'remove' | 'none') {
    value = { ...next, storageError: null };
    try {
      if (operation === 'write') getStorage().setItem(SETTINGS_KEY, JSON.stringify({ version: 1, settings: value.settings }));
      if (operation === 'remove') getStorage().removeItem(SETTINGS_KEY);
    } catch { value = { ...value, storageError: operation === 'remove' ? '無法清除已保存的偏好；重新開啟時可能仍會讀到舊設定。' : '無法保存偏好，本次設定仍可使用。' }; }
    listeners.forEach(listener => listener());
  }
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update(partial: Partial<EnergySettings>) { const settings = validateSettings({ ...value.settings, ...partial }); commit({ ...value, settings }, value.remember ? 'write' : 'none'); },
    setRemember(on: boolean) { commit({ ...value, remember: on }, on ? 'write' : 'remove'); },
    clearSaved() { commit({ ...value, remember: false }, 'remove'); },
    resetToDefaults() { commit({ ...value, settings: { ...DEFAULT_SETTINGS } }, value.remember ? 'write' : 'none'); },
  };
}
