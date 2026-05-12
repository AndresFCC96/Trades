# Insomnia collection

`trade-pipeline.json` is an Insomnia export covering every endpoint of the
Trade Pipeline REST API.

## Import

1. Open Insomnia.
2. `Application → Preferences → Data → Import Data → From File`.
3. Pick `docs/insomnia/trade-pipeline.json`.
4. A new "Trade Pipeline" workspace appears in the sidebar.

## Environments

| Name              | base_url               | When to use                       |
|-------------------|------------------------|-----------------------------------|
| Local             | http://localhost:8000  | `uvicorn src.api.main:app`        |
| Docker compose    | http://localhost:8000  | `docker compose up -d`            |

Pick the environment from the top dropdown before sending requests.

## Folders

- **Health** — `/health`
- **Pipeline** — `/pipeline/run` (dataframe and csv modes), `/pipeline/status`, `/pipeline/history`
- **Reports** — `/reports/business`, `/reports/quality` and their `download` variants (CSV / JSON)
- **Audit** — `/audit/trades`, `/audit/pipeline`, `/audit/access`

## Recommended workflow

1. Start the API.
2. Send **POST /pipeline/run** (dataframe mode is fastest for smoke tests).
3. Inspect **GET /reports/business** and **GET /reports/quality**.
4. Check **GET /audit/pipeline** to see the four stages with timings.
5. Check **GET /audit/trades** to see what got rejected (with
   `trader_id` and `counterparty_id` pseudonymized).
