/* ---------- Tree tab: a comment inside each node, shown when the node is expanded (S.ui.trOpen [nodeId], per device).
   A plan node keeps it in `n.comment` (synced with p.tree); a task node uses the task's note (`t.note`), so it is the same text as on the list.
   → Task carries the comment into the task note, Plan only carries it back. An expanded task node also shows the task's settings. ---------- */
const trOpenSet=()=>(S.ui.trOpen=S.ui.trOpen||[]);
const trIsOpen=n=>trOpenSet().includes(n.id);
const trCmt=n=>{const t=trTask(n);return t?(t.note||''):(n.comment||'')};
function trSettingsHTML(t){
  const tag=tagOf(t),pr=(PRIOS.find(x=>x[0]===(t.prio||0))||[])[1],kids=S.tasks.filter(x=>x.parentId===t.id&&!x.stepOf),sp=spentOf(t.id);
  const st=(t.steps||[]).length?`${t.steps.filter(x=>x.done).length} of ${t.steps.length} done`:'';
  const waits=(t.waits||[]).map(byId).filter(Boolean).map(x=>x.name);
  const rows=[
    ['Status',t.done?`Done ${tsToUS(t.doneAt)}`:t.onHold?'On hold':t.longTerm?'Long term':'Open'],
    ['Tag',tag?`<span class="chip" style="--dot:${tag.color}"><i></i>${esc(tag.name)}</span>`:''],
    ['Priority',t.prio?esc(pr):''],
    ['Due',t.due?`${isoToUS(t.due)}${t.time?' '+t.time:''}`:''],
    ['Start',t.start?isoToUS(t.start):''],
    ['Repeat',t.repeat?esc(repLabel(t.repeat)):''],
    ['Takes',t.est?`${t.est} min`:''],
    ['Responsible',t.assignee?esc(personName(t.assignee)):''],
    ['Waiting for',t.waitFor?esc(t.waitFor):''],
    ['Waits for',waits.length?esc(waits.join(', ')):''],
    ['Steps',st],
    ['Subtasks',kids.length?`${kids.filter(x=>x.done).length} of ${kids.length} done`:''],
    ['Time tracked',sp>=60000?fmtDur(sp):''],
    ['Added',tsToUS(t.createdAt)]].filter(r=>r[1]);
  return `<dl class="trn-set">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <div class="trn-acts"><button class="btn sm" type="button" data-tredit>Edit task</button>${typeof cmtBtnHTML==='function'?cmtBtnHTML(t):''}</div>`;
}
{const _nh=trNodeHTML;trNodeHTML=function(p,n){
  let h=_nh(p,n);const c=trCmt(n),open=trIsOpen(n),t=trTask(n),ro=typeof isRO==='function'&&isRO(p);
  const btn=`<button class="tr-exp${c?' has':''}${open?' on':''}" type="button" data-trexp title="${open?'Close':c?'Show the comment':'Add a comment'}${t&&!open?' and the task settings':''}" aria-expanded="${open}">${cmtIcon}</button>`;
  h=h.replace('<span class="tr-tools">',btn+'<span class="tr-tools">');
  if(open){const panel=`<div class="trn-panel">
      <textarea class="trn-cmt" data-trcmt rows="${Math.min(10,Math.max(2,c.split('\n').length))}" placeholder="${t?'Comment (the task note)':'Comment on this node'}" aria-label="Comment"${ro?' readonly':''}>${esc(c)}</textarea>
      ${t?trSettingsHTML(t):''}</div>`;
    // the panel goes inside the node card, so the open node reads as one thing
    const i=h.indexOf('</div>');h=h.slice(0,i)+panel+h.slice(i);h=h.replace('class="tr-node','class="tr-node tr-open')}
  return h}}
{const _mt=trMakeTask;trMakeTask=function(p,n){const t=_mt.apply(this,arguments);if(t&&n.comment&&!t.note){t.note=n.comment}delete n.comment;return t}}
{const _ul=trUnlink;trUnlink=function(p,n){const t=trTask(n);if(t&&t.note)n.comment=t.note;return _ul.apply(this,arguments)}}
pp.addEventListener('click',e=>{
  if(!e.target.closest('#projBody .tr-root'))return;
  const {n}=trOf(e.target);if(!n)return;
  if(e.target.closest('[data-trexp]')){const O=trOpenSet(),i=O.indexOf(n.id);if(i>=0)O.splice(i,1);else O.push(n.id);commit();
    if(i<0&&!trCmt(n))setTimeout(()=>{const a=$(`#projBody [data-tn="${n.id}"] .trn-cmt`);if(a)a.focus()},0);return}
  if(e.target.closest('[data-tredit]')){const t=trTask(n);if(t)openEdit(t.id)}
});
const trSetCmt=(n,v)=>{const t=trTask(n);if(t)t.note=v;else n.comment=v};
pp.addEventListener('input',e=>{const a=e.target.closest('[data-trcmt]');if(!a)return;const {n}=trOf(a);if(!n)return;
  trSetCmt(n,a.value);a.rows=Math.min(10,Math.max(2,a.value.split('\n').length));saveSoon()});
pp.addEventListener('change',e=>{const a=e.target.closest('[data-trcmt]');if(!a)return;const {n}=trOf(a);if(n){trSetCmt(n,a.value);save();const b=a.closest('.tr-node').querySelector('[data-trexp]');if(b)b.classList.toggle('has',!!a.value)}});
