// Lossless batching: only sibling skin meshes with the exact same material,
// skeleton, transform and vertex layout may share one draw. No vertex reduction.
export function batchActorAsset(T,asset){
 const groups=new Map(),retired=new Set(),tracked=new Set()
 for(const clip of asset.animations)for(const track of clip.tracks)tracked.add(track.name.split('.')[0])
 asset.scene.updateMatrixWorld(true)
 asset.scene.traverse(mesh=>{
  const g=mesh.geometry
  if(!mesh.isSkinnedMesh||Array.isArray(mesh.material)||mesh.children.length||tracked.has(mesh.name)||g.groups.length||Object.keys(g.morphAttributes).length)return
  const attributes=Object.keys(g.attributes).sort()
  const key=[mesh.parent.uuid,mesh.material.uuid,mesh.skeleton.bones.map(b=>b.uuid).join(','),mesh.skeleton.boneInverses.map(m=>m.elements.join(',')).join('|'),mesh.bindMode,mesh.bindMatrix.elements.join(','),mesh.matrix.elements.join(','),attributes.map(k=>{const a=g.attributes[k];return [k,a.itemSize,a.normalized,a.array.constructor.name].join(':')}).join('|')].join(';')
  if(!groups.has(key))groups.set(key,[])
  groups.get(key).push(mesh)
 })
 let removed=0
 for(const meshes of groups.values()){
  if(meshes.length<2)continue
  const geometry=new T.BufferGeometry(),first=meshes[0],count=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0)
  for(const name of Object.keys(first.geometry.attributes)){
   const a=first.geometry.attributes[name],array=new a.array.constructor(count*a.itemSize);let offset=0
   for(const mesh of meshes){
    const b=mesh.geometry.attributes[name]
    if(b.isInterleavedBufferAttribute){for(let i=0;i<b.count;i++)for(let k=0;k<b.itemSize;k++)array[offset++]=b.data.array[i*b.data.stride+b.offset+k]}
    else{array.set(b.array,offset);offset+=b.array.length}
   }
   geometry.setAttribute(name,new T.BufferAttribute(array,a.itemSize,a.normalized))
  }
  const indexCount=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count),0)
  const indices=count>65535?new Uint32Array(indexCount):new Uint16Array(indexCount);let offset=0,vertex=0
  for(const mesh of meshes){const g=mesh.geometry,n=g.index?.count||g.attributes.position.count;for(let i=0;i<n;i++)indices[offset++]=vertex+(g.index?g.index.getX(i):i);vertex+=g.attributes.position.count;retired.add(g)}
  geometry.setIndex(new T.BufferAttribute(indices,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();first.geometry=geometry
  for(const mesh of meshes.slice(1)){mesh.removeFromParent();removed++}
 }
 // Removed source geometries were never uploaded. Retain only geometries still
 // referenced by another node; otherwise drop their CPU arrays with the loader.
 const used=new Set();asset.scene.traverse(m=>{if(m.isMesh)used.add(m.geometry)})
 for(const geometry of retired)if(!used.has(geometry))geometry.dispose()
 return removed
}
