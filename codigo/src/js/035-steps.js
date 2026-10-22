/* ---------- numbered steps on a task: "Add step +" then boxes 1, 2, 3...
   Each step is the same task under its own name (step 1 = the task, then "<name> 2", "<name> 3"; renamed with the pencil).
   The row shows the selected step: click a number to switch to it. Ticking the task finishes the selected step, which
   goes to Done as its own entry (stepOf); the task stays until the last step is ticked, which completes the task itself. ---------- */
const stepsLeft=t=>(t.steps||[]).filter(x=>!x.done).length;
// the step the row shows (it can be one already in Done); pendSel = the step a tick finishes
function stepSel(t){const st=t.steps||[],i=t.stepSel;return i>=0&&i<st.length?i:Math.max(0,st.findIndex(x=>!x.done))}
function pendSel(t){const st=t.steps||[],i=stepSel(t);return st[i]&&!st[i].done?i:Math.max(0,st.findIndex(x=>!x.done))}
const selDone=t=>{const st=t.steps||[];return !!(st.length&&st[stepSel(t)].done)}
// the row's name is the selected step's name: keep the step list in sync with it
function syncStep(t){const st=t.steps||[];if(!st.length)return;const s=st[stepSel(t)];s.name=t.name;const e=s.doneId&&byId(s.doneId);if(e)e.name=t.name}
function selectStep(t,i){syncStep(t);t.stepSel=i;t.name=t.steps[i].name}
function addStep(t){if(!t.steps||!t.steps.length){t.steps=[{name:t.name,done:false}];t.stepSel=0}else syncStep(t);
  t.steps.push({name:`${t.steps[0].name} ${t.steps.length+1}`,done:false})}
// finish step i (default: the selected one) when other steps are still open; returns its Done entry
function doStep(t,i){
  syncStep(t);if(i==null)i=pendSel(t);const s=t.steps[i];if(!s||s.done||stepsLeft(t)<=1)return null;
  const e=T({name:s.name,color:t.color,tagId:t.tagId,projectId:t.projectId,longTerm:!!rootOf(t).longTerm,done:true,doneAt:new Date().toISOString(),stepOf:t.id});
  S.tasks.push(e);s.done=true;s.doneId=e.id;selectStep(t,t.steps.findIndex(x=>!x.done));return e;
}
function undoStep(t,i){const s=t.steps[i];if(!s)return;if(s.doneId)S.tasks=S.tasks.filter(x=>x.id!==s.doneId);s.done=false;s.doneId=null;selectStep(t,i)}
function removeStep(t,i){
  syncStep(t);const s=t.steps[i];if(!s)return;if(s.doneId)S.tasks=S.tasks.filter(x=>x.id!==s.doneId);
  const base=t.steps[0].name,wasSel=t.stepSel===i;t.steps.splice(i,1);
  if(t.steps.length<2){t.name=(t.steps[0]||s).name;t.steps=[];t.stepSel=0;return}
  t.steps.forEach((x,k)=>{if(k&&x.name.startsWith(base+' ')&&/ \d+$/.test(x.name))x.name=`${t.steps[0].name} ${k+1}`});
  if(wasSel)t.stepSel=Math.max(0,t.steps.findIndex(x=>!x.done));else if(t.stepSel>i)t.stepSel--;
  t.name=t.steps[t.stepSel].name;
}
// reopening a step's Done entry puts the step back on its task
function reopenStep(e){const t=byId(e.stepOf);S.tasks=S.tasks.filter(x=>x!==e);if(!t)return;
  const i=(t.steps||[]).findIndex(x=>x.doneId===e.id);if(i>=0){t.steps[i].done=false;t.steps[i].doneId=null}
  if(t.done)reopen(t)}
function stepsHTML(t){
  const st=t.steps||[];
  if(!st.length)return `<button class="stepadd" type="button" data-act="stepadd" title="Split this task into numbered steps">Add step +</button>`;
  syncStep(t);const cur=t.stepSel;
  return `<span class="steps">${st.map((x,i)=>`<button class="stepbox${x.done?' on':''}${i===cur?' cur':''}" type="button" data-act="step" data-i="${i}" title="${esc(x.name)}${x.done?' (done)':''}${i===cur?' · showing now':' · click to open this step'} · right-click to remove">${i+1}</button>`).join('')}<button class="stepbox plus" type="button" data-act="stepadd" aria-label="Add step" title="Add step ${st.length+1}">+</button></span>`;
}
// move the step that is open to another number (1..n); every step keeps its name
function moveStepTo(t,from,to){syncStep(t);const st=t.steps,[s]=st.splice(from,1);st.splice(to,0,s);t.stepSel=to;t.name=st[to].name}
// the pencil on step 2 and up: only the step's name, its number, and delete
function openStepEdit(t){
  closePop();closeModal();syncStep(t);
  const i=stepSel(t),n=t.steps.length,s=t.steps[i];
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<form class="modal" role="dialog" aria-modal="true" aria-labelledby="se-h" autocomplete="off">
    <h2 id="se-h">Edit step ${i+1}</h2>
    <label class="fld"><span>NAME</span><input id="se-name" type="text" value="${esc(s.name)}"></label>
    <label class="fld"><span>STEP NUMBER</span><select id="se-num">${[...Array(n)].map((_,k)=>`<option value="${k}"${k===i?' selected':''}>Step ${k+1}</option>`).join('')}</select></label>
    <p class="sp-hint">All steps share the tag, project, dates and other settings: edit them from step 1.${s.done?' This step is done.':''}</p>
    <div class="modal-actions"><button type="button" class="danger-link" data-sdel style="margin-right:auto">Delete step</button><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`;
  document.body.appendChild(back);modal=back;
  const f=back.querySelector('form');let armed=false;
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  f.querySelector('[data-x]').onclick=closeModal;
  f.querySelector('[data-sdel]').onclick=e=>{if(!armed){armed=true;e.target.textContent='Click again to delete';return}
    const snap=JSON.stringify([t.steps,t.stepSel,t.name]),entry=s.doneId&&byId(s.doneId);closeModal();removeStep(t,i);commit();
    toast(`Deleted step "${s.name}".`,()=>{[t.steps,t.stepSel,t.name]=JSON.parse(snap);if(entry&&!byId(entry.id))S.tasks.push(entry);commit()})};
  f.onsubmit=e=>{e.preventDefault();const ni=f.querySelector('#se-name'),name=ni.value.trim();
    if(!name){ni.classList.add('invalid');ni.focus();return}
    t.name=name;syncStep(t);const to=+f.querySelector('#se-num').value;if(to!==i)moveStepTo(t,i,to);
    closeModal();commit();if(to!==i)toast(`"${name}" is now step ${to+1}. Step ${i+1} is now "${t.steps[i].name}".`)};
  setTimeout(()=>f.querySelector('#se-name').focus(),0);
}
