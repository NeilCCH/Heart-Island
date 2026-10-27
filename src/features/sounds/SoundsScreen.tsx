import { useId, useState } from 'react';
import { OptionGroup } from '../energy/ui/components/OptionGroup';
import { TopBar } from '../energy/ui/components/TopBar';
import { TouchRange } from '../energy/ui/components/TouchRange';
import { soundsCopy as copy } from './copy';
import { SCAPES, useSleepTimer, useSoundscape, type Scape } from './useSoundscape';
import './sounds.css';

export const TIMER_CHOICES = [0, 15, 30, 60] as const;
const timerOptions = TIMER_CHOICES.map(m => ({ value: m as number, label: m ? copy.timerMinutes(m) : copy.timerOff }));

// 每種聲音一個簡單的圖形，只作裝飾。
export function ScapeGlyph({ scape }: { scape: Scape }) {
  const common = { width: 36, height: 36, viewBox: '0 0 36 36', 'aria-hidden': true, className: 'scape__glyph' } as const;
  switch (scape) {
    case 'rain': return <svg {...common}><path d="M8 17a7 7 0 0 1 13-4 5 5 0 0 1 7 5H8z" fill="currentColor" opacity="0.35" /><path d="M12 22l-2 5M19 22l-2 5M26 22l-2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case 'waves': return <svg {...common}><path d="M4 15q4-4 7 0t7 0 7 0 7 0M4 22q4-4 7 0t7 0 7 0 7 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
    case 'fire': return <svg {...common}><path d="M18 6c2 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-5 3-9 2 2 3 3 4 5 1-3 0-6 0-9z" fill="currentColor" opacity="0.5" /><path d="M9 30h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
    case 'forest': return <svg {...common}><path d="M12 6l-7 14h14zM24 10l-6 12h12z" fill="currentColor" opacity="0.45" /><path d="M12 20v8M24 22v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
    case 'stream': return <svg {...common}><path d="M10 5c6 6-6 10 0 16s-4 8 0 10M20 5c6 6-6 10 0 16s-4 8 0 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  }
}

// 療癒聲音：選一種聲音播放，可以定時慢慢關閉。沒有播放清單、沒有排行，也不記錄聽了多久。
export function SoundsScreen({ initialVolume, onOpenSettings }: { initialVolume: number; onOpenSettings: () => void }) {
  const scape = useSoundscape();
  const [volume, setVolume] = useState(() => Math.max(0.1, initialVolume));
  const [minutes, setMinutes] = useState<number>(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const volumeId = useId();
  const left = useSleepTimer(minutes || null, scape.playing !== null, () => { scape.stop(20); setEnded(true); });

  const choose = (next: Scape) => {
    setEnded(false);
    if (scape.playing === next) { scape.stop(); return; }
    setFailed(!scape.play(next, volume));
  };
  const changeVolume = (v: number) => { setVolume(v); scape.setVolume(v); };

  return (
    <div className="screen feature sounds">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>
      <p className="feature__intro">{copy.intro}</p>

      <ul className="scapes" aria-label={copy.title}>
        {SCAPES.map(item => (
          <li key={item}>
            <button type="button" className="scape" data-scape={item} aria-pressed={scape.playing === item} onClick={() => choose(item)}>
              <ScapeGlyph scape={item} />
              <span className="scape__name">{copy.scapes[item].name}</span>
              <span className="scape__desc">{copy.scapes[item].desc}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="sounds-status" role="status">
        {scape.playing ? copy.playing(copy.scapes[scape.playing].name) : ended ? copy.ended : failed ? copy.unsupported : ' '}
      </p>
      {scape.playing && <div className="controls"><button type="button" className="btn btn--primary" onClick={() => scape.stop()}>{copy.stop}</button></div>}

      <section className="card stack">
        <div className="pace">
          <div className="pace__head">
            <label htmlFor={volumeId} className="options__legend">{copy.volume}</label>
            <output htmlFor={volumeId} className="pace__value">{copy.volumeValue(volume)}</output>
          </div>
          <TouchRange id={volumeId} className="pace__range" min={0.1} max={1} step={0.1} value={volume} aria-valuetext={copy.volumeValue(volume)} onValue={changeVolume} />
        </div>
        <OptionGroup<number> legend={copy.timerLabel} options={timerOptions} value={minutes} onChange={setMinutes} compact />
        {left !== null && <p className="muted small">{copy.timerLeft(left)}</p>}
      </section>
      <p className="muted small">{copy.note}</p>
    </div>
  );
}
