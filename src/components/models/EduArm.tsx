"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { forwardKinematics } from "@/lib/robotics/kinematics";
import { eduArm3Dof } from "@/lib/robotics/robots";

export function EduArm({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const joint0 = Number(component?.state.joint0 ?? 0);
  const joint1 = Number(component?.state.joint1 ?? 0);
  const joint2 = Number(component?.state.joint2 ?? 0);
  const rootRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const solver = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const angles = [joint0, joint1, joint2];
  const endPose = forwardKinematics(eduArm3Dof.joints, angles, eduArm3Dof.home);
  useEffect(() => {
    const worker = new Worker(new URL("../../lib/robotics/kinematics.worker.ts", import.meta.url));
    solver.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.type !== "solved" || data.requestId !== requestId.current || data.componentId !== id || !data.result.success) return;
      useSimulatorStore.getState().updateComponentState(id, Object.fromEntries(data.result.angles.map((value: number, i: number) => [`joint${i}`, value])));
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
      requestId: requestId.current,
      componentId: component.id,
      angles,
      target: [localTarget.x, localTarget.y, localTarget.z],
      currentEnd: [endPose[3], endPose[7], endPose[11]],
    });
  };

  return (
    <group ref={rootRef} scale={50}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.026, 0.031, 0.022, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.012, 0.015, 0.008, 24]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.55} roughness={0.28} />
      </mesh>
      <group position={[0, 0.026, 0]} rotation={[0, joint0, 0]}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.0095, 0.012, 0.024, 20]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.35} />
        </mesh>
        <group position={[0, 0.024, 0]} rotation={[0, 0, joint1]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.014, 0.12, 0.015]} />
            <meshStandardMaterial color="#0284c7" metalness={0.38} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.011, 20, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.45} roughness={0.28} />
          </mesh>
          <group position={[0, 0.12, 0]} rotation={[0, 0, joint2]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[0.0115, 0.1, 0.012]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.102, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.01, 0.009, 20]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.65} roughness={0.22} />
            </mesh>
            <mesh position={[0, 0.115, 0]} castShadow>
              <boxGeometry args={[0.025, 0.006, 0.008]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.35} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh
        position={[endPose[3], endPose[7], endPose[11]]}
        onPointerDown={(event) => {
          event.stopPropagation();
          dragging.current = true;
          const target = event.target as EventTarget & { setPointerCapture?: (pointerId: number) => void };
          target.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={updateDragTarget}
        onPointerUp={(event) => {
          event.stopPropagation();
          dragging.current = false;
          const target = event.target as EventTarget & { releasePointerCapture?: (pointerId: number) => void };
          target.releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <sphereGeometry args={[0.009, 16, 12]} />
        <meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}
