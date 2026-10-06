"use client";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

export function OmronPLC({ id }: { id: string }) {
  const c = useSimulatorStore((s) => s.components.find((item) => item.id === id));
  const inputs = Number(c?.state.inputMask || 0);
  const outputs = Number(c?.state.outputMask || 0);
  const powered = c?.state.isPowered === true;
  // The source geometry is authored at roughly half-width/half-depth of an
  // 86 × 90 × 85 mm CP1E-N20 enclosure. Convert it to the shared 0.2 unit/mm scene scale.
  return <group scale={[2, 1.85, 2.5]}>
    <mesh position={[0,4.5,0]} castShadow receiveShadow><boxGeometry args={[8.65,9,6.8]}/><meshStandardMaterial color="#252a2f" roughness={.76}/></mesh>
    <mesh position={[0,4.48,3.42]}><boxGeometry args={[8.15,8.5,.18]}/><meshStandardMaterial color="#15191d" roughness={.64}/></mesh>

    {Array.from({length:13},(_,i)=><mesh key={`r${i}`} position={[-3.7+i*.61,8.72,.15]}><boxGeometry args={[.12,.18,6.45]}/><meshStandardMaterial color="#090c0f" roughness={.82}/></mesh>)}
    {Array.from({length:9},(_,i)=><group key={`v${i}`}><mesh position={[-4.34,2+i*.64,0]}><boxGeometry args={[.08,.13,4.8]}/><meshStandardMaterial color="#050708"/></mesh><mesh position={[4.34,2+i*.64,0]}><boxGeometry args={[.08,.13,4.8]}/><meshStandardMaterial color="#050708"/></mesh></group>)}
    {[-3.85,3.85].map(x=><group key={x} position={[x,9.15,-1.8]}><mesh><boxGeometry args={[.62,1.15,.55]}/><meshStandardMaterial color="#272c31"/></mesh><mesh position={[0,.25,.3]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.16,.08,10,18]}/><meshStandardMaterial color="#080a0c"/></mesh></group>)}

    {[{y:7.7,count:15},{y:1.18,count:9}].map(({y,count})=><group key={y}>
      <mesh position={[0,y,3.58]}><boxGeometry args={[8.1,1.16,.72]}/><meshStandardMaterial color="#333940" roughness={.7}/></mesh>
      {Array.from({length:count},(_,i)=>{const spacing=count===15?.52:.78; const x=-(count-1)*spacing/2+i*spacing; return <group key={i} position={[x,y+.1,3.98]}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.17,.17,.12,16]}/><meshStandardMaterial color="#aab0b6" metalness={.86} roughness={.23}/></mesh><mesh position={[0,0,.075]}><boxGeometry args={[.22,.035,.035]}/><meshStandardMaterial color="#4b5563"/></mesh></group>})}
    </group>)}
    <mesh position={[.4,7.25,4.18]}><boxGeometry args={[7.25,1.7,.16]}/><meshPhysicalMaterial color="#111820" transparent opacity={.72} roughness={.35}/></mesh>
    <mesh position={[.7,1.52,4.18]}><boxGeometry args={[6.7,1.45,.16]}/><meshPhysicalMaterial color="#111820" transparent opacity={.72} roughness={.35}/></mesh>

    <mesh position={[.55,4.45,3.58]}><boxGeometry args={[6.65,3.6,.22]}/><meshStandardMaterial color="#0c1014" roughness={.62}/></mesh>
    <Label text="OMRON" position={[-3.36,6.78,3.72]} rotation={[0,0,0]} size={.34} color="#f1f5f9"/>
    <Label text="SYSMAC CP1E" position={[-3.17,6.2,3.72]} rotation={[0,0,0]} size={.22} color="#d1d5db"/>
    <Label text="CP1E-N20DR" position={[1,5.75,3.72]} rotation={[0,0,0]} size={.25} color="#cbd5e1"/>

    <mesh position={[-3.35,3.05,3.7]}><boxGeometry args={[1.05,1.75,.34]}/><meshStandardMaterial color="#050607"/></mesh>
    <mesh position={[-3.35,3.05,3.9]}><boxGeometry args={[.72,1.24,.2]}/><meshStandardMaterial color="#b9bec3" metalness={.8} roughness={.25}/></mesh>
    {Array.from({length:9},(_,i)=><mesh key={`d${i}`} position={[-3.55+(i%2)*.38,2.62+Math.floor(i/2)*.22,4.02]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#1f2937"/></mesh>)}
    <mesh position={[-1.95,1.85,3.82]}><boxGeometry args={[.52,.72,.36]}/><meshStandardMaterial color="#159447" roughness={.65}/></mesh>

    {["PWR","RUN","ERR"].map((name,i)=>{const on=name!=="ERR"&&powered;const color=name==="ERR"?"#ef4444":"#22c55e";return <group key={name} position={[-1.95,5.15-i*.42,3.82]}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.095,.095,.08,14]}/><meshStandardMaterial color={on?color:"#374151"} emissive={on?color:"#000"} emissiveIntensity={1.6}/></mesh><Label text={name} position={[.55,0,.02]} rotation={[0,0,0]} size={.12} color="#94a3b8"/></group>})}
    {Array.from({length:12},(_,i)=><mesh key={`i${i}`} position={[-1.2+i*.42,4.98,3.84]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.075,.075,.08,12]}/><meshStandardMaterial color={inputs&(1<<i)?"#f59e0b":"#36404a"} emissive={inputs&(1<<i)?"#f59e0b":"#000"} emissiveIntensity={1.4}/></mesh>)}
    {Array.from({length:8},(_,i)=><mesh key={`o${i}`} position={[-.35+i*.48,4.48,3.84]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.075,.075,.08,12]}/><meshStandardMaterial color={outputs&(1<<i)?"#22c55e":"#36404a"} emissive={outputs&(1<<i)?"#22c55e":"#000"} emissiveIntensity={1.4}/></mesh>)}
    <mesh position={[0,1,-3.52]}><boxGeometry args={[4.5,.72,.3]}/><meshStandardMaterial color="#0b0e11"/></mesh>
    {c?.pins.map(p=><group key={p.id} scale={[0.5, 1 / 1.85, 0.4]}><PinHighlight componentId={id} pin={p}/></group>)}
  </group>;
}
