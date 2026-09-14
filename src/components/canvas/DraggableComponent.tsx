"use client";
import { localBounds } from "@/lib/components/placement";
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
  const component = useSimulatorStore(s=>s.components.find(c=>c.id===id));
  const bounds = component ? localBounds(component) : null;
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
      {selected && bounds && <mesh raycast={()=>null} position={bounds.min.map((v,i)=>(v+bounds.max[i])/2) as [number,number,number]}>
        <boxGeometry args={bounds.min.map((v,i)=>bounds.max[i]-v) as [number,number,number]} />
        <meshBasicMaterial color={dragging?"#fbbf24":"#55aaff"} wireframe transparent opacity={.65} depthWrite={false} />
      </mesh>}
      {children}
    </group>
  );
});
