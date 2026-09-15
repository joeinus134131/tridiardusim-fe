'use client';
import { esp32Pins } from '@/lib/components/esp32';
import { PinHighlight } from '../canvas/PinHighlight';
import { Label } from './Label';
import * as THREE from 'three';
import { useMemo } from 'react';

export function ESP32Wroom({ id }: { id: string }) {
  // Antena PCB Meander Trace Pattern (Inverted-F Antenna khas ESP32-WROOM)
  const meanderTraces = useMemo(() => {
    return [
      { x: -1.3, z: -4.85, w: 2.6, d: 0.08 }, // Horizontal feed line
      { x: -1.2, z: -4.55, w: 0.08, d: 0.55 },
      { x: -0.7, z: -4.55, w: 0.08, d: 0.55 },
      { x: -0.2, z: -4.55, w: 0.08, d: 0.55 },
      { x: 0.3, z: -4.55, w: 0.08, d: 0.55 },
      { x: 0.8, z: -4.55, w: 0.08, d: 0.55 },
      { x: 1.3, z: -4.55, w: 0.08, d: 0.55 },
      { x: -0.95, z: -4.28, w: 0.55, d: 0.08 },
      { x: 0.05, z: -4.28, w: 0.55, d: 0.08 },
      { x: 1.05, z: -4.28, w: 0.55, d: 0.08 },
    ];
  }, []);

  return (
    <group>
      {/* 1. Main PCB DevKitC V4 Board (Matte Dark Navy/Black) */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.58, 0.32, 10.88]} />
        <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.15} />
      </mesh>

      {/* 4 Corner Mounting Holes */}
      {[-2.4, 2.4].flatMap((x) =>
        [-5.0, 5.0].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.17, z]}>
            <cylinderGeometry args={[0.22, 0.22, 0.35, 16]} />
            <meshStandardMaterial color="#020617" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Gold Rim Ground Edge around PCB */}
      <mesh position={[0, 0.165, 0]}>
        <boxGeometry args={[5.48, 0.33, 10.78]} />
        <meshStandardMaterial color="#ca8a04" wireframe transparent opacity={0.3} />
      </mesh>

      {/* 2. ESP-WROOM-32 Sub-Module Substrate (Upper Module Board) */}
      <mesh position={[0, 0.44, -2.5]} castShadow>
        <boxGeometry args={[3.6, 0.24, 5.2]} />
        <meshStandardMaterial color="#14532d" roughness={0.6} />
      </mesh>

      {/* 3. PCB Antenna Keep-out & Inverted-F Copper/Gold Trace (Top of module) */}
      <mesh position={[0, 0.57, -4.5]}>
        <boxGeometry args={[3.4, 0.02, 1.0]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      {meanderTraces.map((t, idx) => (
        <mesh key={idx} position={[t.x, 0.585, t.z]}>
          <boxGeometry args={[t.w, 0.025, t.d]} />
          <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* 4. Metallic RF Shield Can (Tinplate/Nickel-Silver Shield Box) */}
      <mesh position={[0, 0.8, -1.8]} castShadow>
        <boxGeometry args={[3.45, 0.6, 3.5]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.92}
          roughness={0.22}
        />
      </mesh>

      {/* Laser Etched Silkscreen on Shield */}
      <Label text="ESP-WROOM-32" position={[0, 1.12, -2.2]} size={0.25} color="#475569" />
      <Label text="FCC ID: 2AC7Z-ESPWROOM32" position={[0, 1.12, -1.7]} size={0.14} color="#64748b" />
      <Label text="CE  RoHS" position={[0, 1.12, -1.2]} size={0.15} color="#64748b" />

      {/* 5. CP2102 USB-to-UART IC Chip */}
      <mesh position={[0, 0.46, 1.5]} castShadow>
        <boxGeometry args={[1.1, 0.22, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <Label text="SILABS" position={[0, 0.58, 1.5]} size={0.11} color="#94a3b8" />

      {/* 6. AMS1117 3.3V Voltage Regulator */}
      <mesh position={[-1.2, 0.44, 2.7]} castShadow>
        <boxGeometry args={[1.3, 0.22, 0.7]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* SOT-223 Heat Tab */}
      <mesh position={[-1.2, 0.44, 2.25]}>
        <boxGeometry args={[0.7, 0.08, 0.25]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} />
      </mesh>

      {/* 7. Micro-USB Port Metal Housing */}
      <mesh position={[0, 0.62, 5.0]} castShadow>
        <boxGeometry args={[1.6, 0.58, 1.5]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.25} />
      </mesh>
      {/* USB Port Receptacle Void */}
      <mesh position={[0, 0.62, 5.76]}>
        <boxGeometry args={[1.2, 0.32, 0.04]} />
        <meshStandardMaterial color="#090d16" roughness={0.9} />
      </mesh>

      {/* 8. Mini Tactile Buttons (EN & BOOT) */}
      {/* Left: EN (Reset), Right: BOOT (GPIO0) */}
      {[-1.8, 1.8].map((x) => (
        <group key={x}>
          {/* Metal housing */}
          <mesh position={[x, 0.48, 4.2]}>
            <boxGeometry args={[0.65, 0.28, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Push button actuator */}
          <mesh position={[x, 0.68, 4.2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.16, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          {/* Silkscreen text */}
          <Label
            text={x < 0 ? 'EN' : 'BOOT'}
            position={[x, 0.36, 3.4]}
            size={0.18}
            color="#cbd5e1"
          />
        </group>
      ))}

      {/* 9. Status LEDs */}
      {/* Power LED (Red) */}
      <mesh position={[-0.8, 0.42, 4.4]}>
        <boxGeometry args={[0.22, 0.14, 0.35]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
      {/* IO2 LED (Blue) */}
      <mesh position={[0.8, 0.42, 4.4]}>
        <boxGeometry args={[0.22, 0.14, 0.35]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} />
      </mesh>

      {/* 10. Precision 2x19 Dual Pin Header */}
      {esp32Pins.map((p) => (
        <group key={p.id}>
          {/* Black plastic header socket base */}
          <mesh position={[p.position[0], 0.5, p.position[2]]}>
            <boxGeometry args={[0.48, 0.4, 0.48]} />
            <meshStandardMaterial color="#17191b" roughness={0.8} />
          </mesh>
          {/* Gold plated male header pin */}
          <mesh position={[p.position[0], -0.15, p.position[2]]}>
            <boxGeometry args={[0.11, 0.9, 0.11]} />
            <meshStandardMaterial color="#eab308" metalness={0.88} roughness={0.2} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
