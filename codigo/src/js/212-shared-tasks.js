/* shared tasks: name, note, due date and done state are shared; tag, order and subtasks stay personal,
   except in a shared project (216-shared-projects.js), where the project and the parent task are shared too */
const sharedBody=t=>{const sp=isSharedProj(t.projectId),par=sp&&t.parentId&&byId(t.parentId);
  return {name:t.name,note:t.note||'',due:t.due||'',done:!!t.done,done_at:t.doneAt||null,project_id:sp?t.projectId:null,parent_id:par&&par.projectId===t.projectId?t.parentId:null,assignee:sp?t.assignee||null:null,doing:sp?!!t.doing:false,section:sp?t.section||'':'',col:sp?t.col||'':'',start:t.start||'',est:t.est||null,micro:t.micro||[],wait_for:t.waitFor||'',wait_who:t.waitWho||'',wait_what:t.waitWhat||'',wait_since:t.waitSince||null,wait_uids:t.waitUids||[],wait_by:t.waitBy||null,wait_done:t.waitDone||[],wait_show:t.waitShow!==false,defer:t.defer||'',glow:t.glow||null,sent_by:t.sentBy||null,sent_to:t.sentTo||[],log:t.log||[],comments:t.projectId?{}:(t.comments||{}),waits:t.waits||[]}};
const rowBody=x=>({name:x.name||'',note:x.note||'',due:x.due||'',done:!!x.done,done_at:x.done_at||null,project_id:x.project_id||null,parent_id:x.parent_id||null,assignee:x.assignee||null,doing:!!x.doing,section:x.section||'',col:x.col||'',start:x.start||'',est:x.est||null,micro:x.micro||[],wait_for:x.wait_for||'',wait_who:x.wait_who||'',wait_what:x.wait_what||'',wait_since:x.wait_since||null,wait_uids:x.wait_uids||[],wait_by:x.wait_by||null,wait_done:x.wait_done||[],wait_show:x.wait_show!==false,defer:x.defer||'',glow:x.glow||null,sent_by:x.sent_by||null,sent_to:x.sent_to||[],log:x.log||[],comments:x.comments||{},waits:x.waits||[]});
function reconcileSoon(){clearTimeout(CL.recT);CL.recT=setTimeout(reconcileShared,400)}
async function reconcileShared(){
  if(!CL.on)return;if(CL.reconciling){CL.recAgain=true;return}CL.reconciling=true;
  try{
    const pch=await reconcileProjects();
    const {data,error}=await CL.sb.from('shared_tasks').select('*');
    if(error)throw error;
    let ch=pch;const seen=new Set(),fresh=[];
    for(const x of data){
      if(CL.leaving.has(x.id))continue;
      x.members=x.members||[];x.invited=x.invited||[];
      if(!x.members.includes(CL.uid)){
        if(!x.invited.includes(CL.email))continue; // a task I passed on: not on my list
        const members=[...x.members,CL.uid],invited=x.invited.filter(e=>e!==CL.email);
        const {error:e2}=await CL.sb.from('shared_tasks').update({members,invited,owner:x.owner||CL.uid}).eq('id',x.id);
        if(e2)continue;x.members=members;x.invited=invited;
      }
      seen.add(x.id);CL.shared[x.id]=x;
      let t=byId(x.id);
      if(!t){const r=S.tasks.filter(isOpenRoot);t=T({id:x.id,createdAt:x.created_at||new Date().toISOString(),order:r.length?Math.min(...r.map(y=>y.order))-1:0});S.tasks.push(t);ch=true;fresh.push(x)}
      const rb=JSON.stringify(rowBody(x));
      if(rb!==CL.sent[x.id]){CL.sent[x.id]=rb;const b=rowBody(x);
        if(JSON.stringify(sharedBody(t))!==rb){t.name=b.name;t.note=b.note;t.due=b.due;t.start=b.start;t.est=b.est;t.micro=b.micro;if(typeof applyWaitSync==='function')applyWaitSync(t,b);t.defer=b.defer;t.glow=b.glow;t.sentBy=b.sent_by;t.sentTo=b.sent_to;t.waits=b.waits||[];if(!t.projectId){const had=new Set(Object.values(t.comments||{}).flat().map(c=>c.id));t.comments=b.comments;
          Object.values(b.comments||{}).flat().filter(c=>c&&!had.has(c.id)&&!c.del&&c.by!==CL.uid&&(c.mentions||[]).includes(CL.uid)).forEach(c=>{const nm=t.name;if(typeof addAlert==='function')addAlert(`${personName(c.by)} mentioned you on "${nm}": ${String(c.text||'').slice(0,80)}`,t.id);setTimeout(()=>toast(`${personName(c.by)} mentioned you on "${nm}".`,()=>openComments(t),'Open'),0)})}{const m=new Map();[...(t.log||[]),...(b.log||[])].forEach(e=>e&&e.id&&m.set(e.id,e));t.log=[...m.values()].sort((p,q)=>p.at.localeCompare(q.at)).slice(-300)}
          if(b.done&&!t.done){t.done=true;t.doneAt=b.done_at||new Date().toISOString()}else if(!b.done&&t.done){t.done=false;t.doneAt=null;t.archived=false}
          if(b.project_id&&S.projects.some(p=>p.id===b.project_id)){if(b.assignee&&b.assignee===CL.uid&&t.assignee!==CL.uid&&x.updated_by!==CL.uid&&typeof addAlert==='function'){const pj=S.projects.find(p=>p.id===b.project_id);addAlert(`${personName(x.updated_by)} assigned "${b.name}" to you${pj?` in "${pj.name}"`:''}.`,t.id)}t.projectId=b.project_id;t.assignee=b.assignee;t.doing=b.doing;t.section=b.section;t.col=b.col;t.parentId=b.parent_id&&byId(b.parent_id)?b.parent_id:null}
          else if(!b.project_id&&isSharedProj(t.projectId)){t.projectId=null;t.parentId=null}
          ch=true}}
      const meta=JSON.stringify([x.members,x.invited,x.owner,x.passed_by]);
      if(!t.shared||JSON.stringify([t.members,t.invited,t.owner,t.passedBy])!==meta){t.shared=true;t.members=x.members;t.invited=x.invited;t.owner=x.owner;t.passedBy=x.passed_by;ch=true}
    }
    // a subtask can arrive before its parent task
    data.forEach(x=>{const t=seen.has(x.id)&&byId(x.id);if(t&&x.parent_id&&t.parentId!==x.parent_id&&byId(x.parent_id)&&t.projectId===x.project_id){t.parentId=x.parent_id;ch=true}});
    S.tasks.filter(t=>t.shared&&!seen.has(t.id)&&!CL.busy.has(t.id)).forEach(t=>{
      S.tasks=S.tasks.filter(y=>y!==t);delete CL.shared[t.id];delete CL.sent[t.id];ch=true;
      if(S.timer.taskId===t.id){if(S.timer.running)logSeg();S.timer.running=false;S.timer.taskId=null}
      const sp=isSharedProj(t.projectId)&&S.projects.find(p=>p.id===t.projectId);
      toast(sp?`"${t.name}" was deleted from "${sp.name}".`:`"${t.name}" is no longer shared with you.`)});
    const prch=await ensureProfiles();
    if(ch)commit();else if(prch)render();
    fresh.forEach(x=>{const by=x.sent_by&&x.sent_by!==CL.uid?x.sent_by:x.passed_by&&x.passed_by!==CL.uid?x.passed_by:x.updated_by!==CL.uid?x.updated_by:null;
      if(typeof addAlert!=='function'||x.owner===CL.uid)return;
      if((x.wait_uids||[]).includes(CL.uid)&&x.wait_show!==false)addAlert(`${personName(x.wait_by||by)} is waiting for you on "${x.name}"${x.wait_what?` (${x.wait_what})`:''}.`,x.id);
      else addAlert(x.sent_by&&x.sent_by!==CL.uid?`${personName(x.sent_by)} sent you "${x.name}".`:`${by?personName(by):'Someone'} shared "${x.name}" with you.`,x.id)});
    {const i=fresh.findIndex(x=>x.owner===CL.uid);while(i>-1&&fresh.some(x=>x.owner===CL.uid))fresh.splice(fresh.findIndex(x=>x.owner===CL.uid),1)}
    if(fresh.length){const x=fresh[0],by=x.passed_by&&x.passed_by!==CL.uid?x.passed_by:(x.updated_by!==CL.uid?x.updated_by:null);
      toast(fresh.length>1?`${fresh.length} tasks were shared with you.`:x.sent_by&&x.sent_by!==CL.uid?`${personName(x.sent_by)} sent you "${x.name}".`:`${by?personName(by):'Someone'} ${x.passed_by===by&&by?'passed you':'shared'} "${x.name}"${x.passed_by===by&&by?'':' with you'}.`)}
  }catch(e){setSync('err',e.message||String(e))}
  CL.reconciling=false;if(CL.recAgain){CL.recAgain=false;reconcileShared()}
}
async function pushShared(){
  if(!CL.on)return;
  for(const t of S.tasks){
    if(!t.shared||!CL.shared[t.id]||CL.busy.has(t.id))continue;
    const b=sharedBody(t),js=JSON.stringify(b);if(js===CL.sent[t.id])continue;CL.sent[t.id]=js;
    const {error}=await CL.sb.from('shared_tasks').update(Object.assign({},b,{updated_by:CL.uid,updated_at:new Date().toISOString()})).eq('id',t.id);
    if(error){setSync('err',error.message);CL.sent[t.id]=null}
  }
}
async function ensureProfiles(extra){
  if(!CL.on)return;
  const ids=new Set(extra||[]);S.tasks.forEach(t=>{if(t.shared){(t.members||[]).forEach(m=>ids.add(m));if(t.passedBy)ids.add(t.passedBy)}});
  Object.values(CL.sproj).forEach(x=>(x.members||[]).forEach(m=>ids.add(m)));
  const missing=[...ids].filter(i=>i&&!CL.prof[i]);if(!missing.length)return false;
  const {data}=await CL.sb.from('profiles').select('*').in('id',missing);
  missing.forEach(i=>CL.prof[i]=CL.prof[i]||null);(data||[]).forEach(p=>CL.prof[p.id]=p);
  missing.forEach(i=>{if(CL.prof[i]===null)delete CL.prof[i]});
  return true;
}
async function writeShared(t,row,isNew){
  CL.busy.add(t.id);
  const q=isNew?CL.sb.from('shared_tasks').insert(row):CL.sb.from('shared_tasks').update(row).eq('id',t.id);
  const {error}=await q;CL.busy.delete(t.id);
  if(error){toast('Could not share: '+error.message);return false}
  return true;
}
async function shareTask(t,person,mode){
  const x=CL.shared[t.id],prev=x?{members:[...x.members],invited:[...x.invited],owner:x.owner,passed_by:x.passed_by}:null;
  let members=x?[...x.members]:[CL.uid],invited=x?[...x.invited]:[],owner=x?x.owner:CL.uid,passed=x?x.passed_by:null;
  if(person.id){if(!members.includes(person.id))members.push(person.id)}else if(!invited.includes(person.email))invited.push(person.email);
  if(mode==='pass'){members=members.filter(m=>m!==CL.uid);passed=CL.uid;owner=person.id||null}
  const row=Object.assign(sharedBody(t),{owner,members,invited,passed_by:passed,updated_by:CL.uid,updated_at:new Date().toISOString()});
  if(!x)Object.assign(row,{id:t.id,created_at:t.createdAt});
  if(!await writeShared(t,row,!x))return;
  const who=person.id?personName(person.id):person.email;
  if(mode==='pass'){
    const copy=JSON.parse(JSON.stringify(t));
    if(S.timer.taskId===t.id){if(S.timer.running)logSeg();S.timer.running=false;S.timer.taskId=null}
    S.tasks=S.tasks.filter(y=>y!==t);delete CL.shared[t.id];delete CL.sent[t.id];commit();
    toast(`Passed "${t.name}" to ${who}.`,async()=>{
      CL.busy.add(copy.id);
      const {error}=prev?await CL.sb.from('shared_tasks').update(Object.assign({},prev,{updated_by:CL.uid})).eq('id',copy.id):await CL.sb.from('shared_tasks').delete().eq('id',copy.id);
      CL.busy.delete(copy.id);
      if(error){toast('Could not undo: '+error.message);return}
      const back=T(copy);if(prev){back.members=prev.members;back.invited=prev.invited;back.owner=prev.owner;back.passedBy=prev.passed_by}else{back.shared=false;back.members=[];back.invited=[]}
      S.tasks.push(back);if(prev)CL.shared[back.id]=Object.assign({},prev,{id:back.id});commit();reconcileShared()});
  }else{
    CL.shared[t.id]=Object.assign({},x||{},row,{id:t.id});CL.sent[t.id]=JSON.stringify(sharedBody(t));
    t.shared=true;t.members=members;t.invited=invited;t.owner=owner;t.passedBy=passed;commit();
    toast(person.id?`Shared "${t.name}" with ${who}.`:`Shared "${t.name}" with ${who}. They will see it after they sign in.`);
  }
}
async function unshareWith(t,person){
  const x=CL.shared[t.id];if(!x)return;
  const members=x.members.filter(m=>m!==person.id),invited=x.invited.filter(e=>e!==person.email);
  if(!await writeShared(t,{members,invited,updated_by:CL.uid},false))return;
  x.members=members;x.invited=invited;t.members=members;t.invited=invited;
  if(members.length<=1&&!invited.length&&members[0]===CL.uid){await CL.sb.from('shared_tasks').delete().eq('id',t.id);delete CL.shared[t.id];delete CL.sent[t.id];t.shared=false}
  commit();
}
// deleting a shared task removes it from your list only; it is left after the Undo window closes.
// in a shared project it is deleted for every member
function leaveShared(t){
  const x=CL.shared[t.id];if(!x)return;CL.leaving.add(t.id);const inProj=isSharedProj(t.projectId);
  const timer=setTimeout(async()=>{
    const members=x.members.filter(m=>m!==CL.uid);
    const {error}=!inProj&&(members.length||x.invited.length)?await CL.sb.from('shared_tasks').update({members,updated_by:CL.uid}).eq('id',t.id):await CL.sb.from('shared_tasks').delete().eq('id',t.id);
    CL.leaving.delete(t.id);if(!error){delete CL.shared[t.id];delete CL.sent[t.id]}
  },5200);
  return()=>{clearTimeout(timer);CL.leaving.delete(t.id)};
}

/* share popover */
function openSharePop(anchor,t){
  if(!CL.on){openSignIn();return}
  const draw=el=>{
    const x=CL.shared[t.id],mem=x?x.members:[CL.uid],inv=x?x.invited:[];
    const known=new Set();Object.values(CL.shared).forEach(s=>(s.members||[]).forEach(m=>known.add(m)));
    Object.keys(CL.prof).forEach(k=>known.add(k));known.delete(CL.uid);mem.forEach(m=>known.delete(m));
    const q=(el.querySelector('#sp-q')||{}).value||'',ql=q.trim().toLowerCase();
    const cands=[...known].filter(id=>CL.prof[id]&&(!ql||(CL.prof[id].name||'').toLowerCase().includes(ql)||(CL.prof[id].email||'').includes(ql))).slice(0,6).map(id=>({id}));
    if(isEmail(ql)&&!cands.some(c=>CL.prof[c.id]&&CL.prof[c.id].email===ql)&&!inv.includes(ql)){
      const hit=Object.values(CL.prof).find(p=>p&&p.email===ql);
      if(hit){if(!mem.includes(hit.id)&&hit.id!==CL.uid)cands.unshift({id:hit.id})}else cands.unshift({email:ql})}
    el.querySelector('.sp-mem').innerHTML=mem.map(id=>`<div class="sp-row">${avHTML(id)}<span class="sp-n">${esc(personName(id))}${id===x?.owner&&mem.length>1?' <em>owner</em>':''}</span>${id!==CL.uid?`<button type="button" class="linkbtn" data-rm="${esc(id)}">Remove</button>`:''}</div>`).join('')
      +inv.map(e=>`<div class="sp-row">${avHTML(null,e)}<span class="sp-n">${esc(e)} <em>invited</em></span><button type="button" class="linkbtn" data-rme="${esc(e)}">Remove</button></div>`).join('');
    el.querySelector('.sp-res').innerHTML=cands.map((c,i)=>`<div class="sp-row">${avHTML(c.id||null,c.email)}<span class="sp-n">${esc(c.id?personName(c.id):c.email)}${c.email?' <em>not signed in yet</em>':''}</span><button type="button" class="btn sm" data-sh="${i}">Share</button><button type="button" class="btn sm" data-pass="${i}" title="Hand the task over: it leaves your list and goes to theirs">Pass</button></div>`).join('')
      ||(ql?`<p class="sp-hint">Type their full email address.</p>`:'');
    el._cands=cands;
  };
  openPop(anchor,`<div class="pop-form share-pop"><strong>Share "${esc(t.name)}"</strong>
    <div class="sp-mem"></div>
    <input type="text" id="sp-q" placeholder="Name or email" autocomplete="off" aria-label="Person's name or email">
    <div class="sp-res"></div>
    <p class="sp-hint"><b>Share</b>: you both see it, and edits and done sync. <b>Pass</b>: it moves to their list and leaves yours.</p></div>`,el=>{
    draw(el);
    let lk;const inp=el.querySelector('#sp-q');
    inp.addEventListener('input',()=>{draw(el);const v=inp.value.trim().toLowerCase();clearTimeout(lk);
      if(isEmail(v))lk=setTimeout(async()=>{const {data}=await CL.sb.from('profiles').select('*').eq('email',v);(data||[]).forEach(p=>CL.prof[p.id]=p);if(pop&&pop.el===el)draw(el)},300)});
    el.addEventListener('click',async e=>{
      const sh=e.target.closest('[data-sh],[data-pass]');
      if(sh){const pass=sh.hasAttribute('data-pass'),c=el._cands[+(pass?sh.dataset.pass:sh.dataset.sh)];
        if(pass&&!sh.classList.contains('armed')){sh.classList.add('armed');sh.textContent='Confirm';return}
        sh.disabled=true;await shareTask(t,c,pass?'pass':'share');if(pass)closePop();else{inp.value='';draw(el)}return}
      const rm=e.target.closest('[data-rm],[data-rme]');
      if(rm){rm.disabled=true;await unshareWith(t,rm.dataset.rm?{id:rm.dataset.rm}:{email:rm.dataset.rme});if(pop&&pop.el===el)draw(el)}
    });
    CL.sb.from('profiles').select('*').then(({data})=>{(data||[]).forEach(p=>CL.prof[p.id]=p);if(pop&&pop.el===el)draw(el)});
  });
}

