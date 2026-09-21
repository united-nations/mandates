#!/usr/bin/env python3
"""Compatibility entry point; metrics belong to documents.unfck.org."""
import os
import runpy
from pathlib import Path

pipeline = Path(os.environ.get("DOCUMENTS_PIPELINE_ROOT", str(Path(__file__).resolve().parents[2] / "documents.unfck.org/data-pipeline")))
implementation = pipeline / "pipeline/resolutions/similarity.py"
if not implementation.is_file():
    raise RuntimeError("Set DOCUMENTS_PIPELINE_ROOT to the documents data-pipeline directory")
globals().update({k: v for k, v in runpy.run_path(str(implementation)).items() if not k.startswith("__")})
if __name__ == "__main__":
    raise SystemExit(main())
