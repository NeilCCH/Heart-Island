import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

// 有效低動態＝設定開啟 OR 系統偏好開啟；由UI觀察系統偏好，核心不碰DOM。
export function useEffectiveReducedMotion(setting: boolean) {
  const [system, setSystem] = useState(systemPrefersReduced);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setSystem(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return { effective: setting || system, system };
}
