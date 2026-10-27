/* Shared percentage-coordinate transforms for touch, mouse and keyboard. */
(function(root){
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function move(c,target,dx,dy){const n={...c};if(target==='name'&&c.useNameBox){n.nameBoxX=clamp(c.nameBoxX+dx,0,100-c.nameBoxW);n.nameBoxY=clamp(c.nameBoxY+dy,0,100-c.nameBoxH)}else if(target==='name'){n.nameX=clamp(c.nameX+dx,0,100);n.nameY=clamp(c.nameY+dy,0,100)}else{n.photoX=clamp(c.photoX+dx,0,100-c.photoW);n.photoY=clamp(c.photoY+dy,0,100-c.photoH)}return n}
 function scale(c,target,factor){if(!Number.isFinite(factor)||factor<=0)return {...c};const n={...c};if(target==='name'&&c.useNameBox){const cx=c.nameBoxX+c.nameBoxW/2,cy=c.nameBoxY+c.nameBoxH/2,max=Math.min(2*Math.min(cx,100-cx)/c.nameBoxW,2*Math.min(cy,100-cy)/c.nameBoxH),f=clamp(factor,Math.max(1/c.nameBoxW,1/c.nameBoxH),max);n.nameBoxW=c.nameBoxW*f;n.nameBoxH=c.nameBoxH*f;n.nameBoxX=clamp(cx-n.nameBoxW/2,0,100-n.nameBoxW);n.nameBoxY=clamp(cy-n.nameBoxH/2,0,100-n.nameBoxH);n.nameSize=clamp(c.nameSize*f,.5,15)}else if(target==='name'){n.nameSize=clamp(c.nameSize*factor,.5,15)}else{const cx=c.photoX+c.photoW/2,cy=c.photoY+c.photoH/2;const max=Math.min(2*Math.min(cx,100-cx)/c.photoW,2*Math.min(cy,100-cy)/c.photoH);const f=clamp(factor,Math.max(1/c.photoW,1/c.photoH),max);n.photoW=c.photoW*f;n.photoH=c.photoH*f;n.photoX=clamp(cx-n.photoW/2,0,100-n.photoW);n.photoY=clamp(cy-n.photoH/2,0,100-n.photoH)}return n}
 function crop(s,c,factor,anchor){const zoom=clamp(s.zoom*factor,.25,6),f=zoom/s.zoom,cx=c.photoX+c.photoW/2,cy=c.photoY+c.photoH/2;return {zoom,dx:anchor.x+(cx+s.dx-anchor.x)*f-cx,dy:anchor.y+(cy+s.dy-anchor.y)*f-cy}}
 // Explicit Enter breaks win; otherwise balance whole words across the requested lines.
 function nameLines(text,layout='single',count=3,measure=s=>s.length){
  text=String(text||'').trim();if(!text)return [];
  if(layout!=='stacked')return [text.replace(/\s+/g,' ')];
  const explicit=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(explicit.length>1)return explicit.length<=4?explicit:[...explicit.slice(0,3),explicit.slice(3).join(' ')];
  // Split ordinary spaces only so Al Meerani stays together on one line.
  const groups=text.replace(/\b(Al|El)\s+(\S+)/gi,'$1\u00a0$2').split(/[ \t]+/).filter(Boolean);
  const n=groups.length,k=Math.min(n,clamp(Math.round(count)||3,2,4));
  const line=(i,j)=>groups.slice(i,j).join(' ').replace(/\u00a0/g,' ');
  const target=measure(text.replace(/\s+/g,' '))/k,dp=Array.from({length:k+1},()=>Array(n+1).fill(Infinity)),prev=Array.from({length:k+1},()=>[]);dp[0][0]=0;
  for(let r=1;r<=k;r++)for(let j=r;j<=n;j++)for(let i=r-1;i<j;i++){const cost=dp[r-1][i]+Math.pow(measure(line(i,j))-target,2);if(cost<dp[r][j]){dp[r][j]=cost;prev[r][j]=i}}
  const out=[];let j=n;for(let r=k;r>0;r--){const i=prev[r][j];out.unshift(line(i,j));j=i}return out;
 }
 function resizeNameBox(c,dx,dy,handle){const n={...c},right=c.nameBoxX+c.nameBoxW,bottom=c.nameBoxY+c.nameBoxH;
  if(handle.includes('e'))n.nameBoxW=clamp(c.nameBoxW+dx,1,100-c.nameBoxX);
  if(handle.includes('s'))n.nameBoxH=clamp(c.nameBoxH+dy,1,100-c.nameBoxY);
  if(handle.includes('w')){n.nameBoxX=clamp(c.nameBoxX+dx,0,right-1);n.nameBoxW=right-n.nameBoxX}
  if(handle.includes('n')){n.nameBoxY=clamp(c.nameBoxY+dy,0,bottom-1);n.nameBoxH=bottom-n.nameBoxY}return n;
 }
 function fitName(text,c,box,maxSize,measure){
  const lines=nameLines(text,c.nameLayout,c.nameLineCount,t=>measure(t,maxSize).width);
  function metrics(size){const m=lines.map(t=>measure(t,size)),ascent=Math.max(0,...m.map(x=>x.ascent)),descent=Math.max(0,...m.map(x=>x.descent)),step=Math.max(size*1.08,ascent+descent);return {m,ascent,descent,step,height:lines.length?ascent+descent+(lines.length-1)*step:0}}
  let lo=0,hi=maxSize;for(let i=0;i<32;i++){const mid=(lo+hi)/2,r=metrics(mid);if(r.height<=box.h&&r.m.every(x=>x.width<=box.w))lo=mid;else hi=mid}
  return {lines,size:lo,...metrics(lo)};
 }
 const api={clamp,move,scale,crop,nameLines,resizeNameBox,fitName};if(typeof module==='object'&&module.exports)module.exports=api;else root.CampaignGestures=api;
})(typeof window==='undefined'?globalThis:window);
