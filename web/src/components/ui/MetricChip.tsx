type Props = { label: string; value: string; color?: string };

export function MetricChip({ label, value, color = 'var(--fg)' }: Props) {
  return (
    <div
      className="px-2.5 py-2"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div className="font-mono text-[9px] text-muted tracking-wider">{label}</div>
      <div
        className="font-mono leading-tight mt-0.5"
        style={{ fontSize: 18, fontWeight: 500, color }}
      >
        {value}
      </div>
    </div>
  );
}
