/**
 * Tipos compartidos espejo de src/api/schemas.py.
 * Si el backend cambia, actualizar aquí.
 */

// ----- Health ---------------------------------------------------------
export type Health = { status: string; version: string };

// ----- Pipeline -------------------------------------------------------
export type PipelineMode = 'dataframe' | 'csv' | 'api' | 'stream' | 'upload';

export type RunPipelineRequest = {
  n_trades?: number;
  seed?: number;
  mode?: PipelineMode;
  null_rate?: number;
  outlier_rate?: number;
};

export type ValidationSummary = {
  total_in: number;
  total_out: number;
  total_rejected: number;
  rejected_by_rule: Record<string, number>;
};

export type RunPipelineResponse = {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  mode: string;
  validation_summary: ValidationSummary;
  quality_score: number;
};

export type PipelineStatus = {
  last_run_id: string | null;
  last_finished_at: string | null;
  last_quality_score: number | null;
  total_runs: number;
};

export type Run = {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  mode: string;
  trades_in: number;
  trades_out: number;
  quality_score: number;
};

// ----- Reports --------------------------------------------------------
export type BusinessReport = {
  by_asset_class: Array<{
    asset_class: string;
    total_notional: number;
    avg_price: number;
    trade_count: number;
    buy_count: number;
    sell_count: number;
    buy_pct: number;
    sell_pct: number;
  }>;
  risk_distribution: { high: number; medium: number; low: number };
  top_counterparties: Array<{
    counterparty_id: string;
    total_volume: number;
    trade_count: number;
  }>;
  venue_concentration: Array<{
    venue: string;
    total_notional: number;
    trade_count: number;
    share: number;
  }>;
  by_day: Array<{ day: string; trade_count: number; total_notional: number }>;
  by_hour: Array<{ hour: number; trade_count: number; total_notional: number }>;
  summary: { total_trades: number; total_notional: number };
};

export type QualityReport = {
  completeness: Record<string, { nulls: number; pct_null: number }>;
  uniqueness: number;
  duplicates: number;
  consistency: number;
  validity: number;
  outliers_detected: number;
  score: number;
  weights: Record<string, number>;
};

// ----- Sources --------------------------------------------------------
export type SourceMetadata = {
  source_id: string;
  original_name: string;
  ext: string;
  size_bytes: number;
  uploaded_at: string;
  mapping: Record<string, string>;
  row_count: number | null;
  column_names: string[] | null;
};

export type SourcePreview = {
  source_id: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  row_count_preview: number;
};

// ----- Kafka ----------------------------------------------------------
export type KafkaState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'error';

export type KafkaStatus = {
  state: KafkaState;
  started_at: string | null;
  messages_consumed_total: number;
  errors_total: number;
  batches_processed: number;
  buffer_size: number;
  throughput_msgs_per_sec: number;
  lag: number | null;
  last_batch_at: string | null;
  last_batch_size: number;
  last_batch_meta: Record<string, unknown>;
  last_error: string | null;
  bootstrap_servers: string;
  topic: string;
  dlq_total?: number;
};

export type KafkaConnectRequest = {
  bootstrap_servers?: string;
  topic?: string;
  group_id?: string;
  security_protocol?: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  sasl_mechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512';
  auto_offset_reset?: 'earliest' | 'latest';
  buffer_max_size?: number;
  buffer_max_latency_ms?: number;
};

// ----- Audit ----------------------------------------------------------
export type AuditEvent = Record<string, unknown>;

export type AuditPage = {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditTradesFilters = {
  limit?: number;
  offset?: number;
  rule_id?: string;
  run_id?: string;
  trade_id?: string;
};

export type AuditPipelineFilters = {
  limit?: number;
  offset?: number;
  run_id?: string;
  stage?: string;
  status?: 'ok' | 'failed';
};

export type AuditAccessFilters = {
  limit?: number;
  offset?: number;
  code_class?: '2xx' | '4xx' | '5xx';
  method?: string;
};

// ----- Rules + Settings -----------------------------------------------
export type RuleGroupApi = 'critical' | 'business' | 'context';

export type RuleInfo = {
  id: string;
  group: RuleGroupApi;
  name: string;
  description: string;
  enabled: boolean;
};

export type RulesResponse = {
  rules: RuleInfo[];
  disabled_ids: string[];
};

export type SettingsResponse = {
  settings: Record<string, unknown>;
};

// ----- HTTP source test connection -----------------------------------
export type HttpTestRequest = {
  url: string;
  auth_type?: 'none' | 'bearer' | 'api_key';
  token?: string;
  headers?: Record<string, string>;
  timeout_seconds?: number;
};

export type HttpTestResponse = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  sample: unknown;
  error: string | null;
};

// ----- Saved Kafka clusters ------------------------------------------
export type KafkaCluster = {
  id: string;
  name: string;
  bootstrap_servers: string;
  topic: string;
  group_id: string;
  security_protocol: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  last_used_at: string | null;
};

export type KafkaClusterUpsertRequest = {
  name: string;
  bootstrap_servers: string;
  topic: string;
  group_id: string;
  security_protocol?: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
};
