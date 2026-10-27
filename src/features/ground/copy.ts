export interface GroundStep { sense: string; count: number; prompt: string; examples: string }

export const groundCopy = {
  title: '五感著地',
  intro: '心裡很亂的時候，可以用五種感官，一步一步把注意力帶回身邊。不用說出來，也不用寫下來。',
  start: '開始',
  steps: [
    { sense: '看見', count: 5, prompt: '找找看，身邊有 5 樣看得見的東西', examples: '例如：杯子、窗外的樹、天花板的燈' },
    { sense: '聽到', count: 4, prompt: '靜下來，聽聽看有 4 種聲音', examples: '例如：冷氣聲、遠方的車聲、自己的呼吸' },
    { sense: '摸到', count: 3, prompt: '感覺看看，有 3 樣摸得到的東西', examples: '例如：衣服的布料、腳底的地板、手機的溫度' },
    { sense: '聞到', count: 2, prompt: '聞聞看，有 2 種氣味', examples: '例如：空氣的味道、手上的香皂；聞不到也沒關係' },
    { sense: '嚐到', count: 1, prompt: '留意嘴裡，有 1 種味道', examples: '例如：剛喝的水、牙膏的味道；喝一口水也可以' },
  ] satisfies GroundStep[],
  stepOf: (n: number, total: number) => `第 ${n} 步，共 ${total} 步`,
  found: '找到一個',
  foundCount: (n: number, total: number) => `已經找到 ${n} 個，共 ${total} 個`,
  next: '下一步',
  skip: '這一步先跳過',
  finish: '完成',
  doneTitle: '你回到這裡了。',
  doneText: '剛剛的你，好好地看了、聽了、摸了。現在可以慢慢地呼吸一下。',
  again: '再做一次',
  toBreath: '去呼吸小宇宙',
  note: '這是讓注意力回到當下的小練習，不是治療。如果很難受，請找信任的人或專業人員聊聊。',
} as const;
