/* ---------- local test backend: same calls as Supabase, kept in this browser (used when no server is configured) ---------- */
function localBackend(){
  const DBK='focus-localdb',EVK='focus-localdb-evt',SESK='focus-local-session';
  const TEST=[{id:'local-user-1',login:'1',password:'1',email:'user1@test.local',name:'User 1'},{id:'local-user-2',login:'2',password:'2',email:'user2@test.local',name:'User 2'}];
  const rd=()=>{let d=null;try{d=JSON.parse(localStorage.getItem(DBK)||'null')}catch(e){}d=d||{};
    ['profiles','user_state','shared_tasks','shared_projects','accounts','org'].forEach(k=>d[k]=d[k]||[]);
    // test org chart: User 1 is User 2's manager
    if(!d.orgSeeded){d.orgSeeded=true;if(!d.org.some(o=>o.user_id==='local-user-2'))d.org.push({user_id:'local-user-2',manager_id:'local-user-1'})}
    TEST.forEach(u=>{if(!d.accounts.some(a=>a.id===u.id))d.accounts.push(u)});return d};
  const wr=d=>{try{localStorage.setItem(DBK,JSON.stringify(d))}catch(e){return e}};
  let memSess=null;const ss={get(){try{return sessionStorage.getItem(SESK)}catch(e){return memSess}},set(v){memSess=v;try{sessionStorage.setItem(SESK,v)}catch(e){}},del(){memSess=null;try{ss.del()}catch(e){}}};
  const sess=()=>{try{return JSON.parse(ss.get()||'null')}catch(e){return null}};
  const mkSession=a=>({user:{id:a.id,email:a.email,user_metadata:{full_name:a.name}}});
  const listeners=[];let authCb=null;
  const fire=evs=>{evs.forEach(e=>listeners.forEach(f=>f(e)));try{localStorage.setItem(EVK,JSON.stringify({n:Math.random(),evs}))}catch(e){}};
  addEventListener('storage',e=>{if(e.key===EVK&&e.newValue){try{JSON.parse(e.newValue).evs.forEach(ev=>listeners.forEach(f=>f(ev)))}catch(x){}}});
  // a manager (or their manager, up the chain) can read the tasks, tags and projects of the people under them
  const manages=(d,boss,who)=>{let m=who,n=0;while(n++<20){const o=d.org.find(x=>x.user_id===m);if(!o||!o.manager_id)return false;if(o.manager_id===boss)return true;m=o.manager_id}return false};
  const see=(t,r,s,d)=>{const u=s.user.id,em=s.user.email;return t==='user_state'?r.user_id===u||(['tasks','tags','projects'].includes(r.key)&&manages(d,u,r.user_id)):t==='shared_tasks'||t==='shared_projects'?((r.members||[]).includes(u)||(r.invited||[]).includes(em)||r.passed_by===u):true};
  const match=(r,fs)=>fs.every(([k,c,v])=>k==='eq'?r[c]===v:v.includes(r[c]));
  const pk=(t,r)=>t==='user_state'?r.user_id+'|'+r.key:r.id;
  function run(st){
    const s=sess();if(!s)return{data:null,error:{message:'Not signed in'}};
    const d=rd(),T=d[st.table],vis=T.filter(r=>see(st.table,r,s,d));
    if(st.op==='select'){const out=JSON.parse(JSON.stringify(vis.filter(r=>match(r,st.filters))));return{data:st.single?(out[0]||null):out,error:null}}
    const evs=[];const clone=x=>JSON.parse(JSON.stringify(x));
    if(st.op==='upsert'||st.op==='insert'){
      for(const r of [].concat(st.body)){
        if(st.table==='user_state'&&r.user_id!==s.user.id)return{error:{message:'Not allowed'}};
        if(st.table==='profiles'&&r.id!==s.user.id)return{error:{message:'Not allowed'}};
        if(st.table==='org')return{error:{message:'Not allowed'}};
        if((st.table==='shared_tasks'||st.table==='shared_projects')&&!((r.members||[]).includes(s.user.id)||r.passed_by===s.user.id))return{error:{message:'Not allowed'}};
        const i=T.findIndex(x=>pk(st.table,x)===pk(st.table,r));
        if(i>=0&&st.op==='insert')return{error:{message:'Already exists'}};
        const base=st.table==='shared_tasks'||st.table==='shared_projects'?{members:[],invited:[]}:{};
        const nr=Object.assign(base,i>=0?T[i]:{},clone(r));if(i>=0)T[i]=nr;else T.push(nr);
        evs.push({table:st.table,eventType:i>=0?'UPDATE':'INSERT',new:nr});
      }
    }else if(st.op==='update'){
      vis.filter(r=>match(r,st.filters)).forEach(r=>{if(st.table==='profiles'&&r.id!==s.user.id)return;if(st.table==='user_state'&&r.user_id!==s.user.id)return;Object.assign(r,clone(st.body));evs.push({table:st.table,eventType:'UPDATE',new:r})});
    }else if(st.op==='delete'){
      vis.filter(r=>match(r,st.filters)&&!(st.table==='user_state'&&r.user_id!==s.user.id)).forEach(r=>{T.splice(T.indexOf(r),1);evs.push({table:st.table,eventType:'DELETE',new:{},old:{id:r.id}})});
    }
    const err=wr(d);if(err)return{data:null,error:{message:'Browser storage is full'}};
    setTimeout(()=>fire(evs),0);return{data:null,error:null};
  }
  function from(table){
    const st={table,op:'select',filters:[],single:false,body:null};
    const b={select(){return b},eq(c,v){st.filters.push(['eq',c,v]);return b},in(c,v){st.filters.push(['in',c,v]);return b},
      maybeSingle(){st.single=true;return b},upsert(x){st.op='upsert';st.body=x;return b},insert(x){st.op='insert';st.body=x;return b},
      update(x){st.op='update';st.body=x;return b},delete(){st.op='delete';return b},
      then(ok,no){return Promise.resolve().then(()=>run(st)).then(ok,no)}};
    return b;
  }
  const signal=(ev,s)=>setTimeout(()=>authCb&&authCb(ev,s),0);
  return{local:true,testAccounts:TEST.map(u=>({login:u.login,password:u.password,name:u.name})),
    auth:{
      onAuthStateChange(cb){authCb=cb;signal('INITIAL_SESSION',sess());return{data:{subscription:{unsubscribe(){authCb=null}}}}},
      async signInWithPassword({email,password}){const q=String(email||'').trim().toLowerCase(),a=rd().accounts.find(x=>x.login===q||x.email===q);
        if(!a||a.password!==password)return{data:{session:null},error:{message:'Wrong user or password.'}};
        const s=mkSession(a);ss.set(JSON.stringify(s));signal('SIGNED_IN',s);return{data:{session:s},error:null}},
      async signUp({email,password,options}){const d=rd(),q=String(email||'').trim().toLowerCase();
        if(!q||!password)return{data:{session:null},error:{message:'Type a user name and a password.'}};
        if(d.accounts.some(x=>x.login===q||x.email===q))return{data:{session:null},error:{message:'That user already exists.'}};
        const a={id:'local-'+uid(),login:q,password,email:q.includes('@')?q:q+'@test.local',name:(options&&options.data&&options.data.full_name)||q};
        d.accounts.push(a);wr(d);const s=mkSession(a);ss.set(JSON.stringify(s));signal('SIGNED_IN',s);return{data:{session:s},error:null}},
      async signOut(){ss.del();signal('SIGNED_OUT',null);return{error:null}},
      async signInWithOAuth(){return{error:{message:'Google sign-in is not available in test mode.'}}}
    },
    from,
    channel(){const hs=[],ch={on(_,f,h){hs.push([f,h]);return ch},subscribe(){ch.fn=e=>hs.forEach(([f,h])=>{if(f.table!==e.table)return;if(f.filter){const [c,v]=f.filter.split('=eq.');if(!e.new||String(e.new[c])!==v)return}h(e)});listeners.push(ch.fn);return ch}};return ch},
    removeChannel(ch){const i=listeners.indexOf(ch&&ch.fn);if(i>=0)listeners.splice(i,1)},
    storage:{from(){return{
      async upload(path,file){const url=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(file)});try{localStorage.setItem('focus-localfile:'+path,url)}catch(e){return{error:{message:'Browser storage is full'}}}return{error:null}},
      getPublicUrl(path){return{data:{publicUrl:localStorage.getItem('focus-localfile:'+path)||''}}}}}}
  };
}
