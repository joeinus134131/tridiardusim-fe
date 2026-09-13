'use client';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinHighlight } from '@/components/canvas/PinHighlight';
export function PushButton({id}:{id:string}){
 const down=useSimulatorStore(s=>!!s.components.find(c=>c.id===id)?.state.isPressed);const update=useSimulatorStore(s=>s.updateComponentState);
 return <group><mesh position={[0,.25,0]} castShadow><boxGeometry args={[1.2,.5,1.2]}/><meshStandardMaterial color="#242321"/></mesh><mesh position={[0,.53,0]}><boxGeometry args={[1.16,.08,1.16]}/><meshStandardMaterial color="#bec2c4" metalness={.8} roughness={.35}/></mesh><mesh position={[0,down?.66:.72,0]} onPointerDown={e=>{e.stopPropagation();update(id,{isPressed:true});}} onPointerUp={e=>{e.stopPropagation();update(id,{isPressed:false});}} onPointerLeave={()=>update(id,{isPressed:false})}><cylinderGeometry args={[.35,.35,.28,20]}/><meshStandardMaterial color="#ede1bd"/></mesh>{[-.46,.46].flatMap(x=>[-.46,.46].map(z=><mesh key={x+':'+z} position={[x,.58,z]}><cylinderGeometry args={[.07,.07,.035,8]}/><meshStandardMaterial color="#353535"/></mesh>))}{ComponentRegistry.get('push_button')!.pins.map(p=><group key={p.id}><mesh position={[p.position[0],-.34,p.position[2]]}><boxGeometry args={[.06,.68,.14]}/><meshStandardMaterial color="#bec2c4" metalness={.8}/></mesh><PinHighlight componentId={id} pin={p}/></group>)}</group>;
}
