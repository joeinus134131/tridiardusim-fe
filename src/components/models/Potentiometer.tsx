"use client";
import { useMemo } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

export function Potentiometer({ id }: { id: string }) {
  const value = useSimulatorStore((s) =>
    Number(s.components.find((c) => c.id === id)?.state.value || 0),
  );
  const select = useSimulatorStore((s) => s.selectComponent);
  const dShaftGeometry = useMemo(() => {
    const radius = 0.55;
    const flatX = 0.38;
    const flatHalfHeight = Math.sqrt(radius * radius - flatX * flatX);
    const arc = Math.acos(flatX / radius);
    const shape = new THREE.Shape();
    shape.moveTo(flatX, -flatHalfHeight);
    shape.absarc(0, 0, radius, -arc, arc - Math.PI * 2, true);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false, curveSegments: 32 });
  }, []);

  return (
    <group>
      {/* Main Potentiometer Box Body */}
      <RoundedBox args={[1.96, 1.3, 1.5]} radius={0.22} smoothness={4} position={[0, 0.65, 0]} castShadow>
        <meshStandardMaterial color="#17191c" roughness={0.72} metalness={0.08} />
      </RoundedBox>
      {/* Metallic Bushing / Collar */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.15, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Threaded panel bushing, retaining washer, and hex mounting nut. */}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.1, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.24} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`thread:${i}`} position={[0, 1.35 + i * 0.15, 0]}>
          <torusGeometry args={[0.9, 0.04, 6, 32]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.04, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.18, 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.06, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.82} roughness={0.25} />
      </mesh>
      {/* Rotatable Shaft & Indicator Notch */}
      <group
        rotation={[0, (value - 0.5) * Math.PI * 1.66, 0]}
        onClick={(e) => {
          e.stopPropagation();
          select(id);
        }}
      >
        <mesh geometry={dShaftGeometry} position={[0, 1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#e5e7eb" metalness={0.82} roughness={0.22} />
        </mesh>
        <mesh position={[0, 2.96, 0]}>
          <boxGeometry args={[0.06, 0.02, 0.9]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
      {/* Label */}
      <Label
        text="B10K"
        position={[0, 1.36, 0.76]}
        size={0.15}
        color="#ffffff"
      />
      {/* Three solder lugs on the rear face of the carbon-track body. */}
      {ComponentRegistry.get("potentiometer")!.pins.map((p) => (
        <mesh key={`lug:${p.id}`} position={[p.position[0], 0.18, p.position[2]]}>
          <boxGeometry args={[0.16, 0.34, 0.1]} />
          <meshStandardMaterial color="#d6a83b" metalness={0.86} roughness={0.24} />
        </mesh>
      ))}
      {/* Breadboard Contact Leads */}
      {ComponentRegistry.get("potentiometer")!.pins.map((p) => (
        <group key={p.id}>
          <mesh position={[p.position[0], -0.3, p.position[2]]}>
            <boxGeometry args={[0.08, 0.6, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
