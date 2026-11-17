/* v102 (Pedro): a popover whose anchor is hidden or gone (e.g. ticking On hold folds the row, so its .holdbox is display:none)
   opened in the top-left corner. Fall back to the nearest visible thing: the task's name, the task row, else the screen center. */
{const vis=el=>{if(!el||!el.isConnected)return null;const r=el.getBoundingClientRect();return r.width||r.height?r:null};
const _place=place;place=function(el,anchor){
  if(vis(anchor))return _place(el,anchor);
  const row=anchor&&anchor.isConnected&&anchor.closest&&anchor.closest('.task');
  const id=anchor&&anchor.closest&&(anchor.closest('.task')||{}).dataset?.id;
  const live=row||(id&&document.querySelector(`.task[data-id="${CSS.escape(id)}"]`));
  const alt=live&&[live.querySelector('.name'),live].find(vis);
  if(alt){alt.scrollIntoView({block:'nearest'});return _place(el,alt)}
  const w=el.offsetWidth,h=el.offsetHeight;el.style.top=Math.max(8,(innerHeight-h)/2)+'px';el.style.left=Math.max(8,(innerWidth-w)/2)+'px'}}
