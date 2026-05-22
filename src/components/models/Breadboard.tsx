'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinDefinition } from '@/lib/components/componentTypes';
import { PinHighlight } from '@/components/canvas/PinHighlight';

interface BreadboardProps {
  id?: string;
}

export function Breadboard({ id }: BreadboardProps) {
  const config = ComponentRegistry.get('breadboard');
  // Standard half-size breadboard: ~82mm x 54mm
  const W = 16;
  const D = 10;
  const H = 0.8;

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f5f5f0',
    roughness: 0.92,
    metalness: 0.05,
  }), []);

  const channelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e8e8e0',
    roughness: 0.95,
  }), []);

  const holeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#2a2a3a',
  }), []);

  const lineRed = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ef4444' }), []);
  const lineBlue = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3b82f6' }), []);

  // Generate hole positions using InstancedMesh for performance
  const holePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const cols = 30;
    const pitch = 0.5; // 2.54mm scaled
    const startX = -cols * pitch / 2 + pitch / 2;
    
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      // Top half (rows a-e)
      for (let row = 0; row < 5; row++) {
        positions.push([x, H / 2 + 0.01, -1.5 - row * pitch]);
      }
      // Bottom half (rows f-j)
      for (let row = 0; row < 5; row++) {
        positions.push([x, H / 2 + 0.01, 1.5 + row * pitch]);
      }
    }
    // Power rail holes (top and bottom)
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      positions.push([x, H / 2 + 0.01, -D / 2 + 0.6]); // top + rail
      positions.push([x, H / 2 + 0.01, -D / 2 + 1.1]); // top - rail
      positions.push([x, H / 2 + 0.01, D / 2 - 0.6]); // bottom + rail
      positions.push([x, H / 2 + 0.01, D / 2 - 1.1]); // bottom - rail
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Main Body */}
      <mesh material={bodyMaterial} position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>

      {/* Center divider channel */}
      <mesh material={channelMaterial} position={[0, H / 2 + 0.01, 0]}>
        <boxGeometry args={[W * 0.95, 0.02, 0.6]} />
      </mesh>

      {/* Power Rail Markings */}
      {/* Top rail */}
      <mesh material={lineRed} position={[0, H / 2 + 0.011, -D / 2 + 0.6]}>
        <boxGeometry args={[W * 0.9, 0.01, 0.08]} />
      </mesh>
      <mesh material={lineBlue} position={[0, H / 2 + 0.011, -D / 2 + 1.1]}>
        <boxGeometry args={[W * 0.9, 0.01, 0.08]} />
      </mesh>

      {/* Bottom rail */}
      <mesh material={lineRed} position={[0, H / 2 + 0.011, D / 2 - 0.6]}>
        <boxGeometry args={[W * 0.9, 0.01, 0.08]} />
      </mesh>
      <mesh material={lineBlue} position={[0, H / 2 + 0.011, D / 2 - 1.1]}>
        <boxGeometry args={[W * 0.9, 0.01, 0.08]} />
      </mesh>

      {/* Holes using PinHighlight for interactivity if id is provided */}
      {id && config?.pins ? (
        config.pins.map((pin: PinDefinition) => (
          <group key={pin.id} position={pin.position}>
            <mesh material={holeMaterial} position={[0, -0.01, 0]}>
              <boxGeometry args={[0.18, 0.02, 0.18]} />
            </mesh>
            <PinHighlight componentId={id} pin={pin} />
          </group>
        ))
      ) : (
        // Fallback static holes
        holePositions.map((pos, i) => (
          <mesh key={i} material={holeMaterial} position={pos}>
            <boxGeometry args={[0.18, 0.02, 0.18]} />
          </mesh>
        ))
      )}
    </group>
  );
}
