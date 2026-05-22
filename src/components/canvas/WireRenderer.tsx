'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { COLORS } from '@/lib/constants';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';

export function WireRenderer() {
  const wires = useSimulatorStore(state => state.wires);
  const components = useSimulatorStore(state => state.components);

  // Helper to find the world position of a specific pin
  const getPinWorldPosition = (componentId: string, pinId: string): THREE.Vector3 | null => {
    const comp = components.find(c => c.id === componentId);
    if (!comp) return null;

    const config = ComponentRegistry.get(comp.typeId);
    const pinDef = config?.pins.find(p => p.id === pinId);
    if (!pinDef) return null;

    // Local pin position
    const localPos = new THREE.Vector3(...pinDef.position);
    
    // Component transform
    const compPos = new THREE.Vector3(...comp.position);
    const euler = new THREE.Euler(...comp.rotation);
    
    // Apply rotation then translation
    localPos.applyEuler(euler);
    return localPos.add(compPos);
  };

  return (
    <group>
      {wires.map(wire => {
        const startPos = getPinWorldPosition(wire.sourceComponentId, wire.sourcePinId);
        const endPos = getPinWorldPosition(wire.targetComponentId, wire.targetPinId);

        if (!startPos || !endPos) return null;

        // Create a bezier curve between the two points to make it look like a physical wire
        // For MVP, we just arch it up in the middle based on distance
        const distance = startPos.distanceTo(endPos);
        const midPoint = startPos.clone().lerp(endPos, 0.5);
        midPoint.y += Math.min(distance * 0.3, 10); // Arch height

        const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        const points = curve.getPoints(20);

        return (
          <group key={wire.id}>
            {/* The Wire Tube */}
            <mesh castShadow>
              <tubeGeometry args={[curve, 20, 0.4, 8, false]} />
              <meshStandardMaterial 
                color={wire.color || COLORS.wire.signal} 
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>
            
            {/* Metal connector tips */}
            <mesh position={startPos}>
              <cylinderGeometry args={[0.2, 0.2, 1]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
            <mesh position={endPos}>
              <cylinderGeometry args={[0.2, 0.2, 1]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
