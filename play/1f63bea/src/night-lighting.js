import {createNightAtmosphere} from './night-atmosphere.js'
// A shared palette transition; compiled once, with no extra per-object light passes.
export function createNightLighting(T,world,camera,heightAt){
 const night={value:0},seen=new WeakSet()
 const patch=src=>src.replace(/vec3 hazed\(vec3 c, vec3 world\) \{[\s\S]*?\n\}/,`vec3 hazed(vec3 c, vec3 world) {
  if(uJourneyNight<.001)return mix(c,airColour(normalize(world-cameraPosition)),mistBetween(world));
  float value=dot(c,vec3(.30,.59,.11));
  vec3 moon=mix(vec3(.025,.045,.085),vec3(.28,.43,.56),pow(clamp(value,0.,1.),.85));
  moon+=c*vec3(.045,.065,.10);
  float moonPatch=pow(max(0.0,cos((world.x+world.z*.75)*.42)),8.0);
  moon+=vec3(.105,.16,.21)*moonPatch*value;
  float warm=exp(-length(world.xz-uFocus.xz)*.21)*.22;
  moon=mix(moon,c*.78,warm);c=mix(c,moon,uJourneyNight);
  return mix(c,airColour(normalize(world-cameraPosition)),mistBetween(world));
 }`)
 function style(m){
  if(seen.has(m))return;seen.add(m)
  if(m.isShaderMaterial){m.uniforms.uJourneyNight=night;m.vertexShader='uniform float uJourneyNight;\n'+patch(m.vertexShader);m.fragmentShader='uniform float uJourneyNight;\n'+patch(m.fragmentShader)}
  else{
   const before=m.onBeforeCompile.bind(m),key=m.customProgramCacheKey.bind(m)
   m.onBeforeCompile=shader=>{before(shader);shader.uniforms.uJourneyNight=night;shader.vertexShader='uniform float uJourneyNight;\n'+patch(shader.vertexShader);shader.fragmentShader='uniform float uJourneyNight;\n'+patch(shader.fragmentShader)
    if(shader.fragmentShader.includes('uCelFlash'))shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,outgoingLight*vec3(.70,.80,1.02)+vec3(.012,.02,.035),uJourneyNight);\n#include <opaque_fragment>')
   };m.customProgramCacheKey=()=>key()+'-journey-night-v4'
  }
  m.needsUpdate=true
 }
 const prepareRoot=root=>root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))style(m)})
 const colors={uHaze:[.055,.11,.17],uHazeSun:[.17,.27,.36],uHazeGlow:[.012,.022,.035],uLampCol:[1,.65,.27]}
 const day=Object.fromEntries(Object.keys(colors).map(k=>[k,world.shared[k].value.clone()]))
 const dusk=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,new T.Color(...c)])),background=world.scene.background.clone(),nightSky=new T.Color(.035,.055,.095)
 prepareRoot(world.scene)
 const atmosphere=createNightAtmosphere(T,camera,heightAt);world.scene.add(atmosphere);atmosphere.visible=false
 return {prepareRoot,update(amount,time){
  night.value=amount
  world.scene.background.copy(background).lerp(nightSky,amount)
  for(const key of Object.keys(colors))world.shared[key].value.copy(day[key]).lerp(dusk[key],amount)
  world.shared.uHazeDensity.value=T.MathUtils.lerp(world.shared.uHazeDensity.value,.012,amount)
  world.shared.uLamp.value.w=T.MathUtils.lerp(world.shared.uLamp.value.w,.9,amount)
  atmosphere.userData.update(amount,time)
 }}
}
