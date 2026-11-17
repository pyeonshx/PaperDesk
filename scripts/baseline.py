"""Build resumable, per-shard writing statistics for an entire PubMed annual baseline."""
import argparse
import concurrent.futures
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
import urllib.request

BASE = 'https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/'
OUT = Path(__file__).resolve().parents[1] / 'public' / 'stats'
CUES = {
    'contrast': rb'\b(?:however|nevertheless|in contrast)\b',
    'uncertainty': rb'\b(?:may|might|suggests?|suggested)\b',
    'purpose': rb'\b(?:we aimed|we sought|our objective|to investigate)\b',
}
PATTERNS = {k: re.compile(v, re.I) for k, v in CUES.items()}
ABSTRACT = re.compile(rb'<Abstract>(.*?)</Abstract>', re.S)
PART = re.compile(rb'<AbstractText\b([^>]*)>(.*?)</AbstractText>', re.S)
TAG = re.compile(rb'<[^>]+>')

def download(url):
    return urllib.request.urlopen(url, timeout=60)

def analyze(source):
    counts = dict(records=0, abstracts=0, english_abstracts=0, structured=0,
                  contrast=0, uncertainty=0, purpose=0)
    # The NLM XML serializes PubmedArticle records sequentially. Bound memory to
    # one read buffer plus the largest open record.
    pending = b''
    with gzip.open(source, 'rb') as stream:
        while chunk := stream.read(2**20):
            records = (pending + chunk).split(b'</PubmedArticle>')
            pending = records.pop()
            for record in records:
                counts['records'] += 1
                abstract = ABSTRACT.search(record)
                if not abstract:
                    continue
                parts = PART.findall(abstract[1])
                if not parts:
                    continue
                counts['abstracts'] += 1
                if b'<Language>eng</Language>' not in record:
                    continue
                counts['english_abstracts'] += 1
                if len(parts)>1 and any(b'Label=' in attrs for attrs,_ in parts):
                    counts['structured'] += 1
                plain = b' '.join(TAG.sub(b'', value) for _, value in parts)
                for name, pattern in PATTERNS.items():
                    counts[name] += bool(pattern.search(plain))
    return counts

def process(name):
    target = OUT / (name + '.json')
    if target.exists():
        return
    for attempt in range(3):
        try:
            with download(BASE + name + '.md5') as f:
                checksum = re.search(rb'\b[0-9a-fA-F]{32}\b', f.read()).group().decode().lower()
            with tempfile.TemporaryFile() as tmp:
                with download(BASE + name) as remote:
                    shutil.copyfileobj(remote,tmp)
                tmp.seek(0)
                if hashlib.file_digest(tmp,'md5').hexdigest() != checksum:
                    raise ValueError('checksum mismatch: ' + name)
                tmp.seek(0)
                counts = analyze(tmp)
            with tempfile.NamedTemporaryFile(mode='w',dir=OUT,delete=False) as staging:
                json.dump(dict(file=name,md5=checksum,**counts),staging)
            os.replace(staging.name,target)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2**attempt)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--workers',type=int,default=3)
    parser.add_argument('--batch',type=int,help='Process this many remaining files; default is all.')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    with download(BASE) as f:
        names=sorted(set(re.findall(r'href="(pubmed\d+n\d+\.xml\.gz)"',f.read().decode())))
    if not names:
        raise RuntimeError('empty baseline directory')
    def summary():
        rows=[json.loads(p.read_text()) for n in names if (p:=OUT/(n+'.json')).exists()]
        keys=['records','abstracts','english_abstracts','structured',*CUES]
        totals={k:sum(r[k] for r in rows) for k in keys}
        data=dict(baseline=names[0].split('n')[0],files=len(names),processed=len(rows),**totals)
        (OUT/'summary.js.tmp').write_text('const baselineStats = '+json.dumps(data)+';\n')
        os.replace(OUT/'summary.js.tmp',OUT/'summary.js')
        return data
    pending=[n for n in reversed(names) if not (OUT/(n+'.json')).exists()]
    if args.batch is not None:
        pending=pending[:args.batch]
    summary()
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        jobs={pool.submit(process,n):n for n in pending}
        for job in concurrent.futures.as_completed(jobs):
            try:
                job.result()
                print(jobs[job],summary(),flush=True)
            except Exception as exc:
                errors.append(jobs[job])
                print(jobs[job],str(exc),flush=True)
    if errors:
        raise SystemExit('Retry remaining failures: '+', '.join(errors))
if __name__=='__main__':
    main()
