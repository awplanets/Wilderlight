// Original four-bar motif and variations for the redistributable edition.
import {writeFileSync} from 'node:fs'
const rate=22050
const songs=[
 {name:'day',bpm:116,roots:[50,46,53,48],motif:[0,7,10,12,10,7,5,3]},
 {name:'night',bpm:92,roots:[45,41,38,40],motif:[0,3,7,10,8,7,3,2]}
]
for(const song of songs){
 const beat=60/song.bpm, length=Math.round(beat*64*rate)
 const samples=new Float32Array(length)
 function note(start,midi,duration,gain,voice){
  const freq=440*2**((midi-69)/12), count=Math.round(rate*duration*beat),offset=Math.round(start*beat*rate)
  for(let i=0;i<count;i++){
   const t=i/rate, phase=2*Math.PI*freq*t
   const env=Math.min(1,t/.016)*Math.min(1,(count-i)/rate/.08)
   let value
   if(voice==='drum')value=Math.sin(2*Math.PI*(44*t+1.3*(1-Math.exp(-t*18))))*Math.exp(-t*13)
   else if(voice==='pluck')value=(Math.sin(phase)+.38*Math.sin(phase*2)+.14*Math.sin(phase*3))*Math.exp(-t*5)
   else value=(Math.sin(phase)+.23*Math.sin(phase*2.002)+.1*Math.sin(phase*3))*Math.exp(-t*.7)
   samples[(offset+i)%length]+=gain*env*value
  }
 }
 for(let bar=0;bar<16;bar++){
  const root=song.roots[bar%4],b=bar*4
  note(b,root-12,2.8,.13,'horn');note(b+3,root-5,.8,.1,'horn')
  for(let k=0;k<8;k++){
   note(b+k/2,root+12+song.motif[(k+2*(bar%2))%8]+(bar>=8?0:-12),.76,.075,'pluck')
   if(k===0||k===4||k===7&&bar%2)note(b+k/2,0,.42,.17,'drum')
  }
  const melody=[7,10,12,5,3,7,10,0][bar%8]
  note(b+.5,root+12+melody,1.45,.11,'horn')
  note(b+2.5,root+12+(bar%2?3:7),1.2,.095,'horn')
 }
 const file=Buffer.alloc(44+length*2)
 file.write('RIFF');file.writeUInt32LE(file.length-8,4);file.write('WAVEfmt ',8);file.writeUInt32LE(16,16)
 file.writeUInt16LE(1,20);file.writeUInt16LE(1,22);file.writeUInt32LE(rate,24);file.writeUInt32LE(rate*2,28)
 file.writeUInt16LE(2,32);file.writeUInt16LE(16,34);file.write('data',36);file.writeUInt32LE(length*2,40)
 samples.forEach((v,i)=>file.writeInt16LE(Math.round(Math.tanh(v*1.35)*32767),44+i*2))
 writeFileSync(new URL('../assets/music/'+song.name+'.wav',import.meta.url),file)
}
