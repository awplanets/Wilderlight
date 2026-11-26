import {names,packed} from './skill-art-data.js';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function decode(){
 let at=0;
 const u=()=>{let n=0,s=0,b;do{b=alphabet.indexOf(packed[at++]);if(b<0)throw Error('Icon data');n|=(b&31)<<s;s+=5;}while(b&32);return n;};
 const z=()=>{const n=u();return(n>>>1)^-(n&1);};
 const parts={};
 for(const name of names){
  const colors=Array.from({length:u()},()=>[0,0,0]);
  for(let ch=0;ch<3;ch++){let last=0;for(const c of colors)c[ch]=last+=z();}
  const vertices=Array.from({length:u()},()=>[0,0]);
  for(let ch=0;ch<2;ch++){let last=0;for(const v of vertices)v[ch]=last+=z();}
  const rows=Array.from({length:u()},()=>[u(),0,0,0]);
  for(let k=1;k<4;k++){let last=0;for(const f of rows)f[k]=last+=z();}
  const gradients=rows.filter(f=>f[0]&3);
  for(const f of gradients)f[4]=(f[0]>>>2)+z();
  for(let ch=0;ch<2;ch++)for(const f of gradients)f[5+ch]=z();
  parts[name]={palette:colors.map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('')),faces:rows.map(f=>{
   const face=[f[0]>>>2,...vertices[f[1]].map(v=>v/4),...vertices[f[2]].map(v=>v/4),...vertices[f[3]].map(v=>v/4)];
   if(f[0]&3){const start=vertices[f[f[0]&3]];face.push(start[0]/4,start[1]/4,(start[0]+f[5])/4,(start[1]+f[6])/4,f[4]);}
   return face;
  })};
 }
 if(at!==packed.length)throw Error('Icon remainder');
 return parts;
}
