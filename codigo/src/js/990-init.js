async function initCloud(){
  const cfg=window.FOCUS_CONFIG||{};
  if(cfg.url&&cfg.key){try{if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');}catch(e){return}
    CL.sb=window.supabase.createClient(cfg.url,cfg.key)}
  else{CL.sb=localBackend();CL.local=true}
  CL.enabled=true;renderAccount();
  CL.sb.auth.onAuthStateChange((ev,session)=>{setTimeout(()=>{if(session&&(ev==='SIGNED_IN'||ev==='INITIAL_SESSION'))startCloud(session);else{if(ev==='SIGNED_OUT'&&CL.on)stopCloud();CL.authKnown=true;renderAccount()}},0)});
}
$('#acctBtn').onclick=e=>openAccountPop(e.currentTarget);
$('#ldSignIn').onclick=openSignIn;
if(!(window.FOCUS_CONFIG||{}).url)$('#ldTest').innerHTML='Test mode: accounts are kept in this browser. Sign in with <b>1</b> / <b>1</b> in one window and <b>2</b> / <b>2</b> in another to try sharing.';
render();
initCloud();
