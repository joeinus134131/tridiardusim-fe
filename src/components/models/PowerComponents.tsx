"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

function BatteryLead({ from, to, color, via = [] }: { from: [number, number, number]; to: [number, number, number]; color: string; via?: [number, number, number][] }) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    mid.z += 0.22;
    return new THREE.CatmullRomCurve3([start, ...via.map((point) => new THREE.Vector3(...point)), mid, end]);
  }, [from, to, via]);
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 16, 0.09, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

export function A4988Driver({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const temperature = Number(component?.state.temperatureC) || 25;
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.048, 0.35, 4.064]} />
        <meshStandardMaterial color="#991b32" roughness={0.58} />
      </mesh>
      {/* Two 8-pin 2.54 mm headers on the carrier edges. */}
      {[-1, 1].flatMap((x) => Array.from({ length: 8 }, (_, i) => (
        <group key={`${x}:${i}`} position={[x, -0.03, -1.778 + i * 0.508]}>
          <mesh><boxGeometry args={[0.22, 0.28, 0.22]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, -0.29, 0]}><boxGeometry args={[0.075, 0.38, 0.075]} /><meshStandardMaterial color="#d5a746" metalness={0.82} roughness={0.22} /></mesh>
        </group>
      )))}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.8, 0.36, 1.4]} />
        <meshStandardMaterial color="#1f2937" metalness={0.38} roughness={0.48} />
      </mesh>
      {/* Low-profile bonded aluminium heatsink, with separated cooling fins. */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.9, 0.08, 1.9]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.28} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-0.72 + i * 0.24, 0.94, 0]} castShadow>
          <boxGeometry args={[0.075, 0.48, 1.8]} />
          <meshStandardMaterial color={temperature > 130 ? "#b45309" : "#cbd5e1"} metalness={0.82} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[-0.9, 0.48, -0.8]}>
        <cylinderGeometry args={[0.16, 0.16, 0.1, 16]} />
        <meshStandardMaterial color="#d4a843" metalness={0.78} roughness={0.25} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcSupply({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  return (
    <group>
      {/* Siglent SPD3303X-E envelope: 225 x 143 x 278 mm at 0.2 units/mm. */}
      <mesh position={[0, 14.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[45, 28.6, 55.6]} />
        <meshStandardMaterial color="#334155" metalness={0.48} roughness={0.42} />
      </mesh>
      <mesh position={[-8, 19, 27.85]}>
        <planeGeometry args={[19, 10.5]} />
        <meshStandardMaterial color="#0f172a" emissive="#164e63" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[-8, 19, 27.9]}>
        <planeGeometry args={[17, 8.7]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>
      {/* Manufacturer style screen frame and front-panel legends. */}
      <mesh position={[-8, 19, 28.03]}><boxGeometry args={[18.6, 11.1, 0.16]} /><meshStandardMaterial color="#111827" metalness={0.28} roughness={0.5} /></mesh>
      <mesh position={[-8, 19, 28.13]}><planeGeometry args={[17, 8.7]} /><meshBasicMaterial color="#67e8f9" /></mesh>
      <Label text="CH1  00.00V  0.000A" position={[-8, 21.1, 28.15]} size={0.52} color="#082f49" rotation={[0, 0, 0]} />
      <Label text="CH2  00.00V  0.000A" position={[-8, 17.4, 28.15]} size={0.46} color="#082f49" rotation={[0, 0, 0]} />
      {/* Channel voltage/current encoders, grouped below the display. */}
      {[-16, -11, -6, -1].map((x, index) => (
        <group key={x} position={[x, 5.5, 28.05]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.8, 1.8, 0.8, 24]} /><meshStandardMaterial color="#111827" metalness={0.48} roughness={0.35} /></mesh>
          <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.15, 1.15, 0.55, 24]} /><meshStandardMaterial color={index % 2 === 0 ? "#2563eb" : "#d97706"} roughness={0.45} /></mesh>
          <mesh position={[0, 0.45, 0.56]}><boxGeometry args={[0.12, 0.6, 0.1]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <Label text={index < 2 ? "VOLTAGE" : "CURRENT"} position={[x, 2.25, 28.16]} size={0.28} color="#cbd5e1" rotation={[0, 0, 0]} />
        </group>
      ))}
      <mesh position={[18, 19, 27.95]} castShadow><boxGeometry args={[2.4, 3.2, 0.5]} /><meshStandardMaterial color="#111827" roughness={0.55} /></mesh>
      <mesh position={[18, 19, 28.22]}><boxGeometry args={[1.6, 1.5, 0.12]} /><meshStandardMaterial color="#dc2626" roughness={0.4} /></mesh>
      <Label text="POWER" position={[18, 16.6, 28.14]} size={0.3} color="#e2e8f0" rotation={[0, 0, 0]} />
      {[[-12, "CH1"], [0, "CH2"], [12, "CH3"]].map(([x, text]) => (
        <Label key={String(text)} text={String(text)} position={[Number(x), 1.7, 28.16]} size={0.42} color="#e2e8f0" rotation={[0, 0, 0]} />
      ))}
      {/* Three isolated output pairs. CH1 pair is the solver's V+/GND connection. */}
      {[0, -12, 12].flatMap((x, channel) => [-1, 1].map((side) => (
        <group key={`${channel}:${side}`} position={[x + side * 1.2, 3.8, 28.35]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.9, 0.9, 1.1, 20]} /><meshStandardMaterial color={side < 0 ? "#ef4444" : "#111827"} metalness={0.55} roughness={0.35} /></mesh>
          <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.48, 0.48, 0.18, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} /></mesh>
          <mesh position={[0, 0, 0.68]}><boxGeometry args={[0.52, 0.08, 0.035]} /><meshStandardMaterial color="#334155" /></mesh>
        </group>
      )))}
      {/* Side cooling slots and rear exhaust grille. */}
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[22.54, 7 + i * 2.1, -5]}><boxGeometry args={[0.04, 0.55, 20]} /><meshStandardMaterial color="#111827" roughness={0.8} /></mesh>)}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-12 + i * 3, 14.3, -27.84]}><boxGeometry args={[1.0, 12, 0.04]} /><meshStandardMaterial color="#111827" roughness={0.8} /></mesh>)}
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function BatteryPack({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const profile = String(component?.state.profile || "liion_18650");
  const pinEnds: [[number, number, number], [number, number, number]] = [[-1.2, 0.2, 17], [1.2, 0.2, 17]];
  return (
    <group>
      {profile === "liion_18650" && (
        <group>
          {/* Single 18650 cell in a holder: 18.3 mm diameter × 65 mm long. */}
          <mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[4.2, 0.36, 14.2]} /><meshStandardMaterial color="#334155" roughness={0.55} /></mesh>
          {[-1, 1].map((side) => <mesh key={side} position={[side * 1.98, 0.58, 0]} castShadow><boxGeometry args={[0.24, 0.62, 13.6]} /><meshStandardMaterial color="#1f2937" roughness={0.6} /></mesh>)}
          {[-1, 1].map((side) => <mesh key={side} position={[0, 0.52, side * 6.9]}><boxGeometry args={[4.05, 0.55, 0.32]} /><meshStandardMaterial color="#475569" roughness={0.55} /></mesh>)}
          <mesh position={[0, 2.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[1.83, 1.83, 13, 40]} />
            <meshStandardMaterial color="#166534" roughness={0.52} metalness={0.08} />
          </mesh>
          {/* Negative can base and insulated positive button at opposite ends. */}
          <mesh position={[0, 2.04, -6.57]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.72, 1.72, 0.12, 36]} /><meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.24} /></mesh>
          <mesh position={[0, 2.04, 6.57]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.5, 1.5, 0.14, 36]} /><meshStandardMaterial color="#111827" roughness={0.72} /></mesh>
          <mesh position={[0, 2.04, 6.69]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.22, 24]} /><meshStandardMaterial color="#d1d5db" metalness={0.86} roughness={0.2} /></mesh>
          <Label text="INR18650 · 2500mAh" position={[0, 3.87, 0]} size={0.26} color="#f8fafc" />
          <BatteryLead from={[0, 2.04, 6.78]} to={pinEnds[0]} color="#dc2626" />
          <BatteryLead from={[0, 2.04, -6.62]} to={pinEnds[1]} color="#111827" via={[[2.5, 2.04, -6.3], [2.5, 2.04, 6], [1.6, 1.3, 14]]} />
        </group>
      )}
      {profile === "lipo_2s" && (
        <group>
          {/* Reference envelope: 160 × 46 × 15 mm 2S soft pack. */}
          <RoundedBox args={[9.2, 3, 32]} radius={0.42} smoothness={3} position={[0, 1.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#b91c1c" roughness={0.42} metalness={0.06} />
          </RoundedBox>
          <mesh position={[0, 3.02, 0]}><boxGeometry args={[8.5, 0.04, 31.2]} /><meshStandardMaterial color="#ef4444" roughness={0.48} /></mesh>
          <mesh position={[0, 3.06, 0]}><boxGeometry args={[0.12, 0.025, 30]} /><meshStandardMaterial color="#7f1d1d" roughness={0.6} /></mesh>
          <Label text="7.4V 5000mAh 2S LiPo" position={[0, 3.09, 0]} size={0.62} color="#fff7ed" />
          {/* XT60 main connector and three-wire JST-XH balance lead. */}
          <mesh position={[0, 1.35, 16.3]}><boxGeometry args={[2.3, 1.6, 1.25]} /><meshStandardMaterial color="#eab308" roughness={0.42} /></mesh>
          {[-0.42, 0, 0.42].map((x) => <mesh key={x} position={[x, 1.35, 16.94]}><cylinderGeometry args={[0.12, 0.12, 0.12, 10]} /><meshStandardMaterial color="#d1d5db" metalness={0.84} roughness={0.2} /></mesh>)}
          <mesh position={[-3.35, 1.05, 16.2]}><boxGeometry args={[1.05, 0.75, 0.75]} /><meshStandardMaterial color="#f8fafc" roughness={0.55} /></mesh>
          {[-0.24, 0, 0.24].map((x) => <mesh key={x} position={[-3.35 + x, 1.05, 16.6]}><boxGeometry args={[0.09, 0.4, 0.12]} /><meshStandardMaterial color="#d1d5db" metalness={0.78} /></mesh>)}
          <BatteryLead from={[-0.55, 1.2, 16.1]} to={pinEnds[0]} color="#dc2626" />
          <BatteryLead from={[0.55, 1.2, 16.1]} to={pinEnds[1]} color="#111827" />
        </group>
      )}
      {profile === "alkaline_9v" && (
        <group>
          {/* Duracell MN1604 envelope: 26.5 × 17.5 × 48.5 mm. */}
          <RoundedBox args={[5.3, 9.7, 3.5]} radius={0.32} smoothness={4} position={[0, 4.85, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#111827" roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 4.8, 1.76]}><boxGeometry args={[4.9, 8.9, 0.035]} /><meshStandardMaterial color="#1d4ed8" roughness={0.55} /></mesh>
          <Label text="DURACELL" position={[0, 6.1, 1.79]} rotation={[0, 0, 0]} size={0.5} color="#f8fafc" />
          <Label text="ALKALINE 9V" position={[0, 5.2, 1.79]} rotation={[0, 0, 0]} size={0.24} color="#facc15" />
          {/* Standard unequal snap terminals on the top cap. */}
          <mesh position={[-1.27, 9.72, 0.3]}><cylinderGeometry args={[0.43, 0.43, 0.3, 18]} /><meshStandardMaterial color="#cbd5e1" metalness={0.84} roughness={0.22} /></mesh>
          <mesh position={[1.27, 9.68, 0.3]}><cylinderGeometry args={[0.28, 0.28, 0.22, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.84} roughness={0.22} /></mesh>
          <mesh position={[-1.27, 9.9, 0.3]}><torusGeometry args={[0.22, 0.08, 8, 16]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.24} /></mesh>
          <BatteryLead from={[-1.27, 9.82, 0.3]} to={pinEnds[0]} color="#dc2626" />
          <BatteryLead from={[1.27, 9.76, 0.3]} to={pinEnds[1]} color="#111827" />
        </group>
      )}
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcDcConverter({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        {/* Common LM2596 carrier outline is about 43 x 21 mm. */}
        <boxGeometry args={[8.6, 0.4, 4.2]} />
        <meshStandardMaterial color="#2563eb" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[1.1, 0.3, 0.9]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Shielded drum inductor and blue multi-turn trimmer. */}
      <mesh position={[-0.82, 0.56, -0.35]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.36, 18]} />
        <meshStandardMaterial color="#374151" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[-0.82, 0.75, -0.35]}><cylinderGeometry args={[0.2, 0.2, 0.035, 18]} /><meshStandardMaterial color="#d1d5db" metalness={0.75} roughness={0.24} /></mesh>
      <group position={[0.65, 0.48, -0.48]}>
        <mesh castShadow><boxGeometry args={[0.62, 0.5, 0.52]} /><meshStandardMaterial color="#2563eb" roughness={0.42} /></mesh>
        <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.13, 0.13, 0.06, 12]} /><meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.2} /></mesh>
        <mesh position={[0, 0.31, 0]}><boxGeometry args={[0.04, 0.025, 0.2]} /><meshStandardMaterial color="#475569" metalness={0.7} /></mesh>
      </group>
      {[-0.95, 0.95].map((x) => <group key={x} position={[x, 0.45, 0.8]}><mesh castShadow><cylinderGeometry args={[0.24, 0.24, 0.42, 18]} /><meshStandardMaterial color="#111827" roughness={0.6} /></mesh><mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.18, 0.18, 0.025, 18]} /><meshStandardMaterial color="#94a3b8" metalness={0.75} /></mesh></group>)}
      {[-1.2, -0.4, 0.4, 1.2].map((x) => <mesh key={x} position={[x, 0.42, 1.95]}><boxGeometry args={[0.3, 0.06, 0.22]} /><meshStandardMaterial color="#d4a843" metalness={0.86} roughness={0.2} /></mesh>)}
      {[
        ["IN+", -1.2], ["IN−", -0.4], ["OUT−", 0.4], ["OUT+", 1.2],
      ].map(([text, x]) => <Label key={String(text)} text={String(text)} position={[Number(x), 0.43, 1.45]} size={0.11} color="#f8fafc" />)}
      <Label text="LM2596" position={[0, 0.67, 0]} size={0.15} color="#cbd5e1" />
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function BatteryCharger({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const charging = component?.state.isCharging === true;
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        {/* Typical TP4056 carrier PCB: approximately 26.5 x 17.5 mm. */}
        <boxGeometry args={[5.3, 0.42, 3.5]} />
        <meshStandardMaterial color="#2563eb" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.25, 0.28, 0.9]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Micro-USB input socket on the short board edge. */}
      <group position={[0, 0.42, -1.75]}>
        <mesh castShadow><boxGeometry args={[1.6, 0.6, 0.5]} /><meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.22} /></mesh>
        <mesh position={[0, 0, -0.17]}><boxGeometry args={[1.1, 0.36, 0.025]} /><meshStandardMaterial color="#111827" roughness={0.4} /></mesh>
        <mesh position={[0, -0.02, -0.155]}><boxGeometry args={[0.9, 0.07, 0.04]} /><meshStandardMaterial color="#d4a843" metalness={0.8} /></mesh>
      </group>
      {[[-0.45, "#ef4444", charging], [0.45, "#3b82f6", component?.state.isChargeComplete === true]].map(([x, color, active]) => (
        <mesh key={String(x)} position={[Number(x), 0.45, -0.25]}>
          <boxGeometry args={[0.22, 0.09, 0.18]} />
          <meshStandardMaterial color={String(color)} emissive={String(color)} emissiveIntensity={active ? 0.65 : 0.04} />
        </mesh>
      ))}
      {[-1.2, -0.4, 0.4, 1.2].map((x) => <mesh key={x} position={[x, 0.41, 1.75]}><boxGeometry args={[0.55, 0.06, 0.16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.28} /></mesh>)}
      {[["IN+", -1.2], ["IN−", -0.4], ["BAT+", 0.4], ["BAT−", 1.2]].map(([text, x]) => <Label key={String(text)} text={String(text)} position={[Number(x), 0.43, 1.35]} size={0.1} color="#f8fafc" />)}
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function L298NDriver({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const temperature = Number(component?.state.temperatureC) || 25;
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.6, 0.36, 8.6]} />
        <meshStandardMaterial color="#b91c36" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[4.0, 0.38, 2.0]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Six-pin logic header with the two EN jumpers. */}
      {[-1.27, -0.762, -0.254, 0.254, 0.762, 1.27].map((x, index) => (
        <group key={`logic-${x}`} position={[x, 0.39, -1.778]}>
          <mesh><boxGeometry args={[0.24, 0.24, 0.24]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, -0.41, 0]}><boxGeometry args={[0.06, 0.76, 0.06]} /><meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.22} /></mesh>
          {(index === 0 || index === 5) && <mesh position={[0, 0.18, 0]}><boxGeometry args={[0.3, 0.16, 0.3]} /><meshStandardMaterial color="#facc15" roughness={0.5} /></mesh>}
        </group>
      ))}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`mount-${x}:${z}`} position={[x * 3.8, 0.39, z * 3.8]}><cylinderGeometry args={[0.28, 0.28, 0.04, 16]} /><meshStandardMaterial color="#111827" metalness={0.3} roughness={0.65} /></mesh>))}
      {/* Three blue screw terminals: motor A, motor B, and motor supply. */}
      {[
        ...[-3.15, 3.15].map((x) => ({ x, z: -0.7, screws: [-0.508, 0.508], width: 1.55, depth: 1.45 })),
        { x: 0, z: 3.0, screws: [-0.508, 0, 0.508], width: 2.0, depth: 1.45 },
      ].map(({ x, z, screws, width, depth }) => (
        <group key={`${x}:${z}`} position={[x, 0.47, z]}>
          <mesh castShadow><boxGeometry args={[width, 0.62, depth]} /><meshStandardMaterial color="#2563eb" roughness={0.48} /></mesh>
          {screws.map((offset) => <group key={offset} position={[x === 0 ? offset : 0, 0.34, x === 0 ? 0 : offset]}><mesh><cylinderGeometry args={[0.105, 0.105, 0.07, 12]} /><meshStandardMaterial color="#d1d5db" metalness={0.82} roughness={0.22} /></mesh><mesh position={[0, 0.037, 0]}><boxGeometry args={[0.13, 0.012, 0.025]} /><meshStandardMaterial color="#334155" /></mesh></group>)}
        </group>
      ))}
      {/* Black extrusion with parallel vertical cooling fins. */}
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[5.0, 0.1, 4.8]} />
        <meshStandardMaterial color={temperature >= 150 ? "#dc2626" : temperature >= 90 ? "#f97316" : "#111827"} metalness={0.45} roughness={0.38} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-2.15 + i * 0.72, 2.15, -0.1]} castShadow><boxGeometry args={[0.24, 2.7, 4.6]} /><meshStandardMaterial color="#111827" metalness={0.48} roughness={0.36} /></mesh>)}
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcMotorModel({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const angle = Number(component?.state.angleRad) || 0;
  const motorPins = component?.pins ?? [];
  const motorCanEnd = 10.4;
  return (
    <group>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 3.6, 7.0]} />
        <meshStandardMaterial color="#e5b52e" metalness={0.28} roughness={0.48} />
      </mesh>
      {/* Gearbox output boss and 3.2 mm steel shaft. */}
      <mesh position={[0, 1.8, -2.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.18, 1.18, 0.52, 28]} />
        <meshStandardMaterial color="#64748b" metalness={0.72} roughness={0.27} />
      </mesh>
      <group position={[0, 1.8, -2.48]} rotation={[0, 0, angle]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 1.65, 16]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.86]}>
          <cylinderGeometry args={[0.72, 0.72, 0.22, 20]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.24} />
        </mesh>
      </group>
      {/* Ø12 mm brushed steel can behind the 1:48 yellow gearbox. */}
      <mesh position={[0, 1.8, 7.65]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 5.5, 32]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.84} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.8, 4.92]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.17, 0.08, 8, 32]} />
        <meshStandardMaterial color="#6b7280" metalness={0.86} roughness={0.24} />
      </mesh>
      {/* Two 200 mm 28 AWG pigtails end at the registered wire contacts. */}
      {motorPins.map((pin, index) => {
        const startZ = motorCanEnd;
        const endZ = pin.position[2];
        return <group key={pin.id}>
          <mesh position={[pin.position[0], 1.8, (startZ + endZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, endZ - startZ, 8]} />
            <meshStandardMaterial color={index === 0 ? "#dc2626" : "#111827"} roughness={0.68} />
          </mesh>
          <mesh position={[pin.position[0], 1.8, endZ - 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.36, 10]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>
          <mesh position={[pin.position[0], 1.8, endZ - 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.18, 10]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.86} roughness={0.2} />
          </mesh>
          <PinHighlight componentId={id} pin={pin} />
        </group>;
      })}
    </group>
  );
}
