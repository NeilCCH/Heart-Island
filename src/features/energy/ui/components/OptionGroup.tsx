import { useId } from 'react';

export interface Option<T> { value: T; label: string; detail?: string }

// 原生 radio：方向鍵切換、螢幕閱讀器可辨識，選取狀態不只靠顏色（有勾選記號）。
export function OptionGroup<T>({ legend, hint, options, value, onChange, compact = false }: {
  legend: string; hint?: string; options: readonly Option<T>[]; value: T;
  onChange: (value: T) => void; compact?: boolean;
}) {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset className={`options${compact ? ' options--compact' : ''}`} aria-describedby={hint ? hintId : undefined}>
      <legend className="options__legend">{legend}</legend>
      {hint && <p id={hintId} className="options__hint">{hint}</p>}
      <div className="options__row">
        {options.map(option => (
          <label key={String(option.value)} className="option">
            <input type="radio" name={name} checked={option.value === value} onChange={() => onChange(option.value)} />
            <span className="option__face">
              <span className="option__label">{option.label}</span>
              {option.detail && <span className="option__detail">{option.detail}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
