import { fmt } from '@/lib/fmt';

type Tone = 'crit' | 'warn' | 'ok';
const COLOR: Record<Tone, string> = { crit: '#f87171', warn: '#fbbf24', ok: '#4ade80' };

type Props = { tone: Tone; label: string; count: number; pct: number };

export function RiskCard({ tone, label, count, pct }: Props) {
  const color = COLOR[tone];
  return (
    <div
      className="bg-panel p-4"
      style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}
    >
      <div
        className="font-mono mb-1.5"
        style={{ fontSize: 10, color, letterSpacing: 1 }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-fg" style={{ fontSize: 32 }}>
          {fmt.num(count)}
        </span>
        <span className="font-mono" style={{ fontSize: 14, color }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2.5 h-1 bg-border">
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}
