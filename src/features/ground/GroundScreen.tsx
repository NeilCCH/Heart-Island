import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../energy/ui/components/TopBar';
import { groundCopy as copy } from './copy';
import './ground.css';

const STEPS = copy.steps;

// 五感著地（5-4-3-2-1）：每一步只要在心裡找到，點一下圓點就好；不輸入、不計時、不評分。
export function GroundScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [step, setStep] = useState(-1); // -1 開始前；STEPS.length 完成
  const [found, setFound] = useState(0);
  const focusRef = useRef<HTMLElement | null>(null);

  // 換步驟時把焦點移到新的提示，螢幕閱讀器會念出來。
  useEffect(() => { if (step >= 0) focusRef.current?.focus(); }, [step]);

  const go = (next: number) => { setStep(next); setFound(0); };
  const current = step >= 0 && step < STEPS.length ? STEPS[step] : null;
  const complete = current !== null && found >= current.count;

  return (
    <div className="screen feature ground">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.title}</h1>

      {step < 0 && (
        <>
          <p className="feature__intro">{copy.intro}</p>
          <ol className="ground-preview" aria-hidden="true">
            {STEPS.map(s => <li key={s.sense}><span className="ground-preview__n">{s.count}</span>{s.sense}</li>)}
          </ol>
          <div className="controls"><button type="button" className="btn btn--primary" onClick={() => go(0)}>{copy.start}</button></div>
        </>
      )}

      {current && (
        <section className="ground-card" data-step={step}>
          <p className="ground-card__step muted small">{copy.stepOf(step + 1, STEPS.length)}</p>
          <ol className="ground-progress" aria-hidden="true">
            {STEPS.map((s, i) => <li key={s.sense} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>{s.sense}</li>)}
          </ol>
          <h2 ref={el => { focusRef.current = el; }} tabIndex={-1} className="ground-card__prompt">{current.prompt}</h2>
          <p className="muted">{current.examples}</p>
          <div className="ground-dots" aria-hidden="true">
            {Array.from({ length: current.count }, (_, i) => <span key={i} className={i < found ? 'ground-dot is-on' : 'ground-dot'} />)}
          </div>
          <p className="sr-only" role="status">{copy.foundCount(found, current.count)}</p>
          <div className="controls">
            {complete
              ? <button type="button" className="btn btn--primary" onClick={() => go(step + 1)}>{step === STEPS.length - 1 ? copy.finish : copy.next}</button>
              : <button type="button" className="btn btn--primary" onClick={() => setFound(n => Math.min(current.count, n + 1))}>{copy.found}</button>}
            {!complete && <button type="button" className="btn btn--ghost" onClick={() => go(step + 1)}>{copy.skip}</button>}
          </div>
        </section>
      )}

      {step >= STEPS.length && (
        <section className="ground-card ground-card--done">
          <h2 ref={el => { focusRef.current = el; }} tabIndex={-1} className="ground-card__prompt">{copy.doneTitle}</h2>
          <p>{copy.doneText}</p>
          <div className="controls">
            <a className="btn btn--primary" href="#breath">{copy.toBreath}</a>
            <button type="button" className="btn" onClick={() => go(0)}>{copy.again}</button>
          </div>
        </section>
      )}
      <p className="muted small">{copy.note}</p>
    </div>
  );
}
