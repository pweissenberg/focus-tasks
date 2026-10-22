// Task comments with @mentions and view-only members, with the two local test accounts (about 25 s):  node tests/comments-perms.js
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
  const br=await chromium.launch();
  const ctx=await newContext(br,{w:1280,h:860,user:0});
  const A=await win(ctx,1),B=await win(ctx,2);const a=A.p,b=B.p;
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-pshare]');await a.fill('#pm-q','User 2');await sleep(300);
    await a.click('.share-pop [data-add="0"]');await sleep(400);await a.keyboard.press('Escape');
    await a.click('[data-ptab=tasks]');await a.fill('#pt-name','Talk about it');await a.keyboard.press('Enter');await sleep(300);
    const tid=(await st(a,1)).tasks.find(x=>x.name==='Talk about it').id;
    t.is('the task reaches User 2',await wait(b,id=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2')).tasks.some(x=>x.id===id),tid));
    await a.click(`.task[data-id="${tid}"] [data-cmt]`);await sleep(200);
    t.is('comment window opens',!!await a.$('.modal.cmts'));
    await a.keyboard.type('Hi @Us');await sleep(150);
    t.is('@ shows the project members',await a.evaluate(()=>{const m=document.querySelector('.cm-at');return m&&!m.hidden&&m.textContent.includes('User 2')}));
    await a.keyboard.press('Enter');await a.keyboard.type('please look');
    t.is('picking fills the name',await a.evaluate(()=>document.querySelector('#cm-text').value==='Hi @User 2 please look'));
    await a.keyboard.press('Enter');await sleep(250);
    let s=await st(a,1),c=(s.projects.find(x=>x.id===pid).comments||{})[tid]||[];
    t.is('comment saved with the mention',c.length===1&&c[0].mentions[0]==='local-user-2');
    t.is('the mention is highlighted',await a.evaluate(()=>!!document.querySelector('.cm-text .at')));
    await shot(a,'cm-modal');
    await a.keyboard.press('Escape');await sleep(150);
    t.is('the row shows the count',await a.evaluate(id=>{const b=document.querySelector(`.task[data-id="${id}"] .cmt.on`);return b&&b.textContent.trim()==='1'},tid));
    t.is('User 2 is told about the mention',await wait(b,()=>[...document.querySelectorAll('.toast')].some(x=>x.textContent.includes('mentioned you'))));
    t.is('the mention is also in their alerts',await wait(b,()=>{const d=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));return (d.alerts||[]).some(a=>a.text.includes('mentioned you on'))}));
    // view only
    await a.click('[data-pshare]');await sleep(200);await a.selectOption('.share-pop [data-perm]','view');await sleep(300);await a.keyboard.press('Escape');
    t.is('owner sets User 2 to view only',(await st(a,1)).projects.find(x=>x.id===pid).perms['local-user-2']==='view');
    await b.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);await b.click('[data-ptab=tasks]').catch(()=>{});
    t.is('User 2 sees the view only note',await wait(b,()=>!!document.querySelector('#projPage.ro .ro-note')));
    t.is('and no add bar',await b.evaluate(()=>{const f=document.querySelector('.pt-add');return !f||!f.offsetParent}));
    await clearToasts(b);
    await b.locator(`.task[data-id="${tid}"] .check input`).click({force:true}).catch(()=>{});await sleep(300);
    t.is('User 2 cannot complete the task',!(await st(b,2)).tasks.find(x=>x.id===tid).done);
    t.is('and is told why',await b.evaluate(()=>[...document.querySelectorAll('.toast')].some(x=>x.textContent.includes('not change'))));
    await b.click(`.task[data-id="${tid}"] [data-cmt]`);await sleep(200);
    await b.keyboard.type('On it');await b.keyboard.press('Enter');await sleep(200);
    t.is('a viewer can still comment, and User 1 gets it',await wait(a,([p,id])=>((JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1')).projects.find(x=>x.id===p).comments||{})[id]||[]).filter(c=>!c.del).length===2,[pid,tid],6000));
    await shot(b,'cm-viewer');await b.keyboard.press('Escape');
    // back to edit
    await a.click('[data-pshare]');await sleep(200);await a.selectOption('.share-pop [data-perm]','edit');await sleep(300);await a.keyboard.press('Escape');
    t.is('switching back to edit removes the note',await wait(b,()=>!document.querySelector('#projPage.ro')));
    // delete own comment
    await a.click(`.task[data-id="${tid}"] [data-cmt]`);await sleep(200);
    await a.click('.cm-item [data-cmdel]');await a.click('.cm-item [data-cmdel]');await sleep(200);
    t.is('deleting my comment leaves the other one',await a.evaluate(()=>document.querySelectorAll('.cm-item').length===1&&document.querySelector('.cm-item').textContent.includes('On it')));
    t.is('the delete reaches User 2',await wait(b,([p,id])=>((JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2')).projects.find(x=>x.id===p).comments||{})[id]||[]).filter(c=>!c.del).length===1,[pid,tid],6000));
  }catch(e){t.is('stopped early: '+String(e.message).split('\n')[0],false)}
  const errs=[...A.errs,...B.errs];t.is('no page errors'+(errs.length?': '+errs.join(' | '):''),!errs.length);
  await br.close();t.done();
})();
