import type { Pace, Phase, RepTarget } from '../core/types';

// 所有繁中文案集中於此，方便審稿與禁用字詞測試（ACCEPTANCE T16）。
export const copy = {
  title: '小貓能量站',
  intro: '看著小貓，跟著柔和的節奏，把注意力放在呼吸和動作上，讓心情換個地方休息一下。',
  demoLabel: '示範：啞鈴彎舉／一般輕量動作',
  safety: '不需要勉強跟上；感到頭暈、胸痛、呼吸困難或明顯不適時，請停止並尋求適當協助。',
  safetyExtra: '節奏只供參考，不是醫療或運動處方；請以舒適呼吸與正確動作為先，不用一直盯著螢幕。',
  countNote: '這裡記的是「引導播放了幾次」，不是你實際做了幾下。我沒有跟上也沒關係。',
  targetLabel: '每組引導次數',
  paceLabel: '引導節奏',
  restLabel: '組間休息',
  start: '開始引導',
  settings: '設定',
  backToIsland: '← 回小島',
  phase: {
    exhaleLift: '自然吐氣・慢慢舉起',
    inhaleLower: '自然吸氣・慢慢放下',
  } satisfies Record<Phase, string>,
  phaseShort: {
    exhaleLift: '吐氣舉起',
    inhaleLower: '吸氣放下',
  } satisfies Record<Phase, string>,
  paceHint: '拖動調整每次引導的秒數；數字越大越慢。',
  paceValue: (p: Pace) => `每次 ${p} 秒`,
  paceSplit: (p: Pace) => `吐氣舉起 ${half(p)} 秒・吸氣放下 ${half(p)} 秒`,
  paceSpoken: (p: Pace) => `每次 ${p} 秒，吐氣 ${half(p)} 秒、吸氣 ${half(p)} 秒`,
  paceFast: '稍快',
  paceSlow: '較慢',
  setIndex: (n: number) => `第 ${n} 組`,
  guided: (n: number) => `已引導 ${n} 次`,
  targetOf: (t: RepTarget) => (t === null ? '不限次數' : `目標 ${t} 次`),
  targetOption: (t: RepTarget) => (t === null ? '不限' : `${t}`),
  pendingPace: (p: Pace) => `下一個循環起改為每次 ${p} 秒`,
  phaseRemaining: (s: number) => `這一段還有 ${s} 秒`,
  pausedUser: '已暫停。準備好再按「繼續」。',
  pausedHidden: '剛剛離開了畫面，已幫你暫停。準備好再按「繼續」。',
  pause: '暫停',
  resume: '繼續',
  finishSet: '結束本組',
  exit: '離開',
  completeTitle: '本組引導結束',
  completeBody: '這一組的引導到這裡。可以休息，也可以結束。',
  rest: (s: number) => `休息 ${s} 秒`,
  nextSet: '下一組',
  restTitle: '組間休息',
  restBody: '放鬆肩膀，自然呼吸。',
  restPausedHidden: '剛剛離開了畫面，休息倒數已暫停。準備好再按「繼續」。',
  restPausedUser: '休息倒數已暫停。',
  extendRest: '+30 秒',
  skipRest: '略過',
  readyTitle: '休息時間到了',
  readyBody: '準備好時，再按「下一組」。也可以再休息一下。',
  restAgain: '再休息',
  restSeconds: (s: number) => `${s} 秒`,
  announce: {
    setComplete: (n: number) => `這一組的引導到這裡，已引導 ${n} 次`,
    paused: '已暫停',
    restFinished: '休息時間到了',
  },
  wakeLockUnavailable: '這個瀏覽器無法保持螢幕常亮；螢幕自動鎖定時，引導會先暫停。',
  settingsTitle: '設定',
  close: '關閉',
  soundLabel: '柔和提示音',
  soundHint: '預設關閉。開啟後，只在畫面前景播放柔和音，沒有語音。',
  volumeLabel: '音量',
  testSound: '試聽',
  reducedMotionLabel: '減少動態',
  reducedMotionSystem: '系統已開啟「減少動態」，本功能會跟著使用。',
  themeLabel: '主題',
  themeName: { system: '跟隨系統', light: '淺色', dark: '深色' },
  rememberLabel: '記住我的偏好（只存在這台裝置）',
  rememberHint: '只保存設定，不保存任何訓練紀錄。',
  clearSaved: '清除已保存的偏好',
  resetDefaults: '恢復預設值',
  privacy: '不需登入，不蒐集健康資料，也沒有任何追蹤。',
  catAlt: '橘色虎斑小貓（靜態圖片）',
} as const;

function half(p: Pace) { return Number.isInteger(p / 2) ? String(p / 2) : (p / 2).toFixed(1); }

// 不得出現在介面上的壓力或誤導字詞（PRD §7、§1）。
export const BANNED_WORDS = ['失敗', '落後', '必須完成', '獎章', '分數', '排名', '打卡', '偵測到', '實際完成'];

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatClockSpoken(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}
