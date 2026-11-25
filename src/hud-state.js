import {BOONS} from './simulation.js'
import {heroSkillCooldown,EXTRA_SKILLS,waveRules,CHAPTER_TRANSITION_SECONDS,CHAPTER_INTRO_SECONDS} from './combat-rules.js'
import {P,nextBoonRank} from './progression.js'
const boonNames=Object.fromEntries(BOONS.map(b=>[b.id,b.title]))
export const SKILLS={
 warden:{name:'弧月斩',art:'sweep',description:'洛恩挥剑横扫面前的敌人。'},
 ranger:{name:'疾风弩',art:'bolt',description:'薇拉瞄准附近的敌人，发射弩箭。'},
 mage:{name:'余烬火球',art:'fireball',description:'火球爆炸并灼烧敌人3秒，每半秒造成3点＋20%攻击伤害；爆燃同时提高爆炸和灼烧伤害。重复命中刷新灼烧时间。'}
}
const cap=(n,a,b)=>Math.min(b,Math.max(a,n))
const value=n=>Number(n.toFixed(1)).toString()
const percent=n=>Math.round(n*100)+'%'
export function skillState(hero,boons={}){
 const duration=hero.interval*P.interval(boons.haste),remaining=Math.max(0,hero.cd)
 const state=hero.hp<=0?'down':hero.attack?'casting':remaining>.015?'cooling':'ready'
 return {state,duration,remaining,ratio:cap(remaining/duration,0,1)}
}
export function skillSummary(hero,b={}){
 if(hero.kind==='knight')return `横扫 ${value(P.cleaveRadius(b.cleave))} 米`
 if(hero.kind==='ranger')return `${P.arrows(b.volley)} 支弩箭 · 穿透 ${P.pierce(b.pierce)} 人`
 return `爆炸 ${value(P.fireRadius(b.inferno))} 米 · 每次灼烧 ${value(P.burnFlat(b.inferno)+hero.baseDamage*P.attack(b.edge)*P.burnAttack(b.inferno))} 伤害`
}
// Shared progression functions keep card descriptions and combat in agreement.
// Each card reserves exactly two copy lines, with the same reference text column.
export function blessingLines(id,rank){
 switch(id){
 case 'edge':return [`全队攻击增幅达到${percent(P.attack(rank)-1)}，`,'剑击、弩箭与火球同时增强。']
 case 'haste':return [`攻击间隔缩短${percent(1-P.interval(rank))}，`,`移动速度提高${percent(P.movement(rank)-1)}。`]
 case 'volley':return [`每轮射出${P.arrows(rank)}支弩箭，`,`每支弩箭伤害提高${percent(P.volleyDamage(rank)-1)}。`]
 case 'pierce':return [`弩箭额外穿透${P.pierce(rank)}个敌人，`,`飞行速度达到${value(P.arrowSpeed(rank))}米每秒。`]
 case 'inferno':return [`爆炸${value(P.fireRadius(rank))}米，伤害+${percent(P.fireDamage(rank)-1)}，`,`灼烧3秒，每跳${value(P.burnFlat(rank))}+${percent(P.burnAttack(rank))}攻击。`]
 case 'chain':return [`火焰额外弹射${P.chain(rank)}名敌人，`,`造成原伤害的${percent(P.chainDamage(rank))}。`]
 case 'cleave':return [`横扫半径扩大到${value(P.cleaveRadius(rank))}米，`,`剑击伤害提高${percent(P.cleaveDamage(rank)-1)}。`]
 case 'thorns':return ['洛恩受击时反击周围敌人，',`造成${P.counter(rank)}点伤害。`]
 case 'vitality':return [`全队生命上限提高${percent(P.health(rank)-1)}，`,'立即回血30%，并扶起同伴。']
 case 'siphon':return ['每击败12名敌人，',`全队各回复${P.siphon(rank)}点生命。`]
 case 'dash':return [`闪避冷却${value(P.dashCooldown(rank))}秒，`,`无敌时间${P.invulnerability(rank).toFixed(2)}秒。`]
 case 'ward':return [`受到的伤害降低${percent(1-P.receivedDamage(rank))}，`,`每波结束回复${percent(P.clearHeal(rank))}生命。`]
 case 'whirlwind':return [`旋转${value(P.whirlDuration(rank))}秒，范围${value(P.whirlRadius(rank))}米，`,`每0.3秒造成${percent(P.whirlDamage(rank))}攻击伤害。`]
 case 'swordwave':return [`释放${P.swordCount(rank)}道穿透剑气，`,`每道造成${percent(P.swordDamage(rank))}攻击伤害。`]
 case 'firefield':return [`制造半径${value(P.fieldRadius(rank))}米的火阵，`,`燃烧${value(P.fieldDuration(rank))}秒，每半秒灼烧敌人。`]
 case 'ricochet':return [`弩箭额外弹射${P.ricochet(rank)}次，`,`每次保留${percent(P.ricochetRetention(rank))}伤害。`]
 default:return ['','']
 }
}
export function blessingDescription(id,rank){return blessingLines(id,rank).join('')}
export function boonPreview(id,g){
 const next=nextBoonRank(g.boons,id,g.stage),rank=g.boons[id]||0,b=BOONS.find(b=>b.id===id)
 return {owner:b.tag.split(' · ')[0],title:b.title,change:`${rank} → ${next} 级`,effect:blessingDescription(id,next)}
}
function unlockedSkills(hero,boons){
 return Object.keys(boons).filter(id=>boons[id]>0&&EXTRA_SKILLS[id]?.owner===hero.id).map(id=>{
  const rank=boons[id],shared=id==='ricochet',duration=shared?hero.interval*P.interval(boons.haste):heroSkillCooldown(id,rank)
  return {id,rank,name:boonNames[id],detail:blessingDescription(id,rank),summary:rank+' / 12 级 · '+(shared?'随弩箭触发':'自动施放'),cooldown:cap((hero[EXTRA_SKILLS[id].timer]||0)/duration,0,1),disabled:hero.hp<=0}
 })
}
export function uiState(g){
 const boss=g.enemies.find(e=>e.kind==='boss'&&e.hp>0),waveTotal=g.waveTotal||waveRules(g.stage,g.wave).count,waveKills=g.waveKills||0
 return {stage:g.stage,introActive:g.introActive,intro:cap(g.introElapsed/CHAPTER_INTRO_SECONDS,0,1),transition:cap(g.transitionElapsed/CHAPTER_TRANSITION_SECONDS,0,1),waveTime:g.waveTime,waveKills,waveTotal,waveProgress:g.wave===6?(boss?cap(1-boss.hp/boss.maxHp,0,1):g.bossKilled?1:0):cap(waveKills/waveTotal,0,1),level:g.level,bossHealth:boss?boss.hp/boss.maxHp:0,dodgeRatio:cap(g.dashCooldown/P.dashCooldown(g.boons.dash),0,1),remaining:g.enemies.filter(e=>e.hp>0).length+g.spawnRemaining,time:g.time,
 skills:g.heroes.map(h=>({id:h.id,name:SKILLS[h.id].name,summary:skillSummary(h,g.boons),detail:SKILLS[h.id].description,cooldown:skillState(h,g.boons).ratio,disabled:h.hp<=0,unlocked:unlockedSkills(h,g.boons)})),
 offers:g.offers.map(b=>{const rank=nextBoonRank(g.boons,b.id,g.stage);return {id:b.id,title:b.title,tag:b.tag,summary:blessingDescription(b.id,rank),description:blessingDescription(b.id,rank),lines:blessingLines(b.id,rank),rank,preview:boonPreview(b.id,g)}}),
 collected:Object.entries(g.boons).filter(([,n])=>n>0).map(([id,n])=>boonNames[id]+' ×'+n).join(' · ')}
}
