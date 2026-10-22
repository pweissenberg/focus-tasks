/* ---------- Automatic backup of the whole account (v72). Every S.prefs.backupHours (default 6, 0 = off) a backup file
   (format focus-tasks-backup, the whole S) goes to a folder picked in Settings and a copy is kept in this browser (IndexedDB
   "focus-backup"). The folder needs the File System Access API: Chrome or Edge on the standalone focus-tasks.html; inside claude.ai
   the page is a sandboxed frame, so there only the browser copies and "Download a backup" work. Both places keep the newest 2,
   the last one before today and the last one before this week (Monday). Settings > Load a backup replaces everything; the state
   right before a load is kept apart ("before-load") so a load can be undone. Last backup time is per device (localStorage). ---------- */
const BK={dir:null,dirName:'',perm:'',busy:false,askedAt:0,for:null,err:''};
const bkHours=()=>S.prefs.backupHours==null?6:+S.prefs.backupHours;
const bkCanFolder=()=>typeof window.showDirectoryPicker==='function'&&window.self===window.top;
const bkUser=()=>CL.on&&CL.uid?CL.uid:'local';
const bkPrefix=()=>`focus-backup-${(fileSlug((CL.email||'me').split('@')[0])||'me').toLowerCase()}-`;
const bkStamp=d=>{const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`};
const bkAt=name=>{const m=/(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)\.json$/.exec(name);return m?new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6]).getTime():0};
const bkLast=()=>{try{return +localStorage.getItem('focus-backup-last:'+bkUser())||0}catch(e){return 0}};
const bkWhen=ms=>new Date(ms).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
// which backups stay: the newest 2, the last one of an earlier day, the last one of an earlier week
function bkKeep(list,now=new Date()){
  const s=[...list].sort((a,b)=>b.at-a.at),keep=new Set(s.slice(0,2).map(x=>x.name));
  const day=new Date(now);day.setHours(0,0,0,0);const wk=new Date(day);wk.setDate(wk.getDate()-((wk.getDay()+6)%7));
  const a=s.find(x=>x.at<day.getTime()),b=s.find(x=>x.at<wk.getTime());if(a)keep.add(a.name);if(b)keep.add(b.name);
  return keep}
function bkDB(){return BK.db||(BK.db=new Promise((ok,no)=>{const r=indexedDB.open('focus-backup',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('kv');r.result.createObjectStore('snaps',{keyPath:'key'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>{BK.db=null;no(r.error)}}))}
async function bkTx(store,mode,fn){const db=await bkDB();return new Promise((ok,no)=>{const tx=db.transaction(store,mode),r=fn(tx.objectStore(store));let out;
  if(r)r.onsuccess=()=>{out=r.result};tx.oncomplete=()=>ok(out);tx.onerror=()=>no(tx.error)})}
const bkSnaps=async u=>((await bkTx('snaps','readonly',st=>st.getAll()))||[]).filter(x=>x.user===u);
async function bkPerm(ask){if(!BK.dir)return false;if(typeof BK.dir.queryPermission!=='function')return true;
  try{let p=await BK.dir.queryPermission({mode:'readwrite'});if(p!=='granted'&&ask)p=await BK.dir.requestPermission({mode:'readwrite'});BK.perm=p;return p==='granted'}catch(e){BK.perm='error';return false}}
async function bkFolderList(){const out=[];if(!BK.dir)return out;const pre=bkPrefix();
  for await(const [n,h] of BK.dir.entries())if(h.kind==='file'&&n.startsWith(pre)&&bkAt(n))out.push({name:n,at:bkAt(n),h});return out}
const bkData=()=>JSON.stringify({format:'focus-tasks-backup',version:1,savedAt:new Date().toISOString(),user:{id:CL.uid,email:CL.email},state:S});
// one backup now: browser copy always, folder when one is picked and allowed; returns where it went
async function runBackup(){if(BK.busy)return [];BK.busy=true;const where=[];
  try{const now=new Date(),name=bkPrefix()+bkStamp(now)+'.json',data=bkData(),u=bkUser();
    try{await bkTx('snaps','readwrite',st=>st.put({key:u+'|'+name,user:u,name,at:now.getTime(),data}));
      const all=await bkSnaps(u),keep=bkKeep(all,now);for(const x of all)if(!keep.has(x.name))await bkTx('snaps','readwrite',st=>st.delete(x.key));where.push('browser')}catch(e){}
    if(BK.dir&&await bkPerm(false)){try{const fh=await BK.dir.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(data);await w.close();
      const all=await bkFolderList(),keep=bkKeep(all,now);for(const x of all)if(!keep.has(x.name))await BK.dir.removeEntry(x.name);where.push('folder');BK.err=''}
      catch(e){BK.err=e.message||String(e)}}
    if(where.length)try{localStorage.setItem('focus-backup-last:'+u,String(now.getTime()))}catch(e){}
  }finally{BK.busy=false}return where}
async function bkLoadDir(){const u=bkUser();if(BK.for===u)return;BK.for=u;BK.dir=null;BK.dirName='';
  try{const d=await bkTx('kv','readonly',st=>st.get('dir:'+u));if(d){BK.dir=d;BK.dirName=d.name}}catch(e){}}
async function bkPick(){
  if(!bkCanFolder()){toast('Saving to a folder needs Chrome or Edge with focus-tasks.html opened on its own.');return false}
  try{const d=await window.showDirectoryPicker({id:'focus-backup',mode:'readwrite'});BK.dir=d;BK.dirName=d.name;BK.perm='granted';BK.for=bkUser();
    await bkTx('kv','readwrite',st=>st.put(d,'dir:'+bkUser()));const w=await runBackup();toast(w.includes('folder')?`Backups go to "${d.name}" now.`:`Could not write to "${d.name}".`);return true}
  catch(e){if(e&&e.name!=='AbortError')toast('Could not use that folder: '+(e.message||e.name));return false}}
async function bkTick(){if(CL.enabled&&!CL.on)return; // landing page, nobody signed in
  await bkLoadDir();const h=bkHours();if(!h||Date.now()-bkLast()<h*3600e3)return;
  if(BK.dir&&!(await bkPerm(false))&&Date.now()-BK.askedAt>30*60e3){BK.askedAt=Date.now();
    toast(`Backup: allow saving to the folder "${BK.dirName}".`,async()=>{if(await bkPerm(true)){await runBackup();toast('Backup saved.')}},'Allow')}
  await runBackup()}
setTimeout(bkTick,3000);setInterval(bkTick,60e3);
// load: everything is replaced (the view you are on stays); what you had is kept as "before-load"
async function bkRestore(text,label){let B;try{B=JSON.parse(text)}catch(e){toast('That file is not a Focus Tasks backup.');return false}
  const st=B&&B.format==='focus-tasks-backup'?B.state:B;
  if(!st||!Array.isArray(st.tasks)){toast(B&&B.format==='focus-tasks-project'?'That is a project file: use "Import a project" in the sidebar.':'That file is not a Focus Tasks backup.');return false}
  const u=bkUser();try{await bkTx('snaps','readwrite',x=>x.put({key:u+'|before-load',user:u+':before',name:'before-load',at:Date.now(),data:bkData()}))}catch(e){}
  const ui=S.ui;S=normalize(JSON.parse(JSON.stringify(st)));S.ui=ui;commit();toast(`Loaded the backup from ${label}.`);return true}
async function openBkLoad(){closePop();closeModal();await bkLoadDir();const u=bkUser(),rows=new Map();let before=null;
  try{(await bkSnaps(u)).forEach(x=>rows.set(x.name,{at:x.at,where:'This browser',get:async()=>x.data}));
    before=((await bkTx('snaps','readonly',st=>st.get(u+'|before-load')))||null)}catch(e){}
  if(BK.dir&&await bkPerm(true))try{(await bkFolderList()).forEach(x=>rows.set(x.name,{at:x.at,where:`Folder "${BK.dirName}"`,get:async()=>(await x.h.getFile()).text()}))}catch(e){}
  const list=[...rows.values()].sort((a,b)=>b.at-a.at);if(before)list.push({at:before.at,where:'Right before the last load',get:async()=>before.data,undo:true});
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal bk-load" role="dialog" aria-modal="true" aria-labelledby="bk-h"><h2 id="bk-h">Load a backup</h2>
    <p class="sp-hint">Loading replaces all your tasks, projects, tags and settings with the backup. What you have now is kept, so you can come back to it.</p>
    <div class="bk-list">${list.length?list.map((r,i)=>`<div class="bk-item${r.undo?' undo':''}"><div><strong>${esc(bkWhen(r.at))}</strong><span>${esc(r.where)}</span></div><button type="button" class="btn sm" data-bki="${i}">Load</button></div>`).join(''):'<p class="sp-hint">No backups yet.</p>'}</div>
    <div class="modal-actions"><label class="btn">From a file...<input type="file" accept=".json,application/json" id="bk-file" hidden></label><button type="button" class="btn" data-x>Close</button></div></div>`;
  document.body.appendChild(back);modal=back;
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});back.querySelector('[data-x]').onclick=closeModal;
  back.querySelectorAll('[data-bki]').forEach(b=>b.onclick=async()=>{const r=list[+b.dataset.bki];
    if(!b.classList.contains('armed')){back.querySelectorAll('[data-bki]').forEach(x=>{x.classList.remove('armed');x.textContent='Load'});b.classList.add('armed');b.textContent='Replace everything?';return}
    try{if(await bkRestore(await r.get(),bkWhen(r.at)))closeModal()}catch(e){toast('Could not read that backup: '+(e.message||e))}});
  back.querySelector('#bk-file').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f&&await bkRestore(await f.text(),f.name))closeModal()}}
// Settings section
{const _os=openSettings;openSettings=function(){_os.apply(this,arguments);const f=modal&&modal.querySelector('form.settings');if(!f)return;const h=bkHours();
  const folder=bkCanFolder()?`<div class="bk-row"><span class="bk-dir">${BK.dir?`Folder: <b>${esc(BK.dirName)}</b>${BK.perm&&BK.perm!=='granted'?' <em>(needs your OK)</em>':''}`:'No folder picked'}</span><button type="button" class="btn sm" data-bkdir>${BK.dir?'Change folder':'Choose folder'}</button></div>`
    :`<p class="sp-hint">Saving to a folder on your computer works in Chrome or Edge when you open focus-tasks.html on its own. Here backups are kept in this browser, and you can download one.</p>`;
  f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<div class="fld bk-set"><span>AUTOMATIC BACKUP</span>
    <div class="bk-row"><select id="st-bkh" aria-label="How often">${[[1,'Every hour'],[3,'Every 3 hours'],[6,'Every 6 hours'],[12,'Every 12 hours'],[24,'Every day'],[0,'Off']].map(([v,l])=>`<option value="${v}"${h===v?' selected':''}>${l}</option>`).join('')}</select><button type="button" class="btn sm" data-bknow>Back up now</button></div>
    ${folder}
    <p class="sp-hint bk-last">${bkLast()?`Last backup: ${esc(bkWhen(bkLast()))}.`:'No backup yet.'} It keeps the last 2 backups, the last one of the day before and the last one of the week before.${BK.err?` <b class="err">${esc(BK.err)}</b>`:''}</p>
    <div class="bk-row"><button type="button" class="btn sm" data-bkload>Load a backup...</button><button type="button" class="btn sm" data-bkdl>Download a backup</button></div></div>`);
  f.querySelector('#st-bkh').onchange=e=>{S.prefs.backupHours=+e.target.value;save();bkTick()};
  const reopen=()=>{if(modal&&modal.querySelector('form.settings')){const n=f.querySelector('#st-name').value;openSettings();const i=modal.querySelector('#st-name');if(i)i.value=n}};
  f.querySelector('[data-bknow]').onclick=async()=>{if(BK.dir)await bkPerm(true);const w=await runBackup();
    toast(w.length?`Backup saved${w.includes('folder')?` to "${BK.dirName}"`:''}${BK.dir&&!w.includes('folder')?' (only in this browser: the folder was not allowed)':''}.`:'Could not save the backup.');reopen()};
  const d=f.querySelector('[data-bkdir]');if(d)d.onclick=async()=>{if(await bkPick())reopen()};
  f.querySelector('[data-bkload]').onclick=openBkLoad;
  f.querySelector('[data-bkdl]').onclick=()=>saveFile(bkPrefix()+bkStamp(new Date())+'.json',bkData())}}
