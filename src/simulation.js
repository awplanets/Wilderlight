import {P,MAX_BOON_RANK,nextBoonRank} from './progression.js';
import { seededRandom } from './core.js';
import {WAVES,UPGRADE_KILLS,NIGHT_UPGRADE_KILLS,CHAPTER_TRANSITION_SECONDS,CHAPTER_INTRO_SECONDS,BOSS_HEALTH,waveRules,SKILL_BOONS,canLearnBoon,heroSkillCooldown,tickHeroSkills,releaseSwordwave,leaveFirefield,igniteEnemy,tickBurn,tickFields,ricochet,tickBoss,bossTelegraphs} from './combat-rules.js';
export {WAVES} from './combat-rules.js';
export const waveLabel=n=>'第'+['一','二','三','四','五','六'][n-1]+'波';
export const ARENA_RADIUS=23;
export const PARTY_RUN_SPEED=5.1;
export const HEROES=[
 {id:'warden',kind:'knight',name:'洛恩',role:'守卫',color:'#e8c481',maxHp:220,damage:23,range:3.7,interval:.95,speed:5.3},
 {id:'ranger',kind:'ranger',name:'薇拉',role:'游侠',color:'#83c4ba',maxHp:145,damage:19,range:13.5,interval:1.03,speed:5.6},
 {id:'mage',kind:'mage',name:'伊芙',role:'余烬法师',color:'#df9278',maxHp:135,damage:27,range:11.8,interval:1.65,speed:5.5}
];
export const CHAPTERS=Array.from({length:6},(_,i)=>[waveLabel(i+1),'']);
export const BOONS=[
 {id:'edge',title:'攻击',tag:'全队 · 强攻',text:'提高全队攻击伤害',icon:'sword',max:MAX_BOON_RANK},
 {id:'haste',title:'迅捷',tag:'全队 · 迅捷',text:'缩短攻击间隔，提高移速',icon:'wind',max:MAX_BOON_RANK},
 {id:'volley',title:'多重弩箭',tag:'薇拉 · 齐射',text:'提高齐射箭数与箭伤',icon:'arrow',max:MAX_BOON_RANK},
 {id:'pierce',title:'穿林箭矢',tag:'薇拉 · 穿透',text:'提高穿透人数与箭速',icon:'arrow',max:MAX_BOON_RANK},
 {id:'inferno',title:'爆燃',tag:'伊芙 · 爆裂',text:'扩大爆炸范围，提高火球与持续灼烧伤害',icon:'flame',max:MAX_BOON_RANK},
 {id:'chain',title:'连锁火焰',tag:'伊芙 · 连锁',text:'增加火焰弹射目标与伤害',icon:'spark',max:MAX_BOON_RANK},
 {id:'cleave',title:'弧月横扫',tag:'洛恩 · 横扫',text:'扩大横扫范围，提高剑击伤害',icon:'shield',max:MAX_BOON_RANK},
 {id:'thorns',title:'反击',tag:'洛恩 · 反击',text:'受击反伤 +25',icon:'shield',max:MAX_BOON_RANK},
 {id:'vitality',title:'生命',tag:'全队 · 生命',text:'提高生命上限，立即回血30%',icon:'leaf',max:MAX_BOON_RANK},
 {id:'siphon',title:'回血',tag:'全队 · 恢复',text:'每击败12敌，全队恢复生命',icon:'heart',max:MAX_BOON_RANK},
 {id:'dash',title:'闪避',tag:'全队 · 闪避',text:'缩短闪避冷却，延长无敌时间',icon:'wind',max:MAX_BOON_RANK},
 {id:'ward',title:'防御',tag:'全队 · 守护',text:'降低承伤，提高过关回复',icon:'shield',max:MAX_BOON_RANK},
 ...SKILL_BOONS
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const d2=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const dist=(a,b)=>Math.sqrt(d2(a,b));
const ENEMIES={
 minion:{hp:37,speed:3.45,damage:11,range:1.55,interval:1.65,radius:.47,windup:.62},
 warrior:{hp:110,speed:1.9,damage:20,range:2.05,interval:2.1,radius:.65,windup:.9},
 mage:{hp:47,speed:1.65,damage:15,range:10,interval:2.8,radius:.45,windup:.95},
 boss:{hp:5200,speed:2.2,damage:32,range:6,interval:2.5,radius:1.4,windup:1}
};
export class Game {
 constructor({seed=1,obstacles=[]}={}){this.seed=seed;this.obstacles=obstacles;this.serial=0;this.stats={best:0};this.reset(false);}
 emit(type,data={}){this.events.push({id:++this.serial,type,time:this.time,...data});}
 drain(){const events=this.events;this.events=[];return events;}
 reset(playing=true,seed=this.seed){
  this.seed=seed;this.random=seededRandom(seed,'encounters');this.boonRandom=seededRandom(seed,'boons');this.phase=playing?'playing':'ready';this.previousPhase=null;
  this.time=0;this.waveTime=0;this.wave=1;this.stage=0;this.chapterKills=0;this.transitionElapsed=0;this.introElapsed=0;this.introActive=false;this.kills=0;this.damageDealt=0;this.events=[];this.enemies=[];this.projectiles=[];this.hazards=[];this.pickups=[];this.boons={};this.offers=[];this.fields=[];this.telegraphs=[];this.level=1;this.upgradeIndex=0;this.choiceType=null;this.waveKills=0;this.bossKilled=false;
  this.centroid={x:0,z:8};this.destination={x:0,z:8};this.dashCooldown=0;this.dashTime=0;this.invulnerability=0;this.dashVector={x:0,z:0};this.heading=Math.PI;
  this.heroes=HEROES.map((cfg,i)=>({...cfg,x:(i-1)*1.7,z:8+(i===0?-1:.6),px:(i-1)*1.7,pz:8+(i===0?-1:.6),hp:cfg.maxHp,baseHp:cfg.maxHp,baseDamage:cfg.damage,attack:null,attackSeq:0,cd:.5+i*.22,face:playing?Math.PI:0,moving:0,hitFlash:0,hurtGrace:0,downTime:0,strideTime:i*.19,gaitStop:.2,gaitMoving:false,gaitRate:1}));
  this.spawnRemaining=0;this.nextSpawn=.8;this.clearDelay=0;this.totalSpawned=0;this.shrines=[{id:'spring',x:-13,z:8,used:false},{id:'stones',x:14,z:-8,used:false}];
  if(playing)this.beginWave();
 }
 start(seed=Math.floor(Math.random()*1e9),withIntro=false){this.reset(true,seed);if(withIntro){this.introActive=true;this.events=[]}this.emit('start');}
 tickIntro(dt){if(this.phase!=='playing'||!this.introActive)return;this.introElapsed=Math.min(CHAPTER_INTRO_SECONDS,this.introElapsed+dt);if(this.introElapsed===CHAPTER_INTRO_SECONDS){this.introActive=false;this.beginWave();this.emit('chapter-start',{stage:0})}}

 beginWave(){
  const rules=waveRules(this.stage,this.wave);this.waveTime=0;this.waveKills=0;this.nextSpawn=1.2;this.clearDelay=0;this.waveTotal=rules.count;
  this.spawnRemaining=this.wave===6?0:rules.count;this.fields=[];this.telegraphs=[];
  this.bossKilled=false;
  if(this.wave===6){const boss=this.spawn('boss',0,-12);boss.cd=2.5;}
  this.emit('wave',{wave:this.wave,stage:this.stage});
 }

 setDestination(x,z){if(!['playing','transition'].includes(this.phase)||!Number.isFinite(x)||!Number.isFinite(z))return false;const r=Math.hypot(x,z),m=r>ARENA_RADIUS?ARENA_RADIUS/r:1;this.destination={x:x*m,z:z*m};return true;}
 dash(x=this.destination.x,z=this.destination.z){
  if(!['playing','transition'].includes(this.phase)||this.dashCooldown>0)return false;
  const dx=x-this.centroid.x,dz=z-this.centroid.z,len=Math.hypot(dx,dz);if(len<.15)return false;
  this.dashVector={x:dx/len,z:dz/len};this.dashTime=.26;this.invulnerability=P.invulnerability(this.boons.dash);this.dashCooldown=P.dashCooldown(this.boons.dash);
  this.emit('dash',{x:this.centroid.x,z:this.centroid.z});return true;
 }
 pause(){if(!['playing','choice','transition','intro'].includes(this.phase))return false;this.previousPhase=this.phase;this.phase='paused';this.destination={...this.centroid};this.emit('pause');return true;}
 resume(){if(this.phase!=='paused')return false;this.phase=this.previousPhase||'playing';this.previousPhase=null;this.emit('resume');return true;}
 spawn(kind,x,z){
  const cfg=ENEMIES[kind],rules=waveRules(this.stage,this.wave),scale=kind==='boss'?(this.stage===0?.70:rules.hp):rules.hp;
  const e={id:++this.serial,kind,faction:this.stage===0?'goblin':'skeleton',x,z,px:x,pz:z,hp:kind==='boss'?BOSS_HEALTH[this.stage]:Math.round(cfg.hp*scale),maxHp:kind==='boss'?BOSS_HEALTH[this.stage]:Math.round(cfg.hp*scale),damage:cfg.damage*(kind==='boss'&&this.stage===0?.92:rules.damage),radius:kind==='boss'&&this.stage===0?1.75:cfg.radius,speed:cfg.speed*(kind==='boss'?1:rules.speed),cd:1+this.random(),attack:null,attackSeq:0,face:0,moving:0,spawn:.9,dead:0,hitFlash:0};
  this.pushOut(e);this.enemies.push(e);this.totalSpawned++;this.emit('spawn',{actor:e.id,kind,x:e.x,z:e.z});return e;
 }
 spawnGroup(){
  const rules=waveRules(this.stage,this.wave),occupied=this.enemies.filter(e=>e.hp>0).length;
  const count=Math.min(this.spawnRemaining,rules.batch,Math.max(0,rules.cap-occupied));
  let mages=this.enemies.filter(e=>e.hp>0&&e.kind==='mage').length;
  if(count===0){this.nextSpawn=.2;return;}
  for(let i=0;i<count;i++){
   let a=this.random()*Math.PI*2,r=(this.wave<3?14:11)+this.random()*4;let x=clamp(this.centroid.x+Math.cos(a)*r,-21,21),z=clamp(this.centroid.z+Math.sin(a)*r,-21,21);
   const len=Math.hypot(x,z);if(len>22){x*=22/len;z*=22/len;}
   if(Math.hypot(x-this.centroid.x,z-this.centroid.z)<8){a+=Math.PI;x=Math.cos(a)*20;z=Math.sin(a)*20;}
   const roll=this.random();const kind=this.wave>1&&roll<.22&&mages<Math.min(5,this.wave+1)?'mage':roll<.46&&this.wave>1?'warrior':'minion';this.spawn(kind,x,z);if(kind==='mage')mages++;
  }
  this.spawnRemaining-=count;this.nextSpawn=rules.interval*(.85+this.random()*.3);
 }
 pushOut(a){
  const radius=a.radius||.5;
  let len=Math.hypot(a.x,a.z),limit=ARENA_RADIUS+(a.kind==='boss'?0:1);if(len>limit){a.x*=limit/len;a.z*=limit/len;}
  for(const o of this.obstacles){const dx=a.x-o.x,dz=a.z-o.z,d=Math.hypot(dx,dz),r=o.r+radius;if(d<r){const l=d||.001;a.x=o.x+(d?dx/l:1)*r;a.z=o.z+(d?dz/l:0)*r;}}
 }
 moveToward(a,target,speed,dt){
  const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);a.moving=0;if(d<.08)return;
  let vx=dx/d,vz=dz/d;
  // Steer round local obstacles while retaining a single authoritative position.
  for(const o of this.obstacles){const ox=a.x-o.x,oz=a.z-o.z,od=Math.hypot(ox,oz),rr=o.r+1.8;
   if(od<rr&&vx*ox+vz*oz<.4){const turn=vx*oz-vz*ox>0?1:-1;vx+=oz/(od||1)*1.8*turn;vz-=ox/(od||1)*1.8*turn;}
  }
  const n=Math.hypot(vx,vz);vx/=n;vz/=n;const step=Math.min(speed*dt,d);a.x+=vx*step;a.z+=vz*step;this.pushOut(a);a.face=Math.atan2(vx,vz);a.moving=step/dt;
 }
 aliveEnemies(){return this.enemies.filter(e=>e.hp>0&&e.spawn<=0);}
 aliveHeroes(){return this.heroes.filter(h=>h.hp>0);}
 nearest(a,items,range=Infinity){let best=null,score=range*range;for(const b of items){const d=d2(a,b);if(d<score){score=d;best=b;}}return best;}
 hurtEnemy(e,amount,source,{knock=0,crit=false,damageKind='hit'}={}){
  if(e.hp<=0||e.spawn>0)return false;e.hp=Math.max(0,e.hp-amount);e.hitFlash=damageKind==='burn'?.08:.15;this.damageDealt+=amount;
  if(knock&&source&&e.kind!=='boss'){const d=dist(e,source)||1;e.x+=(e.x-source.x)/d*knock;e.z+=(e.z-source.z)/d*knock;this.pushOut(e);}
  this.emit(damageKind==='burn'?'burn-tick':'hit',{x:e.x,z:e.z,amount,actor:e.id,critical:crit,kind:e.kind});
  if(e.hp===0){e.burnLeft=0;e.burnSource=null;e.dead=e.kind==='boss'?1.2:.75;e.attack=null;e.action=null;e.jumpY=0;this.kills++;this.chapterKills++;this.waveKills++;this.emit('kill',{x:e.x,z:e.z,kind:e.kind});
   if(e.kind==='boss'){this.bossKilled=true;if(this.stage===1){for(const minion of this.enemies)if(minion.summoned&&minion.hp>0){minion.hp=0;minion.dead=.75;minion.attack=null;minion.action=null}this.projectiles=this.projectiles.filter(p=>p.owner!=='enemy')}}
   if(this.random()<.08)this.pickups.push({id:++this.serial,x:e.x,z:e.z,kind:'ember',life:20});
   if(this.boons.siphon&&this.kills%12===0)this.heal(P.siphon(this.boons.siphon),false);
  }return true;
 }
 hurtHero(h,amount){
  if(h.hp<=0||this.invulnerability>0||h.hurtGrace>0)return false;h.hurtGrace=.18;const actual=amount*P.receivedDamage(this.boons.ward);h.hp=Math.max(0,h.hp-actual);h.hitFlash=.26;this.emit('hurt',{actor:h.id,x:h.x,z:h.z,amount:actual});
  if(h.kind==='knight'&&this.boons.thorns){for(const e of this.aliveEnemies())if(dist(e,h)<3.5)this.hurtEnemy(e,P.counter(this.boons.thorns),h);this.emit('counter',{x:h.x,z:h.z});}
  if(h.hp===0){h.downTime=this.time;h.attack=null;h.moving=0;h.spinLeft=0;this.emit('down',{actor:h.id,x:h.x,z:h.z});}
  return true;
 }
 heal(amount,percent=false,revive=false){for(const h of this.heroes){if(h.hp>0||revive){h.hp=Math.min(h.maxHp,h.hp+(percent?h.maxHp*amount:amount));}}this.emit('heal',{x:this.centroid.x,z:this.centroid.z});}
 shoot({owner,kind,x,z,target,damage,pierce=0,radius=.2,speed=21}){
  let dx=target.x-x,dz=target.z-z,d=Math.hypot(dx,dz)||1;
  const p={id:++this.serial,owner,kind,x,z,px:x,pz:z,vx:dx/d*speed,vz:dz/d*speed,damage,pierce,radius,life:2.5,hit:new Set(),source:{x,z}};this.projectiles.push(p);this.emit('shot',{id:p.id,owner,kind,x,z,targetX:target.x,targetZ:target.z});return p;
 }
 heroRelease(h,attack){
  if(h.hp<=0)return;const live=this.aliveEnemies();let target=live.find(e=>e.id===attack.target);if(!target||dist(h,target)>h.range+2)target=this.nearest(h,live,h.kind==='knight'&&this.boons.swordwave?11:h.range+1);if(!target)return;
  const dmg=h.baseDamage*P.attack(this.boons.edge);h.face=Math.atan2(target.x-h.x,target.z-h.z);
  if(h.kind==='knight'){
   const r=P.cleaveRadius(this.boons.cleave),angle=h.face;for(const e of live){const d=dist(h,e);if(d<r){const dot=((e.x-h.x)*Math.sin(angle)+(e.z-h.z)*Math.cos(angle))/(d||1);if(dot>-.2)this.hurtEnemy(e,dmg*P.cleaveDamage(this.boons.cleave),h,{knock:this.boons.cleave?.65:0});}}
   this.emit('slash',{x:h.x,z:h.z,angle,radius:r});releaseSwordwave(this,h,target,dmg);
  }else if(h.kind==='ranger'){
   const targets=[target,...live.filter(e=>e!==target&&dist(e,h)<h.range).sort((a,b)=>d2(a,h)-d2(b,h))];
   for(let i=0;i<P.arrows(this.boons.volley);i++){const p=this.shoot({owner:h.id,kind:'bolt',x:h.x+Math.sin(h.face)*.75,z:h.z+Math.cos(h.face)*.75,target:targets[i%targets.length],damage:dmg*P.ricochetDamage(this.boons.ricochet)*P.volleyDamage(this.boons.volley),pierce:P.pierce(this.boons.pierce),speed:P.arrowSpeed(this.boons.pierce)});p.bounces=P.ricochet(this.boons.ricochet);p.retention=P.ricochetRetention(this.boons.ricochet);}
  }else{const p=this.shoot({owner:h.id,kind:'fire',x:h.x+Math.sin(h.face)*.5,z:h.z+Math.cos(h.face)*.5,target,damage:dmg*P.fireDamage(this.boons.inferno),radius:.35,speed:15});p.burnAttack=dmg;if(this.boons.firefield&&!(h.fieldCd>0)){p.fieldRank=this.boons.firefield;h.fieldCd=heroSkillCooldown('firefield',this.boons.firefield);}}
 }
 explodeFire(p,hit){
  const radius=P.fireRadius(this.boons.inferno);const live=this.aliveEnemies();for(const e of live)if(dist(e,p)<radius+e.radius){this.hurtEnemy(e,p.damage,p.source);igniteEnemy(this,e,p)}
  this.emit('burst',{x:p.x,z:p.z,radius,kind:'fire'});leaveFirefield(this,p);
  if(this.boons.chain){let n=0;for(const e of live.filter(e=>e!==hit&&e.hp>0&&dist(e,p)<7).sort((a,b)=>d2(a,p)-d2(b,p))){this.hurtEnemy(e,p.damage*P.chainDamage(this.boons.chain),p.source);igniteEnemy(this,e,p);this.emit('chain',{x:p.x,z:p.z,targetX:e.x,targetZ:e.z});if(++n>=P.chain(this.boons.chain))break;}}
 }
 rollOffers(){
  const candidates=BOONS.filter(b=>(this.boons[b.id]||0)<b.max&&canLearnBoon(this.boons,b.id));
  if(this.level===1){this.offers=['whirlwind','firefield','ricochet'].map(id=>candidates.find(b=>b.id===id));return;}
  const defensive=new Set(['vitality','ward','dash','siphon','thorns']);
  const scored=candidates.map(b=>({b,score:Math.pow(this.boonRandom(),1/((this.boons[b.id]||0)>0?1.55:1))})).sort((a,b)=>b.score-a.score);
  this.offers=scored.slice(0,3).map(x=>x.b);
  if(this.stage===1&&!this.offers.some(b=>this.boons[b.id]>0)){const learned=scored.find(x=>this.boons[x.b.id]>0);if(learned)this.offers[0]=learned.b;}
  if(this.offers.every(b=>defensive.has(b.id))){const attack=scored.find(x=>!defensive.has(x.b.id));if(attack)this.offers[2]=attack.b;}
 }
 chooseBoon(id){
  const boon=BOONS.find(b=>b.id===id);
  if(this.phase!=='choice'||!boon||!this.offers.some(b=>b.id===id)||(this.boons[id]||0)>=boon.max||!canLearnBoon(this.boons,id))return false;
  this.boons[id]=nextBoonRank(this.boons,id,this.stage);this.level++;
  if(id==='vitality')for(const h of this.heroes)h.maxHp=h.baseHp*P.health(this.boons.vitality);
  const nextWave=this.choiceType==='wave';
  this.heal(id==='vitality'?.3:nextWave?P.clearHeal(this.boons.ward):.05,true,true);
  this.phase='playing';this.offers=[];this.choiceType=null;this.invulnerability=nextWave?1.3:.85;
  this.emit('boon',{boon:id});
  if(nextWave){this.wave++;this.beginWave();}
  return true;
 }
 completeWave(){
  this.projectiles=[];this.hazards=[];this.fields=[];this.telegraphs=[];this.destination={...this.centroid};
  if(this.wave===6){
   if(this.stage===0){
    this.phase='transition';this.transitionElapsed=0;this.enemies=[];this.pickups=[];this.heal(.4,true,true)
    this.heroes.forEach(h=>{h.attack=null;h.spinLeft=0;h.moving=0});this.emit('chapter-transition');return
   }
   this.phase='victory';this.emit('victory');return
  }
  this.phase='choice';this.choiceType='wave';this.rollOffers();this.emit('clear',{wave:this.wave});
 }

 tickTravel(dt){
  this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.invulnerability=Math.max(0,this.invulnerability-dt)
  if(this.dashTime>0){this.dashTime=Math.max(0,this.dashTime-dt);this.centroid.x+=this.dashVector.x*18*dt;this.centroid.z+=this.dashVector.z*18*dt;this.pushOut(this.centroid);this.destination={...this.centroid}}
  else this.moveToward(this.centroid,this.destination,PARTY_RUN_SPEED*P.movement(this.boons.haste),dt)
  if(this.centroid.moving>.2)this.heading=this.centroid.face
  for(let i=0;i<this.heroes.length;i++){
   const h=this.heroes[i];h.px=h.x;h.pz=h.z;if(h.hp<=0)continue
   const lateral=i===0?0:i===1?-1.5:1.5,forward=i===0?1.3:-.8
   const formation={x:this.centroid.x+Math.cos(this.heading)*lateral+Math.sin(this.heading)*forward,z:this.centroid.z-Math.sin(this.heading)*lateral+Math.cos(this.heading)*forward}
   this.moveToward(h,formation,this.dashTime>0?22:h.speed*P.movement(this.boons.haste)+Math.max(0,dist(h,formation)-2)*1.5,dt)
   h.gaitStop=h.moving>.4?0:h.gaitStop+dt;h.gaitMoving=h.gaitStop<.12
   h.gaitRate+=(Math.max(.75,h.moving/5)-h.gaitRate)*(1-Math.exp(-14*dt));if(h.gaitMoving)h.strideTime+=dt*h.gaitRate
  }
 }
 tickTransition(dt,ready=true){
  if(this.phase!=='transition')return false
  this.tickTravel(dt)
  this.transitionElapsed=Math.min(CHAPTER_TRANSITION_SECONDS,this.transitionElapsed+dt)
  if(this.transitionElapsed<CHAPTER_TRANSITION_SECONDS||!ready)return false
  this.stage=1;this.wave=1;this.chapterKills=0;this.upgradeIndex=0;this.invulnerability=2
  this.shrines.forEach(s=>s.used=false);this.heroes.forEach(h=>{h.cd=.4;h.whirlCd=.5;h.swordCd=.7;h.fieldCd=.8;h.px=h.x;h.pz=h.z})
  this.phase='playing';this.beginWave();this.emit('chapter-start',{stage:1});return true
 }

 tick(dt){
  if(this.phase!=='playing')return;
  this.time+=dt;if(this.introActive)this.tickIntro(dt);else this.waveTime+=dt;this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.invulnerability=Math.max(0,this.invulnerability-dt);
  const speed=PARTY_RUN_SPEED*P.movement(this.boons.haste);
  if(this.dashTime>0){this.dashTime=Math.max(0,this.dashTime-dt);this.centroid.x+=this.dashVector.x*18*dt;this.centroid.z+=this.dashVector.z*18*dt;this.pushOut(this.centroid);this.destination={...this.centroid};}
  else this.moveToward(this.centroid,this.destination,speed,dt);
  if(this.centroid.moving>.2)this.heading=this.centroid.face;
  const alive=this.aliveEnemies();
  for(let i=0;i<this.heroes.length;i++){
   const h=this.heroes[i];h.px=h.x;h.pz=h.z;h.hitFlash=Math.max(0,h.hitFlash-dt);h.hurtGrace=Math.max(0,(h.hurtGrace||0)-dt);if(h.hp<=0)continue;
   const lateral=i===0?0:i===1?-1.5:1.5,forward=i===0?1.3:-.8;
   const formation={x:this.centroid.x+Math.cos(this.heading)*lateral+Math.sin(this.heading)*forward,z:this.centroid.z-Math.sin(this.heading)*lateral+Math.cos(this.heading)*forward};
   // At rest the warden intercepts within the squad's perimeter; movement orders always take priority.
   if(i===0&&!(this.centroid.moving>.3)&&this.dashTime<=0){const threat=this.nearest(this.centroid,alive,7.5);if(threat){const d=dist(threat,this.centroid)||1,reach=Math.min(4.5,Math.max(0,d-2.3));formation.x=this.centroid.x+(threat.x-this.centroid.x)/d*reach;formation.z=this.centroid.z+(threat.z-this.centroid.z)/d*reach;}}
   this.moveToward(h,formation,this.dashTime>0?22:h.speed*P.movement(this.boons.haste)+Math.max(0,dist(h,formation)-2)*1.5,dt);
   h.gaitStop=h.moving>.4?0:h.gaitStop+dt;h.gaitMoving=h.gaitStop<.12;
   h.gaitRate+=(Math.max(.75,h.moving/5)-h.gaitRate)*(1-Math.exp(-14*dt));
   if(h.gaitMoving)h.strideTime+=dt*h.gaitRate;
   tickHeroSkills(this,h,dt);
   h.cd=Math.max(0,h.cd-dt);
   if(h.attack){h.attack.left-=dt;if(h.attack.left<=0){this.heroRelease(h,h.attack);h.attack=null;}}
   if(!h.attack&&!(h.spinLeft>0)&&h.cd<=0){const target=this.nearest(h,alive,h.kind==='knight'?(this.boons.swordwave&&!(h.swordCd>0)?11:P.cleaveRadius(this.boons.cleave)):h.range);if(target){h.attack={left:h.kind==='mage'?.36:h.kind==='knight'?.28:.26,target:target.id};h.attackSeq++;h.aimUntil=this.time+.58;h.aimYaw=Math.atan2(target.x-h.x,target.z-h.z);h.face=h.aimYaw;h.cd=h.interval*P.interval(this.boons.haste);this.emit('attack',{actor:h.id,kind:h.kind,target:target.id});}}
   if(this.time<(h.aimUntil||0))h.face=h.aimYaw;
  }
  if(!this.introActive){this.nextSpawn-=dt;if(this.nextSpawn<=0&&this.spawnRemaining>0)this.spawnGroup();}
  for(const e of this.enemies){e.px=e.x;e.pz=e.z;e.hitFlash=Math.max(0,e.hitFlash-dt);e.moving=0;
   if(e.hp<=0){e.dead-=dt;continue;}if(e.spawn>0){e.spawn-=dt;continue;}
   tickBurn(this,e,dt);if(e.hp<=0)continue;
   if(e.kind==='boss'){tickBoss(this,e,dt);continue;}
   e.cd-=dt;
   if(e.attack){e.attack.left-=dt;if(e.attack.left<=0){const a=e.attack;e.attack=null;
    if(e.kind==='mage'){
     const angle=Math.atan2(a.x-e.x,a.z-e.z),shots=this.wave>=4?3:1;
     for(let i=0;i<shots;i++){const turn=angle+(i-(shots-1)/2)*.20;this.shoot({owner:'enemy',kind:e.faction==='goblin'?'enemy-arrow':'shadow',x:e.x,z:e.z,target:{x:e.x+Math.sin(turn)*12,z:e.z+Math.cos(turn)*12},damage:e.damage,speed:this.wave>=4?9:7.5,radius:.34})}
    }
    else{const h=this.heroes.find(h=>h.id===a.target);if(h&&h.hp>0&&Math.hypot(h.x-a.x,h.z-a.z)<ENEMIES[e.kind].range+.5&&dist(h,e)<ENEMIES[e.kind].range+.5)this.hurtHero(h,e.damage);this.emit('enemy-slash',{x:e.x,z:e.z,angle:e.face,radius:ENEMIES[e.kind].range});}
   }continue;}
   const target=this.nearest(e,this.aliveHeroes());if(!target)continue;const d=dist(e,target),cfg=ENEMIES[e.kind];
   if(d>cfg.range*.9)this.moveToward(e,target,e.speed,dt);else if(e.kind==='mage'&&d<5)this.moveToward(e,{x:e.x+(e.x-target.x),z:e.z+(e.z-target.z)},e.speed*.65,dt);
   e.face=Math.atan2(target.x-e.x,target.z-e.z);
   if(e.cd<=0&&d<cfg.range){e.cd=cfg.interval+this.random()*.4;const lead=e.kind==='mage'&&this.wave>=3?.85:0,travel=Math.min(5.8,this.centroid.moving||0)*lead;e.attack={left:cfg.windup,target:target.id,x:target.x+Math.sin(this.heading)*travel,z:target.z+Math.cos(this.heading)*travel};e.attackSeq++;this.emit('enemy-attack',{actor:e.id,kind:e.kind,x:e.x,z:e.z});}
  }
  tickFields(this,dt);this.telegraphs=bossTelegraphs(this.enemies);
  // Soft actor separation prevents the opaque stacks that destroy battle readability.
  const cells=new Map(),cellSize=4
  for(const a of this.enemies){
   if(a.hp<=0)continue
   const cx=Math.floor(a.x/cellSize),cz=Math.floor(a.z/cellSize)
   for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const b of cells.get(x+':'+z)||[]){
    const dx=a.x-b.x,dz=a.z-b.z,r=a.radius+b.radius,squared=dx*dx+dz*dz
    if(squared<r*r&&squared>.000001){const d=Math.sqrt(squared),k=(r-d)*.2;a.x+=dx/d*k;a.z+=dz/d*k;b.x-=dx/d*k;b.z-=dz/d*k}
   }
   const key=cx+':'+cz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(a)
  }
  for(const a of this.enemies)if(a.hp>0)this.pushOut(a)
  for(const p of this.projectiles){p.px=p.x;p.pz=p.z;p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;
   const candidates=p.owner==='enemy'?this.aliveHeroes():this.aliveEnemies();
   for(const a of candidates){if(p.hit.has(a.id)||(a.jumpY||0)>1)continue;
    const dx=p.x-p.px,dz=p.z-p.pz,t=clamp(((a.x-p.px)*dx+(a.z-p.pz)*dz)/(dx*dx+dz*dz||1),0,1),near=Math.hypot(a.x-(p.px+dx*t),a.z-(p.pz+dz*t));
    if(near<(a.radius||.46)+p.radius){p.hit.add(a.id);
     if(p.owner==='enemy')this.hurtHero(a,p.damage);else if(p.kind==='fire'){this.explodeFire(p,a);}else this.hurtEnemy(a,p.damage,p.source);
     if(p.owner!=='enemy'&&ricochet(this,p,a))break;
     if(p.kind==='fire'||p.pierce--<=0){p.life=0;break;}
    }
   }
  }
  this.projectiles=this.projectiles.filter(p=>p.life>0&&Math.hypot(p.x,p.z)<40).slice(-140);
  for(const h of this.hazards){h.left-=dt;if(h.left<=0){for(const hero of this.aliveHeroes())if(dist(hero,h)<h.r+.35)this.hurtHero(hero,h.damage);this.emit('burst',{x:h.x,z:h.z,radius:h.r,kind:'shadow'});}}
  this.hazards=this.hazards.filter(h=>h.left>0);
  this.enemies=this.enemies.filter(e=>e.hp>0||e.dead>0);
  for(const p of this.pickups){p.life-=dt;const hero=this.nearest(p,this.aliveHeroes());if(hero&&dist(p,hero)<3){this.moveToward(p,hero,11,dt);if(dist(p,hero)<.6){p.life=0;this.heal(4);this.emit('pickup',{x:p.x,z:p.z});}}}
  this.pickups=this.pickups.filter(p=>p.life>0).slice(-35);
  for(const shrine of this.shrines){if(!shrine.used&&dist(shrine,this.centroid)<1.8){shrine.used=true;this.heal(.4,true,true);this.emit('shrine',{id:shrine.id,x:shrine.x,z:shrine.z});}}
  if(!this.aliveHeroes().length){this.phase='defeat';this.projectiles=[];this.hazards=[];this.fields=[];this.telegraphs=[];this.emit('defeat');return;}
  if(this.spawnRemaining===0&&!this.enemies.some(e=>e.hp>0)){this.clearDelay+=dt;if(this.clearDelay>1.5)this.completeWave();}else this.clearDelay=0;
  if(this.phase==='playing'&&this.wave<6&&this.chapterKills>=(this.stage===1?NIGHT_UPGRADE_KILLS:UPGRADE_KILLS)[this.upgradeIndex]){this.upgradeIndex++;this.phase='choice';this.choiceType='level';this.destination={...this.centroid};this.rollOffers();this.emit('level-up',{level:this.level+1});}
 }
 snapshot(){return {phase:this.phase,seed:this.seed,stage:this.stage,wave:this.wave,transition:this.transitionElapsed,time:+this.time.toFixed(2),kills:this.kills,centroid:{...this.centroid},destination:{...this.destination},heroes:this.heroes.map(h=>({id:h.id,hp:+h.hp.toFixed(1),maxHp:h.maxHp,x:+h.x.toFixed(2),z:+h.z.toFixed(2),attacks:h.attackSeq})),enemies:this.enemies.filter(e=>e.hp>0).length,projectiles:this.projectiles.length,hazards:this.hazards.length,spawnRemaining:this.spawnRemaining,boons:{...this.boons},offers:this.offers.map(x=>x.id)};}
}
