// Keep the original forest marks, but let the camera skip entire off-screen tiles.
// Their authored positions, colors and random seeds are preserved byte for byte.
export function cullForest(T,group){
 let tiles=0,marks=0
 for(const mesh of [...group.children]){
  const original=mesh.geometry,positions=original?.getAttribute('aPos')
  if(!original?.isInstancedBufferGeometry||!positions?.isInstancedBufferAttribute)continue
  const buckets=new Map()
  for(let i=0;i<positions.count;i++){
   const key=Math.floor(positions.getX(i)/20)+','+Math.floor(positions.getZ(i)/20)
   if(!buckets.has(key))buckets.set(key,[])
   buckets.get(key).push(i)
  }
  for(const ids of buckets.values()){
   const geometry=new T.InstancedBufferGeometry()
   geometry.setIndex(original.index)
   for(const [name,attribute] of Object.entries(original.attributes)){
    if(!attribute.isInstancedBufferAttribute){geometry.setAttribute(name,attribute);continue}
    const values=new attribute.array.constructor(ids.length*attribute.itemSize)
    ids.forEach((id,i)=>values.set(attribute.array.subarray(id*attribute.itemSize,(id+1)*attribute.itemSize),i*attribute.itemSize))
    geometry.setAttribute(name,new T.InstancedBufferAttribute(values,attribute.itemSize,attribute.normalized,attribute.meshPerAttribute))
   }
   geometry.instanceCount=ids.length
   const bounds=new T.Box3(),point=new T.Vector3()
   for(const id of ids)bounds.expandByPoint(point.fromBufferAttribute(positions,id))
   bounds.expandByScalar(6);geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new T.Sphere())
   const tile=new T.Mesh(geometry,mesh.material)
   tile.position.copy(mesh.position);tile.quaternion.copy(mesh.quaternion);tile.scale.copy(mesh.scale)
   tile.layers.mask=mesh.layers.mask;tile.renderOrder=mesh.renderOrder;tile.frustumCulled=true
   group.add(tile);tiles++;marks+=ids.length
  }
  group.remove(mesh);original.dispose()
 }
 return {tiles,marks}
}
