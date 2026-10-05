"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";

export function RoverBot({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const x = Number(component?.state.x ?? 0) * 200;
  const z = Number(component?.state.z ?? 0) * 200;
  const heading = Number(component?.state.heading ?? 0);
  const leftPhase = Number(component?.state.leftWheelPhase ?? 0);
  const rightPhase = Number(component?.state.rightWheelPhase ?? 0);
  const pan = Number(component?.state.gimbalPan ?? 0);
  const tilt = Number(component?.state.gimbalTilt ?? 0);

  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      {/* 180 x 140 mm rover chassis at the project's 5 mm/unit scale. */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[29, 2.4, 23]} />
        <meshStandardMaterial color="#334155" metalness={0.48} roughness={0.38} />
      </mesh>
      <mesh position={[0, 8.35, 0]} castShadow>
        <boxGeometry args={[20, 0.45, 15]} />
        <meshStandardMaterial color="#0f172a" metalness={0.35} roughness={0.5} />
      </mesh>
      {[[-16, leftPhase], [16, rightPhase]].flatMap(([side, phase]) =>
        [-7.6, 7.6].map((foreAft) => (
          <group
            key={`${side}:${foreAft}`}
            position={[side, 6, foreAft]}
            rotation={[0, 0, Math.PI / 2 + Number(phase)]}
          >
            <mesh castShadow>
              <cylinderGeometry args={[5.7, 5.7, 3.6, 20]} />
              <meshStandardMaterial color="#17191c" roughness={0.88} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[2.2, 2.2, 3.8, 20]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )),
      )}
      <group position={[0, 8.6, -1]} rotation={[0, pan, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[2.4, 3.1, 3, 20]} />
          <meshStandardMaterial color="#64748b" metalness={0.65} roughness={0.3} />
        </mesh>
        <group position={[0, 3, 0]} rotation={[tilt, 0, 0]}>
          <mesh position={[0, 0, -2]} castShadow>
            <boxGeometry args={[7, 3.5, 5]} />
            <meshStandardMaterial color="#0f172a" metalness={0.42} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -4.65]}>
            <cylinderGeometry args={[1.4, 1.4, 0.5, 24]} />
            <meshStandardMaterial color="#38bdf8" metalness={0.75} roughness={0.2} emissive="#075985" emissiveIntensity={0.25} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 6.1, 9.3]}>
        <boxGeometry args={[8, 0.7, 1]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
