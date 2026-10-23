/* ---------- A copy of this page as a file that opens on its own (focus-tasks.html), taken while the page loads, before anything
   is drawn: the style, the markup and this script. Used by "Get focus-tasks.html" (246-backup-folder-help.js) so a backup folder can be
   used from claude.ai too. null when the page was not loaded the usual way. ---------- */
const PAGE_SRC=(()=>{try{const sc=document.currentScript;if(!sc)return null;
  const st=[...document.querySelectorAll('style')].find(s=>s.textContent.includes('/* Layout: projects rail'));if(!st)return null;
  const box=document.createElement('div'),nodes=[];let n=sc.previousSibling;
  for(;n&&n!==st;n=n.previousSibling)if(!(n.nodeType===1&&/^(SCRIPT|STYLE)$/.test(n.tagName)))nodes.unshift(n.cloneNode(true));
  if(!n)return null;nodes.forEach(x=>box.appendChild(x));
  return {css:st.textContent,markup:box.innerHTML,js:sc.textContent}}catch(e){return null}})();
const pageCopy=()=>PAGE_SRC&&'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n</head><body>\n<title>Focus Tasks</title>\n'+
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">\n'+
  '<style>'+PAGE_SRC.css+'</style>'+PAGE_SRC.markup+'<script>'+PAGE_SRC.js+'</'+'script>\n</body></html>\n';
