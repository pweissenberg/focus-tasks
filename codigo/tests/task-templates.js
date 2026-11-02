// v100 (263): task templates (star on the row) + frameless look swatches in the add bar
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
 try{for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){const {p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px`);
  await p.click('#composer .cgear');await sleep(150);
  await t.ok(p,'look buttons have no frame',()=>{const b=document.querySelector('#c-advp [data-lk=glow]'),cs=getComputedStyle(b);return cs.borderTopWidth==='0px'&&cs.backgroundColor==='rgba(0, 0, 0, 0)'});
  await shot(p,`tt-look-${w}`);
  await p.click('#composer .cgear');await sleep(100);
  // make a task with color, glow, microtasks and note
  const id=await p.evaluate(()=>{const S=window.__S||null;return null});
  await p.fill('#c-name','Weekly report');await p.keyboard.press('Enter');await sleep(250);
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('focus-todo-v1:'))));return 0});
  // edit via the app's own state through the edit hooks is hard; set fields with the row tools instead
  const row=p.locator('.task',{hasText:'Weekly report'}).first();
  await row.hover();await t.ok(p,'star sits before the pencil',()=>{const r=[...document.querySelectorAll('.task')].find(x=>x.textContent.includes('Weekly report'));const s=r.querySelector('.tstar'),pe=r.querySelector('.pencil[data-act=edit]');return !!s&&s.nextElementSibling===pe});
  await row.locator('.tstar').click();await sleep(150);
  await t.ok(p,'save window opens with fields',()=>document.querySelectorAll('.tt-pop [data-ttk]').length===9);
  await shot(p,`tt-pop-${w}`);
  await p.fill('#tt-name','Report');
  // only tag/color available on a plain task maybe; check anything enabled
  const enabled=await p.evaluate(()=>[...document.querySelectorAll('.tt-pop [data-ttk]:not(:disabled)')].map(x=>x.dataset.ttk));
  t.is('empty fields disabled ('+enabled+')',!enabled.includes('micro')&&!enabled.includes('note'));
  await p.click('.tt-pop .btn.primary');await sleep(200);
  let s=await state(p);
  if(!enabled.length){t.is('no-field template refused',!(s.taskTpls||[]).length);await p.keyboard.press('Escape')}
  // build a richer task via state + template directly
  await p.evaluate(()=>{});
  await p.close();
  // second pass: seed a task with values through localStorage
  const o=await open(br,{w,h,dark});const q=o.p;
  await q.evaluate(()=>{const k='focus-todo-v1:local-user-1',d=JSON.parse(localStorage.getItem(k));
    const tk=d.tasks.find(x=>!x.done&&!x.parentId&&!x.onHold&&!x.longTerm);tk.name='Base task';tk.color='#e0457b';tk.glow='blue';tk.note='Check the numbers';tk.micro=[{id:'m1',name:'Open file',done:false},{id:'m2',name:'Send',done:true}];
    tk.steps=[{name:'Base task',done:false},{name:'Base task 2',done:false},{name:'Review',done:false}];tk.stepSel=0;localStorage.setItem(k,JSON.stringify(d));
    const db=JSON.parse(localStorage.getItem('focus-localdb'));const r=db.user_state.find(r=>r.user_id==='local-user-1'&&r.key==='tasks');if(r)r.data=d.tasks;localStorage.setItem('focus-localdb',JSON.stringify(db))});
  await q.reload();await sleep(900);
  const r2=q.locator('.task',{hasText:'Base task'}).first();await r2.hover();
  await t.ok(q,'star not blue before saving',()=>!document.querySelector('.tstar.on'));
  await r2.locator('.tstar').click();await sleep(150);
  await q.fill('#tt-name','Base');await q.click('.tt-pop .btn.primary');await sleep(250);
  s=await state(q);const tp=(s.taskTpls||[])[0];
  t.is('template saved',!!tp&&tp.name==='Base'&&tp.f.glow==='blue'&&tp.f.micro.length===2&&tp.f.steps.length===3&&tp.f.note==='Check the numbers');
  t.is('no history in template',!!tp&&!('log' in tp.f)&&!('history' in tp.f));
  await t.ok(q,'star turns blue',()=>!!document.querySelector('.tstar.on'));
  // use it in the add bar
  await q.click('#composer .cgear');await sleep(150);
  await q.selectOption('#c-tpl',tp.id);await sleep(150);
  await t.ok(q,'glow prefilled',()=>!!document.querySelector('#c-advp [data-lk=glow] .g-blue'));
  await shot(q,`tt-bar-${w}`);
  await t.ok(q,'no sideways scroll',()=>document.documentElement.scrollWidth<=innerWidth);
  await q.fill('#c-name','From template');await q.keyboard.press('Enter');await sleep(300);
  s=await state(q);const x=s.tasks.find(k=>k.name==='From template');
  t.is('new task has template fields',!!x&&x.color==='#e0457b'&&x.glow==='blue'&&x.micro.length===2&&x.micro.every(m=>!m.done)&&x.steps.length===3&&x.steps[1].name==='From template 2'&&x.steps[2].name==='Review'&&x.note==='Check the numbers');
  await t.ok(q,'new task star is blue',()=>{const r=[...document.querySelectorAll('.task')].find(x=>x.querySelector('.name')&&x.querySelector('.name').textContent==='From template');return !!r&&!!r.querySelector('.tstar.on')});
  await q.fill('#c-name','Plain one');await q.keyboard.press('Enter');await sleep(300);
  s=await state(q);const y=s.tasks.find(k=>k.name==='Plain one');t.is('next task is plain',!!y&&!y.glow&&!(y.micro||[]).length&&!y.note);
  t.is('no page errors '+errs.concat(o.errs).join(';'),errs.length===0&&o.errs.length===0);await q.close()}
 }finally{await br.close()}t.done()})();
