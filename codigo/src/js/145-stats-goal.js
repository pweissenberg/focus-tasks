/* ---------- stats ---------- */
function filteredSessions(){
  const pm=S.ui.project,tg=S.ui.tag;
  return allSessions().map(x=>{const t=byId(x.taskId);return{id:x.id,live:x.live,start:x.start,end:x.end,taskId:x.taskId,t,tagId:t?t.tagId:x.tagId,projectId:t?t.projectId:x.projectId,name:t?t.name:(x.name||(x.taskId?'Deleted task':'No task'))}})
    .filter(x=>(pm==='all'||x.projectId===pm)&&(tg==='all'||x.tagId===tg));
}
/* daily goal: time tracked per day (timer + calendar blocks up to now) and the streak of days that reached it */
function dayTotals(){
  const m=new Map(),now=Date.now();
  allSessions().forEach(x=>{let s=x.start;const e=Math.min(x.end,now);
    while(s<e){const d=new Date(s),next=+new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),k=dateToISO(d);m.set(k,(m.get(k)||0)+Math.min(e,next)-s);s=next}});
  return m;
}
function goalInfo(){
  const g=(S.prefs.goalMins||0)*60000;if(!g)return null;
  const m=dayTotals(),wk=S.prefs.goalDays==='weekdays',hit=iso=>(m.get(iso)||0)>=g,off=d=>wk&&(d.getDay()===0||d.getDay()===6);
  const d=new Date();d.setHours(0,0,0,0);const today=dateToISO(d),todayMs=m.get(today)||0;
  // today still counts as "in progress": the streak runs up to yesterday until the goal is reached
  let streak=0;if(!hit(today))d.setDate(d.getDate()-1);
  for(let i=0;i<4000;i++){if(hit(dateToISO(d)))streak++;else if(!off(d))break;d.setDate(d.getDate()-1)}
  let best=0,run=0;const days=[...m.keys()].filter(hit).sort();
  if(days.length){const c=isoDate(days[0]),end=new Date();end.setHours(0,0,0,0);
    for(;c<=end;c.setDate(c.getDate()+1)){if(hit(dateToISO(c))){run++;if(run>best)best=run}else if(!off(c)&&dateToISO(c)!==today)run=0}}
  return{g,todayMs,streak,best:Math.max(best,streak),met:todayMs>=g};
}
function goalCardHTML(){
  const G=goalInfo();
  if(!G)return `<div class="goal off"><span class="gl-t">Daily goal</span><span class="gl-s">Pick how much time you want to track each day and keep a streak going.</span><button class="btn sm" type="button" data-goal>Set a daily goal</button></div>`;
  const pct=Math.min(100,Math.round(G.todayMs/G.g*100));
  return `<div class="goal${G.met?' met':''}"><div class="gl-ring" style="--p:${pct}"><span class="mono">${pct}%</span></div>
    <div class="gl-txt"><span class="gl-t">${G.met?'Goal reached today':'Today'}: ${fmtDur(G.todayMs)} of ${fmtDur(G.g)}</span>
    <span class="gl-s${G.streak?' on':''}">${icons.flame}${G.streak?`<b>${G.streak}</b> day${G.streak===1?'':'s'} in a row`:'Reach it today to start a streak'}${G.best>G.streak?` · best ${G.best}`:''}${S.prefs.goalDays==='weekdays'?' · weekdays':''}</span></div>
    <button class="linkbtn" type="button" data-goal>Edit</button></div>`;
}
function openGoalPop(anchor){
  const cur=S.prefs.goalMins||0;
  openPop(anchor,`<form class="pop-form goal-pop"><strong>Daily goal</strong>
    <div class="presets">${[30,60,120,180,240,360].map(m=>`<button type="button" data-gm="${m}" class="${m===cur?'on':''}">${fmtDur(m*60000)}</button>`).join('')}</div>
    <label class="gl-row">Or type<input type="number" id="gl-min" min="5" max="1440" step="5" value="${cur||120}" aria-label="Goal in minutes"> minutes a day</label>
    <label class="chk"><input type="checkbox" id="gl-wk"${S.prefs.goalDays==='weekdays'?' checked':''}> Weekdays only (weekends don't break the streak)</label>
    <p class="sp-hint">Counts all the time you track: the timer and blocks in the calendar.</p>
    <div class="pop-actions">${cur?'<button type="button" class="danger-link" data-off>Turn off</button>':''}<button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    el.addEventListener('click',e=>{const b=e.target.closest('[data-gm]');if(!b)return;el.querySelector('#gl-min').value=b.dataset.gm;el.querySelectorAll('[data-gm]').forEach(x=>x.classList.toggle('on',x===b))});
    const off=el.querySelector('[data-off]');if(off)off.onclick=()=>{S.prefs.goalMins=0;closePop();commit()};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();const inp=el.querySelector('#gl-min'),n=Math.round(+inp.value);
      if(!(n>=5&&n<=1440)){inp.classList.add('invalid');inp.focus();return}
      S.prefs.goalMins=n;S.prefs.goalDays=el.querySelector('#gl-wk').checked?'weekdays':'all';closePop();commit()};
  });
}
function groupInfo(x,by){
  if(by==='tag'){const g=S.tags.find(g=>g.id===x.tagId);return g?{k:g.id,name:g.name,color:g.color}:{k:'_',name:'No tag',color:NEUTRAL}}
  if(by==='project'){const p=S.projects.find(p=>p.id===x.projectId);return p?{k:p.id,name:p.name,color:p.color||'var(--accent)'}:{k:'_',name:'No project',color:NEUTRAL}}
  return x.taskId?{k:x.taskId,name:x.name,color:x.t?colorOf(x.t):NEUTRAL}:{k:'_',name:'No task',color:NEUTRAL};
}
function renderStats(){
  const u=S.ui,P=period(u.statsRange,u.statsAnchor),by=u.statsGroup,now=Date.now();
  const sess=filteredSessions(),ov=(x,s,e)=>Math.max(0,Math.min(x.end,e)-Math.max(x.start,s));
  const ovA=(x,s,e)=>ov(x,s,Math.min(e,now)),ovP=(x,s,e)=>ov(x,Math.max(s,now),e);
  let total=0,proj=0,count=0;const groups=new Map();
  sess.forEach(x=>{const a=ovA(x,P.a,P.b),pj=ovP(x,P.a,P.b);if(!a&&!pj)return;total+=a;proj+=pj;if(a)count++;
    const g=groupInfo(x,by);const c=groups.get(g.k)||Object.assign({ms:0,pj:0},g);c.ms+=a;c.pj+=pj;groups.set(g.k,c)});
  let order=[...groups.values()].sort((a,b)=>(b.ms-a.ms)||(b.pj-a.pj));
  const LIMIT=8;let otherKeys=new Set();
  if(order.length>LIMIT){const rest=order.slice(LIMIT-1);otherKeys=new Set(rest.map(r=>r.k));order=order.slice(0,LIMIT-1).concat([{k:'__other',name:`${rest.length} others`,color:NEUTRAL,ms:rest.reduce((n,r)=>n+r.ms,0),pj:rest.reduce((n,r)=>n+r.pj,0)}])}
  const keyOf=x=>{const k=groupInfo(x,by).k;return otherKeys.has(k)?'__other':k};
  const cols=P.buckets.map(bk=>{const m=new Map(),mp=new Map();let t=0,tp=0;sess.forEach(x=>{const a=ovA(x,bk.s,bk.e),pj=ovP(x,bk.s,bk.e);const k=keyOf(x);
    if(a){m.set(k,(m.get(k)||0)+a);t+=a}if(pj){mp.set(k,(mp.get(k)||0)+pj);tp+=pj}});return{m,mp,t,tp}});
  const G=goalInfo(),showG=!!G&&(u.statsRange==='week'||u.statsRange==='month')&&u.tag==='all'&&u.project==='all';
  const max=Math.max(0,...cols.map(c=>c.t+c.tp),showG?G.g:0),steps=[5,10,15,30,60,120,180,240,360,480,720,1440,2880,4800,7200,12000].map(m=>m*60000);
  const step=steps.find(s=>max/s<=4)||steps[steps.length-1],top=Math.max(step,Math.ceil(max/step)*step);
  let grid='';for(let v=step;v<=top;v+=step)grid+=`<div class="gridline" style="bottom:${v/top*100}%"><span>${fmtDur(v)}</span></div>`;
  if(showG)grid+=`<div class="goalline" style="bottom:${G.g/top*100}%"><span>Goal ${fmtDur(G.g)}</span></div>`;
  const colHTML=cols.map((c,i)=>{
    const segs=order.filter(g=>c.m.get(g.k)).map(g=>`<i style="--sc:${g.color};flex:${c.m.get(g.k)} 1 0"></i>`).join('')
      +order.filter(g=>c.mp.get(g.k)).map(g=>`<i class="pj" style="--sc:${g.color};flex:${c.mp.get(g.k)} 1 0"></i>`).join('');
    return `<div class="col" data-i="${i}"><div class="stack" style="height:${(c.t+c.tp)/top*100}%">${segs}</div></div>`}).join('');
  const nDays=u.statsRange==='day'?0:Math.max(1,Math.round((Math.max(P.a,Math.min(now,P.b))-P.a)/DAY));
  const filt=[u.project!=='all'&&(S.projects.find(p=>p.id===u.project)||{}).name,u.tag!=='all'&&(S.tags.find(g=>g.id===u.tag)||{}).name].filter(Boolean);
  const pjTxt=proj?` · <span class="pjtxt">+${fmtDur(proj)} projected</span>`:'';
  $('#stats').innerHTML=`<div class="stats-bar">
      <div class="views">${[['day','Day'],['week','Week'],['month','Month'],['year','Year']].map(([k,l])=>`<button class="seg${u.statsRange===k?' on':''}" type="button" data-range="${k}">${l}</button>`).join('')}</div>
      <div class="groupby"><span class="lbl">Group by:</span>${[['tag','Tag'],['project','Project'],['task','Task']].map(([k,l])=>`<button class="seg${by===k?' on':''}" type="button" data-group="${k}">${l}</button>`).join('')}</div>
      ${navHTML(u.statsRange,u.statsAnchor,true)}
    </div>
    <div class="hero-row"><div class="hero"><span class="big">${fmtDur(total)}</span><span class="sub">spent · ${count} session${count===1?'':'s'}${nDays>1&&total?` · ${fmtDur(total/nDays)} per day on average`:''}${pjTxt}${filt.length?` · only ${esc(filt.join(' + '))}`:''}</span></div>${goalCardHTML()}</div>
    <div class="chart"><div class="chart-plot" id="plot">${grid}${colHTML}</div><div class="xlabels">${P.buckets.map(bk=>`<span>${bk.label}</span>`).join('')}</div></div>
    ${order.length?`<div class="legend">${order.map(g=>`<span style="--dot:${g.color}"><i></i>${esc(g.name)}</span>`).join('')}${proj?'<span class="pjkey" style="--dot:var(--ink-3)"><i></i>Faded = projected (planned in Calendar, not done yet)</span>':''}</div>`:''}
    ${total||proj?'':'<p class="stats-empty">No time tracked in this period. Press ▶ on a task, use the timer, or add blocks in Calendar.</p>'}
    <div class="bd bd-one"><h3>Time by ${by}</h3>${order.length?'<ol>'+order.map(x=>`<li><span class="lab" style="--dot:${x.color}"><i></i><span>${esc(x.name)}</span></span><span class="val">${fmtDur(x.ms)}${total?` · ${Math.round(x.ms/total*100)}%`:''}${x.pj?` <span class="pjtxt">+${fmtDur(x.pj)} projected</span>`:''}</span><span class="track" style="--dot:${x.color}"><b style="width:${(x.ms/Math.max(1,...order.map(o=>o.ms))*100).toFixed(1)}%"></b></span></li>`).join('')+'</ol>':'<p class="none">Nothing tracked yet.</p>'}</div>`;
  statsCols={cols,order,P};
}
let statsCols=null,tipEl=null;
$('#stats').addEventListener('click',e=>{
  const gl=e.target.closest('[data-goal]');if(gl){openGoalPop(gl);return}
  const r=e.target.closest('[data-range]');if(r){S.ui.statsRange=r.dataset.range;commit();return}
  const g=e.target.closest('[data-group]');if(g){S.ui.statsGroup=g.dataset.group;commit();return}
  const s=e.target.closest('[data-shift]');if(s){const v=+s.dataset.shift;S.ui.statsAnchor=v===0?todayISO():shiftAnchor(S.ui.statsRange,S.ui.statsAnchor,v);commit();return}
  const pk=e.target.closest('[data-pick]');if(pk)openPeriodPicker(pk,S.ui.statsRange,S.ui.statsAnchor,iso=>{S.ui.statsAnchor=iso;commit()});
});
$('#stats').addEventListener('mousemove',e=>{
  const c=e.target.closest('.col');
  if(!c||!statsCols){if(tipEl){tipEl.remove();tipEl=null}return}
  const i=+c.dataset.i,col=statsCols.cols[i],bk=statsCols.P.buckets[i];
  if(!tipEl){tipEl=document.createElement('div');tipEl.className='tip';document.body.appendChild(tipEl)}
  tipEl.innerHTML=`${esc(bk.full)}: <b>${col.t?fmtDur(col.t):'nothing'}</b>`+statsCols.order.filter(g=>col.m.get(g.k)).map(g=>`<div class="row" style="--dot:${g.color}"><i></i>${esc(g.name)}<b>${fmtDur(col.m.get(g.k))}</b></div>`).join('')
    +(col.tp?`<div class="row" style="opacity:.75;margin-top:6px">Projected<b>${fmtDur(col.tp)}</b></div>`+statsCols.order.filter(g=>col.mp.get(g.k)).map(g=>`<div class="row" style="--dot:${g.color};opacity:.75"><i></i>${esc(g.name)}<b>${fmtDur(col.mp.get(g.k))}</b></div>`).join(''):'');
  const w=tipEl.offsetWidth,h=tipEl.offsetHeight;tipEl.style.left=Math.max(8,Math.min(e.clientX-w/2,innerWidth-w-8))+'px';tipEl.style.top=Math.max(8,e.clientY-h-14)+'px';
});
$('#stats').addEventListener('mouseleave',()=>{if(tipEl){tipEl.remove();tipEl=null}});

