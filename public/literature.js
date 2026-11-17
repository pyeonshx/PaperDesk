'use strict';
const literatureApi='https://www.ebi.ac.uk/europepmc/webservices/rest/';
const localApi=location.origin==='https://localhost:3443';
const searchBox=document.getElementById('paperQuery');
const resultBox=document.getElementById('papers');
const paperMessage=document.getElementById('paperMessage');
const nextPage=document.getElementById('morePapers');
const patterns={
 'Introduction':/introduct|background/i,'Methods':/method|experimental procedure|material/i,
 'Results':/result|finding/i,'Discussion':/discussion|conclusion|limitation/i
};
let cursor=null,query='',generation=0;
async function fetchSource(route,params){
 const url=new URL((localApi?'/epmc/':literatureApi)+route,location.href);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
 const res=await fetch(url,{signal:AbortSignal.timeout(35000)});
 if(!res.ok)throw Error('자료 제공처 응답 '+res.status);
 return res;
}
function plain(html){return new DOMParser().parseFromString(html||'','text/html').body.textContent.trim();}
function bodyPassages(xml,section){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('본문 XML을 해석할 수 없습니다.');
 if(section==='Figure legend')return Array.from(doc.querySelectorAll('body fig caption')).map(e=>e.textContent.trim()).filter(Boolean);
 const matches=[];
 for(const sec of doc.querySelectorAll('body sec')){
  const title=sec.querySelector(':scope > title')?.textContent||'';
  if(!patterns[section]?.test(title+' '+(sec.getAttribute('sec-type')||'')))continue;
  for(const p of sec.querySelectorAll('p'))if(!matches.includes(p))matches.push(p);
 }
 return matches.map(p=>p.textContent.trim()).filter(Boolean);
}
function describe(passages){
 const words=passages.join(' ').split(/\s+/).filter(Boolean).length;
 const signals=[['however|nevertheless|in contrast','대조'],['may|might|suggests?|suggested','해석의 유보'],['we aimed|we sought|to investigate','목적 제시']];
 const cues=signals.filter(([r])=>new RegExp('\\b(?:'+r+')\\b','i').test(passages.join(' '))).map(x=>x[1]);
 return '분석 단위 '+passages.length+'개 · 공백 기준 '+words+'단어'+(cues.length?' · 감지한 영문 표현 기능: '+cues.join(', '):'');
}
async function inspectPaper(p,version){
 const section=el('sec').value;paperMessage.textContent='선택한 논문의 '+section+' 확인 중…';
 try{
  let parts=[];
  if(section==='Abstract'){
   const params={query:'SRC:'+p.source+' AND EXT_ID:"'+p.id+'"',resultType:'core',format:'json',pageSize:1};
   const item=(await (await fetchSource('search',params)).json()).resultList.result[0];
   const abstract=plain(item?.abstractText);if(abstract)parts=[abstract];
  }else if(p.pmcid && p.isOpenAccess==='Y'){
   parts=bodyPassages(await (await fetchSource(p.pmcid+'/fullTextXML',{})).text(),section);
  }
  if(version!==generation||el('sec').value!==section)return;
  if(!parts.length)throw Error('이 논문에서 공개된 해당 섹션을 확인할 수 없습니다. 다른 논문이나 Abstract를 선택하세요.');
  selectedPaper={section,source:[plain(p.title),'https://europepmc.org/article/'+encodeURIComponent(p.source)+'/'+encodeURIComponent(p.id),section+' · '+describe(parts)]};
  references();clearReview();paperMessage.textContent=selectedPaper.source[2]+' · 작성 기준에 추가했습니다.';
 }catch(e){if(version===generation)paperMessage.textContent=e.message;}
}
async function searchPapers(more){
 if(!more){generation++;query=searchBox.value.trim()||'SRC:MED';cursor='*';resultBox.replaceChildren();selectedPaper=null;references();clearReview();}
 const version=generation;if(!cursor)return;
 nextPage.hidden=true;paperMessage.textContent='Europe PMC 검색 중…';
 try{
  const data=await (await fetchSource('search',{query,format:'json',pageSize:20,cursorMark:cursor})).json();
  if(version!==generation)return;
  const rows=data.resultList?.result||[];const old=cursor;cursor=data.nextCursorMark;
  for(const p of rows){
   const row=document.createElement('p'), link=document.createElement('a'), button=document.createElement('button');
   link.href='https://europepmc.org/article/'+encodeURIComponent(p.source)+'/'+encodeURIComponent(p.id);link.target='_blank';link.rel='noopener';link.textContent=plain(p.title)||p.id;
   button.textContent='이 섹션 분석';button.onclick=()=>inspectPaper(p,++generation);
   row.append(link,document.createElement('br'),document.createTextNode([p.journalTitle,p.pubYear,p.pmcid&&p.isOpenAccess==='Y'?'공개 본문':'서지·초록'].filter(Boolean).join(' · ')+' '),button);resultBox.append(row);
  }
  nextPage.hidden=!rows.length||!cursor||old===cursor||resultBox.children.length>=data.hitCount;
  paperMessage.textContent='검색 결과 '+Number(data.hitCount).toLocaleString('ko-KR')+'건 · 현재 '+resultBox.children.length+'건 표시';
 }catch(e){if(version!==generation)return;paperMessage.textContent=e.message+' · 원문 검색에서 직접 확인할 수 있습니다.';nextPage.hidden=!more;}
}
el('paperSearch').onclick=()=>searchPapers(false);nextPage.onclick=()=>searchPapers(true);
searchBox.onkeydown=e=>{if(e.key==='Enter')searchPapers(false);};
searchBox.oninput=()=>{el('externalSearch').href='https://europepmc.org/search?query='+encodeURIComponent(searchBox.value.trim()||'SRC:MED');};
const stats=baselineStats;
el('baselineCount').textContent='PubMed 연간 배포본 '+stats.files.toLocaleString('ko-KR')+'개 파일 중 '+stats.processed+'개 처리 · 서지 '+stats.records.toLocaleString('ko-KR')+'건 · 초록 '+stats.abstracts.toLocaleString('ko-KR')+'건. 영문 논문 중 초록이 있는 '+stats.english_abstracts.toLocaleString('ko-KR')+'건에서 유보 표현이 검출된 초록은 '+stats.uncertainty.toLocaleString('ko-KR')+'건입니다. 이 수치는 처리한 파일에 한정됩니다.';

el('fulltextCount').textContent='공개 전문 XML 확인 '+fulltextStats.verified.toLocaleString('ko-KR')+'편 · 재시도 대기 '+fulltextStats.pending_retry+'편. 확인한 본문에서 분류한 Results 문단 '+(fulltextStats.sections.Results||0).toLocaleString('ko-KR')+'개, Discussion 문단 '+(fulltextStats.sections.Discussion||0).toLocaleString('ko-KR')+'개.';
