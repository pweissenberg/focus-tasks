/* ---------- v60: the "I have X minutes" Time pill is gone (Pedro); the Received / Sent / Done my part row starts at the left edge and Sort sits at the right end ---------- */
{const b=$('#timeFilter');if(b)b.remove();if(S.ui)S.ui.estMax=0}
// Sort and its buttons stay together on the right, so a long Received / Sent row never splits them
{const so=$('#sorts');if(so){const g=document.createElement('span');g.className='sortgrp';so.querySelectorAll(':scope > .lbl, :scope > [data-sort]').forEach(x=>g.appendChild(x));so.appendChild(g)}}
/* v61: Received / Sent / Done my part merged into one button next to Sort; its menu picks the kind and then the person, with no numbers.
   While one is picked the tasks are listed by the most recent interaction (history, comments, sent, created) */
{const so=$('#sorts'),g=so&&so.querySelector('.sortgrp'),sb=$('#srBar');if(g&&sb)g.prepend(sb)}
const SR_KINDS=[['recv','Received'],['sent','Sent'],['dmp','Done my part']];
const PEOPLE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>';
paintSrBar=function(){const b=$('#srBar');if(!b)return;const u=S.ui,sr=u.sr,ok=CL.on&&(u.view==='tasks'||u.view==='long');
  const any=ok&&(sr||SR_KINDS.some(([k])=>srPeople(k).size));if(!any){b.hidden=true;b.innerHTML='';return}b.hidden=false;
  const k=sr&&SR_KINDS.find(x=>x[0]===sr.k),who=sr&&sr.who?srName(sr.who):'';
  b.innerHTML=`<button type="button" class="seg srbtn${sr?' on':''}" id="srBtn" aria-haspopup="menu" title="Received, sent and done my part">${PEOPLE_ICON}<span>${k?esc(k[1])+(who?' · '+esc(who):''):'Shared'}</span><i aria-hidden="true">▾</i></button><span class="sr-sep2"></span>`};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#srBtn');if(!b)return;e.stopPropagation();
  const draw=()=>{const sr=S.ui.sr;const ppl=sr?[...srPeople(sr.k).keys()]:[];
    return `<div class="acct-menu sr-menu" role="menu" aria-label="Received, sent and done my part">
      <button type="button" role="menuitemradio" aria-checked="${!sr}" data-srk="">All tasks</button>
      ${SR_KINDS.map(([k,l])=>`<button type="button" role="menuitemradio" aria-checked="${!!sr&&sr.k===k}" data-srk="${k}">${l}</button>`).join('')}
      ${sr&&ppl.length?`<div class="asg-h">${sr.k==='recv'?'From':sr.k==='dmp'?'For':'To'}</div><button type="button" role="menuitemradio" aria-checked="${!sr.who}" data-srw="">Everyone</button>${ppl.map(w=>`<button type="button" role="menuitemradio" aria-checked="${sr.who===w}" data-srw="${esc(w)}">${String(w).includes('@')?'':avHTML(w)}${esc(srName(w))}</button>`).join('')}`:''}</div>`};
  openPop(b,draw(),el=>{el.classList.add('pop-menu');place(el,b);
    el.addEventListener('click',ev=>{const k=ev.target.closest('[data-srk]'),w=ev.target.closest('[data-srw]');
      if(k){S.ui.sr=k.dataset.srk?{k:k.dataset.srk,who:''}:null;commit();if(!S.ui.sr){closePop();return}el.innerHTML=draw();place(el,$('#srBtn')||b);return}
      if(w&&S.ui.sr){S.ui.sr.who=w.dataset.srw;commit();closePop()}})})},true);
// most recent interaction first while a Received / Sent / Done my part view is on
function lastTouch(t){let m=t.createdAt||'';const up=x=>{if(x&&x>m)m=x};
  (t.log||[]).forEach(x=>up(x.at));up(t.doneAt);up(t.waitSince&&t.waitSince+'T00:00:00');up(t.backAt);
  const hold=t.projectId&&projOfId(t.projectId)||t;Object.values(hold.comments||{}).forEach(L=>(L||[]).forEach(c=>up(c.at)));return m}
{const _c=cmp;cmp=function(a,b){const sr=S.ui.sr;if(sr&&(S.ui.view==='tasks'||S.ui.view==='long')){const x=lastTouch(a),y=lastTouch(b);if(x!==y)return x<y?1:-1}return _c(a,b)}}
