"""Resumable Azure comparison with a shared locked USD25 reservation ledger.

Unknown-outcome requests retain the full reservation. No automatic retries.
No external tools are sent. All input is bounded below 272k tokens.
"""
from __future__ import annotations
import argparse,asyncio,fcntl,hashlib,json,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from dotenv import dotenv_values
from openai import AsyncAzureOpenAI
from openai.lib._pydantic import to_strict_json_schema
from activity_pilot import validate_response
from schema import Extraction,validate
from schema_v1 import validate as validate_v1

BASE=Path(__file__).resolve().parents[4]
OUT=BASE/'.cache/extraction-experiment-20261110'
RATES={'gpt-6-luna':(.10,.50),'gpt-6.1-sol':(2.,10.)}
CONDITIONS={'luna-none':('gpt-6-luna','none'),'luna-medium':('gpt-6-luna','medium'),'luna-high':('gpt-6-luna','high'),'sol-low':('gpt-6.1-sol','low'),'sol-medium':('gpt-6.1-sol','medium'),'sol-high':('gpt-6.1-sol','high')}

def load(p):return json.loads(Path(p).read_text())
def save(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(v,ensure_ascii=False,indent=2));tmp.replace(p)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def reserve(key,amount,record=None):
 with (OUT/'ledger.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  p=OUT/'ledger.json';ledger=load(p) if p.exists() else {'cap_usd':25,'safety_multiplier':1.25,'rates_per_million':RATES,'requests':{}}
  if record is None:
   if key in ledger['requests']:raise ValueError('request already charged/reserved; no automatic retry: '+key)
   total=sum(r['charged_bound_usd'] for r in ledger['requests'].values())
   if total+amount>ledger['cap_usd']:raise ValueError('USD25 cap would be exceeded')
   ledger['requests'][key]={'status':'reserved','charged_bound_usd':amount,'reserved_usd':amount}
  else:ledger['requests'][key].update(record)
  save(p,ledger)

async def run(args):
 cases=[c for c in load(OUT/'cases.json') if c['split']==args.split and (not args.ids or c['id'] in args.ids.split(','))]
 if args.version=='baseline':
  old=BASE/'data/references/extraction-experiment-20261110';prompt=(old/'baseline-developer.txt').read_text();schema=load(old/'baseline-schema.json')
 else:
  prompt=Path(__file__).with_name('prompt-'+args.version+'.txt').read_text()
  schema=load(Path(__file__).with_name('schema-v1.json')) if args.version=='v1' else to_strict_json_schema(Extraction)
 condition=args.condition;model,reasoning=CONDITIONS[condition]
 maxout=12288 if reasoning=='high' else 8192
 config={'prompt':prompt,'schema':schema,'model':model,'reasoning':reasoning,'max_output_tokens':maxout}
 versionhash=sha(json.dumps(config,sort_keys=True));dest=OUT/'runs'/args.version/condition/args.split
 if (dest/'config.json').exists():assert load(dest/'config.json')=={**config,'sha256':versionhash}
 save(dest/'config.json',{**config,'sha256':versionhash})
 if args.split=='test':
  freeze=load(OUT/'final-freeze.json');assert args.version in freeze['versions']
  assert freeze['cases_sha256']==sha((OUT/'cases.json').read_text())
  assert freeze['test_gold_sha256']==sha((OUT/'gold-test.json').read_text())
  assert freeze['versions'][args.version]==sha(prompt+json.dumps(schema,sort_keys=True))
 env=dotenv_values(args.env_file)
 client=AsyncAzureOpenAI(azure_endpoint=env['AZURE_OPENAI_ENDPOINT'],api_key=env['AZURE_OPENAI_API_KEY'],api_version=env.get('AZURE_OPENAI_API_VERSION','2025-03-01-preview'),max_retries=0,timeout=180)
 sem=asyncio.Semaphore(args.concurrency)
 async def one(c):
  p=dest/(c['id']+'.json')
  if p.exists():return
  async with sem:
   body=dict(model=model,reasoning={'effort':reasoning},input=[dict(role='developer',content=prompt),dict(role='user',content=json.dumps(c['input'],ensure_ascii=False))],text={'format':{'type':'json_schema','name':'MandateTasks','strict':True,'schema':schema}},max_output_tokens=maxout,store=False)
   input_bound=len(json.dumps(body,ensure_ascii=False).encode())+1024
   assert input_bound<272000
   reserve_usd=(input_bound*RATES[model][0]+maxout*RATES[model][1])/1e6*1.25
   key='/'.join([args.version,condition,args.split,c['id']]);reserve(key,reserve_usd)
   start=time.monotonic();record={'case_id':c['id'],'source_sha256':c['source_sha256'],'config_sha256':versionhash}
   try:
    response=await client.responses.create(**body);raw=response.model_dump();save(dest/'raw'/(c['id']+'.json'),raw)
    u=raw.get('usage') or {};cost=(u.get('input_tokens',0)*RATES[model][0]+u.get('output_tokens',0)*RATES[model][1])/1e6
    charge=cost*1.25 if u.get('input_tokens') is not None else reserve_usd
    reserve(key,0,{'status':raw.get('status'),'usage':u,'uncached_list_cost_usd':cost,'charged_bound_usd':charge,'response_model':raw.get('model')})
    record['usage']=u;record['cost_usd']=cost
    if raw.get('status')!='completed':raise ValueError('Incomplete response '+str(raw.get('incomplete_details')))
    if args.version=='baseline':record['output']=validate_response(raw,{'input':c['input']})['parsed']
    else:
     msgs=[o for o in raw['output'] if o.get('type')=='message'];final=[o for o in msgs if o.get('phase')=='final_answer'];msgs=final or msgs
     text=''.join(t['text'] for m in msgs for t in m['content'] if t['type']=='output_text')
     record['output']=(validate_v1 if args.version=='v1' else validate)(json.loads(text),c)
    record['valid']=True
   except Exception as e:record.update(valid=False,error=type(e).__name__,detail=str(e)[:800])
   record['elapsed_seconds']=time.monotonic()-start;save(p,record)
   print(args.version,condition,c['id'],record['valid'],record.get('cost_usd'),record.get('detail',''),flush=True)
 await asyncio.gather(*(one(c) for c in cases));await client.close()
 ledger=load(OUT/'ledger.json');print('LEDGER',len(ledger['requests']),sum(r['charged_bound_usd'] for r in ledger['requests'].values()),flush=True)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--version',required=True);p.add_argument('--condition',choices=CONDITIONS,required=True);p.add_argument('--split',choices=['development','validation','test'],required=True);p.add_argument('--ids');p.add_argument('--concurrency',type=int,default=4);p.add_argument('--env-file',default='/home/agent/transcripts/.env');asyncio.run(run(p.parse_args()))
