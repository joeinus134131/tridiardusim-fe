'use client';

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { PinDefinition } from '@/lib/components/componentTypes';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { COLORS } from '@/lib/constants';

interface PinHighlightProps {
  componentId: string;
  pin: PinDefinition;
}

export function PinHighlight({ componentId, pin }: PinHighlightProps) {
  const [isHovered, setIsHovered] = useState(false);
  const startWiring = useSimulatorStore(state => state.startWiring);
  const finishWiring = useSimulatorStore(state => state.finishWiring);
  const wiringState = useSimulatorStore(state => state.wiringState);

  // Material for the pin interaction zone
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: isHovered ? COLORS.pin.hover : COLORS.pin.normal,
    transparent: true,
    opacity: isHovered ? 0.8 : 0.0, // Invisible until hovered
    depthTest: false, // Ensure it renders over the component body
  }), [isHovered]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    // Use pointer capture so we can drag outside the pin
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    startWiring(componentId, pin.id);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    
    if (wiringState.active) {
      finishWiring(componentId, pin.id);
    }
  };

  return (
    <group position={pin.position}>
      {/* The interactable zone */}
      <mesh 
        material={material}
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Slightly larger than the pin itself to make it easy to click */}
        <sphereGeometry args={[1.5, 16, 16]} />
      </mesh>
      
      {/* Pin Name Tooltip (3D Text or HTML overlay) */}
      {/* For MVP, we'll skip 3D text to save performance, relying on standard HTML tooltips if needed */}
    </group>
  );
}
