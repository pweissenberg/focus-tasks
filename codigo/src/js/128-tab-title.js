/* tab title: counts while the timer runs and blinks when time is up, until you come back to the tab */
let blink=null;
function setTitle(tm,p,brk){
  tm=tm||S.timer;p=p||timerParts();if(brk==null)brk=isBreak();
  const t=byId(tm.taskId);
  const base=titleAlert?`🔔 ${titleAlert}`:tm.running?(brk?`☕ ${p.text} · Break`:`${p.text} · ${t?t.name:'Focus Tasks'}`):'Focus Tasks';
  const want=blink&&blink.on?blink.msg:base;
  if(document.title!==want)document.title=want;
}
function startBlink(msg){
  blink={msg,on:true,t0:Date.now(),away:document.hidden||!document.hasFocus()};
  $('#timerToggle').classList.add('ring');setTitle();
}
function stopBlink(){if(!blink)return;blink=null;$('#timerToggle').classList.remove('ring');setTitle()}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(blink)stopBlink()},true));
addEventListener('focus',()=>{if(blink&&blink.away)stopBlink()});
function secTick(){
  const tm=S.timer;
  if(tm.running&&tm.durMs>0&&Date.now()>=tm.segStart+tm.remainingMs){timerFinish();return}
  if(blink){
    if(document.hidden||!document.hasFocus())blink.away=true;else if(blink.away){stopBlink();return}
    const on=Math.floor((Date.now()-blink.t0)/1000)%2===0;if(on!==blink.on){blink.on=on;$('#timerToggle').classList.toggle('ring',on)}}
  if(tm.running||blink)renderTimer(false);
}
setInterval(secTick,1000);
// Chrome slows page timers in background tabs (down to once a minute after a while); a tiny worker keeps a steady
// one-second beat there, so the tab title keeps counting and the timer ends on time
try{const w=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'],{type:'text/javascript'})));w.onmessage=()=>{if(document.hidden)secTick()};w.onerror=()=>{}}catch(e){}
$('#tm-start').onclick=timerStart;
$('#tm-pause').onclick=timerPause;
$('#tm-reset').onclick=timerReset;
$('#tm-mode').onclick=e=>{const b=e.target.closest('[data-tmode]');if(b)setMode(b.dataset.tmode)};
$('#tm-skip').onclick=pomoSkip;
$('#tm-goal').onclick=e=>openGoalPop(e.currentTarget);
$('#tm-goal').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGoalPop(e.currentTarget)}};
$('#tm-pomo-set').onclick=e=>openPomoPop(e.currentTarget);
$('#tm-task').onchange=e=>{setTimerTask(e.target.value);commit()};
['#tm-h','#tm-m','#tm-s'].forEach(q=>{$(q).addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,2)});$(q).addEventListener('focus',e=>e.target.select())});
['#tm-h','#tm-m','#tm-s'].forEach(q=>$(q).addEventListener('change',()=>{
  const v=q=>Math.max(0,Math.floor(+$(q).value||0));
  setDuration(Math.min(v('#tm-h'),23)*3600000+Math.min(v('#tm-m'),59)*60000+Math.min(v('#tm-s'),59)*1000)}));
$('#tm-presets').onclick=e=>{const b=e.target.closest('[data-min]');if(b)setDuration(+b.dataset.min*60000)};
$('#timerToggle').onclick=()=>{S.ui.timerOpen=!S.ui.timerOpen;commit()};
$('#timerClose').onclick=()=>{S.ui.timerOpen=false;commit()};
$('#noiseToggle').onclick=()=>{S.ui.noiseOpen=!S.ui.noiseOpen;commit()};
$('#noiseClose').onclick=()=>{S.ui.noiseOpen=false;commit()};

