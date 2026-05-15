import { ReactNode } from 'react';

type Tone = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

const TONE_COLOR: Record<Tone, string> = {
  ok: '#4ade80',
  warn: '#fbbf24',
  crit: '#f87171',
  info: '#60a5fa',
  neutral: 'var(--fg)',
};

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  right?: ReactNode;
  children?: ReactNode;
};

export function KPI({ label, value, sub, tone = 'neutral', right, children }: Props) {
  const color = TONE_COLOR[tone];
  return (
    <div className="relative overflow-hidden bg-panel border border-border rounded-[2px] px-3.5 py-3">
      <span
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: color }}
      />
      <div className="flex justify-between items-start">
        <div className="font-mono text-2xs text-muted tracking-wider uppercase mb-1.5">
          {label}
        </div>
        {right}
      </div>
      <div
        className="font-mono leading-none"
        style={{ color, fontSize: 24, fontWeight: 500 }}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-2xs text-muted mt-1.5">{sub}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
