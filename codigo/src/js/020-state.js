/* ---------- state ---------- */
function T(o){return Object.assign({id:uid(),name:'',color:null,tagId:null,projectId:null,due:'',note:'',onHold:false,done:false,doneAt:null,createdAt:new Date().toISOString(),parentId:null,order:0,longTerm:false,collapsed:false,doneWithParent:null,prio:0,time:'',remind:null,archived:false,steps:[],section:'',col:'',start:'',est:null},o)}
function seed(){
  const tags=[{id:'t_coding',name:'Coding',color:'#d08a3c'},{id:'t_supply',name:'Supply',color:'#4e9a5b'},{id:'t_demand',name:'Demand',color:'#c2553f'},{id:'t_econs',name:'Econs',color:'#3d6fd6'},{id:'t_other',name:'Other',color:'#8a8f98'}];
  const projects=[{id:'p_research',name:'Research'},{id:'p_personal',name:'Personal'}];
  const peru=T({name:'Econs - Peru',tagId:'t_supply',projectId:'p_research',note:'waiting on Leo/Sara',onHold:true,createdAt:'2026-09-29T14:00:00',order:0});
  const bep=T({name:'BeP -> Python',tagId:'t_coding',projectId:'p_research',note:'Waiting on Emanuel/Terrell',onHold:true,createdAt:'2026-10-05T10:00:00',order:1});
  const tz=T({name:'Tanzania',tagId:'t_supply',color:'#3d6fd6',projectId:'p_research',due:'2026-10-16',createdAt:'2026-10-01T09:00:00',order:2});
  const tzc=T({name:'Econs',tagId:'t_econs',projectId:'p_research',note:'To Paul',parentId:tz.id,createdAt:'2026-09-30T16:00:00',order:0});
  const lt1=T({name:'Draft research agenda for 2027',tagId:'t_other',projectId:'p_research',longTerm:true,createdAt:'2026-09-15T09:00:00',order:0});
  const lt2=T({name:'Learn the basics of Rust',tagId:'t_coding',projectId:'p_personal',longTerm:true,createdAt:'2026-08-20T09:00:00',order:1});
  const dn=T({name:'Send Demand slides',tagId:'t_demand',projectId:'p_research',note:'Sent to Sara',done:true,doneAt:'2026-10-03T17:30:00',createdAt:'2026-09-28T11:00:00',due:'2026-10-03'});
  return {tasks:[peru,bep,tz,tzc,lt1,lt2,dn],tags,projects,notes:'',example:true,ui:{}};
}
function normalize(s){
  s.tasks=(s.tasks||[]).map(T); s.tags=s.tags||[]; s.projects=s.projects||[]; s.notes=s.notes||''; s.journal=s.journal||{};delete s.habits;s.templates=s.templates||[];
  s.ui=Object.assign({view:'tasks',tag:'all',project:'all',sort:'manual',dir:1,hideHold:false,timerOpen:innerWidth>1180,statsRange:'week',statsOffset:0},s.ui||{});
  if(innerWidth<=1180){s.ui.timerOpen=false;s.ui.noiseOpen=false}
  s.sessions=(s.sessions||[]).map(x=>Object.assign({id:uid()},x));
  s.projects.forEach((p,i)=>{if(!p.color)p.color=PALETTE[(i+5)%PALETTE.length]});
  if(!s.ui.statsAnchor)s.ui.statsAnchor=todayISO(); if(!s.ui.calAnchor)s.ui.calAnchor=todayISO(); if(!s.ui.statsGroup)s.ui.statsGroup='tag';
  s.timer=Object.assign({taskId:null,durMs:30*60000,remainingMs:30*60000,upMs:0,running:false,segStart:null,mode:'timer',phase:'focus',round:0,timerMs:30*60000},s.timer||{});
  s.noise=Object.assign({type:'white',vol:.5},s.noise||{});
  s.theme=s.theme||null;
  s.prefs=Object.assign({goalMins:0,goalDays:'all',archiveAfter:0},s.prefs||{});
  s.prefs.pomo=Object.assign({focus:25,short:5,long:15,every:4,autoBreak:true},s.prefs.pomo||{});
  return s;
}
function readCache(id){try{const raw=localStorage.getItem(KEY+':'+id);if(raw){const s=JSON.parse(raw);if(s&&Array.isArray(s.tasks))return normalize(s)}}catch(e){}return null}
function load(){
  try{const raw=localStorage.getItem(KEY); if(raw){const s=JSON.parse(raw); if(s&&Array.isArray(s.tasks)) return normalize(s);}}catch(e){}
  return normalize(seed());
}
let S=load();
const CL={enabled:false,on:false,sb:null,uid:null,email:'',prof:{},remote:{},revs:new Set(),shared:{},sent:{},busy:new Set(),leaving:new Set(),sproj:{},psent:{},pbusy:new Set(),pleaving:new Set(),status:''};
let savedTimer,titleAlert=null,kbSel=null;
function save(){
  try{localStorage.setItem(CL.on&&CL.uid?KEY+':'+CL.uid:KEY,JSON.stringify(S))}catch(e){}
  cloudSaved();
  const el=$('#saved'); el.textContent='Saved'; el.classList.add('ok');
  clearTimeout(savedTimer); savedTimer=setTimeout(()=>{el.textContent='Saved automatically';el.classList.remove('ok')},1200);
}
let saveDeb; const saveSoon=()=>{clearTimeout(saveDeb);saveDeb=setTimeout(save,350)};
function commit(){save();render()}

