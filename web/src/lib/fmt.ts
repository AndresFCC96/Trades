/**
 * Formatters mirror the prototype's `window.fmt` so screens look identical.
 */
export const fmt = {
  usd(v: number): string {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  },
  num(v: number): string {
    return v.toLocaleString('en-US');
  },
  pct(v: number, d = 1): string {
    return `${v.toFixed(d)}%`;
  },
  time(iso: string): string {
    return new Date(iso).toISOString().slice(11, 19) + 'Z';
  },
  date(iso: string): string {
    return new Date(iso).toISOString().slice(0, 10);
  },
  dt(iso: string): string {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  },
  dur(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  },
  short(s: string, n = 12): string {
    return s.length > n ? s.slice(0, n) + '…' : s;
  },
};
