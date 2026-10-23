// Tree v74: a task node looks like a plan node ("Task" only on hover); Line / Bracket texts drag along the line (about 8 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('plan one');await a.keyboard.press('Enter');await sleep(150);
    await a.keyboard.type('task one');await a.keyboard.press('Enter');await sleep(150);await a.keyboard.type('third');await a.click('.tr-bar .cal-hint');await sleep(200);
    const pm=async()=>(await state(a)).projects.find(x=>x.id===pid);
    let P=await pm();const id=n=>P.tree.find(x=>x.name===n).id;
    await a.hover(`[data-tn="${id('task one')}"]`);await a.click(`[data-tn="${id('task one')}"] [data-trtask]`);await sleep(250);
    const look=n=>a.evaluate(i=>{const e=document.querySelector(`[data-tn="${i}"]`),s=getComputedStyle(e),c=getComputedStyle(e.querySelector('.mt-check span'));
      return [s.borderTopStyle,s.borderLeftWidth,s.borderLeftColor,s.backgroundColor,s.boxShadow,c.borderRadius,Math.round(e.getBoundingClientRect().height)].join('|')},id(n));
    await a.mouse.move(5,5);await sleep(100);
    const lp=await look('plan one'),lt=await look('task one');
    t.is('task node looks exactly like a plan node',lp===lt);
    t.is('"Task" tag hidden when not hovered',await a.evaluate(i=>getComputedStyle(document.querySelector(`[data-tn="${i}"] .tr-badge`)).display==='none',id('task one')));
    await a.hover(`[data-tn="${id('task one')}"] .tr-name`);await sleep(100);
    t.is('"Task" tag shows on hover',await a.evaluate(i=>getComputedStyle(document.querySelector(`[data-tn="${i}"] .tr-badge`)).display!=='none',id('task one')));
    await shot(a,'tree-task-hover');
    // line under plan one, drag its text left
    await a.click('[data-tmadd=h]');await sleep(150);await a.selectOption('#tm-from',id('plan one'));await a.fill('#tm-name','Before');await a.fill('#tm-name2','After');await a.click('.gd-pop .btn');await sleep(250);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());await sleep(50);
    const bx=s=>a.evaluate(q=>{const r=document.querySelector(q).getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height}},s);
    let l1=await bx('.gd-h .gd-lab:not(.below)'),lb=await bx('.gd-h .gd-lab.below');
    await a.mouse.move(l1.l+l1.w/2,l1.t+l1.h/2);await a.mouse.down();await a.mouse.move(l1.l+l1.w/2-300,l1.t+l1.h/2+20,{steps:8});await a.mouse.up();await sleep(250);
    let l2=await bx('.gd-h .gd-lab:not(.below)'),lb2=await bx('.gd-h .gd-lab.below');P=await pm();const mh=P.treeMarks.find(m=>m.type==='h');
    t.is('line text above moved left along the line (same height)',l2.l<l1.l-250&&Math.abs(l2.t-l1.t)<2&&mh.lx!=null);
    t.is('text below stayed put',Math.abs(lb2.l-lb.l)<2);
    t.is('not focused after the drag',await a.evaluate(()=>!document.activeElement.classList.contains('gd-in')));
    // a click still edits
    await a.click('.gd-h .gd-lab:not(.below) .gd-in');t.is('click on the text still edits it',await a.evaluate(()=>document.activeElement.classList.contains('gd-in')));
    await a.evaluate(()=>document.activeElement.blur());
    // bracket plan one..third, drag text down
    await a.click('[data-tmadd=v]');await sleep(150);await a.selectOption('#tm-from',id('plan one'));await a.selectOption('#tm-to',id('third'));await a.fill('#tm-name','Phase');await a.click('.gd-pop .btn');await sleep(250);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());await sleep(50);
    const v=await bx('.gd-v');let b1=await bx('.gd-v .gd-lab');
    await a.mouse.move(b1.l+b1.w/2,b1.t+b1.h/2);await a.mouse.down();await a.mouse.move(b1.l+b1.w/2+30,v.t+v.h+200,{steps:8});await a.mouse.up();await sleep(250);
    let b2=await bx('.gd-v .gd-lab');P=await pm();const mv=P.treeMarks.find(m=>m.type==='v');
    t.is('bracket text moved down to the bottom end, same x',mv.ly===1&&Math.abs(b2.t+b2.h/2-(v.t+v.h))<3&&Math.abs(b2.l-b1.l)<2);
    // it stays after a re-render
    await a.click('[data-ptab=notes]').catch(()=>{});await sleep(150);await a.click('[data-ptab=tree]');await sleep(250);
    const b3=await bx('.gd-v .gd-lab'),l3=await bx('.gd-h .gd-lab:not(.below)');
    t.is('positions kept after reopening the tab',Math.abs(b3.t-b2.t)<3&&Math.abs(l3.l-l2.l)<3);
    await shot(a,'tree-guide-text');
    t.is('no page errors',errs.length===0,errs.join(' | '));
  }catch(e){t.fail('crashed: '+e.message)}
  await br.close();t.done();
})();
