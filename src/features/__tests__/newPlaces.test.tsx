// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNED_WORDS } from '../energy/ui/copy';
import { MoodScreen } from '../mood/MoodScreen';
import { moodCopy } from '../mood/copy';
import { lastDays, loadDays } from '../mood/storage';
import { JarScreen } from '../jar/JarScreen';
import { jarCopy } from '../jar/copy';
import { loadNotes } from '../jar/storage';
import { GroundScreen } from '../ground/GroundScreen';
import { groundCopy } from '../ground/copy';
import { SoundsScreen } from '../sounds/SoundsScreen';
import { soundsCopy } from '../sounds/copy';
import { NightScreen } from '../night/NightScreen';
import { nightCopy } from '../night/copy';
import { localDate } from '../tiny/storage';

let values: Map<string, string>;
let started: number; let stopped: number; let targets: number[];

// 最小的假 Web Audio：記錄開始與停止了幾個聲音來源。
function fakeAudio() {
  const param = () => ({ value: 0, setTargetAtTime(v: number) { targets.push(v); }, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), Q: param(), type: '' });
  const source = () => ({ ...node(), buffer: null, loop: false, loopStart: 0, loopEnd: 0, start() { started++; }, stop() { stopped++; } });
  return class {
    sampleRate = 4000; currentTime = 0; state = 'running'; destination = {};
    resume() { return Promise.resolve(); } close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() { return node(); } createBiquadFilter() { return node(); }
    createOscillator() { return source(); } createBufferSource() { return source(); }
    createBuffer(_c: number, length: number) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  };
}

beforeEach(() => {
  values = new Map(); started = 0; stopped = 0; targets = [];
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k), clear: () => values.clear(), get length() { return values.size; } });
  vi.stubGlobal('AudioContext', fakeAudio());
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('心情小天氣', () => {
  it('選一個天氣：存在本機、顯示一句話與可以去的地方，回來時還記得', () => {
    render(<MoodScreen onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /下雨/ }));
    expect(loadDays()[localDate()]).toBe('rain');
    expect(screen.getByText(moodCopy.reply.rain.text)).toBeTruthy();
    expect(screen.getByRole('link', { name: moodCopy.reply.rain.placeLabel }).getAttribute('href')).toBe('#breath');
    expect(screen.getByText(`${moodCopy.today}：下雨`)).toBeTruthy();
    cleanup();
    render(<MoodScreen onOpenSettings={() => {}} />);
    expect(screen.getByText(moodCopy.reply.rain.text)).toBeTruthy();
  });

  it('可以換天氣，也可以在確認後清除全部紀錄', () => {
    render(<MoodScreen onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /晴朗/ }));
    fireEvent.click(screen.getByRole('button', { name: moodCopy.change }));
    fireEvent.click(screen.getByRole('button', { name: /起霧/ }));
    expect(loadDays()[localDate()]).toBe('fog');
    fireEvent.click(screen.getByRole('button', { name: moodCopy.clear }));
    fireEvent.click(screen.getByRole('button', { name: moodCopy.clearNo }));
    expect(loadDays()[localDate()]).toBe('fog');
    fireEvent.click(screen.getByRole('button', { name: moodCopy.clear }));
    fireEvent.click(screen.getByRole('button', { name: moodCopy.clearYes }));
    expect(loadDays()).toEqual({});
    expect(screen.getByRole('button', { name: /晴朗/ })).toBeTruthy();
  });

  it('最近兩週從舊到新，跨月也正確；壞掉的資料會被忽略', () => {
    const days = lastDays(14, new Date(2026, 2, 5));
    expect(days[0]).toBe('2026-02-20');
    expect(days[13]).toBe('2026-03-05');
    values.set('mood.days.v1', JSON.stringify({ '2026-03-01': 'rain', bad: 'sunny', '2026-03-02': 'tornado' }));
    expect(loadDays()).toEqual({ '2026-03-01': 'rain' });
  });
});

describe('感謝小罐子', () => {
  it('放進紙條、抽一張、拿出來、清空', () => {
    render(<JarScreen onOpenSettings={() => {}} random={() => 0} />);
    expect(screen.getByText(jarCopy.jarLabel(0))).toBeTruthy();
    expect((screen.getByRole('button', { name: jarCopy.draw }) as HTMLButtonElement).disabled).toBe(true);
    const input = screen.getByLabelText(jarCopy.addLabel);
    fireEvent.change(input, { target: { value: '  今天的咖啡很好喝  ' } });
    fireEvent.submit(input.closest('form')!);
    fireEvent.change(input, { target: { value: '朋友傳了訊息' } });
    fireEvent.submit(input.closest('form')!);
    expect(loadNotes().map(n => n.text)).toEqual(['今天的咖啡很好喝', '朋友傳了訊息']);
    expect(screen.getByText(jarCopy.jarLabel(2))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: jarCopy.draw }));
    expect(screen.getByText('今天的咖啡很好喝', { selector: '.jar-note__text' })).toBeTruthy();
    // 再抽一張不會連續抽到同一張
    fireEvent.click(screen.getByRole('button', { name: jarCopy.drawAgain }));
    expect(screen.getByText('朋友傳了訊息', { selector: '.jar-note__text' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: jarCopy.remove('朋友傳了訊息') }));
    expect(loadNotes()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: jarCopy.clear }));
    fireEvent.click(screen.getByRole('button', { name: jarCopy.clearYes }));
    expect(loadNotes()).toEqual([]);
    expect(screen.getByText(jarCopy.jarLabel(0))).toBeTruthy();
  });

  it('空白不會放進去，太長會截斷', () => {
    render(<JarScreen onOpenSettings={() => {}} />);
    const input = screen.getByLabelText(jarCopy.addLabel);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(loadNotes()).toEqual([]);
    fireEvent.change(input, { target: { value: '好'.repeat(80) } });
    fireEvent.submit(input.closest('form')!);
    expect(loadNotes()[0].text).toHaveLength(60);
  });
});

describe('五感著地', () => {
  it('五個步驟依序 5、4、3、2、1，每找到一個點一下；也可以跳過', () => {
    render(<GroundScreen onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: groundCopy.start }));
    for (const [i, step] of groundCopy.steps.entries()) {
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(step.prompt);
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));
      if (i === 2) { fireEvent.click(screen.getByRole('button', { name: groundCopy.skip })); continue; }
      for (let n = 0; n < step.count; n++) fireEvent.click(screen.getByRole('button', { name: groundCopy.found }));
      expect(screen.getByText(groundCopy.foundCount(step.count, step.count))).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: i === 4 ? groundCopy.finish : groundCopy.next }));
    }
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(groundCopy.doneTitle);
    fireEvent.click(screen.getByRole('button', { name: groundCopy.again }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(groundCopy.steps[0].prompt);
  });
});

describe('療癒聲音', () => {
  it('點一下播放、再點一下停止；換聲音會先停掉舊的', () => {
    render(<SoundsScreen initialVolume={0.5} onOpenSettings={() => {}} />);
    const rain = screen.getByRole('button', { name: /雨聲/ });
    fireEvent.click(rain);
    expect(rain.getAttribute('aria-pressed')).toBe('true');
    expect(started).toBeGreaterThan(0);
    expect(document.querySelector('.sounds-status')!.textContent).toBe(soundsCopy.playing('雨聲'));
    fireEvent.click(screen.getByRole('button', { name: /海浪/ }));
    expect(rain.getAttribute('aria-pressed')).toBe('false');
    expect(stopped).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /海浪/ }));
    expect(screen.queryByRole('button', { pressed: true })).toBeNull();
  });

  it('定時關閉：時間到聲音慢慢停下', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 22, 0) });
    render(<SoundsScreen initialVolume={0.5} onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: /15 分鐘/ }));
    fireEvent.click(screen.getByRole('button', { name: /營火/ }));
    expect(screen.getByText(soundsCopy.timerLeft(15))).toBeTruthy();
    act(() => { vi.advanceTimersByTime(15 * 60_000 + 1_000); });
    expect(document.querySelector('.sounds-status')!.textContent).toBe(soundsCopy.ended);
    expect(screen.queryByRole('button', { pressed: true })).toBeNull();
  });

  it('不支援 Web Audio 時告知，不會出錯', () => {
    vi.stubGlobal('AudioContext', undefined);
    render(<SoundsScreen initialVolume={0.5} onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /森林/ }));
    expect(document.querySelector('.sounds-status')!.textContent).toBe(soundsCopy.unsupported);
  });
});

describe('睡前模式', () => {
  it('開始後保持螢幕亮著、萌寵睡著；時間到道晚安並放開螢幕', async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 23, 0) });
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    vi.stubGlobal('navigator', { ...navigator, wakeLock: { request } });
    render(<NightScreen pet="dog" volume={0.5} reducedMotion={false} onOpenSettings={() => {}} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(nightCopy.sleeping('小狗'));
    fireEvent.click(screen.getByRole('radio', { name: /15 分鐘/ }));
    fireEvent.click(screen.getByRole('button', { name: nightCopy.start }));
    await act(async () => { await Promise.resolve(); });
    expect(request).toHaveBeenCalledWith('screen');
    expect(started).toBeGreaterThan(0); // 預設有雨聲
    expect(screen.getByText(nightCopy.inhale)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4_200); });
    expect(screen.getByText(nightCopy.exhale)).toBeTruthy();
    expect(screen.getByText(nightCopy.left(15))).toBeTruthy();
    act(() => { vi.advanceTimersByTime(15 * 60_000); });
    expect(screen.getByText(nightCopy.goodnight)).toBeTruthy();
    expect(release).toHaveBeenCalled();
    expect(stopped).toBeGreaterThan(0);
  });

  it('共用音量為 0 時安靜；進行中調高音量就聽得到', () => {
    const { rerender } = render(<NightScreen pet="cat" volume={0} reducedMotion={false} onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: nightCopy.start }));
    expect(Math.max(...targets)).toBeLessThan(0.001);
    rerender(<NightScreen pet="cat" volume={0.6} reducedMotion={false} onOpenSettings={() => {}} />);
    expect(targets.at(-1)).toBeCloseTo(0.6 * 0.7 * 0.5);
  });

  it('選安靜就不發出聲音；可以提早結束', () => {
    render(<NightScreen pet="cat" volume={0.5} reducedMotion onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: nightCopy.soundOff }));
    fireEvent.click(screen.getByRole('button', { name: nightCopy.start }));
    expect(started).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: nightCopy.end }));
    expect(screen.getByRole('button', { name: nightCopy.start })).toBeTruthy();
  });
});

it('新地方的文案沒有評價或治療的字眼', () => {
  const all = JSON.stringify([moodCopy, jarCopy, groundCopy, soundsCopy, nightCopy]);
  for (const word of [...BANNED_WORDS, '治癒', '療效', '診斷']) expect(all).not.toContain(word);
});
