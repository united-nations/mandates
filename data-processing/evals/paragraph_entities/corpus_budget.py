"""Read-only corpus budget: repeat the actual UN80 request layout using token counts.

Counts text with o200k_base; summing component token counts approximates boundary
merges. Includes the current all-previous-parents bug and a nearest-parent variant.
No LLM calls, database writes, or provider credentials used.
"""
import argparse, json, collections, itertools, time
from pathlib import Path
import psycopg2
from dotenv import dotenv_values
from pilot import ENC, token_count, read_json, write_json

SQL = r"""
WITH catalog AS (
 SELECT upper(regexp_replace(d.ppb_full_document_symbol,'\s','','g')) symbol,
 bool_or(EXISTS(SELECT 1 FROM ppb2026.source_document_citations c
               WHERE c.ppb_full_document_symbol=d.ppb_full_document_symbol)) cited
 FROM public.unified_documents d GROUP BY 1
)
SELECT dp.symbol_normalized,c.cited,dp.position,dp.type,dp.level,dp.text
FROM digitallibrary.document_paragraphs dp JOIN catalog c ON c.symbol=dp.symbol_normalized
WHERE dp.lang='en' AND dp.type IN ('paragraph','heading','title','opening','table')
AND EXISTS (SELECT 1 FROM digitallibrary.document_files f
 WHERE f.symbol_normalized=dp.symbol_normalized AND f.lang=dp.lang AND f.status='parsed')
ORDER BY dp.symbol_normalized,dp.position
"""

def main(args):
    contract=read_json(args.out/'contract.json')
    fixed=contract['prompt_tokens']+contract['schema_tokens_estimate']+16
    totals={};docstats=[];before=time.monotonic()
    # This entry point is run from the evaluation directory, so add the pipeline
    # root before importing its shared connection validation.
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from utils.database import verified_database_url
    conn=psycopg2.connect(verified_database_url(dotenv_values(args.env_file)['DATABASE_URL']));conn.set_session(readonly=True)
    with conn.cursor(name='entity_budget') as cur:
        cur.itersize=3000;cur.execute(SQL)
        for symbol,rows in itertools.groupby(cur,lambda r:r[0]):
            rows=list(rows);cited=rows[0][1]
            toks=[token_count(r[5]) for r in rows]
            intro=None;request_tokens=corrected_tokens=requests=target_tokens=0
            shallower=collections.Counter();nearest={}
            for i,r in enumerate(rows):
                typ,level=r[3],r[4]
                if typ in ('paragraph','opening'):
                    if intro is None:intro=toks[i]
                    else:
                        # Prompt components correspond to get_prompts in original repository.
                        base=fixed+intro+toks[i]+sum(toks[max(0,i-5):i])+40+16*min(i,5)
                        parents=0;nearest_parent=0
                        if level and level>1:
                            parents=sum(v for k,v in shallower.items() if k<level)
                            eligible=[j for k,j in nearest.items() if k<level]
                            if eligible:nearest_parent=toks[max(eligible)]+16
                        request_tokens+=base+parents;corrected_tokens+=base+nearest_parent
                        target_tokens+=toks[i];requests+=1
                # The source loop uses range(i, 0, -1), excluding index zero.
                if i>0 and level:
                    shallower[level]+=toks[i]+16;nearest[level]=i
            docstats.append(dict(symbol=symbol,cited=cited,elements=len(rows),requests=requests,text_tokens=sum(toks),target_tokens=target_tokens,input_tokens_estimate=request_tokens,nearest_parent_input_tokens_estimate=corrected_tokens,characters=sum(len(r[5]) for r in rows)))
            if len(docstats)%2500==0:print('documents',len(docstats),'elapsed',round(time.monotonic()-before),flush=True)
    conn.close()
    for cited in (True,False):
        group=[d for d in docstats if d['cited']==cited]
        totals[str(cited)]={'documents':len(group),**{k:sum(d[k] for d in group) for k in ['elements','requests','text_tokens','target_tokens','input_tokens_estimate','nearest_parent_input_tokens_estimate','characters']}}
    write_json(args.out/'corpus-document-budgets.json',docstats);write_json(args.out/'corpus-budget.json',totals)
    print(json.dumps(totals,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--env-file',type=Path,required=True);main(p.parse_args())
