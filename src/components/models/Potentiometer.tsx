"use client";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

export function Potentiometer({ id }: { id: string }) {
  const value = useSimulatorStore((s) =>
    Number(s.components.find((c) => c.id === id)?.state.value || 0),
  );
  const select = useSimulatorStore((s) => s.selectComponent);

  return (
    <group>
      {/* Main Potentiometer Box Body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.96, 1.3, 1.5]} />
        <meshStandardMaterial color="#1e6b50" roughness={0.65} metalness={0.1} />
      </mesh>
      {/* Metallic Bushing / Collar */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.15, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Rotatable Shaft & Indicator Notch */}
      <group
        rotation={[0, (value - 0.5) * Math.PI * 1.66, 0]}
        onClick={(e) => {
          e.stopPropagation();
          select(id);
        }}
      >
        <mesh position={[0, 2.15, 0]}>
          <cylinderGeometry
            args={[0.55, 0.55, 1.6, 32, 1, false, Math.PI * 0.15, Math.PI * 1.7]}
          />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
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
