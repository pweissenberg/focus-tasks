// Free text box grows with its text, no scrollbar (about 8 s)
const {chromium}=require('playwright');
const {open,sleep,checks,shot}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(id=>document.querySelector(`[data-pgo="${id}"]`).click(),pid);await sleep(300);
    await a.click('[data-ptab=free]');await a.click('[data-cvadd=text]');await sleep(150);
    await a.keyboard.type('line one\nline two\nline three\nline four\nline five\nline six\nline seven');await sleep(300);
    t.is('text box has no scrollbar and shows all text',await a.evaluate(()=>{const x=[...document.querySelectorAll('.cv-item textarea')].pop();return getComputedStyle(x).overflowY==='hidden'&&x.scrollHeight<=x.clientHeight+1}));
    await shot(a,'free-textfit');t.is('no page errors',!errs.length);
  }catch(e){t.is('ran: '+e.message.split('\n')[0],false)}
  await br.close();t.done()})();
