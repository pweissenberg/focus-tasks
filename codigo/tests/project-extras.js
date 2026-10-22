// Project extras (about 30 s): deadline + progress, archive, board, files, activity, task owner (two users), Free zoom + image
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts}=require('./harness');
const t=checks();
async function win(ctx,u){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs};
}
const st=(p,u)=>p.evaluate(u=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-'+u)),u);
const wait=async(p,fn,arg,ms=4000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await p.evaluate(fn,arg).catch(()=>false))return true;await sleep(150)}return false};
(async()=>{
  const br=await chromium.launch();
  const ctx=await newContext(br,{w:1280,h:860,user:0});
  const B=await win(ctx,2),A=await win(ctx,1);const a=A.p,b=B.p;
  try{
    await a.click('#addProject');await a.keyboard.type('Extras');await a.keyboard.press('Enter');await sleep(300);await a.keyboard.press('Escape');
    const pid=await a.evaluate(()=>[...document.querySelectorAll('[data-pgo]')].pop().dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tasks]');
    for(const n of ['Alpha','Beta','Gamma']){await a.fill('#pt-name',n);await a.keyboard.press('Enter');await sleep(120)}
    // deadline
    await a.click('[data-pdue]');await a.fill('#pd-date','12/31/2030');await a.keyboard.press('Enter');await sleep(200);
    let s=await st(a,1),pr=s.projects.find(x=>x.id===pid);
    t.is('deadline saved',pr.due==='2030-12-31');
    await t.ok(a,'progress shows 0 of 3',()=>document.querySelector('.pm-prog').textContent.includes('0 of 3'));
    // board
    await a.click('[data-board="1"]');await sleep(200);
    await t.ok(a,'board has 3 columns with 3 cards in To do',()=>document.querySelectorAll('.bcol[data-bcol]').length===3&&document.querySelectorAll('[data-bcol=todo] .bcard').length===3);
    const alpha=await a.evaluate(()=>[...document.querySelectorAll('.bcard')].find(c=>c.textContent.includes('Alpha')).dataset.bid);
    await a.hover(`[data-bid="${alpha}"]`);await a.click(`[data-bid="${alpha}"] [data-bmove=doing]`);await sleep(200);
    await t.ok(a,'arrow moves a card to Doing',id=>!!document.querySelector(`[data-bcol=doing] [data-bid="${id}"]`),alpha);
    await a.dragAndDrop(`[data-bid="${alpha}"]`,'[data-bcol=done]');await sleep(500);await clearToasts(a);
    s=await st(a,1);t.is('dragging to Done completes the task',s.tasks.find(x=>x.id===alpha).done);
    await t.ok(a,'progress shows 1 of 3',()=>document.querySelector('.pm-prog').textContent.includes('1 of 3'));
    await shot(a,'px-board');
    // files
    await a.click('[data-ptab=files]');await a.fill('#fl-url','example.com/docs');await a.fill('#fl-name','Docs');await a.click('.fl-add .btn.primary');await sleep(200);
    await a.setInputFiles('#fl-file',{name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('hello')});await sleep(400);
    s=await st(a,1);pr=s.projects.find(x=>x.id===pid);
    t.is('a link and a file are saved',pr.files.length===2&&pr.files.some(f=>f.kind==='link'&&f.url==='https://example.com/docs')&&pr.files.some(f=>f.kind==='file'&&f.url.startsWith('data:')));
    await shot(a,'px-files');
    // activity
    await a.click('[data-ptab=activity]');await sleep(150);
    await t.ok(a,'activity lists task, deadline, completion and files',()=>{const x=document.querySelector('.act-list').textContent;return /added the task "Beta"/.test(x)&&/deadline/.test(x)&&/completed "Alpha"/.test(x)&&/Docs/.test(x)});
    await shot(a,'px-activity');
    // owner: share with user 2, then assign
    await a.click('[data-pshare]');await a.fill('#pm-q','User 2');await sleep(300);await a.click('.share-pop [data-add]');await sleep(500);await a.keyboard.press('Escape');
    await a.click('[data-ptab=tasks]');await sleep(200);
    const beta=await a.evaluate(()=>[...document.querySelectorAll('.bcard')].find(c=>c.textContent.includes('Beta')).dataset.bid);
    await a.click(`[data-bid="${beta}"] [data-asg]`);await sleep(150);await a.click('.asg-menu [data-who="local-user-2"]');await sleep(300);
    await t.ok(a,'owner avatar shows on the card',id=>!!document.querySelector(`[data-bid="${id}"] .asg.on`),beta);
    t.is('User 2 gets the owner',await wait(b,id=>{const s=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));const x=s.tasks.find(t=>t.id===id);return x&&x.assignee==='local-user-2'},beta,6000));
    t.is('User 2 gets an alert that the task was assigned to them',await wait(b,()=>{const d=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));return (d.alerts||[]).some(a=>/assigned .* to you/.test(a.text))},null,6000));
    t.is('User 2 gets the deadline and files',await wait(b,id=>{const s=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-2'));const p=s.projects.find(p=>p.id===id);return p&&p.due==='2030-12-31'&&(p.files||[]).length===2},pid));
    // list view shows owner too
    await a.click('[data-board="0"]');await sleep(200);
    await t.ok(a,'owner avatar shows in the list',id=>!!document.querySelector(`.task[data-id="${id}"] .asg.on`),beta);
    // Free zoom + image + drawing at zoom
    await a.click('[data-ptab=free]');await sleep(150);
    await a.click('[data-zoom="1"]');await sleep(150);
    s=await st(a,1);t.is('zoom in to 125%',s.ui.cvZoom===1.25);
    await a.click('[data-tool=pen]');const box=await a.locator('#cv').boundingBox();
    await a.mouse.move(box.x+125,box.y+125);await a.mouse.down();await a.mouse.move(box.x+200,box.y+150);await a.mouse.move(box.x+250,box.y+175);await a.mouse.up();await sleep(150);
    s=await st(a,1);pr=s.projects.find(x=>x.id===pid);const pt0=pr.strokes[pr.strokes.length-1].pts[0];
    t.is('drawing at 125% stores canvas coordinates',Math.abs(pt0[0]-100)<=2&&Math.abs(pt0[1]-100)<=2);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEJMDEgARgHAJ2/Af8cNrO+AAAAAElFTkSuQmCC','base64');
    const [fc]=await Promise.all([a.waitForEvent('filechooser'),a.click('[data-cvimg]')]);await fc.setFiles({name:'dot.png',mimeType:'image/png',buffer:png});await sleep(600);
    await t.ok(a,'image appears on the canvas',()=>!!document.querySelector('.cv-image img.cv-img'));
    await shot(a,'px-free');
    // archive
    await a.click('.pm-arch');await sleep(200);await clearToasts(a);
    s=await st(a,1);t.is('project archived',s.projects.find(x=>x.id===pid).archived===true);
    await a.click('[data-pback]');await sleep(200);
    await t.ok(a,'archived project hidden from the sidebar',id=>!document.querySelector(`#plist [data-proj="${id}"]`)&&!!document.querySelector('[data-archproj]'),pid);
    await t.ok(a,'and from the add bar',id=>![...document.querySelectorAll('#c-proj option')].some(o=>o.value===id),pid);
    await a.click('[data-archproj]');await sleep(150);
    await t.ok(a,'Show archived lists it',id=>!!document.querySelector(`#plist [data-proj="${id}"]`),pid);
    t.is('no page errors',!A.errs.length&&!B.errs.length||(console.log(A.errs,B.errs),false));
  }catch(e){console.log('ERROR',e.message);t.is('test ran',false)}
  t.done();await br.close();
})();
