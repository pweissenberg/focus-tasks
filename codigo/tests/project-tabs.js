// Project tabs (subprojects): + Tab (several, from a template that copies the Tree), strip, sidebar, "Project, Tab" on rows, "@Project, Tab" (about 15 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860,clock:true});
  try{
    await a.click('#addProject');await a.keyboard.type('Update countries');await a.keyboard.press('Enter');await sleep(300);await a.keyboard.press('Escape');
    const pid=await a.evaluate(()=>[...document.querySelectorAll('[data-pgo]')].pop().dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    // a template with a tree: Check law > (Ask lawyer as a task)
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('Check law');await a.keyboard.press('Tab');await sleep(150);await a.keyboard.type('Ask lawyer');
    await a.click('.tr-bar');await sleep(200);
    let s=await state(a),p=s.projects.find(x=>x.id===pid);const ask=p.tree.find(x=>x.name==='Ask lawyer');
    await a.hover(`[data-tn="${ask.id}"]`);await a.click(`[data-tn="${ask.id}"] [data-trtask]`);await sleep(200);
    await a.click('[data-ptpl]');await a.fill('#tp-name','Country');await a.keyboard.press('Enter');await sleep(200);await clearToasts(a);
    s=await state(a);t.is('template keeps the tree',s.templates[0].tree.length===2&&s.templates[0].tree.some(n=>n.taskId));
    t.is('no tab strip before the first tab, only + Tab',await a.evaluate(()=>!!document.querySelector('[data-pxtadd]')&&!document.querySelector('[data-pxt]')));
    await a.click('[data-pxtadd]');await a.fill('#px-name','Brazil, Mexico');await a.selectOption('#px-tpl',s.templates[0].id);await a.click('.px-pop .btn.primary');await sleep(300);
    s=await state(a);const tabs=s.projects.filter(x=>x.tabOf===pid),br_=tabs.find(x=>x.name==='Brazil');
    t.is('two tabs made',tabs.length===2&&tabs.some(x=>x.name==='Mexico'));
    t.is('each tab got the tree with a linked task',tabs.every(x=>(x.tree||[]).length===2&&x.tree.some(n=>n.taskId&&s.tasks.some(k=>k.id===n.taskId&&k.projectId===x.id))));
    t.is('tree node parent kept',br_.tree.find(n=>n.name==='Ask lawyer').parent===br_.tree.find(n=>n.name==='Check law').id);
    await clearToasts(a);
    t.is('opened the first tab, strip shows Main + 2 tabs',await a.evaluate(id=>document.querySelector('.pxt.on').dataset.pxt===id&&document.querySelectorAll('.pxt').length===3,br_.id));
    t.is('title shows "Update countries, Brazil"',await a.evaluate(()=>document.querySelector('.pp-name').textContent.replace(/\s+/g,' ').replace(/,\s*/,', ').trim()==='Update countries, Brazil'));
    t.is('tabs are not in the sidebar, main is lit',await a.evaluate(id=>[...document.querySelectorAll('#plist .pname')].every(x=>!/Brazil|Mexico/.test(x.textContent))&&document.querySelector(`#plist [data-proj="${id}"]`).classList.contains('page'),pid));
    await a.click('[data-ptab=tasks]');await sleep(150);
    t.is('task row says "Update countries, Brazil"',await a.evaluate(()=>[...document.querySelectorAll('#list .projtag')].some(x=>x.textContent==='Update countries, Brazil')));
    await shot(a,'tabs-page');
    await a.click('[data-ptab=tree]');await sleep(150);await shot(a,'tabs-tree');
    // the + Tab box keeps its buttons inside
    await a.click('[data-pxtadd]');await sleep(150);
    t.is('+ Tab box: buttons and field fit inside',await a.evaluate(()=>{const p=document.querySelector('.pop').getBoundingClientRect();return [...document.querySelectorAll('.pop .btn,.pop input')].every(x=>{const r=x.getBoundingClientRect();return r.right<=p.right+1&&r.left>=p.left-1})}));
    await shot(a,'tabs-addbox');await a.keyboard.press('Escape');
    await a.click('[data-ptab=tasks]');await sleep(150);
    t.is('add bar says "Update countries, Brazil"',await a.evaluate(()=>document.querySelector('#pt-name').placeholder.includes('Add a task to Update countries, Brazil')));
    // recurring: mark done, shows in Main's activity, reopen and reset
    await a.click('[data-pxted]');await sleep(100);await a.check('#px-rec');await a.click('.px-pop .btn.primary');await sleep(150);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click(`[data-tn] [data-trcheck]`);await sleep(200);
    await a.click('[data-pxdone]');await sleep(200);await clearToasts(a);
    s=await state(a);let b2=s.projects.find(x=>x.id===br_.id),root=s.projects.find(x=>x.id===pid);
    t.is('tab done, recurring cycle 1, in Main activity',!!b2.closedAt&&b2.recurring&&b2.cycles.length===1&&root.activity.some(x=>x.txt==='"Brazil" done (cycle 1)'));
    t.is('no filter and no recurring mark on the tab',await a.evaluate(()=>!document.querySelector('[data-pxf]')&&!document.querySelector('.pxt .rc')&&!!document.querySelector('.pxt.closed')));
    await a.click(`[data-pxt="${br_.id}"]`);await sleep(150);await shot(a,'tabs-closed');
    await a.click('[data-pxreopen="1"]');await sleep(200);await clearToasts(a);
    s=await state(a);b2=s.projects.find(x=>x.id===br_.id);
    t.is('reopen and reset clears the done task',!b2.closedAt&&!!b2.resetAt&&!s.tasks.some(x=>x.projectId===br_.id&&x.done));
    await a.click('[data-pxdone]');await sleep(200);await clearToasts(a);
    await a.click(`.pxt[data-pxt="${pid}"]`);await sleep(150);await a.click('[data-ptab=activity]');await sleep(150);
    t.is('Main activity lists both done events',await a.evaluate(()=>[...document.querySelectorAll('.act-t')].filter(x=>x.textContent.includes('"Brazil" done')).length===2));
    await a.click('[data-actv=table]');await sleep(150);
    t.is('table: Brazil once (last done within 10 days) + Mexico open',await a.evaluate(()=>{const R=[...document.querySelectorAll('.pxtbl tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim()));
      return R.length===2&&R.filter(r=>r[0]==='Brazil'&&/\d\d\/\d\d\/\d{4}/.test(r[2])).length===1&&R.some(r=>r[0]==='Mexico'&&r[2]==='open')}));
    await shot(a,'tabs-table');
    await a.click(`[data-pxt="${br_.id}"]`);await sleep(150);await a.click('[data-pxreopen="0"]');await sleep(150);await clearToasts(a);
    // Import from Main + Reset checks
    await a.click(`[data-pxt="${pid}"]`);await sleep(150);await a.click('[data-ptab=tree]');await sleep(100);
    await a.click('[data-trroot]');await sleep(100);await a.keyboard.type('Main step');await a.click('.tr-bar');await sleep(150);
    await a.click(`[data-pxt="${br_.id}"]`);await sleep(150);
    const n0=(await state(a)).projects.find(x=>x.id===br_.id).tree.length;
    await a.click('[data-pximport]');await sleep(200);await clearToasts(a);
    s=await state(a);b2=s.projects.find(x=>x.id===br_.id);
    t.is('Import from Main copies Main\'s tree nodes',b2.tree.length===n0+3&&b2.tree.some(n=>n.name==='Main step'));
    const node=b2.tree.find(n=>n.name==='Main step');
    await a.click(`[data-tn="${node.id}"] [data-trpdone]`);await sleep(150);
    await a.click('[data-pxreset]');await a.click('[data-pxreset]');await sleep(200);await clearToasts(a);
    s=await state(a);t.is('Reset checks unticks the nodes',!s.projects.find(x=>x.id===br_.id).tree.some(n=>n.done));
    await shot(a,'tabs-tree2');
    // Plan tab: start dates, dots on the sidebar, the Plan tab and the subproject tab
    await a.click(`.pxt[data-pxt="${pid}"]`);await sleep(150);
    await a.click('[data-ptab=plan]');await sleep(150);
    const tmr=await a.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`});
    const mxId=(await state(a)).projects.find(x=>x.name==='Mexico').id;
    await a.fill(`[data-plan="${mxId}"] .pxplan-d`,tmr);await a.keyboard.press('Escape');await a.click('.pxplan th');await sleep(200);
    s=await state(a);t.is('Plan tab saves the start date',!!s.projects.find(x=>x.id===mxId).planStart);
    await shot(a,'tabs-plan');
    t.is('no dot before the day',await a.evaluate(()=>!document.querySelector('.pxdot')));
    await a.click('[data-ptab=tasks]');await sleep(100);
    await a.click('[data-pback]');await sleep(150);
    await a.clock.fastForward('25:00:00');await a.evaluate(()=>document.querySelector('[data-proj="all"]').click());await sleep(300);
    t.is('on the day: dot on the main project in the sidebar',await a.evaluate(id=>!!document.querySelector(`#plist [data-proj="${id}"] .pxdot`),pid));
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(200);
    await a.click(`.pxt[data-pxt="${mxId}"]`);await sleep(150);await a.click(`.pxt[data-pxt="${pid}"]`);await sleep(150);
    t.is('dots stay after opening: sidebar, Mexico tab',await a.evaluate(([id,mx])=>!!document.querySelector(`#plist [data-proj="${id}"] .pxdot`)&&!!document.querySelector(`.pxt[data-pxt="${mx}"] .pxdot`),[pid,mxId]));
    await a.click('[data-ptab=plan]');await sleep(150);
    t.is('Plan tab has a dot and a Started button, not "Started" text',await a.evaluate(mx=>!!document.querySelector('[data-ptab=plan] .pxdot')&&!!document.querySelector(`[data-pxstart="${mx}"]`),mxId));
    await shot(a,'tabs-dots');
    await a.click(`[data-pxstart="${mxId}"]`);await sleep(200);await clearToasts(a);
    t.is('Started clears every dot',await a.evaluate(()=>!document.querySelector('.pxdot')));
    // Brazil: done clears its plan date; planned again + manual reopen counts as started
    const brId=(await state(a)).projects.find(x=>x.name==='Brazil').id;
    await a.fill(`[data-plan="${brId}"] .pxplan-d`,await a.evaluate(()=>{const d=new Date();return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`}));await a.keyboard.press('Escape');await a.click('.pxplan th');await sleep(200);
    await a.click(`.pxt[data-pxt="${brId}"]`);await sleep(150);await a.click('[data-pxdone]');await sleep(200);await clearToasts(a);
    s=await state(a);t.is('done resets the plan date',!s.projects.find(x=>x.id===brId).planStart);
    await a.click(`.pxt[data-pxt="${pid}"]`);await sleep(150);
    await a.fill(`[data-plan="${brId}"] .pxplan-d`,tmr);await a.keyboard.press('Escape');await a.click('.pxplan th');await sleep(200);
    t.is('Brazil (done, due) shows the dot and Started',await a.evaluate(b=>!!document.querySelector(`[data-pxstart="${b}"]`)&&!!document.querySelector('[data-ptab=plan] .pxdot'),brId));
    await a.click(`.pxt[data-pxt="${brId}"]`);await sleep(150);await a.click('[data-pxreopen="0"]');await sleep(200);await clearToasts(a);
    s=await state(a);t.is('reopening by hand counts as started',!!s.projects.find(x=>x.id===brId).planStarted&&!s.projects.find(x=>x.id===brId).closedAt);
    await a.click('[data-ptab=tasks]');await sleep(100);
    // @Project, Tab in the main add bar
    await a.click('[data-pback]');await sleep(200);
    await a.fill('#c-name','Call embassy @update countries,mex');await a.keyboard.press('Escape');await a.focus('#c-name');await a.keyboard.press('Enter');await sleep(250);
    s=await state(a);const mx=s.projects.find(x=>x.name==='Mexico'),ce=s.tasks.find(x=>x.name==='Call embassy');
    t.is('"@update countries,mex" puts the task in the Mexico tab',!!ce&&ce.projectId===mx.id);
    t.is('the project picker says "Update countries, Mexico"',await a.evaluate(()=>[...document.querySelectorAll('#c-proj option')].some(o=>o.textContent==='Update countries, Mexico')));
    // delete a tab: tasks move to Main
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(200);
    await a.click(`[data-pxt="${mx.id}"]`);await sleep(150);await a.click('[data-pxted]');await sleep(100);
    await a.click('.px-pop [data-del]');await a.click('.px-pop [data-del]');await sleep(200);
    s=await state(a);t.is('deleted tab, its tasks moved to Main',!s.projects.some(x=>x.id===mx.id)&&s.tasks.find(x=>x.name==='Call embassy').projectId===pid);
    await a.setViewportSize({width:390,height:800});await sleep(200);
    await t.ok(a,'no sideways scroll at 390px',noSideScroll);await shot(a,'tabs-390');
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){console.log('  FAIL  '+e.message.split('\n')[0]);t.is('test ran to the end',false)}
  await br.close();t.done();
})();
