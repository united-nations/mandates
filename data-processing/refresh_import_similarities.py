#!/usr/bin/env python3
"""Scoped import follow-on. Defaults read-only; --apply requires explicit operator gate.
Reuses reviewed complete-series ordering and Levenshtein calculation. Never deletes
unrelated comparisons. Writes an exact SQL rollback before any comparison mutation.
"""
import argparse, collections, gzip, hashlib, importlib.util, json, os, sys
from pathlib import Path
from datetime import datetime
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_batch
from dotenv import load_dotenv
WORKER=Path(__file__).with_name('series_metrics.py')
spec=importlib.util.spec_from_file_location('series_metrics',WORKER);m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
def read(package, name):
 with gzip.open(package/name,'rt') as f:return [json.loads(x) for x in f]
def params(v):
 return [v['symbol'],m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,v['previous_symbol'],v['series_key'],v['un_body'],v['doc_type'],v['publication_date'],v['previous_publication_date'],v['status'],v['similarity'],v['delta'],v['delta_percent'],v['current_hash'],v['previous_hash']]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apply',action='store_true');ap.add_argument('--env-file',required=True);ap.add_argument('--package',type=Path,required=True);ap.add_argument('--output-dir',type=Path,required=True);a=ap.parse_args()
 BASE=a.output_dir;BASE.mkdir(parents=True,exist_ok=True)
 parses=read(a.package,'document_parses.jsonl.gz');candidate=read(a.package,'document_text_metrics.jsonl.gz')
 touched={x['symbol_normalized'] for x in parses if x['lang']=='en'}
 expected={x['symbol_normalized']:x for x in candidate if x['lang']=='en'}
 assert len(touched)==25790 and len(expected)==25640 and set(expected)<=touched, 'Incomplete import package'
 load_dotenv(a.env_file,override=True)
 url=os.getenv('PIPELINE_DATABASE_URL') or os.getenv('DATABASE_URL');assert url
 conn=psycopg2.connect(url);conn.set_session(isolation_level='SERIALIZABLE',readonly=not a.apply)
 with conn,conn.cursor() as c:
  if a.apply:
   # Freeze source generations and metadata while computing/writing.
   # resolution_series is a materialized view: read it in this serializable
   # snapshot; PostgreSQL does not permit LOCK TABLE on materialized views.
   c.execute('SET LOCAL lock_timeout = \'10s\'')
   c.execute('LOCK TABLE digitallibrary.document_files, digitallibrary.document_parses, digitallibrary.document_text_metrics, digitallibrary.documents IN SHARE MODE')
   c.execute('LOCK TABLE digitallibrary.resolution_series_comparisons IN SHARE ROW EXCLUSIVE MODE')
  members=m.fetch_members(c)
  c.execute('SELECT document_symbol FROM digitallibrary.resolution_series GROUP BY document_symbol HAVING count(*)>1')
  duplicates={r[0] for r in c.fetchall()}
  c.execute("SELECT DISTINCT series_key,un_body,doc_type FROM digitallibrary.resolution_series WHERE document_symbol=ANY(%s)",[sorted(duplicates)])
  ambiguous_groups=set(c.fetchall())
  groups=collections.defaultdict(list)
  for x in members:groups[x.series_key,x.un_body,x.doc_type].append(x)
  edges=[]
  for g in groups.values():
   edges.extend([m.Predecessor(x,None,'ambiguous_order') for x in g] if (g[0].series_key,g[0].un_body,g[0].doc_type) in ambiguous_groups else m.resolve_predecessors(g))
  c.execute("SELECT symbol_normalized FROM digitallibrary.resolution_series_comparisons WHERE lang='en' AND text_profile_version=%s AND method_version=%s AND (symbol_normalized=ANY(%s) OR previous_symbol_normalized=ANY(%s))",[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,sorted(touched),sorted(touched)])
  previously_affected={r[0] for r in c.fetchall()}
  affected=[e for e in edges if e.member.symbol in touched|previously_affected or (e.previous and e.previous.symbol in touched)]
  c.execute('''SELECT tm.symbol_normalized,tm.content_sha256,tm.word_count,tm.token_text FROM digitallibrary.document_text_metrics tm JOIN digitallibrary.document_files f USING(symbol_normalized,lang) JOIN digitallibrary.document_parses p USING(symbol_normalized,lang) WHERE tm.lang='en' AND tm.text_profile_version='substantive-v1' AND tm.metric_version='unicode-word-v1' AND f.status='parsed' AND tm.parser_version=p.parser_version AND tm.source_parsed_at=p.parsed_at''')
  metrics={s:m.TextMetric(h,w,t) for s,h,w,t in c.fetchall()}
  if a.apply:
   c.execute("SELECT symbol_normalized,parsed_at FROM digitallibrary.document_parses WHERE lang='en' AND symbol_normalized=ANY(%s)",[sorted(touched)])
   live_generations=dict(c.fetchall())
   expected_generations={r['symbol_normalized']:datetime.fromisoformat(r['parsed_at']) for r in parses if r['lang']=='en'}
   assert live_generations==expected_generations, 'Import parse generation changed/incomplete'
   bad=[s for s,r in expected.items() if metrics.get(s)!=m.TextMetric(r['content_sha256'],r['word_count'],r['token_text'])]
   assert not bad, f'Imported metrics absent/stale/different: {len(bad)} {bad[:5]}'
   assert not ((touched-set(expected)) & set(metrics)), 'No-profile imports retained stale metrics'
  else:
   for s in touched:metrics.pop(s,None)
   metrics.update({s:m.TextMetric(r['content_sha256'],r['word_count'],r['token_text']) for s,r in expected.items()})
  values=[m.comparison_values(e,metrics) for e in affected]
  scope=sorted(v['symbol'] for v in values);assert len(scope)==len(set(scope))
  # Include old edges pointing at imported predecessors, even if no longer members.
  c.execute('''SELECT * FROM digitallibrary.resolution_series_comparisons WHERE lang='en' AND text_profile_version=%s AND method_version=%s AND (symbol_normalized=ANY(%s) OR previous_symbol_normalized=ANY(%s))''',[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,sorted(touched),sorted(touched)])
  columns=[x.name for x in c.description];old=c.fetchall();oldsymbols={r[columns.index('symbol_normalized')] for r in old}
  delete=sorted(oldsymbols-set(scope));allaffected=sorted(set(scope)|oldsymbols)
  # Fetch every existing row that an UPSERT will replace, even if old edge did not touch import.
  c.execute('''SELECT * FROM digitallibrary.resolution_series_comparisons WHERE lang='en' AND text_profile_version=%s AND method_version=%s AND symbol_normalized=ANY(%s)''',[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,allaffected]);old=c.fetchall()
  summary={'mode':'apply' if a.apply else 'plan','imported_documents':len(touched),'complete_series_members':len(edges),'affected_comparisons':len(values),'obsolete_affected_edges':len(delete),'old_rows':len(old),'statuses':dict(collections.Counter(v['status'] for v in values)),'worker_sha256':hashlib.sha256(WORKER.read_bytes()).hexdigest()}
  cache=json.loads((Path(__file__).resolve().parents[1]/'website/src/data/text-metrics-cache.json').read_text())['documents']
  by_symbol={v['symbol']:v for v in values}
  summary['cached_documents']=len(cache)
  summary['cached_documents_with_fresh_metrics']=sum(s in metrics for s in cache)
  summary['cached_scores']=sum(r.get('similarity_to_previous') is not None for r in cache.values())
  summary['cached_scores_now_unavailable']={s:by_symbol.get(s,{}).get('status','outside_affected_scope') for s,r in cache.items() if r.get('similarity_to_previous') is not None and by_symbol.get(s,{}).get('status')!='ready'}
  if a.apply:
   with (BASE/'before.json').open('x') as out:
    json.dump({'columns':columns,'rows':old,'scope':allaffected},out,default=str);out.flush();os.fsync(out.fileno())
   execute_batch(c,m.UPSERT,[params(v) for v in values],page_size=500)
   if delete:c.execute('DELETE FROM digitallibrary.resolution_series_comparisons WHERE lang=\'en\' AND text_profile_version=%s AND method_version=%s AND symbol_normalized=ANY(%s)',[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,delete])
   predicate=c.mogrify("lang='en' AND text_profile_version=%s AND method_version=%s AND symbol_normalized=ANY(%s)",[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,allaffected]).decode()
   snapshot="SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY symbol_normalized),'[]'::jsonb) FROM digitallibrary.resolution_series_comparisons t WHERE "+predicate
   c.execute(snapshot);post=c.fetchone()[0]
   literal=c.mogrify('%s::jsonb',[json.dumps(post)]).decode()
   guard="DO $rollback$ BEGIN IF ("+snapshot+") IS DISTINCT FROM "+literal+" THEN RAISE EXCEPTION 'Comparison rows changed since refresh; rollback refused'; END IF; END $rollback$;"
   rollback=BASE/'rollback.sql'
   with rollback.open('x') as out:
    out.write('BEGIN;\nLOCK TABLE digitallibrary.resolution_series_comparisons IN SHARE ROW EXCLUSIVE MODE;\n')
    out.write(guard+'\n')
    out.write(c.mogrify('DELETE FROM digitallibrary.resolution_series_comparisons WHERE lang=\'en\' AND text_profile_version=%s AND method_version=%s AND symbol_normalized=ANY(%s);',[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,allaffected]).decode()+'\n')
    statement=sql.SQL('INSERT INTO digitallibrary.resolution_series_comparisons ({}) VALUES ({});').format(sql.SQL(',').join(map(sql.Identifier,columns)),sql.SQL(',').join(sql.Placeholder() for _ in columns))
    for row in old:out.write(c.mogrify(statement,row).decode()+'\n')
    out.write('COMMIT;\n');out.flush();os.fsync(out.fileno())
   # Prove every persisted value, not only row counts.
   c.execute("SELECT symbol_normalized,previous_symbol_normalized,comparison_status,similarity,current_content_sha256,previous_content_sha256,series_key,un_body,doc_type,publication_date,previous_publication_date,word_count_delta,word_count_delta_percent FROM digitallibrary.resolution_series_comparisons WHERE symbol_normalized=ANY(%s) AND lang='en' AND text_profile_version=%s AND method_version=%s",[scope,m.TEXT_PROFILE_VERSION,m.METHOD_VERSION])
   actual={row[0]:row[1:] for row in c.fetchall()}
   assert len(actual)==len(values)
   for v in values:
    got=actual[v['symbol']];assert got==(v['previous_symbol'],v['status'],v['similarity'],v['current_hash'],v['previous_hash'],v['series_key'],v['un_body'],v['doc_type'],v['publication_date'],v['previous_publication_date'],v['delta'],v['delta_percent']), (v['symbol'],got)
   if delete:
    c.execute("SELECT count(*) FROM digitallibrary.resolution_series_comparisons WHERE lang='en' AND text_profile_version=%s AND method_version=%s AND symbol_normalized=ANY(%s)",[m.TEXT_PROFILE_VERSION,m.METHOD_VERSION,delete])
    assert c.fetchone()[0]==0
 (BASE/('applied.json' if a.apply else 'plan.json')).write_text(json.dumps(summary,indent=2)+'\n')
 print(json.dumps(summary))
 conn.close()
if __name__=='__main__':main()
