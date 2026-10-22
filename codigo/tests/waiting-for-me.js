// Waiting for a person with the two local test accounts: pick User 2, it shows in their "Waiting for me", Done my part takes it off hold;
// waiting for, defer and glow sync on shared tasks; Send with Sent from / Sent to and the Sent / received filter; example tasks for User 1 (about 25 s):  node tests/waiting-for-me.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts}=require('./harness');
const t=checks();
async function win(ctx,u){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs};
}
const wait=async(p,fn,arg,ms=4000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await p.evaluate(fn,arg).catch(()=>false))return true;await sleep(150)}return false};
const st=(p,u)=>p.evaluate(u=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-'+u)),u);
(async()=>{
  const br=await chromium.launch();
  const ctx=await newContext(br,{w:1280,h:860,user:0});
  const A=await win(ctx,1),B=await win(ctx,2);const a=A.p,b=B.p;
  try{
    // User 2 is a friend of User 1
    await a.click('#acctBtn');await a.click('[data-friends]');await a.fill('#fr-q','User 2');await sleep(400);await a.click('[data-fadd="0"]');await sleep(200);await a.click('.modal.friends [data-x]');await sleep(200);
    await a.fill('#c-name','Send the report');await a.keyboard.press('Enter');await sleep(300);
    const row=a.locator('#list .task',{has:a.locator('.name',{hasText:'Send the report'})});
    await row.locator('[data-act="hold"]').click();await sleep(300);
    t.is('Waiting for offers User 2',!!await a.$('.wait-pop [data-wfp="local-user-2"]'));
    await a.click('.wait-pop [data-wfp="local-user-2"]');await a.fill('#wait-what','numbers');await sleep(100);
    await shot(a,'wfm-pick');
    await a.click('.wait-pop .btn.primary');await sleep(500);
    let s=await st(a,1);const tk=s.tasks.find(x=>x.name==='Send the report');
    t.is('User 1: on hold, waiting for User 2 for numbers, shared',tk.onHold&&tk.waitUids.join()==='local-user-2'&&tk.waitWhat==='numbers'&&tk.waitBy==='local-user-1'&&tk.shared);
    await t.ok(a,'row says Waiting for User 2 - numbers',id=>document.querySelector(`.task[data-id="${id}"] .waitc`).textContent.includes('User 2 - numbers'),tk.id);
    t.is('User 2 sees it in Waiting for me',await wait(b,id=>!!document.querySelector(`.wfm-sec .task[data-id="${id}"]`)&&document.querySelector('.wfm-sec').textContent.includes('User 1 is waiting for numbers'),tk.id));
    await b.click('[data-wfmhide]');await sleep(250);
    t.is('Hide folds Waiting for me and its tasks leave the list',!!await b.$('.wfm-sec.wfm-hidden')&&!await b.$(`#list .task[data-id="${tk.id}"]`));
    await b.click('[data-wfmhide]');await sleep(250);
    t.is('Show brings them back',!await b.$('.wfm-sec.wfm-hidden')&&!!await b.$(`.wfm-sec .task[data-id="${tk.id}"]`));
    t.is('it is not also in the normal list',await b.evaluate(id=>document.querySelectorAll(`#list .task[data-id="${id}"]`).length===1,tk.id));
    await clearToasts(b);await shot(b,'wfm-user2');
    // glow and defer sync
    await row.hover();await row.locator('[data-act=edit]').click();await sleep(200);
    await a.click('.glow-pick .g-violet');await a.click('.modal .btn.primary');await sleep(300);
    t.is('glow reaches User 2',await wait(b,id=>{const x=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2')).tasks.find(y=>y.id===id);return x&&x.glow==='violet'},tk.id));
    // Done my part
    await clearToasts(b);await b.click(`[data-wfmdone="${tk.id}"]`);await sleep(300);
    t.is('Done my part: it leaves Waiting for me',!await b.$('.wfm-sec'));
    t.is('User 1: off hold again with a note',await wait(a,id=>{const x=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1')).tasks.find(y=>y.id===id);return x&&!x.onHold&&!x.waitUid}, tk.id)&&await wait(a,()=>[...document.querySelectorAll('.toast')].some(x=>x.textContent.includes('did their part'))));
    await shot(a,'wfm-back');
    // send a task
    await clearToasts(a);await a.fill('#c-name','Check the draft');await a.keyboard.press('Enter');await sleep(300);
    const r2=a.locator('#list .task',{has:a.locator('.name',{hasText:'Check the draft'})});await r2.hover();await r2.locator('[data-act=share]').click();await sleep(300);
    await a.fill('#sp-q','User 2');await sleep(400);
    t.is('share window has Send',!!await a.$('.share-pop [data-send="0"]'));
    t.is('people show only as a list to pick from first',!await a.isVisible('.share-pop [data-send="0"]')&&!await a.$('.share-pop [data-pass]:visible'));
    await a.click('.sp-res .sp-row .sp-n >> nth=0');await sleep(100);
    await a.click('.share-pop [data-send="0"]');await sleep(500);
    t.is('User 2 sees Sent from User 1',await wait(b,()=>[...document.querySelectorAll('#list .task')].some(r=>r.querySelector('.name').textContent==='Check the draft'&&(r.querySelector('.sentc.recv')||{}).textContent==='Sent from User 1')));
    await clearToasts(b);
    await t.ok(a,'User 1: the sent task leaves the list',()=>![...document.querySelectorAll('#list .task .name')].some(x=>x.textContent==='Check the draft'));
    await a.click('[data-view=done] >> nth=0').catch(()=>a.evaluate(()=>document.querySelector('[data-view=done]').click()));await sleep(300);
    await t.ok(a,'User 1: it is in Done, under Done my part, still open',()=>{const s=document.querySelector('.dmp-sec');return !!s&&s.textContent.includes('Check the draft')&&s.textContent.includes('Sent to User 2')&&s.textContent.includes('still open')});
    await shot(a,'dmp-user1');
    t.is('one Shared button sits next to Sort, with no numbers',await b.evaluate(()=>{const g=document.querySelector('#sorts .sortgrp'),x=document.querySelector('#srBtn');return !!g&&!!x&&g.contains(x)&&!/\d/.test(x.textContent)&&!document.querySelector('#srBar').hidden}));
    await b.click('#srBtn');await sleep(250);
    t.is('the menu lists Received, Sent and Done my part, no numbers, no people yet',await b.evaluate(()=>{const m=document.querySelector('.sr-menu');return !!m&&['recv','sent','dmp'].every(k=>m.querySelector(`[data-srk="${k}"]`))&&!/\d/.test(m.textContent)&&!m.querySelector('[data-srw]')}));
    await b.click('.sr-menu [data-srk=recv]');await sleep(250);
    t.is('Received shows User 1',!!await b.$('.sr-menu [data-srw="local-user-1"]'));
    await shot(b,'sr-menu');
    await b.click('.sr-menu [data-srw="local-user-1"]');await sleep(250);
    t.is('the button now says Received',await b.evaluate(()=>document.querySelector('#srBtn').textContent.includes('Received')));
    t.is('Received from User 1 shows only that task',await b.evaluate(()=>{const n=[...document.querySelectorAll('#list > .task .name')].map(x=>x.textContent);return n.length===1&&n[0]==='Check the draft'}));
    await shot(b,'sent-user2');
    // the part User 2 did is in their Done my part
    await b.click('#srBtn');await sleep(200);await b.click('.sr-menu [data-srk=""]');await sleep(200);
    await b.evaluate(()=>document.querySelector('[data-view=done]').click());await sleep(300);
    await t.ok(b,'User 2: the part they did is in Done my part',()=>{const s=document.querySelector('.dmp-sec');return !!s&&s.textContent.includes('Send the report')&&s.textContent.includes('Your part for User 1')});
    await b.evaluate(()=>document.querySelector('[data-view=tasks]').click());await sleep(200);
    // sending a task that is already shared: Send next to the person; it leaves User 1's list
    const sr=(await st(a,1)).tasks.find(x=>x.name==='Send the report');
    t.is('the report is still shared and on User 1 list',sr.shared&&!sr.sentBy);
    await a.evaluate(()=>document.querySelector('[data-view=tasks]').click());await sleep(250);await clearToasts(a);
    const r4=a.locator('#list .task',{has:a.locator('.name',{hasText:'Send the report'})});await r4.hover();await r4.locator('.sharebtn').click();await sleep(300);
    t.is('already shared: Send next to User 2',!!await a.$('.share-pop [data-sendm="local-user-2"]'));
    await a.click('.share-pop [data-sendm="local-user-2"]');await sleep(500);
    await t.ok(a,'sent: it leaves User 1 list',()=>![...document.querySelectorAll('#list .task .name')].some(x=>x.textContent==='Send the report'));
    t.is('User 2 gets it as sent from User 1',await wait(b,()=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2')).tasks.some(x=>x.name==='Send the report'&&x.sentBy==='local-user-1'))&&await wait(b,()=>[...document.querySelectorAll('#list .task')].some(r=>r.querySelector('.name').textContent==='Send the report'&&!!r.querySelector('.sentc.recv'))));
    // typing a name suggests people; "Show it on their list" off shares nothing
    await a.evaluate(()=>document.querySelector('[data-view=tasks]').click());await sleep(200);await clearToasts(a);
    await a.fill('#c-name','Quiet wait');await a.keyboard.press('Enter');await sleep(300);
    const r3=a.locator('#list .task',{has:a.locator('.name',{hasText:'Quiet wait'})});await r3.locator('[data-act="hold"]').click();await sleep(300);
    await a.click('.wait-pop [data-wfp="local-user-2"]');await sleep(100);await a.click('.wait-pop [data-wfp="local-user-2"]');await sleep(100);
    await a.fill('#wait-who','Us');await sleep(300);
    t.is('typing a name suggests User 2',!!await a.$('.wf-sug:not([hidden]) [data-wfadd="local-user-2"]'));
    await a.click('.wf-sug [data-wfadd="local-user-2"]');await sleep(150);
    t.is('picking a suggestion selects them and shows the option',await a.evaluate(()=>document.querySelector('[data-wfp="local-user-2"]').classList.contains('on')&&!document.querySelector('.wf-show').hidden));
    await shot(a,'wfm-suggest');
    await a.uncheck('#wait-show');await a.click('.wait-pop .btn.primary');await sleep(600);
    s=await st(a,1);const q=s.tasks.find(x=>x.name==='Quiet wait');
    t.is('not shown: kept on your task only, not shared',q.waitShow===false&&!q.shared&&q.waitFor.includes('User 2'));
    t.is('User 2 does not get it',!(await st(b,2)).tasks.some(x=>x.name==='Quiet wait'));
    t.is('no page errors',!A.errs.length&&!B.errs.length);if(A.errs.length||B.errs.length)console.log(A.errs.concat(B.errs).join('\n'));
    // example tasks for User 1 in test mode
    const ctx2=await newContext(br,{w:1280,h:860,user:0,demo:true});const C=await win(ctx2,1);
    t.is('test mode: User 1 gets an example sent task and one waiting for them',await wait(C.p,()=>[...document.querySelectorAll('#list .sentc.recv')].some(x=>x.textContent==='Sent from User 2')&&document.querySelector('.wfm-sec').textContent.includes('User 2 is waiting')));
    await clearToasts(C.p);await shot(C.p,'demo-user1');
  }catch(e){console.log(e.message.split('\n').slice(0,6).join('\n'));t.is('ran without crashing',false)}
  await br.close();t.done();
})();
