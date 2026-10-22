// Shared Playwright setup for the Focus Tasks tests (Playwright and Chromium are preinstalled in the cloud container).
// Serves the built ../index.html at http://app/ inside the same skeleton the artifact adds (doctype, charset, viewport),
// answers Google Fonts from ./fonts (the sandbox can't reach them), signs in local test user 1 unless user:0,
// and collects page errors. Screenshots go to /tmp/focus-shots (set SHOTS=... to change).
const fs=require('fs'),path=require('path');
const FONTS=path.join(__dirname,'fonts');
const PAGE=path.join(__dirname,'..','index.html');
const SHOTS=process.env.SHOTS||'/tmp/focus-shots';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fontCss=fs.readFileSync(path.join(FONTS,'fonts.css'),'utf8');
const pageHTML=()=>'<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>'+fs.readFileSync(PAGE,'utf8')+'</body></html>';

async function newContext(br,{w=1440,h=900,dark=false,user=1,init,demo=false,scale=1}={}){
  const ctx=await br.newContext({viewport:{width:w,height:h},colorScheme:dark?'dark':'light',deviceScaleFactor:scale});
  if(!demo)await ctx.addInitScript(()=>{window.FOCUS_NO_DEMO=true}); // no example tasks from User 2 (229) unless a test asks
  const html=pageHTML();
  await ctx.route('http://app/',r=>r.fulfill({contentType:'text/html',body:html}));
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:fontCss}));
  await ctx.route('https://fonts.gstatic.com/**',r=>{const f=path.join(FONTS,new URL(r.request().url()).pathname.slice(1).replace(/\//g,'_'));
    fs.existsSync(f)?r.fulfill({contentType:'font/woff2',body:fs.readFileSync(f)}):r.fulfill({status:404,body:''})});
  if(user)await ctx.addInitScript(u=>{try{sessionStorage.setItem('focus-local-session',JSON.stringify({user:{id:'local-user-'+u,email:'user'+u+'@test.local',user_metadata:{full_name:'User '+u}}}))}catch(e){}},user);
  if(init)await ctx.addInitScript(init);
  return ctx;
}
async function newPage(ctx,{clock}={}){
  const p=await ctx.newPage();p.setDefaultTimeout(5000);if(clock)await p.clock.install();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
  await p.goto('http://app/');await p.evaluate(()=>document.fonts.ready);await sleep(700);
  await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));
  return {p,errs};
}
// one context + page; options: w, h, dark, demo (example tasks sent to User 1), user (0 = signed out, shows the landing), init (init script), clock (fake timers)
async function open(br,opts={}){const ctx=await newContext(br,opts);const {p,errs}=await newPage(ctx,opts);return {ctx,p,errs}}

// tiny check list: ok() runs fn inside the page and records true/false; is() records a value from the test side
function checks(){
  const res=[];
  const log=(v,label)=>{res.push(!!v);console.log((v?'  ok    ':'  FAIL  ')+label);return !!v};
  return {
    async ok(p,label,fn,arg){let v,why='';try{v=await p.evaluate(fn,arg)}catch(e){why=' ('+String(e.message).split('\n')[0]+')'}return log(v,label+why)},
    is:(label,v)=>log(v,label),
    done(){const bad=res.filter(x=>!x).length;console.log(bad?`\n${bad} of ${res.length} checks FAILED`:`\nall ${res.length} checks passed`);process.exitCode=bad?1:0}
  };
}
async function shot(p,name,opts={}){fs.mkdirSync(SHOTS,{recursive:true});const f=path.join(SHOTS,name+'.png');await p.screenshot({path:f,...opts});return f}
const state=(p,u=1)=>p.evaluate(u=>JSON.parse(localStorage.getItem('focus-todo-v1:local-user-'+u)),u);
const noSideScroll=()=>document.documentElement.scrollWidth<=innerWidth;
const clearToasts=p=>p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));

module.exports={open,newContext,newPage,sleep,checks,shot,state,noSideScroll,clearToasts,SHOTS};
