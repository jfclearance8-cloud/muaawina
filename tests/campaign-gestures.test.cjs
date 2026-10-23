const assert=require('node:assert/strict'),G=require('../campaign-gestures.js');
const c={photoX:10,photoY:15,photoW:40,photoH:45,nameX:50,nameY:80,nameSize:4};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let moved=G.move(c,'photo',200,-200);assert.equal(moved.photoX,60);assert.equal(moved.photoY,0);assert.equal(c.photoX,10);
let enlarged=G.scale(c,'photo',2);near(enlarged.photoX+enlarged.photoW/2,30);near(enlarged.photoY+enlarged.photoH/2,37.5);assert.ok(enlarged.photoX>=0&&enlarged.photoY>=0);assert.ok(enlarged.photoX+enlarged.photoW<=100);near(enlarged.photoW/enlarged.photoH,c.photoW/c.photoH);
let shrunk=G.scale(c,'photo',.01);assert.ok(shrunk.photoW>=1&&shrunk.photoH>=1);
assert.equal(G.scale(c,'name',100).nameSize,15);assert.equal(G.scale(c,'name',.01).nameSize,.5);assert.equal(G.move(c,'name',-100,100).nameX,0);
const s={zoom:1,dx:0,dy:0},anchor={x:25,y:30};const zoomed=G.crop(s,c,2,anchor);assert.equal(zoomed.zoom,2);near(zoomed.dx,5);near(zoomed.dy,7.5);
const unzoomed=G.crop(zoomed,c,.5,anchor);near(unzoomed.dx,0);near(unzoomed.dy,0);near(unzoomed.zoom,1);
assert.equal(G.crop(s,c,.01,anchor).zoom,.25);assert.equal(G.crop(s,c,100,anchor).zoom,6);
// The focal point remains under the same finger through a pinch.
near((anchor.x-(30+zoomed.dx))/zoomed.zoom,anchor.x-30);
near((anchor.y-(37.5+zoomed.dy))/zoomed.zoom,anchor.y-37.5);
console.log('PASS admin drag bounds, aspect-preserving resize, name resize, reversible focal pinch and zoom limits');
