/* ---------- Free canvas: zoom and images ---------- */
// S.ui.cvZoom scales the canvas (.cv gets transform:scale, .cv-size gives the scroll area its size); pointer math divides by cvZ()
const ZOOMS=[.25,.5,.75,1,1.25,1.5,2];
const cvZ=()=>S.ui.cvZoom||1;
const zoomBarHTML=()=>`<div class="tgroup zoomg"><button class="tool" type="button" data-zoom="-1" aria-label="Zoom out" title="Zoom out (Ctrl + wheel)"${cvZ()<=ZOOMS[0]?' disabled':''}>−</button><button class="tool zlab" type="button" data-zoom="0" title="Back to 100%">${Math.round(cvZ()*100)}%</button><button class="tool" type="button" data-zoom="1" aria-label="Zoom in" title="Zoom in (Ctrl + wheel)"${cvZ()>=ZOOMS[ZOOMS.length-1]?' disabled':''}>+</button></div>`;
// zoom keeping the point under (cx,cy) in place
function setZoom(z,cx,cy){
  z=Math.max(ZOOMS[0],Math.min(ZOOMS[ZOOMS.length-1],z));const old=cvZ();if(z===old)return;
  const w=$('#projBody .cv-wrap');let px,py;
  if(w){const r=w.getBoundingClientRect();if(cx==null){cx=r.left+r.width/2;cy=r.top+r.height/2}px=(w.scrollLeft+cx-r.left)/old;py=(w.scrollTop+cy-r.top)/old;
    cvScroll=[Math.max(0,px*z-(cx-r.left)),Math.max(0,py*z-(cy-r.top))]}
  S.ui.cvZoom=z;commit();
  const w2=$('#projBody .cv-wrap');if(w2&&cvScroll){w2.scrollLeft=cvScroll[0];w2.scrollTop=cvScroll[1]}
}
pp.addEventListener('click',e=>{
  const z=e.target.closest('[data-zoom]');if(z){const d=+z.dataset.zoom,i=ZOOMS.indexOf(cvZ());
    setZoom(d===0?1:i<0?1:ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,i+d))]);return}
  if(e.target.closest('[data-cvimg]')){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;
    inp.onchange=()=>[...inp.files].forEach((f,i)=>addCanvasImage(f,i));inp.click()}
});
pp.addEventListener('wheel',e=>{
  if(!(e.ctrlKey||e.metaKey)||!e.target.closest('.cv-wrap'))return;e.preventDefault();
  const i=ZOOMS.indexOf(cvZ()),j=i<0?3:Math.max(0,Math.min(ZOOMS.length-1,i+(e.deltaY<0?1:-1)));setZoom(ZOOMS[j],e.clientX,e.clientY);
},{passive:false});
// images are shrunk to 1200 px and stored in the project (so members see them too)
function shrinkForCanvas(file){return new Promise(ok=>{const img=new Image();img.onload=()=>{
  const m=1200,k=Math.min(1,m/Math.max(img.width,img.height)),w=Math.round(img.width*k),h=Math.round(img.height*k),c=document.createElement('canvas');c.width=w;c.height=h;
  c.getContext('2d').drawImage(img,0,0,w,h);const png=/png|gif|svg/.test(file.type);ok({src:c.toDataURL(png?'image/png':'image/jpeg',.85),w,h})};
  img.onerror=()=>ok(null);img.src=URL.createObjectURL(file)})}
async function addCanvasImage(file,i){
  if(!file||!/^image\//.test(file.type))return;const r=await shrinkForCanvas(file);if(!r){toast('Could not read that image.');return}
  if(r.src.length>3e6){toast('That image is too big to keep here. Try a smaller one.');return}
  const k=Math.min(1,360/r.w),w=Math.max(120,Math.round(r.w*k)),h=Math.max(60,Math.round(r.h*k)+14),p=curProject(),wrap=$('#projBody .cv-wrap');
  const x=wrap?Math.round(wrap.scrollLeft/cvZ())+60+(i||0)*30:60,y=wrap?Math.round(wrap.scrollTop/cvZ())+60+(i||0)*30:60;
  addCanvasItem('image',x,y,{src:r.src,text:file.name,w,h});logAct(p,'added an image to Free');saveSoon();
}
// paste an image while the Free tab is open
document.addEventListener('paste',e=>{
  if(S.ui.view!=='project'||S.ui.projTab!=='free'||e.target.closest&&e.target.closest('input,textarea,[contenteditable]'))return;
  const its=[...(e.clipboardData&&e.clipboardData.items||[])].filter(x=>x.kind==='file'&&/^image\//.test(x.type));if(!its.length)return;
  e.preventDefault();its.forEach((x,i)=>addCanvasImage(x.getAsFile(),i));
});
