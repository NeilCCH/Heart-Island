// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRuntime } from '../../tests/fakeRuntime';
import { EnergyStation } from '../EnergyStation';
import { BANNED_WORDS, copy } from '../copy';
import { CAT_SRC } from '../components/CatFigure';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), get length() { return values.size; } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('data-theme'); });

function setup() {
  const clock = fakeRuntime();
  const view = render(<StrictMode><EnergyStation runtime={clock.runtime} /></StrictMode>);
  const advance = (ms: number) => act(() => clock.advance(ms));
  const click = (name: string | RegExp) => act(() => { fireEvent.click(screen.getByRole('button', { name })); });
  const choose = (group: string, label: string) => act(() => {
    fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('radio', { name: new RegExp(label) }));
  });
  const setPace = (seconds: number) => act(() => {
    fireEvent.change(screen.getByRole('slider', { name: copy.paceLabel }), { target: { value: String(seconds) } });
  });
  return { clock, view, advance, click, choose, setPace };
}
const heading = () => screen.getByRole('heading', { level: 1 });
const announcer = () => screen.getByTestId('announcer').textContent?.replace(/​/g, '');

describe('小貓能量站 UI', () => {
  it('首頁有安全說明、示範標示、次數語意及原始小貓素材', () => {
    setup();
    expect(heading().textContent).toBe(copy.title);
    expect(screen.getByText(copy.safety)).toBeTruthy();
    expect(screen.getByText(copy.demoLabel)).toBeTruthy();
    expect(screen.getByText(copy.countNote)).toBeTruthy();
    const img = screen.getByRole('img', { name: copy.catAlt }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(CAT_SRC);
    expect(document.querySelectorAll('img')).toHaveLength(1);
  });

  it('完整循環才加1，半循環不加；換畫面焦點移到標題', () => {
    const { advance, click } = setup();
    click(copy.start);
    expect(heading().textContent).toBe('第 1 組');
    expect(document.activeElement).toBe(heading());
    expect(screen.getByText(copy.phase.exhaleLift)).toBeTruthy();
    advance(3000);
    expect(screen.getByText(copy.phase.inhaleLower)).toBeTruthy();
    expect(screen.getByText('已引導 0 次')).toBeTruthy();
    advance(2999);
    expect(screen.getByText('已引導 0 次')).toBeTruthy();
    advance(1);
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
    expect(announcer()).toBe('已引導 1 次，吐氣舉起');
  });

  it('暫停20秒不加次數，須手動繼續', () => {
    const { advance, click } = setup();
    click(copy.start); advance(2000);
    click(copy.pause);
    expect(screen.getByText(copy.pausedUser)).toBeTruthy();
    advance(20000);
    expect(screen.getByText('已引導 0 次')).toBeTruthy();
    click(copy.resume); advance(4000);
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
  });

  it('背景60秒回來維持暫停、次數不變、不自動恢復', () => {
    const { clock, advance, click } = setup();
    click(copy.start); advance(6000);
    act(() => clock.visibility(true)); advance(60000); act(() => clock.visibility(false)); advance(5000);
    expect(screen.getByText(copy.pausedHidden)).toBeTruthy();
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.resume })).toBeTruthy();
  });

  it('達目標只到完成畫面，不自動下一組；結束本組不計半循環', () => {
    const { advance, click, choose, setPace } = setup();
    choose(copy.targetLabel, '^6$');
    setPace(4);
    click(copy.start); advance(4000 * 6);
    expect(heading().textContent).toBe(copy.completeTitle);
    expect(screen.getByText('已引導 6 次')).toBeTruthy();
    advance(30000);
    expect(heading().textContent).toBe(copy.completeTitle);
    click(copy.nextSet); advance(4000 + 2000);
    click(copy.finishSet);
    expect(screen.getByText('第 2 組')).toBeTruthy();
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
  });

  it('不限模式不自動結束', () => {
    const { advance, click, choose, setPace } = setup();
    choose(copy.targetLabel, '不限'); setPace(4);
    click(copy.start); advance(4000 * 15);
    expect(screen.getByText('已引導 15 次')).toBeTruthy();
    expect(screen.getByText('不限次數')).toBeTruthy();
  });

  it('引導中拖動節奏滑桿：本循環不變，下一循環生效', () => {
    const { advance, click, setPace } = setup();
    click(copy.start); advance(1000);
    setPace(10);
    expect(screen.getByText(copy.pendingPace(10))).toBeTruthy();
    expect(screen.getByRole('slider', { name: copy.paceLabel }).getAttribute('aria-valuetext')).toBe('每次 10 秒，吐氣 5 秒、吸氣 5 秒');
    advance(5000);
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
    expect(screen.queryByText(copy.pendingPace(10))).toBeNull();
    advance(9999);
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
    advance(1);
    expect(screen.getByText('已引導 2 次')).toBeTruthy();
  });

  it('首頁節奏滑桿可選任意整數秒，奇數秒顯示半秒', () => {
    const { setPace } = setup();
    setPace(7);
    expect(screen.getByText('每次 7 秒')).toBeTruthy();
    expect(screen.getByText('吐氣舉起 3.5 秒・吸氣放下 3.5 秒')).toBeTruthy();
  });

  it('休息：暫停、+30秒、到期只提示，不自動開始下一組', () => {
    const { advance, click, choose } = setup();
    click(copy.start); click(copy.finishSet);
    choose(copy.restLabel, '30 秒');
    click(copy.rest(30));
    expect(heading().textContent).toBe(copy.restTitle);
    expect(screen.getByRole('timer').textContent).toBe('0:30');
    advance(10000);
    click(copy.pause); advance(20000);
    expect(screen.getByRole('timer').textContent).toBe('0:20');
    click(copy.resume); click(copy.extendRest);
    expect(screen.getByRole('timer').textContent).toBe('0:50');
    advance(50000);
    expect(heading().textContent).toBe(copy.readyTitle);
    expect(announcer()).toBe(copy.announce.restFinished);
    advance(120000);
    expect(heading().textContent).toBe(copy.readyTitle);
    click(copy.restAgain);
    click(copy.skipRest);
    expect(heading().textContent).toBe(copy.readyTitle);
    click(copy.nextSet);
    expect(heading().textContent).toBe('第 2 組');
  });

  it('休息中背景回來保持暫停', () => {
    const { clock, advance, click } = setup();
    click(copy.start); click(copy.finishSet); click(copy.rest(90));
    advance(1000); act(() => clock.visibility(true)); advance(60000); act(() => clock.visibility(false));
    expect(screen.getByText(copy.restPausedHidden)).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('1:29');
  });

  it('離開回首頁並清空當次資料', () => {
    const { advance, click } = setup();
    click(copy.start); advance(6000); click(copy.exit);
    expect(heading().textContent).toBe(copy.title);
    click(copy.start);
    expect(screen.getByText('已引導 0 次')).toBeTruthy();
  });

  it('空白鍵暫停／繼續（焦點不在按鈕上）', () => {
    const { click } = setup();
    click(copy.start);
    act(() => { fireEvent.keyDown(document.body, { key: ' ', code: 'Space' }); });
    expect(screen.getByText(copy.pausedUser)).toBeTruthy();
    act(() => { fireEvent.keyDown(document.body, { key: ' ', code: 'Space' }); });
    expect(screen.queryByText(copy.pausedUser)).toBeNull();
  });

  it('設定：焦點移入、Esc關閉並回到開啟按鈕、主題寫入data-theme、不中斷引導', () => {
    const { advance, click } = setup();
    click(copy.start);
    const opener = screen.getByRole('button', { name: copy.settings });
    act(() => { opener.focus(); fireEvent.click(opener); });
    const dialog = screen.getByRole('dialog', { name: copy.settingsTitle });
    expect(dialog.contains(document.activeElement)).toBe(true);
    act(() => { fireEvent.click(within(dialog).getByRole('radio', { name: /深色/ })); });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    advance(6000);
    act(() => { fireEvent.keyDown(dialog, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: copy.settings }));
    expect(screen.getByText('已引導 1 次')).toBeTruthy();
  });

  it('記住偏好預設關閉；開啟後才寫入，清除後關閉', () => {
    const { click } = setup();
    click(copy.settings);
    const remember = screen.getByRole('switch', { name: copy.rememberLabel }) as HTMLInputElement;
    expect(remember.checked).toBe(false);
    expect(localStorage.length).toBe(0);
    act(() => { fireEvent.click(remember); });
    expect(localStorage.length).toBe(1);
    click(copy.clearSaved);
    expect(localStorage.length).toBe(0);
    expect((screen.getByRole('switch', { name: copy.rememberLabel }) as HTMLInputElement).checked).toBe(false);
  });

  it('聲音預設關閉，未授權時不建立 AudioContext，核心流程完整可用', () => {
    const ctor = vi.fn();
    vi.stubGlobal('AudioContext', ctor);
    const { advance, click } = setup();
    click(copy.start); advance(6000); click(copy.finishSet);
    expect(ctor).not.toHaveBeenCalled();
    expect(heading().textContent).toBe(copy.completeTitle);
  });

  it('所有畫面文案沒有壓力或誤導字詞', () => {
    const { advance, click } = setup();
    const texts: string[] = [document.body.textContent ?? ''];
    click(copy.start); advance(3000); texts.push(document.body.textContent ?? '');
    click(copy.pause); texts.push(document.body.textContent ?? '');
    click(copy.finishSet); texts.push(document.body.textContent ?? '');
    click(copy.rest(90)); texts.push(document.body.textContent ?? '');
    click(copy.skipRest); texts.push(document.body.textContent ?? '');
    click(copy.settings); texts.push(document.body.textContent ?? '');
    const all = texts.join('\n');
    for (const word of BANNED_WORDS) expect(all).not.toContain(word);
    expect(all).toContain('已引導');
  });
});
