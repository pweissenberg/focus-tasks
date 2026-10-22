// v72 (239): no built-in examples, default tag per project, History title fits, folded On hold rows, wide layout
const {chromium}=require('playwright');
const {open,newPage,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
  try{
    const {ctx,p,errs}=await open(br,{w:1440,h:900,init:()=>{window.FOCUS_HOLD_OPEN=false}});
    await t.ok(p,'on hold rows are folded to name + reason',()=>{const r=[...document.querySelectorAll('#list .task.hold-min')];return r.length>=2&&r.some(x=>/waiting on Leo\/Sara/.test(x.querySelector('.hreason').textContent))&&getComputedStyle(r[0].querySelector('.meta')).display==='none'});
    await shot(p,'lt-hold');
    await p.locator('#list .task.hold-min [data-holdexp]').first().click();await sleep(200);
    await t.ok(p,'the arrow expands it to the normal row',()=>{const b=document.querySelector('#list .task.hold [data-holdexp][aria-expanded="true"]');return !!b&&!b.closest('.task').classList.contains('hold-min')&&getComputedStyle(b.closest('.task').querySelector('.meta')).display!=='none'});
    await t.ok(p,'project list is wide and has no color dots',()=>{const s=document.querySelector('.side').getBoundingClientRect();const d=document.querySelector('.pitem .pdot');return s.width>=230&&(!d||getComputedStyle(d).display==='none')});
    await t.ok(p,'columns go out to the sides',()=>document.querySelector('.side').getBoundingClientRect().left<30&&innerWidth-document.querySelector('#rail').getBoundingClientRect().right<30);
    // default tag
    await p.evaluate(()=>{const b=document.querySelector('.pitem[data-proj="p_research"] [data-pedit]');b.click()});await sleep(200);
    await p.selectOption('#pj-tag','t_econs');await p.click('.pop .btn.primary');await sleep(200);
    t.is('project keeps its default tag',(await state(p)).projects.find(x=>x.id==='p_research').tagId==='t_econs');
    await p.selectOption('#c-proj','p_research');await sleep(100);
    await t.ok(p,'picking the project in the add bar picks its tag',()=>document.querySelector('#c-tag').value==='t_econs');
    await p.fill('#c-name','Default tag task');await p.keyboard.press('Enter');await sleep(200);
    t.is('new project task gets the default tag',(await state(p)).tasks.find(x=>x.name==='Default tag task').tagId==='t_econs');
    // history title
    const long='A very long task name that would not fit in the history box at the normal font size';
    await p.fill('#c-name',long);await p.keyboard.press('Enter');await sleep(200);
    const r=p.locator('#list .task',{has:p.locator('.name',{hasText:long})}).first();await r.hover();await r.locator('[data-act=log]').click();await sleep(200);
    await t.ok(p,'history line and title stay inside the box',()=>{const pp=document.querySelector('.pop').getBoundingClientRect(),h=document.querySelector('.log-pop .bell-h').getBoundingClientRect(),s=document.querySelector('.log-pop .bell-h span');return h.right<=pp.right+0.5&&s.scrollWidth<=s.clientWidth+1&&s.getBoundingClientRect().right<=pp.right&&parseFloat(s.style.fontSize)<12.5});
    await shot(p,'lt-history');
    await clearToasts(p);await sleep(1500);
    // examples saved before v72 are removed once; the rest is kept
    await ctx.addInitScript(()=>{window.FOCUS_SEED=false});
    const {p:q,errs:e2}=await newPage(ctx);await sleep(500);
    const st=await state(q);
    t.is('old examples are removed, my tasks kept',!st.tasks.some(x=>x.name==='Tanzania'||x.name==='Econs - Peru')&&st.tasks.some(x=>x.name==='Default tag task')&&st.projects.some(x=>x.id==='p_research')&&!st.projects.some(x=>x.id==='p_personal'));
    await ctx.close();
    const {ctx:c2,p:f}=await open(br,{w:390,h:844,dark:true,init:()=>{window.FOCUS_SEED=false}});
    t.is('a fresh start is empty',(await state(f)).tasks.length===0&&(await state(f)).projects.length===0);
    await t.ok(f,'no sideways scroll at 390px',noSideScroll);
    await c2.close();
    t.is('no page errors',errs.length+e2.length===0);if(errs.length+e2.length)console.log(errs,e2);
  }catch(e){console.log('  FAIL  crashed: '+e.message);t.is('crash',false)}
  t.done();await br.close()})();
