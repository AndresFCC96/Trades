/*
 * Trade Pipeline — generate_docs.js
 * Builds docs/TradePipeline-Documentation.docx with the full code reference.
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, PageOrientation, LevelFormat,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents, ExternalHyperlink, Header, Footer,
} = require('docx');

// ---------- styling shortcuts ----------
const GREY_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const BORDERS = { top: GREY_BORDER, bottom: GREY_BORDER, left: GREY_BORDER, right: GREY_BORDER };
const CONTENT_W = 9360;          // US Letter content width
const CODE_FONT = 'Consolas';

// ---------- paragraph helpers ----------
function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun(text)],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun(text)],
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
    children: [new TextRun(text)],
  });
}
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })],
  });
}
function Bold(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: true })],
  });
}
function Bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 40 },
    children: [new TextRun(text)],
  });
}
function Numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 40 },
    children: [new TextRun(text)],
  });
}
function Mono(text) {
  return new TextRun({ text, font: CODE_FONT, size: 20 });
}
function Code(text) {
  // Each line becomes its own paragraph with monospace + light grey background
  const lines = text.replace(/\t/g, '  ').split('\n');
  return lines.map(line => new Paragraph({
    spacing: { before: 0, after: 0 },
    shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
    children: [new TextRun({ text: line || ' ', font: CODE_FONT, size: 18 })],
  }));
}
function HR() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 1 } },
    children: [],
  });
}
function Spacer(after = 200) {
  return new Paragraph({ spacing: { after }, children: [] });
}
function PB() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ---------- table helpers ----------
function tcell(text, opts = {}) {
  const { bold = false, fill = null, widthDxa, align = AlignmentType.LEFT } = opts;
  return new TableCell({
    borders: BORDERS,
    width: { size: widthDxa, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold })],
    })],
  });
}
function tcellMono(text, widthDxa, opts = {}) {
  const { fill = null } = opts;
  return new TableCell({
    borders: BORDERS,
    width: { size: widthDxa, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, font: CODE_FONT, size: 18 })] })],
  });
}
function buildTable(columnWidths, headerRow, dataRows) {
  const rows = [];
  rows.push(new TableRow({
    tableHeader: true,
    children: headerRow.map((txt, i) =>
      tcell(txt, { bold: true, fill: 'E8E8E8', widthDxa: columnWidths[i] })),
  }));
  for (const r of dataRows) {
    rows.push(new TableRow({
      children: r.map((txt, i) => tcell(String(txt), { widthDxa: columnWidths[i] })),
    }));
  }
  return new Table({
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths,
    rows,
  });
}

// =====================================================================
// CONTENT
// =====================================================================
const children = [];

// ---------- Cover ----------
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: 'Trade Pipeline', bold: true, size: 56 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Complete Code Documentation', size: 32 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Version 0.1.0', size: 24, italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'https://github.com/AndresFCC96/Trades', size: 22, color: '2E75B6' })],
  }),
  Spacer(2000),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'Financial trade processing pipeline with rule-based validation, ' +
            'synthetic data generation, quality metrics and a REST API.',
      italics: true, size: 22,
    })],
  }),
  PB(),
);

// ---------- TOC ----------
children.push(
  H1('Table of Contents'),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
  PB(),
);

// =====================================================================
// 1. Introduction
// =====================================================================
children.push(
  H1('1. Introduction'),
  P('Trade Pipeline is a Python-based system that ingests financial trade data, ' +
    'validates it against 14 numbered rules (RV-01 through RV-14), produces business ' +
    'and quality reports, and exposes everything behind a FastAPI REST surface. ' +
    'The pipeline is designed so every threshold, catalog and path lives in a single ' +
    'YAML file — no magic numbers in code.'),
  H2('1.1 Goals'),
  Bullet('Apply a deterministic, auditable set of validation rules to every trade.'),
  Bullet('Produce business analytics (asset class breakdowns, risk distribution, ' +
         'top counterparties, temporal trends).'),
  Bullet('Score data quality on a 0-100 scale with weighted components.'),
  Bullet('Provide a forensic audit trail of every rejection, pipeline run, API access ' +
         'and data change.'),
  Bullet('Expose the whole flow through a REST API with pseudonymized identifiers.'),
  H2('1.2 Stack'),
  ...buildStackTable(),
  H2('1.3 Project layout'),
  ...Code(`trade-pipeline/
├── config/settings.yaml          # all thresholds and catalogs
├── src/
│   ├── audit.py                  # cross-cutting AuditLogger (4 JSONL streams)
│   ├── trade_validator.py        # 14 RV-XX rules in 3 groups
│   ├── trade_generator.py        # Faker + random
│   ├── trade_extractor.py        # csv | api | dataframe + Patito
│   ├── business_rules.py         # business_report
│   ├── data_quality.py           # quality_report (0-100 score)
│   ├── trade_transformer.py      # wires the three reports
│   ├── pipeline_runner.py        # run_pipeline + PipelineStageError
│   └── api/{schemas,main}.py     # FastAPI
├── tests/                        # unit + integration
├── outputs/{raw,reports,audit}/  # CSVs, reports, audit JSONL
├── docs/architecture.md
├── docs/insomnia/                # Insomnia collection for the API
├── Dockerfile + docker-compose.yml
└── .github/workflows/ci.yml`),
  PB(),
);

function buildStackTable() {
  return [
    buildTable(
      [3000, 6360],
      ['Component', 'Purpose'],
      [
        ['Python 3.10+', 'Runtime; uses match statements, X | None typing.'],
        ['Polars 1.0+', 'Data processing with LazyFrame chains, .collect() at the end of each stage.'],
        ['Patito 0.7+', 'Declarative schema validation on top of Polars.'],
        ['FastAPI + Uvicorn', 'REST API and ASGI server.'],
        ['Pydantic 2', 'Request/response models with strict validation.'],
        ['Faker', 'Synthetic identifier generation for the generator stage.'],
        ['pytest + pytest-cov', 'Unit and integration tests with coverage reporting.'],
        ['ruff', 'Lint + format (E/F/W/I/B/UP/N/S rule sets).'],
        ['bandit', 'Python AST-based SAST. SARIF uploaded to GitHub Code Scanning.'],
        ['semgrep', 'Cross-language SAST with p/python, p/security-audit, p/owasp-top-ten.'],
        ['Codecov', 'Coverage reports per PR + badge.'],
      ],
    ),
    Spacer(),
  ];
}

// =====================================================================
// 2. Architecture
// =====================================================================
children.push(
  H1('2. Architecture'),
  H2('2.1 Pipeline flow'),
  ...Code(`┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
│ Generate │ -> │ Extract  │ -> │ Validate   │ -> │ Transform    │
│ (Faker)  │    │ (Patito) │    │ (14 RV-XX) │    │ (3 reports)  │
└──────────┘    └──────────┘    └────────────┘    └──────────────┘
      │              │                 │                  │
      └──────────────┴─────────────────┴──────────────────┘
                     │
                     v
            ┌─────────────────┐
            │  AuditLogger    │  <-- pipeline_run_id correlation
            │  (JSONL x 4)    │
            └─────────────────┘`),
  Spacer(),
  H2('2.2 Conscious design choices'),
  Bullet('Single source of truth: every threshold, catalog and path lives in ' +
         'config/settings.yaml. Modifying behaviour never requires touching code.'),
  Bullet('Cost-ordered validation: critical rules (per trade) first, business rules ' +
         '(per group) second, contextual rules (whole batch) last. Cheap failures ' +
         'short-circuit expensive ones.'),
  Bullet('LazyFrame-first: reports chain operations on pl.LazyFrame and call ' +
         '.collect() once per section. Polars optimises the plan.'),
  Bullet('Append-only audit: JSONL files are atomic on POSIX, grep-friendly, and ' +
         'simple to inspect. Every event carries pipeline_run_id for cross-file ' +
         'correlation.'),
  Bullet('Pseudonymization at the edge: trader_id and counterparty_id values are ' +
         'SHA-256(salt + value)[:16] only on public endpoints; the pipeline operates ' +
         'on raw identifiers internally.'),
  Bullet('Pluggable HTTP client: trade_extractor.extract_trades accepts an http_client ' +
         'callable so tests do not need to mock urllib.'),
  PB(),
);

// =====================================================================
// 3. Configuration reference
// =====================================================================
children.push(
  H1('3. Configuration reference'),
  P('Every tunable parameter lives in config/settings.yaml. Sections map 1:1 to modules.'),
  H2('3.1 validator.critical (RV-01..RV-06)'),
  ...buildConfigTable([
    ['required_fields', 'list[str]', 'Fields that must be non-null per row (RV-01).'],
    ['valid_sides', 'list[str]', 'Allowed values for side (RV-03). Default: ["BUY","SELL"].'],
    ['notional_tolerance', 'float', '|notional - price*qty| must be <= this (RV-05).'],
    ['timestamp_window_days', 'int', 'now-N to now timestamps accepted (RV-06).'],
    ['valid_asset_classes', 'list[str]', 'Domain check.'],
    ['valid_currencies', 'list[str]', 'Domain check.'],
    ['valid_statuses', 'list[str]', 'Domain check.'],
  ]),
  H2('3.2 validator.business (RV-07..RV-12)'),
  ...buildConfigTable([
    ['min_lot_size', 'dict', 'Minimum quantity per asset_class (RV-07).'],
    ['price_band_pct', 'float', '±X of reference price tolerated (RV-08). Default 0.20.'],
    ['max_notional_per_trader_usd', 'float', 'Trader-level cap (RV-09).'],
    ['currency_by_asset_class', 'dict', 'Allowed currencies per asset class (RV-10).'],
    ['max_counterparty_concentration_pct', 'float', 'CP share cap (RV-11). Default 0.40.'],
    ['venue_whitelist', 'dict', 'Allowed venues per asset class (RV-12).'],
  ]),
  H2('3.3 validator.contextual (RV-13, RV-14)'),
  ...buildConfigTable([
    ['iqr_factor', 'float', 'Multiplier for the IQR outlier band (RV-14). Default 3.0.'],
  ]),
  H2('3.4 generator'),
  ...buildConfigTable([
    ['default_n_trades', 'int', 'Default trade count when not overridden.'],
    ['default_seed', 'int', 'Seed for random + Faker.'],
    ['default_null_rate', 'float', 'Probability of null in nullable fields.'],
    ['default_outlier_rate', 'float', 'Probability of injecting an outlier in price or quantity.'],
    ['output_dir', 'str', 'Where to write CSV files.'],
    ['filename_pattern', 'str', 'Template, supports {timestamp}.'],
    ['instruments', 'dict', 'Per asset_class instrument lists.'],
    ['reference_prices', 'dict', 'Per-instrument reference price (used by RV-08).'],
    ['forex_pair_currencies', 'dict', 'Per-pair allowed currencies (used by RV-10).'],
  ]),
  H2('3.5 extractor'),
  ...buildConfigTable([
    ['mode', 'literal', '"csv" | "api" | "dataframe".'],
    ['csv.path', 'str', 'Local CSV path for csv mode.'],
    ['csv.encoding', 'str', 'Default utf-8.'],
    ['api.url', 'str', 'HTTP endpoint for api mode.'],
    ['api.auth_type', 'literal', '"bearer" | "api_key".'],
    ['api.token_env', 'str', 'Env var name holding the token.'],
    ['api.timeout_seconds', 'float', 'HTTP timeout.'],
    ['api.params', 'dict', 'Query params; from_date supports "auto".'],
  ]),
  H2('3.6 business_rules'),
  ...buildConfigTable([
    ['risk_buckets.high_threshold_usd', 'float', 'notional > this is "high".'],
    ['risk_buckets.medium_threshold_usd', 'float', '>= this and <= high is "medium".'],
    ['top_counterparties', 'int', 'Top N to include in the report.'],
  ]),
  H2('3.7 data_quality'),
  ...buildConfigTable([
    ['weights.completeness', 'float', 'Weight in the global score (0-1).'],
    ['weights.uniqueness', 'float', 'Idem.'],
    ['weights.consistency', 'float', 'Idem.'],
    ['weights.validity', 'float', 'Idem.'],
    ['weights.outliers', 'float', 'Idem. The five should sum to 1.0.'],
    ['iqr_factor', 'float', 'IQR multiplier for outlier detection.'],
  ]),
  H2('3.8 audit'),
  ...buildConfigTable([
    ['output_dir', 'str', 'Directory for JSONL files.'],
    ['rejection_log', 'str', 'Filename for rejection events.'],
    ['pipeline_log', 'str', 'Filename for pipeline_run events.'],
    ['access_log', 'str', 'Filename for api_access events.'],
    ['data_change_log', 'str', 'Filename for data_change events.'],
    ['flush_each_event', 'bool', 'fsync after every write (default true).'],
  ]),
  H2('3.9 api'),
  ...buildConfigTable([
    ['host', 'str', 'Uvicorn bind host. Default 0.0.0.0.'],
    ['port', 'int', 'Uvicorn port. Default 8000.'],
    ['cors_origins', 'list[str]', 'Origins allowed by CORS middleware.'],
    ['pseudonymization.algorithm', 'str', 'Currently "sha256".'],
    ['pseudonymization.salt_env', 'str', 'Env var name carrying the salt.'],
    ['pseudonymization.default_salt', 'str', 'Fallback for dev only — never use in production.'],
    ['cache.enabled', 'bool', 'Currently advisory; last_run is always cached in memory.'],
    ['cache.ttl_seconds', 'int', 'Reserved for future use.'],
  ]),
  PB(),
);

function buildConfigTable(rows) {
  return [
    buildTable(
      [2800, 1600, 4960],
      ['Key', 'Type', 'Description'],
      rows,
    ),
    Spacer(),
  ];
}

// =====================================================================
// 4. Module reference
// =====================================================================
children.push(H1('4. Module reference'));

// --- audit ---
children.push(
  H2('4.1 src/audit.py'),
  P('Cross-cutting audit layer. Every other module writes events here for ' +
    'forensic review and post-hoc analysis. Also exposes load_config(), the only ' +
    'project-wide settings loader.'),
  H3('Public API'),
  ...Code(`load_config(path: str | Path | None = None) -> dict[str, Any]

class EventType(str, Enum):
    REJECTION    = "rejection"
    PIPELINE_RUN = "pipeline_run"
    API_ACCESS   = "api_access"
    DATA_CHANGE  = "data_change"

class AuditLogger:
    def __init__(config: dict | None = None,
                 pipeline_run_id: str | UUID | None = None) -> None
    def set_pipeline_run_id(run_id: str | UUID) -> None
    def log_rejection(trade_id, rule_id, rule_description, field, value) -> str
    def log_pipeline_run(run_id, stage, status,
                         trades_in, trades_out, duration_ms) -> str
    def log_api_access(endpoint, actor, method, response_code) -> str
    def log_data_change(run_id, field, before, after,
                        trade_count_affected) -> str
    def read_events(event_type: EventType | str) -> list[dict]
    def read_events_by_run(event_type, pipeline_run_id) -> list[dict]`),
  H3('Event schema'),
  P('Every event carries the four base fields plus its specific payload:'),
  buildTable(
    [2200, 1400, 5760],
    ['Field', 'Type', 'Notes'],
    [
      ['event_id', 'str (UUID4)', 'Unique per event.'],
      ['timestamp_utc', 'str (ISO 8601)', 'UTC timestamp.'],
      ['event_type', 'str', 'rejection | pipeline_run | api_access | data_change.'],
      ['pipeline_run_id', 'str | null', 'Correlation key across the four streams.'],
    ],
  ),
  Spacer(120),
  H3('Storage'),
  Bullet('One JSONL file per category in outputs/audit/.'),
  Bullet('threading.Lock per category — safe under multi-worker Uvicorn.'),
  Bullet('flush_each_event=true by default — durability over throughput.'),
  Bullet('_to_jsonable() normalises datetime, UUID and set values before json.dumps.'),
);

// --- validator ---
children.push(
  H2('4.2 src/trade_validator.py'),
  P('Applies the 14 RV-XX rules in three cost-ordered groups. A trade that fails ' +
    'any rule is removed from the surviving DataFrame and a rejection event is ' +
    'logged (the FIRST failing rule only).'),
  H3('Public API'),
  ...Code(`class TradeValidator:
    def __init__(config: dict, audit_logger: AuditLogger) -> None
    def validate(df: pl.DataFrame) -> tuple[pl.DataFrame, dict]

def validate_trades(df, config, audit_logger) -> tuple[pl.DataFrame, dict]`),
  H3('Return value'),
  P('validate() returns (valid_df, summary). The summary dict has:'),
  ...Code(`{
  "total_in":        int,
  "total_out":       int,
  "total_rejected":  int,
  "rejected_by_rule": { "RV-01": int, ..., "RV-14": int },
}`),
  H3('Order of evaluation'),
  Numbered('Critical: RV-01 → RV-02 → RV-03 → RV-04 → RV-05 → RV-06'),
  Numbered('Business: RV-07 → RV-08 → RV-09 → RV-10 → RV-11 → RV-12'),
  Numbered('Contextual: RV-13 → RV-14'),
  P('Each group operates on the surviving subset of the previous group.'),
);

// --- generator ---
children.push(
  H2('4.3 src/trade_generator.py'),
  P('Synthetic trades using Faker for human-readable identifiers (TR-####, CP-####) ' +
    'and stdlib random for distributions. Generated data respects the validator ' +
    'catalogs so the bulk of trades pass the 14 rules; null_rate and outlier_rate ' +
    'inject controlled noise.'),
  H3('Public API'),
  ...Code(`def generate_trades(
    n: int = 10_000,
    seed: int = 42,
    null_rate: float = 0.02,
    outlier_rate: float = 0.01,
    config: dict | None = None,
    persist: bool = True,
) -> pl.DataFrame`),
  H3('Output schema'),
  P('All 13 fields with strict types:'),
  ...Code(`trade_id        str  (UUID4)
timestamp       Datetime("us")
instrument      str
asset_class     str
side            str   BUY | SELL
quantity        float
price           float
notional        float (== price * quantity within tolerance)
currency        str   USD | EUR | GBP
counterparty_id str   (nullable)
trader_id       str
venue           str   (nullable)
status          str   executed | pending | cancelled | failed`),
);

// --- extractor ---
children.push(
  H2('4.4 src/trade_extractor.py'),
  P('Three input modes producing the same DataFrame schema. Patito validates ' +
    'column presence and types; per-row business rules are deferred to the validator.'),
  H3('Public API'),
  ...Code(`class TradeSchema(pt.Model):
    """Patito model with all fields Optional — the validator's RV-01
    enforces non-null on required columns."""

def extract_trades(
    config: dict | None = None,
    *,
    mode: str | None = None,
    dataframe: pl.DataFrame | None = None,
    audit: AuditLogger | None = None,
    http_client: HttpClient | None = None,
) -> tuple[pl.DataFrame, dict]`),
  H3('Mode semantics'),
  buildTable(
    [1800, 7560],
    ['Mode', 'Behaviour'],
    [
      ['dataframe', 'Pass-through. Caller supplies an in-memory DataFrame.'],
      ['csv', 'pl.read_csv from config.extractor.csv.path. try_parse_dates=True.'],
      ['api', 'GET to config.extractor.api.url with bearer or api_key auth. ' +
             'http_client kwarg allows injecting a fake client for tests.'],
    ],
  ),
  Spacer(120),
  P('All modes call _normalize() (converts timestamp from Utf8 if needed) and ' +
    '_validate_schema() (runs TradeSchema.validate(df)).'),
);

// --- business + quality ---
children.push(
  H2('4.5 src/business_rules.py'),
  P('Computes the business_report dict. All operations chained on pl.LazyFrame ' +
    'and collected once per section.'),
  H3('Sections produced'),
  Bullet('by_asset_class: total_notional, avg_price, trade_count, buy_pct, sell_pct.'),
  Bullet('risk_distribution: counts in three buckets (high > 1M, medium 100K-1M, low < 100K).'),
  Bullet('top_counterparties: top N by total_volume; nulls excluded.'),
  Bullet('venue_concentration: share of total notional per venue.'),
  Bullet('by_day, by_hour: temporal trade_count + notional rollups.'),
  Bullet('summary: total_trades, total_notional.'),

  H2('4.6 src/data_quality.py'),
  P('Computes the quality_report dict and the 0-100 weighted score.'),
  H3('Components'),
  buildTable(
    [2200, 1600, 5560],
    ['Component', 'Default weight', 'What it measures'],
    [
      ['completeness', '0.30', '1 - (avg pct null across columns).'],
      ['uniqueness',   '0.20', '1 - (duplicate trade_ids / total).'],
      ['consistency',  '0.25', '(rows with |notional - price*qty| <= tol) / total.'],
      ['validity',     '0.15', 'Average pass rate of side, currency, asset_class, status domain checks.'],
      ['outliers',     '0.10', '1 - (IQR outliers / total).'],
    ],
  ),
  Spacer(120),
  P('Final score = 100 × Σ(weight_i × component_i). Weights are configurable.'),
);

// --- transformer ---
children.push(
  H2('4.7 src/trade_transformer.py'),
  P('Glue layer that returns the three reports.'),
  ...Code(`def transform(
    df: pl.DataFrame,
    config: dict,
    audit: AuditLogger,
    pipeline_run_id: str | None = None,
) -> tuple[dict, dict, dict]

def build_audit_report(
    audit: AuditLogger,
    pipeline_run_id: str | None = None,
) -> dict`),
  P('When pipeline_run_id is provided, the audit_report contains only events ' +
    'belonging to that run — built on top of AuditLogger.read_events_by_run().'),
);

// --- runner ---
children.push(
  H2('4.8 src/pipeline_runner.py'),
  P('Sequential orchestrator. Each stage is wrapped with timing and audit ' +
    'logging; failures raise the typed exception PipelineStageError(stage, reason).'),
  H3('Public API'),
  ...Code(`class PipelineStageError(Exception):
    stage: str
    reason: str

def run_pipeline(
    n_trades: int = 10_000,
    mode: str = "dataframe",
    seed: int = 42,
    null_rate: float = 0.02,
    outlier_rate: float = 0.01,
    config: dict | None = None,
    persist_raw: bool = False,
    http_client = None,
) -> dict`),
  H3('Return value'),
  ...Code(`{
  "run_id":              str (UUID4),
  "started_at":          str (ISO),
  "finished_at":         str (ISO),
  "duration_ms":         float,
  "mode":                str,
  "extraction_metadata": dict,
  "validation_summary":  dict,
  "business_report":     dict,
  "quality_report":      dict,
  "audit_report":        dict,
}`),
);

// --- api/schemas ---
children.push(
  H2('4.9 src/api/schemas.py'),
  P('Pydantic v2 models for request and response validation.'),
  buildTable(
    [3000, 6360],
    ['Model', 'Used by'],
    [
      ['RunPipelineRequest', 'POST /pipeline/run body (n_trades, seed, mode, null_rate, outlier_rate).'],
      ['RunPipelineResponse', 'POST /pipeline/run response body.'],
      ['PipelineStatusResponse', 'GET /pipeline/status.'],
      ['PipelineHistoryEntry', 'GET /pipeline/history (list of entries).'],
      ['HealthResponse', 'GET /health.'],
    ],
  ),
  Spacer(120),
  P('Validation enforces: n_trades in [0, 10_000_000], mode literal, ' +
    'null_rate / outlier_rate in [0, 1].'),
);

// --- api/main ---
children.push(
  H2('4.10 src/api/main.py'),
  P('FastAPI app constructed via create_app(config). Application state holds the ' +
    'loaded config, AuditLogger, last_run cache and run history. Two middlewares ' +
    'are installed: CORS (origins from settings) and an audit logger (logs every ' +
    'request to api_access.jsonl after call_next).'),
  H3('Pseudonymization'),
  ...Code(`def _pseudonymize(value, salt) -> str:
    return hashlib.sha256((salt + str(value)).encode()).hexdigest()[:16]

# Applied to:
#   * business_report.top_counterparties[*].counterparty_id  (via /reports/business)
#   * audit/trades events where field == "trader_id" or "counterparty_id"

# Salt source priority:
#   1. os.environ[config.api.pseudonymization.salt_env]
#   2. config.api.pseudonymization.default_salt   (dev only)`),
  PB(),
);

// =====================================================================
// 5. REST API reference
// =====================================================================
children.push(
  H1('5. REST API reference'),
  P('All endpoints return application/json unless noted. Authentication is not ' +
    'enabled in the current version — restrict via reverse proxy in production.'),

  H2('5.1 Endpoints'),
  buildTable(
    [1100, 4000, 4260],
    ['Method', 'Path', 'Purpose'],
    [
      ['POST', '/pipeline/run', 'Trigger a pipeline run.'],
      ['GET',  '/pipeline/status', 'Summary of the most recent run.'],
      ['GET',  '/pipeline/history', 'All runs since the API started.'],
      ['GET',  '/reports/business', 'Latest business report.'],
      ['GET',  '/reports/quality', 'Latest quality report.'],
      ['GET',  '/reports/business/download?format=csv|json', 'Download the business report.'],
      ['GET',  '/reports/quality/download?format=csv|json', 'Download the quality report.'],
      ['GET',  '/audit/trades', 'Rejection events (pseudonymized).'],
      ['GET',  '/audit/pipeline', 'Pipeline-run events.'],
      ['GET',  '/audit/access', 'Per-request API access log.'],
      ['GET',  '/health', 'Liveness probe.'],
    ],
  ),
  Spacer(120),

  H2('5.2 POST /pipeline/run'),
  Bold('Request body'),
  ...Code(`{
  "n_trades":      1000,
  "seed":          42,
  "mode":          "dataframe",
  "null_rate":     0.02,
  "outlier_rate":  0.01
}`),
  Bold('Validation'),
  Bullet('n_trades: int in [0, 10_000_000]'),
  Bullet('seed: int'),
  Bullet('mode: "dataframe" | "csv" | "api"'),
  Bullet('null_rate, outlier_rate: float in [0, 1]'),
  Bold('Response (200)'),
  ...Code(`{
  "run_id":             "9c1b...",
  "started_at":         "2026-05-12T08:00:00+00:00",
  "finished_at":        "2026-05-12T08:00:05+00:00",
  "duration_ms":        5012.3,
  "mode":               "dataframe",
  "validation_summary": { "total_in": 1000, "total_out": 940, ... },
  "quality_score":      92.34
}`),
  Bold('Errors'),
  Bullet('422 — Pydantic validation failure.'),
  Bullet('500 — PipelineStageError; detail contains stage and reason.'),
  Spacer(),

  H2('5.3 GET /reports/business'),
  P('Returns the cached business report from the latest run. 404 when no run has ' +
    'happened yet.'),

  H2('5.4 GET /reports/quality'),
  P('Returns the cached quality report from the latest run. 404 when no run has ' +
    'happened yet.'),

  H2('5.5 GET /reports/{name}/download'),
  P('Query param format=csv|json (default json). CSV is a flat key,value dump ' +
    'suitable for spreadsheets; JSON preserves the original nesting.'),

  H2('5.6 GET /audit/trades'),
  P('Reads outputs/audit/rejections.jsonl and applies pseudonymization to ' +
    'value_received when field is trader_id or counterparty_id.'),

  H2('5.7 GET /audit/pipeline'),
  P('Raw pipeline_run events. Contains stage, status, trades_in, trades_out, ' +
    'duration_ms and pipeline_run_id for grouping.'),

  H2('5.8 GET /audit/access'),
  P('Every HTTP request the API has served (endpoint, actor, method, response_code).'),

  H2('5.9 GET /pipeline/status'),
  ...Code(`{
  "last_run_id":        "9c1b...",
  "last_finished_at":   "2026-05-12T08:00:05+00:00",
  "last_quality_score": 92.34,
  "total_runs":         1
}`),

  H2('5.10 GET /pipeline/history'),
  P('Array of past run summaries (one entry per call to /pipeline/run since the ' +
    'API process started). Lost on restart — see roadmap for durable storage.'),

  H2('5.11 GET /health'),
  ...Code(`{ "status": "ok", "version": "0.1.0" }`),
  PB(),
);

// =====================================================================
// 6. Validation rules (RV-01..RV-14)
// =====================================================================
children.push(
  H1('6. Validation rules'),
  P('All 14 rules in the order they execute. "Scope" indicates whether the rule ' +
    'fires per trade, per group or per batch.'),
  H2('6.1 Critical group'),
  buildTable(
    [900, 1900, 6560],
    ['ID', 'Scope', 'Rule'],
    [
      ['RV-01', 'Per trade', 'All required fields are non-null.'],
      ['RV-02', 'Per trade', 'price > 0 AND quantity > 0.'],
      ['RV-03', 'Per trade', 'side in valid_sides.'],
      ['RV-04', 'Per batch', 'trade_id is unique. Duplicates are ALL rejected.'],
      ['RV-05', 'Per trade', '|notional - price*quantity| <= notional_tolerance.'],
      ['RV-06', 'Per trade', 'now - timestamp_window_days <= timestamp <= now.'],
    ],
  ),
  Spacer(120),
  H2('6.2 Business group'),
  buildTable(
    [900, 1900, 6560],
    ['ID', 'Scope', 'Rule'],
    [
      ['RV-07', 'Per group', 'Quantity respects the lot rule for the asset_class ' +
                              '(equity: integer >= 1; forex: >= 1000; crypto: >= 0.0001; ' +
                              'fixed_income: positive multiple of 1000).'],
      ['RV-08', 'Per group', 'price within ± price_band_pct of reference_prices[instrument].'],
      ['RV-09', 'Per group', 'Sum of notional per trader_id <= max_notional_per_trader_usd; ' +
                              'all the trader’s trades rejected if exceeded.'],
      ['RV-10', 'Per trade', 'currency consistent with asset_class via currency_by_asset_class; ' +
                              'forex uses forex_pair_currencies of the instrument.'],
      ['RV-11', 'Per batch', 'No counterparty’s notional share exceeds ' +
                              'max_counterparty_concentration_pct (default 40%).'],
      ['RV-12', 'Per group', 'venue is null OR in venue_whitelist[asset_class].'],
    ],
  ),
  Spacer(120),
  H2('6.3 Contextual group'),
  buildTable(
    [900, 1900, 6560],
    ['ID', 'Scope', 'Rule'],
    [
      ['RV-13', 'Per batch', 'No (trader_id, instrument, quantity) triple has BOTH BUY and ' +
                              'SELL sides. All matching trades flagged as wash trading.'],
      ['RV-14', 'Per batch', 'For each instrument with >= 4 trades, price within ' +
                              '[Q1 - iqr_factor*IQR, Q3 + iqr_factor*IQR].'],
    ],
  ),
  Spacer(),
  H2('6.4 Audit fields per rejection'),
  P('Every rejected trade produces one rejection event with:'),
  Bullet('trade_id — the failing trade.'),
  Bullet('rule_id — the FIRST RV-XX that flagged the trade.'),
  Bullet('rule_description — human-readable explanation.'),
  Bullet('field — column that triggered the failure.'),
  Bullet('value_received — actual value present in the trade.'),
  Bullet('timestamp_utc — when the rejection was logged.'),
  Bullet('pipeline_run_id — for cross-stream correlation.'),
  PB(),
);

// =====================================================================
// 7. Testing
// =====================================================================
children.push(
  H1('7. Testing'),
  P('165+ tests across unit and integration scopes, all in the tests/ tree. ' +
    'Coverage threshold: 75% (enforced by pyproject.toml fail_under and ' +
    'Codecov project status check).'),
  H2('7.1 Test layout'),
  buildTable(
    [3600, 5760],
    ['File', 'Coverage'],
    [
      ['tests/test_audit.py', 'AuditLogger (4 event types, run-id propagation, readers, robustness).'],
      ['tests/test_validator.py', 'All 14 RV-XX rules + orchestration + audit propagation.'],
      ['tests/test_generator.py', 'Schema, reproducibility, null/outlier rates, domain coherence.'],
      ['tests/test_extractor.py', 'All three modes, schema validation, auth headers, audit on API.'],
      ['tests/test_business_rules.py', 'compute_business_report sections.'],
      ['tests/test_data_quality.py', 'compute_quality_report components + score bounds.'],
      ['tests/test_transformer.py', 'Orchestration + audit_report shape.'],
      ['tests/test_runner.py', 'run_pipeline E2E (dataframe / csv / api), PipelineStageError.'],
      ['tests/test_api_schemas.py', 'Pydantic model validation.'],
      ['tests/test_api.py', 'FastAPI endpoints via TestClient, pseudonymization, middleware.'],
      ['tests/integration/test_pipeline_e2e.py', 'Full flow through the API: run -> reports -> audit.'],
    ],
  ),
  Spacer(),
  H2('7.2 Running'),
  ...Code(`pytest                                  # full suite
pytest tests/test_validator.py          # single module
pytest -m integration                   # end-to-end only
pytest --cov=src --cov-report=html      # HTML coverage report at htmlcov/`),
  H2('7.3 Fixtures and patterns'),
  Bullet('real_cfg (module scope) loads settings.yaml once.'),
  Bullet('cfg (function scope) deep-copies real_cfg into tmp_path so tests do not pollute outputs/.'),
  Bullet('make_trade factory increments an internal counter to give each trade unique ' +
         'trade_id, trader_id, counterparty_id by default.'),
  Bullet('valid_batch helper produces 5 trades so isolated negative tests do not ' +
         'trigger RV-11 concentration cascades.'),
  PB(),
);

// =====================================================================
// 8. CI / CD
// =====================================================================
children.push(
  H1('8. CI / CD'),
  P('GitHub Actions workflow .github/workflows/ci.yml runs on every push to ' +
    'main or dev and on every pull request targeting them.'),
  H2('8.1 Jobs'),
  buildTable(
    [2400, 6960],
    ['Job', 'What it does'],
    [
      ['Lint (ruff)', 'ruff check . with the rule set in pyproject.toml.'],
      ['Test (pytest)', 'pytest with --cov=src; uploads coverage.xml as an artifact ' +
                        'AND to Codecov.'],
      ['Security (bandit)', 'Python AST scan; uploads SARIF to GitHub Code Scanning.'],
      ['Security (semgrep)', 'p/python + p/security-audit + p/owasp-top-ten rule packs; ' +
                              'uploads SARIF.'],
      ['Docker build smoke test', 'docker buildx with cache; runs only when ' +
                                   'Dockerfile + src/ + config/ are present.'],
    ],
  ),
  Spacer(),
  H2('8.2 Branch flow'),
  Numbered('Feature branches start from dev (feat/<name> or chore/<name>).'),
  Numbered('PR -> dev; all 5 CI jobs must pass.'),
  Numbered('Periodic release PR dev -> main consolidates merged features.'),
  Numbered('Dependabot weekly PRs (pip, github-actions, docker) follow the same flow.'),
  H2('8.3 Coverage'),
  Bullet('codecov.yml: project target 75%, patch target 80%, range 70-95%.'),
  Bullet('coverage.xml uploaded via codecov/codecov-action@v4; tokenless works on ' +
         'public repos, CODECOV_TOKEN secret recommended.'),
  PB(),
);

// =====================================================================
// 9. Docker
// =====================================================================
children.push(
  H1('9. Docker'),
  H2('9.1 Image'),
  Bullet('Multi-stage build: python:3.12-slim builder + python:3.12-slim runtime.'),
  Bullet('Non-root user (app, /sbin/nologin shell).'),
  Bullet('Healthcheck via python -c "urllib.request.urlopen(http://localhost:8000/health)".'),
  Bullet('Image labels follow opencontainers spec (title, description, source, licenses).'),
  H2('9.2 docker-compose.yml'),
  ...Code(`services:
  api:
    build: { context: ., dockerfile: Dockerfile }
    ports: ["\${API_PORT:-8000}:8000"]
    environment:
      TRADES_PSEUDO_SALT: "\${TRADES_PSEUDO_SALT:-dev-only-change-me}"
      TRADES_API_TOKEN:   "\${TRADES_API_TOKEN:-}"
    volumes:
      - ./outputs:/app/outputs
      - ./config:/app/config:ro
    healthcheck: ...
    restart: unless-stopped`),
  H2('9.3 Commands'),
  ...Code(`# build + run
docker build -t trade-pipeline:latest .
docker run -p 8000:8000 -e TRADES_PSEUDO_SALT=$(openssl rand -hex 32) \\
  trade-pipeline:latest

# compose
docker compose up -d
docker compose logs -f api
docker compose down`),
  PB(),
);

// =====================================================================
// 10. Security
// =====================================================================
children.push(
  H1('10. Security'),
  H2('10.1 Controls in place'),
  Numbered('Input validation — 14 RV-XX rules gate trades before transformation.'),
  Numbered('Schema validation — Patito enforces structure on extracted data.'),
  Numbered('Pseudonymization — SHA-256(salt + value)[:16] on trader_id and counterparty_id ' +
           'in every public endpoint.'),
  Numbered('Append-only audit — rejections, pipeline events, API access, data changes ' +
           'all written to JSONL files.'),
  Numbered('CI security gates — ruff (security ruleset), bandit (SARIF), semgrep ' +
           '(OWASP top 10), Dependabot alerts + weekly updates.'),
  Numbered('Container hardening — non-root user, read-only config volume, multi-stage build.'),
  H2('10.2 Reporting a vulnerability'),
  P('Use GitHub Private Vulnerability Reporting at ' +
    'https://github.com/AndresFCC96/Trades/security/advisories/new. ' +
    'Do not open a public issue. SLAs are documented in SECURITY.md.'),
  H2('10.3 Out of scope'),
  Bullet('Third-party dependency vulnerabilities — tracked by Dependabot.'),
  Bullet('Physical access to a deployed instance.'),
  Bullet('Denial of service through excessive load — rate limiting is on the roadmap.'),
  PB(),
);

// =====================================================================
// 11. Operations
// =====================================================================
children.push(
  H1('11. Operations'),
  H2('11.1 First-time setup'),
  ...Code(`pip install -r requirements.txt
pytest                                       # smoke test
uvicorn src.api.main:app --reload            # start API on :8000`),
  H2('11.2 Environment variables'),
  buildTable(
    [3000, 6360],
    ['Variable', 'Purpose'],
    [
      ['TRADES_PSEUDO_SALT', 'SHA-256 salt used for pseudonymizing trader_id and counterparty_id. ' +
                              'Fallback: api.pseudonymization.default_salt from settings.yaml.'],
      ['TRADES_API_TOKEN', 'Bearer or API key for the extractor when extractor.mode = "api". ' +
                            'Env var name configurable via api.token_env in settings.'],
      ['CODECOV_TOKEN', 'CI secret used by codecov/codecov-action@v4 for coverage uploads. Optional on public repos.'],
    ],
  ),
  Spacer(),
  H2('11.3 Common issues'),
  buildTable(
    [3400, 5960],
    ['Symptom', 'Likely cause'],
    [
      ['ModuleNotFoundError: No module named "src"',
       'Pytest or uvicorn run from a directory other than the project root.'],
      ['ModuleNotFoundError on fastapi / patito / polars',
       '`pip install -r requirements.txt` not executed in the active venv.'],
      ['Port 8000 already in use',
       'Run `uvicorn src.api.main:app --reload --port 8001`.'],
      ['Coverage check fails the test job in CI with "0%"',
       'Tests collected 0 items. Make sure src/ and tests/ exist in the branch.'],
      ['Codecov badge stays "unknown"',
       'Sign up at codecov.io and add the repo; the badge populates once a coverage ' +
       'report has been uploaded.'],
    ],
  ),
  PB(),
);

// =====================================================================
// 12. Appendix — file inventory
// =====================================================================
children.push(
  H1('12. Appendix'),
  H2('12.1 Inventory of source files'),
  buildTable(
    [3200, 6160],
    ['File', 'Role'],
    [
      ['config/settings.yaml', 'Single source of truth for thresholds and catalogs.'],
      ['src/audit.py', 'AuditLogger + load_config.'],
      ['src/trade_validator.py', '14 RV-XX rules.'],
      ['src/trade_generator.py', 'Synthetic trades with Faker.'],
      ['src/trade_extractor.py', 'csv / api / dataframe modes + Patito.'],
      ['src/business_rules.py', 'business_report.'],
      ['src/data_quality.py', 'quality_report + 0-100 score.'],
      ['src/trade_transformer.py', 'Orchestrates the three reports.'],
      ['src/pipeline_runner.py', 'run_pipeline + PipelineStageError.'],
      ['src/api/schemas.py', 'Pydantic request/response models.'],
      ['src/api/main.py', 'FastAPI app with middleware.'],
      ['conftest.py', 'sys.path adjustment for tests.'],
      ['pyproject.toml', 'ruff, pytest, coverage, bandit configuration.'],
      ['Dockerfile', 'Multi-stage runtime image.'],
      ['docker-compose.yml', 'Local deployment recipe.'],
      ['.github/workflows/ci.yml', 'CI pipeline with 5 jobs.'],
      ['.github/dependabot.yml', 'Weekly dependency updates.'],
      ['codecov.yml', 'Coverage targets and PR comment policy.'],
      ['SECURITY.md', 'Vulnerability reporting + security controls.'],
      ['docs/insomnia/trade-pipeline.json', 'Insomnia collection.'],
    ],
  ),
);

// =====================================================================
// Document assembly
// =====================================================================
const doc = new Document({
  creator: 'Trade Pipeline',
  title: 'Trade Pipeline — Complete Code Documentation',
  description: 'Full reference for the Trade Pipeline project.',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
        quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '2E5C9E' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '404040' },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },  // US Letter
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Trade Pipeline — Documentation', italics: true, color: '888888', size: 18 })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
            new TextRun({ text: ' of ', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
          ],
        })],
      }),
    },
    children,
  }],
});

const outPath = path.resolve(__dirname, '../TradePipeline-Documentation.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, '(', buf.length, 'bytes )');
});
