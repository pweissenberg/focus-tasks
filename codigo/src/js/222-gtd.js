/* ---------- GTD helpers: Waiting for, weekly review, "I have X minutes" filter, defer until a date ----------
   t.waitFor / t.waitSince on tasks on hold · t.defer ISO date (hidden until then)
   S.ui.estMax = only tasks that fit in that many minutes · S.ui.showDeferred · S.prefs.lastReview ISO date */
const isDeferred=t=>!!(t.defer&&t.defer>todayISO()&&!t.done);
const daysSince=iso=>Math.max(0,Math.round((+new Date(todayISO())-+new Date(iso))/86400000));
const fmtDays=n=>n===0?'today':n===1?'1 day':`${n} days`;
// which tasks show: deferred ones wait for their date, and the time filter keeps what fits
{const _vis=vis;vis=function(t){
  if(!_vis(t))return false;
  const u=S.ui,list=u.view==='tasks'||u.view==='long'||(u.view==='project'&&(u.projTab||'tasks')==='tasks');
  if(!list||t.done)return true;
  if(isDeferred(t)&&!u.showDeferred&&!kids(t).some(k=>!isDeferred(k)&&vis(k)))return false;
  if(u.estMax&&!(t.est>0&&t.est<=u.estMax)&&!kids(t).some(vis))return false;
  return true}}
// row additions: waiting / deferred notes in the meta line
{const _row=row;row=function(t,depth){const el=_row(t,depth);if(t.stepOf)return el;
  const meta=el.querySelector('.meta');
  if(meta&&t.onHold&&!t.done){const since=t.waitSince?fmtDays(daysSince(t.waitSince)):'';
    meta.insertAdjacentHTML('beforeend',`<button class="waitc" type="button" data-wait title="Who you are waiting for (click to change)">${t.waitFor?`Waiting for <b>${esc(t.waitFor)}</b>`:'Waiting'}${since?` · ${since}`:''}</button>`)}
  if(meta&&isDeferred(t))meta.insertAdjacentHTML('beforeend',`<span class="defc" title="Hidden from the list until this day">Deferred until ${isoToUS(t.defer)}</span>`);
  return el}}
// a repeating task carries its time and microtasks
{const _cp=complete;complete=function(t){const sp=t.spawnedId;_cp.apply(this,arguments);
  if(t.spawnedId&&t.spawnedId!==sp){const c=byId(t.spawnedId);if(c){c.est=t.est||null;c.micro=(t.micro||[]).map(m=>({id:uid(),name:m.name,done:false}));c.glow=t.glow||null}}}}
// Waiting for: ticking On hold asks who; unticking clears it
function openWaitPop(anchor,t){
  openPop(anchor,`<form class="pop-form wait-pop"><strong>Waiting for</strong>
    <input type="text" id="wait-who" value="${esc(t.waitFor||'')}" placeholder="Who or what (optional)" maxlength="60" aria-label="Who you are waiting for">
    <p class="sp-hint">Since ${isoToUS(t.waitSince||todayISO())}. The weekly review lists everything you are waiting for.</p>
    <div class="pop-actions"><button type="button" class="linkbtn" data-skip>Skip</button><button class="btn sm primary">Save</button></div></form>`,el=>{
    const f=el.querySelector('form');f.querySelector('[data-skip]').onclick=closePop;
    f.onsubmit=e=>{e.preventDefault();t.waitFor=f.querySelector('#wait-who').value.trim();closePop();commit()}});
}
list.addEventListener('change',e=>{const b=e.target.closest('[data-act="hold"]');if(!b)return;const id=b.closest('.task').dataset.id,t=byId(id);if(!t)return;
  if(b.checked){t.waitSince=todayISO();setTimeout(()=>{const r=list.querySelector(`.task[data-id="${id}"] .holdbox`);if(r)openWaitPop(r,t)},0)}else{t.waitFor='';t.waitSince=null}},true);
list.addEventListener('click',e=>{const b=e.target.closest('[data-wait]');if(!b)return;e.stopPropagation();const t=byId(b.closest('.task').dataset.id);if(t)openWaitPop(b,t)},true);
{const _r=render;render=function(){_r.apply(this,arguments);paintTimeFilter();paintDeferLine();paintReviewDot()}}
// "I have X minutes": a pill next to On hold
$('#holdToggle').insertAdjacentHTML('afterend','<button class="holdtoggle timefil" id="timeFilter" type="button" aria-haspopup="menu"></button>');
const TF_OPTS=[[0,'Any time'],[2,'2 min'],[5,'5 min'],[15,'15 min'],[30,'30 min'],[60,'1 hour']];
function paintTimeFilter(){const b=$('#timeFilter');if(!b)return;const m=S.ui.estMax||0;b.classList.toggle('on',!!m);
  b.innerHTML=`<svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>${m?`I have ${TF_OPTS.find(o=>o[0]===m)[1]}`:'Time'}`;
  b.title=m?`Showing tasks that take ${fmtEst(m)} or less (set the time with ; when you add a task)`:'Show only tasks that fit in the time you have'}
$('#timeFilter').addEventListener('click',e=>{const b=e.currentTarget;
  openPop(b,`<div class="acct-menu tf-menu" role="menu" aria-label="Time you have"><div class="asg-h">How much time do you have?</div>${TF_OPTS.map(([v,l])=>`<button type="button" role="menuitemradio" aria-checked="${(S.ui.estMax||0)===v}" data-tf="${v}">${l}${(S.ui.estMax||0)===v?'<span class="ck">✓</span>':''}</button>`).join('')}<p class="sp-hint">Only tasks with a time (;) that fits are shown.</p></div>`,el=>{
    el.classList.add('pop-menu');place(el,b);
    el.addEventListener('click',ev=>{const o=ev.target.closest('[data-tf]');if(!o)return;S.ui.estMax=+o.dataset.tf||0;closePop();commit()})})});
// deferred tasks: a line at the end of the list says how many are waiting for their date
function paintDeferLine(){
  const u=S.ui;if(!(u.view==='tasks'||u.view==='long'))return;const n=S.tasks.filter(t=>isDeferred(t)&&inView(t)&&matches(t)).length;if(!n)return;
  list.insertAdjacentHTML('beforeend',`<div class="defline">${u.showDeferred?`Showing ${n} deferred task${n===1?'':'s'}.`:`${n} task${n===1?' is':'s are'} deferred and hidden until ${n===1?'its':'their'} date.`} <button type="button" class="linkbtn" data-defshow>${u.showDeferred?'Hide them':'Show them'}</button></div>`)}
list.addEventListener('click',e=>{if(e.target.closest('[data-defshow]')){S.ui.showDeferred=!S.ui.showDeferred;commit()}});
// the edit window gets "Takes" and "Defer until"
{const _oe=openEdit;openEdit=function(id){_oe.apply(this,arguments);const t=byId(id),f=modal&&modal.querySelector('form');if(!t||!f||!f.querySelector('#ed-name'))return;
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<div class="row2"><label class="fld"><span>TAKES</span><input id="ed-est" type="text" class="mono" placeholder="2, 15m, 1h30" value="${t.est?esc(fmtEst(t.est)):''}"></label>
    <label class="fld"><span>DEFER UNTIL</span><input id="ed-defer" type="text" class="mono" placeholder="MM/DD/YYYY" value="${t.defer?isoToUS(t.defer):''}"></label></div>
    <div class="fld"><span>GLOW</span>${glowPickHTML('ed-glow',t.glow||'',true)}</div>`);
  bindDate(f.querySelector('#ed-defer'));
  const sub=f.onsubmit;f.onsubmit=e=>{const ei=f.querySelector('#ed-est'),di=f.querySelector('#ed-defer'),est=parseDur(ei.value),df=parseDate(di.value);
    if(ei.value.trim()&&!est){e.preventDefault();ei.classList.add('invalid');ei.focus();return}
    if(df===null){e.preventDefault();di.classList.add('invalid');di.focus();return}
    t.est=est||null;t.defer=df||null;const g=f.querySelector('[name=ed-glow]:checked');t.glow=g&&g.value?g.value:null;return sub.call(f,e)}}}

/* weekly review: a step-by-step window from the rail */
const REVIEW_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v3H9zM8.5 13l2.5 2.5 4.5-5"/></svg>';
{const st=$('#rail [data-view="stats"]');if(st)st.insertAdjacentHTML('afterend',`<button class="rbtn" id="reviewBtn" type="button" aria-label="Weekly review" title="Weekly review">${REVIEW_ICON}</button>`)}
function paintReviewDot(){const b=$('#reviewBtn');if(!b)return;const late=!S.prefs.lastReview||daysSince(S.prefs.lastReview)>=7;b.classList.toggle('due',late);
  b.title=S.prefs.lastReview?`Weekly review (last one ${fmtDays(daysSince(S.prefs.lastReview))} ago)`.replace('today ago','today'):'Weekly review'}
$('#reviewBtn').addEventListener('click',()=>openReview(0));
const REV_STEPS=['Empty the inbox','Waiting for','Long term','Coming up','Done'];
function openReview(step){
  closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal review" role="dialog" aria-modal="true" aria-labelledby="rv-h"><div class="rv-steps">${REV_STEPS.map((s,i)=>`<span class="${i===step?'on':i<step?'past':''}">${i+1}</span>`).join('')}</div>
    <h2 id="rv-h">${REV_STEPS[step]}</h2><div class="rv-body"></div>
    <div class="modal-actions">${step?'<button type="button" class="btn" data-rvback>Back</button>':'<button type="button" class="btn" data-x>Close</button>'}<button type="button" class="btn primary" data-rvnext>${step===REV_STEPS.length-1?'Finish review':'Next'}</button></div></div>`;
  document.body.appendChild(back);modal=back;back._rv=step;
  const body=back.querySelector('.rv-body');
  const tline=t=>`<span class="rv-name"><i style="background:${colorOf(t)}"></i>${esc(t.name)}</span>`;
  const draw=()=>{const open=S.tasks.filter(t=>!t.done&&!t.stepOf);
    if(step===0){const lines=S.notes.split('\n').map(x=>x.replace(/^\s*([-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean);
      body.innerHTML=`<p class="sp-hint">Your Notes are the inbox. Turn what needs doing into tasks, delete what does not.</p><textarea id="rv-notes" rows="8">${esc(S.notes)}</textarea>
        ${lines.length?`<button type="button" class="btn sm" data-rvtasks>Turn ${lines.length} line${lines.length===1?'':'s'} into tasks</button>`:'<p class="rv-ok">The inbox is empty.</p>'}`}
    else if(step===1){const ws=open.filter(t=>t.onHold);
      body.innerHTML=ws.length?`<p class="sp-hint">Follow up on anything that has waited too long.</p><div class="rv-list">${ws.map(t=>`<div class="rv-row">${tline(t)}<span class="rv-meta">${t.waitFor?esc(t.waitFor)+' · ':''}${t.waitSince?fmtDays(daysSince(t.waitSince)):''}</span><button type="button" class="linkbtn" data-rvunhold="${t.id}">Not waiting anymore</button></div>`).join('')}</div>`:'<p class="rv-ok">You are not waiting on anything.</p>'}
    else if(step===2){const ls=open.filter(t=>!t.parentId&&t.longTerm);
      body.innerHTML=ls.length?`<p class="sp-hint">Someday and maybe: bring back what you want to start now.</p><div class="rv-list">${ls.map(t=>`<div class="rv-row">${tline(t)}<button type="button" class="linkbtn" data-rvtotasks="${t.id}">↓ Move to Tasks</button></div>`).join('')}</div>`:'<p class="rv-ok">Long term is empty.</p>'}
    else if(step===3){const end=isoAdd(todayISO(),14),ds=open.filter(t=>t.due&&t.due<=end).sort((a,b)=>a.due<b.due?-1:1),df=open.filter(t=>t.defer&&t.defer<=end);
      body.innerHTML=ds.length||df.length?`<p class="sp-hint">The next two weeks.</p><div class="rv-list">${ds.map(t=>`<div class="rv-row">${tline(t)}<span class="rv-meta${t.due<todayISO()?' late':''}">${t.due<todayISO()?'Overdue · ':''}${isoToUS(t.due)}</span></div>`).join('')}${df.map(t=>`<div class="rv-row">${tline(t)}<span class="rv-meta">Comes back ${isoToUS(t.defer)}</span></div>`).join('')}</div>`:'<p class="rv-ok">Nothing due in the next two weeks.</p>'}
    else{
      body.innerHTML=`<p class="rv-ok">Inbox ${S.notes.trim()?'still has notes':'empty'} · ${open.filter(t=>t.onHold).length} waiting · ${open.filter(t=>t.longTerm&&!t.parentId).length} in Long term.</p><p class="sp-hint">Finish to start the clock on your next review. The rail button gets a dot after 7 days.</p>`}
  };
  draw();
  back.addEventListener('input',e=>{if(e.target.id==='rv-notes'){S.notes=e.target.value;save();const b=body.querySelector('[data-rvtasks]');if(!b)draw()}});
  back.addEventListener('click',e=>{
    if(e.target.closest('[data-x]')){closeModal();return}
    if(e.target.closest('[data-rvback]')){openReview(step-1);return}
    if(e.target.closest('[data-rvnext]')){if(step===REV_STEPS.length-1){S.prefs.lastReview=todayISO();closeModal();commit();toast('Weekly review done. See you next week.')}else openReview(step+1);return}
    if(e.target.closest('[data-rvtasks]')){const lines=S.notes.split('\n').map(x=>x.replace(/^\s*([-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean);
      lines.forEach(n=>{const roots=S.tasks.filter(x=>isOpenRoot(x)&&!x.longTerm);S.tasks.push(T({name:n,order:roots.length?Math.max(...roots.map(x=>x.order))+1:0}))});
      const old=S.notes;S.notes='';commit();draw();toast(`Added ${lines.length} task${lines.length===1?'':'s'} from your notes.`,()=>{S.tasks=S.tasks.slice(0,S.tasks.length-lines.length);S.notes=old;commit();if(modal&&modal._rv===0)draw()});return}
    const uh=e.target.closest('[data-rvunhold]');if(uh){const t=byId(uh.dataset.rvunhold);t.onHold=false;t.waitFor='';t.waitSince=null;commit();draw();return}
    const tt=e.target.closest('[data-rvtotasks]');if(tt){const t=byId(tt.dataset.rvtotasks),r=S.tasks.filter(x=>isOpenRoot(x)&&!x.longTerm);t.longTerm=false;t.order=r.length?Math.max(...r.map(x=>x.order))+1:0;commit();draw();return}
  });
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
}
