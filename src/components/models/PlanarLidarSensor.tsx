"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { Label } from "./Label";

export function PlanarLidarSensor({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const elapsedMs = useSimulatorStore((state) => state.elapsedMs);
  const groupRef = useRef<THREE.Group | null>(null);
  const turretRef = useRef<THREE.Group | null>(null);
  const lastCaptureMs = useRef(Number.NEGATIVE_INFINITY);
  const lastPose = useRef("");
  const range = Math.max(1, Math.min(40, Number(component?.state.maxRangeMeters) || 12));
  const sampleCount = Number(component?.state.sampleCount) === 720 ? 720 : 360;
  const origin = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const worldPoint = useMemo(() => new THREE.Vector3(), []);
  const localPoint = useMemo(() => new THREE.Vector3(), []);
  const worldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const localOrigin = useMemo(() => new THREE.Vector3(0, 8.25, 0), []);
  const scanGeometry = useMemo(() => new THREE.BufferGeometry(), []);

  useEffect(() => () => scanGeometry.dispose(), [scanGeometry]);

  useFrame(({ scene }) => {
    const sensor = groupRef.current;
    if (turretRef.current) turretRef.current.rotation.y = (elapsedMs / 1000) * Math.PI * 2 * 5.5;
    if (!component || !sensor) return;
    const poseKey = `${component.position.join(",")}|${component.rotation.join(",")}|${range}|${sampleCount}`;
    if (elapsedMs - lastCaptureMs.current < 100 && lastPose.current === poseKey) return;

    scene.updateMatrixWorld(true);
    sensor.updateWorldMatrix(true, false);
    sensor.getWorldPosition(origin);
    sensor.getWorldQuaternion(worldQuaternion);
    origin.add(localPoint.copy(localOrigin).applyQuaternion(worldQuaternion));

    const rayRoots: THREE.Object3D[] = [];
    let sensorRoot: THREE.Object3D = sensor;
    while (sensorRoot.parent && sensorRoot.parent !== scene) sensorRoot = sensorRoot.parent;
    for (const child of scene.children) {
      if (child !== sensorRoot) rayRoots.push(child);
    }

    const vertices = new Float32Array(sampleCount * 6);
    const ranges = new Float32Array(sampleCount);
    const hitMask = new Uint8Array(sampleCount);
    const raycaster = new THREE.Raycaster();
    raycaster.near = 0.03;
    raycaster.far = range;
    for (let sample = 0; sample < sampleCount; sample++) {
      const angle = (sample / sampleCount) * Math.PI * 2;
      direction.set(Math.sin(angle), 0, -Math.cos(angle)).applyQuaternion(worldQuaternion).normalize();
      raycaster.set(origin, direction);
      const hit = raycaster.intersectObjects(rayRoots, true).find((item) => item.distance >= raycaster.near);
      const distance = hit?.distance ?? range;
      ranges[sample] = distance;
      hitMask[sample] = hit ? 1 : 0;
      if (hit) {
        const offset = sample * 6;
        sensor.worldToLocal(localPoint.copy(origin));
        vertices[offset] = localPoint.x;
        vertices[offset + 1] = localPoint.y;
        vertices[offset + 2] = localPoint.z;
        worldPoint.copy(origin).addScaledVector(direction, distance);
        sensor.worldToLocal(worldPoint);
        vertices[offset + 3] = worldPoint.x;
        vertices[offset + 4] = worldPoint.y;
        vertices[offset + 5] = worldPoint.z;
      }
    }

    scanGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    scanGeometry.setDrawRange(0, sampleCount * 2);
    useSimulatorStore.getState().setLidarFrame(id, {
      rangesMeters: ranges.slice(),
      hitMask: hitMask.slice(),
      sampleCount,
      maxRangeMeters: range,
      capturedAtSimMs: elapsedMs,
    });
    lastCaptureMs.current = elapsedMs;
    lastPose.current = poseKey;
  }, -1);

  return (
    <group ref={groupRef}>
      {/* RPLIDAR A1 outer envelope is 96.8 x 70.3 x 55 mm. */}
      <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[19.36, 6.2, 14.06]} />
        <meshStandardMaterial color="#26374b" metalness={0.42} roughness={0.46} />
      </mesh>
      <mesh position={[0, 6.28, 0]} castShadow>
        <boxGeometry args={[18.8, 0.18, 13.5]} />
        <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.38} />
      </mesh>
      {/* Fasteners and seam marks make the asymmetric base housing legible at close range. */}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`case-fastener:${x}:${z}`} position={[x * 8.55, 6.39, z * 5.9]}>
        <mesh><cylinderGeometry args={[0.22, 0.22, 0.13, 10]} /><meshStandardMaterial color="#cbd5e1" metalness={0.86} roughness={0.2} /></mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.2, 0.025, 0.045]} /><meshStandardMaterial color="#111827" /></mesh>
      </group>))}
      <mesh position={[0, 3.1, 7.08]}><boxGeometry args={[8.4, 0.07, 0.025]} /><meshStandardMaterial color="#111827" roughness={0.8} /></mesh>
      <Label text="RPLIDAR A1" position={[0, 4.65, 7.1]} size={0.45} color="#e2e8f0" rotation={[0, 0, 0]} />
      {/* Side drive motor and belt/pulley housing. */}
      <group position={[7.3, 4.4, 0]}>
        <mesh castShadow><boxGeometry args={[2.2, 3.2, 4.0]} /><meshStandardMaterial color="#334155" metalness={0.5} roughness={0.42} /></mesh>
        <mesh position={[1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.1, 1.1, 1.4, 28]} /><meshStandardMaterial color="#111827" metalness={0.18} roughness={0.68} /></mesh>
        <mesh position={[0.2, 0.15, 1.75]}><boxGeometry args={[2.2, 2.4, 0.32]} /><meshStandardMaterial color="#0f172a" roughness={0.72} /></mesh>
      </group>
      {/* The optical drum rotates at the A1's nominal 5.5 Hz. */}
      <group ref={turretRef}>
        <mesh position={[0, 8.3, 0]} castShadow>
          <cylinderGeometry args={[7.03, 7.03, 4.2, 48]} />
          <meshStandardMaterial color="#111827" metalness={0.28} roughness={0.5} />
        </mesh>
        <mesh position={[0, 10.65, 0]} castShadow>
          <cylinderGeometry args={[6.6, 6.6, 0.4, 48]} />
          <meshStandardMaterial color="#1e293b" metalness={0.32} roughness={0.46} />
        </mesh>
        {[-1, 1].map((side) => <group key={side} position={[side * 7.02, 8.25, 0]} rotation={[0, side < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}><mesh><boxGeometry args={[1.25, 0.75, 0.12]} /><meshPhysicalMaterial color="#38bdf8" transparent opacity={0.78} metalness={0.2} roughness={0.12} clearcoat={1} /></mesh><mesh position={[0, 0, side * 0.08]}><boxGeometry args={[1.55, 1.05, 0.12]} /><meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.24} /></mesh></group>)}
        <mesh position={[0, 10.9, 0]}>
          <cylinderGeometry args={[5.9, 5.9, 0.045, 48]} />
          <meshStandardMaterial color="#22a6a1" metalness={0.35} roughness={0.18} emissive="#064e4b" />
        </mesh>
      </group>
      <lineSegments geometry={scanGeometry}>
        <lineBasicMaterial color="#38e8d1" transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
