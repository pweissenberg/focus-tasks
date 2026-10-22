// Full run before publishing a big change (about 1-2 min):   python3 build.py && node tests/full.js
// 1) every screen at five sizes, light and dark: no page errors, no sideways scroll; screenshots in /tmp/focus-shots/full-*.png
// 2) feature checks: add bars + gear, pencil window, priority sort, reminders, timer / pomodoro tab title,
//    daily goal, keyboard shortcuts, archive, sign-in and sharing between the two local test accounts (1/1 and 2/2)
const {chromium}=require('playwright');
const {open,newContext,newPage,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
const today=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${z(d.getMonth()+1)}/${z(d.getDate())}/${d.getFullYear()}`};
const rowOf=(p,name)=>p.locator('#list .task',{has:p.locator('.name',{hasText:name})}).first();
const firstName=p=>p.evaluate(()=>document.querySelector('#list .task .name').textContent);

async function sizes(br){
  for(const [w,h,dark] of [[1440,900,false],[1100,800,true],[820,1100,false],[390,844,true],[360,740,false]]){
    const tag=`${w}px ${dark?'dark':'light'}`;console.log('\n'+tag);
    const {ctx,p,errs}=await open(br,{w,h,dark});const wide=[],missing=[];
    const step=async(name,sel,ready)=>{
      try{if(sel)await p.click(sel);await sleep(250);if(ready&&!(await p.$(ready)))missing.push(name)}catch(e){missing.push(name+' ('+String(e.message).split('\n')[0]+')')}
      if(!(await p.evaluate(noSideScroll)))wide.push(name)};
    await step('tasks',null,'#list .task');
    await shot(p,`full-${w}${dark?'-dark':''}-tasks`);
    await step('gear panel','#c-adv','#c-advp');await step('gear closed','#c-adv');
    await step('long term','.views [data-view=long]','#list');
    await step('done','.views [data-view=done]','.donebar');
    await step('calendar','#rail [data-view=calendar]','#cal .cal-grid');
    await step('stats','#rail [data-view=stats]','#stats .hero-row');
    await shot(p,`full-${w}${dark?'-dark':''}-stats`);
    await step('back to tasks','#rail [data-view=tasks]','#list .task');
    await p.evaluate(()=>{for(const c of ['#timerCard','#noiseCard'])if(!document.querySelector(c).hidden)document.querySelector(c==='#timerCard'?'#timerToggle':'#noiseToggle').click()});
    await step('timer card','#timerToggle','#timerCard:not([hidden])');await step('timer closed','#timerClose');
    await step('white noise card','#noiseToggle','#noiseCard:not([hidden])');await step('noise closed','#noiseClose');
    await p.evaluate(()=>document.querySelector('[data-pgo]').click());
    await step('project page',null,'#pt-name');
    await step('project notes','[data-ptab=notes]','.pn-bar');
    await step('project free canvas','[data-ptab=free]','#cv');
    await step('project tasks','[data-ptab=tasks]','#pt-name');
    await step('back from project','[data-pback]','#list .task');
    await step('account menu','#acctBtn','.acct-menu');await p.keyboard.press('Escape');
    t.is(`${tag}: every screen opens`+(missing.length?' (missing: '+missing.join(', ')+')':''),!missing.length);
    t.is(`${tag}: no sideways scroll`+(wide.length?' (on: '+wide.join(', ')+')':''),!wide.length);
    t.is(`${tag}: no page errors`+(errs.length?': '+errs.join(' | '):''),!errs.length);
    await ctx.close();
  }
}

async function features(br){
  console.log('\nfeatures (1440px)');
  // add bars and the gear
  {const {ctx,p,errs}=await open(br,{});
    await p.click('#c-adv');await p.fill('#c-time','14:30');await p.selectOption('#c-rem','15');await p.selectOption('#c-rep','weekly');
    await p.selectOption('#c-parent',{index:1});const parent=await p.evaluate(()=>document.querySelector('#c-parent').value);
    await p.fill('#c-name','Gear task');await p.keyboard.press('Enter');await sleep(250);
    let s=await state(p),g=s.tasks.find(x=>x.name==='Gear task');
    t.is('gear: time, reminder, repeat and parent reach the new task',!!g&&g.time==='14:30'&&g.remind===15&&g.repeat&&g.repeat.freq==='weekly'&&g.parentId===parent&&!!g.due);
    await p.check('#c-long');await p.fill('#c-name','Long gear task');await p.keyboard.press('Enter');await sleep(250);
    s=await state(p);t.is('gear: long-term box',s.tasks.some(x=>x.name==='Long gear task'&&x.longTerm));
    await clearToasts(p);await p.click('#c-adv');
    await p.evaluate(()=>document.querySelector('[data-pgo]').click());await sleep(250);
    await p.fill('#pt-name','Project bar task');await p.click('#themeToggle');await sleep(200);
    await t.ok(p,'project bar keeps what you typed when the page redraws',()=>document.querySelector('#pt-name').value==='Project bar task');
    await p.click('#themeToggle');await sleep(200);
    await p.click('#pt-prio');await p.click('.prio-menu [data-prio="3"]');await p.click('#pt-adv');await p.fill('#pt-time','09:15');
    await p.click('#pt-name');await p.keyboard.press('Enter');await sleep(250);
    s=await state(p);g=s.tasks.find(x=>x.name==='Project bar task');
    t.is('project bar: priority, time and project',!!g&&g.prio===3&&g.time==='09:15'&&g.projectId===s.ui.projectPage);
    t.is('no page errors (add bars)'+(errs.length?': '+errs.join(' | '):''),!errs.length);await ctx.close()}

  // pencil window, priority sort, reminders
  {const {ctx,p,errs}=await open(br,{});
    const name=await firstName(p),hm=await p.evaluate(()=>{const d=new Date(Date.now()-2*60000),z=n=>String(n).padStart(2,'0');return z(d.getHours())+':'+z(d.getMinutes())});
    await rowOf(p,name).hover();await rowOf(p,name).locator('[data-act=edit]').click();
    await p.fill('#ed-due',today());await p.press('#ed-due','Tab');await p.fill('#ed-time',hm);await p.selectOption('#ed-rem','0');await p.selectOption('#ed-prio','1');
    await p.click('.modal .btn.primary');await sleep(200);
    let s=await state(p),x=s.tasks.find(k=>k.name===name);
    t.is('pencil window saves due, time, reminder and priority',!!x&&x.time===hm&&x.remind===0&&x.prio===1&&!!x.due);
    await p.click('[data-sort=prio]');await sleep(150);
    await t.ok(p,'priority sort puts flagged tasks first',()=>!!document.querySelector('#list .task .pflag.pr1,#list .task .pflag.pr2,#list .task .pflag.pr3')&&!!document.querySelector('#list .task').querySelector('.pflag[class*="pr"]:not(.pset)'));
    await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await sleep(400);
    await t.ok(p,'a due reminder shows its card',n=>{const c=document.querySelector('.rcard');return !!c&&c.innerText.includes(n)},name);
    await p.click('.rcard [data-rc=done]');await sleep(250);
    s=await state(p);t.is('reminder card: Mark done',s.tasks.some(k=>k.name===name&&k.done));
    t.is('no page errors (pencil, reminders)'+(errs.length?': '+errs.join(' | '):''),!errs.length);await ctx.close()}

  // timer, pomodoro and the tab title (fake clock)
  {const {ctx,p,errs}=await open(br,{clock:true});
    await p.evaluate(()=>{if(document.querySelector('#timerCard').hidden)document.querySelector('#timerToggle').click()});
    await p.click('#tm-presets [data-min="15"]');await p.click('#tm-start');await p.clock.runFor(1500);
    await t.ok(p,'tab title counts down',()=>/^14:5\d · /.test(document.title));
    await p.clock.runFor(15*60000);const seen=new Set();let ring=false;
    for(let i=0;i<4;i++){seen.add(await p.evaluate(()=>document.title));ring=ring||await p.evaluate(()=>document.querySelector('#timerToggle').classList.contains('ring'));await p.clock.runFor(1000)}
    t.is("time's up: the title and the rail timer blink",seen.has("⏰ Time's up!")&&seen.has('Focus Tasks')&&ring);
    await p.mouse.click(700,600);await p.clock.runFor(1100);
    await t.ok(p,'a click stops the blinking',()=>document.title==='Focus Tasks'&&!document.querySelector('#timerToggle').classList.contains('ring'));
    await p.click('[data-tmode=pomo]');await p.click('#tm-start');await p.clock.runFor(25*60000+500);const seen2=[];
    for(let i=0;i<4;i++){seen2.push(await p.evaluate(()=>document.title));await p.clock.runFor(1000)}
    t.is('pomodoro: break starts and the title blinks',seen2.includes('⏰ Break time!')&&seen2.some(x=>x.startsWith('☕ ')));
    t.is('no page errors (timer)'+(errs.length?': '+errs.join(' | '):''),!errs.length);await ctx.close()}

  // daily goal, keyboard shortcuts, archive
  {const {ctx,p,errs}=await open(br,{});
    await p.click('#rail [data-view=stats]');await sleep(250);await p.click('[data-goal]');await p.click('[data-gm="120"]');await p.click('.goal-pop .btn.primary');await sleep(200);
    let s=await state(p);t.is('daily goal saves',s.prefs.goalMins===120);
    await p.click('#rail [data-view=tasks]');await sleep(200);
    const open0=s.tasks.filter(k=>!k.done).length;
    await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.keyboard.press('j');await sleep(100);
    await t.ok(p,'J selects a task',()=>!!document.querySelector('#list .task.ksel'));
    await p.keyboard.press('x');await sleep(300);await clearToasts(p);
    s=await state(p);t.is('X completes the selected task',s.tasks.filter(k=>!k.done).length===open0-1);
    await p.keyboard.press('2');await sleep(150);await t.ok(p,'2 opens Long term',()=>document.querySelector('#title').textContent==='Long term');
    await p.keyboard.press('1');await sleep(150);await p.keyboard.press('n');
    await t.ok(p,'N goes to the add bar',()=>document.activeElement.id==='c-name');
    await p.click('.views [data-view=done]');await sleep(200);
    const done0=await p.evaluate(()=>document.querySelectorAll('#list .task').length);
    await p.locator('#list .task').first().hover();await p.locator('#list .task [data-act=archive]').first().click();await sleep(200);
    await t.ok(p,'archive takes it off the Done list',n=>document.querySelectorAll('#list .task').length===n-1,done0);
    await p.click('[data-arch-toggle]');await sleep(150);
    await t.ok(p,'Archived shows it',()=>document.querySelectorAll('#list .task').length>0);
    t.is('no page errors (goal, keys, archive)'+(errs.length?': '+errs.join(' | '):''),!errs.length);await ctx.close()}

  // sign in from the landing page, share a task between the two local accounts, sign out
  {const ctx=await newContext(br,{user:0});const A=await newPage(ctx),B=await newPage(ctx);
    const login=async(p,u)=>{await p.click('#ldSignIn');await p.fill('#au-email',u);await p.fill('#au-pass',u);await p.click('#au-go');await sleep(900);await clearToasts(p)};
    await t.ok(A.p,'signed out: the landing page shows',()=>document.body.classList.contains('show-landing'));
    await login(A.p,'1');await login(B.p,'2');
    await t.ok(A.p,'sign in as 1/1',()=>!document.body.classList.contains('show-landing')&&document.querySelectorAll('#list .task').length>0);
    const name=await firstName(A.p);
    await rowOf(A.p,name).hover();await rowOf(A.p,name).locator('[data-act=share]').click();await sleep(250);
    await A.p.fill('#sp-q','User 2');await sleep(300);await A.p.click('.sp-res .sp-row .sp-n >> nth=0');await A.p.click('.sp-res [data-sh="0"]');await sleep(250);await A.p.mouse.click(5,5);
    let got=false;for(let i=0;i<10&&!got;i++){await sleep(300);got=await B.p.evaluate(n=>[...document.querySelectorAll('#list .task .name')].some(x=>x.textContent===n),name)}
    t.is('a shared task shows up for the other account',got);
    await B.p.click('#acctBtn');await B.p.click('[data-out]');await sleep(500);
    await t.ok(B.p,'sign out goes back to the landing page',()=>document.body.classList.contains('show-landing'));
    const errs=[...A.errs,...B.errs];t.is('no page errors (accounts)'+(errs.length?': '+errs.join(' | '):''),!errs.length);await ctx.close()}
}

(async()=>{
  const br=await chromium.launch();
  for(const part of [sizes,features]){try{await part(br)}catch(e){t.is(`${part.name} stopped early: `+String(e.message).split('\n')[0],false)}}
  await br.close();t.done();
})();
