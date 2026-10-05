"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

export function IncrementalEncoder({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const angle = Number(component?.state.angle ?? 0);
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.82, 1.45]} />
        <meshStandardMaterial color="#1e293b" metalness={0.48} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.87, 0]}>
        <cylinderGeometry args={[0.38, 0.48, 0.12, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.72} roughness={0.25} />
      </mesh>
      <group position={[0, 1.18, 0]} rotation={[0, angle, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.56, 20]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.19, 0]}>
          <boxGeometry args={[0.05, 0.3, 0.08]} />
          <meshStandardMaterial color="#f97316" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      {component?.pins.map((pin) => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}
    </group>
  );
}
