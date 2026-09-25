"""Reproducible UN80 paragraph-classification pilot, without production writes.

Use `prepare` to freeze the original prompt/schema and a 30-document sample.
Use `run --env-file ... --deployment ...` only with explicit API-spend authorization.
Outputs (including raw model responses and usage) belong in an ignored directory.
"""
from __future__ import annotations
import argparse, ast, asyncio, copy, csv, hashlib, json, random, re, time
from collections import Counter
from pathlib import Path
from typing import Literal
import httpx, tiktoken, yaml
from dotenv import dotenv_values
from openai import AsyncAzureOpenAI
from openai.lib._pydantic import to_strict_json_schema
from pydantic import BaseModel, Field

ENC = tiktoken.get_encoding('o200k_base')

def read_json(path):
    return json.loads(Path(path).read_text())

def write_json(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2))

def token_count(text):
    return len(ENC.encode(text, disallowed_special=()))

def load_contract(repo: Path, out: Path):
    source = repo / 'src/mandates/classification/classify_paragraphs.py'
    tree = ast.parse(source.read_text())
    # Preserve the repository's live-sheet lookup (including its column ordering),
    # but freeze the retrieved inputs. No source module import or cloud side effects.
    rows = list(csv.reader((out/'entities.csv').open()))[1:]
    filtered = [r for r in rows if r[2] != 'Other (Other)' and r[3] != 'Regional Commissions']
    secretariat = [r[2] for r in filtered if r[3] in ['UN Secretariat','Peacekeeping operations and political missions']]
    system = [r[2] for r in filtered if r[3] not in ['UN Secretariat','Peacekeeping operations and political missions']]
    organs = [f"{r['short']} ({r['long']})" for r in csv.DictReader((out/'organs.csv').open()) if r['short'] != 'Charter']
    names = {'EntityType','assignee_names','DeliverableType','ActionVerbType','prompt'}
    nodes = [n for n in tree.body if isinstance(n, ast.ClassDef) or
             (isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in names for t in n.targets)) or
             (isinstance(n,ast.FunctionDef) and n.name=='get_prompts')]
    ns = dict(Literal=Literal,BaseModel=BaseModel,Field=Field,yaml=yaml,
              entities_secretariat=secretariat,entities_system=system,organs=organs)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(source),'exec',dont_inherit=True),ns)
    return ns

def prepare(args):
    out, repo = args.out, args.repo
    out.mkdir(parents=True,exist_ok=True)
    for name,sid in [('entities','1OZw5VdCeYwju4Y19W9nuQJXF-u0f5BhYIZpeEdmBDyY'),('organs','15XL3Iybscnv3zXlBIf7BUFWpZcxGyn1e1B-aJSOSp5Q')]:
        dest=out/f'{name}.csv'
        if not dest.exists():
            r=httpx.get(f'https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&sheet=Final',follow_redirects=True,timeout=30)
            r.raise_for_status();dest.write_text(r.text)
    ns=load_contract(repo,out)
    schema=to_strict_json_schema(ns['ParagraphData'])
    (out/'prompt.txt').write_text(ns['prompt']);write_json(out/'schema.json',schema)
    root=repo/'data/processed/mandates'
    gold=root/'classification/eval'
    chosen={p.stem:'existing evaluation document' for p in sorted(gold.glob('*.json'))}
    chosen['A_RES_79_1']='reported edge cases'
    candidates=[]
    for p in sorted((root/'json').glob('*.json')):
        if p.stem in chosen:continue
        d=read_json(p)
        if not isinstance(d,list):continue
        chars=sum(len(x.get('text','')) for x in d)
        candidates.append((chars,p.stem))
    candidates.sort()
    rng=random.Random(20260924)
    # Equal allocation across six document-length strata; no output-based selection.
    for bin_idx in range(6):
        bucket=candidates[len(candidates)*bin_idx//6:len(candidates)*(bin_idx+1)//6]
        for _,name in rng.sample(bucket,3):chosen[name]=f'length sextile {bin_idx+1}'
    manifest=[]; tasks=[]
    for name,reason in chosen.items():
        path=root/'json'/f'{name}.json'
        if not path.exists():raise FileNotFoundError(path)
        paras=read_json(path)
        # Gold text is the same input used in the saved predictions; use it for paired scoring.
        if (gold/f'{name}.json').exists():paras=read_json(gold/f'{name}.json')
        indices,prompts=ns['get_prompts'](copy.deepcopy(paras))
        write_json(out/'inputs'/f'{name}.json',paras)
        for i,prompt in zip(indices,prompts):
            tasks.append(dict(document=name,index=i,text=paras[i]['text'],user_prompt=prompt,
                              input_tokens_estimate=token_count(ns['prompt'])+token_count(json.dumps(schema))+token_count(prompt)+16))
        manifest.append(dict(document=name,reason=reason,elements=len(paras),requests=len(indices),
                             characters=sum(len(p['text']) for p in paras),input_tokens_estimate=sum(t['input_tokens_estimate'] for t in tasks if t['document']==name)))
    write_json(out/'manifest.json',manifest);write_json(out/'tasks.json',tasks)
    write_json(out/'contract.json',dict(source=str(repo),source_sha256=hashlib.sha256((repo/'src/mandates/classification/classify_paragraphs.py').read_bytes()).hexdigest(),prompt_tokens=token_count(ns['prompt']),schema_tokens_estimate=token_count(json.dumps(schema)),tokenizer='o200k_base proxy; actual API usage authoritative',documents=len(manifest),requests=len(tasks)))
    print(json.dumps(read_json(out/'contract.json'),indent=2))
    print('Estimated input tokens',sum(t['input_tokens_estimate'] for t in tasks))

async def run(args):
    out=args.out;env=dotenv_values(args.env_file)
    endpoint=args.endpoint or env.get('AZURE_OPENAI_ENDPOINT')
    client=AsyncAzureOpenAI(azure_endpoint=endpoint,api_key=env.get('AZURE_OPENAI_API_KEY'),api_version=env.get('AZURE_OPENAI_API_VERSION','2025-03-01-preview'),timeout=180,max_retries=0)
    # One cheap preflight. Never silently substitute a model/deployment.
    try:
        response=await client.responses.create(model=args.deployment,input='Return exactly OK.',reasoning={'effort':args.reasoning},max_output_tokens=32)
        write_json(out/'preflight.json',dict(model=response.model,usage=response.usage.model_dump(),output=response.output_text))
    except Exception as e:
        write_json(out/'preflight-error.json',dict(error=type(e).__name__,status=getattr(e,'status_code',None),body=getattr(e,'body',None)))
        print('Preflight failed:',type(e).__name__,getattr(e,'status_code',None));return
    sem=asyncio.Semaphore(args.concurrency)
    tasks=read_json(out/'tasks.json');schema=read_json(out/'schema.json');prompt=(out/'prompt.txt').read_text()
    async def one(task):
        dest=out/'responses'/args.deployment/task['document']/f"{task['index']}.json"
        if dest.exists():return
        async with sem:
            start=time.monotonic()
            try:
                r=await client.responses.create(model=args.deployment,input=[dict(role='developer',content=prompt),dict(role='user',content=task['user_prompt'])],reasoning={'effort':args.reasoning},text={'format':{'type':'json_schema','name':'ParagraphData','strict':True,'schema':schema}},max_output_tokens=8192)
                write_json(dest,dict(response=r.model_dump(),elapsed_seconds=time.monotonic()-start,document=task['document'],index=task['index']))
                print(task['document'],task['index'],r.status,r.usage.input_tokens,r.usage.output_tokens,flush=True)
            except Exception as e:
                write_json(dest.with_suffix('.error.json'),dict(error=type(e).__name__,status=getattr(e,'status_code',None),body=getattr(e,'body',None)))
                print(task['document'],task['index'],'ERROR',type(e).__name__,flush=True)
    await asyncio.gather(*(one(t) for t in tasks))
    await client.close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('command',choices=['prepare','run']);p.add_argument('--repo',type=Path,default=Path('/home/agent/un80-docs-processing'));p.add_argument('--out',type=Path,required=True);p.add_argument('--env-file',type=Path);p.add_argument('--endpoint');p.add_argument('--deployment',default='gpt-6-luna');p.add_argument('--reasoning',default='none');p.add_argument('--concurrency',type=int,default=4)
    a=p.parse_args()
    if a.command=='prepare':prepare(a)
    else:asyncio.run(run(a))
