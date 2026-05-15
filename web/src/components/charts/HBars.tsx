type Item = { label: string; value: number };

type Props = {
  data: Item[];
  max?: number;
  color?: string;
  valueFmt?: (v: number) => string;
};

export function HBars({ data, max, color = '#fbbf24', valueFmt = (v) => v.toString() }: Props) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d, i) => (
        <div
          key={i}
          className="grid items-center font-mono text-sm"
          style={{ gridTemplateColumns: '60px 1fr 60px', gap: 8 }}
        >
          <span className="text-fg">{d.label}</span>
          <div className="bg-border h-2.5 overflow-hidden">
            <div
              style={{
                width: `${(d.value / m) * 100}%`,
                height: '100%',
                background: color,
              }}
            />
          </div>
          <span className="text-muted text-right">{valueFmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
