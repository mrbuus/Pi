#!/usr/bin/env node
'use strict';
// Independent coordinates, distances, determinants and enumerations for C7.
// Numerical sampling does not prove universal geometry theorems or exhaustive
// interval answers; conditions and all quiz statements are reviewed separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const data=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'data/formulas/plane-geometry.json'),'utf8'));
const rows=new Map(data.formulas.map(f=>[f.slug.slice(6),f]));
let checks=0;const covered=new Set();
const close=(a,b,label='')=>{checks++;assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);};
const same=(a,b,label='')=>{checks++;assert.deepEqual(a,b,label);};
const ok=(v,label='')=>{checks++;assert.ok(v,label);};
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),scale=(a,k)=>a.map(x=>x*k);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const norm=a=>Math.hypot(...a),dist=(a,b)=>norm(sub(a,b)),mid=(a,b)=>scale(add(a,b),.5);
const area=ps=>Math.abs(ps.reduce((s,p,i)=>s+cross(p,ps[(i+1)%ps.length]),0))/2;
const angle=(a,o,b)=>deg(Math.acos(Math.max(-1,Math.min(1,dot(sub(a,o),sub(b,o))/(dist(a,o)*dist(b,o))))));
const lineDistance=(p,a,b)=>Math.abs(cross(sub(p,a),sub(b,a)))/dist(a,b);
const project=(p,a,b)=>add(a,scale(sub(b,a),dot(sub(p,a),sub(b,a))/dot(sub(b,a),sub(b,a))));
function triangle(a,b,c){ok(a>0&&b>0&&c>0&&Math.abs(b-c)<a&&a<b+c,'triangle feasibility');const x=(b*b+c*c-a*a)/(2*c);return [[0,0],[c,0],[x,Math.sqrt(b*b-x*x)]];}
function incenter([A,B,C]){const a=dist(B,C),b=dist(C,A),c=dist(A,B);return scale(add(add(scale(A,a),scale(B,b)),scale(C,c)),1/(a+b+c));}
function circumcenter([A,B,C]){const u=sub(B,A),v=sub(C,A),det=2*cross(u,v);ok(Math.abs(det)>1e-10);return add(A,[(dot(u,u)*v[1]-dot(v,v)*u[1])/det,(u[0]*dot(v,v)-v[0]*dot(u,u))/det]);}
const inradius=ps=>lineDistance(incenter(ps),ps[0],ps[1]);
const circumradius=ps=>dist(circumcenter(ps),ps[0]);
const sas=(b,c,A)=>[[0,0],[c,0],[b*Math.cos(rad(A)),b*Math.sin(rad(A))]];
const pgram=(a,b,A)=>[[0,0],[a,0],[a+b*Math.cos(rad(A)),b*Math.sin(rad(A))],[b*Math.cos(rad(A)),b*Math.sin(rad(A))]];
const trap=(a,b,h,t=0)=>[[0,0],[a,0],[t+b,h],[t,h]];
const circlePoint=(R,t)=>[R*Math.cos(t),R*Math.sin(t)];
const tangentLength=(R,D)=>{ok(D>R&&R>0);const P=[D,0],T=[R*R/D,R*Math.sqrt(D*D-R*R)/D];close(norm(T),R);close(dot(T,sub(P,T)),0);return dist(P,T);};
const secantTangent=(near,far)=>{ok(far>near&&near>0);return tangentLength((far-near)/2,(far+near)/2);};
const diagonalCount=n=>{let count=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(j-i!==1&&!(i===0&&j===n-1))count++;return count;};
function v(slug,i,answer,fn){same(rows.get(slug).examples[i].answer,answer,`${slug} example ${i+1}`);fn();covered.add(`${slug}:${i}`);}
function chordWitness(a,b,c,d){const ps=[[-a,0],[b,0],[0,-c]],O=circumcenter(ps),R=dist(O,ps[0]);close(dist(O,[0,d]),R);return d;}
function tangential(t){
 let lo=0,hi=Math.max(...t)*10;for(let i=0;i<80;i++){const r=(lo+hi)/2;if(t.reduce((s,x)=>s+Math.atan(r/x),0)>Math.PI)hi=r;else lo=r;}
 const r=(lo+hi)/2,turn=t.map(x=>2*Math.atan(x/r)),n=[0,turn[1],turn[1]+turn[2],turn[1]+turn[2]+turn[3]];
 const intersect=(u,v)=>{const a=[Math.cos(u),Math.sin(u)],b=[Math.cos(v),Math.sin(v)],det=cross(a,b);return [r*(b[1]-a[1])/det,r*(a[0]-b[0])/det];};
 const ps=[intersect(n[3],2*Math.PI),intersect(n[0],n[1]),intersect(n[1],n[2]),intersect(n[2],n[3])];
 for(let i=0;i<4;i++){close(lineDistance([0,0],ps[i],ps[(i+1)%4]),r);close(dist(ps[i],ps[(i+1)%4]),t[i]+t[(i+1)%4]);}
 return ps;
}

v('vertical-angles',0,'$37^\\circ$',()=>{const u=circlePoint(1,rad(37));close(angle([1,0],[0,0],u),angle([-1,0],[0,0],scale(u,-1)));close(angle([-1,0],[0,0],scale(u,-1)),37);});
v('vertical-angles',1,'$20$',()=>{close(3*20+10,5*20-30);ok(3*20+10>0&&3*20+10<180);});
v('linear-pair',0,'$55^\\circ$',()=>close(angle(circlePoint(1,rad(125)),[0,0],[-1,0]),55));
v('linear-pair',1,'$72^\\circ$',()=>{close(72+108,180);close(72/108,2/3);});
v('parallel-angles',0,'$68^\\circ$',()=>{const u=circlePoint(1,rad(68));close(angle([1,0],[0,0],u),68);close(angle([-1,0],[0,0],scale(u,-1)),68);});
v('parallel-angles',1,'$68^\\circ$',()=>close(angle(circlePoint(1,rad(112)),[0,0],[-1,0]),68));
v('triangle-angles',0,'$70^\\circ$',()=>close(50+60+70,180));
v('triangle-angles',1,'$90^\\circ$',()=>{close(30+60+90,180);same([30/30,60/30,90/30],[1,2,3]);});
v('triangle-exterior',0,'$105^\\circ$',()=>{close(40+65+75,180);close(180-75,105);});
v('triangle-exterior',1,'$75^\\circ$',()=>{close(45+75,120);close(45+75+60,180);});
v('triangle-inequality',0,'$2<a<8$',()=>{for(const a of [2,2.001,3,7.999,8])same(Math.abs(5-3)<a&&a<5+3,a>2&&a<8);});
v('triangle-inequality',1,'$x\\in\\{2,3,4\\}$',()=>same(Array.from({length:9},(_,i)=>i+1).filter(x=>x+2>3&&x+3>2&&2+3>x),[2,3,4]));
v('congruence',0,'$12$',()=>{const t=triangle(4,5,3);close(dist(t[0],t[1])+dist(t[1],t[2])+dist(t[2],t[0]),12);});
v('congruence',1,'$10$',()=>{const t=sas(8,6,90);close(dist(t[1],t[2]),10);});
v('similarity',0,'$2$',()=>{const t=triangle(3,4,5),u=t.map(p=>scale(p,2));for(let i=0;i<3;i++)close(dist(u[i],u[(i+1)%3])/dist(t[i],t[(i+1)%3]),2);});
v('similarity',1,'$15$',()=>close(dist(scale([0,0],2.5),scale([6,0],2.5)),15));
v('similarity-area',0,'$45$',()=>{const t=[[0,0],[5,0],[0,2]];close(area(t),5);close(area(t.map(p=>scale(p,3))),45);});
v('similarity-area',1,'$5/4$',()=>{const t=[[0,0],[4,0],[4,4],[0,4]],u=t.map(p=>scale(p,1.25));close(area(t),16);close(area(u),25);close(dist(u[0],u[1])/dist(t[0],t[1]),1.25);});
v('similarity-volume',0,'$24$',()=>{close(1*1*3,3);close(2*2*6,24);});
v('similarity-volume',1,'$5/3$',()=>{close(3**3,27);close(5**3,125);close(5/3,Math.cbrt(125/27));});
v('area-base-height',0,'$20$',()=>close(area([[0,0],[10,0],[3,4]]),20));
v('area-base-height',1,'$5$',()=>{const t=[[0,0],[12,0],[15,5]];close(area(t),30);close(lineDistance(t[2],t[0],t[1]),5);});
v('area-sine',0,'$12$',()=>close(area(sas(6,8,30)),12));
v('area-sine',1,'$10$',()=>close(area(sas(5,4,90)),10));
v('heron',0,'$6$',()=>close(area(triangle(3,4,5)),6));
v('heron',1,'$12$',()=>close(area(triangle(5,5,6)),12));
v('inradius-area',0,'$6$',()=>{const t=triangle(3,4,5);close(inradius(t),1);close(area(t),6);});
v('inradius-area',1,'$2$',()=>{const t=triangle(6,8,10);close(area(t),24);close(inradius(t),2);});
v('circumradius-area',0,'$84$',()=>{const t=triangle(13,14,15);close(circumradius(t),65/8);close(area(t),84);});
v('circumradius-area',1,'$13/2$',()=>{const t=triangle(5,12,13);close(area(t),30);close(circumradius(t),6.5);});
v('equilateral-area',0,'$4\\sqrt3$',()=>close(area(triangle(4,4,4)),4*Math.sqrt(3)));
v('equilateral-area',1,'$6$',()=>close(area(triangle(6,6,6)),9*Math.sqrt(3)));
v('pythagoras',0,'$15$',()=>close(dist([9,0],[0,12]),15));
v('pythagoras',1,'$15$',()=>{close(dist([8,0],[0,15]),17);close(dot([8,0],[0,15]),0);});
v('altitude-projection',0,'$6$',()=>{const A=[-4,0],B=[9,0],C=[0,6];close(dot(sub(A,C),sub(B,C)),0);close(lineDistance(C,A,B),6);});
v('altitude-projection',1,'$16$',()=>close(dot(sub([-9,0],[0,12]),sub([16,0],[0,12])),0));
v('leg-projection',0,'$15$',()=>{const A=[0,0],B=[25,0],C=[9,12];close(dot(sub(A,C),sub(B,C)),0);close(dist(A,C),15);close(dist(A,project(C,A,B)),9);});
v('leg-projection',1,'$25/13$',()=>{const t=triangle(12,5,13),H=project(t[2],t[0],t[1]);close(dist(t[0],H),25/13);close(dot(sub(t[0],t[2]),sub(t[1],t[2])),0);});
v('thirty-degree-leg',0,'$7$',()=>{const t=triangle(7,7*Math.sqrt(3),14);close(angle(t[1],t[0],t[2]),30);close(angle(t[0],t[2],t[1]),90);});
v('thirty-degree-leg',1,'$10$',()=>{const t=triangle(5,5*Math.sqrt(3),10);close(angle(t[1],t[0],t[2]),30);});
v('right-radii',0,'$r=2,\\ R=5$',()=>{const t=triangle(6,8,10);close(inradius(t),2);close(circumradius(t),5);});
v('right-radii',1,'$r=3,\\ R=17/2$',()=>{const t=triangle(8,15,17);close(inradius(t),3);close(circumradius(t),8.5);});
v('median-length',0,'$12$',()=>{const t=triangle(10,13,13);close(dist(t[0],mid(t[1],t[2])),12);});
v('median-length',1,'$5/2$',()=>{const t=triangle(5,3,4);close(dist(t[0],mid(t[1],t[2])),2.5);});
v('centroid',0,'$AG=6,\\ GM=3$',()=>{const A=[0,9],B=[-3,0],C=[3,0],G=scale(add(add(A,B),C),1/3),M=mid(B,C);close(dist(A,G),6);close(dist(G,M),3);});
v('centroid',1,'$12$',()=>{const A=[0,12],B=[-2,0],C=[2,0],G=scale(add(add(A,B),C),1/3);close(dist(A,G),8);close(dist(A,mid(B,C)),12);});
function bisector(a,b,c){const t=triangle(a,b,c),[A,B,C]=t,D=scale(add(scale(B,b),scale(C,c)),1/(b+c));close(angle(B,A,D),angle(D,A,C));return {t,D,length:dist(A,D),BD:dist(B,D),DC:dist(D,C)};}
v('bisector-ratio',0,'$BD=4,\\ DC=6$',()=>{const t=bisector(10,9,6);close(t.BD,4);close(t.DC,6);});
v('bisector-ratio',1,'$9/2$',()=>close(bisector(12,10,6).BD,4.5));
v('bisector-length',0,'$4$',()=>close(bisector(6,5,5).length,4));
v('bisector-length',1,'$12\\sqrt2/7$',()=>close(bisector(5,4,3).length,12*Math.sqrt(2)/7));
v('altitude',0,'$6$',()=>{const t=[[0,0],[8,0],[3,6]];close(area(t),24);close(lineDistance(t[2],t[0],t[1]),6);});
v('altitude',1,'$12$',()=>{const [A,B,C]=triangle(14,13,15);close(area([A,B,C]),84);close(lineDistance(A,B,C),12);});
v('midline',0,'$9$',()=>close(dist(mid([4,5],[0,0]),mid([4,5],[18,0])),9));
v('midline',1,'$14$',()=>{const A=[3,4],B=[0,0],C=[14,0];close(dist(mid(A,B),mid(A,C)),7);close(dist(B,C),14);});
v('thales',0,'$6$',()=>{const u=[[0,0],[0,2],[0,5]],v=[[0,0],[2*Math.sqrt(3),2],[5*Math.sqrt(3),5]];close(dist(v[0],v[1]),4);close(dist(v[1],v[2]),6);close(dist(u[0],u[1]),2);close(dist(u[1],u[2]),3);});
v('thales',1,'$15$',()=>{const v=[[0,0],[5*Math.sqrt(8),5],[12*Math.sqrt(8),12]];close(dist(v[1],v[2]),21);close(dist(v[0],v[1]),15);});
v('parallelogram-properties',0,'$22$',()=>{const ps=pgram(7,4,50);close(ps.reduce((s,p,i)=>s+dist(p,ps[(i+1)%4]),0),22);});
v('parallelogram-properties',1,'$AO=6,\\ BO=5$',()=>{const ps=[[6,0],[0,5],[-6,0],[0,-5]],O=mid(ps[0],ps[2]);same(O,mid(ps[1],ps[3]));close(dist(ps[0],O),6);close(dist(ps[1],O),5);});
function otherDiagonal(a,b,d){const theta=deg(Math.acos((d*d-a*a-b*b)/(2*a*b))),ps=pgram(a,b,theta);close(dist(ps[0],ps[2]),d);return dist(ps[1],ps[3]);}
v('parallelogram-diagonals',0,'$5$',()=>close(otherDiagonal(3,4,5),5));
v('parallelogram-diagonals',1,'$\\sqrt{33}$',()=>close(otherDiagonal(5,4,7),Math.sqrt(33)));
v('parallelogram-area',0,'$24$',()=>close(area([[0,0],[8,0],[10,3],[2,3]]),24));
v('parallelogram-area',1,'$15$',()=>close(area(pgram(6,5,30)),15));
v('rectangle',0,'$S=48,\\ d=10$',()=>{const p=pgram(6,8,90);close(area(p),48);close(dist(p[0],p[2]),10);});
v('rectangle',1,'$b=12,\\ S=60$',()=>{const p=pgram(5,12,90);close(dist(p[0],p[2]),13);close(area(p),60);});
v('rhombus',0,'$24$',()=>{const p=[[3,0],[0,4],[-3,0],[0,-4]];close(area(p),24);for(let i=0;i<4;i++)close(dist(p[i],p[(i+1)%4]),5);});
v('rhombus',1,'$18$',()=>close(area(pgram(6,6,30)),18));
v('square',0,'$S=25,\\ d=5\\sqrt2$',()=>{const p=pgram(5,5,90);close(area(p),25);close(dist(p[0],p[2]),5*Math.sqrt(2));});
v('square',1,'$18$',()=>{const p=[[3,0],[0,3],[-3,0],[0,-3]];close(dist(p[0],p[2]),6);close(area(p),18);});
v('trapezoid-area',0,'$55$',()=>close(area(trap(14,8,5,2)),55));
v('trapezoid-area',1,'$6$',()=>{const p=trap(8,4,6,3);close(area(p),36);close(lineDistance(p[2],p[0],p[1]),6);});
v('trapezoid-midline',0,'$8$',()=>{const p=trap(11,5,4,2);close(dist(mid(p[0],p[3]),mid(p[1],p[2])),8);});
v('trapezoid-midline',1,'$12$',()=>{const p=trap(12,6,3,2);close(dist(mid(p[0],p[3]),mid(p[1],p[2])),9);close(dist(p[0],p[1]),12);});
v('isosceles-trapezoid',0,'$3$',()=>{const p=trap(14,6,3,4);close(dist(p[0],p[3]),5);close(dist(p[1],p[2]),5);close(lineDistance(p[2],p[0],p[1]),3);});
v('isosceles-trapezoid',1,'$36$',()=>{const p=trap(12,6,4,3);close(dist(p[0],p[3]),5);close(dist(p[1],p[2]),5);close(area(p),36);});
function quadDiagonals(d1,d2,phi){const v=circlePoint(d2/2,rad(phi));return [[d1/2,0],v,[-d1/2,0],scale(v,-1)];}
v('quadrilateral-area',0,'$20$',()=>close(area(quadDiagonals(10,8,30)),20));
v('quadrilateral-area',1,'$24$',()=>close(area(quadDiagonals(6,8,90)),24));
const regular=(n,R)=>Array.from({length:n},(_,i)=>circlePoint(R,2*Math.PI*i/n));
const interiorSum=ps=>ps.reduce((s,p,i)=>s+angle(ps[(i+ps.length-1)%ps.length],p,ps[(i+1)%ps.length]),0);
v('polygon-interior',0,'$900^\\circ$',()=>close(interiorSum(regular(7,1)),900));
v('polygon-interior',1,'$9$',()=>close(interiorSum(regular(9,1)),1260));
v('polygon-exterior',0,'$40^\\circ$',()=>{const p=regular(9,1);close(180-angle(p[8],p[0],p[1]),40);});
v('polygon-exterior',1,'$15$',()=>{const p=regular(15,1);close(180-angle(p[14],p[0],p[1]),24);});
v('regular-polygon',0,'$R=4,\\ r=2\\sqrt3$',()=>{const p=regular(6,4);close(dist(p[0],p[1]),4);close(lineDistance([0,0],p[0],p[1]),2*Math.sqrt(3));});
v('regular-polygon',1,'$R=\\sqrt2,\\ r=1$',()=>{const p=regular(4,Math.sqrt(2));close(dist(p[0],p[1]),2);close(lineDistance([0,0],p[0],p[1]),1);});
v('polygon-diagonals',0,'$20$',()=>same(diagonalCount(8),20));
v('polygon-diagonals',1,'$10$',()=>same(Array.from({length:18},(_,i)=>i+3).filter(n=>diagonalCount(n)===35),[10]));
// Inscribed polygons give independent lower approximations for curved lengths/areas.
const curved=(R,theta)=>{const n=100000,dt=theta/n;let length=0;for(let i=0;i<n;i++)length+=dist(circlePoint(R,i*dt),circlePoint(R,(i+1)*dt));return {length,sector:n*cross(circlePoint(R,0),circlePoint(R,dt))/2,segment:(n*cross(circlePoint(R,0),circlePoint(R,dt))-R*R*Math.sin(theta))/2};};
v('circumference',0,'$6\\pi$',()=>close(curved(3,2*Math.PI).length,6*Math.PI));
v('circumference',1,'$5$',()=>close(curved(5,2*Math.PI).length,10*Math.PI));
v('circle-area',0,'$16\\pi$',()=>close(curved(4,2*Math.PI).sector,16*Math.PI));
v('circle-area',1,'$7$',()=>close(curved(7,2*Math.PI).sector,49*Math.PI));
v('arc-length',0,'$2\\pi$',()=>close(curved(6,Math.PI/3).length,2*Math.PI));
v('arc-length',1,'$4\\pi/3$',()=>close(curved(4,rad(60)).length,4*Math.PI/3));
v('sector-area',0,'$6\\pi$',()=>close(curved(6,Math.PI/3).sector,6*Math.PI));
v('sector-area',1,'$4\\pi$',()=>close(curved(4,rad(90)).sector,4*Math.PI));
v('segment-area',0,'$\\pi-2$',()=>close(curved(2,Math.PI/2).segment,Math.PI-2));
v('segment-area',1,'$9\\pi/2$',()=>close(curved(3,Math.PI).segment,9*Math.PI/2));
const inscribed=theta=>angle(circlePoint(1,0),circlePoint(1,rad(theta/2+180)),circlePoint(1,rad(theta)));
v('inscribed-angle',0,'$50^\\circ$',()=>close(inscribed(100),50));
v('inscribed-angle',1,'$140^\\circ$',()=>close(inscribed(140),70));
v('diameter-angle',0,'$8$',()=>{const p=triangle(8,6,10);close(dist(p[2],mid(p[0],p[1])),5);close(angle(p[0],p[2],p[1]),90);});
v('diameter-angle',1,'$12$',()=>{const p=triangle(12,5,13);close(dist(p[2],mid(p[0],p[1])),6.5);close(angle(p[0],p[2],p[1]),90);});
v('tangent-radius',0,'$12$',()=>close(tangentLength(5,13),12));
v('tangent-radius',1,'$3$',()=>close(tangentLength(4,5),3));
v('equal-tangents',0,'$7$',()=>{const R=4,D=Math.sqrt(65),T=[16/D,28/D];close(dist([D,0],T),7);close(dist([D,0],[T[0],-T[1]]),7);});
v('equal-tangents',1,'$3$',()=>{close(2*3+1,5*3-8);close(tangentLength(4,Math.sqrt(65)),2*3+1);});
v('intersecting-chords',0,'$6$',()=>close(chordWitness(3,8,4,6),6));
v('intersecting-chords',1,'$9$',()=>close(chordWitness(2,18,4,9),9));
v('tangent-secant',0,'$6$',()=>close(secantTangent(4,9),6));
v('tangent-secant',1,'$4$',()=>close(secantTangent(2,2+6),4));
v('cyclic-quadrilateral',0,'$108^\\circ$',()=>{const [A,B,C,D]=[252,0,72,144].map(t=>circlePoint(1,rad(t)));close(angle(B,A,D),72);close(angle(B,C,D),108);});
v('cyclic-quadrilateral',1,'$70^\\circ$',()=>{const [A,B,C,D]=[0,70,140,250].map(t=>circlePoint(1,rad(t)));close(angle(A,B,C),110);close(angle(A,D,C),70);});
v('tangential-quadrilateral',0,'$7$',()=>{const p=tangential([3,1,4,4]);close(dist(p[0],p[3]),7);});
v('tangential-quadrilateral',1,'$12$',()=>{const p=tangential([4,4,6,6]);close(p.reduce((s,x,i)=>s+dist(x,p[(i+1)%4]),0),40);close(dist(p[2],p[3]),12);});
// Seeded witnesses exercise triangle identities by independently constructed centers.
let seed=714633;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<200;i++){
 let t;do{t=Array.from({length:3},()=>[10*rnd()-5,10*rnd()-5]);}while(area(t)<.3);
 const [A,B,C]=t,a=dist(B,C),b=dist(C,A),c=dist(A,B),p=(a+b+c)/2,S=area(t),I=incenter(t),O=circumcenter(t);
 close(Math.sqrt(p*(p-a)*(p-b)*(p-c)),S,'Heron vs determinant');
 close(b*c*Math.sin(rad(angle(B,A,C)))/2,S);
 close(a*lineDistance(A,B,C)/2,S);close(p*lineDistance(I,A,B),S);
 close(lineDistance(I,A,B),lineDistance(I,B,C));close(lineDistance(I,B,C),lineDistance(I,C,A));
 close(dist(O,A),dist(O,B));close(dist(O,A),dist(O,C));close(a*b*c/(4*dist(O,A)),S);
 close(dist(A,mid(B,C)),Math.sqrt(2*b*b+2*c*c-a*a)/2);
 const G=scale(add(add(A,B),C),1/3);close(dist(A,G)/dist(G,mid(B,C)),2);
 const D=scale(add(scale(B,b),scale(C,c)),1/(b+c));close(dist(B,D)/dist(D,C),c/b);
 close(dist(A,D),Math.sqrt(b*c*((b+c)*(b+c)-a*a))/(b+c));
 const k=.2+3*rnd();close(area(t.map(v=>scale(v,k))),k*k*S);
 const x=.5+10*rnd(),y=.5+10*rnd(),right=[[0,0],[x,0],[0,y]],H=project(right[0],right[1],right[2]);
 const hyp=dist(right[1],right[2]),p1=dist(right[1],H),p2=dist(H,right[2]);close(norm(H)**2,p1*p2);close(x*x,hyp*p1);close(inradius(right),(x+y-hyp)/2);
 const u=.5+5*rnd(),v=.5+5*rnd(),phi=10+160*rnd(),pg=pgram(u,v,phi);close(area(pg),u*v*Math.sin(rad(phi)));close(dist(pg[0],pg[2])**2+dist(pg[1],pg[3])**2,2*(u*u+v*v));
 const s=.1+5*rnd(),t2=.1+5*rnd(),qd=[[u,0],circlePoint(s,rad(phi)),[-v,0],circlePoint(t2,rad(phi+180))];close(area(qd),(u+v)*(s+t2)*Math.sin(rad(phi))/2);
 chordWitness(u,v,s,u*v/s);close(secantTangent(u,u+v),Math.sqrt(u*(u+v)));
}
for(let n=3;n<=30;n++){const p=regular(n,3);close(interiorSum(p),(n-2)*180);same(diagonalCount(n),n*(n-3)/2);close(area(p),n*3*3*Math.sin(2*Math.PI/n)/2);}
// Strict arithmetic parser: no eval, distinguishes equivalent distractors numerically.
function numeric(s){s=s.replaceAll('^\\circ','').replace(/\\sqrt\{([^{}]+)\}/g,'sqrt($1)').replace(/\\sqrt(\d)/g,'sqrt($1)').replaceAll('\\pi','pi');const tokens=s.match(/sqrt|pi|\d+(?:\.\d+)?|[()+\-*/]/g)||[];assert.equal(tokens.join(''),s.replace(/\s/g,''),s);let pos=0;
 function atom(){if(tokens[pos]==='-'){pos++;return -atom();}if(tokens[pos]==='sqrt'){pos++;return Math.sqrt(atom());}if(tokens[pos]==='('){pos++;const n=sum();assert.equal(tokens[pos++],')');return n;}if(tokens[pos]==='pi'){pos++;return Math.PI;}const n=Number(tokens[pos++]);assert.ok(Number.isFinite(n),s);return n;}
 function product(){let n=atom();while(pos<tokens.length&&tokens[pos]!==')'&&tokens[pos]!=='+'&&tokens[pos]!=='-'){if(tokens[pos]==='/'){pos++;n/=atom();}else{if(tokens[pos]==='*')pos++;n*=atom();}}return n;}
 function sum(){let n=product();while(tokens[pos]==='+'||tokens[pos]==='-'){const t=tokens[pos++];const b=product();n+=t==='+'?b:-b;}return n;}const out=sum();assert.equal(pos,tokens.length);return out;
}
const quizExpected=[64,180-48,73,180-35-85,110-50,4,7,5*6/3,7*4,2*27,area([[0,0],[8,0],[1,3]]),area(sas(4,6,30)),area(triangle(5,12,13)),6,area(triangle(3,4,5)),area(triangle(2,2,2)),Math.hypot(5,12),3,6,9,inradius(triangle(3,4,5)),4,10,2,3,5,6,4,8,8,28,5,60,4,24,8,4,15,interiorSum(regular(6,1)),30,2,diagonalCount(6),8*Math.PI,9*Math.PI,10,2*Math.PI,2*Math.PI,inscribed(120),15,90,9,chordWitness(2,12,3,8),secantTangent(3,12),100,5];
same(quizExpected.length,data.formulas.length);
for(const [i,f] of data.formulas.entries()){same(f.examples.length,2);same(f.quiz.length,2);const q=f.quiz[0];same(q.type,'blank');const choices=[q.answer,...q.distractors].map(numeric);close(choices[0],quizExpected[i],f.slug);same(choices.filter(n=>Math.abs(n-quizExpected[i])<1e-8).length,1,`${f.slug} unique correct option`);for(let a=0;a<choices.length;a++)for(let b=a+1;b<choices.length;b++)ok(Math.abs(choices[a]-choices[b])>1e-8,`${f.slug} equivalent choices`);for(let j=0;j<2;j++)ok(covered.has(`${f.slug.slice(6)}:${j}`));}
same(covered.size,110);
console.log(`PASS: ${data.formulas.length} entries; ${covered.size} worked examples; 55 numeric blank quizzes with unique, pairwise nonequivalent choices; 200 seeded triangle/right-triangle/quadrilateral cases; 28 regular polygons; ${checks} assertions. All 55 true/false statements and theorem conditions also require mathematical review; samples are not proofs.`);
