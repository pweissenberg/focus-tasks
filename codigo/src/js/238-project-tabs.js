/* ---------- project tabs (subprojects): a tab is a project with p.tabOf = the main project's id ----------
   Each tab has its own tasks, Notes, Free, Tree... (everything a project has). Tabs are hidden from the sidebar and shown as a
   strip on the main project's page. Tasks show "Project, Tab"; "@Project, Tab" in the add bar picks the tab.
   "+ Tab" can make several at once (names split by commas) and start them from a template, which now also copies the Tree. */
const tabRoot=p=>{const r=p&&p.tabOf&&projOfId(p.tabOf);return r&&!r.tabOf?r:null};
const projTabs=p=>S.projects.filter(x=>x.tabOf===p.id&&!x.archived);
function projFull(p){const r=tabRoot(p);return r?r.name+', '+p.name:p.name}

// templates also keep the Tree (nodes, comments, guides); task nodes point at the template's tasks
{const _s=saveTemplate;saveTemplate=function(p,name){const tpl=_s(p,name),ids=new Set(tpl.tasks.map(x=>x.id));
  tpl.tree=(p.tree||[]).map(n=>{const t=n.taskId&&byId(n.taskId);return{id:n.id,parent:n.parent||null,name:t?t.name:n.name,taskId:ids.has(n.taskId)?n.taskId:null,comment:n.comment||'',closed:!!n.closed}});
  tpl.treeMarks=(p.treeMarks||[]).map(m=>Object.assign({},m));return tpl}}
{const _a=applyTemplate;applyTemplate=function(p,tpl){const n0=S.tasks.length;_a(p,tpl);
  const tid=new Map();(tpl.tasks||[]).forEach((x,i)=>{const t=S.tasks[n0+i];if(t)tid.set(x.id,t.id)});
  const nid=new Map();(tpl.tree||[]).forEach(n=>nid.set(n.id,uid()));
  p.tree=(p.tree||[]).concat((tpl.tree||[]).map(n=>({id:nid.get(n.id),name:n.name,parent:n.parent?nid.get(n.parent)||null:null,taskId:tid.get(n.taskId)||null,closed:n.closed,comment:n.comment||''})));
  p.treeMarks=(p.treeMarks||[]).concat((tpl.treeMarks||[]).filter(m=>nid.has(m.from)).map(m=>Object.assign({},m,{id:uid(),from:nid.get(m.from),to:nid.get(m.to)||nid.get(m.from)})))}}
{const _e=projExtra;projExtra=o=>Object.assign(_e(o),{planStart:o.planStart||'',planStarted:o.planStarted||null,tabOf:o.tabOf||null,createdAt:o.createdAt||null,openedAt:o.openedAt||null,recurring:!!o.recurring,closedAt:o.closedAt||null,cycles:o.cycles||[],resetAt:o.resetAt||null})}
// project pickers say "Project, Tab"
{const _o=optionList;optionList=(items,none,sel)=>_o(items.map(i=>i.tabOf&&S.projects.includes(i)?{id:i.id,name:projFull(i)}:i),none,sel)}

function addTabs(root,names,tpl){
  const made=names.map(nm=>{const now=new Date().toISOString(),p={id:uid(),name:nm,color:root.color,tabOf:root.id,createdAt:now,openedAt:now};S.projects.push(p);if(tpl)applyTemplate(p,tpl);return p});
  logAct(root,`added the tab${made.length>1?'s':''} ${made.map(p=>`"${p.name}"`).join(', ')}${tpl?` from the template "${tpl.name}"`:''}`);
  return made;
}
function deleteTab(p){const r=tabRoot(p);
  S.tasks.forEach(t=>{if(t.projectId===p.id)t.projectId=r.id});
  S.projects=S.projects.filter(x=>x.id!==p.id);
  if(S.ui.project===p.id)S.ui.project=r.id;S.ui.projectPage=r.id;logAct(r,`deleted the tab "${p.name}" (its tasks moved here)`);
}
function tabStripHTML(p){
  const r=tabRoot(p)||p,all=projTabs(r),cnt=x=>S.tasks.filter(t=>!t.done&&t.projectId===x.id).length;
  const tabs=all;
  const b=(x,main)=>`<button class="pxt${x.id===p.id?' on':''}${!main&&x.closedAt?' closed':''}" type="button" role="tab" aria-selected="${x.id===p.id}" data-pxt="${x.id}"${main?' title="Main project"':x.closedAt?` title="Done on ${tsToUS(x.closedAt)}"`:''}>${!main&&x.closedAt?'<span class="ok">✓</span>':''}${esc(main?'Main':x.name)}${cnt(x)?` <span class="n">${cnt(x)}</span>`:''}${x.id===p.id&&!main?`<span class="pxt-ed" data-pxted="${x.id}" role="button" tabindex="0" title="Rename, recurring, add a template or delete this tab" aria-label="Edit tab">${icons.pencil}</span>`:''}</button>`;
  return `<div class="pxtabs" role="tablist" aria-label="Tabs of ${esc(r.name)}">${all.length?b(r,true)+tabs.map(x=>b(x)).join(''):''}<button class="pxt-add" type="button" data-pxtadd title="Add a tab: a part of this project with its own tasks, notes and tree">+ Tab</button></div>`;
}
/* done / reopen (recurring tabs run in cycles); every step goes to the main project's Activity with its date */
function tabStatHTML(p){if(!tabRoot(p))return'';
  const cyc=(p.cycles||[]).length,rec=p.recurring?`<span>↻ Recurring${cyc?` · ${cyc} cycle${cyc===1?'':'s'} done, last <span class="mono">${tsToUS(p.cycles[cyc-1].at)}</span>`:''}${p.resetAt&&!p.closedAt?` · reset <span class="mono">${tsToUS(p.resetAt)}</span>`:''}</span>`:'';
  return p.closedAt?`<div class="pxstat"><span class="done-on">✓ Done on <span class="mono">${tsToUS(p.closedAt)}</span></span>${rec}<button class="btn" type="button" data-pxreopen="0" title="Open it again as it is, to change something">Reopen</button><button class="btn" type="button" data-pxreopen="1" title="Open it and untick every task and tree node, to start the cycle again">Reopen and reset</button></div>`
    :`<div class="pxstat">${rec}<button class="btn" type="button" data-pxdone>✓ Mark tab done</button></div>`;
}
const taskDepth=t=>{let d=0,x=t;while(x&&x.parentId&&d<50){x=byId(x.parentId);d++}return d};
function resetChecks(p,all){let n=0;
  const ids=new Set((p.tree||[]).map(x=>x.taskId).filter(Boolean));
  S.tasks.filter(t=>t.projectId===p.id&&t.done&&!t.stepOf&&(all||ids.has(t.id))).sort((a,b)=>taskDepth(a)-taskDepth(b)).forEach(t=>{if(t.done){reopen(t);n++}});
  (p.tree||[]).forEach(x=>{if(x.done){delete x.done;delete x.doneAt;n++}});return n}
function markTabDone(p){const r=tabRoot(p),now=new Date().toISOString();p.planStart='';p.planStarted=null;p.closedAt=now;p.cycles=(p.cycles||[]).concat({open:p.openedAt||tabBorn(p),at:now});
  logAct(r,`"${p.name}" done${p.recurring?` (cycle ${p.cycles.length})`:''}`);logAct(p,'marked this tab done')}
function reopenTab(p,reset){const r=tabRoot(p);if(p.planStart&&p.planStart<=todayISO()&&!p.planStarted)p.planStarted=new Date().toISOString();p.closedAt=null;p.openedAt=new Date().toISOString();if(reset){resetChecks(p,true);p.resetAt=new Date().toISOString()}
  logAct(r,`reopened "${p.name}"${reset?' and reset it':''}`);logAct(p,reset?'reopened and reset this tab':'reopened this tab')}
function importMainTree(p){const r=tabRoot(p),src=r?r.tree||[]:[],map=new Map();src.forEach(n=>map.set(n.id,uid()));
  const made=src.map(n=>{const t=n.taskId&&byId(n.taskId);return[{id:map.get(n.id),name:t?t.name:n.name,parent:n.parent?map.get(n.parent)||null:null,taskId:null,closed:!!n.closed,comment:n.comment||''},!!t]});
  p.tree=(p.tree||[]).concat(made.map(m=>m[0]));made.filter(m=>m[1]).forEach(m=>trMakeTask(p,m[0]));
  p.treeMarks=(p.treeMarks||[]).concat((r.treeMarks||[]).filter(m=>map.has(m.from)).map(m=>Object.assign({},m,{id:uid(),from:map.get(m.from),to:map.get(m.to)||map.get(m.from)})));
  logAct(p,`imported the tree of "${r.name}"`);return made.length}
{const _t=renderTreeTab;renderTreeTab=function(p,body){_t.apply(this,arguments);const bar=body.querySelector('.tr-bar');if(!bar)return;
  const r=tabRoot(p),hasDone=(p.tree||[]).some(n=>n.done||(trTask(n)&&trTask(n).done));
  bar.insertAdjacentHTML('beforeend',`${r&&(r.tree||[]).length?`<button class="btn sm" type="button" data-pximport title="Copy the tree of ${esc(r.name)} (Main) into this tab">Import from Main</button>`:''}${hasDone?'<button class="btn sm" type="button" data-pxreset title="Untick every node and task in this tree">Reset checks</button>':''}`)}}
const tplOptions=()=>S.templates.length?`<label class="fld"><span>START FROM</span><select id="px-tpl" aria-label="Start from"><option value="">Blank tab</option>${S.templates.map(x=>`<option value="${x.id}">Template: ${esc(x.name)}</option>`).join('')}</select></label>`:'';
function openAddTabPop(anchor,root){
  openPop(anchor,`<form class="pop-form px-pop"><strong>New tab in ${esc(root.name)}</strong>
    <input type="text" id="px-name" placeholder="Tab name, e.g. Brazil" maxlength="200" aria-label="Tab name">
    <p class="sp-hint">Several at once: separate the names with commas (Brazil, Mexico, Chile).</p>${tplOptions()}
    <label class="chk"><input type="checkbox" id="px-rec"> Recurring: mark it done, then start it again</label>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Add</button></div></form>`,el=>{
    const i=el.querySelector('#px-name');i.focus();el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const names=i.value.split(',').map(s=>s.trim()).filter(Boolean);if(!names.length){i.classList.add('invalid');return}
      const sel=el.querySelector('#px-tpl'),tpl=sel&&S.templates.find(x=>x.id===sel.value);
      const made=addTabs(root,names,tpl);if(el.querySelector('#px-rec').checked)made.forEach(x=>x.recurring=true);closePop();S.ui.projectPage=made[0].id;S.ui.project=made[0].id;cvScroll=null;commit();
      toast(made.length>1?`Added ${made.length} tabs to "${root.name}".`:`Added the tab "${made[0].name}".`)};
  });
}
function openTabEditPop(anchor,p){let armed=false;
  openPop(anchor,`<form class="pop-form px-pop"><strong>Tab in ${esc(tabRoot(p).name)}</strong>
    <input type="text" id="px-name" value="${esc(p.name)}" maxlength="60" aria-label="Tab name">
    ${S.templates.length?`<label class="fld"><span>ADD FROM A TEMPLATE</span><select id="px-tpl" aria-label="Add from a template"><option value="">No template</option>${S.templates.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><p class="sp-hint">Adds the template's tasks, sections, notes and tree to this tab.</p>`:''}
    <label class="chk"><input type="checkbox" id="px-rec"${p.recurring?' checked':''}> Recurring: mark it done, then start it again</label>
    <div class="pop-actions"><button type="button" class="danger-link" data-del>Delete tab</button><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    const i=el.querySelector('#px-name');i.focus();i.select();el.querySelector('[data-x]').onclick=closePop;
    const del=el.querySelector('[data-del]');del.onclick=()=>{if(!armed){armed=true;del.textContent='Click again (tasks move to Main)';return}closePop();deleteTab(p);commit();toast(`Tab "${p.name}" deleted.`)};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(!v){i.classList.add('invalid');return}
      p.name=v;p.recurring=el.querySelector('#px-rec').checked;const sel=el.querySelector('#px-tpl'),tpl=sel&&S.templates.find(x=>x.id===sel.value);if(tpl)applyTemplate(p,tpl);
      closePop();commit();if(tpl)toast(`Added the template "${tpl.name}" to "${p.name}".`)};
  });
}
{const _r=renderProjPage;renderProjPage=function(){_r();const p=curProject();if(!p)return;
  const top=$('#projHead .pp-top');if(top)top.insertAdjacentHTML('afterend',tabStripHTML(p)+tabStatHTML(p));
  const pi=$('#pt-name');if(pi&&tabRoot(p))pi.placeholder=pi.placeholder.replace(`Add a task to ${p.name}...`,`Add a task to ${projFull(p)}...`);
  const r=tabRoot(p);if(r){const nm=$('#projHead .pp-name i');if(nm)nm.insertAdjacentHTML('afterend',`<button class="linkbtn pxt-crumb" type="button" data-pxt="${r.id}">${esc(r.name)},</button>`)}}}
// tabs stay out of the sidebar; the main project lights up while one of its tabs is open
{const _r=render;render=function(){_r();
  document.querySelectorAll('#plist [data-proj]').forEach(el=>{const p=projOfId(el.dataset.proj);if(p&&tabRoot(p))el.closest('li').remove()});
  const cur=S.ui.view==='project'&&tabRoot(curProject());if(cur){const el=document.querySelector(`#plist [data-proj="${cur.id}"]`);if(el)el.classList.add('page')}}}
pp.addEventListener('click',e=>{
  const ed=e.target.closest('[data-pxted]');if(ed){e.stopPropagation();const p=projOfId(ed.dataset.pxted);if(p)openTabEditPop(ed,p);return}
  const t=e.target.closest('[data-pxt]');if(t){if(S.ui.projectPage!==t.dataset.pxt){S.ui.projectPage=t.dataset.pxt;S.ui.project=t.dataset.pxt;$('#c-proj').value=t.dataset.pxt;cvScroll=null;commit()}return}
  if(e.target.closest('[data-pxdone]')){const p=curProject();if(p&&tabRoot(p)){markTabDone(p);commit();toast(`"${p.name}" is done. It shows in the Activity of ${tabRoot(p).name}.`)}return}
  const ro=e.target.closest('[data-pxreopen]');if(ro){const p=curProject();if(p&&tabRoot(p)){reopenTab(p,ro.dataset.pxreopen==='1');commit();toast(ro.dataset.pxreopen==='1'?`"${p.name}" is open again, with every check cleared.`:`"${p.name}" is open again.`)}return}
  if(e.target.closest('[data-pximport]')){const p=curProject();if(p){const n=importMainTree(p);commit();toast(`Imported ${n} node${n===1?'':'s'} from Main.`)}return}
  const rs=e.target.closest('[data-pxreset]');if(rs){if(!rs.dataset.armed){rs.dataset.armed='1';rs.textContent='Click again to untick all';return}const p=curProject();if(p){const n=resetChecks(p,false);logAct(p,'reset the checks in the tree');commit();toast(`Cleared ${n} check${n===1?'':'s'}.`)}return}
  const a=e.target.closest('[data-pxtadd]');if(a){const p=curProject();if(p)openAddTabPop(a,tabRoot(p)||p)}
},true);
/* Main's Activity as a table of subproject cycles: Subproject · Open · Done. Done counts only the LAST done within 10 days
   (done today, reopened, done tomorrow = one row done tomorrow); the list view still shows every event. */
const tabBorn=x=>x.createdAt||((x.activity||[]).length?x.activity[x.activity.length-1].at:null);
function tabCycleRows(r){const out=[];
  S.projects.filter(x=>x.tabOf===r.id).forEach(x=>{const m=[];
    (x.cycles||[]).slice().sort((a,b)=>a.at<b.at?-1:1).forEach(c=>{const l=m[m.length-1];
      if(l&&+new Date(c.at)-+new Date(l.done)<=10*DAY)l.done=c.at;else m.push({x,open:c.open||(m.length?m[m.length-1].done:tabBorn(x)),done:c.at})});
    out.push(...m);if(!x.closedAt)out.push({x,open:x.openedAt||tabBorn(x),done:null})});
  return out.sort((a,b)=>(a.open||a.done||'')<(b.open||b.done||'')?-1:1)}
function tabTableHTML(r){const R=tabCycleRows(r);
  return R.length?`<table class="pxtbl"><thead><tr><th>Subproject</th><th>Open</th><th>Done</th></tr></thead><tbody>${R.map(o=>`<tr><td><button class="linkbtn" type="button" data-pxt="${o.x.id}">${esc(o.x.name)}</button></td><td class="mono">${o.open?tsToUS(o.open):'—'}</td><td class="mono">${o.done?tsToUS(o.done):'<span class="pxtbl-open">open</span>'}</td></tr>`).join('')}</tbody></table>
    <p class="cal-hint">A tab done again within 10 days counts once, on its last done. The list shows every event.</p>`
    :`<div class="empty"><strong>No subprojects yet</strong>Add a tab with + Tab.</div>`}
{const _a=renderActivityTab;renderActivityTab=function(p,body){
  const has=!tabRoot(p)&&S.projects.some(x=>x.tabOf===p.id),tbl=has&&S.ui.actTable;
  if(tbl)body.innerHTML=tabTableHTML(p);else _a(p,body);
  if(has)body.insertAdjacentHTML('afterbegin',`<div class="views pxact" role="group" aria-label="Show activity as"><button class="seg${tbl?'':' on'}" type="button" data-actv="list">List</button><button class="seg${tbl?' on':''}" type="button" data-actv="table">Table</button></div>`)}}
pp.addEventListener('click',e=>{const v=e.target.closest('[data-actv]');if(v){S.ui.actTable=v.dataset.actv==='table';commit()}});
/* Plan tab on the main project: when to start each subproject (`x.planStart` ISO). From that day until it is started, a dot
   shows on the main project in the sidebar, on the Plan tab and on the subproject's tab. "Started" in the Plan tab (or reopening
   the tab by hand) sets `x.planStarted` and reopens it; marking the tab done clears the plan date. */
const planDue=x=>!!(x.planStart&&!x.planStarted&&x.planStart<=todayISO());
const planDot=x=>planDue(x);
const PXDOT='<i class="pxdot" title="Planned to start: press Started in Plan"></i>';
function startTab(x){const was=!!x.closedAt;x.planStarted=new Date().toISOString();if(was)reopenTab(x,false);logAct(tabRoot(x),`started "${x.name}"`)}
function planTabHTML(r){const T=projTabs(r),t0=todayISO();
  return T.length?`<p class="cal-hint" style="margin:4px 0 12px">Pick the day you plan to start each subproject. From that day a dot shows here, on the project in the sidebar and on the tab, until you press Started (it reopens a done tab). Marking the tab done clears its date.</p>
    <table class="pxtbl pxplan"><thead><tr><th>Subproject</th><th>Start working on</th><th></th></tr></thead><tbody>${T.map(x=>{const d=x.planStart,days=d?dayDiff(t0,d):null;
      return `<tr data-plan="${x.id}"><td><button class="linkbtn" type="button" data-pxt="${x.id}">${esc(x.name)}</button>${planDue(x)?PXDOT:''}</td>
      <td><input type="text" class="mono pxplan-d" placeholder="MM/DD/YYYY" value="${d?isoToUS(d):''}" aria-label="Start date for ${esc(x.name)}"></td>
      <td class="pxplan-s">${x.closedAt&&!planDue(x)?`<span class="done-on">✓ Done</span>`:days==null?'':x.planStarted?`<span class="done-on">Started ${isoToUS(x.planStarted.slice(0,10))}</span>`:days>0?`in ${days} day${days===1?'':'s'}`:`<button class="btn primary pxstart" type="button" data-pxstart="${x.id}" title="Mark it started${x.closedAt?' and reopen the tab':''}">Started</button>`}</td></tr>`}).join('')}</tbody></table>`
    :`<div class="empty"><strong>No subprojects yet</strong>Add a tab with + Tab, then plan when to start it here.</div>`}
{const _r=render;render=function(){_r();
  S.projects.filter(r=>!r.tabOf&&S.projects.some(x=>x.tabOf===r.id&&planDot(x))).forEach(r=>{const el=document.querySelector(`#plist [data-proj="${r.id}"] .pname`);if(el)el.insertAdjacentHTML('afterend',PXDOT)})}}
{const _r=renderProjPage;renderProjPage=function(){const p=curProject(),plan=S.ui.projTab==='plan';
  // on a tab (no Plan there) show Tasks but keep 'plan' picked for when you go back to Main
  const here=plan&&p&&!tabRoot(p)&&projTabs(p).length;
  if(!plan){_r();}else{S.ui.projTab=here?'activity':'tasks';_r();S.ui.projTab='plan'}
  if(!p)return;const r=tabRoot(p)||p,tabsEl=$('#projHead .pp-tabs');
  if(tabsEl&&p===r&&projTabs(r).length){const on=!!here;
    if(on)tabsEl.querySelectorAll('.ptab').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-selected','false')});
    const dot=projTabs(r).some(x=>planDot(x));
    tabsEl.insertAdjacentHTML('beforeend',`<button class="ptab${on?' on':''}" type="button" role="tab" aria-selected="${on}" data-ptab="plan">Plan${dot?PXDOT:''}</button>`);
    if(on){const body=$('#projBody');body.innerHTML=planTabHTML(r);body.querySelectorAll('.pxplan-d').forEach(bindDate)}}
  projTabs(r).forEach(x=>{if(planDot(x)){const b=document.querySelector(`#projHead .pxt[data-pxt="${x.id}"]`);if(b)b.insertAdjacentHTML('beforeend',PXDOT)}});
  if(p!==r&&p.planStart){const st=$('#projHead .pxstat');if(st)st.insertAdjacentHTML('afterbegin',`<span>Planned start <span class="mono">${isoToUS(p.planStart)}</span></span>`)}}}
pp.addEventListener('change',e=>{const i=e.target.closest('.pxplan-d');if(!i)return;const x=projOfId(i.closest('[data-plan]').dataset.plan);if(!x)return;
  const v=i.value.trim(),iso=v?parseDate(v):'';if(v&&!iso){i.classList.add('invalid');return}
  if((x.planStart||'')!==iso){x.planStart=iso;x.planStarted=null;logAct(tabRoot(x),iso?`planned to start "${x.name}" on ${isoToUS(iso)}`:`cleared the start date of "${x.name}"`);commit()}});
pp.addEventListener('click',e=>{const b=e.target.closest('[data-pxstart]');if(!b)return;const x=projOfId(b.dataset.pxstart);if(x){startTab(x);commit();toast(`Started "${x.name}".`)}});
