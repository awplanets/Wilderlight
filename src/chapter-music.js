import {tracks as MUSIC_TRACKS} from '../music.js'
export const DAY_FADE_SECONDS=2.4
const NIGHT_FADE_SECONDS=.8,VOLUME_INTERVAL=.05

// The Feed uses a silent track: only this game-owned player produces BGM.
// One reusable native music player. The existing scene clock drives fades;
// there is no timer, Web Audio synthesis, or second simultaneously playing BGM.
export function createChapterMusic(api,{downloadFile}={}){
 let audio=null
 let unlocked=false,muted=false,hidden=false,disposed=false,presented=false,playing=false,loading=false
 let phase='ready',effectivePhase='ready',stage=0,transition=0,wanted='forest',current=null,source=null
 let volume=null,volumeClock=0,nightFade=0,failed=null,ended=false
 const cache={day:{state:'idle',path:null,task:null},night:{state:'idle',path:null,task:null}}
 const stats={musicSourceChanges:0,musicPlays:0,musicVolumeWrites:0,musicDownloads:0,musicEnds:0,musicLoopRestarts:0}
 const canPlay=()=>unlocked&&!muted&&!hidden&&!disposed&&!loading&&wanted!==null
 const targetVolume=()=>{
  const base=phase==='paused'?.18:.42
  if(effectivePhase==='transition')return base*Math.max(0,1-transition/DAY_FADE_SECONDS)
  return wanted==='night'?base*Math.min(1,nightFade/NIGHT_FADE_SECONDS):base
 }
 function pause(force=false){
  if(audio&&force&&volume!==0){try{audio.volume=0;volume=0;stats.musicVolumeWrites++}catch{volume=null}}
  if(audio&&(playing||force)){try{audio.pause()}catch(error){console.error('Wilderlight music pause',error)}}
  playing=false
 }
 function writeVolume(){
  if(!audio)return
  const next=Math.round(targetVolume()*1000)/1000
  if(volume===next)return true
  try{audio.volume=next;volume=next;stats.musicVolumeWrites++;return true}
  catch(error){pause();failed=wanted;console.error('Wilderlight music volume',{track:current,error});return false}
 }
 function reconcile(){
  if(!canPlay()){pause();return}
  if(current!==wanted&&playing)pause()
  if(failed===wanted)return
  // An early Start reuses the in-flight download instead of fetching a second
  // copy. Its completion starts only the currently wanted, visible chapter.
  if(current!==wanted&&cache[wanted]?.state==='pending')return
  try{
   if(!audio){
    audio=api.createInnerAudioContext();audio.autoplay=false;audio.loop=true;audio.obeyMuteSwitch=false
    audio.onPlay(()=>{
     if(disposed)return
     if(!canPlay()||current!==wanted){playing=true;pause(true);return}
     playing=true
    })
    audio.onEnded(()=>{
     if(disposed)return
     // Ignore a late end event after a source switch, or when the native loop
     // has already wrapped and is actively playing the beginning again.
     const time=audio.currentTime,duration=audio.duration
     if(audio.paused===false&&Number.isFinite(time)&&Number.isFinite(duration)&&duration>0&&time<duration-.3)return
     playing=false;ended=true;stats.musicEnds++
     if(current===wanted&&canPlay())reconcile()
    })
    audio.onError(error=>{
     if(disposed)return
     playing=false
     console.error('Wilderlight chapter music',{track:current,src:source,error})
     const entry=cache[current]
     if(entry?.path&&source===entry.path){entry.path=null;entry.state='failed';source=null;reconcile()}
     else failed=current
    })
   }
   if(current!==wanted||!source){
    if(current!==null)audio.stop()
    playing=false;ended=false;current=wanted;source=cache[wanted]?.path||MUSIC_TRACKS[wanted]
    audio.src=source;audio.loop=true;stats.musicSourceChanges++
   }
   // Some hosts reach onEnded despite loop=true. Rewind the existing player,
   // retaining the loaded source and volume; do not download or fade in again.
   if(ended){audio.stop();audio.loop=true;ended=false;stats.musicLoopRestarts++}
   if(writeVolume()===false)return
   if(playing)return
   playing=true;audio.play();stats.musicPlays++
  }catch(error){playing=false;failed=wanted;console.error('Wilderlight music playback',{track:wanted,src:source,error});source=null}
 }
 function warm(key){
  const entry=cache[key]
  if(!presented||disposed||hidden||muted||loading||!downloadFile||entry.state!=='idle'||current===key)return
  entry.state='pending';stats.musicDownloads++
  try{
   entry.task=downloadFile({url:MUSIC_TRACKS[key],timeout:12000})
   Promise.resolve(entry.task).then(result=>{
    if(disposed)return
    if(Number(result?.statusCode)!==200||!result?.tempFilePath)throw new Error('Music download returned no playable file')
    entry.path=result.tempFilePath;entry.state='ready';entry.task=null
    console.info('Wilderlight music cached',{track:key})
    reconcile()
   }).catch(error=>{
    if(disposed)return
    entry.state='failed';entry.task=null
    console.error('Wilderlight music cache; using streaming fallback',{track:key,error})
    reconcile()
   })
  }catch(error){entry.state='failed';entry.task=null;console.error('Wilderlight music cache unavailable',{track:key,error})}
 }
 return {
  // The menu calls this after loading completes and its visible UI is committed.
  prepare(){if(disposed||presented&&!loading)return;presented=true;loading=false;unlocked=true;if(wanted==='forest')warm('day');reconcile()},
  loading(){if(disposed)return;loading=true;pause(true)},
  unlock(){if(disposed)return;unlocked=true;hidden=false;failed=null;if(audio?.paused)playing=false;reconcile()},
  update(game,dt){
   if(disposed)return
   const previousPhase=phase,previousWanted=wanted
   phase=game.phase;effectivePhase=phase==='paused'?(game.previousPhase||effectivePhase):phase
   stage=game.stage??0;transition=game.transitionElapsed??0
   wanted=effectivePhase==='ready'?'forest':stage===1?'night':effectivePhase==='transition'&&transition>=DAY_FADE_SECONDS?null:'day'
   if(wanted!==previousWanted){failed=null;volumeClock=0;if(wanted==='night')nightFade=0}
   if(!hidden&&!muted&&phase!=='paused'&&playing&&current==='night')nightFade=Math.min(NIGHT_FADE_SECONDS,nightFade+dt)
   if(presented&&stage===0&&(game.wave>=5||effectivePhase==='transition'))warm('night')
   // Only volume ramps touch the native bridge while a track is steady.
   if(previousPhase!==phase||previousWanted!==wanted)reconcile()
   else if(!hidden&&!muted&&playing){
    volumeClock+=dt
    if(volumeClock>=VOLUME_INTERVAL){volumeClock%=VOLUME_INTERVAL;writeVolume()}
   }
  },
  setMuted(value){
   if(disposed)return
   muted=value
   if(muted){pause(true)}
   else{failed=null;if(presented&&wanted==='forest')warm('day');if(unlocked)reconcile()}
  },
  show(value){
   if(disposed)return
   hidden=!value
   if(hidden){pause(true)}
   else if(muted)pause(true)
   else{failed=null;if(unlocked)reconcile()}
  },
  diagnostics(){return {...stats,musicTrack:current,musicWanted:wanted,musicPlaying:playing,musicTime:audio?.currentTime??0,musicPaused:audio?.paused??true,musicVolume:volume,musicCache:{day:cache.day.state,night:cache.night.state}}},
  dispose(){
   if(disposed)return
   pause();disposed=true
   try{audio?.destroy()}catch(error){console.error('Wilderlight music cleanup',error)}audio=null
   for(const entry of Object.values(cache)){try{entry.task?.abort?.()}catch(error){console.error('Wilderlight music download cleanup',error)}entry.task=null}
  }
 }
}
