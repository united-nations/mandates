import subprocess, re, sys, time, html, json, os

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
urls = [l.strip() for l in open('/tmp/urls_sa.txt') if l.strip()]
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end = int(sys.argv[2]) if len(sys.argv) > 2 else len(urls)
out = {}
outfile = '/tmp/sweep_sa.json'
if os.path.exists(outfile):
    out = json.load(open(outfile))

def clean(s):
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    return s[:220]

for u in urls[start:end]:
    if u in out:
        continue
    p = subprocess.run(['curl', '-sSL', '--max-time', '40', '-A', UA,
                        '-H', 'Accept: text/html,application/xhtml+xml',
                        '-w', '\n@@@%{http_code}|%{url_effective}|%{content_type}',
                        u], capture_output=True)
    body = p.stdout.decode('utf-8', 'replace')
    err = p.stderr.decode('utf-8', 'replace').strip()
    meta = body.rsplit('\n@@@', 1)
    stat = meta[1] if len(meta) > 1 else '000||'
    doc = meta[0]
    t = re.search(r'<title[^>]*>(.*?)</title>', doc, re.S | re.I)
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', doc, re.S | re.I)
    desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', doc, re.S | re.I)
    ogt = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\']', doc, re.S | re.I)
    strip = lambda x: clean(re.sub(r'<[^>]+>', ' ', x))
    out[u] = {
        'status': stat,
        'err': err[:200],
        'title': clean(strip(t.group(1))) if t else None,
        'og': clean(ogt.group(1)) if ogt else None,
        'h1': [strip(h) for h in h1s[:4]],
        'desc': clean(desc.group(1)) if desc else None,
        'len': len(doc),
    }
    print(u, '->', stat, '|', out[u]['title'])
    json.dump(out, open(outfile, 'w'), indent=1)
    time.sleep(1.5)
