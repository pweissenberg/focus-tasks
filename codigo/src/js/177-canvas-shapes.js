/* ---------- Free canvas: geometric shapes ---------- */
// a shape is a stroke with shape + x1,y1,x2,y2 instead of pts, so Undo, Erase, Clear and project sync treat it like a line
const SHAPES={rect:'Rectangle',ellipse:'Ellipse',tri:'Triangle',line:'Line',arrow:'Arrow'};
const SHAPE_IC={rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
  tri:'<path d="M12 4l9 16H3z"/>',line:'<path d="M5 19L19 5"/>',arrow:'<path d="M5 19L19 5M10 5h9v9"/>'};
let shpSel=null,shaping=null,shpMove=null;
const shapeToolsHTML=tool=>Object.entries(SHAPES).map(([k,l])=>`<button class="tool${tool===k?' on':''}" type="button" data-tool="${k}" aria-pressed="${tool===k}" title="${l}" aria-label="${l}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SHAPE_IC[k]}</svg></button>`).join('');
const r1=n=>Math.round(n*10)/10;
function shapeD(s){
  const {x1,y1,x2,y2}=s,l=Math.min(x1,x2),t=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1);
  if(s.shape==='rect')return`M${l} ${t}h${w}v${h}h${-w}z`;
  if(s.shape==='ellipse'){const rx=w/2,ry=h/2;return`M${l} ${t+ry}a${rx} ${ry} 0 1 0 ${w} 0a${rx} ${ry} 0 1 0 ${-w} 0z`}
  if(s.shape==='tri')return`M${(x1+x2)/2} ${y1}L${x2} ${y2}L${x1} ${y2}z`;
  let d=`M${x1} ${y1}L${x2} ${y2}`;
  if(s.shape==='arrow'){const a=Math.atan2(y2-y1,x2-x1),k=Math.max(12,s.w*3.5),b=Math.PI/7;
    d+=`M${r1(x2-k*Math.cos(a-b))} ${r1(y2-k*Math.sin(a-b))}L${x2} ${y2}L${r1(x2-k*Math.cos(a+b))} ${r1(y2-k*Math.sin(a+b))}`}
  return d;
}
function shapeHTML(s){
  const d=shapeD(s),sel=shpSel===s.id&&S.ui.cvTool==='move';
  let h=`<path data-sid="${s.id}" class="shp-hit" d="${d}" style="stroke-width:${s.w+14}px"/><path data-sid="${s.id}" class="shp${sel?' sel':''}" d="${d}" style="stroke:${penCss(s.color)};stroke-width:${s.w}px"/>`;
  if(sel){const p=s.w/2+6,l=Math.min(s.x1,s.x2)-p,t=Math.min(s.y1,s.y2)-p,w=Math.abs(s.x2-s.x1)+2*p,ht=Math.abs(s.y2-s.y1)+2*p;
    h+=`<rect class="shp-box" x="${l}" y="${t}" width="${w}" height="${ht}" rx="4"/><g class="shp-del" data-shpdel="${s.id}" transform="translate(${l+w} ${t})" role="button" aria-label="Delete shape"><title>Delete shape</title><circle r="11"/><path d="M-4 -4L4 4M4 -4L-4 4"/></g>`}
  return h;
}
function delShape(p,id){
  const i=p.strokes.findIndex(s=>s.id===id);if(i<0)return;const s=p.strokes[i];
  p.strokes.splice(i,1);shpSel=null;commit();
  toast('Shape deleted.',()=>{p.strokes.splice(Math.min(i,p.strokes.length),0,s);commit()});
}
// color or width buttons restyle the selected shape while Select is on
function shapeRestyle(k,v){
  if(S.ui.cvTool!=='move'||!shpSel)return false;const p=curProject(),s=p&&p.strokes.find(x=>x.id===shpSel);if(!s)return false;
  s[k]=v;commit();return true;
}
const cvPt=(svg,e)=>{const r=svg.getBoundingClientRect();return[Math.round((e.clientX-r.left)/cvZ()),Math.round((e.clientY-r.top)/cvZ())]};
pp.addEventListener('pointerdown',e=>{
  const cv=e.target.closest('#cv');if(!cv)return;
  const tool=S.ui.cvTool||'pen',p=curProject(),svg=cv.querySelector('svg.ink');
  if(tool==='move'){
    const del=e.target.closest('[data-shpdel]');if(del){e.preventDefault();delShape(p,del.dataset.shpdel);return}
    const hit=e.target.closest('path.shp-hit');
    if(!hit){if(shpSel&&!e.target.closest('.cv-item')){shpSel=null;render()}return}
    const s=p.strokes.find(x=>x.id===hit.dataset.sid);if(!s)return;
    e.preventDefault();hit.setPointerCapture(e.pointerId);
    svg.querySelectorAll('.shp-box,.shp-del').forEach(n=>n.remove());
    shpSel=s.id;shpMove={s,p,svg,start:cvPt(svg,e),o:[s.x1,s.y1,s.x2,s.y2],moved:false};return;
  }
  if(!SHAPES[tool]||e.target.closest('.cv-btn,.cv-grip'))return;
  e.preventDefault();svg.setPointerCapture(e.pointerId);
  const [x,y]=cvPt(svg,e),s={id:uid(),shape:tool,color:S.ui.penColor||'ink',w:S.ui.penW||3,x1:x,y1:y,x2:x,y2:y};
  svg.insertAdjacentHTML('beforeend',`<path data-sid="${s.id}" class="shp" d="${shapeD(s)}" style="stroke:${penCss(s.color)};stroke-width:${s.w}px"/>`);
  shaping={s,p,svg,el:svg.lastElementChild};
});
pp.addEventListener('pointermove',e=>{
  if(shpMove){const M=shpMove,[x,y]=cvPt(M.svg,e),dx=x-M.start[0],dy=y-M.start[1];
    if(!M.moved&&Math.hypot(dx,dy)<3)return;M.moved=true;
    [M.s.x1,M.s.y1,M.s.x2,M.s.y2]=[M.o[0]+dx,M.o[1]+dy,M.o[2]+dx,M.o[3]+dy];
    M.svg.querySelectorAll(`[data-sid="${M.s.id}"]`).forEach(n=>n.setAttribute('d',shapeD(M.s)));return}
  const D=shaping;if(!D)return;
  let [x,y]=cvPt(D.svg,e);const s=D.s;
  if(e.shiftKey){const dx=x-s.x1,dy=y-s.y1;
    if(s.shape==='line'||s.shape==='arrow'){const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4),len=Math.hypot(dx,dy);x=Math.round(s.x1+len*Math.cos(a));y=Math.round(s.y1+len*Math.sin(a))}
    else{const m=Math.max(Math.abs(dx),Math.abs(dy));x=s.x1+Math.sign(dx||1)*m;y=s.y1+Math.sign(dy||1)*m}}
  s.x2=x;s.y2=y;D.el.setAttribute('d',shapeD(s));
});
const endShape=()=>{
  if(shpMove){const M=shpMove;shpMove=null;if(M.moved)commit();else render();return}
  const D=shaping;shaping=null;if(!D)return;const s=D.s;
  if(Math.abs(s.x2-s.x1)<4&&Math.abs(s.y2-s.y1)<4){D.el.remove();return}
  D.p.strokes.push(s);shpSel=null;commit();
};
pp.addEventListener('pointerup',endShape);pp.addEventListener('pointercancel',endShape);
document.addEventListener('keydown',e=>{
  if(!shpSel||S.ui.view!=='project'||S.ui.projTab!=='free'||S.ui.cvTool!=='move'||modal||pop)return;
  if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();delShape(curProject(),shpSel)}
  else if(e.key==='Escape'){shpSel=null;render()}
},true);
