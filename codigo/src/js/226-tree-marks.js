/* ---------- Tree tab: dashed guides linked to the nodes (p.treeMarks [{id,type:'h'|'v'|'box',from,to,label,color}], synced in projExtra).
   'h' is a dashed line under node `from` (like "Before Jan."), 'v' is a dashed bracket ] from node `from` to node `to` with short dashes
   going out at the top and bottom (like "Phase 1"), 'box' is a dashed frame around the nodes from `from` to `to`.
   Positions are worked out from the nodes on screen after each render, so the guides follow when nodes are added, folded or hidden.
   "Show done" (S.ui.trDone) shows or hides the nodes of done tasks. Drag a line or a handle to snap it to another node; drag a bracket sideways (m.dx px); its top/bottom dashes reach their node by default and can be dragged shorter (m.stubT/m.stubB, snapping to equal) ---------- */
const TM_COLORS=['#d64545','#3aa655','#3d6fd6','#d08a3c','#9b6bff','#8a94a6'];
const tmList=p=>(p.treeMarks=p.treeMarks||[]);
let tmSel=null;
// every node in the order the tree shows it (hidden ones too)
function trFlat(p){const out=[],walk=id=>trKids(p,id).forEach(n=>{out.push(n.id);walk(n.id)});walk(null);return out}
const trDoneNode=n=>{const t=trTask(n);return !!(t&&t.done)};
{const _rt=renderTreeTab;renderTreeTab=function(p,body){_rt(p,body);
  const ro=typeof isRO==='function'&&isRO(p),bar=body.querySelector('.tr-bar');
  // done tasks: hidden unless "Show done"
  const nDone=trNodes(p).filter(trDoneNode).length;
  if(!S.ui.trDone)body.querySelectorAll('.tr-node.done').forEach(d=>{const li=d.closest('.tr-li');if(li)li.remove()});
  if(bar){
    if(nDone)bar.insertAdjacentHTML('beforeend',`<label class="gd-done"><input type="checkbox" data-trdone${S.ui.trDone?' checked':''}> Show done (${nDone})</label>`);
    if(!ro&&trNodes(p).length)bar.querySelector('[data-trroot]').insertAdjacentHTML('afterend',`<span class="gd-add" role="group" aria-label="Add a dashed guide"><button class="btn sm" type="button" data-tmadd="h" title="Dashed line under a node">┄ Line</button><button class="btn sm" type="button" data-tmadd="v" title="Dashed bracket next to some nodes">┆ Bracket</button><button class="btn sm" type="button" data-tmadd="box" title="Dashed box around some nodes">⬚ Box</button></span>`)}
  const cv=document.createElement('div');cv.className='tr-canvas';
  [...body.children].filter(c=>c!==bar).forEach(c=>cv.appendChild(c));body.appendChild(cv);
  const M=p.treeMarks=tmList(p).filter(m=>m.from);
  if(M.length)cv.insertAdjacentHTML('beforeend',`<div class="gd-layer">${M.map(m=>`<div class="gd gd-${m.type}${tmSel===m.id?' sel':''}" data-tm="${m.id}" style="--mc:${m.color}" hidden>
      ${m.type==='h'?'<i class="gd-hit" data-tmdrag="from"></i>':m.type==='v'?'<i class="gd-hit" data-tmdrag="x" title="Drag sideways to move it closer to or farther from the nodes"></i><i class="gd-stub top"><i class="gd-sh" data-tmdrag="st" title="Drag to make this dash longer or shorter"></i></i><i class="gd-stub bot"><i class="gd-sh" data-tmdrag="sb" title="Drag to make this dash longer or shorter"></i></i>':'<i class="gd-edge" data-tmsel style="top:-5px;left:0;right:0;height:10px"></i><i class="gd-edge" data-tmsel style="bottom:-5px;left:0;right:0;height:10px"></i><i class="gd-edge" data-tmsel style="left:-5px;top:0;bottom:0;width:10px"></i><i class="gd-edge" data-tmsel style="right:-5px;top:0;bottom:0;width:10px"></i>'}
      <span class="gd-lab">${ro?esc(m.label||''):`<input class="gd-in" type="text" value="${esc(m.label||'')}" placeholder="Name" aria-label="Name of this guide" size="${Math.max(4,(m.label||'').length+1)}">`}</span>
      ${m.type==='h'?`<span class="gd-lab below">${ro?esc(m.label2||''):`<input class="gd-in" data-lab2 type="text" value="${esc(m.label2||'')}" placeholder="Text below" aria-label="Text below the line" size="${Math.max(6,(m.label2||'').length+1)}">`}</span>`:''}
      ${ro||m.type==='h'?'':'<i class="gd-rs top" data-tmdrag="from" title="Drag to the first node"></i><i class="gd-rs bot" data-tmdrag="to" title="Drag to the last node"></i>'}
      ${ro?'':`<span class="gd-tools"><button type="button" data-tmcol title="Change color" style="background:${m.color}"></button><button type="button" data-tmdel title="Delete">×</button></span>`}
    </div>`).join('')}</div>`);
  tmLayout(p);requestAnimationFrame(()=>tmLayout(p));
}}
// where each guide goes, from the nodes on screen
function tmRows(){const cv=$('#projBody .tr-canvas');if(!cv)return null;const c=cv.getBoundingClientRect();
  return {cv,c,rows:[...cv.querySelectorAll('.tr-node[data-tn]')].map(el=>{const r=el.getBoundingClientRect();return {id:el.dataset.tn,top:r.top-c.top+cv.scrollTop,bottom:r.bottom-c.top+cv.scrollTop,left:r.left-c.left+cv.scrollLeft,right:r.right-c.left+cv.scrollLeft}})}}
function tmLayout(p){
  const R=tmRows();if(!R||!R.rows.length)return;const {cv,rows}=R,flat=trFlat(p),idx=id=>flat.indexOf(id);
  rows.forEach(r=>r.i=idx(r.id));
  const maxRight=Math.max(...rows.map(r=>r.right));
  let vk=0;
  tmList(p).forEach(m=>{if(m.type==='v'){const d=cv.querySelector(`[data-tm="${m.id}"]`);if(d)vk++}});
  vk=0;const hs=[];let need=maxRight+8;
  tmList(p).forEach(m=>{const d=cv.querySelector(`[data-tm="${m.id}"]`);if(!d)return;
    const a=idx(m.from),b=m.type==='h'?a:idx(m.to);if(a<0||b<0){d.hidden=true;return}
    const lo=Math.min(a,b),hi=Math.max(a,b);
    if(m.type==='h'){
      // under the last node shown at or before `from`
      const prev=rows.filter(r=>r.i<=hi&&r.i>=0).pop(),next=prev?rows[rows.indexOf(prev)+1]:rows[0];
      const y=prev?(next?(prev.bottom+next.top)/2:prev.bottom+8):rows[0].top-6;
      Object.assign(d.style,{left:'0px',top:y+'px',height:''});hs.push(d);d.hidden=false;return}
    const inR=rows.filter(r=>r.i>=lo&&r.i<=hi);if(!inR.length){d.hidden=true;return}
    const top=inR[0].top,bot=inR[inR.length-1].bottom;
    if(m.type==='box'){const l=Math.max(0,Math.min(...inR.map(r=>r.left))-8),rt=Math.max(...inR.map(r=>r.right))+8;
      Object.assign(d.style,{left:l+'px',top:(top-6)+'px',width:(rt-l)+'px',height:(bot-top+12)+'px'});need=Math.max(need,rt+4)}
    else{const rr=Math.max(...inR.map(r=>r.right))+8,x=Math.max(rr,maxRight+22+vk*40+(m.dx||0));d.dataset.base=maxRight+22+vk*40;d.dataset.min=rr;vk++;
      Object.assign(d.style,{left:x+'px',top:(top-2)+'px',width:'',height:(bot-top+4)+'px'});
      // the short dashes at the top and bottom reach their own node unless you made them shorter (m.stubT / m.stubB)
      const aT=Math.max(6,x-inR[0].right-4),aB=Math.max(6,x-inR[inR.length-1].right-4);
      const lT=m.stubT!=null?Math.min(aT,Math.max(6,m.stubT)):aT,lB=m.stubB!=null?Math.min(aB,Math.max(6,m.stubB)):aB;
      d.dataset.at=aT;d.dataset.ab=aB;d.querySelector('.gd-stub.top').style.width=lT+'px';d.querySelector('.gd-stub.bot').style.width=lB+'px';
      d.hidden=false;const lab=d.querySelector('.gd-lab');need=Math.max(need,x+14+(lab?lab.offsetWidth:0)+8)}
    d.hidden=false});
  // only as wide as what is drawn: the tree scrolls sideways only when something really reaches the edge
  const W=Math.max(cv.clientWidth,Math.ceil(need));hs.forEach(d=>d.style.width=W+'px');
  const lay=cv.querySelector('.gd-layer');if(lay)lay.style.width=W+'px';
}
window.addEventListener('resize',()=>{if(S.ui.view==='project'&&$('#projBody .tr-canvas')){const p=curProject();if(p)tmLayout(p)}});
const tmOf=el=>{const d=el.closest('[data-tm]'),p=curProject();return {p,d,m:d&&p&&tmList(p).find(x=>x.id===d.dataset.tm)}};
function tmSelect(id){tmSel=id;document.querySelectorAll('#projBody .gd').forEach(x=>x.classList.toggle('sel',x.dataset.tm===id))}
// adding: pick the node(s) it is linked to
function openTmAdd(anchor,k){
  const p=curProject(),flat=trFlat(p),N=trNodes(p),nm=id=>{const n=N.find(x=>x.id===id),t=trTask(n);return (t?t.name:n.name)||'Untitled'};
  const opts=sel=>flat.map(id=>`<option value="${id}"${id===sel?' selected':''}>${esc(nm(id))}</option>`).join('');
  const one=k==='h';
  openPop(anchor,`<form class="gd-pop" autocomplete="off"><div class="asg-h">${one?'Dashed line':k==='v'?'Dashed bracket':'Dashed box'}</div>
    <label>${one?'Under':'From'} <select id="tm-from">${opts(flat[0])}</select></label>
    ${one?'':`<label>To <select id="tm-to">${opts(flat[Math.min(flat.length-1,2)])}</select></label>`}
    <label>${one?'Above':'Name'} <input id="tm-name" type="text" placeholder="${one?'Before Jan.':'Phase 1'}" maxlength="40"></label>
    ${one?'<label>Below <input id="tm-name2" type="text" placeholder="After Jan." maxlength="40"></label>':''}
    <button class="btn sm primary">Add</button></form>`,el=>{
    el.classList.add('pop-menu','gd-popw');place(el,anchor);
    el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();
      let from=el.querySelector('#tm-from').value,to=one?from:el.querySelector('#tm-to').value;if(flat.indexOf(to)<flat.indexOf(from))[from,to]=[to,from];
      const m={id:uid(),type:k,from,to,label:el.querySelector('#tm-name').value.trim(),label2:one?el.querySelector('#tm-name2').value.trim():'',color:k==='h'?TM_COLORS[1]:TM_COLORS[0]};
      tmList(p).push(m);tmSel=m.id;closePop();commit()});
    setTimeout(()=>el.querySelector('#tm-name').focus(),0)});
}
pp.addEventListener('click',e=>{
  const a=e.target.closest('[data-tmadd]');if(a){e.stopPropagation();openTmAdd(a,a.dataset.tmadd);return}
  const {p,m}=tmOf(e.target);
  if(!m){if(tmSel&&!e.target.closest('.gd'))tmSelect(null);return}
  if(e.target.closest('[data-tmdel]')){const old=JSON.stringify(p.treeMarks);p.treeMarks=tmList(p).filter(x=>x!==m);tmSel=null;commit();
    toast(`Deleted the ${m.type==='h'?'line':m.type==='v'?'bracket':'box'}${m.label?` "${m.label}"`:''}.`,()=>{p.treeMarks=JSON.parse(old);commit()});return}
  if(e.target.closest('[data-tmcol]')){m.color=TM_COLORS[(TM_COLORS.indexOf(m.color)+1)%TM_COLORS.length];commit();return}
  tmSelect(m.id);
});
pp.addEventListener('change',e=>{
  if(e.target.closest('[data-trdone]')){S.ui.trDone=e.target.checked;commit();return}
  if(e.target.closest('.gd-in'))commit()});
pp.addEventListener('input',e=>{const i=e.target.closest('.gd-in');if(!i)return;const {m}=tmOf(i);if(!m)return;if(i.hasAttribute('data-lab2'))m.label2=i.value;else m.label=i.value;i.size=Math.max(i.hasAttribute('data-lab2')?6:4,i.value.length+1);save()});
pp.addEventListener('keydown',e=>{const i=e.target.closest('.gd-in');if(i&&e.key==='Enter'){e.preventDefault();i.blur()}});
pp.addEventListener('focusin',e=>{const i=e.target.closest('.gd-in');if(i){const {m}=tmOf(i);if(m)tmSelect(m.id)}});
document.addEventListener('keydown',e=>{if(!tmSel||S.ui.view!=='project'||!(e.key==='Delete'||e.key==='Backspace'))return;
  const a=document.activeElement;if(a&&a.closest&&a.closest('input,textarea,select,[contenteditable]'))return;
  const b=$(`#projBody [data-tm="${tmSel}"] [data-tmdel]`);if(b){e.preventDefault();b.click()}});
// drag a line, or the top / bottom handle of a bracket or box, onto another node: it snaps to the nearest one
pp.addEventListener('pointerdown',e=>{
  const g=e.target.closest('[data-tmdrag]');if(!g)return;
  const {p,d,m}=tmOf(e.target);if(!m||(typeof isRO==='function'&&isRO(p)))return;
  e.preventDefault();tmSelect(m.id);
  const R=tmRows();if(!R)return;const flat=trFlat(p),which=g.dataset.tmdrag,y0=e.clientY,top0=parseFloat(d.style.top),h0=parseFloat(d.style.height)||0;let moved=false,pick=null;
  if(which==='st'||which==='sb'){const x0=e.clientX,st=d.querySelector(which==='st'?'.gd-stub.top':'.gd-stub.bot'),ot=d.querySelector(which==='st'?'.gd-stub.bot':'.gd-stub.top');
    const l0=parseFloat(st.style.width),auto=+d.dataset[which==='st'?'at':'ab'],other=parseFloat(ot.style.width);let v=l0,snap=null;
    const ms=ev=>{const dx=ev.clientX-x0;if(Math.abs(dx)>2)moved=true;v=Math.min(auto,Math.max(6,l0-dx));snap=null;
      if(auto-v<8){v=auto;snap='auto'}else if(Math.abs(v-other)<10){v=other;snap='eq'}  // snaps to its node, or to the same length as the other dash
      st.style.width=v+'px';d.classList.toggle('gd-eq',snap==='eq')};
    const us=()=>{window.removeEventListener('pointermove',ms);window.removeEventListener('pointerup',us);d.classList.remove('gd-eq');
      if(moved){m[which==='st'?'stubT':'stubB']=snap==='auto'?null:Math.round(v);commit()}};
    window.addEventListener('pointermove',ms);window.addEventListener('pointerup',us);return}
  if(which==='x'){const x0=e.clientX,l0=parseFloat(d.style.left),base=+d.dataset.base,min=+d.dataset.min;let nx=l0;
    const mx=ev=>{const dx=ev.clientX-x0;if(Math.abs(dx)>2)moved=true;nx=Math.max(min,l0+dx);d.style.left=nx+'px'};
    const ux=()=>{window.removeEventListener('pointermove',mx);window.removeEventListener('pointerup',ux);if(moved){m.dx=Math.round(nx-base);commit()}};
    window.addEventListener('pointermove',mx);window.addEventListener('pointerup',ux);return}
  const mvf=ev=>{const dy=ev.clientY-y0;if(Math.abs(dy)>3)moved=true;if(!moved)return;
    const y=(m.type==='h'||which==='from'?top0:top0+h0)+dy;
    let best=null,bd=1e9;R.rows.forEach(r=>{const ry=m.type==='h'||which==='to'?r.bottom:r.top,dd=Math.abs(ry-y);if(dd<bd){bd=dd;best=r}});
    if(m.type==='h'){d.style.top=y+'px';pick=best&&best.id;return}
    const other=flat.indexOf(which==='from'?m.to:m.from),bi=best?flat.indexOf(best.id):-1;
    if(bi<0||(which==='from'?bi>other:bi<other))return;pick=best.id;
    if(which==='from'){d.style.top=best.top+'px';d.style.height=(top0+h0-best.top)+'px'}else d.style.height=(best.bottom-top0)+'px'};
  const up=()=>{window.removeEventListener('pointermove',mvf);window.removeEventListener('pointerup',up);
    if(moved&&pick){m[which]=pick;if(m.type==='h')m.to=pick}commit()};
  window.addEventListener('pointermove',mvf);window.addEventListener('pointerup',up);
});
