// v103 (265): Later (was Long term) with a return date, Show-from tasks listed in Later, recurring on its day, On hold above recurring
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
const names=p=>p.evaluate(()=>[...document.querySelectorAll('#list .task .name')].map(n=>n.textContent.trim()));
(async()=>{const br=await chromium.launch();
 try{for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){const {p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px`);
  await t.ok(p,'view tab is called Later',()=>document.querySelector('.views [data-view=long]').textContent.trim()==='Later');
  await p.fill('#c-name','Renew passport');await p.keyboard.press('Enter');await sleep(250);
  let s=await state(p);const id=s.tasks.find(k=>k.name==='Renew passport').id,R=`.task[data-id="${id}"]`;
  await t.ok(p,'row button says Send to later',r=>document.querySelector(r+' [data-ltsend]').textContent.includes('Send to later'),R);
  await p.hover(R);await p.click(`${R} [data-ltsend]`);await sleep(150);
  await t.ok(p,'popover asks when it comes back',()=>!!document.querySelector('.later-pop [data-lq]'));
  await shot(p,`later-pop-${w}`);
  await p.click('.later-pop [data-lq] >> nth=1');await sleep(250);
  s=await state(p);let x=s.tasks.find(k=>k.id===id);
  t.is('next week sets the return date (defer), not long term',!!x.defer&&!x.longTerm&&x.laterBack===true);
  await t.ok(p,'it leaves Tasks',r=>!document.querySelector(r),R);
  await clearToasts(p);await p.click('.views [data-view=long]');await sleep(250);
  await t.ok(p,'Later lists it under Coming back with Back on',r=>{const e=document.querySelector(r);return !!e&&/Back on/.test(e.textContent)&&!!document.querySelector('#list .later-h')},R);
  await t.ok(p,'no scheduled line in Later',()=>!document.querySelector('#list [data-schedall]'));
  // a Show from task created in Tasks also shows in Later
  await p.click('.views [data-view=tasks]');await sleep(200);
  const fut=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`});
  await p.click('#composer .cgear');await sleep(150);await p.fill('#c-from',fut);await p.click('#c-advp .cadv-h b');await sleep(100);
  await p.fill('#c-name','Call the bank');await p.keyboard.press('Enter');await sleep(250);await clearToasts(p);
  await p.click('.views [data-view=long]');await sleep(250);
  let n=await names(p);t.is('Later shows the Show from task, sooner first: '+n.join(','),n.indexOf('Call the bank')>=0&&n.indexOf('Call the bank')<n.indexOf('Renew passport'));
  await shot(p,`later-view-${w}`);
  // back now
  await p.hover(R);await p.click(`${R} [data-ltsend]`);await sleep(250);
  s=await state(p);x=s.tasks.find(k=>k.id===id);t.is('Back now clears the date',!x.defer&&!x.longTerm);
  await clearToasts(p);await p.click('.views [data-view=tasks]');await sleep(200);
  n=await names(p);t.is('and it is in Tasks again',n.includes('Renew passport'));
  t.is('no page errors '+errs.join(';'),errs.length===0);await p.close()}
  // ordering: recurring due today below On hold; recurring copy shows on its day
  const {p,errs}=await open(br,{});
  await p.evaluate(()=>{const k='focus-todo-v1:local-user-1',s=JSON.parse(localStorage.getItem(k));const now=new Date().toISOString(),d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    const td=iso(d);d.setDate(d.getDate()+1);const tm=iso(d);
    const mk=(id,name,o)=>Object.assign({id,name,color:null,tagId:null,projectId:null,due:'',time:'',note:'',onHold:false,done:false,doneAt:null,createdAt:now,parentId:null,order:0,longTerm:false},o);
    s.tasks=[mk('a','Plain',{order:0}),mk('b','Held',{onHold:true,order:1}),mk('c','Timed rec',{due:td,time:'15:00',repeat:{freq:'daily'},order:2}),mk('e','Tomorrow copy',{due:tm,repeat:{freq:'daily'},repNext:true,order:3})];
    localStorage.setItem(k,JSON.stringify(s));const db=JSON.parse(localStorage.getItem('focus-localdb'));const r=db.user_state.find(r=>r.user_id==='local-user-1'&&r.key==='tasks');if(r)r.data=s.tasks;localStorage.setItem('focus-localdb',JSON.stringify(db))});
  await p.reload();await sleep(900);
  const n=await names(p);console.log('\norder');
  t.is('On hold first, then recurring of today: '+n.join(','),n[0]==='Held'&&n[1]==='Timed rec');
  t.is('next recurring copy (due tomorrow) not shown yet',!n.includes('Tomorrow copy'));
  t.is('no page errors '+errs.join(';'),errs.length===0);
 }finally{await br.close()}t.done()})();
