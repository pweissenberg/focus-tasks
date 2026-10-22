/* ---------- project plus: sections in the task list, custom board columns, timeline (Gantt), Time tab, templates ---------- */
// project fields: sections [{id,name}], cols [{id,name}] (null = To do / Doing / Done; 'done' always stays and completes tasks),
//   perms {userId:'view'} and comments {taskId:[...]} (219-comments-perms). All four sync in one `extra` value (216 projBody).
// task fields: section (a section id of its project), col (board column id), start (ISO; timeline start, '' = the day it was added)
const projOfId=id=>S.projects.find(p=>p.id===id);
function projExtra(o){return{sections:o.sections||[],cols:o.cols||null,perms:o.perms||{},comments:o.comments||{},roles:o.roles||{},tree:o.tree||[],treeMarks:o.treeMarks||[],treeDone:o.treeDone||[]}}
const secKey=t=>{const p=t.projectId&&projOfId(t.projectId);return p&&(p.sections||[]).some(s=>s.id===t.section)?t.section:''};
const isoAdd=(iso,n)=>{const d=isoDate(iso);d.setDate(d.getDate()+n);return dateToISO(d)};
const dayDiff=(a,b)=>Math.round((isoDate(b)-isoDate(a))/DAY);
function askName(anchor,title,value,cb){
  openPop(anchor,`<form class="pop-form"><strong>${esc(title)}</strong><input type="text" id="an-name" value="${esc(value||'')}" maxlength="60" aria-label="Name">
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    const i=el.querySelector('#an-name');i.focus();i.select();el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(!v){i.classList.add('invalid');return}closePop();cb(v)}});
}

/* sections ("Phase 1", "Phase 2") in the project's task list */
function secWalk(frag,walk){
  const p=curProject();if(!p||!(p.sections||[]).length)return false;
  walk(null,0,false,'');
  p.sections.forEach((s,i)=>{
    const n=S.tasks.filter(t=>isOpenRoot(t)&&!t.longTerm&&t.projectId===p.id&&secKey(t)===s.id).length;
    const h=document.createElement('div');h.className='secdiv';h.dataset.sec=s.id;
    h.innerHTML=`<span class="sec-name">${esc(s.name)}</span><span class="n">${n}</span><span class="sec-tools">
      <button type="button" data-secadd title="Add a task to ${esc(s.name)}">+ Task</button><button type="button" data-secren aria-label="Rename section" title="Rename">${icons.pencil}</button>${i>0?'<button type="button" data-secmv="-1" aria-label="Move section up" title="Move up">↑</button>':''}${i<p.sections.length-1?'<button type="button" data-secmv="1" aria-label="Move section down" title="Move down">↓</button>':''}<button type="button" data-secdel aria-label="Delete section" title="Delete section">×</button></span>`;
    frag.appendChild(h);
    const before=frag.childNodes.length;walk(null,0,false,s.id);
    if(frag.childNodes.length===before){const e=document.createElement('div');e.className='sec-empty';e.dataset.sec=s.id;e.textContent='Drag tasks here, or press + Task.';frag.appendChild(e)}
  });
  return true;
}
function moveToSection(t,sec){
  const p=projOfId(t.projectId);if(!p)return;
  if(t.parentId||t.longTerm||t.done){if(t.done)return;toRootEnd(t.id)}
  t.section=sec||'';const s=(p.sections||[]).find(x=>x.id===sec);
  logAct(p,s?`moved "${t.name}" to ${s.name}`:`took "${t.name}" out of its section`);commit();
}
{const _pr=placeRelative;placeRelative=function(id,ref,z){_pr(id,ref,z);const a=byId(id),b=byId(ref);if(a&&b&&a.projectId===b.projectId&&!a.parentId)a.section=secKey(rootOf(b))}}
{const _a=addFromBar;addFromBar=function(k,o){const t=_a(k,o);
  if(k==='pt'&&S.ui.ptSection&&!t.parentId&&!t.longTerm){const p=projOfId(t.projectId);if(p&&(p.sections||[]).some(s=>s.id===S.ui.ptSection))t.section=S.ui.ptSection}return t}}
function newSection(anchor,p){askName(anchor,'New section',`Phase ${(p.sections||[]).length+1}`,v=>{p.sections=(p.sections||[]).concat([{id:uid(),name:v}]);logAct(p,`added the section "${v}"`);S.ui.projBoard=false;S.ui.projGantt=false;commit()})}
pp.addEventListener('click',e=>{
  const p=curProject();if(!p)return;
  if(e.target.closest('[data-secnew]')){newSection(e.target.closest('[data-secnew]'),p);return}
  if(e.target.closest('[data-secclear]')){S.ui.ptSection='';commit();return}
  const h=e.target.closest('.secdiv');if(!h)return;
  const s=(p.sections||[]).find(x=>x.id===h.dataset.sec);if(!s)return;
  if(e.target.closest('[data-secadd]')){S.ui.ptSection=s.id;commit();const n=$('#pt-name');if(n)n.focus();return}
  const r=e.target.closest('[data-secren]');if(r){askName(r,'Rename section',s.name,v=>{logAct(p,`renamed the section "${s.name}" to "${v}"`);s.name=v;commit()});return}
  const m=e.target.closest('[data-secmv]');if(m){const i=p.sections.indexOf(s),j=i+ +m.dataset.secmv;if(j<0||j>=p.sections.length)return;p.sections.splice(i,1);p.sections.splice(j,0,s);commit();return}
  const d=e.target.closest('[data-secdel]');if(d){
    if(!d.dataset.armed){d.dataset.armed='1';d.textContent='Delete?';d.classList.add('armed');return}
    const i=p.sections.indexOf(s),moved=S.tasks.filter(t=>t.projectId===p.id&&t.section===s.id);
    p.sections.splice(i,1);moved.forEach(t=>t.section='');if(S.ui.ptSection===s.id)S.ui.ptSection='';
    logAct(p,`deleted the section "${s.name}"`);commit();
    toast(`Section "${s.name}" deleted. Its tasks are kept.`,()=>{p.sections.splice(i,0,s);moved.forEach(t=>t.section=s.id);commit()});
  }
});
{const LST=$('#list');
  LST.addEventListener('dragover',e=>{if(!dragId)return;const h=e.target.closest('.secdiv,.sec-empty');
    LST.querySelectorAll('.secdiv.on,.sec-empty.on').forEach(x=>x!==h&&x.classList.remove('on'));if(!h)return;e.preventDefault();h.classList.add('on')});
  LST.addEventListener('drop',e=>{const h=e.target.closest('.secdiv,.sec-empty');if(!h||!dragId)return;e.preventDefault();e.stopPropagation();
    const t=byId(dragId);dragId=null;LST.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));if(t)moveToSection(t,h.dataset.sec)},true);
  LST.addEventListener('dragend',()=>LST.querySelectorAll('.secdiv.on,.sec-empty.on').forEach(x=>x.classList.remove('on')));}
// the project add bar says which section a new task goes to
{const _r=renderProjPage;renderProjPage=function(){_r();const p=curProject();if(!p||(S.ui.projTab||'tasks')!=='tasks')return;
  const s=(p.sections||[]).find(x=>x.id===S.ui.ptSection),f=$('#projBody [data-ptadd]');if(!f)return;
  if(s){f.querySelector('#pt-name').placeholder=`Add a task to ${s.name}...`;f.insertAdjacentHTML('afterend',`<div class="sec-into">New tasks go to <b>${esc(s.name)}</b> <button type="button" class="linkbtn" data-secclear>No section</button></div>`)}}}

/* layout switch: List / Board / Timeline, and "+ Section" */
boardBarHTML=function(p){
  const L=S.ui.projGantt?2:S.ui.projBoard?1:0;
  return `<div class="bd-bar"><div class="views bd-views" role="group" aria-label="Task layout">${['List','Board','Timeline'].map((l,i)=>`<button class="seg${L===i?' on':''}" type="button" data-board="${i}">${l}</button>`).join('')}</div>
    ${L===0?'<button class="linkbtn" type="button" data-secnew>+ Section</button>':''}
    ${L===1?'<span class="cal-hint">Drag cards between columns, or use the arrows. Click a card to edit it.</span>':L===2?'<span class="cal-hint">Drag a bar to move it, or its ends to change the start and due dates. Click it to edit.</span>':''}</div>`;
};
pp.addEventListener('click',e=>{const b=e.target.closest('[data-board]');if(!b)return;e.stopPropagation();S.ui.projBoard=b.dataset.board==='1';S.ui.projGantt=b.dataset.board==='2';commit()},true);

/* board with the project's own columns */
const DEF_COLS=[{id:'todo',name:'To do'},{id:'doing',name:'Doing'},{id:'done',name:'Done'}];
const projCols=p=>p.cols&&p.cols.length?p.cols:DEF_COLS;
const editCols=p=>{if(!p.cols||!p.cols.length)p.cols=DEF_COLS.map(c=>Object.assign({},c));return p.cols};
function colOfP(p,t){if(t.done)return'done';const C=projCols(p);
  if(t.col&&t.col!=='done'&&C.some(c=>c.id===t.col))return t.col;if(t.doing&&C.some(c=>c.id==='doing'))return'doing';return(C.find(c=>c.id!=='done')||C[0]).id}
boardHTML=function(p){
  const C=projCols(p),ts=projTasksAll(p).filter(t=>!t.archived),wk=new Map(C.map(c=>[c.id,[]]));
  ts.forEach(t=>{const k=colOfP(p,t);(wk.get(k)||wk.get(C[0].id)).push(t)});
  C.forEach(c=>{const L=wk.get(c.id);if(c.id==='done')L.sort((a,b)=>(b.doneAt||'').localeCompare(a.doneAt||''));else L.sort((a,b)=>(b.prio||0)-(a.prio||0)||cmp(a,b))});
  const live=C.filter(c=>c.id!=='done').length;
  const card=(t,i)=>{const tag=tagOf(t),par=t.parentId&&byId(t.parentId),late=!t.done&&t.due&&t.due<todayISO();
    return `<div class="bcard${t.onHold?' hold':''}" draggable="true" data-bid="${t.id}" style="--c:${colorOf(t)}">
      <div class="bc-top">${t.prio?`<span class="pflag pr${t.prio}">${icons.flag}</span>`:''}<span class="bc-name${t.done?' is-done':''}">${esc(t.name)}</span>${typeof cmtBtnHTML==='function'?cmtBtnHTML(t):''}${assigneeHTML(t)}</div>
      <div class="bc-meta">${par?`<span>↳ ${esc(par.name)}</span>`:''}${tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''}${t.due?`<span class="${late?'late':''}">${isoToUS(t.due)}</span>`:''}${t.onHold?'<span>On hold</span>':''}</div>
      <div class="bc-move">${i>0?`<button type="button" data-bmove="${C[i-1].id}" aria-label="Move to ${esc(C[i-1].name)}" title="Move to ${esc(C[i-1].name)}">‹</button>`:''}${i<C.length-1?`<button type="button" data-bmove="${C[i+1].id}" aria-label="Move to ${esc(C[i+1].name)}" title="Move to ${esc(C[i+1].name)}">›</button>`:''}</div></div>`};
  return `<div class="board cust" style="--ncol:${C.length+1}">${C.map((c,i)=>{const L=wk.get(c.id),show=c.id==='done'?L.slice(0,30):L;
    return `<section class="bcol" data-bcol="${c.id}"><h3><span class="bc-title">${esc(c.name)}</span> <span class="n">${L.length}</span><span class="bc-tools">
      <button type="button" data-colren aria-label="Rename column" title="Rename">${icons.pencil}</button>${i>0?'<button type="button" data-colmv="-1" aria-label="Move column left" title="Move left">‹</button>':''}${i<C.length-1?'<button type="button" data-colmv="1" aria-label="Move column right" title="Move right">›</button>':''}${c.id!=='done'&&live>1?'<button type="button" data-coldel aria-label="Delete column" title="Delete column">×</button>':''}</span></h3>
      <div class="bcol-list">${show.map(t=>card(t,i)).join('')||'<p class="cal-hint bc-empty">Drop tasks here</p>'}</div></section>`}).join('')}
    <button class="bcol bcol-add" type="button" data-coladd>+ Column</button></div>`;
};
moveToCol=function(t,k){
  const p=projOfId(t.projectId);
  if(k==='done'){if(t.done)return;if(S.timer.taskId===t.id&&S.timer.running)timerPause();t.doing=false;complete(t);commit();askAddTime(t);return}
  if(t.done)reopen(t);
  const prev=p?colOfP(p,t):'',was=!!t.doing;t.col=k;t.doing=k==='doing';
  if(p&&prev!==k){const c=projCols(p).find(c=>c.id===k);logAct(p,k==='doing'&&!was?`started "${t.name}"`:`moved "${t.name}" to ${c?c.name:k}`)}
  commit();
};
pp.addEventListener('click',e=>{
  const p=curProject();if(!p)return;
  const add=e.target.closest('[data-coladd]');
  if(add){askName(add,'New column','',v=>{const C=editCols(p),i=C.findIndex(c=>c.id==='done');C.splice(i<0?C.length:i,0,{id:uid(),name:v});logAct(p,`added the board column "${v}"`);commit()});return}
  const col=e.target.closest('[data-bcol]');if(!col||!e.target.closest('h3 button'))return;
  const C=editCols(p),c=C.find(x=>x.id===col.dataset.bcol);if(!c)return;
  const r=e.target.closest('[data-colren]');if(r){askName(r,'Rename column',c.name,v=>{logAct(p,`renamed the column "${c.name}" to "${v}"`);c.name=v;commit()});return}
  const m=e.target.closest('[data-colmv]');if(m){const i=C.indexOf(c),j=i+ +m.dataset.colmv;if(j<0||j>=C.length)return;C.splice(i,1);C.splice(j,0,c);commit();return}
  const d=e.target.closest('[data-coldel]');if(d){
    if(!d.dataset.armed){d.dataset.armed='1';d.textContent='Delete?';d.classList.add('armed');return}
    const i=C.indexOf(c);C.splice(i,1);const to=C.find(x=>x.id!=='done');
    S.tasks.forEach(t=>{if(t.projectId===p.id&&!t.done&&(t.col===c.id||c.id==='doing'&&t.doing&&!t.col)){t.col=to.id;t.doing=to.id==='doing'}});
    logAct(p,`deleted the column "${c.name}"`);commit();toast(`Column "${c.name}" deleted. Its cards moved to ${to.name}.`);
  }
});

/* timeline (Gantt): tasks with a due date, from their start (or the day they were added) to the due date */
const G_DW=28;
const gStart=t=>{const s=(t.start||t.createdAt||'').slice(0,10)||t.due;return s>t.due?t.due:s};
function ganttHTML(p){
  const all=projTasksAll(p).filter(t=>!t.archived),ts=all.filter(t=>t.due),none=all.filter(t=>!t.done&&!t.due).length;
  const noneTxt=none?`<p class="cal-hint">${none} task${none===1?' has':'s have'} no due date and ${none===1?'is':'are'} not shown. Give ${none===1?'it':'them'} a due date to see ${none===1?'it':'them'} here.</p>`:'';
  if(!ts.length)return `<div class="empty"><strong>No tasks with a date yet</strong>Give tasks a due date and they show up here as bars from start to due date.</div>${noneTxt}`;
  const today=todayISO();let a=today,b=today;
  ts.forEach(t=>{const s=gStart(t);if(s<a)a=s;if(t.due>b)b=t.due});if(p.due&&p.due>b)b=p.due;
  const A=isoAdd(a,-2),n=Math.max(28,dayDiff(A,b)+7),x=iso=>dayDiff(A,iso)*G_DW;
  let head='',months='',cur='';
  for(let i=0;i<n;i++){const iso=isoAdd(A,i),d=isoDate(iso),we=d.getDay()===0||d.getDay()===6;
    head+=`<span class="g-d${we?' we':''}${iso===today?' now':''}">${d.getDate()}</span>`;
    const mk=MONTHS[d.getMonth()].slice(0,3)+' '+d.getFullYear();if(mk!==cur){cur=mk;months+=`<span class="g-m" style="left:${i*G_DW}px">${mk}</span>`}}
  const lines=`<i class="g-now" style="left:${x(today)+G_DW/2}px" title="Today"></i>${p.due?`<i class="g-dl" style="left:${x(p.due)+G_DW}px" title="Project deadline ${isoToUS(p.due)}"></i>`:''}`;
  const bar=t=>{const s=gStart(t),l=x(s),w=(dayDiff(s,t.due)+1)*G_DW,late=!t.done&&t.due<today;
    return `<div class="g-row"><div class="g-lab" title="${esc(t.name)}"><span class="g-dot" style="--c:${colorOf(t)}"></span><span class="${t.done?'is-done':''}">${esc(t.name)}</span></div>
      <div class="g-track">${lines}<div class="g-bar${t.done?' done':''}${late?' late':''}" data-gid="${t.id}" style="left:${l}px;width:${w}px;--c:${colorOf(t)}" title="${esc(t.name)}: ${isoToUS(s)} to ${isoToUS(t.due)}"><i data-gh="l"></i><span>${esc(t.name)}</span><i data-gh="r"></i></div></div></div>`};
  const order=(L)=>L.sort((u,v)=>gStart(u).localeCompare(gStart(v))||u.due.localeCompare(v.due));
  let rows='';const secs=p.sections||[];
  if(secs.length){const groups=[['',null],...secs.map(s=>[s.id,s.name])];
    groups.forEach(([id,name])=>{const L=order(ts.filter(t=>secKey(rootOf(t))===id));if(!L.length)return;
      rows+=`<div class="g-row g-sec"><div class="g-lab">${esc(name||'No section')}</div><div class="g-track">${lines}</div></div>`+L.map(bar).join('')})}
  else rows=order(ts).map(bar).join('');
  return `<div class="gantt"><div class="g-scroll"><div class="g-grid" style="width:${n*G_DW+180}px;--dw:${G_DW}px">
    <div class="g-row g-head"><div class="g-lab"></div><div class="g-track"><div class="g-ms">${months}</div><div class="g-days">${head}</div></div></div>
    ${rows}</div></div></div>${noneTxt}`;
}
let gDrag=null;
pp.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.g-bar');if(!b||e.button>0)return;const t=byId(b.dataset.gid);if(!t)return;
  e.preventDefault();b.setPointerCapture(e.pointerId);const h=e.target.closest('[data-gh]');
  gDrag={b,t,mode:h?h.dataset.gh:'move',x0:e.clientX,s:gStart(t),d:t.due,l:parseFloat(b.style.left),w:parseFloat(b.style.width),dd:0};
});
pp.addEventListener('pointermove',e=>{if(!gDrag)return;const G=gDrag,dd=Math.round((e.clientX-G.x0)/G_DW),days=G.w/G_DW;G.dd=dd;
  if(G.mode==='move')G.b.style.left=G.l+dd*G_DW+'px';
  else if(G.mode==='r'){const k=Math.max(dd,1-days);G.dd=k;G.b.style.width=G.w+k*G_DW+'px'}
  else{const k=Math.min(dd,days-1);G.dd=k;G.b.style.left=G.l+k*G_DW+'px';G.b.style.width=G.w-k*G_DW+'px'}});
const gEnd=e=>{if(!gDrag)return;const G=gDrag;gDrag=null;const t=G.t,p=projOfId(t.projectId);
  if(!G.dd){if(e.type==='pointerup')openEdit(t.id);return}
  if(G.mode!=='r')t.start=isoAdd(G.s,G.dd);else if(!t.start)t.start=G.s;
  if(G.mode!=='l')t.due=isoAdd(G.d,G.dd);
  if(p)logAct(p,`planned "${t.name}" from ${isoToUS(t.start)} to ${isoToUS(t.due)}`);commit()};
pp.addEventListener('pointerup',gEnd);pp.addEventListener('pointercancel',gEnd);

/* time spent on the project (timer sessions and calendar blocks up to now) */
function projTime(p){
  const now=Date.now(),ws=+weekStartOf(new Date()),td=+new Date(new Date().setHours(0,0,0,0)),per=new Map(),days=new Map();let tot=0,wk=0,dy=0;
  allSessions().forEach(x=>{const t=byId(x.taskId);if((t?t.projectId:x.projectId)!==p.id)return;const e=Math.min(x.end,now);if(e<=x.start)return;
    const d=e-x.start;tot+=d;wk+=Math.max(0,e-Math.max(x.start,ws));dy+=Math.max(0,e-Math.max(x.start,td));
    per.set(x.taskId||'',(per.get(x.taskId||'')||0)+d);const k=dateToISO(new Date(x.start));days.set(k,(days.get(k)||0)+d)});
  return{tot,wk,dy,per,days};
}
function renderTimeTab(p,body){
  const R=projTime(p);
  if(!R.tot){body.innerHTML=`<div class="empty"><strong>No time tracked on ${esc(p.name)} yet</strong>Start the timer on one of its tasks, or plan blocks in the Calendar. The time shows up here.</div>`;return}
  const last=[];for(let i=13;i>=0;i--){const iso=isoAdd(todayISO(),-i);last.push([iso,R.days.get(iso)||0])}
  const mx=Math.max(...last.map(d=>d[1]),1),tasks=[...R.per.entries()].sort((a,b)=>b[1]-a[1]),tmx=tasks.length?tasks[0][1]:1;
  body.innerHTML=`<div class="tm-hero">${[['Total',R.tot],['This week',R.wk],['Today',R.dy]].map(([l,v])=>`<div class="tm-card"><span>${l}</span><b class="mono">${fmtDur(v)}</b></div>`).join('')}</div>
    <h3 class="tm-h">Last 14 days</h3>
    <div class="tm-days">${last.map(([iso,v])=>`<div class="tm-day" title="${isoToUS(iso)}: ${fmtDur(v)}"><i style="height:${Math.round(v/mx*100)}%"></i><span>${isoDate(iso).getDate()}</span></div>`).join('')}</div>
    <h3 class="tm-h">By task</h3>
    <ul class="tm-list">${tasks.map(([id,v])=>{const t=byId(id);return `<li><span class="tm-n">${t?esc(t.name):'Without a task'}</span><span class="tm-bar"><i style="width:${Math.max(2,Math.round(v/tmx*100))}%;--c:${t?colorOf(t):NEUTRAL}"></i></span><b class="mono">${fmtDur(v)}</b></li>`}).join('')}</ul>`;
}

/* templates: save a project's structure, start a new project from it */
function saveTemplate(p,name){
  const ts=S.tasks.filter(t=>t.projectId===p.id&&!t.done&&!t.stepOf),ids=new Set(ts.map(t=>t.id));
  const tpl={id:uid(),name,color:p.color,sections:(p.sections||[]).map(s=>Object.assign({},s)),cols:p.cols?p.cols.map(c=>Object.assign({},c)):null,
    notes:(p.notesList||[]).map(n=>({title:n.title,text:n.text})),
    tasks:ts.map(t=>({id:t.id,parent:ids.has(t.parentId)?t.parentId:null,name:t.name,note:t.note||'',tagId:t.tagId,color:t.color,prio:t.prio||0,longTerm:!!t.longTerm,order:t.order,
      section:t.section||'',col:t.col&&t.col!=='done'?t.col:'',steps:(t.steps||[]).map(s=>({name:s.name,done:false})),stepSel:0}))};
  S.templates.push(tpl);return tpl;
}
function applyTemplate(p,tpl){
  const sec=new Map(),col=new Map(),tid=new Map();
  p.sections=tpl.sections.map(s=>{const id=uid();sec.set(s.id,id);return{id,name:s.name}});
  p.cols=tpl.cols?tpl.cols.map(c=>{const id=c.id==='done'||c.id==='todo'||c.id==='doing'?c.id:uid();col.set(c.id,id);return{id,name:c.name}}):null;
  const now=new Date().toISOString();p.notesList=(p.notesList||[]).concat(tpl.notes.map(n=>({id:uid(),title:n.title,text:n.text,createdAt:now,updatedAt:now})));
  tpl.tasks.forEach(x=>tid.set(x.id,uid()));
  tpl.tasks.forEach(x=>{const c=col.get(x.col)||'';S.tasks.push(T({id:tid.get(x.id),name:x.name,note:x.note,tagId:S.tags.some(g=>g.id===x.tagId)?x.tagId:null,color:x.color,prio:x.prio,
    longTerm:x.longTerm,order:x.order,projectId:p.id,parentId:x.parent?tid.get(x.parent)||null:null,section:sec.get(x.section)||'',col:c,doing:c==='doing',steps:x.steps.map(s=>Object.assign({},s)),stepSel:0}))});
  logAct(p,`started from the template "${tpl.name}"`);
}
function openTemplatePop(anchor,p){
  const draw=el=>{el.querySelector('.tp-list').innerHTML=S.templates.length?S.templates.map(x=>`<div class="sp-row"><span class="sp-n">${esc(x.name)} <em>${x.tasks.length} task${x.tasks.length===1?'':'s'}</em></span><button type="button" class="linkbtn danger-link" data-tpdel="${x.id}">Delete</button></div>`).join(''):'<p class="sp-hint">No templates yet.</p>'};
  openPop(anchor,`<form class="pop-form tp-pop"><strong>Save "${esc(p.name)}" as a template</strong>
    <input type="text" id="tp-name" value="${esc(p.name)}" maxlength="60" aria-label="Template name">
    <p class="sp-hint">Keeps the open tasks, subtasks, steps, sections, board columns and notes. Dates, people and done tasks are left out.</p>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save template</button></div>
    <strong class="tp-h">Your templates</strong><div class="tp-list"></div></form>`,el=>{
    draw(el);el.querySelector('[data-x]').onclick=closePop;
    el.addEventListener('click',e=>{const d=e.target.closest('[data-tpdel]');if(!d)return;S.templates=S.templates.filter(x=>x.id!==d.dataset.tpdel);save();draw(el)});
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const i=el.querySelector('#tp-name'),v=i.value.trim();if(!v){i.classList.add('invalid');return}
      const tpl=saveTemplate(p,v);closePop();commit();toast(`Saved the template "${tpl.name}". Use it from + New project.`)};
  });
}
{const _m=projMetaHTML;projMetaHTML=p=>_m(p).replace('<button class="linkbtn pm-arch"','<button class="linkbtn pm-tpl" type="button" data-ptpl>Save as template</button><button class="linkbtn pm-arch"')}
pp.addEventListener('click',e=>{const b=e.target.closest('[data-ptpl]');if(b){const p=curProject();if(p)openTemplatePop(b,p)}});
{const _o=openProjPop;openProjPop=function(anchor,proj){_o(anchor,proj);if(proj||!S.templates.length||!pop)return;
  const f=pop.el.querySelector('form'),sw=f.querySelector('.swatches');
  sw.insertAdjacentHTML('beforebegin',`<label class="fld tp-from"><span>START FROM</span><select id="pj-tpl" aria-label="Start from"><option value="">Blank project</option>${S.templates.map(x=>`<option value="${x.id}">Template: ${esc(x.name)}</option>`).join('')}</select></label>`);
  const sel=f.querySelector('#pj-tpl'),nm=f.querySelector('#pj-name');
  sel.onchange=()=>{const x=S.templates.find(y=>y.id===sel.value);if(x&&!nm.value.trim())nm.value=x.name};
  const orig=f.onsubmit;f.onsubmit=e=>{const x=S.templates.find(y=>y.id===sel.value),n0=S.projects.length;orig(e);
    if(x&&S.projects.length>n0){const p=S.projects[S.projects.length-1];applyTemplate(p,x);commit();toast(`Created "${p.name}" from the template "${x.name}".`)}}}}
