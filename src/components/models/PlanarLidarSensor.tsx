"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";

export function PlanarLidarSensor({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const elapsedMs = useSimulatorStore((state) => state.elapsedMs);
  const groupRef = useRef<THREE.Group | null>(null);
  const lastCaptureMs = useRef(Number.NEGATIVE_INFINITY);
  const lastPose = useRef("");
  const range = Math.max(1, Math.min(40, Number(component?.state.maxRangeMeters) || 12));
  const sampleCount = Number(component?.state.sampleCount) === 720 ? 720 : 360;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const worldPoint = useMemo(() => new THREE.Vector3(), []);
  const localPoint = useMemo(() => new THREE.Vector3(), []);
  const worldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const localOrigin = useMemo(() => new THREE.Vector3(0, 0.34, 0), []);
  const scanGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const rayRoots = useMemo(() => [] as THREE.Object3D[], []);
  const ranges = useMemo(() => new Float32Array(sampleCount), [sampleCount]);
  const hitMask = useMemo(() => new Uint8Array(sampleCount), [sampleCount]);

  useEffect(() => () => scanGeometry.dispose(), [scanGeometry]);

  useFrame(({ scene }) => {
    const sensor = groupRef.current;
    if (!component || !sensor) return;
    const poseKey = `${component.position.join(",")}|${component.rotation.join(",")}|${range}|${sampleCount}`;
    if (elapsedMs - lastCaptureMs.current < 100 && lastPose.current === poseKey) return;

    scene.updateMatrixWorld(true);
    sensor.updateWorldMatrix(true, false);
    sensor.getWorldPosition(origin);
    sensor.getWorldQuaternion(worldQuaternion);
    origin.add(localPoint.copy(localOrigin).applyQuaternion(worldQuaternion));

    rayRoots.length = 0;
    let sensorRoot: THREE.Object3D = sensor;
    while (sensorRoot.parent && sensorRoot.parent !== scene) sensorRoot = sensorRoot.parent;
    for (const child of scene.children) {
      if (child !== sensorRoot) rayRoots.push(child);
    }

    const vertices = new Float32Array(sampleCount * 6);
    for (let sample = 0; sample < sampleCount; sample++) {
      const angle = (sample / sampleCount) * Math.PI * 2;
      direction.set(Math.sin(angle), 0, -Math.cos(angle)).applyQuaternion(worldQuaternion).normalize();
      raycaster.set(origin, direction);
      raycaster.near = 0.03;
      raycaster.far = range;
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
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.38, 0.4, 32]} />
        <meshStandardMaterial color="#26374b" metalness={0.68} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.055, 48]} />
        <meshStandardMaterial color="#22a6a1" metalness={0.35} roughness={0.18} emissive="#064e4b" />
      </mesh>
      <lineSegments geometry={scanGeometry}>
        <lineBasicMaterial color="#38e8d1" transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
