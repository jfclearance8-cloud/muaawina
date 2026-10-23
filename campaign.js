/* Optional campaign integration. Remove this script tag to detach the feature. */
(()=>{
 let frame=null,overlay=null;
 window.openPosterCampaign=function(editor=false){
  if(editor&&authRole!=='admin')return;
  if(overlay)overlay.remove();
  overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:#fff;display:flex;flex-direction:column';
  const close=document.createElement('button');close.textContent='← Continue to App';close.style.cssText='padding:14px;text-align:left;background:#eff6ff;color:#1e3a8a;font-weight:bold';close.onclick=()=>{overlay.remove();overlay=null;frame=null;};
  frame=document.createElement('iframe');frame.title=editor?'Campaign Settings':'Join Campaign';frame.src='campaign.html'+(editor?'#editor':'');frame.style.cssText='width:100%;flex:1;border:0';overlay.append(close,frame);document.body.append(overlay);
 };
 window.addEventListener('message',async e=>{
  if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||e.data?.type!=='mua-campaign')return;
  const {id,action,data}=e.data;if(!['getPosterCampaign','savePosterCampaign','uploadPosterPhoto'].includes(action))return;
  if(action!=='getPosterCampaign'&&authRole!=='admin')return;
  const result=await callAPI(action,data||{});e.source.postMessage({type:'mua-campaign-result',id,result},location.origin);
 });
 window.addEventListener('load',async()=>{
  const r=await callAPI('getPosterCampaign');const c=r?.campaign;
  if(!c?.enabled)return;
  const answer=await Swal.fire({titleText:c.title,text:c.description||'Would you like to join this campaign?',showCancelButton:true,confirmButtonText:'Join Campaign',cancelButtonText:'Continue to App',confirmButtonColor:'#1e3a8a'});
  if(answer.isConfirmed)openPosterCampaign();
 });
})();
