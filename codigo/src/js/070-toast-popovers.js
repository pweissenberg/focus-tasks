/* ---------- toast ---------- */
let toastTimer;
function toast(msg,undo,label){
  document.querySelectorAll('.toast').forEach(x=>x.remove());
  const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');
  el.innerHTML=`<span>${esc(msg)}</span>`+(undo?`<button type="button">${esc(label||'Undo')}</button>`:'');
  if(undo)el.querySelector('button').onclick=()=>{undo();el.remove()};
  document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),5000);
}

/* ---------- popovers ---------- */
let pop=null;
function place(el,anchor){
  const r=anchor.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;
  let top=r.bottom+6; if(top+h>innerHeight-8&&r.top-h-6>8) top=r.top-h-6;
  el.style.top=Math.max(8,top)+'px'; el.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
}
function closePop(){if(pop){pop.el.remove();pop=null}}
function openPop(anchor,html,mount){
  closePop(); closeDP();
  const el=document.createElement('div');el.className='pop';el.innerHTML=html;document.body.appendChild(el);
  pop={el,anchor};place(el,anchor);mount&&mount(el);
  const f=el.querySelector('input[type=text]');f&&f.focus();
}
function swatchesHTML(sel,withAuto){
  const inPal=PALETTE.includes(sel);
  return (withAuto?`<button type="button" class="sw auto${!sel?' on':''}" data-sw="" title="Use the tag's color">auto</button>`:'')
    +PALETTE.map(c=>`<button type="button" class="sw${c===sel?' on':''}" style="--sw:${c}" data-sw="${c}" aria-label="Color ${c}"></button>`).join('')
    +`<label class="custom" title="Custom color"${sel&&!inPal?` style="background:${sel};border-style:solid"`:''}>${sel&&!inPal?'':'+'}<input type="color" value="${sel||'#3d6fd6'}" aria-label="Custom color"></label>`;
}
function bindSwatches(root,onPick){
  root.addEventListener('click',e=>{const b=e.target.closest('[data-sw]');if(!b)return;e.preventDefault();
    root.querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===b));
    const c=root.querySelector('.custom');c.style.background='';c.style.borderStyle='';c.firstChild.nodeType===3||c.prepend('+');
    onPick(b.dataset.sw||null)});
  const ci=root.querySelector('.custom input');
  ci.addEventListener('input',()=>{root.querySelectorAll('.sw').forEach(x=>x.classList.remove('on'));
    const c=ci.parentElement;c.style.background=ci.value;c.style.borderStyle='solid';if(c.firstChild.nodeType===3)c.firstChild.remove();onPick(ci.value)});
}
function openTagPop(anchor,tag){
  let color=tag?tag.color:PALETTE[S.tags.length%PALETTE.length],armed=false;
  openPop(anchor,`<form class="pop-form"><strong>${tag?'Edit tag':'New tag'}</strong>
    <input type="text" id="tg-name" placeholder="Tag name" value="${tag?esc(tag.name):''}" maxlength="40" aria-label="Tag name">
    <div class="swatches">${swatchesHTML(color,false)}</div>
    <div class="pop-actions">${tag?'<button type="button" class="danger-link" data-del>Delete tag</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    bindSwatches(el.querySelector('.swatches'),c=>color=c||color);
    el.querySelector('[data-x]').onclick=closePop;
    const del=el.querySelector('[data-del]');
    if(del)del.onclick=()=>{if(!armed){armed=true;del.textContent='Click again to delete';return}
      S.tags=S.tags.filter(g=>g.id!==tag.id);S.tasks.forEach(t=>{if(t.tagId===tag.id)t.tagId=null});
      if(S.ui.tag===tag.id)S.ui.tag='all';closePop();commit();toast(`Tag "${tag.name}" deleted.`)};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const inp=el.querySelector('#tg-name'),name=inp.value.trim();
      if(!name){inp.classList.add('invalid');inp.focus();return}
      if(tag){tag.name=name;tag.color=color}else{const g={id:uid(),name,color};S.tags.push(g);$('#c-tag').value='';}
      closePop();commit()};
  });
}
function openProjPop(anchor,proj){
  let armed=false,color=proj&&proj.color?proj.color:PALETTE[(S.projects.length+5)%PALETTE.length];
  openPop(anchor,`<form class="pop-form"><strong>${proj?'Edit project':'New project'}</strong>
    <input type="text" id="pj-name" placeholder="Project name" value="${proj?esc(proj.name):''}" maxlength="60" aria-label="Project name">
    <div class="swatches">${swatchesHTML(color,false)}</div>
    <div class="pop-actions">${proj?'<button type="button" class="danger-link" data-del>Delete</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    bindSwatches(el.querySelector('.swatches'),c=>color=c||color);
    const del=el.querySelector('[data-del]');
    const shp=proj&&isSharedProj(proj.id);if(del&&shp)del.textContent='Leave project';
    if(del)del.onclick=()=>{if(!armed){armed=true;del.textContent=shp?'Click again to leave':'Click again (tasks are kept)';return}
      if(shp){closePop();leaveProject(proj);return}
      S.projects=S.projects.filter(p=>p.id!==proj.id);S.tasks.forEach(t=>{if(t.projectId===proj.id)t.projectId=null});
      if(S.ui.project===proj.id)S.ui.project='all';closePop();commit();toast(`Project "${proj.name}" deleted. Its tasks are still in All projects.`)};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const inp=el.querySelector('#pj-name'),name=inp.value.trim();
      if(!name){inp.classList.add('invalid');inp.focus();return}
      if(proj){proj.name=name;proj.color=color}else{const p={id:uid(),name,color};S.projects.push(p);S.ui.project=p.id;$('#c-proj').value=p.id}
      closePop();commit();if(!proj)$('#c-proj').value=S.ui.project};
  });
}
document.addEventListener('mousedown',e=>{
  if((S.ui.timerOpen||S.ui.noiseOpen)&&innerWidth<=1180&&!e.target.closest('#timerPanel,#timerToggle,#noiseToggle,.pop,.toast')){S.ui.timerOpen=false;S.ui.noiseOpen=false;save();render()}
  if(pop&&!pop.el.contains(e.target)&&!pop.anchor.contains(e.target))closePop();
  if(dp&&!dp.el.contains(e.target)&&e.target!==dp.input)closeDP();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(dp)closeDP();else if(pop)closePop();else closeModal()}});
addEventListener('resize',()=>{closePop();closeDP()});

