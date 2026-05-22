'use client';

import { useThree } from '@react-three/fiber';
import { useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { GRID_SIZE } from '@/lib/constants';
import { snapToGrid } from '@/lib/utils';

interface DraggableComponentProps {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  children: React.ReactNode;
}

export function DraggableComponent({ id, position, rotation, children }: DraggableComponentProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<[number, number, number]>(position);
  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const offsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  
  const updateComponentPosition = useSimulatorStore(state => state.updateComponentPosition);
  const selectComponent = useSimulatorStore(state => state.selectComponent);
  const isSelected = useSimulatorStore(state => state.selectedComponentId === id);

  // Reuse objects to avoid GC pressure
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointerVec = useMemo(() => new THREE.Vector2(), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  const getGroundPoint = useCallback((clientX: number, clientY: number): THREE.Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    pointerVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerVec, camera);
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint.clone();
    }
    return null;
  }, [camera, gl, plane, raycaster, pointerVec, intersectPoint]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    // Only start drag on left click
    if (e.button !== undefined && e.button !== 0) return;

    selectComponent(id);
    
    const point = getGroundPoint(e.clientX, e.clientY);
    if (!point) return;
    
    // Calculate the offset between the click point and the component position
    offsetRef.current.set(
      point.x - position[0],
      0,
      point.z - position[2]
    );
    
    dragStartRef.current = point;
    setIsDragging(true);
    setDragPos(position);
    
    // Capture pointer to track movement outside canvas
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, [id, position, selectComponent, getGroundPoint]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging) return;
    e.stopPropagation();

    const point = getGroundPoint(e.clientX, e.clientY);
    if (!point) return;
    
    // Subtract offset so the object doesn't jump to cursor
    const rawX = point.x - offsetRef.current.x;
    const rawZ = point.z - offsetRef.current.z;
    
    const snappedX = snapToGrid(rawX, GRID_SIZE);
    const snappedZ = snapToGrid(rawZ, GRID_SIZE);
    
    const newPos: [number, number, number] = [snappedX, position[1], snappedZ];
    setDragPos(newPos);
  }, [isDragging, position, getGroundPoint]);

  const handlePointerUp = useCallback((e: any) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    setIsDragging(false);
    updateComponentPosition(id, dragPos);
    dragStartRef.current = null;
    
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  }, [isDragging, dragPos, id, updateComponentPosition]);

  const currentPos = isDragging ? dragPos : position;

  return (
    <group 
      ref={groupRef}
      position={currentPos}
      rotation={rotation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Selection ring on the ground */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6, 7, 32]} />
          <meshBasicMaterial color="#3b82f6" opacity={0.5} transparent side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Lift effect when dragging */}
      <group position={[0, isDragging ? 1.5 : 0, 0]}>
        {children}
      </group>

      {/* Drop shadow when dragging */}
      {isDragging && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5, 32]} />
          <meshBasicMaterial color="#000000" opacity={0.15} transparent />
        </mesh>
      )}
    </group>
  );
}
