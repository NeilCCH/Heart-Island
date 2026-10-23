import { useCallback, useEffect, useMemo, useRef } from 'react';

type Ctor = new () => AudioContext;
const audioCtor = (): Ctor | null =>
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;

// 即時合成的陪伴聲。小貓呼嚕：低通噪音＋約 25Hz 起伏；小狗喘氣：帶通噪音＋約 2.6Hz 起伏。
// 只有全島聲音開啟、使用者觸摸授權時才發聲。
export type PetSound = 'purr' | 'pant';
const VOICE: Record<PetSound, { filter: BiquadFilterType; frequency: number; rate: number; level: number }> = {
  purr: { filter: 'lowpass', frequency: 140, rate: 25, level: 0.5 },
  pant: { filter: 'bandpass', frequency: 900, rate: 2.6, level: 0.3 },
};
export function usePurr(enabled: boolean, volume: number, sound: PetSound = 'purr') {
  const voice = VOICE[sound];
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
      const low = context.createBiquadFilter(); low.type = voice.filter; low.frequency.value = voice.frequency;
      const tremolo = context.createGain(); tremolo.gain.value = 0.5;
      const lfo = context.createOscillator(); lfo.frequency.value = voice.rate;
      const depth = context.createGain(); depth.gain.value = 0.5;
      lfo.connect(depth); depth.connect(tremolo.gain);
      const gain = context.createGain(); gain.gain.value = 0.0001;
      noise.connect(low); low.connect(tremolo); tremolo.connect(gain); gain.connect(context.destination);
      noise.start(); lfo.start();
      gain.gain.setTargetAtTime(voice.level * volume, context.currentTime, 0.2);
      nodesRef.current = { gain, sources: [noise, lfo] };
    } catch { nodesRef.current = null; }
  }, [enabled, volume, voice]);

  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);
  // 播放中調整音量立即生效；音量為 0 就停止。
  useEffect(() => {
    const nodes = nodesRef.current; const context = contextRef.current;
    if (!nodes || !context) return;
    if (volume <= 0) { stop(); return; }
    try { nodes.gain.gain.setTargetAtTime(voice.level * volume, context.currentTime, 0.1); } catch { /* 已停止 */ }
  }, [volume, voice, stop]);
  // 換萌寵時先停掉舊的聲音，下次摸摸再用新的聲音。
  useEffect(() => stop, [voice, stop]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stop]);
  useEffect(() => () => { stop(); contextRef.current?.close().catch(() => {}); contextRef.current = null; }, [stop]);
  return useMemo(() => ({ start, stop }), [start, stop]);
}
