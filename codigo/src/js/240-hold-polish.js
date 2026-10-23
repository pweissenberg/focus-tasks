/* ---------- v76: On hold tasks go to the top (Pedro's list item 3) ----------
   Open on hold tasks sort before the others in every list, and a task that has just been put on hold
   (checkbox, H key, wait popover, review...) gets the lowest order, so it lands first among them. */
{const _c=cmp;cmp=function(a,b){const x=!!a.onHold&&!a.done,y=!!b.onHold&&!b.done;if(x!==y)return x?-1:1;return _c(a,b)}}
{let held=null;const _r=render;render=function(){
  const now=new Set(S.tasks.filter(t=>t.onHold&&!t.done).map(t=>t.id));
  if(held){const fresh=S.tasks.filter(t=>now.has(t.id)&&!held.has(t.id));
    if(fresh.length){let min=Math.min(0,...S.tasks.map(t=>t.order||0));fresh.forEach(t=>{t.order=--min});save()}}
  held=now;return _r.apply(this,arguments)}}
