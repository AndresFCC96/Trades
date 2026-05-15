import { ReactNode } from 'react';

type Props = { label: string; value: ReactNode; accent?: boolean };

export function SummaryStat({ label, value, accent }: Props) {
  return (
    <div>
      <div className="font-mono text-[9px] text-muted tracking-wider">{label}</div>
      <div
        className="font-mono mt-0.5"
        style={{ fontSize: 22, color: accent ? '#4ade80' : 'var(--fg)' }}
      >
        {value}
      </div>
    </div>
  );
}
