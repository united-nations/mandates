import json
p='/Users/david/UN/mandates/.claude/worktrees/system-registry-gaps/website/src/data/un-system.json'
d=json.load(open(p))
bodies=d['bodies']
targets=['UNOPS','UN Women','UNCTAD','UNODC','ITC','UNU','UNITAR','UNIDIR','UNSSC','UNICRI','UNRISD','Tech Bank']
out=[]
def add(ent,kind,label,url):
    if not url: return
    if url.startswith('/'): return
    out.append((ent,kind,label or '',url))
for o in d['organizations']:
    if o['code'] not in targets: continue
    e=o['code']
    add(e,'homepage','homepage',o.get('homepage'))
    for gb in o.get('governingBodies') or []:
        if 'ref' in gb:
            b=bodies.get(gb['ref'],{})
            add(e,'gb-ref',b.get('name'),b.get('url'))
            for c in b.get('contacts') or []: add(e,'gb-ref-contact',c.get('name'),c.get('url'))
        else:
            add(e,'gb',gb.get('name'),gb.get('url'))
            for c in gb.get('contacts') or []: add(e,'gb-contact',c.get('name'),c.get('url'))
    for c in o.get('contacts') or []: add(e,'contact',c.get('label') or c.get('name'),c.get('url'))
    for m in o.get('mandateRegistry') or []: add(e,'registry',m.get('name'),m.get('url'))
    for r in o.get('resources') or []: add(e,'resource',r.get('name'),r.get('url'))
for r in out:
    print('\t'.join(r))
print('TOTAL', len(out))
