// Same world-space bars, batched into three draws instead of two per character.
export function createHealthBars(T,scene,geometry,paint){
 let capacity=64,back=new T.InstancedMesh(geometry,paint[0],capacity),heroFill=new T.InstancedMesh(geometry,paint[1],capacity),enemyFill=new T.InstancedMesh(geometry,paint[2],capacity)
 let batches=[back,heroFill,enemyFill],position=new T.Vector3(),offset=new T.Vector3(),scale=new T.Vector3(),matrix=new T.Matrix4()
 for(const batch of batches){batch.count=0;batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(batch)}
 back.renderOrder=20;heroFill.renderOrder=enemyFill.renderOrder=21
 return {
  prewarm(draw){
   // Allocate the instanced GPU buffers before chapter one becomes visible.
   const parents=batches.map(batch=>batch.parent)
   for(const batch of batches){batch.count=1;batch.setMatrixAt(0,matrix.identity());batch.instanceMatrix.needsUpdate=true}
   try{draw(batches)}finally{batches.forEach((batch,i)=>{batch.count=0;parents[i]?.add(batch)})}
  },
  begin(required=64){
   if(required>capacity){
    while(capacity<required)capacity*=2
    const next=batches.map(old=>{const m=new T.InstancedMesh(geometry,old.material,capacity);m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.renderOrder=old.renderOrder;scene.remove(old);old.dispose();scene.add(m);return m})
    ;[back,heroFill,enemyFill]=next;batches=next
   }
   for(const batch of batches)batch.count=0
  },
  add(data,headY,camera,heightAt){
   const hero=typeof data.id==='string',width=hero?1.18:1,fill=hero?heroFill:enemyFill,ratio=Math.max(0,data.hp/data.maxHp)
   if(back.count>=capacity||fill.count>=capacity)return
   position.set(data.x,heightAt(data.x,data.z)+headY+(data.jumpY||0),data.z)
   matrix.compose(position,camera.quaternion,scale.set(width,.155,1));back.setMatrixAt(back.count++,matrix)
   offset.set((ratio-1)*(width-.05)/2,0,0).applyQuaternion(camera.quaternion);position.add(offset)
   matrix.compose(position,camera.quaternion,scale.set((width-.05)*ratio,.085,1));fill.setMatrixAt(fill.count++,matrix)
  },
  end(){for(const batch of batches)batch.instanceMatrix.needsUpdate=true},
  dispose(){for(const batch of batches){scene.remove(batch);batch.dispose()}}
 }
}
