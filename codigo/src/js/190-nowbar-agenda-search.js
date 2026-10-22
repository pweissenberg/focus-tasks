/* ---------- active block from the calendar ---------- */
function activeBlock(){const now=Date.now();return S.sessions.filter(x=>x.start<=now&&now<x.end&&byId(x.taskId)).sort((a,b)=>b.start-a.start)[0]||null}
let lastActive=null;
setInterval(()=>{const a=activeBlock(),k=a?a.id:null;if(k!==lastActive&&!calDrag&&!cvDrag&&!drawing){lastActive=k;render()}},20000);
function renderNowBar(){
  const bar=$('#nowBar'),a=activeBlock(),u=S.ui;lastActive=a?a.id:null;
  const show=a&&['tasks','long'].includes(u.view);
  bar.hidden=!show;if(!show){bar.innerHTML='';return}
  const t=byId(a.taskId),left=a.end-Date.now();
  bar.innerHTML=`<span class="pulse" style="--c:${colorOf(t)}"></span><span class="nb-txt">Now on your calendar: <b>${esc(t.name)}</b> <span class="mono">${hm(a.start)}–${hm(a.end)}</span> · ${fmtDur(left)} left</span>
    <button class="linkbtn" type="button" data-nb-find="${t.id}">Show task</button><button class="linkbtn" type="button" data-nb-cal>Open calendar</button>`;
}
$('#nowBar').addEventListener('click',e=>{
  const f=e.target.closest('[data-nb-find]');if(f){goToTask(f.dataset.nbFind);return}
  if(e.target.closest('[data-nb-cal]')){$('#cal').innerHTML='';S.ui.view='calendar';S.ui.calAnchor=todayISO();commit()}
});

/* ---------- Today / Upcoming view ---------- */
/* ---------- global search ---------- */
function goToTask(id){
  const t=byId(id);if(!t)return;closeSearch();
  S.ui.tag='all';S.ui.project='all';S.ui.hideHold=false;
  S.ui.view=t.done?'done':rootOf(t).longTerm?'long':'tasks';S.ui.showArchived=!!(t.done&&t.archived);
  let p=parentOf(t);while(p){p.collapsed=false;p=parentOf(p)}
  commit();
  const el=document.querySelector(`#list .task[data-id="${id}"]`);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800)}
}
function searchAll(q){
  q=q.trim().toLowerCase();if(!q)return[];const out=[],hit=s=>s&&s.toLowerCase().includes(q);
  const snip=s=>{const i=s.toLowerCase().indexOf(q),a=Math.max(0,i-30);return(a?'…':'')+s.slice(a,i+q.length+50).replace(/\s+/g,' ')};
  S.tasks.forEach(t=>{if(hit(t.name)||hit(t.note)){const pj=projOf(t);out.push({kind:t.archived?'Archived':t.done?'Done task':'Task',title:t.name,sub:[hit(t.note)?snip(t.note):'',pj?pj.name:'',t.due?'Due '+isoToUS(t.due)+(t.time?' '+t.time:''):''].filter(Boolean).join(' · '),color:colorOf(t),go:()=>goToTask(t.id),rank:t.archived?3:t.done?2:0})}});
  S.projects.forEach(p=>{
    if(hit(p.name))out.push({kind:'Project',title:p.name,sub:'Open project page',color:p.color,go:()=>{closeSearch();openProject(p.id)},rank:0});
    (p.notesList||[]).forEach(n=>{if(hit(n.title)||hit(n.text))out.push({kind:'Note',title:n.title||'Untitled note',sub:`${p.name}${hit(n.text)?' · '+snip(n.text):''}`,color:p.color,go:()=>{closeSearch();S.ui.projTab='notes';openProject(p.id);const el=document.querySelector(`[data-nid="${n.id}"]`);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800)}},rank:1})});
    (p.canvas||[]).forEach(c=>{if(c.type!=='task'&&hit(c.text))out.push({kind:'Free',title:snip(c.text),sub:`${p.name} · Free board`,color:p.color,go:()=>{closeSearch();S.ui.projTab='free';S.ui.cvTool='move';openProject(p.id);const el=document.querySelector(`[data-cid="${c.id}"]`);if(el){el.scrollIntoView({block:'center',inline:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800)}},rank:1})});
  });
  if(hit(S.notes))out.push({kind:'Notes',title:'Main notes',sub:snip(S.notes),color:NEUTRAL,go:()=>{closeSearch();if(S.ui.view==='project'){S.ui.view='tasks';commit()}const nt=$('#notes');nt.scrollIntoView({block:'center'});const i=nt.value.toLowerCase().indexOf(q);nt.focus();nt.setSelectionRange(i,i+q.length)},rank:1});
  return out.sort((a,b)=>a.rank-b.rank).slice(0,14);
}
let searchSel=0,searchRes=[];
function closeSearch(){const r=$('#searchRes');r.hidden=true;r.innerHTML=''}
function drawSearch(){
  const r=$('#searchRes'),q=$('#search').value;searchRes=searchAll(q);
  if(!q.trim()){closeSearch();return}
  r.hidden=false;const b=$('#search').getBoundingClientRect();r.style.top=(b.bottom+6)+'px';r.style.left=Math.max(8,Math.min(b.left,innerWidth-r.offsetWidth-8))+'px';
  r.innerHTML=searchRes.length?searchRes.map((x,i)=>`<button type="button" class="sr${i===searchSel?' on':''}" data-sr="${i}" style="--dot:${x.color}"><span class="sk">${x.kind}</span><span class="st"><i></i>${esc(x.title)}</span>${x.sub?`<span class="ss">${esc(x.sub)}</span>`:''}</button>`).join(''):`<p class="cal-hint" style="padding:10px">Nothing matches "${esc(q)}".</p>`;
  const b2=$('#search').getBoundingClientRect();r.style.left=Math.max(8,Math.min(b2.left,innerWidth-r.offsetWidth-8))+'px';
}
$('#search').addEventListener('input',()=>{searchSel=0;drawSearch()});
$('#search').addEventListener('focus',drawSearch);
$('#search').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();searchSel=Math.max(0,Math.min(searchRes.length-1,searchSel+(e.key==='ArrowDown'?1:-1)));drawSearch()}
  else if(e.key==='Enter'){e.preventDefault();const x=searchRes[searchSel];if(x){x.go();$('#search').blur()}}
  else if(e.key==='Escape'){$('#search').value='';closeSearch();$('#search').blur()}
});
$('#searchRes').addEventListener('mousedown',e=>e.preventDefault());
$('#searchRes').addEventListener('click',e=>{const b=e.target.closest('[data-sr]');if(b){searchRes[+b.dataset.sr].go();$('#search').blur()}});
$('#search').addEventListener('blur',()=>setTimeout(closeSearch,120));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.target.closest('input,textarea,select,[contenteditable]')){e.preventDefault();$('#search').focus()}});

