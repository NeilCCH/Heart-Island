import type { Weather } from './storage';

export const moodCopy = {
  title: '心情小天氣',
  intro: '今天心裡是什麼天氣？選一個就好，沒有對錯，也不用解釋。',
  pickLabel: '今天心裡的天氣',
  weathers: {
    sunny: '晴朗',
    partly: '晴時多雲',
    cloudy: '陰天',
    fog: '起霧',
    rain: '下雨',
    storm: '雷雨',
  } satisfies Record<Weather, string>,
  // 選了之後的一句話；不評價好壞，只是陪著，並輕輕提一個可以去的地方。
  reply: {
    sunny: { text: '今天是晴天。記得這種感覺，也不用勉強它一直在。', place: 'jar', placeLabel: '放一張紙條進感謝小罐子' },
    partly: { text: '有陽光，也有雲。兩種都可以同時存在。', place: 'tiny', placeLabel: '做一件今天一點點' },
    cloudy: { text: '陰陰的也沒關係，天氣本來就會變。', place: 'sounds', placeLabel: '聽一點療癒聲音' },
    fog: { text: '霧濛濛的，看不清楚也沒關係。先待在原地就好。', place: 'ground', placeLabel: '試試五感著地' },
    rain: { text: '下雨的日子，可以慢一點。', place: 'breath', placeLabel: '去呼吸小宇宙待一下' },
    storm: { text: '雷雨很吵，你不用一個人撐著。', place: 'companion', placeLabel: '讓萌寵陪你一下' },
  } satisfies Record<Weather, { text: string; place: string; placeLabel: string }>,
  change: '換一個天氣',
  recentTitle: '最近兩週的天氣',
  recentNote: '這裡只是記得，不是成績。空白的日子也很正常。',
  noEntry: '沒有記錄',
  dayLabel: (date: string, weather: string) => `${date}：${weather}`,
  today: '今天',
  clear: '清除所有天氣紀錄',
  clearConfirm: '確定要清除嗎？清除後無法復原。',
  clearYes: '清除',
  clearNo: '先不要',
  cleared: '已經清除了。',
  privacy: '只存在這支手機，不會上傳。',
} as const;
