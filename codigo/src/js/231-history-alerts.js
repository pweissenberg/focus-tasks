/* ---------- Task history, alerts, "Done my part" on tasks people wait on you for, and tasks that come back to you.
   History: t.log [{id,at,by,what}] (synced on shared tasks, 212), shown from the page icon next to Send / Share. Subtask and
   microtask events are also written on the top task. Alerts: S.alerts [{id,at,text,taskId,read}] behind the bell in the rail.
   A task that comes back off hold because the others did their part gets t.backAt / t.backFrom until you press its banner ---------- */
SYNC_KEYS.push('alerts');
const LOG_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
const BELL_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
const rootTask=t=>{let r=t,n=0;while(r&&r.parentId&&n++<50){const p=byId(r.parentId);if(!p)break;r=p}return r};
const whenTxt=at=>new Date(at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
const logWho=by=>by?(CL.prof[by]?(CL.prof[by].name||CL.prof[by].email):by===CL.uid?personName(by):'Someone'):'You';
function logTask(t,what,alsoRoot=true){if(!t)return;const at=new Date().toISOString(),by=CL.uid||null;
  const add=x=>{x.log=[...(x.log||[]),{id:uid(),at,by,what}].slice(-300)};add(t);
  if(alsoRoot){const r=rootTask(t);if(r&&r!==t)add(r)}}
// a change on a row is read back a moment later (done and hold can animate) and written to the history once
function watchChange(id,read,write){const before=read();let n=0;const tick=()=>{const t=byId(id);if(!t)return;const now=read();
  if(now!==before){write(t,now);save();return}if(++n<8)setTimeout(tick,200)};setTimeout(tick,0)}
document.addEventListener('change',e=>{const el=e.target;if(!el.closest)return;
  const row=el.closest('.task[data-id]');
  if(row&&el.matches('[data-act="done"]')){const id=row.dataset.id;watchChange(id,()=>!!(byId(id)||{}).done,(t,d)=>{
    if(t.parentId)logTask(t,`${d?'did':'reopened'} the subtask "${t.name}"`,false),logTask(rootTask(t),`${d?'did':'reopened'} the subtask "${t.name}"`,false);
    else logTask(t,d?'marked it done':'reopened it')});return}
  if(row&&el.matches('[data-act="hold"]')){const id=row.dataset.id;watchChange(id,()=>!!(byId(id)||{}).onHold,(t,h)=>logTask(t,h?(t.parentId?`put the subtask "${t.name}" on hold`:'put it on hold'):(t.parentId?`took the subtask "${t.name}" off hold`:'took it off hold')));return}
  if(el.matches('[data-mtcheck]')){const w=el.closest('[data-mtfor]'),mid=el.closest('[data-mt]');if(!w||!mid)return;const id=w.dataset.mtfor,m=mid.dataset.mt;
    watchChange(id,()=>{const t=byId(id),x=t&&(t.micro||[]).find(y=>y.id===m);return !!(x&&x.done)},(t,d)=>{const x=(t.micro||[]).find(y=>y.id===m);if(!x)return;
      const what=`${d?'did':'unticked'} the microtask "${x.name}"${t.parentId?` of the subtask "${t.name}"`:''}`;logTask(t,what)})}
},true);
// Done my part (button or checkbox) and Send / Share go in the history too
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-wfmdone]');if(!b)return;const t=byId(b.dataset.wfmdone);if(t)logTask(t,'did their part')},true);
{const _st=shareTask;shareTask=async function(t,person,mode){const ok=await _st.apply(this,arguments);
  if(ok!==false&&t){const who=person&&(person.id?personName(person.id):person.email)||'someone';const sent=t.sentBy===CL.uid&&(t.sentTo||[]).includes(person&&(person.id||person.email));
    logTask(t,sent?`sent it to ${who}`:mode==='pass'?`passed it to ${who}`:`shared it with ${who}`,false);save()}return ok}}
{const _owp=openWaitPop;openWaitPop=function(anchor,t){_owp(anchor,t);const f=pop&&pop.el&&pop.el.querySelector('.wait-pop');if(!f)return;
  f.addEventListener('submit',()=>setTimeout(()=>{if(t.waitFor)logTask(t,`is waiting for ${t.waitFor}`,false),save()},0),true)}}

// ---- alerts
function addAlert(text,taskId,projId){if(!S.alerts)S.alerts=[];S.alerts.unshift({id:uid(),at:new Date().toISOString(),text,taskId:taskId||null,projId:projId||null,read:false});S.alerts=S.alerts.slice(0,100);paintBell()}
{const st=$('#reviewBtn')||$('#rail [data-view="stats"]');if(st)st.insertAdjacentHTML('afterend',`<button class="rbtn" id="bellBtn" type="button" aria-label="Alerts" title="Alerts" aria-haspopup="dialog">${BELL_ICON}<b class="bell-n" hidden></b></button>`)}
function paintBell(){const b=$('#bellBtn');if(!b)return;const n=(S.alerts||[]).filter(a=>!a.read).length,c=b.querySelector('.bell-n');
  c.hidden=!n;c.textContent=n>9?'9+':n;b.title=n?`Alerts (${n} new)`:'Alerts';b.setAttribute('aria-label',b.title)}
{const _r=render;render=function(){_r.apply(this,arguments);paintBell()}}
function goToTask(id){const t=byId(id);if(!t)return;S.ui.view=t.done||(typeof inDmp==='function'&&inDmp(t))?'done':t.longTerm?'longterm':'tasks';commit();
  setTimeout(()=>{const r=document.querySelector(`.task[data-id="${id}"]`);if(r){r.scrollIntoView({block:'center',behavior:'smooth'});r.classList.add('flash');setTimeout(()=>r.classList.remove('flash'),1600)}},60)}
$('#bellBtn')&&$('#bellBtn').addEventListener('click',()=>{const b=$('#bellBtn'),al=S.alerts||[];
  openPop(b,`<div class="bell-pop" role="dialog" aria-label="Alerts"><div class="bell-h"><b>Alerts</b>${al.length?'<button type="button" class="linkbtn" data-bellclear>Clear all</button>':''}</div>
    ${al.length?`<ul>${al.map(a=>`<li class="${a.read?'':'new'}"><button type="button" data-bellgo="${esc(a.taskId||'')}" data-bellproj="${esc(a.projId||'')}"><span>${esc(a.text)}</span><small>${esc(whenTxt(a.at))}</small></button></li>`).join('')}</ul>`:'<p class="sp-hint">No alerts yet. You get one when someone sends you a task, waits on you, does their part, assigns you a task, mentions you or adds you to a project.</p>'}</div>`,el=>{
    el.classList.add('pop-menu');place(el,b);al.forEach(a=>a.read=true);save();paintBell();
    el.addEventListener('click',e=>{if(e.target.closest('[data-bellclear]')){S.alerts=[];save();paintBell();closePop();return}
      const g=e.target.closest('[data-bellgo]');if(g){closePop();if(g.dataset.bellgo)goToTask(g.dataset.bellgo);else if(g.dataset.bellproj&&S.projects.some(p=>p.id===g.dataset.bellproj)){openProject(g.dataset.bellproj);commit()}}})})});

// ---- a task someone else waits on you for: the done checkbox becomes a "Done my part" button
{const _r=render;render=function(){_r.apply(this,arguments);if(typeof waitingForMe!=='function')return;
  document.querySelectorAll('.task[data-id]').forEach(r=>{const t=byId(r.dataset.id);if(!t||!waitingForMe(t))return;const ck=r.querySelector(':scope > .check');if(!ck)return;
    r.classList.add('mypart-row');ck.outerHTML=`<button type="button" class="mypart-btn" data-wfmdone="${t.id}" title="Tell ${esc(personName(t.waitBy))} your part is done">Done my part</button>`});
  document.querySelectorAll('.wfm-by [data-wfmdone]').forEach(b=>b.remove());
  // the button lines up with the task name, a bit above the middle of the row
  document.querySelectorAll('.task.mypart-row').forEach(r=>{const b=r.querySelector('.mypart-btn'),n=r.querySelector('.name-row');if(!b||!n||!r.offsetParent)return;
    b.style.marginTop='0px';const rb=b.getBoundingClientRect(),rn=n.getBoundingClientRect();b.style.marginTop=Math.round(rn.top+rn.height/2-rb.height/2-rb.top)+'px'});
  // the task came back to you: a banner on the row until you press it
  document.querySelectorAll('.task[data-id]').forEach(r=>{const t=byId(r.dataset.id);if(!t||!t.backAt||t.done)return;r.classList.add('back');
    const who=(t.backFrom||[]).map(personName).join(' and ')||'They';
    r.querySelector('.body').insertAdjacentHTML('afterbegin',`<button type="button" class="back-tag" data-backok="${t.id}" title="Got it">↩ Back to you: ${esc(who)} did their part</button>`)})}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-backok]');if(!b)return;e.stopPropagation();const t=byId(b.dataset.backok);if(t){t.backAt=null;t.backFrom=null;commit()}},true);
// called from applyWaitSync (228) when the people you were waiting for did their part
{const _aws=applyWaitSync;applyWaitSync=function(t,b){const mine=t.waitBy===CL.uid,old=t.waitUids||[],now=b.wait_uids||[];
  const gone=mine?old.filter(u=>!now.includes(u)):[];_aws(t,b);
  if(gone.length){const who=gone.map(personName).join(' and ');
    if(!now.length){t.backAt=new Date().toISOString();t.backFrom=gone;addAlert(`${who} did their part of "${t.name}". It is off hold and back on your list.`,t.id)}
    else addAlert(`${who} did their part of "${t.name}". Still waiting for ${now.map(personName).join(', ')}.`,t.id)}}}

// ---- the history window
function openLogPop(anchor,t){const L=[...(t.log||[])].sort((a,b)=>b.at.localeCompare(a.at));
  openPop(anchor,`<div class="log-pop" role="dialog" aria-label="History of ${esc(t.name)}"><div class="bell-h"><b>History</b><span>${esc(t.name)}</span></div>
    <ul>${L.map(x=>`<li><small>${esc(whenTxt(x.at))}</small><span><b>${esc(logWho(x.by))}</b> ${esc(x.what)}</span></li>`).join('')}
    <li><small>${esc(whenTxt(t.createdAt))}</small><span>Task added</span></li></ul></div>`,el=>{el.classList.add('pop-menu');place(el,anchor)})}
{const _r=render;render=function(){_r.apply(this,arguments);
  document.querySelectorAll('.task[data-id] .actions').forEach(a=>{if(a.querySelector('[data-act="log"]'))return;const r=a.closest('.task');
    const ref=a.querySelector('[data-act="share"]')||a.querySelector('[data-act="focus"]')||a.querySelector('[data-act="archive"],[data-act="unarchive"]')||a.querySelector('.x');
    const b=`<button class="play logbtn${(byId(r.dataset.id)||{}).log&&(byId(r.dataset.id).log.length)?' has':''}" type="button" data-act="log" aria-label="History" title="History">${LOG_ICON}</button>`;
    ref?ref.insertAdjacentHTML('beforebegin',b):a.insertAdjacentHTML('beforeend',b)})}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="log"]');if(!b)return;e.stopPropagation();const t=byId(b.closest('.task').dataset.id);if(t)openLogPop(b,t)},true);
/* test mode: User 1 gets "Get the quotes", on hold waiting for User 2; about 20 s after User 1 opens the site, User 2 does their part
   so the task comes back with the banner and an alert (d.demoBack in the local DB, once) */
if(!(window.FOCUS_CONFIG||{}).url&&!window.FOCUS_NO_DEMO){try{
  const K='focus-localdb',u1='local-user-1',u2='local-user-2',d=JSON.parse(localStorage.getItem(K)||'null')||{};d.shared_tasks=d.shared_tasks||[];
  if(!d.demoBack){const now=new Date().toISOString(),id='demo-back-'+Date.now().toString(36);
    d.shared_tasks.push({id,name:'Get the quotes',note:'Example: you are waiting for User 2. About 20 seconds after you open the site, User 2 does their part.',due:'',done:false,done_at:null,project_id:null,parent_id:null,assignee:null,doing:false,section:'',col:'',start:'',est:null,micro:[],
      wait_for:'User 2 - the quotes',wait_who:'',wait_what:'the quotes',wait_since:now.slice(0,10),wait_uids:[u2],wait_by:u1,wait_done:[],wait_show:true,defer:'',glow:null,sent_by:null,sent_to:[],
      log:[{id:'demo-l1',at:now,by:u1,what:'put it on hold'},{id:'demo-l2',at:now,by:u1,what:'is waiting for User 2 - the quotes'}],
      owner:u1,members:[u1,u2],invited:[],passed_by:null,updated_by:u1,updated_at:now,created_at:now});
    d.demoBack={id,done:false};localStorage.setItem(K,JSON.stringify(d))}
  // and a fresh one where User 2 waits for User 1, to try "Done my part" (d.demoMine, once)
  if(!d.demoMine){const now=new Date().toISOString(),id='demo-mine-'+Date.now().toString(36);
    d.shared_tasks.push({id,name:'Check the contract',note:'Example: User 2 put this on hold waiting for you. Tick Done my part when you finish.',due:'',done:false,done_at:null,project_id:null,parent_id:null,assignee:null,doing:false,section:'',col:'',start:'',est:null,micro:[],
      wait_for:'User 1 - the contract review',wait_who:'',wait_what:'the contract review',wait_since:now.slice(0,10),wait_uids:[u1],wait_by:u2,wait_done:[],wait_show:true,defer:'',glow:null,sent_by:null,sent_to:[],
      log:[{id:'demo-m1',at:now,by:u2,what:'put it on hold'},{id:'demo-m2',at:now,by:u2,what:'is waiting for User 1 - the contract review'}],
      owner:u2,members:[u2,u1],invited:[],passed_by:null,updated_by:u2,updated_at:now,created_at:now});
    d.demoMine=true;localStorage.setItem(K,JSON.stringify(d))}
  if(!d.demoMine2){const now=new Date().toISOString(),id='demo-mine2-'+Date.now().toString(36);
    d.shared_tasks.push({id,name:'Send the invoice',note:'Example: User 2 put this on hold waiting for you. Press Done my part when you finish.',due:'',done:false,done_at:null,project_id:null,parent_id:null,assignee:null,doing:false,section:'',col:'',start:'',est:null,micro:[],
      wait_for:'User 1 - the invoice',wait_who:'',wait_what:'the invoice',wait_since:now.slice(0,10),wait_uids:[u1],wait_by:u2,wait_done:[],wait_show:true,defer:'',glow:null,sent_by:null,sent_to:[],
      log:[{id:'demo-n1',at:now,by:u2,what:'put it on hold'},{id:'demo-n2',at:now,by:u2,what:'is waiting for User 1 - the invoice'}],
      owner:u2,members:[u2,u1],invited:[],passed_by:null,updated_by:u2,updated_at:now,created_at:now});
    d.demoMine2=true;localStorage.setItem(K,JSON.stringify(d))}
  const run=()=>{if(CL.uid!==u1)return;const x=JSON.parse(localStorage.getItem(K)||'{}'),db=x.demoBack;if(!db||db.done)return;
    const t=byId(db.id);if(t&&!t.onHold&&!t.backAt){t.onHold=true;commit()}
    setTimeout(async()=>{const y=JSON.parse(localStorage.getItem(K)||'{}'),r=(y.shared_tasks||[]).find(z=>z.id===db.id);if(!r||y.demoBack.done)return;
      const at=new Date().toISOString();r.wait_uids=[];r.wait_done=[u2];r.log=[...(r.log||[]),{id:'demo-l3',at,by:u2,what:'did their part'}];r.updated_by=u2;r.updated_at=at;
      y.demoBack.done=true;localStorage.setItem(K,JSON.stringify(y));await reconcileShared()},20000)};
  const iv=setInterval(()=>{if(CL.uid===u1){clearInterval(iv);run()}},3000)}catch(e){}}

// a task someone waits on you for takes no subtasks: dropping on its middle places the task before or after it instead
{const _z=zone;zone=function(e,r){const z=_z.apply(this,arguments);const t=r&&r.dataset&&byId(r.dataset.id);
  if(z!=='inside'||!t||!waitingForMe(t))return z;const b=r.getBoundingClientRect();return e.clientY-b.top<b.height/2?'before':'after'}}
{const _n=nestInto;nestInto=function(id,targetId){const t=byId(targetId);if(t&&waitingForMe(t)){toast(`"${t.name}" is waiting on your part, so it can't take subtasks.`);return}return _n.apply(this,arguments)}}
// for code that runs before 228 is loaded (a const there is not ready yet)
function isWaitMe(x){try{return waitingForMe(x)}catch(e){return false}}
