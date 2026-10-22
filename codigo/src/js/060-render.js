function render(){
  const u=S.ui; memo=new Map();
  if(u.view==='project'&&!S.projects.some(p=>p.id===u.projectPage))u.view='tasks';
  if(u.view==='today')u.view='tasks'; // the Today view was removed
  if(u.view!=='done')u.showArchived=false;
  const openView=u.view==='tasks'||u.view==='long',isStats=u.view==='stats',isCal=u.view==='calendar',isProj=u.view==='project',projTasks=isProj&&(u.projTab||'tasks')==='tasks';
  // projects
  const openCount=pid=>S.tasks.filter(t=>!t.done&&(pid==='all'||t.projectId===pid)).length;
  $('#plist').innerHTML=[{id:'all',name:'All projects'},...S.projects.filter(p=>!p.archived||u.showArchProj||u.projectPage===p.id&&isProj)].map(p=>
    `<li><div class="pitem${u.project===p.id?' on':''}${isProj&&u.projectPage===p.id?' page':''}" role="button" tabindex="0" data-proj="${p.id}">${p.color?`<i class="pdot" style="--dot:${p.color}"></i>`:''}<span class="pname">${esc(p.name)}</span>${p.archived?'<span class="parch" title="Archived">✓</span>':''}${p.id!=='all'&&isSharedProj(p.id)&&(p.members||[]).length>1?`<span class="pshared" title="Shared with ${esc((p.members||[]).filter(m=>m!==CL.uid).map(personName).join(', '))}">${shareIcon}</span>`:''}<span class="pcount">${openCount(p.id)}</span>${p.id!=='all'?`<button class="pedit" type="button" data-pedit="${p.id}" aria-label="Edit project">${icons.pencil}</button><button class="pgo" type="button" data-pgo="${p.id}" aria-label="Open ${esc(p.name)} page" title="Open project page">›</button>`:''}</div></li>`).join('')
    +archProjToggleHTML()+`<li class="mobile-add"><button class="pitem" type="button" data-newproj style="color:var(--accent)">+ Project</button></li>`;
  // view + sort
  document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===u.view;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  document.querySelectorAll('[data-sort]').forEach(b=>{const k=b.dataset.sort,on=k===u.sort;b.classList.toggle('on',on);b.disabled=isStats||isCal;
    const base={manual:'Manual',created:'Created',due:'Due',az:'A-Z',prio:'Priority'}[k];b.textContent=on&&k!=='manual'?base+(u.dir>0?' ↑':' ↓'):base});
  $('#title').textContent=isProj?'Project':{tasks:'Tasks',today:'Today',long:'Long term',done:'Done',calendar:'Calendar',stats:'Stats'}[u.view];
  // counter
  const scope=S.tasks.filter(t=>u.view==='done'?(t.done&&projMatch(t)&&!!t.archived===!!u.showArchived):(!t.done&&projMatch(t)));
  const openScope=S.tasks.filter(t=>!t.done&&projMatch(t));
  $('#counter').innerHTML=`<b class="mono">${openScope.length}</b> tasks · <b class="mono">${openScope.filter(t=>t.onHold).length}</b> on hold`;
  // composer
  $('#list').hidden=isStats||isCal||(isProj&&!projTasks); $('#stats').hidden=!isStats; $('#cal').hidden=!isCal; $('#projPage').hidden=!isProj; document.querySelector('main.panel').classList.toggle('proj-mode',isProj);
  document.documentElement.style.setProperty('--notes-h',(u.notesH||110)+'px');
  const sidePanel=!!(u.timerOpen||u.noiseOpen);
  $('#app').classList.toggle('no-timer',!sidePanel); $('#timerPanel').hidden=!sidePanel; $('#timerCard').hidden=!u.timerOpen; $('#noiseCard').hidden=!u.noiseOpen;
  $('#timerToggle').classList.toggle('on',!!u.timerOpen); $('#noiseToggle').classList.toggle('on',!!u.noiseOpen);
  renderTheme(); renderTimer(true); renderNowBar();
  const ct=$('#c-tag'),cp=$('#c-proj'),ctv=ct.value,cpv=cp.value;
  ct.innerHTML=optionList(S.tags,'No tag',ctv); cp.innerHTML=optionList(S.projects.filter(p=>!p.archived||p.id===cpv),'No project',cpv);
  if(!S.tags.some(t=>t.id===ctv))ct.value=''; if(!S.projects.some(p=>p.id===cpv))cp.value='';
  paintComposerColor();paintComposerPrio();
  {const ae=document.activeElement;if(ADV.c.open&&!(ae&&ae.closest&&ae.closest('#composer .cadv')))advShow('c',true);else advSync('c')}
  // hold toggle
  const ht=$('#holdToggle');ht.classList.toggle('off',u.hideHold);
  ht.innerHTML=(u.hideHold?icons.eyeOff:icons.eye)+(u.hideHold?'On hold hidden':'On hold');
  ht.title=u.hideHold?'Show tasks on hold':'Hide tasks on hold';
  // tabs
  const tabsH=[{id:'all',name:'All',color:'var(--accent)'},...S.tags].map(g=>{
    const n=scope.filter(t=>g.id==='all'||t.tagId===g.id).length,on=u.tag===g.id;
    return `<button class="tab${on?' on':''}" type="button" data-tag="${g.id}" style="--tc:${g.color}">${esc(g.name)} <span class="n">(${n})</span>${on&&g.id!=='all'?`<span class="tedit" role="button" tabindex="0" data-tedit="${g.id}" aria-label="Edit tag" title="Edit tag">✎</span>`:''}</button>`});
  $('#tabs').innerHTML=tabsH.slice(0,-1).join('')+`<span class="tabtail">${tabsH[tabsH.length-1]}<button class="plus" id="addTag" type="button" data-addtag aria-label="New tag" title="New tag">+</button></span>`;
  // banner
  $('#banner').innerHTML=S.example?`<div class="banner"><span>These are example tasks based on your prototype. Everything you add is saved ${CL.on?'to your account':'in this browser'}.</span><button class="linkbtn" type="button" data-clear-ex>Clear examples</button><button class="linkbtn" type="button" data-keep-ex>Keep them</button></div>`:'';
  if(!isProj){const L0=$('#list');if(L0.closest('#projBody'))$('#banner').after(L0)}
  if(isProj){$('#banner').innerHTML='';renderProjPage();if(projTasks)$('#listSlot').appendChild($('#list'));if(!projTasks){const nt1=$('#notes');if(document.activeElement!==nt1)nt1.value=S.notes;return}}
  if(isStats||isCal){$('#banner').innerHTML='';if(isStats)renderStats();else renderCalendar();const nt0=$('#notes');if(document.activeElement!==nt0)nt0.value=S.notes;return}
  // list
  const list=$('#list'); list.innerHTML='';let doneBar=null,nArch=0;
  const frag=document.createDocumentFragment();
  if(openView||projTasks){
    const walk=(parent,depth,lt,sec)=>{
      const items=(parent?kids(parent):S.tasks.filter(t=>isOpenRoot(t)&&(projTasks?!!t.longTerm===lt:inView(t))&&(sec===undefined||secKey(t)===sec))).filter(vis).sort(cmp);
      items.forEach(t=>{frag.appendChild(row(t,depth));if(!t.collapsed)walk(t,depth+1,lt)});
    };
    if(!(projTasks&&secWalk(frag,walk)))walk(null,0,false);
    if(projTasks){const n0=frag.childNodes.length;const dv=document.createElement('div');dv.className='listdiv';dv.textContent='Long term';frag.appendChild(dv);walk(null,0,true);if(frag.childNodes.length===n0+1)frag.removeChild(dv);
      const dn=S.tasks.filter(t=>t.done&&!t.archived&&t.projectId===u.projectPage).sort((a,b)=>a.doneAt<b.doneAt?1:-1);
      if(dn.length){const dd=document.createElement('div');dd.className='listdiv';dd.textContent=`Done (${dn.length})`;frag.appendChild(dd);dn.forEach(t=>frag.appendChild(row(t,0)))}}
  }else{
    const allDone=S.tasks.filter(t=>t.done&&matches(t)),shown=allDone.filter(t=>!!t.archived===!!u.showArchived);nArch=allDone.length-allDone.filter(t=>!t.archived).length;
    shown.sort((a,b)=>u.sort==='manual'?(a.doneAt<b.doneAt?1:-1):cmp(a,b)).forEach(t=>frag.appendChild(row(t,0)));
    doneBar=document.createElement('div');doneBar.className='donebar';
    doneBar.innerHTML=u.showArchived?`<button class="linkbtn" type="button" data-arch-toggle>‹ Back to Done</button><span class="db-n">${nArch} archived</span><span class="db-hint">They still count in Stats and show up in search.</span>`
      :`<span class="db-n">${shown.length} done</span>${shown.length?`<button class="btn sm" type="button" data-arch-all title="Move these ${shown.length} tasks out of the Done list">${icons.archive}Archive all</button>`:''}<button class="linkbtn" type="button" data-arch-toggle>Archived (${nArch})</button>
        <label class="db-auto">Auto-archive<select data-arch-after aria-label="Archive done tasks automatically">${[[0,'Never'],[1,'After 1 day'],[7,'After 7 days'],[30,'After 30 days']].map(([v,l])=>`<option value="${v}"${(S.prefs.archiveAfter||0)===v?' selected':''}>${l}</option>`).join('')}</select></label>`;
  }
  if(!frag.childNodes.length){
    const e=document.createElement('div');e.className='empty';
    const filtered=u.tag!=='all'||u.project!=='all'||u.hideHold;
    e.innerHTML=projTasks?'<strong>No tasks in this project yet</strong>Type one above and press Enter.':u.view==='done'?(u.showArchived?'<strong>Nothing archived</strong>Archive done tasks to keep this list short. They still count in Stats.':nArch?'<strong>Everything done is archived</strong>Press "Archived" above to see those tasks.':'<strong>Nothing done yet</strong>Tick a task\'s checkbox and it moves here with its completion date.')
      :filtered?'<strong>No tasks match these filters</strong>Pick "All" or another project to see more.'
      :u.view==='long'?'<strong>No long-term tasks</strong>Type one above. Tasks added here stay out of your daily list.'
      :'<strong>All clear</strong>Type a task above and press Enter.';
    frag.appendChild(e);
  }else if(openView||projTasks){const d=document.createElement('div');d.className='dropend';d.dataset.dropend='1';frag.appendChild(d)}
  if(doneBar)frag.prepend(doneBar);
  list.appendChild(frag);
  const nt=$('#notes'); if(document.activeElement!==nt) nt.value=S.notes;
}
function row(t,depth){
  const el=document.createElement('div');
  const act=!t.done&&activeBlock(),isAct=act&&act.taskId===t.id;
  el.className='task'+(t.id===kbSel?' ksel':'')+(t.onHold&&!t.done?' hold':'')+(!matches(t)?' dim':'')+(S.timer.taskId===t.id&&S.timer.running&&!isBreak()?' focus':'')+(isAct?' active-now':'')+glowCls(t);
  el.dataset.id=t.id; el.style.setProperty('--c',colorOf(t)); el.style.setProperty('--depth',depth);
  const open=!t.done, ch=open?kids(t):[], doneKids=S.tasks.filter(x=>x.parentId===t.id&&x.done).length, total=ch.length+doneKids;
  const tag=tagOf(t),proj=projOf(t),today=todayISO();
  let due='';
  if(t.due){const late=t.due<today||(t.due===today&&!!t.time&&dueTs(t)<Date.now()),cls=open?(late?'late':t.due===today?'soon':''):'';
    due=`<span class="${cls}">Due: <span class="d">${isoToUS(t.due)}${t.time?' '+t.time:''}</span>${cls==='late'?' (overdue)':cls==='soon'?' (today)':''}</span>`;
    const ra=open?remindAt(t):null,snz=!!t.snooze&&t.snooze===ra;
    if(ra!=null)due+=`<span class="rem${t.remindFired===ra?' fired':''}" title="Reminder ${snz?'snoozed until':'at'} ${tsToUS(ra)} ${hm(ra)}">${icons.bell}${snz?'snoozed to '+hm(ra):remShort(t.remind)}</span>`}
  let parentTxt='';
  if(!open&&t.parentId){const p=byId(t.parentId);if(p)parentTxt=`<span>↳ ${esc(p.name)}</span>`}
  if(t.stepOf){const p=byId(t.stepOf);if(p)parentTxt=`<span>Step of ${esc(p.name)}</span>`}
  el.innerHTML=`<span class="bar"></span>
    <button class="caret${ch.length?'':' none'}${t.collapsed?' closed':''}" type="button" data-act="toggle" aria-label="${t.collapsed?'Expand':'Collapse'} subtasks">▼</button>
    <label class="check" title="${open?'Mark as done':'Move back to tasks'}"><input type="checkbox" data-act="done"${open&&!selDone(t)?'':' checked'} aria-label="Done"><span></span></label>
    <div class="body">
      <div class="name-row">${t.prio?`<button class="pflag pr${t.prio}" type="button" data-act="prio" aria-label="Priority: ${PRIO_NAME[t.prio]}" title="Priority: ${PRIO_NAME[t.prio]}">${icons.flag}</button>`:''}<span class="name">${esc(t.name)}</span>${avStack(t)}${estHTML(t)}${cmtBtnHTML(t)}${assigneeHTML(t)}${total?`<span class="subcount">${doneKids}/${total}</span>`:''}<button class="pencil" type="button" data-act="edit" aria-label="Edit task" title="Edit task (E)">${icons.pencil}</button>${!t.prio&&open?`<button class="pencil pset" type="button" data-act="prio" aria-label="Set priority" title="Set priority">${icons.flagO}</button>`:''}</div>
      <div class="meta"><span>Added: <span class="d">${tsToUS(t.createdAt)}</span></span>${due}${!open?`<span class="fin">Completed: <span class="d">${tsToUS(t.doneAt)}</span></span>`:''}${t.archived&&!open?'<span class="archtag">Archived</span>':''}${tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''}${proj?`<span class="projtag">${esc(projFull(proj))}</span>`:''}${t.longTerm&&!open?'<span>Long term</span>':''}${parentTxt}${t.repeat?`<span class="rep" title="Repeats">↻ ${repLabel(t.repeat)}</span>`:''}${t.shared&&t.passedBy&&t.passedBy!==CL.uid&&CL.on?`<span class="from">from ${esc(personName(t.passedBy))}</span>`:''}${isAct?`<span class="actchip">● Active now until ${hm(act.end)}</span>`:''}${spentOf(t.id)>=60000?`<span class="spent" title="Time tracked on this task">⏱ ${fmtDur(spentOf(t.id))}</span>`:''}</div>
    </div>
    <label class="note"><span>Note:</span><input type="text" data-act="note" value="${esc(t.note)}" placeholder="click to write" aria-label="Note for ${esc(t.name)}"></label>
    <div class="actions">
      ${open?`<span class="move"><button type="button" data-act="up" aria-label="Move up" title="Move up">↑</button><button type="button" data-act="down" aria-label="Move down" title="Move down">↓</button></span>`:''}
      ${open?`<span class="holdcol">${stepsHTML(t)}<label class="holdbox"><input type="checkbox" data-act="hold"${t.onHold?' checked':''}> On hold</label></span>`:''}
      ${open&&CL.enabled?`<button class="play sharebtn" type="button" data-act="share" aria-label="Send or share with someone" title="Send or share with someone">${shareIcon}</button>`:''}
      ${open?`<button class="play" type="button" data-act="focus" aria-label="Start timer on this task" title="Start timer on this task">${S.timer.taskId===t.id&&S.timer.running&&!isBreak()?icons.pause:icons.clock}</button>`:''}
      ${!open?`<button class="play" type="button" data-act="${t.archived?'unarchive':'archive'}" aria-label="${t.archived?'Restore to Done':'Archive'}" title="${t.archived?'Restore to Done':'Archive'}">${t.archived?icons.unarchive:icons.archive}</button>`:''}
      <button class="x" type="button" data-act="del" aria-label="Delete task" title="Delete">×</button>
    </div>`;
  return el;
}
function paintColorBtn(b,color,tagId){if(!b)return;const tag=S.tags.find(g=>g.id===tagId);b.style.setProperty('--sw',color||(tag?tag.color:NEUTRAL));b.classList.toggle('auto',!color);b.title=color?'Task color':'Task color (same as the tag)'}
function paintComposerColor(){paintColorBtn($('#c-color'),composerColor,$('#c-tag').value)}

