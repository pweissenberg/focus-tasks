/* ---------- Free canvas: text boxes and notes grow to fit their text instead of showing a scrollbar ---------- */
function fitCvText(ta){
  const el=ta.closest('.cv-item');if(!el)return;
  const extra=ta.scrollHeight-ta.clientHeight;
  if(extra>0)el.style.height=(el.offsetHeight+extra)+'px';
}
pp.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.cv==='text')fitCvText(e.target)});
{const _rf=renderProjPage;renderProjPage=function(){_rf();if((S.ui.projTab||'tasks')==='free')$('#projBody').querySelectorAll('.cv-item textarea[data-cv=text]').forEach(fitCvText)}}
