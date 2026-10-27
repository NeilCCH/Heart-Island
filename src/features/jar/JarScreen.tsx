import { useId, useRef, useState, type FormEvent } from 'react';
import { TopBar } from '../energy/ui/components/TopBar';
import { localDate } from '../tiny/storage';
import { jarCopy as copy } from './copy';
import { NOTE_MAX, clearNotes, loadNotes, saveNotes, type Note } from './storage';
import '../tiny/tiny.css';
import './jar.css';

const SLIP_COLORS = ['#f3d9b1', '#cfe0f1', '#d8e8d2', '#ead6e6', '#f6e7b8', '#d9d6f0'];
const VISIBLE = 28;

// 罐子裡的紙條位置由編號決定：同一張紙條每次都在同一個地方。
function slip(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453; const r = s - Math.floor(s);
  const s2 = Math.sin(i * 78.233) * 12345.678; const r2 = s2 - Math.floor(s2);
  const row = Math.floor(i / 4); const col = i % 4;
  return { x: 62 + col * 26 + (r - 0.5) * 12, y: 222 - row * 15 - r2 * 5, rot: (r - 0.5) * 70, color: SLIP_COLORS[i % SLIP_COLORS.length] };
}

function Jar({ count, dropKey }: { count: number; dropKey: number }) {
  const shown = Math.min(count, VISIBLE);
  return (
    <svg className="jar-art" viewBox="0 0 220 260" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="jar-inside"><path d="M48 70 Q40 80 40 100 L40 220 Q40 244 66 244 L154 244 Q180 244 180 220 L180 100 Q180 80 172 70 Z" /></clipPath>
        <linearGradient id="jar-glass" x1="0" x2="1"><stop offset="0" className="jar-glass-1" /><stop offset="0.5" className="jar-glass-2" /><stop offset="1" className="jar-glass-1" /></linearGradient>
      </defs>
      <ellipse cx="110" cy="250" rx="80" ry="8" className="jar-shadow" />
      <path d="M48 70 Q40 80 40 100 L40 220 Q40 244 66 244 L154 244 Q180 244 180 220 L180 100 Q180 80 172 70 Z" fill="url(#jar-glass)" className="jar-body" />
      <g clipPath="url(#jar-inside)">
        {Array.from({ length: shown }, (_, i) => {
          const p = slip(i); const fresh = i === shown - 1 && dropKey > 0;
          return (
            <g key={fresh ? `drop-${dropKey}` : i} className={fresh ? 'jar-slip jar-slip--drop' : 'jar-slip'} style={{ ['--from' as string]: `${30 - p.y}px` }}>
              <rect x={p.x} y={p.y} width="30" height="14" rx="3" fill={p.color} transform={`rotate(${p.rot} ${p.x + 15} ${p.y + 7})`} />
            </g>
          );
        })}
      </g>
      <path d="M58 92 Q54 150 58 210" className="jar-shine" />
      <rect x="52" y="44" width="116" height="28" rx="8" className="jar-lid" />
      <rect x="60" y="38" width="100" height="10" rx="5" className="jar-lid jar-lid--top" />
    </svg>
  );
}

// 感謝小罐子：沒有每日任務、沒有連續天數；紙條只是放著，想看時抽一張。
export function JarScreen({ onOpenSettings, random = Math.random }: { onOpenSettings: () => void; random?: () => number }) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [draft, setDraft] = useState('');
  const [drawn, setDrawn] = useState<Note | null>(null);
  const [status, setStatus] = useState('');
  const [dropKey, setDropKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const inputId = useId();
  const drawnRef = useRef<HTMLDivElement>(null);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, NOTE_MAX);
    if (!text) return;
    setNotes(previous => saveNotes([...previous, { id: `n${Date.now()}${Math.floor(random() * 1000)}`, text, date: localDate() }]));
    setDraft(''); setStatus(copy.added); setDropKey(k => k + 1); setDrawn(null);
  };
  const draw = () => {
    if (notes.length === 0) { setStatus(copy.empty); return; }
    const others = notes.length > 1 && drawn ? notes.filter(n => n.id !== drawn.id) : notes;
    setDrawn(others[Math.min(others.length - 1, Math.floor(random() * others.length))]);
    setStatus('');
    window.setTimeout(() => drawnRef.current?.focus(), 0);
  };
  const remove = (id: string) => {
    setNotes(previous => saveNotes(previous.filter(n => n.id !== id)));
    if (drawn?.id === id) setDrawn(null);
  };
  const clearAll = () => { clearNotes(); setNotes([]); setDrawn(null); setConfirming(false); setStatus(''); };

  return (
    <div className="screen feature jar">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>
      <p className="feature__intro">{copy.intro}</p>

      <section className="jar-stage">
        <Jar count={notes.length} dropKey={dropKey} />
        <p className="jar-count">{copy.jarLabel(notes.length)}</p>
      </section>

      {drawn && (
        <div ref={drawnRef} tabIndex={-1} className="jar-note" aria-live="polite">
          <p className="jar-note__text">{drawn.text}</p>
          <p className="muted small">{copy.drawnFrom(drawn.date)}</p>
        </div>
      )}

      <div className="controls">
        <button type="button" className="btn btn--primary" onClick={draw} disabled={notes.length === 0}>{drawn ? copy.drawAgain : copy.draw}</button>
      </div>

      <form className="card stack jar-add" onSubmit={add}>
        <label htmlFor={inputId} className="options__legend">{copy.addLabel}</label>
        <div className="tiny-add__row">
          <input id={inputId} value={draft} maxLength={NOTE_MAX} placeholder={copy.placeholder} onChange={event => setDraft(event.target.value)} />
          <button type="submit" className="btn btn--small" disabled={!draft.trim()}>{copy.add}</button>
        </div>
        <details className="jar-ideas">
          <summary>{copy.ideasTitle}</summary>
          <ul>{copy.ideas.map(idea => <li key={idea}>{idea}</li>)}</ul>
        </details>
      </form>
      <p className="muted small" role="status">{status || (notes.length === 0 ? copy.empty : ' ')}</p>

      {notes.length > 0 && (
        <details className="tiny-today jar-list">
          <summary>{copy.listTitle}</summary>
          <ul>
            {[...notes].reverse().map(note => (
              <li key={note.id} className="tiny-item">
                <span className="jar-list__text">{note.text}<span className="muted small"> · {note.date}</span></span>
                <button type="button" className="btn btn--ghost btn--small" aria-label={copy.remove(note.text)} onClick={() => remove(note.id)}>✕</button>
              </li>
            ))}
          </ul>
          {confirming ? (
            <div className="notice" role="alertdialog" aria-label={copy.clear}>
              <p>{copy.clearConfirm}</p>
              <div className="controls">
                <button type="button" className="btn" onClick={clearAll}>{copy.clearYes}</button>
                <button type="button" className="btn btn--primary" onClick={() => setConfirming(false)}>{copy.clearNo}</button>
              </div>
            </div>
          ) : <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirming(true)}>{copy.clear}</button>}
        </details>
      )}
      <p className="muted small">{copy.privacy}</p>
    </div>
  );
}
