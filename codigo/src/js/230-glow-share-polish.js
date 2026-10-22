/* ---------- the glow runs around the microtasks box too; Share window: people show only after typing and picking one,
   Pass is gone (Send does that now) ---------- */
{const _r=render;render=function(){_r.apply(this,arguments);
  // the L-shaped ring is used only once its shape is measured (.gclip); a row without its microtasks box keeps the plain ring
  glowRO.disconnect();document.querySelectorAll('.task.glow.has-mt').forEach(r=>{shapeGlow(r);glowRO.observe(r);const w=r.nextElementSibling;if(w&&w.classList.contains('mt-wrap'))glowRO.observe(w)})}}
function shapeGlow(r){r.classList.remove('gclip');const w=r.nextElementSibling;if(!w||!w.classList.contains('mt-wrap'))return;
  const a=r.getBoundingClientRect(),b=w.getBoundingClientRect();if(!a.width||!b.width)return;
  r.style.setProperty('--mth',Math.max(0,b.bottom-a.bottom)+'px');r.style.setProperty('--gclip',`path(evenodd,"${glowPath(a,b)}")`);r.classList.add('gclip')}
// the shape is measured again whenever the task or its microtasks box changes size (window resize, timer panel, fonts loading)
const glowRO=new ResizeObserver(es=>{const done=new Set();es.forEach(e=>{const el=e.target,r=el.classList.contains('mt-wrap')?el.previousElementSibling:el;
  if(r&&!done.has(r)&&r.classList.contains('glow')){done.add(r);shapeGlow(r)}})});
// the ring hugs the task and then the narrower microtasks box under it (outer outline, then the same shape 2.5px inside)
function glowPath(a,b){const g=4,A=a.width+2*g,B=a.height+2*g,L=Math.max(0,b.left-a.left),Rx=Math.min(A,b.right-a.left+2*g),Y=b.bottom-a.top+2*g,f=n=>Math.round(n*10)/10;
  const ring=o=>{const rt=14-o,rm=12-o,arc=(r,x,y)=>`A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}`;
    let d=`M${f(o+rt)} ${f(o)}H${f(A-o-rt)}${arc(rt,A-o,o+rt)}`;
    const R=6+o,cc=(x,y)=>`A${f(R)} ${f(R)} 0 0 0 ${f(x)} ${f(y)}`; // rounded inner corners where the box steps in
    if(Rx<A-6)d+=`V${f(B-o-rt)}${arc(rt,A-o-rt,B-o)}H${f(Rx-o+R)}${cc(Rx-o,B-o+R)}`;
    d+=`V${f(Y-o-rm)}${arc(rm,Rx-o-rm,Y-o)}H${f(L+o+rm)}${arc(rm,L+o,Y-o-rm)}`;
    d+=L>6?`V${f(B-o+R)}${cc(L+o-R,B-o)}H${f(o+rt)}${arc(rt,o,B-o-rt)}`:'';return d+`V${f(o+rt)}${arc(rt,o+rt,o)}Z`};
  return ring(0)+ring(2.5)}
{const _osp=openSharePop;openSharePop=function(anchor,t){_osp(anchor,t);const el=pop&&pop.el;if(!el||!el.querySelector('.share-pop'))return;
  const res=el.querySelector('.sp-res'),q=el.querySelector('#sp-q');let picked=null;el.classList.add('pickfirst');
  const tidy=()=>{const typed=!!q.value.trim();res.hidden=!typed;
    res.querySelectorAll('.sp-row').forEach((r,i)=>{r.classList.toggle('picked',picked===i);r.setAttribute('role','button');r.tabIndex=0})};
  q.placeholder='Type a name or email';q.addEventListener('input',()=>{picked=null;setTimeout(tidy,0)});
  new MutationObserver(()=>tidy()).observe(res,{childList:true});tidy();
  res.addEventListener('click',e=>{if(e.target.closest('button'))return;const r=e.target.closest('.sp-row');if(!r)return;const i=[...res.querySelectorAll('.sp-row')].indexOf(r);picked=picked===i?null:i;tidy()});
  res.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('sp-row')){e.preventDefault();e.target.click()}});
  const h=el.querySelector('.share-pop .sp-hint:last-child');if(h)h.innerHTML='Pick a person. <b>Send</b>: it goes to their list and leaves yours (it waits in Done › Done my part). <b>Share</b>: you both keep it, and edits and done sync.'}}
