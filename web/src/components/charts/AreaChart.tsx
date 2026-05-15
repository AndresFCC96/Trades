type Props = { data: number[]; w?: number; h?: number; color?: string };

export function AreaChart({ data, w = 600, h = 180, color = '#4ade80' }: Props) {
  if (data.length < 2) {
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} />
    );
  }
  const min = 0,
    max = 100;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / (max - min)) * (h - 20) - 10,
  ]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const grid = [0, 25, 50, 75, 100];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {grid.map((g) => {
        const y = h - (g / 100) * (h - 20) - 10;
        return (
          <g key={g}>
            <line
              x1="0"
              y1={y}
              x2={w}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="2,3"
            />
            <text x="4" y={y - 2} style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: 'var(--muted)' }}>
              {g}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
      {pts.map((p, i) => i % 3 === 0 && <circle key={i} cx={p[0]} cy={p[1]} r="1.5" fill={color} />)}
    </svg>
  );
}
