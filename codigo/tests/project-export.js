// Export a project (.json backup and .md readable file) and import the backup back as a new project (about 10 s):  node tests/project-export.js
const {chromium}=require('playwright');
const {open,sleep,checks,shot,state}=require('./harness');
const fs=require('fs');
const t=checks();
(async()=>{const br=await chromium.launch();const {p:a,errs}=await open(br,{w:1280,h:860});
  try{
    const pid=await a.evaluate(()=>document.querySelector('[data-pgo]').dataset.pgo);
    await a.evaluate(i=>document.querySelector(`[data-pgo="${i}"]`).click(),pid);await sleep(300);
    let s=await state(a);const p=s.projects.find(x=>x.id===pid),n=s.tasks.filter(x=>x.projectId===pid&&!x.stepOf).length;
    t.is('Export sits in the project header',!!await a.$('[data-pexp]'));
    await a.click('[data-pexp]');await sleep(150);await shot(a,'export-menu');
    let [dl]=await Promise.all([a.waitForEvent('download'),a.click('[data-pexpk="json"]')]);
    const jf='/tmp/focus-shots/export.json';await dl.saveAs(jf);const B=JSON.parse(fs.readFileSync(jf,'utf8'));
    t.is('the backup has the project and all its tasks',B.format==='focus-tasks-project'&&B.project.name===p.name&&B.tasks.filter(x=>!x.stepOf).length===n&&/\.json$/.test(dl.suggestedFilename()));
    await a.click('[data-pexp]');await sleep(150);
    [dl]=await Promise.all([a.waitForEvent('download'),a.click('[data-pexpk="md"]')]);
    const mf='/tmp/focus-shots/export.md';await dl.saveAs(mf);const md=fs.readFileSync(mf,'utf8');
    const one=s.tasks.find(x=>x.projectId===pid&&!x.stepOf);
    t.is('the readable file lists the tasks as a checklist',md.startsWith(`# ${p.name}`)&&md.includes(`] ${one.name}`));
    await a.setInputFiles('#importFile',jf);await sleep(500);
    s=await state(a);const np=s.projects.find(x=>x.name===p.name+' (imported)');
    t.is('import makes a new project with the same tasks and new ids',!!np&&np.id!==pid&&s.tasks.filter(x=>x.projectId===np.id&&!x.stepOf).length===n&&!s.tasks.some(x=>x.projectId===np.id&&B.tasks.some(y=>y.id===x.id)));
    t.is('subtasks keep their parent inside the copy',s.tasks.filter(x=>x.projectId===np.id&&x.parentId).every(x=>s.tasks.find(y=>y.id===x.parentId).projectId===np.id));
    t.is('it opens the imported project',await a.evaluate(()=>document.querySelector('#projPage')&&document.querySelector('#projPage').textContent.includes('(imported)')));
    t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
