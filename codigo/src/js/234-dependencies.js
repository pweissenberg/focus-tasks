/* ---------- Task dependencies: a task can wait for other tasks (`t.waits` [taskId], synced as `waits` in 212).
   While one of them is open the row is "Blocked by" (faded, sorted last, can be hidden), the Board card gets a lock and
   the Timeline draws an arrow from the task it waits for. When the last one is done an alert says it is ready to start.
   No cycles: a task that already waits (directly or not) for this one is never offered ---------- */
const LOCK_ICON='<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor"/><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function blockersOf(t){return (t&&t.waits||[]).map(byId).filter(x=>x&&!x.done&&!x.archived)}
const isBlocked=t=>!!t&&!t.done&&blockersOf(t).length>0;
// does `from` wait for `to`, directly or through other tasks?
function dependsOn(from,to,seen=new Set()){if(!from||seen.has(from.id))return false;seen.add(from.id);
  return (from.waits||[]).some(id=>id===to.id||dependsOn(byId(id),to,seen))}
function depCands(t){return S.tasks.filter(x=>x.id!==t.id&&!x.done&&!x.archived&&!x.stepOf&&!dependsOn(x,t))
  .sort((a,b)=>(b.projectId===t.projectId)-(a.projectId===t.projectId)||a.name.localeCompare(b.name))}
const depNames=L=>L.map(x=>`"${x.name}"`).join(', ');

// the edit window: WAITS FOR, chips of the tasks it waits for and a list to add one
{const _oe=openEdit;openEdit=function(id){_oe.apply(this,arguments);const t=byId(id),f=modal&&modal.querySelector('form');if(!t||!f||!f.querySelector('#ed-name'))return;
  let cur=(t.waits||[]).filter(byId);
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<div class="fld dep-fld"><span>WAITS FOR</span><div class="dep-chips"></div><select id="ed-waits" aria-label="Add a task this one waits for"></select></div>`);
  const box=f.querySelector('.dep-chips'),sel=f.querySelector('#ed-waits');
  const paint=()=>{box.innerHTML=cur.map(i=>{const x=byId(i);return `<span class="dep-chip${x.done?' done':''}">${x.done?'✓ ':''}${esc(x.name)}<button type="button" data-depx="${i}" aria-label="Stop waiting for ${esc(x.name)}" title="Remove">×</button></span>`}).join('');
    const L=depCands(t).filter(x=>!cur.includes(x.id));
    sel.innerHTML=`<option value="">${cur.length?'Add another task…':'Nothing. Pick a task it waits for…'}</option>`+L.map(x=>{const p=S.projects.find(q=>q.id===x.projectId);return `<option value="${x.id}">${esc(x.name)}${p&&x.projectId!==t.projectId?` (${esc(p.name)})`:''}</option>`}).join('')};
  paint();
  sel.addEventListener('change',()=>{if(sel.value){cur.push(sel.value);paint()}});
  box.addEventListener('click',e=>{const b=e.target.closest('[data-depx]');if(!b)return;cur=cur.filter(i=>i!==b.dataset.depx);paint()});
  const sub=f.onsubmit;f.onsubmit=e=>{const was=(t.waits||[]).join();t.waits=cur.slice();
    if(was!==t.waits.join()){t.depWas=isBlocked(t);if(typeof logTask==='function')logTask(t,t.waits.length?`now waits for ${depNames(t.waits.map(byId))}`:'no longer waits for other tasks',false)}
    return sub.call(f,e)}}}

// rows: "Blocked by" in the meta line, faded
{const _row=row;row=function(t){const el=_row.apply(this,arguments);if(!isBlocked(t))return el;
  el.classList.add('blocked');const m=el.querySelector('.meta'),B=blockersOf(t);
  if(m)m.insertAdjacentHTML('afterbegin',`<span class="dep-tag" title="Waits for ${esc(depNames(B))}">${LOCK_ICON}Blocked by: ${esc(B.map(x=>x.name).join(', '))}</span>`);
  return el}}
// blocked tasks go after the free ones
{const _c=cmp;cmp=function(a,b){const x=isBlocked(a),y=isBlocked(b);if(x!==y&&!a.done&&!b.done)return x?1:-1;return _c(a,b)}}
// blocked tasks are hidden in Tasks and Long term until the small lock next to On hold is pressed (S.ui.showBlocked)
{const _v=vis;vis=function(t){if(!S.ui.showBlocked&&(S.ui.view==='tasks'||S.ui.view==='long')&&isBlocked(t))return false;return _v(t)}}
{const h=$('#holdToggle');if(h)h.insertAdjacentHTML('afterend',`<button class="holdtoggle locktoggle" id="blockToggle" type="button" hidden>${LOCK_ICON}</button>`);
  $('#blockToggle').addEventListener('click',()=>{S.ui.showBlocked=!S.ui.showBlocked;commit()})}
const blockedHere=()=>{const u=S.ui;return S.tasks.filter(t=>isBlocked(t)&&!t.archived&&(u.view==='long'?rootOf(t).longTerm:!rootOf(t).longTerm)&&(u.tag==='all'||t.tagId===u.tag)&&(u.project==='all'||t.projectId===u.project)).length};

function depAfterRender(){
  const u=S.ui;
  // the lock next to On hold, only while there are blocked tasks here
  const lb=$('#blockToggle');if(lb){const n=(u.view==='tasks'||u.view==='long')?blockedHere():0;lb.hidden=!n;lb.classList.toggle('on',!!u.showBlocked);
    lb.title=u.showBlocked?`Hide the ${n} blocked task${n===1?'':'s'}`:`Show ${n} blocked task${n===1?'':'s'} (waiting for other tasks)`;lb.setAttribute('aria-label',lb.title);lb.setAttribute('aria-pressed',!!u.showBlocked)}
  // Board: a lock on blocked cards
  document.querySelectorAll('.bcard[data-bid]').forEach(c=>{const t=byId(c.dataset.bid);if(!isBlocked(t)||c.querySelector('.dep-lock'))return;c.classList.add('blocked');
    const top=c.querySelector('.bc-top');if(top)top.insertAdjacentHTML('afterbegin',`<span class="dep-lock" title="Blocked by ${esc(depNames(blockersOf(t)))}">${LOCK_ICON}</span>`)});
  // Timeline: arrows from the end of the task it waits for to the start of this one
  const g=document.querySelector('.gantt .g-grid');if(g){g.querySelector('.g-deps')?.remove();const gr=g.getBoundingClientRect(),P=[];
    g.querySelectorAll('.g-bar[data-gid]').forEach(b=>{const t=byId(b.dataset.gid);(t&&t.waits||[]).forEach(i=>{const a=g.querySelector(`.g-bar[data-gid="${i}"]`);if(!a)return;
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),x1=ra.right-gr.left,y1=ra.top+ra.height/2-gr.top,x2=rb.left-gr.left-2,y2=rb.top+rb.height/2-gr.top,mx=Math.max(x1+8,Math.min(x2-8,x1+(x2-x1)/2));
      const sx=Math.min(x1-6,x2-8),d=x2-x1>=16?`M${x1} ${y1}H${mx}V${y2}H${x2}`:`M${sx} ${ra.bottom-gr.top}V${y2}H${x2}`;
      P.push(`<path d="${d}" class="${byId(i).done?'ok':''}"/>`)})});
    if(P.length)g.insertAdjacentHTML('beforeend',`<svg class="g-deps" width="${g.scrollWidth}" height="${g.scrollHeight}" aria-hidden="true"><defs><marker id="gdep-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="context-stroke"/></marker></defs>${P.join('')}</svg>`)}
  // unblocked: an alert once, for the person responsible (or anyone when no one is)
  let ch=false;S.tasks.forEach(t=>{if(!t.waits||!t.waits.length)return;const now=isBlocked(t);
    if(t.depWas&&!now&&!t.done&&(!t.assignee||t.assignee===CL.uid)){const D=t.waits.map(byId).filter(Boolean);
      if(typeof addAlert==='function')addAlert(`"${t.name}" is ready to start: ${depNames(D)} ${D.length===1?'is':'are'} done.`,t.id,t.projectId);
      if(typeof logTask==='function')logTask(t,'ready to start, the tasks it waited for are done',false);
      setTimeout(()=>toast(`"${t.name}" is ready to start.`),0)}
    if(!!t.depWas!==now){t.depWas=now;ch=true}});
  if(ch)saveSoon()}
{const _r=render;render=function(){_r.apply(this,arguments);try{depAfterRender()}catch(e){console.error(e)}}}

// examples to try it, once per account (tests turn them off with FOCUS_NO_DEMO)
{const _r=render;render=function(){
  if(!window.FOCUS_NO_DEMO&&S.prefs&&!S.prefs.demoDeps&&S.tasks.length){S.prefs.demoDeps=true;
    const p=S.projects.find(x=>x.id==='p_research')||S.projects.find(x=>!x.archived),pid=p?p.id:null,d=todayISO(),now=new Date().toISOString();
    const a=T({name:'Run the survey analysis',projectId:pid,start:d,due:isoAdd(d,2),createdAt:now,order:-3}),
      b=T({name:'Write the survey report',projectId:pid,start:isoAdd(d,3),due:isoAdd(d,5),createdAt:now,order:-2,waits:[a.id],depWas:true}),
      c=T({name:'Present the survey results',projectId:pid,start:isoAdd(d,6),due:isoAdd(d,7),createdAt:now,order:-1,waits:[b.id],depWas:true});
    S.tasks.push(a,b,c);save()}
  return _r.apply(this,arguments)}}

// add bars, Advanced settings: "Block task until [open task] is done" (ADV[k].a.block)
{const _ap=advPanelHTML;advPanelHTML=function(k){const h=_ap(k),a=ADV[k].a,L=S.tasks.filter(x=>!x.done&&!x.archived&&!x.stepOf).sort((x,y)=>x.name.localeCompare(y.name));
  if(a.block&&!L.some(x=>x.id===a.block))a.block='';
  const f=`<label class="afld dep-afld"><span>Block task until</span><span class="dep-arow"><select id="${k}-block" data-adv="block"><option value="">Nothing (not blocked)</option>${L.map(x=>{const p=S.projects.find(q=>q.id===x.projectId);return `<option value="${x.id}"${a.block===x.id?' selected':''}>${esc(x.name)}${p?` (${esc(p.name)})`:''}</option>`}).join('')}</select><em>is done</em></span></label>`;
  return h.replace('<p class="sp-hint" data-advhint',f+'<p class="sp-hint" data-advhint')}}
{const _s=advIsSet;advIsSet=k=>_s(k)||!!ADV[k].a.block}
{const _s=advSummary;advSummary=k=>{const b=ADV[k].a.block&&byId(ADV[k].a.block);return [_s(k),b?`blocked until "${b.name}" is done`:''].filter(Boolean).join(', ')}}
{const _af=addFromBar;addFromBar=function(k,o){const b=ADV[k].a.block&&byId(ADV[k].a.block),t=_af.apply(this,arguments);
  if(b&&t&&!b.done){t.waits=[b.id];t.depWas=true;if(typeof logTask==='function')logTask(t,`now waits for "${b.name}"`,false);
    if(!S.ui.showBlocked)setTimeout(()=>toast(`"${t.name}" is blocked until "${b.name}" is done. The lock next to On hold shows it.`),0)}
  return t}}
