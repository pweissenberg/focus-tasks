/* pomodoro: focus blocks and breaks; break time is not logged on tasks */
function isBreak(){return S.timer.mode==='pomo'&&S.timer.phase!=='focus'}
function setPhase(ph){const tm=S.timer,P=S.prefs.pomo;tm.phase=ph;tm.durMs=(ph==='focus'?P.focus:ph==='short'?P.short:P.long)*60000;tm.remainingMs=tm.durMs;tm.upMs=0}
function setMode(m){
  const tm=S.timer;if(tm.mode===m)return;
  if(tm.running){logSeg();tm.running=false;tm.segStart=null}
  if(m==='pomo'){tm.timerMs=tm.durMs;tm.mode='pomo';tm.round=0;setPhase('focus')}
  else{tm.mode='timer';tm.phase='focus';tm.durMs=tm.timerMs==null?30*60000:tm.timerMs;tm.remainingMs=tm.durMs;tm.upMs=0}
  commit();
}
function nextPhase(autoStart,at){
  const tm=S.timer,P=S.prefs.pomo;
  if(tm.phase==='focus'){tm.round=(tm.round||0)+1;setPhase(tm.round>=P.every?'long':'short');if(autoStart&&P.autoBreak){tm.running=true;tm.segStart=at||Date.now()}}
  else{if(tm.phase==='long'||tm.round>=P.every)tm.round=0;setPhase('focus')}
}
function pomoSkip(){const tm=S.timer,was=tm.running;if(was){logSeg();tm.running=false;tm.segStart=null}nextPhase(was);commit()}
function timerFinish(){
  const tm=S.timer,end=tm.segStart+tm.remainingMs,t=byId(tm.taskId),wasFocus=!isBreak();logSeg(end);
  tm.running=false;tm.segStart=null;tm.remainingMs=0;chime();
  if(tm.mode==='pomo'){const P=S.prefs.pomo;nextPhase(true,end);startBlink(wasFocus?(tm.phase==='long'?'⏰ Long break!':'⏰ Break time!'):'⏰ Back to focus!');commit();
    if(wasFocus){const lng=tm.phase==='long';toast(`Focus block done${t?` on "${t.name}"`:''}. ${lng?'Long':'Short'} break: ${lng?P.long:P.short} min.`,P.autoBreak?null:()=>timerStart(),'Start break')}
    else toast('Break over. Ready to focus again?',()=>timerStart(),'Start');
    return}
  startBlink("⏰ Time's up!");commit();
  toast(`Time's up!${t?` Time logged on "${t.name}".`:''}`);
}
function openPomoPop(anchor){
  const P=S.prefs.pomo,tm=S.timer;
  openPop(anchor,`<form class="pop-form pomo-pop"><strong>Pomodoro</strong>
    <div class="pm-grid">
      <label>Focus<span><input type="number" id="pm-focus" min="1" max="240" value="${P.focus}"> min</span></label>
      <label>Short break<span><input type="number" id="pm-short" min="1" max="60" value="${P.short}"> min</span></label>
      <label>Long break<span><input type="number" id="pm-long" min="1" max="120" value="${P.long}"> min</span></label>
      <label>Long break after<span><input type="number" id="pm-every" min="2" max="12" value="${P.every}"> blocks</span></label>
    </div>
    <label class="chk"><input type="checkbox" id="pm-auto"${P.autoBreak?' checked':''}> Start breaks automatically</label>
    <p class="sp-hint">Breaks don't count as time on your tasks.</p>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`,el=>{
    el.querySelector('[data-x]').onclick=closePop;
    el.querySelector('form').onsubmit=e=>{e.preventDefault();
      const v=(id,a,b,d)=>{const n=Math.round(+el.querySelector(id).value);return n>=a&&n<=b?n:d};
      Object.assign(P,{focus:v('#pm-focus',1,240,P.focus),short:v('#pm-short',1,60,P.short),long:v('#pm-long',1,120,P.long),every:v('#pm-every',2,12,P.every),autoBreak:el.querySelector('#pm-auto').checked});
      if(tm.round>=P.every)tm.round=0;
      const want=(tm.phase==='focus'?P.focus:tm.phase==='short'?P.short:P.long)*60000;
      if(tm.mode==='pomo'&&!tm.running&&want!==tm.durMs)setPhase(tm.phase);
      closePop();commit()};
    setTimeout(()=>{const i=el.querySelector('#pm-focus');i.focus();i.select()},0);
  });
}
function setDuration(ms){const tm=S.timer;if(tm.running||tm.mode==='pomo')return;tm.durMs=ms;tm.timerMs=ms;tm.remainingMs=ms;tm.upMs=0;commit()}
function timerParts(){
  const tm=S.timer,seg=tm.running?Date.now()-tm.segStart:0;
  if(tm.durMs>0){const rem=Math.max(0,tm.remainingMs-seg);return{text:fmtClock(rem),frac:1-rem/tm.durMs,up:false}}
  return{text:fmtClock(tm.upMs+seg),frac:0,up:true};
}
function openTaskOptions(){
  const out=[];
  const walk=(list,depth)=>list.sort(cmp).forEach(t=>{out.push({t,depth});walk(kids(t),depth+1)});
  [false,true].forEach(lt=>walk(S.tasks.filter(t=>isOpenRoot(t)&&!!t.longTerm===lt),0));
  return out;
}
function renderTimer(full){
  const tm=S.timer,p=timerParts();
  const clock=$('#tm-clock'),brk=isBreak();clock.textContent=p.text;clock.classList.toggle('up',p.up&&tm.running);clock.classList.toggle('brk',brk);$('#tm-prog').classList.toggle('brk',brk);
  $('#tm-bar').style.width=(p.frac*100).toFixed(1)+'%';
  $('#timerMini').textContent=tm.running?p.text:'';$('#timerToggle').classList.toggle('running',!!tm.running);$('#timerToggle').title=tm.running?`${brk?'Break':'Timer'}: ${p.text}`:'Timer (T)';
  setTitle(tm,p,brk);
  if(!full)return;
  const pomo=tm.mode==='pomo',P=S.prefs.pomo;
  document.querySelectorAll('[data-tmode]').forEach(b=>{const on=b.dataset.tmode===(pomo?'pomo':'timer');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('#tm-hms').hidden=pomo;$('#tm-presets').hidden=pomo;$('#tm-skip').hidden=!pomo;$('#tm-pomo-set').hidden=!pomo;$('#tm-phase').hidden=!pomo;
  $('#tm-reset').textContent=pomo?'Start over':'Reset timer';$('#tm-reset').title=pomo?'Back to the first focus block':'';
  if(pomo){const r=Math.min(tm.round||0,P.every);
    $('#tm-phase').innerHTML=`<span class="ph-name${brk?' brk':''}">${tm.phase==='focus'?`Focus ${Math.min(r+1,P.every)} of ${P.every}`:tm.phase==='short'?'Short break':'Long break'}</span><span class="ph-dots" title="${r} of ${P.every} focus blocks done">${[...Array(P.every)].map((_,i)=>`<i class="${i<r?'on':i===r&&!brk?'cur':''}"></i>`).join('')}</span>`;
    $('#tm-skip').textContent=brk?'Skip break':'Skip to break'}
  const sel=$('#tm-task'),opts=openTaskOptions();
  const cur=byId(tm.taskId);
  sel.innerHTML='<option value="">No task (just timing)</option>'+opts.map(({t,depth})=>`<option value="${t.id}">${'  '.repeat(depth)}${depth?'↳ ':''}${esc(t.name)}${rootOf(t).longTerm?' (long term)':''}</option>`).join('')
    +(cur&&cur.done?`<option value="${cur.id}">${esc(cur.name)} (done)</option>`:'');
  sel.value=cur?cur.id:'';
  const tag=cur&&tagOf(cur),proj=cur&&projOf(cur);
  $('#tm-meta').innerHTML=cur?`${tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:'<span>No tag</span>'}${proj?`<span>${esc(proj.name)}</span>`:''}<span>⏱ ${fmtDur(spentOf(cur.id))} total</span>`:'<span>Pick a task, or press ▶ on any task in the list.</span>';
  const H=Math.floor(tm.durMs/3600000),M=Math.floor(tm.durMs%3600000/60000),Sx=Math.floor(tm.durMs%60000/1000);
  [['#tm-h',H],['#tm-m',M],['#tm-s',Sx]].forEach(([q,v])=>{const i=$(q);i.disabled=tm.running;if(document.activeElement!==i)i.value=pad(v)});
  document.querySelectorAll('#tm-presets button').forEach(b=>b.disabled=tm.running);
  const started=tm.durMs>0?tm.remainingMs<tm.durMs&&tm.remainingMs>0:tm.upMs>0;
  const sb=$('#tm-start');sb.textContent=tm.running?(brk?'On break':'Running'):started?'Resume':pomo?(brk?'Start break':'Start focus'):'Start';sb.disabled=tm.running;sb.style.opacity=tm.running?.6:'';
  const pb=$('#tm-pause');pb.disabled=!tm.running;pb.style.opacity=tm.running?'':.6;
  const d0=new Date();d0.setHours(0,0,0,0);let today=0;allSessions().forEach(x=>today+=Math.max(0,Math.min(x.end,Date.now())-Math.max(x.start,+d0)));
  let planned=0;S.sessions.forEach(x=>planned+=Math.max(0,Math.min(x.end,+d0+DAY)-Math.max(x.start,+d0)));const lv=liveSeg();if(lv)planned+=Math.max(0,lv.end-Math.max(lv.start,+d0));
  let timed=0;allSessions().forEach(x=>{if(!x.manual)timed+=Math.max(0,Math.min(x.end,Date.now())-Math.max(x.start,+d0))});
  $('#tm-today').innerHTML=`Today: <b>${fmtDur(timed)}</b> on the timer | <b>${fmtDur(planned)}</b> in the calendar`;
  $('#tm-today').title='Timer = time actually recorded with the timer today. Calendar = all blocks set for today, including ones you added by hand and planned ones.';
  const G=goalInfo(),tg=$('#tm-goal');tg.hidden=!G;
  if(G){const pct=Math.min(100,G.todayMs/G.g*100);
    tg.innerHTML=`<div class="tg-top"><span>Daily goal: <b class="mono">${fmtDur(G.todayMs)}</b> of ${fmtDur(G.g)}</span><span class="tg-streak${G.streak?' on':''}" title="${G.streak} day${G.streak===1?'':'s'} in a row with the goal reached">${icons.flame}${G.streak}</span></div><div class="progress${G.met?' ok':''}"><i style="width:${pct.toFixed(1)}%"></i></div>`}
}
setInterval(()=>{
  const tm=S.timer;if(!tm.running)return;
  if(tm.durMs>0&&Date.now()>=tm.segStart+tm.remainingMs){timerFinish();return}
  renderTimer(false);
},250);
setInterval(()=>{if(S.timer.running){spentCache=null;renderTimer(true);if(S.ui.view==='stats')renderStats()}},30000);
