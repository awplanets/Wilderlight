// One source for combat, blessing copy, and cooldown display. All ranks stop at 12.
export const MAX_BOON_RANK=12
const r=n=>Math.max(0,Math.min(MAX_BOON_RANK,Math.floor(n||0)))
export const nextBoonRank=(boons,id,stage=0)=>Math.min(MAX_BOON_RANK,r(boons[id])+(stage===1?2:1))
export const P={
 attack:n=>1+.22*r(n), interval:n=>1/(1+.14*r(n)), movement:n=>1+.035*r(n),
 arrows:n=>1+Math.ceil(r(n)/2), volleyDamage:n=>1+.04*r(n),
 pierce:n=>r(n)?1+r(n):0, arrowSpeed:n=>24*(1+.06*r(n)),
 fireRadius:n=>2.4+.24*r(n), fireDamage:n=>1+.12*r(n),
 burnDuration:()=>3, burnInterval:()=>.5, burnFlat:n=>3*(1+.16*r(n)), burnAttack:n=>.20*(1+.16*r(n)),
 chain:n=>r(n)?1+Math.ceil(r(n)/2):0, chainDamage:n=>.50+.012*r(n),
 cleaveRadius:n=>3.7+.29*r(n), cleaveDamage:n=>1+.045*r(n), counter:n=>25*r(n),
 health:n=>1+.16*r(n), siphon:n=>r(n)?3+3*r(n):0,
 dashCooldown:n=>Math.max(1.8,4.6/(1+.14*r(n))), invulnerability:n=>.46+.045*r(n),
 receivedDamage:n=>1/(1+.12*r(n)), clearHeal:n=>.16+Math.min(.30,.03*r(n)),
 whirlRadius:n=>3.5+.26*r(n), whirlDuration:n=>1.8+.16*r(n), whirlDamage:n=>.45+.045*r(n),
 swordCount:n=>r(n)?1+Math.floor((r(n)-1)/3):0, swordDamage:n=>1.65+.14*r(n), swordPierce:n=>4+Math.floor(r(n)/2),
 fieldRadius:n=>3+.32*r(n), fieldDuration:n=>4+.35*r(n), fieldDamage:n=>.22+.02*r(n),
 ricochet:n=>r(n)?1+Math.ceil(r(n)/2):0, ricochetDamage:n=>1+.07*r(n), ricochetRetention:n=>.80+.01*r(n)
}
