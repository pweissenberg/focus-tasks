// v78: written dates in the add bar, Ctrl+Z / Ctrl+Shift+Z, focus mode (about 15 s). Screenshots: /tmp/focus-shots/fm-*.png
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
const iso=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
(async()=>{
  const br=await chromium.launch();
  for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){
    const {ctx,p,errs}=await open(br,{w,h,dark});console.log(`\n${w}px ${dark?'dark':'light'}`);
    try{
      // written dates
      await p.click('#c-name');await p.keyboard.type('Ligar pro banco amanhã 15h');await sleep(150);
      await t.ok(p,'dates: chip shows what was read',()=>{const c=document.querySelector('.nl-chip');return c&&/Tomorrow · 15:00/.test(c.textContent)});
      await shot(p,`fm-chip-${w}`);
      await p.keyboard.press('Enter');await sleep(250);await clearToasts(p);
      let s=await state(p),a=s.tasks.find(x=>x.name==='Ligar pro banco');
      t.is('dates: "amanhã 15h" leaves the name and sets due + time',a&&a.due===iso(1)&&a.time==='15:00');
      await p.fill('#c-name','Revisar segunda versão');await sleep(100);
      await t.ok(p,'dates: "segunda versão" is not read as Monday',()=>!document.querySelector('.nl-chip'));
      await p.keyboard.press('Enter');await sleep(200);
      await p.fill('#c-name','Send report friday');await sleep(100);await p.click('.nl-chip [data-nloff]');await sleep(100);
      await p.keyboard.press('Enter');await sleep(200);await clearToasts(p);
      s=await state(p);
      t.is('dates: × keeps the words as text, no date',s.tasks.some(x=>x.name==='Send report friday'&&!x.due)&&s.tasks.some(x=>x.name==='Revisar segunda versão'&&!x.due));
      await p.fill('#c-name','');await p.keyboard.type('Pay rent sexta [Oth');await sleep(100);await p.keyboard.press('Tab');await p.keyboard.type(';5');await p.keyboard.press('Enter');await sleep(250);await clearToasts(p);
      s=await state(p);a=s.tasks.find(x=>x.name==='Pay rent');
      t.is('dates: works together with [tag and ;time',a&&a.tagId==='t_other'&&a.est===5&&!!a.due&&new Date(a.due+'T12:00').getDay()===5);
      await p.fill('#c-name','Due field words');await p.fill('#c-due','em 3 dias');await p.click('#c-name');await p.keyboard.press('Enter');await sleep(250);await clearToasts(p);
      s=await state(p);t.is('dates: the due field takes "em 3 dias" too',s.tasks.some(x=>x.name==='Due field words'&&x.due===iso(3)));
      // undo / redo
      const n0=(await state(p)).tasks.length;
      await p.fill('#c-name','Undo me');await p.keyboard.press('Enter');await sleep(250);await clearToasts(p);
      await p.fill('#c-name','Undo me too');await p.keyboard.press('Enter');await sleep(1000);await clearToasts(p);
      // the add bar is empty and focused: Ctrl+Z is the app's undo
      await p.keyboard.press('Control+z');await sleep(200);
      await t.ok(p,'undo: toast says what was undone',()=>/Undo: Removed "Undo me too"/.test((document.querySelector('.toast')||{}).textContent||''));
      await p.keyboard.press('Control+z');await sleep(200);
      s=await state(p);t.is('undo: two steps back removes both tasks',s.tasks.length===n0&&!s.tasks.some(x=>/^Undo me/.test(x.name)));
      await p.keyboard.press('Control+Shift+z');await sleep(200);
      s=await state(p);t.is('redo: Ctrl+Shift+Z brings one back',s.tasks.some(x=>x.name==='Undo me')&&!s.tasks.some(x=>x.name==='Undo me too'));
      await p.fill('#c-name','typing');await p.keyboard.press('Control+z');await sleep(150);
      s=await state(p);t.is('undo: inside a field with text, Ctrl+Z is left to the field',s.tasks.some(x=>x.name==='Undo me'));
      await p.fill('#c-name','');
      // focus mode
      {const tz=p.locator('#list .task',{has:p.locator('.name',{hasText:/^Tanzania$/})}).first();
       await tz.locator('[data-act=stepadd]').click();await sleep(150);await tz.locator('.stepbox.plus').click();await sleep(150);
       await tz.hover();await tz.locator('[data-mtadd]').click();await sleep(100);await p.keyboard.type('Call Paul');await p.keyboard.press('Tab');await sleep(150)}
      await p.evaluate(()=>{document.activeElement.blur()});
      await p.click('#focusBtn');await sleep(200);
      await t.ok(p,'focus: rail button opens the picker',()=>!!document.querySelector('#fm .fm-plist'));
      await p.locator('#fm [data-fmpick]',{has:p.locator('span',{hasText:/^Tanzania$/})}).first().click();await sleep(200);
      await t.ok(p,'focus: shows the task, its steps, microtasks and the timer',()=>{const f=document.querySelector('#fm');return f.querySelector('.fm-name').textContent==='Tanzania'&&f.querySelectorAll('[data-fmstep]').length===3&&f.querySelectorAll('[data-fmmt]').length===1&&!!f.querySelector('#fm-clock')});
      s=await state(p);t.is('focus: the timer is linked to the task',s.timer.taskId===s.tasks.find(x=>x.steps&&x.steps.length===3).id);
      await t.ok(p,'focus: no sideways scroll',()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#fm .fm-scroll').scrollWidth<=document.querySelector('#fm .fm-scroll').clientWidth);
      await shot(p,`fm-open-${w}`);
      await p.click('#fm [data-fmt=start]');await sleep(1200);
      t.is('focus: Start runs the timer',(await state(p)).timer.running);
      await p.click('#fm [data-fmt=pause]');await sleep(150);
      await p.locator('#fm [data-fmmt]').check();await sleep(150);
      await p.fill('#fm-mt','Send email');await p.keyboard.press('Enter');await sleep(150);
      s=await state(p);{const x=s.tasks.find(x=>x.steps&&x.steps.length===3);t.is('focus: tick and add microtasks',x.micro[0].done&&x.micro[1].name==='Send email')}
      await t.ok(p,'focus: the add field keeps focus',()=>document.activeElement.id==='fm-mt');
      await p.locator('#fm [data-fmstep="0"]').check();await sleep(200);
      s=await state(p);{const x=s.tasks.find(x=>x.steps&&x.steps.length===3);t.is('focus: ticking step 1 finishes it',x.steps[0].done&&!x.done)}
      await p.evaluate(()=>document.activeElement.blur());
      await p.keyboard.press('Escape');await sleep(150);
      await t.ok(p,'focus: Esc closes it',()=>!document.querySelector('#fm'));
      await p.keyboard.press('Shift+F');await sleep(200);
      await t.ok(p,'focus: Shift+F also starts on the list, centered',()=>{const l=document.querySelector('#fm .fm-scroll.picking .fm-plist');if(!l)return false;const r=document.querySelector('#fm .fm-pick').getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<20});
      await t.ok(p,'focus: list has only open tasks of the Tasks list (no on hold, long term or done)',()=>{const n=[...document.querySelectorAll('#fm [data-fmpick] span')].map(x=>x.textContent);return n.includes('Ligar pro banco')&&!n.includes('BeP -> Python')&&!n.includes('Draft research agenda for 2027')&&!n.includes('Send Demand slides')});
      await shot(p,`fm-pick-${w}`);await p.keyboard.press('Escape');await sleep(100);
      t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
    }catch(e){t.is('crashed: '+e.message.split('\n')[0],false)}
    await ctx.close();
  }
  await br.close();t.done();
})();
