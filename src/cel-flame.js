
// Solid, layered flame silhouettes. Shared by the actual skill sculpture,
// flying fireball and impact; no soft sprite or additive white bloom.
export function createCelFlame(THREE,{displaySpace=false,animated=false,flat=false}={}){
 const root=new THREE.Group(),clock={value:0};
 const shape=new THREE.Shape();
 shape.moveTo(-.36,-.45);shape.bezierCurveTo(-.73,-.12,-.52,.34,-.4,.7);
 shape.bezierCurveTo(-.39,.36,-.15,.28,-.17,.5);
 shape.bezierCurveTo(-.3,.91,.3,1.05,.19,1.52);
 shape.bezierCurveTo(.67,1.02,.22,.66,.32,.46);
 shape.bezierCurveTo(.46,.49,.56,.68,.55,.84);
 shape.bezierCurveTo(.91,.32,.65,-.24,.34,-.47);
 shape.bezierCurveTo(.15,-.64,-.16,-.62,-.36,-.45);
 const colors=[0xd95343,0xf69a4c,0xffe9a3];
 for(let i=0;i<3;i++){
  const geometry=flat?new THREE.ShapeGeometry(shape,10):new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:2,bevelSize:.035,bevelThickness:.025,curveSegments:18});
  const color=new THREE.Color(colors[i]);if(displaySpace)color.convertLinearToSRGB();
  const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false});
  material.onBeforeCompile=shader=>{
   shader.uniforms.uFlameTime=clock;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uFlameTime;')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
     float rise=max(0.,position.y+.38);
     transformed.x+=sin(rise*4.6-uFlameTime*9.+${i.toFixed(1)})*rise*.075;
     transformed.y+=sin(uFlameTime*7.2+rise*3.)*rise*.032;
    `);
  };
  material.customProgramCacheKey=()=>`cel-flame-${i}`;
  const mesh=new THREE.Mesh(geometry,material);mesh.userData.uiOwned=true;
  const scale=[1,.72,.4][i];mesh.scale.set(scale,scale,1);mesh.position.set(-.02*i,-.12*i,.23*i);root.add(mesh);
 }
 root.userData.flameClock=clock;root.userData.animated=animated;
 root.userData.dispose=()=>{root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});};
 return root;
}
