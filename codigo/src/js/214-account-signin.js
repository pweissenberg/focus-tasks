/* account button + sign in */
function renderAccount(){
  document.body.classList.toggle('show-landing',!!(CL.enabled&&CL.authKnown&&!CL.on&&!CL.starting));
  const b=$('#acctBtn');if(!b)return;b.hidden=!CL.on;$('#rail').classList.toggle('signed',!!CL.on);
  b.dataset.sync=CL.status||'';
  if(CL.on){const me=CL.prof[CL.uid]||{};b.innerHTML=avHTML(CL.uid,null,true);b.title=(me.name||'Account')+' (account and settings)';b.setAttribute('aria-label',b.title)}
}
function openSignIn(){
  closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<form class="modal auth" role="dialog" aria-modal="true" aria-labelledby="au-h" autocomplete="on">
    <h2 id="au-h">Sign in to Focus</h2>
    <p class="au-sub">Your tasks sync across devices, and you can share tasks with other people.</p>
    <button type="button" class="btn gbtn" data-google><svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</button>
    <div class="au-or"><span>or with email</span></div>
    <label class="fld" id="au-name-w" hidden><span>NAME</span><input id="au-name" type="text" autocomplete="name"></label>
    <label class="fld"><span>EMAIL</span><input id="au-email" type="email" autocomplete="email" required></label>
    <label class="fld"><span>PASSWORD</span><input id="au-pass" type="password" autocomplete="current-password" minlength="6" required></label>
    <p class="au-msg" id="au-msg" role="status"></p>
    <div class="modal-actions"><button type="button" class="linkbtn" data-mode>Create an account</button><button type="button" class="btn" data-x>Cancel</button><button class="btn primary" id="au-go">Sign in</button></div></form>`;
  document.body.appendChild(back);modal=back;
  const f=back.querySelector('form'),msg=f.querySelector('#au-msg');let signup=false;
  if(CL.local){f.querySelector('[data-google]').remove();f.querySelector('.au-or').remove();const em=f.querySelector('#au-email');em.type='text';em.autocomplete='username';em.previousElementSibling.textContent='USER';
    f.querySelector('.au-sub').innerHTML='Test mode: accounts live in this browser only.<br>Use user <b>1</b> / password <b>1</b>, or user <b>2</b> / password <b>2</b>.';f.querySelector('#au-pass').minLength=1}
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  f.querySelector('[data-x]').onclick=closeModal;
  if(!CL.local)f.querySelector('[data-google]').onclick=async()=>{const {error}=await CL.sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)msg.textContent=error.message};
  f.querySelector('[data-mode]').onclick=e=>{signup=!signup;f.querySelector('#au-name-w').hidden=!signup;f.querySelector('#au-h').textContent=signup?'Create your account':'Sign in to Focus';
    f.querySelector('#au-go').textContent=signup?'Create account':'Sign in';e.target.textContent=signup?'I already have an account':'Create an account';msg.textContent=''};
  f.onsubmit=async e=>{e.preventDefault();const email=f.querySelector('#au-email').value.trim(),password=f.querySelector('#au-pass').value,go=f.querySelector('#au-go');
    go.disabled=true;msg.textContent=signup?'Creating your account...':'Signing in...';
    const r=signup?await CL.sb.auth.signUp({email,password,options:{data:{full_name:f.querySelector('#au-name').value.trim()},emailRedirectTo:location.origin+location.pathname}}):await CL.sb.auth.signInWithPassword({email,password});
    go.disabled=false;
    if(r.error){msg.textContent=r.error.message;return}
    if(!r.data.session){msg.textContent='Check your email and click the link to confirm your account.';return}
    toast(`Signed in as ${(r.data.session.user.user_metadata||{}).full_name||email}.`);
    closeModal()};
  setTimeout(()=>f.querySelector('#au-email').focus(),0);
}
function openAccountPop(anchor){
  if(!CL.on){openSignIn();return}
  if(pop&&pop.anchor===anchor){closePop();return}
  const me=CL.prof[CL.uid]||{};
  openPop(anchor,`<div class="acct-menu" role="menu"><div class="am-head">${avHTML(CL.uid,null,true)}<div><strong>${esc(me.name||'You')}</strong><span>${esc(CL.email)}</span></div></div>
    <button type="button" role="menuitem" data-settings><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>Settings</button>
    <button type="button" role="menuitem" data-friends><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>Friends</button>
    <button type="button" role="menuitem" data-keys><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/></svg>Keyboard shortcuts<kbd>?</kbd></button>
    <button type="button" role="menuitem" data-out><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</button></div>`,el=>{
    el.classList.add('pop-menu');
    const r=anchor.getBoundingClientRect();el.style.left=Math.max(8,r.right-el.offsetWidth)+'px';
    el.querySelector('[data-settings]').onclick=()=>{closePop();openSettings()};
    el.querySelector('[data-friends]').onclick=()=>{closePop();openFriends()};
    el.querySelector('[data-keys]').onclick=()=>{closePop();openShortcuts()};
    el.querySelector('[data-out]').onclick=async()=>{closePop();await CL.sb.auth.signOut();stopCloud()};
  });
}
function openSettings(){
  closePop();closeModal();
  const me=CL.prof[CL.uid]||{},n=S.tasks.filter(t=>t.shared&&!t.done).length;
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<form class="modal settings" role="dialog" aria-modal="true" aria-labelledby="st-h" autocomplete="off">
    <h2 id="st-h">Settings</h2>
    <div class="st-photo">${avHTML(CL.uid,null,true)}<div><label class="btn sm">Change photo<input type="file" accept="image/*" id="st-file" hidden></label>${me.avatar_url?'<button type="button" class="linkbtn" data-rmphoto>Remove</button>':''}</div></div>
    <label class="fld"><span>NAME</span><input id="st-name" type="text" value="${esc(me.name||'')}" maxlength="60"></label>
    <label class="fld"><span>${CL.local?'USER':'EMAIL'}</span><input type="text" value="${esc(CL.email)}" disabled></label>
    <p class="sp-hint">${CL.status==='err'?`<b class="err">Not synced: ${esc(CL.err)}</b>`:CL.local?'Test mode: this account lives in this browser only.':'Your tasks are saved to your account and sync on every device.'}${n?` You have ${n} open shared task${n>1?'s':''}.`:''}</p>
    <div class="modal-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save</button></div></form>`;
  document.body.appendChild(back);modal=back;
  const f=back.querySelector('form');let photo;
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  f.querySelector('[data-x]').onclick=closeModal;
  const showPhoto=url=>{const av=f.querySelector('.st-photo .av');av.innerHTML=url?`<img src="${esc(url)}" alt="">`:esc((f.querySelector('#st-name').value||'?').trim().charAt(0).toUpperCase())};
  f.querySelector('#st-file').onchange=async e=>{let file=e.target.files[0];if(!file)return;file=await shrinkImage(file);photo=file;showPhoto(URL.createObjectURL(file))};
  const rm=f.querySelector('[data-rmphoto]');if(rm)rm.onclick=()=>{photo=null;showPhoto('');rm.remove()};
  f.onsubmit=async e=>{e.preventDefault();const nameIn=f.querySelector('#st-name'),name=nameIn.value.trim();
    if(!name){nameIn.classList.add('invalid');nameIn.focus();return}
    const upd={name,updated_at:new Date().toISOString()};
    if(photo){const path=`${CL.uid}/avatar-${Date.now()}.jpg`;
      const {error}=await CL.sb.storage.from('avatars').upload(path,photo,{upsert:true,contentType:photo.type||'image/jpeg'});
      if(error){toast('Could not upload the photo: '+error.message);return}
      upd.avatar_url=CL.sb.storage.from('avatars').getPublicUrl(path).data.publicUrl}
    else if(photo===null)upd.avatar_url=null;
    const {error}=await CL.sb.from('profiles').update(upd).eq('id',CL.uid);
    if(error){toast('Could not save: '+error.message);return}
    CL.prof[CL.uid]=Object.assign({},CL.prof[CL.uid],upd);closeModal();render();renderAccount();toast('Settings saved.')};
  setTimeout(()=>f.querySelector('#st-name').focus(),0);
}
function shrinkImage(file){return new Promise(ok=>{const img=new Image();img.onload=()=>{const n=160,c=document.createElement('canvas');c.width=c.height=n;const s=Math.min(img.width,img.height);
  c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,n,n);c.toBlob(b=>ok(b||file),'image/jpeg',.85)};img.onerror=()=>ok(file);img.src=URL.createObjectURL(file)})}
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
