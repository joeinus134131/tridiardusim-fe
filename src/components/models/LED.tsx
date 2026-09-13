"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
export function LED({ id }: { id: string }) {
  const brightness = useSimulatorStore((s) =>
    Number(s.components.find((c) => c.id === id)?.state.brightness || 0),
  );
  const flange = useMemo(() => { const shape = new THREE.Shape(); const angle = Math.acos(0.5 / 0.59); shape.absarc(0, 0, 0.59, angle, Math.PI * 2 - angle, false); shape.closePath(); return shape; }, []);
  const material = (
    <meshStandardMaterial
      color="#b52224"
      emissive="#ff2d16"
      emissiveIntensity={(brightness / 255) * 3}
      roughness={0.32}
      transparent
      opacity={0.91}
    />
  );
  return (
    <group>
      <mesh position={[0, 0.71, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 1.02, 32]} />
        {material}
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {material}
      </mesh>
      <mesh rotation={[-Math.PI / 2,0,0]}>
        <extrudeGeometry args={[flange,{depth:0.2,bevelEnabled:false,curveSegments:32}]} />
        {material}
      </mesh>
      <mesh position={[-0.254, -2.7, 0]}>
        <boxGeometry args={[0.1, 5.4, 0.1]} />
        <meshStandardMaterial color="#bcc2c5" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.254, -2.55, 0]}>
        <boxGeometry args={[0.1, 5.1, 0.1]} />
        <meshStandardMaterial color="#bcc2c5" metalness={0.8} roughness={0.3} />
      </mesh>
      {ComponentRegistry.get("led_red")!.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}
    </group>
  );
}
