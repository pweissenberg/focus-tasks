/* ---------- microtasks: a checklist of names on a task (t.micro [{id,name,done}]) ----------
   They belong to the task (not to a step), can't be moved, have no tag, date or time, and only the name can be edited.
   Ticking one does not send it to Done: the list goes to Done with its task when the task itself is ticked. */
const microOf=t=>(t&&t.micro)||[];
function microHTML(t){
  const m=microOf(t);if(!m.length)return'';
  const ro=t.done;
  if(t.mtClosed){const d=m.filter(x=>x.done).length;return `<div class="mt-wrap closed" data-mtfor="${t.id}"><button type="button" class="mt-open" data-mtfold>▸ ${m.length} microtask${m.length===1?'':'s'}${d?` · ${d} done`:''}</button></div>`}
  return `<div class="mt-wrap" data-mtfor="${t.id}">${m.map(x=>`<div class="mt${x.done?' on':''}" data-mt="${x.id}">
      <label class="mt-check"><input type="checkbox" data-mtcheck${x.done?' checked':''}${ro?' disabled':''} aria-label="Done"><span></span></label>
      <input class="mt-name" type="text" value="${esc(x.name)}" placeholder="Microtask" aria-label="Microtask name"${ro?' readonly':''}>
      ${ro?'':'<button class="mt-x" type="button" data-mtdel title="Remove">×</button>'}</div>`).join('')}</div>`;
}
{const _row=row;row=function(t,depth){const el=_row(t,depth);
  if(!t.stepOf){
    const m=microOf(t);
    if(!t.done||m.length)el.insertAdjacentHTML('beforeend',`<span class="mt-tools">${t.done?'':`<button class="mt-add" type="button" data-mtadd title="Add a microtask" aria-label="Add a microtask"><svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg></button>`}${m.length?`<button class="mt-fold" type="button" data-mtfold title="${t.mtClosed?'Show':'Hide'} microtasks" aria-label="${t.mtClosed?'Show':'Hide'} microtasks">${t.mtClosed?'▸':'▾'}</button>`:''}</span>`);
    if(m.length)el.classList.add('has-mt');
    // send a top-level open task to Long term (or back to Tasks)
    if(!t.done&&!t.parentId&&S.ui.view!=='done')(el.querySelector(':scope > .note')||el).insertAdjacentHTML('beforeend',t.longTerm?`<button class="lt-send" type="button" data-ltsend title="Move back to the daily Tasks list">↓ Back to tasks</button>`:`<button class="lt-send" type="button" data-ltsend title="Move this task to Long term">↑ Send to long term</button>`);
  }
  return el}}
// the microtasks hang under their task like an appendix: a box right after the row
function hangMicro(){list.querySelectorAll('.task.has-mt').forEach(r=>{const t=byId(r.dataset.id);if(!t)return;const h=microHTML(t);if(!h)return;
  r.insertAdjacentHTML('afterend',h);const b=r.nextElementSibling;b.style.setProperty('--c',r.style.getPropertyValue('--c'));b.style.setProperty('--depth',r.style.getPropertyValue('--depth'));if(r.classList.contains('hold'))b.classList.add('hold')})}
const mtTask=el=>{const r=el.closest('.task');return byId(r?r.dataset.id:el.closest('[data-mtfor]').dataset.mtfor)};
function addMicro(t,after){
  t.micro=t.micro||[];const m={id:uid(),name:'',done:false},i=after?t.micro.findIndex(x=>x.id===after)+1:t.micro.length;
  t.micro.splice(i,0,m);render();
  const inp=list.querySelector(`[data-mtfor="${t.id}"] [data-mt="${m.id}"] .mt-name`);if(inp)inp.focus();
}
// an empty microtask goes away when you leave it
function dropEmpty(t,id){const m=microOf(t).find(x=>x.id===id);if(m&&!m.name.trim()){t.micro=t.micro.filter(x=>x!==m);return true}return false}
list.addEventListener('click',e=>{
  const a=e.target.closest('[data-mtadd]');
  if(a){e.stopPropagation();const t=mtTask(a);t.mtClosed=false;addMicro(t);return}
  const fo=e.target.closest('[data-mtfold]');
  if(fo){e.stopPropagation();const t=mtTask(fo);t.mtClosed=!t.mtClosed;commit();return}
  const lt=e.target.closest('[data-ltsend]');
  if(lt){e.stopPropagation();const t=mtTask(lt),to=!t.longTerm,r=S.tasks.filter(x=>x.id!==t.id&&isOpenRoot(x)&&!!x.longTerm===to);
    const old={lt:t.longTerm,order:t.order};t.longTerm=to;t.order=r.length?Math.max(...r.map(x=>x.order))+1:0;commit();
    toast(`"${t.name}" moved to ${to?'Long term':'Tasks'}.`,()=>{t.longTerm=old.lt;t.order=old.order;commit()});return}
  const d=e.target.closest('[data-mtdel]');
  if(d){e.stopPropagation();const t=mtTask(d),id=d.closest('[data-mt]').dataset.mt;t.micro=microOf(t).filter(x=>x.id!==id);commit();return}
  if(e.target.closest('.mt-wrap'))e.stopPropagation();
},true);
list.addEventListener('change',e=>{
  const c=e.target.closest('[data-mtcheck]');if(!c)return;e.stopPropagation();
  const t=mtTask(c),m=microOf(t).find(x=>x.id===c.closest('[data-mt]').dataset.mt);if(m){m.done=c.checked;commit()}
},true);
list.addEventListener('input',e=>{
  const n=e.target.closest('.mt-name');if(!n)return;e.stopPropagation();
  const t=mtTask(n),m=microOf(t).find(x=>x.id===n.closest('[data-mt]').dataset.mt);if(m){m.name=n.value;save()}
},true);
list.addEventListener('keydown',e=>{
  const n=e.target.closest('.mt-name');if(!n)return;e.stopPropagation();
  const t=mtTask(n),id=n.closest('[data-mt]').dataset.mt;
  if(e.key==='Enter'){e.preventDefault();if(n.value.trim())addMicro(t,id);else n.blur()}
  else if(e.key==='Escape'){n.blur()}
  else if(e.key==='Backspace'&&!n.value){e.preventDefault();const i=microOf(t).findIndex(x=>x.id===id);t.micro.splice(i,1);commit();
    const prev=t.micro[Math.max(0,i-1)];const p=prev&&list.querySelector(`[data-mtfor="${t.id}"] [data-mt="${prev.id}"] .mt-name`);if(p){p.focus();p.setSelectionRange(p.value.length,p.value.length)}}
},true);
list.addEventListener('focusout',e=>{
  const n=e.target.closest('.mt-name');if(!n)return;const t=mtTask(n);if(!t)return;
  setTimeout(()=>{if(dropEmpty(t,n.closest('[data-mt]').dataset.mt))commit();else save()},0);
});
// keep the caret in the microtask being typed when the list redraws (timer ticks, a synced change)
{const _rm=render;render=function(){const a=document.activeElement,k=a&&a.classList&&a.classList.contains('mt-name')?{t:a.closest('[data-mtfor]').dataset.mtfor,m:a.closest('[data-mt]').dataset.mt,s:a.selectionStart}:null;
  _rm.apply(this,arguments);hangMicro();
  if(k){const n=list.querySelector(`[data-mtfor="${k.t}"] [data-mt="${k.m}"] .mt-name`);if(n&&document.activeElement!==n){n.focus();try{n.setSelectionRange(k.s,k.s)}catch(e){}}}}}
