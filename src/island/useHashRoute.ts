import { useCallback, useEffect, useState } from 'react';

// 以網址 hash 切換功能：不需路由套件，加入主畫面後上一頁也能返回小島。
export const ROUTES = ['breath', 'tiny', 'garden', 'energy', 'companion'] as const;
export type Route = 'home' | (typeof ROUTES)[number];

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(hash) ? (hash as Route) : 'home';
}

export function useHashRoute(available: readonly Route[] = ['home', ...ROUTES]) {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const go = useCallback((next: Route) => {
    window.location.hash = next === 'home' ? '' : next;
    setRoute(next);
  }, []);
  return [available.includes(route) ? route : 'home', go] as const;
}
