/* ---------- task comments with @mentions, and per-person permissions in shared projects ---------- */
// p.comments {taskId:[{id,by,at,text,mentions:[userId],del?}]}: deleted comments stay as markers so every member drops them
// p.perms {userId:'view'}: the owner sets it; edit is the default. Both sync in the project's `extra` (216)
const cmtIcon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
const liveCmts=(p,id)=>((p&&p.comments||{})[id]||[]).filter(c=>!c.del);
// comments live on the project (p.comments) for project tasks, and on the task itself (t.comments, same shape) otherwise
const cmtHolder=t=>t&&(t.projectId&&projOfId(t.projectId)||t);
function cmtBtnHTML(t){
  if(!t||t.stepOf)return'';
  const p=cmtHolder(t);if(!p)return'';
  const n=liveCmts(p,t.id).length;
  return `<button class="cmt${n?' on':''}" type="button" data-cmt="${t.id}" title="${n?`${n} comment${n===1?'':'s'}`:'Add a comment'}" aria-label="${n?`${n} comment${n===1?'':'s'}`:'Add a comment'}">${cmtIcon}${n?`<span>${n}</span>`:''}</button>`;
}
const whoName=id=>CL.on&&id?(id===CL.uid?'You':personName(id)):'You';
function cmtTextHTML(c){
  let h=esc(c.text);
  (c.mentions||[]).forEach(id=>{const n=esc('@'+personName(id));h=h.split(n).join(`<b class="at">${n}</b>`)});
  return h.replace(/\n/g,'<br>');
}
function openComments(t){
  const p=cmtHolder(t),isProj=p!==t;if(!p)return;
  closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal cmts" role="dialog" aria-modal="true" aria-labelledby="cm-h"><h2 id="cm-h">Comments</h2>
    <p class="cm-task">${esc(t.name)}</p>
    <div class="cm-list"></div>
    <form class="cm-form" autocomplete="off"><div class="cm-box"><textarea id="cm-text" rows="2" placeholder="Write a comment. Type @ to mention someone." aria-label="Comment"></textarea><div class="cm-at" role="listbox" hidden></div></div>
    <p class="sp-hint cm-hint">${p!==t?'You can only mention people in this project. They get an alert.':'You can only mention people this task is shared with. They get an alert.'}</p>
    <div class="modal-actions"><button type="button" class="btn" data-x>Close</button><button type="submit" class="btn primary">Comment</button></div></form></div>`;
  document.body.appendChild(back);modal=back;back._cmt=t.id;
  const list=back.querySelector('.cm-list'),ta=back.querySelector('#cm-text'),at=back.querySelector('.cm-at');
  const others=()=>!CL.on?[]:isProj?(p.shared?projMembers(p).members.filter(id=>id!==CL.uid):[]):(t.members||[]).filter(id=>id!==CL.uid);
  const draw=()=>{const L=liveCmts(p,t.id);
    list.innerHTML=L.length?L.map(c=>`<div class="cm-item" data-cmid="${c.id}">${CL.on&&c.by?avHTML(c.by):'<i class="av act-me">•</i>'}<div class="cm-body"><div class="cm-meta"><b>${esc(whoName(c.by))}</b><span title="${esc(new Date(c.at).toLocaleString())}">${agoTxt(c.at)}</span>${!CL.on||c.by===CL.uid||!c.by?`<button type="button" class="linkbtn" data-cmdel="${c.id}">Delete</button>`:''}</div><div class="cm-text">${cmtTextHTML(c)}</div></div></div>`).join('')
      :`<p class="sp-hint">No comments yet.${others().length?' Type @ to mention someone.':''}</p>`;
    list.scrollTop=list.scrollHeight};
  back._draw=draw;draw();
  // @ suggestions: the project's other members whose name starts with what follows the @
  let hits=[],hi=0;
  const atQuery=()=>{const v=ta.value.slice(0,ta.selectionStart),m=v.match(/(^|\s)@([^\s@]*)$/);return m?{q:m[2].toLowerCase(),from:v.length-m[2].length-1}:null};
  const drawAt=()=>{const a=atQuery();hits=a?others().filter(id=>personName(id).toLowerCase().split(/\s+/).some(w=>w.startsWith(a.q))||personName(id).toLowerCase().startsWith(a.q)).slice(0,6):[];
    if(!hits.length){at.hidden=true;return}hi=Math.min(hi,hits.length-1);at.hidden=false;
    at.innerHTML=hits.map((id,i)=>`<button type="button" role="option" class="${i===hi?'on':''}" data-atpick="${i}">${avHTML(id)}${esc(personName(id))}</button>`).join('')};
  const pick=i=>{const a=atQuery();if(!a)return;const ins='@'+personName(hits[i])+' ',end=ta.selectionStart;
    ta.value=ta.value.slice(0,a.from)+ins+ta.value.slice(end);const c=a.from+ins.length;ta.setSelectionRange(c,c);at.hidden=true;ta.focus()};
  ta.addEventListener('input',()=>{hi=0;drawAt()});
  ta.addEventListener('keydown',e=>{
    if(!at.hidden&&hits.length){
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();hi=(hi+(e.key==='ArrowDown'?1:hits.length-1))%hits.length;drawAt();return}
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pick(hi);return}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();at.hidden=true;return}}
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();back.querySelector('.cm-form').requestSubmit()}
  });
  at.addEventListener('mousedown',e=>e.preventDefault());
  at.addEventListener('click',e=>{const b=e.target.closest('[data-atpick]');if(b)pick(+b.dataset.atpick)});
  back.querySelector('.cm-form').addEventListener('submit',e=>{e.preventDefault();
    const text=ta.value.trim();if(!text)return;
    const low=text.toLowerCase(),mentions=others().filter(id=>low.includes('@'+personName(id).toLowerCase()));
    p.comments=p.comments||{};(p.comments[t.id]=p.comments[t.id]||[]).push({id:uid(),by:CL.on?CL.uid:null,at:new Date().toISOString(),text,mentions});
    if(isProj)logAct(p,`commented on "${t.name}"`);if(typeof logTask==='function')logTask(t,`commented: "${text.length>120?text.slice(0,117)+'...':text}"`,false);ta.value='';at.hidden=true;commit();draw();ta.focus()});
  list.addEventListener('click',e=>{const d=e.target.closest('[data-cmdel]');if(!d)return;
    const c=(p.comments[t.id]||[]).find(x=>x.id===d.dataset.cmdel);if(!c)return;
    if(!d.classList.contains('armed')){d.classList.add('armed');d.textContent='Delete?';return}
    c.del=true;c.text='';commit();draw()});
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  back.querySelector('[data-x]').onclick=closeModal;
  setTimeout(()=>ta.focus(),0);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cmt]');if(!b)return;e.stopPropagation();e.preventDefault();const t=byId(b.dataset.cmt);if(t)openComments(t)},true);
// a project copy from another member: keep comments on both sides (by id), a deleted marker wins; tell me when someone mentions me
function mergeExtra(p,x){
  const mine=p.comments||{},theirs=x.comments||{},out={},fresh=[];
  new Set([...Object.keys(mine),...Object.keys(theirs)]).forEach(k=>{
    const by=new Map();(theirs[k]||[]).forEach(c=>by.set(c.id,Object.assign({},c)));
    (mine[k]||[]).forEach(c=>{const r=by.get(c.id);if(!r)by.set(c.id,c);else if(c.del){r.del=true;r.text=''}});
    (theirs[k]||[]).forEach(c=>{if(!(mine[k]||[]).some(y=>y.id===c.id))fresh.push([k,c])});
    out[k]=[...by.values()].sort((a,b)=>a.at<b.at?-1:1)});
  Object.assign(p,x,{comments:out});
  if(modal&&modal._draw&&modal._cmt&&fresh.some(([k])=>k===modal._cmt))setTimeout(()=>modal&&modal._draw&&modal._draw(),0);
  const hit=fresh.find(([k,c])=>!c.del&&c.by!==CL.uid&&(c.mentions||[]).includes(CL.uid)&&Date.now()-+new Date(c.at)<10*60000);
  fresh.filter(([k,c])=>!c.del&&c.by!==CL.uid&&(c.mentions||[]).includes(CL.uid)&&Date.now()-+new Date(c.at)<10*60000).forEach(([k,c])=>{const t=byId(k);if(t)addAlert(`${personName(c.by)} mentioned you on "${t.name}": ${String(c.text||'').slice(0,80)}`,t.id)});
  if(hit){const t=byId(hit[0]);if(t)setTimeout(()=>toast(`${personName(hit[1].by)} mentioned you on "${t.name}".`,()=>openComments(t),'Open'),0)}
}

/* permissions: the owner marks a member as view only; that member can look, comment and track time, but not change the project */
function isRO(p){return !!(p&&CL.on&&p.shared&&projMembers(p).owner!==CL.uid&&(p.perms||{})[CL.uid]==='view')}
const roTask=t=>!!(t&&t.projectId&&isRO(projOfId(t.projectId)));
let roT=0;function roToast(){if(Date.now()-roT<1500)return;roT=Date.now();toast('You can view this project but not change it.')}
function permHTML(p,id,owner,mine){
  if(id===owner)return'';const v=(p.perms||{})[id]==='view'?'view':'edit';
  return mine?`<select class="sp-perm" data-perm="${esc(id)}" data-permp="${p.id}" aria-label="What ${esc(personName(id))} can do"><option value="edit"${v==='edit'?' selected':''}>Can edit</option><option value="view"${v==='view'?' selected':''}>View only</option></select>`
    :v==='view'?' <em class="sp-perm">view only</em>':'';
}
document.addEventListener('change',e=>{const s=e.target.closest('[data-perm]');if(!s)return;
  const p=projOfId(s.dataset.permp),id=s.dataset.perm;if(!p)return;
  p.perms=Object.assign({},p.perms);if(s.value==='view')p.perms[id]='view';else delete p.perms[id];
  logAct(p,s.value==='view'?`made ${personName(id)} view only`:`let ${personName(id)} edit`);commit()});
// what a viewer can still use: tabs, layout, people, comments, the timer, collapsing, links to files
const RO_OK='[data-ptab],[data-pback],[data-board],[data-pshare],[data-cmt],[data-act=toggle],[data-act=focus],[data-ptpl],a[href],.ro-note';
function roBlocked(e){
  const el=e.target;if(!el.closest)return false;
  if(el.closest('.pop,.modal-back'))return false;
  let ro=false;
  if(el.closest('#projPage')&&S.ui.view==='project')ro=isRO(curProject());
  if(!ro){const r=el.closest('#list .task,[data-bid]');if(r)ro=roTask(byId(r.dataset.id||r.dataset.bid))}
  if(!ro||el.closest(RO_OK))return false;
  return true;
}
['click','dblclick','pointerdown','mousedown','dragstart','drop','submit'].forEach(ev=>window.addEventListener(ev,e=>{
  if(!roBlocked(e))return;
  if(ev==='pointerdown'||ev==='mousedown'){if(!e.target.closest('input,textarea,select'))e.preventDefault();e.stopPropagation();return}
  e.preventDefault();e.stopPropagation();if(ev==='click'||ev==='submit'||ev==='drop')roToast()},true));
// keyboard: shortcuts on a selected task of a view only project
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||modal||pop||(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]')))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(['e','x','h','Delete','Backspace'].includes(k)&&typeof kbSel!=='undefined'&&kbSel&&roTask(byId(kbSel))){e.preventDefault();e.stopPropagation();roToast()}
},true);
{const _oe=openEdit;openEdit=function(id){if(roTask(byId(id))){roToast();return}return _oe.apply(this,arguments)}}
{const _rp=renderProjPage;renderProjPage=function(){_rp();const p=curProject(),ro=isRO(p),page=$('#projPage');
  page.classList.toggle('ro',ro);if(!ro)return;
  const h=$('#projHead .pp-titlerow');if(h&&!$('#projHead .ro-note'))h.insertAdjacentHTML('afterend','<p class="ro-note">View only. You can look at this project and comment on tasks, but not change it.</p>');
  $('#projBody').querySelectorAll('input,textarea').forEach(x=>{x.readOnly=true});
  $('#projBody').querySelectorAll('select').forEach(x=>{x.disabled=true})}}
