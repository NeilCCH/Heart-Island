import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const SCAPES = ['rain', 'waves', 'fire', 'forest', 'stream'] as const;
export type Scape = (typeof SCAPES)[number];

type Ctor = new () => AudioContext;
const audioCtor = (): Ctor | null =>
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;

// 雜訊：白噪音太刺耳，大多用棕噪音（低頻多）或粉紅噪音（介於兩者之間）。
function brown(data: Float32Array) {
  let last = 0;
  for (let i = 0; i < data.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
}
function pink(data: Float32Array) {
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
    data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
  }
}
// 柴火的劈啪聲：稀疏、快速衰減的小脈衝。
function crackles(data: Float32Array, rate: number) {
  for (let n = 0; n < data.length / rate * 5; n++) {
    const at = Math.floor(Math.random() * data.length); const len = Math.floor(rate * (0.002 + Math.random() * 0.01));
    const amp = 0.2 + Math.random() * 0.6;
    for (let i = 0; i < len && at + i < data.length; i++) data[at + i] += (Math.random() * 2 - 1) * amp * (1 - i / len) ** 2;
  }
}
// 遠方的鳥叫：偶爾幾聲短短的上揚音，音量很小。
function birds(data: Float32Array, rate: number) {
  for (let call = 0; call < 3; call++) {
    let at = Math.floor(Math.random() * (data.length - rate));
    const base = 2600 + Math.random() * 1400; const notes = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < notes; k++) {
      const len = Math.floor(rate * (0.06 + Math.random() * 0.05)); let phase = 0;
      for (let i = 0; i < len && at + i < data.length; i++) {
        const t = i / len; phase += (2 * Math.PI * (base + 900 * t)) / rate;
        data[at + i] += Math.sin(phase) * Math.sin(Math.PI * t) * 0.08;
      }
      at += len + Math.floor(rate * 0.05);
    }
  }
}

interface Layer { fill: (data: Float32Array, rate: number) => void; seconds: number; filter: BiquadFilterType; frequency: number; q?: number; level: number; swell?: { rate: number; depth: number } }
// 每一種聲音由一到兩層循環的聲音組成；swell 是很慢的音量起伏（浪、風）。
const RECIPES: Record<Scape, Layer[]> = {
  rain: [
    { fill: pink, seconds: 4, filter: 'highpass', frequency: 500, level: 0.55 },
    { fill: brown, seconds: 4, filter: 'lowpass', frequency: 400, level: 0.35 },
  ],
  waves: [{ fill: brown, seconds: 6, filter: 'lowpass', frequency: 700, level: 0.9, swell: { rate: 0.09, depth: 0.75 } }],
  fire: [
    { fill: brown, seconds: 4, filter: 'lowpass', frequency: 260, level: 0.7 },
    { fill: crackles, seconds: 5, filter: 'bandpass', frequency: 2200, q: 0.8, level: 0.35 },
  ],
  forest: [
    { fill: pink, seconds: 6, filter: 'bandpass', frequency: 600, q: 0.5, level: 0.35, swell: { rate: 0.05, depth: 0.5 } },
    { fill: birds, seconds: 9, filter: 'highpass', frequency: 1800, level: 0.6 },
  ],
  stream: [
    { fill: pink, seconds: 4, filter: 'bandpass', frequency: 1400, q: 0.6, level: 0.5, swell: { rate: 0.3, depth: 0.2 } },
    { fill: brown, seconds: 4, filter: 'lowpass', frequency: 500, level: 0.3 },
  ],
};

interface Graph { master: GainNode; sources: AudioScheduledSourceNode[] }

// 療癒背景聲：全部即時合成，沒有音檔、沒有授權問題，也不必下載。
// 只在使用者按下播放時發聲；fadeOut 讓聲音慢慢變小再停，適合睡前的定時關閉。
export function useSoundscape() {
  const contextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [playing, setPlaying] = useState<Scape | null>(null);

  const stopGraph = useCallback((seconds: number) => {
    const graph = graphRef.current; const context = contextRef.current;
    graphRef.current = null;
    if (!graph || !context) return;
    try {
      graph.master.gain.cancelScheduledValues(context.currentTime);
      graph.master.gain.setTargetAtTime(0.0001, context.currentTime, seconds / 4);
      for (const source of graph.sources) source.stop(context.currentTime + seconds + 0.2);
    } catch { /* 已停止 */ }
  }, []);

  const play = useCallback((scape: Scape, volume: number) => {
    const C = audioCtor();
    if (!C) return false;
    try {
      if (!contextRef.current || contextRef.current.state === 'closed') contextRef.current = new C();
      const context = contextRef.current;
      context.resume().catch(() => {});
      stopGraph(0.6);
      const master = context.createGain(); master.gain.value = 0.0001; master.connect(context.destination);
      const sources: AudioScheduledSourceNode[] = [];
      for (const layer of RECIPES[scape]) {
        const length = Math.floor(context.sampleRate * layer.seconds);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        layer.fill(data, context.sampleRate);
        // 頭尾交叉淡化，循環時不會有「喀」一聲
        const fade = Math.floor(context.sampleRate * 0.3);
        for (let i = 0; i < fade; i++) { const t = i / fade; data[i] = data[i] * t + data[length - fade + i] * (1 - t); }
        const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
        source.loopStart = 0; source.loopEnd = (length - fade) / context.sampleRate;
        const filter = context.createBiquadFilter(); filter.type = layer.filter; filter.frequency.value = layer.frequency;
        if (layer.q) filter.Q.value = layer.q;
        const gain = context.createGain(); gain.gain.value = layer.level;
        source.connect(filter); filter.connect(gain); gain.connect(master);
        if (layer.swell) {
          gain.gain.value = layer.level * (1 - layer.swell.depth / 2);
          const lfo = context.createOscillator(); lfo.frequency.value = layer.swell.rate;
          const depth = context.createGain(); depth.gain.value = (layer.level * layer.swell.depth) / 2;
          lfo.connect(depth); depth.connect(gain.gain); lfo.start(); sources.push(lfo);
        }
        source.start(); sources.push(source);
      }
      master.gain.setTargetAtTime(Math.max(0.0001, volume * 0.5), context.currentTime, 0.8);
      graphRef.current = { master, sources };
      setPlaying(scape);
      return true;
    } catch { graphRef.current = null; setPlaying(null); return false; }
  }, [stopGraph]);

  const setVolume = useCallback((volume: number) => {
    const graph = graphRef.current; const context = contextRef.current;
    if (!graph || !context) return;
    try { graph.master.gain.setTargetAtTime(Math.max(0.0001, volume * 0.5), context.currentTime, 0.2); } catch { /* 已停止 */ }
  }, []);

  const stop = useCallback((fadeSeconds = 0.6) => { stopGraph(fadeSeconds); setPlaying(null); }, [stopGraph]);

  // iOS 從背景回來時音訊可能被暫停，回到畫面就接著播。
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && graphRef.current) contextRef.current?.resume().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => () => { stopGraph(0.2); const c = contextRef.current; contextRef.current = null; window.setTimeout(() => c?.close().catch(() => {}), 500); }, [stopGraph]);

  return useMemo(() => ({ playing, play, stop, setVolume }), [playing, play, stop, setVolume]);
}

// 定時關閉：以結束的時間點計算，背景時計時器變慢也不會延後太多。
export function useSleepTimer(minutes: number | null, active: boolean, onEnd: () => void, now: () => number = Date.now) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!active || !minutes) { setEndsAt(null); setLeft(null); return; }
    setEndsAt(now() + minutes * 60_000);
  }, [minutes, active, now]);
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const remain = endsAt - now();
      if (remain <= 0) { setEndsAt(null); setLeft(null); endRef.current(); return; }
      setLeft(Math.ceil(remain / 60_000));
    };
    tick();
    const timer = window.setInterval(tick, 1_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [endsAt, now]);
  return left;
}
