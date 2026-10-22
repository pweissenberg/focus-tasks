/* ---------- edit modal ---------- */
let modal=null;
function closeModal(){if(modal){modal.remove();modal=null;closeDP()}}
function openEdit(id){
  const t=byId(id);if(!t)return;
  if(!t.done&&(t.steps||[]).length&&stepSel(t)>0){openStepEdit(t);return}
  closePop();closeModal();
  let color=t.color;
  const banned=new Set([t.id,...descendants(t.id).map(d=>d.id)]);
  const parents=S.tasks.filter(x=>!x.done&&!banned.has(x.id)&&!isWaitMe(x)).sort((a,b)=>a.name.localeCompare(b.name));
  const curParent=parentOf(t);
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<form class="modal" role="dialog" aria-modal="true" aria-labelledby="ed-h" autocomplete="off">
    <h2 id="ed-h">Edit task</h2>
    <label class="fld"><span>NAME</span><input id="ed-name" type="text" value="${esc(t.name)}"></label>
    <div class="fld"><span>COLOR</span><div class="swatches" id="ed-colors">${swatchesHTML(color,true)}</div></div>
    <div class="row2"><label class="fld"><span>TAG</span><select id="ed-tag">${optionList(S.tags,'No tag',t.tagId)}</select></label>
      <label class="fld"><span>PROJECT</span><select id="ed-proj">${optionList(S.projects,'No project',t.projectId)}</select></label></div>
    <div class="row2"><label class="fld"><span>DUE DATE</span><input id="ed-due" type="text" class="mono" placeholder="MM/DD/YYYY" value="${isoToUS(t.due)}"></label>
      <label class="fld"><span>TIME</span><input id="ed-time" type="time" class="mono" value="${esc(t.time||'')}"></label></div>
    <div class="row2"><label class="fld"><span>REMINDER</span><select id="ed-rem">${REMINDS.map(([v,l])=>`<option value="${v}"${String(t.remind==null?'':t.remind)===String(v)?' selected':''}>${l}</option>`).join('')}</select></label>
      <label class="fld"><span>PRIORITY</span><select id="ed-prio">${PRIOS.map(([v,l])=>`<option value="${v}"${(t.prio||0)===v?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <p class="sp-hint" id="ed-remhint" hidden></p>
    <div class="row2"><label class="fld"><span>SUBTASK OF</span><select id="ed-parent"><option value="">Nothing (top level)</option>${parents.map(p=>`<option value="${p.id}"${curParent&&curParent.id===p.id?' selected':''}>${esc(p.name)}${rootOf(p).longTerm?' (long term)':''}</option>`).join('')}</select></label>
      <label class="fld"><span>REPEAT</span><select id="ed-rep">${REPEATS.map(([k,l])=>`<option value="${k}"${(t.repeat?t.repeat.freq:'')===k?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <label class="chk" id="ed-long-wrap"><input type="checkbox" id="ed-long"${t.longTerm?' checked':''}> Long-term task</label>
    <div class="modal-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`;
  document.body.appendChild(back);modal=back;
  const f=back.querySelector('form'),dueIn=f.querySelector('#ed-due'),par=f.querySelector('#ed-parent'),lw=f.querySelector('#ed-long-wrap');
  bindDate(dueIn);
  bindSwatches(f.querySelector('#ed-colors'),c=>color=c);
  const syncLong=()=>lw.hidden=!!par.value;syncLong();par.onchange=syncLong;
  const remSel=f.querySelector('#ed-rem'),timeIn=f.querySelector('#ed-time'),remHint=f.querySelector('#ed-remhint');
  const syncRem=()=>{const on=remSel.value!=='',noDate=!parseDate(dueIn.value),noTime=!timeIn.value;remHint.hidden=!on||(!noDate&&!noTime);
    remHint.textContent=noDate?`No due date yet: the reminder will use today${noTime?' at 09:00':''}.`:'No time set: the reminder uses 09:00 on the due date.'};
  syncRem();remSel.onchange=syncRem;timeIn.oninput=syncRem;dueIn.addEventListener('change',syncRem);dueIn.addEventListener('blur',syncRem);
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  f.querySelector('[data-x]').onclick=closeModal;
  f.onsubmit=e=>{e.preventDefault();
    const nameIn=f.querySelector('#ed-name'),name=nameIn.value.trim(),due=parseDate(dueIn.value);
    if(!name){nameIn.classList.add('invalid');nameIn.focus();return}
    if(due===null){dueIn.classList.add('invalid');dueIn.focus();return}
    const tmv=timeIn.value||'',rmv=remSel.value,rm=rmv===''?null:+rmv;
    if(due!==t.due||tmv!==(t.time||'')||rm!==t.remind)t.snooze=null;
    t.name=name;t.color=color;t.tagId=f.querySelector('#ed-tag').value||null;t.projectId=f.querySelector('#ed-proj').value||null;t.due=due;
    t.time=tmv;t.remind=rm;t.prio=+f.querySelector('#ed-prio').value||0;
    if((t.time||t.remind!=null)&&!t.due)t.due=todayISO();
    if(t.remind!=null)askNotify();
    const rp=f.querySelector('#ed-rep').value;t.repeat=rp?{freq:rp}:null;if(t.repeat&&!t.due)t.due=todayISO();
    const np=par.value;
    if(np){if(!curParent||curParent.id!==np)nestInto(t.id,np)}
    else{const lt=f.querySelector('#ed-long').checked;
      if(curParent||!!t.longTerm!==lt){t.parentId=null;t.longTerm=lt;const r=S.tasks.filter(x=>x.id!==t.id&&isOpenRoot(x)&&!!x.longTerm===lt);t.order=r.length?Math.max(...r.map(x=>x.order))+1:0;
        if(!curParent&&lt!==(S.ui.view==='long'))toast(lt?'Moved to Long term.':'Moved to Tasks.')}}
    closeModal();commit()};
  setTimeout(()=>f.querySelector('#ed-name').focus(),0);
}

