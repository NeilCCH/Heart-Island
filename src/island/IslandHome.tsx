import type { Pet } from '../features/energy/core/types';
import { PetFigure } from '../features/energy/ui/components/PetFigure';
import { TopBar } from '../features/energy/ui/components/TopBar';
import { islandCopy } from './copy';
import type { Route } from './useHashRoute';

type Place = keyof typeof islandCopy.places;
const ORDER: readonly Place[] = ['breath', 'tiny', 'garden', 'energy', 'companion'];

// 首頁插畫：天空、遠方的雲、慢慢起伏的海與一座小島（淺色是白天，深色是夜晚）。只作裝飾。
function IslandScene() {
  return (
    <svg className="island-scene" viewBox="0 0 400 250" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="isl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="isl-sky-top" /><stop offset="1" className="isl-sky-bottom" /></linearGradient>
        <linearGradient id="isl-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="isl-sea-top" /><stop offset="1" className="isl-sea-bottom" /></linearGradient>
        <radialGradient id="isl-sun"><stop offset="0" className="isl-sun" /><stop offset="1" className="isl-sun" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="250" fill="url(#isl-sky)" />
      <g className="isl-stars">
        {[[40, 30], [92, 58], [150, 22], [255, 40], [330, 24], [372, 70], [210, 66]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.2" />)}
      </g>
      <circle cx="318" cy="64" r="56" fill="url(#isl-sun)" opacity="0.7" />
      <circle cx="318" cy="64" r="17" className="isl-sun-disc" />
      <g className="isl-clouds">
        <path d="M40 92 q14 -14 30 -4 q10 -12 26 -2 q16 0 14 10 z" />
        <path d="M200 70 q10 -10 22 -3 q8 -9 20 -1 q12 0 10 8 z" opacity="0.8" />
      </g>
      <rect y="150" width="400" height="100" fill="url(#isl-sea)" />
      <g className="isl-waves">
        <path d="M0 172 q25 -5 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
        <path d="M0 196 q25 -5 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" opacity="0.7" />
        <path d="M0 222 q25 -5 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" opacity="0.5" />
      </g>
      {/* 小島：沙灘、草地與一棵圓圓的樹 */}
      <ellipse cx="200" cy="196" rx="120" ry="20" className="isl-shadow" />
      <path d="M86 192 Q120 150 200 148 Q282 150 314 192 Z" className="isl-sand" />
      <path d="M112 180 Q140 152 200 151 Q262 152 290 180 Q200 170 112 180 Z" className="isl-grass" />
      <path d="M278 160 q2 -22 -4 -40" className="isl-trunk" />
      <circle cx="272" cy="112" r="18" className="isl-leaf" /><circle cx="288" cy="120" r="14" className="isl-leaf isl-leaf--2" /><circle cx="260" cy="124" r="12" className="isl-leaf isl-leaf--2" />
    </svg>
  );
}

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

export function IslandHome({ available, pet, onOpenSettings }: { available: readonly Route[]; pet: Pet; onOpenSettings: () => void }) {
  return (
    <div className="screen screen--island">
      <TopBar label="" onOpenSettings={onOpenSettings} />
      <section className="island-hero">
        <div className="island-hero__scene">
          <IslandScene />
          <div className="island-hero__pet"><PetFigure pet={pet} size="compact" /></div>
        </div>
        <div className="island-hero__text">
          <h1 tabIndex={-1} data-screen-heading className="title">{islandCopy.title}</h1>
          <p className="lead">{islandCopy.intro}</p>
        </div>
      </section>
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
            <li key={place} data-place={place}>
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
