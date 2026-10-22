import type { EnergySettings, PauseReason, RestView } from '../../core/types';
import { copy, formatClock, formatClockSpoken } from '../copy';
import { RestPicker } from '../components/Pickers';
import { ProgressBar } from '../components/ProgressBar';
import { TopBar } from '../components/TopBar';

export function RestScreen({ rest, paused, pauseReason, settings, update, wakeLockAvailable, onPause, onResume, onExtend, onSkip, onRestAgain, onNextSet, onExit, onOpenSettings }: {
  rest: RestView; paused: boolean; pauseReason: PauseReason | null; settings: EnergySettings;
  update: (partial: Partial<EnergySettings>) => void; wakeLockAvailable: boolean;
  onPause: () => void; onResume: () => void; onExtend: () => void; onSkip: () => void;
  onRestAgain: () => void; onNextSet: () => void; onExit: () => void; onOpenSettings: () => void;
}) {
  if (rest.finished) {
    return (
      <div className="screen screen--ready">
        <TopBar onOpenSettings={onOpenSettings} />
        <div className="layout layout--single">
          <div className="layout__main stack">
            <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.readyTitle}</h1>
            <p className="lead">{copy.readyBody}</p>
            <RestPicker value={settings.restSeconds} update={update} compact />
            <div className="controls controls--sticky">
              <button type="button" className="btn btn--primary" onClick={onNextSet}>{copy.nextSet}</button>
              <button type="button" className="btn" onClick={onRestAgain}>{copy.restAgain}</button>
              <button type="button" className="btn btn--ghost" onClick={onExit}>{copy.exit}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const elapsedRatio = rest.totalMs > 0 ? 1 - rest.remainingMs / rest.totalMs : 1;
  return (
    <div className="screen screen--rest">
      <TopBar onOpenSettings={onOpenSettings} />
      <div className="layout layout--single">
        <div className="layout__main stack">
          <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.restTitle}</h1>
          {paused && <p className="notice notice--paused">{pauseReason === 'user' ? copy.restPausedUser : copy.restPausedHidden}</p>}
          {/* role=timer 預設不即時播報，避免每秒朗讀倒數 */}
          <p className="timer" role="timer" aria-label={`休息剩餘 ${formatClockSpoken(rest.remainingMs)}`}>{formatClock(rest.remainingMs)}</p>
          <ProgressBar ratio={elapsedRatio} label="休息進度" />
          <p className="muted">{copy.restBody}</p>
          {!wakeLockAvailable && <p className="muted small">{copy.wakeLockUnavailable}</p>}
          <div className="controls controls--sticky">
            {paused
              ? <button type="button" className="btn btn--primary" onClick={onResume}>{copy.resume}</button>
              : <button type="button" className="btn btn--primary" onClick={onPause}>{copy.pause}</button>}
            <button type="button" className="btn" onClick={onExtend}>{copy.extendRest}</button>
            <button type="button" className="btn" onClick={onSkip}>{copy.skipRest}</button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>{copy.exit}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
