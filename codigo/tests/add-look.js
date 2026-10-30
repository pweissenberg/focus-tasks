// v96 (261): Glow / Background / Pattern buttons in the add bar Advanced settings
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
 try{for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){const {p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px`);
  await p.click('#composer .cgear');await sleep(150);
  await t.ok(p,'three look buttons side by side',()=>{const b=[...document.querySelectorAll('#c-advp [data-lk]')];return b.length===3&&b.every(x=>Math.abs(x.getBoundingClientRect().top-b[0].getBoundingClientRect().top)<2)});
  await p.click('#c-advp [data-lk=glow]');await sleep(120);
  await t.ok(p,'glow options open',()=>!!document.querySelector('#c-advp .lk-pop .glow-pick'));
  await shot(p,`look-${w}`);
  await p.click('#c-advp .lk-pop .gsw.g-blue');await sleep(120);
  await t.ok(p,'pick closes and button shows blue',()=>!document.querySelector('#c-advp .lk-pop')&&!!document.querySelector('#c-advp [data-lk=glow] .g-blue'));
  await p.click('#c-advp [data-lk=bg]');await sleep(120);
  await p.click('#c-advp .lk-pop .sw:not(.auto)');await sleep(120);
  await p.click('#c-advp [data-lk=pat]');await sleep(120);
  await t.ok(p,'pattern options open',()=>!!document.querySelector('#c-advp .lk-pop .pat-pick'));
  await p.click('#c-advp .lk-pop .psw.bgp-dots');await sleep(120);
  await t.ok(p,'gear shows set',()=>document.querySelector('#composer .cgear').classList.contains('set'));
  await t.ok(p,'no sideways scroll',()=>document.documentElement.scrollWidth<=innerWidth);
  await p.fill('#c-name','Styled task');await p.keyboard.press('Enter');await sleep(250);
  let s=await state(p),x=s.tasks.find(k=>k.name==='Styled task');
  t.is('task saved with glow, bg, pattern',!!x&&x.glow==='blue'&&!!x.bg&&x.bgPat==='dots');
  await t.ok(p,'look reset after adding',()=>!!document.querySelector('#c-advp [data-lk=glow] .gsw.none'));
  await p.fill('#c-name','Plain task');await p.keyboard.press('Enter');await sleep(250);
  s=await state(p);x=s.tasks.find(k=>k.name==='Plain task');t.is('next task is plain',!x.glow&&!x.bg&&!x.bgPat);
  t.is('no page errors '+errs.join(';'),errs.length===0);await p.close()}
 }finally{await br.close()}t.done()})();
