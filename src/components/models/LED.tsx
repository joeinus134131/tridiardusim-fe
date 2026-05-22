'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { PinHighlight } from '@/components/canvas/PinHighlight';

interface LEDProps {
  id: string;
}

export function LED({ id }: LEDProps) {
  const component = useSimulatorStore(state => 
    state.components.find(c => c.id === id)
  );
  
  const state = component?.state || { isOn: false, brightness: 0, color: '#ef4444' };
  const baseColor = useMemo(() => new THREE.Color(state.color), [state.color]);
  
  const isLit = state.isOn || state.brightness > 0;
  const intensity = state.isOn ? 1 : state.brightness / 255;

  // LED dome: translucent tinted epoxy
  const domeMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: baseColor,
    emissive: isLit ? baseColor : new THREE.Color(0x000000),
    emissiveIntensity: isLit ? 2.5 : 0,
    transmission: isLit ? 0.5 : 0.7,
    opacity: 0.92,
    transparent: true,
    roughness: 0.15,
    metalness: 0,
    ior: 1.5,
    thickness: 0.5,
  }), [baseColor, isLit]);

  const legMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#b0b8c4',
    roughness: 0.35,
    metalness: 0.85,
  }), []);

  // LED is about 5mm diameter, 8.6mm tall (dome + base)
  const R = 0.5; // radius ~2.5mm scaled
  const legLen = 2;

  return (
    <group>
      {/* Flat bottom collar (the wider lip at the base) */}
      <mesh material={domeMaterial} position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[R * 1.15, R * 1.15, 0.3, 16]} />
      </mesh>

      {/* Cylindrical body */}
      <mesh material={domeMaterial} position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[R, R, 0.8, 16]} />
      </mesh>

      {/* Hemispherical dome top */}
      <mesh material={domeMaterial} position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[R, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Anode lead (longer leg, left side) */}
      <mesh material={legMaterial} position={[-0.25, -legLen / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, legLen, 6]} />
      </mesh>
      {/* Cathode lead (shorter leg, right side) */}
      <mesh material={legMaterial} position={[0.25, -legLen / 2 + 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, legLen - 0.3, 6]} />
      </mesh>

      {/* Glow light when lit */}
      {isLit && (
        <pointLight 
          color={baseColor} 
          intensity={intensity * 4} 
          distance={8} 
          position={[0, 1.2, 0]} 
        />
      )}

      {/* Pin highlights */}
      {ComponentRegistry.get('led_red')?.pins.map(pin => (
        <PinHighlight key={pin.id} componentId={id} pin={pin} />
      ))}
    </group>
  );
}
