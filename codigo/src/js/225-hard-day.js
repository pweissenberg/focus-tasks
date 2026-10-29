/* ---------- the day: hard task chosen for the day (S.prefs.hard {id,date}), Plan my day, Daily review (S.journal {iso:text}).
   Plan / review live in the rail's review menu ---------- */
// work days (Mon-Fri) since a timestamp, not counting the day it was created
function workDaysSince(ts){let n=0;const d=new Date(ts),e=isoDate(todayISO());d.setHours(0,0,0,0);d.setDate(d.getDate()+1);
  for(;d<=e;d.setDate(d.getDate()+1)){const w=d.getDay();if(w&&w!==6)n++}return n}
const hardOk=t=>!!(t&&!t.done&&!t.stepOf&&!t.onHold&&!rootOf(t).longTerm&&workDaysSince(t.createdAt)>2);
function hardTask(){const h=S.prefs.hard;if(!h)return null;const t=h.date===todayISO()&&byId(h.id);
  if(!t||t.done||t.onHold||rootOf(t).longTerm){S.prefs.hard=null;return null}return t}
const FROG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>';
{const _r=render;render=function(){_r.apply(this,arguments);
  if(S.ui.view!=='tasks')return;const t=hardTask();
  if(t){const old=list.querySelector(`:scope > .task[data-id="${t.id}"]`);if(old){const nx=old.nextElementSibling;if(nx&&nx.dataset&&nx.dataset.mtfor===t.id)nx.remove();old.remove()}
    const sec=document.createElement('div');sec.className='hard-sec';
    sec.innerHTML=`<div class="hard-h">${FROG}<b>Hard task chosen for the day</b><span>Do it first.</span><button type="button" class="linkbtn" data-hardx title="Stop showing a hard task today">Not today</button></div>`;
    const r=row(t,0);sec.appendChild(r);list.prepend(sec);
    const m=typeof microHTML==='function'&&!r.classList.contains('hold-min')&&microHTML(t);if(m){r.insertAdjacentHTML('afterend',m);r.classList.add('has-mt');const b=r.nextElementSibling;b.style.setProperty('--c',r.style.getPropertyValue('--c'))}}
  /* no hard task chosen: nothing shows in the list (Pedro, v46); it is picked from the Plan and review menu */}}
function openHardPop(anchor){
  const ts=S.tasks.filter(hardOk).sort((a,b)=>(b.prio||0)-(a.prio||0)||a.createdAt.localeCompare(b.createdAt));
  openPop(anchor,`<div class="acct-menu hard-menu" role="menu" aria-label="Hard task for today"><div class="asg-h">Pick the task you keep putting off</div>${ts.slice(0,12).map(t=>`<button type="button" role="menuitem" data-hardset="${t.id}"><i style="background:${colorOf(t)}"></i><span>${esc(t.name)}</span><em>${workDaysSince(t.createdAt)} work days</em></button>`).join('')}<p class="sp-hint">Only tasks open for more than 2 work days.</p></div>`,el=>{
    el.classList.add('pop-menu');place(el,anchor);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-hardset]');if(!b)return;S.prefs.hard={id:b.dataset.hardset,date:todayISO()};closePop();commit()})});
}
list.addEventListener('click',e=>{
  const p=e.target.closest('[data-hardpick]');if(p){e.stopPropagation();openHardPop(p);return}
  if(e.target.closest('[data-hardx]')){e.stopPropagation();const old=S.prefs.hard;S.prefs.hard={id:null,date:todayISO()};commit();toast('No hard task today.',()=>{S.prefs.hard=old;commit()})}
},true);
// "Not today" hides the picker too until tomorrow
{const _r2=render;render=function(){_r2.apply(this,arguments);const h=S.prefs.hard;if(h&&!h.id&&h.date===todayISO()){const b=list.querySelector('[data-hardpick]');if(b)b.remove()}}}

/* Plan my day: quick tasks first, then the hard task, then what is urgent, then the rest; fitted into free time today */
const hm2ms=s=>{const [h,m]=String(s).split(':').map(Number);const d=isoDate(todayISO());d.setHours(h||0,m||0,0,0);return +d};
const msToHM=ms=>{const d=new Date(ms);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function planOrder(){
  const today=todayISO(),tom=isoAdd(today,1),h=hardTask(),day0=+isoDate(today),day1=day0+DAY;
  const planned=new Set(S.sessions.filter(x=>x.start>=Date.now()&&x.start<day1).map(x=>x.taskId));
  const open=S.tasks.filter(t=>!t.done&&!t.stepOf&&!t.onHold&&!rootOf(t).longTerm&&!(typeof isDeferred==='function'&&isDeferred(t))&&!planned.has(t.id)&&!kids(t).length);
  const urgent=t=>(t.due&&t.due<=tom)||t.prio===3;
  const rank=t=>isQuick(t)?0:t===h?1:urgent(t)?2:3;
  return open.sort((a,b)=>rank(a)-rank(b)||(a.due||'9999').localeCompare(b.due||'9999')||(b.prio||0)-(a.prio||0)||cmp(a,b)).map(t=>({t,why:['quick','hard task','urgent',''][rank(t)]}));
}
function fitPlan(items,startMs,endMs,defMin){
  const busy=S.sessions.filter(x=>x.end>startMs&&x.start<endMs).map(x=>[x.start,x.end]).sort((a,b)=>a[0]-b[0]);
  let cur=startMs;const out=[];
  for(const it of items){if(!it.on)continue;const len=Math.max(1,Math.round(it.t.est||defMin))*60000;
    for(const [a,b] of busy){if(cur<b&&cur+len>a)cur=b}
    if(cur+len>endMs)break;out.push({t:it.t,start:cur,end:cur+len,why:it.why});cur+=len}
  return out;
}
function openPlanDay(){
  closePop();closeModal();
  const now=Date.now(),q=15*60000,st0=Math.max(Math.ceil(now/q)*q,hm2ms('09:00'));
  const items=planOrder().map(x=>Object.assign(x,{on:x.why!==''||false}));
  // fill with the rest only if the important ones leave room
  let startS=msToHM(st0),endS='18:00',def=30;
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal review plan" role="dialog" aria-modal="true" aria-labelledby="pd-h"><h2 id="pd-h">Plan my day</h2>
    <p class="sp-hint">Quick tasks first, then the hard task, then what is due by tomorrow or high priority. Untick what you don't want; tick more to fill the day.</p>
    <div class="pd-opts"><label>From <input type="time" id="pd-from" value="${startS}"></label><label>Until <input type="time" id="pd-to" value="${endS}"></label><label>Tasks without a time take <select id="pd-def">${[15,30,45,60].map(v=>`<option value="${v}"${v===def?' selected':''}>${v} min</option>`).join('')}</select></label></div>
    <div class="rv-body"></div>
    <div class="modal-actions"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn primary" data-pdgo>Add to calendar</button></div></div>`;
  document.body.appendChild(back);modal=back;
  const body=back.querySelector('.rv-body');let plan=[];
  const draw=()=>{plan=fitPlan(items,hm2ms(startS),hm2ms(endS),def);const inPlan=new Map(plan.map(p=>[p.t.id,p]));
    body.innerHTML=items.length?`<div class="rv-list">${items.map((it,i)=>{const p=inPlan.get(it.t.id);return `<label class="rv-row pd-row${it.on&&!p?' nofit':''}"><input type="checkbox" data-pdi="${i}"${it.on?' checked':''}><span class="pd-time mono">${p?`${msToHM(p.start)}–${msToHM(p.end)}`:it.on?'no room':''}</span><span class="rv-name"><i style="background:${colorOf(it.t)}"></i>${esc(it.t.name)}</span>${it.why?`<span class="pd-why ${it.why.replace(' ','-')}">${it.why}</span>`:''}<span class="rv-meta">${it.t.est?fmtEst(it.t.est):def+'m?'}</span></label>`}).join('')}</div>`
      :'<p class="rv-ok">Nothing open to plan.</p>';
    back.querySelector('[data-pdgo]').textContent=plan.length?`Add ${plan.length} block${plan.length===1?'':'s'} to the calendar`:'Add to calendar';back.querySelector('[data-pdgo]').disabled=!plan.length};
  draw();
  back.addEventListener('change',e=>{const c=e.target.closest('[data-pdi]');if(c){items[+c.dataset.pdi].on=c.checked;draw();return}
    if(e.target.id==='pd-from')startS=e.target.value||startS;if(e.target.id==='pd-to')endS=e.target.value||endS;if(e.target.id==='pd-def')def=+e.target.value;draw()});
  back.addEventListener('click',e=>{if(e.target.closest('[data-x]')){closeModal();return}
    if(e.target.closest('[data-pdgo]')&&plan.length){plan.forEach(p=>S.sessions.push({id:uid(),taskId:p.t.id,name:p.t.name,tagId:p.t.tagId,projectId:p.t.projectId,start:p.start,end:p.end,manual:true}));
      const n=plan.length,ids=new Set();closeModal();commit();toast(`Planned ${n} block${n===1?'':'s'} today. They are in the calendar.`,()=>{const keep=new Set(plan.map(p=>p.start+'|'+p.t.id));S.sessions=S.sessions.filter(x=>!(x.manual&&keep.has(x.start+'|'+x.taskId)));commit()},'Undo')}});
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
}

/* Daily review: what got done, move what is left to tomorrow, a note about the day */
function openDailyReview(){
  closePop();closeModal();
  const today=todayISO(),tom=isoAdd(today,1),d0=+isoDate(today);
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal review" role="dialog" aria-modal="true" aria-labelledby="dr-h"><h2 id="dr-h">Daily review</h2><div class="rv-body"></div>
    <div class="modal-actions"><button type="button" class="btn" data-x>Close</button><button type="button" class="btn primary" data-drdone>Done for today</button></div></div>`;
  document.body.appendChild(back);modal=back;
  const body=back.querySelector('.rv-body');
  const draw=()=>{const done=S.tasks.filter(t=>t.done&&t.doneAt&&+new Date(t.doneAt)>=d0),h=hardTask();
    const left=S.tasks.filter(t=>!t.done&&!t.stepOf&&(t.due&&t.due<=today||t===h));
    const ms=S.sessions.reduce((n,x)=>n+Math.max(0,Math.min(x.end,Date.now())-Math.max(x.start,d0)),0);
    body.innerHTML=`<h3 class="dr-h">Done today <span>${done.length} task${done.length===1?'':'s'}${ms>=60000?` · ${fmtDur(ms)} tracked`:''}</span></h3>
      ${done.length?`<div class="rv-list">${done.map(t=>`<div class="rv-row"><span class="rv-name"><i style="background:${colorOf(t)}"></i>${esc(t.name)}</span><span class="rv-meta">✓</span></div>`).join('')}</div>`:'<p class="sp-hint">Nothing ticked today yet.</p>'}
      <h3 class="dr-h">Still open for today <span>${left.length}</span>${left.length>1?'<button type="button" class="linkbtn" data-drall>Move all to tomorrow</button>':''}</h3>
      ${left.length?`<div class="rv-list">${left.map(t=>`<div class="rv-row"><span class="rv-name"><i style="background:${colorOf(t)}"></i>${esc(t.name)}</span><span class="rv-meta${t.due&&t.due<today?' late':''}">${t===h?'hard task':t.due<today?'overdue':'due today'}</span><button type="button" class="linkbtn" data-drtom="${t.id}">→ Tomorrow</button></div>`).join('')}</div>`:'<p class="rv-ok">Nothing left for today.</p>'}
      <h3 class="dr-h">How was the day?</h3><textarea id="dr-note" rows="3" placeholder="One line about today: what went well, what got in the way">${esc(S.journal[today]||'')}</textarea>`};
  draw();
  const toTom=t=>{t.due=tom;if(S.prefs.hard&&S.prefs.hard.id===t.id)S.prefs.hard=null};
  back.addEventListener('input',e=>{if(e.target.id==='dr-note'){const v=e.target.value;if(v.trim())S.journal[today]=v;else delete S.journal[today];save()}});
  back.addEventListener('click',e=>{if(e.target.closest('[data-x]')){closeModal();return}
    if(e.target.closest('[data-drdone]')){S.prefs.lastDaily=today;closeModal();commit();toast('Day reviewed. See you tomorrow.');return}
    const b=e.target.closest('[data-drtom]');if(b){toTom(byId(b.dataset.drtom));commit();draw();return}
    if(e.target.closest('[data-drall]')){const h=hardTask();S.tasks.filter(t=>!t.done&&!t.stepOf&&(t.due&&t.due<=today||t===h)).forEach(toTom);commit();draw()}});
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
}
// the review button opens a small menu: plan the day, review the day, review the week
{const b=$('#reviewBtn');if(b){const nb=b.cloneNode(true);b.replaceWith(nb);nb.title='Plan and review';nb.setAttribute('aria-label','Plan and review');nb.setAttribute('aria-haspopup','menu');
  nb.addEventListener('click',()=>openPop(nb,`<div class="acct-menu" role="menu" aria-label="Plan and review"><button type="button" role="menuitem" data-rvm="plan">Plan my day</button><button type="button" role="menuitem" data-rvm="daily">Daily review</button>${S.tasks.some(hardOk)?'<button type="button" role="menuitem" data-rvm="hard">Hard task of the day</button>':''}<button type="button" role="menuitem" data-rvm="weekly">Weekly review${!S.prefs.lastReview||daysSince(S.prefs.lastReview)>=7?' <span class="ck">due</span>':''}</button></div>`,el=>{
    el.classList.add('pop-menu');const r=nb.getBoundingClientRect();el.style.top=Math.max(8,r.top)+'px';el.style.left=Math.max(8,r.left-el.offsetWidth-8)+'px';
    el.addEventListener('click',e=>{const m=e.target.closest('[data-rvm]');if(!m)return;const k=m.dataset.rvm;closePop();if(k==='hard')openHardPop(nb);else if(k==='plan')openPlanDay();else if(k==='daily')openDailyReview();else openReview(0)})}))}}

{const _pd=paintReviewDot;paintReviewDot=function(){_pd.apply(this,arguments);const b=$('#reviewBtn');if(b)b.title='Plan my day, daily review, weekly review'+(b.classList.contains('due')?' (weekly review due)':'')}}
