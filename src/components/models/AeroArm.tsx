"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { forwardKinematics } from "@/lib/robotics/kinematics";
import { aeroArm6Dof } from "@/lib/robotics/robots";

const metal = { metalness: 0.62, roughness: 0.3 } as const;

export function AeroArm({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const angles = aeroArm6Dof.joints.map((_, i) => Number(component?.state[`joint${i}`] ?? 0));
  const rootRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const solver = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const pose = forwardKinematics(aeroArm6Dof.joints, angles, aeroArm6Dof.home);

  useEffect(() => {
    const worker = new Worker(new URL("../../lib/robotics/kinematics.worker.ts", import.meta.url));
    solver.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.type !== "solved" || data.requestId !== requestId.current || data.componentId !== id || !data.result.success) return;
      useSimulatorStore.getState().updateComponentState(
        id,
        Object.fromEntries(data.result.angles.map((value: number, i: number) => [`joint${i}`, value])),
      );
    };
    return () => {
      solver.current = null;
      worker.terminate();
    };
  }, [id]);

  const updateDragTarget = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !rootRef.current || !component) return;
    event.stopPropagation();
    rootRef.current.updateWorldMatrix(true, false);
    const origin = rootRef.current.getWorldPosition(new THREE.Vector3());
    const normal = rootRef.current.localToWorld(new THREE.Vector3(0, 0, 1)).sub(origin).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);
    const worldTarget = event.ray.intersectPlane(plane, new THREE.Vector3());
    if (!worldTarget) return;
    const localTarget = rootRef.current.worldToLocal(worldTarget);
    requestId.current += 1;
    solver.current?.postMessage({
      type: "solve-position",
      robotId: aeroArm6Dof.id,
      requestId: requestId.current,
      componentId: component.id,
      angles,
      target: [localTarget.x, localTarget.y, localTarget.z],
      currentEnd: [pose[3], pose[7], pose[11]],
    });
  };

  const capture = (event: ThreeEvent<PointerEvent>, begin: boolean) => {
    event.stopPropagation();
    dragging.current = begin;
    const target = event.target as EventTarget & {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
    };
    if (begin) target.setPointerCapture?.(event.pointerId);
    else target.releasePointerCapture?.(event.pointerId);
  };

  return (
    <group ref={rootRef} scale={50}>
      <mesh position={[0, 0.016, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.043, 0.05, 0.032, 32]} />
        <meshStandardMaterial color="#334155" {...metal} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.024, 0.03, 0.016, 28]} />
        <meshStandardMaterial color="#0ea5e9" {...metal} />
      </mesh>
      <group position={[0, 0.048, 0]} rotation={[0, angles[0], 0]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.048, 0.08, 0.05]} />
          <meshStandardMaterial color="#0284c7" {...metal} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.018, 24]} />
          <meshStandardMaterial color="#475569" {...metal} />
        </mesh>
        <group position={[0, 0.08, 0]} rotation={[0, 0, angles[1]]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.027, 0.12, 0.026]} />
            <meshStandardMaterial color="#0284c7" {...metal} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.019, 0.022, 0.018, 24]} />
            <meshStandardMaterial color="#64748b" {...metal} />
          </mesh>
          <group position={[0, 0.12, 0]} rotation={[0, 0, angles[2]]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[0.021, 0.10, 0.021]} />
              <meshStandardMaterial color="#38bdf8" {...metal} />
            </mesh>
            <mesh position={[0, 0.10, 0]}>
              <cylinderGeometry args={[0.017, 0.019, 0.022, 24]} />
              <meshStandardMaterial color="#64748b" {...metal} />
            </mesh>
            <group position={[0, 0.10, 0]} rotation={[0, angles[3], 0]}>
              <mesh position={[0, 0.0175, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.016, 0.035, 20]} />
                <meshStandardMaterial color="#0ea5e9" {...metal} />
              </mesh>
              <group position={[0, 0.035, 0]} rotation={[0, 0, angles[4]]}>
                <mesh position={[0, 0.0175, 0]} castShadow>
                  <cylinderGeometry args={[0.012, 0.014, 0.035, 20]} />
                  <meshStandardMaterial color="#38bdf8" {...metal} />
                </mesh>
                <group position={[0, 0.035, 0]} rotation={[0, angles[5], 0]}>
                  <mesh position={[0, 0.015, 0]} castShadow>
                    <cylinderGeometry args={[0.008, 0.01, 0.03, 20]} />
                    <meshStandardMaterial color="#f8fafc" {...metal} />
                  </mesh>
                  <mesh position={[0, 0.03, 0]}>
                    <boxGeometry args={[0.036, 0.006, 0.009]} />
                    <meshStandardMaterial color="#f59e0b" {...metal} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
      <mesh
        position={[pose[3], pose[7], pose[11]]}
        onPointerDown={(event) => capture(event, true)}
        onPointerMove={updateDragTarget}
        onPointerUp={(event) => capture(event, false)}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <sphereGeometry args={[0.009, 16, 12]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}
