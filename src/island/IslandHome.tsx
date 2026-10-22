import { CatFigure } from '../features/energy/ui/components/CatFigure';
import { TopBar } from '../features/energy/ui/components/TopBar';
import { islandCopy } from './copy';
import type { Route } from './useHashRoute';

type Place = keyof typeof islandCopy.places;
const ORDER: readonly Place[] = ['breath', 'tiny', 'garden', 'energy', 'companion'];

// 每個地點一個簡單圖形，只作裝飾（aria-hidden），文字才是主要資訊。
function Glyph({ place }: { place: Place }) {
  const common = { width: 40, height: 40, viewBox: '0 0 40 40', 'aria-hidden': true, className: 'place__glyph' } as const;
  switch (place) {
    case 'breath': return <svg {...common}><circle cx="20" cy="20" r="13" fill="var(--glyph-soft)" /><circle cx="20" cy="20" r="7" fill="var(--glyph)" /></svg>;
    case 'tiny': return <svg {...common}><rect x="9" y="7" width="22" height="26" rx="5" fill="var(--glyph-soft)" /><path d="M14 20l4 4 8-9" stroke="var(--glyph)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'garden': return <svg {...common}><path d="M6 26c6-4 22-4 28 0" stroke="var(--glyph-soft)" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M6 32c6-4 22-4 28 0" stroke="var(--glyph-soft)" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="26" cy="15" r="6" fill="var(--glyph)" /></svg>;
    case 'energy': return <svg {...common}><rect x="6" y="18" width="28" height="5" rx="2.5" fill="var(--glyph-soft)" /><circle cx="17" cy="20.5" r="6" fill="var(--glyph)" /></svg>;
    case 'companion': return <svg {...common}><path d="M10 30c0-9 4-15 10-15s10 6 10 15z" fill="var(--glyph-soft)" /><path d="M12 17l2-8 5 6M28 17l-2-8-5 6" fill="var(--glyph)" /></svg>;
  }
}

export function IslandHome({ available, onOpenSettings }: { available: readonly Route[]; onOpenSettings: () => void }) {
  return (
    <div className="screen screen--island">
      <TopBar label="" onOpenSettings={onOpenSettings} />
      <div className="island-hero">
        <CatFigure size="compact" />
        <div className="stack">
          <h1 tabIndex={-1} data-screen-heading className="title">{islandCopy.title}</h1>
          <p className="lead">{islandCopy.intro}</p>
        </div>
      </div>
      <ul className="places" aria-label="島上的地方">
        {ORDER.map(place => {
          const open = (available as readonly string[]).includes(place);
          const { name, desc } = islandCopy.places[place];
          const body = (
            <>
              <Glyph place={place} />
              <span className="place__text">
                <span className="place__name">{name}{!open && <span className="tag place__soon">{islandCopy.soon}</span>}</span>
                <span className="place__desc">{desc}</span>
              </span>
            </>
          );
          return (
            <li key={place}>
              {open
                ? <a className="place" href={`#${place}`}>{body}</a>
                : <div className="place place--soon" aria-disabled="true">{body}</div>}
            </li>
          );
        })}
      </ul>
      <p className="muted small">{islandCopy.privacy}</p>
    </div>
  );
}
