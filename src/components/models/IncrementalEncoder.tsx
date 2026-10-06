"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

export function IncrementalEncoder({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const update = useSimulatorStore((state) => state.updateComponentState);
  const angle = Number(component?.state.angle ?? 0);
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        {/* KY-040 breakout board: approximately 29 x 17 mm at 0.2 units/mm. */}
        <boxGeometry args={[5.8, 0.12, 3.4]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.25} roughness={0.55} />
      </mesh>
      {/* 12 mm rotary encoder can, mounting nut, and shaft. */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.1, 1.3, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.52} roughness={0.42} />
      </mesh>
      {/* Pull-up components and tactile switch parts visible around the encoder can. */}
      {[-1.75, 1.75].map((x) => (
        <group key={`pullup:${x}`} position={[x, 0.16, 0.45]}>
          <mesh><boxGeometry args={[0.68, 0.12, 0.28]} /><meshStandardMaterial color="#16181a" roughness={0.65} /></mesh>
          {[ -0.22, 0.22 ].map((dx) => <mesh key={dx} position={[dx, -0.02, 0]}><boxGeometry args={[0.08, 0.16, 0.32]} /><meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.28} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 0.17, 1.15]}><boxGeometry args={[1.3, 0.12, 0.72]} /><meshStandardMaterial color="#1f2937" roughness={0.68} /></mesh>
      {[ -0.38, 0, 0.38 ].map((x) => <mesh key={x} position={[x, 0.12, 1.15]}><boxGeometry args={[0.08, 0.16, 0.5]} /><meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.25} /></mesh>)}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.12, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.24} />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.32, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh position={[0, 2.52, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.6, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.22} />
      </mesh>
      <group
        position={[0, 4.5, 0]}
        rotation={[0, angle, 0]}
        onClick={(event) => {
          event.stopPropagation();
          update(id, { angle: (angle + (Math.PI * 2) / 20) % (Math.PI * 2) });
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          update(id, { isPressed: true });
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          update(id, { isPressed: false });
        }}
        onPointerLeave={() => update(id, { isPressed: false })}
      >
        <mesh castShadow>
          <cylinderGeometry args={[1.3, 1.3, 2.7, 32]} />
          <meshStandardMaterial color="#111827" roughness={0.7} />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => <mesh key={i} rotation={[0, i * Math.PI / 8, 0]}><boxGeometry args={[2.65, 2.5, 0.045]} /><meshStandardMaterial color="#1f2937" roughness={0.72} /></mesh>)}
        <mesh position={[0, 1.38, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.84} roughness={0.2} />
        </mesh>
      </group>
      {/* KY-040 five-pin header at 2.54 mm pitch; SW is a momentary contact. */}
      {[
        { text: "GND", x: -2.3 }, { text: "VCC", x: -1.15 }, { text: "SW", x: 0 },
        { text: "DT", x: 1.15 }, { text: "CLK", x: 2.3 },
      ].map((label) => <Label key={label.text} text={label.text} position={[label.x, 0.16, 1.35]} size={0.14} color="#e5e7eb" />)}
      {component?.pins.map((pin) => (
        <mesh key={pin.id} position={[pin.position[0], -0.24, pin.position[2]]}>
          <boxGeometry args={[0.08, 0.72, 0.08]} />
          <meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.22} />
        </mesh>
      ))}
      {component?.pins.map((pin) => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}
    </group>
  );
}
