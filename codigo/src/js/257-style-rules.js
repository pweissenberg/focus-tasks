/* ---------- v92 task backgrounds with patterns or uploaded pictures (t.bgPat) and Settings "Task style rules" (S.prefs.styleRules).
   t.bgPat = a BGPATS key or 'img:<id>' of S.prefs.bgImgs [{id,name,data}] (small JPEG data URLs, reusable on any task).
   A rule {id,on,kw,tagId,projId,bg,pat,color,glow,urgent,top}: every filled condition must match (keyword in the name, comma = any of them;
   tag; project = the project or any of its tabs, a tab = only that tab). The task's own bg / pattern / color / glow win; the first matching rule
   gives each of the others. Urgent shows the red "!" and sorts as High in Priority sort; Top puts open tasks first. ---------- */
const BGPATS=[['dots','Dots'],['stripes','Stripes'],['diag','Diagonal'],['grid','Grid'],['checks','Checks'],['waves','Waves'],['zigzag','Zigzag'],['cross','Cross']];
const bgImgs=()=>S.prefs.bgImgs||(S.prefs.bgImgs=[]);
const styleRules=()=>S.prefs.styleRules||(S.prefs.styleRules=[]);
const srNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function srMatch(r,t){
  if(!r.on||!(r.kw||r.tagId||r.projId))return false;
  if(r.kw){const n=srNorm(t.name),ws=srNorm(r.kw).split(',').map(s=>s.trim()).filter(Boolean);if(ws.length&&!ws.some(w=>n.includes(w)))return false}
  if(r.tagId&&t.tagId!==r.tagId)return false;
  if(r.projId){const p=projOf(t);if(!p)return false;if(p.id!==r.projId&&!(p.tabOf===r.projId))return false}
  return true}
// what the rules give a task (memo by task fields, cleared when the rules change)
let srVer=0;const srMemo=new Map();
function srFx(t){if(!t||t.stepOf)return {};const rs=styleRules();if(!rs.length)return {};
  const k=srVer+'|'+t.name+'|'+t.tagId+'|'+t.projectId,m=srMemo.get(t.id);if(m&&m.k===k)return m.fx;
  const fx={};rs.forEach(r=>{if(!srMatch(r,t))return;['bg','pat','color','glow'].forEach(p=>{if(r[p]&&fx[p]==null)fx[p]=r[p]});if(r.urgent)fx.urgent=true;if(r.top)fx.top=true});
  srMemo.set(t.id,{k,fx});return fx}
const srChanged=()=>{srVer++;srMemo.clear();save();render()};
const patOf=t=>t.bgPat||srFx(t).pat||null;
const imgOf=id=>bgImgs().find(i=>'img:'+i.id===id);
const isUrgent=t=>t.prio===3||(!t.done&&!t.prio&&!!srFx(t).urgent);
// rows: rule color / glow / background, then the pattern or picture
{const _row=row;row=function(t,depth){const el=_row(t,depth),open=!t.done,fx=srFx(t);
  if(!t.color&&fx.color)el.style.setProperty('--c',fx.color);
  if(open&&!t.glow&&!t.stepOf&&fx.glow&&!el.classList.contains('glow'))el.classList.add('glow','g-'+fx.glow);
  if(!t.bg&&fx.bg){el.style.setProperty('--tbg',fx.bg);el.classList.remove('tag-fill');el.classList.add('has-bg')}
  const pat=patOf(t);
  // a pattern alone adds no background color (Pedro): its lines take the task color, the row keeps its own background
  if(pat&&!t.stepOf){if(!el.style.getPropertyValue('--tbg'))el.style.setProperty('--tpk',colorOf(t));el.classList.add('bgp');
    if(pat.startsWith('img:')){const im=imgOf(pat);if(im){el.classList.add('bgp-img');el.style.setProperty('--tbgimg',`url("${im.data}")`)}else el.classList.remove('bgp')}
    else el.classList.add('bgp-'+pat)}
  if(open&&!t.prio&&fx.urgent){const n=el.querySelector('.name-row .name');if(n&&!el.querySelector('.urg'))n.insertAdjacentHTML('beforebegin','<b class="urg" title="Urgent (style rule)" aria-label="Urgent">!</b>')}
  return el}}
// the microtask box under a row takes its pattern too
{const _r=render;render=function(){_r.apply(this,arguments);
  document.querySelectorAll('.task.bgp+.mt-wrap').forEach(w=>{const r=w.previousElementSibling;if(r.classList.contains('hold'))return;
    w.classList.add('bgp',...[...r.classList].filter(c=>c.startsWith('bgp-')));['--tbg','--tpk'].forEach(v=>{const x=r.style.getPropertyValue(v);if(x)w.style.setProperty(v,x)});
    const im=r.style.getPropertyValue('--tbgimg');if(im)w.style.setProperty('--tbgimg',im)})}}
// sorting: Top first (open tasks), urgent rules count as High in Priority sort
{const _c=cmp;cmp=function(a,b){
  const x=!a.done&&!!srFx(a).top,y=!b.done&&!!srFx(b).top;if(x!==y)return x?-1:1;
  if(S.ui.sort==='prio'){const pa=a.prio||(isUrgent(a)?3:0),pb=b.prio||(isUrgent(b)?3:0);if(pa!==pb)return S.ui.dir*(pb-pa)}
  return _c(a,b)}}
// pattern / picture picker (edit window and rules)
function patPickHTML(name,cur){
  return `<div class="pat-pick" role="radiogroup"><label title="Plain"><input type="radio" name="${name}" value=""${!cur?' checked':''}><span class="psw none">∅</span></label>`
    +BGPATS.map(([k,l])=>`<label title="${l}"><input type="radio" name="${name}" value="${k}"${cur===k?' checked':''}><span class="psw bgp bgp-${k}"></span></label>`).join('')
    +bgImgs().map(i=>`<label title="${esc(i.name||'Picture')}"><input type="radio" name="${name}" value="img:${i.id}"${cur==='img:'+i.id?' checked':''}><span class="psw img" style="background-image:url(&quot;${i.data}&quot;)"></span></label>`).join('')
    +`<label class="pat-up" title="Upload a picture (saved for other tasks)">+<input type="file" accept="image/*" hidden data-patup></label></div>`}
function bindPatPick(root,name,onPick){
  root.addEventListener('change',async e=>{const i=e.target;
    if(i.matches('[data-patup]')){const f=i.files[0];i.value='';if(!f)return;const im=await addBgImg(f);if(!im)return;
      const cur='img:'+im.id;root.outerHTML=patPickHTML(name,cur);const nr=document.querySelector(`.pat-pick input[name="${name}"]`).closest('.pat-pick');bindPatPick(nr,name,onPick);onPick(cur);return}
    if(i.name===name)onPick(i.value||null)})}
// uploads: shrunk to 640px and JPEG, about 30-80 KB each; at most 1.5 MB in all (localStorage)
function addBgImg(file){return new Promise(ok=>{const img=new Image();img.onload=()=>{const s=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const data=c.toDataURL('image/jpeg',.72),used=bgImgs().reduce((n,i)=>n+i.data.length,0);
    if(used+data.length>1.5e6){toast('Your backgrounds are full (1.5 MB). Remove one in Settings first.');ok(null);return}
    const im={id:uid(),name:(file.name||'Picture').replace(/\.[^.]+$/,'').slice(0,40),data};bgImgs().push(im);save();toast('Background saved. You can use it on other tasks.');ok(im)};
  img.onerror=()=>{toast('Could not read that picture.');ok(null)};img.src=URL.createObjectURL(file)})}
function rmBgImg(id){S.prefs.bgImgs=bgImgs().filter(i=>i.id!==id);const k='img:'+id;
  S.tasks.forEach(t=>{if(t.bgPat===k)t.bgPat=null});styleRules().forEach(r=>{if(r.pat===k)r.pat=null});srChanged()}
// edit window: PATTERN under BACKGROUND
{const _oe=openEdit;openEdit=function(id){_oe.apply(this,arguments);const t=byId(id),f=modal&&modal.querySelector('form');if(!t||!f||!f.querySelector('#ed-bg'))return;
  let pat=t.bgPat||null;
  f.querySelector('#ed-bg').closest('.fld').insertAdjacentHTML('afterend',`<div class="fld"><span>PATTERN OR PICTURE</span>${patPickHTML('ed-pat',pat)}</div>`);
  bindPatPick(f.querySelector('.pat-pick'),'ed-pat',v=>{pat=v});
  const sub=f.onsubmit;f.onsubmit=e=>{t.bgPat=pat;return sub.call(f,e)}}}
// Settings: Task style rules + Your backgrounds
function srProjOpts(sel){return S.projects.filter(p=>!p.archived&&!p.tabOf).map(p=>[p,...projTabs(p)]).flat()
  .map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.tabOf?'  '+projFull(p):p.name+(projTabs(p).length?' (all tabs)':''))}</option>`).join('')}
function srCardHTML(r,i,n){const nm='sr'+r.id;
  return `<div class="sr-card${r.on?'':' off'}" data-srid="${r.id}">
    <div class="sr-top"><label class="sr-on" title="Rule on/off"><input type="checkbox" data-srf="on"${r.on?' checked':''}> Rule ${i+1}</label>
      <span class="sr-tools"><button type="button" class="linkbtn" data-srmv="-1"${i?'':' disabled'} title="Up">▲</button><button type="button" class="linkbtn" data-srmv="1"${i<n-1?'':' disabled'} title="Down">▼</button><button type="button" class="linkbtn" data-srdel title="Delete rule">Delete</button></span></div>
    <div class="sr-if"><b>IF</b>
      <input type="text" data-srf="kw" value="${esc(r.kw||'')}" placeholder="Word in the name (a, b = any)" maxlength="80">
      <select data-srf="tagId"><option value="">Any tag</option>${S.tags.map(g=>`<option value="${g.id}"${g.id===r.tagId?' selected':''}>${esc(g.name)}</option>`).join('')}</select>
      <select data-srf="projId"><option value="">Any project</option>${srProjOpts(r.projId)}</select></div>
    <div class="sr-then"><b>THEN</b>
      <div class="sr-row"><span>Background</span><div class="swatches sm" data-srsw="bg">${swatchesHTML(r.bg||null,true).replace('>auto<','>none<')}</div></div>
      <div class="sr-row"><span>Pattern</span>${patPickHTML(nm+'p',r.pat||'')}</div>
      <div class="sr-row"><span>Color</span><div class="swatches sm" data-srsw="color">${swatchesHTML(r.color||null,true).replace('>auto<','>none<')}</div></div>
      <div class="sr-row"><span>Glow</span>${glowPickHTML(nm+'g',r.glow||'',true)}</div>
      <div class="sr-row sr-chk"><label><input type="checkbox" data-srf="urgent"${r.urgent?' checked':''}> Urgent <b class="urg">!</b></label><label><input type="checkbox" data-srf="top"${r.top?' checked':''}> Top of the list</label></div></div></div>`}
function srSectionHTML(){const rs=styleRules();
  return `<div class="sr-set" id="sr-set"><div class="sr-h"><span>TASK STYLE RULES</span><button type="button" class="btn sm" data-sradd>+ Add rule</button></div>
    <p class="sp-hint">Style tasks by a word in the name, a tag, a project or subproject, or several together (all must match). A task's own background, color and glow win; with two rules, the first one wins.</p>
    ${rs.length?rs.map((r,i)=>srCardHTML(r,i,rs.length)).join(''):'<p class="sr-empty">No rules yet.</p>'}
    <div class="sr-h"><span>YOUR BACKGROUNDS</span><label class="btn sm">Upload<input type="file" accept="image/*" hidden data-srup></label></div>
    ${bgImgs().length?`<div class="sr-imgs">${bgImgs().map(i=>`<span class="sr-img" style="background-image:url(&quot;${i.data}&quot;)" title="${esc(i.name)}"><button type="button" data-srimgdel="${i.id}" aria-label="Remove ${esc(i.name)}" title="Remove">×</button></span>`).join('')}</div>`:'<p class="sr-empty">Pictures you upload show here and in every task\'s edit window.</p>'}</div>`}
function srBind(f){const box=f.querySelector('#sr-set');
  const redraw=()=>{const y=f.scrollTop;box.outerHTML=srSectionHTML();srBind(f);f.scrollTop=y};
  const ruleOf=el=>{const c=el.closest('[data-srid]');return c&&styleRules().find(r=>r.id===c.dataset.srid)};
  box.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input[type=text]')){e.preventDefault();e.target.blur()}});
  box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.matches('[data-sradd]')){styleRules().push({id:uid(),on:true,kw:'',tagId:null,projId:null});srChanged();redraw();const c=f.querySelectorAll('.sr-card');c[c.length-1].querySelector('[data-srf=kw]').focus();return}
    if(b.matches('[data-srimgdel]')){rmBgImg(b.dataset.srimgdel);redraw();return}
    const r=ruleOf(b);if(!r)return;const rs=styleRules(),i=rs.indexOf(r);
    if(b.matches('[data-srdel]')){rs.splice(i,1);srChanged();redraw();toast('Rule deleted.',()=>{rs.splice(i,0,r);srChanged();if(document.getElementById('sr-set'))redraw()})}
    else if(b.matches('[data-srmv]')){const j=i+ +b.dataset.srmv;if(j<0||j>=rs.length)return;rs.splice(i,1);rs.splice(j,0,r);srChanged();redraw()}});
  box.addEventListener('input',e=>{const i=e.target;if(i.dataset.srf!=='kw')return;const r=ruleOf(i);if(r){r.kw=i.value;srVer++;srMemo.clear();saveSoon();clearTimeout(srBind.d);srBind.d=setTimeout(render,250)}});
  box.addEventListener('change',e=>{const i=e.target;
    if(i.matches('[data-srup]')){const fl=i.files[0];i.value='';if(fl)addBgImg(fl).then(im=>{if(im)redraw()});return}
    const r=ruleOf(i);if(!r)return;const k=i.dataset.srf,nm='sr'+r.id;
    if(k==='on'||k==='urgent'||k==='top'){r[k]=i.checked;if(k==='on')i.closest('.sr-card').classList.toggle('off',!i.checked)}
    else if(k==='tagId'||k==='projId')r[k]=i.value||null;
    else if(i.name===nm+'g')r.glow=i.value||null;
    else if(i.name===nm+'p'&&!i.matches('[data-patup]'))r.pat=i.value||null;
    else return;srChanged()});
  box.querySelectorAll('[data-srsw]').forEach(s=>bindSwatches(s,c=>{const r=ruleOf(s);if(r){r[s.dataset.srsw]=c||null;srChanged()}}));
  box.querySelectorAll('.sr-card .pat-pick').forEach(p=>{const r=ruleOf(p);if(!r)return;const nm='sr'+r.id+'p';
    p.querySelector('[data-patup]').addEventListener('change',async e=>{e.stopPropagation();const fl=e.target.files[0];e.target.value='';if(!fl)return;const im=await addBgImg(fl);if(im){r.pat='img:'+im.id;srChanged();redraw()}},true)})}
{const _os=openSettings;openSettings=function(){_os.apply(this,arguments);const f=modal&&modal.querySelector('form.settings');if(!f)return;
  f.classList.add('has-sr');f.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',srSectionHTML());srBind(f)}}
