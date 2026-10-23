// v75 (240, 241): On hold polish (bar inside folded rows, fold arrow above the "+", held task goes to the top), no dot on the project page, project folders + drag order
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
  try{
    const {p,errs}=await open(br,{w:1440,h:900,init:()=>{window.FOCUS_HOLD_OPEN=false}});
    await t.ok(p,'folded On hold bar stays inside the box',()=>{const x=document.querySelector('#list .task.hold-min'),a=x.getBoundingClientRect(),c=x.querySelector('.bar').getBoundingClientRect();return c.top>=a.top&&c.bottom<=a.bottom});
    await p.locator('#list .task.hold-min [data-holdexp]').first().click();await sleep(300);
    await t.ok(p,'open On hold arrow sits above the "+" in the top corner',()=>{const h=document.querySelector('#list .task.hold [data-holdexp][aria-expanded="true"]'),x=h.closest('.task'),m=x.querySelector('.mt-add'),a=h.getBoundingClientRect(),c=m.getBoundingClientRect(),T=x.getBoundingClientRect();return Math.abs(a.left+a.width/2-(c.left+c.width/2))<1.5&&a.top-T.top<10&&a.bottom<c.top});
    const names=()=>p.evaluate(()=>[...document.querySelectorAll('#list > .task .name')].map(n=>n.textContent));
    const r=p.locator('#list > .task',{has:p.locator('.name',{hasText:'Tanzania'})}).first();await r.hover();await r.locator('[data-act=hold]').click();await sleep(300);
    if(await p.locator('.pop').count()){await p.locator('.pop button',{hasText:'Skip'}).click();await sleep(300)}
    t.is('a task put on hold goes to the top',(await names())[0]==='Tanzania');
    // folders
    await p.click('#addFolder');await p.fill('#fd-name','Work stuff');await p.click('.pop .btn.primary');await sleep(200);
    await p.locator('#plist .pitem[data-proj="p_research"] [data-pedit]').click({force:true});await sleep(200);
    await p.selectOption('#pj-folder',{label:'Work stuff'});await p.click('.pop .btn.primary');await sleep(300);
    const fid=(await state(p)).folders[0].id;
    t.is('project picks a folder in its pencil window',(await state(p)).projects.find(x=>x.id==='p_research').folder===fid);
    await t.ok(p,'folder shows in the sidebar with its project',()=>!!document.querySelector('.pfold .pfkids [data-proj="p_research"]'));
    const drag=async(a,b,dy)=>{const s=await p.locator(a).boundingBox(),d=await p.locator(b).boundingBox();
      await p.mouse.move(s.x+40,s.y+s.height/2);await p.mouse.down();await p.mouse.move(s.x+40,s.y+s.height/2-12,{steps:4});await p.mouse.move(d.x+60,d.y+(dy==null?d.height/2:dy),{steps:6});await p.mouse.up();await sleep(300)};
    await drag('#plist .pitem[data-proj="p_personal"]','#plist .pfhead');
    const inF=()=>p.evaluate(()=>[...document.querySelectorAll('.pfold .pfkids [data-proj]')].map(x=>x.dataset.proj).join());
    t.is('drag a project onto a folder',await inF()==='p_research,p_personal');
    await drag('#plist .pitem[data-proj="p_personal"]','#plist .pitem[data-proj="p_research"]',3);
    t.is('drag a project above another one',await inF()==='p_personal,p_research');
    await t.ok(p,'a drag does not select the project',()=>document.querySelector('#plist .pitem.on').dataset.proj==='all');
    await p.locator('#plist .pitem[data-proj="p_personal"] [data-pedit]').click({force:true});await sleep(200);
    await p.click('.pop [data-pmv="1"]');await sleep(200);await p.click('.pop .btn.primary');await sleep(200);
    t.is('Move down in the pencil window',await inF()==='p_research,p_personal');
    await p.click('#plist .pfhead');await sleep(200);
    await t.ok(p,'folder closes',()=>getComputedStyle(document.querySelector('.pfkids')).display==='none');
    await shot(p,'pf-side',{clip:{x:0,y:0,width:300,height:420}});
    await p.click('#plist .pfhead');await sleep(200);
    await p.locator('#plist [data-pgo="p_research"]').click({force:true});await sleep(400);
    await t.ok(p,'no color dot by the project name',()=>{const i=document.querySelector('.pp-name > i');return !i||getComputedStyle(i).display==='none'});
    const {p:m,errs:e2}=await open(br,{w:390,h:844,dark:true});
    await t.ok(m,'no sideways scroll at 390px',noSideScroll);
    t.is('no page errors',errs.length+e2.length===0);if(errs.length+e2.length)console.log(errs,e2);
  }catch(e){console.log('  FAIL  crashed: '+e.message);t.is('crash',false)}
  t.done();await br.close()})();
