// Project plus (about 20 s): sections, custom board columns, timeline, Time tab, templates (one user)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{
  const br=await chromium.launch();
  const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    await a.click('#addProject');await a.keyboard.type('Plus');await a.keyboard.press('Enter');await sleep(300);await a.keyboard.press('Escape');
    const pid=await a.evaluate(()=>[...document.querySelectorAll('[data-pgo]')].pop().dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tasks]');
    for(const n of ['Alpha','Beta']){await a.fill('#pt-name',n);await a.keyboard.press('Enter');await sleep(120)}
    // sections
    await a.click('[data-secnew]');await a.fill('#an-name','Phase 1');await a.keyboard.press('Enter');await sleep(200);
    await t.ok(a,'section header shows',()=>!!document.querySelector('.secdiv')&&document.querySelector('.secdiv').textContent.includes('Phase 1'));
    await a.hover('.secdiv');await a.click('.secdiv [data-secadd]');await sleep(150);
    await t.ok(a,'add bar says where new tasks go',()=>document.querySelector('.sec-into')&&document.querySelector('#pt-name').placeholder.includes('Phase 1'));
    await a.fill('#pt-name','Gamma');await a.keyboard.press('Enter');await sleep(200);
    let s=await state(a),pr=s.projects.find(x=>x.id===pid);
    t.is('new task lands in the section',s.tasks.find(x=>x.name==='Gamma').section===pr.sections[0].id);
    const alpha=s.tasks.find(x=>x.name==='Alpha').id;
    await a.dragAndDrop(`.task[data-id="${alpha}"] .name`,'.secdiv');await sleep(300);
    s=await state(a);t.is('dragging a row onto a section moves it',s.tasks.find(x=>x.id===alpha).section===pr.sections[0].id);
    await t.ok(a,'rows sit under their section',()=>{const k=[...document.querySelectorAll('#list > *')];const h=k.findIndex(x=>x.classList.contains('secdiv'));return k.slice(h).some(x=>x.textContent.includes('Alpha'))&&k.slice(0,h).some(x=>x.textContent.includes('Beta'))});
    await shot(a,'pl-sections');
    // board columns
    await a.click('[data-board="1"]');await sleep(200);
    await a.click('[data-coladd]');await a.fill('#an-name','Review');await a.keyboard.press('Enter');await sleep(200);
    await t.ok(a,'new column sits before Done',()=>{const c=[...document.querySelectorAll('.bcol[data-bcol] .bc-title')].map(x=>x.textContent);return c.join('|')==='To do|Doing|Review|Done'});
    const rid=await a.evaluate(()=>[...document.querySelectorAll('.bcol[data-bcol]')][2].dataset.bcol);
    await a.dragAndDrop(`[data-bid="${alpha}"]`,`[data-bcol="${rid}"]`);await sleep(300);
    s=await state(a);t.is('card dragged into the new column',s.tasks.find(x=>x.id===alpha).col===rid);
    await a.hover('[data-bcol=todo]');await a.click('[data-bcol=todo] [data-colren]');await a.fill('#an-name','Backlog');await a.keyboard.press('Enter');await sleep(200);
    await t.ok(a,'column renamed',()=>document.querySelector('[data-bcol=todo] .bc-title').textContent==='Backlog');
    await shot(a,'pl-board');
    // timeline
    await a.click('[data-board="2"]');await sleep(200);
    await t.ok(a,'timeline empty state when nothing has a date',()=>!!document.querySelector('#projBody .empty'));
    await a.evaluate(id=>{const s=window;},null);
    const today=await a.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+5);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`});
    await a.fill('#pt-name','Dated');await a.fill('#pt-due',today);await a.keyboard.press('Escape');await a.focus('#pt-name');await a.keyboard.press('Enter');await sleep(250);
    await t.ok(a,'dated task shows as a bar',()=>!!document.querySelector('.g-bar')&&document.querySelector('.g-bar').textContent.includes('Dated'));
    s=await state(a);const dated=s.tasks.find(x=>x.name==='Dated'),due0=dated.due;
    const bb=await a.locator('.g-bar').boundingBox();
    await a.mouse.move(bb.x+bb.width-3,bb.y+bb.height/2);await a.mouse.down();await a.mouse.move(bb.x+bb.width-3+28*2+4,bb.y+bb.height/2,{steps:5});await a.mouse.up();await sleep(250);
    s=await state(a);const d1=s.tasks.find(x=>x.id===dated.id).due;
    t.is('dragging the right end moves the due date by 2 days',(new Date(d1)-new Date(due0))/86400000===2);
    await shot(a,'pl-timeline');
    // time tab
    await a.evaluate(id=>{},null);
    await a.click('[data-ptab=time]');await sleep(150);
    await t.ok(a,'time tab empty state',()=>!!document.querySelector('#projBody .empty'));
    await a.evaluate(([id])=>{},[dated.id]);
    // add a past session directly in storage and reload
    await sleep(2500);
    await a.evaluate(id=>{const k='focus-todo-v1:local-user-1',s=JSON.parse(localStorage.getItem(k));const e=Date.now()-60000;s.sessions.push({id:'x1',taskId:id,start:e-3600000,end:e});localStorage.setItem(k,JSON.stringify(s));
      const db=JSON.parse(localStorage.getItem('focus-localdb'));const r=db.user_state.find(r=>r.user_id==='local-user-1'&&r.key==='sessions');if(r)r.data=s.sessions;localStorage.setItem('focus-localdb',JSON.stringify(db))},dated.id);
    await a.reload();await sleep(900);await clearToasts(a);
    if(!await a.$('.tm-hero')){await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(200);await a.click('[data-ptab=time]');await sleep(150)}
    await shot(a,'pl-reload');
    await t.ok(a,'time tab shows 1h total and the task',()=>document.querySelector('.tm-hero')&&/1h/.test(document.querySelector('.tm-hero').textContent)&&document.querySelector('.tm-list').textContent.includes('Dated'));
    await t.ok(a,'header shows the total',()=>document.querySelector('.pp-sub').textContent.includes('in total'));
    await shot(a,'pl-time');
    // templates
    await a.click('[data-ptpl]');await a.fill('#tp-name','Plus tpl');await a.keyboard.press('Enter');await sleep(200);
    s=await state(a);t.is('template saved with tasks, section and columns',s.templates.length===1&&s.templates[0].tasks.length===4&&s.templates[0].sections.length===1&&s.templates[0].cols.length===4);
    await a.click('#addProject');await sleep(150);await a.selectOption('#pj-tpl',s.templates[0].id);await a.fill('#pj-name','From tpl');await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const np=s.projects.find(x=>x.name==='From tpl'),nt=s.tasks.filter(x=>x.projectId===np.id);
    t.is('new project gets the tasks, section and columns',nt.length===4&&np.sections.length===1&&np.cols.length===4&&nt.filter(x=>x.section===np.sections[0].id).length===3&&!nt.some(x=>x.due));
    // phone
    await a.setViewportSize({width:390,height:800});await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`)&&0,pid);
    await a.click('[data-ptab=tasks]').catch(()=>{});await sleep(200);
    await t.ok(a,'no sideways scroll at 390px',noSideScroll);
    await shot(a,'pl-390');
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){console.log('  FAIL  '+e.message.split('\n')[0]);t.is('test ran to the end',false)}
  await br.close();t.done();
})();
