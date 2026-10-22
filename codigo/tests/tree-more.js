// Tree tab v72: node colors (inherited), moving nodes with their subnodes, the arrow guide, tools only on hover (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-trroot]');await sleep(200);await a.keyboard.type('Launch the new website for clients');await a.keyboard.press('Tab');await sleep(120);await a.keyboard.type('Design');
    await a.keyboard.press('Enter');await sleep(120);await a.keyboard.type('Write copy');await a.keyboard.press('Enter');await sleep(120);await a.keyboard.type('Build pages');await a.keyboard.press('Tab');await sleep(120);await a.keyboard.type('Home');
    await a.click('.tr-bar');await sleep(200);
    const ids=await a.evaluate(()=>[...document.querySelectorAll('.tr-node')].map(x=>x.dataset.tn));
    const tree=async()=>(await state(a)).projects.find(x=>x.id===pid).tree,nm=(T,id)=>{const n=T.find(x=>x.id===id);return n&&n.name};
    await a.click(`[data-tn="${ids[1]}"] [data-trpdone]`,{force:true});await sleep(200);
    await a.mouse.move(5,5);await sleep(100);
    t.is('done node has the same width as an open one',await a.evaluate(([x,y])=>Math.abs(document.querySelector(`[data-tn="${x}"]`).offsetWidth-document.querySelector(`[data-tn="${y}"]`).offsetWidth)<1,[ids[1],ids[2]]));
    t.is('tools are hidden until hover',await a.evaluate(i=>getComputedStyle(document.querySelector(`[data-tn="${i}"] .tr-tools`)).display==='none',ids[0]));
    t.is('fold and comment icons are the last things in the node',await a.evaluate(i=>{const k=[...document.querySelector(`[data-tn="${i}"]`).children].filter(x=>getComputedStyle(x).display!=='none'&&getComputedStyle(x).position!=='absolute');return k.at(-2).matches('.tr-fold')&&k.at(-1).matches('.tr-exp')},ids[0]));
    await a.hover(`[data-tn="${ids[0]}"]`);await sleep(100);
    t.is('tools show on hover',await a.evaluate(i=>getComputedStyle(document.querySelector(`[data-tn="${i}"] .tr-tools`)).display!=='none',ids[0]));
    await a.click(`[data-tn="${ids[0]}"] [data-trcol]`);await sleep(150);await a.click('.trc-sw [data-trc="#3aa655"]');await sleep(200);
    t.is('main node color is saved',(await tree()).find(x=>x.id===ids[0]).color==='#3aa655');
    t.is('subnodes take the main color, lines too',await a.evaluate(i=>{const d=document.querySelector(`[data-tn="${i}"]`);return d.style.getPropertyValue('--nc')==='#3aa655'&&d.closest('.tr-li').style.getPropertyValue('--lc')==='#3aa655'},ids[4]));
    await a.hover(`[data-tn="${ids[3]}"]`);await a.click(`[data-tn="${ids[3]}"] [data-trcol]`);await sleep(150);await a.click('.trc-sw [data-trc="#e07b39"]');await sleep(200);
    t.is('a subnode can have its own color, passed to its subnodes',await a.evaluate(([x,y,z])=>document.querySelector(`[data-tn="${x}"]`).style.getPropertyValue('--nc')==='#e07b39'&&document.querySelector(`[data-tn="${y}"]`).style.getPropertyValue('--nc')==='#e07b39'&&document.querySelector(`[data-tn="${z}"]`).style.getPropertyValue('--nc')==='#3aa655',[ids[3],ids[4],ids[2]]));
    await a.hover(`[data-tn="${ids[3]}"]`);await a.click(`[data-tn="${ids[3]}"] [data-trcol]`);await sleep(150);await a.click('.trc-none');await sleep(200);
    t.is('"Same as above" goes back to the parent color',!(await tree()).find(x=>x.id===ids[3]).color&&await a.evaluate(i=>document.querySelector(`[data-tn="${i}"]`).style.getPropertyValue('--nc')==='#3aa655',ids[3]));
    // arrow
    await a.click('[data-tmadd="a"]');await sleep(150);await a.selectOption('#tm-from',ids[2]);await a.fill('#tm-name','Ask Ana');await a.click('.gd-pop .btn');await sleep(250);
    let s=await state(a);const ar=s.projects.find(x=>x.id===pid).treeMarks.find(m=>m.type==='a');
    t.is('arrow is saved on its node with its text',!!ar&&ar.from===ids[2]&&ar.label==='Ask Ana');
    t.is('arrow starts at the right of its node, in the middle, pointing right',await a.evaluate(([m,n])=>{const d=document.querySelector(`[data-tm="${m}"]`).getBoundingClientRect(),r=document.querySelector(`[data-tn="${n}"]`).getBoundingClientRect();return !document.querySelector(`[data-tm="${m}"]`).hidden&&d.left>r.right&&d.left-r.right<12&&Math.abs(d.top-(r.top+r.height/2))<4},[ar.id,ids[2]]));
    t.is('arrow text sits after the tip',await a.evaluate(m=>{const d=document.querySelector(`[data-tm="${m}"]`),l=d.querySelector('.gd-lab').getBoundingClientRect();return l.left>d.getBoundingClientRect().right},ar.id));
    // move Build pages (with Home under it) before Design
    await a.click('.tr-bar');await a.hover(`[data-tn="${ids[3]}"]`);const gb=await a.locator(`[data-tn="${ids[3]}"] [data-trmove]`).boundingBox();
    const tb=await a.locator(`[data-tn="${ids[1]}"]`).boundingBox();
    await a.mouse.move(gb.x+5,gb.y+5);await a.mouse.down();await a.mouse.move(gb.x+30,gb.y-20,{steps:4});await a.mouse.move(tb.x+60,tb.y+3,{steps:6});await sleep(80);
    t.is('drop place is shown while dragging',!!await a.$(`[data-tn="${ids[1]}"].tr-drop-before`));
    await shot(a,'tree-more-drag');await a.mouse.up();await sleep(250);
    let T=await tree();if(process.env.DBG)console.log('DBG',JSON.stringify(T.map(x=>[x.name,T.findIndex(y=>y.id===x.parent)])),await a.evaluate(()=>[...document.querySelectorAll('.toast')].map(x=>x.textContent).join('|')));const kidsOf=id=>T.filter(x=>(x.parent||null)===id).map(x=>x.name);
    t.is('moved before Design, Home came along',JSON.stringify(kidsOf(ids[0]))===JSON.stringify(['Build pages','Design','Write copy'])&&T.find(x=>x.id===ids[4]).parent===ids[3]);
    // move Design inside Write copy, after making Write copy a task: the task becomes a subtask
    await a.hover(`[data-tn="${ids[2]}"]`);await a.click(`[data-tn="${ids[2]}"] [data-trtask]`);await sleep(200);
    await a.hover(`[data-tn="${ids[4]}"]`);await a.click(`[data-tn="${ids[4]}"] [data-trtask]`);await sleep(200);
    await a.hover(`[data-tn="${ids[4]}"]`);const g2=await a.locator(`[data-tn="${ids[4]}"] [data-trmove]`).boundingBox(),t2=await a.locator(`[data-tn="${ids[2]}"]`).boundingBox();
    await a.mouse.move(g2.x+5,g2.y+5);await a.mouse.down();await a.mouse.move(g2.x+30,g2.y-20,{steps:4});await a.mouse.move(t2.x+80,t2.y+t2.height/2,{steps:6});await sleep(80);await a.mouse.up();await sleep(250);
    s=await state(a);T=s.projects.find(x=>x.id===pid).tree;
    const hn=T.find(x=>x.id===ids[4]),wn=T.find(x=>x.id===ids[2]);
    t.is('dropped in the middle goes inside',hn.parent===ids[2]);
    t.is('its task became a subtask of the new parent task',s.tasks.find(x=>x.id===hn.taskId).parentId===wn.taskId);
    await a.mouse.move(5,5);await a.hover(`[data-tn="${ids[2]}"]`);const g3=await a.locator(`[data-tn="${ids[2]}"] [data-trmove]`).boundingBox(),t3=await a.locator(`[data-tn="${ids[4]}"]`).boundingBox();
    await a.mouse.move(g3.x+5,g3.y+5);await a.mouse.down();await a.mouse.move(g3.x+30,g3.y+20,{steps:4});await a.mouse.move(t3.x+80,t3.y+t3.height/2,{steps:6});await sleep(80);await a.mouse.up();await sleep(250);
    T=await tree();t.is('cannot drop a node into its own subnodes',T.find(x=>x.id===ids[2]).parent===ids[0]&&T.find(x=>x.id===ids[4]).parent===ids[2]);
    await a.mouse.move(5,5);await a.hover(`[data-tn="${ids[1]}"]`);await a.click(`[data-tn="${ids[1]}"] [data-trflag]`);await sleep(200);
    t.is('"!" marks the node',(await tree()).find(x=>x.id===ids[1]).flag===true&&await a.evaluate(i=>{const f=document.querySelector(`[data-tn="${i}"] .tr-flag`),n=document.querySelector(`[data-tn="${i}"] .tr-name`);return !!f&&getComputedStyle(f).color==='rgb(214, 69, 69)'&&f.getBoundingClientRect().right<=n.getBoundingClientRect().left+1},ids[1]));
    await a.hover(`[data-tn="${ids[1]}"]`);await a.click(`[data-tn="${ids[1]}"] [data-trflag]`);await sleep(200);
    t.is('"!" again removes it',!(await tree()).find(x=>x.id===ids[1]).flag&&!(await a.$(`[data-tn="${ids[1]}"] .tr-flag`)));
    await a.mouse.move(5,5);await a.hover(`[data-tn="${ids[1]}"]`);await a.click(`[data-tn="${ids[1]}"] [data-trflag]`);await sleep(200);
    await a.hover(`[data-tn="${ids[3]}"]`);await sleep(150);await shot(a,'tree-more-hover');
    await a.mouse.move(5,5);await sleep(150);await shot(a,'tree-more');
    await a.emulateMedia({colorScheme:'dark'});await sleep(150);await shot(a,'tree-more-dark');
    await a.setViewportSize({width:390,height:800});await sleep(250);await shot(a,'tree-more-390');await t.ok(a,'no sideways scroll at 390px',noSideScroll);
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
