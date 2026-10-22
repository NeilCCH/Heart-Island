import { useCallback, useEffect, useRef, useState } from 'react';
import { browserRuntime } from '../features/energy/core/controller';
import type { EnergyRuntimeDependencies } from '../features/energy/core/types';
import { useEnergySettings } from '../features/energy/settings/useEnergySettings';
import { useCuePlayer } from '../features/energy/ui/audio/useCuePlayer';
import { BackContext } from '../features/energy/ui/components/TopBar';
import { EnergyStation } from '../features/energy/ui/EnergyStation';
import { useEffectiveReducedMotion } from '../features/energy/ui/hooks/useEffectiveReducedMotion';
import { useThemeAttribute } from '../features/energy/ui/hooks/useThemeAttribute';
import { SettingsSheet } from '../features/energy/ui/screens/SettingsSheet';
import { BreathScreen, clearBreathPrefs } from '../features/breath/BreathScreen';
import { TinyScreen } from '../features/tiny/TinyScreen';
import { GardenScreen } from '../features/garden/GardenScreen';
import { IslandHome } from './IslandHome';
import { useHashRoute, type Route } from './useHashRoute';
import '../features/energy/ui/styles/energy.css';
import './island.css';

// 目前開放的地方；小貓陪伴屋完成後再加入。
const AVAILABLE: readonly Route[] = ['home', 'breath', 'tiny', 'garden', 'energy'];

// 心靈小島根元件：一份共用偏好（聲音、音量、減少動態、主題、記住偏好），各功能共用。
export function IslandApp({ runtime: injected }: { runtime?: EnergyRuntimeDependencies }) {
  const [runtime] = useState(() => injected ?? browserRuntime());
  const preferences = useEnergySettings();
  const { settings } = preferences;
  const motion = useEffectiveReducedMotion(settings.reducedMotion);
  useThemeAttribute(settings.theme, motion.effective);
  const audio = useCuePlayer(settings.soundEnabled, settings.volume);
  const [route, go] = useHashRoute(AVAILABLE);
  const back = useCallback(() => go('home'), [go]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const openSettings = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(true);
  }, []);
  useEffect(() => {
    if (settingsOpen || !openerRef.current) return;
    const opener = openerRef.current;
    openerRef.current = null;
    (opener.isConnected ? opener : mainRef.current?.querySelector<HTMLElement>('[aria-haspopup="dialog"]'))?.focus();
  }, [settingsOpen]);

  // 不再記住偏好時（含「清除已保存的偏好」），各功能自己的偏好也一併刪除。
  useEffect(() => { if (!preferences.remember) clearBreathPrefs(); }, [preferences.remember]);

  // 換地方時把焦點移到新畫面標題；第一次載入不搶焦點。
  const shownRoute = useRef(route);
  useEffect(() => {
    if (shownRoute.current === route) return;
    shownRoute.current = route;
    window.scrollTo?.(0, 0);
    mainRef.current?.querySelector<HTMLElement>('[data-screen-heading]')?.focus();
  }, [route]);

  // 小貓能量站自帶版面與設定；仍包在 mainRef 內，讓上方的焦點 effect 能找到它的標題。
  if (route === 'energy') return <div ref={mainRef}><EnergyStation preferences={preferences} onBack={back} runtime={injected} /></div>;

  return (
    <div className="energy">
      <div ref={mainRef} className="energy__main" inert={settingsOpen}>
        <BackContext.Provider value={route === 'home' ? null : back}>
          {route === 'home' && <IslandHome available={AVAILABLE} onOpenSettings={openSettings} />}
          {route === 'tiny' && <TinyScreen onOpenSettings={openSettings} />}
          {route === 'garden' && <GardenScreen onOpenSettings={openSettings} reducedMotion={motion.effective} />}
          {route === 'breath' && (
            <BreathScreen runtime={runtime} remember={preferences.remember} volume={settings.volume}
              reducedMotion={motion.effective} onOpenSettings={openSettings} />
          )}
        </BackContext.Provider>
      </div>
      {settingsOpen && (
        <SettingsSheet settings={settings} update={preferences.update} remember={preferences.remember} setRemember={preferences.setRemember}
          clearSaved={preferences.clearSaved} resetToDefaults={preferences.resetToDefaults} storageError={preferences.storageError}
          systemReducedMotion={motion.system} onSoundGesture={audio.unlock} onTestSound={() => { audio.unlock(); audio.play('test'); }}
          onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
