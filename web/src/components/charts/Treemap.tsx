import { fmt } from '@/lib/fmt';

type Item = { name: string; share: number; notional: number };

const COLORS = ['#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171', '#34d399', '#fb923c'];

export function Treemap({ data }: { data: Item[] }) {
  const total = data.reduce((a, b) => a + b.share, 0) || 1;
  const W = 280,
    H = 200;
  const sorted = [...data].sort((a, b) => b.share - a.share);
  const left = sorted.slice(0, 1);
  const right = sorted.slice(1);
  const leftSum = left.reduce((a, b) => a + b.share, 0);
  const leftW = (leftSum / total) * W;
  const rightW = W - leftW;

  const cells: Array<{ x: number; y: number; w: number; h: number; d: Item }> = [];
  let ly = 0;
  left.forEach((d) => {
    const h = (d.share / (leftSum || 1)) * H;
    cells.push({ x: 0, y: ly, w: leftW, h, d });
    ly += h;
  });
  const rightSum = right.reduce((a, b) => a + b.share, 0) || 1;
  let ry = 0;
  right.forEach((d) => {
    const h = (d.share / rightSum) * H;
    cells.push({ x: leftW, y: ry, w: rightW, h, d });
    ry += h;
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {cells.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill={COLORS[i % COLORS.length]}
            opacity="0.7"
            stroke="#0a0c10"
            strokeWidth="1"
          />
          <text
            x={c.x + 6}
            y={c.y + 16}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: '#0a0c10', fontWeight: 600 }}
          >
            {c.d.name}
          </text>
          <text
            x={c.x + 6}
            y={c.y + 30}
            style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#0a0c10' }}
          >
            {c.d.share.toFixed(1)}% · {fmt.usd(c.d.notional)}
          </text>
        </g>
      ))}
    </svg>
  );
}
