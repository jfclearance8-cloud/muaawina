const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../campaign.html','utf8');
const G=require('../campaign-gestures.js');
const base={enabled:true,title:'Campaign',poster:'https://lh3.googleusercontent.com/d/test',photoX:10,photoY:15,photoW:40,photoH:45,nameX:50,nameY:80,nameSize:4,font:'Manjari',color:'#183b72',shape:'rectangle'};
const flush=()=>new Promise(r=>setImmediate(r));
async function setup(editor){
 const elements=new Map(),listeners={},calls=[],draws=[],shares=[],links=[];
 const ctx={clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},ellipse(){},rect(){},clip(){},fillText(){},strokeRect(){},setLineDash(){},measureText:t=>({width:t.length*10}),drawImage(...a){draws.push(a)},getImageData:()=>({data:new Uint8ClampedArray(40000).fill(255)})};
 function el(id){if(!elements.has(id))elements.set(id,{id,value:'',files:[],style:{},hidden:false,disabled:false,width:800,height:800,clientWidth:340,clientHeight:340,textContent:'',append(){},remove(){},click(){links.push(this)},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:320,height:320}),getContext:()=>ctx,addEventListener(type,fn){this[type]=fn},toBlob(fn){fn(new Blob(['poster'],{type:'image/png'}))},showModal(){this.open=true},close(){this.open=false}});return elements.get(id)}
 const parent={postMessage(req){calls.push(req);const result=req.action==='getPosterCampaign'?{success:true,campaign:base}:{success:true,campaign:req.data};queueMicrotask(()=>listeners.message({origin:'https://example.org',source:parent,data:{type:'mua-campaign-result',id:req.id,result}}))}};
 const context={console,CampaignGestures:G,Map,Set,Math,Number,Promise,Blob,File,URL,setTimeout,clearTimeout,queueMicrotask,requestAnimationFrame:fn=>setTimeout(fn,0),ResizeObserver:class{constructor(fn){this.fn=fn}observe(){this.fn()}},location:{hash:editor?'#editor':'',origin:'https://example.org'},parent,navigator:{canShare:()=>true,share:async data=>shares.push(data)},document:{getElementById:el,createElement:tag=>el(tag+Math.random()),body:{append(){}},fonts:{load:async()=>{},ready:Promise.resolve()}},Image:class{constructor(){this.width=this.naturalWidth=800;this.height=this.naturalHeight=800}set src(v){queueMicrotask(()=>this.onload())}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,test';queueMicrotask(()=>this.onload())}}};
 context.window={addEventListener:(type,fn)=>listeners[type]=fn};vm.createContext(context);vm.runInContext([...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),context);await flush();await flush();return {el,calls,draws,shares,links,context};
}
const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
(async()=>{
 const admin=await setup(true),canvas=admin.el('canvas');
 canvas.onpointerdown(event(1,80,100));canvas.onpointermove(event(1,112,132));canvas.onpointerup(event(1,112,132));await admin.el('save').onclick();const saved=admin.calls.filter(x=>x.action==='savePosterCampaign').at(-1).data;assert.equal(saved.photoX,20);assert.equal(saved.photoY,25);
 admin.el('targetName').onclick();admin.el('larger').onclick();await admin.el('save').onclick();assert.ok(admin.calls.filter(x=>x.action==='savePosterCampaign').at(-1).data.nameSize>4);
 console.log('PASS admin pointer drag and resize save the visible layout');
 const m=await setup(false);m.el('photoFile').files=[{type:'image/png',size:100}];await m.el('photoFile').onchange({target:m.el('photoFile')});m.el('name').value='അലി';m.el('name').oninput();await new Promise(r=>setTimeout(r,10));assert.equal(m.el('download').disabled,false);
 const before=m.draws.at(-1);const cv=m.el('canvas');cv.onpointerdown(event(1,60,80));cv.onpointerdown(event(2,120,80));cv.onpointermove(event(2,180,80));cv.onpointerup(event(2,180,80));cv.onpointerup(event(1,60,80));await new Promise(r=>setTimeout(r,10));const after=m.draws.at(-1);assert.ok(after[3]>before[3]);
 await m.el('share').onclick();assert.equal(m.shares.length,1);assert.equal(m.shares[0].files[0].type,'image/png');assert.equal(m.shares[0].files[0].name,'Muaawina-Campaign.png');
 m.context.navigator.canShare=()=>false;await m.el('share').onclick();assert.ok(m.links.length);assert.match(m.el('status').textContent,/WhatsApp/);
 assert.ok(!source.includes('type="range"'));assert.ok(!source.includes('type="number"'));
 console.log('PASS member pinch changes crop, PNG shares natively, unsupported sharing downloads, and numeric sliders are absent');
})().catch(e=>{console.error(e);process.exitCode=1});
