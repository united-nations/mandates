"""
Run the Stage 1 extractor end-to-end against the live database:

    uv run python -m report_mandate_links        (from data-processing/)

This module owns the run's lifecycle — environment, connection, output path —
and nothing else; all I/O logic lives in a_extract's boundary functions.

Connection: PIPELINE_DATABASE_URL, loaded from the environment (a repo-root
.env is picked up via python-dotenv). See .env.example for the format. Two
requirements are enforced here rather than defaulted around:

  * The URL must explicitly state sslmode=verify-full. Weaker modes and
    missing modes are refused. The shared validator uses the system CA bundle
    unless the operator supplies sslrootcert explicitly.
  * Port 5432 (direct), not the PgBouncer 6432 the website uses: a batch
    writer wants a direct connection, PgBouncer has shown startup-packet
    incompatibilities with some clients, and every measurement behind this
    extractor's selection constants was taken on 5432. Documented in
    .env.example rather than asserted here — psycopg2 itself may work
    through PgBouncer, so the port is a pinned choice, not an invariant.

The unparsed-notes sidecar goes to data/processed/report_mandate_links/,
one file per run (UTC timestamp in the name), so runs never interleave
their diagnostics.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from utils.database import verified_database_url

from report_mandate_links.a_extract import run_stage1

_ENV_VAR = "PIPELINE_DATABASE_URL"

# report_mandate_links/ -> data-processing/ -> repo root
_REPO_ROOT = Path(__file__).resolve().parents[2]
_SIDECAR_DIR = _REPO_ROOT / "data" / "processed" / "report_mandate_links"


def _database_url() -> str:
    load_dotenv()
    url = os.getenv(_ENV_VAR)
    if not url:
        raise RuntimeError(f"Missing required environment variable: {_ENV_VAR}")
    return verified_database_url(url)


def main() -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    _SIDECAR_DIR.mkdir(parents=True, exist_ok=True)
    unparsed_path = _SIDECAR_DIR / f"unparsed_notes_{stamp}.jsonl"

    conn = psycopg2.connect(_database_url())
    try:
        run_stage1(conn, str(unparsed_path))
        # Echo the durable record just written — operator feedback only; the
        # database row is the record.
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM mandates.sg_report_to_mandate_link_runs "
                "ORDER BY id DESC LIMIT 1"
            )
            columns = [col.name for col in cur.description]
            row = cur.fetchone()
        for name, value in zip(columns, row):
            print(f"{name}: {value}")
        print(f"unparsed sidecar: {unparsed_path}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
