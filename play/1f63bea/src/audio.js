import {soundAssets} from './sound-assets.js'

import {createChapterMusic} from './chapter-music.js'

export function createBattleSound(api,options={}){
 const voices=[],last=new Map(),lastFamily=new Map(),stats={voicesCreated:0,sourceChanges:0,replays:0,plays:0,started:0,ended:0,errors:0,stops:0,coalesced:0,limited:0}
 let unlocked=false,hidden=false,disposed=false,muted=false,clock=0,stepClock=0,foot=0,phase='ready'
 const music=createChapterMusic(api,options)
 let capacity=5
 try{if(/android/i.test(api.getSystemInfoSync?.().platform||''))capacity=1}catch{capacity=1}
 const ordinaryCapacity=capacity===1?1:3
 const family=name=>/^arrow[123]$/.test(name)?'arrows':name==='step-left'||name==='step-right'?'footsteps':name
 function stopVoice(v,force=false){if(!v.busy&&!force)return;try{v.audio.stop();v.rewound=true;stats.stops++}catch{ /* Stop is idempotent across host lifecycle callbacks. */ }v.busy=false}
 function stop(silence=false){for(const v of voices){if(silence&&v.volume!==0){try{v.audio.volume=0;v.volume=0}catch{v.volume=null}}stopVoice(v,silence);v.priority=0}stepClock=0}
 function play(name,volume=.5,priority=2,gap=.12){
  const asset=soundAssets[name]
  if(!asset||!unlocked||hidden||disposed||muted)return false
  if(clock-(last.get(name)??-100)<gap)return false
  const group=family(name),ordinary=priority<4
  if(clock-(lastFamily.get(group)??-100)<.1){stats.coalesced++;return false}
  // Keep two of the five SFX lanes available to important cues. The platform's
  // existing single-voice Android fallback still allows priority interruption.
  if(ordinary){let busy=0;for(const voice of voices)if(voice.busy&&voice.priority<4)busy++;if(busy>=ordinaryCapacity){stats.limited++;return false}}
  const idle=voices.findIndex(v=>!v.busy),cached=voices.findIndex(v=>!v.busy&&v.source===asset.url)
  // Keep the original logical slot order: equal-priority stealing must not
  // change just because an idle decoder already holds the requested sound.
  if(cached>idle&&idle>=0){const first=voices[idle];voices[idle]=voices[cached];voices[cached]=first}
  let v=voices[idle]
  if(!v&&voices.length<capacity){
   try{
    const audio=api.createInnerAudioContext();v={audio,busy:false,priority:0,until:0,source:null,volume:null,rewound:true};voices.push(v);stats.voicesCreated++
    const voice=v
    // Match media playback: the ringtone silent switch must not mute battle SFX.
    // Explicit in-game mute and pause/hide still stop every voice below.
    audio.autoplay=false;audio.loop=false;audio.obeyMuteSwitch=false
    audio.onPlay(()=>{
     if(disposed)return
     if(muted||hidden||!voice.busy){try{audio.volume=0;voice.volume=0}catch{voice.volume=null}stopVoice(voice,true);return}
     stats.started++
    })
    audio.onEnded(()=>{voice.busy=false;stats.ended++})
    audio.onError(error=>{voice.busy=false;voice.source=null;stats.errors++;console.error('Wilderlight sound effect',{src:voice.audio.src,error})})
   }catch(error){console.error('Wilderlight audio unavailable',error);return false}
  }
  if(!v){if(ordinary){stats.limited++;return false}v=voices.reduce((a,b)=>a.priority<b.priority?a:b);if(v.priority>priority||v.until-clock>.12&&v.priority===priority)return false;stopVoice(v)}
  try{
   let reuse=v.source===asset.url&&(v.rewound||typeof v.audio.seek==='function')
   if(reuse&&!v.rewound){try{v.audio.seek(0);stats.replays++}catch{reuse=false}}
   if(!reuse){v.audio.src=asset.url;v.source=asset.url;stats.sourceChanges++}
   if(v.volume!==volume){v.audio.volume=volume;v.volume=volume}
   v.priority=priority;v.busy=true;v.rewound=false;v.until=clock+asset.duration+.3
   v.audio.play();stats.plays++;last.set(name,clock);lastFamily.set(group,clock);return true
  }catch(error){v.busy=false;v.source=null;v.volume=null;console.error('Wilderlight sound playback',{src:asset.url,error});return false}
 }
 const eventSounds={'boss-phase':['boss-enrage',.65,5,.4],'boss-summon':['boss-leap',.45,3,.5],'officer-windup':['slash',.45,3,.3],'officer-sweep':['enemy-slash',.7,5,.3],'chapter-start':['boon',.6,4,.5],slash:['slash',.65,3,.13],'enemy-slash':['enemy-slash',.42,2,.2],hit:['hit',.28,1,.14],hurt:['hurt',.6,4,.18],dash:['dash',.7,5,.2],chain:['chain',.5,3,.16],ricochet:['ricochet',.62,3,.16],swordwave:['swordwave',.7,4,.2],whirlwind:['whirlwind',.65,4,.4],firefield:['firefield',.56,3,.7],counter:['slash',.65,3,.15],boon:['boon',.65,5,.2],pickup:['boon',.35,1,.35],heal:['boon',.35,1,.5],shrine:['boon',.65,4,.2],'boss-warning':['boss-warning',.7,5,.3],'boss-dash':['boss-dash',.8,5,.3],'boss-leap':['boss-leap',.75,5,.3],'boss-land':['boss-land',.8,5,.3],'boss-spin':['boss-spin',.72,5,.5],'boss-enrage':['boss-enrage',.8,5,.4],victory:['victory',.7,6,.5],defeat:['defeat',.7,6,.5]}
 const arrowSounds=[1,2,3].map(n=>['arrow'+n,.58,3,.15]),fireShot=['fire',.62,3,.16],shadowShot=['shadow',.43,2,.22],fireBurst=['fireburst',.65,3,.18],otherBurst=['boss-land',.6,4,.25]
 const soundQueues=Array.from({length:7},()=>[])
 const slots=new Map()
 for(const name of Object.keys(soundAssets))if(!slots.has(family(name)))slots.set(family(name),{event:null,sound:null,distance:0})
 function selection(e){
  if(e.type==='shot')return (e.kind==='bolt'||e.kind==='enemy-arrow')?arrowSounds[e.id%3]:e.kind==='fire'?fireShot:e.kind==='shadow'?shadowShot:null
  if(e.type==='burst')return e.kind==='fire'?fireBurst:otherBurst

  return eventSounds[e.type]
 }
 return {
  prepareMusic(){music.prepare()},
  loadingMusic(){music.loading()},
  unlock(){if(!disposed){unlocked=true;hidden=false;music.unlock()}},
  events(events){
   if(!unlocked||hidden||disposed||muted)return
   const battle=phase==='playing'||phase==='transition'
   // Collapse simultaneous copies before making any native audio calls. Keep
   // the highest-priority/nearest representative, rather than layering every hit.
   for(const e of events){
    if(!battle&&e.type!=='victory'&&e.type!=='defeat')continue
    const s=selection(e);if(!s)continue
    const distance=e.x===undefined?0:(e.x-(this.listener?.x||0))**2+(e.z-(this.listener?.z||0))**2
    if(distance>24*24)continue
    const slot=slots.get(family(s[0]));if(!slot)continue
    if(slot.event){stats.coalesced++;if(slot.sound[2]>s[2]||slot.sound[2]===s[2]&&slot.distance<=distance)continue}
    slot.event=e;slot.sound=s;slot.distance=distance
   }
   for(const slot of slots.values())if(slot.event)soundQueues[slot.sound[2]].push(slot)
   for(let priority=soundQueues.length-1;priority>=0;priority--){
    const queue=soundQueues[priority]
    for(const slot of queue){const s=slot.sound;play(s[0],s[1]*Math.max(.28,1-Math.sqrt(slot.distance)/35),s[2],s[3]);slot.event=null;slot.sound=null}
    queue.length=0
   }
  },
  update(game,dt){
   clock+=dt;this.listener=game.centroid
   if(game.phase!==phase){phase=game.phase;if(phase!=='playing')stop()}
   music.update(game,dt)
   for(const v of voices)if(v.busy&&clock>v.until)stopVoice(v)
   if(!['playing','transition'].includes(phase)||hidden||muted)return
   let count=0,movement=0,spinning=false
   for(const hero of game.heroes)if(hero.hp>0){count++;movement+=hero.moving||0;if(hero.spinLeft>0)spinning=true}
   const speed=movement/Math.max(1,count)
   if(speed>.8){stepClock+=dt*Math.min(1.7,speed/5.1);if(stepClock>=.34){stepClock%=.34;play(foot++%2?'step-left':'step-right',.18,0,.22)}}else stepClock=0
   if(spinning)play('whirlwind',.5,3,.46)
   if(game.enemies.some(e=>e.hp>0&&e.action?.kind==='spin'))play('boss-spin',.62,4,.5)
   if(game.fields.length)play('firefield',.24,1,.8)
  },
  setMuted(value){
   if(disposed)return
   muted=value
   if(muted)stop(true)
   music.setMuted(muted)
  },
  show(value){if(disposed)return;hidden=!value;if(hidden)stop(true);music.show(value)},
  stop,
  diagnostics(){return {...stats,voices:voices.length,...music.diagnostics(),muted}},
  dispose(){if(disposed)return;disposed=true;music.dispose();stop();for(const v of voices)v.audio.destroy();voices.length=0;last.clear();lastFamily.clear();slots.clear()}
 }
}
