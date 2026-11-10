import json,hashlib,re
from pathlib import Path
B=Path(__file__).resolve().parents[4];O=B/'.cache/extraction-experiment-20261110';O.mkdir(exist_ok=True)
def load(p):return json.loads(Path(p).read_text())
def write(n,d):(O/n).write_text(json.dumps(d,indent=2))
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
series={r['symbol']:r['metadata']['series_key'] for r in load(O/'series.json')}
prior=set(r['symbol'] for r in load(B/'data/references/paragraph-analysis-sample-20261109.json')['documents'])
# Exclude every document with an upstream saved classification, including the 11-reference eval corpus.
up=B.parent/'un80-docs-processing/data/processed/mandates/classification'
upnames={p.stem for p in up.rglob('*.json')}
upnames|={r['document'] for r in load(B/'.cache/paragraph-entity-pilot-20260924/manifest.json')}
# Match underscore IDs against known symbols, including Security Council parenthetical year spelling.
pop=load(B/'.cache/paragraph-analysis-20261109/population.json')['documents']
for s in list(series)+[d['symbol'] for d in pop]:
 if re.sub(r'[^A-Za-z0-9]+','_',s).strip('_') in upnames:prior.add(s)
banned={series[s] for s in prior if s in series}
eligible=[d for d in pop if d['symbol'] not in prior and series.get(d['symbol']) not in banned and d['symbol'].startswith(('A/RES/','A/HRC/RES/','E/RES/','S/RES/'))]
chosen=[];seen=set()
for prefix in ['A/RES/','A/HRC/RES/','E/RES/','S/RES/']:
 rows=sorted((d for d in eligible if d['symbol'].startswith(prefix)),key=lambda d:sha('frozen-experiment-20261110:'+d['symbol']))
 n=0
 for d in rows:
  group=series.get(d['symbol'],d['symbol'])
  if group in seen:continue
  chosen.append({**d,'family':group,'pool':'validation' if n<3 else 'test'});seen.add(group);n+=1
  if n==7:break
write('pool.json',dict(seed='frozen-experiment-20261110',prior_documents=sorted(prior),excluded_families=sorted(banned),eligible_documents=len(eligible),selected=chosen))
write('fetch-symbols.json',[d['symbol'] for d in chosen])
print('prior',len(prior),'banned families',len(banned),'eligible',len(eligible),'selected',len(chosen));print([(d['symbol'],d['pool']) for d in chosen])
