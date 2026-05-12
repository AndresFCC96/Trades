# Trade Pipeline

Pipeline de procesamiento de trades financieros con validación por reglas,
generación de datos sintéticos, métricas de calidad y API REST.

[![CI](https://github.com/AndresFCC96/Trades/actions/workflows/ci.yml/badge.svg)](https://github.com/AndresFCC96/Trades/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/AndresFCC96/Trades/branch/main/graph/badge.svg)](https://codecov.io/gh/AndresFCC96/Trades)

## Stack

- **Python 3.10+** + **Polars 1.0+** (LazyFrame-first)
- **Patito** para esquema declarativo
- **FastAPI + Uvicorn** para la API REST
- **Faker** para datos sintéticos
- **pytest + pytest-cov** para tests
- **ruff + bandit + semgrep** para lint y seguridad

## Quickstart

```bash
pip install -r requirements.txt
pytest                                       # 139+ tests
uvicorn src.api.main:app --reload            # API en :8000

curl -X POST http://localhost:8000/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"n_trades": 1000, "mode": "dataframe", "seed": 42}'

curl http://localhost:8000/reports/quality
```

## Estructura

```
trade-pipeline/
├── config/settings.yaml          # todos los umbrales y catálogos
├── src/
│   ├── audit.py                  # AuditLogger transversal (JSONL × 4)
│   ├── trade_validator.py        # 14 reglas RV-XX en 3 grupos
│   ├── trade_generator.py        # Faker + random
│   ├── trade_extractor.py        # csv | api | dataframe + Patito
│   ├── business_rules.py         # business_report
│   ├── data_quality.py           # quality_report (score 0-100)
│   ├── trade_transformer.py      # orquesta los 3 reportes
│   ├── pipeline_runner.py        # run_pipeline + PipelineStageError
│   └── api/{schemas,main}.py     # FastAPI
├── tests/                        # unit + integration
├── outputs/{raw,reports,audit}/  # CSV crudo, reportes, JSONL de auditoría
├── docs/architecture.md          # diagramas y decisiones de diseño
├── Dockerfile + docker-compose.yml
└── .github/workflows/ci.yml      # lint + test + bandit + semgrep
```

Ver [`docs/architecture.md`](docs/architecture.md) para el detalle.

## Endpoints

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `POST` | `/pipeline/run` | Dispara una corrida |
| `GET`  | `/pipeline/status` | Resumen del último run |
| `GET`  | `/pipeline/history` | Todas las corridas |
| `GET`  | `/reports/business` | Business report del último run |
| `GET`  | `/reports/quality` | Quality report del último run |
| `GET`  | `/reports/{name}/download?format=csv\|json` | Descarga |
| `GET`  | `/audit/trades` | Rechazos (con pseudonimización SHA-256) |
| `GET`  | `/audit/pipeline` | Eventos por etapa |
| `GET`  | `/audit/access` | Log de accesos a la API |
| `GET`  | `/health` | Liveness probe |

## Configuración

Todo lo tunable vive en `config/settings.yaml`. **Cero magic numbers en
código.** Secciones:

| Sección | Dueño |
|---------|-------|
| `validator.critical` | RV-01..RV-06 (por trade) |
| `validator.business` | RV-07..RV-12 (por instrumento) |
| `validator.contextual` | RV-13, RV-14 (batch completo) |
| `generator` | catálogos, precios de referencia, output_dir |
| `extractor` | mode + config por modo |
| `business_rules` | risk_buckets, top_counterparties |
| `data_quality` | pesos del score, IQR factor |
| `audit` | rutas de JSONL, flush policy |
| `api` | host, port, CORS, sal de pseudonimización |

## Variables de entorno

| Variable | Default | Uso |
|----------|---------|-----|
| `TRADES_PSEUDO_SALT` | dev-only-change-me | Sal SHA-256 para pseudonimización |
| `TRADES_API_TOKEN` | (vacío) | Bearer/api-key para modo `extractor=api` |

## Docker

```bash
docker build -t trade-pipeline:latest .
docker run -p 8000:8000 \
  -e TRADES_PSEUDO_SALT=$(openssl rand -hex 32) \
  trade-pipeline:latest

# o con compose
docker compose up -d
```

## Testing

```bash
pytest                                   # todos
pytest tests/test_validator.py           # un módulo
pytest -m integration                    # integración e2e
pytest --cov=src --cov-report=html       # con coverage
```

## CI/CD

En cada push a `main`/`develop` y en cada PR, GitHub Actions corre:

1. **Lint** con ruff (E, F, B, S, N, UP)
2. **Tests** con pytest + coverage (≥75% requerido)
3. **Bandit** SAST + sube SARIF a GitHub Code Scanning
4. **Semgrep** con `p/python`, `p/security-audit`, `p/owasp-top-ten`
5. **Docker build** smoke test

## Licencia

MIT — ver [`LICENSE`](LICENSE) (si existe).
