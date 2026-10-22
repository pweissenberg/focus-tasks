// Shared projects with the two local test accounts in two windows (about 30 s):  node tests/shared-projects.js
// User 1 adds User 2 to a project; tasks, Notes and Free canvas show up live for User 2; removing User 2 takes it away.
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts}=require('./harness');
const t=checks();
async function win(ctx,u){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs};
}
const wait=async(p,fn,arg,ms=4000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await p.evaluate(fn,arg).catch(()=>false))return true;await sleep(150)}return false};
(async()=>{
  const br=await chromium.launch();
  const ctx=await newContext(br,{w:1280,h:860,user:0});
  const A=await win(ctx,1),B=await win(ctx,2);const a=A.p,b=B.p;
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-pshare]');await a.fill('#pm-q','User 2');await sleep(300);
    await a.click('.share-pop [data-add="0"]');await sleep(400);
    t.is('User 1 adds User 2 to the project',await wait(a,()=>document.querySelectorAll('.pp-people .av').length===2));
    await a.keyboard.press('Escape');
    t.is('the project appears in User 2 sidebar',await wait(b,id=>!!document.querySelector(`#plist [data-proj="${id}"]`),pid));
    t.is('User 2 gets an alert that they were added to the project',await wait(b,()=>{const d=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));return (d.alerts||[]).some(a=>a.text.includes('added you to the project'))}));
    await a.fill('#pt-name','Shared project task');await a.keyboard.press('Enter');
    t.is('a new project task reaches User 2',await wait(b,id=>{const s=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));return s.tasks.some(x=>x.name==='Shared project task'&&x.projectId===id&&!x.done)},pid));
    await a.click('[data-ptab=notes]');await a.click('[data-pnew]');await a.keyboard.type('Plan');await a.click('.pn-text');await a.keyboard.type('Hello from User 1');
    await b.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(200);await b.click('[data-ptab=notes]');
    t.is('User 2 sees the note live',await wait(b,()=>[...document.querySelectorAll('.pn-text')].some(x=>x.value==='Hello from User 1')));
    await b.click('.pn-text');await b.keyboard.press('End');await b.keyboard.type(' and User 2');await sleep(100);
    await a.click('[data-pnew]');await sleep(100);
    t.is('User 1 sees User 2 typing',await wait(a,()=>[...document.querySelectorAll('.pn-text')].some(x=>x.value==='Hello from User 1 and User 2')));
    t.is('User 2 keeps the caret while edits arrive',await b.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('pn-text')));
    await a.click('[data-ptab=free]');await a.click('[data-cvadd=note]');await a.keyboard.type('Sticky');
    await b.click('[data-ptab=free]');
    t.is('Free canvas items reach User 2',await wait(b,()=>[...document.querySelectorAll('#cv textarea')].some(x=>x.value==='Sticky')));
    await b.click('[data-ptab=tasks]');await sleep(200);
    await b.locator('#list .task',{has:b.locator('.name',{hasText:'Shared project task'})}).locator('.check input').click();await sleep(400);
    t.is('User 2 completes it and User 1 sees it done',await wait(a,()=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1')).tasks.some(x=>x.name==='Shared project task'&&x.done)));
    console.log('  screenshots '+await shot(a,'sp-user1')+' '+await shot(b,'sp-user2'));
    await a.click('[data-pshare]');await sleep(200);await a.click('.share-pop [data-rm]');
    t.is('removing User 2 takes the project away',await wait(b,id=>!document.querySelector(`#plist [data-proj="${id}"]`),pid,6000));
    t.is('and its tasks',await wait(b,()=>!JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2')).tasks.some(x=>x.name==='Shared project task')));
    t.is('User 1 keeps the project',await a.evaluate(id=>!!document.querySelector(`#plist [data-proj="${id}"]`),pid));
  }catch(e){t.is('stopped early: '+String(e.message).split('\n')[0],false)}
  const errs=[...A.errs,...B.errs];t.is('no page errors'+(errs.length?': '+errs.join(' | '):''),!errs.length);
  await br.close();t.done();
})();
