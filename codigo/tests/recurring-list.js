// v87: recurring tasks wait until the day before, sort first on their day, and the rail window lists them all (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
const at=s=>new Date(s+'T10:00:00').getTime();
(async()=>{const br=await chromium.launch();
  for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){
    const {p,errs}=await open(br,{w,h,dark,clock:true});console.log(`\n${w}px ${dark?'dark':'light'}`);
    try{
      const go=async d=>{await p.clock.setSystemTime(at(d));await p.evaluate(()=>document.querySelector('#rail [data-view=tasks]').click());await sleep(200)};
      const names=()=>p.evaluate(()=>[...document.querySelectorAll('#list .task .name')].map(x=>x.textContent.trim()));
      const row=n=>p.locator('#list .task',{has:p.locator('.name',{hasText:n})});
      await go('2026-10-28'); // a Wednesday
      for(const n of ['Alpha','Weekly call'])await (async()=>{await p.fill('#c-name',n);await p.keyboard.press('Enter');await sleep(200)})();
      await row('Weekly call').hover();await row('Weekly call').locator('[data-act=edit]').click();await sleep(150);
      await p.selectOption('#ed-rep','weekly');await sleep(100);await p.click('.rep-x [data-rwd="2"]');await p.click('.modal .btn.primary');await sleep(250);
      let x=(await state(p)).tasks.find(k=>k.name==='Weekly call'&&!k.done);
      t.is('first copy is due next Tuesday and shows right away',x.due==='2026-11-03'&&(await names()).includes('Weekly call'));
      await go('2026-11-03');
      t.is('on its day it is first in the list',(await names())[0]==='Weekly call');
      await row('Weekly call').locator('.check input').click();await sleep(350);await clearToasts(p);
      x=(await state(p)).tasks.find(k=>k.name==='Weekly call'&&!k.done);
      t.is('done: next copy due Nov 10, hidden from the list',!!x&&x.due==='2026-11-10'&&!(await names()).includes('Weekly call'));
      await t.ok(p,'line says one recurring task is waiting',()=>!!document.querySelector('#list .recline'));
      await p.click(w>400?'#recBtn':'#list [data-recall]');await sleep(200);
      await t.ok(p,'window lists it with the day it shows',()=>{const r=document.querySelector('.recwin .rec-row');return !!r&&r.textContent.includes('Weekly call')&&r.textContent.includes('Every Tuesday')&&r.textContent.includes('Shows Mon, Nov 9')});
      await shot(p,`rec-${w}`);
      await p.click('.recwin [data-recedit]');await sleep(200);
      await t.ok(p,'Edit opens the edit window',()=>!!document.querySelector('.modal #ed-name'));
      await p.keyboard.press('Escape');await sleep(250);
      await t.ok(p,'closing the edit window goes back to the list',()=>!!document.querySelector('.recwin'));
      await p.click('.recwin [data-x]');await sleep(150);
      await go('2026-11-08');t.is('still hidden two days before',!(await names()).includes('Weekly call'));
      await go('2026-11-09');t.is('shows the day before (not first yet)',(await names()).includes('Weekly call')&&(await names())[0]!=='Weekly call');
      await go('2026-11-10');t.is('first again on Tuesday',(await names())[0]==='Weekly call');
      t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
    }catch(e){console.log(e.message.split('\n').slice(0,6).join('\n'));t.is('ran without crashing',false)}
  }
  await br.close();t.done();
})();
