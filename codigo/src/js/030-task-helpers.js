/* ---------- task helpers ---------- */
const byId=id=>S.tasks.find(t=>t.id===id);
const tagOf=t=>S.tags.find(g=>g.id===t.tagId);
const projOf=t=>S.projects.find(p=>p.id===t.projectId);
const colorOf=t=>t.color||(tagOf(t)||{}).color||NEUTRAL;
function parentOf(t){if(!t.parentId)return null;const p=byId(t.parentId);return p&&!p.done?p:null}
const kids=p=>S.tasks.filter(t=>!t.done&&t.parentId===p.id);
function rootOf(t){let r=t,g=0;for(;;){const p=parentOf(r);if(!p||g++>100)return r;r=p}}
const isOpenRoot=t=>!t.done&&!parentOf(t);
const inView=t=>S.ui.view==='long'?!!rootOf(t).longTerm:!rootOf(t).longTerm;
function descendants(id){const out=[],st=[id];while(st.length){const x=st.pop();S.tasks.forEach(t=>{if(t.parentId===x){out.push(t);st.push(t.id)}})}return out}
const projMatch=t=>S.ui.project==='all'||t.projectId===S.ui.project;
const matches=t=>(S.ui.view==='project'||S.ui.tag==='all'||t.tagId===S.ui.tag)&&projMatch(t);
let memo=new Map();
function vis(t){
  if(memo.has(t.id))return memo.get(t.id);
  memo.set(t.id,false);
  const r=(S.ui.hideHold&&S.ui.view!=='project'&&t.onHold)?false:(matches(t)||kids(t).some(vis));
  memo.set(t.id,r);return r;
}
function cmp(a,b){
  const d=S.ui.dir;
  switch(S.ui.sort){
    case'created':return d*(a.createdAt<b.createdAt?-1:a.createdAt>b.createdAt?1:0);
    case'due':{if(!a.due&&!b.due)return a.order-b.order;if(!a.due)return 1;if(!b.due)return -1;const ka=a.due+' '+(a.time||'~'),kb=b.due+' '+(b.time||'~');return d*(ka<kb?-1:ka>kb?1:0)||a.order-b.order}
    case'prio':return d*((b.prio||0)-(a.prio||0))||a.order-b.order;
    case'az':return d*a.name.localeCompare(b.name,undefined,{sensitivity:'base',numeric:true});
    default:return a.order-b.order;
  }
}
function siblingsOf(t){
  const p=parentOf(t);
  return S.tasks.filter(x=>!x.done&&(p?x.parentId===p.id:(isOpenRoot(x)&&!!x.longTerm===!!t.longTerm))).sort(cmp);
}
function ensureManual(){
  if(S.ui.sort!=='manual'){S.ui.sort='manual';S.ui.dir=1;toast('Sort switched to Manual so your order sticks.')}
}
function placeRelative(id,targetId,where){
  const t=byId(id),target=byId(targetId),p=parentOf(target);
  const sibs=siblingsOf(target).filter(x=>x.id!==id);
  t.parentId=p?p.id:null;
  t.longTerm=!!rootOf(target).longTerm;
  const i=sibs.indexOf(target);sibs.splice(where==='before'?i:i+1,0,t);
  sibs.forEach((x,k)=>x.order=k);
  ensureManual();
}
function nestInto(id,targetId){
  const t=byId(id),target=byId(targetId);
  const k=kids(target).filter(x=>x.id!==id);
  t.parentId=target.id; t.longTerm=!!rootOf(target).longTerm;
  [t,...descendants(t.id)].forEach(x=>{x.tagId=target.tagId;x.projectId=target.projectId});
  t.order=k.length?Math.max(...k.map(x=>x.order))+1:0;
  target.collapsed=false;
}
function toRootEnd(id){
  const t=byId(id); t.parentId=null; t.longTerm=S.ui.view==='long';
  const r=S.tasks.filter(x=>x.id!==id&&isOpenRoot(x)&&!!x.longTerm===t.longTerm);
  t.order=r.length?Math.max(...r.map(x=>x.order))+1:0;
}
function canDrop(id,targetId){return id!==targetId&&!descendants(id).some(d=>d.id===targetId)}
function moveStep(id,dir){
  const t=byId(id); memo=new Map();
  const sibs=siblingsOf(t).filter(vis),i=sibs.indexOf(t),j=i+dir;
  if(i<0||j<0||j>=sibs.length)return;
  placeRelative(id,sibs[j].id,dir<0?'before':'after'); commit();
}
function complete(t){
  if(stepsLeft(t)>1){doStep(t);return}
  (t.steps||[]).forEach(x=>{if(!x.done){x.done=true;x.last=true}});
  const now=new Date().toISOString();
  t.done=true;t.doneAt=now;t.doneWithParent=null;
  descendants(t.id).forEach(d=>{if(!d.done){d.done=true;d.doneAt=now;d.doneWithParent=t.id}});
  if(t.repeat){const nd=nextDue(t.due||todayISO(),t.repeat);
    const c=T({name:t.name,color:t.color,tagId:t.tagId,projectId:t.projectId,due:nd,note:t.note,parentId:t.parentId,order:t.order,longTerm:t.longTerm,repeat:Object.assign({},t.repeat),prio:t.prio||0,time:t.time||'',remind:t.remind});
    S.tasks.push(c);t.spawnedId=c.id}
}
function reopen(t){
  if(t.stepOf){reopenStep(t);return}
  (t.steps||[]).forEach((x,i)=>{if(x.last){x.done=false;x.last=false;t.stepSel=i}});
  t.done=false;t.doneAt=null;t.doneWithParent=null;t.archived=false;
  if(t.spawnedId){const c=byId(t.spawnedId);if(c&&!c.done)S.tasks=S.tasks.filter(x=>x!==c);t.spawnedId=null}
  S.tasks.forEach(d=>{if(d.doneWithParent===t.id){d.done=false;d.doneAt=null;d.doneWithParent=null;d.archived=false}});
  if(t.parentId){const p=byId(t.parentId);if(!p||p.done)t.parentId=null}
}

