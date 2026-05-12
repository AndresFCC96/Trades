# Architecture

## Flujo de etapas

```
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
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
            └─────────────────┘
```

## Etapas

### 1. Generate (`trade_generator.py`)

Trades sintéticos respetando los catálogos del validador:

- `asset_class` ∈ {equity, forex, crypto, fixed_income}
- `currency` filtrada al dominio global (USD, EUR, GBP)
- Quantities ≥ lote mínimo por asset_class
- Prices ±15% de la referencia (deja aire para la banda ±20% del validator)

Knobs por llamada: `n`, `seed`, `null_rate`, `outlier_rate`.

Persiste en `outputs/raw/trades_<YYYYMMDD_HHMMSS>.csv`.

### 2. Extract (`trade_extractor.py`)

Tres modos, un esquema:

- `csv`: `pl.read_csv` desde disco
- `api`: HTTP GET con auth bearer / api_key; HTTP client inyectable para tests
- `dataframe`: pass-through (modo simulación)

Patito (`TradeSchema`) valida presencia de columnas y tipos. Reglas de
null por fila quedan para RV-01 del validator.

### 3. Validate (`trade_validator.py`)

Tres grupos en orden de costo ascendente:

| Grupo | Reglas | Patrón |
|-------|--------|--------|
| Críticas (RV-01..RV-06) | required fields, positive price/qty, valid side, unique trade_id, notional consistency, timestamp window | por trade |
| Negocio (RV-07..RV-12) | lote por asset_class, banda de precio, cap notional por trader, currency↔asset_class, concentración por contraparte, venue whitelist | por instrumento/grupo |
| Contextuales (RV-13, RV-14) | wash trading, outlier IQR de precio | batch entero |

Un trade que falla cualquier regla se elimina del resultado y se loguea
con la **primera** regla que lo bloqueó en `outputs/audit/rejections.jsonl`.

### 4. Transform (`trade_transformer.py`)

Tres dicts:

- **business_report** (`business_rules.py`)
  - `by_asset_class`: total_notional, avg_price, trade_count, buy_pct, sell_pct
  - `risk_distribution`: high (>1M), medium (100K-1M), low (<100K)
  - `top_counterparties`: top N por volumen
  - `venue_concentration`: share por venue
  - `by_day`, `by_hour`: análisis temporal

- **quality_report** (`data_quality.py`)
  - `completeness`: nulls por columna y %
  - `uniqueness`: duplicados en trade_id
  - `consistency`: |notional - price·qty| <= tolerancia
  - `validity`: dominios (side, currency, asset_class, status)
  - `outliers_detected`: IQR por instrumento
  - `score`: ponderado 0-100

- **audit_report**
  - vista consolidada de los 4 JSONL de auditoría
  - filtrable por `pipeline_run_id`

## Cross-cutting: AuditLogger

JSONL append-only, thread-safe por archivo:

| Archivo | Eventos |
|---------|---------|
| `rejections.jsonl` | trades rechazados con `rule_id`, `field`, `value_received` |
| `pipeline_runs.jsonl` | start/end por etapa con `duration_ms` y `status` |
| `api_access.jsonl` | toda request HTTP a la API |
| `data_changes.jsonl` | transformaciones aplicadas (extension point) |

Cada evento lleva `event_id` (UUID4), `timestamp_utc` (ISO 8601),
`event_type` y `pipeline_run_id` para correlación cruzada.

## Configuración: `settings.yaml`

Fuente única de verdad. Cada sección la consume un solo módulo:

| Módulo | Sección |
|--------|---------|
| `trade_validator.py` | `validator.{critical,business,contextual}` |
| `trade_generator.py` | `generator` |
| `trade_extractor.py` | `extractor` |
| `business_rules.py` | `business_rules` |
| `data_quality.py` | `data_quality` |
| `audit.py` | `audit` |
| `api/main.py` | `api` |

## API

FastAPI app vía `create_app(config)`. Estado en `app.state`:

- `config` — settings cargado
- `audit` — AuditLogger
- `last_run` — último resultado completo (cache en memoria)
- `history` — lista de resúmenes por corrida

**Middleware:**

- CORS — orígenes vienen de `settings.yaml`
- Audit — cada request a `api_access.jsonl` (tras `call_next`)

**Pseudonimización:**

`SHA-256(salt + value)[:16]` aplicada a `trader_id` y `counterparty_id`
en endpoints públicos. Sal: `TRADES_PSEUDO_SALT` o el default de dev.

## Decisiones conscientes y trade-offs

- **Sin DB.** Audit es JSONL en disco — fácil de inspeccionar y shipear.
  Producción: cambiar por Postgres o storage S3-backed (Iceberg/Delta).
- **Cache en memoria.** El último run vive en `app.state`; no sobrevive
  reinicios. Trivial cambiar a Redis.
- **Sin conversión FX.** RV-09/RV-11 suman notionals tal cual; asume
  moneda homogénea o USD-equivalente. Producción: agregar servicio FX.
- **Pipeline síncrono.** 10K trades terminan en segundos. Para batches
  mayores, mover a workers (Celery/Dramatiq) y exponer el reporte cuando
  esté listo.
- **Wash detection exacto.** Mismo trader + instrumento + quantity con
  BUY y SELL. La detección por grafo (offsetting a través de intermedios)
  es otro problema.

## Próximos pasos sugeridos (enterprise)

Ver discusión completa en `docs/enterprise-roadmap.md` (cuando exista):

- Observabilidad: OpenTelemetry + Prometheus + Grafana
- Storage: Postgres para audit, S3 para reports
- Streaming: consumer Kafka para trades en tiempo real
- Auth: OAuth2/JWT + multi-tenancy
- Compliance: retención, immutability del audit log (S3 Object Lock)
- Data quality declarativa con Great Expectations
- Anomaly detection con isolation forest
- GitOps deployment (Helm + ArgoCD)
