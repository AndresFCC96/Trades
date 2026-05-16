/**
 * Formatters mirror the prototype's `window.fmt` so screens look identical.
 * Every numeric input is normalised through `safeNum` so a missing field
 * from the backend renders as 0 (or "—" when the caller passes `dash:true`)
 * instead of throwing `Cannot read properties of undefined (reading 'toFixed')`.
 */
function safeNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v !== '' && Number.isFinite(Number(v))) return Number(v);
  return 0;
}

export const fmt = {
  usd(v: number | null | undefined): string {
    const n = safeNum(v);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  },
  num(v: number | null | undefined): string {
    return safeNum(v).toLocaleString('en-US');
  },
  pct(v: number | null | undefined, d = 1): string {
    return `${safeNum(v).toFixed(d)}%`;
  },
  /**
   * Fixed-point with safety: returns "—" when the value is missing/NaN,
   * the formatted number otherwise. Use for displaying scores/ratios
   * straight from the backend.
   */
  fixed(v: number | null | undefined, d = 1, dashOnMissing = true): string {
    if (typeof v !== 'number' || !Number.isFinite(v)) return dashOnMissing ? '—' : '0';
    return v.toFixed(d);
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
