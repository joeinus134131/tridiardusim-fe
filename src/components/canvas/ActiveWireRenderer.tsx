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

  // Calculate start position and direction dynamically
  const pinData = useMemo(() => {
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
    const pos = localPos.add(compPos);

    const dirLocal = pinDef.direction ?? (pinDef.position[1] < 0 ? [0, -1, 0] : [0, 1, 0]);
    const norm = new THREE.Vector3(...dirLocal).applyEuler(euler).normalize();

    return { pos, norm };
  }, [active, sourceComponentId, sourcePinId, components]);

  const startPos = pinData?.pos ?? null;
  const startNorm = pinData?.norm ?? null;

  const { curve, endPos } = useMemo(() => {
    if (!active || !startPos || !startNorm || !currentTargetPos) return { curve: null, endPos: null };

    const end = new THREE.Vector3(...currentTargetPos);
    const dist = startPos.distanceTo(end);

    const mid = startPos.clone().lerp(end, 0.5);
    const maxPinY = Math.max(startPos.y, end.y);
    const archLift = Math.max(1.0, Math.min(dist * 0.25, 4.0));
    mid.y = Math.max(mid.y, maxPinY) + archLift;

    let sBase: THREE.Vector3;
    let sTop: THREE.Vector3;
    let sRigid: THREE.Vector3;

    if (startNorm.y < -0.2) {
      // Downward pin
      sBase = startPos.clone().addScaledVector(startNorm, 0.15);
      sTop = startPos.clone().addScaledVector(startNorm, 0.55);
      const toEndH = new THREE.Vector3(end.x - sTop.x, 0, end.z - sTop.z);
      const dirH = toEndH.lengthSq() > 0.001 ? toEndH.normalize() : new THREE.Vector3(0, 0, 1);
      sRigid = sTop.clone().addScaledVector(dirH, 0.85);
      sRigid.y = Math.max(0.12, Math.min(sTop.y, startPos.y - 0.15));
    } else {
      // Upward pin
      sBase = startPos.clone().add(new THREE.Vector3(0, 0.2, 0));
      sTop = startPos.clone().add(new THREE.Vector3(0, 0.65, 0));
      sRigid = startPos.clone().add(new THREE.Vector3(0, 1.25, 0));
    }

    const p3 = end.clone().add(new THREE.Vector3(0, 0.6, 0));

    const naturalCurve = new THREE.CatmullRomCurve3(
      [sBase, sTop, sRigid, mid, p3, end],
      false,
      "catmullrom",
      0.35
    );

    return { curve: naturalCurve, endPos: end };
  }, [active, startPos, startNorm, currentTargetPos]);

  const bootQuat = useMemo(() => {
    if (!startNorm) return new THREE.Quaternion();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), startNorm);
  }, [startNorm]);

  const bootPos = useMemo(() => {
    if (!startPos || !startNorm) return new THREE.Vector3();
    if (startNorm.y < -0.2) {
      const pos = startPos.clone().addScaledVector(startNorm, 0.325);
      if (pos.y < 0.35) pos.y = Math.max(startPos.y + 0.25, 0.35);
      return pos;
    }
    return startPos.clone().addScaledVector(startNorm, 0.325);
  }, [startPos, startNorm]);

  if (!active || !startPos || !endPos || !curve) return null;

  return (
    <group>
      {/* Dynamic Active Jumper Wire */}
      <mesh>
        <tubeGeometry args={[curve, 40, 0.08, 8, false]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.25}
          roughness={0.5}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Rigid Terminal Boot at starting pin */}
      <group position={bootPos} quaternion={bootQuat}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.65, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.15, 0.14, 0.07, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* Cursor tip target */}
      <mesh position={endPos}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
    </group>
  );
}
