// Quick entry in the add bars: "[" tag picker with Tab, ";" time, glow on quick tasks (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    t.is('main bar shows the hint',(await a.getAttribute('#c-name','placeholder')).includes('['));
    let s=await state(a);const tag=s.tags[0],q=tag.name.slice(0,2);
    await a.click('#c-name');await a.keyboard.type('Call mom ['+q);await sleep(150);
    t.is('[ shows matching tags',await a.evaluate(n=>{const m=document.querySelector('.qe-menu');return !!m&&m.textContent.includes(n)},tag.name));
    await a.keyboard.press('Tab');await sleep(100);
    t.is('Tab picks the first tag and cleans the text',await a.evaluate(id=>document.querySelector('#c-tag').value===id&&document.querySelector('#c-name').value==='Call mom',tag.id));
    await a.keyboard.type(' ;2');await sleep(100);
    t.is('; shows the time preview',await a.evaluate(()=>{const m=document.querySelector('.qe-menu');return !!m&&m.textContent.includes('Takes 2m')}));
    await shot(a,'qe-time');
    await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const nt=s.tasks.find(x=>x.name==='Call mom');
    t.is('task saved with tag and 2 minutes',!!nt&&nt.tagId===tag.id&&nt.est===2);
    await t.ok(a,'quick task glows and shows its time',id=>{const r=document.querySelector(`.task[data-id="${id}"]`);return r&&r.classList.contains('quick')&&r.querySelector('.estc').textContent==='2m'},nt.id);
    await shot(a,'qe-glow');
    await t.ok(a,'quick task is the first open task that is not on hold',id=>{const r=[...document.querySelectorAll('#list .task')].find(x=>!x.classList.contains('hold'));return r&&r.dataset.id===id},nt.id);
    await a.fill('#c-name','Write report [zzzq] ;1h30');await a.keyboard.press('Escape');await a.focus('#c-name');await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const lt=s.tasks.find(x=>x.name.startsWith('Write report'));
    t.is('long task: 90 minutes, unknown tag text kept',lt&&lt.est===90&&lt.name==='Write report [zzzq]');
    await t.ok(a,'long task does not glow',id=>!document.querySelector(`.task[data-id="${id}"]`).classList.contains('quick'),lt.id);
    await a.click(`.task[data-id="${nt.id}"] .estc`);await sleep(150);await a.selectOption('#est-q','0');await sleep(200);await a.keyboard.press('Escape');
    await t.ok(a,'glow can be turned off',id=>!document.querySelector(`.task[data-id="${id}"]`).classList.contains('quick'),nt.id);
    s=await state(a);t.is('setting saved',s.prefs.quickMins===0);
    await a.setViewportSize({width:390,height:800});await sleep(200);await t.ok(a,'no sideways scroll at 390px',noSideScroll);
    // ! marks it urgent
    await a.fill('#c-name','Call the bank ! ;5');await a.keyboard.press('Enter');await sleep(250);
    {const st=await state(a),x=st.tasks.find(y=>y.name==='Call the bank');t.is('! makes it urgent (High priority) and is removed from the name',!!x&&x.prio===3&&x.est===5);}
    await t.ok(a,'urgent task shows a red !',()=>[...document.querySelectorAll('#list .task')].some(r=>r.querySelector('.name').textContent==='Call the bank'&&!!r.querySelector('.urg')));
    await shot(a,'qe-urgent');
    for(const [n,lv] of [['Low one !1',1],['Mid one ! 2',2],['High one !3',3]]){await a.fill('#c-name',n);await a.keyboard.press('Enter');await sleep(200)}
    {const st=await state(a),g=n=>(st.tasks.find(y=>y.name===n)||{}).prio;t.is('!1 low, ! 2 medium, !3 high',g('Low one')===1&&g('Mid one')===2&&g('High one')===3);}
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
