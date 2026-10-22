// 「今天一點點」活動清單：極小、立刻可做、做不做都可以。
// 用語避免命令與正向思考壓力；建議日後請心理專業人員審閱一次。
export type Category = 'body' | 'senses' | 'space' | 'sound' | 'rest' | 'connect';
export interface Activity { id: string; text: string; category: Category | 'mine' }

export const CATEGORY_NAME: Record<Activity['category'], string> = {
  body: '身體', senses: '感官', space: '環境', sound: '聲音', rest: '休息', connect: '連結', mine: '我自己的',
};

const list: [Category, string][] = [
  ['body', '喝一口水'], ['body', '慢慢轉動肩膀三圈'], ['body', '伸展一下手臂'], ['body', '動一動腳趾'],
  ['body', '把雙腳平放在地上，感覺一下地板'], ['body', '洗洗手，感受水的溫度'], ['body', '站起來走幾步'],
  ['body', '換一個舒服一點的姿勢'], ['body', '鬆開咬緊的牙齒'], ['body', '輕輕揉一揉手掌'],
  ['senses', '看看窗外'], ['senses', '找一樣藍色的東西'], ['senses', '摸摸身邊柔軟的東西'],
  ['senses', '聞一聞茶或咖啡的味道'], ['senses', '看看天空現在的顏色'], ['senses', '聽聽看，此刻有哪三種聲音'],
  ['senses', '吃一小口喜歡的東西'], ['senses', '看一張喜歡的照片'],
  ['space', '把窗戶打開一點點'], ['space', '把燈調亮或調暗一點'], ['space', '收起桌上的一樣東西'],
  ['space', '拉開窗簾'], ['space', '幫植物澆一點水'], ['space', '把手機亮度調低一點'], ['space', '拍鬆一下枕頭'],
  ['sound', '聽一首歌'], ['sound', '聽一段雨聲或海浪聲'], ['sound', '哼幾句喜歡的旋律'],
  ['sound', '安靜坐著，聽一分鐘'], ['sound', '播一首以前常聽的歌'],
  ['rest', '閉上眼睛，休息一下'], ['rest', '什麼都不做，坐一會兒'], ['rest', '躺下來看看天花板'],
  ['rest', '慢慢眨幾次眼睛'], ['rest', '用溫毛巾敷一下眼睛'], ['rest', '把肩膀放下來'],
  ['connect', '摸摸身邊的寵物'], ['connect', '傳一個貼圖給認識的人'], ['connect', '看一段可愛動物的影片'],
  ['connect', '寫下一個字，不用給誰看'], ['connect', '看看以前的合照'],
];

export const ACTIVITIES: readonly Activity[] = list.map(([category, text], index) => ({ id: `a${index + 1}`, category, text }));
