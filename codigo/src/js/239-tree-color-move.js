/* ---------- Tree tab (v72): node colors and moving nodes.
   Color: `n.color` (synced with p.tree). A node without its own color takes its parent's, so coloring a main node colors everything under it
   that has no color of its own; `trColor(p,n)` gives the color in use. The node and the lines next to it (`--lc` on its li) use it.
   The palette button sits in the hover tools; "Same as above" clears the node's own color.
   Move: drag the grip (⠿) in the hover tools onto another node: top part = before it, middle = inside it (last child), bottom part = after it
   (after its subnodes). The subnodes come along (they point at the node by `parent`). A task node follows in the task lists:
   it becomes a subtask of the new parent's task, or a top task when the new parent has none (`trMove`). ---------- */
const TR_COLORS=['#d64545','#e07b39','#d6a822','#3aa655','#2a9d8f','#3d6fd6','#9b6bff','#d14f9a','#8a94a6'];
function trColor(p,n){const N=trNodes(p);let x=n,k=0;while(x&&k++<50){if(x.color)return x.color;x=x.parent&&N.find(y=>y.id===x.parent)}return ''}
{const _nh=trNodeHTML;trNodeHTML=function(p,n){let h=_nh(p,n);const c=trColor(p,n),ro=typeof isRO==='function'&&isRO(p);
  if(c){h=h.replace('<li class="tr-li">',`<li class="tr-li tr-col" style="--lc:${c}">`);h=h.replace('class="tr-node','class="tr-node tr-has-col').replace(`data-tn="${n.id}" style="`,`data-tn="${n.id}" style="--nc:${c};`)}
  if(!ro)h=h.replace('<span class="tr-tools">',`<span class="tr-tools"><button type="button" class="tr-grip" data-trmove title="Drag to move this node (what is under it comes along)" aria-label="Move">⠿</button><button type="button" class="tr-colb" data-trcol title="Color of this node and of what is under it" aria-label="Color"><i style="background:${c||'transparent'}"></i></button>`);
  // "!" (v73): a red mark before the name says something is wrong there (`n.flag`, synced with p.tree)
  if(n.flag)h=h.replace('<input class="tr-name"','<b class="tr-flag" title="Something is wrong here" aria-label="Problem">!</b><input class="tr-name"');
  if(!ro)h=h.replace('<span class="tr-tools">',`<span class="tr-tools"><button type="button" class="tr-flagb${n.flag?' on':''}" data-trflag title="${n.flag?'Remove the red !':'Mark with a red ! (something is wrong here)'}" aria-pressed="${!!n.flag}">!</button>`);
  return h}}
pp.addEventListener('click',e=>{const b=e.target.closest('#projBody [data-trflag]');if(!b)return;e.stopPropagation();const {p,n}=trOf(b);if(!n)return;if(n.flag)delete n.flag;else n.flag=true;commit()});
function openTrColor(anchor,p,n){
  const own=n.color||'',par=n.parent&&trNodes(p).find(y=>y.id===n.parent),up=par?trColor(p,par):'';
  const under=trDesc(p,n.id).filter(x=>x.color).length;
  openPop(anchor,`<div class="trc-pop"><div class="asg-h">Node color</div>
    <div class="trc-sw">${TR_COLORS.map(c=>`<button type="button" data-trc="${c}" class="${own===c?'on':''}" style="background:${c}" title="${c}" aria-label="Color ${c}"></button>`).join('')}</div>
    <button type="button" class="trc-none${own?'':' on'}" data-trc="">${up?`<i style="background:${up}"></i>Same as above`:'No color'}</button>
    ${under?`<label class="trc-all"><input type="checkbox" id="trc-all"> Also for the ${under} node${under===1?'':'s'} under it with their own color</label>`:''}
    <p class="trc-hint">Nodes under this one take its color unless you pick one for them.</p></div>`,el=>{
    el.classList.add('pop-menu','trc-popw');place(el,anchor);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-trc]');if(!b)return;
      const v=b.dataset.trc,all=el.querySelector('#trc-all');if(v)n.color=v;else delete n.color;
      if(all&&all.checked)trDesc(p,n.id).forEach(x=>delete x.color);
      closePop();commit()})});
}
// move node n before / after / inside node `to`
function trMove(p,n,to,where){
  const N=trNodes(p);if(!to||to===n||trDesc(p,n.id).some(x=>x.id===to.id))return false;
  const oldPar=n.parent||null,newPar=where==='in'?to.id:(to.parent||null);
  N.splice(N.indexOf(n),1);
  let i;
  if(where==='before')i=N.indexOf(to);
  else{const last=[to,...trDesc(p,to.id)].map(x=>N.indexOf(x)).reduce((a,b)=>Math.max(a,b),-1);i=last+1}
  N.splice(i,0,n);n.parent=newPar;
  if(where==='in')to.closed=false;
  // the task lists follow the tree
  const t=trTask(n);
  if(t&&oldPar!==newPar){
    const op=oldPar&&N.find(x=>x.id===oldPar),opt=op&&trTask(op);
    if(opt&&t.parentId===opt.id){t.parentId=null;const roots=S.tasks.filter(x=>isOpenRoot(x)&&!x.longTerm&&x!==t);t.order=roots.length?Math.max(...roots.map(x=>x.order))+1:0}
    const np=newPar&&N.find(x=>x.id===newPar),npt=np&&trTask(np);
    if(npt&&!npt.done&&!t.done&&npt.id!==t.id&&!descendants(t.id).some(x=>x.id===npt.id))nestInto(t.id,npt.id);
  }
  return true;
}
pp.addEventListener('click',e=>{const b=e.target.closest('#projBody [data-trcol]');if(!b)return;e.stopPropagation();const {p,n}=trOf(b);if(n)openTrColor(b,p,n)});
pp.addEventListener('click',e=>{if(e.target.closest('#projBody [data-trmove]'))e.preventDefault()});
pp.addEventListener('pointerdown',e=>{
  const g=e.target.closest('#projBody [data-trmove]');if(!g||e.button)return;
  const {p,n}=trOf(g);if(!n)return;e.preventDefault();
  const li=g.closest('.tr-li'),x0=e.clientX,y0=e.clientY;let moved=false,drop=null,ghost=null;
  const clear=()=>document.querySelectorAll('#projBody .tr-drop-before,#projBody .tr-drop-after,#projBody .tr-drop-in').forEach(x=>x.classList.remove('tr-drop-before','tr-drop-after','tr-drop-in'));
  const mv=ev=>{
    if(!moved&&Math.hypot(ev.clientX-x0,ev.clientY-y0)<4)return;
    if(!moved){moved=true;li.classList.add('tr-dragging');document.body.classList.add('tr-moving');
      const t=trTask(n);ghost=document.createElement('div');ghost.className='tr-ghost';ghost.textContent=((t?t.name:n.name)||'Untitled')+(trDesc(p,n.id).length?` (+${trDesc(p,n.id).length})`:'');document.body.appendChild(ghost)}
    ghost.style.left=(ev.clientX+12)+'px';ghost.style.top=(ev.clientY+8)+'px';
    clear();drop=null;
    const el=document.elementFromPoint(ev.clientX,ev.clientY),d=el&&el.closest('#projBody .tr-node[data-tn]');
    if(!d||li.contains(d))return;
    const to=trNodes(p).find(x=>x.id===d.dataset.tn);if(!to)return;
    const r=d.getBoundingClientRect(),rel=ev.clientY-r.top,band=Math.min(r.height,40)*.3;
    const where=rel<band?'before':rel>r.height-band?'after':'in';
    drop={to,where};d.classList.add('tr-drop-'+where)};
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
    clear();li.classList.remove('tr-dragging');document.body.classList.remove('tr-moving');if(ghost)ghost.remove();
    if(!moved||!drop)return;
    const old=JSON.stringify(p.tree),snap=JSON.stringify(S.tasks);
    if(trMove(p,n,drop.to,drop.where)){commit();
      const nm=(x=>{const t=trTask(x);return (t?t.name:x.name)||'Untitled'});
      toast(`Moved "${nm(n)}" ${drop.where==='in'?'under':drop.where} "${nm(drop.to)}".`,()=>{p.tree=JSON.parse(old);S.tasks=JSON.parse(snap).map(T);commit()})}};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
});
