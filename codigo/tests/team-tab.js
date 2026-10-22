// Project Team tab with the two local accounts (about 12 s):  node tests/team-tab.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts,noSideScroll}=require('./harness');
const t=checks();
(async()=>{
  const br=await chromium.launch();const ctx=await newContext(br,{w:1280,h:860,user:0});
  const a=await ctx.newPage();a.setDefaultTimeout(5000);const errs=[];a.on('pageerror',e=>errs.push(e.message));
  await a.addInitScript(()=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-1',email:'user1@test.local',user_metadata:{full_name:'User 1'}}}))}catch(e){}});
  await a.goto('http://app/');await sleep(900);await clearToasts(a);
  const b=await ctx.newPage();await b.addInitScript(()=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-2',email:'user2@test.local',user_metadata:{full_name:'User 2'}}}))}catch(e){}});
  await b.goto('http://app/');await sleep(900);
  await a.bringToFront();
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=team]');await sleep(150);
    t.is('team tab shows just me',await a.evaluate(()=>document.querySelectorAll('.tm-card').length===1&&document.querySelector('.tmc-role').textContent==='Owner'));
    await a.click('#projBody [data-pshare]');await a.fill('#pm-q','User 2');await sleep(300);await a.click('.share-pop [data-add="0"]');await sleep(500);await a.keyboard.press('Escape');await sleep(200);
    t.is('the new member shows with Can edit',await a.evaluate(()=>document.querySelectorAll('.tm-card').length===2&&document.querySelector('.tm-card select[data-perm]').value==='edit'));
    await a.evaluate(id=>{},pid);
    await a.selectOption('.tm-card select[data-perm]','view');await sleep(250);
    t.is('owner sets view only from the Team tab',await a.evaluate(id=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1')).projects.find(x=>x.id===id).perms['local-user-2']==='view',pid));
    // assign an open task to me and see it on my card
    await a.click('[data-ptab=tasks]');await sleep(200);await a.click('#list .task [data-asg]');await a.click('.asg-menu [data-who="local-user-1"]');await sleep(200);
    await a.click('[data-ptab=team]');await sleep(150);
    t.is('my card lists the task I am responsible for',await a.evaluate(()=>document.querySelector('.tm-card .tmc-list li')!==null));
    await shot(a,'team-tab');
    await a.setViewportSize({width:390,height:800});await sleep(200);
    await t.ok(a,'no sideways scroll at 390px',noSideScroll);await shot(a,'team-390');
  }catch(e){t.is('stopped early: '+String(e.message).split('\n').slice(0,3).join(' '),false)}
  t.is('no page errors'+(errs.length?': '+errs.join(' | '):''),!errs.length);
  await br.close();t.done();
})();
