'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinHighlight } from '@/components/canvas/PinHighlight';

interface PushButtonProps {
  id: string;
}

export function PushButton({ id }: PushButtonProps) {
  const component = useSimulatorStore(state => state.components.find(c => c.id === id));
  const updateComponentState = useSimulatorStore(state => state.updateComponentState);
  
  const isPressed = component?.state?.isPressed || false;

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a2e',
    roughness: 0.85,
    metalness: 0.1,
  }), []);

  // Cap color — typically red, blue, or black
  const capMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: isPressed ? '#b91c1c' : '#dc2626',
    roughness: 0.5,
    metalness: 0.05,
  }), [isPressed]);

  const legMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#b0b8c4',
    roughness: 0.3,
    metalness: 0.85,
  }), []);

  // Tactile switch is about 6x6x3.5mm with a 3mm cap
  const S = 1.2; // body size
  const capH = isPressed ? 0.15 : 0.35;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    updateComponentState(id, { isPressed: true });
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    updateComponentState(id, { isPressed: false });
  };

  return (
    <group>
      {/* Body */}
      <mesh material={bodyMaterial} position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[S, 0.7, S]} />
      </mesh>

      {/* Clickable cap */}
      <mesh 
        material={capMaterial} 
        position={[0, 0.7 + capH / 2, 0]} 
        castShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <cylinderGeometry args={[0.3, 0.35, capH, 12]} />
      </mesh>

      {/* 4 Legs */}
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
        <mesh key={i} material={legMaterial} position={[x, -0.35, z]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
        </mesh>
      ))}

      {/* Pins */}
      {ComponentRegistry.get('push_button')?.pins.map(pin => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}
    </group>
  );
}
