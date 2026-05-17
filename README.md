# Trade Pipeline

Financial trade processing pipeline with rule-based validation,
synthetic data generation, quality metrics, and a REST API.

[![CI](https://github.com/AndresFCC96/Trades/actions/workflows/ci.yml/badge.svg)](https://github.com/AndresFCC96/Trades/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/AndresFCC96/Trades/branch/main/graph/badge.svg)](https://codecov.io/gh/AndresFCC96/Trades)

## Stack

- **Python 3.10+** + **Polars 1.0+** (LazyFrame-first)
- **Patito** for declarative schemas
- **FastAPI + Uvicorn** for the REST API
- **Faker** for synthetic data
- **pytest + pytest-cov** for tests
- **ruff + bandit + semgrep** for lint and security

## Quickstart

```bash
pip install -r requirements.txt
pytest                                       # 165+ tests
uvicorn src.api.main:app --reload            # API on :8000

curl -X POST http://localhost:8000/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"n_trades": 1000, "mode": "dataframe", "seed": 42}'

curl http://localhost:8000/reports/quality
```

## Project layout

```
trade-pipeline/
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
├── outputs/{raw,reports,audit}/  # raw CSV, reports, audit JSONL
├── docs/architecture.md          # diagrams and design decisions
├── docs/insomnia/                # Insomnia collection for the API
├── Dockerfile + docker-compose.yml
└── .github/workflows/ci.yml      # lint + test + bandit + semgrep + docker
```

See [`docs/architecture.md`](docs/architecture.md) for the full picture.

## Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/pipeline/run` | Trigger a pipeline run |
| `GET`  | `/pipeline/status` | Summary of the latest run |
| `GET`  | `/pipeline/history` | All previous runs |
| `GET`  | `/reports/business` | Business report from the latest run |
| `GET`  | `/reports/quality` | Quality report from the latest run |
| `GET`  | `/reports/{name}/download?format=csv\|json` | Download |
| `GET`  | `/audit/trades` | Rejections (SHA-256 pseudonymized) |
| `GET`  | `/audit/pipeline` | Per-stage pipeline events |
| `GET`  | `/audit/access` | API access log |
| `GET`  | `/health` | Liveness probe |

An Insomnia collection covering every endpoint lives at
[`docs/insomnia/trade-pipeline.json`](docs/insomnia/trade-pipeline.json) —
import it via `Application → Preferences → Data → Import Data → From File`.

## Configuration

Everything tunable lives in `config/settings.yaml`. **Zero magic numbers
in code.** Sections:

| Section | Owner |
|---------|-------|
| `validator.critical` | RV-01..RV-06 (per trade) |
| `validator.business` | RV-07..RV-12 (per instrument) |
| `validator.contextual` | RV-13, RV-14 (whole batch) |
| `generator` | catalogs, reference prices, output_dir |
| `extractor` | mode + per-mode config |
| `business_rules` | risk_buckets, top_counterparties |
| `data_quality` | score weights, IQR factor |
| `audit` | JSONL paths, flush policy |
| `api` | host, port, CORS, pseudonymization salt |

## Environment variables

| Variable | Default | Use |
|----------|---------|-----|
| `TRADES_PSEUDO_SALT` | `dev-only-change-me` | SHA-256 salt for pseudonymization |
| `TRADES_API_TOKEN` | (empty) | Bearer / API key for `extractor.mode = api` |

## Docker

```bash
docker build -t trade-pipeline:latest .
docker run -p 8000:8000 \
  -e TRADES_PSEUDO_SALT=$(openssl rand -hex 32) \
  trade-pipeline:latest

# or with compose
docker compose up -d
```

## Testing

```bash
pytest                                   # full suite
pytest tests/test_validator.py           # single module
pytest -m integration                    # end-to-end only
pytest --cov=src --cov-report=html       # coverage HTML report
```

## CI/CD

On every push to `main`/`dev` and every PR, GitHub Actions runs 7 jobs:

1. **Lint** with ruff (E, F, B, S, N, UP rule sets)
2. **Tests** with pytest + coverage (≥ 75% required)
3. **Bandit** SAST + SARIF upload to GitHub Code Scanning
4. **Semgrep** with `p/python`, `p/security-audit`, `p/owasp-top-ten`
5. **Web** — `tsc --noEmit` + Vitest for the `web/` dashboard
6. **Docker build** smoke test
7. **E2E** Playwright smoke flows against a live uvicorn + Vite

Coverage is uploaded to Codecov on every run; see the badge at the top.

### Running the same checks on Jenkins

A [`Jenkinsfile`](Jenkinsfile) at the repo root mirrors the seven GitHub
Actions jobs as a declarative pipeline. Each stage runs in its own Docker
image (`python:3.12-slim`, `node:20-bullseye`, `returntocorp/semgrep`,
`mcr.microsoft.com/playwright`) so the build is hermetic.

**One-time controller setup:**

1. Install the plugins: `docker-workflow`, `git`, `credentials-binding`,
   and `htmlpublisher` (optional, for the rendered Playwright report).
2. The build node must have a Docker daemon (the `Docker build smoke test`
   stage mounts `/var/run/docker.sock`).
3. Add a **Secret text** credential with ID `codecov-token` if you want
   coverage uploaded to Codecov. Without it, the upload step is a no-op.

**Hooking up the repo:**

- *Multibranch Pipeline* job → point at this repository, leave the script
  path as `Jenkinsfile` (default). Jenkins will scan branches and PRs on a
  schedule or webhook.
- *Pipeline from SCM* job → if you prefer a single job, set Definition to
  "Pipeline script from SCM", repository URL, branch `dev`, script path
  `Jenkinsfile`.

The GitHub Actions workflow stays in place; both pipelines can run on the
same commit until you decide which is the source of truth.

## Security

Vulnerability reporting flow and the controls already in place are
documented in [`SECURITY.md`](SECURITY.md).

## License

MIT
