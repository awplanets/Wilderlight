const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
const targetPoint=(x,z)=>{const r=Math.hypot(x,z),s=r>21.5?21.5/r:1;return {x:x*s,z:z*s}}
function swept(a,x,z,tx,tz,r){const dx=tx-x,dz=tz-z,t=clamp(((a.x-x)*dx+(a.z-z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(a.x-x-dx*t,a.z-z-dz*t)<r}
function warn(g,e,kind,{chain=0,quick=false}={}){
 const target=g.nearest(e,g.aliveHeroes());if(!target)return
 let point=targetPoint(target.x,target.z)
 e.face=Math.atan2(point.x-e.x,point.z-e.z)
 if(kind==='dash'){
  const length=Math.min(18,Math.max(8,distance(e,point)+3))
  point=targetPoint(e.x+Math.sin(e.face)*length,e.z+Math.cos(e.face)*length)
 }else if(kind!=='leap')point={x:e.x,z:e.z}
 const duration=quick?(kind==='leap'?.72:.48):kind==='execute'?1.25:kind==='leap'?1.05:kind==='sweep'?1.05:.9
 const r=kind==='dash'?1.6:kind==='execute'?6.2:kind==='sweep'?5.8:kind==='leap'?4:5.1
 e.attack={kind,chain,tracking:kind==='leap'&&e.faction!=='goblin'&&e.secondPhase,left:duration,duration,x:point.x,z:point.z,angle:e.face,spread:Math.PI*.78,r}
 e.moving=0;g.emit('boss-warning',{x:e.x,z:e.z,kind,radius:r})
}
function finish(g,e,a){
 e.action=null;e.jumpY=0;e.moving=0
 if((a.kind==='dash'||a.kind==='leap')&&a.chain>0){warn(g,e,a.kind,{chain:a.chain-1,quick:true});return}
 e.recovery=a.kind==='execute'?1.05:.7;e.cd=e.enraged?.8:1.25
}
export function tickBoss(g,e,dt){
 const officer=e.faction==='goblin',ratio=e.hp/e.maxHp
 if(officer&&ratio<=.3&&!e.enraged){
  e.enraged=true;e.attack=null;e.action=null;e.patternCursor=0;e.recovery=0;e.cd=0
  g.emit('boss-enrage',{x:e.x,z:e.z})
 }
 if(!officer&&ratio<=.5&&!e.secondPhase){
  e.secondPhase=true;e.enraged=true;e.attack=null;e.action=null;e.jumpY=0;e.patternCursor=0;e.recovery=0;e.cd=0
  g.emit('boss-enrage',{x:e.x,z:e.z})
 }
 // Keep the existing final 10% damage increase without interrupting the combo.
 if(!officer&&ratio<=.1)e.finalPhase=true
 // Multipliers are applied at impact, never compounded on the base stat.
 const damage=e.damage*(officer?(e.enraged?2:1):(e.finalPhase?1.5:1))
 e.cd-=dt
 if(e.action){
  const a=e.action;a.left=Math.max(0,a.left-dt);const t=1-a.left/a.duration
  if(a.kind==='dash'){
   const x=e.x,z=e.z;e.x=a.fromX+(a.x-a.fromX)*t;e.z=a.fromZ+(a.z-a.fromZ)*t;e.moving=22
   for(const h of g.aliveHeroes())if(!a.hit.has(h.id)&&swept(h,x,z,e.x,e.z,a.r)){a.hit.add(h.id);g.hurtHero(h,damage*(officer?1.05:1.1))}
  }else if(a.kind==='leap'){
   e.x=a.fromX+(a.x-a.fromX)*t;e.z=a.fromZ+(a.z-a.fromZ)*t;e.jumpY=Math.sin(Math.PI*t)*4.5;e.moving=0
   if(a.left===0){for(const h of g.aliveHeroes())if(distance(h,a)<a.r+.35)g.hurtHero(h,damage*1.4);g.emit('boss-land',{x:a.x,z:a.z,radius:a.r});g.emit('burst',{x:a.x,z:a.z,radius:a.r,kind:'shadow'})}
  }else if(a.kind==='spin'){
   const target=g.nearest(e,g.aliveHeroes());if(target)g.moveToward(e,target,e.secondPhase?6.3:4.2,dt)
   e.spinAngle=(e.spinAngle||0)+dt*Math.PI*4;a.pulse-=dt
   if(a.pulse<=0){a.pulse+=.45;for(const h of g.aliveHeroes())if(distance(h,e)<a.r+.35)g.hurtHero(h,damage*.6)}
  }else if(t>=.35&&!a.struck){
   a.struck=true
   for(const h of g.aliveHeroes()){
    const d=distance(e,h),dot=((h.x-e.x)*Math.sin(a.angle)+(h.z-e.z)*Math.cos(a.angle))/(d||1)
    if(d<a.r+.35&&(a.kind==='execute'||dot>Math.cos(a.spread/2)))g.hurtHero(h,damage*(a.kind==='execute'?1.6:1.25))
   }
   g.emit('officer-sweep',{x:e.x,z:e.z,angle:a.angle,radius:a.r,spread:a.kind==='execute'?Math.PI*2:a.spread})
  }
  if(a.left===0)finish(g,e,a)
  return
 }
 if(e.attack){
  // Track during the wind-up, then lock the displayed landing circle before
  // take-off. Each chained leap reacquires a target; no mid-air teleporting.
  if(e.attack.tracking&&e.attack.left>.25){
   const target=g.nearest(e,g.aliveHeroes())
   if(target){const point=targetPoint(target.x,target.z);e.attack.x=point.x;e.attack.z=point.z;e.face=Math.atan2(point.x-e.x,point.z-e.z)}
  }
  e.attack.left-=dt
  if(e.attack.left<=0){
   const a=e.attack;e.attack=null
   const duration=a.kind==='dash'?.58:a.kind==='leap'?.9:a.kind==='spin'?2.6:.7
   e.action={...a,fromX:e.x,fromZ:e.z,duration,left:duration,hit:new Set(),pulse:0,struck:false}
   e.attackSeq++;g.emit(['sweep','execute'].includes(a.kind)?'officer-windup':'boss-'+a.kind,{x:e.x,z:e.z,targetX:a.x,targetZ:a.z,radius:a.r})
  }
  return
 }
 if(e.recovery>0){e.recovery=Math.max(0,e.recovery-dt);return}
 const target=g.nearest(e,g.aliveHeroes());if(!target)return
 if(e.cd>0){if(distance(e,target)>4)g.moveToward(e,target,officer?2.8:2.2,dt);return}
 const order=officer?(e.enraged?['dash','execute']:['dash','sweep','sweep']):['dash','leap','spin']
 const kind=order[(e.patternCursor||0)%order.length]
 if(['sweep','execute'].includes(kind)&&distance(e,target)>(kind==='execute'?6.2:5.8)){g.moveToward(e,target,3.6,dt);return}
 e.patternCursor=(e.patternCursor||0)+1
 warn(g,e,kind,{chain:(kind==='dash'&&e.enraged||kind==='leap'&&!officer&&e.secondPhase)?2:0})
}
export function bossTelegraphs(enemies){
 const zones=[]
 for(const e of enemies){
  if(e.kind!=='boss'||e.hp<=0)continue
  const a=e.attack||e.action;if(!a)continue
  if(e.action&&a.kind==='dash')continue
  zones.push({id:'boss-'+e.id,kind:a.kind==='dash'?'lane':a.kind==='sweep'?'fan':a.kind==='spin'&&e.action?'spin':'circle',
   x:['dash','spin','sweep','execute'].includes(a.kind)?e.x:a.x,z:['dash','spin','sweep','execute'].includes(a.kind)?e.z:a.z,angle:a.angle||0,spread:a.spread||0,
   targetX:a.x,targetZ:a.z,r:a.r,progress:e.attack?1-a.left/a.duration:1,active:!!e.action})
 }
 return zones
}
