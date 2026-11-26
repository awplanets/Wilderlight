import {createCelFlame} from './cel-flame.js'
import {createEffectPool} from './effect-pool.js'

// Persistent skill shapes share the same world coordinates as their damage tests.
export function createAdvancedEffects(T,scene,{heightAt,displaySpace}){
 const objects=new Map(),geometries=[],pool=createEffectPool()
 const ring=new T.RingGeometry(.91,1,64),disc=new T.CircleGeometry(1,64),lane=new T.PlaneGeometry(1,1)
 const fan=new T.CircleGeometry(1,48,-Math.PI/2-Math.PI*.39,Math.PI*.78),fanEdge=new T.RingGeometry(.94,1,48,1,-Math.PI/2-Math.PI*.39,Math.PI*.78)
 const arc=new T.RingGeometry(.76,1,40,1,0,Math.PI*1.45)
 for(const g of [ring,disc,lane,arc,fan,fanEdge]){g.rotateX(-Math.PI/2);geometries.push(g)}
 const flame=createCelFlame(T,{displaySpace,animated:true})
 const material=(color,opacity)=>new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,side:T.DoubleSide})
 function mesh(group,geometry,color,opacity){const m=new T.Mesh(geometry,material(color,opacity));group.add(m);return m}
 function get(key,type,make){if(!objects.has(key)){const g=pool.acquire(type,()=>{const root=new T.Group();make(root);return root},root=>root.traverse(m=>{if(m.isMesh&&!m.userData.sharedFlame)m.material.dispose()}));g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.setScalar(1);scene.add(g);objects.set(key,g)}return objects.get(key)}
 function remove(key){pool.release(objects.get(key));objects.delete(key)}
 function markFlame(g){g.traverse(m=>{if(m.isMesh)m.userData.sharedFlame=true});return g}
 return {
  update(dt,game,camera){
   flame.userData.flameClock.value=game.time
   const keys=new Set()
   for(const f of game.fields){
    const key='field'+f.id;keys.add(key)
    const g=get(key,'field',g=>{mesh(g,disc,0xe57432,.14);mesh(g,ring,0xffc05e,.8);for(let i=0;i<7;i++)g.add(markFlame(flame.clone()))})
    g.position.set(f.x,heightAt(f.x,f.z)+.14,f.z)
    g.children[0].scale.setScalar(f.r);g.children[1].scale.setScalar(f.r)
    const fade=Math.min(1,f.left/.6)
    g.children[1].material.opacity=fade*(.6+.2*Math.sin(game.time*5))
    g.children.slice(2).forEach((m,i)=>{const a=i/6*Math.PI*2,r=i===6?0:f.r*.72;m.position.set(Math.cos(a)*r,.08,Math.sin(a)*r);m.quaternion.copy(camera.quaternion);m.scale.setScalar((i===6?.9:.65)*fade)})
   }
   for(const a of [...game.heroes,...game.enemies]){
    const boss=a.action?.kind==='spin'
    if(!(a.spinLeft>0)&&!boss)continue
    const key='spin'+a.id;keys.add(key)
    const g=get(key,boss?'boss-spin':'hero-spin',g=>{mesh(g,arc,boss?0xee6854:0xffe4a5,.88);mesh(g,arc,boss?0xffa15d:0xf8d66e,.55)})
    g.position.set(a.x,heightAt(a.x,a.z)+.65,a.z);g.rotation.y=a.spinAngle||0
    const r=boss?a.action.r:a.spinRadius
    g.children[0].scale.setScalar(r);g.children[1].scale.setScalar(r*.8);g.children[1].rotation.y=Math.PI
   }
   for(const z of game.telegraphs){
    const key=z.id;keys.add(key)
    const g=get(key,'telegraph',g=>{mesh(g,z.kind==='lane'?lane:disc,0xcc423c,.2);mesh(g,z.kind==='lane'?lane:ring,0xffab79,.85)})
    // A phase change can switch a boss warning from a lane to a circle.
    const isLane=z.kind==='lane',isFan=z.kind==='fan'
    g.children[0].geometry=isLane?lane:isFan?fan:disc;g.children[1].geometry=isLane?lane:isFan?fanEdge:ring
    g.position.set(z.x,heightAt(z.x,z.z)+.17,z.z);g.rotation.y=isFan?z.angle:0
    if(isLane){const length=Math.hypot(z.targetX-z.x,z.targetZ-z.z);g.position.x=(z.x+z.targetX)/2;g.position.z=(z.z+z.targetZ)/2;g.rotation.y=Math.atan2(z.targetX-z.x,z.targetZ-z.z);g.children[0].scale.set(z.r*2,1,length);g.children[1].scale.set(z.r*2,1,length*z.progress);g.children[1].position.z=-length*(1-z.progress)/2}
    else{g.children[0].scale.setScalar(z.r);g.children[1].scale.setScalar(z.r*Math.max(.12,z.progress));g.children[1].position.z=0}
    g.children[0].material.opacity=z.active?.16:.22;g.children[1].material.opacity=z.active?.5:.85
   }
   for(const key of objects.keys())if(!keys.has(key))remove(key)
  },
  clear(){for(const key of objects.keys())remove(key)},
  dispose(){this.clear();pool.dispose();geometries.forEach(g=>g.dispose());flame.userData.dispose()}
 }
}
