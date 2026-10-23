/* ---------- Backup folder help: where a folder cannot be used (claude.ai, or a browser without the folder API), Settings still shows
   "Choose folder"; it opens a window with the steps to move to focus-tasks.html in Chrome/Edge: get the file (pageCopy, 005),
   download a backup, load it there, pick the folder. ---------- */
function openBkHelp(){closePop();closeModal();const inFrame=window.self!==window.top,file=!!pageCopy();
  const back=document.createElement('div');back.className='modal-back';
  back.innerHTML=`<div class="modal bk-help" role="dialog" aria-modal="true" aria-labelledby="bkh-h"><h2 id="bkh-h">Save backups to a folder</h2>
    <p class="sp-hint">${inFrame?'Inside claude.ai a page is not allowed to write to folders on your computer.':'This browser cannot write to folders on your computer.'} Use Focus Tasks as a file on your computer, opened in <b>Chrome</b> or <b>Edge</b>:</p>
    <ol class="bk-steps">
      ${inFrame?`<li><span>Get the file and keep it in a folder you use, like Documents.</span>${file?'<button type="button" class="btn sm" data-bkh-file>Get focus-tasks.html</button>':''}</li>
      <li><span>Download a backup of everything you have here.</span><button type="button" class="btn sm" data-bkh-dl>Download a backup</button></li>
      <li><span>Open focus-tasks.html in Chrome or Edge (double-click it, or drag it into the browser). Sign in, open <b>Settings</b> (your photo, bottom left) &gt; <b>Load a backup...</b> &gt; <b>From a file...</b> and pick that backup.</span></li>`
      :`<li><span>Open this same file in Chrome or Edge (drag it into the browser).</span></li>`}
      <li><span>There, in <b>Settings</b> &gt; Automatic backup, click <b>Choose folder</b>, pick the folder and click <b>Allow</b>. If Chrome offers <b>Allow on every visit</b>, pick it so it does not ask again.</span></li>
    </ol>
    <p class="sp-hint">From then on a backup goes to that folder every few hours (you pick how often), plus one when you click <b>Back up now</b>.</p>
    <div class="modal-actions"><button type="button" class="btn" data-x>Close</button></div></div>`;
  document.body.appendChild(back);modal=back;
  back.addEventListener('mousedown',e=>{if(e.target===back)closeModal()});back.querySelector('[data-x]').onclick=closeModal;
  const f=back.querySelector('[data-bkh-file]');if(f)f.onclick=()=>saveFile('focus-tasks.html',pageCopy());
  const d=back.querySelector('[data-bkh-dl]');if(d)d.onclick=()=>saveFile(bkPrefix()+bkStamp(new Date())+'.json',bkData())}
{const _os=openSettings;openSettings=function(){_os.apply(this,arguments);if(bkCanFolder())return;const s=modal&&modal.querySelector('.bk-set');if(!s)return;
  const hint=[...s.querySelectorAll('p.sp-hint')].find(p=>!p.classList.contains('bk-last'));if(!hint)return;
  hint.outerHTML=`<div class="bk-row"><span class="bk-dir">No folder: ${window.self!==window.top?'not possible inside claude.ai':'needs Chrome or Edge'}</span><button type="button" class="btn sm" data-bkdir>Choose folder</button></div>`;
  s.querySelector('[data-bkdir]').onclick=openBkHelp}}
