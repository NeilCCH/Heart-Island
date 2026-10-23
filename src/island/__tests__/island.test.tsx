// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRuntime } from '../../features/energy/tests/fakeRuntime';
import { BANNED_WORDS } from '../../features/energy/ui/copy';
import { IslandApp } from '../IslandApp';
import { TinyScreen } from '../../features/tiny/TinyScreen';
import { tinyCopy } from '../../features/tiny/copy';
import { breathCopy } from '../../features/breath/copy';
import { localDate } from '../../features/tiny/storage';

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k), clear: () => values.clear(), get length() { return values.size; } });
  window.location.hash = '';
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.location.hash = ''; document.documentElement.removeAttribute('data-theme'); });

const heading = () => screen.getByRole('heading', { level: 1 });
function setup() {
  const clock = fakeRuntime();
  render(<StrictMode><IslandApp runtime={clock.runtime} /></StrictMode>);
  return { clock, advance: (ms: number) => act(() => clock.advance(ms)) };
}
// jsdom 不會跟隨 # 連結；改成讀取連結的 href 設定 hash，驗證 hashchange 路徑（實際點擊由 E2E 涵蓋）。
const goTo = (name: string) => act(() => {
  window.location.hash = screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href')!;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
});

describe('心靈小島首頁', () => {
  it('列出五個地方，全部都可以進入', () => {
    setup();
    expect(heading().textContent).toBe('心靈小島');
    for (const name of ['呼吸小宇宙', '今天一點點', '療癒小花園', '萌寵能量站', '萌寵陪伴屋']) expect(screen.getByRole('link', { name: new RegExp(name) })).toBeTruthy();
    expect(screen.queryByText('準備中')).toBeNull();
  });

  it('進入功能後焦點移到標題，「回小島」返回首頁', () => {
    setup();
    goTo('今天一點點');
    expect(heading().textContent).toBe(tinyCopy.title);
    expect(document.activeElement).toBe(heading());
    act(() => { fireEvent.click(screen.getByRole('button', { name: '← 回小島' })); });
    expect(heading().textContent).toBe('心靈小島');
  });

  it('進入萌寵能量站時焦點也移到它的標題', () => {
    setup();
    goTo('萌寵能量站');
    expect(heading().textContent).toBe('萌寵能量站');
    expect(document.activeElement).toBe(heading());
  });

  it('萌寵能量站在小島中可返回，且共用設定（深色主題套用到全島）', () => {
    setup();
    act(() => { fireEvent.click(screen.getByRole('button', { name: '設定' })); });
    act(() => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /深色/ })); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    act(() => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); });
    goTo('萌寵能量站');
    expect(heading().textContent).toBe('萌寵能量站');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    act(() => { fireEvent.click(screen.getByRole('button', { name: '← 回小島' })); });
    expect(heading().textContent).toBe('心靈小島');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('今天一點點', () => {
  const renderTiny = (random = () => 0) => render(<TinyScreen onOpenSettings={() => {}} random={random} />);

  it('做了只回應「好。」，記在今天，不計數', () => {
    renderTiny();
    const first = screen.getByText('喝一口水');
    expect(first).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.done })); });
    expect(screen.getByText(tinyCopy.ack)).toBeTruthy();
    expect(JSON.parse(values.get('tiny.today.v1')!)).toEqual({ date: localDate(), texts: ['喝一口水'] });
    expect(screen.getByText(tinyCopy.todayTitle)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d+\s*(件|天|次)/);
  });

  it('換一張不重複剛出現的；可跳過不需理由', () => {
    renderTiny();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.another })); });
    expect(screen.queryByText('喝一口水')).toBeNull();
    expect(screen.getByText('慢慢轉動肩膀三圈')).toBeTruthy();
  });

  it('畫面開著跨過午夜，「今天做過的」自動清空', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 22, 23, 59, 30));
    renderTiny();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.done })); });
    expect(screen.getByText(tinyCopy.todayTitle)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.queryByText(tinyCopy.todayTitle)).toBeNull();
    vi.useRealTimers();
  });

  it('本機無法保存時，連續做了兩件都還在今天的清單上', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem: () => {}, clear: () => {}, length: 0 });
    renderTiny();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.done })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.oneMore })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.done })); });
    const items = within(screen.getByText(tinyCopy.todayTitle).closest('details')!).getAllByRole('listitem').map(li => li.textContent);
    expect(items).toEqual(['喝一口水', '慢慢轉動肩膀三圈']);
  });

  it('昨天的紀錄不顯示', () => {
    values.set('tiny.today.v1', JSON.stringify({ date: '2000-01-01', texts: ['看看窗外'] }));
    renderTiny();
    expect(screen.queryByText(tinyCopy.todayTitle)).toBeNull();
  });

  it('自己挑、新增與刪除自己的小事', () => {
    renderTiny();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.choose })); });
    act(() => { fireEvent.change(screen.getByLabelText(tinyCopy.addLabel), { target: { value: '泡一杯熱茶' } }); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.add })); });
    expect(JSON.parse(values.get('tiny.mine.v1')!)[0].text).toBe('泡一杯熱茶');
    act(() => { fireEvent.click(screen.getByRole('button', { name: '泡一杯熱茶' })); });
    expect(screen.getByText('我自己的')).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.choose })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: tinyCopy.remove('泡一杯熱茶') })); });
    expect(JSON.parse(values.get('tiny.mine.v1')!)).toEqual([]);
  });
});

describe('呼吸小宇宙', () => {
  it('進來就開始；光球依時間吸吐，沒有次數', () => {
    const { advance } = setup();
    goTo('呼吸小宇宙');
    expect(heading().textContent).toBe(breathCopy.title);
    expect(screen.getByText(breathCopy.inhale)).toBeTruthy();
    advance(4100);
    expect(screen.getByText(breathCopy.exhale)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/已引導|次數/);
  });

  it('暫停時光球停住；背景回來維持暫停，需手動繼續', () => {
    const { clock, advance } = setup();
    goTo('呼吸小宇宙');
    act(() => { fireEvent.click(screen.getByRole('button', { name: breathCopy.pause })); });
    advance(4100);
    expect(screen.getByText(breathCopy.inhale)).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: breathCopy.resume })); });
    act(() => clock.visibility(true)); advance(60000); act(() => clock.visibility(false));
    expect(screen.getByText(breathCopy.pausedHidden)).toBeTruthy();
    expect(screen.getByRole('button', { name: breathCopy.resume })).toBeTruthy();
  });

  it('未選擇記住偏好時不載入殘留的呼吸設定，並把它刪除', () => {
    values.set('breath.prefs.v1', JSON.stringify({ pace: 14, ratio: 'longExhale', showText: false }));
    setup();
    expect(values.has('breath.prefs.v1')).toBe(false);
    goTo('呼吸小宇宙');
    act(() => { fireEvent.click(screen.getByRole('button', { name: breathCopy.adjust })); });
    expect(screen.getByText('每次 8 秒')).toBeTruthy();
  });

  it('記住偏好時保存呼吸設定；清除已保存的偏好會一併刪除', () => {
    values.set('energy.settings.v1', JSON.stringify({ version: 1, settings: {} }));
    values.set('breath.prefs.v1', JSON.stringify({ pace: 12, ratio: 'even', showText: true }));
    setup();
    goTo('呼吸小宇宙');
    act(() => { fireEvent.click(screen.getByRole('button', { name: breathCopy.adjust })); });
    expect(screen.getByText('每次 12 秒')).toBeTruthy();
    act(() => { fireEvent.click(screen.getByRole('button', { name: '設定' })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: '清除已保存的偏好' })); });
    expect(values.has('breath.prefs.v1')).toBe(false);
  });

  it('調整速度與比例；背景音預設關閉且不建立 AudioContext', () => {
    const ctor = vi.fn(); vi.stubGlobal('AudioContext', ctor);
    setup();
    goTo('呼吸小宇宙');
    act(() => { fireEvent.click(screen.getByRole('button', { name: breathCopy.adjust })); });
    act(() => { fireEvent.change(screen.getByRole('slider', { name: breathCopy.paceLabel }), { target: { value: '10' } }); });
    act(() => { fireEvent.click(screen.getByRole('radio', { name: breathCopy.ratioLong })); });
    expect(screen.getByText('吸 4 秒・吐 6 秒')).toBeTruthy();
    expect((screen.getByRole('switch', { name: breathCopy.ambient }) as HTMLInputElement).checked).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });
});

it('新功能文案沒有壓力或誤導字詞', () => {
  const all = [JSON.stringify(tinyCopy), JSON.stringify(breathCopy)].join('\n');
  for (const word of BANNED_WORDS) expect(all).not.toContain(word);
});
