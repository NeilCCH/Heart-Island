import { useEffect, useState } from 'react';
import type { Pet } from '../energy/core/types';
import { OptionGroup } from '../energy/ui/components/OptionGroup';
import { TopBar } from '../energy/ui/components/TopBar';
import { copy as energyCopy } from '../energy/ui/copy';
import { useWakeLock } from '../energy/ui/hooks/useWakeLock';
import { PetRig } from '../companion/PetRig';
import { soundsCopy } from '../sounds/copy';
import { SCAPES, useSleepTimer, useSoundscape, type Scape } from '../sounds/useSoundscape';
import { nightCopy as copy } from './copy';
import '../companion/companion.css';
import './night.css';

export const NIGHT_INHALE = 4_000;
export const NIGHT_EXHALE = 6_000;
const TIMERS = [15, 30, 45, 60] as const;
const NIGHT_LEVEL = 0.7; // 睡前比平常再小聲一點
type SoundChoice = Scape | 'off';
const soundOptions = [{ value: 'off' as SoundChoice, label: copy.soundOff }, ...SCAPES.map(s => ({ value: s as SoundChoice, label: soundsCopy.scapes[s].name }))];
const timerOptions = TIMERS.map(m => ({ value: m as number, label: copy.timerMinutes(m) }));

// 吸 4 秒、吐 6 秒的慢呼吸，依時間計算，跟畫面更新頻率無關。
function useNightBreath(active: boolean, now: () => number) {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  useEffect(() => {
    if (!active) return;
    const start = now();
    const tick = () => setPhase((now() - start) % (NIGHT_INHALE + NIGHT_EXHALE) < NIGHT_INHALE ? 'inhale' : 'exhale');
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [active, now]);
  return phase;
}

type Stage = 'setup' | 'running' | 'done';

// 睡前模式：很暗的畫面、睡著的萌寵、很慢的呼吸提示與可選的背景聲；時間到就道晚安並放開螢幕。
export function NightScreen({ pet, volume, reducedMotion, onOpenSettings, now = Date.now }: {
  pet: Pet; volume: number; reducedMotion: boolean; onOpenSettings: () => void; now?: () => number;
}) {
  const [stage, setStage] = useState<Stage>('setup');
  const [sound, setSound] = useState<SoundChoice>('rain');
  const [minutes, setMinutes] = useState(30);
  const [guide, setGuide] = useState(true);
  const scape = useSoundscape();
  const running = stage === 'running';
  useWakeLock(running);
  const phase = useNightBreath(running && guide, now);
  const left = useSleepTimer(minutes, running, () => { scape.stop(30); setStage('done'); }, now);

  // 跟著共用音量：進行中在設定調整音量立即生效；音量 0 就是安靜（聲音仍在，調高就聽得到）。
  useEffect(() => { if (running) scape.setVolume(volume * NIGHT_LEVEL); }, [running, volume, scape]);

  const start = () => {
    if (sound !== 'off') scape.play(sound, volume * NIGHT_LEVEL);
    setStage('running');
  };
  const end = () => { scape.stop(); setStage('setup'); };

  return (
    <div className={`screen feature night night--${stage}${reducedMotion ? ' night--still' : ''}`}>
      <TopBar label={copy.title} onOpenSettings={onOpenSettings} />
      <h1 tabIndex={-1} data-screen-heading className={stage === 'setup' ? 'title title--small' : 'sr-only'}>{copy.title}</h1>

      {stage !== 'done' && (
        <div className="night-scene" data-phase={running && guide ? phase : undefined}>
          <svg viewBox="0 200 600 600" role="img" aria-label={copy.sleeping(energyCopy.petName[pet])}>
            <defs>
              <radialGradient id="night-glow"><stop offset="0" stopColor="#f3dcb8" stopOpacity="0.32" /><stop offset="1" stopColor="#f3dcb8" stopOpacity="0" /></radialGradient>
              <mask id="night-moon"><circle r="34" fill="#fff" /><circle r="34" cx="14" cy="-8" fill="#000" /></mask>
              <radialGradient id="night-cushion" cx="45%" cy="40%"><stop offset="0" stopColor="#3a4870" /><stop offset="1" stopColor="#222c4a" /></radialGradient>
            </defs>
            <g className="night-stars">
              {[[60, 250], [140, 320], [520, 240], [470, 330], [90, 430], [560, 420], [300, 230]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2" />)}
            </g>
            <g transform="translate(470 290)"><circle r="34" fill="#f3e6c9" opacity="0.85" mask="url(#night-moon)" /></g>
            <circle className="night-glow" cx="300" cy="560" r="260" fill="url(#night-glow)" />
            <ellipse cx="300" cy="728" rx="200" ry="42" fill="url(#night-cushion)" />
            <PetRig pet={pet} mood="sleep" action="none" blink={false} lean={0} />
          </svg>
          {running && guide && <p className="night-word">{phase === 'inhale' ? copy.inhale : copy.exhale}</p>}
        </div>
      )}

      {stage === 'setup' && (
        <>
          <p className="feature__intro">{copy.intro}</p>
          <section className="card stack">
            <OptionGroup<SoundChoice> legend={copy.soundLabel} options={soundOptions} value={sound} onChange={setSound} compact />
            <OptionGroup<number> legend={copy.timerLabel} options={timerOptions} value={minutes} onChange={setMinutes} compact />
            <label className="switch">
              <input type="checkbox" role="switch" checked={guide} onChange={event => setGuide(event.target.checked)} />
              <span>{copy.showGuide}</span>
            </label>
          </section>
          <div className="controls"><button type="button" className="btn btn--primary" onClick={start}>{copy.start}</button></div>
          <p className="muted small">{copy.wakeNote}</p>
        </>
      )}

      {running && (
        <div className="night-bottom">
          <p className="muted small" role="status">{left !== null ? copy.left(left) : ' '}</p>
          <button type="button" className="btn btn--ghost" onClick={end}>{copy.end}</button>
        </div>
      )}

      {stage === 'done' && (
        <section className="night-done" role="status">
          <p className="night-done__title">{copy.goodnight}</p>
          <p className="muted">{copy.goodnightNote}</p>
          <div className="controls">
            <button type="button" className="btn btn--ghost" onClick={() => setStage('setup')}>{copy.again}</button>
            <a className="btn btn--ghost" href="#">{copy.home}</a>
          </div>
        </section>
      )}
    </div>
  );
}
