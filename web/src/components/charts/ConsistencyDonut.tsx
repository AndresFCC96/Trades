export function ConsistencyDonut({ value }: { value: number }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle
        cx="75"
        cy="75"
        r={r}
        fill="none"
        stroke="#a78bfa"
        strokeWidth="10"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 75 75)"
        strokeLinecap="square"
      />
      <text
        x="75"
        y="80"
        textAnchor="middle"
        style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fill: '#a78bfa' }}
      >
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}
