/* ---------- project extras: deadline + progress, archive, Kanban board, Files tab, Activity tab ---------- */
// project fields: due (ISO), archived, archivedAt, files [{id,kind:'link'|'file',name,url,size,mime,at,by}], activity [{id,at,by,txt}]
// task field: doing (Kanban "Doing" column)
const projTasksAll=p=>S.tasks.filter(t=>t.projectId===p.id&&!t.stepOf);
function projProgress(p){const ts=projTasksAll(p),d=ts.filter(t=>t.done).length;return{n:ts.length,d,pct:ts.length?Math.round(d/ts.length*100):0}}
function daysLeft(iso){const a=isoDate(iso),b=isoDate(todayISO());return Math.round((a-b)/DAY)}
function projMetaHTML(p){
  const G=projProgress(p);let dl='';
  if(p.due){const n=daysLeft(p.due),cls=p.archived?'':n<0?'late':n<=3?'soon':'';
    dl=`<button class="pm-due ${cls}" type="button" data-pdue title="Change the deadline">Deadline <b class="mono">${isoToUS(p.due)}</b>${p.archived?'':n<0?` · ${-n} day${n===-1?'':'s'} late`:n===0?' · today':` · ${n} day${n===1?'':'s'} left`}</button>`}
  else dl=`<button class="pm-due add" type="button" data-pdue>+ Deadline</button>`;
  return `<div class="pp-meta">${dl}
    <div class="pm-prog" title="${G.d} of ${G.n} tasks done"><div class="progress${G.pct===100&&G.n?' ok':''}"><i style="width:${G.pct}%"></i></div><span><b class="mono">${G.pct}%</b> · ${G.d} of ${G.n} done</span></div>
    <button class="linkbtn pm-arch" type="button" data-parch>${p.archived?'Restore project':'Mark project complete'}</button></div>
    ${p.archived?`<div class="pm-archived">This project is complete and archived${p.archivedAt?` since ${tsToUS(p.archivedAt)}`:''}. It is hidden from the sidebar and the add bars. <button class="linkbtn" type="button" data-parch>Restore</button></div>`:''}`;
}
function openDeadlinePop(anchor,p){
  openPop(anchor,`<form class="pop-form"><strong>Project deadline</strong>
    <input type="text" id="pd-date" class="mono" placeholder="MM/DD/YYYY" value="${isoToUS(p.due||'')}" aria-label="Deadline">
    <div class="pop-actions">${p.due?'<button type="button" class="danger-link" data-clear>Remove</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    const inp=el.querySelector('#pd-date');bindDate(inp);
    el.querySelector('[data-x]').onclick=closePop;
    const c=el.querySelector('[data-clear]');if(c)c.onclick=()=>{p.due='';logAct(p,'removed the deadline');closePop();commit()};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const iso=parseDate(inp.value);if(!iso){inp.classList.add('invalid');inp.focus();return}
      p.due=iso;logAct(p,`set the deadline to ${isoToUS(iso)}`);closeDP();closePop();commit()};
  });
}
function toggleArchive(p){
  p.archived=!p.archived;p.archivedAt=p.archived?new Date().toISOString():null;
  if(p.archived){if($('#c-proj').value===p.id)$('#c-proj').value='';if(S.ui.project===p.id)S.ui.project='all'}
  logAct(p,p.archived?'marked the project complete':'restored the project');commit();
  toast(p.archived?`"${p.name}" is complete and archived.`:`"${p.name}" is back in your projects.`,()=>{p.archived=!p.archived;commit()});
}
function archProjToggleHTML(){
  const n=S.projects.filter(p=>p.archived).length;if(!n)return'';
  return `<li><button class="addlink parchtoggle" type="button" data-archproj>${S.ui.showArchProj?'Hide':'Show'} archived (${n})</button></li>`;
}
$('#plist').addEventListener('click',e=>{if(e.target.closest('[data-archproj]')){S.ui.showArchProj=!S.ui.showArchProj;commit()}});

/* activity log: newest first, shared with the project's members */
function logAct(p,txt){if(!p)return;p.activity=p.activity||[];p.activity.unshift({id:uid(),at:new Date().toISOString(),by:CL.on?CL.uid:null,txt});if(p.activity.length>200)p.activity.length=200}
const agoTxt=iso=>{const m=Math.round((Date.now()-+new Date(iso))/60000);return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:m<2880?'yesterday':tsToUS(iso)};
function renderActivityTab(p,body){
  const A=p.activity||[];
  body.innerHTML=A.length?`<ol class="act-list">${A.map(a=>`<li>${CL.on&&a.by?avHTML(a.by):'<i class="av act-me">•</i>'}<span class="act-t"><b>${esc(a.by&&CL.on?personName(a.by):'You')}</b> ${esc(a.txt)}</span><span class="act-at" title="${esc(new Date(a.at).toLocaleString())}">${agoTxt(a.at)}</span></li>`).join('')}</ol>`
    :`<div class="empty"><strong>No activity yet</strong>Adding or finishing tasks, notes, files and deadline changes show up here.</div>`;
}
{const _complete=complete,_reopen=reopen,_add=addFromBar;
  complete=function(t){const p=t.projectId&&S.projects.find(x=>x.id===t.projectId),steps=stepsLeft(t)>1,nm=t.name;_complete(t);if(p)logAct(p,steps?`finished step "${nm}"`:`completed "${nm}"`)};
  reopen=function(t){_reopen(t);const p=t.projectId&&S.projects.find(x=>x.id===t.projectId);if(p)logAct(p,`reopened "${t.name}"`)};
  addFromBar=function(k,o){const t=_add(k,o),p=t.projectId&&S.projects.find(x=>x.id===t.projectId);if(p)logAct(p,`added the task "${t.name}"`);return t};}
pp.addEventListener('click',e=>{const p=curProject();if(!p)return;
  if(e.target.closest('[data-pnew]'))logAct(p,'added a note');
  const d=e.target.closest('[data-pdue]');if(d){openDeadlinePop(d,p);return}
  if(e.target.closest('[data-parch]')){toggleArchive(p);return}
});

/* Kanban board in the Tasks tab: To do / Doing / Done */
const COLS=[['todo','To do'],['doing','Doing'],['done','Done']];
const colOf=t=>t.done?'done':t.doing?'doing':'todo';
// boardBarHTML, boardHTML and moveToCol are defined in full in 173 (custom columns); these names are kept so 173 can assign them
function boardBarHTML(p){return''}
function boardHTML(p){return''}
function moveToCol(t,k){}
let bDrag=null;
pp.addEventListener('click',e=>{
  const b=e.target.closest('[data-board]');if(b){S.ui.projBoard=b.dataset.board==='1';commit();return}
  const mv=e.target.closest('[data-bmove]');if(mv){const t=byId(mv.closest('[data-bid]').dataset.bid);if(t)moveToCol(t,mv.dataset.bmove);return}
  const c=e.target.closest('[data-bid]');if(c&&!e.target.closest('button'))openEdit(c.dataset.bid);
});
pp.addEventListener('dragstart',e=>{const c=e.target.closest('[data-bid]');if(!c)return;bDrag=c.dataset.bid;c.classList.add('dragging');try{e.dataTransfer.setData('text/plain',bDrag);e.dataTransfer.effectAllowed='move'}catch(_){}});
pp.addEventListener('dragover',e=>{if(!bDrag)return;const col=e.target.closest('[data-bcol]');pp.querySelectorAll('.bcol.drop').forEach(x=>x!==col&&x.classList.remove('drop'));if(!col)return;e.preventDefault();col.classList.add('drop')});
pp.addEventListener('drop',e=>{if(!bDrag)return;const col=e.target.closest('[data-bcol]'),id=bDrag;bDrag=null;if(!col)return;e.preventDefault();const t=byId(id);if(t)moveToCol(t,col.dataset.bcol)});
pp.addEventListener('dragend',()=>{bDrag=null;pp.querySelectorAll('.bcol.drop,.bcard.dragging').forEach(x=>x.classList.remove('drop','dragging'))});

/* Files tab: links and small attachments kept with the project */
const MAX_FILE=2*1024*1024;
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?Math.round(n/1024)+' KB':n+' B';
const fileIcon=f=>f.kind==='link'?'🔗':/^image\//.test(f.mime||'')?'🖼':/pdf/.test(f.mime||'')?'📄':'📎';
function renderFilesTab(p,body){
  const F=p.files||[];
  body.innerHTML=`<form class="fl-add" data-fladd autocomplete="off">
      <input type="text" id="fl-url" placeholder="Paste a link (https://...)" aria-label="Link">
      <input type="text" id="fl-name" placeholder="Name (optional)" aria-label="Link name">
      <button class="btn primary" type="submit">Add link</button>
      <label class="btn">Upload file<input type="file" id="fl-file" hidden multiple></label></form>
    <p class="cal-hint">Files up to 2 MB are kept inside the project${CL.on?' and shared with its members':''}. For bigger files, add a link to where they live.</p>
    ${F.length?`<ul class="fl-list">${F.map(f=>`<li data-fid="${f.id}">
      ${/^image\//.test(f.mime||'')&&f.url?`<img class="fl-thumb" src="${esc(f.url)}" alt="">`:`<span class="fl-ic">${fileIcon(f)}</span>`}
      <div class="fl-main"><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"${f.kind==='file'?` download="${esc(f.name)}"`:''}>${esc(f.name)}</a>
      <span class="fl-meta">${f.kind==='link'?esc(f.url.replace(/^https?:\/\//,'').slice(0,60)):fmtSize(f.size||0)} · added ${tsToUS(f.at)}${CL.on&&f.by?` by ${esc(personName(f.by))}`:''}</span></div>
      <button type="button" class="linkbtn danger-link" data-fldel>Remove</button></li>`).join('')}</ul>`
    :`<div class="empty"><strong>No files or links yet</strong>Add a link to a doc, a site or a folder, or upload a small file.</div>`}`;
}
function addProjFile(p,f){p.files=p.files||[];p.files.unshift(Object.assign({id:uid(),at:new Date().toISOString(),by:CL.on?CL.uid:null},f));logAct(p,`added ${f.kind==='link'?'the link':'the file'} "${f.name}"`)}
pp.addEventListener('submit',e=>{
  if(!e.target.matches('[data-fladd]'))return;e.preventDefault();const p=curProject(),ui=$('#fl-url'),ni=$('#fl-name');
  let url=ui.value.trim();if(!url){ui.focus();return}if(!/^[a-z]+:\/\//i.test(url))url='https://'+url;
  try{const u=new URL(url);if(!/^https?:$/.test(u.protocol))throw 0}catch(_){ui.classList.add('invalid');ui.focus();return}
  addProjFile(p,{kind:'link',name:ni.value.trim()||url.replace(/^https?:\/\//,'').replace(/\/$/,''),url});commit();
});
pp.addEventListener('change',async e=>{
  if(e.target.id!=='fl-file')return;const p=curProject(),files=[...e.target.files];let added=0;
  for(const file of files){
    if(file.size>MAX_FILE){toast(`"${file.name}" is ${fmtSize(file.size)}. Files up to 2 MB fit here; add a link for bigger ones.`);continue}
    const url=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ok(null);r.readAsDataURL(file)});if(!url)continue;
    addProjFile(p,{kind:'file',name:file.name,url,size:file.size,mime:file.type});added++}
  if(added)commit();
});
pp.addEventListener('click',e=>{
  const d=e.target.closest('[data-fldel]');if(!d)return;const p=curProject(),id=d.closest('[data-fid]').dataset.fid,i=p.files.findIndex(f=>f.id===id);if(i<0)return;
  const f=p.files.splice(i,1)[0];logAct(p,`removed "${f.name}"`);commit();toast(`Removed "${f.name}".`,()=>{p.files.splice(i,0,f);commit()});
});
