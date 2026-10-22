import { useRef, useSyncExternalStore } from 'react';
import { createPreferenceStore } from './preferences';
export { DEFAULT_SETTINGS } from './preferences';
export function useEnergySettings() {
  const storeRef = useRef<ReturnType<typeof createPreferenceStore> | null>(null);
  if (!storeRef.current) storeRef.current = createPreferenceStore();
  const store = storeRef.current;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...snapshot, update: store.update, setRemember: store.setRemember, clearSaved: store.clearSaved, resetToDefaults: store.resetToDefaults };
}
