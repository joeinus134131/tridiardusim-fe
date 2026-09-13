"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";

interface ResistorProps {
  id: string;
}

export function Resistor({ id }: ResistorProps) {
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d4a574", // Tan/beige carbon film body
        roughness: 0.8,
        metalness: 0.05,
      }),
    [],
  );

  const legMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#b0b8c4",
        roughness: 0.3,
        metalness: 0.85,
      }),
    [],
  );

  // Color bands for a 220Ω resistor (red-red-brown-gold)
  const bands = useMemo(
    () => [
      { color: "#ef4444", pos: -0.35 }, // Red
      { color: "#ef4444", pos: -0.15 }, // Red
      { color: "#8b4513", pos: 0.05 }, // Brown
      { color: "#daa520", pos: 0.35 }, // Gold (tolerance)
    ],
    [],
  );

  // Resistor is about 6mm long body, 2mm diameter
  const bodyLen = 1.26;
  const bodyR = 0.24;
  const legLen = 1.17;

  return (
    <group>
      {ComponentRegistry.get("resistor_220")!.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}
      {/* Body */}
      <mesh
        material={bodyMaterial}
        position={[0, 0.24, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[bodyR, bodyR, bodyLen, 12]} />
      </mesh>

      {/* Color bands */}
      {bands.map((band, i) => (
        <mesh
          key={i}
          position={[band.pos, 0.24, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[bodyR + 0.01, bodyR + 0.01, 0.08, 12]} />
          <meshBasicMaterial color={band.color} />
        </mesh>
      ))}

      {/* Left lead */}
      <mesh
        material={legMaterial}
        position={[-bodyLen / 2 - legLen / 2, 0.24, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.03, 0.03, legLen, 6]} />
      </mesh>

      {/* Right lead */}
      <mesh
        material={legMaterial}
        position={[bodyLen / 2 + legLen / 2, 0.24, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.03, 0.03, legLen, 6]} />
      </mesh>
    </group>
  );
}
