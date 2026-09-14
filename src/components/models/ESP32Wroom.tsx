'use client';
import { esp32Pins } from '@/lib/components/esp32';
import { PinHighlight } from '../canvas/PinHighlight';
import { Label } from './Label';
export function ESP32Wroom({id}:{id:string}) {
 return <group>
  <mesh position={[0,.16,0]} castShadow><boxGeometry args={[5.58,.32,10.88]}/><meshStandardMaterial color="#182c2d" roughness={.7}/></mesh>
  <mesh position={[0,.43,-2.5]}><boxGeometry args={[3.6,.22,5.1]}/><meshStandardMaterial color="#193f37"/></mesh>
  <mesh position={[0,.77,-1.9]} castShadow><boxGeometry args={[3.6,.68,3.6]}/><meshStandardMaterial color="#bac2c4" metalness={.8} roughness={.35}/></mesh>
  <Label text="ESP32-WROOM-32" position={[0,1.12,-2]} size={.28} color="#343b3c" />
  {[0,1,2,3,4].map(i=><mesh key={i} position={[-1.25+i*.6,.56,-4.48]}><boxGeometry args={[.12,.035,.95]}/><meshStandardMaterial color="#d8b84f" metalness={.7}/></mesh>)}
  <mesh position={[0,.62,4.86]}><boxGeometry args={[1.55,.6,1.5]}/><meshStandardMaterial color="#aab6bd" metalness={.8} roughness={.25}/></mesh>
  <mesh position={[0,.61,5.62]}><boxGeometry args={[1.18,.27,.02]}/><meshStandardMaterial color="#111419"/></mesh>
  <mesh position={[0,.49,2.22]}><boxGeometry args={[1.15,.3,1.15]}/><meshStandardMaterial color="#171719"/></mesh>
  {[-1.8,1.8].map(x=><group key={x}><mesh position={[x,.51,4.15]}><boxGeometry args={[.6,.3,.85]}/><meshStandardMaterial color="#aaa" metalness={.6}/></mesh><mesh position={[x,.73,4.15]}><cylinderGeometry args={[.2,.2,.18,12]}/><meshStandardMaterial color="#222"/></mesh><Label text={x<0?'EN':'BOOT'} position={[x,.34,3.4]} size={.2}/></group>)}
  {esp32Pins.map(p=><group key={p.id}>
   <mesh position={[p.position[0],.5,p.position[2]]}><boxGeometry args={[.48,.4,.48]}/><meshStandardMaterial color="#17191b"/></mesh>
   <mesh position={[p.position[0],-.03,p.position[2]]}><boxGeometry args={[.13,1.14,.13]}/><meshStandardMaterial color="#d7b86e" metalness={.75}/></mesh>
   <PinHighlight componentId={id} pin={p}/>
  </group>)}
 </group>;
}
