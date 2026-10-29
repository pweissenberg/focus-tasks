// v90 (257): task patterns / uploaded pictures, Settings "Task style rules" (keyword, tag, project, combined)
const {chromium}=require('playwright');
const {open,sleep,checks,state}=require('./harness');
const t=checks();
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==','base64');
(async()=>{const br=await chromium.launch();
 try{const {p,errs}=await open(br,{w:1440,h:900});
  const openSettings=async()=>{await p.evaluate(()=>document.querySelector('#acctBtn').click());await sleep(150);await p.waitForSelector('[data-settings]',{timeout:3000}).catch(async()=>{await p.evaluate(()=>document.querySelector('#acctBtn').click());await sleep(300)});await p.evaluate(()=>document.querySelector('[data-settings]').click());await sleep(250)};
  // a task to style
  await p.fill('#c-name','Call the dentist zzkey');await p.keyboard.press('Enter');await sleep(300);
  const id=await p.evaluate(()=>[...document.querySelectorAll('#list .task')].find(r=>r.textContent.includes('zzkey')).dataset.id);
  await openSettings();
  await t.ok(p,'Settings has the rules section',()=>!!document.querySelector('.modal.settings #sr-set'));
  await p.click('[data-sradd]');await sleep(200);
  await p.fill('.sr-card [data-srf=kw]','ZZKEY, other');await sleep(400);
  await p.click('.sr-card [data-srsw=bg] [data-sw="#4e9a5b"]');await sleep(200);
  await p.click('.sr-card .pat-pick label[title=Dots]');await sleep(200);
  await p.click('.sr-card .glow-pick label[title=Violet]');await sleep(200);
  await p.check('.sr-card [data-srf=urgent]');await p.check('.sr-card [data-srf=top]');await sleep(300);
  await sleep(500);let st=await state(p);{const r=st.prefs.styleRules[0];t.is('rule saved',r.kw==='ZZKEY, other'&&r.bg==='#4e9a5b'&&r.pat==='dots'&&r.glow==='violet'&&r.urgent&&r.top)}
  await p.locator('.modal.settings').screenshot({path:'/tmp/claude-0/s/sr-settings.png'});
  // upload a background in Settings
  await p.setInputFiles('[data-srup]',{name:'wood.png',mimeType:'image/png',buffer:PNG});await sleep(600);
  st=await state(p);t.is('uploaded background kept',st.prefs.bgImgs.length===1&&st.prefs.bgImgs[0].data.startsWith('data:image/jpeg'));
  await t.ok(p,'background shows in Settings',()=>!!document.querySelector('.sr-img'));
  // second rule: tag Supply + project Research (combined)
  await p.click('[data-sradd]');await sleep(200);
  const c2='.sr-card:nth-of-type(2)';
  await p.locator('.sr-card').nth(1).locator('[data-srf=tagId]').selectOption('t_supply');
  await p.locator('.sr-card').nth(1).locator('[data-srf=projId]').selectOption('p_research');
  await p.locator('.sr-card').nth(1).locator('.pat-pick label[title=Stripes]').click();await sleep(300);
  await p.click('.modal.settings [data-x]');await sleep(200);
  await t.ok(p,'keyword rule styles the row',id=>{const r=document.querySelector(`#list .task[data-id="${id}"]`);return r.classList.contains('has-bg')&&r.classList.contains('bgp-dots')&&r.classList.contains('g-violet')&&!!r.querySelector('.urg')},id);
  await t.ok(p,'top rule puts it first',id=>document.querySelector('#list .task:not(.hold)').dataset.id===id||document.querySelector('#list .task').dataset.id===id,id);
  await t.ok(p,'other tasks untouched',id=>![...document.querySelectorAll('#list .task')].some(r=>r.dataset.id!==id&&r.classList.contains('bgp-dots')),id);
  await p.locator('#list').screenshot({path:'/tmp/claude-0/s/sr-list.png'});
  const tz=await p.evaluate(()=>[...document.querySelectorAll('#list .task')].find(r=>r.querySelector('.name').textContent==='Tanzania').dataset.id);
  await t.ok(p,'tag + project rule on Tanzania (Supply, Research)',tz=>document.querySelector(`.task[data-id="${tz}"]`).classList.contains('bgp-stripes'),tz);
  await t.ok(p,'pattern without a background color adds no fill',tz=>{const r=document.querySelector(`.task[data-id="${tz}"]`);return !r.classList.contains('has-bg')&&!r.classList.contains('tag-fill')&&getComputedStyle(r).backgroundColor===getComputedStyle(document.querySelector('.panel')).backgroundColor},tz);
  await t.ok(p,'not on Econs (other tag)',()=>{const r=[...document.querySelectorAll('#list .task')].find(r=>r.querySelector('.name').textContent==='Econs');return r&&!r.classList.contains('bgp-stripes')});
  await openSettings();await p.locator('.sr-card').nth(1).locator('[data-srf=on]').uncheck();await sleep(200);await p.click('.modal.settings [data-x]');await sleep(200);
  await t.ok(p,'rule off = no style',tz=>!document.querySelector(`.task[data-id="${tz}"]`).classList.contains('bgp-stripes'),tz);
  // edit window: pick the uploaded picture as the task's own background
  await p.click(`.task[data-id="${id}"] [data-act=edit]`,{force:true});await sleep(250);
  await t.ok(p,'edit window has pattern picker with the picture',()=>!!document.querySelector('.modal .pat-pick .psw.img'));
  await p.click('.modal .pat-pick label:has(.psw.img)');await p.click('.modal .modal-actions .primary');await sleep(300);
  await t.ok(p,'own picture wins over the rule pattern',id=>{const r=document.querySelector(`#list .task[data-id="${id}"]`);return r.classList.contains('bgp-img')&&!r.classList.contains('bgp-dots')},id);
  await p.locator('#list').screenshot({path:'/tmp/claude-0/s/sr-list2.png'});
  st=await state(p);await sleep(1500);await p.reload();await sleep(900);
  await t.ok(p,'kept after reload',id=>document.querySelector(`#list .task[data-id="${id}"]`).classList.contains('bgp-img'),id);
  st=await state(p);t.is('task picture saved',(st.tasks.find(x=>x.id===id).bgPat||'').startsWith('img:')&&st.prefs.styleRules.length===2);
  await p.setViewportSize({width:390,height:844});await openSettings();await sleep(200);
  await t.ok(p,'phone: no side scroll in settings',()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.modal.settings').scrollWidth<=document.querySelector('.modal.settings').clientWidth+1);
  await p.locator('.modal.settings').screenshot({path:'/tmp/claude-0/s/sr-phone.png'});
  t.is('no page errors '+errs.join(';'),errs.length===0);
 }finally{await br.close()}process.exit(t.done?t.done():0)})();
