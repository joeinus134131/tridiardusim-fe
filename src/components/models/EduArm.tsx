"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { forwardKinematics } from "@/lib/robotics/kinematics";
import { eduArm3Dof } from "@/lib/robotics/robots";

export function EduArm({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((c) => c.id === id));
  const joint0 = Number(component?.state.joint0 ?? 0);
  const joint1 = Number(component?.state.joint1 ?? 0);
  const joint2 = Number(component?.state.joint2 ?? 0);
  const gripperOpen = THREE.MathUtils.clamp(Number(component?.state.gripperOpen ?? 0.7), 0, 1);
  const rootRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const solver = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const angles = [joint0, joint1, joint2];
  const endPose = forwardKinematics(eduArm3Dof.joints, angles, eduArm3Dof.home);
  const gripperEuler = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().set(
    endPose[0], endPose[1], endPose[2], 0,
    endPose[4], endPose[5], endPose[6], 0,
    endPose[8], endPose[9], endPose[10], 0,
    0, 0, 0, 1,
  ));
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
    <group ref={rootRef} scale={200}>
      {/* Robot joint coordinates are metres; 200 scene units per metre matches the 5 mm component scale. */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.026, 0.031, 0.022, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.012, 0.015, 0.008, 24]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.55} roughness={0.28} />
      </mesh>
      {/* Turntable rim, central bearing and four countersunk base fasteners. */}
      <mesh position={[0, 0.031, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0115, 0.0007, 8, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.24} />
      </mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`base-screw:${x}:${z}`} position={[x * 0.021, 0.031, z * 0.021]}>
          <cylinderGeometry args={[0.0018, 0.0018, 0.001, 10]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.86} roughness={0.2} />
        </mesh>
      )))}
      <group position={[0, 0.026, 0]} rotation={[0, joint0, 0]}>
        {/* SG90-like servo shell, mounting ears and output spline at shoulder. */}
        <RoundedBox args={[0.023, 0.012, 0.023]} radius={0.002} smoothness={2} position={[0, 0.012, 0]} castShadow>
          <meshStandardMaterial color="#1d4ed8" roughness={0.48} />
        </RoundedBox>
        {[-1, 1].map((side) => <mesh key={`shoulder-ear:${side}`} position={[side * 0.0155, 0.012, 0]}><boxGeometry args={[0.009, 0.004, 0.012]} /><meshStandardMaterial color="#1d4ed8" roughness={0.48} /></mesh>)}
        <mesh position={[0, 0.020, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.003, 16]} />
          <meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.027, 0]} castShadow>
          <cylinderGeometry args={[0.0095, 0.012, 0.024, 20]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.35} />
        </mesh>
        <group position={[0, 0.024, 0]} rotation={[0, 0, joint1]}>
          {/* Paired laser-cut side plates with pivot holes and spacer bolts. */}
          {[-1, 1].map((side) => <group key={`upper-plate:${side}`} position={[0, 0, side * 0.009]}>
            <RoundedBox args={[0.018, 0.12, 0.0024]} radius={0.002} smoothness={2} position={[0, 0.06, 0]} castShadow>
              <meshStandardMaterial color="#0284c7" metalness={0.12} roughness={0.3} />
            </RoundedBox>
            <mesh position={[0, 0.108, side * 0.0013]}><cylinderGeometry args={[0.003, 0.003, 0.0008, 16]} /><meshStandardMaterial color="#111827" /></mesh>
            <mesh position={[0, 0.012, side * 0.0013]}><cylinderGeometry args={[0.0026, 0.0026, 0.0008, 16]} /><meshStandardMaterial color="#111827" /></mesh>
          </group>)}
          <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.004, 0.004, 0.014, 20]} /><meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.28} /></mesh>
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.011, 20, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.45} roughness={0.28} />
          </mesh>
          {/* Second servo case is concentric with the elbow pivot. */}
          <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[0.024, 0.014, 0.022]} /><meshStandardMaterial color="#1d4ed8" roughness={0.48} /></mesh>
          <mesh position={[0, 0.12, 0.012]}><cylinderGeometry args={[0.003, 0.003, 0.003, 16]} /><meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.22} /></mesh>
          <group position={[0, 0.12, 0]} rotation={[0, 0, joint2]}>
            {[-1, 1].map((side) => <group key={`forearm-plate:${side}`} position={[0, 0, side * 0.007]}>
              <RoundedBox args={[0.014, 0.1, 0.002]} radius={0.0018} smoothness={2} position={[0, 0.05, 0]} castShadow>
                <meshStandardMaterial color="#38bdf8" metalness={0.12} roughness={0.3} />
              </RoundedBox>
              <mesh position={[0, 0.009, side * 0.0011]}><cylinderGeometry args={[0.0022, 0.0022, 0.0008, 12]} /><meshStandardMaterial color="#111827" /></mesh>
            </group>)}
            <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.01, 18]} /><meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.28} /></mesh>
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
      <group position={[endPose[3], endPose[7], endPose[11]]} rotation={[gripperEuler.x, gripperEuler.y, gripperEuler.z]}>
        <mesh onClick={(event) => { event.stopPropagation(); useSimulatorStore.getState().updateComponentState(id, { gripperOpen: gripperOpen > 0.5 ? 0 : 1 }); }}>
          <boxGeometry args={[0.018, 0.012, 0.018]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.38} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (0.006 + gripperOpen * 0.006), 0.006, 0]} rotation={[0, 0, side * (0.12 + (1 - gripperOpen) * 0.34)]}>
            <mesh position={[side * 0.019, 0.012, 0]} castShadow><boxGeometry args={[0.042, 0.007, 0.009]} /><meshStandardMaterial color="#f97316" metalness={0.35} roughness={0.38} /></mesh>
            <mesh position={[side * 0.038, 0.012, 0]}><boxGeometry args={[0.012, 0.013, 0.012]} /><meshStandardMaterial color="#1e293b" roughness={0.55} /></mesh>
          </group>
        ))}
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
