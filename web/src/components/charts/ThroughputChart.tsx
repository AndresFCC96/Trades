export function ThroughputChart({ data, max = 400 }: { data: number[]; max?: number }) {
  const w = 600,
    h = 60;
  if (data.length < 2)
    return <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} />;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="thrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#thrGrad)" />
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="1.2" />
    </svg>
  );
}
