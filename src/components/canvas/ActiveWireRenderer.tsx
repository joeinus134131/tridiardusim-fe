"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";

export function ActiveWireRenderer() {
  const wiringState = useSimulatorStore((state) => state.wiringState);
  const components = useSimulatorStore((state) => state.components);

  const { active, sourceComponentId, sourcePinId, currentTargetPos } =
    wiringState;

  // Calculate start position dynamically
  const startPos = useMemo(() => {
    if (!active || !sourceComponentId || !sourcePinId) return null;

    const comp = components.find((c) => c.id === sourceComponentId);
    if (!comp) return null;

    const config = ComponentRegistry.get(comp.typeId);
    const pinDef = config?.pins.find((p) => p.id === sourcePinId);
    if (!pinDef) return null;

    const localPos = new THREE.Vector3(...pinDef.position);
    const compPos = new THREE.Vector3(...comp.position);
    const euler = new THREE.Euler(...comp.rotation);

    localPos.applyEuler(euler);
    return localPos.add(compPos);
  }, [active, sourceComponentId, sourcePinId, components]);

  if (!active || !startPos || !currentTargetPos) return null;

  const endPos = new THREE.Vector3(...currentTargetPos);

  // Arch height based on distance
  const distance = startPos.distanceTo(endPos);
  const midPoint = startPos.clone().lerp(endPos, 0.5);
  midPoint.y += Math.min(distance * 0.3, 10);

  const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 20, 0.075, 6, false]} />
        <meshStandardMaterial
          color="#3b82f6" // Default blue for drawing
          roughness={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* End tip matching current mouse pos */}
      <mesh position={endPos}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}
