/* ---------- Tree v77 (Pedro's list items 1-4, then his 4 follow-ups).
   1: a Bracket's name (and a vertical line's) can be written vertically: "↕" in its tools when it is selected (`m.vert`).
   2: a Box's name can be dragged along its top or bottom edge (`m.bx` px from the left, `m.bedge` 'top' | 'bottom').
   3: Tree view per project and device (`S.ui.trView[pid]`): 'list' (one under the other) or 'org' (Top down: the nodes under
      a node side by side below it; "Side by side" was removed). In Top down a parent sits centered over the middle of its first
      and last child (`orgCenter`, sets --cx / --pcx for the connectors), and every guide keeps marking the same nodes, turned:
      a Bracket runs under its nodes (m.dx = distance from them), a Line becomes a vertical divider between its node and the next
      one (or stays under it when the next one is its child), an Arrow from a node with nothing under it points down.
   4: guide type 'vl' = a vertical dashed line starting at node `from` (`to` = `from`), length `m.len` (drag its bottom end),
      moved sideways with `m.dx`, its name beside it (dragged along it, `m.ly`). It never runs through a node (`vlFree`).
   CSS 313-tree-views-vline.css. ---------- */
const trViewOf=p=>((S.ui.trView||{})[p.id])==='org'?'org':'list';
const TRV=[['list','☰ List','One node under the other'],['org','⇣ Top down','The nodes under a node sit side by side below it']];
{const _rt=renderTreeTab;renderTreeTab=function(p,body){
  // a Line is one thing: lying in List, standing in Top down. The separate vertical lines made before become Lines after their node.
  if(tmList(p).some(m=>m.type==='vl')){tmList(p).forEach(m=>{if(m.type==='vl'){m.type='h';m.to=m.from;m.label2=m.label2||'';delete m.len;delete m.dx}});save()}
  _rt(p,body);
  const cv=body.querySelector('.tr-canvas'),bar=body.querySelector('.tr-bar'),ro=typeof isRO==='function'&&isRO(p),v=trViewOf(p);
  if(cv)cv.classList.toggle('tr-org',v==='org');
  if(bar&&trNodes(p).length){
    bar.insertAdjacentHTML('beforeend',`<span class="trv-seg" role="group" aria-label="Tree view">${TRV.map(([k,l,t])=>`<button type="button" data-trview="${k}" class="${k===v?'on':''}" title="${t}" aria-pressed="${k===v}">${l}</button>`).join('')}</span>`);
    // one Line button: a dashed line under a node in List, a vertical line in Top down; the Bracket icon shows its end dashes
    const bk=bar.querySelector('[data-tmadd="v"]');if(bk)bk.innerHTML='<svg class="gd-bkic" viewBox="0 0 10 14" width="10" height="14" aria-hidden="true"><path d="M1 1.2H8.2V12.8H1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.2 1.6"/></svg> Bracket';
    const ln=bar.querySelector('[data-tmadd="h"]');if(ln&&v==='org'){ln.title='Dashed line after a node: lying in List, standing here';ln.textContent='┆ Line'}}
  if(cv&&!ro)cv.querySelectorAll('.gd-h').forEach(d=>d.insertAdjacentHTML('beforeend','<i class="gd-rs bot gd-hvlen" data-tmdrag="hlen" title="Drag to make it longer or shorter"></i>'));
  if(!cv)return;
  tmList(p).forEach(m=>{const d=cv.querySelector(`[data-tm="${m.id}"]`);if(!d)return;
    if(m.type==='vl'){const lab=d.querySelector('.gd-lab'),tools=d.querySelector('.gd-tools');
      d.innerHTML=`<i class="gd-hit" data-vl="x" title="Drag sideways to move it"></i>${ro?'':'<i class="gd-rs top" data-vl="from" title="Drag to another node"></i><i class="gd-rs bot" data-vl="len" title="Drag to make it longer or shorter"></i>'}`;
      if(lab){const i=lab.querySelector('.gd-in');if(i){i.placeholder='Name';i.setAttribute('aria-label','Name of this line')}d.appendChild(lab)}
      if(tools)d.appendChild(tools)}
    if((m.type==='v'||m.type==='vl')){d.classList.toggle('gd-vert',!!m.vert);const del=d.querySelector('[data-tmdel]');
      if(del&&!ro)del.insertAdjacentHTML('beforebegin',`<button type="button" data-tmrot title="${m.vert?'Write the name across':'Write the name vertically'}">${m.vert?'↔':'↕'}</button>`)}});
  tmLayout(p);requestAnimationFrame(()=>tmLayout(p));
}}
// Top down: each parent centered over the middle of its first and last child (children first, then their parents)
function orgCenter(cv){
  const lis=[...cv.querySelectorAll('.tr-li')],kid=(li,s)=>li.querySelector(':scope>'+s);
  lis.forEach(li=>{const n=kid(li,'.tr-node'),u=kid(li,'.tr-ul');if(n)n.style.marginLeft='';if(u){u.style.marginLeft='';u.style.removeProperty('--pcx')}li.style.removeProperty('--cx')});
  if(!cv.classList.contains('tr-org'))return;
  const mid=e=>{const r=e.getBoundingClientRect();return r.left+r.width/2};
  lis.reverse().forEach(li=>{const n=kid(li,'.tr-node'),u=kid(li,'.tr-ul');if(!n)return;
    const ks=u?[...u.children].map(c=>kid(c,'.tr-node')).filter(Boolean):[];
    if(ks.length){const want=(mid(ks[0])+mid(ks[ks.length-1]))/2-mid(n);
      if(want>=0)n.style.marginLeft=want+'px';else u.style.marginLeft=(-want)+'px'}
    const c=mid(n);li.style.setProperty('--cx',(c-li.getBoundingClientRect().left)+'px');
    if(u)u.style.setProperty('--pcx',(c-u.getBoundingClientRect().left)+'px')});
}
// a vertical line is pushed beside any node it would run through
function vlFree(x,t,b,rows){
  const iv=rows.filter(r=>r.bottom>t&&r.top<b).map(r=>[r.left-10,r.right+10]).sort((a,c)=>a[0]-c[0]),M=[];
  iv.forEach(s=>{const l=M[M.length-1];if(l&&s[0]<=l[1])l[1]=Math.max(l[1],s[1]);else M.push(s.slice())});
  const hit=M.find(s=>x>s[0]&&x<s[1]);if(!hit)return x;
  return x-hit[0]<=hit[1]-x&&hit[0]>=0?hit[0]:hit[1];
}
function gdBoxLabPlace(d,m){const l=d.querySelector('.gd-lab');if(!l)return;
  if(m.bx!=null){l.style.left=Math.max(0,Math.min(d.offsetWidth-l.offsetWidth,m.bx))+'px'}else l.style.left='';
  if(m.bedge==='top'){l.style.top='-13px';l.style.bottom='auto'}else{l.style.top='';l.style.bottom=''}}
function gdVLabPlace(d,m){const l=d.querySelector('.gd-lab');if(!l)return;const H=d.offsetHeight,ly=m.ly!=null?Math.max(0,Math.min(1,m.ly)):.5;l.style.top=(ly*H-l.offsetHeight/2)+'px'}
// Top down: the guides keep marking the same nodes, turned to fit the layout
function tmOrg(p,R){
  const {cv,rows}=R,flat=trFlat(p),idx=id=>flat.indexOf(id),maxB=Math.max(...rows.map(r=>r.bottom));let needB=maxB;
  const desc=id=>new Set(trDesc(p,id).map(x=>x.id));
  tmList(p).forEach(m=>{const d=cv.querySelector(`[data-tm="${m.id}"]`);if(!d||m.type==='vl')return;const a=idx(m.from);if(a<0)return;
    d.classList.remove('gd-hv','gd-ad');
    if(m.type==='h'||m.type==='a'){const r=rows.filter(x=>x.i>=0&&x.i<=a).pop();if(!r){d.hidden=true;return}
      const sub=desc(r.id),nx=rows.filter(x=>x.i>r.i).sort((x,y)=>x.i-y.i)[0];
      if(m.type==='a'){if(rows.some(x=>sub.has(x.id)))return;  // a node with nodes under it keeps its arrow going right
        const len=Math.max(24,m.len||70);d.classList.add('gd-ad');
        Object.assign(d.style,{left:((r.left+r.right)/2)+'px',top:(r.bottom+4)+'px',width:'',height:len+'px'});
        const lab=d.querySelector('.gd-lab');needB=Math.max(needB,r.bottom+4+len+14+(lab?lab.offsetHeight:0));return}
      // standing: right after the node and everything under it, between it and the next node on its right
      const sr=rows.filter(x=>x===r||sub.has(x.id)),sRight=Math.max(...sr.map(x=>x.right)),sBot=Math.max(...sr.map(x=>x.bottom));
      const nd=rows.filter(x=>x.i>r.i&&!sub.has(x.id)).sort((x,y)=>x.i-y.i)[0],side=nd&&nd.left>sRight-2;
      const x=side?(sRight+nd.left)/2:sRight+16,t=Math.min(r.top,side?nd.top:r.top)-8,bot=Math.max(sBot,side?nd.bottom:0);
      const h=m.hlen?Math.max(24,m.hlen):bot+34-t;d.classList.add('gd-hv');
      Object.assign(d.style,{left:x+'px',top:t+'px',width:'',height:h+'px'});
      // its texts beside it, just under the nodes: the one above on the left, the one below on the right
      d.querySelectorAll('.gd-lab').forEach(l=>{l.style.left='';l.style.right='';l.style.top=Math.min(h-l.offsetHeight,bot-t+4)+'px'});
      needB=Math.max(needB,t+h+10);
      return}
    const b=idx(m.to),lo=Math.min(a,b),hi=Math.max(a,b),inR=rows.filter(r=>r.i>=lo&&r.i<=hi);if(!inR.length){d.hidden=true;return}
    const L=Math.min(...inR.map(r=>r.left)),Rt=Math.max(...inR.map(r=>r.right)),T=Math.min(...inR.map(r=>r.top)),B=Math.max(...inR.map(r=>r.bottom));
    if(m.type==='box'){Object.assign(d.style,{left:(L-8)+'px',top:(T-6)+'px',width:(Rt-L+16)+'px',height:(B-T+12)+'px'});gdBoxLabPlace(d,m);needB=Math.max(needB,B+20);return}
    const inS=new Set(inR.map(r=>r.id));
    if(new Set(inR.map(r=>Math.round(r.top))).size>1){
      // nodes one under the other (a node and what is under it): the bracket stays upright beside them, ending at the last one, as in List
      // on their right when the way is clear, else on their left, else past whatever is in the way
      d.classList.remove('gd-tv','gd-vleft');const first=inR[0],last=inR[inR.length-1],oth=rows.filter(r=>!inS.has(r.id)&&r.bottom>T&&r.top<B);
      const clear=(x1,x2)=>!oth.some(r=>r.right+6>Math.min(x1,x2)&&r.left-6<Math.max(x1,x2));
      let base=Rt+22,mn=Rt+8,x=Math.max(mn,base+(m.dx||0)),left=false,hit;
      if(!clear(Math.min(...inR.map(r=>r.right)),x+14)){const lx=L-14;
        if(lx>=4&&clear(lx-14,Math.max(...inR.map(r=>r.left)))){left=true;base=lx;mn=0;x=lx}
        else while((hit=oth.find(r=>x>r.left-10&&x<r.right+10)))x=hit.right+10}
      d.classList.toggle('gd-vleft',left);
      d.dataset.base=base;d.dataset.min=mn;Object.assign(d.style,{left:x+'px',top:(T-2)+'px',width:'',height:(B-T+4)+'px'});
      const aT=Math.max(6,left?first.left-x-4:x-first.right-4),aB=Math.max(6,left?last.left-x-4:x-last.right-4);d.dataset.at=aT;d.dataset.ab=aB;
      const st=d.querySelector('.gd-stub.top'),sb=d.querySelector('.gd-stub.bot');
      if(st)Object.assign(st.style,{height:'',width:(m.stubT!=null?Math.min(aT,Math.max(6,m.stubT)):aT)+'px'});if(sb)Object.assign(sb.style,{height:'',width:(m.stubB!=null?Math.min(aB,Math.max(6,m.stubB)):aB)+'px'});
      const lab=d.querySelector('.gd-lab');if(lab){lab.style.left='';gdVLabPlace(d,m)}return}
    d.classList.add('gd-tv');
    // bracket: a dashed line under its nodes, with short dashes going up to the first and last one
    // below its nodes and below whatever hangs under them in that stretch, so it never runs through a node
    const below=rows.filter(r=>!inS.has(r.id)&&r.top>=B-2&&r.right>L&&r.left<Rt),Bb=Math.max(B,...below.map(r=>r.bottom));
    const y=Math.max(Bb+8,Bb+22+(m.dx||0));d.dataset.obase=Bb+22;d.dataset.omin=Bb+8;
    Object.assign(d.style,{left:L+'px',top:y+'px',width:(Rt-L)+'px',height:''});
    const lr=inR.reduce((s,r)=>r.left<s.left?r:s),rr=inR.reduce((s,r)=>r.right>s.right?r:s);
    const st=d.querySelector('.gd-stub.top'),sb=d.querySelector('.gd-stub.bot');
    // a dash going up to its node, cut short when a node is in the way
    const stub=(el,x,r)=>{if(!el)return;const free=!below.some(o=>o.left-4<x&&o.right+4>x&&o.top<y&&o.bottom>r.bottom);Object.assign(el.style,{width:'',height:(free?Math.max(6,y-r.bottom-4):10)+'px'})};
    stub(st,lr.left,lr);stub(sb,rr.right,rr);
    const lab=d.querySelector('.gd-lab');if(lab){const W=Rt-L,ly=m.ly!=null?m.ly:.5;lab.style.left=Math.max(0,Math.min(W-lab.offsetWidth,ly*W-lab.offsetWidth/2))+'px';lab.style.top='8px';
      needB=Math.max(needB,y+8+lab.offsetHeight+6)}});
  return needB;
}
{const _l=tmLayout;tmLayout=function(p){
  const cv0=$('#projBody .tr-canvas');if(cv0)orgCenter(cv0);
  // 226 does not know the vertical line: lay out the others without it
  const all=tmList(p),vls=all.filter(m=>m.type==='vl');if(vls.length){p.treeMarks=all.filter(m=>m.type!=='vl');try{_l(p)}finally{p.treeMarks=all}}else _l(p);const R=tmRows();if(!R||!R.rows.length)return;
  const {cv,rows}=R,flat=trFlat(p),idx=id=>flat.indexOf(id),v=trViewOf(p),lay=cv.querySelector('.gd-layer');rows.forEach(r=>r.i=idx(r.id));
  const maxRight=Math.max(...rows.map(r=>r.right));let W=lay?parseFloat(lay.style.width)||0:0,needH=v==='org'?tmOrg(p,R)+14:0;
  tmList(p).forEach(m=>{const d=cv.querySelector(`[data-tm="${m.id}"]`);if(!d)return;const a=idx(m.from);
    if(m.type==='box'&&v==='list')gdBoxLabPlace(d,m);
    if(m.type==='v'&&m.vert&&v==='list')gdVLabPlace(d,m);
    if(m.type==='vl'){
      // starts at its node (or the last one shown before it, when it is folded away)
      const r=rows.filter(x=>x.i>=0&&x.i<=a).pop()||rows[0];if(a<0){d.hidden=true;return}
      const base=maxRight+22,h=Math.max(24,m.len||120),t=r.top-2,x=vlFree(Math.max(0,base+(m.dx||0)),t,t+h,rows);d.dataset.base=base;
      Object.assign(d.style,{left:x+'px',top:t+'px',width:'',height:h+'px'});d.hidden=false;gdVLabPlace(d,m);
      const lab=d.querySelector('.gd-lab');W=Math.max(W,x+14+(lab?lab.offsetWidth:0)+8);needH=Math.max(needH,t+h+14)}});
  if(lay&&W>parseFloat(lay.style.width||0)){lay.style.width=W+'px';if(v==='list')cv.querySelectorAll('.gd-h').forEach(d=>d.style.width=W+'px')}
  cv.style.minHeight=needH?needH+'px':'';
}}
function openVlAdd(anchor){
  const p=curProject(),flat=trFlat(p),N=trNodes(p),nm=id=>{const n=N.find(x=>x.id===id),t=trTask(n);return (t?t.name:n.name)||'Untitled'};
  openPop(anchor,`<form class="gd-pop" autocomplete="off"><div class="asg-h">Vertical line</div>
    <label>Starts at <select id="tm-from">${flat.map(id=>`<option value="${id}">${esc(nm(id))}</option>`).join('')}</select></label>
    <label>Name <input id="tm-name" type="text" placeholder="Phase 1" maxlength="60"></label>
    <label class="vl-vert"><input id="tm-vert" type="checkbox"> Write the name vertically</label>
    <button class="btn sm primary">Add</button></form>`,el=>{
    el.classList.add('pop-menu','gd-popw');place(el,anchor);
    el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const from=el.querySelector('#tm-from').value;
      const m={id:uid(),type:'vl',from,to:from,label:el.querySelector('#tm-name').value.trim(),color:TM_COLORS[4],len:120,vert:el.querySelector('#tm-vert').checked};
      tmList(p).push(m);tmSel=m.id;closePop();commit()});
    setTimeout(()=>el.querySelector('#tm-name').focus(),0)});
}
// clicks: view switch, add a vertical line, turn the name, delete a vertical line (its own toast text)
pp.addEventListener('click',e=>{
  const vw=e.target.closest('[data-trview]');
  if(vw){const p=curProject();if(!p)return;S.ui.trView=Object.assign({},S.ui.trView,{[p.id]:vw.dataset.trview});commit();return}
  const va=e.target.closest('[data-vladd]');if(va){e.stopPropagation();openVlAdd(va);return}
  const rot=e.target.closest('[data-tmrot]');if(rot){const {m}=tmOf(rot);if(m){m.vert=!m.vert;commit()}e.stopPropagation();return}
  const del=e.target.closest('[data-tmdel]');if(del){const {p,m}=tmOf(del);if(m&&m.type==='vl'){e.stopPropagation();const old=JSON.stringify(p.treeMarks);
    p.treeMarks=tmList(p).filter(x=>x!==m);tmSel=null;commit();toast(`Deleted the vertical line${m.label?` "${m.label}"`:''}.`,()=>{p.treeMarks=JSON.parse(old);commit()})}}
},true);
// Top down: dragging a turned guide (the list view handlers in 226 / 240 assume the vertical list)
pp.addEventListener('pointerdown',e=>{
  if(e.button||!e.target.closest('#projBody .tr-canvas.tr-org .gd'))return;
  const {p,d,m}=tmOf(e.target);if(!m||m.type==='box'||m.type==='vl'||(typeof isRO==='function'&&isRO(p)))return;
  if(m.type==='v'&&!d.classList.contains('gd-tv'))return;  // an upright bracket: the List handlers work
  const g=e.target.closest('[data-tmdrag]'),lab=e.target.closest('.gd-lab');
  if(lab){if(m.type==='h'&&!d.classList.contains('gd-hv'))return;e.stopPropagation();  // a turned line's texts stay at its top; still a click edits
    if(m.type!=='v')return;const inp=lab.querySelector('.gd-in');if(inp&&document.activeElement===inp)return;
    const x0=e.clientX,l0=lab.offsetLeft;let moved=false,v=null;
    const mv=ev=>{const dx=ev.clientX-x0;if(!moved){if(Math.abs(dx)<5)return;moved=true;if(inp)inp.blur();document.body.classList.add('gd-lmoving');tmSelect(m.id)}
      ev.preventDefault();const W=d.offsetWidth,x=Math.max(0,Math.min(W-lab.offsetWidth,l0+dx));lab.style.left=x+'px';v=W?(x+lab.offsetWidth/2)/W:.5};
    const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);document.body.classList.remove('gd-lmoving');
      if(moved&&v!=null){m.ly=Math.round(v*1000)/1000;commit()}};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);return}
  if(!g)return;const which=g.dataset.tmdrag;
  if(m.type==='a'&&which==='len'&&!d.classList.contains('gd-ad'))return;  // an arrow still going right: 226 handles it
  e.stopPropagation();e.preventDefault();tmSelect(m.id);
  const flat=trFlat(p),y0=e.clientY,dx0=m.dx||0,len0=which==='hlen'?d.offsetHeight:(m.len||70),old={from:m.from,to:m.to};let moved=false;
  const near=ev=>{const R=tmRows();if(!R)return null;const x=ev.clientX-R.c.left+R.cv.scrollLeft,y=ev.clientY-R.c.top+R.cv.scrollTop;let best=null,bd=1e9;
    R.rows.forEach(r=>{const dd=Math.hypot((r.left+r.right)/2-x,(r.top+r.bottom)/2-y);if(dd<bd){bd=dd;best=r}});return best};
  const mv=ev=>{moved=true;
    if(m.type==='v'&&which==='x'){m.dx=Math.round(dx0+ev.clientY-y0)}
    else if(which==='hlen'){m.hlen=Math.max(24,Math.round(len0+ev.clientY-y0))}
    else if(m.type==='a'&&which==='len'){m.len=Math.max(24,Math.round(len0+ev.clientY-y0))}
    else{const b=near(ev);if(!b)return;
      if(m.type==='v'){const bi=flat.indexOf(b.id);if(which==='from'&&bi<=flat.indexOf(m.to))m.from=b.id;else if(which==='to'&&bi>=flat.indexOf(m.from))m.to=b.id}
      else if(which==='from')m.from=m.to=b.id}
    tmLayout(p)};
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);if(moved)commit();else Object.assign(m,old)};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
},true);
// dragging: a vertical line (sideways, its top onto another node, its bottom end for the length) and its name; a box's name
pp.addEventListener('pointerdown',e=>{
  const g=e.target.closest('[data-vl]');if(!g||e.button)return;
  const {p,d,m}=tmOf(g);if(!m||(typeof isRO==='function'&&isRO(p)))return;
  e.preventDefault();tmSelect(m.id);const k=g.dataset.vl,x0=e.clientX,y0=e.clientY,l0=parseFloat(d.style.left),t0=parseFloat(d.style.top),h0=d.offsetHeight,R=tmRows();
  let moved=false,val=null;
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;if(!moved&&Math.abs(dx)<3&&Math.abs(dy)<3)return;moved=true;
    if(k==='x'){const nx=R?vlFree(Math.max(0,l0+dx),t0,t0+h0,R.rows):Math.max(0,l0+dx);d.style.left=nx+'px';val=Math.round(nx-(+d.dataset.base))}
    else if(k==='len'){const h=Math.max(24,h0+dy);d.style.height=h+'px';if(R)d.style.left=vlFree(l0,t0,t0+h,R.rows)+'px';gdVLabPlace(d,m);val=Math.round(h)}
    else if(R){const y=t0+dy;let best=null,bd=1e9;R.rows.forEach(r=>{const dd=Math.abs(r.top-y);if(dd<bd){bd=dd;best=r}});d.style.top=y+'px';val=best&&best.id}};
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);if(!moved||val==null)return;
    if(k==='x')m.dx=val;else if(k==='len')m.len=val;else{m.from=m.to=val}commit()};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
});
pp.addEventListener('pointerdown',e=>{
  const lab=e.target.closest('.gd-vl .gd-lab,.gd-box .gd-lab');if(!lab||e.button)return;
  const {p,d,m}=tmOf(lab);if(!m||(typeof isRO==='function'&&isRO(p)))return;
  const inp=lab.querySelector('.gd-in');if(inp&&document.activeElement===inp)return;  // typing in it: normal text selection
  const box=m.type==='box',x0=e.clientX,y0=e.clientY,l0=lab.offsetLeft,t0=lab.offsetTop;let moved=false,v=null,edge=m.bedge||'bottom';
  const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;
    if(!moved){if(Math.abs(dx)<5&&Math.abs(dy)<5)return;moved=true;if(inp)inp.blur();document.body.classList.add('gd-lmoving');tmSelect(m.id)}
    ev.preventDefault();
    if(box){const r=d.getBoundingClientRect();edge=ev.clientY<r.top+r.height/2?'top':'bottom';v=Math.round(Math.max(0,Math.min(d.offsetWidth-lab.offsetWidth,l0+dx)));
      gdBoxLabPlace(d,Object.assign({},m,{bx:v,bedge:edge}))}
    else{const h=d.offsetHeight,lh=lab.offsetHeight,y=Math.max(-lh/2,Math.min(h-lh/2,t0+dy));lab.style.top=y+'px';v=h?(y+lh/2)/h:.5}};
  const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);document.body.classList.remove('gd-lmoving');
    if(!moved||v==null)return;if(box){m.bx=v;m.bedge=edge}else m.ly=Math.round(v*1000)/1000;commit()};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
});
