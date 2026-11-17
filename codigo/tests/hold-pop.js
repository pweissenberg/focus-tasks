// v102 (264): ticking On hold folds the row; the Waiting for popover must open next to the task, not in the top-left corner
const {chromium}=require('playwright');
const {open,sleep,checks,shot}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
  try{
    const {p,errs}=await open(br,{w:1440,h:900,init:()=>{window.FOCUS_HOLD_OPEN=false}});
    const row=p.locator('#list .task:not(.hold):not(.done)').last();const id=await row.getAttribute('data-id');
    await row.hover();await row.locator('[data-act=hold]').click();await sleep(300);
    await t.ok(p,'popover opens next to the folded row',id=>{const pp=document.querySelector('.pop');const r=document.querySelector(`#list .task[data-id="${id}"]`);if(!pp||!r)return false;
      const a=pp.getBoundingClientRect(),b=r.getBoundingClientRect();return r.classList.contains('hold-min')&&(Math.abs(a.top-b.bottom)<40||Math.abs(a.bottom-b.top)<40)&&a.left>20},id);
    await shot(p,'hold-pop');
    t.is('no page errors',!errs.length);
  }finally{await br.close()}t.done()})();
