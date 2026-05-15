type Point = { day: string; count: number; notional: number };

export function DualLineChart({ data }: { data: Point[] }) {
  const w = 380,
    h = 180;
  if (data.length < 2) return <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxNot = Math.max(...data.map((d) => d.notional), 1);
  const ptsCount = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - 20 - (d.count / maxCount) * (h - 30)}`)
    .join(' ');
  const ptsNot = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - 20 - (d.notional / maxNot) * (h - 30)}`)
    .join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={ptsCount} fill="none" stroke="#4ade80" strokeWidth="1.4" />
      <polyline points={ptsNot} fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeDasharray="3,2" />
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text
            key={i}
            x={(i / (data.length - 1)) * w}
            y={h - 4}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'var(--muted)' }}
          >
            {d.day.slice(8)}
          </text>
        ) : null
      )}
      <text x={6} y={12} style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#4ade80' }}>
        ● trades
      </text>
      <text x={70} y={12} style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#60a5fa' }}>
        --- notional
      </text>
    </svg>
  );
}
