import { useRef, type InputHTMLAttributes, type PointerEvent as ReactPointerEvent } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'> & {
  min: number; max: number; step: number; value: number; onValue: (value: number) => void;
  // 兩側的 −／+ 按鈕（一次一格），手指不好拖時也能精準調整
  steps?: { less: string; more: string; lessLabel: string; moreLabel: string };
};

// 原生 range 保留鍵盤與螢幕閱讀器操作；手指操作另外處理：
// 手機上原生滑桿常要剛好按住小圓點才拖得動（iPhone 點軌道沒有反應），左右拖還會被當成「滑動換頁」。
// 這裡改成手指按在軌道任何位置就跳到該值，並跟著手指移動；touch-action: pan-y 讓上下捲動照常。
export function TouchRange({ min, max, step, value, onValue, steps, className = '', ...rest }: Props) {
  const pointer = useRef<number | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => Number(clamp(min + Math.round((v - min) / step) * step).toFixed(4));
  const fromX = (input: HTMLInputElement, clientX: number) => {
    const rect = input.getBoundingClientRect();
    const thumb = Math.min(28, rect.width / 4);
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - thumb / 2) / Math.max(1, rect.width - thumb)));
    return snap(min + ratio * (max - min));
  };
  const follow = (event: ReactPointerEvent<HTMLInputElement>) => {
    const next = fromX(event.currentTarget, event.clientX);
    if (next !== value) onValue(next);
  };

  const range = (
    <input {...rest} type="range" className={`touch-range ${className}`} min={min} max={max} step={step} value={value}
      onChange={event => onValue(Number(event.target.value))}
      onPointerDown={event => {
        if (event.pointerType === 'mouse' || rest.disabled) return;
        event.preventDefault();
        event.currentTarget.focus();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        follow(event);
      }}
      onPointerMove={event => { if (pointer.current === event.pointerId) follow(event); }}
      onPointerUp={event => { if (pointer.current === event.pointerId) pointer.current = null; }}
      onPointerCancel={event => { if (pointer.current === event.pointerId) pointer.current = null; }} />
  );
  if (!steps) return range;
  return (
    <div className="touch-range__row">
      <button type="button" className="btn btn--small touch-range__step" aria-label={steps.lessLabel}
        disabled={rest.disabled || value <= min} onClick={() => onValue(snap(value - step))}>{steps.less}</button>
      {range}
      <button type="button" className="btn btn--small touch-range__step" aria-label={steps.moreLabel}
        disabled={rest.disabled || value >= max} onClick={() => onValue(snap(value + step))}>{steps.more}</button>
    </div>
  );
}
