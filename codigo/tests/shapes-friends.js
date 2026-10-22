// Free canvas shapes + friends (about 15 s):  node tests/shapes-friends.js
const {chromium}=require('playwright');
const {newContext,newPage,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
(async()=>{
  const br=await chromium.launch();
  // User 2 signs in once first so a profile exists, then User 1 works in a second window
  const ctx=await newContext(br,{w:1440,h:900,user:0});
  const w2=await ctx.newPage();await w2.addInitScript(()=>sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-2',email:'user2@test.local',user_metadata:{full_name:'User 2'}}})));await w2.goto('http://app/');await sleep(800);await w2.close();
  await ctx.addInitScript(()=>{if(!sessionStorage.getItem('focus-local-session'))sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-1',email:'user1@test.local',user_metadata:{full_name:'User 1'}}}))});
  const {p,errs}=await newPage(ctx);
  try{
    // friends: add User 2 from the account menu
    await p.click('#acctBtn');await p.click('[data-friends]');
    await p.fill('#fr-q','User 2');await sleep(400);
    await p.click('[data-fadd="0"]');await sleep(200);
    t.ok(p,'User 2 is in the friends list',()=>document.querySelector('.fr-list').textContent.includes('User 2'));
    await shot(p,'friends-modal');
    await p.click('.modal.friends [data-x]');
    t.is('friends saved in state',(await state(p)).friends.some(f=>f.id==='local-user-2'));
    // project: friend shows first in Add person
    await p.click('#addProject');await p.keyboard.type('Shapes test');await p.keyboard.press('Enter');await sleep(300);await p.keyboard.press('Escape');
    const pid=await p.evaluate(()=>[...document.querySelectorAll('[data-pgo]')].pop().dataset.pgo);
    await p.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await p.click('[data-pshare]');await sleep(300);
    t.ok(p,'friend is a quick pick in Add person',()=>{const r=document.querySelector('.share-pop .sp-res .sp-row');return r&&r.textContent.includes('User 2')&&r.textContent.includes('friend')});
    await shot(p,'friends-addperson');
    await p.click('.share-pop [data-add="0"]');await sleep(500);
    t.ok(p,'friend added to the project',()=>document.querySelectorAll('.pp-people .av').length===2);
    await p.keyboard.press('Escape');await clearToasts(p);
    // shapes
    await p.click('[data-ptab=free]');await sleep(200);
    await p.click('[data-tool=rect]');
    const box=await p.locator('#cv').boundingBox();
    const drag=async(x1,y1,x2,y2)=>{await p.mouse.move(box.x+x1,box.y+y1);await p.mouse.down();await p.mouse.move(box.x+(x1+x2)/2,box.y+(y1+y2)/2);await p.mouse.move(box.x+x2,box.y+y2);await p.mouse.up();await sleep(150)};
    await drag(60,60,220,160);
    await p.click('[data-tool=ellipse]');await drag(260,60,400,160);
    await p.click('[data-tool=tri]');await drag(440,60,560,180);
    await p.click('[data-tool=arrow]');await drag(60,220,300,300);
    await p.click('[data-tool=line]');await drag(340,220,560,300);
    let s=await state(p);let pr=s.projects.find(x=>x.id===pid);
    t.is('five shapes saved',pr.strokes.filter(x=>x.shape).length===5);
    await shot(p,'shapes-drawn');
    await p.click('[data-undostroke]');await sleep(100);
    s=await state(p);pr=s.projects.find(x=>x.id===pid);
    t.is('Undo removes the last shape',pr.strokes.filter(x=>x.shape).length===4);
    // select + move + delete
    await p.click('[data-tool=move]');await sleep(100);
    const before=pr.strokes.find(x=>x.shape==='rect');
    await p.mouse.move(box.x+60,box.y+110);await p.mouse.down();await p.mouse.move(box.x+90,box.y+130);await p.mouse.move(box.x+110,box.y+150);await p.mouse.up();await sleep(200);
    s=await state(p);pr=s.projects.find(x=>x.id===pid);const after=pr.strokes.find(x=>x.shape==='rect');
    t.is('dragging a shape moves it',after.x1===before.x1+50&&after.y1===before.y1+40);
    t.ok(p,'moved shape is selected',()=>!!document.querySelector('.shp.sel')&&!!document.querySelector('[data-shpdel]'));
    await p.click('[data-pcolor=red]');await sleep(100);
    s=await state(p);pr=s.projects.find(x=>x.id===pid);
    t.is('color button recolors the selected shape',pr.strokes.find(x=>x.shape==='rect').color==='red');
    await shot(p,'shape-selected');
    await p.keyboard.press('Delete');await sleep(150);
    s=await state(p);pr=s.projects.find(x=>x.id===pid);
    t.is('Delete removes the selected shape',!pr.strokes.some(x=>x.shape==='rect'));
    await p.click('[data-tool=eraser]');await p.mouse.move(box.x+330,box.y+60);await p.mouse.down();await p.mouse.move(box.x+330,box.y+110);await p.mouse.move(box.x+330,box.y+160);await p.mouse.up();await sleep(150);
    s=await state(p);pr=s.projects.find(x=>x.id===pid);
    t.is('Erase removes a shape',!pr.strokes.some(x=>x.shape==='ellipse'));
    t.is('no page errors',!errs.length||(console.log(errs),false));
  }catch(e){console.log('ERROR',e.message);t.is('test ran',false)}
  t.done();await br.close();
})();
