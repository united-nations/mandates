import subprocess, sys, re, json, html
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
rows=[l.split('\t') for l in open('/Users/david/UN/mandates/.claude/worktrees/system-registry-gaps/.urllist.tsv').read().strip().split('\n')]
for ent,kind,label,url in rows:
    try:
        r=subprocess.run(['curl','-sSL','--max-time','45','-A',UA,'-w','\n@@@%{http_code}\t%{url_effective}\t%{content_type}','-o','-',url],capture_output=True,text=True,errors='replace')
        body=r.stdout
        meta=body.rsplit('@@@',1)[-1].strip() if '@@@' in body else 'ERR'
        code,eff,ctype=(meta.split('\t')+['','',''])[:3]
        t=re.search(r'<title[^>]*>(.*?)</title>',body,re.S|re.I)
        title=html.unescape(re.sub(r'\s+',' ',t.group(1))).strip()[:160] if t else ''
        h1=re.findall(r'<h1[^>]*>(.*?)</h1>',body,re.S|re.I)
        h1s=' || '.join(html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',x))).strip() for x in h1[:3])[:200]
        print(json.dumps({'ent':ent,'kind':kind,'label':label,'url':url,'code':code,'eff':eff if eff!=url else '','ct':ctype,'len':len(body),'title':title,'h1':h1s},ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ent':ent,'url':url,'error':str(e)}))
    sys.stdout.flush()
