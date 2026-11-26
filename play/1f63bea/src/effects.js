import {createAdvancedEffects} from './advanced-effects.js';
import {createCelFlame} from './cel-flame.js';
import {createEffectPool} from './effect-pool.js';
import {createBurnEffects} from './burn-effects.js';
// The original terrain renderer is flattened onto the portrait arena.
export function createEffects(THREE, scene, assets, {heightAt=()=>0,displaySpace=false}={}) {
const MAX=650;
class Effects{
 constructor(scene,shared,assets){
  this.scene=scene;this.assets=assets;this.particles=[];this.projectiles=new Map();this.rings=new Map();this.pickups=new Map();this.warnings=new Map();this.transients=[];this.popups=[];
  this.advanced=createAdvancedEffects(THREE,scene,{heightAt,displaySpace});
  this.burning=createBurnEffects(THREE,scene,{heightAt,displaySpace});
  this.swordGeo=new THREE.RingGeometry(.75,1,32,1,-1,2);this.swordGeo.rotateX(-Math.PI/2);this.swordMat=new THREE.MeshBasicMaterial({color:0xffe4a5,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
  this.pool=createEffectPool();this.slashGeometries=new Map();this.arrowAxis=new THREE.Vector3(0,-1,0);this.arrowDirection=new THREE.Vector3();
  this.time=0;this.flameBursts=[];this.fireTemplate=createCelFlame(THREE,{displaySpace,animated:true});
  this.sparkMatrix=new THREE.Matrix4();this.sparkPosition=new THREE.Vector3();this.sparkScale=new THREE.Vector3();this.sparkRotation=new THREE.Quaternion();
  this.dabs=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false}),MAX);
  this.dabs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.dabs.frustumCulled=false;this.dabs.count=0;scene.add(this.dabs);
  this.sparkColor=new THREE.Color();this.fireDirection=new THREE.Vector3();
  this.arrowGeo=null;this.arrowMat=new THREE.MeshBasicMaterial({color:0xf4deb3});
  this.orbGeo=new THREE.IcosahedronGeometry(.16,1);this.fireMat=new THREE.MeshBasicMaterial({color:0xffbd67});this.shadowMat=new THREE.MeshBasicMaterial({color:0xd06d83});
  this.ringGeo=new THREE.RingGeometry(.9,1,72);this.ringGeo.rotateX(-Math.PI/2);
  this.lineGeo=new THREE.CylinderGeometry(.025,.035,1,5);
  this.pickupGeo=new THREE.OctahedronGeometry(.18);this.pickupMat=new THREE.MeshBasicMaterial({color:0xf9d78a});
  this.warningGeo=new THREE.RingGeometry(.32,1,28,1,-.85,1.7);this.warningGeo.rotateX(-Math.PI/2);
 }
 burst(x,z,color,n=14,size=.12){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=1+Math.random()*3;this.particles.push({x,y:heightAt(x,z)+.9,z,vx:Math.cos(a)*s,vy:1+Math.random()*2.8,vz:Math.sin(a)*s,life:.45+Math.random()*.35,total:.8,size,color,seed:Math.random()*999});}if(this.particles.length>MAX)this.particles.splice(0,this.particles.length-MAX);}
 prewarm(draw){this.burning.prewarm(draw)}
 ring(x,z,r,color,life=.45){const m=this.pool.acquire('ring',()=>new THREE.Mesh(this.ringGeo,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide})),m=>m.material.dispose());m.material.color.setHex(color);m.material.opacity=.8;m.position.set(x,heightAt(x,z)+.12,z);m.scale.set(r,r,r);this.scene.add(m);this.transients.push({m,life,total:life,expand:true});}
 onEvent(e){
  if(e.type==='hit'){this.burst(e.x,e.z,[.94,.79,.48],5,.055);this.popups.push({x:e.x,z:e.z,y:2,life:.7,amount:Math.round(e.amount),color:'#fff0bf'});}
  if(e.type==='hurt'){this.burst(e.x,e.z,[.76,.24,.2],8,.085);this.popups.push({x:e.x,z:e.z,y:2,life:.7,amount:'−'+Math.round(e.amount),color:'#ffb7a1'});}
  if(e.type==='kill'){this.burst(e.x,e.z,[.7,.58,.38],12,.12);}
  if(e.type==='burst'){
   if(e.kind==='fire'){
    const root=this.pool.acquire('fire-burst',()=>{const root=new THREE.Group();for(let i=0;i<5;i++){const flame=this.fireTemplate.clone();flame.userData.phase=i*1.3;root.add(flame)}return root});root.position.set(e.x,heightAt(e.x,e.z)+.15,e.z);
    this.scene.add(root);this.flameBursts.push({root,life:.62,total:.62,radius:e.radius});
    if(this.flameBursts.length>12){this.pool.release(this.flameBursts.shift().root);}
    this.burst(e.x,e.z,[1,.71,.32],20,.075);this.ring(e.x,e.z,e.radius,0xf8d08b,.32);
   }else{this.burst(e.x,e.z,[.7,.28,.4],22,.12);this.ring(e.x,e.z,e.radius,0xc55e68);}
  }
  if(e.type==='slash'||e.type==='enemy-slash'||e.type==='officer-sweep'){
   const spread=e.spread||1.6;let g=this.slashGeometries.get(spread);if(!g){g=new THREE.RingGeometry(.7,1,32,1,-spread/2,spread);g.rotateX(-Math.PI/2);this.slashGeometries.set(spread,g)}const m=this.pool.acquire('slash-'+spread,()=>new THREE.Mesh(g,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide})),m=>m.material.dispose());m.material.color.setHex(e.type==='slash'?0xffe8a6:0xd67962);m.material.opacity=.8;m.scale.setScalar(e.radius);m.position.set(e.x,heightAt(e.x,e.z)+.7,e.z);m.rotation.y=e.angle-Math.PI/2;this.scene.add(m);this.transients.push({m,life:.18,total:.18});
  }
  if(['boss-summon','boss-phase','boss-enrage'].includes(e.type)){this.ring(e.x,e.z,e.type==='boss-summon'?1.2:3,e.type==='boss-enrage'?0xe84430:0x9c81d1,.8);this.burst(e.x,e.z,e.type==='boss-enrage'?[1,.25,.1]:[.6,.45,.85],16,.09);}
  if(['dash','heal','shrine','counter'].includes(e.type)){this.ring(e.x,e.z,e.type==='shrine'?2.4:1.4,e.type==='dash'?0xc4e7e2:0xe9ce85,.6);this.burst(e.x,e.z,[.78,.82,.6],15,.09);}
  if(e.type==='chain'||e.type==='ricochet'){
   const m=this.pool.acquire('chain',()=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3).setUsage(THREE.DynamicDrawUsage));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffe2a3,transparent:true}));line.frustumCulled=false;return line},m=>{m.geometry.dispose();m.material.dispose()});const ay=heightAt(e.x,e.z)+1.2,by=heightAt(e.targetX,e.targetZ)+1.2,a=m.geometry.attributes.position;a.setXYZ(0,e.x,ay,e.z);a.setXYZ(1,e.x+(e.targetX-e.x)*.4+.3,ay+(by-ay)*.4+.4,e.z+(e.targetZ-e.z)*.4+.1);a.setXYZ(2,e.targetX,by,e.targetZ);a.needsUpdate=true;m.material.opacity=1;this.scene.add(m);this.transients.push({m,life:.2,total:.2});
  }
 }
 update(dt,game,camera){
  this.advanced.update(dt,game,camera);
  this.burning.update(game,camera);
  this.time+=dt;this.fireTemplate.userData.flameClock.value=this.time;
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=5*dt;}
  this.particles=this.particles.filter(p=>p.life>0);
  const count=Math.min(MAX,this.particles.length);this.dabs.count=count;
  for(let i=0;i<count;i++){const p=this.particles[i],fade=Math.min(1,p.life*5);
   this.sparkPosition.set(p.x,p.y,p.z);this.sparkScale.set(p.size*.5*fade,p.size*1.8*fade,p.size*.5*fade);
   this.sparkMatrix.compose(this.sparkPosition,this.sparkRotation,this.sparkScale);this.dabs.setMatrixAt(i,this.sparkMatrix);
   this.dabs.setColorAt(i,this.sparkColor.setRGB(...p.color));
  }
  this.dabs.instanceMatrix.needsUpdate=true;if(this.dabs.instanceColor)this.dabs.instanceColor.needsUpdate=true;
  for(const f of this.flameBursts){f.life-=dt;const t=1-f.life/f.total;
   f.root.children.forEach((m,i)=>{const a=i/5*Math.PI*2,spread=f.radius*.5*Math.sin(t*Math.PI*.65);m.position.set(Math.cos(a)*spread,t*.25,Math.sin(a)*spread);m.quaternion.copy(camera.quaternion);m.rotation.z+=(i-2)*.15;
    const swell=Math.sin(Math.min(1,t*1.8)*Math.PI*.5)*Math.pow(Math.max(0,1-t),.65);m.scale.setScalar((i===0?1:.62)*Math.min(1.5,f.radius*.58)*swell);});
  }
  this.flameBursts=this.flameBursts.filter(f=>{if(f.life<=0){this.pool.release(f.root);return false;}return true;});
  const ids=new Set();
  for(const p of game.projectiles){ids.add(p.id);let m=this.projectiles.get(p.id);if(!m){
   if(p.kind==='bolt'||p.kind==='enemy-arrow'){m=this.pool.acquire('arrow',()=>{const root=this.assets.arrow.scene.clone(true);root.scale.setScalar(1.25);root.traverse(o=>{if(o.isMesh)o.material=this.arrowMat;});return root});}
   else if(p.kind==='swordwave'){m=this.pool.acquire('swordwave',()=>new THREE.Mesh(this.swordGeo,this.swordMat));m.scale.setScalar(1.65);}
   else if(p.kind==='fire'){m=this.pool.acquire('fire',()=>this.fireTemplate.clone());m.scale.set(.46,.62,.46);m.userData.emit=0;}
   else m=this.pool.acquire('shadow',()=>new THREE.Mesh(this.orbGeo,this.shadowMat));
   this.scene.add(m);this.projectiles.set(p.id,m);
  }m.position.set(p.x,heightAt(p.x,p.z)+1.18,p.z);if(p.kind==='bolt'||p.kind==='enemy-arrow')m.quaternion.setFromUnitVectors(this.arrowAxis,this.arrowDirection.set(p.vx,0,p.vz).normalize());
   if(p.kind==='swordwave')m.rotation.y=Math.atan2(p.vx,p.vz)-Math.PI/2;
   if(p.kind==='fire'){
    m.quaternion.copy(camera.quaternion);this.fireDirection.set(p.vx,0,p.vz).transformDirection(camera.matrixWorldInverse);
    m.rotateZ(Math.atan2(this.fireDirection.y,this.fireDirection.x)+Math.PI/2);
    m.userData.emit+=dt;
    if(m.userData.emit>=.025){m.userData.emit%=.025;this.particles.push({x:p.x-p.vx*.016,y:m.position.y,z:p.z-p.vz*.016,vx:-p.vx*.04,vy:.4,vz:-p.vz*.04,life:.28,total:.28,size:.1,color:[1,.65,.26],seed:p.id});}
   }

  }
  for(const [id,m]of this.projectiles)if(!ids.has(id)){this.pool.release(m);this.projectiles.delete(id);}
  const hids=new Set();
  for(const h of game.hazards){hids.add(h.id);let m=this.rings.get(h.id);if(!m){m=this.pool.acquire('hazard',()=>new THREE.Mesh(this.ringGeo,new THREE.MeshBasicMaterial({color:0xc95e57,transparent:true,depthWrite:false,side:THREE.DoubleSide})),m=>m.material.dispose());this.scene.add(m);this.rings.set(h.id,m);}m.position.set(h.x,heightAt(h.x,h.z)+.13,h.z);m.scale.setScalar(h.r);m.material.opacity=.45+.4*Math.sin((1-h.left)*12)**2;}
  for(const [id,m]of this.rings)if(!hids.has(id)){this.pool.release(m);this.rings.delete(id);}
  const pids=new Set();
  for(const p of game.pickups){pids.add(p.id);let m=this.pickups.get(p.id);if(!m){m=this.pool.acquire('pickup',()=>new THREE.Mesh(this.pickupGeo,this.pickupMat));this.pickups.set(p.id,m);this.scene.add(m);}m.position.set(p.x,heightAt(p.x,p.z)+.45+Math.sin(game.time*3+p.id)*.08,p.z);m.rotation.y=game.time;const s=p.life<3?.65+.35*Math.sin(game.time*10):1;m.scale.setScalar(s);}
  for(const [id,m] of this.pickups)if(!pids.has(id)){this.pool.release(m);this.pickups.delete(id);}
  const wids=new Set();
  for(const e of game.enemies){if(!e.attack||e.hp<=0||e.kind==='mage'||e.kind==='boss')continue;wids.add(e.id);let m=this.warnings.get(e.id);if(!m){m=this.pool.acquire('warning',()=>new THREE.Mesh(this.warningGeo,new THREE.MeshBasicMaterial({color:0xcd7053,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide})),m=>m.material.dispose());this.scene.add(m);this.warnings.set(e.id,m);}m.position.set(e.x,heightAt(e.x,e.z)+.08,e.z);m.rotation.y=e.face-Math.PI/2;m.scale.setScalar(e.kind==='warrior'?2.4:1.9);m.material.opacity=.18+(1-e.attack.left/(e.kind==='warrior'?.9:.62))*.32;}
  for(const [id,m] of this.warnings)if(!wids.has(id)){this.pool.release(m);this.warnings.delete(id);}
  for(const fx of this.transients){fx.life-=dt;fx.m.material.opacity=Math.max(0,fx.life/fx.total)*.8;if(fx.expand)fx.m.scale.multiplyScalar(1+dt*.8);}
  this.transients=this.transients.filter(fx=>{if(fx.life<=0){this.pool.release(fx.m);return false;}return true;});
  for(const p of this.popups){p.life-=dt;p.y+=dt*.7;}this.popups=this.popups.filter(p=>p.life>0).slice(-28);
 }
 clear(){this.advanced.clear();this.burning.clear();for(const f of this.flameBursts)this.pool.release(f.root);this.flameBursts=[];this.dabs.count=0;this.particles=[];this.popups=[];for(const m of this.pickups.values())this.pool.release(m);this.pickups.clear();for(const m of this.warnings.values())this.pool.release(m);this.warnings.clear();for(const m of this.projectiles.values())this.pool.release(m);this.projectiles.clear();for(const m of this.rings.values())this.pool.release(m);this.rings.clear();for(const f of this.transients)this.pool.release(f.m);this.transients=[];}

 dispose(){
  this.clear();this.pool.dispose();for(const geo of this.slashGeometries.values())geo.dispose();this.slashGeometries.clear();this.advanced.dispose();this.burning.dispose();this.swordGeo.dispose();this.swordMat.dispose();
  this.scene.remove(this.dabs);
  this.dabs.geometry.dispose();this.dabs.material.dispose();
  this.fireTemplate.userData.dispose();
  for(const resource of [this.arrowMat,this.orbGeo,this.fireMat,this.shadowMat,this.ringGeo,this.lineGeo,this.pickupGeo,this.pickupMat,this.warningGeo])resource.dispose();
 }
}
return new Effects(scene, null, assets);
}
