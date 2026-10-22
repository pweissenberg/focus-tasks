/* ---------- date picker ---------- */
let dp=null;
function openDP(input){
  if(dp&&dp.input===input)return; closeDP();
  const cur=parseDate(input.value)||todayISO();const[y,m]=cur.split('-').map(Number);
  const el=document.createElement('div');el.className='pop dp';
  el.addEventListener('mousedown',e=>e.preventDefault());
  el.addEventListener('click',e=>{
    const n=e.target.closest('[data-nav]'),d=e.target.closest('[data-d]'),q=e.target.closest('[data-q]');
    if(n){dp.m+=+n.dataset.nav;if(dp.m<0){dp.m=11;dp.y--}if(dp.m>11){dp.m=0;dp.y++}drawDP();return}
    let iso=null;
    if(d)iso=d.dataset.d;
    if(q)iso=q.dataset.q==='clear'?'':parseDate(q.dataset.q);
    if(iso!==null){input.value=isoToUS(iso);input.classList.remove('invalid');input.dispatchEvent(new Event('change',{bubbles:true}));closeDP()}
  });
  document.body.appendChild(el);dp={el,input,y,m:m-1};drawDP();
}
function drawDP(){
  const{el,input,y,m}=dp,sel=parseDate(input.value)||'',today=todayISO();
  const start=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let cells='';for(let i=0;i<start;i++)cells+='<span></span>';
  for(let d=1;d<=days;d++){const iso=`${y}-${pad(m+1)}-${pad(d)}`;cells+=`<button type="button" data-d="${iso}" class="${iso===sel?'sel ':''}${iso===today?'today':''}">${d}</button>`}
  el.innerHTML=`<div class="dp-head"><button type="button" data-nav="-1" aria-label="Previous month">‹</button><strong>${MONTHS[m]} ${y}</strong><button type="button" data-nav="1" aria-label="Next month">›</button></div>
    <div class="dp-grid dp-dow">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(c=>`<span>${c}</span>`).join('')}</div><div class="dp-grid">${cells}</div>
    <div class="dp-foot"><button type="button" data-q="today">Today</button><button type="button" data-q="tomorrow">Tomorrow</button><button type="button" data-q="clear">Clear</button></div>`;
  place(el,input);
}
function closeDP(){if(dp){dp.el.remove();dp=null}}
function bindDate(input){
  input.addEventListener('focus',()=>openDP(input));
  input.addEventListener('click',()=>openDP(input));
  input.addEventListener('input',()=>{input.classList.remove('invalid');const iso=parseDate(input.value);
    if(iso&&dp&&dp.input===input){const[y,m]=iso.split('-').map(Number);dp.y=y;dp.m=m-1;drawDP()}else if(dp&&dp.input===input)drawDP()});
  input.addEventListener('blur',()=>{closeDP();const iso=parseDate(input.value);
    if(iso===null)input.classList.add('invalid');else{input.value=isoToUS(iso);input.classList.remove('invalid')}});
  input.addEventListener('keydown',e=>{if(e.key==='Tab')closeDP()});
}

