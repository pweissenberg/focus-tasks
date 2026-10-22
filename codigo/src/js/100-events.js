/* ---------- events ---------- */
const goView=e=>{const b=e.target.closest('[data-view]');if(!b)return;if(b.dataset.view==='calendar'&&S.ui.view!=='calendar')$('#cal').innerHTML='';S.ui.view=b.dataset.view;commit()};
document.querySelector('.views').addEventListener('click',goView);$('#rail').addEventListener('click',goView);
document.querySelector('.sorts').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(!b)return;const k=b.dataset.sort;
  if(S.ui.sort===k&&k!=='manual')S.ui.dir=-S.ui.dir;else{S.ui.sort=k;S.ui.dir=k==='created'?-1:1}commit()});
$('#holdToggle').onclick=()=>{S.ui.hideHold=!S.ui.hideHold;commit()};
$('#tabs').addEventListener('click',e=>{
  const ad=e.target.closest('[data-addtag]');if(ad){openTagPop(ad,null);return}
  const ed=e.target.closest('[data-tedit]');if(ed){e.stopPropagation();openTagPop(ed.closest('.tab'),S.tags.find(g=>g.id===ed.dataset.tedit));return}
  const b=e.target.closest('[data-tag]');if(!b)return;S.ui.tag=b.dataset.tag;
  if(S.ui.tag!=='all'){$('#c-tag').value=S.ui.tag}commit()});
$('#tabs').addEventListener('dblclick',e=>{const b=e.target.closest('[data-tag]');if(b&&b.dataset.tag!=='all')openTagPop(b,S.tags.find(g=>g.id===b.dataset.tag))});
$('#addProject').onclick=e=>openProjPop(e.currentTarget,null);
$('#plist').addEventListener('click',e=>{
  const ed=e.target.closest('[data-pedit]');if(ed){e.stopPropagation();openProjPop(ed.closest('.pitem'),S.projects.find(p=>p.id===ed.dataset.pedit));return}
  if(e.target.closest('[data-newproj]')){openProjPop(e.target.closest('[data-newproj]'),null);return}
  const go=e.target.closest('[data-pgo]');if(go){e.stopPropagation();openProject(go.dataset.pgo);return}
  const p=e.target.closest('[data-proj]');if(!p)return;S.ui.project=p.dataset.proj;
  if(S.ui.view==='project'){if(p.dataset.proj==='all')S.ui.view=S.ui.prevView&&S.ui.prevView!=='project'?S.ui.prevView:'tasks';else S.ui.projectPage=p.dataset.proj}
  $('#c-proj').value=S.ui.project==='all'?'':S.ui.project;commit()});
$('#plist').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-proj]')){e.preventDefault();e.target.click()}});
$('#banner').addEventListener('click',e=>{
  if(e.target.closest('[data-clear-ex]')){S.tasks=[];S.projects=[];S.ui.project='all';S.example=false;$('#c-proj').value='';commit();toast('Examples cleared. Your tags are kept.')}
  if(e.target.closest('[data-keep-ex]')){S.example=false;commit()}
});
$('#c-tag').addEventListener('change',paintComposerColor);
$('#c-color').onclick=e=>openPop(e.currentTarget,`<div class="pop-form"><strong>Task color</strong><div class="swatches">${swatchesHTML(composerColor,true)}</div></div>`,el=>{
  bindSwatches(el.querySelector('.swatches'),c=>{composerColor=c;paintComposerColor()})});
bindDate($('#c-due'));
$('#c-prio').onclick=e=>openPrioPop(e.currentTarget,composerPrio,v=>{composerPrio=v;paintComposerPrio();$('#c-name').focus()});
$('#composer').addEventListener('submit',e=>{
  e.preventDefault();const ni=$('#c-name'),di=$('#c-due'),name=ni.value.trim();
  if(!name){ni.focus();return}
  const due=parseDate(di.value);if(due===null){di.classList.add('invalid');di.focus();return}
  const t=addFromBar('c',{name,due,tagId:$('#c-tag').value||null,projectId:$('#c-proj').value||null,color:composerColor,prio:composerPrio});
  const rl=!!rootOf(t).longTerm,par=t.parentId&&byId(t.parentId),here=(S.ui.view==='tasks'&&!rl)||(S.ui.view==='long'&&rl);
  if(!here)setTimeout(()=>toast(`"${name}" added to ${par?`"${par.name}" in `:''}${rl?'Long term':'Tasks'}.`),0);
  ni.value='';di.value='';composerColor=null;composerPrio=0;closeDP();commit();if(ADV.c.open)advShow('c',true);ni.focus();
});
$('#c-adv').innerHTML=icons.gear;
$('#c-adv').onclick=()=>advShow('c',!ADV.c.open);
{const cf=$('#composer'),onField=e=>{if(e.target.dataset.adv)advField('c',e.target);else if(e.target.id==='c-due')advSync('c')};
  cf.addEventListener('input',onField);cf.addEventListener('change',onField);
  cf.addEventListener('focusout',e=>{if(e.target.id==='c-due')setTimeout(()=>advSync('c'),0)});
  cf.addEventListener('click',e=>{if(e.target.closest('[data-advclear]')){ADV.c.a=advBlank();advShow('c',true)}});
  cf.addEventListener('keydown',e=>{if(e.key==='Escape'&&ADV.c.open&&!dp&&!pop&&!modal&&e.target.closest('.cadv,.cgear')){advShow('c',false);$('#c-adv').focus()}});}
$('#notes').addEventListener('input',e=>{S.notes=e.target.value;saveSoon()});

const list=$('#list');
list.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const rowEl=b.closest('.task');if(!rowEl)return;
  const t=byId(rowEl.dataset.id),act=b.dataset.act;
  if(act==='toggle'){t.collapsed=!t.collapsed;commit()}
  else if(act==='edit')openEdit(t.id);
  else if(act==='prio')openPrioPop(b,t.prio||0,v=>{t.prio=v;commit()});
  else if(act==='archive'){const ts=[t,...S.tasks.filter(x=>x.done&&!x.archived&&x.doneWithParent===t.id)],at=new Date().toISOString();ts.forEach(x=>{x.archived=true;x.archivedAt=at});commit();
    toast(`Archived "${t.name}"${ts.length>1?` and ${ts.length-1} subtask${ts.length>2?'s':''}`:''}.`,()=>{ts.forEach(x=>x.archived=false);commit()})}
  else if(act==='unarchive'){t.archived=false;commit();toast(`"${t.name}" is back in Done.`)}
  else if(act==='stepadd'){addStep(t);commit()}
  else if(act==='step'){const i=+b.dataset.i;if(t.steps[i]){selectStep(t,i);commit()}}
  else if(act==='focus')focusTask(t.id);
  else if(act==='share')openSharePop(b,t);
  else if(act==='up')moveStep(t.id,-1);
  else if(act==='down')moveStep(t.id,1);
  else if(act==='del'){
    const snap=JSON.stringify(S.tasks),gone=new Set([t.id,...descendants(t.id).map(d=>d.id)]);
    if(S.timer.running&&gone.has(S.timer.taskId)){logSeg();S.timer.taskId=null}
    const undos=S.tasks.filter(x=>gone.has(x.id)&&x.shared).map(leaveShared).filter(Boolean);
    S.tasks=S.tasks.filter(x=>!gone.has(x.id));commit();
    toast(`${undos.length?'Removed':'Deleted'} "${t.name}"${gone.size>1?` and ${gone.size-1} subtask${gone.size>2?'s':''}`:''}${undos.length?' from your list':''}.`,()=>{undos.forEach(u=>u());S.tasks=JSON.parse(snap).map(T);commit()});
  }
});
list.addEventListener('change',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const rowEl=b.closest('.task'),t=byId(rowEl.dataset.id);
  if(b.dataset.act==='hold'){t.onHold=b.checked;commit()}
  if(b.dataset.act==='done'){
    if(!b.checked&&!t.done&&selDone(t)){const i=stepSel(t);undoStep(t,i);commit();toast(`"${t.name}" is open again.`);return}
    if(b.checked&&stepsLeft(t)>1){b.checked=false;const i=pendSel(t),e=doStep(t,i);commit();toast(`"${e.name}" moved to Done. ${stepsLeft(t)} step${stepsLeft(t)>1?'s':''} left.`,()=>{undoStep(t,i);commit()});return}
    if(b.checked){rowEl.classList.add('leaving');setTimeout(()=>{if(S.timer.taskId===t.id&&S.timer.running)timerPause();complete(t);commit();askAddTime(t)},220)}
    else{rowEl.classList.add('leaving');setTimeout(()=>{reopen(t);commit();toast(`"${t.name}" is back in ${rootOf(t).longTerm?'Long term':'Tasks'}.`)},220)}
  }
});
list.addEventListener('input',e=>{if(e.target.dataset.act==='note'){const t=byId(e.target.closest('.task').dataset.id);t.note=e.target.value;saveSoon()}});
list.addEventListener('keydown',e=>{if(e.target.dataset.act==='note'&&e.key==='Enter')e.target.blur()});
list.addEventListener('contextmenu',e=>{const b=e.target.closest('[data-act="step"]');if(!b)return;e.preventDefault();
  const t=byId(b.closest('.task').dataset.id),i=+b.dataset.i;removeStep(t,i);commit();toast(`Removed step ${i+1}.`)});
/* Done view: archive bar */
list.addEventListener('click',e=>{
  if(e.target.closest('[data-arch-toggle]')){S.ui.showArchived=!S.ui.showArchived;commit();return}
  if(e.target.closest('[data-arch-all]')){const ts=[...list.querySelectorAll('.task')].map(r=>byId(r.dataset.id)).filter(t=>t&&t.done&&!t.archived);if(!ts.length)return;
    const at=new Date().toISOString();ts.forEach(t=>{t.archived=true;t.archivedAt=at});commit();
    toast(`Archived ${ts.length} task${ts.length>1?'s':''}.`,()=>{ts.forEach(t=>t.archived=false);commit()})}
});
list.addEventListener('change',e=>{const s=e.target.closest('[data-arch-after]');if(!s)return;S.prefs.archiveAfter=+s.value;const n=autoArchive();commit();
  if(n)toast(`Archived ${n} task${n>1?'s':''} done more than ${s.value} day${s.value==='1'?'':'s'} ago.`)});

