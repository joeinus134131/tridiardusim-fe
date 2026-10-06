"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

const leadColors = ["#111827", "#22c55e", "#dc2626", "#2563eb"];
const motorScale = 0.2; // 0.2 scene units per millimetre.

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
    <group scale={motorScale}>
      {/* 42.3 mm NEMA-17 frame and the configured 38 mm motor body. */}
      <RoundedBox args={[42.3, 38, 42.3]} radius={1.1} smoothness={4} position={[0, 19, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#20242a" metalness={0.55} roughness={0.42} />
      </RoundedBox>

      {/* Thin visible laminations span the complete stator stack. */}
      {Array.from({ length: 17 }, (_, i) => (
        <mesh key={i} position={[0, 2.5 + i * 2.05, 0]}>
          <boxGeometry args={[42.8, 0.22, 42.8]} />
          <meshStandardMaterial color={i % 2 ? "#171a1f" : "#343a40"} metalness={0.58} roughness={0.46} />
        </mesh>
      ))}

      {/* Front face, 31 mm mounting pattern, 22 mm pilot and 5 mm D shaft. */}
      <RoundedBox args={[43, 1.8, 43]} radius={1.1} smoothness={4} position={[0, 38.7, 0]}>
        <meshStandardMaterial color="#c9cdd1" metalness={0.86} roughness={0.25} />
      </RoundedBox>
      {[-15.5, 15.5].flatMap((x) => [-15.5, 15.5].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 39.65, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.55, 1.55, 0.3, 20]} />
          <meshStandardMaterial color="#121619" metalness={0.28} roughness={0.62} />
        </mesh>
      )))}
      <mesh position={[0, 39.85, 0]}>
        <cylinderGeometry args={[11, 11, 1.2, 40]} />
        <meshStandardMaterial color="#d7dadd" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 40.5, 0]}>
        <torusGeometry args={[8.2, 0.6, 12, 32]} />
        <meshStandardMaterial color="#aeb4b9" metalness={0.92} roughness={0.2} />
      </mesh>

      <group ref={rotor} position={[0, 52, 0]}>
        <mesh>
          <cylinderGeometry args={[2.5, 2.5, 24, 32]} />
          <meshStandardMaterial color="#d8dde2" metalness={0.92} roughness={0.18} />
        </mesh>
        {/* Flat cut along one side of the shaft. */}
        <mesh position={[2.25, 0, 0]}>
          <boxGeometry args={[0.5, 23, 5]} />
          <meshStandardMaterial color="#aeb7bf" metalness={0.9} roughness={0.22} />
        </mesh>
      </group>

      {/* Side label and 300 mm bare phase leads (SOYO SY42STH38-1684A). */}
      <mesh position={[0, 32, -21.25]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[28, 11]} />
        <meshStandardMaterial color="#d5d8d9" roughness={0.7} />
      </mesh>
      <Label text="NEMA 17" position={[0, 33.5, -21.4]} rotation={[0, Math.PI, 0]} size={2.6} color="#111827" />
      <Label text="1.8°  200 STEP" position={[0, 29.2, -21.4]} rotation={[0, Math.PI, 0]} size={1.5} color="#334155" />

      <mesh position={[0, 19, 21.25]}>
        <boxGeometry args={[5.5, 3.2, 1.2]} />
        <meshStandardMaterial color="#111827" roughness={0.72} />
      </mesh>
      {component?.pins.map((pin, i) => {
        const color = leadColors[i % leadColors.length];
        return (
          <group key={pin.id}>
            <mesh position={[pin.position[0] / motorScale, pin.position[1] / motorScale, 171]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 300, 12]} />
              <meshStandardMaterial color={color} roughness={0.72} />
            </mesh>
            <mesh position={[pin.position[0] / motorScale, pin.position[1] / motorScale, pin.position[2] / motorScale - 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 5, 10]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.86} roughness={0.2} />
            </mesh>
            {/* Pin positions are stored in world scene units; cancel this model's mm scaling. */}
            <group scale={1 / motorScale}>
              <PinHighlight componentId={id} pin={pin} />
            </group>
          </group>
        );
      })}
    </group>
  );
}
