"""
src/trade_generator.py
======================
Generación de trades sintéticos con Faker + random.

Por diseño, los datos generados respetan los catálogos y bandas del
validador (asset_class → instrumentos, monedas válidas, lote mínimo,
banda de precio ±20%) para que la mayoría de trades pasen las reglas.
Los `null_rate` y `outlier_rate` introducen ruido controlado para probar
robustez del validador y de la capa de calidad.

Persiste en `outputs/raw/trades_<YYYYMMDD_HHMMSS>.csv`.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import polars as pl
from faker import Faker

from src.audit import load_config

logger = logging.getLogger(__name__)


_TRADE_SCHEMA: dict[str, pl.DataType] = {
    "trade_id": pl.Utf8,
    "timestamp": pl.Datetime("us"),
    "instrument": pl.Utf8,
    "asset_class": pl.Utf8,
    "side": pl.Utf8,
    "quantity": pl.Float64,
    "price": pl.Float64,
    "notional": pl.Float64,
    "currency": pl.Utf8,
    "counterparty_id": pl.Utf8,
    "trader_id": pl.Utf8,
    "venue": pl.Utf8,
    "status": pl.Utf8,
}


def generate_trades(
    n: int = 10_000,
    seed: int = 42,
    null_rate: float = 0.02,
    outlier_rate: float = 0.01,
    config: dict[str, Any] | None = None,
    persist: bool = True,
) -> pl.DataFrame:
    """Genera `n` trades sintéticos.

    Args:
        n: cantidad de trades.
        seed: semilla compartida por random y Faker.
        null_rate: proporción de nulos en campos nullable (counterparty_id, venue).
        outlier_rate: proporción de outliers en price o quantity.
        config: settings dict; si None, se carga config/settings.yaml.
        persist: si True, escribe CSV en `generator.output_dir`.

    Returns:
        pl.DataFrame con esquema fijo (ver `_TRADE_SCHEMA`).
    """
    cfg = config if config is not None else load_config()
    gen = cfg["generator"]

    instruments: dict[str, list[str]] = gen["instruments"]
    refs: dict[str, float] = gen["reference_prices"]
    forex_pairs: dict[str, list[str]] = gen["forex_pair_currencies"]
    venues: dict[str, list[str]] = cfg["validator"]["business"]["venue_whitelist"]
    statuses: list[str] = cfg["validator"]["critical"]["valid_statuses"]
    valid_currencies = set(cfg["validator"]["critical"]["valid_currencies"])
    window_days = cfg["validator"]["critical"]["timestamp_window_days"]
    window_seconds = window_days * 86_400

    # Synthetic data only — pseudo-randomness is intentional (reproducibility via seed).
    rng = random.Random(seed)  # noqa: S311  # nosec B311
    fake = Faker()
    fake.seed_instance(seed)

    asset_classes = list(instruments.keys())
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    rows: list[dict[str, Any]] = []
    for _ in range(n):
        ac = rng.choice(asset_classes)
        instr = rng.choice(instruments[ac])
        ref = refs[instr]

        # Precio realista dentro de ±15% de la referencia (deja aire para la
        # banda ±20% del validador). El outlier_rate lo saca de la banda.
        price = ref * rng.uniform(0.85, 1.15)

        # Quantity coherente con el lote mínimo del asset_class
        if ac == "equity":
            qty = float(rng.randint(1, 10_000))
        elif ac == "forex":
            qty = float(rng.randint(1_000, 100_000))
        elif ac == "crypto":
            qty = round(rng.uniform(0.001, 50.0), 6)
        else:  # fixed_income — múltiplos de 1.000
            qty = float(rng.randint(1, 100) * 1_000)

        # Inyección de outlier en price o quantity
        if rng.random() < outlier_rate:
            if rng.random() < 0.5:
                price *= rng.uniform(2.5, 5.0)
            else:
                qty *= rng.uniform(2.5, 5.0)

        price = round(price, 4)
        notional = round(price * qty, 4)

        side = rng.choice(["BUY", "SELL"])

        # Currency consistente con asset_class y dentro del dominio global
        if ac == "forex":
            pair_allowed = [c for c in forex_pairs[instr] if c in valid_currencies]
            currency = rng.choice(pair_allowed) if pair_allowed else "USD"
        elif ac == "crypto":
            currency = "USD"
        else:
            currency = rng.choice(["USD", "EUR"])

        # Venue (nullable por spec)
        venue: str | None = rng.choice(venues[ac])
        if rng.random() < null_rate:
            venue = None

        # Counterparty (nullable por spec) — vía Faker para variedad
        counterparty_id: str | None = fake.bothify("CP-####")
        if rng.random() < null_rate:
            counterparty_id = None

        # Trader id (no nullable) — vía Faker
        trader_id = fake.bothify("TR-####")

        # Timestamp dentro de la ventana
        ts = now - timedelta(seconds=rng.randint(0, window_seconds))

        # Status mayormente "executed"
        status = rng.choices(statuses, weights=[0.85, 0.05, 0.05, 0.05], k=1)[0]

        rows.append({
            "trade_id": str(uuid4()),
            "timestamp": ts,
            "instrument": instr,
            "asset_class": ac,
            "side": side,
            "quantity": qty,
            "price": price,
            "notional": notional,
            "currency": currency,
            "counterparty_id": counterparty_id,
            "trader_id": trader_id,
            "venue": venue,
            "status": status,
        })

    df = pl.DataFrame(rows, schema=_TRADE_SCHEMA)

    if persist:
        output_dir = Path(gen["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = gen["filename_pattern"].format(timestamp=ts_str)
        output_path = output_dir / filename
        df.write_csv(output_path)
        logger.info("generator wrote %d rows to %s", n, output_path)

    return df
