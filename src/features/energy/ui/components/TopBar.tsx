import { copy } from '../copy';

export function TopBar({ label, onOpenSettings }: { label?: string; onOpenSettings: () => void }) {
  return (
    <header className="topbar">
      <span className="topbar__brand">{label ?? copy.title}</span>
      <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSettings} aria-haspopup="dialog">
        {copy.settings}
      </button>
    </header>
  );
}
