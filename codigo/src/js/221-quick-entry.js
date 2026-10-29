/* ---------- quick entry in the add bars: "[" picks a tag (Tab takes the first match), ";" sets how long the task takes ---------- */
// t.est = minutes the task takes (synced with shared tasks). Open tasks under S.prefs.quickMins (default 3, 0 = off) get a glow (two-minute rule)
const QE_HINT='Type [ for a tag, ; for the time, ! urgent';const QE_HINT_MAIN='Type [ tag · @ project, subproject · ; time · ! urgent';
const quickMins=()=>S.prefs.quickMins==null?3:+S.prefs.quickMins;
// glow styles: any task can have one (t.glow); quick tasks use S.prefs.quickGlow (default gold)
const GLOWS=[['gold','Gold'],['blue','Blue'],['violet','Violet'],['green','Green'],['pink','Pink'],['rainbow','Rainbow']];
const glowOf=t=>t&&!t.done&&!t.stepOf?(t.glow||(isQuick(t)?S.prefs.quickGlow||'gold':'')):'';
const glowCls=t=>{const g=glowOf(t);return (isQuick(t)?' quick':'')+(g?` glow g-${g}`:'')};
function glowPickHTML(name,cur,withNone){return `<div class="glow-pick" role="radiogroup">${withNone?`<label title="No glow"><input type="radio" name="${name}" value=""${!cur?' checked':''}><span class="gsw none">∅</span></label>`:''}${GLOWS.map(([k,l])=>`<label title="${l}"><input type="radio" name="${name}" value="${k}"${cur===k?' checked':''}><span class="gsw g-${k}"></span></label>`).join('')}</div>`}
const isQuick=t=>!!(t&&!t.done&&t.est>0&&quickMins()>0&&t.est<quickMins());
function parseDur(s){
  s=String(s||'').trim().toLowerCase().replace(',','.');if(!s)return null;let m;
  if(m=s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?)?$/))return +m[1]||null;
  if(m=s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?)$/))return +m[1]*60||null;
  if(m=s.match(/^(\d+)\s*h\s*(\d+)\s*(m|min|mins)?$/))return +m[1]*60+ +m[2]||null;
  if(m=s.match(/^(\d+):(\d{1,2})$/))return +m[1]*60+ +m[2]||null;
  if(m=s.match(/^(\d+)\s*(s|sec|secs|seconds?)$/))return +m[1]/60||null;
  return null;
}
function fmtEst(m){if(m<1)return Math.max(1,Math.round(m*60))+'s';if(m<60)return (Math.round(m*10)/10)+'m';const h=Math.floor(m/60),r=Math.round(m%60);return h+'h'+(r?String(r).padStart(2,'0'):'')}
function estHTML(t){
  if(!t||!(t.est>0))return'';
  return `<button class="estc${isQuick(t)?' q':''}" type="button" data-estc="${t.id}" title="Takes about ${fmtEst(t.est)}${isQuick(t)?' (a quick one: do it now)':''}. Click to change">${fmtEst(t.est)}</button>`;
}
const tagStarts=q=>{q=q.toLowerCase();return S.tags.filter(g=>g.name.toLowerCase().startsWith(q)).concat(q?S.tags.filter(g=>!g.name.toLowerCase().startsWith(q)&&g.name.toLowerCase().includes(q)):[])};
const qeInputs='#c-name,#pt-name';
const qeTagSel=inp=>inp.id==='c-name'?$('#c-tag'):$('#pt-tag');
let qeMenu=null,qeHits=[],qeHi=0;
function qeClose(){if(qeMenu){qeMenu.remove();qeMenu=null}qeHits=[]}
// what the caret is in: an open "[tag" or the ";time" at the end
function qeState(inp){
  const v=inp.value.slice(0,inp.selectionStart);let m=v.match(/\[([^\[\];]*)$/);
  if(m)return {kind:'tag',q:m[1],from:v.length-m[1].length-1};
  m=inp.id==='c-name'&&v.match(/(?:^|\s)@([^@\[;]*)$/);if(m&&!/\s\s/.test(m[1]))return {kind:'proj',q:m[1],from:v.length-m[1].length-1};
  m=inp.value.match(/;([^;]*)$/);if(m&&inp.selectionStart>inp.value.length-m[1].length-1)return {kind:'time',q:m[1]};
  return null;
}
function qeDraw(inp){
  const st=qeState(inp);if(!st&&inp.value.trim()){qeClose();return}
  if(!qeMenu){qeMenu=document.createElement('div');qeMenu.className='qe-menu';qeMenu.setAttribute('role','listbox');document.body.appendChild(qeMenu);
    qeMenu.addEventListener('mousedown',e=>e.preventDefault());
    qeMenu.addEventListener('click',e=>{const b=e.target.closest('[data-qe]');if(b)qePick(qeMenu._inp,+b.dataset.qe)})}
  qeMenu._inp=inp;qeMenu.classList.toggle('tip-only',!st);
  if(!st){qeHits=[];qeMenu.innerHTML=`<div class="qe-t qe-tip">Type <kbd>[</kbd> to pick a tag${inp.id==='c-name'?', <kbd>@</kbd> for a project (<b>@Project, Subproject</b> for one of its tabs)':''} (Tab takes the first) and <kbd>;</kbd> to say how long it takes, like <b>;2</b> or <b>;1h</b>. A <kbd>!</kbd> marks it urgent, <b>!1</b> low, <b>!2</b> medium. Write a date in the name, like <b>tomorrow 3pm</b>, <b>next tuesday</b> or <b>sexta 15h</b>, and it becomes the due date.</div>`}
  else if(st.kind==='proj'){const q=st.q.trim().toLowerCase().replace(/\s*,\s*/g,', '),P=S.projects.filter(p=>!p.archived);
    qeHits=P.filter(p=>projFull(p).toLowerCase().startsWith(q)).concat(q?P.filter(p=>!projFull(p).toLowerCase().startsWith(q)&&projFull(p).toLowerCase().includes(q)):[]).slice(0,7);qeHi=Math.min(qeHi,Math.max(0,qeHits.length-1));
    qeMenu.innerHTML=qeHits.length?`<div class="qe-h">Project <span>Tab picks the first</span></div>`+qeHits.map((p,i)=>`<button type="button" role="option" data-qe="${i}" class="${i===qeHi?'on':''}"><i style="background:${p.color||'var(--accent)'}"></i>${esc(projFull(p))}</button>`).join('')
      :`<div class="qe-h">No project starts with "${esc(st.q)}"</div>`}
  else if(st.kind==='tag'){qeHits=tagStarts(st.q).slice(0,7);qeHi=Math.min(qeHi,Math.max(0,qeHits.length-1));
    qeMenu.innerHTML=qeHits.length?`<div class="qe-h">Tag <span>Tab picks the first</span></div>`+qeHits.map((g,i)=>`<button type="button" role="option" data-qe="${i}" class="${i===qeHi?'on':''}"><i style="background:${g.color}"></i>${esc(g.name)}</button>`).join('')
      :`<div class="qe-h">No tag starts with "${esc(st.q)}"</div>`}
  else{qeHits=[];const d=parseDur(st.q);
    qeMenu.innerHTML=`<div class="qe-h">How long it takes</div><div class="qe-t">${d?`Takes <b>${fmtEst(d)}</b>${quickMins()>0&&d<quickMins()?' · quick task, it will glow':''}`:'Type minutes, like 2, 15m, 1h30 or 45s'}</div>`}
  const r=inp.getBoundingClientRect();qeMenu.style.left=Math.max(8,Math.min(r.left,innerWidth-qeMenu.offsetWidth-8))+'px';qeMenu.style.top=(r.bottom+6)+'px';
}
function qePick(inp,i){
  const st=qeState(inp),g=qeHits[i];if(!st||(st.kind!=='tag'&&st.kind!=='proj')||!g)return;
  const end=inp.selectionStart,before=inp.value.slice(0,st.from).replace(/\s+$/,''),after=inp.value.slice(end).replace(/^\s+/,'');
  inp.value=before+(before&&after?' ':'')+after;const c=before.length+(before&&after?1:0);inp.setSelectionRange(c,c);
  const sel=st.kind==='proj'?$('#c-proj'):qeTagSel(inp);if(sel){sel.value=g.id;sel.dispatchEvent(new Event('change',{bubbles:true}));sel.classList.remove('qe-flash');void sel.offsetWidth;sel.classList.add('qe-flash')}
  qeClose();inp.focus();
}
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches(qeInputs)){qeHi=0;qeDraw(e.target)}});
document.addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches(qeInputs)&&!e.target.value.trim())qeDraw(e.target)});
document.addEventListener('focusout',e=>{if(e.target.matches&&e.target.matches(qeInputs))setTimeout(()=>{if(!document.activeElement||!document.activeElement.matches(qeInputs))qeClose()},0)});
window.addEventListener('scroll',e=>{if(!(e.target.matches&&e.target.matches(qeInputs)))qeClose()},true);window.addEventListener('resize',qeClose);
window.addEventListener('keydown',e=>{
  const inp=e.target;if(!qeMenu||!inp.matches||!inp.matches(qeInputs))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();qeClose();return}
  if(!qeHits.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();qeHi=(qeHi+(e.key==='ArrowDown'?1:qeHits.length-1))%qeHits.length;qeDraw(inp);return}
  if(e.key==='Tab'||e.key==='Enter'){e.preventDefault();e.stopPropagation();qePick(inp,qeHi)}
},true);
// on submit: take "[tag]" / a leftover "[ta" and the ";time" out of the name before the bar's own handler reads it
let qeEst=null;
function qeApply(inp){
  let v=inp.value;const sel=qeTagSel(inp);
  v=v.replace(/\[([^\[\]]+)\]?/g,(all,q)=>{const n=q.trim().toLowerCase(),g=S.tags.find(x=>x.name.toLowerCase()===n)||(()=>{const h=S.tags.filter(x=>x.name.toLowerCase().startsWith(n));return h.length===1?h[0]:null})();
    if(g&&sel){sel.value=g.id;sel.dispatchEvent(new Event('change',{bubbles:true}));return ' '}return all});
  if(inp.id==='c-name')v=v.replace(/(^|\s)@([^@\[;]+)/g,(all,sp,q)=>{const n=q.trim().toLowerCase().replace(/\s*,\s*/g,', '),P=S.projects.filter(p=>!p.archived),g=P.find(p=>projFull(p).toLowerCase()===n)||(()=>{const h=P.filter(p=>projFull(p).toLowerCase().startsWith(n));return h.length===1?h[0]:null})();
    if(g){const ps=$('#c-proj');ps.value=g.id;ps.dispatchEvent(new Event('change',{bubbles:true}));return sp}return all});
  // "!" on its own (or "!!", "!!!") marks the task urgent: High priority;
  // a number after it picks the level: "!1" or "! 1" Low, "!2" Medium, "!3" High
  let urg=0;v=v.replace(/(^|\s)!{1,3}(?:\s*([123]))?(?=\s|$)/g,(all,sp,n)=>{urg=n?+n:3;return sp});
  if(urg){if(inp.id==='c-name'){composerPrio=urg;paintComposerPrio()}else{ptPrio=urg;paintPtBar()}}
  const m=v.match(/;([^;]*)$/);qeEst=null;
  if(m){const d=parseDur(m[1]);if(d){qeEst=d;v=v.slice(0,m.index)}}
  inp.value=v.replace(/\s{2,}/g,' ').trim();qeClose();
}
window.addEventListener('submit',e=>{const f=e.target;const inp=f.id==='composer'?$('#c-name'):f.matches&&f.matches('[data-ptadd]')?$('#pt-name'):null;if(inp)qeApply(inp)},true);
{const _afb=addFromBar;addFromBar=function(){const t=_afb.apply(this,arguments);if(qeEst){t.est=qeEst;qeEst=null}return t}}
// the time chip on a row: change how long it takes, and the glow setting
function openEstPop(anchor,t){
  openPop(anchor,`<form class="pop-form est-pop"><strong>How long it takes</strong>
    <input type="text" id="est-in" value="${t.est?esc(fmtEst(t.est)):''}" placeholder="2, 15m, 1h30" aria-label="How long it takes">
    <label class="fld"><span>GLOW ON TASKS UNDER</span>${quickSelHTML('est-q')}</label><div class="fld"><span>QUICK TASK GLOW</span>${glowPickHTML('est-g',S.prefs.quickGlow||'gold')}</div>
    <div class="pop-actions"><button type="button" class="linkbtn" data-estrm>Remove time</button><button class="btn sm primary">Save</button></div></form>`,el=>{
    const f=el.querySelector('form');
    f.querySelector('#est-q').onchange=e=>{S.prefs.quickMins=+e.target.value;commit()};
    f.querySelectorAll('[name=est-g]').forEach(r=>r.onchange=()=>{S.prefs.quickGlow=r.value;commit()});
    f.querySelector('[data-estrm]').onclick=()=>{t.est=null;closePop();commit()};
    f.onsubmit=e=>{e.preventDefault();const i=f.querySelector('#est-in'),d=parseDur(i.value);if(i.value.trim()&&!d){i.classList.add('invalid');return}t.est=d||null;closePop();commit()};
  });
}
const quickSelHTML=id=>`<select id="${id}">${[[0,'Off (no glow)'],[2,'2 minutes'],[3,'3 minutes'],[5,'5 minutes'],[10,'10 minutes']].map(([v,l])=>`<option value="${v}"${quickMins()===v?' selected':''}>${l}</option>`).join('')}</select>`;
document.addEventListener('click',e=>{const b=e.target.closest('[data-estc]');if(!b)return;e.stopPropagation();const t=byId(b.dataset.estc);if(!t)return;if(typeof roTask==='function'&&roTask(t)){roToast();return}openEstPop(b,t)},true);
{const _os=openSettings;openSettings=function(){_os.apply(this,arguments);const f=modal&&modal.querySelector('form.settings');if(!f)return;
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<label class="fld"><span>GLOW ON QUICK TASKS (UNDER)</span>${quickSelHTML('st-quick')}</label><div class="fld"><span>QUICK TASK GLOW</span>${glowPickHTML('st-g',S.prefs.quickGlow||'gold')}</div><p class="sp-hint">Tasks that take less than this glow, so you do them right away. Set the time with ; when you add a task. Any task can get its own glow in its edit window.</p>`);
  f.querySelectorAll('[name=st-g]').forEach(r=>r.onchange=()=>{S.prefs.quickGlow=r.value;save();render()});
  f.querySelector('#st-quick').onchange=e=>{S.prefs.quickMins=+e.target.value;save();render()}}}
// the hint in both add bars
{const ci=$('#c-name');if(ci&&!ci.placeholder.includes('['))ci.placeholder='Add a task...  '+QE_HINT_MAIN}
{const _rpq=renderProjPage;renderProjPage=function(){_rpq();const i=$('#pt-name');if(i&&!i.placeholder.includes('['))i.placeholder=i.placeholder.replace(/\.\.\.$/,'')+'...  '+QE_HINT}}
// quick tasks (the glowing ones) come first among open tasks; on hold tasks keep their place
{const _cmp=cmp;cmp=function(a,b){const qa=isQuick(a)&&!a.onHold,qb=isQuick(b)&&!b.onHold;if(qa!==qb)return qa?-1:1;return _cmp(a,b)}}
// urgent (High priority) open tasks get a red "!" before the name
{const _row=row;row=function(t,depth){const el=_row(t,depth);if(t.prio===3&&!t.done){const n=el.querySelector('.name-row .name');if(n)n.insertAdjacentHTML('beforebegin','<b class="urg" title="Urgent (High priority)" aria-label="Urgent">!</b>')}return el}}
