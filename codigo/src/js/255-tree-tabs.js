/* ---------- Tree tabs (v87, Pedro): a project can have several trees, as tabs at the top of the Tree tab ----------
   `p.treeTabs` [{id,name}] in order and `p.treeCur` = the open one (both synced in projExtra). The OPEN tree always lives in
   p.tree / p.treeMarks, so every other Tree feature works unchanged; the closed ones keep theirs inside their entry
   ({id,name,tree,treeMarks}) and `ttSwitch` swaps them. No treeTabs = one tree, shown as "Tree 1".
   Tabs: "+ Tree" adds one, the pencil on the open tab renames / moves / deletes it (tasks stay), drag a tab to reorder.
   Templates keep every tree (`tpl.treeTabs`), Import from Main copies each tree of Main into the tab of the same name,
   the Done tab lists done steps of every tree and "Open tree" opens the right one. ---------- */
const ttHas=p=>!!(p&&p.treeTabs&&p.treeTabs.length);
function ttEnsure(p){if(!ttHas(p)){p.treeTabs=[{id:uid(),name:'Tree 1'}];p.treeCur=p.treeTabs[0].id}return p.treeTabs}
const ttCurId=p=>ttHas(p)?(p.treeTabs.some(x=>x.id===p.treeCur)?p.treeCur:p.treeTabs[0].id):null;
const ttTab=(p,id)=>ttHas(p)?p.treeTabs.find(x=>x.id===id):null;
function ttSwitch(p,id){const cur=ttCurId(p);if(!cur||id===cur||!ttTab(p,id))return;
  const a=ttTab(p,cur),b=ttTab(p,id);a.tree=p.tree||[];a.treeMarks=p.treeMarks||[];
  p.tree=b.tree||[];p.treeMarks=b.treeMarks||[];delete b.tree;delete b.treeMarks;p.treeCur=id}
// run fn with tree `id` open, then put the open one back
function withTree(p,id,fn){const was=ttCurId(p);ttSwitch(p,id);try{return fn()}finally{ttSwitch(p,was)}}
// every tree of a project: [{tab,tree,marks,cur}]
const ttAll=p=>ttHas(p)?p.treeTabs.map(t=>{const cur=t.id===ttCurId(p);return{tab:t,cur,tree:cur?p.tree||[]:t.tree||[],marks:cur?p.treeMarks||[]:t.treeMarks||[]}}):[{tab:{id:null,name:'Tree 1'},cur:true,tree:p.tree||[],marks:p.treeMarks||[]}];
const ttPlain=t=>({id:t.id,name:t.name});

{const _e=projExtra;projExtra=function(o){return Object.assign(_e.apply(this,arguments),{treeTabs:(o.treeTabs||[]).map(t=>Object.assign({},t)),treeCur:o.treeCur||null})}}

function ttStripHTML(p){const T=ttHas(p)?p.treeTabs:[{id:'',name:'Tree 1'}],cur=ttCurId(p)||'';
  const cnt=t=>{const a=ttAll(p).find(x=>(x.tab.id||'')===t.id);return a?a.tree.length:0};
  return `<div class="ttabs" role="tablist" aria-label="Trees of ${esc(p.name)}">${T.map(t=>`<button class="ttab${t.id===cur?' on':''}" type="button" role="tab" aria-selected="${t.id===cur}" data-ttab="${t.id}"${T.length>1?' draggable="true" title="Drag to reorder"':''}>${esc(t.name||'Untitled')}${cnt(t)?` <span class="n">${cnt(t)}</span>`:''}${t.id===cur?`<span class="ttab-ed" data-tted role="button" tabindex="0" title="Rename, move or delete this tree" aria-label="Edit tree">${icons.pencil}</span>`:''}</button>`).join('')}<button class="ttab-add" type="button" data-ttadd title="Add another tree to this project">+ Tree</button></div>`}

{const _rt=renderTreeTab;renderTreeTab=function(p,body){_rt.apply(this,arguments);
  body.insertAdjacentHTML('afterbegin',ttStripHTML(p));
  // a task already in another tree can't be added here too
  const other=new Set();ttAll(p).filter(x=>!x.cur).forEach(x=>x.tree.forEach(n=>n.taskId&&other.add(n.taskId)));
  const sel=body.querySelector('[data-trlink]');if(sel&&other.size){sel.querySelectorAll('option').forEach(o=>{if(other.has(o.value))o.remove()});if(sel.options.length<2)sel.remove()}
  // Import from Main also when only another tree of Main has nodes
  const r=tabRoot(p),bar=body.querySelector('.tr-bar');
  if(r&&bar&&!bar.querySelector('[data-pximport]')&&ttAll(r).some(x=>x.tree.length))bar.insertAdjacentHTML('beforeend',`<button class="btn sm" type="button" data-pximport title="Copy the trees of ${esc(r.name)} (Main) into this tab">Import from Main</button>`)}}

function ttAdd(p,name){ttEnsure(p);const t={id:uid(),name,tree:[],treeMarks:[]};p.treeTabs.push(t);ttSwitch(p,t.id);return t}
function ttDelete(p,id){const i=p.treeTabs.findIndex(x=>x.id===id);if(i<0||p.treeTabs.length<2)return;
  const name=p.treeTabs[i].name;if(ttCurId(p)===id)ttSwitch(p,(p.treeTabs[i+1]||p.treeTabs[i-1]).id);
  p.treeTabs.splice(i,1);logAct(p,`deleted the tree "${name}"`)}
function ttMove(p,id,to){const L=p.treeTabs,i=L.findIndex(x=>x.id===id);if(i<0)return;const [t]=L.splice(i,1);L.splice(Math.max(0,Math.min(L.length,to)),0,t)}
const ttSnap=p=>JSON.stringify({treeTabs:p.treeTabs||null,treeCur:p.treeCur||null,tree:p.tree||[],treeMarks:p.treeMarks||[]});
const ttRestore=(p,s)=>{const o=JSON.parse(s);p.treeTabs=o.treeTabs||undefined;p.treeCur=o.treeCur||undefined;p.tree=o.tree;p.treeMarks=o.treeMarks};

function openTtAddPop(anchor,p){const n=(ttHas(p)?p.treeTabs.length:1)+1;
  openPop(anchor,`<form class="pop-form tt-pop"><strong>New tree in ${esc(p.name)}</strong>
    <input type="text" id="tt-name" placeholder="Tree ${n}" maxlength="60" aria-label="Tree name">
    <p class="sp-hint">Each tree has its own nodes and guides. Tasks made from any tree show in your lists as usual.</p>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Add</button></div></form>`,el=>{
    const i=el.querySelector('#tt-name');el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const t=ttAdd(p,i.value.trim()||`Tree ${n}`);logAct(p,`added the tree "${t.name}"`);closePop();commit();toast(`Added the tree "${t.name}".`)}})}
function openTtEditPop(anchor,p){ttEnsure(p);const id=ttCurId(p),t=ttTab(p,id),i0=p.treeTabs.indexOf(t),many=p.treeTabs.length>1;let armed=false;
  openPop(anchor,`<form class="pop-form tt-pop"><strong>Tree</strong>
    <input type="text" id="tt-name" value="${esc(t.name)}" maxlength="60" aria-label="Tree name">
    ${many?`<div class="tt-move"><span>Move</span><button type="button" class="btn sm" data-ttl${i0===0?' disabled':''} aria-label="Move left">◀</button><button type="button" class="btn sm" data-ttr${i0===p.treeTabs.length-1?' disabled':''} aria-label="Move right">▶</button></div>`:''}
    <div class="pop-actions">${many?'<button type="button" class="danger-link" data-del>Delete tree</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    const i=el.querySelector('#tt-name');i.select();el.querySelector('[data-x]').onclick=closePop;
    const mv=d=>{ttMove(p,id,p.treeTabs.indexOf(t)+d);closePop();commit()};
    const l=el.querySelector('[data-ttl]'),r=el.querySelector('[data-ttr]');if(l)l.onclick=()=>mv(-1);if(r)r.onclick=()=>mv(1);
    const del=el.querySelector('[data-del]');if(del)del.onclick=()=>{
      if(!armed){armed=true;del.textContent=(p.tree||[]).length?`Click again (${p.tree.length} node${p.tree.length===1?'':'s'}, tasks stay)`:'Click again to delete';return}
      const s=ttSnap(p);ttDelete(p,id);closePop();commit();toast(`Deleted the tree "${t.name}". Its tasks stay.`,()=>{ttRestore(p,s);commit()})};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(!v){i.classList.add('invalid');return}t.name=v;closePop();commit()}})}

pp.addEventListener('click',e=>{if(!e.target.closest('#projBody .ttabs'))return;const p=curProject();if(!p)return;
  const ed=e.target.closest('[data-tted]');if(ed){e.stopPropagation();openTtEditPop(ed,p);return}
  const a=e.target.closest('[data-ttadd]');if(a){openTtAddPop(a,p);return}
  const b=e.target.closest('[data-ttab]');if(b&&b.dataset.ttab&&b.dataset.ttab!==ttCurId(p)){ttSwitch(p,b.dataset.ttab);commit()}});
pp.addEventListener('keydown',e=>{const ed=e.target.closest&&e.target.closest('#projBody [data-tted]');if(ed&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();const p=curProject();if(p)openTtEditPop(ed,p)}});
// drag a tab onto another to reorder
let ttDrag=null;
pp.addEventListener('dragstart',e=>{const b=e.target.closest&&e.target.closest('#projBody .ttab[draggable]');if(!b)return;ttDrag=b.dataset.ttab;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',ttDrag)}catch(_){}b.classList.add('dragging')});
pp.addEventListener('dragover',e=>{if(!ttDrag)return;const b=e.target.closest&&e.target.closest('#projBody .ttab');if(!b)return;e.preventDefault();
  document.querySelectorAll('.ttab.drop-l,.ttab.drop-r').forEach(x=>x.classList.remove('drop-l','drop-r'));const r=b.getBoundingClientRect();b.classList.add(e.clientX<r.left+r.width/2?'drop-l':'drop-r')});
pp.addEventListener('drop',e=>{if(!ttDrag)return;const b=e.target.closest&&e.target.closest('#projBody .ttab'),p=curProject();e.preventDefault();
  if(b&&p&&ttHas(p)&&b.dataset.ttab!==ttDrag){const r=b.getBoundingClientRect(),after=e.clientX>=r.left+r.width/2,t=ttTab(p,ttDrag);
    p.treeTabs.splice(p.treeTabs.indexOf(t),1);p.treeTabs.splice(p.treeTabs.findIndex(x=>x.id===b.dataset.ttab)+(after?1:0),0,t);ttDrag=null;commit();return}
  ttDrag=null});
pp.addEventListener('dragend',()=>{ttDrag=null;document.querySelectorAll('.ttab.dragging,.ttab.drop-l,.ttab.drop-r').forEach(x=>x.classList.remove('dragging','drop-l','drop-r'))});

// templates keep every tree
const ttNodeTpl=(n,ids)=>{const t=n.taskId&&byId(n.taskId);return{id:n.id,parent:n.parent||null,name:t?t.name:n.name,taskId:ids.has(n.taskId)?n.taskId:null,comment:n.comment||'',closed:!!n.closed,color:n.color||''}};
{const _s=saveTemplate;saveTemplate=function(p){const tpl=_s.apply(this,arguments);if(!ttHas(p)||p.treeTabs.length<2)return tpl;const ids=new Set(tpl.tasks.map(x=>x.id));
  tpl.treeTabs=ttAll(p).map(x=>({name:x.tab.name,cur:x.cur,tree:x.tree.map(n=>ttNodeTpl(n,ids)),treeMarks:x.marks.map(m=>Object.assign({},m))}));return tpl}}
{const _a=applyTemplate;applyTemplate=function(p,tpl){const n0=S.tasks.length,fresh=!ttHas(p)&&!(p.tree||[]).length;_a.apply(this,arguments);
  if(!tpl.treeTabs||tpl.treeTabs.length<2)return;
  const tid=new Map();(tpl.tasks||[]).forEach((x,i)=>{const t=S.tasks[n0+i];if(t)tid.set(x.id,t.id)});
  const copy=x=>{const nid=new Map();x.tree.forEach(n=>nid.set(n.id,uid()));
    return{tree:x.tree.map(n=>({id:nid.get(n.id),name:n.name,parent:n.parent?nid.get(n.parent)||null:null,taskId:tid.get(n.taskId)||null,closed:n.closed,comment:n.comment||'',color:n.color||''})),
      treeMarks:(x.treeMarks||[]).filter(m=>nid.has(m.from)).map(m=>Object.assign({},m,{id:uid(),from:nid.get(m.from),to:nid.get(m.to)||nid.get(m.from)}))}};
  // the tree 238 already put in the open tree is the template's open one; the others come as tabs
  if(fresh){p.treeTabs=tpl.treeTabs.map(x=>x.cur?{id:uid(),name:x.name}:Object.assign({id:uid(),name:x.name},copy(x)));p.treeCur=p.treeTabs[tpl.treeTabs.findIndex(x=>x.cur)].id}
  else{ttEnsure(p);tpl.treeTabs.filter(x=>!x.cur).forEach(x=>p.treeTabs.push(Object.assign({id:uid(),name:x.name},copy(x))))}}}

// Import from Main: each tree of Main goes into the tree with the same name (made if missing; the first one fills an empty open tree)
{const _i=importMainTree;importMainTree=function(p){const r=tabRoot(p);if(!r||!ttHas(r)||r.treeTabs.length<2)return _i.apply(this,arguments);
  let total=0;r.treeTabs.slice().forEach((mt,k)=>{const same=ttHas(p)&&p.treeTabs.find(x=>x.name===mt.name);let tgt=same;
    if(!tgt&&k===0&&!(p.tree||[]).length){ttEnsure(p);tgt=ttTab(p,ttCurId(p));tgt.name=mt.name}
    if(!tgt){ttEnsure(p);tgt={id:uid(),name:mt.name,tree:[],treeMarks:[]};p.treeTabs.push(tgt)}
    withTree(r,mt.id,()=>withTree(p,tgt.id,()=>{total+=_i(p)}))});
  return total}}
// Reopen and reset unticks the steps of every tree
{const _r=resetChecks;resetChecks=function(p,all){let n=_r.apply(this,arguments);
  if(all&&ttHas(p))ttAll(p).filter(x=>!x.cur).forEach(x=>x.tree.forEach(nd=>{if(nd.done){delete nd.done;delete nd.doneAt;n++}}));return n}}

// Done tab: done steps of every tree, with the tree's name when there are several
function ttPath(N,n){const out=[];let x=N.find(y=>y.id===n.parent);while(x&&out.length<20){const t=trTask(x);out.unshift((t?t.name:x.name)||'Untitled');x=N.find(y=>y.id===x.parent)}return out.join(' › ')}
{const _d=trDoneRows;trDoneRows=function(){const R=_d.apply(this,arguments);
  S.projects.forEach(p=>{if(!ttHas(p)||p.treeTabs.length<2)return;if(S.ui.project!=='all'&&S.ui.project!==p.id)return;
    const curName=ttTab(p,ttCurId(p)).name;R.forEach(r=>{if(r.p===p&&r.inTree)r.path=curName+(r.path?' › '+r.path:'')});
    ttAll(p).filter(x=>!x.cur).forEach(x=>x.tree.filter(trPlanDone).forEach(n=>{const pa=ttPath(x.tree,n);
      R.push({p,id:n.id,name:n.name||'Untitled',comment:n.comment||'',doneAt:n.doneAt||'',path:x.tab.name+(pa?' › '+pa:''),inTree:true})}))});
  return R.sort((a,b)=>a.doneAt<b.doneAt?1:-1)}}
const ttFind=(p,id)=>ttAll(p).find(x=>x.tree.some(n=>n.id===id));
document.addEventListener('click',e=>{const b=e.target.closest('.tnd-row [data-tndgo]');if(!b)return;const {p,id}=tndOf(b);if(!p||!ttHas(p))return;
  const x=ttFind(p,id);if(x&&!x.cur)ttSwitch(p,x.tab.id)},true);
document.addEventListener('change',e=>{const c=e.target.closest('.tnd-row [data-tndopen]');if(!c||c.checked)return;const {p,id}=tndOf(c);if(!p||!ttHas(p))return;
  const x=ttFind(p,id);if(!x||x.cur)return;e.stopImmediatePropagation();const n=x.tree.find(y=>y.id===id);delete n.done;delete n.doneAt;commit();toast(`Back in the tree "${x.tab.name}" as an open step.`)},true);
