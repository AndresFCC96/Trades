type Point = { hour: number; trade_count: number };

export function HourHistogram({ data }: { data: Point[] }) {
  const w = 380,
    h = 180;
  const max = Math.max(...data.map((d) => d.trade_count), 1);
  const bw = w / 24;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.trade_count / max) * (h - 30);
        return (
          <g key={i}>
            <rect
              x={i * bw + 1}
              y={h - 20 - bh}
              width={bw - 2}
              height={bh}
              fill="#a78bfa"
              opacity={0.4 + (d.trade_count / max) * 0.6}
            />
            {i % 3 === 0 && (
              <text
                x={i * bw + bw / 2}
                y={h - 4}
                textAnchor="middle"
                style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'var(--muted)' }}
              >
                {i.toString().padStart(2, '0')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
