"use client";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";

export function PushButton({ id }: { id: string }) {
  const down = useSimulatorStore(
    (s) => !!s.components.find((c) => c.id === id)?.state.isPressed,
  );
  const update = useSimulatorStore((s) => s.updateComponentState);

  return (
    <group>
      {/* Plastic Base Body */}
      <mesh position={[0, 0.31, 0]} castShadow>
        <boxGeometry args={[1.2, 0.62, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Top Metal Bracket */}
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[1.16, 0.05, 1.16]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {/* Button Plunger */}
      <mesh
        position={[0, down ? 0.72 : 0.78, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          update(id, { isPressed: true });
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          update(id, { isPressed: false });
        }}
        onPointerLeave={() => update(id, { isPressed: false })}
      >
        <cylinderGeometry args={[0.36, 0.36, 0.2, 24]} />
        <meshStandardMaterial color="#fef08a" roughness={0.5} />
      </mesh>
      {/* Four folded metal tabs at the corners of the 6 mm switch body. */}
      {ComponentRegistry.get("push_button")!.pins.map((p) => {
        const dx = Math.sign(p.position[0]);
        const dz = Math.sign(p.position[2]);
        return (
          <group key={`terminal:${p.id}`}>
            <mesh position={[p.position[0], -0.03, p.position[2]]}>
              <boxGeometry args={[0.1, 0.08, 0.1]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[p.position[0], 0.015, p.position[2] - dz * 0.17]}>
              <boxGeometry args={[0.1, 0.06, 0.34]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[p.position[0] - dx * 0.14, -0.3, p.position[2]]}>
              <boxGeometry args={[0.08, 0.6, 0.08]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        );
      })}
      {/* Pins and Leads */}
      {ComponentRegistry.get("push_button")!.pins.map((p) => (
        <group key={p.id}>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
