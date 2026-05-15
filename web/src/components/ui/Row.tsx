import { ReactNode } from 'react';

export function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div
      className="flex justify-between"
      style={{ padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}
    >
      <span className="text-muted">{k}</span>
      <span className="text-fg">{v}</span>
    </div>
  );
}

export function BigStat({
  value,
  sub,
  color,
}: {
  value: ReactNode;
  sub: string;
  color: string;
}) {
  return (
    <div>
      <div className="font-mono leading-none" style={{ fontSize: 38, fontWeight: 500, color }}>
        {value}
      </div>
      <div
        className="font-mono mt-1 tracking-wider"
        style={{ fontSize: 10, color: 'var(--muted)' }}
      >
        {sub}
      </div>
    </div>
  );
}
