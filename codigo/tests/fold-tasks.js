// v86 (252): any task row folds (open by default), state kept after reload
const {chromium}=require('playwright');
const {open,sleep,checks}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
 try{const {p,errs}=await open(br,{w:1440,h:900});
  const id=await p.evaluate(()=>document.querySelector('#list .task:not(.hold) [data-foldexp]').closest('.task').dataset.id);
  await t.ok(p,'normal rows open by default',()=>!document.querySelector('#list .task.fold-min'));
  await p.hover(`#list .task[data-id="${id}"]`);await sleep(200);
  await p.locator(`#list .task[data-id="${id}"]`).screenshot({path:'/tmp/claude-0/s/a.png'});
  await p.click(`#list .task[data-id="${id}"] [data-foldexp]`);await sleep(300);
  await t.ok(p,'arrow folds it',id=>{const r=document.querySelector(`#list .task[data-id="${id}"]`);return r.classList.contains('fold-min')&&getComputedStyle(r.querySelector('.meta')||r).display==='none'},id);
  await p.mouse.move(0,0);await p.locator('#list').screenshot({path:'/tmp/claude-0/s/b.png'});
  await p.reload();await sleep(900);
  await t.ok(p,'fold kept after reload',id=>document.querySelector(`#list .task[data-id="${id}"]`).classList.contains('fold-min'),id);
  await p.click(`#list .task[data-id="${id}"] [data-foldexp]`);await sleep(300);
  await t.ok(p,'arrow opens it again',id=>!document.querySelector(`#list .task[data-id="${id}"]`).classList.contains('hold-min'),id);
  t.is(errs.length===0,'no page errors '+errs.join(';'));
 }finally{await br.close()}process.exit(t.done?t.done():0)})();
