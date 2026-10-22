// My team: User 1 manages User 2 (test org chart) and sees User 2's tasks, view only; User 2 has no My team button and is told
// in the account menu; a manager cannot write the other person's data (about 15 s):  node tests/my-team.js
const {chromium}=require('playwright');
const {newContext,sleep,checks,shot,clearToasts}=require('./harness');
const t=checks();
async function win(ctx,u){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},u);
  await p.goto('http://app/');await sleep(900);await clearToasts(p);return {p,errs};
}
(async()=>{const br=await chromium.launch();const ctx=await newContext(br,{w:1440,h:900,user:0});
  try{const {p:b,errs:eb}=await win(ctx,2);
    await sleep(1200);
    t.is('User 2 (not a manager) has no My team button',await b.evaluate(()=>{const x=document.querySelector('#teamBtn');return !!x&&x.hidden}));
    await b.click('#acctBtn');await sleep(250);
    t.is('User 2 is told their manager can see their tasks',await b.evaluate(()=>{const m=document.querySelector('.am-mgr');return !!m&&m.textContent.includes('can see your tasks')}));
    await b.keyboard.press('Escape');await b.close();
    // User 2's saved tasks (written straight into the test database): overdue, on hold, done, open with a note
    const put=(p,extra)=>p.evaluate(extra=>{const d=JSON.parse(localStorage.getItem('focus-localdb')),y=new Date(Date.now()-3*864e5).toISOString().slice(0,10),now=new Date().toISOString();
      const mk=(id,name,o)=>Object.assign({id,name,createdAt:now,done:false,onHold:false,parentId:null,order:0,tagId:null,projectId:null,due:'',note:''},o);
      const tasks=[mk('tm1','Team overdue task',{due:y}),mk('tm2','Team hold task',{onHold:true}),mk('tm3','Team done task',{done:true,doneAt:now}),mk('tm4','Team open task',{note:'Ask finance'}),...(extra?[mk('tm5',extra,{})]:[])];
      const r=d.user_state.find(x=>x.user_id==='local-user-2'&&x.key==='tasks');if(r)r.data=tasks;else d.user_state.push({user_id:'local-user-2',key:'tasks',data:tasks,rev:'t'});
      localStorage.setItem('focus-localdb',JSON.stringify(d))},extra);
    const {p:a,errs:ea}=await win(ctx,1);await put(a,null);await sleep(600);
    t.is('User 1 (manager) has the My team button in the rail',await a.evaluate(()=>{const x=document.querySelector('#teamBtn');return !!x&&!x.hidden}));
    await a.click('#teamBtn');await sleep(700);
    t.is('My team lists User 2',await a.evaluate(()=>{const p=document.querySelector('.myt-person');return !!p&&p.textContent.includes('User 2')}));
    t.is('it shows the overdue task under Overdue',await a.evaluate(()=>{const s=document.querySelector('.myt-overdue');return !!s&&s.textContent.includes('Team overdue task')}));
    t.is('on hold, done and open tasks are in their sections, with the note',await a.evaluate(()=>{const g=c=>(document.querySelector('.myt-'+c)||{}).textContent||'';return g('hold').includes('Team hold task')&&g('done').includes('Team done task')&&g('open').includes('Team open task')&&g('open').includes('Ask finance')}));
    t.is('the counts show 1 overdue and 1 done',await a.evaluate(()=>{const s=[...document.querySelectorAll('.myt-stat')].map(x=>x.textContent);return s[0].startsWith('1')&&s[3].startsWith('1')}));
    t.is('it is view only: no checkboxes or inputs',await a.evaluate(()=>!document.querySelector('.myteam input, .myteam select')));
    await shot(a,'my-team');
    // new work by User 2 shows after Refresh
    await put(a,'Team later task');
    await a.click('[data-mtref]');await sleep(600);
    t.is('Refresh brings in new tasks',await a.evaluate(()=>document.querySelector('.myt-main').textContent.includes('Team later task')));
    // the manager's own list is untouched and the backend refuses writes to User 2's data
    t.is("User 2's tasks are not in User 1's own list",await a.evaluate(()=>!JSON.parse(localStorage.getItem('focus-todo-v1:local-user-1')).tasks.some(x=>x.name.startsWith('Team '))));
    const src=require('fs').readFileSync(require('path').join(__dirname,'..','src','js','220-local-backend.js'),'utf8');
    const R=await a.evaluate(`(async()=>{${src};const sb=localBackend();
      const up=await sb.from('user_state').upsert([{user_id:'local-user-2',key:'tasks',data:[],rev:'x'}]);
      await sb.from('user_state').update({data:[]}).eq('user_id','local-user-2');await sb.from('user_state').delete().eq('user_id','local-user-2');
      const {data}=await sb.from('user_state').select('*').eq('user_id','local-user-2');
      return {refused:!!up.error,kept:(data.find(x=>x.key==='tasks')||{data:[]}).data.length,keys:data.map(x=>x.key)}})()`);
    t.is("a manager cannot overwrite, change or delete the other person's tasks",R.refused&&R.kept===5);
    t.is('a manager reads only tasks, tags and projects',R.keys.length>0&&R.keys.every(k=>['tasks','tags','projects'].includes(k)));
    await a.keyboard.press('Escape');
    const errs=[...ea,...eb].filter(e=>!/Not allowed/.test(e));t.is('no page errors',!errs.length);if(errs.length)console.log(errs.join('\n'));
  }catch(e){t.is('ran: '+String(e.message).split('\n').slice(0,2).join(' '),false)}
  await br.close();t.done()})();
