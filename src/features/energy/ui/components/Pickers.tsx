import { useId } from 'react';
import type { EnergySettings, Pace, Pet, RepTarget } from '../../core/types';
import { PACE_MAX, PACE_MIN } from '../../core/machine';
import { copy } from '../copy';
import { OptionGroup, type Option } from './OptionGroup';
import { TouchRange } from './TouchRange';

const TARGETS: readonly RepTarget[] = [null, 6, 8, 10, 12];
const RESTS: readonly EnergySettings['restSeconds'][] = [30, 60, 90, 120, 180];

const targetOptions: Option<RepTarget>[] = TARGETS.map(t => ({ value: t, label: copy.targetOption(t) }));
const restOptions: Option<EnergySettings['restSeconds']>[] = RESTS.map(s => ({ value: s, label: copy.restSeconds(s) }));

const PETS: readonly Pet[] = ['cat', 'dog'];
const petOptions: Option<Pet>[] = PETS.map(p => ({ value: p, label: copy.petName[p] }));

type Update = (partial: Partial<EnergySettings>) => void;

export function TargetPicker({ value, update }: { value: RepTarget; update: Update }) {
  return <OptionGroup legend={copy.targetLabel} options={targetOptions} value={value} onChange={target => update({ target })} />;
}

// 條狀滑桿：整數秒，原生 range 支援方向鍵；手指可按在軌道任何位置拖動，兩側另有 −1／+1 秒按鈕。
export function PacePicker({ value, update, hint = copy.paceHint }: { value: Pace; update: Update; hint?: string }) {
  const id = useId();
  return (
    <div className="pace">
      <div className="pace__head">
        <label htmlFor={id} className="options__legend">{copy.paceLabel}</label>
        <output htmlFor={id} className="pace__value">{copy.paceValue(value)}</output>
      </div>
      <p className="options__hint">{hint}</p>
      <TouchRange id={id} className="pace__range" min={PACE_MIN} max={PACE_MAX} step={1} value={value}
        aria-valuetext={copy.paceSpoken(value)} onValue={pace => update({ pace })} steps={copy.paceSteps} />
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

export function PetPicker({ value, update }: { value: Pet; update: Update }) {
  return <OptionGroup legend={copy.petLabel} options={petOptions} value={value} onChange={pet => update({ pet })} compact />;
}
