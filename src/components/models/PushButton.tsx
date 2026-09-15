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
        <boxGeometry args={[1.3, 0.62, 1.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Top Metal Bracket */}
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[1.24, 0.05, 1.24]} />
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
      {/* 4 Corner Rivets */}
      {[-0.48, 0.48].flatMap((x) =>
        [-0.48, 0.48].map((z) => (
          <mesh key={x + ":" + z} position={[x, 0.68, z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        )),
      )}
      {/* Pins and Leads */}
      {ComponentRegistry.get("push_button")!.pins.map((p) => (
        <group key={p.id}>
          {/* Vertical pin shank going down into breadboard */}
          <mesh position={[p.position[0], -0.3, p.position[2]]}>
            <boxGeometry args={[0.08, 0.6, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
