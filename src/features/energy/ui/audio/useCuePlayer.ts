import { useCallback, useEffect, useMemo, useRef } from 'react';

export type Cue = 'exhale' | 'inhale' | 'restFinished' | 'test';

// 只有柔和正弦音，沒有語音（DECISIONS U3）。
const TONES: Record<Cue, readonly number[]> = {
  exhale: [392],
  inhale: [330],
  restFinished: [392, 494],
  test: [392],
};

type Voice = { osc: OscillatorNode; gain: GainNode };
type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

export function useCuePlayer(enabled: boolean, volume: number) {
  const contextRef = useRef<AudioContext | null>(null);
  const voices = useRef(new Set<Voice>());
  const options = useRef({ enabled, volume });
  options.current = { enabled, volume };

  // 只能在使用者操作中呼叫，AudioContext 才會被授權。
  const unlock = useCallback(() => {
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    try {
      if (!contextRef.current || contextRef.current.state === 'closed') contextRef.current = new Ctor();
      contextRef.current.resume().catch(() => {});
    } catch { contextRef.current = null; }
  }, []);

  const cancel = useCallback(() => {
    for (const voice of voices.current) {
      try { voice.osc.stop(); } catch { /* already stopped */ }
      voice.gain.disconnect();
    }
    voices.current.clear();
  }, []);

  const play = useCallback((cue: Cue) => {
    const context = contextRef.current;
    const { enabled: on, volume: level } = options.current;
    if (!context || context.state === 'closed' || !on || level <= 0 || document.hidden) return;
    cancel(); // 只播放當下有效提示，不疊加或補播
    try {
      const t0 = context.currentTime;
      TONES[cue].forEach((frequency, index) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const start = t0 + index * 0.28;
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.16 * level, start + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
        osc.connect(gain);
        gain.connect(context.destination);
        const voice = { osc, gain };
        voices.current.add(voice);
        osc.onended = () => { gain.disconnect(); voices.current.delete(voice); };
        osc.start(start);
        osc.stop(start + 0.75);
      });
    } catch { cancel(); }
  }, [cancel]);

  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);
  useEffect(() => () => {
    cancel();
    contextRef.current?.close().catch(() => {});
    contextRef.current = null;
  }, [cancel]);

  return useMemo(() => ({ unlock, play, cancel }), [unlock, play, cancel]);
}
