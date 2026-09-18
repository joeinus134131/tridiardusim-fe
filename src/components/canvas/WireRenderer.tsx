"use client";
import { ThreeEvent } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import type { Wire } from "@/lib/components/componentTypes";

type Vec = [number, number, number];

const Connection = memo(function Connection({
  wire,
  source,
  rotation,
  target,
  targetRotation,
  sp,
  tp,
  selected,
}: {
  wire: Wire;
  source: Vec;
  rotation: Vec;
  target: Vec;
  targetRotation: Vec;
  sp: Vec;
  tp: Vec;
  selected: boolean;
}) {
  const { curve, start, end, sNorm, tNorm } = useMemo(() => {
    const s = new THREE.Vector3(...sp)
      .applyEuler(new THREE.Euler(...rotation))
      .add(new THREE.Vector3(...source));
    const e = new THREE.Vector3(...tp)
      .applyEuler(new THREE.Euler(...targetRotation))
      .add(new THREE.Vector3(...target));

    const sN = new THREE.Vector3(0, 1, 0)
      .applyEuler(new THREE.Euler(...rotation))
      .normalize();
    const tN = new THREE.Vector3(0, 1, 0)
      .applyEuler(new THREE.Euler(...targetRotation))
      .normalize();

    if (wire.path?.length) {
      return {
        curve: new THREE.CatmullRomCurve3(
          [s, ...wire.path.map((p) => new THREE.Vector3(...p)), e],
          false,
          "centripetal"
        ),
        start: s,
        end: e,
        sNorm: sN,
        tNorm: tN,
      };
    }

    const dist = s.distanceTo(e);
    const mid = s.clone().lerp(e, 0.5);
    const archLift = Math.max(2.2, Math.min(dist * 0.36, 6.0));
    mid.y = Math.max(s.y, e.y, mid.y) + archLift;

    const up = new THREE.Vector3(0, 1, 0);

    // Boot exit points (sleeve length 0.65)
    const sBase = s.clone().addScaledVector(sN, 0.15);
    const sExit = s.clone().addScaledVector(sN, 0.65);
    // Smooth flexible transition bending gracefully upward towards midpoint
    const sEase1 = sExit.clone().addScaledVector(sN, 0.25).addScaledVector(up, 0.35).lerp(mid, 0.12);
    const sEase2 = sEase1.clone().lerp(mid, 0.48).addScaledVector(up, archLift * 0.15);

    const eBase = e.clone().addScaledVector(tN, 0.15);
    const eExit = e.clone().addScaledVector(tN, 0.65);
    const eEase1 = eExit.clone().addScaledVector(tN, 0.25).addScaledVector(up, 0.35).lerp(mid, 0.12);
    const eEase2 = eEase1.clone().lerp(mid, 0.48).addScaledVector(up, archLift * 0.15);

    const naturalCurve = new THREE.CatmullRomCurve3(
      [sBase, sExit, sEase1, sEase2, mid, eEase2, eEase1, eExit, eBase],
      false,
      "centripetal",
      0.5
    );

    return { curve: naturalCurve, start: s, end: e, sNorm: sN, tNorm: tN };
  }, [
    source[0], source[1], source[2],
    rotation[0], rotation[1], rotation[2],
    target[0], target[1], target[2],
    targetRotation[0], targetRotation[1], targetRotation[2],
    sp[0], sp[1], sp[2],
    tp[0], tp[1], tp[2],
    wire.path
  ]);

  // Quaternions for terminal boot alignment with pin normals
  const sQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sNorm),
    [sNorm]
  );
  const tQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tNorm),
    [tNorm]
  );

  const sBootPos = useMemo(
    () => start.clone().addScaledVector(sNorm, 0.325),
    [start, sNorm]
  );
  const tBootPos = useMemo(
    () => end.clone().addScaledVector(tNorm, 0.325),
    [end, tNorm]
  );

  return (
    <group>
      {/* 1. Main Flexible Insulated Wire (96 segments for silky smooth curves) */}
      <mesh
        onClick={(ev) => {
          ev.stopPropagation();
          useSimulatorStore.getState().selectWire(wire.id);
        }}
      >
        <tubeGeometry args={[curve, 96, 0.082, 16, false]} />
        <meshStandardMaterial
          color={wire.color}
          emissive={selected ? wire.color : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>

      {/* 2. Plastic DuPont Terminal Boots (Rigid sleeves, oriented with pin direction) */}
      {/* Source terminal sleeve */}
      <group position={sBootPos} quaternion={sQuat}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.65, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Top collar rim */}
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.15, 0.14, 0.07, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* Target terminal sleeve */}
      <group position={tBootPos} quaternion={tQuat}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.65, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Top collar rim */}
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.15, 0.14, 0.07, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* 3. Wire Bend Handles if user defined custom routing */}
      {selected &&
        wire.path?.map((p, i) => (
          <BendHandle key={i} wire={wire} index={i} point={p} />
        ))}
    </group>
  );
});

function BendHandle({
  wire,
  index,
  point,
}: {
  wire: Wire;
  index: number;
  point: Vec;
}) {
  const dragging = useRef(false);
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const hit = e.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -point[1]),
      new THREE.Vector3()
    );
    if (hit)
      useSimulatorStore.getState().updateWire(wire.id, {
        path: wire.path!.map((p, i) =>
          i === index ? [hit.x, point[1], hit.z] : p
        ),
      });
  };
  const end = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };
  return (
    <mesh
      position={point}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        dragging.current = true;
        (e.target as Element).setPointerCapture(e.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <sphereGeometry args={[0.22, 12, 8]} />
      <meshBasicMaterial color="#fbbf24" depthTest={false} />
    </mesh>
  );
}

export function WireRenderer() {
  const wires = useSimulatorStore((s) => s.wires);
  const components = useSimulatorStore((s) => s.components);
  const selected = useSimulatorStore((s) => s.selectedWireId);

  return (
    <group>
      {wires.map((w) => {
        const a = components.find((c) => c.id === w.sourceComponentId);
        const b = components.find((c) => c.id === w.targetComponentId);
        const sp = a?.pins.find((p) => p.id === w.sourcePinId);
        const tp = b?.pins.find((p) => p.id === w.targetPinId);
        if (!a || !b || !sp || !tp) return null;
        return (
          <Connection
            key={w.id}
            wire={w}
            source={a.position}
            rotation={a.rotation}
            target={b.position}
            targetRotation={b.rotation}
            sp={sp.position}
            tp={tp.position}
            selected={selected === w.id}
          />
        );
      })}
    </group>
  );
}
