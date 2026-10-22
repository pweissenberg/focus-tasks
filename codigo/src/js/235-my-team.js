/* ---------- My team: a manager sees (read only) the tasks of the people under them. The org chart is the `org` table
   {user_id, manager_id} (filled from the company's employee data; in test mode User 1 manages User 2). The rail gets a
   "My team" button only for people who manage someone; the person managed is told in their account menu ---------- */
const TEAM_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="5" rx="1.2"/><rect x="2.5" y="16" width="6" height="5" rx="1.2"/><rect x="15.5" y="16" width="6" height="5" rx="1.2"/><path d="M12 8v4M5.5 16v-2.5a1.5 1.5 0 0 1 1.5-1.5h10a1.5 1.5 0 0 1 1.5 1.5V16"/></svg>';
const TEAM={uid:null,org:[],data:{},sel:null,loading:false};
const teamUnder=()=>{const out=[],seen=new Set([CL.uid]),walk=b=>TEAM.org.filter(o=>o.manager_id===b&&!seen.has(o.user_id)).forEach(o=>{seen.add(o.user_id);out.push({id:o.user_id,via:b===CL.uid?null:b});walk(o.user_id)});walk(CL.uid);return out};
const myManager=()=>{const o=TEAM.org.find(x=>x.user_id===CL.uid);return o&&o.manager_id};
async function loadOrg(){if(!CL.on||!CL.sb)return;TEAM.uid=CL.uid;
  try{const {data,error}=await CL.sb.from('org').select('*');TEAM.org=error?[]:(data||[])}catch(e){TEAM.org=[]}
  const ids=[...new Set([...teamUnder().map(x=>x.id),myManager()].filter(Boolean))].filter(i=>!CL.prof[i]);
  if(ids.length){try{const {data}=await CL.sb.from('profiles').select('*').in('id',ids);(data||[]).forEach(p=>CL.prof[p.id]=p)}catch(e){}}
  paintTeamBtn()}
async function loadTeamData(){const ids=teamUnder().map(x=>x.id);if(!ids.length)return;TEAM.loading=true;
  try{const {data}=await CL.sb.from('user_state').select('*').in('user_id',ids);const D={};
    ids.forEach(i=>D[i]={tasks:[],tags:[],projects:[]});(data||[]).forEach(r=>{if(D[r.user_id]&&['tasks','tags','projects'].includes(r.key))D[r.user_id][r.key]=Array.isArray(r.data)?r.data:[]});TEAM.data=D}catch(e){}
  TEAM.loading=false}
{const r=$('#bellBtn')||$('#reviewBtn');if(r)r.insertAdjacentHTML('afterend',`<button class="rbtn" id="teamBtn" type="button" aria-label="My team" title="My team: your team's tasks" aria-haspopup="dialog" hidden>${TEAM_ICON}</button>`)}
function paintTeamBtn(){const b=$('#teamBtn');if(b)b.hidden=!(CL.on&&teamUnder().length)}
{const _r=render;render=function(){_r.apply(this,arguments);if(CL.on&&TEAM.uid!==CL.uid){TEAM.uid=CL.uid;TEAM.org=[];TEAM.data={};TEAM.sel=null;loadOrg()}else if(!CL.on){TEAM.uid=null;TEAM.org=[]}paintTeamBtn()}}

// what one person has: sections of their open and recent work
function teamGroups(D){const today=todayISO(),wk=isoAdd(today,7),since=new Date(Date.now()-7*864e5).toISOString();
  const ts=(D.tasks||[]).filter(t=>t&&!t.archived&&!t.stepOf),by=id=>ts.find(x=>x.id===id),open=ts.filter(t=>!t.done);
  const blocked=t=>(t.waits||[]).some(i=>{const x=by(i);return x&&!x.done});
  const G={overdue:[],week:[],open:[],hold:[],blocked:[],long:[],done:[]};
  open.forEach(t=>{let r=t,n=0;while(r.parentId&&n++<50){const p=by(r.parentId);if(!p)break;r=p}
    if(t.onHold)G.hold.push(t);else if(blocked(t))G.blocked.push(t);else if(t.due&&t.due<today)G.overdue.push(t);else if(t.due&&t.due<=wk)G.week.push(t);else if(r.longTerm)G.long.push(t);else G.open.push(t)});
  G.done=ts.filter(t=>t.done&&t.doneAt&&t.doneAt>=since).sort((a,b)=>b.doneAt.localeCompare(a.doneAt));
  ['overdue','week'].forEach(k=>G[k].sort((a,b)=>a.due.localeCompare(b.due)));
  return {G,open:open.length,by}}
function teamTaskHTML(t,D,by){const tag=(D.tags||[]).find(g=>g.id===t.tagId),p=(D.projects||[]).find(x=>x.id===t.projectId),par=t.parentId&&by(t.parentId),late=!t.done&&t.due&&t.due<todayISO();
  const bits=[par?`↳ ${esc(par.name)}`:'',tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:'',p?esc(p.name):'',
    t.due?`<span class="${late?'late':''}">Due ${isoToUS(t.due)}${t.time?' '+esc(t.time):''}</span>`:'',t.waitFor?`Waiting for ${esc(t.waitFor)}`:'',t.done&&t.doneAt?`Done ${tsToUS(t.doneAt)}`:'',(t.micro||[]).length?`${t.micro.filter(m=>m.done).length}/${t.micro.length} microtasks`:''].filter(Boolean);
  return `<li class="myt-task${t.done?' done':''}" style="--c:${t.color||(tag&&tag.color)||'var(--line-strong)'}"><div class="myt-name">${t.prio?`<span class="pflag pr${t.prio}">${icons.flag}</span>`:''}<span>${esc(t.name)}</span></div>${bits.length?`<div class="myt-meta">${bits.join('<i>·</i>')}</div>`:''}${t.note?`<div class="myt-note">${esc(t.note)}</div>`:''}</li>`}
const TEAM_SECS=[['overdue','Overdue'],['week','Due in the next 7 days'],['open','Open, no date soon'],['blocked','Blocked by other tasks'],['hold','On hold'],['long','Long term'],['done','Done in the last 7 days']];
function teamBodyHTML(){const P=teamUnder();if(!P.length)return '<p class="cal-hint">No one reports to you.</p>';
  if(!TEAM.sel||!P.some(x=>x.id===TEAM.sel))TEAM.sel=P[0].id;
  const side=P.map(x=>{const D=TEAM.data[x.id]||{},{G,open}=teamGroups(D);return `<button type="button" class="myt-person${x.id===TEAM.sel?' on':''}" data-mtp="${x.id}">${avHTML(x.id,null)}<span><b>${esc(personName(x.id))}</b><small>${open} open${G.overdue.length?` · <em>${G.overdue.length} overdue</em>`:''}${x.via?` · via ${esc(personName(x.via))}`:''}</small></span></button>`}).join('');
  const D=TEAM.data[TEAM.sel]||{tasks:[]},{G,by}=teamGroups(D);
  const stat=(n,l,c)=>`<div class="myt-stat${c?' '+c:''}"><b>${n}</b><span>${l}</span></div>`;
  const main=`<div class="myt-head">${avHTML(TEAM.sel,null,true)}<div><h3>${esc(personName(TEAM.sel))}</h3><span>View only</span></div></div>
    <div class="myt-stats">${stat(G.overdue.length,'overdue',G.overdue.length?'bad':'')}${stat(G.week.length,'due this week')}${stat(G.hold.length+G.blocked.length,'on hold or blocked')}${stat(G.done.length,'done in 7 days','good')}</div>
    ${TEAM_SECS.filter(([k])=>G[k].length).map(([k,l])=>`<section class="myt-sec myt-${k}"><h4>${l} <span>${G[k].length}</span></h4><ul>${G[k].map(t=>teamTaskHTML(t,D,by)).join('')}</ul></section>`).join('')||'<p class="cal-hint">No tasks yet.</p>'}`;
  return `<div class="myt-wrap"><nav class="myt-side" aria-label="People">${side}</nav><div class="myt-main">${main}</div></div>`}
async function openTeam(){closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal myteam" role="dialog" aria-modal="true" aria-labelledby="myt-h"><div class="myt-top"><h2 id="myt-h">My team</h2><span class="sp-hint">The tasks of the people who report to you. You can see them but not change them.</span><button type="button" class="linkbtn" data-mtref>Refresh</button></div>
    <div class="myt-body"><p class="cal-hint">Loading…</p></div><div class="modal-actions"><button type="button" class="btn primary" data-x>Close</button></div></div>`;
  document.body.appendChild(back);modal=back;
  const body=back.querySelector('.myt-body'),paint=()=>{body.innerHTML=teamBodyHTML()};
  back.addEventListener('click',async e=>{if(e.target===back||e.target.closest('[data-x]')){closeModal();return}
    const p=e.target.closest('[data-mtp]');if(p){TEAM.sel=p.dataset.mtp;paint();return}
    if(e.target.closest('[data-mtref]')){body.classList.add('busy');await loadOrg();await loadTeamData();body.classList.remove('busy');paint()}});
  back.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  await loadTeamData();if(modal===back)paint();back.querySelector('[data-x]').focus()}
$('#teamBtn').addEventListener('click',openTeam);
// the person managed sees who can read their tasks
{const _a=openAccountPop;openAccountPop=function(){const r=_a.apply(this,arguments);const m=myManager(),h=document.querySelector('.acct-menu .am-head');
  if(m&&h&&!document.querySelector('.am-mgr'))h.insertAdjacentHTML('afterend',`<p class="am-mgr">${CL.prof[m]?`Your manager, ${esc(personName(m))},`:'Your manager'} can see your tasks.</p>`);return r}}
