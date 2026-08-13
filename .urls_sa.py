import json
d = json.load(open('/Users/david/UN/mandates/.claude/worktrees/system-registry-gaps/website/src/data/un-system.json'))
bodies = d['bodies']
urls = []
for o in d['organizations']:
    if o.get('grouping') != 'specialized-agency':
        continue
    def add(u):
        if u and not u.startswith('/') and u not in urls:
            urls.append(u)
    add(o.get('homepage'))
    for gb in o.get('governingBodies', []):
        b = bodies[gb['ref']] if 'ref' in gb else gb
        add(b.get('url'))
        for ct in b.get('contacts', []):
            add(ct.get('url'))
    for ct in o.get('contacts', []):
        add(ct.get('url'))
    for m in o.get('mandateRegistry', []):
        add(m.get('url'))
    for r in o.get('resources', []):
        add(r.get('url'))
open('/tmp/urls_sa.txt', 'w').write('\n'.join(urls) + '\n')
print(len(urls))
