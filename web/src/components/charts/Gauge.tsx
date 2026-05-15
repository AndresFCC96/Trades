type Props = { value: number; size?: number; label?: string };

export function Gauge({ value, size = 140, label = 'SCORE' }: Props) {
  const tone = value >= 80 ? '#4ade80' : value >= 60 ? '#fbbf24' : '#f87171';
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c * 0.75;
  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="6"
        strokeDasharray={`${c * 0.75} ${c}`}
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="6"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="square"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        style={{ fontFamily: 'IBM Plex Mono', fontSize: Math.max(14, size * 0.2), fontWeight: 600, fill: tone }}
      >
        {value.toFixed(1)}
      </text>
      {label && (
        <text
          x={size / 2}
          y={size / 2 + Math.max(18, size * 0.15)}
          textAnchor="middle"
          style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: 'var(--muted)', letterSpacing: 0.8 }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
