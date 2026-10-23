import type { Pet } from '../energy/core/types';
import type { Mood } from './useCompanionMood';

export const companionCopy = {
  title: '萌寵陪伴屋',
  intro: '萌寵在這裡。可以摸摸牠，也可以只是陪牠待著。',
  petHead: '摸摸頭',
  petCheek: '摸摸臉頰',
  rest: '陪牠休息',
  wake: '輕輕叫醒',
  hint: {
    cat: '在小貓的頭上輕輕滑動，就是在摸牠。',
    dog: '在小狗的頭上輕輕滑動，就是在摸牠。',
  } satisfies Record<Pet, string>,
  state: {
    cat: {
      idle: '小貓坐著，安靜地陪著你。',
      happy: '小貓瞇起眼睛，發出呼嚕聲。',
      sleep: '小貓睡著了，呼吸慢慢的。',
    },
    dog: {
      idle: '小狗坐著，安靜地陪著你。',
      happy: '小狗瞇起眼睛，開心地搖著尾巴。',
      sleep: '小狗睡著了，呼吸慢慢的。',
    },
  } satisfies Record<Pet, Record<Mood, string>>,
  // 連續摸了好幾下之後
  delight: {
    cat: '小貓很放鬆，呼嚕聲變得綿長。',
    dog: '小狗開心得扭來扭去。',
  } satisfies Record<Pet, string>,
  note: '牠不需要吃東西，不會生病，也不會因為你沒來而難過。下次來，牠還在這裡。',
} as const;
