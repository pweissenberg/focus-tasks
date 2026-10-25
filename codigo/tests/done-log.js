// v81: Done log card from the rail (about 10 s). Screenshots: /tmp/focus-shots/dl-*.png
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,noSideScroll,clearToasts}=require('./harness');
const t=checks();
(async()=>{
  const br=await chromium.launch();
  for(const [w,h,dark] of [[1440,900,false],[390,844,true]]){
    const {ctx,p,errs}=await open(br,{w,h,dark,clock:true});console.log(`\n${w}px ${dark?'dark':'light'}`);
    try{
      // one task done today, one yesterday, one 20 days ago
      // add three tasks and tick them done 20 days ago, yesterday and now (fake clock)
      const now=Date.now();
      for(const [i,d] of [[2,20],[1,1],[0,0]]){
        await p.clock.setSystemTime(now-d*864e5);await p.fill('#c-name','DL'+i);await p.keyboard.press('Enter');await sleep(200);
        await p.locator('#list .task',{has:p.locator('.name',{hasText:'DL'+i})}).locator('.check input').click();await sleep(350);await clearToasts(p)}
      await t.ok(p,'rail has the Done log button',()=>!!document.querySelector('#rail #logBtn'));
      await p.click('#logBtn');await sleep(200);
      await t.ok(p,'card opens with Today / Yesterday / Older groups',()=>{const c=document.querySelector('#logCard');const g=[...c.querySelectorAll('.dl-gh')].map(x=>x.firstChild.textContent);
        return !c.hidden&&c.offsetHeight>0&&g[0]==='Today'&&g.includes('Yesterday')&&g.includes('Older')});
      await t.ok(p,'today group lists DL0',()=>document.querySelector('.dl-grp').textContent.includes('DL0'));
      await shot(p,`dl-${w}`);
      await t.ok(p,'row shows the task color bar',()=>!!document.querySelector('.dl-row').style.getPropertyValue('--c'));
      const names=()=>p.evaluate(()=>[...document.querySelectorAll('#logCard .dl-row s')].map(x=>x.textContent));
      await p.fill('#dl-q','DL1');await sleep(150);
      t.is('name filter',JSON.stringify(await names())==='["DL1"]');
      await p.fill('#dl-q','');await p.selectOption('#dl-date','today');await sleep(150);
      t.is('date filter: today',(await names()).every(n=>n!=='DL1'&&n!=='DL2')&&(await names()).includes('DL0'));
      await p.selectOption('#dl-date','day');await sleep(150);
      await t.ok(p,'pick a day shows the date field',()=>!document.querySelector('#dl-day').hidden);
      await p.click('#dl-clear');await sleep(150);
      t.is('clear filters brings all back',(await names()).length>=3);
      const c=await p.evaluate(()=>{const b=document.querySelector('[data-dlcol]');if(!b)return null;b.click();return b.dataset.dlcol});await sleep(150);
      if(c)await t.ok(p,'color filter keeps only that color',col=>[...document.querySelectorAll('#logCard .dl-row')].every(r=>r.style.getPropertyValue('--c').toLowerCase()===col),c);
      if(c)await p.click('#dl-clear');await sleep(100);
      await p.selectOption('#dl-tag','none');await sleep(150);
      t.is('tag filter: no tag keeps the DL tasks',(await names()).includes('DL0'));
      await p.click('#dl-clear');await sleep(100);

      await t.ok(p,'no sideways scroll',noSideScroll);
      await p.click('.dl-row:has-text("DL1") [data-dlundo]');await sleep(450);await clearToasts(p);
      const s=await state(p);
      t.is('undone task is open again',s.tasks.some(x=>x.name==='DL1'&&!x.done));
      t.is('History says it was reopened from the Done log',s.tasks.some(x=>x.name==='DL1'&&(x.log||[]).some(l=>/reopened it from the Done log/.test(l.what))));
      await t.ok(p,'it left the log and is in the open list',()=>!document.querySelector('#logCard').textContent.includes('DL1')&&[...document.querySelectorAll('.task[data-id]')].some(r=>r.textContent.includes('DL1')));
      if(w>1180){await p.click('#logClose');await sleep(150);await t.ok(p,'× closes it',()=>document.querySelector('#logCard').hidden)}
      t.is('no page errors',errs.length===0)||console.log(errs);
    }finally{await ctx.close()}
  }
  await br.close();t.done();
})();
