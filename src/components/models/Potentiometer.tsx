'use client';

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { mapRange } from '@/lib/utils';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinHighlight } from '@/components/canvas/PinHighlight';

interface PotentiometerProps {
  id: string;
}

export function Potentiometer({ id }: PotentiometerProps) {
  const component = useSimulatorStore(state => state.components.find(c => c.id === id));
  const updateComponentState = useSimulatorStore(state => state.updateComponentState);
  const selectComponent = useSimulatorStore(state => state.selectComponent);
  
  const value = component?.state?.value || 0;
  const rotationY = mapRange(value, 0, 1, -Math.PI * 0.75, Math.PI * 0.75);

  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingKnob, setIsDraggingKnob] = useState(false);

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1565c0', // Blue body typical of trimmer pots
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  const silverMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    roughness: 0.3,
    metalness: 0.85,
  }), []);

  const knobColor = isHovered ? '#e0e0e0' : '#d0d0d0';
  const knobMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: knobColor,
    roughness: 0.45,
    metalness: 0.15,
  }), [knobColor]);

  const markerMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1a1a2e' }), []);

  // Potentiometer is ~10mm diameter, ~5mm tall
  const R = 1;
  const legLen = 1.2;

  const handleKnobPointerDown = (e: any) => {
    e.stopPropagation();
    setIsDraggingKnob(true);
    selectComponent(id);
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handleKnobPointerMove = (e: any) => {
    if (!isDraggingKnob) return;
    e.stopPropagation();
    const dx = e.movementX || 0;
    let newValue = value + (dx / 150);
    newValue = Math.max(0, Math.min(1, newValue));
    updateComponentState(id, { value: newValue });
  };

  const handleKnobPointerUp = (e: any) => {
    setIsDraggingKnob(false);
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  };

  return (
    <group>
      {/* Circular body */}
      <mesh material={bodyMaterial} position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[R, R, 0.8, 20]} />
      </mesh>

      {/* Center shaft */}
      <mesh material={silverMaterial} position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.6, 8]} />
      </mesh>

      {/* Knob (interactive) */}
      <group 
        position={[0, 1.3, 0]} 
        rotation={[0, -rotationY, 0]}
        onPointerDown={handleKnobPointerDown}
        onPointerMove={handleKnobPointerMove}
        onPointerUp={handleKnobPointerUp}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => { setIsHovered(false); if (isDraggingKnob) handleKnobPointerUp({}); }}
      >
        <mesh material={knobMaterial} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.5, 16]} />
        </mesh>
        {/* Indicator line */}
        <mesh material={markerMaterial} position={[0, 0.26, -0.4]}>
          <boxGeometry args={[0.08, 0.02, 0.3]} />
        </mesh>
      </group>

      {/* 3 Legs */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <mesh key={i} material={silverMaterial} position={[x, -legLen / 2, 0]} castShadow>
          <boxGeometry args={[0.08, legLen, 0.08]} />
        </mesh>
      ))}

      {/* Pins */}
      {ComponentRegistry.get('potentiometer')?.pins.map(pin => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}
    </group>
  );
}
