// Tree v77: vertical bracket names, box name along its edges, side by side / top down views, vertical line (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('Root');await a.keyboard.press('Tab');await sleep(150);
    await a.keyboard.type('Child A');await a.keyboard.press('Enter');await sleep(150);await a.keyboard.type('Child B');await a.keyboard.press('Enter');await sleep(150);
    await a.keyboard.type('Child C');await a.click('.tr-bar .cal-hint');await sleep(200);
    const pm=async()=>(await state(a)).projects.find(x=>x.id===pid);
    let P=await pm();const id=n=>P.tree.find(x=>x.name===n).id;
    const bx=s=>a.evaluate(q=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom}},s);
    const nb=n=>bx(`[data-tn="${id(n)}"]`);
    // bracket A..C, turn its name vertical
    await a.click('[data-tmadd=v]');await sleep(150);await a.selectOption('#tm-from',id('Child A'));await a.selectOption('#tm-to',id('Child C'));await a.fill('#tm-name','Phase one');await a.click('.gd-pop .btn');await sleep(250);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());
    t.is('turn button shows on the selected bracket',!!(await bx('.gd-v [data-tmrot]'))&&(await bx('.gd-v [data-tmrot]')).w>0);
    const h1=await bx('.gd-v .gd-lab');await a.click('.gd-v [data-tmrot]');await sleep(250);
    const h2=await bx('.gd-v .gd-lab');P=await pm();
    t.is('bracket name is vertical (taller than wide) and saved',h2.h>h2.w&&h1.w>h1.h&&P.treeMarks[0].vert===true);
    await shot(a,'tree-vert-bracket');
    // box around A..B, drag its name to the top edge, to the right
    await a.click('[data-tmadd=box]');await sleep(150);await a.selectOption('#tm-from',id('Child A'));await a.selectOption('#tm-to',id('Child B'));await a.fill('#tm-name','Box');await a.click('.gd-pop .btn');await sleep(250);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());await sleep(50);
    const B=await bx('.gd-box'),bl=await bx('.gd-box .gd-lab');
    await a.mouse.move(bl.l+bl.w/2,bl.t+bl.h/2);await a.mouse.down();await a.mouse.move(bl.l+bl.w/2+120,B.t-2,{steps:8});await a.mouse.up();await sleep(250);
    const bl2=await bx('.gd-box .gd-lab');P=await pm();const mb=P.treeMarks.find(m=>m.type==='box');
    t.is('box name moved to the top edge and to the right',mb.bedge==='top'&&mb.bx>100&&Math.abs(bl2.t+bl2.h/2-B.t)<6&&bl2.l>bl.l+100);
    // Line made in Top down: standing between Child A and Child B; the same Line lies down in List
    await a.click('[data-trview=org]');await sleep(300);
    t.is('one Line button, standing symbol in Top down',await a.evaluate(()=>document.querySelector('[data-tmadd=h]').textContent.includes('┆')&&!document.querySelector('[data-vladd]')));
    await a.click('[data-tmadd=h]');await sleep(150);await a.selectOption('#tm-from',id('Child A'));await a.fill('#tm-name','Q1');await a.click('.gd-pop .btn');await sleep(300);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());await sleep(50);
    let V=await bx('.gd-h'),A=await nb('Child A'),Bn=await nb('Child B');
    t.is('Line stands between Child A and Child B',V.w<6&&V.l>A.r&&V.l<Bn.l&&V.h>A.h);
    await a.click('.gd-h .gd-hit');await sleep(100);
    const bot=await bx('.gd-h .gd-hvlen');await a.mouse.move(bot.l+bot.w/2,bot.t+bot.h/2);await a.mouse.down();await a.mouse.move(bot.l+bot.w/2,bot.t+bot.h/2+60,{steps:6});await a.mouse.up();await sleep(250);
    P=await pm();let ml=P.treeMarks.find(m=>m.type==='h');t.is('dragging its end makes it longer',ml.hlen>=V.h+50&&Math.abs((await bx('.gd-h')).h-ml.hlen)<4);
    await shot(a,'tree-org-line');
    await a.click('[data-trview=list]');await sleep(300);
    V=await bx('.gd-h');t.is('the same Line lies down in List',V.h<6&&V.w>200);
    t.is('List Line button',await a.evaluate(()=>document.querySelector('[data-tmadd=h]').textContent.includes('┄')));
    // views: Side by side is gone
    t.is('List has the Line button',await a.evaluate(()=>document.querySelector('[data-tmadd=h]').textContent.includes('Line')));
    t.is('only List and Top down',await a.evaluate(()=>[...document.querySelectorAll('[data-trview]')].map(b=>b.dataset.trview).join()==='list,org'));
    // a line under Child A, and Child A gets two nodes under it so the children are uneven
    await a.click('[data-tmadd=h]');await sleep(150);await a.selectOption('#tm-from',id('Child A'));await a.fill('#tm-name','Before');await a.click('.gd-pop .btn');await sleep(250);
    await a.evaluate(()=>document.activeElement&&document.activeElement.blur());
    await a.evaluate(()=>{const p=document.querySelector('.tr-canvas');});
    await a.click(`[data-tn="${id('Child C')}"] .tr-name`);await a.keyboard.press('Tab');await sleep(150);await a.keyboard.type('Deep one');await a.keyboard.press('Enter');await sleep(150);await a.keyboard.type('Deep two with a long name');await a.click('.tr-bar .cal-hint');await sleep(250);
    P=await pm();
    await a.click('[data-trview=org]');await sleep(400);
    r=await nb('Root');ca=await nb('Child A');cb=await nb('Child B');const cc=await nb('Child C'),d1=await nb('Deep one'),d2=await nb('Deep two with a long name');
    t.is('top down: children below the parent, side by side',ca.t>r.b+15&&Math.abs(ca.t-cb.t)<2&&cb.l>ca.r&&cc.l>cb.r);
    t.is('top down: parent centered over its first and last child',Math.abs((r.l+r.r)/2-((ca.l+ca.r)/2+(cc.l+cc.r)/2)/2)<3);
    t.is('top down: Child C centered over its own children',Math.abs((cc.l+cc.r)/2-((d1.l+d1.r)/2+(d2.l+d2.r)/2)/2)<3);
    const ob=await bx('.gd-box');t.is('box follows its nodes',ob.l<=ca.l&&ob.r>=cb.r&&ob.t<=ca.t&&ob.r<cc.l);
    const vb=await bx('.gd-v');t.is('bracket A..C turned: runs under A to C',vb.h<6&&Math.abs(vb.l-ca.l)<3&&Math.abs(vb.r-cc.r)<3&&vb.t>Math.max(ca.b,d2.b));
    const hl=await bx('.gd-h');t.is('line under A became a divider between A and B',hl.w<6&&hl.l>ca.r&&hl.l<cb.l);
    await a.click('[data-tmadd=v]');await sleep(150);await a.selectOption('#tm-from',id('Child C'));await a.selectOption('#tm-to',id('Deep one'));await a.fill('#tm-name','Up');await a.click('.gd-pop .btn');await sleep(300);
    const up=await bx('.gd-v:not(.gd-tv)'),dn=await nb('Deep one'),c2=await nb('Child C');
    t.is('bracket from a node to the one under it stays upright and ends at that node',!!up&&up.h>40&&Math.abs(up.t-c2.t)<5&&Math.abs(up.b-dn.b)<5);
    await shot(a,'tree-org');
    const St=await state(a);t.is('view saved per project',(St.ui.trView||{})[pid]==='org');
    await a.click('[data-ptab=notes]').catch(()=>{});await sleep(150);await a.click('[data-ptab=tree]');await sleep(250);
    t.is('view kept after reopening the tab',await a.evaluate(()=>document.querySelector('.tr-canvas').classList.contains('tr-org')));
    await a.click('[data-trview=list]');await sleep(250);
    ca=await nb('Child A');cb=await nb('Child B');t.is('back to list',Math.abs(ca.l-cb.l)<2&&cb.t>ca.b);
    t.is('no page errors',errs.length===0,errs.join(' | '));
  }catch(e){t.is('crashed: '+e.message,false)}
  await br.close();t.done();
})();
