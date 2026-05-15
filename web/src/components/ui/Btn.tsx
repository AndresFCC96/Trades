import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Kind = 'ghost' | 'solid' | 'primary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  kind?: Kind;
  size?: Size;
  children: ReactNode;
  style?: CSSProperties;
};

const SIZE: Record<Size, { padding: string; fontSize: number }> = {
  sm: { padding: '4px 10px', fontSize: 11 },
  md: { padding: '7px 12px', fontSize: 11 },
  lg: { padding: '10px 16px', fontSize: 13 },
};

const KIND: Record<Kind, CSSProperties> = {
  ghost: { background: 'transparent', color: 'var(--fg)' },
  solid: { background: 'var(--panel-2)', color: 'var(--fg)', borderColor: 'var(--border)' },
  primary: { background: '#4ade80', color: '#0a0c10', borderColor: '#4ade80', fontWeight: 600 },
  danger: {
    background: 'rgba(248,113,113,0.08)',
    color: '#f87171',
    borderColor: 'rgba(248,113,113,0.3)',
  },
};

export function Btn({ kind = 'ghost', size = 'sm', children, style, disabled, ...rest }: Props) {
  const s = SIZE[size];
  const k = KIND[kind];
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--mono, "IBM Plex Mono")',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        border: '1px solid var(--border)',
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 0.1s',
        ...k,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
