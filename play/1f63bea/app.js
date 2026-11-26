import {t,isEnglish,toggleLanguage,englishBlessing} from './src/language.js'
import {createJourney} from './src/scene.js'
import {HEROES,waveLabel} from './src/simulation.js'
import {drawSkillIcon} from './src/skill-drawing.js'
import {createInnerAudioContext} from './browser-audio.js'

const $=selector=>document.querySelector(selector)
const stage=$('#game'), field=$('#world'), menu=$('#menu'), loading=$('#loading'), overlay=$('#overlay')
const battle=$('#battle'), pad=$('#pad'), skills=$('#skills'), detail=$('#detail')
const storeKey='wilderlight.local.finishes.v1'
let engine,state,modal='',screenKey='',skillKey='',infoSkill='',muted=false,musicReady=false,submitted=false
function applyLanguage(){
 const en=isEnglish(),langButton=$('#language')
 document.documentElement.lang=en?'en':'zh-CN'
 document.title=en?'Wilderlight':'荒野微光 · Wilderlight'
 langButton.lang=en?'zh-CN':'en'
 langButton.textContent=en?'中文':'English'
 langButton.setAttribute('aria-label',en?'切换为中文':'Switch to English')
 for(const node of stage.querySelectorAll('[data-label]'))node.textContent=t(node.dataset.label)
 for(const node of stage.querySelectorAll('[data-aria]'))node.setAttribute('aria-label',t(node.dataset.aria))
 $('#pause-game').title=t('暂停游戏（Esc）')
 $('#sound').setAttribute('aria-label',t(muted?'开启声音':'关闭声音'))
 skillKey='';screenKey=''
}
applyLanguage()
const iconCache=new Map()
function icon(id,tone='dark'){
 const key=id+tone
 if(!iconCache.has(key)){
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=160;drawSkillIcon(canvas.getContext('2d'),id,160,tone)
  iconCache.set(key,canvas)
 }
 const copy=document.createElement('canvas');copy.width=copy.height=160
 copy.getContext('2d').drawImage(iconCache.get(key),0,0)
 copy.setAttribute('aria-hidden','true');return copy
}
function el(tag,text='',style=''){
 const node=document.createElement(tag);node.textContent=t(text);if(style)node.className=style;return node
}
function button(label,action,style=''){const node=el('button',label,style);node.dataset.do=action;return node}
function portraits(heroes=HEROES){
 const row=el('div','','party')
 for(const hero of heroes){const img=el('img');img.src='./assets/portraits/'+hero.id+'.png';img.alt=t(hero.name);row.append(img)}
 return row
}
function time(seconds){return [Math.floor(seconds/60),Math.floor(seconds%60)].map(x=>String(x).padStart(2,'0')).join(':')}
function records(){
 try{const items=JSON.parse(localStorage.getItem(storeKey)||'[]');return Array.isArray(items)?items.filter(i=>i&&Number.isFinite(i.time)&&i.time>0):[]}catch{return []}
}
let unsaved=false
function finish(seconds){
 if(submitted)return;submitted=true
 try{
  const items=[...records(),{time:seconds,date:new Date().toLocaleDateString()}].sort((a,b)=>a.time-b.time).slice(0,100)
  localStorage.setItem(storeKey,JSON.stringify(items));unsaved=false
 }catch{unsaved=true}
}
function updateOverlay(s){
 const view=modal||(['paused','choice','victory','defeat'].includes(s.phase)?s.phase:'')
 const key=view+(view==='choice'?s.run.offers.map(o=>o.id+o.rank).join('/'):'')
 if(key===screenKey)return
 screenKey=key;overlay.hidden=!view;overlay.replaceChildren();overlay.className='sheet '+view
 delete overlay.dataset.do
 if(!view)return
 if(view==='guide'){
  overlay.append(el('h2','冒险指南'),portraits(),el('p','拖动左侧摇杆、点击地面或用 WASD 移动。三位英雄自动攻击，右侧靴子或空格键可闪避。'),el('p','击败敌人，选择祝福，穿越两章森林。点击顶部波次或按 Esc 可暂停。'),button('返回','back'))
 }else if(view==='scores'){
  overlay.append(el('h2','本机排行榜'))
  const items=records().slice(0,10),list=el('ol')
  for(const [i,entry] of items.entries()){const li=el('li');li.append(el('b',String(i+1).padStart(2,'0')),el('span',entry.date),el('b',time(entry.time)));list.append(li)}
  overlay.append(items.length?list:el('p','还没有完整通关记录'),button('返回','back'))
 }else if(view==='paused'){
  overlay.className='sheet pause';overlay.dataset.do='resume'
  const resume=button('继续游戏','resume','primary')
  overlay.append(el('h2','暂停'),resume,button('回主菜单','camp'))
  resume.focus({preventScroll:true})
 }else if(view==='choice'){
  for(const offer of s.run.offers){
   const card=button('','choose-boon'),owner=offer.tag.split(' · ')[0]
   card.dataset.boon=offer.id
   const people=portraits(owner==='全队'?HEROES:HEROES.filter(h=>h.name===owner))
   people.className='owner'
   card.append(icon(offer.id,'light'),people,el('b',offer.title),el('small',isEnglish()?t(owner)+' · Lv. '+offer.rank:owner+' · '+offer.rank+' 级'))
   for(const line of (isEnglish()?englishBlessing(offer.id,offer.rank):offer.lines))card.append(el('span',line))
   overlay.append(card)
  }
 }else{
  const won=view==='victory';overlay.className='sheet result'
  if(won)finish(s.run.time)
  overlay.append(el('h2',won?'胜利':'失败'),el('p',won?'你带领小队穿越了荒野，微光照亮了归途。':'故事还没结束，让我们重新出发。'),portraits())
  const stats=el('div','','stats')
  for(const [label,value] of [['波次',s.wave+' / 6'],['击败',s.kills],['用时',time(s.run.time)]]){
   const cell=el('div');cell.append(el('small',label),el('b',value));stats.append(cell)
  }
  overlay.append(stats)
  if(won){if(unsaved)overlay.append(el('p','当前浏览器无法保存本机成绩'));overlay.append(button('排行榜','scores','primary'))}
  overlay.append(button('重启旅程','start',won?'':'primary'),button('回到主菜单','camp'))
 }
}
function updateSkills(data){
 const columns=data.map(h=>[h,...h.unlocked])
 const key=columns.flat().map(s=>s.id).join('/')
 if(skillKey!==key){
  skillKey=key;skills.replaceChildren()
  for(const group of columns){
   const stack=el('div','','stack')
   for(const s of group){
    const btn=button('','skill','skill');btn.dataset.skill=s.id;btn.setAttribute('aria-label',t(s.name));btn.append(icon(s.id),el('i','','cool'));stack.append(btn)
   }skills.append(stack)
  }
 }
 const nodes=skills.querySelectorAll('.cool')
 columns.flat().forEach((s,i)=>nodes[i].style.setProperty('--cd',(s.disabled?1:s.cooldown)+'turn'))
 const selected=columns.flat().find(s=>s.id===infoSkill)
 detail.hidden=!selected
 if(selected){
  const description=isEnglish()&&selected.rank?englishBlessing(selected.id,selected.rank).join(' '):t(selected.detail)
  detail.textContent=t(selected.name)+' · '+description
 }
}
const dots=Array.from({length:6},()=>el('i'))
$('#waves').append(...dots)
$('#dash').append(icon('dash'),el('i','','cool'))
function paint(s){
 const previousPhase=state?.phase
 state=s;const r=s.run
 if(s.phase!==previousPhase && ['playing','transition'].includes(s.phase) && held.size)keys()
 loading.hidden=s.phase!=='loading'&&s.phase!=='error'
 if(!loading.hidden){
  if(s.error){loading.replaceChildren(el('strong','载入失败'),el('p',s.error),button('重新载入','reload'));return}
  loading.querySelector('progress').value=s.loadingProgress
  loading.querySelector('output').textContent=Math.round(s.loadingProgress*100)+'%'
 }
 if(s.phase==='ready'&&!musicReady){musicReady=true;engine?.playbackReady()}
 menu.hidden=s.phase!=='ready'||Boolean(modal)
 battle.hidden=!['playing','paused','transition'].includes(s.phase)
 battle.inert=s.phase==='paused'
 if(!battle.hidden){
  dots.forEach((node,i)=>node.classList.toggle('current',i===s.wave-1))
  $('#percent').textContent=Math.round(r.waveProgress*100)+'%'
  $('#meter i').style.transform='scaleX('+r.waveProgress+')'
  $('#dash .cool').style.setProperty('--cd',r.dodgeRatio+'turn')
  const intro=r.introActive||s.phase==='transition', banner=$('#banner')
  const chapter=t(r.introActive?'逐日之森':'月下丛林'),label=intro?chapter:r.waveTime<2?(isEnglish()?'Wave '+s.wave:waveLabel(s.wave)):''
  if(banner.dataset.label!==label){banner.dataset.label=label;banner.replaceChildren();if(intro)banner.append(el('small',r.introActive?'第一章':'第二章'));banner.append(label)}
  banner.style.opacity=intro?1:Math.min(1,Math.max(0,(2-r.waveTime)*2))
  updateSkills(r.skills)
 }
 updateOverlay(s)
}
stage.addEventListener('click',event=>{
 const btn=event.target.closest('[data-do]');if(!btn)return
 const action=btn.dataset.do
 if(action==='language'){toggleLanguage();applyLanguage();if(state)paint(state);return}
 if(action==='choose-boon'){engine?.chooseBoon(btn.dataset.boon);return}
 if(action==='reload'){location.reload();return}
 if(['scores','guide','back'].includes(action)){modal=action==='back'?'':action;paint(state);return}
 if(action==='skill'){infoSkill=infoSkill===btn.dataset.skill?'':btn.dataset.skill;paint(state);return}
 if(action==='sound'){muted=!muted;engine.sound(muted);btn.textContent=muted?'♩̸':'♫';btn.setAttribute('aria-label',t(muted?'开启声音':'关闭声音'));return}
 if(action==='start'){submitted=false;musicReady=false;infoSkill=''}
 if(action==='camp'){musicReady=false;infoSkill=''}
 if(action!=='dash')engine?.action(action)
})
$('#dash').addEventListener('pointerdown',e=>{e.preventDefault();engine?.action('dash')})
$('#dash').addEventListener('click',e=>{if(e.detail===0)engine?.action('dash')})
let pointer=null
const held=new Set()
function keys(){
 if(pointer!==null)return
 const axis=(plus,minus)=>Number(plus.some(k=>held.has(k)))-Number(minus.some(k=>held.has(k)))
 const x=axis(['KeyD','ArrowRight'],['KeyA','ArrowLeft']), y=axis(['KeyS','ArrowDown'],['KeyW','ArrowUp'])
 const len=Math.max(1,Math.hypot(x,y));engine?.steer(x/len,y/len)
}
function move(e){
 if(e.pointerId!==pointer)return
 const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.width*.35)
 const len=Math.max(1,Math.hypot(x,y))
 pad.firstElementChild.style.transform='translate('+(-50+97*x/len)+'%,'+(-50+97*y/len)+'%)'
 engine?.steer(x/len,y/len)
}
function release(){pointer=null;pad.firstElementChild.style.transform='';keys()}
pad.addEventListener('pointerdown',e=>{if(pointer===null){pointer=e.pointerId;pad.setPointerCapture(pointer);move(e)}})
pad.addEventListener('pointermove',move)
pad.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)release()})
field.addEventListener('pointerdown',e=>{if(pointer!==null||!['playing','transition'].includes(state?.phase))return;const r=field.getBoundingClientRect();engine.lead((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)})
const directions=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowRight','ArrowDown','ArrowLeft']
window.addEventListener('keydown',e=>{
 if(modal||!state)return
 if(directions.includes(e.code) && ['departing','playing','transition','choice','paused'].includes(state.phase)){
  e.preventDefault();held.add(e.code)
  if(state.phase==='playing'||state.phase==='transition')keys()
  return
 }
 if(!['playing','paused','transition'].includes(state.phase))return
 if(state.phase==='paused'&&e.code==='Space'&&e.target.closest?.('#overlay button'))return
 if(['Space','Escape'].includes(e.code)){e.preventDefault();if(!e.repeat)engine.action(state.phase==='paused'?'resume':e.code==='Space'?'dash':'pause')}
})
window.addEventListener('keyup',e=>{if(held.delete(e.code))keys()})
window.addEventListener('blur',()=>{held.clear();release()})
document.addEventListener('visibilitychange',()=>engine?.show(!document.hidden))
for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>engine?.unlockAudio(),{once:true,capture:true})
field.addEventListener('webglcontextlost',e=>{e.preventDefault();engine?.show(false);loading.hidden=false;loading.replaceChildren(el('p','图形设备连接已中断'),button('重新载入','reload'))})
try{
 engine=createJourney({createInnerAudioContext},{node:field,width:stage.clientWidth,height:stage.clientHeight},paint)
 new ResizeObserver(()=>engine.resize(stage.clientWidth,stage.clientHeight)).observe(stage)
}catch(error){
 loading.replaceChildren(el('strong','无法打开战场'),el('p','请启用浏览器的图形加速，并使用支持 WebGL 2 的浏览器。'),button('重新载入','reload'))
 console.error(error)
}
