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
      {/* 180 x 140 mm two-plate robot-car chassis at 5 mm per scene unit. */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[36, 1.2, 28]} />
        <meshStandardMaterial color="#334155" metalness={0.48} roughness={0.38} />
      </mesh>
      <mesh position={[0, 8.35, 0]} castShadow>
        <boxGeometry args={[28, 0.45, 22]} />
        <meshStandardMaterial color="#0f172a" metalness={0.35} roughness={0.5} />
      </mesh>
      {/* Slotted mounting pattern through both acrylic decks. */}
      {[-13, -8, 8, 13].flatMap((x) => [-9, 0, 9].map((z) => (
        <mesh key={`${x}:${z}`} position={[x, 7.64, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.04, 12]} />
          <meshStandardMaterial color="#111827" metalness={0.25} roughness={0.68} />
        </mesh>
      )))}
      {/* Four yellow TT gearmotors, mounted below the deck and driving each wheel. */}
      {[-1, 1].flatMap((side) => [-7.6, 7.6].map((foreAft) => (
        <group key={`motor:${side}:${foreAft}`} position={[side * 12.5, 4.5, foreAft]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow><boxGeometry args={[5.6, 3.5, 4.4]} /><meshStandardMaterial color="#eabf32" roughness={0.48} /></mesh>
          <mesh position={[0, side > 0 ? 2.05 : -2.05, 0]}><cylinderGeometry args={[1.25, 1.25, 0.7, 20]} /><meshStandardMaterial color="#64748b" metalness={0.72} roughness={0.28} /></mesh>
          <mesh position={[0, 0, 2.28]}><boxGeometry args={[5.8, 0.6, 0.24]} /><meshStandardMaterial color="#d1d5db" metalness={0.74} roughness={0.3} /></mesh>
          <mesh position={[0, side > 0 ? 2.45 : -2.45, 0]}><cylinderGeometry args={[0.72, 0.72, 0.32, 16]} /><meshStandardMaterial color="#111827" metalness={0.42} roughness={0.42} /></mesh>
          {[-1, 1].map((offset) => <mesh key={`mount:${offset}`} position={[offset * 2.15, -1.78, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.86} roughness={0.22} />
          </mesh>)}
        </group>
      )))}
      {[[-1, leftPhase], [1, rightPhase]].flatMap(([side, phase]) =>
        [-7.6, 7.6].map((foreAft) => (
          <group
            key={`${side}:${foreAft}`}
            position={[side * 16, 6, foreAft]}
            rotation={[0, 0, Math.PI / 2 + Number(phase)]}
          >
            <mesh castShadow>
              <cylinderGeometry args={[5.7, 5.7, 3.6, 20]} />
              <meshStandardMaterial color="#17191c" roughness={0.88} />
            </mesh>
            {/* Molded tread blocks around the tire and raised hub fasteners. */}
            {Array.from({ length: 16 }, (_, tread) => {
              const angle = (tread / 16) * Math.PI * 2;
              return <mesh key={`tread:${tread}`} position={[Math.sin(angle) * 5.48, 0, Math.cos(angle) * 5.48]} rotation={[0, angle, 0]} castShadow>
                <boxGeometry args={[1.15, 3.15, 0.55]} />
                <meshStandardMaterial color="#25282b" roughness={0.92} />
              </mesh>;
            })}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[2.2, 2.2, 3.8, 20]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.55, 1.55, 3.95, 20]} />
              <meshStandardMaterial color="#334155" metalness={0.72} roughness={0.32} />
            </mesh>
            {Array.from({ length: 5 }, (_, bolt) => {
              const angle = (bolt / 5) * Math.PI * 2;
              return <mesh key={`lug:${bolt}`} position={[0, Math.sin(angle) * 1.82, Math.cos(angle) * 1.82]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.22, 0.22, 3.98, 6]} />
                <meshStandardMaterial color="#d1d5db" metalness={0.88} roughness={0.2} />
              </mesh>;
            })}
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
