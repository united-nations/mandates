"""Frozen operative-only activity pilot: prepare, smoke, Batch submit and collect.

All outputs are local until a validated Batch is explicitly submitted. Credentials
are loaded from an env file and never stored in the run metadata. Document text
is untrusted input; model outputs must validate against frozen source references.
"""
from __future__ import annotations
import argparse,asyncio,csv,hashlib,json,re,time
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
from dotenv import dotenv_values
from openai import AzureOpenAI,AsyncAzureOpenAI
from openai.lib._pydantic import to_strict_json_schema
import tiktoken
from activity_schema import ParagraphActivities,validate_output,ACTIVITY_SUBTYPES

BASE=Path(__file__).resolve().parents[3]
ENC=tiktoken.get_encoding('o200k_base')

def now():return datetime.now(timezone.utc).isoformat()
def load(p):return json.loads(Path(p).read_text())
def save(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 temp=p.with_suffix(p.suffix+'.tmp');temp.write_text(json.dumps(v,ensure_ascii=False,indent=2));temp.replace(p)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def tokens(s):return len(ENC.encode(s,disallowed_special=()))
def issuer(symbol):
 if symbol.startswith('A/HRC/'):return dict(normalized_name='HRC',aliases=['Human Rights Council'])
 if symbol.startswith('A/'):return dict(normalized_name='GA',aliases=['General Assembly'])
 if symbol.startswith('S/'):return dict(normalized_name='SC',aliases=['Security Council'])
 if symbol.startswith('E/'):return dict(normalized_name='ECOSOC',aliases=['Economic and Social Council'])
 raise ValueError('Issuer needs an explicit supported mapping: '+symbol)

def prepare(args):
 source=BASE/'.cache/paragraph-analysis-20261109'
 manifest=load(BASE/'data/references/paragraph-analysis-sample-20261109.json')
 rows=load(source/'sample-paragraphs.json')
 overrides=load(BASE/'data/references/paragraph-operative-eligibility-overrides-20261109.json')
 assert overrides['document_sample_sha256']==manifest['sampleSymbolSha256']
 assert manifest['scope']['registryOnly'] and manifest['scope']['paragraphType']=='operative'
 bydoc=defaultdict(list)
 for row in rows:bydoc[row['symbol']].append(row)
 override_by_doc=defaultdict(dict)
 for o in overrides['overrides']:override_by_doc[o['symbol']][o['primary_position']]=o
 tasks=[];corrections=[]
 for symbol,doc in sorted(bydoc.items()):
  bypos={r['position']:r for r in doc};byid={r['id']:r for r in doc}
  eligible={r['position']:[r] for r in doc if r['type']=='paragraph' and r['paragraph_type']=='operative'}
  for pos,o in override_by_doc[symbol].items():
   fragments=[byid[i] for i in o['source_paragraph_ids']]
   assert [sha(r['text']) for r in fragments]==o['source_text_sha256']
   eligible[pos]=fragments;corrections.append(o)
  heading_rows=[r for r in doc if r['type'] in ('heading','title')]
  title=next((r['text'] for r in doc if r['type']=='title'),heading_rows[0]['text'] if heading_rows else symbol)
  for pos,fragments in sorted(eligible.items()):
   row=bypos[pos];context={};boundary=(row['section'],row['annex_index'],row['text_index'])
   previous=[r for r in doc if r['position']<pos and r['position'] in eligible and (r['section'],r['annex_index'],r['text_index'])==boundary]
   for r in previous[-2:]:context[r['position']]=r
   if (row['level'] or 0)>1:
    parent=next((r for r in reversed(previous) if (r['level'] or 0)<row['level']),None)
    if parent:context[parent['position']]=parent
   for pp in override_by_doc[symbol].get(pos,{}).get('parent_positions',[]):context[pp]=bypos[pp]
   for r in heading_rows:
    if r['position']<pos and (r['section'],r['annex_index'],r['text_index'])==boundary:
     if r['position']>=max((h['position'] for h in heading_rows if h['position']<pos and h['type']=='heading'),default=-1):context[r['position']]=r
   for r in fragments:context.pop(r['position'],None)
   def payload(r):return dict(ref=f"p{r['position']}",text=r['text'])
   body=dict(document=dict(symbol=symbol,title=title,issuer=issuer(symbol)),
             target=[payload(r) for r in fragments],context=[payload(r) for r in sorted(context.values(),key=lambda x:x['position'])])
   task=dict(custom_id=f"a-{sha(symbol+':'+str(pos))[:24]}",symbol=symbol,position=pos,
             paragraph_ids=[r['id'] for r in fragments],source_sha256=sha(json.dumps(body,ensure_ascii=False,sort_keys=True)),
             parser_versions=sorted({r['parser_version'] for r in fragments}),
             eligibility='reviewed_override' if pos in override_by_doc[symbol] else 'stored_operative',input=body)
   tasks.append(task)
 vocabulary=[]
 with (BASE/'data/references/entity_names.tsv').open() as stream:
  for r in csv.DictReader(stream,delimiter='\t'):vocabulary.append([r['entity_short_name'],r['entity_full_name']])
 vocabulary=[['GA','General Assembly'],['SC','Security Council'],['ECOSOC','Economic and Social Council'],['HRC','Human Rights Council'],['UN Secretary-General','Secretary-General'],['HLPF','High-level political forum'],*vocabulary]
 developer=(Path(__file__).with_name('activity_prompt.txt')).read_text()+'\n\nPINNED CANONICAL VOCABULARY (abbreviation, full name; not an exhaustive actor list):\n'+json.dumps(vocabulary,ensure_ascii=False,separators=(',',':'))
 schema=to_strict_json_schema(ParagraphActivities)
 version=sha(developer+json.dumps(schema,sort_keys=True))
 for t in tasks:t['estimated_input_tokens']=tokens(developer)+tokens(json.dumps(schema))+tokens(json.dumps(t['input'],ensure_ascii=False))+20
 forced=[]
 for symbol,position in [('A/RES/48/104',31),('A/RES/48/104',53),('A/RES/48/104',66),('A/RES/48/104',77),('S/PRST/2022/5',17),('S/PRST/2022/5',18),('A/DEC/79/521',2),('E/DEC/2023/306',1)]:
  forced.extend(t['custom_id'] for t in tasks if t['symbol']==symbol and t['position']==position)
 ranked=sorted(tasks,key=lambda t:sha('activity-v2-smoke-20261109'+t['custom_id']))
 smoke_ids=list(dict.fromkeys(forced+[t['custom_id'] for t in ranked]))[:args.smoke_size]
 run=dict(prepared_at=now(),model='gpt-6-luna',reasoning=args.reasoning,max_output_tokens=args.max_output_tokens or (16384 if args.reasoning=='medium' else 8192),scope=manifest['scope'],
          document_sample_sha256=manifest['sampleSymbolSha256'],sample_documents=manifest['sampleDocuments'],
          logical_targets=len(tasks),stored_operative_targets=sum(t['eligibility']=='stored_operative' for t in tasks),
          reviewed_additions=len(corrections),documents_with_targets=len(bydoc),
          prompt_schema_sha256=version,vocabulary_sha256=sha(json.dumps(vocabulary,ensure_ascii=False)),
          developer_tokens=tokens(developer),schema_tokens_estimate=tokens(json.dumps(schema)),
          input_tokens_estimate=sum(t['estimated_input_tokens'] for t in tasks),
          smoke_ids=smoke_ids,semantic_scope='operative only, reviewed source-boundary overrides; no verb extraction')
 if (args.out/'run.json').exists():
  old=load(args.out/'run.json')
  if old['prompt_schema_sha256']!=version or old['reasoning']!=run['reasoning'] or old.get('max_output_tokens',8192)!=run['max_output_tokens']:raise ValueError('Prompt/schema changed; use a new run directory')
 save(args.out/'run.json',run);save(args.out/'schema.json',schema);save(args.out/'tasks.json',tasks)
 save(args.out/'vocabulary.json',vocabulary);(args.out/'developer.txt').write_text(developer)
 save(args.out/'eligibility-corrections.json',corrections)
 print(json.dumps(run,indent=2))

def client(args,async_=False):
 env=dotenv_values(args.env_file)
 cls=AsyncAzureOpenAI if async_ else AzureOpenAI
 return cls(azure_endpoint=env['AZURE_OPENAI_ENDPOINT'],api_key=env['AZURE_OPENAI_API_KEY'],api_version=env.get('AZURE_OPENAI_API_VERSION','2025-03-01-preview'),max_retries=0,timeout=180)

def body(args,task):
 run=load(args.out/'run.json')
 return dict(model=run['model'],reasoning={'effort':run['reasoning']},
             input=[dict(role='developer',content=(args.out/'developer.txt').read_text()),dict(role='user',content=json.dumps(task['input'],ensure_ascii=False,separators=(',',':')))],
             text={'format':{'type':'json_schema','name':'ParagraphActivities','strict':True,'schema':load(args.out/'schema.json')}},max_output_tokens=run.get('max_output_tokens',8192))

def validate_response(response,task):
 if response.get('status')!='completed':raise ValueError('response not completed: '+str(response.get('status')))
 messages=[o for o in response.get('output',[]) if o.get('type')=='message']
 finals=[o for o in messages if o.get('phase')=='final_answer']
 if finals:messages=finals
 texts=[c.get('text','') for o in messages for c in o.get('content',[]) if c.get('type')=='output_text']
 if not texts:raise ValueError('no text output (possible refusal)')
 return validate_output(json.loads(''.join(texts)),task)

async def smoke(args):
 tasks=load(args.out/'tasks.json');run=load(args.out/'run.json')
 phase='results' if args.command=='run' else 'smoke'
 if args.command=='run':
  review=load(args.out/'smoke-review.json')
  assert review['approved_for_remaining_sample'] is True
  assert review['prompt_schema_sha256']==run['prompt_schema_sha256']
 selected=tasks if args.command=='run' else [t for t in tasks if t['custom_id'] in run['smoke_ids']]
 c=client(args,True);sem=asyncio.Semaphore(args.concurrency)
 async def one(t):
  dest=args.out/phase/f"{t['custom_id']}.json"
  if dest.exists():return
  prior=args.out/'smoke'/f"{t['custom_id']}.json"
  if args.command=='run' and prior.exists():
   save(dest,load(prior));return
  async with sem:
   start=time.monotonic()
   try:
    r=await c.responses.create(**body(args,t));raw=r.model_dump()
    save(args.out/('raw-'+phase)/f"{t['custom_id']}.json",raw)
    validated=validate_response(raw,t)
    save(dest,dict(task_id=t['custom_id'],symbol=t['symbol'],position=t['position'],response_id=r.id,model=r.model,usage=r.usage.model_dump(),elapsed_seconds=time.monotonic()-start,**validated))
    print(t['custom_id'],t['symbol'],t['position'],'OK',r.usage.input_tokens,r.usage.output_tokens,flush=True)
   except Exception as e:
    save(args.out/(phase+'-errors')/f"{t['custom_id']}.json",dict(task_id=t['custom_id'],error=type(e).__name__,detail=str(e),status=getattr(e,'status_code',None)))
    print(t['custom_id'],'ERROR',type(e).__name__,str(e)[:120],flush=True)
 await asyncio.gather(*(one(t) for t in selected));await c.close()
 summarize(args,phase)

def summarize(args,phase):
 records=[load(p) for p in sorted((args.out/phase).glob('*.json'))]
 usage=Counter();types=Counter();subtypes=Counter();actors=Counter();ws=0
 for r in records:
  u=r.get('usage',{});usage['input_tokens']+=u.get('input_tokens',0);usage['output_tokens']+=u.get('output_tokens',0)
  usage['cached_tokens']+=(u.get('input_tokens_details') or {}).get('cached_tokens',0)
  usage['reasoning_tokens']+=(u.get('output_tokens_details') or {}).get('reasoning_tokens',0)
  ws+=r.get('whitespace_alignments',0)
  for a in r['parsed']['activities']:
   types[a['activity_type']]+=1;subtypes[a['activity_subtype']]+=1
   for e in a['assignees']:actors[e['entity_type'] or 'unresolved']+=1
 # API usage includes replies rejected by local validation: they are billable.
 raw_dirs=[args.out/('raw-'+phase)]
 if phase=='results':raw_dirs.extend([args.out/'raw-smoke',args.out/'raw-retries'])
 raw_records=[load(p) for directory in raw_dirs for p in directory.glob('*.json')]
 if raw_records:
  usage=Counter()
  for raw in raw_records:
   u=raw.get('usage') or {}
   usage['input_tokens']+=u.get('input_tokens',0);usage['output_tokens']+=u.get('output_tokens',0)
   usage['cached_tokens']+=(u.get('input_tokens_details') or {}).get('cached_tokens',0)
   usage['reasoning_tokens']+=(u.get('output_tokens_details') or {}).get('reasoning_tokens',0)
 report=dict(phase=phase,api_responses=len(raw_records),usage_scope='saved API replies including validation failures; excludes earlier prompt versions',validated_responses=len(records),input_tokens=usage['input_tokens'],output_tokens=usage['output_tokens'],cached_tokens=usage['cached_tokens'],reasoning_tokens=usage['reasoning_tokens'],activity_types=dict(types),activity_subtypes=dict(subtypes),assignee_types=dict(actors),whitespace_alignments=ws,empty_activity_responses=sum(not r['parsed']['activities'] for r in records))
 report['openai_standard_reference_usd']=(usage['input_tokens']-usage['cached_tokens'])*.1/1e6+usage['cached_tokens']*.01/1e6+usage['output_tokens']*.5/1e6
 save(args.out/f'{phase}-summary.json',report);print(json.dumps(report,indent=2))


def submit(args):
 c=client(args);tasks=load(args.out/'tasks.json')
 # A submission receipt is a resumability boundary: never resubmit blindly.
 if (args.out/'batch-submissions.json').exists():raise ValueError('Batch receipts exist; collect/resume instead of resubmitting')
 pending=[t for t in tasks if not (args.out/'smoke'/f"{t['custom_id']}.json").exists()]
 if not args.probe:
  review=load(args.out/'smoke-review.json')
  assert review['approved_for_remaining_sample'] is True
  assert review['prompt_schema_sha256']==load(args.out/'run.json')['prompt_schema_sha256']
 else:pending=pending[:1]
 batches=[];chunk=[];size=0
 for t in pending:
  line=json.dumps(dict(custom_id=t['custom_id'],method='POST',url='/v1/responses',body=body(args,t)),ensure_ascii=False,separators=(',',':'))+'\n'
  n=len(line.encode())
  if chunk and (size+n>40_000_000 or len(chunk)>=1000):batches.append(chunk);chunk=[];size=0
  chunk.append(line);size+=n
 if chunk:batches.append(chunk)
 receipts=[]
 for i,lines in enumerate(batches):
  path=args.out/'batch-inputs'/f"{'probe-' if args.probe else ''}{i:03d}.jsonl";path.parent.mkdir(parents=True,exist_ok=True);path.write_text(''.join(lines))
  with path.open('rb') as file:uploaded=c.files.create(file=file,purpose='batch')
  save(args.out/'uploaded-files'/f'{uploaded.id}.json',dict(file_id=uploaded.id,path=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),requests=len(lines),probe=args.probe))
  batch=c.batches.create(input_file_id=uploaded.id,endpoint='/v1/responses',completion_window='24h',metadata={'pilot':'mandate-registry-activity-v2','probe':str(args.probe).lower()})
  receipts.append(dict(batch=batch.model_dump(),input_file_id=uploaded.id,path=str(path),requests=len(lines),submitted_at=now()))
  save(args.out/('batch-probe.json' if args.probe else 'batch-submissions.json'),receipts)
  print(json.dumps({'id':batch.id,'status':batch.status,'requests':len(lines)}),flush=True)
 c.close()


def collect(args):
 c=client(args);tasks={t['custom_id']:t for t in load(args.out/'tasks.json')}
 receipt_file=args.out/('batch-probe.json' if args.probe else 'batch-submissions.json')
 receipts=load(receipt_file);statuses=[]
 for receipt in receipts:
  batch=c.batches.retrieve(receipt['batch']['id']);statuses.append(batch.model_dump())
  print(json.dumps({'id':batch.id,'status':batch.status,'request_counts':batch.request_counts.model_dump() if batch.request_counts else None}),flush=True)
  if batch.status!='completed':continue
  if batch.output_file_id:
   raw=c.files.content(batch.output_file_id).read();path=args.out/'batch-results'/f'{batch.id}.jsonl';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
   for line in raw.decode().splitlines():
    item=json.loads(line);task=tasks[item['custom_id']]
    try:
     if item.get('error') or item['response']['status_code']!=200:raise ValueError(str(item))
     response=item['response']['body'];valid=validate_response(response,task)
     phase='probe-results' if args.probe else 'results'
     save(args.out/phase/f"{task['custom_id']}.json",dict(task_id=task['custom_id'],symbol=task['symbol'],position=task['position'],model=response.get('model'),usage=response.get('usage',{}),**valid))
    except Exception as e:save(args.out/'batch-validation-errors'/f"{task['custom_id']}.json",dict(error=type(e).__name__,detail=str(e),item=item))
  if batch.error_file_id:
   raw=c.files.content(batch.error_file_id).read();path=args.out/'batch-results'/f'{batch.id}-errors.jsonl';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
 save(args.out/('probe-status.json' if args.probe else 'batch-status.json'),statuses)
 c.close()
 if not args.probe:summarize(args,'results')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['prepare','smoke','run','submit','collect','status']);p.add_argument('--out',type=Path,required=True);p.add_argument('--env-file',type=Path,default=Path('/home/agent/transcripts/.env'));p.add_argument('--concurrency',type=int,default=6);p.add_argument('--probe',action='store_true');p.add_argument('--reasoning',choices=['none','medium'],default='none');p.add_argument('--max-output-tokens',type=int);p.add_argument('--smoke-size',type=int,default=100)
 args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
 if args.command=='prepare':prepare(args)
 elif args.command in ('smoke','run'):asyncio.run(smoke(args))
 elif args.command=='submit':submit(args)
 elif args.command=='status':summarize(args,'results')
 else:collect(args)
