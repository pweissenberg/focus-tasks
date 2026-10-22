// Runs test suites in parallel and prints one line each.  node tests/run.js            -> every suite
//   node tests/run.js quick microtasks    -> those suites       node tests/run.js --jobs 3   -> 3 at a time (default: CPUs)
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const dir=__dirname,args=process.argv.slice(2);let jobs=Math.max(2,os.cpus().length),names=[];
for(let i=0;i<args.length;i++){if(args[i]==='--jobs')jobs=+args[++i];else names.push(args[i].replace(/\.js$/,''))}
if(!names.length)names=fs.readdirSync(dir).filter(f=>f.endsWith('.js')&&!['harness.js','run.js'].includes(f)&&!f.startsWith('_')).map(f=>f.slice(0,-3));
const t0=Date.now(),res=[];let next=0,live=0;
const one=(n,retry)=>new Promise(ok=>{const s=Date.now(),p=spawn(process.execPath,[path.join(dir,n+'.js')],{cwd:path.dirname(dir)});let out='';
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('close',code=>{const m=out.match(/all (\d+) checks passed/);
    const fails=out.split('\n').filter(l=>/^\s*FAIL/.test(l));ok({n,ok:!!m,count:m?m[1]:'',fails,out,sec:((Date.now()-s)/1000).toFixed(0),retry})})});
async function lane(){while(next<names.length){const n=names[next++];let r=await one(n,false);
  // a crash before any check ran (browser start-up hiccup) gets one more try; a failing check does not
  if(!r.ok&&!r.fails.length)r=await one(n,true);res.push(r);
  console.log(`${r.ok?'ok  ':'FAIL'} ${n.padEnd(16)} ${r.ok?r.count+' checks':''} ${r.sec}s${r.retry?' (2nd try)':''}`);
  if(!r.ok)console.log((r.fails.length?r.fails.join('\n'):r.out.split('\n').slice(-12).join('\n')).replace(/^/gm,'      '))}}
Promise.all(Array.from({length:Math.min(jobs,names.length)},lane)).then(()=>{const bad=res.filter(r=>!r.ok);
  console.log(`\n${res.length-bad.length}/${res.length} suites passed in ${((Date.now()-t0)/1000).toFixed(0)}s`);process.exit(bad.length?1:0)});
