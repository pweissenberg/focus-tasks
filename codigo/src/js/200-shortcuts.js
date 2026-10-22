/* ---------- keyboard shortcuts ---------- */
const KEYS=[['Anywhere',[['N','New task'],['/','Search'],['1','Tasks'],['2','Long term'],['3','Done'],['C','Calendar'],['S','Stats'],['T','Show or hide the timer'],['P','Start or pause the timer'],['W','Show or hide white noise'],['D','Dark or light mode'],['?','These shortcuts']]],
  ['Task list',[['J','Select the next task'],['K','Select the previous task'],['E','Edit the selected task'],['X','Mark it done'],['F','Start the timer on it'],['H','Put it on hold, or take it off'],['Esc','Close a popup or clear the selection']]]];
/* the short list shown at the bottom of the page */
const FOOT_KEYS=[['N','new task'],['/','search'],['1 2 3','views'],['C','calendar'],['S','stats'],['T','timer'],['P','start / pause'],['J K','select a task'],['E','edit'],['X','done']];
{const kf=$('#kfoot');
  kf.innerHTML=FOOT_KEYS.map(([k,l])=>`<span>${k.split(' ').map(x=>`<kbd>${esc(x)}</kbd>`).join('')}${esc(l)}</span>`).join('')+'<button type="button" data-allkeys title="See all keyboard shortcuts"><kbd>?</kbd>all shortcuts</button>';
  kf.addEventListener('click',e=>{if(e.target.closest('[data-allkeys]'))openShortcuts()});
  // the page fills the window above this line; follow its real height (it wraps on narrower windows, hides on phones)
  try{new ResizeObserver(()=>document.documentElement.style.setProperty('--kf',(kf.offsetHeight?kf.offsetHeight+16:0)+'px')).observe(kf)}catch(e){}}
function openShortcuts(){
  closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal keys" role="dialog" aria-modal="true" aria-labelledby="ks-h"><h2 id="ks-h">Keyboard shortcuts</h2>
    <div class="kcols">${KEYS.map(([h,list])=>`<section><h3>${h}</h3><dl class="kgrid">${list.map(([k,l])=>`<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(l)}</dd>`).join('')}</dl></section>`).join('')}</div>
    <p class="sp-hint">They work whenever you are not typing in a field.</p>
    <div class="modal-actions"><button type="button" class="btn primary" data-x>Close</button></div></div>`;
  document.body.appendChild(back);modal=back;
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  back.querySelector('[data-x]').onclick=closeModal;
  setTimeout(()=>back.querySelector('[data-x]').focus(),0);
}
function clearSel(){kbSel=null;document.querySelectorAll('.task.ksel').forEach(r=>r.classList.remove('ksel'))}
function selectRow(dir){
  const rows=[...document.querySelectorAll('#list .task')].filter(r=>r.offsetParent);if(!rows.length)return;
  let i=rows.findIndex(r=>r.dataset.id===kbSel);
  i=i<0?(dir>0?0:rows.length-1):Math.max(0,Math.min(rows.length-1,i+dir));
  clearSel();const r=rows[i];r.classList.add('ksel');kbSel=r.dataset.id;r.scrollIntoView({block:'nearest'});
}
document.addEventListener('mousedown',e=>{if(kbSel&&!e.target.closest('.task.ksel'))clearSel()});
// capture phase: runs before the Escape handler that closes popups, so Esc only clears the selection when nothing else is open
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&kbSel&&!modal&&!pop&&!dp)clearSel()},true);
document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||modal||pop||dp||e.target.closest('input,textarea,select,[contenteditable]')||document.body.classList.contains('show-landing'))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key,u=S.ui;
  const go=v=>{if(v==='calendar'&&u.view!=='calendar')$('#cal').innerHTML='';u.view=v;commit()};
  const selEl=kbSel&&document.querySelector(`#list .task[data-id="${kbSel}"]`),sel=selEl&&byId(kbSel);
  if(k==='n'){if(u.view==='project'){if((u.projTab||'tasks')!=='tasks'){u.projTab='tasks';commit()}const pi=$('#pt-name');if(pi)pi.focus()}else $('#c-name').focus()}
  else if(k==='1')go('tasks');else if(k==='2')go('long');else if(k==='3')go('done');
  else if(k==='c')go('calendar');else if(k==='s')go('stats');
  else if(k==='t')$('#timerToggle').click();
  else if(k==='w')$('#noiseToggle').click();
  else if(k==='p'){if(S.timer.running)timerPause();else timerStart()}
  else if(k==='d')$('#themeToggle').click();
  else if(k==='?')openShortcuts();
  else if(k==='j')selectRow(1);
  else if(k==='k')selectRow(-1);
  else if(sel&&k==='e')openEdit(sel.id);
  else if(sel&&k==='f'&&!sel.done)focusTask(sel.id);
  else if(sel&&k==='h'&&!sel.done){sel.onHold=!sel.onHold;commit()}
  else if(sel&&k==='x'){
    const rows=[...document.querySelectorAll('#list .task')],i=rows.indexOf(selEl),nx=rows[i+1]||rows[i-1];kbSel=nx?nx.dataset.id:null;
    selEl.classList.add('leaving');
    setTimeout(()=>{if(sel.done){reopen(sel);commit();toast(`"${sel.name}" is back in ${rootOf(sel).longTerm?'Long term':'Tasks'}.`)}
      else{if(S.timer.taskId===sel.id&&S.timer.running)timerPause();complete(sel);commit();askAddTime(sel)}},220)}
  else return;
  e.preventDefault();
});

