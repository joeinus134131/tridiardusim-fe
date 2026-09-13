'use client';
import { memo,useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import type { Wire } from '@/lib/components/componentTypes';
type Vec=[number,number,number];
const Connection=memo(function Connection({wire,source,rotation,target,targetRotation,sp,tp,selected}:{wire:Wire;source:Vec;rotation:Vec;target:Vec;targetRotation:Vec;sp:Vec;tp:Vec;selected:boolean}){
 const curve=useMemo(()=>{const start=new THREE.Vector3(...sp).applyEuler(new THREE.Euler(...rotation)).add(new THREE.Vector3(...source));const end=new THREE.Vector3(...tp).applyEuler(new THREE.Euler(...targetRotation)).add(new THREE.Vector3(...target));const mid=start.clone().lerp(end,.5);mid.y+=Math.min(start.distanceTo(end)*.2,5);return new THREE.QuadraticBezierCurve3(start,mid,end);},[source,rotation,target,targetRotation,sp,tp]);
 return <mesh onClick={e=>{e.stopPropagation();useSimulatorStore.getState().selectWire(wire.id);}}><tubeGeometry args={[curve,24,.075,6,false]}/><meshStandardMaterial color={selected?'#fbbf24':wire.color} roughness={.7}/></mesh>;
});
export function WireRenderer(){const wires=useSimulatorStore(s=>s.wires);const components=useSimulatorStore(s=>s.components);const selected=useSimulatorStore(s=>s.selectedWireId);return <group>{wires.map(w=>{const a=components.find(c=>c.id===w.sourceComponentId),b=components.find(c=>c.id===w.targetComponentId);const sp=a?.pins.find(p=>p.id===w.sourcePinId),tp=b?.pins.find(p=>p.id===w.targetPinId);if(!a||!b||!sp||!tp)return null;return <Connection key={w.id} wire={w} source={a.position} rotation={a.rotation} target={b.position} targetRotation={b.rotation} sp={sp.position} tp={tp.position} selected={selected===w.id}/>;})}</group>;}
