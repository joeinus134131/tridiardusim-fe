"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

const groupCentersMm = [8.89, 21.59, 36.83, 49.53];
const channelX = (channel: number) => {
  const group = Math.floor(channel / 4);
  const index = channel % 4;
  return groupCentersMm[group] + [3.81, 1.27, -1.27, -3.81][index] - 29.21;
};
const servoRows = [0, -2.54, -5.08].map((boardY) => (boardY - 6.223) * 0.2);

export function PCA9685Board({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const powered = component?.state.isPowered === true;
  return (
    <group>
      {/* Adafruit rev C outline: 62.23 x 25.4 mm (12.446 x 5.08 scene units). */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[12.446, 0.36, 5.08]} />
        <meshStandardMaterial color="#176b45" roughness={0.58} />
      </mesh>
      <mesh position={[-0.45, 0.39, 0.55]} castShadow>
        <boxGeometry args={[1.2, 0.12, 1.0]} />
        <meshStandardMaterial color="#111827" metalness={0.25} roughness={0.5} />
      </mesh>
      {/* Four assembled 3 x 4 servo header banks, each with yellow/red/black rows. */}
      {groupCentersMm.map((centerMm, group) => (
        <mesh key={`housing-${group}`} position={[(centerMm - 29.21) * 0.2, 0.4, (servoRows[0] + servoRows[2]) / 2]} castShadow>
          <boxGeometry args={[2.14, 0.3, 1.32]} />
          <meshStandardMaterial color="#111827" roughness={0.55} />
        </mesh>
      ))}
      {Array.from({ length: 16 }, (_, channel) => {
        const x = channelX(channel) * 0.2;
        return servoRows.map((z, row) => {
          const colors = ["#facc15", "#dc2626", "#111827"];
          return <group key={`${channel}:${row}`} position={[x, 0.42, z]}>
            <mesh castShadow><boxGeometry args={[0.1, 0.28, 0.1]} /><meshStandardMaterial color={colors[row]} roughness={0.38} /></mesh>
            <mesh position={[0, -0.44, 0]}><boxGeometry args={[0.055, 0.76, 0.055]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.22} /></mesh>
          </group>;
        });
      })}
      {/* Two-pin external servo supply terminal and 8 mm filter capacitor. */}
      <group position={[0, 0.41, 1.778]}>
        <mesh castShadow><boxGeometry args={[1.4, 0.55, 1.4]} /><meshStandardMaterial color="#15803d" roughness={0.65} /></mesh>
        {[-0.36, 0.34].map((x) => <group key={x} position={[x, 0.41, 0]}><mesh><cylinderGeometry args={[0.1, 0.1, 0.18, 12]} /><meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.2} /></mesh><mesh position={[0, 0.1, 0]}><boxGeometry args={[0.13, 0.012, 0.025]} /><meshStandardMaterial color="#334155" /></mesh></group>)}
      </group>
      <group position={[-3.86, 0.64, 1.7]}>
        <mesh castShadow><cylinderGeometry args={[0.8, 0.8, 0.95, 24]} /><meshStandardMaterial color="#111827" roughness={0.58} /></mesh>
        <mesh position={[0, 0.49, 0]}><cylinderGeometry args={[0.73, 0.73, 0.04, 24]} /><meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.25} /></mesh>
      </group>
      {/* Six-pin I2C pass-through headers at both short edges. */}
      {[-5.842, 5.842].map((x) => Array.from({ length: 6 }, (_, index) => {
        const z = -1.245 + index * 0.508;
        return <group key={`${x}:${index}`} position={[x, 0.4, z]}><mesh><boxGeometry args={[0.22, 0.3, 0.22]} /><meshStandardMaterial color="#111827" /></mesh><mesh position={[0, -0.44, 0]}><cylinderGeometry args={[0.04, 0.04, 0.76, 8]} /><meshStandardMaterial color="#d4a843" metalness={0.78} roughness={0.24} /></mesh></group>;
      }))}
      {/* Six address-select solder jumpers along the upper edge. */}
      {Array.from({ length: 6 }, (_, index) => <mesh key={`addr-${index}`} position={[1.8 + index * 0.508, 0.39, 1.5]}><boxGeometry args={[0.28, 0.035, 0.14]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>)}
      <mesh position={[1.24, 0.39, 2.05]}>
        <boxGeometry args={[0.58, 0.035, 0.12]} />
        <meshBasicMaterial color={powered ? "#22c55e" : "#64748b"} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}
