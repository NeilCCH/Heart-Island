import { useId, useMemo, useState, type FormEvent } from 'react';
import { TopBar } from '../energy/ui/components/TopBar';
import { ACTIVITIES, CATEGORY_NAME, type Activity } from './activities';
import { tinyCopy as copy } from './copy';
import { loadMine, loadToday, saveMine, saveToday } from './storage';
import './tiny.css';

const RECENT = 6;

// 從清單隨機挑一件，避開最近出現過的幾件；清單太短時才允許重複。
function pick(pool: readonly Activity[], recent: readonly string[], random: () => number): Activity {
  const fresh = pool.filter(item => !recent.includes(item.id));
  const source = fresh.length > 0 ? fresh : pool;
  return source[Math.min(source.length - 1, Math.floor(random() * source.length))];
}

export function TinyScreen({ onOpenSettings, random = Math.random }: { onOpenSettings: () => void; random?: () => number }) {
  const [mine, setMine] = useState<Activity[]>(loadMine);
  const pool = useMemo(() => [...ACTIVITIES, ...mine], [mine]);
  const [recent, setRecent] = useState<string[]>([]);
  const [current, setCurrent] = useState<Activity>(() => pick(ACTIVITIES, [], random));
  const [acknowledged, setAcknowledged] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [today, setToday] = useState<string[]>(() => loadToday());
  const [draft, setDraft] = useState('');
  const inputId = useId();

  function show(next: Activity) {
    setCurrent(next);
    setRecent(previous => [next.id, ...previous].slice(0, RECENT));
    setAcknowledged(false);
  }
  const another = () => show(pick(pool, [current.id, ...recent], random));

  function done() {
    const next = loadToday().concat(current.text);
    saveToday(next);
    setToday(next);
    setAcknowledged(true);
  }

  function addMine(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim().slice(0, 40);
    if (!text) return;
    const item: Activity = { id: `m${Date.now()}`, text, category: 'mine' };
    const next = [...mine, item];
    setMine(next); saveMine(next); setDraft('');
  }
  function removeMine(id: string) {
    const next = mine.filter(item => item.id !== id);
    setMine(next); saveMine(next);
  }

  const groups = useMemo(() => {
    const map = new Map<Activity['category'], Activity[]>();
    for (const item of pool) map.set(item.category, [...(map.get(item.category) ?? []), item]);
    return [...map.entries()];
  }, [pool]);

  return (
    <div className="screen feature tiny">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>
      <p className="feature__intro">{copy.intro}</p>

      <section className="tiny-card" aria-live="polite" aria-atomic="true">
        {acknowledged ? (
          <>
            <p className="tiny-card__text">{copy.ack}</p>
            <p className="muted">{copy.ackNote}</p>
          </>
        ) : (
          <>
            <span className="tag">{CATEGORY_NAME[current.category]}</span>
            <p className="tiny-card__text">{current.text}</p>
          </>
        )}
      </section>

      <div className="controls">
        {acknowledged ? (
          <>
            <button type="button" className="btn btn--primary" onClick={another}>{copy.oneMore}</button>
            <a className="btn btn--link" href="#">{copy.enough}</a>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary" onClick={done}>{copy.done}</button>
            <button type="button" className="btn" onClick={another}>{copy.another}</button>
            <button type="button" className="btn btn--ghost" aria-expanded={choosing} onClick={() => setChoosing(open => !open)}>
              {choosing ? copy.closeChoose : copy.choose}
            </button>
          </>
        )}
      </div>

      {choosing && !acknowledged && (
        <section className="tiny-list" aria-label={copy.pickTitle}>
          {groups.map(([category, items]) => (
            <div key={category} className="tiny-group">
              <h2 className="tiny-group__title">{CATEGORY_NAME[category]}</h2>
              <ul>
                {items.map(item => (
                  <li key={item.id} className="tiny-item">
                    <button type="button" className="tiny-item__pick" onClick={() => { show(item); setChoosing(false); }}>{item.text}</button>
                    {item.category === 'mine' && (
                      <button type="button" className="btn btn--ghost btn--small" aria-label={copy.remove(item.text)} onClick={() => removeMine(item.id)}>✕</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <form className="tiny-add" onSubmit={addMine}>
            <label htmlFor={inputId}>{copy.addLabel}</label>
            <div className="tiny-add__row">
              <input id={inputId} value={draft} maxLength={40} placeholder={copy.addPlaceholder} onChange={event => setDraft(event.target.value)} />
              <button type="submit" className="btn btn--small">{copy.add}</button>
            </div>
          </form>
        </section>
      )}

      {today.length > 0 && (
        <details className="tiny-today">
          <summary>{copy.todayTitle}</summary>
          <ul>{today.map((text, index) => <li key={`${text}-${index}`}>{text}</li>)}</ul>
          <p className="muted small">{copy.todayNote}</p>
        </details>
      )}
    </div>
  );
}
