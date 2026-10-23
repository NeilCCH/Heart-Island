import type { EnergySettings, GuideView } from '../../core/types';
import { copy } from '../copy';
import { PetFigure } from '../components/PetFigure';
import { PacePicker } from '../components/Pickers';
import { ProgressBar } from '../components/ProgressBar';
import { TopBar } from '../components/TopBar';

export function GuidedSet({ guide, paused, reducedMotion = false, settings, update, wakeLockAvailable, onPause, onResume, onFinish, onExit, onOpenSettings }: {
  guide: GuideView; paused: boolean; reducedMotion?: boolean; settings: EnergySettings;
  update: (partial: Partial<EnergySettings>) => void; wakeLockAvailable: boolean;
  onPause: () => void; onResume: () => void; onFinish: () => void; onExit: () => void; onOpenSettings: () => void;
}) {
  // 剩餘秒數：奇數秒節奏每段是 x.5 秒，一開始顯示 x.5，之後才以整數倒數，不會比這一段還長。
  const phaseSeconds = guide.phaseDurationMs / 1000;
  const remaining = guide.phaseRemainingMs / 1000;
  const seconds = !Number.isInteger(phaseSeconds) && remaining > Math.floor(phaseSeconds)
    ? phaseSeconds
    : Math.max(1, Math.ceil(remaining));
  // 萌寵跟著節奏起伏：吐氣舉起時慢慢升高，吸氣放下時慢慢回到地面；暫停時停在原處。
  const eased = (1 - Math.cos(Math.PI * guide.phaseRatio)) / 2;
  const lift = reducedMotion ? undefined : guide.phase === 'exhaleLift' ? eased : 1 - eased;
  const pausedText = guide.pauseReason === 'user' ? copy.pausedUser : copy.pausedHidden;
  return (
    <div className="screen screen--guide">
      <TopBar onOpenSettings={onOpenSettings} />
      <div className="layout">
        <div className="layout__aside pet-stage pet-stage--compact">
          <PetFigure pet={settings.pet} size="compact" lift={lift} />
        </div>
        <div className="layout__main stack">
          <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.setIndex(guide.setIndex)}</h1>
          {paused && <p className="notice notice--paused">{pausedText}</p>}
          <section className={`card stack guide-card guide-card--${guide.phase}${paused ? ' guide-card--paused' : ''}`}>
            <p className={`cue cue--${guide.phase}${paused ? ' cue--paused' : ''}`}>{copy.phase[guide.phase]}</p>
            <ProgressBar ratio={guide.phaseRatio} label="這一段的進度" />
            <p className="muted">{copy.phaseRemaining(seconds)}</p>
          </section>
          <p className="count">
            <strong className="count__value">{copy.guided(guide.guidedCycles)}</strong>
            <span className="count__target">{copy.targetOf(guide.target)}</span>
          </p>
          <div className="controls">
            {paused
              ? <button type="button" className="btn btn--primary" onClick={onResume}>{copy.resume}</button>
              : <button type="button" className="btn btn--primary" onClick={onPause}>{copy.pause}</button>}
            <button type="button" className="btn" onClick={onFinish}>{copy.finishSet}</button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>{copy.exit}</button>
          </div>
          <section className="card stack">
            {guide.cyclePace !== guide.pendingPace && <p className="tag">{copy.pendingPace(guide.pendingPace)}</p>}
            <PacePicker value={settings.pace} update={update} hint="拖動調整秒數，從下一個循環開始。" />
          </section>
          <p className="muted small">{copy.countNote}</p>
          {!wakeLockAvailable && <p className="muted small">{copy.wakeLockUnavailable}</p>}
        </div>
      </div>
    </div>
  );
}
