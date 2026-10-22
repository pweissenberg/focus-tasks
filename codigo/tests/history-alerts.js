// Task history, alerts bell, "Done my part" box on tasks people wait on you for, and the task coming back marked (about 25 s):  node tests/history-alerts.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts}=require('./harness');
const t=checks();
async function win(ctx,u){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs};
}
const wait=async(p,fn,arg,ms=5000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await p.evaluate(fn,arg).catch(()=>false))return true;await sleep(150)}return false};
const st=(p,u)=>p.evaluate(u=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-'+u)),u);
(async()=>{
  const br=await chromium.launch();const ctx=await newContext(br,{w:1280,h:860,user:0});
  const A=await win(ctx,1),B=await win(ctx,2);const a=A.p,b=B.p;
  try{
    await a.click('#acctBtn');await a.click('[data-friends]');await a.fill('#fr-q','User 2');await sleep(400);await a.click('[data-fadd="0"]');await sleep(200);await a.click('.modal.friends [data-x]');await sleep(200);
    await a.fill('#c-name','Budget plan');await a.keyboard.press('Enter');await sleep(300);
    let s=await st(a,1);const id=s.tasks.find(x=>x.name==='Budget plan').id,R=`.task[data-id="${id}"]`;
    t.is('Send to long term shows without hovering',await a.evaluate(r=>+getComputedStyle(document.querySelector(r+' .lt-send')).opacity>0.3,R));
    t.is('share button says Send or share with someone',await a.getAttribute(`${R} [data-act="share"]`,'title')==='Send or share with someone');
    t.is('history button sits right before it',await a.evaluate(r=>{const s=document.querySelector(r+' [data-act="share"]');return s.previousElementSibling&&s.previousElementSibling.dataset.act==='log'},R));
    await a.hover(R);await a.click(`${R} [data-mtadd]`);await sleep(150);await a.keyboard.type('get numbers');await a.keyboard.press('Enter');await a.keyboard.press('Escape');await sleep(200);
    await a.click(`[data-mtfor="${id}"] .mt-check input`);await sleep(500);
    await a.locator(`${R} [data-act="hold"]`).click();await sleep(300);
    await a.click('.wait-pop [data-wfp="local-user-2"]');await a.fill('#wait-what','numbers');await a.click('.wait-pop .btn.primary');await sleep(800);
    // User 2
    t.is('User 2 gets an alert on the bell',await wait(b,()=>{const n=document.querySelector('#bellBtn .bell-n');return n&&!n.hidden}));
    await b.click('#bellBtn');await sleep(200);
    t.is('the alert says User 1 is waiting for them',await b.evaluate(()=>document.querySelector('.bell-pop').textContent.includes('User 1 is waiting for you on "Budget plan"')));
    await shot(b,'alerts');
    await b.click('.bell-pop [data-bellgo]');await sleep(300);
    t.is('opening the alerts marks them read',await b.evaluate(()=>document.querySelector('#bellBtn .bell-n').hidden));
    t.is('a Done my part button takes the place of the done checkbox',await b.evaluate(r=>{const e=document.querySelector(r),m=e&&e.querySelector('.mypart-btn');return m&&m.innerText.replace(/\s+/g,' ').trim()==='Done my part'&&!e.querySelector('[data-act="done"]')&&!!e.querySelector('[data-act="hold"]')},R));
    await shot(b,'mypart');
    await b.fill('#c-name','Other thing');await b.keyboard.press('Enter');await sleep(300);
    const oid=(await st(b,2)).tasks.find(x=>x.name==='Other thing').id;
    await b.click(`.task[data-id="${oid}"] [data-act=edit]`,{force:true});await sleep(200);
    t.is('a task waiting on you is not offered as a parent for subtasks',!await b.$(`#ed-parent option[value="${id}"]`));
    await b.keyboard.press('Escape');await sleep(200);
    await clearToasts(b);await b.click(`${R} .mypart-btn`);await sleep(400);
    t.is('ticking it takes it out of Waiting for me',!await b.$('.wfm-sec'));
    await b.click('#srBtn');await sleep(200);await b.click('.sr-menu [data-srk="dmp"]');await sleep(300);
    t.is('Done my part in the Shared menu shows it, with User 1 as a person',!!await b.$(`#list ${R}`)&&await b.evaluate(()=>document.querySelector('.sr-menu').textContent.includes('User 1')));
    await shot(b,'dmp-filter');await b.click('.sr-menu [data-srk=""]');await sleep(200);
    // back to User 1
    t.is('User 1: off hold and marked as back',await wait(a,r=>{const e=document.querySelector(r);return e&&e.classList.contains('back')&&e.querySelector('.back-tag').textContent.includes('User 2 did their part')&&!e.classList.contains('hold')},R));
    t.is('User 1 gets an alert too',await a.evaluate(()=>{const n=document.querySelector('#bellBtn .bell-n');return n&&!n.hidden}));
    await clearToasts(a);await shot(a,'back');
    await a.click(`${R} [data-act="log"]`);await sleep(200);
    const log=await a.evaluate(()=>document.querySelector('.log-pop').textContent);
    const lg=log.replace(/\s+/g,' '),okLog=['did the microtask "get numbers"','put it on hold','is waiting for User 2 - numbers','User 2 did their part','Task added'].every(x=>lg.includes(x));
    t.is('history lists the microtask, the hold, the wait and User 2 doing their part',okLog);if(!okLog)console.log(lg);
    await shot(a,'history');await a.keyboard.press('Escape');await a.mouse.click(5,5);await sleep(150);
    await a.click(`${R} .back-tag`);await sleep(250);
    t.is('pressing the banner clears it',await a.evaluate(r=>!document.querySelector(r).classList.contains('back'),R));
    // a mention on a shared task reaches the person it is shared with
    await a.hover(R);await a.click(`${R} [data-cmt]`);await sleep(200);await a.type('#cm-text','@Us');await sleep(150);
    t.is('@ suggests the person the task is shared with',await a.evaluate(()=>document.querySelector('.cm-at').textContent.includes('User 2')));
    await a.keyboard.press('Enter');await a.keyboard.type('please check');await a.keyboard.press('Enter');await sleep(300);await a.click('.modal.cmts [data-x]');await sleep(200);
    t.is('User 2 gets an alert for the mention',await wait(b,()=>{const d=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));return (d.alerts||[]).some(x=>x.text.includes('mentioned you on "Budget plan"'))}));
    // comments on a task outside any project: the balloon next to the pencil, saved on the task and written to the history
    await a.fill('#c-name','Call the bank');await a.keyboard.press('Enter');await sleep(300);
    const bid=(await st(a,1)).tasks.find(x=>x.name==='Call the bank').id,BR=`.task[data-id="${bid}"]`;
    t.is('a task outside a project has the comment balloon',!!await a.$(`${BR} [data-cmt]`));
    await a.hover(BR);await a.click(`${BR} [data-cmt]`);await sleep(200);await a.fill('#cm-text','Ask about the fee');await a.keyboard.press('Enter');await sleep(300);
    t.is('the comment window says who can be mentioned',await a.evaluate(()=>document.querySelector('.cm-hint').textContent.includes('shared with')));
    await a.click('.modal.cmts [data-x]');await sleep(200);
    let bk=(await st(a,1)).tasks.find(x=>x.id===bid);
    t.is('the comment is saved on the task and goes to its history',(bk.comments[bid]||[]).some(c=>c.text==='Ask about the fee')&&(bk.log||[]).some(x=>x.what==='commented: "Ask about the fee"'));
    t.is('the balloon shows the count',await a.evaluate(r=>document.querySelector(r+' [data-cmt]').textContent.trim()==='1',BR));
    // subtask and its microtask go in the top task's history
    await a.fill('#c-name','Child step');await a.keyboard.press('Enter');await sleep(300);
    s=await st(a,1);const cid=s.tasks.find(x=>x.name==='Child step').id;
    await a.click(`.task[data-id="${cid}"] [data-act=edit]`,{force:true});await sleep(200);await a.selectOption('#ed-parent',id);await a.click('.modal .btn.primary');await sleep(300);
    const C=`.task[data-id="${cid}"]`;await a.hover(C);await a.click(`${C} [data-mtadd]`);await sleep(150);await a.keyboard.type('tiny');await a.keyboard.press('Enter');await a.keyboard.press('Escape');await sleep(200);
    await a.click(`[data-mtfor="${cid}"] .mt-check input`);await sleep(400);await a.click(`${C} [data-act="done"]`,{force:true});await sleep(1500);await a.keyboard.press('Escape');await sleep(200);
    s=await st(a,1);const top=s.tasks.find(x=>x.id===id),w=(top.log||[]).map(x=>x.what).join(' | ');
    t.is('the top task logs the subtask and its microtask',w.includes('did the microtask "tiny" of the subtask "Child step"')&&w.includes('did the subtask "Child step"'));if(!t)console.log(w);
    t.is('no page errors',!A.errs.length&&!B.errs.length);if(A.errs.length||B.errs.length)console.log(A.errs.concat(B.errs).join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
