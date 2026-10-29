/* ---------- v91 (Pedro): a project in the sidebar opens its page (no filter); the list filter is the "All projects" dropdown at the left of the Sort row ---------- */
// sidebar: a project click goes straight to its page ("All projects" keeps the old behaviour)
$('#plist').addEventListener('click',e=>{if(e.defaultPrevented)return;
  if(e.target.closest('[data-pedit],[data-newproj],[data-pgo],[data-fedit],[data-pfold]'))return;
  const p=e.target.closest('[data-proj]');if(!p||p.dataset.proj==='all')return;
  e.stopPropagation();if(!(S.ui.view==='project'&&S.ui.projectPage===p.dataset.proj))openProject(p.dataset.proj)},true);
// the project page sets S.ui.project; coming back to the lists brings back the dropdown's choice
{const _op=openProject;openProject=function(id){if(S.ui.view!=='project')S.ui.listProj=S.ui.project||'all';_op(id)}}
const pfOk=id=>id==='all'||S.projects.some(p=>p.id===id);
{const _r=render;render=function(){const u=S.ui;
  if(u.view!=='project'&&u._onPage){u.project=pfOk(u.listProj)?u.listProj:'all';const c=$('#c-proj');if(c)c.value=u.project==='all'?'':u.project}
  u._onPage=u.view==='project';_r();paintPf();
  // the sidebar no longer filters, so outside a project page only "All projects" is lit
  if(u.view!=='project')document.querySelectorAll('#plist .pitem[data-proj]').forEach(x=>x.classList.toggle('on',x.dataset.proj==='all'))}}
function paintPf(){const so=$('#sorts');if(!so)return;let b=$('#pfBtn');
  if(!b){b=document.createElement('button');b.type='button';b.id='pfBtn';b.className='seg srbtn pfbtn';b.setAttribute('aria-haspopup','menu');b.title='Show the tasks of one project';so.prepend(b)}
  const p=S.ui.project!=='all'&&projOfId(S.ui.project);
  b.classList.toggle('on',!!p);b.innerHTML=`${icons.folder||''}<span>${p?esc(projFull(p)):'All projects'}</span><i aria-hidden="true">▾</i>`}
function pfMenuHTML(){const cur=S.ui.project||'all',it=(id,label,sub)=>`<button type="button" role="menuitemradio" aria-checked="${cur===id}" data-pf="${id}"${sub?' class="sr-sub"':''}>${esc(label)}</button>`;
  const mains=S.projects.filter(p=>!p.tabOf&&(!p.archived||p.id===cur));
  return `<div class="acct-menu sr-menu pf-menu" role="menu" aria-label="Projects">${it('all','All projects')}${mains.map(p=>it(p.id,p.name)+projTabs(p).map(x=>it(x.id,x.name,1)).join('')).join('')}${mains.length?'':'<div class="asg-h">No projects yet</div>'}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#pfBtn');if(!b)return;e.stopPropagation();
  openPop(b,pfMenuHTML(),el=>{el.classList.add('pop-menu');place(el,b);
    el.addEventListener('click',ev=>{const x=ev.target.closest('[data-pf]');if(!x)return;S.ui.project=x.dataset.pf;
      $('#c-proj').value=S.ui.project==='all'?'':S.ui.project;closePop();commit()})})},true);
