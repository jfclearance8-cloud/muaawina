const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),bridge=fs.readFileSync(__dirname+'/../campaign.js','utf8');
const boot=html.slice(html.indexOf('        let appStartupStarted = false;'),html.indexOf('        // Only initial login blocks'));
const flush=()=>new Promise(r=>setImmediate(r));
function setup(response){let resolve;const log=[],elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{style:{},hidden:true,disabled:true,children:[],append(...x){this.children.push(...x)},remove(){this.removed=true}});return elements.get(id)};
 const context={window:{addEventListener(){}},document:{getElementById:el,createElement:t=>({style:{},children:[],append(...x){this.children.push(...x)},remove(){this.removed=true}}),body:{append(x){log.push(['overlay',x])}}},authToken:'saved',authRole:'member',localStorage:{removeItem(){}},showLoader:(...x)=>log.push(['loader',...x]),adminLogin:()=>log.push(['admin']),fetchMemberDetails:()=>log.push(['member']),callAPI:()=>response||new Promise(r=>resolve=r),location:{origin:'https://example.org'}};
 context.window=context;context.addEventListener=()=>{};vm.createContext(context);vm.runInContext(boot,context);vm.runInContext(bridge,context);return {context,log,el,resolve:r=>resolve(r)};
}
(async()=>{
 assert.match(html,/<div id="loader" class="hidden"/);assert.match(html,/id="mainApp" hidden/);
 const active=setup(Promise.resolve({campaign:{enabled:true,title:'Our campaign',description:'Join us'}}));active.context.window.onload();await flush();assert.equal(active.log.length,0);assert.equal(active.el('campaignGateTitle').textContent,'Our campaign');
 active.el('campaignGateJoin').onclick();assert.equal(active.log.filter(x=>x[0]==='loader').length,0);const overlay=active.log.find(x=>x[0]==='overlay')[1];overlay.children[0].onclick();assert.deepEqual(active.log.slice(-2),[['loader',true,true],['member']]);active.context.startMuaawinaApp();assert.equal(active.log.filter(x=>x[0]==='member').length,1);
 const off=setup(Promise.resolve({campaign:{enabled:false}}));await flush();assert.equal(off.log.filter(x=>x[0]==='member').length,1);
 const slow=setup();slow.context.startMuaawinaApp();slow.resolve({campaign:{enabled:true,title:'Late'}});await flush();assert.equal(slow.el('campaignGateTitle').textContent,undefined);assert.equal(slow.log.filter(x=>x[0]==='member').length,1);
 console.log('PASS campaign precedes loader/login; Join does not boot app; Continue boots once; OFF and skipped lookup resume safely');
})().catch(e=>{console.error(e);process.exitCode=1});
