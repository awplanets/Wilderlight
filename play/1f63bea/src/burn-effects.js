import {createCelFlame} from './cel-flame.js'

// All burning targets share three cartoon flame layers and three draw calls.
// No sprite downloads, per-tick particles, audio voices or per-enemy materials.
export function createBurnEffects(T,scene,{heightAt,displaySpace}){
 const flame=createCelFlame(T,{displaySpace,animated:true,flat:true})
 let capacity=64
 const make=()=>flame.children.map(layer=>{
  layer.updateMatrix()
  const batch=new T.InstancedMesh(layer.geometry,layer.material,capacity)
  batch.count=0;batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(batch);return batch
 })
 let batches=make()
 const position=new T.Vector3(),scale=new T.Vector3(),matrix=new T.Matrix4(),layerMatrix=new T.Matrix4()
 return {
  prewarm(draw){
   for(const b of batches){b.count=1;b.setMatrixAt(0,matrix.identity());b.instanceMatrix.needsUpdate=true}
   try{draw(batches)}finally{for(const b of batches){b.count=0;scene.add(b)}}
  },
  update(game,camera){
   let count=0
   for(const enemy of game.enemies)if(enemy.hp>0&&enemy.burnLeft>0)count++
   if(count>capacity){while(capacity<count)capacity*=2;for(const b of batches){scene.remove(b);b.dispose()}batches=make()}
   flame.userData.flameClock.value=game.time
   let index=0
   for(const e of game.enemies){
    if(e.hp<=0||!(e.burnLeft>0))continue
    const size=(e.kind==='boss'?.58:.34)*Math.min(1,e.burnLeft/.3)
    position.set(e.x,heightAt(e.x,e.z)+(e.kind==='boss'?1.15:.65)+(e.jumpY||0),e.z)
    matrix.compose(position,camera.quaternion,scale.setScalar(size))
    for(let i=0;i<batches.length;i++){layerMatrix.multiplyMatrices(matrix,flame.children[i].matrix);batches[i].setMatrixAt(index,layerMatrix)}
    index++
   }
   for(const b of batches){b.count=index;if(index)b.instanceMatrix.needsUpdate=true}
  },
  clear(){for(const b of batches)b.count=0},
  dispose(){for(const b of batches){scene.remove(b);b.dispose()}flame.userData.dispose()}
 }
}
