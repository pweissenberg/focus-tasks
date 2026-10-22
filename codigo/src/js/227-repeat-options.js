/* ---------- repeat options under the Repeat select (edit window and the add bars' advanced settings):
   'days' = pick some days of the week, 'weekly' = pick the day, 'monthly' = day N / last day, or the first..last <weekday> ---------- */
const REP_X=['days','weekly','monthly'];
const repWD=[1,2,3,4,5,6,0];
function repXHTML(r){
  r=r||{};const f=r.freq;if(!REP_X.includes(f))return '';
  if(f==='days'||f==='weekly'){const on=f==='days'?(r.days||[]):r.wd!=null?[r.wd]:[];
    return `<div class="rep-x" data-repx="${f}"><span class="rep-l">${f==='days'?'On':'Every'}</span><span class="rep-wd" role="group" aria-label="Days of the week">${repWD.map(d=>`<button type="button" class="${on.includes(d)?'on':''}" data-rwd="${d}" aria-pressed="${on.includes(d)}" title="${WD_LONG[d]}">${WD_SHORT[d].slice(0,2)}</button>`).join('')}</span>${f==='days'&&!on.length?'<em class="rep-hint">Pick the days</em>':''}</div>`}
  const nth=!!r.nth;
  return `<div class="rep-x" data-repx="monthly">
    <label class="rep-o"><input type="radio" name="repm" value="day"${nth?'':' checked'}> On day <select data-rmday>${[...Array(31)].map((_,i)=>`<option value="${i+1}"${(r.mday||0)===i+1?' selected':''}>${i+1}</option>`).join('')}<option value="-1"${r.mday===-1?' selected':''}>Last</option></select></label>
    <label class="rep-o"><input type="radio" name="repm" value="nth"${nth?' checked':''}> On the <select data-rnth>${[1,2,3,4,-1].map(n=>`<option value="${n}"${r.nth===n?' selected':''}>${NTH_NAME[n]}</option>`).join('')}</select> <select data-rnwd>${repWD.map(d=>`<option value="${d}"${(r.nwd==null?5:r.nwd)===d?' selected':''}>${WD_LONG[d]}</option>`).join('')}</select></label></div>`;
}
// fills the gaps from the due date (or today) so a new choice starts sensibly
function repDefaults(r,iso){const d=isoDate(iso||todayISO());r=Object.assign({},r);
  if(r.freq!=='days')delete r.days;if(r.freq!=='weekly')delete r.wd;if(r.freq!=='monthly'){delete r.mday;delete r.nth;delete r.nwd}
  if(r.freq==='days'&&!r.days)r.days=[d.getDay()];
  if(r.freq==='weekly'&&r.wd==null)r.wd=d.getDay();
  if(r.freq==='monthly'&&!r.nth&&!r.mday)r.mday=d.getDate();
  return r}
// a click / change inside a .rep-x box updates r and redraws the box
function repXBind(host,get,set){
  host.addEventListener('click',e=>{const b=e.target.closest('[data-rwd]');if(!b)return;const r=get(),d=+b.dataset.rwd;
    if(r.freq==='weekly')r.wd=d;else{const s=new Set(r.days||[]);s.has(d)?s.delete(d):s.add(d);r.days=[...s]}set(r)});
  host.addEventListener('change',e=>{const x=e.target.closest('.rep-x');if(!x||x.dataset.repx!=='monthly')return;const r=get();
    const mode=x.querySelector('input[name=repm]:checked').value;
    if(e.target.matches('[data-rmday]')||mode==='day'&&!e.target.matches('[data-rnth],[data-rnwd]')){r.mday=+x.querySelector('[data-rmday]').value;delete r.nth;delete r.nwd;x.querySelector('input[value=day]').checked=true}
    else{r.nth=+x.querySelector('[data-rnth]').value;r.nwd=+x.querySelector('[data-rnwd]').value;delete r.mday;x.querySelector('input[value=nth]').checked=true}
    set(r)});
}
const repClean=r=>r&&r.freq?(r.freq==='days'&&!(r.days&&r.days.length)?{freq:'weekly',wd:isoDate(todayISO()).getDay()}:r):null;

/* edit window */
{const _oe=openEdit;openEdit=function(id){_oe.apply(this,arguments);const t=byId(id),f=modal&&modal.querySelector('form'),sel=f&&f.querySelector('#ed-rep');if(!t||!sel)return;
  let r=t.repeat?Object.assign({},t.repeat):{freq:''};
  const box=document.createElement('div');box.className='rep-host';const lab=sel.closest('.fld'),row=lab.parentElement.classList.contains('row2')?lab.parentElement:lab;row.insertAdjacentElement('afterend',box);
  const dueIso=()=>parseDate(f.querySelector('#ed-due').value)||t.due||todayISO();
  const draw=()=>{box.innerHTML=repXHTML(r)};draw();
  sel.addEventListener('change',()=>{r=repDefaults({...r,freq:sel.value},dueIso());draw()});
  repXBind(box,()=>r,x=>{r=x;draw()});
  const sub=f.onsubmit;f.onsubmit=e=>{const hadDue=!!parseDate(f.querySelector('#ed-due').value);const out=sub.call(f,e);
    if(t.repeat&&sel.value){t.repeat=repClean(Object.assign({},r,{freq:sel.value}));if(!hadDue)t.due=firstDue(t.due||todayISO(),t.repeat);save();render()}
    return out}}}

/* add bars: ADV[k].a.repx holds the extra choices */
{const _ap=advPanelHTML;advPanelHTML=function(k){const h=_ap(k),a=ADV[k].a;const r=Object.assign({},a.repx||{},{freq:a.repeat});
  return h.replace(/(<label class="afld"><span>Repeat<\/span>[\s\S]*?<\/label>)/,`$1<div class="rep-host" data-repfor="${k}">${repXHTML(r)}</div>`)}}
document.addEventListener('change',e=>{const s=e.target.closest('[data-adv=repeat]');if(!s)return;const k=s.id.split('-')[0],a=ADV[k]&&ADV[k].a;if(!a)return;
  const f=advForm(k),di=f&&f.querySelector(`#${k}-due`);a.repx=repDefaults({freq:s.value},(di&&parseDate(di.value))||todayISO());
  const h=document.querySelector(`[data-repfor="${k}"]`);if(h)h.innerHTML=repXHTML(a.repx)});
{const bound=new WeakSet();const bindAll=()=>document.querySelectorAll('[data-repfor]').forEach(h=>{if(bound.has(h))return;bound.add(h);const k=h.dataset.repfor;
  repXBind(h,()=>Object.assign({},ADV[k].a.repx||{},{freq:ADV[k].a.repeat}),r=>{ADV[k].a.repx=r;h.innerHTML=repXHTML(r)})});
  new MutationObserver(bindAll).observe(document.body,{childList:true,subtree:true})}
{const _af=addFromBar;addFromBar=function(k,o){const a=ADV[k].a,rx=a.repeat?Object.assign({},a.repx||{},{freq:a.repeat}):null,hadDue=!!(o&&o.due);
  const t=_af.apply(this,arguments);if(t&&t.repeat&&rx){t.repeat=repClean(rx);if(!hadDue)t.due=firstDue(t.due,t.repeat)}return t}}
