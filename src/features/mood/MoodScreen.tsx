import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../energy/ui/components/TopBar';
import { localDate } from '../tiny/storage';
import { moodCopy as copy } from './copy';
import { WEATHERS, clearDays, lastDays, loadDays, saveDays, type MoodDays, type Weather } from './storage';
import './mood.css';

// 天氣圖形：柔和的線條與色塊，只作裝飾，名稱才是主要資訊。
export function WeatherGlyph({ weather, size = 44 }: { weather: Weather; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 44 44', 'aria-hidden': true, className: 'weather-glyph' } as const;
  const sun = (cx: number, cy: number, r: number) => (
    <g className="wg-sun">
      <circle cx={cx} cy={cy} r={r} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <path key={i} d={`M${cx + Math.cos(a) * (r + 3)} ${cy + Math.sin(a) * (r + 3)}L${cx + Math.cos(a) * (r + 6)} ${cy + Math.sin(a) * (r + 6)}`} />;
      })}
    </g>
  );
  const cloud = (dy = 0, dark = false) => <path className={dark ? 'wg-cloud wg-cloud--dark' : 'wg-cloud'} transform={`translate(0 ${dy})`} d="M11 30a6 6 0 0 1 2-11.6A8 8 0 0 1 28 16a6.5 6.5 0 0 1 5 14z" />;
  switch (weather) {
    case 'sunny': return <svg {...common}>{sun(22, 22, 8)}</svg>;
    case 'partly': return <svg {...common}>{sun(16, 15, 6)}{cloud(4)}</svg>;
    case 'cloudy': return <svg {...common}>{cloud(-2, true)}</svg>;
    case 'fog': return <svg {...common}>{cloud(-6)}<path className="wg-line" d="M8 30h28M12 36h20" /></svg>;
    case 'rain': return <svg {...common}>{cloud(-5, true)}<path className="wg-drop" d="M15 31l-2 5M23 31l-2 5M31 31l-2 5" /></svg>;
    case 'storm': return <svg {...common}>{cloud(-5, true)}<path className="wg-bolt" d="M23 27l-4 7h5l-3 7 8-10h-5l3-4z" /></svg>;
  }
}

// 心情小天氣：一天選一個天氣，選了就有一句溫和的話。紀錄只是記得，不是成績。
export function MoodScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [days, setDays] = useState<MoodDays>(loadDays);
  const [today, setToday] = useState(() => localDate());
  const [changing, setChanging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const replyRef = useRef<HTMLParagraphElement>(null);

  // 跨過午夜或隔天回到畫面時換成新的一天。
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setToday(localDate()); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const current = changing ? undefined : days[today];
  const pick = (weather: Weather) => {
    setDays(previous => saveDays({ ...previous, [today]: weather }));
    setChanging(false); setCleared(false);
    window.setTimeout(() => replyRef.current?.focus(), 0);
  };
  const clearAll = () => { clearDays(); setDays({}); setConfirming(false); setCleared(true); setChanging(false); };

  const recent = lastDays(14, new Date(`${today}T12:00:00`));
  const reply = current ? copy.reply[current] : null;

  return (
    <div className="screen feature mood">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>
      <p className="feature__intro">{copy.intro}</p>

      {current && reply ? (
        <section className="mood-reply" data-weather={current} aria-live="polite">
          <WeatherGlyph weather={current} size={72} />
          <p className="mood-reply__name">{copy.today}・{copy.weathers[current]}</p>
          <p ref={replyRef} tabIndex={-1} className="mood-reply__text">{reply.text}</p>
          <div className="controls">
            <a className="btn" href={`#${reply.place}`}>{reply.placeLabel}</a>
            <button type="button" className="btn btn--ghost" onClick={() => setChanging(true)}>{copy.change}</button>
          </div>
        </section>
      ) : (
        <fieldset className="weathers">
          <legend className="options__legend">{copy.pickLabel}</legend>
          <div className="weathers__grid">
            {WEATHERS.map(weather => (
              <button key={weather} type="button" className="weather" data-weather={weather}
                aria-pressed={days[today] === weather} onClick={() => pick(weather)}>
                <WeatherGlyph weather={weather} />
                <span>{copy.weathers[weather]}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <section className="card stack mood-recent">
        <h2 className="card__title">{copy.recentTitle}</h2>
        <ol className="mood-days">
          {recent.map(date => {
            const weather = days[date];
            const label = copy.dayLabel(date === today ? copy.today : date.slice(5).replace('-', '/'), weather ? copy.weathers[weather] : copy.noEntry);
            return (
              <li key={date} className={`mood-day${date === today ? ' mood-day--today' : ''}`} data-weather={weather} title={label}>
                <span className="sr-only">{label}</span>
                {weather ? <WeatherGlyph weather={weather} size={26} /> : <span className="mood-day__empty" aria-hidden="true" />}
                <span className="mood-day__date" aria-hidden="true">{Number(date.slice(8))}</span>
              </li>
            );
          })}
        </ol>
        <p className="muted small">{copy.recentNote}</p>
      </section>

      <div className="mood-clear">
        {confirming ? (
          <div className="notice" role="alertdialog" aria-label={copy.clear}>
            <p>{copy.clearConfirm}</p>
            <div className="controls">
              <button type="button" className="btn" onClick={clearAll}>{copy.clearYes}</button>
              <button type="button" className="btn btn--primary" onClick={() => setConfirming(false)}>{copy.clearNo}</button>
            </div>
          </div>
        ) : (
          Object.keys(days).length > 0 && <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirming(true)}>{copy.clear}</button>
        )}
        {cleared && <p className="muted small" role="status">{copy.cleared}</p>}
      </div>
      <p className="muted small">{copy.privacy}</p>
    </div>
  );
}
