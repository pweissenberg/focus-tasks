/* ---------- friends: a list on the account, quick picks in a project's "Add person" ---------- */
// S.friends = [{id} for people with an account, {email} for someone who hasn't signed up yet]; follows the account (SYNC_KEYS)
const friendsList=()=>S.friends||(S.friends=[]);
const isFriend=c=>friendsList().some(f=>c.id?f.id===c.id:f.email===c.email);
function addFriend(c){
  if(!c||c.id===CL.uid||isFriend(c))return;
  friendsList().push(c.id?{id:c.id}:{email:c.email});commit();
  toast(`${c.id?personName(c.id):c.email} is now your friend.`);
}
function removeFriend(c){
  const L=friendsList(),i=L.findIndex(f=>c.id?f.id===c.id:f.email===c.email);if(i<0)return;
  const f=L.splice(i,1)[0];commit();toast(`Removed ${f.id?personName(f.id):f.email} from friends.`,()=>{friendsList().splice(i,0,f);commit()});
}
// friends that are not in the project yet, for the project's "Add person" list
function friendCands(mem,inv){
  return friendsList().filter(f=>f.id?!mem.includes(f.id)&&CL.prof[f.id]:!inv.includes(f.email)).map(f=>Object.assign({friend:true},f));
}
function openFriends(){
  if(!CL.on){openSignIn();return}
  closePop();closeModal();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal friends share-pop" role="dialog" aria-modal="true" aria-labelledby="fr-h">
    <h2 id="fr-h">Friends</h2>
    <p class="sp-hint">Friends show up first when you add people to a project.</p>
    <div class="sp-mem fr-list"></div>
    <input type="text" id="fr-q" placeholder="Add a friend by name or email" autocomplete="off" aria-label="Friend's name or email">
    <div class="sp-res fr-res"></div>
    <div class="modal-actions"><button type="button" class="btn primary" data-x>Done</button></div></div>`;
  document.body.appendChild(back);modal=back;
  const el=back.querySelector('.modal'),inp=el.querySelector('#fr-q');
  const draw=()=>{
    const L=friendsList();
    el.querySelector('.fr-list').innerHTML=L.length?L.map((f,i)=>`<div class="sp-row">${avHTML(f.id||null,f.email)}<span class="sp-n">${esc(f.id?personName(f.id):f.email)}${f.id&&CL.prof[f.id]&&CL.prof[f.id].email?` <em>${esc(CL.prof[f.id].email)}</em>`:' <em>not signed up yet</em>'}</span><button type="button" class="linkbtn" data-frm="${i}">Remove</button></div>`).join('')
      :'<p class="sp-hint fr-empty">No friends yet.</p>';
    const ql=inp.value.trim().toLowerCase();let cands=[];
    if(ql){cands=Object.values(CL.prof).filter(x=>x&&x.id!==CL.uid&&!isFriend({id:x.id})&&((x.name||'').toLowerCase().includes(ql)||(x.email||'').toLowerCase().includes(ql))).slice(0,6).map(x=>({id:x.id}));
      if(isEmail(ql)&&!Object.values(CL.prof).some(x=>x&&x.email===ql)&&!isFriend({email:ql}))cands.unshift({email:ql})}
    el.querySelector('.fr-res').innerHTML=cands.map((c,i)=>`<div class="sp-row">${avHTML(c.id||null,c.email)}<span class="sp-n">${esc(c.id?personName(c.id):c.email)}${c.email?' <em>not signed up yet</em>':''}</span><button type="button" class="btn sm" data-fadd="${i}">Add friend</button></div>`).join('')
      ||(ql?'<p class="sp-hint">No one found. Type their full email address.</p>':'');
    el._cands=cands;
  };
  draw();
  let lk;inp.addEventListener('input',()=>{draw();const v=inp.value.trim().toLowerCase();clearTimeout(lk);
    if(isEmail(v))lk=setTimeout(async()=>{const {data}=await CL.sb.from('profiles').select('*').eq('email',v);(data||[]).forEach(x=>CL.prof[x.id]=x);if(modal===back)draw()},300)});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&el._cands.length){e.preventDefault();addFriend(el._cands[0]);inp.value='';draw()}});
  el.addEventListener('click',e=>{
    if(e.target.closest('[data-x]')){closeModal();return}
    const a=e.target.closest('[data-fadd]');if(a){addFriend(el._cands[+a.dataset.fadd]);inp.value='';draw();inp.focus();return}
    const r=e.target.closest('[data-frm]');if(r){const f=friendsList()[+r.dataset.frm];if(f)removeFriend(f);draw()}
  });
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});
  CL.sb.from('profiles').select('*').then(({data})=>{(data||[]).forEach(x=>CL.prof[x.id]=x);if(modal===back)draw()});
  ensureProfiles(friendsList().filter(f=>f.id).map(f=>f.id)).then(()=>{if(modal===back)draw()});
  setTimeout(()=>inp.focus(),0);
}
