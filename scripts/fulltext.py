"""Scan Europe PMC OA JATS; persist completed PMCIDs and the resumable search cursor."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import sqlite3
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
API = 'https://www.ebi.ac.uk/europepmc/webservices/rest/'
RULES = [('Introduction','introduct|background'),('Methods','methods?|material'),
         ('Discussion','discussion|conclusion'),('Results','results?|findings')]
def get(route):
    with urllib.request.urlopen(API+route,timeout=35) as stream:
        return stream.read()
def measure(data):
    root=ET.fromstring(data)
    body=root.find('body')
    if root.tag!='article' or body is None:
        raise ValueError('No article body')
    counts=Counter()
    def visit(node,section=None):
        if node.tag=='sec':
            title=node.findtext('title','')+' '+node.get('sec-type','')
            section=next((label for label,regex in RULES if re.search(regex,title,re.I)),section)
        if node.tag=='caption':
            return
        if node.tag=='p' and section:
            counts[section]+=1
            return
        for child in node:
            visit(child,section)
    visit(body)
    counts['Figure legend']=len(body.findall('.//fig/caption'))
    return dict(counts)

def fetch_one(pmcid):
    try:
        counts=measure(get(pmcid+'/fullTextXML'))
        return pmcid,counts,None
    except Exception as exc:
        return pmcid,None,str(exc)[:160]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--pages',type=int,help='Number of result pages for this run. Default: until exhausted.')
    parser.add_argument('--page-size',type=int,default=100)
    parser.add_argument('--workers',type=int,default=3)
    args=parser.parse_args()
    dest=ROOT/'data';dest.mkdir(exist_ok=True)
    db=sqlite3.connect(dest/'oa.sqlite')
    db.executescript('CREATE TABLE IF NOT EXISTS papers(id TEXT PRIMARY KEY, counts TEXT, error TEXT); CREATE TABLE IF NOT EXISTS state(k TEXT PRIMARY KEY,v TEXT);')
    row=db.execute("SELECT v FROM state WHERE k='cursor'").fetchone()
    cursor=row[0] if row else '*'
    def process(ids):
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            for pmcid,counts,error in pool.map(fetch_one,ids):
                with db:
                    db.execute('INSERT OR REPLACE INTO papers VALUES(?,?,?)',(pmcid,json.dumps(counts) if counts is not None else None,error))
    def publish():
        verified,failed=db.execute('SELECT count(counts),count(error) FROM papers').fetchone()
        totals=Counter()
        for (s,) in db.execute('SELECT counts FROM papers WHERE counts IS NOT NULL'):
            totals.update(json.loads(s))
        report=dict(verified=verified,pending_retry=failed,sections=dict(totals))
        out=ROOT/'public/stats/fulltext.js'
        tmp=out.with_suffix('.tmp');tmp.write_text('const fulltextStats = '+json.dumps(report)+';\n');tmp.replace(out)
        print(report,flush=True)
    retry=[r[0] for r in db.execute('SELECT id FROM papers WHERE error IS NOT NULL LIMIT 100')]
    process(retry)
    page=0
    while cursor and (args.pages is None or page<args.pages):
        params=urllib.parse.urlencode(dict(query='OPEN_ACCESS:Y AND IN_EPMC:Y',resultType='lite',format='json',pageSize=args.page_size,cursorMark=cursor))
        hits=json.loads(get('search?'+params))
        rows=hits['resultList']['result']
        ids={r['pmcid'] for r in rows if re.fullmatch(r'PMC\d+',r.get('pmcid',''))}
        process([p for p in ids if not db.execute('SELECT 1 FROM papers WHERE id=?',(p,)).fetchone()])
        nxt=hits.get('nextCursorMark')
        cursor=nxt if rows and nxt and nxt!=cursor else ''
        with db:
            db.execute("INSERT OR REPLACE INTO state VALUES('cursor',?)",(cursor,))
        publish();page+=1
        time.sleep(.4)
    if page==0:
        publish()
if __name__=='__main__':
    main()
