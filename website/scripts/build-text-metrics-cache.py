#!/usr/bin/env python3
"""Build a bounded, provisional retained-text metric cache; never write to the DB.

Use the Documents environment (or uv run --with rapidfuzz) with --documents-repo.
Source accounting compares persisted raw extraction with semantic elements, not
original files. All output remains provisional pending original-source validation.
"""
from __future__ import annotations
import argparse
import copy
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def sql_from(path: Path) -> str:
    source = path.read_text().split('`')
    if len(source) != 3 or '${' in source[1]:
        raise ValueError(f'Expected one literal SQL template: {path}')
    return source[1].replace('$1', '%s').replace('$2', '%s')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--documents-repo', required=True, type=Path)
    parser.add_argument('--env-file', type=Path)
    parser.add_argument('--symbols', nargs='+', required=True)
    parser.add_argument('--series', nargs='*', default=[])
    parser.add_argument('--output', type=Path)
    parser.add_argument('--audit-dir', type=Path, help='Optional untracked raw snapshots and reproducibility inputs')
    args = parser.parse_args()
    website = Path(__file__).resolve().parents[1]
    output = args.output or website / 'src/data/text-metrics-cache.json'
    sys.path.insert(0, str(args.documents_repo.resolve() / 'python'))
    from dotenv import load_dotenv
    load_dotenv(args.env_file or website.parent / '.env', override=True)
    from fulltext_common import get_conn
    from fulltext_metrics import build_metric, SemanticElement, TEXT_PROFILE_VERSION, METRIC_VERSION
    from fulltext_parse import _check_accounting, check_word_accounting
    from rapidfuzz.distance import Levenshtein
    revision = subprocess.check_output(['git', '-C', str(args.documents_repo), 'rev-parse', 'HEAD'], text=True).strip()
    requested = {''.join(s.split()).upper() for s in args.symbols}
    series = {''.join(s.split()).upper() for s in args.series}
    snapshot_sql = sql_from(website / 'src/lib/data/retained-text-sql.ts')
    metrics_sql = sql_from(website / 'src/lib/data/text-metrics-sql.ts')
    with get_conn() as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        with conn.cursor() as cur:
            if series:
                cur.execute('''SELECT DISTINCT rs.document_symbol
                  FROM digitallibrary.resolution_series rs
                  JOIN digitallibrary.resolution_series target
                    ON rs.series_key=target.series_key AND rs.un_body=target.un_body
                    AND rs.doc_type=target.doc_type
                  WHERE target.document_symbol=ANY(%s)''', [sorted(series)])
                requested.update(row[0] for row in cur.fetchall())
            cur.execute(metrics_sql, [sorted(requested)])
            columns = [d.name for d in cur.description]
            edges = {row[0]: dict(zip(columns, row)) for row in cur.fetchall()}
            predecessors = {r['previous_document_symbol'] for r in edges.values() if r['previous_document_symbol']}
            scope = requested | predecessors
            cur.execute(snapshot_sql, [sorted(scope), True])
            snapshots = {symbol: (fingerprint, snapshot) for symbol, fingerprint, snapshot in cur.fetchall()}
    documents, rejected, metrics = {}, {}, {}
    for symbol, (fingerprint, snapshot) in snapshots.items():
        elements, raw = snapshot['elements'], snapshot['raw']
        issues = snapshot['issues'] or []
        source_only = bool(issues) and all(i.get('problem') == 'source_unreadable' and 'FileNotFoundError:' in i.get('text_head', '') for i in issues)
        if snapshot['status'] not in ('parsed', 'parse_failed'):
            rejected[symbol] = 'no_accepted_or_missing_source_parse'
            continue
        if issues and not source_only:
            rejected[symbol] = 'quality_issues: ' + json.dumps(issues)
            continue
        if snapshot['status'] == 'parse_failed' and (not source_only or not (snapshot.get('error') or '').startswith('source_unreadable: FileNotFoundError:')):
            rejected[symbol] = 'failure_not_missing_original_only'
            continue
        if not elements or not raw or snapshot['element_count'] != len(elements):
            rejected[symbol] = 'missing_raw_or_semantic_or_count_mismatch'
            continue
        if any(e['parser_version'] != snapshot['parser_version'] for e in elements):
            rejected[symbol] = 'parser_version_mismatch'
            continue
        result = {'elements': copy.deepcopy(elements), 'dropped': snapshot['dropped'] or []}
        position_error = _check_accounting(result, raw)
        missing_words = check_word_accounting(result, raw)
        if position_error or missing_words:
            rejected[symbol] = json.dumps({'accounting': position_error, 'missing_words': missing_words})
            continue
        metric = build_metric(SemanticElement(e['type'], e['text']) for e in elements)
        if metric is None:
            rejected[symbol] = 'no_substantive_text'
            continue
        metrics[symbol] = metric
        edge = edges.get(symbol, {})
        documents[symbol] = {
            'source_fingerprint': fingerprint,
            'content_sha256': metric.content_sha256,
            'word_count': metric.word_count,
            'previous_document_symbol': edge.get('previous_document_symbol'),
            'similarity_to_previous': None,
            'previous_content_sha256': None,
            'comparison_status': edge.get('comparison_unavailable_reason', 'dependency_only'),
            'evidence': {
                'qualification': 'provisional_retained_text',
                'original_source_verified': False,
                'source': 'digitallibrary.document_paragraphs',
                'parser_version': snapshot['parser_version'],
                'ledger_status': snapshot['status'],
                'source_missing_only': source_only,
                'raw_positions': len(raw), 'semantic_elements': len(elements),
                'position_and_overreach_check': 'pass', 'word_deficit_check': 'pass',
            },
        }
    for symbol, document in documents.items():
        previous = document['previous_document_symbol']
        if previous and previous in metrics:
            document['similarity_to_previous'] = float(Levenshtein.normalized_similarity(metrics[previous].token_text.split(), metrics[symbol].token_text.split()))
            document['previous_content_sha256'] = metrics[previous].content_sha256
            document['comparison_status'] = 'ready_provisional'
        elif previous:
            document['comparison_status'] = 'missing_predecessor_text'
    payload = {
        'version': 'retained-dl-v1',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'documents_revision': revision,
        'text_profile_version': TEXT_PROFILE_VERSION,
        'metric_version': METRIC_VERSION,
        'method_version': 'token-levenshtein-v1',
        'documents': documents, 'rejected': rejected,
    }
    if args.audit_dir:
        args.audit_dir.mkdir(parents=True, exist_ok=True)
        (args.audit_dir / 'snapshots.json').write_text(json.dumps(snapshots, indent=2, sort_keys=True))
        (args.audit_dir / 'manifest.json').write_text(json.dumps({
            'first_symbols': args.symbols, 'series_symbols': args.series,
            'requested': sorted(requested), 'scope': sorted(scope),
            'documents_revision': revision,
        }, indent=2, sort_keys=True))
        (args.audit_dir / 'token-inputs.json').write_text(json.dumps({
            symbol: {'tokens': metric.token_text.split(), 'content_sha256': metric.content_sha256,
                     'word_count': metric.word_count,
                     'previous': documents[symbol]['previous_document_symbol'],
                     'distance': Levenshtein.distance(metrics[documents[symbol]['previous_document_symbol']].token_text.split(), metric.token_text.split())
                      if documents[symbol]['previous_document_symbol'] in metrics else None}
            for symbol, metric in metrics.items()
        }, indent=2, sort_keys=True))
        (args.audit_dir / 'cache.json').write_text(json.dumps(payload, indent=2, sort_keys=True))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    print(json.dumps({'requested': len(requested), 'scope':len(scope), 'qualified':len(documents), 'rejected':rejected,
       'targets':{s: {k:documents[s][k] for k in ('word_count','previous_document_symbol','similarity_to_previous','comparison_status')} if s in documents else rejected.get(s) for s in sorted(requested)}}, indent=2))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
