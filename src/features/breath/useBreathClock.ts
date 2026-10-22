import { useEffect, useRef, useState } from 'react';
import type { EnergyRuntimeDependencies } from '../energy/core/types';
import { advance } from './breathMath';

// 以單調時鐘推進光球；只在 running 時前進。切到背景時通知外層暫停，回來不自動繼續。
export function useBreathClock(running: boolean, paceSeconds: number, runtime: EnergyRuntimeDependencies, onHidden: () => void) {
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const paceRef = useRef(paceSeconds);
  paceRef.current = paceSeconds;
  const hiddenRef = useRef(onHidden);
  hiddenRef.current = onHidden;

  useEffect(() => runtime.subscribeLifecycle(event => { if (event === 'hidden') hiddenRef.current(); }), [runtime]);

  useEffect(() => {
    if (!running) return;
    if (runtime.isHidden()) { hiddenRef.current(); return; }
    let last = runtime.now();
    let frame = 0;
    let stopped = false;
    const loop = () => {
      if (stopped) return;
      const now = runtime.now();
      positionRef.current = advance(positionRef.current, now - last, paceRef.current);
      last = now;
      setPosition(positionRef.current);
      frame = runtime.requestFrame(loop);
    };
    frame = runtime.requestFrame(loop);
    return () => { stopped = true; runtime.cancelFrame(frame); };
  }, [running, runtime]);

  return position;
}
