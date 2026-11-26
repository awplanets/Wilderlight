import {recipes} from './skill-art-data.js';
import {decode} from './skill-art-decode.js';
let parts;
const pathCache=new Map(),silver=['#f6f3d9','#a5c8be','#4a7f78'],fire=['#fff0a8','#ed9540','#9d422b'],green=['#e2ffc7','#83c58d','#37765e'];
function path(c,d,fill,stroke,w=1){
 let ops=pathCache.get(d);
 if(!ops){const t=d.match(/[MLCQZ]|-?(?:\d*\.)?\d+/g)||[];ops=[];for(let i=0;i<t.length;){const op=t[i++],n={M:2,L:2,C:6,Q:4,Z:0}[op];ops.push([op,t.slice(i,i+n).map(Number)]);i+=n;}pathCache.set(d,ops);}
 c.beginPath();for(const [op,a]of ops){if(op==='M')c.moveTo(...a);else if(op==='L')c.lineTo(...a);else if(op==='C')c.bezierCurveTo(...a);else if(op==='Q')c.quadraticCurveTo(...a);else c.closePath();}
 if(fill&&fill!=='none'){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin='round';c.stroke();}
}
function poly(c,pts,color){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function line(c,a,b,color,w){c.beginPath();c.moveTo(...a);c.lineTo(...b);c.strokeStyle=color;c.lineWidth=w;c.stroke();}
function group(c,x,y,s,rot,draw){c.save();c.translate(x,y);c.scale(s,s);if(rot){c.translate(128,128);c.rotate(rot*Math.PI/180);c.translate(-128,-128);}draw();c.restore();}
function mesh(c,key){
 const a=parts[key];c.lineWidth=.5;c.lineJoin='round';
 for(const f of a.faces){let col=a.palette[f[0]];if(f.length>7){const g=c.createLinearGradient(f[7],f[8],f[9],f[10]);g.addColorStop(0,col);g.addColorStop(1,a.palette[f[11]]);col=g;}
  c.beginPath();c.moveTo(f[1],f[2]);c.lineTo(f[3],f[4]);c.lineTo(f[5],f[6]);c.closePath();c.fillStyle=col;c.strokeStyle=col;c.fill();c.stroke();
 }
}
function ring(c,cx,cy,rx,ry,start,end,width,colors,field=false){
 const n=Math.max(field?4:6,Math.floor(Math.abs(end-start)/(field?9:7)));
 const pt=(a,r)=>[cx+(rx-r)*Math.cos(a),cy+(ry-r*(field?.55:.6))*Math.sin(a)];
 for(let i=0;i<n;i++){
  const a=(start+(end-start)*i/n)*Math.PI/180,b=(start+(end-start)*(i+1)/n)*Math.PI/180,p=pt(a,0),q=pt(b,0);
  poly(c,[p,[p[0],p[1]+(field?7:6)],[q[0],q[1]+(field?7:6)],q],colors[2]);poly(c,[p,q,pt(b,width),pt(a,width)],colors[1]);line(c,p,q,colors[0],field?1.8:2);
 }
}
function ribbon(c,ps,w,colors,taper=false){
 for(let i=0;i<ps.length-1;i++){
  const a=ps[i],b=ps[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*w/2,ny=dx/l*w/2,k=taper&&i===ps.length-2?.12:1;
  const p=[[a[0]+nx,a[1]+ny],[b[0]+nx*k,b[1]+ny*k],[b[0]-nx*k,b[1]-ny*k],[a[0]-nx,a[1]-ny]];
  poly(c,p.map(([x,y])=>[x+3,y+5]),colors[2]);poly(c,p,colors[1]);line(c,a,b,colors[0],2.5);
 }
}
function leaf(c){
 const p=(x,y,z=0)=>[80+.58*y+.82*x,214-.85*y+.56*x-.75*z],v=[0,25,55,88,122,156,195].map((y,i)=>{const h=Math.sin(Math.PI*y/195),w=[0,19,32,38,34,23,0][i];return [[-10*h-w,y,7*h],[-10*h,y,21*h],[-10*h+w,y,7*h]]});
 const face=(a,col)=>poly(c,a.map(q=>p(...q)),col);
 face([...v.map(a=>a[0]),...v.slice(0,-1).reverse().map(a=>a[2])].map(([x,y,z])=>[x,y,z-5]),'#426b52');
 for(const side of[0,2])for(let i=0;i<6;i++){const a=v[i][side],b=v[i+1][side];face([a,b,[b[0],b[1],b[2]-5],[a[0],a[1],a[2]-5]],side===2?'#456b4c':'#709a70');}
 const colors=[['#b6ce8e','#a9c28b','#b7d39e','#c5dfaf','#cde4b7','#dbeac2'],['#678e6e','#6d987a','#739f82','#7daa8c','#8bb593','#a2c49c']];
 for(let i=0;i<6;i++)for(const s of[0,2])face([v[i][s],v[i+1][s],v[i+1][1],v[i][1]],colors[s/2][i]);
 face([[-3,-25,1],[3,-25,1],[3,23,6],[-3,23,6]],'#9e864b');face([[-3,-25,3],[0,-27,6],[1,23,8],[-3,23,6]],'#e3d299');
 const rib=(a,b,w,col,h)=>{const [x,y]=p(a[0],a[1],a[2]+h),[u,t]=p(b[0],b[1],b[2]+h),l=Math.hypot(u-x,t-y),nx=-(t-y)/l*w/2,ny=(u-x)/l*w/2;poly(c,[[x+nx,y+ny],[u+nx*.3,t+ny*.3],[u-nx*.3,t-ny*.3],[x-nx,y-ny]],col);};
 for(let i=1;i<6;i++)for(const s of[0,2])rib(v[i][1],v[i][1].map((x,j)=>x*.1+v[i+1][s][j]*.9),2.9,s===0?'#dce4b5':'#c1d5a4',1.4);
 for(let i=0;i<6;i++)rib(v[i][1],v[i+1][1],i<4?4:2.7,'#e6dba7',1.8);
 for(const a of [[[16,133],[55,122],[52,129],[23,137]],[[9,164],[47,153],[44,161],[16,168]],[[24,190],[54,180],[51,187],[31,194]]])poly(c,a,'#a9be8d');
}
function fx(c,k,o={},tone='dark'){
 if(k==='leaf')return leaf(c);
 if(k==='whirlBlades'){
  const blade='M63 93 C53 43 130 17 183 36 C211 46 227 65 237 85 C183 50 120 63 99 127 C81 118 69 107 63 93 Z';
  for(const a of[0,120,240])group(c,0,0,1,a,()=>{group(c,3,5,1,0,()=>path(c,blade,'#436f65'));path(c,blade,'#9ec6b7');path(c,'M72 94 C78 45 162 32 205 67 C147 44 103 76 99 127 C86 115 78 107 72 94 Z','#eef0d6');path(c,'M24 99 C27 51 62 19 103 13 C66 26 40 54 24 99 Z','#c8b76d');});return;
 }
 if(k==='flame')return group(c,o.x||0,o.y||0,o.s||1,o.rot||0,()=>{
  const d='M-.36 -.45 C-.73 -.12 -.52 .34 -.4 .7 C-.39 .36 -.15 .28 -.17 .5 C-.3 .91 .3 1.05 .19 1.52 C.67 1.02 .22 .66 .32 .46 C.46 .49 .56 .68 .55 .84 C.91 .32 .65 -.24 .34 -.47 C.15 -.64 -.16 -.62 -.36 -.45 Z';
  [[1,'#d95343','#833128','#f27650'],[.72,'#f69a4c','#af592c','#ffbe70'],[.4,'#ffe9a3','#d9a449','#fff3c9']].forEach(([s,base,side,rim],i)=>{
   const x=118-i*4,y=183+i*9;
   c.save();c.translate(x+8,y+5);c.transform(89*s,5,-12,-89*s,0,0);path(c,d,side,side,.045);c.restore();
   c.save();c.translate(x,y);c.transform(89*s,5,-12,-89*s,0,0);path(c,d,base,rim,.025);c.restore();
  });
 });
 if(k==='speed'){for(const[x,y,w]of [[15,80,78],[6,119,90],[18,158,66]])poly(c,[[x,y+6],[x+w,y],[x+w-10,y+10],[x+12,y+11]],tone==='light'?'#6f9279':'#d6e5bc');return;}
 if(k==='waves'){
  for(const[x,y,s]of [[66,103,.52],[111,63,.69],[161,11,.82]])group(c,x,y,s,0,()=>{
   const d='M0 0 C95 41 99 130 0 208 C47 124 53 68 0 0 Z';
   group(c,5,6,1,0,()=>path(c,d,'#416b67'));
   const g=c.createLinearGradient(0,0,72.780921,.7*208);g.addColorStop(0,'#d6e4c6');g.addColorStop(.6,'#a4ccc0');g.addColorStop(1,'#53857b');path(c,d,g);
   path(c,'M0 0 C79 46 86 128 0 208 C68 120 62 61 0 0 Z','#e5efce');
  });return;
 }
 if(k==='fireRingBack'||k==='fireRingFront'){const back=k==='fireRingBack';return ring(c,128,183,107,44,back?-180:0,back?0:180,15,fire,true);}
 if(k==='bolt')return group(c,o.x||0,o.y||0,o.s||1,0,()=>mesh(c,'arrow'));
 if(k==='ricochet'){
  ribbon(c,[[34,220],[80,81],[167,172],[218,35]],11,['#edf0ce','#98bd9c','#496f60'],true);
  for(const[x,y]of [[80,81],[167,172]]){
   const p=[[0,-18],[5,-5],[17,0],[5,5],[0,18],[-5,5],[-17,0],[-5,-5]].map(([u,v])=>[x+u*.9,y+v*.9]);
   poly(c,p.map(([u,v])=>[u+2.7,v+3.6]),'#7c6540');poly(c,p,'#fff0b7');poly(c,[p[0],p[1],[x,y+1.8],p[7]],'#fff8db');
  }return;
 }
 if(k==='pierceBack'||k==='pierceFront'){const back=k==='pierceBack';ring(c,91,174,47,20,back?-180:0,back?0:180,7,silver);ring(c,159,80,44,19,back?-180:0,back?0:180,7,silver);return;}
 if(k==='cleave')return ring(c,128,128,114,106,-160,37,23,silver);
 if(k==='burst')return group(c,8,8,.94,0,()=>{
  const d='M128 17 C133 49 152 63 165 69 C186 61 197 47 204 35 C199 65 196 85 191 98 C208 108 225 113 242 112 C224 131 204 142 190 147 C199 167 207 184 220 198 C191 191 173 183 158 181 C149 200 139 219 127 238 C127 209 116 191 105 180 C86 190 65 201 42 208 C59 188 63 168 67 153 C46 147 26 135 13 124 C43 126 61 110 70 99 C61 78 52 63 40 48 C68 56 88 64 99 75 C115 59 124 38 128 17 Z';
  group(c,5,8,1,0,()=>path(c,d,'#843729'));path(c,d,'#db5d38');
  for(const[s,x,y,col]of [[.89,128,130,'#f39242'],[.74,125,125,'#ffc46a'],[.52,122,122,'#ffe7a2']]){
   c.save();c.translate(x,y);c.scale(s,s);c.translate(-128,-130);path(c,d,col);c.restore();
  }
  path(c,'M104 104 C117 99 130 106 141 113 C153 123 159 134 157 146 C138 140 131 145 121 158 C121 140 109 131 96 129 C107 120 109 111 104 104 Z','#fff6d3');
 });
 if(k==='chainLink')return ribbon(c,[[45,214],[114,169],[179,112]],14,['#ffeeb5','#e4ad50','#985c29']);
 if(k==='shieldSpikes'){
  for(const[x,y,s]of [[94,104,1],[153,105,1],[126,160,1.12]])group(c,x,y,s,0,()=>{
   c.save();c.translate(3,6);c.scale(18,10);c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fillStyle='#4c3c2d';c.fill();c.restore();
   poly(c,[[-17,0],[-7,-11],[10,-9],[18,3],[6,13],[-10,11]],'#63737a');
   poly(c,[[-17,0],[-7,-11],[10,-9],[3,-43]],'#d4dfdc');
   poly(c,[[-17,0],[3,-43],[6,13],[-10,11]],'#a5b4b6');
   poly(c,[[3,-43],[10,-9],[18,3],[6,13]],'#71858d');
  });return;
 }
 if(k==='plus')return group(c,o.x,o.y,o.s||1,0,()=>{
  const d='M18 0 L42 0 L42 18 L60 18 L60 42 L42 42 L42 60 L18 60 L18 42 L0 42 L0 18 L18 18 Z';
  group(c,4,6,1,0,()=>path(c,d,'#3f7863'));path(c,d,'#ecf2cf');path(c,'M18 0 L42 0 L42 8 L18 8 Z','#ffffff');
 });
 if(k==='healOrbit'){ring(c,128,128,106,100,-164,155,15,green);poly(c,[[25,114],[12,150],[50,143]],'#d9efb6');poly(c,[[219,153],[246,119],[207,121]],'#82b498');return;}
 throw Error('Icon effect: '+k);
}
export const SKILL_ICON_IDS=Object.keys(recipes);
export function drawSkillIcon(c,id,size,tone='dark'){
 if(!parts)parts=decode();
 const recipe=recipes[id];if(!recipe)return;
 c.clearRect(0,0,size,size);c.save();c.scale(size/256,size/256);c.lineCap='butt';c.lineJoin='round';
 for(const r of recipe)if(r.part)group(c,r.x,r.y,r.s,r.rot,()=>mesh(c,r.part));else fx(c,r.effect,r,tone);
 c.restore();
}
