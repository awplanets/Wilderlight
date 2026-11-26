// Approved moonlight and fireflies. Driven by the existing game clock.
export function createNightAtmosphere(T,camera,heightAt){
 const group=new T.Group(),time={value:2},night={value:1}
 const rayMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  uniforms:{uTime:time,uNight:night},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uNight;void main(){
   float edge=pow(max(0.0,sin(vUv.x*3.141593)),1.5);
   float fade=smoothstep(0.0,0.12,vUv.y)*(1.0-smoothstep(0.65,1.0,vUv.y));
   float grain=0.87+0.13*sin(vUv.y*35.0+vUv.x*14.0+uTime*0.3);
   gl_FragColor=vec4(0.48,0.70,0.95,edge*fade*grain*0.24*uNight);
  }`})
 const vertices=[],uv=[]
 for(let i=0;i<4;i++){
  const start=new T.Vector3(2.3+i*4.0,17,-18+i*.9),end=start.clone().add(new T.Vector3(-12,-17,16))
  const axis=end.clone().sub(start),view=camera.position.clone().sub(start.clone().lerp(end,.5))
  const side=new T.Vector3().crossVectors(axis,view).normalize(),top=.56+i*.085,bottom=1.4+i*.18
  const a=start.clone().addScaledVector(side,-top),b=start.clone().addScaledVector(side,top)
  const c=end.clone().addScaledVector(side,-bottom),d=end.clone().addScaledVector(side,bottom)
  for(const p of [a,b,c,c,b,d])vertices.push(p.x,p.y,p.z)
  uv.push(0,0,1,0,0,1,0,1,1,0,1,1)
 }
 const rays=new T.BufferGeometry();rays.setAttribute('position',new T.Float32BufferAttribute(vertices,3));rays.setAttribute('uv',new T.Float32BufferAttribute(uv,2))
 const rayMesh=new T.Mesh(rays,rayMaterial);rayMesh.renderOrder=4;group.add(rayMesh)
 const positions=[],seeds=[]
 const random=i=>{const n=Math.sin(i*127.1+73.2)*43758.5453;return n-Math.floor(n)}
 for(let i=0;i<24;i++){
  const x=(random(i*3)-.5)*25,z=(random(i*3+1)-.55)*33
  positions.push(x,heightAt(x,z)+.6+random(i*3+2)*2.1,z);seeds.push(random(i+130))
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,1))
 const flies=new T.Points(geometry,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:time,uNight:night},
  vertexShader:`attribute float aSeed;uniform float uTime;varying float vGlow;void main(){
   vec3 p=position; p.x+=sin(uTime*0.6+aSeed*24.0)*0.32;p.y+=sin(uTime*0.9+aSeed*17.0)*0.18;
   vec4 eye=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*eye;
   vGlow=0.86+0.14*sin(uTime*1.1+aSeed*40.0);gl_PointSize=clamp((360.0+aSeed*180.0)/-eye.z,8.0,24.0);
  }`,
  fragmentShader:`varying float vGlow;uniform float uNight;void main(){
   float radius=length(gl_PointCoord-0.5);if(radius>0.5)discard;
   float core=1.0-smoothstep(0.06,0.18,radius),halo=exp(-radius*radius*20.0)*0.54;
   gl_FragColor=vec4(mix(vec3(0.65,0.95,0.22),vec3(1.0,0.98,0.66),core),min(1.0,core+halo)*vGlow*uNight);
  }`}))
 flies.renderOrder=5;group.add(flies)
 group.userData.update=(amount,clock)=>{group.visible=amount>0;night.value=amount;time.value=clock}
 return group
}
