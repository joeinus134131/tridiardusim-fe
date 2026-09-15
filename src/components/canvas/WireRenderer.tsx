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
  const { curve, start, end } = useMemo(() => {
    const s = new THREE.Vector3(...sp)
      .applyEuler(new THREE.Euler(...rotation))
      .add(new THREE.Vector3(...source));
    const e = new THREE.Vector3(...tp)
      .applyEuler(new THREE.Euler(...targetRotation))
      .add(new THREE.Vector3(...target));

    if (wire.path?.length) {
      return {
        curve: new THREE.CatmullRomCurve3(
          [s, ...wire.path.map((p) => new THREE.Vector3(...p)), e],
          false,
          "centripetal"
        ),
        start: s,
        end: e,
      };
    }

    const sBase = s.clone().add(new THREE.Vector3(0, 0.2, 0));
    const sTop = s.clone().add(new THREE.Vector3(0, 0.65, 0));
    const sRigid = s.clone().add(new THREE.Vector3(0, 1.25, 0));

    const eRigid = e.clone().add(new THREE.Vector3(0, 1.25, 0));
    const eTop = e.clone().add(new THREE.Vector3(0, 0.65, 0));
    const eBase = e.clone().add(new THREE.Vector3(0, 0.2, 0));

    if (wire.path?.length) {
      return {
        curve: new THREE.CatmullRomCurve3(
          [sBase, sTop, sRigid, ...wire.path.map((p) => new THREE.Vector3(...p)), eRigid, eTop, eBase],
          false,
          "centripetal"
        ),
        start: s,
        end: e,
      };
    }

    // Physical wire routing calculation
    const dist = s.distanceTo(e);
    // Natural catenary arch above highest component surface
    const maxPinY = Math.max(s.y, e.y);
    const mid = s.clone().lerp(e, 0.5);
    const archLift = Math.max(1.2, Math.min(dist * 0.28, 4.5));
    mid.y = Math.max(mid.y, maxPinY) + archLift;

    // Rigid vertical exit at both ends: sBase -> sTop -> sRigid ensures 100% straight vertical wire inside & exiting the boot
    const naturalCurve = new THREE.CatmullRomCurve3(
      [sBase, sTop, sRigid, mid, eRigid, eTop, eBase],
      false,
      "catmullrom",
      0.35
    );

    return { curve: naturalCurve, start: s, end: e };
  }, [source, rotation, target, targetRotation, sp, tp, wire.path]);

  return (
    <group>
      {/* 1. Main Flexible Insulated Wire */}
      <mesh
        onClick={(ev) => {
          ev.stopPropagation();
          useSimulatorStore.getState().selectWire(wire.id);
        }}
      >
        <tubeGeometry args={[curve, 54, 0.08, 8, false]} />
        <meshStandardMaterial
          color={wire.color}
          emissive={selected ? wire.color : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>

      {/* 2. Plastic DuPont Terminal Boots (Rigid sleeves) at each pin terminal */}
      {/* Source terminal sleeve */}
      <group position={[start.x, start.y + 0.325, start.z]}>
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
      <group position={[end.x, end.y + 0.325, end.z]}>
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
