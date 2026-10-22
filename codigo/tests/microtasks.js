// Microtasks on a task and "Send to long term" (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    await a.fill('#c-name','Pack bag');await a.keyboard.press('Enter');await sleep(300);
    let s=await state(a);const id=s.tasks.find(x=>x.name==='Pack bag').id,R=`.task[data-id="${id}"]`;
    await a.hover(R);await a.click(`${R} [data-mtadd]`);await sleep(150);
    await a.keyboard.type('aaa');await a.keyboard.press('Enter');await sleep(150);await a.keyboard.type('bbb');await a.keyboard.press('Enter');await sleep(150);await a.keyboard.press('Escape');await sleep(150);
    s=await state(a);let tk=s.tasks.find(x=>x.id===id);
    t.is('two microtasks saved, the empty third one dropped',tk.micro.length===2&&tk.micro[0].name==='aaa'&&tk.micro[1].name==='bbb');
    await a.click(`[data-mtfor="${id}"] [data-mt="${tk.micro[0].id}"] .mt-check input`);await sleep(200);
    s=await state(a);tk=s.tasks.find(x=>x.id===id);
    t.is('ticking a microtask keeps the task open and adds nothing to Done',tk.micro[0].done&&!tk.done&&s.tasks.filter(x=>x.done).length===s.tasks.filter(x=>x.done&&x.id!==id).length&&!s.tasks.some(x=>x.name==='aaa'));
    await a.fill(`[data-mtfor="${id}"] [data-mt="${tk.micro[1].id}"] .mt-name`,'bbb renamed');await a.keyboard.press('Tab');await sleep(200);
    s=await state(a);t.is('only the name can be edited, and it saves',s.tasks.find(x=>x.id===id).micro[1].name==='bbb renamed');
    await t.ok(a,'the list hangs right under its task',i=>{const r=document.querySelector(`.task[data-id="${i}"]`);return r.nextElementSibling&&r.nextElementSibling.dataset.mtfor===i},id);
    await shot(a,'mt-list',{clip:await (async()=>{const b=await a.locator(R).boundingBox(),c=await a.locator(`[data-mtfor="${id}"]`).boundingBox();return {x:b.x-14,y:b.y-14,width:b.width+28,height:c.y+c.height-b.y+28}})()});
    await a.click(`${R} [data-mtfold]`);await sleep(200);
    await t.ok(a,'the arrow folds them',i=>{const w=document.querySelector(`[data-mtfor="${i}"]`);return w.classList.contains('closed')&&w.textContent.includes('2 microtasks')},id);
    await shot(a,'mt-folded',{clip:await (async()=>{const b=await a.locator(R).boundingBox();return {x:b.x-14,y:b.y-14,width:b.width+28,height:b.height+60}})()});
    await a.click(`${R} [data-mtfold]`);await sleep(200);
    await shot(a,'mt-list0',{clip:await (async()=>{const b=await a.locator(R).boundingBox();return {x:b.x-14,y:b.y-14,width:b.width+28,height:b.height+28}})()});
    await a.click(`${R} .check input`);await sleep(600);await a.keyboard.press('Escape');await sleep(200);
    s=await state(a);tk=s.tasks.find(x=>x.id===id);
    t.is('ticking the task sends it to Done with its microtasks',tk.done&&tk.micro.length===2);
    await a.click('[data-view=done] >> nth=0');await sleep(300);
    await t.ok(a,'Done shows the microtasks, read only',i=>{const r=document.querySelector(`[data-mtfor="${i}"]`);return r&&r.querySelectorAll('.mt').length===2&&r.querySelector('.mt-name').readOnly},id);
    // send to long term
    await a.click('[data-view=tasks] >> nth=0');await sleep(200);
    await a.fill('#c-name','Someday thing');await a.keyboard.press('Enter');await sleep(300);
    s=await state(a);const id2=s.tasks.find(x=>x.name==='Someday thing').id;
    await a.hover(`.task[data-id="${id2}"]`);await a.click(`.task[data-id="${id2}"] [data-ltsend]`);await sleep(250);
    s=await state(a);t.is('Send to long term moves it',s.tasks.find(x=>x.id===id2).longTerm===true);
    await t.ok(a,'and it leaves the Tasks list',i=>!document.querySelector(`.task[data-id="${i}"]`),id2);
    await a.setViewportSize({width:390,height:800});await sleep(200);await t.ok(a,'no sideways scroll at 390px',noSideScroll);
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
