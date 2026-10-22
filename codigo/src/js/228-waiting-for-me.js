/* ---------- Waiting for people: the wait popover picks one or more people (t.waitUids, t.waitBy = who asked), someone else by name
   (t.waitWho) and what you are waiting for (t.waitWhat). t.waitFor is the line shown on the row, like "Paul, Ana - numbers".
   The task is shared with each picked person and shows in a "Waiting for me" section at the top of their Tasks list until they
   press "Done my part" (t.waitDone; it then moves to their Done, under Done my part); "Show it on their list" off (t.waitShow=false)
   keeps the people on your task only (t.waitQuiet) and shares nothing. When everyone has done their part, it comes off hold for the person who asked. wait_*, defer and glow sync (212) ---------- */
function waitPeople(t){const ids=new Set(t.waitUids||[]);
  friendsList().forEach(f=>f.id&&ids.add(f.id));
  S.projects.forEach(p=>{if(p.shared&&typeof projMembers==='function')projMembers(p).members.forEach(m=>ids.add(m))});
  S.tasks.forEach(x=>(x.members||[]).forEach(m=>ids.add(m)));
  (t.waitQuiet||[]).forEach(m=>ids.add(m));ids.delete(CL.uid);return [...ids]}
const waitLine=t=>{const who=[...(t.waitUids||[]),...(t.waitQuiet||[])].map(personName).concat(t.waitWho?[t.waitWho]:[]).join(', ');return who&&t.waitWhat?`${who} - ${t.waitWhat}`:who||t.waitWhat||''};
openWaitPop=function(anchor,t){
  // a line typed before this version ("Paul - numbers") is split into who and what
  if(t.waitFor&&!t.waitWho&&!t.waitWhat&&!(t.waitUids||[]).length){const m=t.waitFor.split(/\s+-\s+/);t.waitWho=m[0];t.waitWhat=m.slice(1).join(' - ')}
  const sel=new Set([...(t.waitUids||[]),...(t.waitShow===false?(t.waitQuiet||[]):[])]),ppl=CL.on?waitPeople(t):[];
  const chips=()=>ppl.filter(id=>CL.prof[id]).map(id=>`<button type="button" class="wf-p${sel.has(id)?' on':''}" data-wfp="${esc(id)}" aria-pressed="${sel.has(id)}">${avHTML(id)}<span>${esc(personName(id))}</span></button>`).join('');
  openPop(anchor,`<form class="pop-form wait-pop"><strong>Waiting for</strong>
    ${ppl.length?`<div class="wf-ppl" role="group" aria-label="Pick people">${chips()}</div>`:CL.on?'':'<p class="sp-hint">Sign in to pick people: they will see it on their list.</p>'}
    <label class="wf-l"><span>${ppl.length?'Someone else':'Who'}</span><input type="text" id="wait-who" value="${esc(t.waitWho||'')}" placeholder="${CL.on?'Type a name to find a person':'A name (optional)'}" maxlength="60" autocomplete="off"></label>
    <div class="wf-sug" hidden></div>
    <label class="wf-l"><span>What</span><input type="text" id="wait-what" value="${esc(t.waitWhat||'')}" placeholder="Numbers, an answer, a file..." maxlength="80"></label>
    <label class="chk wf-show"${sel.size?'':' hidden'}><input type="checkbox" id="wait-show"${t.waitShow===false?'':' checked'}> Show it on their list, in "Waiting for me"</label>
    <p class="sp-hint">Since ${isoToUS(t.waitSince||todayISO())}. The weekly review lists everything you are waiting for.</p>
    <div class="pop-actions"><button type="button" class="linkbtn" data-skip>Skip</button><button class="btn sm primary">Save</button></div></form>`,el=>{
    const f=el.querySelector('form');f.querySelector('[data-skip]').onclick=closePop;
    if(ppl.some(id=>!CL.prof[id]))ensureProfiles(ppl).then(()=>{const w=f.querySelector('.wf-ppl');if(w&&pop&&pop.el===el)w.innerHTML=chips()});
    const showBox=()=>{f.querySelector('.wf-show').hidden=!sel.size};
    const inpWho=f.querySelector('#wait-who'),sug=f.querySelector('.wf-sug');
    const repaint=()=>{let w=f.querySelector('.wf-ppl');if(!w){f.querySelector('strong').insertAdjacentHTML('afterend','<div class="wf-ppl" role="group" aria-label="Pick people"></div>');w=f.querySelector('.wf-ppl')}w.innerHTML=chips();showBox()};
    // typing a name lists the people it matches; picking one adds them like a chip
    const suggest=async()=>{const q=inpWho.value.trim().toLowerCase();if(!CL.on||!q){sug.hidden=true;return}
      if(isEmail(q)&&!Object.values(CL.prof).some(p=>p&&p.email===q)){const {data}=await CL.sb.from('profiles').select('*').eq('email',q);(data||[]).forEach(p=>CL.prof[p.id]=p)}
      const all=new Set([...ppl,...Object.keys(CL.prof)]);all.delete(CL.uid);
      const hits=[...all].filter(id=>{const p=CL.prof[id];return p&&!sel.has(id)&&((p.name||'').toLowerCase().includes(q)||(p.email||'').toLowerCase().startsWith(q))}).slice(0,5);
      sug.innerHTML=hits.map(id=>`<button type="button" data-wfadd="${esc(id)}">${avHTML(id)}<span>${esc(personName(id))}</span></button>`).join('');sug.hidden=!hits.length};
    inpWho.addEventListener('input',suggest);
    inpWho.addEventListener('keydown',e=>{if(e.key==='Enter'&&!sug.hidden){e.preventDefault();const b=sug.querySelector('[data-wfadd]');if(b)b.click()}});
    if(CL.on&&ppl.length<8)CL.sb.from('profiles').select('*').then(({data})=>{(data||[]).forEach(p=>CL.prof[p.id]=CL.prof[p.id]||p)});
    f.addEventListener('click',e=>{const a=e.target.closest('[data-wfadd]');if(a){const id=a.dataset.wfadd;if(!ppl.includes(id))ppl.push(id);sel.add(id);inpWho.value='';sug.hidden=true;repaint();inpWho.focus();return}
      const b=e.target.closest('[data-wfp]');if(!b)return;const id=b.dataset.wfp;sel.has(id)?sel.delete(id):sel.add(id);
      b.classList.toggle('on',sel.has(id));b.setAttribute('aria-pressed',sel.has(id));showBox()});
    f.onsubmit=async e=>{e.preventDefault();const was=new Set(t.waitUids||[]);
      const show=!sel.size||f.querySelector('#wait-show').checked;t.waitShow=show;
      // not shown to them: their names stay on your task, nothing is shared
      if(!show){t.waitQuiet=[...sel];t.waitUids=[];t.waitWho=f.querySelector('#wait-who').value.trim();
        t.waitWhat=f.querySelector('#wait-what').value.trim();t.waitBy=null;t.waitFor=waitLine(t);if(!t.waitSince)t.waitSince=todayISO();closePop();commit();return}
      t.waitQuiet=[];
      t.waitUids=[...sel];t.waitWho=f.querySelector('#wait-who').value.trim();t.waitWhat=f.querySelector('#wait-what').value.trim();
      t.waitBy=sel.size?CL.uid:null;t.waitFor=waitLine(t);if(!t.waitSince)t.waitSince=todayISO();closePop();
      const add=[...sel].filter(id=>!was.has(id));
      if(add.length&&CL.on){for(const id of add){const x=CL.shared[t.id];if(!x||!(x.members||[]).includes(id))await shareTask(t,{id},'share')}
        commit();toast(`${add.map(personName).join(', ')} will see "${t.name}" in Waiting for me.`)}
      else commit()}});
};
// unticking On hold stops waiting for the people too
list.addEventListener('change',e=>{const b=e.target.closest('[data-act="hold"]');if(!b||b.checked)return;const t=byId(b.closest('.task').dataset.id);
  if(t&&t.waitBy===CL.uid){t.waitUids=[];t.waitBy=null}if(t){t.waitWho='';t.waitWhat=''}},true);
// sync: called by 212 when a shared task changes on the server
function applyWaitSync(t,b){
  const old=t.waitUids||[],now=b.wait_uids||[],mine=t.waitBy===CL.uid;
  const gone=mine?old.filter(u=>!now.includes(u)):[];
  t.waitFor=b.wait_for;t.waitWho=b.wait_who;t.waitWhat=b.wait_what;t.waitSince=b.wait_since;t.waitUids=now;t.waitBy=b.wait_by;t.waitDone=b.wait_done;t.waitShow=b.wait_show;
  if(gone.length){const nm=t.name,who=gone.map(personName).join(' and ');
    if(!now.length){t.onHold=false;t.waitFor=t.waitWho?waitLine(t):'';setTimeout(()=>toast(`${who} did their part of "${nm}". It is off hold.`),0)}
    else setTimeout(()=>toast(`${who} did their part of "${nm}". Still waiting for ${now.map(personName).join(', ')}.`),0)}
}
const waitingForMe=t=>!!(CL.on&&t.waitShow!==false&&(t.waitUids||[]).includes(CL.uid)&&!t.done&&!t.stepOf);
// "Waiting for me" section at the top of Tasks
{const _r=render;render=function(){_r.apply(this,arguments);
  if(S.ui.view!=='tasks')return;const ts=S.tasks.filter(waitingForMe).filter(t=>typeof vis!=='function'||vis(t));if(!ts.length)return;
  const sec=document.createElement('div');sec.className='wfm-sec';
  const hid=!!S.ui.wfmHide;if(hid)sec.classList.add('wfm-hidden');
  sec.innerHTML=`<div class="wfm-h"><b>Waiting for me</b><span>${ts.length} task${ts.length===1?'':'s'} someone is waiting on you for</span><button type="button" class="linkbtn wfm-tog" data-wfmhide aria-expanded="${!hid}">${hid?'Show':'Hide'}</button></div>`;
  if(hid){ts.forEach(t=>{const r=list.querySelector(`:scope > .task[data-id="${t.id}"]`);if(r){const nx=r.nextElementSibling;if(nx&&nx.dataset&&nx.dataset.mtfor===t.id)nx.remove();r.remove()}});
    const hard=list.querySelector(':scope > .hard-sec, :scope > .hard-pick');if(hard)hard.after(sec);else list.prepend(sec);return}
  ts.forEach(t=>{let r=list.querySelector(`.task[data-id="${t.id}"]`),mt=null;
    if(r){const nx=r.nextElementSibling;if(nx&&nx.dataset&&nx.dataset.mtfor===t.id)mt=nx}else r=row(t,0);
    const w=document.createElement('div');w.className='wfm-item';
    w.innerHTML=`<div class="wfm-by">${avHTML(t.waitBy)}<span><b>${esc(personName(t.waitBy))}</b> is waiting${t.waitWhat?` for <b>${esc(t.waitWhat)}</b>`:''}${t.waitSince?` · ${fmtDays(daysSince(t.waitSince))}`:''}</span><button type="button" class="btn sm" data-wfmdone="${t.id}" title="Tell ${esc(personName(t.waitBy))} your part is done">Done my part</button></div>`;
    w.appendChild(r);if(mt)w.appendChild(mt);sec.appendChild(w)});
  const hard=list.querySelector(':scope > .hard-sec, :scope > .hard-pick');if(hard)hard.after(sec);else list.prepend(sec)}}
list.addEventListener('click',e=>{if(e.target.closest('[data-wfmhide]')){e.stopPropagation();S.ui.wfmHide=!S.ui.wfmHide;commit();return}
  const b=e.target.closest('[data-wfmdone]');if(!b)return;e.stopPropagation();const t=byId(b.dataset.wfmdone);if(!t)return;
  const by=t.waitBy,old=[...(t.waitUids||[])],od=[...(t.waitDone||[])];t.waitUids=old.filter(u=>u!==CL.uid);t.waitDone=[...new Set([...od,CL.uid])];commit();
  toast(`Told ${personName(by)} your part of "${t.name}" is done. It is in Done, under Done my part.`,()=>{t.waitUids=old;t.waitDone=od;commit()})},true);
