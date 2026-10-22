/* drag and drop: middle of a task = make subtask, top/bottom edge = reorder */
let dragId=null;
list.addEventListener('mousedown',e=>{const r=e.target.closest('.task');if(!r)return;
  r.draggable=S.ui.view!=='done'&&!e.target.closest('input,button,label.note,select')});
list.addEventListener('dragstart',e=>{const r=e.target.closest('.task');if(!r)return;dragId=r.dataset.id;r.classList.add('dragging');
  try{e.dataTransfer.setData('text/plain',dragId);e.dataTransfer.effectAllowed='move'}catch(_){}});
const clearDrop=()=>list.querySelectorAll('.drop-before,.drop-after,.drop-inside,.dropend.on').forEach(x=>x.classList.remove('drop-before','drop-after','drop-inside','on'));
function zone(e,r){const b=r.getBoundingClientRect(),y=(e.clientY-b.top)/b.height;return y<.28?'before':y>.72?'after':'inside'}
list.addEventListener('dragover',e=>{
  if(!dragId)return;const r=e.target.closest('.task'),end=e.target.closest('[data-dropend]');
  clearDrop();
  if(end){e.preventDefault();end.classList.add('on');return}
  if(!r||!canDrop(dragId,r.dataset.id))return;
  e.preventDefault();r.classList.add('drop-'+zone(e,r));
});
list.addEventListener('dragleave',e=>{if(!list.contains(e.relatedTarget))clearDrop()});
list.addEventListener('drop',e=>{
  if(!dragId)return;e.preventDefault();const id=dragId,r=e.target.closest('.task'),end=e.target.closest('[data-dropend]');
  clearDrop();dragId=null;
  if(end){toRootEnd(id);ensureManual();commit();return}
  if(!r||!canDrop(id,r.dataset.id))return;
  const z=zone(e,r);
  if(z==='inside'){nestInto(id,r.dataset.id);commit();toast(`"${byId(id).name}" is now a subtask of "${byId(r.dataset.id).name}" and took its tag and project.`)}
  else{placeRelative(id,r.dataset.id,z);commit()}
});
list.addEventListener('dragend',()=>{dragId=null;clearDrop();list.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'))});

