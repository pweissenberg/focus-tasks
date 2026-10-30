/* ---------- v96: Glow, Background and Pattern in the add bars' Advanced settings (Pedro) ----------
   Three small swatch buttons side by side ("Look"); clicking one opens its options under them (ADV[k].lk).
   Same pickers as the edit window (glow 221, t.bg 223, t.bgPat 257 with uploaded pictures). */
const LK_NAMES={glow:'Glow',bg:'Background',pat:'Pattern'};
function lkPreview(k,w){const a=ADV[k].a;
  if(w==='glow')return a.glow?`<span class="gsw g-${a.glow}"></span>`:'<span class="gsw none">∅</span>';
  if(w==='bg')return a.bg?`<span class="sw" style="--sw:${a.bg}"></span>`:'<span class="sw auto">none</span>';
  const p=a.bgPat;if(!p)return '<span class="psw none">∅</span>';
  if(p.startsWith('img:')){const im=bgImgs().find(i=>'img:'+i.id===p);return im?`<span class="psw img" style="background-image:url(&quot;${im.data}&quot;)"></span>`:'<span class="psw none">∅</span>'}
  return `<span class="psw bgp bgp-${p}"></span>`}
function lkTitle(k,w){const a=ADV[k].a,v=w==='glow'?a.glow:w==='bg'?a.bg:a.bgPat;
  if(!v)return LK_NAMES[w]+': none';if(w==='glow')return 'Glow: '+(GLOWS.find(g=>g[0]===v)||['',v])[1];
  if(w==='pat')return 'Pattern: '+(v.startsWith('img:')?'picture':(BGPATS.find(b=>b[0]===v)||['',v])[1]);return 'Background: '+v}
function lkPopHTML(k,w){const a=ADV[k].a;
  const body=w==='glow'?glowPickHTML(k+'-lkg',a.glow||'',true)
    :w==='bg'?`<div class="swatches sm">${swatchesHTML(a.bg||null,true).replace('>auto<','>none<').replace("title=\"Use the tag's color\"",'title="No background color"')}</div>`
    :patPickHTML(k+'-lkp',a.bgPat||'');
  return `<div class="lk-pop" data-lkpop="${w}" role="group" aria-label="${LK_NAMES[w]}">${body}</div>`}
{const _ap=advPanelHTML;advPanelHTML=function(k){const st=ADV[k];
  const btns=['glow','bg','pat'].map(w=>`<div class="lk-g"><span>${LK_NAMES[w]}</span><button type="button" class="lk-b" data-lk="${w}" aria-expanded="${st.lk===w}" title="${esc(lkTitle(k,w))}">${lkPreview(k,w)}</button></div>`).join('');
  const h=`<div class="afld alook"><div class="lk-row">${btns}</div></div>${st.lk?lkPopHTML(k,st.lk):''}`;
  return _ap(k).replace('<p class="sp-hint" data-advhint',h+'<p class="sp-hint" data-advhint')}}
function lkPaint(k){const f=advForm(k);if(!f)return;
  f.querySelectorAll('.cadv [data-lk]').forEach(b=>{b.innerHTML=lkPreview(k,b.dataset.lk);b.title=lkTitle(k,b.dataset.lk)});advSync(k)}
function lkBind(k){const w=ADV[k].lk,f=advForm(k),P=w&&f&&f.querySelector('.lk-pop');if(!P)return;
  if(w==='glow')P.addEventListener('change',e=>{if(e.target.name===k+'-lkg'){ADV[k].a.glow=e.target.value||null;lkOpen(k,null)}});
  else if(w==='bg'){const s=P.querySelector('.swatches');bindSwatches(s,c=>{ADV[k].a.bg=c||null;lkPaint(k)});
    s.addEventListener('click',e=>{if(e.target.closest('[data-sw]'))lkOpen(k,null)})}
  else bindPatPick(P.querySelector('.pat-pick'),k+'-lkp',v=>{ADV[k].a.bgPat=v||null;lkOpen(k,null)})}
function lkOpen(k,w){const last=ADV[k].lk;ADV[k].lk=w;advShow(k,true);const f=advForm(k),b=f&&f.querySelector(`.cadv [data-lk="${w||last}"]`);if(b)b.focus()}
document.addEventListener('click',e=>{const b=e.target.closest('.cadv [data-lk]');if(!b)return;e.preventDefault();
  const k=b.closest('.cadv').id==='pt-advp'?'pt':'c';lkOpen(k,ADV[k].lk===b.dataset.lk?null:b.dataset.lk)});
{const _sh=advShow;advShow=function(k,open){if(!open)ADV[k].lk=null;_sh.apply(this,arguments);if(open)lkBind(k)}}
{const _s=advIsSet;advIsSet=k=>{const a=ADV[k].a;return _s(k)||!!(a.glow||a.bg||a.bgPat)}}
{const _s=advSummary;advSummary=k=>{const a=ADV[k].a;return [_s(k),a.glow?'glow':'',a.bg?'background':'',a.bgPat?'pattern':''].filter(Boolean).join(', ')}}
{const _af=addFromBar;addFromBar=function(k,o){const {glow,bg,bgPat}=ADV[k].a,t=_af.apply(this,arguments);
  if(t){if(glow)t.glow=glow;if(bg)t.bg=bg;if(bgPat)t.bgPat=bgPat}ADV[k].lk=null;return t}}
