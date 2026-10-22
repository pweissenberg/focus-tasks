/* project page: own header tools, task form, free-drawing */
pp.addEventListener('click',e=>{
  const p=curProject();if(!p)return;
  const t=e.target.closest('[data-tool]');if(t){S.ui.cvTool=t.dataset.tool;commit();return}
  const c=e.target.closest('[data-pcolor]');if(c){if(shapeRestyle('color',c.dataset.pcolor))return;S.ui.penColor=c.dataset.pcolor;if(S.ui.cvTool==='eraser'||S.ui.cvTool==='move')S.ui.cvTool='pen';commit();return}
  const w=e.target.closest('[data-pw]');if(w){if(shapeRestyle('w',+w.dataset.pw))return;S.ui.penW=+w.dataset.pw;if(S.ui.cvTool!=='pen'&&!SHAPES[S.ui.cvTool])S.ui.cvTool='pen';commit();return}
  if(e.target.closest('[data-undostroke]')){const s=p.strokes.pop();commit();if(s)toast('Last line removed.',()=>{p.strokes.push(s);commit()});return}
  const cl=e.target.closest('[data-cleardraw]');if(cl){if(!cl.dataset.armed){cl.dataset.armed='1';cl.textContent='Click again to clear';return}
    const old=p.strokes;p.strokes=[];commit();toast('Drawing cleared.',()=>{p.strokes=old;commit()})}
});
pp.addEventListener('submit',e=>{
  if(!e.target.matches('[data-ptadd]'))return;e.preventDefault();
  const p=curProject(),ni=$('#pt-name'),di=$('#pt-due'),name=ni.value.trim();if(!name){ni.focus();return}
  const due=parseDate(di.value);if(due===null){di.classList.add('invalid');di.focus();return}
  const tagId=$('#pt-tag').value||null;S.ui.ptTag=tagId||'';
  const t=addFromBar('pt',{name,due,tagId,projectId:p.id,color:ptColor,prio:ptPrio});
  ptPrio=0;ptColor=null;ni.value='';di.value='';
  if(t.longTerm)setTimeout(()=>toast(`"${name}" added to Long term.`),0);
  closeDP();commit();$('#pt-name').focus();
});
pp.addEventListener('click',e=>{
  if(!e.target.closest('[data-ptadd]'))return;
  const b=e.target.closest('#pt-prio,#pt-color,#pt-adv,[data-advclear]');if(!b)return;
  if(b.id==='pt-prio')openPrioPop(b,ptPrio,v=>{ptPrio=v;paintPtBar();const n=$('#pt-name');if(n)n.focus()});
  else if(b.id==='pt-color')openPop(b,`<div class="pop-form"><strong>Task color</strong><div class="swatches">${swatchesHTML(ptColor,true)}</div></div>`,el=>bindSwatches(el.querySelector('.swatches'),c=>{ptColor=c;paintPtBar()}));
  else if(b.id==='pt-adv')advShow('pt',!ADV.pt.open);
  else{ADV.pt.a=advBlank();advShow('pt',true)}
});
{const onPtField=e=>{if(!e.target.closest('[data-ptadd]'))return;if(e.target.dataset.adv)advField('pt',e.target);else if(e.target.id==='pt-tag')paintPtBar();else if(e.target.id==='pt-due')advSync('pt')};
  pp.addEventListener('input',onPtField);pp.addEventListener('change',onPtField);
  pp.addEventListener('focusout',e=>{if(e.target.id==='pt-due')setTimeout(()=>advSync('pt'),0)});
  pp.addEventListener('keydown',e=>{if(e.key==='Escape'&&ADV.pt.open&&!dp&&!pop&&!modal&&e.target.closest('#projBody .cadv,#pt-adv')){advShow('pt',false);const g=$('#pt-adv');if(g)g.focus()}});}
let drawing=null;
pp.addEventListener('pointerdown',e=>{
  const cv=e.target.closest('#cv');if(!cv)return;const tool=S.ui.cvTool||'pen';if(tool==='move'||SHAPES[tool])return;
  if(e.target.closest('.cv-btn,.cv-grip'))return;
  const p=curProject(),svg=cv.querySelector('svg.ink'),r=svg.getBoundingClientRect();
  e.preventDefault();svg.setPointerCapture(e.pointerId);
  if(tool==='eraser'){drawing={erase:true,p,svg};eraseAt(e);return}
  const s={id:uid(),color:S.ui.penColor||'ink',w:S.ui.penW||3,pts:[[Math.round((e.clientX-r.left)/cvZ()),Math.round((e.clientY-r.top)/cvZ())]]};
  svg.insertAdjacentHTML('beforeend',strokeHTML(s));
  drawing={s,p,svg,r,el:svg.lastElementChild};
});
function eraseAt(e){
  // check a small ring around the pointer so thin lines are easy to hit
  const D=drawing;
  [[0,0],[5,0],[-5,0],[0,5],[0,-5]].forEach(([dx,dy])=>document.elementsFromPoint(e.clientX+dx,e.clientY+dy)
    .filter(n=>n.tagName==='path'&&n.dataset.sid&&D.svg.contains(n)).forEach(pth=>{const id=pth.dataset.sid;D.p.strokes=D.p.strokes.filter(s=>s.id!==id);pth.remove();D.changed=true}));
}
pp.addEventListener('pointermove',e=>{
  const D=drawing;if(!D)return;
  if(D.erase){eraseAt(e);return}
  const r=D.svg.getBoundingClientRect(),pt=[Math.round((e.clientX-r.left)/cvZ()),Math.round((e.clientY-r.top)/cvZ())],l=D.s.pts[D.s.pts.length-1];
  if(Math.hypot(pt[0]-l[0],pt[1]-l[1])<2)return;
  D.s.pts.push(pt);D.el.setAttribute('d',pathD(D.s.pts));
});
const endDraw=()=>{const D=drawing;drawing=null;if(!D)return;
  if(D.erase){if(D.changed)commit();return}
  D.p.strokes.push(D.s);commit()};
pp.addEventListener('pointerup',endDraw);pp.addEventListener('pointercancel',endDraw);


