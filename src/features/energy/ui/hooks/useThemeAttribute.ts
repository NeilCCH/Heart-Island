import { useEffect } from 'react';
import type { EnergySettings } from '../../core/types';

// system 時移除屬性，交給 prefers-color-scheme；light/dark 時以 data-theme 覆蓋。
export function useThemeAttribute(theme: EnergySettings['theme'], reducedMotion: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    return () => root.removeAttribute('data-theme');
  }, [theme, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (reducedMotion) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    return () => root.removeAttribute('data-motion');
  }, [reducedMotion, enabled]);
}
