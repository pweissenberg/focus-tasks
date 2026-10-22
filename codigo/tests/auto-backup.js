// Automatic backup (245): browser copy at start, folder (OPFS stands in for the folder picker), retention, Load and Download (about 20 s):  node tests/auto-backup.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,state}=require('./harness');
const fs=require('fs');
const t=checks();
const opfs=()=>navigator.storage.getDirectory();
const files=p=>p.evaluate(async()=>{const d=await navigator.storage.getDirectory(),o=[];for await(const [n] of d.entries())o.push(n);return o.sort()});
const openSettings=async p=>{await p.click('#acctBtn');await sleep(150);await p.click('[data-settings]');await sleep(200)};
(async()=>{const br=await chromium.launch();
  // https so the page is a secure context (the folder API and OPFS need one); OPFS stands in for the folder the user picks
  const ctx=await newContext(br,{w:1280,h:860,init:()=>{window.showDirectoryPicker=()=>navigator.storage.getDirectory()}});
  const html='<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>'+fs.readFileSync(__dirname+'/../index.html','utf8')+'</body></html>';
  await ctx.route('https://app/',r=>r.fulfill({contentType:'text/html',body:html}));
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
  await p.goto('https://app/');await sleep(700);
  try{
    await sleep(3000);
    const snaps=()=>p.evaluate(()=>new Promise(ok=>{const r=indexedDB.open('focus-backup');r.onsuccess=()=>{const q=r.result.transaction('snaps').objectStore('snaps').getAll();q.onsuccess=()=>ok(q.result.map(x=>({user:x.user,name:x.name})))}}));
    t.is('a backup is kept in the browser right after opening',(await snaps()).some(x=>x.user==='local-user-1'));
    await openSettings(p);
    t.is('Settings has the backup section with every 6 hours picked',await p.evaluate(()=>!!document.querySelector('.bk-set')&&document.querySelector('#st-bkh').value==='6'));
    await shot(p,'backup-settings');
    // old backups in the folder, to check what is kept
    const pre='focus-backup-user1-',z=n=>String(n).padStart(2,'0');
    const stamp=d=>`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`;
    const now=new Date(),ago=(days,h)=>{const d=new Date(now);d.setDate(d.getDate()-days);d.setHours(h,0,0,0);return d};
    const olds=[ago(1,9),ago(1,20),ago(2,10),ago(9,8),ago(9,22),ago(30,12)].map(d=>pre+stamp(d)+'.json');
    await p.evaluate(async ns=>{const d=await navigator.storage.getDirectory();for(const n of ns){const w=await (await d.getFileHandle(n,{create:true})).createWritable();await w.write('{}');await w.close()}},olds);
    await p.click('[data-bkdir]');await sleep(800);
    let fl=(await files(p)).filter(n=>n.startsWith(pre));
    const day=new Date(now);day.setHours(0,0,0,0);const wk=new Date(day);wk.setDate(wk.getDate()-((wk.getDay()+6)%7));
    const byAt=olds.map((n,i)=>({n,at:[ago(1,9),ago(1,20),ago(2,10),ago(9,8),ago(9,22),ago(30,12)][i].getTime()})).sort((a,b)=>b.at-a.at);
    const want=new Set([byAt[0].n,byAt.find(x=>x.at<day.getTime()).n,byAt.find(x=>x.at<wk.getTime()).n]);
    t.is('picking a folder writes a backup there',fl.some(n=>!olds.includes(n)));
    t.is('the folder keeps the newest 2, the last of the day before and the last of the week before',fl.length===new Set([...want,fl.find(n=>!olds.includes(n))]).size&&[...want].every(n=>fl.includes(n)));
    const newest=fl.find(n=>!olds.includes(n));
    const B=JSON.parse(await p.evaluate(async n=>(await (await (await navigator.storage.getDirectory()).getFileHandle(n)).getFile()).text(),newest));
    t.is('the backup file holds the whole account',B.format==='focus-tasks-backup'&&Array.isArray(B.state.tasks)&&B.state.tasks.length>2);
    t.is('Settings shows the folder name',await p.evaluate(()=>/Folder:/.test(document.querySelector('.bk-dir').textContent)));
    await p.selectOption('#st-bkh','12');await sleep(100);
    t.is('the interval can be changed',(await state(p)).prefs.backupHours===12);
    await p.click('.modal [data-x]');await sleep(100);
    // load: add a task, then load the backup (it goes away), then the "before the last load" brings it back
    await p.fill('#c-name','Made after the backup');await p.keyboard.press('Enter');await sleep(300);
    await openSettings(p);await p.click('[data-bkload]');await sleep(500);
    t.is('Load a backup lists the folder and browser backups',await p.evaluate(()=>document.querySelectorAll('.bk-item').length>=2&&/Folder/.test(document.querySelector('.bk-list').textContent)));
    await shot(p,'backup-load');
    await p.click('.bk-item [data-bki="0"]');await sleep(100);
    t.is('Load asks once more before replacing',await p.evaluate(()=>document.querySelector('[data-bki="0"]').textContent.includes('Replace')));
    await p.click('.bk-item [data-bki="0"]');await sleep(500);
    t.is('loading replaces the tasks with the backup',!(await state(p)).tasks.some(x=>x.name==='Made after the backup'));
    await openSettings(p);await p.click('[data-bkload]');await sleep(500);
    const ui=await p.evaluate(()=>[...document.querySelectorAll('.bk-item')].findIndex(x=>x.classList.contains('undo')));
    t.is('the state right before the load is offered',ui>=0);
    await p.click(`[data-bki="${ui}"]`);await sleep(100);await p.click(`[data-bki="${ui}"]`);await sleep(500);
    t.is('loading it brings the newer task back',(await state(p)).tasks.some(x=>x.name==='Made after the backup'));
    await openSettings(p);
    const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-bkdl]')]);
    const f='/tmp/focus-shots/backup.json';await dl.saveAs(f);
    t.is('Download a backup gives the whole account file',JSON.parse(fs.readFileSync(f,'utf8')).format==='focus-tasks-backup');
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
