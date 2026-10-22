/* ---------- after done: offer to add time ---------- */
function askAddTime(t){
  document.querySelectorAll('.toast').forEach(x=>x.remove());clearTimeout(toastTimer);
  const el=document.createElement('div');el.className='toast ask';el.setAttribute('role','status');
  const spent=spentOf(t.id);
  const nx=t.spawnedId&&byId(t.spawnedId);
  el.innerHTML=`<span class="q">"${esc(t.name)}" moved to Done.${nx?` ↻ Next one is due ${isoToUS(nx.due)}.`:''} ${spent>=60000?`You tracked <b>${fmtDur(spent)}</b> on it. Add more time?`:'Add time spent on it?'}</span>
    ${[15,30,60,120].map(m=>`<button type="button" class="chipbtn" data-add="${m}">+${fmtDur(m*60000)}</button>`).join('')}
    <input type="text" inputmode="numeric" maxlength="4" placeholder="min" aria-label="Minutes"><button type="button" class="chipbtn" data-add="custom">Add</button>
    <span class="sep">|</span><button type="button" data-undo>Undo</button><button type="button" data-close>No thanks</button>`;
  const close=()=>{el.remove();clearTimeout(toastTimer)};
  const arm=()=>{clearTimeout(toastTimer);toastTimer=setTimeout(close,15000)};
  el.addEventListener('click',e=>{
    const a=e.target.closest('[data-add]');
    if(a){const m=a.dataset.add==='custom'?parseInt(el.querySelector('input').value,10):+a.dataset.add;
      if(!m||m<1){el.querySelector('input').focus();return}
      const end=t.doneAt?+new Date(t.doneAt):Date.now();
      S.sessions.push({id:uid(),taskId:t.id,name:t.name,tagId:t.tagId,projectId:t.projectId,start:end-m*60000,end,manual:true});
      close();commit();toast(`Added ${fmtDur(m*60000)} to "${t.name}".`);return}
    if(e.target.closest('[data-undo]')){reopen(t);close();commit();return}
    if(e.target.closest('[data-close]'))close();
  });
  el.querySelector('input').addEventListener('focus',()=>clearTimeout(toastTimer));
  el.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter')el.querySelector('[data-add=custom]').click()});
  document.body.appendChild(el);arm();
}

/* ---------- notes: drag the top border to resize ---------- */
(()=>{
  const grip=$('#notesGrip');let st=null;
  grip.addEventListener('pointerdown',e=>{e.preventDefault();grip.setPointerCapture(e.pointerId);st={y:e.clientY,h:$('#notes').offsetHeight};grip.classList.add('drag')});
  grip.addEventListener('pointermove',e=>{if(!st)return;const h=Math.max(60,Math.min(700,st.h+(e.clientY-st.y)));document.documentElement.style.setProperty('--notes-h',h+'px');S.ui.notesH=h});
  const end=()=>{if(!st)return;st=null;grip.classList.remove('drag');save()};
  grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  grip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();S.ui.notesH=Math.max(60,Math.min(700,(S.ui.notesH||110)+(e.key==='ArrowDown'?20:-20)));document.documentElement.style.setProperty('--notes-h',S.ui.notesH+'px');save()}});
  grip.tabIndex=0;
})();
renderNoise();
