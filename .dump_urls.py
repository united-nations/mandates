import json
p='/Users/david/UN/mandates/.claude/worktrees/system-registry-gaps/website/src/data/un-system.json'
d=json.load(open(p))
bodies=d['bodies']
targets=['UNOPS','UN Women','UNCTAD','UNODC','ITC','UNU','UNITAR','UNIDIR','UNSSC','UNICRI','UNRISD','Tech Bank']
for o in d['organizations']:
    if o['code'] not in targets: continue
    print('='*70)
    print('ENTITY:', o['code'], '|', o['name'])
    print('homepage:', o.get('homepage'))
    for gb in o.get('governingBodies') or []:
        if 'ref' in gb:
            b=bodies.get(gb['ref'],{})
            print('  GB(ref=%s): name=%r url=%s'%(gb['ref'], b.get('name'), b.get('url')))
            for c in b.get('contacts') or []:
                print('     GBref-contact: %r -> %s'%(c.get('name'), c.get('url')))
            extra={k:v for k,v in gb.items() if k!='ref'}
            if extra: print('     GB-inline-extra:', extra)
        else:
            print('  GB: name=%r url=%s'%(gb.get('name'), gb.get('url')))
            for c in gb.get('contacts') or []:
                print('     GB-contact: %r -> %s'%(c.get('name'), c.get('url')))
        for k,v in (gb.items() if 'ref' not in gb else []):
            if k not in ('name','url','contacts'): print('     GB-field %s=%r'%(k,v))
    for c in o.get('contacts') or []:
        print('  CONTACT: %r -> %s'%(c.get('name'), c.get('url')))
        for k,v in c.items():
            if k not in ('name','url'): print('     field %s=%r'%(k,v))
    for m in o.get('mandateRegistry') or []:
        print('  REGISTRY: %r [%s] -> %s'%(m.get('name'), m.get('category'), m.get('url')))
        if m.get('interoperability'): print('     interop:', m['interoperability'])
    for r in o.get('resources') or []:
        print('  RESOURCE: %r -> %s'%(r.get('name'), r.get('url')))
    if o.get('note'): print('  note:', o['note'])
    if o.get('registryNote'): print('  registryNote:', o['registryNote'])
