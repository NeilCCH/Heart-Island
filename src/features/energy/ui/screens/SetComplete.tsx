import type { EnergySettings } from '../../core/types';
import { copy } from '../copy';
import { CatFigure } from '../components/CatFigure';
import { RestPicker } from '../components/Pickers';
import { TopBar } from '../components/TopBar';

export function SetComplete({ setIndex, guidedCycles, settings, update, onRest, onNextSet, onExit, onOpenSettings }: {
  setIndex: number; guidedCycles: number; settings: EnergySettings;
  update: (partial: Partial<EnergySettings>) => void;
  onRest: () => void; onNextSet: () => void; onExit: () => void; onOpenSettings: () => void;
}) {
  return (
    <div className="screen screen--complete">
      <TopBar onOpenSettings={onOpenSettings} />
      <div className="layout">
        <div className="layout__aside">
          <CatFigure size="compact" />
        </div>
        <div className="layout__main stack">
          <h1 tabIndex={-1} data-screen-heading className="title title--small">{copy.completeTitle}</h1>
          <p className="lead">{copy.completeBody}</p>
          <p className="count">
            <span className="count__target">{copy.setIndex(setIndex)}</span>
            <strong className="count__value">{copy.guided(guidedCycles)}</strong>
          </p>
          <RestPicker value={settings.restSeconds} update={update} compact />
          <div className="controls controls--sticky">
            <button type="button" className="btn btn--primary" onClick={onRest}>{copy.rest(settings.restSeconds)}</button>
            <button type="button" className="btn" onClick={onNextSet}>{copy.nextSet}</button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>{copy.exit}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
