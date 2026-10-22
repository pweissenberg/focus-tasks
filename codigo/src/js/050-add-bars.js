let composerColor=null; // null = follow tag color
let composerPrio=0;
function paintPrioBtn(b,v){if(!b)return;b.className='pflag cprio pr'+v;b.innerHTML=v?icons.flag:icons.flagO;b.title=v?`Priority: ${PRIO_NAME[v]}`:'Priority (none)'}
function paintComposerPrio(){paintPrioBtn($('#c-prio'),composerPrio)}
/* advanced settings of the add bars ("c" = main bar, "pt" = project page bar): the edit window's other options, used for the next task added */
const advBlank=()=>({time:'',remind:'',repeat:'',parent:'',long:null});
const ADV={c:{a:advBlank(),open:false},pt:{a:advBlank(),open:false}};
let ptPrio=0,ptColor=null,ptFor=null;
const advLongDef=k=>k==='c'&&S.ui.view==='long';
const advLong=k=>{const a=ADV[k].a;return a.long==null?advLongDef(k):a.long};
const advForm=k=>k==='c'?$('#composer'):document.querySelector('#projBody [data-ptadd]');
function advIsSet(k){const a=ADV[k].a;return!!(a.time||a.remind!==''||a.repeat||a.parent||advLong(k)!==advLongDef(k))}
function advSummary(k){
  const a=ADV[k].a,par=a.parent&&byId(a.parent),out=[];
  if(a.time)out.push(a.time);if(a.remind!=='')out.push('reminder '+remShort(+a.remind));
  if(a.repeat)out.push((REPEATS.find(r=>r[0]===a.repeat)||['',''])[1].toLowerCase());
  if(par)out.push(`subtask of "${par.name}"`);else if(advLong(k)!==advLongDef(k))out.push(advLong(k)?'long term':'not long term');
  return out.join(', ');
}
function advPanelHTML(k){
  const a=ADV[k].a,pid=k==='pt'?S.ui.projectPage:null;
  const ps=S.tasks.filter(x=>!x.done&&(!pid||x.projectId===pid)&&!isWaitMe(x)).sort((x,y)=>x.name.localeCompare(y.name));
  if(a.parent&&!ps.some(x=>x.id===a.parent))a.parent='';
  return `<div class="cadv" id="${k}-advp" role="group" aria-labelledby="${k}-advh">
    <div class="cadv-h"><b id="${k}-advh">Advanced settings</b><span>for the next task you add</span><button type="button" class="linkbtn" data-advclear${advIsSet(k)?'':' hidden'}>Clear</button></div>
    <label class="afld"><span>Time</span><input id="${k}-time" data-adv="time" type="time" class="mono" value="${esc(a.time)}"></label>
    <label class="afld"><span>Reminder</span><select id="${k}-rem" data-adv="remind">${REMINDS.map(([v,l])=>`<option value="${v}"${String(a.remind)===String(v)?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="afld"><span>Repeat</span><select id="${k}-rep" data-adv="repeat">${REPEATS.map(([v,l])=>`<option value="${v}"${a.repeat===v?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="afld"><span>Subtask of</span><select id="${k}-parent" data-adv="parent"><option value="">Nothing (top level)</option>${ps.map(x=>`<option value="${x.id}"${a.parent===x.id?' selected':''}>${esc(x.name)}${rootOf(x).longTerm?' (long term)':''}</option>`).join('')}</select></label>
    <label class="chk" data-advlong${a.parent?' hidden':''}><input type="checkbox" id="${k}-long" data-adv="long"${advLong(k)?' checked':''}> Long-term task</label>
    <p class="sp-hint" data-advhint hidden></p>
  </div>`;
}
function advSync(k){ // gear state, long-term box, hint
  const st=ADV[k],a=st.a,f=advForm(k);if(!f)return;
  const g=f.querySelector('.cgear'),on=advIsSet(k);
  if(g){g.classList.toggle('set',on);g.setAttribute('aria-expanded',st.open);g.title=on?'Advanced settings: '+advSummary(k):'Advanced settings'}
  const P=f.querySelector('.cadv');if(!P)return;
  P.querySelector('[data-advlong]').hidden=!!a.parent;P.querySelector('[data-advclear]').hidden=!on;
  const lc=P.querySelector('[data-adv=long]');if(lc)lc.checked=advLong(k);
  const di=f.querySelector(`#${k}-due`),noDate=!(di&&parseDate(di.value)),h=P.querySelector('[data-advhint]');let m='';
  if(noDate&&(a.time||a.remind!==''||a.repeat))m=a.repeat&&a.repeat!=='daily'?'No due date yet: the task will be due on the first day it repeats.':'No due date yet: the task will be due today.';
  if(a.remind!==''&&!a.time)m+=(m?' ':'')+'No time set: the reminder uses 09:00.';
  h.hidden=!m;h.textContent=m;
}
function advShow(k,open){ // (re)builds the panel, which also refreshes the "Subtask of" list
  const st=ADV[k],f=advForm(k);st.open=open;if(!f)return;
  const old=f.querySelector('.cadv');if(old)old.remove();
  if(open)f.insertAdjacentHTML('beforeend',advPanelHTML(k));
  advSync(k);
}
function advField(k,el){const a=ADV[k].a,n=el.dataset.adv;if(n==='long')a.long=el.checked;else a[n]=el.value;advSync(k)}
function addFromBar(k,o){ // o: name, due, tagId, projectId, color, prio
  const a=ADV[k].a,pt=a.parent?byId(a.parent):null,par=pt&&!pt.done?pt:null,lt=par?false:advLong(k);
  const roots=S.tasks.filter(x=>isOpenRoot(x)&&!!x.longTerm===lt);
  const t=T(Object.assign(o,{longTerm:lt,order:roots.length?Math.max(...roots.map(x=>x.order))+1:0,time:a.time||'',remind:a.remind===''?null:+a.remind,repeat:a.repeat?{freq:a.repeat}:null}));
  if((t.time||t.remind!=null||t.repeat)&&!t.due)t.due=todayISO();
  S.tasks.push(t);if(par)nestInto(t.id,par.id);
  if(t.remind!=null)askNotify();
  ADV[k].a=advBlank();
  return t;
}
function paintPtBar(){paintPrioBtn($('#pt-prio'),ptPrio);const tg=$('#pt-tag');paintColorBtn($('#pt-color'),ptColor,tg?tg.value:'')}
