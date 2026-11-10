"""Document-grain analytics snapshot, reproducible from a frozen pilot run."""
import argparse
import json
from collections import defaultdict
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
p = argparse.ArgumentParser()
p.add_argument('--run',type=Path,required=True)
p.add_argument('--out',type=Path,required=True)
args=p.parse_args()
load=lambda path:json.loads(path.read_text())
run=load(args.run/'run.json')
tasks=load(args.run/'tasks.json')
rows={r['id']:r for r in load(ROOT/'.cache/paragraph-analysis-20261109/sample-paragraphs.json')}
docs={}
aliases={}
for short,full in load(args.run/'vocabulary.json'):
    aliases[full.casefold()]=short
    aliases[short.casefold()]=short
for task in tasks:
    symbol=task['symbol']
    d=docs.setdefault(symbol,dict(symbol=symbol,body=task['input']['document']['issuer']['normalized_name'],targets=0,validated=0,facets={'actions':set(),'assignees':set(),'tasks':set()}))
    d['targets']+=1
    for pid in task['paragraph_ids']:
        row=rows[pid]
        if row.get('action_verb_normalized') or row.get('action_verb'):
            d['facets']['actions'].add((row.get('action_category') or 'unclear',(row.get('action_verb_normalized') or row['action_verb']).lower()))
    file=args.run/'results'/f"{task['custom_id']}.json"
    if not file.exists():file=args.run/'smoke'/f"{task['custom_id']}.json"
    if not file.exists():continue
    result=load(file)
    d['validated']+=1
    for a in result['parsed']['activities']:
        if a['activity_type']=='substantive':
            types={x['entity_type'] or 'unresolved' for x in a['assignees']}
            implementers=[]
            if types & {'un_organs','un_secretariat','un_system'}:implementers.append('un')
            if 'member_states' in types:implementers.append('member_states')
            if not types or types & {'other','unresolved'}:implementers.append('other')
            for group in implementers:d['facets']['tasks'].add(('substantive',group,a['activity_subtype']))
        else:d['facets']['tasks'].add((a['activity_type'],a['activity_subtype']))
        for actor in a['assignees']:
            name=aliases.get(actor['normalized_name'].casefold(),actor['normalized_name'])
            d['facets']['assignees'].add((actor['entity_type'] or 'unresolved',name))
for d in docs.values():
    d['facets']={key:[list(path) for path in sorted(paths)] for key,paths in d['facets'].items()}
summary=dict(model=run['model'],reasoning=run['reasoning'],sampleHash=run['document_sample_sha256'],sampleDocuments=run['sample_documents'],targets=run['logical_targets'],validated=sum(d['validated'] for d in docs.values()),documents=list(docs.values()))
args.out.parent.mkdir(parents=True,exist_ok=True)
temporary=args.out.with_suffix(args.out.suffix+'.tmp')
temporary.write_text(json.dumps(summary,ensure_ascii=False,separators=(',',':')))
temporary.replace(args.out)
print(len(docs),'documents;',summary['validated'],'validated targets;',args.out.stat().st_size,'bytes')
