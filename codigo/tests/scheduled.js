// v95 (260): "Show from" in the add bar schedules a task; one end-of-list line with recurring + scheduled; Scheduled window
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
 try{for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){const {p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px`);
  const fut=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+4);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`});
  await p.click('#composer .cgear');await sleep(150);
  await t.ok(p,'Advanced settings has Show from',()=>!!document.querySelector('#c-advp #c-from'));
  await p.fill('#c-from',fut);await p.click('#c-advp .cadv-h b');await sleep(100);
  await t.ok(p,'hint says it stays out of the list',()=>/stays out of the list/.test(document.querySelector('#c-advp [data-advhint]').textContent));
  await p.fill('#c-name','Pay the rent');await p.keyboard.press('Enter');await sleep(250);
  let s=await state(p),x=s.tasks.find(k=>k.name==='Pay the rent');
  t.is('task saved with the date',!!x&&!!x.defer);
  await t.ok(p,'not in the list, line says scheduled',()=>![...document.querySelectorAll('#list .task .name')].some(n=>n.textContent.includes('Pay the rent'))&&/1 scheduled task enters/.test(document.querySelector('#list .schedline').textContent));
  await t.ok(p,'only one line at the end of the list',()=>document.querySelectorAll('#list>.defline').length===1);
  await p.fill('#c-name','Plain task');await p.keyboard.press('Enter');await sleep(250);
  s=await state(p);t.is('next task is not scheduled (default now)',!s.tasks.find(k=>k.name==='Plain task').defer);
  await clearToasts(p);await p.click('#list [data-schedall]');await sleep(200);
  await t.ok(p,'window lists the scheduled task',()=>{const r=document.querySelector('.schedwin .rec-row');return !!r&&r.textContent.includes('Pay the rent')&&r.textContent.includes('Enters')});
  await shot(p,`sched-${w}`);
  await p.click('.schedwin [data-schnow]');await sleep(250);
  await t.ok(p,'Show now puts it in the list',()=>[...document.querySelectorAll('#list .task .name')].some(n=>n.textContent.includes('Pay the rent'))&&!document.querySelector('#list .schedline'));
  t.is('no page errors '+errs.join(';'),errs.length===0);await p.close()}
 }finally{await br.close()}t.done()})();
