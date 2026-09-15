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
  const pendingDrag = useRef<{
    clientX: number;
    clientY: number;
    pointerId: number;
    target: Element;
  } | null>(null);
  const isDragging = useRef(false);
  const dragPlaneY = useRef(position[1]);
  const offset = useRef<{ dx: number; dz: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const component = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const bounds = component ? localBounds(component) : null;
  const selected = useSimulatorStore((s) => s.selectedComponentId === id);

  const getIntersect = (e: ThreeEvent<PointerEvent>) => {
    groundPlane.constant = -dragPlaneY.current;
    return e.ray.intersectPlane(groundPlane, hitPoint);
  };

  const end = (e: ThreeEvent<PointerEvent>) => {
    if (pendingDrag.current) {
      pendingDrag.current = null;
    }
    if (isDragging.current) {
      e.stopPropagation();
      isDragging.current = false;
      setDragging(false);
      (e.target as Element)?.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerDown={(e) => {
        // Allow right-click (pan) and middle-click (dolly) to pass through to OrbitControls freely
        if (e.button !== 0) return;
        e.stopPropagation();
        const s = useSimulatorStore.getState();
        s.selectComponent(id);
        if (s.wiringState.active) return;

        dragPlaneY.current = position[1];
        const p = getIntersect(e);
        if (p) {
          offset.current = { dx: p.x - position[0], dz: p.z - position[2] };
        }
        pendingDrag.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerId: e.pointerId,
          target: e.target as Element,
        };
      }}
      onPointerMove={(e) => {
        // Check threshold if pending
        if (pendingDrag.current && !isDragging.current) {
          const dist = Math.hypot(
            e.clientX - pendingDrag.current.clientX,
            e.clientY - pendingDrag.current.clientY
          );
          if (dist > 3) {
            isDragging.current = true;
            setDragging(true);
            try {
              pendingDrag.current.target.setPointerCapture(pendingDrag.current.pointerId);
            } catch {
              // Ignore if capture failed
            }
            pendingDrag.current = null;
          }
        }

        if (isDragging.current && offset.current) {
          e.stopPropagation();
          const p = getIntersect(e);
          if (p) {
            useSimulatorStore.getState().updateComponentPosition(id, [
              Math.round((p.x - offset.current.dx) / 0.508) * 0.508,
              position[1],
              Math.round((p.z - offset.current.dz) / 0.508) * 0.508,
            ]);
          }
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {selected && bounds && (
        <mesh
          raycast={() => null}
          position={
            bounds.min.map((v, i) => (v + bounds.max[i]) / 2) as [
              number,
              number,
              number,
            ]
          }
        >
          <boxGeometry
            args={
              bounds.min.map((v, i) => bounds.max[i] - v) as [
                number,
                number,
                number,
              ]
            }
          />
          <meshBasicMaterial
            color={dragging ? "#fbbf24" : "#38bdf8"}
            wireframe
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
      )}
      {children}
    </group>
  );
});
