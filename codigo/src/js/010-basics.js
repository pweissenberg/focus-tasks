const KEY='focus-todo-v1';
const PALETTE=['#3d6fd6','#4e9a5b','#d08a3c','#c2553f','#8e5cc9','#2a9d9a','#c9a227','#d0607f','#5f6f86','#8a8f98'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const NEUTRAL='#9aa3b2';
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const dateToISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayISO=()=>dateToISO(new Date());
const isoToUS=iso=>{if(!iso)return'';const[y,m,d]=iso.split('-');return`${m}/${d}/${y}`};
const tsToUS=ts=>{const d=new Date(ts);return`${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`};
function parseDate(s){
  s=(s||'').trim().toLowerCase(); if(!s) return '';
  const now=new Date();
  if(s==='today'||s==='hoje') return todayISO();
  if(s==='tomorrow'||s==='amanhã'||s==='amanha'){now.setDate(now.getDate()+1);return dateToISO(now)}
  let y,mo,d,m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){y=+m[1];mo=+m[2];d=+m[3]}
  else{m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/); if(!m) return null;
    mo=+m[1];d=+m[2];y=m[3]?+m[3]:now.getFullYear(); if(y<100) y+=2000;}
  const dt=new Date(y,mo-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d) return null;
  return dateToISO(dt);
}

