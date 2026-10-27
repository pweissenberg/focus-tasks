// Tree tabs: several trees per project (add, switch, rename, move, drag, delete + undo, template, Import from Main, Done tab) (about 15 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>[...document.querySelectorAll('[data-pgo]')].pop().dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tree]');await sleep(150);
    t.is('one tree shows as "Tree 1" with + Tree',await a.evaluate(()=>document.querySelectorAll('.ttab').length===1&&document.querySelector('.ttab.on').textContent.includes('Tree 1')&&!!document.querySelector('[data-ttadd]')));
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('Plan A');await a.keyboard.press('Tab');await sleep(150);await a.keyboard.type('Step A');
    await a.click('.tr-bar');await sleep(200);
    let s=await state(a),p=s.projects.find(x=>x.id===pid);const stepA=p.tree.find(x=>x.name==='Step A');
    await a.hover(`[data-tn="${stepA.id}"]`);await a.click(`[data-tn="${stepA.id}"] [data-trtask]`);await sleep(200);await clearToasts(a);
    await a.click('[data-ttadd]');await a.fill('#tt-name','Launch');await a.click('.tt-pop .btn.primary');await sleep(250);await clearToasts(a);
    t.is('the new tree opens empty',await a.evaluate(()=>document.querySelector('.ttab.on').textContent.includes('Launch')&&!document.querySelector('.tr-root')&&!!document.querySelector('#projBody .empty')));
    t.is('a task of another tree is not offered in "Add an existing task"',await a.evaluate(()=>{const s=document.querySelector('[data-trlink]');return !s||![...s.options].some(o=>o.textContent==='Step A')}));
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('Go live');await a.click('.tr-bar');await sleep(200);
    s=await state(a);p=s.projects.find(x=>x.id===pid);
    t.is('state: two tabs, open tree is Launch with its node',p.treeTabs.length===2&&p.treeTabs.find(x=>x.id===p.treeCur).name==='Launch'&&p.tree.length===1&&p.tree[0].name==='Go live'&&p.treeTabs[0].tree.length===2);
    // a guide in tree 1 stays with tree 1
    await a.evaluate(()=>document.querySelector('.ttab:not(.on)').click());await sleep(200);
    t.is('switching back shows Tree 1 nodes only',await a.evaluate(()=>{const n=[...document.querySelectorAll('.tr-name')].map(x=>x.value);return n.includes('Plan A')&&n.includes('Step A')&&!n.includes('Go live')}));
    await shot(a,'tree-tabs');
    // rename + move
    await a.click('.ttab.on [data-tted]');await a.fill('#tt-name','Research');await a.click('.tt-pop .btn.primary');await sleep(200);
    t.is('rename works',await a.evaluate(()=>document.querySelector('.ttab.on').textContent.includes('Research')));
    await a.click('.ttab.on [data-tted]');await a.click('.tt-pop [data-ttr]');await sleep(200);
    t.is('move right puts it second',await a.evaluate(()=>[...document.querySelectorAll('.ttab')].map(x=>x.textContent.trim().split(' ')[0]).join()==='Launch,Research'));
    // drag Research back to the front
    const box=await (await a.$('.ttab:not(.on)')).boundingBox();
    await a.dragAndDrop('.ttab.on','.ttab:not(.on)',{targetPosition:{x:3,y:box.height/2}});await sleep(250);
    t.is('drag reorders the tabs',await a.evaluate(()=>[...document.querySelectorAll('.ttab')].map(x=>x.textContent.trim().split(' ')[0]).join()==='Research,Launch'));
    // template keeps both trees; a new project tab from it gets both
    await clearToasts(a);
    await a.click('[data-ptpl]');await a.fill('#tp-name','Two trees');await a.keyboard.press('Enter');await sleep(200);await clearToasts(a);
    s=await state(a);const tpl=s.templates.find(x=>x.name==='Two trees');
    t.is('template keeps both trees',tpl.treeTabs&&tpl.treeTabs.length===2&&tpl.treeTabs.some(x=>x.name==='Launch'&&x.tree.length===1));
    await a.click('[data-pxtadd]');await a.fill('#px-name','Brazil');await a.selectOption('#px-tpl',tpl.id);await a.click('.px-pop .btn.primary');await sleep(300);await clearToasts(a);
    s=await state(a);let tab=s.projects.find(x=>x.tabOf===pid&&x.name==='Brazil');
    t.is('tab from the template has both trees in order, tasks linked',tab.treeTabs.map(x=>x.name).join()==='Research,Launch'&&tab.tree.some(n=>n.taskId&&s.tasks.some(k=>k.id===n.taskId&&k.projectId===tab.id))&&tab.treeTabs[1].tree[0].name==='Go live');
    // Import from Main into an empty tab
    await a.click('[data-pxtadd]');await a.fill('#px-name','Chile');await a.click('.px-pop .btn.primary');await sleep(300);await clearToasts(a);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-pximport]');await sleep(300);
    s=await state(a);tab=s.projects.find(x=>x.tabOf===pid&&x.name==='Chile');
    const all=tab.treeTabs.map(x=>x.id===tab.treeCur?{name:x.name,tree:tab.tree}:x);
    t.is('Import from Main copies every tree into the same names',all.length===2&&all.find(x=>x.name==='Research').tree.length===2&&all.find(x=>x.name==='Launch').tree.length===1);
    // Done tab lists done steps of a closed tree and opens it
    await a.evaluate(i=>document.querySelector(`[data-pxt="${i}"]`).click(),pid);await sleep(250);
    await a.evaluate(()=>[...document.querySelectorAll('.ttab')].find(x=>x.textContent.includes('Launch')).click());await sleep(200);
    await a.click('[data-trpdone]');await sleep(200);
    await a.evaluate(()=>[...document.querySelectorAll('.ttab')].find(x=>x.textContent.includes('Research')).click());await sleep(200);
    await a.evaluate(()=>document.querySelector('[data-view=done]').click());await sleep(300);
    t.is('Done tab shows the closed tree step with the tree name',await a.evaluate(()=>[...document.querySelectorAll('.tnd-row')].some(r=>r.textContent.includes('Go live')&&r.textContent.includes('Launch'))));
    await a.evaluate(()=>[...document.querySelectorAll('.tnd-row')].find(r=>r.textContent.includes('Go live')).querySelector('[data-tndgo]').click());await sleep(300);
    t.is('Open tree opens that tree',await a.evaluate(()=>document.querySelector('.ttab.on').textContent.includes('Launch')&&[...document.querySelectorAll('.tr-name')].some(x=>x.value==='Go live')));
    // delete + undo
    await a.click('.ttab.on [data-tted]');await a.click('.tt-pop [data-del]');await a.click('.tt-pop [data-del]');await sleep(250);
    s=await state(a);p=s.projects.find(x=>x.id===pid);
    t.is('delete removes the tree, tasks stay',p.treeTabs.length===1&&p.treeTabs[0].name==='Research'&&p.tree.some(n=>n.name==='Step A')&&s.tasks.some(k=>k.name==='Step A'));
    await a.click('.toast button');await sleep(250);
    s=await state(a);p=s.projects.find(x=>x.id===pid);
    t.is('undo brings it back',p.treeTabs.length===2&&p.tree.some(n=>n.name==='Go live'));
    await a.setViewportSize({width:390,height:800});await sleep(200);await t.ok(a,'no sideways scroll at 390px',noSideScroll);
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
