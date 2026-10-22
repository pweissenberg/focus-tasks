// Task background, tag fill setting, Free box, role in project, People layout (two accounts, about 20 s)
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts,noSideScroll}=require('./harness');
const t=checks();
async function win(ctx,u){const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs}}
const st=(p,u)=>p.evaluate(u=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-'+u)),u);
(async()=>{const br=await chromium.launch();const ctx=await newContext(br,{w:1280,h:860,user:0});
  const A=await win(ctx,1),B=await win(ctx,2);const a=A.p;await a.bringToFront();
  try{
    // background
    const id=await a.evaluate(()=>document.querySelector('#list .task:not(.hold)').dataset.id);
    await a.click(`.task[data-id="${id}"] [data-act=edit]`,{force:true});await sleep(200);
    await a.click('#ed-bg [data-sw="#4e9a5b"], #ed-bg .sw:nth-child(3)');await a.click('.modal .btn.primary');await sleep(300);
    let s=await st(a,1);t.is('edit window saves a background',!!s.tasks.find(x=>x.id===id).bg);
    await t.ok(a,'row is tinted',i=>document.querySelector(`.task[data-id="${i}"]`).classList.contains('has-bg'),id);
    await a.click('#acctBtn');await a.click('[data-settings]');await sleep(200);await a.selectOption('#st-fill','fill');await sleep(200);await a.keyboard.press('Escape');await sleep(200);
    await t.ok(a,'tag fill setting tints tagged tasks',()=>document.querySelectorAll('#list .task.tag-fill').length>0);
    await shot(a,'bg-list');
    // project: people + role
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-pshare]');await a.fill('#pm-q','User 2');await sleep(300);await a.click('.share-pop [data-add="0"]');await sleep(500);await a.keyboard.press('Escape');
    await a.click('[data-ptab=team]');await sleep(200);
    await a.fill('.tmc-rolein[data-role="local-user-2"]','Designer');await a.keyboard.press('Tab');await sleep(250);
    s=await st(a,1);t.is('role in project saved',s.projects.find(x=>x.id===pid).roles['local-user-2']==='Designer');
    await a.click('[data-ptab=tasks]');await sleep(200);
    const t1=await a.evaluate(()=>document.querySelector('#list .task').dataset.id);
    await a.click(`#list .task[data-id="${t1}"] [data-asg]`);await a.click('.asg-menu [data-who="local-user-2"]');await sleep(200);
    await a.click('[data-board="3"]');await sleep(250);
    t.is('People layout shows a column per person plus Nobody',await a.evaluate(()=>document.querySelectorAll('.pl-col').length===3));
    await t.ok(a,'User 2 column has the role and the task',i=>{const c=[...document.querySelectorAll('.pl-col')].find(x=>x.textContent.includes('User 2'));return c&&c.textContent.includes('Designer')&&!!c.querySelector(`[data-plid="${i}"]`)},t1);
    await shot(a,'people');
    await a.selectOption('[data-pl="role"]','Designer');await sleep(200);
    t.is('role filter keeps only Designers',await a.evaluate(()=>document.querySelectorAll('.pl-col').length===1));
    await a.fill('[data-pl="q"]','zzzz');await sleep(200);
    t.is('search filters the tasks',await a.evaluate(()=>!document.querySelector('.pl-card')));
    await a.click('[data-plclear]');await sleep(200);
    t.is('Clear brings everything back',await a.evaluate(()=>document.querySelectorAll('.pl-col').length===3));
    await a.click('[data-board="0"]');await sleep(200);t.is('List still works',!!await a.$('#listSlot:not([hidden]) .task'));
    t.is('role reaches User 2',await (async()=>{for(let i=0;i<25;i++){const x=await st(B.p,2);const p=x.projects.find(y=>y.id===pid);if(p&&p.roles&&p.roles['local-user-2']==='Designer')return true;await sleep(200)}return false})());
    // free box
    await a.click('[data-ptab=free]');await a.click('[data-cvadd=box]');await sleep(200);
    t.is('Free box added with a border',await a.evaluate(()=>{const b=document.querySelector('.cv-box');return b&&getComputedStyle(b).borderTopWidth==='2px'&&getComputedStyle(b).resize==='both'}));
    await a.keyboard.type('Box text');await sleep(100);await shot(a,'free-box');
    await a.setViewportSize({width:390,height:800});await a.evaluate(()=>document.querySelector('[data-ptab=tasks]').click());await sleep(200);await a.evaluate(()=>document.querySelector('[data-board="3"]').click());await sleep(200);await t.ok(a,'no sideways scroll at 390px',noSideScroll);
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  const errs=[...A.errs,...B.errs];t.is('no page errors'+(errs.length?': '+errs.join(' | '):''),!errs.length);
  await br.close();t.done()})();
