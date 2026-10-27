/* ---------- v87: recurring tasks (Pedro) ----------
   The next copy of a recurring task (made when the last one is done, t.repNext) stays out of the lists
   until the day before it is due. On its day (or later) an open recurring task sorts first.
   Rail button #recBtn (↻, after the Done log) opens a window with every recurring task. */
const REC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/></svg>';
const repWaiting=t=>!!(t.repeat&&t.repNext&&!t.done&&t.due&&isoAdd(t.due,-1)>todayISO());
const repToday=t=>!!(t.repeat&&!t.done&&t.due&&t.due<=todayISO());
// copies made before v87: the open copy another task spawned
function repMigrate(){const M=new Map(S.tasks.map(x=>[x.id,x]));S.tasks.forEach(x=>{const c=x.spawnedId&&M.get(x.spawnedId);if(c&&!c.done&&c.repeat&&c.repNext==null)c.repNext=true})}
{const _cp=complete;complete=function(t){const sp=t.spawnedId;_cp.apply(this,arguments);
  if(t.spawnedId&&t.spawnedId!==sp){const c=byId(t.spawnedId);if(c)c.repNext=true}}}
{const _v=vis;vis=function(t){const u=S.ui,lv=u.view==='tasks'||u.view==='long'||(u.view==='project'&&(u.projTab||'tasks')==='tasks');
  if(lv&&repWaiting(t)&&!kids(t).length)return false;return _v(t)}}
{const _c=cmp;cmp=function(a,b){const x=repToday(a),y=repToday(b);if(x!==y)return x?-1:1;return _c(a,b)}}
// a line at the end of the list says how many are waiting for their day
{const _r=render;render=function(){repMigrate();_r.apply(this,arguments);const u=S.ui;
  if(u.view==='tasks'||u.view==='long'){const n=S.tasks.filter(t=>repWaiting(t)&&inView(t)&&matches(t)).length;
    if(n)list.insertAdjacentHTML('beforeend',`<div class="defline recline">${n} recurring task${n===1?' is':'s are'} waiting for ${n===1?'its':'their'} day and will show the day before. <button type="button" class="linkbtn" data-recall>See all recurring</button></div>`)}
  const b=$('#recBtn');if(b)b.classList.toggle('on',!!(modal&&modal.querySelector('.recwin')))}}
list.addEventListener('click',e=>{if(e.target.closest('[data-recall]'))openRecurring()});
{const rb=$('#logBtn')||$('#focusBtn')||$('#noiseToggle');
  if(rb&&!$('#recBtn'))rb.insertAdjacentHTML('afterend',`<button class="rbtn" id="recBtn" type="button" aria-label="Recurring tasks" title="Recurring tasks" aria-haspopup="dialog">${REC_ICON}</button>`)}
const recDay=iso=>{const t0=todayISO();if(iso===t0)return'Today';if(iso===isoAdd(t0,1))return'Tomorrow';if(iso===isoAdd(t0,-1))return'Yesterday';
  const d=isoDate(iso);return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'})};
function recRows(){return S.tasks.filter(t=>t.repeat&&!t.done&&!t.archived&&!t.stepOf).sort((a,b)=>(a.due||'~').localeCompare(b.due||'~')||(a.time||'~').localeCompare(b.time||'~')||a.name.localeCompare(b.name))}
function recBodyHTML(){const R=recRows();if(!R.length)return '<p class="dl-empty">No recurring tasks yet. Pick Repeat in the add bar\'s advanced settings or in a task\'s edit window.</p>';
  return `<ul class="rec-list">${R.map(t=>{const tag=tagOf(t),p=projOf(t),w=repWaiting(t),now=repToday(t),late=now&&t.due<todayISO();
    const st=w?`<span class="rec-st wait">Shows ${esc(recDay(isoAdd(t.due,-1)))}</span>`:now?`<span class="rec-st now">${late?'Overdue':'Today'} · first in the list</span>`:`<span class="rec-st in">In the list</span>`;
    return `<li class="rec-row${w?' waiting':''}" style="--c:${colorOf(t)}"><div class="rec-txt"><div class="rec-name">${t.prio?`<span class="pflag pr${t.prio}">${icons.flag}</span>`:''}${esc(t.name)}</div>
      <div class="rec-meta"><span class="rep">↻ ${esc(repLabel(t.repeat))}</span><span class="${late?'late':''}">Next: ${t.due?esc(recDay(t.due)):'no date'}${t.time?' '+esc(t.time):''}</span>${tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''}${p?`<span class="projtag">${esc(projFull(p))}</span>`:''}${st}</div></div>
      <div class="rec-act">${w?'':`<button type="button" class="linkbtn" data-recgo="${t.id}">Show</button>`}<button type="button" class="linkbtn" data-recedit="${t.id}">Edit</button></div></li>`}).join('')}</ul>`}
function openRecurring(){closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal recwin" role="dialog" aria-modal="true" aria-labelledby="rec-h"><div class="rec-top"><h2 id="rec-h">Recurring tasks</h2><span class="sp-hint">When you finish one, the next shows in your list the day before it is due. On its day it is first in the list.</span></div>
    <div class="rec-body">${recBodyHTML()}</div><div class="modal-actions"><button type="button" class="btn primary" data-x>Close</button></div></div>`;
  document.body.appendChild(back);modal=back;
  back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-x]')){closeModal();render();return}
    const g=e.target.closest('[data-recgo]');if(g){closeModal();goToTask(g.dataset.recgo);return}
    const ed=e.target.closest('[data-recedit]');if(ed){const id=ed.dataset.recedit;openEdit(id);
      // back to the list when the edit window closes
      const m=modal;if(m){const ob=new MutationObserver(()=>{if(!m.isConnected){ob.disconnect();if(!modal)openRecurring()}});ob.observe(document.body,{childList:true})}}});
  back.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();render()}});
  back.querySelector('[data-x]').focus();const b=$('#recBtn');if(b)b.classList.add('on')}
$('#recBtn').addEventListener('click',()=>{if(modal&&modal.querySelector('.recwin')){closeModal();render()}else openRecurring()});
