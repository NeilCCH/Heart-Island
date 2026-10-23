import { useCallback, useEffect, useRef, useState } from 'react';

export type Mood = 'idle' | 'happy' | 'sleep';
export type Action = 'none' | 'tilt' | 'stretch' | 'swish';

export const SLEEP_AFTER_MS = 45_000;
const HAPPY_MS = 1_600;
const ACTION_MS = 1_800;
const BLINK_MS = 160;
const ACTIONS: readonly Action[] = ['tilt', 'stretch', 'swish'];

// 小貓的行為：沒有需求值、沒有懲罰。閒置時偶爾眨眼、歪頭、伸懶腰、甩尾巴，久了就睡著。
// 畫面在背景時暫停所有計時，不在背景偷偷變化。
export function useCompanionMood(random: () => number = Math.random) {
  const [mood, setMood] = useState<Mood>('idle');
  const [action, setAction] = useState<Action>('none');
  const [blink, setBlink] = useState(false);
  const [lean, setLean] = useState(0);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const lastTouch = useRef(0);
  const [touchCount, setTouchCount] = useState(0);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const between = useCallback((min: number, max: number) => min + random() * (max - min), [random]);

  // 眨眼（睡著時不眨）：閉眼與睜眼分成兩個階段，閉眼不會取消自己的睜眼計時。
  useEffect(() => {
    if (hidden || mood === 'sleep') { setBlink(false); return; }
    const timer = blink
      ? window.setTimeout(() => setBlink(false), BLINK_MS)
      : window.setTimeout(() => setBlink(true), between(2500, 6000));
    return () => window.clearTimeout(timer);
  }, [hidden, mood, blink, between]);

  // 閒置時偶爾做個小動作
  useEffect(() => {
    if (hidden || mood !== 'idle' || action !== 'none') return;
    const timer = window.setTimeout(() => {
      setAction(ACTIONS[Math.floor(random() * ACTIONS.length) % ACTIONS.length]);
    }, between(8000, 15000));
    return () => window.clearTimeout(timer);
  }, [hidden, mood, action, between, random]);
  useEffect(() => {
    if (action === 'none' || hidden) return;
    const timer = window.setTimeout(() => setAction('none'), ACTION_MS);
    return () => window.clearTimeout(timer);
  }, [action, hidden]);

  // 一段時間沒有互動就睡著
  useEffect(() => {
    if (hidden || mood !== 'idle') return;
    const timer = window.setTimeout(() => setMood('sleep'), SLEEP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [hidden, mood, touchCount]);

  // 摸完一陣子回到平常
  // 背景時這些計時也暫停；回到前景後重新計時。
  useEffect(() => {
    if (mood !== 'happy' || hidden) return;
    const timer = window.setTimeout(() => { setMood('idle'); setLean(0); }, HAPPY_MS);
    return () => window.clearTimeout(timer);
  }, [mood, touchCount, hidden]);

  const pet = useCallback((towards = 0) => {
    lastTouch.current = Date.now();
    setTouchCount(n => n + 1);
    setAction('none');
    setLean(Math.max(-7, Math.min(7, towards)));
    setMood('happy');
  }, []);
  const rest = useCallback(() => { setAction('none'); setLean(0); setMood('sleep'); }, []);
  const wake = useCallback(() => { setTouchCount(n => n + 1); setMood('idle'); setBlink(true); }, []);

  return { mood, action, blink, lean, pet, rest, wake };
}
