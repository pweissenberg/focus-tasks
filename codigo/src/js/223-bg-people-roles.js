/* ---------- task background (t.bg; Settings: tag color on the bar only or on the whole task), Free "Box",
   role in project (p.roles {userId:text}) and the People layout of a project's tasks (S.ui.projPeople + S.ui.ppl filters) ---------- */
const tagFill=()=>S.prefs.tagFill==='fill';
{const _row=row;row=function(t,depth){const el=_row(t,depth);
  const c=t.bg||(tagFill()&&!t.stepOf?(tagOf(t)||{}).color:null);
  if(c){el.style.setProperty('--tbg',c);el.classList.add(t.bg?'has-bg':'tag-fill')}
  return el}}
{const _r=render;render=function(){_r.apply(this,arguments);
  list.querySelectorAll('.mt-wrap').forEach(w=>{const r=w.previousElementSibling;if(!r)return;const c=r.style.getPropertyValue('--tbg');if(c&&!r.classList.contains('hold')){w.style.setProperty('--tbg',c);w.classList.add(r.classList.contains('has-bg')?'has-bg':'tag-fill')}})}}
// edit window: background color
{const _oe=openEdit;openEdit=function(id){_oe.apply(this,arguments);const t=byId(id),f=modal&&modal.querySelector('form');if(!t||!f||!f.querySelector('#ed-name'))return;
  let bg=t.bg||null;
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<div class="fld"><span>BACKGROUND</span><div class="swatches" id="ed-bg">${swatchesHTML(bg,true).replace('>auto<','>none<').replace("title=\"Use the tag's color\"",'title="No background color"')}</div></div>`);
  bindSwatches(f.querySelector('#ed-bg'),c=>{bg=c||null});
  const sub=f.onsubmit;f.onsubmit=e=>{t.bg=bg;return sub.call(f,e)}}}
// Settings: tag color on the bar only, or on the background too
{const _os=openSettings;openSettings=function(){_os.apply(this,arguments);const f=modal&&modal.querySelector('form.settings');if(!f)return;
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<label class="fld"><span>TAG COLOR ON TASKS</span><select id="st-fill"><option value="bar"${tagFill()?'':' selected'}>Only the side bar</option><option value="fill"${tagFill()?' selected':''}>Side bar and background</option></select></label>`);
  f.querySelector('#st-fill').onchange=e=>{S.prefs.tagFill=e.target.value;save();render()}}}
// Free: a text box with a border, larger by default
{const _aci=addCanvasItem;addCanvasItem=function(type,x,y,extra){if(type==='box'&&!(extra&&extra.w))extra=Object.assign({w:240,h:140},extra||{});return _aci.call(this,type,x,y,extra)}}

/* role in project */
const roleOf=(p,id)=>((p&&p.roles)||{})[id]||'';
{const _tt=renderTeamTab;renderTeamTab=function(p,body){_tt(p,body);const mine=projMembers(p).owner===CL.uid;
  body.querySelectorAll('.tm-card').forEach((c,i)=>{const id=projMembers(p).members[i];if(!id)return;const r=roleOf(p,id),who=c.querySelector('.tmc-who');
    who.insertAdjacentHTML('beforeend',mine?`<input class="tmc-rolein" type="text" data-role="${esc(id)}" value="${esc(r)}" placeholder="Role in project" maxlength="40" aria-label="Role in project of ${esc(personName(id))}">`:r?`<em class="tmc-roletx">${esc(r)}</em>`:'')})}}
pp.addEventListener('change',e=>{const i=e.target.closest('[data-role]');if(!i)return;const p=curProject();if(!p)return;
  p.roles=Object.assign({},p.roles);const v=i.value.trim();if(v)p.roles[i.dataset.role]=v;else delete p.roles[i.dataset.role];
  logAct(p,v?`set the role of ${personName(i.dataset.role)} to "${v}"`:`cleared the role of ${personName(i.dataset.role)}`);commit()});
// the members popover shows each role next to the name
{const _osp=openProjSharePop;openProjSharePop=function(anchor,p){_osp(anchor,p);const el=pop&&pop.el;if(!el)return;
  const paint=()=>el.querySelectorAll('.sp-mem .sp-row').forEach((r,i)=>{const id=projMembers(p).members[i],n=r.querySelector('.sp-n');if(id&&n&&roleOf(p,id)&&!n.querySelector('.sp-role'))n.insertAdjacentHTML('beforeend',` <em class="sp-role">${esc(roleOf(p,id))}</em>`)});
  paint();new MutationObserver(paint).observe(el.querySelector('.sp-mem'),{childList:true})}}

/* People layout: one column per person with their tasks, filters for person, role, tag, status and text */
{const _bb=boardBarHTML;boardBarHTML=function(p){
  let h=_bb(p);const on=!!S.ui.projPeople;
  h=h.replace(/<button class="seg( on)?" type="button" data-board="(\d)">/g,(m,o,i)=>`<button class="seg${on?'':o||''}" type="button" data-board="${i}">`);
  h=h.replace('</div>',`<button class="seg${on?' on':''}" type="button" data-board="3">People</button></div>`);
  if(on)h=h.replace(/<span class="cal-hint">[\s\S]*?<\/span>/,'').replace(/<button class="linkbtn" type="button" data-secnew>\+ Section<\/button>/,'').replace(/<\/div>\s*$/,'<span class="cal-hint">Each person with the tasks they are responsible for. Pick who is responsible with the person button on a task.</span></div>');
  return h}}
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#projPage [data-board]');if(!b)return;
  if(typeof roBlocked==='function'&&roBlocked(e))return;
  e.stopPropagation();const v=b.dataset.board;S.ui.projPeople=v==='3';S.ui.projBoard=v==='1'||v==='3';S.ui.projGantt=v==='2';commit()},true);
{const _bh=boardHTML;boardHTML=function(p){return S.ui.projPeople?peopleHTML(p):_bh(p)}}
function peopleHTML(p){
  const f=S.ui.ppl=Object.assign({who:'',role:'',tag:'',st:'open',q:''},S.ui.ppl),m=projMembers(p),ids=m.members.length?m.members:[CL.uid];
  const roles=[...new Set(ids.map(id=>roleOf(p,id)).filter(Boolean))];
  const q=f.q.trim().toLowerCase();
  const ts=S.tasks.filter(t=>t.projectId===p.id&&!t.stepOf&&(f.st==='all'||(f.st==='done'?t.done:!t.done))&&(!f.tag||(f.tag==='none'?!t.tagId:t.tagId===f.tag))&&(!q||t.name.toLowerCase().includes(q)||(t.note||'').toLowerCase().includes(q)));
  let cols=[...ids.map(id=>({id,name:personName(id),role:roleOf(p,id)})),{id:'',name:'Nobody',role:''}];
  cols=cols.filter(c=>(!f.who||f.who===(c.id||'none'))&&(!f.role||(f.role==='none'?!c.role:c.role===f.role)));
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${cur===v?' selected':''}>${esc(l)}</option>`;
  const card=t=>`<div class="pl-card${t.done?' done':''}" data-plid="${t.id}" style="--c:${colorOf(t)}"><label class="mt-check"><input type="checkbox" data-plcheck${t.done?' checked':''} aria-label="Done"><span></span></label>
    <div class="pl-b"><span class="pl-n">${esc(t.name)}</span><span class="pl-m">${tagOf(t)?`<span class="chip" style="--dot:${tagOf(t).color}"><i></i>${esc(tagOf(t).name)}</span>`:''}${t.due?`<span>Due ${isoToUS(t.due)}</span>`:''}${t.onHold?'<span>On hold</span>':''}${t.est?`<span>${fmtEst(t.est)}</span>`:''}</span></div></div>`;
  return `<div class="pl-filters">
      <select data-pl="who" aria-label="Person"><option value="">Everyone</option>${ids.map(id=>opt(id,personName(id),f.who)).join('')}${opt('none','Nobody',f.who)}</select>
      <select data-pl="role" aria-label="Role in project"><option value="">Every role</option>${roles.map(r=>opt(r,r,f.role)).join('')}${opt('none','No role',f.role)}</select>
      <select data-pl="tag" aria-label="Tag"><option value="">Every tag</option>${S.tags.map(g=>opt(g.id,g.name,f.tag)).join('')}${opt('none','No tag',f.tag)}</select>
      <select data-pl="st" aria-label="Status">${opt('open','Open',f.st)}${opt('done','Done',f.st)}${opt('all','Open and done',f.st)}</select>
      <input type="search" data-pl="q" value="${esc(f.q)}" placeholder="Search tasks" aria-label="Search tasks">
      ${f.who||f.role||f.tag||f.q||f.st!=='open'?'<button type="button" class="linkbtn" data-plclear>Clear</button>':''}</div>
    <div class="pl-cols" style="--n:${Math.max(1,cols.length)}">${cols.map(c=>{const mine=ts.filter(t=>(t.assignee||'')===c.id||(!c.id&&t.assignee&&!ids.includes(t.assignee)));
      return `<section class="pl-col"><header>${c.id?avHTML(c.id):'<i class="av pl-nobody">?</i>'}<div><b>${esc(c.id===CL.uid&&c.name!=='You'?c.name+' (you)':c.name)}</b>${c.role?`<span>${esc(c.role)}</span>`:''}</div><em>${mine.length}</em></header>
        ${mine.length?mine.map(card).join(''):'<p class="pl-empty">No tasks</p>'}</section>`}).join('')||'<p class="pl-empty">Nobody matches these filters.</p>'}</div>`;
}
pp.addEventListener('change',e=>{const s=e.target.closest('[data-pl]');if(!s||s.dataset.pl==='q')return;S.ui.ppl[s.dataset.pl]=s.value;commit()});
pp.addEventListener('input',e=>{const s=e.target.closest('[data-pl="q"]');if(!s)return;S.ui.ppl.q=s.value;const c=s.selectionStart;render();const n=$('#projBody [data-pl="q"]');if(n){n.focus();try{n.setSelectionRange(c,c)}catch(_){}}});
pp.addEventListener('click',e=>{
  if(e.target.closest('[data-plclear]')){S.ui.ppl={who:'',role:'',tag:'',st:'open',q:''};commit();return}
  const c=e.target.closest('[data-plid]');if(!c)return;const t=byId(c.dataset.plid);if(!t)return;
  if(e.target.closest('.mt-check')){if(e.target.matches('input')){if(t.done)reopen(t);else complete(t);commit()}return}
  openEdit(t.id)});
