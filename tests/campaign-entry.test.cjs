const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),bridge=fs.readFileSync(__dirname+'/../campaign.js','utf8');
const boot=html.slice(html.indexOf('        let appStartupStarted = false'),html.indexOf('        // Only initial login blocks'));
const flush=()=>new Promise(r=>setImmediate(r));
function setup(){let campaignResolve,loginResolve;const log=[],elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{style:{},hidden:true,children:[],append(...x){this.children.push(...x)},remove(){this.removed=true}});return elements.get(id)};
 const context={document:{getElementById:el,createElement:()=>({style:{},children:[],append(...x){this.children.push(...x)},remove(){this.removed=true}}),body:{append(x){log.push(['overlay',x])}}},authToken:'saved',authRole:'member',localStorage:{removeItem(){}},showLoader:(...x)=>log.push(['loader',...x]),adminLogin:()=>{},fetchMemberDetails:()=>new Promise(r=>{log.push(['member']);loginResolve=r}),callAPI:()=>new Promise(r=>campaignResolve=r),Swal:{fire:async opts=>{log.push(['popup',opts]);return {isConfirmed:true}}},location:{origin:'https://example.org'},addEventListener(){}};
 context.window=context;vm.createContext(context);vm.runInContext(boot,context);vm.runInContext(bridge,context);return {context,log,el,resolveCampaign:r=>campaignResolve(r),resolveLogin:()=>loginResolve()};
}
(async()=>{
 assert.ok(!html.includes('id="campaignGate"'));assert.match(html,/<div id="loader" role=/);assert.match(html,/if\(!s && startupLoaderHeld\)return;/);
 const a=setup();await flush();assert.equal(a.log[0][0],'loader');assert.equal(a.log.filter(x=>x[0]==='member').length,1);a.resolveCampaign({campaign:{enabled:true,title:'Our campaign',description:'Join us'}});await flush();assert.equal(a.log.filter(x=>x[0]==='popup').length,0);a.resolveLogin();await flush();const popup=a.log.findIndex(x=>x[0]==='popup');assert.deepEqual(a.log[popup-1],['loader',false]);assert.equal(a.log[popup][1].titleText,'Our campaign');assert.equal(a.log[popup][1].cancelButtonText,'Continue to App');const overlay=a.log.find(x=>x[0]==='overlay')[1];overlay.children[0].onclick();await flush();assert.equal(a.log.filter(x=>x[0]==='member').length,1);
 const b=setup();await flush();b.resolveLogin();await flush();assert.equal(b.log.filter(x=>x[0]==='popup').length,0);b.resolveCampaign({campaign:{enabled:false}});await flush();assert.deepEqual(b.log.at(-1),['loader',false]);assert.equal(b.log.filter(x=>x[0]==='popup').length,0);
 const failed=setup();await flush();failed.resolveLogin();failed.resolveCampaign({error:'offline'});await flush();assert.deepEqual(failed.log.at(-1),['loader',false]);
 console.log('PASS logo loader precedes popup; waits for startup and settings; Join and Continue do not repeat login; OFF/error opens app');
})().catch(e=>{console.error(e);process.exitCode=1});
