/**
 * Client-side export helpers for the audit screens. The backend returns
 * the events as JSON; we render the same content as a CSV or pretty
 * JSON Blob and trigger a download.
 */

export function downloadJson(rows: unknown[], filename: string) {
  const body = JSON.stringify(rows, null, 2);
  trigger(new Blob([body], { type: 'application/json' }), `${filename}.json`);
}

export function toCsvString(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const cols = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      for (const k of Object.keys(r)) acc.add(k);
      return acc;
    }, new Set())
  );
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => escape(r[c])).join(','));
  return lines.join('\n');
}

export function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  const body = toCsvString(rows);
  trigger(new Blob([body], { type: 'text/csv' }), `${filename}.csv`);
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
