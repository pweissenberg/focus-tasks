// hard task of the day, @project, plan my day, daily review (about 15 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    let s=await state(a);
    // @ picks the project
    const pj=s.projects[0];
    await a.fill('#c-name','Write intro @'+pj.name.slice(0,3));await sleep(150);
    t.is('@ opens the project menu',!!await a.$('.qe-menu:not(.tip-only)'));
    await a.keyboard.press('Tab');await sleep(100);
    await a.keyboard.press('Enter');await sleep(250);
    s=await state(a);const wi=s.tasks.find(x=>x.name==='Write intro');
    t.is('@ sets the project and leaves the name clean',!!wi&&wi.projectId===pj.id);
    // hard task
    t.is('no hard task chosen: nothing shows in the list',!await a.$('.hard-pick, .hard-sec'));
    await a.click('#reviewBtn');await sleep(150);await a.click('[data-rvm=hard]');await sleep(200);
    const opts=await a.$$eval('[data-hardset]',b=>b.map(x=>x.dataset.hardset));
    t.is('picker lists only tasks open more than 2 work days',opts.length>0&&!opts.includes(wi.id));
    const hid=opts[0];await a.click(`[data-hardset="${hid}"]`);await sleep(250);
    await t.ok(a,'section shows the hard task at the top',id=>{const s=document.querySelector('#list > .hard-sec');return !!s&&s===document.querySelector('#list').firstElementChild&&!!s.querySelector(`.task[data-id="${id}"]`)&&document.querySelectorAll(`#list .task[data-id="${id}"]`).length===1},hid);
    await shot(a,'hard-sec');
    // plan my day
    await a.fill('#c-name','Reply to Ana ;2');await a.keyboard.press('Enter');await sleep(200);
    await a.click('#reviewBtn');await sleep(150);await a.click('[data-rvm=plan]');await sleep(250);
    // a fixed day window so the test does not depend on the time it runs
    await a.fill('#pd-from','09:00');await a.dispatchEvent('#pd-from','change');await a.fill('#pd-to','18:00');await a.dispatchEvent('#pd-to','change');await sleep(200);
    const why=await a.$$eval('.pd-row',r=>r.map(x=>(x.querySelector('.pd-why')||{}).textContent||''));
    const iq=why.indexOf('quick'),ih=why.indexOf('hard task');
    t.is('plan: quick tasks first, then the hard task',iq===0&&ih>iq&&why.slice(ih+1).every(w=>w!=='quick'&&w!=='hard task'));
    t.is('plan: urgent ones come after the hard task',why.indexOf('urgent')<0||why.indexOf('urgent')>ih);
    await shot(a,'plan-day');
    const n0=(await state(a)).sessions.length;
    await a.click('[data-pdgo]');await sleep(250);
    s=await state(a);t.is('plan adds blocks to the calendar',s.sessions.length>n0);
    await clearToasts(a);
    // checking the hard task removes the section
    await a.click(`.hard-sec .task[data-id="${hid}"] .check`,{force:true}).catch(()=>a.evaluate(id=>document.querySelector(`.hard-sec .task[data-id="${id}"] input[type=checkbox]`).click(),hid));await sleep(400);
    s=await state(a);
    await t.ok(a,'done hard task: the section goes away',()=>!document.querySelector('.hard-sec'));
    t.is('hard task really done',!!s.tasks.find(x=>x.id===hid).done);
    // daily review
    await clearToasts(a);
    await a.click('#reviewBtn');await sleep(150);await a.click('[data-rvm=daily]');await sleep(250);
    await t.ok(a,'daily review lists what was done today',()=>document.querySelector('.modal .rv-list .rv-row')!==null);
    await a.fill('#dr-note','Good day');await sleep(100);
    await shot(a,'daily-review');
    await a.click('[data-drdone]');await sleep(200);
    s=await state(a);t.is('note saved in the journal',Object.values(s.journal).includes('Good day'));
    t.is('habits are gone',!await a.$('#habitsBtn'));
    await a.setViewportSize({width:390,height:800});await sleep(200);
    await t.ok(a,'phone: no sideways page scroll',noSideScroll);
    t.is('no page errors',!errs.length,errs.join('\n'));
  }catch(e){console.log(String(e.message).split('\n').slice(0,3).join(' '));t.is('ran without crashing',false,e.stack)}
  await br.close();t.done();
})();
