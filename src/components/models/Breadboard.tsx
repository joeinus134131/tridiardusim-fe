"use client";
import { useLayoutEffect, useRef, memo } from "react";
import * as THREE from "three";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

export const Breadboard = memo(function Breadboard({ id }: { id?: string }) {
  const pins = ComponentRegistry.get("breadboard")!.pins;
  const holes = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pins.forEach((p, i) => {
      m.makeTranslation(...p.position);
      holes.current!.setMatrixAt(i, m);
    });
    holes.current!.instanceMatrix.needsUpdate = true;
  }, [pins]);

  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[16.8, 1.7, 10.86]} />
        <meshStandardMaterial color="#f1f0e9" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.71, 0]}>
        <boxGeometry args={[15.8, 0.02, 0.4]} />
        <meshStandardMaterial color="#9c9d9a" />
      </mesh>
      <instancedMesh ref={holes} args={[undefined, undefined, pins.length]}>
        <boxGeometry args={[0.19, 0.025, 0.19]} />
        <meshBasicMaterial color="#292e33" />
      </instancedMesh>
      {[-1, 1].flatMap((side) =>
        [0, 1].map((row) => (
          <mesh
            key={side + ":" + row}
            position={[0, 1.714, side * (5.12 - row * 0.5)]}
          >
            <boxGeometry args={[15.8, 0.015, 0.03]} />
            <meshBasicMaterial color={row ? "#282e33" : "#db3e3e"} />
          </mesh>
        )),
      )}
      {Array.from({ length: 30 }, (_, i) => (
        <Label
          key={i}
          text={String(i + 1)}
          position={[-7.366 + i * 0.508, 1.73, -0.3]}
          color="#494e52"
          size={0.16}
        />
      ))}
      {["E", "D", "C", "B", "A", "F", "G", "H", "I", "J"].map((r, i) => (
        <Label
          key={r}
          text={r}
          position={[
            -7.95,
            1.73,
            i < 5 ? -0.762 - i * 0.508 : 0.762 + (i - 5) * 0.508,
          ]}
          color="#494e52"
          size={0.16}
        />
      ))}
      {id &&
        pins.map((p) => <PinHighlight key={p.id} componentId={id} pin={p} />)}
    </group>
  );
});
