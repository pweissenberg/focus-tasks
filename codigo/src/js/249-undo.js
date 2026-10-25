/* ---------- Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y): undo and redo many steps (v78) ---------- */
// Every save() that changed the data (SYNC_KEYS without timer, noise, theme, alerts, example) keeps the state from before it.
// Saves less than 120 ms apart (one action that saves twice) count as one step (typing). Up to 60 steps, kept in memory only (a reload starts empty).
// Changes that come from the account (CL.applying) or a change of user only move the base, so Undo never brings back
// someone else's data. Ctrl+Z in a field with text is the browser's own text undo; in an empty field (right after adding a task) it is this one.
const UNDO_SKIP=['timer','noise','theme','alerts','example'];
const UNDO={past:[],future:[],base:null,uid:null,at:0,quiet:false,max:60};
const undoKeys=()=>SYNC_KEYS.filter(k=>!UNDO_SKIP.includes(k)).concat(['folders'].filter(k=>!SYNC_KEYS.includes(k)));
function undoSnap(){const o={};undoKeys().forEach(k=>{o[k]=S[k]});return JSON.stringify(o)}
function undoTrim(){let n=0;for(let i=UNDO.past.length-1;i>=0;i--){n+=UNDO.past[i].length;if(n>4e7||UNDO.past.length-i>UNDO.max){UNDO.past.splice(0,i+1);break}}}
function undoTrack(){
  let cur;try{cur=undoSnap()}catch(e){return}
  const u=CL.uid||'';
  if(UNDO.base==null||UNDO.uid!==u||CL.applying||UNDO.quiet){if(UNDO.uid!==u){UNDO.past=[];UNDO.future=[]}UNDO.base=cur;UNDO.uid=u;return}
  if(cur===UNDO.base)return;
  const now=Date.now();
  if(now-UNDO.at>120||!UNDO.past.length){UNDO.past.push(UNDO.base);undoTrim()}
  UNDO.at=now;UNDO.future=[];UNDO.base=cur;
}
{const _sv=save;save=function(){_sv.apply(this,arguments);undoTrack()}}
// first base (and a new one after a sign-in) as soon as the screen is drawn, before the first change
{const _rnu=render;render=function(){_rnu.apply(this,arguments);if(UNDO.base==null||UNDO.uid!==(CL.uid||''))undoTrack()}}
// what changed between two snapshots, said from the side of the one we go back to
function undoSay(fromStr,toStr){
  try{const a=JSON.parse(fromStr).tasks||[],b=JSON.parse(toStr).tasks||[],A=new Map(a.map(t=>[t.id,t])),B=new Map(b.map(t=>[t.id,t]));
    const back=b.filter(t=>!A.has(t.id)&&!t.stepOf),gone=a.filter(t=>!B.has(t.id)&&!t.stepOf);
    const q=t=>`"${t.name||'(no name)'}"`;
    if(gone.length&&!back.length)return gone.length>1?`Removed ${q(gone[0])} and ${gone.length-1} more`:`Removed ${q(gone[0])}`;
    if(back.length&&!gone.length)return back.length>1?`Brought back ${q(back[0])} and ${back.length-1} more`:`Brought back ${q(back[0])}`;
    const ch=b.find(t=>A.has(t.id)&&JSON.stringify(A.get(t.id))!==JSON.stringify(t));
    if(ch){const o=A.get(ch.id);if(o.done!==ch.done)return `${q(ch)} is ${ch.done?'done':'open'} again`;if(o.onHold!==ch.onHold)return `${q(ch)} is ${ch.onHold?'on hold':'off hold'} again`;
      if(o.name!==ch.name)return `Name is ${q(ch)} again`;return `Changed ${q(ch)} back`}
  }catch(e){}
  return 'Went back one change';
}
function undoGo(dir){ // -1 undo, +1 redo
  undoTrack();const from=dir<0?UNDO.past:UNDO.future,to=dir<0?UNDO.future:UNDO.past;
  if(!from.length){toast(dir<0?'Nothing to undo.':'Nothing to redo.');return false}
  const snap=from.pop(),cur=UNDO.base;to.push(cur);
  const o=JSON.parse(snap);undoKeys().forEach(k=>{if(k in o)S[k]=o[k];else delete S[k]});normalize(S);
  closePop();closeModal();
  UNDO.quiet=true;try{commit()}finally{UNDO.quiet=false}
  UNDO.base=undoSnap();UNDO.at=0;
  const say=undoSay(cur,snap);
  toast(`${dir<0?'Undo':'Redo'}: ${say}.`,()=>undoGo(-dir),dir<0?'Redo':'Undo');
  return true;
}
const undo=()=>undoGo(-1),redo=()=>undoGo(1);
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase();
  const isUndo=k==='z'&&!e.shiftKey,isRedo=(k==='z'&&e.shiftKey)||(k==='y'&&!e.shiftKey);if(!isUndo&&!isRedo)return;
  if(document.body.classList.contains('show-landing'))return;
  const f=e.target.closest&&e.target.closest('input,textarea,[contenteditable]');
  if(f&&(f.isContentEditable?f.textContent:f.value||'').length&&!/^(checkbox|radio|range|color|button|submit)$/.test(f.type||''))return; // the field's own text undo
  e.preventDefault();e.stopPropagation();
  if(isUndo)undo();else redo();
},true);
KEYS[0][1].push(['Ctrl+Z','Undo (many steps)'],['Ctrl+Shift+Z','Redo']);
