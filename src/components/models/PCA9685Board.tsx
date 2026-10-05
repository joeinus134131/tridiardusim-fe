"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

export function PCA9685Board({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const powered = component?.state.isPowered === true;
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.36, 5.0]} />
        <meshStandardMaterial color="#1c6b45" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.43, 0]} castShadow>
        <boxGeometry args={[1.45, 0.22, 1.35]} />
        <meshStandardMaterial color="#111827" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.42]} />
        <meshBasicMaterial color={powered ? "#22c55e" : "#64748b"} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}
