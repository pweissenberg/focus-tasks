// Quick check after a small change (about 20 s):   python3 build.py && node tests/quick.js
// Desktop (light) and phone (dark): add, edit and complete a task, open every screen, the timer, the gear panel,
// search and the shortcuts list. Fails on any page error or sideways scroll. Screenshots: /tmp/focus-shots/quick-*.png
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
const hasTask=name=>[...document.querySelectorAll('#list .task .name')].some(n=>n.textContent===name);

(async()=>{
  const br=await chromium.launch();
  for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){
    const {ctx,p,errs}=await open(br,{w,h,dark});
    console.log(`\n${w}px ${dark?'dark':'light'}`);
    try{
    await t.ok(p,'task list has rows',()=>document.querySelectorAll('#list .task').length>2);

    await p.fill('#c-name','Quick check task');await p.keyboard.press('Enter');await sleep(200);
    await t.ok(p,'add a task from the bar',hasTask,'Quick check task');
    const row=p.locator('#list .task',{has:p.locator('.name',{hasText:'Quick check task'})});
    await row.hover();await row.locator('[data-act=edit]').click();await sleep(150);
    await p.fill('#ed-name','Quick check edited');await p.click('.modal .btn.primary');await sleep(150);
    await t.ok(p,'edit it in the pencil window',hasTask,'Quick check edited');
    await p.locator('#list .task',{has:p.locator('.name',{hasText:'Quick check edited'})}).locator('.check input').click();await sleep(300);await clearToasts(p);
    const s=await state(p);
    t.is('complete it with the checkbox',s.tasks.some(x=>x.name==='Quick check edited'&&x.done));

    {const tz=p.locator('#list .task',{has:p.locator('.name',{hasText:/^Tanzania$/})}).first();
     await tz.locator('[data-act=stepadd]').click();await sleep(150);await tz.locator('.stepbox.plus').click();await sleep(150);
     await tz.locator('.stepbox[data-i="2"]').click();await sleep(200);
     const tz3=p.locator('#list .task',{has:p.locator('.name',{hasText:/^Tanzania 3$/})}).first();
     await t.ok(p,'steps: clicking 3 opens the step "Tanzania 3"',()=>[...document.querySelectorAll('#list .task .name')].some(n=>n.textContent==='Tanzania 3'));
     await tz3.locator('.check input').click();await sleep(300);await clearToasts(p);
     const ts=(await state(p)).tasks,m=ts.find(x=>x.steps&&x.steps.length===3);
     t.is('steps: ticking sends that step to Done and keeps the task',m&&m.steps[2].done&&!m.done&&m.name==='Tanzania'&&ts.some(x=>x.stepOf===m.id&&x.done&&x.name==='Tanzania 3'))
     await tz.locator('.stepbox[data-i="2"]').click();await sleep(200);
     await t.ok(p,'steps: a done step can be opened (shown ticked)',()=>[...document.querySelectorAll('#list .task')].some(r=>r.querySelector('.name').textContent==='Tanzania 3'&&r.querySelector('.check input').checked));
     const r3=p.locator('#list .task',{has:p.locator('.name',{hasText:/^Tanzania 3$/})}).first();await r3.hover();await r3.locator('[data-act=edit]').click();await sleep(150);
     await t.ok(p,'steps: pencil on step 3 shows only name, number and delete',()=>!!document.querySelector('#se-name')&&!document.querySelector('#ed-tag'));
     await p.selectOption('#se-num','1');await p.fill('#se-name','Tanzania 3');await p.click('.modal .btn.primary');await sleep(150);
     const m2=(await state(p)).tasks.find(x=>x.steps&&x.steps.length===3);
     t.is('steps: moving step 3 to number 2 swaps them and keeps the names',m2.steps[1].done&&m2.steps[1].name==='Tanzania 3'&&m2.steps[2].name==='Tanzania 2')
     {const r=p.locator('#list .task:has(.steps)').first();await r.hover();await r.locator('[data-act=edit]').click();await sleep(150);
      await p.selectOption('#se-num','0');await p.click('.modal .btn.primary');await sleep(150);
      const m3=(await state(p)).tasks.find(x=>x.steps&&x.steps.length===3);t.is('steps: a step can be moved to number 1',m3.steps[0].name==='Tanzania 3'&&m3.steps[1].name==='Tanzania')}
     await p.locator('#list .task:has(.steps)').first().locator('.stepbox[data-i="0"]').click();await sleep(150);}
    for(const [sel,title,extra] of [['.views [data-view=long]','Long term'],['.views [data-view=done]','Done'],
      ['#rail [data-view=calendar]','Calendar','#cal .cal-grid'],['#rail [data-view=stats]','Stats','#stats .hero-row'],['#rail [data-view=tasks]','Tasks','#list .task']]){
      await p.click(sel);await sleep(250);
      await t.ok(p,`open ${title}`,([ttl,ex])=>document.querySelector('#title').textContent===ttl&&(!ex||!!document.querySelector(ex))&&document.documentElement.scrollWidth<=innerWidth,[title,extra]);
    }
    await p.evaluate(()=>document.querySelector('[data-pgo]').click());await sleep(250);
    await t.ok(p,'project page opens with its add bar',()=>!document.querySelector('#projPage').hidden&&!!document.querySelector('#pt-name'));
    await p.click('[data-pback]');await sleep(200);

    await p.click('#c-adv');await sleep(100);
    await t.ok(p,'gear opens Advanced settings',()=>!!document.querySelector('#c-advp #c-time'));
    await p.click('#c-adv');

    await p.click('#search');await p.keyboard.type('Econs');await sleep(250);
    await t.ok(p,'search lists results',()=>document.querySelectorAll('.sr').length>0);
    await p.keyboard.press('Escape');

    await p.evaluate(()=>{if(document.querySelector('#timerCard').hidden)document.querySelector('#timerToggle').click()});await sleep(150);
    await p.click('#tm-start');await sleep(1300);
    await t.ok(p,'timer runs and the tab title counts',()=>/^\d+:\d\d/.test(document.title));
    await p.click('#tm-pause');await p.click('#timerClose');await sleep(150);

    await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.keyboard.press('?');await sleep(150);
    await t.ok(p,'? opens the shortcuts list',()=>!!document.querySelector('.modal.keys'));
    await p.keyboard.press('Escape');await sleep(100);

    await t.ok(p,'no sideways scroll',noSideScroll);
    }catch(e){t.is('stopped early: '+String(e.message).split('\n')[0],false)}
    t.is('no page errors'+(errs.length?': '+errs.join(' | '):''),!errs.length);
    console.log('  screenshot '+await shot(p,`quick-${w}${dark?'-dark':''}`));
    await ctx.close();
  }
  await br.close();t.done();
})();
