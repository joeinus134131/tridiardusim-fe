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
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.96, 1.3, 1.5]} />
        <meshStandardMaterial color="#237b5d" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.83, 0.83, 0.15, 24]} />
        <meshStandardMaterial color="#b6bbb9" metalness={0.7} />
      </mesh>
      <group
        rotation={[0, (value - 0.5) * Math.PI * 1.66, 0]}
        onClick={(e) => {
          e.stopPropagation();
          select(id);
        }}
      >
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry
            args={[0.6, 0.6, 1.7, 32, 1, false, Math.PI * 0.15, Math.PI * 1.7]}
          />
          <meshStandardMaterial color="#ece9d9" roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.06, 0]}>
          <boxGeometry args={[0.06, 0.02, 1]} />
          <meshStandardMaterial color="#56564c" />
        </mesh>
      </group>
      <Label
        text="B10K"
        position={[0, 1.42, 0.62]}
        size={0.13}
        color="#202c24"
      />
      {ComponentRegistry.get("potentiometer")!.pins.map((p) => (
        <group key={p.id}>
          <mesh position={[p.position[0], -0.35, p.position[2]]}>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
            <meshStandardMaterial color="#b6bbb9" metalness={0.8} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
