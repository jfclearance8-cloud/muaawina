const vm=require('vm'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'muaawina-bot-test-'));const routes={},middleware=[];const app={use:f=>middleware.push(f),get:(p,...f)=>routes['GET '+p]=f,post:(p,...f)=>routes['POST '+p]=f,listen(){}};
const express=()=>app;express.json=express.urlencoded=()=>()=>{};
const backend={interceptors:{request:{use(){}}}};
const context={console,Buffer,URL,process:{env:{BOT_API_KEY:'a'.repeat(40),DATA_DIR:dir,SCRIPT_URL:'https://script.google.com/macros/s/test/exec'},on(){}},setTimeout:fn=>{fn();},require:name=>({'@whiskeysockets/baileys':{},'qr-image':{},express,cors:()=>()=>{},axios:{create:()=>backend},'node-cron':{schedule(){}},fs,path,crypto:require('crypto')}[name])};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../bot/bot.js','utf8'),context);
const res=()=>({statusCode:200,status(n){this.statusCode=n;return this},json(x){this.body=x;return this}});
(async()=>{
 let response=res();context.authenticate({headers:{}},response,()=>{throw new Error('unauthorized allowed')});assert.equal(response.statusCode,401);console.log('PASS bot endpoints and QR require authentication');
 let called=false;context.authenticate({headers:{authorization:'Bearer '+'a'.repeat(40)}},res(),()=>called=true);assert.ok(called);
 assert.equal(context.recipientJid('120363424627614459@g.us',true),'120363424627614459@g.us');assert.equal(context.recipientJid('9876543210'),'919876543210@s.whatsapp.net');assert.equal(context.recipientJid('+971501234567'),'971501234567@s.whatsapp.net');console.log('PASS group suffix and international phone normalization');
 const sent=[];context.sent=sent;vm.runInContext("botState='READY';sock={sendMessage:async(jid,payload)=>{sent.push({jid,payload})}}",context);
 const request={headers:{},body:{jobId:'test-delivery-job-1234',phone:'120363424627614459@g.us',message:'മലയാളം',isGroup:true}};
 response=res();let next=false;context.claimDelivery(request,response,()=>next=true);assert.ok(next);await routes['POST /send-message'][1](request,response);assert.equal(response.body.success,true);assert.equal(sent.length,1);assert.equal(sent[0].jid,'120363424627614459@g.us');
 response=res();context.claimDelivery(request,response,()=>{throw new Error('duplicate sent')});assert.equal(response.body.duplicate,true);assert.equal(sent.length,1);console.log('PASS delivery acknowledgment loss retry is deduplicated');
 const uncertain={body:{...request.body,jobId:'uncertain-delivery-job-1234'}};context.claimDelivery(uncertain,res(),()=>{});response=res();context.claimDelivery(uncertain,response,()=>{throw new Error('uncertain resent')});assert.equal(response.statusCode,409);console.log('PASS interrupted deliveries require review instead of duplicate sends');
 fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
