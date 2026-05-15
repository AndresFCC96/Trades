/**
 * Static catalog of the 14 validation rules (matches src/trade_validator.py
 * and the descriptions in the Terminal prototype). Rejection counts come
 * from /audit/trades grouped by rule_id; thresholds will be editable once
 * the backend exposes /rules + /settings PUT endpoints.
 */

export type RuleGroup = 'critical' | 'business' | 'context';

export type RuleDef = {
  id: string;
  group: RuleGroup;
  name: string;
  desc: string;
  threshold: string; // human-readable threshold hint (label only for now)
};

export const RULES: RuleDef[] = [
  // Críticas (RV-01..RV-06)
  { id: 'RV-01', group: 'critical', name: 'Required fields not null', desc: 'Ningún campo obligatorio puede ser null', threshold: 'required_fields list' },
  { id: 'RV-02', group: 'critical', name: 'price > 0 and quantity > 0', desc: 'Precio y cantidad deben ser positivos', threshold: 'price > 0' },
  { id: 'RV-03', group: 'critical', name: 'side in {BUY, SELL}', desc: 'Side debe ser BUY o SELL', threshold: 'valid_sides' },
  { id: 'RV-04', group: 'critical', name: 'trade_id unique in batch', desc: 'IDs únicos por batch', threshold: 'in-batch dedup' },
  { id: 'RV-05', group: 'critical', name: '|notional − price·qty| ≤ tol', desc: 'Coherencia notional vs price·qty', threshold: 'notional_tolerance' },
  { id: 'RV-06', group: 'critical', name: 'timestamp within window', desc: 'Timestamp dentro de ventana válida', threshold: 'timestamp_window_days' },
  // Negocio (RV-07..RV-12)
  { id: 'RV-07', group: 'business', name: 'lot size by asset_class', desc: 'Tamaño de lote por clase', threshold: 'min_lot_size' },
  { id: 'RV-08', group: 'business', name: 'price within band of reference', desc: 'Precio dentro de banda de referencia', threshold: 'price_band_pct' },
  { id: 'RV-09', group: 'business', name: 'trader notional ≤ limit', desc: 'Notional acumulado del trader bajo límite', threshold: 'max_notional_per_trader_usd' },
  { id: 'RV-10', group: 'business', name: 'currency ↔ asset_class', desc: 'Moneda coherente con asset class', threshold: 'currency_by_asset_class' },
  { id: 'RV-11', group: 'business', name: 'counterparty ≤ % batch', desc: 'Counterparty no excede % del batch', threshold: 'max_counterparty_concentration_pct' },
  { id: 'RV-12', group: 'business', name: 'venue in whitelist', desc: 'Venue autorizado por asset class', threshold: 'venue_whitelist' },
  // Contextuales (RV-13..RV-14)
  { id: 'RV-13', group: 'context', name: 'wash trading detection', desc: 'Detección heurística de wash trading', threshold: 'exact-match heuristic' },
  { id: 'RV-14', group: 'context', name: 'price outlier (IQR)', desc: 'Outlier de precio por IQR', threshold: 'iqr_factor' },
];

export const GROUP_META: Record<
  RuleGroup,
  { label: string; range: string; color: string }
> = {
  critical: { label: 'CRÍTICAS', range: 'RV-01..RV-06', color: '#f87171' },
  business: { label: 'NEGOCIO', range: 'RV-07..RV-12', color: '#fbbf24' },
  context: { label: 'CONTEXTUALES', range: 'RV-13..RV-14', color: '#a78bfa' },
};
