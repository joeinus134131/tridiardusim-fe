"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

const leadColors = ["#111827", "#22c55e", "#dc2626", "#2563eb"];

export function StepperMotor({ id }: { id: string }) {
  const component = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const rotor = useRef<THREE.Group>(null);
  const current = useRef(Number(component?.state.angle || 0));
  const target = Number(component?.state.angle || 0);

  useFrame((_, delta) => {
    if (!rotor.current) return;
    const diff = target - current.current;
    current.current += THREE.MathUtils.clamp(diff, -720 * delta, 720 * delta);
    rotor.current.rotation.y = THREE.MathUtils.degToRad(current.current);
  });

  return (
    <group>
      {/* 42.3 mm square hybrid NEMA 17 frame with a 38 mm stack. */}
      <RoundedBox args={[4.23, 3.45, 4.23]} radius={0.22} smoothness={4} position={[0, 1.9, 0]} castShadow>
        <meshStandardMaterial color="#20242a" metalness={0.55} roughness={0.42} />
      </RoundedBox>
      {/* Visible stator laminations around the black motor stack. */}
      {Array.from({ length: 17 }, (_, i) => (
        <RoundedBox key={i} args={[4.27, 0.055, 4.27]} radius={0.16} smoothness={2} position={[0, 0.35 + i * 0.195, 0]}>
          <meshStandardMaterial color={i % 2 ? "#171a1f" : "#2b2f35"} metalness={0.5} roughness={0.48} />
        </RoundedBox>
      ))}
      {[0.16, 3.64].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[4.32, 0.28, 4.32]} />
          <meshStandardMaterial color="#111827" metalness={0.62} roughness={0.34} />
        </mesh>
      ))}
      {/* Front aluminium face and four NEMA mounting holes. */}
      <RoundedBox args={[4.28, 0.32, 4.28]} radius={0.24} smoothness={4} position={[0, 3.82, 0]}>
        <meshStandardMaterial color="#c9cdd1" metalness={0.86} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 4.03, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.18, 40]} />
        <meshStandardMaterial color="#d7dadd" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 4.14, 0]}>
        <torusGeometry args={[0.49, 0.12, 12, 32]} />
        <meshStandardMaterial color="#aeb4b9" metalness={0.92} roughness={0.2} />
      </mesh>
      {[-1.55, 1.55].flatMap((x) => [-1.55, 1.55].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 3.94, z]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
          <meshStandardMaterial color="#17191c" roughness={0.6} />
        </mesh>
      )))}

      <group ref={rotor} position={[0, 4.95, 0]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 1.75, 32]} />
          <meshStandardMaterial color="#d8dde2" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0.23, 0.35, 0]}>
          <boxGeometry args={[0.08, 0.78, 0.25]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      <mesh position={[0, 2.0, 2.14]}><planeGeometry args={[2.8, 1.15]} /><meshStandardMaterial color="#d5d8d9" roughness={0.7} /></mesh>
      <Label text="NEMA 17" position={[0, 2.18, 2.16]} rotation={[0,0,0]} size={0.28} color="#111827" />
      <Label text="1.8°  200 STEP" position={[0, 1.75, 2.16]} rotation={[0,0,0]} size={0.16} color="#334155" />

      {/* White JST-style motor connector on its small breakout tab. */}
      <mesh position={[0, 0.38, 2.42]}><boxGeometry args={[2.05, 0.16, 0.85]} /><meshStandardMaterial color="#166534" roughness={0.65} /></mesh>
      <mesh position={[0, 0.62, 2.55]}><boxGeometry args={[1.82, 0.48, 0.62]} /><meshStandardMaterial color="#e8e9e5" roughness={0.55} /></mesh>
      {[-0.57,-0.19,0.19,0.57].map((x) => <mesh key={x} position={[x,0.7,2.88]}><boxGeometry args={[0.18,0.18,0.08]} /><meshStandardMaterial color="#7c858d" metalness={0.65} /></mesh>)}

      {/* Four phase leads and terminal points. */}
      {component?.pins.map((p, i) => (
        <group key={p.id}>
          <mesh position={[p.position[0], 1.0, 2.2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.75, 10]} />
            <meshStandardMaterial color={leadColors[i]} roughness={0.72} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
