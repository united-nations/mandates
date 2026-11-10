"""Recalculate committed final-test results offline; never sends model requests."""
import json
import tempfile
from pathlib import Path
import score

reference=Path(__file__).resolve().parents[4]/'data/references/extraction-experiment-20261110'
with tempfile.TemporaryDirectory() as td:
    score.OUT=Path(td)
    (score.OUT/'gold-test.json').write_bytes((reference/'gold-test.json').read_bytes())
    pairs=set()
    for line in (reference/'results-final.jsonl').read_text().splitlines():
        r=json.loads(line);version=r.pop('version');condition=r.pop('condition');pairs.add((version,condition))
        p=score.OUT/'runs'/version/condition/'test'/(r['case_id']+'.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(r))
    expected={(s['metrics']['version'],s['metrics']['condition']):s['metrics'] for s in json.loads((reference/'scores.json').read_text()) if s['metrics']['split']=='test'}
    for version,condition in sorted(pairs):
        actual=score.score(version,condition,'test')['metrics']
        assert actual==expected[(version,condition)],(actual,expected[(version,condition)])
        print(version,condition,f"{actual['all_core']}/{actual['cases']} all, {actual['unambiguous_all_core']}/{actual['unambiguous_cases']} excluding scope-policy cases, ${actual['total_cost_usd']:.4f}")
