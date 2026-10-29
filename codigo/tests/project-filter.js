// v91: sidebar project opens its page, "All projects" dropdown on the Sort row filters the list, date hint in the add bar tip
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll}=require('./harness');
const t=checks();
(async()=>{
  const br=await chromium.launch();
  for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){
    const {ctx,p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px ${dark?'dark':'light'}`);
    try{
    const pid=await p.evaluate(()=>document.querySelector('#plist .pitem[data-proj]:not([data-proj="all"])').dataset.proj);
    await p.evaluate(id=>document.querySelector(`#plist .pitem[data-proj="${id}"]`).click(),pid);await sleep(250);
    let s=await state(p);
    t.is('sidebar project opens its page',s.ui.view==='project'&&s.ui.projectPage===pid);
    await p.evaluate(()=>document.querySelector('[data-proj="all"]').click());await sleep(250);
    s=await state(p);t.is('back on Tasks, the list is not filtered',s.ui.view==='tasks'&&s.ui.project==='all');
    await t.ok(p,'"All projects" button on the Sort row',()=>{const b=document.querySelector('#sorts #pfBtn');return b&&b.offsetParent&&b.textContent.includes('All projects')});
    await p.click('#pfBtn');await sleep(150);
    await t.ok(p,'dropdown lists the projects',id=>!!document.querySelector(`.pf-menu [data-pf="${id}"]`),pid);
    await p.click(`.pf-menu [data-pf="${pid}"]`);await sleep(250);
    s=await state(p);
    t.is('picking one filters the list',s.ui.project===pid&&s.ui.view==='tasks');
    await t.ok(p,'only that project\'s tasks show',id=>{const S=JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1'));const n=new Set(S.tasks.filter(x=>x.projectId===id).map(x=>x.name));const r=[...document.querySelectorAll('#list .task:not(.done) .name')];return r.length>0&&r.every(x=>n.has(x.textContent))},pid);
    await t.ok(p,'button shows the project name',id=>document.querySelector('#pfBtn').classList.contains('on'),pid);
    // a page visit keeps the dropdown choice
    await p.evaluate(id=>document.querySelector(`#plist .pitem[data-proj="${id}"]`).click(),pid);await sleep(200);
    await p.evaluate(()=>document.querySelector('[data-proj="all"]').click());await sleep(250);
    s=await state(p);t.is('after a page visit the filter is the dropdown\'s again',s.ui.project==='all');
    await p.click('#pfBtn');await sleep(150);await p.click(`.pf-menu [data-pf="${pid}"]`);await sleep(200);
    await p.evaluate(id=>document.querySelector(`#plist .pitem[data-proj="${id}"]`).click(),pid);await sleep(200);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('#rail button')].find(x=>/tasks/i.test(x.getAttribute('aria-label')||x.title||''));b&&b.click()});await sleep(250);
    s=await state(p);t.is('page visit then Tasks keeps the chosen project',s.ui.view==='tasks'&&s.ui.project===pid);
    await shot(p,`pfilter-row-${w}`);
    await t.ok(p,'sidebar does not light the filtered project',id=>!document.querySelector(`#plist .pitem[data-proj="${id}"]`).classList.contains('on'),pid);
    await p.focus('#c-name');await sleep(150);
    await t.ok(p,'add bar tip mentions written dates',()=>/next tuesday/.test((document.querySelector('.qe-tip')||{}).textContent||''));
    await shot(p,`pfilter-${w}`);
    await t.ok(p,'no sideways scroll',noSideScroll);
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs);
    }catch(e){console.log('  FAIL  crashed: '+e.message);t.is('crash',false)}
    await ctx.close();
  }
  await br.close();t.done&&t.done();
})();
