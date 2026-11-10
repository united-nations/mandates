"""Export source-checked pilot display data; no database writes."""
import argparse
import hashlib
import json
from pathlib import Path
from activity_schema import Evidence, evidence_offsets

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--run',type=Path,default=ROOT / '.cache/paragraph-activity-pilot-v3-20261109')
parser.add_argument('--out-dir',type=Path,default=ROOT / 'website/src/data')
args=parser.parse_args()
RUN=args.run
run=json.loads((RUN/'run.json').read_text())
rows = json.loads((ROOT / '.cache/paragraph-analysis-20261109/sample-paragraphs.json').read_text())
by_id = {r['id']: r for r in rows}
manifest = json.loads((ROOT / 'data/references/paragraph-analysis-sample-20261109.json').read_text())
assert run['document_sample_sha256']==manifest['sampleSymbolSha256']
output = {}
for task in json.loads((RUN / 'tasks.json').read_text()):
    path = RUN / 'results' / (task['custom_id'] + '.json')
    result = json.loads(path.read_text()) if path.exists() else None
    sources = {p['ref']: p['text'] for p in task['input']['target'] + task['input']['context']}
    for pid in task['paragraph_ids']:
        row = by_id[pid]
        ref = 'p' + str(row['position'])
        item = dict(hash=hashlib.sha256(row['text'].encode()).hexdigest(), parser=row['parser_version'], status='validated' if result else 'rejected', reasoning=run['reasoning'], activities=[], spans=[], assignees=[], mentions=[], deliverables=[])
        def span(e, kind, label):
            if not e or e['paragraph_ref'] != ref:
                return
            offsets = evidence_offsets(Evidence(**e), sources)
            start = len(row['text'][:offsets['start']].encode('utf-16-le')) // 2
            end = len(row['text'][:offsets['end']].encode('utf-16-le')) // 2
            item['spans'].append(dict(start=start, end=end, kind=kind, label=label))
        if result:
            parsed = result['parsed']
            for activity in parsed['activities']:
                kind, subtype = activity['activity_type'], activity['activity_subtype']
                label = f'{kind}: {subtype}'.replace('_', ' ')
                item['activities'].append(dict(type=kind, subtype=subtype, actor_types=list(dict.fromkeys(a['entity_type'] or 'unresolved' for a in activity['assignees']))))
                for e in activity['evidence']: span(e, 'activity', label)
                for actor in activity['assignees']:
                    item['assignees'].append(dict(assignee=(actor['evidence'] or {}).get('quote', actor['normalized_name']), assignee_normalized=actor['normalized_name'], assignee_type=actor['entity_type'] or 'unresolved'))
                    span(actor['evidence'], 'assignee', f"Assignee · {actor['normalized_name']} · {actor['entity_type'] or 'unresolved'}")
                for deliverable in activity['deliverables']:
                    item['deliverables'].append(dict(deliverable=deliverable['evidence']['quote'], deliverable_normalized=deliverable['description'], deliverable_type=deliverable['kind']))
                    span(deliverable['evidence'], 'deliverable', f"Output · {deliverable['kind']} · {deliverable['description']}")
                target = activity['institutional_target']
                if target: span(target['evidence'], 'institutional_target', f"Institutional target · {target['normalized_name']}")
            for entity in parsed['mentioned_entities']:
                item['mentions'].append(dict(mentioned_entity=entity['evidence']['quote'], mentioned_entity_normalized=entity['normalized_name'], mentioned_entity_type=entity['entity_type'] or 'unresolved'))
                span(entity['evidence'], 'mention', f"Mentioned · {entity['normalized_name']} · {entity['entity_type'] or 'unresolved'}")
        # Keep each logical target on its fragments, with evidence only where present.
        output[pid] = item
out = args.out_dir
out.mkdir(parents=True,exist_ok=True)
(out / 'paragraph-pilot.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')))
(out / 'paragraph-pilot-sample.json').write_text(json.dumps([d['symbol'] for d in manifest['documents'] if d['is_resolution']], separators=(',', ':')))
print(len(output), 'paragraphs;', (out / 'paragraph-pilot.json').stat().st_size, 'bytes')
