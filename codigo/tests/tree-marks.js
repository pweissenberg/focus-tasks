// Tree tab dashed guides linked to nodes: line under a node, bracket, box, follow fold / Show done, drag to snap, delete (about 12 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=tree]');await sleep(150);
    await a.click('[data-trroot]');await sleep(150);await a.keyboard.type('planeja');await a.keyboard.press('Tab');await sleep(150);
    await a.keyboard.type('bla bla');await a.keyboard.press('Tab');await sleep(150);await a.keyboard.type('aa');await a.click('.tr-bar .cal-hint');await sleep(200);
    const pm=async()=>(await state(a)).projects.find(x=>x.id===pid);
    let P=await pm();const id=n=>P.tree.find(x=>x.name===n).id;
    await a.hover(`[data-tn="${id('planeja')}"]`);await a.click(`[data-tn="${id('planeja')}"] [data-tradd]`);await sleep(150);await a.keyboard.type('aaa');await a.click('.tr-bar .cal-hint');await sleep(200);
    P=await pm();
    const box=sel=>a.evaluate(s=>{const e=document.querySelector(s);if(!e||e.hidden)return null;const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right}},sel);
    const node=n=>box(`[data-tn="${id(n)}"]`);
    // bracket planeja..aa
    await a.click('[data-tmadd=v]');await sleep(150);
    await a.selectOption('#tm-from',id('planeja'));await a.selectOption('#tm-to',id('aa'));await a.fill('#tm-name','Phase 1');
    t.is('add window: fields line up and stay inside it',await a.evaluate(()=>{const p=document.querySelector('.pop').getBoundingClientRect(),f=[...document.querySelectorAll('.gd-pop select,.gd-pop input,.gd-pop .btn')].map(e=>e.getBoundingClientRect());
      return f.every(r=>r.left>=p.left&&r.right<=p.right)&&new Set(f.slice(0,3).map(r=>Math.round(r.left))).size===1}));
    await shot(a,'tree-marks-pop');await a.click('.gd-pop .btn');await sleep(250);
    let v=await box('.gd-v'),n1=await node('planeja'),n3=await node('aa');
    t.is('bracket runs from planeja to aa, right of the nodes',!!v&&Math.abs(v.t-n1.t)<6&&Math.abs(v.b-n3.b)<6&&v.l>n3.r);
    const stubs=()=>a.evaluate(()=>[...document.querySelectorAll('.gd-v .gd-stub')].map(x=>{const r=x.getBoundingClientRect();return {l:r.left,w:r.width}}));
    let sb=await stubs();
    t.is('bracket dashes reach their own node at the top and bottom',Math.abs(sb[0].l-n1.r)<8&&Math.abs(sb[1].l-n3.r)<8&&sb[0].w!==sb[1].w);
    t.is('tree does not scroll sideways',await a.evaluate(()=>{const c=document.querySelector('.tr-canvas');return c.scrollWidth<=c.clientWidth}));
    // shorten the longer dash: it snaps to the same length as the top one
    await a.click('.gd-v .gd-hit',{position:{x:6,y:20}});await sleep(100);
    const longTop=sb[0].w>sb[1].w,hb=await box(`.gd-v .gd-stub.${longTop?'top':'bot'} .gd-sh`),diff=Math.abs(sb[0].w-sb[1].w);
    await a.mouse.move(hb.l+6,hb.t+6);await a.mouse.down();await a.mouse.move(hb.l+6+diff-4,hb.t+6,{steps:5});await a.mouse.up();await sleep(250);
    sb=await stubs();P=await pm();t.is('dragging a dash shorter snaps it equal to the other',Math.abs(sb[0].w-sb[1].w)<1&&P.treeMarks[0][longTop?'stubT':'stubB']!=null);
    // line under aa
    await a.click('[data-tmadd=h]');await sleep(150);await a.selectOption('#tm-from',id('aa'));await a.fill('#tm-name','Before Jan.');await a.fill('#tm-name2','After Jan.');await a.click('.gd-pop .btn');await sleep(250);
    let h=await box('.gd-h'),n4=await node('aaa');
    t.is('line has text above and below',(await pm()).treeMarks.some(m=>m.label==='Before Jan.'&&m.label2==='After Jan.'));
    const lb=await box('.gd-h .gd-lab.below');t.is('text below sits under the line',!!lb&&lb.t>=h.t);
    t.is('line sits between aa and aaa',!!h&&h.t>n3.b-2&&h.t<n4.t+2);
    // box around bla bla..aa
    await a.click('[data-tmadd=box]');await sleep(150);await a.selectOption('#tm-from',id('bla bla'));await a.selectOption('#tm-to',id('aa'));await a.click('.gd-pop .btn');await sleep(250);
    let bx=await box('.gd-box'),n2=await node('bla bla');
    t.is('box wraps bla bla and aa',!!bx&&bx.t<n2.t&&bx.b>n3.b&&bx.l<n3.l&&bx.r>n3.r);
    await clearToasts(a);await a.click('.tr-bar .cal-hint');await sleep(100);
    await shot(a,'tree-marks');
    // fold bla bla: guides follow
    await a.click(`[data-tn="${id('bla bla')}"] [data-trfold]`);await sleep(250);
    v=await box('.gd-v');h=await box('.gd-h');n2=await node('bla bla');n4=await node('aaa');
    t.is('folded: bracket ends at bla bla, line moves under it',Math.abs(v.b-n2.b)<6&&h.t>n2.b-2&&h.t<n4.t+2);
    await a.click(`[data-tn="${id('bla bla')}"] [data-trfold]`);await sleep(250);
    // done tasks stay in the tree (v66) until "Off tree"
    await a.hover(`[data-tn="${id('aa')}"]`);await a.click(`[data-tn="${id('aa')}"] [data-trtask]`);await sleep(200);await clearToasts(a);
    await a.click(`[data-tn="${id('aa')}"] .mt-check`);await sleep(300);await clearToasts(a);
    n3=await node('aa');v=await box('.gd-v');
    t.is('done task stays in the tree and the bracket keeps it',!!n3&&Math.abs(v.b-n3.b)<6&&!await a.$('[data-trdone]'));
    // drag the bracket sideways, away from the nodes and back closer
    v=await box('.gd-v');await a.mouse.move(v.r,v.t+(v.b-v.t)*.75);await a.mouse.down();await a.mouse.move(v.r+80,v.t+(v.b-v.t)*.75,{steps:5});await a.mouse.up();await sleep(250);
    let v2=await box('.gd-v');P=await pm();t.is('bracket drags sideways and keeps it',Math.abs(v2.l-v.l-80)<3&&P.treeMarks.find(m=>m.type==='v').dx===80);
    await a.mouse.move(v2.r,v2.t+(v2.b-v2.t)*.75);await a.mouse.down();await a.mouse.move(v2.r-400,v2.t+(v2.b-v2.t)*.75,{steps:5});await a.mouse.up();await sleep(250);
    v2=await box('.gd-v');n3=await node('aa');t.is('bracket can come close to its nodes but not over them',v2.l>=n3.r&&v2.l<n3.r+14);
    t.is('tree has no scroll box of its own',await a.evaluate(()=>{const c=document.querySelector('.tr-canvas');return c.scrollHeight<=c.clientHeight+1&&getComputedStyle(c).overflowY!=='auto'}));
    // drag the line down to aaa
    h=await box('.gd-h');n4=await node('aaa');
    await a.mouse.move(h.l+300,h.t+1);await a.mouse.down();await a.mouse.move(h.l+300,n4.b+2,{steps:6});await a.mouse.up();await sleep(250);
    P=await pm();t.is('dragging the line snaps it under aaa',P.treeMarks.find(m=>m.type==='h').from===id('aaa'));
    // delete
    await a.click('.gd-box .gd-edge >> nth=0');await sleep(100);await a.click('.gd-box [data-tmdel]');await sleep(200);
    P=await pm();t.is('× deletes the box',P.treeMarks.length===2&&!P.treeMarks.some(m=>m.type==='box'));
    await a.evaluate(()=>{document.documentElement.dataset.theme='dark'});await clearToasts(a);await sleep(100);await shot(a,'tree-marks-dark');
    await a.setViewportSize({width:390,height:800});await sleep(250);
    await t.ok(a,'phone: no sideways page scroll',noSideScroll);await shot(a,'tree-marks-390');
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){console.log(e.message.split('\n').slice(0,6).join('\n'));t.is('ran without crashing',false)}
  await br.close();t.done();
})();
