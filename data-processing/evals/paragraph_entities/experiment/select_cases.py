import json,hashlib,re,collections
from pathlib import Path
B=Path(__file__).resolve().parents[4];O=B/'.cache/extraction-experiment-20261110'
load=lambda p:json.loads(Path(p).read_text());sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
pool=load(O/'pool.json');rows=load(O/'paragraphs.json');old=load(B/'.cache/paragraph-analysis-20261109/sample-paragraphs.json')
def shingles(t):
 w=re.findall(r'\w+',t.lower());return {' '.join(w[i:i+5]) for i in range(len(w)-4)}
index=collections.defaultdict(set);sig={}
for i,r in enumerate(old):
 if r['type']!='paragraph':continue
 s=shingles(r['text']);sig[i]=s
 for sh in s:index[sh].add(i)
def overlap(t):
 s=shingles(t);hits=collections.Counter(i for h in s for i in index[h])
 return max((n/len(s|sig[i]) for i,n in hits.items()),default=0)
by=collections.defaultdict(list)
for r in rows:by[r['symbol']].append(r)
cases=[]
for d in pool['selected']:
 doc=by[d['symbol']];eligible=sorted([r for r in doc if r['type']=='paragraph' and r['paragraph_type']=='operative' and 12<=len(r['text'].split())<=250],key=lambda r:sha('source-cases-v1:'+r['id']))
 n=0
 for r in eligible:
  similarity=overlap(r['text'])
  if similarity>.7:continue
  prev=[p for p in doc if p['position']<r['position'] and p['paragraph_type']=='operative' and (p['section'],p['annex_index'],p['text_index'])==(r['section'],r['annex_index'],r['text_index'])]
  ctx={p['position']:p for p in prev[-2:]}
  if (r['level'] or 0)>1:
   parent=next((p for p in reversed(prev) if (p['level'] or 0)<r['level']),None)
   if parent:ctx[parent['position']]=parent
  issuer='Human Rights Council' if r['symbol'].startswith('A/HRC') else 'General Assembly' if r['symbol'].startswith('A/') else 'Security Council' if r['symbol'].startswith('S/') else 'Economic and Social Council'
  aliases={'General Assembly':'GA','Security Council':'SC','Economic and Social Council':'ECOSOC','Human Rights Council':'HRC'}
  payload=lambda p:dict(ref='p'+str(p['position']),text=p['text'])
  case=dict(id=f"{d['pool'][0]}{len(cases)+1:02}",split=d['pool'],symbol=d['symbol'],family=d['family'],source_id=r['id'],position=r['position'],prefix=r['prefix'],prior_max_5gram_jaccard=similarity,input=dict(document=dict(symbol=r['symbol'],title=next((p['text'] for p in doc if p['type']=='title'),r['symbol']),issuer=dict(normalized_name=aliases[issuer],aliases=[issuer])),target=[payload(r)],context=[payload(p) for p in sorted(ctx.values(),key=lambda p:p['position'])]))
  case['source_sha256']=sha(json.dumps(case['input'],sort_keys=True,ensure_ascii=False));cases.append(case);n+=1
  if n==2:break
(O/'cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2))
(O/'source-freeze.json').write_text(json.dumps(dict(cases_sha256=sha((O/'cases.json').read_text()),count=len(cases),selection='two seeded eligible operative paragraphs per document, 12–250 words; exclude >0.7 prior-pilot word-5gram Jaccard',seed='source-cases-v1'),indent=2))
for c in cases:
 if c['split']=='validation':
  print('\n',c['id'],c['symbol'],c['prefix'],'POS',c['position']);print('CONTEXT',json.dumps(c['input']['context'],ensure_ascii=False));print('TARGET',c['input']['target'][0]['text'])
