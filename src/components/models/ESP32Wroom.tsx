'use client';
import { esp32Pins } from '@/lib/components/esp32';
import { PinHighlight } from '../canvas/PinHighlight';
import { Label } from './Label';
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

      {/* Thin exposed copper edge, as on a fabricated DevKit PCB */}
      <mesh position={[0, 0.165, 0]}>
        <boxGeometry args={[5.5, 0.335, 10.8]} />
        <meshStandardMaterial color="#b7791f" wireframe transparent opacity={0.18} />
      </mesh>

      {/* ESP-WROOM-32 module substrate. The production module is black, not green. */}
      <mesh position={[0, 0.42, -2.55]} castShadow>
        <boxGeometry args={[3.55, 0.2, 5.0]} />
        <meshStandardMaterial color="#111827" roughness={0.72} />
      </mesh>

      {/* 3. PCB Antenna Keep-out & Inverted-F Copper/Gold Trace (Top of module) */}
      <mesh position={[0, 0.57, -4.5]}>
        <boxGeometry args={[3.4, 0.02, 1.0]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
      {meanderTraces.map((t, idx) => (
        <mesh key={idx} position={[t.x, 0.585, t.z]}>
          <boxGeometry args={[t.w, 0.025, t.d]} />
          <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* 4. Metallic RF Shield Can (Tinplate/Nickel-Silver Shield Box) */}
      <mesh position={[0, 0.76, -2.15]} castShadow>
        <boxGeometry args={[3.35, 0.56, 3.35]} />
        <meshStandardMaterial
          color="#c9c9c3"
          metalness={0.92}
          roughness={0.22}
        />
      </mesh>

      <Label text="ESP-WROOM-32" position={[0, 1.05, -2.15]} size={0.2} color="#686868" />

      {/* 5. CP2102 USB-to-UART IC Chip */}
      <mesh position={[0, 0.43, 1.25]} castShadow>
        <boxGeometry args={[0.95, 0.2, 0.95]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* USB-UART reference crystal and small passives around the bridge. */}
      <mesh position={[0.78, 0.44, 2.15]} castShadow>
        <boxGeometry args={[0.62, 0.18, 0.38]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.28} />
      </mesh>
      <Label text="12.0" position={[0.78, 0.54, 2.15]} size={0.1} color="#334155" />
      {[
        [-1.2, 2.08, "#111827"], [-1.2, 3.48, "#111827"],
        [0.82, 2.85, "#334155"], [1.58, 2.45, "#111827"],
        [1.48, 3.12, "#cbd5e1"], [-0.12, 3.48, "#cbd5e1"],
      ].map(([x, z, color], index) => (
        <mesh key={`smd:${index}`} position={[Number(x), 0.39, Number(z)]} castShadow>
          <boxGeometry args={[0.38, 0.13, 0.28]} />
          <meshStandardMaterial color={String(color)} metalness={color === "#cbd5e1" ? 0.45 : 0.12} roughness={0.52} />
        </mesh>
      ))}

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
      {[-1.75, 1.75].map((x) => (
        <group key={x}>
          {/* Metal housing */}
          <mesh position={[x, 0.48, 4.15]}>
            <boxGeometry args={[0.62, 0.28, 0.72]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Push button actuator */}
          <mesh position={[x, 0.68, 4.15]}>
            <cylinderGeometry args={[0.18, 0.18, 0.16, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
          {/* Silkscreen text */}
          <Label
            text={x < 0 ? 'EN' : 'BOOT'}
            position={[x, 0.36, 3.55]}
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

      {/* 10. Dual through-hole headers: socket and connection are above the PCB;
          only the short solder tail remains below it. */}
      {esp32Pins.map((p) => (
        <group key={p.id}>
          <mesh position={[p.position[0], 0.29, p.position[2]]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.055, 8, 16]} />
            <meshStandardMaterial color="#d6a83b" metalness={0.8} roughness={0.28} />
          </mesh>
          {/* Black female header body on the component side */}
          <mesh position={[p.position[0], 0.61, p.position[2]]}>
            <boxGeometry args={[0.45, 0.48, 0.45]} />
            <meshStandardMaterial color="#17191b" roughness={0.8} />
          </mesh>
          {/* Contact is visible from above; solder tail ends below the board. */}
          <mesh position={[p.position[0], 0.57, p.position[2]]}>
            <boxGeometry args={[0.1, 0.86, 0.1]} />
            <meshStandardMaterial color="#eab308" metalness={0.88} roughness={0.2} />
          </mesh>
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
