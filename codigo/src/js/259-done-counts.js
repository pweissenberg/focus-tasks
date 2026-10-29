/* ---------- v94 (Pedro): Stats counts the tasks done in the period, by project, subproject (tab), tag, and without tag/project ---------- */
function doneCountsIn(a,b){
  const u=S.ui,pm=u.project,tg=u.tag;
  const inProj=t=>{if(pm==='all')return true;if(t.projectId===pm)return true;const p=projOfId(t.projectId);return !!(p&&p.tabOf===pm)};
  const list=S.tasks.filter(t=>t.done&&t.doneAt&&(()=>{const d=+new Date(t.doneAt);return d>=a&&d<b})()&&inProj(t)&&(tg==='all'||t.tagId===tg));
  const add=(m,k,name,color)=>{const c=m.get(k)||{k,name,color,n:0};c.n++;m.set(k,c)};
  const proj=new Map(),sub=new Map(),tag=new Map();let noTag=0,noProj=0,none=0;
  list.forEach(t=>{
    const p=projOfId(t.projectId),r=p&&(tabRoot(p)||p),g=S.tags.find(g=>g.id===t.tagId);
    if(r)add(proj,r.id,r.name,r.color||'var(--accent)');else add(proj,'_','No project',NEUTRAL);
    if(p&&p.tabOf)add(sub,p.id,projFull(p),r.color||'var(--accent)');
    else if(p&&projTabs(p).length)add(sub,p.id+':main',p.name+', Main',p.color||'var(--accent)');
    if(g)add(tag,g.id,g.name,g.color);else add(tag,'_','No tag',NEUTRAL);
    if(!g)noTag++;if(!p)noProj++;if(!g&&!p)none++;
  });
  const sort=m=>[...m.values()].sort((x,y)=>y.n-x.n||x.name.localeCompare(y.name));
  return{total:list.length,proj:sort(proj),sub:sort(sub),tag:sort(tag),noTag,noProj,none};
}
function doneListHTML(title,rows,total,empty){
  const max=Math.max(1,...rows.map(r=>r.n));
  return `<div class="bd dc-card"><h3>${title}</h3>${rows.length?'<ol>'+rows.map(r=>`<li><span class="lab" style="--dot:${r.color}"><i></i><span>${esc(r.name)}</span></span><span class="val">${r.n}${total?` · ${Math.round(r.n/total*100)}%`:''}</span><span class="track" style="--dot:${r.color}"><b style="width:${(r.n/max*100).toFixed(1)}%"></b></span></li>`).join('')+'</ol>':`<p class="none">${empty}</p>`}</div>`;
}
{const _rs=renderStats;renderStats=function(){_rs();
  const u=S.ui,P=period(u.statsRange,u.statsAnchor),D=doneCountsIn(P.a,P.b),el=$('#stats');if(!el)return;
  const box=document.createElement('section');box.className='done-counts';
  box.innerHTML=`<div class="dc-head"><span class="big">${D.total}</span><span class="sub">task${D.total===1?'':'s'} done in this period${D.total?` · ${D.noProj} without a project · ${D.noTag} without a tag · ${D.none} with neither`:''}</span></div>
    ${D.total?`<div class="dc-grid">${doneListHTML('Done by project',D.proj,D.total,'')}${doneListHTML('Done by subproject',D.sub,0,'No tasks done in subprojects.')}${doneListHTML('Done by tag',D.tag,D.total,'')}</div>`:'<p class="stats-empty">No tasks done in this period.</p>'}`;
  el.appendChild(box)}}
