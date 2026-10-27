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
assert.deepEqual(G.nameLines('Lukmanul Hakeem Al Meerani','stacked',3),['Lukmanul','Hakeem','Al Meerani']);
assert.deepEqual(G.nameLines('Lukmanul\nHakeem\nAl Meerani','single'),['Lukmanul Hakeem Al Meerani']);
assert.deepEqual(G.nameLines('ലുഖ്മാൻ\nഹകീം\nഅൽ മീറാനി','stacked',3),['ലുഖ്മാൻ','ഹകീം','അൽ മീറാനി']);
assert.equal(G.nameLines('One Two Three Four Five Six Seven','stacked',3).join(' '),'One Two Three Four Five Six Seven');
assert.deepEqual(G.nameLines('Name','stacked',3),['Name']);
assert.equal(G.nameLines('A\nB\nC\nD\nE','stacked').join(' '),'A B C D E');
console.log('PASS original single line, automatic stacked example, explicit Malayalam breaks, long names and word preservation');
const bounded={...c,useNameBox:true,nameBoxX:55,nameBoxY:45,nameBoxW:30,nameBoxH:18};
const rightEdge=G.resizeNameBox(bounded,50,0,'e');assert.equal(rightEdge.nameBoxW,45);assert.equal(rightEdge.nameBoxX,55);
const topLeft=G.resizeNameBox(bounded,-10,-15,'wn');assert.equal(topLeft.nameBoxX+topLeft.nameBoxW,85);assert.equal(topLeft.nameBoxY+topLeft.nameBoxH,63);
const movedBox=G.move(bounded,'name',90,90);assert.equal(movedBox.nameBoxX,70);assert.equal(movedBox.nameBoxY,82);
const measure=(text,size)=>({width:text.length*size*.6,ascent:size*.8,descent:size*.2,left:0});
for(const layout of ['single','stacked'])for(const text of ['Lukmanul Hakeem Al Meerani','A very very long full name with many different words','മുഹമ്മദ് അബ്ദുൽ ഹകീം അൽ മീറാനി']){
 const box={w:80,h:35},r=G.fitName(text,{nameLayout:layout,nameLineCount:3},box,70,measure);assert.ok(r.size>0&&r.size<70);assert.ok(r.height<=box.h+1e-8);assert.ok(r.m.every(m=>m.width<=box.w+1e-8));assert.equal(r.lines.join(' '),text);
}
console.log('PASS name box edge resize, bounded movement and width/height text fitting in both name layouts');
