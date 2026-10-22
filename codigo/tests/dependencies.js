// Task dependencies: Waits for, Blocked by, hide blocked, no cycles, Board lock, Timeline arrows, ready-to-start alert (about 15 s):  node tests/dependencies.js
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
const rowSel=n=>`#list .task:has(> .body .name:text-is("${n}"))`;
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1440,h:900,demo:true});
  try{await sleep(400);
    let s=await state(a);const A=s.tasks.find(x=>x.name==='Run the survey analysis'),B=s.tasks.find(x=>x.name==='Write the survey report'),C=s.tasks.find(x=>x.name==='Present the survey results');
    t.is('the examples are there: report waits for analysis, results wait for report',!!A&&!!B&&!!C&&B.waits[0]===A.id&&C.waits[0]===B.id);
    t.is('blocked tasks are hidden by default',!await a.$('#list .task.blocked')&&!!await a.$(rowSel('Run the survey analysis')));
    t.is('a small lock sits right after On hold',await a.evaluate(()=>{const l=document.querySelector('#blockToggle');return !!l&&!l.hidden&&l.previousElementSibling.id==='holdToggle'}));
    await a.click('#blockToggle');await sleep(250);
    t.is('pressing the lock shows them',!!await a.$('#list .task.blocked')&&await a.evaluate(()=>document.querySelector('#blockToggle').classList.contains('on')));
    t.is('the report row says Blocked by the analysis',await a.evaluate(()=>{const r=[...document.querySelectorAll('#list .task')].find(x=>x.querySelector('.name').textContent==='Write the survey report');return !!r&&r.classList.contains('blocked')&&r.querySelector('.dep-tag').textContent.includes('Run the survey analysis')}));
    t.is('blocked tasks come after the free ones',await a.evaluate(()=>{const n=[...document.querySelectorAll('#list > .task')];const i=n.findIndex(x=>x.classList.contains('blocked'));return i>=0&&n.slice(i).every(x=>x.classList.contains('blocked'))}));
    await (await a.$(rowSel('Write the survey report'))).screenshot({path:'/tmp/focus-shots/deps-row.png'});
    await (await a.$('.tagrow')).screenshot({path:'/tmp/focus-shots/deps-lock.png'});
    // add bar: Advanced settings > Block task until ... is done
    await a.click('#c-adv');await sleep(200);
    t.is('Advanced settings has Block task until … is done',await a.evaluate(()=>{const f=document.querySelector('.dep-afld');return !!f&&f.textContent.includes('Block task until')&&f.textContent.includes('is done')&&!!f.querySelector('#c-block')}));
    await a.selectOption('#c-block',A.id);await sleep(100);await shot(a,'deps-adv');
    await a.fill('#c-name','Email the survey team');await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const E=s.tasks.find(x=>x.name==='Email the survey team');
    t.is('the new task waits for the picked task',!!E&&E.waits.join()===A.id&&!!await a.$(`${rowSel('Email the survey team')}.blocked`));
    // no cycles: the analysis cannot wait for the report or the results
    await a.hover(rowSel('Run the survey analysis'));await a.click(`${rowSel('Run the survey analysis')} [data-act=edit]`);await sleep(300);
    t.is('the edit window has WAITS FOR without the tasks that wait for this one',await a.evaluate(([b,c])=>{const s=document.querySelector('#ed-waits');return !!s&&s.options.length>1&&![...s.options].some(o=>o.value===b||o.value===c)},[B.id,C.id]));
    await a.keyboard.press('Escape');await sleep(200);
    // add a second wait on the results from the edit window, then remove it
    await a.hover(rowSel('Present the survey results'));await a.click(`${rowSel('Present the survey results')} [data-act=edit]`);await sleep(300);
    t.is('its chip shows the report',await a.evaluate(()=>document.querySelector('.dep-chips').textContent.includes('Write the survey report')));
    const other=await a.evaluate(()=>document.querySelector('#ed-waits').options[1].value);
    await a.selectOption('#ed-waits',other);await sleep(150);
    t.is('picking a task adds a chip',await a.evaluate(()=>document.querySelectorAll('.dep-chip').length===2));
    await shot(a,'deps-edit');
    await a.click('.modal .btn.primary');await sleep(300);
    s=await state(a);t.is('saving keeps both waits',s.tasks.find(x=>x.id===C.id).waits.length===2);
    await a.hover(rowSel('Present the survey results'));await a.click(`${rowSel('Present the survey results')} [data-act=edit]`);await sleep(300);
    await a.click(`[data-depx="${other}"]`);await a.click('.modal .btn.primary');await sleep(300);
    s=await state(a);t.is('× removes one',s.tasks.find(x=>x.id===C.id).waits.join()===B.id);
    // project page: Board lock and Timeline arrows
    await a.evaluate(i=>{document.querySelector(`[data-pgo="${i}"]`).click()},A.projectId);await sleep(300);
    await a.evaluate(()=>{const b=document.querySelector('[data-board="1"]');b&&b.click()});await sleep(300);
    t.is('Board: blocked cards have a lock',await a.evaluate(i=>{const c=document.querySelector(`.bcard[data-bid="${i}"]`);return !!c&&!!c.querySelector('.dep-lock')},B.id));
    await a.evaluate(()=>{const b=document.querySelector('[data-board="2"]');b&&b.click()});await sleep(400);
    t.is('Timeline: two arrows link the three tasks',await a.evaluate(()=>document.querySelectorAll('.g-deps > path').length===2));
    await a.evaluate(()=>{const s=document.querySelector('.g-scroll');s.scrollLeft=s.scrollWidth});await sleep(150);await shot(a,'deps-timeline');
    await a.evaluate(()=>{const b=document.querySelector('[data-board="0"]');b&&b.click()});await sleep(200);
    await a.evaluate(()=>document.querySelector('[data-view=tasks]').click());await sleep(300);
    // finishing the analysis frees the report and raises an alert
    await clearToasts(a);
    await a.click(`${rowSel('Run the survey analysis')} [data-act=done]`);await sleep(1200);
    s=await state(a);
    t.is('an alert says the report is ready to start',(s.alerts||[]).some(x=>x.text.includes('"Write the survey report" is ready to start')));
    t.is('the added task is free too',(s.alerts||[]).some(x=>x.text.includes('"Email the survey team" is ready')));
    t.is('the report is no longer blocked, the results still are',await a.evaluate(()=>{const f=n=>[...document.querySelectorAll('#list .task')].find(x=>x.querySelector('.name').textContent===n);const r=f('Write the survey report'),p=f('Present the survey results');return !!r&&!r.classList.contains('blocked')&&!!p&&p.classList.contains('blocked')}));
    t.is('only one alert for it',(s.alerts||[]).filter(x=>x.text.includes('Write the survey report')).length===1);
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
