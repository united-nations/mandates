"""Score frozen case labels; semantic accuracy is separate from JSON acceptance."""
import json
from pathlib import Path
OUT=Path(__file__).resolve().parents[4]/'.cache/extraction-experiment-20261110'
def load(p):return json.loads(Path(p).read_text())

def score(version,condition,split):
    gold=load(OUT/f'gold-{split}.json');directory=OUT/'runs'/version/condition/split
    scores=[]
    for ident,g in gold.items():
        p=directory/(ident+'.json')
        if not p.exists():continue
        r=load(p);valid=r['valid'];o=r.get('output',{})
        ts=o.get('tasks',o.get('activities',[]))
        families={t.get('family',t.get('activity_type')) for t in ts}
        actors={a.get('entity_type') for t in ts for a in t.get('actors',t.get('assignees',[])) if (a.get('role')=='implementer' if version!='baseline' else a.get('basis')!='implicit')}
        expected=set(g['implementer_groups']);allowed=set(g.get('optional_implementer_groups',[]))|expected
        required=set(g['required_families']);allowed_families=required|set(g['optional_families'])
        # Resource support may reasonably be operational delivery when provision type is ambiguous.
        family_ok=required<=families<=allowed_families
        if g.get('alternative_family_sets'):family_ok=family_ok or families in [set(s) for s in g['alternative_family_sets']]
        actor_ok=expected<=actors<=allowed
        if g.get('alternative_implementer_group_sets'):actor_ok=actor_ok or actors in [set(s) for s in g['alternative_implementer_group_sets']]
        checks={'valid':valid,'task_presence':valid and bool(ts)==bool(g['max_tasks']),'families':valid and family_ok,'implementer_groups':valid and actor_ok,'task_count':valid and g['min_tasks']<=len(ts)<=g['max_tasks']}
        spans=[t['highlight']['quote'] for t in ts] if version!='baseline' else [e['quote'] for t in ts for e in t['evidence']]
        scores.append(dict(id=ident,**checks,all_core=all(checks.values()),task_count_actual=len(ts),families_actual=sorted(families),implementer_groups_actual=sorted(str(a) for a in actors),display_words=[len(s.split()) for s in spans],cost_usd=r.get('cost_usd',0)))
    metrics={k:sum(int(r[k]) for r in scores) for k in ['valid','task_presence','families','implementer_groups','task_count','all_core']}
    unambiguous=[r for r in scores if not gold[r['id']].get('policy_ambiguous')]
    metrics['unambiguous_cases']=len(unambiguous)
    metrics['unambiguous_all_core']=sum(r['all_core'] for r in unambiguous)
    metrics.update(version=version,condition=condition,split=split,cases=len(scores),total_cost_usd=sum(r['cost_usd'] for r in scores))
    words=sorted(n for r in scores for n in r['display_words'])
    metrics['display_words_median']=words[len(words)//2] if words else None
    return dict(metrics=metrics,cases=scores)
if __name__=='__main__':
    results=[]
    for version in ['baseline','v1','v2','v3','v4']:
        for condition in ['luna-none','luna-medium','luna-high','sol-low','sol-medium','sol-high']:
            for split in ['validation','test']:
                if not (OUT/f'gold-{split}.json').exists():continue
                s=score(version,condition,split)
                if s['metrics']['cases']:results.append(s);print(json.dumps(s['metrics']))
    (OUT/'scores.json').write_text(json.dumps(results,indent=2))
