import type { Scape } from './useSoundscape';

export const soundsCopy = {
  title: '療癒聲音',
  intro: '選一種聲音，讓它陪著你。可以做別的事，也可以只是聽。',
  scapes: {
    rain: { name: '雨聲', desc: '屋簷下的細雨' },
    waves: { name: '海浪', desc: '慢慢來回的浪' },
    fire: { name: '營火', desc: '柴火輕輕劈啪' },
    forest: { name: '森林', desc: '風聲與遠方的鳥' },
    stream: { name: '溪流', desc: '石頭間的流水' },
  } satisfies Record<Scape, { name: string; desc: string }>,
  playing: (name: string) => `正在播放：${name}`,
  stop: '停止',
  volume: '音量',
  volumeValue: (v: number) => `${Math.round(v * 100)}%`,
  timerLabel: '定時關閉',
  timerOff: '不關閉',
  timerMinutes: (m: number) => `${m} 分鐘`,
  timerLeft: (m: number) => `大約 ${m} 分鐘後慢慢變小、停下`,
  ended: '聲音已經慢慢停下了。',
  note: '聲音都是即時合成的，不需要網路。手機螢幕關閉後，有些手機會讓聲音停下。',
  unsupported: '這個瀏覽器不支援播放合成聲音。',
} as const;
