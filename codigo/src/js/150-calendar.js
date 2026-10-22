/* ---------- week calendar ---------- */
const HOUR=44,SNAP=15*60000;
const hm=t=>{const d=new Date(t);return`${pad(d.getHours())}:${pad(d.getMinutes())}`};
let calScrolled=false,chipQ='';
function renderChips(){
  const u=S.ui,tg=u.chipTag||'all',pj=u.chipProj||'all',q=chipQ.trim().toLowerCase();
  const list=S.tasks.filter(t=>!t.done&&(tg==='all'||(tg==='none'?!t.tagId:t.tagId===tg))&&(pj==='all'||(pj==='none'?!t.projectId:t.projectId===pj))&&(!q||t.name.toLowerCase().includes(q)))
    .sort((a,b)=>(rootOf(a).longTerm-rootOf(b).longTerm)||cmp(a,b));
  $('#calChips').innerHTML=list.length?list.map(t=>`<div class="tchip" draggable="true" data-task="${t.id}" style="--c:${colorOf(t)}" title="Drag onto the calendar">${esc(t.name)}</div>`).join(''):'<span class="cal-hint">No open tasks match these filters.</span>';
  $('#chipCnt').textContent=`${list.length} task${list.length===1?'':'s'}`;
}
function sessionColor(x){const t=byId(x.taskId);if(t)return colorOf(t);const g=S.tags.find(g=>g.id===x.tagId);return g?g.color:NEUTRAL}
function renderCalendar(){
  const u=S.ui,ws=weekStartOf(isoDate(u.calAnchor)),days=[...Array(7)].map((_,i)=>new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+i)),today=todayISO(),now=Date.now();
  const sess=filteredSessions(),ov=(x,s,e)=>Math.max(0,Math.min(x.end,e)-Math.max(x.start,s));
  const wsT=+ws,weT=+days[6]+DAY;let wk=0,wkp=0;sess.forEach(x=>{wk+=ov(x,wsT,Math.min(weT,now));wkp+=ov(x,Math.max(wsT,now),weT)});
  const prevBody=$('#cal .cal-body'),prevScroll=prevBody?prevBody.scrollTop:null;
  let gutter='';for(let h=1;h<24;h++)gutter+=`<span style="top:${h*HOUR}px">${pad(h)}:00</span>`;
  const cols=days.map((d,i)=>{
    const s0=+d,e0=s0+DAY,items=sess.filter(x=>ov(x,s0,e0)>0).sort((a,b)=>a.start-b.start);
    // lanes for overlapping blocks
    const lanesEnd=[];let cluster=[],clusterEnd=0;const placed=[];
    const flush=()=>{const n=Math.max(1,...cluster.map(c=>c.lane+1));cluster.forEach(c=>c.n=n);cluster=[];lanesEnd.length=0};
    items.forEach(x=>{if(cluster.length&&x.start>=clusterEnd)flush();let l=lanesEnd.findIndex(end=>end<=x.start);if(l<0){l=lanesEnd.length;lanesEnd.push(0)}lanesEnd[l]=x.end;const c={x,lane:l};cluster.push(c);placed.push(c);clusterEnd=Math.max(clusterEnd,x.end)});
    if(cluster.length)flush();
    const blocks=placed.map(({x,lane,n})=>{const st=Math.max(x.start,s0),en=Math.min(x.end,e0),top=(st-s0)/3600000*HOUR,h=Math.max(10,(en-st)/3600000*HOUR);
      const pjb=x.start>=now;
      return `<div class="blk${x.live?' live':''}${pjb?' proj':''}${h<34?' short':''}" data-sid="${x.id||''}" style="--c:${sessionColor(x)};top:${top}px;height:${h}px;left:calc(${lane/n*100}% + 2px);width:calc(${100/n}% - 4px)" title="${esc(x.name)} · ${hm(x.start)} to ${hm(x.end)}${x.start>=now?' (projected)':''}"><b>${esc(x.name)}</b><span>${hm(x.start)}–${hm(x.end)} · ${fmtDur(x.end-x.start)}${pjb?'<em class="ptag">Projected</em>':''}</span>${x.live?'':'<i class="rs" aria-hidden="true"></i>'}</div>`}).join('');
    const nowLine=now>=s0&&now<e0?`<div class="nowline" style="top:${(now-s0)/3600000*HOUR}px"></div>`:'';
    return `<div class="cal-day${dateToISO(d)===today?' today':''}" data-i="${i}" data-day="${s0}">${blocks}${nowLine}</div>`;
  }).join('');
  $('#cal').innerHTML=`<div class="cal-top">${navHTML('week',u.calAnchor,true)}<span class="cal-total">Spent this week: <b>${fmtDur(wk)}</b>${wkp?` <span class="pjtxt">+${fmtDur(wkp)} projected</span>`:''}</span></div>
    <div class="chipbar"><div class="chip-filters">
      <select data-cf="tag" aria-label="Filter tasks by tag"><option value="all">All tags</option><option value="none"${u.chipTag==='none'?' selected':''}>No tag</option>${S.tags.map(g=>`<option value="${g.id}"${u.chipTag===g.id?' selected':''}>${esc(g.name)}</option>`).join('')}</select>
      <select data-cf="proj" aria-label="Filter tasks by project"><option value="all">All projects</option><option value="none"${u.chipProj==='none'?' selected':''}>No project</option>${S.projects.map(p=>`<option value="${p.id}"${u.chipProj===p.id?' selected':''}>${esc(p.name)}</option>`).join('')}</select>
      <input type="search" data-cf="q" placeholder="Search tasks" value="${esc(chipQ)}" aria-label="Search tasks">
      <span class="cnt" id="chipCnt"></span></div>
      <div class="cal-chips" id="calChips"></div></div>
    <p class="cal-hint">Drag a task onto a day, or click an empty slot. Drag a block to move it, and drag its bottom edge to make it longer or shorter.</p>
    <div class="cal-wrap"><div class="cal-grid" style="--hour:${HOUR}px">
      <div class="cal-head"><div></div>${days.map(d=>{const s0=+d;let t=0,tp=0;sess.forEach(x=>{t+=ov(x,s0,Math.min(s0+DAY,now));tp+=ov(x,Math.max(s0,now),s0+DAY)});return`<div class="${dateToISO(d)===today?'today':''}">${fmtD(d,{weekday:'short'})} ${d.getDate()}<small>${t?fmtDur(t):tp?'':'·'}${tp?`<span class="pjtxt">${t?' +':''}${fmtDur(tp)} proj.</span>`:''}</small></div>`}).join('')}</div>
      <div class="cal-due"><div class="cal-due-lbl">Due</div>${days.map(d=>{const iso=dateToISO(d),list=dueOn(iso,matches).sort((a,b)=>(a.t.time||'~')<(b.t.time||'~')?-1:(a.t.time||'~')>(b.t.time||'~')?1:0),late=iso===today?S.tasks.filter(t=>!t.done&&t.due&&t.due<today&&matches(t)):[];
        return `<div class="cal-due-day">${late.map(t=>`<div class="tchip due late" draggable="true" data-task="${t.id}" style="--c:${colorOf(t)}" title="Overdue since ${isoToUS(t.due)}">! ${esc(t.name)}</div>`).join('')}${list.map(({t,proj})=>`<div class="tchip due${proj?' projd':''}" draggable="true" data-task="${t.id}" style="--c:${colorOf(t)}" title="${proj?'Repeats on this day':'Due this day'}${t.time?' at '+t.time:''}${t.repeat?' · '+repLabel(t.repeat):''}">${t.repeat?'↻ ':''}${t.time?`<b class="tm">${t.time}</b> `:''}${esc(t.name)}</div>`).join('')}</div>`}).join('')}</div>
      <div class="cal-body"><div class="cal-gutter" style="height:${24*HOUR}px">${gutter}</div>${cols.replace(/class="cal-day/g,`style="height:${24*HOUR}px" class="cal-day`)}</div>
    </div></div>`;
  renderChips();
  const body=$('#cal .cal-body');
  body.scrollTop=prevScroll!==null?prevScroll:6*HOUR;
}
setInterval(()=>{if(S.ui.view==='calendar'&&S.timer.running&&!calDrag)renderCalendar()},60000);
function addBlock(taskId,start,ms){
  const t=byId(taskId);if(!t)return;
  S.sessions.push({id:uid(),taskId:t.id,name:t.name,tagId:t.tagId,projectId:t.projectId,start,end:start+ms,manual:true});
  commit();
}
function slotFromEvent(e,dayEl){const r=dayEl.getBoundingClientRect(),y=Math.max(0,Math.min(e.clientY-r.top,24*HOUR));return +dayEl.dataset.day+Math.floor(y/HOUR*3600000/SNAP)*SNAP}
const cal=$('#cal');
cal.addEventListener('change',e=>{const f=e.target.dataset.cf;if(f==='tag'){S.ui.chipTag=e.target.value;save();renderChips()}if(f==='proj'){S.ui.chipProj=e.target.value;save();renderChips()}});
cal.addEventListener('input',e=>{if(e.target.dataset.cf==='q'){chipQ=e.target.value;renderChips()}});
cal.addEventListener('click',e=>{
  const s=e.target.closest('[data-shift]');if(s){const v=+s.dataset.shift;S.ui.calAnchor=v===0?todayISO():shiftAnchor('week',S.ui.calAnchor,v);commit();return}
  const pk=e.target.closest('[data-pick]');if(pk)openPeriodPicker(pk,'week',S.ui.calAnchor,iso=>{S.ui.calAnchor=iso;commit()});
});
cal.addEventListener('dragstart',e=>{const c=e.target.closest('.tchip');if(!c)return;try{e.dataTransfer.setData('text/plain','task:'+c.dataset.task);e.dataTransfer.effectAllowed='copy'}catch(_){}calChip=c.dataset.task});
let calChip=null;
cal.addEventListener('dragover',e=>{const d=e.target.closest('.cal-day');cal.querySelectorAll('.cal-day.drop').forEach(x=>x!==d&&x.classList.remove('drop'));if(!d||!calChip)return;e.preventDefault();d.classList.add('drop')});
cal.addEventListener('dragleave',e=>{if(!cal.contains(e.relatedTarget))cal.querySelectorAll('.cal-day.drop').forEach(x=>x.classList.remove('drop'))});
cal.addEventListener('drop',e=>{const d=e.target.closest('.cal-day');if(!d||!calChip)return;e.preventDefault();const id=calChip;calChip=null;addBlock(id,slotFromEvent(e,d),60*60000)});
cal.addEventListener('dragend',()=>{calChip=null;cal.querySelectorAll('.cal-day.drop').forEach(x=>x.classList.remove('drop'))});
/* move / resize blocks with the pointer */
let calDrag=null;
cal.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const b=e.target.closest('.blk'),d=e.target.closest('.cal-day');if(!d)return;
  if(b&&b.classList.contains('live'))return;
  if(!b){calDrag={mode:'new',y0:e.clientY,x0:e.clientX,day:d,ev:e};return}
  const x=S.sessions.find(s=>s.id===b.dataset.sid);if(!x)return;
  e.preventDefault();b.setPointerCapture(e.pointerId);
  calDrag={mode:e.target.closest('.rs')?'resize':'move',el:b,x,y0:e.clientY,x0:e.clientX,start:x.start,end:x.end,day0:+d.dataset.i,moved:false,ns:x.start,ne:x.end};
});
cal.addEventListener('pointermove',e=>{
  const D=calDrag;if(!D||D.mode==='new')return;
  const dy=e.clientY-D.y0,dx=e.clientX-D.x0;if(!D.moved&&Math.hypot(dx,dy)<4)return;
  D.moved=true;D.el.classList.add('dragging');
  const dms=Math.round(dy/HOUR*3600000/SNAP)*SNAP;
  if(D.mode==='resize'){D.ne=Math.max(D.start+SNAP,D.end+dms);D.ns=D.start;D.el.style.height=Math.max(10,(D.ne-D.ns)/3600000*HOUR)+'px'}
  else{
    const under=document.elementsFromPoint(e.clientX,e.clientY).find(n=>n.classList&&n.classList.contains('cal-day'));
    const di=under?+under.dataset.i:D.day0,dDay=(di-D.day0);
    const base=new Date(D.start);base.setDate(base.getDate()+dDay);
    D.ns=+base+dms;D.ne=D.ns+(D.end-D.start);
    const col=under||D.el.parentElement;if(D.el.parentElement!==col)col.appendChild(D.el);
    D.el.style.top=((D.ns-+col.dataset.day)/3600000*HOUR)+'px';D.el.style.left='2px';D.el.style.width='calc(100% - 4px)';
  }
  const sp=D.el.querySelector('span');if(sp)sp.textContent=`${hm(D.ns)}–${hm(D.ne)} · ${fmtDur(D.ne-D.ns)}`;
});
cal.addEventListener('pointerup',e=>{
  const D=calDrag;calDrag=null;if(!D)return;
  if(D.mode==='new'){if(Math.hypot(e.clientX-D.x0,e.clientY-D.y0)<5&&!e.target.closest('.blk'))openAddBlock(e,D.day);return}
  if(!D.moved){openBlockPop(D.el,D.x);return}
  D.x.start=D.ns;D.x.end=D.ne;commit();
});
cal.addEventListener('pointercancel',()=>{if(calDrag&&calDrag.el){calDrag=null;render()}else calDrag=null});
function durOptions(sel){return[15,30,45,60,90,120,180,240].map(m=>`<option value="${m}"${m===sel?' selected':''}>${fmtDur(m*60000)}</option>`).join('')}
function taskOptions(sel){return openTaskOptions().map(({t,depth})=>`<option value="${t.id}"${t.id===sel?' selected':''}>${'  '.repeat(depth)}${depth?'↳ ':''}${esc(t.name)}</option>`).join('')}
function openAddBlock(e,dayEl){
  const start=slotFromEvent(e,dayEl);if(!openTaskOptions().length){toast('Add a task first, then place it on the calendar.');return}
  const anchor=document.createElement('span');anchor.style.cssText=`position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`;document.body.appendChild(anchor);
  openPop(anchor,`<form class="pop-form blkpop"><strong>Add time on ${fmtD(new Date(start),{weekday:'short',month:'short',day:'numeric'})} at ${hm(start)}</strong>
    <select id="ab-task" aria-label="Task">${taskOptions(S.timer.taskId)}</select>
    <div class="row">Length<select id="ab-dur" style="width:auto;margin-left:auto">${durOptions(60)}</select></div>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Add</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=ev=>{ev.preventDefault();const id=el.querySelector('#ab-task').value,m=+el.querySelector('#ab-dur').value;closePop();addBlock(id,start,m*60000)};
  });
  anchor.remove();
}
function openBlockPop(blk,x){
  let ms=x.end-x.start,armed=false;
  const t=byId(x.taskId);
  openPop(blk,`<form class="pop-form blkpop"><strong>${esc(t?t.name:x.name||'Time block')}</strong>
    <div class="row">${fmtD(new Date(x.start),{weekday:'short',month:'short',day:'numeric'})}<span class="mono" id="bp-range">${hm(x.start)}–${hm(x.start+ms)}</span></div>
    ${t&&!t.done?`<select id="bp-task" aria-label="Task">${taskOptions(t.id)}</select>`:''}
    <div class="row">Length<div class="stepper" style="margin-left:auto"><button type="button" data-step="-1" aria-label="15 minutes less">−</button><b id="bp-len">${fmtDur(ms)}</b><button type="button" data-step="1" aria-label="15 minutes more">+</button></div></div>
    <div class="pop-actions"><button type="button" class="danger-link" data-del>Delete block</button><button class="btn primary">Done</button></div></form>`,el=>{
    el.addEventListener('click',e=>{const s=e.target.closest('[data-step]');if(!s)return;ms=Math.max(SNAP,ms+ +s.dataset.step*SNAP);el.querySelector('#bp-len').textContent=fmtDur(ms);el.querySelector('#bp-range').textContent=`${hm(x.start)}–${hm(x.start+ms)}`});
    const del=el.querySelector('[data-del]');del.onclick=()=>{if(!armed){armed=true;del.textContent='Click again to delete';return}
      S.sessions=S.sessions.filter(s=>s!==x);closePop();commit()};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();x.end=x.start+ms;const sel=el.querySelector('#bp-task');
      if(sel&&sel.value!==x.taskId){const nt=byId(sel.value);if(nt){x.taskId=nt.id;x.name=nt.name;x.tagId=nt.tagId;x.projectId=nt.projectId}}
      closePop();commit()};
  });
}

