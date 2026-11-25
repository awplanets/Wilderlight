import * as T from 'three'
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js'
import {uiState} from './hud-state.js'
import {createBattleSound} from './audio.js'
import {createEffects} from './effects.js'
import {Game} from './simulation.js'
import {models} from './models.js'
import {sourceWorld} from './original-world.js'
import {cullForest} from './forest-culling.js'
import {batchActorAsset} from './actor-assets.js'
import {createActorPool} from './actor-pool.js'
import {createHealthBars} from './health-bars.js'
import {createNightLighting} from './night-lighting.js'
import {CHAPTER_TRANSITION_SECONDS} from './combat-rules.js'

/** @param {{reviewMode?:boolean,onRankingEvent?:((event:{type:string,stage:number,wave:number,time:number,kills:number})=>void)|null}} [options] */
export function createJourney(api,info,notify,options={}){
 const reviewMode=false,onRankingEvent=options.onRankingEvent
 console.info('Wilderlight runtime version','chapters-20261124-r12-resources')

 const renderer=new T.WebGLRenderer({canvas:info.node,antialias:false,powerPreference:'high-performance'})
 renderer.autoClear=false;renderer.outputColorSpace=T.LinearSRGBColorSpace
 function resizeRenderer(width,height){
  // Bound the offscreen color/depth passes on large desktop displays.
  const ratio=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(2100000/(width*height)))
  renderer.setPixelRatio(ratio);renderer.setSize(width,height,false)
 }
 resizeRenderer(info.width,info.height)
 const {makeWorld,ActorView,Opening,GAME_CAMERA_OFFSET,heightAt,OBSTACLES}=sourceWorld(T)
 const game=new Game({obstacles:OBSTACLES}),opening=new Opening(),sound=createBattleSound(api)
 const camera=new T.PerspectiveCamera(52,info.width/info.height,.2,210)
 const focus=new T.Vector3(),desired=new T.Vector3(),right=new T.Vector3(),ray=new T.Raycaster(),point=new T.Vector3(),floor=new T.Plane(new T.Vector3(0,1,0),0)
 const loader=new GLTFLoader(),loaded={},actors=new Map(),retiredPools=[],stick={x:0,y:0}
 const bufferSize=new T.Vector2(),shadeAt=new T.Vector3(),headHeights=new Map(),present=new Set()
 const warmScene=new T.Scene(),warmCamera=new T.OrthographicCamera(-4,4,4,-4,.1,30),warmTarget=new T.WebGLRenderTarget(16,16)
 warmCamera.position.set(0,2,8);warmCamera.lookAt(0,1,0)
 const metrics={frames:0,longFrames:0,maxFrameMs:0,maxActorMs:0,timings:{},renderCalls:0,triangles:0,batchPartsRemoved:0,lastStage:"loading"}
 const clockNow=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now()
 function recordCost(name,start){const value=clockNow()-start,entry=metrics.timings[name]||(metrics.timings[name]={samples:0,total:0,max:0});entry.samples++;entry.total+=value;entry.max=Math.max(entry.max,value)}
 const gaugeGeometry=new T.PlaneGeometry(1,1)
 const gaugePaint=[0x203c33,0xa7d1ab,0xdc896d].map(hex=>new T.MeshBasicMaterial({color:new T.Color(hex).convertLinearToSRGB(),depthTest:false,depthWrite:false}))
 const shaderErrors=[]
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{
  const message=[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join('\n')
  shaderErrors.push(message);console.error('Wilderlight original shader',message)
 }
 let lighting=null,world=null,fx=null,pool=null,bars=null,stopped=false,visible=true,assetsReady=false,ready=false,firstFrameReady=false,combatWarm=false,loadingProgress=0,completedModels=0,last,lag=0,uiTime=0,visualTime=0,error=''
 function announce(){
  if(stopped)return
  const run=uiState(game)
  if(game.phase==='transition'&&!pool?.complete)run.transition=Math.min(run.transition,.84)
  notify({phase:error?'error':!firstFrameReady?'loading':opening.mode==='departing'?'departing':game.phase,wave:game.wave,chapter:game.wave,kills:game.kills,dash:Math.ceil(game.dashCooldown),run,loadingProgress,error})
 }
 function reportProgress(value){if(stopped||error)return;loadingProgress=Math.max(loadingProgress,value);announce()}
 function createActor(data){
  const hero=typeof data.id==='string',view=new ActorView(data,loaded,world.shared,world.scene,{hero}),key=(hero?'hero-':data.faction+'-')+data.kind
  lighting?.prepareRoot(view.object)
  if(!headHeights.has(key))headHeights.set(key,new T.Box3().setFromObject(view.object).max.y-view.object.position.y+.2)
  return {view,headY:headHeights.get(key),display:{}}
 }
 function destroyActor(item){item.view.dispose(world.scene)}
 function detachActor(item){world.scene.remove(item.view.object,item.view.ring)}
 function resetActor(item,data){item.display={};item.view.reset(data);world.scene.add(item.view.object)}
 function warmActor(item){
  item.view.prewarm();item.view.update(item.view.data,0,'playing');warmScene.add(item.view.object)
  const target=renderer.getRenderTarget()
  try{renderer.setRenderTarget(warmTarget);renderer.clear();renderer.render(warmScene,warmCamera)}
  finally{renderer.setRenderTarget(target);warmScene.remove(item.view.object)}
 }
 function addActor(data){
  const item=typeof data.id==='string'?createActor(data):pool.acquire(data)
  actors.set(data.id,item);return item
 }
 function removeActor(item){if(item.poolKind)pool.release(item);else destroyActor(item)}
 function updateActors(dt){
  present.clear();bars.begin(game.heroes.length+game.enemies.length)
  for(const data of game.heroes)present.add(data.id)
  for(const data of game.enemies)present.add(data.id)
  // Recycle completed death animations before activating this frame's batch.
  for(const [id,item]of actors)if(!present.has(id)){removeActor(item);actors.delete(id)}
  const alpha=game.phase==='playing'?Math.min(1,lag*60):1
  function update(data){
   const item=actors.get(data.id)||addActor(data),display=Object.assign(item.display,data)
   display.x=(data.px??data.x)+(data.x-(data.px??data.x))*alpha
   display.z=(data.pz??data.z)+(data.z-(data.pz??data.z))*alpha
   item.view.update(display,dt,game.phase)
   if(game.phase==='ready')item.view.ring.visible=false
   if(game.phase==='playing'&&data.hp>0)bars.add(display,item.headY,camera,heightAt)
  }
  for(const data of game.heroes)update(data)
  for(const data of game.enemies)update(data)
  bars.end()
 }
 function changePool(faction){
  if(pool?.faction===faction)return
  for(const [id,item]of actors)if(item.poolKind){removeActor(item);actors.delete(id)}
  if(pool)retiredPools.push(pool);pool=createActorPool({create:createActor,reset:resetActor,detach:detachActor,destroy:destroyActor,warm:warmActor,faction})
 }
 function prepareMenu(){
  if(!reviewMode){firstFrameReady=false;combatWarm=false;loadingProgress=.94;sound.loadingMusic()}
  sound.stop();fx?.clear();actors.forEach(removeActor);actors.clear();game.reset(false);sound.update(game,0);opening.reset();opening.apply(game);changePool("goblin");lighting?.update(0,0)
  game.heroes.forEach((hero,i)=>{const {view}=addActor(hero);view.prewarm();view.setAction('Running_A',0,{speed:hero.moving/5});view.current.time=i*.19;view.strideTime=i*.19;view.ring.visible=false})
  lag=0;stick.x=stick.y=0
 }
 function stickDirection(){
  right.set(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize()
  return right.set(stick.x*right.x-stick.y*right.z,0,stick.x*right.z+stick.y*right.x)
 }
 function cameraPose(dt){
  if(game.phase==='ready'){
   const pose=opening.pose;camera.position.copy(pose.position)
   if(camera.aspect<1)camera.position.sub(pose.look).multiplyScalar(T.MathUtils.lerp(Math.min(2.5,1.22/camera.aspect),1.35,pose.blend)).add(pose.look)
   camera.lookAt(pose.look);camera.fov=pose.fov
  }else{
   desired.set(game.centroid.x,.25,game.centroid.z-1.6);focus.lerp(desired,1-Math.exp(-dt*5))
   camera.position.copy(focus).addScaledVector(GAME_CAMERA_OFFSET,camera.aspect<1?1.35:1);camera.lookAt(focus);camera.fov=47
  }
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true)
 }
 function initialize(){
  if(stopped||!visible||!assetsReady||world)return
  try{
   reportProgress(.84)
   world=makeWorld(renderer,loaded);cullForest(T,world.forest.group);world.setQuality(true)
   world.scene.matrixWorldAutoUpdate=false
   bars=createHealthBars(T,world.scene,gaugeGeometry,gaugePaint)
   cameraPose(0);const moonCamera=camera.clone();moonCamera.position.copy(GAME_CAMERA_OFFSET).multiplyScalar(camera.aspect<1?1.35:1).add(new T.Vector3(0,.25,-1.6));lighting=createNightLighting(T,world,moonCamera,heightAt);changePool("goblin")
   fx=createEffects(T,world.scene,loaded,{heightAt,displaySpace:true})
   prepareMenu();cameraPose(0);updateActors(0);reportProgress(.92)
   renderer.compile(world.scene,camera)
   if(shaderErrors.length)throw Error('original scene shader failed')
   ready=true;reportProgress(.94);if(reviewMode)paint(0)
  }catch(e){error='原版林地载入失败，请重试';console.error('Wilderlight opening',String(e));announce()}
 }
 function paint(t){
  try{return paintFrame(t)}catch(e){
   error="战场运行中断，请重新载入";renderer.setAnimationLoop(null);sound.stop();console.error("Wilderlight frame interrupted",{stage:game.stage,wave:game.wave,kills:game.kills,phase:game.phase,step:metrics.lastStage},e?.stack||String(e));announce()
  }
 }
 function paintFrame(t){
  if(stopped||!visible||!ready||error){last=undefined;return}
  // Prepare the whole chapter behind the existing loading screen. No full
  // forest redraw while warming, and no spare-model creation during combat.
  if(!firstFrameReady&&!reviewMode&&!pool.complete){
   metrics.lastStage='loading-pool';pool.prepareOne();reportProgress(.94+.055*pool.size/pool.total);last=t;return
  }
  if(!firstFrameReady&&!reviewMode&&!combatWarm){
   metrics.lastStage='loading-combat';const target=renderer.getRenderTarget()
   try{
    renderer.setRenderTarget(warmTarget);renderer.clear()
    bars.prewarm(batches=>{warmScene.add(...batches);renderer.render(warmScene,warmCamera)})
    fx.prewarm(batches=>{warmScene.add(...batches);renderer.render(warmScene,warmCamera)})
    // Hero floor rings are hidden in the opening, but visible on the first
    // combat frame. Upload their unchanged materials/geometry here as well.
    for(const {view} of actors.values()){
     const ring=view.ring,parent=ring.parent,visible=ring.visible,culled=ring.frustumCulled
     try{warmScene.add(ring);ring.visible=true;ring.frustumCulled=false;renderer.render(warmScene,warmCamera)}
     finally{ring.visible=visible;ring.frustumCulled=culled;parent?.add(ring)}
    }
   }finally{renderer.setRenderTarget(target)}
   combatWarm=true;reportProgress(.998);last=t;return
  }
  const frameStart=clockNow(),raw=Math.max(0,(t-(last??t))/1000),dt=Math.min(.1,raw);last=t
  metrics.frames++;if(raw>.05)metrics.longFrames++;metrics.maxFrameMs=Math.max(metrics.maxFrameMs,raw*1000)
  metrics.lastStage="simulation";const simulationStart=clockNow()
  const frozen=['paused','choice','victory','defeat'].includes(game.phase),visualDt=frozen?0:dt
  visualTime+=visualDt
  if(game.phase==='ready'){
   const arrived=opening.update(opening.mode==='departing'?Math.min(.65,raw):visualDt)
   opening.apply(game)
   if(arrived){game.start(undefined,true);opening.apply(game);game.heroes.forEach(h=>{h.px=h.x;h.pz=h.z});opening.mode='playing';focus.copy(opening.pose.playFocus);lag=0;fx.clear();announce()}
  }else if(game.phase==='playing'){
   if(stick.x||stick.y){const direction=stickDirection();game.setDestination(game.centroid.x+3*direction.x,game.centroid.z+3*direction.z)}
   lag+=dt;while(lag>=1/60){game.tick(1/60);lag-=1/60}if(game.phase!=='playing')announce()
  }else if(game.phase==='transition'){
   if(pool.faction!=='skeleton'){fx.clear();changePool('skeleton')}
   if(stick.x||stick.y){const direction=stickDirection();game.setDestination(game.centroid.x+3*direction.x,game.centroid.z+3*direction.z)}
   game.tickTransition(dt,pool.complete);if(game.phase==='playing')announce()
  }else{lag=0;stick.x=stick.y=0}
  recordCost("simulation",simulationStart);metrics.lastStage="actors";cameraPose(dt);const actorStart=clockNow();updateActors(visualDt);recordCost("actors",actorStart);metrics.maxActorMs=Math.max(metrics.maxActorMs,clockNow()-actorStart)
  metrics.lastStage="audio";const audioStart=clockNow();sound.update(game,visualDt);const events=game.drain();sound.events(events);recordCost("audio",audioStart);metrics.lastStage="events";const eventStart=clockNow();for(const event of events){fx.onEvent(event);if(!reviewMode&&onRankingEvent&&['start','clear','chapter-transition','victory'].includes(event.type))onRankingEvent({type:event.type,stage:game.stage,wave:game.wave,time:event.time,kills:game.kills})}recordCost("events",eventStart)
  metrics.lastStage="world";world.update(visualDt,visualTime,game.centroid,game.wave)
  const night=game.stage===1?1:T.MathUtils.smoothstep(game.transitionElapsed/CHAPTER_TRANSITION_SECONDS,.08,.9)
  lighting.update(night,visualTime)
  for(let i=0;i<world.shrines.length;i++){const shown=!game.shrines[i].used;world.shrines[i].orb.visible=shown;world.shrines[i].ring.visible=shown}
  metrics.lastStage="effects";const effectStart=clockNow();fx.update(visualDt,game,camera);recordCost("effects",effectStart)
  const size=renderer.getDrawingBufferSize(bufferSize);world.shared.uPixel.value=2*Math.tan(T.MathUtils.degToRad(camera.fov)/2)/size.y
  // Both passes consume the same transforms, so update the hierarchy once.
  metrics.lastStage="matrices";const matrixStart=clockNow();world.scene.updateMatrixWorld();recordCost("matrices",matrixStart)
  renderer.info.autoReset=false;renderer.info.reset();const renderStart=clockNow();metrics.lastStage="shadow";world.shade.update(world.scene,shadeAt.set(game.centroid.x,heightAt(game.centroid.x,game.centroid.z),game.centroid.z))
  metrics.lastStage="render";try{world.frame.render(world.scene,camera)}catch(e){error='原版林地载入失败，请重试';console.error('Wilderlight render',String(e));announce();return}
  recordCost("renderSubmit",renderStart);metrics.renderCalls=renderer.info.render.calls;metrics.triangles=renderer.info.render.triangles
  // Keep the opaque loading screen until the real opening has drawn a frame.
  if(!firstFrameReady){firstFrameReady=true;loadingProgress=1;announce()}
  uiTime+=dt;if(uiTime>.08){if(['playing','transition','intro'].includes(game.phase))announce();uiTime=0}
  // One reserve actor at most, after the visible frame; never build the whole
  // reserve in one callback. Hidden/disposed scenes cannot reach this work.
  metrics.lastStage="pool"
  if(retiredPools.length){if(!retiredPools[0].retireOne()){retiredPools[0].dispose();retiredPools.shift()}}
  if(game.phase==='transition'&&!pool.complete)pool.prepareOne()
  recordCost('frameWork',frameStart)
 }
 renderer.setAnimationLoop(reviewMode?null:paint)
 function disposeAssets(){const geometries=new Set(),materials=new Set(),textures=new Set();for(const asset of Object.values(loaded))asset.scene.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of [].concat(n.material)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value)}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}
 const modelEntries=Object.entries(models)
 Promise.all(modelEntries.map(async([name,url])=>{const asset=await loader.loadAsync(url);if(!stopped&&name.startsWith('skeleton-')&&asset.animations.length)metrics.batchPartsRemoved+=batchActorAsset(T,asset);loaded[name]=asset;if(stopped)disposeAssets();else reportProgress(++completedModels/modelEntries.length*.8)})).then(()=>{
  for(const [name,source]of Object.entries({'goblin-small':'knight','goblin-armored':'knight','goblin-archer':'ranger','goblin-officer':'knight'})){
   const asset=loaded[name];if(!asset)continue
   const nodes=new Set();asset.scene.traverse(n=>nodes.add(n.name))
   asset.animations=loaded[source].animations.map(c=>new T.AnimationClip(c.name,c.duration,c.tracks.filter(t=>nodes.has(T.PropertyBinding.parseTrackName(t.name).nodeName))))
  }
  assetsReady=true;initialize()
 }).catch(e=>{if(!stopped){error='模型载入失败，请重试';console.error('Wilderlight models',String(e));announce()}})
 return {
  resize(width,height){
   if(stopped || width<1 || height<1)return
   info.width=width;info.height=height
   camera.aspect=width/height;camera.updateProjectionMatrix()
   resizeRenderer(width,height);world?.frame.resize()
  },
  unlockAudio(){sound.unlock()},
  playbackReady(){if(!stopped&&!error&&firstFrameReady)sound.prepareMusic()},
  sound(muted){sound.setMuted(muted)},
  quality(fine){renderer.setPixelRatio(fine?1.5:1.25);renderer.setSize(info.width,info.height,false);world?.setQuality(!fine);world?.frame.resize()},
  steer(x,y){stick.x=x;stick.y=y;if(!x&&!y)game.setDestination(game.centroid.x,game.centroid.z)},
  lead(u,v){stick.x=stick.y=0;ray.setFromCamera(new T.Vector2(u*2-1,1-v*2),camera);if(ray.ray.intersectPlane(floor,point))game.setDestination(point.x,point.z)},
  chooseBoon(id){if(!stopped&&firstFrameReady&&!error&&game.chooseBoon(id))announce()},
  action(id){if(stopped||!firstFrameReady||error)return;if(id==='start'){if(game.phase!=='ready')prepareMenu();sound.unlock();opening.begin()}else if(id==='camp')prepareMenu();else if(id==='dash'){const c=game.centroid,d=game.destination;if(stick.x||stick.y){const direction=stickDirection();game.dash(c.x+3*direction.x,c.z+3*direction.z)}else if(Math.hypot(c.x-d.x,c.z-d.z)<.2)game.dash(c.x+Math.sin(game.heading),c.z+Math.cos(game.heading));else game.dash()}else if(id==='pause'){game.pause();sound.stop();sound.update(game,0)}else if(id==='resume'){game.resume();sound.update(game,0);sound.unlock()}announce()},
  show(on){if(stopped||visible===on)return;visible=on;last=undefined;sound.show(on);if(!on){renderer.setAnimationLoop(null);if(['playing','transition','intro'].includes(game.phase))game.pause();sound.update(game,0);console.log('Wilderlight scene hidden')}else{initialize();renderer.setAnimationLoop(reviewMode?null:paint);console.log('Wilderlight scene visible')}announce()},
  dispose(){if(stopped)return;stopped=true;sound.dispose();renderer.setAnimationLoop(null);fx?.dispose();actors.forEach(removeActor);actors.clear();pool?.dispose();retiredPools.forEach(p=>p.dispose());bars?.dispose();warmTarget.dispose();if(world){
   const gs=new Set(),ms=new Set(),ts=new Set();for(const root of [world.scene,world.forest.shade])root.traverse(n=>{if(n.isMesh||n.isPoints){gs.add(n.geometry);for(const m of [].concat(n.material)){ms.add(m);for(const value of Object.values(m))if(value?.isTexture)ts.add(value)}}});
   for(const uniform of Object.values(world.shared))if(uniform.value?.isTexture)ts.add(uniform.value)
   world.shade.dispose();world.frame.dispose();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose())
  }disposeAssets();gaugeGeometry.dispose();gaugePaint.forEach(m=>m.dispose());renderer.dispose()}
 }
}
