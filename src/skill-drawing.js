// Text-based, resolution-independent demo icons. Use the same typeface as the rest of the game.
const symbols = {
  warden:'剑', ranger:'弩', mage:'杖', dash:'闪', edge:'攻', haste:'速', volley:'连', pierce:'穿',
  inferno:'爆', chain:'链', cleave:'斩', thorns:'反', vitality:'生', siphon:'愈',
  ward:'盾', stones:'石', spring:'泉', whirlwind:'旋', swordwave:'刃', firefield:'焰', ricochet:'弹'
}

export function drawSkillIcon(context, id, size, tone = 'dark') {
  context.clearRect(0, 0, size, size)
  context.fillStyle = tone === 'light' ? '#375846' : '#f2efd8'
  context.font = Math.round(size * 0.55) + 'px WLXianglifang, 乡立方黑体, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(symbols[id] || '技', size / 2, size / 2)
}
