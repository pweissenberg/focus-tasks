/* ---------- Focus mode (v78): one task on the whole screen with its steps, microtasks, subtasks and the timer ---------- */
// Opens from the rail button #focusBtn or Shift+F (the task selected with J/K, else the timer's task, else a list to pick from).
// The timer is linked to the task when it opens (not started). Esc or "Exit" closes it. "Full screen" asks the browser for
// real full screen (inside claude.ai the frame may not allow it; the overlay still covers the page). Page state only: FM.
const FM={id:null,open:false};
const fmIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/></svg>';
{const nt=$('#noiseToggle');if(nt&&!$('#focusBtn'))nt.insertAdjacentHTML('afterend',`<button class="rbtn" id="focusBtn" type="button" aria-label="Focus mode" title="Focus mode (Shift+F)">${fmIcon}</button>`)}
function fmPickId(){const sel=kbSel&&byId(kbSel);if(sel&&!sel.done)return sel.id;const t=byId(S.timer.taskId);return t&&!t.done?t.id:null}
function openFocus(id){
  FM.open=true;FM.id=id||null;FM.sug=fmPickId();closePop();
  if(FM.id&&S.timer.taskId!==FM.id&&!S.timer.running){setTimerTask(FM.id);save()}
  document.body.classList.add('fm-on');fmDraw();
}
function closeFocus(){FM.open=false;const el=$('#fm');if(el)el.remove();document.body.classList.remove('fm-on');try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}}
function fmTask(){const t=FM.id&&byId(FM.id);return t&&!t.stepOf?t:null}
// the open tasks exactly as the Tasks list shows them (all tags and projects, no Shared filter); on hold ones left out
function fmOpenList(){
  const u=S.ui,keep={view:u.view,tag:u.tag,project:u.project,sr:u.sr,hideHold:u.hideHold},out=[];
  Object.assign(u,{view:'tasks',tag:'all',project:'all',sr:null,hideHold:false});memo=new Map();
  try{const walk=(list,depth)=>list.filter(t=>!t.done&&!t.stepOf&&vis(t)).sort(cmp).forEach(t=>{if(!t.onHold)out.push({t,depth});walk(kids(t),depth+1)});
    walk(S.tasks.filter(t=>isOpenRoot(t)&&!rootOf(t).longTerm),0)}
  finally{Object.assign(u,keep);memo=new Map()}
  return out;
}
function fmPickerHTML(msg){
  const opts=fmOpenList();
  return `<div class="fm-pick"><h2>${esc(msg||'What do you want to focus on?')}</h2>
    ${opts.length?`<div class="fm-plist">${opts.map(({t,depth})=>{const g=tagOf(t);const sug=t.id===FM.sug;return `<button type="button" data-fmpick="${t.id}" class="${sug?'sug':''}" style="--d:${depth}"${sug?' title="Selected in the list or on the timer"':''}><i style="background:${(g&&g.color)||t.color||'var(--line)'}"></i><span>${esc(t.name)}</span>${t.due?`<em>${esc(isoToUS(t.due))}</em>`:''}</button>`}).join('')}</div>`:'<p class="fm-empty">No open tasks. Add one first.</p>'}</div>`;
}
function fmTimerHTML(t){
  const tm=S.timer,p=timerParts(),mine=tm.taskId===t.id,brk=isBreak(),pomo=tm.mode==='pomo';
  const started=tm.durMs>0?tm.remainingMs<tm.durMs&&tm.remainingMs>0:tm.upMs>0;
  const phase=pomo?(tm.phase==='focus'?`Focus ${Math.min((tm.round||0)+1,S.prefs.pomo.every)} of ${S.prefs.pomo.every}`:tm.phase==='short'?'Short break':'Long break'):(p.up?'Counting up':'Timer');
  if(!mine)return `<div class="fm-timer"><p class="fm-tnote">The timer is on "${esc((byId(tm.taskId)||{}).name||'another task')}".</p><button type="button" class="btn primary" data-fmtake>Time this task instead</button></div>`;
  return `<div class="fm-timer${brk?' brk':''}"><span class="fm-phase">${esc(phase)}</span><div class="fm-clock mono" id="fm-clock">${p.text}</div>
    <div class="fm-bar"><i id="fm-bar" style="width:${(p.frac*100).toFixed(1)}%"></i></div>
    <div class="fm-tbtns">${tm.running?`<button type="button" class="btn" data-fmt="pause">${icons.pause} Pause</button>`:`<button type="button" class="btn primary" data-fmt="start">${icons.play} ${started?'Resume':pomo&&!brk?'Start focus':'Start'}</button>`}<button type="button" class="btn ghost" data-fmt="reset">${pomo?'Start over':'Reset'}</button></div>
    <span class="fm-spent">⏱ ${fmtDur(spentOf(t.id))} on this task</span></div>`;
}
function fmBodyHTML(t){
  const g=tagOf(t),pj=projOf(t),st=t.steps||[],cur=st.length?stepSel(t):-1,m=microOf(t),ks=kids(t);
  const meta=[g?`<span class="chip" style="--dot:${g.color}"><i></i>${esc(g.name)}</span>`:'',pj?`<span>${esc(projFull(pj))}</span>`:'',t.due?`<span>Due ${esc(isoToUS(t.due))}${t.time?' '+esc(t.time):''}</span>`:'',t.prio===3?'<span class="fm-urg">Urgent</span>':''].filter(Boolean).join('');
  return `<div class="fm-main">
    <div class="fm-meta">${meta}</div>
    ${st.length?`<span class="fm-stepof">Step ${cur+1} of ${st.length}</span>`:''}
    <h1 class="fm-name">${esc(t.name)}</h1>
    ${t.note?`<p class="fm-note">${esc(t.note)}</p>`:''}
    ${fmTimerHTML(t)}
    ${st.length?`<section class="fm-sec"><h3>Steps</h3>${st.map((x,i)=>`<label class="fm-li${x.done?' on':''}${i===cur?' cur':''}"><input type="checkbox" data-fmstep="${i}"${x.done?' checked':''}><span class="fm-n">${i+1}</span><span>${esc(i===cur?t.name:x.name)}</span></label>`).join('')}</section>`:''}
    <section class="fm-sec"><h3>Microtasks</h3>${m.map(x=>`<label class="fm-li${x.done?' on':''}"><input type="checkbox" data-fmmt="${x.id}"${x.done?' checked':''}><span>${esc(x.name||'(empty)')}</span></label>`).join('')}
      <form class="fm-add" data-fmmtadd><input type="text" id="fm-mt" placeholder="Add a microtask and press Enter" aria-label="Add a microtask" autocomplete="off"></form></section>
    ${ks.length?`<section class="fm-sec"><h3>Subtasks</h3>${ks.sort(cmp).map(k=>`<label class="fm-li"><input type="checkbox" data-fmkid="${k.id}"><span>${esc(k.name)}</span></label>`).join('')}</section>`:''}
    <div class="fm-done"><button type="button" class="btn primary" data-fmdone>${st.length&&stepsLeft(t)>1?'Finish this step':'Mark task done'}</button></div>
  </div>`;
}
function fmDraw(){
  if(!FM.open)return;let el=$('#fm');
  const a=document.activeElement,keep=a&&a.id==='fm-mt'?{v:a.value,s:a.selectionStart}:null,sc=el?el.querySelector('.fm-scroll').scrollTop:0;
  if(!el){el=document.createElement('div');el.id='fm';el.className='fm';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Focus mode');document.body.appendChild(el);fmBind(el)}
  const t=fmTask();if(FM.id&&!t)FM.id=null;
  const opts=fmOpenList();
  el.innerHTML=`<div class="fm-top"><span class="fm-brand">${fmIcon} Focus mode</span>
    ${t?`<select id="fm-sw" aria-label="Switch task"><option value="">Switch task…</option>${opts.map(({t:x,depth})=>`<option value="${x.id}"${x.id===t.id?' disabled':''}>${'  '.repeat(depth)}${esc(x.name)}</option>`).join('')}</select>`:''}
    <span class="fm-sp"></span>
    <button type="button" class="btn ghost sm${noise?' on':''}" data-fmnoise title="White noise">${noise?'Sound on':'Sound off'}</button>
    <button type="button" class="btn ghost sm" data-fmfull title="Use the whole screen">${document.fullscreenElement?'Leave full screen':'Full screen'}</button>
    <button type="button" class="btn sm" data-fmx title="Close (Esc)">Exit</button></div>
    <div class="fm-scroll${t?'':' picking'}">${t?fmBodyHTML(t):fmPickerHTML(FM.doneMsg)}</div>`;
  FM.doneMsg=null;el.querySelector('.fm-scroll').scrollTop=sc;
  if(!t&&!keep&&!el.contains(document.activeElement)){const b=el.querySelector('.fm-plist .sug')||el.querySelector('.fm-plist button');if(b)b.focus({preventScroll:false})}
  if(keep){const i=$('#fm-mt');if(i){i.value=keep.v;i.focus();try{i.setSelectionRange(keep.s,keep.s)}catch(e){}}}
}
function fmBind(el){
  el.addEventListener('click',e=>{
    const b=e.target.closest('button,[data-fmstep],[data-fmmt],[data-fmkid]');if(!b)return;const t=fmTask();
    if(b.dataset.fmx!=null){closeFocus();return}
    if(b.dataset.fmpick){FM.id=b.dataset.fmpick;if(!S.timer.running)setTimerTask(FM.id);commit();return}
    if(b.dataset.fmfull!=null){try{if(document.fullscreenElement)document.exitFullscreen();else{const r=document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();if(r&&r.catch)r.catch(()=>toast('Full screen is not allowed here. Press F11 or open focus-tasks.html.'))}}catch(x){toast('Full screen is not allowed here.')}return}
    if(b.dataset.fmnoise!=null){noise?stopNoise():startNoise();fmDraw();return}
    if(!t)return;
    if(b.dataset.fmtake!=null){setTimerTask(t.id);commit();return}
    if(b.dataset.fmt){const k=b.dataset.fmt;if(k==='start')timerStart();else if(k==='pause')timerPause();else timerReset();return}
    if(b.dataset.fmdone!=null){fmFinish(t);return}
  });
  el.addEventListener('change',e=>{
    const t=fmTask(),c=e.target;
    if(c.id==='fm-sw'&&c.value){FM.id=c.value;if(!S.timer.running)setTimerTask(FM.id);commit();return}
    if(!t)return;
    if(c.dataset.fmstep!=null){const i=+c.dataset.fmstep,s=t.steps[i];
      if(c.checked&&!s.done){if(stepsLeft(t)<=1){fmFinish(t);return}doStep(t,i)}else if(!c.checked&&s.done)undoStep(t,i);commit();return}
    if(c.dataset.fmmt){const m=microOf(t).find(x=>x.id===c.dataset.fmmt);if(m){m.done=c.checked;commit()}return}
    if(c.dataset.fmkid){const k=byId(c.dataset.fmkid);if(k&&c.checked){complete(k);commit();toast(`"${k.name}" moved to Done.`,()=>{reopen(k);commit()})}return}
  });
  el.addEventListener('submit',e=>{if(!e.target.matches('[data-fmmtadd]'))return;e.preventDefault();e.stopPropagation();const t=fmTask(),i=$('#fm-mt'),v=i.value.trim();if(!t||!v)return;
    t.micro=microOf(t).concat([{id:uid(),name:v,done:false}]);i.value='';commit();const n=$('#fm-mt');if(n)n.focus()});
}
function fmFinish(t){
  const many=stepsLeft(t)>1;if(S.timer.taskId===t.id&&S.timer.running&&!many)timerPause();
  complete(t);commit();
  if(many){toast(`Step done. ${stepsLeft(t)} left.`);return}
  toast(`"${t.name}" is done.`,()=>{reopen(t);FM.id=t.id;commit()});
  FM.id=null;FM.doneMsg='Nice work. What is next?';fmDraw();
}
{const _rfm=render;render=function(){_rfm.apply(this,arguments);if(FM.open)fmDraw()}}
setInterval(()=>{if(!FM.open||!S.timer.running)return;const c=$('#fm-clock'),b=$('#fm-bar');if(!c)return;const p=timerParts();c.textContent=p.text;if(b)b.style.width=(p.frac*100).toFixed(1)+'%'},250);
document.addEventListener('fullscreenchange',()=>{if(FM.open)fmDraw()});
$('#focusBtn').onclick=()=>FM.open?closeFocus():openFocus(null); // always starts on the list of open tasks (Pedro); the selected / timer task is marked there
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const typing=e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]');
  if(FM.open&&e.key==='Escape'&&!modal&&!pop&&!dp){if(typing&&e.target.value){e.target.value='';return}e.preventDefault();e.stopPropagation();closeFocus();return}
  if(FM.open&&!typing&&!modal&&!pop&&e.key.length===1&&!(e.key==='F'&&e.shiftKey)){e.stopPropagation(); // the list shortcuts stay off behind the overlay; P still starts or pauses
    if(e.key.toLowerCase()==='p'){e.preventDefault();if(S.timer.running)timerPause();else timerStart()}return}
  if(e.key==='F'&&e.shiftKey&&!typing&&!modal&&!pop&&!document.body.classList.contains('show-landing')){e.preventDefault();e.stopPropagation();FM.open?closeFocus():openFocus(null)}
},true);
KEYS[1][1].splice(KEYS[1][1].findIndex(x=>x[0]==='F')+1,0,['Shift+F','Focus mode on it (or on the timer\'s task)']);
