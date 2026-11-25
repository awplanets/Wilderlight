import {P} from './progression.js'

const preference = 'wilderlight.language'
let language = 'zh'
try {
  if (localStorage.getItem(preference) === 'en') language = 'en'
} catch { /* Storage may be disabled for local games. */ }

export const isEnglish = () => language === 'en'
export function toggleLanguage() {
  language = isEnglish() ? 'zh' : 'en'
  try { localStorage.setItem(preference, language) } catch { /* Keep this session's choice. */ }
}

const english = {
  '荒野微光':'Wilderlight', '正在载入':'Loading', '开始游戏':'Start Game', '玩法指南':'How to Play',
  '排行榜':'Rankings', '本机排行榜':'Local Leaderboard', '还没有完整通关记录':'Finish the journey to set the first record.',
  '冒险指南':'Field Guide', '返回':'Back', '林地战场':'Forest battlefield', '移动摇杆':'Movement stick',
  '暂停游戏':'Pause game', '暂停游戏（Esc）':'Pause game (Esc)', '关闭声音':'Mute audio', '开启声音':'Unmute audio',
  '移动':'Move', '空格 · 闪避':'Space · Dodge', '暂停':'Paused', '继续游戏':'Resume', '回主菜单':'Main Menu',
  '回到主菜单':'Main Menu', '重启旅程':'Play Again', '胜利':'Victory', '失败':'Defeat',
  '波次':'Wave', '击败':'Kills', '用时':'Time', '第一章':'Chapter I', '第二章':'Chapter II',
  '逐日之森':'Sunward Woods', '月下丛林':'Moonlit Woods', '全队':'Party',
  '洛恩':'Lorne', '薇拉':'Vela', '伊芙':'Eve',
  '拖动左侧摇杆、点击地面或用 WASD 移动。三位英雄自动攻击，右侧靴子或空格键可闪避。':
    'Move with WASD, drag the stick, or click the ground. Your heroes attack automatically. Press Space or tap the boot to dodge.',
  '击败敌人，选择祝福，穿越两章森林。点击顶部波次或按 Esc 可暂停。':
    'Defeat enemies and choose blessings as you cross two forests. Press Esc or tap the wave tracker to pause.',
  '你带领小队穿越了荒野，微光照亮了归途。':'You led the party through the wilds. A glimmer lights the way home.',
  '故事还没结束，让我们重新出发。':'The story isn’t over. Let’s set out again.',
  '当前浏览器无法保存本机成绩':'This browser could not save your time.',
  '载入失败':'Loading failed', '重新载入':'Reload', '图形设备连接已中断':'Graphics connection lost.',
  '无法打开战场':'Could not open the battlefield',
  '请启用浏览器的图形加速，并使用支持 WebGL 2 的浏览器。':'Enable graphics acceleration in a browser that supports WebGL 2.',
  '原版林地载入失败，请重试':'The forest could not load. Please retry.',
  '战场运行中断，请重新载入':'The battle was interrupted. Please reload.',
  '模型载入失败，请重试':'The models could not load. Please retry.',
  '弧月斩':'Crescent Slash', '疾风弩':'Windshot', '余烬火球':'Ember Bolt',
  '攻击':'Gilded Edge', '迅捷':'Windbound', '多重弩箭':'Forked Flight', '穿林箭矢':'Through the Thicket',
  '爆燃':'Wildfire', '连锁火焰':'Kindred Flame', '弧月横扫':'Crescent Reach', '反击':'Oath of Thorns',
  '生命':'Woodland Grace', '回血':'Ember Echo', '闪避':'Featherstep', '防御':'Amber Ward',
  '旋风斩击':'Whirlwind', '穿透剑气':'Blade Wave', '燎原火阵':'Blazing Circle', '弹射箭矢':'Ricochet',
  '洛恩挥剑横扫面前的敌人。':'Lorne sweeps his sword through enemies in front of him.',
  '薇拉瞄准附近的敌人，发射弩箭。':'Vela fires her crossbow at nearby enemies.',
  '火球爆炸并灼烧敌人3秒，每半秒造成3点＋20%攻击伤害；爆燃同时提高爆炸和灼烧伤害。重复命中刷新灼烧时间。':
    'Fireballs burst and burn for 3s. Every 0.5s, burn deals 3 damage plus 20% of attack. Wildfire strengthens both effects. Further hits refresh the burn.'
}
export function t(text) { return isEnglish() ? (english[text] ?? text) : text }

const pct = n => Math.round(100 * n) + '%'
const num = n => Number(n.toFixed(1))
export function englishBlessing(id, rank) {
  switch (id) {
    case 'edge': return [`Party attack +${pct(P.attack(rank)-1)}.`, 'Boosts swords, bolts and fireballs.']
    case 'haste': return [`Attack interval −${pct(1-P.interval(rank))}.`, `Move speed +${pct(P.movement(rank)-1)}.`]
    case 'volley': return [`${P.arrows(rank)} bolts per volley.`, `Bolt damage +${pct(P.volleyDamage(rank)-1)}.`]
    case 'pierce': return [`Pierce ${P.pierce(rank)} extra foes.`, `Bolt speed: ${num(P.arrowSpeed(rank))} m/s.`]
    case 'inferno': return [`${num(P.fireRadius(rank))} m blast. Damage +${pct(P.fireDamage(rank)-1)}.`, `3s burn: ${num(P.burnFlat(rank))} + ${pct(P.burnAttack(rank))} attack per tick.`]
    case 'chain': return [`Flames leap to ${P.chain(rank)} extra foes.`, `Each takes ${pct(P.chainDamage(rank))} of the hit.`]
    case 'cleave': return [`Sweep radius: ${num(P.cleaveRadius(rank))} m.`, `Sword damage +${pct(P.cleaveDamage(rank)-1)}.`]
    case 'thorns': return ['When hit, Lorne strikes back.', `Deals ${P.counter(rank)} damage to nearby foes.`]
    case 'vitality': return [`Party max HP +${pct(P.health(rank)-1)}.`, 'Heal 30% now and revive fallen allies.']
    case 'siphon': return ['Every 12 enemies defeated,', `each hero recovers ${P.siphon(rank)} HP.`]
    case 'dash': return [`Dodge cooldown: ${num(P.dashCooldown(rank))}s.`, `Invincible for ${P.invulnerability(rank).toFixed(2)}s.`]
    case 'ward': return [`Take ${pct(1-P.receivedDamage(rank))} less damage.`, `Heal ${pct(P.clearHeal(rank))} HP after each wave.`]
    case 'whirlwind': return [`Spin for ${num(P.whirlDuration(rank))}s in a ${num(P.whirlRadius(rank))} m radius.`, `Deal ${pct(P.whirlDamage(rank))} attack every 0.3s.`]
    case 'swordwave': return [`Piercing waves: ${P.swordCount(rank)}.`, `Each deals ${pct(P.swordDamage(rank))} attack.`]
    case 'firefield': return [`Leave a ${num(P.fieldRadius(rank))} m ring of fire.`, `Burn foes every 0.5s for ${num(P.fieldDuration(rank))}s.`]
    case 'ricochet': return [`Extra bounces: ${P.ricochet(rank)}.`, `Each keeps ${pct(P.ricochetRetention(rank))} damage.`]
  }
}
