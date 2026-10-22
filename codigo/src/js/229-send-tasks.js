/* ---------- Send a task to someone: it is shared with them and marked t.sentBy (who sent it) / t.sentTo [ids or emails].
   The person sees "Sent from ..." on the task; for you it moves to Done › "Done my part" (with tasks where you did your part).
   Received / Sent sit before Sort and show the people once you pick one (S.ui.sr {k,who}).
   Test mode only: User 1 gets two example tasks from User 2 once (one sent, one waiting for them) ---------- */
const recvFrom=t=>t.sentBy&&t.sentBy!==CL.uid?t.sentBy:t.passedBy&&t.passedBy!==CL.uid?t.passedBy:null;
const sentTo=t=>t.sentBy&&t.sentBy===CL.uid?(t.sentTo||[]):[];
const srName=w=>String(w).includes('@')?w:personName(w);
// share popover: a Send button next to Share / Pass
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('.share-pop [data-send]');if(!b)return;e.stopPropagation();
  const el=pop&&pop.el,c=el&&el._cands&&el._cands[+b.dataset.send],t=el&&byId(el._tid);if(!c||!t)return;
  b.disabled=true;t.sentBy=CL.uid;const to=c.id||c.email;t.sentTo=[...new Set([...(t.sentTo||[]),to])];
  await shareTask(t,c,'share');closePop();toast(`Sent "${t.name}" to ${srName(to)}. It is in Done, under Done my part.`)},true);
{const _osp=openSharePop;openSharePop=function(anchor,t){_osp(anchor,t);const el=pop&&pop.el;if(!el||!el.querySelector('.share-pop'))return;el._tid=t.id;
  const res=el.querySelector('.sp-res'),add=()=>res.querySelectorAll('[data-sh]').forEach(s=>{if(s.previousElementSibling&&s.previousElementSibling.hasAttribute('data-send'))return;
    s.insertAdjacentHTML('beforebegin',`<button type="button" class="btn sm primary" data-send="${s.dataset.sh}" title="Send it: it shows on their list as sent from you, and you keep it">Send</button>`)});
  add();new MutationObserver(add).observe(res,{childList:true});
  // people the task is already shared with can be sent it too
  const mem=el.querySelector('.sp-mem'),addM=()=>mem.querySelectorAll('[data-rm]').forEach(r=>{if(r.previousElementSibling&&r.previousElementSibling.hasAttribute('data-sendm'))return;
    r.insertAdjacentHTML('beforebegin',`<button type="button" class="btn sm primary" data-sendm="${esc(r.dataset.rm)}" title="Send it to them: your part is done, it leaves your list">Send</button>`)});
  addM();new MutationObserver(addM).observe(mem,{childList:true});
  const h=el.querySelector('.share-pop .sp-hint:last-child');if(h)h.innerHTML='<b>Send</b>: it shows on their list as sent from you. <b>Share</b>: you both see it, and edits and done sync. <b>Pass</b>: it moves to their list and leaves yours.'}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.share-pop [data-sendm]');if(!b)return;e.stopPropagation();
  const el=pop&&pop.el,t=el&&byId(el._tid);if(!t)return;const to=b.dataset.sendm;
  t.sentBy=CL.uid;t.sentTo=[...new Set([...(t.sentTo||[]),to])];closePop();commit();toast(`Sent "${t.name}" to ${srName(to)}. It is in Done, under Done my part.`)},true);
// row: Sent from / Sent to
{const _row=row;row=function(t,depth){const el=_row(t,depth);if(t.stepOf||!CL.on)return el;const meta=el.querySelector('.meta');if(!meta)return el;
  const f=recvFrom(t),to=sentTo(t);
  if(f)meta.insertAdjacentHTML('beforeend',`<span class="sentc recv" title="${t.sentBy===f?'Sent':'Passed'} to you">Sent from <b>${esc(personName(f))}</b></span>`);
  else if(to.length)meta.insertAdjacentHTML('beforeend',`<span class="sentc" title="You sent it">Sent to <b>${esc(to.map(srName).join(', '))}</b></span>`);
  return el}}
// Received / Sent before Sort: pick one, then the people appear next to it (S.ui.sr {k,who})
const mySent=t=>!!(CL.on&&t.sentBy&&t.sentBy===CL.uid);
const myPart=t=>!!(CL.on&&(t.waitDone||[]).includes(CL.uid));
const sentToMe=t=>!!(CL.on&&t.sentBy&&t.sentBy!==CL.uid&&(t.sentTo||[]).includes(CL.uid));
// who a done part was for: the people you sent it to, or the person waiting on you
const dmpWho=t=>mySent(t)?(t.sentTo||[]):t.waitBy?[t.waitBy]:[];
const inDmp=t=>!t.stepOf&&(mySent(t)||(myPart(t)&&!sentToMe(t)));
$('#sorts').insertAdjacentHTML('afterbegin','<span class="srbar" id="srBar"></span>');
function srPeople(k){const m=new Map();S.tasks.forEach(t=>{if(t.stepOf)return;if(k==='recv'){const f=recvFrom(t);if(f&&!t.done)m.set(f,(m.get(f)||0)+1)}else if(k==='dmp'){if(inDmp(t)&&!t.done)dmpWho(t).forEach(w=>m.set(w,(m.get(w)||0)+1))}else sentTo(t).forEach(w=>m.set(w,(m.get(w)||0)+1))});return m}
function paintSrBar(){const b=$('#srBar');if(!b)return;const u=S.ui,sr=u.sr,ok=CL.on&&(u.view==='tasks'||u.view==='long');
  const rec=ok?srPeople('recv'):new Map(),snt=ok?srPeople('sent'):new Map(),dmp=ok?srPeople('dmp'):new Map();
  if(!ok||(!rec.size&&!snt.size&&!dmp.size&&!sr)){b.hidden=true;b.innerHTML='';return}b.hidden=false;
  const seg=(k,l,n)=>`<button class="seg${sr&&sr.k===k?' on':''}" type="button" data-sr="${k}" title="${k==='recv'?'Tasks people sent you':k==='dmp'?'Tasks where your part is done, still open for the others':'Tasks you sent'}">${l}${n?` <em>${n}</em>`:''}</button>`;
  const ppl=sr?[...srPeople(sr.k)]:[];
  b.innerHTML=seg('recv','Received',[...rec.values()].reduce((a,c)=>a+c,0))+seg('sent','Sent',[...snt.values()].reduce((a,c)=>a+c,0))+seg('dmp','Done my part',S.tasks.filter(t=>!t.done&&inDmp(t)).length)
    +(sr?`<span class="sr-ppl" role="group" aria-label="${sr.k==='recv'?'From':sr.k==='dmp'?'For':'To'} whom"><button type="button" class="sr-p${sr.who?'':' on'}" data-srwho="">Everyone</button>${ppl.map(([w,n])=>`<button type="button" class="sr-p${sr.who===w?' on':''}" data-srwho="${esc(w)}">${String(w).includes('@')?'':avHTML(w)}${esc(srName(w))} <em>${n}</em></button>`).join('')}</span>`:'')
    +'<span class="sr-sep"></span>'}
{const _r=render;render=function(){_r.apply(this,arguments);paintSrBar();paintDmp()}}
$('#srBar').addEventListener('click',e=>{const s=e.target.closest('[data-sr]'),w=e.target.closest('[data-srwho]');
  if(s){const k=s.dataset.sr;S.ui.sr=S.ui.sr&&S.ui.sr.k===k?null:{k,who:''};commit();return}
  if(w&&S.ui.sr){S.ui.sr.who=w.dataset.srwho;commit()}});
{const _vis=vis;vis=function(t){if(!_vis(t))return false;const sr=S.ui.sr,u=S.ui;
  const lists=u.view==='tasks'||u.view==='long';
  // what you sent, and tasks where you did your part, live in Done › Done my part (unless you filter by Sent)
  if((lists||u.view==='done')&&inDmp(t)&&!(lists&&sr&&(sr.k==='sent'||sr.k==='dmp')))return false;
  if(!sr||!lists)return true;
  const hit=x=>sr.k==='dmp'?(inDmp(x)&&(!sr.who||dmpWho(x).includes(sr.who))):sr.k==='recv'?(sr.who?recvFrom(x)===sr.who:!!recvFrom(x)):(sr.who?sentTo(x).includes(sr.who):sentTo(x).length>0);
  return hit(t)||kids(t).some(k=>hit(k)&&_vis(k))}}
// Done view: "Done my part" section with what you sent and the parts you did for others
function paintDmp(){if(S.ui.view!=='done'||S.ui.showArchived||!CL.on)return;
  const ts=S.tasks.filter(t=>inDmp(t)&&(typeof matches!=='function'||matches(t))).sort((a,b)=>(a.done-b.done)||String(b.createdAt).localeCompare(String(a.createdAt)));if(!ts.length)return;
  const sec=document.createElement('div');sec.className='dmp-sec';
  sec.innerHTML=`<div class="wfm-h"><b>Done my part</b><span>Tasks you sent and parts you did for someone. They stay here while the other person works on them.</span></div>`;
  ts.forEach(t=>{const w=document.createElement('div');w.className='wfm-item';
    const who=mySent(t)?`Sent to <b>${esc(sentTo(t).map(srName).join(', '))}</b>`:`Your part for <b>${esc(personName(t.waitBy||t.owner))}</b>`;
    w.innerHTML=`<div class="wfm-by"><span>${who} · ${t.done?'<span class="dmp-st done">finished</span>':'<span class="dmp-st">still open</span>'}</span></div>`;
    w.appendChild(row(t,0));sec.appendChild(w)});
  const e=list.querySelector(':scope > .empty');if(e)e.remove();list.prepend(sec)}
/* test mode: an example of each for User 1, sent by User 2 */
if(!(window.FOCUS_CONFIG||{}).url&&!window.FOCUS_NO_DEMO){try{
  const K='focus-localdb',d=JSON.parse(localStorage.getItem(K)||'null')||{};
  ['profiles','user_state','shared_tasks','shared_projects','accounts'].forEach(k=>d[k]=d[k]||[]);
  if(!d.demoSent){const now=new Date().toISOString(),u1='local-user-1',u2='local-user-2';
    if(!d.profiles.some(p=>p.id===u2))d.profiles.push({id:u2,email:'user2@test.local',name:'User 2',avatar_url:null,updated_at:now});
    const base={note:'',due:'',done:false,done_at:null,project_id:null,parent_id:null,assignee:null,doing:false,section:'',col:'',start:'',est:null,micro:[],wait_for:'',wait_who:'',wait_what:'',wait_since:null,wait_uids:[],wait_by:null,defer:'',glow:null,sent_by:null,sent_to:[],owner:u2,members:[u2,u1],invited:[],passed_by:null,updated_by:u2,updated_at:now,created_at:now};
    d.shared_tasks.push(Object.assign({},base,{id:'demo-sent-'+Date.now().toString(36),name:'Review the budget numbers',note:'Example: User 2 sent you this task.',sent_by:u2,sent_to:[u1]}));
    d.shared_tasks.push(Object.assign({},base,{id:'demo-wait-'+Date.now().toString(36),name:'Slides for Monday',note:'Example: User 2 is waiting for you. Press Done my part when you finish.',wait_for:'User 1 - the slides',wait_what:'the slides',wait_since:now.slice(0,10),wait_uids:[u1],wait_by:u2}));
    d.demoSent=true;localStorage.setItem(K,JSON.stringify(d))}
}catch(e){}}
