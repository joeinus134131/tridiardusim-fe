"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";

export function LED({ id }: { id: string }) {
  const component = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const brightness = Number(component?.state.brightness || 0);
  const colorHex = String(component?.state.color || "#ef4444");

  const colorMap: Record<string, { off: string; lit: string; emissive: string }> = {
    "#ef4444": { off: "#7f1d1d", lit: "#ef4444", emissive: "#ff2020" },
    "#22c55e": { off: "#14532d", lit: "#22c55e", emissive: "#4ade80" },
    "#3b82f6": { off: "#1e3a8a", lit: "#3b82f6", emissive: "#60a5fa" },
    "#eab308": { off: "#713f12", lit: "#eab308", emissive: "#fef08a" },
    "#f97316": { off: "#7c2d12", lit: "#f97316", emissive: "#fb923c" },
    "#f8fafc": { off: "#475569", lit: "#f8fafc", emissive: "#ffffff" },
    "#a855f7": { off: "#581c87", lit: "#a855f7", emissive: "#d8b4fe" },
    "#06b6d4": { off: "#164e63", lit: "#06b6d4", emissive: "#67e8f9" },
  };

  const scheme = colorMap[colorHex.toLowerCase()] || {
    off: colorHex,
    lit: colorHex,
    emissive: colorHex,
  };

  const flange = useMemo(() => {
    const shape = new THREE.Shape();
    const angle = Math.acos(0.5 / 0.59);
    shape.absarc(0, 0, 0.59, angle, Math.PI * 2 - angle, false);
    shape.closePath();
    return shape;
  }, []);

  const material = (
    <meshStandardMaterial
      color={brightness > 0 ? scheme.lit : scheme.off}
      emissive={brightness > 0 ? scheme.emissive : "#000000"}
      emissiveIntensity={Math.min(3, (brightness / 255) * 3.5)}
      roughness={0.25}
      transparent
      opacity={0.92}
    />
  );

  return (
    <group>
      {/* LED Lens Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.8, 32]} />
        {material}
      </mesh>
      {/* Dome Top */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {material}
      </mesh>
      {/* Flange Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <extrudeGeometry args={[flange, { depth: 0.12, bevelEnabled: false, curveSegments: 32 }]} />
        {material}
      </mesh>
      {/* Anode Lead (-) Pin */}
      <mesh position={[-0.254, -0.3, 0]}>
        <boxGeometry args={[0.06, 0.6, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Cathode Lead (+) Pin (slightly shorter physically) */}
      <mesh position={[0.254, -0.27, 0]}>
        <boxGeometry args={[0.06, 0.54, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
      </mesh>
      {brightness > 0 && (
        <pointLight
          position={[0, 0.9, 0]}
          color={scheme.emissive}
          intensity={Math.min(1.5, (brightness / 255) * 1.8)}
          distance={4}
          decay={2}
        />
      )}
      {ComponentRegistry.get("led_red")!.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}
    </group>
  );
}
