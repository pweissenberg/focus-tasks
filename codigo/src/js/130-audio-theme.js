/* ---------- audio: white noise + chime ---------- */
const SOUNDS=[['white','White'],['pink','Pink'],['brown','Brown'],['rain','Rain'],['waves','Waves'],['fan','Fan']];
let actx=null,noise=null;
function ensureAudio(){
  try{if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;actx=new AC()}if(actx.state==='suspended')actx.resume()}catch(e){actx=null}
  return actx;
}
const bufCache={};
function noiseBuffer(kind){
  if(bufCache[kind])return bufCache[kind];
  const sr=actx.sampleRate,len=sr*8,buf=actx.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
    for(let i=0;i<len;i++){const w=Math.random()*2-1;
      if(kind==='pink'){b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
      else if(kind==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}
      else d[i]=w*.5}
    const drift=d[len-1]-d[0];for(let i=0;i<len;i++)d[i]-=drift*i/(len-1);
  }
  return bufCache[kind]=buf;
}
function filt(type,freq,q){const f=actx.createBiquadFilter();f.type=type;f.frequency.value=freq;if(q)f.Q.value=q;return f}
function buildSound(kind,out){
  const src=k=>{const s=actx.createBufferSource();s.buffer=noiseBuffer(k);s.loop=true;return s};
  const chain=(nodes)=>{for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1]);return nodes};
  const g=v=>{const x=actx.createGain();x.gain.value=v;return x};
  const sources=[],extra=[];
  if(kind==='white'){const s=src('white');chain([s,filt('lowpass',9000),g(.55),out]);sources.push(s)}
  else if(kind==='pink'){const s=src('pink');chain([s,g(.9),out]);sources.push(s)}
  else if(kind==='brown'){const s=src('brown');chain([s,g(.9),out]);sources.push(s)}
  else if(kind==='rain'){const s=src('white');chain([s,filt('highpass',600),filt('lowpass',6500),filt('peaking',2500,.8),g(.45),out]);
    const s2=src('pink');chain([s2,filt('lowpass',900),g(.35),out]);sources.push(s,s2)}
  else if(kind==='waves'){const s=src('brown');const amp=g(.55);chain([s,filt('lowpass',1100),amp,out]);
    const lfo=actx.createOscillator();lfo.frequency.value=.09;const depth=g(.4);lfo.connect(depth);depth.connect(amp.gain);lfo.start();sources.push(s);extra.push(lfo)}
  else if(kind==='fan'){const s=src('brown');chain([s,filt('lowpass',380),g(1.2),out]);const s2=src('pink');chain([s2,filt('bandpass',180,1.5),g(.25),out]);sources.push(s,s2)}
  sources.forEach(s=>s.start());
  return sources.concat(extra);
}
const volGain=v=>v*v*.9;
function startNoise(){
  if(!ensureAudio()){toast('This browser cannot play sound here.');return}
  stopNoise(true);
  const master=actx.createGain();master.gain.value=0;master.connect(actx.destination);
  master.gain.setTargetAtTime(volGain(S.noise.vol),actx.currentTime,.25);
  noise={master,nodes:buildSound(S.noise.type,master)};renderNoise();
}
function stopNoise(quick){
  if(!noise)return;const n=noise;noise=null;
  n.master.gain.setTargetAtTime(0,actx.currentTime,quick?.02:.15);
  setTimeout(()=>{n.nodes.forEach(x=>{try{x.stop()}catch(e){}});n.master.disconnect()},quick?120:700);
  renderNoise();
}
function renderNoise(){
  const on=!!noise;
  const st=$('#nz-state');st.classList.toggle('on',on);st.innerHTML=`<i></i>${on?'On':'Off'}`;
  const nt=$('#noiseToggle');nt.classList.toggle('playing',on);nt.title=on?'White noise is on (W)':'White noise (W)';
  const b=$('#nz-toggle');b.classList.toggle('on',on);b.innerHTML=on?`${icons.pause.replace('<svg','<svg width="14" height="14"')} Turn sound off`:`${icons.play.replace('<svg','<svg width="14" height="14"')} Turn sound on`;
  $('#nz-sounds').innerHTML=SOUNDS.map(([k,l])=>`<button type="button" data-snd="${k}" class="${S.noise.type===k?'on':''}" aria-pressed="${S.noise.type===k}">${l}</button>`).join('');
  $('#nz-vol').value=Math.round(S.noise.vol*100);$('#nz-volv').textContent=Math.round(S.noise.vol*100)+'%';
}
$('#nz-toggle').onclick=()=>noise?stopNoise():startNoise();
$('#nz-sounds').onclick=e=>{const b=e.target.closest('[data-snd]');if(!b)return;S.noise.type=b.dataset.snd;save();if(noise)startNoise();else renderNoise()};
$('#nz-vol').oninput=e=>{S.noise.vol=e.target.value/100;$('#nz-volv').textContent=e.target.value+'%';if(noise)noise.master.gain.setTargetAtTime(volGain(S.noise.vol),actx.currentTime,.05);saveSoon()};
function chime(){
  if(!ensureAudio())return;const t0=actx.currentTime;
  [659.25,880,1318.5].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0,t0+i*.22);g.gain.linearRampToValueAtTime(.25,t0+i*.22+.02);g.gain.exponentialRampToValueAtTime(.001,t0+i*.22+1.1);
    o.connect(g);g.connect(actx.destination);o.start(t0+i*.22);o.stop(t0+i*.22+1.2)});
}

/* ---------- theme ---------- */
function effectiveDark(){const dt=document.documentElement.dataset.theme;if(S.theme)return S.theme==='dark';if(dt)return dt==='dark';return matchMedia('(prefers-color-scheme: dark)').matches}
function renderTheme(){
  if(S.theme)document.documentElement.dataset.theme=S.theme;
  const d=effectiveDark(),b=$('#themeToggle');
  b.innerHTML=d?icons.sun:icons.moon;
  b.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');b.title=b.getAttribute('aria-label')+' (D)';
}
$('#themeToggle').onclick=()=>{S.theme=effectiveDark()?'light':'dark';commit()};

