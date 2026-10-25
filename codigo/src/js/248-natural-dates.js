/* ---------- written dates in the add bars (v78): "amanhã 15h", "sexta", "next friday 3pm", "em 3 dias", "15 de novembro" ---------- */
// nlFind(text) finds one date and/or one time in the task name, in Portuguese or English. On submit (after 221's quick entry took
// out [tag, @project, !, ;time) the words leave the name and fill the bar's due date and the Advanced settings time, unless those
// were already filled. A chip under the bar shows what was read; its × keeps the words as plain text for this task.
// The due date fields also accept the same words (parseDate wrap).
const NL_B='(?<![\\p{L}\\d])',NL_E='(?![\\p{L}\\d’\x27])';
const NL_WD=[['domingo','sunday'],['segunda','monday'],['terça|terca','tuesday'],['quarta','wednesday'],['quinta','thursday'],['sexta','friday'],['sábado|sabado','saturday']];
const NL_MON=[['janeiro|january','jan'],['fevereiro|february','fev|feb'],['março|marco|march','mar'],['abril|april','abr|apr'],['maio','mai'],['junho|june','jun'],['julho|july','jul'],['agosto|august','ago|aug'],['setembro|september','set|sept|sep'],['outubro|october','out|oct'],['novembro|november','nov'],['dezembro|december','dez|dec']];
const nlRe=s=>new RegExp(NL_B+'(?:'+s+')'+NL_E,'iu');
const nlAdd=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const nlMonIdx=w=>{w=w.toLowerCase();return NL_MON.findIndex(([f,a])=>(f+(a?'|'+a:'')).split('|').includes(w)||w==='may'&&f.startsWith('maio'))};
const NL_MONW=NL_MON.map(([f,a])=>f+(a?'|'+a:'')).join('|')+'|may';
const NL_TIMEPRE='(?:(?:às|as|at|by|até às|até as|ate as|a partir das)\\s*)?';
const NL_TIMEAHEAD='(?=\\s*(?:$|[,.;!?)]|(?:às|as|at)\\s|\\d{1,2}(?:[:h]\\d{0,2}|\\s*(?:am|pm))(?![\\p{L}\\d])))';
// each rule: [regex source, (match, now) => {due?:Date, time?:'HH:MM'}]; the first match of each kind (date, time) wins
const NL_RULES=[
  ['date','(?:(?:para|pra|até|ate|for|by)\\s+)?(?:depois de amanhã|depois de amanha|the day after tomorrow|day after tomorrow)',(m,n)=>nlAdd(n,2)],
  ['date','(?:(?:para|pra|até|ate|for|by)\\s+)?(?:amanhã|amanha|tomorrow|tmrw)',(m,n)=>nlAdd(n,1)],
  ['date','(?:(?:para|pra|até|ate|for|by)\\s+)?(?:hoje|today|tonight)',(m,n)=>new Date(n)],
  ['date','(?:em|daqui a|daqui|in)\\s+(\\d{1,3}|um|uma|dois|duas|três|tres|one|two|three)\\s+(dias?|days?|semanas?|weeks?|meses|mês|mes|months?)',(m,n)=>{
    const w={um:1,uma:1,one:1,dois:2,duas:2,two:2,'três':3,tres:3,three:3},k=+m[1]||w[m[1].toLowerCase()]||1,u=m[2].toLowerCase();
    if(/^(m|mo)/.test(u)){const x=new Date(n);x.setMonth(x.getMonth()+k);return x}return nlAdd(n,/^(s|w)/.test(u)?7*k:k)}],
  ['date','(?:(?:na|para|pra|até|ate)\\s+)?(?:semana que vem|próxima semana|proxima semana)|(?:(?:by|for)\\s+)?next week',(m,n)=>nlAdd(n,((8-n.getDay())%7)||7)],
  ['date','(?:(?:no|para|pra|até|ate)\\s+)?(?:mês que vem|mes que vem|próximo mês|proximo mes|próximo mes)|(?:(?:by|for)\\s+)?next month',(m,n)=>new Date(n.getFullYear(),n.getMonth()+1,1)],
  ['date','(?:(?:no|neste|este|para|pra|até|ate)\\s+)?(?:fim de semana|final de semana)|(?:(?:on|by|for)\\s+)?(?:this\\s+)?weekend',(m,n)=>nlAdd(n,n.getDay()===0?0:6-n.getDay())],
  // "15 de novembro", "15 nov", "nov 15", "november 15th", "15th of november" (abbreviations that are also words need "de" or the day after them)
  ['date','(?:(?:no dia|dia|em|para|pra|até|ate|on|by|for)\\s+)?(\\d{1,2})(?:st|nd|rd|th|º)?\\s+(?:de\\s+|of\\s+)?('+NL_MONW+')\\.?(?:\\s+(?:de\\s+)?(\\d{4}))?',(m,n)=>{
    const mo=nlMonIdx(m[2]),d=+m[1];if(mo<0)return null;if(['mar','set','out','may'].includes(m[2].toLowerCase())&&!/\s(de|of)\s/i.test(m[0]))return null;return nlYear(n,mo,d,m[3])}],
  ['date','(?:(?:on|by|for)\\s+)?('+NL_MONW+')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?',(m,n)=>{
    const mo=nlMonIdx(m[1]);if(mo<0||['mar','set','out','may'].includes(m[1].toLowerCase()))return null;return nlYear(n,mo,+m[2],m[3])}],
  // "dia 15", "on the 15th": the next day 15
  ['date','(?:(?:no|até|ate|para|pra)\\s+)?dia\\s+(\\d{1,2})|(?:(?:on|by)\\s+)?the\\s+(\\d{1,2})(?:st|nd|rd|th)',(m,n)=>{
    const d=+(m[1]||m[2]);if(d<1||d>31)return null;for(let k=0;k<3;k++){const x=new Date(n.getFullYear(),n.getMonth()+k,d);if(x.getDate()===d&&x>=new Date(n.getFullYear(),n.getMonth(),n.getDate()))return x}return null}],
  // weekdays. "segunda", "terça" ... also mean "second", "third": without "-feira" or a word like "na" before them they count
  // only at the end of the name or right before a time ("Reunião segunda 15h"), so "Revisar segunda versão" stays text
  ['date',NL_WD.map(([pt,en],i)=>`(?<w${i}>(?:(?:(?:na|no|nesta|neste|esta|este|até|ate|para|pra|toda|próxima|proxima|próximo|proximo)\\s+)(?:${pt})(?:[-\\s]feira)?(?:\\s+que vem)?|(?:${pt})[-\\s]feira(?:\\s+que vem)?|(?:${pt})(?:\\s+que vem)?${NL_TIMEAHEAD}|(?:(?:on|this|next|by|until|for)\\s+)?(?:${en})))`).join('|'),(m,n)=>{
    const i=NL_WD.findIndex((_,j)=>m.groups['w'+j]);let k=(i-n.getDay()+7)%7;if(!k&&/(next|próxim|proxim|que vem)/i.test(m[0]))k=7;return nlAdd(n,k)}],
  ['time','(?:(?:ao|at)\\s+)?(?:meio-dia|meio dia|noon|midday)',()=>'12:00'],
  ['time',NL_TIMEPRE+'(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)',m=>{let h=+m[1];const pm=/^p/i.test(m[3]);if(h<1||h>12)return null;if(h===12)h=0;return nlHM(h+(pm?12:0),+(m[2]||0))}],
  ['time',NL_TIMEPRE+'(\\d{1,2})\\s*(?:h\\s*)?(?:da|de)\\s+(tarde|noite|manhã|manha)',m=>{let h=+m[1];if(h>12)return null;if(/^(t|n)/i.test(m[2])&&h<12)h+=12;return nlHM(h,0)}],
  ['time',NL_TIMEPRE+'(\\d{1,2})h(\\d{2})?(?:min)?',m=>{if(+m[1]<6&&!/^(às|as|at|by|até|ate|a partir)/i.test(m[0]))return null;return nlHM(+m[1],+(m[2]||0))}], // "2h" or "1h30" alone reads like a length: no
  ['time',NL_TIMEPRE+'(\\d{1,2}):(\\d{2})',m=>nlHM(+m[1],+m[2])],
  ['time','(?:às|as|at)\\s+(\\d{1,2})(?![:.h\\d])',m=>nlHM(+m[1],0)],
].map(([kind,src,fn])=>({kind,re:nlRe(src),fn}));
function nlYear(n,mo,d,y){const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate());let x=new Date(y?+y:n.getFullYear(),mo,d);if(x.getMonth()!==mo)return null;if(!y&&x<t0)x=new Date(n.getFullYear()+1,mo,d);return x}
function nlHM(h,m){return h>=0&&h<24&&m>=0&&m<60?pad(h)+':'+pad(m):null}
// → null or {due:'YYYY-MM-DD'|'', time:'HH:MM'|'', rest: text without those words, words:[matched texts]}
function nlFind(text,now){
  now=now||new Date();let rest=String(text||''),due='',time='';const words=[];
  for(const r of NL_RULES){
    if(r.kind==='date'?due:time)continue;
    const m=rest.match(r.re);if(!m)continue;
    const v=r.fn(m,now);if(!v)continue;
    if(r.kind==='date')due=dateToISO(v);else time=v;
    words.push(m[0].trim());rest=(rest.slice(0,m.index)+' '+rest.slice(m.index+m[0].length));
  }
  if(!due&&!time)return null;
  rest=rest.replace(/\s+([,.;!?])/g,'$1').replace(/\s{2,}/g,' ').replace(/\s*[,\-–]\s*$/,'').trim();
  if(time&&!due){const [h,mi]=time.split(':').map(Number),x=new Date(now);x.setHours(h,mi,0,0);due=dateToISO(x<now?nlAdd(now,1):now)} // a time already gone today means tomorrow
  return {due,time,rest,words};
}
const nlTaskPart=v=>String(v||'').replace(/;[^;]*$/,'').replace(/\[[^\]]*\]?/g,' ').replace(/(^|\s)@[^@\[;]*/g,' '); // what quick entry will leave
const nlBar=inp=>inp.id==='c-name'?{k:'c',due:$('#c-due')}:{k:'pt',due:$('#pt-due')};
const nlWhen=r=>{const d=r.due?new Date(r.due+'T12:00'):null,t0=todayISO(),tm=dateToISO(nlAdd(new Date(),1));
  const day=!d?'':r.due===t0?'Today':r.due===tm?'Tomorrow':d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});return day+(r.time?' · '+r.time:'')};
function nlRead(inp){ // what this bar will take, or null
  if(inp._nlOff&&inp.value.trim()&&!inp.value.includes(inp._nlOff))inp._nlOff=null;
  if(!inp.value.trim())inp._nlOff=null;
  const r=nlFind(nlTaskPart(inp.value));if(!r||!r.rest)return null;
  if(inp._nlOff&&r.words.some(w=>inp._nlOff.includes(w)))return null;
  const b=nlBar(inp),dueSet=!!(b.due&&b.due.value.trim()),timeSet=!!ADV[b.k].a.time;
  if(dueSet&&(!r.time||timeSet))return null;
  if(dueSet){r.due='';}if(timeSet)r.time='';
  return r.due||r.time?r:null;
}
let nlChip=null;
function nlClose(){if(nlChip){nlChip.remove();nlChip=null}}
function nlDraw(inp){
  const r=nlRead(inp);if(!r){nlClose();return}
  if(!nlChip){nlChip=document.createElement('div');nlChip.className='nl-chip';nlChip.setAttribute('role','status');document.body.appendChild(nlChip);
    nlChip.addEventListener('mousedown',e=>e.preventDefault());
    nlChip.addEventListener('click',e=>{if(!e.target.closest('[data-nloff]'))return;const i=nlChip._inp,x=nlRead(i);if(x)i._nlOff=x.words.join(' ');nlClose();i.focus()})}
  nlChip._inp=inp;
  nlChip.innerHTML=`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg><span>Due <b>${esc(nlWhen(r))}</b></span><span class="nl-w">from "${esc(r.words.join(' '))}"</span><button type="button" data-nloff title="Keep these words in the name, no date" aria-label="Keep these words as text">×</button>`;
  const rc=inp.getBoundingClientRect();nlChip.style.top=(rc.bottom+6)+'px';
  nlChip.style.left=Math.max(8,Math.min(rc.right-nlChip.offsetWidth,innerWidth-nlChip.offsetWidth-8))+'px';
}
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches(qeInputs))nlDraw(e.target);else if(e.target.id==='c-due'||e.target.id==='pt-due'){const i=$(e.target.id==='c-due'?'#c-name':'#pt-name');if(i)nlDraw(i)}});
document.addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches(qeInputs))nlDraw(e.target)});
document.addEventListener('focusout',e=>{if(e.target.matches&&e.target.matches(qeInputs))setTimeout(()=>{if(!document.activeElement||!document.activeElement.matches(qeInputs))nlClose()},0)});
window.addEventListener('scroll',e=>{if(!(e.target.matches&&e.target.matches(qeInputs)))nlClose()},true);window.addEventListener('resize',nlClose);
// on submit: runs after 221 (registered later, same capture phase), before the bar's own handler
window.addEventListener('submit',e=>{
  const f=e.target,inp=f.id==='composer'?$('#c-name'):f.matches&&f.matches('[data-ptadd]')?$('#pt-name'):null;if(!inp)return;
  const r=nlRead(inp);nlClose();inp._nlOff=null;if(!r)return;
  const b=nlBar(inp);inp.value=nlFind(inp.value).rest||inp.value;
  if(r.due&&b.due)b.due.value=isoToUS(r.due);
  if(r.time)ADV[b.k].a.time=r.time;
},true);
// the due date fields: "sexta", "next friday", "em 3 dias", "15 de nov" too
{const _pd=parseDate;parseDate=function(s){const v=_pd(s);if(v!==null)return v;const r=nlFind(s);return r&&r.due&&!r.rest?r.due:null}}
