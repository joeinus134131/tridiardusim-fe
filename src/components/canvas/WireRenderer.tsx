"use client";
import { ThreeEvent } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import type { Wire } from "@/lib/components/componentTypes";
type Vec = [number, number, number];
const Connection = memo(function Connection({
  wire,
  source,
  rotation,
  target,
  targetRotation,
  sp,
  tp,
  selected,
}: {
  wire: Wire;
  source: Vec;
  rotation: Vec;
  target: Vec;
  targetRotation: Vec;
  sp: Vec;
  tp: Vec;
  selected: boolean;
}) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...sp)
      .applyEuler(new THREE.Euler(...rotation))
      .add(new THREE.Vector3(...source));
    const end = new THREE.Vector3(...tp)
      .applyEuler(new THREE.Euler(...targetRotation))
      .add(new THREE.Vector3(...target));
    if(wire.path?.length) return new THREE.CatmullRomCurve3([start,...wire.path.map(p=>new THREE.Vector3(...p)),end],false,"centripetal");
    const mid = start.clone().lerp(end, 0.5);
    mid.y += Math.min(start.distanceTo(end) * 0.2, 5);
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [source, rotation, target, targetRotation, sp, tp, wire.path]);
  return (
    <group><mesh
      onClick={(e) => {
        e.stopPropagation();
        useSimulatorStore.getState().selectWire(wire.id);
      }}
    >
      <tubeGeometry args={[curve, 64, 0.075, 6, false]} />
      <meshStandardMaterial
        color={wire.color}
        emissive={selected ? wire.color : "black"}
        emissiveIntensity={selected ? .3 : 0}
        roughness={0.7}
      />
    </mesh>{selected && wire.path?.map((p,i)=><BendHandle key={i} wire={wire} index={i} point={p}/>)}</group>
  );
});
function BendHandle({wire,index,point}:{wire:Wire;index:number;point:Vec}) {
 const dragging=useRef(false);
 const move=(e:ThreeEvent<PointerEvent>)=>{
  if(!dragging.current) return;
  e.stopPropagation();
  const hit=e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-point[1]),new THREE.Vector3());
  if(hit) useSimulatorStore.getState().updateWire(wire.id,{path:wire.path!.map((p,i)=>i===index?[hit.x,point[1],hit.z]:p)});
 };
 const end=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();dragging.current=false;(e.target as Element).releasePointerCapture(e.pointerId);};
 return <mesh position={point} onPointerDown={e=>{if(e.button!==0)return;e.stopPropagation();dragging.current=true;(e.target as Element).setPointerCapture(e.pointerId);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
  <sphereGeometry args={[.22,12,8]}/><meshBasicMaterial color="#fbbf24" depthTest={false}/>
 </mesh>;
}
export function WireRenderer() {
  const wires = useSimulatorStore((s) => s.wires);
  const components = useSimulatorStore((s) => s.components);
  const selected = useSimulatorStore((s) => s.selectedWireId);
  return (
    <group>
      {wires.map((w) => {
        const a = components.find((c) => c.id === w.sourceComponentId),
          b = components.find((c) => c.id === w.targetComponentId);
        const sp = a?.pins.find((p) => p.id === w.sourcePinId),
          tp = b?.pins.find((p) => p.id === w.targetPinId);
        if (!a || !b || !sp || !tp) return null;
        return (
          <Connection
            key={w.id}
            wire={w}
            source={a.position}
            rotation={a.rotation}
            target={b.position}
            targetRotation={b.rotation}
            sp={sp.position}
            tp={tp.position}
            selected={selected === w.id}
          />
        );
      })}
    </group>
  );
}
