/* ---------- stats ---------- */
/* ---------- periods (day / week / month / year) ---------- */
const isoDate=iso=>{const[y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d)};
const DAY=86400000;
const fmtD=(d,opt)=>d.toLocaleDateString('en-US',opt);
function weekStartOf(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7)}
function period(range,anchorISO){
  const n=isoDate(anchorISO),buckets=[],today=new Date();today.setHours(0,0,0,0);let a,b,label;
  if(range==='day'){a=n;b=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1);
    for(let h=0;h<24;h++)buckets.push({s:+new Date(a.getFullYear(),a.getMonth(),a.getDate(),h),e:+new Date(a.getFullYear(),a.getMonth(),a.getDate(),h+1),label:h%3===0?String(h):'',full:`${pad(h)}:00 to ${pad(h+1)}:00`});
    const diff=Math.round((+a-+today)/DAY);label=diff===0?'Today':diff===-1?'Yesterday':fmtD(a,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
  else if(range==='week'){a=weekStartOf(n);b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+7);
    for(let i=0;i<7;i++){const s=new Date(a.getFullYear(),a.getMonth(),a.getDate()+i);buckets.push({s:+s,e:+new Date(s.getFullYear(),s.getMonth(),s.getDate()+1),label:fmtD(s,{weekday:'short'}),full:fmtD(s,{weekday:'long',month:'short',day:'numeric'})})}
    const end=new Date(b.getFullYear(),b.getMonth(),b.getDate()-1),tw=+weekStartOf(today);
    label=+a===tw?'This week':+a===tw-7*DAY?'Last week':`${fmtD(a,{month:'short',day:'numeric'})} to ${fmtD(end,{month:'short',day:'numeric',year:'numeric'})}`}
  else if(range==='month'){a=new Date(n.getFullYear(),n.getMonth(),1);b=new Date(n.getFullYear(),n.getMonth()+1,1);
    const nd=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();
    for(let d=1;d<=nd;d++){const s=new Date(a.getFullYear(),a.getMonth(),d);buckets.push({s:+s,e:+new Date(a.getFullYear(),a.getMonth(),d+1),label:d===1||d%5===0?String(d):'',full:fmtD(s,{weekday:'short',month:'short',day:'numeric'})})}
    label=fmtD(a,{month:'long',year:'numeric'})}
  else{a=new Date(n.getFullYear(),0,1);b=new Date(n.getFullYear()+1,0,1);
    for(let m=0;m<12;m++){const s=new Date(a.getFullYear(),m,1);buckets.push({s:+s,e:+new Date(a.getFullYear(),m+1,1),label:fmtD(s,{month:'short'}),full:fmtD(s,{month:'long',year:'numeric'})})}
    label=String(a.getFullYear())}
  return{a:+a,b:+b,buckets,label};
}
function shiftAnchor(range,iso,dir){
  const d=isoDate(iso);
  if(range==='day')d.setDate(d.getDate()+dir);else if(range==='week')d.setDate(d.getDate()+7*dir);
  else if(range==='month'){d.setDate(1);d.setMonth(d.getMonth()+dir)}else{d.setMonth(0,1);d.setFullYear(d.getFullYear()+dir)}
  return dateToISO(d);
}
const calIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
function navHTML(range,iso,allowFuture){
  const P=period(range,iso),future=!allowFuture&&(range==='day'?P.a+DAY>Date.now():P.b>Date.now());
  return `<div class="range-nav"><button type="button" data-shift="-1" aria-label="Previous">‹</button><button type="button" class="plabel" data-pick aria-label="Pick a date">${calIcon}${P.label}</button><button type="button" data-shift="1" aria-label="Next"${future?' disabled':''}>›</button>${P.a<=Date.now()&&Date.now()<P.b?'':'<button class="linkbtn" type="button" data-shift="0">Back to now</button>'}</div>`;
}
/* small calendar to jump to a day / week / month / year */
function openPeriodPicker(anchor,range,iso,onPick){
  let view=isoDate(iso),mode=range==='month'?'month':range==='year'?'year':'day';
  const sel=period(range,iso);
  const draw=el=>{
    const today=todayISO();let head,body;
    if(mode==='day'){
      const y=view.getFullYear(),m=view.getMonth(),start=weekStartOf(new Date(y,m,1));
      head=`<button type="button" data-nav="-1" aria-label="Previous month">‹</button><strong>${MONTHS[m]} ${y}</strong><button type="button" data-nav="1" aria-label="Next month">›</button>`;
      let cells=['Mo','Tu','We','Th','Fr','Sa','Su'].map(c=>`<span class="dp-dow" style="font-size:11px;color:var(--ink-3);font-weight:700;text-align:center;padding:4px 0">${c}</span>`).join('');
      for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),di=dateToISO(d),t=+d;
        cells+=`<button type="button" data-d="${di}" class="${d.getMonth()!==m?'out ':''}${t>=sel.a&&t<sel.b?'sel ':''}${di===today?'today':''}">${d.getDate()}</button>`}
      body=`<div class="pp-grid">${cells}</div>`;
    }else if(mode==='month'){
      const y=view.getFullYear();
      head=`<button type="button" data-nav="-12" aria-label="Previous year">‹</button><strong>${y}</strong><button type="button" data-nav="12" aria-label="Next year">›</button>`;
      body=`<div class="pp-grid m">${MONTHS.map((mn,i)=>{const t=+new Date(y,i,1);return`<button type="button" data-d="${dateToISO(new Date(y,i,1))}" class="${t>=sel.a&&t<sel.b?'sel':''}">${mn.slice(0,3)}</button>`}).join('')}</div>`;
    }else{
      const y0=view.getFullYear()-7;
      head=`<button type="button" data-nav="-144" aria-label="Earlier years">‹</button><strong>${y0} to ${y0+11}</strong><button type="button" data-nav="144" aria-label="Later years">›</button>`;
      body=`<div class="pp-grid m">${[...Array(12)].map((_,i)=>`<button type="button" data-d="${y0+i}-01-01" class="${y0+i===isoDate(iso).getFullYear()?'sel':''}">${y0+i}</button>`).join('')}</div>`;
    }
    el.innerHTML=`<div class="dp-head">${head}</div>${body}`;
    if(mode==='day'&&range==='week')el.querySelectorAll('[data-d]').forEach(b=>{b.onmouseenter=()=>{const ws=+weekStartOf(isoDate(b.dataset.d));el.querySelectorAll('[data-d]').forEach(x=>{const t=+isoDate(x.dataset.d);x.classList.toggle('hl',t>=ws&&t<ws+7*DAY)})}});
  };
  openPop(anchor,'',el=>{el.classList.add('pp');draw(el);place(el,anchor);
    el.addEventListener('click',e=>{const n=e.target.closest('[data-nav]'),d=e.target.closest('[data-d]');
      if(n){view=new Date(view.getFullYear(),view.getMonth()+ +n.dataset.nav,1);draw(el);return}
      if(d){closePop();onPick(d.dataset.d)}});
  });
}

