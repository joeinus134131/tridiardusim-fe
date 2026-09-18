"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { PITCH } from "@/lib/components/physical";

interface DHT11Props {
  id: string;
}

export function DHT11Sensor({ id }: DHT11Props) {
  const component = useSimulatorStore((state) =>
    state.components.find((c) => c.id === id),
  );
  const selectedId = useSimulatorStore((state) => state.selectedComponentId);
  const isSelected = selectedId === id;

  const isPowered = component?.state?.isPowered !== false;

  // Realistic materials
  const materials = useMemo(
    () => ({
      casingBlue: new THREE.MeshStandardMaterial({
        color: "#0284c7", // Signature DHT11 sky-blue polymer
        roughness: 0.28,
        metalness: 0.05,
      }),
      casingGrillDark: new THREE.MeshStandardMaterial({
        color: "#0369a1",
        roughness: 0.55,
        metalness: 0.08,
      }),
      pcbSubstrate: new THREE.MeshStandardMaterial({
        color: "#093b2a", // Dark green matte solder mask
        roughness: 0.4,
        metalness: 0.15,
      }),
      pcbGoldPads: new THREE.MeshStandardMaterial({
        color: "#d4af37", // ENIG gold plating
        metalness: 0.85,
        roughness: 0.2,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        metalness: 0.95,
        roughness: 0.12,
      }),
      blackPlastic: new THREE.MeshStandardMaterial({
        color: "#18181b",
        roughness: 0.45,
      }),
      ceramicWafer: new THREE.MeshStandardMaterial({
        color: "#334155",
        roughness: 0.8,
      }),
      goldTraces: new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        metalness: 0.9,
        roughness: 0.2,
      }),
      ntcBead: new THREE.MeshStandardMaterial({
        color: "#09090b",
        roughness: 0.2,
      }),
      solderSilver: new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        metalness: 0.9,
        roughness: 0.25,
      }),
      powerLedOff: new THREE.MeshStandardMaterial({
        color: "#450a0a",
        roughness: 0.3,
      }),
      powerLedOn: new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#ef4444",
        emissiveIntensity: 1.4,
        roughness: 0.1,
      }),
      textWhite: new THREE.MeshBasicMaterial({
        color: "#ffffff",
      }),
    }),
    [],
  );

  if (!component) return null;

  return (
    <group>
      {/* Interactive Pin Highlights (Available for wiring, positioned at local pin terminals) */}
      {component.pins.map((pin) => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}

      {/* ─── 1. BREAKOUT PCB BASE (Dimensions: ~3.0 × 1.4 × 0.2 units) ─── */}
      <group position={[0, 0.2, 0]}>
        {/* PCB Board Substrate */}
        <mesh material={materials.pcbSubstrate} position={[0, 0, 0]}>
          <boxGeometry args={[3.0, 0.18, 1.5]} />
        </mesh>

        {/* 2 Corner Brass Mounting Holes */}
        {[-1.2, 1.2].map((x, idx) => (
          <mesh key={idx} material={materials.pcbGoldPads} position={[x, 0, -0.45]}>
            <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
          </mesh>
        ))}

        {/* SMD Pull-Up Resistor 10k (0805 package with silver endcaps) */}
        <group position={[-0.85, 0.12, 0.4]}>
          <mesh material={materials.blackPlastic}>
            <boxGeometry args={[0.3, 0.08, 0.16]} />
          </mesh>
          <mesh material={materials.solderSilver} position={[-0.14, 0, 0]}>
            <boxGeometry args={[0.04, 0.09, 0.17]} />
          </mesh>
          <mesh material={materials.solderSilver} position={[0.14, 0, 0]}>
            <boxGeometry args={[0.04, 0.09, 0.17]} />
          </mesh>
        </group>

        {/* SMD Power Indicator LED (Glows vibrant red when powered) */}
        <group position={[0.85, 0.12, 0.4]}>
          <mesh material={isPowered ? materials.powerLedOn : materials.powerLedOff}>
            <boxGeometry args={[0.26, 0.12, 0.2]} />
          </mesh>
          {isPowered && (
            <pointLight position={[0, 0.2, 0]} color="#ef4444" intensity={0.4} distance={2.5} />
          )}
        </group>

        {/* Pin Labels Silkscreen (VCC, DAT, GND) */}
        <mesh material={materials.textWhite} position={[0, 0.1, 0.6]}>
          <planeGeometry args={[1.8, 0.15]} />
        </mesh>
      </group>

      {/* ─── 2. ICONIC SKY-BLUE SENSOR HOUSING (15.5 × 12.0 × 5.5 mm) ─── */}
      <group position={[0, 1.45, 0]}>
        {/* Main Blue Polymer Body */}
        <mesh material={materials.casingBlue} position={[0, 0, 0]}>
          <boxGeometry args={[2.4, 2.3, 1.1]} />
        </mesh>

        {/* Top Chamfer Bevel Cap */}
        <mesh material={materials.casingBlue} position={[0, 1.15, 0]}>
          <boxGeometry args={[2.2, 0.08, 0.95]} />
        </mesh>

        {/* Recessed Louver Window on Front Face */}
        <mesh material={materials.casingGrillDark} position={[0, 0.25, 0.56]}>
          <planeGeometry args={[1.8, 1.3]} />
        </mesh>

        {/* 4 Horizontal Air Ventilation Louver Slits */}
        {[-0.42, -0.14, 0.14, 0.42].map((yOffset, i) => (
          <group key={i} position={[0, 0.25 + yOffset, 0.57]}>
            {/* Dark air void inside slit */}
            <mesh material={materials.blackPlastic}>
              <boxGeometry args={[1.65, 0.12, 0.04]} />
            </mesh>
            {/* Louver slat fin */}
            <mesh material={materials.casingBlue} position={[0, 0.04, 0.02]}>
              <boxGeometry args={[1.65, 0.05, 0.03]} />
            </mesh>
          </group>
        ))}

        {/* Internal Sensors visible through the louvers */}
        {/* Humidity sensing resistive polymer grid with interdigitated traces */}
        <group position={[-0.35, 0.25, 0.48]}>
          <mesh material={materials.ceramicWafer}>
            <boxGeometry args={[0.7, 0.9, 0.08]} />
          </mesh>
          {[-0.2, 0, 0.2].map((y, k) => (
            <mesh key={k} material={materials.goldTraces} position={[0, y, 0.045]}>
              <boxGeometry args={[0.55, 0.04, 0.01]} />
            </mesh>
          ))}
        </group>

        {/* NTC Thermistor black epoxy bead with thin leads */}
        <group position={[0.42, 0.15, 0.48]}>
          <mesh material={materials.ntcBead}>
            <sphereGeometry args={[0.16, 12, 10]} />
          </mesh>
          <mesh material={materials.solderSilver} position={[-0.05, -0.2, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
          </mesh>
          <mesh material={materials.solderSilver} position={[0.05, -0.2, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
          </mesh>
        </group>

        {/* Crisp "DHT11" Silkscreen on Bottom of Front Face */}
        <group position={[0, -0.65, 0.56]}>
          <mesh material={materials.casingBlue}>
            <planeGeometry args={[1.9, 0.45]} />
          </mesh>
          {/* Stylized White Lettering */}
          <mesh material={materials.textWhite} position={[-0.48, 0, 0.002]}>
            <planeGeometry args={[0.26, 0.26]} />
          </mesh>
          <mesh material={materials.textWhite} position={[-0.16, 0, 0.002]}>
            <planeGeometry args={[0.26, 0.26]} />
          </mesh>
          <mesh material={materials.textWhite} position={[0.16, 0, 0.002]}>
            <planeGeometry args={[0.26, 0.26]} />
          </mesh>
          <mesh material={materials.textWhite} position={[0.48, 0, 0.002]}>
            <planeGeometry args={[0.18, 0.26]} />
          </mesh>
        </group>
      </group>

      {/* ─── 3. 3-PIN CONNECTOR TERMINAL HEADER (VCC, DATA, GND) ─── */}
      {/* Terminal pins are centered at Y = 0.0, Z = 0.0, matching physical.ts pins exactly */}
      <group position={[0, 0.0, 0]}>
        {/* Black Header Base Block / Spacer */}
        <mesh material={materials.blackPlastic} position={[0, 0.1, 0]}>
          <boxGeometry args={[1.8, 0.18, 0.5]} />
        </mesh>

        {/* 3 Gold Terminal Pins at X = [-PITCH, 0, PITCH] */}
        {[-PITCH, 0, PITCH].map((xPos, idx) => (
          <group key={idx} position={[xPos, 0, 0]}>
            {/* Gold Pin Body (extends through header) */}
            <mesh material={materials.goldPin} position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
            </mesh>
            {/* Downward Male Pin Contact (plugs into breadboard or DuPont female boot) */}
            <mesh material={materials.goldPin} position={[0, -0.35, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.65, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
