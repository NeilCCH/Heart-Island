import { useId } from 'react';
import type { EnergySettings, Pace, RepTarget } from '../../core/types';
import { PACE_MAX, PACE_MIN } from '../../core/machine';
import { copy } from '../copy';
import { OptionGroup, type Option } from './OptionGroup';

const TARGETS: readonly RepTarget[] = [null, 6, 8, 10, 12];
const RESTS: readonly EnergySettings['restSeconds'][] = [30, 60, 90, 120, 180];

const targetOptions: Option<RepTarget>[] = TARGETS.map(t => ({ value: t, label: copy.targetOption(t) }));
const restOptions: Option<EnergySettings['restSeconds']>[] = RESTS.map(s => ({ value: s, label: copy.restSeconds(s) }));

type Update = (partial: Partial<EnergySettings>) => void;

export function TargetPicker({ value, update }: { value: RepTarget; update: Update }) {
  return <OptionGroup legend={copy.targetLabel} options={targetOptions} value={value} onChange={target => update({ target })} />;
}

// 條狀滑桿：整數秒，原生 range 支援方向鍵與觸控；aria-valuetext 讀出完整秒數。
export function PacePicker({ value, update, hint = copy.paceHint }: { value: Pace; update: Update; hint?: string }) {
  const id = useId();
  return (
    <div className="pace">
      <div className="pace__head">
        <label htmlFor={id} className="options__legend">{copy.paceLabel}</label>
        <output htmlFor={id} className="pace__value">{copy.paceValue(value)}</output>
      </div>
      <p className="options__hint">{hint}</p>
      <input id={id} className="pace__range" type="range" min={PACE_MIN} max={PACE_MAX} step={1} value={value}
        aria-valuetext={copy.paceSpoken(value)} onChange={event => update({ pace: Number(event.target.value) })} />
      <div className="pace__scale" aria-hidden="true">
        <span>{PACE_MIN} 秒・{copy.paceFast}</span><span>{PACE_MAX} 秒・{copy.paceSlow}</span>
      </div>
      <p className="muted small">{copy.paceSplit(value)}</p>
    </div>
  );
}

export function RestPicker({ value, update, compact }: { value: EnergySettings['restSeconds']; update: Update; compact?: boolean }) {
  return <OptionGroup legend={copy.restLabel} options={restOptions} value={value} onChange={restSeconds => update({ restSeconds })} compact={compact} />;
}
