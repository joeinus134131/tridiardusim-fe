"use client";
import { ThreeEvent } from "@react-three/fiber";
import { useRef, useState, memo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();

export const DraggableComponent = memo(function DraggableComponent({
  id,
  position,
  rotation,
  children,
}: {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  children: React.ReactNode;
}) {
  const drag = useRef<{ dx: number; dz: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const selected = useSimulatorStore((s) => s.selectedComponentId === id);

  const getIntersect = (e: ThreeEvent<PointerEvent>) => {
    groundPlane.constant = -position[1];
    return e.ray.intersectPlane(groundPlane, hitPoint);
  };

  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    setDragging(false);
    (e.target as Element)?.releasePointerCapture(e.pointerId);
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const s = useSimulatorStore.getState();
        s.selectComponent(id);
        if (s.wiringState.active) return;
        const p = getIntersect(e);
        if (!p) return;
        drag.current = { dx: p.x - position[0], dz: p.z - position[2] };
        setDragging(true);
        (e.target as Element)?.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        e.stopPropagation();
        const p = getIntersect(e);
        if (p) {
          useSimulatorStore
            .getState()
            .updateComponentPosition(id, [
              Math.round((p.x - drag.current.dx) / 0.508) * 0.508,
              position[1],
              Math.round((p.z - drag.current.dz) / 0.508) * 0.508,
            ]);
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.15, 1.22, 24]} />
          <meshBasicMaterial
            color={dragging ? "#fbbf24" : "#55aaff"}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
      {children}
    </group>
  );
});
