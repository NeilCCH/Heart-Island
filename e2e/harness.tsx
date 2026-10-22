import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useEnergySession } from '../src/features/energy/core/useEnergySession';
import { useEnergySettings } from '../src/features/energy/settings/useEnergySettings';
function Harness() {
  const preferences = useEnergySettings(); const { session, actions } = useEnergySession(preferences.settings);
  return <main><h1>核心瀏覽器測試頁</h1><p>僅供測試；不是產品畫面</p><output data-testid="state">{JSON.stringify(session)}</output>
    {Object.entries(actions).filter(([name]) => name !== 'setPace').map(([name, action]) => <button key={name} onClick={() => (action as () => void)()}>{name}</button>)}
    <button onClick={() => preferences.setRemember(true)}>remember</button><button onClick={() => preferences.update({ pace:4 })}>brisk</button>
    <output data-testid="remember">{String(preferences.remember)}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
