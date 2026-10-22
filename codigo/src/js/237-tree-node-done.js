/* ---------- Tree tab: a plan node can be ticked done too (`n.done`, `n.doneAt`, synced with p.tree); its round dot becomes a check box.
   Done nodes (plan and task) STAY in the tree (Pedro, v66: the old "Show done" hiding of 226 is switched off here) until "Off tree" takes them out:
   their children move up to their parent; a done plan node goes to `p.treeDone` [{id,name,comment,doneAt,path}] (synced in projExtra), a done task stays in Done.
   The Done tab gets a section "Done in project trees" with the done plan nodes of every project (in the tree or taken off). → Task clears done. ---------- */
const trPlanDone=n=>!!(n&&!trTask(n)&&n.done);
const trIsDone=n=>trPlanDone(n)||trDoneNode(n);
const trDoneList=p=>(p.treeDone=p.treeDone||[]);
function trPath(p,n){const N=trNodes(p),out=[];let x=n&&N.find(y=>y.id===n.parent);while(x&&out.length<20){const t=trTask(x);out.unshift((t?t.name:x.name)||'Untitled');x=N.find(y=>y.id===x.parent)}return out.join(' › ')}
{const _nh=trNodeHTML;trNodeHTML=function(p,n){let h=_nh(p,n);
  if(!trTask(n)){
    h=h.replace('<span class="tr-dot" title="Plan only: not in your task lists"></span>',`<label class="mt-check tr-pcheck" title="${n.done?'Done (click to reopen)':'Mark this step as done'}"><input type="checkbox" data-trpdone${n.done?' checked':''} aria-label="Done"><span></span></label>`);
    if(n.done)h=h.replace('class="tr-node','class="tr-node done')}
  if(trIsDone(n))h=h.replace('<span class="tr-tools">','<span class="tr-tools"><button type="button" data-troff title="Take it off the tree (what is under it moves up)">Off tree</button>');
  return h}}
{const _rt=renderTreeTab;renderTreeTab=function(p,body){const was=S.ui.trDone;S.ui.trDone=true;try{_rt(p,body)}finally{S.ui.trDone=was}
  const lab=body.querySelector('.gd-done');if(lab)lab.remove()}}
{const _mt=trMakeTask;trMakeTask=function(p,n){delete n.done;delete n.doneAt;return _mt.apply(this,arguments)}}
function trTakeOff(p,n){
  const N=trNodes(p),old=JSON.stringify(N),oldD=JSON.stringify(trDoneList(p)),t=trTask(n);
  if(!t)trDoneList(p).unshift({id:n.id,name:n.name||'Untitled',comment:n.comment||'',doneAt:n.doneAt||new Date().toISOString(),path:trPath(p,n)});
  N.forEach(x=>{if(x.parent===n.id)x.parent=n.parent||null});p.tree=N.filter(x=>x!==n);commit();
  toast(`"${t?t.name:n.name||'Untitled'}" is off the tree.${t?'':' It stays in Done.'}`,()=>{p.tree=JSON.parse(old);p.treeDone=JSON.parse(oldD);commit()});
}
pp.addEventListener('click',e=>{const b=e.target.closest('#projBody [data-troff]');if(!b)return;const {p,n}=trOf(b);if(n)trTakeOff(p,n)});
pp.addEventListener('change',e=>{const c=e.target.closest('[data-trpdone]');if(!c)return;const {p,n}=trOf(c);if(!n)return;
  if(c.checked){n.done=true;n.doneAt=new Date().toISOString();logAct(p,`finished "${n.name||'Untitled'}" in the tree`)}else{delete n.done;delete n.doneAt}commit()});
/* Done tab: done plan nodes, by project */
function trDoneRows(){const out=[];S.projects.forEach(p=>{if(S.ui.project!=='all'&&S.ui.project!==p.id)return;
  trNodes(p).filter(trPlanDone).forEach(n=>out.push({p,id:n.id,name:n.name||'Untitled',comment:n.comment||'',doneAt:n.doneAt||'',path:trPath(p,n),inTree:true}));
  trDoneList(p).forEach(d=>out.push(Object.assign({p,inTree:false},d)))});
  return out.sort((a,b)=>a.doneAt<b.doneAt?1:-1)}
{const _r=render;render=function(){_r.apply(this,arguments);
  if(S.ui.view!=='done'||S.ui.showArchived)return;const list=$('#list'),R=trDoneRows();if(!list||!R.length)return;
  const e=list.querySelector(':scope>.empty');if(e)e.remove();
  list.insertAdjacentHTML('beforeend',`<section class="tnd-sec" aria-label="Done in project trees"><div class="listdiv">Done in project trees<span class="n">${R.length}</span></div>
    ${R.map(r=>`<div class="tnd-row" data-tndp="${r.p.id}" data-tndn="${r.id}" style="--c:${r.p.color||'var(--accent)'}">
      <label class="mt-check tnd-check" title="Reopen it in the tree"><input type="checkbox" checked data-tndopen aria-label="Done"><span></span></label>
      <div class="tnd-body"><div class="tnd-name">${esc(r.name)}</div>
        <div class="meta"><span class="chip" style="--dot:${r.p.color||'var(--accent)'}"><i></i>${esc(r.p.name)}</span><span>Tree node${r.path?` under ${esc(r.path)}`:''}</span>${r.doneAt?`<span class="fin">Completed: <span class="d">${tsToUS(r.doneAt)}</span></span>`:''}${r.inTree?'':'<span class="tnd-off">Off the tree</span>'}</div>
        ${r.comment?`<div class="tnd-cmt">${esc(r.comment)}</div>`:''}</div>
      <div class="tnd-acts"><button class="btn sm" type="button" data-tndgo>Open tree</button>${r.inTree?'':'<button class="x" type="button" data-tnddel title="Delete for good" aria-label="Delete">×</button>'}</div>
    </div>`).join('')}</section>`)}}
const tndOf=el=>{const r=el.closest('[data-tndn]'),p=r&&S.projects.find(x=>x.id===r.dataset.tndp);return {p,id:r&&r.dataset.tndn}};
document.addEventListener('click',e=>{const b=e.target.closest('.tnd-row [data-tndgo],.tnd-row [data-tnddel]');if(!b)return;const {p,id}=tndOf(b);if(!p)return;
  if(b.matches('[data-tndgo]')){S.ui.projTab='tree';openProject(p.id);return}
  const old=JSON.stringify(trDoneList(p)),d=trDoneList(p).find(x=>x.id===id);p.treeDone=trDoneList(p).filter(x=>x.id!==id);commit();
  toast(`Deleted "${d?d.name:'node'}".`,()=>{p.treeDone=JSON.parse(old);commit()})});
document.addEventListener('change',e=>{const c=e.target.closest('.tnd-row [data-tndopen]');if(!c||c.checked)return;const {p,id}=tndOf(c);if(!p)return;
  const n=trNodes(p).find(x=>x.id===id);
  if(n){delete n.done;delete n.doneAt}
  else{const d=trDoneList(p).find(x=>x.id===id);if(!d)return;p.treeDone=trDoneList(p).filter(x=>x!==d);trNodes(p).push({id:d.id,name:d.name,parent:null,taskId:null,closed:false,comment:d.comment||undefined})}
  commit();toast('Back in the tree as an open step.')});
