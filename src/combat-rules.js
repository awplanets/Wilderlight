import {P,MAX_BOON_RANK} from './progression.js'
export const WAVES=[
 {count:20,cap:14,batch:4,interval:2.8,hp:.82,damage:.82,speed:.96},
 {count:70,cap:24,batch:6,interval:1.55,hp:.94,damage:.94,speed:1.03},
 {count:120,cap:30,batch:8,interval:1.2,hp:1.06,damage:1.05,speed:1.10},
 {count:170,cap:36,batch:10,interval:1.05,hp:1.20,damage:1.16,speed:1.17},
 {count:220,cap:42,batch:12,interval:.95,hp:1.36,damage:1.28,speed:1.24},
 {count:1,cap:1,batch:0,interval:99,hp:1,damage:1,speed:1}
]
// Night doubles the approved chapter counts and combat stats; the boss remains one encounter.
export const CHAPTER_COUNT=2
export const CHAPTER_TRANSITION_SECONDS=6.5
export const CHAPTER_INTRO_SECONDS=3.6
export const BOSS_HEALTH=[7280,29120]
export function waveRules(stage,wave){
 const base=WAVES[wave-1]
 if(stage!==1)return {...base,hp:base.hp*.85,damage:base.damage*.75}
 const hp=[2.15,2.35,2.6,2.85,3.1,1.9][wave-1],damage=[1.22,1.3,1.4,1.5,1.62,1.4][wave-1]
 return {...base,count:wave===6?1:(base.count+10)*2,hp:base.hp*hp*2,damage:base.damage*damage*2,speed:base.speed*(wave===6?1:1.035)}
}
export const NIGHT_UPGRADE_KILLS=[24,90,170,260,360,470,590,720,860,1010,1170]
export const UPGRADE_KILLS=[12,40,80,125,175,230,290,355,425,500,580]
export const SKILL_BOONS=[
 {id:'whirlwind',title:'旋风斩击',tag:'洛恩 · 持续范围',text:'旋转挥剑，持续斩击身边敌人',icon:'sword',max:MAX_BOON_RANK},
 {id:'swordwave',title:'穿透剑气',tag:'洛恩 · 远程穿透',text:'挥出穿透剑气，升级增加扇形剑气',icon:'sword',max:MAX_BOON_RANK},
 {id:'firefield',title:'燎原火阵',tag:'伊芙 · 持续燃烧',text:'火球留下火焰阵，持续灼烧范围内敌人',icon:'flame',max:MAX_BOON_RANK},
 {id:'ricochet',title:'弹射箭矢',tag:'薇拉 · 多目标',text:'提高弹射次数、箭伤和伤害保留',icon:'arrow',max:MAX_BOON_RANK}
]
export const EXTRA_SKILLS={
 whirlwind:{owner:'warden',timer:'whirlCd'},swordwave:{owner:'warden',timer:'swordCd'},
 firefield:{owner:'mage',timer:'fieldCd'},ricochet:{owner:'ranger',timer:'cd'}
}
export function canLearnBoon(boons,id){
 const owner=EXTRA_SKILLS[id]?.owner
 return !owner||boons[id]>0||Object.keys(boons).filter(key=>boons[key]>0&&EXTRA_SKILLS[key]?.owner===owner).length<2
}
// Shared by the combat triggers and HUD; the HUD never runs its own timer.
export function heroSkillCooldown(id,rank){
 if(id==='whirlwind')return Math.max(4.2,6.4-Math.min(12,rank)*.18)
 if(id==='swordwave')return Math.max(2.5,4.5-Math.min(12,rank)*.16)
 if(id==='firefield')return Math.max(4.5,7.3-Math.min(12,rank)*.18)
 return 0
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
export function tickHeroSkills(g,h,dt){
 h.whirlCd=Math.max(0,(h.whirlCd||0)-dt)
 h.swordCd=Math.max(0,(h.swordCd||0)-dt)
 h.fieldCd=Math.max(0,(h.fieldCd||0)-dt)
 if(h.hp<=0){h.spinLeft=0;return}
 const rank=g.boons.whirlwind||0
 if(h.kind==='knight'&&rank&&h.whirlCd===0&&!h.spinLeft&&g.nearest(h,g.aliveEnemies(),P.whirlRadius(rank)+.9)){
  h.spinLeft=P.whirlDuration(rank);h.spinTotal=h.spinLeft;h.spinRadius=P.whirlRadius(rank)
  h.spinPulse=0;h.spinAngle=0;h.whirlCd=heroSkillCooldown('whirlwind',rank);h.attack=null;h.attackSeq++
  g.emit('whirlwind',{actor:h.id,x:h.x,z:h.z,radius:h.spinRadius,duration:h.spinTotal})
 }
 if(h.spinLeft>0){
  h.spinLeft=Math.max(0,h.spinLeft-dt);h.spinAngle=(h.spinAngle||0)+dt*Math.PI*4
  h.spinPulse-=dt
  if(h.spinPulse<=0){
   h.spinPulse+=.30
   const damage=h.baseDamage*P.attack(g.boons.edge)*P.whirlDamage(rank)
   for(const e of g.aliveEnemies())if((e.jumpY||0)<.8&&distance(h,e)<h.spinRadius+e.radius)g.hurtEnemy(e,damage,h,{knock:.12})
  }
 }
}

export function releaseSwordwave(g,h,target,damage){
 const rank=g.boons.swordwave||0
 if(!rank||h.swordCd>0)return
 const angle=Math.atan2(target.x-h.x,target.z-h.z)
 const count=P.swordCount(rank)
 for(let i=0;i<count;i++){
  const a=angle+(i-(count-1)/2)*.22
  g.shoot({owner:h.id,kind:'swordwave',x:h.x,z:h.z,target:{x:h.x+Math.sin(a)*14,z:h.z+Math.cos(a)*14},damage:damage*P.swordDamage(rank),pierce:P.swordPierce(rank),radius:.66+rank*.025,speed:15})
 }
 h.swordCd=heroSkillCooldown('swordwave',rank);g.emit('swordwave',{actor:h.id,x:h.x,z:h.z,angle})
}

export function leaveFirefield(g,p){
 if(!p.fieldRank)return
 const field={id:++g.serial,x:p.x,z:p.z,r:P.fieldRadius(p.fieldRank),left:P.fieldDuration(p.fieldRank),total:P.fieldDuration(p.fieldRank),pulse:0,damage:p.damage*P.fieldDamage(p.fieldRank),owner:p.owner}
 g.fields.push(field)
 if(g.fields.length>4)g.fields.shift()
 g.emit('firefield',{actor:p.owner,x:p.x,z:p.z,radius:field.r})
}

// One burn per target. A new fireball refreshes its duration without delaying
// the next tick or stacking an unbounded number of timers/effects.
export function igniteEnemy(g,e,p){
 if(e.hp<=0||e.spawn>0)return
 const rank=g.boons.inferno||0,mage=g.heroes.find(h=>h.id===p.owner)
 const attack=p.burnAttack??(mage?mage.baseDamage*P.attack(g.boons.edge):p.damage/P.fireDamage(rank))
 const damage=P.burnFlat(rank)+attack*P.burnAttack(rank)
 if(!(e.burnLeft>0)){e.burnPulse=P.burnInterval();e.burnDamage=damage}
 else e.burnDamage=Math.max(e.burnDamage,damage)
 e.burnLeft=P.burnDuration();e.burnSource=p.source
}
export function tickBurn(g,e,dt){
 if(!(e.burnLeft>0)||e.hp<=0)return
 const elapsed=Math.min(dt,e.burnLeft)
 e.burnLeft=Math.max(0,e.burnLeft-elapsed);e.burnPulse-=elapsed
 while(e.burnPulse<=1e-8&&e.hp>0){
  e.burnPulse+=P.burnInterval()
  g.hurtEnemy(e,e.burnDamage,e.burnSource,{damageKind:'burn'})
 }
 if(e.burnLeft<=1e-8){e.burnLeft=0;e.burnSource=null}
}

export function tickFields(g,dt){
 for(const f of g.fields){
  f.left-=dt;f.pulse-=dt
  if(f.pulse<=0){f.pulse+=.5;for(const e of g.aliveEnemies())if((e.jumpY||0)<.6&&distance(e,f)<f.r+e.radius)g.hurtEnemy(e,f.damage,f)}
 }
 g.fields=g.fields.filter(f=>f.left>0)
}

export function ricochet(g,p,hit){
 if(p.kind!=='bolt'||!(p.bounces>0))return false
 const target=g.nearest(hit,g.aliveEnemies().filter(e=>!p.hit.has(e.id)&&(e.jumpY||0)<1),7)
 if(!target)return false
 const speed=Math.hypot(p.vx,p.vz),d=distance(target,p)||1
 p.vx=(target.x-p.x)/d*speed;p.vz=(target.z-p.z)/d*speed;p.damage*=p.retention||.84;p.bounces--
 p.life=Math.max(.7,p.life)
 g.emit('ricochet',{x:p.x,z:p.z,targetX:target.x,targetZ:target.z})
 return true
}

export {tickBoss,bossTelegraphs} from './boss-rules.js'
