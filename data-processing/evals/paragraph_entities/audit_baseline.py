"""Audit saved GPT-5 outputs and the repository reference labels without API calls."""
import json,re,argparse,statistics
from pathlib import Path
from collections import Counter
from pilot import read_json,write_json,token_count

def strip_marks(s):return re.sub(r'\*|<<|>>|\[\[|\]\]|\{\{|\}\}','',s)
def norm(s):return re.sub(r'\s+',' ',s or '').strip().casefold()
def entity_set(p):
    return {(norm(a.get('assignee_normalized')),norm(a.get('assignee_type'))) for m in p.get('mandates',[]) for a in m.get('assignees',[])}
def run(args):
    root=args.repo/'data/processed/mandates/classification'
    output_lengths=[];source_lengths=[];bad=[];total=0;tp=fp=fn=reference_count=unmatched=0;per_doc=[]
    # Deduplicate repeated saved copies by document and paragraph position/text.
    seen=set()
    for folder in [root/'pred/gpt-5',root/'final']:
        for file in sorted(folder.glob('*.json')):
            data=read_json(file)
            for i,p in enumerate(data):
                key=(file.stem,i,p.get('text'))
                if key in seen or 'mandates' not in p:continue
                seen.add(key);total+=1
                payload={k:p.get(k) for k in ['mandates','textWithHighlights','uncertainties']}
                # Legacy serialization shortened *_quote names; map back to response schema.
                payload=json.loads(json.dumps(payload))
                for m in payload['mandates']:
                    if 'action_verb' in m:m['action_verb_quote']=m.pop('action_verb')
                    for plural,singular in [('assignees','assignee'),('deliverables','deliverable'),('mentioned_entities','mentioned_entity')]:
                        for e in m.get(plural,[]):
                            if singular in e:e[singular+'_quote']=e.pop(singular)
                output_lengths.append(token_count(json.dumps(payload,ensure_ascii=False,separators=(',',':'))))
                source_lengths.append(token_count(p['text']))
                marked=p.get('textWithHighlights')
                if marked and strip_marks(marked)!=p['text']:
                    bad.append(dict(document=file.stem,index=i,whitespace_only=norm(strip_marks(marked))==norm(p['text']),source=p['text'],rendered=strip_marks(marked)))
    for file in sorted((root/'eval').glob('*.json')):
        prediction_file=root/'pred/gpt-5'/file.name
        if not prediction_file.exists():continue
        preds=read_json(prediction_file);reference=read_json(file)
        dtp=dfp=dfn=dn=0
        for i,p in enumerate(reference):
            if 'mandates' not in p:continue
            if i>=len(preds) or preds[i]['text']!=p['text']:unmatched+=1;continue
            ref=entity_set(p);pred=entity_set(preds[i]);dn+=1
            dtp+=len(ref&pred);dfp+=len(pred-ref);dfn+=len(ref-pred)
        tp+=dtp;fp+=dfp;fn+=dfn;reference_count+=dn
        per_doc.append(dict(document=file.stem,paragraphs=dn,tp=dtp,fp=dfp,fn=dfn))
    report=dict(saved_annotated_paragraphs=total,visible_output_tokens=sum(output_lengths),source_tokens=sum(source_lengths),mean_visible_output_tokens=statistics.mean(output_lengths),median_visible_output_tokens=statistics.median(output_lengths),mean_source_tokens=statistics.mean(source_lengths),highlight_text_changes=len(bad),non_whitespace_text_changes=sum(not x['whitespace_only'] for x in bad),reference_paragraphs=reference_count,unmatched_reference_paragraphs=unmatched,assignee_normalized_and_type=dict(tp=tp,fp=fp,fn=fn,precision=tp/(tp+fp),recall=tp/(tp+fn),f1=2*tp/(2*tp+fp+fn)),per_document=per_doc)
    write_json(args.out/'baseline-audit.json',report);write_json(args.out/'baseline-text-changes.json',bad)
    print(json.dumps({k:v for k,v in report.items() if k!='per_document'},indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--out',type=Path,required=True);run(p.parse_args())
