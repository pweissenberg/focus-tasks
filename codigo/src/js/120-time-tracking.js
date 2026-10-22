/* ---------- time tracking ---------- */
const fmtDur=ms=>{const m=Math.round(ms/60000);if(m<60)return m+'m';const h=Math.floor(m/60),r=m%60;return r?`${h}h ${pad(r)}m`:`${h}h`};
const fmtClock=ms=>{const t=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return h?`${h}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`};
function liveSeg(){const tm=S.timer;if(!tm.running||isBreak())return null;let end=Date.now();if(tm.durMs>0)end=Math.min(end,tm.segStart+tm.remainingMs);return{taskId:tm.taskId,start:tm.segStart,end,live:true}}
function allSessions(){const l=liveSeg();return l?S.sessions.concat([l]):S.sessions}
let spentCache=null;
function spentOf(id){if(!spentCache){spentCache=new Map();const nw=Date.now();allSessions().forEach(x=>spentCache.set(x.taskId,(spentCache.get(x.taskId)||0)+Math.max(0,Math.min(x.end,nw)-x.start)))}return spentCache.get(id)||0}
const _render=render;render=function(){spentCache=null;_render()};
function logSeg(end){
  const tm=S.timer;if(!tm.running)return;const e=end||Date.now(),ms=e-tm.segStart;
  if(ms>=1000&&!isBreak()){const t=byId(tm.taskId);S.sessions.push({id:uid(),taskId:tm.taskId,name:t?t.name:'',tagId:t?t.tagId:null,projectId:t?t.projectId:null,start:tm.segStart,end:e})}
  if(tm.durMs>0)tm.remainingMs=Math.max(0,tm.remainingMs-ms);else tm.upMs+=ms;
  tm.segStart=e;
}
function timerStart(){const tm=S.timer;if(tm.running)return;stopBlink();if(tm.durMs>0&&tm.remainingMs<=0)tm.remainingMs=tm.durMs;tm.running=true;tm.segStart=Date.now();ensureAudio();commit()}
function timerPause(){const tm=S.timer;if(!tm.running)return;logSeg();tm.running=false;tm.segStart=null;commit()}
function timerReset(){const tm=S.timer;if(tm.running)logSeg();tm.running=false;tm.segStart=null;if(tm.mode==='pomo'){tm.round=0;setPhase('focus')}else{tm.remainingMs=tm.durMs;tm.upMs=0}commit()}
function setTimerTask(id){const tm=S.timer;if(tm.taskId===(id||null))return;if(tm.running)logSeg();tm.taskId=id||null}
function focusTask(id){
  const tm=S.timer;if(tm.taskId===id&&tm.running&&!isBreak()){timerPause();return}
  if(isBreak()){if(tm.running){tm.running=false;tm.segStart=null}setPhase('focus')}
  setTimerTask(id);if(!S.ui.timerOpen&&innerWidth>1180)S.ui.timerOpen=true;
  if(tm.running)commit();else timerStart();
}
