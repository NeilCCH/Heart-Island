// 只在正式建置註冊，開發與測試環境不受快取影響。
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* 不支援或被阻擋時照常使用 */ });
  });
}
