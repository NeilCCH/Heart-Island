// 進度條不放在 live region，避免每次更新都被播報。
export function ProgressBar({ ratio, label }: { ratio: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
      <div className="progress__fill" style={{ transform: `scaleX(${clamped})` }} />
    </div>
  );
}
