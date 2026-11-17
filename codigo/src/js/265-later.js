/* ---------- v103: Later (was "Long term") (Pedro) ----------
   The Long term view is now called Later. "↑ Send to later" on a task asks when it comes back:
   - a date sets t.defer (222/260: hidden from Tasks until that day, then it enters on its own) and t.laterBack=true;
   - "No date" is the old Long term (t.longTerm, stays until moved back).
   The Later view also lists every task still waiting for its "Show from" date, first and by date ("Coming back"),
   then the ones with no date. "↓ Back now" / "↓ Back to tasks" and "Change date" / "Set a date" sit on each row. */
const laterDated=t=>!t.done&&!t.parentId&&isDeferred(t);
{const _iv=inView;inView=function(t){if(S.ui.view==='long'){const r=rootOf(t);return !!r.longTerm||isDeferred(r)}return _iv(t)}}
// in Later the dated ones always show (222 hides deferred tasks elsewhere)
{const _v=vis;vis=function(t){const u=S.ui;if(u.view!=='long'||u.showDeferred)return _v(t);u.showDeferred=true;try{return _v(t)}finally{u.showDeferred=false}}}
// in Later: dated ones first, soonest first
{const _c=cmp;cmp=function(a,b){if(S.ui.view==='long'&&!a.parentId&&!b.parentId){const x=laterDated(a)?a.defer:'',y=laterDated(b)?b.defer:'';
  if(x!==y){if(!x)return 1;if(!y)return -1;return x<y?-1:1}}return _c(a,b)}}
const laterDay=iso=>{const t0=todayISO();if(iso===isoAdd(t0,1))return'tomorrow';const d=isoDate(iso);
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'})};
function laterEnd(lt,id){const r=S.tasks.filter(x=>x.id!==id&&isOpenRoot(x)&&!!x.longTerm===lt);return r.length?Math.max(...r.map(x=>x.order))+1:0}
function laterSet(t,iso){ // iso = return date, '' = no date (stays in Later), null = back to Tasks now
  const old={longTerm:t.longTerm,defer:t.defer||null,laterBack:!!t.laterBack,order:t.order};
  if(iso===null){t.longTerm=false;t.defer=null;t.laterBack=false;t.order=laterEnd(false,t.id)}
  else if(iso){if(t.longTerm)t.order=laterEnd(false,t.id);t.longTerm=false;t.defer=iso;t.laterBack=true}
  else{t.longTerm=true;t.defer=null;t.laterBack=false;t.order=laterEnd(true,t.id)}
  if(typeof logTask==='function')logTask(t,iso===null?'brought back to Tasks':iso?`sent to Later until ${isoToUS(iso)}`:'sent to Later (no date)',false);
  commit();
  toast(iso===null?`"${t.name}" is back in Tasks.`:iso?`"${t.name}" is in Later and comes back on ${isoToUS(iso)}.`:`"${t.name}" moved to Later.`,()=>{Object.assign(t,old);commit()})}
function openLaterPop(anchor,t){
  const t0=todayISO(),cur=isDeferred(t)?t.defer:'';
  const q=[['Tomorrow',isoAdd(t0,1)],['Next week',isoAdd(t0,7)],['In 2 weeks',isoAdd(t0,14)],['In a month',isoAdd(t0,30)]];
  openPop(anchor,`<form class="pop-form later-pop"><strong>${t.longTerm||cur?'When does it come back?':'Send to Later'}</strong>
    <p class="sp-hint">It leaves your Tasks list and comes back on this day.</p>
    <div class="lp-quick">${q.map(([l,d])=>`<button type="button" class="chipbtn${cur===d?' on':''}" data-lq="${d}">${l}</button>`).join('')}</div>
    <label class="afld"><span>Or pick a day</span><input type="date" id="lp-date" class="mono" min="${isoAdd(t0,1)}" value="${cur}"></label>
    <div class="pop-actions">${t.longTerm&&!cur?'':`<button type="button" class="linkbtn" data-lnodate title="Keep it in Later until you move it back">No date</button>`}<button class="btn sm primary">${t.longTerm||cur?'Save':'Send'}</button></div></form>`,el=>{
    const f=el.querySelector('form'),di=f.querySelector('#lp-date');
    f.addEventListener('click',e=>{const b=e.target.closest('[data-lq]');if(b){closePop();laterSet(t,b.dataset.lq);return}
      if(e.target.closest('[data-lnodate]')){closePop();laterSet(t,'')}});
    f.onsubmit=e=>{e.preventDefault();const v=di.value;if(!v||v<=t0){di.classList.add('invalid');di.focus();return}closePop();laterSet(t,v)}})}
// row buttons: replace 102's single "Send to long term" / "Back to tasks" button
{const _row=row;row=function(t,depth){const el=_row.apply(this,arguments);const b=el.querySelector(':scope [data-ltsend]');
  if(!b||t.done||t.parentId)return el;
  const dated=isDeferred(t),inLater=t.longTerm||dated;
  if(!inLater){b.textContent='↑ Send to later';b.title='Move it to Later, with a day to come back';return el}
  const pair=document.createElement('span');pair.className='lt-pair';
  pair.innerHTML=`<button class="lt-send" type="button" data-ltsend title="Move it back to Tasks now">${dated?'↓ Back now':'↓ Back to tasks'}</button><button class="lt-send lt-date" type="button" data-ldate title="${dated?'Change the day it comes back':'Pick a day for it to come back'}">${dated?'Change date':'Set a date'}</button>`;
  b.replaceWith(pair);
  if(dated&&t.laterBack){const c=el.querySelector('.defc');if(c){c.textContent='Back on '+isoToUS(t.defer);c.title='Comes back to Tasks on this day'}}
  return el}}
document.addEventListener('click',e=>{const b=e.target.closest('#list [data-ltsend], #list [data-ldate]');if(!b)return;
  const r=b.closest('.task'),t=r&&byId(r.dataset.id);if(!t)return;e.stopPropagation();e.preventDefault();
  if(b.hasAttribute('data-ldate')){openLaterPop(b,t);return}
  if(t.longTerm||isDeferred(t))laterSet(t,null);else openLaterPop(b,t)},true);
// Later view: section labels, no "scheduled" end line (they are in the list); old flag cleared once the day came
{const _r=render;render=function(){S.tasks.forEach(t=>{if(t.laterBack&&!isDeferred(t))t.laterBack=false});_r.apply(this,arguments);
  if(S.ui.view!=='long')return;
  const line=list.querySelector(':scope>.schedline');if(line){const sep=line.querySelector('.sch-sep');
    if(line.querySelector('[data-recall]')&&sep){while(sep.nextSibling)sep.nextSibling.remove();sep.remove()}else if(!line.querySelector('[data-recall]'))line.remove()}
  const roots=[...list.querySelectorAll(':scope>.task')].filter(r=>{const t=byId(r.dataset.id);return t&&!t.parentId});
  const d=roots.filter(r=>laterDated(byId(r.dataset.id))),n=roots.filter(r=>!laterDated(byId(r.dataset.id)));
  if(d.length){const h=document.createElement('div');h.className='listdiv later-h';h.innerHTML=`Coming back<span class="n">${d.length}</span>`;d[0].before(h);
    if(n.length){const h2=document.createElement('div');h2.className='listdiv later-h';h2.innerHTML=`No date<span class="n">${n.length}</span>`;n[0].before(h2)}}}}
