/* ---------- accounts + sharing (Supabase; off when no config) ---------- */
const SYNC_KEYS=['tasks','tags','projects','notes','sessions','timer','noise','theme','example','prefs','friends','templates','journal'];
const shareIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6"/></svg>';
const AV_COLORS=['#3d6fd6','#4e9a5b','#d08a3c','#c2553f','#8e5cc9','#2a9d9a','#c9a227','#d0607f'];
function colorFor(k){let h=0;k=String(k||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;return AV_COLORS[h%AV_COLORS.length]}
const isEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
function personName(id){const p=CL.prof[id];return id===CL.uid?'You':p?(p.name||p.email||'Someone'):'Someone'}
function avHTML(id,email,big){
  const p=id?CL.prof[id]:null,name=id?personName(id):email,ini=((p&&(p.name||p.email))||email||'?').trim().split(/[\s@.]+/).filter(Boolean).slice(0,2).map(w=>w.charAt(0)).join('').toUpperCase()||'?';
  return `<i class="av${id?'':' pending'}${big?' big':''}" style="--ac:${colorFor(id||email)}" title="${esc(id?name:email+' (not signed in yet)')}">${p&&p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer">`:esc(ini)}</i>`;
}
function avStack(t){
  if(!CL.on||!t.shared||isSharedProj(t.projectId))return''; // the project page shows its members
  const ids=(t.members||[]).filter(m=>m!==CL.uid),em=t.invited||[];
  if(!ids.length&&!em.length)return'';
  const all=[...ids.map(i=>[i,null]),...em.map(e=>[null,e])],names=all.map(([i,e])=>i?personName(i):e);
  return `<button class="avs" type="button" data-act="share" title="Shared with ${esc(names.join(', '))}">${all.slice(0,3).map(([i,e])=>avHTML(i,e)).join('')}${all.length>3?`<span class="more">+${all.length-3}</span>`:''}</button>`;
}
function setSync(st,msg){CL.status=st;CL.err=msg||'';const d=$('#acctBtn');if(d)d.dataset.sync=st}
function cloudSaved(){
  if(!CL.on||CL.applying)return;
  clearTimeout(CL.pushT);CL.pushT=setTimeout(pushState,1200);
  clearTimeout(CL.shT);CL.shT=setTimeout(async()=>{await pushShared();await pushProjects()},700);
}
async function pushState(){
  if(!CL.on)return;if(CL.pushing){CL.again=true;return}CL.pushing=true;
  try{
    const rows=[],js={};
    for(const k of SYNC_KEYS){js[k]=JSON.stringify(S[k]===undefined?null:S[k]);if(CL.remote[k]===js[k])continue;
      const rev=uid();CL.revs.add(rev);rows.push({user_id:CL.uid,key:k,data:JSON.parse(js[k]),rev,updated_at:new Date().toISOString()})}
    if(rows.length){setSync('busy');const {error}=await CL.sb.from('user_state').upsert(rows);if(error)throw error;rows.forEach(r=>CL.remote[r.key]=js[r.key])}
    setSync('ok');
  }catch(e){setSync('err',e.message||String(e))}
  CL.pushing=false;if(CL.again){CL.again=false;pushState()}
}
function applyRemoteRows(rows){
  let ch=false;
  rows.forEach(r=>{if(!r||!r.key||!SYNC_KEYS.includes(r.key)||CL.revs.has(r.rev))return;const j=JSON.stringify(r.data===undefined?null:r.data);if(CL.remote[r.key]===j)return;
    CL.remote[r.key]=j;S[r.key]=JSON.parse(j);ch=true});
  if(!ch)return;
  S=normalize(S);CL.applying=true;save();CL.applying=false;render();
}
async function pullState(){
  if(!CL.on)return;
  const {data,error}=await CL.sb.from('user_state').select('key,data,rev').eq('user_id',CL.uid);
  if(!error&&data)applyRemoteRows(data);
}
function mergeLocal(local){
  ['tasks','tags','projects','sessions'].forEach(k=>{const have=new Set((S[k]||[]).map(x=>x.id));(local[k]||[]).forEach(x=>{if(!have.has(x.id))S[k].push(x)})});
  if(local.notes&&!(S.notes||'').includes(local.notes))S.notes=S.notes?S.notes+'\n\n'+local.notes:local.notes;
  S=normalize(S);
}
async function startCloud(session){
  if(CL.starting||(CL.on&&CL.uid===session.user.id))return;CL.starting=true;
  try{
    const u=session.user,md=u.user_metadata||{};
    CL.uid=u.id;CL.email=(u.email||'').toLowerCase();CL.authKnown=true;setSync('busy');renderAccount();
    const {data:prof}=await CL.sb.from('profiles').select('*').eq('id',CL.uid).maybeSingle();
    const me={id:CL.uid,email:CL.email,name:(prof&&prof.name)||md.full_name||md.name||CL.email.split('@')[0],avatar_url:(prof&&prof.avatar_url)||md.avatar_url||md.picture||null,updated_at:new Date().toISOString()};
    await CL.sb.from('profiles').upsert(me);CL.prof[CL.uid]=me;
    const {data:rows,error}=await CL.sb.from('user_state').select('key,data,rev').eq('user_id',CL.uid);
    if(error)throw error;
    const flag='focus-synced-'+CL.uid;let synced=false;try{synced=!!localStorage.getItem(flag)}catch(e){}
    // the data already in this browser goes to the first account that signs in here; other accounts start clean
    let owner=null;try{owner=localStorage.getItem('focus-browser-owner')}catch(e){}
    if(!owner){try{localStorage.setItem('focus-browser-owner',CL.uid)}catch(e){}}
    else if(owner!==CL.uid&&!synced){S=normalize({tasks:[],tags:seed().tags,projects:[],notes:'',example:false,ui:S.ui})}
    else if(owner!==CL.uid||S.owner!==CL.uid){const c=readCache(CL.uid);if(c)S=c}
    S.owner=CL.uid;
    if(rows.length){
      const local=JSON.parse(JSON.stringify(S));
      rows.forEach(r=>{if(SYNC_KEYS.includes(r.key)){CL.remote[r.key]=JSON.stringify(r.data);S[r.key]=JSON.parse(CL.remote[r.key])}});
      S=normalize(S);
      if(!synced&&!local.example)mergeLocal(local);
    }
    try{localStorage.setItem(flag,'1')}catch(e){}
    CL.on=true;CL.applying=true;save();CL.applying=false;render();setTimeout(()=>{checkReminders();if(autoArchive())commit()},800);
    await pushState();
    CL.ch=CL.sb.channel('focus-'+CL.uid)
      .on('postgres_changes',{event:'*',schema:'public',table:'user_state',filter:'user_id=eq.'+CL.uid},p=>{if(p.new&&p.new.key){if(p.new.data===undefined)pullState();else applyRemoteRows([p.new])}})
      .on('postgres_changes',{event:'*',schema:'public',table:'shared_tasks'},()=>reconcileSoon())
      .on('postgres_changes',{event:'*',schema:'public',table:'shared_projects'},()=>reconcileSoon())
      .subscribe();
    await reconcileShared();
    clearInterval(CL.poll);CL.poll=setInterval(()=>{reconcileShared()},60000);
    if(!synced&&!rows.length)toast('Signed in. Your tasks are now saved to your account.');
  }catch(e){setSync('err',e.message||String(e));toast('Could not load your account: '+(e.message||e))}
  CL.starting=false;renderAccount();
}
function stopCloud(){
  if(CL.ch){CL.sb.removeChannel(CL.ch);CL.ch=null}
  clearInterval(CL.poll);CL.on=false;CL.uid=null;CL.email='';CL.remote={};CL.shared={};CL.sent={};CL.sproj={};CL.psent={};
  const ui=S.ui;S=load();S.ui=ui;render();renderAccount();
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CL.on){pullState();reconcileShared()}});
addEventListener('focus',()=>{if(CL.on){pullState();reconcileShared()}});

