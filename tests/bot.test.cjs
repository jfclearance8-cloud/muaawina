const vm=require('vm'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../bot/bot.js','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'muaawina-original-base-'));
function runtime(key='test-key-for-backend',memberResponse={error:'test'}){
 const routes={},events={},sent=[],requests=[],authFolders=[],cronJobs=[];
 const app={use(){},get:(p,...f)=>routes['GET '+p]=f,post:(p,...f)=>routes['POST '+p]=f,listen(){}};
 const express=()=>app;express.json=express.urlencoded=()=>()=>{};
 const socket={ev:{on:(event,fn)=>events[event]=fn},sendMessage:async(jid,payload)=>sent.push({jid,payload})};
 const baileys={default:()=>socket,DisconnectReason:{loggedOut:401},fetchLatestBaileysVersion:async()=>({version:[1,2,3],isLatest:true}),useMultiFileAuthState:async folder=>{authFolders.push(folder);return {state:{},saveCreds(){}}}};
 const c={console:{log(){},warn(){},error(){}},Buffer,process:{env:{BOT_API_KEY:key,SCRIPT_URL:'https://script.google.com/macros/s/demo/exec',DELIVERY_JOBS_DIR:dir},on(){}},setTimeout:fn=>fn(),require:name=>({'@whiskeysockets/baileys':baileys,'qr-image':{imageSync:()=>Buffer.from('qr')},express,cors:()=>()=>{},axios:{post:async(url,data)=>{requests.push({url,data});return {data:data.action==='getAppSettings'?{ADMIN_WHATSAPP:'919876543210'}:memberResponse}}},'node-cron':{schedule:(pattern,fn)=>cronJobs.push({pattern,fn})},fs,crypto:require('crypto')}[name])};
 vm.createContext(c);vm.runInContext(source,c);return {c,routes,events,sent,requests,authFolders,cronJobs};
}
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this},json(x){this.body=x;return this},send(x){this.body=x;return this},setHeader(){}});
(async()=>{
 const r=runtime();await r.c.startWhatsApp();assert.equal(r.authFolders[0],'baileys_auth_info');console.log('PASS original WhatsApp auth folder and startup retained');
 runtime('');console.log('PASS missing new settings does not crash original startup');
 await r.events['messages.upsert']({messages:[{key:{remoteJid:'919876543210@s.whatsapp.net'},message:{conversation:'.id'}}]});assert.ok(r.sent.at(-1).payload.text.includes('919876543210@s.whatsapp.net'));console.log('PASS original .id command response retained');
 await r.events['messages.upsert']({messages:[{key:{remoteJid:'919876543210@s.whatsapp.net'},message:{conversation:'due M101'}}]});assert.equal(r.requests.at(-1).data.botKey,'test-key-for-backend');assert.equal(r.requests.at(-1).data.action,'getMemberData');
 vm.runInContext("botState='READY'",r.c);await r.cronJobs[0].fn();assert.equal(r.requests.at(-1).data.action,'checkAndGetDefaulters');assert.equal(r.requests.at(-1).data.botKey,'test-key-for-backend');console.log('PASS original Due and reminder calls authenticate to current backend');
 let res=response();r.c.authorizeSend({headers:{}},res,()=>{throw Error('unauthorized allowed')});assert.equal(res.statusCode,401);console.log('PASS send endpoints still require backend authorization');
 const req={headers:{},body:{jobId:'test-delivery-job-1234',phone:'120363424627614459@g.us',isGroup:true,message:'original text'}};res=response();let next=false;r.c.deliveryGuard(req,res,()=>next=true);assert.ok(next);await r.routes['POST /send-message'][2](req,res);assert.equal(res.body.success,true);assert.equal(r.sent.at(-1).jid,'120363424627614459@g.us');const count=r.sent.length;
 res=response();r.c.deliveryGuard(req,res,()=>{throw Error('duplicate delivery')});assert.equal(res.body.duplicate,true);assert.equal(r.sent.length,count);console.log('PASS group ID normalization and queue retry deduplication');
 const legacy={body:{phone:'9876543210',message:'legacy'}};next=false;r.c.deliveryGuard(legacy,response(),()=>next=true);assert.ok(next);console.log('PASS original send payload requires no new jobId field');
 res=response();r.c.authorizeQR({headers:{}},res,()=>{throw Error('QR exposed')});assert.equal(res.statusCode,401);next=false;r.c.authorizeQR({headers:{authorization:'Basic '+Buffer.from('admin:test-key-for-backend').toString('base64')}},response(),()=>next=true);assert.ok(next);console.log('PASS original QR UI available behind admin authentication');
 const menu=runtime('test-key-for-backend',{id:'M101',name:'Test Member',balance:100,history:[{month:'Oct',year:'2026',status:'Processing'},{month:'Sep',year:'2026',status:'Paid',amount:50,paidAt:'2026-09-15T10:00:00Z'}]});await menu.c.startWhatsApp();
 const send=async(text,jid='919876543210@s.whatsapp.net')=>{await menu.events['messages.upsert']({messages:[{key:{remoteJid:jid},message:{conversation:text}}]});return menu.sent.at(-1).payload.text};
 let reply=await send('Hi');assert.ok(reply.includes('MUAAWINAയിലേക്ക് സ്വാഗതം'));assert.ok(reply.includes('5️⃣ Admin സഹായം'));assert.equal(menu.requests.length,0);console.log('PASS Hi menu performs no backend writes or lookups');
 reply=await send('1');assert.ok(reply.includes('₹100'));console.log('PASS option 1 reads existing member balance');
 const before=menu.requests.length;reply=await send('2');assert.ok(reply.includes('https://jfclearance8-cloud.github.io/muaawina/'));assert.equal(menu.requests.length,before);console.log('PASS option 2 opens existing app without submitting payment');
 reply=await send('3');assert.ok(reply.includes('Oct 2026 — Pending Approval'));console.log('PASS option 3 reports pending request status without decisions');
 reply=await send('4');assert.ok(reply.includes('Sep 2026'));assert.ok(reply.includes('History'));console.log('PASS option 4 shows latest paid receipt details and download instructions');
 reply=await send('5');assert.ok(reply.includes('https://wa.me/919876543210'));console.log('PASS option 5 reads existing configured admin contact');
 const reads=menu.requests.length;reply=await send('1','120363424627614459@g.us');assert.ok(reply.includes('private chat'));assert.equal(menu.requests.length,reads);console.log('PASS group menu does not disclose personal financial data');
 assert.ok(menu.requests.every(r=>['getMemberData','getAppSettings'].includes(r.data.action)));console.log('PASS every menu API request uses only read routes');
 fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
