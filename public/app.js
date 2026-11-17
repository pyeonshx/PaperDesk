'use strict';
let selectedPaper=null;
const el = id => document.getElementById(id);
const guides = {
 'Nature':['Nature · Article 작성 지침','https://www.nature.com/nature/for-authors/formatting-guide','Article의 요약 문단은 참고문헌을 포함하며, 권장 길이는 200단어 이내입니다.'],
 'PLOS Biology':['PLOS Biology · 제출 지침','https://journals.plos.org/plosbiology/s/submission-guidelines','초록은 배경, 주요 방법과 결과, 의의를 한 문단에 담고 인용은 생략합니다.']
};
const flow = {Methods:'입력 자료, 비교 단위, 분석 선택, 재현에 필요한 정보를 점검하세요.','Figure legend':'패널별 관찰 단위, 비교 대상과 불확실성 표시를 정의하세요.',Abstract:'질문과 핵심 결과가 연결되는지, 마지막 문장이 그 결과의 의미를 설명하는지 살펴보세요.',Introduction:'기존 연구에서 무엇을 알게 되었고 어떤 질문이 남았는지 연결해 보세요.',Results:'비교 대상과 관찰 결과를 가까이 두고, 수치와 그림 번호가 어느 결과를 뒷받침하는지 확인하세요.',Discussion:'핵심 발견에서 출발해 가능한 해석과 적용 범위를 구분해 보세요.'};
function context(){
 const s=el('sec').value, g=guides[el('journal').value];
 return {section:s,journal:el('journal').value,advice:flow[s],sources:[...(selectedPaper?.section===s?[selectedPaper.source]:[]),...(s==='Abstract'&&g?[g]:[]),...passages.filter(row=>row[0]===s).map(([,journal,title,doi,where,note,question])=>[journal+' · '+title,'https://doi.org/'+doi,where+' · '+note+' '+question])]};
}
function references(){
 const c=context(), box=el('refs'); box.replaceChildren();
 const p=document.createElement('p');p.textContent=c.advice;box.append(p);
 for(const [title,url,desc] of c.sources){const row=document.createElement('p'), a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=title;row.append(a,document.createTextNode(' — '+desc));box.append(row);}
 if(c.sources.length===0)box.append('이 섹션에는 일반 편집 기준을 적용합니다.');
}
const rules=[
 [/\b[Ii]m (?=korean\b)/gi,"I am "],[/\bkorean\b/g,"Korean"],
 [/\bin order to\b/gi,'to'],[/\bdue to the fact that\b/gi,'because'],[/\bat the present time\b/gi,'currently'],[/\bfor the purpose of\b/gi,'for'],[/\bwith regard to\b/gi,'regarding']
];
function polish(input){let draft=input,changes=[];for(const [pattern,replacement] of rules){draft=draft.replace(pattern,(word,offset,str)=>{changes.push(word+' → '+replacement);return /^[A-Z]/.test(word)&&!str.slice(0,offset).trim().match(/[^.!?]$/)?replacement[0].toUpperCase()+replacement.slice(1):replacement;});}return {draft,reason:[...new Set(changes)].join('\n')||'자동으로 줄일 표현을 찾지 못했습니다.'};}
function reviewNotes(text,c){
 const notes=[];
 const words=text.trim().split(/\s+/).length;
 if(c.section==='Abstract'&&c.journal==='Nature'&&words>200)notes.push('현재 입력은 '+words+'단어입니다. Nature 요약 문단의 권장 길이 200단어와 비교하세요.');
 if(c.section==='Abstract'&&c.journal==='PLOS Biology'&&/\[\d+[\d, –-]*\]|\([^)]*\b(?:19|20)\d{2}[a-z]?\)/.test(text))notes.push('인용으로 보이는 표기가 있습니다. PLOS Biology 초록에서는 참고문헌 인용을 생략합니다.');
 const sentences=text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)||[];
 const long=sentences.find(s=>s.trim().split(/\s+/).length>40);
 if(long)notes.push('“'+long.trim().slice(0,55)+'…” 문장에 40단어가 넘습니다. 관찰 결과와 해석을 두 문장으로 나눌 수 있는지 확인하세요.');
 if(c.section==='Results'&&/\b(?:greater|higher|lower|more|less)\b/i.test(text)&&!/(?:\bthan\b|compar(?:ed|ison)|versus|\bvs\.)/i.test(text))notes.push('비교급이 있지만 비교 대상이 명시됐는지 확인이 필요합니다. 어느 조건에 비해 달라졌나요?');
 notes.push(c.advice);return notes.join('\n');
}
const tokens=(str,re)=>(str.match(re)||[]).map(x=>x.toLowerCase()).sort().join(' | ');
function compare(){
 const a=el('src').value,b=el('draft').value,issues=[];
 for(const [key,pattern] of [['수치',/[+−-]?\d+(?:[.,]\d+)*(?:%|e[+-]?\d+)?/gi],['주장 강도·방향',/\b(?:cause[ds]?|causal|associate[ds]?|correlat(?:ed|ion)|may|might|suggests?|increased?|decreased?|higher|lower|not|significant(?:ly)?)\b/gi],['그림·표',/\b(?:fig(?:ure)?\.?|table)\s*\d+[a-z]?/gi]]){
 if(tokens(a,pattern)!==tokens(b,pattern))issues.push(key);}
 el('risk').textContent=issues.length?'원문과 대조할 항목 · '+issues.join(', '):'자동 대조에서 수치·영문 주장 표현·그림 번호의 차이가 감지되지 않았습니다.';
}
let original=null, revision=0;
function clearReview(){revision++;el('review').hidden=true;el('status').textContent='';}
function show(draft,reason){el('draft').value=draft;el('why').textContent=reason;el('review').hidden=false;compare();}
el('src').oninput=()=>{original=null;clearReview();};
for(const id of ['sec','journal'])el(id).onchange=()=>{clearReview();references();};
el('sample').onclick=()=>{if(el('src').value&&!confirm('작성 중인 입력을 예시로 바꿀까요?'))return;el('src').value='In order to assess reproducibility, we compared measurements from two experiments. The estimates were similar (Fig. 2A), although the second experiment included fewer samples.';el('src').oninput();};
el('src').onkeydown = event => {
 if(event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
 event.preventDefault();
 if(!event.repeat) el('edit').click();
};
el('draft').oninput=compare;
el('edit').onclick=()=>{clearReview();const s=el('src').value;if(!s.trim()){el('status').textContent='점검할 문단을 입력하세요.';return;}const r=polish(s);show(r.draft,r.reason+'\n'+reviewNotes(s,context()));};
el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(el('draft').value);el('status').textContent='수정안을 복사했습니다.';}catch{el('draft').focus();el('draft').select();el('status').textContent='선택한 수정안을 복사하세요 (⌘C / Ctrl+C).';}};
el('ai').onclick=async()=>{clearReview();const id=revision,text=el('src').value;if(!text.trim()){el('status').textContent='원문을 입력하세요.';return;}if(location.origin!=='https://localhost:3443'){el('status').textContent='AI 기능은 README에 따라 로컬 서버를 시작한 뒤 사용할 수 있습니다.';return;}
 el('ai').disabled=true;el('status').textContent='초안을 작성하고 있습니다…';
 try{const res=await fetch('/revise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,context:context()})});const data=await res.json();if(id!==revision)return;if(!res.ok)throw Error(data.error);show(data.draft,data.reason);el('status').textContent='';}catch(e){if(id===revision)el('status').textContent=e.message;}finally{el('ai').disabled=false;}};
references();
const loadingNotice=document.getElementById('loadingNotice');
if(loadingNotice)loadingNotice.hidden=true;
if(new URLSearchParams(location.search).has('word')){
 const script=document.createElement('script');script.src='https://appsforoffice.microsoft.com/lib/1/hosted/office.js';script.onload=()=>Office.onReady(info=>{if(info.host!==Office.HostType.Word)return;
 el('read').hidden=el('apply').hidden=false;
 el('read').onclick=async()=>{try{await Word.run(async ctx=>{const r=ctx.document.getSelection();r.load('text');await ctx.sync();if(!r.text.trim()||/[\r\n]/.test(r.text))throw Error('문단 기호를 제외한 한 문단의 본문을 선택하세요.');clearReview();original=r.text;el('src').value=original;});}catch(e){el('status').textContent=e.message;}};
 el('apply').onclick=async()=>{try{await Word.run(async ctx=>{const r=ctx.document.getSelection();r.load('text');const doc=r.getOoxml();await ctx.sync();if(!original||r.text!==original)throw Error('Word에서 대상 문단을 다시 선택하고 가져오세요.');if(!el('draft').value.trim())throw Error('수정안이 비어 있습니다.');if(/<w:(?:fldChar|fldSimple|hyperlink|drawing|footnoteReference|endnoteReference|sdt|ins|del)\b/.test(doc.value))throw Error('인용 필드 또는 특수 요소가 있습니다. 수정안을 복사해 필요한 부분만 반영하세요.');r.insertText(el('draft').value,'Replace');await ctx.sync();original=null;el('status').textContent='Word에 반영했습니다.';});}catch(e){el('status').textContent=e.message;}};
 });script.onerror=()=>el('status').textContent='Word 연결을 로드하지 못했습니다. 원문을 붙여 넣어 사용할 수 있습니다.';document.head.append(script);
}
