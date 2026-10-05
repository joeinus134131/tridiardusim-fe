"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

export function A4988Driver({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.35, 3.3]} />
        <meshStandardMaterial color="#166534" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.45, 0.42, 1.35]} />
        <meshStandardMaterial color="#1f2937" metalness={0.38} roughness={0.48} />
      </mesh>
      <mesh position={[0.95, 0.49, -0.65]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.22, 20]} />
        <meshStandardMaterial color="#d97706" metalness={0.72} roughness={0.28} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcSupply({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  return (
    <group>
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.7, 2.3, 3.2]} />
        <meshStandardMaterial color="#334155" metalness={0.48} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.25, 1.63]}>
        <planeGeometry args={[2.3, 0.75]} />
        <meshStandardMaterial color="#0f172a" emissive="#164e63" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 1.25, 1.67]}>
        <planeGeometry args={[1.9, 0.45]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>
      <mesh position={[-1.05, 0.25, 1.35]}>
        <cylinderGeometry args={[0.36, 0.36, 0.45, 20]} />
        <meshStandardMaterial color="#ef4444" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[1.05, 0.25, 1.35]}>
        <cylinderGeometry args={[0.36, 0.36, 0.45, 20]} />
        <meshStandardMaterial color="#111827" metalness={0.52} roughness={0.42} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function BatteryPack({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const profile = String(component?.state.profile || "liion_18650");
  const color = profile === "alkaline_9v" ? "#2563eb" : profile === "lipo_2s" ? "#dc2626" : "#334155";
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 1.25, 2.3]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.27, -0.35]}>
        <boxGeometry args={[2.2, 0.08, 1.0]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[-0.62, 1.4, 0.92]}>
        <cylinderGeometry args={[0.18, 0.18, 0.26, 16]} />
        <meshStandardMaterial color="#dc2626" metalness={0.72} />
      </mesh>
      <mesh position={[0.62, 1.4, 0.92]}>
        <cylinderGeometry args={[0.18, 0.18, 0.26, 16]} />
        <meshStandardMaterial color="#111827" metalness={0.72} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcDcConverter({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const regulating = component?.state.isRegulating === true;
  const limited = component?.state.isCurrentLimited === true;
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.4, 2.5]} />
        <meshStandardMaterial color={limited ? "#b45309" : regulating ? "#047857" : "#334155"} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[1.1, 0.3, 0.9]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[-0.75, 0.48, -0.35]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.36, 18]} />
        <meshStandardMaterial color="#374151" metalness={0.55} roughness={0.4} />
      </mesh>
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
        <boxGeometry args={[3.6, 0.42, 2.8]} />
        <meshStandardMaterial color={charging ? "#047857" : "#334155"} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.25, 0.28, 0.9]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
      </mesh>
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
        <boxGeometry args={[4.2, 0.36, 3.8]} />
        <meshStandardMaterial color="#166534" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.6, 0.48, 1.55]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[2.1, 0.12, 1.9]} />
        <meshStandardMaterial color={temperature >= 150 ? "#dc2626" : temperature >= 90 ? "#f97316" : "#64748b"} metalness={0.8} roughness={0.24} />
      </mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}

export function DcMotorModel({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const angle = Number(component?.state.angleRad) || 0;
  return (
    <group>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 2.5, 4.1]} />
        <meshStandardMaterial color="#e5b52e" metalness={0.28} roughness={0.48} />
      </mesh>
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
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}
