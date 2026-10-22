import type { EnergySettings, Pace, RepTarget } from '../../core/types';
import { copy } from '../copy';
import { OptionGroup, type Option } from './OptionGroup';

const TARGETS: readonly RepTarget[] = [null, 6, 8, 10, 12];
const PACES: readonly Pace[] = ['slow', 'gentle', 'brisk'];
const RESTS: readonly EnergySettings['restSeconds'][] = [30, 60, 90, 120, 180];

const targetOptions: Option<RepTarget>[] = TARGETS.map(t => ({ value: t, label: copy.targetOption(t) }));
const paceOptions: Option<Pace>[] = PACES.map(p => ({ value: p, label: copy.paceName[p], detail: copy.paceDetail[p] }));
const restOptions: Option<EnergySettings['restSeconds']>[] = RESTS.map(s => ({ value: s, label: copy.restSeconds(s) }));

type Update = (partial: Partial<EnergySettings>) => void;

export function TargetPicker({ value, update }: { value: RepTarget; update: Update }) {
  return <OptionGroup legend={copy.targetLabel} options={targetOptions} value={value} onChange={target => update({ target })} />;
}

export function PacePicker({ value, update, hint, compact }: { value: Pace; update: Update; hint?: string; compact?: boolean }) {
  return <OptionGroup legend={copy.paceLabel} hint={hint} options={paceOptions} value={value} onChange={pace => update({ pace })} compact={compact} />;
}

export function RestPicker({ value, update, compact }: { value: EnergySettings['restSeconds']; update: Update; compact?: boolean }) {
  return <OptionGroup legend={copy.restLabel} options={restOptions} value={value} onChange={restSeconds => update({ restSeconds })} compact={compact} />;
}
