import { fmt } from '@/lib/fmt';

type Item = { label: string; value: number };

type Props = { data: Item[]; colors?: string[] };

const DEFAULT_COLORS = ['#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171', '#34d399', '#fb923c'];

export function DonutChart({ data, colors = DEFAULT_COLORS }: Props) {
  // Tolerate empty data / zero totals so an empty business report
  // doesn't crash with `Cannot read 'toFixed' of undefined` further down.
  if (data.length === 0) {
    return (
      <div className="py-6 text-center font-mono text-sm text-muted">— EMPTY —</div>
    );
  }
  const total = data.reduce((a, b) => a + (b.value ?? 0), 0) || 1;
  let acc = 0;
  const r = 70,
    R = 90;
  const segs = data.map((d, i) => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += d.value;
    const a1 = (acc / total) * 2 * Math.PI;
    const x0 = 100 + R * Math.sin(a0),
      y0 = 100 - R * Math.cos(a0);
    const x1 = 100 + R * Math.sin(a1),
      y1 = 100 - R * Math.cos(a1);
    const x2 = 100 + r * Math.sin(a1),
      y2 = 100 - r * Math.cos(a1);
    const x3 = 100 + r * Math.sin(a0),
      y3 = 100 - r * Math.cos(a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    return { p, color: colors[i % colors.length], d };
  });
  return (
    <div className="grid items-center gap-4" style={{ gridTemplateColumns: '200px 1fr' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {segs.map((s, i) => (
          <path key={i} d={s.p} fill={s.color} />
        ))}
        <text
          x="100"
          y="100"
          textAnchor="middle"
          style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, fill: 'var(--fg)' }}
        >
          {fmt.usd(total)}
        </text>
        <text
          x="100"
          y="116"
          textAnchor="middle"
          style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: 'var(--muted)' }}
        >
          TOTAL
        </text>
      </svg>
      <div className="flex flex-col gap-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="grid items-center font-mono text-xs"
            style={{ gridTemplateColumns: '12px 1fr 60px', gap: 6 }}
          >
            <span style={{ width: 10, height: 10, background: colors[i % colors.length] }} />
            <span>{d.label}</span>
            <span className="text-muted text-right">{(((d.value ?? 0) / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
