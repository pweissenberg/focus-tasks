/* ---------- v81: Done log card (Pedro) ----------
   Rail button #logBtn (the page icon used for task history) opens a card in the timer aside, like Timer / White noise:
   every done task grouped by when it was done (Today, Yesterday, Earlier this week, Last week, Older).
   The round check on a line marks it undone: the task goes back to its open list. State S.ui.logOpen. */
{const rb=$('#focusBtn')||$('#noiseToggle');
  if(rb&&!$('#logBtn'))rb.insertAdjacentHTML('afterend',`<button class="rbtn" id="logBtn" type="button" aria-label="Show or hide the done log" title="Done log">${LOG_ICON}</button>`);
  if(!$('#logCard'))$('#timerPanel').insertAdjacentHTML('beforeend',`<section class="card" id="logCard" aria-label="Done log" hidden><div class="card-head"><h2>Done log</h2><button class="closex" id="logClose" type="button" aria-label="Hide done log">×</button></div><div class="dl-filt" id="dl-filt"><input type="search" id="dl-q" placeholder="Search by name" aria-label="Filter by name"><div class="dl-frow"><select id="dl-tag" aria-label="Filter by tag"></select><select id="dl-date" aria-label="Filter by date done"><option value="">Any date</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This week</option><option value="lastweek">Last week</option><option value="month">This month</option><option value="day">Pick a day…</option></select></div><input type="date" id="dl-day" aria-label="Day done" hidden><div class="dl-cols" id="dl-cols" aria-label="Filter by color"></div><button class="dl-clear" id="dl-clear" type="button" hidden>Clear filters</button></div><div class="dl-body" id="dl-body"></div></section>`)}
if(innerWidth<=1180)S.ui.logOpen=false;
function dlGroups(){
  const now=new Date(),d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),day=864e5;
  const wk=weekStartOf(now).getTime(),lwk=wk-7*day;
  const G=[['Today',[]],['Yesterday',[]],['Earlier this week',[]],['Last week',[]],['Older',[]]];
  S.tasks.filter(t=>t.done&&t.doneAt&&!t.doneWithParent&&dlPass(t)).sort((a,b)=>a.doneAt<b.doneAt?1:-1).forEach(t=>{
    const x=new Date(t.doneAt).getTime();
    G[x>=d0?0:x>=d0-day?1:x>=wk?2:x>=lwk?3:4][1].push(t)});
  return G.filter(g=>g[1].length)}
function dlWhen(t,g){const d=new Date(t.doneAt),h=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(g==='Today'||g==='Yesterday')return h;
  if(g==='Older')return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'});
  return d.toLocaleDateString('en-US',{weekday:'short'})+' '+h}
/* filters (per device, S.ui.dlF {q,tag,color,date,day}); typing only redraws the list */
const dlF=()=>S.ui.dlF||(S.ui.dlF={q:'',tag:'',color:'',date:'',day:''});
const dlActive=()=>{const f=dlF();return !!(f.q||f.tag||f.color||f.date)};
function dlPass(t){const f=dlF();
  if(f.q&&!t.name.toLowerCase().includes(f.q.toLowerCase()))return false;
  if(f.tag&&(f.tag==='none'?!!t.tagId&&S.tags.some(x=>x.id===t.tagId):t.tagId!==f.tag))return false;
  if(f.color&&colorOf(t).toLowerCase()!==f.color)return false;
  if(f.date){const now=new Date(),d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),x=new Date(t.doneAt).getTime(),day=864e5,wk=weekStartOf(now).getTime();
    if(f.date==='today'&&x<d0)return false;
    if(f.date==='yesterday'&&(x<d0-day||x>=d0))return false;
    if(f.date==='week'&&x<wk)return false;
    if(f.date==='lastweek'&&(x<wk-7*day||x>=wk))return false;
    if(f.date==='month'&&x<new Date(now.getFullYear(),now.getMonth(),1).getTime())return false;
    if(f.date==='day'&&f.day){const [y,m,dd]=f.day.split('-').map(Number),a=new Date(y,m-1,dd).getTime();if(x<a||x>=a+day)return false}}
  return true}
function dlFiltUI(){const f=dlF(),ts=S.tasks.filter(t=>t.done&&t.doneAt&&!t.doneWithParent);
  const q=$('#dl-q');if(q&&document.activeElement!==q)q.value=f.q;
  const tg=$('#dl-tag');if(tg){tg.innerHTML='<option value="">All tags</option>'+S.tags.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')+'<option value="none">No tag</option>';tg.value=f.tag;tg.classList.toggle('on',!!f.tag)}
  const dt=$('#dl-date');if(dt){dt.value=f.date;dt.classList.toggle('on',!!f.date)}
  const dy=$('#dl-day');if(dy){dy.hidden=f.date!=='day';if(document.activeElement!==dy)dy.value=f.day||''}
  const cs=[...new Set(ts.map(t=>colorOf(t).toLowerCase()))];
  const cb=$('#dl-cols');if(cb)cb.innerHTML=cs.length>1||f.color?cs.map(c=>`<button type="button" class="dl-col${c===f.color?' on':''}" data-dlcol="${c}" style="--c:${c}" title="Only this color" aria-label="Only this color"></button>`).join(''):'';
  const cl=$('#dl-clear');if(cl)cl.hidden=!dlActive()}
function dlDraw(){const b=$('#dl-body');if(!b)return;const G=dlGroups();
  b.innerHTML=G.length?G.map(([g,ts])=>`<div class="dl-grp"><div class="dl-gh">${g}<span>${ts.length}</span></div>${ts.map(t=>{
    const tag=S.tags.find(x=>x.id===t.tagId),p=t.projectId&&S.projects.find(x=>x.id===t.projectId);
    return `<div class="dl-row" data-dlid="${t.id}" style="--c:${colorOf(t)}"><button class="dl-chk" type="button" data-dlundo title="Mark as undone (back to the list)" aria-label="Mark as undone"></button><div class="dl-txt"><div class="dl-name"><s>${esc(t.name)}</s>${p?`<span class="dl-sep">●</span><span class="dl-proj">${esc(projFull(p))}</span>`:''}${tag?`<span class="dl-sep">●</span><span class="dl-tag" style="--dot:${tag.color}">${esc(tag.name)}</span>`:''}</div><div class="dl-meta">${dlWhen(t,g)}</div></div></div>`}).join('')}</div>`).join(''):(dlActive()?'<p class="dl-empty">No done tasks match these filters.</p>':'<p class="dl-empty">Nothing done yet. Finished tasks show up here.</p>');dlFiltUI()}
{const _r=render;render=function(){const r=_r.apply(this,arguments);const u=S.ui,c=$('#logCard');
  if(c){c.hidden=!u.logOpen;if(u.logOpen){$('#timerPanel').hidden=false;$('#app').classList.remove('no-timer');dlDraw()}}
  const lb=$('#logBtn');if(lb)lb.classList.toggle('on',!!u.logOpen);return r}}
$('#logBtn').onclick=()=>{S.ui.logOpen=!S.ui.logOpen;commit()};
$('#logClose').onclick=()=>{S.ui.logOpen=false;commit()};
$('#logCard').addEventListener('click',e=>{const b=e.target.closest('[data-dlundo]');if(!b)return;
  const t=byId(b.closest('.dl-row').dataset.dlid);if(!t||!t.done)return;
  b.closest('.dl-row').classList.add('leaving');
  setTimeout(()=>{reopen(t);dlLog(t,false);commit();toast(`"${t.name}" is back in ${rootOf(t).longTerm?'Long term':'Tasks'}.`,()=>{complete(t);dlLog(t,true);commit()})},200)});
/* same History lines as the row checkbox (231) */
function dlLog(t,d){if(t.parentId){const w=`${d?'did':'reopened'} the subtask "${t.name}"${d?'':' from the Done log'}`;logTask(t,w,false);logTask(rootTask(t),w,false)}
  else logTask(t,d?'marked it done':'reopened it from the Done log')}
/* on narrow screens the card floats like the timer: a click outside closes it */
document.addEventListener('click',e=>{if(S.ui.logOpen&&innerWidth<=1180&&e.target.isConnected&&!e.target.closest('#timerPanel,#logBtn,.pop,.toast')){S.ui.logOpen=false;save();render()}});
{const set=(k,v)=>{dlF()[k]=v;save();dlDraw()};
  $('#dl-q').addEventListener('input',e=>set('q',e.target.value.trim()));
  $('#dl-tag').addEventListener('change',e=>set('tag',e.target.value));
  $('#dl-date').addEventListener('change',e=>{set('date',e.target.value);if(e.target.value==='day'){const d=$('#dl-day');if(!dlF().day){dlF().day=todayISO();dlDraw()}d.focus()}});
  $('#dl-day').addEventListener('change',e=>set('day',e.target.value));
  $('#dl-cols').addEventListener('click',e=>{const b=e.target.closest('[data-dlcol]');if(b)set('color',dlF().color===b.dataset.dlcol?'':b.dataset.dlcol)});
  $('#dl-clear').onclick=()=>{S.ui.dlF={q:'',tag:'',color:'',date:'',day:''};save();dlDraw()}}
