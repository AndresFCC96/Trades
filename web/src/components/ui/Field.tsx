import { ReactNode, CSSProperties } from 'react';

type Props = {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
};

export function Field({ label, value, hint, children }: Props) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="font-mono text-2xs text-muted tracking-wider">{label}</span>
        {value && <span className="font-mono text-sm text-fg">{value}</span>}
      </div>
      {children}
      {hint && <div className="mt-1 font-mono text-[9px] text-muted">{hint}</div>}
    </div>
  );
}

export const inputBoxStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 10px',
  marginTop: 6,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 2,
  fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
  fontSize: 11,
  color: 'var(--fg)',
  outline: 'none',
};

export const inputRangeStyle: CSSProperties = {
  width: '100%',
  accentColor: '#4ade80',
};
