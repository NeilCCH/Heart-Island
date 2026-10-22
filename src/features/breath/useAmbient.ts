import { useCallback, useEffect, useMemo, useRef } from 'react';

type AudioContextCtor = new () => AudioContext;
interface Graph { master: GainNode; sources: AudioScheduledSourceNode[] }

function ctor(): AudioContextCtor | null {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

// 柔和背景音：低頻和聲＋輕微空氣聲，全部即時合成，沒有音檔與授權問題。
// 音量隨光球大小緩慢起伏；只在使用者主動開啟、畫面前景且正在播放時發聲。
export function useAmbient() {
  const contextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<Graph | null>(null);

  const unlock = useCallback(() => {
    const Ctor = ctor();
    if (!Ctor) return;
    try {
      if (!contextRef.current || contextRef.current.state === 'closed') contextRef.current = new Ctor();
      contextRef.current.resume().catch(() => {});
    } catch { contextRef.current = null; }
  }, []);

  const start = useCallback(() => {
    const context = contextRef.current;
    if (!context || context.state === 'closed' || graphRef.current || document.hidden) return;
    try {
      const master = context.createGain();
      master.gain.value = 0.0001;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 700;
      filter.connect(master); master.connect(context.destination);
      const sources: AudioScheduledSourceNode[] = [];
      for (const [type, frequency, level] of [['sine', 110, 0.6], ['sine', 164.81, 0.35], ['triangle', 220.5, 0.12]] as const) {
        const osc = context.createOscillator(); const gain = context.createGain();
        osc.type = type; osc.frequency.value = frequency; gain.gain.value = level;
        osc.connect(gain); gain.connect(filter); osc.start(); sources.push(osc);
      }
      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const band = context.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 500; band.Q.value = 0.7;
      const air = context.createGain(); air.gain.value = 0.08;
      noise.connect(band); band.connect(air); air.connect(master); noise.start(); sources.push(noise);
      graphRef.current = { master, sources };
    } catch { graphRef.current = null; }
  }, []);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    const context = contextRef.current;
    graphRef.current = null;
    if (!graph || !context) return;
    try {
      graph.master.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
      for (const source of graph.sources) source.stop(context.currentTime + 0.4);
    } catch { /* 已停止 */ }
  }, []);

  const setLevel = useCallback((level: number, volume: number) => {
    const graph = graphRef.current; const context = contextRef.current;
    if (!graph || !context) return;
    graph.master.gain.setTargetAtTime(Math.max(0.0001, (0.05 + 0.07 * level) * volume), context.currentTime, 0.25);
  }, []);

  useEffect(() => () => { stop(); contextRef.current?.close().catch(() => {}); contextRef.current = null; }, [stop]);
  return useMemo(() => ({ unlock, start, stop, setLevel }), [unlock, start, stop, setLevel]);
}
