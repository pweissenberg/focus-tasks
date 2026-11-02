/* ---------- v100: task templates (Pedro) ----------
   Star on the task row (after the comment icon, before the pencil) opens a small window: name + checkboxes for what goes in
   (color, project, tag, glow, background, pattern, microtasks, steps, note; never history). Saved in S.taskTpls
   [{id,name,f:{color,project,tag,glow,bg,pat,micro:[names],steps:[names|null],note}}] (synced key). Only chosen keys are in f.
   Add bars: "Template" select in Advanced settings (ADV[k].a.tpl) prefills tag/project/color/glow/background/pattern
   in the bar; microtasks, steps and note are added when the task is created. The star is blue when the task holds
   everything from some template (tplMatch). */
SYNC_KEYS.push('taskTpls');
const ttpls=()=>S.taskTpls||(S.taskTpls=[]);
const TT_F=[['color','Color'],['project','Project'],['tag','Tag'],['glow','Glow'],['bg','Background'],['pat','Pattern'],['micro','Microtasks'],['steps','Steps'],['note','Note']];
const starIcon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z"/></svg>';
function tplVal(t,k){
  if(k==='color')return t.color||null;if(k==='project')return t.projectId||null;if(k==='tag')return t.tagId||null;
  if(k==='glow')return t.glow||null;if(k==='bg')return t.bg||null;if(k==='pat')return t.bgPat||null;
  if(k==='micro')return microOf(t).map(m=>m.name.trim()).filter(Boolean);
  if(k==='steps'){const st=t.steps||[];if(st.length<2)return [];if(typeof syncStep==='function')syncStep(t);
    const b=st[0].name;return st.map((s,i)=>i===0||s.name===`${b} ${i+1}`?null:s.name)} // null = "<task name> N"
  if(k==='note')return (t.note||'').trim();
}
const tplHas=v=>Array.isArray(v)?v.length>0:!!v;
function tplShow(k,v){ // short text for the window and the template list
  if(!tplHas(v))return 'none';
  if(k==='color'||k==='bg')return `<span class="tt-dot" style="background:${esc(v)}"></span>`;
  if(k==='project'){const p=projOfId(v);return p?esc(typeof projFull==='function'?projFull(p):p.name):'none'}
  if(k==='tag'){const g=S.tags.find(x=>x.id===v);return g?esc(g.name):'none'}
  if(k==='glow')return esc((GLOWS.find(g=>g[0]===v)||['',v])[1]);
  if(k==='pat')return v.startsWith('img:')?'picture':esc((BGPATS.find(b=>b[0]===v)||['',v])[1]);
  if(k==='micro')return v.length+' microtask'+(v.length===1?'':'s');
  if(k==='steps')return v.length+' steps';
  if(k==='note')return esc(v.length>34?v.slice(0,34)+'…':v);
}
function tplMatch(t,tp){
  const f=tp.f||{},ks=Object.keys(f);if(!ks.length)return false;
  return ks.every(k=>{const a=f[k],b=tplVal(t,k);
    if(k==='micro'){const have=b.map(x=>x.toLowerCase());return a.every(n=>have.includes(n.toLowerCase()))}
    if(k==='steps')return b.length>=a.length&&a.every((n,i)=>n==null||b[i]===n);
    if(k==='note')return !!a&&b.includes(a);
    return (a||null)===(b||null)});
}
const tplOf=t=>ttpls().find(tp=>tplMatch(t,tp));
function tplStarHTML(t){
  if(!t||t.stepOf)return'';const m=tplOf(t);
  return `<button class="tstar${m?' on':''}" type="button" data-ttpl="${t.id}" title="${m?`Has everything from template "${esc(m.name)}"`:'Save as template'}" aria-label="${m?`Template: ${esc(m.name)}`:'Save as template'}">${starIcon}</button>`;
}
function openTplPop(anchor,t){
  const vals={};TT_F.forEach(([k])=>vals[k]=tplVal(t,k));
  const listHTML=()=>ttpls().length?`<div class="tt-saved"><span class="tt-sub">Saved templates</span>${ttpls().map(tp=>`<div class="tt-row${tplMatch(t,tp)?' on':''}"><span class="tt-st">${starIcon}</span><span class="tt-nm" title="${esc(TT_F.filter(([k])=>k in tp.f).map(([,l])=>l).join(', '))}">${esc(tp.name)}</span><button type="button" class="tt-del" data-ttdel="${tp.id}" aria-label="Delete template ${esc(tp.name)}" title="Delete template">×</button></div>`).join('')}</div>`:'';
  openPop(anchor,`<form class="pop-form tt-pop"><strong>Save as template</strong>
    <input type="text" id="tt-name" maxlength="60" value="${esc(t.name)}" aria-label="Template name" placeholder="Template name">
    <span class="tt-sub">What goes in</span>
    <div class="tt-fields">${TT_F.map(([k,l])=>{const h=tplHas(vals[k]);return `<label class="tt-f${h?'':' off'}"><input type="checkbox" data-ttk="${k}"${h?' checked':' disabled'}><span>${l}</span><em>${tplShow(k,vals[k])}</em></label>`}).join('')}</div>
    <p class="sp-hint" data-tthint hidden></p>
    <div class="pop-actions"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save template</button></div>
    <div data-ttlist>${listHTML()}</div></form>`,el=>{
    const F=el.querySelector('form');
    el.querySelector('[data-x]').onclick=closePop;
    F.addEventListener('click',e=>{const d=e.target.closest('[data-ttdel]');if(!d)return;e.preventDefault();
      const tp=ttpls().find(x=>x.id===d.dataset.ttdel);if(!tp)return;S.taskTpls=ttpls().filter(x=>x!==tp);
      el.querySelector('[data-ttlist]').innerHTML=listHTML();commit();toast(`Template "${tp.name}" deleted.`)});
    F.onsubmit=e=>{e.preventDefault();const ni=el.querySelector('#tt-name'),name=ni.value.trim(),h=el.querySelector('[data-tthint]');
      if(!name){ni.classList.add('invalid');ni.focus();return}
      const ks=[...el.querySelectorAll('[data-ttk]:checked')].map(c=>c.dataset.ttk);
      if(!ks.length){h.hidden=false;h.textContent='Pick at least one thing for the template.';return}
      const f={};ks.forEach(k=>f[k]=Array.isArray(vals[k])?vals[k].slice():vals[k]);
      const old=ttpls().find(x=>x.name.toLowerCase()===name.toLowerCase());
      if(old)old.f=f;else ttpls().push({id:uid(),name,f});
      closePop();commit();toast(old?`Template "${name}" updated.`:`Template "${name}" saved. Pick it in the add bar's Advanced settings.`)};
  });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ttpl]');if(!b)return;e.stopPropagation();e.preventDefault();
  const t=byId(b.dataset.ttpl);if(t)openTplPop(b,t)},true);

/* add bars */
function tplApply(t,tp){const f=tp.f||{};
  if(f.micro&&f.micro.length){t.micro=microOf(t).concat(f.micro.map(n=>({id:uid(),name:n,done:false})))}
  if(f.steps&&f.steps.length>1&&!(t.steps||[]).length){t.steps=f.steps.map((n,i)=>({name:i===0?t.name:(n||`${t.name} ${i+1}`),done:false}));t.stepSel=0}
  if(f.note)t.note=t.note?t.note+'\n'+f.note:f.note;
}
function tplPrefill(k,tp){const f=tp.f||{},a=ADV[k].a,main=k==='c';
  const tg=$(main?'#c-tag':'#pt-tag'),pj=main&&$('#c-proj');
  if('tag' in f&&tg&&(!f.tag||S.tags.some(g=>g.id===f.tag)))tg.value=f.tag||'';
  if('project' in f&&pj&&(!f.project||projOfId(f.project))&&[...pj.options].some(o=>o.value===(f.project||'')))pj.value=f.project||'';
  if('color' in f){if(main)composerColor=f.color||null;else ptColor=f.color||null}
  if('glow' in f)a.glow=f.glow||null;if('bg' in f)a.bg=f.bg||null;if('pat' in f)a.bgPat=f.pat||null;
  if(main)paintComposerColor();else if(typeof paintPtBar==='function')paintPtBar();
}
{const _ap=advPanelHTML;advPanelHTML=function(k){const a=ADV[k].a,L=ttpls();if(a.tpl&&!L.some(x=>x.id===a.tpl))a.tpl='';
  const sel=`<label class="lk-g atpl"><span>Template</span><select id="${k}-tpl" data-tpl>${L.length?`<option value="">No template</option>${L.map(tp=>`<option value="${tp.id}"${a.tpl===tp.id?' selected':''}>${esc(tp.name)}</option>`).join('')}`:'<option value="">None yet: save one with the ☆ on a task</option>'}</select></label>`;
  return _ap(k).replace(/(<div class="lk-row">[\s\S]*?)(<\/div><\/div>)/,(m,a,b)=>a+'</div>'+sel+'</div>')}} // v101: next to Glow / Background / Pattern
document.addEventListener('change',e=>{const s=e.target.closest('.cadv [data-tpl]');if(!s)return;const k=s.id.split('-')[0];if(!ADV[k])return;
  ADV[k].a.tpl=s.value;const tp=ttpls().find(x=>x.id===s.value);if(tp)tplPrefill(k,tp);advShow(k,true);const n=advForm(k)&&advForm(k).querySelector('[data-tpl]');if(n)n.focus()});
{const _s=advIsSet;advIsSet=k=>_s(k)||!!ADV[k].a.tpl}
{const _s=advSummary;advSummary=k=>{const tp=ADV[k].a.tpl&&ttpls().find(x=>x.id===ADV[k].a.tpl);return [tp?`template "${tp.name}"`:'',_s(k)].filter(Boolean).join(', ')}}
{const _af=addFromBar;addFromBar=function(k,o){const id=ADV[k].a.tpl,tp=id&&ttpls().find(x=>x.id===id),t=_af.apply(this,arguments);if(t&&tp)tplApply(t,tp);return t}}
