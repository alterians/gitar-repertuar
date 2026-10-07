"""ozel/sarkilar/*.txt dosyalarını telefona aktarılacak ozel/repertuar.json dosyasında toplar.

Kullanım:  python araclar/derle.py
Dosya biçimi: üstte "alan: değer" satırları, sonra '---', altında sözler/akorlar.
"""
import json, re, sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent / 'ozel'
TR = str.maketrans('çğıöşüâîÇĞİÖŞÜ', 'cgiosuaiCGIOSU')

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.translate(TR).lower()).strip('-')

sarkilar = []
for f in sorted((KOK / 'sarkilar').glob('*.txt')):
    head, sep, body = f.read_text(encoding='utf-8').partition('\n---\n')
    if not sep:
        sys.exit(f'{f.name}: "---" ayıracı yok')
    s = {}
    for line in head.splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            s[k.strip()] = v.strip()
    if 'title' not in s:
        sys.exit(f'{f.name}: title eksik')
    s['id'] = s.get('id') or 'ozel-' + slug(s['title'])
    s['capo'] = int(s.get('capo') or 0)
    if s.get('bpm'):
        s['bpm'] = int(s['bpm'])
    s['tags'] = [t.strip() for t in s.get('tags', '').split(',') if t.strip()]
    s['content'] = body.strip('\n')
    sarkilar.append(s)

out = KOK / 'repertuar.json'
out.write_text(json.dumps(sarkilar, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{len(sarkilar)} şarkı -> {out}')
