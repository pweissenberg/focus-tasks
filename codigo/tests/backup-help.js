// Backup folder help (246) and the page copy (005): inside a frame (like claude.ai) "Choose folder" opens the steps, "Get focus-tasks.html"
// gives a file that matches the build's focus-tasks.html and runs on its own with a working folder button (about 10 s):  node tests/backup-help.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot}=require('./harness');
const fs=require('fs'),path=require('path');
const t=checks();
(async()=>{const br=await chromium.launch();
  const ctx=await newContext(br,{w:1280,h:860});
  await ctx.route('http://outer/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"><iframe src="http://app/" style="border:0;width:1280px;height:860px"></iframe>'}));
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://outer/');await sleep(1500);const f=p.frames().find(x=>x.url()==='http://app/');
  try{
    await f.click('#acctBtn');await sleep(150);await f.click('[data-settings]');await sleep(250);
    t.is('in a frame, Settings shows Choose folder with why it cannot work here',await f.evaluate(()=>/inside claude\.ai/.test(document.querySelector('.bk-set').textContent)&&!!document.querySelector('[data-bkdir]')));
    await f.click('[data-bkdir]');await sleep(200);
    t.is('Choose folder opens the steps window',await f.evaluate(()=>!!document.querySelector('.bk-help')&&document.querySelectorAll('.bk-steps li').length===4));
    await shot(p,'backup-help');
    const [dl]=await Promise.all([p.waitForEvent('download'),f.click('[data-bkh-file]')]);
    const out='/tmp/focus-shots/focus-tasks-copy.html';await dl.saveAs(out);const copy=fs.readFileSync(out,'utf8');
    t.is('Get focus-tasks.html gives the same page as the build\'s focus-tasks.html',await p.evaluate(([a,b])=>{const d=s=>new DOMParser().parseFromString(s,'text/html').documentElement.outerHTML.replace(/\s+/g,'');return d(a)===d(b)},[copy,fs.readFileSync(path.join(__dirname,'..','focus-tasks.html'),'utf8')]));
    const [d2]=await Promise.all([p.waitForEvent('download'),f.click('[data-bkh-dl]')]);
    t.is('Download a backup from the steps window',JSON.parse(fs.readFileSync(await d2.path(),'utf8')).format==='focus-tasks-backup');
    // the copy opens on its own and has the real folder button
    await ctx.route('http://copy/',r=>r.fulfill({contentType:'text/html',body:copy}));
    const q=await ctx.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto('http://copy/');await sleep(1200);
    await q.click('#acctBtn');await sleep(150);await q.click('[data-settings]');await sleep(250);
    t.is('the copy runs and its Choose folder is the real one',await q.evaluate(()=>typeof showDirectoryPicker!=='function'||(!!document.querySelector('[data-bkdir]')&&!/inside claude/.test(document.querySelector('.bk-set').textContent))));
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
