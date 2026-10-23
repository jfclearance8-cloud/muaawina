/* Shared percentage-coordinate transforms for touch, mouse and keyboard. */
(function(root){
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function move(c,target,dx,dy){const n={...c};if(target==='name'){n.nameX=clamp(c.nameX+dx,0,100);n.nameY=clamp(c.nameY+dy,0,100)}else{n.photoX=clamp(c.photoX+dx,0,100-c.photoW);n.photoY=clamp(c.photoY+dy,0,100-c.photoH)}return n}
 function scale(c,target,factor){if(!Number.isFinite(factor)||factor<=0)return {...c};const n={...c};if(target==='name'){n.nameSize=clamp(c.nameSize*factor,.5,15)}else{const cx=c.photoX+c.photoW/2,cy=c.photoY+c.photoH/2;const max=Math.min(2*Math.min(cx,100-cx)/c.photoW,2*Math.min(cy,100-cy)/c.photoH);const f=clamp(factor,Math.max(1/c.photoW,1/c.photoH),max);n.photoW=c.photoW*f;n.photoH=c.photoH*f;n.photoX=clamp(cx-n.photoW/2,0,100-n.photoW);n.photoY=clamp(cy-n.photoH/2,0,100-n.photoH)}return n}
 function crop(s,c,factor,anchor){const zoom=clamp(s.zoom*factor,.25,6),f=zoom/s.zoom,cx=c.photoX+c.photoW/2,cy=c.photoY+c.photoH/2;return {zoom,dx:anchor.x+(cx+s.dx-anchor.x)*f-cx,dy:anchor.y+(cy+s.dy-anchor.y)*f-cy}}
 const api={clamp,move,scale,crop};if(typeof module==='object'&&module.exports)module.exports=api;else root.CampaignGestures=api;
})(typeof window==='undefined'?globalThis:window);
