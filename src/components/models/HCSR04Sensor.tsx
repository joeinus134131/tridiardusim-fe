"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { PITCH } from "@/lib/components/physical";

interface HCSR04Props {
  id: string;
}

export function HCSR04Sensor({ id }: HCSR04Props) {
  const component = useSimulatorStore((state) =>
    state.components.find((c) => c.id === id),
  );
  const selectedId = useSimulatorStore((state) => state.selectedComponentId);
  const isSelected = selectedId === id;

  const isPowered = component?.state?.isPowered !== false;
  const distance = typeof component?.state?.distance === "number" ? component.state.distance : 25;

  // Materials
  const materials = useMemo(
    () => ({
      pcbBlue: new THREE.MeshStandardMaterial({
        color: "#1d4ed8", // Classic HC-SR04 Royal Blue PCB
        roughness: 0.32,
        metalness: 0.15,
      }),
      aluminumTransducer: new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.92,
        roughness: 0.18,
      }),
      transducerGrill: new THREE.MeshStandardMaterial({
        color: "#334155",
        roughness: 0.65,
        metalness: 0.45,
      }),
      piezoCenterDot: new THREE.MeshStandardMaterial({
        color: "#64748b",
        metalness: 0.8,
        roughness: 0.3,
      }),
      transducerBezel: new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        metalness: 0.95,
        roughness: 0.15,
      }),
      crystalSilver: new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.95,
        roughness: 0.12,
      }),
      icEpoxy: new THREE.MeshStandardMaterial({
        color: "#18181b",
        roughness: 0.4,
      }),
      icPins: new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        metalness: 0.9,
        roughness: 0.2,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        metalness: 0.95,
        roughness: 0.12,
      }),
      mountingHoleGold: new THREE.MeshStandardMaterial({
        color: "#d4af37",
        metalness: 0.85,
        roughness: 0.2,
      }),
      ultrasoundBeam: new THREE.MeshPhysicalMaterial({
        color: "#38bdf8",
        transmission: 0.85,
        opacity: 0.22,
        transparent: true,
        roughness: 0.1,
        metalness: 0.05,
        depthWrite: false,
      }),
      textWhite: new THREE.MeshBasicMaterial({
        color: "#ffffff",
      }),
    }),
    [],
  );

  if (!component) return null;

  // Scale target distance for 3D ultrasound visualization
  const beamLength = Math.max(1.5, Math.min(25, distance * 0.1));

  return (
    <group>
      {/* Interactive Pin Highlights (Available for wiring, positioned at local pin coordinates) */}
      {component.pins.map((pin) => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}

      {/* ─── 1. MAIN BLUE PCB BOARD (45 × 20 mm -> 9.0 × 4.0 units) ─── */}
      {/* Bottom edge of PCB rests right above header at Y = 0.2, center at Y = 2.0 */}
      <group position={[0, 1.8, 0]}>
        <mesh material={materials.pcbBlue}>
          <boxGeometry args={[9.0, 3.6, 0.24]} />
        </mesh>

        {/* 4 Corner Brass/Gold Plated Mounting Holes */}
        {[
          [-4.1, 1.45, 0],
          [4.1, 1.45, 0],
          [-4.1, -1.45, 0],
          [4.1, -1.45, 0],
        ].map(([x, y, z], idx) => (
          <mesh key={idx} material={materials.mountingHoleGold} position={[x, y, z]}>
            <cylinderGeometry args={[0.24, 0.24, 0.26, 16]} />
          </mesh>
        ))}

        {/* Bold White Silkscreen "HC-SR04" on Top Center */}
        <mesh material={materials.textWhite} position={[0, 1.35, 0.13]}>
          <planeGeometry args={[2.4, 0.38]} />
        </mesh>

        {/* ─── 2. DUAL ALUMINUM ULTRASONIC TRANSDUCERS (Transmitter 'T' & Receiver 'R') ─── */}
        {/* Transmitter 'T' (Left Cylindrical Can, Diameter 16mm -> 3.2 units) */}
        <group position={[-2.3, 0.1, 0.75]}>
          {/* Turned Aluminum Can Body */}
          <mesh material={materials.aluminumTransducer} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 1.3, 32]} />
          </mesh>
          {/* Front Fine Acoustic Mesh Screen */}
          <mesh material={materials.transducerGrill} position={[0, 0, 0.66]}>
            <circleGeometry args={[1.35, 32]} />
          </mesh>
          {/* Central Piezo Driver Disc */}
          <mesh material={materials.piezoCenterDot} position={[0, 0, 0.67]}>
            <circleGeometry args={[0.3, 16]} />
          </mesh>
          {/* Metallic Outer Lip Bezel */}
          <mesh material={materials.transducerBezel} position={[0, 0, 0.655]}>
            <ringGeometry args={[1.34, 1.5, 32]} />
          </mesh>
          {/* "T" Mark Silkscreen */}
          <mesh material={materials.textWhite} position={[0, 0.65, 0.67]}>
            <planeGeometry args={[0.35, 0.35]} />
          </mesh>
        </group>

        {/* Receiver 'R' (Right Cylindrical Can) */}
        <group position={[2.3, 0.1, 0.75]}>
          {/* Turned Aluminum Can Body */}
          <mesh material={materials.aluminumTransducer} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 1.3, 32]} />
          </mesh>
          {/* Front Fine Acoustic Mesh Screen */}
          <mesh material={materials.transducerGrill} position={[0, 0, 0.66]}>
            <circleGeometry args={[1.35, 32]} />
          </mesh>
          {/* Central Piezo Driver Disc */}
          <mesh material={materials.piezoCenterDot} position={[0, 0, 0.67]}>
            <circleGeometry args={[0.3, 16]} />
          </mesh>
          {/* Metallic Outer Lip Bezel */}
          <mesh material={materials.transducerBezel} position={[0, 0, 0.655]}>
            <ringGeometry args={[1.34, 1.5, 32]} />
          </mesh>
          {/* "R" Mark Silkscreen */}
          <mesh material={materials.textWhite} position={[0, 0.65, 0.67]}>
            <planeGeometry args={[0.35, 0.35]} />
          </mesh>
        </group>

        {/* ─── 3. ONBOARD ELECTRONICS (Between Transducers) ─── */}
        {/* 4.000 MHz Quartz Crystal Resonator Can (HC-49 Package) */}
        <group position={[0, 0.1, 0.4]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={materials.crystalSilver}>
            <cylinderGeometry args={[0.28, 0.28, 1.3, 16]} />
          </mesh>
          <mesh material={materials.icPins} position={[-0.55, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
          </mesh>
          <mesh material={materials.icPins} position={[0.55, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
          </mesh>
        </group>

        {/* LM324 Quad Op-Amp SOIC-14 IC on PCB surface */}
        <group position={[0, -0.85, 0.2]}>
          <mesh material={materials.icEpoxy}>
            <boxGeometry args={[1.5, 0.65, 0.15]} />
          </mesh>
          {/* Silver SOIC lead pins along both sides */}
          {[-0.5, -0.25, 0, 0.25, 0.5].map((xOffset, k) => (
            <group key={k} position={[xOffset, 0, 0]}>
              <mesh material={materials.icPins} position={[0, 0.38, -0.04]}>
                <boxGeometry args={[0.08, 0.12, 0.03]} />
              </mesh>
              <mesh material={materials.icPins} position={[0, -0.38, -0.04]}>
                <boxGeometry args={[0.08, 0.12, 0.03]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Pin Labels Silkscreen (Vcc, Trig, Echo, Gnd) along bottom PCB edge */}
        <mesh material={materials.textWhite} position={[0, -1.5, 0.13]}>
          <planeGeometry args={[2.4, 0.2]} />
        </mesh>

        {/* ─── 4. ULTRASONIC SOUND BEAM EMISSION (Active when powered) ─── */}
        {isPowered && (
          <group position={[0, 0.1, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={materials.ultrasoundBeam} position={[0, beamLength / 2, 0]}>
              <cylinderGeometry args={[beamLength * 0.26, 0.8, beamLength, 24, 1, true]} />
            </mesh>
            {/* Target reflection disc at beam terminus */}
            <mesh position={[0, beamLength, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[beamLength * 0.26, 24]} />
              <meshBasicMaterial color="#38bdf8" wireframe opacity={0.35} transparent />
            </mesh>
          </group>
        )}
      </group>

      {/* ─── 5. 4-PIN MALE HEADER (VCC, TRIG, ECHO, GND) ─── */}
      {/* Centered at Y = 0.0, Z = 0.0, matching physical.ts pins exactly */}
      <group position={[0, 0.0, 0]}>
        {/* Black Header Base Block */}
        <mesh material={materials.icEpoxy} position={[0, 0.1, 0]}>
          <boxGeometry args={[2.4, 0.18, 0.5]} />
        </mesh>

        {/* 4 Gold Header Pins at [-1.5, -0.5, 0.5, 1.5] * PITCH */}
        {[-1.5, -0.5, 0.5, 1.5].map((mult, idx) => (
          <group key={idx} position={[mult * PITCH, 0, 0]}>
            {/* Upper Pin into PCB */}
            <mesh material={materials.goldPin} position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
            </mesh>
            {/* Downward Male Pin (Plugs into breadboard or DuPont female boot) */}
            <mesh material={materials.goldPin} position={[0, -0.35, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.65, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
