# syntax=docker/dockerfile:1.7

# =====================================================================
# Stage 1 — builder: instala deps en un prefijo aislado
# =====================================================================
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

# Instala build deps de C (Polars trae wheel; estos son red de seguridad)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# =====================================================================
# Stage 2 — runtime: imagen mínima con usuario no-root
# =====================================================================
FROM python:3.12-slim

LABEL org.opencontainers.image.title="trade-pipeline" \
      org.opencontainers.image.description="Trade pipeline (Polars + FastAPI + Patito)" \
      org.opencontainers.image.source="https://github.com/AndresFCC96/Trades" \
      org.opencontainers.image.licenses="MIT"

# Usuario no-root para reducir blast radius
RUN groupadd --system app && useradd --system --gid app --home /app --shell /sbin/nologin app

WORKDIR /app

# Copia las dependencias del builder
COPY --from=builder /install /usr/local

# Copia el código fuente y la configuración
COPY --chown=app:app src/ ./src/
COPY --chown=app:app config/ ./config/

# Directorios de salida (writable por el user app)
RUN mkdir -p outputs/raw outputs/reports outputs/audit \
    && chown -R app:app outputs/

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request, sys; \
sys.exit(0) if urllib.request.urlopen('http://localhost:8000/health').status == 200 else sys.exit(1)" \
    || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
