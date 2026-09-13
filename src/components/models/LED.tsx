'use client';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinHighlight } from '@/components/canvas/PinHighlight';
export function LED({id}:{id:string}){
 const brightness=useSimulatorStore(s=>Number(s.components.find(c=>c.id===id)?.state.brightness||0));
 const material=<meshStandardMaterial color="#b52224" emissive="#ff2d16" emissiveIntensity={brightness/255*3} roughness={.32} transparent opacity={.91}/>;
 return <group><mesh position={[0,.8,0]} castShadow><cylinderGeometry args={[.5,.5,1.1,32]}/>{material}</mesh><mesh position={[0,1.35,0]}><sphereGeometry args={[.5,32,16,0,Math.PI*2,0,Math.PI/2]}/>{material}</mesh><mesh position={[0,.12,0]}><cylinderGeometry args={[.59,.59,.24,32,1,false,Math.PI*.12,Math.PI*1.76]}/>{material}</mesh><mesh position={[-.254,-2.7,0]}><boxGeometry args={[.1,5.4,.1]}/><meshStandardMaterial color="#bcc2c5" metalness={.8} roughness={.3}/></mesh><mesh position={[.254,-2.55,0]}><boxGeometry args={[.1,5.1,.1]}/><meshStandardMaterial color="#bcc2c5" metalness={.8} roughness={.3}/></mesh>{ComponentRegistry.get('led_red')!.pins.map(p=><PinHighlight key={p.id} componentId={id} pin={p}/>)}</group>;
}
