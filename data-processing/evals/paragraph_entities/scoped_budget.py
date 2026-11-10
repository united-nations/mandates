"""Cost the five-year/PPB2027 union from a shared-pool source export.

No database or model calls. Reuses the frozen original UN80 prompt/schema budget
and historical output-length measurement. Uses o200k_base as a tokenizer proxy.
"""
from __future__ import annotations
import argparse
from collections import Counter
import itertools
import json
from pathlib import Path
import tiktoken


def load(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2))


def measure(rows, fixed):
    enc = tiktoken.get_encoding('o200k_base')
    tokens = [len(enc.encode(r['text'], disallowed_special=())) for r in rows]
    intro = None
    original = corrected = requests = target_tokens = 0
    maximum_request_tokens = long_context_requests = long_context_input_tokens = 0
    preceding_parents = Counter()
    nearest = {}
    for i, row in enumerate(rows):
        level = row['level']
        if row['type'] in ('paragraph', 'opening'):
            if intro is None:
                intro = tokens[i]
            else:
                base = fixed + intro + tokens[i] + sum(tokens[max(0, i-5):i]) + 40 + 16 * min(i, 5)
                all_parents = nearest_parent = 0
                if level and level > 1:
                    all_parents = sum(v for k, v in preceding_parents.items() if k < level)
                    eligible = [j for k, j in nearest.items() if k < level]
                    if eligible:
                        nearest_parent = tokens[max(eligible)] + 16
                request_input = base + all_parents
                original += request_input
                maximum_request_tokens = max(maximum_request_tokens, request_input)
                if request_input > 272000:
                    long_context_requests += 1
                    long_context_input_tokens += request_input
                corrected += base + nearest_parent
                requests += 1
                target_tokens += tokens[i]
        if i > 0 and level:
            preceding_parents[level] += tokens[i] + 16
            nearest[level] = i
    return dict(elements=len(rows), requests=requests, source_tokens=sum(tokens),
                target_tokens=target_tokens, input_tokens=original, maximum_request_tokens=maximum_request_tokens,
                long_context_requests=long_context_requests, long_context_input_tokens=long_context_input_tokens,
                nearest_parent_input_tokens=corrected)


def main(args):
    selection = load(args.out / 'selection.json')
    assert selection['scope'].get('registryOnly') is True, 'Mandate registry scope is required'
    contract = load(args.baseline / 'contract.json')
    audit = load(args.baseline / 'baseline-audit.json')
    fixed_prefix = contract['prompt_tokens'] + contract['schema_tokens_estimate']
    documents = {d['symbol']: d for d in selection['documents']}
    measured = []
    with (args.out / 'elements.ndjson').open() as stream:
        rows = (json.loads(line) for line in stream)
        for symbol, group in itertools.groupby(rows, key=lambda r: r['symbol']):
            group = list(group)
            assert documents[symbol]['elements'] == len(group), symbol
            assert len({r['position'] for r in group}) == len(group), symbol
            measured.append({**documents[symbol], **measure(group, fixed_prefix + 16)})
    expected = {d['symbol'] for d in documents.values() if d['available'] and (d['recent_rolling'] or d['recent_calendar'] or d['cited_version'])}
    assert {d['symbol'] for d in measured} == expected
    definitions = {
        'recent_rolling': lambda d: d['recent_rolling'],
        'recent_calendar': lambda d: d['recent_calendar'],
        'ppb2027_only': lambda d: d['cited_ppb_only'],
        'ppb2027_version': lambda d: d['cited_version'],
        'rolling_overlap_ppb': lambda d: d['recent_rolling'] and d['cited_ppb_only'],
        'rolling_union_ppb': lambda d: d['recent_rolling'] or d['cited_ppb_only'],
        'rolling_union_version': lambda d: d['recent_rolling'] or d['cited_version'],
        'calendar_union_ppb': lambda d: d['recent_calendar'] or d['cited_ppb_only'],
        'calendar_union_version': lambda d: d['recent_calendar'] or d['cited_version'],
    }
    totals = {}
    for name, predicate in definitions.items():
        group = [d for d in measured if predicate(d)]
        total = {k: sum(d[k] for d in group) for k in ['elements', 'requests', 'source_tokens', 'target_tokens', 'input_tokens', 'nearest_parent_input_tokens', 'long_context_requests', 'long_context_input_tokens']}
        total['documents'] = len(group)
        total['maximum_request_tokens'] = max((d['maximum_request_tokens'] for d in group), default=0)
        assert total['long_context_requests'] == 0, 'Apply long-context pricing before sharing this estimate'
        citation_key = 'cited_version' if name.endswith('version') else 'cited_ppb_only'
        total['missing_cited_fulltexts'] = sum(predicate(d) and d[citation_key] and not d['available'] for d in documents.values())
        total['cited_without_date'] = sum(d['publication_date'] is None for d in group)
        total['output_tokens_estimate'] = total['requests'] * audit['mean_visible_output_tokens']
        # A sensitivity scenario replaces the echoed-text component of the old mean
        # with this scope's target-text size. It is not a fitted output model.
        total['source_adjusted_output_tokens_sensitivity'] = total['target_tokens'] + total['requests'] * (audit['mean_visible_output_tokens'] - audit['mean_source_tokens'])
        inp, output = total['input_tokens']/1e6, total['output_tokens_estimate']/1e6
        prefix = total['requests'] * fixed_prefix / 1e6
        total['usd'] = dict(
            gpt6_standard=inp*.10 + output*.50,
            gpt6_batch=(inp*.10 + output*.50)/2,
            gpt6_prefix_cached=(inp-prefix)*.10 + prefix*.01 + output*.50,
            gpt6_nearest_parent=total['nearest_parent_input_tokens']/1e6*.10 + output*.50,
            gpt6_additional_1000_reasoning_tokens=total['requests']*1000/1e6*.50,
            gpt56_standard=inp*.20 + output*1.20,
            gpt56_batch=(inp*.20 + output*1.20)/2,
        )
        totals[name] = total
    # Inclusion/exclusion checks: separate cohorts must reconcile to their union.
    for key in ['documents', 'elements', 'requests', 'input_tokens']:
        assert totals['rolling_union_ppb'][key] == totals['recent_rolling'][key] + totals['ppb2027_only'][key] - totals['rolling_overlap_ppb'][key]
    summary = dict(
        scope=selection['scope'], source_executed_at=selection['executedAt'],
        original_repository_commit='a6c56cb6b8ddeebf64b93faa3392c145e3da9592',
        prompt_schema_tokens=fixed_prefix,
        historical_output_tokens_per_request=audit['mean_visible_output_tokens'],
        assumptions=['English semantic fulltext; successful parses only',
                     'Restricted to Mandate Registry membership for the selected PPB version',
                     'Actual PPB citation pattern from website version mapping',
                     'Original per-paragraph prompt layout; approximate component token counts',
                     'No reasoning tokens, retries or regional/provider uplifts',
                     'OpenAI reference prices, not a verified Azure tariff',
                     'Output size is historical saved-output proxy, not GPT-6 usage'],
        totals=totals,
    )
    save(args.out / 'document-budgets.json', measured)
    save(args.out / 'summary.json', summary)
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--baseline', type=Path, required=True)
    main(p.parse_args())
