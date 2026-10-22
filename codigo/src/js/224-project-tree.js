/* ---------- project Tree tab: plan the project as a tree of nodes (p.tree [{id,name,parent,taskId,closed}]) ----------
   A node is only a plan until you press "→ Task": then it becomes a real task in the project (shown in the lists) and stays linked.
   A task under a linked node becomes its subtask. "Plan only" takes the task off the lists again and keeps the node. */
const trNodes=p=>(p.tree=p.tree||[]);
const trKids=(p,id)=>trNodes(p).filter(n=>(n.parent||null)===(id||null));
const trTask=n=>n.taskId?byId(n.taskId):null;
function trDesc(p,id){const out=[],st=[id];while(st.length){const x=st.pop();trNodes(p).forEach(n=>{if(n.parent===x){out.push(n);st.push(n.id)}})}return out}
function trAdd(p,parent,after,name){
  const n={id:uid(),name:name||'',parent:parent||null,taskId:null,closed:false},N=trNodes(p);
  const i=after?N.findIndex(x=>x.id===after)+1:N.length;N.splice(i,0,n);
  if(parent){const par=N.find(x=>x.id===parent);if(par)par.closed=false}
  return n;
}
function trMakeTask(p,n){
  const par=n.parent&&trNodes(p).find(x=>x.id===n.parent),pt=par&&trTask(par);
  const roots=S.tasks.filter(x=>isOpenRoot(x)&&!x.longTerm);
  const t=T({name:n.name.trim()||'Untitled',projectId:p.id,order:roots.length?Math.max(...roots.map(x=>x.order))+1:0});
  S.tasks.push(t);if(pt&&!pt.done)nestInto(t.id,pt.id);
  n.taskId=t.id;
  // tasks already made from child nodes hang under this one
  trKids(p,n.id).forEach(k=>{const kt=trTask(k);if(kt&&!kt.done&&!kt.parentId)nestInto(kt.id,t.id)});
  logAct(p,`turned "${t.name}" from the tree into a task`);return t;
}
function trUnlink(p,n){
  const t=trTask(n);if(!t)return;n.name=t.name;
  const snap=JSON.stringify(S.tasks);
  const undos=[t].filter(x=>x.shared).map(leaveShared).filter(Boolean);
  S.tasks.forEach(x=>{if(x.parentId===t.id)x.parentId=null});
  if(S.timer.running&&S.timer.taskId===t.id){logSeg();S.timer.taskId=null}
  S.tasks=S.tasks.filter(x=>x!==t);n.taskId=null;commit();
  toast(`"${n.name}" is back to plan only: it stays in the tree, not in your lists.`,()=>{undos.forEach(u=>u());S.tasks=JSON.parse(snap).map(T);n.taskId=t.id;commit()});
}
function trNodeHTML(p,n){
  const t=trTask(n),ch=trKids(p,n.id),nm=t?t.name:n.name;
  return `<li class="tr-li"><div class="tr-node${t?' is-task':''}${t&&t.done?' done':''}" data-tn="${n.id}" style="--c:${t?colorOf(t):'var(--line-strong)'}">
      ${t?`<label class="mt-check" title="${t.done?'Done':'Mark the task as done'}"><input type="checkbox" data-trcheck${t.done?' checked':''} aria-label="Done"><span></span></label>`:'<span class="tr-dot" title="Plan only: not in your task lists"></span>'}
      <input class="tr-name" type="text" value="${esc(nm)}" placeholder="Name this step" aria-label="Node name">
      ${t?'<span class="tr-badge">Task</span>':''}
      ${ch.length?`<button class="tr-fold" type="button" data-trfold title="${n.closed?'Show':'Hide'} what is under it">${n.closed?`▸ ${trDesc(p,n.id).length}`:'▾'}</button>`:''}
      <span class="tr-tools"><button type="button" data-tradd title="Add a node under this one (Tab)">+</button>${t?'<button type="button" data-trunlink title="Take it off the task lists; it stays here as a plan">Plan only</button>':'<button type="button" data-trtask title="Make it a real task, shown in your lists">→ Task</button>'}<button type="button" class="tr-x" data-trdel title="Delete this node and what is under it (tasks stay)">×</button></span>
    </div>${ch.length&&!n.closed?`<ul class="tr-ul">${ch.map(k=>trNodeHTML(p,k)).join('')}</ul>`:''}</li>`;
}
function renderTreeTab(p,body){
  const N=trNodes(p),linked=new Set(N.map(n=>n.taskId).filter(Boolean)),free=S.tasks.filter(t=>t.projectId===p.id&&!t.done&&!t.stepOf&&!linked.has(t.id));
  const nPlan=N.filter(n=>!trTask(n)).length,nTask=N.length-nPlan;
  body.innerHTML=`<div class="tr-bar"><button class="btn sm" type="button" data-trroot>+ Node</button>
      ${free.length?`<select data-trlink aria-label="Add an existing task to the tree"><option value="">Add an existing task...</option>${free.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>`:''}
      ${N.length?`<span class="cal-hint">${nPlan} plan only · ${nTask} task${nTask===1?'':'s'}</span>`:''}</div>
    ${N.length?`<ul class="tr-ul tr-root">${trKids(p,null).map(n=>trNodeHTML(p,n)).join('')}</ul>`
      :`<div class="empty"><strong>Plan the project as a tree</strong>Add nodes and the steps under them. They stay here as a plan and do not show in your task lists until you press → Task. Enter adds the next node, Tab adds one under it.</div>`}`;
}
const trFocus=id=>setTimeout(()=>{const i=$(`#projBody [data-tn="${id}"] .tr-name`);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0);
const trOf=el=>{const p=curProject(),d=el.closest('[data-tn]');return {p,n:d&&trNodes(p).find(x=>x.id===d.dataset.tn)}};
pp.addEventListener('click',e=>{
  if(!e.target.closest('#projBody .tr-bar,#projBody .tr-root'))return;
  if(e.target.closest('[data-trroot]')){const p=curProject(),n=trAdd(p,null);commit();trFocus(n.id);return}
  const {p,n}=trOf(e.target);if(!n)return;
  if(e.target.closest('[data-tradd]')){const k=trAdd(p,n.id);commit();trFocus(k.id);return}
  if(e.target.closest('[data-trfold]')){n.closed=!n.closed;commit();return}
  if(e.target.closest('[data-trtask]')){const t=trMakeTask(p,n);commit();toast(`"${t.name}" is now a task in your lists.`);return}
  if(e.target.closest('[data-trunlink]')){trUnlink(p,n);return}
  const d=e.target.closest('[data-trdel]');
  if(d){const sub=trDesc(p,n.id);if(sub.length&&!d.classList.contains('armed')){d.classList.add('armed');d.textContent=`Delete ${sub.length+1}?`;return}
    const old=JSON.stringify(p.tree),gone=new Set([n.id,...sub.map(x=>x.id)]);p.tree=p.tree.filter(x=>!gone.has(x.id));commit();
    toast(`Deleted ${gone.size} node${gone.size===1?'':'s'} from the tree. Their tasks stay.`,()=>{p.tree=JSON.parse(old);commit()});return}
});
pp.addEventListener('change',e=>{
  const l=e.target.closest('[data-trlink]');if(l&&l.value){const p=curProject(),t=byId(l.value);const n=trAdd(p,null,null,t.name);n.taskId=t.id;commit();return}
  const c=e.target.closest('[data-trcheck]');if(c){const {n}=trOf(c),t=n&&trTask(n);if(t){if(c.checked)complete(t);else reopen(t);commit()}return}
  const i=e.target.closest('.tr-name');if(i){const {p,n}=trOf(i);if(!n)return;const t=trTask(n),v=i.value.trim();
    if(t){if(v&&v!==t.name){t.name=v;if(typeof syncStep==='function')syncStep(t)}}else n.name=i.value;commit()}
});
pp.addEventListener('input',e=>{const i=e.target.closest('.tr-name');if(!i)return;const {n}=trOf(i);if(n&&!trTask(n)){n.name=i.value;save()}});
pp.addEventListener('keydown',e=>{const i=e.target.closest('.tr-name');if(!i)return;const {p,n}=trOf(i);if(!n)return;
  if(e.key==='Enter'){e.preventDefault();const t=trTask(n);if(t&&i.value.trim())t.name=i.value.trim();else if(!t)n.name=i.value;
    const last=[n,...trDesc(p,n.id)].map(x=>x.id).pop(),k=trAdd(p,n.parent,last);commit();trFocus(k.id)}
  else if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();if(!trTask(n))n.name=i.value;const k=trAdd(p,n.id);commit();trFocus(k.id)}
  else if(e.key==='Backspace'&&!i.value&&!trTask(n)&&!trKids(p,n.id).length){e.preventDefault();const N=trNodes(p),idx=N.indexOf(n);p.tree=N.filter(x=>x!==n);commit();
    const prev=N.slice(0,idx).reverse().find(x=>x.parent===n.parent)||N.find(x=>x.id===n.parent);if(prev)trFocus(prev.id)}
});
// an empty plan node goes away when you leave it
pp.addEventListener('focusout',e=>{const i=e.target.closest('.tr-name');if(!i)return;const {p,n}=trOf(i);
  if(n&&!trTask(n)&&!n.name.trim()&&!trKids(p,n.id).length)setTimeout(()=>{const a=document.activeElement;if(a&&a.closest&&a.closest(`[data-tn="${n.id}"]`))return;p.tree=trNodes(p).filter(x=>x!==n);commit()},0)});
