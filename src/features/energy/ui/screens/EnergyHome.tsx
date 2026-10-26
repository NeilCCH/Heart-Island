import type { EnergySettings } from '../../core/types';
import { copy } from '../copy';
import { PetFigure } from '../components/PetFigure';
import { PacePicker, RestPicker, TargetPicker } from '../components/Pickers';
import { TopBar } from '../components/TopBar';

export function EnergyHome({ settings, update, onStart, onOpenSettings }: {
  settings: EnergySettings; update: (partial: Partial<EnergySettings>) => void;
  onStart: () => void; onOpenSettings: () => void;
}) {
  return (
    <div className="screen screen--home">
      <TopBar label="心靈小島" onOpenSettings={onOpenSettings} />
      <div className="layout">
        <div className="layout__aside pet-stage">
          <PetFigure pet={settings.pet} />
        </div>
        <div className="layout__main stack">
          <h1 tabIndex={-1} data-screen-heading className="title">{copy.title}</h1>
          <p className="lead">{copy.intro}</p>
          <p className="tag">{copy.demoLabel}</p>
          <section className="notice" aria-label="安全說明">
            <p>{copy.safety}</p>
            <p className="muted">{copy.safetyExtra}</p>
          </section>
          <section className="card stack" aria-label={copy.setupTitle}>
            <h2 className="card__title">{copy.setupTitle}</h2>
            <TargetPicker value={settings.target} update={update} />
            <PacePicker value={settings.pace} update={update} />
            <RestPicker value={settings.restSeconds} update={update} />
          </section>
          <p className="muted small">{copy.countNote}</p>
          <div className="controls">
            <button type="button" className="btn btn--primary btn--wide" onClick={onStart}>{copy.start}</button>
          </div>
          <p className="muted small">{copy.privacy}</p>
        </div>
      </div>
    </div>
  );
}
