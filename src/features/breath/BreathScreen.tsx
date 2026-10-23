import { useCallback, useEffect, useId, useState } from 'react';
import type { EnergyRuntimeDependencies } from '../energy/core/types';
import { OptionGroup } from '../energy/ui/components/OptionGroup';
import { TouchRange } from '../energy/ui/components/TouchRange';
import { copy as energyCopy } from '../energy/ui/copy';
import { TopBar } from '../energy/ui/components/TopBar';
import { useWakeLock } from '../energy/ui/hooks/useWakeLock';
import { BREATH_DEFAULT, BREATH_MAX, BREATH_MIN, breathAt, phaseSeconds, type Ratio } from './breathMath';
import { BreathSky } from './BreathSky';
import { breathCopy as copy } from './copy';
import { useAmbient } from './useAmbient';
import { useBreathClock } from './useBreathClock';
import './breath.css';

interface BreathPrefs { pace: number; ratio: Ratio; showText: boolean }
const PREFS_KEY = 'breath.prefs.v1';
const DEFAULTS: BreathPrefs = { pace: BREATH_DEFAULT, ratio: 'even', showText: true };

// 共用的「清除已保存的偏好」或關閉「記住我的偏好」時，由外層呼叫一併刪除。
export function clearBreathPrefs() {
  try { window.localStorage.removeItem(PREFS_KEY); } catch { /* 無法存取時本來就沒有保存 */ }
}

// 只有使用者選擇記住偏好時才讀取，避免載入已不該保留的舊設定。
function loadPrefs(remember: boolean): BreathPrefs {
  if (!remember) return DEFAULTS;
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return DEFAULTS;
    return {
      pace: Number.isInteger(raw.pace) && raw.pace >= BREATH_MIN && raw.pace <= BREATH_MAX ? raw.pace : DEFAULTS.pace,
      ratio: raw.ratio === 'longExhale' ? 'longExhale' : 'even',
      showText: typeof raw.showText === 'boolean' ? raw.showText : DEFAULTS.showText,
    };
  } catch { return DEFAULTS; }
}

const ratioOptions = [{ value: 'even' as Ratio, label: copy.ratioEven }, { value: 'longExhale' as Ratio, label: copy.ratioLong }];

// 呼吸小宇宙：沒有次數、沒有目標。進來就開始，可以只是看著。
// remember 為 true（使用者在設定中選擇記住偏好）時才把這裡的偏好存在本機。
export function BreathScreen({ runtime, remember, volume, reducedMotion, onOpenSettings }: {
  runtime: EnergyRuntimeDependencies; remember: boolean; volume: number; reducedMotion: boolean; onOpenSettings: () => void;
}) {
  const [prefs, setPrefs] = useState<BreathPrefs>(() => loadPrefs(remember));
  const [running, setRunning] = useState(() => !runtime.isHidden());
  const [pausedByHidden, setPausedByHidden] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const sliderId = useId();

  const onHidden = useCallback(() => { setRunning(false); setPausedByHidden(true); }, []);
  const position = useBreathClock(running, prefs.pace, runtime, onHidden);
  const { phase, level } = breathAt(position, prefs.ratio);
  const split = phaseSeconds(prefs.pace, prefs.ratio);
  const ambient = useAmbient();
  useWakeLock(running);

  useEffect(() => {
    try {
      if (remember) window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      else clearBreathPrefs();
    } catch { /* 只留在記憶體 */ }
  }, [prefs, remember]);

  const playing = ambientOn && running;
  useEffect(() => { if (playing) ambient.start(); else ambient.stop(); }, [playing, ambient]);
  useEffect(() => { if (playing) ambient.setLevel(level, volume); }, [playing, level, volume, ambient]);

  const update = (partial: Partial<BreathPrefs>) => setPrefs(previous => ({ ...previous, ...partial }));
  const resume = () => { if (ambientOn) ambient.unlock(); setPausedByHidden(false); setRunning(true); };
  const toggleAmbient = (on: boolean) => { if (on) ambient.unlock(); setAmbientOn(on); };

  const showWord = prefs.showText || reducedMotion;

  return (
    <div className="screen feature breath">
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <div className={`breath-scene${reducedMotion ? ' breath-scene--still' : ''}`} data-phase={phase}>
        <BreathSky level={level} position={position} ratio={prefs.ratio} still={reducedMotion} />
        <h1 tabIndex={-1} data-screen-heading className="breath-scene__title">{copy.title}</h1>
        <p className="breath-word" aria-hidden={!showWord}>{showWord ? (phase === 'inhale' ? copy.inhale : copy.exhale) : ' '}</p>
        <p className="breath-scene__intro">{copy.intro}</p>
      </div>

      {!running && <p className="notice notice--paused" role="status">{pausedByHidden ? copy.pausedHidden : copy.paused}</p>}

      <div className="controls">
        {running
          ? <button type="button" className="btn btn--primary" onClick={() => setRunning(false)}>{copy.pause}</button>
          : <button type="button" className="btn btn--primary" onClick={resume}>{copy.resume}</button>}
        <button type="button" className="btn" aria-expanded={adjusting} onClick={() => setAdjusting(open => !open)}>
          {adjusting ? copy.closeAdjust : copy.adjust}
        </button>
      </div>

      {adjusting && (
        <section className="breath-panel stack" aria-label={copy.adjust}>
          <div className="pace">
            <div className="pace__head">
              <label htmlFor={sliderId} className="options__legend">{copy.paceLabel}</label>
              <output htmlFor={sliderId} className="pace__value">{copy.paceValue(prefs.pace)}</output>
            </div>
            <TouchRange id={sliderId} className="pace__range" min={BREATH_MIN} max={BREATH_MAX} step={1} value={prefs.pace}
              aria-valuetext={copy.paceSpoken(prefs.pace, split.inhale, split.exhale)} onValue={pace => update({ pace })} steps={energyCopy.paceSteps} />
            <div className="pace__scale" aria-hidden="true"><span>{BREATH_MIN} 秒・{copy.fast}</span><span>{BREATH_MAX} 秒・{copy.slow}</span></div>
            <p className="muted small">{copy.paceSplit(split.inhale, split.exhale)}</p>
          </div>
          <OptionGroup<Ratio> legend={copy.ratioLabel} options={ratioOptions} value={prefs.ratio} onChange={ratio => update({ ratio })} compact />
          <label className="switch">
            <input type="checkbox" role="switch" checked={prefs.showText} onChange={event => update({ showText: event.target.checked })} />
            <span>{copy.showText}</span>
          </label>
          <div className="field">
            <label className="switch">
              <input type="checkbox" role="switch" checked={ambientOn} onChange={event => toggleAmbient(event.target.checked)} />
              <span>{copy.ambient}</span>
            </label>
            <p className="muted small">{copy.ambientHint}</p>
          </div>
        </section>
      )}
    </div>
  );
}
