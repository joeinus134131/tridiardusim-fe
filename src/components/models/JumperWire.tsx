'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';

interface JumperWireProps {
  id: string;
}

// Color options for jumper wires
const WIRE_COLORS: Record<string, string> = {
  red:    '#ef4444',
  black:  '#1a1a2e',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  white:  '#e2e8f0',
  purple: '#8b5cf6',
};

export function JumperWire({ id }: JumperWireProps) {
  const component = useSimulatorStore(state => state.components.find(c => c.id === id));
  const wireColor = component?.state?.color || 'red';
  const color = WIRE_COLORS[wireColor] || wireColor;

  const wireMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.05,
  }), [color]);

  const tipMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    roughness: 0.25,
    metalness: 0.9,
  }), []);

  // A jumper wire is basically a short insulated cable with two metal tips
  // Default length ~4 units, lying flat
  const length = component?.state?.length || 4;
  
  // Build a gentle curve for the wire body so it doesn't look like a rigid stick
  const curve = useMemo(() => {
    const start = new THREE.Vector3(-length / 2, 0.1, 0);
    const mid = new THREE.Vector3(0, 0.4, 0); // Slight arch
    const end = new THREE.Vector3(length / 2, 0.1, 0);
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [length]);

  return (
    <group>
      {/* Wire body (tube along curve) */}
      <mesh material={wireMaterial} castShadow>
        <tubeGeometry args={[curve, 16, 0.06, 8, false]} />
      </mesh>

      {/* Left metal tip */}
      <mesh material={tipMaterial} position={[-length / 2, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.03, 0.5, 6]} />
      </mesh>

      {/* Right metal tip */}
      <mesh material={tipMaterial} position={[length / 2, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.03, 0.5, 6]} />
      </mesh>
    </group>
  );
}
