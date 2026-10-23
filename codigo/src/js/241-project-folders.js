/* ---------- v76: project folders and project order in the sidebar (Pedro's list item 6) ----------
   Folders S.folders [{id,name,closed}] (synced key); a project's folder is p.folder (travels with S.projects).
   The sidebar shows loose projects first, then each folder with its projects; S.projects order is the list order.
   Drag a project (mouse) above/below another one or onto a folder header; drag a folder header to reorder folders.
   The project pencil popup has Folder + Move up/down (works on touch too); the folder pencil renames or deletes. */
SYNC_KEYS.push('folders');
const folders=()=>S.folders||(S.folders=[]);
const folderOf=p=>p&&p.folder&&folders().some(f=>f.id===p.folder)?p.folder:'';
const sideProjs=()=>S.projects.filter(p=>!p.tabOf);
{const _r=render;render=function(){const out=_r.apply(this,arguments);try{paintFolders()}catch(e){console.error(e)}return out}}
function paintFolders(){
  const ul=$('#plist');if(!ul)return;
  const lis=[...ul.querySelectorAll(':scope > li')].filter(li=>{const d=li.querySelector('[data-proj]');return d&&d.dataset.proj!=='all'});
  const tail=ul.querySelector(':scope > li:has(.parchtoggle)')||ul.querySelector(':scope > li.mobile-add');
  folders().forEach(f=>{
    const kids=lis.filter(li=>folderOf(S.projects.find(p=>p.id===li.querySelector('[data-proj]').dataset.proj))===f.id);
    const n=kids.reduce((s,li)=>s+(+((li.querySelector('.pcount')||{}).textContent)||0),0);
    const fl=document.createElement('li');fl.className='pfold'+(f.closed?' closed':'');fl.dataset.fold=f.id;
    fl.innerHTML=`<div class="pitem pfhead" role="button" tabindex="0" data-pfold="${f.id}" aria-expanded="${!f.closed}" title="${f.closed?'Open':'Close'} folder"><span class="pfarr">${f.closed?'▸':'▾'}</span>${icons.folder}<span class="pname">${esc(f.name)}</span><span class="pcount">${n}</span><button class="pedit" type="button" data-fedit="${f.id}" aria-label="Edit folder">${icons.pencil}</button></div><ul class="pfkids"></ul>`;
    const box=fl.querySelector('.pfkids');kids.forEach(li=>box.appendChild(li));
    if(!kids.length)box.innerHTML='<li class="pfempty">Drag projects here</li>';
    ul.insertBefore(fl,tail)});
}
icons.folder='<svg class="pfic" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1.75 4.25c0-.83.67-1.5 1.5-1.5h3l1.5 1.75h5c.83 0 1.5.67 1.5 1.5v5.75c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

function openFolderPop(anchor,f){let armed=false;
  openPop(anchor,`<form class="pop-form"><strong>${f?'Edit folder':'New folder'}</strong>
    <input type="text" id="fd-name" placeholder="Folder name" value="${f?esc(f.name):''}" maxlength="60" aria-label="Folder name">
    ${f?'':'<p class="fd-hint">Then drag projects onto it, or pick the folder with the pencil on a project.</p>'}
    <div class="pop-actions">${f?'<button type="button" class="danger-link" data-del>Delete</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    const del=el.querySelector('[data-del]');
    if(del)del.onclick=()=>{if(!armed){armed=true;del.textContent='Click again (projects are kept)';return}
      S.folders=folders().filter(x=>x!==f);S.projects.forEach(p=>{if(p.folder===f.id)delete p.folder});closePop();commit();toast(`Folder "${f.name}" deleted. Its projects are still in the list.`)};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const inp=el.querySelector('#fd-name'),name=inp.value.trim();
      if(!name){inp.classList.add('invalid');inp.focus();return}
      if(f)f.name=name;else folders().push({id:uid(),name,closed:false});closePop();commit()};
    setTimeout(()=>el.querySelector('#fd-name').focus(),0)});
}
$('#addProject').insertAdjacentHTML('afterend','<button class="addlink sidebottom" id="addFolder" type="button">+ New folder</button>');
$('#addFolder').onclick=e=>openFolderPop(e.currentTarget,null);

/* project pencil: Folder select + Move up / Move down */
function moveProj(p,dir){const f=folderOf(p),L=sideProjs().filter(x=>folderOf(x)===f&&(!x.archived||S.ui.showArchProj)),i=L.indexOf(p),o=L[i+dir];if(!o)return false;
  const a=S.projects.indexOf(p),b=S.projects.indexOf(o);S.projects[a]=o;S.projects[b]=p;return true}
{const _po=openProjPop;openProjPop=function(anchor,proj){_po.apply(this,arguments);const el=pop&&pop.el;if(!el)return;
  const at=el.querySelector('.pop-actions');if(!at)return;
  const cur=proj?folderOf(proj):'';
  at.insertAdjacentHTML('beforebegin',`<label class="pj-folder"><span>Folder</span><select id="pj-folder"><option value="">No folder</option>${folders().map(f=>`<option value="${f.id}"${f.id===cur?' selected':''}>${esc(f.name)}</option>`).join('')}<option value="+">+ New folder…</option></select></label>${proj?`<div class="pj-move"><span>Position in the list</span><button type="button" class="btn" data-pmv="-1" title="Move up">↑ Up</button><button type="button" class="btn" data-pmv="1" title="Move down">↓ Down</button></div>`:''}`);
  const sel=el.querySelector('#pj-folder');
  sel.insertAdjacentHTML('afterend','<input type="text" id="pj-newfolder" placeholder="New folder name" maxlength="60" hidden>');
  const nf=el.querySelector('#pj-newfolder');
  sel.onchange=()=>{nf.hidden=sel.value!=='+';if(!nf.hidden)nf.focus()};
  el.querySelectorAll('[data-pmv]').forEach(b=>b.onclick=()=>{if(!moveProj(proj,+b.dataset.pmv))return;save();render();
    const a=document.querySelector(`#plist .pitem[data-proj="${proj.id}"]`);if(a&&pop){pop.anchor=a;place(pop.el,a)}});
  const fm=el.querySelector('form'),sub=fm.onsubmit;
  fm.onsubmit=e=>{let v=sel.value;if(v==='+'){const nm=nf.value.trim();v='';if(nm){const f={id:uid(),name:nm,closed:false};folders().push(f);v=f.id}}const before=new Set(S.projects.map(p=>p.id));sub(e);
    const p=proj||S.projects.find(x=>!before.has(x.id));if(!p)return;if(v)p.folder=v;else delete p.folder;
    const f=folders().find(x=>x.id===v);if(f)f.closed=false;save();render()}}}

/* folder header: click opens/closes, pencil edits */
$('#plist').addEventListener('click',e=>{
  const ed=e.target.closest('[data-fedit]');if(ed){e.stopPropagation();openFolderPop(ed.closest('.pitem'),folders().find(f=>f.id===ed.dataset.fedit));return}
  const h=e.target.closest('[data-pfold]');if(!h)return;e.stopPropagation();
  const f=folders().find(x=>x.id===h.dataset.pfold);if(f){f.closed=!f.closed;commit()}},true);
$('#plist').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-pfold]')){e.preventDefault();e.target.click()}});

/* drag with the mouse: projects onto/between projects and folders, folders between folders */
{let dr=null,eat=false;const pl=$('#plist');
  const clear=()=>pl.querySelectorAll('.pd-before,.pd-after,.pd-in').forEach(x=>x.classList.remove('pd-before','pd-after','pd-in'));
  const target=(x,y)=>{const el=document.elementFromPoint(x,y),it=el&&el.closest('#plist .pitem');if(!it||it===dr.el)return null;
    const r=it.getBoundingClientRect(),top=y<r.top+r.height/2;
    if(dr.fold){const h=it.closest('.pfold');if(!h||h.dataset.fold===dr.id)return null;const hd=h.querySelector('.pfhead');
      return {el:hd,fold:h.dataset.fold,pos:it===hd&&top?'before':'after'}}
    if(it.matches('[data-pfold]'))return {el:it,fold:it.dataset.pfold,pos:'in'};
    const pid=it.dataset.proj;if(!pid)return null;
    if(pid==='all')return {el:it,pid,pos:'after'};
    return {el:it,pid,pos:top?'before':'after'}};
  pl.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||e.target.closest('button:not(.pitem),input,select'))return;
    const it=e.target.closest('.pitem');if(!it)return;const pid=it.dataset.proj,fid=it.dataset.pfold;
    if(!(fid||pid&&pid!=='all'&&S.projects.some(p=>p.id===pid)))return;
    dr={el:it,id:fid||pid,fold:!!fid,x:e.clientX,y:e.clientY,on:false,t:null}});
  addEventListener('pointermove',e=>{if(!dr)return;
    if(!dr.on){if(Math.hypot(e.clientX-dr.x,e.clientY-dr.y)<6)return;dr.on=true;dr.el.classList.add('pdragging');document.body.classList.add('pdrag-on')}
    clear();dr.t=target(e.clientX,e.clientY);if(dr.t)dr.t.el.classList.add('pd-'+dr.t.pos)});
  addEventListener('pointerup',()=>{if(!dr)return;const d=dr;dr=null;clear();d.el.classList.remove('pdragging');document.body.classList.remove('pdrag-on');
    if(!d.on)return;eat=true;setTimeout(()=>eat=false,0);const t=d.t;if(!t)return;
    if(d.fold){const L=folders(),f=L.find(x=>x.id===d.id),o=L.find(x=>x.id===t.fold);if(!f||!o)return;
      L.splice(L.indexOf(f),1);L.splice(L.indexOf(o)+(t.pos==='after'?1:0),0,f);commit();return}
    const p=S.projects.find(x=>x.id===d.id);if(!p)return;
    if(t.pos==='in'){p.folder=t.fold;const f=folders().find(x=>x.id===t.fold);if(f)f.closed=false;
      S.projects.splice(S.projects.indexOf(p),1);S.projects.push(p);commit();toast(`"${p.name}" moved to the folder "${f?f.name:''}".`);return}
    S.projects.splice(S.projects.indexOf(p),1);
    if(t.pid==='all'){delete p.folder;S.projects.unshift(p);commit();return}
    const o=S.projects.find(x=>x.id===t.pid);if(!o){S.projects.push(p);commit();return}
    const f=folderOf(o);if(f)p.folder=f;else delete p.folder;
    S.projects.splice(S.projects.indexOf(o)+(t.pos==='after'?1:0),0,p);commit()});
  pl.addEventListener('click',e=>{if(eat){e.stopPropagation();e.preventDefault();eat=false}},true);
  pl.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('.pitem'))e.preventDefault()});
}
