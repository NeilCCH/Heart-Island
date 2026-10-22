import { useEffect, useState } from 'react';

// 引導與休息進行中保持螢幕亮（DECISIONS U1）。暫停、完成、離開、背景時釋放。
// 請求的 promise 晚到時以 cancelled 檢查身份，避免離開後才取得鎖。
export function useWakeLock(active: boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator && !!navigator.wakeLock;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active || !supported) return;
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then(
      lock => {
        if (cancelled) lock.release().catch(() => {});
        else { sentinel = lock; setFailed(false); }
      },
      () => { if (!cancelled) setFailed(true); },
    );
    return () => {
      cancelled = true;
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active, supported]);
  return { available: supported && !failed };
}
