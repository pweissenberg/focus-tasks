/* ---------- Export a project as a backup file (.json, can be imported back as a new project) or a readable file (.md);
   "Import a project" under + New project. In claude.ai the file is offered through the downloads capability; elsewhere a normal download ---------- */
async function saveFile(filename,data){
  try{const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    if(dl){try{await dl.save({filename,data});toast(`Saved ${filename}.`)}catch(e){if(e&&e.code!=='declined')toast('Could not save the file: '+(e.message||e.code))}return}}catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:filename.endsWith('.json')?'application/json':filename.endsWith('.html')?'text/html':'text/markdown'}));a.download=filename;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast(`Saved ${filename}.`)}
const fileSlug=s=>String(s||'project').normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60)||'project';
function projBundle(p){const ids=new Set([p.id]),ts=S.tasks.filter(t=>t.projectId===p.id);ts.forEach(t=>ids.add(t.id));
  // steps belong to their task even when they carry no project
  S.tasks.forEach(t=>{if(t.stepOf&&ids.has(t.stepOf)&&!ts.includes(t))ts.push(t)});
  const proj=JSON.parse(JSON.stringify(p));['shared','owner','members','invited','roles','perms','activity'].forEach(k=>delete proj[k]);
  return {format:'focus-tasks-project',version:1,exportedAt:new Date().toISOString(),project:proj,
    tags:S.tags.filter(g=>ts.some(t=>t.tagId===g.id)),tasks:JSON.parse(JSON.stringify(ts)).map(t=>{['shared','members','owner','sentBy','sentTo','waitUids','waitBy','waitDone','backAt','backFrom'].forEach(k=>delete t[k]);return t}),
    sessions:(S.sessions||[]).filter(s=>s.projectId===p.id||ids.has(s.taskId))}}
function projMarkdown(p){const ts=S.tasks.filter(t=>t.projectId===p.id&&!t.stepOf),L=[`# ${p.name}`,''];
  const done=ts.filter(t=>t.done).length;L.push(`Exported ${new Date().toLocaleString('en-US')} · ${done} of ${ts.length} tasks done${p.due?` · deadline ${isoToUS(p.due)}`:''}`,'');
  const line=(t,d)=>{const tag=S.tags.find(g=>g.id===t.tagId),bits=[t.due?`due ${isoToUS(t.due)}`:'',tag?tag.name:'',t.onHold?'on hold':'',t.waitFor?`waiting for ${t.waitFor}`:''].filter(Boolean);
    L.push(`${'  '.repeat(d)}- [${t.done?'x':' '}] ${t.name}${bits.length?` (${bits.join(', ')})`:''}`);
    if(t.note)L.push(`${'  '.repeat(d+1)}Note: ${t.note}`);
    (t.micro||[]).forEach(m=>L.push(`${'  '.repeat(d+1)}- [${m.done?'x':' '}] ${m.name}`));
    S.tasks.filter(x=>x.stepOf===t.id).forEach((x,i)=>L.push(`${'  '.repeat(d+1)}${i+1}. ${x.done?'~~':''}${x.name}${x.done?'~~':''}`));
    ts.filter(x=>x.parentId===t.id).sort((a,b)=>a.order-b.order).forEach(x=>line(x,d+1))};
  const roots=ts.filter(t=>!t.parentId||!ts.some(x=>x.id===t.parentId)).sort((a,b)=>a.done-b.done||a.order-b.order);
  const secs=p.sections||[];
  if(secs.length){secs.forEach(s=>{const r=roots.filter(t=>t.section===s.id);if(!r.length)return;L.push(`## ${s.name}`,'');r.forEach(t=>line(t,0));L.push('')});
    const rest=roots.filter(t=>!secs.some(s=>s.id===t.section));if(rest.length){L.push('## Tasks','');rest.forEach(t=>line(t,0));L.push('')}}
  else{L.push('## Tasks','');roots.forEach(t=>line(t,0));L.push('')}
  const notes=(p.notesList||[]).filter(n=>n.title||n.text);if(notes.length){L.push('## Notes','');notes.forEach(n=>{if(n.title)L.push(`### ${n.title}`);if(n.text)L.push(n.text);L.push('')})}
  return L.join('\n')}
// header: Export next to Save as template
{const _m=projMetaHTML;projMetaHTML=p=>_m(p).replace('<button class="linkbtn pm-tpl"','<button class="linkbtn pm-exp" type="button" data-pexp aria-haspopup="menu">Export</button><button class="linkbtn pm-tpl"')}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pexp]');if(!b)return;e.stopPropagation();const p=S.projects.find(x=>x.id===S.ui.projectPage);if(!p)return;
  openPop(b,`<div class="acct-menu" role="menu" aria-label="Export the project"><button type="button" role="menuitem" data-pexpk="json">Backup file (.json)<small>Everything, can be imported back</small></button><button type="button" role="menuitem" data-pexpk="md">Readable file (.md)<small>Tasks and notes as a list</small></button></div>`,el=>{
    el.classList.add('pop-menu');place(el,b);
    el.addEventListener('click',ev=>{const k=ev.target.closest('[data-pexpk]');if(!k)return;closePop();const d=todayISO();
      if(k.dataset.pexpk==='json')saveFile(`${fileSlug(p.name)}-${d}.json`,JSON.stringify(projBundle(p),null,1));else saveFile(`${fileSlug(p.name)}-${d}.md`,projMarkdown(p))})})},true);
// import: every id gets a new one, so importing twice makes two separate copies
function importProject(text){let B;try{B=JSON.parse(text)}catch(e){toast('That file is not a project backup.');return null}
  if(!B||B.format!=='focus-tasks-project'||!B.project){toast('That file is not a Focus Tasks project backup.');return null}
  const map=new Map(),old=[B.project.id,...(B.tasks||[]).map(t=>t.id),...(B.sessions||[]).map(s=>s.id)].filter(Boolean);old.forEach(id=>map.set(id,uid()));
  let j=JSON.stringify({project:B.project,tasks:B.tasks||[],sessions:B.sessions||[]});map.forEach((n,o)=>{j=j.split(`"${o}"`).join(`"${n}"`)});const R=JSON.parse(j);
  (B.tags||[]).forEach(g=>{if(!S.tags.some(x=>x.id===g.id||x.name===g.name))S.tags.push(g);else{const x=S.tags.find(y=>y.name===g.name&&y.id!==g.id);if(x)R.tasks.forEach(t=>{if(t.tagId===g.id)t.tagId=x.id})}});
  const p=R.project;delete p.archived;if(S.projects.some(x=>x.name===p.name))p.name+=' (imported)';S.projects.push(p);
  R.tasks.forEach(t=>S.tasks.push(Object.assign(T({id:t.id,createdAt:t.createdAt}),t)));(R.sessions||[]).forEach(s=>S.sessions.push(s));
  commit();toast(`Imported "${p.name}" with ${R.tasks.filter(t=>!t.stepOf).length} tasks.`);return p}
{const a=$('#addProject');if(a){a.insertAdjacentHTML('afterend','<button class="addlink sidebottom imp-proj" id="importProject" type="button">Import a project</button><input type="file" id="importFile" accept=".json,application/json" hidden>');
  $('#importProject').addEventListener('click',()=>$('#importFile').click());
  $('#importFile').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const p=importProject(await f.text());if(p)openProject(p.id)})}}
