/* ---------- v86: any task row folds like the On hold ones ----------
   Normal tasks are open by default; the small arrow (top-left corner, shown on hover) folds the row to the name
   and its note (same look as 239's folded On hold rows). Folded ids are kept in S.ui.foldMin (this device).
   Not on On hold rows (239 does those), steps, the Done view, or tasks waiting on your part. */
const foldMin=id=>(S.ui.foldMin||[]).includes(id);
{const _row=row;row=function(t,depth){const el=_row.apply(this,arguments);
  if(t.onHold||t.done||t.stepOf||S.ui.view==='done'||(typeof waitingForMe==='function'&&waitingForMe(t)))return el;
  const nr=el.querySelector('.name-row'),n=nr&&nr.querySelector('.name');if(!n||nr.querySelector('.hexp'))return el;
  const mn=foldMin(t.id),why=t.note||'';
  n.insertAdjacentHTML('beforebegin',`<button class="hexp fexp" type="button" data-foldexp aria-expanded="${!mn}" title="${mn?'Show the whole task':'Fold this task'}" aria-label="${mn?'Expand':'Fold'} ${esc(t.name)}">${mn?'▸':'▾'}</button>`);
  if(mn){el.classList.add('hold-min','fold-min');if(why)n.insertAdjacentHTML('afterend',`<span class="hreason" title="${esc(why)}">${esc(why)}</span>`)}
  return el}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-foldexp]');if(!b)return;e.stopPropagation();e.preventDefault();
  const id=b.closest('.task').dataset.id,L=S.ui.foldMin||[];S.ui.foldMin=L.includes(id)?L.filter(x=>x!==id):[...L,id];save();render()},true);
