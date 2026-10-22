/* ---------- v72: no built-in examples, default tag per project, history title fit, On hold rows folded ----------
   1. A fresh start is empty (020 seeds examples only for the tests, 229/231/234 demos only with window.FOCUS_DEMO).
      Data saved before v72 loses those examples once per account (S.prefs.exClean); anything else is kept. */
const EX_SEED=[['Econs - Peru','2026-09-29T14:00:00'],['BeP -> Python','2026-10-05T10:00:00'],['Tanzania','2026-10-01T09:00:00'],['Econs','2026-09-30T16:00:00'],
  ['Draft research agenda for 2027','2026-09-15T09:00:00'],['Learn the basics of Rust','2026-08-20T09:00:00'],['Send Demand slides','2026-09-28T11:00:00']];
const EX_DEPS=['Run the survey analysis','Write the survey report','Present the survey results'];
const exTask=t=>String(t.id).startsWith('demo-')||EX_SEED.some(([n,c])=>t.createdAt===c&&(t.name===n||(t.steps||[]).some(s=>s.name===n)))||(EX_DEPS.includes(t.name)&&!t.done);
if(!(window.FOCUS_CONFIG||{}).url&&!window.FOCUS_DEMO&&!window.FOCUS_SEED){try{
  const K='focus-localdb',d=JSON.parse(localStorage.getItem(K)||'null');
  if(d&&Array.isArray(d.shared_tasks)&&d.shared_tasks.some(r=>String(r.id).startsWith('demo-'))){d.shared_tasks=d.shared_tasks.filter(r=>!String(r.id).startsWith('demo-'));localStorage.setItem(K,JSON.stringify(d))}
}catch(e){}}
function cleanExamples(){
  const gone=new Set(S.tasks.filter(exTask).map(t=>t.id));
  S.tasks.forEach(t=>{if(t.stepOf&&gone.has(t.stepOf))gone.add(t.id)});
  S.tasks=S.tasks.filter(t=>!gone.has(t.id));
  S.tasks.forEach(t=>{if(t.parentId&&gone.has(t.parentId))t.parentId=null;if(t.waits)t.waits=t.waits.filter(id=>!gone.has(id))});
  const empty=p=>!S.tasks.some(t=>t.projectId===p.id)&&!(p.notesList||[]).length&&!(p.canvas||[]).length&&!(p.strokes||[]).length&&!(p.tree||[]).length&&!S.projects.some(x=>x.tabOf===p.id);
  S.projects=S.projects.filter(p=>!(['p_research','p_personal'].includes(p.id)&&empty(p)));
  if(!S.projects.some(p=>p.id===S.ui.project))S.ui.project='all';
  S.example=false;S.prefs.exClean=true;return gone.size}
{const _r=render;render=function(){
  if(CL.on&&S.prefs&&!S.prefs.exClean&&!window.FOCUS_DEMO&&!window.FOCUS_SEED){cleanExamples();save()}
  return _r.apply(this,arguments)}}

/* 9. default tag per project (p.tagId, synced with the project): new tasks of the project get it unless another tag is picked */
const projDefTag=pid=>{let p=S.projects.find(x=>x.id===pid);if(p&&p.tabOf&&!p.tagId)p=S.projects.find(x=>x.id===p.tabOf);
  return p&&p.tagId&&S.tags.some(g=>g.id===p.tagId)?p.tagId:''};
{const _af=addFromBar;addFromBar=function(k,o){if(o&&o.projectId&&!o.tagId)o.tagId=projDefTag(o.projectId)||null;return _af.apply(this,arguments)}}
$('#c-proj').addEventListener('change',()=>{const g=projDefTag($('#c-proj').value);if(g){$('#c-tag').value=g;paintComposerColor()}});
{const _po=openProjPop;openProjPop=function(anchor,proj){_po.apply(this,arguments);const el=pop&&pop.el;if(!el)return;
  const f=el.querySelector('.swatches');if(!f)return;
  f.insertAdjacentHTML('afterend',`<label class="pj-deftag"><span>Default tag</span><select id="pj-tag">${optionList(S.tags,'No default tag',proj&&proj.tagId||'')}</select></label>`);
  const fm=el.querySelector('form'),sub=fm.onsubmit;
  fm.onsubmit=e=>{const v=el.querySelector('#pj-tag').value,before=new Set(S.projects.map(p=>p.id));sub(e);
    const p=proj||S.projects.find(x=>!before.has(x.id));if(p){p.tagId=v||'';save();render()}}}}
{const _p=projExtra;projExtra=function(p){return Object.assign(_p.apply(this,arguments),{tagId:p.tagId||''})}}

/* 12. History window: the title line stays inside the box and a long task name shrinks to fit (very long ones wrap) */
{const _o=openLogPop;openLogPop=function(anchor,t){_o.apply(this,arguments);const s=pop&&pop.el&&pop.el.querySelector('.log-pop .bell-h span');if(!s)return;
  let f=12.5;while(s.scrollWidth>s.clientWidth+1&&f>10){f-=.5;s.style.fontSize=f+'px'}
  if(s.scrollWidth>s.clientWidth+1)s.classList.add('wrap')}} // still too long at 10px: it wraps instead of running out

/* 13. On hold rows fold to the name and the hold reason; the arrow opens the normal row (S.ui.holdOpen, this device only).
    Tasks waiting on your part are never folded. Tests keep rows open (window.FOCUS_HOLD_OPEN from the harness) unless they turn it off. */
const holdOpen=id=>(S.ui.holdOpen||[]).includes(id);
{const _row=row;row=function(t,depth){const el=_row.apply(this,arguments);
  if(!t.onHold||t.done||t.stepOf||S.ui.view==='done'||window.FOCUS_HOLD_OPEN||(typeof waitingForMe==='function'&&waitingForMe(t)))return el;
  const nr=el.querySelector('.name-row'),n=nr&&nr.querySelector('.name');if(!n)return el;
  const op=holdOpen(t.id),why=t.waitFor||t.note||'';
  n.insertAdjacentHTML('beforebegin',`<button class="hexp" type="button" data-holdexp aria-expanded="${op}" title="${op?'Fold this on hold task':'Show the whole task'}" aria-label="${op?'Fold':'Expand'} ${esc(t.name)}">${op?'▾':'▸'}</button>`);
  if(!op){el.classList.add('hold-min');if(why)n.insertAdjacentHTML('afterend',`<span class="hreason" title="${esc(why)}">${esc(why)}</span>`)}
  return el}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-holdexp]');if(!b)return;e.stopPropagation();e.preventDefault();
  const id=b.closest('.task').dataset.id,L=S.ui.holdOpen||[];S.ui.holdOpen=L.includes(id)?L.filter(x=>x!==id):[...L,id];save();render()},true);
