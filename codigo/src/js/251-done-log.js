/* ---------- v81: Done log card (Pedro) ----------
   Rail button #logBtn (the page icon used for task history) opens a card in the timer aside, like Timer / White noise:
   every done task grouped by when it was done (Today, Yesterday, Earlier this week, Last week, Older).
   The round check on a line marks it undone: the task goes back to its open list. State S.ui.logOpen. */
{const rb=$('#focusBtn')||$('#noiseToggle');
  if(rb&&!$('#logBtn'))rb.insertAdjacentHTML('afterend',`<button class="rbtn" id="logBtn" type="button" aria-label="Show or hide the done log" title="Done log">${LOG_ICON}</button>`);
  if(!$('#logCard'))$('#timerPanel').insertAdjacentHTML('beforeend',`<section class="card" id="logCard" aria-label="Done log" hidden><div class="card-head"><h2>Done log</h2><button class="closex" id="logClose" type="button" aria-label="Hide done log">×</button></div><div class="dl-body" id="dl-body"></div></section>`)}
if(innerWidth<=1180)S.ui.logOpen=false;
function dlGroups(){
  const now=new Date(),d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),day=864e5;
  const wk=weekStartOf(now).getTime(),lwk=wk-7*day;
  const G=[['Today',[]],['Yesterday',[]],['Earlier this week',[]],['Last week',[]],['Older',[]]];
  S.tasks.filter(t=>t.done&&t.doneAt&&!t.doneWithParent).sort((a,b)=>a.doneAt<b.doneAt?1:-1).forEach(t=>{
    const x=new Date(t.doneAt).getTime();
    G[x>=d0?0:x>=d0-day?1:x>=wk?2:x>=lwk?3:4][1].push(t)});
  return G.filter(g=>g[1].length)}
function dlWhen(t,g){const d=new Date(t.doneAt),h=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(g==='Today'||g==='Yesterday')return h;
  if(g==='Older')return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'});
  return d.toLocaleDateString('en-US',{weekday:'short'})+' '+h}
function dlDraw(){const b=$('#dl-body');if(!b)return;const G=dlGroups();
  b.innerHTML=G.length?G.map(([g,ts])=>`<div class="dl-grp"><div class="dl-gh">${g}<span>${ts.length}</span></div>${ts.map(t=>{
    const tag=S.tags.find(x=>x.id===t.tagId),p=t.projectId&&S.projects.find(x=>x.id===t.projectId);
    return `<div class="dl-row" data-dlid="${t.id}"><button class="dl-chk" type="button" data-dlundo title="Mark as undone (back to the list)" aria-label="Mark as undone"></button><div class="dl-txt"><div class="dl-name">${esc(t.name)}</div><div class="dl-meta"><span>${dlWhen(t,g)}</span>${tag?`<span class="dl-tag" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''}${p?`<span>${esc(projFull(p))}</span>`:''}</div></div></div>`}).join('')}</div>`).join(''):'<p class="dl-empty">Nothing done yet. Finished tasks show up here.</p>'}
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
document.addEventListener('click',e=>{if(S.ui.logOpen&&innerWidth<=1180&&!e.target.closest('#timerPanel,#logBtn,.pop,.toast')){S.ui.logOpen=false;save();render()}});
