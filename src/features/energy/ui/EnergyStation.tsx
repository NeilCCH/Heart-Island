import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EnergyEffect, EnergyRuntimeDependencies, Mode } from '../core/types';
import { useEnergySession } from '../core/useEnergySession';
import { useEnergySettings } from '../settings/useEnergySettings';
import { useCuePlayer } from './audio/useCuePlayer';
import { copy } from './copy';
import { useEffectiveReducedMotion } from './hooks/useEffectiveReducedMotion';
import { useThemeAttribute } from './hooks/useThemeAttribute';
import { useWakeLock } from './hooks/useWakeLock';
import { EnergyHome } from './screens/EnergyHome';
import { GuidedSet } from './screens/GuidedSet';
import { RestScreen } from './screens/RestScreen';
import { SetComplete } from './screens/SetComplete';
import { SettingsSheet } from './screens/SettingsSheet';
import { BackContext } from './components/TopBar';
import './styles/energy.css';

type Screen = 'home' | 'guide' | 'complete' | 'rest';
const SCREEN_OF: Record<Mode, Screen> = {
  idle: 'home', guiding: 'guide', pausedGuiding: 'guide', setComplete: 'complete',
  resting: 'rest', pausedRest: 'rest', readyNext: 'rest',
};
// 這些模式下一律停止音訊（README 核心接線說明）。
const SILENT_MODES: readonly Mode[] = ['idle', 'pausedGuiding', 'pausedRest', 'setComplete'];

function isInteractive(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('button, input, select, textarea, a, [role="dialog"]');
}

// 功能根元件：唯一掛載 useEnergySession 的地方，切換畫面或開啟設定都不會卸載。
// 時間與計數只讀核心；UI 不自建計時器或計數器。
export type Preferences = ReturnType<typeof useEnergySettings>;
interface StationProps { runtime?: EnergyRuntimeDependencies; preferences?: Preferences; onBack?: () => void }

// 在萌寵心靈島中由外層傳入共用偏好與返回動作；單獨使用（測試）時自己建立偏好。
export function EnergyStation(props: StationProps) {
  return props.preferences
    ? <Station {...props} preferences={props.preferences} hosted />
    : <StandaloneStation {...props} />;
}

function StandaloneStation(props: StationProps) {
  const preferences = useEnergySettings();
  return <Station {...props} preferences={preferences} hosted={false} />;
}

function Station({ runtime, preferences, onBack, hosted }: StationProps & { preferences: Preferences; hosted: boolean }) {
  const { settings, update } = preferences;
  const motion = useEffectiveReducedMotion(settings.reducedMotion);
  // 傳給核心的是有效低動態；只在相關值變化時產生新引用。
  const coreSettings = useMemo(() => ({ ...settings, reducedMotion: motion.effective }), [settings, motion.effective]);
  const audio = useCuePlayer(settings.soundEnabled, settings.volume);
  const [announcement, setAnnouncement] = useState({ text: '', count: 0 });
  // 每次播報遞增 count；交替附加零寬字元，讓相同句子也會被重新播報。
  const announce = useCallback((text: string) => setAnnouncement(previous => ({ text, count: previous.count + 1 })), []);

  const onEffects = useCallback((effects: readonly EnergyEffect[]) => {
    const parts: string[] = [];
    let completed: string | null = null;
    for (const effect of effects) {
      switch (effect.type) {
        case 'phaseChanged': audio.play(effect.phase === 'exhaleLift' ? 'exhale' : 'inhale'); parts.push(copy.phaseShort[effect.phase]); break;
        case 'cycleCompleted': parts.push(copy.guided(effect.guidedCycles)); break;
        case 'setCompleted': audio.cancel(); completed = copy.announce.setComplete(effect.guidedCycles); break;
        case 'guidancePaused': audio.cancel(); parts.push(copy.announce.paused); break;
        case 'restFinished': audio.play('restFinished'); parts.push(copy.announce.restFinished); break;
      }
    }
    const text = completed ?? parts.join('，');
    if (text) announce(text);
  }, [audio, announce]);

  const energy = useEnergySession(coreSettings, { onEffects, dependencies: runtime });
  const { session, guide, rest, actions } = energy;
  const screen = SCREEN_OF[session.mode];
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 主題與低動態屬性由外層 App 統一設定；單獨使用時才自己設定。
  useThemeAttribute(settings.theme, motion.effective, !hosted);
  const wakeLock = useWakeLock(session.mode === 'guiding' || session.mode === 'resting');

  useEffect(() => { if (SILENT_MODES.includes(session.mode)) audio.cancel(); }, [session.mode, audio]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) audio.cancel(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [audio]);

  // 換畫面時把焦點移到新畫面的標題；第一次載入不搶焦點。
  const mainRef = useRef<HTMLElement>(null);
  const shownScreen = useRef(screen);
  useEffect(() => {
    // 比對上次畫面而非旗標：StrictMode 重跑 effect 時不會誤搶焦點。
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    // 回到頂端再移焦點：手機上按「開始引導」時畫面在下方，否則萌寵會被捲到螢幕外。
    window.scrollTo?.(0, 0);
    mainRef.current?.querySelector<HTMLElement>('[data-screen-heading]')?.focus({ preventScroll: true });
  }, [screen]);

  // 需要使用者手勢的操作：若已開啟聲音，順便授權音訊。
  const withAudio = useCallback((action: () => void) => () => {
    if (settings.soundEnabled) audio.unlock();
    action();
  }, [settings.soundEnabled, audio]);

  // 空白鍵：暫停／繼續（焦點不在按鈕或輸入元件時）。
  useEffect(() => {
    if (settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (event.repeat || isInteractive(event.target)) return;
      const toggle: Partial<Record<Mode, () => void>> = {
        guiding: actions.pause, pausedGuiding: withAudio(actions.resume),
        resting: actions.pauseRest, pausedRest: withAudio(actions.resumeRest),
      };
      const run = toggle[session.mode];
      if (!run) return;
      event.preventDefault();
      run();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settingsOpen, session.mode, actions, withAudio]);

  // 關閉設定後焦點回到開啟它的按鈕；若該畫面已切換，改回目前畫面的設定按鈕。
  const openerRef = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(true);
  }, []);
  useEffect(() => {
    if (settingsOpen || !openerRef.current) return;
    const opener = openerRef.current;
    openerRef.current = null;
    const target = opener.isConnected ? opener : mainRef.current?.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
    target?.focus();
  }, [settingsOpen]);
  const common = { settings, update, onOpenSettings: openSettings };

  return (
    <BackContext.Provider value={onBack ?? null}>
    <div className="energy">
      <main ref={mainRef} className="energy__main" inert={settingsOpen}>
        {screen === 'home' && <EnergyHome {...common} onStart={withAudio(actions.start)} />}
        {screen === 'guide' && guide && (
          <GuidedSet {...common} guide={guide} paused={session.mode === 'pausedGuiding'} reducedMotion={motion.effective} wakeLockAvailable={wakeLock.available}
            onPause={actions.pause} onResume={withAudio(actions.resume)} onFinish={actions.finishSet} onExit={actions.exit} />
        )}
        {screen === 'complete' && (
          <SetComplete {...common} setIndex={session.setIndex} guidedCycles={session.guidedCycles}
            onRest={withAudio(actions.startRest)} onNextSet={withAudio(actions.nextSet)} onExit={actions.exit} />
        )}
        {screen === 'rest' && rest && (
          <RestScreen {...common} rest={rest} paused={session.mode === 'pausedRest'} pauseReason={session.pauseReason}
            wakeLockAvailable={wakeLock.available}
            onPause={actions.pauseRest} onResume={withAudio(actions.resumeRest)} onExtend={actions.extendRest} onSkip={actions.skipRest}
            onRestAgain={withAudio(actions.startRest)} onNextSet={withAudio(actions.nextSet)} onExit={actions.exit} />
        )}
      </main>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">{announcement.text}{announcement.count % 2 ? '\u200B' : ''}</div>
      {settingsOpen && (
        <SettingsSheet settings={settings} update={update} remember={preferences.remember} setRemember={preferences.setRemember}
          clearSaved={preferences.clearSaved} resetToDefaults={preferences.resetToDefaults} storageError={preferences.storageError}
          systemReducedMotion={motion.system} onSoundGesture={audio.unlock} onTestSound={() => { audio.unlock(); audio.play('test'); }}
          onClose={() => setSettingsOpen(false)} />
      )}
    </div>
    </BackContext.Provider>
  );
}
