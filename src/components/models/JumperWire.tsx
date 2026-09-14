"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
export function JumperWire({ id }: { id: string }) {
  const c = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const depth = Number(c?.state.depth || 8), height = Number(c?.state.bendHeight || .3);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, 0.23, -2.1),
        new THREE.Vector3(-3.3, height, -depth*.5),
        new THREE.Vector3(-3, height, -depth*.875),
        new THREE.Vector3(0, height, -depth),
        new THREE.Vector3(3, height, -depth*.875),
        new THREE.Vector3(3.3, height, -depth*.5),
        new THREE.Vector3(2, 0.23, -2.1),
      ]),
    [depth,height],
  );
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curve, 40, 0.11, 8, false]} />
        <meshStandardMaterial
          color={String(c?.state.color || "red")}
          roughness={0.7}
        />
      </mesh>
      {[-2, 2].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.23, -1.4]}>
            <boxGeometry args={[0.5, 0.46, 1.4]} />
            <meshStandardMaterial color="#171b21" />
          </mesh>
          <mesh position={[x, 0.23, -0.35]}>
            <boxGeometry args={[0.128, 0.128, 0.7]} />
            <meshStandardMaterial
              color="#bfc6cb"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      {ComponentRegistry.get(c?.typeId || "jumper_red")!.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}
    </group>
  );
}
