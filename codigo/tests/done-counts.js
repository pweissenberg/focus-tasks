// v94 (259): Stats counts tasks done in the period by project, subproject, tag, none
const {chromium}=require('playwright');
const {open,sleep,checks}=require('./harness');
const t=checks();
(async()=>{const br=await chromium.launch();
 try{const {p,errs}=await open(br,{w:1440,h:900});
  await p.click('#rail [data-view=stats]');await sleep(300);await p.click('#stats [data-range=year]');
  await sleep(400);
  await t.ok(p,'done counts section shows',()=>!!document.querySelector('#stats .done-counts .dc-grid'));
  await t.ok(p,'counts the seeded done tasks by project and tag',()=>{const c=document.querySelectorAll('.done-counts .dc-card');return +document.querySelector('.dc-head .big').textContent>0&&c.length===3&&c[0].textContent.includes('Research')&&c[2].textContent.includes('Demand')});
  await t.ok(p,'summary says without project / tag / neither',()=>/without a project.*without a tag.*with neither/.test(document.querySelector('.dc-head .sub').textContent));
  await p.locator('#stats .done-counts').screenshot({path:'/tmp/focus-shots/done-counts.png'});
  await p.click('#stats [data-range=day]');await sleep(300);
  await t.ok(p,'day with nothing done says so',()=>{const b=+document.querySelector('.dc-head .big').textContent;return b>0||!!document.querySelector('.done-counts .stats-empty')});
  t.is(errs.length===0,'no page errors '+errs.join(';'));
 }finally{await br.close()}process.exit(t.done?t.done():0)})();
