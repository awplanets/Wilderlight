import {WAVES} from './combat-rules.js'

// A spawn interval is longer than a normal death animation. Reserve one extra
// full batch for corpses as well as the live cap, for either melee distribution.
const largest=WAVES.reduce((best,w)=>w.cap+w.batch>best.cap+best.batch?w:best,WAVES[0])
export const ACTOR_RESERVES={minion:largest.cap+largest.batch,warrior:largest.cap+largest.batch,mage:10,boss:1}
const seed=(kind,faction)=>({id:-1,kind,faction,x:0,z:0,px:0,pz:0,hp:1,maxHp:1,face:0,moving:0,attackSeq:0,spawn:0,hitFlash:0})

export function createActorPool({create,reset,detach,destroy,warm,faction="skeleton"}){
 const spare=new Map(),all=new Set(),counts=new Map(),stats={created:0,reused:0,misses:0,peakActive:0}
 let disposed=false,active=0,remaining=Object.values(ACTOR_RESERVES).reduce((a,b)=>a+b,0)
 function build(kind){
  const item=create(seed(kind,faction));item.poolKind=kind
  try{warm(item)}catch(error){destroy(item);throw error}
  detach(item);all.add(item)
  const count=counts.get(kind)||0
  if(count<ACTOR_RESERVES[kind])remaining--
  counts.set(kind,count+1);stats.created++
  if(!spare.has(kind))spare.set(kind,[])
  spare.get(kind).push(item)
  return item
 }
 function prepareOne(){
  if(disposed)return false
  // Initial wave first. The rest are prepared progressively during the opening
  // and available frame time; no parallel timer survives a hidden page.
  if((counts.get('minion')||0)<WAVES[0].cap+WAVES[0].batch){build('minion');return true}
  for(const kind of ['mage','warrior','boss'])if(!(counts.get(kind)>0)){build(kind);return true}
  let next=null,ratio=Infinity
  for(const [kind,total]of Object.entries(ACTOR_RESERVES)){const made=counts.get(kind)||0;if(made<total&&made/total<ratio){next=kind;ratio=made/total}}
  if(!next)return false
  build(next);return true
 }
 return {
  stats,prepareOne,faction,
  available(kind){return spare.get(kind)?.length||0},
  reserveOne(kind,target){if(disposed||(spare.get(kind)?.length||0)>=target)return false;build(kind);return true},
  retireOne(){const item=all.values().next().value;if(!item)return false;all.delete(item);const bin=spare.get(item.poolKind);if(bin){const i=bin.indexOf(item);if(i>=0)bin.splice(i,1)}destroy(item);return true},
  get initialReady(){return (counts.get("minion")||0)>=WAVES[0].cap+WAVES[0].batch},
  acquire(data){
   if(disposed)throw Error('Actor pool is disposed')
   const bin=spare.get(data.kind)
   // Preserve gameplay if an unusually slow device reaches a spawn before its
   // reserve is ready; diagnostics count this path instead of hiding enemies.
   if(!bin?.length){stats.misses++;build(data.kind)}else stats.reused++
   const item=spare.get(data.kind).pop();item.inUse=true;reset(item,data);active++;stats.peakActive=Math.max(stats.peakActive,active);return item
  },
  release(item){if(disposed||!item.inUse)return;item.inUse=false;detach(item);spare.get(item.poolKind).push(item);active--},
  dispose(){if(disposed)return;disposed=true;for(const item of all)destroy(item);all.clear();spare.clear();counts.clear();active=0},
  get total(){return Object.values(ACTOR_RESERVES).reduce((a,b)=>a+b,0)},
  get complete(){return remaining===0},
  get size(){return all.size}
 }
}
