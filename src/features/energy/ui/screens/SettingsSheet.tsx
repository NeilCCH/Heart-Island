import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { EnergySettings } from '../../core/types';
import { copy } from '../copy';
import { OptionGroup } from '../components/OptionGroup';

type Theme = EnergySettings['theme'];
const themeOptions = (['system', 'light', 'dark'] as const).map(value => ({ value, label: copy.themeName[value] }));

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';

export function SettingsSheet({ settings, update, remember, setRemember, clearSaved, resetToDefaults, storageError, systemReducedMotion, onSoundGesture, onTestSound, onClose }: {
  settings: EnergySettings; update: (partial: Partial<EnergySettings>) => void;
  remember: boolean; setRemember: (on: boolean) => void; clearSaved: () => void; resetToDefaults: () => void;
  storageError: string | null; systemReducedMotion: boolean;
  onSoundGesture: () => void; onTestSound: () => void; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 開啟時把焦點移入；關閉後的焦點回復由 EnergyStation 處理。
  useEffect(() => { closeRef.current?.focus(); }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="energy-settings-title" onKeyDown={onKeyDown}>
        <div className="sheet__head">
          <h2 id="energy-settings-title" className="title title--small">{copy.settingsTitle}</h2>
          <button ref={closeRef} type="button" className="btn btn--ghost btn--small" onClick={onClose}>{copy.close}</button>
        </div>
        <div className="stack">
          <div className="field">
            <label className="switch">
              <input type="checkbox" role="switch" checked={settings.soundEnabled}
                onChange={event => { const on = event.target.checked; if (on) onSoundGesture(); update({ soundEnabled: on }); }} />
              <span>{copy.soundLabel}</span>
            </label>
            <p className="muted small">{copy.soundHint}</p>
          </div>
          <div className="field field--row">
            <label htmlFor="energy-volume">{copy.volumeLabel}</label>
            <input id="energy-volume" type="range" min={0} max={1} step={0.1} value={settings.volume}
              disabled={!settings.soundEnabled} aria-valuetext={`${Math.round(settings.volume * 100)}%`}
              onChange={event => update({ volume: Number(event.target.value) })} />
            <button type="button" className="btn btn--small" disabled={!settings.soundEnabled} onClick={onTestSound}>{copy.testSound}</button>
          </div>
          <div className="field">
            <label className="switch">
              <input type="checkbox" role="switch" checked={settings.reducedMotion} onChange={event => update({ reducedMotion: event.target.checked })} />
              <span>{copy.reducedMotionLabel}</span>
            </label>
            {systemReducedMotion && <p className="muted small">{copy.reducedMotionSystem}</p>}
          </div>
          <OptionGroup<Theme> legend={copy.themeLabel} options={themeOptions} value={settings.theme} onChange={theme => update({ theme })} compact />
          <div className="field">
            <label className="switch">
              <input type="checkbox" role="switch" checked={remember} onChange={event => setRemember(event.target.checked)} />
              <span>{copy.rememberLabel}</span>
            </label>
            <p className="muted small">{copy.rememberHint}</p>
          </div>
          {storageError && <p className="notice notice--paused" role="status">{storageError}</p>}
          <div className="controls">
            <button type="button" className="btn" onClick={clearSaved}>{copy.clearSaved}</button>
            <button type="button" className="btn" onClick={resetToDefaults}>{copy.resetDefaults}</button>
          </div>
          <p className="muted small">{copy.privacy}</p>
        </div>
      </div>
    </div>
  );
}
