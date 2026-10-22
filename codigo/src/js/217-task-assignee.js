/* ---------- who is responsible for a task in a shared project (t.assignee = a member's id, synced with the task) ---------- */
const canAssign=t=>!!(t&&!t.stepOf&&isSharedProj(t.projectId)&&projMembers(S.projects.find(p=>p.id===t.projectId)||{id:t.projectId}).members.length>1);
function assigneeHTML(t){
  if(!canAssign(t))return'';
  return t.assignee?`<button class="asg on" type="button" data-asg="${t.id}" title="Responsible: ${esc(personName(t.assignee))} (click to change)">${avHTML(t.assignee)}</button>`
    :t.done?'':`<button class="asg" type="button" data-asg="${t.id}" title="Pick who is responsible">${shareIcon}</button>`;
}
function openAssignPop(anchor,t){
  const p=S.projects.find(x=>x.id===t.projectId),mem=projMembers(p).members;
  openPop(anchor,`<div class="acct-menu asg-menu" role="menu" aria-label="Responsible"><div class="asg-h">Who is responsible?</div>${mem.map(id=>`<button type="button" role="menuitemradio" aria-checked="${t.assignee===id}" data-who="${esc(id)}">${avHTML(id)}${esc(personName(id))}${t.assignee===id?'<span class="ck">✓</span>':''}</button>`).join('')}
    <button type="button" role="menuitemradio" aria-checked="${!t.assignee}" data-who="">Nobody${!t.assignee?'<span class="ck">✓</span>':''}</button></div>`,el=>{
    el.classList.add('pop-menu');place(el,anchor);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-who]');if(!b)return;closePop();
      const who=b.dataset.who||null;if(who===(t.assignee||null))return;t.assignee=who;
      logAct(p,who?(who===CL.uid?`took "${t.name}"`:`made ${personName(who)} responsible for "${t.name}"`):`cleared who is responsible for "${t.name}"`);commit()});
  });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-asg]');if(!b)return;e.stopPropagation();const t=byId(b.dataset.asg);if(t)openAssignPop(b,t)},true);
{const _apm=addProjectMember;addProjectMember=async function(p,person){await _apm(p,person);if(CL.sproj[p.id]&&(person.id?CL.sproj[p.id].members.includes(person.id):true)){logAct(p,`added ${person.id?personName(person.id):person.email} to the project`);commit()}}}
