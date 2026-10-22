/* ---------- recurring tasks ---------- */
const REPEATS=[['','Never'],['daily','Every day'],['weekdays','Weekdays (Mon to Fri)'],['days','Some days of the week'],['weekly','Every week'],['monthly','Every month']];
/* repeat {freq} plus: days [0-6] for 'days', wd 0-6 for 'weekly', for 'monthly' either mday (1-31, -1 = last day) or nth (1-4, -1 = last) + nwd 0-6 */
const WD_SHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],WD_LONG=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const NTH_NAME={1:'first',2:'second',3:'third',4:'fourth','-1':'last'};
const ordSuf=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
const repLabel=r=>{if(!r)return'';const f=r.freq;
  if(f==='days'&&r.days&&r.days.length)return r.days.length===7?'Every day':[...r.days].sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>WD_SHORT[d]).join(', ');
  if(f==='weekly'&&r.wd!=null)return 'Every '+WD_LONG[r.wd];
  if(f==='monthly'&&r.nth)return `The ${NTH_NAME[r.nth]} ${WD_LONG[r.nwd||0]} of every month`;
  if(f==='monthly'&&r.mday)return r.mday===-1?'Last day of every month':`Every month on the ${ordSuf(r.mday)}`;
  return ({daily:'Every day',weekdays:'Weekdays',days:'Some days',weekly:'Every week',monthly:'Every month'})[f]||''};
const monLen=(y,m)=>new Date(y,m+1,0).getDate();
function monthHit(y,m,r){ // the day of month y/m the repeat falls on
  if(r.nth){const wd=r.nwd||0;if(r.nth===-1){const L=monLen(y,m),last=new Date(y,m,L).getDay();return L-((last-wd+7)%7)}
    const first=new Date(y,m,1).getDay();return 1+((wd-first+7)%7)+7*(r.nth-1)}
  return r.mday===-1?monLen(y,m):Math.min(r.mday,monLen(y,m))}
function repMatches(iso,r){if(!r||typeof r!=='object')return true;const d=isoDate(iso),w=d.getDay();
  if(r.freq==='days'&&r.days&&r.days.length)return r.days.includes(w);
  if(r.freq==='weekly'&&r.wd!=null)return w===r.wd;
  if(r.freq==='weekdays')return w>0&&w<6;
  if(r.freq==='monthly'&&(r.nth||r.mday))return d.getDate()===monthHit(d.getFullYear(),d.getMonth(),r);
  return true}
// the first day on or after iso that the repeat falls on
const firstDue=(iso,r)=>repMatches(iso,r)?iso:nextDue(iso,r);
function nextDue(iso,rep){
  const r=typeof rep==='string'?{freq:rep}:(rep||{}),freq=r.freq,d=isoDate(iso);
  if(freq==='daily')d.setDate(d.getDate()+1);
  else if(freq==='weekdays'){do{d.setDate(d.getDate()+1)}while(d.getDay()===0||d.getDay()===6)}
  else if(freq==='days'&&r.days&&r.days.length){let n=0;do{d.setDate(d.getDate()+1)}while(!r.days.includes(d.getDay())&&n++<8)}
  else if(freq==='weekly'){if(r.wd!=null){do{d.setDate(d.getDate()+1)}while(d.getDay()!==r.wd)}else d.setDate(d.getDate()+7)}
  else if(freq==='monthly'&&(r.nth||r.mday)){let y=d.getFullYear(),m=d.getMonth(),hit=monthHit(y,m,r);
    if(hit<=d.getDate()){m++;if(m>11){m=0;y++}hit=monthHit(y,m,r)}d.setFullYear(y,m,hit)}
  else if(freq==='monthly'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}
  return dateToISO(d);
}
// open tasks due on a day, plus future repeats of recurring tasks (marked projected)
function dueOn(iso,filter){
  const out=[];
  S.tasks.forEach(t=>{if(t.done||!t.due||(filter&&!filter(t)))return;
    if(t.due===iso){out.push({t,proj:false});return}
    if(t.repeat&&t.due<iso){let d=t.due,n=0;while(d<iso&&n++<800)d=nextDue(d,t.repeat);if(d===iso)out.push({t,proj:true})}});
  return out;
}

/* ---------- reminders ---------- */
const REMINDS=[['','No reminder'],[0,'At the due time'],[5,'5 min before'],[15,'15 min before'],[30,'30 min before'],[60,'1 hour before'],[1440,'1 day before']];
const remShort=m=>m===0?'at due time':m>=1440?'1 day before':m>=60?`${m/60}h before`:`${m}m before`;
function dueTs(t){const[h,m]=(t.time||'09:00').split(':').map(Number);const d=isoDate(t.due);d.setHours(h||0,m||0,0,0);return +d}
function remindAt(t){if(t.done||t.archived||t.remind==null||!t.due)return null;const base=dueTs(t)-t.remind*60000;return t.snooze&&t.snooze>base?t.snooze:base}
function askNotify(){try{if('Notification'in window&&Notification.permission==='default'){const r=Notification.requestPermission();if(r&&r.catch)r.catch(()=>{})}}catch(e){}}
function checkReminders(){
  if(CL.enabled&&!CL.on)return;
  const now=Date.now();let ch=false;
  S.tasks.forEach(t=>{const at=remindAt(t);if(at==null||at>now||t.remindFired===at)return;
    t.remindFired=at;ch=true;if(now-at<6*3600000)fireReminder(t)});
  if(ch)save();
}
let rstack=null;
function fireReminder(t){
  chime();
  if(!rstack){rstack=document.createElement('div');rstack.className='rstack';rstack.setAttribute('aria-live','assertive');document.body.appendChild(rstack);
    rstack.addEventListener('click',e=>{const b=e.target.closest('[data-rc]');if(!b)return;const card=b.closest('.rcard'),x=byId(card.dataset.rid),a=b.dataset.rc;card.remove();if(!x)return;
      if(a==='snooze'){x.snooze=Date.now()+10*60000;commit();toast(`Snoozed "${x.name}" for 10 minutes.`)}
      else if(a==='open')goToTask(x.id);
      else if(a==='done'&&!x.done){if(S.timer.taskId===x.id&&S.timer.running)timerPause();complete(x);commit();toast(`"${x.name}" moved to Done.`,()=>{reopen(x);commit()})}});}
  const old=rstack.querySelector(`[data-rid="${t.id}"]`);if(old)old.remove();
  const when=(t.due===todayISO()?'today':isoToUS(t.due))+' at '+(t.time||'09:00');
  const el=document.createElement('div');el.className='rcard';el.dataset.rid=t.id;el.style.setProperty('--c',colorOf(t));el.setAttribute('role','alert');
  el.innerHTML=`<div class="rc-head">${icons.bell}<span>Reminder</span><button type="button" class="closex" data-rc="x" aria-label="Dismiss reminder">×</button></div>
    <b class="rc-name">${esc(t.name)}</b><span class="rc-when">Due ${when}</span>
    <div class="rc-actions"><button type="button" class="btn sm" data-rc="snooze">Snooze 10 min</button><button type="button" class="btn sm" data-rc="open">Show task</button><button type="button" class="btn sm primary" data-rc="done">Mark done</button></div>`;
  rstack.appendChild(el);while(rstack.children.length>3)rstack.firstElementChild.remove();
  try{if('Notification'in window&&Notification.permission==='granted'){const n=new Notification(t.name,{body:'Due '+when,tag:'focus-'+t.id});n.onclick=()=>{try{focus()}catch(e){}goToTask(t.id);n.close()}}}catch(e){}
  if(document.hidden){titleAlert=t.name;renderTimer(false)}
}
setInterval(checkReminders,15000);setTimeout(checkReminders,1500);
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(titleAlert){titleAlert=null;renderTimer(false)}checkReminders()});

/* ---------- archive: done tasks leave the Done list (they stay in stats and search) ---------- */
function autoArchive(){const d=S.prefs.archiveAfter;if(!d)return 0;const lim=Date.now()-d*DAY,at=new Date().toISOString();let n=0;
  S.tasks.forEach(t=>{if(t.done&&!t.archived&&t.doneAt&&+new Date(t.doneAt)<lim){t.archived=true;t.archivedAt=at;n++}});return n}
setInterval(()=>{if(autoArchive())commit()},3600000);

