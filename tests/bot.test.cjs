const vm=require('vm'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../bot/bot.js','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'muaawina-original-base-'));
function runtime(key='test-key-for-backend'){
 const routes={},events={},sent=[],requests=[],authFolders=[],cronJobs=[];
 const app={use(){},get:(p,...f)=>routes['GET '+p]=f,post:(p,...f)=>routes['POST '+p]=f,listen(){}};
 const express=()=>app;express.json=express.urlencoded=()=>()=>{};
 const socket={ev:{on:(event,fn)=>events[event]=fn},sendMessage:async(jid,payload)=>sent.push({jid,payload})};
 const baileys={default:()=>socket,DisconnectReason:{loggedOut:401},fetchLatestBaileysVersion:async()=>({version:[1,2,3],isLatest:true}),useMultiFileAuthState:async folder=>{authFolders.push(folder);return {state:{},saveCreds(){}}}};
 const c={console:{log(){},warn(){},error(){}},Buffer,process:{env:{BOT_API_KEY:key,SCRIPT_URL:'https://script.google.com/macros/s/demo/exec',DELIVERY_JOBS_DIR:dir},on(){}},setTimeout:fn=>fn(),require:name=>({'@whiskeysockets/baileys':baileys,'qr-image':{imageSync:()=>Buffer.from('qr')},express,cors:()=>()=>{},axios:{post:async(url,data)=>{requests.push({url,data});return {data:{error:'test'}}}},'node-cron':{schedule:(pattern,fn)=>cronJobs.push({pattern,fn})},fs,crypto:require('crypto')}[name])};
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
 fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
