const vm=require('vm'),fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const store={},cache={};let seq=0,failSheet='';
class Sheet {
 constructor(name,rows){this.name=name;this.rows=rows;}
 insertRowsAfter(after,count){this.rows.splice(after,0,...Array.from({length:count},()=>[]));return this}
 getName(){return this.name} getLastRow(){return this.rows.length}
 getDataRange(){return {getValues:()=>this.rows.map(r=>[...r]),getDisplayValues:()=>this.rows.map(r=>r.map(String))}}
 getRange(row,col,nr=1,nc=1){const sh=this;return {getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>sh.rows[row+i-1]?.[col+j-1]??'')),setValue(v){return this.setValues([[v]])},setValues(values){if(failSheet===sh.name)throw new Error('injected write failure');values.forEach((r,i)=>r.forEach((v,j)=>{sh.rows[row+i-1]??=[];sh.rows[row+i-1][col+j-1]=v}));return this}}}
 appendRow(r){if(failSheet===this.name)throw new Error('injected write failure');this.rows.push(r)}
}
const member=['M101',"അലി O'Neil",'9876543210','2020',new Date(2026,0,1),'Active','a@b.com',50,'O+','','','','','','','','SECRET'];
const sheets={Member_Database:new Sheet('Member_Database',[Array(23).fill('Header'),member]),Approval_Queue:new Sheet('Approval_Queue',[Array(10).fill('Header')]),'2026':new Sheet('2026',[['ID','Name','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],['M101','Ali',...Array(12).fill(false)]]),Settings:new Sheet('Settings',[['key','value'],['CURRENT_DATE','2026-10-12']])};
const props={getProperty:k=>store[k],setProperty:(k,v)=>store[k]=v,deleteProperty:k=>delete store[k],getProperties:()=>({...store}),setProperties:x=>Object.assign(store,x)};
const lock={waitLock(){},tryLock(){return true},releaseLock(){}};
const ss={getSheetByName:n=>sheets[n],getSheets:()=>Object.values(sheets),getSpreadsheetTimeZone:()=> 'Asia/Kolkata',insertSheet:n=>sheets[n]=new Sheet(n,[])};
const context={console,Date,Set,Map,Number,JSON,Math,Array,Error,PropertiesService:{getScriptProperties:()=>props,getDocumentProperties:()=>null},CacheService:{getScriptCache:()=>({get:k=>cache[k],put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})},LockService:{getScriptLock:()=>lock,getDocumentLock:()=>lock,getUserLock:()=>lock},SpreadsheetApp:{openById:()=>ss,flush(){}},Utilities:{getUuid:()=>`request-${++seq}-abcdefghijklmnop`,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,v)=>[...crypto.createHash('sha256').update(v).digest()],formatDate:(d,tz,format)=>format==='MM-dd'?'10-12':'12 Oct',newBlob:t=>({getBytes:()=>Buffer.from(t)})},ScriptApp:{getProjectTriggers:()=>[{getHandlerFunction:()=> 'processWhatsAppBackgroundQueue'}]},Session:{getScriptTimeZone:()=> 'Asia/Kolkata'},Logger:{log(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:()=>({setMimeType(){return this},setContent(v){this.text=v;return this}})}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../backend/Code.gs','utf8'),context);
store.SPREADSHEET_ID='test';store.ADMIN_PASS='strong-admin-test';store.BOT_API_KEY='secret-bot-test';store.WA_QUEUE_ENABLED='yes';
const f=context;const test=(name,fn)=>{fn();console.log('PASS',name)};
const api=(action,data={},token)=>JSON.parse(f.doPost({postData:{contents:JSON.stringify({action,data,token})}}).text);
// Real public router tests do not expose data without role/ownership.
test('admin routes require server session',()=>assert.equal(api('getAdminData').code,'AUTH_REQUIRED'));
test('wrong phone + correct credential rejected',()=>assert.throws(()=>f.loginMember({phone:'9999999999',mid:'SECRET'})));
test('changed MID does not retain member ID bypass',()=>assert.throws(()=>f.loginMember({phone:'9876543210',mid:'M101'})));
let token;test('member login creates real session and hides password',()=>{const r=f.loginMember({phone:'9876543210',mid:'SECRET'});token=r.token;assert.equal(r.member.id,'M101');assert.equal(r.member.password,undefined)});
test('member cannot invoke admin mutations',()=>assert.equal(api('approvePayment',{rows:['anything'],id:'M101'},token).code,'FORBIDDEN'));
test('public config contains no admin password',()=>assert.equal(api('getAppSettings').ADMIN_PASS,undefined));
test('future months excluded from due',()=>{const r=f.getMemberData(member[2],member[0],true);assert.equal(r.balance,500);assert.equal(r.history.find(x=>x.month==='Nov').status,'Upcoming')});
test('duplicate submit writes only one row',()=>{f.submitPaymentRequests('M101',[{year:'2026',month:'Oct'}],false);f.submitPaymentRequests('M101',[{year:'2026',month:'Oct'}],false);assert.equal(sheets.Approval_Queue.rows.length,2)});
const id=sheets.Approval_Queue.rows[1][7];
test('invalid target does not report approval success or change queue',()=>{const sh=sheets['2026'];delete sheets['2026'];assert.throws(()=>f.decidePayment([[id]],'M101','Approved'));assert.equal(sheets.Approval_Queue.rows[1][6],'Processing');sheets['2026']=sh});
test('tracker write failure leaves request processing',()=>{failSheet='2026';assert.throws(()=>f.decidePayment([[id]],'M101','Approved'));failSheet='';assert.equal(sheets.Approval_Queue.rows[1][6],'Processing')});
test('stable ID approval updates matching month',()=>{f.decidePayment([[id]],'M101','Approved');assert.equal(sheets['2026'].rows[1][11],true);assert.equal(sheets.Approval_Queue.rows[1][6],'Approved')});
test('retries preserve payment timestamp and amount',()=>{const row=sheets.Approval_Queue.rows[1];row[8]=40;const date=row[9];f.decidePayment([[id]],'M101','Approved');assert.equal(row[8],40);assert.equal(row[9],date)});
test('approved request cannot be rejected',()=>assert.throws(()=>f.decidePayment([[id]],'M101','Rejected')));
test('offline retry does not duplicate approved rows',()=>{f.recordOfflinePaymentSafe('M101',[{year:'2026',month:'Sep'}]);const count=sheets.Approval_Queue.rows.length;f.recordOfflinePaymentSafe('M101',[{year:'2026',month:'Sep'}]);assert.equal(sheets.Approval_Queue.rows.length,count)});
test('member and admin totals use recorded paid amount',()=>{assert.equal(f.getMemberData(member[2],member[0],true).totalPaid,90);assert.equal(f.getAdminData().members[0].totalPaid,90)});
test('Unicode highlight text preserved',()=>{const r=f.addHighlight('പുതിയ അറിയിപ്പ്','https://example.org/image.png','വിവരങ്ങൾ മലയാളത്തിൽ');assert.equal(r.success,true);assert.equal(sheets.Highlights.rows[1][0],'പുതിയ അറിയിപ്പ്')});
test('logout invalidates server session',()=>{api('logout',{},token);assert.equal(api('getMemberData',{},token).code,'AUTH_REQUIRED')});
test('password change revokes existing session',()=>{const t=f.issueSession('admin','');store.ADMIN_PASS='different';assert.throws(()=>f.requireSession(t))});
test('partial tracker/queue write recovered before next read',()=>{
 f.submitPaymentRequests('M101',[{year:'2026',month:'Aug'}],false);const request=sheets.Approval_Queue.rows.at(-1)[7];
 failSheet='Approval_Queue';assert.throws(()=>f.decidePayment([[request]],'M101','Approved'));failSheet='';
 assert.equal(sheets.Approval_Queue.rows.at(-1)[6],'Processing');
 f.getMemberData(member[2],member[0],true);assert.equal(sheets.Approval_Queue.rows.at(-1)[6],'Approved');
 assert.equal(sheets._Payment_Operations.rows.at(-1)[1],'Complete');
});
test('offline partial write recovery prevents missing ledger row',()=>{
 failSheet='Approval_Queue';assert.throws(()=>f.recordOfflinePaymentSafe('M101',[{year:'2026',month:'Jul'}]));failSheet='';
 f.getMemberData(member[2],member[0],true);const rows=sheets.Approval_Queue.rows.filter(r=>r[5]==='Jul');assert.equal(rows.length,1);assert.equal(rows[0][6],'Approved (Offline)');
});
test('poster ordering moves down and up and persists member order',()=>{
 sheets.Highlights.appendRow(['Second','https://example.org/second.png','second']);
 let h=f.getHighlights();let r=f.moveHighlight(0,1,h[0].version);assert.equal(r.success,true);assert.equal(r.highlights[0].heading,'Second');
 assert.equal(f.getMemberData(member[2],member[0],true).highlights[0].heading,'Second');
 h=f.getHighlights();r=f.moveHighlight(1,-1,h[1].version);assert.equal(r.success,true);assert.equal(r.highlights[0].heading,'പുതിയ അറിയിപ്പ്');
});
test('stale poster ordering request does not overwrite a changed list',()=>{const h=f.getHighlights();sheets.Highlights.appendRow(['Third','https://example.org/third.png','']);assert.ok(f.moveHighlight(0,1,h[0].version).error)});
test('poster ordering rejects invalid boundary without edits',()=>{const h=f.getHighlights();assert.ok(f.moveHighlight(0,-1,h[0].version).error)});
test('member login again returns full financial details before opening',()=>{const r=f.loginMember({phone:member[2],mid:'SECRET',deferred:true});assert.ok(Array.isArray(r.member.history));assert.equal(r.corePending,undefined);assert.ok(r.token)});
test('drag ordering places a poster directly in any requested position',()=>{let h=f.getHighlights();const order=h.map(x=>x.index);order.unshift(order.pop());const expected=h[h.length-1].heading;const r=f.reorderHighlights(order,h[0].version);assert.equal(r.success,true);assert.equal(r.highlights[0].heading,expected);assert.equal(f.getMemberData(member[2],member[0],true).highlights[0].heading,expected)});
test('drag ordering rejects missing/duplicate rows and stale versions',()=>{const h=f.getHighlights();assert.ok(f.reorderHighlights([h[0].index,h[0].index],h[0].version).error);assert.ok(f.reorderHighlights(h.map(x=>x.index),'stale').error)});

test('every newly added poster appears first and preserves existing order',()=>{
 const previous=f.getHighlights().map(h=>h.heading);
 let result=f.addHighlight('New poster A','https://example.org/new-a.png','');assert.equal(result.success,true);assert.equal(result.highlights[0].heading,'New poster A');assert.deepEqual(result.highlights.slice(1).map(h=>h.heading),previous);
 result=f.addHighlight('New poster B','https://example.org/new-b.png','');assert.equal(result.highlights[0].heading,'New poster B');assert.equal(result.highlights[1].heading,'New poster A');assert.equal(f.getMemberData(member[2],member[0],true).highlights[0].heading,'New poster B');
});

test('campaign defaults off and public read does not need a session',()=>{assert.equal(api('getPosterCampaign').campaign.enabled,false)});
test('campaign settings require admin and never change ledger rows',()=>{
 const c={enabled:true,title:'ഞാനും പങ്കെടുക്കുന്നു',description:'Join our event',poster:'https://lh3.googleusercontent.com/d/abc123',photoX:10,photoY:15,photoW:40,photoH:45,nameX:50,nameY:80,nameSize:4,font:'Manjari',color:'#183b72',shape:'circle'};
 const before=JSON.stringify(sheets);assert.ok(api('savePosterCampaign',c).error);
 const m=f.issueSession('member','M101');assert.ok(api('savePosterCampaign',c,m).error);
 const a=f.issueSession('admin','admin');assert.equal(api('savePosterCampaign',c,a).success,true);assert.equal(api('getPosterCampaign').campaign.title,c.title);assert.equal(JSON.stringify(sheets),before);
 assert.ok(api('savePosterCampaign',{...c,photoW:95},a).error);assert.ok(api('savePosterCampaign',{...c,poster:'javascript:alert(1)'},a).error);
 assert.equal(api('savePosterCampaign',{...c,enabled:false},a).success,true);assert.equal(api('getPosterCampaign').campaign.enabled,false);
});

test('campaign name layouts persist with backward-compatible defaults',()=>{
 const a=f.issueSession('admin','admin'),old=api('getPosterCampaign').campaign;
 let r=api('savePosterCampaign',{...old,nameLayout:'stacked',nameAlign:'left',nameLineCount:3},a);assert.equal(r.success,true);assert.equal(r.campaign.nameLayout,'stacked');assert.equal(r.campaign.nameAlign,'left');assert.equal(api('getPosterCampaign').campaign.nameLineCount,3);
 r=api('savePosterCampaign',{...old,nameLayout:undefined,nameAlign:undefined,nameLineCount:undefined},a);assert.equal(r.campaign.nameLayout,'single');assert.equal(r.campaign.nameAlign,'center');
});
