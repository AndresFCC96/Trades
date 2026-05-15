import { ReactNode } from 'react';

export type Col<R> = {
  label: string;
  align?: 'left' | 'right' | 'center';
  tone?: 'fg' | 'muted';
  wrap?: boolean;
  render: (row: R) => ReactNode;
};

type Props<R> = {
  cols: Array<Col<R>>;
  rows: R[];
  dense?: boolean;
  sticky?: boolean;
  onRow?: (row: R) => void;
  emptyLabel?: string;
};

export function Table<R extends object>({
  cols,
  rows,
  dense,
  sticky = true,
  onRow,
  emptyLabel = '— NO DATA',
}: Props<R>) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center font-mono text-sm text-muted tracking-wider">
        {emptyLabel}
      </div>
    );
  }
  const cellPad = dense ? '4px 8px' : '6px 10px';
  return (
    <div className="overflow-auto max-h-full">
      <table className="w-full border-collapse font-mono text-sm">
        <thead style={sticky ? { position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 } : {}}>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                className="text-muted font-medium uppercase tracking-wider whitespace-nowrap"
                style={{
                  textAlign: c.align ?? 'left',
                  padding: cellPad,
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              onClick={onRow ? () => onRow(row) : undefined}
              style={{
                cursor: onRow ? 'pointer' : 'default',
                borderBottom: '1px solid var(--border-soft)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {cols.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: cellPad,
                    textAlign: c.align ?? 'left',
                    color: c.tone === 'muted' ? 'var(--muted)' : 'var(--fg)',
                    whiteSpace: c.wrap ? 'normal' : 'nowrap',
                  }}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
