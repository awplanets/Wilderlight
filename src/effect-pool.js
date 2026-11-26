// Recycle presentation objects only. Active effects are never capped or dropped.
export function createEffectPool(){
 const bins=new Map(),owners=new WeakMap(),stats={created:0,reused:0}
 function acquire(key,make,destroy=()=>{}){
  let bin=bins.get(key)
  if(!bin){bin={free:[],all:new Set(),make,destroy};bins.set(key,bin)}
  let object=bin.free.pop()
  if(object)stats.reused++
  else{object=bin.make();bin.all.add(object);owners.set(object,bin);stats.created++}
  object.userData.inEffectPool=false
  return object
 }
 function release(object){
  const bin=owners.get(object)
  if(!bin||object.userData.inEffectPool)return
  object.removeFromParent();object.userData.inEffectPool=true;bin.free.push(object)
 }
 return {acquire,release,stats,
  warm(key,count,make,destroy){const held=[];for(let i=0;i<count;i++)held.push(acquire(key,make,destroy));held.forEach(release)},
  dispose(){for(const bin of bins.values())for(const object of bin.all){object.removeFromParent();bin.destroy(object)}bins.clear()}
 }
}
