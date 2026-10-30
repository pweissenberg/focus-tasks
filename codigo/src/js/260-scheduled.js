/* ---------- v95: schedule when a task enters the list (Pedro) ----------
   Add bars, Advanced settings: "Show from" (ADV[k].a.from, empty = now) saves t.defer (222: hidden until that day).
   The 222 "deferred" line and the 253 recurring line become one line at the end of the list,
   with "See scheduled" opening a window of the tasks still to come (Show now, Edit, show them in the list). */
{const _ap=advPanelHTML;advPanelHTML=function(k){const a=ADV[k].a;
  const f=`<label class="afld"><span>Show from</span><input id="${k}-from" data-adv="from" type="text" class="mono" placeholder="Now (MM/DD/YYYY)" value="${esc(a.from||'')}"></label>`;
  return _ap(k).replace('<label class="afld"><span>Repeat</span>',f+'<label class="afld"><span>Repeat</span>')}}
{const _sh=advShow;advShow=function(k,open){_sh.apply(this,arguments);const f=advForm(k),i=f&&f.querySelector(`#${k}-from`);if(i)bindDate(i)}}
const advFrom=k=>{const v=parseDate(ADV[k].a.from||'');return v&&v>todayISO()?v:''};
{const _s=advIsSet;advIsSet=k=>_s(k)||!!advFrom(k)}
{const _s=advSummary;advSummary=k=>{const v=advFrom(k);return [_s(k),v?'shows from '+isoToUS(v):''].filter(Boolean).join(', ')}}
{const _sy=advSync;advSync=function(k){_sy.apply(this,arguments);const f=advForm(k),P=f&&f.querySelector('.cadv');if(!P)return;
  const raw=(ADV[k].a.from||'').trim(),v=parseDate(raw),h=P.querySelector('[data-advhint]');let m='';
  if(raw&&v&&v<=todayISO())m='That day is not in the future: the task shows now.';
  else if(v&&v>todayISO())m=`The task stays out of the list until ${isoToUS(v)}.`;
  if(m){h.textContent=(h.hidden?'':h.textContent+' ')+m;h.hidden=false}}}
{const _af=addFromBar;addFromBar=function(k,o){const v=advFrom(k),t=_af.apply(this,arguments);
  if(v&&t){t.defer=v;if(!S.ui.showDeferred)setTimeout(()=>toast(`"${t.name}" is scheduled: it enters the list on ${isoToUS(v)}.`),0)}
  return t}}
// one line at the end of the list: recurring + scheduled
const schedRows=()=>S.tasks.filter(t=>isDeferred(t)&&!t.archived&&!t.stepOf).sort((a,b)=>a.defer.localeCompare(b.defer)||a.name.localeCompare(b.name));
{const _r=render;render=function(){_r.apply(this,arguments);const u=S.ui;if(!(u.view==='tasks'||u.view==='long'))return;
  list.querySelectorAll(':scope>.defline').forEach(x=>x.remove());
  const r=S.tasks.filter(t=>repWaiting(t)&&inView(t)&&matches(t)).length,d=S.tasks.filter(t=>isDeferred(t)&&inView(t)&&matches(t)).length;if(!r&&!d)return;
  const pr=r?`${r} recurring task${r===1?' is':'s are'} waiting for ${r===1?'its':'their'} day and will show the day before. <button type="button" class="linkbtn" data-recall>See all recurring</button>`:'';
  const pd=d?`${u.showDeferred?`Showing ${d} scheduled task${d===1?'':'s'}.`:`${d} scheduled task${d===1?' enters':'s enter'} the list on ${d===1?'its':'their'} date.`} <button type="button" class="linkbtn" data-schedall>See scheduled</button>`:'';
  list.insertAdjacentHTML('beforeend',`<div class="defline recline schedline">${pr}${pr&&pd?'<span class="sch-sep">·</span>':''}${pd}</div>`)}}
const schedDay=iso=>{const t0=todayISO();if(iso===isoAdd(t0,1))return'Tomorrow';const d=isoDate(iso);
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'})};
function schedBodyHTML(){const R=schedRows();if(!R.length)return '<p class="dl-empty">No scheduled tasks. Pick "Show from" in the add bar\'s advanced settings or in a task\'s edit window.</p>';
  return `<ul class="rec-list">${R.map(t=>{const tag=tagOf(t),p=projOf(t);
    return `<li class="rec-row waiting" style="--c:${colorOf(t)}"><div class="rec-txt"><div class="rec-name">${t.prio?`<span class="pflag pr${t.prio}">${icons.flag}</span>`:''}${esc(t.name)}</div>
      <div class="rec-meta"><span class="rec-st wait">Enters ${esc(schedDay(t.defer))}</span>${t.due?`<span>Due ${esc(isoToUS(t.due))}</span>`:''}${tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''}${p?`<span class="projtag">${esc(projFull(p))}</span>`:''}${t.longTerm?'<span>Long term</span>':''}</div></div>
      <div class="rec-act"><button type="button" class="linkbtn" data-schnow="${t.id}">Show now</button><button type="button" class="linkbtn" data-schedit="${t.id}">Edit</button></div></li>`}).join('')}</ul>`}
function openScheduled(){closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  const paint=()=>{back.innerHTML=`<div class="modal recwin schedwin" role="dialog" aria-modal="true" aria-labelledby="sch-h"><div class="rec-top"><h2 id="sch-h">Scheduled tasks</h2><span class="sp-hint">They stay out of the list until their day. Set the day in "Show from".</span></div>
    <div class="rec-body">${schedBodyHTML()}</div><div class="modal-actions">${schedRows().length?`<button type="button" class="linkbtn" data-defshow>${S.ui.showDeferred?'Hide them from the list':'Show them in the list'}</button>`:''}<button type="button" class="btn primary" data-x>Close</button></div></div>`};
  paint();document.body.appendChild(back);modal=back;
  back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-x]')){closeModal();render();return}
    if(e.target.closest('[data-defshow]')){S.ui.showDeferred=!S.ui.showDeferred;commit();closeModal();render();return}
    const n=e.target.closest('[data-schnow]');if(n){const t=byId(n.dataset.schnow);if(t){t.defer=null;if(typeof logTask==='function')logTask(t,'shown now (was scheduled)',false);commit();toast(`"${t.name}" is in the list now.`)}
      if(schedRows().length){paint();modal=back}else{closeModal();render()}return}
    const ed=e.target.closest('[data-schedit]');if(ed){openEdit(ed.dataset.schedit);
      const m=modal;if(m){const ob=new MutationObserver(()=>{if(!m.isConnected){ob.disconnect();if(!modal&&schedRows().length)openScheduled()}});ob.observe(document.body,{childList:true})}}});
  back.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();render()}});
  back.querySelector('[data-x]').focus()}
list.addEventListener('click',e=>{if(e.target.closest('[data-schedall]'))openScheduled()});
