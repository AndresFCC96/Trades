// Mock data shared across screens
const MOCK = (() => {
  const rand = (seed) => {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  };
  const r = rand(42);

  const runs = Array.from({ length: 30 }, (_, i) => {
    const ts = new Date(2026, 4, 14, 9 + Math.floor(i / 4), (i * 17) % 60, 0);
    const score = 72 + Math.round(r() * 25);
    const tradesIn = 9500 + Math.round(r() * 800);
    const tradesOut = tradesIn - Math.round(r() * 400);
    return {
      run_id: `run_${(2026000 + i).toString(16)}_${i.toString(36).padStart(3, '0')}`,
      started_at: ts.toISOString(),
      duration_ms: 800 + Math.round(r() * 1800),
      mode: ['dataframe', 'csv', 'kafka', 'api'][i % 4],
      trades_in: tradesIn,
      trades_out: tradesOut,
      quality_score: score,
      notional: 850e6 + r() * 800e6,
    };
  }).reverse();

  const rules = [
    { id: 'RV-01', group: 'critical', name: 'Required fields not null', desc: 'Ningún campo obligatorio puede ser null', rejected: 14, enabled: true },
    { id: 'RV-02', group: 'critical', name: 'price > 0 and quantity > 0', desc: 'Precio y cantidad deben ser positivos', rejected: 8, enabled: true },
    { id: 'RV-03', group: 'critical', name: 'side in {BUY, SELL}', desc: 'Side debe ser BUY o SELL', rejected: 2, enabled: true },
    { id: 'RV-04', group: 'critical', name: 'trade_id unique in batch', desc: 'IDs únicos por batch', rejected: 5, enabled: true },
    { id: 'RV-05', group: 'critical', name: '|notional - price·qty| ≤ tol', desc: 'Coherencia notional vs price·qty', rejected: 31, enabled: true },
    { id: 'RV-06', group: 'critical', name: 'timestamp within window', desc: 'Timestamp dentro de ventana válida', rejected: 4, enabled: true },
    { id: 'RV-07', group: 'business', name: 'lot size by asset_class', desc: 'Tamaño de lote por clase', rejected: 18, enabled: true },
    { id: 'RV-08', group: 'business', name: 'price within band', desc: 'Precio dentro de banda de referencia', rejected: 22, enabled: true },
    { id: 'RV-09', group: 'business', name: 'trader notional ≤ limit', desc: 'Notional del trader bajo límite', rejected: 11, enabled: true },
    { id: 'RV-10', group: 'business', name: 'currency ↔ asset_class', desc: 'Moneda coherente con asset class', rejected: 7, enabled: true },
    { id: 'RV-11', group: 'business', name: 'counterparty ≤ % batch', desc: 'Counterparty no excede % del batch', rejected: 3, enabled: true },
    { id: 'RV-12', group: 'business', name: 'venue in whitelist', desc: 'Venue en whitelist por asset class', rejected: 9, enabled: false },
    { id: 'RV-13', group: 'context', name: 'wash trading detection', desc: 'Detección heurística de wash trading', rejected: 6, enabled: true },
    { id: 'RV-14', group: 'context', name: 'price outlier (IQR)', desc: 'Outlier de precio por IQR', rejected: 13, enabled: true },
  ];

  const assetClasses = [
    { name: 'EQUITY', notional: 412e6, avg_price: 187.42, count: 3284, buy: 52 },
    { name: 'FX', notional: 521e6, avg_price: 1.0843, count: 2891, buy: 48 },
    { name: 'CRYPTO', notional: 198e6, avg_price: 64218, count: 1742, buy: 61 },
    { name: 'FIXED_INCOME', notional: 142e6, avg_price: 98.31, count: 1230, buy: 44 },
    { name: 'COMMODITY', notional: 87e6, avg_price: 2412, count: 700, buy: 50 },
  ];

  const counterparties = [
    { id: 'a3f2c19b8d4e5f7a', name: 'CP-NORTH', volume: 187e6 },
    { id: 'b8e1d72c34a5e6f9', name: 'CP-MERIDIAN', volume: 162e6 },
    { id: 'c1d4e2a8b9f3a7e2', name: 'CP-AXIS', volume: 141e6 },
    { id: 'd2a8b3c4e9f1d7e3', name: 'CP-ORION', volume: 119e6 },
    { id: 'e9f1a2c4b8d3e7f1', name: 'CP-VERTEX', volume: 98e6 },
    { id: 'f3a8b1c2d4e9f7a3', name: 'CP-DELTA', volume: 76e6 },
    { id: 'a1b2c3d4e5f6a7b8', name: 'CP-PRIME', volume: 62e6 },
    { id: 'b2c3d4e5f6a7b8c9', name: 'CP-FORGE', volume: 51e6 },
  ];

  const venues = [
    { name: 'NYSE', share: 28, notional: 392e6 },
    { name: 'NASDAQ', share: 22, notional: 308e6 },
    { name: 'LSE', share: 14, notional: 196e6 },
    { name: 'CME', share: 11, notional: 154e6 },
    { name: 'EUREX', share: 9, notional: 126e6 },
    { name: 'TSE', share: 7, notional: 98e6 },
    { name: 'OTHER', share: 9, notional: 126e6 },
  ];

  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: Math.round(50 + 380 * Math.exp(-Math.pow((h - 14) / 4.5, 2)) + r() * 60),
  }));

  const byDay = Array.from({ length: 14 }, (_, i) => ({
    day: new Date(2026, 4, 1 + i).toISOString().slice(0, 10),
    count: 7000 + Math.round(r() * 4000),
    notional: 800e6 + r() * 600e6,
  }));

  const rejected = Array.from({ length: 80 }, (_, i) => {
    const rule = rules[Math.floor(r() * rules.length)];
    return {
      ts: new Date(2026, 4, 14, 10 + Math.floor(i / 20), i % 60, (i * 7) % 60).toISOString(),
      trade_id: `t_${(8e8 + i).toString(16)}`,
      rule_id: rule.id,
      rule_description: rule.name,
      field: ['price', 'quantity', 'notional', 'side', 'currency', 'timestamp'][i % 6],
      value: ['-23.4', 'NULL', '0', 'BUYY', 'XYZ', '2027-01-01'][i % 6],
    };
  });

  const apiAccess = Array.from({ length: 60 }, (_, i) => {
    const codes = [200, 200, 200, 200, 200, 201, 304, 400, 401, 404, 500];
    return {
      ts: new Date(2026, 4, 14, 9 + Math.floor(i / 8), (i * 3) % 60, (i * 11) % 60).toISOString(),
      method: ['GET', 'POST', 'GET', 'GET', 'PUT'][i % 5],
      endpoint: ['/api/runs', '/api/runs/start', '/api/reports/business', '/api/reports/quality', '/api/audit/trades', '/api/health'][i % 6],
      code: codes[i % codes.length],
      actor: `10.4.${20 + (i % 30)}.${100 + i}`,
    };
  });

  return { runs, rules, assetClasses, counterparties, venues, byHour, byDay, rejected, apiAccess };
})();

window.MOCK = MOCK;

// Formatters
window.fmt = {
  usd: (v) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  },
  num: (v) => v.toLocaleString('en-US'),
  pct: (v, d = 1) => `${v.toFixed(d)}%`,
  time: (iso) => new Date(iso).toISOString().slice(11, 19) + 'Z',
  date: (iso) => new Date(iso).toISOString().slice(0, 10),
  dt: (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + 'Z',
  dur: (ms) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`,
  short: (s, n = 12) => s.length > n ? s.slice(0, n) + '…' : s,
};
