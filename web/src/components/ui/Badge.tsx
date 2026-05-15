import { ReactNode, CSSProperties } from 'react';

export type Tone = 'neutral' | 'ok' | 'warn' | 'crit' | 'info' | 'accent';

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: '#1a1f2a', fg: '#9aa4b2', border: '#252b38' },
  ok: { bg: 'rgba(74,222,128,0.08)', fg: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  warn: { bg: 'rgba(251,191,36,0.08)', fg: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  crit: { bg: 'rgba(248,113,113,0.08)', fg: '#f87171', border: 'rgba(248,113,113,0.3)' },
  info: { bg: 'rgba(96,165,250,0.08)', fg: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  accent: { bg: 'rgba(167,139,250,0.08)', fg: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
};

type Props = {
  tone?: Tone;
  children: ReactNode;
  mono?: boolean;
  style?: CSSProperties;
};

export function Badge({ tone = 'neutral', children, mono = true, style }: Props) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-[2px] rounded-[2px] text-[10px] font-medium tracking-wider ${mono ? 'font-mono' : 'font-sans'}`}
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}`, ...style }}
    >
      {children}
    </span>
  );
}
