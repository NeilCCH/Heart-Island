import { useCallback, useEffect, useMemo, useRef } from 'react';

type Ctor = new () => AudioContext;
const audioCtor = (): Ctor | null =>
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;

// 呼嚕聲：低通噪音＋約 25Hz 的振幅起伏，即時合成。只有全島聲音開啟、使用者觸摸授權時才發聲。
export function usePurr(enabled: boolean, volume: number) {
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ gain: GainNode; sources: AudioScheduledSourceNode[] } | null>(null);

  const stop = useCallback(() => {
    const nodes = nodesRef.current; const context = contextRef.current;
    nodesRef.current = null;
    if (!nodes || !context) return;
    try {
      nodes.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.15);
      for (const source of nodes.sources) source.stop(context.currentTime + 0.6);
    } catch { /* 已停止 */ }
  }, []);

  const start = useCallback(() => {
    if (!enabled || volume <= 0 || document.hidden) return;
    const C = audioCtor();
    if (!C) return;
    try {
      if (!contextRef.current || contextRef.current.state === 'closed') contextRef.current = new C();
      const context = contextRef.current;
      context.resume().catch(() => {});
      if (nodesRef.current) return;
      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const low = context.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 140;
      const tremolo = context.createGain(); tremolo.gain.value = 0.5;
      const lfo = context.createOscillator(); lfo.frequency.value = 25;
      const depth = context.createGain(); depth.gain.value = 0.5;
      lfo.connect(depth); depth.connect(tremolo.gain);
      const gain = context.createGain(); gain.gain.value = 0.0001;
      noise.connect(low); low.connect(tremolo); tremolo.connect(gain); gain.connect(context.destination);
      noise.start(); lfo.start();
      gain.gain.setTargetAtTime(0.5 * volume, context.currentTime, 0.2);
      nodesRef.current = { gain, sources: [noise, lfo] };
    } catch { nodesRef.current = null; }
  }, [enabled, volume]);

  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stop]);
  useEffect(() => () => { stop(); contextRef.current?.close().catch(() => {}); contextRef.current = null; }, [stop]);
  return useMemo(() => ({ start, stop }), [start, stop]);
}
