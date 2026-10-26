from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse,unquote
import json,re
R=Path(__file__).parent
class Page(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=[];self.h1=0
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get('id'):self.ids.append(d['id'])
        if tag=='h1':self.h1+=1
        for key in ['src','href']:
            if d.get(key):self.refs.append(d[key])
errors=[]
for file in ['index.html','ru/index.html']:
    p=Page();t=(R/file).read_text('utf-8');p.feed(t)
    assert p.h1==1
    assert len(p.ids)==len(set(p.ids))
    for ref in p.refs:
        url=urlparse(ref)
        if url.scheme or ref.startswith('//'):continue
        if ref.startswith('#'):
            if ref[1:] not in p.ids:errors.append((file,ref))
            continue
        path=unquote(url.path).removeprefix('/zarok-preview/')
        target=R/path if ref.startswith('/') else (R/file).parent/path
        if not target.exists() and not (target/'index.html').exists():errors.append((file,ref))
    print(file,':',len(p.refs),'local/external references; unique IDs; one H1')
assert not errors,errors
for p in (R/'img/home').glob('*.webp'):
    from PIL import Image
    with Image.open(p) as im:im.verify()
print('All referenced resources exist; all new WebP files decode.')
print('New image bytes:',sum(p.stat().st_size for p in (R/'img/home').glob('*.webp')))
