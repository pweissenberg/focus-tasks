// GTD helpers: waiting for, time filter, defer, weekly review (about 15 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    let s;
    // waiting for
    await a.fill('#c-name','Get contract back');await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const w=s.tasks.find(x=>x.name==='Get contract back').id;
    await a.click(`.task[data-id="${w}"] [data-act="hold"]`);await sleep(250);
    t.is('On hold asks who you are waiting for',!!await a.$('.wait-pop'));
    await a.fill('#wait-who','Ana');await a.keyboard.press('Enter');await sleep(200);
    await t.ok(a,'row says Waiting for Ana',id=>document.querySelector(`.task[data-id="${id}"] .waitc`).textContent.includes('Waiting for Ana'),w);
    // the Time pill was removed in v60 (Pedro)
    await a.fill('#c-name','Quick reply ;2');await a.keyboard.press('Enter');await sleep(200);
    t.is('there is no Time pill',!await a.$('#timeFilter'));
    // defer
    const r1=await a.evaluate(()=>document.querySelector('#list .task:not(.hold)').dataset.id);
    await a.click(`.task[data-id="${r1}"] [data-act="edit"]`,{force:true});await sleep(200);
    const fut=await a.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`});
    await a.fill('#ed-defer',fut);await a.fill('#ed-est','10');await a.click('.glow-pick .g-violet');await a.click('.modal h2');await sleep(100);
    if(!await a.$('#ed-defer')){t.is('edit window stayed open',false)}else{await a.click('.modal .btn.primary');await sleep(250)}
    s=await state(a);const d1=s.tasks.find(x=>x.id===r1);t.is('edit window saves a glow',d1.glow==='violet');
    t.is('edit window saves defer and time',!!d1.defer&&d1.est===10);
    await t.ok(a,'deferred task is hidden with a line to show it',id=>!document.querySelector(`.task[data-id="${id}"]`)&&!!document.querySelector('.defline'),r1);
    await a.click('[data-defshow]');await sleep(200);
    await t.ok(a,'Show them brings it back, glowing violet',id=>{const r=document.querySelector(`.task[data-id="${id}"]`);return !!r.querySelector('.defc')&&r.classList.contains('g-violet')},r1);
    await shot(a,'gtd-glow');
    // weekly review
    await clearToasts(a);
    t.is('review button has a dot before the first review',await a.evaluate(()=>document.querySelector('#reviewBtn').classList.contains('due')));
    await a.evaluate(()=>{const n=document.querySelector('#notes');n.value='Buy milk\n- Call bank';n.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(200);
    await a.click('#reviewBtn');await sleep(150);await a.click('[data-rvm=weekly]');await sleep(200);
    await a.click('[data-rvtasks]');await sleep(250);
    s=await state(a);t.is('inbox lines become tasks',s.tasks.some(x=>x.name==='Buy milk')&&s.tasks.some(x=>x.name==='Call bank')&&!s.notes.trim());
    await shot(a,'gtd-review0');
    for(let i=0;i<5;i++){await a.click('[data-rvnext]');await sleep(150);if(i===0)await shot(a,'gtd-review2')}
    s=await state(a);t.is('finishing records the review',!!s.prefs.lastReview);
    t.is('dot goes away',!await a.evaluate(()=>document.querySelector('#reviewBtn').classList.contains('due')));
    await a.setViewportSize({width:390,height:800});await sleep(200);await t.ok(a,'no sideways scroll at 390px',noSideScroll);await shot(a,'gtd-390');
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
