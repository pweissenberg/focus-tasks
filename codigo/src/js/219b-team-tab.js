/* ---------- project Team tab: who is in the project, what each person can do, and the tasks they are responsible for ---------- */
function renderTeamTab(p,body){
  const m=projMembers(p),owner=m.owner,mine=owner===CL.uid,ts=S.tasks.filter(t=>t.projectId===p.id&&!t.stepOf);
  const role=id=>id===owner?'Owner':(p.perms||{})[id]==='view'?'View only':'Can edit';
  const card=id=>{const open=ts.filter(t=>t.assignee===id&&!t.done),done=ts.filter(t=>t.assignee===id&&t.done).length,pr=CL.prof[id]||{};
    return `<div class="tm-card"><div class="tmc-top">${avHTML(id)}<div class="tmc-who"><b>${esc(id===CL.uid&&personName(id)!=='You'?personName(id)+' (you)':personName(id))}</b>${pr.email?`<span>${esc(pr.email)}</span>`:''}</div>
      ${mine&&id!==owner?permHTML(p,id,owner,mine):`<span class="tmc-role${id===owner?' own':''}">${role(id)}</span>`}</div>
      <div class="tmc-nums"><span><b>${open.length}</b> open</span><span><b>${done}</b> done</span></div>
      ${open.length?`<ul class="tmc-list">${open.slice(0,6).map(t=>`<li style="--c:${colorOf(t)}">${esc(t.name)}${t.due?` <em>${esc(t.due)}</em>`:''}</li>`).join('')}${open.length>6?`<li class="more">+${open.length-6} more</li>`:''}</ul>`:'<p class="sp-hint">No open tasks assigned.</p>'}</div>`};
  const free=ts.filter(t=>!t.done&&!t.assignee).length,n=m.members.length+m.invited.length;
  body.innerHTML=`<div class="team-head"><span>${CL.on?`${n} ${n===1?'person':'people'}`:'Only you'}${free&&CL.on&&n>1?` · ${free} open task${free===1?'':'s'} without anyone responsible`:''}</span>
      <button class="btn sm" type="button" data-pshare>${shareIcon}${CL.on?'Add person':'Sign in to add people'}</button></div>
    ${CL.on?`<div class="team-grid">${m.members.map(card).join('')}${m.invited.map(e=>`<div class="tm-card inv"><div class="tmc-top">${avHTML(null,e)}<div class="tmc-who"><b>${esc(e)}</b><span>Invited, not signed in yet</span></div></div></div>`).join('')}</div>`
      :`<div class="empty"><strong>Work on this project with other people</strong>Sign in, then add people by name or email. They see the tasks, Notes and Free canvas, and you choose who can edit.</div>`}`;
}
