/* ---------- v89: a folded task hides its microtasks ----------
   A row folded with its arrow (252, or a folded On hold row from 239) drops the microtask box and its ▸/▾ button,
   so it looks the same as a folded task with no microtasks. Opening the row brings them back as they were. */
{const _row=row;row=function(t,depth){const el=_row.apply(this,arguments);
  if(el.classList.contains('hold-min')&&el.classList.contains('has-mt')){el.classList.remove('has-mt');const f=el.querySelector('.mt-fold');if(f)f.remove()}
  return el}}
