// repeat options: some days of the week, weekly on a day, monthly on day N / first Friday, from the edit window and the add bar (about 10 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state,clearToasts}=require('./harness');
const t=checks();
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const firstFri=(y,m)=>{const d=new Date(y,m,1);while(d.getDay()!==5)d.setDate(d.getDate()+1);return d};
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const add=async n=>{await a.fill('#c-name',n);await a.keyboard.press('Enter');await sleep(200);return a.locator('#list .task',{has:a.locator('.name',{hasText:n})})};
    const edit=async row=>{await row.hover();await row.locator('[data-act=edit]').click();await sleep(150)};
    const task=async n=>(await state(a)).tasks.find(x=>x.name===n&&!x.done);
    // monthly, first Friday
    let r=await add('Pay rent');await edit(r);
    await a.selectOption('#ed-rep','monthly');await sleep(100);
    t.is('monthly shows day / weekday choices',!!await a.$('.rep-x [data-rmday]')&&!!await a.$('.rep-x [data-rnth]'));
    await a.selectOption('.rep-x [data-rnth]','1');await a.selectOption('.rep-x [data-rnwd]','5');await sleep(100);
    await shot(a,'repeat-monthly');
    await a.click('.modal .btn.primary');await sleep(250);
    let x=await task('Pay rent'),now=new Date(),ff=firstFri(now.getFullYear(),now.getMonth());if(iso(ff)<iso(now))ff=firstFri(now.getFullYear(),now.getMonth()+1);
    t.is('first Friday saved, due on the next first Friday',x.repeat.freq==='monthly'&&x.repeat.nth===1&&x.repeat.nwd===5&&x.due===iso(ff));
    await t.ok(a,'row says the first Friday of every month',()=>document.querySelector('#list').textContent.includes('The first Friday of every month'));
    await a.locator('#list .task',{has:a.locator('.name',{hasText:'Pay rent'})}).locator('.check input').click();await sleep(300);await clearToasts(a);
    x=await task('Pay rent');const nf=firstFri(ff.getFullYear(),ff.getMonth()+1);
    t.is('done: the next one is due the first Friday of the next month',!!x&&x.due===iso(nf));
    // some days of the week
    r=await add('Gym');await edit(r);await a.selectOption('#ed-rep','days');await sleep(100);
    const today=new Date().getDay();
    for(const d of [1,3,today])await a.click(`.rep-x [data-rwd="${d}"]`);await sleep(100);
    await a.click('.modal .btn.primary');await sleep(250);
    x=await task('Gym');const want=new Set([1,3]);if(today===1||today===3)want.delete(today);
    t.is('some days: Mon and Wed saved',x.repeat.freq==='days'&&x.repeat.days.length===want.size&&x.repeat.days.every(d=>want.has(d)));
    t.is('some days: due on the next of those days',want.has(new Date(x.due+'T12:00').getDay()));
    // weekly on Tuesday
    r=await add('Team call');await edit(r);await a.selectOption('#ed-rep','weekly');await sleep(100);await a.click('.rep-x [data-rwd="2"]');await a.click('.modal .btn.primary');await sleep(250);
    x=await task('Team call');t.is('weekly on Tuesday, due a Tuesday',x.repeat.wd===2&&new Date(x.due+'T12:00').getDay()===2);
    await t.ok(a,'row says Every Tuesday',()=>document.querySelector('#list').textContent.includes('Every Tuesday'));
    // add bar: monthly on the last day
    await a.click('#composer .cgear');await sleep(150);await a.selectOption('#c-rep','monthly');await sleep(100);
    t.is('add bar shows the monthly choices',!!await a.$('#composer .rep-x [data-rmday]'));
    await a.selectOption('#composer .rep-x [data-rmday]','-1');await sleep(100);
    await shot(a,'repeat-addbar');
    await add('Close the month');
    x=await task('Close the month');const L=new Date(now.getFullYear(),now.getMonth()+1,0);
    t.is('add bar: last day of every month, due the last day',x.repeat.mday===-1&&x.due===iso(L));
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){console.log(e.message.split('\n').slice(0,6).join('\n'));t.is('ran without crashing',false)}
  await br.close();t.done();
})();
