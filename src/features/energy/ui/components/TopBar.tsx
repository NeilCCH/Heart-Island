import { createContext, useContext } from 'react';
import { copy } from '../copy';

// 在萌寵心靈島中提供「回小島」動作；單獨使用時為 null，不顯示返回按鈕。
export const BackContext = createContext<(() => void) | null>(null);

export function TopBar({ label, onOpenSettings }: { label?: string; onOpenSettings: () => void }) {
  const onBack = useContext(BackContext);
  return (
    <header className="topbar">
      {onBack
        ? <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>{copy.backToIsland}</button>
        : <span className="topbar__brand">{label ?? copy.title}</span>}
      <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSettings} aria-haspopup="dialog">
        {copy.settings}
      </button>
    </header>
  );
}
