/* ---------- Tree v74 (Pedro's list items 4 and 7).
   4: a node made into a task looks exactly like a plan node (same dashed card, same round check box); only on hover a "Task" tag
      shows on its top-left edge (and the title says it is in your lists). CSS 304-tree-task-look.css.
   7: the text of a Line (above `m.lx`, below `m.lx2`, px from the line's left end) and of a Bracket (`m.ly`, 0..1 from its top)
      can be dragged along the line. Press on the text when you are not typing in it; a plain click still edits it. ---------- */
{const _nh=trNodeHTML;trNodeHTML=function(p,n){let h=_nh(p,n);
  if(trTask(n))h=h.replace('<label class="mt-check" title="','<label class="mt-check tr-pcheck" title="')
    .replace(/(class="tr-node[^"]*" data-tn="[^"]*")/,'$1 title="Task: it is in your task lists"');
  return h}}
function gdLabPlace(d,m){
  if(m.type==='h'){const W=d.offsetWidth;d.querySelectorAll('.gd-lab').forEach(l=>{const v=l.classList.contains('below')?m.lx2:m.lx;
    if(v==null){l.style.left='';l.style.right='';return}
    l.style.right='auto';l.style.left=Math.max(0,Math.min(W-l.offsetWidth,v))+'px'})}
  else if(m.type==='v'&&m.ly!=null){const l=d.querySelector('.gd-lab'),H=d.offsetHeight;if(l)l.style.top=(Math.max(0,Math.min(1,m.ly))*H-l.offsetHeight/2)+'px'}
}
{const _l=tmLayout;tmLayout=function(p){_l(p);const cv=$('#projBody .tr-canvas');if(!cv)return;
  tmList(p).forEach(m=>{if(m.type!=='h'&&m.type!=='v')return;const d=cv.querySelector(`[data-tm="${m.id}"]`);if(d&&!d.hidden)gdLabPlace(d,m)})}}
pp.addEventListener('pointerdown',e=>{
  const lab=e.target.closest('.gd-h .gd-lab,.gd-v .gd-lab');if(!lab||e.button)return;
  const {p,d,m}=tmOf(lab);if(!m||(typeof isRO==='function'&&isRO(p)))return;
  const inp=lab.querySelector('.gd-in');if(inp&&document.activeElement===inp)return;  // typing in it: normal text selection
  const H=m.type==='v',below=lab.classList.contains('below'),x0=e.clientX,y0=e.clientY,l0=lab.offsetLeft,t0=lab.offsetTop;let moved=false,v=null;
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;
    if(!moved){if(Math.abs(H?dy:dx)<5)return;moved=true;if(inp)inp.blur();document.body.classList.add('gd-lmoving');tmSelect(m.id)}
    ev.preventDefault();
    if(H){const h=d.offsetHeight,lh=lab.offsetHeight,y=Math.max(-lh/2,Math.min(h-lh/2,t0+dy));lab.style.top=y+'px';v=h?(y+lh/2)/h:.5}
    else{const x=Math.max(0,Math.min(d.offsetWidth-lab.offsetWidth,l0+dx));lab.style.right='auto';lab.style.left=x+'px';v=x}};
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);document.body.classList.remove('gd-lmoving');
    if(moved&&v!=null){m[H?'ly':below?'lx2':'lx']=H?Math.round(v*1000)/1000:Math.round(v);commit()}};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
});
