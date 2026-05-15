import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        ok: '#4ade80',
        warn: '#fbbf24',
        crit: '#f87171',
        info: '#60a5fa',
        accent: '#a78bfa',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '9px',
        xs: '10px',
        sm: '11px',
        base: '13px',
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
