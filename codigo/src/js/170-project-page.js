/* ---------- project page: notes, tasks, canvas ---------- */
function openProject(id){
  if(S.ui.view!=='project')S.ui.prevView=S.ui.view;
  S.ui.view='project';S.ui.projectPage=id;S.ui.project=id;S.ui.projTab=S.ui.projTab||'tasks';
  $('#c-proj').value=id;cvScroll=null;commit();
}
let cvScroll=null;
const PEN_COLORS=[['ink','var(--ink)'],['blue','#2f5bea'],['red','#d0453a'],['green','#2f8f4e'],['orange','#d08a3c']];
const penCss=k=>(PEN_COLORS.find(c=>c[0]===k)||PEN_COLORS[0])[1];
function pathD(pts){
  if(!pts.length)return'';if(pts.length<3)return`M${pts[0][0]} ${pts[0][1]} L${pts[pts.length-1][0]+.1} ${pts[pts.length-1][1]+.1}`;
  let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;d+=` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`}
  const l=pts[pts.length-1];return d+` L${l[0]} ${l[1]}`;
}
const strokeHTML=s=>s.shape?shapeHTML(s):`<path data-sid="${s.id}" d="${pathD(s.pts)}" style="stroke:${penCss(s.color)};stroke-width:${s.w}px"/>`;
function renderProjPage(){
  const p=S.projects.find(x=>x.id===S.ui.projectPage);if(!p)return;
  p.notesList=p.notesList||[];p.canvas=p.canvas||[];p.strokes=p.strokes||[];
  if(S.ui.projTab==='canvas')S.ui.projTab='free';
  const tab=S.ui.projTab||'tasks',open=S.tasks.filter(t=>!t.done&&t.projectId===p.id).length;
  const ws=+weekStartOf(new Date()),now=Date.now();let wk=0;allSessions().forEach(x=>{const t=byId(x.taskId);if((t?t.projectId:x.projectId)===p.id)wk+=Math.max(0,Math.min(x.end,now)-Math.max(x.start,ws))});
  const prevWrap=$('#projBody .cv-wrap');if(prevWrap)cvScroll=[prevWrap.scrollLeft,prevWrap.scrollTop];
  // the shared task list may be parked inside the project body: move it out before rebuilding
  const L=$('#list');if(L&&L.closest('#projBody'))$('#banner').after(L);
  const dark=effectiveDark();
  $('#projHead').innerHTML=`<div class="pp-top"><button class="linkbtn" type="button" data-pback>‹ Back to all tasks</button></div>
    <div class="pp-titlerow"><span class="pp-name" style="--dot:${p.color||'var(--accent)'}"><i></i>${esc(p.name)}</span>
    <span class="pp-sub">${open} open task${open===1?'':'s'} · ${fmtDur(wk)} this week${projTime(p).tot>=60000?` · ${fmtDur(projTime(p).tot)} in total`:''}</span>${projPeopleHTML(p)}</div>
    ${projMetaHTML(p)}
    <div class="pp-tabs" role="tablist">${[['notes','Notes'],['tasks','Tasks'],['free','Free'],['tree','Tree'],['files','Files'],['time','Time'],['team','Team'],['activity','Activity']].map(([k,l])=>`<button class="ptab${tab===k?' on':''}" type="button" role="tab" aria-selected="${tab===k}" data-ptab="${k}">${l}${k==='notes'&&p.notesList.length?` <span class="n">${p.notesList.length}</span>`:''}${k==='tasks'&&open?` <span class="n">${open}</span>`:''}${k==='files'&&(p.files||[]).length?` <span class="n">${p.files.length}</span>`:''}</button>`).join('')}</div>`;
  const body=$('#projBody');body.hidden=false;
  // keep the caret in the note or canvas text being typed when the page redraws (e.g. a member's edit arrives)
  const fa=document.activeElement,fk=fa&&fa.closest&&fa.closest('#projBody')&&(fa.dataset.pn||fa.dataset.cv)?{nid:(fa.closest('[data-nid]')||{}).dataset?.nid,cid:(fa.closest('[data-cid]')||{}).dataset?.cid,pn:fa.dataset.pn,s:fa.selectionStart,e:fa.selectionEnd}:null;
  const refocus=()=>{if(!fk)return;const el=fk.nid?body.querySelector(`[data-nid="${fk.nid}"] [data-pn="${fk.pn}"]`):body.querySelector(`[data-cid="${fk.cid}"] textarea`);if(el){el.focus();try{el.setSelectionRange(fk.s,fk.e)}catch(e){}}};
  if(tab==='tasks'){
    // keep what you were typing when the page redraws
    const old=body.querySelector('[data-ptadd]'),ae=document.activeElement,on0=old&&old.dataset.pid===p.id;
    const keep=on0?{n:old.querySelector('#pt-name').value,d:old.querySelector('#pt-due').value,t:old.querySelector('#pt-tag').value,f:!!ae&&ae.id==='pt-name',s:old.querySelector('#pt-name').selectionStart,af:ae&&ae.closest&&ae.closest('#projBody .cadv')?ae.id:''}:null;
    if(ptFor!==p.id){ptFor=p.id;ptPrio=0;ptColor=null;ADV.pt.a=advBlank()}
    body.innerHTML=`<form class="pt-add" data-ptadd data-pid="${p.id}" autocomplete="off">
        <input type="text" id="pt-name" placeholder="Add a task to ${esc(p.name)}..." aria-label="Task name">
        <input type="text" id="pt-due" class="mono" placeholder="MM/DD/YYYY" aria-label="Due date (optional)">
        <select id="pt-tag" aria-label="Tag">${optionList(S.tags,'No tag',keep?keep.t:(projDefTag(p.id)||S.ui.ptTag||''))}</select>
        <button class="pflag cprio" id="pt-prio" type="button" aria-label="Priority" aria-haspopup="menu"></button>
        <button class="swatchbtn" id="pt-color" type="button" aria-label="Task color"></button>
        <button class="cgear" id="pt-adv" type="button" aria-label="Advanced settings" aria-expanded="${ADV.pt.open}">${icons.gear}</button>
        <button class="addbtn" type="submit" aria-label="Add task">+</button>${ADV.pt.open?advPanelHTML('pt'):''}</form>
      ${boardBarHTML(p)}<div id="listSlot"${S.ui.projBoard||S.ui.projGantt?' hidden':''}></div>${S.ui.projGantt?ganttHTML(p):S.ui.projBoard?boardHTML(p):''}`;
    bindDate(body.querySelector('#pt-due'));
    paintPtBar();advSync('pt');
    if(keep){const n=$('#pt-name');n.value=keep.n;$('#pt-due').value=keep.d;advSync('pt');
      if(keep.f){n.focus();try{n.setSelectionRange(keep.s,keep.s)}catch(e){}}else if(keep.af){const x=document.getElementById(keep.af);if(x)x.focus()}}
    return;
  }
  if(tab==='files'){renderFilesTab(p,body);return}
  if(tab==='activity'){renderActivityTab(p,body);return}
  if(tab==='time'){renderTimeTab(p,body);return}
  if(tab==='team'){renderTeamTab(p,body);return}
  if(tab==='tree'){renderTreeTab(p,body);return}
  if(tab==='notes'){
    const notes=p.notesList.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    body.innerHTML=`<div class="pn-bar"><button class="btn primary" type="button" data-pnew>+ New note</button><span class="cal-hint">Notes save as you type.</span></div>
      ${notes.length?`<div class="pn-grid">${notes.map(n=>`<article class="pn" data-nid="${n.id}">
        <input type="text" class="pn-title" data-pn="title" value="${esc(n.title)}" placeholder="Title" aria-label="Note title">
        <textarea class="pn-text" data-pn="text" placeholder="Write here..." aria-label="Note text">${esc(n.text)}</textarea>
        <footer><span>Edited <span class="mono">${tsToUS(n.updatedAt)}</span></span><button type="button" class="danger-link" data-pdel>Delete</button></footer></article>`).join('')}</div>`
      :`<div class="empty"><strong>No notes for ${esc(p.name)} yet</strong>Press "New note" to start one.</div>`}`;
    body.querySelectorAll('.pn-text').forEach(autoGrow);refocus();
    return;
  }
  // free: drawing + text + sticky notes + tasks
  const tool=S.ui.cvTool||'pen',pc=S.ui.penColor||'ink',pw=S.ui.penW||3;
  const ic={move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 8-6 2-2 6z"/></svg>',
    pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l5 5L8 21H3v-5z"/></svg>',
    eraser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h13M5 15l9-9 6 6-7 7H8z"/></svg>'};
  body.innerHTML=`<div class="cv-bar">
      <div class="tgroup">${[['pen','Draw'],['eraser','Erase'],['move','Select']].map(([k,l])=>`<button class="tool${tool===k?' on':''}" type="button" data-tool="${k}" aria-pressed="${tool===k}" title="${l}">${ic[k]}<span>${l}</span></button>`).join('')}</div>
      <div class="tgroup shapes">${shapeToolsHTML(tool)}</div>
      <div class="tgroup">${PEN_COLORS.map(([k,c])=>`<button class="pcol${pc===k?' on':''}" type="button" data-pcolor="${k}" style="--pc:${c}" aria-label="Pen color ${k}"></button>`).join('')}</div>
      <div class="tgroup">${[[2,'Thin'],[4,'Medium'],[8,'Thick']].map(([w,l])=>`<button class="pw${pw===w?' on':''}" type="button" data-pw="${w}" title="${l}" aria-label="${l} pen"><i style="height:${w}px"></i></button>`).join('')}</div>
      <div class="tgroup"><button class="tool" type="button" data-cvadd="text">+ Text</button><button class="tool" type="button" data-cvadd="box" title="A text box with a border; resize it from the corner">+ Box</button><button class="tool" type="button" data-cvadd="note">+ Note</button><button class="tool" type="button" data-cvadd="task">+ Task</button><button class="tool" type="button" data-cvimg>+ Image</button></div>
      ${zoomBarHTML()}
      <div class="tgroup"><button class="tool" type="button" data-undostroke${p.strokes.length?'':' disabled'}>Undo</button><button class="tool danger" type="button" data-cleardraw${p.strokes.length?'':' disabled'}>Clear drawing</button></div>
    </div>
    <div class="cv-wrap"><div class="cv-size" style="width:${2400*cvZ()}px;height:${1600*cvZ()}px"><div style="transform:scale(${cvZ()})" class="cv tool-${tool}${SHAPES[tool]?' tool-shape':''}" id="cv"><svg class="ink" width="2400" height="1600" viewBox="0 0 2400 1600" aria-label="Drawing">${p.strokes.map(strokeHTML).join('')}</svg>${p.canvas.map(cvItemHTML).join('')}</div></div></div>
    <p class="cal-hint" style="margin-top:8px">${tool==='move'?'Double-click empty space to write. Drag an item by its top strip, resize from the corner. Click a shape to select it, drag to move, Delete to remove.':tool==='pen'?'Draw anywhere with the mouse, a finger or a pen. Switch to Select to move notes and text.':SHAPES[tool]?'Drag to draw a '+SHAPES[tool].toLowerCase()+'. Hold Shift for a square, circle or straight angle. Use Select to move or delete shapes.':'Drag over a line to erase it.'}</p>`;
  const wrap=body.querySelector('.cv-wrap');if(cvScroll){wrap.scrollLeft=cvScroll[0];wrap.scrollTop=cvScroll[1]}
  observeCanvas(p);refocus();
}
const NOTE_COLORS=['#f6d860','#9fd8a8','#9cc5f5','#f5a8b8','#d2b8f2'];
function cvItemHTML(it){
  const st=`left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px`;
  let inner='';
  if(it.type==='task'){const t=byId(it.taskId);
    inner=t?`<label class="cv-tlabel"><input type="checkbox" data-cv="done"${t.done?' checked':''} aria-label="Done"><span class="${t.done?'is-done':''}">${esc(t.name)}</span></label>
      <div class="cv-meta">${tagOf(t)?`<span class="chip" style="--dot:${tagOf(t).color}"><i></i>${esc(tagOf(t).name)}</span>`:''}${t.due?`<span>Due ${isoToUS(t.due)}</span>`:''}${t.onHold?'<span>On hold</span>':''}${spentOf(t.id)>=60000?`<span>⏱ ${fmtDur(spentOf(t.id))}</span>`:''}</div>`
      :'<div class="cv-meta">This task was deleted.</div>';
  }else if(it.type==='image')inner=`<img class="cv-img" src="${esc(it.src||'')}" alt="${esc(it.text||'Image')}" draggable="false">`;
  else inner=`<textarea data-cv="text" placeholder="${it.type==='note'?'Note...':'Write...'}" aria-label="${it.type==='note'?'Note':'Text'}">${esc(it.text||'')}</textarea>`;
  const tc=it.type==='task'&&byId(it.taskId)?`;--c:${colorOf(byId(it.taskId))}`:'';
  return `<div class="cv-item cv-${it.type}" data-cid="${it.id}" style="${st};--nc:${it.color||NOTE_COLORS[0]}${tc}">
    <div class="cv-grip" title="Drag to move"></div>
    ${it.type==='note'?'<button type="button" class="cv-btn cv-color" data-cvcolor title="Change color" aria-label="Change note color">●</button>':''}
    <button type="button" class="cv-btn cv-x" data-cvdel title="Remove from canvas" aria-label="Remove from canvas">×</button>${inner}</div>`;
}
let cvRO=null;
function observeCanvas(p){
  if(cvRO)cvRO.disconnect();
  cvRO=new ResizeObserver(entries=>{let ch=false;entries.forEach(en=>{const el=en.target,it=p.canvas.find(c=>c.id===el.dataset.cid);if(!it)return;
    const w=el.offsetWidth,h=el.offsetHeight;if(Math.abs(w-it.w)>1||Math.abs(h-it.h)>1){it.w=w;it.h=h;ch=true}});if(ch)saveSoon()});
  document.querySelectorAll('#cv .cv-item').forEach(el=>cvRO.observe(el));
}
function curProject(){return S.projects.find(x=>x.id===S.ui.projectPage)}
function autoGrow(t){t.style.height='auto';t.style.height=Math.max(90,t.scrollHeight+2)+'px'}
function addCanvasItem(type,x,y,extra){
  const p=curProject(),wrap=$('#projBody .cv-wrap');
  if(x==null){x=Math.round(wrap.scrollLeft/cvZ())+40+(p.canvas.length%5)*24;y=Math.round(wrap.scrollTop/cvZ())+40+(p.canvas.length%5)*24}
  const size=extra&&extra.w?[extra.w,extra.h]:type==='task'?[240,74]:type==='note'?[200,160]:[260,60];
  const it=Object.assign({id:uid(),type,x:Math.max(0,x),y:Math.max(0,y),w:size[0],h:size[1],text:'',color:type==='note'?NOTE_COLORS[p.canvas.length%NOTE_COLORS.length]:null},extra||{});
  p.canvas.push(it);commit();
  const ta=document.querySelector(`[data-cid="${it.id}"] textarea`);if(ta)ta.focus();
}
function openCanvasTaskPop(anchor){
  const p=curProject(),ts=S.tasks.filter(t=>!t.done&&t.projectId===p.id&&!p.canvas.some(c=>c.taskId===t.id));
  openPop(anchor,`<form class="pop-form blkpop"><strong>Put a task on the canvas</strong>
    ${ts.length?`<select id="cvt-pick" aria-label="Existing task"><option value="">Pick a task from ${esc(p.name)}...</option>${ts.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><span class="cal-hint">or create a new one:</span>`:''}
    <input type="text" id="cvt-new" placeholder="New task name" aria-label="New task name">
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Add</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const pick=el.querySelector('#cvt-pick'),nm=el.querySelector('#cvt-new').value.trim();let id=pick&&pick.value;
      if(!id&&nm){const roots=S.tasks.filter(x=>isOpenRoot(x)&&!x.longTerm);const t=T({name:nm,projectId:p.id,order:roots.length?Math.max(...roots.map(x=>x.order))+1:0});S.tasks.push(t);id=t.id}
      if(!id){el.querySelector('#cvt-new').classList.add('invalid');return}
      closePop();addCanvasItem('task',null,null,{taskId:id})};
  });
}
const pp=$('#projPage');
pp.addEventListener('click',e=>{
  const p=curProject();if(!p)return;
  const sh=e.target.closest('[data-pshare]');if(sh){openProjSharePop(sh,p);return}
  if(e.target.closest('[data-pback]')){S.ui.view=S.ui.prevView&&S.ui.prevView!=='project'?S.ui.prevView:'tasks';commit();return}
  const t=e.target.closest('[data-ptab]');if(t){S.ui.projTab=t.dataset.ptab;cvScroll=null;commit();return}
  if(e.target.closest('[data-pnew]')){const now=new Date().toISOString(),n={id:uid(),title:'',text:'',createdAt:now,updatedAt:now};p.notesList.push(n);commit();const el=document.querySelector(`[data-nid="${n.id}"] .pn-title`);el&&el.focus();return}
  const d=e.target.closest('[data-pdel]');if(d){if(d.dataset.armed){const id=d.closest('[data-nid]').dataset.nid;p.notesList=p.notesList.filter(n=>n.id!==id);commit()}else{d.dataset.armed='1';d.textContent='Click again to delete'}return}
  const a=e.target.closest('[data-cvadd]');if(a){if(a.dataset.cvadd==='task')openCanvasTaskPop(a);else addCanvasItem(a.dataset.cvadd);return}
  const x=e.target.closest('[data-cvdel]');if(x){const id=x.closest('[data-cid]').dataset.cid;p.canvas=p.canvas.filter(c=>c.id!==id);commit();return}
  const c=e.target.closest('[data-cvcolor]');if(c){const it=p.canvas.find(i=>i.id===c.closest('[data-cid]').dataset.cid);it.color=NOTE_COLORS[(NOTE_COLORS.indexOf(it.color)+1)%NOTE_COLORS.length];commit();return}
});
pp.addEventListener('input',e=>{
  const p=curProject();if(!p)return;
  const f=e.target.dataset.pn;if(f){const n=p.notesList.find(n=>n.id===e.target.closest('[data-nid]').dataset.nid);n[f]=e.target.value;n.updatedAt=new Date().toISOString();if(f==='text')autoGrow(e.target);saveSoon();return}
  if(e.target.dataset.cv==='text'){const it=p.canvas.find(i=>i.id===e.target.closest('[data-cid]').dataset.cid);it.text=e.target.value;saveSoon()}
});
pp.addEventListener('change',e=>{
  if(e.target.dataset.cv!=='done')return;const p=curProject(),it=p.canvas.find(i=>i.id===e.target.closest('[data-cid]').dataset.cid),t=byId(it.taskId);if(!t)return;
  if(e.target.checked){if(S.timer.taskId===t.id&&S.timer.running)timerPause();complete(t);commit();askAddTime(t)}else{reopen(t);commit()}
});
pp.addEventListener('dblclick',e=>{
  if(e.target.id!=='cv')return;const r=e.target.getBoundingClientRect();addCanvasItem('text',Math.round((e.clientX-r.left)/cvZ())-10,Math.round((e.clientY-r.top)/cvZ())-14);
});
let cvDrag=null;
pp.addEventListener('pointerdown',e=>{
  const g=e.target.closest('.cv-grip');if(!g)return;
  const el=g.closest('.cv-item'),p=curProject(),it=p.canvas.find(i=>i.id===el.dataset.cid);
  e.preventDefault();g.setPointerCapture(e.pointerId);
  p.canvas=p.canvas.filter(i=>i!==it).concat([it]);el.parentElement.appendChild(el);
  cvDrag={el,it,x0:e.clientX,y0:e.clientY,ix:it.x,iy:it.y};el.classList.add('dragging');
});
pp.addEventListener('pointermove',e=>{if(!cvDrag)return;const D=cvDrag;
  D.it.x=Math.max(0,Math.round((D.ix+(e.clientX-D.x0)/cvZ())/4)*4);D.it.y=Math.max(0,Math.round((D.iy+(e.clientY-D.y0)/cvZ())/4)*4);
  D.el.style.left=D.it.x+'px';D.el.style.top=D.it.y+'px'});
const cvEnd=()=>{if(!cvDrag)return;cvDrag.el.classList.remove('dragging');cvDrag=null;save()};
pp.addEventListener('pointerup',cvEnd);pp.addEventListener('pointercancel',cvEnd);
