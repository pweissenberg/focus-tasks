/* ---------- shared projects: members see the project, its tasks, Notes and Free canvas, live ---------- */
// a shared project is a row in shared_projects; its tasks are shared_tasks rows with project_id set
const projBody=p=>({name:p.name,color:p.color||null,notes_list:p.notesList||[],canvas:p.canvas||[],strokes:p.strokes||[],due:p.due||'',archived:!!p.archived,files:p.files||[],activity:p.activity||[],extra:projExtra(p)});
const projRowBody=x=>({name:x.name||'',color:x.color||null,notes_list:x.notes_list||[],canvas:x.canvas||[],strokes:x.strokes||[],due:x.due||'',archived:!!x.archived,files:x.files||[],activity:x.activity||[],extra:projExtra(x.extra||{})});
const isSharedProj=id=>!!(id&&CL.on&&CL.sproj[id]);
function projMembers(p){const x=CL.sproj[p.id];return x?{members:x.members||[],invited:x.invited||[],owner:x.owner}:{members:[CL.uid],invited:[],owner:CL.uid}}
// the note or canvas text being typed in right now keeps its local text when a remote copy arrives
function keepTyping(p,body){
  const ae=document.activeElement;if(!ae||!ae.closest||!ae.closest('#projBody')||S.ui.projectPage!==p.id)return;
  const n=ae.closest('[data-nid]'),c=ae.closest('[data-cid]');
  if(n){const mine=p.notesList.find(x=>x.id===n.dataset.nid),r=body.notes_list.find(x=>x.id===n.dataset.nid);if(mine&&r){r.title=mine.title;r.text=mine.text;r.updatedAt=mine.updatedAt}}
  if(c){const mine=p.canvas.find(x=>x.id===c.dataset.cid),r=body.canvas.find(x=>x.id===c.dataset.cid);if(mine&&r)r.text=mine.text}
}
async function reconcileProjects(){
  const {data,error}=await CL.sb.from('shared_projects').select('*');
  if(error)throw error;
  let ch=false;const seen=new Set(),fresh=[];
  for(const x of data){
    if(CL.pleaving.has(x.id))continue;
    x.members=x.members||[];x.invited=x.invited||[];
    if(!x.members.includes(CL.uid)){
      if(!x.invited.includes(CL.email))continue;
      const members=[...x.members,CL.uid],invited=x.invited.filter(e=>e!==CL.email);
      const {error:e2}=await CL.sb.from('shared_projects').update({members,invited}).eq('id',x.id);
      if(e2)continue;x.members=members;x.invited=invited;
    }
    seen.add(x.id);CL.sproj[x.id]=x;
    let p=S.projects.find(y=>y.id===x.id);
    if(!p){p={id:x.id,name:x.name||'Project',color:x.color,notesList:[],canvas:[],strokes:[]};S.projects.push(p);ch=true;fresh.push(x)}
    const rb=JSON.stringify(projRowBody(x));
    // skip my own writes: what I have is the same or newer
    if(rb!==CL.psent[x.id]&&!CL.revs.has(x.rev)){CL.psent[x.id]=rb;
      if(JSON.stringify(projBody(p))!==rb){const b=projRowBody(x);keepTyping(p,b);
        p.name=b.name;if(b.color)p.color=b.color;p.notesList=b.notes_list;p.canvas=b.canvas;p.strokes=b.strokes;p.due=b.due;p.archived=b.archived;p.files=b.files;p.activity=b.activity;mergeExtra(p,b.extra);ch=true;
        if(JSON.stringify(projBody(p))!==rb)CL.psent[x.id]=null}}
    const meta=JSON.stringify([x.members,x.invited,x.owner]);
    if(!p.shared||JSON.stringify([p.members,p.invited,p.owner])!==meta){p.shared=true;p.members=x.members;p.invited=x.invited;p.owner=x.owner;ch=true}
  }
  S.projects.filter(p=>p.shared&&!seen.has(p.id)&&!CL.pbusy.has(p.id)).forEach(p=>{
    S.projects=S.projects.filter(y=>y!==p);delete CL.sproj[p.id];delete CL.psent[p.id];ch=true;
    S.tasks.forEach(t=>{if(t.projectId===p.id)t.projectId=null});
    if(S.ui.project===p.id)S.ui.project='all';
    toast(`You are no longer a member of "${p.name}".`);addAlert(`You are no longer a member of the project "${p.name}".`)});
  if(fresh.length){const x=fresh[0],by=x.updated_by&&x.updated_by!==CL.uid?x.updated_by:x.owner;await ensureProfiles([by]);
    toast(`${by&&by!==CL.uid?personName(by):'Someone'} added you to the project "${x.name}".`);
    fresh.forEach(y=>{const w=y.updated_by&&y.updated_by!==CL.uid?y.updated_by:y.owner;addAlert(`${w&&w!==CL.uid?personName(w):'Someone'} added you to the project "${y.name}".`,null,y.id)})}
  return ch;
}
async function pushProjects(){
  if(!CL.on)return;
  for(const p of S.projects){
    if(!CL.sproj[p.id]||CL.pbusy.has(p.id))continue;
    const b=projBody(p),js=JSON.stringify(b);if(js===CL.psent[p.id])continue;CL.psent[p.id]=js;
    const rev=uid();CL.revs.add(rev);
    const {error}=await CL.sb.from('shared_projects').update(Object.assign({},b,{rev,updated_by:CL.uid,updated_at:new Date().toISOString()})).eq('id',p.id);
    if(error){setSync('err',error.message);CL.psent[p.id]=null}
  }
  await syncProjectTasks();
}
// every task in a shared project is shared with all of the project's members
async function syncProjectTasks(){
  if(!CL.on)return;
  for(const t of S.tasks){
    const sp=CL.sproj[t.projectId];if(!sp||CL.busy.has(t.id)||CL.leaving.has(t.id))continue;
    const x=CL.shared[t.id],members=[...new Set([...(x?x.members:[CL.uid]),...sp.members])],
      invited=[...new Set([...(x?x.invited:[]),...(sp.invited||[])])].filter(e=>!members.some(m=>CL.prof[m]&&CL.prof[m].email===e));
    if(x&&members.length===x.members.length&&invited.length===x.invited.length)continue;
    const row=Object.assign(sharedBody(t),{members,invited,updated_by:CL.uid,updated_at:new Date().toISOString()});
    if(!x)Object.assign(row,{id:t.id,created_at:t.createdAt,owner:CL.uid,passed_by:null});
    if(!await writeShared(t,row,!x))continue;
    CL.shared[t.id]=Object.assign({},x||{},row,{id:t.id});CL.sent[t.id]=JSON.stringify(sharedBody(t));
    t.shared=true;t.members=members;t.invited=invited;if(!x){t.owner=CL.uid;t.passedBy=null}
  }
}
async function addProjectMember(p,person){
  const x=CL.sproj[p.id];
  let members=x?[...x.members]:[CL.uid],invited=x?[...x.invited]:[];
  if(person.id){if(!members.includes(person.id))members.push(person.id)}else if(!invited.includes(person.email))invited.push(person.email);
  const rev=uid();CL.revs.add(rev);CL.pbusy.add(p.id);
  const row={members,invited,rev,updated_by:CL.uid,updated_at:new Date().toISOString()};
  if(!x)Object.assign(row,projBody(p),{id:p.id,owner:CL.uid});
  const {error}=x?await CL.sb.from('shared_projects').update(row).eq('id',p.id):await CL.sb.from('shared_projects').insert(row);
  CL.pbusy.delete(p.id);
  if(error){toast('Could not add: '+error.message);return}
  CL.sproj[p.id]=Object.assign({},x||{},row,{id:p.id});CL.psent[p.id]=JSON.stringify(projBody(p));
  p.shared=true;p.members=members;p.invited=invited;p.owner=CL.sproj[p.id].owner;
  await syncProjectTasks();commit();
  const who=person.id?personName(person.id):person.email;
  toast(person.id?`Added ${who} to "${p.name}".`:`Added ${who} to "${p.name}". They will see it after they sign in.`);
}
// take people off the project and off its tasks; with only me left, the project is no longer shared
async function removeProjectMember(p,person){
  const x=CL.sproj[p.id];if(!x)return;
  const members=x.members.filter(m=>m!==person.id),invited=x.invited.filter(e=>e!==person.email);
  CL.pbusy.add(p.id);
  for(const t of S.tasks.filter(t=>t.projectId===p.id&&CL.shared[t.id])){const y=CL.shared[t.id];
    const tm=y.members.filter(m=>m!==person.id),ti=y.invited.filter(e=>e!==person.email);
    if(await writeShared(t,{members:tm,invited:ti,updated_by:CL.uid},false)){y.members=tm;y.invited=ti;t.members=tm;t.invited=ti}}
  const alone=members.length<=1&&!invited.length&&members[0]===CL.uid;
  const {error}=alone?await CL.sb.from('shared_projects').delete().eq('id',p.id):await CL.sb.from('shared_projects').update({members,invited,updated_by:CL.uid}).eq('id',p.id);
  CL.pbusy.delete(p.id);
  if(error){toast('Could not remove: '+error.message);return}
  if(alone){delete CL.sproj[p.id];delete CL.psent[p.id];p.shared=false;p.members=[];p.invited=[];
    for(const t of S.tasks.filter(t=>t.projectId===p.id&&CL.shared[t.id]&&CL.shared[t.id].members.length<=1&&!CL.shared[t.id].invited.length)){
      await CL.sb.from('shared_tasks').delete().eq('id',t.id);delete CL.shared[t.id];delete CL.sent[t.id];t.shared=false;t.members=[];t.invited=[]}}
  else{x.members=members;x.invited=invited;p.members=members;p.invited=invited}
  commit();
}
// leaving a shared project takes it and its tasks off my lists; the others keep them
async function leaveProject(p){
  const x=CL.sproj[p.id];if(!x)return;CL.pleaving.add(p.id);
  const members=x.members.filter(m=>m!==CL.uid),tasks=S.tasks.filter(t=>t.projectId===p.id&&CL.shared[t.id]);
  for(const t of tasks){const y=CL.shared[t.id],tm=y.members.filter(m=>m!==CL.uid);
    CL.busy.add(t.id);
    tm.length||y.invited.length?await CL.sb.from('shared_tasks').update({members:tm,owner:y.owner===CL.uid?tm[0]||null:y.owner,updated_by:CL.uid}).eq('id',t.id):await CL.sb.from('shared_tasks').delete().eq('id',t.id);
    CL.busy.delete(t.id);delete CL.shared[t.id];delete CL.sent[t.id]}
  const {error}=members.length||x.invited.length?await CL.sb.from('shared_projects').update({members,owner:x.owner===CL.uid?members[0]||null:x.owner,updated_by:CL.uid}).eq('id',p.id):await CL.sb.from('shared_projects').delete().eq('id',p.id);
  CL.pleaving.delete(p.id);
  if(error){toast('Could not leave: '+error.message);return}
  const gone=new Set(tasks.map(t=>t.id));
  if(gone.has(S.timer.taskId)){if(S.timer.running)logSeg();S.timer.running=false;S.timer.taskId=null}
  S.tasks=S.tasks.filter(t=>!gone.has(t.id));S.tasks.forEach(t=>{if(t.projectId===p.id)t.projectId=null});
  S.projects=S.projects.filter(y=>y.id!==p.id);delete CL.sproj[p.id];delete CL.psent[p.id];
  if(S.ui.project===p.id)S.ui.project='all';if(S.ui.view==='project'&&S.ui.projectPage===p.id)S.ui.view='tasks';
  commit();toast(`You left "${p.name}".`);
}
function projPeopleHTML(p){
  if(!CL.on)return'';
  const m=projMembers(p),ids=m.members,em=m.invited,all=[...ids.map(i=>[i,null]),...em.map(e=>[null,e])];
  const names=all.map(([i,e])=>i?personName(i):e);
  return `<button class="pp-people" type="button" data-pshare title="${ids.length+em.length>1?'Members: '+esc(names.join(', ')):'Add people to this project'}">
    ${ids.length+em.length>1?`<span class="avs">${all.slice(0,5).map(([i,e])=>avHTML(i,e)).join('')}${all.length>5?`<span class="more">+${all.length-5}</span>`:''}</span>`:''}<span class="pp-add">${shareIcon}Add person</span></button>`;
}
/* members popover on the project page */
function openProjSharePop(anchor,p){
  if(!CL.on){openSignIn();return}
  const draw=el=>{
    const m=projMembers(p),mem=m.members,inv=m.invited,owner=m.owner,mine=owner===CL.uid;
    const known=new Set();Object.values(CL.shared).forEach(s=>(s.members||[]).forEach(i=>known.add(i)));Object.values(CL.sproj).forEach(s=>(s.members||[]).forEach(i=>known.add(i)));
    Object.keys(CL.prof).forEach(k=>known.add(k));known.delete(CL.uid);mem.forEach(i=>known.delete(i));
    const q=(el.querySelector('#pm-q')||{}).value||'',ql=q.trim().toLowerCase();
    let cands=[...known].filter(id=>CL.prof[id]&&(!ql||(CL.prof[id].name||'').toLowerCase().includes(ql)||(CL.prof[id].email||'').includes(ql))).slice(0,6).map(id=>({id}));
    if(isEmail(ql)&&!cands.some(c=>CL.prof[c.id]&&CL.prof[c.id].email===ql)&&!inv.includes(ql)){
      const hit=Object.values(CL.prof).find(x=>x&&x.email===ql);
      if(hit){if(!mem.includes(hit.id)&&hit.id!==CL.uid)cands.unshift({id:hit.id})}else cands.unshift({email:ql})}
    // friends come first: all of them with an empty box, the matching ones while typing
    const fr=friendCands(mem,inv).filter(f=>!ql||(f.id?((CL.prof[f.id].name||'').toLowerCase().includes(ql)||(CL.prof[f.id].email||'').includes(ql)):f.email.includes(ql)));
    cands=[...fr,...cands.filter(c=>!fr.some(f=>c.id?f.id===c.id:f.email===c.email))].slice(0,8);
    el.querySelector('.sp-mem').innerHTML=mem.map(id=>`<div class="sp-row">${avHTML(id)}<span class="sp-n">${esc(personName(id))}${id===owner&&mem.length>1?' <em>owner</em>':''}</span>${permHTML(p,id,owner,mine)}${id!==CL.uid&&!isFriend({id})?`<button type="button" class="linkbtn" data-befriend="${esc(id)}">Add friend</button>`:''}${id===CL.uid?(mem.length+inv.length>1?'<button type="button" class="linkbtn" data-leave>Leave</button>':''):mine?`<button type="button" class="linkbtn" data-rm="${esc(id)}">Remove</button>`:''}</div>`).join('')
      +inv.map(e=>`<div class="sp-row">${avHTML(null,e)}<span class="sp-n">${esc(e)} <em>invited</em></span>${mine?`<button type="button" class="linkbtn" data-rme="${esc(e)}">Remove</button>`:''}</div>`).join('');
    el.querySelector('.sp-res').innerHTML=cands.map((c,i)=>`<div class="sp-row">${avHTML(c.id||null,c.email)}<span class="sp-n">${esc(c.id?personName(c.id):c.email)}${c.friend?' <em>friend</em>':''}${c.email?' <em>not signed in yet</em>':''}</span><button type="button" class="btn sm" data-add="${i}">Add</button></div>`).join('')
      ||(ql?`<p class="sp-hint">Type their full email address.</p>`:'');
    el._cands=cands;
  };
  openPop(anchor,`<div class="pop-form share-pop"><strong>People in "${esc(p.name)}"</strong>
    <div class="sp-mem"></div>
    <input type="text" id="pm-q" placeholder="Name or email" autocomplete="off" aria-label="Person's name or email">
    <div class="sp-res"></div>
    <p class="sp-hint">Members see this project in their sidebar with its tasks, Notes and Free canvas. Changes show up for everyone right away.</p></div>`,el=>{
    draw(el);
    let lk;const inp=el.querySelector('#pm-q');
    inp.addEventListener('input',()=>{draw(el);const v=inp.value.trim().toLowerCase();clearTimeout(lk);
      if(isEmail(v))lk=setTimeout(async()=>{const {data}=await CL.sb.from('profiles').select('*').eq('email',v);(data||[]).forEach(x=>CL.prof[x.id]=x);if(pop&&pop.el===el)draw(el)},300)});
    el.addEventListener('click',async e=>{
      const a=e.target.closest('[data-add]');
      if(a){a.disabled=true;await addProjectMember(p,el._cands[+a.dataset.add]);inp.value='';if(pop&&pop.el===el)draw(el);return}
      const bf=e.target.closest('[data-befriend]');if(bf){addFriend({id:bf.dataset.befriend});if(pop&&pop.el===el)draw(el);return}
      const lv=e.target.closest('[data-leave]');
      if(lv){if(!lv.classList.contains('armed')){lv.classList.add('armed');lv.textContent='Click again to leave';return}closePop();await leaveProject(p);return}
      const rm=e.target.closest('[data-rm],[data-rme]');
      if(rm){rm.disabled=true;await removeProjectMember(p,rm.dataset.rm?{id:rm.dataset.rm}:{email:rm.dataset.rme});if(pop&&pop.el===el)draw(el)}
    });
    CL.sb.from('profiles').select('*').then(({data})=>{(data||[]).forEach(x=>CL.prof[x.id]=x);if(pop&&pop.el===el)draw(el)});
  });
}
